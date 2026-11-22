// Builds the Finance > Anthropic IPO page from data/anthropic-ipo-holders-*.csv (copied into docs/data/
// by scripts/sync-site-data.sh). Tiers are by when shares are fully free to sell.
(function () {
  "use strict";

  var DATA_URL = "data/anthropic-ipo-holders-2026-11-22.csv";
  var TIERS = [
    { id: "t1", label: "1", range: "free now" },
    { id: "t2", label: "2", range: "free by May 17, 2027" },
    { id: "t3", label: "3", range: "free by Nov 18, 2027" }
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

  function usdB(b) { return b >= 1000 ? "$" + (b / 1000).toFixed(2) + "T" : "$" + Math.round(b) + "B"; }
  function shares(m) { return m >= 1000 ? (m / 1000).toFixed(m >= 10000 ? 1 : 2).replace(/0$/, "") + "B" : Math.round(m) + "M"; }
  function tierOf(n) { return TIERS.filter(function (t) { return t.label === n; })[0]; }
  function badge(t) { return el("span", { class: "tier-badge rs-tag tier-" + t.id, title: "Tier " + t.label + ": " + t.range }, ["Tier " + t.label]); }

  function render(rows) {
    var items = rows.map(function (r) {
      return { r: r, name: r.group, tier: tierOf(r.lockup_tier), sh: +r.shares_m, pct: +r.pct_of_company, val: +r.value_usd_b, est: r.shares_kind === "estimate" };
    });
    // Free now first, then by value within a tier
    items.sort(function (a, b) { return a.tier.label - b.tier.label || b.val - a.val; });
    var MAX = 100; // a full bar is 100% of the company

    var plot = el("div", { class: "plot rs-plot rs-plot-jobs" });
    items.forEach(function (c) {
      plot.appendChild(el("div", { class: "rs-row" }, [
        el("span", { class: "rs-label", title: c.name }, [badge(c.tier), el("span", { class: "rs-name" }, [c.name, c.est ? el("span", { class: "muted jobs-ref", text: " estimate" }) : null])]),
        el("span", { class: "rs-track", title: shares(c.sh) + " shares, " + c.pct + "% of the company. Fully free by: " + c.r.free_by },
          [el("span", { class: "bar tier-bg-" + c.tier.id + (c.est ? " jobs-ref-bar" : ""), style: "width:" + Math.max(0.6, c.pct / MAX * 100) + "%" })]),
        el("span", { class: "rs-value" }, ["~" + c.pct + "%", el("span", { class: "jobs-split", text: "~" + usdB(c.val) })])
      ]));
    });
    var bars = document.getElementById("ipo-bars");
    bars.textContent = "";
    bars.appendChild(plot);
    var legend = document.getElementById("ipo-legend");
    legend.textContent = "";
    TIERS.forEach(function (t) {
      legend.appendChild(el("span", { class: "legend-item" }, [el("span", { class: "swatch tier-bg-" + t.id }), "Tier " + t.label + ": " + t.range]));
    });

    function sum(list, k) { return list.reduce(function (s, c) { return s + c[k]; }, 0); }
    var tb = document.getElementById("ipo-tier-rows");
    tb.textContent = "";
    TIERS.forEach(function (t) {
      var list = items.filter(function (c) { return c.tier === t; });
      if (!list.length) return;
      tb.appendChild(el("tr", { class: "rs-choice" }, [
        el("td", { "data-label": "Tier", class: "rs-c-tier" }, [badge(t)]),
        el("th", { scope: "row", class: "rs-c-choice", text: list.map(function (c) { return c.name; }).join("; ") }),
        el("td", { "data-label": "Fully free by", text: t.range.replace("free ", "") }),
        el("td", { "data-label": "Shares", text: shares(sum(list, "sh")) }),
        el("td", { "data-label": "Share of company", text: "~" + sum(list, "pct").toFixed(1).replace(/\.0$/, "") + "%" }),
        el("td", { "data-label": "Value at $97.17", text: "~" + usdB(sum(list, "val")) })
      ]));
    });
    tb.appendChild(el("tr", { class: "rs-choice jobs-total" }, [
      el("td", { "data-label": "Tier", class: "rs-c-tier", text: "All" }),
      el("th", { scope: "row", class: "rs-c-choice", text: items.length + " groups listed" }),
      el("td", { "data-label": "Fully free by", text: "" }),
      el("td", { "data-label": "Shares", text: shares(sum(items, "sh")) }),
      el("td", { "data-label": "Share of company", text: "~" + sum(items, "pct").toFixed(1).replace(/\.0$/, "") + "%" }),
      el("td", { "data-label": "Value at $97.17", text: "~" + usdB(sum(items, "val")) })
    ]));

    var body = document.getElementById("ipo-rows");
    body.textContent = "";
    items.forEach(function (c) {
      body.appendChild(el("tr", { class: "rs-choice" }, [
        el("td", { "data-label": "Tier", class: "rs-c-tier" }, [badge(c.tier)]),
        el("th", { scope: "row", class: "rs-c-choice" }, [c.name, el("span", { class: "rs-evidence", text: c.r.free_note })]),
        el("td", { "data-label": "Shares", text: (c.est ? "~" : "") + shares(c.sh) + (c.est ? " (estimate)" : "") }),
        el("td", { "data-label": "Share of company", text: "~" + c.pct + "%" }),
        el("td", { "data-label": "Value at $97.17", text: "~" + usdB(c.val) }),
        el("td", { "data-label": "Fully free by", text: c.r.free_by })
      ]));
    });
    if (rows[0] && rows[0].read) document.getElementById("rs-read").textContent = rows[0].read;
  }

  fetch(DATA_URL)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (text) { render(parseCSV(text)); })
    .catch(function (err) {
      document.getElementById("ipo-rows").innerHTML = '<tr><td colspan="6">Could not load the data file (' + String(err.message || err) + '). See <a href="' + DATA_URL + '">the CSV</a>.</td></tr>';
    });
})();
