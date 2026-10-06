/* Writing help. Every text box gets the phone's own UK spellcheck (red underlines as you type), and the main
   write-ups get a "Check my writing" button. The check runs on the phone with no signal: it fixes spelling
   (including trade words), capital letters and punctuation, and shows each change for the learner to accept.
   It never rewrites sentences, so the write-up stays in the learner's own words. */
(function(){
  "use strict";

  /* Common misspellings → correct spelling. Keys are lower case. */
  const WORDS={
    // Trade words
    morter:"mortar",mortor:"mortar",morta:"mortar",sement:"cement",cemment:"cement",concreat:"concrete",concreet:"concrete",concrit:"concrete",
    brik:"brick",briks:"bricks",brickwerk:"brickwork",briklaying:"bricklaying",bricklaing:"bricklaying",
    scafold:"scaffold",scaffhold:"scaffold",scafolding:"scaffolding",scaffoulding:"scaffolding",scaffholding:"scaffolding",
    trowl:"trowel",trowell:"trowel",troul:"trowel",leval:"level",levle:"level",levell:"level",guage:"gauge",gage:"gauge",
    plum:"plumb",plumm:"plumb",lintle:"lintel",lintal:"lintel",lentil:"lintel",lintell:"lintel",
    strecher:"stretcher",streatcher:"stretcher",headder:"header",cavaty:"cavity",cavitty:"cavity",
    insolation:"insulation",insulaton:"insulation",foundaton:"foundation",foundaiton:"foundation",footins:"footings",
    joinary:"joinery",joinry:"joinery",carpentary:"carpentry",carpantry:"carpentry",carpentery:"carpentry",
    chissel:"chisel",chisle:"chisel",tennon:"tenon",archetrave:"architrave",architrav:"architrave",
    sofit:"soffit",soffet:"soffit",facia:"fascia",plasterbord:"plasterboard",plasterbaord:"plasterboard",
    hindge:"hinge",hindges:"hinges",joyst:"joist",joysts:"joists",rafeter:"rafter",nogin:"noggin",noggen:"noggin",
    baton:"batten",batons:"battens",batton:"batten",battons:"battens",miter:"mitre",miters:"mitres",sqaure:"square",squre:"square",
    timbre:"timber",timbar:"timber",wheelbarow:"wheelbarrow",weelbarrow:"wheelbarrow",goggels:"goggles",gogles:"goggles",
    rubbel:"rubble",harzard:"hazard",hazzard:"hazard",hazerd:"hazard",hazzards:"hazards",harzards:"hazards",
    assesment:"assessment",assesments:"assessments",asessment:"assessment",
    safty:"safety",saftey:"safety",saefty:"safety",equipement:"equipment",equiptment:"equipment",equipmet:"equipment",
    measurment:"measurement",mesurement:"measurement",measurments:"measurements",messure:"measure",mesure:"measure",
    straigt:"straight",stright:"straight",strait:"straight",hight:"height",heigth:"height",hieght:"height",
    lenght:"length",lengh:"length",widht:"width",thicknes:"thickness",acurate:"accurate",accurrate:"accurate",acurately:"accurately",
    tempory:"temporary",temperary:"temporary",maintainance:"maintenance",maintenence:"maintenance",
    instuctions:"instructions",instrucions:"instructions",instructons:"instructions",suppervisor:"supervisor",supervizor:"supervisor",
    aprentice:"apprentice",apprentise:"apprentice",apprentis:"apprentice",aprenticeship:"apprenticeship",apprenticship:"apprenticeship",
    colledge:"college",collage:"college",aluminum:"aluminium",color:"colour",colors:"colours",center:"centre",
    // Everyday words
    definately:"definitely",definatly:"definitely",recieve:"receive",recieved:"received",seperate:"separate",seperately:"separately",
    untill:"until",wich:"which",becuase:"because",becasue:"because",beacuse:"because",becaus:"because",thier:"their",
    alot:"a lot",abit:"a bit",infront:"in front",incase:"in case",aswell:"as well",tommorow:"tomorrow",tomorow:"tomorrow",
    wierd:"weird",begining:"beginning",finaly:"finally",realy:"really",enviroment:"environment",neccessary:"necessary",
    necesary:"necessary",neccesary:"necessary",occured:"occurred",wether:"whether",happend:"happened",finnished:"finished",
    finised:"finished",togther:"together",togeather:"together",explane:"explain",corect:"correct",corectly:"correctly",
    proccess:"process",procces:"process",completly:"completely",compleatly:"completely",experiance:"experience",
    knowlege:"knowledge",knowledgable:"knowledgeable",importent:"important",dificult:"difficult",diffucult:"difficult",
    easyer:"easier",usefull:"useful",carefull:"careful",carefuly:"carefully",successfull:"successful",sucessful:"successful",
    beleive:"believe",acheive:"achieve",acheived:"achieved",arguement:"argument",buisness:"business",calender:"calendar",
    embarased:"embarrassed",goverment:"government",independant:"independent",publically:"publicly",truely:"truly",
    wasnt:"wasn't",didnt:"didn't",dont:"don't",doesnt:"doesn't",isnt:"isn't",couldnt:"couldn't",shouldnt:"shouldn't",
    wouldnt:"wouldn't",havent:"haven't",hasnt:"hasn't",arent:"aren't",werent:"weren't",cant:"can't",wont:"won't",
    im:"I'm",ive:"I've",thats:"that's",theres:"there's",whats:"what's",youre:"you're",
    gonna:"going to",wanna:"want to",cos:"because",coz:"because",cuz:"because"
  };
  const PHRASES=[
    {re:/\b(should|could|would|must|might) of\b/gi,to:m=>m[1]+" have",why:"Should be “have”, not “of”"},
    {re:/\bto (long|short|big|small|high|low|wide|narrow|thick|much|many|late|early|hot|cold|tight|loose|heavy|deep|shallow|far)\b/gi,to:m=>"too "+m[1],why:"“Too” means more than you want"},
    {re:/\bangel grinder/gi,to:()=>"angle grinder",why:"Spelling"},
    {re:/\bdamp proof coarse\b/gi,to:()=>"damp proof course",why:"Spelling"}
  ];
  const WEBBY=/[@/\\_]|www\.|\.(com|co|uk|org|net|gov|ac|io)\b/i;
  const INFORMAL=/^(gonna|wanna|cos|coz|cuz)$/;
  const ACRONYMS={dpc:"DPC",dpm:"DPM",ppe:"PPE",coshh:"COSHH",riddor:"RIDDOR",hse:"HSE",cscs:"CSCS",pasma:"PASMA",ipaf:"IPAF",otj:"OTJ",epa:"EPA",ksb:"KSB",ksbs:"KSBs",mdf:"MDF",osb:"OSB",pva:"PVA",rsj:"RSJ",loler:"LOLER",puwer:"PUWER"};
  const ABBREV=/(?:\be\.g|\bi\.e|\betc|\bapprox|\bvs)\.$/i;

  const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
  const matchCase=(orig,to)=>/[A-Z]/.test(to)?to:orig.length>1&&orig===orig.toUpperCase()?to.toUpperCase():/^[A-Z]/.test(orig)?cap(to):to;

  /* Where each sentence starts, so capital letters can be checked and fixes can keep them. */
  function sentenceStarts(text){
    const starts=new Set();
    const first=/^[\s\-*•]*(?:\d+[.)]\s+)?/.exec(text)[0].length;if(first<text.length)starts.add(first);
    let m;const endRe=/([.!?])["'’”)]*\s+|\n[\s\-*•]*(?:\d+[.)]\s*)?/g;
    while((m=endRe.exec(text))){
      if(m[1]&&ABBREV.test(text.slice(Math.max(0,m.index-7),m.index+1)))continue;
      const at=m.index+m[0].length;if(at<text.length)starts.add(at);
    }
    return starts;
  }

  /* Returns {fixes:[{s,e,from,to,why}], tips:[text]} for a piece of writing. */
  function check(text){
    const found=[],starts=sentenceStarts(text);
    const add=(s,e,to,why)=>{const from=text.slice(s,e);if(from!==to)found.push({s,e,from,to,why})};
    const startCase=(s,to)=>starts.has(s)?cap(to):to;

    // 1. Phrases, then single words.
    PHRASES.forEach(p=>{p.re.lastIndex=0;let m;while((m=p.re.exec(text)))add(m.index,m.index+m[0].length,startCase(m.index,matchCase(m[0],p.to(m))),p.why)});
    let m;const wordRe=/[A-Za-z]+(?:['’][A-Za-z]+)?/g;
    while((m=wordRe.exec(text))){
      const w=m[0],low=w.toLowerCase().replace("’","'"),s=m.index,e=s+w.length;
      const token=text.slice(0,s).split(/\s/).pop()+text.slice(s).split(/\s/)[0];
      if(WEBBY.test(token))continue; // emails, web links, file names
      if(low==="i"||/^i'(m|ve|ll|d)$/.test(low)){if(w[0]==="i")add(s,e,"I"+w.slice(1),"“I” is always a capital");continue}
      if(WORDS[low]){const to=WORDS[low];add(s,e,startCase(s,matchCase(w,to)),/'/.test(to)&&!/'/.test(low)?"Missing apostrophe":INFORMAL.test(low)?"Too informal for a write-up":"Spelling");continue}
      if(ACRONYMS[low]&&w!==ACRONYMS[low]){add(s,e,ACRONYMS[low],"Short for a longer name, so it’s written in capitals");continue}
      if(starts.has(s)&&/^[a-z]/.test(w))add(s,e,cap(w),"Start a sentence with a capital letter");
    }

    // 2. Spacing and punctuation. Each fix includes the word next to it so the change is easy to see.
    const rx=(re,to,why)=>{re.lastIndex=0;let r;while((r=re.exec(text)))add(r.index,r.index+r[0].length,to(r),why)};
    rx(/(\S+)[^\S\n]{2,}(\S+)/g,r=>r[1]+" "+r[2],"Remove the extra space");
    rx(/([A-Za-z]+)[^\S\n]+([,.;:!?])(?![\d.])/g,r=>r[1]+r[2],"No space before punctuation");
    rx(/([A-Za-z]+[,;!?])([A-Za-z]+)/g,r=>r[1]+" "+r[2],"Add a space after the punctuation");
    {const re=/(?:^|[\s(])([A-Za-z]{3,}\.)([A-Za-z]{2,})\b(?![.@/])/g;let r;while((r=re.exec(text))){const at=r.index+r[0].length-r[1].length-r[2].length;if(!WEBBY.test(r[1]+r[2]))add(at,r.index+r[0].length,r[1]+" "+cap(r[2]),"Add a space after the full stop")}}
    rx(/\b([A-Za-z]+)(\s+)\1\b/gi,r=>/^(had|that)$/i.test(r[1])?r[0]:r[1],"The same word twice");
    const end=text.replace(/\s+$/,"");
    const lastLine=end.split("\n").pop();
    if(/[A-Za-z0-9)]$/.test(end)&&lastLine.trim().split(/\s+/).length>=4){
      const w=end.match(/[A-Za-z0-9)']+$/)[0];add(end.length-w.length,end.length,w+".","End with a full stop");
    }

    // 3. Keep one fix per spot: word fixes win, the rest are picked up on the next check.
    const fixes=[];
    found.forEach(f=>{if(!fixes.some(g=>f.s<g.e&&g.s<f.e))fixes.push(f)});
    fixes.sort((a,b)=>a.s-b.s);

    // 4. Tips that need the learner's own words, so Evia doesn't change them.
    const tips=[];
    text.split(/[.!?]+\s+|\n+/).forEach(sen=>{const n=sen.trim().split(/\s+/).filter(Boolean).length;
      if(n>35)tips.push("A sentence starting “"+sen.trim().split(/\s+/).slice(0,5).join(" ")+"…” is "+n+" words long. Try splitting it with a full stop.")});
    const letters=text.replace(/[^A-Za-z]/g,"");
    if(letters.length>=30&&letters===letters.toUpperCase())tips.push("It’s all in capitals. Normal sentences are easier for your assessor to read.");
    return {fixes,tips};
  }

  const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  const ignored=new WeakMap();
  function openPanel(ta,panel){
    const skip=ignored.get(ta)||new Set();ignored.set(ta,skip);
    const text=ta.value;
    if(!text.trim()){panel.innerHTML='<p class="wc-empty">Write something first, then check it.</p>';panel.hidden=false;return}
    const r=check(text),fixes=r.fixes.filter(f=>!skip.has(f.from+"→"+f.to));
    const tips=r.tips.filter(t=>!skip.has(t));
    if(!fixes.length&&!tips.length){
      panel.innerHTML='<p class="wc-good"><span aria-hidden="true">✓</span> No spelling or punctuation problems found.</p>';panel.hidden=false;return;
    }
    panel.innerHTML=
      '<div class="wc-head"><strong>'+(fixes.length?fixes.length+(fixes.length===1?" thing":" things")+" to fix":"Looks good")+'</strong>'+
        (fixes.length>1?'<button type="button" class="wc-all">Accept all</button>':"")+'</div>'+
      '<ul class="wc-list">'+fixes.map((f,i)=>'<li class="wc-row"><div class="wc-change"><span><del>'+esc(f.from)+'</del> <span class="wc-arrow" aria-label="to">→</span> <ins>'+esc(f.to)+'</ins></span><small>'+esc(f.why)+'</small></div>'+
        '<div class="wc-acts"><button type="button" class="wc-ok" data-wc-fix="'+i+'">Accept</button><button type="button" class="wc-no" data-wc-skip="'+i+'" aria-label="Ignore">Ignore</button></div></li>').join("")+
        tips.map((t,i)=>'<li class="wc-row wc-tip"><div class="wc-change"><span>'+esc(t)+'</span><small>Tip: only you can change this</small></div><div class="wc-acts"><button type="button" class="wc-no" data-wc-tip="'+i+'">OK</button></div></li>').join("")+'</ul>'+
      '<p class="wc-note">Evia only fixes spelling and punctuation. The words are still yours.</p>';
    panel.hidden=false;
    const apply=list=>{let v=ta.value;list.slice().sort((a,b)=>b.s-a.s).forEach(f=>{v=v.slice(0,f.s)+f.to+v.slice(f.e)});
      ta.dataset.wcApplying="1";ta.value=v;ta.dispatchEvent(new Event("input",{bubbles:true}));delete ta.dataset.wcApplying};
    panel.querySelectorAll("[data-wc-fix]").forEach(b=>b.onclick=()=>{apply([fixes[+b.dataset.wcFix]]);openPanel(ta,panel)});
    panel.querySelectorAll("[data-wc-skip]").forEach(b=>b.onclick=()=>{const f=fixes[+b.dataset.wcSkip];skip.add(f.from+"→"+f.to);openPanel(ta,panel)});
    panel.querySelectorAll("[data-wc-tip]").forEach(b=>b.onclick=()=>{skip.add(tips[+b.dataset.wcTip]);openPanel(ta,panel)});
    const all=panel.querySelector(".wc-all");
    if(all)all.onclick=()=>{
      apply(fixes);
      // Fixing one thing can reveal the next (a capital after a new full stop), so tidy up a couple more times.
      for(let n=0;n<3;n++){const more=check(ta.value).fixes.filter(f=>!skip.has(f.from+"→"+f.to));if(!more.length)break;apply(more)}
      openPanel(ta,panel);
    };
  }

  const HELPED="#write, #otj-description, textarea[data-reflect], textarea[data-nvq-answer], textarea.eg-text";
  const ICON='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 18 8.5 6h1L14 18M5.6 14h6.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="m14.5 14.5 2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function setUp(ta){
    if(ta.dataset.wc)return;ta.dataset.wc="1";
    // The phone's own spellcheck, in UK English.
    ta.spellcheck=true;ta.setAttribute("lang","en-GB");ta.setAttribute("autocapitalize","sentences");ta.setAttribute("autocorrect","on");
    if(!ta.matches(HELPED))return;
    /* A small A✓ in the box's top-right corner; the suggestions open underneath. */
    const field=document.createElement("div");field.className="wc-field";
    ta.parentNode.insertBefore(field,ta);field.appendChild(ta);
    const btn=document.createElement("button");btn.type="button";btn.className="wc-btn";btn.setAttribute("aria-label","Check my writing");btn.title="Check my writing";btn.innerHTML=ICON;
    field.appendChild(btn);
    const wrap=document.createElement("div");wrap.className="wc";
    wrap.innerHTML='<div class="wc-panel" hidden aria-live="polite"></div>';
    field.insertAdjacentElement("afterend",wrap);
    const panel=wrap.querySelector(".wc-panel");
    btn.onclick=e=>{e.preventDefault();openPanel(ta,panel)};
    ta.addEventListener("input",()=>{if(!ta.dataset.wcApplying)panel.hidden=true});
  }
  const scan=()=>document.querySelectorAll("textarea:not([data-wc])").forEach(setUp);
  new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
  scan();

  window.eviaWriting={check};
})();
