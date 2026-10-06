/* PARKED: not loaded by index.html or cached by sw-v16.js. To bring it back, add it to data-app-scripts and
   APP_SHELL (and games/quest.jpg). */
/* Evia's Site Quest (demo): a Pokémon-style adventure on a building site.
   The whole screen is the game. Tap anywhere and Evia walks there; tap a person or thing and she walks up and talks
   to them or uses it. Encounters (fires, spills, defects, a pushy foreman) start battles. Like Pokémon, Evia has a
   party of six skills (Extinguishers, Safety, Toolkit, Materials, Regulations, People), each with four moves:
   choose the right skill for what's in front of you, then the right move. FIGHT, SKILLS (switching costs a turn),
   BOOK (the Site Handbook) and INSPECT (clues). People teach each skill before it's tested; wrong moves explain why;
   the gym hides what kind of fire it is. Beaten encounters drop what opens the next part of the site.
   The site report at the end is the assessment. Unlocked in Rewards (epic). */
(function(){
  const G=window.eviaGames;if(!G||!G.register)return;
  const {esc,buzz}=G,R=()=>window.eviaRewards;
  const coinSvg=()=>R()&&R().coin?R().coin():"";
  const KEY="evia7-quest2",T=16,MW=24,MH=20;

  /* ---------- The map ---------- */
  const SOLID=new Set("#xOSEPNTbGL");
  function makeMap(){
    const m=Array.from({length:MH},()=>Array(MW).fill("."));
    const rect=(x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)m[j][i]=c};
    rect(0,0,MW,1,"#");rect(0,MH-1,MW,1,"#");rect(0,0,1,MH,"#");rect(MW-1,0,1,MH,"#");
    rect(1,1,10,1,"g");rect(2,2,5,3,"O");rect(1,7,22,1,"=");rect(8,5,1,2,"=");
    rect(11,1,1,12,"x");m[7][11]="G";
    rect(13,2,6,2,"S");rect(20,2,2,2,"P");rect(20,9,2,2,"N");rect(13,10,2,2,"b");rect(15,4,1,3,"=");
    rect(1,13,22,1,"x");m[13][21]="L";
    rect(2,16,21,1,"=");rect(21,14,1,2,"=");rect(3,14,6,2,"T");rect(16,14,5,2,"E");rect(1,17,22,2,"g");
    return m;
  }

  /* ---------- Evia's six skills and their moves ---------- */
  const SKILLS={
    ext:{name:"Extinguishers",col:"#dc2626",moves:["water","foam","co2","wet"],info:"Put out small fires, after raising the alarm. Match the extinguisher to what’s burning."},
    safe:{name:"Safety",col:"#f59e0b",moves:["alarm","isolate","cordon","stop"],info:"Raise the alarm, isolate the power, cordon off, stop the job. Often the first thing to do."},
    tools:{name:"Toolkit",col:"#475569",moves:["spill","mop","bolster","level"],info:"The right tool for the job: spill kit, mop, bolster and club hammer, spirit level."},
    mat:{name:"Materials",col:"#b8674b",moves:["brushoff","wash","acid","hessian"],info:"How materials behave, and how to treat and protect brickwork."},
    regs:{name:"Regulations",col:"#0b5cad",moves:["rams","permit","riddor","coshh"],info:"The paperwork and law that keep people safe: RAMS, permits, RIDDOR, COSHH."},
    people:{name:"People",col:"#16a34a",moves:["ask","report","calm","agree"],info:"Talking, listening and speaking up when something isn’t right."}
  };
  const PARTY=["ext","safe","tools","mat","regs","people"];
  const MOVE={
    water:{name:"Water",band:"#d62828",info:"Red label. Class A: wood, paper, cardboard. Never on electrics or burning liquids."},
    foam:{name:"Foam",band:"#f1dfae",info:"Cream label. Class A and B (burning liquids like petrol). Not on electrics or cooking oil."},
    co2:{name:"CO₂",band:"#1f2328",info:"Black label. Electrical fires and Class B. It doesn’t cool, so wood and paper can reignite."},
    wet:{name:"Wet chemical",band:"#f5d000",info:"Yellow label. Class F: cooking oil and fat fires, like a chip pan."},
    alarm:{name:"Raise the alarm",info:"Press the call point so everyone gets out. Always first for a fire."},
    isolate:{name:"Isolate power",info:"Switch off at the isolator, if it’s safe to reach. Never fight an electrical fire while it’s live."},
    cordon:{name:"Cordon and signs",info:"Barriers and signs keep other people away while you deal with it."},
    stop:{name:"Stop the job",info:"Anyone can stop work that isn’t safe. Stop, make safe, then sort it out."},
    spill:{name:"Spill kit",info:"Absorbent pads and granules: contain it, soak it up, bag it for proper disposal."},
    mop:{name:"Mop and water",info:"Fine for water. On oil it just spreads it further."},
    bolster:{name:"Bolster",info:"Bolster and club hammer: for cutting bricks and breaking out old work. Not for cleaning."},
    level:{name:"Spirit level",info:"Checks level and plumb. The bubble sits between the lines."},
    brushoff:{name:"Dry brush off",info:"Efflorescence (white salts) is best brushed off when dry. It usually weathers away."},
    wash:{name:"Wash with water",info:"Water dissolves more salts from the bricks, so efflorescence comes back."},
    acid:{name:"Brick acid",info:"Strong acid can burn and stain new brickwork. Only with the right product, method and PPE."},
    hessian:{name:"Frost cover",info:"Hessian or insulated sheets protect new brickwork from frost and rain."},
    rams:{name:"Check the RAMS",info:"The risk assessment and method statement say how the job is done safely."},
    permit:{name:"Permit to work",info:"High-risk jobs (hot works, confined spaces, live electrics) need a permit first."},
    riddor:{name:"RIDDOR report",info:"Serious injuries and dangerous occurrences must be reported to the HSE."},
    coshh:{name:"COSHH check",info:"Hazardous substances (cement, solvents) need a COSHH assessment."},
    ask:{name:"Ask questions",info:"If you’re not sure, ask. Good questions stop accidents."},
    report:{name:"Tell your supervisor",info:"Report unsafe things to your supervisor or site manager."},
    calm:{name:"Stay calm, explain",info:"Keep calm and explain your reason clearly and politely."},
    agree:{name:"Just go along with it",info:"Going along with something unsafe to keep the peace never ends well."}
  };
  const moveSkill=k=>PARTY.find(s=>SKILLS[s].moves.includes(k));
  /* Encounters: how well each move works (3 super effective, 2 effective, 1 not very effective, 0 no effect, -1 backfires). */
  const FOES={
    blaze:{name:"Blaze",type:"Class A fire",kind:"fire",what:"Wood, paper and cardboard burning in a bin.",hit:10,col:"#f97316",best:"ext",
      eff:{water:3,foam:2,co2:1,wet:2},why:{co2:"The CO₂ knocks the flames down, but the embers reignite."}},
    slick:{name:"Slick",type:"Oil spill",kind:"spill",what:"Generator oil across the walkway: a slip hazard, and it mustn’t reach the drains.",hit:10,col:"#334155",best:"tools",
      eff:{spill:3,mop:-1,coshh:1},why:{mop:"Water on oil just spreads it further!",coshh:"Good thought: oil is a hazardous substance. Now clean it up.",alarm:"It’s a spill, not a fire. No need to empty the site."}},
    efflo:{name:"Efflo",type:"Defect: efflorescence",kind:"defect",what:"White, powdery salts on new brickwork.",hit:6,col:"#e5e7eb",best:"mat",
      eff:{brushoff:3,wash:-1,acid:-1,bolster:-1},why:{wash:"Water dissolves more salts: it comes back worse!",acid:"Acid on new brickwork burns and stains it!",bolster:"That damages the face of the bricks!"}},
    sparky:{name:"Sparky",type:"Electrical fire",kind:"fire",what:"A distribution board on fire, still live.",hit:14,col:"#eab308",best:"ext",
      eff:{co2:3,water:-1,foam:-1,wet:-1,permit:0},why:{water:"Water conducts electricity! That could kill.",foam:"Foam is water-based and conducts electricity!",wet:"Wet chemical is water-based: never on live electrics.",permit:"Paperwork won’t put a fire out!"}},
    frank:{name:"Foreman Frank",type:"Pressure to cut corners",kind:"person",what:"“The scaffold tag’s missing, but it’s fine. We’re behind: get up there!”",hit:10,col:"#1f2937",best:"people",
      eff:{report:3,ask:2,calm:2,stop:3,rams:2,agree:-1,permit:0,riddor:0},
      why:{agree:"You climb an untagged scaffold… it wobbles! Never use a scaffold without a valid tag.",riddor:"Nobody’s hurt: RIDDOR is for reporting injuries.",permit:"A permit isn’t the issue: the scaffold hasn’t been inspected."},
      good:{report:"You tell Sam. Work stops until the scaffold is inspected.",ask:"You ask why the tag’s missing. Frank hesitates.",calm:"You calmly explain you can’t use it until it’s tagged.",stop:"You stop and won’t go up until it’s inspected.",rams:"The method statement says: only use scaffolds that have been inspected."}},
    fuel:{name:"Fuel fire",type:"Class B fire",kind:"fire",what:"Burning petrol.",hit:12,col:"#fb923c",best:"ext",clue:"It’s by the generator, and it smells strongly of petrol.",
      eff:{foam:3,co2:2,water:-1,wet:1},why:{water:"Water spreads burning petrol and makes it worse!",wet:"Wet chemical is for cooking oil, not petrol."}},
    chip:{name:"Chip pan fire",type:"Class F fire",kind:"fire",what:"Cooking oil alight.",hit:12,col:"#f59e0b",best:"ext",clue:"It’s in the canteen. A pan of cooking oil has caught light.",
      eff:{wet:3,water:-1,foam:1,co2:1},why:{water:"Water on burning oil causes a fireball!",foam:"Foam isn’t made for oil fires this hot.",co2:"CO₂ knocks it back, but the oil is so hot it reignites."}},
    card:{name:"Packaging fire",type:"Class A fire",kind:"fire",what:"Cardboard packaging burning.",hit:12,col:"#f97316",best:"ext",clue:"A pile of cardboard packaging from a delivery.",
      eff:{water:3,foam:2,wet:2,co2:1},why:{co2:"CO₂ knocks it down, but cardboard smoulders and reignites."}}
  };
  const RULES={
    classes:{name:"Fire classes",info:"Class A: solids (wood, paper). Class B: flammable liquids (petrol). Class C: gases. Electrical fires. Class F: cooking oil and fat."},
    chart:{name:"Which extinguisher?",info:"Water (red): A. Foam (cream): A and B. CO₂ (black): electrical and B. Dry powder (blue): A, B, C and electrical. Wet chemical (yellow): F. Only tackle small fires, after raising the alarm."},
    r345:{name:"The 3-4-5 rule",info:"Sides of 3 and 4 with a diagonal of 5 make a square corner. It works in multiples: 6-8-10, 9-12-15."},
    tags:{name:"Scaffold tags",info:"Green tag: inspected and safe to use. Red tag or no tag: do not use. Scaffolds are inspected before first use, every 7 days and after bad weather."},
    ppe:{name:"Induction and PPE",info:"Sign in and do your induction on a new site. Hard hat, hi-vis and safety boots on at all times."}
  };

  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"null")}catch(_){return null}};
  const save=s=>{try{localStorage.setItem(KEY,JSON.stringify(s))}catch(_){}};

  function run(ctx){
    ctx.body.innerHTML='<div class="eq"><canvas aria-label="Evia’s Site Quest"></canvas>'+
      '<div class="eq-hud"><button type="button" class="eq-book-btn" aria-label="Site Handbook"><svg viewBox="0 0 24 24"><path d="M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-5a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h5z"/></svg></button><b class="eq-lv"></b><span class="eq-coins">'+coinSvg()+'<b>0</b></span><button type="button" class="eq-x" aria-label="Close">×</button></div>'+
      '<div class="eq-box" hidden><div class="eq-text"></div><div class="eq-menu"></div></div><div class="eq-over"></div></div>';
    const $=s=>ctx.body.querySelector(s);
    const wrap=$(".eq"),cv=$("canvas"),g=cv.getContext("2d"),box=$(".eq-box"),textEl=$(".eq-text"),menuEl=$(".eq-menu"),over=$(".eq-over");
    const accent=getComputedStyle(document.documentElement).getPropertyValue("--yellow").trim()||"#f5c400";
    let W=0,H=0,dpr=1,scale=2,camX=0,camY=0,mode="title",raf=0,last=0;
    const size=()=>{const r=wrap.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);W=r.width;H=r.height;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+"px";cv.style.height=H+"px";
      scale=W<H?W/(9*T):H/(9*T)};
    const ro=new ResizeObserver(size);ro.observe(wrap);size();
    const setMode=m=>{mode=m;wrap.dataset.mode=m};

    /* ---------- State ---------- */
    let S=null,map=null,ents=[],p=null,route=[],goalEnt=null;
    function fresh(){return {v:2,tx:2,ty:8,face:"r",lv:1,xp:0,coins:0,skills:[],moves:[],active:"ext",items:[],book:{},f:{},beaten:{},got:{},
      report:{alarmFirst:0,backfires:0,cordonFirst:null,isolateFirst:null,gate345:0,frankRight:null,efflo:null,gymBackfires:0,switches:0}}}
    function begin(s){
      S=s;map=makeMap();if(S.f.gate)map[7][11]=".";if(S.f.compound)map[13][21]="=";
      p={tx:S.tx,ty:S.ty,x:S.tx*T,y:S.ty*T,face:S.face,moving:0,fx:0,fy:0};route=[];goalEnt=null;
      buildEnts();hud();setMode("world");box.hidden=true;
      if(!S.f.started){S.f.started=1;say([["","First day on site. Tap anywhere and Evia walks there. Tap Sam, the site manager, to talk to him."]])}
    }
    const persist=()=>{if(!S)return;S.tx=p.tx;S.ty=p.ty;S.face=p.face;save(S)};
    function learn(k){S.book[k]=1}
    function giveSkill(s,moves){if(!S.skills.includes(s))S.skills.push(s);learn(s);(moves||[]).forEach(m=>{if(!S.moves.includes(m))S.moves.push(m);learn(m)})}
    function giveMove(m){if(!S.moves.includes(m))S.moves.push(m);learn(m)}

    function buildEnts(){
      ents=[];const E=o=>ents.push(o);
      E({id:"sam",kind:"npc",tx:4,ty:5,hat:"#fff",act:talkSam});
      E({id:"fpoint",kind:"fp",tx:6,ty:5,act:()=>say([["Fire point","Extinguishers and a fire alarm call point. Read the label before you use one."]])});
      if(!S.beaten.blaze)E({id:"blaze",kind:"foe",foe:"blaze",tx:8,ty:7,act:()=>S.f.inducted?battle("blaze"):say([["","The waste bin is smouldering. Talk to Sam first!"]])});
      E({id:"mo",kind:"npc",tx:10,ty:6,hat:"#2f6fcf",act:talkMo});
      if(!S.f.gate)E({id:"gate",kind:"gate345",tx:11,ty:7,act:talkMo});
      E({id:"jas",kind:"npc",tx:16,ty:4,hat:"#2f6fcf",act:talkJas});
      if(!S.beaten.slick)E({id:"slick",kind:"foe",foe:"slick",tx:19,ty:7,act:()=>S.skills.includes("tools")?battle("slick"):say([["","Oil is spreading across the walkway. Jas at the stores will know what to do."]])});
      E({id:"dan",kind:"npc",tx:12,ty:10,hat:"#fb8c1a",act:talkDan});
      if(!S.beaten.efflo)E({id:"efflo",kind:"foe",foe:"efflo",tx:15,ty:11,act:()=>S.skills.includes("mat")?battle("efflo"):say([["","White powdery marks all over the new brickwork. Dan the bricklayer is right there: ask him."]])});
      if(!S.f.compound)E({id:"lock",kind:"lock",tx:21,ty:13,act:()=>{if(S.items.includes("keys")){S.f.compound=1;map[13][21]="=";ents=ents.filter(e=>e.id!=="lock");buzz(15);persist();say([["","The keys fit. The electrical compound is open."]])}else say([["Locked gate","Electrical compound. Authorised people only."]])}});
      E({id:"pat",kind:"npc",tx:21,ty:17,hat:"#2f6fcf",act:talkPat});
      if(!S.beaten.sparky)E({id:"sparky",kind:"foe",foe:"sparky",tx:18,ty:16,act:()=>S.f.pat?battle("sparky"):say([["","The distribution board is sparking and smoking! Talk to Pat, the electrician, first."]])});
      if(!S.beaten.frank)E({id:"frank",kind:"npc",tx:9,ty:16,hat:"#1f2937",act:()=>S.beaten.sparky?battle("frank"):say([["Frank","Busy, busy. Come back later."]])});
      E({id:"cabin",kind:"door",tx:5,ty:15,act:cabin});
      [[3,10],[6,11],[9,9],[14,8],[18,11],[21,5],[13,5],[3,17],[10,18],[15,18],[20,18],[1,3]].forEach(([x,y],i)=>{if(!S.got["c"+i])E({id:"c"+i,kind:"coin",tx:x,ty:y})});
    }
    const entAt=(x,y)=>ents.find(e=>e.tx===x&&e.ty===y&&e.kind!=="coin");
    const blocked=(x,y)=>{const c=(map[y]||[])[x];return c==null||SOLID.has(c)};
    const solid=(x,y)=>blocked(x,y)||!!entAt(x,y);

    /* ---------- People ---------- */
    function talkSam(){
      if(!S.f.inducted){S.f.inducted=1;learn("ppe");learn("classes");giveSkill("ext",["water","co2"]);giveSkill("safe",["alarm","stop"]);giveSkill("people",["ask","report","calm","agree"]);persist();
        return say([["Sam","Morning! I’m Sam, the site manager. First job for any new starter: your induction."],
          ["Sam","Here’s your site pass and your PPE: hard hat, hi-vis and safety boots. On at all times."],
          ["Sam","On site you’ll build up six skills: Extinguishers, Safety, Toolkit, Materials, Regulations and People. You’ve got three to start with."],
          ["Sam","When something goes wrong, pick the right skill for it, then the right move. It’s all in your Site Handbook: tap the book at the top, even mid-battle."],
          ["Sam","Fires come in classes by what’s burning. Class A is solids like wood and paper. Class B is liquids like petrol."],
          ["Sam","Oh! The waste bin by the walkway is smouldering. Go on: tap it. Raise the alarm first, then pick an extinguisher."]],hud)}
      if(!S.beaten.blaze)return say([["Sam","The bin fire, on the walkway. Tap it."]]);
      if(!S.f.gate)return say([["Sam","Nicely done. Mo’s on the setting-out gate to the yard. Know your 3-4-5?"]]);
      return say([["Sam","When you’ve got a pass for the training cabin, come and find me there."]]);
    }
    function talkMo(){
      if(S.f.gate)return say([["Mo","Square corners every time. 3-4-5, in multiples."]]);
      if(!S.beaten.blaze)return say([["Mo","Sam wants that bin fire sorted first."]]);
      learn("r345");
      if(!S.f.moTaught){S.f.moTaught=1;S.f.mult=[2,3,4][Math.floor(Math.random()*3)];persist();
        return say([["Mo","I’m Mo, the site engineer. You only get through this gate if you can set out a square corner."],
          ["Mo","The 3-4-5 rule: measure 3 along one side, 4 along the other. If the diagonal is exactly 5, the corner is square."],
          ["Mo","It works in multiples: 6-8-10, 9-12-15. Try the keypad."]],keypad345)}
      keypad345();
    }
    function keypad345(){
      const m=S.f.mult||2,a=3*m,b=4*m;
      askNumber("Setting-out gate: one side is "+a+" m, the other "+b+" m. What must the diagonal be for a square corner?",n=>{
        if(n===5*m){S.f.gate=1;if(!S.report.gate345)S.report.gate345=1;map[7][11]=".";ents=ents.filter(e=>e.id!=="gate");buzz([15,30]);gain(20);persist();
          say([["Mo","Spot on: "+a+", "+b+", "+(5*m)+". Square. Through you go."]])}
        else{S.report.gate345=-1;buzz([20,30]);say([["Mo","Not square. "+a+" is 3 × "+m+" and "+b+" is 4 × "+m+", so the diagonal is 5 × "+m+"."]],keypad345)}
      });
    }
    function talkJas(){
      if(S.skills.includes("tools"))return say([["Jas",S.beaten.slick?"Cheers for sorting that spill.":"The spill’s by the generator. Cordon it off first, then your spill kit."]]);
      giveSkill("tools",["spill","mop","bolster","level"]);giveMove("cordon");persist();
      say([["Jas","New starter? Great timing. Someone’s knocked the generator oil over and it’s spreading across the walkway."],
        ["Jas","Here’s your Toolkit skill: spill kit, mop, bolster, spirit level. And for Safety: cordon and signs."],
        ["Jas","A spill kit has absorbent pads and granules. Cordon it off first so nobody slips, then contain it and soak it up."]]);
    }
    function talkDan(){
      if(S.skills.includes("mat"))return say([["Dan",S.beaten.efflo?"Good as new. Salts come and go on new work.":"Dry brush, no water. Go on."]]);
      giveSkill("mat",["brushoff","wash","acid","hessian"]);persist();
      say([["Dan","Alright? I’m Dan, bricklayer. See that white stuff on my new wall? Efflorescence."],
        ["Dan","It’s salts coming out of the bricks as they dry. Looks bad, but it’s harmless."],
        ["Dan","Here’s your Materials skill. Brush it off when it’s dry. Don’t wash it: water brings out more salts. And no acid on new work."]]);
    }
    function talkPat(){
      if(S.f.pat)return say([["Pat",S.beaten.sparky?"Power stays off until I’ve tested it.":"Isolate first, then CO₂."]]);
      S.f.pat=1;giveMove("isolate");giveSkill("regs",["rams","permit","riddor","coshh"]);persist();
      say([["Pat","I’m Pat, the electrician. The distribution board is on fire: Sparky, we call it."],
        ["Pat","Never water or foam on electrics. They conduct, and it could kill you. Isolate the power first if it’s safe, then CO₂."],
        ["Pat","You’ve learnt Isolate power. And take this Regulations skill: RAMS, permits, RIDDOR, COSHH. Electrical work always needs a permit."]]);
    }
    function cabin(){
      if(S.f.badge)return say([["Training cabin","You’ve passed the fire safety check."]]);
      if(!S.items.includes("pass"))return say([["Training cabin","Fire safety check. Pass holders only."]]);
      if(!S.beaten.frank)return say([["Frank","Oi! Before you go in there, I need you up on that scaffold."]],()=>battle("frank"));
      giveMove("foam");giveMove("wet");learn("chart");
      say([["Sam","The fire safety check! Three fires, one after another. This time I won’t tell you the class."],
        ["Sam","INSPECT gives you clues. The BOOK has the extinguisher chart. Here’s a wet chemical extinguisher: the yellow label."],
        ["Sam","It’s a drill, so the alarm’s already raised. Ready?"]],()=>battle("fuel",{gym:["fuel","chip","card"]}));
    }

    /* ---------- The text box ---------- */
    let queue=[],after=null;
    function say(lines,then){queue=lines.slice();after=then||null;route=[];showText()}
    function showText(){
      if(!queue.length){if(mode!=="battle")box.hidden=true;return}
      const [who,text]=queue[0];box.hidden=false;box.classList.add("talk");
      textEl.innerHTML=(who?'<b>'+esc(who)+'</b>':"")+'<p>'+esc(text)+'</p><span class="eq-more">▼</span>';if(mode==="battle")menuEl.innerHTML="";
    }
    function next(){if(!queue.length)return false;queue.shift();if(queue.length){showText();return true}box.classList.remove("talk");const f=after;after=null;if(mode!=="battle")box.hidden=true;if(f)f();return true}
    box.addEventListener("pointerdown",e=>{if(queue.length&&!e.target.closest("button")){e.preventDefault();next()}});

    /* ---------- Tap to move ---------- */
    cv.addEventListener("pointerdown",e=>{
      e.preventDefault();
      if(queue.length){next();return}
      if(mode!=="world")return;
      const r=cv.getBoundingClientRect(),wx=camX+(e.clientX-r.left)/scale,wy=camY+(e.clientY-r.top)/scale,tx=Math.floor(wx/T),ty=Math.floor(wy/T);
      if(tx<0||ty<0||tx>=MW||ty>=MH)return;
      const e2=entAt(tx,ty);
      if(e2&&e2.act){goTo(tx,ty,e2)}
      else if(!solid(tx,ty))goTo(tx,ty,null);
      tapFx={x:tx,y:ty,t:18};
    });
    let tapFx=null;
    function goTo(tx,ty,ent){
      goalEnt=ent;
      if(ent){const adj=[[0,1,"u"],[0,-1,"d"],[1,0,"l"],[-1,0,"r"]].map(([dx,dy,f])=>({x:tx+dx,y:ty+dy,f})).filter(a=>!solid(a.x,a.y)||(a.x===p.tx&&a.y===p.ty));
        if(adj.some(a=>a.x===p.tx&&a.y===p.ty)){const a=adj.find(a=>a.x===p.tx&&a.y===p.ty);route=[];p.face=a.f;return interact()}
        let best=null;for(const a of adj){const r=path(a.x,a.y);if(r&&(!best||r.length<best.r.length))best={r,f:a.f}}
        if(!best){goalEnt=null;return}route=best.r;goalEnt.face=best.f;return}
      route=path(tx,ty)||[];
    }
    function path(tx,ty){
      const key=(x,y)=>x+","+y,start=key(p.tx,p.ty),prev={[start]:null},q=[[p.tx,p.ty]];
      while(q.length){const [x,y]=q.shift();if(x===tx&&y===ty)break;
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(k in prev||solid(nx,ny))continue;prev[k]=key(x,y);q.push([nx,ny])}}
      const end=key(tx,ty);if(!(end in prev))return null;
      const out=[];let k=end;while(k&&k!==start){const [x,y]=k.split(",").map(Number);out.unshift([x,y]);k=prev[k]}return out;
    }
    function interact(){const e=goalEnt;goalEnt=null;if(e&&e.act){buzz(8);e.act(e)}}
    function step(dt){
      if(p.moving){p.moving-=dt;const k=Math.max(0,p.moving/8);p.x=(p.tx-p.fx*k)*T;p.y=(p.ty-p.fy*k)*T;if(p.moving<=0){p.moving=0;p.x=p.tx*T;p.y=p.ty*T;arrive()}return}
      if(route.length&&!queue.length){const [nx,ny]=route[0];
        if(solid(nx,ny)){route=[];return}
        route.shift();p.fx=nx-p.tx;p.fy=ny-p.ty;p.face=p.fx>0?"r":p.fx<0?"l":p.fy>0?"d":"u";p.tx=nx;p.ty=ny;p.moving=8}
      else if(goalEnt&&!route.length&&!queue.length){p.face=goalEnt.face||p.face;interact()}
    }
    function arrive(){
      const c=ents.find(e=>e.kind==="coin"&&e.tx===p.tx&&e.ty===p.ty);
      if(c){S.got[c.id]=1;S.coins++;ents=ents.filter(e=>e!==c);buzz(6);hud()}
      if(!route.length)persist();
    }
    function hud(){$(".eq-lv").textContent="Evia · Lv "+S.lv;$(".eq-coins b").textContent=S.coins}
    function gain(xp){S.xp+=xp;const lv=1+Math.floor(S.xp/60);if(lv>S.lv){S.lv=lv;buzz([15,30,15])}hud()}

    /* ---------- Knowledge doors: the keypad ---------- */
    function askNumber(text,done){
      setMode("keypad");let v="";queue=[];box.hidden=false;box.classList.remove("talk");
      const paint=()=>{textEl.innerHTML='<p>'+esc(text)+'</p><div class="eq-kpv">'+(v||"–")+'</div>'};paint();
      menuEl.innerHTML='<div class="eq-keypad">'+["1","2","3","4","5","6","7","8","9","⌫","0","OK"].map(k=>'<button type="button" data-kp="'+k+'">'+k+'</button>').join("")+'</div>';
      menuEl.querySelectorAll("[data-kp]").forEach(b=>b.addEventListener("pointerdown",e=>{e.preventDefault();const k=b.dataset.kp;buzz(5);
        if(k==="⌫")v=v.slice(0,-1);else if(k==="OK"){if(!v)return;menuEl.innerHTML="";setMode("world");box.hidden=true;done(+v);return}else if(v.length<3)v+=k;paint()}));
    }

    /* ---------- Battles ---------- */
    let B=null;
    function battle(id,opt){
      const f=FOES[id],gym=opt&&opt.gym;route=[];goalEnt=null;
      B={id,foe:f,hp:100,me:100,gym,gi:gym?gym.indexOf(id):-1,alarm:!!gym,isolated:false,cordon:false,known:!gym,inspected:false,turn:0,warned:{},hitT:0,shake:0,flash:0};
      learn(id);setMode("battle");box.hidden=false;
      if(!S.skills.includes(S.active))S.active=S.skills[0];
      const open=f.kind==="person"?f.name+" wants a word!":gym?"A fire breaks out! What’s burning?":"A wild "+f.name+" appeared!";
      const lines=[["",open]];
      if(f.kind==="person")lines.push(["Frank",f.what]);
      lines.push(["","Evia is using her "+SKILLS[S.active].name+" skill."+(f.kind==="person"||id==="efflo"?" Is that the right one? Tap SKILLS to switch.":"")]);
      say(lines,mainMenu);
    }
    function mainMenu(){
      if(!B)return;box.classList.remove("talk");
      textEl.innerHTML='<p>What will Evia do?</p><small>'+esc(SKILLS[S.active].name)+' skill</small>';
      menuEl.innerHTML='<div class="eq-main"><button type="button" data-a="fight" class="fight">FIGHT</button><button type="button" data-a="skills" class="skills">SKILLS</button><button type="button" data-a="book" class="book">BOOK</button><button type="button" data-a="inspect" class="inspect">INSPECT</button></div>';
      menuEl.querySelector('[data-a="fight"]').onclick=fightMenu;menuEl.querySelector('[data-a="skills"]').onclick=()=>party(true);
      menuEl.querySelector('[data-a="book"]').onclick=openBook;menuEl.querySelector('[data-a="inspect"]').onclick=inspect;
    }
    function fightMenu(){
      const sk=SKILLS[S.active];
      textEl.innerHTML='<p>'+esc(sk.name)+': choose a move.</p>';
      menuEl.innerHTML='<div class="eq-fight">'+sk.moves.map(k=>{const M=MOVE[k],has=S.moves.includes(k);return '<button type="button" data-m="'+k+'"'+(has?"":" disabled")+' style="--c:'+sk.col+'">'+(M.band?'<i class="eq-ext" style="--b:'+M.band+'"></i>':'')+'<span>'+(has?esc(M.name):"–")+'</span></button>'}).join("")+'</div><button type="button" class="eq-back">Back</button>';
      menuEl.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>use(b.dataset.m));menuEl.querySelector(".eq-back").onclick=mainMenu;
    }
    /* The party screen: Evia's six skills, like choosing your Pokémon. In a battle, switching uses her turn. */
    function party(inBattle){
      const prev=mode;setMode("party");
      over.hidden=false;over.innerHTML='<div class="eq-party"><header><strong>Evia’s skills</strong><button type="button" class="eq-close">'+(inBattle?"Back":"Close")+'</button></header>'+
        PARTY.map(s=>{const k=SKILLS[s],has=S.skills.includes(s),n=k.moves.filter(m=>S.moves.includes(m)).length;return '<button type="button" class="eq-slot'+(has?"":" locked")+(S.active===s?" on":"")+'" data-s="'+s+'"'+(has?"":" disabled")+' style="--c:'+k.col+'"><i></i><span><strong>'+(has?esc(k.name):"???")+'</strong><small>'+(has?n+" of 4 moves"+(S.active===s?" · in use":""):"Not discovered yet")+'</small></span></button>'}).join("")+'</div>';
      const close=()=>{over.hidden=true;over.innerHTML="";setMode(prev)};
      over.querySelector(".eq-close").onclick=close;
      over.querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{const s=b.dataset.s;close();if(!inBattle){S.active=s;persist();return}
        if(s===S.active)return;S.active=s;S.report.switches++;enemyTurn([["","Evia switches to her "+SKILLS[s].name+" skill!"]])});
    }
    function inspect(){
      const f=B.foe;
      if(B.gym&&!B.inspected){B.inspected=true;return say([["Inspect",f.clue],["Inspect","What class of fire is that? The BOOK has the fire classes and the extinguisher chart."]],mainMenu)}
      say([["Inspect",f.name+": "+(B.known?f.type+". ":"")+f.what],["Evia","Which skill fits this? "+(f.kind==="fire"?"Fire… Extinguishers, and Safety to raise the alarm.":f.kind==="spill"?"A spill needs the right tools.":f.kind==="defect"?"A defect in the brickwork: Materials know-how.":"This is about people: speaking up.")]],mainMenu);
    }
    function use(k){
      const f=B.foe,M=MOVE[k],lines=[["","Evia uses "+M.name+"!"]],isFire=f.kind==="fire";B.turn++;
      if(k==="alarm"){
        if(!isFire)lines.push(["",f.why.alarm||"There’s no fire. No need to evacuate."]);
        else if(B.alarm)lines.push(["","The alarm is already sounding."]);
        else{B.alarm=true;if(B.turn===1)S.report.alarmFirst++;lines.push(["","The alarm sounds. Everyone heads for the assembly point."])}
      }else if(k==="isolate"){
        if(B.id!=="sparky")lines.push(["","There’s nothing electrical to isolate here."]);
        else if(B.isolated)lines.push(["","The power’s already off."]);else{B.isolated=true;if(S.report.isolateFirst==null)S.report.isolateFirst=1;lines.push(["","Power isolated. Sparky can’t restart itself now!"])}
      }else if(k==="cordon"){
        if(B.cordon)lines.push(["","It’s already cordoned off."]);else{B.cordon=true;if(B.id==="slick"&&S.report.cordonFirst==null)S.report.cordonFirst=1;lines.push(["","Barriers and signs up. Nobody else will walk into it."])}
      }else{
        let e=f.eff[k];if(e==null)e=0;
        if(isFire&&!B.alarm&&!B.warned.alarm){B.warned.alarm=1;lines.push(["Sam","Raise the alarm first! It’s in your Safety skill."])}
        if(B.id==="slick"&&k==="spill"&&!B.cordon&&S.report.cordonFirst==null)S.report.cordonFirst=0;
        if(B.id==="sparky"&&k==="co2"&&!B.isolated){e=2;if(S.report.isolateFirst==null)S.report.isolateFirst=0}
        if(B.id==="frank")S.report.frankRight=S.report.frankRight===false?false:e>0;
        if(B.id==="efflo")S.report.efflo=S.report.efflo===false?false:e>0;
        if(e<0){B.me-=25;S.report.backfires++;if(B.gym)S.report.gymBackfires++;if(B.id==="frank")S.report.frankRight=false;if(B.id==="efflo")S.report.efflo=false;B.shake=16;buzz([40,30,40]);lines.push(["","It backfired! "+(f.why[k]||"")])}
        else if(e===0){const right=moveSkill(k)===f.best;lines.push(["","It has no effect. "+(f.why[k]||(right?"":"Is "+SKILLS[moveSkill(k)].name+" the right skill for this?"))])}
        else{const dmg=e===3?55:e===2?34:14;B.hp=Math.max(0,B.hp-dmg);B.hitT=18;buzz(e===3?[15,20,15]:12);
          if(f.good&&f.good[k])lines.push(["",f.good[k]]);
          lines.push(["",e===3?"It’s super effective!":e===2?"It’s effective.":"It’s not very effective…"]);
          if(e===1&&f.why[k])lines.push(["",f.why[k]]);
          if(B.id==="sparky"&&k==="co2"&&!B.isolated&&B.hp>0){B.hp=Math.min(100,B.hp+25);lines.push(["Pat","It’s still live! It keeps restarting. Isolate the power!"])}
          if(e===1&&isFire&&B.hp>0){B.hp=Math.min(100,B.hp+10);lines.push(["",f.name+" flares up again."])}
          if(e>=2)B.known=true}
      }
      if(B.hp<=0)return say(lines,win);
      enemyTurn(lines);
    }
    function enemyTurn(lines){
      const f=B.foe;let hit=f.hit;if(B.cordon)hit=Math.ceil(hit/2);if(B.id==="sparky"&&B.isolated)hit=6;
      B.me-=hit;B.flash=10;
      lines.push(["",f.kind==="person"?"Frank: “Come on, we haven’t got all day!” The pressure’s building.":f.kind==="spill"?"Slick spreads further. Evia nearly slips!":f.kind==="defect"?"Efflo spreads across the wall.":B.id==="sparky"?"Sparky crackles and spits!":f.name+" spreads. The heat is building!"]);
      if(B.me<=0)return say(lines,retreat);
      say(lines,mainMenu);
    }
    function retreat(){
      say([["","Evia steps back to regroup. It’s OK to step back and think."],["","Check the BOOK: which skill fits, and which move?"]],()=>{
        B=null;setMode("world");box.hidden=true;const [dx,dy]={u:[0,-1],d:[0,1],l:[-1,0],r:[1,0]}[p.face];if(!solid(p.tx-dx,p.ty-dy)){p.tx-=dx;p.ty-=dy;p.x=p.tx*T;p.y=p.ty*T}});
    }
    function win(){
      const f=B.foe,id=B.id;gain(30);
      if(B.gym){const nextId=B.gym[B.gi+1],g2=B.gym;
        return say([["",f.name+" is out! It was a "+f.type+"."]],()=>nextId?battle(nextId,{gym:g2}):gymWon())}
      S.beaten[id]=1;ents=ents.filter(e=>e.foe!==id&&e.id!==id);
      const lines=[["",f.kind==="person"?"Frank backs down.":f.name+" is dealt with!"]];
      if(id==="blaze"){giveMove("foam");lines.push(["","Blaze dropped a Foam extinguisher (cream label)! A new Extinguishers move."],["Sam","Water was the one for wood and paper. Now, Mo’s on the setting-out gate to the yard."])}
      if(id==="slick"){S.items.push("keys");lines.push(["","Slick dropped a set of keys! The tag says: Electrical compound."])}
      if(id==="efflo"){lines.push(["","Efflo dropped a trowel! (Nothing to use it on yet: that’s for the next area.)"])}
      if(id==="sparky"){S.items.push("pass");lines.push(["","Sparky dropped a training cabin pass!"],["Pat","Power stays off until I’ve tested it. The training cabin is by the car park, bottom left."])}
      if(id==="frank"){learn("tags");lines.push(["Frank","Fair enough. Good shout: I’ll get the scaffold inspected and tagged."],["","New Handbook page: Scaffold tags."])}
      B=null;setMode("world");box.hidden=true;persist();say(lines);
    }
    function gymWon(){
      S.f.badge=1;B=null;setMode("world");persist();
      say([["Sam","Three fires, three right answers. That’s your Fire Safety badge!"],["Sam","That’s the end of the demo. Here’s your site report."]],report);
    }
    function report(){
      const r=S.report,rows=[
        ["Raised the alarm before tackling a fire",r.alarmFirst>=2],
        ["Never used a move that backfired",r.backfires===0],
        ["Cordoned the spill off before cleaning it",r.cordonFirst===1],
        ["Isolated the power before using CO₂",r.isolateFirst===1],
        ["Worked out the 3-4-5 gate first time",r.gate345===1],
        ["Spoke up to Frank instead of going along with it",r.frankRight===true],
        ["Fire safety check: no backfires",r.gymBackfires===0]];
      if(r.efflo!=null)rows.splice(5,0,["Treated the efflorescence the right way",r.efflo===true]);
      const ok=rows.filter(x=>x[1]).length,stars=ok===rows.length?3:ok>=rows.length-2?2:1;
      const want=Math.min(25,S.coins+stars*4),got=want&&R()&&R().gameCoins?R().gameCoins(want):0;ctx.coins();
      over.hidden=false;over.innerHTML='<div class="sr-card"><h2>Site report</h2><p class="sr-sub">The Yard · Fire Safety badge</p><div class="sr-stars">'+[0,1,2].map(k=>'<svg viewBox="0 0 24 24" class="sr-star'+(k<stars?" on":"")+'"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z"/></svg>').join("")+'</div>'+
        '<ul class="sr-why">'+rows.map(x=>'<li class="'+(x[1]?"ok":"")+'">'+esc(x[0])+'</li>').join("")+'</ul><div class="gm-end-coins">'+coinSvg()+'<b>+'+got+'</b><span>coins</span></div>'+
        '<div class="sr-btns"><button type="button" class="primary" data-o="new">Play again</button><button type="button" class="secondary" data-o="close">Done</button></div></div>';
      over.querySelector('[data-o="new"]').onclick=()=>{over.hidden=true;over.innerHTML="";begin(fresh())};
      over.querySelector('[data-o="close"]').onclick=()=>ctx.close();
    }

    /* ---------- The Site Handbook ---------- */
    let bookFrom="world";
    function openBook(){
      if(!S||mode==="book"||mode==="title")return;bookFrom=mode;setMode("book");
      const card=(o,on,extra)=>'<div class="eq-card'+(on?"":" locked")+'">'+(on?'<div><strong>'+esc(o.name)+(o.type?' · '+esc(o.type):"")+'</strong><p>'+esc(o.info||o.what)+'</p>'+(extra||"")+'</div>':'<div><strong>???</strong><p>Not found yet.</p></div>')+'</div>';
      const skills=PARTY.map(s=>{const k=SKILLS[s],on=S.skills.includes(s);return card(k,on,on?'<ul class="eq-mv">'+k.moves.map(m=>'<li>'+(S.moves.includes(m)?'<b>'+esc(MOVE[m].name)+'</b> '+esc(MOVE[m].info):'<b>???</b>')+'</li>').join("")+'</ul>':"")}).join("");
      const foes=["blaze","slick","efflo","sparky","frank","fuel","chip","card"].map(k=>{const f=FOES[k],on=S.book[k];return card(f,on,on?'<p class="eq-eff">'+Object.keys(f.eff).filter(m=>S.book[m]).map(m=>'<span class="e'+f.eff[m]+'">'+esc(MOVE[m].name)+'</span>').join("")+'</p>':"")}).join("");
      const rules=Object.keys(RULES).map(k=>card(RULES[k],S.book[k])).join("");
      over.hidden=false;over.innerHTML='<div class="eq-book"><header><strong>Site Handbook</strong><button type="button" class="eq-close">Close</button></header><div class="eq-book-body">'+
        '<h3>Evia’s skills</h3>'+skills+'<h3>Encounters</h3>'+foes+'<p class="eq-key"><span class="e3">Super effective</span><span class="e2">Effective</span><span class="e1">Not very effective</span><span class="e-1">Backfires</span></p><h3>Rules and know-how</h3>'+rules+'</div></div>';
      over.querySelector(".eq-close").onclick=()=>{over.hidden=true;over.innerHTML="";setMode(bookFrom)};
    }
    $(".eq-book-btn").onclick=()=>{if(mode==="world"&&!queue.length)openBook();else if(mode==="battle")openBook()};

    /* ---------- Title ---------- */
    function title(){
      setMode("title");const s=load();const cont=s&&s.f&&s.f.started&&!s.f.badge;
      over.hidden=false;over.innerHTML='<div class="sr-card"><button type="button" class="sr-x sr-cx" aria-label="Close">×</button><h2>Evia’s Site Quest</h2><p>Demo: The Yard. Build up Evia’s six skills, face fires, spills, defects and a pushy foreman, and fill your Site Handbook.</p>'+
        '<div class="sr-btns">'+(cont?'<button type="button" class="primary" data-t="cont">Continue</button>':"")+'<button type="button" class="'+(cont?"secondary":"primary")+'" data-t="new">New game</button></div><p class="eq-how">Tap to move. Tap people and things to talk to them or use them.</p></div>';
      over.querySelector(".sr-cx").onclick=()=>ctx.close();
      const c=over.querySelector('[data-t="cont"]');if(c)c.onclick=()=>{over.hidden=true;over.innerHTML="";begin(s)};
      over.querySelector('[data-t="new"]').onclick=()=>{over.hidden=true;over.innerHTML="";begin(fresh())};
    }
    $(".eq-x").onclick=()=>{persist();ctx.close()};
    ctx.stops.push(()=>{persist();cancelAnimationFrame(raf);ro.disconnect()});

    /* ---------- Drawing ---------- */
    const rr=(x,y,w,h,r)=>{g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else g.rect(x,y,w,h)};
    function tile(x,y,c){
      const X=x*T,Y=y*T,floor={".":"#e6dfd1",g:"#cfe0bf","=":"#cde6d1"}[c]||"#e6dfd1";g.fillStyle=floor;g.fillRect(X,Y,T+.3,T+.3);
      if(c==="."&&(x*7+y*3)%4===0){g.fillStyle="#d6cdbb";g.fillRect(X+4,Y+6,1.5,1.5);g.fillRect(X+11,Y+11,1.5,1.5)}
      if(c==="g"&&(x+y)%2){g.fillStyle="#bfd4ad";g.fillRect(X+3,Y+4,1.5,3);g.fillRect(X+10,Y+9,1.5,3)}
      if(c==="="){g.fillStyle="#fff";const up=(map[y-1]||[])[x],dn=(map[y+1]||[])[x];if(up!=="=")g.fillRect(X,Y,T,1.2);if(dn!=="=")g.fillRect(X,Y+T-1.2,T,1.2)}
    }
    function block(x,y,c){
      const X=x*T,Y=y*T;
      if(c==="x"){g.fillStyle="#e6dfd1";g.fillRect(X,Y,T+.3,T+.3);g.strokeStyle="#98a3b0";g.lineWidth=.8;g.beginPath();for(let k=2;k<T;k+=3){g.moveTo(X+k,Y-4);g.lineTo(X+k,Y+T-2)}g.stroke();g.fillStyle="#8d99a8";g.fillRect(X,Y-4,T,1.4);g.fillRect(X,Y+T-3,T,1.4);return}
      if(c==="G"||c==="L"){g.fillStyle="#e6dfd1";g.fillRect(X,Y,T,T);g.fillStyle=c==="G"?"#f59e0b":"#dc2626";rr(X+1,Y-3,T-2,T+1,2);g.fill();g.fillStyle="#fff";g.font="700 5px system-ui,sans-serif";g.textAlign="center";g.fillText(c==="G"?"3-4-5":"LOCK",X+8,Y+6);return}
      const col={"#":["#8f9bab","#6f7b8a"],O:["#d4dbe3","#aab4bf"],S:["#6f8a78","#56705f"],E:["#9aa3ad","#6b7684"],P:["#c79b62","#9c7338"],N:["#f5b800","#c79200"],T:["#e2e8f0","#b8c2cd"],b:["#b8674b","#8e4d37"]}[c]||["#8f9bab","#6f7b8a"];
      const h=c==="P"||c==="b"||c==="N"?4:6;g.fillStyle=col[1];g.fillRect(X,Y+T-h,T+.3,h);g.fillStyle=col[0];g.fillRect(X,Y-h,T+.3,T);
      if(c==="b"){g.strokeStyle="rgba(255,255,255,.45)";g.lineWidth=.6;g.beginPath();for(let k=0;k<T;k+=4){g.moveTo(X,Y-h+k);g.lineTo(X+T,Y-h+k)}g.stroke();
        if(!S.beaten.efflo){g.fillStyle="rgba(255,255,255,.75)";for(let k=0;k<5;k++)g.fillRect(X+2+((k*5+y*3)%12),Y-h+2+((k*7)%10),2.5,1.5)}}
      if(c==="O"&&x===4&&y===4){g.fillStyle="#8b6b4a";g.fillRect(X+4,Y-2,8,8)}
      if(c==="T"&&x===5&&y===15){g.fillStyle="#8b6b4a";g.fillRect(X+4,Y-2,8,8)}
    }
    function label(txt,x,y,col){g.fillStyle=col||"#475569";g.font="700 5px system-ui,sans-serif";g.textAlign="center";g.fillText(txt,x,y)}
    function person(x,y,hat,t,s){
      s=s||1;g.save();g.translate(x+8,y+8);g.scale(s,s);const b=Math.sin(t*3)*.4;
      g.fillStyle="rgba(15,23,42,.14)";g.beginPath();g.ellipse(0,6,5,1.6,0,0,Math.PI*2);g.fill();
      g.fillStyle="#3f4a57";g.fillRect(-3,2,2.4,4);g.fillRect(.6,2,2.4,4);g.fillStyle="#fb8c1a";rr(-4,-4+b,8,7,2);g.fill();g.fillStyle="#e8ecef";g.fillRect(-4,b,8,1);
      g.fillStyle="#f1c8a5";g.beginPath();g.arc(0,-6.5+b,3,0,Math.PI*2);g.fill();g.fillStyle=hat;g.beginPath();g.arc(0,-7.5+b,3.4,Math.PI,0);g.fill();g.fillRect(-4.4,-7.8+b,8.8,1.2);
      g.restore();
    }
    function foeSprite(id,x,y,s,t){
      const f=FOES[id];g.save();g.translate(x,y);g.scale(s,s);
      if(id==="slick"){g.fillStyle="#1f2937";g.beginPath();g.ellipse(0,3,8,3.4,0,0,Math.PI*2);g.fill();g.fillStyle="rgba(148,163,184,.5)";g.beginPath();g.ellipse(-2,2,3,1,0,0,Math.PI*2);g.fill();
        g.fillStyle="#fff";g.beginPath();g.arc(-2.4,1,1.5,0,Math.PI*2);g.arc(2.4,1,1.5,0,Math.PI*2);g.fill();g.fillStyle="#111";g.beginPath();g.arc(-2.2,1.2,.7,0,Math.PI*2);g.arc(2.6,1.2,.7,0,Math.PI*2);g.fill()}
      else if(id==="efflo"){g.fillStyle="#b8674b";g.fillRect(-8,-4,16,10);g.strokeStyle="rgba(255,255,255,.5)";g.lineWidth=.5;g.beginPath();g.moveTo(-8,1);g.lineTo(8,1);g.moveTo(0,-4);g.lineTo(0,1);g.moveTo(-4,1);g.lineTo(-4,6);g.moveTo(4,1);g.lineTo(4,6);g.stroke();
        const w=Math.sin(t*4)*.4;g.fillStyle="#f8fafc";g.beginPath();for(let i=0;i<14;i++){const a=i/14*Math.PI*2,r=i%2?4:5.5+w;g.lineTo(Math.cos(a)*r,Math.sin(a)*r*0.8-1)}g.closePath();g.fill();
        g.fillStyle="#111";g.beginPath();g.arc(-1.6,-1.4,.7,0,Math.PI*2);g.arc(1.6,-1.4,.7,0,Math.PI*2);g.fill()}
      else if(id==="sparky"){const w=Math.sin(t*20)*.6;g.fillStyle="#fde047";g.beginPath();for(let i=0;i<10;i++){const a=i/10*Math.PI*2,r=i%2?4:7+w;g.lineTo(Math.cos(a)*r,Math.sin(a)*r-1)}g.closePath();g.fill();g.strokeStyle="#ca8a04";g.lineWidth=.6;g.stroke();
        g.fillStyle="#111";g.fillRect(-2.8,-2.4,1.2,1.8);g.fillRect(1.6,-2.4,1.2,1.8)}
      else{const w=Math.sin(t*9);g.fillStyle=f.col;g.beginPath();g.moveTo(-6,5);g.quadraticCurveTo(-7,-2,-2,-6-w);g.quadraticCurveTo(-1,-2,0,-9+w);g.quadraticCurveTo(2,-3,3,-6-w*.6);g.quadraticCurveTo(7,-1,6,5);g.closePath();g.fill();
        g.fillStyle="#fde047";g.beginPath();g.moveTo(-3.6,5);g.quadraticCurveTo(-4,0,-.6,-3-w*.6);g.quadraticCurveTo(3,0,3.6,5);g.closePath();g.fill();
        g.fillStyle="#111";g.beginPath();g.arc(-1.6,1.4,.8,0,Math.PI*2);g.arc(1.6,1.4,.8,0,Math.PI*2);g.fill()}
      g.restore();
    }
    function evia(x,y,face,s,back){
      g.save();g.translate(x,y);g.scale(s,s);
      g.fillStyle="rgba(15,23,42,.14)";g.beginPath();g.ellipse(0,6.5,5,1.6,0,0,Math.PI*2);g.fill();
      const on=S&&S.f.inducted;if(on){g.fillStyle="#2f343a";g.fillRect(-4,5,3,2);g.fillRect(1,5,3,2)}
      const b=new Path2D();b.arc(0,0,6,0,Math.PI*2);g.fillStyle="#fff";g.fill(b);
      if(on){g.save();g.clip(b);g.fillStyle="#fb8c1a";g.fillRect(-7,2,14,5);g.fillStyle="#e8ecef";g.fillRect(-7,3.2,14,.9);g.fillRect(-7,5,14,.9);g.restore()}
      g.strokeStyle=accent;g.lineWidth=1.3;g.stroke(b);
      if(!back&&face!=="u"){const ex=face==="l"?-1.4:face==="r"?1.4:0;g.strokeStyle=accent;g.lineWidth=1;g.lineCap="round";g.beginPath();g.moveTo(-1.8+ex,-2);g.lineTo(-1.8+ex,.2);g.moveTo(1.8+ex,-2);g.lineTo(1.8+ex,.2);g.stroke()}
      if(on){g.fillStyle="#f5b800";g.beginPath();g.arc(0,-4,4.6,Math.PI,0);g.closePath();g.fill();g.fillStyle="#e2a700";g.fillRect(-6,-4.4,12,1.2)}
      g.restore();
    }
    function drawWorld(t){
      const vw=W/scale,vh=H/scale,mw=MW*T,mh=MH*T;
      const tx=p.x+8-vw/2,ty=p.y+8-vh/2;camX=mw+16<vw?(mw-vw)/2:Math.max(-8,Math.min(mw-vw+8,tx));camY=mh+16<vh?(mh-vh)/2:Math.max(-24,Math.min(mh-vh+8,ty));
      g.save();g.scale(scale,scale);g.translate(-camX,-camY);
      const x0=Math.max(0,Math.floor(camX/T)-1),x1=Math.min(MW-1,Math.ceil((camX+vw)/T)+1),y0=Math.max(0,Math.floor(camY/T)-1),y1=Math.min(MH-1,Math.ceil((camY+vh)/T)+1);
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const c=map[y][x];tile(x,y,SOLID.has(c)?".":c)}
      if(route.length){g.fillStyle="rgba(15,23,42,.12)";for(const [x,y] of route){g.beginPath();g.arc(x*T+8,y*T+8,1.6,0,Math.PI*2);g.fill()}}
      if(tapFx&&tapFx.t>0){g.strokeStyle="rgba(15,23,42,"+(tapFx.t/30)+")";g.lineWidth=1;g.beginPath();g.arc(tapFx.x*T+8,tapFx.y*T+8,8-tapFx.t/4,0,Math.PI*2);g.stroke();tapFx.t--}
      const list=[];
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const c=map[y][x];if(SOLID.has(c))list.push([y*T+T,()=>block(x,y,c)])}
      for(const e of ents)list.push([e.ty*T+T+.5,()=>drawEnt(e,t)]);
      list.push([p.y+T+.6,()=>evia(p.x+8,p.y+8,p.face,1)]);
      list.sort((a,b)=>a[0]-b[0]).forEach(o=>o[1]());
      label("SITE OFFICE",4.5*T,2*T-1);label("STORES",16*T,2*T-1,"#fff");label("TRAINING CABIN",6*T,14*T-1);label("ELECTRICAL",18.5*T,14*T-1,"#fff");
      for(const e of ents){if(e.kind==="npc"&&(e.id==="sam"&&!S.f.inducted||e.id==="jas"&&!S.skills.includes("tools")||e.id==="dan"&&!S.skills.includes("mat")||e.id==="pat"&&!S.f.pat||e.id==="mo"&&S.beaten.blaze&&!S.f.gate)){const bob=Math.sin(t*4)*1.2;g.fillStyle=accent;rr(e.tx*T+5,e.ty*T-12+bob,6,7,2);g.fill();g.fillStyle="#1f2937";g.font="800 6px system-ui,sans-serif";g.textAlign="center";g.fillText("!",e.tx*T+8,e.ty*T-6.5+bob)}}
      g.restore();
    }
    function drawEnt(e,t){
      const X=e.tx*T,Y=e.ty*T;
      if(e.kind==="npc")return person(X,Y,e.hat,t+e.tx);
      if(e.kind==="coin"){const s=Math.abs(Math.cos(t*3+e.tx));g.fillStyle="#f5b800";g.strokeStyle="#b07f00";g.lineWidth=.6;g.beginPath();g.ellipse(X+8,Y+8,3.4*Math.max(.3,s),3.4,0,0,Math.PI*2);g.fill();g.stroke();return}
      if(e.kind==="foe"){g.fillStyle="rgba(15,23,42,.15)";g.beginPath();g.ellipse(X+8,Y+14,6,1.8,0,0,Math.PI*2);g.fill();
        if(e.foe==="blaze"){g.fillStyle="#6b7280";rr(X+3,Y+7,10,8,1.5);g.fill()}
        if(e.foe==="sparky"){g.fillStyle="#9aa3ad";rr(X+2,Y+1,12,13,1.5);g.fill()}
        foeSprite(e.foe,X+8,Y+(e.foe==="slick"?10:6),e.foe==="slick"||e.foe==="efflo"?.9:.8,t);return}
      if(e.kind==="fp"){g.fillStyle="#dc2626";rr(X+3,Y+1,10,4,1);g.fill();g.fillStyle="#d62828";rr(X+4,Y+6,3,8,1);g.fill();rr(X+9,Y+6,3,8,1);g.fill();g.fillStyle="#1f2328";g.fillRect(X+9,Y+8,3,2);return}
    }
    function drawBattle(t){
      const f=B.foe,boxH=box.getBoundingClientRect().height||H*.3,vw=W/scale,vh=(H-boxH)/scale;
      g.save();g.scale(scale,scale);
      const sky=g.createLinearGradient(0,0,0,vh);sky.addColorStop(0,"#eef2f6");sky.addColorStop(1,"#e2dccf");g.fillStyle=sky;g.fillRect(0,0,vw,H/scale);
      const ex=vw*.7,ey=vh*.38,mx=vw*.3,my=vh*.8;
      g.fillStyle="#cdc4b2";g.beginPath();g.ellipse(ex,ey+12,vw*.22,5,0,0,Math.PI*2);g.fill();g.beginPath();g.ellipse(mx,my+8,vw*.22,5,0,0,Math.PI*2);g.fill();
      if(B.hp>0){const sh=B.hitT>0?Math.sin(B.hitT)*2:0;g.globalAlpha=B.hitT>0&&Math.floor(B.hitT/3)%2?.5:1;
        if(f.kind==="person")person(ex-8+sh,ey-14,"#1f2937",t,2.4);else foeSprite(B.id,ex+sh,ey,2.6,t);g.globalAlpha=1}
      const sh2=B.shake>0?Math.sin(B.shake*1.3)*2:0;evia(mx+sh2,my-6,"r",2.4,true);
      if(B.flash>0){g.fillStyle="rgba(220,38,38,"+(B.flash/40)+")";g.fillRect(0,0,vw,vh);B.flash--}
      const bar=(x,y,w,name,sub,v,col,right)=>{g.fillStyle="rgba(255,255,255,.95)";rr(x,y,w,21,4);g.fill();g.strokeStyle="rgba(15,23,42,.14)";g.lineWidth=.6;g.stroke();
        g.fillStyle="#1f2937";g.font="800 6.5px system-ui,sans-serif";g.textAlign="left";g.fillText(name,x+5,y+8);g.fillStyle="#6b7280";g.font="600 4.8px system-ui,sans-serif";g.fillText(sub,x+5,y+14);
        g.fillStyle="#e5e7eb";rr(x+5,y+16,w-10,2.6,1.3);g.fill();g.fillStyle=v>50?col:v>25?"#f59e0b":"#dc2626";rr(x+5,y+16,Math.max(0,(w-10)*v/100),2.6,1.3);g.fill()};
      const bw=Math.min(100,vw*.52);
      bar(6,22,bw,B.gym&&!B.known?"??? fire":f.name,B.gym&&!B.known?"INSPECT for clues":f.type,B.hp,"#f97316");
      bar(vw-bw-6,vh-30,bw,"Evia · Lv "+S.lv,SKILLS[S.active].name+" skill",Math.max(0,B.me),"#16a34a");
      g.restore();
      if(B.hitT>0)B.hitT--;if(B.shake>0)B.shake--;
    }
    function frame(now){
      raf=requestAnimationFrame(frame);
      const dt=Math.min(2,(now-(last||now))/16.67);last=now;const t=now/1000;
      g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle="#eef1f4";g.fillRect(0,0,W,H);
      if(!S)return;
      if(mode==="world")step(dt);
      if(B)drawBattle(t);else drawWorld(t);
    }
    ctx.o.eqState=()=>({S,p,mode,B,ents,queue,route,camX,camY,scale});   /* for the tests */
    title();raf=requestAnimationFrame(frame);
  }

  G.register({id:"game-quest",key:"quest",label:"Evia’s Site Quest",rarity:"epic",about:"A Pokémon-style site adventure: build up Evia’s six skills and face fires, spills, defects and pushy foremen."},run,
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>');
})();
