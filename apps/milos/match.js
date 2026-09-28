/* What Evia can see in a learner's write-up, for the assessor: which of the unit's "things to mention" it covers
   (the same matching Evia uses, synonyms included), which words line up with each KSB's statement, and where
   they are in the text, so Milos can highlight them. Also a first draft of the feedback. Nothing leaves the phone.
   It's a guide for the assessor, never a decision. */
import { PROMPTS, SYNONYMS, split, termMatched } from "../../packages/core/prompts.js";
import { esc } from "../../packages/core/nisia.js";

/* Words in KSB statements that say nothing about the job itself. */
const STOP = new Set(("about above after again against also among apply applying appropriate area areas being below between both carry carrying different during each ensure ensuring following from have including into know knowledge "+
  "make making methods more most other over principles relevant required requirements select selecting should skills some such that their them these they this those through types understand understanding "+
  "using when where which while will with within work working works able used uses range own around before first whole time good well there then than just very").split(" "));
const stem = (w) => { w = w.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3); else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2); else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  return w.slice(0, 5); };
const keywords = (statement) => [...new Set(String(statement || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w)).map(stem).filter((s) => s.length >= 3))];

/* Every word in the text, with where it is. */
function tokens(text) {
  const out = [], re = /[A-Za-z0-9][A-Za-z0-9'’-]*/g; let m;
  while ((m = re.exec(text))) out.push({ i: m.index, j: m.index + m[0].length, s: stem(m[0]) });
  return out;
}
/* Where a "thing to mention" is in the text: a synonym's match, or each of its main words. */
function termSpans(term, text, toks) {
  const lower = text.toLowerCase(), spans = [];
  for (let alt of term.toLowerCase().split("/")) {
    alt = alt.trim();
    const syn = SYNONYMS[alt];
    if (syn) { const re = new RegExp(syn.source, "g"); let m; while ((m = re.exec(lower)) && spans.length < 12) { if (!m[0]) { re.lastIndex++; continue; } spans.push([m.index, m.index + m[0].length]); } }
    const words = alt.replace(/&/g, " ").split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !["and", "the", "for", "with"].includes(w)).map((w) => w.replace(/s$/, "").slice(0, 5));
    if (words.length && words.every((w) => lower.includes(w))) toks.forEach((t) => { if (words.some((w) => text.slice(t.i, t.j).toLowerCase().startsWith(w))) spans.push([t.i, t.j]); });
  }
  return spans;
}

/* The analysis for one piece of evidence: C is the course (units and KSB statements), unit its unit, ksbs the codes
   to look at (the unit's and any mapped). */
export function analyse({ text, C, code, unit, ksbs, photos }) {
  text = String(text || "");
  const toks = tokens(text), P = (PROMPTS[code] || {})[unit] || {}, mention = split(P.writeup), capture = split(P.photos);
  const statement = (k) => ((C.ksbs || []).find((x) => x[0] === k) || [k, ""])[1];
  /* Things to mention covered, and where. */
  const terms = mention.map((t) => { const hit = termMatched(t, text); return { term: t, hit, spans: hit ? termSpans(t, text, toks) : [] }; });
  /* Each KSB: its statement's words found in the text, plus the things to mention that share its words. */
  const byKsb = {};
  for (const k of ksbs) {
    const kw = keywords(statement(k)), found = new Map(), spans = [];
    toks.forEach((t) => { const w = kw.find((s) => t.s.startsWith(s) || s.startsWith(t.s) && t.s.length >= 4); if (w) { found.set(w, text.slice(t.i, t.j)); spans.push([t.i, t.j]); } });
    /* Things to mention sharing the KSB's words; named only if they add a word not already listed. */
    terms.filter((t) => t.hit && keywords(t.term).some((s) => kw.includes(s))).forEach((t) => { if (!keywords(t.term).every((s) => found.has(s))) found.set("t:" + t.term, t.term); spans.push(...t.spans); });
    const words = [...new Set([...found.values()].map((w) => w.toLowerCase()))];
    byKsb[k] = { words, spans, likely: words.length >= 2 || (words.length >= 1 && kw.length <= 3) };
  }
  return { text, terms, byKsb, covered: terms.filter((t) => t.hit).map((t) => t.term), missing: terms.filter((t) => !t.hit).map((t) => t.term), capture, photos: photos || 0,
    words: toks.length, allSpans: [...terms.flatMap((t) => t.spans), ...Object.values(byKsb).flatMap((b) => b.spans)] };
}

/* The write-up with the matched words marked. only: a KSB code, to show just its words. */
export function highlighted(A, only) {
  const spans = (only ? (A.byKsb[only] || { spans: [] }).spans : A.allSpans).slice().sort((a, b) => a[0] - b[0]);
  let out = "", at = 0;
  for (const [i, j] of spans) { if (i < at) continue; out += esc(A.text.slice(at, i)) + '<mark class="ev-hl">' + esc(A.text.slice(i, j)) + "</mark>"; at = j; }
  return out + esc(A.text.slice(at));
}
/* A KSB statement with the words Evia found in the write-up marked. */
export function statementMarked(statement, words) {
  if (!words || !words.length) return esc(statement);
  const stems = words.flatMap((w) => keywords(w));
  return String(statement).split(/(\s+)/).map((w) => { const s = stem(w); return s.length >= 3 && stems.some((x) => s.startsWith(x) || x.startsWith(s) && s.length >= 4) ? '<mark class="ev-hl">' + esc(w) + "</mark>" : esc(w); }).join("");
}

/* A first draft of the feedback, in the assessor's voice, for them to edit. */
export function draftFeedback(A, { first, decision, ticked, unitName, nvq }) {
  const list = (xs) => xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1];
  const n = first || "", word = nvq ? "criteria" : "KSBs", met = [...ticked];
  const good = A.covered.slice(0, 4), gaps = A.missing.slice(0, 3), photoNote = A.photos >= 10 ? "" : A.photos >= 5 ? "a few more photos, especially from the start and end of the job" : "more photos: aim for ten or more, from the start, middle and end of the job";
  if (decision === "accepted") {
    const s = ["Well done" + (n ? " " + n : "") + ". This is good evidence of " + unitName.toLowerCase() + "."];
    if (good.length) s.push("You explained " + list(good) + (A.photos ? ", and your " + A.photos + " photo" + (A.photos === 1 ? "" : "s") + " back it up." : "."));
    if (met.length) s.push("It meets " + list(met) + ".");
    const next = [gaps.length ? "mention " + list(gaps) : "", photoNote].filter(Boolean);
    if (next.length) s.push("To make it even stronger next time, " + list(next) + ".");
    return s.join(" ");
  }
  const s = ["Thanks" + (n ? " " + n : "") + ", this is a good start on " + unitName.toLowerCase() + "."];
  const add = [gaps.length ? "explain " + list(gaps) + " in your own words" : "", photoNote, A.words < 60 ? "a fuller write-up: say what you did, in order, and why" : ""].filter(Boolean);
  s.push(add.length ? "Before I can sign it off, please add " + list(add) + "." : "Before I can sign it off, please add more detail on how you did the job and why.");
  s.push("Evia's guided mode will take you through it step by step.");
  return s.join(" ");
}
