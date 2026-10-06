/* Evia7 Teach me: short lessons where Evia teaches and you play, a bit like Duolingo or Mimo.
   A full page with an animated Evia and a path of lessons for each unit. A lesson goes: Evia teaches a little, you
   try it, you get feedback, she teaches something new, you try again, then a quick challenge, and anything you got
   wrong comes back for a second go at the end. The screens and games are in teach-play.js and the pictures in
   teach-pics.js. XP for right answers (more first time), a combo for answers in a row, a daily streak, and now and
   then a surprise bonus question. Nothing is lost for a wrong answer: Evia explains why and you go again.
   Each unit's lessons cover its KSBs between them (the learner never sees the codes). Results give "Evia's view"
   of the matching confidence skill, shown beside the learner's own rating.
   window.eviaTeach: open(which), available(), hasCourse(), summary(), viewFor(area), confidence(), stats(). */
(function(){
  const T=window.EVIA_TEACH=window.EVIA_TEACH||{courses:{},fs:[]},U=T.ui||{},ICON=U.ICON||{};
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const reduced=()=>window.eviaAccessibility?window.eviaAccessibility.reducedMotion():matchMedia("(prefers-reduced-motion: reduce)").matches;
  const buzz=ms=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(_){}};
  /* Coins (rewards.js): the balance, and the coin picture. */
  const RW=()=>window.eviaRewards;
  const coins=()=>{const R=RW();if(!R)return 0;R.sync();return R.balance()};
  const COIN=()=>RW()&&RW().coin?RW().coin().replace('class="rw-coin"','class="rw-coin tm-coin"'):"";
  const fmt=U.fmt||esc,sound=k=>{if(U.sound)U.sound(k)};
  const LEVELS=["Need training","Basics","Confident","Mastered"];
  const KEY="evia7-teach";
  const readStore=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch(_){return {}}};
  const writeStore=s=>{try{localStorage.setItem(KEY,JSON.stringify(s))}catch(_){}};
  /* Lesson results and XP are read through eviaData (data.js); the store here only keeps where a lesson was left. */
  const mine=()=>Object.fromEntries(window.eviaData.list("lessonResults",{course}).map(r=>[r.lessonId,{done:r.done,best:r.best,last:r.last,attempts:r.attempts}]));
  const me=()=>Object.assign(blankMe(),window.eviaData.list("rewards")[0].me);
  const saveResult=(id,score)=>{window.eviaData.put("lessonResults",{course,lessonId:id,last:score})};

  /* XP, the daily streak and this week, kept with the lessons under "_me" (never a course name). */
  const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const dayBefore=()=>{const d=new Date();d.setDate(d.getDate()-1);return ymd(d)};
  const blankMe=()=>({xp:0,days:{},streak:0,last:null});
  function addXp(n){
    const m=me(),today=ymd(new Date()),extended=m.last!==today;
    m.xp+=n;m.days[today]=(m.days[today]||0)+n;
    if(extended){m.streak=m.last===dayBefore()?m.streak+1:1;m.last=today}
    Object.keys(m.days).sort().slice(0,-70).forEach(k=>delete m.days[k]);
    window.eviaData.put("rewards",{me:m});return {n:m.streak,extended,total:m.xp,days:m.days};
  }
  function stats(){const m=me(),live=m.last===ymd(new Date())||m.last===dayBefore();return {xp:m.xp,streak:live?m.streak:0,today:m.last===ymd(new Date()),days:m.days}}
  /* Pictures are in teach-pics.js; the screens and games in teach-play.js. */
  const pic=(name,o)=>U.pic?U.pic(name,o):"";

  /* ---------- Lessons ----------
     The trade units come from the teach-*.js files (window.EVIA_TEACH). */
  /* The live list from the course packs (teach-kit.js fills it), so a pack loaded after a course switch shows up. */
  const COURSES=T.courses;
  /* Maths and English: the same style, for every course, when switched on in the profile. No off-the-job time. */
  /* Maths and English come from teach-maths.js and teach-english.js (Functional Skills Level 2, by area). */
  const FS=[];
  const profile=()=>window.eviaData.learner();
  /* Trade units for the course, then maths and English if they're switched on in the profile. */
  const EXT=T;
  if(EXT.fs&&EXT.fs.length)FS.splice(0,FS.length,...EXT.fs);
  /* Units follow the order of the course (lessons for units not in the course list go last). */
  const courseOrder=()=>{try{return data().u.map(u=>u[0])}catch(_){return []}};
  const trade=()=>{const list=COURSES[typeof course!=="undefined"?course:""]||[],o=courseOrder();return list.slice().sort((a,b)=>{const x=o.indexOf(a.unit),y=o.indexOf(b.unit);return (x<0?999:x)-(y<0?999:y)})};
  const units=()=>trade().concat(FS);
  const available=()=>true;
  const hasCourse=()=>trade().length>0;
  const isDone=(L,l)=>!!(L[l.id]&&L[l.id].done);
  function summary(){
    const L=mine(),all=[].concat(...units().map(u=>u.lessons)),done=all.filter(l=>isDone(L,l)).length;
    const next=all.find(l=>!isDone(L,l)),t=trade()[0];
    return {done,total:all.length,next:next?next.title:null,unit:t?t.unit:"maths and English"};
  }
  /* For My progress: each subject (the course, maths, English, EDI and safeguarding) with its areas, their average best
     score, how many are complete, and medals (gold 90%+, silver 70%+, bronze below, as on the lessons). */
  function report(){
    const L=mine(),courseName=(()=>{try{return data().name}catch(_){return "Your course"}})();
    const medalsOf=ls=>{const m={gold:0,silver:0,bronze:0};ls.forEach(l=>{const r=L[l.id];if(r&&r.done)m[medal(Number(r.best)||0)]++});return m};
    const avgOf=ls=>{const b=ls.filter(l=>isDone(L,l)).map(l=>Number(L[l.id].best)||0);return b.length?Math.round(b.reduce((n,x)=>n+x,0)/b.length*100):null};
    const subjects=[["course",courseName,trade()],["maths","Maths",FS.filter(u=>u.fs==="maths")],["english","English",FS.filter(u=>u.fs==="english")],["edi","EDI and safeguarding",FS.filter(u=>u.fs==="edi")]]
      .filter(s=>s[2].length).map(([id,name,us])=>{
        const areas=us.map(u=>{const ls=u.lessons,d=ls.filter(l=>isDone(L,l)).length;return {name:u.unit,done:d,total:ls.length,complete:ls.length>0&&d===ls.length,avg:avgOf(ls),medals:medalsOf(ls)}});
        const ls=[].concat(...us.map(u=>u.lessons));
        return {id,name,areas,done:ls.filter(l=>isDone(L,l)).length,total:ls.length,areasDone:areas.filter(a=>a.complete).length,avg:avgOf(ls),medals:medalsOf(ls)};
      });
    const all=[].concat(...subjects.map(s=>[].concat(...(s.id==="course"?trade():FS.filter(u=>u.fs===s.id)).map(u=>u.lessons))));
    const m=medalsOf(all);
    return {subjects,avg:avgOf(all),done:all.filter(l=>isDone(L,l)).length,total:all.length,
      areasDone:subjects.reduce((n,s)=>n+s.areasDone,0),areasTotal:subjects.reduce((n,s)=>n+s.areas.length,0),medals:m,medalCount:m.gold+m.silver+m.bronze};
  }
  /* Evia's view of a confidence skill, from how the lessons went (first-try answers). Needs half the lessons done. */
  function viewFor(area){
    /* Every unit that informs this skill counts (a unit's skill can be one area or a list). */
    const us=trade().filter(x=>[].concat(x.skill||[]).includes(area));if(!us.length)return null;
    const u={lessons:[].concat(...us.map(x=>x.lessons))};
    const L=mine(),done=u.lessons.filter(l=>isDone(L,l));
    if(done.length<Math.ceil(u.lessons.length/2))return null;
    /* Rated on first-try accuracy; "Mastered" only once every lesson in the unit is done. */
    const avg=done.reduce((n,l)=>n+L[l.id].best,0)/done.length,all=done.length===u.lessons.length;
    const level=Math.min(avg>=.9?4:avg>=.7?3:avg>=.5?2:1,all?4:3);
    return {level,label:LEVELS[level-1],done:done.length,total:u.lessons.length,soFar:!all};
  }
  /* A lesson left part-way through carries on from the same step. */
  const resumeOf=id=>{const s=readStore();return ((s[course]||{}).resume||{})[id]||null};
  const setResume=(id,v)=>{const s=readStore(),c=s[course]=s[course]||{lessons:{}};c.resume=c.resume||{};if(v)c.resume[id]=v;else delete c.resume[id];writeStore(s)};

  /* ---------- The page ---------- */
  let root=null,onKey=null;
  const EVIA='<span class="tm-evia evia-mini" aria-hidden="true"><span class="evia-face"><i></i><i></i></span></span>';
  function shell(label){
    if(root)root.remove();
    root=document.createElement("div");root.className="tm";root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");root.setAttribute("aria-label",label);
    document.body.appendChild(root);
    onKey=e=>{if(e.key==="Escape")close()};document.addEventListener("keydown",onKey);
  }
  function open(which){section=["maths","english","edi"].includes(which)?which:"course";shell("Teach me");path()}
  function close(){
    if(!root)return;document.removeEventListener("keydown",onKey);
    if(window.eviaOtj)window.eviaOtj.flush();
    const r=root;root=null;r.classList.add("tm-out");setTimeout(()=>r.remove(),reduced()?0:200);
    if(typeof render==="function"&&typeof screen!=="undefined"&&["course","learning","teach"].includes(screen))render();
  }
  const LOCK='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="11" width="12" height="9" rx="2"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/></svg>';
  /* About how long a lesson takes: teaching screens are quick, games a little longer. */
  const mins=l=>Math.max(2,Math.round(l.steps.reduce((n,s)=>n+({banner:4,teach:14,learn:18,explore:30,watch:28,cards:30,quick:30,sort:40,judge:35,match:30,label:35}[s.t]||18),0)/60));
  /* A finished lesson becomes a medal from its best score (right first time): gold 90%+, silver 70%+, else bronze. */
  const medal=score=>score>=.9?"gold":score>=.7?"silver":"bronze";
  const MEDAL={gold:"Gold",silver:"Silver",bronze:"Bronze"};
  const STAR='<svg viewBox="0 0 24 24" aria-hidden="true" class="tm-star"><path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.5l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/></svg>';
  function unitHtml(u,L,counter){
    const d=u.lessons.filter(l=>isDone(L,l)).length,nextI=u.lessons.findIndex(l=>!isDone(L,l));
    return '<section class="tm-unit'+(u.fs?" fs":"")+'"><div class="tm-unit-head"><span class="tm-unit-k">'+(u.fs==="edi"?"For everyone":u.fs?"Level 2":"Unit")+'</span><h2>'+esc(u.unit)+'</h2><small>'+u.lessons.length+' lessons'+(u.fs?"":" · covers the whole unit")+'</small><span class="tm-unit-bar"><i style="width:'+Math.round(d/u.lessons.length*100)+'%"></i></span></div>'+
      '<ol class="tm-path">'+u.lessons.map((l,k)=>{
        const n=counter.n++,r=L[l.id],state=isDone(L,l)?"done":k===nextI?"next":"locked",md=state==="done"?medal(r.best):"",res=state==="next"&&resumeOf(l.id);
        return '<li class="tm-node '+state+(md?" medal-"+md:"")+(l.challenge?" trophy":"")+'" style="--i:'+(n%4)+'"><button type="button" data-lesson="'+l.id+'"'+(state==="locked"?' disabled aria-disabled="true"':"")+' aria-label="'+esc(l.title)+(md?", "+MEDAL[md]+" medal":state==="locked"?", locked: finish the lesson before first":"")+'">'+
          '<span class="tm-dot">'+(state==="done"&&!l.challenge?STAR:state==="locked"?LOCK:l.challenge?ICON.trophy:'<b>'+(k+1)+'</b>')+'</span>'+
          (state==="next"?'<span class="tm-start">'+(res?"Carry on":"Start")+'</span>':"")+
          '<span class="tm-label"><strong>'+esc(l.title)+'</strong><small>'+esc(l.blurb)+(md?' · <em class="tm-medal-tag">'+MEDAL[md]+' '+Math.round(r.best*100)+'%</em>':' · '+mins(l)+' min')+'</small></span></button></li>';
      }).join("")+'</ol></section>';
  }
  /* Teach me opens on one section, chosen in Evia's chat: the course, maths or English. */
  let section="course";
  const sectionUnits=()=>section==="course"?trade():FS.filter(u=>u.fs===section);
  /* Who to talk to, under the EDI and safeguarding lessons: the college's safeguarding lead (provider.js) or the one the
     learner added in Profile, then helplines. */
  function contactsHtml(){
    const P=window.EVIA_PROVIDER||{},dep=P.deputy||{},mine=profile().safeguarding||{};
    const dsl=P.safeguarding&&P.safeguarding.name?P.safeguarding:mine;
    const tel=n=>'<a href="tel:'+esc(String(n).replace(/[^\d+]/g,""))+'">'+esc(n)+'</a>';
    const person=(role,x)=>x&&x.name?'<li><strong>'+esc(role)+': '+esc(x.name)+'</strong>'+(x.phone?'<span>'+tel(x.phone)+'</span>':"")+(x.email?'<span><a href="mailto:'+esc(x.email)+'">'+esc(x.email)+'</a></span>':"")+(x.hours?'<span>'+esc(x.hours)+'</span>':"")+'</li>':"";
    const lead=person((P.name?P.name+" s":"S")+"afeguarding lead",dsl)+person("Deputy safeguarding lead",dep);
    return '<section class="sc-contacts tm-contacts"><h3>Who to talk to</h3><ul>'+
      (lead||'<li><strong>Your safeguarding lead</strong><span>Every college and training provider has one. Ask your tutor who yours is, then add them in Profile so they show here.</span></li>')+
      '<li><strong>Your tutor or supervisor</strong><span>They’ll know what to do next.</span></li>'+
      '<li><strong>In an emergency</strong><span>Call '+tel("999")+'</span></li>'+
      '<li><strong>Anti-Terrorist Hotline</strong><span>'+tel("0800 789 321")+' (confidential)</span></li>'+
      '<li><strong>Childline (under 19)</strong><span>'+tel("0800 1111")+'</span></li>'+
      '<li><strong>Samaritans (any time)</strong><span>'+tel("116 123")+'</span></li>'+
      '<li><strong>Shout</strong><span>Text SHOUT to 85258</span></li>'+
    '</ul></section>';
  }
  function path(){
    const L=mine(),us=sectionUnits(),all=[].concat(...us.map(u=>u.lessons)),p=profile();
    const done=all.filter(l=>isDone(L,l)).length,next=all.find(l=>!isDone(L,l)),name=String(p.name||"").split(/\s+/)[0];
    const title=section==="course"?"Teach me":"Teach me · "+({maths:"Maths",english:"English",edi:"EDI and safeguarding"}[section]);
    const say=!all.length?"I don’t have lessons for your course yet, but they’re on the way. You can try maths or English in the meantime.":
      done===0?"Hi"+(name?" "+esc(name):"")+"! I’ll teach you "+(section==="course"?"everything in each unit":section==="maths"?"Level 2 maths, with examples from site":section==="edi"?"equality and diversity, safeguarding, Prevent, British values, wellbeing and your rights as an apprentice":"Level 2 reading, writing, speaking and listening")+", a few minutes at a time. Tap "+(section==="course"?"the first lesson":"any lesson")+" to start.":
      done===all.length?"You’ve finished every lesson here. Nice work! Replay any lesson to beat your score.":
      "Welcome back"+(name?", "+esc(name):"")+". Next up: <strong>"+esc(next.title)+"</strong>.";
    const others=section==="course"&&!(window.eviaNvq&&window.eviaNvq.on())?courseOrder().filter(n=>!us.some(u=>u.unit===n)).slice(0,4):[];
    const counter={n:0};
    const me=stats();
    root.innerHTML='<header class="tm-bar"><button type="button" class="tm-x" aria-label="Close">×</button><strong>'+title+'</strong>'+
        '<span class="tm-pill fire'+(me.today?" lit":"")+'" title="Day streak" aria-label="'+me.streak+' day streak">'+(ICON.flame||"")+'<b>'+me.streak+'</b></span><span class="tm-pill coins" title="Your coins" aria-label="'+coins()+' coins">'+COIN()+'<b>'+coins()+'</b></span></header>'+
      '<div class="tm-scroll">'+
        '<section class="tm-hero">'+EVIA+'<p class="tm-say">'+say+'</p></section>'+
        (section!=="course"?'<p class="tm-fs-note">Maths and English lessons don’t count towards your learning hours.</p>':"")+
        us.map(u=>unitHtml(u,L,counter)).join("")+
        (section==="edi"?contactsHtml():"")+
        (others.length?'<section class="tm-soon"><h3>'+(us.length?"Coming next":"Lessons for your units are coming")+'</h3>'+others.map(o=>'<div class="tm-soon-row"><span class="tm-dot sm">'+LOCK+'</span>'+esc(o)+'</div>').join("")+'</section>':"")+
      '</div>';
    root.querySelector(".tm-x").onclick=close;
    root.querySelectorAll("[data-lesson]").forEach(b=>b.onclick=()=>{const l=all.find(x=>x.id===b.dataset.lesson);if(l)lesson(l)});
    const nx=done?root.querySelector(".tm-node.next"):null;if(nx)setTimeout(()=>nx.scrollIntoView({block:"center",behavior:reduced()?"auto":"smooth"}),120);
  }

  /* ---------- A lesson ----------
     Each screen is one of the games in teach-play.js. Right first time earns the most XP and builds a combo; a
     wrong answer explains why and gives another go, and the question comes back at the end to fix. After a few in a
     row there's sometimes a surprise bonus question. The score (right first time) feeds Evia's view. */
  const XP={first:10,retry:5,hard:15,bonus:20,fixed:5,item:2,game:5,perfectGame:10,combo:5,done:10,perfect:10,unit:50};
  const PRAISE=["Nice one!","Spot on!","Brilliant!","Nailed it!","Sorted!","Top work!","Bang on!","You’ve got it!"];
  const praise=()=>PRAISE[Math.floor(Math.random()*PRAISE.length)];
  /* Teaching screens and bonus rounds don't count towards the score. */
  const scored=s=>!["teach","learn","explore","watch","banner","quick"].includes(s.t)&&!(s.t==="cards"&&!s.recall);
  const mmss=n=>Math.floor(n/60)+":"+String(n%60).padStart(2,"0");
  let current=null;
  function lesson(l){
    const G=T.games||{},res=resumeOf(l.id),r2=res&&res.v===2?res:null;
    const st={i:r2?Math.min(r2.i,l.steps.length):0,xp:r2?r2.xp:0,first:r2?r2.first:0,asks:r2?r2.asks:0,misses:r2?r2.misses:0,review:r2?r2.review:[],time:r2?r2.time:0};
    /* Coins this lesson: 1 for every 5 XP (rewards.js). */
    const perCoin=RW()&&RW().XP_PER_COIN||5,lessonCoins=()=>Math.floor(st.xp/perCoin);
    let queue=l.steps.slice(st.i).map(s=>({s,kind:"main"})),combo=0,best=0,surprised=false,bonusRight=false,inReview=false,fixed=0,fixTotal=0,fast=false,t0=Date.now();
    let hard=l.steps.slice(0,st.i).some(s=>s.t==="banner"&&s.kind==="challenge");
    /* Off-the-job time: trade lessons only (maths and English don't count). The timer runs quietly in otj-auto.js. */
    const u=units().find(x=>x.lessons.includes(l)),otjKey=u&&!u.fs&&window.eviaOtj?"teach|"+u.unit:null;
    if(otjKey)window.eviaOtj.start(otjKey,{description:"Teach me: interactive lessons with Evia on "+u.unit});
    /* Saved after every screen, so leaving (or the phone dying) carries on from the same place next time. */
    const save=()=>setResume(l.id,st.i>0||st.review.length?{v:2,i:st.i,xp:st.xp,first:st.first,asks:st.asks,misses:st.misses,review:st.review,time:st.time+(Date.now()-t0)}:null);
    const leave=()=>{save();if(otjKey)window.eviaOtj.stop(otjKey);current=null;root.classList.remove("tm-happy","tm-oops");path()};
    root.innerHTML='<header class="tm-bar tm-lbar"><button type="button" class="tm-x" aria-label="Leave lesson">×</button><span class="tm-prog" aria-hidden="true"><i></i></span>'+
      '<span class="tm-combo" hidden></span><button type="button" class="tm-snd"></button><span class="tm-xp" title="Coins this lesson" aria-label="'+lessonCoins()+' coins this lesson">'+COIN()+'<b>'+lessonCoins()+'</b></span></header>'+
      '<div class="tm-scroll tm-step" aria-live="polite"></div><div class="tm-toast" aria-live="polite"></div>'+
      '<footer class="tm-foot"><div class="tm-fb" hidden></div><div class="tm-btns"></div></footer>';
    root.querySelector(".tm-x").onclick=leave;
    const snd=root.querySelector(".tm-snd"),paintSnd=()=>{const on=!U.soundOn||U.soundOn();snd.innerHTML=on?ICON.soundOn:ICON.soundOff;snd.setAttribute("aria-label",on?"Sounds on":"Sounds off");snd.setAttribute("aria-pressed",String(on))};
    snd.onclick=()=>{if(U.setSound){U.setSound(!U.soundOn());paintSnd();sound("tap")}};paintSnd();
    const $=q=>root.querySelector(q),fb=()=>$(".tm-fb");

    /* The button bar: one main button, two (flashcards), or none while a tap-to-answer game is playing. */
    const setBtns=list=>{
      const b=$(".tm-btns");if(!b)return;
      b.innerHTML=list.map(x=>'<button type="button" class="'+(x.cls||"primary")+' tm-go"'+(x.on===false?" disabled":"")+'>'+esc(x.label)+'</button>').join("");
      [...b.children].forEach((el,k)=>el.onclick=()=>{if(!el.disabled&&list[k].fn)list[k].fn()});
      $(".tm-foot").classList.toggle("empty",!list.length&&fb().hidden);
    };
    const setBtn=(label,fn,on)=>setBtns(label?[{label,fn,on:on!==false}]:[]);
    const feedback=(ok,why,label,run,o)=>{
      o=o||{};const f=fb();f.hidden=false;f.className="tm-fb "+(ok?"ok":"no");
      const title=o.title||(ok?praise():o.reveal?"Here’s the answer":"Not quite");
      f.innerHTML='<div class="tm-fb-top"><span class="tm-fb-ic">'+(ok?ICON.check:ICON.cross)+'</span><strong>'+esc(title)+'</strong>'+EVIA.replace("tm-evia","tm-evia sm")+'</div>'+(why?'<p>'+fmt(why)+'</p>':"");
      setBtn(label,run,true);root.classList.toggle("tm-happy",ok);root.classList.toggle("tm-oops",!ok);
      const g=$(".tm-go");if(g)setTimeout(()=>{try{g.focus({preventScroll:true})}catch(_){}},60);
    };
    const clearFb=()=>{const f=fb();f.hidden=true;f.innerHTML="";root.classList.remove("tm-happy","tm-oops")};

    /* XP floats up from what you tapped; a burst on a right answer; a flame for answers in a row. */
    const pop=(txt,el,coin)=>{if(!el||reduced())return;const r=el.getBoundingClientRect(),p=document.createElement("span");p.className="tm-pop"+(coin?" coin":"");p.innerHTML=(coin?COIN():"")+esc(txt);p.style.left=(r.left+r.width/2)+"px";p.style.top=(r.top+Math.min(r.height/2,36))+"px";root.appendChild(p);setTimeout(()=>p.remove(),950)};
    const burst=el=>{if(!el||reduced())return;const r=el.getBoundingClientRect(),b=document.createElement("span");b.className="tm-burst";b.style.left=(r.left+r.width/2)+"px";b.style.top=(r.top+r.height/2)+"px";b.innerHTML=Array.from({length:10},(_,k)=>'<i style="--a:'+(k*36)+'deg"></i>').join("");root.appendChild(b);setTimeout(()=>b.remove(),700)};
    /* XP still drives the coins (1 for every 5), but learners only see coins: the pill bumps when a coin lands. */
    const award=(n,el)=>{if(!n)return;const was=lessonCoins();st.xp+=n;const now=lessonCoins(),x=$(".tm-xp");
      if(x&&now>was){x.querySelector("b").textContent=now;x.setAttribute("aria-label",now+" coins this lesson");x.classList.remove("bump");void x.offsetWidth;x.classList.add("bump");pop("+"+(now-was),x,true)}};
    const setCombo=()=>{const e=$(".tm-combo");if(!e)return;e.hidden=combo<2;e.innerHTML=ICON.flame+"<b>"+combo+"</b>";e.setAttribute("aria-label",combo+" in a row");if(combo>=2){e.classList.remove("bump");void e.offsetWidth;e.classList.add("bump")}};
    const toast=html=>{const t=$(".tm-toast");if(!t)return;t.innerHTML=html;t.classList.remove("on");void t.offsetWidth;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("on"),1400)};
    const gotOne=()=>{combo++;best=Math.max(best,combo);setCombo();if([3,5,8,12,20].includes(combo)){award(XP.combo,$(".tm-combo"));toast(ICON.flame+"<b>"+combo+" in a row!</b>");setTimeout(()=>sound("combo"),260)}};
    const lost=()=>{combo=0;setCombo()};
    /* Now and then, after three in a row, a surprise: a trickier question for double XP. */
    const maybeSurprise=cur=>{
      if(!l.surprise||surprised||cur.kind!=="main"||combo<3)return;
      const chance=typeof T.surpriseChance==="number"?T.surpriseChance:.35;if(Math.random()>=chance)return;
      surprised=true;
      queue.splice(1,0,{s:{t:"banner",kind:"surprise",title:"Surprise challenge!",text:"You’re on a roll. Here’s a tricky one for double coins.",go:"Bring it on"},kind:"banner"},{s:l.surprise,kind:"bonus"});
    };
    const progress=()=>{const p=$(".tm-prog");if(!p)return;p.classList.toggle("rev",inReview);p.querySelector("i").style.width=(inReview?100:Math.round(st.i/l.steps.length*100))+"%"};

    function show(){
      clearFb();progress();
      if(!queue.length){if(st.review.length&&!inReview){startReview();return}done();return}
      const cur=queue[0],s=cur.s,el=$(".tm-step"),g=G[s.t];
      if(!g){advance();return}
      current={lesson:l.id,step:s,kind:cur.kind};
      el.scrollTop=0;el.dataset.t=s.t;el.classList.remove("tm-enter");void el.offsetWidth;el.classList.add("tm-enter");
      let tries=0;
      const c={s,el,pic,say:U.say,sound,buzz,reduced,drag:U.drag,button:setBtn,buttons:setBtns,next:advance,retry:null,reveal:null,
        /* One-answer games report here. */
        answer:(ok,why,o)=>{
          o=o||{};tries++;
          if(ok){
            const firstTry=tries===1;
            if(cur.kind==="main"&&scored(s)){st.asks++;if(firstTry)st.first++}
            if(cur.kind==="review")fixed++;
            if(cur.kind==="bonus"&&firstTry)bonusRight=true;
            award(cur.kind==="bonus"?(firstTry?XP.bonus:0):cur.kind==="review"?XP.fixed:firstTry?(hard?XP.hard:XP.first):XP.retry,o.el);
            burst(o.el);sound("ok");buzz(12);
            if(firstTry&&cur.kind!=="review")gotOne();
            feedback(true,why,"Continue",advance,cur.kind==="review"?{title:"Fixed it!"}:cur.kind==="bonus"&&firstTry?{title:"Double coins!"}:null);
            if(firstTry)maybeSurprise(cur);
            return;
          }
          lost();sound("no");buzz([20,40,20]);
          if(tries===1&&cur.kind==="main"&&scored(s))st.misses++;
          /* Only what you never got right comes back at the end, asked a different way when the lesson has one. */
          if(o.last&&cur.kind==="main"&&scored(s))st.review.push(s.again||s);
          if(o.last){if(c.reveal)c.reveal();if(cur.kind==="main"&&scored(s))st.asks++;feedback(false,why,"Continue",advance,{reveal:true});return}
          feedback(false,why,"Try again",()=>{clearFb();setBtn(null);if(c.retry)c.retry()});
        },
        /* Many-item games: each item as it goes, then the whole game. */
        hit:el=>{award(XP.item,el);sound("item");buzz(8)},
        oops:el=>{sound("no");buzz([15,30,15]);if(el){el.classList.remove("tm-shake");void el.offsetWidth;el.classList.add("tm-shake")}},
        miss:(why,then,el)=>{c.oops(el);feedback(false,why,"Got it",()=>{clearFb();setBtn(null);then()})},
        finish:(right,total,review,o)=>{
          o=o||{};const perfect=right===total;
          if(cur.kind==="main"&&scored(s)){st.asks++;st.first+=total?right/total:1;if(!perfect)st.misses++}
          if(cur.kind==="main"&&!perfect&&review)st.review.push(review);
          if(cur.kind==="review"&&perfect)fixed++;
          if(o.fast)fast=true;
          award((perfect?XP.perfectGame:XP.game)+(o.fast?XP.perfectGame:0),$(".tm-step .tm-q")||$(".tm-step"));
          if(perfect){gotOne();sound("ok")}else{lost();sound("soft")}
          feedback(true,perfect?o.why||null:right+" out of "+total+" right."+(cur.kind==="main"&&review?" The ones you missed come back at the end.":""),"Continue",advance,
            {title:o.fast?"Speed bonus!":perfect?praise():right>=total/2?"Good going":"Keep at it"});
          if(perfect)maybeSurprise(cur);
        }
      };
      setBtn(null);g(c);
    }
    function advance(){
      const cur=queue.shift();
      if(cur&&cur.kind==="main"){st.i++;if(cur.s.t==="banner"&&cur.s.kind==="challenge")hard=true}
      if(cur&&cur.kind==="review")st.review.shift();
      save();show();
    }
    /* Anything missed comes back once more at the end, after a short splash. */
    function startReview(){
      inReview=true;fixTotal=st.review.length;
      queue=[{s:{t:"banner",kind:"review",title:"Let’s fix your mistakes",text:fixTotal===1?"One question tripped you up. Have another go.":fixTotal+" questions tripped you up. Have another go at each.",go:"Let’s go"},kind:"banner"}].concat(st.review.map(s=>({s,kind:"review"})));
      show();
    }
    function done(){
      current=null;
      const score=st.asks?st.first/st.asks:1,perfect=st.asks>0&&!st.misses;
      saveResult(l.id,score);setResume(l.id,null);
      if(otjKey)window.eviaOtj.stop(otjKey,{learned:l.title+": "+l.blurb});
      const before=coins(),earned=st.xp+XP.done+(perfect?XP.perfect:0)+(l.challenge?XP.unit:0),me=addXp(earned),got=Math.max(0,coins()-before);
      const secs=Math.max(1,Math.round((st.time+(Date.now()-t0))/1000));
      const md=medal(score),bestMd=medal(Math.max(score,(mine()[l.id]||{}).best||0));
      const medalHtml='<div class="tm-medal-won medal-'+md+'"><span class="tm-medal-disc">'+STAR+'</span><div><strong>'+MEDAL[md]+' medal</strong><small>'+(md==="gold"?"Top marks: right first time on 90% or more.":"Replay it and get "+(md==="silver"?"90%":"70%")+" right first time for "+(md==="silver"?"gold":"silver")+".")+(bestMd!==md?" Your best is still "+MEDAL[bestMd]+".":"")+'</small></div></div>';
      const badges=[l.challenge&&["trophy",(u?u.unit:"Unit")+": complete"],perfect&&["star","Perfect lesson"],best>=5&&["flame",best+" in a row"],fast&&["bolt","Quick hands"],fixTotal&&fixed>=fixTotal&&["again","Fixed every mistake"],bonusRight&&["gift","Surprise solved"]].filter(Boolean);
      const all=[].concat(...units().map(x=>x.lessons)),idx=all.findIndex(x=>x.id===l.id),nx=all[idx+1];
      const sk=u&&!u.fs?[].concat(u.skill||[])[0]:null,view=sk?viewFor(sk):null;
      const now=new Date(),dow=(now.getDay()+6)%7,week=Array.from({length:7},(_,k)=>{const d=new Date(now);d.setDate(now.getDate()-dow+k);const on=!!me.days[ymd(d)];
        return '<span class="tm-day'+(on?" on":"")+(k===dow?" today":"")+'"><i>'+(on?ICON.check:"")+'</i><small>'+"MTWTFSS"[k]+'</small></span>'}).join("");
      root.classList.remove("tm-oops");root.classList.add("tm-happy");
      root.innerHTML='<div class="tm-scroll tm-end"><div class="tm-confetti" aria-hidden="true">'+Array.from({length:18},(_,k)=>'<i style="--k:'+k+'"></i>').join("")+'</div>'+
        EVIA.replace("tm-evia","tm-evia xl")+'<h2>'+(l.challenge?"Unit complete!":"Lesson complete!")+'</h2><p class="tm-end-sub">'+esc(l.title)+'</p>'+medalHtml+
        '<div class="tm-stats three"><div class="xp">'+COIN()+'<b data-count="'+got+'">'+got+'</b><span>'+(got===1?"coin":"coins")+'</span></div><div>'+ICON.target+'<b>'+Math.round(score*100)+'%</b><span>accuracy</span></div><div>'+ICON.clock+'<b>'+mmss(secs)+'</b><span>time</span></div></div>'+
        '<div class="tm-streak'+(me.extended?" up":"")+'"><div class="tm-streak-top">'+ICON.flame+'<b>'+me.n+'</b><span>day streak'+(me.extended?(me.n>1?" · kept going!":" · started!"):"")+'</span></div><div class="tm-week">'+week+'</div></div>'+
        (badges.length?'<div class="tm-badges">'+badges.map((b,k)=>'<span class="tm-badge" style="--k:'+k+'">'+ICON[b[0]]+esc(b[1])+'</span>').join("")+'</div>':"")+
        (view?'<p class="tm-view">Your lesson scores'+(view.soFar?" so far":"")+' suggest <strong>'+esc(view.label)+'</strong> for <strong>'+esc(String(sk).toLowerCase())+'</strong>. That’s practice feedback, not an assessment. You’ll see this next to your own rating in the confidence check.</p>':"")+
        '</div><footer class="tm-foot">'+(nx?'<button type="button" class="primary tm-go" id="tm-next">Next lesson</button>':"")+'<button type="button" class="'+(nx?"secondary":"primary")+' tm-go" id="tm-path">Back to the path</button></footer>';
      /* The coins count up. */
      const cnt=root.querySelector("[data-count]");
      if(cnt&&got&&!reduced()){const t1=performance.now(),dur=900;cnt.textContent="0";const step=t=>{const k=Math.min(1,(t-t1)/dur);cnt.textContent=Math.round(got*(1-Math.pow(1-k,3)));if(k<1&&cnt.isConnected)requestAnimationFrame(step)};requestAnimationFrame(step)}
      const n=root.querySelector("#tm-next");if(n)n.onclick=()=>{root.classList.remove("tm-happy");lesson(nx)};
      root.querySelector("#tm-path").onclick=()=>{root.classList.remove("tm-happy");path()};
      sound("done");buzz([10,40,10,40,30]);
    }
    show();
  }

  /* ---------- Confidence check, in the same style ----------
     One skill at a time: Evia asks the skill's own question and the learner picks one of four plain answers. Last
     time's answer and Evia's view (from Teach me) are marked. Saved in the same format as before
     (evia7-confidence), so My progress, reviews and college tasks all keep working. */
  const CHOICES=[["Need training","I haven’t done this yet, or I need someone to show me"],["Basics","I can do it with help"],["Confident","I can do it on my own"],["Mastered","I could show someone else how"]];
  function confidence(){
    const qs=(typeof confidenceQuestions==="function"?confidenceQuestions():[]).map(q=>({area:q[0],question:q[1]}));
    if(!qs.length)return;
    const hist=window.eviaData.list("confidence",{course});
    const prev=new Map();hist.forEach(h=>h.scores.forEach(x=>prev.set(x.area,x)));
    const picks=new Map();let i=0;
    shell("Confidence check");
    const pct=vals=>vals.length?Math.round(vals.reduce((n,v)=>n+v,0)/vals.length/4*100):0;
    const intro=()=>{
      root.innerHTML='<header class="tm-bar"><button type="button" class="tm-x" aria-label="Close">×</button><strong>Confidence check</strong></header>'+
        '<div class="tm-scroll"><section class="tm-hero">'+EVIA+'<p class="tm-say">Be honest, there are no wrong answers. I’ll ask about <strong>'+qs.length+' skills</strong>, one at a time. It takes about two minutes'+(prev.size?", and I’ll show you what you said last time":"")+'.</p></section></div>'+
        '<footer class="tm-foot"><button type="button" class="primary tm-go" id="cf-start">Let’s go</button></footer>';
      root.querySelector(".tm-x").onclick=close;root.querySelector("#cf-start").onclick=ask;
    };
    const ask=()=>{
      if(i>=qs.length){finish();return}
      const q=qs[i],was=prev.get(q.area),v=window.eviaTeach.viewFor(q.area),cur=picks.get(i);
      root.innerHTML='<header class="tm-bar tm-lbar"><button type="button" class="tm-x" aria-label="Close">×</button><span class="tm-prog" aria-hidden="true"><i style="width:'+Math.round(i/qs.length*100)+'%"></i></span></header>'+
        '<div class="tm-scroll tm-step"><span class="tm-kicker">Skill '+(i+1)+' of '+qs.length+'</span><h2 class="tm-q cf-area">'+esc(q.area)+'</h2>'+
        '<div class="cf-ask">'+EVIA.replace("tm-evia","tm-evia sm")+'<p>'+esc(q.question)+'</p></div>'+
        '<div class="cf-opts" role="radiogroup">'+CHOICES.map((c,k)=>'<button type="button" class="tm-opt cf-opt'+(cur===k+1?" on":"")+'" role="radio" aria-checked="'+(cur===k+1)+'" data-v="'+(k+1)+'"><span class="cf-bars" aria-hidden="true">'+[1,2,3,4].map(n=>'<i'+(n<=k+1?' class="on"':"")+'></i>').join("")+'</span><span class="cf-txt"><strong>'+c[0]+'</strong><small>'+c[1]+'</small></span>'+
          ((was&&was.score===k+1)||(v&&v.level===k+1)?'<span class="cf-tags">'+(was&&was.score===k+1?'<em class="cf-tag">Last time</em>':"")+(v&&v.level===k+1?'<em class="cf-tag evia">Lesson scores</em>':"")+'</span>':"")+'</button>').join("")+'</div></div>'+
        '<footer class="tm-foot tm-row">'+(i?'<button type="button" class="secondary tm-go" id="cf-back">Back</button>':"")+(was?'<button type="button" class="secondary tm-go" id="cf-same">Same as last time</button>':"")+'</footer>';
      root.querySelector(".tm-x").onclick=close;
      const next=val=>{picks.set(i,val);buzz(8);setTimeout(()=>{i++;ask()},reduced()?0:260)};
      root.querySelectorAll(".cf-opt").forEach(b=>b.onclick=()=>{root.querySelectorAll(".cf-opt").forEach(x=>{x.classList.toggle("on",x===b);x.setAttribute("aria-checked",x===b)});next(+b.dataset.v)});
      const bk=root.querySelector("#cf-back");if(bk)bk.onclick=()=>{i--;ask()};
      const sm=root.querySelector("#cf-same");if(sm)sm.onclick=()=>next(was.score);
    };
    const finish=()=>{
      const now=new Date().toISOString();
      const scores=qs.map((q,k)=>picks.has(k)?{area:q.area,score:picks.get(k),question:q.question,answeredAt:now}:prev.has(q.area)?Object.assign({},prev.get(q.area),{carried:true}):null).filter(Boolean);
      try{window.eviaData.put("confidence",{course,startedAt:now,scores})}catch(err){console.error("Confidence check not saved",err)}
      const before=pct([...prev.values()].map(x=>x.score)),after=pct(scores.map(x=>x.score));
      const up=scores.filter(x=>{const p=prev.get(x.area);return p&&!x.carried&&x.score>p.score}),low=scores.filter(x=>x.score<=2),high=scores.filter(x=>x.score>=3);
      const row=x=>{const p=prev.get(x.area),ch=p&&!x.carried&&p.score!==x.score?(x.score>p.score?'<em class="cf-up">↑ up</em>':'<em class="cf-down">↓ down</em>'):"";return '<li><span class="cf-bars" aria-hidden="true">'+[1,2,3,4].map(n=>'<i'+(n<=x.score?' class="on"':"")+'></i>').join("")+'</span><span><strong>'+esc(x.area)+'</strong><small>'+CHOICES[x.score-1][0]+'</small></span>'+ch+'</li>'};
      root.innerHTML='<header class="tm-bar"><button type="button" class="tm-x" aria-label="Close">×</button><strong>Your confidence</strong></header>'+
        '<div class="tm-scroll"><section class="tm-hero">'+EVIA.replace("tm-evia","tm-evia xl")+'<p class="tm-say">'+(up.length?"You’ve moved up on <strong>"+esc(up.map(x=>x.area).join(", "))+"</strong>. That’s real progress!":"Thanks for being honest. That helps you and your tutor plan what to practise.")+'</p></section>'+
          '<div class="tm-stats"><div><b>'+after+'%</b><span>course confidence</span></div><div><b>'+(prev.size?(after>=before?"+":"")+(after-before)+'%':"First")+'</b><span>'+(prev.size?"since last time":"check")+'</span></div></div>'+
          (low.length?'<h3 class="cf-h">To practise</h3><ul class="cf-sum">'+low.map(row).join("")+'</ul>':"")+
          (high.length?'<h3 class="cf-h">Confident</h3><ul class="cf-sum">'+high.map(row).join("")+'</ul>':"")+
        '</div><footer class="tm-foot">'+(low.length&&window.eviaPractice&&window.eviaPractice.suggestTasks(1).length?'<button type="button" class="primary tm-go" id="cf-task">Find me a college task</button>':"")+'<button type="button" class="'+(low.length?"secondary":"primary")+' tm-go" id="cf-done">Done</button></footer>';
      root.querySelector(".tm-x").onclick=close;root.querySelector("#cf-done").onclick=close;
      const t=root.querySelector("#cf-task");if(t)t.onclick=()=>{close();setTimeout(()=>window.eviaPractice.openTask(0),220)};
      buzz([10,40,10]);
    };
    intro();
  }

  /* current() is what's on screen now (the tests use it to play a lesson through). */
  /* The next lesson to play on the course (the first unit, in course order, with one left), for the Teach me tab. */
  function nextUp(){
    const L=mine();
    for(const u of trade()){const k=u.lessons.findIndex(l=>!isDone(L,l));if(k>=0){const l=u.lessons[k];return {id:l.id,title:l.title,unit:u.unit,n:k+1,of:u.lessons.length,mins:mins(l),resume:!!resumeOf(l.id)}}}
    return null;
  }
  /* Straight into a lesson from outside Teach me (its path is underneath, for when it ends). */
  function play(id){
    const u=units().find(x=>x.lessons.some(l=>l.id===id));if(!u)return;const l=u.lessons.find(x=>x.id===id);
    section=u.fs||"course";shell("Teach me");path();lesson(l);
  }
  window.eviaTeach={open,play,nextUp,available,hasCourse,summary,report,viewFor,confidence,stats,COURSES,FS,current:()=>current};
})();
