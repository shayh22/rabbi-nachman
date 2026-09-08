/* =========================================================================
   assets/js/songs.js — עמוד השירים והקליפים
   ========================================================================= */

(function () {
  var state = { q: "", cat: "הכל" };

  function thumbUrl(id) {
    return "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
  }

  function songCard(song, index) {
    var el = document.createElement("article");
    el.className = "song";
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.dataset.index = index;

    var meta = [];
    if (song.artist) meta.push(song.artist);
    if (song.year) meta.push(song.year);

    el.innerHTML =
      '<div class="thumb">' +
        '<img loading="lazy" alt="' + esc(song.title) + '" src="' + thumbUrl(song.id) + '">' +
        '<div class="play"><span>▶</span></div>' +
      "</div>" +
      '<div class="song-body">' +
        "<h3>" + esc(song.title) + "</h3>" +
        '<div class="song-meta">' +
          (song.category ? '<span class="pill">' + esc(song.category) + "</span>" : "") +
          (meta.length ? "<span>" + esc(meta.join(" · ")) + "</span>" : "") +
        "</div>" +
      "</div>";

    el.addEventListener("click", function () { openPlayer(song); });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPlayer(song); }
    });
    return el;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function filtered() {
    var songs = window.SONGS || [];
    return songs.filter(function (s) {
      if (state.cat !== "הכל" && s.category !== state.cat) return false;
      if (!state.q) return true;
      var hay = [s.title, s.artist, s.category, s.words, s.lyrics].join(" ").toLowerCase();
      return hay.indexOf(state.q.toLowerCase()) !== -1;
    });
  }

  function render() {
    var grid = document.getElementById("songs-grid");
    var empty = document.getElementById("songs-empty");
    var count = document.getElementById("songs-count");
    if (!grid) return;

    var list = filtered();
    grid.innerHTML = "";
    list.forEach(function (s, i) { grid.appendChild(songCard(s, i)); });

    var total = (window.SONGS || []).length;
    if (count) {
      count.textContent = total === 0 ? "" :
        (list.length === total ? total + " שירים" : list.length + " מתוך " + total + " שירים");
    }

    if (empty) {
      if (total === 0) {
        empty.style.display = "";
        empty.innerHTML =
          "<h3>עוד לא הוספת שירים 🎵</h3>" +
          "<p>שלח לי את הלינקים מיוטיוב ואוסיף אותם, או הוסף בעצמך:<br>" +
          'נכנסים לעמוד <a href="add.html">הוספת שיר</a>, מדביקים את הקישור, ' +
          "ומעתיקים את השורה שמתקבלת אל תוך הקובץ <code>data/songs.js</code>.</p>";
      } else if (list.length === 0) {
        empty.style.display = "";
        empty.innerHTML = "<h3>לא נמצאו שירים</h3><p>נסה לחפש משהו אחר או לבחור קטגוריה אחרת.</p>";
      } else {
        empty.style.display = "none";
      }
    }
  }

  function buildChips() {
    var wrap = document.getElementById("cat-chips");
    if (!wrap) return;
    var cats = ["הכל"].concat(window.SONG_CATEGORIES || []);
    /* להציג רק קטגוריות שיש בהן שירים, חוץ מ"הכל" */
    var used = {};
    (window.SONGS || []).forEach(function (s) { used[s.category] = true; });
    cats = cats.filter(function (c) { return c === "הכל" || used[c]; });

    wrap.innerHTML = "";
    cats.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "chip" + (c === state.cat ? " on" : "");
      b.textContent = c;
      b.addEventListener("click", function () {
        state.cat = c;
        wrap.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        render();
      });
      wrap.appendChild(b);
    });
  }

  /* ---- נגן ---- */
  function openPlayer(song) {
    var p = document.getElementById("player");
    if (!p) return;
    var frame = document.getElementById("player-frame");
    var title = document.getElementById("player-title");
    var link = document.getElementById("player-link");

    frame.innerHTML =
      '<iframe src="https://www.youtube.com/embed/' + encodeURIComponent(song.id) +
      '?autoplay=1&rel=0" title="' + esc(song.title) +
      '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';

    title.textContent = song.title + (song.artist ? " · " + song.artist : "");
    link.href = "https://www.youtube.com/watch?v=" + song.id;

    var info = document.getElementById("player-info");
    if (info) {
      var bits = [];
      if (song.words) bits.push("<p><strong>מקור המילים:</strong> " + esc(song.words) + "</p>");
      if (song.lyrics) bits.push('<p style="white-space:pre-line">' + esc(song.lyrics) + "</p>");
      info.innerHTML = bits.join("");
    }

    p.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closePlayer() {
    var p = document.getElementById("player");
    if (!p) return;
    p.classList.remove("open");
    document.getElementById("player-frame").innerHTML = "";
    document.body.style.overflow = "";
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildChips();
    render();

    var s = document.getElementById("song-search");
    if (s) s.addEventListener("input", function () { state.q = this.value; render(); });

    var p = document.getElementById("player");
    if (p) {
      p.addEventListener("click", function (e) { if (e.target === p) closePlayer(); });
      var x = document.getElementById("player-close");
      if (x) x.addEventListener("click", closePlayer);
    }
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePlayer(); });
  });

  /* מוצג גם בעמוד הבית */
  window.renderFeatured = function (containerId, limit) {
    var box = document.getElementById(containerId);
    if (!box) return;
    var list = (window.SONGS || []).filter(function (s) { return s.featured; });
    if (!list.length) list = (window.SONGS || []).slice();
    list = list.slice(0, limit || 3);
    if (!list.length) { box.innerHTML = ""; return; }
    box.innerHTML = "";
    list.forEach(function (s, i) { box.appendChild(songCard(s, i)); });
  };
})();
