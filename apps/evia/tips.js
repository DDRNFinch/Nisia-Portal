/* Evia7 first-visit tips: the first time a learner opens a page or section, Evia says in a line or two what it is and how
   it's used (the guided and free range sheets explain themselves). Each shows once, ever (kept on the phone). Nothing shows during the first-run tour, and what the tour has
   already explained is marked as seen (eviaTips.seen). Loaded last, so it sees each page as it is finally drawn.
   eviaTips.seen(key)   eviaTips.show(key)   eviaTips.reset() */
(function(){
  const KEY="evia7-tips-seen";
  const TIPS={
    course:["Topics","Your course topics are here. Open one to add evidence. The bar shows how much of your course has evidence so far."],
    unit:["Evidence pack","Let me guide you step by step, or go free range. What you’re working on, and what you’ve saved, shows below."],
    learning:["My progress","How you’re doing on your course. Tap any card to see more."],
    teach:["Learn","Short lessons for your course, maths and English, tests and games. Finish one for a medal and coins, then spend them in the Shop."],
    rewards:["Shop","Spend your coins on new looks for me. Lessons, evidence and learning hours earn them."],
    calendar:["Calendar","Your college days come from your tutor. Check in on the day, or tell me if you can’t make it. Your learning hours show here too."],
    supporting:["Supporting evidence","Extra proof for your units: witness statements, videos, voice notes and documents."],
    share:["Share with your assessor","Pick the evidence you want, and it’s shared as one PDF."],
    evia:["That’s me","Pick what you need: I can check your evidence, log your learning hours or give you a practice test."],
    profile:["Your profile","Your details, your signature and your backups. Your signature goes on the evidence you save."],
    lesson:["Your first lesson","Read, then answer. Anything you get wrong comes back at the end. Finish for a medal."],
    review:["Progress review","Every three months we look back at how it’s going and set your next targets."]
  };
  /* Sections that open over the page, found by what's on screen. */
  const SECTIONS=[
    ["evia",()=>!!document.querySelector("#modal-root .chat-sheet")],
    ["profile",()=>!!document.querySelector(".profile-sheet")],
    ["review",()=>!!document.querySelector(".rv-sheet")],
    ["lesson",()=>!!document.querySelector(".tm:not(#ob-lesson) .tm-lbar .tm-prog")]
  ];
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v:[]}catch(_){return []}};
  const isSeen=k=>{const s=read();return s.includes("*")||s.includes(k)};
  const seen=k=>{const s=read();if(!s.includes(k)){s.push(k);try{localStorage.setItem(KEY,JSON.stringify(s))}catch(_){}}};
  /* Only once the first-run tour is over, and not over the welcome or pickers. */
  const ready=()=>{
    if(document.body.classList.contains("evia-onboarding")||document.getElementById("evia-onboard-course")||document.getElementById("welcome-screen")||document.getElementById("evia-theme-screen"))return false;
    try{return /"done"/.test(localStorage.getItem("evia7-onboarding")||"")}catch(_){return false}
  };
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  let card=null,showing=null;const queue=[];
  function style(){
    if(document.getElementById("evia-tips-style"))return;
    const s=document.createElement("style");s.id="evia-tips-style";
    s.textContent=`
      .ev-tip{position:fixed;z-index:10050;left:50%;width:min(460px,calc(100% - 28px));transform:translate(-50%,12px);opacity:0;display:flex;flex-direction:column;gap:10px;
        padding:14px;border-radius:22px;background:#fff;border:1px solid var(--pm-hair,rgba(16,24,40,.08));box-shadow:0 16px 40px rgba(16,24,40,.18);transition:opacity .22s ease,transform .22s ease}
      .ev-tip.bottom{bottom:calc(max(14px,env(safe-area-inset-bottom)) + 96px)}
      .ev-tip.top{top:calc(max(12px,env(safe-area-inset-top)) + 8px)}
      .ev-tip.show{opacity:1;transform:translate(-50%,0)}
      .ev-tip-row{display:flex;gap:10px;align-items:flex-start}
      .ev-tip-row .evia-mini{flex:0 0 auto;width:34px;height:34px}
      .ev-tip strong{display:block;font-size:15px;margin-bottom:2px;color:var(--ui-ink,#172033)}
      .ev-tip p{margin:0;font-size:14px;line-height:1.45;color:var(--ui-muted,#475467)}
      .ev-tip button{align-self:flex-end;min-height:40px;padding:8px 20px;border-radius:13px}
      body.evia-keyboard-editing .ev-tip{opacity:0;pointer-events:none}
      @media(prefers-reduced-motion:reduce){.ev-tip{transition:none}}`;
    document.head.appendChild(s);
  }
  function close(){
    if(!card)return;const c=card;card=null;showing=null;c.classList.remove("show");setTimeout(()=>c.remove(),220);
    if(queue.length)setTimeout(()=>show(queue.shift()),300);
  }
  function show(k){
    if(!TIPS[k]||isSeen(k)||!ready())return false;
    if(showing){if(showing!==k&&!queue.includes(k))queue.push(k);return false}
    style();seen(k);showing=k;
    /* Over a sheet or full screen, the note sits at the top so it doesn't cover the buttons. */
    const over=document.querySelector("#modal-root .overlay,#modal-root .profile-overlay,.tm");
    card=document.createElement("div");card.className="ev-tip "+(over?"top":"bottom");card.setAttribute("role","status");card.setAttribute("aria-live","polite");
    card.innerHTML='<div class="ev-tip-row"><span class="evia-mini" aria-hidden="true"><span class="evia-face"><i></i><i></i></span></span><div><strong>'+esc(TIPS[k][0])+'</strong><p>'+esc(TIPS[k][1])+'</p></div></div>'+
      '<button type="button" class="primary">Got it</button>';
    card.querySelector("button").onclick=close;
    document.body.appendChild(card);
    requestAnimationFrame(()=>requestAnimationFrame(()=>card&&card.classList.add("show")));
    return true;
  }

  /* Pages: after each one is drawn. */
  const later=k=>setTimeout(()=>show(k),450);
  const wrap=(name,key)=>{const f=window[name];if(typeof f!=="function")return;window[name]=function(){const r=f.apply(this,arguments);later(typeof key==="function"?key():key);return r}};
  wrap("render",()=>{const s=typeof screen==="string"?screen:"";return s==="progress"?"learning":s});
  wrap("openUnit","unit");
  wrap("openSupportingEvidence","supporting");
  wrap("eviaOpenSendToPortfolio","share");
  /* Sections: watch for them appearing. */
  let pending=false;
  new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;if(!ready())return;
    for(const [k,test]of SECTIONS){if(!isSeen(k)&&test()){setTimeout(()=>{if(test())show(k)},350);break}}})}).observe(document.body,{childList:true,subtree:true});
  /* Closing the section a note belongs to closes the note too. */
  new MutationObserver(()=>{if(!card||!showing)return;const s=SECTIONS.find(x=>x[0]===showing);if(s&&!s[1]())close()}).observe(document.body,{childList:true,subtree:true});

  window.eviaTips={seen,show,reset(){try{localStorage.removeItem(KEY)}catch(_){}},TIPS};
})();
