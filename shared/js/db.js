import { log } from "./log.js";

const DB_KEY = "portal_db_v1";

function load() {
  return JSON.parse(localStorage.getItem(DB_KEY) || '{"assignments":[],"submissions":[],"feedbacks":[]}');
}
function save(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
function uid(prefix="id") { return prefix + "_" + Math.random().toString(36).slice(2,9); }

export function seedIfEmpty() {
  const db = load();
  if (db.assignments.length === 0) {
    db.assignments.push({
      id: "hw1",
      title: "HW1: Basic Programming Exercise",
      due: new Date(Date.now()+7*24*3600*1000).toISOString(), // Ends in 7 days
      desc: "Upload PDF or ZIP and write instructions in the notes."
    });
    save(db);
  }
}

export function listAssignments() { return load().assignments; }
export function getAssignmentById(id){ return load().assignments.find(a => a.id === id); }

export function createSubmission({ assignmentId, studentName, note, fileName }) {
  const db = load();
  const submissionId = uid("sub");
  const now = new Date().toISOString();
  const version = (db.submissions.filter(s => s.assignmentId===assignmentId).length + 1);

  const sub = { id: submissionId, assignmentId, studentName, note, fileName, ts: now, version };
  db.submissions.push(sub);
  save(db);

  log("submission_succeeded", { assignmentId, submissionId, version, fileName });
  localStorage.setItem("lastSubmissionId", submissionId);
  return submissionId;
}

export function getSubmission(id){ return load().submissions.find(s => s.id===id); }
export function getLatestSubmission(){ return getSubmission(localStorage.getItem("lastSubmissionId")); }

export function getFeedbackForSubmission(submissionId){
  return load().feedbacks.find(f => f.submissionId === submissionId);
}

export function setFeedbackForSubmission(submissionId, score, comment){
  const db = load();
  const fb = { id: uid("fb"), submissionId, score, comment, ts: new Date().toISOString() };
  db.feedbacks.push(fb);
  save(db);
  log("feedback_created", { submissionId, score });
  return fb;
}

export function listSubmissionsByStudentAndAssignment(assignmentId, studentName){
  const db = load();
  return db.submissions
    .filter(s => s.assignmentId === assignmentId && s.studentName === studentName)
    .sort((a,b) => new Date(b.ts) - new Date(a.ts)); 
}

