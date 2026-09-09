/* =========================================================================
   assets/js/feeds.js — חיבור שירות הפידים למעברי העמודים של האתר
   -------------------------------------------------------------------------
   ה-embed של השירות נכתב לאתרים שנטענים מחדש בכל עמוד. הוא סופר צפייה
   אחת בלבד לכל טעינת דף, ושומר את הבקשה במשתנה פנימי ("beacon אחד לכל
   טעינה"). באתר הזה המעבר בין עמודים אינו טעינה מחדש, ולכן בלי הקוד הזה
   היה נספר רק העמוד הראשון בכל ביקור — וגרוע מזה: כל שאר העמודים היו
   מציגים את מספר הצפיות של העמוד הראשון.

   הפתרון: אחרי כל מעבר מזריקים מחדש את תג הסקריפט. הוא עצמאי לחלוטין,
   מזהה את עצמו דרך document.currentScript, ונמנע מהזרקה כפולה של גיליון
   הסגנון — ולכן ריצה נוספת בטוחה, מאפסת את הספירה, וטוענת את הווידג׳טים
   של העמוד החדש.
   ========================================================================= */

(function () {
  var SELECTOR = 'script[data-site][src*="embed.js"]';

  function refreshFeeds() {
    var old = document.querySelector(SELECTOR);

    /* אין תג סקריפט (חסימת רשת, או שהשירות לא נטען) — לכל הפחות ננסה
       לטעון את הווידג׳טים דרך ה-API הציבורי, אם הוא בכלל קיים. */
    if (!old) {
      if (window.TellsEngage && typeof window.TellsEngage.mount === "function") {
        try { window.TellsEngage.mount(); } catch (e) {}
      }
      return;
    }

    var fresh = document.createElement("script");
    for (var i = 0; i < old.attributes.length; i++) {
      fresh.setAttribute(old.attributes[i].name, old.attributes[i].value);
    }

    old.parentNode.removeChild(old);
    document.body.appendChild(fresh);
  }

  window.refreshFeeds = refreshFeeds;
})();
