// Builds the Research > Jobs page from data/trillion-companies-*.csv (copied into docs/data/ by
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
  function pct(p) { return p == null ? "n/a" : p.toFixed(1) + "%"; }
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
    items.sort(function (a, b) { return b.jobs - a.jobs; });

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
        el("span", { class: "rs-value", text: (c.jobs < 100 ? c.jobs.toFixed(1) : int(c.jobs)) + " jobs" }),
        el("a", { class: "explain rs-more", href: "#" + c.id, title: "Details and source for " + c.name, "aria-label": "Details for " + c.name }, ["Details"])
      ]));
    });
    var bars = document.getElementById("jobs-bars");
    bars.textContent = "";
    bars.appendChild(plot);
    var legend = document.getElementById("jobs-legend");
    legend.textContent = "";
    TIERS.forEach(function (t) {
      legend.appendChild(el("span", { class: "legend-item" }, [el("span", { class: "swatch tier-bg-" + t.id }), "Tier " + t.label + ": " + t.range]));
    });

    // Tier totals: the $1T companies only
    var club = items.filter(function (c) { return c.club; });
    function sum(list, k) { return list.reduce(function (s, c) { return s + (c[k] || 0); }, 0); }
    var all = { cap: sum(club, "cap"), ni: sum(club, "ni"), emp: sum(club, "emp") };
    var tb = document.getElementById("jobs-tier-rows");
    tb.textContent = "";
    TIERS.forEach(function (t) {
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
          el("span", { class: "rs-effect-text", text: int(c.emp) + " employees" })
        ]),
        el("td", { "data-label": "Market value", text: usdB(c.cap) }),
        el("td", { "data-label": "Revenue and profit" }, [
          el("span", { text: usdB(c.rev) + " revenue" }),
          el("span", { class: "rs-effect-text", text: c.ni == null ? "net profit not used" : usdB(c.ni) + " net profit" })
        ]),
        el("td", { "data-label": "Margin" }, [
          el("span", { text: c.margin == null ? "n/a" : pct(c.margin) + " net" }),
          el("span", { class: "rs-effect-text", text: c.opm == null ? "" : pct(c.opm) + " operating" })
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
