import { log } from "./log.js";

const AUTH_KEY = "auth_user";

export function getUser(){
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); }
  catch { return null; }
}

export function login({ name, id }){
  if(!name) throw new Error("missing_name");
  const user = { name, id: id || "" };
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  log("login_succeeded", { name });
  return user;
}

export function logout(){
  localStorage.removeItem(AUTH_KEY);
  log("logout", {});
}

export function requireAuth(){
  const u = getUser();
  if(!u){
    const next = location.pathname.split("/").pop(); 
    location.href = `./index.html?next=${encodeURIComponent(next)}`;
    return false;
  }
  return true;
}

export function injectGreeting(){
  const u = getUser();
  const bar = document.querySelector(".top-right");
  if(!u || !bar) return;

  if(bar.querySelector("[data-auth-ui]")) return;

  const wrap = document.createElement("span");
  wrap.setAttribute("data-auth-ui","1");
  wrap.style.display = "inline-flex";
  wrap.style.alignItems = "center";
  wrap.style.gap = "8px";
  wrap.style.marginRight = "8px";

  const hi = document.createElement("span");
  hi.className = "has-text-grey";
  hi.textContent = `Hi, ${u.name}`;

  const btn = document.createElement("button");
  btn.className = "button is-light";
  btn.textContent = "Logout";
  btn.addEventListener("click", ()=>{
    logout();
    location.href = "./index.html";
  });

  wrap.appendChild(hi);
  wrap.appendChild(btn);
  bar.prepend(wrap);
}
