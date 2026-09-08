/* =========================================================================
   assets/js/route.js — עמוד המסלולים
   ========================================================================= */

(function () {
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function stopHtml(s) {
    var kivrei = (s.kivrei || []).length
      ? '<div style="margin-top:6px"><span class="pill violet">ציונים</span> ' +
        esc(s.kivrei.join(" · ")) + "</div>"
      : "";
    return (
      "<li><strong>" + esc(s.city) + "</strong> · " + esc(s.country) +
      "<br>" + esc(s.note) + kivrei + "</li>"
    );
  }

  function legHtml(r, i) {
    return (
      '<article class="leg" id="' + esc(r.id) + '">' +
        '<div class="leg-head">' +
          '<span class="num">' + (i + 1) + "</span>" +
          "<h3>" + r.flag + " " + esc(r.name) + "</h3>" +
          '<span class="pill">' + esc(r.drive) + "</span>" +
          '<span class="arrow">▾</span>' +
        "</div>" +
        '<div class="leg-body">' +
          '<p style="color:var(--muted);margin:16px 0 0">' + esc(r.subtitle) + "</p>" +
          '<div class="kv">' +
            "<div><b>זמן נסיעה</b><span>" + esc(r.drive) + "</span></div>" +
            "<div><b>מעבר גבול</b><span>" + esc(r.border) + "</span></div>" +
            "<div><b>עומס</b><span>" + esc(r.load) + "</span></div>" +
            "<div><b>מתאים ל</b><span>" + esc(r.best) + "</span></div>" +
          "</div>" +
          "<h4>התחנות בדרך</h4>" +
          "<ul>" + (r.stops || []).map(stopHtml).join("") + "</ul>" +
          "<h4>טיפים למסלול</h4>" +
          "<ul>" + (r.tips || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" +
        "</div>" +
      "</article>"
    );
  }

  function renderRoutes() {
    var box = document.getElementById("routes");
    if (!box) return;
    box.innerHTML = (window.ROUTES || []).map(legHtml).join("");
    box.querySelectorAll(".leg-head").forEach(function (h) {
      h.addEventListener("click", function () { h.parentElement.classList.toggle("open"); });
    });
    var first = box.querySelector(".leg");
    if (first) first.classList.add("open");
  }

  function renderKivrei() {
    var body = document.getElementById("kivrei-body");
    if (!body) return;
    body.innerHTML = (window.UKRAINE_KIVREI || []).map(function (k) {
      return "<tr><td style='color:var(--text);font-weight:600'>" + esc(k.name) + "</td>" +
             "<td>" + esc(k.city) + "</td><td>" + esc(k.note) + "</td></tr>";
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderRoutes();
    renderKivrei();
    if (location.hash) {
      var el = document.querySelector(location.hash);
      if (el && el.classList.contains("leg")) {
        el.classList.add("open");
        el.scrollIntoView({ block: "center" });
      }
    }
  });
})();
