#!/usr/bin/env node
/* =========================================================================
   tools/share-image.mjs — יצירת תמונת השיתוף (og:image)
   -------------------------------------------------------------------------
   זו התמונה שמופיעה כשמדביקים קישור לאתר בוואטסאפ, בטלגרם ובפייסבוק.
   היא נבנית מאותו סמל להבה שבהדר, כדי שהכול ייראה אותו דבר.

   ההרכב ממורכז בכוונה: חלק מהאפליקציות חותכות את התצוגה המקדימה לריבוע,
   ומה שיושב בקצוות פשוט נעלם שם.

   להריץ אחרי כל שינוי בסמל:
       node tools/share-image.mjs
   ========================================================================= */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

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
const OUT = join(ROOT, "assets/img/share.jpg");
const W = 1200, H = 630;

const mark = readFileSync(join(ROOT, "assets/img/kisufim-mark.svg"), "utf8")
  .replace(/<\?xml[^>]*\?>/, "");

/* הגופן מוטמע בקובץ עצמו, כדי שהתמונה תיראה זהה בכל מכונה שתריץ את הכלי.
   אם אין רשת — נופלים לגופן המערכת, והתמונה עדיין נוצרת. */
async function heebo() {
  const local = join(ROOT, "tools/heebo.woff2");
  if (existsSync(local)) return readFileSync(local).toString("base64");
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Heebo:wght@400..900&display=swap",
      /* בלי מחרוזת דפדפן מודרנית גוגל מגישה TTF כבד במקום woff2 */
      { headers: { "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" } }
    ).then((r) => r.text());
    const url = (css.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
    if (!url) { console.warn("  ⚠ לא נמצא woff2 בתשובת גוגל — גופן מערכת"); return null; }
    const buf = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
    writeFileSync(local, buf);
    console.log("  הגופן הורד ונשמר ב-tools/heebo.woff2");
    return buf.toString("base64");
  } catch (e) {
    console.warn("  ⚠ הגופן לא ירד — משתמשים בגופן המערכת");
    return null;
  }
}

const font = await heebo();

const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>
${font ? `@font-face{font-family:Heebo;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:100 900;font-display:block}` : ""}
*{margin:0;padding:0;box-sizing:border-box}
body{
  width:${W}px;height:${H}px;overflow:hidden;
  font-family:Heebo,"Noto Sans Hebrew",system-ui,sans-serif;
  background:
    radial-gradient(46% 62% at 30% 50%, rgba(226,97,13,.30), transparent 68%),
    radial-gradient(70% 90% at 78% 16%, rgba(224,180,81,.13), transparent 62%),
    #0E0D14;
  display:flex;align-items:center;justify-content:center;gap:52px;
}
.flame{width:318px;height:318px;flex:none;filter:drop-shadow(0 18px 46px rgba(226,97,13,.42))}
.flame svg{width:100%;height:100%;display:block}
.words{text-align:right}
h1{
  font-size:96px;font-weight:900;line-height:1.04;letter-spacing:-.01em;
  background:linear-gradient(100deg,#FFDA6B,#F2941B 46%,#C7361B);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
p.sub{margin-top:20px;font-size:33px;font-weight:500;color:#b9b3c9}
p.na{margin-top:26px;font-size:25px;font-weight:800;color:#E0B451;letter-spacing:.01em}
</style></head><body>
  <div class="flame">${mark}</div>
  <div class="words">
    <h1>כיסופים לרבינו</h1>
    <p class="sub">שירים, קליפים והדרך לאומן</p>
    <p class="na">נ נח נחמ נחמן מאומן</p>
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(250);
await page.screenshot({ path: OUT, type: "jpeg", quality: 92 });
await browser.close();

const kb = Math.round(readFileSync(OUT).length / 1024);
console.log(`✓ ${OUT}  ${W}×${H}  ${kb} KB`);
if (kb > 300) console.warn("  ⚠ מעל 300 KB — יש אפליקציות שמדלגות על תמונה כזאת");
