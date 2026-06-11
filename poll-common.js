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

function pollEscapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
