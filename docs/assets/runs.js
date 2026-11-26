// Runs page. Reads the planned model list (data/local-test-models.csv) and the per-task
// results of the local coding suite (data/local-runtime-results.csv), groups the result rows
// into runs and draws a horizontal bar chart plus a detail table. No numbers live in the HTML.
(function () {
  "use strict";
  var MODELS_URL = "data/local-test-models.csv";
  var RESULTS_URL = "data/local-runtime-results.csv";
  var TIERS_URL = "data/long-coding-tasks-2026-11-17.csv"; // same file the Local page builds its tiers from
  // Tier bands as on the Local page (articles/long-coding-tiers-local-models.md): share of Sonnet 5.5 on long coding tasks.
  var TIER_BANDS = [
    { id: "t4", label: "Tier 4", min: 75 }, { id: "t3", label: "Tier 3", min: 55 }, { id: "t2", label: "Tier 2", min: 40 },
    { id: "t1", label: "Tier 1", min: 20 }, { id: "t0", label: "Tier 0", min: 0 }
  ];
  var tierByModel = {};
  // Suite local-coding-v1 weights (frozen; see tasks/local-coding-v1/manifest.json).
  var WEIGHTS = { q01: 1, q02: 1, q03: 2, q04: 2, q05: 2, q06: 3, q07: 3, q08: 3, q09: 3, q10: 3 };
  var LEVEL = { q01: "easy", q02: "easy", q03: "medium", q04: "medium", q05: "medium",
                q06: "hard", q07: "hard", q08: "hard", q09: "hard", q10: "hard" };
  // Task titles of the same suite (tasks/local-coding-v1/README.md).
  var TASKS = [
    ["q01", "Fix a function that merges date intervals"],
    ["q02", "Add a CSV-row constructor in the existing style"],
    ["q03", "Find and fix three seeded bugs"],
    ["q04", "Move and rename an API across four files"],
    ["q05", "Fix a root cause two calls from the symptom"],
    ["q06", "Expression evaluator with exact error positions"],
    ["q07", "Priority scheduler with a speed bound"],
    ["q08", "Fix an asyncio limiter"],
    ["q09", "Version-constraint solver with backtracking"],
    ["q10", "Unified-diff applier with offsets and fuzz"]
  ];
  var DEFAULT_HW = "MacBook Pro M5 Pro, 64 GB";
  var metric = "speed";
  var thinkFilter = "all"; // all | on | off: which runs the charts show (default: all)
  var batchFilter = "all"; // on: more than 1 request at a time; off: 1 request
  var draftFilter = "all"; // on: run with a draft model (speculative decoding)
  var modelFilter = null; // base model name: show only its runs (set by a click on a run row)
  // Model name without the draft part, so runs with and without a draft count as one model.
  function baseModel(name) { return String(name || "").replace(/\s*\+\s*draft\s.*$/i, ""); }
  var bothFilter = false; // true: only models run on both LM Studio and TensorFold
  var view = "speed"; // which chart is open; the priority one first
  var state = { runs: [], planned: [] };

  // CSV with quoted fields.
  function parseCSV(text) {
    var rows = [], row = [], f = "", q = false, i, c;
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(f); f = ""; if (row.some(function (x) { return x !== ""; })) rows.push(row); row = [];
      } else f += c;
    }
    row.push(f); if (row.some(function (x) { return x !== ""; })) rows.push(row);
    var head = rows.shift() || [];
    return rows.map(function (r) { var o = {}; head.forEach(function (h, j) { o[h] = (r[j] || "").trim(); }); return o; });
  }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") e.textContent = attrs[k]; else if (k === "cls") e.className = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function fmt(n, d) { return n == null ? "–" : n.toFixed(d == null ? 0 : d); }
  function fmtTime(s) {
    if (s == null) return "–";
    if (s < 90) return Math.round(s) + " s";
    var m = s / 60; return (m < 10 ? m.toFixed(1) : Math.round(m)) + " min";
  }
  // A run with a draft model is the same model for tiers: the "+ draft ..." part of the name is dropped.
  function normName(n) { return baseModel(n).replace(/\s*\([^)]*\)\s*$/, "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
  // Tier of a model by name, from its best row in the long-coding data; null when the model is not in it.
  // A model without one gets an estimated equivalent tier from its local suite score (see estimateTiers).
  var estByModel = {};
  function bandOf(pct) {
    for (var i = 0; i < TIER_BANDS.length; i++) if (pct >= TIER_BANDS[i].min) return TIER_BANDS[i];
    return null;
  }
  function tierOf(name) {
    var k = normName(name), pct = tierByModel[k];
    if (pct != null) return { band: bandOf(pct), pct: pct, est: false };
    if (estByModel[k] != null) return { band: bandOf(estByModel[k]), pct: estByModel[k], est: true };
    return null;
  }
  // Estimated equivalent tier: take the best suite score of every model that has an official tier (the anchors),
  // put the untiered model on that score line and read its "% of Sonnet 5.5" by straight-line interpolation
  // between the two nearest anchors (the nearest one outside their range). Then apply the same tier bands.
  function estimateTiers() {
    var best = {};
    state.runs.forEach(function (r) {
      var k = normName(r.model);
      if (r.score != null && (best[k] == null || r.score > best[k].score)) best[k] = { score: r.score, name: baseModel(r.model) };
    });
    var anchors = [];
    Object.keys(best).forEach(function (k) { if (tierByModel[k] != null) anchors.push({ score: best[k].score, pct: tierByModel[k], name: best[k].name }); });
    anchors.sort(function (a, b) { return a.score - b.score; });
    estByModel = {}; state.anchors = anchors; state.estimated = [];
    if (!anchors.length) return;
    Object.keys(best).forEach(function (k) {
      if (tierByModel[k] != null) return;
      var x = best[k].score, pct, lo = null, hi = null;
      anchors.forEach(function (a) { if (a.score <= x) lo = a; if (a.score >= x && !hi) hi = a; });
      if (lo && hi && hi.score > lo.score) pct = lo.pct + (hi.pct - lo.pct) * (x - lo.score) / (hi.score - lo.score);
      else pct = (lo || hi).pct;
      estByModel[k] = pct; state.estimated.push({ name: best[k].name, score: x, pct: pct });
    });
  }
  function tierBadge(name) {
    var t = tierOf(name);
    if (!t) return el("span", { cls: "tier-badge tier-none", title: "Not in the long-coding data yet and not run locally, so no estimate", text: "No tier" });
    if (!t.est) return el("span", { cls: "tier-badge tier-" + t.band.id, title: t.band.label + ": " + Math.round(t.pct) + "% of Sonnet 5.5 on long coding tasks", text: t.band.label });
    return el("span", { cls: "tier-badge tier-" + t.band.id + " tier-est", title: "Estimated equivalent tier: about " + Math.round(t.pct) + "% of Sonnet 5.5, placed by its local suite score against models that have a tier", text: "~" + t.band.label });
  }
  // Mixture of experts: fewer active parameters than total, or said so in the model list notes.
  function isMoE(m) {
    function n(v) { return num(String(v || "").replace(/[^0-9.]/g, "")); }
    var all = n(m.params_b), act = n(m.active_params_b);
    return (all != null && act != null && act < all) || /mixture of experts/i.test(m.notes || "");
  }
  function thinkingOn(t) { return /^(on|yes|true)$/i.test(t || ""); }

  function buildRuns(results, models) {
    var byId = {}, groups = {}, order = [];
    models.forEach(function (m) { byId[m.id] = m; });
    results.forEach(function (r) {
      if (!r.model_id || !r.task_id) return;
      var key = [r.date, r.model_id, r.runtime, r.thinking, r.parallel].join("|");
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(r);
    });
    return order.map(function (key) {
      var rows = groups[key], f = rows[0], m = byId[f.model_id] || {};
      var w = 0, ws = 0, lv = { easy: [0, 0], medium: [0, 0], hard: [0, 0] }, tok = [], time = 0, hasTime = false, mem = null;
      var bad = 0, seen = {}, byTask = {}, tp = 0, tt = 0;
      rows.forEach(function (r) {
        var id = r.task_id.toLowerCase(), wt = WEIGHTS[id], sc = num(r.score);
        if (!wt || seen[id]) return; seen[id] = 1; byTask[id] = r;
        sc = sc == null ? 0 : (sc > 1 ? sc / 100 : sc);
        w += wt; ws += wt * sc; lv[LEVEL[id]][0] += wt * sc; lv[LEVEL[id]][1] += wt;
        tp += num(r.tests_passed) || 0; tt += num(r.tests_total) || 0;
        var t = num(r.gen_tok_per_s); if (t != null) tok.push(t);
        var s = num(r.wall_seconds); if (s != null) { time += s; hasTime = true; }
        var pm = num(r.peak_mem_gb); if (pm != null) mem = Math.max(mem || 0, pm);
        if (r.end_reason && r.end_reason !== "finished") bad++;
      });
      var tasks = Object.keys(seen).length;
      function lvl(k) { return lv[k][1] ? 100 * lv[k][0] / lv[k][1] : null; }
      return {
        model: m.model || f.model_id, id: f.model_id, quant: [m.format, m.quant].filter(Boolean).join(" "),
        rt: f.runtime, runtime: f.runtime + (f.runtime_version ? " " + f.runtime_version : ""), thinking: f.thinking || "–",
        hardware: f.hardware || DEFAULT_HW, parallel: f.parallel, date: f.date,
        // Missing tasks count as 0, so a partial run cannot score above a full one.
        score: tasks ? 100 * ws / 23 : null, easy: lvl("easy"), medium: lvl("medium"), hard: lvl("hard"), testsPassed: tp, testsTotal: tt,
        tok: tok.length ? tok.reduce(function (a, b) { return a + b; }, 0) / tok.length : null,
        time: hasTime ? time : null, mem: mem, tasks: tasks, bad: bad, think: thinkingOn(f.thinking), moe: isMoE(m),
        batch: num(f.parallel) > 1, draft: /\+\s*draft\s/i.test(m.model || ""),
        status: tasks < 10 ? "partial" : "done", byTask: byTask
      };
    });
  }

  // "1 request", "4 requests": how many requests were in flight during the run.
  function requests(n) { return n ? n + (String(n) === "1" ? " request" : " requests") + " at a time" : ""; }
  // Why a listed model has no run: "not installed", or "cannot run" with the reason in the model list.
  function why(m) { return (m.run_status || "").split(":")[0]; }

  // Labels after the title: draft model, thinking mode, requests in flight ("batching 4").
  function chips(r) {
    var out = [], draft = /\+\s*draft\s+(.+)$/i.exec(r.model || "");
    function chip(text, cls, title) { out.push(el("span", { cls: "run-chip " + cls, title: title, text: text })); }
    if (draft) chip("draft", "chip-draft", "Speculative decoding with draft model " + draft[1]);
    // Only what is switched on gets a label: no label for thinking off or for 1 request at a time.
    if (thinkingOn(r.thinking)) chip("thinking", "chip-think", "Thinking on");
    if (num(r.parallel) > 1) chip("batching " + r.parallel, "chip-batch", requests(r.parallel));
    return out;
  }

  function label(r) {
    return el("div", { cls: "rb-label", title: r.model + " · " + r.quant + " · " + r.runtime + " · thinking " + r.thinking }, [
      tierBadge(r.model), el("span", { cls: "rb-model", text: r.model }),
      el("span", { cls: "setting", text: [r.quant, r.runtime.split(/[;(]/)[0].trim(), r.why || ""].filter(Boolean).join(" · ") })
    ].concat(chips(r)));
  }

  // The chart is split in two, one panel per runtime, so the same model can be compared
  // across runtimes on a shared scale. Panels are always shown, even with no run in them.
  var RUNTIMES = [
    { name: "LM Studio", planned: function (m) { return !!m.lmstudio; } },
    { name: "TensorFold", planned: function (m) { return /^(installed|loads)/.test(m.tensorfold || ""); } }
  ];

  var METRICS = {
    speed: { key: "tok", title: "Decoding", unit: "tok/sec", digits: 1, max: function (runs) { return Math.max.apply(null, runs.map(function (r) { return r.tok || 0; }).concat([1])); } },
    score: { key: "score", title: "Score", unit: "points", digits: 1, max: function () { return 100; } }
  };

  // Two charts, the priority metric first and the other second. Rows are ordered by the
  // priority metric in both, so they line up across the charts. One scale per chart, shared
  // by its runtime panels so bar lengths compare across runtimes.
  // "Both runtimes" filter: only models that have a run in every runtime (LM Studio and TensorFold).
  function onBoth() {
    var seen = {};
    state.runs.forEach(function (r) { (seen[r.id] = seen[r.id] || {})[r.rt] = 1; });
    return function (id) { return RUNTIMES.every(function (rt) { return seen[id] && seen[id][rt.name]; }); };
  }
  function visibleRuns() {
    if (!bothFilter) return state.runs;
    var ok = onBoth();
    return state.runs.filter(function (r) { return ok(r.id); });
  }
  function drawBars() {
    var box = document.getElementById("runs-bars"); box.textContent = "";
    var order = metric === "score" ? ["score", "speed"] : ["speed", "score"];
    var pri = METRICS[order[0]];
    var shown = visibleRuns().filter(function (r) {
      function pass(f, v) { return f === "all" || (f === "on") === v; }
      if (modelFilter && baseModel(r.model) !== modelFilter) return false;
      return r[pri.key] != null && pass(thinkFilter, r.think) && pass(batchFilter, r.batch) && pass(draftFilter, r.draft);
    });
    function rank(rt) {
      return shown.filter(function (r) { return r.rt === rt.name; }).sort(function (a, b) { return b[pri.key] - a[pri.key]; });
    }
    // Tabs for the two charts, priority chart first; one chart is open at a time.
    var bar = el("div", { cls: "tabs rb-views", role: "tablist", "aria-label": "Chart" });
    order.forEach(function (name, idx) {
      var b = el("button", { type: "button", role: "tab", cls: "tab", "aria-selected": String(name === view), text: METRICS[name].title });
      if (name !== view) b.tabIndex = -1;
      b.addEventListener("click", function () { view = name; drawBars(); });
      bar.appendChild(b);
    });
    var vb = document.getElementById("runs-views"); vb.textContent = ""; vb.appendChild(bar);
    // Slot under the summary, always the same height, so the chart does not move when a filter is set.
    var slot = document.getElementById("runs-model-filter"); slot.textContent = "";
    if (modelFilter) {
      var reset = el("button", { type: "button", cls: "model-reset", text: "Show all" });
      reset.addEventListener("click", function () { modelFilter = null; drawBars(); });
      slot.appendChild(el("span", { cls: "muted", text: "Only runs of" }));
      slot.appendChild(el("strong", { text: modelFilter }));
      slot.appendChild(reset);
    } else slot.appendChild(el("span", { cls: "muted", text: "Shows all models" }));
    order.forEach(function (name, idx) {
      if (name !== view) return;
      var m = METRICS[name], max = m.max(shown);
      var chart = el("div", { cls: "rb-chart", role: "group", "aria-label": m.title + (idx ? ", second chart" : ", priority chart") }, [
        el("h3", { cls: "rb-chart-title", text: m.title + (idx ? ", in " + pri.title.toLowerCase() + " order" : "") })
      ]);
      RUNTIMES.forEach(function (rt) {
        var runs = rank(rt);
        var panel = el("div", { cls: "rb-panel", role: "group", "aria-label": rt.name }, [el("h4", { cls: "rb-title", text: rt.name })]);
        var list = el("div", { cls: "rbars" });
        panel.appendChild(list);
        runs.forEach(function (r) {
          var v = r[m.key], pct = v == null ? 0 : Math.max(0, Math.min(100, 100 * v / max));
          var base = baseModel(r.model);
          var row = el("div", { cls: "rb-row rb-click", role: "button", tabindex: "0",
            "aria-label": (modelFilter ? "Show all models" : "Show only runs of " + base) }, [
            label(Object.assign({}, r, { runtime: "" })),
            el("div", { cls: "rb-track" }, [el("span", { cls: "rb-bar" + (r.moe ? " moe" : ""), style: "width:" + pct.toFixed(1) + "%" })]),
            el("div", { cls: "rb-value" }, [fmt(v, m.digits), el("span", { cls: "rb-unit", text: m.unit })])
          ]);
          // A click shows only this model's runs; a click while filtered shows all again.
          function toggle() {
            modelFilter = modelFilter ? null : base; drawBars();
            // The filtered list is short: bring the top of the chart card back into view.
            if (modelFilter) document.getElementById("runs-chart-h").closest("section").scrollIntoView({ block: "start", behavior: "smooth" });
          }
          row.addEventListener("click", toggle);
          row.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
          list.appendChild(row);
        });
        if (!runs.length) list.appendChild(el("p", { cls: "muted", text: "No runs in " + rt.name + " yet." }));
        chart.appendChild(panel);
      });
      box.appendChild(chart);
    });
    // Last section: planned models with no run in any runtime.
    var ranAny = {}; state.runs.forEach(function (r) { ranAny[r.id] = 1; });
    var todo = bothFilter ? [] : state.planned.filter(function (m) { return !ranAny[m.id]; });
    if (todo.length) {
      var tp = el("div", { cls: "rb-panel", role: "group", "aria-label": "Not run yet" }, [el("h3", { cls: "rb-title", text: "Not run yet" })]);
      var tl = el("div", { cls: "rbars" }); tp.appendChild(tl);
      todo.forEach(function (m) {
        tl.appendChild(el("div", { cls: "rb-row is-planned" }, [
          label({ model: m.model, quant: [m.format, m.quant].filter(Boolean).join(" "), runtime: "", thinking: "", why: m.run_status }),
          el("div", { cls: "rb-track" }),
          el("div", { cls: "rb-value", text: "–" })
        ]));
      });
      box.appendChild(tp);
    }
    box.setAttribute("aria-label", "Horizontal bar chart of local run results; the runs are in " + pri.title.toLowerCase() + " order in both charts");
  }

  function td(text, cls) { return el("td", { cls: cls || "", text: text }); }
  function drawTable() {
    var body = document.getElementById("runs-rows"); body.textContent = "";
    var runs = visibleRuns().slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    runs.forEach(function (r) {
      body.appendChild(el("tr", {}, [
        el("td", { cls: "model-cell" }, [el("strong", { text: r.model }), el("span", { cls: "sub", text: r.id + (r.mem != null ? " · peak " + fmt(r.mem, 1) + " GB" : "") })]),
        el("td", {}, [tierBadge(r.model)]),
        td(r.quant), td(r.runtime), td(r.thinking), td(r.hardware),
        td(fmt(r.score, 1), "num score"),
        td(r.testsTotal ? r.testsPassed + " / " + r.testsTotal : "–", "num"),
        td([fmt(r.easy), fmt(r.medium), fmt(r.hard)].join(" / "), "num"),
        td(fmt(r.tok, 1), "num"), td(fmtTime(r.time), "num"), td(r.parallel || "–", "num"), td(r.date || "–"),
        el("td", {}, [el("span", { cls: "status status-" + (r.status === "done" && !r.bad ? "done" : "failed"),
          text: r.status === "done" ? (r.bad ? r.bad + " cut off" : "done") : r.tasks + "/10 tasks" })])
      ]));
    });
    var ran = {}; state.runs.forEach(function (r) { ran[r.id] = 1; });
    state.planned.filter(function (m) { return !bothFilter && !ran[m.id]; }).forEach(function (m) {
      var rt = ["LM Studio"]; if (/^(installed|loads)/.test(m.tensorfold || "")) rt.push("TensorFold");
      body.appendChild(el("tr", { cls: "is-planned" }, [
        el("td", { cls: "model-cell" }, [el("strong", { text: m.model }), el("span", { cls: "sub", text: m.id + " · " + m.developer })]),
        el("td", {}, [tierBadge(m.model)]),
        td([m.format, m.quant].filter(Boolean).join(" ")), td(rt.join(", ")),
        td(/^yes|unknown/.test(m.thinking_switch) ? "off, on" : "off"), td(DEFAULT_HW),
        td("–", "num"), td("–", "num"), td("–", "num"), td("–", "num"), td("–", "num"), td(m.max_parallel_64gb || "–", "num"), td("–"),
        el("td", {}, [el("span", { cls: "status status-planned", title: m.run_status || "", text: why(m) || "planned" })])
      ]));
    });
    if (!body.children.length) body.appendChild(el("tr", {}, [el("td", { colspan: "14", cls: "muted", text: "No runs and no planned models." })]));
  }

  // Result per task: one column per run (best first), one row per task.
  function drawTasks() {
    var table = document.getElementById("task-table"), card = document.getElementById("tasks-card");
    var runs = visibleRuns().slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    table.textContent = "";
    card.hidden = !runs.length;
    if (!runs.length) return;
    table.appendChild(el("thead", {}, [el("tr", {}, [el("th", { scope: "col", text: "Task" })].concat(runs.map(function (r) {
      return el("th", { scope: "col", cls: "num" }, [r.model, el("br"), tierBadge(r.model),
        el("span", { cls: "sub", text: r.runtime.split(/[;(]/)[0].trim() + ", thinking " + r.thinking + ", " + requests(r.parallel) })]);
    })))]));
    var body = el("tbody");
    TASKS.forEach(function (t) {
      body.appendChild(el("tr", {}, [el("th", { scope: "row", cls: "task-name" }, [
        t[0] + " ", el("span", { cls: "pill level", text: LEVEL[t[0]] }), el("span", { cls: "sub task-title", text: t[1] })
      ])].concat(runs.map(function (run) {
        var r = run.byTask[t[0]];
        if (!r) return el("td", { cls: "num task-cell zero", text: "–" });
        var sc = num(r.score) || 0; if (sc > 1) sc /= 100;
        var cut = r.end_reason && r.end_reason !== "finished";
        // Notes that describe the measurement, not the answer, stay out of the cell.
        var note = /^(wall time|output_tokens)/.test(r.notes || "") ? "" : r.notes;
        var under = cut ? el("span", { cls: "sub reason", text: r.end_reason })
          : el("span", { cls: "sub", text: r.tests_passed + " of " + r.tests_total + " tests" + (note ? ", " + note : "") });
        return el("td", { cls: "num task-cell" + (sc ? "" : " zero") }, [el("span", { cls: "pct", text: Math.round(sc * 100) + "%" }), under]);
      }))));
    });
    table.appendChild(body);
  }

  function drawLegend() {
    var lg = document.getElementById("runs-legend"); lg.textContent = "";
    [["rb-bar", "Dense"], ["rb-bar moe", "MoE (mixture of experts)"]].forEach(function (x) {
      lg.appendChild(el("span", { cls: "legend-item" }, [el("span", { cls: "swatch " + x[0] }), x[1]]));
    });
    lg.appendChild(el("span", { cls: "legend-item" }, [el("span", { cls: "swatch swatch-planned" }), "Not run yet"]));
  }

  function summary() {
    var p = document.getElementById("runs-summary");
    var ran = {}; state.runs.forEach(function (r) { ran[r.id] = 1; });
    var left = bothFilter ? 0 : state.planned.filter(function (m) { return !ran[m.id]; }).length;
    var done = visibleRuns().length;
    p.textContent = (done
      ? done + (done === 1 ? " run" : " runs") + " of the local coding suite, best first. "
      : "No runs recorded yet. ") +
      (bothFilter ? "Only models run on both LM Studio and TensorFold. " : "") +
      (left ? left + " planned " + (left === 1 ? "model has" : "models have") + " not been run. " : "") +
      (metric === "score" ? "Score first (0 to 100), then decoding speed in tokens per second; the second chart opens in the same score order." : "Decoding speed in tokens per second first, then score (0 to 100); the second chart opens in the same speed order.");
  }

  // Tier table with the estimated models placed in their tier next to the official ones.
  function drawTierTable() {
    var body = document.getElementById("est-rows"); if (!body) return; body.textContent = "";
    var rows = {};
    function add(name, pct, est, score) { var b = bandOf(pct); (rows[b.id] = rows[b.id] || []).push({ name: name, pct: pct, est: est, score: score }); }
    Object.keys(tierByModel).forEach(function (k) {
      var run = state.runs.filter(function (r) { return normName(r.model) === k; })[0];
      if (run) add(run.model, tierByModel[k], false, Math.max.apply(null, state.runs.filter(function (r) { return normName(r.model) === k; }).map(function (r) { return r.score || 0; })));
    });
    state.estimated.forEach(function (e) { add(e.name, e.pct, true, e.score); });
    TIER_BANDS.forEach(function (b) {
      var list = (rows[b.id] || []).sort(function (a, c) { return c.pct - a.pct; });
      var cell = el("td", {}, list.length ? list.map(function (m) {
        return el("span", { cls: "est-item" + (m.est ? " is-est" : "") }, [m.name, el("span", { cls: "sub", text: (m.est ? "~" : "") + Math.round(m.pct) + "% of Sonnet 5.5 · suite " + fmt(m.score, 1) })]);
      }) : [el("span", { cls: "muted", text: "none run yet" })]);
      body.appendChild(el("tr", {}, [el("td", {}, [el("span", { cls: "tier-badge tier-" + b.id, text: b.label })]), cell]));
    });
    var card = document.getElementById("est-card"); if (card) card.hidden = !state.runs.length;
  }

  function draw() { drawTierTable(); drawBars(); drawTable(); drawTasks(); drawLegend(); summary(); }

  function setupTabs() {
    var tabs = document.querySelectorAll(".runs-metric .tab");
    Array.prototype.forEach.call(tabs, function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        var n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]; select(n); n.focus();
      });
    });
    function select(t) {
      Array.prototype.forEach.call(tabs, function (x) { var on = x === t; x.setAttribute("aria-checked", on); x.tabIndex = on ? 0 : -1; });
      metric = view = t.getAttribute("data-metric"); drawBars(); summary();
    }
  }

  // An All / On / Off switch above the charts; set() stores the chosen value.
  function setupFilter(selector, set) {
    var btns = document.querySelectorAll(selector + " .tab");
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(btns, function (x) { var on = x === b; x.setAttribute("aria-checked", on); x.tabIndex = on ? 0 : -1; });
        set(b.getAttribute("data-value")); draw();
      });
    });
  }

  function setupBoth() {
    var btns = document.querySelectorAll(".runs-both .tab");
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(btns, function (x) { var on = x === b; x.setAttribute("aria-checked", on); x.tabIndex = on ? 0 : -1; });
        bothFilter = b.getAttribute("data-both") === "on"; draw();
      });
    });
  }
  function setupFilters() {
    setupFilter(".runs-think", function (v) { thinkFilter = v; });
    setupFilter(".runs-batch", function (v) { batchFilter = v; });
    setupFilter(".runs-draft", function (v) { draftFilter = v; });
  }

  function get(url) { return fetch(url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(url + " " + r.status); return r.text(); }); }
  // The chart controls stick under the site header while the chart card scrolls. They tuck
  // 1px under the header, so no strip of the chart shows between the two.
  function headerHeight() {
    var h = document.querySelector(".site-header");
    document.documentElement.style.setProperty("--header-h", (h ? Math.floor(h.getBoundingClientRect().height) - 1 : 0) + "px");
  }
  headerHeight(); window.addEventListener("resize", headerHeight); window.addEventListener("load", headerHeight);
  setupTabs(); setupFilters(); setupBoth();
  Promise.all([get(MODELS_URL), get(RESULTS_URL).catch(function () { return ""; }), get(TIERS_URL).catch(function () { return ""; })]).then(function (t) {
    parseCSV(t[2]).forEach(function (r) {
      var p = num(r.pct_of_sonnet_5_5), k = normName(r.model);
      if (p != null && (tierByModel[k] == null || p > tierByModel[k])) tierByModel[k] = p;
    });
    state.planned = parseCSV(t[0]);
    state.runs = buildRuns(parseCSV(t[1]), state.planned);
    estimateTiers();
    draw();
  }).catch(function (e) {
    document.getElementById("runs-summary").textContent = "Could not load the run data (" + e.message + ").";
  });
})();
