// Builds the Rack page from data/rack-speed-*.csv and data/racks-*.csv
// (copied into docs/data/ by scripts/sync-site-data.sh). No speeds are typed here.
(function () {
  "use strict";

  var SPEED_URL = "data/rack-speed-2026-11-18.csv";
  var RACKS_URL = "data/racks-2026-11-18.csv";
  var MAIN_RACK = "m5-ultra";
  var TIERS = [
    { id: "max", label: "Max" }, { id: "t4", label: "Tier 4" }, { id: "t3", label: "Tier 3" },
    { id: "t2", label: "Tier 2" }, { id: "t1", label: "Tier 1" }, { id: "t0", label: "Tier 0" }
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
    return [r.status === "estimate" ? "Estimate" : r.status === "measured" ? "Measured" : r.status === "cloud" ? "Cloud API" : "Doesn't fit",
      r.quant, r.engine, r.setup, r.note].filter(Boolean).join(" · ");
  }

  // One bar row: label | track with bar (or "doesn't fit") | value
  function barRow(label, r, scale, cls) {
    var track, value;
    if (r.status === "no_fit") {
      track = el("span", { class: "rk-track rk-nofit", title: title(r) }, [el("span", { text: "doesn't fit · needs " + fmtGB(r.size) })]);
      value = el("span", { class: "rk-value muted", text: "–" });
    } else {
      var w = Math.max(0.8, Math.min(100, r.tok / scale * 100));
      track = el("span", { class: "rk-track", title: title(r) }, [
        el("span", { class: "rk-bar tier-bg-" + r.tier + (r.status === "estimate" ? " rk-est" : ""), style: "width:" + w + "%" })
      ]);
      value = el("a", { class: "rk-value" + (r.status === "estimate" ? " est" : ""), href: r.source, title: title(r) },
        [fmtTok(r), r.status === "estimate" ? el("span", { class: "rk-est-tag", text: " est." }) : null]);
    }
    return el("div", { class: "rk-row" + (cls ? " " + cls : "") }, [label, track, value]);
  }

  function render(speeds, racks) {
    var rackById = {};
    racks.forEach(function (k) { rackById[k.id] = k; });
    var main = rackById[MAIN_RACK];
    var ref = speeds.filter(function (r) { return r.status === "cloud"; })[0];
    var scale = Math.max.apply(null, speeds.filter(function (r) { return r.tok != null; }).map(function (r) { return r.tok; }));

    document.getElementById("rack-title").textContent = "Tier table on " + main.name + " (" + main.gpu + "-core GPU, " + main.mem + " GB)";
    document.getElementById("rack-sub").textContent = "Generation speed in tokens per second for each tier's best local model, one request at a time, 4-bit builds, on the " +
      main.chip.replace(/,.*/, "") + " with " + (main.bw / 1000).toFixed(1) + " TB/s memory bandwidth. The Max line is Claude Sonnet 5.5's cloud API speed.";

    function onRack(tierId, rackId) {
      return speeds.filter(function (r) { return r.tier === tierId && (r.rack === rackId || (tierId === "max" && r.status === "cloud")); })[0];
    }

    // Main rack: chart and table
    var bars = document.getElementById("rack-bars"), body = document.getElementById("rack-rows");
    bars.textContent = ""; body.textContent = "";
    TIERS.forEach(function (t) {
      var r = onRack(t.id, MAIN_RACK);
      if (!r) return;
      var name = baseName(r.model);
      bars.appendChild(barRow(el("span", { class: "rk-label" }, [badge(t.id), el("a", { class: "tb-model", href: r.source, text: name })]), r, scale, r.status === "cloud" ? "is-ref" : null));
      var how = r.status === "no_fit" ? "Doesn't fit in " + main.mem + " GB"
        : r.status === "cloud" ? "Artificial Analysis, API median"
        : (r.status === "estimate" ? "Estimate" : "Measured") + (r.engine ? ", " + r.engine : "");
      body.appendChild(el("tr", null, [
        el("th", { scope: "row" }, [badge(t.id)]),
        el("td", null, [el("span", { class: "model" }, [el("span", { class: "model-link", text: name }),
          r.status === "cloud" ? el("span", { class: "pill pill-cloud", text: "cloud" }) : null]),
          el("span", { class: "rk-inline", text: how + (r.size ? " · " + fmtGB(r.size) + " 4-bit" : "") })]),
        el("td", { class: "num" }, [r.tok == null ? el("span", { class: "muted", text: "doesn't fit" })
          : el("a", { class: "rk-num" + (r.status === "estimate" ? " est" : ""), href: r.source, title: title(r) }, [fmtTok(r) + (r.status === "estimate" ? " est." : "")])]),
        el("td", { class: "num rk-size-col" }, [r.size ? fmtGB(r.size) : el("span", { class: "muted", text: "n/a" })]),
        el("td", { class: "rk-how-col" }, [el("a", { href: r.source, title: title(r), class: "rk-how" }, [how])])
      ]));
    });

    // All racks: one group per tier, one bar per rack
    var groups = document.getElementById("rack-groups");
    groups.textContent = "";
    TIERS.forEach(function (t) {
      var rows = t.id === "max" ? [ref] : racks.map(function (k) { return onRack(t.id, k.id); }).filter(Boolean);
      if (!rows.length || !rows[0]) return;
      var g = el("div", { class: "rk-group" }, [el("div", { class: "rk-group-head" }, [badge(t.id), el("span", { class: "rk-group-model", text: baseName(rows[0].model) }),
        t.id === "max" ? el("span", { class: "pill pill-cloud", text: "cloud" }) : el("span", { class: "muted rk-group-size", text: fmtGB(rows[0].size) + " at 4-bit" })])]);
      // A model that fits on no rack gets one line instead of five identical ones
      if (rows.every(function (r) { return r.status === "no_fit"; })) {
        g.appendChild(barRow(el("span", { class: "rk-label rk-rack", text: "All " + rows.length + " racks" }), rows[0], scale));
        groups.appendChild(g);
        return;
      }
      rows.forEach(function (r) {
        var lab = r.status === "cloud" ? "Cloud API" : rackById[r.rack].name;
        g.appendChild(barRow(el("span", { class: "rk-label rk-rack" + (r.rack === MAIN_RACK ? " is-main" : ""), text: lab }), r, scale));
      });
      groups.appendChild(g);
    });
    groups.appendChild(el("div", { class: "legend" }, [
      el("span", { class: "legend-item" }, [el("span", { class: "swatch tier-bg-t2" }), "Measured"]),
      el("span", { class: "legend-item" }, [el("span", { class: "swatch tier-bg-t2 rk-est" }), "Estimate"]),
      el("span", { class: "legend-item" }, [el("span", { class: "swatch rk-swatch-nofit" }), "Doesn't fit in memory"])
    ]));

    // Rack specs
    var spec = document.getElementById("spec-rows");
    spec.textContent = "";
    racks.forEach(function (k) {
      spec.appendChild(el("tr", null, [
        el("th", { scope: "row" }, [el("a", { href: firstUrl(k.src), text: k.name })]),
        el("td", { text: k.chip }),
        el("td", { class: "num", text: k.gpu == null ? "Blackwell GPU" : String(k.gpu) }),
        el("td", { class: "num", text: k.bw >= 1000 ? (k.bw / 1000).toFixed(1) + " TB/s" : k.bw + " GB/s" }),
        el("td", { class: "num", text: k.mem + " GB" })
      ]));
    });
  }

  // Tabs
  (function () {
    var tabs = [["tab-rack", "panel-rack"], ["tab-rack-all", "panel-rack-all"]];
    function select(id) {
      tabs.forEach(function (t) {
        var on = t[0] === id, b = document.getElementById(t[0]);
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
        document.getElementById(t[1]).hidden = !on;
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
    function fromHash() { if (location.hash === "#all") select("tab-rack-all"); }
    window.addEventListener("hashchange", fromHash);
    fromHash();
  })();

  Promise.all([SPEED_URL, RACKS_URL].map(function (u) {
    return fetch(u).then(function (r) { if (!r.ok) throw new Error(u + ": " + r.status); return r.text(); });
  })).then(function (texts) {
    var speeds = parseCSV(texts[0]).map(function (r) {
      return { tier: r.tier, model: r.model, rack: r.rack_id, status: r.status, tok: num(r.tok_s), size: num(r.model_size_gb),
        quant: r.quant, engine: r.engine, setup: r.setup, source: firstUrl(r.source), note: r.note };
    });
    var racks = parseCSV(texts[1]).map(function (r) {
      return { id: r.rack_id, name: r.name, chip: r.chip, gpu: num(r.gpu_cores), bw: num(r.bandwidth_gbs), mem: num(r.max_memory_gb), src: r.spec_source };
    });
    render(speeds, racks);
  }).catch(function (err) {
    document.getElementById("rack-rows").innerHTML = '<tr><td colspan="5">Could not load the data files (' + String(err.message || err) + ').</td></tr>';
  });
})();
