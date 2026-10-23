/* Evia7 journey: Evia as a daily walk, not a list. Tapping Evia shows a winding path of stepping stones (a season of
   30), with Evia on today's stone. Each day she has one step of two minutes or less, picked for what helps most (her
   targets lean it): a 5-question quick quiz, logging learning hours, a photo for any topic, a line on any write-up, one
   Teach me lesson, a confidence check, getting ready for a review that's close, maths or English. Done: the stone
   lights up, coins, and a bonus step for keen learners (one a day). Missing a day breaks nothing: the path waits.
   Every 7th stone pays extra; the last ends the season.
   Evia notices a step is done from what the learner does anywhere in the app (a test saved, hours logged, evidence
   saved, a lesson finished), so she never asks "did you do it?".
   Also here: the check-in pop-up when the app opens while the learner's class is on.
   Store "evia7-journey": {days: [{d, task}], bonus: {day: task}, active: {d, task, bonus, at, base}, seen: day}.
   window.eviaJourney: show(), today(), check(). */
(function(){
  const KEY="evia7-journey",SEASON=30,PAY={day:15,bonus:10,milestone:50,season:150};
  const K=()=>window.eviaChatKit,C=()=>window.eviaCoachFlows||{};
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||"null");return Object.assign({days:[],bonus:{}},v||{})}catch(_){return {days:[],bonus:{}}}};
  const write=s=>{try{localStorage.setItem(KEY,JSON.stringify(s))}catch(_){}};
  const dayKey=t=>{const d=new Date(t==null?Date.now():t);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
  const when=x=>Number(x)||Date.parse(x||"")||0;
  const leave=f=>()=>{K().closeChat();setTimeout(f,120)};
  const nvq=()=>!!(window.eviaNvq&&window.eviaNvq.on());
  const stats=()=>{try{return window.eviaStats.compute()}catch(_){return null}};
  const list=n=>{try{return window.eviaData.list(n)||[]}catch(_){return []}};
  const evidenceList=()=>typeof evidence!=="undefined"&&Array.isArray(evidence)?evidence:[];
  const lessonsDone=()=>{try{return window.eviaTeach.report().done||0}catch(_){return 0}};

  /* ---------- The steps ---------- */
  /* weight(S): how much it helps today (0 = not today). start(): opens it. done(base, at): has it happened since. */
  const TASKS={
    quiz:{title:()=>"5 quick questions",note:"About 2 minutes",weight:()=>2,
      start:()=>window.eviaStartTest&&window.eviaStartTest("epa",5,nvq()?"Quick quiz":"EPA quick quiz"),
      done:(b,at)=>list("tests").some(t=>t&&when(t.takenAt)>=at)},
    hours:{title:()=>"Log your learning hours",note:"Anything you’ve learnt counts",weight:S=>S&&S.otjWeek<4?4:1,
      start:()=>{K().userSays("Log my hours");C().hours&&C().hours()},
      done:(b,at)=>list("hours").some(h=>when(h.createdAt)>=at)},
    photo:{title:()=>"Add a photo to any topic",note:"Any job you’ve done counts",weight:S=>S&&S.a&&S.a.timePct!=null&&S.a.timePct-S.a.ksbPct>10?4:2,
      start:leave(()=>nav("course")),
      done:(b,at)=>evidenceList().some(e=>e&&when(e.savedAt)>=at)},
    writeup:{title:()=>"Add a line to any write-up",note:"One sentence is enough",weight:S=>S&&S.coverage!=null&&S.coverage<70?3:1,
      start:leave(()=>nav("course")),
      done:(b,at)=>evidenceList().some(e=>e&&when(e.savedAt)>=at)},
    teach:{title:()=>"One Teach me lesson",note:"A couple of minutes",weight:()=>window.eviaTeach?2:0,
      start:leave(()=>nav("teach")),
      done:b=>lessonsDone()>(b.lessons||0)},
    confidence:{title:()=>"Rate your skills",note:"Tap how confident you feel",weight:S=>!S?0:!S.confidence.sessions?4:S.confidence.last&&Date.now()-S.confidence.last>30*864e5?2:0,
      start:()=>{K().userSays("Confidence check");C().confidence&&C().confidence()},
      done:(b,at)=>list("confidence").some(x=>x&&when(x.takenAt)>=at)},
    prep:{title:()=>"Get ready for your review",note:"A few yes or no answers",weight:()=>{const rd=window.eviaReviewDue&&window.eviaReviewDue();return rd&&rd.days<=14&&rd.days>=-7&&window.eviaPrepPack&&!window.eviaPrepPack.answered()?6:0},
      start:()=>{K().userSays("Get ready for my review");C().prepare&&C().prepare()},
      done:()=>!!(window.eviaPrepPack&&window.eviaPrepPack.answered())},
    maths:{title:()=>"5 maths questions",note:"With worked answers",weight:S=>S&&S.maths?1:0,
      start:()=>window.eviaStartTest&&window.eviaStartTest("maths",5,"Maths test"),
      done:(b,at)=>list("tests").some(t=>t&&t.type==="maths"&&when(t.takenAt)>=at)},
    english:{title:()=>"5 English questions",note:"With worked answers",weight:S=>S&&S.english?1:0,
      start:()=>window.eviaStartTest&&window.eviaStartTest("english",5,"English test"),
      done:(b,at)=>list("tests").some(t=>t&&t.type==="english"&&when(t.takenAt)>=at)}
  };
  /* The same step all day: a weighted pick seeded by the date, never yesterday's step again. */
  const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0)/4294967296};
  function pick(day,avoid){
    const S=stats(),opts=Object.keys(TASKS).map(id=>({id,w:avoid.includes(id)?0:Math.max(0,TASKS[id].weight(S)||0)})).filter(x=>x.w>0);
    if(!opts.length)return "quiz";
    let r=hash(day+avoid.join())*opts.reduce((n,x)=>n+x.w,0);
    for(const x of opts){if((r-=x.w)<0)return x.id}
    return opts[opts.length-1].id;
  }
  /* Today: {day, task, done, bonusTask, bonusDone, steps}. */
  function today(){
    const s=read(),d=dayKey(),doneToday=s.days.find(x=>x.d===d),prev=s.days.filter(x=>x.d!==d).slice(-1)[0];
    const task=doneToday?doneToday.task:(s.active&&s.active.d===d&&!s.active.bonus?s.active.task:pick(d,prev?[prev.task]:[]));
    const bonusTask=s.bonus[d]||(s.active&&s.active.d===d&&s.active.bonus?s.active.task:pick(d+"b",[task]));
    return {day:d,task,done:!!doneToday,bonusTask,bonusDone:!!s.bonus[d],steps:s.days.length};
  }
  function begin(id,bonus){
    const s=read();s.active={d:dayKey(),task:id,bonus:!!bonus,at:Date.now()-1000,base:{lessons:lessonsDone()}};write(s);
    TASKS[id].start();
  }
  /* Called whenever something's saved: has today's step (or the bonus) just been done? */
  function check(){
    const s=read(),a=s.active,d=dayKey();
    if(!a||a.d!==d||!TASKS[a.task])return false;
    if(!TASKS[a.task].done(a.base||{},a.at||0))return false;
    let paid=0,why="";
    if(a.bonus){if(!s.bonus[d]){s.bonus[d]=a.task;paid=PAY.bonus;why="Evia’s bonus step"}}
    else if(!s.days.some(x=>x.d===d)){
      s.days.push({d,task:a.task});const n=s.days.length;
      paid=PAY.day;why="Today’s step with Evia";
      if(n%SEASON===0){paid+=PAY.season;why="Season "+n/SEASON+" complete"}
      else if(n%7===0){paid+=PAY.milestone;why="A big stone on Evia’s path"}
      s.fresh=d;
    }
    s.active=null;write(s);
    if(paid&&window.eviaRewards&&window.eviaRewards.prize)window.eviaRewards.prize(paid,why);
    if(paid&&typeof showEvidenceToast==="function")showEvidenceToast((a.bonus?"Bonus step done":"Today’s step done")+" · +"+paid+" coins");
    return true;
  }

  /* ---------- The map ---------- */
  const STEP=74,PAD=56;
  const xAt=i=>50+Math.sin(i*.85)*30;
  const yAt=(i,h)=>h-PAD-i*STEP;
  const TICK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.5 4 4 8-9"/></svg>';
  const STAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.6l5.8-.8Z"/></svg>';
  const FLAG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4M6 4h11l-2.5 4L17 12H6"/></svg>';
  const FACE='<span class="jy-face" aria-hidden="true"><i></i><i></i></span>';
  function mapHtml(t){
    const here=t.done?t.steps-1:t.steps,season=Math.floor(here/SEASON),first=season*SEASON,h=PAD*2+(SEASON-1)*STEP;
    const line=to=>{let p="";for(let i=0;i<to;i++){const x=xAt(i),y=yAt(i,h);if(!i)p="M"+x+" "+y;else{const px=xAt(i-1),py=yAt(i-1,h);p+=" C"+px+" "+(py-STEP/2)+" "+x+" "+(y+STEP/2)+" "+x+" "+y}}return p};
    /* The path is lit up to the stone Evia's on. */
    const path=line(SEASON),lit=line(Math.max(0,Math.min(SEASON,here-first+1)));
    let stones="";
    for(let i=0;i<SEASON;i++){
      const n=first+i,big=(i+1)%7===0,last=i===SEASON-1,cur=n===here,done=n<t.steps;
      const cls="jy-stone"+(done?" done":"")+(cur?" now":"")+(big?" big":"")+(last?" last":"")+(t.fresh&&n===t.steps-1?" fresh":"");
      stones+='<span class="'+cls+'" style="left:'+xAt(i)+'%;top:'+yAt(i,h)+'px" aria-hidden="true">'+(cur&&!t.done?FACE:done?TICK:last?FLAG:big?STAR:'<b>'+(i+1)+'</b>')+(cur&&t.done?'<span class="jy-evia">'+FACE+'</span>':'')+'</span>';
    }
    return '<div class="jy-map" role="img" aria-label="Season '+(season+1)+', step '+(Math.min(SEASON,here-first+1))+' of '+SEASON+'"><div class="jy-track" style="height:'+h+'px">'+
      '<svg class="jy-path" viewBox="0 0 100 '+h+'" preserveAspectRatio="none" aria-hidden="true"><path d="'+path+'"/>'+(lit.includes("C")?'<path class="jy-lit" d="'+lit+'"/>':'')+'</svg>'+stones+'</div></div>';
  }
  function cardHtml(t){
    const T=TASKS[t.task],B=TASKS[t.bonusTask];
    if(!t.done)return '<div class="jy-card"><small>Today</small><strong>'+esc(T.title())+'</strong><span>'+esc(T.note)+'</span><button type="button" class="primary jy-go" data-go>Start</button></div>';
    if(!t.bonusDone&&B&&t.bonusTask!==t.task)return '<div class="jy-card jy-doneday"><small>Done for today ✓</small><strong>Bonus: '+esc(B.title())+'</strong><span>+'+PAY.bonus+' coins if you fancy it</span><button type="button" class="secondary jy-go" data-bonus>Do the bonus</button></div>';
    return '<div class="jy-card jy-doneday"><small>All done for today ✓</small><strong>See you tomorrow</strong><span>Your next stone unlocks then.</span></div>';
  }
  function moreLabel(){
    const N=window.eviaNisia,live=N&&N.joined&&N.joined()&&N.joined().live;
    const n=(live&&window.eviaMessages?window.eviaMessages.unread():0)+(window.eviaMoreRequired?new Set(window.eviaMoreRequired().map(x=>x.unit)).size:0);
    return n?"More · "+n+" new":"More";
  }
  function more(){
    const k=K();k.userSays("More");
    const opts=[];
    const N=window.eviaNisia,live=N&&N.joined&&N.joined()&&N.joined().live;
    (window.eviaTodo?window.eviaTodo.list():[]).filter(x=>["assessor","message","checkin","evidence"].includes(x.ic)).slice(0,3).forEach(x=>opts.push({label:x.title,primary:!opts.length,run:x.run}));
    if(k.reviewFromMenu)opts.push({label:"My review",run:()=>k.reviewFromMenu()});
    if(C().targets)opts.push({label:"My targets",run:()=>C().targets()});
    if(C().confidence)opts.push({label:"Confidence check",run:()=>{k.userSays("Confidence check");C().confidence()}});
    if(live&&window.eviaTodo&&window.eviaTodo.away)opts.push({label:"Can’t make college?",run:()=>window.eviaTodo.away()});
    opts.push({label:"Back to my path",back:true,run:()=>show()});
    k.say("What would you like?");k.replies(opts);
  }
  function show(){
    document.body.classList.remove("evia-epa");
    const k=K();if(!k)return;
    check();
    const s=read(),t=today();t.fresh=s.fresh===t.day&&s.seen!==t.day;
    if(t.fresh){s.seen=t.day;write(s)}
    const season=Math.floor((t.done?t.steps-1:t.steps)/SEASON)+1,step=Math.min(SEASON,(t.done?t.steps-1:t.steps)%SEASON+1);
    if(window.eviaMood)window.eviaMood(t.done?"happy":"think");
    k.widget('<div class="jy"><div class="jy-top"><strong>Season '+season+'</strong><span>Step '+step+' of '+SEASON+'</span></div>'+mapHtml(t)+cardHtml(t)+'</div>',el=>{
      const m=el.querySelector(".jy-map"),now=el.querySelector(".jy-stone.now");
      if(m&&now)requestAnimationFrame(()=>{m.scrollTop=Math.max(0,now.offsetTop-m.clientHeight*.6)});
      const go=el.querySelector("[data-go]");if(go)go.onclick=()=>begin(t.task,false);
      const bo=el.querySelector("[data-bonus]");if(bo)bo.onclick=()=>begin(t.bonusTask,true);
    });
    k.replies([{label:moreLabel(),run:more}]);
  }

  /* ---------- Noticing a step is done ---------- */
  let soon=null;const later=()=>{clearTimeout(soon);soon=setTimeout(check,600)};
  if(window.eviaData&&window.eviaData.on)window.eviaData.on("change",later);
  window.addEventListener("evia:test-saved",later);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)later()});

  /* ---------- Check in: a pop-up when the app opens while the class is on ---------- */
  const ASKED="evia7-checkin-asked";
  function askCheckIn(){
    const N=window.eviaNisia,e=N&&N.joined&&N.joined();
    if(!e||!e.live||!N.classNow||!window.eviaCheckIn||document.getElementById("jy-checkin"))return;
    if(document.body.classList.contains("evia-onboarding"))return;
    const c=N.classNow();if(!c)return;
    let asked={};try{asked=JSON.parse(sessionStorage.getItem(ASKED)||"{}")}catch(_){}
    if(asked[c.id])return;
    asked[c.id]=1;try{sessionStorage.setItem(ASKED,JSON.stringify(asked))}catch(_){}
    const st=Date.parse(c.starts_at),time=new Date(st).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
    const el=document.createElement("div");el.id="jy-checkin";el.className="jy-pop";el.setAttribute("role","dialog");el.setAttribute("aria-label","Check in to "+(c.class||"class"));
    el.innerHTML='<div class="jy-pop-card"><span class="jy-pop-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5z"/></svg></span>'+
      '<strong>'+esc(c.class||"Your class")+' is on</strong><span>'+(Date.now()<st?"Starts at ":"Started at ")+esc(time)+(c.room?" · "+esc(c.room):"")+'</span>'+
      '<button type="button" class="primary" data-in>Check in</button><button type="button" class="secondary" data-no>Not now</button></div>';
    document.body.appendChild(el);
    const close=()=>{el.classList.add("out");setTimeout(()=>el.remove(),220)};
    el.querySelector("[data-in]").onclick=()=>{close();window.eviaCheckIn.open()};
    el.querySelector("[data-no]").onclick=close;
    el.onclick=ev=>{if(ev.target===el)close()};
  }
  setTimeout(askCheckIn,3500);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(askCheckIn,1500)});
  window.addEventListener("evia:nisia-synced",()=>setTimeout(askCheckIn,300));

  window.eviaJourney={show,today,check,askCheckIn,TASKS};
})();
