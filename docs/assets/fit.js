// Model Fit page: pick a tier and a model, see the memory it needs at its maximum context and the hardware that fits.
// Memory rule adapted from alexziskind1/llm-inference-calculator (MIT, Alex Ziskind): see fit.html for the credit.
(function () {
  "use strict";

  var FIT_URL = "data/model-fit-2026-11-26.csv";
  var SPEED_URL = "data/rack-speed-2026-11-18.csv";
  var RACKS_URL = "data/racks-2026-11-18.csv";
  var REF_MODEL = "Qwen3.8 27B (Xhigh)";   // measured on most machines; dense speeds are scaled from it by file size
  var TYPICAL_BYTES_30B = 262144;   // F16 KV bytes per token of a typical 30B model (64 layers x 8 KV heads x 128 x 2 x 2 bytes)
  var USABLE = 0.9, OVERHEAD = 1.1, KV_ALPHA = 0.2, KV_BASE_CTX = 2048;   // calculator constants
  var TIERS = [
    { id: "t0", label: "Tier 0" }, { id: "t1", label: "Tier 1" }, { id: "t2", label: "Tier 2" },
    { id: "t3", label: "Tier 3" }, { id: "t4", label: "Tier 4" }, { id: "all", label: "All" }
  ];
  var state = { tier: "t2", model: null, q: "", kv: 0.5, method: "typical" };
  var data = null;

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
    return rows.map(function (r) { var o = {}; head.forEach(function (h, j) { o[h] = (r[j] || "").trim(); }); return o; });
  }
  function num(v) { return v === "" || v == null || isNaN(+v) ? null : +v; }
  function firstUrl(s) { return (s.match(/https?:\/\/[^\s;]+/) || ["#"])[0]; }
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null) return;
      if (k === "text") e.textContent = attrs[k]; else if (k === "class") e.className = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function fmtGB(v) { return v >= 100 ? Math.round(v).toLocaleString("en-US") + " GB" : v.toFixed(1) + " GB"; }
  function fmtCtx(n) { return n.toLocaleString("en-US") + " tokens"; }
  function fmtTok(t, est) { return (est ? "≈" : "") + (t >= 100 ? Math.round(t) : t.toFixed(1)); }
  function tierLabel(id) { var t = TIERS.filter(function (x) { return x.id === id; })[0]; return t ? t.label : id; }
  function badge(m) {
    if (!m.tier) return el("span", { class: "tier-badge fit-notier", text: "No tier" });
    return el("span", { class: "tier-badge tier-" + m.tier + (m.tierEst ? " tier-est" : ""), title: m.tierEst ? "Estimated tier, placed from LLMeter's local run" : "Official tier" },
      [tierLabel(m.tier)]);
  }

  // Memory rule of the LLM Inference Calculator, incremental decoding with the KV cache on, context at the model's maximum
  function memory(m, kvFactor) {
    var kv;
    if (state.method === "calc") kv = m.weights * KV_ALPHA * (m.ctx / KV_BASE_CTX) * kvFactor;   // the calculator's rule, as is
    else kv = TYPICAL_BYTES_30B * Math.sqrt((m.active || m.params) / 30) * (kvFactor / 2) * m.ctx / 1e9;   // typical GQA cache by model size
    var sub = m.weights + kv;
    return { weights: m.weights, kv: kv, overhead: sub * (OVERHEAD - 1), total: sub * OVERHEAD };
  }

  function speedFor(m, cfg) {
    var d = data;
    var direct = d.speeds.filter(function (r) { return r.model === m.rackModel && r.rack === cfg.rack && (r.macs || 1) === cfg.macs && r.tok != null; })[0];
    if (direct) return { tok: direct.tok, est: direct.status === "estimate", source: direct.source, how: direct.status === "estimate" ? "Estimate" : "Measured" };
    if (cfg.macs !== 1 || cfg.cluster || m.active !== m.params) return null;
    var refRack = cfg.rack === "mbp-m5-pro-24" ? "m5-pro" : cfg.rack;
    var ref = d.speeds.filter(function (r) { return r.model === REF_MODEL && r.rack === refRack && r.tok != null; })[0];
    if (!ref) return null;
    return { tok: ref.tok * ref.size / m.weights, est: true, source: ref.source,
      how: "Estimate: " + REF_MODEL + " on this machine (" + fmtTok(ref.tok, ref.status === "estimate") + " tok/s, " + fmtGB(ref.size) + ") scaled by file size" };
  }

  function configsFor(m, need) {
    var out = [], misses = [];
    data.racks.forEach(function (k) {
      if (/^dgx-spark-\d+$/.test(k.id)) {
        var has = data.speeds.some(function (r) { return r.model === m.rackModel && r.rack === k.id && r.tok != null; });
        if (has) out.push({ rack: k.id, macs: 1, cluster: true, mem: k.mem, cap: k.mem * USABLE, k: k, label: k.name });
        return;
      }
      out.push({ rack: k.id, macs: 1, mem: k.mem, cap: k.mem * USABLE, k: k, label: k.id === "mbp-m5-pro-24" ? "MacBook Pro M5 Pro 24 GB" : /^m5-ultra/.test(k.id) ? "M5 Ultra " + k.mem + " GB" : k.name });
      if (/^m5-ultra-(512|256)$/.test(k.id)) {
        var rows = data.speeds.filter(function (r) { return r.model === m.rackModel && r.rack === k.id && (r.macs || 1) > 1 && r.tok != null; });
        rows.forEach(function (r) { out.push({ rack: k.id, macs: r.macs, mem: k.mem * r.macs, cap: k.mem * r.macs * USABLE, k: k, label: r.macs + "× M5 Ultra " + k.mem + " GB" }); });
        if (need > k.mem * USABLE && !rows.length) {
          var n = Math.ceil(need / (k.mem * USABLE));
          if (n <= 8) out.push({ rack: k.id, macs: n, mem: k.mem * n, cap: k.mem * n * USABLE, k: k, label: n + "× M5 Ultra " + k.mem + " GB", noRun: true });
        }
      }
    });
    return out;
  }

  function priceText(cfg) {
    var k = cfg.k; if (k.price == null) return null;
    var t = (cfg.cluster ? 1 : cfg.macs) * k.price, s = t >= 10000 ? "$" + Math.round(t / 1000) + "k" : "$" + (t / 1000).toFixed(1) + "k";
    return (/^approx/.test(k.priceNote) ? "≈" : "") + s;
  }

  function renderPicker() {
    var tiers = document.getElementById("fit-tiers"); tiers.textContent = "";
    TIERS.forEach(function (t) {
      var b = el("button", { type: "button", class: "fit-chip" + (t.id === "all" ? "" : " tier-chip-" + t.id), "aria-pressed": String(state.tier === t.id), text: t.label });
      b.addEventListener("click", function () {
        state.tier = t.id; state.q = ""; document.getElementById("fit-q").value = "";
        var first = visible()[0]; if (first) state.model = first.model;
        render();
      });
      tiers.appendChild(b);
    });
    var tl = document.getElementById("fit-tier-legend");
    if (tl && !tl.firstChild) {
      tl.appendChild(el("span", { class: "legend-item" }, [el("span", { class: "tier-badge tier-t1 legend-badge", text: "Tier 1" }), "Official tier"]));
      tl.appendChild(el("span", { class: "legend-item" }, [el("span", { class: "tier-badge tier-t1 tier-est legend-badge", text: "Tier 1" }), "Estimated (placed from the local run)"]));
    }
    var list = document.getElementById("fit-models"); list.textContent = "";
    var v = visible();
    if (!v.length) list.appendChild(el("p", { class: "muted fit-none", text: "No model matches." }));
    v.forEach(function (m) {
      var b = el("button", { type: "button", class: "fit-model", "aria-pressed": String(state.model === m.model) }, [
        el("span", { class: "fit-model-top" }, [badge(m), m.top ? el("span", { class: "pill pill-muted fit-top", text: "Top" }) : null]),
        el("span", { class: "fit-model-name", text: m.model }),
        el("span", { class: "fit-model-meta", text: m.params + "B" + (m.active && m.active !== m.params ? " · " + m.active + "B active" : "") + " · " + fmtGB(m.weights) })
      ]);
      b.addEventListener("click", function () { state.model = m.model; render(); });
      list.appendChild(b);
    });
  }
  function visible() {
    var q = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    return data.models.filter(function (m) {
      if (state.tier !== "all" && m.tier !== state.tier) return false;
      var hay = (m.model + " " + m.params + "b").toLowerCase();
      return q.every(function (w) { return hay.indexOf(w) >= 0; });
    });
  }

  function renderResult() {
    var box = document.getElementById("fit-result"); box.textContent = "";
    var m = data.models.filter(function (x) { return x.model === state.model; })[0];
    if (!m) { box.appendChild(el("p", { class: "muted", text: "Pick a model above." })); return; }
    var mem = memory(m, state.kv);
    var tierId = m.tier || "t0";

    box.appendChild(el("div", { class: "fit-head" }, [
      el("div", null, [el("h2", { text: m.model }), el("p", { class: "muted fit-sub", text: m.quant + " build, " + fmtGB(m.weights) + " on disk · context " + fmtCtx(m.ctx) + (m.ctxBasis === "assumed" ? " (assumed)" : " (maximum)") })]),
      badge(m)
    ]));

    // Memory needed
    var parts = [["Weights", mem.weights, "fit-seg-w"], ["KV cache at full context", mem.kv, "fit-seg-kv"], ["Overhead (10%)", mem.overhead, "fit-seg-oh"]];
    var stack = el("div", { class: "fit-stack", role: "img", "aria-label": "Memory split: " + parts.map(function (p) { return p[0] + " " + fmtGB(p[1]); }).join(", ") });
    parts.forEach(function (p) { stack.appendChild(el("span", { class: "fit-seg " + p[2], style: "width:" + (p[1] / mem.total * 100) + "%", title: p[0] + ": " + fmtGB(p[1]) })); });
    var legend = el("div", { class: "legend fit-legend" });
    parts.forEach(function (p) { legend.appendChild(el("span", { class: "legend-item" }, [el("span", { class: "swatch " + p[2] }), p[0] + " ", el("strong", { text: fmtGB(p[1]) })])); });
    box.appendChild(el("div", { class: "fit-need" }, [
      el("div", { class: "fit-big" }, [el("span", { class: "fit-big-n", text: mem.total >= 100 ? Math.round(mem.total).toLocaleString("en-US") : mem.total.toFixed(1) }), el("span", { class: "fit-big-u", text: " GB needed" })]),
      el("p", { class: "muted fit-big-sub", text: "at the maximum context, " + fmtCtx(m.ctx) + ", with a " + (state.kv === 2 ? "F16" : state.kv === 1 ? "Q8" : "Q4") + " KV cache (" + (state.method === "calc" ? "calculator rule" : "typical estimate") + ")" }),
      stack, legend
    ]));

    // Hardware that fits
    var cfgs = configsFor(m, mem.total).map(function (c) { c.fits = mem.total <= c.cap; c.sp = c.noRun ? null : speedFor(m, c); return c; });
    var fits = cfgs.filter(function (c) { return c.fits; });
    var withSpeed = fits.filter(function (c) { return c.sp; }).sort(function (a, b) { return b.sp.tok - a.sp.tok; });
    var noSpeed = fits.filter(function (c) { return !c.sp; }).sort(function (a, b) { return a.mem - b.mem; });
    var scale = Math.max.apply(null, withSpeed.map(function (c) { return c.sp.tok; }).concat([1]));
    var noFit = cfgs.filter(function (c) { return !c.fits; });

    box.appendChild(el("div", { class: "fit-hw-head" }, [el("h3", { text: "Hardware that fits" }),
      el("p", { class: "muted", text: fits.length ? fits.length + " setup" + (fits.length > 1 ? "s" : "") + " with room for " + fmtGB(mem.total) + " (up to 90% of memory is used). Tokens per second, one request at a time." : "None of the machines in our data has room for " + fmtGB(mem.total) + "." })]));
    var bars = el("div", { class: "rk-bars fit-bars" });
    function label(c) {
      var p = priceText(c);
      return el("span", { class: "rk-label rk-rack is-main" }, [c.label, el("span", { class: "rk-cfg", text: Math.round(c.mem).toLocaleString("en-US") + " GB" }), p ? el("a", { class: "rk-price", href: c.k.priceSrc, title: c.k.priceNote, text: p }) : null]);
    }
    withSpeed.forEach(function (c) {
      var s = c.sp, w = Math.max(0.8, Math.min(100, s.tok / scale * 100));
      bars.appendChild(el("div", { class: "rk-row" }, [label(c),
        el("span", { class: "rk-track", title: s.how }, [el("span", { class: "rk-bar tier-bg-" + tierId + (s.est ? " rk-est" : ""), style: "width:" + w + "%" })]),
        el("a", { class: "rk-value" + (s.est ? " est" : ""), href: s.source, title: s.how }, [fmtTok(s.tok, s.est), el("span", { class: "rk-unit", text: " tok/s" }), s.est ? el("span", { class: "rk-est-tag", text: " est." }) : null])]));
    });
    noSpeed.forEach(function (c) {
      bars.appendChild(el("div", { class: "rk-row" }, [label(c),
        el("span", { class: "rk-track rk-nofit" }, [el("span", { text: c.noRun ? "fits · no published run at this size" : "fits · no speed number for this model" })]),
        el("span", { class: "rk-value muted", text: "–" })]));
    });
    if (bars.childNodes.length) box.appendChild(bars);
    if (bars.childNodes.length) box.appendChild(el("div", { class: "legend" }, [
      el("span", { class: "legend-item" }, [el("span", { class: "swatch tier-bg-" + tierId }), "Measured"]),
      el("span", { class: "legend-item" }, [el("span", { class: "swatch tier-bg-" + tierId + " rk-est" }), "Estimated (“≈ … est.”)"]),
      el("span", { class: "legend-item" }, [el("span", { class: "swatch rk-swatch-nofit" }), "Fits, no speed number"])
    ]));
    var small = noFit.filter(function (c) { return !c.noRun; });
    if (small.length) box.appendChild(el("p", { class: "muted fit-nofit", text: "Too small: " + small.map(function (c) { return c.label; }).join(", ") + "." }));
    if (m.active !== m.params && !withSpeed.length && fits.length) box.appendChild(el("p", { class: "muted fit-nofit", text: "Mixture-of-experts model with no published run on this hardware, so there is no speed estimate." }));
  }

  function render() { renderPicker(); renderResult(); }

  Promise.all([FIT_URL, SPEED_URL, RACKS_URL].map(function (u) {
    return fetch(u).then(function (r) { if (!r.ok) throw new Error(u + ": " + r.status); return r.text(); });
  }).concat([window.LLMeterModels.load()])).then(function (t) {
    var speeds = parseCSV(t[1]).map(function (r) {
      return { model: r.model, rack: r.rack_id, status: r.status, tok: num(r.tok_s), size: num(r.model_size_gb), macs: num(r.macs), source: firstUrl(r.source) };
    });
    var racks = parseCSV(t[2]).map(function (r) {
      return { id: r.rack_id, name: r.name, mem: num(r.max_memory_gb), price: num(r.price_usd), priceNote: r.price_note, priceSrc: firstUrl(r.price_source) };
    });
    var models = parseCSV(t[0]).map(function (r) {
      var t = window.LLMeterModels.tierOf(r.model);
      return { model: r.model, rackModel: r.rack_model, params: num(r.params_b), active: num(r.active_params_b) || (r.active_params_b === "" ? num(r.params_b) : null),
        weights: num(r.weights_gb), quant: r.quant, ctx: num(r.max_context_tokens), ctxBasis: r.context_basis,
        tier: t ? t.id : null, tierEst: !!(t && t.estimated), top: !!r.rack_model };
    });
    // Unknown active parameters (Qwen3.8-Flash-Next) are treated as unknown, not dense
    models.forEach(function (m) { if (m.model === "Qwen3.8-Flash-Next") m.active = null; });
    // Order: tier leaders first, then by weights
    models.sort(function (a, b) { return (b.top - a.top) || (b.params - a.params); });
    data = { models: models, speeds: speeds, racks: racks };
    // Start on Tier 2's top model
    var first = models.filter(function (m) { return m.tier === state.tier && m.top; })[0] || models[0];
    state.model = first.model;
    render();
  }).catch(function (err) {
    document.getElementById("fit-result").textContent = "Could not load the data files (" + String(err.message || err) + ").";
  });

  document.getElementById("fit-q").addEventListener("input", function (e) {
    state.q = e.target.value; if (state.q) state.tier = "all";
    var v = visible(); if (v.length && !v.some(function (m) { return m.model === state.model; })) state.model = v[0].model;
    render();
  });
  document.getElementById("fit-method").addEventListener("change", function (e) { state.method = e.target.value; if (data) renderResult(); });
  document.getElementById("fit-kv").addEventListener("change", function (e) { state.kv = +e.target.value; if (data) renderResult(); });
})();
