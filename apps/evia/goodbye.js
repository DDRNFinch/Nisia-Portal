/* Evia7 goodbye: when the college marks the learner as finished (or as having left) in Evia Portal, Evia says so, kindly,
   the next time it hears from the college (nisia.js puts {status, on} on the enrolment as ended). Everything they added
   stays on their phone; they can download a copy of their portfolio, and keep using Evia on their own (the college
   connection ends, so nothing more goes to the college and the message icon goes). Shown once; "Not now" brings it back
   in 3 days.
   window.eviaGoodbye: show(force) */
(function(){
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const KEY="evia7-goodbye";
  const seen=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"null")||{}}catch(_){return {}}};
  const mark=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch(_){}};
  const busy=()=>document.querySelector("#modal-root .overlay,.chat-sheet,.nm-overlay")||document.body.classList.contains("evia-onboarding");
  function show(force){
    const e=window.eviaData.enrolment&&window.eviaData.enrolment(),end=e&&e.ended;if(!end)return false;
    const k=end.status+"|"+(end.on||""),s=seen();
    if(!force&&(s.done===k||(s.later===k&&Date.now()<(s.until||0))))return false;
    if(!force&&busy()){setTimeout(()=>show(),4000);return false}
    const done=end.status==="completed",college=e.college||"Your college",when=end.on?new Date(end.on+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"long"}):"";
    const name=((window.eviaData.learner()||{}).name||"").split(" ")[0];
    if(window.eviaMood)try{window.eviaMood(done?"happy":"calm")}catch(_){}
    const root=document.getElementById("modal-root");
    root.innerHTML='<div class="overlay pv-overlay"><section class="sheet pr-sheet pv-sheet gb-sheet" role="dialog" aria-modal="true" aria-labelledby="gb-title"><div class="sheet-head"><div><div class="chat-kicker">'+esc(college.toUpperCase())+'</div><h2 id="gb-title">'+(done?"You’ve finished"+(name?", "+esc(name):"")+"!":"Your course has ended")+'</h2></div></div><div class="pr-body">'+
      '<p style="font-size:16px;line-height:1.55;margin:0 0 12px">'+(done?esc(college)+" has marked your apprenticeship as finished"+(when?" on "+esc(when):"")+". That’s a big achievement. Well done.":esc(college)+" has marked you as having left your course"+(when?" on "+esc(when):"")+". We’re sorry to see you go, and we hope the next step goes well.")+'</p>'+
      '<p style="font-size:15px;line-height:1.55;margin:0 0 16px;color:var(--ui-text,#344054)">Everything you added is still on this phone: your evidence, photos, learning hours and reviews. Download a copy of your portfolio to keep, and you can carry on using Evia on your own.</p>'+
      '<div style="display:flex;flex-direction:column;gap:8px">'+
        '<button type="button" class="rp-btn primary gb-btn" id="gb-dl" style="border:0;border-radius:14px;padding:13px;font-weight:700;font-size:15px;background:var(--yellow,#e7b900);color:var(--ui-on-accent,#172033)">Download my portfolio</button>'+
        '<button type="button" class="gb-btn" id="gb-own" style="border:0;border-radius:14px;padding:13px;font-weight:700;font-size:15px;background:#f2f4f7;color:#172033">Keep using Evia on my own</button>'+
        '<button type="button" class="gb-btn" id="gb-later" style="border:0;background:none;padding:10px;color:var(--ui-muted,#667085);font-size:14px">Not now</button></div>'+
      '</div></section></div>';
    root.querySelector("#gb-dl").onclick=()=>{try{if(typeof window.downloadEvidencePack==="function")window.downloadEvidencePack();else if(window.eviaOpenSendToPortfolio)window.eviaOpenSendToPortfolio()}catch(err){console.warn("Evia: goodbye download",err&&err.message)}};
    root.querySelector("#gb-own").onclick=()=>{
      mark({done:k});
      /* The college connection ends; what they made stays. */
      const now=window.eviaData.enrolment();if(now)window.eviaData.enrol(Object.assign({},now,{live:false}));
      root.innerHTML="";if(window.eviaMessages)window.eviaMessages.update();if(typeof render==="function")try{render()}catch(_){}
    };
    root.querySelector("#gb-later").onclick=()=>{mark({later:k,until:Date.now()+3*864e5});root.innerHTML=""};
    return true;
  }
  addEventListener("load",()=>setTimeout(()=>show(),3000));
  window.eviaGoodbye={show};
})();
