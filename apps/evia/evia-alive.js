/* Evia7: small idle behaviours that make Evia feel alive. Works on every .evia-face in the app through CSS
   variables on <html> (--evia-lx/--evia-ly: where she looks, --evia-sy: how open her eyes are) plus a few mood classes. */
(function(){
  const root=document.documentElement;
  /* The Reduce motion setting (or the phone's own setting) keeps her still apart from blinking. */
  const reduce=()=>window.eviaAccessibility?window.eviaAccessibility.reducedMotion():!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const set=(k,v)=>root.style.setProperty(k,v);
  let lookTimer=null,idleTimer=null,moodTimer=null,sleeping=false,busy=false;
  const fab=()=>document.getElementById("evia-fab");

  function blink(){set("--evia-sy","0.1");setTimeout(()=>set("--evia-sy","1"),110)}
  function scheduleBlink(){
    setTimeout(()=>{
      if(!document.hidden){blink();if(Math.random()<.25)setTimeout(blink,280)}
      scheduleBlink();
    },2200+Math.random()*3800);
  }
  /* x and y are percentages of the eye's own size, so the same glance works on the small button and the big welcome face. */
  function look(x,y,hold){
    if(reduce())return;
    set("--evia-lx",x.toFixed(1)+"%");set("--evia-ly",y.toFixed(1)+"%");
    set("--evia-tilt",(x/30*5).toFixed(2)+"deg"); /* her body leans a little towards where she looks */
    clearTimeout(lookTimer);
    if(hold)lookTimer=setTimeout(()=>{if(!busy)look(0,0)},hold);
  }
  function wander(){
    setTimeout(()=>{
      if(!document.hidden&&!busy&&!sleeping&&Math.random()<.65)look((Math.random()*2-1)*30,(Math.random()*2-1)*16,900+Math.random()*1500);
      wander();
    },2800+Math.random()*4200);
  }
  /* Restart a one-shot body animation class (hop or squish). */
  function play(cls,ms){
    const el=fab();if(!el||reduce())return;
    el.classList.remove("evia-hop","evia-squish");void el.offsetWidth;el.classList.add(cls);
    setTimeout(()=>el.classList.remove(cls),ms);
  }
  const hop=()=>play("evia-hop",900);
  /* Every so often she gives a little jelly wobble, sometimes followed by a glance. */
  function scheduleSquish(){
    setTimeout(()=>{
      if(!document.hidden&&!busy&&!sleeping){
        play("evia-squish",1200);
        if(Math.random()<.35)setTimeout(()=>look((Math.random()<.5?-1:1)*26,-6,1200),700);
      }
      scheduleSquish();
    },7000+Math.random()*8000);
  }
  function wake(){
    if(sleeping){sleeping=false;root.classList.remove("evia-sleepy")}
    clearTimeout(idleTimer);
    idleTimer=setTimeout(()=>{sleeping=true;root.classList.add("evia-sleepy");look(0,0)},45000);
  }
  window.eviaMood=function(mood){
    wake();
    if(mood==="happy"){
      root.classList.add("evia-happy");hop();
      clearTimeout(moodTimer);moodTimer=setTimeout(()=>root.classList.remove("evia-happy"),1900);
    }
    /* A gentle "oh well": a squish and a glance down, then back to normal. */
    if(mood==="oops"){root.classList.remove("evia-happy");play("evia-squish",1200);look(0,22,1400)}
  };
  window.eviaLook=look;

  /* She glances towards wherever the learner taps. */
  document.addEventListener("pointerdown",e=>{
    wake();
    const el=fab();if(!el||busy)return;
    const r=el.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),d=Math.hypot(dx,dy)||1;
    look(dx/d*30,dy/d*18,1500);
  },{passive:true});
  document.addEventListener("scroll",wake,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)wake()});

  /* While a chat reply is "thinking", she looks up as if working it out. */
  const modal=document.getElementById("modal-root");
  if(modal)new MutationObserver(()=>{
    const thinking=!!document.querySelector("#modal-root .evia-thinking");
    if(thinking===busy)return;
    busy=thinking;
    if(thinking)look(24,-20);else look(0,0);
  }).observe(modal,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});

  /* Saving evidence makes her happy. */
  if(typeof window.showEvidenceToast==="function"){
    const originalToast=window.showEvidenceToast;
    window.showEvidenceToast=function(message,isError){originalToast(message,isError);if(!isError)window.eviaMood("happy")};
  }

  set("--evia-lx","0%");set("--evia-ly","0%");set("--evia-sy","1");
  set("--evia-tilt","0deg");
  scheduleBlink();wander();scheduleSquish();wake();
})();
