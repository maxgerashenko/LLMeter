// Google Analytics 4, loaded async on every page. Does nothing until an ID is set.
// Opt out per browser with ?ga_off=1 (undo with ?ga_off=0).
// To turn it on: create a GA4 property, copy its Measurement ID (looks like G-ABC123XYZ9)
// and paste it between the quotes below. Leave it empty to keep analytics off.
(function () {
  "use strict";
  var GA_MEASUREMENT_ID = "G-TTSZ1LC89F"; // e.g. "G-ABC123XYZ9"

  if (!/^G-[A-Z0-9]{6,}$/.test(GA_MEASUREMENT_ID)) return;
  // Manual opt-out: open any page with ?ga_off=1 to stop analytics on this browser,
  // ?ga_off=0 to turn it back on. Stored in localStorage (no cookie).
  var KEY = "llmeter-analytics-optout";
  try {
    var q = new URLSearchParams(location.search).get("ga_off");
    if (q === "1") localStorage.setItem(KEY, "1");
    else if (q === "0") localStorage.removeItem(KEY);
  } catch (e) {}
  // Respect browser privacy signals and the stored opt-out.
  try {
    if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl) return;
    if (localStorage.getItem(KEY) === "1") { window["ga-disable-" + GA_MEASUREMENT_ID] = true; return; }
  } catch (e) {}

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID);

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_MEASUREMENT_ID;
  document.head.appendChild(s);
})();
