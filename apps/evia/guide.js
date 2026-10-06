/* Evia7 guided evidence: Evia walks a learner through one evidence pack, if they want her to.
   window.eviaGuide.start({unitName, prompts, ksbs, pack, addFiles, save, done})
     1. Photos: Evia's camera asks for one thing at a time, in the order of the job (getting ready, setting out,
        part-way through, finished); take as many as you like, or skip. Each photo is saved as soon as it's taken.
     2. Questions: one per stage, with that stage's things to mention as pills; tapping one opens a box for it.
     3. Statement: the answers are put together, in the learner's own words, as the pack's write-up,
        which goes on the PDF with the photos as normal.
   Answers are saved in the pack as they go (pack.guide), with where the learner got to (pack.guide.at), so a job done
   over a day can be carried on later from the same place. */
(function(){
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const split=s=>{const seen=new Set();return String(s||"").split("·").map(t=>t.trim()).filter(t=>{const k=t.toLowerCase();if(!t||seen.has(k))return false;seen.add(k);return true})};
  const reduced=()=>window.eviaAccessibility?window.eviaAccessibility.reducedMotion():matchMedia("(prefers-reduced-motion: reduce)").matches;
  const AVATAR='<span class="evia-mini" aria-hidden="true"><span class="evia-face"><i></i><i></i></span></span>';
  /* Each way to make evidence has its own little Evia (ra = route avatar), on the unit page and in its sheets:
     guide: counting 1, 2, 3 in a bubble above her head · free: dancing to music · record: a clapperboard that snaps
     shut · catch: sweeping a fishing net for the bits still missing. Still (showing the idea) with reduced motion. */
  const MINI='<span class="evia-mini"><span class="evia-face"><i></i><i></i></span></span>';
  const NOTE='<svg viewBox="0 0 12 16"><path d="M4 13.2V3l7-1.8v9.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="2.6" cy="13.3" rx="2.4" ry="1.9" fill="currentColor"/><ellipse cx="9.4" cy="11.4" rx="2.4" ry="1.9" fill="currentColor"/></svg>';
  const RA={
    guide:'<span class="ra-bubble"><b>1</b><b>2</b><b>3</b></span>'+MINI,
    free:'<i class="ra-note n1">'+NOTE+'</i><i class="ra-note n2">'+NOTE+'</i><i class="ra-note n3">'+NOTE+'</i>'+MINI,
    record:MINI+'<svg class="ra-clap" viewBox="0 0 30 28" aria-hidden="true">'+
      '<rect x="2" y="11" width="26" height="15" rx="2.2" class="ra-clap-body"/><path d="M5 17h20M5 21.5h13" class="ra-clap-lines"/>'+
      '<g class="ra-clap-arm"><rect x="2" y="5" width="26" height="5.6" rx="1.4" class="ra-clap-body"/><path d="M7 5l-3 5.6M13 5l-3 5.6M19 5l-3 5.6M25 5l-3 5.6" class="ra-clap-stripes"/></g>'+
      '<circle cx="2.8" cy="10.8" r="1.4" class="ra-clap-hinge"/></svg>',
    catch:MINI+'<svg class="ra-net" viewBox="0 0 44 44" aria-hidden="true"><g class="ra-net-swing">'+
      '<path d="M8 43L26 17" class="ra-net-pole"/>'+
      '<path d="M24.5 19.5c-1 7 4.5 12.5 11 11 3.2-3.6 4.8-8.4 4.2-12.8" class="ra-net-bag"/>'+
      '<path d="M27 22.6l9-9.2M29.8 26.6l8.4-11.4M26 18.4l12.6 5.6M25.4 23.4l13 3.2M31.5 29.6l2.4-16.4" class="ra-net-mesh"/>'+
      '<ellipse cx="32.3" cy="15.4" rx="9.4" ry="5.2" transform="rotate(-32 32.3 15.4)" class="ra-net-hoop"/></g>'+
      '<g class="ra-net-catch"><path d="M34 1.5l1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.7 1.4.5-3-2.2-2.1 3-.4z" class="ra-net-star"/></g></svg>'
  };
  const routeAvatar=kind=>'<span class="ra ra-'+kind+'" aria-hidden="true">'+(RA[kind]||MINI)+'</span>';
  window.eviaRouteAvatar=routeAvatar;
  const AVATAR_OFF=routeAvatar("free");

  /* ---------- The stages of a job ---------- */
  /* Each thing to capture, thing to mention and the unit's skills and behaviours is sorted into the stage of the job
     it belongs to, so Evia follows the job from start to finish and asks about each part once. The learner never sees
     codes: skills show as plain "Good evidence shows you can…" lines. */
  const STAGES=[
    {key:"setout",title:"Setting out",
      photo:"Photograph your setting out: the lines, levels and measurements, with the tape or level showing. Get one of the whole set-up, then move in close.",
      ask:"How did you set it out, and how did you check it was right?"},
    {key:"finish",title:"The finished job",
      photo:"Photograph the finished job. Stand back to get the whole thing in, then move in close on the detail: joints, levels, finish. Include how you left the area.",
      ask:"How did you finish off, and how did you check the quality of your work?"},
    {key:"ready",title:"Getting ready",
      photo:"Before you start, photograph your work area set up safely, and the materials, tools and drawings ready to use.",
      ask:"How did you get ready for this job?"},
    {key:"know",title:"Why it matters",
      ask:"What would you tell a new apprentice about doing this job properly, and why it matters?"},
    {key:"doing",title:"The job in progress",
      photo:"Photograph the job part-way through. Ask someone to take one of you at work, then take a few of how it’s coming along.",
      ask:"Talk me through how you did the job, step by step."}
  ];
  const ORDER=["ready","setout","doing","finish","know","reflect"];
  const REFLECT={key:"reflect",title:"Looking back",ask:"What went well, and what would you do differently next time?"};
  /* Checked in this order: safety belongs to getting ready even when it mentions protection; materials only count as
     getting ready when nothing else places them. */
  const RULES=[
    ["doing",/\bteam|communicat/],
    ["reflect",/learning|development|reflect|feedback|improv/],
    ["setout",/setting[- ]?out|set out|marking out|\blevels?\b|laser|profile|gauge rods?|squares?\b|\blines?\b|datum|plumb|radius|angle/],
    ["ready",/\bppe\b|\brpe\b|protective equipment|safe|hazard|risk|\bsigns?\b|signage|asbestos|slips|height|manual handling|health|wellbeing|well-being|toolbox|method statement/],
    ["know",/regulation|standard|warrant|inclus|equity|divers|equal|modern|digital|terminology|principle|legislation|ownership|\bcost|programme|design/],
    ["finish",/finish|joint|pointing|flush|half round|weather|recess|struck|protect|clean|waste|recycl|environment|surface water|maintain|maintenance|capping|coping|tidy|inspect|quality|check/],
    ["ready",/drawing|specification|estimat|resource|select|quantit|material|pre-?mix|silo|\btools?\b|plan\b|prepar|survey|defect|damage/]
  ];
  const stageOf=text=>{const t=String(text).toLowerCase();const r=RULES.find(([,re])=>re.test(t));return r?r[0]:"doing"};
  const list=a=>a.length<2?a.join(""):a.slice(0,-1).join(", ")+" and "+a[a.length-1];
  /* A skill or behaviour from the unit, as a plain line: "Gauge and hand mix mortar to ratio". */
  function plain(ksb){
    let t=String(ksb).split("|").slice(1).join("|").split(/:\s|\.\s|\bFor example\b|\be\.g\.|,?\s+including,/)[0].trim().replace(/[.,;]+$/,"");
    t=t.replace(/^(\w+?)(ies|s)\b/,(m,w,e)=>/^(applies|carries|complies|identifies|specifies)$/i.test(m)?w+"y":/ss$/i.test(m)||!/^(uses|selects|applies|works|takes|follows|carries|communicates|interprets|maintains|installs|builds|sets|prepares|checks|plans|identifies|complies|contributes|demonstrates)$/i.test(m)?m:w+(e==="ies"?"y":""));
    t=t.replace(/\btheir own\b/gi,"your own").replace(/\bthemselves\b/gi,"yourself").replace(/\btheir\b/gi,"your");
    return t.length>6&&t.length<140?t.charAt(0).toUpperCase()+t.slice(1):"";
  }
  /* Short tips shown under each photo request, by stage. */
  const TIP={ready:"Before you start: your area set up safely, with what you need ready.",setout:"Get the tape, level or line in the shot.",
    doing:"Part-way through. Ask someone to take one of you at work.",finish:"Stand back for the whole job, then move in close on the detail."};
  /* What to talk about when a stage has nothing more specific. */
  const TOPICS={ready:["How you got ready"],setout:["How you set it out","How you checked it"],doing:["What you did, step by step"],
    finish:["How you finished off","How you checked the quality"],know:["Why doing it properly matters"],reflect:["What went well","What you’d do differently"]};
  const OTHER="Something else";
  /* A little detail for each photo: what this one should show (photo-tips.js), or the stage's tip. */
  const tip=(item,k)=>window.eviaPhotoTip&&window.eviaPhotoTip(item)||TIP[k];
  const cap=t=>{t=String(t).trim();return t.charAt(0).toUpperCase()+t.slice(1)};
  /* The plan for a pack: one photo request at a time (each thing to capture, in the order of the job), and a question
     for each stage with its topics to pick from. */
  function plan(ctx){
    const caps=split(ctx.prompts&&ctx.prompts.photos),terms=split(ctx.prompts&&ctx.prompts.writeup);
    const ksbs=(ctx.ksbs||[]).filter(k=>/^[SB]\d/.test(String(k)));
    const by={};ORDER.forEach(k=>by[k]={caps:[],terms:[],can:[]});
    caps.forEach(c=>by[stageOf(c)].caps.push(c));
    terms.forEach(t=>by[stageOf(t)].terms.push(t));
    ksbs.forEach(k=>{const p=plain(k);if(p&&!by[stageOf(p)].can.includes(p))by[stageOf(p)].can.push(p)});
    const def=k=>k==="reflect"?REFLECT:STAGES.find(s=>s.key===k);
    const photos=[];
    ["ready","setout","doing","finish"].forEach(k=>{
      const s=def(k),c=by[k].caps;
      if(c.length)c.forEach(item=>photos.push({key:k,say:cap(item),hint:tip(item,k)}));
      else if(k!=="setout")photos.push({key:k,say:s.title,hint:s.photo});
    });
    /* Things to capture that belong to the talking stages still get a photo, at the end. */
    ["know","reflect"].forEach(k=>by[k].caps.forEach(item=>photos.push({key:"finish",say:cap(item),hint:tip(item,"finish")})));
    return {photos,asks:ksbAsks(ctx.ksbs||[],terms)};
  }
  /* The write-up questions follow the unit's KSBs: each skill with the knowledge listed after it (S14 with K20), and
     each behaviour on its own, so it reads like the unit's own instructions, in plain words. Every thing to mention
     sits with the KSBs it belongs to, and lights up as the learner writes about it. */
  const ROLE=/^(site carpent(er|ry)|bench join(er|ery)|carpent(er|ry) and join(er|ery)|bricklay(er|ing)|architectural join(er|ery))\s*:\s*/i;
  const low=t=>t.charAt(0).toLowerCase()+t.slice(1);
  /* "Mixing Mortar" reads "mixing mortar"; "signage, Safety signage" reads "safety signage". */
  const tidy=t=>{const parts=String(t).replace(/\b([A-Z])([a-z]{2,})/g,(m,x,y)=>x.toLowerCase()+y).split(/,\s*/).map(x=>x.trim()).filter(Boolean);
    return parts.length>3?parts.join(", "):parts.filter((x,i)=>!parts.some((y,j)=>j!==i&&y.length>x.length&&y.toLowerCase().includes(x.toLowerCase()))).join(", ")};
  const skillLine=k=>{let l=plain(k);if(!l)return "";l=l.replace(/,?\s*(for example|e\.g\.|such as)\b.*$/i,"").replace(/\s+(for|of|to|with|including|in|on)$/i,"").trim();return l};
  const kLine=text=>{
    const t=String(text).replace(ROLE,"").replace(/[.,;\s]+$/,"").replace(/\.\s+(?=[a-z])/g,", "),i=t.indexOf(":");
    const a=tidy((i>0?t.slice(0,i):t).trim()),b=i>0?tidy(t.slice(i+1).trim()):"";
    const out=b&&a.split(/\s+/).length<=6?low(a)+", like "+low(b):low(b?a+": "+b:a);
    return out.length>150?out.slice(0,147).replace(/\s+\S*$/,"")+"…":out;
  };
  function ksbAsks(ksbs,terms){
    const groups=[];let g=null;
    ksbs.forEach(k=>{
      const c=String(k).split("|")[0].trim(),t=c.charAt(0).toUpperCase();
      if(t==="B"){if(!g||g.kind!=="B")groups.push(g={kind:"B",items:[]});g.items.push(k);return}
      if(t==="S"){if(!g||g.kind!=="S"||g.items.some(x=>/^K/i.test(x)))groups.push(g={kind:"S",items:[]});g.items.push(k);return}
      if(t==="K"){if(!g||g.kind==="B")groups.push(g={kind:"K",items:[]});g.items.push(k);return}
    });
    if(!groups.length)return [{key:"job",title:"The job",ask:"Talk me through the job: what you did, in order, how you did it and why.",codes:[],know:[],terms:terms.slice()}];
    const text=x=>x.items.map(k=>String(k).split("|").slice(1).join("|")).join(" ").toLowerCase();
    const asks=groups.map((x,i)=>{
      const codes=x.items.map(k=>String(k).split("|")[0].trim()),S=x.items.filter(k=>/^[SB]/i.test(k)),K=x.items.filter(k=>/^K/i.test(k));
      const lines=S.map(k=>skillLine(String(k).replace(/^([^|]*\|)\s*(.*)$/,(m,a,b)=>a+b.replace(ROLE,"")))).filter(Boolean);
      const title=lines[0]||(K.length?cap(kLine(String(K[0]).split("|").slice(1).join("|"))):codes.join(" · "));
      const ask=lines.length?"How did you "+lines.map(low).join(", and ")+" on this job?":"What do you know about this? Tell me in your own words, with an example from your job.";
      return {key:"k"+i+"-"+codes.join("-"),title,ask,codes,know:K.map(k=>kLine(String(k).split("|").slice(1).join("|"))),terms:[],_t:text(x)};
    });
    /* Each thing to mention goes with the first group whose KSBs talk about it; the rest with the closest match. */
    const match=window.eviaTermMatched||((a,b)=>b.includes(a.toLowerCase()));
    terms.forEach(term=>{
      let a=asks.find(q=>match(term,q._t));
      if(!a){const w=term.toLowerCase().split(/[^a-z]+/).filter(x=>x.length>=4).map(x=>x.slice(0,4));a=asks.find(q=>w.some(x=>q._t.includes(x)))||asks[0]}
      a.terms.push(term);
    });
    asks.forEach(a=>delete a._t);
    return asks;
  }

  /* ---------- The flow ----------
     Where the learner got to is saved in the pack (guide.at), so a job done over a day can be picked up later: the
     next photo to take, or the question they were on. Photos are saved to the pack the moment they're taken. */
  const answeredIn=(g,asks)=>asks.filter(a=>String(g.answers[a.key]||"").trim()).length;
  /* Where the guide keeps its answers in the pack: catch up keeps its own, so the two never mix. */
  const gk=ctx=>ctx.gk||"guide";
  function load(pack,k){
    k=k||"guide";let g=pack[k];
    if(!g||(g.v!==2&&g.v!==3&&g.v!==4))g={v:4,answers:{},covered:{},at:null};
    if(g.v!==4){const prev=Object.values(g.answers||{}).map(x=>String(x||"").trim()).filter(Boolean).join("\n\n");g={v:4,answers:{},covered:{},at:null,prev,used:g.used}}
    return pack[k]=g;
  }
  const whereText=(P,at)=>at.phase==="photos"?"photo "+(Math.min(at.step,P.photos.length-1)+1)+" of "+P.photos.length+": <strong>"+esc(P.photos[Math.min(at.step,P.photos.length-1)].say)+"</strong>":
    at.phase==="ask"&&P.asks[at.i]?"question "+(at.i+1)+" of "+P.asks.length+": <strong>"+esc(P.asks[at.i].title)+"</strong>":"your statement";
  function resume(ctx,P,at){
    if(at.phase==="photos"&&window.eviaCamera&&window.eviaCamera.supported())return photos(ctx,P,Math.min(at.step,P.photos.length-1));
    if(at.phase==="ask")return ask(ctx,P,at.i||0);
    return review(ctx,P);
  }
  let cur="guide";   /* which route's Evia the sheets show */
  function start(ctx){
    cur=ctx.route||"guide";
    /* ctx.plan: a pack with its own photos and questions (the PPE induction), instead of the unit's. */
    const P=ctx.plan||plan(ctx),g=load(ctx.pack,gk(ctx)),answered=answeredIn(g,P.asks);
    const canCam=window.eviaCamera&&window.eviaCamera.supported();
    const at=!g.used&&g.at?g.at:null;
    if(at){
      sheet('<p class="eg-say">Welcome back. Last time you got to '+whereText(P,at)+'. Everything you’ve done so far is saved.</p>',
        [{label:"Carry on from there",primary:true,run:()=>resume(ctx,P,at)},
         canCam&&at.phase!=="photos"?{label:"Take more photos",run:()=>photos(ctx,P,0)}:null,
         at.phase==="photos"?{label:"Skip to the questions",run:()=>ask(ctx,P,firstGap(P,g))}:null].filter(Boolean),
        {kicker:(ctx.kicker||"EVIA · GUIDED EVIDENCE"),title:ctx.unitName});
      return;
    }
    sheet('<p class="eg-say">'+(answered?"Welcome back. You’ve answered "+answered+" of my "+P.asks.length+" questions.":ctx.intro||"I’ll guide you through this job from start to finish: one photo at a time, then a few questions about how it went. I’ll put your answers together into your statement.")+'</p>'+
      (answered?"":'<ol class="eg-stages">'+(P.stages||[...new Set(P.photos.map(p=>(STAGES.find(s=>s.key===p.key)||{}).title))]).map(t=>'<li>'+esc(t)+'</li>').join("")+'</ol>')+
      '<p class="eg-small">Skip anything you like. Everything saves as you go, so you can stop and carry on later, even hours later.</p>',
      /* First time: one button. Back part-way through: carry on, or more photos. */
      answered?[{label:"Carry on with the questions",primary:true,run:()=>ask(ctx,P,firstGap(P,g))},
         canCam?{label:"Take more photos",run:()=>photos(ctx,P,0)}:null].filter(Boolean)
        :[{label:"Get started",primary:true,run:()=>canCam?photos(ctx,P,0):ask(ctx,P,0)}],
      {kicker:(ctx.kicker||"EVIA · GUIDED EVIDENCE"),title:ctx.unitName,wide:!answered});
  }
  const firstGap=(P,g)=>{const i=P.asks.findIndex(a=>!String(g.answers[a.key]||"").trim());return i<0?P.asks.length:i};
  const mark=(ctx,at)=>{ctx.pack[gk(ctx)].at=at;ctx.save()};

  function photos(ctx,P,from){
    close(true);let got=0;
    mark(ctx,{phase:"photos",step:from||0});
    window.eviaCamera.open({title:ctx.unitName,guide:P.photos,startStep:from||0,progress:{done:0,total:P.photos.length+P.asks.length},
      onStep:step=>mark(ctx,{phase:"photos",step}),
      onShot:file=>{got++;ctx.addFiles([file])},
      onDone:(files,info)=>{
        if(files.length){got+=files.length;ctx.addFiles(files)}
        const finished=info&&info.finished;
        setTimeout(()=>{
          if(!finished){
            const step=info?info.step:0;mark(ctx,{phase:"photos",step});
            sheet('<p class="eg-say">'+(got?"Saved: "+got+" photo"+(got===1?"":"s")+". ":"")+'Stopped for now. When you come back, I’ll pick up at <strong>'+esc(P.photos[step].say)+'</strong>.</p>',
              [{label:"Close",primary:true,run:()=>close()},{label:"Skip to the questions",run:()=>ask(ctx,P,firstGap(P,ctx.pack[gk(ctx)]))}],
              {kicker:(ctx.kicker||"EVIA · GUIDED EVIDENCE"),title:"Photos paused"});
            return;
          }
          mark(ctx,{phase:"ask",i:firstGap(P,ctx.pack[gk(ctx)])});
          sheet('<p class="eg-say">'+(got?"Nice, that’s "+got+" photo"+(got===1?"":"s")+" added.":"No photos this time. You can add them later.")+' Now a few questions about how the job went. Pick the parts you want to talk about and answer in your own words.</p>',
            [{label:"Start the questions",primary:true,run:()=>ask(ctx,P,firstGap(P,ctx.pack[gk(ctx)]))},{label:"Stop for now",run:()=>close()}],
            {kicker:(ctx.kicker||"EVIA · GUIDED EVIDENCE"),title:"Photos done"});
        },60);
      }});
  }

  /* One question: its KSBs, Evia's question, the knowledge to explain, the things to mention (they light up as the
     learner writes about them), and one box for their own words. */
  const chipsOf=a=>(a.terms&&a.terms.length?a.terms:(a.topics||[]).filter(t=>t!==OTHER)).map(cap);
  function ask(ctx,P,i){
    const g=ctx.pack[gk(ctx)],n=P.asks.length;
    if(i>=n){review(ctx,P);return}
    const a=P.asks[i],chips=chipsOf(a);
    mark(ctx,{phase:"ask",i});
    const el=sheet(
      '<div class="eg-progress" aria-hidden="true"><i style="width:'+Math.round((P.photos.length+i+1)/(P.photos.length+n)*100)+'%"></i></div>'+
      (a.codes&&a.codes.length?'<div class="eg-codes">'+a.codes.map(c=>'<span>'+esc(c)+'</span>').join("")+'</div>':"")+
      '<p class="eg-say eg-q">'+esc(a.ask)+'</p>'+
      (a.know&&a.know.length?'<p class="eg-know"><b>Explain what you know about</b> '+esc(a.know.join("; "))+'.</p>':"")+
      (chips.length?'<div class="eg-mention"><span class="eg-mention-h">Things to mention</span>'+chips.map(t=>'<span class="eg-chip" data-t="'+esc(t)+'">'+esc(t)+'</span>').join("")+'</div>':"")+
      '<textarea class="eg-text" id="eg-text" data-otj="'+esc(ctx.unitName)+'" rows="6" placeholder="In your own words: what you did, how, and why…" aria-label="'+esc(a.title)+'">'+esc(g.answers[a.key]||"")+'</textarea>',
      [{label:i===n-1?"Finish":"Next",primary:true,run:()=>{save();ask(ctx,P,i+1)}}],
      {kicker:"EVIA · "+(i+1)+" OF "+n,title:a.title,back:i>0?()=>{save();ask(ctx,P,i-1)}:null,keep:true,full:true,compact:true});
    const box=el.querySelector("#eg-text"),chipEls=[...el.querySelectorAll(".eg-chip")];
    const light=()=>{const t=box.value.toLowerCase();chipEls.forEach(c=>c.classList.toggle("on",!!(window.eviaTermMatched?window.eviaTermMatched(c.dataset.t,t):t.includes(c.dataset.t.toLowerCase()))))};
    function save(){store(ctx,a,box.value.trim())}
    let timer=null;box.oninput=()=>{light();clearTimeout(timer);timer=setTimeout(save,400)};light();
  }
  /* The answer, and which things to mention it covers (a thorough answer covers its question's list). */
  function store(ctx,a,text){
    const g=ctx.pack[gk(ctx)],t=String(text||"");g.answers[a.key]=t;
    const chips=a.terms||[],lowT=t.toLowerCase();
    g.covered[a.key]=t.split(/\s+/).filter(Boolean).length>=25?chips.slice():chips.filter(c=>window.eviaTermMatched?window.eviaTermMatched(c,lowT):lowT.includes(String(c).toLowerCase()));
    ctx.save();
  }

  /* The statement: what they already wrote, then each answer as its own paragraph, in the order of the job. */
  function compile(ctx,P){
    const g=ctx.pack[gk(ctx)],parts=P.asks.map(a=>String(g.answers[a.key]||"").trim()).filter(Boolean);
    const had=String(ctx.pack.write||"").trim(),prev=String(g.prev||"").trim();
    return [had,prev&&!had.includes(prev)?prev:"",...parts.filter(p=>!had.includes(p))].filter(Boolean).join("\n\n");
  }
  function review(ctx,P){
    const text=compile(ctx,P),n=answeredIn(ctx.pack[gk(ctx)],P.asks);
    mark(ctx,{phase:"review"});
    if(!text){
      sheet('<p class="eg-say">You skipped all the questions, so there’s nothing to put together yet. You can come back to me any time, or write it yourself.</p>',[{label:"Close",primary:true,run:()=>close()}],{kicker:(ctx.kicker||"EVIA · GUIDED EVIDENCE"),title:"Your statement"});return;
    }
    const el=sheet('<p class="eg-say">Here’s your statement, made from your '+n+' answer'+(n===1?"":"s")+'. Read it through and change anything you like. It goes in your write-up and on the PDF with your photos.</p>'+
      '<textarea class="eg-text eg-final" id="eg-final" rows="12" aria-label="Your statement">'+esc(text)+'</textarea>',
      [{label:"Use this statement",primary:true,run:()=>{
        ctx.pack.write=el.querySelector("#eg-final").value.trim();ctx.pack[gk(ctx)].used=new Date().toISOString();ctx.pack[gk(ctx)].at=null;
        ctx.save();close();ctx.done();
        if(typeof showEvidenceToast==="function")setTimeout(()=>showEvidenceToast("Statement added to your write-up"),250);
      }}],
      {kicker:(ctx.kicker||"EVIA · GUIDED EVIDENCE"),title:"Your statement",back:()=>ask(ctx,P,P.asks.length-1),keep:true,full:true,compact:true});
  }

  /* ---------- Sheet ---------- */
  function sheet(body,buttons,o){
    const root=document.getElementById("modal-root");
    fit(false);
    const open=root.querySelector(".eg-overlay:not(.ui-closing)"),wasFull=open&&open.classList.contains("eg-full");
    const html='<div class="overlay eg-overlay'+(o.full?" eg-full":"")+'"><section class="sheet pr-sheet eg-sheet" role="dialog" aria-modal="true" aria-labelledby="eg-title">'+
      '<div class="sheet-head"><div class="eg-head">'+routeAvatar(o.avatar||(o.free?"free":cur))+'<div><div class="chat-kicker">'+esc(o.kicker)+'</div><h2 id="eg-title">'+esc(o.title)+'</h2></div></div><button class="close" id="eg-close" type="button" aria-label="Close">×</button></div>'+
      '<div class="pr-body">'+body+'<div class="pr-actions eg-actions'+(o.compact?" eg-compact":"")+(o.wide?" eg-wide":"")+'">'+(o.back?'<button type="button" class="eg-back" id="eg-back">'+esc(o.backLabel||"‹ Back")+'</button>':"")+buttons.map((b,i)=>'<button type="button" class="'+(b.primary?"primary":"secondary")+'" data-eg="'+i+'">'+esc(b.label)+'</button>').join("")+'</div></div></section></div>';
    /* Moving between screens of the same size swaps the sheet in place (no fade out and in); otherwise it opens fresh. */
    if(open&&wasFull===!!o.full){
      const t=document.createElement("div");t.innerHTML=html;const fresh=t.firstChild;
      open.className=fresh.className+" eg-steady";open.replaceChildren(...fresh.childNodes);
      open.querySelector(".eg-sheet").classList.add("eg-swap");
    }else root.innerHTML=html;
    const el=root.querySelector(".eg-sheet");
    /* Full screens keep the buttons outside the scrolling part, so they sit just above the keyboard. */
    if(o.full){el.appendChild(el.querySelector(".eg-actions"));fit(true)}
    el.querySelectorAll("[data-eg]").forEach(b=>b.onclick=()=>buttons[+b.dataset.eg].run());
    if(o.back)el.querySelector("#eg-back").onclick=o.back;
    const x=()=>{const t=el.querySelector("#eg-text");if(t&&t.oninput)t.oninput();close()};
    el.querySelector("#eg-close").onclick=x;
    root.querySelector(".overlay").onclick=o.keep?null:e=>{if(e.target.classList.contains("overlay"))close()};
    if(!el.querySelector("textarea")){const h=el.querySelector("#eg-title");h.setAttribute("tabindex","-1");h.focus({preventScroll:true})}
    return el;
  }
  /* Writing screens fill the space above the keyboard, so the question, the box and the buttons all stay in view. */
  let fitting=false;
  const size=()=>{
    const v=window.visualViewport,h=v?v.height:innerHeight,r=document.documentElement.style;
    r.setProperty("--eg-vh",h+"px");r.setProperty("--eg-top",(v?v.offsetTop:0)+"px");
    /* Short on space (usually the keyboard is up): tuck away the extras so the answer box stays roomy. */
    const o=document.querySelector(".eg-overlay.eg-full");if(o)o.classList.toggle("eg-tight",h<600);
  };
  function fit(on){
    const v=window.visualViewport;if(on===fitting)return;fitting=on;
    if(on){size();if(v){v.addEventListener("resize",size);v.addEventListener("scroll",size)}else addEventListener("resize",size)}
    else if(v){v.removeEventListener("resize",size);v.removeEventListener("scroll",size)}else removeEventListener("resize",size);
  }
  function close(now){
    fit(false);
    const root=document.getElementById("modal-root"),o=root&&root.querySelector(".eg-overlay");if(!o)return;
    if(now||reduced()){root.innerHTML="";return}
    o.classList.add("ui-closing");setTimeout(()=>{if(root.contains(o))root.innerHTML=""},170);
  }

  /* ---------- Free range ----------
     The same look as the guide, without the steps: the camera lists every thing to capture at once, and the write-up
     lists every thing to mention, with one box for the learner's own words. at: "photos" or "write" opens that part.
     ctx is start()'s, plus submit() to send the pack to the portfolio. */
  const words=t=>String(t||"").trim()?String(t).trim().split(/\s+/).length:0;
  const plural=(n,w)=>n+" "+w+(n===1?"":"s");
  function free(ctx,at){
    cur="free";
    if(at==="photos")return freePhotos(ctx);
    if(at==="write")return freeWrite(ctx);
    const n=(ctx.pack.photos||[]).length,w=words(ctx.pack.write);
    sheet('<p class="eg-say">'+(n||w?"Welcome back. So far you’ve got "+plural(n,"photo")+(w?" and "+plural(w,"word")+" written":"")+".":
        "Add whatever you like, your way. Take all your photos first, with everything worth capturing listed. Then write it up in your own words, with everything worth mentioning listed.")+'</p>'+
      '<ol class="eg-stages"><li>Photos</li><li>Write-up</li></ol>'+
      '<p class="eg-small">Everything saves as you go, so you can stop and carry on later.</p>',
      [{label:"Get started",primary:true,run:()=>freePhotos(ctx)}],
      {kicker:"FREE RANGE",title:ctx.unitName,free:true,wide:true});
    closeRefreshes(ctx);
  }
  /* Closing a free range sheet redraws the unit page, so what's in progress shows there. */
  const closeRefreshes=ctx=>{const x=document.getElementById("eg-close");if(x){const was=x.onclick;x.onclick=()=>{was();ctx.done()}}};
  function gallery(ctx,then){
    const i=document.createElement("input");i.type="file";i.accept="image/*";i.multiple=true;
    i.onchange=async()=>{const files=[...i.files];if(files.length)await ctx.addFiles(files);then()};i.click();
  }
  function freePhotos(ctx){
    if(!(window.eviaCamera&&window.eviaCamera.supported()))return gallery(ctx,()=>free(ctx));
    close(true);
    window.eviaCamera.open({title:ctx.unitName,prompts:split(ctx.prompts&&ctx.prompts.photos),onDone:async files=>{
      if(files.length)await ctx.addFiles(files);
      const n=(ctx.pack.photos||[]).length;
      setTimeout(()=>{
        sheet('<p class="eg-say">'+(files.length?"Saved: "+plural(files.length,"photo")+". ":"")+"You’ve got "+plural(n,"photo")+" in this pack. Take more, or write it up.</p>",
          [{label:"Write it up",primary:true,run:()=>freeWrite(ctx)},{label:"Take more photos",run:()=>freePhotos(ctx)},{label:"Stop for now",run:()=>{close();ctx.done()}}],
          {kicker:"FREE RANGE · PHOTOS",title:ctx.unitName,free:true});
        closeRefreshes(ctx);
      },60);
    }});
  }
  function freeWrite(ctx){
    const pack=ctx.pack,terms=split(ctx.prompts&&ctx.prompts.writeup);
    const ready=()=>!!((pack.photos||[]).length||String(pack.write||"").trim());
    const hintText=()=>ready()?"Ready to submit.":"Write something, or add a photo, to submit.";
    const el=sheet(
      '<p class="eg-ctx">Write about the job in your own words: what you did, how and why.</p>'+
      (terms.length?'<div class="fr-mention"><div class="evidence-section-title">THINGS TO MENTION</div><div class="compact-prompts">'+esc(terms.join(" · "))+'</div></div>':"")+
      '<textarea class="eg-text" id="write" data-otj="'+esc(ctx.unitName)+'" rows="8" placeholder="Write about the process and what you did…" aria-label="Your write-up">'+esc(pack.write||"")+'</textarea>'+
      '<p class="eg-small fr-hint" id="fr-hint">'+hintText()+'</p>',
      [{label:"Submit to Portfolio",primary:true,run:async()=>{if(!ready())return;close(true);await ctx.submit()}}],
      {kicker:"FREE RANGE · WRITE-UP",title:ctx.unitName,back:()=>{close(true);free(ctx)},keep:true,full:true,compact:true,free:true});
    const box=el.querySelector("#write"),btn=el.querySelector(".eg-actions .primary"),hint=el.querySelector("#fr-hint");
    const update=()=>{btn.disabled=!ready();hint.textContent=hintText()};
    box.oninput=()=>{pack.write=box.value;ctx.save();update()};
    update();closeRefreshes(ctx);
  }

  /* ---------- Film it or talk it through ----------
     Video is laid out like the photo camera (the things to capture under the picture); voice like the write-up (the
     things to mention, lighting up as they're said). Where the phone can, what's said is written down as it's
     recorded: the transcript is kept with the pack, out of the way, and counts towards the things to mention just
     like a write-up. ctx.addMedia(blob,mime,{kind,secs,transcript}) keeps a recording in the pack. */
  const REC_LIMIT={video:180,audio:300};
  const mmss=s=>Math.floor(s/60)+":"+String(Math.round(s%60)).padStart(2,"0");
  const canTranscribe=()=>!!(window.SpeechRecognition||window.webkitSpeechRecognition);
  function record(ctx){
    cur="record";
    if(!(window.eviaRecorder&&window.eviaRecorder.supported())){
      sheet('<p class="eg-say">This phone can’t record from inside Evia. Use Free range to add photos and a write-up instead, or ask your assessor about other ways to record it.</p>',[{label:"Close",primary:true,run:()=>close()}],{kicker:"FILM OR TALK",title:ctx.unitName});return;
    }
    const m=ctx.pack.media||[],v=m.filter(x=>x.kind==="video").length,a=m.filter(x=>x.kind==="audio").length;
    sheet('<p class="eg-say">'+(m.length?"So far you’ve got "+[v?plural(v,"video"):"",a?plural(a,"voice note"):""].filter(Boolean).join(" and ")+". Record another, or submit it.":
        "Show the job, or talk it through, whichever suits you. Film it and talk about what you’re doing, or record a voice note explaining how you did it and why.")+'</p>'+
      '<div class="rec-pick"><button type="button" class="rec-opt" data-rec="video"><span class="rec-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="6.5" width="13" height="11" rx="2.5"/><path d="M16 10l5-3v10l-5-3z"/></svg></span><span><strong>Film it</strong><small>Up to 3 minutes, with the things to capture</small></span></button>'+
      '<button type="button" class="rec-opt" data-rec="audio"><span class="rec-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="8" y="3" width="8" height="12" rx="4"/><path d="M5 11.5a7 7 0 0 0 14 0M12 18.5V22M9 22h6"/></svg></span><span><strong>Talk it through</strong><small>Up to 5 minutes, with the things to mention</small></span></button></div>'+
      '<p class="eg-small">'+(canTranscribe()?"Evia writes down what you say as you record, so your assessor can see what you covered. You don’t need to write anything.":"Your assessor will watch or listen to it. You don’t need to write anything.")+'</p>',
      m.length?[{label:"Submit to Portfolio",primary:true,run:async()=>{close(true);await ctx.submit()}},{label:"Stop for now",run:()=>{close();ctx.done()}}]:[],
      {kicker:"FILM OR TALK",title:ctx.unitName,wide:true});
    document.querySelectorAll("[data-rec]").forEach(b=>b.onclick=()=>rec(ctx,b.dataset.rec));
    closeRefreshes(ctx);
  }
  function rec(ctx,kind){
    close(true);
    const video=kind==="video";
    window.eviaRecorder.open({type:kind,limit:REC_LIMIT[kind],transcribe:true,
      prompts:split(ctx.prompts&&(video?ctx.prompts.photos:ctx.prompts.writeup)),promptsTitle:video?"Things to capture":"Things to mention",
      onDone:async(blob,mime,info)=>{
        await ctx.addMedia(blob,mime,{kind,secs:info&&info.secs||0,transcript:info&&info.transcript||""});
        setTimeout(()=>{
          const t=String(info&&info.transcript||"").trim(),terms=split(ctx.prompts&&ctx.prompts.writeup),said=t&&window.eviaTermMatched?terms.filter(x=>window.eviaTermMatched(x,t)):[];
          sheet('<p class="eg-say">Saved: '+(video?"your video":"your voice note")+(info&&info.secs?" ("+mmss(info.secs)+")":"")+'.'+(said.length?" You mentioned "+said.length+" of the "+terms.length+" things to mention.":"")+'</p>'+
            (t?'<details class="rec-transcript"><summary>What Evia wrote down</summary><p>'+esc(t)+'</p></details>':""),
            [{label:"Submit to Portfolio",primary:true,run:async()=>{close(true);await ctx.submit()}},{label:"Record another",run:()=>record(ctx)},{label:"Stop for now",run:()=>{close();ctx.done()}}],
            {kicker:"FILM OR TALK",title:ctx.unitName});
          closeRefreshes(ctx);
        },60);
      }});
  }

  /* ---------- Catch up ----------
     After the assessor has looked at evidence for a unit, Evia goes after just what's still needed (More required):
     a photo request for each skill or behaviour, then one question per missing KSB. It works like the guide, keeps
     its own answers (pack.catch), and the pack it makes is mapped to those KSBs only. ctx.missing: [{code,text}]. */
  function catchPlan(ctx){
    const photos=[],asks=[],low=t=>t.charAt(0).toLowerCase()+t.slice(1);
    ctx.missing.forEach(({code,text})=>{
      const line=plain(code+"|"+text)||String(text).split(/[.:]/)[0],K=/^K/.test(code);
      if(!K)photos.push({key:"doing",say:line,hint:"Take a photo that shows this. One or two is fine."});
      asks.push({key:"k-"+code,title:code,ask:K?"What do you know about "+low(String(text).split(/:\s|\.\s/)[0].replace(/[.,;]+$/,""))+"? Tell me in your own words, with an example from your job.":"How did this job show that you can "+low(line)+"?",
        terms:[],topics:[line,OTHER],can:[]});
    });
    if(!photos.length)photos.push({key:"doing",say:"Anything that shows it",hint:"A photo of the work, the drawings or the kit you used. Or skip photos."});
    return {photos,asks,stages:ctx.missing.map(x=>x.code+": "+(plain(x.code+"|"+x.text)||x.text.split(/[.:]/)[0]))};
  }
  function catchUp(ctx){
    const n=ctx.missing.length;
    start(Object.assign({},ctx,{plan:catchPlan(ctx),gk:"catch",route:"catch",kicker:"EVIA · CATCH UP",
      intro:"Your assessor needs a bit more for "+(n===1?"one thing":n+" things")+" in this unit. Let’s catch "+(n===1?"it":"them")+". Anything that shows "+(n===1?"it":"them")+" counts: a couple of photos and a few words is fine."}));
  }

  window.eviaGuide={start,free,plan,plain,record,catchUp};
})();
