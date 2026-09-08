/* =========================================================================
   assets/js/yeshuot.js — עמוד הברכות והישועות
   ========================================================================= */

(function () {
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---- ההבטחה ---- */
  function renderPromise() {
    var p = window.PROMISE, box = document.getElementById("promise");
    if (!p || !box) return;
    box.innerHTML =
      '<div class="promise-card">' +
        '<span class="pill">' + esc(p.source) + "</span>" +
        '<blockquote class="promise-quote">' + esc(p.quote) + "</blockquote>" +
        '<p class="promise-note">' + esc(p.quoteNote) + "</p>" +
        '<div class="witness">' +
          "<div><b>שני עדים</b><span>" + esc(p.witnesses) + "</span></div>" +
          '<p>' + esc(p.intro) + "</p>" +
        "</div>" +
        '<a class="btn" href="' + p.url + '" target="_blank" rel="noopener">לנוסח המלא בספריא ↗</a>' +
      "</div>" +
      '<div class="grid cols-4" style="margin-top:20px">' +
        p.conditions.map(function (c) {
          return '<div class="card cond"><span class="num">' + esc(c.n) + "</span>" +
                 "<h3>" + esc(c.t) + "</h3><p>" + esc(c.d) + "</p></div>";
        }).join("") +
      "</div>";
  }

  /* ---- עשרת המזמורים ---- */
  function renderPsalms() {
    var box = document.getElementById("psalms");
    if (!box) return;
    box.innerHTML = (window.TIKKUN_PSALMS || []).map(function (p) {
      return '<a class="psalm" href="https://www.sefaria.org/Psalms.' + p.n +
        '" target="_blank" rel="noopener">' +
        '<b>' + esc(p.he) + "</b>" +
        '<span class="pnum">מזמור ' + p.n + "</span>" +
        '<span class="popen">' + esc(p.open) + "</span></a>";
    }).join("");
  }

  /* ---- עדויות ---- */
  var state = { topic: "הכל" };

  function eduyotCard(e) {
    return (
      '<article class="eduya">' +
        '<span class="pill violet">' + esc(e.topic) + "</span>" +
        "<blockquote>" + esc(e.quote) + "</blockquote>" +
        (e.yiddish ? '<div class="yid">' + esc(e.yiddish) + "</div>" : "") +
        (e.note ? '<p class="enote">' + esc(e.note) + "</p>" : "") +
        '<a class="esrc" href="' + e.url + '" target="_blank" rel="noopener">' +
          esc(e.source) + " ↗</a>" +
      "</article>"
    );
  }

  function renderEduyot() {
    var box = document.getElementById("eduyot");
    if (!box) return;
    var list = (window.EDUYOT || []).filter(function (e) {
      return state.topic === "הכל" || e.topic === state.topic;
    });
    box.innerHTML = list.map(eduyotCard).join("");
    var c = document.getElementById("eduyot-count");
    if (c) c.textContent = list.length + " מתוך " + (window.EDUYOT || []).length + " מקורות";
  }

  function renderTopicChips() {
    var wrap = document.getElementById("topic-chips");
    if (!wrap) return;
    var topics = ["הכל"].concat(window.EDUYOT_TOPICS || []);
    wrap.innerHTML = "";
    topics.forEach(function (t) {
      var b = document.createElement("button");
      b.className = "chip" + (t === state.topic ? " on" : "");
      b.textContent = t;
      b.addEventListener("click", function () {
        state.topic = t;
        wrap.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        renderEduyot();
      });
      wrap.appendChild(b);
    });
  }

  /* ---- ציר הזמן ---- */
  function renderTimeline() {
    var box = document.getElementById("timeline");
    if (!box) return;
    box.innerHTML = (window.KIBBUTZ_TIMELINE || []).map(function (e) {
      return '<li class="tl-item"><span class="tl-year">' + esc(e.year) + "</span>" +
        "<h3>" + esc(e.t) + "</h3><p>" + esc(e.d) + "</p></li>";
    }).join("");
  }

  /* ---- סוגי ישועות ---- */
  function renderKinds() {
    var box = document.getElementById("kinds");
    if (!box) return;
    box.innerHTML = (window.YESHUOT_KINDS || []).map(function (k) {
      return '<div class="card"><div class="ico">' + k.icon + "</div>" +
        "<h3>" + esc(k.t) + "</h3><p>" + esc(k.d) + "</p>" +
        '<div class="ksrc">' + esc(k.src) + "</div></div>";
    }).join("");
  }

  /* ---- למעשה ---- */
  function renderPractice() {
    var box = document.getElementById("practice");
    if (!box) return;
    box.innerHTML = (window.YESHUOT_PRACTICE || []).map(function (s) {
      return '<li><b>' + s.n + ". " + esc(s.t) + "</b><span>" + esc(s.d) + "</span></li>";
    }).join("");
  }

  /* ---- מקורות ---- */
  function renderRefs() {
    var box = document.getElementById("refs");
    if (!box) return;
    box.innerHTML = (window.YESHUOT_REFS || []).map(function (r) {
      return '<li><a href="' + r.u + '" target="_blank" rel="noopener">' + esc(r.t) + " ↗</a></li>";
    }).join("");
  }

  /* ---- העדות שלך: נשמרת בדפדפן בלבד ---- */
  var KEY = "uman-eduyot-v1";

  function loadMine() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch (e) { return []; }
  }
  function saveMine(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }

  function renderMine() {
    var box = document.getElementById("my-list");
    if (!box) return;
    var list = loadMine();
    if (!list.length) {
      box.innerHTML = '<p class="empty-inline">עוד לא כתבת כאן כלום. מה שתכתוב נשמר רק בדפדפן שלך.</p>';
      return;
    }
    box.innerHTML = list.map(function (item, i) {
      return '<article class="mine"><div class="mine-head"><span>' + esc(item.date) + "</span>" +
        '<button class="mine-del" data-i="' + i + '" title="מחיקה">✕</button></div>' +
        "<p>" + esc(item.text) + "</p></article>";
    }).join("");
    box.querySelectorAll(".mine-del").forEach(function (b) {
      b.addEventListener("click", function () {
        var list = loadMine();
        list.splice(parseInt(b.dataset.i, 10), 1);
        saveMine(list);
        renderMine();
        toast("נמחק");
      });
    });
  }

  function initMine() {
    var form = document.getElementById("my-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ta = document.getElementById("my-text");
      var text = ta.value.trim();
      if (!text) return;
      var list = loadMine();
      list.unshift({ text: text, date: new Date().toLocaleDateString("he-IL") });
      saveMine(list);
      ta.value = "";
      renderMine();
      toast("נשמר בדפדפן שלך");
    });
    renderMine();
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderPromise();
    renderPsalms();
    renderTopicChips();
    renderEduyot();
    renderTimeline();
    renderKinds();
    renderPractice();
    renderRefs();
    initMine();
  });
})();
