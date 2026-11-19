// Runs page. Reads the planned model list (data/local-test-models.csv) and the per-task
// results of the local coding suite (data/local-runtime-results.csv), groups the result rows
// into runs and draws a horizontal bar chart plus a detail table. No numbers live in the HTML.
(function () {
  "use strict";
  var MODELS_URL = "data/local-test-models.csv";
  var RESULTS_URL = "data/local-runtime-results.csv";
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
      var bad = 0, seen = {}, byTask = {};
      rows.forEach(function (r) {
        var id = r.task_id.toLowerCase(), wt = WEIGHTS[id], sc = num(r.score);
        if (!wt || seen[id]) return; seen[id] = 1; byTask[id] = r;
        sc = sc == null ? 0 : (sc > 1 ? sc / 100 : sc);
        w += wt; ws += wt * sc; lv[LEVEL[id]][0] += wt * sc; lv[LEVEL[id]][1] += wt;
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
        score: tasks ? 100 * ws / 23 : null, easy: lvl("easy"), medium: lvl("medium"), hard: lvl("hard"),
        tok: tok.length ? tok.reduce(function (a, b) { return a + b; }, 0) / tok.length : null,
        time: hasTime ? time : null, mem: mem, tasks: tasks, bad: bad, think: thinkingOn(f.thinking),
        status: tasks < 10 ? "partial" : "done", byTask: byTask
      };
    });
  }

  // "1 request", "4 requests": how many requests were in flight during the run.
  function requests(n) { return n ? n + (String(n) === "1" ? " request" : " requests") + " at a time" : ""; }
  // Why a listed model has no run: "not installed", or "cannot run" with the reason in the model list.
  function why(m) { return (m.run_status || "").split(":")[0]; }

  function label(r) {
    return el("div", { cls: "rb-label", title: r.model + " · " + r.quant + " · " + r.runtime + " · thinking " + r.thinking }, [
      el("span", { cls: "rb-model", text: r.model }),
      el("span", { cls: "setting", text: [r.quant, r.runtime.split(/[;(]/)[0].trim(), r.thinking ? "thinking " + r.thinking : "", requests(r.parallel), r.why || ""].filter(Boolean).join(" · ") })
    ]);
  }

  // The chart is split in two, one panel per runtime, so the same model can be compared
  // across runtimes on a shared scale. Panels are always shown, even with no run in them.
  var RUNTIMES = [
    { name: "LM Studio", planned: function (m) { return !!m.lmstudio; } },
    { name: "TensorFold", planned: function (m) { return /^(installed|loads)/.test(m.tensorfold || ""); } }
  ];

  function drawBars() {
    var box = document.getElementById("runs-bars"); box.textContent = "";
    var key = metric === "score" ? "score" : "tok";
    var all = state.runs.filter(function (r) { return r[key] != null; });
    // One scale for both panels so bar lengths compare across runtimes.
    var max = metric === "score" ? 100 : Math.max.apply(null, all.map(function (r) { return r.tok; }).concat([1]));
    RUNTIMES.forEach(function (rt) {
      var runs = all.filter(function (r) { return r.rt === rt.name; }).sort(function (a, b) { return b[key] - a[key]; });
      var panel = el("div", { cls: "rb-panel", role: "group", "aria-label": rt.name }, [
        el("h3", { cls: "rb-title", text: rt.name })
      ]);
      var list = el("div", { cls: "rbars" });
      panel.appendChild(list);
      runs.forEach(function (r) {
        var pct = Math.max(0, Math.min(100, 100 * r[key] / max));
        list.appendChild(el("div", { cls: "rb-row" }, [
          label(Object.assign({}, r, { runtime: "" })),
          el("div", { cls: "rb-track" }, [el("span", { cls: "rb-bar" + (r.think ? " think-on" : ""), style: "width:" + pct.toFixed(1) + "%" })]),
          metric === "score"
            ? el("div", { cls: "rb-value", text: fmt(r.score, 1) + " points" })
            : el("div", { cls: "rb-value" }, [fmt(r.tok, 1), el("span", { cls: "rb-unit", text: "tokens/sec" })])
        ]));
      });
      if (!runs.length) list.appendChild(el("p", { cls: "muted", text: "No runs in " + rt.name + " yet." }));
      box.appendChild(panel);
    });
    // Third section: planned models with no run in any runtime.
    var ranAny = {}; state.runs.forEach(function (r) { ranAny[r.id] = 1; });
    var todo = state.planned.filter(function (m) { return !ranAny[m.id]; });
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
    box.setAttribute("aria-label", metric === "score"
      ? "Two horizontal bar charts, one per runtime, of each run's suite score, 0 to 100"
      : "Two horizontal bar charts, one per runtime, of each run's decoding speed in tokens per second");
  }

  function td(text, cls) { return el("td", { cls: cls || "", text: text }); }
  function drawTable() {
    var body = document.getElementById("runs-rows"); body.textContent = "";
    var runs = state.runs.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    runs.forEach(function (r) {
      body.appendChild(el("tr", {}, [
        el("td", { cls: "model-cell" }, [el("strong", { text: r.model }), el("span", { cls: "sub", text: r.id + (r.mem != null ? " · peak " + fmt(r.mem, 1) + " GB" : "") })]),
        td(r.quant), td(r.runtime), td(r.thinking), td(r.hardware),
        td(fmt(r.score, 1), "num score"),
        td([fmt(r.easy), fmt(r.medium), fmt(r.hard)].join(" / "), "num"),
        td(fmt(r.tok, 1), "num"), td(fmtTime(r.time), "num"), td(r.parallel || "–", "num"), td(r.date || "–"),
        el("td", {}, [el("span", { cls: "status status-" + (r.status === "done" && !r.bad ? "done" : "failed"),
          text: r.status === "done" ? (r.bad ? r.bad + " cut off" : "done") : r.tasks + "/10 tasks" })])
      ]));
    });
    var ran = {}; state.runs.forEach(function (r) { ran[r.id] = 1; });
    state.planned.filter(function (m) { return !ran[m.id]; }).forEach(function (m) {
      var rt = ["LM Studio"]; if (/^(installed|loads)/.test(m.tensorfold || "")) rt.push("TensorFold");
      body.appendChild(el("tr", { cls: "is-planned" }, [
        el("td", { cls: "model-cell" }, [el("strong", { text: m.model }), el("span", { cls: "sub", text: m.id + " · " + m.developer })]),
        td([m.format, m.quant].filter(Boolean).join(" ")), td(rt.join(", ")),
        td(/^yes|unknown/.test(m.thinking_switch) ? "off, on" : "off"), td(DEFAULT_HW),
        td("–", "num"), td("–", "num"), td("–", "num"), td("–", "num"), td(m.max_parallel_64gb || "–", "num"), td("–"),
        el("td", {}, [el("span", { cls: "status status-planned", title: m.run_status || "", text: why(m) || "planned" })])
      ]));
    });
    if (!body.children.length) body.appendChild(el("tr", {}, [el("td", { colspan: "12", cls: "muted", text: "No runs and no planned models." })]));
  }

  // Result per task: one column per run (best first), one row per task.
  function drawTasks() {
    var table = document.getElementById("task-table"), card = document.getElementById("tasks-card");
    var runs = state.runs.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    table.textContent = "";
    card.hidden = !runs.length;
    if (!runs.length) return;
    table.appendChild(el("thead", {}, [el("tr", {}, [el("th", { scope: "col", text: "Task" })].concat(runs.map(function (r) {
      return el("th", { scope: "col", cls: "num" }, [r.model,
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
    [["rb-bar", "Thinking off"], ["rb-bar think-on", "Thinking on"]].forEach(function (x) {
      lg.appendChild(el("span", { cls: "legend-item" }, [el("span", { cls: "swatch " + x[0] }), x[1]]));
    });
    lg.appendChild(el("span", { cls: "legend-item" }, [el("span", { cls: "swatch swatch-planned" }), "Not run yet"]));
  }

  function summary() {
    var p = document.getElementById("runs-summary");
    var ran = {}; state.runs.forEach(function (r) { ran[r.id] = 1; });
    var left = state.planned.filter(function (m) { return !ran[m.id]; }).length;
    var done = state.runs.length;
    p.textContent = (done
      ? done + (done === 1 ? " run" : " runs") + " of the local coding suite, best first. "
      : "No runs recorded yet. ") +
      (left ? left + " planned " + (left === 1 ? "model has" : "models have") + " not been run. " : "") +
      (metric === "score" ? "Bars show the suite score, 0 to 100." : "Bars show decoding speed in tokens per second (t/s).");
  }

  function draw() { drawBars(); drawTable(); drawTasks(); drawLegend(); summary(); }

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
      Array.prototype.forEach.call(tabs, function (x) { var on = x === t; x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1; });
      metric = t.getAttribute("data-metric"); drawBars(); summary();
    }
  }

  function get(url) { return fetch(url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(url + " " + r.status); return r.text(); }); }
  setupTabs();
  Promise.all([get(MODELS_URL), get(RESULTS_URL).catch(function () { return ""; })]).then(function (t) {
    state.planned = parseCSV(t[0]);
    state.runs = buildRuns(parseCSV(t[1]), state.planned);
    draw();
  }).catch(function (e) {
    document.getElementById("runs-summary").textContent = "Could not load the run data (" + e.message + ").";
  });
})();
