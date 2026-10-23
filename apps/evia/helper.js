/* Evia7 helper: Evia does jobs for the learner instead of showing another screen of information.
   Tapping Evia shows one sentence, the single most useful thing right now with one button (or "you're on track"),
   and four big buttons for the jobs she does:
     Add evidence  pick any topic and go straight to its photos
     Log hours     her hours chat
     Ask me        type a question: site calculations, tools, materials, site terms, KSBs (evia-brain.js)
     Practise      a quick quiz, maths or English, or a Teach me lesson
   Stats, targets and the rest live on their own pages. Also here: the check-in pop-up when the app opens while the
   learner's class is on.
   window.eviaHelper: show(), top(), askCheckIn(). */
(function(){
  const K=()=>window.eviaChatKit,C=()=>window.eviaCoachFlows||{};
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const leave=f=>()=>{K().closeChat();setTimeout(f,120)};
  const nvq=()=>!!(window.eviaNvq&&window.eviaNvq.on());
  const SVG=p=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';
  const IC={
    evidence:SVG('<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5Z"/><circle cx="12" cy="13" r="3.5"/>'),
    hours:SVG('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    ask:SVG('<path d="M20 12.2c0 4-3.6 7.1-8 7.1-1.1 0-2.2-.2-3.1-.6L4 20l1.3-3.7A6.6 6.6 0 0 1 4 12.2C4 8.3 7.6 5 12 5s8 3.3 8 7.2Z"/><path d="M10 10.2a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9v.4M12 15.6h.01"/>'),
    practise:SVG('<path d="M9 4.5h6a1 1 0 0 1 1 1V7H8V5.5a1 1 0 0 1 1-1Z"/><path d="M8 5.5H6.5A1.5 1.5 0 0 0 5 7v12.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V7a1.5 1.5 0 0 0-1.5-1.5H16"/><path d="m8.5 13.5 2.3 2.3 4.7-4.8"/>')
  };

  /* ---------- The one thing ---------- */
  /* From Evia's list (evia-todo.js), only what really matters; "Strengthen…", backups and the like don't make it. */
  const WORTH=new Set(["checkin","assessor","message","evidence","target","review","draft","hours"]);
  function top(){
    const items=(window.eviaTodo?window.eviaTodo.list():[]).filter(x=>WORTH.has(x.ic)&&x.u>=45);
    return items[0]||null;
  }

  /* ---------- The jobs ---------- */
  function addEvidence(){
    const k=K();k.userSays("Add evidence");
    let units=[];try{units=window.eviaStats.compute().a.units}catch(_){}
    if(!units.length)return leave(()=>nav("course"))();
    k.say("Which topic is it for? Any job you’ve done counts.");
    /* Topics already started first: that's where most evidence goes. */
    const list=units.slice().sort((a,b)=>(b.started?1:0)-(a.started?1:0));
    k.widget('<div class="hp-topics">'+list.map((u,i)=>'<button type="button" data-u="'+i+'"><span>'+esc(u.name)+'</span>'+(u.started?'<small>Started</small>':'')+'</button>').join("")+'</div>',el=>{
      el.querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>{const u=list[+b.dataset.u];k.userSays(u.name);
        if(C().openUnitAt)C().openUnitAt(u,"#evidence-photos");else k.openUnitFromChat(u)});
    });
    k.replies([{label:"Back",back:true,run:()=>show()}]);
  }
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

  function show(){
    document.body.classList.remove("evia-epa");
    const k=K();if(!k)return;
    const name=k.firstName?k.firstName():"",h=new Date().getHours(),hello=(h<12?"Morning":h<18?"Afternoon":"Evening")+(name?" "+esc(name):"")+".";
    const t=top();
    if(window.eviaMood)window.eviaMood(t&&t.u>=85?"think":"happy");
    if(t){
      k.say(hello+" "+esc(t.title)+(t.detail?". <span class=\"hp-detail\">"+esc(t.detail)+"</span>":""));
      k.widget('<button type="button" class="primary hp-one">'+esc(t.label)+'</button>',el=>{el.querySelector("button").onclick=()=>t.ic==="evidence"?addEvidence():t.run()});
    }else k.say(hello+" You’re on track. What can I help with?");
    k.widget('<div class="hp-jobs">'+[["evidence","Add evidence","Photos for any topic"],["hours","Log hours","Takes 30 seconds"],["ask","Ask me","Sums, tools, terms"],["practise","Practise","A quick quiz"]]
      .map(([id,l,s])=>'<button type="button" data-job="'+id+'"><span class="hp-ic">'+IC[id]+'</span><strong>'+l+'</strong><small>'+s+'</small></button>').join("")+'</div>',el=>{
      const go={evidence:addEvidence,hours:logHours,ask,practise};
      el.querySelectorAll("[data-job]").forEach(b=>b.onclick=()=>go[b.dataset.job]());
    });
    k.replies([{label:"More",run:more}]);
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

  window.eviaHelper={show,top,askCheckIn};
})();
