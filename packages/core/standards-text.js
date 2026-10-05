/* Reads a standard or qualification from text (pasted, or taken out of the official PDF) into what Nisia's library
   stores, so the master admin only has to check it, not type it.

   A standard:      K1 / S1 / B1 lines (wording can run over several lines). "Option: Site carpenter" starts an
                    option's KSBs; "Core" goes back to everyone's.
   A qualification: "Unit 102 Title" (add "(optional)" for an optional unit), "LO1 Title" or "Learning outcome 1 Title"
                    (or "1 Title") for a learning outcome, "1.1 Wording" for an assessment criterion, and "• point"
                    lines for a criterion's listed points.

   parseStandard(text, kind) → { items: [{code, kind, title, parent?, option?, optional?}], options: [{code, title}], warnings: [] }
   standardText(requirements, kind, options) → the text back again, to edit a draft. */
const KIND = { K: "knowledge", S: "skill", B: "behaviour" };
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
const tidy = (s) => s.replace(/\s+/g, " ").trim();
/* Bits of a PDF page that aren't the standard: page numbers, headers, footers. */
const noise = (l) => /^(page\s+)?\d+(\s+of\s+\d+)?$/i.test(l) || /^(©|copyright)/i.test(l);

export function parseStandard(text, kind) {
  const lines = String(text || "").replace(/\r/g, "").split("\n").map((l) => l.replace(/ /g, " ").trim());
  const items = [], options = [], warnings = [], seen = new Map();
  let cur = null, option = null, unit = null, outcome = null;
  const add = (it) => {
    const prev = seen.get(it.code);
    if (prev) { if (tidy(prev.title) !== tidy(it.title)) warnings.push(it.code + " appears twice with different wording: the first is kept."); cur = null; return; }
    seen.set(it.code, it); items.push(it); cur = it;
  };
  for (const raw of lines) {
    const l = raw.replace(/^[|\s]+|[|\s]+$/g, "");
    if (!l) { if (cur && kind === "qualification" && cur.kind !== "criterion") cur = null; continue; }
    if (noise(l)) continue;
    if (kind === "standard") {
      let m = /^(?:option|pathway)\s*[:\-–—]?\s*(.+)$/i.exec(l);
      if (m) { const t = tidy(m[1]).replace(/[:.]$/, ""), c = slug(t); if (!options.some((o) => o.code === c)) options.push({ code: c, title: t }); option = c; cur = null; continue; }
      if (/^core(\s+(knowledge|skills|behaviours|ksbs))?\s*:?$/i.test(l)) { option = null; cur = null; continue; }
      m = /^[•\-*]?\s*([KSB])\s?(\d{1,3})\b\s*[:.\-–—)]?\s*(.*)$/.exec(l);
      if (m) { add({ code: m[1] + +m[2], kind: KIND[m[1]], title: tidy(m[3]), ...(option ? { option } : {}) }); continue; }
      if (/^(knowledge|skills?|behaviours?|duties|ksbs?)\b.{0,40}$/i.test(l) && l.split(" ").length <= 5) { cur = null; continue; }
      if (cur) cur.title = tidy(cur.title + " " + l);
      continue;
    }
    /* A qualification. */
    let m = /^unit\s+([0-9]{2,4}[A-Z]?)\b[\s:.\-–—]*(.*)$/i.exec(l);
    if (m) {
      const opt = /\(optional\)|\boptional\b/i.test(m[2]);
      unit = { code: m[1].toUpperCase(), kind: "unit", title: tidy(m[2].replace(/\(optional\)/i, "")), ...(opt ? { optional: true } : {}) };
      outcome = null; add(unit); continue;
    }
    m = /^(?:lo|learning outcome|outcome)\s*([0-9]{1,2})\b[\s:.\-–—]*(.*)$/i.exec(l) || (unit && /^([0-9]{1,2})\s+([A-Z].*)$/.exec(l));
    if (m && unit) { outcome = { code: unit.code + "/" + +m[1], kind: "outcome", title: tidy(m[2]), parent: unit.code }; add(outcome); continue; }
    m = /^([0-9]{1,2})\.([0-9]{1,2})\s*[:.\-–—)]?\s+(.*)$/.exec(l);
    if (m && unit) {
      const oc = unit.code + "/" + +m[1];
      if (!seen.has(oc)) { outcome = { code: oc, kind: "outcome", title: "Learning outcome " + +m[1], parent: unit.code }; add(outcome); warnings.push(oc + " had no learning outcome heading: check its wording."); }
      add({ code: unit.code + "/" + +m[1] + "." + +m[2], kind: "criterion", title: tidy(m[3]), parent: oc }); continue;
    }
    m = /^[•\-*▪◦]\s*(.+)$/.exec(l);
    if (m && cur && cur.kind === "criterion") { cur.title += "\n• " + tidy(m[1]); continue; }
    if (cur && !(cur.kind === "unit" && cur.title && /^(learning outcomes?|assessment criteria|the learner (will|can))/i.test(l))) {
      if (cur.kind === "criterion" && cur.title.includes("\n• ")) { const parts = cur.title.split("\n"); parts[parts.length - 1] = tidy(parts[parts.length - 1] + " " + l); cur.title = parts.join("\n"); }
      else cur.title = tidy(cur.title + " " + l);
    }
  }
  /* What to check. */
  for (const it of items) if (!it.title) warnings.push(it.code + " has no wording.");
  if (kind === "standard") {
    for (const L of "KSB") {
      const ns = items.filter((x) => x.code[0] === L).map((x) => +x.code.slice(1)).sort((a, b) => a - b);
      if (!ns.length) { warnings.push("No " + KIND[L] + " (" + L + ") found."); continue; }
      const missing = []; for (let n = 1; n <= ns[ns.length - 1]; n++) if (!ns.includes(n)) missing.push(L + n);
      if (missing.length) warnings.push("Missing in the numbering: " + missing.join(", ") + ".");
    }
  } else {
    if (!items.some((x) => x.kind === "unit")) warnings.push("No units found: each should start “Unit 102 Title”.");
    for (const u of items.filter((x) => x.kind === "unit")) if (!items.some((x) => x.kind === "criterion" && x.parent && x.parent.startsWith(u.code + "/"))) warnings.push("Unit " + u.code + " has no assessment criteria.");
  }
  return { items, options, warnings };
}

export function standardText(reqs, kind, options) {
  const out = [], optTitle = Object.fromEntries((options || []).map((o) => [o.code, o.title]));
  if (kind === "standard") {
    /* In the library's order, with a heading wherever it moves between the core and an option. */
    let opt = null;
    for (const r of reqs) { if ((r.option || null) !== opt) { opt = r.option || null; out.push("", opt ? "Option: " + (optTitle[opt] || opt) : "Core"); } out.push(r.code + " " + r.title); }
    return out.join("\n").trim();
  }
  for (const r of reqs) {
    if (r.kind === "unit") out.push("", "Unit " + r.code + " " + r.title + (r.optional ? " (optional)" : ""));
    else if (r.kind === "outcome") out.push("LO" + r.code.split("/")[1] + " " + r.title);
    else if (r.kind === "criterion") out.push(r.code.split("/")[1] + " " + r.title);
  }
  return out.join("\n").trim();
}
