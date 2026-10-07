/* The class quiz, on the learner's phone. When the tutor runs the quiz in Symi, everyone on the class answers here:
   the question and its answers come up on their own (Evia checks every few seconds on a college day), they tap one,
   and can change it until the tutor shows the answer. Then they see if they were right and why, and at the end their
   score, with coins for the right ones. The score goes to Nisia (their tutor and assessor see it); the right answer
   never reaches the phone before the tutor shows it.
   window.eviaClassQuiz: check() */
(function(){
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const L="ABCDEFGH",COINS="evia7-class-quiz-coins";
  const dkey=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  let timer=null,layer=null,drawn="",away="",live=null,picking=false;
  const N=()=>window.eviaNisia,A=()=>window.NisiaActions;
  /* Only on a day with a class, and only while Evia is open, so it costs nothing the rest of the time. */
  function classToday(){
    const n=N();if(!n||!n.joined||!n.joined()||!n.joined().live)return false;const k=dkey(new Date());
    try{if((n.sessions()||[]).some(s=>s.session_date===k))return true}catch(_){}
    try{return (n.timetableDays(k,k)||[]).length>0}catch(_){return false}
  }
  async function check(){
    clearTimeout(timer);let wait=60000;
    if(document.visibilityState==="visible"&&navigator.onLine!==false&&classToday()&&A()){
      wait=live?2500:8000;
      try{show(await A().send("quizNow",{}))}catch(_){/* try again next time */}
    }
    timer=setTimeout(check,wait);
  }
  function close(){if(layer){layer.remove();layer=null}drawn=""}
  function coins(q){
    const done=JSON.parse(localStorage.getItem(COINS)||"{}");if(done[q.id]||!q.right)return 0;
    const R=window.eviaRewards,got=R&&R.gameCoins?R.gameCoins(q.right*2):0;done[q.id]=got||1;try{localStorage.setItem(COINS,JSON.stringify(done))}catch(_){}
    return got;
  }
  function show(q){
    live=q&&!q.finished?q:null;
    if(!q){close();return}
    const key=[q.id,q.current,q.revealed,q.finished,q.mine].join(":");
    if(away&&away===q.id+":"+q.current+":"+q.revealed&&!q.finished)return;
    if(q.finished&&away===q.id+":end")return;
    if(key===drawn&&layer)return;
    drawn=key;
    if(!layer){layer=document.createElement("div");layer.id="cq-view";layer.setAttribute("role","dialog");layer.setAttribute("aria-modal","true");layer.setAttribute("aria-label","Class quiz");document.body.appendChild(layer)}
    const head='<header class="cq-head"><span><small>'+esc(q.class||"Class quiz")+'</small><b>'+(q.finished?"Quiz done":"Question "+(q.current+1)+" of "+q.total)+'</b></span><button type="button" class="cq-x" aria-label="Close">×</button></header>';
    if(q.finished){
      const got=coins(q);
      layer.innerHTML='<div class="cq-card">'+head+'<div class="cq-done"><p class="cq-big">'+q.right+' of '+q.total+'</p><p>'+(q.right>=q.total*0.8?"Brilliant! You really know this.":q.right>=q.total/2?"Good going. Your tutor will go over the rest.":"Keep at it: Teach me has lessons on this.")+'</p>'+
        (got?'<p class="cq-coins">+'+got+' coins</p>':"")+'</div><button type="button" class="cq-btn" data-ok>Done</button></div>';
      layer.querySelector("[data-ok]").onclick=()=>{away=q.id+":end";close()};
    }else{
      const opts=q.opts||[],right=q.revealed&&q.mine!=null&&q.mine===q.a;
      layer.innerHTML='<div class="cq-card">'+head+'<h2 class="cq-q">'+esc(q.q)+'</h2>'+
        '<div class="cq-opts">'+opts.map((o,k)=>'<button type="button" class="cq-opt'+(q.mine===k?" cq-mine":"")+(q.revealed?(k===q.a?" cq-right":q.mine===k?" cq-wrong":" cq-dim"):"")+'" data-k="'+k+'"'+(q.revealed?" disabled":"")+'><i>'+L[k]+'</i><span>'+esc(o)+'</span></button>').join("")+'</div>'+
        (q.revealed?'<div class="cq-result '+(q.mine==null?"cq-none":right?"cq-yes":"cq-no")+'"><b>'+(q.mine==null?"You didn’t answer this one":right?"Right!":"Not this time")+'</b>'+(q.why?'<p>'+esc(q.why)+'</p>':"")+'<small>'+q.right+' of '+q.answered+' right so far. Next question soon.</small></div>'
          :'<p class="cq-note">'+(q.mine!=null?"Answer in. You can change it until your tutor shows the answer.":"Tap your answer.")+'</p>')+'</div>';
      layer.querySelectorAll("[data-k]").forEach(b=>b.onclick=async()=>{
        if(picking)return;picking=true;const k=+b.dataset.k;
        layer.querySelectorAll(".cq-opt").forEach(x=>x.classList.toggle("cq-mine",x===b));
        const note=layer.querySelector(".cq-note");if(note)note.textContent="Sending…";
        try{await A().send("quizAnswer",{p_quiz:q.id,p_q:q.current,p_choice:k});q.mine=k;drawn="";show(q)}
        catch(e){if(note)note.textContent=e.message||"That didn’t send. Try again."}
        picking=false;
      });
    }
    layer.querySelector(".cq-x").onclick=()=>{away=q.finished?q.id+":end":q.id+":"+q.current+":"+q.revealed;close()};
  }
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")check()});
  setTimeout(check,3000);
  window.eviaClassQuiz={check};
})();
