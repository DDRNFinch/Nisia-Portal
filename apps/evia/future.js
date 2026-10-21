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
    const st=steps(f),done=st.filter(x=>x.doneNow).length,pct=st.length?Math.round(done/st.length*100):0;
    const el=shell("My future",'<div class="fu-goal"><span>My goal</span><strong>'+esc(f.goal)+'</strong>'+(f.when?'<small>'+esc(f.when)+'</small>':"")+
        '<div class="fu-bar" aria-hidden="true"><i style="width:'+pct+'%"></i></div><small>'+done+' of '+st.length+' steps done</small></div>'+
      '<div class="fu-h">Steps on the way</div><ul class="fu-steps">'+st.map(x=>'<li class="'+(x.doneNow?"done":"")+'" data-id="'+esc(x.id)+'"><button type="button" class="fu-tick'+(x.doneNow?" on":"")+'" aria-pressed="'+x.doneNow+'" aria-label="'+esc((x.doneNow?"Done: ":"Not done: ")+x.text)+'"'+(x.auto?" disabled":"")+'>'+(x.doneNow?"✓":"")+'</button><span>'+esc(x.text)+(x.auto?'<small>Evia can see you’ve done this</small>':"")+'</span>'+(x.auto?"":'<button type="button" class="fu-x" aria-label="Remove this step">×</button>')+'</li>').join("")+'</ul>'+
      '<div class="fu-row"><input class="fu-in" id="fu-new" maxlength="140" placeholder="Add a step of my own"><button type="button" class="fu-btn" id="fu-add">Add</button></div>'+
      '<p class="pv-note"><span aria-hidden="true">💡</span><span>Your assessor and employer see your goal at your progress review, so you can talk about how to get there.</span></p>'+
      '<div class="fu-row"><button type="button" class="fu-btn" id="fu-change" style="flex:1">Change my goal</button></div>');
    const upd=fn=>{const g=get();fn(g);save(g);open()};
    el.querySelectorAll(".fu-steps li").forEach(li=>{const id=li.dataset.id;
      const t=li.querySelector(".fu-tick");if(t&&!t.disabled)t.onclick=()=>upd(g=>{const s=g.steps.find(x=>x.id===id);if(s){s.done=!s.done;s.doneAt=s.done?new Date().toISOString():null}});
      const x=li.querySelector(".fu-x");if(x)x.onclick=()=>upd(g=>{g.steps=g.steps.filter(s=>s.id!==id)})});
    const inp=el.querySelector("#fu-new"),add=()=>{const v=inp.value.trim();if(!v)return;upd(g=>{g.steps=(g.steps||[]).concat({id:"s"+Date.now().toString(36),text:v})})};
    el.querySelector("#fu-add").onclick=add;inp.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();add()}};
    el.querySelector("#fu-change").onclick=pick;
  }
  window.eviaFuture={open,get,summary};
})();
