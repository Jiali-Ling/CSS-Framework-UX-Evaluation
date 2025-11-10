import {
  seedIfEmpty, listAssignments, getAssignmentById, createSubmission,
  getLatestSubmission, getFeedbackForSubmission, setFeedbackForSubmission,
  listSubmissionsByStudentAndAssignment
} from "./db.js";
import { log } from "./log.js";
import { getUser, login, logout, requireAuth, injectGreeting } from "./auth.js"


document.addEventListener("DOMContentLoaded", () => {
  seedIfEmpty();
  injectGreeting();

  const path = location.pathname;
  if (path.endsWith("/index.html")) initIndex();
  if (path.endsWith("/submit.html")) initSubmit();
  if (path.endsWith("/success.html")) initSuccess();
  if (path.endsWith("/feedback.html")) initFeedback();
});

function initIndex(){
  const form = document.querySelector("#loginForm");
  if (form) {
    form.addEventListener("submit", (e)=>{
      e.preventDefault();
      const name = (form.name?.value || "").trim();
      const studentId = (form.studentId?.value || "").trim();
      if(!name){
        alert("Please enter your name");
        return;
      }
      try{
        login({ name, id: studentId });
        const next = new URL(location.href).searchParams.get("next");
        location.href = next ? `./${next}` : "./submit.html";
      }catch{
        alert("Login failed");
      }
    });
  }
  log("home_viewed");
}

function initSubmit(){
  const url = new URL(location.href);
  const aid = url.searchParams.get("aid") || "hw1";
  const a   = getAssignmentById(aid);

  const titleEl = document.querySelector("#assignmentTitle");
  const dueEl   = document.querySelector("#assignmentDue");

  if (titleEl && a) {
    if ("value" in titleEl) titleEl.value = a.title;
    else titleEl.textContent = a.title;
  }
  if (dueEl && a) {
    const dueText = new Date(a.due).toLocaleString();
    if ("value" in dueEl) dueEl.value = dueText;
    else dueEl.textContent = dueText;
  }

  const form = document.querySelector("#submitForm");
  const err  = document.querySelector("#err");
  if (!form) { log("submit_viewed_no_form"); return; }

  const first = form.querySelector('input[name="studentName"]');
  if (first) first.focus();

  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    if (err) err.textContent = "";

    const studentName = form.studentName.value.trim();
    const note        = form.note.value.trim();
    const file        = form.file.files[0];

    if(!studentName){
      if (err) err.textContent = "Please fill in your name";
      log("submission_validation_error", { reason: "empty_name" });
      return;
    }
    if(!file){
      if (err) err.textContent = "Please select the file to upload";
      log("submission_validation_error", { reason: "no_file" });
      return;
    }
    const allowedExt = ["pdf","zip"];
    const maxBytes   = 10 * 1024 * 1024; // 10MB
    const ext = (file.name.split(".").pop() || "").toLowerCase();

    if(!allowedExt.includes(ext)){
      if (err) err.textContent = "Only supports PDF or ZIP files";
      log("submission_validation_error", { reason: "bad_extension", file: file.name });
      return;
    }
    if(file.size > maxBytes){
      if (err) err.textContent = "File too large (>10MB)";
      log("submission_validation_error", { reason: "too_large", size: file.size });
      return;
    }
    // ————————————————————————————————

    createSubmission({
      assignmentId: aid,
      studentName,
      note,
      fileName: file.name
    });

    location.href = "./success.html";
  });

  log("submit_viewed", { assignmentId: aid });
}

function initSuccess(){
  const sub = getLatestSubmission();
  const box = document.querySelector("#info");
  if(!box) return;
  if(!sub){ box.innerHTML = "<p>No submissions yet.</p>"; return; }
  box.innerHTML = `
    <p>Operation:<strong>${sub.assignmentId}</strong></p>
    <p>Name:${sub.studentName}</p>
    <p>document:${sub.fileName}</p>
    <p>Version:v${sub.version}</p>
    <p>time:${new Date(sub.ts).toLocaleString()}</p>
    <div class="mt-2">
      <a class="btn btn-primary" href="./feedback.html">View feedback</a>
      <a class="btn btn-light ms-2" href="./submit.html?aid=${encodeURIComponent(sub.assignmentId)}">Resubmit</a>
    </div>
  `;
  log("success_viewed", { submissionId: sub.id });
}

function initFeedback(){
  const sub = getLatestSubmission();
  const box = document.querySelector("#fb");
  if(!box) return;
  if(!sub){ box.innerHTML = "<p>Please submit your assignment once first.</p>"; return; }

  let fb = getFeedbackForSubmission(sub.id);

  if(!fb){
    box.innerHTML = `
      <p class="muted">There is currently no feedback from teachers.</p>
      <button id="simulate" class="btn btn-primary">Click Simulate to generate a feedback</button>
    `;
    document.querySelector("#simulate").addEventListener("click", ()=>{
      const score = Math.floor(70 + Math.random()*25);
      fb = setFeedbackForSubmission(
        sub.id,
        score,
        "Example comments: The code structure is clear, pay attention to comments."
      );
      renderFb(fb, sub);
      renderHistory(sub); 
    });
  } else {
// Existing feedback: direct rendering feedback + history
    renderFb(fb, sub);
    renderHistory(sub); 
  }

  log("feedback_viewed", { submissionId: sub?.id });
}

function renderFb(fb, sub){ 
  const box = document.querySelector("#fb");
  box.innerHTML = `
    <div class="card p-3">
      <p>Operation:<strong>${sub.assignmentId}</strong>(v${sub.version})</p>
      <p>Fraction:<strong>${fb.score}</strong></p>
      <p>Comments:${fb.comment}</p>
      <p>time:${new Date(fb.ts).toLocaleString()}</p>
      <div class="mt-2">
        <a class="btn btn-light" href="./submit.html?aid=${encodeURIComponent(sub.assignmentId)}">Not satisfied? Resubmit</a>
      </div>
    </div>
  `;
}
// Render historical version + Appeal button
function renderHistory(sub){
  const box = document.querySelector("#history");
  if(!box || !sub) return;

  const list = listSubmissionsByStudentAndAssignment(sub.assignmentId, sub.studentName);
  if(!list || !list.length){ box.innerHTML = ""; return; }

  const rows = list.map(s => `
    <tr>
      <td>v${s.version}</td>
      <td>${new Date(s.ts).toLocaleString()}</td>
      <td>${s.fileName || "-"}</td>
    </tr>
  `).join("");

  box.innerHTML = `
    <div class="card p-3">
      <p><strong>History</strong></p>
      <table class="table table-like is-fullwidth">
        <thead><tr><th>Version</th><th>Time</th><th>File</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="mt-2">
        <button id="appeal" class="btn btn-primary button is-primary">Appeal</button>
        <span id="appealMsg" class="muted help" style="margin-left:8px;"></span>
      </div>
    </div>
  `;

  const btn = document.querySelector("#appeal");
  const msg = document.querySelector("#appealMsg");
  if(btn){
    btn.addEventListener("click", ()=>{
      log("appeal_requested", { submissionId: sub.id });
      msg.textContent = "Appeal submitted (demo).";
    });
  }
}

