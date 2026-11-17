// Source graph page: reads data/source-graph.json and draws it with Cytoscape.js.
// Level = shortest distance from the root (the LLMeter website, level 0).
(function () {
  "use strict";

  var DEFAULT_DEPTH = 3;
  var COL = 250, ROW = 58, NODE_W = 184, NODE_H = 46, PAD = 16, MIN_ZOOM = 0.72;
  var scroller = document.getElementById("graph-scroll");
  var depthSelect = document.getElementById("depth");
  var summary = document.getElementById("graph-summary");
  var details = document.getElementById("details");
  var cy = null;
  var graph = null;

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function safeUrl(u) {
    return /^https:\/\//.test(u || "") ? u : "";
  }

  function linkify(text) {
    return esc(text).replace(/https:\/\/[^\s<]+[^\s<.,;)]/g, function (u) {
      return "<a href=\"" + u + "\" target=\"_blank\" rel=\"noopener\">" + u.replace(/^https:\/\//, "") + "</a>";
    });
  }

  function shortLabel(t) {
    return t.length > 60 ? t.slice(0, 57) + "…" : t;
  }

  function statusClass(n) {
    if (n.status === "expanded") return "expanded";
    if (n.status.indexOf("primary") === 0) return "primary";
    return "stopped";
  }

  function computeLevels(data) {
    var out = {};
    data.edges.forEach(function (e) { (out[e.from] = out[e.from] || []).push(e.to); });
    var level = {};
    level[data.root] = 0;
    var queue = [data.root];
    while (queue.length) {
      var cur = queue.shift();
      (out[cur] || []).forEach(function (to) {
        if (!(to in level)) { level[to] = level[cur] + 1; queue.push(to); }
      });
    }
    return level;
  }

  function prepare(data) {
    var level = computeLevels(data);
    var byId = {};
    data.nodes.forEach(function (n) { n.level = level[n.id]; byId[n.id] = n; });
    var citedBy = {}, cites = {};
    data.edges.forEach(function (e) {
      (citedBy[e.to] = citedBy[e.to] || []).push(e);
      (cites[e.from] = cites[e.from] || []).push(e);
    });
    return { data: data, byId: byId, citedBy: citedBy, cites: cites };
  }

  function style() {
    return [
      { selector: "node", style: {
        "label": "data(label)", "font-family": "Inter, system-ui, sans-serif", "font-size": 11,
        "color": css("--text"), "text-wrap": "wrap", "text-max-width": NODE_W - 16,
        "text-valign": "center", "text-halign": "center",
        "shape": "round-rectangle", "width": NODE_W, "height": NODE_H, "padding": 0,
        "background-color": css("--g-stopped"), "border-width": 1, "border-color": css("--g-stopped-line"),
        "border-style": "dashed"
      } },
      { selector: "node.expanded", style: { "background-color": css("--g-expanded"), "border-color": css("--g-expanded-line"), "border-style": "solid" } },
      { selector: "node.primary", style: { "background-color": css("--g-primary"), "border-color": css("--g-primary-line"), "border-style": "solid" } },
      { selector: "node.l1", style: { "background-color": css("--g-l1"), "border-color": css("--g-l1"), "border-style": "solid", "color": "#fff", "font-weight": 600, "font-size": 12 } },
      { selector: "node.root", style: { "background-color": css("--g-root"), "border-color": css("--g-root"), "border-style": "solid", "color": css("--surface"), "font-weight": 700, "font-size": 13 } },
      { selector: "edge", style: {
        "width": 1.2, "line-color": css("--g-edge"), "curve-style": "bezier",
        "target-arrow-shape": "triangle", "target-arrow-color": css("--g-edge"), "arrow-scale": 0.8
      } },
      { selector: ".faded", style: { "opacity": 0.18 } },
      { selector: "node:selected", style: { "border-width": 3, "border-color": css("--g-select"), "border-style": "solid" } },
      { selector: "edge.hl", style: { "line-color": css("--accent"), "target-arrow-color": css("--accent"), "width": 2, "opacity": 1 } }
    ];
  }

  function render(depth) {
    var g = graph;
    var nodes = g.data.nodes.filter(function (n) { return n.level <= depth; });
    var keep = {};
    nodes.forEach(function (n) { keep[n.id] = true; });
    var edges = g.data.edges.filter(function (e) { return keep[e.from] && keep[e.to]; });
    var deeper = g.data.nodes.length - nodes.length;

    summary.textContent = nodes.length + " sources and " + edges.length + " links, levels 0 to " + depth +
      (deeper ? ". " + deeper + " deeper sources are hidden; pick more levels to see them." : ".");

    var pos = layout(nodes, edges);
    var els = nodes.map(function (n) {
      var cls = [statusClass(n)];
      if (n.level === 0) cls.push("root");
      if (n.level === 1) cls.push("l1");
      return { data: { id: n.id, label: shortLabel(n.title), level: n.level }, classes: cls.join(" "), position: pos.at[n.id] };
    }).concat(edges.map(function (e, i) {
      return { data: { id: "e" + i, source: e.from, target: e.to } };
    }));

    // Size the canvas to the graph so labels stay readable; the wrapper scrolls if it is wider than the screen.
    var avail = scroller.clientWidth;
    var zoom = Math.min(1, Math.max(MIN_ZOOM, (avail - 2 * PAD) / pos.width));
    var box = document.getElementById("cy");
    box.style.width = Math.max(avail, Math.ceil(pos.width * zoom + 2 * PAD)) + "px";
    box.style.height = Math.ceil(pos.height * zoom + 2 * PAD) + "px";

    if (cy) cy.destroy();
    cy = cytoscape({
      container: box,
      elements: els,
      style: style(),
      layout: { name: "preset" },
      userZoomingEnabled: false,
      userPanningEnabled: false,
      boxSelectionEnabled: false,
      autoungrabify: true
    });
    cy.zoom(zoom);
    cy.pan({ x: PAD + (parseFloat(box.style.width) - 2 * PAD - pos.width * zoom) / 2 + NODE_W / 2 * zoom, y: PAD + NODE_H / 2 * zoom });
    cy.on("tap", "node", function (evt) { select(evt.target.id()); });
    cy.on("tap", function (evt) { if (evt.target === cy) clearSelection(); });
    // Start with the website (level 0) in view.
    var r = cy.getElementById(g.data.root).renderedPosition();
    scroller.scrollTop = Math.max(0, r.y - scroller.clientHeight / 2);
    scroller.scrollLeft = 0;
  }

  // Levels run left to right. Each node sits near the average height of the nodes it is linked to
  // in the neighbouring column, so a source's citations line up beside it.
  function layout(nodes, edges) {
    var cols = {}, maxLevel = 0;
    nodes.forEach(function (n) { (cols[n.level] = cols[n.level] || []).push(n.id); maxLevel = Math.max(maxLevel, n.level); });
    var parents = {}, children = {};
    edges.forEach(function (e) {
      var a = graph.byId[e.from], b = graph.byId[e.to];
      if (b.level === a.level + 1) {
        (parents[e.to] = parents[e.to] || []).push(e.from);
        (children[e.from] = children[e.from] || []).push(e.to);
      }
    });
    var y = {};
    function mean(ids) {
      var v = ids.filter(function (i) { return i in y; }).map(function (i) { return y[i]; });
      return v.length ? v.reduce(function (s, x) { return s + x; }, 0) / v.length : null;
    }
    function settle(ids, desired) {
      ids.sort(function (a, b) { return desired[a] - desired[b]; });
      var last = -Infinity;
      ids.forEach(function (id) { y[id] = Math.max(desired[id], last + ROW); last = y[id]; });
    }
    // Order of level 1 follows the root's list; give it provisional rows.
    var order = {};
    (cols[1] || []).forEach(function (id, i) { order[id] = i; });
    // Widest column first (usually level 2): grouped by parent, evenly spaced.
    var wide = 1;
    for (var l = 1; l <= maxLevel; l++) if ((cols[l] || []).length > (cols[wide] || []).length) wide = l;
    if (wide === 1) {
      cols[1].forEach(function (id, i) { y[id] = i * ROW; });
    } else {
      (cols[1] || []).forEach(function (id, i) { y[id] = i; });
      for (var w = 2; w <= wide; w++) {
        var d = {};
        cols[w].forEach(function (id, i) { var m = mean(parents[id] || []); d[id] = m == null ? 1e6 + i : m * 1000 + i; });
        var sorted = cols[w].slice().sort(function (a, b) { return d[a] - d[b]; });
        if (w === wide) sorted.forEach(function (id, i) { y[id] = i * ROW; });
        else sorted.forEach(function (id, i) { y[id] = i; });
      }
      // Walk back up from the widest column, centring each node on its children.
      for (var u = wide - 1; u >= 1; u--) {
        var du = {};
        cols[u].forEach(function (id, i) { var m = mean(children[id] || []); du[id] = m == null ? i * ROW : m; });
        settle(cols[u], du);
      }
    }
    y[graph.data.root] = mean(cols[1] || []) || 0;
    for (var k = wide + 1; k <= maxLevel; k++) {
      var dk = {};
      cols[k].forEach(function (id, i) { var m = mean(parents[id] || []); dk[id] = m == null ? i * ROW : m; });
      settle(cols[k], dk);
    }
    var minY = Infinity, maxY = -Infinity;
    Object.keys(y).forEach(function (id) { minY = Math.min(minY, y[id]); maxY = Math.max(maxY, y[id]); });
    var at = {};
    nodes.forEach(function (n) { at[n.id] = { x: n.level * COL, y: y[n.id] - minY }; });
    return { at: at, width: maxLevel * COL + NODE_W, height: maxY - minY + NODE_H };
  }

  function clearSelection() {
    if (!cy) return;
    cy.elements().removeClass("faded hl");
    cy.$(":selected").unselect();
  }

  function select(id) {
    var n = graph.byId[id];
    if (!n) return;
    if (cy && cy.getElementById(id).length) {
      var el = cy.getElementById(id);
      var hood = el.closedNeighborhood();
      var p = el.renderedPosition();
      scroller.scrollTo({ left: Math.max(0, p.x - scroller.clientWidth / 2), top: Math.max(0, p.y - scroller.clientHeight / 2), behavior: "smooth" });
      cy.elements().addClass("faded");
      hood.removeClass("faded");
      el.connectedEdges().addClass("hl");
      cy.$(":selected").unselect();
      el.select();
    }
    showDetails(n);
  }

  function chips(list, key) {
    if (!list || !list.length) return "<span class=\"muted\">none</span>";
    return "<span class=\"chip-row\">" + list.map(function (e) {
      var other = graph.byId[e[key]];
      return "<button type=\"button\" class=\"chip\" data-id=\"" + esc(other.id) + "\" title=\"" + esc(e.relation) + "\">" +
        esc(shortLabel(other.title)) + " · L" + other.level + "</button>";
    }).join("") + "</span>";
  }

  function showDetails(n) {
    var url = safeUrl(n.url);
    var html = "<h3>" + esc(n.title) + "</h3>" +
      "<dl>" +
      (n.publisher ? "<dt>Publisher</dt><dd>" + esc(n.publisher) + "</dd>" : "") +
      "<dt>Level</dt><dd>" + n.level + "</dd>" +
      "<dt>Read</dt><dd>" + (n.read ? esc(n.read) : "not opened; described by the source that cites it") + "</dd>" +
      "<dt>Status</dt><dd>" + esc(n.status) + "</dd>" +
      (n.note ? "<dt>Note</dt><dd>" + linkify(n.note) + "</dd>" : "") +
      "<dt>Cited by</dt><dd>" + chips(graph.citedBy[n.id], "from") + "</dd>" +
      "<dt>Cites</dt><dd>" + chips(graph.cites[n.id], "to") + "</dd>" +
      "</dl>" +
      (url ? "<a class=\"open-link\" href=\"" + esc(url) + "\" target=\"_blank\" rel=\"noopener\">Open source ↗</a>" :
        "<p class=\"muted\" style=\"margin-top:10px\">No link: the citing source names it without one.</p>");
    details.innerHTML = html;
  }

  details.addEventListener("click", function (evt) {
    var b = evt.target.closest(".chip");
    if (!b) return;
    var id = b.getAttribute("data-id");
    var lv = graph.byId[id].level;
    if (lv > Number(depthSelect.value)) { depthSelect.value = String(lv); render(lv); }
    select(id);
  });

  function renderSourceList() {
    var list = document.getElementById("source-list");
    var l1 = (graph.cites[graph.data.root] || []).map(function (e) { return graph.byId[e.to]; });
    list.innerHTML = l1.map(function (n) {
      var url = safeUrl(n.url);
      var title = url ? "<a class=\"src-title\" href=\"" + esc(url) + "\" target=\"_blank\" rel=\"noopener\">" + esc(n.title) + "</a>" : esc(n.title);
      return "<li>" + title +
        "<span class=\"src-meta\">" + esc(n.publisher) + (n.read ? " · read " + esc(n.read) : "") + "</span>" +
        (n.note ? "<span class=\"src-note\">" + linkify(n.note) + "</span>" : "") +
        " <button type=\"button\" class=\"chip\" data-show=\"" + esc(n.id) + "\">Show in graph</button></li>";
    }).join("");
    list.addEventListener("click", function (evt) {
      var b = evt.target.closest("[data-show]");
      if (!b) return;
      select(b.getAttribute("data-show"));
      document.getElementById("graph").scrollIntoView({ behavior: "smooth" });
    });
  }

    depthSelect.addEventListener("change", function () { render(Number(depthSelect.value)); });

  var resizeTimer = null;
  var lastWidth = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (graph && scroller.clientWidth !== lastWidth) { lastWidth = scroller.clientWidth; render(Number(depthSelect.value)); }
    }, 200);
  });

  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onTheme = function () { if (cy) cy.style(style()); };
    if (mq.addEventListener) mq.addEventListener("change", onTheme);
  }

  fetch("data/source-graph.json")
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (data) {
      graph = prepare(data);
      depthSelect.value = String(DEFAULT_DEPTH);
      renderSourceList();
      if (typeof cytoscape === "undefined") throw new Error("graph library did not load");
      render(DEFAULT_DEPTH);
    })
    .catch(function (err) {
      summary.textContent = "Could not load the graph (" + err.message + "). The data is in data/source-graph.json.";
    });
})();
