const THEME_KEY = "bb_theme"; // "light" | "dark"

function applyTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  
  // Setting the data-theme attribute on the document element allows CSS to apply the appropriate styles based on the current theme.
  document.documentElement.dataset.theme = t;
  const btn = document.getElementById("themeToggle");
  if (btn) btn.setAttribute("aria-pressed", String(t === "dark"));
}

// Retrieve the saved theme from localStorage, defaulting to "light" if no preference is found. 
function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) || "light";
}

// Toggle between light and dark themes, saving the user's preference in localStorage for persistence across sessions. 
function toggleTheme() {
  const current = document.documentElement.dataset.theme || "light";
  const next = current === "dark" ? "light" : "dark";
  // Save the user's theme preference in localStorage.
  localStorage.setItem(THEME_KEY, next);
  // Apply the new theme immediately
  applyTheme(next);
}

// Apply theme as early as possible to prevent flash
const savedTheme = getSavedTheme();
applyTheme(savedTheme);
