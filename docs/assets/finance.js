// Finance page tabs: one tab per filing. Add a [tab id, panel id, hash] row for each new tab.
(function () {
  var tabs = [["tab-anthropic-s1", "panel-anthropic-s1", "#anthropic-s1"]];
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
      var step = e.key === "ArrowRight" ? 1 : tabs.length - 1;
      var next = tabs[(i + step) % tabs.length][0];
      select(next); document.getElementById(next).focus();
    });
  });
  function fromHash() {
    tabs.forEach(function (t) { if (location.hash === t[2]) select(t[0]); });
  }
  window.addEventListener("hashchange", fromHash);
  fromHash();
})();
