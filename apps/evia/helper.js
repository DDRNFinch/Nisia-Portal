/* Evia7 coach: Evia is the learner's vocational coach. The other tabs are the portfolio and the tracking; she keeps
   them on course between visits, the way a coach does.
   - A weekly catch-up (about 3 minutes, she asks for it): how last week's goal went (measured, not asked), how
     they're doing (one tap; "not great" asks what about, offers to tell their tutor, and gives support contacts), how
     the course is going in one plain sentence, and one small goal for the week, picked by them from her suggestions.
     Then anything from the week to add: evidence or learning hours.
   - Four ways in whenever they need her: I've done a job (their day at work into evidence: photos, a few words, key
     points, safety, a write-up from their own words saved to the topic with its KSBs), I'm stuck, Something's not
     right (worries and safeguarding: support contacts, and their tutor told if they choose), and Ask me (sums, tools,
     terms). Log hours, Practise and Other things sit underneath.
   No AI: every conversation is written, so it's consistent, works offline and the college can trust it.
   Kept in "evia7-coach": {checkins: [{week, at, mood, about, told, goal: {kind, n, title, at, base}}]}.
   Also here: the check-in pop-up when the app opens while the learner's class is on.
   window.eviaHelper: show(), catchUp(), today(unitIndex), job(), stuck(), notRight(), top(), askCheckIn(), writeUp(a),
   goalProgress(goal). */
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
      window.eviaFuture&&{label:"My future",run:()=>{k.closeChat();setTimeout(()=>window.eviaFuture.open(),120)}},
      {label:"Back",back:true,run:()=>show()}].filter(Boolean));
  }


  /* ---------- The coach: weekly catch-up ---------- */
  const CKEY="evia7-coach",DAY=864e5;
  const readC=()=>{try{const v=JSON.parse(localStorage.getItem(CKEY)||"null");return Object.assign({checkins:[]},v||{})}catch(_){return {checkins:[]}}};
  const writeC=v=>{try{localStorage.setItem(CKEY,JSON.stringify(v))}catch(_){}};
  const weekOf=t=>{const d=new Date(t==null?Date.now():t);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
  const thisWeek=()=>readC().checkins.find(c=>c.week===weekOf());
  const lastCheckin=()=>readC().checkins.filter(c=>c.week!==weekOf()).slice(-1)[0]||null;
  const when=x=>Number(x)||Date.parse(x||"")||0;
  const stats=()=>{try{return window.eviaStats.compute()}catch(_){return null}};
  const hm=h=>window.eviaHM?window.eviaHM(h):Math.round(h*10)/10+"h";
  const lessonsDone=()=>{try{return window.eviaTeach.report().done||0}catch(_){return 0}};
  const ev=()=>typeof evidence!=="undefined"&&Array.isArray(evidence)?evidence.filter(e=>e&&e.c===course):[];
  function aimPerWeek(){
    try{const en=window.eviaData.enrolment&&window.eviaData.enrolment(),p=window.eviaData.learner()||{},a=Date.parse((en&&en.start)||p.start||""),b=Date.parse((en&&en.end)||p.end||""),pl=Number(en&&en.plannedOtjHours);
      if(pl>0&&b>a)return Math.max(1,Math.round(pl/((b-a)/(7*DAY))))}catch(_){}
    return 6;
  }
  /* A goal measures itself from what the learner does in the app. */
  const GOALS={
    evidence:{title:n=>n===1?"Add 1 piece of evidence":"Add "+n+" pieces of evidence",measure:g=>ev().filter(e=>when(e.savedAt)>=g.at).length},
    hours:{title:n=>"Log "+n+" hours of learning",measure:g=>Math.round(window.eviaData.list("hours").filter(h=>when(h.createdAt)>=g.at).reduce((s,h)=>s+(Number(h.minutes)||0),0)/60*10)/10},
    lessons:{title:n=>n===1?"Do 1 Teach me lesson":"Do "+n+" Teach me lessons",measure:g=>Math.max(0,lessonsDone()-(g.base||0))},
    quiz:{title:()=>"Do a quick quiz",n:1,measure:g=>window.eviaData.list("tests").filter(t=>t&&when(t.takenAt)>=g.at).length},
    topic:{title:()=>"Start a new topic",n:1,measure:g=>{const S=stats();return S?Math.max(0,S.a.units.filter(u=>u.started).length-(g.base||0)):0}}
  };
  function goalProgress(g){if(!g||!GOALS[g.kind])return null;const v=GOALS[g.kind].measure(g);return {v,done:v>=g.n}}
  /* Three goals to pick from: what helps most first. */
  function goalOptions(){
    const S=stats(),aim=aimPerWeek(),out=[];if(!S)return [];
    const behind=S.a.timePct!=null&&S.a.timePct-S.a.ksbPct>10;
    out.push({kind:"evidence",n:behind?2:1});
    out.push({kind:"hours",n:Math.max(1,Math.round(aim-Math.min(aim,S.otjWeek||0))||aim)});
    if(S.unitsLeft>0&&behind)out.push({kind:"topic",n:1,base:S.a.units.filter(u=>u.started).length});
    if(window.eviaTeach)out.push({kind:"lessons",n:2,base:lessonsDone()});
    out.push({kind:"quiz",n:1});
    return out.slice(0,3).map(g=>Object.assign(g,{title:GOALS[g.kind].title(g.n)}));
  }
  /* How the course is going, in one plain sentence. */
  function howItsGoing(){
    const S=stats();if(!S)return "";
    const a=S.a,word=nvq()?"criteria":"KSBs";
    if(a.timePct==null)return "Add your course dates in your profile and I’ll tell you how you’re doing against them.";
    const want=Math.round(a.total*a.timePct/100),have=Math.max(a.met,0),gap=want-have;
    const claimed=a.possible&&a.possible.size?a.possible.size:0;
    if(gap<=0)return "You’re on track: "+have+" of "+a.total+" "+word+" done, and you’re "+a.timePct+"% of the way through the course.";
    /* How much evidence would catch them up by the end: each piece covers about one topic's share of the KSBs. */
    const weeks=S.weeksLeft||0,perPiece=Math.max(1,a.total/Math.max(1,a.units.length)),pieces=Math.ceil(gap/perPiece),rate=weeks?pieces/weeks:0;
    const pace=!weeks?"":rate>=1?" About "+Math.ceil(rate)+" pieces of evidence a week would catch you up by the end.":" One piece of evidence every "+Math.max(1,Math.floor(1/rate))+" weeks would catch you up by the end.";
    return "You’re "+gap+" "+word+" behind where you’d want to be ("+have+" of "+a.total+" done, "+a.timePct+"% of the way through)."+(claimed?" "+claimed+" more are waiting for your assessor to check.":"")+pace;
  }
  /* Let the tutor know the learner would like to talk (they choose). Connected: a message in Evia's messages. */
  async function tellTutor(about){
    const N=window.eviaNisia,live=N&&N.joined&&N.joined()&&N.joined().live;
    if(!live||!N.call)return false;
    try{
      const people=(await N.call("msg_contacts",{}))||[],t=people.find(x=>x.role==="tutor")||people.find(x=>x.role==="assessor");
      if(!t)return false;
      await N.call("msg_send",{p_with:t.member_id,p_body:"Hi, I’d like a chat when you have a minute"+(about?" (it’s about "+about.toLowerCase()+")":"")+". Sent from my catch-up with Evia."});
      return t.name||"your tutor";
    }catch(_){return false}
  }
  const HELP='<div class="hp-help"><strong>Help any time</strong><span>Your tutor and the college safeguarding team are there for you.</span><span><b>Samaritans</b> 116 123 · free, any time</span><span><b>Lighthouse construction helpline</b> 0345 605 1956 · any time</span><span>In danger right now? Call <b>999</b>.</span></div>';
  function offerTutor(about,then){
    const k=K();
    k.say("Would you like me to let your tutor know you’d like a chat? I’ll just say you’d like to talk.");
    k.replies([{label:"Yes, tell my tutor",primary:true,run:async()=>{k.userSays("Yes, tell my tutor");const who=await tellTutor(about);
        k.say(who?"Done. I’ve messaged "+esc(who)+". They’ll get back to you.":"I can’t message them from here, so please tell your tutor or assessor next time you see them, or ring the college.");
        k.widget(HELP);then&&then(!!who)}},
      {label:"No thanks",run:()=>{k.userSays("No thanks");k.say("That’s fine. If you change your mind, I’m here.");k.widget(HELP);then&&then(false)}}]);
  }
  function catchUp(){
    const k=K(),last=lastCheckin(),a={week:weekOf(),at:Date.now(),mood:null,about:null,told:false,goal:null};
    k.userSays("Start our catch-up");
    if(window.eviaMood)window.eviaMood("happy");
    /* 1. Last week's goal, measured. */
    if(last&&last.goal){const p=goalProgress(last.goal);
      /* How it went is kept with last week's catch-up, so Milos sees it too. */
      if(p&&!last.goalResult)try{window.eviaData.put("checkins",{week:last.week,goalResult:{got:p.v,done:p.done}})}catch(_){}
      k.say(p&&p.done?"Last time you said you’d <strong>"+esc(last.goal.title.toLowerCase())+"</strong>. You did it ✓ Nice one.":"Last time you said you’d <strong>"+esc(last.goal.title.toLowerCase())+"</strong>. "+(p&&p.v>0?"You got part of the way.":"It didn’t happen, and that’s OK.")+" Let’s see what works this week.")}
    /* 2. How they're doing. */
    k.say("First, how are you doing at the moment?");
    k.replies([["good","Good"],["ok","OK"],["low","Not great"]].map(([id,l],i)=>({label:l,primary:!i,run:()=>{k.userSays(l);a.mood=id;
      if(id!=="low"){k.say(id==="good"?"Good to hear.":"Fair enough. Thanks for being honest.");return progress(a)}
      k.say("Sorry to hear that. What’s it mostly about?");
      k.replies([["Work"],["College"],["Home"],["Health"],["Rather not say"]].map(([x])=>({label:x,run:()=>{k.userSays(x);a.about=x;
        offerTutor(x==="Rather not say"?"":x,told=>{a.told=told;progress(a)})}})));
    }})));
  }
  function progress(a){
    const k=K(),line=howItsGoing();
    if(line)k.say(line);
    k.say("What will you aim for this week? Pick one.");
    const opts=goalOptions();
    k.replies(opts.map((g,i)=>({label:g.title,primary:!i,run:()=>{k.userSays(g.title);a.goal=Object.assign({},g,{at:Date.now()});finish(a)}}))
      .concat([{label:"Not this week",run:()=>{k.userSays("Not this week");finish(a)}}]));
  }
  function finish(a){
    const k=K();try{window.eviaData.put("checkins",a)}catch(_){const c=readC();c.checkins=c.checkins.filter(x=>x.week!==a.week).concat([a]).slice(-60);writeC(c)}
    if(window.eviaMood)window.eviaMood("happy");
    k.say((a.goal?"Great. I’ll check how you got on next week. ":"No problem. ")+"That’s our catch-up done ✓");
    k.say("Anything from this week to add while we’re here?");
    k.replies([{label:"Add evidence",primary:true,run:()=>job()},{label:"Log hours",run:logHours},{label:"All done",run:()=>{k.userSays("All done");k.say("Nice work. Speak next week.")}}]);
  }

  /* ---------- The four ways in ---------- */
  function job(){
    const k=K();k.userSays("I’ve done a job");
    k.say("Nice. What did you work on?");
    pickTopic();
  }
  function pickTopic(){
    const k=K(),list=units().slice().sort((x,y)=>(y.started?1:0)-(x.started?1:0)),first=list.slice(0,8);
    const chip=u=>'<button type="button" class="hp-chip hp-job" data-u="'+u.index+'">'+esc(u.name)+'</button>';
    k.widget('<div class="hp-pick hp-jobs-pick">'+first.map(chip).join("")+(list.length>8?'<button type="button" class="hp-chip hp-more" data-all>More…</button>':'')+'<button type="button" class="hp-chip hp-more" data-other>Something else</button></div>',el=>{
      const off=()=>el.querySelectorAll("button").forEach(x=>x.disabled=true);
      const bind=()=>el.querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>{off();today(+b.dataset.u)});bind();
      const all=el.querySelector("[data-all]");if(all)all.onclick=()=>{all.insertAdjacentHTML("beforebegin",list.slice(8).map(chip).join(""));all.remove();bind();k.scrollChat&&k.scrollChat()};
      el.querySelector("[data-other]").onclick=()=>{off();other()};
    });
    k.replies([{label:"Back",back:true,run:()=>show()}]);
  }
  function stuck(){
    const k=K();k.userSays("I’m stuck");
    k.say("No problem, that’s what I’m here for. What with?");
    k.replies([
      {label:"Writing up my evidence",run:()=>{k.userSays("Writing up my evidence");k.say("Easy fix: tell me what you did and I’ll build the write-up from your answers.");k.replies([{label:"Let’s do it",primary:true,run:()=>job()},{label:"Back",back:true,run:()=>show()}])}},
      {label:"A topic I don’t get",run:()=>{k.userSays("A topic I don’t get");k.say("Teach me goes through each topic in short lessons with pictures. Start with the one you’re stuck on.");k.replies([{label:"Open Teach me",primary:true,run:leave(()=>nav("teach"))},{label:"Ask me a question",run:ask},{label:"Back",back:true,run:()=>show()}])}},
      {label:"Maths or English",run:()=>{k.userSays("Maths or English");k.say("Little and often works best. Try 5 questions with worked answers.");
        k.replies([window.eviaStartTest&&{label:"Maths",primary:true,run:()=>window.eviaStartTest("maths",5,"Maths test")},window.eviaStartTest&&{label:"English",run:()=>window.eviaStartTest("english",5,"English test")},{label:"Back",back:true,run:()=>show()}].filter(Boolean))}},
      {label:"Something at work",run:()=>{k.userSays("Something at work");k.say("Your supervisor is the best person to ask on site. If it’s bigger than that, your tutor can help.");offerTutor("something at work")}},
      {label:"Back",back:true,run:()=>show()}]);
  }
  function notRight(){
    const k=K();k.userSays("Something’s not right");
    if(window.eviaMood)window.eviaMood("think");
    k.say("I’m glad you said. What’s it about?");
    const ABOUT=[["Feeling unsafe at work","Nobody should feel unsafe at work. Stop and tell your supervisor if it’s happening now."],["Being treated badly","That’s not OK, and it’s not your fault."],["Pay or hours aren’t right","Your apprenticeship has rules about pay and training time. Your tutor can help sort it."],["Struggling with how I feel","Thanks for telling me. Talking to someone really does help."],["Something else","Thanks for telling me."]];
    k.replies(ABOUT.map(([l,line])=>({label:l,run:()=>{k.userSays(l);k.say(line);offerTutor(l)}})).concat([{label:"Back",back:true,run:()=>show()}]));
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
    /* Connected and never asked: notifications about their course, offered once (yes or no, it's not asked again). */
    else if(window.eviaPush&&window.eviaPush.state()==="off"&&!window.eviaPush.asked()){
      k.say("Want me to tell you when your assessor signs your work off, or your review is coming up?");
      k.widget('<div class="hp-row hp-push"><button type="button" class="secondary hp-one" data-push>Turn on notifications</button><button type="button" class="hp-skip" data-nopush>Not now</button></div>',el=>{
        el.querySelector("[data-push]").onclick=async()=>{el.querySelectorAll("button").forEach(b=>b.disabled=true);k.userSays("Turn on notifications");let ok=false;try{ok=await window.eviaPush.on()}catch(_){}
          k.say(ok?"Done. I’ll only tell you about your course, and never between 9pm and 7:30am. You can turn them off in your profile.":window.eviaPush.state()==="blocked"?"Notifications are blocked for Evia in your phone’s settings. Allow them there, then turn them on in your profile.":"I couldn’t turn them on just now. You can try again from your profile.")};
        el.querySelector("[data-nopush]").onclick=()=>{el.querySelectorAll("button").forEach(b=>b.disabled=true);try{window.eviaPush.later&&window.eviaPush.later()}catch(_){}k.userSays("Not now");k.say("No problem. You can turn them on in your profile any time.")};
      });
    }
    const done=thisWeek();
    if(!done){
      const last=lastCheckin();
      k.say(hello+". Got 3 minutes for our catch-up?"+(last&&last.goal?" I want to hear how <strong>"+esc(last.goal.title.toLowerCase())+"</strong> went.":""));
      k.widget('<button type="button" class="primary hp-start">Start our catch-up</button>',el=>{el.querySelector("button").onclick=e=>{e.target.disabled=true;catchUp()}});
    }else{
      const p=goalProgress(done.goal);
      k.say(hello+". We’ve had our catch-up this week ✓"+(done.goal?" Your goal: <strong>"+esc(done.goal.title.toLowerCase())+"</strong>"+(p?(p.done?" — done ✓":" ("+(done.goal.kind==="hours"?hm(p.v)+" of "+done.goal.n+"h":p.v+" of "+done.goal.n)+")"):""):"")+" What can I help with?");
    }
    k.widget('<div class="hp-doors">'+[["job","I’ve done a job","Turn it into evidence"],["stuck","I’m stuck","Write-ups, topics, maths"],["wrong","Something’s not right","Worries, safety, wellbeing"],["ask","Ask me","Sums, tools, terms"]]
      .map(([id,l,sub])=>'<button type="button" data-door="'+id+'"><strong>'+l+'</strong><small>'+sub+'</small></button>').join("")+'</div>'+
      '<div class="hp-extras"><button type="button" data-x="hours">Log hours</button><button type="button" data-x="practise">Practise</button><button type="button" data-x="more">Other things</button></div>',el=>{
      const go={job,stuck,wrong:notRight,ask,hours:logHours,practise,more};
      el.querySelectorAll("[data-door],[data-x]").forEach(b=>b.onclick=()=>go[b.dataset.door||b.dataset.x]());
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

  window.eviaHelper={show,catchUp,today,job,stuck,notRight,top,askCheckIn,writeUp,goalProgress};
})();
