// Builds the Rack page from data/rack-speed-*.csv and data/racks-*.csv
// (copied into docs/data/ by scripts/sync-site-data.sh). No speeds are typed here.
(function () {
  "use strict";

  var SPEED_URL = "data/rack-speed-2026-11-18.csv";
  var RACKS_URL = "data/racks-2026-11-18.csv";
  var MAIN_RACK = "m5-ultra-512";
  var ALT_RACK = "m5-ultra-256";
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
      (main.bw / 1000).toFixed(1) + " TB/s each) as it needs, linked over Thunderbolt 5. Bars use " + main.mem + " GB Macs; the table also shows " + alt.mem +
      " GB Macs. Tokens per second, one request at a time. The Max line is Claude Sonnet 5.5's cloud API speed.";

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
      var cfg = r.status === "cloud" ? null : el("span", { class: "rk-cfg", text: rackLabel(r, main).replace(/ M5 Ultra.*/, "") + " · " + priceText(r, main) });
      bars.appendChild(barRow(el("span", { class: "rk-label" }, [badge(t.id), el("a", { class: "tb-model", href: r.source, text: name }), cfg]), r, scale, r.status === "cloud" ? "is-ref" : null));
      var r2 = t.id === "max" ? null : onRack(t.id, ALT_RACK);
      function cfgCell(x, k) {
        if (!x) return el("td", { class: "rk-cfg-col muted", text: "cloud" });
        return el("td", { class: "rk-cfg-col" }, [el("span", { class: "rk-cfg-n" }, [rackLabel(x, k) + " ", x.status === "untested" ? null : priceTag(x, k)]),
          el("a", { class: "rk-num rk-sub" + (x.status === "estimate" ? " est" : ""), href: x.source, title: title(x) }, [cellText(x)])]);
      }
      body.appendChild(el("tr", null, [
        el("th", { scope: "row" }, [badge(t.id)]),
        el("td", null, [el("span", { class: "model" }, [el("span", { class: "model-link", text: name }),
          r.status === "cloud" ? el("span", { class: "pill pill-cloud", text: "cloud" }) : null]),
          el("span", { class: "rk-inline", text: r.size ? fmtGB(r.size) + " at 4-bit" : "Cloud reference" })]),
        el("td", { class: "num rk-size-col" }, [r.size ? fmtGB(r.size) : el("span", { class: "muted", text: "n/a" })]),
        r.status === "cloud" ? el("td", { class: "rk-cfg-col" }, [el("span", { class: "rk-cfg-n", text: "Anthropic API" }), el("a", { class: "rk-num rk-sub", href: r.source, title: title(r) }, [cellText(r)])]) : cfgCell(r, main),
        cfgCell(r2, alt)
      ]));
    });

    // Price tab: cheapest M5 Ultra rack that fits, per tier
    (function () {
      var pb = document.getElementById("price-bars"), pr = document.getElementById("price-rows");
      pb.textContent = ""; pr.textContent = "";
      var opts = TIERS.map(function (t) {
        if (t.id === "max") return { t: t, cloud: true };
        var list = [MAIN_RACK, ALT_RACK].map(function (id) { return onRack(t.id, id); })
          .filter(function (r) { return r && r.status !== "no_fit"; })
          .map(function (r) { var k = rackById[r.rack]; return { r: r, k: k, total: (r.macs || 1) * k.price, ok: r.status !== "untested" }; });
        var usable = list.filter(function (o) { return o.ok; }).sort(function (a, b) { return a.total - b.total; });
        return { t: t, best: usable[0], other: list.filter(function (o) { return o !== usable[0]; })[0] };
      });
      var top = Math.max.apply(null, opts.map(function (o) { return o.best ? o.best.total : 0; }));
      function money(n) { return n >= 10000 ? "$" + Math.round(n / 1000) + "k" : "$" + (n / 1000).toFixed(1) + "k"; }
      function sum(o) { return o.r.macs + " × $" + o.k.price.toLocaleString("en-US") + " = $" + o.total.toLocaleString("en-US"); }
      opts.forEach(function (o) {
        var t = o.t;
        if (o.cloud) {
          pb.appendChild(el("div", { class: "rk-row is-ref" }, [
            el("span", { class: "rk-label" }, [badge("max"), el("span", { class: "tb-model", text: "Claude Sonnet 5.5" })]),
            el("span", { class: "rk-track rk-nofit", title: "Cloud API, billed per token; no hardware to buy" }, [el("span", { text: "cloud · no hardware" })]),
            el("span", { class: "rk-value muted", text: "n/a" })]));
          pr.appendChild(el("tr", null, [el("th", { scope: "row" }, [badge("max")]), el("td", { text: "Claude Sonnet 5.5" }),
            el("td", { class: "muted", text: "Anthropic API" }), el("td", { class: "num muted", text: "n/a" }), el("td", { class: "rk-alt-col muted", text: "–" })]));
          return;
        }
        var b = o.best, r = b.r, name = baseName(r.model), equip = rackLabel(r, b.k);
        pb.appendChild(el("div", { class: "rk-row" }, [
          el("span", { class: "rk-label" }, [badge(t.id), el("span", { class: "rk-equip", text: equip }), el("span", { class: "rk-cfg", text: name })]),
          el("span", { class: "rk-track", title: sum(b) }, [el("span", { class: "rk-bar tier-bg-" + t.id, style: "width:" + Math.max(0.8, b.total / top * 100) + "%" })]),
          el("a", { class: "rk-value", href: b.k.priceSrc, title: sum(b) + " · " + b.k.priceNote }, [money(b.total)])]));
        var alt = o.other ? rackLabel(o.other.r, o.other.k) + " " + money(o.other.total) + (o.other.ok ? "" : " (no published run)") : "–";
        pr.appendChild(el("tr", null, [el("th", { scope: "row" }, [badge(t.id)]), el("td", { text: name }),
          el("td", null, [equip]),
          el("td", { class: "num" }, [el("a", { href: b.k.priceSrc, title: sum(b), class: "rk-price-cell", text: money(b.total) })]),
          el("td", { class: "rk-alt-col muted", text: alt })]));
      });
    })();

    // All racks: one group per tier, one bar per rack
    var groups = document.getElementById("rack-groups");
    groups.textContent = "";
    TIERS.forEach(function (t) {
      var rows = t.id === "max" ? [ref] : racks.map(function (k) { return onRack(t.id, k.id); }).filter(Boolean);
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
    racks.forEach(function (k) {
      spec.appendChild(el("tr", null, [
        el("th", { scope: "row" }, [el("a", { href: firstUrl(k.src), text: k.name })]),
        el("td", { text: k.chip }),
        el("td", { class: "num", text: k.gpu == null ? "Blackwell GPU" : String(k.gpu) }),
        el("td", { class: "num", text: k.bw >= 1000 ? (k.bw / 1000).toFixed(1) + " TB/s" : k.bw + " GB/s" }),
        el("td", { class: "num", text: k.mem + " GB" + (/^m5-ultra/.test(k.id) ? " per Mac" : "") }),
        el("td", { class: "num" }, [el("a", { href: k.priceSrc, title: k.priceNote, class: "rk-price-cell" },
          [(/^approx/.test(k.priceNote) ? "≈" : "") + "$" + k.price.toLocaleString("en-US") + (/^m5-ultra/.test(k.id) ? " per Mac" : k.id === "m1-ultra" ? " (2022)" : "")])])
      ]));
    });
  }

  // Tabs
  (function () {
    var tabs = [["tab-rack", "panel-rack"], ["tab-rack-price", "panel-rack-price"], ["tab-rack-all", "panel-rack-all"]];
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
    function fromHash() { if (location.hash === "#all") select("tab-rack-all"); else if (location.hash === "#price") select("tab-rack-price"); }
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
