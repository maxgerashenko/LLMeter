// Two-level site menu. The top level (Local, Cloud, Economy, Finance, Research, Sources) is plain HTML in each
// page's header; this script marks the active section and fills the second row of tabs.
(function () {
  "use strict";
  var SECTIONS = {
    local: [
      ["Top Tier", "./#top", "index"],
      ["All Tier", "./#all", "index"],
      ["Fit", "fit.html", "fit"],
      ["Rack", "rack.html", "rack"],
      ["Runs", "runs.html", "runs"],
      ["Build", "research.html", "research"]
    ],
    cloud: [["All", "cloud.html", "cloud"], ["Rack", "cloud-rack.html", "cloud-rack"]],
    economy: [
      ["GDP", "economy.html#gdp", "economy"],
      ["Software", "economy.html#software", "economy"],
      ["Jobs", "jobs.html", "jobs"]
    ],
    finance: [["Anthropic S-1", "finance.html#anthropic-s1", "finance"], ["Anthropic IPO", "ipo.html", "ipo"]],
    research: [
      ["Speed", "techniques.html#speed", "techniques"],
      ["Quality", "techniques.html#quality", "techniques"],
      ["Horizon", "horizon.html", "horizon"]
    ]
  };
  var PAGE_SECTION = { index: "local", fit: "local", rack: "local", runs: "local", research: "local", horizon: "research", jobs: "economy", cloud: "cloud", "cloud-rack": "cloud", finance: "finance", ipo: "finance", economy: "economy", techniques: "research", sources: "sources" };

  // Shared "Tier by" choice (Local > Top Tier / All Tier). Default: Coding Agent Index; remembered across pages.
  var BASES = [
    { id: "cai", label: "Coding agent", key: "cai", desc: "Artificial Analysis Coding Agent Index v2.1 (a model run inside a coding-agent harness), as a percentage of Sonnet 5.5's 56.3. Only 10 models have it." },
    { id: "long", label: "Long coding", key: "lcs", desc: "Average of Terminal-Bench 4.0 and FrontierCode 2.0, as a percentage of Sonnet 5.5's 52.7." },
    { id: "tb4", label: "Terminal-Bench", key: "tb4", desc: "Terminal-Bench 4.0 (long command-line tasks), as a percentage of Sonnet 5.5's 63.6." },
    { id: "fc2", label: "FrontierCode", key: "fc2", desc: "FrontierCode 2.0 (hard, open-ended programming), as a percentage of Sonnet 5.5's 41.7." },
    { id: "ii", label: "Intelligence", key: "ii", desc: "Artificial Analysis Intelligence Index v5.0.1, a general index across all of its evaluations, as a percentage of Sonnet 5.5's 55.0." }
  ];
  var listeners = [], KEY = "llmeter-tier-basis", current = "cai";
  try { var saved = localStorage.getItem(KEY); if (BASES.some(function (b) { return b.id === saved; })) current = saved; } catch (e) {}
  window.LLMeterBasis = {
    bases: BASES,
    get: function () { return current; },
    onChange: function (fn) { listeners.push(fn); },
    set: function (id) {
      current = id;
      try { localStorage.setItem(KEY, id); } catch (e) {}
      listeners.forEach(function (fn) { fn(id); });
    }
  };

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
  var row = document.createElement("div");
  row.className = "wrap subnav-row";
  var inner = document.createElement("nav");
  inner.className = "subnav-inner";
  inner.setAttribute("aria-label", section.charAt(0).toUpperCase() + section.slice(1) + " pages");
  var links = items.map(function (it) {
    var a = document.createElement("a");
    a.textContent = it[0];
    a.href = it[1];
    inner.appendChild(a);
    return a;
  });
  row.appendChild(inner);
  sub.appendChild(row);
  header.appendChild(sub);

  // Right side of the second-level menu: Top Tier / All Tier choose the basis; Rack is fixed to the Coding Agent Index Runs to Long coding and Build to Effect size.
  var pick = null;
  function buildPick() {
    if (pick) { pick.remove(); pick = null; }
    var isTier = page === "index", isRack = page === "rack", isRuns = page === "runs", isBuild = page === "research";
    if (!isTier && !isRack && !isRuns && !isBuild) return;
    pick = document.createElement("label");
    pick.className = "basis-pick";
    pick.appendChild(document.createTextNode("Tier by"));
    if (isRack || isRuns || isBuild) {
      var fixed = document.createElement("span");
      fixed.className = "basis-fixed";
      fixed.textContent = isBuild ? "Effect size" : isRuns ? "Long coding" : "Coding agent";
      if (isRuns) fixed.title = "Runs tiers use the long-coding score: the average of Terminal-Bench 4.0 and FrontierCode 2.0, as a percentage of Sonnet 5.5";
      if (isBuild) fixed.title = "Build tiers are the size of each choice's largest measured effect: Tier 1 under 5%, Tier 2 from 5%, Tier 3 from 30%, Tier 4 above 100%";
      pick.appendChild(fixed);
    } else {
      var sel = document.createElement("select");
      sel.setAttribute("aria-label", "Score that defines a tier");
      BASES.forEach(function (b) {
        var o = document.createElement("option");
        o.value = b.id; o.textContent = b.label; o.selected = b.id === current;
        sel.appendChild(o);
      });
      sel.addEventListener("change", function () { window.LLMeterBasis.set(sel.value); });
      pick.appendChild(sel);
    }
    row.appendChild(pick);
  }
  buildPick();

  function activeIndex() {
    var h = location.hash;
    if (page === "index") return /^#(all|panel-all)$/.test(h) ? 1 : 0;
    if (page === "economy") return /^#(software|software-take)$/.test(h) ? 1 : 0;
    if (page === "techniques") return /^#quality/.test(h) ? 1 : 0;
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
