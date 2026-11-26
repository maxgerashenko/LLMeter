// Builds the DGX Spark page from data/rack-speed-*.csv, data/racks-*.csv and data/video-4-sparks-*.csv
// (copied into docs/data/ by scripts/sync-site-data.sh). Same look and approach as the M5 Ultra rack page (rack.js).
(function () {
  "use strict";

  var SPEED_URL = "data/rack-speed-2026-11-18.csv";
  var RACKS_URL = "data/racks-2026-11-18.csv";
  var VIDEO_URL = "data/video-4-sparks-2026-11-26.csv";
  var ONE = "dgx-spark";
  // Setups in order of size: rack id and number of Sparks
  var SETUPS = [["dgx-spark", 1], ["dgx-spark-2", 2], ["dgx-spark-4", 4], ["dgx-spark-8", 8], ["dgx-spark-16", 16]];
  var USABLE_GB = 120, CONTEXT_FACTOR = 1.1, TRY_SIZES = [2, 4, 8, 16];
  var TIERS = [
    { id: "t4", label: "Tier 4" }, { id: "t3", label: "Tier 3" },
    { id: "t2", label: "Tier 2" }, { id: "t1", label: "Tier 1" }, { id: "t0", label: "Tier 0" }
  ];
  // Models from the 8-Spark video, grouped for the Clusters tab: [model label, source model text, nodes]
  var VIDEO_GROUPS = [
    { label: "Qwen 34B (BF16)", match: /^Qwen 34B/, note: "Dense, small: little to gain beyond 2 Sparks" },
    { label: "Qwen3 VL 32B Instruct (BF16, 66 GB)", match: /^Qwen3 VL 32B/, note: "Dense: scales well" },
    { label: "Qwen 3.5 397B-A17B (full precision, 800 GB)", match: /^Qwen 3\.5 397B/, note: "Needs 8 Sparks" },
    { label: "Kimi K2 (about 600 GB)", match: /^Kimi K2/, note: "Needs 8 Sparks" }
  ];

  function parseCSV(text) {
    var rows = [], row = [], field = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') q = false;
        else field += c;
      } else if (c === '"') q = true;
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
  function baseName(m) { return m.replace(/\s*\([^)]*\)\s*$/, ""); }
  function firstUrl(s) { return (s.match(/https?:\/\/[^\s;]+/) || ["#"])[0]; }
  function badge(tierId) {
    var t = TIERS.filter(function (x) { return x.id === tierId; })[0];
    return el("span", { class: "tier-badge tier-" + tierId }, [t ? t.label : tierId]);
  }
  function fmtGB(v) { return v >= 100 ? Math.round(v).toLocaleString("en-US") + " GB" : v.toFixed(1) + " GB"; }
  function fmtTok(r) { return (r.status === "estimate" ? "≈" : "") + (r.tok >= 100 ? Math.round(r.tok) : r.tok.toFixed(1)); }
  function title(r) {
    return [r.status === "estimate" ? "Estimate" : r.status === "measured" ? "Measured" : r.status === "untested" ? "No published run" : "Doesn't fit",
      r.quant, r.engine, r.setup, r.note].filter(Boolean).join(" · ");
  }
  function money(v) { return v >= 10000 ? "$" + Math.round(v / 1000) + "k" : "$" + (v / 1000).toFixed(1) + "k"; }

  function barRow(label, r, scale) {
    var track, value;
    if (r.status === "no_fit" || r.status === "untested") {
      track = el("span", { class: "rk-track rk-nofit", title: title(r) }, [el("span", { text: r.status === "untested" ? "no published run at this size" : "doesn't fit · needs " + fmtGB(r.size) })]);
      value = el("span", { class: "rk-value muted", text: "–" });
    } else {
      var w = Math.max(0.8, Math.min(100, r.tok / scale * 100));
      track = el("span", { class: "rk-track", title: title(r) }, [
        el("span", { class: "rk-bar tier-bg-" + (r.tier || "t2") + (r.status === "estimate" ? " rk-est" : ""), style: "width:" + w + "%" })
      ]);
      value = el("a", { class: "rk-value" + (r.status === "estimate" ? " est" : ""), href: r.source, title: title(r) },
        [fmtTok(r), el("span", { class: "rk-unit", text: " tok/s" }), r.status === "estimate" ? el("span", { class: "rk-est-tag", text: " est." }) : null]);
    }
    return el("div", { class: "rk-row" }, [label, track, value]);
  }

  function render(speeds, racks, video) {
    var rackById = {};
    racks.forEach(function (k) { rackById[k.id] = k; });
    var one = rackById[ONE];
    document.getElementById("spark-sub").textContent = "Each tier's best local model at 4-bit on one NVIDIA DGX Spark (" + one.mem + " GB, " + one.bw +
      " GB/s), one request at a time. The table gives the smallest Spark setup that fits each model and its price.";

    function onRack(tierId, rackId) {
      return speeds.filter(function (r) { return r.tier === tierId && r.rack === rackId; })[0];
    }
    var scale = Math.max.apply(null, speeds.filter(function (r) { return SETUPS.some(function (s) { return s[0] === r.rack; }) && r.tok != null; }).map(function (r) { return r.tok; }));

    var bars = document.getElementById("spark-bars"), body = document.getElementById("spark-rows");
    bars.textContent = ""; body.textContent = "";
    TIERS.forEach(function (t) {
      var r0 = onRack(t.id, ONE);
      if (!r0) return;
      var name = baseName(r0.model);
      // Smallest setup with a number (measured or estimated); if none, show the single Spark's "doesn't fit"
      var best = null, bestN = 1;
      SETUPS.forEach(function (s) {
        var x = onRack(t.id, s[0]);
        if (!best && x && x.tok != null) { best = x; bestN = s[1]; }
      });
      var r = best || r0;
      bars.appendChild(barRow(el("span", { class: "rk-label" }, [badge(t.id), el("a", { class: "tb-model", href: r.source, text: name }), el("span", { class: "rk-cfg", text: bestN + "× Spark" })]), r, scale));
      var note = !best ? "no published run" : best.status === "estimate" ? "estimate, no published run" : "";
      body.appendChild(el("tr", null, [
        el("th", { scope: "row" }, [badge(t.id)]),
        el("td", null, [el("span", { class: "model" }, [el("span", { class: "model-link", text: name })]), el("span", { class: "rk-inline", text: fmtGB(r0.size) + " at 4-bit" })]),
        el("td", { class: "num rk-size-col" }, [fmtGB(r0.size)]),
        el("td", { class: "rk-cfg-col" }, [bestN + "× DGX Spark", el("span", { class: "rk-cfg-n", text: (bestN * one.mem).toLocaleString("en-US") + " GB in total" + (note ? " · " + note : "") })]),
        el("td", { class: "num rk-cfg-col" }, [el("a", { class: "rk-price", href: one.priceSrc, title: bestN + " × $" + one.price.toLocaleString("en-US") + " (NVIDIA list price); switch, network cards and cables extra" }, [money(bestN * one.price)])])
      ]));
    });

    // Clusters: tier models on 1, 2, 4 Sparks, then the models measured on 1 to 8 Sparks in the video
    var groups = document.getElementById("spark-groups");
    groups.textContent = "";
    var vscale = Math.max.apply(null, video.filter(function (v) { return v.cat === "generation" && v.metric === "tok_s"; }).map(function (v) { return v.value; }).concat([scale]));
    TIERS.forEach(function (t) {
      var rows = SETUPS.map(function (s) { var x = onRack(t.id, s[0]); return x && x.tok != null ? { r: x, n: s[1] } : null; }).filter(Boolean);
      if (rows.length < 2) return;
      var first = rows[0].r;
      rows.sort(function (a, b) { return b.r.tok - a.r.tok; }); // fastest first, as on the Rack All view
      var g = el("div", { class: "rk-group" }, [el("div", { class: "rk-group-head" }, [badge(t.id), el("span", { class: "rk-group-model", text: baseName(first.model) }), el("span", { class: "muted rk-group-size", text: fmtGB(first.size) + " at 4-bit" })])]);
      rows.forEach(function (x) {
        g.appendChild(barRow(el("span", { class: "rk-label rk-rack" }, [x.n + "× Spark"]), x.r, vscale));
      });
      groups.appendChild(g);
    });
    VIDEO_GROUPS.forEach(function (grp) {
      var rows = video.filter(function (v) { return v.cat === "generation" && v.metric === "tok_s" && grp.match.test(v.model) && v.value != null; })
        .sort(function (a, b) { return b.value - a.value; }); // fastest first, as on the Rack All view
      if (!rows.length) return;
      var g = el("div", { class: "rk-group" }, [el("div", { class: "rk-group-head" }, [el("span", { class: "rk-group-model", text: grp.label }), el("span", { class: "muted rk-group-size", text: grp.note })])]);
      rows.forEach(function (v) {
        g.appendChild(barRow(el("span", { class: "rk-label rk-rack" }, [v.nodes + "× Spark"]),
          { status: "measured", tok: v.value, tier: "t2", source: v.source, engine: v.engine, setup: v.cond, note: v.note }, vscale));
      });
      groups.appendChild(g);
    });
    groups.appendChild(el("div", { class: "legend" }, [
      el("span", { class: "legend-item" }, [el("span", { class: "swatch tier-bg-t2" }), "Measured"]),
      el("span", { class: "legend-item" }, [el("span", { class: "swatch tier-bg-t2 rk-est" }), "Estimated"]),
      el("span", { class: "legend-item" }, [el("span", { class: "swatch rk-swatch-nofit" }), "Doesn't fit, or no published run"])
    ]));

    var spec = document.getElementById("spark-spec-rows");
    spec.textContent = "";
    SETUPS.forEach(function (s) {
      var k = rackById[s[0]];
      if (!k) return;
      spec.appendChild(el("tr", null, [
        el("th", { scope: "row" }, [el("a", { href: firstUrl(k.src), text: k.name })]),
        el("td", { text: k.chip }),
        el("td", { class: "num", text: k.bw + " GB/s per Spark" }),
        el("td", { class: "num", text: k.mem + " GB" }),
        el("td", { class: "num" }, [el("a", { href: k.priceSrc, title: k.priceNote, class: "rk-price-cell" }, ["$" + k.price.toLocaleString("en-US")])])
      ]));
    });
  }

  Promise.all([SPEED_URL, RACKS_URL, VIDEO_URL].map(function (u) {
    return fetch(u).then(function (r) { if (!r.ok) throw new Error(u + ": " + r.status); return r.text(); });
  })).then(function (texts) {
    var speeds = parseCSV(texts[0]).map(function (r) {
      return { tier: r.tier, model: r.model, rack: r.rack_id, status: r.status, tok: num(r.tok_s), size: num(r.model_size_gb),
        quant: r.quant, engine: r.engine, setup: r.setup, source: firstUrl(r.source), note: r.note };
    });
    var racks = parseCSV(texts[1]).map(function (r) {
      return { id: r.rack_id, name: r.name, chip: r.chip, bw: num(r.bandwidth_gbs), mem: num(r.max_memory_gb), src: r.spec_source,
        price: num(r.price_usd), priceNote: r.price_note, priceSrc: firstUrl(r.price_source) };
    });
    var video = parseCSV(texts[2]).map(function (r) {
      return { cat: r.category, metric: r.metric, model: r.model, nodes: num(r.nodes), value: num(r.value), engine: r.engine, cond: r.condition, note: r.note, source: firstUrl(r.source) };
    });
    render(speeds, racks, video);
  }).catch(function (err) {
    document.getElementById("spark-rows").innerHTML = '<tr><td colspan="5">Could not load the data files (' + String(err.message || err) + ').</td></tr>';
  });
})();
