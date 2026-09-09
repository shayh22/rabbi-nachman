/* =========================================================================
   assets/js/miniplayer.js — הנגן הצף של האתר
   -------------------------------------------------------------------------
   נגן יוטיוב יחיד שחי מחוץ לתוכן העמוד ולכן שורד מעבר בין עמודים:
     • מצב מוקטן — פינה תחתונה, ממשיך לנגן בזמן גלישה באתר
     • מצב מורחב — נגן גדול במרכז המסך
     • מעבר אוטומטי לשיר הבא כשנגמר שיר
     • אם בכל זאת נטען עמוד מחדש (רענון / כניסה מקישור) — מתחדש
       מאותה נקודה בדיוק. אם הדפדפן חוסם ניגון אוטומטי בלי לחיצה,
       מוצג כפתור "המשך ניגון".
   ========================================================================= */

(function () {
  var KEY = "uman-player-v1";

  var yt = null;          /* מופע YT.Player */
  var apiReady = false;
  var apiQueue = [];
  var current = null;     /* השיר המתנגן */
  var wantPlay = false;
  var saveTimer = null;
  var dock, hostWrap, elTitle, elArtist, btnPlay, btnPrev, btnNext, btnExpand, btnClose, elResume;

  /* ---------- עזרים ---------- */

  function songs() { return window.SONGS || []; }

  function indexOfId(id) {
    var list = songs();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return i;
    return -1;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function readState() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); }
    catch (e) { return null; }
  }

  function writeState() {
    if (!current) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify({
        song: current,
        t: currentTime(),
        playing: isPlaying(),
        expanded: dock ? dock.classList.contains("expanded") : false
      }));
    } catch (e) {}
  }

  function clearState() {
    try { sessionStorage.removeItem(KEY); } catch (e) {}
  }

  function currentTime() {
    try { return yt && yt.getCurrentTime ? yt.getCurrentTime() : 0; }
    catch (e) { return 0; }
  }

  function isPlaying() {
    try { return !!(yt && yt.getPlayerState && yt.getPlayerState() === 1); }
    catch (e) { return false; }
  }

  /* ---------- ה-API של יוטיוב ---------- */

  function withAPI(cb) {
    if (window.YT && window.YT.Player) { cb(); return; }
    apiQueue.push(cb);
    if (document.getElementById("yt-api-script")) return;

    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prev === "function") prev();
      apiReady = true;
      var q = apiQueue.slice();
      apiQueue = [];
      q.forEach(function (f) { f(); });
    };

    var s = document.createElement("script");
    s.id = "yt-api-script";
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = function () { failNicely(); };
    document.head.appendChild(s);
  }

  function failNicely() {
    if (!dock || !current) return;
    dock.classList.add("offline");
    elResume.hidden = false;
    elResume.textContent = "פתח ביוטיוב ↗";
    elResume.onclick = function () {
      window.open("https://www.youtube.com/watch?v=" + current.id, "_blank", "noopener");
    };
  }

  /* ---------- בניית הנגן ---------- */

  function buildDock() {
    if (dock) return;

    dock = document.createElement("div");
    dock.id = "yt-dock";
    dock.className = "dock hidden";
    dock.setAttribute("dir", "rtl");
    dock.innerHTML =
      '<div class="dock-backdrop"></div>' +
      '<div class="dock-panel">' +
        '<div class="dock-video"><div id="yt-host"></div>' +
          '<button class="dock-resume" hidden>▶ המשך ניגון</button>' +
        "</div>" +
        '<div class="dock-bar">' +
          '<div class="dock-controls">' +
            '<button class="dock-btn" data-act="prev" title="הקודם" aria-label="השיר הקודם">⏮</button>' +
            '<button class="dock-btn play" data-act="play" title="נגן / השהה" aria-label="נגן או השהה">▶</button>' +
            '<button class="dock-btn" data-act="next" title="הבא" aria-label="השיר הבא">⏭</button>' +
          "</div>" +
          '<div class="dock-meta"><b class="dock-title"></b><span class="dock-artist"></span></div>' +
          '<div class="dock-actions">' +
            '<button class="dock-btn" data-act="expand" title="הגדל / הקטן" aria-label="הגדלה או הקטנה">⤢</button>' +
            '<button class="dock-btn" data-act="close" title="סגירה" aria-label="סגירת הנגן">✕</button>' +
          "</div>" +
        "</div>" +
      "</div>";

    document.body.appendChild(dock);

    hostWrap  = dock.querySelector(".dock-video");
    elTitle   = dock.querySelector(".dock-title");
    elArtist  = dock.querySelector(".dock-artist");
    btnPlay   = dock.querySelector('[data-act="play"]');
    elResume  = dock.querySelector(".dock-resume");

    dock.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-act]") : null;
      if (b) {
        var act = b.getAttribute("data-act");
        if (act === "play") togglePlay();
        else if (act === "next") step(1);
        else if (act === "prev") step(-1);
        else if (act === "expand") setExpanded(!dock.classList.contains("expanded"));
        else if (act === "close") close();
        return;
      }
      if (e.target.classList.contains("dock-backdrop")) setExpanded(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && dock.classList.contains("expanded")) setExpanded(false);
    });

    window.addEventListener("pagehide", writeState);
    window.addEventListener("beforeunload", writeState);
  }

  function setExpanded(on) {
    dock.classList.toggle("expanded", !!on);
    dock.classList.toggle("mini", !on);
    document.body.style.overflow = on ? "hidden" : "";
    document.body.classList.toggle("dock-open", !dock.classList.contains("hidden"));
    writeState();
  }

  function setMeta(song) {
    elTitle.textContent = song.title || "";
    elArtist.textContent = [song.artist, song.year].filter(Boolean).join(" · ");
  }

  function setPlayIcon(playing) {
    if (btnPlay) btnPlay.textContent = playing ? "⏸" : "▶";
  }

  /* ---------- ניגון ---------- */

  function createPlayer(song, startAt, autoplay) {
    withAPI(function () {
      if (yt && yt.loadVideoById) {
        if (autoplay) yt.loadVideoById({ videoId: song.id, startSeconds: startAt || 0 });
        else yt.cueVideoById({ videoId: song.id, startSeconds: startAt || 0 });
        return;
      }
      yt = new YT.Player("yt-host", {
        videoId: song.id,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          start: Math.floor(startAt || 0),
          rel: 0,
          playsinline: 1,
          modestbranding: 1
        },
        events: {
          onReady: function () {
            if (autoplay) {
              try { yt.playVideo(); } catch (e) {}
              checkBlocked();
            }
          },
          onStateChange: onState,
          onError: function () { failNicely(); }
        }
      });
    });
  }

  /* דפדפנים חוסמים ניגון אוטומטי עם קול בלי לחיצת משתמש.
     אם אחרי טעינה מחדש הניגון לא באמת התחיל — מציגים כפתור המשך. */
  function checkBlocked() {
    setTimeout(function () {
      var st = -1;
      try { st = yt.getPlayerState(); } catch (e) {}
      if (st !== 1 && st !== 3) {
        elResume.hidden = false;
        elResume.textContent = "▶ המשך ניגון";
        elResume.onclick = function () {
          elResume.hidden = true;
          try { yt.playVideo(); } catch (e) {}
        };
      }
    }, 1600);
  }

  function onState(e) {
    var playing = e.data === 1;
    setPlayIcon(playing);
    if (playing) elResume.hidden = true;

    clearInterval(saveTimer);
    if (playing) saveTimer = setInterval(writeState, 1000);
    writeState();

    if (e.data === 0) step(1, true);  /* נגמר — לשיר הבא */
  }

  function togglePlay() {
    if (!yt) return;
    try { isPlaying() ? yt.pauseVideo() : yt.playVideo(); } catch (e) {}
    elResume.hidden = true;
  }

  function step(dir, auto) {
    var list = songs();
    if (!list.length || !current) return;
    var i = indexOfId(current.id);
    var next = i + dir;
    if (next < 0 || next >= list.length) {
      if (auto) { setPlayIcon(false); return; }   /* סוף הרשימה */
      next = (next + list.length) % list.length;  /* לחיצה ידנית — מעגלי */
    }
    play(list[next], { expanded: dock.classList.contains("expanded") });
  }

  function close() {
    if (yt) { try { yt.stopVideo(); } catch (e) {} }
    clearInterval(saveTimer);
    clearState();
    current = null;
    dock.classList.add("hidden");
    dock.classList.remove("mini", "expanded");
    document.body.classList.remove("dock-open");
    document.body.style.overflow = "";
  }

  /* ---------- ה-API של האתר ---------- */

  function play(song, opts) {
    if (!song || !song.id) return;
    opts = opts || {};
    buildDock();
    current = { id: song.id, title: song.title, artist: song.artist, year: song.year };
    wantPlay = true;

    setMeta(current);
    elResume.hidden = true;
    dock.classList.remove("hidden", "offline");
    setExpanded(!!opts.expanded);
    if (!opts.expanded) dock.classList.add("mini");

    createPlayer(current, opts.startAt || 0, true);
    writeState();
  }

  /* שחזור אחרי טעינת עמוד מלאה (רענון או כניסה ישירה) */
  function restore() {
    var st = readState();
    if (!st || !st.song || !st.song.id) return;
    buildDock();
    current = st.song;
    setMeta(current);
    dock.classList.remove("hidden");
    dock.classList.add("mini");           /* תמיד חוזרים במצב מוקטן */
    document.body.classList.add("dock-open");
    setPlayIcon(!!st.playing);
    createPlayer(current, st.t || 0, !!st.playing);
  }

  window.MiniPlayer = {
    play: play,
    close: close,
    isOpen: function () { return !!current; },
    current: function () { return current; }
  };

  document.addEventListener("DOMContentLoaded", restore);
})();
