/* Evia7 My future: where the apprentice wants to get to, and the small steps on the way, so their day-to-day work in
   Evia visibly moves them forward. Colleges have to show Ofsted they talk about careers and next steps, so it's in
   the review prep pack (review-prep.js) and Milos shows it at the review (the summary in nisia.js).
     The goal    picked from a few common ones for the trades, or their own words, and roughly when
     The steps   Evia suggests some for that goal; they add their own. Some tick themselves from what Evia already
                 knows (all topics evidenced, a mock test passed, maths and English done); the rest they tick
   Kept with the learner's profile (eviaData "learner": future), so it goes to the college and comes back on a new phone.
   window.eviaFuture: open(), get(), summary() */
(function(){
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const GOALS=[
    ["qualified","Finish my apprenticeship and be fully qualified"],
    ["level3","Move on to a Level 3 or an advanced course"],
    ["supervisor","Run a team on site (supervisor or foreman)"],
    ["business","Run my own business"],
    ["specialist","Specialise (heritage, restoration, fit-out…)"],
    ["teach","Teach or assess my trade one day"]];
  const WHEN=["In the next year","In 2 to 3 years","In 5 years or more"];
  /* Steps Evia suggests for each goal. auto(): true when Evia can see it's done already. */
  const S=()=>{try{return window.eviaStats.compute()}catch(_){return null}};
  const STEP={
    topics:{text:"Get evidence for every topic",auto:s=>s&&s.a&&s.a.ksbPct>=100},
    mock:{text:"Score 80% or more in a practice end-point test",auto:s=>s&&(s.tests||[]).some(t=>t.type==="epa"&&t.best>=80)},
    fs:{text:"Finish maths and English (if I need them)",auto:null},
    cscs:{text:"Get my CSCS card for my trade",auto:null},
    ask:{text:"Ask my assessor what comes after my apprenticeship",auto:null},
    l3:{text:"Find out which Level 3 courses my college runs",auto:null},
    lead:{text:"Lead a small job or a new starter on site",auto:null},
    sssts:{text:"Do a site supervisor safety course (SSSTS)",auto:null},
    price:{text:"Learn how to price a job and write a quote",auto:null},
    tools:{text:"Build up my own set of tools",auto:null},
    drive:{text:"Get my driving licence",auto:null},
    money:{text:"Learn the basics: tax, insurance and keeping accounts",auto:null},
    spec:{text:"Ask about specialist training in the area I like",auto:null},
    shadow:{text:"Help my tutor show a new learner a skill",auto:null},
    a1:{text:"Find out about assessor and teaching qualifications",auto:null}};
  const FOR={qualified:["topics","mock","fs","cscs","ask"],level3:["topics","mock","fs","l3","ask"],supervisor:["topics","mock","cscs","lead","sssts"],
    business:["topics","cscs","price","tools","drive","money"],specialist:["topics","mock","spec","ask"],teach:["topics","mock","fs","shadow","a1"],own:["topics","mock","ask"]};

  /* A short guide for each of Evia's steps: what it is, how to do it, roughly what it costs and how long it takes, and
     where to find out more. Links go to the main pages of long-standing official sites, so they keep working. */
  const L={cscs:["CSCS cards","https://www.cscs.uk.com/"],citb:["CITB (the construction industry’s training board)","https://www.citb.co.uk/"],
    ncs:["National Careers Service","https://nationalcareers.service.gov.uk/"],fe:["Further education courses (GOV.UK)","https://www.gov.uk/further-education-courses"],
    appr:["Find an apprenticeship (GOV.UK)","https://www.findapprenticeship.service.gov.uk/"],drive:["Apply for a provisional licence (GOV.UK)","https://www.gov.uk/apply-first-provisional-driving-licence"],
    sole:["Set up as a sole trader (GOV.UK)","https://www.gov.uk/set-up-sole-trader"],self:["Working for yourself (GOV.UK)","https://www.gov.uk/working-for-yourself"],
    teach:["Teach in further education (GOV.UK)","https://www.teach-in-further-education.campaign.gov.uk/"],spab:["Old building repair skills (SPAB)","https://www.spab.org.uk/"]};
  const GUIDE={
    topics:{what:"Your assessor needs evidence for every topic before you can go to your end-point assessment.",how:["Open Topics and look for the ones with no evidence yet","Take photos next time you do that job at work","Add a few words about what you did and how"],time:"A little each week",auto:"Evia ticks this for you when every topic has evidence."},
    mock:{what:"A practice end-point test shows you’re ready for the real one, and where to brush up first.",how:["Open Learn and choose a practice test","Read the questions you got wrong and the answers","Try again a few days later"],time:"About 30 minutes a go",auto:"Evia ticks this when you score 80% or more."},
    fs:{what:"Most apprentices need Level 2 maths and English (or a GCSE grade 4) to finish. If you already have them, you can tick this now.",how:["Ask your tutor whether you need them","If you do, practise in Learn › Maths and English","Your college books the tests when you’re ready"],cost:"Free on your apprenticeship",time:"A few weeks of practice",links:["ncs"]},
    cscs:{what:"A CSCS card shows you’re trained and safe to work on site. Most sites ask for one at the gate.",how:["Ask your employer which card you need (apprentices can get the Apprentice card)","Pass the Health, Safety and Environment test (book it through CITB)","Apply for the card on the CSCS website"],cost:"Often paid by your employer: ask first",time:"A couple of weeks",links:["cscs","citb"]},
    ask:{what:"Your assessor knows what people from your course go on to do, and what your college offers next.",how:["Ask at your next progress review, or send a message","Ask what Level 3 or other courses would suit you","Write down what they suggest as new steps here"],time:"5 minutes",msg:true},
    l3:{what:"A Level 3 (advanced) course builds on what you’re learning now, and can lead to supervising, setting out and more complex work.",how:["Ask your tutor which Level 3 courses your college runs","Look out for open evenings in Coming up at college","Talk to your employer about carrying on"],cost:"Often funded for apprentices: ask your college",links:["fe","appr"],msg:true},
    lead:{what:"Leading a small job or showing a new starter the ropes is the first step to running a team.",how:["Tell your supervisor you’d like to try","Start with something small you’re confident in","Ask afterwards how it went"],time:"Next time the chance comes up"},
    sssts:{what:"SSSTS is the short safety course most site supervisors are expected to have.",how:["Ask your employer if they’ll put you on it","Find a course near you (search “SSSTS” on the CITB site)","Pass the course and keep your certificate safe"],cost:"Usually a few hundred pounds; employers often pay",time:"2 days",links:["citb"]},
    price:{what:"Working out a price is how you win work and make a profit when you’re on your own.",how:["Ask your boss how they price a job","Try pricing a small job: materials, time, travel, waste","Compare your price with what was charged"],time:"An hour or two to start"},
    tools:{what:"Having your own good tools makes you ready to work for yourself or move on.",how:["List what you use every day","Buy a little at a time; good second-hand tools are fine","Keep them clean, sharp and marked as yours"],cost:"Spread it out over time"},
    drive:{what:"A licence lets you get to different sites and carry your tools and materials.",how:["Apply for a provisional licence on GOV.UK","Pass the theory test","Take lessons and pass the practical test"],cost:"The provisional licence is about £34 online; lessons cost more",links:["drive"]},
    money:{what:"Working for yourself means sorting your own tax, insurance and records.",how:["Read how to set up as a sole trader on GOV.UK","Find out about public liability insurance","Keep receipts and a simple record of what you earn"],links:["sole","self"]},
    spec:{what:"Specialist skills like heritage and restoration work are in demand and can pay well.",how:["Tell your tutor which area interests you","Ask about short courses or a Level 3","Look for chances to help on that kind of job at work"],links:["spab","ncs"],msg:true},
    shadow:{what:"Helping someone newer learn a skill is great practice for teaching, and looks good to employers.",how:["Ask your tutor if you can help with a new group","Show one skill you’re confident in","Ask your tutor for feedback"],time:"One session"},
    a1:{what:"To assess or teach your trade, you’ll need experience, then an assessor or teaching qualification.",how:["Ask your assessor how they started","Find out about assessor (TAQA) and teaching courses","Look at teaching in further education on GOV.UK"],links:["teach","ncs"],msg:true}};
  /* A few useful places for each goal. */
  const LINKS={qualified:["cscs","ncs"],level3:["fe","appr","ncs"],supervisor:["citb","cscs","ncs"],business:["sole","self","drive"],specialist:["spab","citb","ncs"],teach:["teach","ncs"],own:["ncs"]};

  /* ---------- Careers sessions from the college (Evia Portal: Careers) ----------
     Kept on the phone so My future and the calendar show them without signal. */
  const CK="evia7-careers";
  const careersKept=()=>{try{const v=JSON.parse(localStorage.getItem(CK)||"null");return v&&Array.isArray(v.list)?v.list:[]}catch(_){return []}};
  const liveCollege=()=>{try{const e=window.eviaNisia&&window.eviaNisia.joined();return !!(e&&e.live)}catch(_){return false}};
  let loading=null;
  function loadCareers(){
    if(!liveCollege()||!navigator.onLine)return Promise.resolve(careersKept());
    return loading=loading||window.eviaNisia.call("evia_careers",{}).then(list=>{list=Array.isArray(list)?list:[];
      const before=localStorage.getItem(CK),now=JSON.stringify({at:new Date().toISOString(),list});
      try{localStorage.setItem(CK,now)}catch(_){}
      if(before==null||JSON.parse(before).list&&JSON.stringify(JSON.parse(before).list)!==JSON.stringify(list))window.dispatchEvent(new Event("evia-careers"));
      return list}).catch(()=>careersKept()).finally(()=>{loading=null});
  }
  async function interest(id,on){
    await window.eviaNisia.call("evia_careers_interest",{p_id:id,p_on:on});
    try{const v=JSON.parse(localStorage.getItem(CK)||"null");if(v&&v.list){v.list.forEach(x=>{if(x.id===id)x.interested=on});localStorage.setItem(CK,JSON.stringify(v))}}catch(_){}
    window.dispatchEvent(new Event("evia-careers"));
  }
  /* Coming up, the ones for this goal first. */
  function careersFor(key){
    const now=Date.now(),list=careersKept().filter(x=>Date.parse(x.starts_at)+(x.minutes||60)*6e4>now);
    const fits=x=>!x.goals||!x.goals.length||x.goals.includes(key);
    return list.filter(fits).concat(list.filter(x=>!fits(x))).map(x=>Object.assign({},x,{fits:fits(x)}));
  }
  const when=x=>new Date(x.starts_at).toLocaleString("en-GB",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).replace(",","");
  window.eviaCareers={load:loadCareers,list:careersKept,interest};

  const get=()=>{try{return (window.eviaData.learner()||{}).future||null}catch(_){return null}};
  const save=f=>{f.updatedAt=new Date().toISOString();window.eviaData.put("learner",{future:f})};
  /* Each step, with whether it's done (ticked, or Evia can see it). */
  function steps(f){
    const s=S();
    return (f&&f.steps||[]).map(x=>{const def=STEP[x.key],auto=!!(def&&def.auto&&def.auto(s));return Object.assign({},x,{text:x.text||(def&&def.text)||"",auto,doneNow:!!x.done||auto})});
  }
  function summary(){
    const f=get();if(!f||!f.goal)return null;
    const st=steps(f),done=st.filter(x=>x.doneNow).length;
    return {goal:f.goal,when:f.when||"",steps:st.length,done,list:st.filter(x=>!x.doneNow).map(x=>x.text).slice(0,5),updatedAt:f.updatedAt||null};
  }

  /* ---------- The screen ---------- */
  const STYLE=`.fu-goal{padding:16px;border-radius:18px;background:var(--soft,#fff7d6);margin:2px 0 14px}
.fu-goal span{display:block;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--yellow-ink,#6e5c00)}
.fu-goal strong{display:block;font-size:19px;line-height:1.3;margin-top:4px}.fu-goal small{display:block;color:var(--ui-muted,#667085);margin-top:4px;font-size:13px}
.fu-bar{height:8px;border-radius:4px;background:#eef0f3;margin:8px 0 2px;overflow:hidden}.fu-bar i{display:block;height:100%;background:var(--yellow,#e7b900);border-radius:4px}
.fu-steps{list-style:none;margin:0;padding:0}
.fu-steps li{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--ui-line,#eef0f3)}
.fu-steps li:first-child{border-top:0}
.fu-tick{width:28px;height:28px;border-radius:50%;border:2px solid #d0d5dd;background:#fff;flex:none;display:grid;place-items:center;font-weight:800;color:#fff;cursor:pointer;padding:0}
.fu-tick.on{background:#12b76a;border-color:#12b76a}
.fu-steps span{flex:1;font-size:15px;line-height:1.35}.fu-steps li.done span{color:var(--ui-muted,#667085);text-decoration:line-through}
.fu-steps small{display:block;font-size:12px;color:#067647;text-decoration:none}
.fu-x{border:0;background:none;color:#98a2b3;font-size:20px;cursor:pointer;padding:4px 6px}
.fu-opts{display:flex;flex-direction:column;gap:8px;margin:6px 0 14px}
.fu-opt{border:1.5px solid #e4e7ec;background:#fff;border-radius:14px;padding:12px 14px;text-align:left;font-size:15px;cursor:pointer;color:#172033}
.fu-opt.on{border-color:var(--yellow,#e7b900);background:var(--soft,#fff7d6);font-weight:700}
.fu-in{width:100%;box-sizing:border-box;border:1px solid #e3e7ed;border-radius:14px;padding:12px;font:inherit;font-size:16px;min-height:0}
.fu-row{display:flex;gap:8px;margin-top:10px}.fu-row .fu-in{flex:1}
.fu-btn{border:0;border-radius:14px;padding:13px 16px;font-weight:700;font-size:15px;cursor:pointer;background:#f2f4f7;color:#172033}
.fu-btn.primary{background:var(--yellow,#e7b900);color:var(--ui-on-accent,#172033)}
.fu-step-t{flex:1;border:0;background:none;padding:0;text-align:left;font:inherit;font-size:15px;line-height:1.35;color:inherit;cursor:pointer}
.fu-step-t em{display:block;font-style:normal;font-size:12.5px;font-weight:700;color:var(--yellow-ink,#6e5c00);margin-top:2px}
.fu-steps li.done .fu-step-t{color:var(--ui-muted,#667085)}.fu-steps li.done .fu-step-t b{text-decoration:line-through;font-weight:400}.fu-step-t b{font-weight:400}
.fu-sess{display:flex;gap:12px;align-items:center;width:100%;border:1px solid var(--ui-line,#eaecf0);background:#fff;border-radius:16px;padding:12px;margin:0 0 8px;text-align:left;font:inherit;color:inherit;cursor:pointer}
.fu-date{flex:none;width:48px;text-align:center;border-radius:12px;background:var(--soft,#fff7d6);padding:6px 0;line-height:1.1}
.fu-date b{display:block;font-size:19px}.fu-date small{display:block;font-size:11px;font-weight:800;text-transform:uppercase;color:var(--yellow-ink,#6e5c00)}
.fu-sess>span:not(.fu-date){flex:1;min-width:0}.fu-go{flex:none;font-style:normal;color:var(--ui-muted,#98a2b3);font-size:20px}.fu-sess strong{display:block;font-size:15px}.fu-sess small{display:block;color:var(--ui-muted,#667085);font-size:13px;margin-top:2px}
.fu-tag{display:inline-block;font-style:normal;font-size:11.5px;font-weight:800;border-radius:999px;padding:2px 8px;background:#ecfdf3;color:#067647;margin-top:4px}
.fu-links{list-style:none;margin:0;padding:0}.fu-links a{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 0;border-top:1px solid var(--ui-line,#eef0f3);color:inherit;text-decoration:none;font-size:15px}
.fu-links li:first-child a{border-top:0}.fu-links a::after{content:"↗";color:var(--ui-muted,#98a2b3)}
.fu-how{margin:6px 0 4px;padding-left:22px;line-height:1.5}.fu-how li{margin:4px 0}
.fu-chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 2px}.fu-chips span{font-size:13px;border-radius:999px;background:#f2f4f7;padding:5px 10px}
.fu-empty{color:var(--ui-muted,#667085);font-size:14px;margin:0 0 4px}
.fu-h{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--ui-muted,#667085);font-weight:800;margin:16px 0 6px}`;
  function shell(title,body){
    if(!document.getElementById("fu-style")){const s=document.createElement("style");s.id="fu-style";s.textContent=STYLE;document.head.appendChild(s)}
    const root=document.getElementById("modal-root");
    root.innerHTML='<div class="overlay pv-overlay"><section class="sheet pr-sheet pv-sheet fu-sheet" role="dialog" aria-modal="true" aria-labelledby="fu-title"><div class="sheet-head"><div><div class="chat-kicker">MY PROGRESS</div><h2 id="fu-title">'+esc(title)+'</h2></div><button class="close" id="fu-close" type="button" aria-label="Close">×</button></div><div class="pr-body">'+body+'</div></section></div>';
    root.querySelector("#fu-close").onclick=close;
    root.querySelector(".overlay").addEventListener("click",e=>{if(e.target.classList.contains("overlay"))close()});
    return root.querySelector(".fu-sheet");
  }
  function close(){const r=document.getElementById("modal-root");if(r)r.innerHTML="";if(typeof render==="function"&&typeof screen!=="undefined"&&screen==="learning")try{render()}catch(_){}}

  /* Picking (or changing) the goal and when. */
  function pick(){
    const f=get()||{},key0=f.key||"",own0=f.key==="own"?f.goal:"";let key=key0,when=f.when||"";
    const el=shell("My future",'<p style="margin:0 0 10px;color:var(--ui-text,#344054);line-height:1.5">Where do you want your trade to take you? Pick one, or say it in your own words. You can change it any time.</p>'+
      '<div class="fu-opts" id="fu-goals">'+GOALS.map(([k,t])=>'<button type="button" class="fu-opt'+(k===key?" on":"")+'" data-k="'+k+'">'+esc(t)+'</button>').join("")+
        '<button type="button" class="fu-opt'+(key==="own"?" on":"")+'" data-k="own">Something else…</button></div>'+
      '<input class="fu-in" id="fu-own" maxlength="140" placeholder="My goal, in my own words" value="'+esc(own0)+'"'+(key==="own"?"":" hidden")+'>'+
      '<div class="fu-h">When?</div><div class="fu-opts" id="fu-when">'+WHEN.map(w=>'<button type="button" class="fu-opt'+(w===when?" on":"")+'" data-w="'+esc(w)+'">'+esc(w)+'</button>').join("")+'</div>'+
      '<div class="fu-row"><button type="button" class="fu-btn primary" id="fu-save" style="flex:1">Save my goal</button></div>');
    const own=el.querySelector("#fu-own"),saveB=el.querySelector("#fu-save");
    const ok=()=>{saveB.disabled=!key||(key==="own"&&!own.value.trim())};
    el.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{key=b.dataset.k;el.querySelectorAll("[data-k]").forEach(x=>x.classList.toggle("on",x===b));own.hidden=key!=="own";if(key==="own")own.focus();ok()});
    el.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>{when=b.dataset.w;el.querySelectorAll("[data-w]").forEach(x=>x.classList.toggle("on",x===b))});
    own.oninput=ok;ok();
    saveB.onclick=()=>{
      const goal=key==="own"?own.value.trim():(GOALS.find(g=>g[0]===key)||[])[1];if(!goal)return;
      /* A new goal brings Evia's suggested steps; the learner's own steps (and what's ticked) stay. */
      const old=(f.steps||[]),keep=old.filter(x=>!x.key||x.done),have=new Set(keep.map(x=>x.key).filter(Boolean));
      const add=(FOR[key]||FOR.own).filter(k=>!have.has(k)).map(k=>({id:"s"+Date.now().toString(36)+k,key:k}));
      save({key,goal,when,steps:key===key0?old:keep.concat(add),createdAt:f.createdAt||new Date().toISOString()});
      if(window.eviaUsage&&window.eviaUsage.hit)window.eviaUsage.hit("future.goal");
      open();
    };
  }
  function open(){
    const f=get();if(!f||!f.goal)return pick();
    const st=steps(f),done=st.filter(x=>x.doneNow).length,pct=st.length?Math.round(done/st.length*100):0,key=f.key||"own";
    const sess=careersFor(key).slice(0,3),links=(LINKS[key]||LINKS.own).map(k=>L[k]);
    const el=shell("My future",'<div class="fu-goal"><span>My goal</span><strong>'+esc(f.goal)+'</strong>'+(f.when?'<small>'+esc(f.when)+'</small>':"")+
        '<div class="fu-bar" aria-hidden="true"><i style="width:'+pct+'%"></i></div><small>'+done+' of '+st.length+' steps done</small></div>'+
      (liveCollege()?'<div class="fu-h">Coming up at college</div>'+(sess.length?sess.map(x=>{const d=new Date(x.starts_at);
          return '<button type="button" class="fu-sess" data-sess="'+esc(x.id)+'"><span class="fu-date"><small>'+esc(d.toLocaleDateString("en-GB",{month:"short"}))+'</small><b>'+d.getDate()+'</b></span><span><strong>'+esc(x.title)+'</strong><small>'+esc(when(x)+(x.place?" · "+x.place:""))+'</small>'+
            (x.interested?'<em class="fu-tag">You’re interested</em>':x.fits&&x.goals&&x.goals.length?'<em class="fu-tag" style="background:var(--soft,#fff7d6);color:var(--yellow-ink,#6e5c00)">For your goal</em>':"")+'</span><i class="fu-go" aria-hidden="true">›</i></button>'}).join("")
          :'<p class="fu-empty">Nothing booked yet. When your college adds careers sessions, open evenings or courses, they’ll show here.</p>'):"")+
      '<div class="fu-h">Steps on the way</div><ul class="fu-steps">'+st.map(x=>'<li class="'+(x.doneNow?"done":"")+'" data-id="'+esc(x.id)+'"><button type="button" class="fu-tick'+(x.doneNow?" on":"")+'" aria-pressed="'+x.doneNow+'" aria-label="'+esc((x.doneNow?"Done: ":"Not done: ")+x.text)+'"'+(x.auto?" disabled":"")+'>'+(x.doneNow?"✓":"")+'</button>'+
        '<button type="button" class="fu-step-t" data-guide="'+esc(x.id)+'"><b>'+esc(x.text)+'</b>'+(x.auto?'<small>Evia can see you’ve done this</small>':GUIDE[x.key]?'<em>How to do it ›</em>':"")+'</button>'+(x.auto?"":'<button type="button" class="fu-x" aria-label="Remove this step">×</button>')+'</li>').join("")+'</ul>'+
      '<div class="fu-row"><input class="fu-in" id="fu-new" maxlength="140" placeholder="Add a step of my own"><button type="button" class="fu-btn" id="fu-add">Add</button></div>'+
      '<div class="fu-h">Useful links</div><ul class="fu-links">'+links.map(([t,u])=>'<li><a href="'+esc(u)+'" target="_blank" rel="noopener">'+esc(t)+'</a></li>').join("")+'</ul>'+
      '<p class="pv-note"><span aria-hidden="true">💡</span><span>Your assessor and employer see your goal at your progress review, so you can talk about how to get there.</span></p>'+
      '<div class="fu-row"><button type="button" class="fu-btn" id="fu-change" style="flex:1">Change my goal</button></div>');
    const upd=fn=>{const g=get();fn(g);save(g);open()};
    el.querySelectorAll(".fu-steps li").forEach(li=>{const id=li.dataset.id;
      const t=li.querySelector(".fu-tick");if(t&&!t.disabled)t.onclick=()=>upd(g=>{const s=g.steps.find(x=>x.id===id);if(s){s.done=!s.done;s.doneAt=s.done?new Date().toISOString():null}});
      const x=li.querySelector(".fu-x");if(x)x.onclick=()=>upd(g=>{g.steps=g.steps.filter(s=>s.id!==id)})});
    el.querySelectorAll("[data-guide]").forEach(b=>b.onclick=()=>{const x=st.find(y=>y.id===b.dataset.guide);if(x&&GUIDE[x.key])guide(x)});
    el.querySelectorAll("[data-sess]").forEach(b=>b.onclick=()=>session(b.dataset.sess));
    const inp=el.querySelector("#fu-new"),add=()=>{const v=inp.value.trim();if(!v)return;upd(g=>{g.steps=(g.steps||[]).concat({id:"s"+Date.now().toString(36),text:v})})};
    el.querySelector("#fu-add").onclick=add;inp.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();add()}};
    el.querySelector("#fu-change").onclick=pick;
    /* The college's newest sessions: drawn again if anything changed (once). */
    if(!open.fetched){open.fetched=true;loadCareers().then(()=>{open.fetched=false})}
  }
  window.addEventListener("evia-careers",()=>{if(document.querySelector(".fu-sheet .fu-goal"))open()});
  const back='<div class="fu-row"><button type="button" class="fu-btn" id="fu-back" style="flex:1">Back to My future</button></div>';
  /* One step's guide. */
  function guide(x){
    const g=GUIDE[x.key];
    const el=shell(x.text,'<p style="margin:0 0 6px;line-height:1.5">'+esc(g.what)+'</p>'+
      '<div class="fu-h">How</div><ol class="fu-how">'+g.how.map(h=>'<li>'+esc(h)+'</li>').join("")+'</ol>'+
      (g.cost||g.time?'<div class="fu-chips">'+(g.cost?'<span>💷 '+esc(g.cost)+'</span>':"")+(g.time?'<span>⏱ '+esc(g.time)+'</span>':"")+'</div>':"")+
      (g.links&&g.links.length?'<div class="fu-h">Find out more</div><ul class="fu-links">'+g.links.map(k=>'<li><a href="'+esc(L[k][1])+'" target="_blank" rel="noopener">'+esc(L[k][0])+'</a></li>').join("")+'</ul>':"")+
      (g.auto?'<p class="pv-note"><span aria-hidden="true">✓</span><span>'+esc(g.auto)+'</span></p>':"")+
      '<div class="fu-row">'+(g.msg&&liveCollege()&&window.eviaMessages?'<button type="button" class="fu-btn" id="fu-msg" style="flex:1">Message my tutor</button>':"")+
        (x.auto?"":'<button type="button" class="fu-btn primary" id="fu-done" style="flex:1">'+(x.doneNow?"Not done yet":"I’ve done this")+'</button>')+'</div>'+back);
    el.querySelector("#fu-back").onclick=open;
    const d=el.querySelector("#fu-done");if(d)d.onclick=()=>{const f=get(),s=(f.steps||[]).find(y=>y.id===x.id);if(s){s.done=!s.done;s.doneAt=s.done?new Date().toISOString():null;save(f)}open()};
    const m=el.querySelector("#fu-msg");if(m)m.onclick=()=>{close();window.eviaMessages.open()};
  }
  /* One careers session from the college. */
  function session(id){
    const x=careersKept().find(y=>y.id===id);if(!x)return open();
    const end=new Date(Date.parse(x.starts_at)+(x.minutes||60)*6e4).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
    const el=shell(x.title,'<div class="fu-chips"><span>📅 '+esc(when(x))+'–'+esc(end)+'</span>'+(x.place?'<span>📍 '+esc(x.place)+'</span>':"")+'</div>'+
      (x.details?'<p style="margin:12px 0 0;line-height:1.5;white-space:pre-line">'+esc(x.details)+'</p>':"")+
      (x.link?'<ul class="fu-links" style="margin-top:8px"><li><a href="'+esc(x.link)+'" target="_blank" rel="noopener">More about it</a></li></ul>':"")+
      '<p class="fu-empty" style="margin-top:12px">It’s on your calendar. Tap “I’m interested” and your college will know you’d like to go.</p>'+
      '<p class="small" id="fu-err" role="alert" style="color:#b42318"></p>'+
      '<div class="fu-row"><button type="button" class="fu-btn'+(x.interested?"":" primary")+'" id="fu-int" style="flex:1" aria-pressed="'+!!x.interested+'">'+(x.interested?"✓ You’re interested · Undo":"I’m interested")+'</button></div>'+back);
    el.querySelector("#fu-back").onclick=open;
    const b=el.querySelector("#fu-int");b.onclick=async()=>{b.disabled=true;try{await interest(x.id,!x.interested);if(window.eviaUsage&&window.eviaUsage.hit)window.eviaUsage.hit("future.interest");session(id)}catch(e){el.querySelector("#fu-err").textContent=e.message;b.disabled=false}};
  }
  window.eviaFuture={open,get,summary,session};
})();
