// Reads data/metr-time-horizons-1-1.csv (copied to docs/data/) and draws the three parts of the page.
(function () {
  "use strict";
  var URL = "data/metr-time-horizons-1-1.csv";
  var CURVE_MODELS = ["Claude Mythos Preview (early)", "Claude Opus 4.6", "Gemini 3.1 Pro", "GPT-5.4", "Claude Opus 4.5", "Claude 4 Opus"];
  // Theme tokens from style.css, so the curves follow light and dark mode.
  var COLORS = ["var(--t4)", "var(--t3)", "var(--t2)", "var(--t1)", "var(--amber)", "var(--t0)"];
  var NS = "http://www.w3.org/2000/svg";

  function parse(text) {
    var lines = text.trim().split(/\r?\n/), head = lines.shift().split(",");
    return lines.map(function (l) {
      // the source column contains commas only inside parentheses-free text; split first 6 fields
      var p = l.split(","), o = {};
      head.forEach(function (h, i) { o[h] = p[i]; });
      o.p50 = +o.p50_minutes; o.p80 = +o.p80_minutes;
      return o;
    });
  }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { k === "text" ? e.textContent = attrs[k] : e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  function svg(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { k === "text" ? e.textContent = attrs[k] : e.setAttribute(k, attrs[k]); });
    return e;
  }
  function fmtMin(m) {
    if (m < 1) return Math.round(m * 60) + " s";
    if (m < 90) return (m < 10 ? m.toFixed(1) : Math.round(m)) + " min";
    var h = m / 60;
    return (h < 10 ? h.toFixed(1) : Math.round(h)) + " h";
  }
  // logistic in log task length through (p50, 50%) and (p80, 80%)
  function beta(m) { return Math.log(4) / Math.log(m.p50 / m.p80); }
  function successAt(m, t) { return 1 / (1 + Math.pow(t / m.p50, beta(m))); }
  function lengthAt(m, p) { return m.p50 * Math.pow((1 - p) / p, 1 / beta(m)); }

  function render(all) {
    var recent = all.filter(function (m) { return m.release_date >= "2025-05-01"; })
      .sort(function (a, b) { return b.p50 - a.p50; });
    var ctx = document.getElementById("ctx");

    function drawBars() {
      var k = +ctx.value;
      document.getElementById("ctx-val").textContent = k + "×";
      document.getElementById("ctx-note").textContent = k === 1
        ? "At 1× the chart shows METR's own numbers (expert baseliners with little codebase context). The speed-up is an assumption: no public source gives it."
        : "Assumption: this developer needs 1/" + k + " of the METR human time for the same task, so each horizon below is METR's value divided by " + k + ".";
      var max = Math.max.apply(null, recent.map(function (m) { return m.p50 / k / 60; })) * 1.05;
      var box = document.getElementById("hbars");
      box.textContent = "";
      var lines = el("div", { "class": "hlines", "aria-hidden": "true" });
      [[480, "8 h day"], [2400, "40 h week"]].forEach(function (l) {
        if (l[0] < max * 60) lines.appendChild(el("span", { "class": "hline", style: "left:" + (l[0] / 60 / max * 100) + "%" }, [el("span", { text: l[1] })]));
      });
      box.appendChild(lines);
      recent.forEach(function (m) {
        var h = m.p50 / k / 60;
        box.appendChild(el("div", { "class": "hrow" }, [
          el("span", { "class": "hlabel", text: m.model }),
          el("span", { "class": "htrack" }, [
            el("span", { "class": "hbar dev-" + m.developer, style: "width:" + Math.max(0.5, h / max * 100) + "%" }),
            el("span", { "class": "hval", style: "left:" + (h / max * 100) + "%", text: fmtMin(m.p50 / k) })
          ])
        ]));
      });
    }
    ctx.addEventListener("input", drawBars);
    drawBars();

    var t = document.getElementById("hr-table");
    t.appendChild(el("thead", {}, [el("tr", {}, ["Model", "Released", "50% horizon", "80% horizon"].map(function (h, i) { return el("th", { scope: "col", "class": i > 1 ? "num" : "", text: h }); }))]));
    var tb = el("tbody");
    recent.forEach(function (m) {
      tb.appendChild(el("tr", {}, [el("td", { text: m.model }), el("td", { text: m.release_date }),
        el("td", { "class": "num", text: fmtMin(m.p50) }), el("td", { "class": "num", text: fmtMin(m.p80) })]));
    });
    t.appendChild(tb);

    // Facts from sources, numbers taken from the data
    var by = {}; all.forEach(function (m) { by[m.model] = m; });
    var top = by["Claude Mythos Preview (early)"], o46 = by["Claude Opus 4.6"], o4 = by["Claude 4 Opus"], g5 = by["GPT-5"];
    var ratios = recent.map(function (m) { return m.p50 / m.p80; });
    var rmin = Math.min.apply(null, ratios), rmax = Math.max.apply(null, ratios);
    var facts = document.getElementById("facts");
    [
      "METR's top entry is " + top.model + " (" + top.release_date + "): 50% horizon of " + fmtMin(top.p50) + " (about " + (top.p50 / 60 / 8).toFixed(1) + " working days of 8 hours), 80% horizon " + fmtMin(top.p80) + ". Its confidence range is wide (about 8 h to 55 h at 50%).",
      "The best model in this list that is not marked preview, " + o46.model + ", reaches " + fmtMin(o46.p50) + " at 50% and " + fmtMin(o46.p80) + " at 80%.",
      "Between " + o4.release_date + " and " + o46.release_date + " the horizon rose from " + fmtMin(o4.p50) + " (" + o4.model + ", " + o4.release_date + ") to " + fmtMin(o46.p50) + " (" + o46.model + ", " + o46.release_date + ").",
      "Reliability costs length: at 80% success a model's horizon is " + rmin.toFixed(1) + " to " + rmax.toFixed(1) + " times shorter than at 50% across the models listed (" + o46.model + ": " + (o46.p50 / o46.p80).toFixed(1) + " times; " + g5.model + ": " + (g5.p50 / g5.p80).toFixed(1) + " times).",
      "METR reports that the 50% horizon doubled about every 129 days from 2023 on (CI 104 to 158 days) and about every 188 days over all time, excluding points above 16 hours (METR data file, doubling_time_in_days). METR says its page is no longer actively updated.",
      "METR's caveat: its tasks are self-contained and well specified, and its human baseliners had about 5 years of relevant experience with little context. Its horizon is not the work a high-context professional does day to day."
    ].forEach(function (s) { facts.appendChild(el("li", { text: s })); });

    // Curves
    var models = CURVE_MODELS.map(function (n) { return by[n]; }).filter(Boolean);
    var W = 760, H = 380, L = 46, R = 14, T = 12, B = 34;
    var xmin = 1, xmax = 10000; // minutes
    function X(t) { return L + (Math.log(t) - Math.log(xmin)) / (Math.log(xmax) - Math.log(xmin)) * (W - L - R); }
    function Y(p) { return T + (1 - p) / 0.5 * (H - T - B); } // p from 0.5..1
    var s = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Success rate from 50% to 100% against task length for several models" });
    [0.5, 0.6, 0.7, 0.8, 0.9, 1.0].forEach(function (p) {
      s.appendChild(svg("line", { x1: L, x2: W - R, y1: Y(p), y2: Y(p), "class": "grid" }));
      s.appendChild(svg("text", { x: L - 6, y: Y(p) + 4, "text-anchor": "end", text: Math.round(p * 100) + "%" }));
    });
    [[1, "1 min"], [10, "10 min"], [60, "1 h"], [480, "8 h"], [2400, "40 h"], [10000, "167 h"]].forEach(function (x) {
      s.appendChild(svg("line", { x1: X(x[0]), x2: X(x[0]), y1: T, y2: H - B, "class": "grid" }));
      s.appendChild(svg("text", { x: X(x[0]), y: H - B + 16, "text-anchor": "middle", text: x[1] }));
    });
    s.appendChild(svg("text", { x: (L + W - R) / 2, y: H - 4, "text-anchor": "middle", text: "Task length (expert human time, log scale)" }));
    var legend = document.getElementById("curve-legend");
    models.forEach(function (m, i) {
      var d = "";
      for (var j = 0; j <= 120; j++) {
        var tt = Math.exp(Math.log(xmin) + j / 120 * (Math.log(m.p50) - Math.log(xmin)));
        d += (j ? "L" : "M") + X(tt).toFixed(1) + " " + Y(successAt(m, tt)).toFixed(1);
      }
      s.appendChild(svg("path", { d: d, style: "stroke:" + COLORS[i] }));
      s.appendChild(svg("circle", { cx: X(m.p50), cy: Y(0.5), r: 3.5, style: "fill:" + COLORS[i] }));
      legend.appendChild(el("span", { "class": "legend-item" }, [el("span", { "class": "swatch", style: "background:" + COLORS[i] }), document.createTextNode(m.model)]));
    });
    document.getElementById("curves").appendChild(s);

    var rt = document.getElementById("rel-table");
    rt.appendChild(el("thead", {}, [el("tr", {}, ["Model", "50% (METR)", "80% (METR)", "90% (derived)", "95% (derived)"].map(function (h, i) { return el("th", { scope: "col", "class": i ? "num" : "", text: h }); }))]));
    var rb = el("tbody");
    models.forEach(function (m) {
      rb.appendChild(el("tr", {}, [el("td", { text: m.model }), el("td", { "class": "num", text: fmtMin(m.p50) }), el("td", { "class": "num", text: fmtMin(m.p80) }),
        el("td", { "class": "num", text: fmtMin(lengthAt(m, 0.9)) }), el("td", { "class": "num", text: fmtMin(lengthAt(m, 0.95)) })]));
    });
    rt.appendChild(rb);
  }

  fetch(URL).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (t) { render(parse(t)); })
    .catch(function (e) { document.getElementById("hbars").textContent = "Could not load the data file (" + e.message + ")."; });
})();
