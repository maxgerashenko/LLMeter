// Two-level site menu. The top level (Local, Cloud, Finance, Sources) is plain HTML in each
// page's header; this script marks the active section and fills the second row of tabs.
(function () {
  "use strict";
  var SECTIONS = {
    local: [
      ["Top Tier", "./#top", "index"],
      ["All Tier", "./#all", "index"],
      ["Rack", "rack.html", "rack"],
      ["Runs", "runs.html", "runs"]
    ],
    cloud: [["Intelligence", "intelligence.html", "intelligence"], ["All", "cloud.html", "cloud"]],
    finance: [
      ["GDP", "finance.html#gdp", "finance"],
      ["Software", "finance.html#software", "finance"],
      ["Anthropic S-1", "finance.html#anthropic-s1", "finance"]
    ]
  };
  var PAGE_SECTION = { index: "local", rack: "local", runs: "local", intelligence: "cloud", cloud: "cloud", finance: "finance", sources: "sources" };

  var page = (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "") || "index";
  var section = PAGE_SECTION[page];
  var header = document.querySelector(".site-header");
  var nav = document.querySelector(".nav");
  if (!header || !nav || !section) return;

  nav.setAttribute("aria-label", "Sections");
  [].forEach.call(nav.querySelectorAll("a"), function (a) {
    if (a.getAttribute("data-section") === section) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  var items = SECTIONS[section];
  if (!items) return;
  var sub = document.createElement("div");
  sub.className = "subnav";
  var inner = document.createElement("nav");
  inner.className = "wrap subnav-inner";
  inner.setAttribute("aria-label", section.charAt(0).toUpperCase() + section.slice(1) + " pages");
  var links = items.map(function (it) {
    var a = document.createElement("a");
    a.textContent = it[0];
    a.href = it[1];
    inner.appendChild(a);
    return a;
  });
  sub.appendChild(inner);
  header.appendChild(sub);

  function activeIndex() {
    var h = location.hash;
    if (page === "index") return /^#(all|panel-all)$/.test(h) ? 1 : 0;
    if (page === "finance") return /^#(economy|gdp)$/.test(h) ? 0 : /^#(software|software-take)$/.test(h) ? 1 : 2;
    for (var i = 0; i < items.length; i++) if (items[i][2] === page) return i;
    return 0;
  }
  function mark() {
    var cur = activeIndex();
    links.forEach(function (a, i) {
      if (i === cur) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }
  window.addEventListener("hashchange", mark);
  mark();
})();
