/* =========================================================================
   assets/js/miniplayer.js — הנגן של האתר
   -------------------------------------------------------------------------
   נגן יוטיוב יחיד שחי מחוץ לתוכן העמוד, ולכן שורד מעבר בין עמודים.
   שני מצבים:
     • מעוגן — הנגן יושב בדיוק בתוך המסגרת שבעמוד (#player-slot) ונראה
       כאילו הוא חלק ממנו. אין מודל ואין פופאפ.
     • צף — כשהמסגרת יוצאת מהמסך או כשעוברים לעמוד אחר, הנגן מתכווץ
       לפינה וממשיך לנגן.

   ניגון אוטומטי: השיר מתחיל לבד כשמגיעים אליו — מושתק, כי דפדפנים
   אוסרים להתחיל שמע בלי מגע של המשתמש. לחיצה אחת על "הפעל קול"
   פותחת את הצליל, ומאותו רגע כל השירים באותו ביקור מתנגנים עם קול.
   ========================================================================= */

(function () {
  var KEY = "uman-player-v1";
  var SOUND_KEY = "uman-sound-on";
  var CLOSED_KEY = "uman-player-closed";

  var yt = null;
  var apiQueue = [];
  var current = null;
  var slot = null;             /* המסגרת שבעמוד שאליה הנגן מעוגן */
  var slotObserver = null;
  var resizeObserver = null;
  var syncPending = false;
  var saveTimer = null;
  var dock, elTitle, elArtist, btnPlay, btnSound, elResume;

  /* ---------- עזרים ---------- */

  function songs() { return window.SONGS || []; }

  function indexOfId(id) {
    var list = songs();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return i;
    return -1;
  }

  function flag(key) { try { return sessionStorage.getItem(key) === "1"; } catch (e) { return false; } }
  function setFlag(key, on) {
    try { on ? sessionStorage.setItem(key, "1") : sessionStorage.removeItem(key); } catch (e) {}
  }

  function readState() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); }
    catch (e) { return null; }
  }
  function writeState() {
    if (!current) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify({
        song: current, t: currentTime(), playing: isPlaying()
      }));
    } catch (e) {}
  }
  function clearState() { try { sessionStorage.removeItem(KEY); } catch (e) {} }

  function currentTime() {
    try { return yt && yt.getCurrentTime ? yt.getCurrentTime() : 0; } catch (e) { return 0; }
  }
  function isPlaying() {
    try { return !!(yt && yt.getPlayerState && yt.getPlayerState() === 1); } catch (e) { return false; }
  }

  /* ---------- ה-API של יוטיוב ---------- */

  function withAPI(cb) {
    if (window.YT && window.YT.Player) { cb(); return; }
    apiQueue.push(cb);
    if (document.getElementById("yt-api-script")) return;

    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prev === "function") prev();
      var q = apiQueue.slice();
      apiQueue = [];
      q.forEach(function (f) { f(); });
    };

    var s = document.createElement("script");
    s.id = "yt-api-script";
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = offline;
    document.head.appendChild(s);
  }

  function offline() {
    if (!dock || !current) return;
    elResume.hidden = false;
    elResume.textContent = "פתח ביוטיוב ↗";
    elResume.onclick = function () {
      window.open("https://www.youtube.com/watch?v=" + current.id, "_blank", "noopener");
    };
  }

  /* ---------- מבנה הנגן ---------- */

  function buildDock() {
    if (dock) return;

    dock = document.createElement("div");
    dock.id = "yt-dock";
    dock.className = "dock hidden";
    dock.setAttribute("dir", "rtl");
    dock.innerHTML =
      '<div class="dock-panel">' +
        '<div class="dock-video"><div id="yt-host"></div>' +
          '<button class="dock-resume" hidden></button>' +
          '<button class="dock-sound" hidden>🔊 הפעל קול</button>' +
        "</div>" +
        '<div class="dock-bar">' +
          '<div class="dock-controls">' +
            '<button class="dock-btn" data-act="prev" title="השיר הקודם" aria-label="השיר הקודם">⏮</button>' +
            '<button class="dock-btn play" data-act="play" title="נגן או השהה" aria-label="נגן או השהה">▶</button>' +
            '<button class="dock-btn" data-act="next" title="השיר הבא" aria-label="השיר הבא">⏭</button>' +
          "</div>" +
          '<div class="dock-meta"><b class="dock-title"></b><span class="dock-artist"></span></div>' +
          '<div class="dock-actions">' +
            '<button class="dock-btn" data-act="mute" title="קול" aria-label="הפעלה או השתקה של הקול">🔇</button>' +
            '<button class="dock-btn" data-act="close" title="סגירת הנגן" aria-label="סגירת הנגן">✕</button>' +
          "</div>" +
        "</div>" +
      "</div>";

    document.body.appendChild(dock);

    elTitle  = dock.querySelector(".dock-title");
    elArtist = dock.querySelector(".dock-artist");
    btnPlay  = dock.querySelector('[data-act="play"]');
    btnSound = dock.querySelector(".dock-sound");
    elResume = dock.querySelector(".dock-resume");

    dock.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-act]") : null;
      if (!b) return;
      var act = b.getAttribute("data-act");
      if (act === "play") togglePlay();
      else if (act === "next") step(1);
      else if (act === "prev") step(-1);
      else if (act === "mute") toggleSound();
      else if (act === "close") close();
    });

    btnSound.addEventListener("click", function () { soundOn(true); });

    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync);
    window.addEventListener("pagehide", writeState);
    window.addEventListener("beforeunload", writeState);
  }

  /* ---------- עיגון למסגרת שבעמוד ---------- */

  function requestSync() {
    if (syncPending || !slot) return;
    if (dock && !dock.classList.contains("anchored")) return;
    syncPending = true;
    requestAnimationFrame(function () { syncPending = false; syncAnchor(); });
  }

  function syncAnchor() {
    if (!dock || !slot) return;
    if (!dock.classList.contains("anchored")) return;   /* במצב צף אין הצמדה */
    if (!document.body.contains(slot)) { detach(); return; }
    var r = slot.getBoundingClientRect();
    dock.style.width = r.width + "px";
    dock.style.height = r.height + "px";
    dock.style.transform = "translate(" + Math.round(r.left) + "px," + Math.round(r.top) + "px)";
  }

  function toCorner() {
    dock.classList.remove("anchored");
    dock.classList.add("mini");
    dock.style.removeProperty("width");
    dock.style.removeProperty("height");
    dock.style.removeProperty("transform");
    document.body.classList.add("dock-open");
  }

  function toSlot() {
    dock.classList.add("anchored");
    dock.classList.remove("mini");
    document.body.classList.remove("dock-open");
    syncAnchor();
  }

  /* מחברים את הנגן למסגרת שבעמוד. כשהמסגרת יוצאת מהמסך — הנגן עובר לפינה. */
  function attach(el) {
    buildDock();
    slot = el;
    if (slotObserver) slotObserver.disconnect();
    if (resizeObserver) resizeObserver.disconnect();

    slotObserver = new IntersectionObserver(function (entries) {
      var e = entries[0];
      if (!current) {
        /* עוד לא מנגן — מגיעים למסגרת, מתחילים לבד */
        if (e.isIntersecting && e.intersectionRatio > 0.35) autostart();
        return;
      }
      if (e.intersectionRatio > 0.25) toSlot();
      else toCorner();
    }, { threshold: [0, 0.25, 0.35, 0.6] });
    slotObserver.observe(el);

    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(requestSync);
      resizeObserver.observe(el);
    }

    if (current) { toSlot(); dock.classList.remove("hidden"); }
  }

  function detach() {
    slot = null;
    if (slotObserver) { slotObserver.disconnect(); slotObserver = null; }
    if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
    if (dock && current) toCorner();
  }

  /* ---------- קול ---------- */

  function soundOn(on) {
    if (!yt) return;
    try {
      if (on) { yt.unMute(); yt.setVolume(100); } else { yt.mute(); }
    } catch (e) {}
    setFlag(SOUND_KEY, !!on);
    updateSoundUI();
  }

  function toggleSound() {
    var muted = true;
    try { muted = yt && yt.isMuted ? yt.isMuted() : true; } catch (e) {}
    soundOn(muted);
  }

  function updateSoundUI() {
    var muted = true;
    try { muted = yt && yt.isMuted ? yt.isMuted() : true; } catch (e) {}
    var b = dock.querySelector('[data-act="mute"]');
    if (b) b.textContent = muted ? "🔇" : "🔊";
    btnSound.hidden = !(muted && isPlaying());
  }

  /* ---------- ניגון ---------- */

  function createPlayer(song, startAt, autoplay, muted) {
    withAPI(function () {
      if (yt && yt.loadVideoById) {
        if (muted) { try { yt.mute(); } catch (e) {} }
        yt.loadVideoById({ videoId: song.id, startSeconds: startAt || 0 });
        setTimeout(updateSoundUI, 400);
        return;
      }
      yt = new YT.Player("yt-host", {
        videoId: song.id,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          start: Math.floor(startAt || 0),
          mute: muted ? 1 : 0,
          rel: 0,
          playsinline: 1,
          modestbranding: 1
        },
        events: {
          onReady: function () {
            if (muted) { try { yt.mute(); } catch (e) {} }
            else soundOn(true);
            if (autoplay) { try { yt.playVideo(); } catch (e) {} checkBlocked(); }
            updateSoundUI();
          },
          onStateChange: onState,
          onError: offline
        }
      });
    });
  }

  /* גם ניגון מושתק עלול להיחסם בחלק מהדפדפנים — אז מציעים כפתור */
  function checkBlocked() {
    setTimeout(function () {
      var st = -1;
      try { st = yt.getPlayerState(); } catch (e) {}
      if (st !== 1 && st !== 3) {
        elResume.hidden = false;
        elResume.textContent = "▶ הפעל";
        elResume.onclick = function () {
          elResume.hidden = true;
          soundOn(true);
          try { yt.playVideo(); } catch (e) {}
        };
      }
    }, 1800);
  }

  function onState(e) {
    var playing = e.data === 1;
    if (btnPlay) btnPlay.textContent = playing ? "⏸" : "▶";
    if (playing) elResume.hidden = true;
    updateSoundUI();

    clearInterval(saveTimer);
    if (playing) saveTimer = setInterval(writeState, 1000);
    writeState();

    if (e.data === 0) step(1, true);
  }

  function togglePlay() {
    if (!yt) return;
    try { isPlaying() ? yt.pauseVideo() : yt.playVideo(); } catch (e) {}
    elResume.hidden = true;
  }

  function step(dir, auto) {
    var list = songs();
    if (!list.length || !current) return;
    var next = indexOfId(current.id) + dir;
    if (next < 0 || next >= list.length) {
      if (auto) { if (btnPlay) btnPlay.textContent = "▶"; return; }
      next = (next + list.length) % list.length;
    }
    play(list[next]);
  }

  function close() {
    if (yt) { try { yt.stopVideo(); } catch (e) {} }
    clearInterval(saveTimer);
    clearState();
    setFlag(CLOSED_KEY, true);
    current = null;
    dock.classList.add("hidden");
    dock.classList.remove("mini", "anchored");
    document.body.classList.remove("dock-open");
  }

  /* ---------- ה-API של האתר ---------- */

  function play(song, opts) {
    if (!song || !song.id) return;
    opts = opts || {};
    buildDock();

    current = { id: song.id, title: song.title, artist: song.artist, year: song.year };
    setFlag(CLOSED_KEY, false);

    elTitle.textContent = current.title || "";
    elArtist.textContent = [current.artist, current.year].filter(Boolean).join(" · ");
    elResume.hidden = true;
    dock.classList.remove("hidden");

    if (slot) toSlot(); else toCorner();

    /* לחיצה של המשתמש מתירה קול; ניגון שמתחיל לבד חייב להיות מושתק */
    var muted = opts.muted !== undefined ? opts.muted : !flag(SOUND_KEY);
    createPlayer(current, opts.startAt || 0, true, muted);
    writeState();
    markPlaying();
  }

  /* מדגיש את הכרטיס של השיר המתנגן */
  function markPlaying() {
    document.querySelectorAll(".song.playing").forEach(function (c) { c.classList.remove("playing"); });
    if (!current) return;
    var card = document.querySelector('.song[data-song-id="' + current.id + '"]');
    if (card) card.classList.add("playing");
  }

  /* התחלה אוטומטית כשמגיעים למסגרת שבעמוד */
  function autostart() {
    if (current || flag(CLOSED_KEY)) return;
    var list = songs();
    if (!list.length) return;
    var featured = list.filter(function (s) { return s.featured; });
    play((featured[0] || list[0]), { muted: !flag(SOUND_KEY) });
  }

  /* שחזור אחרי טעינת עמוד מלאה */
  function restore() {
    var st = readState();
    if (!st || !st.song || !st.song.id) return false;
    buildDock();
    current = st.song;
    elTitle.textContent = current.title || "";
    elArtist.textContent = [current.artist, current.year].filter(Boolean).join(" · ");
    dock.classList.remove("hidden");
    if (!slot) toCorner();
    createPlayer(current, st.t || 0, !!st.playing, !flag(SOUND_KEY));
    markPlaying();
    return true;
  }

  /* נקרא בכל טעינת עמוד ואחרי כל מעבר רך */
  function mount() {
    var el = document.getElementById("player-slot");
    if (el) attach(el);
    else detach();
    markPlaying();
    if (dock && current) { dock.classList.remove("hidden"); requestSync(); }
  }

  window.MiniPlayer = {
    play: play,
    close: close,
    mount: mount,
    isOpen: function () { return !!current; },
    current: function () { return current; }
  };

  document.addEventListener("DOMContentLoaded", function () {
    restore();
    mount();
  });
})();
