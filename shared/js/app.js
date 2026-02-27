import { logEvent } from "./log.js";

const IDENTITY_KEY = "study_identity_v1";
const SUBMISSIONS_KEY = "study_submissions_v1";

const domCache = new Map();

function $(sel) {
  if (!domCache.has(sel)) {
    domCache.set(sel, document.querySelector(sel));
  }
  return domCache.get(sel);
}

function clearDomCache() {
  domCache.clear();
}

function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function batchDomUpdate(callback) {
  if ('requestAnimationFrame' in window) {
    requestAnimationFrame(callback);
  } else {
    callback();
  }
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

// Generate a random Study ID in the format "PXXXX", where XXXX is a zero-padded number between 0000 and 9999. 
function generateStudyId() {
  const n = Math.floor(Math.random() * 10000);
  return `P${String(n).padStart(4, "0")}`;
}

// Detect the framework version based on the data-framework attribute on the body element.
function detectVersion() {
  const framework = document.body.dataset.framework;
  if (framework === 'bootstrap') return 'version_A';
  if (framework === 'bulma') return 'version_B';
  return 'unknown';
}

function getIdentity() {
  const raw = localStorage.getItem(IDENTITY_KEY);
  if (!raw) return null;
  const obj = safeJsonParse(raw, null);
  if (!obj || typeof obj !== "object") return null;
  if (!obj.studyId) return null;
  return obj;
}

// Save the user's identity information, including Study ID, nickname, and version code.
function setIdentity(identity) {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

// Ensure that a Study ID exists in localStorage, generating a new one if necessary.
function ensureIdentity() {
  let identity = getIdentity();
  if (!identity) {
    identity = { 
      studyId: generateStudyId(), 
      version_code: detectVersion(),
      nickname: "", 
      createdAt: nowISO() 
    };
    setIdentity(identity);
  }
  if (!identity.version_code) {
    identity.version_code = detectVersion();
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


function updateHeaderUI() {
  const identity = ensureIdentity();

  // Batch DOM updates to prevent layout thrashing
  batchDomUpdate(() => {
    const pidBadge = document.getElementById("pidBadge");
    if (pidBadge) pidBadge.textContent = `ID: ${identity.studyId}`;

    const studyIdText = document.getElementById("studyIdText");
    if (studyIdText) studyIdText.textContent = identity.studyId;

    const nicknamePreview = document.getElementById("nicknamePreview");
    if (nicknamePreview) nicknamePreview.textContent = identity.nickname || "";
  });
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
        window.prompt("Copy your Study ID:", identity.studyId);
      }
    });
  }
}

function wireResetButtons() {
  const buttons = [
    document.getElementById("logoutBtn"), 
    document.getElementById("resetIdBtn"), 
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
    // Always generate a fresh Study ID on each login so a new participant
    // cannot see a previous participant's submissions on the same browser.
    // Existing submissions are intentionally kept for admin/CSV export.
    localStorage.removeItem(IDENTITY_KEY);
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

  function clearErrors() {
    const alerts = form.parentNode.querySelectorAll('.alert-danger, .notification.is-danger');
    alerts.forEach(alert => alert.remove());
  }

  function showError(message) {
    clearErrors();
    
    const framework = document.body.dataset.framework || 'bootstrap';
    const alertDiv = document.createElement('div');
    
    if (framework === 'bulma') {
      alertDiv.className = 'notification is-danger mt-4';
      alertDiv.role = 'alert';
    } else {
      alertDiv.className = 'alert alert-danger mt-3';
      alertDiv.role = 'alert';
    }
    
    alertDiv.innerHTML = `<strong>Error:</strong> ${message}`;
    form.parentNode.insertBefore(alertDiv, form);
    alertDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    if (window.metrics) {
      window.metrics.log('validation_error', { message, framework });
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const identity = ensureIdentity();
    const nickname = (identity.nickname || "").trim();

    const taskSel = form.querySelector('select[name="assignment"], select#assignment');
    const task = taskSel ? taskSel.value : "";

    if (!task || task === "") {
      showError('Please select an assignment.');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Submitting...';
    }

    const fileInput = form.querySelector('input[type="file"]');
    const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    const fileName = file ? file.name : "SampleFile.pdf";

    let fileDataUrl = null;
    let fileMime = null;
    let fileSize = null;

    if (file) {
      try {
        fileDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = ev => resolve(ev.target.result);
          reader.onerror = () => reject(new Error('File read failed'));
          reader.readAsDataURL(file);
        });
        fileMime = file.type || null;
        fileSize = file.size;
      } catch (err) {
        console.warn('Could not read file as dataURL:', err);
      }
    }

    const commentsInput =
      form.querySelector('textarea[name="comments"], textarea#comments, textarea#commentsInput') || null;
    const comments = commentsInput ? commentsInput.value.trim() : "";

    // Simulate a score for demonstration purposes. In a real application, this would be determined by the marker's evaluation of the submission.
    const mockScore = 60 + Math.floor(Math.random() * 36);  // Generates a score between 60 and 95.
    const passMarks = {
      'Web Dev Lab': 60,
      'HCI Coursework 1': 60,
      'Programming Lab': 60
    };
    const passMark = passMarks[task] || 60;
    const passed = mockScore >= passMark;
    
    // Generate dynamic feedback based on the simulated score. In a real application, this would come from the marker's comments and evaluation of the submission.
    const feedbackOptions = [
      'Good structural approach to layout. Responsive breakpoints applied correctly. Consider adding more thorough CSS validation and testing edge-case states on smaller viewports.',
      'Strong analysis of user requirements. Wireframes clearly documented. Marks deducted for limited depth in evaluation section – expand discussion of heuristics in final report.',
      'Code executes correctly across all test cases. Readability reasonable. Improvement areas include inline documentation and handling of unexpected input values.',
      'Clear semantic HTML structure. Excellent use of ARIA landmarks. Minor issue: button focus states could be more prominent for keyboard users.',
      'Well-organized component architecture. Good responsive behaviour across devices. Consider optimizing image assets and implementing lazy loading for performance.',
      'Solid implementation of core features. User interface is intuitive. Some edge cases in form validation need attention. Overall demonstrates good understanding of framework concepts.'
    ];
    const feedback = feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];

    const submission = {
      id: `${identity.studyId}_${Date.now()}`,
      studyId: identity.studyId,
      version_code: identity.version_code || detectVersion(),
      nickname,
      task,
      fileName,
      fileDataUrl,
      fileMime,
      fileSize,
      comments,
      createdAtISO: nowISO(),
      // The score, pass mark, status, and feedback are included in the submission record for demonstration purposes. In a real application, these would be determined by the marker's evaluation of the submission and stored separately from the submission data.
      score: mockScore,
      passMark: passMark,
      status: passed ? 'Passed' : 'At Risk',
      feedback: feedback
    };

    try {
      addSubmission(submission);
    } catch (err) {
      submission.fileDataUrl = null;
      try { addSubmission(submission); } catch (_) {}
      console.warn('Stored submission without file content (storage quota exceeded):', err);
    }

    logEvent("Submission", JSON.stringify({
      studyId: identity.studyId,
      version_code: identity.version_code,
      task,
      fileName,
      hasFile: !!fileDataUrl,
      hasComments: comments.length > 0
    }));

    announce("Submitted. Redirecting…");

    const success = form.dataset.success || "success.html";
    setTimeout(() => {
      window.location.href = new URL(success, window.location.href).toString();
    }, 800);
  });
}

function renderFeedbackPage() {
  const fb = document.getElementById("fb");
  const history = document.getElementById("history");
  if (!fb && !history) return;

  const identity = ensureIdentity();
  const mine = getMySubmissions(identity.studyId);

  batchDomUpdate(() => {
    if (fb) {
      if (mine.length === 0) {
        const submitUrl = './submit.html';
        fb.innerHTML = `
          <div style="text-align:center;padding:2.5rem 1rem;">
            <i class="fa-regular fa-folder-open" style="font-size:3rem;color:#94a3b8;display:block;margin-bottom:1rem;"></i>
            <p style="font-weight:600;font-size:1.05rem;margin:0 0 .35rem;">No submissions yet</p>
            <p style="color:#64748b;font-size:.9rem;margin:0 0 1.25rem;">No submissions found for Study ID <strong>${escapeHtml(identity.studyId)}</strong>.<br>Submit an assignment first to see your feedback here.</p>
            <a href="${submitUrl}" style="display:inline-flex;align-items:center;gap:.5rem;background:#2563eb;color:#fff;padding:.6rem 1.4rem;border-radius:8px;text-decoration:none;font-weight:600;font-size:.9rem;">
              <i class="fa-solid fa-file-arrow-up"></i> Go to Submit
            </a>
          </div>
        `;
      } else {
        const framework = document.body.dataset.framework || "bootstrap";
        const tableClass = framework === "bulma" ? "table is-fullwidth" : "table table-like align-middle";
        const badgeGreen = framework === "bulma" ? "tag is-success" : "badge rounded-pill text-bg-success";
        const badgeBlue  = framework === "bulma" ? "tag is-info"    : "badge rounded-pill text-bg-primary";
        const btnOpen = framework === "bulma"
          ? "button is-small is-link is-light"
          : "btn btn-sm btn-outline-primary me-1";
        const btnView = framework === "bulma"
          ? "button is-small is-info is-light ml-1"
          : "btn btn-sm btn-outline-secondary";

        const fragment = document.createDocumentFragment();
        const recHeader = document.createElement('div');
        recHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;flex-wrap:wrap;gap:.5rem;';
        recHeader.innerHTML = `
          <h3 style="margin:0;font-size:1rem;font-weight:700;display:flex;align-items:center;gap:.5rem;">
            <i class="fa-solid fa-table-list" style="color:#2563eb;"></i> Submission Records
          </h3>
          <span style="font-size:.8rem;color:#64748b;">Click <strong>View Details</strong> to review your document</span>
        `;
        fragment.appendChild(recHeader);

        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive table-wrapper mb-3';
        
        const table = document.createElement('table');
        table.className = tableClass;
        
        const thead = document.createElement('thead');
        thead.innerHTML = `
          <tr>
            <th>Assignment</th>
            <th>Score</th>
            <th>Status</th>
            <th>Marker notes</th>
            <th>Actions</th>
          </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        mine.forEach(sub => {
          const mf = getFeedbackForSubmission(sub);
          const score = mf ? mf.score : simulateScore(sub.task);
          const status = mf ? 'Graded' : 'Passed';
          const badgeClass = mf ? badgeBlue : badgeGreen;
          const notes = mf ? mf.markerNotes : 'Awaiting marker feedback.';

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${escapeHtml(sub.task)}</td>
            <td>${score}</td>
            <td><span class="${badgeClass}">${status}</span></td>
            <td style="max-width:200px;white-space:normal;">${escapeHtml(notes)}</td>
            <td class="actions-cell" style="white-space:nowrap;"></td>
          `;

          const actionsCell = tr.querySelector('.actions-cell');

          const openBtn = document.createElement('button');
          openBtn.type = 'button';
          openBtn.className = btnOpen;
          openBtn.innerHTML = '<i class="fa-regular fa-file me-1"></i> Open file';
          if (!sub.fileDataUrl) {
            openBtn.disabled = true;
            openBtn.title = 'No file content stored — no file was chosen, or storage quota was exceeded';
          }
          openBtn.addEventListener('click', () => openSubmissionFile(sub));
          actionsCell.appendChild(openBtn);

          const viewBtn = document.createElement('button');
          viewBtn.type = 'button';
          viewBtn.className = btnView;
          viewBtn.innerHTML = '<i class="fa-solid fa-chevron-down fa-xs"></i> View Details';
          viewBtn.setAttribute('aria-expanded', 'false');

          const detailTr = document.createElement('tr');
          detailTr.hidden = true;
          detailTr.style.backgroundColor = 'var(--color-surface-2, #f8fafc)';
          const detailTd = document.createElement('td');
          detailTd.colSpan = 5;
          detailTd.style.cssText = 'padding:1rem 1.25rem;border-top:none;';
          detailTd.innerHTML = `
            <dl style="margin:0;display:grid;gap:.4rem;">
              <div><dt style="font-weight:600;display:inline;">Score: </dt><dd style="display:inline;">${score}</dd></div>
              <div><dt style="font-weight:600;display:inline;">Marker notes: </dt><dd style="display:inline;white-space:pre-wrap;">${escapeHtml(notes)}</dd></div>
              <div><dt style="font-weight:600;display:inline;">Submitted: </dt><dd style="display:inline;">${formatLocal(sub.createdAtISO)}</dd></div>
              ${sub.fileName ? `<div><dt style="font-weight:600;display:inline;">File: </dt><dd style="display:inline;">${escapeHtml(sub.fileName)}${sub.fileSize ? ` (${Math.round(sub.fileSize / 1024)} KB, stored: ${sub.fileDataUrl ? 'yes' : 'no'})` : ''}</dd></div>` : ''}
              ${sub.comments ? `<div><dt style="font-weight:600;display:inline;">Your comments: </dt><dd style="display:inline;white-space:pre-wrap;">${escapeHtml(sub.comments)}</dd></div>` : ''}
            </dl>
          `;
          detailTr.appendChild(detailTd);

          viewBtn.addEventListener('click', () => {
            const nowHidden = detailTr.hidden;
            detailTr.hidden = !nowHidden;
            viewBtn.innerHTML = nowHidden
              ? '<i class="fa-solid fa-chevron-up fa-xs"></i> Hide Details'
              : '<i class="fa-solid fa-chevron-down fa-xs"></i> View Details';
            viewBtn.setAttribute('aria-expanded', String(nowHidden));
          });
          actionsCell.appendChild(viewBtn);

          tbody.appendChild(tr);
          tbody.appendChild(detailTr);
        });
        table.appendChild(tbody);
        
        wrapper.appendChild(table);
        fragment.appendChild(wrapper);
        
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'margin-top:1rem;padding:.875rem 1rem;background:var(--color-surface-2,#f8fafc);border:1px solid var(--color-border,rgba(148,163,184,.18));border-radius:8px;font-size:.9em;';
        infoDiv.innerHTML = `
          <p style="margin:.25rem 0;"><strong>Study ID:</strong> ${escapeHtml(identity.studyId)}${identity.nickname ? ` (${escapeHtml(identity.nickname)})` : ''}</p>
          <p style="margin:.25rem 0;"><strong>Latest submission:</strong> ${escapeHtml(mine[0].task)} — ${formatLocal(mine[0].createdAtISO)}</p>
        `;
        fragment.appendChild(infoDiv);
        
        fb.textContent = '';
        fb.appendChild(fragment);
      }
    }

    if (history) {
      if (mine.length === 0) {
        history.textContent = '';
      } else {
        const framework = document.body.dataset.framework || "bootstrap";
        const tableClass = framework === "bulma" ? "table is-fullwidth is-striped" : "table table-like align-middle";

        const fragment = document.createDocumentFragment();
        const h3 = document.createElement('h3');
        h3.style.cssText = 'font-size:1rem;font-weight:600;margin-bottom:.5rem;';
        h3.textContent = 'Submission history';
        fragment.appendChild(h3);

        const responsiveWrapper = document.createElement('div');
        responsiveWrapper.className = 'table-responsive table-wrapper';

        const table = document.createElement('table');
        table.className = tableClass;

        const thead = document.createElement('thead');
        thead.innerHTML = `
          <tr>
            <th>#</th>
            <th>Time</th>
            <th>Assignment</th>
            <th>Score</th>
            <th>File</th>
          </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        mine.slice(0, 10).forEach((r, idx) => {
          const mf = getFeedbackForSubmission(r);
          const score = mf ? mf.score : simulateScore(r.task);

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>v${mine.length - idx}</td>
            <td style="white-space:nowrap;">${formatLocal(r.createdAtISO)}</td>
            <td>${escapeHtml(r.task)}</td>
            <td>${score}</td>
          `;

          const fileCell = document.createElement('td');
          if (r.fileDataUrl) {
            const fileBtn = document.createElement('button');
            fileBtn.type = 'button';
            fileBtn.className = framework === "bulma"
              ? "button is-small is-link is-light"
              : "btn btn-sm btn-outline-primary";
            fileBtn.innerHTML = `<i class="fa-regular fa-file me-1"></i>${escapeHtml(r.fileName)}`;
            fileBtn.addEventListener('click', () => openSubmissionFile(r));
            fileCell.appendChild(fileBtn);
          } else {
            fileCell.innerHTML = `<span style="opacity:.55;" title="File content not stored">${escapeHtml(r.fileName)}</span>`;
          }
          tr.appendChild(fileCell);
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        responsiveWrapper.appendChild(table);
        fragment.appendChild(responsiveWrapper);

        history.textContent = '';
        history.appendChild(fragment);
      }
    }
  });
}

function getMarkerFeedback() {
  const raw = localStorage.getItem('marker_feedback_v1');
  const arr = safeJsonParse(raw, []);
  return Array.isArray(arr) ? arr : [];
}

function getFeedbackForSubmission(sub) {
  if (!sub) return null;
  const all = getMarkerFeedback();
  return all.find(f =>
    (sub.id && f.submissionId === sub.id) ||
    (f.studyId === sub.studyId && f.createdAtISO === sub.createdAtISO)
  ) || null;
}

function openSubmissionFile(sub) {
  if (!sub.fileDataUrl) {
    alert('No file was stored for this submission.\n\n(Files are saved in your browser only. If no file was chosen, or the file exceeded localStorage capacity, the content is not available.)');
    return;
  }
  try {
    const parts = sub.fileDataUrl.split(',');
    const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'application/octet-stream';
    const bstr = atob(parts[parts.length - 1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    const blob = new Blob([u8arr], { type: mime });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (e) {
    const a = document.createElement('a');
    a.href = sub.fileDataUrl;
    a.download = sub.fileName || 'submission';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 200);
  }
}

function wireNavGates() {
}

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
  const base = task && task.toLowerCase().includes("lab") ? 66 : 78;
  return base;
}



function init() {
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
