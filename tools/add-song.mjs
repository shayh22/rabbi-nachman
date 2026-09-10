#!/usr/bin/env node
/* =========================================================================
   tools/add-song.mjs — כלי ניהול להוספת שירים לאתר
   -------------------------------------------------------------------------
   כלי צד־שרת בלבד. הוא אינו חלק מהאתר ואינו נגיש לגולשים — רק מנהל האתר
   מריץ אותו מהמחשב שלו כדי להוסיף סרטונים.

   שימוש:
     node tools/add-song.mjs <קישור> [<קישור> ...] [אפשרויות]

   אפשרויות:
     --category "ניגונים"   קטגוריה לכל הקישורים שברשימה (ברירת מחדל: ניגונים)
     --title "שם"           שם ידני. תקף רק כשמוסיפים קישור אחד
     --artist "מבצע"        מבצע. ברירת מחדל: שם הערוץ מיוטיוב
     --year "2025"          שנה. ברירת מחדל: השנה הנוכחית. "" משאיר ריק
     --no-featured          לא להציג בעמוד הבית (ברירת מחדל: כן)
     --end                  להוסיף בסוף הרשימה במקום בראשה
     --remove               להסיר את הסרטונים שברשימה מהאתר

   דוגמאות:
     node tools/add-song.mjs https://youtu.be/6v-84PWb9rk
     node tools/add-song.mjs https://youtu.be/AAA https://youtu.be/BBB --category קליפים
   ========================================================================= */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SONGS_FILE = join(ROOT, "data", "songs.js");

/* ---------- פענוח שורת הפקודה ---------- */

function parseArgs(argv) {
  const out = { urls: [], category: "ניגונים", featured: true, end: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--category") out.category = argv[++i];
    else if (a === "--title") out.title = argv[++i];
    else if (a === "--artist") out.artist = argv[++i];
    else if (a === "--year") out.year = argv[++i];
    else if (a === "--no-featured") out.featured = false;
    else if (a === "--end") out.end = true;
    else if (a === "--remove") out.remove = true;
    else if (a.startsWith("--")) fail(`אפשרות לא מוכרת: ${a}`);
    else out.urls.push(a);
  }
  return out;
}

function fail(msg) {
  console.error("✗ " + msg);
  process.exit(1);
}

/* ---------- מזהה הסרטון ---------- */

function videoId(url) {
  const u = String(url).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(u)) return u;
  const pats = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/live\/([A-Za-z0-9_-]{11})/
  ];
  for (const p of pats) {
    const m = u.match(p);
    if (m) return m[1];
  }
  return null;
}

/* ---------- זיהוי פרופורציה: שורט אנכי או סרטון רוחבי ----------
   ליוטיוב יש תמונה בשם oardefault.jpg ("original aspect ratio") רק
   לסרטונים שאינם 16:9. אם היא קיימת — קוראים ממנה את המידות. */

function jpegSize(buf) {
  var i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xFF) { i++; continue; }
    var marker = buf[i + 1];
    if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) { i += 2; continue; }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

async function isVertical(id) {
  try {
    const r = await fetch("https://i.ytimg.com/vi/" + id + "/oardefault.jpg");
    if (!r.ok) return false;                      /* אין תמונה כזו → הסרטון רוחבי */
    const size = jpegSize(Buffer.from(await r.arrayBuffer()));
    return !!size && size.h > size.w;
  } catch (e) {
    return false;
  }
}

/* ---------- שליפת פרטי הסרטון ---------- */

async function fetchMeta(id) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent("https://youtu.be/" + id)}&format=json`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    return { title: d.title || "", author: d.author_name || "" };
  } catch (e) {
    return null;
  }
}

/* מנקה האשטגים ורווחים כפולים משם הסרטון */
function cleanTitle(t) {
  return String(t || "")
    .replace(/#[^\s#]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s|·\-–—]+$/, "")
    .trim();
}

function jsStr(s) {
  return '"' + String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

function block(song) {
  const lines = [
    "  {",
    `    id: ${jsStr(song.id)},`,
    `    title: ${jsStr(song.title)},`,
    `    category: ${jsStr(song.category)},`,
    `    artist: ${jsStr(song.artist)},`,
    `    year: ${jsStr(song.year)},`,
    '    words: "",',
    '    lyrics: "",'
  ];
  if (song.vertical) lines.push("    vertical: true,   /* שורט — פרופורציה אנכית */");
  lines.push(`    featured: ${song.featured}`, "  },", "");
  return lines.join("\n");
}

/* ---------- ראשי ---------- */

const args = parseArgs(process.argv.slice(2));
if (!args.urls.length) {
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("=====")[1]);
  process.exit(0);
}
if (args.title && args.urls.length > 1) fail("‎--title תקף רק כשמוסיפים קישור אחד");

let file = readFileSync(SONGS_FILE, "utf8");
const anchor = "window.SONGS = [\n";
if (!file.includes(anchor)) fail("לא מצאתי את window.SONGS בקובץ data/songs.js");

/* ---------- הסרה ---------- */

if (args.remove) {
  const removed = [];
  for (const url of args.urls) {
    const id = videoId(url);
    if (!id) { console.error(`✗ לא זיהיתי מזהה סרטון: ${url}`); continue; }
    const re = new RegExp("\\n?\\s*\\{[^{}]*?id:\\s*\"" + id + "\"[^{}]*?\\},?\\n", "s");
    const m = file.match(re);
    if (!m) { console.log(`• לא נמצא באתר: ${id}`); continue; }
    const title = (m[0].match(/title:\s*"([^"]*)"/) || [])[1] || id;
    file = file.replace(re, "\n");
    removed.push(title);
  }
  if (!removed.length) { console.log("לא הוסר דבר."); process.exit(0); }

  writeFileSync(SONGS_FILE, file);
  const after = { SONGS: null };
  new Function("window", readFileSync(SONGS_FILE, "utf8"))(after);
  if (!Array.isArray(after.SONGS)) fail("הקובץ נשבר — בדוק את data/songs.js");

  console.log(`\n✓ הוסרו ${removed.length} · נותרו באתר: ${after.SONGS.length}`);
  for (const t of removed) console.log(`  · ${t}`);
  console.log("\nכעת: node tools/prerender.mjs   (מטמיע את השינוי גם ב-HTML, לטובת מנועי חיפוש)");
console.log("ואז: git add -A && git commit && git push");
  process.exit(0);
}

/* ---------- הוספה ---------- */

const added = [];
let insert = "";

for (const url of args.urls) {
  const id = videoId(url);
  if (!id) { console.error(`✗ לא זיהיתי מזהה סרטון: ${url}`); continue; }
  if (file.includes(`id: "${id}"`)) { console.log(`• כבר קיים באתר, מדלג: ${id}`); continue; }

  const meta = await fetchMeta(id);
  if (!meta) console.error(`  (לא הצלחתי לשלוף פרטים מיוטיוב עבור ${id} — נדרש שם ידני)`);

  const vertical = await isVertical(id);

  const song = {
    id,
    vertical,
    title: args.title || cleanTitle(meta && meta.title) || "שיר חדש — לעדכן שם",
    category: args.category,
    artist: args.artist || (meta && meta.author) || "",
    year: args.year !== undefined ? args.year : String(new Date().getFullYear()),
    featured: args.featured
  };

  insert += block(song);
  added.push(song);
}

if (!added.length) { console.log("לא נוסף דבר."); process.exit(0); }

if (args.end) {
  /* חשוב: הסוגר של window.SONGS, ולא של מערך הקטגוריות שבסוף הקובץ */
  const close = file.indexOf("];", file.indexOf(anchor));
  if (close === -1) fail("לא מצאתי את סוף הרשימה window.SONGS");
  file = file.slice(0, close) + insert + file.slice(close);
} else {
  const at = file.indexOf(anchor) + anchor.length;
  file = file.slice(0, at) + "\n" + insert + file.slice(at);
}

writeFileSync(SONGS_FILE, file);

/* בדיקה שהקובץ עדיין תקין ושהשירים נטענים */
const check = { SONGS: null };
new Function("window", readFileSync(SONGS_FILE, "utf8"))(check);
if (!Array.isArray(check.SONGS)) fail("הקובץ נשבר — בדוק את data/songs.js");

console.log(`\n✓ נוספו ${added.length} שירים · סה״כ באתר: ${check.SONGS.length}`);
for (const s of added) console.log(`  · ${s.title} — ${s.artist} [${s.category}]${s.vertical ? " · שורט אנכי" : ""}  https://youtu.be/${s.id}`);
console.log("\nכעת: node tools/prerender.mjs   (מטמיע את השינוי גם ב-HTML, לטובת מנועי חיפוש)");
console.log("ואז: git add -A && git commit && git push");
