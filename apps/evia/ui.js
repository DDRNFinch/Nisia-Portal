/* Evia7 UI refresh: Home screen, grouped Progress with "My stats", photo Portfolio and Evia's coaching in the chat.
   Loads last and replaces the screen functions from app.js; data and storage are unchanged. */
(function(){
  const PPE_UNIT="Personal protective equipment";
    const escHtml=s=>String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
  const readJson=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||"null");return v??f}catch(_){return f}};
  const pick=list=>list[Math.floor(Math.random()*list.length)];
  const entryTime=e=>{const t=Date.parse(e.savedAt||"");if(!isNaN(t))return t;const m=String(e.d||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?new Date(+m[3],m[2]-1,+m[1]).getTime():0};
  const firstName=()=>String(window.eviaData.learner().name||"").trim().split(/\s+/)[0]||"";
  const partOfDay=()=>{const h=new Date().getHours();return h<12?"Morning":h<18?"Afternoon":"Evening"};
  const icon=(d,size=20)=>'<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';
  const ICONS={
    clock:'<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
    camera:'<rect x="3" y="6.5" width="18" height="14" rx="3"/><path d="M8 6.5l1.4-2h5.2l1.4 2"/><circle cx="12" cy="13.5" r="3.5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    chev:'<path d="m9 5 7 7-7 7"/>',
    back:'<path d="m15 5-7 7 7 7"/>',
    test:'<path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15l-3-1.8-3 1.8-3-1.8-3 1.8V5A1.5 1.5 0 0 1 7 3.5Z"/><path d="M9 8.5h6M9 12h6"/>'
  };
  /* soft (optional): a lighter arc after pct, for evidence waiting for the assessor. */
  function ring(pct,size,stroke,label,sub,soft){
    const r=(size-stroke)/2,c=2*Math.PI*r,dash=Math.max(0,Math.min(1,pct/100))*c,dash2=Math.max(0,Math.min(1,(pct+(soft||0))/100))*c;
    return '<span class="ui-ring" style="width:'+size+'px;height:'+size+'px">'+
      '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'" aria-hidden="true"><circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" class="ui-ring-track" stroke-width="'+stroke+'"/>'+
      (dash2>dash?'<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" class="ui-ring-fill ui-ring-soft" stroke-width="'+stroke+'" stroke-dasharray="'+dash2.toFixed(1)+' '+c.toFixed(1)+'" transform="rotate(-90 '+size/2+' '+size/2+')"/>':"")+(dash>0?'<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" class="ui-ring-fill" stroke-width="'+stroke+'" stroke-dasharray="'+dash.toFixed(1)+' '+c.toFixed(1)+'" transform="rotate(-90 '+size/2+' '+size/2+')"/>':"")+'</svg>'+
      (label!=null?'<span class="ui-ring-label"><strong>'+label+'</strong>'+(sub?'<small>'+sub+'</small>':"")+'</span>':"")+
    '</span>';
  }

  /* ---------- Shared analysis used by Home and the coach ---------- */
  function analyse(){
    const units=data().u,entries=evidence.filter(e=>e.c===course);
    /* claimed: what the learner has mapped. evidenced: what counts (signed off by the assessor when connected to a
       college, app.js ksbSignoff). possible: claimed, waiting for the assessor. */
    const nvqOn=window.eviaNvq&&window.eviaNvq.on(),so=ksbSignoff();
    const claimed=nvqOn?window.eviaNvq.claimed():new Set(entries.flatMap(e=>Array.isArray(e.k)?e.k:[]).concat(inductionKsbs()));
    const evidenced=nvqOn?window.eviaNvq.evidenced():so.on?new Set([...so.signed]):claimed;
    const possible=new Set([...claimed].filter(k=>!evidenced.has(k)));
    const aims=ksbAims().filter(k=>!evidenced.has(k));
    const all=allK(),met=all.filter(x=>evidenced.has(x[0])).length;
    const ksbPct=all.length?Math.round(met/all.length*100):0;
    const unitInfo=units.map((u,i)=>{
      const codes=[...new Set(u[1].map(code))];
      const es=entries.filter(e=>e.u===u[0]);
      return {index:i,name:u[0],codes,missing:codes.filter(c=>!claimed.has(c)),waiting:codes.filter(c=>possible.has(c)),aims:codes.filter(c=>aims.includes(c)&&!claimed.has(c)),entries:es,started:es.length>0};
    }).filter(x=>!(window.eviaNvq&&window.eviaNvq.on())||window.eviaNvq.packShown(x.index)); /* NVQ: only jobs for the learner's units */
    const quickest=unitInfo.filter(u=>u.missing.length).sort((a,b)=>b.aims.length-a.aims.length||b.missing.length-a.missing.length||(a.started-b.started)||a.index-b.index)[0]||null;
    const packs=readJson("evia7-working-evidence-packs",{});
    const drafts=Object.values(packs).filter(p=>p&&p.course===course&&((p.photos||[]).length||String(p.write||"").trim())).map(p=>unitInfo.find(u=>u.name===p.unit)).filter(Boolean);
    const lastEntry=entries.slice().sort((a,b)=>entryTime(b)-entryTime(a))[0]||null;
    const daysSince=lastEntry?Math.floor((Date.now()-entryTime(lastEntry))/864e5):null;
    const p=window.eviaData.learner();
    let timePct=null,endDate=null;
    if(p.start&&p.end){
      const s=new Date(p.start+"T00:00:00").getTime(),e=new Date(p.end+"T23:59:59").getTime();
      if(e>s){timePct=Math.round(Math.max(0,Math.min(1,(Date.now()-s)/(e-s)))*100);endDate=new Date(e)}
    }
    const otj=hours.reduce((n,x)=>n+Number(x.n||0),0);
    return {units:unitInfo,entries,evidenced,claimed,possible,aims,signoff:so.on,met,total:all.length,ksbPct,quickest,drafts,lastEntry,daysSince,timePct,endDate,otj};
  }
  function suggestion(a){
    if(a.drafts.length){const d=a.drafts[0];return {unit:d,text:pick(["You started "+d.name+" but haven’t submitted it yet. Finish it off and it counts towards your KSBs.","Your "+d.name+" evidence is still a draft. Submit it and those KSBs get ticked off."]),action:"Finish "+d.name,draft:true}}
    if(a.quickest){const q=a.quickest,n=q.missing.length;return {unit:q,text:q.name+" covers "+n+" KSB"+(n===1?"":"s")+" you haven’t got evidence for yet. That’s your quickest win.",action:"Open "+q.name}}
    return {unit:null,text:"Every KSB on your course has some evidence. Keep strengthening the units with the least photos and detail.",action:null};
  }

  /* ---------- Evia speaks from her button: one Evia on screen ---------- */
  const TIP_KEY="evia7-home-tip";
  let bubbleTimer=null;
  function hideBubble(){
    clearTimeout(bubbleTimer);
    const el=document.getElementById("ui-evia-bubble");
    if(el){el.classList.remove("show");setTimeout(()=>el.remove(),260)}
  }
  function eviaSay(html,actions,o){
    hideBubble();
    const el=document.createElement("div");
    el.id="ui-evia-bubble";el.className="ui-evia-bubble";if(o&&o.keep)el.dataset.keep="1";el.setAttribute("role","status");el.setAttribute("aria-live","polite");
    el.innerHTML='<p>'+html+'</p>'+(actions&&actions.length?'<div class="ui-evia-bubble-actions">'+actions.map((a,i)=>'<button type="button" class="'+(a.primary?"primary":"secondary")+'" data-bubble-action="'+i+'">'+escHtml(a.label)+'</button>').join("")+'</div>':"");
    document.body.appendChild(el);
    el.querySelectorAll("[data-bubble-action]").forEach(b=>b.onclick=()=>{const a=actions[+b.dataset.bubbleAction];hideBubble();a.run&&a.run()});
    requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add("show")));
    if(window.eviaMood)window.eviaMood("happy");
  }
  window.eviaSay=eviaSay;
  /* One nudge a day on Course: the most useful thing from My stats. Achievements are celebrated first. */
  function courseNudge(){
    hideBubble();
    if(document.body.classList.contains("evia-onboarding")||!window.eviaStats)return;
    let n;try{n=window.eviaStats.nudges(window.eviaStats.compute())[0]}catch(_){return}
    if(!n)return;
    const today=new Date().toDateString(),seen=readJson(TIP_KEY,{});
    if(seen.day===today&&(!n.celebrate||seen.id===n.id))return;
    const name=firstName();
    const fire=()=>{
      if(screen!=="course"||!document.getElementById("ui-course-head")||document.querySelector(".chat-sheet"))return;
      if(document.querySelector(".evidence-toast")){bubbleTimer=setTimeout(fire,2400);return} /* wait for "Saved"-style messages to clear */
      const dismiss=()=>{localStorage.setItem(TIP_KEY,JSON.stringify({day:today,id:n.id}));if(n.achievements)window.eviaStats.markSeen(n.achievements);if(n.feedback&&window.eviaFeedback)window.eviaFeedback.markSeen([n.feedback.id]);if(n.lbWin&&window.eviaLeaderboard)window.eviaLeaderboard.markWinsSeen()};
      const lead=n.celebrate?(name?"Well done "+escHtml(name)+"! ":"Well done! "):partOfDay()+(name?" "+escHtml(name):"")+". ";
      eviaSay(lead+n.text,[{label:n.action.label,primary:true,run:()=>{dismiss();runNudge(n)}},{label:"Not now",run:dismiss}]);
      if(n.celebrate&&window.eviaMood)window.eviaMood("happy");
    };
    bubbleTimer=setTimeout(fire,900);
  }
  /* Carries out a nudge's action from Course or the chat. */
  function runNudge(n){
    const kind=n.action.kind,inChat=!!chatBox();
    const go=fn=>{if(inChat)closeChat();setTimeout(fn,inChat?60:0)};
    if(kind==="stats")go(showStats);
    else if(kind==="course")go(()=>nav("course"));
    else if(kind==="learning"){const run=()=>window.eviaCoachFlows&&window.eviaCoachFlows.hours?window.eviaCoachFlows.hours():nav("hours");if(inChat)queue=queue.then(run);else{window.chat({quiet:true});setTimeout(run,50)}}
    else if(kind==="backup")go(async()=>{try{await window.eviaStorage.backup();if(typeof showEvidenceToast==="function")showEvidenceToast("Backup saved to your downloads. Keep a copy somewhere safe, like your email")}catch(e){console.error(e);if(typeof showEvidenceToast==="function")showEvidenceToast("Couldn’t make the backup. Try again from Profile",true)}});
    else if(kind==="leaderboard"){if(window.eviaLeaderboard){window.eviaLeaderboard.markWinsSeen();window.eviaLeaderboard.open()}}
    else if(kind==="feedback"){const f=n.feedback;if(window.eviaFeedback)window.eviaFeedback.markSeen([f.id]);const d=typeof data==="function"?data():null,i=d?d.u.findIndex(u=>u[0]===f.unit):-1;
      go(()=>{if(i>=0&&window.openUnit)window.openUnit(i);else nav("course");setTimeout(()=>{const e=typeof evidence!=="undefined"?evidence.find(x=>String(x.id)===f.id):null;if(e)viewPack(e)},500)})}
    else if(kind==="prep"){const run=()=>{userSays("Get ready for my review");window.eviaCoachFlows.prepare()};if(inChat)queue=queue.then(run);else{window.chat({quiet:true});setTimeout(run,50)}}
    else if(kind==="targets"||kind==="review"){
      const run=kind==="targets"?targetsFromMenu:reviewFromMenu;
      if(inChat)queue=queue.then(run);else{window.chat({quiet:true});setTimeout(run,50)}
    }
    else if(kind==="confidence"){const run=()=>window.eviaCoachFlows&&window.eviaCoachFlows.confidence?window.eviaCoachFlows.confidence():window.eviaPractice.openConfidence();if(inChat)queue=queue.then(run);else{window.chat({quiet:true});setTimeout(run,50)}}
    else if(kind==="test"){
      const t={epa:["epa",20],maths:["maths",5],english:["english",5]}[n.id]||["epa",5];
      startTest(t[0],t[1],n.action.label);
    }
  }
  /* Runs a test in the chat. Opening the chat for a test skips Evia's "what I'd do today". */
  function startTest(type,count,label){
    const run=()=>{userSays(label);window.eviaTestMe&&window.eviaTestMe({type,count})};
    if(chatBox())queue=queue.then(run);
    else{
      /* Started from Practice, a target or a suggestion: a clean test screen, without the chat greeting and menu. */
      window.chat({quiet:true});
      setTimeout(()=>{
        const c=chatBox();if(c)c.innerHTML="";
        const sh=document.querySelector(".chat-sheet"),h=sh&&sh.querySelector("h2"),k=sh&&sh.querySelector(".chat-kicker");
        if(sh)sh.classList.add("ui-test-mode");if(h)h.textContent=label;if(k)k.textContent="PRACTICE TEST";
        window.eviaTestMe&&window.eviaTestMe({type,count});
      },50);
    }
  }
  function showStats(){
    if(screen!=="learning")nav("learning");
    setTimeout(()=>{const el=document.getElementById("ui-stats");if(el)el.scrollIntoView({behavior:window.eviaAccessibility&&window.eviaAccessibility.reducedMotion()?"auto":"smooth",block:"start"})},80);
  }
  /* Evia's one tip for the Learning tab: the most useful learning nudge (not a celebration or a backup reminder). */
  function learningTip(st){
    if(!st||!window.eviaStats)return null;
    try{return window.eviaStats.nudges(st).find(n=>!n.celebrate&&n.action&&!["backup","course","stats","review","targets"].includes(n.action.kind))||null}catch(_){return null}
  }
  function openTile(id,st){
    const P=window.eviaPractice;
    if(id==="hours")nav("hours");
    else if(id==="tests"&&P)P.openHub();
    else if(id==="skills"&&P)P.openConfidence();
    else if(id==="tasks"&&P)P.openAllTasks();
    else if(id==="teach")nav("teach");
    else if(id==="knowledge"&&window.eviaNvq)window.eviaNvq.openKnowledge();
    else if(id==="reviews")openSavedReviews();
    else if(id==="badges"&&st){
      uiSheet("LEARNING","Achievements",window.eviaStats.badgesHtml(st));
      window.eviaStats.markSeen(window.eviaStats.achievements(st).fresh.map(x=>x.id));
    }
  }
  /* A bottom sheet in the same style as Practice. */
  function uiSheet(kicker,title,body){
    const root=document.getElementById("modal-root");
    root.innerHTML='<div class="overlay"><section class="sheet pr-sheet" role="dialog" aria-modal="true" aria-labelledby="ui-sheet-title"><div class="sheet-head"><div><div class="chat-kicker">'+kicker+'</div><h2 id="ui-sheet-title">'+escHtml(title)+'</h2></div><button class="close" id="ui-sheet-close" type="button" aria-label="Close">×</button></div><div class="pr-body">'+body+'</div></section></div>';
    const close=()=>{root.innerHTML=""};
    document.getElementById("ui-sheet-close").onclick=close;
    root.querySelector(".overlay").addEventListener("click",e=>{if(e.target.classList.contains("overlay"))close()});
    const h=document.getElementById("ui-sheet-title");h.setAttribute("tabindex","-1");h.focus({preventScroll:true});
    return {el:root.querySelector(".pr-sheet"),close};
  }
  /* ---------- Progress ---------- */
  const GROUPS=[["K","Knowledge"],["S","Skills"],["B","Behaviours"]];
  let expanded={}; /* groups start collapsed: three rings, tap one to see its KSBs */
  function progressScreen(still){ /* still: redrawn after opening a KSB group, so don't replay the animations */
    $("#page-title").textContent="My progress";
    const a=analyse(),all=allK(),supporting=supportingMeta().filter(s=>s.course===course);
    const hasSupport=c=>supporting.some(s=>Array.isArray(s.ksbs)&&s.ksbs.includes(c));
    const S=window.eviaStats,st=(()=>{try{return S?S.compute():null}catch(_){return null}})();
    const tip=learningTip(st);
    $("#screen").innerHTML=pageHead("My progress")+
      '<div class="ui-page">'+
        (st?S.heroHtml(st):"")+
        (()=>{const rd=window.eviaReviewDue&&window.eviaReviewDue();if(!rd)return"";const d=rd.due.toLocaleDateString("en-GB",{day:"numeric",month:"short"});return '<button type="button" class="ui-card ui-review-due'+(rd.days<=14?" soon":"")+'" id="ui-review-due"><span><small>Next progress review</small><strong>'+(rd.days<0?"Overdue · was due "+d:rd.days===0?"Due today":"Due "+d+(rd.days<=14?" · in "+rd.days+" day"+(rd.days===1?"":"s"):""))+'</strong></span><em>'+(!rd.college&&!(window.eviaNisia&&window.eviaNisia.joined())?"Get ready":rd.days<=14?"Start now":"Do it early")+' ›</em></button>'})()+
        (window.eviaTargets?(window.eviaTargets.check(false),window.eviaTargets.cardHtml()):"")+
        (tip?'<section class="ui-card ui-tip"><span class="evia-mini" aria-hidden="true"><span class="evia-face"><i></i><i></i></span></span><div><p>'+escHtml(tip.text)+'</p><button type="button" class="ui-tip-go" id="ui-tip-go">'+escHtml(tip.action.label)+' ›</button></div></section>':"")+
        (st?S.tilesHtml(st):"")+
        (window.eviaNvq&&window.eviaNvq.on()?"":'<h2 class="pg-x-h">Knowledge, skills and behaviours</h2>')+
        (window.eviaNvq&&window.eviaNvq.on()?window.eviaNvq.progressHtml(a):'<section class="ui-card ui-groups">'+GROUPS.map(([letter,label],gi)=>{
          const items=all.filter(x=>x[0].startsWith(letter));if(!items.length)return"";
          const done=items.filter(x=>a.evidenced.has(x[0])).length,wait=a.signoff?items.filter(x=>a.possible.has(x[0])).length:0,pct=Math.round(done/items.length*100),open=!!expanded[letter]||document.body.classList.contains("evia-onboarding"); /* the demo points at K2 and S2, so keep groups open */
          return (gi?'<div class="ui-divider"></div>':"")+
            '<button type="button" class="ui-group-head" data-group="'+letter+'" aria-expanded="'+open+'">'+ring(pct,44,5,null,null,Math.round(wait/items.length*100))+
              '<span class="ui-group-copy"><strong>'+label+'</strong><small>'+done+' of '+items.length+(a.signoff?' signed off'+(wait?' · '+wait+' waiting':''):' with evidence')+'</small></span><span class="ui-group-pct">'+pct+'%</span><span class="ui-chev'+(open?" open":"")+'">'+icon(ICONS.chev,18)+'</span></button>'+
            (open?'<div class="ui-ksb-grid">'+items.map(x=>{const met=a.evidenced.has(x[0]),maybe=!met&&a.signoff&&a.possible.has(x[0]),aim=(a.aims||[]).includes(x[0]);return '<button type="button" class="ui-ksb'+(met?" met":maybe?" maybe":"")+(aim?" aim":"")+'" data-ksb-code="'+escHtml(x[0])+'" aria-label="'+escHtml(x[0])+(met?(a.signoff?", signed off":", evidence captured"):maybe?", evidence added, waiting for your assessor":"")+(aim?", aiming for":"")+'">'+(met?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>':"")+escHtml(x[0])+(hasSupport(x[0])?'<i class="ui-ksb-dot" aria-label="Supporting evidence"></i>':"")+'</button>'}).join("")+'</div>':"");
        }).join("")+(a.signoff?'<p class="ui-ksb-key"><span class="ui-ksb met">K1</span> signed off <span class="ui-ksb maybe">K2</span> waiting for your assessor <span class="ui-ksb aim">K3</span> aiming for</p>':"")+'<p class="ui-help">Tap a KSB to see its wording and the evidence mapped to it'+(a.signoff?", or to aim for it":"")+'.</p></section>')+
      '</div>';
    if(window.eviaTargets){window.eviaTargets.bind(document.getElementById("pg-targets"),()=>progressScreen(true))}
    if(window.eviaNvq&&window.eviaNvq.on())window.eviaNvq.bindProgress(()=>progressScreen(true));
    const rdb=document.getElementById("ui-review-due");if(rdb)rdb.onclick=()=>window.eviaStartReview&&window.eviaStartReview();
    if(st)S.animate(document.getElementById("screen"),still===true);
    document.querySelectorAll("[data-group]").forEach(b=>b.onclick=()=>{const y=window.scrollY;expanded[b.dataset.group]=!expanded[b.dataset.group];progressScreen(true);window.scrollTo(0,y)});
    document.querySelectorAll("[data-tile]").forEach(b=>b.onclick=()=>openTile(b.dataset.tile,st));
    const tg=document.getElementById("ui-tip-go");if(tg)tg.onclick=()=>runNudge(tip);
    document.querySelectorAll(".ui-groups [data-ksb-code]").forEach(b=>b.onclick=()=>{const item=all.find(x=>x[0]===b.dataset.ksbCode);if(item)ksbDetail(item[0],item[1],a.evidenced.has(item[0]),()=>progressScreen(true))});
  }

  /* ---------- My course: saved evidence sits under the capture page ---------- */
  /* What's been shared already (to Aptem, email…), so it can be greyed out. */
  const SHARED_KEY="evia7-shared";
  const sharedAt=key=>readJson(SHARED_KEY,{})[key]||null;
  window.eviaMarkShared=key=>{const m=readJson(SHARED_KEY,{});m[key]=Date.now();localStorage.setItem(SHARED_KEY,JSON.stringify(m))};
  const SHARE_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3.5"/><path d="m7.5 8 4.5-4.5L16.5 8"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/></svg>';
  const photoOf=async e=>{try{const p=window.eviaGetEvidencePhotoData?await window.eviaGetEvidencePhotoData(e):(e.p||[]);return p[0]||null}catch(_){return null}};
  const savedDay=t=>new Date(t).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
  const tileHtml=(key,img,title,sub,shared,state)=>'<div class="ev-tile'+(shared?" ev-shared":"")+(state?" ev-"+state:"")+'"><button type="button" class="ev-tile-main" data-ev-open="'+key+'"><span class="ev-tile-img" data-ev-img="'+key+'">'+img+'</span><span class="ev-tile-copy"><strong>'+escHtml(title)+'</strong><small>'+escHtml(sub)+(shared?' · <b class="ev-shared-tag">Shared '+escHtml(new Date(shared).toLocaleDateString("en-GB",{day:"numeric",month:"short"}))+'</b>':"")+'</small></span></button><button type="button" class="ev-tile-share" data-ev-share="'+key+'" aria-label="Share">'+SHARE_ICON+'</button></div>';
  /* Called by the evidence pack page (polish.js): a grey line, then one tile per saved pack. */
  function savedTiles(unitName,page){
    if(!page)return;
    const entries=evidence.filter(e=>e.c===course&&e.u===unitName).sort((x,y)=>entryTime(y)-entryTime(x));
    if(!entries.length)return;
    const words=e=>String(e.w||"").trim()?String(e.w).trim().split(/\s+/).length:0,count=e=>(e.photoIds||e.p||[]).length;
    /* With more than one saved, "Share all" puts every one of them in a single PDF, oldest first. */
    page.insertAdjacentHTML("beforeend",'<div class="ev-saved-line"></div><section class="ev-saved"><div class="ev-saved-head"><h3>Saved evidence</h3>'+(entries.length>1?'<button type="button" class="ev-share-all" id="ev-share-all">'+SHARE_ICON+'Share all '+entries.length+'</button>':"")+'</div>'+
      entries.map(e=>{const f=window.eviaFeedback&&window.eviaFeedback.forEvidence(e.id);return tileHtml(escHtml(e.id),icon(ICONS.camera,20),"Saved "+savedDay(entryTime(e)),[count(e)+" photo"+(count(e)===1?"":"s"),(e.media||[]).length?(e.media.length===1?(e.media[0].kind==="video"?"1 video":"1 voice note"):e.media.length+" recordings"):"",words(e)?words(e)+" words":""].filter(Boolean).join(" · ")+(f?(f.decision==="accepted"?" · ✓ Signed off":" · More wanted"):""),sharedAt("pack:"+e.id),f?(f.decision==="accepted"?"signed":"more"):"")}).join("")+'</section>');
    /* The assessor's decision shows on each tile (green when signed off); the feedback itself is inside the evidence. */
    entries.forEach(async e=>{const src=await photoOf(e),el=page.querySelector('[data-ev-img="'+CSS.escape(String(e.id))+'"]');if(src&&el)el.innerHTML='<img src="'+src+'" alt="">'});
    page.querySelectorAll("[data-ev-open]").forEach(b=>b.onclick=()=>viewPack(entries.find(e=>String(e.id)===b.dataset.evOpen)));
    const all=page.querySelector("#ev-share-all");if(all)all.onclick=()=>window.eviaOpenSendToPortfolio&&window.eviaOpenSendToPortfolio(unitName);
    page.querySelectorAll("[data-ev-share]").forEach(b=>b.onclick=()=>{const e=entries.find(x=>String(x.id)===b.dataset.evShare);if(e&&window.eviaOpenSendToPortfolio)window.eviaOpenSendToPortfolio(unitName,e.id)});
  }
  /* A saved pack, to look back at: its photos and write-up. */
  /* The assessor's sign-off and feedback on a piece of evidence (from Milos, through Nisia). */
  /* The KSBs still to be signed off, with what to do about it. codes: [{code,unit}] */
  function moreHtml(codes){
    if(!codes||!codes.length)return"";
    const txt=k=>{const x=allK().find(y=>y[0]===k);return x?x[1]:""};
    return '<div class="ev-more"><strong>More required</strong><ul>'+codes.map(x=>'<li><b>'+escHtml(x.code)+'</b> '+escHtml(txt(x.code))+'</li>').join("")+'</ul><p>Aim to gather evidence for '+(codes.length===1?"this":"these")+' next time. Anything that shows '+(codes.length===1?"it":"them")+' counts: a couple of photos and a short write-up, just photos, or just a write-up.</p></div>';
  }
  window.eviaMoreHtml=moreHtml;
  function feedbackHtml(f,e){
    if(!f)return"";
    const day=f.at?new Date(f.at).toLocaleDateString("en-GB",{day:"numeric",month:"short"}):"";
    return '<div class="ev-fb '+(f.decision==="accepted"?"ok":"more")+'"><strong>'+(f.decision==="accepted"?"✓ Signed off":"Your assessor would like a bit more")+(f.by?" by "+escHtml(f.by):"")+(day?", "+escHtml(day):"")+'</strong>'+
      (f.decision==="accepted"&&f.ksbs&&f.ksbs.length?'<small>'+escHtml(f.ksbs.join(", "))+'</small>':"")+(f.feedback?'<p>'+escHtml(f.feedback)+'</p>':"")+'</div>'+
      (e&&window.eviaMoreRequired?moreHtml(window.eviaMoreRequired().filter(x=>(e.k||[]).includes(x.code))):"");
  }
  window.eviaFeedbackHtml=feedbackHtml;
  async function viewPack(e){
    if(!e)return;
    if(window.eviaFeedback)window.eviaFeedback.markSeen([String(e.id)]);
    const sh=uiSheet("SAVED "+savedDay(entryTime(e)).toUpperCase(),e.u,
      '<div class="ev-view-photos" id="ev-view-photos"></div>'+
      ((e.media||[]).length?'<div class="ev-view-media" id="ev-view-media"></div>':"")+
      (String(e.w||"").trim()?'<p class="ev-view-text">'+escHtml(e.w)+'</p>':"")+
      /* What Evia wrote down from the recordings: kept out of the way, there for the assessor's highlighting. */
      ((e.media||[]).some(m=>m.transcript)?'<details class="rec-transcript"><summary>What Evia wrote down from your recording'+((e.media||[]).length===1?"":"s")+'</summary><p>'+escHtml((e.media||[]).map(m=>m.transcript).filter(Boolean).join("\n\n"))+'</p></details>':"")+feedbackHtml(window.eviaFeedback&&window.eviaFeedback.forEvidence(e.id),e)+
      '<div class="pr-actions"><button type="button" class="secondary ui-danger" id="ev-view-del">Delete</button><button type="button" class="secondary" id="ev-view-share">'+SHARE_ICON+' Share</button></div>');
    sh.el.querySelector("#ev-view-share").onclick=()=>{sh.close();window.eviaOpenSendToPortfolio&&window.eviaOpenSendToPortfolio(e.u,e.id)};
    sh.el.querySelector("#ev-view-del").onclick=()=>{
      if(!confirm("Delete this evidence and its photos from Evia? If your assessor has already signed it off, your college keeps their copy."))return;
      if(window.eviaData.remove("evidence",e.id)){sh.close();const t=document.querySelector('[data-ev-open="'+CSS.escape(String(e.id))+'"]');if(t)t.closest(".ev-tile").remove();if(typeof showEvidenceToast==="function")showEvidenceToast("Evidence deleted")}
    };
    try{const photos=window.eviaGetEvidencePhotoData?await window.eviaGetEvidencePhotoData(e):(e.p||[]);const g=sh.el.querySelector("#ev-view-photos");if(g)g.innerHTML=photos.map(src=>'<img src="'+src+'" alt="Evidence photo">').join("")}catch(_){}
    const mv=sh.el.querySelector("#ev-view-media");
    if(mv)for(const m of e.media){try{const b=window.eviaGetEvidencePhoto&&await window.eviaGetEvidencePhoto(m.id);if(!b)continue;const url=URL.createObjectURL(b);
      mv.insertAdjacentHTML("beforeend",m.kind==="video"?'<video src="'+url+'" controls playsinline preload="metadata"></video>':'<audio src="'+url+'" controls preload="metadata"></audio>')}catch(_){}}
  }
  window.eviaSavedTiles=savedTiles;
  /* Supporting evidence is its own unit: the same capture page, with its files as tiles underneath. Tap one to see
     (or play) it before sharing; anything already shared is greyed out. */
  const originalSupporting=window.openSupportingEvidence;
  const fileOf=async x=>{const rec=await window.eviaSupportingFileGet(x.id);if(!rec||!rec.blob)throw new Error("missing");return rec.blob};
  const addedOf=x=>Date.parse(x.addedAt||x.createdAt||"")||Number(x.createdAt)||Date.now();
  async function shareSupporting(x,after){
    try{
      const blob=await fileOf(x),file=new File([blob],x.filename||x.title||"supporting-evidence",{type:blob.type||x.mime||"application/octet-stream"});
      if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:x.title||"Supporting evidence"})}
      else{const a=document.createElement("a");a.href=URL.createObjectURL(file);a.download=file.name;document.body.appendChild(a);a.click();a.remove()}
      window.eviaMarkShared("sup:"+x.id);if(after)after();
    }catch(err){if(!(err&&err.name==="AbortError")&&typeof showEvidenceToast==="function")showEvidenceToast("Couldn’t share that file",true)}
  }
  async function previewSupporting(x){
    const shared=sharedAt("sup:"+x.id);
    const sh=uiSheet((x.type||"file").toUpperCase()+" · "+savedDay(addedOf(x)).toUpperCase(),x.title||"Supporting evidence",
      '<div class="sp-preview" id="sp-preview"><span class="sp-loading">Loading…</span></div>'+
      '<p class="sp-meta">'+escHtml(typeof supportingSummary==="function"?supportingSummary(x):"")+(x.size?" · "+(x.size>1048576?(x.size/1048576).toFixed(1)+" MB":Math.max(1,Math.round(x.size/1024))+" KB"):"")+(shared?' · <b class="ev-shared-tag">Shared '+escHtml(savedDay(shared))+'</b>':"")+'</p>'+
      '<div class="pr-actions">'+(x.observation?"":'<button type="button" class="secondary ui-danger" id="sp-del">Delete</button><button type="button" class="secondary" id="sp-edit">Edit details</button>')+'<button type="button" class="primary" id="sp-share">'+(shared?"Share again":"Share")+'</button></div>');
    if(!x.observation)sh.el.querySelector("#sp-edit").onclick=()=>{sh.close();openSupportingDetails(x.id,false,window.openSupportingEvidence)};
    if(!x.observation)sh.el.querySelector("#sp-del").onclick=()=>{
      if(!confirm("Delete this file from Evia? If your assessor has already signed it off, your college keeps their copy."))return;
      if(window.eviaData.remove("supporting",x.id)){sh.close();if(typeof showEvidenceToast==="function")showEvidenceToast("Deleted");window.openSupportingEvidence()}
    };
    sh.el.querySelector("#sp-share").onclick=()=>shareSupporting(x,()=>{sh.close();window.openSupportingEvidence()});
    try{
      const blob=await fileOf(x),url=URL.createObjectURL(blob),mime=blob.type||x.mime||"",box=sh.el.querySelector("#sp-preview");if(!box)return;
      if(x.type==="photo"||/^image\//.test(mime))box.innerHTML='<img src="'+url+'" alt="'+escHtml(x.title||"Photo")+'">';
      else if(x.type==="video"||/^video\//.test(mime))box.innerHTML='<video src="'+url+'" controls playsinline preload="metadata"></video>';
      else if(x.type==="audio"||/^audio\//.test(mime))box.innerHTML='<div class="sp-audio"><audio src="'+url+'" controls preload="metadata"></audio></div>';
      else if(/pdf/.test(mime))box.innerHTML='<iframe src="'+url+'" title="'+escHtml(x.title||"Document")+'"></iframe><a class="sp-open" href="'+url+'" target="_blank" rel="noopener">Open the full document</a>';
      else box.innerHTML='<a class="sp-open big" href="'+url+'" target="_blank" rel="noopener" download="'+escHtml(x.filename||"file")+'">Open '+escHtml(x.filename||"the file")+'</a>';
    }catch(_){const box=sh.el.querySelector("#sp-preview");if(box)box.innerHTML='<span class="sp-loading">This file couldn’t be read on this phone.</span>'}
  }
  window.openSupportingEvidence=async function(){
    await originalSupporting.apply(this,arguments);
    const scr=document.getElementById("screen"),items=supportingMeta().filter(x=>x.course===course).slice().sort((a,b)=>addedOf(b)-addedOf(a));
    if(!items.length||!scr)return;
    scr.insertAdjacentHTML("beforeend",'<div class="ev-saved-line"></div><section class="ev-saved"><h3>Saved evidence</h3>'+
      items.map(x=>tileHtml(escHtml(x.id),typeof supportingCardIcon==="function"?supportingCardIcon(x.type):icon(ICONS.camera,20),x.title||"Supporting evidence",[savedDay(addedOf(x)),typeof supportingSummary==="function"?supportingSummary(x):""].filter(Boolean).join(" · "),sharedAt("sup:"+x.id))).join("")+'</section>');
    items.forEach(async x=>{
      if(!["photo","video"].includes(x.type)&&!/^image\//.test(x.mime||""))return;
      try{const blob=await fileOf(x),el=scr.querySelector('[data-ev-img="'+CSS.escape(x.id)+'"]');if(!el)return;const url=URL.createObjectURL(blob);
        el.innerHTML=x.type==="video"?'<video src="'+url+'#t=0.5" muted playsinline preload="metadata"></video><i class="ev-play" aria-hidden="true"></i>':'<img src="'+url+'" alt="">'}catch(_){}
    });
    scr.querySelectorAll("[data-ev-open]").forEach(b=>b.onclick=()=>{const x=items.find(i=>i.id===b.dataset.evOpen);if(x)previewSupporting(x)});
    scr.querySelectorAll("[data-ev-share]").forEach(b=>b.onclick=()=>{const x=items.find(i=>i.id===b.dataset.evShare);if(x)shareSupporting(x,()=>window.openSupportingEvidence())});
  };

  const hmText=h=>window.eviaHM(h);
  /* Learning logs: every off-the-job entry, one button for the ones not downloaded yet, and past PDFs to get again. */
  function openLearningLogs(){
    withFade(()=>{
      const pb=document.getElementById("profile-btn");if(pb)pb.style.display="none";
      $("#page-title").textContent="Learning logs";
      const last=otjBatches[otjBatches.length-1],cutoff=Number(last?last.cutoff:0);
      const fresh=hours.filter(x=>Number(x.createdAt)>cutoff),total=hours.reduce((n,x)=>n+Number(x.n||0),0);
      const day=t=>new Date(Number(t)).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});
      const batches=otjBatches.slice().reverse();
      $("#screen").innerHTML='<button class="secondary ui-back" id="ui-logs-back" type="button">‹ Calendar</button><h1 class="ui-sub-title">Learning logs</h1>'+
        '<div class="ui-page">'+'<button type="button" class="primary ui-log-add" id="ui-log-add">+ Log hours</button>'+
          '<section class="ui-card ui-hours-sum"><div><strong>'+escHtml(hmText(total))+'</strong><small>logged in total</small></div><div><strong>'+hours.length+'</strong><small>entr'+(hours.length===1?"y":"ies")+'</small></div></section>'+
          (hours.length?'<section class="ui-card ui-logs-dl"><div><strong>'+(fresh.length?fresh.length+" new entr"+(fresh.length===1?"y":"ies"):"Everything’s downloaded")+'</strong><small>'+(fresh.length?(last?"Since your last download on "+escHtml(savedDay(last.downloadedAt)):"Not downloaded yet"):"New entries will be ready to download here")+'</small></div>'+(fresh.length?'<button type="button" class="primary" id="download-otj">Download PDF</button>':"")+'</section>':"")+
          (hours.length?'<h2 class="ui-hours-h">Your log</h2><div class="ui-card ui-hours-list">'+hours.slice().sort((a,b)=>Number(b.on||b.createdAt)-Number(a.on||a.createdAt)).map(x=>{const isNew=Number(x.createdAt)>cutoff;return '<div class="ui-hours-item'+(isNew?"":" done")+'"><span class="ui-hours-n">'+escHtml(hmText(Number(x.n||0)))+'</span><span class="ui-hours-copy"><strong>'+escHtml(x.description||"No description recorded.")+'</strong><small>'+escHtml(day(x.on||x.createdAt))+' · '+(isNew?"<em>New</em>":"Downloaded")+(x.auto?' · <span class="ui-auto-tag">Logged by Evia</span>':"")+(x.college?' · <span class="ui-auto-tag ui-college-tag">College register</span>':"")+'</small></span>'+(x.college?'<span class="ui-college-lock" title="Confirmed by your tutor">✓</span>':'<button type="button" class="ui-auto-x" data-rm-log="'+escHtml(x.id)+'"'+(isNew?"":' data-downloaded="1"')+' aria-label="Delete this entry">×</button>')+'</div>'}).join("")+'</div>'+
            (hours.some(x=>x.auto)?'<p class="ui-auto-note">Evia logs Teach me lessons and writing up your evidence automatically, counting only the time you’re actively working. Learning hours only count in your paid working hours (or if your employer gives you the time back), so remove any entry that doesn’t.</p>':"")
            :'<div class="ui-card ui-empty"><span class="ui-icon-chip">'+icon(ICONS.clock)+'</span><p>No learning hours logged yet. Tap <strong>Log hours</strong> above to add some.</p></div>')+
          (batches.length?'<h2 class="ui-hours-h">Past downloads</h2><div class="ui-card ui-hours-list">'+batches.map(b=>'<div class="ui-hours-item ui-batch"><span class="ui-hours-copy"><strong>'+escHtml(savedDay(b.downloadedAt))+'</strong><small>'+(b.entryIds||[]).length+' entr'+((b.entryIds||[]).length===1?"y":"ies")+'</small></span><button type="button" class="secondary" data-batch="'+escHtml(b.id)+'">Download again</button></div>').join("")+'</div>':"")+
        '</div>';
      $("#ui-logs-back").onclick=()=>nav("calendar");
      $("#ui-log-add").onclick=()=>{window.chat({quiet:true});setTimeout(()=>window.eviaCoachFlows&&window.eviaCoachFlows.hours(),120)};
      const dl=$("#download-otj");if(dl)dl.onclick=()=>downloadOTJPDF("new");
      document.querySelectorAll("[data-batch]").forEach(b=>b.onclick=()=>downloadOTJPDF(b.dataset.batch));
      document.querySelectorAll("[data-rm-log]").forEach(b=>b.onclick=()=>{if(!confirm("Delete this entry from your learning log?"+(b.dataset.downloaded?" It’s already in a learning hours PDF you downloaded, so tell your assessor.":"")))return;if(window.eviaData.remove("hours",b.dataset.rmLog)){if(typeof persist==="function")persist();openLearningLogs()}});
      window.scrollTo(0,0);
    });
  }
  window.eviaOpenLearningLogs=openLearningLogs;
  /* Progress reviews: each saved review, newest first, with its targets. */
  window.openSavedReviews=function(){
    withFade(()=>{
      const pb=document.getElementById("profile-btn");if(pb)pb.style.display="none";
      $("#page-title").textContent="Progress reviews";
      const reviews=window.eviaGetReviews?window.eviaGetReviews():[],rd=window.eviaReviewDue&&window.eviaReviewDue();
      $("#screen").innerHTML='<button class="secondary ui-back" id="back-reviews-portfolio" type="button">‹ My progress</button><h1 class="ui-sub-title">Progress reviews</h1>'+
        '<div class="ui-page">'+
          (rd?'<section class="ui-card ui-logs-dl"><div><strong>'+(rd.days<0?"Your next review is overdue":"Next review: "+escHtml(savedDay(rd.due)))+'</strong><small>Tap Start my review on My progress</small></div></section>':"")+
          (reviews.length?'<div class="ui-card ui-hours-list">'+reviews.map(r=>{const t=(r.targets||[]).length;return '<button type="button" class="ui-hours-item ui-review-row" data-review-id="'+escHtml(r.id||"")+'"><span class="ui-review-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 21a9 9 0 1 1 9-9"/><path d="M12 12l4-3"/></svg></span><span class="ui-hours-copy"><strong>Review · '+escHtml(savedDay(r.date))+'</strong><small>'+(r.snapshot?r.snapshot.ksbPct+"% evidenced · ":"")+t+' target'+(t===1?"":"s")+' set</small></span><span class="ui-review-chev" aria-hidden="true">›</span></button>'}).join("")+'</div>'
            :'<div class="ui-card ui-empty"><span class="ui-icon-chip">'+icon(ICONS.clock)+'</span><p>No reviews yet. Evia takes you through your first one in the chat: tap <strong>Start my review</strong> on My progress.</p></div>')+
        '</div>';
      $("#back-reviews-portfolio").onclick=()=>nav("learning");
      document.querySelectorAll("[data-review-id]").forEach(b=>b.onclick=()=>{if(window.eviaShowReview)window.eviaShowReview(b.dataset.reviewId)});
      window.scrollTo(0,0);
    });
  };

  /* ---------- Evia chat: stats, write-ups and KSB gaps ---------- */
  const chatBox=()=>document.getElementById("chat");
  const scrollChat=()=>{const c=chatBox();if(c)c.scrollTop=c.scrollHeight};
  let queue=Promise.resolve(),chatGen=0; /* chatGen stops messages queued in a closed chat landing in the next one */
  /* app.js animates each new Evia bubble with "Evia is thinking", so messages are queued to arrive one at a time. */
  function say(html){
    const gen=chatGen;
    queue=queue.then(()=>new Promise(resolve=>{
      const c=chatBox();if(!c||gen!==chatGen)return resolve();
      const d=document.createElement("div");d.className="bubble evia";d.innerHTML=html;c.appendChild(d);scrollChat();
      setTimeout(resolve,1350);
    }));
    return queue;
  }
  let userTurns=0; /* counts the learner's choices, so a late suggestion doesn't land after one */
  function userSays(text){userTurns++;const c=chatBox();if(!c)return;c.querySelectorAll(".ui-replies").forEach(x=>x.remove()); /* earlier suggestions are stale once they've moved on */const d=document.createElement("div");d.className="bubble user";d.textContent=text;c.appendChild(d);scrollChat()}
  /* opt.turns: only show them if the learner hasn't picked or typed anything since they were asked for. */
  function replies(list,opt){
    const gen=chatGen;
    queue=queue.then(()=>{
      const c=chatBox();if(!c||gen!==chatGen)return;
      if(opt&&opt.turns!=null&&opt.turns!==userTurns)return;
      /* Four at a time, the rest behind More. "Something else" is a small link back to Evia's list. */
      const items=list.filter(Boolean),back=items.find(r=>r.back)||(items.some(r=>r.label==="Something else")?{label:"Back to my list",back:true,run:somethingElse}:null);
      const shown=items.filter(r=>!r.back&&r.label!=="Something else");
      if(!shown.length&&back){back.run();return}
      const box=document.createElement("div");box.className="chat-options ui-replies";
      shown.forEach((r,i)=>{const b=document.createElement("button");b.type="button";b.className="chat-pill"+(r.primary?" ui-pill-primary":"")+(i>=3&&shown.length>4?" ui-pill-extra":"");b.innerHTML="<strong>"+escHtml(r.label)+"</strong>";b.onclick=()=>{box.remove();userSays(r.label);r.run()};box.appendChild(b)});
      if(shown.length>4){const m=document.createElement("button");m.type="button";m.className="chat-pill ui-pill-more";m.innerHTML="<strong>More</strong>";m.onclick=()=>{box.classList.add("show-all");m.remove();scrollChat()};box.appendChild(m)}
      if(back){const b=document.createElement("button");b.type="button";b.className="ui-pill-back";b.textContent="‹ "+back.label;b.onclick=()=>{box.remove();back.run()};box.appendChild(b)}
      c.appendChild(box);scrollChat();
    });
  }
  function closeChat(){const x=document.getElementById("x");if(x)x.click()}
  const openUnitFromChat=u=>{closeChat();setTimeout(()=>openUnit(u.index),60)};
  const plural=(n,word)=>n+" "+word+(n===1?"":"s");
  const listText=items=>items.length<2?items.join(""):items.slice(0,-1).join(", ")+" and "+items[items.length-1];
  const more=exclude=>[
    {label:"Check my write-ups",run:writeups},
    {label:"Which KSBs am I missing?",run:ksbGaps},
    {label:"My stats",run:myStats},
    {label:"Something else",run:somethingElse}
  ].filter(r=>r.label!==exclude);

  /* Greedy pick of units that cover the most KSBs still missing evidence. */
  function coverPlan(a){
    const left=new Set(a.units.flatMap(u=>u.missing)),plan=[];
    while(left.size){
      const best=a.units.map(u=>({u,gain:u.codes.filter(c=>left.has(c))})).sort((x,y)=>y.gain.length-x.gain.length||x.u.index-y.u.index)[0];
      if(!best||!best.gain.length)break;
      plan.push({unit:best.u,covers:best.gain});best.gain.forEach(c=>left.delete(c));
    }
    return plan;
  }


  /* ---------- Write-up checker ---------- */
  /* Trade wording that counts as covering a "Things to mention" point, beyond the words themselves. */
  const SYNONYMS={
    "ratio":/\bratios?\b|\b\d+\s*(?::|to)\s*\d+\b|\bparts?\b/,
    "ppe":/\bppe\b|hard ?hat|helmet|hi-?vis|high[- ]vis|gloves?|goggles|safety glasses|glasses|boots|ear (?:defenders|plugs|protection)|dust mask|respirator/,
    "rpe":/\brpe\b|dust mask|respirator|ffp\d|mask/,
    "lev":/\blev\b|extract(?:ion|or)|dust extraction|vacuum/,
    "health & safety":/safe|safety|hazard|risk/,
    "safety":/safe|safety|hazard|risk/,
    "health":/health|wellbeing|well-being|break|hydrat|drink|tired|fatigue/,
    "wellbeing":/wellbeing|well-being|health|break|stress|hydrat|drink|tired|fatigue/,
    "mental":/mental|stress|wellbeing|well-being|talk(?:ed)? to/,
    "physical health":/health|stretch|back|lifting|posture|break/,
    "teamwork":/team|colleague|together|helped|help(?:ing)? (?:the|a|my)|labourer|gang|supervisor|foreman|mate/,
    "communication":/talk|spoke|told|asked|explain|communicat|briefing|radio|discuss/,
    "gauging":/gaug|measur\w* (?:the )?(?:sand|cement)|bucket|gauge box|\b\d+\s*(?::|to)\s*\d+\b|shovels? (?:of|to)|parts? (?:sand|cement)/,
    "mortar":/mortar|\bmix\b|muck/,
    "hand-tool cutting":/\bcut|\bsaw|chisel|bolster|club hammer/,
    "mixers":/mixer/,"drills":/drill|paddle/,
    "silos":/\bsilos?\b/,
    "pre-mix":/pre-?mix|ready-?mix|bagged|premix/,
    "hand":/by hand|hand mix|shovel|spade/,
    "mechanical":/mixer|mechanical|drill|paddle/,
    "mortar quantity":/quantit|how much mortar|batch|bags? of|enough mortar|tonnes?/,
    "safety signage":/\bsigns?\b|signage/,
    "manual handling":/lift|carr(?:y|ied)|manual handling|two-man|team lift|trolley|barrow/,
    "working at height":/height|scaffold|ladder|platform|podium|harness|stepladder/,
    "dpcs":/\bdpcs?\b|damp[- ]?proof/,
    "wall ties":/\bties?\b/,
    "cavity closure":/cavity clos(?:er|ure)|closer/,
    "brick ties":/\bties?\b/,
    "cavity trays":/cavity trays?|\btrays?\b/,
    "insulation":/insulat|\bbatts?\b|kingspan|celotex|rockwool|\bboards?\b/,
    "coshh":/coshh|hazardous substance|cement burn|chemical|irritant/,
    "puwer":/puwer|checked the (?:mixer|saw|tool)|guard|inspect/,
    "risk assessments":/risk assess|\brams\b/,
    "method statements":/method statement|\brams\b/,
    "toolbox talks":/toolbox/,
    "site inductions":/induction/,
    "slips":/slip|housekeeping|tidy|clean(?:ed)? up/,
    "trips":/trip|housekeeping|tidy/,
    "falls":/fall|edge protection|guard ?rail/,
    "drawings":/drawing|\bplans?\b|elevation|section|blueprint/,
    "specifications":/spec(?:ification)?s?\b|specified|drawing/,
    "measuring":/measur|tape|dimension|\bmm\b|metres?|\bcm\b/,
    "cutting":/\bcut|\bsaw/,
    "fixings":/screw|nail|fixing|bolt|plug|\bfixed\b/,
    "timber":/timber|wood|softwood|hardwood|\bmdf\b|\bply/,
    "materials":/material|brick|block|timber|sand|cement|mortar/,
    "waste":/waste|skip|offcut|left ?over/,
    "recycling":/recycl|skip|segregat/,
    "reuse":/re-?use|offcut|left ?over/,
    "resource efficiency":/efficien|waste|offcut|re-?use/,
    "environment":/environment|waste|recycl|dust|noise|spill|run-?off/,
    "sustainability":/sustainab|recycl|waste|re-?use/,
    "hand tools":/tool|trowel|chisel|plane|hammer|level|square|jointer/,
    "tool maintenance":/clean(?:ed)? (?:my |the )?tools?|oil|sharpen|maintain|maintenance/,
    "tool storage":/stor|put away|tool ?box/,
    "sharpening":/sharpen|hone|whetstone/,
    "laser levels":/laser|\blevel/,
    "expansion joints":/expansion|movement joint/,
    "english":/\bbonds?\b|english/,"flemish":/\bbonds?\b|flemish/,"garden":/\bbonds?\b|garden/,"broken bonds":/\bbonds?\b|broken/,
    "joint finishes":/joint|pointing|jointer|flush|recess|weather ?struck|bucket handle|half[- ]round/,
    "frost":/frost|cold|hessian|cover/,"water protection":/rain|water|cover|polythene|sheet/,
    "construction damage":/damage|protect/,
    "defects":/defect|crack|spall|fault|damaged/,
    "repair methods":/repair|replace|cut out|rake out|patch/,
    "electrical safety":/electric|cable|110 ?v|pat test|\brcd\b|lead/,
    "fire safety":/\bfire\b|extinguisher|hot works/,
    "fire extinguishers":/extinguisher/,
    "learning":/learn|improve|next time|feedback|develop|practis|practic/,
    "learning & development":/learn|improve|next time|feedback|develop|practis|practic/,
    "ownership":/responsib|\bown\b|took charge|checked (?:my|it|the)|made sure/,
    "standards":/standard|tolerance|plumb|level|square|\bnhbc\b|straight/,
    "ventilation":/vent|air ?brick|airflow/,
    "hazard identification":/hazard|risk|danger|spotted/,
    "safe systems":/safe system|permit|exclusion zone|barrier|cordon/,
    "mastics":/mastic|sealant|silicone/,
    "ironmongery":/hinge|handle|lock|latch|ironmongery|keep|closer/,
    "scribing":/scrib/,
    "mitring":/mitre|miter/
  };
  window.eviaTermMatched=(term,text)=>termMatched(term,String(text||"").toLowerCase());
  function termMatched(term,text){
    return term.toLowerCase().split("/").some(alt=>{
      alt=alt.trim();
      const syn=SYNONYMS[alt];
      if(syn&&syn.test(text))return true;
      const words=alt.replace(/&/g," ").split(/[^a-z0-9]+/).filter(w=>w.length>=3&&!["and","the","for","with"].includes(w));
      /* Five letters is enough for most words; "-ion" words keep six after the ending, so "inclusion" (inclus) isn't
         found in "including" but "installation" (instal) still is in "install". */
      return words.length>0&&words.every(w=>{const stem=/ions?$/.test(w)?w.replace(/(at)?ions?$/,"").slice(0,6):w.replace(/s$/,"").slice(0,5);return text.includes(stem)});
    });
  }
  const photoCount=e=>Array.isArray(e.photoIds)?e.photoIds.length:Number.isFinite(Number(e.photoCount))?Number(e.photoCount):Array.isArray(e.p)?e.p.length:0;
  const wordCount=t=>String(t||"").trim().split(/\s+/).filter(Boolean).length;
  function checkUnit(u,prompts){
    const latest=u.entries.slice().sort((x,y)=>entryTime(y)-entryTime(x))[0];
    const text=(String(latest.w||"")+" "+(latest.media||[]).map(m=>m.transcript||"").join(" ")).toLowerCase();
    const terms=String((prompts[u.name]||{}).writeup||"").split("·").map(t=>t.trim()).filter(Boolean);
    const covered=terms.filter(t=>termMatched(t,text));
    return {u,terms,covered,missing:terms.filter(t=>!covered.includes(t)),words:wordCount(latest.w),photos:photoCount(latest)};
  }
  function writeups(){
    const a=analyse(),prompts=(window.eviaLearnerPrompts||{})[course]||{};
    const checks=a.units.filter(u=>u.started&&prompts[u.name]).map(u=>checkUnit(u,prompts)).filter(c=>c.terms.length)
      .sort((x,y)=>(y.missing.length/y.terms.length)-(x.missing.length/x.terms.length));
    if(!checks.length){say("You haven’t submitted a unit with a write-up yet. Once you do, I’ll check it covers the key points.");replies([{label:"Go to Topics",primary:true,run:()=>{closeChat();setTimeout(()=>nav("course"),60)}},{label:"Something else",run:somethingElse}]);return}
    const needsWork=checks.filter(c=>c.missing.length||c.words<50||c.photos<3);
    if(!needsWork.length){
      say(pick(["Your write-ups cover all the key points, with plenty of photos. Nice.","I’ve checked your write-ups: they mention everything they should and have good photos. Good job."]));
      if(window.eviaMood)window.eviaMood("happy");
      replies(more("Check my write-ups"));return;
    }
    say("I’ve checked "+plural(checks.length,"write-up")+" against each unit’s things to mention.");
    needsWork.slice(0,2).forEach(c=>{
      let msg="<strong>"+escHtml(c.u.name)+"</strong>: covers <strong>"+c.covered.length+" of "+c.terms.length+"</strong> key points.";
      if(c.missing.length){const list=c.missing.slice(0,3),rest=c.missing.length-list.length;msg+=" Not mentioned yet: "+escHtml(listText(list))+(rest>0?" (plus "+rest+" more)":"")+"."}
      const tips=[];
      if(c.photos<3)tips.push("only "+plural(c.photos,"photo")+", so add ones from the beginning, middle and end of the job");
      if(c.words<50)tips.push("the write-up is short ("+plural(c.words,"word")+"), so explain the steps in more detail");
      if(tips.length)msg+=" Also, "+tips.join("; ")+".";
      say(msg);
    });
    say("You can add these next time you submit evidence for that unit.");
    replies([{label:"Open "+needsWork[0].u.name,primary:true,run:()=>openUnitFromChat(needsWork[0].u)}].concat(more("Check my write-ups").slice(0,2),[{label:"Something else",run:somethingElse}]));
  }

  /* ---------- KSB gaps ---------- */
  function ksbGaps(){
    const a=analyse(),missing=allK().filter(x=>!a.evidenced.has(x[0]));
    if(!missing.length){say("Every KSB on your course has evidence. Brilliant.");if(window.eviaMood)window.eviaMood("happy");replies(more("Which KSBs am I missing?"));return}
    const groups=[["K","Knowledge"],["S","Skills"],["B","Behaviours"]].map(([l,n])=>[n,missing.filter(x=>x[0].startsWith(l)).length]).filter(g=>g[1]);
    say("You still need evidence for <strong>"+plural(missing.length,"KSB")+"</strong>: "+groups.map(g=>g[1]+" "+g[0]).join(", ")+".");
    const plan=coverPlan(a),top=plan.slice(0,3),covered=top.reduce((n,p)=>n+p.covers.length,0);
    say("The fastest way to close the gap: "+top.map(p=>"<strong>"+escHtml(p.unit.name)+"</strong> ("+p.covers.length+")").join(", ").replace(/, ([^,]*)$/," then $1")+". "+(top.length===1?"That one unit":"Those "+top.length+" units")+" would cover "+covered+" of them.");
    replies([
      {label:"Open "+top[0].unit.name,primary:true,run:()=>openUnitFromChat(top[0].unit)},
      {label:"Show the full list",run:()=>{
        [["K","Knowledge"],["S","Skills"],["B","Behaviours"]].forEach(([l,n])=>{const codes=missing.filter(x=>x[0].startsWith(l)).map(x=>x[0]);if(codes.length)say("<strong>"+n+":</strong> "+escHtml(codes.join(", ")))});
        say("Tap any KSB on My progress to see its full wording.");
        replies([{label:"Go to My progress",primary:true,run:()=>{closeChat();setTimeout(()=>nav("progress"),60)}}].concat(more("Which KSBs am I missing?").slice(0,2),[{label:"Something else",run:somethingElse}]));
      }},
      {label:"Something else",run:somethingElse}
    ]);
  }

  /* ---------- My stats ---------- */
  function myStats(){
    const S=window.eviaStats;if(!S){replies(more("My stats"));return}
    const st=S.compute(),ach=S.achievements(st);
    const lines=[];
    lines.push("Last upload: <strong>"+escHtml(S.ago(st.lastUpload))+"</strong>"+(st.packsThisMonth?" · "+plural(st.packsThisMonth,"pack")+" this month":""));
    lines.push(st.streak?"You’ve been active <strong>"+plural(st.streak,"week")+" in a row</strong>."+(st.activeThisWeek?"":" Add something this week to keep it going."):"No streak yet. Add evidence or log learning each week to start one.");
    lines.push("Learning hours: <strong>"+hrsText(st.otjWeek)+"</strong> this week, "+hrsText(st.otjTotal)+" in total.");
    say(lines.join("<br>"));
    if(st.weeksPerUnit!=null)say("You’ve got about <strong>"+plural(st.weeksLeft,"week")+"</strong> left and <strong>"+plural(st.unitsLeft,"unit")+"</strong> still to start. That’s about <strong>"+plural(Math.max(1,Math.floor(st.weeksPerUnit)),"week")+" per unit</strong>"+(st.weeksPerUnit>=2?", which is very doable.":st.weeksPerUnit>=1?", so keep a steady pace.":", so capture every suitable job you get."));
    else if(!st.a.endDate)say("Add your apprenticeship dates in Profile and I’ll work out how many weeks you’ve got per unit.");
    say("Achievements: <strong>"+ach.count+" of "+ach.list.length+"</strong>."+(ach.fresh.length?" New: "+escHtml(listText(ach.fresh.map(x=>x.label)))+".":""));
    if(ach.fresh.length){S.markSeen(ach.fresh.map(x=>x.id));if(window.eviaMood)window.eviaMood("happy")}
    const task=st.confidence.practise.length&&window.eviaPractice?window.eviaPractice.suggestTasks(1)[0]:null;
    if(st.confidence.practise.length)say("From your confidence check, you want more practice on "+escHtml(listText(st.confidence.practise.slice(0,4)))+"."+(task?" A good college task for that: <strong>"+escHtml(task.task.title)+"</strong>.":" Tell your tutor or supervisor so they can help."));
    replies([...(task?[{label:"Show me the task",primary:true,run:()=>{closeChat();setTimeout(()=>window.eviaPractice.openTask(0),60)}}]:[]),{label:"See all my stats",primary:!task,run:()=>{closeChat();setTimeout(showStats,60)}},{label:"Check my write-ups",run:writeups},{label:"Which KSBs am I missing?",run:ksbGaps},{label:"Something else",run:somethingElse}]);
  }
  const hrsText=n=>window.eviaHM(n);
  /* "Something else" brings back what's left on Evia's list. */
  function somethingElse(){
    document.body.classList.remove("evia-epa");
    if(window.eviaTodo)window.eviaTodo.show({again:true});
  }
  function statsFromMenu(){userSays("My stats");myStats()}
  /* My targets: the targets from the latest review, or a new set from Evia if there aren't any. */
  function targetsFromMenu(){
    userSays("My targets");
    const T=window.eviaTargets,{list,created}=T.ensure();
    if(!list.length){say("I need a bit more from you first. Capture some evidence and I’ll set targets.");replies([{label:"Something else",run:somethingElse}]);return}
    T.check(false);
    const now=T.mine(),S=T.stats(),done=now.filter(t=>t.done).length;
    const open=now.filter(t=>!t.done).map(t=>({t,p:T.progress(t,S).pct})).sort((x,y)=>y.p-x.p);
    if(created)say("You didn’t have any targets yet, so I’ve set "+plural(now.length,"target")+" based on how you’re getting on.");
    else say(done===now.length?"You’ve completed all "+now.length+" targets. Brilliant. A progress review will set new ones.":"You’ve completed <strong>"+done+" of "+now.length+"</strong> targets."+(open[0]&&open[0].p>0?" Closest to done: <strong>"+escHtml(open[0].t.title)+"</strong> ("+Math.round(open[0].p*100)+"%).":""));
    const gen=chatGen;
    queue=queue.then(()=>{
      const c=chatBox();if(!c||gen!==chatGen)return;
      const box=document.createElement("div");box.className="chat-targets pg-animate";box.innerHTML=T.cardHtml({chat:true});c.appendChild(box);
      T.bind(box);scrollChat();
      requestAnimationFrame(()=>requestAnimationFrame(()=>{const card=box.querySelector(".pg-card");if(card)card.classList.add("pg-in")}));
    });
    replies([{label:"See them in My progress",primary:true,run:()=>{closeChat();setTimeout(()=>{nav("progress");setTimeout(()=>{const el=document.getElementById("pg-targets");if(el)el.scrollIntoView({block:"start",behavior:"smooth"})},400)},60)}},{label:"My progress review",run:reviewFromMenu},{label:"Something else",run:somethingElse}]);
  }
  /* Progress review: a short click-through of sections; finishing it sets new targets. */
  function reviewFromMenu(){
    userSays("Review me");
    /* Not connected to a college: reviews are with the assessor and employer, so Evia just reminds and helps get ready. */
    if(!(window.eviaNisia&&window.eviaNisia.joined())&&window.eviaReviewReminder)return window.eviaReviewReminder();
    const last=(window.eviaGetReviews?window.eviaGetReviews():[])[0],rd=window.eviaReviewDue?window.eviaReviewDue():null;
    if(rd)say(rd.days<0?"Your review was due on <strong>"+rd.due.toLocaleDateString("en-GB",{day:"numeric",month:"long"})+"</strong>, so now’s a good time.":"Your next review is due on <strong>"+rd.due.toLocaleDateString("en-GB",{day:"numeric",month:"long"})+"</strong>"+(rd.days<=14?", so now’s a good time.":". You can do one early whenever you like."));
    say("We’ll go through it together, right here: where you are, your evidence, learning, tests, skills and staying safe. At the end I’ll set your new targets. It takes about 5 minutes."+(last?" Your last review was on "+new Date(last.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})+".":""));
    replies([{label:"Start my review",primary:true,run:()=>{if(window.eviaChatReview)window.eviaChatReview();else{closeChat();setTimeout(window.eviaStartReview,80)}}},{label:"Not now",run:somethingElse}]);
  }
  /* College task: Evia's pick from the confidence check, or the full list if there isn't one. */
  function taskFromMenu(){
    userSays("Suggest a college task");
    const P=window.eviaPractice,picks=P.suggestTasks(3),all=(window.EVIA_PRACTICE_TASKS||{})[course]||[];
    const open=f=>()=>{closeChat();setTimeout(f,80)};
    if(picks.length){
      const x=picks[0];
      say("Try this in the workshop: <strong>"+escHtml(x.task.title)+"</strong>. It practises "+escHtml(x.covers.join(", "))+", which you rated low in your confidence check. It takes about "+escHtml(x.task.time)+".");
      replies([{label:"Show me the steps",primary:true,run:open(()=>P.openTask(0))},{label:"Open Skills",run:open(P.openAllTasks)},{label:"Something else",run:somethingElse}]);
    }else if(all.length){
      say("I pick college tasks from your confidence check, so I can aim them at the skills you’re least sure of. You haven’t rated anything low yet. Do a quick confidence check, or have a look at all "+all.length+" tasks for your course.");
      replies([{label:"Do a confidence check",primary:true,run:open(P.openConfidence)},{label:"Open Skills",run:open(P.openAllTasks)},{label:"Something else",run:somethingElse}]);
    }else{
      say("I don’t have college tasks for your course yet. Ask your tutor which jobs to practise in the workshop.");
      replies([{label:"Something else",run:somethingElse}]);
    }
  }
  /* Evia's widgets (hour wheel, answer cards, score ring) arrive in turn, after the messages before them. */
  function widget(html,bind){
    const gen=chatGen;
    queue=queue.then(()=>{
      const c=chatBox();if(!c||gen!==chatGen)return;
      const d=document.createElement("div");d.className="ui-widget";d.innerHTML=html;c.appendChild(d);scrollChat();
      if(bind)bind(d);
    });
    return queue;
  }
  /* ---------- Above the message box: only what the chat alone does ----------
     Everything else has its own place in the app (My progress, Teach me, the unit pages) and can be typed here. */
  /* The EPA tile in Teach me: Evia's chat, dark, straight into EPA practice. */
  window.eviaOpenEpa=()=>{window.chat({quiet:true});setTimeout(()=>{const C=window.eviaCoachFlows;if(C&&C.epa)C.epa()},60)};
  const connectedLive=()=>{const e=window.eviaNisia&&window.eviaNisia.joined();return !!(e&&e.live&&window.eviaCheckIn)};
  /* Connected to a college: checking in to class sits under the chat. */
  function buildBar(sheet){
    if(sheet.querySelector(".ui-dock")||!connectedLive())return;
    const dock=document.createElement("div");dock.className="ui-dock";
    dock.innerHTML='<button type="button" class="ui-cat" data-quick="checkin"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 19v1M19 14h1"/></svg><span>Check in to class</span></button>';
    sheet.appendChild(dock);
    dock.querySelector("[data-quick]").onclick=()=>{closeChat();setTimeout(()=>window.eviaCheckIn&&window.eviaCheckIn.open(),80)};
  }
  /* ---------- Review coming up: a count on Evia's button and on "Get ready for review" ----------
     From 21 days before the review (or once it's overdue), the number of things to get ready. */
  /* From 7 days before the review (or once it's overdue), while anything is left to get ready: Evia pulses, and so
     does "Get ready for review" in her chat. It stops when there's nothing left. */
  function prepBadge(){
    try{const rd=window.eviaReviewDue&&window.eviaReviewDue();if(!rd||rd.days>7)return 0;return window.eviaReviewPrepCount?window.eviaReviewPrepCount():0}catch(_){return 0}
  }
  function drawFabBadge(){
    const fab=document.getElementById("evia-fab");if(!fab)return;
    let ring=fab.querySelector(".fab-pulse");const n=document.body.classList.contains("evia-onboarding")?0:prepBadge();
    if(!n){if(ring)ring.remove();fab.removeAttribute("data-review");fab.setAttribute("aria-label","Open Evia");return}
    if(!ring){ring=document.createElement("span");ring.className="fab-pulse";ring.setAttribute("aria-hidden","true");fab.prepend(ring)}
    fab.dataset.review="1";fab.setAttribute("aria-label","Open Evia: "+n+" thing"+(n===1?"":"s")+" to get ready for your review");
  }
  window.eviaDrawFabBadge=drawFabBadge;
  setTimeout(drawFabBadge,1600);
  let badgeT=null;if(window.eviaData&&window.eviaData.on)window.eviaData.on("change",()=>{clearTimeout(badgeT);badgeT=setTimeout(drawFabBadge,400)});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)drawFabBadge()});
  function enhanceChat(opts){
    const c=chatBox();if(!c)return;
    queue=Promise.resolve();chatGen++;
    const sheet=c.closest(".chat-sheet");
    const head=sheet&&sheet.querySelector(".sheet-head h2");if(head)head.innerHTML='<span class="evia-mini ev-head-face" aria-hidden="true"><span class="evia-face"><i></i><i></i></span></span>Evia';
    c.innerHTML="";
    /* Evia opens with what needs doing (evia-todo.js). */
    if(!(opts&&opts.quiet===true)&&window.eviaTodo)window.eviaTodo.show();
    if(sheet)buildBar(sheet);
  }
  /* After a test: celebrate a good score and offer what to do next. */
  window.addEventListener("evia:test-saved",e=>{
    if(!chatBox())return;
    const d=e.detail||{};
    if(window.eviaMood)window.eviaMood(d.pct>=60?"happy":"oops");
    const opts=[{label:"Test me again",primary:true,run:()=>{if(window.eviaTestMe)window.eviaTestMe()}}];
    if(window.eviaReviewDraft&&window.eviaReviewDraft()){opts[0].primary=false;opts.unshift({label:"Back to my review",primary:true,run:()=>{closeChat();setTimeout(()=>window.eviaResumeReview&&window.eviaResumeReview(),60)}})}
    if(d.missed&&d.missed.length)opts.push({label:"Go to My progress",run:()=>{closeChat();setTimeout(()=>nav("progress"),60)}});
    opts.push({label:"Something else",run:somethingElse});
    queue=queue.then(()=>new Promise(r=>setTimeout(r,1400))); /* let the result bubble finish "thinking" first */
    const pct=Math.max(0,Math.min(100,Number(d.pct)||0)),r=34,c=2*Math.PI*r;
    widget('<div class="ui-score"><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="'+r+'" class="ui-score-track"/><circle cx="40" cy="40" r="'+r+'" class="ui-score-fill" style="--len:'+c.toFixed(1)+';--v:'+(c*pct/100).toFixed(1)+'" transform="rotate(-90 40 40)"/></svg><strong>'+pct+'%</strong><span>'+(pct>=80?"Brilliant":pct>=60?"Good effort":"Keep going")+'</span></div>',el=>requestAnimationFrame(()=>requestAnimationFrame(()=>el.querySelector(".ui-score").classList.add("in"))));
    replies(opts);
  });

  /* Page heading in the strip beside the profile button: where you are, and which course. */
  const pageHead=title=>'<header class="ui-page-head"><h1>'+escHtml(title)+'</h1><span>'+escHtml(data().name)+'</span></header>';

  /* ---------- Date wheel: every date field opens a day / month / year wheel instead of the phone's calendar ---------- */
  const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtDate=v=>{if(!v)return"";const d=new Date(v+"T12:00:00");return isNaN(d)?"":d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})};
  function openDateWheel(input,label){
    const ITEM=40,now=new Date(),cur=input.value?new Date(input.value+"T12:00:00"):now;
    const years=[];for(let y=now.getFullYear()-8;y<=now.getFullYear()+8;y++)years.push(y);
    const col=(name,vals,fmt)=>'<div class="hw-col dw-col" data-col="'+name+'" tabindex="0" role="listbox" aria-label="'+name+'"><div class="hw-pad"></div>'+vals.map(v=>'<div class="hw-item" data-v="'+v+'" role="option">'+fmt(v)+'</div>').join("")+'<div class="hw-pad"></div></div>';
    const ov=document.createElement("div");ov.className="overlay dw-overlay";
    ov.innerHTML='<section class="sheet pr-sheet dw-sheet" role="dialog" aria-modal="true" aria-label="'+escHtml(label||"Choose a date")+'"><div class="sheet-head"><div><div class="chat-kicker">CHOOSE A DATE</div><h2>'+escHtml(label||"Date")+'</h2></div><button class="close" type="button" aria-label="Close">×</button></div>'+
      '<div class="hw dw"><div class="hw-band" aria-hidden="true"></div>'+col("Day",[...Array(31).keys()].map(i=>i+1),v=>v)+col("Month",[...Array(12).keys()],v=>MONTHS[v])+col("Year",years,v=>v)+'</div>'+
      '<p class="hw-readout dw-readout" aria-live="polite"></p><div class="pr-actions"><button type="button" class="secondary dw-clear">Clear</button><button type="button" class="primary dw-ok">Done</button></div></section>';
    document.body.appendChild(ov);
    const cols={d:ov.querySelector('[data-col="Day"]'),m:ov.querySelector('[data-col="Month"]'),y:ov.querySelector('[data-col="Year"]')},out=ov.querySelector(".dw-readout");
    const idx=c=>Math.round(c.scrollTop/ITEM);
    const val=()=>{const y=years[Math.max(0,Math.min(years.length-1,idx(cols.y)))],m=Math.max(0,Math.min(11,idx(cols.m))),max=new Date(y,m+1,0).getDate(),d=Math.min(max,Math.max(1,idx(cols.d)+1));return {y,m,d,max}};
    const show=()=>{const v=val();Object.values(cols).forEach(c=>{const i=idx(c);c.querySelectorAll(".hw-item").forEach((it,n)=>it.classList.toggle("on",n===i))});
      cols.d.querySelectorAll(".hw-item").forEach((it,n)=>it.classList.toggle("off",n+1>v.max));
      out.textContent=new Date(v.y,v.m,v.d).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})};
    Object.values(cols).forEach(c=>{let t=null;c.addEventListener("scroll",()=>{clearTimeout(t);t=setTimeout(show,60)},{passive:true});
      c.addEventListener("keydown",e=>{if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();c.scrollBy({top:e.key==="ArrowDown"?ITEM:-ITEM})}});
      c.querySelectorAll(".hw-item").forEach((it,n)=>it.onclick=()=>c.scrollTo({top:n*ITEM,behavior:reduced()?"auto":"smooth"}))});
    requestAnimationFrame(()=>{cols.d.scrollTop=(cur.getDate()-1)*ITEM;cols.m.scrollTop=cur.getMonth()*ITEM;cols.y.scrollTop=Math.max(0,years.indexOf(cur.getFullYear()))*ITEM;show()});
    const close=()=>{ov.classList.add("ui-closing");setTimeout(()=>ov.remove(),reduced()?0:170)};
    const set=v=>{input.value=v;input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));const b=input.nextElementSibling;if(b&&b.classList.contains("dw-field"))paintField(b,input)};
    ov.querySelector(".close").onclick=close;
    ov.addEventListener("click",e=>{if(e.target===ov)close()});
    ov.querySelector(".dw-clear").onclick=()=>{set("");close()};
    ov.querySelector(".dw-ok").onclick=()=>{const v=val();set(v.y+"-"+String(v.m+1).padStart(2,"0")+"-"+String(v.d).padStart(2,"0"));close()};
  }
  const CAL='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
  function paintField(btn,input){btn.innerHTML='<span>'+(input.value?escHtml(fmtDate(input.value)):'<em>Choose a date</em>')+'</span>'+CAL}
  function enhanceDates(root){
    (root||document).querySelectorAll('input[type="date"]:not([data-dw])').forEach(input=>{
      input.dataset.dw="1";
      const label=(input.closest("label")&&input.closest("label").childNodes[0]&&input.closest("label").childNodes[0].textContent.trim())||input.getAttribute("aria-label")||"Date";
      input.type="hidden";
      const btn=document.createElement("button");btn.type="button";btn.className="dw-field";btn.setAttribute("aria-label",label);
      paintField(btn,input);input.insertAdjacentElement("afterend",btn);
      /* Dates set by the college (Nisia) can't be changed here. */
      if(input.readOnly){btn.disabled=true;btn.classList.add("dw-locked");return}
      btn.onclick=e=>{e.preventDefault();openDateWheel(input,label)};
    });
  }
  /* Evia steps aside while any panel other than her chat is open. */
  const panelWatch=()=>{const m=document.getElementById("modal-root");const open=!!(m&&m.querySelector(".overlay,.profile-overlay,.ksb-modal-overlay")&&!m.querySelector(".chat-sheet"))||!!document.querySelector(".dw-overlay,.tm,.ex");document.body.classList.toggle("ui-panel-open",open)};
  new MutationObserver(()=>{enhanceDates();panelWatch()}).observe(document.getElementById("modal-root")||document.body,{childList:true,subtree:true});
  new MutationObserver(panelWatch).observe(document.body,{childList:true});
  window.eviaDateWheel=openDateWheel;

  /* ---------- Wire into the app ---------- */
  const originalRender=window.render,originalChat=window.chat;
  /* Two tabs either side of Evia. Old screen names still work: Portfolio is Course's "My evidence", Progress is Learning. */
  const TOP_SCREENS=["course","learning"];
  window.render=function(){
    hideBubble();
    if(screen==="home")screen="course";
    if(screen==="portfolio")screen="course";
    if(screen==="progress")screen="learning";
    /* Hours are logged with Evia now: the old Hours page opens My progress with Evia asking what you did. */
    if(screen==="hours"){screen="learning";setTimeout(()=>{window.chat({quiet:true});setTimeout(()=>window.eviaCoachFlows&&window.eviaCoachFlows.hours(),60)},200)}
    const scr=document.getElementById("screen");if(scr)scr.classList.toggle("ui-top",TOP_SCREENS.includes(screen));
    if(screen==="learning"){
      const pb=document.getElementById("profile-btn");if(pb)pb.style.display="flex";
      document.querySelectorAll("[data-nav]").forEach(b=>b.classList.toggle("active",b.dataset.nav==="learning"));
      if(window.eviaProgressPage)window.eviaProgressPage();else progressScreen();
      return;
    }
    originalRender();
  };
  window.progress=progressScreen;
  window.learning=()=>window.eviaProgressPage?window.eviaProgressPage():progressScreen();
  const originalCourses=window.courses;
  window.courses=function(){
    originalCourses();
    const head=document.querySelector("#screen > .card:not(.unit-card)");
    if(head)head.remove();
    document.getElementById("screen").insertAdjacentHTML("afterbegin",pageHead("Topics").replace('class="ui-page-head"','class="ui-page-head" id="ui-course-head"'));
    /* The units sit together in one grouped list. */
    const scr=document.getElementById("screen"),units=[...scr.querySelectorAll(":scope > .unit-card[data-u]")];
    if(units.length){const list=document.createElement("div");list.className="ui-unit-list";units[0].before(list);units.forEach((u,i)=>{u.insertAdjacentHTML("afterbegin",'<span class="ui-unit-no" aria-hidden="true">'+(i+1)+'</span>');list.appendChild(u)});
      list.insertAdjacentHTML("beforebegin",'<h2 class="ui-section-label">Topics</h2>')}
    /* Supporting evidence sits in its own grouped list, like the units. */
    const sup=scr.querySelector(":scope > .supporting-course-card");
    if(sup){const box=document.createElement("div");box.className="ui-unit-list ui-sup-list";sup.before(box);box.appendChild(sup);box.insertAdjacentHTML("beforebegin",'<h2 class="ui-section-label">Workplace evidence</h2>')}
    /* The summary at the top, in the same card style as My progress. */
    const top=document.getElementById("ui-course-head");if(top)top.insertAdjacentHTML("afterend",courseHero());
    /* Learning logs live on the Calendar now, and past reviews on My progress. */
    courseNudge();
  };
  function courseHero(){
    const nvq=window.eviaNvq&&window.eviaNvq.on(),us=data().u,lv=us.map(u=>unitStrengthForCourse(u[0])),n=lv.filter(Boolean).length,c=k=>lv.filter(l=>l===k).length,pct=us.length?Math.round(n/us.length*100):0;
    return '<div class="pv-card pv-alert ui-hero"><span class="pv-head"><span class="pv-title">'+(nvq?"Site jobs with evidence":"Topics with evidence")+'</span></span><span class="pv-big">'+n+'<small> / '+us.length+'</small></span>'+
      '<span class="pv-sub">'+(n?c("strong")+" strong · "+c("good")+" good · "+c("weak")+" weak":"Open a "+(nvq?"job":"topic")+" to capture your first evidence")+'</span><i class="pv-bar ui-hero-bar"><i style="width:'+pct+'%"></i></i></div>';
  }
  window.portfolio=()=>window.courses();
  /* Evia's bubble belongs to the course list: it goes when anything else (a unit, supporting evidence) replaces it. */
  const scrEl=document.getElementById("screen");
  if(scrEl)new MutationObserver(()=>{const bb=document.getElementById("ui-evia-bubble");if(!document.getElementById("ui-course-head")&&bb&&!bb.dataset.keep)hideBubble()}).observe(scrEl,{childList:true});
  /* Page changes fade: the current page fades out, the new one fades in. */
  const reduced=()=>window.eviaAccessibility?window.eviaAccessibility.reducedMotion():matchMedia("(prefers-reduced-motion: reduce)").matches;
  let fadeTimer=null;
  function withFade(change){
    const scr=document.getElementById("screen");
    if(!scr||reduced()||document.body.classList.contains("evia-onboarding")){change();return}
    clearTimeout(fadeTimer);
    scr.classList.remove("ui-entering");scr.classList.add("ui-leaving");
    fadeTimer=setTimeout(()=>{
      const show=()=>{scr.classList.remove("ui-leaving");void scr.offsetWidth;scr.classList.add("ui-entering");fadeTimer=setTimeout(()=>scr.classList.remove("ui-entering"),260)};
      let r;try{r=change()}catch(e){show();throw e}
      Promise.resolve(r).then(show,show); /* some pages (a unit) load photos first */
    },140);
  }
  const originalNav=window.nav,originalOpenUnit=window.openUnit;
  window.nav=function(s){withFade(()=>originalNav(s))};
  window.openUnit=function(i,step){withFade(()=>originalOpenUnit(i,step))};
  /* The other full pages fade the same way. */
  ["openSupportingEvidence","eviaOpenSendToPortfolio"].forEach(name=>{const f=window[name];if(typeof f==="function")window[name]=function(){const args=arguments;return withFade(()=>f.apply(this,args))}});
  /* Pop-up panels fade out when closed with ✕ or a tap outside, instead of vanishing. */
  const fadeClose=(e,trigger)=>{
    const ov=trigger.closest("#modal-root .overlay");
    if(!ov||trigger.dataset.fading==="1"||reduced())return;
    e.stopImmediatePropagation();e.preventDefault();
    trigger.dataset.fading="1";ov.classList.add("ui-closing");
    setTimeout(()=>{if(document.body.contains(trigger))trigger.click()},170);
  };
  document.addEventListener("click",e=>{
    const t=e.target;if(!(t instanceof Element))return;
    const btn=t.closest("#modal-root .close,#modal-root #x");
    if(btn){fadeClose(e,btn);return}
    if(t.matches("#modal-root .overlay")&&!t.querySelector(".chat-sheet"))fadeClose(e,t);
  },true);
  window.chat=function(opts){hideBubble();originalChat();enhanceChat(opts);if(window.eviaMood)window.eviaMood("happy")};
  $("#evia-fab").onclick=window.chat;
  window.eviaCoach={analyse,suggestion,checkUnit,showStats};
  window.eviaStartTest=startTest;
  window.eviaChatKit={runNudge,say,replies,userSays,widget,closeChat,chatBox,scrollChat,somethingElse,analyse,checkUnit,writeups,taskFromMenu,reviewFromMenu,openUnitFromChat,pick,plural,listText,firstName,escHtml,get turns(){return userTurns}};
  if(!document.body.classList.contains("evia-onboarding"))render();
})();
