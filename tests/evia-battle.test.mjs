/* Question Battle in Evia: two phones (Amy and Ben) play a whole battle against a stand-in Nisia that follows the
   same rules as battles.sql (5 HP, the attacker throws a card, a wrong answer is a hit, the answer stays on the
   "server" until it's answered). Checks the Learn banner, the lobby, matching, each sees the other's own Evia, a hand
   of 4 that's dealt fresh once used, hits and blocks with the right answer shown, and the win and loss screens.
   Run: node tests/evia-battle.test.mjs */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "apps", "evia");
const shots = path.resolve(root, "..", "..", "tests", "shots");
fs.mkdirSync(shots, { recursive: true });
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".jpg": "image/jpeg" };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split("?")[0]).replace(/\/$/, "/index.html"));
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
}).listen(0);
const url = "http://localhost:" + server.address().port + "/";
const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log((ok ? "✓ " : "✗ ") + name + (ok || !detail ? "" : " — " + detail)); };

/* ---- The stand-in Nisia: one battle table, as battles.sql ---- */
const B = { rows: [], log: [] };
const other = (s) => (s === "a" ? "b" : "a");
const sideOf = (v, who) => (v.a === who ? "a" : v.b === who ? "b" : null);
function resolve(v, choice) {
  const d = other(v.turn), ok = choice != null && choice === v.card.a, dmg = ok ? 0 : v.card.kind === "boss" ? 2 : 1, heal = ok && v.card.kind === "boss" ? 1 : 0;
  const hp = Math.max(0, Math.min(5, v["hp_" + d] - dmg + heal)); v["hp_" + d] = hp; v.moves++;
  v.last = { seq: v.moves, by: v.turn, q: v.card.q, opts: v.card.opts, kind: v.card.kind, a: v.card.a, why: v.card.why, choice, correct: ok, dmg, heal, timeout: choice == null };
  v.card = null;
  if (hp <= 0) { v.status = "done"; v.winner = v.turn; v.phase = null; } else { v.turn = d; v.phase = "pick"; }
}
function view(v, who) {
  const me = sideOf(v, who), them = other(me);
  return JSON.parse(JSON.stringify({ id: v.id, side: me, status: v.status, turn: v.turn, phase: v.phase, moves: v.moves, winner: v.winner, hp_me: v["hp_" + me], hp_them: v["hp_" + them],
    me: v[me + "_who"], them: v[them + "_who"] || {}, card: v.phase === "answer" ? { q: v.card.q, opts: v.card.opts, kind: v.card.kind } : null, secs_left: v.status === "playing" ? 20 : null, last: v.last }));
}
function nisia(who, name, a) {
  B.log.push([who, name]);
  if (name === "battleFind") {
    let v = B.rows.find((r) => (r.a === who || r.b === who) && r.status === "playing"); if (v) return { id: v.id, side: sideOf(v, who) };
    v = B.rows.find((r) => r.status === "waiting" && r.a !== who);
    if (v) { Object.assign(v, { b: who, b_who: { name: a.p_name, look: a.p_look, course: a.p_course }, status: "playing", turn: "a", phase: "pick" }); return { id: v.id, side: "b" }; }
    v = { id: "BT" + (B.rows.length + 1), a: who, a_who: { name: a.p_name, look: a.p_look, course: a.p_course }, status: "waiting", hp_a: 5, hp_b: 5, moves: 0, last: null, card: null };
    B.rows.push(v); return { id: v.id, side: "a" };
  }
  const v = B.rows.find((r) => r.id === a.p_id); if (!v || !sideOf(v, who)) throw new Error("That battle isn’t yours.");
  if (name === "battleState") return view(v, who);
  if (name === "battleAttack") {
    if (v.phase !== "pick" || sideOf(v, who) !== v.turn) throw new Error("It isn’t your turn.");
    v.card = { ...a.p_card }; v.phase = "answer"; return null;
  }
  if (name === "battleAnswer") {
    if (v.phase !== "answer" || sideOf(v, who) === v.turn) throw new Error("Nothing to answer.");
    resolve(v, a.p_choice); return view(v, who);
  }
  if (name === "battleLeave") { if (v.status === "waiting") v.status = "expired"; else if (v.status === "playing") { v.status = "done"; v.winner = other(sideOf(v, who)); v.last = { seq: ++v.moves, left: sideOf(v, who) }; } return null; }
}
const live = () => B.rows.find((r) => r.status !== "expired");

const browser = await pw.chromium.launch();
const errors = [];
async function phone(who, name, setup) {
  const ctx = await browser.newContext({ ...pw.devices["Pixel 7"], reducedMotion: "reduce" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(who + ": " + e.message));
  await page.exposeFunction("fakeNisia", (n, a) => { try { return { ok: nisia(who, n, a) }; } catch (e) { return { err: e.message }; } });
  await page.goto(url + "manifest.json");
  await page.evaluate(([name, setup]) => {
    localStorage.clear(); sessionStorage.setItem("evia7-install-later", "1"); ["evia7-theme-picked", "evia7-shape-picked"].forEach((k) => localStorage.setItem(k, "1"));
    localStorage.setItem("evia7-onboarding", '{"stage":"done"}'); localStorage.setItem("evia7-tips-seen", '["*"]'); localStorage.setItem("evia7-home-tip", JSON.stringify({ day: new Date().toDateString(), id: "x" }));
    localStorage.setItem("evia7-profile", JSON.stringify({ name, start: "2024-11-01", end: "2026-12-01" }));
    Object.entries(setup).forEach(([k, v]) => localStorage.setItem(k, v));
  }, [name, setup]);
  await page.goto(url); await page.waitForTimeout(1800);
  await page.evaluate(() => {
    document.getElementById("app").classList.remove("welcome-app-hidden"); const w = document.getElementById("welcome-screen"); if (w) w.remove();
    window.eviaNisia.joined = () => ({ live: true, college: "Brookfield" });
    window.NisiaActions = { send: async (n, a) => { const r = await window.fakeNisia(n, a); if (r.err) throw new Error(r.err); return r.ok; } };
    nav("teach");
  });
  await page.waitForTimeout(500);
  return page;
}
const text = (p, s = ".gm-body") => p.textContent(s).catch(() => "");
const until = async (p, fn, arg, ms = 8000) => { try { await p.waitForFunction(fn, arg, { timeout: ms, polling: 100 }); } catch (e) { throw new Error("waiting for " + String(fn).slice(0, 90) + " · screen: " + (await text(p)).slice(0, 200)); } };

try {
  const amy = await phone("amy", "Amy Clarke", { "evia7-theme": "blue", "evia7-shape": "cloud", "evia7-leaderboard": JSON.stringify({ on: true, name: "Amy C" }) });
  const ben = await phone("ben", "Ben Okafor", { "evia7-theme": "rainbow", "evia7-shape": "cat" });

  const learn = await amy.evaluate(() => ({ banner: !!document.querySelector("#screen .bt-banner"), first: document.querySelector("#screen .tt-games-head + .bt-banner") !== null, inGrid: !!document.querySelector('.tg-games [data-key="battle"]') }));
  await amy.screenshot({ path: shots + "/evia-battle-learn.png" });
  check("Learn: Question Battle is a big banner at the top of the games (not a locked tile)", learn.banner && learn.first && !learn.inGrid, JSON.stringify(learn));

  await amy.click("#screen .bt-banner"); await amy.waitForSelector(".bt-lobby");
  const lobby = await text(amy);
  await amy.screenshot({ path: shots + "/evia-battle-lobby.png" });
  check("The lobby: Amy's own Evia, the rules (5 HP, 4 cards then 4 fresh, boss cards) and Find a battle", /Amy C\./.test(lobby) && /5 HP/.test(lobby) && /4 fresh/.test(lobby) && /Boss/.test(lobby) && !!(await amy.$(".bt-lobby .rw-evia.shape-cloud")) && !!(await amy.$("[data-find]")), lobby);

  await amy.click("[data-find]"); await amy.waitForSelector(".bt-wait");
  await amy.screenshot({ path: shots + "/evia-battle-waiting.png" });
  check("Finding: Amy waits for someone at her college", /Looking for someone/.test(await text(amy)) && live().status === "waiting");

  await ben.click("#screen .bt-banner"); await ben.waitForSelector("[data-find]"); await ben.click("[data-find]");
  await until(ben, () => !!document.querySelector(".bt-vs,.bt-play")); await until(amy, () => !!document.querySelector(".bt-vs,.bt-play"));
  await ben.screenshot({ path: shots + "/evia-battle-vs.png" });
  const vs = { amy: await text(amy), ben: await text(ben) };
  check("Matched: both see VS with the other's name", /Ben O\./.test(vs.amy) && /Amy C\./.test(vs.ben), JSON.stringify(vs));

  await until(amy, () => document.querySelectorAll(".bt-hand .bt-card").length === 4);
  await until(ben, () => !!document.querySelector(".bt-play .bt-say"));
  const looks = { amyTop: await amy.$eval(".bt-top .rw-evia", (e) => e.className + " " + (e.hasAttribute("data-legendary") ? "legendary" : "")), benTop: await ben.$eval(".bt-top .rw-evia", (e) => e.className) };
  await amy.screenshot({ path: shots + "/evia-battle-hand.png" });
  check("Each sees the other's own Evia at the top (Ben's rainbow cat, Amy's blue cloud)", /shape-cat/.test(looks.amyTop) && /legendary/.test(looks.amyTop) && /shape-cloud/.test(looks.benTop), JSON.stringify(looks));
  check("Amy's attack: a hand of 4 cards from her course, each with its type; Ben waits", /Your attack/.test(await text(amy)) && /4 of 4 cards left/.test(await text(amy)) && /is choosing/.test(await text(ben)) &&
    (await amy.$$eval(".bt-card .bt-kind", (k) => k.every((x) => /Quickfire|Thinking|Trap|Boss/.test(x.textContent)))));
  const firstHand = await amy.$$eval(".bt-card .bt-q", (q) => q.map((x) => x.textContent));

  /* Amy throws: Ben gets the question (without the answer) and answers wrong. */
  await amy.click('[data-card="0"]');
  await until(ben, () => document.querySelectorAll(".bt-answers button").length >= 2);
  await ben.screenshot({ path: shots + "/evia-battle-incoming.png" });
  const seen = await ben.evaluate(() => document.querySelector(".bt-incoming").textContent);
  check("Ben gets a question attack with a clock and the answers to block with", /QUESTION ATTACK/.test(seen) && !!(await ben.$(".bt-clock")) && live().card && live().phase === "answer");
  const lose = live().card.kind === "boss" ? 2 : 1, wrong = (live().card.a + 1) % live().card.opts.length;
  await ben.click(`[data-ans="${wrong}"]`);
  await until(ben, () => !!document.querySelector(".bt-fx.hit"));
  const hitText = await text(ben);
  await ben.screenshot({ path: shots + "/evia-battle-hit.png" });
  check("Wrong: HIT, −1 HP (−2 for a boss card), and Ben is shown the right answer", /HIT!/.test(hitText) && new RegExp("−" + lose + " HP").test(hitText) && /The answer/.test(hitText) && live().hp_b === 5 - lose, hitText);
  await until(amy, () => /Ben O\. is choosing/.test(document.querySelector(".gm-body").textContent));
  check("Amy's card is used up: 3 left", /3 of 4 cards in your hand/.test(await text(amy)));

  /* Ben's turn: he throws, Amy blocks. */
  await until(ben, () => document.querySelectorAll(".bt-hand .bt-card").length === 4);
  await ben.screenshot({ path: shots + "/evia-battle-ben-hand.png" });
  await ben.click('[data-card="0"]');
  await until(amy, () => document.querySelectorAll(".bt-answers button").length >= 2);
  await amy.click(`[data-ans="${live().card.a}"]`);
  await until(amy, () => !!document.querySelector(".bt-fx.block"));
  await amy.screenshot({ path: shots + "/evia-battle-blocked.png" });
  check("Right: BLOCKED, no damage", /BLOCKED!/.test(await text(amy)) && live().hp_a === 5);

  /* Amy uses the rest of her hand (Ben blocks once), then gets 4 fresh cards. */
  let thrown = 1, round = 0;
  async function amyThrows(hit) {
    await until(amy, () => document.querySelectorAll(".bt-hand .bt-card").length > 0, null, 10000);
    await amy.click('[data-card="0"]'); thrown++;
    await until(ben, () => document.querySelectorAll(".bt-answers button").length >= 2);
    const c = live().card; await ben.click(`[data-ans="${hit ? (c.a + 1) % c.opts.length : c.a}"]`);
    await until(ben, () => !!document.querySelector(".bt-fx"));
    /* Ben's turn back: he throws and Amy blocks. */
    if (live().status !== "playing") return;
    await until(ben, () => document.querySelectorAll(".bt-hand .bt-card").length > 0, null, 10000);
    await ben.click('[data-card="0"]');
    await until(amy, () => document.querySelectorAll(".bt-answers button").length >= 2);
    await amy.click(`[data-ans="${live().card.a}"]`);
    await until(amy, () => !!document.querySelector(".bt-fx"));
    round++;
  }
  await amyThrows(false); await amyThrows(false); await amyThrows(true);
  await until(amy, () => document.querySelectorAll(".bt-hand .bt-card").length === 4, null, 10000);
  const secondHand = await amy.$$eval(".bt-card .bt-q", (q) => q.map((x) => x.textContent));
  check("All 4 cards used: Amy gets 4 fresh ones (no repeats)", thrown === 4 && /4 of 4 cards left/.test(await text(amy)) && secondHand.every((q) => !firstHand.includes(q)), JSON.stringify({ thrown, firstHand, secondHand }));

  /* A boss card: Ben's wrong answer costs 2. */
  live().hp_b = 5; const hpBefore = 5; /* (cards are random: top Ben up so this test always has room) */
  await until(amy, () => document.querySelectorAll(".bt-hand .bt-card").length > 0);
  await amy.click('[data-card="0"]');
  await until(ben, () => document.querySelectorAll(".bt-answers button").length >= 2);
  live().card.kind = "boss"; await ben.click(`[data-ans="${(live().card.a + 1) % live().card.opts.length}"]`);
  await until(ben, () => !!document.querySelector(".bt-fx.hit"));
  check("A boss card hits for 2", live().hp_b === hpBefore - 2 && /−2 HP/.test(await text(ben)), JSON.stringify({ hpBefore, now: live().hp_b }));

  /* Finish Ben off. */
  for (let i = 0; i < 6 && live().status === "playing"; i++) {
    await until(ben, () => document.querySelectorAll(".bt-hand .bt-card").length > 0, null, 10000);
    await ben.click('[data-card="0"]');
    await until(amy, () => document.querySelectorAll(".bt-answers button").length >= 2);
    await amy.click(`[data-ans="${live().card.a}"]`);
    await until(amy, () => document.querySelectorAll(".bt-hand .bt-card").length > 0 || !!document.querySelector(".bt-end"), null, 10000);
    await amy.click('[data-card="0"]');
    await until(ben, () => document.querySelectorAll(".bt-answers button").length >= 2);
    await ben.click(`[data-ans="${(live().card.a + 1) % live().card.opts.length}"]`);
    await until(ben, () => !!document.querySelector(".bt-fx") || !!document.querySelector(".bt-end"));
  }
  await until(amy, () => !!document.querySelector(".bt-end"), null, 10000); await until(ben, () => !!document.querySelector(".bt-end"), null, 10000);
  await amy.waitForTimeout(300);
  await amy.screenshot({ path: shots + "/evia-battle-won.png" }); await ben.screenshot({ path: shots + "/evia-battle-lost.png" });
  const endA = await text(amy), endB = await text(ben);
  check("Amy wins: You win! with coins", /You win!/.test(endA) && /\+20 coins/.test(endA) && live().winner === "a", endA);
  check("Ben: Good battle!, coins for playing, and the questions he got wrong to look at again", /Good battle!/.test(endB) && /\+5 coins/.test(endB) && /Worth another look/.test(endB), endB);
  const board = await amy.evaluate(() => [localStorage.getItem("evia7-leaderboard"), localStorage.getItem("evia7-lb-daily"), localStorage.getItem("evia7-lb-queue")].join(" "));
  check("The win counts on the Question Battle leaderboard (for those who joined it)", /battle/.test(board), board);

  /* Battle again goes straight back to finding someone; leaving a battle in play loses it. */
  await amy.click("[data-again]"); await amy.waitForSelector(".bt-wait");
  await ben.click("[data-again]"); await until(ben, () => !!document.querySelector(".bt-vs"));
  await until(ben, () => !!document.querySelector(".bt-play"), null, 8000);
  await ben.click(".gm-x"); await amy.waitForTimeout(200);
  await until(amy, () => !!document.querySelector(".bt-end"), null, 8000);
  check("If the other player leaves mid-battle, you win", /left\. You win!/.test(await text(amy)), await text(amy));

  check("No script errors", errors.length === 0, errors.join(" | "));
} catch (e) {
  check("The battle ran to the end", false, e.message.split("\n")[0] + " @ " + (e.stack.match(/evia-battle.test.mjs:(\d+)/) || [])[1]);
} finally { await browser.close(); server.close(); }
const bad = results.filter((x) => !x).length;
console.log(bad ? "\n" + bad + " of " + results.length + " checks failed." : "\nAll " + results.length + " checks passed.");
process.exit(bad ? 1 : 0);
