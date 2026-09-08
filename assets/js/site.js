/* =========================================================================
   assets/js/site.js — קוד משותף לכל עמודי האתר
   ========================================================================= */

/* ---- הגדרות שאפשר לשנות ---- */
window.SITE_CONFIG = {
  /* מועד כניסת ראש השנה תשפ״ז באומן (שעון אוקראינה, UTC+3).
     לשנה הבאה — פשוט לעדכן את התאריך והכותרת כאן. */
  roshHashanah: "2026-09-11T18:30:00+03:00",
  roshHashanahLabel: "ראש השנה תשפ״ז באומן",
  roshHashanahHuman: "מוצאי יום שישי, כ״ט אלול (11.9.2026) עד צאת החג במוצאי שבת (13.9.2026)"
};

/* ---- סימון הלשונית הפעילה בתפריט ---- */
(function markActiveNav() {
  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.getAttribute("data-page");
    if (!page) return;
    document.querySelectorAll("nav.mainnav a[data-nav]").forEach(function (a) {
      if (a.getAttribute("data-nav") === page) a.classList.add("active");
    });
  });
})();

/* ---- ספירה לאחור ---- */
function initCountdown(elId) {
  var el = document.getElementById(elId);
  if (!el) return;
  var target = new Date(window.SITE_CONFIG.roshHashanah).getTime();

  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function render() {
    var diff = target - Date.now();
    if (diff <= 0) {
      el.innerHTML =
        '<div class="cd-box" style="min-width:auto;padding:16px 26px">' +
        '<b style="font-size:22px">בשעה טובה ומוצלחת</b>' +
        '<span>ראש השנה באומן כבר כאן — כתיבה וחתימה טובה</span></div>';
      return;
    }
    var s = Math.floor(diff / 1000);
    var d = Math.floor(s / 86400);
    var h = Math.floor((s % 86400) / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    el.innerHTML =
      box(d, "ימים") + box(pad(h), "שעות") + box(pad(m), "דקות") + box(pad(sec), "שניות");
  }

  function box(v, label) {
    return '<div class="cd-box"><b>' + v + "</b><span>" + label + "</span></div>";
  }

  render();
  setInterval(render, 1000);
}

/* ---- הודעה קופצת קטנה ---- */
function toast(msg) {
  var t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () { t.classList.remove("show"); }, 2200);
}

/* ---- שנה נוכחית בכותרת התחתונה ---- */
document.addEventListener("DOMContentLoaded", function () {
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
  var rh = document.querySelectorAll("[data-rh-human]");
  rh.forEach(function (n) { n.textContent = window.SITE_CONFIG.roshHashanahHuman; });
});
