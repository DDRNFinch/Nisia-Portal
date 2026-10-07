/* Symi shows Evia's Teach me pictures on its teaching slides. This copies the picture rules (.tp and .tp-*) out of
   Evia's ui.css into apps/symi/symi-teach-pics.css, so the pictures look the same in both. Run after changing them:
   node tools/build-symi-pics-css.mjs */
import fs from "node:fs";
const src = fs.readFileSync(new URL("../apps/evia/ui.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const isTp = (sel) => /\.tp(?![a-z0-9_])|\.tp-/.test(sel);
/* Top-level rules and @media blocks; inside a block, only its picture rules are kept. */
function rules(css) {
  const out = []; let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i); if (open < 0) break;
    const sel = css.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (j < css.length && depth) { if (css[j] === "{") depth++; else if (css[j] === "}") depth--; j++; }
    const body = css.slice(open + 1, j - 1);
    if (sel.startsWith("@media") || sel.startsWith("@supports")) { const inner = rules(body).filter((r) => isTp(r.sel)); if (inner.length) out.push({ sel, body: inner.map((r) => r.sel + "{" + r.body + "}").join("\n") }); }
    else if (!sel.startsWith("@")) out.push({ sel, body });
    i = j;
  }
  return out;
}
const kept = rules(src).filter((r) => r.sel.startsWith("@") || isTp(r.sel));
const css = "/* Made by tools/build-symi-pics-css.mjs from apps/evia/ui.css: Evia's Teach me picture styles. Don't edit by hand. */\n" +
  ".st-pic{--ui-ink:#172033;--ui-text:#344054;--ui-muted:#667085;--ui-on-accent:#fff;--yellow:#2ea36b;--yellow-ink:#1e6b45;--soft:#e8f5ee}\n" + kept.map((r) => r.sel + "{" + r.body.trim() + "}").join("\n") + "\n";
fs.writeFileSync(new URL("../apps/symi/symi-teach-pics.css", import.meta.url), css);
console.log(kept.length + " rules, " + css.length + " bytes");
