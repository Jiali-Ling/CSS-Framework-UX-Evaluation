// Bridge: forward window.Metrics entries into log.js storage
// Load order: include ../shared/js/metrics.js first (non-module),
// then this module is imported by app.js.
import { log } from "./log.js";

function hookMetrics() {
  const m = window.Metrics;
  if (!m || m.__patched) return;
  const orig = m._push.bind(m);
  m._push = function(type, payload) {
    const entry = orig(type, payload);
    try { log("metrics", entry); } catch (_) {}
    return entry;
  };
  m.__patched = true;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", hookMetrics, { once: true });
} else {
  hookMetrics();
}

// Optional: expose quick CSV export helper for admin page usage
window.exportMetricsCSV = function(){
  const m = window.Metrics; if (m && typeof m.exportCSV === 'function') m.exportCSV();
};
