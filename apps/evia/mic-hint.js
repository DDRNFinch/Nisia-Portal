/* Speak instead of typing: a small microphone in the top-right corner of every text box. Tapping it opens the
   keyboard on that box and shows how to start the phone's own voice typing (free, works offline on most phones and
   copes with accents), with steps for the phone in hand: iPhone, Samsung, other Android, or a computer.
   The button floats over the box (it isn't wrapped), so the page's layout and styles stay exactly as they are.
   A box can opt out with data-no-mic. */
(function(){
  const ua=navigator.userAgent||"",iOS=/iPhone|iPad|iPod/.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const samsung=/SamsungBrowser|SM-[A-Z0-9]+|Samsung/i.test(ua),android=/Android/i.test(ua),mac=!iOS&&/Mac/i.test(navigator.platform||ua);
  const MIC='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/></svg>';
  function steps(){
    if(iOS)return {who:"On your iPhone",list:["Tap the <b>microphone</b> on your keyboard, at the bottom, next to the space bar.","Talk normally. Say <b>“full stop”</b> or <b>“comma”</b> for punctuation.","Tap the <b>keyboard</b> button when you’re done, then check the words."],
      fix:"No microphone? Turn it on in <b>Settings › General › Keyboard › Enable Dictation</b>."};
    if(samsung)return {who:"On your Samsung",list:["Tap the <b>microphone</b> in the row above your keyboard (or hold the <b>comma</b> key).","Talk normally. Say <b>“full stop”</b> or <b>“comma”</b> for punctuation.","Tap the microphone again to stop, then check the words."],
      fix:"No microphone? In <b>Settings › General management › Samsung Keyboard settings</b>, turn on <b>Voice input</b>."};
    if(android)return {who:"On your Android phone",list:["Tap the <b>microphone</b> at the top right of your keyboard.","Talk normally. Say <b>“full stop”</b> or <b>“comma”</b> for punctuation.","Tap the microphone again to stop, then check the words."],
      fix:"No microphone? In your keyboard’s settings, turn on <b>Voice typing</b>."};
    if(mac)return {who:"On a Mac",list:["Press the <b>Fn</b> (🌐) key twice, or <b>Control</b> twice.","Talk normally, then press <b>Fn</b> again to stop."],fix:"First time? Turn on Dictation in <b>System Settings › Keyboard</b>."};
    return {who:"On a computer",list:["On Windows, press the <b>Windows key + H</b>.","Talk normally. Say <b>“full stop”</b> for punctuation, then check the words."],fix:""};
  }
  const css=document.createElement("style");
  css.textContent='.mh-btn{position:absolute;z-index:3;display:grid;place-items:center;width:30px;height:30px;padding:0;border:0;border-radius:50%;background:var(--ui-soft,#f2f4f7);color:var(--yellow-ink,#5b4a00);cursor:pointer;opacity:.9}'+
    '.mh-btn:hover,.mh-btn:focus-visible{opacity:1;background:var(--soft,#fff6d6)}.mh-btn svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}'+
    'textarea.mh-pad{padding-right:40px!important}'+
    '.mh-tip{position:fixed;z-index:10050;left:12px;right:12px;max-width:440px;margin:0 auto;padding:14px 16px 12px;border-radius:18px;background:#fff;color:#172033;box-shadow:0 12px 36px rgba(16,24,40,.22);font:500 14.5px/1.45 inherit;font-family:inherit}'+
    '.mh-tip strong{display:flex;align-items:center;gap:8px;font-size:16px;margin-bottom:6px}.mh-tip strong svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;color:var(--yellow-ink,#5b4a00)}'+
    '.mh-tip ol{margin:0 0 8px;padding-left:20px;display:grid;gap:4px}.mh-tip small{display:block;color:#5b6472;font-size:13px;margin-bottom:8px}'+
    '.mh-tip button{min-height:40px;padding:8px 18px;border:0;border-radius:999px;background:var(--accent-fill,var(--yellow,#e7b900));color:#1a1500;font:inherit;font-weight:800;cursor:pointer}'+
    '@media (prefers-reduced-motion:no-preference){.mh-tip{animation:mhIn .18s ease-out}}@keyframes mhIn{from{opacity:0;transform:translateY(8px)}}';
  document.head.appendChild(css);
  let tip=null;
  function closeTip(){if(tip){tip.remove();tip=null;document.removeEventListener("pointerdown",away,true)}}
  function away(e){if(tip&&!tip.contains(e.target)&&!e.target.closest(".mh-btn"))closeTip()}
  function show(ta){
    closeTip();const s=steps();
    tip=document.createElement("div");tip.className="mh-tip";tip.setAttribute("role","dialog");tip.setAttribute("aria-label","Speak instead of typing");
    tip.innerHTML='<strong>'+MIC+'Speak instead of typing</strong><small>'+s.who+':</small><ol>'+s.list.map(x=>'<li>'+x+'</li>').join("")+'</ol>'+(s.fix?'<small>'+s.fix+'</small>':"")+'<button type="button">Got it</button>';
    document.body.appendChild(tip);
    /* Above the box when there's room (the keyboard comes up from the bottom), otherwise just under it. */
    const r=ta.getBoundingClientRect(),h=tip.offsetHeight;
    tip.style.top=Math.max(8,r.top-h-10>8?r.top-h-10:Math.min(innerHeight-h-8,r.top+44))+"px";
    tip.querySelector("button").onclick=()=>{closeTip();try{ta.focus({preventScroll:true})}catch(_){}};
    setTimeout(()=>document.addEventListener("pointerdown",away,true),0);
  }
  /* One button per box, kept over its top-right corner. It's measured on screen (from where the button would sit at
     0,0), so it lines up in any layout: scrolling panels, sheets that slide in, transformed containers. */
  const pairs=new Map();
  function place(ta,b){
    const vis=ta.offsetParent!==null&&ta.offsetWidth>60&&!ta.disabled&&!ta.readOnly;
    b.hidden=!vis;if(!vis)return;
    b.style.left="0px";b.style.top="0px";
    const o=b.getBoundingClientRect(),r=ta.getBoundingClientRect(),x=r.right-36,y=r.top+6;
    b.style.left=Math.round(x-o.left)+"px";b.style.top=Math.round(y-o.top)+"px";
  }
  function attach(ta){
    if(pairs.has(ta)||ta.hasAttribute("data-no-mic")||ta.closest("[data-no-mic]"))return;
    const b=document.createElement("button");b.type="button";b.className="mh-btn";b.setAttribute("aria-label","Speak instead of typing");b.innerHTML=MIC;
    b.addEventListener("pointerdown",e=>e.preventDefault()); /* keep the box's focus and cursor */
    b.onclick=()=>{try{ta.focus({preventScroll:true})}catch(_){}show(ta);if(window.eviaUsage&&window.eviaUsage.hit)try{window.eviaUsage.hit("mic.hint")}catch(_){}};
    (ta.parentElement||document.body).appendChild(b);ta.classList.add("mh-pad"); /* last in the box's parent: neighbours of the box stay neighbours */pairs.set(ta,b);place(ta,b);
  }
  let queued=false;
  function sweep(){
    queued=false;
    pairs.forEach((b,ta)=>{if(!ta.isConnected){b.remove();pairs.delete(ta)}else if(!b.isConnected){pairs.delete(ta)}});
    document.querySelectorAll("textarea").forEach(attach);
    pairs.forEach((b,ta)=>place(ta,b));
  }
  const later=()=>{if(!queued){queued=true;requestAnimationFrame(sweep)}};
  const ours=n=>n.nodeType===1&&!!n.closest&&!!n.closest(".mh-btn,.mh-tip");
  new MutationObserver(muts=>{if(muts.some(m=>m.type==="attributes"?!ours(m.target):![...m.addedNodes,...m.removedNodes].every(ours)))later()}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class","hidden","style"]});
  addEventListener("resize",later);document.addEventListener("input",later,true);document.addEventListener("transitionend",later,true);
  if(window.ResizeObserver){const ro=new ResizeObserver(later);const watch=()=>pairs.forEach((b,ta)=>{if(!ta._mhRo){ta._mhRo=1;ro.observe(ta)}});new MutationObserver(watch).observe(document.body,{childList:true,subtree:true})}
  later();
  window.eviaMicHint={show,steps,sweep};
})();
