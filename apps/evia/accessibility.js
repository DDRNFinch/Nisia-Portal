/* Evia7 accessibility: one place that stores, applies and edits the learner's accessibility settings.
   Settings live in localStorage ("evia7-accessibility") so they apply before the first paint. */
(function(){
  const KEY="evia7-accessibility";
  const DEFAULTS={textScale:"100",dyslexiaFont:false,letterSpacing:false,lineSpacing:false,readingGuide:false,readingGuidePosition:45,readingGuideColour:"clear",readingGuideShade:"medium",reduceMotion:false,highContrast:false,colourOverlay:"none",readAloudButton:false};
  const OVERLAYS=[["none","None"],["yellow","Yellow","#fff4c2"],["blue","Blue","#dcebff"],["green","Green","#dff3e2"],["pink","Pink","#ffe1ec"],["grey","Grey","#e6e6e6"]];
  const GUIDE_TINTS={clear:"transparent",yellow:"rgba(255,221,0,.22)",blue:"rgba(80,160,255,.2)",pink:"rgba(255,100,160,.18)"};
  const GUIDE_SHADES={light:"rgba(16,24,40,.22)",medium:"rgba(16,24,40,.42)",dark:"rgba(16,24,40,.62)"};
  const root=document.documentElement;
  const escHtml=s=>String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
  const osReducedMotion=()=>!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function load(){
    let saved={};
    try{saved=JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch(_){}
    const s=Object.assign({},DEFAULTS,saved);
    /* Older versions stored overlays as "soft-green" etc. and had a "focus mode" that dimmed the whole screen. */
    if(typeof s.colourOverlay==="string")s.colourOverlay=s.colourOverlay.replace(/^soft-/,"");
    if(!OVERLAYS.some(o=>o[0]===s.colourOverlay))s.colourOverlay="none";
    if(!["100","115","130","150"].includes(String(s.textScale)))s.textScale="100";
    s.textScale=String(s.textScale);
    return s;
  }
  function save(s){
    const clean={};Object.keys(DEFAULTS).forEach(k=>clean[k]=s[k]);
    try{localStorage.setItem(KEY,JSON.stringify(clean))}catch(_){}
  }
  let settings=load();

  /* ---------- Apply ---------- */
  function apply(){
    const s=settings;
    root.dataset.a11yScale=s.textScale;
    root.dataset.a11yDyslexia=s.dyslexiaFont?"on":"off";
    root.dataset.a11yLetter=s.letterSpacing?"on":"off";
    root.dataset.a11yLine=s.lineSpacing?"on":"off";
    root.dataset.a11yMotion=(s.reduceMotion||osReducedMotion())?"reduce":"normal";
    root.dataset.a11yContrast=s.highContrast?"on":"off";
    root.dataset.a11yOverlay=s.colourOverlay;
    /* Clear attributes left by the old implementation so its leftover styles can't switch on. */
    ["eviaScale","eviaDyslexia","eviaLetterSpacing","eviaLineSpacing","eviaFocus","eviaContrast","eviaReadingGuide","eviaOverlay"].forEach(k=>delete root.dataset[k]);
    const old=document.getElementById("evia-reading-guide");if(old)old.remove();
    renderGuide();
    renderSpeakButton();
  }

  /* ---------- Reading guide ---------- */
  function renderGuide(){
    let guide=document.getElementById("a11y-guide");
    if(!settings.readingGuide){if(guide)guide.remove();return}
    if(!guide){
      guide=document.createElement("div");
      guide.id="a11y-guide";
      guide.innerHTML='<div class="a11y-shade top"></div><div class="a11y-strip"></div><div class="a11y-shade bottom"></div>'+
        '<button type="button" class="a11y-handle" aria-label="Move reading guide. Drag up or down, or use the arrow keys."><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4"/></svg></button>';
      document.body.appendChild(guide);
      const handle=guide.querySelector(".a11y-handle");
      const moveTo=pct=>{settings.readingGuidePosition=Math.round(Math.max(8,Math.min(92,pct)));guide.style.setProperty("--guide-y",settings.readingGuidePosition+"%")};
      handle.addEventListener("pointerdown",e=>{handle.setPointerCapture(e.pointerId);handle.dataset.drag="1";e.preventDefault()});
      handle.addEventListener("pointermove",e=>{if(handle.dataset.drag==="1")moveTo(e.clientY/window.innerHeight*100)});
      const end=()=>{if(handle.dataset.drag==="1"){handle.dataset.drag="";save(settings)}};
      handle.addEventListener("pointerup",end);handle.addEventListener("pointercancel",end);
      handle.addEventListener("keydown",e=>{if(e.key==="ArrowUp"||e.key==="ArrowDown"){e.preventDefault();moveTo(settings.readingGuidePosition+(e.key==="ArrowUp"?-3:3));save(settings)}});
    }
    guide.style.setProperty("--guide-y",settings.readingGuidePosition+"%");
    guide.style.setProperty("--guide-tint",GUIDE_TINTS[settings.readingGuideColour]||GUIDE_TINTS.clear);
    guide.style.setProperty("--guide-shade",GUIDE_SHADES[settings.readingGuideShade]||GUIDE_SHADES.medium);
  }

  /* ---------- Read aloud ---------- */
  const canSpeak=()=>"speechSynthesis" in window&&typeof SpeechSynthesisUtterance!=="undefined";
  let reading=null;
  function stopReading(){
    try{window.speechSynthesis.cancel()}catch(_){}
    if(reading)reading.classList.remove("a11y-reading");
    reading=null;
    const b=document.getElementById("a11y-speak");if(b){b.classList.remove("speaking");b.setAttribute("aria-label","Read this screen aloud")}
  }
  /* Reads whatever is on top: an open sheet or chat, otherwise the current screen. */
  function readScreen(){
    if(reading){stopReading();return}
    const modal=document.getElementById("modal-root");
    const target=(modal&&modal.firstElementChild&&modal.innerText.trim())?modal.firstElementChild:document.getElementById("screen");
    if(!target)return;
    const text=target.innerText.replace(/\s+/g," ").trim();
    if(!text)return;
    const u=new SpeechSynthesisUtterance(text);
    u.lang="en-GB";u.rate=.95;
    const voice=window.speechSynthesis.getVoices().find(v=>/en-GB/i.test(v.lang));if(voice)u.voice=voice;
    u.onend=u.onerror=()=>{if(reading===target)stopReading()};
    reading=target;target.classList.add("a11y-reading");
    const b=document.getElementById("a11y-speak");if(b){b.classList.add("speaking");b.setAttribute("aria-label","Stop reading")}
    window.speechSynthesis.cancel();window.speechSynthesis.speak(u);
  }
  function renderSpeakButton(){
    let b=document.getElementById("a11y-speak");
    if(!settings.readAloudButton||!canSpeak()){if(b){stopReading();b.remove()}return}
    if(b)return;
    b=document.createElement("button");
    b.type="button";b.id="a11y-speak";b.setAttribute("aria-label","Read this screen aloud");
    b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
    b.onclick=readScreen;
    document.body.appendChild(b);
  }
  /* Stop reading when the learner moves to another screen. */
  const screenEl=document.getElementById("screen");
  if(screenEl)new MutationObserver(()=>{if(reading===screenEl)stopReading()}).observe(screenEl,{childList:true});

  /* ---------- Settings sheet ---------- */
  const ROWS=[
    {key:"textScale",label:"Text size",desc:"Make all text in Evia bigger.",type:"choice",choices:[["100","100%"],["115","115%"],["130","130%"],["150","150%"]]},
    {key:"dyslexiaFont",label:"Dyslexia-friendly font",desc:"Switch to Lexend, a font designed to make reading easier.",type:"switch"},
    {key:"letterSpacing",label:"More letter spacing",desc:"Add space between letters and words.",type:"switch"},
    {key:"lineSpacing",label:"More line spacing",desc:"Add space between lines of text.",type:"switch"},
    {key:"readingGuide",label:"Reading guide",desc:"Shade the screen except for a strip you move with the round handle, to help you keep your place.",type:"switch"},
    {key:"highContrast",label:"High contrast",desc:"Black text and strong outlines so everything stands out.",type:"switch"},
    {key:"colourOverlay",label:"Colour overlay",desc:"A soft tint over the screen. Some people find a tint reduces glare or makes text easier to read.",type:"choice",choices:OVERLAYS.map(o=>[o[0],o[1],o[2]])},
    {key:"reduceMotion",label:"Reduce motion",desc:"Stop Evia's movement and the app's animations.",type:"switch"},
    {key:"readAloudButton",label:"Read aloud",desc:"Add a speaker button at the top of the screen that reads the page out loud.",type:"switch"}
  ];
  function rowHtml(r){
    const s=settings;
    let head='<div class="a11y-row-head"><div class="a11y-row-copy"><strong id="a11y-l-'+r.key+'">'+escHtml(r.label)+'</strong><small>'+escHtml(r.desc)+'</small></div>';
    if(r.type==="switch")head+='<button type="button" class="a11y-switch" role="switch" aria-checked="'+(!!s[r.key])+'" aria-labelledby="a11y-l-'+r.key+'" data-a11y-switch="'+r.key+'"></button>';
    head+='</div>';
    let extra="";
    if(r.type==="choice")extra=choices(r.key,r.choices,r.label);
    if(r.key==="readingGuide"&&s.readingGuide){
      extra='<div class="a11y-sub">Strip colour</div>'+choices("readingGuideColour",[["clear","Clear"],["yellow","Yellow","#ffe680"],["blue","Blue","#a8cfff"],["pink","Pink","#ffb3cf"]],"Strip colour")+
        '<div class="a11y-sub">Shading</div>'+choices("readingGuideShade",[["light","Light"],["medium","Medium"],["dark","Dark"]],"Shading");
    }
    if(r.key==="reduceMotion"&&osReducedMotion())extra='<p class="a11y-note">Your phone is set to reduce motion, so this is already on.</p>';
    if(r.key==="readAloudButton"&&!canSpeak())extra='<p class="a11y-note">This browser can’t read aloud.</p>';
    return '<div class="a11y-row">'+head+extra+'</div>';
  }
  function choices(key,list,label){
    return '<div class="a11y-choices" role="group" aria-label="'+escHtml(label)+'">'+list.map(c=>'<button type="button" data-a11y-choice="'+key+'" data-value="'+c[0]+'" aria-pressed="'+(String(settings[key])===c[0])+'">'+(c[2]?'<span class="a11y-dot" style="background:'+c[2]+'"></span>':"")+escHtml(c[1])+'</button>').join("")+'</div>';
  }
  function open(){
    const modal=document.getElementById("modal-root");if(!modal)return;
    const scrollBefore=(modal.querySelector(".a11y-sheet")||{}).scrollTop||0;
    modal.innerHTML='<div class="profile-overlay"><section class="profile-sheet a11y-sheet" aria-labelledby="a11y-title">'+
      '<div class="profile-head"><div><div class="profile-kicker">ACCESSIBILITY</div><h2 id="a11y-title">Make Evia work for you</h2></div><button class="profile-close" id="a11y-close" aria-label="Close">×</button></div>'+
      '<p class="a11y-intro">Changes apply straight away, so you can see them here as you choose.</p>'+
      '<div class="a11y-list">'+ROWS.map(rowHtml).join("")+'</div>'+
      '<div class="a11y-actions"><button type="button" class="secondary" id="a11y-reset">Reset to default</button><button type="button" class="primary" id="a11y-done">Done</button></div>'+
    '</section></div>';
    const sheet=modal.querySelector(".a11y-sheet");sheet.scrollTop=scrollBefore;
    const back=()=>{if(window.eviaOpenProfile)window.eviaOpenProfile();else modal.innerHTML=""};
    document.getElementById("a11y-close").onclick=back;
    document.getElementById("a11y-done").onclick=back;
    document.getElementById("a11y-reset").onclick=()=>{settings=Object.assign({},DEFAULTS);save(settings);apply();open()};
    modal.querySelectorAll("[data-a11y-switch]").forEach(b=>b.onclick=()=>{
      const k=b.dataset.a11ySwitch;settings[k]=!settings[k];save(settings);apply();open();
      const again=modal.querySelector('[data-a11y-switch="'+k+'"]');if(again)again.focus();
    });
    modal.querySelectorAll("[data-a11y-choice]").forEach(b=>b.onclick=()=>{
      const k=b.dataset.a11yChoice;settings[k]=b.dataset.value;save(settings);apply();open();
      const again=modal.querySelector('[data-a11y-choice="'+k+'"][data-value="'+b.dataset.value+'"]');if(again)again.focus();
    });
  }

  if(window.matchMedia){const mq=window.matchMedia("(prefers-reduced-motion: reduce)");if(mq.addEventListener)mq.addEventListener("change",apply)}
  window.eviaAccessibility={open,get:()=>Object.assign({},settings),reducedMotion:()=>root.dataset.a11yMotion==="reduce"};
  apply();
})();
