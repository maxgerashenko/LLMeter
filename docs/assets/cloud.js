// Cloud > All: every model ranked by the Artificial Analysis Intelligence Index.
// Reads the same data file as the tier page; no numbers are typed here.
(function () {
  "use strict";
  var DATA_URL = "data/long-coding-tasks-2026-11-17.csv";
  var REFERENCE = "Claude Sonnet 5.5 (Max)";
  // Same tier bands (share of Sonnet 5.5's long-coding score) as assets/tiers.js
  var TIERS = [
    { id: "max", name: "Max" }, { id: "t4", name: "Tier 4", min: 75 }, { id: "t3", name: "Tier 3", min: 55 },
    { id: "t2", name: "Tier 2", min: 40 }, { id: "t1", name: "Tier 1", min: 20 }, { id: "t0", name: "Tier 0", min: 0 }
  ];

  function parseCSV(text) {
    var rows = [], row = [], f = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
      else if (c !== "\r") f += c;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    var head = rows.shift();
    return rows.filter(function (r) { return r.length > 1; }).map(function (r) {
      var o = {}; head.forEach(function (h, j) { o[h] = (r[j] || "").trim(); }); return o;
    });
  }
  function num(v) { return v === "" || v == null || isNaN(+v) ? null : +v; }
  function splitName(name) {
    var m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(name);
    return m ? { base: m[1], setting: m[2] } : { base: name, setting: "" };
  }
  function tierFor(m) {
    if (m.model === REFERENCE) return TIERS[0];
    if (!m.open || m.pct == null) return null;
    for (var i = 1; i < TIERS.length; i++) if (m.pct >= TIERS[i].min) return TIERS[i];
    return null;
  }
  function sourceFor(m) {
    var urls = m.sources.match(/https?:\/\/[^\s;]+/g) || [];
    var page = urls.filter(function (u) { return /artificialanalysis\.ai\/models\/[^/]+$/.test(u); })[0];
    return page || "https://artificialanalysis.ai/models";
  }
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null) return;
      if (k === "text") e.textContent = attrs[k]; else if (k === "class") e.className = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function tag(m, t) {
    if (t && t.id === "max") return el("span", { class: "tier-badge bar-tag tier-max" }, ["Max"]);
    if (t) return el("span", { class: "tier-badge bar-tag tier-" + t.id }, [t.name.replace("Tier ", "Tier ")]);
    return el("span", { class: "pill pill-cloud bar-tag" }, ["Cloud"]);
  }

  fetch(DATA_URL).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (text) {
    var models = parseCSV(text).map(function (r) {
      return { model: r.model, open: r.open_weights === "yes", ii: num(r.aa_intelligence_index_v5_0_1),
        pct: num(r.pct_of_sonnet_5_5), sources: r.sources || "", read: r.read };
    }).filter(function (m) { return m.ii != null; }).sort(function (a, b) { return b.ii - a.ii; });

    var max = 100;
    var plot = el("div", { class: "plot" });
    var edges = el("div", { class: "edges", "aria-hidden": "true" });
    plot.appendChild(edges);
    [20, 40, 60, 80].forEach(function (e) {
      edges.appendChild(el("span", { class: "edge", style: "left:" + (e / max * 100) + "%" }, [el("span", { class: "edge-label", text: String(e) })]));
    });
    models.forEach(function (m) {
      var t = tierFor(m), n = splitName(m.model);
      var cls = t ? "tier-bg-" + t.id : "bar-cloud";
      plot.appendChild(el("div", { class: "bar-row" + (m.model === REFERENCE ? " is-ref" : "") }, [
        el("span", { class: "bar-label" }, [tag(m, t), el("a", { href: sourceFor(m), text: n.base }), n.setting ? el("span", { class: "setting", text: n.setting }) : null]),
        el("span", { class: "bar-track" }, [
          el("span", { class: "bar " + cls, style: "width:" + Math.max(0.6, m.ii / max * 100) + "%" }),
          el("span", { class: "bar-value", style: "left:" + (m.ii / max * 100) + "%", text: m.ii.toFixed(1) })
        ])
      ]));
    });
    var host = document.getElementById("bars-ii");
    host.textContent = ""; host.appendChild(plot);
    var legend = document.getElementById("legend-ii");
    TIERS.forEach(function (t) { legend.appendChild(el("span", { class: "legend-item" }, [el("span", { class: "swatch tier-bg-" + t.id }), t.name])); });
    legend.appendChild(el("span", { class: "legend-item" }, [el("span", { class: "swatch bar-cloud" }), "Cloud"]));
    if (models[0] && models[0].read) document.getElementById("read-date").textContent = models[0].read;
  }).catch(function (err) {
    document.getElementById("bars-ii").innerHTML = '<p class="muted">Could not load the data file (' + String(err.message || err) + '). See <a href="' + DATA_URL + '">the CSV</a>.</p>';
  });
})();
