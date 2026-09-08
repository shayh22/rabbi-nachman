/* =========================================================================
   assets/js/checklist.js — צ׳ק ליסט עם שמירה מקומית בדפדפן
   ========================================================================= */

(function () {
  var KEY = "uman-checklist-v1";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  var state = load();

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function keyOf(gi, ii) { return gi + ":" + ii; }

  function updateProgress() {
    var total = 0, done = 0;
    (window.CHECKLIST || []).forEach(function (g, gi) {
      g.items.forEach(function (_, ii) {
        total++;
        if (state[keyOf(gi, ii)]) done++;
      });
    });
    var bar = document.getElementById("progress-bar");
    var label = document.getElementById("progress-label");
    if (bar) bar.style.width = (total ? (done / total) * 100 : 0) + "%";
    if (label) label.textContent = done + " מתוך " + total + " הושלמו";
  }

  function render() {
    var box = document.getElementById("checklist");
    if (!box) return;
    box.innerHTML = "";

    (window.CHECKLIST || []).forEach(function (g, gi) {
      var group = document.createElement("section");
      group.className = "check-group";
      group.innerHTML = "<h3><span>" + g.icon + "</span> " + esc(g.title) + "</h3>";

      g.items.forEach(function (item, ii) {
        var k = keyOf(gi, ii);
        var lab = document.createElement("label");
        lab.className = "check-item" + (state[k] ? " done" : "");
        lab.innerHTML =
          '<input type="checkbox"' + (state[k] ? " checked" : "") + ">" +
          '<span class="ci-label">' + esc(item.t) +
          (item.n ? '<span class="ci-note">' + esc(item.n) + "</span>" : "") +
          "</span>";
        lab.querySelector("input").addEventListener("change", function () {
          state[k] = this.checked;
          lab.classList.toggle("done", this.checked);
          save(state);
          updateProgress();
        });
        group.appendChild(lab);
      });

      box.appendChild(group);
    });

    updateProgress();
  }

  document.addEventListener("DOMContentLoaded", function () {
    render();
    var reset = document.getElementById("reset-checklist");
    if (reset) {
      reset.addEventListener("click", function () {
        if (!confirm("לאפס את כל הסימונים?")) return;
        state = {};
        save(state);
        render();
        toast("הרשימה אופסה");
      });
    }
  });
})();
