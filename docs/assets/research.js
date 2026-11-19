// Builds the Research page from the build-choices data file (data/llm-user-choices-*.csv,
// copied into docs/data/ by scripts/sync-site-data.sh). No numbers are typed here:
// only the tier band edges, which are the article's definitions.
(function () {
  "use strict";

  var DATA_URL = "data/llm-user-choices-2026-11-19.csv";
  var REPO = "https://github.com/maxgerashenko/LLMeter/blob/main/";

  // Effect tiers, from articles/llm-performance-techniques.md
  var TIERS = [
    { id: "t4", label: "4", range: "more than 100%" },
    { id: "t3", label: "3", range: "30% to 100%" },
    { id: "t2", label: "2", range: "5% to 30%" },
    { id: "t1", label: "1", range: "less than 5%" }
  ];
  var EDGES = [5, 30, 100];

  function parseCSV(text) {
    var rows = [], row = [], field = "", inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') inQuotes = false;
        else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else field += c;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    var head = rows.shift();
    return rows.map(function (r) {
      var o = {};
      head.forEach(function (h, j) { o[h] = (r[j] || "").trim(); });
      return o;
    });
  }

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null) return;
      if (k === "text") e.textContent = attrs[k];
      else if (k === "class") e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }

  function slug(s) { return "choice-" + s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  function tierBadge(t) {
    if (!t) return el("span", { class: "tier-badge tier-none rs-tag", title: "Not measured yet", text: "No tier" });
    return el("span", { class: "tier-badge rs-tag tier-" + t.id, title: "Tier " + t.label + ": " + t.range }, ["Tier " + t.label]);
  }

  // Files the site serves are linked directly; other repository files go to GitHub.
  function href(u) {
    if (/^https?:/.test(u)) return u;
    return /^data\/[^/]+\.(csv|json)$/.test(u) ? u : REPO + u;
  }
  // Short "source" links (numbered when a row has several); the full name is the hover title.
  function sourceLinks(c) {
    var names = c.source ? c.source.split(/;\s*/) : [];
    var urls = c.source_url ? c.source_url.split(/;\s*/) : [];
    var out = [];
    urls.forEach(function (u, i) {
      out.push(el("a", { class: "rs-source", href: href(u), title: (names[i] || "source") + ". Evidence: " + c.evidence, "aria-label": "Source: " + (names[i] || "link"), text: urls.length > 1 ? "source " + (i + 1) : "source" }));
    });
    return out;
  }

  function render(choices) {
    choices.forEach(function (c) {
      c.id = slug(c.choice);
      c.tier = TIERS.filter(function (t) { return t.label === c.effect_tier; })[0] || null;
      c.pct = c.effect_pct === "" || isNaN(+c.effect_pct) ? null : +c.effect_pct;
    });
    var ranked = choices.filter(function (c) { return c.tier && c.pct != null; })
      .sort(function (a, b) { return +b.tier.label - +a.tier.label; }); // stable: data file order within a tier
    var unranked = choices.filter(function (c) { return ranked.indexOf(c) < 0; });
    var max = Math.max.apply(null, ranked.map(function (c) { return c.pct; }).concat([100]));

    // Chart: one bar per choice, coloured by tier
    var plot = el("div", { class: "plot rs-plot" });
    var edges = el("div", { class: "edges", "aria-hidden": "true" });
    plot.appendChild(edges);
    EDGES.forEach(function (e) {
      edges.appendChild(el("span", { class: "edge", style: "left:" + (e / max * 100) + "%" }, [el("span", { class: "edge-label", text: e + "%" })]));
    });
    ranked.concat(unranked).forEach(function (c) {
      var measured = c.tier && c.pct != null;
      plot.appendChild(el("div", { class: "rs-row" }, [
        el("span", { class: "rs-label", title: c.choice }, [tierBadge(measured ? c.tier : null), el("span", { class: "rs-name", text: c.choice })]),
        el("span", { class: "rs-track" + (measured ? "" : " rs-none"), title: measured ? c.effect_pct_measures : null },
          measured ? [el("span", { class: "bar tier-bg-" + c.tier.id, style: "width:" + Math.max(0.6, c.pct / max * 100) + "%" })] : ["not measured yet"]),
        el("span", { class: "rs-value" + (measured ? "" : " muted"), title: measured ? c.effect_pct_measures : null, text: measured ? c.effect_pct_text : "n/a" }),
        el("a", { class: "explain rs-more", href: "#" + c.id, title: "Details and sources for: " + c.choice, "aria-label": "Details for " + c.choice }, ["Details"])
      ]));
    });
    var bars = document.getElementById("rs-bars");
    bars.textContent = "";
    bars.appendChild(plot);

    var legend = document.getElementById("rs-legend");
    legend.textContent = "";
    TIERS.forEach(function (t) {
      legend.appendChild(el("span", { class: "legend-item" }, [el("span", { class: "swatch tier-bg-" + t.id }), "Tier " + t.label + ": " + t.range]));
    });

    // Details table: one row per choice with its tier, as in the Runs details table
    var body = document.getElementById("rs-rows");
    body.textContent = "";
    ranked.concat(unranked).forEach(function (c) {
      var src = sourceLinks(c);
      body.appendChild(el("tr", { id: c.id, class: "rs-choice" }, [
        el("td", { "data-label": "Tier", class: "rs-c-tier" }, [tierBadge(c.tier && c.pct != null ? c.tier : null)]),
        el("th", { scope: "row", class: "rs-c-choice" }, [c.choice]),
        el("td", { "data-label": "Options", text: c.options }),
        el("td", { "data-label": "What it changes", text: c.what_it_changes }),
        el("td", { "data-label": "Effect", class: "rs-c-effect" }, [
          c.effect_pct_text ? el("span", { class: "rs-headline", text: c.effect_pct_text }) : null,
          c.effect_pct_measures ? el("span", { class: "rs-measures", text: c.effect_pct_measures }) : null,
          el("span", { class: "rs-effect-text", text: c.effect.replace(/ -> /g, " to ") })
        ]),
        el("td", { "data-label": "Source", class: "rs-c-source" }, [
          el("span", { class: "rs-src" }, src.length ? src : [el("span", { class: "muted", title: "Evidence: " + c.evidence, text: "none" })])
        ])
      ]));
    });

    if (choices[0] && choices[0].read) document.getElementById("rs-read").textContent = choices[0].read;

    // Rows are built after load, so a link straight to one row needs a manual jump.
    if (/^#choice-/.test(location.hash)) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
    }
  }

  fetch(DATA_URL)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (text) { render(parseCSV(text)); })
    .catch(function (err) {
      document.getElementById("rs-rows").innerHTML =
        '<tr><td colspan="6">Could not load the data file (' + String(err.message || err) +
        '). See <a href="' + DATA_URL + '">the CSV</a>.</td></tr>';
    });
})();
