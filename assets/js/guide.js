/* =========================================================================
   assets/js/guide.js — מדריך הנוסע: פתיחה וסגירה של השאלות הנפוצות
   ========================================================================= */

(function () {
  function initGuide() {
    document.querySelectorAll("#faq-list .leg-head").forEach(function (h) {
      h.addEventListener("click", function () { h.parentElement.classList.toggle("open"); });
    });
  }

  window.PAGE_INIT = window.PAGE_INIT || {};
  window.PAGE_INIT.guide = initGuide;
})();
