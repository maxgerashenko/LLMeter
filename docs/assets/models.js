// Single source of truth for models and their tiers on the site.
// Reads data/models.csv (built by scripts/build_models.py) and answers "what tier is this model?"
// for every page. Pages must not compute or type a tier of their own; call LLMeterModels.tierOf(name).
(function () {
  "use strict";
  var URL_ = "data/models.csv";
  // Tier bands: share of Claude Sonnet 5.5's long-coding score (articles/long-coding-tiers-local-models.md).
  // The same edges are used by scripts/build_models.py, which writes the tier into the CSV.
  var BANDS = [
    { id: "max", label: "Max", min: null }, { id: "t4", label: "Tier 4", min: 75 }, { id: "t3", label: "Tier 3", min: 55 },
    { id: "t2", label: "Tier 2", min: 40 }, { id: "t1", label: "Tier 1", min: 20 }, { id: "t0", label: "Tier 0", min: 0 }
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

  // Same family key as scripts/build_models.py: drop "+ draft ..." and a trailing "(setting)", keep letters and digits.
  function family(n) {
    return String(n || "").replace(/\s*\+\s*draft\s.*$/i, "").replace(/\s*\([^)]*\)\s*$/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  function band(id) { return BANDS.filter(function (b) { return b.id === id; })[0] || null; }

  var byName = {}, byFamily = {}, list = [], promise = null;

  function build(rows) {
    list = rows.map(function (r) {
      var pct = r.pct_of_sonnet_5_5 === "" ? null : +r.pct_of_sonnet_5_5;
      return { name: r.name, family: r.family, developer: r.developer, open: r.open_weights === "yes", pct: pct,
        tierId: r.tier_id, band: band(r.tier_id), status: r.tier_status, estimated: r.tier_status === "estimated",
        suiteScore: r.best_suite_score === "" ? null : +r.best_suite_score, anchorBelow: r.anchor_below, anchorAbove: r.anchor_above,
        testIds: r.local_test_ids ? r.local_test_ids.split(" ") : [] };
    });
    byName = {}; byFamily = {};
    list.forEach(function (m) {
      byName[m.name] = m;
      var cur = byFamily[m.family];
      // a name without a setting resolves to the family's best row
      if (!cur || (m.pct != null && (cur.pct == null || m.pct > cur.pct))) byFamily[m.family] = m;
    });
    return api;
  }

  var api = {
    BANDS: BANDS,
    family: family,
    // Resolves in two steps: the exact listed name ("GLM-5.3 (Max)"), then the model family ("Qwen3.8 27B").
    get: function (name) { return byName[name] || byFamily[family(name)] || null; },
    // The tier of a model: { id, label, pct, estimated, status } or null when it has none (cloud-only, not run yet, unknown).
    tierOf: function (name) {
      var m = api.get(name);
      if (!m || !m.band) return null;
      return { id: m.band.id, label: m.band.label, pct: m.pct, estimated: m.estimated, status: m.status, model: m };
    },
    all: function () { return list.slice(); },
    load: function () {
      if (!promise) promise = fetch(URL_, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(URL_ + " " + r.status); return r.text(); })
        .then(function (t) { return build(parseCSV(t)); });
      return promise;
    }
  };
  window.LLMeterModels = api;
})();
