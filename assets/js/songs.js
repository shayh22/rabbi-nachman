/* =========================================================================
   assets/js/songs.js — עמוד השירים והקליפים
   ========================================================================= */

(function () {
  var state = { q: "", cat: "הכל" };

  /* לשורטים יש תמונה בפרופורציה המקורית (oar), ולכן הכרטיס לא מציג פסים שחורים */
  function thumbUrl(song) {
    return "https://i.ytimg.com/vi/" + song.id +
      (song.vertical ? "/oardefault.jpg" : "/hqdefault.jpg");
  }

  function songCard(song, index) {
    var el = document.createElement("article");
    el.className = "song";
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.dataset.index = index;
    el.dataset.songId = song.id;

    var meta = [];
    if (song.artist) meta.push(song.artist);
    if (song.year) meta.push(song.year);

    el.innerHTML =
      '<div class="thumb">' +
        '<img loading="lazy" alt="' + esc(song.title) + '" src="' + thumbUrl(song) + '">' +
        '<div class="play"><span>▶</span></div>' +
        (song.vertical ? '<span class="short-badge">שורט</span>' : "") +
      "</div>" +
      '<div class="song-body">' +
        "<h3>" + esc(song.title) + "</h3>" +
        '<div class="song-meta">' +
          (song.category ? '<span class="pill">' + esc(song.category) + "</span>" : "") +
          (meta.length ? "<span>" + esc(meta.join(" · ")) + "</span>" : "") +
        "</div>" +
      "</div>";

    el.addEventListener("click", function () { openPlayer(song, el); });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPlayer(song, el); }
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

    var total = (window.SONGS || []).length;
    var matching = filtered();
    /* השיר המתנגן נשאר ברשימה: הכרטיס שלו הוא הנגן */
    var list = matching;

    grid.innerHTML = "";
    list.forEach(function (s, i) { grid.appendChild(songCard(s, i)); });

    if (count) {
      var all = total === 1 ? "שיר אחד" : total + " שירים";
      count.textContent = total === 0 ? "" :
        (matching.length === total ? all + " באוסף" : matching.length + " מתוך " + all);
    }

    if (!empty) return;

    if (window.MiniPlayer) window.MiniPlayer.mount();

    if (total === 0) {
      empty.style.display = "";
      empty.innerHTML = "<h3>השירים בדרך 🎵</h3><p>הניגונים והקליפים יתפרסמו כאן.</p>";
    } else if (matching.length === 0) {
      empty.style.display = "";
      empty.innerHTML = "<h3>לא נמצאו שירים</h3><p>נסה לחפש משהו אחר או לבחור קטגוריה אחרת.</p>";
    } else {
      empty.style.display = "none";
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

  /* ---- בחירת שיר: מתנגן בתוך הכרטיס שלו, במקומו ברשימה ---- */
  function openPlayer(song, card) {
    if (!window.MiniPlayer) {
      window.open("https://www.youtube.com/watch?v=" + song.id, "_blank");
      return;
    }
    var playing = window.MiniPlayer.current();
    if (playing && playing.id === song.id) return;   /* כבר מתנגן כאן */

    /* לחיצה היא מגע של המשתמש, ולכן מותר להתחיל עם קול */
    window.MiniPlayer.play(song, {
      muted: false,
      slot: card ? card.querySelector(".thumb") : null
    });
  }

  function initSongsPage() {
    buildChips();
    render();
    var s = document.getElementById("song-search");
    if (s) s.addEventListener("input", function () { state.q = this.value; render(); });
  }

  function initHome() {
    window.renderFeatured("featured", 3);
    var empty = document.getElementById("featured-empty");
    if (empty) empty.style.display = (window.SONGS || []).length ? "none" : "";
  }

  window.PAGE_INIT = window.PAGE_INIT || {};
  window.PAGE_INIT.songs = initSongsPage;
  window.PAGE_INIT.home = initHome;

  /* מוצג גם בעמוד הבית */
  window.renderFeatured = function (containerId, limit) {
    var box = document.getElementById(containerId);
    if (!box) return;
    var all = window.SONGS || [];
    var list = all.filter(function (s) { return s.featured; });
    if (!list.length) list = all.slice();

    list = list.slice(0, limit || 3);

    box.innerHTML = "";
    list.forEach(function (s, i) { box.appendChild(songCard(s, i)); });
    box.style.display = list.length ? "" : "none";
    if (window.MiniPlayer) window.MiniPlayer.mount();
  };
})();
