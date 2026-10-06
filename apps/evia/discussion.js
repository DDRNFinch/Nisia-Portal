/* Evia7 professional discussion: a recorded practice discussion, graded on the phone without AI.
   Evia asks each question (out loud, if the phone can speak). The learner talks and the phone writes a transcript as
   they go (Web Speech API); where that isn't available they type, or use the microphone on their keyboard. If an
   answer misses a key area, Evia asks one follow-up about it, as an assessor would.
   Each answer is graded from the transcript against a fixed rubric (see grade()): the key areas covered (answers only
   given after a follow-up count half), detail (trade words), reasons, checking, order, a real example and length.
   window.eviaDiscussion.open({count}) · the result is saved with the other tests for the progress review. */
(function(){
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const KEYS={bricklayer:"bricklaying",site:"siteCarpentry",joiner:"benchJoinery"};
  const key=()=>KEYS[typeof course!=="undefined"?course:""]||"bricklaying";
  const bank=()=>{let b=[];try{b=EPA_DISCUSSIONS[key()]||[]}catch(_){}const g=(window.EVIA_EPA_GUIDE||{})[key()]||[];return b.map((q,i)=>Object.assign({},q,{prompts:(g[i]||{}).prompts||q.points.map(p=>"Tell me about "+p.label.toLowerCase()+".")}))};
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const time=s=>Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0");
  const words=t=>String(t||"").trim().split(/\s+/).filter(Boolean).length;
  const has=(text,term)=>new RegExp("(^|[^a-z])"+term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(?=$|[^a-z])").test(text);

  /* ---------- The rubric ---------- */
  const REASON=["because","so that","so it","so the","so i","to make sure","to ensure","otherwise","which means","that way","in order to","to stop","to prevent","to avoid"];
  const CHECK=["check","checked","checking","measure","measured","inspect","level","plumb","square","tolerance","against the drawing","diagonal","gauge","test fit","double check"];
  const ORDER=["first","firstly","to start","then","next","after that","afterwards","before","once","finally","at the end","lastly","second","third"];
  const EXAMPLE=["on site","last week","last month","on a job","when i","i did","i have","i've","at work","my supervisor","we had","on one job","for example"];
  const SAFETY=["ppe","safe","safely","safety","risk","hazard","gloves","goggles","glasses","boots","hard hat","guard","dust mask","ear defenders","hi-vis"];
  const FILLERS=["um","umm","uh","er","erm","like","you know","sort of","kind of"];
  const TRADE={
    bricklaying:["bond","stretcher","header","gauge","gauge rod","datum","profile","line and pins","corner","quoin","perp","perpend","bed joint","jointer","half round","weather struck","flush","recessed","cavity","wall tie","dpc","lintel","mortar","cement","sand","lime","plasticiser","mixer","trowel","spirit level","plumb","level","course","toothing","racking back","reveal","sill","coping","spot board","batching","ratio","frost","hessian","efflorescence","tolerance","specification","drawing","3-4-5","diagonal","building line","setting out"],
    siteCarpentry:["joist","stud","noggin","sole plate","head plate","lintel","trimmer","trimming joist","hanger","strutting","rafter","purlin","ridge","wall plate","architrave","skirting","scribe","mitre","coping saw","mitre saw","circular saw","nail gun","screw","fixing","plug","packer","plumb","level","square","diagonal","centres","span","grade","c16","c24","door frame","lining","jamb","head","reveal","hinge","specification","drawing","setting out","tolerance","chisel","plane"],
    benchJoinery:["mortice","tenon","haunch","shoulder","cheek","dovetail","housing","rebate","groove","moulding","sash","stile","rail","mullion","transom","rod","setting out","cutting list","marking gauge","mortice gauge","try square","sliding bevel","face side","face edge","planer","thicknesser","bandsaw","spindle","morticer","tenoner","push stick","guard","cramp","glue","dry assemble","dry assembly","sand","grit","grain","arris","moisture","tolerance","specification","drawing","chisel","plane"]
  };
  const hits=(text,list)=>list.filter(t=>has(text,t));
  /* Learners name the thing, not the category: gloves and boots are PPE, a trowel is a tool. Each key area also
     counts these everyday words, picked by what the area is about. */
  const SYN=[
    [/tool|equipment|machin/i,["trowel","spirit level","hammer","club hammer","saw","chisel","drill","tape","tape measure","square","line and pins","bolster","jointer","plane","screwdriver","mallet","mitre saw","nail gun","cramp","clamp","marking gauge"]],
    [/ppe|safe/i,["gloves","boots","safety boots","hard hat","helmet","goggles","glasses","eye protection","hi-vis","ear defenders","ear protection","dust mask","mask","safe","safely","guard"]],
    [/material|mortar|timber|fixing/i,["bricks","blocks","lime","timber","wood","screws","nails","glue","water","plasticiser","ratio","hangers"]],
    [/drawing|spec|information|detail/i,["plans","specification","spec","elevation","schedule","dimensions"]],
    [/line|level|align|plumb|true/i,["plumb","straight","spirit level","string line","level","square"]],
    [/housekeeping|tidy|workshop/i,["tidy","clean","sweep","skip","waste","clear","put away"]],
    [/defect|correct|adjust|fix|error|cause/i,["damage","damaged","chipped","crack","fault","snag","put right","take down","relay","report"]],
    [/measure|dimension|setting out|set out|mark/i,["tape","measure","measured","mm","metres","dimensions","mark","marked"]],
    [/inspect|check|test|quality|fit/i,["check","checked","inspect","measure","test","look over","against the drawing"]]
  ];
  const termsFor=p=>[...new Set(p.terms.concat(...SYN.filter(x=>x[0].test(p.label)).map(x=>x[1])))];
  function grade(q,main,follow){
    const a=String(main||"").toLowerCase(),f=String(follow||"").toLowerCase(),all=a+" "+f;
    const pts=q.points.map(p=>{const ts=termsFor(p);return {label:p.label,main:ts.some(t=>has(a,t)),follow:ts.some(t=>has(f,t))}});
    const cover=pts.reduce((n,p)=>n+(p.main?1:p.follow?.5:0),0)/pts.length;
    const trade=[...new Set(hits(all,TRADE[key()]||[]).concat([].concat(...q.points.map(p=>hits(all,termsFor(p))))))];
    const s={
      cover:{label:"Key areas",of:50,v:cover},
      detail:{label:"Detail and trade words",of:15,v:Math.min(1,trade.length/10)},
      reasons:{label:"Saying why",of:10,v:Math.min(1,hits(all,REASON).length/3)},
      check:{label:"Checking the work",of:10,v:Math.min(1,hits(all,CHECK).length/2)},
      order:{label:"A clear order",of:5,v:Math.min(1,hits(all,ORDER).length/3)},
      example:{label:"A real example",of:5,v:hits(all,EXAMPLE).length?1:0},
      length:{label:"Enough said",of:5,v:Math.max(0,Math.min(1,(words(all)-40)/80))}
    };
    const score=Math.round(Object.values(s).reduce((n,x)=>n+x.v*x.of,0));
    const tips=[];
    const missing=pts.filter(p=>!p.main&&!p.follow).map(p=>p.label),prompted=pts.filter(p=>!p.main&&p.follow).map(p=>p.label);
    if(missing.length)tips.push("Cover "+list(missing)+".");
    if(prompted.length)tips.push("Mention "+list(prompted)+" without being asked.");
    if(s.reasons.v<1)tips.push("Say why you do things: “…because…”, “…so that…”.");
    if(s.check.v<1)tips.push("Say how you check your work: level, plumb, square, measurements against the drawing.");
    if(s.example.v<1)tips.push("Use a real example: “On a job last month I…”.");
    if(s.detail.v<.6)tips.push("Name the tools, materials and terms you’d use.");
    if(s.order.v<.6)tips.push("Go through it in order: first, then, finally.");
    if(!hits(all,SAFETY).length)tips.push("Mention safety: PPE and working safely.");
    const fill=hits(" "+all+" ",FILLERS.filter(x=>x!=="like")).length;
    return {score,parts:s,pts,trade,missing,prompted,tips,filler:fill,words:words(all)};
  }
  const list=a=>a.length<2?a.join(""):a.slice(0,-1).join(", ")+" and "+a[a.length-1];
  const band=p=>p>=75?{t:"Distinction standard",c:"d"}:p>=50?{t:"Pass standard",c:"p"}:{t:"Not there yet",c:"n"};

  /* ---------- Speaking and listening ---------- */
  let muted=false;try{muted=localStorage.getItem("evia7-discussion-voice")==="off"}catch(_){}
  function say(text){
    if(muted||!window.speechSynthesis)return;
    try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="en-GB";u.rate=.98;const v=speechSynthesis.getVoices().find(v=>/en-GB/i.test(v.lang));if(v)u.voice=v;speechSynthesis.speak(u)}catch(_){}
  }
  const hush=()=>{try{window.speechSynthesis&&speechSynthesis.cancel()}catch(_){}};
  /* Keeps listening until stopped. Browsers stop listening after each pause, and on Android every restart plays a
     tone, so restarting straight away beeps every few seconds and sounds like the recording has stopped. So: while
     the learner is mid-flow it restarts at once; after a quiet spell it waits, listening quietly to the microphone
     level, and only restarts when they start speaking again. */
  function waitForVoice(isOn){
    return new Promise((resolve,reject)=>{
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return reject(new Error("no level"));
      navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}}).then(stream=>{
        const AC=window.AudioContext||window.webkitAudioContext;if(!AC){stream.getTracks().forEach(t=>t.stop());return reject(new Error("no audio"))}
        const ac=new AC(),an=ac.createAnalyser();an.fftSize=1024;ac.createMediaStreamSource(stream).connect(an);
        const buf=new Uint8Array(an.fftSize),t0=Date.now();let floor=0,n=0,hits=0;
        const done=ok=>{clearInterval(iv);stream.getTracks().forEach(t=>t.stop());try{ac.close()}catch(_){}ok?resolve():reject(new Error("stopped"))};
        const iv=setInterval(()=>{
          if(!isOn())return done(false);
          an.getByteTimeDomainData(buf);let sum=0;for(let i=0;i<buf.length;i++){const x=(buf[i]-128)/128;sum+=x*x}const rms=Math.sqrt(sum/buf.length);
          /* The first moment sets the room's background level; speech is well above it. */
          if(Date.now()-t0<350){floor=(floor*n+rms)/(n+1);n++;return}
          hits=rms>Math.max(.025,floor*2.6)?hits+1:0;
          if(hits>=2)done(true);
        },60);
      },reject);
    });
  }
  function listener(onText,onFail){
    let rec=null,on=false,finalText="",heardAt=0,gating=false;
    const start=()=>{
      rec=new SR();rec.lang="en-GB";rec.continuous=true;rec.interimResults=true;
      rec.onresult=e=>{heardAt=Date.now();let interim="";for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)finalText+=(finalText&&!/\s$/.test(finalText)?" ":"")+t.trim()+" ";else interim+=t}onText(finalText,interim)};
      rec.onerror=e=>{if(e.error==="not-allowed"||e.error==="service-not-allowed"||e.error==="audio-capture"){on=false;onFail(e.error)}};
      rec.onend=()=>{
        if(!on)return;
        /* Still talking: carry straight on. Gone quiet: wait for their voice before listening again. */
        if(Date.now()-heardAt<1800){try{rec.start()}catch(_){}return}
        if(gating)return;gating=true;
        waitForVoice(()=>on).then(()=>{gating=false;if(on)start()},()=>{gating=false;if(on)setTimeout(()=>{if(on)start()},1500)});
      };
      try{rec.start()}catch(_){}
    };
    return {start(){on=true;heardAt=0;start()},stop(){on=false;try{rec&&rec.stop()}catch(_){}return finalText.trim()},get text(){return finalText.trim()}};
  }

  /* ---------- Answering out loud ----------
     A microphone button, a listening animation and a timer: the words stay hidden. Stop, then Next (or Record again).
     capture(el,{foot,onStart,onDone(text,secs),next}) draws into el (and the buttons into foot, if given). */
  function capture(el,o){
    const foot=o.foot||el;let on=false,live=null,t0=0,tick=null;
    const draw=(state,msg)=>{
      el.innerHTML='<div class="vc vc-'+state+'"><div class="vc-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><p class="vc-msg" aria-live="polite">'+msg+'</p><span class="vc-time">'+(t0?time((Date.now()-t0)/1000):"")+'</span></div>';
    };
    const idle=msg=>{draw("idle",msg||"Tap the microphone and answer out loud.");foot.innerHTML='<button type="button" class="dr-mic" aria-label="Start answering"><span></span></button>';foot.querySelector(".dr-mic").onclick=start};
    const start=()=>{
      if(o.onStart)o.onStart();on=true;t0=Date.now();draw("on","Recording… speak naturally. Pauses are fine.");
      foot.innerHTML='<button type="button" class="dr-mic on" aria-label="Stop"><span></span></button>';foot.querySelector(".dr-mic").onclick=stop;
      tick=setInterval(()=>{const t=el.querySelector(".vc-time");if(t)t.textContent=time((Date.now()-t0)/1000)},500);
      live=listener(()=>{},err=>{clearInterval(tick);on=false;t0=0;idle(err==="not-allowed"||err==="service-not-allowed"?"I can’t use the microphone. Allow it in your browser settings, then try again.":"I can’t hear the microphone. Check it and try again.")});
      live.start();
    };
    const stop=()=>{
      if(!on)return;on=false;clearInterval(tick);const secs=Math.round((Date.now()-t0)/1000);
      draw("wait","One moment…");foot.innerHTML="";
      setTimeout(()=>{
        const txt=live?live.stop():"";live=null;
        if(words(txt)<3){t0=0;return idle("I didn’t catch that. Check the microphone isn’t covered, then try again.")}
        draw("done","Got it. "+time(secs)+" of speaking.");
        foot.innerHTML='<button type="button" class="dr-btn" data-vc="again">Record again</button><button type="button" class="dr-btn dr-primary" data-vc="next">'+(o.next||"Next")+'</button>';
        foot.querySelector('[data-vc="again"]').onclick=()=>{t0=0;idle()};
        foot.querySelector('[data-vc="next"]').onclick=()=>o.onDone(txt,secs);
      },700);
    };
    idle();
    return {stop:()=>{clearInterval(tick);if(live)live.stop()}};
  }

  /* ---------- The discussion room ---------- */
  let root=null,timer=null;
  function open(o){
    o=o||{};
    const all=bank();if(!all.length)return alert("There are no discussion questions for your course yet.");
    const qs=o.count&&o.count<all.length?all.slice().sort(()=>Math.random()-.5).slice(0,o.count):all.slice(0,5);
    const answers=qs.map(()=>({main:"",follow:"",followQ:"",secs:0}));
    let i=0,phase="main",t0=0,live=null;
    if(root)root.remove();
    root=document.createElement("div");root.className="dr";root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");root.setAttribute("aria-label","Professional discussion");
    document.body.appendChild(root);
    const shut=()=>{hush();clearInterval(timer);if(live)live.stop();const r=root;root=null;if(r){r.classList.add("dr-out");setTimeout(()=>r.remove(),200)}};
    const leave=()=>{if(i>0||answers[0].main){if(!confirm("Leave the discussion? It won’t be saved."))return}shut()};
    const bar=title=>'<header class="dr-bar"><button type="button" class="dr-x" aria-label="Leave">×</button><span class="dr-title">'+title+'</span>'+
      (window.speechSynthesis?'<button type="button" class="dr-voice" aria-pressed="'+!muted+'" aria-label="Evia’s voice">'+(muted?"🔇":"🔊")+'</button>':"")+'</header>';
    const wire=()=>{root.querySelector(".dr-x").onclick=leave;const v=root.querySelector(".dr-voice");if(v)v.onclick=()=>{muted=!muted;try{localStorage.setItem("evia7-discussion-voice",muted?"off":"on")}catch(_){}v.textContent=muted?"🔇":"🔊";v.setAttribute("aria-pressed",!muted);if(muted)hush()}};
    const face='<span class="dr-evia evia-mini" aria-hidden="true"><span class="evia-face"><i></i><i></i></span></span>';

    const intro=()=>{
      if(!SR){
        root.innerHTML=bar("Professional discussion")+'<div class="dr-body dr-intro">'+face+'<span class="dr-kicker">Voice needed</span><h1>This one is spoken</h1>'+
          '<p class="dr-lead">The discussion is answered out loud, like the real thing, and I turn what you say into text to grade it.</p>'+
          '<ul class="dr-rules"><li>This browser can’t turn your voice into text.</li><li>Open Evia in <strong>Chrome</strong> on Android or <strong>Safari</strong> on iPhone.</li><li>When it asks, allow the microphone.</li></ul></div>'+
          '<footer class="dr-foot"><button type="button" class="dr-btn dr-primary" id="dr-ok">OK</button></footer>';
        wire();root.querySelector("#dr-ok").onclick=shut;return;
      }
      root.innerHTML=bar("Professional discussion")+'<div class="dr-body dr-intro">'+face+'<span class="dr-kicker">'+(qs.length>1?"Full discussion":"Quick practice")+'</span><h1>'+qs.length+' question'+(qs.length>1?"s":"")+', answered out loud</h1>'+
        '<ul class="dr-rules"><li>I’ll ask each question, like your assessor would.</li><li>Tap the microphone and answer out loud. I’ll listen and turn it into text in the background.</li>'+
        '<li>If you miss something, I may ask a follow-up question.</li><li>At the end I’ll grade each answer from what you said, and show you how to improve it.</li></ul>'+
        '<p class="dr-note">Find somewhere quiet and allow the microphone when asked. Speak naturally: a good answer usually takes a minute or two.</p></div>'+
        '<footer class="dr-foot"><button type="button" class="dr-btn dr-primary" id="dr-go">Start</button></footer>';
      wire();root.querySelector("#dr-go").onclick=()=>ask();
    };

    /* One question (or its follow-up): Evia asks, the learner answers out loud. The words aren't shown: it's spoken. */
    const ask=()=>{
      const q=qs[i],a=answers[i],follow=phase==="follow",text=follow?a.followQ:q.prompt;
      root.innerHTML=bar("Question "+(i+1)+" of "+qs.length+(follow?" · follow-up":""))+
        '<div class="dr-body"><div class="dr-ask">'+face+'<p class="dr-q">'+esc(text)+'</p></div><div class="dr-cap"></div></div><footer class="dr-foot"></footer>';
      wire();say(text);
      capture(root.querySelector(".dr-cap"),{foot:root.querySelector(".dr-foot"),onStart:hush,onDone:(txt,secs)=>{t0=Date.now()-secs*1000;finishAnswer(txt)}});
    };
    const finishAnswer=text=>{
      const q=qs[i],a=answers[i],secs=Math.round((Date.now()-t0)/1000);a.secs+=secs;t0=0;
      if(phase==="main"){
        a.main=text;
        const g=grade(q,text,"");
        /* One follow-up, on the first key area they left out, as an assessor would. */
        const k=q.points.findIndex(p=>g.missing.includes(p.label));
        if(k>=0){a.followQ="Thanks. "+(q.prompts[k]||"Tell me about "+q.points[k].label.toLowerCase()+".");phase="follow";return ask()}
      }else a.follow=text;
      phase="main";i++;
      if(i<qs.length)ask();else results();
    };

    const results=()=>{
      hush();
      const gs=qs.map((q,k)=>grade(q,answers[k].main,answers[k].follow)),pct=Math.round(gs.reduce((n,g)=>n+g.score,0)/gs.length),b=band(pct);
      const parts=Object.keys(gs[0].parts).map(id=>({label:gs[0].parts[id].label,v:gs.reduce((n,g)=>n+g.parts[id].v,0)/gs.length}));
      const tipCount={};gs.forEach(g=>g.tips.forEach(t=>{tipCount[t]=(tipCount[t]||0)+1}));
      const top=Object.entries(tipCount).sort((x,y)=>y[1]-x[1]).slice(0,3).map(x=>x[0]);
      save(qs,answers,gs,pct);
      root.innerHTML=bar("Your results")+'<div class="dr-body">'+
        '<div class="dr-score"><span class="dr-kicker">Practice grade</span><b>'+pct+'%</b><span class="dr-band '+b.c+'">'+b.t+'</span></div>'+
        '<div class="dr-parts">'+parts.map(p=>'<div class="dr-part"><span>'+esc(p.label)+'</span><i><i style="width:'+Math.round(p.v*100)+'%"></i></i></div>').join("")+'</div>'+
        (top.length?'<div class="dr-tips"><strong>To improve</strong><ul>'+top.map(t=>'<li>'+esc(t)+'</li>').join("")+'</ul></div>':"")+
        '<h3 class="dr-h">Each answer</h3>'+gs.map((g,k)=>{const a=answers[k],bb=band(g.score);return '<details class="dr-ans"'+(gs.length===1?" open":"")+'><summary><span>'+(k+1)+'. '+esc(qs[k].prompt.split(/(?<=\.)\s/)[0])+'</span><em class="dr-band '+bb.c+'">'+g.score+'%</em></summary>'+
          '<div class="dr-chips">'+g.pts.map(p=>'<span class="'+(p.main?"ok":p.follow?"half":"no")+'">'+(p.main?"✓ ":p.follow?"½ ":"✗ ")+esc(p.label)+'</span>').join("")+'</div>'+
          (a.follow?'<p class="dr-fq">Follow-up: '+esc(a.followQ.replace(/^Thanks\. /,""))+'</p>':"")+
          (g.trade.length?'<p class="dr-used">Key words you used</p><div class="dr-words-used">'+g.trade.slice(0,14).map(t=>'<span>'+esc(t)+'</span>').join("")+'</div>':"")+
          '<p class="dr-stat">'+time(a.secs)+' of speaking · '+g.words+' words'+(g.filler>2?' · '+g.filler+' “ums” and “ers”':"")+'</p>'+
          (g.tips.length?'<ul class="dr-tip">'+g.tips.map(t=>'<li>'+esc(t)+'</li>').join("")+'</ul>':'<p class="dr-good">A strong answer.</p>')+'</details>'}).join("")+
        '<p class="dr-note">This is a practice grade worked out from your words: key areas, detail, reasons, checks, order, a real example and length. Your real assessment is graded by an assessor. Saved for your progress review.</p></div>'+
        '<footer class="dr-foot"><button type="button" class="dr-btn dr-primary" id="dr-end">Done</button></footer>';
      wire();root.querySelector(".dr-x").onclick=shut;root.querySelector("#dr-end").onclick=shut;
      if(window.eviaMood)window.eviaMood(pct>=50?"happy":"think");
    };
    intro();
  }
  function save(qs,answers,gs,pct){
    const result={type:"discussion",course,savedAt:new Date().toISOString(),pct,score:gs.filter(g=>g.score>=50).length,total:gs.length,recorded:true,
      questions:qs.map((q,k)=>({prompt:q.prompt,answer:answers[k].main,follow:answers[k].follow,followQ:answers[k].followQ,pct:gs[k].score,covered:gs[k].pts.filter(p=>p.main||p.follow).map(p=>p.label),missing:gs[k].missing,correct:gs[k].score>=50}))};
    window.eviaData.put("tests",result);
    try{window.dispatchEvent(new CustomEvent("evia:test-saved",{detail:{type:"discussion",pct,score:result.score,total:result.total,full:gs.length>1,missed:[]}}))}catch(_){}
  }
  window.eviaDiscussion={open,grade,capture,supported:()=>!!SR};
})();
