/* Nisia actions: the one way the Nisia apps (Evia, Symi, Milos, Paros, the portal) ask Nisia to do something.
   Each action is one named request; Nisia checks who is asking before it does anything, so the apps never read or
   write Nisia's tables themselves. Actions that must survive no signal (checking in, booking days off, a finished
   register) are kept on the device and sent when there is signal again, in the order they were made.

   Plain script, so it works in Evia (classic scripts) and the module apps alike. The same file is copied into Evia
   (tools/sync-actions.sh); its version line must match.

   NisiaActions.use(call, {app})            call(fn, args) runs a Nisia function and returns its data, or throws
   NisiaActions.send(name, args, {tag})     run it now; a "keep" action with no signal is kept: {kept: true, at}
   NisiaActions.flush()                     send what's kept; resolves with [{name, tag, args, at, ok, result, error}]
   NisiaActions.waiting(tag)                what's kept (optionally only one tag)
   NisiaActions.drop(tag)                   forget what's kept with that tag (cancelled before it went)
   version: nisia-actions 2 */
(function (g) {
  const VERSION = 2;
  /* name: Nisia's function, keep: kept with no signal, later(args, at): what's sent when it goes later. */
  const ACTIONS = {
    /* Registers (Symi) */
    saveClass: { fn: "symi_save_class" },
    openSession: { fn: "symi_open_session" },
    checkIns: { fn: "symi_checkins" },
    finishRegister: { fn: "symi_finish_register", keep: true },
    sessionKey: { fn: "symi_session_key" },
    classAbsences: { fn: "symi_absences" },
    quizStart: { fn: "symi_quiz_start" },
    quizStep: { fn: "symi_quiz_step" },
    quizState: { fn: "symi_quiz_state" },
    /* Learners (Evia) */
    whatsNew: { fn: "nisia_whats_new" },
    checkIn: { fn: "nisia_check_in", keep: true, later: (a, at) => Object.assign({}, a, { p_scanned_at: at }) },
    quizNow: { fn: "evia_quiz_now" },
    quizAnswer: { fn: "evia_quiz_answer" },
    /* Employers (Paros) */
    addWitness: { fn: "paros_add_witness" },
    rateBehaviours: { fn: "paros_rate_behaviours" },
    confirmHours: { fn: "paros_confirm_hours" },
    /* Assessors (Milos) */
    employerFeedback: { fn: "milos_employer_feedback" },
    learnerCollege: { fn: "nisia_learner_college" },
    learnerQuizzes: { fn: "nisia_learner_quizzes" },
    /* Days off (every app) */
    bookAbsence: { fn: "nisia_book_absence", keep: true },
    cancelAbsence: { fn: "nisia_cancel_absence" },
    absences: { fn: "nisia_absences" },
  };
  let call = null, key = "nisia-outbox-v1";
  const online = () => typeof navigator === "undefined" || navigator.onLine !== false;
  const noSignal = (e) => !online() || /failed to fetch|networkerror|network request failed|load failed|fetch failed|timed? ?out/i.test(String((e && e.message) || e || ""));
  const read = () => { try { return JSON.parse(localStorage.getItem(key) || "[]") || []; } catch (_) { return []; } };
  const write = (v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) {} };

  function use(caller, opts) { call = caller; if (opts && opts.app) key = "nisia-outbox-v1:" + opts.app; }
  async function run(name, args) {
    const a = ACTIONS[name];
    if (!a) throw new Error("Nisia doesn’t know “" + name + "”.");
    if (!call) throw new Error("This app isn’t connected to Nisia.");
    return call(a.fn, args || {});
  }
  function keep(name, args, tag) {
    const at = new Date().toISOString(), o = read();
    o.push({ name, args: args || {}, tag: tag || null, at });
    write(o);
    return { kept: true, at };
  }
  async function send(name, args, opts) {
    const a = ACTIONS[name], tag = opts && opts.tag;
    if (a && a.keep && !online()) return keep(name, args, tag);
    try { return await run(name, args); }
    catch (e) { if (a && a.keep && noSignal(e)) return keep(name, args, tag); throw e; }
  }
  let flushing = null;
  function flush() {
    if (flushing) return flushing;
    flushing = (async () => {
      const out = [], left = [];
      for (const x of read()) {
        if (!online()) { left.push(x); continue; }
        const a = ACTIONS[x.name] || {}, args = a.later ? a.later(x.args, x.at) : x.args;
        try { out.push(Object.assign({}, x, { ok: true, result: await run(x.name, args) })); }
        catch (e) { if (noSignal(e)) left.push(x); else out.push(Object.assign({}, x, { ok: false, error: String((e && e.message) || e) })); }
      }
      /* Anything kept while this ran stays too. */
      const seen = new Set(out.concat(left).map((x) => x.at + x.name)), more = read().filter((x) => !seen.has(x.at + x.name));
      write(left.concat(more));
      return out;
    })().finally(() => { flushing = null; });
    return flushing;
  }
  const waiting = (tag) => read().filter((x) => !tag || x.tag === tag);
  const drop = (tag) => write(read().filter((x) => x.tag !== tag));
  g.NisiaActions = { VERSION, use, send, run, flush, waiting, drop, noSignal, names: Object.keys(ACTIONS) };
})(typeof window !== "undefined" ? window : globalThis);
