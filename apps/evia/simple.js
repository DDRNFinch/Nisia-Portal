/* Evia made simple (tester). Learners weren't sure what to do or what needed finishing, so the first tab answers
   three questions and nothing else:
     This week     three things, each ticking itself off: add evidence, log learning hours, do one lesson
     Your next job one topic, picked for them (a pack they started first, then the next topic with nothing, then the
                   weakest), with one Start button that goes straight into Evia's photo list
     Your topics   each one says in words where it is: Not started, Started (finish and submit), Add more, Nearly
                   there, Done. Done means strong evidence: about 10 photos and a write-up that covers the things to
                   mention (strength.js).
   A topic's page leads with the same three steps and one way in (Evia's photo list); the other ways sit under
   "Other ways to add evidence".
   Loaded after ui-tidy.js; the rest of the app is unchanged. */
(function(){
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const DAY=864e5,scr=()=>document.getElementById("screen");
  const weekStart=()=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getTime()};
  const ymd=t=>{const d=new Date(t);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
  const hm=h=>window.eviaHM?window.eviaHM(h):Math.round(h*10)/10+"h";
  const TICK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.5 4 4 8-9"/></svg>';
  const entryTime=e=>{const t=Date.parse(e.savedAt||"")||Number(e.createdAt)||0;if(t)return t;const m=String(e.d||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?new Date(+m[3],m[2]-1,+m[1]).getTime():0};
  const chatThen=fn=>()=>{if(window.chat)window.chat({quiet:true});setTimeout(fn,140)};

  function aim(){
    try{const D=window.eviaData,en=D.enrolment&&D.enrolment(),p=D.learner()||{},s=Date.parse((en&&en.start)||p.start||""),e=Date.parse((en&&en.end)||p.end||""),pl=Number(en&&en.plannedOtjHours);
      if(pl>0&&e>s)return Math.round(pl/((e-s)/(7*DAY))*10)/10}catch(_){}
    return 6;
  }
  /* Where each topic is, in plain words. */
  const STATUS={none:["Not started",""],draft:["Started: finish it and submit","y"],weak:["Add more photos and words","o"],good:["Nearly there: a bit more makes it strong","y"],strong:["Done","g"]};
  function topicsNow(){
    const us=(typeof data==="function"?data().u:[])||[],ev=typeof evidence!=="undefined"?evidence:[];
    return us.map((u,i)=>{const name=u[0],n=ev.filter(e=>e.c===course&&e.u===name&&!e.induction).length;
      const draft=typeof isDraft==="function"&&isDraft(name),lv=n&&typeof unitStrengthForCourse==="function"?unitStrengthForCourse(name):null;
      return {i,name,n,draft,state:draft?"draft":lv||"none"}});
  }
  /* The one job: finish what's started, then a topic with nothing yet, then the weakest. */
  function nextJob(T){
    return T.find(t=>t.draft)||T.find(t=>t.state==="none")||T.find(t=>t.state==="weak")||T.find(t=>t.state==="good")||null;
  }
  function week(){
    const from=weekStart(),ev=typeof evidence!=="undefined"?evidence:[],H=typeof hours!=="undefined"&&Array.isArray(hours)?hours:[];
    const added=ev.filter(e=>e.c===course&&!e.induction&&entryTime(e)>=from);
    const h=H.filter(x=>Number(x.on||x.createdAt)>=from).reduce((n,x)=>n+Number(x.n||0),0),a=aim();
    let lesson=false;try{const st=window.eviaTeach&&window.eviaTeach.stats?window.eviaTeach.stats():{days:{}};lesson=Object.keys(st.days||{}).some(d=>d>=ymd(from))}catch(_){}
    return [
      {id:"ev",ok:added.length>0,title:added.length?"Evidence added":"Add evidence to a topic",sub:added.length?[...new Set(added.map(e=>e.u))].slice(0,2).join(", "):"Photos of a job you did, and what they show"},
      {id:"hrs",ok:h>=a*0.9,title:"Log your learning hours",sub:hm(Math.round(h*100)/100)+" of "+hm(a)+" this week"},
      {id:"les",ok:lesson,title:lesson?"Lesson done":"Do one 5-minute lesson",sub:lesson?"Nice: keep it going":"In Learn, any subject"}
    ];
  }
  function home(){
    const T=topicsNow(),W=week(),done=W.filter(x=>x.ok).length,job=nextJob(T),strong=T.filter(t=>t.state==="strong").length;
    const p=(window.eviaData&&window.eviaData.learner&&window.eviaData.learner())||{},first=String(p.name||"").trim().split(/\s+/)[0];
    const head=scr().querySelector(".th-head");const h1=head&&head.querySelector("h1");if(h1)h1.textContent="Home";
    const hero=scr().querySelector("#th-course");
    const box=document.createElement("div");box.className="sm-home";
    box.innerHTML=
      '<p class="sm-hi">'+(first?"Hi "+esc(first)+". ":"")+(done===3?"You’ve done everything for this week. Brilliant.":"Here’s what to do this week.")+'</p>'+
      '<section class="sm-card"><div class="sm-k"><span>This week</span><b>'+done+' of 3 done</b></div>'+
        W.map(x=>'<button type="button" class="sm-step'+(x.ok?" ok":"")+'" data-sm="'+x.id+'"><span class="sm-tick">'+(x.ok?TICK:"")+'</span><span class="sm-copy"><strong>'+esc(x.title)+'</strong><small>'+esc(x.sub)+'</small></span><span class="sm-go" aria-hidden="true">›</span></button>').join("")+
      '</section>'+
      (job?'<section class="sm-card sm-job"><div class="sm-k"><span>Your next job</span></div>'+
        '<h2>'+esc(job.name)+'</h2>'+
        '<p>'+(job.draft?"You’ve started this one. Add anything else, then submit it to your portfolio.":job.state==="none"?"Take photos of this job at work: the start, the middle and the end. Evia tells you what to capture.":"This one needs more. Add photos and say what they show to make it strong.")+'</p>'+
        '<ol class="sm-how"><li>Take photos</li><li>Say what each shows</li><li>Submit</li></ol>'+
        '<button type="button" class="primary sm-start" id="sm-start">'+(job.draft?"Carry on":"Start")+'</button>'+
        '<button type="button" class="sm-other" id="sm-pick">Did a different job? Pick the topic below</button></section>'
        :'<section class="sm-card sm-job"><div class="sm-k"><span>Your next job</span></div><h2>Every topic is done</h2><p>Brilliant. Keep adding to any topic to keep your evidence strong, and get ready for your end-point assessment in Learn.</p></section>')+
      '<section class="sm-progress"><div class="sm-k"><span>Your topics</span><b>'+strong+' of '+T.length+' done</b></div><span class="sm-bar"><i style="width:'+(T.length?Math.round(strong/T.length*100):0)+'%"></i></span>'+
        '<small>A topic is done when it has about 10 photos and you’ve said what they show.</small>'+
        '<button type="button" class="sm-ksb" id="th-course">See your '+esc(window.eviaTerm?window.eviaTerm().many:"KSBs")+' ›</button></section>';
    if(hero)hero.replaceWith(box);else if(head)head.after(box);else scr().prepend(box);
    /* The topic rows: plain words for where each one is, and the next job marked. */
    scr().querySelectorAll(".th-row[data-u]").forEach(b=>{const t=T[+b.dataset.u];if(!t)return;
      const sm=b.querySelector(".th-copy small"),st=STATUS[t.state];
      if(sm)sm.textContent=st[0]+(t.n&&t.state!=="strong"?" · "+t.n+(t.n===1?" piece":" pieces"):"");
      b.querySelectorAll(".th-pill,.th-bars").forEach(x=>x.remove());
      if(t.state==="strong"){b.classList.add("sm-done");b.querySelector(".th-num").innerHTML=TICK}
      if(job&&t.i===job.i)b.insertAdjacentHTML("beforeend",'<span class="sm-next">Next</span>');
      else if(st[1])b.classList.add("sm-"+st[1]);
    });
    const units=[...scr().querySelectorAll(".th-h2")].find(h=>/units|site jobs/i.test(h.textContent));if(units)units.textContent="All topics";
    const start=document.getElementById("sm-start");
    if(start)start.onclick=()=>{window.openUnit(job.i);if(job.draft)return;
      /* Straight into Evia's photo list once the topic's page is drawn. */
      let n=0;const go=()=>{const b=document.getElementById("cu-start")||document.getElementById("eg-start");if(b)b.click();else if(n++<40)setTimeout(go,50)};setTimeout(go,50)};
    const ksb=document.getElementById("th-course");if(ksb)ksb.onclick=()=>window.eviaProgressDeep&&window.eviaProgressDeep(window.eviaNvq&&window.eviaNvq.on()?"ksb":"where");
    const pick=document.getElementById("sm-pick");if(pick)pick.onclick=()=>{const g=scr().querySelector(".th-row[data-u]");if(g)g.scrollIntoView({behavior:"smooth",block:"center"})};
    scr().querySelectorAll("[data-sm]").forEach(b=>b.onclick=()=>{
      const id=b.dataset.sm;
      if(id==="ev")return start?start.click():null;
      if(id==="hrs")return chatThen(()=>window.eviaCoachFlows&&window.eviaCoachFlows.hours())();
      if(id==="les")return typeof nav==="function"&&nav("teach");
    });
  }

  /* A topic's page: the three steps, one way in, the rest folded away. */
  function tidyUnit(){
    const m=scr()&&scr().querySelector(".evidence-pack-page .ev-modes");if(!m||m.dataset.sm)return;m.dataset.sm="1";
    const lead=document.getElementById("cu-start")||document.getElementById("eg-start");
    const others=["fr-start","rec-start"].map(id=>document.getElementById(id)).filter(Boolean);
    const p=scr().querySelector(".evidence-heading p");
    if(p)p.innerHTML='<ol class="sm-how sm-how-unit"><li>Take photos of the job</li><li>Say what each shows</li><li>Submit to your portfolio</li></ol>';
    if(lead){lead.classList.add("sm-lead");if(lead.id==="eg-start"){const s=lead.querySelector("strong"),sm=lead.querySelector("small");if(s&&s.textContent==="Let Evia guide you"){s.textContent="Start: take photos";if(sm)sm.textContent="Evia tells you what to capture, then helps you say what it shows"}}}
    /* The guide button itself (from Catch up, the guide is the next one). */
    const g=document.getElementById("eg-start");if(g&&g!==lead)others.unshift(g);
    if(others.length){const d=document.createElement("details");d.className="sm-more";d.innerHTML='<summary>Other ways to add evidence</summary>';others.forEach(o=>d.appendChild(o));m.after(d)}
  }
  /* However the Topics page gets drawn, it gets the home on top. */
  function tidyHome(){
    try{if(typeof screen!=="undefined"&&screen==="course"&&scr()&&!scr().querySelector(".sm-home")&&scr().querySelector(".th-row[data-u]"))home()}catch(err){console.warn("Evia: simple home",err&&err.message)}
  }
  new MutationObserver(()=>{tidyUnit();tidyHome()}).observe(document.documentElement,{childList:true,subtree:true});

  const STYLE=`.sm-home{display:grid;gap:14px;margin:0 0 6px}
.sm-hi{margin:0 2px;font-size:17px;line-height:1.4;color:var(--ui-text,#172033);font-weight:600}
.sm-card{background:var(--ui-card,#fff);border:1px solid var(--ui-line,#eaecf0);border-radius:22px;padding:16px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
.sm-k{display:flex;justify-content:space-between;align-items:baseline;margin:0 2px 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:800;color:var(--ui-muted,#667085)}
.sm-k b{letter-spacing:0;text-transform:none;font-size:13px;color:var(--ui-text,#172033)}
.sm-step{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--ui-line,#eef0f3);padding:12px 2px;font:inherit;color:inherit;cursor:pointer}
.sm-step:first-of-type{border-top:0}
.sm-tick{width:30px;height:30px;flex:none;border-radius:50%;border:2px solid #d0d5dd;display:grid;place-items:center}
.sm-tick svg{width:18px;height:18px;fill:none;stroke:#fff;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
.sm-step.ok .sm-tick{background:#12b76a;border-color:#12b76a}
.sm-step.ok strong{color:var(--ui-muted,#667085)}
.sm-copy{flex:1;min-width:0}.sm-copy strong{display:block;font-size:16px}.sm-copy small{display:block;color:var(--ui-muted,#667085);font-size:13.5px;margin-top:2px}
.sm-go{color:#98a2b3;font-size:22px}
.sm-job{background:var(--soft,#fff7d6);border-color:var(--yellow,#e7b900)}
.sm-job h2{margin:2px 2px 6px;font-size:24px;line-height:1.15}
.sm-job p{margin:0 2px 12px;font-size:15px;line-height:1.45;color:var(--ui-text,#344054)}
.sm-how{display:flex;gap:6px;margin:0 0 14px;padding:0;list-style:none;counter-reset:s}
.sm-how li{flex:1;counter-increment:s;background:rgba(255,255,255,.75);border-radius:12px;padding:8px 6px;text-align:center;font-size:12.5px;font-weight:700;line-height:1.25}
.sm-how li::before{content:counter(s);display:block;width:22px;height:22px;margin:0 auto 4px;border-radius:50%;background:var(--yellow,#e7b900);color:var(--ui-on-accent,#172033);font-size:12px;line-height:22px}
.sm-start{width:100%;padding:15px;border-radius:16px;font-size:17px;font-weight:800}
.sm-other{display:block;margin:10px auto 0;background:none;border:0;font:inherit;font-size:13.5px;font-weight:700;color:var(--ui-muted,#667085);text-decoration:underline;cursor:pointer}
.sm-progress{padding:4px 4px 0}
.sm-bar{display:block;height:10px;border-radius:99px;background:#eaecf0;overflow:hidden;margin:2px 0 8px}.sm-bar i{display:block;height:100%;background:#12b76a;border-radius:99px}
.sm-ksb{display:block;margin:8px 0 0;padding:0;background:none;border:0;font:inherit;font-size:14px;font-weight:800;color:var(--accent-text,#6b5300);cursor:pointer}
.sm-progress small{color:var(--ui-muted,#667085);font-size:13px}
.th-row.sm-done .th-num{background:#12b76a;color:#fff}.th-row.sm-done .th-num svg{width:18px;height:18px;fill:none;stroke:#fff;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
.th-row.sm-o small{color:#b54708}.th-row.sm-g small{color:#067647}
.sm-next{flex:none;background:var(--yellow,#e7b900);color:var(--ui-on-accent,#172033);font-size:12px;font-weight:800;border-radius:99px;padding:4px 10px}
.sm-how-unit{margin:10px 0 4px}.sm-how-unit li{background:var(--soft,#fff7d6);color:var(--ui-text,#172033)}
.eg-start.sm-lead{border-width:2px;border-color:var(--yellow,#e7b900);background:var(--soft,#fff7d6)}
.sm-more{margin:12px 0 4px}.sm-more summary{cursor:pointer;font-weight:700;color:var(--ui-muted,#667085);padding:8px 2px;font-size:14.5px}
.sm-more .eg-start{margin-top:10px;width:100%}`;
  const st=document.createElement("style");st.id="sm-style";st.textContent=STYLE;document.head.appendChild(st);

  const prev=window.courses;
  window.courses=function(){prev.apply(this,arguments);tidyHome()};
  window.portfolio=()=>window.courses();
  /* The first tab is the home page now. */
  const label=()=>{const b=document.querySelector('[data-nav="course"] span:last-child');if(b)b.textContent="Home"};
  label();setTimeout(label,600);
  window.eviaSimple={home,week,nextJob,topicsNow};
  /* Topics may already be on screen from before this loaded, in the older layout: draw it again. */
  try{if(typeof screen!=="undefined"&&screen==="course"&&scr()&&!scr().querySelector(".th-head"))window.courses();else tidyHome()}catch(_){}
})();
