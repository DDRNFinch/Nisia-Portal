/* Evia7 Practice: the tests hub (EPA mocks, discussion, maths, English) and the confidence self-assessment.
   Tests still run in the chat (review.js); this file chooses them and shows what's due. */
(function(){
  const DAY=864e5;
  const escHtml=v=>String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
  const readJson=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||"null");return v??f}catch(_){return f}};
  const RATINGS=["Need more training","Know the basics","Quite confident","I’ve mastered this"];
  const icon=d=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';
  const ICONS={
    epa:'<path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15l-3-1.8-3 1.8-3-1.8-3 1.8V5A1.5 1.5 0 0 1 7 3.5Z"/><path d="M9 8.5h6M9 12h6"/>',
    quick:'<path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z"/>',
    discussion:'<path d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 17 16H10l-4.5 3.5V16a2.5 2.5 0 0 1-1-2Z"/>',
    maths:'<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h1M12 12h1M15 12h.5M8.5 16h1M12 16h1M15 16h.5"/>',
    english:'<path d="M5 19.5V6a2.5 2.5 0 0 1 2.5-2.5H19v13H7.5A2.5 2.5 0 0 0 5 19Zm0 0A2.5 2.5 0 0 0 7.5 22H19"/>',
    task:'<path d="M14.5 5.5 18.5 9.5M4 20l4.2-1 10.3-10.3a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z"/>',
    confidence:'<path d="M4 20h16"/><rect x="5.5" y="12" width="3" height="6" rx="1"/><rect x="10.5" y="8" width="3" height="10" rx="1"/><rect x="15.5" y="4" width="3" height="14" rx="1"/>'
  };
  const pctOf=t=>typeof t.pct==="number"?t.pct:(t.total?Math.round((t.score||0)/t.total*100):0);
  const ago=t=>window.eviaStats?window.eviaStats.ago(t).toLowerCase():"";
  function testsOf(type,filter){return window.eviaData.list("tests").filter(t=>t&&t.course===course&&t.type===type&&(!filter||filter(t)))}
  function summary(type,filter){
    const list=testsOf(type,filter);if(!list.length)return {count:0,text:"Not tried yet"};
    const last=list[list.length-1],best=Math.max(...list.map(pctOf));
    return {count:list.length,last:Date.parse(last.takenAt),text:"Last "+pctOf(last)+"% "+ago(Date.parse(last.takenAt))+" · best "+best+"%"};
  }
  function profile(){return window.eviaData.learner()}
  function timePct(){try{return window.eviaCoach.analyse().timePct}catch(_){return null}}
  const daysAgo=t=>t==null?Infinity:(Date.now()-t)/DAY;
  function epaDue(){if((window.eviaNvq&&window.eviaNvq.on()))return false;const tp=timePct();if(tp==null||tp<75)return false;const t=testsOf("epa");const last=t.length?Date.parse(t[t.length-1].takenAt):null;return daysAgo(last)>(tp>=90?7:14)}

  function closeSheet(){const r=document.getElementById("modal-root");if(r)r.innerHTML=""}
  function sheet(kicker,title,body,cls){
    const root=document.getElementById("modal-root");
    root.innerHTML='<div class="overlay"><section class="sheet pr-sheet '+(cls||"")+'" role="dialog" aria-modal="true" aria-labelledby="pr-title"><div class="sheet-head"><div><div class="chat-kicker">'+kicker+'</div><h2 id="pr-title">'+title+'</h2></div><button class="close" id="pr-close" type="button" aria-label="Close">×</button></div><div class="pr-body">'+body+'</div></section></div>';
    document.getElementById("pr-close").onclick=closeSheet;
    root.querySelector(".overlay").addEventListener("click",e=>{if(e.target.classList.contains("overlay"))closeSheet()});
    const h=document.getElementById("pr-title");if(h){h.setAttribute("tabindex","-1");h.focus({preventScroll:true})}
    return root.querySelector(".pr-sheet");
  }

  /* ---------- Tests hub ---------- */
  function openHub(){
    const p=profile(),tp=timePct(),conf=confidenceState(),tasks=suggestTasks(2);
    const rows=[];
    const row=(id,iconKey,title,desc,sum,due)=>rows.push('<button type="button" class="pr-row" data-pr="'+id+'"><span class="pr-icon">'+icon(ICONS[iconKey])+'</span><span class="pr-copy"><strong>'+title+(due?' <em class="pr-due">Due</em>':"")+'</strong><small>'+desc+'</small><small class="pr-sum">'+escHtml(sum)+'</small></span></button>');
    const nvq=(window.eviaNvq&&window.eviaNvq.on());
    row("epa-full","epa",nvq?"Full knowledge test":"EPA full mock","20 questions from across your KSBs",summary("epa",t=>t.full||t.total>=20).text,epaDue());
    row("epa","quick",nvq?"Quick quiz":"EPA quick quiz","5 questions · about 3 minutes",summary("epa",t=>!(t.full||t.total>=20)).text,false);
    row("discussion","discussion",nvq?"Discussion practice":"Professional discussion","5 questions · type your answers",summary("discussion").text,false);
    if(p.mathsEnabled)row("maths","maths","Maths","5 questions with worked answers",summary("maths").text,daysAgo(summary("maths").last)>14);
    if(p.englishEnabled)row("english","english","English","5 questions with worked answers",summary("english").text,daysAgo(summary("english").last)>14);
    const nq=nvq&&window.eviaNvq.myQuestions?window.eviaNvq.myQuestions():[],na=nvq?nq.filter(q=>{const a=window.eviaNvq.answers()[q];return a&&String(a.t).trim().split(/\s+/).length>=12}).length:0;
    const banner=nvq
      ?'<button type="button" class="pr-banner nvq-hub-knowledge" id="pr-knowledge"><strong>Knowledge questions: '+na+' of '+nq.length+' answered.</strong> These are the questions your assessor will ask. Answer a few each week.</button>'
      :tp!=null&&tp>=75
      ?'<div class="pr-banner"><strong>You’re '+tp+'% through your course.</strong> Time to get ready for your end-point assessment. Try a full EPA mock every '+(tp>=90?"week":"couple of weeks")+'.</div>'
      :'<p class="pr-note">'+(tp!=null?"You’re "+tp+"% through your course. Evia will remind you about EPA mocks from 75%.":"Add your course dates in Profile and Evia will remind you when it’s time for EPA mocks.")+'</p>';
    const body=banner+
      '<h3 class="pr-h">Tests</h3><div class="pr-list">'+rows.join("")+'</div>'+
      (!p.mathsEnabled&&!p.englishEnabled?'<p class="pr-note">Maths and English practice can be switched on in your Profile.</p>':"")+
      '<h3 class="pr-h">Your skills</h3><div class="pr-list"><button type="button" class="pr-row" data-pr="confidence"><span class="pr-icon">'+icon(ICONS.confidence)+'</span><span class="pr-copy"><strong>Confidence check'+(daysAgo(conf.last)>30?' <em class="pr-due">Due</em>':"")+'</strong><small>Rate yourself on each practical skill</small><small class="pr-sum">'+escHtml(conf.last?conf.practise.length+" need more training · rated "+ago(conf.last):"Not done yet")+'</small></span></button>'+
      (allTasks().length?'<button type="button" class="pr-row" data-pr="task"><span class="pr-icon">'+icon(ICONS.task)+'</span><span class="pr-copy"><strong>Skills</strong><small>'+(tasks.length?"Evia’s pick: "+escHtml(tasks[0].task.title):allTasks().length+" college tasks for your course")+'</small><small class="pr-sum">'+escHtml(tasks.length?"Practises "+listText(tasks[0].covers):conf.last?"All your skills are rated OK. Pick any task.":"Do a confidence check and Evia will pick one for you")+'</small></span></button>':"")+'</div>';
    const el=sheet("PRACTICE","Tests and checks",body);
    const kb=el.querySelector("#pr-knowledge");if(kb)kb.onclick=()=>window.eviaNvq.openKnowledge();
    el.querySelectorAll("[data-pr]").forEach(b=>b.onclick=()=>{
      const id=b.dataset.pr;closeSheet();
      if(id==="confidence"){openConfidence();return}
      if(id==="task"){openAllTasks();return}
      const label=b.querySelector("strong").childNodes[0].textContent.trim();
      startTest(id==="epa-full"?"epa":id,id==="epa-full"?20:5,label);
    });
  }
  function startTest(type,count,label){
    if(window.eviaStartTest)window.eviaStartTest(type,count,label);
    else{window.chat();setTimeout(()=>window.eviaTestMe&&window.eviaTestMe({type,count}),60)}
  }

  /* ---------- Confidence self-assessment ---------- */
  /* Every save stores the full picture: skills not re-rated keep their last rating, so the latest record is always complete. */
  function skills(){try{return (typeof confidenceQuestions==="function"?confidenceQuestions():[]).map(q=>({area:q[0],question:q[1],desc:String(q[1]).replace(/^How confident are you (?:at|with|in) /i,"").replace(/\?$/,"").replace(/^./,c=>c.toUpperCase())}))}catch(_){return[]}}
  function history(){return window.eviaData.list("confidence").filter(x=>x&&x.course===course&&Array.isArray(x.scores)&&x.scores.length)}
  function latestMap(){const m=new Map();history().forEach(s=>s.scores.forEach(sc=>m.set(sc.area,sc)));return m}
  function confidenceState(){
    const h=history(),last=h[h.length-1],m=latestMap();
    return {last:last?Date.parse(last.takenAt)||null:null,practise:[...m.values()].filter(x=>x.score<=2).map(x=>x.area)};
  }
  /* One slider per skill (1 = need more training … 4 = mastered). Each starts at last time's rating, marked on the
     track, so a repeat check only means moving what's changed. The overall score at the top updates live. */
  const SHORT=["Need training","Know the basics","Quite confident","Mastered"];
  const overallPct=vals=>vals.length?Math.round(vals.reduce((n,v)=>n+v,0)/vals.length/4*100):null;
  function openConfidence(){
    /* The confidence check now runs in the Teach me style (teach.js); this sheet is the fallback. */
    if(window.eviaTeach&&window.eviaTeach.confidence&&skills().length){closeSheet();window.eviaTeach.confidence();return}
    const list=skills();
    if(!list.length){sheet("SKILLS","Confidence check",'<p class="pr-note">There are no practical skills loaded for this course yet.</p>');return}
    const prev=latestMap(),picked=new Map();
    const prevOverall=overallPct(list.map(s=>prev.get(s.area)).filter(Boolean).map(x=>x.score));
    const body=
      '<div class="cf-overall" id="cf-overall" aria-live="polite">'+
        '<div class="cf-overall-top"><span>Course confidence</span><strong id="cf-score">–</strong></div>'+
        '<span class="cf-overall-bar"><i id="cf-bar"></i></span>'+
        '<small id="cf-sub"></small>'+
      '</div>'+
      '<p class="pr-intro cf-intro">Slide each skill to where you are now. Low is fine: it shows you and your tutor what to practise.'+(prev.size?' The faint dot shows last time.':'')+'</p>'+
      '<div class="cf-legend" aria-hidden="true"><span>Need training</span><span>Basics</span><span>Confident</span><span>Mastered</span></div>'+
      '<ol class="cf-list">'+list.map((s,i)=>{
        const p=prev.get(s.area),v=p?p.score:1;
        return '<li class="cf-row'+(p?"":" unset")+'" data-skill="'+i+'">'+
          '<div class="cf-row-top"><strong id="cf-name-'+i+'">'+escHtml(s.area)+'</strong><span class="cf-level" id="cf-level-'+i+'">'+(p?escHtml(SHORT[v-1]):"Slide to rate")+'</span></div>'+
          '<p class="cf-desc">'+escHtml(s.desc)+'</p>'+
          /* Evia's view from Teach me lessons, beside the learner's own rating. */
          ((v=>v?'<p class="cf-evia"><span class="evia-mini" aria-hidden="true"><span class="evia-face"><i></i><i></i></span></span><span>Your lesson scores suggest: <strong>'+escHtml(v.label)+'</strong></span></p>':"")(window.eviaTeach&&window.eviaTeach.viewFor(s.area)))+
          '<div class="cf-track" style="--v:'+v+'">'+
            '<span class="cf-stops" aria-hidden="true"><i></i><i></i><i></i><i></i></span>'+
            (p?'<span class="cf-last" style="--l:'+p.score+'" title="Last time: '+escHtml(RATINGS[p.score-1])+'"></span>':"")+
            '<input type="range" min="1" max="4" step="1" value="'+v+'" aria-labelledby="cf-name-'+i+'" aria-valuetext="'+(p?escHtml(RATINGS[v-1]):"Not rated")+'">'+
          '</div>'+
        '</li>';
      }).join("")+'</ol>'+
      '<div class="pr-save"><span id="pr-count"></span><button type="button" class="primary" id="pr-save">Save my ratings</button></div>';
    const el=sheet("SKILLS","How confident are you?",body,"pr-conf cf-sheet");
    const count=el.querySelector("#pr-count"),save=el.querySelector("#pr-save");
    const valueOf=i=>picked.has(i)?picked.get(i):(prev.get(list[i].area)||{}).score;
    const refresh=()=>{
      const vals=list.map((_,i)=>valueOf(i)).filter(Boolean),pct=overallPct(vals);
      el.querySelector("#cf-score").textContent=pct==null?"–":pct+"%";
      el.querySelector("#cf-bar").style.width=(pct||0)+"%";
      const low=vals.filter(v=>v<=2).length,high=vals.length-low;
      const diff=pct!=null&&prevOverall!=null?pct-prevOverall:null;
      el.querySelector("#cf-sub").innerHTML=vals.length?(low+" need training · "+high+" confident"+(diff?' · <b class="'+(diff>0?"up":"down")+'">'+(diff>0?"↑ ":"↓ ")+Math.abs(diff)+" since last time</b>":prevOverall!=null?" · same as last time":"")):"Move a slider to start";
      count.textContent=vals.length+" of "+list.length+" rated";
      save.disabled=!vals.length;
    };
    el.querySelectorAll(".cf-row").forEach(li=>{
      const i=+li.dataset.skill,input=li.querySelector("input"),track=li.querySelector(".cf-track");
      const set=()=>{
        const v=+input.value;picked.set(i,v);li.classList.remove("unset");track.style.setProperty("--v",v);
        const was=prev.get(list[i].area);
        li.querySelector(".cf-level").innerHTML=escHtml(SHORT[v-1])+(was&&was.score!==v?' <small>· was '+escHtml(["Need training","Basics","Confident","Mastered"][was.score-1])+'</small>':"");
        li.dataset.level=v<=2?"low":"high";
        input.setAttribute("aria-valuetext",RATINGS[v-1]);refresh();
      };
      if(!li.classList.contains("unset"))li.dataset.level=valueOf(i)<=2?"low":"high";
      input.addEventListener("input",set);input.addEventListener("change",set);
      input.addEventListener("pointerup",set); /* a tap on an unrated slider counts, even without moving it */
    });
    refresh();
    save.onclick=()=>{
      if(save.disabled)return;
      const now=new Date().toISOString();
      const scores=list.map((s,i)=>picked.has(i)?{area:s.area,score:picked.get(i),question:s.question,answeredAt:now}:prev.has(s.area)?Object.assign({},prev.get(s.area),{carried:true}):null).filter(Boolean);
      window.eviaData.put("confidence",{course,startedAt:now,scores});
      showPlan(scores,prev);
    };
  }
  function showPlan(scores,prev){
    const low=scores.filter(x=>x.score<=2).sort((a,b)=>a.score-b.score),high=scores.filter(x=>x.score>=3).sort((a,b)=>b.score-a.score);
    const change=x=>{const p=prev.get(x.area);if(!p||x.carried||p.score===x.score)return"";const up=x.score>p.score;return ' <span class="pr-change '+(up?"up":"down")+'">'+(up?"↑ up":"↓ down")+'</span>'};
    const item=x=>'<li><strong>'+escHtml(x.area)+'</strong><small>'+escHtml(RATINGS[x.score-1])+change(x)+'</small></li>';
    const improved=scores.filter(x=>{const p=prev.get(x.area);return p&&!x.carried&&x.score>p.score});
    const body=(improved.length?'<div class="pr-banner good">You’ve moved up on <strong>'+escHtml(improved.map(x=>x.area).join(", "))+'</strong>. That’s real progress.</div>':"")+
      '<h3 class="pr-h">Needs more training</h3>'+(low.length?'<ul class="pr-plan low">'+low.map(item).join("")+'</ul><p class="pr-note">Tell your tutor or supervisor you’d like more practice on these. When one of these jobs comes up on site, ask to get involved.</p>'+suggestTasks(2).map(taskCardHtml).join(""):'<p class="pr-note">Nothing rated low. Nice.</p>')+
      '<h3 class="pr-h">Confident</h3>'+(high.length?'<ul class="pr-plan high">'+high.map(item).join("")+'</ul><p class="pr-note">Keep doing these on the job and they’ll keep getting better.</p>':'<p class="pr-note">Nothing rated high yet. That’s fine: it takes time.</p>')+
      '<div class="pr-actions"><button type="button" class="secondary" id="pr-send">Send to my tutor</button><button type="button" class="primary" id="pr-done">Done</button></div><p class="pr-note" id="pr-sent" role="status"></p>';
    const el=sheet("SKILLS","Your training plan",body,"pr-conf");
    el.querySelectorAll("[data-task]").forEach(b=>b.onclick=()=>openTask(+b.dataset.task));
    if(window.eviaMood)window.eviaMood("happy");
    el.querySelector("#pr-done").onclick=()=>{closeSheet();if(typeof screen!=="undefined"&&(screen==="progress"||screen==="home"))render()};
    el.querySelector("#pr-send").onclick=async()=>{
      const name=String(profile().name||"").trim();
      const text="Confidence check"+(name?" – "+name:"")+" ("+new Date().toLocaleDateString("en-GB")+")\n\nNeeds more training:\n"+(low.length?low.map(x=>"• "+x.area+" – "+RATINGS[x.score-1]).join("\n"):"• None")+"\n\nConfident:\n"+(high.length?high.map(x=>"• "+x.area+" – "+RATINGS[x.score-1]).join("\n"):"• None");
      share("Confidence check",text,el);
    };
  }

  /* ---------- College practice tasks ---------- */
  /* Scores each task by the low-rated skills it covers (1 = need more training counts double), then picks greedily
     so a second suggestion covers skills the first one doesn't. */
  function suggestTasks(max){
    const tasks=(window.EVIA_PRACTICE_TASKS||{})[course]||[],m=latestMap();
    const need=new Map([...m.values()].filter(x=>x.score<=2).map(x=>[x.area,x.score===1?2:1]));
    if(!need.size||!tasks.length)return [];
    const left=new Map(need),out=[];
    while(out.length<(max||2)){
      const best=tasks.filter(t=>!out.includes(t)).map(t=>({t,covers:t.skills.filter(k=>left.has(k)),score:t.skills.reduce((n,k)=>n+(left.get(k)||0),0)})).sort((a,b)=>b.score-a.score||b.covers.length-a.covers.length)[0];
      if(!best||!best.score)break;
      out.push(best.t);best.covers.forEach(k=>left.delete(k));
    }
    return out.map(t=>({task:t,covers:t.skills.filter(k=>need.has(k))}));
  }
  function taskCardHtml(x,i){
    return '<button type="button" class="pr-task" data-task="'+i+'"><span class="pr-task-kicker">Try this at college</span><strong>'+escHtml(x.task.title)+'</strong><small>Practises '+escHtml(listText(x.covers))+'</small></button>';
  }
  const listText=a=>a.length<2?a.join(""):a.slice(0,-1).join(", ")+" and "+a[a.length-1];
  const allTasks=()=>(window.EVIA_PRACTICE_TASKS||{})[course]||[];
  /* ---------- Skills (Teach me) ----------
     Practical tasks for the college workshop, 1 to 6 hours. Evia picks the ones aimed at the skills the learner rated
     low; later Symi (the tutor) will feed in too. The learner starts a task, then marks their own work against its mark
     sheet, and it's kept here as completed. College time is on the register, so no learning hours are logged. */
  const SKILLS_KEY="evia7-skills";
  const skillsStore=()=>{const d=readJson(SKILLS_KEY,{})||{};return {active:d.active&&d.active.course===course?d.active:null,done:(Array.isArray(d.done)?d.done:[]).filter(x=>x&&x.course===course),raw:d}};
  function saveSkills(fn){
    const d=readJson(SKILLS_KEY,{})||{};d.done=Array.isArray(d.done)?d.done:[];fn(d);d.updatedAt=Date.now();
    try{localStorage.setItem(SKILLS_KEY,JSON.stringify(d))}catch(_){}
    if(typeof persist==="function")try{persist()}catch(_){}
  }
  const hoursText=h=>h+(h===1?" hour":" hours");
  const findTask=id=>allTasks().find(t=>t.id===id);
  const BANDS=[["all","All"],["short","1–2 hours",h=>h<=2],["mid","3–4 hours",h=>h>=3&&h<=4],["long","5–6 hours",h=>h>=5]];
  function skillsSummary(){const st=skillsStore(),picks=suggestTasks(3);return {picks:picks.length,done:st.done.length,active:st.active?findTask(st.active.id):null,checked:!!confidenceState().last}}
  function openSkills(band){
    const all=allTasks();
    if(!all.length){sheet("SKILLS","Skills",'<p class="pr-note">There are no college tasks for this course yet.</p>');return}
    const st=skillsStore(),picks=suggestTasks(3),checked=!!confidenceState().last,b=BANDS.find(x=>x[0]===band)||BANDS[0];
    const doneCount=id=>st.done.filter(x=>x.taskId===id).length;
    const card=(t,why,kicker,plain)=>'<button type="button" class="pr-task sk-task'+(plain?" plain":"")+'" data-id="'+escHtml(t.id)+'"><span class="sk-task-top"><span class="pr-task-kicker">'+escHtml(kicker)+'</span><span class="sk-hours">'+escHtml(hoursText(t.hours))+'</span></span><strong>'+escHtml(t.title)+'</strong><small>'+escHtml(why)+'</small>'+(doneCount(t.id)?'<small class="sk-done-tag">Done '+(doneCount(t.id)>1?doneCount(t.id)+" times":"once")+'</small>':"")+'</button>';
    const active=st.active&&findTask(st.active.id);
    const rest=all.filter(t=>!picks.some(x=>x.task===t)&&(!b[2]||b[2](t.hours)));
    const body='<p class="pr-intro">Practical tasks for the college workshop, from 1 to 6 hours. Mark your own work when you finish; your tutor can check it too. College time is on the register, so these don’t add learning hours.</p>'+
      (active?'<h3 class="pr-h">In progress</h3>'+card(active,"Started "+new Date(st.active.startedAt).toLocaleDateString("en-GB",{day:"numeric",month:"short"})+". Tap to mark your work.","Carry on"):"")+
      (picks.length?'<h3 class="pr-h">Evia’s picks for you</h3>'+picks.map(x=>card(x.task,"Practises "+listText(x.covers)+": you rated "+(x.covers.length>1?"them":"it")+" low","Evia’s pick")).join("")
        :'<div class="pr-banner">'+(checked?"None of your skills are rated low right now, so pick any task you like. Evia will pick again after your next confidence check.":"Do a confidence check and Evia will pick the tasks that work on your weakest skills.")+'</div>'+(checked?"":'<div class="pr-actions"><button type="button" class="primary" id="pr-conf">Do a confidence check</button></div>'))+
      '<h3 class="pr-h">All tasks</h3><div class="sk-bands" role="group" aria-label="Filter by time">'+BANDS.map(x=>'<button type="button" class="sk-band'+(x===b?" on":"")+'" data-band="'+x[0]+'" aria-pressed="'+(x===b)+'">'+x[1]+'</button>').join("")+'</div>'+
      (rest.length?rest.map(t=>card(t,listText(t.skills),"College task",true)).join(""):'<p class="pr-note">No other tasks of that length.</p>')+
      '<h3 class="pr-h">Completed</h3>'+(st.done.length?st.done.slice().reverse().map(x=>{const met=x.marks.filter(m=>m.met).length;return '<button type="button" class="sk-doneitem" data-done="'+escHtml(x.id)+'"><span><strong>'+escHtml(x.title)+'</strong><small>'+new Date(x.doneAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})+' · '+escHtml(hoursText(x.hours))+'</small></span><b class="'+(met===x.marks.length?"all":"")+'">'+met+'/'+x.marks.length+'</b></button>'}).join(""):'<p class="pr-note">Tasks you finish and mark are kept here.</p>');
    const el=sheet("TEACH ME","Skills",body,"sk-sheet");
    const cb=el.querySelector("#pr-conf");if(cb)cb.onclick=()=>{closeSheet();openConfidence()};
    el.querySelectorAll("[data-band]").forEach(x=>x.onclick=()=>{openSkills(x.dataset.band);const f=document.querySelector(".sk-bands");if(f)f.scrollIntoView({block:"start"})});
    el.querySelectorAll("[data-id]").forEach(x=>x.onclick=()=>{const t=findTask(x.dataset.id),p=picks.find(y=>y.task===t);if(active&&t===active)openMarkSheet(t);else viewTask(t,p?p.covers:[])});
    el.querySelectorAll("[data-done]").forEach(x=>x.onclick=()=>viewDone(st.done.find(d=>d.id===x.dataset.done)));
  }
  const openAllTasks=()=>openSkills();
  function viewTask(t,covers,another){
    const st=skillsStore(),on=st.active&&st.active.id===t.id;
    const body='<p class="pr-intro">'+escHtml(t.brief)+'</p>'+
      '<div class="pr-chips"><span class="pr-chip sk-hchip">'+escHtml(hoursText(t.hours))+'</span>'+t.skills.map(k=>'<span class="pr-chip '+(covers.includes(k)?"low":"")+'">'+escHtml(k)+'</span>').join("")+'</div>'+
      (covers.length?'<p class="pr-note">Highlighted skills are ones you rated low.</p>':"")+
      '<h3 class="pr-h">Steps</h3><ol class="pr-steps">'+t.steps.map(x=>'<li>'+escHtml(x)+'</li>').join("")+'</ol>'+
      '<h3 class="pr-h">Your mark sheet</h3><ul class="sk-marks-preview">'+t.marks.map(m=>'<li>'+escHtml(m)+'</li>').join("")+'</ul>'+
      '<div class="pr-banner">'+escHtml(t.check)+' Take photos as you go: you can add them to your portfolio as supporting evidence.</div>'+
      '<div class="pr-actions">'+(another?'<button type="button" class="secondary" id="pr-other">Another idea</button>':'<button type="button" class="secondary" id="pr-other">All tasks</button>')+'<button type="button" class="secondary" id="pr-share">Show my tutor</button><button type="button" class="primary" id="pr-ok">'+(on?"Mark my work":"Start this task")+'</button></div><p class="pr-note" id="pr-sent" role="status"></p>';
    const el=sheet("COLLEGE TASK · "+escHtml(hoursText(t.hours).toUpperCase()),escHtml(t.title),body);
    el.querySelector("#pr-ok").onclick=()=>{if(on){openMarkSheet(t);return}
      const other=st.active&&findTask(st.active.id);
      if(other&&!confirm("You’re part way through “"+other.title+"”. Start this one instead?"))return;
      saveSkills(d=>{d.active={course,id:t.id,startedAt:Date.now()}});openSkills()};
    el.querySelector("#pr-other").onclick=another||(()=>openSkills());
    el.querySelector("#pr-share").onclick=()=>share("College task: "+t.title,"College task: "+t.title+" ("+hoursText(t.hours)+")\n"+t.brief+(covers.length?"\n\nPractises: "+covers.join(", "):"")+"\n\n"+t.steps.map((x,n)=>(n+1)+". "+x).join("\n")+"\n\nMark sheet:\n"+t.marks.map(m=>"☐ "+m).join("\n")+"\n\n"+t.check,el);
  }
  /* The self mark sheet: Met or Not yet for each point, and a note. Saving keeps it in Completed. */
  function openMarkSheet(t){
    const picked=new Array(t.marks.length).fill(null);
    const body='<p class="pr-intro">Check your own work against each point, honestly. Your tutor can go through it with you.</p>'+
      '<div class="sk-sheetlist">'+t.marks.map((m,i)=>'<div class="sk-mark" data-i="'+i+'"><span>'+escHtml(m)+'</span><span class="sk-yn" role="group" aria-label="'+escHtml(m)+'"><button type="button" data-v="1" aria-pressed="false">Met</button><button type="button" data-v="0" aria-pressed="false">Not yet</button></span></div>').join("")+'</div>'+
      '<label class="sk-notelabel" for="sk-note">What went well, and what would you do differently?</label><textarea id="sk-note" class="sk-note" rows="3" maxlength="600" placeholder="Optional"></textarea>'+
      '<div class="pr-actions"><button type="button" class="secondary" id="sk-back">Back</button><button type="button" class="primary" id="sk-save" disabled>Save as completed</button></div><p class="pr-note" id="sk-left" role="status">'+t.marks.length+' to mark</p>';
    const el=sheet("MARK SHEET",escHtml(t.title),body);
    const upd=()=>{const left=picked.filter(v=>v===null).length;el.querySelector("#sk-save").disabled=!!left;el.querySelector("#sk-left").textContent=left?left+" to mark":picked.filter(Boolean).length+" of "+picked.length+" met"};
    el.querySelectorAll(".sk-mark").forEach(row=>row.querySelectorAll("[data-v]").forEach(btn=>btn.onclick=()=>{
      const i=+row.dataset.i;picked[i]=btn.dataset.v==="1";
      row.querySelectorAll("[data-v]").forEach(x=>x.setAttribute("aria-pressed",String(x===btn)));row.dataset.met=String(picked[i]);upd()}));
    el.querySelector("#sk-back").onclick=()=>viewTask(t,[]);
    el.querySelector("#sk-save").onclick=()=>{
      const st=skillsStore(),rec={id:"sk-"+Date.now().toString(36),course,taskId:t.id,title:t.title,hours:t.hours,skills:t.skills.slice(),
        startedAt:st.active&&st.active.id===t.id?st.active.startedAt:null,doneAt:Date.now(),marks:t.marks.map((m,i)=>({text:m,met:!!picked[i]})),note:el.querySelector("#sk-note").value.trim(),markedBy:"self"};
      saveSkills(d=>{d.done.push(rec);if(d.active&&d.active.course===course&&d.active.id===t.id)d.active=null});
      viewDone(rec,true);
    };
  }
  function viewDone(x,fresh){
    if(!x){openSkills();return}
    const met=x.marks.filter(m=>m.met).length,notYet=x.marks.filter(m=>!m.met);
    const body=(fresh?'<div class="pr-banner good"><strong>Saved in Skills.</strong> '+(met===x.marks.length?"Every point met. Nice work.":met+" of "+x.marks.length+" met. The ones marked not yet are what to work on next time.")+'</div>':"")+
      '<p class="pr-note">'+new Date(x.doneAt).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"})+' · '+escHtml(hoursText(x.hours))+' · marked by you</p>'+
      '<ul class="sk-result">'+x.marks.map(m=>'<li class="'+(m.met?"met":"notyet")+'"><b>'+(m.met?"Met":"Not yet")+'</b>'+escHtml(m.text)+'</li>').join("")+'</ul>'+
      (x.note?'<h3 class="pr-h">Your note</h3><p class="pr-intro">'+escHtml(x.note)+'</p>':"")+
      (fresh&&window.eviaTeach?'<p class="pr-note">Feel more confident with '+escHtml(listText(x.skills))+' now? Update your confidence check so Evia’s picks stay right.</p>':"")+
      '<div class="pr-actions">'+(fresh?'<button type="button" class="secondary" id="sk-conf">Update confidence</button>':'')+'<button type="button" class="secondary" id="pr-share">Show my tutor</button><button type="button" class="primary" id="sk-done">'+(fresh?"Done":"Back to Skills")+'</button></div><p class="pr-note" id="pr-sent" role="status"></p>';
    const el=sheet("COMPLETED",escHtml(x.title),body);
    el.querySelector("#sk-done").onclick=()=>openSkills();
    const c=el.querySelector("#sk-conf");if(c)c.onclick=()=>{closeSheet();openConfidence()};
    el.querySelector("#pr-share").onclick=()=>{const name=String(profile().name||"").trim();
      share("Skills: "+x.title,"College task: "+x.title+(name?" – "+name:"")+" ("+new Date(x.doneAt).toLocaleDateString("en-GB")+", "+hoursText(x.hours)+")\nSelf-marked: "+met+" of "+x.marks.length+" met\n\n"+x.marks.map(m=>(m.met?"✓ ":"✗ ")+m.text).join("\n")+(x.note?"\n\nNote: "+x.note:""),el)};
  }
  function openTask(index){
    const list=suggestTasks(3);
    if(!list.length){openSkills();return}
    const i=Math.min(index||0,list.length-1);
    viewTask(list[i].task,list[i].covers,list.length>1?()=>openTask((i+1)%list.length):null);
  }
  async function share(title,text,el){
    const note=el.querySelector("#pr-sent");
    try{if(navigator.share){await navigator.share({title,text});return}}catch(e){if(e&&e.name==="AbortError")return}
    try{await navigator.clipboard.writeText(text);note.textContent="Copied. Paste it into a message or email to your tutor."}
    catch(_){note.textContent="Sharing isn’t available here. Show your tutor this screen instead."}
  }

  window.eviaPractice={openHub,openConfidence,epaDue,startTest,suggestTasks,openTask,openAllTasks,openSkills,skillsSummary};
})();
