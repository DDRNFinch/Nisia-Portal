/* Evia7 automatic off-the-job hours.
   A hidden timer adds the time a learner spends on activities that count as off-the-job training to their learning
   log. It only counts active time: it stops when the app is in the background or nobody has touched the screen for
   90 seconds, so taking longer on purpose doesn't add anything.

   What's logged follows the apprenticeship funding rules and off-the-job training guidance (DfE, 2025 to 2027):
     counts:  Teach me trade lessons (online learning of the standard's knowledge, skills and behaviours) and
              writing up portfolio evidence (time spent writing assignments).
     doesn't: tests and exams, progress reviews, confidence checks, English and maths, and the productive job itself
              (taking photos on the job). None of these start the timer.
   Off-the-job training must happen in paid working hours (or be paid back as time off in lieu), which the app can't
   know, so each automatic entry is marked "Logged by Evia" and can be removed until it's downloaded.

   window.eviaOtj: start(key,{description,learned}), stop(key), flush(), pending(key) */
(function(){
  const IDLE=90e3,TICK=5e3,KEY="evia7-otj-pending";
  const run={};let lastAct=Date.now();
  ["pointerdown","keydown","input","touchstart","wheel"].forEach(e=>addEventListener(e,()=>{lastAct=Date.now()},{passive:true,capture:true}));
  const readPending=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch(_){return {}}};
  const writePending=p=>{try{localStorage.setItem(KEY,JSON.stringify(p))}catch(_){}};
  const active=()=>document.visibilityState==="visible"&&Date.now()-lastAct<IDLE;
  function tick(){
    const now=Date.now(),on=active();
    Object.values(run).forEach(s=>{if(on)s.ms+=Math.min(now-s.t,TICK*2);s.t=now});
  }
  setInterval(tick,TICK);
  document.addEventListener("visibilitychange",()=>{tick();if(document.visibilityState!=="visible")flush()});
  addEventListener("pagehide",()=>{tick();flush()});

  function start(key,meta){
    tick();
    if(!run[key])run[key]={ms:0,t:Date.now()};
    Object.assign(run[key],meta||{});lastAct=Date.now();
  }
  function stop(key,meta){
    tick();const s=run[key];if(!s)return;
    if(meta)Object.assign(s,meta);
    delete run[key];bank(key,s);
  }
  /* Move counted time into the pending store, then log whole minutes. */
  function bank(key,s){
    const p=readPending(),q=p[key]=p[key]||{ms:0};
    q.ms+=s.ms;s.ms=0;
    ["description","learned"].forEach(k=>{if(s[k])q[k]=s[k]});
    const mins=Math.floor(q.ms/60e3);
    if(mins>0){q.ms-=mins*60e3;log(key,mins,q.description,q.learned)}
    writePending(p);
  }
  function flush(){tick();Object.keys(run).forEach(k=>bank(k,run[k]))}

  /* One entry per activity per day. An entry that's already been downloaded isn't changed: a new one starts. */
  function log(key,mins,description,learned){
    if(typeof hours==="undefined")return;
    const day=new Date().toDateString(),autoKey=key+"|"+day;
    const batches=typeof otjBatches!=="undefined"?otjBatches:[],cutoff=Number((batches[batches.length-1]||{}).cutoff||0);
    const e=hours.find(x=>x&&x.autoKey===autoKey&&Number(x.createdAt)>cutoff);
    /* Written through eviaData: one entry per activity per day, adding the minutes as they come. */
    const had=String(e&&e.learned||"").split("; ").filter(Boolean);if(learned&&!had.includes(learned))had.push(learned);
    const now=Date.now();
    window.eviaData.put("hours",{id:e?e.id:"otj-auto-"+now+"-"+Math.random().toString(36).slice(2,8),source:"auto",activityKey:autoKey,
      minutes:(e?(Number(e.mins)||Math.round(Number(e.n||0)*60)):0)+mins,description:description||(e&&e.description)||"Learning with Evia",
      did:e?e.did||"":"",learned:had.join("; "),createdAt:e?Number(e.createdAt):now});
  }

  /* Portfolio write-ups: any text box marked with data-otj (the evidence write-up and guided Evia's answers). */
  document.addEventListener("focusin",e=>{const t=e.target;if(t&&t.dataset&&t.dataset.otj)start("writeup|"+t.dataset.otj,{description:"Writing up portfolio evidence: "+t.dataset.otj,learned:""})});
  document.addEventListener("focusout",e=>{const t=e.target;if(t&&t.dataset&&t.dataset.otj)stop("writeup|"+t.dataset.otj)});

  window.eviaOtj={start,stop,flush,pending:key=>{const s=run[key];return (s?s.ms:0)+((readPending()[key]||{}).ms||0)},running:key=>!!run[key],
    /* for the smoke test: add counted time to a running activity */
    _add:(key,ms)=>{if(run[key])run[key].ms+=ms}};
})();
