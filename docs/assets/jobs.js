// Builds the Finance > Jobs page from data/trillion-companies-*.csv (copied into docs/data/ by
// scripts/sync-site-data.sh). No numbers are typed here: only the tier band edges, which are the
// definitions in articles/trillion-companies-jobs.md.
(function () {
  "use strict";

  var DATA_URL = "data/trillion-companies-2026-11-20.csv";
  // Job tiers: jobs per $1 billion of market value
  var TIERS = [
    { id: "t4", label: "4", range: "1,000 jobs or more per $1B" },
    { id: "t3", label: "3", range: "100 to 1,000" },
    { id: "t2", label: "2", range: "30 to 100" },
    { id: "t1", label: "1", range: "fewer than 30" }
  ];
  var EDGES = [30, 100, 1000], LO = 1, HI = 10000;
  // Margin tiers: Tier 1 is the highest margin. A net loss is in Tier 4.
  var MTIERS = [
    { id: "t1", label: "1", range: "40% or more", min: 40 },
    { id: "t2", label: "2", range: "20% to 40%", min: 20 },
    { id: "t3", label: "3", range: "5% to 20%", min: 5 },
    { id: "t4", label: "4", range: "less than 5%, or a net loss", min: -Infinity }
  ];
  var MEDGES = [5, 20, 40], MHI = 80;

  function parseCSV(text) {
    var rows = [], row = [], field = "", inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') inQuotes = false;
        else field += c;
      } else if (c === '"') inQuotes = true;
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

  function num(s) { return s === "" || isNaN(+s) ? null : +s; }
  function int(n) { return Math.round(n).toLocaleString("en-US"); }
  // Money given in billions of dollars
  function usdB(b) {
    if (b == null) return "n/a";
    var a = Math.abs(b), sign = b < 0 ? "-" : "";
    return sign + "$" + (a >= 1000 ? (a / 1000).toFixed(2) + "T" : a >= 10 ? a.toFixed(0) + "B" : a.toFixed(1) + "B");
  }
  // Money given in thousands of dollars
  function usdK(k) {
    if (k == null) return "n/a";
    var a = Math.abs(k), sign = k < 0 ? "-" : "";
    return sign + "$" + (a >= 1000 ? (a / 1000).toFixed(2) + "M" : int(a) + "K");
  }
  // Rounds halves away from zero (31.15 shows as 31.2), which toFixed alone does not do reliably
  function r1(v) { return (Math.sign(v) * Math.round(Math.abs(v) * 10 + 1e-9) / 10).toFixed(1); }
  function pct(p) { return p == null ? "n/a" : r1(p) + "%"; }
  function slug(s) { return "job-" + s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function tierOf(label) { return TIERS.filter(function (t) { return t.label === label; })[0]; }
  function badge(t) { return el("span", { class: "tier-badge rs-tag tier-" + t.id, title: "Tier " + t.label + ": " + t.range }, ["Tier " + t.label]); }
  function pos(v) { return Math.min(100, Math.max(0, Math.log(v / LO) / Math.log(HI / LO)) * 100); }

  function render(rows) {
    var items = rows.map(function (r) {
      return {
        id: slug(r.company), name: r.company, r: r, tier: tierOf(r.jobs_tier), jobs: +r.jobs_per_usd_b_market_cap,
        club: r.group === "trillion", cap: num(r.market_cap_usd_b), rev: num(r.revenue_ttm_usd_b), ni: num(r.net_income_ttm_usd_b),
        margin: num(r.profit_margin_pct), opm: num(r.operating_margin_pct), emp: +r.employees, tax: num(r.income_tax_ttm_usd_b)
      };
    });
    // Tier 1 (fewest jobs for the value) first, Tier 4 last
    items.sort(function (a, b) { return a.jobs - b.jobs; });
    var ORDER = TIERS.slice().reverse();

    // Chart: one bar per company, coloured by tier, on a logarithmic scale
    var plot = el("div", { class: "plot rs-plot rs-plot-jobs" });
    var edges = el("div", { class: "edges", "aria-hidden": "true" });
    plot.appendChild(edges);
    EDGES.forEach(function (e) {
      edges.appendChild(el("span", { class: "edge", style: "left:" + pos(e) + "%" }, [el("span", { class: "edge-label", text: int(e) })]));
    });
    items.forEach(function (c) {
      plot.appendChild(el("div", { class: "rs-row" }, [
        el("span", { class: "rs-label", title: c.name }, [badge(c.tier), el("span", { class: "rs-name" }, [c.name, c.club ? null : el("span", { class: "muted jobs-ref", text: " below $1T" })])]),
        el("span", { class: "rs-track", title: int(c.emp) + " employees, market value " + usdB(c.cap) },
          [el("span", { class: "bar tier-bg-" + c.tier.id + (c.club ? "" : " jobs-ref-bar"), style: "width:" + Math.max(0.6, pos(c.jobs)) + "%" })]),
        el("span", { class: "rs-value" }, [(c.jobs < 100 ? c.jobs.toFixed(1) : int(c.jobs)) + " jobs", el("span", { class: "jobs-split", text: "/ " + int(c.emp) + " total jobs" })]),
        el("a", { class: "explain rs-more", href: "#" + c.id, title: "Details and source for " + c.name, "aria-label": "Details for " + c.name }, ["Details"])
      ]));
    });
    var bars = document.getElementById("jobs-bars");
    bars.textContent = "";
    bars.appendChild(plot);
    var legend = document.getElementById("jobs-legend");
    legend.textContent = "";
    ORDER.forEach(function (t) {
      legend.appendChild(el("span", { class: "legend-item" }, [el("span", { class: "swatch tier-bg-" + t.id }), "Tier " + t.label + ": " + t.range]));
    });

    // Tier totals: the $1T companies only
    var club = items.filter(function (c) { return c.club; });
    function sum(list, k) { return list.reduce(function (s, c) { return s + (c[k] || 0); }, 0); }
    var all = { cap: sum(club, "cap"), ni: sum(club, "ni"), emp: sum(club, "emp") };
    var tb = document.getElementById("jobs-tier-rows");
    tb.textContent = "";
    ORDER.forEach(function (t) {
      var list = club.filter(function (c) { return c.tier === t; });
      if (!list.length) return;
      tb.appendChild(el("tr", { class: "rs-choice" }, [
        el("td", { "data-label": "Tier", class: "rs-c-tier" }, [badge(t)]),
        el("th", { scope: "row", class: "rs-c-choice", text: list.map(function (c) { return c.name; }).join(", ") }),
        el("td", { "data-label": "Share of jobs", text: pct(100 * sum(list, "emp") / all.emp) + " (" + int(sum(list, "emp")) + ")" }),
        el("td", { "data-label": "Share of net profit", text: pct(100 * sum(list, "ni") / all.ni) + " (" + usdB(sum(list, "ni")) + ")" }),
        el("td", { "data-label": "Share of market value", text: pct(100 * sum(list, "cap") / all.cap) + " (" + usdB(sum(list, "cap")) + ")" })
      ]));
    });
    tb.appendChild(el("tr", { class: "rs-choice jobs-total" }, [
      el("td", { "data-label": "Tier", class: "rs-c-tier", text: "All" }),
      el("th", { scope: "row", class: "rs-c-choice", text: club.length + " US companies above $1 trillion" }),
      el("td", { "data-label": "Jobs", text: int(all.emp) }),
      el("td", { "data-label": "Net profit", text: usdB(all.ni) }),
      el("td", { "data-label": "Market value", text: usdB(all.cap) })
    ]));

    // Margin chart: its own tiers, highest margin first. Bars are linear from 0% to 70%; a net loss
    // has no bar. Companies with a "margin before R&D" in the data file (the young, fast-growing
    // ones) are placed by that margin, the others by net profit margin.
    var byMargin = items.map(function (c) {
      var before = num(c.r.margin_before_rd_pct);
      // rd = research spending as a share of revenue; ops = profit from operations as a share of revenue
      var rd = num(c.r.rd_pct_of_revenue);
      return { c: c, m: before != null ? before : c.margin, beforeRd: before != null, rd: rd, ops: before != null ? before - rd : null };
    }).filter(function (x) { return x.m != null; }).sort(function (a, b) { return b.m - a.m; });
    var mplot = el("div", { class: "plot rs-plot rs-plot-jobs rs-plot-margin" });
    var medges = el("div", { class: "edges", "aria-hidden": "true" });
    mplot.appendChild(medges);
    MEDGES.forEach(function (e) {
      medges.appendChild(el("span", { class: "edge", style: "left:" + (e / MHI * 100) + "%" }, [el("span", { class: "edge-label", text: e + "%" })]));
    });
    byMargin.forEach(function (x) {
      var c = x.c, t = MTIERS.filter(function (m) { return x.m >= m.min; })[0], loss = x.m < 0;
      mplot.appendChild(el("div", { class: "rs-row" }, [
        el("span", { class: "rs-label", title: c.name }, [
          el("span", { class: "tier-badge rs-tag tier-" + t.id, title: "Margin tier " + t.label + ": " + t.range }, ["Tier " + t.label]),
          el("span", { class: "rs-name" }, [c.name, x.beforeRd ? el("span", { class: "muted jobs-ref", text: " before R&D" }) : null, c.club ? null : el("span", { class: "muted jobs-ref", text: " below $1T" })])
        ]),
        el("span", { class: "rs-track" + (loss ? " rs-none" : ""), title: x.beforeRd ? c.r.margin_before_rd_basis : usdB(c.ni) + " net profit on " + usdB(c.rev) + " revenue" },
          loss ? ["net loss"] : x.beforeRd ? [
            // Two segments: profit from operations (solid, only when positive), then the R&D added back (striped)
            x.ops > 0 ? el("span", { class: "bar jobs-seg tier-bg-" + t.id, style: "width:" + (x.ops / MHI * 100) + "%" }) : null,
            el("span", { class: "bar jobs-seg jobs-rd tier-bg-" + t.id, style: "width:" + ((x.m - Math.max(0, x.ops)) / MHI * 100) + "%" })
          ] : x.rd != null ? [
            // Net margin (solid), then the R&D spending as a share of revenue (striped) as a separate feature
            el("span", { class: "bar jobs-seg tier-bg-" + t.id + (c.club ? "" : " jobs-ref-bar"), style: "width:" + (x.m / MHI * 100) + "%" }),
            el("span", { class: "bar jobs-seg jobs-rd tier-bg-" + t.id + (c.club ? "" : " jobs-ref-bar"), style: "width:" + Math.min(x.rd, MHI - x.m) / MHI * 100 + "%" })
          ] : [el("span", { class: "bar tier-bg-" + t.id + (c.club ? "" : " jobs-ref-bar"), style: "width:" + Math.max(0.6, Math.min(100, x.m / MHI * 100)) + "%" })]),
        el("span", { class: "rs-value" }, x.beforeRd ? [r1(x.m) + "%", el("span", { class: "jobs-split", text: r1(x.ops) + "% + " + r1(x.rd) + "% R&D" })]
          : x.rd != null ? [r1(x.m) + "%", el("span", { class: "jobs-split", text: "+ " + r1(x.rd) + "% R&D" })] : [r1(x.m) + "%"]),
        el("a", { class: "explain rs-more", href: "#" + c.id, title: "Details and source for " + c.name, "aria-label": "Details for " + c.name }, ["Details"])
      ]));
    });
    var mbars = document.getElementById("margin-bars");
    mbars.textContent = "";
    mbars.appendChild(mplot);
    var mlegend = document.getElementById("margin-legend");
    mlegend.textContent = "";
    MTIERS.forEach(function (t) {
      mlegend.appendChild(el("span", { class: "legend-item" }, [el("span", { class: "swatch tier-bg-" + t.id }), "Tier " + t.label + ": " + t.range]));
    });

    // Details table
    var body = document.getElementById("jobs-rows");
    body.textContent = "";
    items.forEach(function (c) {
      var r = c.r;
      body.appendChild(el("tr", { id: c.id, class: "rs-choice" }, [
        el("td", { "data-label": "Tier", class: "rs-c-tier" }, [badge(c.tier)]),
        el("th", { scope: "row", class: "rs-c-choice" }, [c.name, el("span", { class: "rs-evidence", text: r.sector + (c.club ? "" : ", below $1T") })]),
        el("td", { "data-label": "Jobs per $1B of value" }, [
          el("span", { class: "rs-headline", text: c.jobs < 100 ? c.jobs.toFixed(1) : int(c.jobs) }),
          el("span", { class: "rs-effect-text", text: "/ " + int(c.emp) + " total jobs" })
        ]),
        el("td", { "data-label": "Market value", text: usdB(c.cap) }),
        el("td", { "data-label": "Revenue and profit" }, [
          el("span", { text: usdB(c.rev) + " revenue" }),
          el("span", { class: "rs-effect-text", text: c.ni == null ? "net profit not counted" : usdB(c.ni) + " net profit" })
        ]),
        el("td", { "data-label": "Net margin" }, [
          el("span", { text: c.margin == null ? "n/a" : pct(c.margin) }),
          num(r.margin_before_rd_pct) != null ? el("span", { class: "rs-effect-text" }, [pct(num(r.margin_before_rd_pct)) + " before R&D (", el("a", { href: r.margin_before_rd_source_url, title: r.margin_before_rd_basis, text: "source" }), ")"])
            : num(r.rd_pct_of_revenue) != null ? el("span", { class: "rs-effect-text" }, ["R&D " + pct(num(r.rd_pct_of_revenue)) + " of revenue (", el("a", { href: r.rd_source_url, title: r.rd_basis, text: "source" }), ")"])
            : el("span", { class: "rs-effect-text", text: "no R&D line" })
        ]),
        el("td", { "data-label": "Per employee" }, [
          el("span", { text: usdK(num(r.revenue_per_employee_usd_k)) + " revenue" }),
          el("span", { class: "rs-effect-text", text: num(r.profit_per_employee_usd_k) == null ? "" : usdK(num(r.profit_per_employee_usd_k)) + " profit" }),
          r.note ? el("span", { class: "rs-evidence", text: r.note }) : null
        ]),
        el("td", { "data-label": "Source", class: "rs-c-source" }, [
          el("a", { class: "rs-source", href: r.source_url, title: r.source + ", updated " + r.source_updated, text: "source" })
        ])
      ]));
    });
    if (rows[0] && rows[0].read) document.getElementById("rs-read").textContent = rows[0].read;
    if (/^#job-/.test(location.hash)) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }

  fetch(DATA_URL)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (text) { render(parseCSV(text)); })
    .catch(function (err) {
      document.getElementById("jobs-rows").innerHTML = '<tr><td colspan="8">Could not load the data file (' + String(err.message || err) + '). See <a href="' + DATA_URL + '">the CSV</a>.</td></tr>';
    });
})();
