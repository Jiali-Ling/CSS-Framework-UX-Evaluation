const LOG_KEY = "study_logs_v1";

export function logEvent(event, details = "") {
  const logs = getLogs();
  logs.push({
    ts: new Date().toISOString(),
    event: event,
    details: details
  });
  localStorage.setItem(LOG_KEY, JSON.stringify(logs));
}

export function getLogs() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearLogs() {
  localStorage.removeItem(LOG_KEY);
}

export function exportLogsCSV() {
  const logs = getLogs();
  if (logs.length === 0) {
    alert("No logs to export");
    return;
  }

  const csv = [
    ["Time", "Event", "Details"],
    ...logs.map(log => [
      new Date(log.ts).toLocaleString(),
      log.event,
      log.details
    ])
  ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `study_logs_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
