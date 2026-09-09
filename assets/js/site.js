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

/* ---- ספירה לאחור ---- */
var _cdTimer = null;

function initCountdown(elId) {
  var el = document.getElementById(elId || "countdown");
  clearInterval(_cdTimer);
  if (!el) return;
  var target = new Date(window.SITE_CONFIG.roshHashanah).getTime();

  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function box(v, label) {
    return '<div class="cd-box"><b>' + v + "</b><span>" + label + "</span></div>";
  }

  function render() {
    if (!document.body.contains(el)) { clearInterval(_cdTimer); return; }
    var diff = target - Date.now();
    if (diff <= 0) {
      el.innerHTML =
        '<div class="cd-box" style="min-width:auto;padding:16px 26px">' +
        '<b style="font-size:22px">בשעה טובה ומוצלחת</b>' +
        '<span>ראש השנה באומן כבר כאן — כתיבה וחתימה טובה</span></div>';
      return;
    }
    var s = Math.floor(diff / 1000);
    el.innerHTML =
      box(Math.floor(s / 86400), "ימים") +
      box(pad(Math.floor((s % 86400) / 3600)), "שעות") +
      box(pad(Math.floor((s % 3600) / 60)), "דקות") +
      box(pad(s % 60), "שניות");
  }

  render();
  _cdTimer = setInterval(render, 1000);
}

/* ---- הפעלת העמוד הנוכחי ----
   נקרא בטעינה רגילה, וגם אחרי כל מעבר עמוד רך של הראוטר. */
function bootPage() {
  var page = document.body.getAttribute("data-page");

  document.querySelectorAll("nav.mainnav a[data-nav]").forEach(function (a) {
    a.classList.toggle("active", a.getAttribute("data-nav") === page);
  });

  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  document.querySelectorAll("[data-rh-human]").forEach(function (n) {
    n.textContent = window.SITE_CONFIG.roshHashanahHuman;
  });

  initCountdown("countdown");

  var init = (window.PAGE_INIT || {})[page];
  if (typeof init === "function") {
    try { init(); }
    catch (e) { if (window.console) console.error("שגיאה בהפעלת העמוד " + page, e); }
  }

  /* הנגן יושב מחוץ לתוכן העמוד — כאן הוא מתחבר למסגרת של העמוד החדש */
  if (window.MiniPlayer) window.MiniPlayer.mount();
}

window.bootPage = bootPage;
document.addEventListener("DOMContentLoaded", bootPage);
