/* =========================================================================
   assets/js/add.js — כלי עזר להוספת שירים
   מקבל קישורי יוטיוב ומייצר את הקוד המוכן להדבקה בקובץ data/songs.js
   ========================================================================= */

(function () {
  /* מזהה סרטון מכל צורות הקישור הנפוצות של יוטיוב */
  function extractId(url) {
    url = (url || "").trim();
    if (!url) return null;
    if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
    var patterns = [
      /[?&]v=([A-Za-z0-9_-]{11})/,
      /youtu\.be\/([A-Za-z0-9_-]{11})/,
      /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
      /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
      /youtube\.com\/live\/([A-Za-z0-9_-]{11})/
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = url.match(patterns[i]);
      if (m) return m[1];
    }
    return null;
  }

  function q(id) { return document.getElementById(id); }

  function jsStr(s) {
    return '"' + String(s || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n") + '"';
  }

  function build() {
    var raw = q("links").value.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
    var cat = q("cat").value;
    var artist = q("artist").value.trim();
    var titles = q("titles").value.split(/\n+/).map(function (l) { return l.trim(); });

    var out = [], bad = [], preview = [];

    raw.forEach(function (line, i) {
      var id = extractId(line);
      if (!id) { bad.push(line); return; }
      var title = titles[i] || "";
      out.push(
        "  {\n" +
        "    id: " + jsStr(id) + ",\n" +
        "    title: " + jsStr(title || "שיר חדש — לעדכן שם") + ",\n" +
        "    category: " + jsStr(cat) + ",\n" +
        "    artist: " + jsStr(artist) + ",\n" +
        "    year: \"\",\n" +
        "    words: \"\",\n" +
        "    lyrics: \"\",\n" +
        "    featured: " + (i < 3 ? "true" : "false") + "\n" +
        "  }"
      );
      preview.push({ id: id, title: title || "(ללא שם)" });
    });

    q("output").textContent = out.length ? out.join(",\n") + "," : "// לא זוהו קישורים תקינים";

    var warn = q("warn");
    warn.innerHTML = bad.length
      ? '<div class="note warn">לא הצלחתי לזהות מזהה סרטון בשורות הבאות:<br>' +
        bad.map(function (b) { return "<code>" + b.replace(/</g, "&lt;") + "</code>"; }).join("<br>") + "</div>"
      : "";

    var prev = q("preview");
    prev.innerHTML = preview.map(function (p) {
      return '<div class="song"><div class="thumb"><img src="https://i.ytimg.com/vi/' + p.id +
        '/hqdefault.jpg" alt=""></div><div class="song-body"><h3>' +
        p.title.replace(/</g, "&lt;") + '</h3><div class="song-meta"><code>' + p.id + "</code></div></div></div>";
    }).join("");
  }

  function initAdd() {
    var cat = q("cat");
    if (!cat) return;
    cat.innerHTML = "";
    (window.SONG_CATEGORIES || []).forEach(function (c) {
      var o = document.createElement("option");
      o.value = c; o.textContent = c;
      cat.appendChild(o);
    });

    q("build").addEventListener("click", build);
    q("links").addEventListener("input", build);
    q("titles").addEventListener("input", build);
    q("artist").addEventListener("input", build);
    cat.addEventListener("change", build);

    q("copy").addEventListener("click", function () {
      navigator.clipboard.writeText(q("output").textContent).then(
        function () { toast("הקוד הועתק — להדביק בתוך data/songs.js"); },
        function () { toast("לא הצלחתי להעתיק — סמן ידנית"); }
      );
    });
  }

  window.PAGE_INIT = window.PAGE_INIT || {};
  window.PAGE_INIT.add = initAdd;

})();
