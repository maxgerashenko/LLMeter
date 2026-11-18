// Cloud > Rack: sortable table of datacenter racks, built from data/cloud-racks-*.csv
(function () {
  "use strict";
  var URL_ = "data/cloud-racks-2026-11-18.csv";
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
  function n(v) { return v === "" || isNaN(+v) ? null : +v; }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) { if (k === "text") e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function fmt(v) { return v.toLocaleString("en-US"); }
  function fmtTok(v) { return v >= 1000 ? (v / 1000).toFixed(v >= 100000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(v); }
  function fmtPrice(v) { return v >= 1e6 ? "$" + (v / 1e6).toFixed(2).replace(/0$/, "").replace(/\.0$/, "") + "M" : "$" + Math.round(v / 1000) + "k"; }

  var rows = [], sortKey = "memory_gb", dir = -1;
  var tbody = document.getElementById("cr-rows");

  function cmp(a, b) {
    var x = a[sortKey], y = b[sortKey];
    if (x == null && y == null) return 0;
    if (x == null) return 1;   // rows without a value always last
    if (y == null) return -1;
    if (typeof x === "string") return dir * x.localeCompare(y);
    return dir * (x - y);
  }
  function render() {
    [].forEach.call(document.querySelectorAll("th.sortable"), function (th) {
      th.setAttribute("aria-sort", th.getAttribute("data-key") === sortKey ? (dir > 0 ? "ascending" : "descending") : "none");
    });
    tbody.textContent = "";
    rows.slice().sort(cmp).forEach(function (r) {
      var est = function (s) { return s === "estimate" ? " est." : ""; };
      var fits = r.tok_s_status !== "no_fit";
      var tr = el("tr", { class: "cr-main" }, [
        el("th", { scope: "row", class: "cr-name" }, [r.name, el("span", { class: "cr-vendor", text: r.gpus + " GPUs · " + r.vendor })]),
        el("td", { class: "num", text: fmt(r.memory_gb) }),
        el("td", { class: "num", text: String(r.bandwidth_tbs) }),
        fits ? el("td", { class: "num est" }, [fmt(r.agents_low) + "–" + fmt(r.agents_high) + " est."])
             : el("td", { class: "num" }, [el("span", { class: "cr-nofit", text: "doesn't fit" })]),
        fits ? el("td", { class: "num" + (r.tok_s_status === "estimate" ? " est" : "") }, [fmtTok(r.tok_s) + est(r.tok_s_status)])
             : el("td", { class: "num" }, [el("span", { class: "cr-nofit", text: "doesn't fit" })]),
        r.price_usd == null ? el("td", { class: "num" }, [el("span", { class: "cr-nofit", text: "no public price" })])
          : el("td", { class: "num" + (r.price_status === "estimate" ? " est" : "") }, [(r.price_status === "estimate" ? "≈" : "") + fmtPrice(r.price_usd) + est(r.price_status)])
      ]);
      tbody.appendChild(tr);
    });
    var list = document.getElementById("cr-basis-list");
    list.textContent = "";
    rows.slice().sort(cmp).forEach(function (r) {
      var kids = [el("strong", { text: r.name }), el("br"), "Tokens/sec: " + r.tok_s_basis + ". Agents: " + r.agents_basis + ". Price: " + r.price_note + ". Sources: "];
      var seen = {};
      [["memory", r.memory_source], ["bandwidth", r.bandwidth_source], ["price", r.price_source]].forEach(function (l) { if (l[1] && !seen[l[1]]) { seen[l[1]] = 1; kids.push(el("a", { href: l[1], text: l[0] }), " "); } });
      list.appendChild(el("li", {}, kids));
    });
  }
  [].forEach.call(document.querySelectorAll("th.sortable"), function (th) {
    th.querySelector("button").addEventListener("click", function () {
      var k = th.getAttribute("data-key");
      if (k === sortKey) dir = -dir; else { sortKey = k; dir = k === "name" ? 1 : -1; }
      render();
    });
  });
  fetch(URL_).then(function (r) { return r.text(); }).then(function (t) {
    rows = parseCSV(t).map(function (r) {
      ["gpus", "memory_gb", "bandwidth_tbs", "agents_low", "agents_high", "tok_s", "price_usd"].forEach(function (k) { r[k] = n(r[k]); });
      return r;
    });
    document.getElementById("cr-basis").innerHTML =
      "<p><strong>How the figures are made.</strong> <em>Tokens/sec</em> is total decode throughput on DeepSeek-R1 (FP8, 8k in / 1k out) at 65 tokens/sec per user. GB200 NVL72 and H200 are measured (InferenceX data); the rest are scaled from H200 by HBM bandwidth. <em>Coding agents</em> is the number of concurrent 128k-token sessions: memory left after the 671 GB of weights divided by 40 GB (low) or 9 GB (high) of KV cache per agent, capped at tokens/sec divided by 65. The range reflects the KV cache size of the model, not a measurement. Memory and bandwidth are vendor specs summed over GPUs.</p>";
    render();
  }).catch(function () { tbody.innerHTML = '<tr><td colspan="6" class="muted">Could not load data.</td></tr>'; });
})();
