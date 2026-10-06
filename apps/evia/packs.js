/* Evia7 course packs: each trade's content is its own pack, and a learner's phone loads only their own.
   Today a pack is the trade's Teach me lessons and EPA test bank; for the NVQ, its criteria (nvq-data.js) and screens
   (nvq.js) too. The other trades' unit lists stay in app.js; CATALOGUE names every course for the course pickers. When Nisia supplies packs, fetch() here swaps from script files to
   Nisia's download, and the rest of Evia doesn't change: it asks for eviaPacks.ensure(course) and eviaPacks.pack().

   eviaPacks.files(course, part) the files that make up a course's pack; part "early" is the ones that must run before
                                app.js (the NVQ course is built from them), "late" the rest
   eviaPacks.catalogue()        every course, [{id, name, std}], downloaded or not
   eviaPacks.ensure(course)     loads them if they aren't already (a Promise); storage.js loads the saved course's at boot
   eviaPacks.loaded(course)     whether they are in
   eviaPacks.unitId(course, name)  a unit's stable id: fixed below for every unit that exists today, so renaming a unit
                                later keeps its id (add the old id against the new name). New units get one from the name.
   eviaPacks.pack(course)       the course in the pack format Nisia will use: { id, version, name, standard, units:[{id,
                                name, ksbs:[{code,text}], lessons}], lessons } (see the "Evia data model" write-up) */
(function(){
  const FILES={
    bricklayer:["test-bank-bricklayer.js?v=bank-b-v1","teach-bricklayer.js?v=tb-v6"],
    joiner:["test-bank-joinery.js?v=bank-j-v1","teach-joiner.js?v=tj-v3"],
    site:["test-bank-joinery.js?v=bank-j-v1","teach-site.js?v=ts-v3"],
    /* The NVQ's knowledge test uses the bricklaying bank. */
    trowel3:["nvq-data.js?v=nvq-data-v1","nvq.js?v=nvq-v9","test-bank-bricklayer.js?v=bank-b-v1","teach-trowel3.js?v=t3-v2"]
  };
  const EARLY=new Set(["nvq-data.js","nvq.js"]);
  const CATALOGUE={
    bricklayer:{name:"Bricklayer",std:"ST0095 v1.2"},site:{name:"Site Carpenter",std:"ST0264 v1.4"},
    joiner:{name:"Bench Joiner",std:"ST0264 v1.4"},trowel3:{name:"Trowel Occupations L3",std:"C&G 6570-05 · NVQ Level 3"}
  };
  const VERSION="2026.09.1";
  /* Stable unit ids, frozen from the unit names on 27 Sept 2026. Never change an id: rename the key instead. */
  const UNIT_IDS={
    bricklayer:{"Mixing mortar":"bricklayer/mixing-mortar","Jointing Styles":"bricklayer/jointing-styles","Repair brick walling":"bricklayer/repair-brick-walling","Basic Brick wall":"bricklayer/basic-brick-wall","Set out solid walling":"bricklayer/set-out-solid-walling","Build solid walling":"bricklayer/build-solid-walling","Set out Cavity Walling":"bricklayer/set-out-cavity-walling","Construct Cavity Walling":"bricklayer/construct-cavity-walling","Cavity opening":"bricklayer/cavity-opening","Gable end/Raked wall":"bricklayer/gable-end-raked-wall"},
    site:{"Structural carcassing":"site/structural-carcassing","Timber/metal partition walls":"site/timber-metal-partition-walls","Floor joists (and coverings)":"site/floor-joists-and-coverings","Straight flights of stairs":"site/straight-flights-of-stairs","Service encasement":"site/service-encasement","Cladding":"site/cladding","Wall and floor units":"site/wall-and-floor-units","Handrails and spindles":"site/handrails-and-spindles","Internal and external doors":"site/internal-and-external-doors","Skirting boards and architrave":"site/skirting-boards-and-architrave","Window boards":"site/window-boards","Roofs and loft hatch":"site/roofs-and-loft-hatch"},
    joiner:{"Basic woodworking joints":"joiner/basic-woodworking-joints","Timber Window":"joiner/timber-window","Straight staircases":"joiner/straight-staircases","Door frames and linings":"joiner/door-frames-and-linings","Timber doors":"joiner/timber-doors","Wall and floor units":"joiner/wall-and-floor-units","Timber mouldings":"joiner/timber-mouldings","Staircase spindles and balustrades":"joiner/staircase-spindles-and-balustrades","Ironmongery":"joiner/ironmongery","Fixed Machinery":"joiner/fixed-machinery"},
    trowel3:{"Arches":"trowel3/arches","Chimney stack":"trowel3/chimney-stack","Fireplace":"trowel3/fireplace","Decorative features":"trowel3/decorative-features","Curved wall (on plan)":"trowel3/curved-wall-on-plan","Curved wall (in elevation)":"trowel3/curved-wall-in-elevation","Splayed wall":"trowel3/splayed-wall","Setting out a building":"trowel3/setting-out-a-building","Setting out angles and batters":"trowel3/setting-out-angles-and-batters","Setting out curves":"trowel3/setting-out-curves","Setting out openings":"trowel3/setting-out-openings","Cavity wall":"trowel3/cavity-wall","Blockwork":"trowel3/blockwork","Solid wall":"trowel3/solid-wall","Openings":"trowel3/openings","Cills, cappings and copings":"trowel3/cills-cappings-and-copings","Thin joint cavity wall":"trowel3/thin-joint-cavity-wall","Thin joint solid wall":"trowel3/thin-joint-solid-wall","Thin joint openings":"trowel3/thin-joint-openings","Cladding a timber frame":"trowel3/cladding-a-timber-frame","Cladding a concrete frame":"trowel3/cladding-a-concrete-frame","Cladding a steel frame":"trowel3/cladding-a-steel-frame","Cladding existing masonry":"trowel3/cladding-existing-masonry","Fire barriers and support angles":"trowel3/fire-barriers-and-support-angles","Brick soffit system":"trowel3/brick-soffit-system","Channel systems":"trowel3/channel-systems","Wind posts":"trowel3/wind-posts","Vapour and moisture barriers":"trowel3/vapour-and-moisture-barriers","Wall starter kits":"trowel3/wall-starter-kits","Replacing damaged brickwork":"trowel3/replacing-damaged-brickwork","Extending or tying into existing walls":"trowel3/extending-or-tying-into-existing-walls","New opening in an existing wall":"trowel3/new-opening-in-an-existing-wall","Drainage pipework":"trowel3/drainage-pipework","Inspection chamber":"trowel3/inspection-chamber","Surface water system":"trowel3/surface-water-system","Foul water system":"trowel3/foul-water-system"}
  };
  const slug=s=>String(s||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
  /* Topic ids from a college's pack the learner follows (name → id), before Evia's own. */
  const PACK_IDS={};
  const unitId=(course,name)=>!course||!name?null:(PACK_IDS[course]&&PACK_IDS[course][name])||(UNIT_IDS[course]&&UNIT_IDS[course][name])||course+"/"+slug(name);
  const loading={},done={};
  const plain=f=>f.split("?")[0];
  /* A file counts as loaded if a script for it is already on the page (storage.js adds the saved course's at boot). */
  const onPage=f=>[...document.scripts].some(s=>s.src&&plain(new URL(s.src,location.href).pathname).endsWith("/"+plain(f)));
  const files=(course,part)=>(FILES[course]||[]).filter(f=>!part||(part==="early")===EARLY.has(plain(f)));
  const loaded=course=>files(course).every(f=>done[f]||onPage(f));
  function load(f){
    if(done[f]||onPage(f))return Promise.resolve();
    return loading[f]||(loading[f]=new Promise((resolve,reject)=>{
      const s=document.createElement("script");s.src=f;s.async=false;
      s.onload=()=>{done[f]=true;resolve()};
      s.onerror=()=>{delete loading[f];reject(new Error("Couldn’t load "+plain(f)+". Connect to the internet once to download this course."))};
      document.head.appendChild(s);
    }));
  }
  const ensure=course=>Promise.all(files(course).map(load)).then(()=>{remapLessons(course);return course});
  function pack(course){
    const c=typeof C!=="undefined"&&C[course];if(!c)return null;
    const lessons=((window.EVIA_TEACH||{}).courses||{})[course]||[];
    const split=k=>{const i=String(k).indexOf("|");return {code:i<0?String(k):String(k).slice(0,i),text:i<0?"":String(k).slice(i+1)}};
    return {id:course,version:VERSION,name:c.name,standard:c.std,
      units:c.u.map(u=>({id:unitId(course,u[0]),name:u[0],ksbs:(u[1]||[]).map(split),lessons:(lessons.find(l=>l.unit===u[0])||{lessons:[]}).lessons.map(l=>l.id)})),
      lessons:lessons.map(l=>({unit:l.unit,lessons:l.lessons.map(x=>({id:x.id,title:x.title,steps:(x.steps||[]).length}))}))};
  }
  /* Downloaded courses use their own name; the rest the catalogue's. */
  const catalogue=()=>Object.keys(CATALOGUE).map(id=>{const c=typeof C!=="undefined"&&C[id];return {id,name:c?c.name:CATALOGUE[id].name,std:c?c.std:CATALOGUE[id].std}});
  /* ---------- Following a college's own pack (learners connected to Nisia only) ----------
     Evia's topics for the course become the pack's. Each piece of the learner's evidence moves to its topic (by the
     topic's id, its name, the topic it was copied from, or where its KSBs fit best) and is sent to Nisia again; Teach me
     lessons go with the topic they were copied from, or the topic whose KSBs they fit best. Back on your pack, Evia's own
     topics come back the same way. Offline learners, and the NVQ (set by the qualification), never change. */
  const ORIG={},ORIG_TEACH={};
  const own=course=>{if(!ORIG[course]&&typeof C!=="undefined"&&C[course])ORIG[course]=C[course].u.map(u=>[u[0],u[1].slice()]);return ORIG[course]||[]};
  const ownTopics=course=>own(course).map(u=>({id:(UNIT_IDS[course]&&UNIT_IDS[course][u[0]])||course+"/"+slug(u[0]),name:u[0],ksbs:u[1].map(k=>split(k))}));
  const split=k=>{const i=String(k).indexOf("|");return {code:i<0?String(k):String(k).slice(0,i),text:i<0?"":String(k).slice(i+1)}};
  const following={};
  /* The topic a piece of evidence (or a lesson's topic) belongs to among these topics. */
  function place(topics,uid,name,codes,fromOf){
    let i=uid?topics.findIndex(t=>t.id===uid):-1;
    if(i<0&&uid)i=topics.findIndex(t=>t.from===uid);
    if(i<0&&uid&&fromOf&&fromOf[uid])i=topics.findIndex(t=>t.id===fromOf[uid]);
    if(i<0&&name)i=topics.findIndex(t=>t.name===name);
    if(i<0&&codes&&codes.length){let most=0;topics.forEach((t,j)=>{const n=t.ksbs.filter(k=>codes.includes(k.code)).length;if(n>most){most=n;i=j}})}
    return i;
  }
  function remapLessons(course){
    const T=window.EVIA_TEACH&&window.EVIA_TEACH.courses;if(!T||!T[course])return;
    if(!ORIG_TEACH[course])ORIG_TEACH[course]=T[course].slice();
    const f=following[course];
    if(!f){T[course]=ORIG_TEACH[course].slice();return}
    /* Each of the pack's topics gets the lessons of the topic of yours it came from, or fits best by KSB. */
    const mine=ownTopics(course),byName=Object.fromEntries(ORIG_TEACH[course].map(l=>[l.unit,l]));
    T[course]=f.topics.map(t=>{let j=mine.findIndex(m=>m.id===(t.from||t.id));
      if(j<0){let most=0;mine.forEach((m,k)=>{const n=m.ksbs.filter(x=>t.ksbs.some(y=>y.code===x.code)).length;if(n>most){most=n;j=k}})}
      const l=j>=0&&byName[mine[j].name];return l?Object.assign({},l,{unit:t.name}):null}).filter(Boolean);
  }
  /* p: the learner's pack from Nisia (null: Evia's own). Returns true if Evia's topics changed. */
  function follow(p,course){
    if(typeof C==="undefined"||!course||!C[course]||course==="trowel3")return false;
    const mine=ownTopics(course),use=p&&p.course===course&&Array.isArray(p.topics)&&p.topics.length?p.topics:null;
    const sameAsMine=!use||JSON.stringify(use.map(t=>[t.id,t.name,t.ksbs.map(k=>k.code)]))===JSON.stringify(mine.map(t=>[t.id,t.name,t.ksbs.map(k=>k.code)]));
    const target=sameAsMine?null:use,key=target?p.hash||JSON.stringify(target.map(t=>t.id)):"own";
    if((following[course]?following[course].key:"own")===key)return false;
    const official=Object.fromEntries((p&&p.ksbs||[]).map(([c,t])=>[c,t]));
    const before=following[course]?following[course].topics:mine;
    if(target){
      C[course].u=target.map(t=>[t.name,t.ksbs.map(k=>k.code+"|"+(k.text||official[k.code]||""))]);
      PACK_IDS[course]=Object.fromEntries(target.map(t=>[t.name,t.id]));
      following[course]={key,topics:target,title:p.title||""};
    }else{
      C[course].u=own(course).map(u=>[u[0],u[1].slice()]);delete PACK_IDS[course];delete following[course];
    }
    const now=target||mine,fromOf=Object.fromEntries(before.filter(t=>t.from).map(t=>[t.id,t.from]));
    /* The learner's evidence for the course, to its topic in the new list. */
    if(typeof evidence!=="undefined"&&Array.isArray(evidence)){
      let moved=0;const names={};
      evidence.forEach(e=>{if(!e||e.c!==course)return;
        const i=place(now,e.uid||null,e.u,(e.k||[]).map(k=>String(k).split("|")[0]),fromOf);if(i<0)return;
        if(e.u!==now[i].name||e.uid!==now[i].id){if(e.u&&e.u!==now[i].name)(names[now[i].name]=names[now[i].name]||[]).push(e.u);e.u=now[i].name;e.uid=now[i].id;moved++}});
      if(moved&&typeof persist==="function")persist();
      /* Coins already paid for a topic's evidence go with it to its new name, so a rename never pays twice. */
      if(Object.keys(names).length){const R=window.eviaRewards;if(R&&R.carry)R.carry(course,names);else(window.eviaRewardsCarry=window.eviaRewardsCarry||[]).push([course,names])}
    }
    remapLessons(course);
    /* Teach me's lessons load after Evia starts: match them to the topics once they're here. */
    if(!(window.EVIA_TEACH&&window.EVIA_TEACH.courses&&window.EVIA_TEACH.courses[course])){
      const again=()=>remapLessons(course);window.addEventListener("load",again,{once:true});setTimeout(again,4000);
    }
    return true;
  }
  /* The pack kept from Nisia, for the learner's course, if they're connected. */
  function followKept(course){
    let p=null;
    try{const e=window.eviaData&&window.eviaData.enrolment&&window.eviaData.enrolment();if(e&&e.live)p=JSON.parse(localStorage.getItem("evia7-nisia-pack")||"null")}catch(_){}
    return follow(p,course);
  }
  const followingPack=course=>following[course]?{title:following[course].title,topics:following[course].topics.length}:null;
  window.eviaPacks={VERSION,files,ensure,loaded,unitId,pack,catalogue,follow,followKept,followingPack,COURSES:Object.keys(FILES)};
})();
