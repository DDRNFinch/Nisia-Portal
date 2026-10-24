/* Evia7 helper: Evia turns the learner's day at work into their portfolio. Tapping Evia asks "How was today?" and
   shows their topics as the jobs they might have done (typing a few words finds the topic too). Then, all in her chat:
   photos of it (camera or the phone's pictures), what they did in a few words, which of the topic's key points it
   involved (tap any), what they did to work safely (tap any), and a write-up built only from those answers, in their
   own words, which they can change before saving it to the topic with its KSBs. Then an offer to log learning hours.
   No AI: nothing is made up, so it works offline and the assessor sees what the learner said.
   Ask me (sums, tools, terms) and Practise sit underneath as extras; More holds the review, targets and the rest.
   Also here: the check-in pop-up when the app opens while the learner's class is on.
   window.eviaHelper: show(), today(unitIndex), top(), askCheckIn(), writeUp(answers). */
(function(){
  const K=()=>window.eviaChatKit,C=()=>window.eviaCoachFlows||{};
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const leave=f=>()=>{K().closeChat();setTimeout(f,120)};
  const nvq=()=>!!(window.eviaNvq&&window.eviaNvq.on());
  /* ---------- The one thing ---------- */
  /* From Evia's list (evia-todo.js), only what really matters; "Strengthen…", backups and the like don't make it. */
  const WORTH=new Set(["checkin","assessor","message","evidence","target","review","draft","hours"]);
  function top(){
    let items=[];
    try{items=(window.eviaTodo?window.eviaTodo.list():[]).filter(x=>x&&WORTH.has(x.ic)&&x.u>=45)}
    catch(e){if(window.eviaErrors)window.eviaErrors.log(e.message,{where:"helper.top",stack:e.stack})}
    return items[0]||null;
  }

  /* ---------- The jobs ---------- */
  function logHours(){K().userSays("Log hours");C().hours&&C().hours()}
  function ask(){
    const k=K();k.userSays("Ask me");
    k.say("Ask me anything about the job: “bricks for a 4m by 1.2m wall”, “what’s a bolster?”, “stairs for 2.6m”, or a KSB like “S9”.");
    askBox();
    k.replies([window.eviaBrain&&{label:"Calculators",run:()=>{k.userSays("Calculators");window.eviaBrain.calculators()}},{label:"Back",back:true,run:()=>show()}].filter(Boolean));
  }
  /* The question box sits under Evia's latest answer, ready for the next one. */
  function askBox(){
    const k=K();
    k.widget('<form class="hp-ask"><input name="q" autocomplete="off" enterkeyhint="send" placeholder="Type your question" aria-label="Your question"><button type="submit" class="primary">Ask</button></form>',el=>{
      const f=el.querySelector("form");setTimeout(()=>f.q.focus(),80);
      f.onsubmit=e=>{e.preventDefault();const q=f.q.value.trim();if(!q)return f.q.focus();f.remove();k.userSays(q);
        try{window.eviaBrain.answer(q)}catch(_){k.say("I couldn’t work that one out. Try asking it another way.")}
        askBox()};
    });
  }
  function practise(){
    const k=K(),p=(()=>{try{return window.eviaData.learner()||{}}catch(_){return {}}})();k.userSays("Practise");
    k.say("Quick one? Each takes a couple of minutes.");
    k.replies([
      window.eviaStartTest&&{label:nvq()?"Quick quiz":"EPA quick quiz",primary:true,run:()=>window.eviaStartTest("epa",5,nvq()?"Quick quiz":"EPA quick quiz")},
      p.mathsEnabled&&window.eviaStartTest&&{label:"Maths",run:()=>window.eviaStartTest("maths",5,"Maths test")},
      p.englishEnabled&&window.eviaStartTest&&{label:"English",run:()=>window.eviaStartTest("english",5,"English test")},
      window.eviaTeach&&{label:"A Teach me lesson",run:leave(()=>nav("teach"))},
      {label:"Back",back:true,run:()=>show()}].filter(Boolean));
  }
  function more(){
    const k=K(),N=window.eviaNisia,live=N&&N.joined&&N.joined()&&N.joined().live;k.userSays("More");
    k.say("What would you like?");
    k.replies([k.reviewFromMenu&&{label:"My review",run:()=>k.reviewFromMenu()},
      C().targets&&{label:"My targets",run:()=>C().targets()},
      C().confidence&&{label:"Confidence check",run:()=>{k.userSays("Confidence check");C().confidence()}},
      live&&window.eviaTodo&&window.eviaTodo.away&&{label:"Can’t make college?",run:()=>window.eviaTodo.away()},
      {label:"Back",back:true,run:()=>show()}].filter(Boolean));
  }

  /* ---------- Today at work → evidence ---------- */
  const units=()=>{try{return window.eviaStats.compute().a.units}catch(_){return []}};
  const unitKsbs=u=>{try{return (data().u[u.index][1]||[]).map(x=>String(x).split("|")[0])}catch(_){return []}};
  const points=u=>{try{const p=((window.eviaLearnerPrompts||{})[course]||{})[u.name];return p&&p.writeup?p.writeup.split("·").map(x=>x.trim()).filter(x=>x&&!/^(health|safety|wellbeing|teamwork)$/i.test(x)).slice(0,10):[]}catch(_){return []}};
  const SAFE=[["ppe","Wore my PPE"],["ra","Read the risk assessment"],["tidy","Kept the area tidy"],["tools","Checked my tools first"],["help","Worked with my supervisor"]];
  const SAFE_TEXT={ppe:"wore the right PPE",ra:"read the risk assessment and method statement",tidy:"kept the work area clean and tidy",tools:"checked my tools were safe before using them",help:"worked alongside my supervisor"};
  const list=a=>a.length<2?a.join(""):a.slice(0,-1).join(", ")+" and "+a[a.length-1];
  const sentence=t=>{t=String(t||"").trim().replace(/\s+/g," ");if(!t)return "";t=t.charAt(0).toUpperCase()+t.slice(1);return /[.!?]$/.test(t)?t:t+"."};
  /* The write-up, only from what the learner said and tapped. */
  function writeUp(a){
    const out=[];
    out.push("Today I worked on "+a.topic.toLowerCase()+".");
    if(a.did)out.push(sentence(a.did));
    if(a.points&&a.points.length)out.push("The job involved "+list(a.points.map(x=>x.toLowerCase()))+".");
    if(a.safe&&a.safe.length)out.push("To work safely I "+list(a.safe.map(k=>SAFE_TEXT[k]).filter(Boolean))+".");
    return out.join(" ");
  }
  /* Tap-to-pick chips, then Next. */
  function chips(opts,next,nextLabel){
    const k=K();
    k.widget('<div class="hp-pick">'+opts.map(([id,l],i)=>'<button type="button" class="hp-chip" data-i="'+i+'" aria-pressed="false">'+esc(l)+'</button>').join("")+'</div><button type="button" class="primary hp-next">'+esc(nextLabel||"Next")+'</button>',el=>{
      el.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>b.setAttribute("aria-pressed",b.getAttribute("aria-pressed")==="true"?"false":"true"));
      el.querySelector(".hp-next").onclick=()=>{const got=[...el.querySelectorAll('[aria-pressed="true"]')].map(b=>opts[+b.dataset.i]);
        el.querySelectorAll("button").forEach(b=>b.disabled=true);k.userSays(got.length?got.map(x=>x[1]).join(", "):"None of these");next(got.map(x=>x[0]))};
    });
  }
  function today(i){
    const k=K(),u=units().find(x=>x.index===i);if(!u)return show();
    const a={u,topic:u.name,photos:[],did:"",points:[],safe:[]},ks=unitKsbs(u),word=nvq()?"criteria":"KSBs";
    k.userSays(u.name);
    k.say("Nice. That counts towards <strong>"+esc(u.name)+"</strong>"+(ks.length?" and covers "+esc(ks.slice(0,5).join(", "))+(ks.length>5?" and "+(ks.length-5)+" more":"")+".":"."));
    k.say("Got any photos of it?");
    photoStep(a);
  }
  function photoStep(a){
    const k=K();
    k.widget('<div class="hp-photos"><div class="hp-thumbs"></div><div class="hp-row"><button type="button" class="primary" data-cam>Take photos</button><button type="button" class="secondary" data-pick>From my phone</button></div><button type="button" class="hp-skip" data-none>No photos</button><input type="file" accept="image/*" multiple hidden></div>',el=>{
      const thumbs=el.querySelector(".hp-thumbs"),input=el.querySelector("input"),done=el.querySelector("[data-none]");
      const add=async files=>{
        for(const f of files.filter(x=>x&&x.size>0)){
          try{const blob=window.eviaShrinkPhoto?await window.eviaShrinkPhoto(f):f,id=await window.eviaStoreEvidencePhoto(blob);
            a.photos.push({id,takenAt:f.eviaTakenAt||f.lastModified||Date.now()});
            const img=document.createElement("img");img.alt="";img.src=URL.createObjectURL(blob);thumbs.appendChild(img)}catch(err){console.warn("Evia chat photo",err)}
        }
        if(a.photos.length){done.textContent="Next";done.className="primary hp-next";el.querySelector("[data-cam]").textContent="Add more";el.querySelector("[data-cam]").className="secondary"}
      };
      el.querySelector("[data-cam]").onclick=()=>{
        if(window.eviaCamera&&window.eviaCamera.supported())window.eviaCamera.open({title:a.topic,prompts:points(a.u).slice(0,4),onShot:f=>add([f]),onDone:files=>add(files||[])});
        else{input.setAttribute("capture","environment");input.click()}};
      el.querySelector("[data-pick]").onclick=()=>{input.removeAttribute("capture");input.click()};
      input.onchange=()=>{add([...input.files]);input.value=""};
      done.onclick=()=>{el.querySelectorAll("button").forEach(b=>b.disabled=true);k.userSays(a.photos.length?(a.photos.length===1?"1 photo":a.photos.length+" photos"):"No photos");didStep(a)};
    });
  }
  function didStep(a){
    const k=K();
    k.say("What did you do? A few words is fine.");
    k.widget('<form class="hp-did"><textarea name="t" rows="3" maxlength="1500" placeholder="e.g. built the inner leaf up to DPC with my supervisor" aria-label="What you did"></textarea><button type="submit" class="primary">Next</button></form>',el=>{
      const f=el.querySelector("form");setTimeout(()=>f.t.focus(),80);
      f.onsubmit=e=>{e.preventDefault();a.did=f.t.value.trim();if(!a.did&&!a.photos.length){f.t.focus();return}
        f.querySelectorAll("textarea,button").forEach(x=>x.disabled=true);k.userSays(a.did||"Skip");pointStep(a)};
    });
  }
  function pointStep(a){
    const k=K(),P=points(a.u);
    if(!P.length)return safeStep(a);
    k.say("Did it involve any of these? Tap any that did. Assessors look for them.");
    chips(P.map(x=>[x,x]),got=>{a.points=got;safeStep(a)});
  }
  function safeStep(a){
    K().say("And how did you work safely?");
    chips(SAFE,got=>{a.safe=got;reviewStep(a)});
  }
  function reviewStep(a){
    const k=K();
    k.say("Here’s your write-up, from what you told me. Change anything you like.");
    k.widget('<form class="hp-write"><textarea name="t" rows="6" maxlength="4000" aria-label="Your write-up">'+esc(writeUp(a))+'</textarea>'+(a.photos.length?'<small>'+(a.photos.length===1?"1 photo":a.photos.length+" photos")+' · '+esc(a.topic)+'</small>':'<small>'+esc(a.topic)+'</small>')+'<button type="submit" class="primary">Save to my portfolio</button></form>',el=>{
      const f=el.querySelector("form");
      f.onsubmit=e=>{e.preventDefault();const text=f.t.value.trim();if(!text){f.t.focus();return}
        f.querySelectorAll("textarea,button").forEach(x=>x.disabled=true);save(a,text)};
    });
  }
  function save(a,text){
    const k=K(),id=Date.now()+"-"+Math.random().toString(36).slice(2,8);
    try{
      window.eviaData.put("evidence",{id,course,unit:a.topic,text,ksbs:unitKsbs(a.u),photoIds:a.photos.map(p=>p.id),media:[],photoTakenAt:a.photos.map(p=>p.takenAt||null),guidedAreas:[]});
    }catch(err){k.say("I couldn’t save that just now. Try again in a moment.");return}
    if(window.eviaMood)window.eviaMood("happy");
    const n=unitKsbs(a.u).length,N=window.eviaNisia,live=N&&N.joined&&N.joined()&&N.joined().live;
    k.say("Saved to <strong>"+esc(a.topic)+"</strong> ✓"+(n?" It covers "+n+" "+(nvq()?"criteria":"KSBs")+".":"")+(live?" Your assessor will see it.":""));
    k.say("Was any of today training or learning, like a toolbox talk or being shown something new? I can log it as learning hours.");
    k.replies([{label:"Log learning hours",primary:true,run:()=>{k.userSays("Log learning hours");C().hours&&C().hours()}},{label:"Not today",run:()=>{k.userSays("Not today");k.say("Nice work today. See you tomorrow.")}}]);
  }
  /* Typed: find the topic from the words. */
  function findTopics(q){
    const words=String(q||"").toLowerCase().match(/[a-z]{3,}/g)||[];if(!words.length)return [];
    const pr=(window.eviaLearnerPrompts||{})[course]||{};
    return units().map(u=>{const hay=(u.name+" "+((pr[u.name]||{}).writeup||"")+" "+((pr[u.name]||{}).photos||"")).toLowerCase();
      return {u,score:words.reduce((n,w)=>n+(hay.includes(w.replace(/(ing|ed|s)$/,""))?(u.name.toLowerCase().includes(w.replace(/(ing|ed|s)$/,""))?3:1):0),0)}}).filter(x=>x.score>0).sort((x,y)=>y.score-x.score).slice(0,3).map(x=>x.u);
  }
  function other(){
    const k=K();k.userSays("Something else");
    k.say("What was it? A few words, like “fitted a lintel” or “pointing”.");
    k.widget('<form class="hp-ask"><input name="q" autocomplete="off" enterkeyhint="go" placeholder="What you worked on" aria-label="What you worked on"><button type="submit" class="primary">Find it</button></form>',el=>{
      const f=el.querySelector("form");setTimeout(()=>f.q.focus(),80);
      f.onsubmit=e=>{e.preventDefault();const q=f.q.value.trim();if(!q)return f.q.focus();f.querySelectorAll("input,button").forEach(x=>x.disabled=true);k.userSays(q);
        const hits=findTopics(q);
        if(hits.length){k.say(hits.length===1?"That sounds like this one:":"Which of these is it?");k.replies(hits.map((u,i)=>({label:u.name,primary:!i,run:()=>today(u.index)})).concat([{label:"None of these",back:true,run:allTopics}]))}
        else{k.say("I couldn’t match that. Pick the nearest topic:");allTopics(true)}};
    });
  }
  function allTopics(quiet){
    const k=K(),list=units();if(quiet!==true)k.userSays("Show all topics");
    k.widget('<div class="hp-topics">'+list.map(u=>'<button type="button" data-u="'+u.index+'"><span>'+esc(u.name)+'</span></button>').join("")+'</div>',el=>{
      el.querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>{el.querySelectorAll("button").forEach(x=>x.disabled=true);today(+b.dataset.u)});
    });
    k.replies([{label:"Back",back:true,run:()=>show()}]);
  }

  function show(){
    document.body.classList.remove("evia-epa");
    const k=K();if(!k)return;
    let name="";try{name=k.firstName?k.firstName():""}catch(_){}
    const h=new Date().getHours(),hello=(h<12?"Morning":h<18?"Afternoon":"Evening")+(name?" "+esc(name):"");
    /* Only what can't wait goes first (an assessor's request, a message, the review): one line, one button. */
    const t=top(),urgent=t&&["assessor","message","review"].includes(t.ic)&&t.u>=85?t:null;
    if(window.eviaMood)window.eviaMood("happy");
    if(urgent){k.say(esc(urgent.title)+(urgent.detail?". <span class=\"hp-detail\">"+esc(urgent.detail)+"</span>":""));
      k.widget('<button type="button" class="secondary hp-one">'+esc(urgent.label)+'</button>',el=>{el.querySelector("button").onclick=()=>urgent.run()})}
    k.say(hello+". "+(h<12?"What are you working on today?":"How was today? What did you work on?"));
    /* The topics as the jobs they might have done, as chips: the ones started first. */
    const list=units().slice().sort((x,y)=>(y.started?1:0)-(x.started?1:0)),first=list.slice(0,8);
    const chip=u=>'<button type="button" class="hp-chip hp-job" data-u="'+u.index+'">'+esc(u.name)+'</button>';
    k.widget('<div class="hp-pick hp-jobs-pick">'+first.map(chip).join("")+(list.length>8?'<button type="button" class="hp-chip hp-more" data-all>More…</button>':'')+'<button type="button" class="hp-chip hp-more" data-other>Something else</button></div>'+
      '<div class="hp-extras"><button type="button" data-x="hours">Log hours</button><button type="button" data-x="ask">Ask me</button><button type="button" data-x="practise">Practise</button><button type="button" data-x="more">Other things</button></div>',el=>{
      const off=()=>el.querySelectorAll(".hp-pick button").forEach(x=>x.disabled=true);
      const bind=()=>el.querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>{off();today(+b.dataset.u)});bind();
      const all=el.querySelector("[data-all]");if(all)all.onclick=()=>{all.insertAdjacentHTML("beforebegin",list.slice(8).map(chip).join(""));all.remove();bind();k.scrollChat&&k.scrollChat()};
      el.querySelector("[data-other]").onclick=()=>{off();other()};
      const go={hours:logHours,ask,practise,more};
      el.querySelectorAll("[data-x]").forEach(b=>b.onclick=()=>go[b.dataset.x]());
    });
  }

  /* ---------- Check in: a pop-up when the app opens while the class is on ---------- */
  const ASKED="evia7-checkin-asked";
  function askCheckIn(){
    const N=window.eviaNisia,e=N&&N.joined&&N.joined();
    if(!e||!e.live||!N.classNow||!window.eviaCheckIn||document.getElementById("hp-checkin"))return;
    if(document.body.classList.contains("evia-onboarding"))return;
    const c=N.classNow();if(!c)return;
    let asked={};try{asked=JSON.parse(sessionStorage.getItem(ASKED)||"{}")}catch(_){}
    if(asked[c.id])return;
    asked[c.id]=1;try{sessionStorage.setItem(ASKED,JSON.stringify(asked))}catch(_){}
    const st=Date.parse(c.starts_at),time=new Date(st).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
    const el=document.createElement("div");el.id="hp-checkin";el.className="hp-pop";el.setAttribute("role","dialog");el.setAttribute("aria-label","Check in to "+(c.class||"class"));
    el.innerHTML='<div class="hp-pop-card"><span class="hp-pop-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5z"/></svg></span>'+
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

  window.eviaHelper={show,today,top,askCheckIn,writeUp};
})();
