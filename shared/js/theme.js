// shared/js/theme.js
const THEME_KEY = "bb_theme"; // "light" | "dark"

function applyTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = t;

  const btn = document.getElementById("themeToggle");
  if (btn) btn.setAttribute("aria-pressed", String(t === "dark"));
}

function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) || "light";
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme || "light";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

document.addEventListener("DOMContentLoaded", () => {
  applyTheme(getSavedTheme());
  const btn = document.getElementById("themeToggle");
  if (btn) btn.addEventListener("click", toggleTheme);
});
