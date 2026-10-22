/* Evia7 tidy layout: every tab looks the same and everything lives in one place.
   Each page: the same header (the page name, then Messages and the learner's photo, which opens their profile), one
   main thing at the top, then tidy rows. One job per tab:
     Topics    doing the work: units, supporting evidence, sending to the portfolio
     Progress  how am I doing: learning hours and logs, where you are, targets, reviews, tests, confidence
     Plan      what's coming up: today, the week ahead, the full calendar and attendance, My future
     Learn     getting better: carry on, subjects, practice, the Shop, mini games
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
    let A=null;try{A=window.eviaStats.compute().a}catch(_){}
    const ev=typeof evidence!=="undefined"?evidence:[],mine=n=>ev.filter(e=>e.c===course&&e.u===n&&!e.induction);
    const LV={strong:["Strong","g"],good:["Good","y"],weak:["Weak","o"]};
    const behind=A&&A.timePct!=null&&A.timePct-A.ksbPct>10;
    const hero=A?'<section class="th-hero"><span class="th-k">Your course</span><strong class="th-big">'+A.ksbPct+'%<small> of '+(window.eviaTerm?window.eviaTerm().many:"KSBs")+(A.signoff?" signed off":" with evidence")+'</small></strong>'+
      '<span class="th-bar"><i style="width:'+Math.min(100,A.ksbPct)+'%"></i></span><small class="th-note">'+(A.timePct==null?"":behind?"A little behind for this point in your course":"On track for this point in your course")+'</small></section>':"";
    const rows=us.map((u,i)=>{const name=u[0],n=mine(name).length,lv=typeof unitStrengthForCourse==="function"?unitStrengthForCourse(name):null,draft=typeof isDraft==="function"&&isDraft(name);
      return '<button type="button" class="th-row" data-u="'+i+'"><span class="th-num'+(lv?" th-num-"+lv:"")+'">'+(i+1)+'</span><span class="th-copy"><strong>'+esc(name)+'</strong><small>'+(n?n+(n===1?" piece":" pieces")+" of evidence":"Not started")+'</small></span>'+
        (draft?'<span class="th-pill th-pill-y">Draft</span>':lv?'<span class="th-pill th-pill-'+LV[lv][1]+'">'+LV[lv][0]+'</span>':"")+GO+'</button>'});
    scr().innerHTML=header("Topics").replace('class="th-head"','class="th-head" id="ui-course-head"')+hero+
      group(rows,nvq?"Site jobs":"Units")+
      group([row({id:"th-sup",ic:"clip",c:"p",title:"Supporting evidence",sub:"Witness statements, videos and files"}),
        row({id:"th-share",ic:"send",c:"b",title:"Send to my portfolio",sub:"Share your evidence as one PDF"})]);
    wireHeader();
    scr().querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>window.openUnit(+b.dataset.u));
    on("th-sup",()=>window.openSupportingEvidence&&window.openSupportingEvidence());
    on("th-share",()=>window.eviaOpenSendToPortfolio&&window.eviaOpenSendToPortfolio());
  }

  /* ---------- Progress: how am I doing ---------- */
  function aimPerWeek(){
    try{const en=D().enrolment&&D().enrolment(),p=D().learner()||{},s=Date.parse((en&&en.start)||p.start||""),e=Date.parse((en&&en.end)||p.end||""),planned=Number(en&&en.plannedOtjHours);
      if(planned>0&&e>s)return Math.round(planned/((e-s)/(7*DAY))*10)/10}catch(_){}
    return 6;
  }
  function progress(){
    const t=document.getElementById("page-title");if(t)t.textContent="Progress";
    let St=null;try{St=window.eviaStats.compute()}catch(_){}
    const A=St&&St.a,aim=aimPerWeek(),wk=St?St.otjWeek||0:0,pct=Math.min(100,Math.round(wk/aim*100));
    const behind=A&&A.timePct!=null&&A.timePct-A.ksbPct>10;
    const T=window.eviaTargets,tg=T?T.mine():[],done=tg.filter(x=>x.done).length,late=tg.filter(x=>!x.done&&x.due&&Date.parse(x.due)<Date.now()).length;
    const rd=window.eviaReviewDue&&window.eviaReviewDue();
    const tests=D().list("tests").filter(x=>x&&x.course===course),best=tests.filter(x=>x.type==="epa").reduce((m,x)=>Math.max(m,Number(x.pct)||0),-1);
    const conf=St&&St.confidence,nvq=window.eviaNvq&&window.eviaNvq.on();
    const rows=[
      row({id:"th-where",ic:"star",c:"y",title:"Where you are",sub:A?A.ksbPct+"% of "+(window.eviaTerm?window.eviaTerm().many:"KSBs")+(A.signoff?" signed off":" with evidence"):"",pill:A&&A.timePct!=null?(behind?"Behind":"On track"):"",pc:behind?"o":"g"}),
      row({id:"th-targets",ic:"target",c:"o",title:"Targets",sub:!tg.length?"None set yet":tg[0]&&tg[0].reviewDate?"From your review on "+shortDate(tg[0].reviewDate):"Set by Evia",pill:tg.length?(late?late+" overdue":done+" of "+tg.length+" done"):"",pc:late?"r":done===tg.length&&tg.length?"g":"s"}),
      row({id:"th-review",ic:"review",c:"b",title:"Progress reviews",sub:!rd?"No date yet":rd.days<0?"Overdue: talk to your assessor":rd.days===0?"Today":"Next: "+rd.due.toLocaleDateString("en-GB",{day:"numeric",month:"short"})+" · in "+rd.days+" day"+(rd.days===1?"":"s")}),
      window.eviaPrepPack?row({id:"th-prep",ic:"pack",c:"b",title:"Review prep pack",sub:"Everything since your last review, ready to share"}):"",
      row({id:"th-tests",ic:"test",c:"g",title:"Test scores",sub:tests.length?(best>=0?(nvq?"Knowledge tests":"EPA practice")+": best "+best+"%":tests.length+" tests taken"):"No tests yet"}),
      row({id:"th-conf",ic:"bars",c:"p",title:"Confidence",sub:conf&&conf.sessions?"Last rated "+new Date(conf.last).toLocaleDateString("en-GB",{day:"numeric",month:"short"}):"Not rated yet"}),
      row({id:"th-quality",ic:"write",c:"y",title:"Write-ups",sub:St&&St.coverage!=null?"Cover "+St.coverage+"% of the things to mention":"None checked yet"}),
      live()?row({id:"th-employer",ic:"work",c:"o",title:"From your employer",sub:"Behaviour ratings and witness testimony"}):"",
      row({id:"th-ach",ic:"medal",c:"y",title:"Achievements",sub:"Badges you’ve earned"})
    ].filter(Boolean);
    scr().innerHTML=header("Progress")+
      '<h2 class="th-h2 th-first">Learning hours</h2><section class="th-hero"><div class="th-line"><strong>'+esc(hm(wk))+' this week</strong><small>aim '+esc(hm(aim))+'</small></div>'+
      '<span class="th-bar"><i style="width:'+pct+'%"></i></span><div class="th-btns"><button type="button" class="primary" id="th-log">Log hours</button><button type="button" class="secondary" id="th-logs">Learning logs</button></div></section>'+
      group(rows,"Your course");
    wireHeader();
    const deep=id=>()=>window.eviaProgressDeep&&window.eviaProgressDeep(id);
    on("th-log",()=>{if(window.chat)window.chat({quiet:true});setTimeout(()=>window.eviaCoachFlows&&window.eviaCoachFlows.hours(),120)});
    on("th-logs",()=>window.eviaOpenLearningLogs&&window.eviaOpenLearningLogs());
    on("th-where",deep("where"));on("th-targets",deep("targets"));on("th-review",deep("review"));on("th-tests",deep("tests"));
    on("th-conf",deep("conf"));on("th-quality",deep("quality"));on("th-employer",deep("employer"));on("th-ach",deep("ach"));
    on("th-prep",()=>window.eviaPrepPack.open());
  }

  /* ---------- Plan: what's coming up ---------- */
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
    const t=document.getElementById("page-title");if(t)t.textContent="Plan";
    const {by,AT}=whatsOn(),today=dkey(new Date()),N=window.eviaNisia,now=N&&N.classNow?N.classNow():null;
    const todays=by[today]||[],first=todays[0];
    const canAway=live()&&N&&N.bookAbsence&&window.eviaTodo&&window.eviaTodo.away;
    const todayCard='<section class="th-hero th-today"><span class="th-k">Today · '+esc(new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"}))+'</span>'+
      (first?'<strong class="th-big th-big-s">'+esc(first.title)+(first.at?" at "+esc(time(first.at)):"")+'</strong><small class="th-note">'+esc(first.sub.replace(time(first.at)+" · ","").replace(time(first.at),""))+'</small>'+
        (todays.length>1?'<small class="th-note">and '+(todays.length-1)+' more today</small>':"")
       :'<strong class="th-big th-big-s">Nothing booked today</strong><small class="th-note">A good day to add evidence or log your hours</small>')+
      ((now&&window.eviaCheckIn)||canAway?'<div class="th-btns">'+(now&&window.eviaCheckIn?'<button type="button" class="primary" id="th-checkin">Check in</button>':"")+(canAway?'<button type="button" class="secondary" id="th-away">Can’t make it</button>':"")+'</div>':"")+'</section>';
    /* The week ahead: the next six days, weekends only when something's on. */
    const days=[];for(let i=1;i<=7&&days.length<6;i++){const d=new Date(Date.now()+i*DAY),k=dkey(d),items=by[k]||[];if((d.getDay()===0||d.getDay()===6)&&!items.length)continue;days.push([d,k,items])}
    const PC={class:["College","g"],visit:["Visit","b"],off:["Off","s"]};
    const week=days.map(([d,k,items])=>'<div class="th-day"><span class="th-when"><small>'+esc(d.toLocaleDateString("en-GB",{weekday:"short"}))+'</small><b>'+d.getDate()+'</b></span><span class="th-copy">'+
      (items.length?items.map(x=>'<strong>'+esc(x.title)+'</strong>'+(x.sub?'<small>'+esc(x.sub)+'</small>':"")).join(""):'<small class="th-none">Nothing on</small>')+'</span>'+
      (items[0]?'<span class="th-pill th-pill-'+PC[items[0].kind][1]+'">'+PC[items[0].kind][0]+'</span>':"")+'</div>').join("");
    const F=window.eviaFuture&&window.eviaFuture.summary?window.eviaFuture.summary():null;
    scr().innerHTML=header("Plan")+todayCard+'<h2 class="th-h2">The week ahead</h2><div class="th-group">'+week+'</div>'+
      group([row({id:"th-cal",ic:"cal",c:"g",title:"Calendar and attendance",sub:AT&&AT.pct!=null?AT.pct+"% attendance · every college day and visit":"Every college day, visit and learning hour"}),
        window.eviaFuture?row({id:"th-future",ic:"road",c:"p",title:"My future",sub:F?F.goal+" · "+F.done+" of "+F.steps+" steps":"Set a goal for after your apprenticeship"}):""].filter(Boolean),"More");
    wireHeader();
    on("th-checkin",()=>window.eviaCheckIn.open());
    on("th-away",()=>{if(window.chat)window.chat({quiet:true});setTimeout(()=>window.eviaTodo.away(),120)});
    on("th-cal",()=>{full=true;fullCalendar()});
    on("th-future",()=>window.eviaFuture.open());
  }
  /* The month calendar, attendance and college days (calendar.js), with a way back to Plan. */
  function fullCalendar(){
    if(window.eviaCalendar&&window.eviaCalendar.page)window.eviaCalendar.page();
    const h=scr().querySelector(".ui-page-head");
    const back=document.createElement("button");back.type="button";back.className="secondary tg-back th-back";back.textContent="‹ Plan";back.onclick=()=>{full=false;plan()};
    if(h){h.querySelector("h1").textContent="Calendar";h.after(back)}else scr().prepend(back);
    scr().querySelectorAll(".cal-me-wrap,.cal-h").forEach(x=>x.remove());
  }

  /* ---------- Learn: getting better ---------- */
  function learn(){
    const T=window.eviaTeach,R=window.eviaRewards,bal=R&&R.balance?R.balance():0;
    /* The subject tiles, as rows. */
    const tiles=[...scr().querySelectorAll(".tg-tile[data-go]")].map(b=>({id:b.dataset.go,title:(b.querySelector("strong")||{}).textContent||"",pct:((b.querySelector(".tg-ring b")||{}).textContent||""),sub:(b.querySelector("small")||{}).textContent||""}));
    const SI={course:["school","y"],maths:["calc","b"],english:["abc","p"],edi:["people","g"]};
    const games=scr().querySelector(".tt-games");
    const nx=T&&T.nextUp?T.nextUp():null;
    const coins='<span class="th-coins" aria-label="'+bal+' coins">'+(R&&R.coin?R.coin():"")+'<b>'+bal+'</b></span>';
    const practice=[window.eviaOpenEpa?row({id:"th-epa",ic:"test",c:"g",title:window.eviaNvq&&window.eviaNvq.on()?"Knowledge tests":"EPA practice",sub:"Quick practice and full mocks"}):"",
      window.eviaPractice&&window.eviaPractice.openSkills&&(window.EVIA_PRACTICE_TASKS||{})[course]?row({id:"th-skills",ic:"tools",c:"o",title:"Skills",sub:"Practical college tasks, 1 to 6 hours"}):""].filter(Boolean);
    const html=header("Learn",coins)+
      (nx?'<section class="th-hero"><span class="th-k">'+(nx.resume?"Carry on":"Next lesson")+'</span><strong class="th-big th-big-s">'+esc(nx.title)+'</strong><small class="th-note">'+esc(nx.unit)+' · lesson '+nx.n+' of '+nx.of+(nx.mins?' · about '+nx.mins+' min':"")+'</small>'+
        '<div class="th-btns"><button type="button" class="primary" id="th-next">'+(nx.resume?"Continue":"Start")+'</button></div></section>':"")+
      group(tiles.map(x=>row({attrs:' data-subject="'+esc(x.id)+'"',ic:(SI[x.id]||SI.course)[0],c:(SI[x.id]||SI.course)[1],title:x.title,sub:x.sub,pill:x.pct,pc:"s"})),"Lessons")+
      (practice.length?group(practice,"Practice"):"")+
      group([row({id:"th-shop",ic:"bag",c:"o",title:"Shop",sub:"Spend your "+bal+" coins on new looks for Evia"})]);
    const keep=games;if(keep)keep.remove();
    scr().innerHTML=html;if(keep)scr().appendChild(keep);
    wireHeader();
    on("th-next",()=>T.play(nx.id));
    scr().querySelectorAll("[data-subject]").forEach(b=>b.onclick=()=>T&&T.open(b.dataset.subject));
    on("th-epa",()=>window.eviaOpenEpa());
    on("th-skills",()=>window.eviaPractice.openSkills());
    on("th-shop",()=>nav("rewards"));
  }

  /* ---------- Wire into the app ---------- */
  window.courses=function(){topics()};
  window.portfolio=()=>window.courses();
  window.eviaProgressPage=progress;
  const prev=window.render;
  window.render=function(){
    if(screen!=="calendar")full=false;
    const r=prev.apply(this,arguments);
    if(screen==="calendar")plan();
    else if(screen==="teach"&&scr().querySelector(".tg-player"))learn();
    return r;
  };
  /* The bottom bar says Plan. */
  const label=()=>{const l=document.getElementById("nav-college");if(l)l.textContent="Plan"};
  label();setTimeout(label,500);
  if(window.eviaCalendar)window.eviaCalendar.name=()=>"Plan";
  window.eviaTidy={topics,progress,plan,learn,header};
})();
