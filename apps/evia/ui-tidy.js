/* Evia7 tidy layout: every tab looks the same and everything lives in one place.
   Each page: the same header (the page name, then Messages and the learner's photo, which opens their profile), one
   main thing at the top, then tidy rows. One job per tab:
     Topics    your evidence: the topics and how strong each is (open one to add evidence any time)
     Time      learning hours and college: this week's hours, the week's college days, attendance, can't make it
     Review    the ONE checklist in the app: what the assessor needs at the next review, ticking itself off
     Learn     getting better: the Teach me page as it was, with the shared header
   Every icon is the same quiet grey.
   The pages reuse what's already there (units, deep-dive sheets, Teach me, the calendar); only the layout is new.
   Loaded after the pages it lays out (ui.js, progress.js, calendar.js, tabs.js). */
(function(){
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const scr=()=>document.getElementById("screen");
  const D=()=>window.eviaData;
  const live=()=>{try{const N=window.eviaNisia,e=N&&N.joined&&N.joined();return !!(e&&e.live)}catch(_){return false}};
  const DAY=864e5,dkey=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const hm=h=>window.eviaHM?window.eviaHM(h):Math.round(h*10)/10+"h";
  const shortDate=k=>new Date(k+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"});
  const time=s=>s?new Date(s).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}):"";
  const S=p=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';
  const IC={
    msg:S('<path d="M20 12.2c0 4-3.6 7.1-8 7.1-1.1 0-2.2-.2-3.1-.6L4 20l1.3-3.7A6.6 6.6 0 0 1 4 12.2C4 8.3 7.6 5 12 5s8 3.3 8 7.2Z"/>'),
    cam:S('<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5Z"/><circle cx="12" cy="13" r="3.5"/>'),
    clip:S('<path d="M8 12.5 14.5 6a3 3 0 0 1 4.2 4.2l-8 8a5 5 0 0 1-7-7L11 4"/>'),
    send:S('<path d="M4 12 20 4l-4 16-4-7-8-1Z"/>'),
    star:S('<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/>'),
    target:S('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>'),
    review:S('<path d="M8 5.5H6.5A1.5 1.5 0 0 0 5 7v12.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V7a1.5 1.5 0 0 0-1.5-1.5H16"/><path d="M9 4.5h6v2.5H9z"/><path d="m8.5 13.5 2.3 2.3 4.7-4.8"/>'),
    pack:S('<path d="M6 3.5h9l3 3V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20Z"/><path d="M9 11h6M9 14.5h6M9 18h3"/>'),
    test:S('<path d="M9 4h6M10 4v5l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V4"/>'),
    bars:S('<path d="M5 19V13M10 19V9M15 19v-5M20 19V5"/>'),
    write:S('<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>'),
    work:S('<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>'),
    medal:S('<circle cx="12" cy="14.5" r="5.5"/><path d="M8.5 3.5 10.5 9M15.5 3.5 13.5 9"/>'),
    cal:S('<rect x="3.5" y="5" width="17" height="15.5" rx="2.6"/><path d="M3.5 9.8h17M8 3v4M16 3v4"/>'),
    road:S('<path d="M4 20 9 4M20 20 15 4M12 6v2M12 11v2M12 16v2"/>'),
    clock:S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    away:S('<circle cx="12" cy="12" r="8.5"/><path d="M8.5 8.5l7 7"/>'),
    qr:S('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5z"/>'),
    book:S('<path d="M4 5.5C6 4.5 9 4.5 12 6c3-1.5 6-1.5 8-.5v13c-2-1-5-1-8 .5-3-1.5-6-1.5-8-.5Z"/><path d="M12 6v13"/>'),
    calc:S('<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>'),
    abc:S('<path d="M4 18l4.5-12h1L14 18M5.8 13.5h6.4"/><path d="M16 11.5c.8-.8 3.5-.8 3.5 1.2V18M19.5 15c-2.4-.3-3.6.4-3.6 1.6 0 .9.7 1.5 1.7 1.5 1.1 0 1.9-.8 1.9-.8"/>'),
    people:S('<circle cx="8" cy="8" r="2.6"/><circle cx="16" cy="8" r="2.6"/><path d="M3.5 19c0-3 2-5 4.5-5s4.5 2 4.5 5M11.5 19c0-3 2-5 4.5-5s4.5 2 4.5 5"/>'),
    tools:S('<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M8.5 10l1.5 1.5 3-3M8.5 16l1.5 1.5 3-3M15 11h1.5M15 17h1.5"/>'),
    bag:S('<path d="M5 8h14l-1 12H6Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>'),
    pin:S('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
    school:S('<path d="M3 9.2 12 4l9 5.2"/><path d="M5.5 10.5v7.5M10 10.5v7.5M14 10.5v7.5M18.5 10.5v7.5"/><path d="M3.5 20.5h17"/>')
  };
  const GO='<span class="th-go" aria-hidden="true">›</span>';
  /* One tidy row: an icon, a title and a line under it, and on the right a pill or an arrow. */
  function row(o){
    return '<button type="button" class="th-row"'+(o.id?' id="'+o.id+'"':"")+(o.attrs||"")+'><span class="th-ic th-'+(o.c||"y")+'">'+(o.av||IC[o.ic]||"")+'</span>'+
      '<span class="th-copy"><strong>'+esc(o.title)+'</strong>'+(o.sub?'<small>'+esc(o.sub)+'</small>':"")+'</span>'+
      (o.pill?'<span class="th-pill th-pill-'+(o.pc||"s")+'">'+esc(o.pill)+'</span>':"")+GO+'</button>';
  }
  const group=(rows,label)=>(label?'<h2 class="th-h2">'+esc(label)+'</h2>':"")+'<div class="th-group">'+rows.join("")+'</div>';
  function on(sel,f){const el=typeof sel==="string"?document.getElementById(sel):sel;if(el)el.onclick=f}

  /* ---------- The header, the same on every page ---------- */
  function avatar(){
    const p=(D()&&D().learner&&D().learner())||{},photo=D()&&D().files&&D().files.photo?D().files.photo():"";
    const initials=String(p.name||"").trim().split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase()||"·";
    return photo?'<img src="'+photo+'" alt="">':esc(initials);
  }
  function header(title,extra){
    const n=live()&&window.eviaMessages?window.eviaMessages.unread():0;
    return '<header class="th-head"><h1>'+esc(title)+'</h1>'+(extra||"")+
      (live()&&window.eviaMessages?'<button type="button" class="th-hb" id="th-msg" aria-label="'+(n?"Messages, "+n+" new":"Messages")+'">'+IC.msg+'<em'+(n?"":" hidden")+'>'+(n>99?"99+":n)+'</em></button>':"")+
      '<button type="button" class="th-me" id="th-me" aria-label="Your profile">'+avatar()+'</button></header>';
  }
  function wireHeader(){
    on("th-msg",()=>window.eviaMessages&&window.eviaMessages.open());
    on("th-me",()=>window.eviaOpenProfile&&window.eviaOpenProfile());
  }
  /* New messages: the number in the header (and on nothing else: the profile and messages live in the header now). */
  const prevUnread=window.eviaCollegeUnread;
  window.eviaCollegeUnread=n=>{
    const b=document.querySelector("#th-msg em");if(b){b.hidden=!n;b.textContent=n>99?"99+":String(n||"")}
    const t=document.getElementById("nav-college-n");if(t)t.hidden=true;
  };
  void prevUnread;

  /* ---------- Topics: doing the work ---------- */
  function topics(){
    const d=typeof data==="function"?data():{u:[]},us=d.u||[],nvq=window.eviaNvq&&window.eviaNvq.on();
    /* An NVQ keeps its own screen (site jobs by type of work, the knowledge questions), under the same header. */
    if(nvq&&window.eviaNvq.courseScreen){window.eviaNvq.courseScreen();scr().insertAdjacentHTML("afterbegin",header("Topics").replace('class="th-head"','class="th-head" id="ui-course-head"'));wireHeader();return}
    let A=null;try{A=window.eviaStats.compute().a}catch(_){}
    const ev=typeof evidence!=="undefined"?evidence:[],mine=n=>ev.filter(e=>e.c===course&&e.u===n&&!e.induction);
    const LV={strong:["Strong","g"],good:["Good","y"],weak:["Weak","o"]};
    const behind=A&&A.timePct!=null&&A.timePct-A.ksbPct>10;
    const hero=A?'<section class="th-hero"><span class="th-k">Your course</span><strong class="th-big">'+A.ksbPct+'%<small> of '+(window.eviaTerm?window.eviaTerm().many:"KSBs")+(A.signoff?" signed off":" with evidence")+'</small></strong>'+
      '<span class="th-bar"><i style="width:'+Math.min(100,A.ksbPct)+'%"></i></span><small class="th-note">'+(A.timePct==null?"":A.timePct-A.ksbPct>25?"Behind for this point in your course: you’re "+A.timePct+"% of the way through":behind?"A little behind for this point in your course":"On track for this point in your course")+'</small></section>':"";
    const rows=us.map((u,i)=>{const name=u[0],n=mine(name).length,lv=typeof unitStrengthForCourse==="function"?unitStrengthForCourse(name):null,draft=typeof isDraft==="function"&&isDraft(name);
      return '<button type="button" class="th-row" data-u="'+i+'"><span class="th-num'+(lv?" th-num-"+lv:"")+'">'+(i+1)+'</span><span class="th-copy"><strong>'+esc(name)+'</strong><small>'+(n?n+(n===1?" piece":" pieces")+" of evidence":"Not started")+'</small></span>'+
        (draft?'<span class="th-pill th-pill-y">Draft</span>':"")+(n&&typeof strengthBars==="function"?'<span class="th-bars" title="'+esc(lv?LV[lv][0]+" evidence":"")+'">'+strengthBars(lv)+'</span>':"")+GO+'</button>'});
    scr().innerHTML=header("Topics").replace('class="th-head"','class="th-head" id="ui-course-head"')+
hero+
      group(rows,nvq?"Site jobs":"Units")+
      group([row({id:"th-sup",ic:"clip",c:"p",title:"Supporting evidence",sub:"Witness statements, videos and files"}),
        row({id:"th-share",ic:"send",c:"b",title:"Send to my portfolio",sub:"Share your evidence as one PDF"})]);
    wireHeader();
    scr().querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>window.openUnit(+b.dataset.u));
    on("th-sup",()=>window.openSupportingEvidence&&window.openSupportingEvidence());
    /* The first-run tour points at Supporting evidence by this. */
    const sup=document.getElementById("th-sup");if(sup)sup.setAttribute("data-supporting-evidence","");
    on("th-share",()=>window.eviaOpenSendToPortfolio&&window.eviaOpenSendToPortfolio());
  }

  /* ---------- Shared: the hours aim ---------- */
  function aimPerWeek(){
    try{const en=D().enrolment&&D().enrolment(),p=D().learner()||{},s=Date.parse((en&&en.start)||p.start||""),e=Date.parse((en&&en.end)||p.end||""),planned=Number(en&&en.plannedOtjHours);
      if(planned>0&&e>s)return Math.round(planned/((e-s)/(7*DAY))*10)/10}catch(_){}
    return 6;
  }
  /* ---------- Review: the one checklist in the app ----------
     Everything the assessor needs at the next review, each ticking itself off as the learner works. Nothing else in
     the app asks them to complete things. */
  function since(){
    try{const en=D().enrolment&&D().enrolment(),p=D().learner()||{};
      const last=[en&&en.lastReview?Date.parse(en.lastReview):0,...(window.eviaGetReviews?window.eviaGetReviews():[]).map(r=>Date.parse(r.date)||0)].reduce((a,b)=>Math.max(a,b),0);
      return last||Date.parse((en&&en.start)||p.start||"")||Date.now()-84*DAY}catch(_){return Date.now()-84*DAY}
  }
  function checklist(){
    let St=null;try{St=window.eviaStats.compute()}catch(_){}
    const A=St&&St.a,from=since(),fromTxt=new Date(from).toLocaleDateString("en-GB",{day:"numeric",month:"short"});
    const prep=window.eviaReviewPrep?window.eviaReviewPrep():null,area=id=>prep&&prep.all?prep.all.find(x=>x.id===id):null;
    const gap=A&&A.timePct!=null?A.timePct-A.ksbPct:0,otj=area("otj");
    const T=window.eviaTargets,tg=T?T.mine():[],tdone=tg.filter(x=>x.done).length;
    const conf=St&&St.confidence,confNew=!!(conf&&conf.last&&conf.last>=from);
    const EM=window.eviaEmployer&&window.eviaEmployer.get(),rated=EM&&(EM.ratings||[])[0],emNew=!!(rated&&Date.parse(rated.created_at)>=from);
    const go=(fn,delay)=>()=>{if(window.chat)window.chat({quiet:true});setTimeout(fn,delay||120)};
    const items=[
      {id:"evidence",title:"Evidence on track",ok:gap<=10,sub:A?A.ksbPct+"% of "+(window.eviaTerm?window.eviaTerm().many:"KSBs")+(A.signoff?" signed off":" with evidence")+(gap>10?": add some evidence":""):"",run:()=>nav("course")},
      {id:"hours",title:"Learning hours on track",ok:!!(otj&&otj.ok),sub:otj?otj.text:"",run:()=>nav("calendar")},
      /* Only when there are targets: none set isn't something to tick. */
      tg.length?{id:"targets",title:"Targets met",ok:tdone===tg.length,sub:tdone+" of "+tg.length+" done",run:()=>window.eviaProgressDeep&&window.eviaProgressDeep("targets")}:null,
      {id:"conf",title:"Confidence check",ok:confNew,sub:confNew?"Done "+new Date(conf.last).toLocaleDateString("en-GB",{day:"numeric",month:"short"}):"Two minutes: rate your skills",run:()=>window.eviaPractice&&window.eviaPractice.openConfidence?window.eviaPractice.openConfidence():go(()=>window.eviaCoachFlows.confidence())()},
      live()?{id:"employer",title:"Employer feedback",ok:emNew,sub:emNew?(EM.who||"Your employer")+" rated you "+new Date(rated.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short"}):"Not yet since "+fromTxt+": ask your employer",run:()=>emNew?window.eviaProgressDeep("employer"):window.eviaMessages&&window.eviaMessages.open()}:null,
      prep&&prep.rd&&(prep.rd.college||live())?{id:"comments",title:"Your comments",ok:!!prep.commentsDone,sub:prep.commentsDone?"Done: your assessor can read them":"How it’s going, any help you need",run:comments}:null
    ].filter(Boolean);
    return {items,done:items.filter(x=>x.ok).length,rd:window.eviaReviewDue&&window.eviaReviewDue()};
  }
  window.eviaReviewChecklist=checklist;
  /* Your comments for the assessor: one page, tap answers, a few optional lines. The assessor reads them before the
     review and they fill in part of it. */
  function comments(){
    const C=window.eviaComments;if(!C)return window.eviaChatReview&&window.eviaChatReview();
    const old=C.latest(),c=Object.assign({},old&&old.reflection||{}),dsl=((D().learner&&D().learner())||{}).safeguarding||{};
    const Q=[["feelsSafe","Do you feel safe at work and at college?",["Yes","No","I’d like to talk about it"]],
      ["knowsReporting","If something worried you, do you know who to tell?"+(dsl.name?" Your safeguarding lead is "+dsl.name+(dsl.phone?", "+dsl.phone:"")+".":""),["Yes","No"]],
      ["changes","Has anything changed at work? Your employer, job, hours or contract.",["No","Yes"],"changesDetail","What’s changed?"],
      ["hsIncident","Any accidents, near misses or safety worries at work?",["No","Yes"],"hsDetail","What happened?"],
      ["otjHappening","Is your training time happening in your paid hours?",["Yes","Mostly","No"]]];
    const W=[["learnerFeedback","How are you finding your apprenticeship?"],["support","Is there anything that would help you learn?"],["nextSteps","What would you like to do after your apprenticeship?"]];
    const pills=(k,opts)=>'<span class="th-pills">'+opts.map(o=>'<button type="button" class="th-pick'+(c[k]===o?" on":"")+'" data-k="'+k+'" data-v="'+esc(o)+'">'+esc(o)+'</button>').join("")+'</span>';
    const o=document.createElement("div");o.className="th-sheet-wrap";
    o.innerHTML='<section class="th-sheet th-tall" role="dialog" aria-modal="true" aria-labelledby="th-cm-t"><header class="th-sheet-head"><h2 id="th-cm-t">Your comments</h2><button type="button" class="th-x" aria-label="Close">×</button></header>'+
      '<p class="th-note" style="margin:0 4px 12px">Your assessor reads these before your review. Tap your answers; the rest is optional.</p>'+
      '<div class="th-group th-form">'+Q.map(q=>'<div class="th-q"><span class="th-qt">'+esc(q[1])+'</span>'+pills(q[0],q[2])+(q[3]?'<textarea class="th-ta" data-no-mic data-w="'+q[3]+'" rows="2" placeholder="'+esc(q[4])+'"'+(c[q[0]]==="Yes"?"":" hidden")+'>'+esc(c[q[3]]||"")+'</textarea>':"")+'</div>').join("")+'</div>'+
      '<h2 class="th-h2">In your own words <small>optional</small></h2><div class="th-group th-form">'+W.map(w=>'<div class="th-q"><span class="th-qt">'+esc(w[1])+'</span><textarea class="th-ta" data-w="'+w[0]+'" rows="2">'+esc(c[w[0]]||"")+'</textarea></div>').join("")+'</div>'+
      '<div class="th-btns th-sticky"><button type="button" class="primary" id="th-cm-save">Save my comments</button></div></section>';
    const close=()=>o.remove();
    o.querySelector(".th-x").onclick=close;
    o.querySelectorAll(".th-pick").forEach(b=>b.onclick=()=>{c[b.dataset.k]=b.dataset.v;o.querySelectorAll('.th-pick[data-k="'+b.dataset.k+'"]').forEach(x=>x.classList.toggle("on",x===b));
      const q=Q.find(x=>x[0]===b.dataset.k);if(q&&q[3]){const t=o.querySelector('[data-w="'+q[3]+'"]');t.hidden=b.dataset.v!=="Yes";if(!t.hidden)t.focus()}check()});
    const save=o.querySelector("#th-cm-save");
    const check=()=>{const missing=Q.filter(q=>!c[q[0]]).length;save.disabled=!!missing;save.textContent=missing?"Answer "+missing+" more to save":"Save my comments"};
    save.onclick=()=>{o.querySelectorAll("[data-w]").forEach(t=>{c[t.dataset.w]=t.hidden?"":t.value.trim()});
      if(!C.save(c)){alert("Evia couldn’t save that just now. Please try again.");return}
      close();if(typeof showEvidenceToast==="function")showEvidenceToast("Comments saved for your assessor");if(screen==="learning")review()};
    check();document.body.appendChild(o);
  }
  window.eviaTidyComments=comments;
  function review(){
    const t=document.getElementById("page-title");if(t)t.textContent="Review";
    const C=checklist(),rd=C.rd,n=C.items.length,pct=n?Math.round(C.done/n*100):0;
    const en=D().enrolment&&D().enrolment()||{},who=en.assessor||"";
    const TICK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.5 4 4 8-9"/></svg>';
    scr().innerHTML=header("Review")+
      '<section class="th-hero th-rev"><span class="th-ring" style="--p:'+pct+'"><b>'+C.done+'/'+n+'<small>ready</small></b></span><span class="th-rev-copy"><span class="th-k">Next review</span>'+
      '<strong class="th-big th-big-s">'+(!rd?"Not booked yet":rd.days<0?"Overdue":rd.days===0?"Today":esc(rd.due.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})))+'</strong>'+
      '<small class="th-note">'+(!rd?"Your assessor will set it":rd.days>0?"In "+rd.days+" day"+(rd.days===1?"":"s"):"Talk to your assessor")+(who?" · with "+esc(who):"")+'</small></span></section>'+
      (window.eviaJourneyPack?window.eviaJourneyPack.journeyCard():"")+
      '<h2 class="th-h2">Ready for your review</h2><div class="th-group">'+C.items.map(x=>'<button type="button" class="th-row th-check'+(x.ok?" th-ok":"")+'" data-check="'+x.id+'"><span class="th-tick">'+(x.ok?TICK:"")+'</span>'+
        '<span class="th-copy"><strong>'+esc(x.title)+'</strong><small>'+esc(x.sub)+'</small></span>'+GO+'</button>').join("")+'</div>'+
      '<div class="th-group th-quiet">'+[window.eviaJourneyPack?row({id:"th-prep",ic:"send",title:"My journey pack",sub:"Where you are, to show or share with your assessor"}):"",
        row({id:"th-past",ic:"review",title:"Past reviews and targets"})].filter(Boolean).join("")+'</div>'+
      /* My future: their goal, the steps towards it, guides and the college's careers sessions (future.js). */
      (window.eviaFuture?'<div class="th-group th-quiet">'+row({id:"th-future",ic:"star",title:"My future",sub:(()=>{const F=window.eviaFuture.summary&&window.eviaFuture.summary();return F?F.goal+" · "+F.done+" of "+F.steps+" steps":"Where do you want your trade to take you?"})()})+'</div>':"");
    wireHeader();
    scr().querySelectorAll("[data-check]").forEach(b=>b.onclick=()=>{const x=C.items.find(i=>i.id===b.dataset.check);if(x&&x.run)x.run()});
    on("th-prep",()=>window.eviaJourneyPack.open());
    on("th-past",()=>window.eviaProgressDeep&&window.eviaProgressDeep("review"));
    on("th-future",()=>window.eviaFuture.open());
  }

  /* ---------- Time: learning hours and college ---------- */
  let full=false;   /* the full calendar, opened from Plan */
  function whatsOn(){
    const N=window.eviaNisia,A=window.eviaAttendance,AT=A&&A.data?A.data():null,by={};
    const add=(k,x)=>(by[k]=by[k]||[]).push(x);
    if(AT)AT.coming.forEach(s=>add(s.session_date,{kind:"class",at:s.starts_at,title:"College"+(s.class?" · "+s.class:""),sub:[time(s.starts_at),s.room].filter(Boolean).join(" · ")}));
    else{let days=[];try{days=JSON.parse(localStorage.getItem("evia7-college-days")||"[]")}catch(_){}
      for(let i=0;i<8;i++){const d=new Date(Date.now()+i*DAY);if(days.includes(d.getDay()))add(dkey(d),{kind:"class",title:"College",sub:"Your college day"})}}
    (N&&N.visits?N.visits():[]).forEach(v=>{const KIND={visit:"Assessor visit",observation:"Assessor observation",review:"Progress review"};
      add(dkey(new Date(v.starts_at)),{kind:"visit",at:v.starts_at,title:KIND[v.kind]||"Assessor visit",sub:[time(v.starts_at),v.place,v.note].filter(Boolean).join(" · ")})});
    if(AT)(AT.booked||[]).forEach(a=>{for(let d=new Date(a.starts_on+"T12:00:00");dkey(d)<=a.ends_on;d.setDate(d.getDate()+1))add(dkey(d),{kind:"off",title:"Booked off",sub:a.reason||""})});
    Object.values(by).forEach(l=>l.sort((x,y)=>String(x.at||"").localeCompare(String(y.at||""))));
    return {by,AT};
  }
  function plan(){
    if(full){fullCalendar();return}
    const t=document.getElementById("page-title");if(t)t.textContent="Time";
    let St=null;try{St=window.eviaStats.compute()}catch(_){}
    const aim=aimPerWeek(),wk=St?St.otjWeek||0:0,pct=Math.min(100,Math.round(wk/aim*100));
    const {by,AT}=whatsOn(),N=window.eviaNisia,now=N&&N.classNow?N.classNow():null;
    const canAway=live()&&N&&N.bookAbsence&&window.eviaTodo&&window.eviaTodo.away;
    const days=[];for(let i=0;i<7;i++){const d=new Date(Date.now()+i*DAY);days.push([d,dkey(d),by[dkey(d)]||[]])}
    const strip='<div class="th-strip">'+days.map(([d,k,items],i)=>'<span class="th-sd'+(i===0?" th-sd-on":"")+'"><small>'+esc(i===0?"Today":d.toLocaleDateString("en-GB",{weekday:"short"}))+'</small><b>'+d.getDate()+'</b><i class="'+(items[0]?"th-dot-"+items[0].kind:"")+'"></i></span>').join("")+'</div>';
    /* The next thing at college (or a visit), from today on. */
    let next=null;for(let i=0;i<60&&!next;i++){const d=new Date(Date.now()+i*DAY),l=by[dkey(d)]||[];const x=l.find(y=>y.kind!=="off");if(x)next=[d,x,i]}
    const nextRow=next?row({id:"th-next",ic:next[1].kind==="visit"?"pin":"cal",title:(next[2]===0?"Today":next[2]===1?"Tomorrow":next[0].toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}))+" · "+next[1].title,sub:next[1].sub}).replace('class="th-row"','class="th-row th-static"').replace(GO,""):
      row({id:"th-next",ic:"cal",title:"Nothing booked yet",sub:live()?"Your tutor sets your college days":"Set your college days in the calendar"});
    /* The last 8 weeks of learning hours, against the weekly aim; and the latest logs. */
    const H=typeof hours!=="undefined"&&Array.isArray(hours)?hours:[],ws=t=>{const d=new Date(t);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getTime()};
    const weeks=[];for(let i=7;i>=0;i--){const from=ws(Date.now())-i*7*DAY;weeks.push({from,h:H.filter(x=>{const t=Number(x.on||x.createdAt)||0;return t>=from&&t<from+7*DAY}).reduce((n,x)=>n+Number(x.n||0),0)})}
    const top=Math.max(aim,...weeks.map(w=>w.h))||1,met=weeks.filter(w=>w.h>=aim).length;
    const chart='<section class="th-card th-weeks"><div class="th-sec th-in"><span class="th-k">Last 8 weeks</span><small class="th-note">Aim met '+met+' of 8</small></div>'+
      '<div class="th-chart" style="--aim:'+Math.round(aim/top*100)+'%">'+weeks.map((w,i)=>'<span class="th-col'+(i===7?" now":"")+(w.h>=aim?" met":"")+'" title="'+esc(hm(w.h))+'"><i style="height:'+Math.max(w.h?6:0,Math.round(w.h/top*100))+'%"></i><small>'+esc(i===7?"Now":new Date(w.from).toLocaleDateString("en-GB",{day:"numeric",month:"short"}).replace(" "," "))+'</small></span>').join("")+'<em class="th-aim"></em></div></section>';
    const total=St?St.otjTotal||0:0,planned=(()=>{try{return Number((D().enrolment&&D().enrolment()||{}).plannedOtjHours)||0}catch(_){return 0}})();
    const recent=H.slice().sort((x,y)=>Number(y.on||y.createdAt)-Number(x.on||x.createdAt)).slice(0,3);
    const logs=recent.length?'<h2 class="th-h2">Latest learning</h2><div class="th-group">'+recent.map(x=>row({ic:"clock",title:x.description||"Learning",sub:new Date(Number(x.on||x.createdAt)).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})+" · "+hm(Number(x.n)||0)}).replace('class="th-row"','class="th-row th-static"').replace(GO,"")).join("")+'</div>':"";
    scr().innerHTML=header("Time")+
      '<section class="th-hero"><span class="th-k">Learning hours this week</span><strong class="th-big">'+esc(hm(wk))+'<small> / '+esc(hm(aim))+'</small></strong><span class="th-bar"><i style="width:'+pct+'%"></i></span>'+
      '<small class="th-note">'+esc(hm(total))+' in total'+(planned?' of '+planned+'h · '+Math.min(100,Math.round(total/planned*100))+'% done':'')+'</small>'+
      '<div class="th-btns"><button type="button" class="primary" id="th-log">Log hours</button><button type="button" class="secondary" id="th-logs">See logs</button></div></section>'+chart+
      '<div class="th-sec"><h2 class="th-h2">College</h2><button type="button" class="th-link" id="th-cal">Full calendar</button></div>'+
      '<div class="th-group">'+strip+nextRow+
        (now&&window.eviaCheckIn?row({id:"th-checkin",ic:"qr",title:"Check in now",sub:now.class||"Your class is on"}):"")+
        (AT?row({id:"th-att",ic:"qr",title:"Attendance",sub:AT.pct==null?"No registers yet":AT.pct+"% · "+AT.here+" of "+AT.n+" sessions"}):"")+
        (canAway?row({id:"th-away",ic:"away",title:"Can’t make college?",sub:"Tell your tutor"}):"")+'</div>'+logs;
    wireHeader();
    on("th-log",()=>{if(window.chat)window.chat({quiet:true});setTimeout(()=>window.eviaCoachFlows&&window.eviaCoachFlows.hours(),120)});
    on("th-logs",()=>window.eviaOpenLearningLogs&&window.eviaOpenLearningLogs());
    on("th-checkin",()=>window.eviaCheckIn.open());
    on("th-att",()=>window.eviaProgressDeep&&window.eviaProgressDeep("attendance"));
    on("th-away",()=>{if(window.chat)window.chat({quiet:true});setTimeout(()=>window.eviaTodo.away(),120)});
    on("th-cal",()=>{full=true;fullCalendar()});
    if(!next)on("th-next",()=>{full=true;fullCalendar()});
  }
  /* The month calendar, attendance and college days (calendar.js), with a way back to Plan. */
  function fullCalendar(){
    if(window.eviaCalendar&&window.eviaCalendar.page)window.eviaCalendar.page();
    const h=scr().querySelector(".ui-page-head");
    const back=document.createElement("button");back.type="button";back.className="secondary tg-back th-back";back.textContent="‹ Time";back.onclick=()=>{full=false;plan()};
    if(h){h.querySelector("h1").textContent="Calendar";h.after(back)}else scr().prepend(back);
    scr().querySelectorAll(".cal-me-wrap,.cal-h").forEach(x=>x.remove());
  }

  /* ---------- Learn: the original Teach me page, with the shared header ---------- */
  function learn(){
    const h=scr().querySelector(".ui-page-head");if(!h||h.dataset.tidy)return;
    const tmp=document.createElement("div");tmp.innerHTML=header("Learn");const nh=tmp.firstChild;nh.dataset.tidy="1";h.replaceWith(nh);
    wireHeader();
  }

  /* ---------- Wire into the app ---------- */
  window.courses=function(){topics()};
  window.portfolio=()=>window.courses();
  window.eviaProgressPage=review;
  const prev=window.render;
  window.render=function(){
    if(screen!=="calendar")full=false;
    const r=prev.apply(this,arguments);
    if(screen==="calendar")plan();
    else if(screen==="teach")learn();
    return r;
  };
  /* The bottom bar: Topics · Time · Evia · Review · Learn. */
  const label=()=>{const l=document.getElementById("nav-college");if(l)l.textContent="Time";const r=document.querySelector('[data-nav="learning"] span:last-child');if(r)r.textContent="Review"};
  label();setTimeout(label,500);
  if(window.eviaCalendar)window.eviaCalendar.name=()=>"Time";
  window.eviaTidy={topics,review,plan,learn,header,checklist};
})();
