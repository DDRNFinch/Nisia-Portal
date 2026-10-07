/* Evia7 coach: the things Evia does with the learner in the chat, spoken like a coach rather than filled in like a
   form. Her menu: Evidence check, Quick review, Show targets and EPA mocks. The other flows here (log hours with an
   hours-and-minutes wheel, a confidence check one skill at a time, college tasks, Teach me lessons) are opened from the
   matching section of My progress. Uses the chat helpers in ui.js. */
(function(){
  const K=()=>window.eviaChatKit;
  const esc=v=>String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
  const readJson=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||"null");return v??f}catch(_){return f}};
  const hm=h=>window.eviaHM(h);
  const weekStart=()=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getTime()};
  const reduced=()=>window.eviaAccessibility?window.eviaAccessibility.reducedMotion():matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Log my hours ---------- */
  const KINDS=[
    ["College day","College day",7.5],["Toolbox talk","Toolbox talk",.5],["Training course","Training course",3],
    ["Research or reading","Research and reading",1],["Shadowing someone","Shadowing",2],["Something else","",1]
  ];
  /* The wheel: hours 0–12 and minutes in 5s, each a scroll-snapping column. */
  function wheelHtml(){
    const col=(name,values,fmt)=>'<div class="hw-col" data-col="'+name+'" tabindex="0" role="listbox" aria-label="'+(name==="h"?"Hours":"Minutes")+'"><div class="hw-pad"></div>'+values.map(v=>'<div class="hw-item" data-v="'+v+'" role="option">'+fmt(v)+'</div>').join("")+'<div class="hw-pad"></div></div>';
    return '<div class="hw"><div class="hw-band" aria-hidden="true"></div>'+
      col("h",[...Array(13).keys()],v=>v)+'<span class="hw-unit">h</span>'+
      col("m",[...Array(12).keys()].map(i=>i*5),v=>String(v).padStart(2,"0"))+'<span class="hw-unit">min</span></div>'+
      '<div class="hw-presets">'+[[.5,"30 min"],[1,"1 h"],[3.75,"Half day"],[7.5,"Full day"]].map(([v,l])=>'<button type="button" class="hw-preset" data-preset="'+v+'">'+l+'</button>').join("")+'</div>'+
      '<p class="hw-readout" aria-live="polite"></p><button type="button" class="chat-pill ui-pill-primary hw-ok"><strong>That’s right</strong></button>';
  }
  function bindWheel(el,start,done){
    const ITEM=40,cols={h:el.querySelector('[data-col="h"]'),m:el.querySelector('[data-col="m"]')},readout=el.querySelector(".hw-readout");
    const val=()=>{const h=Math.round(cols.h.scrollTop/ITEM),m=Math.round(cols.m.scrollTop/ITEM)*5;return {h:Math.max(0,Math.min(12,h)),m:Math.max(0,Math.min(55,m))}};
    const show=()=>{const v=val();readout.textContent=v.h||v.m?hm(v.h+v.m/60):"Scroll to set the time";el.querySelectorAll(".hw-col").forEach(c=>{const i=Math.round(c.scrollTop/ITEM);c.querySelectorAll(".hw-item").forEach((it,n)=>it.classList.toggle("on",n===i))})};
    const set=(hours,smooth)=>{const total=Math.round(hours*60),h=Math.floor(total/60),m=Math.round((total%60)/5);const b=smooth&&!reduced()?"smooth":"auto";cols.h.scrollTo({top:h*ITEM,behavior:b});cols.m.scrollTo({top:m*ITEM,behavior:b});setTimeout(show,smooth?350:0)};
    Object.values(cols).forEach(c=>{
      let t=null;c.addEventListener("scroll",()=>{clearTimeout(t);t=setTimeout(show,60)},{passive:true});
      c.addEventListener("keydown",e=>{if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();c.scrollBy({top:e.key==="ArrowDown"?ITEM:-ITEM})}});
      c.querySelectorAll(".hw-item").forEach((it,n)=>it.onclick=()=>c.scrollTo({top:n*ITEM,behavior:reduced()?"auto":"smooth"}));
    });
    el.querySelectorAll("[data-preset]").forEach(b=>b.onclick=()=>set(Number(b.dataset.preset),true));
    requestAnimationFrame(()=>set(start,false));
    el.querySelector(".hw-ok").onclick=()=>{const v=val(),hrs=v.h+v.m/60;if(hrs<=0){readout.textContent="Set how long first";return}el.querySelector(".hw-ok").disabled=true;el.classList.add("done");done(hrs)};
  }
  function logHours(){
    const k=K();
    k.say(k.pick(["Nice one. What did you do?","Let’s log it. What was it?","Good stuff. What kind of learning was it?"]));
    k.replies(KINDS.map(([label,desc,start])=>({label,run:()=>askWhen(desc,start)})));
  }
  /* When it happened, so learning can be logged afterwards: today, yesterday, or any day since the course started. */
  const dayStart=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x.getTime()};
  const isoDay=t=>{const d=new Date(t);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
  function askWhen(desc,start){
    const k=K(),today=dayStart(Date.now()),ok=on=>{k.userSays(on===today?"Today":on===today-864e5?"Yesterday":new Date(on).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}));askTime(desc,start,on)};
    k.say("When was it?");
    k.replies([{label:"Today",run:()=>ok(today)},{label:"Yesterday",run:()=>ok(today-864e5)},{label:"Another day",run:()=>{
      const en=window.eviaData.enrolment&&window.eviaData.enrolment(),first=en&&en.start?en.start:isoDay(today-365*864e5);
      k.say("Which day?");
      k.widget('<div class="hw-when"><input type="date" min="'+esc(first)+'" max="'+isoDay(today)+'" value="'+isoDay(today-2*864e5)+'" aria-label="The day it happened"><p class="hw-readout hw-when-err" aria-live="polite"></p><div class="hw-note-actions"><button type="button" class="chat-pill ui-pill-primary hw-when-ok"><strong>Next</strong></button></div></div>',el=>{
        const inp=el.querySelector("input");
        el.querySelector(".hw-when-ok").onclick=()=>{const v=inp.value,t=v?dayStart(v+"T12:00:00"):NaN;
          if(!v||isNaN(t)||t>today||v<first){el.querySelector(".hw-when-err").textContent="Pick a day between "+new Date(first+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})+" and today.";return}
          el.querySelectorAll("button,input").forEach(x=>x.disabled=true);el.classList.add("done");ok(t)};
      });
    }}]);
  }
  function askTime(desc,start,on){
    const k=K();
    k.say("How long did it take? Scroll to set it, or tap a quick one.");
    k.widget(wheelHtml(),el=>bindWheel(el,start,hrs=>askNote(desc,hrs,on)));
  }
  /* Two short questions: what you did, then (more importantly) what you learned. */
  const DID_HINT={"College day":"cavity walls and wall ties","Toolbox talk":"working at height","Training course":"abrasive wheels","Research and reading":"reading up on mortar mixes","Shadowing":"watching the setting out of a new block"};
  function textStep(prompt,placeholder,required,done){
    const k=K();
    k.say(prompt);
    k.widget('<div class="hw-note"><textarea rows="2" placeholder="'+esc(placeholder)+'"></textarea><div class="hw-note-actions">'+(required?"":'<button type="button" class="chat-pill hw-skip"><strong>Skip</strong></button>')+'<button type="button" class="chat-pill ui-pill-primary hw-save"><strong>Next</strong></button></div></div>',el=>{
      const ta=el.querySelector("textarea");
      const finish=v=>{
        if(required&&!v){ta.focus();ta.placeholder="A few words first, please";return}
        el.querySelectorAll("button").forEach(x=>x.disabled=true);ta.disabled=true;el.classList.add("done");
        if(v)k.userSays(v);done(v);
      };
      el.querySelector(".hw-save").onclick=()=>finish(ta.value.trim());
      const sk=el.querySelector(".hw-skip");if(sk)sk.onclick=()=>finish("");
    });
  }
  function askNote(desc,hrs,on){
    const k=K();
    k.userSays(hm(hrs));
    textStep(desc?"What did you do? A few words is plenty.":"What did you do?","For example: "+(DID_HINT[desc]||"toolbox talk on manual handling"),true,did=>
      textStep("And what did you learn from it? This is the bit your assessor cares about most.","For example: how to space wall ties and why they matter",true,learned=>{
        const what=[desc,did].filter(Boolean).join(": ")||desc||"Learning hours";
        save(hrs,what+(learned?". What I learned: "+learned:""),did,learned,on);
      }));
  }
  function save(hrs,text,did,learned,on){
    const k=K(),now=Date.now(),earlier=on!=null&&on<dayStart(now);
    window.eviaData.put("hours",{minutes:Math.round(hrs*60),description:text,did:did||"",learned:learned||"",source:"evia",createdAt:now,...(earlier?{occurredAt:on+12*36e5}:{})});
    if(window.eviaCheckTargets)window.eviaCheckTargets();
    /* The week it happened in: backdated to an earlier week, that week's total, said as such. */
    const when=earlier?on+12*36e5:now,wk=(()=>{const d=new Date(when);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getTime()})(),thisWeek=wk===weekStart();
    const week=hours.filter(x=>{const t=Number(x.on||x.createdAt);return t>=wk&&t<wk+7*864e5}).reduce((n,x)=>n+Number(x.n||0),0);
    const dayName=new Date(when).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"short"});
    if(window.eviaMood)window.eviaMood("happy");
    k.say((learned?k.pick(["Great learning.","That’s a good one to have learned.","Nice, that’s worth knowing."])+" ":"")+"Logged <strong>"+esc(hm(hrs))+"</strong>"+(earlier?" for "+esc(dayName):"")+". "+(thisWeek?(week>=6?"That’s <strong>"+esc(hm(week))+"</strong> this week, which is brilliant.":"That’s <strong>"+esc(hm(week))+"</strong> this week so far."):"That makes <strong>"+esc(hm(week))+"</strong> for the week of "+esc(new Date(wk).toLocaleDateString("en-GB",{day:"numeric",month:"short"}))+"."));
    k.replies([{label:"Log more",run:logHours},{label:"See my learning logs",run:()=>{k.closeChat();setTimeout(()=>window.eviaOpenLearningLogs&&window.eviaOpenLearningLogs(),120)}},{label:"Something else",run:k.somethingElse}]);
  }

  /* ---------- Confidence check: one skill at a time ---------- */
  const LEVELS=["Need more training","Know the basics","Quite confident","Mastered"],SHORT=["Need training","Basics","Confident","Mastered"];
  /* Evia's view of a skill from Teach me lessons, shown beside the learner's own rating. */
  const eviaView=area=>{const v=window.eviaTeach&&window.eviaTeach.viewFor(area);return v?'<p class="cf-evia"><span class="evia-mini" aria-hidden="true"><span class="evia-face"><i></i><i></i></span></span><span>Your lesson scores suggest: <strong>'+esc(v.label)+'</strong></span></p>':""};
  function confidence(){
    const k=K(),qs=typeof confidenceQuestions==="function"?confidenceQuestions():[];
    /* Runs as its own full-screen flow in the Teach me style (teach.js). */
    if(qs.length&&window.eviaTeach&&window.eviaTeach.confidence){k.say("Let’s check your confidence, one skill at a time.");setTimeout(()=>{k.closeChat();setTimeout(window.eviaTeach.confidence,80)},700);return}
    if(!qs.length){k.say("I don’t have a skills list for your course yet.");k.replies([{label:"Something else",run:k.somethingElse}]);return}
    const prev=new Map();window.eviaData.list("confidence").filter(x=>x&&x.course===course&&Array.isArray(x.scores)).forEach(s=>s.scores.forEach(x=>prev.set(x.area,x.score)));
    k.say("Be honest, there are no wrong answers. I’ll ask about "+qs.length+" skills: slide each one to where you are now."+(prev.size?" The faint dot shows where you were last time.":"")+" It takes about two minutes.");
    const scores=[];let i=0;
    const ask=()=>{
      if(i>=qs.length){finish();return}
      const [area,question]=qs[i],was=prev.get(area),v=was||1;
      /* The same slider as the Practice check: four stops, and a faint dot where you were last time. */
      k.widget('<div class="cfc"><div class="cfc-top"><span>'+(i+1)+' of '+qs.length+'</span><span class="cfc-dots" aria-hidden="true">'+qs.map((_,n)=>'<i class="'+(n<i?"done":n===i?"now":"")+'"></i>').join("")+'</span></div>'+
        '<div class="cf-row'+(was?"":" unset")+'"'+(was?' data-level="'+(was<=2?"low":"high")+'"':"")+'><div class="cf-row-top"><strong id="cfc-name-'+i+'">'+esc(area)+'</strong><span class="cf-level">'+(was?esc(SHORT[was-1]):"Slide to rate")+'</span></div>'+
        '<p class="cf-desc">'+esc(question)+'</p>'+eviaView(area)+
        '<div class="cf-track" style="--v:'+v+'"><span class="cf-stops" aria-hidden="true"><i></i><i></i><i></i><i></i></span>'+(was?'<span class="cf-last" style="--l:'+was+'" title="Last time: '+esc(LEVELS[was-1])+'"></span>':"")+'<input type="range" min="1" max="4" step="1" value="'+v+'" aria-labelledby="cfc-name-'+i+'" aria-valuetext="'+(was?esc(LEVELS[v-1]):"Not rated")+'"></div>'+
        '<div class="cfc-legend" aria-hidden="true"><span>Need training</span><span>Basics</span><span>Confident</span><span>Mastered</span></div></div>'+
        (was?'<small class="cfc-was">Last time: '+esc(LEVELS[was-1])+' (the faint dot)</small>':"")+
        '<button type="button" class="chat-pill ui-pill-primary cfc-next"'+(was?"":" disabled")+'><strong>'+(was?"Same as last time":"Next")+'</strong></button></div>',el=>{
        const row=el.querySelector(".cf-row"),input=el.querySelector("input"),track=el.querySelector(".cf-track"),next=el.querySelector(".cfc-next");
        const set=()=>{
          const n=+input.value;row.classList.remove("unset");row.dataset.level=n<=2?"low":"high";track.style.setProperty("--v",n);
          row.querySelector(".cf-level").innerHTML=esc(SHORT[n-1])+(was&&was!==n?' <small>· was '+esc(SHORT[was-1])+'</small>':"");
          input.setAttribute("aria-valuetext",LEVELS[n-1]);
          next.disabled=false;next.querySelector("strong").textContent=i+1<qs.length?"Next":"Finish";
        };
        ["input","change","pointerup"].forEach(ev=>input.addEventListener(ev,set));
        next.onclick=()=>{
          if(next.disabled)return;
          const score=+input.value;input.disabled=true;el.firstElementChild.parentElement.classList.add("done");
          scores.push({area,score,question,answeredAt:new Date().toISOString()});
          i++;setTimeout(ask,reduced()?0:200);
        };
      });
    };
    const finish=()=>{
      window.eviaData.put("confidence",{course,scores});
      if(window.eviaCheckTargets)window.eviaCheckTargets();
      const low=scores.filter(x=>x.score<=2).sort((a,b)=>a.score-b.score),high=scores.filter(x=>x.score>=3).sort((a,b)=>b.score-a.score);
      const up=scores.filter(x=>prev.has(x.area)&&x.score>prev.get(x.area));
      if(window.eviaMood)window.eviaMood("happy");
      k.say("Thanks, that’s saved."+(up.length?" You’ve moved up in <strong>"+esc(k.listText(up.map(x=>x.area)))+"</strong>, nice progress.":"")+(high.length?" You’re strongest at <strong>"+esc(high[0].area)+"</strong>.":""));
      if(low.length){
        k.say("I’d work on <strong>"+esc(k.listText(low.slice(0,3).map(x=>x.area)))+"</strong> next. Tell your tutor or supervisor, and ask to get involved when that work comes up on site.");
        k.replies([{label:"Find me a college task",primary:true,run:upskillTask},{label:"See my confidence",run:()=>{k.closeChat();setTimeout(()=>{nav("learning");setTimeout(()=>window.eviaProgressDeep&&window.eviaProgressDeep("conf"),450)},60)}},{label:"Something else",run:k.somethingElse}]);
      }else{
        k.say("Nothing rated low. Keep it up, and try a full mock test to prove it.");
        k.replies([{label:(window.eviaNvq&&window.eviaNvq.on())?"Knowledge tests":"EPA mocks",run:epa},{label:"Something else",run:k.somethingElse}]);
      }
    };
    ask();
  }

  /* ---------- Upskill me ---------- */
  function upskill(){
    const k=K();
    k.say(k.pick(["Love it. What do you fancy?","Let’s get you better at something. Pick one:"]));
    const list=[{label:"A college task",primary:true,run:upskillTask}];
    list.push({label:"Something else",run:k.somethingElse});
    k.replies(list);
  }
  /* A college task as a card in the chat: Evia's pick if the confidence check has low skills, otherwise any. */
  function upskillTask(){
    const k=K(),P=window.eviaPractice,all=(window.EVIA_PRACTICE_TASKS||{})[course]||[];
    if(!P||!all.length){k.say("I don’t have college tasks for your course yet. Ask your tutor which jobs to practise in the workshop.");k.replies([{label:"Something else",run:k.somethingElse}]);return}
    const picks=P.suggestTasks(3),pick=picks[0]||{task:all[Math.floor(Math.random()*all.length)],covers:[]},t=pick.task;
    k.say(pick.covers.length?"Try this in the workshop. It works on <strong>"+esc(k.listText(pick.covers))+"</strong>, which you rated low.":"Here’s a good one to try in the workshop.");
    k.widget('<div class="ut"><span class="ut-kicker">College task · about '+esc(t.time)+'</span><strong>'+esc(t.title)+'</strong><p>'+esc(t.brief)+'</p><ol>'+t.steps.slice(0,3).map(s=>'<li>'+esc(s)+'</li>').join("")+'</ol>'+(t.steps.length>3?'<button type="button" class="ut-more">All '+t.steps.length+' steps ›</button>':"")+'</div>',el=>{
      const m=el.querySelector(".ut-more");if(m)m.onclick=()=>{k.closeChat();setTimeout(()=>picks.length?P.openTask(0):P.openAllTasks(),80)};
    });
    k.replies([{label:"Another idea",run:upskillTask},{label:"Open Skills",run:()=>{k.closeChat();setTimeout(P.openAllTasks,80)}},{label:"Something else",run:k.somethingElse}]);
  }

  /* ---------- Check my evidence: unit by unit, plainly ---------- */
  function evidence(){
    const k=K(),a=k.analyse(),prompts=(window.eviaLearnerPrompts||{})[course]||{};
    const started=a.units.filter(u=>u.started);
    if(!started.length){k.say("You haven’t saved any evidence yet. Pick a topic on Topics, take a few photos and write what you did. I’ll check it for you after.");k.replies([{label:"Something else",run:k.somethingElse}]);return}
    const checks=started.map(u=>{const c=prompts[u.name]?k.checkUnit(u,prompts):null;const latest=u.entries.slice().sort((x,y)=>Date.parse(y.savedAt||0)-Date.parse(x.savedAt||0))[0];const photos=c?c.photos:(latest&&(latest.photoIds||latest.p||[]).length)||0,words=c?c.words:String(latest&&latest.w||"").trim().split(/\s+/).filter(Boolean).length;
      const issues=[];if(photos<5)issues.push(photos<3?"only "+k.plural(photos,"photo")+": add the start, middle and finished job":"add "+(5-photos)+" more photo"+(5-photos===1?"":"s"));
      if(c&&c.missing.length)issues.push("mention "+k.listText(c.missing.slice(0,3))+(c.missing.length>3?" and "+(c.missing.length-3)+" more":""));
      if(words<60)issues.push("write a bit more about how you did it and how you checked it");
      return {u,issues,score:issues.length,pct:c&&c.terms.length?Math.round(c.covered.length/c.terms.length*100):null}}).sort((x,y)=>y.score-x.score);
    const weak=checks.filter(c=>c.score),good=checks.filter(c=>!c.score);
    k.say("I’ve been through "+k.plural(checks.length,"unit")+" with evidence."+(good.length?" <strong>"+esc(k.listText(good.slice(0,3).map(c=>c.u.name)))+"</strong> "+(good.length===1?"looks":"look")+" strong.":""));
    if(!weak.length){if(window.eviaMood)window.eviaMood("happy");k.say("Everything I can check looks good. Nice work.");}
    else k.widget('<div class="ec">'+weak.slice(0,3).map(c=>'<div class="ec-item"><div class="ec-head"><strong>'+esc(c.u.name)+'</strong>'+(c.pct!=null?'<span>'+c.pct+'% of key points</span>':"")+'</div><ul>'+c.issues.map(x=>'<li>'+esc(x.charAt(0).toUpperCase()+x.slice(1))+'</li>').join("")+'</ul><button type="button" class="ec-open" data-unit="'+c.u.index+'">Open '+esc(c.u.name)+' ›</button></div>').join("")+'</div>',el=>{
      el.querySelectorAll("[data-unit]").forEach(b=>b.onclick=()=>k.openUnitFromChat({index:+b.dataset.unit}));
    });
    const notStarted=a.units.filter(u=>!u.started).length;
    if(notStarted)k.say(k.plural(notStarted,"unit")+" still "+(notStarted===1?"has":"have")+" no evidence."+(a.quickest?" <strong>"+esc(a.quickest.name)+"</strong> would tick off the most.":""));
    k.replies([a.quickest?{label:"Open "+a.quickest.name,run:()=>k.openUnitFromChat(a.quickest)}:null,{label:"Something else",run:k.somethingElse}].filter(Boolean));
  }

  /* ---------- Shared: go to a place in the app from the chat ---------- */
  const nvqOn=()=>!!(window.eviaNvq&&window.eviaNvq.on());
  const waitFor=(sel,then,tries)=>{const el=document.querySelector(sel);if(el)return then(el);if((tries||0)<25)setTimeout(()=>waitFor(sel,then,(tries||0)+1),120)};
  const flash=el=>{el.scrollIntoView({block:"center",behavior:reduced()?"auto":"smooth"});el.classList.remove("ev-flash");void el.offsetWidth;el.classList.add("ev-flash")};
  /* Open a unit and land on one part of it: the photos, the write-up or the guided pack. */
  function openUnitAt(u,sel,how){
    K().closeChat();
    /* The photos and the write-up are the two free range screens (polish.js). */
    const step=sel==="#evidence-photos"?"photos":sel==="#write"?"write":null;
    setTimeout(()=>{openUnit(u.index,step);setTimeout(()=>waitFor(sel,el=>{flash(el);if(how==="focus")setTimeout(()=>el.focus({preventScroll:true}),400);if(how==="click")setTimeout(()=>el.click(),300)}),300)},60);
  }
  /* Open a My progress section: scroll to its card and open its detail. */
  function openProgress(id){
    K().closeChat();
    setTimeout(()=>{nav("learning");setTimeout(()=>waitFor("#pv-"+id,el=>{flash(el);if(window.eviaProgressDeep)setTimeout(()=>window.eviaProgressDeep(id),500)}),350)},60);
  }

  /* ---------- Evidence check: one piece of evidence, its quality and what's still missing ---------- */
  const level=(v,weak,good)=>v<=weak?0:v<=good?1:2;
  const EV_LEVELS=["Weak","Good","Strong"];
  function evidenceCheck(){
    const k=K(),a=k.analyse();
    const latest=u=>Math.max(...u.entries.map(e=>Date.parse(e.savedAt||"")||0));
    const started=a.units.filter(u=>u.started).sort((x,y)=>latest(y)-latest(x));
    if(!started.length){
      k.say("You haven’t saved any evidence yet. Pick a topic on Topics, take a few photos and write what you did. Then I’ll check it for you.");
      k.replies([{label:"Go to Topics",primary:true,run:()=>{k.closeChat();setTimeout(()=>nav("course"),60)}},{label:"Something else",run:k.somethingElse}]);return;
    }
    k.say("Which evidence shall I check? Your most recent is first.");
    k.replies(started.slice(0,5).map((u,i)=>({label:u.name,primary:!i,run:()=>{checkOne(u)}})).concat([{label:"Something else",run:k.somethingElse}]));
  }
  function checkOne(u){
    const k=K(),prompts=(window.eviaLearnerPrompts||{})[course]||{},c=k.checkUnit(u,prompts);
    const pct=c.terms.length?Math.round(c.covered.length/c.terms.length*100):null;
    const lv=[level(c.photos,4,9),level(c.words,49,99)].concat(pct==null?[]:[level(pct,49,79)]),overall=Math.min(...lv);
    const good=[],work=[];
    (c.photos>=10?good:c.photos>=5?good:work).push(c.photos>=5?k.plural(c.photos,"photo")+(c.photos>=10?": plenty to show the job":", enough to show the job"):"Only "+k.plural(c.photos,"photo")+": add the start, middle and finished job");
    (c.words>=100?good:c.words>=50?good:work).push(c.words>=50?"A write-up of "+c.words+" words":"The write-up is short ("+c.words+" words): say how you did it and how you checked it");
    if(pct!=null)(pct>=80?good:work).push(pct>=80?"Covers "+c.covered.length+" of "+c.terms.length+" things to mention":"Covers "+c.covered.length+" of "+c.terms.length+" things to mention");
    if(window.eviaMood)window.eviaMood(overall===2?"happy":"think");
    k.say("<strong>"+esc(u.name)+"</strong> is <strong>"+EV_LEVELS[overall]+"</strong> evidence"+(overall===2?". Really nice work.":overall===1?". A few things would make it strong.":". Let’s build it up.")+"");
    k.widget('<div class="ec ev-check"><div class="ec-item"><div class="ec-head"><strong>'+esc(u.name)+'</strong><span class="ev-lv l'+overall+'">'+EV_LEVELS[overall]+'</span></div>'+
      (good.length?'<p class="ev-sub">What’s good</p><ul class="ev-good">'+good.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>':"")+
      (work.length?'<p class="ev-sub">Needs work</p><ul>'+work.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>':"")+
      (c.missing.length?'<p class="ev-sub">Still to mention</p><ul class="ev-miss">'+c.missing.map(x=>'<li>'+esc(x.charAt(0).toUpperCase()+x.slice(1))+'</li>').join("")+'</ul>':"")+
      '</div></div>');
    if(c.missing.length)k.say("Add the things still to mention to your write-up, in your own words.");
    k.replies([
      {label:"Add photos",primary:c.photos<5,run:()=>openUnitAt(u,"#evidence-photos")},
      {label:"Improve my write-up",primary:c.photos>=5,run:()=>openUnitAt(u,"#write","focus")},
      {label:"Let Evia guide me",run:()=>openUnitAt(u,"#eg-start","click")},
      {label:"Check another",run:evidenceCheck},
      {label:"Something else",run:k.somethingElse}
    ]);
  }

  /* ---------- Quick review: every area at a glance ---------- */
  function areas(){
    const S=window.eviaStats.compute(),a=S.a,out=[],add=(id,title,ok,text)=>out.push({id,title,ok,text});
    const gap=a.timePct==null?0:a.timePct-a.ksbPct;
    add("where","Evidence",gap<=10,a.ksbPct+"% of "+(window.eviaTerm?window.eviaTerm().many:"KSBs")+(a.signoff?" signed off":" have evidence")+(gap>10?", a little behind for this point in your course":a.timePct!=null?", on track":""));
    add("quality","Evidence quality",S.coverage!=null&&S.coverage>=70,S.coverage==null?"No write-ups checked yet":"Write-ups cover "+S.coverage+"% of the things to mention");
    /* Learning hours over the review period (since the last review, at most 12 weeks, at least 1), by the day each
       entry happened, so backdated hours count. The aim is the planned hours spread over the programme when the
       college has set them, otherwise 6 hours a week. */
    {
      const DAY=864e5,now=Date.now(),en=window.eviaData.enrolment&&window.eviaData.enrolment(),p=window.eviaData.learner()||{};
      const lastRev=[en&&en.lastReview?Date.parse(en.lastReview):0,...(window.eviaGetReviews?window.eviaGetReviews():[]).map(r=>Date.parse(r.date)||0)].reduce((a,b)=>Math.max(a,b),0);
      const startP=Date.parse((en&&en.start)||p.start||"")||0,endP=Date.parse((en&&en.end)||p.end||"")||0;
      const from=Math.max(lastRev||startP||now-28*DAY,now-84*DAY,startP||0),weeks=Math.max(1,(now-from)/(7*DAY));
      const inPeriod=hours.filter(x=>Number(x.on||x.createdAt)>=from).reduce((n,x)=>n+Number(x.n||0),0),avg=inPeriod/weeks;
      const planned=Number(en&&en.plannedOtjHours),aim=planned>0&&endP>startP?Math.round(planned/((endP-startP)/(7*DAY))*10)/10:6;
      const since=new Date(from).toLocaleDateString("en-GB",{day:"numeric",month:"short"});
      add("otj","Learning hours",avg>=aim*0.9,inPeriod?hm(Math.round(inPeriod*100)/100)+" since "+since+", about "+hm(Math.round(avg*10)/10)+" a week (aim for "+hm(aim)+")":"Nothing logged since "+since+" (aim for "+hm(aim)+" a week)");
    }
    const sc=S.confidence.scores,low=sc.filter(x=>x.score<=2);
    add("conf","Confidence",sc.length>=3&&!low.length,sc.length<3?"Skills not rated yet":low.length?"Low in "+K().listText(low.slice(0,2).map(x=>x.area)):"Confident across your skills");
    const T=window.eviaTeach,st=T&&T.stats?T.stats():{days:{}},sum=T&&T.summary?T.summary():{done:0,total:0};
    const recent=Object.keys(st.days||{}).some(d=>Date.now()-Date.parse(d)<8*864e5);
    add("teach","Teach me",recent,sum.done+" of "+sum.total+" lessons done"+(recent?", learning this week":", nothing this week"));
    const tests=window.eviaData.list("tests").filter(t=>t&&t.course===course&&(t.type==="epa")),lt=tests[tests.length-1];
    add("tests",nvqOn()?"Knowledge tests":"EPA practice",!!lt&&lt.pct>=70,lt?"Last score "+lt.pct+"%"+(lt.pct>=70?"":" (aim for 70%)"):"No practice yet");
    const TG=window.eviaTargets,tg=TG?TG.mine():[],open=tg.filter(t=>!t.done),late=open.filter(t=>t.due&&Date.parse(t.due)<Date.now());
    add("targets","Targets",tg.length>0&&!late.length,!tg.length?"None set yet":tg.length-open.length+" of "+tg.length+" done"+(late.length?", "+late.length+" overdue":""));
    const rd=window.eviaReviewDue&&window.eviaReviewDue();
    add("review","Progress review",!!rd&&rd.days>=0,!rd?"No date yet":rd.days<0?"Overdue":"Next one in "+K().plural(rd.days,"day"));
    return out;
  }
  function quickReview(){
    const k=K(),list=areas(),work=list.filter(x=>!x.ok),good=list.filter(x=>x.ok);
    if(window.eviaMood)window.eviaMood(work.length<=2?"happy":"think");
    k.say(!work.length?"Everything looks good. Brilliant.":good.length?"<strong>"+good.length+"</strong> area"+(good.length===1?" looks":"s look")+" good and <strong>"+work.length+"</strong> need"+(work.length===1?"s":"")+" work.":"Every area needs a bit of work. Let’s take them one at a time.");
    k.widget('<div class="qr">'+list.map(x=>'<div class="qr-row '+(x.ok?"ok":"no")+'"><span class="qr-ic" aria-hidden="true">'+(x.ok?"✓":"!")+'</span><span><strong>'+esc(x.title)+'</strong><small>'+esc(x.text)+'</small></span></div>').join("")+'</div>');
    k.replies(work.slice(0,4).map((x,i)=>({label:"Open "+x.title,primary:!i,run:()=>x.id==="teach"?(k.closeChat(),setTimeout(()=>nav("teach"),60)):openProgress(x.id==="tests"&&!window.eviaData.list("tests").some(t=>t&&t.course===course)?"tests":x.id)})).concat([{label:"Something else",run:k.somethingElse}]));
  }

  /* ---------- Get ready for my review: what's low, one thing at a time, then their comments ----------
     Each area Evia checks (areas()) that needs work becomes a task with one way to do it. A task is done when the
     area looks good again, so coming back shows only what's left. The last task is the check-in and comments the
     assessor reads first (reviews.js). Skipped tasks come back last. */
  const PREP_KEY="evia7-review-prep";
  const ORDER=["where","quality","otj","targets","tests","conf","teach"];
  const DOIT={
    where:{label:"Add evidence",why:"Your assessor looks at how much of your course has evidence. Adding a pack now makes the biggest difference.",
      run:()=>{const a=K().analyse();a.quickest?K().openUnitFromChat(a.quickest):(K().closeChat(),setTimeout(()=>nav("course"),60))}},
    quality:{label:"Check my write-ups",why:"Strong write-ups cover the things to mention on each unit. I’ll show you what’s missing.",run:()=>evidenceCheck()},
    otj:{label:"Log hours",why:"Your off-the-job hours are checked at every review. Log anything you haven’t yet, on the day it happened: training, toolbox talks, research.",run:()=>logHours()},
    targets:{label:"Look at my targets",why:"Your assessor goes through your targets first. Let’s see which ones you can still tick off.",run:()=>targets()},
    tests:{label:"Take a practice test",why:"A test score shows your assessor what you know.",run:()=>epa()},
    conf:{label:"Rate my skills",why:"Your assessor uses this to plan what you practise next.",run:()=>confidence()},
    teach:{label:"Open Teach me",why:"A lesson this week shows you’re keeping your knowledge up.",run:()=>{K().closeChat();setTimeout(()=>nav("teach"),80)}}
  };
  const prepState=()=>{try{return JSON.parse(localStorage.getItem(PREP_KEY)||"null")||{}}catch(_){return{}}};
  const prepSave=st=>{try{localStorage.setItem(PREP_KEY,JSON.stringify(st))}catch(_){}};
  /* The tasks now, in order (skipped ones last), and whether the comments are in. */
  function prepTasks(){
    const rd=window.eviaReviewDue&&window.eviaReviewDue(),key=rd?rd.due.toISOString().slice(0,10):"",st=prepState();
    const skipped=st.key===key?(st.skipped||[]):[];
    const list=areas().filter(x=>!x.ok&&DOIT[x.id]).sort((a,b)=>ORDER.indexOf(a.id)-ORDER.indexOf(b.id));
    const todo=list.filter(x=>!skipped.includes(x.id)).concat(list.filter(x=>skipped.includes(x.id)));
    /* Comments for the assessor are only asked for when connected to a college (the assessor reads them in Milos). */
    const commentsDone=rd?(rd.college||(window.eviaNisia&&window.eviaNisia.joined())?!!rd.commentsDone:true):false;
    return {rd,key,todo,commentsDone,all:areas()};
  }
  window.eviaReviewPrepCount=()=>{try{const p=prepTasks();return p.todo.length+(p.commentsDone?0:1)}catch(_){return 0}};
  function prepare(){
    const k=K(),p=prepTasks(),rd=p.rd;
    const when=rd?(rd.days<0?"Your review was due on <strong>"+rd.due.toLocaleDateString("en-GB",{day:"numeric",month:"long"})+"</strong>.":rd.days===0?"Your review is <strong>today</strong>.":"Your review is on <strong>"+rd.due.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})+"</strong>, in "+k.plural(rd.days,"day")+"."):"";
    const left=p.todo.length+(p.commentsDone?0:1);
    if(window.eviaMood)window.eviaMood(left?"think":"happy");
    k.say((when?when+" ":"")+(left?"Let’s get you ready. "+(p.todo.length?"There "+(p.todo.length===1?"is <strong>1 thing</strong>":"are <strong>"+p.todo.length+" things</strong>")+" to look at"+(p.commentsDone?"":", then your comments for your assessor")+". One at a time.":"Just your comments for your assessor to do."):"You’re all ready. Everything looks good and your comments are in. Brilliant."));
    k.widget('<div class="qr prep">'+p.all.filter(x=>x.id!=="review").map(x=>'<div class="qr-row '+(x.ok?"ok":"no")+'"><span class="qr-ic" aria-hidden="true">'+(x.ok?"✓":"!")+'</span><span><strong>'+esc(x.title)+'</strong><small>'+esc(x.text)+'</small></span></div>').join("")+
      '<div class="qr-row '+(p.commentsDone?"ok":"no")+'"><span class="qr-ic" aria-hidden="true">'+(p.commentsDone?"✓":"!")+'</span><span><strong>Your comments</strong><small>'+(p.commentsDone?"Done: your assessor can read them":"How it’s going, how things are at work, any help you need")+'</small></span></div></div>');
    if(!left)return k.replies([{label:"Something else",run:k.somethingElse}]);
    passed=new Set();nextPrep();
  }
  let passed=new Set();   /* skipped in this go, so "Skip for now" moves on */
  function nextPrep(){
    const k=K(),p=prepTasks(),t=p.todo.find(x=>!passed.has(x.id));
    if(!t){
      if(p.commentsDone){k.say("That’s everything. You’re ready for your review.");return k.replies([{label:"Something else",run:k.somethingElse}])}
      k.say("Last one: your comments. Your assessor reads them before the review, and they fill in part of it, so it’s quicker on the day.");
      return k.replies([{label:"Add my comments",primary:true,run:()=>{window.eviaChatReview?window.eviaChatReview():(k.closeChat(),setTimeout(window.eviaStartReview,80))}},{label:"Later",run:k.somethingElse}]);
    }
    const d=DOIT[t.id];
    k.say("<strong>"+esc(t.title)+"</strong>: "+esc(t.text)+". "+esc(d.why));
    k.replies([{label:d.label,primary:true,run:()=>d.run()},
      {label:"Skip for now",run:()=>{const st=prepState();const s2={key:p.key,skipped:[...new Set([...(st.key===p.key?st.skipped||[]:[]),t.id])]};prepSave(s2);
        passed.add(t.id);nextPrep()}},
      {label:"Something else",run:k.somethingElse}]);
  }

  /* ---------- Show targets: what's done, what's left, and the most urgent one to do now ---------- */
  function targetDo(t){
    const k=K(),C=window.eviaCoachFlows,a=k.analyse();
    const go={
      units:()=>a.quickest?k.openUnitFromChat(a.quickest):(k.closeChat(),setTimeout(()=>nav("course"),60)),
      ksb:()=>a.quickest?k.openUnitFromChat(a.quickest):(k.closeChat(),setTimeout(()=>nav("course"),60)),
      streak:()=>a.quickest?k.openUnitFromChat(a.quickest):(k.closeChat(),setTimeout(()=>nav("course"),60)),
      otj:()=>C.hours(),
      epa:()=>window.eviaTestMe&&window.eviaTestMe({type:"epa-full"}),
      quiz:()=>window.eviaTestMe&&window.eviaTestMe({type:"epa",count:5}),
      skill:()=>k.taskFromMenu(),
      rate:()=>C.confidence(),
      maths:()=>window.eviaTestMe&&window.eviaTestMe({type:"maths"}),
      english:()=>window.eviaTestMe&&window.eviaTestMe({type:"english"}),
      quality:()=>evidenceCheck(),
      lessons:()=>{k.closeChat();setTimeout(()=>nav("teach"),80)}
    }[t.kind];
    return go||(()=>openProgress("targets"));
  }
  function targets(){
    const k=K(),T=window.eviaTargets;
    if(!T){k.say("Targets aren’t available just now.");return k.somethingElse()}
    const {created}=T.ensure();T.check(false);
    const now=T.mine(),S=T.stats();
    if(!now.length){k.say("I need a bit more from you first. Capture some evidence and I’ll set targets.");return k.replies([{label:"Something else",run:k.somethingElse}])}
    const open=now.filter(t=>!t.done).map(t=>({t,p:T.progress(t,S).pct,due:Date.parse(t.due)||Infinity})).sort((x,y)=>x.due-y.due||x.p-y.p);
    if(created)k.say("You didn’t have any targets yet, so I’ve set "+k.plural(now.length,"target")+" based on how you’re getting on.");
    k.say(!open.length?"You’ve done all "+now.length+" targets. Brilliant. Your next progress review will set new ones.":"You’ve done <strong>"+(now.length-open.length)+" of "+now.length+"</strong>. <strong>"+open.length+"</strong> still to do.");
    k.widget('<div class="chat-targets">'+T.cardHtml({chat:true})+'</div>',el=>{T.bind(el);requestAnimationFrame(()=>requestAnimationFrame(()=>{const c=el.querySelector(".pg-card");if(c)c.classList.add("pg-in")}))});
    if(open.length){
      const u=open[0],late=u.due<Date.now();
      k.say("Most urgent: <strong>"+esc(u.t.title)+"</strong>"+(u.due<Infinity?(late?", which was due ":", due ")+new Date(u.due).toLocaleDateString("en-GB",{day:"numeric",month:"long"}):"")+".");
      k.replies([{label:"Do it now",primary:true,run:targetDo(u.t)},{label:"See them in My progress",run:()=>openProgress("targets")},{label:"Something else",run:k.somethingElse}]);
    }else k.replies([{label:"See them in My progress",primary:true,run:()=>openProgress("targets")},{label:"Something else",run:k.somethingElse}]);
  }

  /* ---------- EPA mocks: the chat goes dark grey, like the real thing ---------- */
  const EPA_KEYS={bricklayer:"bricklaying",site:"siteCarpentry",joiner:"benchJoinery"};
  const discussions=()=>{const key=EPA_KEYS[course]||"bricklaying";let bank=[];try{bank=EPA_DISCUSSIONS[key]||[]}catch(_){}const g=(window.EVIA_EPA_GUIDE||{})[key]||[];return bank.map((q,i)=>Object.assign({},q,g[i]||{}))};
  const epaMode=on=>document.body.classList.toggle("evia-epa",!!on);
  function epa(){
    const k=K();epaMode(true);
    k.say(nvqOn()?"Let’s practise for your knowledge tests. Take your time: this is just practice.":"Let’s get you ready for your end-point assessment. Take a breath: this is just practice.");
    epaMenu();
  }
  function epaMenu(){
    const k=K();
    k.replies([
      {label:"Quick practice",primary:true,run:()=>{k.say("5 multiple-choice questions, or 1 discussion question?");k.replies([{label:"5 multiple choice",primary:true,run:()=>window.eviaTestMe({type:"epa",count:5})},{label:"1 discussion question",run:()=>discuss(1)},{label:"Back",run:epaMenu}])}},
      {label:nvqOn()?"Full knowledge test":"Full mock",run:()=>window.eviaTestMe({type:"epa-full"})},
      {label:"Full discussion",run:()=>discuss()},
      {label:"Discussion guide",run:()=>{guide()}},
      {label:"Something else",run:()=>{epaMode(false);k.somethingElse()}}
    ]);
  }
  /* The discussion guide: read a strong answer, answer with prompts, then answer on your own. */
  function guide(){
    const k=K(),qs=discussions().filter(q=>q.model);
    if(!qs.length){k.say("I don’t have discussion questions for your course yet.");return epaMenu()}
    k.say("I’ll teach you how to answer a discussion question in three stages: <strong>1</strong> read a strong answer, <strong>2</strong> answer it out loud with prompts, <strong>3</strong> answer it out loud with no prompts.");
    k.say("Which question shall we practise?");
    k.replies(qs.map((q,i)=>({label:shortQ(q.prompt),primary:!i,run:()=>{stage1(q)}})).concat([{label:"Advice first",run:advice},{label:"Back",run:epaMenu}]));
  }
  const shortQ=p=>{const s=String(p).split(/(?<=\.)\s/)[0].replace(/^You (have been asked to|are|need to|have|discover that)\s*/i,"").replace(/\.$/,"");return s.charAt(0).toUpperCase()+s.slice(1)};
  function advice(){
    const k=K(),A=(window.EVIA_EPA_GUIDE||{}).advice||[];
    
    k.say("Here’s what assessors listen for.");
    k.widget('<ol class="dg-adv">'+A.map(x=>'<li><strong>'+esc(x[0])+'</strong><span>'+esc(x[1])+'</span></li>').join("")+'</ol>');
    k.replies([{label:"Pick a question",primary:true,run:guide},{label:"Back",run:epaMenu}]);
  }
  const qCard=(q,stage)=>'<div class="dg-q"><span class="dg-stage">Stage '+stage+' of 3</span><p>'+esc(q.prompt)+'</p></div>';
  function stage1(q){
    const k=K();
    k.say("Stage 1: read this strong answer. Notice it goes through the job in order and says <strong>why</strong>, not just what.");
    k.widget(qCard(q,1)+'<div class="dg-model"><p>'+esc(q.model)+'</p><div class="dg-chips">'+q.points.map(p=>'<span>✓ '+esc(p.label)+'</span>').join("")+'</div></div>');
    k.replies([{label:"I’ve read it",primary:true,run:()=>{stage(q,2)}},{label:"Pick another question",run:guide}]);
  }
  /* The recorded discussion (discussion.js): the chat closes and the discussion room opens. */
  function discuss(count){
    const k=K();
    if(!window.eviaDiscussion){window.eviaTestMe({type:"discussion",count});return}
    k.closeChat();setTimeout(()=>window.eviaDiscussion.open({count}),150);
  }
  /* Stages 2 and 3: answer out loud (the words stay hidden: it's spoken), then compare with the strong answer.
     No marking: it's for learning. */
  function stage(q,n){
    const k=K(),D=window.eviaDiscussion;
    if(!D||!D.supported()){
      k.say("This part is spoken, like the real discussion, but this browser can’t turn your voice into text. Open Evia in <strong>Chrome</strong> on Android or <strong>Safari</strong> on iPhone, and allow the microphone.");
      return k.replies([{label:"Pick another question",run:guide},{label:"Back to EPA mocks",run:epaMenu}]);
    }
    k.say(n===2?"Stage 2: now answer the same question out loud. Use the prompts to cover each area. Tap the microphone when you’re ready.":"Stage 3: answer it out loud once more, with no prompts this time.");
    k.widget(qCard(q,n)+(n===2?'<ol class="dg-prompts">'+(q.prompts||q.points.map(p=>p.label)).map(p=>'<li>'+esc(p)+'</li>').join("")+'</ol>':"")+
      '<div class="vc-chat"><div class="vc-area"></div><div class="vc-foot"></div></div>',el=>{
      setTimeout(()=>{const f=el.querySelector(".vc-foot");if(f)f.scrollIntoView({block:"end",behavior:reduced()?"auto":"smooth"})},120);
      D.capture(el.querySelector(".vc-area"),{foot:el.querySelector(".vc-foot"),next:"Compare with the strong answer",onDone:()=>{
        el.querySelector(".vc-foot").innerHTML="";
        k.say("Here’s the strong answer again. Did you cover each area in order, and say why?");
        k.widget('<div class="dg-model"><p>'+esc(q.model)+'</p><div class="dg-chips">'+q.points.map(p=>'<span>'+esc(p.label)+'</span>').join("")+'</div></div>');
        if(n===2)k.replies([{label:"Stage 3: no prompts",primary:true,run:()=>stage(q,3)},{label:"Try stage 2 again",run:()=>stage(q,2)}]);
        else k.replies([{label:"Try a graded discussion",primary:true,run:()=>discuss(1)},{label:"Another question",run:guide},{label:"Back to EPA mocks",run:epaMenu},{label:"Something else",run:()=>{epaMode(false);k.somethingElse()}}]);
      }});
    });
  }



  /* EPA mode ends when the chat closes. */
  const mr=document.getElementById("modal-root");
  if(mr)new MutationObserver(()=>{if(!mr.querySelector(".chat-sheet"))epaMode(false)}).observe(mr,{childList:true});
  window.eviaCoachFlows={hours:logHours,confidence,upskill,task:upskillTask,evidence,evidenceCheck,quickReview,prepare,targets,targetDo,epa,epaMode,openUnitAt};
})();
