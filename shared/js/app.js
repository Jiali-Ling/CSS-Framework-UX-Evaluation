/**
 * shared/js/app.js
 *
 * Honours HCI study helper:
 * - Auto-generate an anonymous Study ID per browser (e.g., P8619)
 * - Optional nickname (must NOT be real name)
 * - Simulated Login / Submit / Feedback flow
 * - Participants only see THEIR own submission/feedback (per Study ID)
 *
 * Storage
 * - Identity: localStorage[IDENTITY_KEY] = { studyId, nickname, createdAt }
 * - Submissions: localStorage[SUBMISSIONS_KEY] = Array<{
 *      studyId, nickname, task, fileName, comments, createdAtISO
 *   }>
 */

import { logEvent } from "./log.js";

const IDENTITY_KEY = "study_identity_v1";
const SUBMISSIONS_KEY = "study_submissions_v1";

function $(sel) {
  return document.querySelector(sel);
}

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function nowISO() {
  return new Date().toISOString();
}

function generateStudyId() {
  // P0000 - P9999
  const n = Math.floor(Math.random() * 10000);
  return `P${String(n).padStart(4, "0")}`;
}

function getIdentity() {
  const raw = localStorage.getItem(IDENTITY_KEY);
  if (!raw) return null;
  const obj = safeJsonParse(raw, null);
  if (!obj || typeof obj !== "object") return null;
  if (!obj.studyId) return null;
  return obj;
}

function setIdentity(identity) {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

function ensureIdentity() {
  let identity = getIdentity();
  if (!identity) {
    identity = { studyId: generateStudyId(), nickname: "", createdAt: nowISO() };
    setIdentity(identity);
  }
  return identity;
}

function setNickname(nickname) {
  const identity = ensureIdentity();
  identity.nickname = String(nickname || "").trim();
  setIdentity(identity);
  return identity;
}

function resetIdentityAndData() {
  localStorage.removeItem(IDENTITY_KEY);
  localStorage.removeItem(SUBMISSIONS_KEY);
}

function getAllSubmissions() {
  const raw = localStorage.getItem(SUBMISSIONS_KEY);
  const arr = safeJsonParse(raw, []);
  return Array.isArray(arr) ? arr : [];
}

function saveAllSubmissions(arr) {
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(arr));
}

function addSubmission(record) {
  const all = getAllSubmissions();
  all.push(record);
  saveAllSubmissions(all);
}

function getMySubmissions(studyId) {
  return getAllSubmissions()
    .filter((r) => r && r.studyId === studyId)
    .sort((a, b) => (b.createdAtISO || "").localeCompare(a.createdAtISO || ""));
}

function announce(msg) {
  const live = document.getElementById("statusLive");
  if (live) live.textContent = msg;
}

/** -------- UI wiring -------- */

function updateHeaderUI() {
  const identity = ensureIdentity();

  // Common badges/text blocks used across your pages
  const pidBadge = document.getElementById("pidBadge");
  if (pidBadge) pidBadge.textContent = `ID: ${identity.studyId}`;

  const studyIdText = document.getElementById("studyIdText");
  if (studyIdText) studyIdText.textContent = identity.studyId;

  const nicknamePreview = document.getElementById("nicknamePreview");
  if (nicknamePreview) nicknamePreview.textContent = identity.nickname || "";
}

function wireCopyIdButtons() {
  const identity = ensureIdentity();

  const buttons = [
    document.getElementById("copyIdBtn"),
    ...document.querySelectorAll('[data-action="copy-id"]'),
  ].filter(Boolean);

  for (const btn of buttons) {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(identity.studyId);
        announce(`Copied ID: ${identity.studyId}`);
      } catch {
        // Fallback: prompt
        window.prompt("Copy your Study ID:", identity.studyId);
      }
    });
  }
}

function wireResetButtons() {
  const buttons = [
    document.getElementById("logoutBtn"),    // your existing top-right button
    document.getElementById("resetIdBtn"),   // your existing bottom button
    ...document.querySelectorAll('[data-action="reset-id"]'),
    ...document.querySelectorAll('[data-action="reset"]'),
  ].filter(Boolean);

  for (const btn of buttons) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const ok = window.confirm(
        "Reset Study ID? This will clear your local study data on this browser."
      );
      if (!ok) return;

      resetIdentityAndData();
      const fresh = ensureIdentity();
      updateHeaderUI();
      announce(`New Study ID generated: ${fresh.studyId}`);

      // Optional: send them back to Login page for clarity
      // Use relative navigation so it works for both versions.
      const to = "index.html";
      window.location.href = new URL(to, window.location.href).toString();
    });
  }
}

function wireLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const nicknameInput =
    document.getElementById("nicknameInput") ||
    document.getElementById("loginName") ||
    document.getElementById("loginAlias") ||
    null;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const nickname = nicknameInput ? nicknameInput.value : "";
    const identity = setNickname(nickname);

    logEvent("Login", `StudyID: ${identity.studyId}, Nickname: ${nickname || "none"}`);

    updateHeaderUI();
    announce("ID saved. Continue to the next task.");

    const next = form.dataset.next || "submit.html";
    window.location.href = new URL(next, window.location.href).toString();
  });
}

function wireSubmitForm() {
  const form = document.getElementById("submitForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const identity = ensureIdentity();
    const nickname = (identity.nickname || "").trim();

    const taskSel = form.querySelector('select[name="assignment"], select#assignmentSelect');
    const task = taskSel ? taskSel.value : "Assignment";

    const fileInput = form.querySelector('input[type="file"]');
    const fileName =
      fileInput && fileInput.files && fileInput.files[0]
        ? fileInput.files[0].name
        : "SampleFile.pdf";

    const commentsInput =
      form.querySelector('textarea[name="comments"], textarea#comments, textarea#commentsInput') || null;
    const comments = commentsInput ? commentsInput.value.trim() : "";

    const submission = {
      studyId: identity.studyId,
      nickname,
      task,
      fileName,
      comments,
      createdAtISO: nowISO(),
    };

    addSubmission(submission);

    logEvent("Submission", JSON.stringify({
      studyId: identity.studyId,
      task,
      fileName,
      hasComments: comments.length > 0
    }));

    announce("Submitted (simulated). Redirecting…");

    const success = form.dataset.success || "success.html";
    window.location.href = new URL(success, window.location.href).toString();
  });
}

function renderFeedbackPage() {
  const fb = document.getElementById("fb");
  const history = document.getElementById("history");
  if (!fb && !history) return;

  const identity = ensureIdentity();
  const mine = getMySubmissions(identity.studyId);

  if (fb) {
    if (mine.length === 0) {
      fb.innerHTML = `
        <div class="alert alert-info">
          <p>No submissions found for <strong>${identity.studyId}</strong>. 
          Please <a href="./submit.html">submit an assignment</a> first.</p>
        </div>
      `;
    } else {
      const framework = document.body.dataset.framework || "bootstrap";
      const tableClass = framework === "bulma" ? "table is-fullwidth" : "table table-like align-middle";
      const badgeClass = framework === "bulma" ? "tag is-success" : "badge rounded-pill text-bg-success";

      fb.innerHTML = `
        <div class="table-responsive table-wrapper mb-3">
          <table class="${tableClass}">
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Score</th>
                <th>Status</th>
                <th>Marker notes</th>
              </tr>
            </thead>
            <tbody>
              ${mine.map(sub => `
                <tr>
                  <td>${escapeHtml(sub.task)}</td>
                  <td>${simulateScore(sub.task)}</td>
                  <td><span class="${badgeClass}">Passed</span></td>
                  <td>Simulated feedback for the study (no real grading).</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <div style="margin-top: 1.5rem; padding: 1rem; background: var(--bb-card); border: 1px solid var(--bb-border); border-radius: 8px;">
          <p><strong>Study ID:</strong> ${identity.studyId}${identity.nickname ? ` (${escapeHtml(identity.nickname)})` : ""}</p>
          <p><strong>Latest submission:</strong> ${escapeHtml(mine[0].task)}</p>
          <p><strong>Time:</strong> ${formatLocal(mine[0].createdAtISO)}</p>
        </div>
      `;
    }
  }

  if (history) {
    if (mine.length === 0) {
      history.innerHTML = "";
    } else {
      history.innerHTML = `
        <h3>History</h3>
        <table class="table table-like align-middle">
          <thead>
            <tr>
              <th>Version</th>
              <th>Time</th>
              <th>File</th>
              <th>Assignment</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            ${mine
              .slice(0, 10)
              .map((r, idx) => {
                return `
                  <tr>
                    <td>v${mine.length - idx}</td>
                    <td>${formatLocal(r.createdAtISO)}</td>
                    <td>${escapeHtml(r.fileName)}</td>
                    <td>${escapeHtml(r.task)}</td>
                    <td>${simulateScore(r.task)}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      `;
    }
  }
}

function wireNavGates() {
  // Optional: If you want to block submit/feedback pages when scripts failed, you can add checks here.
  // For now we keep it permissive (study is low friction).
}

/** -------- helpers for feedback rendering -------- */

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatLocal(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso || "");
  }
}

function simulateScore(task) {
  // deterministic-ish, non-sensitive
  const base = task && task.toLowerCase().includes("lab") ? 66 : 78;
  return base;
}

/** -------- init -------- */

function init() {
  // If shared JS fails to load, everything breaks. So keep init small & robust.
  ensureIdentity();
  updateHeaderUI();
  wireCopyIdButtons();
  wireResetButtons();
  wireLoginForm();
  wireSubmitForm();
  renderFeedbackPage();
  wireNavGates();
}

document.addEventListener("DOMContentLoaded", init);
