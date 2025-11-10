const LOG_KEY = "eventlog";

export function log(event, payload = {}) {
  const rec = { event, ts: new Date().toISOString(), ...payload };
  const all = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
  all.push(rec);
  localStorage.setItem(LOG_KEY, JSON.stringify(all));
}

export function getLogs() {
  return JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
}

export function clearLogs(){
  localStorage.removeItem(LOG_KEY);
}

export function exportLogsCSV() {
  const rows = getLogs();
  if (!rows.length) { alert("暂无日志"); return; }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))
  ].join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "eventlog.csv";
  a.click();
}
