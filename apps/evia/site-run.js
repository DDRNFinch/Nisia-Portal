/* PARKED: not loaded by index.html or cached by sw-v16.js. To bring it back, add it to data-app-scripts and
   APP_SHELL (and games/siterun.jpg). */
/* Evia's Site Run: a platform game, laid out like a handheld console. The game is at the top, a text panel in the
   middle (messages, conversations, questions and Evia's tool belt) and the controller at the bottom: ◀ ▶ to move,
   A to jump, B to use. In landscape the controls sit either side of the game.
   The game comes first: site safety is how the world works. Sam's induction gets Evia her pass and PPE; dust, noise
   and sparks hurt without the right PPE from the stores; the dumper can't see anyone behind it when it reverses;
   tools come from racks into her belt (two slots) and clear walls, timber, wonky boards and high walls; fires need
   the alarm raising and the right extinguisher (the wrong one doesn't work, or makes it worse); hot works need a
   permit; a red-tagged scaffold can't be climbed until the scaffolder signs it off; the Big Mixer is stopped at its
   lever, then isolated and tagged. Course questions are boxes to jump into, and so are drawing questions (hatching
   and safety signs, drawn on the boxes). A site report at the end of each level is the assessment.
   Unlocked in Rewards (epic); coins go through the game's daily cap in rewards.js. */
(function(){
  const G=window.eviaGames;if(!G||!G.register)return;
  const {esc,buzz,reduced}=G,R=()=>window.eviaRewards;
  const coinSvg=()=>R()&&R().coin?R().coin():"";
  const KEY="evia7-siterun";
  const GY=300,PW=28,PH=34;
  const GRAV=.9,JUMP=-13.5,RUN=3.8;
  const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

  /* Icons (24-unit box), used on the canvas (Path2D) and in the panel (SVG). */
  const ICON={
    hat:{d:"M4 15A8 8 0 0 1 20 15ZM11 7.2H13V15H11ZM2 15H22V17.8H2Z",c:"#f5b800",name:"Hard hat"},
    mask:{d:"M4.5 9.5Q12 5.5 19.5 9.5L18.5 15Q12 20.5 5.5 15ZM1.5 9H4.8V10.6H1.5ZM19.2 9H22.5V10.6H19.2Z",c:"#9aa6b2",name:"Dust mask"},
    vis:{d:"M7 3H10L12 7L14 3H17L20.5 8L18.5 10V21H5.5V10L3.5 8ZM5.5 13H18.5V15H5.5ZM5.5 17H18.5V19H5.5Z",c:"#fb8c1a",eo:1,name:"Hi-vis"},
    ears:{d:"M4 13A8 8 0 0 1 20 13H18A6 6 0 0 0 6 13ZM2.5 11.5H8V19.5H2.5ZM16 11.5H21.5V19.5H16Z",c:"#3f4a57",name:"Ear defenders"},
    boots:{d:"M6 3H12.5V12.5L19 14.5Q21.5 15.4 21.5 18V19.5H6ZM6 20.5H21.5V22H6Z",c:"#3a3f46",name:"Safety boots"},
    glasses:{d:"M1.5 8.5H22.5V10.5H21.6L20.6 14.6Q20.1 16.6 17.8 16.6H15.4Q13.2 16.6 12.9 14.4L12.6 12.2H11.4L11.1 14.4Q10.8 16.6 8.6 16.6H6.2Q3.9 16.6 3.4 14.6L2.4 10.5H1.5Z",c:"#2f7fd8",name:"Safety glasses"},
    gloves:{d:"M7 21.5V13L4.8 10.2Q4 9 5 8.2Q6 7.5 6.9 8.5L8.2 10V4.6Q8.2 3.4 9.3 3.4Q10.4 3.4 10.4 4.6V9.6H10.9V3.2Q10.9 2 12 2Q13.1 2 13.1 3.2V9.6H13.6V4Q13.6 2.8 14.7 2.8Q15.8 2.8 15.8 4V10H16.3V6Q16.3 4.8 17.4 4.8Q18.5 4.8 18.5 6V14.2Q18.5 17.6 16.8 19.2V21.5Z",c:"#2563eb",name:"Gloves"},
    bolster:{d:"M10.5 2H13.5V12L17.5 15V22H6.5V15L10.5 12Z",c:"#6b7684",name:"Bolster and club hammer"},
    ladder:{d:"M5.5 2H8.3V22H5.5ZM15.7 2H18.5V22H15.7ZM8.3 5.5H15.7V7.5H8.3ZM8.3 10.5H15.7V12.5H8.3ZM8.3 15.5H15.7V17.5H8.3Z",c:"#a8763e",name:"Ladder"},
    level:{d:"M1.5 8.5H22.5V15.5H1.5ZM9.5 10.2H14.5V13.8H9.5Z",c:"#2f7fd8",eo:1,name:"Spirit level"},
    saw:{d:"M2 18.5L17.5 5L19.2 6.8L4 21.5H2ZM17 3.2H22.5V9.8L19.8 7.4L20.8 6.4L18.4 4.3Z",c:"#6b7684",name:"Handsaw"},
    trowel:{d:"M2 22L5.5 10.5L16.5 7ZM15.5 8L20.8 2.7L22.3 4.2L17 9.5Z",c:"#6b7684",name:"Trowel"},
    tape:{d:"M3 7Q3 4 6 4H15Q18 4 18 7V15Q18 18 15 18H6Q3 18 3 15ZM8 11A2.5 2.5 0 1 0 13 11A2.5 2.5 0 1 0 8 11ZM18 14.5H23V16.5H18Z",c:"#f5b800",eo:1,name:"Tape measure"},
    aid:{d:"M3 5H21V19H3ZM10.5 8H13.5V10.5H16V13.5H13.5V16H10.5V13.5H8V10.5H10.5Z",c:"#16a34a",eo:1,name:"First aid kit"},
    kit:{d:"M12 2L20 5V11Q20 18 12 22Q4 18 4 11V5ZM10.6 7H13.4V10.6H17V13.4H13.4V17H10.6V13.4H7V10.6H10.6Z",c:"#16a34a",eo:1,name:"Full PPE kit"}
  };
  const EXT={water:{c:"#d62828",name:"Water extinguisher"},foam:{c:"#f1dfae",name:"Foam extinguisher"},co2:{c:"#1f2328",name:"CO₂ extinguisher"},powder:{c:"#1d5fbf",name:"Dry powder extinguisher"},wet:{c:"#f5d000",name:"Wet chemical extinguisher"}};
  const PPE=["hat","vis","boots","mask","ears","glasses","gloves"];
  const nameOf=k=>(ICON[k]||EXT[k]).name;
  const P2D={};const path=k=>P2D[k]||(P2D[k]=new Path2D(ICON[k].d));
  const svg=k=>EXT[k]?'<svg viewBox="4 2.5 16 21" aria-hidden="true"><path d="M9 3.5h4v2H9z" fill="#3f4a57"/><path d="M13 4.5l4.5-1.5v2.2L13 6z" fill="#3f4a57"/><rect x="7" y="5.5" width="8" height="17" rx="3" fill="#d62828"/><rect x="7" y="10" width="8" height="5" fill="'+EXT[k].c+'"/></svg>'
    :'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="'+ICON[k].c+'" d="'+ICON[k].d+'"'+(ICON[k].eo?' fill-rule="evenodd"':"")+'/></svg>';

  /* Hazard areas: the PPE the blue sign asks for, and what happens without it. */
  const ZONE={
    fall:{need:"hat",hurt:"A brick glanced off you! Hard hats must be worn here."},
    dust:{need:"mask",hurt:"*Cough* Silica dust! The blue sign says a dust mask must be worn."},
    noise:{need:"ears",hurt:"Too loud! The blue sign says ear protection must be worn."},
    sparks:{need:"glasses",hurt:"Sparks in your eyes! The blue sign says eye protection must be worn."}
  };
  /* Obstacles: the tool that clears each, and what the wrong ones say. */
  const OBS={wall:{need:"bolster",ok:"The bolster and club hammer break through the old wall."},high:{need:"ladder",ok:"Ladder up, set at 1 in 4 and footed. Walk into it to climb."},
    board:{need:"level",ok:"Checked with the spirit level and set right. Safe to cross."},timber:{need:"saw",ok:"The handsaw cuts through the timber."}};
  const WRONG={wall:"won’t get through brickwork.",high:"won’t get you up there.",board:"won’t tell you if it’s level.",timber:"won’t cut timber."};
  /* Fires: which extinguishers work, and what the others do. */
  const FIRE={
    timber:{ok:["water","foam"],say:"Water (or foam) is right for wood, paper and cardboard.",bad:{co2:"The CO₂ knocks the flames down, but the timber keeps reigniting."}},
    electric:{ok:["co2"],say:"CO₂ is right for electrical fires.",bad:{water:"Water on electrics! That could kill. CO₂ is for electrical fires.",foam:"Foam conducts electricity. CO₂ is for electrical fires."},hurtBad:1},
    fuel:{ok:["foam"],say:"Foam smothers burning petrol.",bad:{water:"Water spreads burning petrol! Foam smothers it.",wet:"Wet chemical is for cooking oil. Foam is for petrol."},hurtBad:1}
  };
  /* Drawing boxes: jump into the box that shows the thing named in the panel. */
  const SYMS=[
    {q:"Jump into the box that shows brickwork hatching.",a:"brick",opts:["brick","concrete","insulation"],why:"Brickwork is diagonal lines."},
    {q:"Jump into the box that shows concrete hatching.",a:"concrete",opts:["concrete","brick","timber"],why:"Concrete is dots and small stones."},
    {q:"Jump into the box that shows insulation.",a:"insulation",opts:["insulation","timber","brick"],why:"Insulation is a looping line."},
    {q:"Jump into the box that shows a prohibition sign (you must not).",a:"prohibit",opts:["prohibit","mandatory","warning"],why:"Red circle with a line through it."},
    {q:"Jump into the box that shows a mandatory sign (you must).",a:"mandatory",opts:["mandatory","warning","safe"],why:"Blue circle."},
    {q:"Jump into the box that shows a warning sign (danger).",a:"warning",opts:["warning","prohibit","safe"],why:"Yellow triangle."},
    {q:"Jump into the box that shows a safe condition sign (first aid, way out).",a:"safe",opts:["safe","mandatory","prohibit"],why:"Green square or rectangle."}
  ];

  /* ---------- Levels ----------
     Ops run along the site: run, gap, zone, rack (items on a shelf), firepoint (alarm and extinguishers), fire, wall,
     high, board, timber, npc, permit (gate), scaffold, q (course question boxes), sym (drawing boxes), office (the
     induction), boss, flag. plat, crate, cp (checkpoint), aid and kit are placed without moving on. */
  const LEVELS=[
    {name:"First day on site",about:"Induction, the stores, a wall to break through and your first fire.",start:[],ops:[
      ["office"],["run",200,4],["zone","fall",340],["run",160,3],["npc","jas"],["zone","dust",340],["run",140],["cp"],["q"],
      ["rack",["trowel","bolster","tape"]],["run",100],["wall"],["run",180,3],["gap",90],["run",140],["cp"],["firepoint",["water","co2","foam"]],["fire","timber"],["run",160,3],
      ["aid",60],["sym"],["cp"],["run",140,4],["flag"]]},
    {name:"Cutting and mixing",about:"Noise, a wonky board, timber in the way, a permit for hot works and an electrical fire.",start:["hat","vis","boots"],ops:[
      ["run",240,4],["rack",["ears","gloves","glasses"]],["run",100],["zone","noise",340],["run",160,3],["gap",100],["plat",20,90,140,3],["run",200],
      ["cp"],["q"],["rack",["saw","level","bolster"]],["run",80],["board"],["timber"],["run",180,3],["npc","sam"],["permit"],["zone","sparks",300],
      ["cp"],["firepoint",["water","foam","co2"],1],["fire","electric"],["run",160],["aid",50],["sym"],["cp"],["q"],["run",120,3],["flag"]]},
    {name:"The busy site",about:"The dumper, a ladder, a red-tagged scaffold, the full PPE kit and a fuel fire.",start:["hat","vis","boots"],ops:[
      ["run",260,4],["zone","plant",520],["run",120],["cp"],["q"],["rack",["level","ladder","trowel"]],["run",60],["high"],["run",180,3],
      ["npc","scaff"],["scaffold"],["run",160,3],["rack",["mask","gloves","ears"]],["plat",40,90,120],["kit",90,122],["run",320],["zone","dust",260],["zone","noise",260],["run",120],
      ["cp"],["firepoint",["water","wet","foam"]],["fire","fuel"],["run",140],["sym"],["aid",40],["cp"],["q"],["run",120],["flag"]]},
    {name:"Boss: the Big Mixer",about:"Dodge the mortar, pull the lever when it stalls, then isolate and tag it.",start:["hat","vis","boots"],boss:true,ops:[
      ["run",320,5],["aid",140],["run",60],["boss"]]}
  ];

  /* ---------- Questions from the learner's Teach me course ---------- */
  function questions(){
    const T=window.eviaTeach,c=typeof course!=="undefined"?course:"",units=(T&&T.COURSES&&T.COURSES[c])||[],out=[];
    const walk=(o,u,d)=>{
      if(!o||typeof o!=="object"||d>8)return;
      if(Array.isArray(o)){o.forEach(x=>walk(x,u,d+1));return}
      if((o.t==="choice"||o.t==="tf")&&typeof o.q==="string"&&o.q.length<=140){
        if(o.t==="tf"&&typeof o.a==="boolean")out.push({u,q:o.q,opts:["True","False"],a:o.a?0:1,why:o.why||"",tf:1});
        else if(o.t==="choice"&&Array.isArray(o.opts)&&o.opts.length>=3&&o.opts.every(x=>typeof x==="string"&&x.length<=46)){
          const a=o.a|0,wrong=shuffle(o.opts.filter((_,i)=>i!==a)).slice(0,2),opts=shuffle([o.opts[a],...wrong]);
          out.push({u,q:o.q,opts,a:opts.indexOf(o.opts[a]),why:o.why||""});
        }
        return;
      }
      Object.keys(o).forEach(k=>{if(k!=="why"&&k!=="opts")walk(o[k],u,d+1)});
    };
    units.forEach((u,i)=>walk(u,i,0));
    if(out.length<8)(G.GATES||[]).forEach(g=>out.push({u:0,q:g[0],opts:["True","False"],a:g[1]?0:1,why:g[2]||"",tf:1}));
    return out;
  }
  function deal(all,n){
    const k=LEVELS.length,max=Math.max(...all.map(q=>q.u),0)+1,lo=Math.floor(max*n/k),hi=Math.max(lo+1,Math.floor(max*(n+1)/k));
    let pool=all.filter(q=>q.u>=lo&&q.u<hi);if(pool.length<6)pool=all.slice();
    return shuffle(pool);
  }
  const decks={};
  function draw1(name,list){if(!decks[name]||!decks[name].length)decks[name]=shuffle(list);return decks[name].pop()}

  /* ---------- Saved progress (per course) ---------- */
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch(_){return {}}};
  const ckey=()=>typeof course!=="undefined"&&course?course:"any";
  const prog=()=>{const s=load()[ckey()]||{};return {open:Math.max(1,s.open|0),stars:(s.stars||[]).slice(0,LEVELS.length)}};
  function saveProg(p){const s=load();s[ckey()]=p;try{localStorage.setItem(KEY,JSON.stringify(s))}catch(_){}}

  /* ---------- Build a level ---------- */
  function build(n,qs){
    const L=LEVELS[n],w={solids:[],plats:[],coins:[],picks:[],zones:[],stations:[],ents:[],cps:[],deco:[],flag:null,boss:null,fire:null,end:0,has:{}};
    let x=0;
    const ground=len=>{w.solids.push({x,y:GY,w:len,h:1200,kind:"ground"})};
    const coinRow=(x0,len,n,y)=>{for(let i=0;i<n;i++)w.coins.push({x:x0+(len/(n+1))*(i+1),y})};
    let qi=0;const nextQ=()=>qs[qi++%qs.length];
    const ent=e=>{w.ents.push(e);return e};
    const station=(x0,kind,q)=>{
      const st={x:x0,kind,q,tries:0,done:false,blocks:[],bar:null};
      const n=q.opts.length;q.opts.forEach((o,i)=>{const bl={x:x0+(n===2?150:110)+i*84,y:GY-144,w:46,h:34,kind:"block",st,i,state:""};st.blocks.push(bl);w.solids.push(bl)});
      st.bar={x:x0+390,y:GY-300,w:22,h:300,kind:"bar",st,lift:0};w.solids.push(st.bar);w.stations.push(st);
    };
    for(const op of L.ops){
      const [t,a,b,c,d]=op;
      if(t==="run"){ground(a);if(b)coinRow(x,a,b,GY-40);x+=a}
      else if(t==="gap"){w.coins.push({x:x+a/2,y:GY-110});x+=a}
      else if(t==="plat"){w.plats.push({x:x+a,y:GY-b,w:c});if(d)coinRow(x+a,c,d,GY-b-28)}
      else if(t==="crate")w.solids.push({x:x+a,y:GY-b,w:40,h:b,kind:"crate"});
      else if(t==="cp")w.cps.push({x:x+30,on:false});
      else if(t==="aid"||t==="kit")w.picks.push({kind:t,x:x+(a==null?60:a),y:GY-30-(b||0)});
      else if(t==="office"){
        /* the site office: Sam, the three things to find on its wall, and the turnstile that needs the pass */
        ground(560);w.deco.push({kind:"office",x:x+20,w:330});w.has.induction=1;
        [["aid",80,"First aid kit: the green box with the white cross. The first aider’s name is on the notice beside it."],
         ["notice",180,"Fire action notice: raise the alarm, leave by the nearest way out and go to the assembly point."],
         ["firepoint",280,"Fire point: extinguishers and a fire alarm call point. Know where they are before you need them."]].forEach(([k,dx,text])=>
          ent({kind:"wallitem",item:k,x:x+dx,y:GY-66,label:"Look",text}));
        ent({kind:"npc",who:"Sam",hat:"#fff",x:x+410,y:GY,label:"Talk",role:"induction"});
        w.solids.push({x:x+500,y:GY-300,w:20,h:300,kind:"gate",gate:"pass",lift:0});
        x+=560;
      }
      else if(t==="npc"){
        ground(240);
        const who={jas:["Jas","#2f6fcf","mask"],sam:["Sam","#fff","permit"],scaff:["Rob","#fb8c1a","scaff"]}[a];
        if(a==="jas")w.deco.push({kind:"stores",x:x+20,w:170});
        if(a==="sam")w.deco.push({kind:"cabin",x:x+20,w:150,label:"SITE OFFICE"});
        ent({kind:"npc",who:who[0],hat:who[1],x:x+180,y:GY,label:"Talk",role:who[2]});x+=240;
      }
      else if(t==="zone"){
        ground(b);w.zones.push({kind:a,x,w:b,t:0,brick:0,meter:0,dumper:a==="plant"?{x:x+b-80,dir:-1,t:0}:null});
        if(a==="plant")w.has.dumper=1;else w.has["zone-"+a]=1;
        x+=b;
      }
      else if(t==="rack"){ground(300);w.deco.push({kind:"rack",x:x+40,w:220});a.forEach((k,i)=>ent({kind:"item",item:k,x:x+80+i*70,y:GY-44,label:"Take"}));x+=300}
      else if(t==="firepoint"){
        ground(320);w.deco.push({kind:"fp",x:x+60,w:230});w.has.fire=1;
        ent({kind:"callpoint",x:x+70,y:GY-60,label:"Press"});
        if(b)ent({kind:"isolator",x:x+285,y:GY-60,label:"Switch off"});
        a.forEach((k,i)=>ent({kind:"item",item:k,x:x+140+i*46,y:GY-34,label:"Take"}));
        x+=320;
      }
      else if(t==="fire"){ground(260);w.fire={x:x+120,y:GY-400,w:60,h:400,kind:"fire",fire:a,hp:100,t:0,obs:"fire"};w.solids.push(w.fire);x+=260}
      else if(t==="wall"){ground(260);w.solids.push({x:x+120,y:GY-170,w:36,h:170,kind:"wall",obs:"wall",brk:0});w.has.tool=1;x+=260}
      else if(t==="high"){ground(340);w.solids.push({x:x+130,y:GY-200,w:70,h:200,kind:"block-wall",obs:"high",placed:false});w.has.tool=1;x+=340}
      else if(t==="timber"){ground(260);w.solids.push({x:x+120,y:GY-150,w:26,h:150,kind:"timber",obs:"timber",cut:0});w.has.tool=1;x+=260}
      else if(t==="board"){ground(120);const bd={x:x+120,y:GY,w:200,board:1,fixed:false};w.plats.push(bd);w.solids.push({x:x+116,y:GY-400,w:4,h:400,kind:"stop",obs:"board",bd});w.has.tool=1;x+=320;ground(160);x+=160}
      else if(t==="permit"){ground(300);ent({kind:"npc",who:"Dee",hat:"#1f2937",x:x+70,y:GY,label:"Talk",role:"gate"});w.solids.push({x:x+140,y:GY-300,w:20,h:300,kind:"gate",gate:"permit",lift:0});w.has.permit=1;x+=300}
      else if(t==="scaffold"){ground(360);w.solids.push({x:x+120,y:GY-190,w:130,h:190,kind:"scaffold",obs:"scaffold",green:false});w.has.scaffold=1;x+=360}
      else if(t==="q"){ground(440);station(x,"q",nextQ());x+=440}
      else if(t==="sym"){ground(440);const S=draw1("sym",SYMS),opts=shuffle(S.opts);station(x,"sym",{q:S.q,opts,a:opts.indexOf(S.a),why:S.why,pics:1});x+=440}
      else if(t==="boss"){
        ground(820);const B={x,hp:3,hit:0,t:0,blobs:[],splats:[],on:false,dead:false,tagged:false,stall:0,volley:120,shots:0};
        B.mixer={x:x+620,y:GY-104,w:110,h:104,kind:"mixer"};w.solids.push(B.mixer);
        B.wall={x:x-20,y:GY-400,w:20,h:400,kind:"arena",gone:true};w.solids.push(B.wall);
        w.boss=B;w.has.boss=1;x+=820;
      }
      else if(t==="flag"){ground(300);w.flag={x:x+140};x+=300}
    }
    w.end=x;w.total=w.coins.length;return w;
  }

  /* ---------- The game ---------- */
  function run(ctx){
    ctx.body.innerHTML='<div class="sr">'+
      '<div class="sr-screen"><canvas aria-label="Evia’s Site Run"></canvas><div class="sr-hud"><div class="sr-hearts" aria-label="Hearts"></div><b class="sr-name"></b><span class="sr-coins">'+coinSvg()+'<b>0</b></span><button type="button" class="sr-x" aria-label="Close">×</button></div></div>'+
      '<div class="sr-panel"><div class="sr-msg" role="status" aria-live="polite"></div><div class="sr-kit"></div></div>'+
      '<div class="sr-pad sr-dpad"><button type="button" data-k="l" aria-label="Left"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><button type="button" data-k="r" aria-label="Right"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button></div>'+
      '<div class="sr-pad sr-ab"><button type="button" data-k="b" class="sr-b" aria-label="Use"><b>B</b><span>Use</span></button><button type="button" data-k="j" class="sr-a" aria-label="Jump"><b>A</b><span>Jump</span></button></div>'+
      '<div class="sr-menu"></div></div>';
    const $=s=>ctx.body.querySelector(s);
    const wrap=$(".sr"),scr=$(".sr-screen"),cv=$("canvas"),g=cv.getContext("2d"),menu=$(".sr-menu"),msgEl=$(".sr-msg"),kitEl=$(".sr-kit"),bLab=$(".sr-b span");
    const accent=getComputedStyle(document.documentElement).getPropertyValue("--yellow").trim()||"#f5c400";
    let W=0,H=0,dpr=1,scale=1,camX=0,camY=0,land=false;
    let state="menu",lv=0,w=null,p=null,S=null,raf=0,last=0;
    const size=()=>{const o=wrap.getBoundingClientRect();land=o.width>o.height*1.1;wrap.classList.toggle("land",land);
      const r=scr.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);W=r.width;H=r.height;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+"px";cv.style.height=H+"px";scale=H/290};
    const ro=new ResizeObserver(size);ro.observe(wrap);ro.observe(scr);size();

    /* ---------- Input: the controller ---------- */
    const keys={l:0,r:0,j:0,b:0};let jb=0;
    const press=k=>{
      if(state==="talk"&&(k==="j"||k==="b")){keys[k]=1;return nextTalk()}
      if(k==="j"){if(!keys.j)jb=8;keys.j=1}else if(k==="b"){if(!keys.b){keys.b=1;useB()}}else keys[k]=1};
    const release=k=>{keys[k]=0};
    wrap.querySelectorAll(".sr-pad [data-k]").forEach(b=>{
      const k=b.dataset.k;
      b.addEventListener("pointerdown",e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(_){}b.classList.add("on");press(k)});
      ["pointerup","pointercancel","lostpointercapture"].forEach(ev=>b.addEventListener(ev,()=>{b.classList.remove("on");release(k)}));
    });
    msgEl.addEventListener("pointerdown",e=>{if(state==="talk"){e.preventDefault();nextTalk()}});
    const KM={ArrowLeft:"l",KeyA:"l",ArrowRight:"r",KeyD:"r",ArrowUp:"j",KeyW:"j",Space:"j",KeyZ:"j",KeyX:"b",Enter:"b",KeyE:"b"};
    const kd=e=>{
      const n=/^Digit([12])$/.exec(e.code);if(n&&S){selSlot(+n[1]-1);return}
      const k=KM[e.code];if(!k||(state!=="play"&&state!=="talk"))return;e.preventDefault();if(!e.repeat)press(k)};
    const ku=e=>{const k=KM[e.code];if(k)release(k)};
    document.addEventListener("keydown",kd);document.addEventListener("keyup",ku);
    const hidden=()=>{if(document.hidden)Object.keys(keys).forEach(k=>keys[k]=0)};document.addEventListener("visibilitychange",hidden);
    $(".sr-x").onclick=()=>ctx.close();
    ctx.stops.push(()=>{cancelAnimationFrame(raf);ro.disconnect();document.removeEventListener("keydown",kd);document.removeEventListener("keyup",ku);document.removeEventListener("visibilitychange",hidden)});

    /* ---------- The panel: messages, conversations, questions and the tool belt ---------- */
    let note={text:"",who:""},lines=[],after=null,shown="";
    function say(text,who){if(text)note={text,who:who||""}}
    function talk(ls,then){lines=ls.slice();after=then||null;state="talk";keys.l=keys.r=0;jb=0}
    function nextTalk(){if(state!=="talk")return;lines.shift();if(lines.length)return;state="play";last=performance.now();const f=after;after=null;if(f)f()}
    function activeStation(){if(!w)return null;for(const s of w.stations)if(!s.done&&p.x>s.x-260&&p.x<s.x+420)return s;return null}
    function panel(){
      let html="";
      if(state==="talk"&&lines.length){const [who,text]=lines[0];html='<div class="sr-say">'+(who?'<b>'+esc(who)+'</b>':"")+'<p>'+esc(text)+'</p><small>Tap here or press A or B to carry on</small></div>'}
      else{const st=activeStation();
        if(st){const q=st.q,L=q.tf?["T","F"]:["A","B","C"];
          html='<div class="sr-ask"><p>'+esc(q.q)+'</p>'+(q.pics?'':'<div class="sr-opts">'+q.opts.map((o,i)=>'<span class="'+(st.blocks[i].state||"")+'"><b>'+L[i]+'</b>'+esc(o)+'</span>').join("")+'</div>')+'</div>'}
        else html='<div class="sr-say">'+(note.who?'<b>'+esc(note.who)+'</b>':"")+'<p>'+esc(note.text)+'</p></div>'}
      if(html!==shown){shown=html;msgEl.innerHTML=html}
    }
    let kitShown="";
    function kit(){
      if(!S)return;
      const worn=PPE.filter(k=>S.worn[k]),cur=S.belt[S.sel];
      const html='<div class="sr-belt" aria-label="Tool belt">'+[0,1].map(i=>{const k=S.belt[i];return '<button type="button" class="sr-slot'+(i===S.sel?" on":"")+(k?"":" empty")+'" data-slot="'+i+'" aria-label="'+(k?nameOf(k):"Empty belt slot")+'">'+(k?svg(k):"")+'</button>'}).join("")+
        '<span class="sr-belt-name">'+(cur?esc(nameOf(cur)):"Tool belt")+'</span></div><div class="sr-worn" aria-label="PPE worn">'+worn.map(k=>'<i title="'+ICON[k].name+'">'+svg(k)+'</i>').join("")+'</div>';
      if(html!==kitShown){kitShown=html;kitEl.innerHTML=html;kitEl.querySelectorAll("[data-slot]").forEach(b=>b.addEventListener("pointerdown",e=>{e.preventDefault();selSlot(+b.dataset.slot)}))}
    }
    function selSlot(i){if(!S||i<0||i>1)return;S.sel=i;buzz(6);kit()}
    function hud(){
      if(!S)return;
      $(".sr-hearts").innerHTML=[0,1,2].map(i=>'<svg viewBox="0 0 24 24" class="'+(i<S.hearts?"on":"")+'"><path d="M12 20.5l-1.4-1.3C5.4 14.5 2 11.4 2 7.6 2 4.5 4.4 2 7.5 2c1.8 0 3.4.8 4.5 2.1C13.1 2.8 14.7 2 16.5 2 19.6 2 22 4.5 22 7.6c0 3.8-3.4 6.9-8.6 11.6z"/></svg>').join("");
      $(".sr-coins b").textContent=S.coins;kit();
    }

    /* ---------- Menu and cards ---------- */
    const star=on=>'<svg viewBox="0 0 24 24" class="sr-star'+(on?" on":"")+'"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z"/></svg>';
    function showMenu(){
      state="menu";wrap.classList.remove("playing");const pr=prog();
      menu.hidden=false;menu.innerHTML='<div class="sr-card sr-levels"><button type="button" class="sr-x sr-cx" aria-label="Close">×</button><h2>Evia’s Site Run</h2><p>Get the right kit, use the right tools and keep everyone safe on site.</p>'+
        '<div class="sr-list">'+LEVELS.map((L,i)=>{const open=i<pr.open,s=pr.stars[i]|0;return '<button type="button" class="sr-lv'+(open?"":" locked")+'" data-lv="'+i+'"'+(open?"":" disabled")+'><span class="sr-lv-n">'+(L.boss?"!":i+1)+'</span><span class="sr-lv-t"><strong>'+esc(L.name)+'</strong><small>'+(open?esc(L.about):"Finish the level before to open")+'</small></span><span class="sr-lv-s">'+[0,1,2].map(k=>star(k<s)).join("")+'</span></button>'}).join("")+'</div></div>';
      menu.querySelector(".sr-cx").onclick=()=>ctx.close();
      menu.querySelectorAll("[data-lv]").forEach(b=>b.onclick=()=>start(+b.dataset.lv));
    }
    function card(html,btns){
      menu.hidden=false;menu.innerHTML='<div class="sr-card">'+html+'<div class="sr-btns">'+btns.map(b=>'<button type="button" class="'+(b[2]||"secondary")+'" data-b="'+b[0]+'">'+b[1]+'</button>').join("")+'</div></div>';
      const acts={next:()=>start(lv+1),again:()=>start(lv),levels:showMenu};
      menu.querySelectorAll("[data-b]").forEach(b=>b.onclick=()=>acts[b.dataset.b]());
    }

    /* ---------- Start a level ---------- */
    function start(n){
      lv=n;const qs=deal(questions(),n);w=build(n,qs);
      p={x:40,y:GY-PH,vx:0,vy:0,face:1,ground:true,coy:0,inv:0,power:0,climb:null};
      S={hearts:3,coins:0,cp:40,worn:{},belt:[null,null],sel:0,pass:n>0,tour:{},permit:false,alarm:false,isolated:false,met:false,
        f:{zoneHits:0,dumperHits:0,sprayBeforeAlarm:false,badExt:false,sprayBeforeIsolate:false,wrongTool:0,wrongBox:0,redTag:false,faints:0}};
      LEVELS[n].start.forEach(k=>S.worn[k]=true);
      menu.hidden=true;menu.innerHTML="";state="play";wrap.classList.add("playing");parts.length=0;camX=0;note={text:"",who:""};shown="";kitShown="";
      $(".sr-name").textContent=LEVELS[n].name;hud();
      say(n===0?"First day! Walk right to Sam by the site office and press B to talk.":"◀ ▶ to move, A to jump, B to use. Tap a belt slot to choose a tool.");
      last=performance.now();
    }
    function faint(){
      S.f.faints++;S.hearts=3;p.x=S.cp;p.y=GY-PH-60;p.vx=p.vy=0;p.inv=90;p.climb=null;hud();
      say("Evia takes a breather and goes again from the last cone.");
      const B=w.boss;if(B&&!B.dead){B.on=false;B.hp=3;B.wall.gone=true;B.blobs.length=0;B.stall=0;B.shots=0}
    }
    function win(){
      state="won";wrap.classList.remove("playing");buzz([20,30,20]);
      const H=w.has,f=S.f,rows=[];
      if(H.induction)rows.push(["Did the induction: first aid kit, fire action notice and fire point",true]);
      if(Object.keys(H).some(k=>k.startsWith("zone-")))rows.push(["Had the right PPE on in every hazard area",f.zoneHits===0]);
      if(H.dumper)rows.push(["Kept out of the dumper’s way",f.dumperHits===0]);
      if(H.tool)rows.push(["Used the right tool for the job",f.wrongTool===0]);
      if(H.fire){rows.push(["Raised the alarm before tackling the fire",!f.sprayBeforeAlarm]);rows.push(["Used the right extinguisher",!f.badExt])}
      if(w.fire&&w.fire.fire==="electric")rows.push(["Isolated the power before tackling the electrical fire",!f.sprayBeforeIsolate]);
      if(H.permit)rows.push(["Had a permit to work before going into hot works",true]);
      if(H.scaffold)rows.push(["Only used the scaffold once it had a green tag",!f.redTag]);
      if(H.boss)rows.push(["Stopped, isolated and tagged the mixer",true]);
      if(w.stations.length)rows.push(["Every box right first time",f.wrongBox===0]);
      const ok=rows.filter(r=>r[1]).length,stars=ok===rows.length?3:ok>=rows.length*.6?2:1;
      const pr=prog();pr.stars[lv]=Math.max(pr.stars[lv]|0,stars);pr.open=Math.max(pr.open,Math.min(LEVELS.length,lv+2));saveProg(pr);
      const want=Math.min(20,Math.floor(S.coins/3)+stars*2),got=want&&R()&&R().gameCoins?R().gameCoins(want):0;ctx.coins();
      if(got&&window.eviaMood)window.eviaMood("happy");
      const end=lv===LEVELS.length-1;
      card('<h2>Site report</h2><p class="sr-sub">'+esc(LEVELS[lv].name)+'</p><div class="sr-stars">'+[0,1,2].map(k=>star(k<stars)).join("")+'</div>'+
        '<ul class="sr-why">'+rows.map(r=>'<li class="'+(r[1]?"ok":"")+'">'+esc(r[0])+'</li>').join("")+'</ul>'+
        '<div class="gm-end-coins">'+coinSvg()+'<b>+'+got+'</b><span>'+(got?"coins":want?"Today’s game coins are all collected. Play for fun!":"coins")+'</span></div>',
        end?[["levels","Levels","primary"],["again","Play again"]]:[["next","Next level","primary"],["again","Play again"],["levels","Levels"]]);
    }

    /* ---------- Rules ---------- */
    const hitBox=(a,b)=>a.x<b.x+b.w&&a.x+PW>b.x&&a.y<b.y+b.h&&a.y+PH>b.y;
    const safe=()=>p.inv>0||p.power>0;
    const worn=k=>p.power>0||!!S.worn[k];
    const parts=[];
    const burst=(x,y,col,n,sp)=>{if(reduced())n=Math.ceil(n/3);for(let i=0;i<n;i++)parts.push({x,y,vx:(Math.random()-.5)*(sp||4),vy:-Math.random()*(sp||4),life:30+Math.random()*20,col,r:2+Math.random()*2.5})};
    function hurt(msg,back){
      if(safe()||state!=="play")return false;
      S.hearts--;p.inv=90;p.vy=-6;p.vx=-3*p.face;buzz(40);say(msg);hud();
      if(back!=null){p.x=back;p.vx=0}
      if(S.hearts<=0)setTimeout(faint,500);
      return true;
    }
    function respawn(){S.hearts--;hud();if(S.hearts<=0)return faint();p.x=S.cp;p.y=GY-PH-60;p.vx=p.vy=0;p.inv=90;p.climb=null;say("Mind the gaps! Back to the last cone.");buzz(40)}

    /* What B would do right now: the nearest thing to talk to, take or press; otherwise the tool in her belt. */
    function nearEnt(){
      const cx=p.x+PW/2;let best=null,bd=46;
      for(const e of w.ents){if(e.gone)continue;const d=Math.abs(e.x-cx);if(d<bd&&Math.abs((e.y||GY)-(p.y+PH))<90){bd=d;best=e}}
      const B=w.boss;if(B&&B.on&&(B.stall>0||(B.dead&&!B.tagged))&&Math.abs(B.mixer.x-14-cx)<46)return {lever:1,label:B.dead?"Tag":"Pull"};
      return best;
    }
    function ahead(){
      const fx=p.face>0?p.x+PW:p.x;
      for(const s of w.solids){if(s.gone||!s.obs)continue;const edge=p.face>0?s.x:s.x+s.w,d=(edge-fx)*p.face;if(d>=-4&&d<(s.obs==="fire"?110:30)&&p.y+PH>s.y&&p.y<s.y+s.h)return s}
      return null;
    }
    function bLabel(){
      if(state==="talk")return "Next";const e=nearEnt();if(e)return e.label;
      const k=S&&S.belt[S.sel];return k&&EXT[k]?"Spray":"Use";
    }
    function useB(){
      if(state!=="play")return;
      const e=nearEnt();if(e)return e.lever?lever():act(e);
      const k=S.belt[S.sel],s=ahead();
      if(!k){say(s?"Something’s in the way. Find the right tool on a rack: it goes in your belt.":"Nothing to use here.");return}
      if(EXT[k])return;   /* spraying happens while B is held */
      if(!s){say("Walk up to what you want to use the "+nameOf(k).toLowerCase()+" on.");return}
      useTool(k,s);
    }
    function useTool(k,s){
      if(!OBS[s.obs])return;
      if(k!==OBS[s.obs].need){S.f.wrongTool++;buzz([20,30]);say("A "+nameOf(k).toLowerCase()+" "+WRONG[s.obs]);return}
      buzz(15);say(OBS[s.obs].ok);
      if(s.obs==="wall")s.brk=1;else if(s.obs==="timber")s.cut=1;else if(s.obs==="high")s.placed=true;else{s.bd.fixed=true;s.gone=true}
      for(let i=0;i<2;i++){w.coins.push({x:s.x+60+i*22,y:GY-50});w.total++}
    }
    function act(e){
      buzz(8);
      if(e.kind==="wallitem"){S.tour[e.item]=1;const n=Object.keys(S.tour).length;say(e.text+(n===3&&!S.pass?" That’s all three: back to Sam.":" ("+n+" of 3)"),"Induction");return}
      if(e.kind==="npc")return talkTo(e);
      if(e.kind==="item")return take(e);
      if(e.kind==="callpoint"){if(S.alarm)return say("The alarm’s already sounding.");S.alarm=true;buzz([40,30,40]);return say("Alarm raised. Everyone heads for the assembly point. It’s a small fire: if it’s safe, tackle it with the right extinguisher.","Fire alarm")}
      if(e.kind==="isolator"){if(S.isolated)return say("The power’s already off.");S.isolated=true;return say("Power isolated at the distribution board. Now the fire can be tackled more safely.","Isolator")}
    }
    function talkTo(e){
      const r=e.role;
      if(r==="induction"){
        if(S.pass)return talk([["Sam","Keep your PPE on and read the signs. Off you go!"]]);
        const n=Object.keys(S.tour).length;
        if(!S.met){S.met=true;return talk([["Sam","Morning! I’m Sam, the site manager. Before you go on site, you need your induction."],["Sam","On the office wall: the first aid kit, the fire action notice and the fire point. Walk to each one and press B."]])}
        if(n<3)return talk([["Sam","You’ve found "+n+" of 3. Have another look along the office wall."]]);
        S.pass=true;["hat","vis","boots"].forEach(k=>S.worn[k]=true);buzz([15,30,15]);hud();
        return talk([["Sam","That’s your induction done. Here’s your site pass."],["Sam","And your PPE: hard hat, hi-vis and safety boots. On at all times on site."],["Sam","Blue signs tell you what extra PPE an area needs. Jas in the stores has the rest."]],()=>say("The turnstile’s open. Head right."));
      }
      if(r==="mask"){if(S.worn.mask)return talk([["Jas","Tools are on the racks further on. Take what you need."]]);S.worn.mask=true;hud();
        return talk([["Jas","Heading past the cutting area? They’re cutting blocks, so there’s silica dust."],["Jas","Here: an FFP3 dust mask. Make sure it fits snugly."]])}
      if(r==="permit"){if(S.permit)return talk([["Sam","You’ve got the permit. Show it to Dee at the hot works gate."]]);S.permit=true;
        return talk([["Sam","Hot works ahead? Nobody goes in without a permit to work."],["Sam","Here it is. It says what work is allowed, where, and for how long."]])}
      if(r==="gate"){const gt=w.solids.find(s=>s.gate==="permit");if(gt.lift)return talk([["Dee","In you go. Mind the sparks."]]);
        if(!S.permit)return talk([["Dee","This is a hot works area. No permit to work, no entry."],["Dee","Sam in the site office can sort you one."]]);
        gt.lift=.001;return talk([["Dee","Permit to work, signed. Thanks."],["Dee","They’re grinding in there: the blue sign says eye protection must be worn."]])}
      if(r==="scaff"){const sc=w.solids.find(s=>s.obs==="scaffold");if(sc.green)return talk([["Rob","It’s signed off: green tag. Up you go."]]);
        sc.green=true;buzz(15);return talk([["Rob","That scaffold had a red tag: do not use. It wasn’t finished."],["Rob","I’ve inspected it and it’s safe now. Green tag on. Walk into it to climb."]])}
    }
    /* Taking an item: PPE goes straight on; tools and extinguishers go in the belt (two slots). A full belt swaps. */
    function take(e){
      const k=e.item;
      if(PPE.includes(k)){if(S.worn[k])return say(ICON[k].name+": already wearing it.");S.worn[k]=true;e.gone=true;hud();return say(ICON[k].name+" on.")}
      let i=S.belt.indexOf(null),back=null;
      if(i<0){i=S.sel;back=S.belt[i]}
      S.belt[i]=k;S.sel=i;
      if(back){e.item=back;say("You put the "+nameOf(back).toLowerCase()+" back and take the "+nameOf(k).toLowerCase()+".")}
      else{e.gone=true;say("The "+nameOf(k).toLowerCase()+" goes in your belt. "+(EXT[k]?"Hold B to spray.":"Press B to use it."))}
      hud();
    }
    function spray(dt){
      const k=S.belt[S.sel];if(!EXT[k])return;
      const col=k==="water"?"#bfdbfe":k==="foam"?"#fff7e0":k==="wet"?"#fef3c7":"#e5e7eb";
      for(let i=0;i<2;i++)parts.push({x:p.x+PW/2+p.face*16,y:p.y+14,vx:p.face*(5+Math.random()*2),vy:(Math.random()-.6)*1.5,life:22,col,r:4,spray:1});
      const f=w.fire;if(!f||f.gone||f.out)return;
      const d=p.face>0?f.x-(p.x+PW):p.x-(f.x+f.w);if(d>110||d<-10)return;
      const F=FIRE[f.fire];
      if(!S.alarm&&!S.f.sprayBeforeAlarm){S.f.sprayBeforeAlarm=true;say("Raise the alarm first, so everyone else gets out. The call point is at the fire point.")}
      if(f.fire==="electric"&&!S.isolated)S.f.sprayBeforeIsolate=true;
      if(F.ok.includes(k)){f.hp-=.9*dt;if(f.hp<=0){f.out=1;buzz([15,30]);say("Fire out. "+F.say)}}
      else{S.f.badExt=true;
        if(F.hurtBad){f.hp=Math.min(100,f.hp+.5*dt);hurt(F.bad[k]||"That’s the wrong extinguisher for this fire.")}
        else{f.hp=Math.max(45,f.hp-.8*dt);if(f.hp<=46)say(F.bad[k]||"That’s not doing it. Try another extinguisher.")}}
    }
    function answer(st,i){
      if(st.done)return;const q=st.q,bl=st.blocks[i];if(!bl||bl.state==="no")return;
      if(i===q.a){bl.state="ok";st.done=true;burst(bl.x+23,bl.y,"#16a34a",14);buzz(15);say("Right! "+(q.why||""));for(let k=0;k<3;k++){w.coins.push({x:st.bar.x-80+k*20,y:GY-60});w.total++}}
      else{bl.state="no";st.tries++;S.f.wrongBox++;buzz([20,30]);say("Not that one. Have another go.")}
    }
    function lever(){
      const B=w.boss;
      if(B.dead){if(!B.tagged){B.tagged=true;buzz([15,30,15]);w.flag={x:B.x+520};say("Fuel off, key out and a Do Not Use tag on. Isolated and tagged. Head for the flag!")}return}
      B.hp--;B.stall=0;B.hit=40;buzz([30,40,30]);burst(B.mixer.x,B.mixer.y+40,"#f5b800",16,4);p.x-=20;
      if(B.hp<=0){B.dead=true;B.blobs.length=0;say("The Big Mixer judders to a stop. Now isolate it: press B at the lever again to switch it off and tag it.")}
      else say(B.hp===2?"It splutters… and starts again! Once more.":"Nearly! Wait for one more stall.");
    }

    function stepPlayer(d){
      const dir=keys.r-keys.l;
      if(p.climb){const s=p.climb;p.vx=0;p.vy=0;p.y-=3*d;p.x=s.x-PW;if(p.y+PH<=s.y){p.y=s.y-PH-1;p.x=s.x+2;p.climb=null}return}
      p.vx+=(RUN*dir-p.vx)*Math.min(1,(p.ground?.3:.14)*d);if(dir)p.face=dir;
      if(jb>0&&(p.ground||p.coy>0)){p.vy=JUMP;jb=0;p.coy=0;p.ground=false;buzz(5)}
      p.vy+=GRAV*d*(p.vy<-4&&!keys.j?2:1);if(p.vy>16)p.vy=16;
      const Sd=w.solids.filter(s=>!s.gone);
      p.x+=p.vx*d;if(p.x<0)p.x=0;
      for(const s of Sd){if(!hitBox(p,s))continue;
        if(p.vx>0||(p.vx===0&&p.x<s.x)){p.x=s.x-PW;bump(s)}else p.x=s.x+s.w;p.vx=0}
      const oldB=p.y+PH;p.y+=p.vy*d;const wasG=p.ground;p.ground=false;
      for(const s of Sd){if(!hitBox(p,s))continue;
        if(p.vy>=0&&oldB<=s.y+1){p.y=s.y-PH;p.vy=0;p.ground=true}
        else if(p.vy<0){p.y=s.y+s.h;p.vy=0;if(s.kind==="block")answer(s.st,s.i)}}
      if(p.vy>=0)for(const q of w.plats){if(q.board&&!q.fixed)continue;
        if(p.x+PW>q.x&&p.x<q.x+q.w&&oldB<=q.y+1&&p.y+PH>=q.y){p.y=q.y-PH;p.vy=0;p.ground=true}}
      if(wasG&&!p.ground&&p.vy>=0)p.coy=6;
    }
    /* Walking into something: climb it if she can, otherwise a nudge about what it needs. */
    let bumpT=0;
    function bump(s){
      if(s.placed||(s.obs==="scaffold"&&s.green)){p.climb=s;return}
      const now=performance.now();if(now-bumpT<2500)return;bumpT=now;
      if(s.obs==="scaffold"){S.f.redTag=true;return say("Red scaftag: DO NOT USE. It isn’t safe yet. Talk to Rob, the scaffolder.")}
      if(s.gate==="pass")return say(S.pass?"":"The turnstile needs a site pass. Talk to Sam first.");
      if(s.gate==="permit")return say("Hot works area: the gate’s shut. Talk to Dee.");
      if(s.obs==="fire")return say("Fire! Raise the alarm at the call point, then pick the right extinguisher and hold B to spray.");
      if(s.obs){const k=S.belt[S.sel];say(k&&!EXT[k]?"Press B to use the "+nameOf(k).toLowerCase()+", or tap the other belt slot.":"Something’s in the way. You’ll need the right tool from a rack.")}
    }

    function update(dt){
      const cx=p.x+PW/2;
      for(const z of w.zones)z.t+=dt;
      for(const s of w.solids){
        if(s.kind==="fire"){s.t+=dt;if(s.out){s.out+=dt;if(s.out<50&&Math.random()<.7)parts.push({x:s.x+10+Math.random()*40,y:GY-40-Math.random()*30,vx:(Math.random()-.5)*2,vy:-1-Math.random(),life:30,col:"#e5e7eb",r:5});if(s.out>50)s.gone=true}}
        if(s.brk&&!s.gone){s.brk+=dt;if(s.brk>24){s.gone=true;burst(s.x+18,GY-80,"#b5654a",26,6)}}
        if(s.cut&&!s.gone){s.cut+=dt;if(s.cut>24){s.gone=true;burst(s.x+13,GY-80,"#c79b62",18,5)}}
        if(s.gate==="pass"&&S.pass&&!s.lift)s.lift=.001;
        if(s.lift&&!s.gone){s.lift=Math.min(1,s.lift+.04*dt);if(s.lift>=1)s.gone=true}
      }
      for(const st of w.stations)if(st.done&&st.bar.lift<1){st.bar.lift=Math.min(1,st.bar.lift+.04*dt);if(st.bar.lift>=1)st.bar.gone=true}
      if(state!=="play")return;
      const n=Math.ceil(dt),d=dt/n;
      for(let i=0;i<n;i++){stepPlayer(d);if(jb>0)jb-=d;if(p.coy>0)p.coy-=d}
      if(p.inv>0)p.inv-=dt;if(p.power>0)p.power-=dt;
      if(keys.b)spray(dt);
      if(p.y>GY+140)respawn();
      for(const k of w.picks){if(k.got)continue;if(Math.abs(k.x-cx)<26&&Math.abs(k.y-(p.y+PH/2))<40){k.got=true;burst(k.x,k.y,ICON[k.kind].c,12);
        if(k.kind==="aid"){if(S.hearts<3){S.hearts++;say("First aid kit: one heart back.")}else say("A first aid kit. Good to know where it is.");hud()}
        else{p.power=480;say("Full PPE kit! Nothing can hurt you for a bit.");buzz([15,30,15])}}}
      for(const c of w.coins){if(c.got)continue;if(Math.abs(c.x-cx)<20&&Math.abs(c.y-(p.y+PH/2))<24){c.got=true;S.coins++;$(".sr-coins b").textContent=S.coins;burst(c.x,c.y,"#f5b800",5,2.5)}}
      for(const c of w.cps)if(!c.on&&p.x>c.x-10){c.on=true;S.cp=c.x;say("Checkpoint.")}
      /* hazard areas: without the PPE the blue sign asks for, it builds up and pushes her back out */
      for(const z of w.zones){
        const inZ=cx>z.x&&cx<z.x+z.w,near=cx>z.x-40&&cx<z.x+z.w+40,Z=ZONE[z.kind];
        if(Z&&z.kind!=="fall"){if(inZ&&!worn(Z.need)){z.meter+=dt;if(z.meter>45){z.meter=0;S.f.zoneHits++;hurt(Z.hurt,z.x-60)}}else z.meter=Math.max(0,z.meter-dt)}
        if(z.kind==="fall"){
          if(near){z.brick-=dt;if(z.brick<=0){z.brick=50+Math.random()*24;const bx=Math.max(z.x+10,Math.min(z.x+z.w-30,p.x+(Math.random()*160-40)+p.vx*18));(z.bricks=z.bricks||[]).push({x:bx,y:GY-220,vy:2,vx:0,w:22,h:11})}}
          for(const b of z.bricks||[]){b.vy+=.32*dt;b.y+=b.vy*dt;b.x+=b.vx*dt;
            if(!b.dead&&b.x<p.x+PW&&b.x+b.w>p.x&&b.y<p.y+PH&&b.y+b.h>p.y){b.dead=1;b.vy=-5;b.vx=2.5;if(worn("hat"))burst(b.x,b.y,"#f5b800",6,3);else{S.f.zoneHits++;hurt(ZONE.fall.hurt)}}
            if(b.y+b.h>=GY&&!b.gone){b.gone=true;burst(b.x+11,GY,"#b5654a",8,3)}}
          if(z.bricks)z.bricks=z.bricks.filter(b=>!b.gone&&b.y<GY+40);
        }
        if(z.kind==="sparks"&&near&&Math.random()<.6)parts.push({x:z.x+z.w*.5,y:GY-44,vx:(Math.random()-.4)*6,vy:-Math.random()*4,life:18,col:Math.random()<.5?"#fb923c":"#fde047",r:2});
        if(z.kind==="plant"){const m=z.dumper;m.t+=dt;m.stop=m.dir>0&&cx>m.x+70&&cx-m.x<260&&worn("vis");
          if(!m.stop){m.x+=m.dir*(m.dir>0?1.8:1.3)*dt;if(m.x<z.x){m.x=z.x;m.dir=1}if(m.x>z.x+z.w-70){m.x=z.x+z.w-70;m.dir=-1}}
          if(!m.stop&&p.x<m.x+68&&p.x+PW>m.x+2&&p.y+PH>GY-44&&!safe()){S.f.dumperHits++;hurt(m.dir<0?"The reversing dumper couldn’t see you! Never walk behind reversing plant.":"Watch the dumper! Jump clear or wait for it to pass.")}}
      }
      /* the boss */
      const B=w.boss;
      if(B){
        if(!B.on&&p.x>B.x+60&&!B.dead){B.on=true;B.wall.gone=false;say("The Big Mixer’s out of control! Dodge the mortar. When it stalls and steams, run to the lever on its side and press B.","Big Mixer")}
        if(B.on&&!B.dead){
          if(B.hit>0)B.hit-=dt;
          if(B.stall>0){B.stall-=dt;if(B.stall<=0)say("Too slow! It’s running again. Wait for the next stall.")}
          else{B.volley-=dt;if(B.volley<=0){B.shots++;const sx=B.mixer.x+20,sy=GY-120,T=62;
            const nb=1+(3-B.hp);for(let i=0;i<nb;i++){const tx=cx+p.vx*18+(i?(Math.random()-.5)*120:0);B.blobs.push({x:sx,y:sy,vx:(tx-sx)/T,vy:(GY-10-sy-.5*.3*T*T)/T})}
            B.volley=reduced()?140:115-(3-B.hp)*15;if(B.shots%2===0){B.stall=reduced()?210:160;say("It’s stalled! Quick: the lever on its side, press B.")}}}
        }
        for(const b of B.blobs){b.vy+=.3*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
          if(!b.done&&Math.abs(b.x-cx)<18&&Math.abs(b.y-(p.y+PH/2))<22){b.done=1;hurt("Splat! Mortar. Keep moving and jump clear.")}
          if(b.y>=GY-4){b.done=1;B.splats.push({x:b.x,t:120})}}
        B.blobs=B.blobs.filter(b=>!b.done);B.splats.forEach(s=>s.t-=dt);B.splats=B.splats.filter(s=>s.t>0);
      }
      if(w.flag&&p.x+PW>w.flag.x){win();return}
    }

    /* ---------- Drawing ---------- */
    const rr=(x,y,w2,h2,r)=>{g.beginPath();if(g.roundRect)g.roundRect(x,y,w2,h2,r);else g.rect(x,y,w2,h2)};
    function icon(k,x,y,s,col){g.save();g.translate(x-s/2,y-s/2);g.scale(s/24,s/24);g.fillStyle=col||ICON[k].c;g.fill(path(k),ICON[k].eo?"evenodd":"nonzero");g.restore()}
    function extinguisher(k,x,y,s){g.fillStyle="#d62828";rr(x-5*s,y-14*s,10*s,22*s,4*s);g.fill();g.fillStyle=EXT[k].c;g.fillRect(x-5*s,y-8*s,10*s,5*s);g.strokeStyle="rgba(0,0,0,.2)";g.lineWidth=.8;g.strokeRect(x-5*s,y-8*s,10*s,5*s);g.fillStyle="#3f4a57";g.fillRect(x-2*s,y-17*s,4*s,3*s)}
    function bricks(x,y,w2,h2,col){g.fillStyle=col||"#b8674b";g.fillRect(x,y,w2,h2);g.strokeStyle="rgba(255,255,255,.55)";g.lineWidth=1.2;g.beginPath();
      for(let yy=y+9;yy<y+h2;yy+=9){g.moveTo(x,yy);g.lineTo(x+w2,yy)}
      for(let yy=y,r=0;yy<y+h2;yy+=9,r++)for(let xx=x+(r%2?10:0);xx<x+w2;xx+=20){if(xx>x){g.moveTo(xx,yy);g.lineTo(xx,Math.min(y+h2,yy+9))}}g.stroke()}
    function background(){
      const sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,"#e6ecf2");sky.addColorStop(1,"#f7f8fa");g.fillStyle=sky;g.fillRect(0,0,W,H);
      g.save();g.scale(scale,scale);g.translate(0,-camY);const vw=W/scale;
      const off=(camX*.25)%420;g.fillStyle="#d9e0e7";
      for(let x=-off-420;x<vw+420;x+=420){g.fillRect(x+20,GY-150,70,150);g.fillRect(x+100,GY-95,54,95);g.fillRect(x+250,GY-185,62,185);
        g.strokeStyle="#cfd7df";g.lineWidth=4;g.beginPath();g.moveTo(x+340,GY);g.lineTo(x+340,GY-230);g.lineTo(x+440,GY-230);g.moveTo(x+300,GY-230);g.lineTo(x+340,GY-230);g.moveTo(x+420,GY-230);g.lineTo(x+420,GY-195);g.stroke()}
      const o2=(camX*.6)%300;
      for(let x=-o2-300;x<vw+300;x+=300){g.fillStyle="#e3e8ed";g.fillRect(x,GY-64,190,64);g.fillStyle="#d5dce3";g.fillRect(x,GY-64,190,5);
        g.strokeStyle="#d3d9df";g.lineWidth=1.5;g.strokeRect(x+200,GY-52,86,52);g.beginPath();for(let k=x+206;k<x+286;k+=8){g.moveTo(k,GY-52);g.lineTo(k,GY)}g.stroke()}
      g.restore();
    }
    function drawEvia(){
      const cx=p.x+PW/2,cy=p.y+15;if(p.inv>0&&!p.power&&Math.floor(p.inv/5)%2)return;
      const t=performance.now()/1000,mv=p.ground&&Math.abs(p.vx)>.5,bob=mv?Math.abs(Math.sin(t*14))*1.6:0;
      g.save();g.translate(cx,cy-bob);
      if(p.power>0){g.fillStyle="rgba(22,163,74,"+(.18+.1*Math.sin(t*10))+")";g.beginPath();g.arc(0,2,27,0,Math.PI*2);g.fill()}
      if(worn("boots")){g.fillStyle="#2f343a";const sw=mv?Math.sin(t*14)*3:0;rr(-12+sw,13,11,7,2.5);g.fill();rr(1-sw,13,11,7,2.5);g.fill()}
      g.save();g.scale(.34,.34);g.translate(-50,-50);const body=new Path2D();body.arc(50,50,46,0,Math.PI*2);g.fillStyle="#fff";g.fill(body);
      if(worn("vis")){g.save();g.clip(body);g.fillStyle="#fb8c1a";g.fillRect(0,64,100,40);g.fillStyle="#e8ecef";g.fillRect(0,72,100,6);g.fillRect(0,84,100,6);g.restore()}
      g.strokeStyle=accent;g.lineWidth=9;g.stroke(body);g.restore();
      const ex=p.face*2;g.strokeStyle=accent;g.lineWidth=2.6;g.lineCap="round";g.beginPath();g.moveTo(-4.5+ex,-4);g.lineTo(-4.5+ex,1.5);g.moveTo(4.5+ex,-4);g.lineTo(4.5+ex,1.5);g.stroke();
      if(worn("glasses")){g.fillStyle="rgba(147,197,253,.45)";g.strokeStyle="#1f2937";g.lineWidth=1.3;rr(-10+ex,-6,20,9,3);g.fill();g.stroke()}
      if(worn("mask")){g.fillStyle="#f1f4f6";g.strokeStyle="#9aa6b2";g.lineWidth=1;g.beginPath();g.moveTo(-8+ex,4);g.quadraticCurveTo(ex,1.5,8+ex,4);g.lineTo(6+ex,9.5);g.quadraticCurveTo(ex,13,-6+ex,9.5);g.closePath();g.fill();g.stroke()}
      if(worn("ears")){g.strokeStyle="#3f4a57";g.lineWidth=2.4;g.beginPath();g.arc(0,-2,17,Math.PI*1.08,Math.PI*1.92);g.stroke();g.fillStyle="#3f4a57";rr(-20,-6,6,12,3);g.fill();rr(14,-6,6,12,3);g.fill()}
      if(worn("gloves")){g.fillStyle="#2563eb";g.beginPath();g.arc(-17,8,4.2,0,Math.PI*2);g.arc(17,8,4.2,0,Math.PI*2);g.fill()}
      if(worn("hat")){g.fillStyle="#f5b800";g.beginPath();g.arc(0,-11,12,Math.PI,0);g.closePath();g.fill();rr(-16,-12,32,3.8,1.9);g.fillStyle="#e2a700";g.fill()}
      const k=S.belt[S.sel];if(k&&EXT[k]){g.save();g.translate(p.face*17,6);g.scale(.8,.8);extinguisher(k,0,0,1);g.restore()}else if(k)icon(k,p.face*18,6,14);
      g.restore();
    }
    function person(e){
      const x=e.x,y=GY;g.fillStyle="rgba(15,23,42,.12)";g.beginPath();g.ellipse(x,y,12,3,0,0,Math.PI*2);g.fill();
      g.fillStyle="#3f4a57";g.fillRect(x-7,y-16,5,16);g.fillRect(x+2,y-16,5,16);
      g.fillStyle="#fb8c1a";rr(x-10,y-40,20,26,6);g.fill();g.fillStyle="#e8ecef";g.fillRect(x-10,y-26,20,3);g.fillRect(x-10,y-20,20,3);
      g.fillStyle="#f1c8a5";g.beginPath();g.arc(x,y-48,8,0,Math.PI*2);g.fill();
      g.fillStyle=e.hat;g.beginPath();g.arc(x,y-51,9,Math.PI,0);g.fill();g.fillRect(x-12,y-52,24,3);g.strokeStyle="rgba(0,0,0,.15)";g.lineWidth=1;g.strokeRect(x-12,y-52,24,3);
      g.fillStyle="#475569";g.font="700 9px system-ui,sans-serif";g.textAlign="center";g.fillText(e.who,x,y-64);
    }
    function drawEnt(e){
      if(e.gone)return;const t=performance.now()/1000;
      if(e.kind==="npc")return person(e);
      if(e.kind==="wallitem"){const x=e.x,y=e.y,found=S.tour[e.item];
        if(e.item==="aid"){g.fillStyle="#16a34a";rr(x-13,y-12,26,22,3);g.fill();g.fillStyle="#fff";g.fillRect(x-2.5,y-8,5,14);g.fillRect(x-7,y-3.5,14,5)}
        if(e.item==="notice"){g.fillStyle="#fff";g.strokeStyle="#16a34a";g.lineWidth=2;rr(x-14,y-16,28,30,2);g.fill();g.stroke();g.fillStyle="#16a34a";g.fillRect(x-12,y-14,24,7);g.fillStyle="#9aa3ad";for(let i=0;i<4;i++)g.fillRect(x-10,y-4+i*4,20,1.5)}
        if(e.item==="firepoint"){g.fillStyle="#dc2626";rr(x-18,y-18,36,9,2);g.fill();g.fillStyle="#fff";g.font="700 6px system-ui,sans-serif";g.textAlign="center";g.fillText("FIRE POINT",x,y-11.5);extinguisher("water",x-8,y+12,.8);extinguisher("co2",x+8,y+12,.8)}
        if(found){g.fillStyle="#16a34a";g.beginPath();g.arc(x+15,y-16,6,0,Math.PI*2);g.fill();g.strokeStyle="#fff";g.lineWidth=1.8;g.beginPath();g.moveTo(x+12,y-16);g.lineTo(x+14.5,y-13.5);g.lineTo(x+18,y-18.5);g.stroke()}
        return}
      if(e.kind==="item"){const y=e.y+Math.sin(t*2.5+e.x)*1.5;if(EXT[e.item])return extinguisher(e.item,e.x,y+6,1);g.fillStyle="#fff";g.beginPath();g.arc(e.x,y,13,0,Math.PI*2);g.fill();g.strokeStyle="rgba(15,23,42,.12)";g.lineWidth=1;g.stroke();icon(e.item,e.x,y,18);return}
      if(e.kind==="callpoint"){g.fillStyle=S.alarm&&Math.floor(t*4)%2?"#fca5a5":"#dc2626";rr(e.x-9,e.y-10,18,18,2);g.fill();g.fillStyle="#fff";g.fillRect(e.x-5,e.y-6,10,8);g.fillStyle="#475569";g.font="700 7px system-ui,sans-serif";g.textAlign="center";g.fillText("ALARM",e.x,e.y-14);return}
      if(e.kind==="isolator"){g.fillStyle="#9aa3ad";rr(e.x-12,e.y-16,24,30,3);g.fill();g.fillStyle=S.isolated?"#16a34a":"#dc2626";g.fillRect(e.x-3,e.y-10,6,12);g.fillStyle="#475569";g.font="700 7px system-ui,sans-serif";g.textAlign="center";g.fillText("POWER",e.x,e.y-20)}
    }
    function drawDeco(d){
      if(d.kind==="office"||d.kind==="cabin"||d.kind==="stores"){g.fillStyle=d.kind==="stores"?"#7a8f7d":"#d4dbe3";g.fillRect(d.x,GY-110,d.w,110);g.fillStyle="rgba(0,0,0,.08)";g.fillRect(d.x-4,GY-116,d.w+8,8);
        g.fillStyle=d.kind==="stores"?"#e8ede9":"#eef2f6";g.fillRect(d.x+d.w-60,GY-80,34,80);g.fillStyle=d.kind==="stores"?"#fff":"#475569";g.font="700 10px system-ui,sans-serif";g.textAlign="left";g.fillText(d.kind==="office"?"SITE OFFICE":d.kind==="stores"?"STORES":d.label,d.x+10,GY-94)}
      if(d.kind==="rack"){g.fillStyle="#8d6a3e";g.fillRect(d.x,GY-30,d.w,6);g.fillRect(d.x+6,GY-24,5,24);g.fillRect(d.x+d.w-11,GY-24,5,24);g.fillStyle="#475569";g.font="700 9px system-ui,sans-serif";g.textAlign="left";g.fillText("TAKE WHAT YOU NEED",d.x+30,GY-72)}
      if(d.kind==="fp"){g.fillStyle="#dc2626";rr(d.x+56,GY-82,120,14,3);g.fill();g.fillStyle="#fff";g.font="700 9px system-ui,sans-serif";g.textAlign="center";g.fillText("FIRE POINT",d.x+116,GY-72)}
    }
    function drawZone(z){
      const t=z.t;
      if(z.kind==="fall"){g.strokeStyle="#9aa5b1";g.lineWidth=4;g.beginPath();g.moveTo(z.x,GY-222);g.lineTo(z.x+z.w,GY-222);g.stroke();g.fillStyle="#9aa5b1";for(let x=z.x;x<=z.x+z.w+1;x+=z.w/4)g.fillRect(x-2,GY-222,4,222);
        g.fillStyle="#c79b62";g.fillRect(z.x,GY-226,z.w,6);bricks(z.x+z.w*.3,GY-250,60,24);for(const b of z.bricks||[])bricks(b.x,b.y,b.w,b.h)}
      if(z.kind==="noise"){const bx=z.x+z.w/2;g.fillStyle="#3f4a57";g.fillRect(bx-4,GY-58,8,46);rr(bx-14,GY-66,28,10,4);g.fill();g.fillStyle="#fb8c1a";rr(bx-9,GY-40,18,20,3);g.fill();
        g.strokeStyle="rgba(63,74,87,.3)";g.lineWidth=3;for(let i=0;i<3;i++){const r=((t*1.4+i*40)%120)+10;g.globalAlpha=1-r/130;g.beginPath();g.arc(bx,GY-40,r,Math.PI*1.05,Math.PI*1.95);g.stroke()}g.globalAlpha=1}
      if(z.kind==="plant"){const m=z.dumper,x=m.x,y=GY-46,f=m.dir;g.fillStyle="#f5b800";g.beginPath();g.moveTo(x+(f<0?40:0),y);g.lineTo(x+(f<0?70:30),y);g.lineTo(x+(f<0?66:26),y+26);g.lineTo(x+(f<0?44:4),y+26);g.fill();
        g.fillStyle="#e2a700";g.fillRect(x+4,y+22,62,10);g.fillStyle="#3f4a57";g.fillRect(x+(f<0?8:48),y-14,14,22);g.fillStyle="#2f343a";for(const wx of [x+14,x+56]){g.beginPath();g.arc(wx,GY-9,9,0,Math.PI*2);g.fill()}
        const on=Math.floor(m.t/8)%2;g.fillStyle=f<0&&on?"#fb8c1a":"#fde3c2";g.beginPath();g.arc(x+(f<0?15:55),y-18,4,0,Math.PI*2);g.fill();
        if(f<0&&!m.stop){g.fillStyle="rgba(220,38,38,.12)";g.beginPath();g.moveTo(x+70,y);g.lineTo(x+170,y-30);g.lineTo(x+170,GY);g.lineTo(x+70,GY);g.fill();if(on){g.fillStyle="#dc2626";g.font="700 10px system-ui,sans-serif";g.textAlign="center";g.fillText("BEEP BEEP",x+35,y-26)}}}
      if(z.kind==="sparks"){const bx=z.x+z.w*.5;g.fillStyle="#8d99a8";g.fillRect(bx-60,GY-40,120,6);g.fillRect(bx-54,GY-34,5,34);g.fillRect(bx+49,GY-34,5,34);g.fillStyle="#3f4a57";rr(bx-8,GY-54,20,10,3);g.fill()}
      /* the sign at the start: blue mandatory sign for PPE, yellow warning for plant */
      const Z=ZONE[z.kind],sx=z.x-24;g.fillStyle="#8d99a8";g.fillRect(sx-2,GY-64,4,64);
      if(Z){g.fillStyle="#0b5cad";g.beginPath();g.arc(sx,GY-80,17,0,Math.PI*2);g.fill();icon(Z.need,sx,GY-80,22,"#fff")}
      else{g.fillStyle="#f5c400";g.strokeStyle="#1f2937";g.lineWidth=2.5;g.lineJoin="round";g.beginPath();g.moveTo(sx,GY-98);g.lineTo(sx+19,GY-64);g.lineTo(sx-19,GY-64);g.closePath();g.fill();g.stroke();g.fillStyle="#1f2937";g.fillRect(sx-1.6,GY-89,3.2,14);g.beginPath();g.arc(sx,GY-70,2,0,Math.PI*2);g.fill()}
    }
    function drawFire(f){
      const x=f.x,t=f.t,k=f.fire;
      if(k==="timber"){g.fillStyle="#b88a52";for(let i=0;i<4;i++)g.fillRect(x+4+i*3,GY-10-i*7,50-i*6,6)}
      if(k==="electric"){g.fillStyle="#9aa3ad";rr(x+8,GY-58,44,58,3);g.fill();g.fillStyle="#f5c400";g.beginPath();g.moveTo(x+32,GY-50);g.lineTo(x+22,GY-32);g.lineTo(x+29,GY-32);g.lineTo(x+25,GY-18);g.lineTo(x+37,GY-38);g.lineTo(x+30,GY-38);g.closePath();g.fill()}
      if(k==="fuel"){g.fillStyle="#f5b800";rr(x+4,GY-36,52,36,4);g.fill();g.fillStyle="#3f4a57";g.fillRect(x+10,GY-28,18,12)}
      if(f.out&&f.out>50)return;
      const out=f.out?Math.max(0,1-f.out/50):Math.max(.4,f.hp/100),base=k==="electric"?GY-58:GY-34;
      for(let i=0;i<6;i++){const fx=x+6+i*9,h=(28+Math.sin(t*.25+i*1.7)*8+(i%2?6:0))*out;
        g.fillStyle="rgba(249,115,22,.9)";g.beginPath();g.moveTo(fx-7,base);g.quadraticCurveTo(fx-6,base-h*.6,fx,base-h);g.quadraticCurveTo(fx+6,base-h*.6,fx+7,base);g.fill();
        g.fillStyle="rgba(253,224,71,.95)";g.beginPath();g.moveTo(fx-3.5,base);g.quadraticCurveTo(fx-3,base-h*.35,fx,base-h*.55);g.quadraticCurveTo(fx+3,base-h*.35,fx+3.5,base);g.fill()}
      g.fillStyle="rgba(100,116,139,"+(.22*out)+")";for(let i=0;i<4;i++){g.beginPath();g.arc(x+30+Math.sin(t*.05+i)*8,base-50-i*30-((t*.8)%30),14+i*5,0,Math.PI*2);g.fill()}
    }
    /* Pictures on the drawing boxes: hatching and safety sign types. */
    function pic(k,x,y,w2,h2){
      g.save();g.beginPath();g.rect(x+3,y+3,w2-6,h2-6);g.clip();g.strokeStyle="#1f2937";g.lineWidth=1;g.fillStyle="#1f2937";
      if(k==="brick"){g.beginPath();for(let i=-h2;i<w2;i+=5){g.moveTo(x+i,y+h2);g.lineTo(x+i+h2,y)}g.stroke()}
      if(k==="concrete"){for(let i=0;i<9;i++){const px=x+6+((i*17)%(w2-12)),py=y+7+((i*11)%(h2-14));if(i%2){g.beginPath();g.moveTo(px,py+3);g.lineTo(px+3,py-2);g.lineTo(px+6,py+3);g.closePath();g.stroke()}else{g.beginPath();g.arc(px,py,1.2,0,Math.PI*2);g.fill()}}}
      if(k==="insulation"){g.beginPath();for(let i=4;i<w2;i+=7){g.moveTo(x+i,y+h2-3);g.bezierCurveTo(x+i-6,y+h2*.5,x+i+8,y+h2*.4,x+i+2,y+3)}g.stroke()}
      if(k==="timber"){g.beginPath();for(let r=4;r<w2+10;r+=5){g.moveTo(x,y+h2-r*.3);g.quadraticCurveTo(x+r*.8,y+h2-r*.8,x+r,y)}g.stroke()}
      g.restore();const cx=x+w2/2,cy=y+h2/2;
      if(k==="prohibit"){g.strokeStyle="#d62828";g.lineWidth=3.5;g.beginPath();g.arc(cx,cy,11,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(cx-8,cy-8);g.lineTo(cx+8,cy+8);g.stroke()}
      if(k==="mandatory"){g.fillStyle="#0b5cad";g.beginPath();g.arc(cx,cy,12,0,Math.PI*2);g.fill();g.fillStyle="#fff";g.fillRect(cx-1.5,cy-7,3,9);g.beginPath();g.arc(cx,cy+6,1.7,0,Math.PI*2);g.fill()}
      if(k==="warning"){g.fillStyle="#f5c400";g.strokeStyle="#1f2937";g.lineWidth=2;g.beginPath();g.moveTo(cx,cy-12);g.lineTo(cx+13,cy+11);g.lineTo(cx-13,cy+11);g.closePath();g.fill();g.stroke();g.fillStyle="#1f2937";g.fillRect(cx-1.2,cy-5,2.4,8);g.fillRect(cx-1.2,cy+5,2.4,2.4)}
      if(k==="safe"){g.fillStyle="#16a34a";g.fillRect(cx-12,cy-12,24,24);g.fillStyle="#fff";g.fillRect(cx-2.5,cy-8,5,16);g.fillRect(cx-8,cy-2.5,16,5)}
    }
    function drawGate(s,sign){
      const y=s.y-(s.lift||0)*300;g.save();g.beginPath();g.rect(s.x-30,s.y-300,s.w+60,s.h+300);g.clip();
      g.fillStyle="#8d99a8";g.fillRect(s.x,y,4,s.h);g.fillRect(s.x+s.w-4,y,4,s.h);g.strokeStyle="rgba(141,153,168,.6)";g.lineWidth=1;for(let yy=y;yy<y+s.h;yy+=6){g.beginPath();g.moveTo(s.x,yy);g.lineTo(s.x+s.w,yy);g.stroke()}
      g.fillStyle=sign==="q"?accent:sign==="permit"?"#dc2626":"#fff";rr(s.x-13,y+s.h-118,s.w+26,32,7);g.fill();
      g.fillStyle=sign==="pass"?"#475569":"#fff";g.font="800 "+(sign==="q"?18:9)+"px system-ui,sans-serif";g.textAlign="center";g.fillText(sign==="q"?"?":sign==="permit"?"PERMIT":"PASS",s.x+s.w/2,y+s.h-(sign==="q"?95:99));
      g.restore();
    }
    function draw(){
      g.setTransform(dpr,0,0,dpr,0,0);
      if(!w){g.fillStyle="#eef1f4";g.fillRect(0,0,W,H);return}
      const vw=W/scale;camY=GY-238;
      const B=w.boss;let want=p.x-vw*.35;
      if(B&&B.on)want=vw>=820?B.x-(vw-820)/2:Math.max(B.x-20,Math.min(B.x+820-vw,want));else want=Math.max(0,Math.min(w.end-vw,want));
      camX+=(want-camX)*(Math.abs(want-camX)>400?1:.2);
      background();
      g.save();g.scale(scale,scale);g.translate(-camX,-camY);
      const L=camX-140,Rr=camX+vw+60,vis=o=>o.x+(o.w||60)>L&&o.x<Rr;
      for(const d of w.deco)if(vis(d))drawDeco(d);
      for(const z of w.zones)if(vis(z)||vis({x:z.x-40}))drawZone(z);
      for(const s of w.solids){if(s.gone&&s.kind!=="fire"||!vis(s))continue;
        if(s.kind==="ground"){g.fillStyle="#e2d9c8";g.fillRect(s.x,s.y,s.w,s.h);g.fillStyle="#c4b89f";g.fillRect(s.x,s.y,s.w,6);g.fillStyle="#d3c8b3";for(let x=s.x+((s.x*7)%23);x<s.x+s.w-6;x+=37)g.fillRect(x,s.y+16+((x*3)%17),6,3)}
        else if(s.kind==="crate"){g.fillStyle="#c79b62";g.fillRect(s.x-2,s.y+s.h-6,s.w+4,6);bricks(s.x,s.y,s.w,s.h-6)}
        else if(s.kind==="wall"){const k=s.brk?Math.min(1,s.brk/24):0;g.globalAlpha=1-k;bricks(s.x+(k?Math.sin(s.brk*3)*2:0),s.y,s.w,s.h);g.globalAlpha=1}
        else if(s.kind==="timber"){const k=s.cut?Math.min(1,s.cut/24):0;g.save();g.globalAlpha=1-k;g.translate(s.x+13,GY);g.rotate(-.18-k*.6);g.fillStyle="#c79b62";g.fillRect(-9,-160,18,160);g.fillStyle="#a57a44";g.fillRect(-9,-160,4,160);g.restore()}
        else if(s.kind==="block-wall"){bricks(s.x,s.y,s.w,s.h,"#c3c7cc");if(s.placed){g.strokeStyle="#a8763e";g.lineWidth=3;g.beginPath();g.moveTo(s.x-12,GY);g.lineTo(s.x-4,s.y-14);g.moveTo(s.x-2,GY);g.lineTo(s.x+6,s.y-14);for(let y=GY-14;y>s.y-10;y-=16){const f=(GY-y)/(GY-s.y+14);g.moveTo(s.x-12+f*8,y);g.lineTo(s.x-2+f*8,y)}g.stroke()}}
        else if(s.kind==="scaffold"){g.strokeStyle="#8d99a8";g.lineWidth=4;g.beginPath();for(const xx of [s.x,s.x+s.w/2,s.x+s.w]){g.moveTo(xx,GY);g.lineTo(xx,s.y)}for(let yy=s.y;yy<GY;yy+=48){g.moveTo(s.x,yy);g.lineTo(s.x+s.w,yy)}g.stroke();g.fillStyle="#c79b62";g.fillRect(s.x-4,s.y-6,s.w+8,8);
          g.strokeStyle="#a8763e";g.lineWidth=3;g.beginPath();g.moveTo(s.x-10,GY);g.lineTo(s.x-2,s.y);g.moveTo(s.x,GY);g.lineTo(s.x+6,s.y);g.stroke();
          g.fillStyle=s.green?"#16a34a":"#dc2626";rr(s.x-30,GY-124,24,32,3);g.fill();g.fillStyle="#fff";g.font="700 6px system-ui,sans-serif";g.textAlign="center";g.fillText("SCAF",s.x-18,GY-110);g.fillText("TAG",s.x-18,GY-103)}
        else if(s.kind==="bar")drawGate(s,"q");
        else if(s.kind==="gate")drawGate(s,s.gate);
        else if(s.kind==="fire")drawFire(s);
        else if(s.kind==="block"){const c=s.state==="ok"?"#16a34a":s.state==="no"?"#d9dde2":"#fff";g.fillStyle=c;rr(s.x,s.y,s.w,s.h,7);g.fill();g.strokeStyle=s.state==="no"?"#c3c8ce":s.state==="ok"?"#15803d":accent;g.lineWidth=3;g.stroke();
          const q=s.st.q;if(q.pics){if(s.state!=="ok")pic(q.opts[s.i],s.x,s.y,s.w,s.h)}else{g.fillStyle=s.state==="ok"?"#fff":s.state==="no"?"#9aa3ad":"#1f2937";g.font="800 17px system-ui,sans-serif";g.textAlign="center";g.fillText((q.tf?["T","F"]:["A","B","C"])[s.i],s.x+s.w/2,s.y+23)}}
        else if(s.kind==="mixer"&&B)drawMixer(B);
      }
      for(const q of w.plats){if(!vis(q))continue;
        if(q.board){const f=q.fixed;g.save();g.translate(q.x,q.y);if(!f)g.rotate(.12);g.fillStyle="#c79b62";g.fillRect(0,0,q.w,8);g.restore();
          if(!f){g.fillStyle="#dc2626";rr(q.x+q.w/2-24,q.y-26,48,16,4);g.fill();g.fillStyle="#fff";g.font="700 10px system-ui,sans-serif";g.textAlign="center";g.fillText("WONKY",q.x+q.w/2,q.y-15)}continue}
        g.fillStyle="#8d99a8";for(const x of [q.x+8,q.x+q.w-12])g.fillRect(x,q.y,4,GY-q.y);g.fillStyle="#c79b62";g.fillRect(q.x,q.y,q.w,8)}
      for(const e of w.ents)if(vis(e))drawEnt(e);
      for(const c of w.cps){if(!vis(c))continue;g.fillStyle=c.on?accent:"#fb8c1a";g.beginPath();g.moveTo(c.x-10,GY);g.lineTo(c.x-3,GY-30);g.lineTo(c.x+3,GY-30);g.lineTo(c.x+10,GY);g.fill();g.fillStyle="#fff";g.fillRect(c.x-6,GY-18,12,4)}
      if(w.flag){const f=w.flag;g.fillStyle="#6b7280";g.fillRect(f.x,GY-130,4,130);g.fillStyle=accent;g.beginPath();g.moveTo(f.x+4,GY-128);g.lineTo(f.x+46,GY-114);g.lineTo(f.x+4,GY-100);g.fill()}
      if(B)for(const s of B.splats){g.fillStyle="rgba(120,113,108,"+Math.min(.8,s.t/60)+")";g.beginPath();g.ellipse(s.x,GY-1,14,4,0,0,Math.PI*2);g.fill()}
      const t=performance.now()/1000;
      for(const c of w.coins){if(c.got||!vis(c))continue;const sq=Math.abs(Math.cos(t*3+c.x*.05));g.fillStyle="#f5b800";g.strokeStyle="#b07f00";g.lineWidth=1.5;g.beginPath();g.ellipse(c.x,c.y,8*Math.max(.25,sq),8,0,0,Math.PI*2);g.fill();g.stroke()}
      for(const k of w.picks){if(k.got||!vis(k))continue;const y=k.y+Math.sin(t*3+k.x)*3;g.fillStyle="#fff";g.beginPath();g.arc(k.x,y,16,0,Math.PI*2);g.fill();g.strokeStyle=k.kind==="kit"?"#16a34a":"rgba(15,23,42,.12)";g.lineWidth=k.kind==="kit"?2.5:1;g.stroke();icon(k.kind,k.x,y,20)}
      if(B)for(const b of B.blobs){g.fillStyle="#8a817a";g.beginPath();g.arc(b.x,b.y,8,0,Math.PI*2);g.fill()}
      if(p)drawEvia();
      for(const z of w.zones){if(z.kind!=="dust"||!vis(z))continue;for(let i=0;i<22;i++){const x=z.x+((i*97+z.t*(.6+i%3*.3))%z.w),y=GY-20-((i*53)%150)-Math.sin(z.t*.03+i)*8;g.fillStyle="rgba(170,160,145,"+(.14+(i%4)*.05)+")";g.beginPath();g.arc(x,y,16+(i%5)*5,0,Math.PI*2);g.fill()}}
      for(const q of parts){g.globalAlpha=Math.max(0,Math.min(1,q.life/20));g.fillStyle=q.col;if(q.spray){g.beginPath();g.arc(q.x,q.y,q.r,0,Math.PI*2);g.fill()}else g.fillRect(q.x-q.r/2,q.y-q.r/2,q.r,q.r)}g.globalAlpha=1;
      g.restore();
    }
    function drawMixer(B){
      const m=B.mixer,sh=B.hit>0?Math.sin(B.hit*1.5)*3:0,x=m.x+sh,y=m.y,rot=B.dead||B.stall>0?0:performance.now()/400,t=performance.now()/1000;
      g.fillStyle="#6b7280";g.fillRect(x+20,y+70,70,10);g.fillStyle="#2f343a";for(const wx of [x+28,x+84]){g.beginPath();g.arc(wx,GY-12,12,0,Math.PI*2);g.fill()}
      g.save();g.translate(x+55,y+42);g.rotate(-.35);g.fillStyle=B.dead?"#b9bec5":"#e8772e";g.beginPath();g.ellipse(0,0,48,36,0,0,Math.PI*2);g.fill();
      g.strokeStyle="rgba(0,0,0,.18)";g.lineWidth=4;for(let i=0;i<3;i++){const a=rot+i*2.1;g.beginPath();g.ellipse(0,0,48*Math.abs(Math.cos(a)),36,0,-Math.PI/2,Math.PI/2);g.stroke()}g.restore();
      g.strokeStyle="#1f2937";g.lineWidth=3;g.lineCap="round";g.beginPath();
      if(B.dead){g.moveTo(x+30,y+30);g.lineTo(x+40,y+40);g.moveTo(x+40,y+30);g.lineTo(x+30,y+40);g.moveTo(x+56,y+26);g.lineTo(x+66,y+36);g.moveTo(x+66,y+26);g.lineTo(x+56,y+36)}
      else{g.moveTo(x+28,y+24);g.lineTo(x+42,y+30);g.moveTo(x+68,y+22);g.lineTo(x+54,y+28);g.moveTo(x+34,y+32);g.lineTo(x+34,y+40);g.moveTo(x+60,y+30);g.lineTo(x+60,y+38)}g.stroke();
      /* the stop lever on its side glows when it stalls */
      const lx=x-14,ly=y+70,ready=B.stall>0||(B.dead&&!B.tagged);
      if(ready){g.fillStyle="rgba(245,196,0,"+(.3+.2*Math.sin(t*8))+")";g.beginPath();g.arc(lx,ly-6,16,0,Math.PI*2);g.fill()}
      g.fillStyle="#3f4a57";g.fillRect(lx-2,ly-18,4,22);g.fillStyle="#dc2626";g.beginPath();g.arc(lx,ly-18,5,0,Math.PI*2);g.fill();
      if(B.stall>0){g.fillStyle="rgba(226,232,240,.85)";for(let i=0;i<3;i++){g.beginPath();g.arc(x+50+i*8,y-10-((t*40+i*14)%30),7+i*2,0,Math.PI*2);g.fill()}}
      if(B.tagged){g.fillStyle="#dc2626";rr(x+10,y+44,18,22,2);g.fill();g.fillStyle="#fff";g.font="700 5px system-ui,sans-serif";g.textAlign="center";g.fillText("DO NOT",x+19,y+54);g.fillText("USE",x+19,y+60)}
      if(!B.dead)for(let i=0;i<3;i++){g.fillStyle=i<B.hp?"#dc2626":"#d9dde2";rr(x+20+i*24,y-26,18,8,4);g.fill()}
    }

    let lastB="";
    function frame(now){
      raf=requestAnimationFrame(frame);
      if(document.hidden){last=now;return}
      const dt=Math.min(2,(now-(last||now))/16.67);last=now;
      if(w&&p&&(state==="play"||state==="talk"))update(dt);
      for(const q of parts){if(!q.spray)q.vy+=.2*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt}
      for(let i=parts.length-1;i>=0;i--)if(parts[i].life<=0)parts.splice(i,1);
      if(w&&S){panel();const lb=bLabel();if(lb!==lastB){lastB=lb;bLab.textContent=lb}}
      draw();
    }
    ctx.o.srState=()=>({p,w,S,state,lv,land});   /* for the tests */
    showMenu();raf=requestAnimationFrame(frame);
  }

  G.register({id:"game-siterun",key:"siterun",label:"Evia’s Site Run",rarity:"epic",about:"A platform game: get the right kit, use the right tools and keep everyone safe on site."},run,
    '<svg viewBox="0 0 24 24"><path d="M2 20h20"/><path d="M4 20v-5h5v5M13 20v-9h6v9"/><circle cx="8" cy="8" r="3"/><path d="M5.5 7.5a2.5 2.5 0 0 1 5 0"/></svg>');
})();
