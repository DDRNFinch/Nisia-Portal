/* Evia7 to-do: Evia keeps the learner on track. When the chat opens she lists what actually needs doing, the three
   most urgent first, each one tap from the place in the app to do it. Nothing to do: "You're all caught up", and three
   ways to get ahead. The work itself happens in the rest of the app.
   What counts, most urgent first: checking in to the class that's on now (and a check-in that didn't go through),
   what the assessor asked for, the first piece of evidence, overdue targets, a review
   that's close, evidence drafts, targets due soon, the next unit when behind pace, weak evidence, learning hours,
   other targets, the confidence check, a backup, and course notifications.
   Connected to a college with classes, "Can't make college?" sits quietly under the list: the days and why, and
   everyone with the learner is told.
   window.eviaTodo: list(), show(opts), away(). */
(function(){
  const K=()=>window.eviaChatKit,C=()=>window.eviaCoachFlows||{};
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const DAY=864e5,hm=h=>window.eviaHM?window.eviaHM(h):Math.round(h*10)/10+"h";
  const plural=(n,w)=>n+" "+w+(n===1?"":"s");
  const listText=a=>a.length<2?a.join(""):a.slice(0,-1).join(", ")+" and "+a[a.length-1];
  const shortDay=d=>new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short"});
  const leave=f=>()=>{K().closeChat();setTimeout(f,100)};
  const openUnit=u=>K().openUnitFromChat(u);
  const unitAt=(u,sel,how)=>()=>C().openUnitAt?C().openUnitAt(u,sel,how):openUnit(u);
  const inChat=(said,f)=>()=>{K().userSays(said);f()};
  function aimPerWeek(){
    try{const en=window.eviaData.enrolment&&window.eviaData.enrolment(),p=window.eviaData.learner()||{},s=Date.parse((en&&en.start)||p.start||""),e=Date.parse((en&&en.end)||p.end||""),planned=Number(en&&en.plannedOtjHours);
      if(planned>0&&e>s)return Math.round(planned/((e-s)/(7*DAY))*10)/10}catch(_){}
    return 6;
  }
  const weekStart=t=>{const d=new Date(t);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getTime()};

  /* Everything that needs doing, most urgent first: {u: urgency, title, detail, label, run}. */
  function list(){
    let S=null;try{S=window.eviaStats.compute()}catch(_){return []}
    const a=S.a,units=a.units,out=[],add=(u,ic,title,detail,label,run)=>out.push({u,ic,title,detail,label,run});
    const N=window.eviaNisia,live=N&&N.joined&&N.joined()&&N.joined().live;

    /* A class on now: check in (works with no signal too). */
    const now=live&&N.classNow?N.classNow():null;
    if(now&&window.eviaCheckIn){
      const st=Date.parse(now.starts_at),mins=Math.round((Date.now()-st)/60000);
      add(110,"checkin","Check in to "+(now.class||"class"),(mins<0?"Starts at ":"Started at ")+new Date(st).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})+(now.room?" · "+now.room:""),"Check in",leave(()=>window.eviaCheckIn.open()));
    }
    /* A check-in kept with no signal that Nisia turned down when it was sent. */
    (live&&N.checkInProblems?N.checkInProblems():[]).slice(0,1).forEach(p=>add(105,"checkin","Your check-in didn’t go through",(p.class?p.class+", ":"")+shortDay(p.at)+": tell your tutor","What to do",inChat("My check-in didn’t go through",()=>{
      N.seenCheckInProblems();
      K().say("When Evia sent it, your college said: “"+esc(p.message||"that code didn’t match")+"”");
      K().say("Tell your tutor you were there"+(p.class?" for <strong>"+esc(p.class)+"</strong>":"")+" on "+esc(shortDay(p.at))+". They can mark you on the register.");
      K().replies([{label:"Back to my list",back:true,run:()=>show({again:true})}]);
    })));

    /* The assessor is visiting in the next 3 days (booked in Milos): when and where, and the Calendar. */
    const soonV=(live&&N.visits?N.visits():[]).filter(v=>{const t=Date.parse(v.starts_at);return t+(v.minutes||60)*6e4>Date.now()&&t<Date.now()+3*864e5}).sort((x,y)=>String(x.starts_at).localeCompare(y.starts_at))[0];
    if(soonV){const t=new Date(soonV.starts_at),day=t.toDateString()===new Date().toDateString()?"Today":t.toLocaleDateString("en-GB",{weekday:"long"});
      add(97,"assessor",(soonV.kind==="review"?"Progress review ":"Your assessor visits ")+(day==="Today"?"today":"on "+day),t.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})+(soonV.place?" · "+soonV.place:"")+(soonV.note?" · "+soonV.note:""),"See it on my calendar",leave(()=>nav("calendar")))}
    /* The assessor asked for more on a unit. */
    const more=window.eviaMoreRequired?window.eviaMoreRequired():[];
    [...new Set(more.map(x=>x.unit))].forEach(name=>{const u=units.find(x=>x.name===name);if(!u)return;
      const codes=more.filter(x=>x.unit===name).map(x=>x.code);
      add(100,"assessor","Assessor wants more: "+name,"Still needed: "+codes.slice(0,4).join(", ")+(codes.length>4?" +"+(codes.length-4):""),"Catch up",unitAt(u,"#cu-start","click"))});

    /* No evidence yet: the first unit. */
    const started=units.filter(u=>u.started);
    if(!started.length&&a.quickest)add(95,"evidence","Start your first evidence",a.quickest.name+" is a good place to start","Start "+a.quickest.name,()=>openUnit(a.quickest));

    /* Targets from the review. */
    const T=window.eviaTargets,targets=T?T.mine().filter(t=>!t.done):[];
    targets.forEach(t=>{const due=new Date(t.due+"T23:59:59").getTime(),days=Math.ceil((due-Date.now())/DAY),go=C().targetDo?C().targetDo(t):leave(()=>nav("learning"));
      if(days<0)add(90,"target",t.title,"Target overdue since "+shortDay(due),"Do it now",go);
      else if(days<=14)add(70,"target",t.title,"Target due "+(days===0?"today":days===1?"tomorrow":"in "+plural(days,"day")),"Do it now",go);
      else add(40,"target",t.title,"Target due "+shortDay(due),"Do it now",go)});

    /* A review that's close, with things to get ready (including their comments for the assessor). */
    const rd=window.eviaReviewDue&&window.eviaReviewDue(),prep=window.eviaReviewPrepCount?window.eviaReviewPrepCount():0;
    if(rd&&rd.days<=14&&rd.days>=-14&&prep)add(rd.days<=7?85:65,"review",rd.days<0?"Review overdue: get ready":rd.days===0?"Review today: get ready":"Review in "+plural(rd.days,"day"),plural(prep,"thing")+" to get ready","Get ready",inChat("Get ready for my review",()=>C().prepare&&C().prepare()));

    /* Evidence started but not saved. */
    if(typeof isDraft==="function")units.filter(u=>isDraft(u.name)).slice(0,2).forEach(u=>add(75,"draft","Finish your "+u.name+" draft","Started, not saved yet","Finish it",()=>openUnit(u)));

    /* Behind pace: the unit that ticks off the most. */
    if(started.length&&a.timePct!=null&&a.quickest&&a.timePct-a.ksbPct>10)
      add(Math.min(80,60+Math.round((a.timePct-a.ksbPct)/5)),"unit","Next unit: "+a.quickest.name,"Covers "+plural(a.quickest.missing.length,"KSB")+" you still need","Open "+a.quickest.name,()=>openUnit(a.quickest));

    /* Weak evidence: too few photos, or a write-up missing what the assessor looks for. */
    (S.checks||[]).map(c=>({c,p:c.terms.length?c.covered.length/c.terms.length:1})).filter(x=>x.p<.5||x.c.photos<3).sort((x,y)=>x.p-y.p).slice(0,2).forEach(({c})=>{
      const few=c.photos<3;
      add(55,few?"photo":"write","Strengthen "+c.u.name,few?(c.photos?"Only "+plural(c.photos,"photo")+": add more":"No photos yet"):"Covers "+c.covered.length+" of "+c.terms.length+" key points",
        few?"Add photos":"Improve it",few?unitAt(c.u,"#evidence-photos"):unitAt(c.u,"#write","focus"))});

    /* Learning hours: behind this week (from Wednesday), or last week fell short. */
    const aim=aimPerWeek(),wd=new Date().getDay(),ws=weekStart(Date.now());
    const last=(typeof hours!=="undefined"?hours:[]).filter(x=>{const t=Number(x.on||x.createdAt);return t>=ws-7*DAY&&t<ws}).reduce((n,x)=>n+Number(x.n||0),0);
    if(S.otjWeek<aim&&(wd===0||wd>=3))add(50,"hours","Log your learning hours",(S.otjWeek?hm(S.otjWeek):"Nothing")+" this week, aim for "+hm(aim),"Log hours",inChat("Log my hours",()=>C().hours&&C().hours()));
    else if(S.otjWeek<aim&&last<aim&&started.length)add(45,"hours","Log your learning hours",hm(last)+" last week, aim for "+hm(aim),"Log hours",inChat("Log my hours",()=>C().hours&&C().hours()));

    /* The confidence check: never done, or over 12 weeks ago. */
    const conf=S.confidence;
    if(!conf.sessions)add(35,"skills","Rate your skills","Two minutes, tells your tutor what to practise","Start",inChat("Rate my skills",()=>C().confidence&&C().confidence()));
    else if(conf.last&&Date.now()-conf.last>84*DAY)add(30,"skills","Rate your skills again","Last done "+shortDay(conf.last),"Start",inChat("Rate my skills",()=>C().confidence&&C().confidence()));

    /* A backup, for learners not connected to a college (their work only lives on this phone). */
    const joined=window.eviaNisia&&window.eviaNisia.joined&&window.eviaNisia.joined();
    if(!joined){
      const packs=(typeof evidence!=="undefined"?evidence:[]).filter(e=>e&&!e.induction),lastB=Date.parse(localStorage.getItem("evia7-last-backup")||"")||null;
      const since=lastB?packs.filter(e=>(Date.parse(e.savedAt||"")||0)>lastB).length:packs.length;
      if((!lastB&&packs.length>=3)||(lastB&&since>=5))add(25,"backup","Back up your portfolio",lastB?plural(since,"new pack")+" since your last backup":"Only saved on this phone","Back up now",()=>K().runNudge({action:{kind:"backup",label:"Back up now"}}));
    }
    /* Connected to a college: course notifications, until they've answered once. */
    if(window.eviaPush&&window.eviaPush.state()==="off"&&!window.eviaPush.asked())add(20,"bell","Turn on course notifications","Hear about sign-offs and reviews","Turn on",pushOn);

    return out.sort((x,y)=>y.u-x.u);
  }
  async function pushOn(){
    K().userSays("Turn on notifications");
    let ok=false;try{ok=await window.eviaPush.on()}catch(_){}
    K().say(ok?"Done. I’ll only tell you about your course, and never between 9pm and 7:30am. You can turn them off in your profile."
      :window.eviaPush.state()==="blocked"?"Notifications are blocked for Evia in your phone’s settings. Allow them there, then turn them on in your profile."
      :"I couldn’t turn them on just now. You can try again from your profile.");
    K().replies([{label:"Something else",run:()=>show({again:true})}]);
  }

  /* ---------- In the chat ---------- */
  const SVG=p=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';
  const ICON={
    assessor:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
    evidence:'<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5Z"/><circle cx="12" cy="13" r="3.5"/>',
    photo:'<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5Z"/><circle cx="12" cy="13" r="3.5"/>',
    target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    review:'<path d="M9 4.5h6a1 1 0 0 1 1 1V7H8V5.5a1 1 0 0 1 1-1Z"/><path d="M8 5.5H6.5A1.5 1.5 0 0 0 5 7v12.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V7a1.5 1.5 0 0 0-1.5-1.5H16"/><path d="m8.5 13.5 2.3 2.3 4.7-4.8"/>',
    draft:'<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
    write:'<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
    unit:'<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
    hours:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    skills:'<path d="M5 19V13M10 19V9M15 19v-5M20 19V5"/>',
    backup:'<path d="M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.5A3.8 3.8 0 0 1 17.5 18Z"/><path d="M12 11v5M9.5 13.5 12 11l2.5 2.5"/>',
    bell:'<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    checkin:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 19v1M19 14h1"/>'
  };
  const GO=SVG('<path d="m9 6 6 6-6 6"/>');
  const reduced=()=>window.eviaAccessibility?window.eviaAccessibility.reducedMotion():matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* All caught up: a tick that draws itself and a burst of confetti. */
  function celebrate(){
    const colours=["var(--yellow,#f5c518)","#3cb371","#4f8cff","#ff7a59","#b06cff"];
    K().widget('<div class="td-done" role="img" aria-label="All caught up"><svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="23"/><path d="m15 27 7 7 15-16"/></svg>'+
      (reduced()?"":'<span class="td-confetti" aria-hidden="true">'+Array.from({length:18},(_,i)=>{const ang=i/18*Math.PI*2+Math.random()*.3,d=60+Math.random()*50;
        return '<i style="--x:'+Math.round(Math.cos(ang)*d)+'px;--y:'+Math.round(Math.sin(ang)*d-20)+'px;--r:'+Math.round(Math.random()*540-270)+'deg;--d:'+(Math.random()*.15).toFixed(2)+'s;background:'+colours[i%colours.length]+'"></i>'}).join("")+'</span>')+'</div>');
  }
  /* Quick ways in to the important parts, always under Evia's list: the review, targets, what's missing, confidence. */
  function shortcuts(){
    const k=K(),c=C()||{},say=(t,f)=>()=>{k.userSays(t);f()};
    return [k.reviewFromMenu&&{label:"My review",run:()=>k.reviewFromMenu()},
      c.targets&&{label:"My targets",run:say("My targets",c.targets)},
      c.evidence&&{label:"What’s missing",run:say("What’s missing?",c.evidence)},
      c.confidence&&{label:"Confidence check",run:say("Rate my skills",c.confidence)}].filter(Boolean);
  }
  function show(opts){
    document.body.classList.remove("evia-epa");
    const k=K(),items=window.eviaTodo.list(),top=items.slice(0,3),name=k.firstName?k.firstName():"",again=!!(opts&&opts.again);
    const hello=again?"":["Morning","Afternoon","Evening"][new Date().getHours()<12?0:new Date().getHours()<18?1:2]+(name?" "+esc(name):"")+". ";
    if(window.eviaLook)window.eviaLook(0,-30,1800);
    if(!items.length){
      if(window.eviaMood)window.eviaMood("happy");
      k.say(hello+"You’re all caught up. Nice work.");
      celebrate();
      k.say("Want to get ahead?");
      let a=null;try{a=window.eviaStats.compute().a}catch(_){}
      const q=a&&a.quickest;
      k.replies([q?{label:(q.started?"Add to ":"Start ")+q.name,primary:true,run:()=>openUnit(q)}:{label:"Go to Topics",primary:true,run:leave(()=>nav("course"))},
        {label:"A Teach me lesson",run:leave(()=>nav("teach"))},
        {label:(window.eviaNvq&&window.eviaNvq.on())?"Knowledge tests":"EPA practice",run:()=>C().epa&&C().epa()}].concat(shortcuts()));
      awayLink();
      return;
    }
    if(window.eviaMood)window.eviaMood(items.some(x=>x.u>=85)?"think":"happy");
    const n='<span class="td-count">'+items.length+'</span>';
    k.say(again?(items.length===1?"Here’s what’s left.":"Here’s what’s left, most urgent first."):hello+(items.length===1?"You’ve got <span class=\"td-count\">one</span> thing to do.":items.length<=3?"You’ve got "+n+" things to do.":"You’ve got "+n+" things to do. Here are the 3 most urgent."));
    k.widget('<div class="td-list">'+top.map((x,i)=>'<button type="button" class="td-item td-k-'+x.ic+(x.u>=85?" urgent":"")+'" data-i="'+i+'" style="--i:'+i+'" aria-label="'+esc(x.title+". "+x.detail+". "+x.label)+'">'+
      '<span class="td-ic">'+SVG(ICON[x.ic]||ICON.unit)+'</span><span class="td-copy"><strong>'+esc(x.title)+'</strong><small>'+esc(x.detail)+'</small></span><span class="td-go">'+GO+'</span></button>').join("")+'</div>',el=>{
      el.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{
        el.querySelectorAll("button").forEach(x=>x.disabled=true);el.classList.add("td-used");b.classList.add("td-picked");
        setTimeout(()=>top[+b.dataset.i].run(),reduced()?0:260);
      });
    });
    k.replies(shortcuts());
    awayLink();
  }

  /* ---------- Can't make college? ---------- */
  const NI=()=>window.eviaNisia;
  const canAway=()=>{const N=NI(),e=N&&N.joined&&N.joined();return !!(e&&e.live&&N.bookAbsence)};
  const dkey=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const plusDays=(k,n)=>{const d=new Date(k+"T12:00:00");d.setDate(d.getDate()+n);return dkey(d)};
  const sayDay=k=>new Date(k+"T12:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});
  const sayDays=(f,t)=>f===t?sayDay(f):sayDay(f)+" to "+sayDay(t);
  function awayLink(){
    if(!canAway())return;
    const booked=NI().absences(),b=booked[0];
    K().widget('<button type="button" class="td-away"><span>Can’t make college?</span>'+(b?'<small>Booked: '+esc(sayDays(b.starts_on,b.ends_on))+' · '+esc(b.reason)+(booked.length>1?' +'+(booked.length-1):'')+'</small>':'')+'</button>',el=>{
      el.querySelector("button").onclick=()=>{el.remove();away()};
    });
  }
  function away(){
    const k=K(),N=NI(),booked=N.absences(),t=dkey(new Date());
    k.userSays("I can’t make college");
    if(window.eviaMood)window.eviaMood("think");
    k.say("No problem. I’ll let your tutor, assessor and employer know.");
    if(booked.length)k.say("Already booked: "+booked.slice(0,3).map(a=>"<strong>"+esc(sayDays(a.starts_on,a.ends_on))+"</strong> ("+esc(a.reason)+(a.local?", waiting for signal":"")+")").join(", ")+".");
    k.say("When can’t you make it?");
    k.replies([{label:"Today",primary:true,run:()=>why(t,t)},{label:"Tomorrow",run:()=>why(plusDays(t,1),plusDays(t,1))},{label:"Other days",run:pickDays},
      ...(booked.length?[{label:"Cancel one",run:cancelOne}]:[]),{label:"Back to my list",back:true,run:()=>show({again:true})}]);
  }
  function pickDays(){
    const k=K(),t=dkey(new Date());
    k.say("Pick the first and last day.");
    k.widget('<form class="td-days"><label>First day<input type="date" name="f" min="'+t+'" value="'+t+'" required></label><label>Last day<input type="date" name="t" min="'+t+'" value="'+t+'" required></label><button type="submit" class="primary">Next</button></form>',el=>{
      const f=el.querySelector("form");f.f.onchange=()=>{if(f.t.value<f.f.value)f.t.value=f.f.value;f.t.min=f.f.value};
      f.onsubmit=e=>{e.preventDefault();if(!f.f.value||!f.t.value||f.t.value<f.f.value)return;el.remove();why(f.f.value,f.t.value,sayDays(f.f.value,f.t.value))};
    });
  }
  function why(from,to,said){
    const k=K(),kinds=NI().absenceKinds;
    if(said)k.userSays(said);  /* (a reply button says itself) */
    k.say("What’s the reason?");
    k.replies(Object.keys(kinds).map((x,i)=>({label:kinds[x],primary:i===0,run:()=>note(from,to,x)})).concat([{label:"Back to my list",back:true,run:()=>show({again:true})}]));
  }
  function note(from,to,kind){
    const k=K(),other=kind==="other";
    k.say(other?"What’s the reason? Your own words are fine.":"Want to add anything for your tutor? You don’t have to.");
    k.widget('<form class="td-note"><input name="r" maxlength="200" autocomplete="off" placeholder="'+(other?"The reason":"e.g. dentist at 10, back after lunch")+'" aria-label="Reason"'+(other?" required":"")+'><button type="submit" class="primary">Tell them</button></form>',el=>{
      const f=el.querySelector("form");if(other)setTimeout(()=>f.r.focus(),50);
      f.onsubmit=async e=>{
        e.preventDefault();const r=f.r.value.trim();if(other&&!r)return f.r.focus();
        f.querySelector("button").disabled=true;
        try{
          const res=await NI().bookAbsence(from,to,kind,r);el.remove();
          if(r)k.userSays(r);
          if(window.eviaMood)window.eviaMood("happy");
          k.say(res.sent?"Done. <strong>"+esc(sayDays(from,to))+"</strong> is booked ("+esc(res.reason)+"). Your tutor, assessor and employer have been told."
            :"Saved. There’s no signal, so I’ll tell your college about <strong>"+esc(sayDays(from,to))+"</strong> as soon as there is.");
          k.say(kind==="ill"?"Get well soon.":"Thanks for letting them know.");
          k.replies([{label:"Back to my list",back:true,run:()=>show({again:true})}]);
        }catch(err){f.querySelector("button").disabled=false;k.say(esc(err.message||"That didn’t work. Try again."))}
      };
    });
  }
  function cancelOne(){
    const k=K(),list=NI().absences();
    k.say("Which one?");
    k.widget('<div class="td-list">'+list.slice(0,5).map((a,i)=>'<button type="button" class="td-item" data-i="'+i+'" style="--i:'+i+'"><span class="td-copy"><strong>'+esc(sayDays(a.starts_on,a.ends_on))+'</strong><small>'+esc(a.reason)+(a.booked_by&&a.booked_by!=="You"?" · booked by "+esc(a.booked_by):"")+'</small></span><span class="td-go">'+SVG('<path d="M6 6l12 12M18 6 6 18"/>')+'</span></button>').join("")+'</div>',el=>{
      el.querySelectorAll("[data-i]").forEach(b=>b.onclick=async()=>{
        const a=list[+b.dataset.i];el.querySelectorAll("button").forEach(x=>x.disabled=true);
        try{await NI().cancelAbsence(a.id);el.remove();k.userSays(sayDays(a.starts_on,a.ends_on));k.say("Cancelled. You’re expected in again then.")}
        catch(err){el.querySelectorAll("button").forEach(x=>x.disabled=false);k.say(esc(err.message))}
        k.replies([{label:"Back to my list",back:true,run:()=>show({again:true})}]);
      });
    });
  }
  window.eviaTodo={list,show,away};
})();
