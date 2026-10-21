/* Evia7 messages: the message icon beside the profile button (to its left, clear of the page underneath), for learners connected to their college. It opens the
   conversations with their tutor, assessor and employer (messages-ui.js, the same in every Evia Portal app). The icon
   shows whenever the profile button does (not in the chat, games, the tour or full-screen sheets), and Evia's own list
   of things to do mentions unread messages (evia-todo.js). A notification about a message opens them (nisia.js). */
(function(){
  if(!window.NisiaMessages)return;
  const N=()=>window.eviaNisia;
  const live=()=>{try{const e=N()&&N().joined();return !!(e&&e.live)}catch(_){return false}};
  /* Shown with the profile button, so it comes and goes with it. */
  const shown=()=>{
    if(!live())return false;
    const pb=document.getElementById("profile-btn");if(!pb)return false;
    const cs=getComputedStyle(pb),h=document.documentElement;
    return cs.display!=="none"&&cs.visibility!=="hidden"&&!h.classList.contains("gm-open")&&!document.body.classList.contains("evia-onboarding");
  };
  const M=window.NisiaMessages.mount({app:"evia",color:"var(--yellow,#e7b900)",ink:"var(--yellow-ink,#6e5c00)",soft:"var(--soft,#fff7d6)",on:"var(--ui-on-accent,#172033)",
    rpc:(fn,args)=>N().call(fn,args),ready:shown,top:12,right:62,
    onUnread:n=>{try{localStorage.setItem("evia7-messages-unread",String(n||0))}catch(_){}}});
  window.eviaMessages=M;
  /* Follow the profile button straight away rather than on the next tick. */
  const watch=()=>{const pb=document.getElementById("profile-btn");if(!pb)return setTimeout(watch,500);
    const mo=new MutationObserver(()=>M.update());mo.observe(pb,{attributes:true,attributeFilter:["style","class"]});
    mo.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});mo.observe(document.body,{attributes:true,attributeFilter:["class"]})};
  watch();
  if(N()&&N().onStatus)N().onStatus(()=>M.refresh());
})();
