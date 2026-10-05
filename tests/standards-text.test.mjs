// The standards reader: what the master admin pastes (or the PDF gives) becomes the library's items, and a draft
// turned back into text reads the same. Checked against Evia's three courses, word for word.   node tests/standards-text.test.mjs
import fs from "node:fs"; import path from "node:path"; import vm from "node:vm"; import { fileURLToPath } from "node:url";
import { parseStandard, standardText } from "../packages/core/standards-text.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0; const check = (what, ok, detail) => { console.log((ok ? "✓ " : "✗ ") + what + (ok || !detail ? "" : " — " + detail)); if (!ok) failed++; };
/* The seed's own payloads (what Evia's data becomes). */
const seed = fs.readFileSync(path.join(root, "services/supabase/standards-seed.sql"), "utf8");
const payloads = [...seed.matchAll(/save_standard\((\$[a-z]+\$)([\s\S]*?)\1::jsonb/g)].map((m) => JSON.parse(m[2]));
check("The seed holds ST0095, ST0264 and 6570-05", payloads.map((p) => p.code).join() === "ST0095,ST0264,6570-05");
const same = (a, b) => JSON.stringify(a.map(({ code, kind, title, parent, option, optional }) => ({ code, kind, title, parent: parent || null, option: option || null, optional: !!optional }))) ===
  JSON.stringify(b.map(({ code, kind, title, parent, option, optional }) => ({ code, kind, title, parent: parent || null, option: option || null, optional: !!optional })));
for (const p of payloads) {
  const r = parseStandard(standardText(p.requirements, p.kind, p.options), p.kind);
  check(p.code + ": written out as text and read back, every item is the same, word for word (" + p.requirements.length + ")", same(r.items, p.requirements) && !r.warnings.length,
    JSON.stringify({ n: r.items.length, warnings: r.warnings.slice(0, 3), first: r.items.find((x, i) => JSON.stringify(x) !== JSON.stringify(p.requirements[i])) }).slice(0, 400));
  if (p.options) check(p.code + ": its options come back too", JSON.stringify(r.options) === JSON.stringify(p.options), JSON.stringify(r.options));
}
/* As it comes off a web page or PDF: codes with colons, wording over several lines, headings and page numbers. */
const pasted = `Knowledge
K1: Awareness of health and safety
regulations, standards, and guidance.
K2 Safety control equipment.
Page 3 of 12
Skills
S1 - Interpret and follow verbal and written work instructions.
Behaviours
B1 Work safely.
Option: Site carpenter
K21 Site carpenter: Methods of fixing.`;
const r = parseStandard(pasted, "standard");
check("Pasted KSBs: codes with or without colons, wording over two lines, headings and page numbers skipped",
  r.items.length === 5 && r.items[0].title === "Awareness of health and safety regulations, standards, and guidance." && r.items[2].code === "S1" && r.items[2].title.startsWith("Interpret"), JSON.stringify(r.items));
check("…an option heading puts the next KSBs in that option", r.options[0].code === "site_carpenter" && r.items[4].option === "site_carpenter" && !r.items[0].option);
check("…and gaps in the numbering are pointed out", r.warnings.some((w) => /K3/.test(w) && /K20/.test(w)), JSON.stringify(r.warnings));
const q = parseStandard(`Unit 238 Constructing decorative brickwork (optional)
Learning outcome 1 Interpret information
1.1 Interpret the given information relating to the work, including:
• drawings
• specifications
1.2 Comply with the given contract information`, "qualification");
check("A qualification: an optional unit, its learning outcome, criteria and their listed points",
  q.items.length === 4 && q.items[0].optional && q.items[1].code === "238.1" && q.items[2].code === "238.1.1" && q.items[2].title.endsWith("including:\n• drawings\n• specifications") && q.items[3].parent === "238.1", JSON.stringify(q.items));
console.log(failed ? "\n" + failed + " check(s) failed." : "\nAll checks passed."); process.exit(failed ? 1 : 0);
