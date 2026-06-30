// 一日一字（く） · ichinichi-ichijiku — Google Analytics (GA4) loader.
//
// Kept as a separate "self" script on purpose: the page's Content-Security-Policy
// has no 'unsafe-inline', so the classic inline gtag snippet would be blocked.
// This file loads from the same origin (allowed by `script-src 'self'`) and then
// pulls in gtag.js from googletagmanager.com (allowed by the CSP additions in
// index.html: script-src + connect-src + img-src for *.googletagmanager.com and
// *.google-analytics.com / *.analytics.google.com).
//
// The Measurement ID below comes from GA4 (Admin → Data Streams). To point at a
// different property, change it; to turn analytics off entirely, set it to "".
const MEASUREMENT_ID = "G-CJ7YBPYZ2F";

// Don't phone home from local previews (see DEVELOPERS.md → Local preview), so
// forks and `python3 -m http.server` stay analytics-free.
const IS_LOCAL = ["localhost", "127.0.0.1", "0.0.0.0", ""].includes(location.hostname);

if (MEASUREMENT_ID && !IS_LOCAL) {
  const tag = document.createElement("script");
  tag.async = true;
  tag.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(MEASUREMENT_ID);
  document.head.appendChild(tag);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag("js", new Date());
  // GA4 truncates IP addresses by default, so there's no full-IP logging to opt out of.
  gtag("config", MEASUREMENT_ID);
}
