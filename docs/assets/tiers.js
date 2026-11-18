// Builds the tier page from the comparison data file (data/long-coding-tasks-*.csv,
// copied into docs/data/ by scripts/sync-site-data.sh). No numbers are typed here:
// only the tier band edges, which are the article's definitions.
(function () {
  "use strict";

  var DATA_URL = "data/long-coding-tasks-2026-11-17.csv";
  var REFERENCE = "Claude Sonnet 5.5 (Max)";
  var ARTICLE = "https://github.com/maxgerashenko/LLMeter/blob/main/articles/long-coding-tiers-local-models.md";

  // Tier bands, from articles/long-coding-tiers-local-models.md#how-tiers-are-defined
  var TIERS = [
    { id: "max", anchor: "max-claude-sonnet-55-cloud", label: "Max", name: "cloud reference", min: null, desc: "Claude Sonnet 5.5 itself, cloud only. The 100% reference." },
    { id: "t4", anchor: "tier-4-kimi-k31-pro", label: "4", name: "near-frontier", min: 75, desc: "75% or more. Could stand in for Sonnet 5.5 on most long tasks." },
    { id: "t3", anchor: "tier-3-glm-53", label: "3", name: "strong", min: 55, desc: "55% to 75%. Finishes a little over half of what Sonnet 5.5 finishes." },
    { id: "t2", anchor: "tier-2-qwen38-flash-next", label: "2", name: "capable", min: 40, desc: "40% to 55%. Useful for long tasks with supervision." },
    { id: "t1", anchor: "tier-1-nanbeige43-33b", label: "1", name: "assistant", min: 20, desc: "20% to 40%. Finishes some long tasks; better for shorter, well-scoped ones." },
    { id: "t0", anchor: "tier-0-below-the-bar", label: "0", name: "below the bar", min: 0, desc: "Under 20%. Rarely finishes a long task." }
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
      if (attrs[k] == null) return;
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

  // "2,800B (104B active)", "753B (40B to 54B active)", "33B" for dense, "not published".
  function fmtParams(m) {
    if (m.totalB == null) return "not published";
    var total = m.totalB.toLocaleString("en-US") + "B";
    var act = m.actives.filter(function (a) { return a < 0.95 * m.totalB; });
    if (!act.length) return total;
    var lo = Math.min.apply(null, act), hi = Math.max.apply(null, act);
    // Sources that differ by under 5% count as agreeing.
    var r = hi - lo < 0.05 * hi ? lo + "B" : lo + "B to " + hi + "B";
    return total + " (" + r + " active)";
  }

  // On-disk size: the 4-bit build, with the native (full-precision) release under it.
  // Estimates (no file size published) are marked with "≈" and "est.".
  function fmtGB(v) { return v >= 100 ? Math.round(v).toLocaleString("en-US") : v.toFixed(1); }
  function diskCell(m) {
    if (!m.open) return el("span", { class: "muted", title: "Weights not released, so there is no file to download", text: "n/a" });
    if (m.disk4 == null) return el("span", { class: "muted", text: "not listed" });
    var est4 = /^estimate/.test(m.disk4Build), estN = /^estimate/.test(m.diskNatFmt);
    var main = el("a", { href: (m.disk4Src.match(/https?:\/\/[^\s)]+/) || ["#"])[0], class: "disk-main" + (est4 ? " est" : ""),
      title: (est4 ? "Estimate: " : "") + m.disk4Src + (m.diskNote ? ". " + m.diskNote : "") },
      [(est4 ? "≈" : "") + fmtGB(m.disk4) + " GB"]);
    var b4 = est4 ? "4-bit, est." : m.disk4Build.replace(/ \((GGUF|MLX)\)$/, " $1");
    var bits = [main, el("span", { class: "sub disk-build", text: b4 })];
    if (m.diskNat != null) {
      bits.push(el("span", { class: "sub disk-native" + (estN ? " est" : ""), title: m.diskNatSrc },
        [(estN ? "≈" : "") + fmtGB(m.diskNat) + " GB " + (estN ? "BF16 est." : m.diskNatFmt)]));
    }
    return el("span", { class: "disk" }, bits);
  }

  // One-line version for phones, where the disk column is folded under the model name.
  function diskInline(m) {
    if (!m.open || m.disk4 == null) return null;
    var est4 = /^estimate/.test(m.disk4Build), estN = /^estimate/.test(m.diskNatFmt);
    var t = "Disk: " + (est4 ? "≈" : "") + fmtGB(m.disk4) + " GB 4-bit" + (est4 ? " est." : "");
    if (m.diskNat != null) t += " · " + (estN ? "≈" : "") + fmtGB(m.diskNat) + " GB " + (estN ? "BF16 est." : m.diskNatFmt);
    return t;
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

    // Tier table: the leader of each tier, with the other models in that tier folded under it.
    function groupOf(m) {
      if (m.model === REFERENCE || (!m.open && m.pct > 100)) return TIERS[0];
      if (m.pct == null) return TIERS[TIERS.length - 1]; // not run on the long-task tests; inferred Tier 0 in the article
      return tierFor(m);
    }
    function shareCell(m, t) {
      if (m.pct == null) return el("span", { class: "muted", text: "not run" });
      return el("div", { class: "share" }, [
        el("span", { class: "share-num", text: fmtPct(m.pct) }),
        el("span", { class: "share-track", "aria-hidden": "true" }, [
          el("span", { class: "share-fill " + (m.open || m.model === REFERENCE ? "tier-bg-" + t.id : "bar-cloud"), style: "width:" + Math.min(100, m.pct) + "%" })
        ])
      ]);
    }
    function scoreCell(m) {
      return el("span", { class: "score" }, [
        m.ii != null ? m.ii.toFixed(1) : "n/a",
        m.cai != null
          ? el("span", { class: "sub", text: "(" + m.cai.toFixed(1) + ")" })
          : el("span", { class: "pill pill-muted sub-pill", text: "not scored" })
      ]);
    }
    function cells(m, t, isPick) {
      return [
        el("td", { class: "num" }, [shareCell(m, t)]),
        el("td", { class: "num" }, [scoreCell(m)]),
        el("td", null, [modelLink(m, { hideSetting: isPick }), el("span", { class: "params-inline", text: fmtParams(m) }), el("span", { class: "disk-inline" }, [diskInline(m)])]),
        el("td", { class: "num params" + (m.totalB == null ? " muted" : ""), text: fmtParams(m) }),
        el("td", { class: "num disk-col" }, [diskCell(m)])
      ];
    }

    var body = document.getElementById("tier-rows");
    body.textContent = "";
    picks.forEach(function (p) {
      var m = p.model, t = p.tier;
      var others = models.filter(function (o) { return o !== m && groupOf(o) === t; })
        .sort(function (a, b) { return (b.pct == null ? -1 : b.pct) - (a.pct == null ? -1 : a.pct) || (b.lcs || 0) - (a.lcs || 0); });
      var subRows = [];
      var toggle = null;
      if (others.length) {
        toggle = el("button", { type: "button", class: "more-toggle", "aria-expanded": "false", "aria-controls": "more-" + t.id },
          [others.length + " more"]);
        toggle.addEventListener("click", function () {
          var open = toggle.getAttribute("aria-expanded") !== "true";
          toggle.setAttribute("aria-expanded", String(open));
          subRows.forEach(function (r) { r.hidden = !open; });
        });
      }
      var tierCell = el("th", { scope: "row" }, [
        el("div", { class: "tier-cell" }, [tierBadge(t), el("span", { class: "tier-name", text: t.name })]),
        el("div", { class: "tier-actions" }, [
          el("a", { class: "explain", href: ARTICLE + "#" + t.anchor, title: "Why this tier's pick, with hardware needs" }, ["Explain"]),
          toggle
        ])
      ]);
      body.appendChild(el("tr", { class: "pick-row" }, [tierCell].concat(m ? cells(m, t, true) : [el("td", { colspan: "5", class: "muted", text: "none" })])));
      others.forEach(function (o, i) {
        var label = o.model !== REFERENCE && !o.open && o.pct > 100 ? "above Max" : (!o.open ? "cloud, not a pick" : (o.pct == null ? "inferred" : ""));
        var r = el("tr", { class: "sub-row" + (i === others.length - 1 ? " sub-last" : ""), id: i === 0 ? "more-" + t.id : null, hidden: "" },
          [el("th", { scope: "row", class: "sub-tier" }, [el("span", { class: "muted", text: label })])].concat(cells(o, t, false)));
        subRows.push(r);
        body.appendChild(r);
      });
    });

    // Tier summary chart: one bar per tier leader, in its tier colour, "Tier N - model" then its share
    var tb = document.getElementById("tier-bars");
    tb.textContent = "";
    picks.forEach(function (p) {
      var m = p.model, t = p.tier;
      if (!m || m.pct == null) return;
      tb.appendChild(el("div", { class: "tb-row" }, [
        el("span", { class: "tb-label" }, [
          tierBadge(t),
          el("span", { class: "tb-name", text: t.name }),
          el("a", { class: "tb-model", href: sourceFor(m), text: splitName(m.model).base })
        ]),
        el("span", { class: "tb-track" }, [
          el("span", { class: "tb-bar tier-bg-" + t.id, style: "width:" + Math.max(0.6, Math.min(100, m.pct)) + "%" })
        ]),
        el("span", { class: "tb-value", text: fmtPct(m.pct) }),
        el("a", { class: "explain tb-explain", href: ARTICLE + "#" + t.anchor, title: "Why this tier's pick, with hardware needs" }, ["Explain"])
      ]));
    });

    // Cloud tab: every non-open-weights model in the data file
    var cloudBody = document.getElementById("cloud-rows");
    cloudBody.textContent = "";
    models.filter(function (m) { return !m.open; })
      .sort(function (a, b) { return (b.pct == null ? -1 : b.pct) - (a.pct == null ? -1 : a.pct); })
      .forEach(function (m) {
        cloudBody.appendChild(el("tr", null, [
          el("td", null, [modelLink(m)]),
          el("td", { class: "num", text: fmtPct(m.pct) }),
          el("td", { class: "num" }, [scoreCell(m)]),
          el("td", { class: "num" }, [diskCell(m)])
        ]));
      });

    // Bar charts: one per tab, so the Local and Cloud tabs each show only their own models
    function renderChart(barsId, legendId, list, legendTiers, cloudLegend) {
      var chartModels = list.filter(function (m) { return m.pct != null; })
        .sort(function (a, b) { return b.pct - a.pct; });
      var max = Math.max(110, Math.max.apply(null, chartModels.map(function (m) { return m.pct; })));
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
      document.getElementById(barsId).appendChild(plot);
      var legend = document.getElementById(legendId);
      legendTiers.forEach(function (t) {
        legend.appendChild(el("span", { class: "legend-item" }, [el("span", { class: "swatch tier-bg-" + t.id }), t.id === "max" ? "Max" : "Tier " + t.label]));
      });
      if (cloudLegend) legend.appendChild(el("span", { class: "legend-item" }, [el("span", { class: "swatch bar-cloud" }), "Other cloud"]));
    }
    renderChart("bars-local", "legend-local",
      models.filter(function (m) { return m.open || m.model === REFERENCE; }), TIERS, false);
    renderChart("bars-cloud", "legend-cloud",
      models.filter(function (m) { return !m.open; }),
      TIERS.filter(function (t) { return t.id === "max"; }), true);

  }

  // Local / Cloud tabs
  (function () {
    var tabs = [["tab-local", "tiers", "chart-local"], ["tab-cloud", "panel-cloud", "chart-cloud"]];
    function select(id) {
      tabs.forEach(function (t) {
        var on = t[0] === id;
        var b = document.getElementById(t[0]);
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
        document.getElementById(t[1]).hidden = !on;
        document.getElementById(t[2]).hidden = !on;
      });
    }
    tabs.forEach(function (t, i) {
      var b = document.getElementById(t[0]);
      b.addEventListener("click", function () { select(t[0]); });
      b.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        var next = tabs[(i + 1) % tabs.length][0];
        select(next); document.getElementById(next).focus();
      });
    });
  })();

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
          actives: [num(r.aa_active_params_b), num(r.llm_sizer_active_params_b)].filter(function (v) { return v != null; }),
          disk4: num(r.disk_4bit_gb),
          disk4Build: r.disk_4bit_build || "",
          disk4Src: r.disk_4bit_source || "",
          diskNat: num(r.disk_native_gb),
          diskNatFmt: r.disk_native_format || "",
          diskNatSrc: r.disk_native_source || "",
          diskNote: r.disk_size_note || "",
          sources: r.sources || "",
          read: r.read
        };
      });
      render(models);
    })
    .catch(function (err) {
      document.getElementById("tier-rows").innerHTML =
        '<tr><td colspan="6">Could not load the data file (' + String(err.message || err) +
        '). See <a href="' + DATA_URL + '">the CSV</a>.</td></tr>';
    });
})();
