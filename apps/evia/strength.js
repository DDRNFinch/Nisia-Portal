/* Evia7 evidence strength: a rough guide, worked out quietly in the background. Learners see the signal bars on
   their units, never the scoring.
     Photos:   under 5 weak · 5 to 9 good · 10 or more strong
     Write-up: how many of the unit's "Things to mention" areas it talks about. An area the learner answered with
               guided Evia counts in full.
     Overall:  strong when both are strong, weak when either is weak, otherwise good.
   window.eviaStrength: unit(unitName) -> "weak"|"good"|"strong"|null, pack(pack,prompts) -> level, guide() */
(function(){
  const split=s=>String(s||"").split("·").map(t=>t.trim()).filter(Boolean);
  const words=t=>String(t||"").trim().split(/\s+/).filter(Boolean).length;
  const matched=(term,text)=>window.eviaTermMatched?window.eviaTermMatched(term,text):String(text||"").toLowerCase().includes(term.toLowerCase());
  const photoCount=e=>Array.isArray(e.photoIds)?e.photoIds.length:Number.isFinite(Number(e.photoCount))?Number(e.photoCount):Array.isArray(e.p)?e.p.length:0;
  const promptsFor=name=>((window.eviaLearnerPrompts||{})[course]||{})[name]||{};

  const photoLevel=n=>n>=10?"strong":n>=5?"good":"weak";
  /* guided: areas the learner answered with Evia (full marks); text: everything they wrote. */
  function writeLevel(text,terms,guided){
    if(!words(text))return "weak";
    if(!terms.length)return words(text)>=100?"strong":words(text)>=50?"good":"weak";
    const got=terms.filter(t=>(guided||[]).includes(t)||matched(t,text)).length/terms.length;
    return got>=2/3?"strong":got>=1/3?"good":"weak";
  }
  const combine=(p,w)=>p==="strong"&&w==="strong"?"strong":p==="weak"||w==="weak"?"weak":"good";

  /* Areas answered with guided Evia in a working pack. */
  const guidedAreas=p=>{const c=p&&p.guide&&p.guide.covered;return c?[...new Set([].concat(...Object.values(c)))]:[]};
  /* A working pack (before it's submitted). */
  /* Recordings count too: a video shows the job like a few photos do, and what's said counts like a write-up. */
  const vids=x=>(x.media||[]).filter(m=>m.kind==="video").length*3,said=x=>(x.media||[]).map(m=>m.transcript||"").join(" ");
  function pack(p,prompts){
    return combine(photoLevel((p.photos||[]).length+vids(p)),writeLevel(String(p.write||"")+" "+said(p),split(prompts&&prompts.writeup),guidedAreas(p)));
  }
  /* A unit: all its submitted packs together. */
  function unit(name){
    const es=(typeof evidence!=="undefined"?evidence:[]).filter(e=>e.c===course&&e.u===name);
    if(!es.length)return null;
    const text=es.map(e=>(e.w||"")+" "+said(e)).join("\n"),guided=[].concat(...es.map(e=>e.guidedAreas||[]));
    return combine(photoLevel(es.reduce((n,e)=>n+photoCount(e)+vids(e),0)),writeLevel(text,split(promptsFor(name).writeup),guided));
  }

  /* ---------- How to build a strong portfolio: five slides, Evia talking you through them ---------- */
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const bars=level=>typeof strengthBars==="function"?strengthBars(level):'<span class="unit-strength-bars">'+[1,2,3].map(i=>'<i class="signal-bar signal-bar-'+i+(i<=({weak:1,good:2,strong:3})[level]?" filled":"")+'"></i>').join("")+'</span>';
  const ICO={
    you:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c.9-3.9 3.8-6 7.2-6s6.3 2.1 7.2 6"/></svg>',
    level:'<svg viewBox="0 0 24 24"><rect x="2.5" y="9" width="19" height="6" rx="2"/><rect x="9.5" y="10.6" width="5" height="2.8" rx="1.4"/><path d="M12 10.6v2.8"/></svg>',
    why:'<svg viewBox="0 0 24 24"><path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-7l-4.5 3.5v-3.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z"/><path d="M8 10h8M8 13h5"/></svg>',
    cam:'<svg viewBox="0 0 24 24"><path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18v-8A1.5 1.5 0 0 1 4 8.5z"/><circle cx="12" cy="13.8" r="3.3"/></svg>'
  };
  /* A worked example for the learner's trade. */
  const EXAMPLES={
    bricklayer:{job:"a cavity wall",weak:"I built a cavity wall today. It went well.",strong:"I set out the first course dry and used a gauge rod to keep the courses at 75 mm. I fitted wall ties every 450 mm and kept the cavity clean with a board. I checked it for level and plumb every few courses and wore my PPE throughout.",terms:["set out","gauge rod","wall ties","cavity","level","plumb","PPE"]},
    joiner:{job:"a mortice and tenon joint",weak:"I made a joint for a frame. It fits.",strong:"I marked out the mortice and tenon from the cutting list with a mortice gauge set to the chisel width. I cut the tenon shoulders with a tenon saw, chopped the mortice, then dry fitted and glued and cramped the frame square, checking the diagonals.",terms:["marked out","mortice gauge","tenon saw","chopped","dry fitted","cramped","square"]},
    site:{job:"hanging a door",weak:"I hung a door. It shuts okay.",strong:"I checked the door for the right hand and trimmed it to leave a 2 to 3 mm gap. I marked the hinges 150 mm down and 225 mm up, cut the recesses with a chisel, screwed it on and fitted the latch so it closes against the stop.",terms:["hand","gap","hinges","recesses","chisel","latch","stop"]}
  };
  EXAMPLES.trowel3=EXAMPLES.bricklayer;
  const marked=(text,terms)=>{let h=esc(text);terms.forEach(t=>{h=h.replace(new RegExp("\\b("+t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","i"),'<mark>$1</mark>')});return h};

  function guide(){
    const root=document.getElementById("modal-root"),ex=EXAMPLES[typeof course!=="undefined"?course:""]||EXAMPLES.bricklayer;
    const MINI='<span class="evia-mini"><span class="evia-face"><i></i><i></i></span></span>';
    /* The course, a week at a time: whatever job comes up goes towards its unit, and units come round again. */
    const WEEKS={
      bricklayer:[["Cavity walling","Construct Cavity Walling"],["Mixing mortar","Mixing mortar"],["A repair","Repair brick walling"],["Back to cavity walling","Construct Cavity Walling"],["An opening","Cavity opening"],["Pointing","Jointing Styles"]],
      site:[["Hanging doors","Internal and external doors"],["Skirting","Skirting boards and architrave"],["A stud wall","Timber/metal partition walls"],["More doors","Internal and external doors"],["Floor joists","Floor joists (and coverings)"],["Kitchen units","Wall and floor units"]],
      joiner:[["A door frame","Door frames and linings"],["Joints","Basic woodworking joints"],["Mouldings","Timber mouldings"],["Another frame","Door frames and linings"],["A timber door","Timber doors"],["Ironmongery","Ironmongery"]]
    };
    const weeks=WEEKS[typeof course!=="undefined"?course:""]||WEEKS.bricklayer;
    const PPE=["Hard hat","Hi-vis","Safety glasses","Gloves","Safety boots"];
    const slides=[
      {title:"Every job can count",say:"Whatever you’re doing at work, it can count towards one of your units. Gather any evidence you can, and explain it properly.",
        body:'<div class="sg-three">'+[["cam","Photos of the job","From setting out to the finished job."],["why","Your explanation","What you did, how and why, in your own words."],["level","Your KSBs","I show you which ones the job covers, and help you write about each."]].map(([i,t,x])=>'<div class="sg-card"><span class="sg-ic">'+ICO[i]+'</span><b>'+t+'</b><span>'+x+'</span></div>').join("")+'</div>'},
      {title:"Start, middle and end",say:"Take photos as the job goes: setting out, half way through, and the finished job. Wear your full PPE in every photo.",
        body:'<div class="sg-photos">'+[["build-1","Setting out"],["build-2","Half way through"],["build-3","Finished"]].map(([f,t],i)=>'<figure><img src="guide-pics/'+f+'.jpg" alt="'+t+'" loading="lazy"><figcaption><b>'+(i+1)+'</b>'+t+'</figcaption></figure>').join("")+'</div>'+
          '<div class="sg-ppe"><span class="sg-ppe-h">Full PPE, every photo</span>'+PPE.map(p=>'<span>'+p+'</span>').join("")+'</div>'},
      {title:"Explain it properly",say:"Say what you did, in order, how you did it and why. Use the things to mention. If you want, I’ll take you through it KSB by KSB.",
        body:'<div class="sg-ex weak"><div class="sg-ex-h"><b>Not enough</b>'+bars("weak")+'</div><p>'+esc(ex.weak)+'</p></div>'+
          '<div class="sg-ex strong"><div class="sg-ex-h"><b>Much better</b>'+bars("strong")+'</div><p>'+marked(ex.strong,ex.terms)+'</p><small>The highlighted words are things to mention for '+esc(ex.job)+'.</small></div>'},
      {title:"The strength bars",say:"Each unit has bars. They’re my rough guide to how your evidence is coming along, from your photos and your explanation together.",
        body:'<div class="sg-levels">'+[["weak","Getting started","A few photos, or the explanation misses most of the things to mention."],["good","Good","5 or more photos, and the explanation covers some of the things to mention."],["strong","Strong","10 or more photos, and the explanation covers most of the things to mention."]].map(([l,t,x])=>'<div class="sg-level">'+bars(l)+'<span><b>'+t+'</b><span>'+x+'</span></span></div>').join("")+'</div>'+
          '<p class="sg-note">Your assessor always makes the final decision.</p>'},
      {title:"Keep collecting as you go",say:"Across your course, gather evidence from the jobs you do each week. One week it’s one job, the next week something else, and units come round again. It all adds up.",
        body:'<ol class="sg-course">'+weeks.map(([job,unit],i)=>'<li><span class="sg-wk">Week '+(i+1)+'</span><span class="sg-job"><b>'+esc(job)+'</b><em>'+esc(unit)+'</em></span>'+(weeks.findIndex(w=>w[1]===unit)<i?'<span class="sg-again">Again</span>':"")+'</li>').join("")+'</ol>'}
    ];
    let at=0;
    root.innerHTML='<div class="overlay sg-overlay"><section class="sg" role="dialog" aria-modal="true" aria-labelledby="st-title">'+
      '<header class="sg-top"><span class="sg-dots" aria-hidden="true">'+slides.map((_,i)=>'<i data-dot="'+i+'"></i>').join("")+'</span><button class="close" id="st-close" type="button" aria-label="Close">×</button></header>'+
      '<div class="sg-stage" id="sg-stage"></div>'+
      '<footer class="sg-foot"><button type="button" class="secondary" id="sg-back">Back</button><button type="button" class="primary" id="sg-next">Next</button></footer></section></div>';
    const stageEl=root.querySelector("#sg-stage"),back=root.querySelector("#sg-back"),next=root.querySelector("#sg-next");
    const draw=dir=>{
      const s=slides[at];
      stageEl.innerHTML='<div class="sg-slide'+(dir?" from-"+(dir>0?"right":"left"):"")+'"><p class="sg-kicker">How to build a strong portfolio · '+(at+1)+' of '+slides.length+'</p><h2 id="st-title" tabindex="-1">'+esc(s.title)+'</h2>'+
        '<div class="sg-say">'+MINI+'<p>'+esc(s.say)+'</p></div><div class="sg-body">'+s.body+'</div></div>';
      root.querySelectorAll("[data-dot]").forEach(d=>d.classList.toggle("on",+d.dataset.dot===at));
      back.style.visibility=at?"visible":"hidden";next.textContent=at===slides.length-1?"Got it":"Next";
      stageEl.querySelector("h2").focus({preventScroll:true});
    };
    const go=d=>{if(at+d<0)return;if(at+d>=slides.length)return close();at+=d;draw(d)};
    const close=()=>{document.removeEventListener("keydown",key);const o=root.querySelector(".overlay");if(!o)return;o.classList.add("ui-closing");setTimeout(()=>{if(root.contains(o))root.innerHTML=""},170)};
    const key=e=>{if(e.key==="ArrowRight")go(1);else if(e.key==="ArrowLeft")go(-1);else if(e.key==="Escape")close()};
    document.addEventListener("keydown",key);
    back.onclick=()=>go(-1);next.onclick=()=>go(1);
    document.getElementById("st-close").onclick=close;
    root.querySelector(".overlay").addEventListener("click",e=>{if(e.target.classList.contains("overlay"))close()});
    /* Swipe between slides. */
    let x0=null;stageEl.addEventListener("touchstart",e=>{x0=e.touches[0].clientX},{passive:true});
    stageEl.addEventListener("touchend",e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>50)go(dx<0?1:-1)});
    draw(0);
  }

  window.eviaStrength={unit,pack,guide,guidedAreas,photoLevel,writeLevel};
})();
