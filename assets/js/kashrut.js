/* =========================================================================
   assets/js/kashrut.js — עמוד הכשרות באומן
   -------------------------------------------------------------------------
   בונה את רשימת העסקים שתחת השגחה, ואת רשימת המוצרים לפי נושאים.
   יש חיפוש חי: מקלידים מילה — נשארים רק הנושאים והשורות שמכילים אותה,
   והנושא נפתח מעצמו כדי שרואים את השורה בלי עוד לחיצה.
   ========================================================================= */

(function () {
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---------- העסקים שתחת השגחה ---------- */

  function placeHtml(p) {
    var by = p.by ? '<span class="ksr-by">' + esc(p.by) + "</span>" : "";
    var en = p.en ? ' <span class="ksr-en">' + esc(p.en) + "</span>" : "";
    var note = p.note ? ' <span class="pill">' + esc(p.note) + "</span>" : "";
    return '<li><strong>' + esc(p.name) + "</strong>" + en + note + by + "</li>";
  }

  function renderPlaces() {
    var box = document.getElementById("kashrut-places");
    if (!box) return;
    box.innerHTML = (window.KASHRUT_PLACES || []).map(function (g) {
      return (
        '<div class="card ksr-group">' +
          "<h3>" + g.icon + " " + esc(g.group) +
            ' <span class="ksr-count">' + g.items.length + "</span></h3>" +
          '<ul class="ksr-list">' + g.items.map(placeHtml).join("") + "</ul>" +
        "</div>"
      );
    }).join("");
  }

  /* ---------- הנושאים ---------- */

  var KIND = {
    allow: { cls: "ok", label: "מותר בשימוש", mark: "✓" },
    deny: { cls: "no", label: "אסור בשימוש", mark: "✕" },
    check: { cls: "check", label: "טעון בדיקה", mark: "◆" }
  };

  function blockHtml(b) {
    if (b.kind === "text") {
      return '<p class="ksr-p">' + esc(b.text) + "</p>";
    }
    if (b.kind === "note") {
      return '<div class="note" style="margin:14px 0">' + esc(b.text) + "</div>";
    }
    var k = KIND[b.kind];
    if (!k) return "";
    var title = b.title ? esc(b.title) : k.label;
    return (
      '<div class="ksr-block ' + k.cls + '">' +
        '<div class="ksr-block-head"><span class="ksr-mark">' + k.mark + "</span>" +
          "<b>" + title + "</b>" +
          '<span class="ksr-tag">' + k.label + "</span></div>" +
        "<ul>" + (b.items || []).map(function (it) {
          return '<li data-row>' + esc(it) + "</li>";
        }).join("") + "</ul>" +
      "</div>"
    );
  }

  function sectionHtml(s) {
    return (
      '<div class="ksr-section">' +
        "<h4>" + esc(s.h) + "</h4>" +
        (s.blocks || []).map(blockHtml).join("") +
      "</div>"
    );
  }

  function topicHtml(t, i) {
    return (
      '<article class="leg ksr-topic" id="' + esc(t.id) + '" data-tags="' +
          esc((t.tags || []).join(" ")) + '">' +
        '<div class="leg-head">' +
          '<span class="num">' + t.icon + "</span>" +
          "<h3>" + esc(t.title) + "</h3>" +
          '<span class="arrow">▾</span>' +
        "</div>" +
        '<div class="leg-body">' +
          (t.sections || []).map(sectionHtml).join("") +
        "</div>" +
      "</article>"
    );
  }

  function renderTopics() {
    var box = document.getElementById("kashrut-topics");
    if (!box) return;
    box.innerHTML = (window.KASHRUT_TOPICS || []).map(topicHtml).join("");
    box.querySelectorAll(".leg-head").forEach(function (h) {
      h.addEventListener("click", function () { h.parentElement.classList.toggle("open"); });
    });
  }

  /* ---------- חיפוש וסינון ---------- */

  /* textContent מדביק זה לזה טקסטים של אלמנטים שכנים ויוצר "מילים" מדומות,
     ולכן אוספים את קטעי הטקסט ומחברים אותם ברווח. התוצאה נשמרת על האלמנט,
     כי התוכן אינו משתנה אחרי הרינדור. */
  function textOf(el) {
    if (el.__ksrText != null) return el.__ksrText;
    var parts = [];
    var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walk.nextNode())) parts.push(n.nodeValue);
    el.__ksrText = parts.join(" ").replace(/\s+/g, " ").toLowerCase();
    return el.__ksrText;
  }

  /* חיפוש לפי תחילת מילה. חיפוש תת־מחרוזת רגיל היה מוצא "תות" בתוך
     "לשתות", ולכן דורשים שהמילה תתחיל בביטוי — לכל היותר אחרי אות
     שימוש אחת (בכל"ם, ו', ה', ש', ד'). */
  var WORD = /[\u0590-\u05FFa-z0-9]/;
  var PREFIX = "והלבכמשד";

  function matches(text, q) {
    var i = text.indexOf(q);
    while (i !== -1) {
      if (i === 0 || !WORD.test(text.charAt(i - 1))) return true;
      var before = text.charAt(i - 1);
      if (PREFIX.indexOf(before) !== -1 &&
          (i === 1 || !WORD.test(text.charAt(i - 2)))) return true;
      i = text.indexOf(q, i + 1);
    }
    return false;
  }

  function applyFilter(q, tag) {
    var box = document.getElementById("kashrut-topics");
    if (!box) return;
    q = (q || "").replace(/\s+/g, " ").trim().toLowerCase();

    var shown = 0;
    box.querySelectorAll(".ksr-topic").forEach(function (t) {
      var tags = t.getAttribute("data-tags") || "";
      if (tag && tags.indexOf(tag) === -1) { t.hidden = true; return; }

      /* בלי חיפוש — הכול גלוי והנושאים סגורים */
      if (!q) {
        t.hidden = false;
        t.classList.remove("open");
        t.querySelectorAll(".ksr-section, [data-row]").forEach(function (r) { r.hidden = false; });
        shown++;
        return;
      }

      /* התאמה בכותרת הנושא — מציגים את הנושא כולו */
      if (matches(textOf(t.querySelector(".leg-head")), q)) {
        t.hidden = false;
        t.classList.add("open");
        t.querySelectorAll(".ksr-section, [data-row]").forEach(function (r) { r.hidden = false; });
        shown++;
        return;
      }

      var hit = false;
      t.querySelectorAll(".ksr-section").forEach(function (sec) {
        if (!matches(textOf(sec), q)) { sec.hidden = true; return; }
        sec.hidden = false;
        hit = true;

        /* אם ההתאמה היא בכותרת הסעיף — כל הסעיף רלוונטי */
        var head = sec.querySelector("h4");
        var wholeSection = head && matches(textOf(head), q);

        sec.querySelectorAll("[data-row]").forEach(function (r) {
          if (wholeSection) { r.hidden = false; return; }
          r.hidden = !matches(textOf(r), q) && !blockHeadHit(r, q);
        });
      });

      t.hidden = !hit;
      t.classList.toggle("open", hit);
      if (hit) shown++;
    });

    var empty = document.getElementById("kashrut-empty");
    if (empty) empty.hidden = shown > 0;
  }

  /* שורה נשארת גם כשההתאמה היא בכותרת הבלוק שמעליה */
  function blockHeadHit(row, q) {
    var block = row.closest ? row.closest(".ksr-block") : null;
    var head = block && block.querySelector(".ksr-block-head");
    return !!head && matches(textOf(head), q);
  }

  function initFilters() {
    var input = document.getElementById("kashrut-search");
    var chips = document.querySelectorAll("#kashrut-chips .chip");
    var tag = "";

    function run() { applyFilter(input ? input.value : "", tag); }

    if (input) input.addEventListener("input", run);

    chips.forEach(function (c) {
      c.addEventListener("click", function (e) {
        e.preventDefault();
        var v = c.getAttribute("data-tag") || "";
        tag = (tag === v) ? "" : v;
        chips.forEach(function (o) {
          o.classList.toggle("on", o.getAttribute("data-tag") === tag && tag !== "");
        });
        run();
      });
    });
  }

  /* ---------- אזהרת רבינו ופרטי הוועד ---------- */

  function renderQuote() {
    var q = window.KASHRUT_QUOTE;
    if (!q) return;
    var a = document.getElementById("ksr-quote-intro");
    var b = document.getElementById("ksr-quote-text");
    var c = document.getElementById("ksr-quote-src");
    if (a) a.textContent = q.intro;
    if (b) b.textContent = q.text;
    if (c) c.textContent = q.source;
  }

  function renderVaad() {
    var m = window.KASHRUT_META;
    if (!m) return;
    var name = document.getElementById("ksr-vaad-name");
    var sub = document.getElementById("ksr-vaad-sub");
    var box = document.getElementById("ksr-contact");
    if (name) name.textContent = m.vaad + " " + m.under;
    if (sub) sub.textContent = m.rav + " · " + m.updated;
    if (box) {
      box.innerHTML =
        '<a href="tel:' + esc(m.phone.replace(/[^+\d]/g, "")) + '">📞 ' + esc(m.phone) + "</a>" +
        '<a href="mailto:' + esc(m.email) + '">✉️ ' + esc(m.email) + "</a>";
    }
  }

  function initKashrut() {
    renderQuote();
    renderPlaces();
    renderTopics();
    renderVaad();
    initFilters();
  }

  window.PAGE_INIT = window.PAGE_INIT || {};
  window.PAGE_INIT.kashrut = initKashrut;
})();
