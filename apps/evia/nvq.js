/* NVQ courses: City & Guilds Level 3 NVQ Diploma in Trowel Occupations (data in nvq-data.js).
   The 335 assessment criteria stay in the background. Learners see:
   - evidence packs for real site jobs (each ticks off the "doing" criteria of its unit),
   - question sets for the "describe / explain" criteria (a question shared by several units is answered once),
   - witness testimony and documents in Supporting evidence, linked to a unit.
   Part of the trowel3 course pack (packs.js): for a trowel3 learner it loads before app.js so the course exists on first
   render; for anyone switching to it later it loads then, and adds the course itself. Everything else runs when called. */
(function(){
  "use strict";
  const N=window.EVIA_NVQ;if(!N)return;
  const ID=N.id,UNITS=N.units,BY={};UNITS.forEach(u=>BY[u.n]=u);
  const BEHAVIOUR=["102","300","303","502"];          // evidenced by witness testimony, documents and questions
  const DEFAULT_OPTIONAL=["690"];
  const MIN_WORDS=12;
  const escH=s=>String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
  const words=t=>String(t||"").trim().split(/\s+/).filter(Boolean).length;
  const subLetter=i=>i<26?String.fromCharCode(97+i):String.fromCharCode(71+i).repeat(2);

  /* Every criterion by code, e.g. "313.7.3". Sub-points of "at least N of" criteria get a letter: "313.7.3a". */
  const CRIT={};
  UNITS.forEach(u=>u.o.forEach(o=>o.c.forEach(c=>{CRIT[u.n+"."+c.n]={u,o,c}})));
  const subOf=code=>{const m=/^(\d+\.\d+\.\d+)([a-z]+)$/.exec(code);if(!m||!CRIT[m[1]])return null;const c=CRIT[m[1]].c,i=[...Array((c.s||[]).length).keys()].find(j=>subLetter(j)===m[2]);return i==null?null:{parent:m[1],text:c.s[i]}};
  const critText=code=>{if(CRIT[code])return CRIT[code].c.t;const m=/^(\d+\.\d+\.\d+)x$/.exec(code);if(m&&CRIT[m[1]]&&CRIT[m[1]].c.needText)return CRIT[m[1]].c.needText;return (subOf(code)||{}).text||""};
  const label=code=>{const p=code.split(".");return "Unit "+p[0]+" · "+p.slice(1).join(".")};

  /* ---------- Evidence packs: one per real site job ---------- */
  const COMMON="drawings and specification · risk assessment and method statement · PPE and access equipment · materials you chose and checked · protecting the work · waste · time allowed · tools you used and looked after";
  const PACKS=[
    {unit:"313",sub:"a",title:"Arches",capture:"setting out the arch · turning piece or centre · springing points · voussoirs · key brick · joint finish · finished arch · you wearing your PPE",mention:"arch type (rough ringed, axed or gauged) · how you set out the centre and springing line · "+COMMON},
    {unit:"313",sub:"b",title:"Chimney stack",capture:"setting out · flue liners · bond around the flue · DPC and flashings · oversailing courses · capping or cowl · access equipment · finished stack",mention:"flue liners · DPC and tray positions · working at height · "+COMMON},
    {unit:"313",sub:"c",title:"Fireplace",capture:"setting out the hearth · fireplace opening · lintel or arch over the opening · fire bricks and throat · decorative finish · finished fireplace",mention:"hearth and opening sizes · the throat and gather · "+COMMON},
    {unit:"313",sub:"d",title:"Decorative features",capture:"setting out · flush or projecting features (corbels, plinths, string courses, dentil courses, panels) · special bricks · joint finish · finished feature",mention:"the feature you built and why · special bricks · keeping the bond and gauge · "+COMMON},
    {unit:"313",sub:"e",title:"Curved wall (on plan)",capture:"setting out the radius · trammel or template · bond on the curve · checking with the template · finished curve",mention:"the radius and how you set it out · how you kept the curve true · cutting · "+COMMON},
    {unit:"313",sub:"f",title:"Curved wall (in elevation)",capture:"setting out the curve · template or rod · curved cuts · coping or capping · finished wall",mention:"how you set out and checked the curve · cutting · coping · "+COMMON},
    {unit:"313",sub:"g",title:"Splayed wall",capture:"setting out the angle · squint bricks or cuts at the splay · bond at the angle · finished wall",mention:"the angle and how you set it out · squint bricks or cuts · keeping the bond · "+COMMON},
    // Setting out (701: at least four kinds of line)
    {unit:"701",sub:"ab",title:"Setting out a building",capture:"datum and levels · profiles and lines · checking square (3-4-5 or diagonals) · straight runs · corner pegs · finished setting out",mention:"the drawings you worked from · datum point · how you checked it was square · measuring and transferring positions · "+COMMON},
    {unit:"701",sub:"cd",title:"Setting out angles and batters",capture:"obtuse or acute angle · batter or splay · angle checks · lines and pegs · finished setting out",mention:"the angles and how you set them out · checking them · "+COMMON},
    {unit:"701",sub:"ef",title:"Setting out curves",capture:"centre point and radius · trammel or template · curve on plan or in elevation · checking the curve · finished setting out",mention:"the radius · how you set out and checked the curve · "+COMMON},
    {unit:"701",sub:"g",title:"Setting out openings",capture:"opening positions · reveal lines · gauge rod · checking sizes · finished setting out",mention:"opening sizes from the drawings · how you transferred and checked them · "+COMMON},
    // Walls and structures (235: all six; 238: at least three; 234: at least one)
    {unit:"235",sub:"ae",title:"Cavity wall",capture:"setting out · both leaves · wall ties · insulation · cavity trays and DPC · joint finish · finished wall",mention:"bond and gauge · wall ties and insulation · keeping the cavity clean · joint finish · "+COMMON},
    {unit:"235",sub:"be",title:"Blockwork",capture:"setting out · block bond · cuts · reinforcement or ties · joint finish · finished blockwork",mention:"block type and bond · cutting · joint finish · "+COMMON},
    {unit:"235",sub:"ce",title:"Solid wall",capture:"setting out · bond (English, Flemish or other) · returns or piers · joint finish · finished wall",mention:"the bond and why · keeping gauge and plumb · joint finish · "+COMMON},
    {unit:"235",sub:"d",title:"Openings",capture:"reveals · closers · cavity trays · lintel · DPCs · finished opening",mention:"opening size and position · lintel and bearing · closing the cavity · "+COMMON},
    {unit:"235",sub:"f",title:"Cills, cappings and copings",capture:"setting out · cill, capping or coping bricks · DPC under the coping · joint finish · finished detail",mention:"the detail and what it does · DPC position · "+COMMON},
    {unit:"238",sub:"ad",title:"Thin joint cavity wall",capture:"levelling the base course · mixing jointing compound · thin joint blocks · ties · finished wall",mention:"the thin joint system · mixing the compound · levelling · "+COMMON},
    {unit:"238",sub:"bd",title:"Thin joint solid wall",capture:"levelling the base course · mixing jointing compound · cutting blocks · finished wall",mention:"the thin joint system · cutting · keeping it level and plumb · "+COMMON},
    {unit:"238",sub:"c",title:"Thin joint openings",capture:"opening position · cut blocks · lintel · finished opening",mention:"opening size · lintel and bearing · "+COMMON},
    {unit:"234",sub:"a",title:"Cladding a timber frame",capture:"frame and breather membrane · wall ties fixed to studs · cavity barriers · cavity trays · openings · finished cladding",mention:"tie spacings · movement between frame and masonry · fire barriers · "+COMMON},
    {unit:"234",sub:"b",title:"Cladding a concrete frame",capture:"support angles · ties or channels · cavity barriers · openings · finished cladding",mention:"support angles and movement joints · ties · fire barriers · "+COMMON},
    {unit:"234",sub:"c",title:"Cladding a steel frame",capture:"support angles · wind posts or restraints · ties · cavity barriers · finished cladding",mention:"support angles and restraints · ties · fire barriers · "+COMMON},
    {unit:"234",sub:"d",title:"Cladding existing masonry",capture:"the existing wall · ties or fixings · cavity trays · openings · finished cladding",mention:"fixing to the existing structure · ties · weathering details · "+COMMON},
    // Specialist elements (828: fire barriers and support angles, plus at least two others)
    {unit:"828",sub:"x",title:"Fire barriers and support angles",capture:"support angle fixings · fire barriers or breaks in the cavity · movement joints · finished detail",mention:"why fire barriers go where they do · fixing and levelling support angles · "+COMMON},
    {unit:"828",sub:"a",title:"Brick soffit system",capture:"soffit system components · positioning and levelling · bricks or slips fitted · finished soffit",mention:"the system you used · fixing and adjusting · "+COMMON},
    {unit:"828",sub:"b",title:"Channel systems",capture:"channel positions · fixings · ties into the channel · finished work",mention:"the channel system · fixing it plumb and level · "+COMMON},
    {unit:"828",sub:"c",title:"Wind posts",capture:"wind post positions · fixings top and bottom · ties into the masonry · finished work",mention:"why wind posts are needed · fixing them · "+COMMON},
    {unit:"828",sub:"d",title:"Vapour and moisture barriers",capture:"barrier position · laps and taping · seals at openings · finished work",mention:"which side the barrier goes and why · laps and seals · "+COMMON},
    {unit:"828",sub:"e",title:"Wall starter kits",capture:"starter positions · fixings to the existing wall · ties into the new wall · finished work",mention:"fixing to the existing structure · spacing · "+COMMON},
    // Repairs (690: at least three)
    {unit:"690",sub:"ac",title:"Replacing damaged brickwork",capture:"the damage · cutting out safely · matching bricks and mortar · new work in · finished repair",mention:"what caused the damage · matching materials, colour and joint · "+COMMON},
    {unit:"690",sub:"bf",title:"Extending or tying into existing walls",capture:"the existing wall · toothing or tying in · continuing the bond · angles · finished work",mention:"how you matched and continued the bond · internal and external angles · "+COMMON},
    {unit:"690",sub:"de",title:"New opening in an existing wall",capture:"propping (needles and props) · cutting out · lintel in · making good · finished opening",mention:"the propping and who approved it · lintel and bearing · "+COMMON},
    // Drainage (837: at least two)
    {unit:"837",sub:"a",title:"Drainage pipework",capture:"trench and bedding · pipe laying and fall · joints · testing · backfill",mention:"pipe type · fall and levels · how you tested it · trench safety · "+COMMON},
    {unit:"837",sub:"b",title:"Inspection chamber",capture:"base and benching · chamber walls or units · connections · cover and frame · testing",mention:"chamber type · benching and connections · "+COMMON},
    {unit:"837",sub:"c",title:"Surface water system",capture:"gullies, channels or soakaway · pipework · connections · testing · finished system",mention:"where the water goes · falls · "+COMMON},
    {unit:"837",sub:"d",title:"Foul water system",capture:"tank or treatment plant · inlet and outlet pipework · connections · testing · finished system",mention:"the system type · falls · testing · "+COMMON}
  ];
  /* Special rules: 235 needs every option, 828 needs fire barriers and support angles plus at least two others. */
  (function(){const c235=(BY["235"].o.find(o=>o.n===7)||{c:[]}).c.find(c=>c.n==="7.3");if(c235&&c235.s){c235.min=c235.s.length;c235.all=true}
    const c828=(BY["828"].o.find(o=>o.n===7)||{c:[]}).c.find(c=>c.n==="7.3");if(c828){c828.need="x";c828.needText="Fire barriers and/or breaks and support angles"}})();
  const GROUPS=[["setting","Setting out",["701"]],["walls","Walls and structures",["235","238","234"]],["features","Features and specialist work",["313","828"]],["repairs","Repairs and maintenance",["690"]],["drainage","Drainage",["837"]]];
  const doCodes=u=>u.o.flatMap(o=>o.c.filter(c=>!c.q&&!c.min).map(c=>u.n+"."+c.n));
  const minCrit=u=>{for(const o of u.o)for(const c of o.c)if(c.min)return c;return null};
  function packCodes(p){
    const u=BY[p.unit],m=minCrit(u),codes=doCodes(u);
    if(m&&p.sub)p.sub.split("").forEach(l=>codes.push(u.n+"."+m.n+l));
    codes.push("102.1.2"); // every site job shows health and safety control equipment in use
    return codes;
  }
  window.EVIA_EXTRA_COURSES=Object.assign(window.EVIA_EXTRA_COURSES||{},{[ID]:{
    name:"Trowel Occupations L3",std:"C&G "+N.qual+" · NVQ Level 3",nvq:true,
    u:PACKS.map(p=>[p.title,packCodes(p).map(c=>c+"|"+critText(c)),{unit:p.unit,sub:p.sub}])
  }});
  window.EVIA_EXTRA_PROMPTS=Object.assign(window.EVIA_EXTRA_PROMPTS||{},{[ID]:Object.fromEntries(PACKS.map(p=>[p.title,{photos:p.capture,writeup:p.mention}]))});
  if(typeof C!=="undefined"&&!C[ID])C[ID]=window.EVIA_EXTRA_COURSES[ID];
  if(window.eviaLearnerPrompts)window.eviaLearnerPrompts[ID]=window.EVIA_EXTRA_PROMPTS[ID];

  /* ---------- Which units, which criteria, what's evidenced ---------- */
  const on=()=>typeof course!=="undefined"&&course===ID;
  const profile=()=>window.eviaData.learner();
  function optionalChosen(){const o=profile().nvqOptional;const list=(Array.isArray(o)?o:[]).filter(n=>BY[n]&&BY[n].opt);return list.length?list:DEFAULT_OPTIONAL.slice()}
  function setOptional(list){const p=profile();p.nvqOptional=list.filter(n=>BY[n]&&BY[n].opt);if(!p.nvqOptional.length)p.nvqOptional=DEFAULT_OPTIONAL.slice();window.eviaData.put("learner",{nvqOptional:p.nvqOptional})}
  const selected=()=>{const o=optionalChosen();return UNITS.filter(u=>!u.opt||o.includes(u.n))};
  const unitCodes=u=>u.o.flatMap(o=>o.c.map(c=>u.n+"."+c.n));
  function allK(){return selected().flatMap(u=>u.o.flatMap(o=>o.c.map(c=>[u.n+"."+c.n,c.t])))}
  const answers=()=>Object.fromEntries(window.eviaData.list("nvqAnswers").map(a=>[a.questionId,{t:a.text}]));
  const answered=(q,a)=>{const x=(a||answers())[q];return !!x&&words(x.t)>=MIN_WORDS};
  function supportingFor(){try{return supportingMeta().filter(x=>x.course===ID&&Array.isArray(x.ksbs))}catch(_){return[]}}
  /* A criterion made of "at least n of these" counts once enough of its parts are in. */
  const withWhole=s=>{Object.keys(CRIT).forEach(code=>{const c=CRIT[code].c;if(c.min&&(c.s||[]).filter((_,i)=>s.has(code+subLetter(i))).length>=c.min&&(!c.need||s.has(code+c.need)))s.add(code)});return s};
  /* What the learner has evidence for, mapped by them. */
  function claimed(){
    const s=new Set(),a=answers();
    (typeof evidence!=="undefined"?evidence:[]).filter(e=>e.c===ID).forEach(e=>(e.k||[]).forEach(k=>s.add(k)));
    Object.keys(CRIT).forEach(code=>{const q=CRIT[code].c.q;if(q&&answered(q,a))s.add(code)});
    supportingFor().forEach(x=>x.ksbs.forEach(k=>s.add(k)));
    return withWhole(s);
  }
  /* What counts: signed off by the assessor when connected to a college (app.js ksbSignoff), else what's mapped. */
  function evidenced(){const so=window.eviaKsbSignoff?window.eviaKsbSignoff():{on:false};return so.on?withWhole(new Set(so.signed)):claimed()}
  function possible(){const ev=evidenced();return new Set([...claimed()].filter(k=>!ev.has(k)))}
  const unitsAsking=q=>selected().filter(u=>u.o.some(o=>o.c.some(c=>c.q===q)));

  /* ---------- Shared bits ---------- */
  function sheet(kicker,title,body,cls){
    const root=document.getElementById("modal-root");
    root.innerHTML='<div class="overlay"><section class="sheet pr-sheet nvq-sheet '+(cls||"")+'" role="dialog" aria-modal="true" aria-labelledby="pr-title"><div class="sheet-head"><div><div class="chat-kicker">'+kicker+'</div><h2 id="pr-title">'+title+'</h2></div><button class="close" id="pr-close" type="button" aria-label="Close">×</button></div><div class="pr-body">'+body+'</div></section></div>';
    const close=()=>{root.innerHTML="";if(sheetClosed)sheetClosed()};
    document.getElementById("pr-close").onclick=close;
    root.querySelector(".overlay").addEventListener("click",e=>{if(e.target.classList.contains("overlay"))close()});
    const h=document.getElementById("pr-title");if(h){h.setAttribute("tabindex","-1");h.focus({preventScroll:true})}
    return root.querySelector(".pr-sheet");
  }
  let sheetClosed=null; // redraw whatever screen opened the sheet, so ticks show straight away
  const miniRing=(pct,size)=>{size=size||34;const r=(size-4)/2,c=2*Math.PI*r,d=Math.max(0,Math.min(1,pct/100))*c;return '<svg class="nvq-ring" width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'" aria-hidden="true"><circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" class="ui-ring-track" stroke-width="4"/>'+(d>0?'<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" class="ui-ring-fill" stroke-width="4" stroke-dasharray="'+d.toFixed(1)+' '+c.toFixed(1)+'" transform="rotate(-90 '+size/2+' '+size/2+')" stroke-linecap="round"/>':"")+'</svg>'};
  const unitStats=(u,ev)=>{const codes=unitCodes(u),done=codes.filter(c=>ev.has(c)).length;return {done,total:codes.length,pct:codes.length?Math.round(done/codes.length*100):0}};

  /* ---------- Knowledge: one pack, grouped by topic rather than by unit ---------- */
  const TOPICS=[["info","Drawings and information"],["hs","Health and safety"],["res","Materials and resources"],["protect","Protecting the work and waste"],["time","Time and programmes"],["craft","How the work is done"],["plan","Planning work"],["method","Methods of work"],["team","Working with others"]];
  const TOPIC_NAME=Object.fromEntries(TOPICS);
  const Q_TOPIC={},Q_ORDER=[];
  UNITS.forEach(u=>u.o.forEach(o=>o.c.forEach(c=>{
    if(!c.q||Q_TOPIC[c.q])return;
    Q_TOPIC[c.q]=u.n==="102"?"hs":u.n==="300"?"plan":u.n==="303"?"method":u.n==="502"?"team":({1:"info",2:"hs",3:"hs",4:"res",5:"protect",6:"time"}[o.n]||"craft");
    Q_ORDER.push(c.q);
  })));
  const myQuestions=()=>{const sel=selected();return Q_ORDER.filter(q=>sel.some(u=>u.o.some(o=>o.c.some(c=>c.q===q))))};
  const topicQuestions=t=>{const qs=myQuestions().filter(q=>Q_TOPIC[q]===t);return TOPICS.findIndex(x=>x[0]===t)===5?qs.sort((a,b)=>+unitsAsking(a)[0].n-+unitsAsking(b)[0].n):qs};
  const topicOf=q=>Q_TOPIC[q];

  /* What each unit needs from its site jobs, e.g. "Do at least 3 · 1 done". */
  function ruleText(u,ev){
    const m=minCrit(u);if(!m)return"";
    const code=u.n+"."+m.n,total=(m.s||[]).length,got=(m.s||[]).filter((_,i)=>ev.has(code+subLetter(i))).length;
    if(ev.has(code))return '<span class="nvq-ok">✓ Complete</span>';
    const ask=m.all?"Needs all "+total:(m.need?"Needs fire barriers and support angles"+(ev.has(code+m.need)?" ✓":"")+", plus at least ":"Needs at least ")+m.min+" of "+total;
    return ask+" · "+got+" covered";
  }

  function readOpen(){try{return JSON.parse(localStorage.getItem("evia7-nvq-open")||"[]")}catch(_){return[]}}
  function saveOpen(list){try{localStorage.setItem("evia7-nvq-open",JSON.stringify(list))}catch(_){}}

  /* ---------- Course screen: site jobs by type of work, one knowledge pack, workplace evidence ---------- */
  function courseScreen(){
    document.getElementById("page-title").textContent="Course";
    const ev=evidenced(),a=answers(),packs=data().u.map((u,i)=>({u,i,meta:u[2]||{}}));
    const qs=myQuestions(),qDone=qs.filter(q=>answered(q,a)).length,qPct=qs.length?Math.round(qDone/qs.length*100):0;
    const sel=selected().map(u=>u.n);
    /* Each type of work is a dropdown, so the page opens as a short list. Which ones are open is remembered. */
    const openSet=new Set(readOpen());
    const jobs=GROUPS.map(([gid,gname,nums])=>{
      const units=nums.filter(n=>sel.includes(n)).map(n=>BY[n]).filter(u=>packs.some(p=>p.meta.unit===u.n));if(!units.length)return"";
      const count=packs.filter(p=>units.some(u=>u.n===p.meta.unit)).length,done=units.filter(u=>{const m=minCrit(u);return m&&ev.has(u.n+"."+m.n)}).length;
      const status=done===units.length?'<span class="nvq-ok">✓ Complete</span>':units.length>1?done+" of "+units.length+" units complete":ruleText(units[0],ev);
      return '<details class="nvq-group" data-group="'+gid+'"'+(openSet.has(gid)?" open":"")+'><summary><span class="nvq-group-copy"><strong>'+escH(gname)+'</strong><small>'+count+' job'+(count===1?"":"s")+' · '+status+'</small></span><span class="nvq-group-chev" aria-hidden="true">›</span></summary><div class="nvq-group-body">'+units.map(u=>{
        const mine=packs.filter(p=>p.meta.unit===u.n);
        return '<p class="nvq-min">'+(units.length>1?'<strong>'+escH(u.short)+'</strong> · ':"")+ruleText(u,ev)+'</p>'+
          mine.map(p=>'<div class="card unit-card" data-u="'+p.i+'"><div class="unit-title">'+escH(p.u[0])+(typeof draftChip==="function"?draftChip(p.u[0]):"")+'<small class="nvq-job-unit">Unit '+u.n+'</small></div>'+(typeof strengthBars==="function"?strengthBars(unitStrengthForCourse(p.u[0])):"")+'</div>').join("");
      }).join("")+'</div></details>';
    }).join("");
    document.getElementById("screen").innerHTML=
      '<div class="card"><div class="section-title">'+escH(data().std)+'</div><h2>'+escH(data().name)+'</h2><p>Capture your site jobs, answer the knowledge questions and add witness testimony. Evia maps everything to your units for you.</p></div>'+
      '<div class="section-title nvq-section">Site jobs</div>'+jobs+
      '<div class="section-title nvq-section">Knowledge</div>'+
      '<button type="button" class="card unit-card nvq-link-card nvq-knowledge" data-nvq-knowledge>'+miniRing(qPct,40)+'<span class="nvq-knowledge-copy"><span class="unit-title">Knowledge questions</span><small>'+qDone+' of '+qs.length+' answered · counts across all your units</small></span><span class="supporting-course-arrow">›</span></button>'+
      '<div class="section-title nvq-section">Workplace evidence</div>'+
      '<button type="button" class="card unit-card nvq-link-card" data-supporting-evidence><span><span class="unit-title">Witness testimony and documents</span><small>Photos, video, audio and files. Link each one to the unit it shows.</small></span><span class="supporting-course-arrow">›</span></button>';
    document.querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>openUnit(+b.dataset.u));
    document.querySelectorAll("details.nvq-group").forEach(d=>d.addEventListener("toggle",()=>saveOpen([...document.querySelectorAll("details.nvq-group[open]")].map(x=>x.dataset.group))));
    document.querySelectorAll("[data-supporting-evidence]").forEach(b=>b.onclick=()=>openSupportingEvidence());
    const k=document.querySelector("[data-nvq-knowledge]");if(k)k.onclick=()=>{sheetClosed=courseScreen;openKnowledge()};
  }

  /* ---------- Knowledge questions ---------- */
  function openKnowledge(){
    const a=answers(),qs=myQuestions(),done=qs.filter(q=>answered(q,a)).length;
    const rows=TOPICS.map(([t,name])=>{
      const list=topicQuestions(t);if(!list.length)return"";
      const d=list.filter(q=>answered(q,a)).length;
      return '<button type="button" class="pr-row nvq-topic'+(d===list.length?" done":"")+'" data-topic="'+t+'">'+miniRing(Math.round(d/list.length*100),36)+'<span class="pr-copy"><strong>'+escH(name)+'</strong><small>'+d+' of '+list.length+' answered</small></span><span class="nvq-chev" aria-hidden="true">›</span></button>';
    }).join("");
    sheet("KNOWLEDGE","Knowledge questions",
      '<p class="pr-intro">Answer each one in your own words, as you would to your assessor. You can type or use your keyboard’s microphone. Each answer counts for every unit that asks it. <strong>'+done+' of '+qs.length+'</strong> answered.</p>'+
      '<div class="pr-list">'+rows+'</div>'+
      (Object.keys(a).length?'<button type="button" class="secondary nvq-pdf-btn" id="nvq-pdf">Download all my answers (PDF) for my assessor</button>':""));
    document.querySelectorAll("[data-topic]").forEach(b=>b.onclick=()=>openTopic(b.dataset.topic));
    const pdf=document.getElementById("nvq-pdf");if(pdf)pdf.onclick=()=>answersPdf(pdf);
  }
  function openTopic(t){
    const a=answers(),list=topicQuestions(t),done=list.filter(q=>answered(q,a)).length;
    sheet("KNOWLEDGE · "+done+" OF "+list.length+" ANSWERED",escH(TOPIC_NAME[t]),
      '<div class="pr-list">'+list.map(q=>{
        const ok=answered(q,a),asking=unitsAsking(q),units=asking.map(x=>x.n);
        return '<button type="button" class="pr-row nvq-q-row'+(ok?" done":"")+'" data-q="'+q+'"><span class="nvq-q-tick" aria-hidden="true">'+(ok?"✓":"")+'</span><span class="pr-copy">'+(asking.length===1&&t==="craft"?'<em class="nvq-q-unit">'+escH(asking[0].short)+'</em>':"")+'<strong>'+escH(N.q[q].t)+'</strong><small>'+(ok?"Answered":"Not answered yet")+' · Unit'+(units.length>1?"s ":" ")+units.join(", ")+'</small></span></button>';
      }).join("")+'</div>'+
      '<button type="button" class="secondary nvq-pdf-btn" id="nvq-topics">‹ All topics</button>');
    document.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>openQuestion(b.dataset.q));
    document.getElementById("nvq-topics").onclick=openKnowledge;
  }
  function openQuestion(qid){
    const q=N.q[qid];if(!q)return;
    const t=topicOf(qid),order=topicQuestions(t),pos=order.indexOf(qid);
    const a=answers(),cur=a[qid]||{},also=unitsAsking(qid);
    sheet(escH(TOPIC_NAME[t]).toUpperCase()+" · "+(pos+1)+" OF "+order.length,"In your own words",
      (also.length===1&&t==="craft"?'<p class="nvq-q-for">For your '+escH(also[0].short.toLowerCase())+' work</p>':"")+
      '<p class="nvq-question">'+escH(q.t)+'</p>'+
      (q.s?'<div class="nvq-think"><span>Cover each of these:</span><ul>'+q.s.map(s=>'<li>'+escH(s)+'</li>').join("")+'</ul></div>':"")+
      '<textarea id="nvq-answer" data-nvq-answer rows="7" placeholder="Type your answer, or tap the microphone on your keyboard to speak it…">'+escH(cur.t||"")+'</textarea>'+
      '<p class="nvq-count" id="nvq-count"></p>'+
      (also.length?'<div class="nvq-counts-for"><span>Counts for</span>'+also.map(x=>'<span class="pr-chip">'+x.n+' '+escH(x.short)+'</span>').join("")+'</div>':"")+
      '<div class="pr-save"><button type="button" class="secondary" id="nvq-back">Topic list</button><button type="button" class="primary" id="nvq-save">Save answer</button></div>');
    const ta=document.getElementById("nvq-answer"),count=document.getElementById("nvq-count"),save=document.getElementById("nvq-save");
    const upd=()=>{const n=words(ta.value);count.textContent=n<MIN_WORDS?"Aim for at least "+MIN_WORDS+" words · "+n+" so far":n+" words";count.classList.toggle("ok",n>=MIN_WORDS);save.disabled=!ta.value.trim()};
    ta.addEventListener("input",upd);upd();
    document.getElementById("nvq-back").onclick=()=>openTopic(t);
    save.onclick=()=>{
      const txt=ta.value.trim();
      window.eviaData.put("nvqAnswers",{questionId:qid,text:txt});
      const all=answers();
      if(typeof showEvidenceToast==="function")showEvidenceToast(words(txt)>=MIN_WORDS?"Answer saved":"Saved. Add a bit more detail so it counts");
      if(window.eviaCheckTargets)window.eviaCheckTargets();
      const next=order.slice(pos+1).concat(order.slice(0,pos)).find(x=>!answered(x,all));
      if(next)openQuestion(next);else openTopic(t);
    };
  }

  /* All answered questions in one PDF, grouped by topic, each listing every criterion it covers. */
  function loadJsPdf(){
    if(window.jspdf)return Promise.resolve(window.jspdf);
    return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="vendor/jspdf.umd.min.js";s.onload=()=>window.jspdf?resolve(window.jspdf):reject(new Error("PDF library unavailable"));s.onerror=()=>reject(new Error("PDF library unavailable"));document.head.appendChild(s)});
  }
  async function answersPdf(btn){
    const label0=btn.textContent;btn.disabled=true;btn.textContent="Making your PDF…";
    try{
      const {jsPDF}=await loadJsPdf(),doc=new jsPDF({unit:"mm",format:"a4",compress:true});
      const a=answers(),p=profile(),W=210,M=16,TW=W-2*M;let y=M;
      const room=h=>{if(y+h>280){doc.addPage();y=M}};
      const para=(txt,size,style,color,gap)=>{doc.setFont("helvetica",style||"normal");doc.setFontSize(size);doc.setTextColor(...(color||[23,32,51]));const lines=doc.splitTextToSize(String(txt),TW),lh=size*.42;lines.forEach(l=>{room(lh);doc.text(l,M,y+lh*.8);y+=lh});y+=gap||0};
      para("Knowledge answers",20,"bold",null,2);
      para((p.name||"Learner")+" · "+N.title+" ("+N.qual+")",10,"normal",[102,112,133],1);
      para("Downloaded "+new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})+". Answers are in the learner’s own words.",9,"normal",[102,112,133],6);
      TOPICS.forEach(([t,name])=>{
        const qs=topicQuestions(t).filter(q=>answered(q,a));if(!qs.length)return;
        room(14);para(name,13,"bold",null,3);
        qs.forEach(q=>{
          const refs=selected().flatMap(x=>x.o.flatMap(o=>o.c.filter(c=>c.q===q).map(c=>x.n+" "+c.n)));
          para("Criteria "+refs.join(" · "),8.5,"normal",[110,92,0],1);
          para(N.q[q].t+(N.q[q].s?": "+N.q[q].s.join("; "):""),10.5,"bold",null,1.5);
          para(a[q].t,10.5,"normal",[52,64,84],6);
        });
      });
      const pages=doc.getNumberOfPages();
      for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(152,162,179);doc.text("Created using Evia",M,290);doc.text(i+" / "+pages,W-M,290,{align:"right"})}
      const name=(String(p.name||"learner").trim().replace(/[^a-z0-9]+/gi,"-")||"learner")+"-knowledge-answers.pdf";
      const file=new File([doc.output("blob")],name,{type:"application/pdf"});
      let shared=false;
      try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file]});shared=true}}catch(err){if(err&&err.name==="AbortError")shared=true}
      if(!shared){const l=document.createElement("a");l.href=URL.createObjectURL(file);l.download=name;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(l.href),60000)}
    }catch(err){console.error("Evia answers PDF failed",err);if(typeof showEvidenceToast==="function")showEvidenceToast("Couldn't make the PDF. Please try again",true)}
    btn.disabled=false;btn.textContent=label0;
  }

  /* ---------- Progress: unit rings → outcomes → criteria ---------- */
  const open={};
  function progressHtml(a){
    const ev=a&&a.evidenced||evidenced(),so=window.eviaKsbSignoff?window.eviaKsbSignoff():{on:false},pos=so.on?possible():new Set(),demo=document.body.classList.contains("evia-onboarding");
    const sel=selected();
    return '<section class="ui-card nvq-units"><div class="nvq-units-head"><strong>Your units</strong><small>'+sel.filter(u=>!u.opt).length+' mandatory · '+sel.filter(u=>u.opt).length+' optional</small></div>'+
      sel.map((u,i)=>{
        const st=unitStats(u,ev),isOpen=!!open[u.n]||(demo&&u.n==="102");
        return (i?'<div class="ui-divider"></div>':"")+
          '<button type="button" class="ui-group-head nvq-unit-row" data-nvq-unit="'+u.n+'" aria-expanded="'+isOpen+'">'+miniRing(st.pct,44)+
          '<span class="ui-group-copy"><strong>'+u.n+' '+escH(u.short)+'</strong><small>'+st.done+' of '+st.total+' criteria'+(u.opt?' · optional':'')+'</small></span><span class="ui-group-pct">'+st.pct+'%</span><span class="ui-chev'+(isOpen?" open":"")+'"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button>'+
          (isOpen?'<div class="nvq-outcomes">'+u.o.map(o=>{
            const d=o.c.filter(c=>ev.has(u.n+"."+c.n)).length;
            return '<div class="nvq-outcome"><div class="nvq-outcome-head"><span>'+o.n+'</span><p>'+escH(o.t)+'</p><small>'+d+'/'+o.c.length+'</small></div><div class="ui-ksb-grid nvq-grid">'+o.c.map(c=>{
              const code=u.n+"."+c.n,met=ev.has(code),maybe=!met&&pos.has(code);
              return '<button type="button" class="ui-ksb'+(met?" met":maybe?" maybe":"")+'" data-ksb-code="'+code+'" aria-label="Criterion '+c.n+(met?(so.on?", signed off":", evidence captured"):maybe?", evidence added, waiting for your assessor":"")+'">'+escH(c.n)+'</button>';
            }).join("")+'</div></div>';
          }).join("")+'</div>':"");
      }).join("")+
      '<p class="ui-help">Tap a unit to see its outcomes, then a criterion to see what it asks for and the evidence behind it.</p></section>';
  }
  function bindProgress(redraw){
    document.querySelectorAll("[data-nvq-unit]").forEach(b=>b.onclick=()=>{const y=window.scrollY;open[b.dataset.nvqUnit]=!open[b.dataset.nvqUnit];redraw();window.scrollTo(0,y)});
    document.querySelectorAll(".nvq-units [data-ksb-code]").forEach(b=>b.onclick=()=>{sheetClosed=redraw;criterion(b.dataset.ksbCode)});
  }
  function criterion(code){
    const x=CRIT[code];if(!x)return;
    const {u,o,c}=x,ev=evidenced(),met=ev.has(code),a=answers();
    const packs=(typeof evidence!=="undefined"?evidence:[]).filter(e=>e.c===ID&&(e.k||[]).some(k=>k===code||k.indexOf(code)===0&&/^[a-z]+$/.test(k.slice(code.length))));
    const support=supportingFor().filter(s=>s.ksbs.includes(code));
    const subs=(c.s||[]).map((s,i)=>{const got=c.min&&ev.has(code+subLetter(i));return '<li class="'+(got?"got":"")+'">'+(c.min?'<span aria-hidden="true">'+(got?"✓":"○")+'</span> ':"")+escH(s)+'</li>'}).join("");
    const evidenceRows=packs.map(e=>'<div class="ksb-evidence-item"><strong>'+escH(e.u)+'</strong><span>'+escH(e.d||(e.savedAt?new Date(e.savedAt).toLocaleDateString("en-GB"):"Evidence pack"))+'</span></div>').join("")+
      support.map(s=>'<div class="ksb-evidence-item"><strong>'+escH(s.title)+'</strong><span>'+escH(s.witness?"Witness testimony · "+s.witness.name:(s.type||"Supporting evidence"))+'</span></div>').join("")+
      (c.q&&answered(c.q,a)?'<div class="ksb-evidence-item"><strong>Your answer</strong><span>'+escH(a[c.q].t.slice(0,140))+(a[c.q].t.length>140?"…":"")+'</span></div>':"");
    const how=c.q?'<button type="button" class="primary" id="nvq-answer-q">'+(a[c.q]?"Edit your answer":"Answer this question")+'</button>'
      :c.min?'<p class="pr-intro">'+(c.all?"Do all of these":"Do at least "+c.min+" of these"+(c.need?", plus fire barriers and support angles,":""))+' as site jobs from the Course page.</p>'
      :BEHAVIOUR.includes(u.n)?'<p class="pr-intro">Ask your supervisor for witness testimony, or add a document that shows this, in Supporting evidence. Link it to Unit '+u.n+'.</p>'
      :'<p class="pr-intro">Any evidence pack for this unit covers this.</p>';
    const so=window.eviaKsbSignoff?window.eviaKsbSignoff():{on:false},waiting=so.on&&!met&&claimed().has(code);
    sheet(escH(label(code)).toUpperCase(),met?(so.on?"Signed off by your assessor":"Evidence captured"):waiting?"Evidence added, waiting for your assessor":"Not yet evidenced",
      '<p class="nvq-question">'+escH(c.t)+'</p>'+(subs?'<ul class="nvq-subs'+(c.min?" min":"")+'">'+subs+'</ul>':"")+
      (c.min?'<p class="nvq-min">'+(c.all?"All <strong>"+c.min+"</strong> needed":"At least <strong>"+c.min+"</strong> needed"+(c.need?" plus "+(ev.has(code+c.need)?"✓ ":"")+escH(c.needText.toLowerCase()):""))+' · '+(c.s||[]).filter((_,i)=>ev.has(code+subLetter(i))).length+' done</p>':"")+
      '<div class="pr-h">Outcome '+o.n+'</div><p class="pr-intro">'+escH(o.t)+'</p>'+
      '<div class="pr-h">Evidence</div>'+(evidenceRows||'<p class="pr-intro">Nothing yet.</p>')+how);
    const b=document.getElementById("nvq-answer-q");if(b)b.onclick=()=>openQuestion(c.q);
  }

  /* ---------- Optional units (first-run demo and Profile) ---------- */
  function optionalHtml(){
    const chosen=optionalChosen();
    return UNITS.filter(u=>u.opt).map(u=>'<label class="nvq-opt"><input type="checkbox" value="'+u.n+'"'+(chosen.includes(u.n)?" checked":"")+'><span><strong>'+u.n+' '+escH(u.short)+'</strong><small>'+escH(u.t)+(u.n==="690"?" · most learners choose this":"")+'</small></span></label>').join("");
  }
  const readOptional=root=>[...root.querySelectorAll(".nvq-opt input:checked")].map(i=>i.value);

  /* While the NVQ course is on, on-screen "KSB" wording (Home, stats, targets, chat) reads "criterion"/"criteria". */
  const SWAPS=[[/\bEPA full mock\b/g,"Full knowledge test"],[/\bEPA quick quiz\b/g,"Quick quiz"],[/\bEPA MCQ\b/g,"Knowledge test"],[/\bEPA mocks?\b/g,"knowledge test"],[/\bKSBS\b/g,"CRITERIA"],[/\bKSBs\b/g,"criteria"],[/\bKSB\b/g,"criterion"],[/\b1 unit not started yet\b/g,"1 site job not started yet"],[/\b(\d+) units not started yet\b/g,"$1 site jobs not started yet"]];
  const swap=node=>{if(!on())return;const walk=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let t;while((t=walk.nextNode())){const v=t.nodeValue;if(!/KSB|EPA|not started/.test(v))continue;let n=v;SWAPS.forEach(([re,to])=>{n=n.replace(re,to)});if(n!==v)t.nodeValue=n}};
  const watch=()=>new MutationObserver(ms=>{if(on())ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)swap(n);else if(n.nodeType===3&&n.parentNode)swap(n.parentNode)}))}).observe(document.body,{childList:true,subtree:true});
  if(document.body)watch();else document.addEventListener("DOMContentLoaded",watch);
  window.eviaTerm=()=>on()?{one:"criterion",many:"criteria",Many:"Criteria"}:{one:"KSB",many:"KSBs",Many:"KSBs"};
  const packShown=i=>{const u=(data().u[i]||[])[2];return !u||selected().some(x=>x.n===u.unit)};
  window.eviaNvq={on,packShown,id:ID,allK,evidenced,claimed,possible,courseScreen,progressHtml,bindProgress,criterion,openKnowledge,openTopic,openQuestion,myQuestions,optionalHtml,readOptional,setOptional,optionalChosen,selected,label,critText,units:UNITS,behaviour:BEHAVIOUR,
    unitCodes:n=>BY[n]?unitCodes(BY[n]):[],doCodesFor:n=>BY[n]?BY[n].o.flatMap(o=>o.c.filter(c=>!c.q).map(c=>[n+"."+c.n,c.t])):[],answers};
})();
