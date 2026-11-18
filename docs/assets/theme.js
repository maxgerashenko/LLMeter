// Light / dark / system theme switch. Loaded in <head> so the saved choice
// is applied before the page paints (no flash of the wrong theme).
(function () {
  "use strict";
  var KEY = "llmeter-theme";
  var ORDER = ["system", "light", "dark"];
  var root = document.documentElement;

  function saved() {
    try { var v = localStorage.getItem(KEY); return ORDER.indexOf(v) > 0 ? v : "system"; } catch (e) { return "system"; }
  }
  function apply(mode) {
    if (mode === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);
  }
  apply(saved());

  var ICONS = {
    system: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    dark: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'
  };
  var LABELS = { system: "System theme", light: "Light theme", dark: "Dark theme" };

  function paint(btn, mode) {
    var next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[mode] + "</svg>";
    btn.setAttribute("aria-label", LABELS[mode] + ". Switch to " + LABELS[next].toLowerCase());
    btn.title = LABELS[mode] + " (click for " + next + ")";
  }

  function mount() {
    var host = document.querySelector(".header-inner");
    if (!host || host.querySelector(".theme-toggle")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle";
    var mode = saved();
    paint(btn, mode);
    btn.addEventListener("click", function () {
      mode = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
      try { if (mode === "system") localStorage.removeItem(KEY); else localStorage.setItem(KEY, mode); } catch (e) {}
      apply(mode);
      paint(btn, mode);
      document.dispatchEvent(new CustomEvent("themechange", { detail: { mode: mode } }));
    });
    host.appendChild(btn);
  }

  // Keep other open tabs in step.
  window.addEventListener("storage", function (e) {
    if (e.key !== KEY) return;
    var mode = saved();
    apply(mode);
    var btn = document.querySelector(".theme-toggle");
    if (btn) paint(btn, mode);
    document.dispatchEvent(new CustomEvent("themechange", { detail: { mode: mode } }));
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
