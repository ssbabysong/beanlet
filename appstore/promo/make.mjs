// 生成 App Store 的 Header（3840×1646）和搜索结果图（1920×1280），中英文各一版。
// 用法：node appstore/promo/make.mjs   （需要本机装有 Google Chrome）
import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const shots = join(here, "../screenshots");
const art = join(root, "public/watercolor-art");
const out = join(here, "out");
const tmp = join(here, ".html");
mkdirSync(out, { recursive: true });
mkdirSync(tmp, { recursive: true });
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const TEXT = {
  zh: { title: "每一包豆子，<br>每一杯<span class='mark'>咖啡</span>", sub: "豆仓、手冲记录和水彩咖啡图鉴，<br>一本温柔的咖啡日记。", tag: "一本温柔的咖啡日记" },
  en: { title: "Every bag.<br>Every <span class='mark'>cup</span>.", sub: "Your coffee shelf, brew log and<br>a watercolor coffee atlas.", tag: "A gentle coffee journal" },
};
const covers = ["hydrangea-el-paraiso-lychee", "onyx-geometry", "hydrangea-castillo-lulo-washed-finca-santa-monica", "counter-culture-hologram", "hydrangea-el-paraiso-peach"];

const css = `
@font-face{font-family:"Xiaolai";src:url("file://${root}/public/fonts/xiaolai/full.woff2") format("woff2")}
@font-face{font-family:"Annie";src:url("file://${root}/public/fonts/annie/regular.woff2") format("woff2")}
*{box-sizing:border-box;margin:0}
html,body{width:100%;height:100%;overflow:hidden}
body{background:#f5f6fb;color:#4c5675;position:relative;font-family:"Xiaolai",sans-serif}
body.en{font-family:"Annie","Xiaolai",cursive}
.blob{position:absolute;border-radius:50%;filter:blur(40px);opacity:.55}
.mark{background:linear-gradient(transparent 58%,#e4dcf3 58%,#e4dcf3 92%,transparent 92%);padding:0 .06em}
.word{display:block}
.phone{position:absolute;background:#59648a;padding:var(--b);border-radius:var(--r);box-shadow:0 30px 70px #59648a2e}
.phone img{display:block;width:100%;border-radius:calc(var(--r) - var(--b))}
.cover{position:absolute;border-radius:28%;box-shadow:0 18px 40px #59648a24;border:6px solid #fff}
`;
const cover = (i, x, y, s, r) => `<img class="cover" src="file://${art}/${covers[i]}.jpg" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;transform:rotate(${r}deg)">`;

function search(lang) {
  const t = TEXT[lang];
  return `<!doctype html><meta charset="utf-8"><style>${css}
.copy{position:absolute;left:120px;top:150px;width:1000px}
.word{width:440px}
.h{font-size:${lang === "zh" ? 104 : 120}px;line-height:1.22;margin-top:56px;color:#3f4866}
.sub{font-size:${lang === "zh" ? 42 : 50}px;line-height:1.55;margin-top:40px;color:#7a84a3}
.phone{--b:12px;--r:72px}
</style><body class="${lang}">
<div class="blob" style="left:1150px;top:80px;width:760px;height:760px;background:#e7e1f4"></div>
<div class="blob" style="left:-120px;top:820px;width:620px;height:520px;background:#e3eee8"></div>
<div class="copy"><img class="word" src="file://${root}/public/brand/beanlet-wordmark-original.png"><div class="h">${t.title}</div><div class="sub">${t.sub}</div></div>
<div class="phone" style="left:1270px;top:140px;width:540px;transform:rotate(4deg)"><img src="file://${shots}/${lang}-2-collection.png"></div>
${cover(0, 1100, 760, 230, -8)}${cover(1, 1700, 70, 190, 9)}${cover(2, 1640, 900, 210, 6)}
</body>`;
}

function header(lang) {
  const t = TEXT[lang];
  return `<!doctype html><meta charset="utf-8"><style>${css}
.left{position:absolute;left:300px;top:430px}
.word{width:1000px}
.tag{font-size:${lang === "zh" ? 104 : 120}px;margin-top:70px;color:#6b7596}
.phone{--b:14px;--r:84px}
</style><body class="${lang}">
<div class="blob" style="left:2050px;top:-120px;width:1500px;height:1200px;background:#e8e2f5"></div>
<div class="blob" style="left:120px;top:1100px;width:1300px;height:700px;background:#e3eee8"></div>
<div class="left"><img class="word" src="file://${root}/public/brand/beanlet-wordmark-original.png"><div class="tag">${t.tag}</div></div>
<div class="phone" style="left:2120px;top:300px;width:600px;transform:rotate(-7deg)"><img src="file://${shots}/${lang}-1-shelf.png"></div>
<div class="phone" style="left:3000px;top:320px;width:600px;transform:rotate(7deg)"><img src="file://${shots}/${lang}-6-atlas.png"></div>
<div class="phone" style="left:2540px;top:190px;width:660px"><img src="file://${shots}/${lang}-2-collection.png"></div>
${cover(0, 1850, 1150, 300, -9)}${cover(3, 3480, 120, 260, 10)}${cover(4, 1500, 180, 220, 7)}
</body>`;
}

for (const lang of ["zh", "en"]) {
  for (const [name, w, h, html] of [["search", 1920, 1280, search(lang)], ["header", 3840, 1646, header(lang)]]) {
    const file = join(tmp, `${name}-${lang}.html`), png = join(out, `${name}-${lang}-${w}x${h}.png`);
    writeFileSync(file, html);
    execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", "--allow-file-access-from-files", "--virtual-time-budget=8000", `--window-size=${w},${h}`, `--screenshot=${png}`, `file://${file}`], { stdio: "ignore" });
    console.log("ok", png);
  }
}
