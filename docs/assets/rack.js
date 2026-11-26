// Builds the Rack page from data/rack-speed-*.csv and data/racks-*.csv
// (copied into docs/data/ by scripts/sync-site-data.sh). No speeds are typed here.
(function () {
  "use strict";

  var SPEED_URL = "data/rack-speed-2026-11-18.csv";
  var RACKS_URL = "data/racks-2026-11-18.csv";
  var MAIN_RACK = "m5-ultra-512";
  var ALT_RACK = "m5-ultra-256";
  // Single machines that can be the minimum setup, smallest memory first; a model fits if its size plus OVERHEAD_GB (context, OS) is within memory
  var SMALL_RACKS = ["mbp-m5-pro-24", "m5-ultra-96"];
  var OVERHEAD_GB = 4;
  var SPARK_MULTI = /^dgx-spark-\d+$/;
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
    return [r.status === "estimate" ? "Estimate" : r.status === "measured" ? "Measured" : r.status === "cloud" ? "Cloud API" : r.status === "untested" ? "No published run" : "Doesn't fit",
      r.quant, r.engine, r.setup, r.note].filter(Boolean).join(" · ");
  }

  // One bar row: label | track with bar (or "doesn't fit") | value
  function barRow(label, r, scale, cls) {
    var track, value;
    if (r.status === "no_fit" || r.status === "untested") {
      track = el("span", { class: "rk-track rk-nofit", title: title(r) }, [el("span", { text: r.status === "untested" ? "no published run at this size" : "doesn't fit · needs " + fmtGB(r.size) })]);
      value = el("span", { class: "rk-value muted", text: "–" });
    } else {
      var w = Math.max(0.8, Math.min(100, r.tok / scale * 100));
      track = el("span", { class: "rk-track", title: title(r) }, [
        el("span", { class: "rk-bar tier-bg-" + r.tier + (r.status === "estimate" ? " rk-est" : ""), style: "width:" + w + "%" })
      ]);
      value = el("a", { class: "rk-value" + (r.status === "estimate" ? " est" : ""), href: r.source, title: title(r) },
        [fmtTok(r), el("span", { class: "rk-unit", text: " tok/s" }), r.status === "estimate" ? el("span", { class: "rk-est-tag", text: " est." }) : null]);
    }
    return el("div", { class: "rk-row" + (cls ? " " + cls : "") }, [label, track, value]);
  }

  // "4× M5 Ultra 512 GB" for M5 Ultra racks, else the machine's name
  function rackLabel(r, k) {
    if (k.id === "mbp-m5-pro-24") return "MacBook Pro M5 Pro " + k.mem + " GB";
    if (/^m5-ultra/.test(k.id)) return (r.macs || 1) + "× M5 Ultra " + k.mem + " GB";
    return k.name;
  }
  // Price of the whole rack: number of Macs × price per machine. "$89k", "$5.4k"
  function priceText(r, k) {
    if (k.price == null) return "";
    var t = (r && r.macs || 1) * k.price;
    var s = t >= 10000 ? "$" + Math.round(t / 1000) + "k" : "$" + (t / 1000).toFixed(1) + "k";
    if (k.id === "m1-ultra") return s + " (2022)";
    return (/^approx/.test(k.priceNote) ? "≈" : "") + s;
  }
  function priceTag(r, k) {
    var t = priceText(r, k);
    if (!t) return null;
    var macs = r && r.macs || 1;
    return el("a", { class: "rk-price", href: k.priceSrc, title: (macs > 1 ? macs + " × $" + k.price.toLocaleString("en-US") + " " : "$" + k.price.toLocaleString("en-US") + " ") + k.priceNote }, [t]);
  }
  function cellText(r) {
    if (r.status === "no_fit") return "doesn't fit";
    if (r.status === "untested") return "no data";
    return fmtTok(r) + (r.status === "estimate" ? " est." : "");
  }

  function render(speeds, racks) {
    var rackById = {};
    racks.forEach(function (k) { rackById[k.id] = k; });
    var main = rackById[MAIN_RACK];
    var ref = speeds.filter(function (r) { return r.status === "cloud"; })[0];
    var scale = Math.max.apply(null, speeds.filter(function (r) { return r.tok != null; }).map(function (r) { return r.tok; }));

    var alt = rackById[ALT_RACK];
    document.getElementById("rack-title").textContent = "Mac Studio M5 Ultra";
    document.getElementById("rack-sub").textContent = "Each tier's best local model at 4-bit on as many Mac Studio M5 Ultras (" + main.gpu + "-core GPU, " +
      (main.bw / 1000).toFixed(1) + " TB/s each) as it needs, linked over Thunderbolt 5. Bars show tokens per second on " + main.mem + " GB Macs, one request at a time; the table gives the smallest M5 Ultra setup that fits each model and its price. The Max line is Claude Sonnet 5.5's cloud API speed.";

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
      var cfg = r.status === "cloud" ? null : el("span", { class: "rk-cfg", text: rackLabel(r, main).replace(/ M5 Ultra.*/, "") });
      bars.appendChild(barRow(el("span", { class: "rk-label" }, [badge(t.id), el("a", { class: "tb-model", href: r.source, text: name }), cfg]), r, scale, r.status === "cloud" ? "is-ref" : null));
      // Smallest M5 Ultra rack that holds the model: least total memory, then fewest Macs
      var cands = t.id === "max" ? [] : [[r, main], [onRack(t.id, ALT_RACK), alt]].filter(function (c) { return c[0] && c[0].macs; });
      SMALL_RACKS.forEach(function (id) {
        var k = rackById[id];
        if (k && t.id !== "max" && r.size + OVERHEAD_GB <= k.mem) cands.push([{ macs: 1, size: r.size, source: r.source, status: "measured" }, k]);
      });
      cands.sort(function (x, y) { return (x[0].macs * x[1].mem - y[0].macs * y[1].mem) || (x[0].macs - y[0].macs); });
      var minC = cands[0];
      body.appendChild(el("tr", null, [
        el("th", { scope: "row" }, [badge(t.id)]),
        el("td", null, [el("span", { class: "model" }, [el("span", { class: "model-link", text: name }),
          r.status === "cloud" ? el("span", { class: "pill pill-cloud", text: "cloud" }) : null]),
          el("span", { class: "rk-inline", text: r.size ? fmtGB(r.size) + " at 4-bit" : "Cloud reference" })]),
        el("td", { class: "num rk-size-col" }, [r.size ? fmtGB(r.size) : el("span", { class: "muted", text: "n/a" })]),
        minC ? el("td", { class: "rk-cfg-col" }, [rackLabel(minC[0], minC[1]), el("span", { class: "rk-cfg-n", text: (minC[0].macs * minC[1].mem).toLocaleString("en-US") + " GB in total" })])
             : el("td", { class: "rk-cfg-col muted", text: "cloud (Anthropic API)" }),
        minC ? el("td", { class: "num rk-cfg-col" }, [priceTag(minC[0], minC[1])]) : el("td", { class: "num rk-cfg-col muted", text: "n/a" })
      ]));
    });

    // All racks: one group per tier, one bar per rack
    var groups = document.getElementById("rack-groups");
    groups.textContent = "";
    TIERS.forEach(function (t) {
      // DGX Spark clusters (2, 4, 8, 16 Sparks) live on the DGX Spark tab; here each tier shows one Spark row,
      // the smallest setup with a number, as the Mac rows do
      var rows = t.id === "max" ? [ref] : racks.filter(function (k) { return !SPARK_MULTI.test(k.id); }).map(function (k) {
        var r0 = onRack(t.id, k.id);
        if (k.id === "dgx-spark" && r0 && r0.tok == null) {
          var multi = racks.filter(function (m) { return SPARK_MULTI.test(m.id); }).sort(function (a, b) { return a.mem - b.mem; })
            .map(function (m) { return onRack(t.id, m.id); }).filter(function (x) { return x && x.tok != null; });
          if (multi.length) return multi[0];
        }
        return r0;
      }).filter(Boolean);
      // Fastest rack first; racks with no number (doesn't fit, no run) at the bottom, in rack order
      rows = rows.map(function (r, i) { return { r: r, i: i }; })
        .sort(function (x, y) { return ((y.r.tok == null ? -1 : y.r.tok) - (x.r.tok == null ? -1 : x.r.tok)) || x.i - y.i; })
        .map(function (x) { return x.r; });
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
        var lab = r.status === "cloud" ? "Cloud API" : rackLabel(r, rackById[r.rack]);
        var k = rackById[r.rack];
        g.appendChild(barRow(el("span", { class: "rk-label rk-rack" + (/^m5-ultra/.test(r.rack) ? " is-main" : "") }, [lab, k && r.status !== "untested" ? priceTag(r, k) : null]), r, scale));
      });
      groups.appendChild(g);
    });
    groups.appendChild(el("div", { class: "legend" }, [
      el("span", { class: "legend-item" }, [el("span", { class: "swatch tier-bg-t2" }), "Measured"]),
      el("span", { class: "legend-item" }, [el("span", { class: "swatch tier-bg-t2 rk-est" }), "Estimate"]),
      el("span", { class: "legend-item" }, [el("span", { class: "swatch rk-swatch-nofit" }), "Doesn't fit, or no published run"])
    ]));

    // Rack specs
    var spec = document.getElementById("spec-rows");
    spec.textContent = "";
    racks.filter(function (k) { return !SPARK_MULTI.test(k.id); }).forEach(function (k) {
      spec.appendChild(el("tr", null, [
        el("th", { scope: "row" }, [el("a", { href: firstUrl(k.src), text: k.name })]),
        el("td", { text: k.chip }),
        el("td", { class: "num", text: k.gpu == null ? "Blackwell GPU" : String(k.gpu) }),
        el("td", { class: "num", text: k.bw == null ? "n/a" : k.bw >= 1000 ? (k.bw / 1000).toFixed(1) + " TB/s" : k.bw + " GB/s" }),
        el("td", { class: "num", text: k.mem + " GB" + (/^m5-ultra/.test(k.id) ? " per Mac" : "") }),
        el("td", { class: "num" }, [el("a", { href: k.priceSrc, title: k.priceNote, class: "rk-price-cell" },
          [(/^approx/.test(k.priceNote) ? "≈" : "") + "$" + k.price.toLocaleString("en-US") + (/^m5-ultra/.test(k.id) ? " per Mac" : k.id === "m1-ultra" ? " (2022)" : "")])])
      ]));
    });
  }

  // Keep the sticky tab bar just under the site header (it tucks 1px under, so no strip of the page shows between them)
  function headerHeight() {
    var h = document.querySelector(".site-header");
    document.documentElement.style.setProperty("--header-h", (h ? Math.floor(h.getBoundingClientRect().height) - 1 : 0) + "px");
  }
  headerHeight(); window.addEventListener("resize", headerHeight); window.addEventListener("load", headerHeight);

  // Tabs
  (function () {
    var tabs = [["tab-rack", "panel-rack"], ["tab-spark", "panel-spark"], ["tab-rack-all", "panel-rack-all"]];
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
    function fromHash() { if (location.hash === "#all") select("tab-rack-all"); else if (location.hash === "#spark") select("tab-spark"); }
    window.addEventListener("hashchange", fromHash);
    fromHash();
  })();

  Promise.all([SPEED_URL, RACKS_URL].map(function (u) {
    return fetch(u).then(function (r) { if (!r.ok) throw new Error(u + ": " + r.status); return r.text(); });
  })).then(function (texts) {
    var speeds = parseCSV(texts[0]).map(function (r) {
      return { tier: r.tier, model: r.model, rack: r.rack_id, status: r.status, tok: num(r.tok_s), size: num(r.model_size_gb),
        macs: num(r.macs), quant: r.quant, engine: r.engine, setup: r.setup, source: firstUrl(r.source), note: r.note };
    });
    var racks = parseCSV(texts[1]).map(function (r) {
      return { id: r.rack_id, name: r.name, chip: r.chip, gpu: num(r.gpu_cores), bw: num(r.bandwidth_gbs), mem: num(r.max_memory_gb), src: r.spec_source,
        price: num(r.price_usd), priceNote: r.price_note, priceSrc: firstUrl(r.price_source) };
    });
    render(speeds, racks);
  }).catch(function (err) {
    document.getElementById("rack-rows").innerHTML = '<tr><td colspan="5">Could not load the data files (' + String(err.message || err) + ').</td></tr>';
  });
})();
