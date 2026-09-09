/* =========================================================================
   assets/js/router.js — מעבר רך בין עמודי האתר
   -------------------------------------------------------------------------
   במקום לטעון את העמוד מחדש, מביא את תוכן העמוד החדש ומחליף רק את
   <main id="app">. הכותרת, התפריט והנגן הצף נשארים חיים — ולכן המוזיקה
   לא נקטעת במעבר בין עמודים.
   אם משהו נכשל — נופלים בחזרה לניווט רגיל של הדפדפן.
   ========================================================================= */

(function () {
  if (!window.history || !window.history.pushState || !window.fetch) return;

  var cache = {};
  var busy = false;

  function samePage(href) {
    var a = document.createElement("a");
    a.href = href;
    return a.pathname === location.pathname;
  }

  function isInternal(a) {
    if (!a || !a.getAttribute) return false;
    var href = a.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#") return false;
    if (a.target && a.target !== "_self") return false;
    if (a.hasAttribute("download") || a.dataset.noRouter !== undefined) return false;
    if (a.origin !== location.origin) return false;
    return /\.html($|[?#])/.test(a.pathname) || a.pathname === "/" || a.pathname.slice(-1) === "/";
  }

  function parsePage(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var app = doc.getElementById("app");
    if (!app) return null;
    return {
      html: app.innerHTML,
      page: doc.body.getAttribute("data-page") || "",
      title: doc.title
    };
  }

  function fetchPage(url) {
    if (cache[url]) return Promise.resolve(cache[url]);
    return fetch(url, { credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (html) {
        var parsed = parsePage(html);
        if (!parsed) throw new Error("no #app");
        cache[url] = parsed;
        return parsed;
      });
  }

  function swap(parsed, hash) {
    var app = document.getElementById("app");
    app.innerHTML = parsed.html;
    document.body.setAttribute("data-page", parsed.page);
    document.title = parsed.title;
    window.bootPage();

    if (hash) {
      var el = document.querySelector(hash);
      if (el) { el.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
  }

  function go(url, hash, push) {
    if (busy) return;
    busy = true;
    document.documentElement.classList.add("nav-busy");

    fetchPage(url)
      .then(function (parsed) {
        if (push) history.pushState({ router: true }, "", url + (hash || ""));
        swap(parsed, hash);
      })
      .catch(function () {
        location.href = url + (hash || "");
      })
      .then(function () {
        busy = false;
        document.documentElement.classList.remove("nav-busy");
      });
  }

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var a = e.target.closest ? e.target.closest("a") : null;
    if (!isInternal(a)) return;

    var url = a.pathname + a.search;
    var hash = a.hash || "";

    e.preventDefault();

    /* אותו עמוד — רק גלילה לעוגן */
    if (samePage(a.href)) {
      if (hash) {
        var el = document.querySelector(hash);
        if (el) { history.pushState({ router: true }, "", url + hash); el.scrollIntoView(); }
      }
      return;
    }

    go(url, hash, true);
  });

  window.addEventListener("popstate", function () {
    go(location.pathname + location.search, location.hash, false);
  });

  /* טעינה מוקדמת ברקע בריחוף — המעבר מרגיש מיידי */
  document.addEventListener("mouseover", function (e) {
    var a = e.target.closest ? e.target.closest("a") : null;
    if (isInternal(a) && !samePage(a.href)) fetchPage(a.pathname + a.search).catch(function () {});
  });
})();
