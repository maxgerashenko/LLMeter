// Builds the tier page from the comparison data file (data/long-coding-tasks-*.csv,
// copied into docs/data/ by scripts/sync-site-data.sh). No numbers are typed here:
// only the tier band edges, which are the article's definitions.
(function () {
  "use strict";

  var DATA_URL = "data/long-coding-tasks-2026-11-17.csv";
  var REFERENCE = "Claude Sonnet 5.5 (Max)";

  // Tier bands, from articles/long-coding-tiers-local-models.md#how-tiers-are-defined
  var TIERS = [
    { id: "max", label: "Max", name: "cloud reference", min: null, desc: "Claude Sonnet 5.5 itself, cloud only. The 100% reference." },
    { id: "t4", label: "4", name: "near-frontier", min: 75, desc: "75% or more. Could stand in for Sonnet 5.5 on most long tasks." },
    { id: "t3", label: "3", name: "strong", min: 55, desc: "55% to 75%. Finishes a little over half of what Sonnet 5.5 finishes." },
    { id: "t2", label: "2", name: "capable", min: 40, desc: "40% to 55%. Useful for long tasks with supervision." },
    { id: "t1", label: "1", name: "assistant", min: 20, desc: "20% to 40%. Finishes some long tasks; better for shorter, well-scoped ones." },
    { id: "t0", label: "0", name: "below the bar", min: 0, desc: "Under 20%. Rarely finishes a long task." }
  ];

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

  function num(v) { return v === "" || v == null || isNaN(+v) ? null : +v; }

  function tierFor(m) {
    if (m.model === REFERENCE) return TIERS[0];
    if (m.pct == null) return null;
    for (var i = 1; i < TIERS.length; i++) if (m.pct >= TIERS[i].min) return TIERS[i];
    return null;
  }

  // "GLM-5.3 (Max)" -> { base: "GLM-5.3", setting: "Max" }
  function splitName(name) {
    var m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(name);
    return m ? { base: m[1], setting: m[2] } : { base: name, setting: "" };
  }

  // Link a model to its most specific source: its own model page if listed,
  // else the leaderboard its main score comes from.
  function sourceFor(m) {
    var urls = (m.sources.match(/https?:\/\/[^\s;]+/g) || []);
    var page = urls.filter(function (u) { return /artificialanalysis\.ai\/models\/[^/]+$/.test(u); })[0];
    if (page) return page;
    if (m.cai != null) return "https://artificialanalysis.ai/agents/coding-agents";
    var tb = urls.filter(function (u) { return /terminalbench/.test(u); })[0];
    return tb || urls[0] || "#";
  }

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") e.textContent = attrs[k];
      else if (k === "class") e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }

  function modelLink(m, opts) {
    var n = splitName(m.model);
    var a = el("a", { href: sourceFor(m), class: "model-link", title: "Source for " + m.model }, [n.base]);
    var bits = [a];
    if (n.setting && !(opts && opts.hideSetting)) bits.push(el("span", { class: "setting", text: n.setting }));
    if (!m.open) bits.push(el("span", { class: "pill pill-cloud", text: "cloud" }));
    return el("span", { class: "model" }, bits);
  }

  function tierBadge(t) {
    if (!t) return el("span", { class: "muted", text: "n/a" });
    return el("span", { class: "tier-badge tier-" + t.id, title: t.name }, [t.id === "max" ? "Max" : "Tier " + t.label]);
  }

  function fmtPct(p) { return p == null ? "n/a" : Math.round(p) + "%"; }
  function fmt(v) { return v == null ? "" : String(v); }

  function render(models) {
    var ref = models.filter(function (m) { return m.model === REFERENCE; })[0];

    // Best open-weights model per tier: the highest unrounded long-coding score in the band.
    var picks = TIERS.map(function (t) {
      if (t.id === "max") return { tier: t, model: ref };
      var inBand = models.filter(function (m) { return m.open && tierFor(m) === t; });
      inBand.sort(function (a, b) { return (b.lcs - a.lcs) || (b.pct - a.pct); });
      return { tier: t, model: inBand[0] || null };
    });

    // Tier table
    var body = document.getElementById("tier-rows");
    body.textContent = "";
    picks.forEach(function (p) {
      var m = p.model;
      var share = m ? el("div", { class: "share" }, [
        el("span", { class: "share-num", text: fmtPct(m.pct) }),
        el("span", { class: "share-track", "aria-hidden": "true" }, [
          el("span", { class: "share-fill tier-bg-" + p.tier.id, style: "width:" + Math.min(100, m.pct) + "%" })
        ])
      ]) : el("span", { class: "muted", text: "none" });
      var cai = m ? el("span", { class: "score" }, [
        m.ii != null ? m.ii.toFixed(1) : "n/a",
        m.cai != null
          ? el("span", { class: "sub", text: "(" + m.cai.toFixed(1) + ")" })
          : el("span", { class: "pill pill-muted sub-pill", text: "not scored" })
      ]) : null;
      body.appendChild(el("tr", null, [
        el("th", { scope: "row" }, [
          el("div", { class: "tier-cell" }, [tierBadge(p.tier), el("span", { class: "tier-name", text: p.tier.name })])
        ]),
        el("td", { class: "num" }, [share]),
        el("td", { class: "num" }, [cai]),
        el("td", null, [m ? modelLink(m, { hideSetting: true }) : el("span", { class: "muted", text: "none" })])
      ]));
    });

    // Band list in the method section
    var bl = document.getElementById("band-list");
    TIERS.forEach(function (t) {
      bl.appendChild(el("li", null, [tierBadge(t), el("span", null, [el("strong", { text: " " + t.name + ": " }), t.desc])]));
    });

    // Bar chart
    var chartModels = models.filter(function (m) { return m.pct != null; })
      .sort(function (a, b) { return b.pct - a.pct; });
    var max = Math.max(110, Math.max.apply(null, chartModels.map(function (m) { return m.pct; })));
    var bars = document.getElementById("bars");
    var plot = el("div", { class: "plot" });
    var edges = el("div", { class: "edges", "aria-hidden": "true" });
    plot.appendChild(edges);
    [75, 55, 40, 20].forEach(function (edge) {
      edges.appendChild(el("span", { class: "edge", style: "left:" + (edge / max * 100) + "%" }, [el("span", { class: "edge-label", text: edge + "%" })]));
    });
    edges.appendChild(el("span", { class: "edge edge-ref", style: "left:" + (100 / max * 100) + "%" }, [el("span", { class: "edge-label", text: "Sonnet 5.5" })]));
    chartModels.forEach(function (m) {
      var t = tierFor(m);
      var cls = m.open && t ? "tier-bg-" + t.id : (m.model === REFERENCE ? "tier-bg-max" : "bar-cloud");
      var n = splitName(m.model);
      plot.appendChild(el("div", { class: "bar-row" + (m.model === REFERENCE ? " is-ref" : "") }, [
        el("span", { class: "bar-label" }, [el("a", { href: sourceFor(m), text: n.base }), n.setting ? el("span", { class: "setting", text: n.setting }) : null]),
        el("span", { class: "bar-track" }, [
          el("span", { class: "bar " + cls, style: "width:" + Math.max(0.6, m.pct / max * 100) + "%" }),
          el("span", { class: "bar-value", style: "left:" + (m.pct / max * 100) + "%", text: fmtPct(m.pct) })
        ])
      ]));
    });
    bars.appendChild(plot);
    var legend = document.getElementById("legend");
    TIERS.forEach(function (t) {
      legend.appendChild(el("span", { class: "legend-item" }, [el("span", { class: "swatch tier-bg-" + t.id }), t.id === "max" ? "Max" : "Tier " + t.label]));
    });
    legend.appendChild(el("span", { class: "legend-item" }, [el("span", { class: "swatch bar-cloud" }), "Other cloud"]));

    // Full data table
    var dr = document.getElementById("data-rows");
    models.slice().sort(function (a, b) { return (b.pct == null ? -1 : b.pct) - (a.pct == null ? -1 : a.pct); })
      .forEach(function (m) {
        var t = tierFor(m);
        var params = m.totalB != null ? (m.activeB != null && m.activeB !== m.totalB ? m.totalB + " / " + m.activeB : String(m.totalB)) : "";
        dr.appendChild(el("tr", null, [
          el("td", null, [modelLink(m)]),
          el("td", null, [m.model !== REFERENCE && m.pct > 100 ? el("span", { class: "muted", text: "above Max" }) : tierBadge(t)]),
          el("td", { class: "num", text: m.pct == null ? "not run" : fmtPct(m.pct) }),
          el("td", { class: "num", text: m.ii == null ? "not run" : fmt(m.ii) }),
          el("td", { class: "num" }, [m.cai != null ? fmt(m.cai) : el("span", { class: "muted", text: "not scored" })]),
          el("td", { class: "num", text: m.tb4 == null ? "not run" : fmt(m.tb4) }),
          el("td", { class: "num", text: m.fc2 == null ? "not run" : fmt(m.fc2) }),
          el("td", { class: "num", text: params })
        ]));
      });
  }

  fetch(DATA_URL)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (text) {
      var models = parseCSV(text).map(function (r) {
        return {
          model: r.model,
          open: r.open_weights === "yes",
          cai: num(r.aa_coding_agent_index_v2_1),
          ii: num(r.aa_intelligence_index_v5_0_1),
          tb4: num(r.aa_terminal_bench_4_0),
          fc2: num(r.aa_frontiercode_2_0),
          pct: num(r.pct_of_sonnet_5_5),
          lcs: num(r.long_coding_score),
          totalB: num(r.aa_total_params_b) != null ? num(r.aa_total_params_b) : num(r.llm_sizer_total_params_b),
          activeB: num(r.aa_active_params_b) != null ? num(r.aa_active_params_b) : num(r.llm_sizer_active_params_b),
          sources: r.sources || "",
          read: r.read
        };
      });
      render(models);
    })
    .catch(function (err) {
      document.getElementById("tier-rows").innerHTML =
        '<tr><td colspan="4">Could not load the data file (' + String(err.message || err) +
        '). See <a href="' + DATA_URL + '">the CSV</a>.</td></tr>';
    });
})();
