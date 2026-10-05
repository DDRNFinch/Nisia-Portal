/* Course packs from Nisia, for Milos, Paros and the portal: each course's topics and the KSBs (NVQ: criteria) they
   cover, and the standard's full wording. Kept on the device, so they work with no signal; packs that haven't changed
   aren't downloaded again. Before the first download, the copy in courses.js (made from the same files) stands in.

   loadPacks(rpc)        bring the packs up to date from Nisia (call on sync; with no signal, what's kept is used)
   coursePack(code)      a course in the shape the apps use: { name, std, units: [[topic, [codes], optional?]], ksbs: [[code,
                         wording]], nvq?, optional?, topics: [{id, name, ksbs}], pack?: {code, version, hash} }
   allCoursePacks()      every course, keyed by code
   topicFor(pack, e)     which topic a piece of evidence belongs to: its topic id, else its topic's name, else the topic
                         its KSBs fit best (so renaming or regrouping topics never loses evidence) */
import { COURSE_DATA } from "./courses.js";

const KEY = "nisia-packs-v1";
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (_) { return null; } };
let S = read() || { packs: {}, courses: {}, at: null };
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function loadPacks(rpc) {
  const have = Object.fromEntries(Object.values(S.packs).map((p) => [p.id, p.hash]));
  const r = await rpc("nisia_packs", { p_have: have });
  if (!r || !Array.isArray(r.packs)) return S;
  const packs = {};
  for (const p of r.packs) packs[p.id] = p.unchanged && S.packs[p.id] ? S.packs[p.id] : p;
  S = { packs, courses: r.courses || {}, at: new Date().toISOString() };
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) { /* full: keep it for this visit */ }
  return S;
}

function shape(code, p) {
  const fallback = COURSE_DATA[code] || {}, nvq = p.standard && p.standard.kind === "qualification";
  const std = nvq ? fallback.std || p.standard.code : p.standard.code + " v" + p.standard.version;
  const units = p.topics.map((t) => nvq ? [t.name, t.ksbs.map((k) => k.code), !!t.optional] : [t.name, t.ksbs.map((k) => k.code)]);
  const out = { name: fallback.name || p.title, std, units, ksbs: p.ksbs, topics: p.topics, pack: { code: p.code, version: p.version, hash: p.hash, title: p.title } };
  if (nvq) { out.nvq = true; out.optional = p.topics.filter((t) => t.optional).map((t) => String(t.id).split("-").pop()); }
  return out;
}

export function coursePack(code) {
  const id = S.courses && S.courses[code], p = id && S.packs[id];
  if (p && Array.isArray(p.topics)) return shape(code, p);
  const c = COURSE_DATA[code];
  return c ? Object.assign({}, c, { topics: c.units.map(([name, codes]) => ({ id: null, name, ksbs: codes.map((x) => ({ code: x })) })) }) : null;
}
export function allCoursePacks() { return Object.fromEntries(Object.keys(Object.assign({}, COURSE_DATA, S.courses)).map((k) => [k, coursePack(k)]).filter(([, v]) => v)); }

/* KSB codes of a piece of evidence (NVQ sub-points like 102.1.4a count as their criterion). */
export const evidenceCodes = (e) => { const m = (e && e.source_metadata) || {}; return [...new Set((m.ksbs || []).map((k) => String(k).split("|")[0].replace(/^(\d+\.\d+\.\d+)[a-z]$/, "$1")))]; };

export function topicFor(pack, e) {
  if (!pack || !pack.topics) return -1;
  const m = (e && e.source_metadata) || {}, unit = m.unit || (e && e.title) || "";
  let i = m.unitId ? pack.topics.findIndex((t) => t.id && t.id === m.unitId) : -1;
  if (i < 0) i = pack.topics.findIndex((t) => norm(t.name) === norm(unit));
  if (i >= 0) return i;
  /* By its KSBs: the topic that covers most of them (at least one). */
  const codes = evidenceCodes(e); if (!codes.length) return -1;
  let best = -1, most = 0;
  pack.topics.forEach((t, j) => { const n = t.ksbs.filter((k) => codes.includes(k.code)).length; if (n > most) { most = n; best = j; } });
  return best;
}
