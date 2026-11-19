// Google Analytics 4, loaded async on every page. Does nothing until an ID is set.
// To turn it on: create a GA4 property, copy its Measurement ID (looks like G-ABC123XYZ9)
// and paste it between the quotes below. Leave it empty to keep analytics off.
(function () {
  "use strict";
  var GA_MEASUREMENT_ID = "G-TTSZ1LC89F"; // e.g. "G-ABC123XYZ9"

  if (!/^G-[A-Z0-9]{6,}$/.test(GA_MEASUREMENT_ID)) return;
  // Respect browser privacy signals and a manual opt-out
  // (run localStorage.setItem("llmeter-analytics-optout", "1") to opt out).
  try {
    if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl) return;
    if (localStorage.getItem("llmeter-analytics-optout") === "1") return;
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
