/* Evia7 messages: for learners connected to their college, the conversations with their tutor, assessor and employer
   (messages-ui.js, the same in every Evia Portal app). They open from the Messages row on the College tab, which shows
   the unread number (calendar.js); Evia's own list of things to do mentions unread messages (evia-todo.js), and a
   notification about a message opens them (nisia.js). */
(function(){
  if(!window.NisiaMessages)return;
  const N=()=>window.eviaNisia;
  const live=()=>{try{const e=N()&&N().joined();return !!(e&&e.live)}catch(_){return false}};
  /* No icon of its own: Messages is on the College tab (calendar.js), with the unread number on the tab. */
  const M=window.NisiaMessages.mount({app:"evia",color:"var(--yellow,#e7b900)",ink:"var(--yellow-ink,#6e5c00)",soft:"var(--soft,#fff7d6)",on:"var(--ui-on-accent,#172033)",
    rpc:(fn,args)=>N().call(fn,args),ready:live,place:b=>b.remove(),
    onUnread:n=>{try{localStorage.setItem("evia7-messages-unread",String(n||0))}catch(_){}if(window.eviaCollegeUnread)window.eviaCollegeUnread(n)}});
  window.eviaMessages=M;
  if(N()&&N().onStatus)N().onStatus(()=>M.refresh());
})();
