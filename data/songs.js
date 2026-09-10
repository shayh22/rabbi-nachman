/* =========================================================================
   data/songs.js — רשימת השירים והקליפים של האתר
   -------------------------------------------------------------------------
   רק מנהל האתר מוסיף שירים, על ידי עריכת הקובץ הזה.

   הדרך המהירה — כלי הניהול שבמחשב (אינו חלק מהאתר):
       node tools/add-song.mjs https://youtu.be/XXXXXXXXXXX
   הוא שולף את שם השיר ואת שם הערוץ מיוטיוב, ומוסיף אותם לכאן.

   או ידנית, לפי המבנה הבא:
     id       — מזהה הסרטון ביוטיוב (11 תווים). בקישור
                https://www.youtube.com/watch?v=XXXXXXXXXXX  →  "XXXXXXXXXXX"
     title    — שם השיר
     category — אחת מהקטגוריות שברשימת SONG_CATEGORIES שבתחתית הקובץ
     artist   — מבצע / מנגן (אפשר להשאיר ריק)
     year     — שנה (אפשר להשאיר ריק)
     words    — מקור המילים, למשל "ליקוטי מוהר״ן ח״א, כ״ד" (אפשר להשאיר ריק)
     lyrics   — מילות השיר / פזמון (אפשר להשאיר ריק)
     featured — true אם רוצים שהשיר יופיע גם בעמוד הבית
   ========================================================================= */

window.SONGS = [

  {
    id: "6v-84PWb9rk",
    title: "רבינו אור אינסוף",
    category: "ניגונים",
    artist: "שי ShayAI",
    year: "2025",
    words: "",
    lyrics: "",
    featured: true
  },

  {
    id: "Ex2rcTaY4Q8",
    title: "חוזרים מרבינו - לא לא לבד",
    category: "ניגונים",
    artist: "אש ברסלב",
    year: "",
    words: "",
    lyrics: "",
    vertical: true,   /* שורט — פרופורציה אנכית */
    featured: true
  },

  {
    id: "O-HakT5dp08",
    title: "רבנו אור אינסוף — השיר הרשמי לראש השנה באומן",
    category: "ניגונים",
    artist: "אש ברסלב",
    year: "",
    words: "",
    lyrics: "",
    vertical: true,   /* שורט — פרופורציה אנכית */
    featured: true
  },

  {
    id: "2TGHjbc26lE",
    title: "ותכתבנו בימי ראש השנה הזה",
    category: "ניגונים",
    artist: "אש ברסלב",
    year: "",
    words: "",
    lyrics: "",
    featured: true
  },

  /* ── כאן נוספים שירים חדשים ──
     הכי פשוט: node tools/add-song.mjs <קישור>
     השיר הראשון ברשימה הוא זה שמתנגן מעצמו בכניסה לעמוד. */

  {
    id: "2K5sqNwfW6s",
    title: "אין ייאוש בעולם",
    category: "ניגונים",
    artist: "קדושיר",
    year: "",
    words: "",
    lyrics: "",
    vertical: true,   /* שורט — פרופורציה אנכית */
    featured: true
  },
  {
    id: "11s_KQ3TJp0",
    title: "אומן ראש השנה שלי",
    category: "אומן וראש השנה",
    artist: "חיים אביטל & איציק אשל",
    year: "",
    words: "",
    lyrics: "",
    featured: true
  },
  {
    id: "nWB2VRT_Jgg",
    title: "רבי נחמן",
    category: "ניגונים",
    artist: "איב אנד ליר",
    year: "",
    words: "",
    lyrics: "",
    featured: true
  },
  {
    id: "cgdtXVYI5WM",
    title: "מחרוזת רבי נחמן",
    category: "ניגונים",
    artist: "נחמן וניסים סבג",
    year: "",
    words: "",
    lyrics: "",
    featured: true
  },
  {
    id: "aqqz0QkoS4k",
    title: "רבי נחמן אמר החיים הם רק משחק",
    category: "ניגונים",
    artist: "שי ShayAI",
    year: "",
    words: "",
    lyrics: "",
    vertical: true,   /* שורט — פרופורציה אנכית */
    featured: true
  },
];

/* הקטגוריות שמופיעות ככפתורי סינון בעמוד השירים.
   אפשר להוסיף/לשנות — רק לוודא שהשם זהה לשדה category של השירים. */
window.SONG_CATEGORIES = [
  "ניגונים",
  "קליפים",
  "התחזקות",
  "אומן וראש השנה",
  "ליקוטי מוהר״ן",
  "נ נח",
  "בדרך"
];
