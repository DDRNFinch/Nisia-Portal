/* Evia7: small idle behaviours that make Evia feel alive. Moods (window.eviaMood): happy, oops, proud, concerned, calm. Works on every .evia-face in the app through CSS
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
    /* Proud (a goal met, a topic at full strength): a hop, rosy cheeks and a few sparkles. */
    if(mood==="proud"){
      root.classList.remove("evia-concerned");root.classList.add("evia-proud","evia-happy");hop();sparkle();
      clearTimeout(moodTimer);moodTimer=setTimeout(()=>root.classList.remove("evia-proud","evia-happy"),2600);
    }
    /* Concerned (the learner isn't doing great): soft brows and a look down for a while, no bouncing. */
    if(mood==="concerned"){
      root.classList.remove("evia-happy","evia-proud");root.classList.add("evia-concerned");look(0,14,2600);
      clearTimeout(moodTimer);moodTimer=setTimeout(()=>root.classList.remove("evia-concerned"),9000);
    }
    if(mood==="calm"){clearTimeout(moodTimer);root.classList.remove("evia-happy","evia-proud","evia-concerned")}
  };
  /* A few sparkles burst out around the floating button. */
  function sparkle(){
    const el=fab();if(!el||reduce())return;
    for(let i=0;i<5;i++){
      const s=document.createElement("i"),a=(i/5)*Math.PI*2-Math.PI/2,r=34+Math.random()*10;
      s.className="evia-spark";s.style.left=(50+Math.cos(a)*30)+"%";s.style.top=(50+Math.sin(a)*30)+"%";
      s.style.setProperty("--sx",Math.round(Math.cos(a)*r*.6)+"px");s.style.setProperty("--sy",Math.round(Math.sin(a)*r*.6)+"px");
      s.style.animationDelay=(i*60)+"ms";el.appendChild(s);setTimeout(()=>s.remove(),1200);
    }
  }
  window.eviaLook=look;

  /* She glances towards wherever the learner taps. */
  document.addEventListener("pointerdown",e=>{
    wake();
    const el=fab();if(!el||busy)return;
    /* Tapping her gives a springy squash. */
    if(el.contains(e.target)&&!reduce()){el.classList.remove("evia-boing");void el.offsetWidth;el.classList.add("evia-boing");setTimeout(()=>el.classList.remove("evia-boing"),720)}
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
