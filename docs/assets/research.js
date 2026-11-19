// Builds the Research page from two data files copied into docs/data/ by scripts/sync-site-data.sh:
// the techniques file (data/llm-techniques-*.csv) feeds the Speed and Quality tabs, and the
// build-choices file (data/llm-user-choices-*.csv) feeds the Build choices tab.
// No numbers are typed here: only the tier band edges, which are the article's definitions.
(function () {
  "use strict";

  var CHOICES_URL = "data/llm-user-choices-2026-11-19.csv";
  var TECHNIQUES_URL = "data/llm-techniques-2026-11-19.csv";
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

  function slug(prefix, s) { return prefix + "-" + s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function arrows(s) { return s.replace(/ -> /g, " to "); }

  function tierBadge(t) {
    if (!t) return el("span", { class: "tier-badge tier-none rs-tag", title: "Not measured yet", text: "No tier" });
    return el("span", { class: "tier-badge rs-tag tier-" + t.id, title: "Tier " + t.label + ": " + t.range }, ["Tier " + t.label]);
  }
  function tierOf(label) { return TIERS.filter(function (t) { return t.label === label; })[0] || null; }

  // Files the site serves are linked directly; other repository files go to GitHub.
  function href(u) {
    u = u.replace(/^\.\.\//, "");
    if (/^https?:/.test(u)) return u;
    return /^data\/[^/]+\.(csv|json)$/.test(u) ? u : REPO + u;
  }
  // Short "source" links (numbered when a row has several); the full name is the hover title.
  function sourceLinks(item) {
    return item.sources.map(function (s, i) {
      return el("a", { class: "rs-source", href: href(s.url), title: s.name + ". Evidence: " + s.evidence, "aria-label": "Source: " + s.name, text: item.sources.length > 1 ? "source " + (i + 1) : "source" });
    });
  }
  function sourceCell(item) {
    var src = sourceLinks(item);
    return el("td", { "data-label": "Source", class: "rs-c-source" }, [
      el("span", { class: "rs-src" }, src.length ? src : [el("span", { class: "muted", title: "Evidence: " + item.evidence, text: "none" })])
    ]);
  }

  // Build choices: one item per row of the data file.
  function choiceItems(rows) {
    return rows.map(function (c) {
      var names = c.source ? c.source.split(/;\s*/) : [];
      var urls = c.source_url ? c.source_url.split(/;\s*/) : [];
      return {
        id: slug("choice", c.choice), name: c.choice, tier: tierOf(c.effect_tier),
        pct: c.effect_pct === "" || isNaN(+c.effect_pct) ? null : Math.abs(+c.effect_pct),
        text: c.effect_pct_text, measures: c.effect_pct_measures, evidence: c.evidence, raw: c,
        sources: urls.map(function (u, i) { return { url: u, name: names[i] || "source", evidence: c.evidence }; })
      };
    });
  }

  // Speed and Quality: the data file has one row per measurement, so the rows of one technique
  // are grouped. The bar and the tier come from its largest measurement, by size (a loss counts
  // by its size, as in the article); the other measurements are listed under it in the table.
  function techniqueItems(rows, dimension) {
    var byName = {}, items = [];
    rows.filter(function (r) { return r.dimension === dimension; }).forEach(function (r) {
      var m = { pct: Math.abs(+r.effect_pct), tier: tierOf(r.effect_tier), text: r.effect_text, measures: r.metric, change: r.baseline_and_result, evidence: r.evidence, source: r.source, url: r.source_url };
      var it = byName[r.technique];
      if (!it) { it = byName[r.technique] = { id: slug(dimension, r.technique), name: r.technique, all: [], sources: [] }; items.push(it); }
      it.all.push(m);
      if (!it.sources.some(function (s) { return s.url === m.url; })) it.sources.push({ url: m.url, name: m.source, evidence: m.evidence });
    });
    items.forEach(function (it) {
      it.all.sort(function (a, b) { return b.pct - a.pct; });
      var top = it.all[0];
      it.tier = top.tier; it.pct = isNaN(top.pct) ? null : top.pct; it.text = top.text; it.measures = top.measures; it.evidence = top.evidence;
    });
    return items;
  }

  var VIEWS = {
    speed: {
      noun: "technique",
      // The multiple in brackets ("(2x to 3x)") stays in the table; the chart shows the percentage.
      barText: function (it) { return it.text.replace(/\s*\([^)]*\)$/, ""); },
      cells: techniqueCells
    },
    quality: { noun: "technique", barText: function (it) { return it.text; }, cells: techniqueCells },
    choices: {
      noun: "choice",
      barText: function (it) { return it.text; },
      cells: function (it) {
        var c = it.raw;
        return [
          el("td", { "data-label": "Options", text: c.options }),
          el("td", { "data-label": "What it changes", text: c.what_it_changes }),
          el("td", { "data-label": "Effect", class: "rs-c-effect" }, [
            it.text ? el("span", { class: "rs-headline", text: it.text }) : null,
            it.measures ? el("span", { class: "rs-measures", text: it.measures }) : null,
            el("span", { class: "rs-effect-text", text: arrows(c.effect) })
          ])
        ];
      }
    }
  };

  function techniqueCells(it) {
    var top = it.all[0], rest = it.all.slice(1);
    return [
      el("td", { "data-label": "Effect", class: "rs-c-effect" }, [el("span", { class: "rs-headline", text: top.text })]),
      el("td", { "data-label": "What the % measures", text: top.measures }),
      el("td", { "data-label": "Baseline to result", class: "rs-c-change" }, [
        el("span", { text: arrows(top.change) }),
        rest.length ? el("span", { class: "rs-also" }, [el("span", { class: "rs-also-head", text: "Also measured" })].concat(rest.map(function (m) {
          return el("span", { class: "rs-also-item" }, [el("strong", { text: m.text }), " " + m.measures + ": " + arrows(m.change)]);
        }))) : null
      ]),
      el("td", { "data-label": "Evidence", text: it.all.map(function (m) { return m.evidence; }).filter(function (e, i, a) { return a.indexOf(e) === i; }).join("; ") })
    ];
  }

  function render(view, items) {
    var cfg = VIEWS[view];
    var ranked = items.filter(function (c) { return c.tier && c.pct != null; });
    // Tier 4 first. Build choices keep the data file order within a tier (stable sort);
    // techniques go from the largest effect down, as in the article's rankings.
    ranked.sort(function (a, b) { return +b.tier.label - +a.tier.label || (cfg.noun === "technique" ? b.pct - a.pct : 0); });
    var unranked = items.filter(function (c) { return ranked.indexOf(c) < 0; });
    var max = Math.max.apply(null, ranked.map(function (c) { return c.pct; }).concat([100]));

    // Chart: one bar per item, coloured by tier
    var plot = el("div", { class: "plot rs-plot rs-plot-" + view });
    var edges = el("div", { class: "edges", "aria-hidden": "true" });
    plot.appendChild(edges);
    EDGES.forEach(function (e, i) {
      // On a long scale the 5% and 30% lines sit close together: keep the line, drop the label that would overlap.
      var crowded = i + 1 < EDGES.length && (EDGES[i + 1] - e) / max * 100 < 4;
      edges.appendChild(el("span", { class: "edge", style: "left:" + (e / max * 100) + "%" }, crowded ? [] : [el("span", { class: "edge-label", text: e + "%" })]));
    });
    ranked.concat(unranked).forEach(function (c) {
      var measured = ranked.indexOf(c) >= 0;
      plot.appendChild(el("div", { class: "rs-row" }, [
        el("span", { class: "rs-label", title: c.name }, [tierBadge(measured ? c.tier : null), el("span", { class: "rs-name", text: c.name })]),
        el("span", { class: "rs-track" + (measured ? "" : " rs-none"), title: measured ? c.measures : null },
          measured ? [el("span", { class: "bar tier-bg-" + c.tier.id, style: "width:" + Math.max(0.6, c.pct / max * 100) + "%" })] : ["not measured yet"]),
        el("span", { class: "rs-value" + (measured ? "" : " muted"), title: measured ? c.measures : null, text: measured ? cfg.barText(c) : "n/a" }),
        el("a", { class: "explain rs-more", href: "#" + c.id, title: "Details and sources for: " + c.name, "aria-label": "Details for " + c.name }, ["Details"])
      ]));
    });
    var bars = document.getElementById("rs-bars-" + view);
    bars.textContent = "";
    bars.appendChild(plot);

    var legend = document.getElementById("rs-legend-" + view);
    legend.textContent = "";
    TIERS.forEach(function (t) {
      legend.appendChild(el("span", { class: "legend-item" }, [el("span", { class: "swatch tier-bg-" + t.id }), "Tier " + t.label + ": " + t.range]));
    });

    // Details table: one row per item with its tier, as in the Runs details table
    var body = document.getElementById("rs-rows-" + view);
    body.textContent = "";
    ranked.concat(unranked).forEach(function (c) {
      body.appendChild(el("tr", { id: c.id, class: "rs-choice" }, [
        el("td", { "data-label": "Tier", class: "rs-c-tier" }, [tierBadge(ranked.indexOf(c) >= 0 ? c.tier : null)]),
        el("th", { scope: "row", class: "rs-c-choice" }, [c.name])
      ].concat(cfg.cells(c)).concat([sourceCell(c)])));
    });
  }

  // Tabs: Speed, Quality and Build choices. The hash picks the tab (#speed, #quality, #choices),
  // and a hash that names a table row (#speed-..., #quality-..., #choice-...) opens its tab too.
  var TABS = ["speed", "quality", "choices"];
  function tabForHash() {
    var h = location.hash.slice(1);
    if (TABS.indexOf(h) >= 0) return h;
    var m = /^(speed|quality|choice)-/.exec(h);
    return m ? (m[1] === "choice" ? "choices" : m[1]) : (h === "details" ? "choices" : TABS[0]);
  }
  function showTab(name) {
    TABS.forEach(function (t) {
      var on = t === name, tab = document.getElementById("tab-" + t);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      document.getElementById("panel-" + t).hidden = !on;
    });
  }
  // Rows are built after load, and may sit in a tab that was hidden, so a link to a row needs a manual jump.
  function jumpToRow() {
    if (!/^#(speed|quality|choice)-/.test(location.hash)) return;
    var target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView();
  }
  TABS.forEach(function (t, i) {
    var tab = document.getElementById("tab-" + t);
    tab.addEventListener("click", function () {
      showTab(t);
      history.replaceState(null, "", "#" + t);
    });
    tab.addEventListener("keydown", function (e) {
      var step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      var next = TABS[(i + step + TABS.length) % TABS.length];
      showTab(next);
      history.replaceState(null, "", "#" + next);
      document.getElementById("tab-" + next).focus();
    });
  });
  window.addEventListener("hashchange", function () { showTab(tabForHash()); jumpToRow(); });
  showTab(tabForHash());

  function load(url, views, build) {
    return fetch(url)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (text) {
        var rows = parseCSV(text);
        views.forEach(function (v) { render(v, build(rows, v)); });
        return rows;
      })
      .catch(function (err) {
        views.forEach(function (v) {
          document.getElementById("rs-rows-" + v).innerHTML =
            '<tr><td colspan="7">Could not load the data file (' + String(err.message || err) +
            '). See <a href="' + url + '">the CSV</a>.</td></tr>';
        });
      });
  }

  Promise.all([
    load(TECHNIQUES_URL, ["speed", "quality"], techniqueItems),
    load(CHOICES_URL, ["choices"], choiceItems)
  ]).then(function (res) {
    var rows = res[0] || res[1];
    if (rows && rows[0] && rows[0].read) document.getElementById("rs-read").textContent = rows[0].read;
    jumpToRow();
  });
})();
