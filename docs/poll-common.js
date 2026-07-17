// Shared helpers for all Live Poll pages (vote, widget, host).
// Data lives in Supabase (Postgres + Realtime):
//
//   sessions: code, owner, name, active_slide, theme        <- one row per presentation
//   polls:    session_code, slide_id, question, options[],  <- one row per poll slide
//             correct, open, version
//   votes:    session_code, slide_id, voter_key,            <- one row per voter per slide
//             choice, version
//   answers:  user_id, session_code, slide_id, …            <- signed-in voters' private history
//
// Access control lives in the database (see supabase-schema.sql): anyone can
// read sessions/polls/votes and cast votes; only the presenter who owns a
// session can edit its polls, rename/retheme it, or clear votes; a database
// trigger rejects votes that are invalid, stale, or cast after voting closed.
// answers rows are private to each voter.

let sb = null; // shared Supabase client, created by pollSupabaseReady()

function pollSupabaseReady() {
  const cfg = window.SUPABASE_CONFIG;
  if (!cfg || !cfg.url || String(cfg.url).indexOf("YOUR_") >= 0 ||
      !cfg.publishableKey || String(cfg.publishableKey).indexOf("YOUR_") >= 0) {
    return false;
  }
  sb = window.sb = supabase.createClient(cfg.url, cfg.publishableKey);
  return true;
}

function pollCleanCode(code) {
  code = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return code.length >= 4 ? code : null;
}

// A random ID per device so each phone gets one vote per question round
function pollDeviceId() {
  let id;
  try {
    id = localStorage.getItem("pollDeviceId");
    if (!id) {
      id = "d" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("pollDeviceId", id);
    }
  } catch (e) { id = "d" + Math.random().toString(36).slice(2); }
  return id;
}

// Count votes for a poll round: {voter_key: {choice, version}} -> [n, n, n...]
function pollCountVotes(votersMap, poll) {
  const counts = new Array((poll.options || []).length).fill(0);
  let total = 0;
  if (votersMap) {
    for (const k of Object.keys(votersMap)) {
      const v = votersMap[k];
      if (v && v.version === poll.version && typeof v.choice === "number" &&
          v.choice >= 0 && v.choice < counts.length) {
        counts[v.choice]++; total++;
      }
    }
  }
  return { counts, total };
}

// ---------- live watchers ----------
// Each watcher = one initial snapshot query + one Realtime subscription that
// afterwards receives only per-row deltas (~100 bytes per vote) — the same
// bandwidth profile as the old Firebase child_added/changed listeners.
// The snapshot re-runs on every (re)connect, so a dropped connection can't
// leave stale data behind. Notifies are debounced (40 ms) so a burst of
// incoming votes triggers one render, not hundreds.
//
// NOTE: Realtime column filters are NOT applied to DELETE events — every
// handler double-checks the deleted row's keys before dropping it.

function pollChanName(kind, code) {
  return kind + ":" + code + ":" + Math.random().toString(36).slice(2);
}

// Live map of every vote in a session:
//   { slide_id: { voter_key: {choice, version} } }
// Returns { votes, off() } — `votes` mutates in place; pass votes[slideId]
// to pollCountVotes.
function pollWatchVotes(sessionCode, onChange) {
  const bySlide = {};
  let timer = null, dead = false;
  const notify = () => {
    if (timer || dead) return;
    timer = setTimeout(() => { timer = null; onChange(bySlide); }, 40);
  };
  const put = (r) => {
    (bySlide[r.slide_id] = bySlide[r.slide_id] || {})[r.voter_key] =
      { choice: r.choice, version: r.version };
  };
  const chan = sb.channel(pollChanName("votes", sessionCode))
    .on("postgres_changes",
      { event: "*", schema: "public", table: "votes",
        filter: "session_code=eq." + sessionCode },
      (msg) => {
        const r = msg.eventType === "DELETE" ? msg.old : msg.new;
        if (!r || r.session_code !== sessionCode) return;
        if (msg.eventType === "DELETE") {
          if (bySlide[r.slide_id]) delete bySlide[r.slide_id][r.voter_key];
        } else put(r);
        notify();
      })
    .subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      sb.from("votes").select("slide_id,voter_key,choice,version")
        .eq("session_code", sessionCode)
        .then(({ data, error }) => {
          if (dead || error) return;
          for (const k of Object.keys(bySlide)) delete bySlide[k];
          (data || []).forEach(put);
          notify();
        });
    });
  return {
    votes: bySlide,
    off() { dead = true; if (timer) { clearTimeout(timer); timer = null; } sb.removeChannel(chan); }
  };
}

// Live map of a session's polls: { slide_id: pollRow }
// Returns { polls, off() }.
function pollWatchPolls(sessionCode, onChange) {
  const polls = {};
  let dead = false;
  const chan = sb.channel(pollChanName("polls", sessionCode))
    .on("postgres_changes",
      { event: "*", schema: "public", table: "polls",
        filter: "session_code=eq." + sessionCode },
      (msg) => {
        if (dead) return;
        const r = msg.eventType === "DELETE" ? msg.old : msg.new;
        if (!r || r.session_code !== sessionCode) return;
        if (msg.eventType === "DELETE") delete polls[r.slide_id];
        else polls[r.slide_id] = r;
        onChange(polls);
      })
    .subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      sb.from("polls").select("*").eq("session_code", sessionCode)
        .then(({ data, error }) => {
          if (dead || error) return;
          for (const k of Object.keys(polls)) delete polls[k];
          (data || []).forEach(r => { polls[r.slide_id] = r; });
          onChange(polls);
        });
    });
  return {
    polls,
    off() { dead = true; sb.removeChannel(chan); }
  };
}

// Watch one session row (name / active_slide / theme). Calls onRow(row) on
// every change, onRow(null) if the session doesn't exist yet.
function pollWatchSession(sessionCode, onRow) {
  let dead = false;
  const load = () => {
    sb.from("sessions").select("code,name,active_slide,theme")
      .eq("code", sessionCode).maybeSingle()
      .then(({ data, error }) => { if (!dead && !error) onRow(data || null); });
  };
  const chan = sb.channel(pollChanName("session", sessionCode))
    .on("postgres_changes",
      { event: "*", schema: "public", table: "sessions",
        filter: "code=eq." + sessionCode },
      (msg) => {
        if (dead) return;
        if (msg.eventType === "DELETE") {
          if (msg.old && msg.old.code === sessionCode) onRow(null);
        } else if (msg.new && msg.new.code === sessionCode) onRow(msg.new);
      })
    .subscribe((status) => { if (status === "SUBSCRIBED") load(); });
  return { off() { dead = true; sb.removeChannel(chan); } };
}

// ---------- theming ----------
// A theme is just { bg, accent }; the rest (text, muted, panel) is derived
// so any color combination stays readable.
function pollHexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return [15, 23, 42];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function pollMix(hexA, hexB, t) {
  const a = pollHexToRgb(hexA), b = pollHexToRgb(hexB);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
}

function pollDeriveTheme(t) {
  const [r, g, b] = pollHexToRgb(t.bg);
  const dark = (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
  return {
    bg: t.bg,
    accent: t.accent,
    text: dark ? "#f1f5f9" : "#0f172a",
    muted: dark ? "#94a3b8" : "#475569",
    panel: pollMix(t.bg, dark ? "#ffffff" : "#000000", 0.13)
  };
}

function pollApplyTheme(t) {
  if (!t || !t.bg || !t.accent) return;
  const d = pollDeriveTheme(t);
  const s = document.body.style;
  s.setProperty("--bg", d.bg);
  s.setProperty("--text", d.text);
  s.setProperty("--muted", d.muted);
  s.setProperty("--panel", d.panel);
  s.setProperty("--accent", d.accent);
}

function pollEscapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
