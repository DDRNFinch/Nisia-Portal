/* Symi left on the classroom screen: the check-in code showing (a new QR every 20 seconds) and the register's timers
   running, the way a tutor leaves it all morning. Its memory must level off, not keep climbing, or the screen
   slows and stops by the afternoon. Measured after clean-ups, minute by minute.
   Run: node tests/e2e/symi-all-day.e2e.mjs [minutes, default 6]   (needs Postgres 16) */
import { check, site, errors, app, signIn, finish } from "./harness.mjs";

const MINUTES = Number(process.argv[2]) || 6;
try {
  const symi = await app();
  await symi.page.goto(site + "/apps/symi/update.json");
  await symi.page.evaluate(() => {
    localStorage.clear();
    const d = new Date(), key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const L = [{ id: "x1", name: "Lee Erna", externalId: "" }];
    localStorage.setItem("symi-last-seen-release-v1", "9.9.9");
    localStorage.setItem("samos.classroom.data", JSON.stringify({ settings: { teacherName: "Tee", centre: "" }, learners: L, teachingClasses: [], attendance: {}, history: [], resources: [], courses: [],
      classes: [{ id: "reg1", name: "L2 Brickwork", day: "Monday", room: "Workshop 1", start: "00:01", end: "23:58", breaks: [], learners: L, recurrence: { type: "once", onceDate: key, startDate: key, endDate: key } }],
      activeClassId: "reg1", view: "registers" }));
  });
  await symi.page.goto(site + "/apps/symi/"); await symi.page.waitForTimeout(1200);
  await symi.page.evaluate(() => window.SamosApp.openRegisters());
  await symi.page.evaluate(() => document.getElementById("nisiaButton").click()); await signIn(symi.page, "tee@e2e.test", ".sn-auth ");
  await symi.page.waitForFunction(() => document.querySelector("#nisiaButton.on"), null, { timeout: 10000 });
  await symi.page.waitForSelector("[data-sn-show]", { timeout: 15000 });
  await symi.page.click("[data-sn-show]");
  await symi.page.waitForSelector(".sn-checkin .sn-code:not(:empty)", { timeout: 15000 });
  const cdp = await symi.ctx.newCDPSession(symi.page);
  await cdp.send("Performance.enable");
  const sample = async () => {
    await cdp.send("HeapProfiler.collectGarbage");
    const m = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]));
    return { heap: m.JSHeapUsedSize / 1048576, nodes: m.Nodes, listeners: m.JSEventListeners };
  };
  const points = [await sample()];
  for (let i = 1; i <= MINUTES; i++) { await symi.page.waitForTimeout(60000); points.push(await sample()); console.log("  minute " + i + ": " + points[i].heap.toFixed(1) + " MB, " + points[i].nodes + " page parts, " + points[i].listeners + " listeners"); }
  /* Growth over the second half (after things settle), per hour of screen time. */
  const half = Math.floor(points.length / 2), a = points[half], z = points[points.length - 1], mins = points.length - 1 - half;
  const perHour = (z.heap - a.heap) / mins * 60, nodesPerHour = (z.nodes - a.nodes) / mins * 60;
  const code = (await symi.page.textContent(".sn-checkin .sn-code")).replace(/\s/g, "");
  check("Symi on the classroom screen for " + MINUTES + " minutes: memory levels off (" + perHour.toFixed(1) + " MB and " + Math.round(nodesPerHour) + " page parts an hour) and the code still changes",
    perHour < 5 && nodesPerHour < 2000 && code.length === 6, JSON.stringify(points.map((p) => [p.heap.toFixed(1), p.nodes, p.listeners])));
  check("No script errors", !errors.length, errors.join(" | "));
} catch (e) { check("The test finished", false, e.stack || e.message); }
await finish();
