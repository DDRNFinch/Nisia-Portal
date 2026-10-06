/* Evia7 Teach me games (window.EVIA_TEACH.games): every kind of screen a lesson is made of.
   Teaching screens: teach (Evia explains, with a picture), explore (tap the dots on a picture), watch (a short
   step by step) and cards (flashcards to flip, or to recall). Games: choice (words or pictures), tf, tap (tap the
   word), gap (fill the gap), build (word builder), order, match, sort (sort it), judge (good or bad), spot (spot
   the mistake), next (what comes next), scene (scenario), hot (tap the picture), label (label the diagram), load
   (drag the right amounts in), quick (quick fire) and banner (a challenge, surprise or review splash).
   teach.js runs a lesson and hands each game a ctx:
     el, s, pic(name,o), say(text), button(label,fn,on), buttons(list), next()
     answer(ok,why,{last,el})    one-answer games: the runner gives feedback and XP, then ctx.retry() or ctx.reveal()
     hit(el) / oops(el) / miss(why,then,el)   one item right, or wrong, in a many-item game
     finish(right,total,review,o)   a many-item game is over; review is a smaller step made of the misses
   Also here: the pictures with tappable spots, drag and drop, sounds and icons. */
(function(){
  const T=window.EVIA_TEACH=window.EVIA_TEACH||{courses:{},fs:[]};
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  /* *Words in stars* are the key words, picked out in the text. */
  const fmt=s=>esc(s).replace(/\*([^*]+)\*/g,'<b class="tm-k">$1</b>');
  const mix=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  const mixNot=(a,same)=>{let b=mix(a),n=0;while(a.length>1&&same(b)&&n++<12)b=mix(a);return b};
  const I=(d,fill)=>'<svg viewBox="0 0 24 24" aria-hidden="true" class="'+(fill?"tm-if":"tm-is")+'">'+d+'</svg>';
  const ICON={
    bolt:I('<path d="M13.2 2 4.5 13.4h6.3L9.9 22l8.6-11.6h-6.3z"/>',1),
    flame:I('<path d="M12.3 2c.7 3.3 4.7 5.3 4.7 10.5a5 5 0 0 1-10 0c0-2.2 1-3.8 2.1-4.8.1 2 1 3.2 2.1 3.3-.3-3.1-.3-6 1.1-9z"/>',1),
    check:I('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    cross:I('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
    up:I('<path d="M7.5 10.5V20H4v-9.5zM7.5 10.5 11 3.2c1.6 0 2.6 1.1 2.3 2.7L12.7 9h6.1a2 2 0 0 1 2 2.4l-1.3 6.9a2 2 0 0 1-2 1.7h-10"/>'),
    down:I('<path d="M7.5 13.5V4H4v9.5zM7.5 13.5 11 20.8c1.6 0 2.6-1.1 2.3-2.7L12.7 15h6.1a2 2 0 0 0 2-2.4l-1.3-6.9a2 2 0 0 0-2-1.7h-10"/>'),
    gift:I('<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5.5 12.5V20h13v-7.5M12 8.5V20M12 8.5C10.2 4.6 6.4 4.8 7 7.5c.4 1.4 5 1 5 1zm0 0c1.8-3.9 5.6-3.7 5-1-.4 1.4-5 1-5 1z"/>'),
    again:I('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4.8h-4.8"/>'),
    trophy:I('<path d="M8 21h8M12 16.5V21M7 3.5h10v5a5 5 0 0 1-10 0zM7 5.5H4a3.2 3.2 0 0 0 3.3 4.2M17 5.5h3a3.2 3.2 0 0 1-3.3 4.2"/>'),
    spark:I('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',1),
    tap:I('<path d="M9 11.5V5.2a1.6 1.6 0 0 1 3.2 0v5.3m0-1.1a1.6 1.6 0 0 1 3.2 0v1.6m0-.6a1.6 1.6 0 0 1 3.2 0v4.1a6.5 6.5 0 0 1-6.5 6.5h-.6a5.4 5.4 0 0 1-4.3-2.1L4 15.3a1.6 1.6 0 0 1 2.4-2.1L9 15.6"/>'),
    clock:I('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    target:I('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
    soundOn:I('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
    soundOff:I('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM16 9.5l5 5M21 9.5l-5 5"/>'),
    star:I('<path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>',1)
  };
  /* A site worker for scenarios: hard hat and hi-vis. */
  const WHO='<span class="tm-av" aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" class="tm-av-bg"/><path class="tm-av-vest" d="M8 40c1-8 6-11 12-11s11 3 12 11z"/><circle class="tm-av-head" cx="20" cy="19" r="7.5"/><path class="tm-av-hat" d="M11.5 17c0-6 3.8-9 8.5-9s8.5 3 8.5 9z"/><rect class="tm-av-hat" x="10" y="16" width="20" height="2.6" rx="1.3"/></svg></span>';
  const EVIA_SAY='<span class="tm-evia evia-mini sm" aria-hidden="true"><span class="evia-face"><i></i><i></i></span></span>';

  /* ---------- Sounds: made on the phone, no files. Quiet, and they can be switched off. ---------- */
  const SND="evia7-teach-sound";let ac=null;
  const soundOn=()=>{try{return localStorage.getItem(SND)!=="off"}catch(_){return true}};
  const setSound=on=>{try{localStorage.setItem(SND,on?"on":"off")}catch(_){}};
  const NOTES={ok:[[659.3,0,.09],[987.8,.08,.18]],no:[[233.1,0,.12,"triangle"],[185,.1,.2,"triangle"]],item:[[880,0,.08]],tap:[[523.3,0,.05,"triangle",.05]],flip:[[440,0,.06,"triangle",.05]],
    combo:[[659.3,0,.08],[830.6,.07,.08],[987.8,.14,.18]],banner:[[523.3,0,.1],[784,.09,.2]],surprise:[[784,0,.08],[1046.5,.08,.08],[1318.5,.16,.22]],soft:[[587.3,0,.1],[740,.08,.16]],
    done:[[523.3,0,.12],[659.3,.1,.12],[784,.2,.12],[1046.5,.3,.4]],tick:[[1318.5,0,.03,"sine",.03]]};
  function sound(kind){
    if(!soundOn()||!NOTES[kind])return;
    try{
      ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==="suspended")ac.resume();
      const t=ac.currentTime;
      NOTES[kind].forEach(([f,at,d,type,vol])=>{const o=ac.createOscillator(),g=ac.createGain();o.type=type||"sine";o.frequency.value=f;
        g.gain.setValueAtTime(.0001,t+at);g.gain.exponentialRampToValueAtTime(vol||.08,t+at+.012);g.gain.exponentialRampToValueAtTime(.0001,t+at+d);
        o.connect(g);g.connect(ac.destination);o.start(t+at);o.stop(t+at+d+.03)});
    }catch(_){}
  }

  /* ---------- Pictures, with tappable spots, drop boxes or hit areas laid over them ----------
     Spots are in the picture's own units (its viewBox), so they stay on the right part at any size.
     mode "explore": numbered dots. "hot": invisible hit areas (r = radius). "label": empty boxes at x,y, each with a
     leader line to the part at px,py. */
  function pic(name,o){
    const f=T.pics&&T.pics[name];if(!f)return "";
    o=o||{};const sz=T.picSize(name)||{x:0,y:0,w:320,h:120},W=sz.w,H=sz.h,X=sz.x||0,Y=sz.y||0,pc=(v,of)=>(v/of*100).toFixed(2)+"%",px=v=>pc(v-X,W),py=v=>pc(v-Y,H);
    const maxH=o.maxH||(H>=180?250:H>=140?210:180);
    let over="";
    if(o.spots&&o.mode==="explore")over=o.spots.map((s,i)=>'<button type="button" class="tm-spot" data-i="'+i+'" style="left:'+px(s.x)+';top:'+py(s.y)+'" aria-label="'+esc(s.label)+'"><b>'+(i+1)+'</b></button>').join("");
    if(o.spots&&o.mode==="hot")over=o.spots.map((s,i)=>'<button type="button" class="tm-hit" data-i="'+i+'" style="left:'+px(s.x-(s.r||16))+';top:'+py(s.y-(s.r||16))+';width:'+pc(2*(s.r||16),W)+';height:'+pc(2*(s.r||16),H)+'" aria-label="'+esc(s.label||"Here")+'"></button>').join("");
    if(o.spots&&o.mode==="label")over='<svg class="tm-leads" viewBox="'+X+' '+Y+' '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true">'+o.spots.map(s=>s.px==null?"":'<path d="M'+s.px+' '+s.py+' L'+s.x+' '+s.y+'"/><circle cx="'+s.px+'" cy="'+s.py+'" r="2.6"/>').join("")+'</svg>'+
      o.spots.map((s,i)=>'<button type="button" class="tm-drop" data-drop data-i="'+i+'" style="left:'+px(s.x)+';top:'+py(s.y)+'"><span>'+(i+1)+'</span></button>').join("");
    return '<div class="tm-pic'+(o.bare?" bare":"")+'"><div class="tm-art'+(o.mode?" "+o.mode:"")+'" style="aspect-ratio:'+W+'/'+H+';max-width:'+Math.round(maxH*W/H)+'px">'+f()+over+'</div></div>';
  }
  const say=text=>'<div class="tm-says">'+EVIA_SAY+'<p>'+fmt(text)+'</p></div>';

  /* ---------- Drag and drop: drag a chip onto a target, or just tap it. Works with a finger, mouse or pen. ---------- */
  function drag(el,o){
    el.classList.add("tm-drag");
    el.addEventListener("pointerdown",e=>{
      if(el.disabled||e.button>0)return;
      const x0=e.clientX,y0=e.clientY,rc=el.getBoundingClientRect();let ghost=null,over=null;
      const target=(x,y)=>document.elementsFromPoint(x,y).map(n=>n.closest&&n.closest("[data-drop]")).find(n=>n&&n!==el&&(!o.accept||o.accept(n)))||null;
      const move=ev=>{
        const dx=ev.clientX-x0,dy=ev.clientY-y0;
        if(!ghost){if(Math.hypot(dx,dy)<8)return;ghost=el.cloneNode(true);ghost.classList.add("tm-ghost");ghost.removeAttribute("id");
          Object.assign(ghost.style,{left:rc.left+"px",top:rc.top+"px",width:rc.width+"px",height:rc.height+"px"});(el.closest(".tm")||document.body).appendChild(ghost);el.classList.add("tm-lifted")}
        ghost.style.transform="translate("+dx+"px,"+dy+"px) rotate(-2deg) scale(1.05)";
        const t=target(ev.clientX,ev.clientY);if(t!==over){if(over)over.classList.remove("tm-over");over=t;if(t)t.classList.add("tm-over")}
      };
      const end=ev=>{
        el.removeEventListener("pointermove",move);el.removeEventListener("pointerup",end);el.removeEventListener("pointercancel",end);
        try{el.releasePointerCapture(e.pointerId)}catch(_){}
        if(over)over.classList.remove("tm-over");
        if(!ghost){if(ev.type==="pointerup"&&o.tap)o.tap();return}
        ghost.remove();el.classList.remove("tm-lifted");
        const t=ev.type==="pointerup"?target(ev.clientX,ev.clientY):null;if(t&&o.drop)o.drop(t);
      };
      try{el.setPointerCapture(e.pointerId)}catch(_){}
      el.addEventListener("pointermove",move);el.addEventListener("pointerup",end);el.addEventListener("pointercancel",end);
    });
    /* Keyboard: Enter or Space taps it. */
    el.addEventListener("click",e=>{if(e.detail===0&&o.tap)o.tap()});
  }

  const G={};
  const q=(s,dflt)=>'<h2 class="tm-q">'+fmt(s.q||dflt||"")+'</h2>';

  /* ---------- Teaching ---------- */
  G.teach=G.learn=c=>{
    const s=c.s;
    c.el.innerHTML='<div class="tm-card">'+(s.key?'<span class="tm-new">'+ICON.spark+'New · '+esc(s.key)+'</span>':'<span class="tm-kicker">Evia explains</span>')+
      '<h2>'+esc(s.title)+'</h2>'+c.pic(s.pic)+say(s.say||s.text)+'</div>';
    c.button("Continue",c.next,true);
  };
  G.explore=c=>{
    const s=c.s,seen=new Set();
    c.el.innerHTML='<div class="tm-card"><span class="tm-kicker">Tap to explore</span><h2>'+esc(s.title)+'</h2>'+(s.say?say(s.say):"")+c.pic(s.pic,{spots:s.spots,mode:"explore"})+
      '<div class="tm-reveal" aria-live="polite"><p class="tm-hint">'+ICON.tap+'Tap each number to find out more</p></div></div>';
    const box=c.el.querySelector(".tm-reveal"),left=()=>s.spots.length-seen.size;
    const upd=()=>c.button(left()?"Tap "+left()+" more":"Continue",c.next,!left());
    c.el.querySelectorAll(".tm-spot").forEach(b=>b.onclick=()=>{
      const i=+b.dataset.i,sp=s.spots[i];
      c.el.querySelectorAll(".tm-spot").forEach(x=>x.classList.toggle("on",x===b));b.classList.add("seen");
      if(!seen.has(i)){seen.add(i);c.sound(left()?"tap":"item")}
      box.innerHTML='<div class="tm-reveal-card"><b class="tm-reveal-n">'+(i+1)+'</b><div><strong>'+esc(sp.label)+'</strong><p>'+fmt(sp.text)+'</p></div></div>';upd();
    });
    upd();
  };
  G.watch=c=>{
    const s=c.s,f=s.frames;let k=0;
    const paint=()=>{
      c.el.innerHTML='<div class="tm-card"><span class="tm-kicker">Watch · step '+(k+1)+' of '+f.length+'</span><h2>'+esc(s.title)+'</h2>'+c.pic(f[k].pic)+say(f[k].text)+
        '<div class="tm-dots" aria-hidden="true">'+f.map((_,j)=>'<i'+(j<k?' class="on"':j===k?' class="now"':"")+'></i>').join("")+'</div></div>';
      c.button(k<f.length-1?"Next step":"Continue",()=>{if(k<f.length-1){k++;c.sound("tap");paint()}else c.next()},true);
    };
    paint();
  };
  /* Flashcards. Learn: flip each card. Recall (s.recall): think of the answer, flip to check, then say how it went;
     the ones you didn't know come back at the end. */
  G.cards=c=>{
    const s=c.s,cards=s.cards;let k=0,right=0;const again=[];
    const paint=()=>{
      const cd=cards[k];
      c.el.innerHTML='<div class="tm-card"><span class="tm-kicker">'+(s.recall?"Can you remember?":"Flashcards")+' · '+(k+1)+' of '+cards.length+'</span><h2>'+esc(s.title||"Tap the card to flip it")+'</h2>'+
        '<button type="button" class="tm-flip" aria-label="Flip the card"><span class="tm-face front">'+(cd.pic?c.pic(cd.pic,{bare:true,maxH:120}):"")+(cd.front?'<strong>'+esc(cd.front)+'</strong>':"")+'<small>'+ICON.again+'Tap to flip</small></span>'+
        '<span class="tm-face back"><strong>'+esc(cd.term||cd.front||"")+'</strong><p>'+fmt(cd.back)+'</p></span></button></div>';
      const fl=c.el.querySelector(".tm-flip");let flipped=false;
      fl.onclick=()=>{fl.classList.toggle("on");c.sound("flip");if(!flipped){flipped=true;after()}};
      c.button("Flip the card",()=>fl.click(),true);
    };
    const on=()=>{if(k<cards.length-1){k++;paint()}else if(s.recall)c.finish(right,cards.length,again.length?Object.assign({},s,{cards:again}):null);else c.next()};
    const after=()=>{
      if(!s.recall){c.button(k<cards.length-1?"Next card":"Continue",on,true);return}
      c.buttons([{label:"Still learning",cls:"secondary",fn:()=>{again.push(cards[k]);c.oops(null);on()}},{label:"I knew it",fn:()=>{right++;c.hit(c.el.querySelector(".tm-flip"));on()}}]);
    };
    paint();
  };

  /* ---------- One-answer games ---------- */
  /* Options to pick from, then Check. Wrong options can't be picked again; when one is left, the answer shows. */
  function options(c,o){
    const n=o.opts.length,order=o.fixed?o.opts.map((_,k)=>k):mix(o.opts.map((_,k)=>k)),pics=o.opts.some(x=>typeof x==="object");
    c.el.innerHTML=(o.head||"")+(o.pic?c.pic(o.pic):"")+(o.q?'<h2 class="tm-q">'+fmt(o.q)+'</h2>':"")+
      '<div class="tm-opts'+(pics?" pics":"")+(pics&&n===3?" three":"")+(o.tf?" tf":"")+'" role="group">'+order.map(k=>{const x=o.opts[k];
        return '<button type="button" class="tm-opt" data-k="'+k+'">'+(typeof x==="object"?c.pic(x.pic,{bare:true,maxH:110})+'<span>'+esc(x.text||"")+'</span>':'<span>'+fmt(x)+'</span>')+'</button>'}).join("")+'</div>';
    const btns=[...c.el.querySelectorAll(".tm-opt")],tried=new Set();let picked=null;
    btns.forEach((b,i)=>{const x=o.opts[+b.dataset.k];if(typeof x==="object"&&!x.text){b.querySelector("span").textContent=String.fromCharCode(65+i)}});
    const check=()=>{
      const ok=picked===o.ans,b=btns.find(x=>+x.dataset.k===picked);b.classList.remove("on");b.classList.add(ok?"right":"wrong");
      if(ok)btns.forEach(x=>x.disabled=true);else tried.add(picked);
      c.answer(ok,(o.whys&&o.whys[picked])||o.why,{last:!ok&&tried.size>=n-1,el:b});
    };
    btns.forEach(b=>b.onclick=()=>{if(b.disabled)return;picked=+b.dataset.k;btns.forEach(x=>x.classList.toggle("on",x===b));c.sound("tap");c.button("Check",check,true)});
    c.retry=()=>{picked=null;btns.forEach(b=>{b.classList.remove("on","wrong");if(tried.has(+b.dataset.k)){b.disabled=true;b.classList.add("tried")}});c.button("Check",check,false)};
    c.reveal=()=>btns.forEach(b=>{b.disabled=true;b.classList.remove("on");if(+b.dataset.k===o.ans)b.classList.add("right","show")});
    c.button("Check",check,false);
  }
  G.choice=c=>{const s=c.s;options(c,{q:s.q,pic:s.pic,opts:s.opts,ans:s.a,why:s.why,whys:s.whys,fixed:s.fixed})};
  G.tf=c=>{const s=c.s;options(c,{head:'<span class="tm-kicker">True or false?</span>',pic:s.pic,q:s.q,opts:["True","False"],ans:s.a?0:1,why:s.why,fixed:true,tf:true})};
  G.next=c=>{
    const s=c.s;
    const head='<span class="tm-kicker">What comes next?</span><ol class="tm-seq">'+s.seq.map((x,k)=>'<li><b>'+(k+1)+'</b><span>'+fmt(x)+'</span></li>').join("")+'<li class="q"><b>'+(s.seq.length+1)+'</b><span>?</span></li></ol>';
    options(c,{head,q:s.q,opts:s.opts,ans:s.a,why:s.why});
  };
  G.scene=c=>{
    const s=c.s;
    const head='<div class="tm-scene">'+(s.pic?c.pic(s.pic):"")+'<div class="tm-who">'+WHO+'<div class="tm-bub"><small>'+esc(s.who||"On site")+'</small><p>'+fmt(s.say)+'</p></div></div></div>';
    options(c,{head,q:s.q,opts:s.opts.map(o=>o.text),ans:s.opts.findIndex(o=>o.ok),whys:s.opts.map(o=>o.why)});
  };
  /* Spot the mistake: tap the line that's wrong. */
  G.spot=c=>{
    const s=c.s,tried=new Set();
    c.el.innerHTML='<span class="tm-kicker">Spot the mistake</span>'+q(s)+(s.pic?c.pic(s.pic):"")+'<ol class="tm-lines">'+s.lines.map((l,k)=>'<li><button type="button" class="tm-lopt" data-k="'+k+'"><b>'+(k+1)+'</b><span>'+fmt(l)+'</span></button></li>').join("")+'</ol>';
    const btns=[...c.el.querySelectorAll(".tm-lopt")];
    btns.forEach(b=>b.onclick=()=>{
      if(b.disabled)return;const k=+b.dataset.k,ok=k===s.a;b.classList.add(ok?"right":"wrong");
      if(ok)btns.forEach(x=>x.disabled=true);else tried.add(k);
      const last=!ok&&tried.size>=Math.min(2,s.lines.length-1);
      c.answer(ok,ok||last?s.why:(s.fine&&s.fine[k])||"That one’s fine. Look again.",{last,el:b});
    });
    c.retry=()=>btns.forEach(b=>{b.classList.remove("wrong");if(tried.has(+b.dataset.k)){b.disabled=true;b.classList.add("fine")}});
    c.reveal=()=>btns.forEach(b=>{b.disabled=true;if(+b.dataset.k===s.a)b.classList.add("right","show")});
    c.button(null);
  };
  /* Tap to answer: tap the right word. {braces} mark the answer in s.text. */
  G.tap=c=>{
    const s=c.s;let misses=0;
    const toks=s.text.split(/\s+/).map(w=>({ans:/^\{[^}]+\}\W*$/.test(w),w:w.replace(/[{}]/g,"")}));
    c.el.innerHTML='<span class="tm-kicker">Tap the answer</span>'+q(s)+(s.pic?c.pic(s.pic):"")+'<p class="tm-tapline'+(toks.length>5?" long":"")+'">'+toks.map((x,i)=>/^[^\w£%]+$/.test(x.w)?'<span class="tm-punct">'+esc(x.w)+'</span>':'<button type="button" class="tm-tok" data-i="'+i+'"'+(x.ans?' data-ans="1"':"")+'>'+esc(x.w)+'</button>').join(" ")+'</p>';
    const btns=[...c.el.querySelectorAll(".tm-tok")];
    btns.forEach(b=>b.onclick=()=>{
      if(b.disabled)return;const ok=!!b.dataset.ans;b.classList.add(ok?"right":"wrong");
      if(ok)btns.forEach(x=>x.disabled=true);else{misses++;b.disabled=true}
      c.answer(ok,ok||misses>=2?s.why:s.hint||"Not that one. Have another look.",{last:!ok&&misses>=2,el:b});
    });
    c.retry=()=>btns.forEach(b=>{if(b.classList.contains("wrong")){b.classList.remove("wrong");b.classList.add("tried")}});
    c.reveal=()=>btns.forEach(b=>{b.disabled=true;if(b.dataset.ans)b.classList.add("right","show")});
    c.button(null);
  };
  /* Tap the picture: tap the right part. Spots are the parts you might tap; s.a is the right one. */
  G.hot=c=>{
    const s=c.s;let misses=0,settled=false;
    /* The picture's own words are hidden here, so they can't give the answer away. */
    c.el.innerHTML='<span class="tm-kicker">Tap the picture</span>'+q(s)+c.pic(s.pic,{spots:s.spots,mode:"hot",maxH:260}).replace(/<text[^>]*>[\s\S]*?<\/text>/g,"");
    const art=c.el.querySelector(".tm-art");
    const mark=(x,y,cls)=>{const m=document.createElement("span");m.className="tm-mark "+cls;m.style.left=x;m.style.top=y;art.appendChild(m);return m};
    const at=i=>{const sp=s.spots[i],sz=T.picSize(s.pic);return [((sp.x-sz.x)/sz.w*100)+"%",((sp.y-sz.y)/sz.h*100)+"%"]};
    art.addEventListener("click",e=>{
      if(settled)return;
      const b=e.target.closest(".tm-hit"),i=b?+b.dataset.i:-1,ok=i===s.a;
      if(ok){settled=true;const p=at(i);mark(p[0],p[1],"ring");c.answer(true,s.why,{el:b});return}
      misses++;const r=art.getBoundingClientRect();
      if(b){const p=at(i);mark(p[0],p[1],"x")}else mark(((e.clientX-r.left)/r.width*100)+"%",((e.clientY-r.top)/r.height*100)+"%","x");
      const sp=s.spots[i];
      c.answer(false,misses>=2?s.why:(sp&&sp.why)||s.hint||"Not there. Look again.",{last:misses>=2,el:b||art});
    });
    c.retry=()=>art.querySelectorAll(".tm-mark.x").forEach(m=>m.remove());
    c.reveal=()=>{settled=true;art.querySelectorAll(".tm-mark.x").forEach(m=>m.remove());const p=at(s.a);mark(p[0],p[1],"ring show")};
    c.button(null);
  };
  /* Fill the gap: [answers] in s.text, tiles from the answers and s.opts. Tap a tile, or drag it into a gap. */
  G.gap=c=>{
    const s=c.s,parts=s.text.split(/\[([^\]]+)\]/),answers=parts.filter((_,i)=>i%2),n=answers.length;
    const tiles=mix(answers.concat(s.opts||[]).map((t,i)=>({t,i})));
    const fill=Array(n).fill(null),mark=Array(n).fill("");let tries=0;
    const same=(a,b)=>String(a).trim().toLowerCase()===String(b).trim().toLowerCase();
    const paint=()=>{
      let g=0;
      c.el.innerHTML='<span class="tm-kicker">Fill the gap</span>'+(s.q?q(s):"")+(s.pic?c.pic(s.pic):"")+'<p class="tm-gapline">'+parts.map((p,i)=>{if(!(i%2))return fmt(p);const k=g++;
        return '<button type="button" class="tm-gap'+(fill[k]?" filled":"")+(mark[k]?" "+mark[k]:"")+'" data-drop data-g="'+k+'"'+(mark[k]==="right"?" disabled":"")+'>'+(fill[k]?esc(fill[k].t):"<i></i>")+'</button>'}).join("")+'</p>'+
        '<div class="tm-bank">'+tiles.map(x=>{const u=fill.includes(x);return '<button type="button" class="tm-wt'+(u?" used":"")+'" data-t="'+x.i+'"'+(u?" disabled":"")+'>'+esc(x.t)+'</button>'}).join("")+'</div>';
      c.el.querySelectorAll(".tm-gap").forEach(b=>b.onclick=()=>{const k=+b.dataset.g;if(fill[k]&&mark[k]!=="right"){fill[k]=null;mark[k]="";c.sound("tap");paint()}});
      c.el.querySelectorAll(".tm-wt:not(.used)").forEach(b=>{const x=tiles.find(t=>t.i===+b.dataset.t);
        drag(b,{tap:()=>{const k=fill.findIndex(f=>!f);if(k>=0){fill[k]=x;mark[k]="";c.sound("tap");paint()}},
          drop:t=>{const k=+t.dataset.g;if(mark[k]==="right")return;fill[k]=x;mark[k]="";c.sound("tap");paint()},accept:t=>t.classList.contains("tm-gap")})});
      c.button("Check",check,fill.every(Boolean));
    };
    const check=()=>{
      tries++;fill.forEach((f,k)=>{mark[k]=same(f.t,answers[k])?"right":"wrong"});const ok=mark.every(m=>m==="right");paint();
      c.answer(ok,s.why,{last:!ok&&tries>=2,el:c.el.querySelector(".tm-gap.wrong")||c.el.querySelector(".tm-gap")});
    };
    c.retry=()=>{fill.forEach((f,k)=>{if(mark[k]==="wrong"){fill[k]=null;mark[k]=""}});paint()};
    c.reveal=()=>{answers.forEach((a,k)=>{fill[k]={t:a,i:-1-k};mark[k]="right show"});paint();c.el.querySelectorAll(".tm-wt,.tm-gap").forEach(b=>b.disabled=true)};
    paint();
  };
  /* Word builder: build the answer from tiles, in order. s.answer is a phrase (or a list of tiles), s.extra the spares. */
  G.build=c=>{
    const s=c.s,want=Array.isArray(s.answer)?s.answer:s.answer.split(" "),n=want.length;
    const tiles=mixNot(want.concat(s.extra||[]).map((t,i)=>({t,i})),b=>b.slice(0,n).every((x,k)=>x.t===want[k]));
    let line=[],good=0,tries=0,wrong=false;
    const paint=()=>{
      c.el.innerHTML='<span class="tm-kicker">Build it</span>'+q(s)+(s.pic?c.pic(s.pic):"")+
        '<div class="tm-built" data-drop>'+(line.length?line.map((x,k)=>'<button type="button" class="tm-wt in'+(wrong?(k<good?" right":" wrong"):"")+'" data-k="'+k+'">'+esc(x.t)+'</button>').join(""):'<span class="tm-built-hint">Tap the tiles in order</span>')+'</div>'+
        '<div class="tm-bank">'+tiles.map(x=>{const u=line.includes(x);return '<button type="button" class="tm-wt'+(u?" used":"")+'" data-t="'+x.i+'"'+(u?" disabled":"")+'>'+esc(x.t)+'</button>'}).join("")+'</div>';
      c.el.querySelectorAll(".tm-built .tm-wt").forEach(b=>b.onclick=()=>{line.splice(+b.dataset.k,1);wrong=false;c.sound("tap");paint()});
      c.el.querySelectorAll(".tm-bank .tm-wt:not(.used)").forEach(b=>{const x=tiles.find(t=>t.i===+b.dataset.t),add=()=>{line.push(x);wrong=false;c.sound("tap");paint()};
        drag(b,{tap:add,drop:add,accept:t=>t.classList.contains("tm-built")})});
      c.button("Check",check,line.length>0);
    };
    const check=()=>{
      tries++;good=0;while(good<line.length&&good<n&&line[good].t===want[good])good++;
      const ok=good===n&&line.length===n;wrong=!ok;paint();if(ok)c.el.querySelectorAll(".tm-built .tm-wt").forEach(b=>{b.classList.add("right");b.disabled=true});
      c.answer(ok,s.why,{last:!ok&&tries>=2,el:c.el.querySelector(".tm-built")});
    };
    c.retry=()=>{line=line.slice(0,good);wrong=false;paint()};
    c.reveal=()=>{c.el.querySelector(".tm-built").innerHTML=want.map(w=>'<span class="tm-wt in right show">'+esc(w)+'</span>').join("");c.el.querySelectorAll(".tm-bank .tm-wt").forEach(b=>b.disabled=true)};
    paint();
  };
  /* Put in order: tap the steps in order, or drag them into their places. */
  G.order=c=>{
    const s=c.s,n=s.items.length,pool=mixNot(s.items.map((t,k)=>({t,k})),b=>b.every((x,k)=>x.k===k));
    const slot=Array(n).fill(null),mark=Array(n).fill("");let tries=0;
    const paint=()=>{
      c.el.innerHTML='<span class="tm-kicker">Put in order</span>'+q(s)+'<ol class="tm-slots">'+slot.map((x,k)=>'<li class="tm-slot'+(x?" filled":"")+(mark[k]?" "+mark[k]:"")+'" data-drop data-s="'+k+'">'+
        (x?'<button type="button" class="tm-chip in" data-out="'+k+'"'+(mark[k]==="right"?" disabled":"")+'><b>'+(k+1)+'</b>'+fmt(x.t)+'</button>':'<span>'+(k+1)+'</span>')+'</li>').join("")+'</ol>'+
        '<div class="tm-pool">'+pool.filter(x=>!slot.includes(x)).map(x=>'<button type="button" class="tm-chip" data-in="'+x.k+'">'+fmt(x.t)+'</button>').join("")+'</div>';
      c.el.querySelectorAll("[data-out]").forEach(b=>b.onclick=()=>{const k=+b.dataset.out;slot[k]=null;mark[k]="";c.sound("tap");paint()});
      c.el.querySelectorAll("[data-in]").forEach(b=>{const x=pool.find(p=>p.k===+b.dataset.in);
        drag(b,{tap:()=>{const k=slot.findIndex(v=>!v);if(k>=0){slot[k]=x;c.sound("tap");paint()}},
          drop:t=>{const k=+t.dataset.s;if(mark[k]==="right")return;slot[k]=x;mark[k]="";c.sound("tap");paint()},accept:t=>t.classList.contains("tm-slot")})});
      c.button("Check",check,slot.every(Boolean));
    };
    const check=()=>{
      tries++;slot.forEach((x,k)=>{mark[k]=x.k===k?"right":"wrong"});const ok=mark.every(m=>m==="right");paint();
      c.answer(ok,ok?s.why:tries>=2?s.why:"The ones in orange are in the wrong place. Have another go.",{last:!ok&&tries>=2,el:c.el.querySelector(".tm-slot.wrong")||c.el.querySelector(".tm-slots")});
    };
    c.retry=()=>{slot.forEach((x,k)=>{if(mark[k]==="wrong"){slot[k]=null;mark[k]=""}});paint()};
    c.reveal=()=>{s.items.forEach((t,k)=>{slot[k]=pool.find(p=>p.k===k);mark[k]="right show"});paint();c.el.querySelectorAll(".tm-chip").forEach(b=>b.disabled=true)};
    paint();
  };
  /* Label the diagram: put each label in its box. Tap a label then a box (or the other way round), or drag it. */
  G.label=c=>{
    const s=c.s,sp=s.spots,chips=mix(sp.map((x,i)=>({t:x.label,i})));
    const put=sp.map(()=>null),mark=sp.map(()=>"");let sel=null,box=null,tries=0;
    const place=(k,x)=>{if(mark[k]==="right")return;const was=put.indexOf(x);if(was>=0)put[was]=null;put[k]=x;mark[k]="";sel=null;box=null;c.sound("tap");paint()};
    const paint=()=>{
      c.el.innerHTML='<span class="tm-kicker">Label the picture</span>'+q(s)+c.pic(s.pic,{spots:sp,mode:"label",maxH:280})+
        '<div class="tm-bank">'+chips.map(x=>{const u=put.includes(x);return '<button type="button" class="tm-wt'+(u?" used":"")+(sel===x?" on":"")+'" data-c="'+x.i+'"'+(u?" disabled":"")+'>'+esc(x.t)+'</button>'}).join("")+'</div>';
      c.el.querySelectorAll(".tm-drop").forEach(b=>{const k=+b.dataset.i;
        if(put[k]){b.classList.add("filled");b.innerHTML='<span>'+esc(put[k].t)+'</span>'}
        if(mark[k])b.classList.add(...mark[k].split(" "));if(box===k)b.classList.add("on");if(mark[k]==="right")b.disabled=true;
        b.onclick=()=>{if(sel){place(k,sel);return}if(put[k]){put[k]=null;mark[k]="";c.sound("tap");paint();return}box=box===k?null:k;paint()}});
      c.el.querySelectorAll(".tm-bank .tm-wt:not(.used)").forEach(b=>{const x=chips.find(t=>t.i===+b.dataset.c);
        drag(b,{tap:()=>{if(box!=null){place(box,x);return}sel=sel===x?null:x;paint()},drop:t=>place(+t.dataset.i,x),accept:t=>t.classList.contains("tm-drop")})});
      c.button("Check",check,put.every(Boolean));
    };
    const check=()=>{
      tries++;put.forEach((x,k)=>{mark[k]=x.i===k?"right":"wrong"});const ok=mark.every(m=>m==="right");paint();
      c.answer(ok,ok||tries>=2?s.why:"The orange ones are in the wrong place. Have another go.",{last:!ok&&tries>=2,el:c.el.querySelector(".tm-drop.wrong")||c.el.querySelector(".tm-art")});
    };
    c.retry=()=>{put.forEach((x,k)=>{if(mark[k]==="wrong"){put[k]=null;mark[k]=""}});paint()};
    c.reveal=()=>{sp.forEach((x,k)=>{put[k]=chips.find(ch=>ch.i===k);mark[k]="right show"});paint();c.el.querySelectorAll(".tm-drop,.tm-wt").forEach(b=>b.disabled=true)};
    paint();
  };
  /* Drag and drop the right amounts: drag (or tap) each item into the target until the counts are right. */
  G.load=c=>{
    const s=c.s,cnt={};s.items.forEach(it=>cnt[it.key]=0);let tries=0;
    c.el.innerHTML='<span class="tm-kicker">Drag and drop</span>'+q(s)+'<div class="tm-load'+(/mixer/i.test(s.into||"")?" mixer":"")+'" data-drop><div class="tm-load-in" aria-live="polite"></div><span class="tm-load-l">'+esc(s.into||"Mixing board")+'</span></div>'+
      '<div class="tm-srcs">'+s.items.map(it=>'<button type="button" class="tm-src" data-key="'+esc(it.key)+'">'+c.pic(it.pic,{bare:true,maxH:54})+'<span>'+esc(it.label)+'</span></button>').join("")+'</div>'+
      '<button type="button" class="tm-undo">'+ICON.again+'Start again</button>';
    const inner=c.el.querySelector(".tm-load-in"),need=s.need;
    const paint=pop=>{
      inner.innerHTML=s.items.filter(it=>cnt[it.key]).map(it=>'<span class="tm-load-g"><span class="tm-load-row">'+Array.from({length:cnt[it.key]},(_,j)=>'<button type="button" class="tm-load-b'+(pop===it.key&&j===cnt[it.key]-1?" pop":"")+'" data-key="'+esc(it.key)+'" aria-label="Take out one '+esc(it.label)+'">'+c.pic(it.pic,{bare:true,maxH:34})+'</button>').join("")+'</span><em>'+cnt[it.key]+' '+esc(it.label.toLowerCase())+'</em></span>').join("")||'<span class="tm-load-hint">Drag or tap the buckets below</span>';
      inner.querySelectorAll(".tm-load-b").forEach(b=>b.onclick=()=>{cnt[b.dataset.key]--;c.sound("tap");paint()});
      c.button("Check",check,Object.values(cnt).some(v=>v>0));
    };
    const add=key=>{if(cnt[key]>=12)return;cnt[key]++;c.sound("tap");paint(key)};
    c.el.querySelectorAll(".tm-src").forEach(b=>drag(b,{tap:()=>add(b.dataset.key),drop:()=>add(b.dataset.key),accept:t=>t.classList.contains("tm-load")}));
    c.el.querySelector(".tm-undo").onclick=()=>{Object.keys(cnt).forEach(k=>cnt[k]=0);paint()};
    const check=()=>{
      tries++;const ok=s.items.every(it=>cnt[it.key]===(need[it.key]||0));
      c.answer(ok,ok||tries>=2?s.why:s.hint||"Count them again.",{last:!ok&&tries>=2,el:c.el.querySelector(".tm-load")});
      if(ok||tries>=2)c.el.querySelectorAll(".tm-src,.tm-undo,.tm-load-b").forEach(b=>b.disabled=true);
    };
    c.retry=()=>paint();
    c.reveal=()=>{s.items.forEach(it=>cnt[it.key]=need[it.key]||0);paint();c.el.querySelectorAll(".tm-src,.tm-undo,.tm-load-b").forEach(b=>b.disabled=true);c.el.querySelector(".tm-load").classList.add("show")};
    paint();
  };

  /* ---------- Many-item games ---------- */
  /* Match the pairs. Left items can be pictures. */
  G.match=c=>{
    const s=c.s,left=mix(s.pairs.map((p,k)=>({t:p[0],k}))),right=mix(s.pairs.map((p,k)=>({t:p[1],k})));
    const got=new Set();let sel=null,misses=0;
    const face=t=>typeof t==="object"?c.pic(t.pic,{bare:true,maxH:60})+(t.text?'<span>'+esc(t.text)+'</span>':""):esc(t);
    c.el.innerHTML='<span class="tm-kicker">Match the pairs</span>'+q(s)+'<div class="tm-match"><div>'+left.map(x=>'<button type="button" class="tm-m'+(typeof x.t==="object"?" pic":"")+'" data-side="l" data-k="'+x.k+'">'+face(x.t)+'</button>').join("")+'</div><div>'+right.map(x=>'<button type="button" class="tm-m" data-side="r" data-k="'+x.k+'">'+face(x.t)+'</button>').join("")+'</div></div>';
    c.button(null);
    c.el.querySelectorAll(".tm-m").forEach(b=>b.onclick=()=>{
      if(b.classList.contains("got"))return;
      if(!sel||sel.dataset.side===b.dataset.side){c.el.querySelectorAll(".tm-m.on").forEach(x=>x.classList.remove("on"));sel=b;b.classList.add("on");c.sound("tap");return}
      const a=sel;sel=null;a.classList.remove("on");
      if(a.dataset.k===b.dataset.k){[a,b].forEach(x=>{x.classList.add("got");x.disabled=true});got.add(b.dataset.k);c.hit(b);
        if(got.size===s.pairs.length)setTimeout(()=>c.finish(Math.max(0,s.pairs.length-misses),s.pairs.length,misses?s:null,{why:s.why}),250)}
      else{misses++;[a,b].forEach(x=>{x.classList.add("wrong");setTimeout(()=>x.classList.remove("wrong"),450)});c.oops(b)}
    });
  };
  /* Sort it (and good or bad): one card at a time, tap the right box or drag the card into it. */
  function sorter(c,bins,items,o){
    const order=mix(items.map((_,k)=>k)),counts=bins.map(()=>0),missed=[];let k=0,right=0,busy=false;
    c.el.innerHTML='<span class="tm-kicker">'+esc(o.kicker)+'</span>'+q({q:o.q})+'<div class="tm-sort"><span class="tm-sort-n"></span><div class="tm-sort-slot"></div><p class="tm-sort-why" aria-live="polite"></p></div>'+
      '<div class="tm-bins'+(bins.length===2?" two":bins.length>4?" five":"")+'">'+bins.map((b,i)=>'<button type="button" class="tm-bin'+(b.cls?" "+b.cls:"")+'" data-drop data-bin="'+i+'">'+(b.icon||"")+'<span>'+esc(b.label)+'</span><em>0</em></button>').join("")+'</div>';
    const slot=c.el.querySelector(".tm-sort-slot"),num=c.el.querySelector(".tm-sort-n"),why=c.el.querySelector(".tm-sort-why"),binEls=[...c.el.querySelectorAll(".tm-bin")];
    const bump=b=>{counts[b]++;const e=binEls[b].querySelector("em");e.textContent=counts[b];binEls[b].classList.remove("got");void binEls[b].offsetWidth;binEls[b].classList.add("got","has")};
    const show=()=>{
      if(k>=order.length){c.finish(right,items.length,missed.length?Object.assign({},o.step,{items:missed.map(x=>x.src)}):null);return}
      const it=items[order[k]];num.textContent=(k+1)+" of "+items.length;
      slot.innerHTML='<div class="tm-sortcard" data-i="'+order[k]+'">'+(it.pic?c.pic(it.pic,{bare:true,maxH:120}):"")+(it.text?'<p>'+fmt(it.text)+'</p>':"")+'</div>';
      busy=false;drag(slot.firstChild,{drop:t=>choose(+t.dataset.bin),accept:t=>t.classList.contains("tm-bin")});
    };
    const choose=b=>{
      if(busy||k>=order.length)return;busy=true;const it=items[order[k]],card=slot.firstChild;
      if(b===it.bin){right++;bump(b);card.classList.add("gone");c.hit(binEls[b]);why.innerHTML=it.why?'<b>'+ICON.check+esc(bins[b].label)+'.</b> '+fmt(it.why):"";k++;setTimeout(show,c.reduced()?0:320);return}
      card.classList.add("wrong");binEls[it.bin].classList.add("hint");missed.push(it);why.innerHTML="";
      c.miss((o.wrong?o.wrong(it,bins):"It goes in “"+bins[it.bin].label+"”.")+(it.why?" "+it.why:""),()=>{binEls[it.bin].classList.remove("hint");bump(it.bin);k++;show()},card);
    };
    binEls.forEach(b=>b.onclick=()=>choose(+b.dataset.bin));
    c.button(null);show();
  }
  G.sort=c=>{const s=c.s;sorter(c,s.bins.map(b=>({label:b})),s.items.map(x=>Object.assign({},x,{src:x})),{q:s.q||"Sort them",kicker:"Sort it",step:s})};
  G.judge=c=>{
    const s=c.s,L=s.labels||["Good","Bad"];
    sorter(c,[{label:L[0],icon:ICON.up,cls:"good"},{label:L[1],icon:ICON.down,cls:"bad"}],s.items.map(x=>Object.assign({},x,{bin:x.good?0:1,src:x})),
      {q:s.q||"Good or bad?",kicker:L[0]+" or "+L[1].toLowerCase()+"?",step:s,wrong:(it,b)=>"That one’s "+b[it.bin].label.toLowerCase()+"."});
  };
  /* Quick fire: a few fast ones against the clock. Beat the bar for a speed bonus; when it runs out you can still
     finish (no one is locked out by the timer). */
  G.quick=c=>{
    const s=c.s,items=mix(s.items),per=s.per||5,total=s.time||items.length*per;let k=0,right=0,streak=0,late=false,timer=null;const missed=[];
    c.el.innerHTML='<div class="tm-qf-intro"><span class="tm-qf-ic">'+ICON.bolt+'</span><h2>'+esc(s.title||"Quick fire!")+'</h2><p>'+items.length+' quick ones. Beat the bar for a speed bonus.</p></div>';
    c.button("Start",start,true);
    function start(){
      c.el.innerHTML='<div class="tm-qf"><div class="tm-timer"><i></i></div><div class="tm-qf-top"><span class="tm-qf-n"></span><span class="tm-qf-s"></span></div><div class="tm-qf-card"></div><div class="tm-qf-btns"></div></div>';
      const bar=c.el.querySelector(".tm-timer i");bar.style.transitionDuration=total+"s";requestAnimationFrame(()=>requestAnimationFrame(()=>bar.style.width="0%"));
      timer=setTimeout(()=>{late=true;c.el.querySelector(".tm-timer").classList.add("late");const n=c.el.querySelector(".tm-qf-s");if(n)n.textContent="Time’s up: finish these anyway"},total*1000);
      c.button(null);ask();
    }
    function ask(){
      if(k>=items.length){clearTimeout(timer);c.finish(right,items.length,missed.length?Object.assign({},s,{items:missed,title:"Quick fire: second go",time:missed.length*8}):null,{quick:true,fast:!late&&right===items.length});return}
      const it=items[k],opts=it.opts||["True","False"],ans=it.opts?it.a:(it.a?0:1);
      c.el.querySelector(".tm-qf-n").textContent=(k+1)+" of "+items.length;
      if(!late)c.el.querySelector(".tm-qf-s").innerHTML=streak>1?ICON.flame+streak+" in a row":"";
      const card=c.el.querySelector(".tm-qf-card");card.dataset.i=s.items.indexOf(it);card.innerHTML='<p>'+fmt(it.q)+'</p>';
      const bx=c.el.querySelector(".tm-qf-btns");bx.innerHTML=opts.map((o,j)=>'<button type="button" class="tm-qbtn" data-j="'+j+'">'+esc(o)+'</button>').join("");
      bx.querySelectorAll(".tm-qbtn").forEach(b=>b.onclick=()=>{
        bx.querySelectorAll(".tm-qbtn").forEach(x=>x.disabled=true);const ok=+b.dataset.j===ans;
        if(ok){right++;streak++;b.classList.add("right");c.hit(b)}else{streak=0;missed.push(it);b.classList.add("wrong");bx.querySelector('[data-j="'+ans+'"]').classList.add("right","show");c.oops(b)}
        k++;setTimeout(ask,c.reduced()?60:ok?380:900);
      });
    }
  };
  /* A splash between parts of a lesson: a quick challenge, a surprise, fixing mistakes, or the unit challenge. */
  G.banner=c=>{
    const s=c.s,kind=s.kind||"challenge",ic={challenge:ICON.bolt,surprise:ICON.gift,review:ICON.again,trophy:ICON.trophy}[kind]||ICON.bolt;
    c.el.innerHTML='<div class="tm-banner '+kind+'"><div class="tm-banner-ic"><i class="tm-rays" aria-hidden="true"></i>'+ic+'</div><h2>'+esc(s.title)+'</h2>'+(s.text?'<p>'+fmt(s.text)+'</p>':"")+(s.xp?'<span class="tm-banner-xp">'+(window.eviaRewards&&window.eviaRewards.coin?window.eviaRewards.coin().replace('class="rw-coin"','class="rw-coin tm-coin"'):"")+esc(s.xp)+'</span>':"")+'</div>';
    c.sound(kind==="surprise"?"surprise":"banner");
    c.button(s.go||"Let’s go",c.next,true);
  };

  T.games=Object.assign(T.games||{},G);
  T.ui={pic,say,fmt,esc,drag,sound,soundOn,setSound,ICON,WHO,mix};
})();
