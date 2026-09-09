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
    el.dataset.songId = song.id;

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

  function playingId() {
    var c = window.MiniPlayer && window.MiniPlayer.current();
    return c ? c.id : null;
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
    var playing = playingId();
    /* השיר שמתנגן כבר מוצג בנגן שלמעלה — אין טעם להראות אותו שוב ברשימה */
    var list = matching.filter(function (s) { return s.id !== playing; });

    grid.innerHTML = "";
    list.forEach(function (s, i) { grid.appendChild(songCard(s, i)); });

    if (count) {
      var all = total === 1 ? "שיר אחד" : total + " שירים";
      count.textContent = total === 0 ? "" :
        (matching.length === total ? all + " באוסף" : matching.length + " מתוך " + all);
    }

    if (!empty) return;

    if (total === 0) {
      empty.style.display = "";
      empty.innerHTML = "<h3>השירים בדרך 🎵</h3><p>הניגונים והקליפים יתפרסמו כאן.</p>";
    } else if (matching.length === 0) {
      empty.style.display = "";
      empty.innerHTML = "<h3>לא נמצאו שירים</h3><p>נסה לחפש משהו אחר או לבחור קטגוריה אחרת.</p>";
    } else if (list.length === 0) {
      /* כל מה שמתאים לסינון הוא בדיוק השיר שמתנגן למעלה */
      empty.style.display = "";
      empty.innerHTML = '<p style="margin:0">☝️ ' +
        (total === 1 ? "זה השיר היחיד באוסף כרגע, והוא מתנגן למעלה."
                     : "השיר היחיד שמתאים לסינון הזה מתנגן למעלה.") + "</p>";
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

  /* ---- בחירת שיר: מתנגן במסגרת שבתוך העמוד, בלי מודל ובלי פופאפ ---- */
  function openPlayer(song) {
    if (!window.MiniPlayer) {
      window.open("https://www.youtube.com/watch?v=" + song.id, "_blank");
      return;
    }
    /* לחיצה היא מגע של המשתמש, ולכן מותר להתחיל עם קול */
    window.MiniPlayer.play(song, { muted: false });
    var slot = document.getElementById("player-slot");
    if (slot) slot.scrollIntoView({ block: "center", behavior: "smooth" });
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

  /* כשמתחלף השיר בנגן — לרענן את הרשימה, כדי שהשיר המתנגן לא יופיע בה */
  document.addEventListener("player:change", function () {
    if (document.getElementById("songs-grid")) render();
    if (document.getElementById("featured")) window.renderFeatured("featured", 3);
  });

  /* מוצג גם בעמוד הבית */
  window.renderFeatured = function (containerId, limit) {
    var box = document.getElementById(containerId);
    if (!box) return;
    var all = window.SONGS || [];
    var list = all.filter(function (s) { return s.featured; });
    if (!list.length) list = all.slice();

    var playing = playingId();
    list = list.filter(function (s) { return s.id !== playing; }).slice(0, limit || 3);

    box.innerHTML = "";
    list.forEach(function (s, i) { box.appendChild(songCard(s, i)); });
    box.style.display = list.length ? "" : "none";
  };
})();
