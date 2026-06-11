// Shared helpers for all Live Poll pages (vote, widget, host).
// Data lives in Firebase Realtime Database:
//
//   sessions/{CODE}/
//     active: "slide3"                          <- question currently on screen
//     polls/{slideId}: { question, options[], open, version }
//     votes/{slideId}/{deviceId}: { c: choiceIndex, v: pollVersion }

function pollFirebaseReady() {
  if (!window.FIREBASE_CONFIG || String(window.FIREBASE_CONFIG.apiKey).startsWith("YOUR_")) {
    return false;
  }
  firebase.initializeApp(window.FIREBASE_CONFIG);
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

// Count votes for a poll round: votes node -> [n, n, n...]
function pollCountVotes(votesNode, poll) {
  const counts = new Array((poll.options || []).length).fill(0);
  let total = 0;
  if (votesNode) {
    for (const dev of Object.keys(votesNode)) {
      const v = votesNode[dev];
      if (v && v.v === poll.version && typeof v.c === "number" && v.c >= 0 && v.c < counts.length) {
        counts[v.c]++; total++;
      }
    }
  }
  return { counts, total };
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
