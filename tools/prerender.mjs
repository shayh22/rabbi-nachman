#!/usr/bin/env node
/* =========================================================================
   tools/prerender.mjs — הטמעת התוכן הדינמי לתוך ה-HTML
   -------------------------------------------------------------------------
   רוב תוכן האתר (שירים, מסלולים, עדויות, צ׳ק ליסט) נוצר בזמן ריצה מקובצי
   הנתונים. גוגל מריץ JavaScript ולכן רואה אותו, אבל רוב הסורקים של מנועי
   ה-AI אינם מריצים — ובשבילם העמודים היו כמעט ריקים.

   הכלי טוען כל עמוד בדפדפן, לוקח את התוכן המוגמר, וכותב אותו בחזרה לתוך
   <main id="app"> שבקובץ המקור. בטעינה אמיתית ה-JS ממילא מחליף את התוכן
   באותו תוכן עצמו, ולכן אין כפילות ואין התנגשות.

   להריץ אחרי כל שינוי בקובצי data/:
       node tools/prerender.mjs
   ========================================================================= */

import { createServer } from "node:http";
import { readFile, readFileSync, writeFileSync } from "node:fs";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

/* Playwright הוא מודול CommonJS, ולכן נטען כך. מותקן גלובלית ברוב
   הסביבות; אם חסר — npm i -g playwright */
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (e) {
  try {
    ({ chromium } = require("/opt/node22/lib/node_modules/playwright"));
  } catch (e2) {
    console.error("✗ לא נמצא playwright. התקנה: npm i -g playwright");
    process.exit(1);
  }
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = ["index.html", "songs.html", "yeshuot.html", "tikkun.html", "route.html", "guide.html", "kashrut.html", "checklist.html"];
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
                ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
                ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml" };

const server = createServer((req, res) => {
  const path = join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  readFile(path, (err, data) => {
    if (err) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" });
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } });

/* שירותים חיצוניים נחסמים, כדי שלא ייכנס לקובץ מצב ריצה של ווידג׳טים או נגן */
for (const url of ["**://web-feeds.shayh22.workers.dev/**", "**://www.youtube.com/**",
                   "**://*.ytimg.com/**", "**://fonts.googleapis.com/**"]) {
  await ctx.route(url, (r) => r.abort());
}

let changed = 0;
for (const file of PAGES) {
  const page = await ctx.newPage();
  await page.goto(`${base}/${file}`, { waitUntil: "load" });
  await page.waitForTimeout(900);

  const html = await page.evaluate(() => {
    const app = document.getElementById("app").cloneNode(true);
    /* מנקים סימני מצב שנוצרו בזמן ריצה ואינם שייכים לקובץ המקור */
    app.querySelectorAll(".song.playing").forEach((n) => n.classList.remove("playing"));
    app.querySelectorAll("[data-tells-mounted]").forEach((n) => {
      n.removeAttribute("data-tells-mounted");
      n.classList.remove("tlx");
      n.innerHTML = "";
    });
    const cd = app.querySelector("#countdown");
    if (cd) cd.innerHTML = "";                 /* ספירה לאחור נכתבת מחדש בכל טעינה */
    return app.innerHTML;
  });
  await page.close();

  const src = readFileSync(join(ROOT, file), "utf8");
  const open = src.indexOf('<main id="app"');
  const start = src.indexOf(">", open) + 1;
  const end = src.indexOf("</main>", start);
  const updated = src.slice(0, start) + html + src.slice(end);

  if (updated !== src) { writeFileSync(join(ROOT, file), updated); changed++; }
  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  console.log(`${file.padEnd(16)} ${String(words).padStart(5)} מילים בקובץ`);
}

await browser.close();
server.close();
console.log(`\n✓ ${changed} עמודים עודכנו. התוכן קריא עכשיו גם בלי JavaScript.`);
