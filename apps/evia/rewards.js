/* Evia7 Rewards: tokens, the collection and Evia's kit.
   Coins (called tokens in the code): real work (evidence, learning hours, targets), Teach me (1 for every 5 XP, no
   daily limit), mini games (up to 60 a day) and achievements. See "Coins" below. Coins aren't meant to be scarce:
   learning matters more than saving them.
   Items have a rarity (common, rare, epic, legendary). Three shapes and three colours are free; everything else is
   bought directly with tokens: no loot boxes, no chance. (Free boxes saved from before are paid out as coins.)
   Store "evia7-rewards": {bank, spent, lastXp, day, dayEarned, owned[], hat, expr, seenAch[]}.
   window.eviaRewards: page(), locked(kind,name), openItem(id), hatHtml(shape,hat), wearOn(), sync(), balance(). */
(function(){
  const XP_PER_COIN=5,ACH_TOKENS=25,BOX=60;
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const blank=()=>({bank:0,spent:0,owned:[],hat:"",seenAch:[]});
  /* Hazard spotter was swapped for the Crossword: anyone who had it gets the Crossword. */
  const migrate=r=>{const i=r.owned.indexOf("game-hazard");if(i>=0){r.owned.splice(i,1);if(!r.owned.includes("game-crossword"))r.owned.push("game-crossword")}return r};
  /* Read and written through eviaData (data.js). */
  const read=()=>migrate(Object.assign(blank(),window.eviaData.list("rewards")[0].state));
  const write=r=>{window.eviaData.put("rewards",{state:r})};
  const today=()=>{const d=new Date();return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()};

  /* ---------- The catalogue ---------- */
  const RARITY={common:{label:"Common",price:30},rare:{label:"Rare",price:80},epic:{label:"Epic",price:180},legendary:{label:"Legendary",price:400}};
  const ORDER=["common","rare","epic","legendary"];
  const HATS={
    "hat-blue":{label:"Blue hard hat",rarity:"common",about:"The colour site operatives wear."},
    "hat-silver":{label:"Silver hard hat",rarity:"rare",about:"A trophy hat for a hard worker."},
    "hat-gold":{label:"Gold hard hat",rarity:"epic",about:"For the very best on site."},
    "hat-glow":{label:"Glowing hard hat",rarity:"legendary",about:"Legendary. The brightest hat on site."},
    "hat-beanie":{label:"Beanie",rarity:"common",about:"For the frosty mornings on site."},
    "hat-cap":{label:"Sideways cap",rarity:"common",about:"Worn the cool way round."},
    "hat-cowboy":{label:"Cowboy hat",rarity:"rare",about:"The wild west of the building site."}
  };
  /* PPE, one per slot, worn with any hard hat. */
  const PPE={
    "ppe-specs":{slot:"eyes",label:"Safety specs",rarity:"common",about:"Clear safety glasses for cutting and drilling."},
    "ppe-goggles":{slot:"eyes",label:"Safety goggles",rarity:"rare",about:"Sealed goggles for dust and splashes."},
    "ppe-ears":{slot:"ears",label:"Ear defenders",rarity:"rare",about:"For the noisy jobs, like breakers and saws."},
    "ppe-ears-gold":{slot:"ears",label:"Gold ear defenders",rarity:"epic",about:"Top-spec hearing protection."},
    "ppe-hivis":{slot:"body",label:"Hi-vis vest",rarity:"common",about:"Be seen on site, every day."},
    "ppe-hivis-glow":{slot:"body",label:"Glowing hi-vis",rarity:"legendary",about:"Legendary. Seen from the far side of site."},
    /* Accessories, for fun: sunglasses sit on the eyes; a moustache or beard goes on the face. */
    "acc-sunglasses":{slot:"eyes",label:"Sunglasses",rarity:"rare",about:"Summer on the scaffold."},
    "acc-moustache":{slot:"face",label:"Moustache",rarity:"common",about:"A proper tash."},
    "acc-beard":{slot:"face",label:"Beard",rarity:"rare",about:"Full, fluffy and very wise."}
  };
  const SHAPE_R={ghost:"common",cat:"rare",dog:"rare",robot:"epic",alien:"epic",oval:"common",splat:"rare",hex:"rare",gear:"epic",shield:"epic","particle-aqua":"legendary","particle-violet":"legendary","particle-ember":"legendary","glass-aqua":"legendary","glass-violet":"legendary","glass-ember":"legendary"};
  /* Expressions: Evia's resting look. Her moods (happy when you save something, sleepy when idle) still take over
     for a moment. "classic" is the free default. */
  const EXPR={
    wink:{label:"Pill eyes",rarity:"common",about:"Two solid pills. Bold and friendly."}, /* key kept as "wink" so owned ones carry over */
    surprised:{label:"Surprised",rarity:"common",about:"Wide-eyed and amazed."},
    happy:{label:"Happy",rarity:"rare",about:"Always smiling."},
    sleepy:{label:"Sleepy",rarity:"rare",about:"Early start on site."},
    focused:{label:"Focused",rarity:"epic",about:"Locked in and ready to learn."},
    stars:{label:"Star eyes",rarity:"epic",about:"Star struck."},
    hearts:{label:"Heart eyes",rarity:"legendary",about:"Legendary. For people who love the job."},
    tiny:{label:"Tiny eyes",rarity:"common",about:"Small but mighty."},
    big:{label:"Big eyes",rarity:"common",about:"All ears. Well, all eyes."},
    dots:{label:"Dot eyes",rarity:"rare",about:"Simple and sweet."},
    robot:{label:"Robot eyes",rarity:"rare",about:"Beep boop, ready to learn."},
    sideeye:{label:"Side eye",rarity:"epic",about:"Did someone leave the mixer running?"}
  };
  const COLOUR_R={orange:"common",sky:"common",coral:"common",purple:"rare",pink:"rare",red:"rare",gold:"rare",forest:"rare",rose:"rare",teal:"epic",midnight:"epic",navy:"epic",graphite:"epic",rainbow:"legendary",neon:"legendary",site:"legendary",galaxy:"legendary",sunset:"legendary"};
  function catalogue(){
    const out=[],S=window.eviaShapes||{},T=window.eviaThemes||{};
    Object.keys(HATS).forEach(id=>out.push(Object.assign({id,kind:"hat",slot:"hat"},HATS[id])));
    Object.keys(PPE).forEach(id=>out.push(Object.assign({id,kind:"hat"},PPE[id])));
    Object.keys(EXPR).forEach(k=>out.push({id:"expr-"+k,kind:"expr",key:k,label:EXPR[k].label,rarity:EXPR[k].rarity,about:EXPR[k].about}));
    Object.keys(SHAPE_R).forEach(k=>S[k]&&out.push({id:"shape-"+k,kind:"shape",key:k,label:S[k].label+" Evia",rarity:SHAPE_R[k],about:S[k].orb?(S[k].orb.style==="glass"?"An advanced Evia: a glass orb whose light moves when she talks.":"An advanced Evia: a living sphere of light."):"A new shape for Evia."}));
    ((window.eviaGames&&window.eviaGames.GAMES)||[]).forEach(g=>out.push({id:g.id,kind:"game",key:g.key,label:g.label,rarity:g.rarity,about:g.about}));
    Object.keys(COLOUR_R).forEach(k=>T[k]&&out.push({id:"colour-"+k,kind:"colour",key:k,label:T[k].label,rarity:COLOUR_R[k],about:T[k].legendary?"Legendary. The whole app in "+({site:"site yellow and black, with hazard stripes",rainbow:"every colour of the rainbow",neon:"glowing neon",galaxy:"deep-space purples",sunset:"a sunset glow"}[k]||T[k].label.toLowerCase())+".":"Evia and the app in "+T[k].label.toLowerCase()+"."}));
    return out;
  }
  const item=id=>catalogue().find(x=>x.id===id);
  const owns=id=>read().owned.includes(id);
  /* Theme.js asks this: is a shape or colour locked, and if so, what rarity? */
  function locked(kind,name){
    const F=window.eviaFree||{themes:[],shapes:[]};
    if(kind==="shape"){if(F.shapes.includes(name)||owns("shape-"+name))return false;return SHAPE_R[name]||false}
    if(F.themes.includes(name)||owns("colour-"+name))return false;return COLOUR_R[name]||false;
  }

  /* ---------- Coins ----------
     Real work pays the most: unit evidence by strength (an upgrade pays the difference), learning hours (5 an hour,
     up to 40 a week) and each target met. Progress reviews don't pay: they only count when an assessor does them.
     Teach me pays 1 for every 5 XP, with no daily limit. Every payment is remembered, so nothing is paid twice. */
  const EV_PAY={weak:10,good:30,strong:60},OTJ_HOUR=5,OTJ_WEEK=40,TARGET_PAY=20,BACKFILL=300;
  const xp=()=>window.eviaTeach&&window.eviaTeach.stats?window.eviaTeach.stats().xp:0;
  const achievements=()=>{try{const S=window.eviaStats.compute();return window.eviaStats.achievements(S).list.filter(a=>a.earned).map(a=>a.id)}catch(_){return []}};
  const weekOf=t=>{const d=new Date(t);d.setHours(0,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()};
  /* What real work has earned so far: [{key, coins, why}] with each key's full value (paid ones are skipped later). */
  function work(){
    const out=[],c=typeof course!=="undefined"?course:"";
    const ev=typeof evidence!=="undefined"?evidence:[],S=window.eviaStrength;
    if(S)[...new Set(ev.filter(e=>e.c===c&&e.u).map(e=>e.u))].forEach(u=>{const lv=S.unit(u);if(lv)out.push({key:"ev|"+c+"|"+u,coins:EV_PAY[lv],why:lv.charAt(0).toUpperCase()+lv.slice(1)+" evidence: "+u,unit:u,lv})});
    const hs=typeof hours!=="undefined"?hours:[],wk={};
    hs.forEach(h=>{const t=Number(h.createdAt)||Date.parse(h.savedAt||"");if(!t)return;const w=weekOf(t);wk[w]=(wk[w]||0)+Number(h.n||0)});
    Object.keys(wk).forEach(w=>{const n=Math.min(OTJ_WEEK,Math.floor(wk[w]*OTJ_HOUR));if(n)out.push({key:"otj|"+w,coins:n,why:"Learning hours"})});
    try{(window.eviaTargets?window.eviaTargets.mine():[]).filter(t=>t&&t.done).forEach(t=>out.push({key:"tg|"+t.id,coins:TARGET_PAY,why:"Target met: "+t.title}))}catch(_){}
    return out;
  }
  /* Evidence moved to a renamed or regrouped topic (following a college's pack): what was paid, and the strong-evidence
     news already given, carry over to the new name. names = {newName: [old names]}. */
  function carry(c,names,r0){
    const r=r0||read();r.paid=r.paid||{};r.strong=r.strong||{};
    Object.keys(names).forEach(to=>{const k="ev|"+c+"|"+to;
      names[to].forEach(from=>{const o="ev|"+c+"|"+from;if(o===k)return;
        if((r.paid[o]||0)>(r.paid[k]||0))r.paid[k]=r.paid[o];if(r.strong[o])r.strong[k]=1})});
    if(!r0)write(r);return r;
  }
  function sync(){
    const r=read(),x=xp(),d=today(),gained=[];
    (window.eviaRewardsCarry||[]).splice(0).forEach(([c,names])=>carry(c,names,r));
    if(r.day!==d){r.day=d;r.dayEarned=0}
    /* The first time: tokens for what they've already done (up to 200), and keep anything already chosen. */
    if(r.lastXp==null){
      r.bank+=Math.min(200,Math.floor(x/XP_PER_COIN));r.lastXp=x;
      const F=window.eviaFree||{themes:[],shapes:[]},sh=window.eviaCurrentShape&&window.eviaCurrentShape(),th=window.eviaCurrentTheme&&window.eviaCurrentTheme();
      if(sh&&SHAPE_R[sh]&&!r.owned.includes("shape-"+sh))r.owned.push("shape-"+sh);
      if(th&&COLOUR_R[th]&&!r.owned.includes("colour-"+th))r.owned.push("colour-"+th);
    }else if(x>r.lastXp){
      const t=Math.floor((x-r.lastXp)/XP_PER_COIN);
      r.bank+=t;r.dayEarned=(r.dayEarned||0)+t;r.lastXp=x-((x-r.lastXp)%XP_PER_COIN);
    }else if(x<r.lastXp)r.lastXp=x;
    const got=achievements().filter(id=>!r.seenAch.includes(id));
    got.forEach(id=>{r.seenAch.push(id);r.bank+=ACH_TOKENS});
    /* Real work. The first time this runs, work already done pays out too (up to 300 in all). */
    r.paid=r.paid||{};const first=!r.workV;let back=BACKFILL;
    work().forEach(w=>{const due=w.coins-(r.paid[w.key]||0);if(due<=0)return;
      const n=first?Math.min(due,back):due;if(first)back-=n;
      r.paid[w.key]=first?w.coins:(r.paid[w.key]||0)+due;if(n>0){r.bank+=n;if(!first)gained.push({n,why:w.why})}});
    r.workV=1;
    /* A unit reaching strong evidence for the first time: Evia says it's ready for the online portfolio. Units
       already strong before this came in are counted as seen, so nobody gets a flood. */
    r.strong=r.strong||{};const fresh=[],quiet=!r.strongV;
    work().forEach(w=>{if(w.lv!=="strong"||r.strong[w.key])return;r.strong[w.key]=1;if(!quiet&&!first)fresh.push(w.unit)});
    r.strongV=1;
    /* Loot boxes are gone: any free boxes still saved are paid out as the coins they would have cost. */
    if(r.freeBox>0){r.bank+=r.freeBox*BOX;r.freeBox=0}
    write(r);badge();if(gained.length){toast(gained);if(isOpen())setTimeout(page,0)}
    if(fresh.length)setTimeout(()=>strongNews(fresh),gained.length?3200:600);
    return r;
  }
  function strongNews(units){
    const u=units[units.length-1],n=units.length,say=window.eviaSay;
    const msg='<strong>'+esc(u)+'</strong>'+(n>1?" and "+(n-1)+" more":"")+' now '+(n>1?"have":"has")+' strong evidence, so '+(n>1?"they’re":"it’s")+' ready to add to your <strong>online portfolio</strong> for your assessor.';
    if(!say)return;
    say(msg,[{label:"Add to portfolio",primary:true,run:()=>{if(window.eviaOpenSendToPortfolio)window.eviaOpenSendToPortfolio(u)}},{label:"Not now",run:()=>{}}],{keep:true});
  }
  /* Mini games pay a few coins each, up to GAME_DAILY a day (they can be played again and again). */
  const GAME_DAILY=60;
  const gameRoom=()=>{const r=read();return r.gDay===today()?Math.max(0,GAME_DAILY-(r.gEarned||0)):GAME_DAILY};
  function gameCoins(n){
    const r=read(),d=today();if(r.gDay!==d){r.gDay=d;r.gEarned=0}
    const got=Math.max(0,Math.min(Math.floor(n)||0,GAME_DAILY-r.gEarned));r.gEarned+=got;r.bank+=got;write(r);badge();return got;
  }
  /* A small note when real work pays out. */
  function toast(g){
    const n=g.reduce((a,x)=>a+x.n,0),t=document.createElement("div");t.className="rw-toast";t.setAttribute("role","status");
    t.innerHTML=coin+'<b>+'+n+(n===1?' coin':' coins')+'</b><span>'+esc(g.length>1?g.length+" things done":g[0].why)+'</span>';
    document.body.appendChild(t);setTimeout(()=>t.classList.add("out"),2600);setTimeout(()=>t.remove(),3000);
  }
  /* Real work may have changed after any screen: check quietly a moment later. */
  let st=0;const later=()=>{clearTimeout(st);st=setTimeout(sync,400)};
  /* A prize (leaderboards): paid in full, outside the daily game cap. */
  function prize(n,why){n=Math.max(0,Math.floor(n)||0);if(!n)return 0;const r=read();r.bank+=n;write(r);badge();toast([{n,why}]);return n}
  const balance=()=>{const r=read();return Math.max(0,r.bank-r.spent)};

  /* ---------- Hard hats, fitted to each shape ----------
     Positions are in the Evia button's own box (0–100). cx: centre, y: the brim, w: brim width, a: tilt. Outline
     shapes are drawn 28% larger than their box (16% for the oval), which these numbers already allow for. */
  const FIT={
    circle:{cx:50,y:15,w:80,a:0},
    squircle:{cx:50,y:9,w:86,a:0},
    cloud:{cx:53,y:19,w:74,a:-4},
    oval:{cx:50,y:17,w:80,a:0},
    splat:{cx:50,y:17,w:66,a:0},
    gear:{cx:50,y:6,w:80,a:0},
    hex:{cx:50,y:5,w:86,a:0},
    shield:{cx:50,y:3,w:92,a:0},
    ghost:{cx:50,y:7,w:70,a:0},cat:{cx:50,y:18,w:64,a:0},dog:{cx:50,y:11,w:74,a:0},robot:{cx:50,y:19,w:86,a:0},alien:{cx:50,y:12,w:80,a:0}
  };
  let uid=0;
  function hatSvg(shape,hat){
    if(OTHER_HATS[hat])return OTHER_HATS[hat](FIT[shape]||FIT.circle,"evh"+(++uid));
    const f=FIT[shape]||FIT.circle,w=f.w,x1=f.cx-w*.39,x2=f.cx+w*.39,top=f.y-w*.4,bh=w*.085,id="evh"+(++uid);
    const grad={"hat-blue":["#3a86d6","#1c5ea8","#123f73"],"hat-silver":["#f4f6f8","#b8c0ca","#6b7480"],"hat-gold":["#ffe58a","#e0a800","#8a6400"],"hat-glow":["#fffbe0","#ffd84a","#ff9d00"]}[hat]||["#3a86d6","#1c5ea8","#123f73"];
    return '<svg class="evia-hat '+hat+'" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+grad[0]+'"/><stop offset="1" stop-color="'+grad[1]+'"/></linearGradient></defs>'+
      '<g transform="rotate('+f.a+' '+f.cx+' '+f.y+')">'+
      '<path class="eh-dome" fill="url(#'+id+')" stroke="'+grad[2]+'" d="M'+x1+' '+f.y+' C'+x1+' '+(top+w*.05)+' '+(f.cx-w*.28)+' '+top+' '+f.cx+' '+top+' C'+(f.cx+w*.28)+' '+top+' '+x2+' '+(top+w*.05)+' '+x2+' '+f.y+' Z"/>'+
      '<path class="eh-ridge" stroke="'+grad[0]+'" d="M'+f.cx+' '+(top+w*.03)+' V'+(f.y-1)+'"/>'+
      '<path class="eh-shine" d="M'+(f.cx-w*.26)+' '+(f.y-w*.08)+' C'+(f.cx-w*.26)+' '+(top+w*.14)+' '+(f.cx-w*.16)+' '+(top+w*.07)+' '+(f.cx-w*.08)+' '+(top+w*.06)+'"/>'+
      '<rect class="eh-brim" fill="url(#'+id+')" stroke="'+grad[2]+'" x="'+(f.cx-w/2)+'" y="'+(f.y-bh/2)+'" width="'+w+'" height="'+bh+'" rx="'+bh/2+'"/></g></svg>';
  }
  /* Hats that aren't hard hats, fitted to the same spot on each shape (f: brim centre, height, width and tilt). */
  const R=v=>Math.round(v*10)/10;
  const OTHER_HATS={
    "hat-cap":(f,id)=>{const w=f.w*.84,x1=f.cx-w/2,x2=f.cx+w/2,top=f.y-w*.4,y=f.y;
      return '<svg class="evia-hat hat-cap" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46546e"/><stop offset="1" stop-color="#27313f"/></linearGradient></defs><g transform="rotate('+f.a+' '+f.cx+' '+f.y+')">'+
        '<path fill="#1f2733" stroke="#121821" d="M'+R(x2-w*.12)+' '+R(y-w*.02)+' C'+R(x2+w*.12)+' '+R(y-w*.1)+' '+R(x2+w*.4)+' '+R(y-w*.02)+' '+R(x2+w*.36)+' '+R(y+w*.08)+' C'+R(x2+w*.3)+' '+R(y+w*.14)+' '+R(x2+w*.02)+' '+R(y+w*.1)+' '+R(x2-w*.14)+' '+R(y+w*.06)+' Z"/>'+
        '<path fill="url(#'+id+')" stroke="#121821" d="M'+R(x1)+' '+R(y)+' C'+R(x1)+' '+R(top+w*.08)+' '+R(f.cx-w*.3)+' '+R(top)+' '+R(f.cx)+' '+R(top)+' C'+R(f.cx+w*.3)+' '+R(top)+' '+R(x2)+' '+R(top+w*.08)+' '+R(x2)+' '+R(y)+' Z"/>'+
        '<path fill="none" stroke="#121821" stroke-opacity=".45" d="M'+R(f.cx)+' '+R(top)+' V'+R(y)+' M'+R(f.cx-w*.26)+' '+R(top+w*.07)+' Q'+R(f.cx-w*.22)+' '+R(y-w*.12)+' '+R(f.cx-w*.2)+' '+R(y)+' M'+R(f.cx+w*.26)+' '+R(top+w*.07)+' Q'+R(f.cx+w*.22)+' '+R(y-w*.12)+' '+R(f.cx+w*.2)+' '+R(y)+'"/>'+
        '<rect fill="#1f2733" x="'+R(x1)+'" y="'+R(y-w*.05)+'" width="'+R(w)+'" height="'+R(w*.07)+'" rx="'+R(w*.03)+'"/><circle fill="#dfe3ea" stroke="#121821" cx="'+R(f.cx)+'" cy="'+R(top+w*.01)+'" r="'+R(w*.045)+'"/></g></svg>'},
    "hat-cowboy":(f,id)=>{const bw=f.w*1.3,cw=f.w*.66,y=f.y+f.w*.02,top=y-f.w*.52,cx=f.cx;
      return '<svg class="evia-hat hat-cowboy" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cf9b5c"/><stop offset="1" stop-color="#94622f"/></linearGradient></defs><g transform="rotate('+f.a+' '+f.cx+' '+f.y+')">'+
        '<path fill="url(#'+id+')" stroke="#5e3b17" d="M'+R(cx-cw/2)+' '+R(y)+' L'+R(cx-cw*.44)+' '+R(top+f.w*.08)+' Q'+R(cx-cw*.24)+' '+R(top-f.w*.03)+' '+R(cx)+' '+R(top+f.w*.07)+' Q'+R(cx+cw*.24)+' '+R(top-f.w*.03)+' '+R(cx+cw*.44)+' '+R(top+f.w*.08)+' L'+R(cx+cw/2)+' '+R(y)+' Z"/>'+
        '<rect fill="#3b2616" x="'+R(cx-cw/2)+'" y="'+R(y-f.w*.11)+'" width="'+R(cw)+'" height="'+R(f.w*.07)+'"/>'+
        '<path fill="url(#'+id+')" stroke="#5e3b17" d="M'+R(cx-bw/2)+' '+R(y-f.w*.12)+' Q'+R(cx-bw*.4)+' '+R(y+f.w*.06)+' '+R(cx)+' '+R(y+f.w*.05)+' Q'+R(cx+bw*.4)+' '+R(y+f.w*.06)+' '+R(cx+bw/2)+' '+R(y-f.w*.12)+' Q'+R(cx+bw*.34)+' '+R(y-f.w*.02)+' '+R(cx)+' '+R(y-f.w*.03)+' Q'+R(cx-bw*.34)+' '+R(y-f.w*.02)+' '+R(cx-bw/2)+' '+R(y-f.w*.12)+' Z"/></g></svg>'},
    "hat-beanie":(f,id)=>{const w=f.w*.86,x1=f.cx-w/2,x2=f.cx+w/2,y=f.y+f.w*.04,top=y-w*.5;let ribs="";for(let k=-3;k<=3;k++)ribs+='M'+R(f.cx+k*w*.12)+' '+R(top+w*.1+Math.abs(k)*w*.03)+' V'+R(y-w*.16);
      return '<svg class="evia-hat hat-beanie" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b778b"/><stop offset="1" stop-color="#465164"/></linearGradient></defs><g transform="rotate('+f.a+' '+f.cx+' '+f.y+')">'+
        '<circle fill="#eceef2" stroke="#8a93a1" cx="'+R(f.cx)+'" cy="'+R(top-w*.03)+'" r="'+R(w*.11)+'"/>'+
        '<path fill="url(#'+id+')" stroke="#2f3846" d="M'+R(x1)+' '+R(y)+' C'+R(x1)+' '+R(top+w*.1)+' '+R(f.cx-w*.3)+' '+R(top)+' '+R(f.cx)+' '+R(top)+' C'+R(f.cx+w*.3)+' '+R(top)+' '+R(x2)+' '+R(top+w*.1)+' '+R(x2)+' '+R(y)+' Z"/>'+
        '<path fill="none" stroke="#2f3846" stroke-opacity=".35" d="'+ribs+'"/>'+
        '<rect fill="#556175" stroke="#2f3846" x="'+R(x1-1)+'" y="'+R(y-w*.19)+'" width="'+R(w+2)+'" height="'+R(w*.21)+'" rx="'+R(w*.06)+'"/></g></svg>'}
  };
  /* A moustache or a beard, on the lower face (the beard is clipped to Evia's outline, like the vest). */
  function faceSvg(shape,id){
    if(id==="acc-moustache")return '<svg class="evia-ppe ek-face" viewBox="0 0 100 100" aria-hidden="true"><path fill="#5a3d27" stroke="#2c1d12" stroke-width="1.2" stroke-linejoin="round" d="M50 66C44 61 36 61 31 65C27.5 68 24 67.5 21.5 64C21 71 27.5 75.5 36 73.5C42 72 46 70 50 68C54 70 58 72 64 73.5C72.5 75.5 79 71 78.5 64C76 67.5 72.5 68 69 65C64 61 56 61 50 66Z"/></svg>';
    const o=outlinePath(shape),cid="evb"+(++uid);
    return '<svg class="evia-ppe ek-face" viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="'+cid+'">'+o.clip+'</clipPath></defs><g clip-path="url(#'+cid+')">'+
      '<path fill="#6b4a2f" fill-rule="evenodd" stroke="#3f2a18" stroke-width="1.2" d="M4 60C12 68 22 72 31 71C38 70 43 66 50 66C57 66 62 70 69 71C78 72 88 68 96 60L112 60L112 130L-12 130L-12 60Z M42 78.5a8 4.2 0 1 0 16 0a8 4.2 0 1 0 -16 0Z"/>'+
      '<path fill="none" stroke="#3f2a18" stroke-opacity=".35" stroke-linecap="round" d="M20 80q2 4 0 8M32 86q2 4 0 8M50 88q2 4 0 8M68 86q2 4 0 8M80 80q2 4 0 8"/></g></svg>';
  }
  const hatHtml=(shape,hat)=>hat?'<span class="evia-kit" aria-hidden="true">'+hatSvg(shape,hat)+'</span>':"";

  /* ---------- PPE, fitted to each shape ----------
     Sides of the head at eye level (L, R), the top of the head (top) and the outline as a path for clipping the vest,
     all in the Evia button's own box. */
  const BODY={
    circle:{L:1,R:99,top:0,clip:'<circle cx="50" cy="50" r="50"/>',line:'<circle cx="50" cy="50" r="48"/>'},
    squircle:{L:1,R:99,top:0,clip:'<rect x="0" y="0" width="100" height="100" rx="30"/>',line:'<rect x="2" y="2" width="96" height="96" rx="28"/>'},
    cloud:{L:-7,R:108,top:8},oval:{L:-3,R:103,top:11},splat:{L:3,R:96,top:0},gear:{L:2,R:98,top:1},hex:{L:-4,R:104,top:-2},shield:{L:-2,R:102,top:-4},
    ghost:{L:9,R:91,top:-3},cat:{L:0,R:100,top:12},dog:{L:6,R:94,top:6},robot:{L:1,R:99,top:16},alien:{L:-3,R:103,top:5}
  };
  function outlinePath(shape){
    const b=BODY[shape]||BODY.circle;if(b.clip)return {clip:b.clip,line:b.line};
    const svg=window.eviaOutlineSvg?window.eviaOutlineSvg(shape):"",ds=[...svg.matchAll(/ d="([^"]+)"/g)].map(m=>m[1]);
    const k=shape==="oval"?1.16:1.28,o=shape==="oval"?-8:-14,p=ds.map(d=>'<path transform="translate('+o+' '+o+') scale('+k+')" d="'+d+'"/>').join("");
    /* The outline line only follows the head (the last part), so ears and antennae don't cut across the kit. */
    return {clip:p,line:ds.length?'<path transform="translate('+o+' '+o+') scale('+k+')" d="'+ds[ds.length-1]+'"/>':""};
  }
  function earsSvg(shape,id){
    const b=BODY[shape]||BODY.circle,gold=id==="ppe-ears-gold",cup=gold?["#ffe58a","#e0a800","#8a6400"]:["#ff6b5c","#d8342a","#7a1a14"],cx=50;
    const band='<path class="ek-band" d="M'+(b.L+2)+' 38 C'+(b.L+1)+' '+(b.top-30)+' '+(b.R-1)+' '+(b.top-30)+' '+(b.R-2)+' 38"/>';
    const c=x=>'<rect class="ek-cup" x="'+(x-8)+'" y="35" width="16" height="30" rx="7" fill="'+cup[1]+'" stroke="'+cup[2]+'"/><rect x="'+(x-5)+'" y="39" width="4" height="22" rx="2" fill="'+cup[0]+'" opacity=".7"/>';
    return '<svg class="evia-ppe ek-ears" viewBox="0 0 100 100" aria-hidden="true">'+band+c(b.L)+c(b.R)+'</svg>';
  }
  function vestSvg(shape,id){
    const o=outlinePath(shape),cid="evv"+(++uid),glow=id==="ppe-hivis-glow";
    return '<svg class="evia-ppe ek-vest'+(glow?" glow":"")+'" viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="'+cid+'">'+o.clip+'</clipPath></defs>'+
      '<g clip-path="url(#'+cid+')"><rect class="ek-hv" x="-20" y="72" width="140" height="60"/><path class="ek-neck" d="M38 71 L50 86 L62 71 Z"/>'+
      '<rect class="ek-strip" x="-20" y="88" width="140" height="5"/><rect class="ek-strip" x="30" y="72" width="5" height="40"/><rect class="ek-strip" x="65" y="72" width="5" height="40"/></g>'+
      '<g class="ek-line">'+o.line+'</g></svg>';
  }
  /* Everything worn on one Evia: body and ears under the hat. Eye PPE is placed on the eyes by fitEyes(). */
  function kitHtml(shape,w){
    const out=(w.body?vestSvg(shape,w.body):"")+(w.face?faceSvg(shape,w.face):"")+(w.ears?earsSvg(shape,w.ears):"")+(w.hat?hatSvg(shape,w.hat):"");
    return out?'<span class="evia-kit" aria-hidden="true">'+out+'</span>':"";
  }
  /* Specs and goggles sit on Evia's actual eyes (measured, so they fit at every size and with every face). */
  function fitEyes(host){
    const id=host.dataset.eyes,face=host.querySelector(".evia-face");if(!face)return;
    let g=face.querySelector(":scope > .ek-eyes");if(!id){if(g)g.remove();return}
    const eyes=[...face.querySelectorAll(":scope > i")];if(eyes.length<2||!eyes[0].offsetWidth)return;
    const w=eyes[0].offsetWidth,h=eyes[0].offsetHeight,gap=Math.max(0,eyes[1].offsetLeft-eyes[0].offsetLeft-w);
    const bw=Math.max(1.3,w*.13),pad=Math.max(1.5,Math.min(w*.3,(gap-bw*1.5)/2));
    const box=e=>({x:e.offsetLeft-pad,y:e.offsetTop-pad,w:e.offsetWidth+pad*2,h:e.offsetHeight+pad*2});
    const a=box(eyes[0]),b=box(eyes[1]),goggles=id==="ppe-goggles",sun=id==="acc-sunglasses";
    if(!g){g=document.createElement("span");g.className="ek-eyes";g.setAttribute("aria-hidden","true");face.appendChild(g)}
    g.className="ek-eyes "+(goggles?"goggles":sun?"specs sun":"specs");g.style.setProperty("--bw",bw+"px");
    const px=v=>Math.round(v*10)/10+"px";
    g.innerHTML=goggles?
      '<b class="ek-strap" style="left:'+px(-face.offsetLeft-4)+';right:'+px(-(host.offsetWidth-face.offsetLeft-face.offsetWidth)-4)+';top:'+px(a.y+a.h/2-bw)+';height:'+px(bw*2)+'"></b>'+
      '<b class="ek-gog" style="left:'+px(a.x-bw)+';top:'+px(Math.min(a.y,b.y)-bw*.5)+';width:'+px(b.x+b.w-a.x+bw*2)+';height:'+px(Math.max(a.h,b.h)+bw)+'"></b>'
      :'<b class="ek-lens" style="left:'+px(a.x)+';top:'+px(a.y)+';width:'+px(a.w)+';height:'+px(a.h)+'"></b><b class="ek-lens" style="left:'+px(b.x)+';top:'+px(b.y)+';width:'+px(b.w)+';height:'+px(b.h)+'"></b>'+
       '<b class="ek-bridge" style="left:'+px(a.x+a.w-1)+';width:'+px(b.x-a.x-a.w+2)+';top:'+px(a.y+a.h*.38)+';height:'+px(bw)+'"></b>'+
       '<b class="ek-arm" style="left:'+px(a.x-w*.7)+';width:'+px(w*.7+1)+';top:'+px(a.y+a.h*.38)+';height:'+px(bw)+'"></b><b class="ek-arm" style="left:'+px(b.x+b.w-1)+';width:'+px(w*.7+1)+';top:'+px(b.y+b.h*.38)+';height:'+px(bw)+'"></b>';
  }
  const fitAll=root=>(root||document).querySelectorAll("[data-eyes]").forEach(fitEyes);
  /* Put what's worn on the Evia button (and keep it there when her shape changes). */
  function wearOn(){
    const r=read(),shape=window.eviaCurrentShape?window.eviaCurrentShape():"circle",ok=id=>id&&owns(id)?id:"";
    const w={hat:ok(r.hat),eyes:ok(r.eyes),ears:ok(r.ears),body:ok(r.body),face:ok(r.face)};
    document.querySelectorAll(".evia-fab").forEach(el=>{
      let k=el.querySelector(":scope > .evia-kit");const sig=shape+"|"+w.hat+"|"+w.ears+"|"+w.body+"|"+w.face;
      if(!(k&&k.dataset.sig===sig)){if(k)k.remove();const html=kitHtml(shape,w);if(html){el.insertAdjacentHTML("beforeend",html);el.lastElementChild.dataset.sig=sig}}
      if(w.eyes)el.dataset.eyes=w.eyes;else delete el.dataset.eyes;
      fitEyes(el);
    });
  }

  /* ---------- Buying and wearing ---------- */
  function buy(id){
    const it=item(id),r=read();if(!it||r.owned.includes(id))return;
    const price=RARITY[it.rarity].price;if(!price||balance()<price)return;
    r.spent+=price;r.owned.push(id);write(r);if(it.kind!=="game")use(id);
    if(window.eviaMood)window.eviaMood("happy");
    reveal(it);
  }
  function use(id){
    const it=item(id);if(!it||!owns(id))return;
    if(it.kind==="hat"){const r=read(),sl=it.slot||"hat";r[sl]=r[sl]===id?"":id;write(r);wearOn()}
    else if(it.kind==="expr"){const r=read();r.expr=r.expr===it.key?"":it.key;write(r);applyExpr()}
    else if(it.kind==="shape"&&window.eviaSetShape){window.eviaSetShape(it.key);wearOn()}
    else if(it.kind==="colour"&&window.eviaSetTheme)window.eviaSetTheme(it.key);
    else if(it.kind==="game"){if(window.eviaGames)window.eviaGames.open(it.key);return}
    if(isOpen())page();
  }
  const inUse=it=>it.kind==="game"?false:it.kind==="expr"?read().expr===it.key:it.kind==="hat"?read()[it.slot||"hat"]===it.id:it.kind==="shape"?window.eviaCurrentShape&&window.eviaCurrentShape()===it.key:window.eviaCurrentTheme&&window.eviaCurrentTheme()===it.key;
  /* ---------- The Rewards page ---------- */
  const scr=()=>document.getElementById("screen");
  const isOpen=()=>typeof screen!=="undefined"&&screen==="rewards"&&!!document.getElementById("rw-page");
  const coin='<svg class="rw-coin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path class="rw-star" d="m12 6.8 1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5Z"/></svg>';
  const face='<span class="evia-face"><i></i><i></i></span>';
  /* A small Evia showing the item: the learner's own shape and colour, with the item on. */
  function preview(it){
    if(it.kind==="game")return '<span class="rw-game" aria-hidden="true">'+(window.eviaGames?window.eviaGames.iconFor(it.key):"")+'</span>';
    const T=window.eviaThemes||{},shape=it.kind==="shape"?it.key:(window.eviaCurrentShape?window.eviaCurrentShape():"circle");
    const x=it.kind==="expr"?' data-x="'+it.key+'"':"";
    const wear=it.kind==="hat"?{[it.slot||"hat"]:it.id}:{},col=it.kind==="colour"?' style="--yellow:'+T[it.key].accent+';--evia-shape-stroke:'+T[it.key].accent+';--accent-fill:'+(T[it.key].legendary&&window.eviaThemePaint?window.eviaThemePaint(it.key):T[it.key].accent)+'"'+(T[it.key].legendary?' data-legendary data-colour="'+it.key+'"':""):"";
    return '<span class="rw-evia evia-shape-avatar shape-'+shape+'"'+col+(wear.eyes?' data-eyes="'+wear.eyes+'"':"")+'><span class="evia-face"'+x+'><i></i><i></i></span>'+kitHtml(shape,wear)+'</span>';
  }
  const tag=r=>'<span class="rw-tag r-'+r+'">'+RARITY[r].label+'</span>';
  const EARN=[["Strong evidence for a unit",EV_PAY.strong],["Good evidence for a unit",EV_PAY.good],["Weak evidence for a unit",EV_PAY.weak],["Each learning hour",OTJ_HOUR+" (up to "+OTJ_WEEK+" a week)"],["Target met",TARGET_PAY],["Achievement on My progress",ACH_TOKENS],["Teach me: each right answer","2, plus bonuses"],["Mini games","up to "+GAME_DAILY+" a day"]];
  let tab="hat";
  function page(){
    const r=sync(),bal=balance(),all=catalogue(),got=all.filter(x=>r.owned.includes(x.id)).length;
    const list=all.filter(x=>x.kind===tab).sort((a,b)=>ORDER.indexOf(a.rarity)-ORDER.indexOf(b.rarity));
    scr().innerHTML='<div id="rw-page"><header class="ui-page-head"><h1>Rewards</h1><span>'+got+' of '+all.length+' collected</span></header>'+
      '<section class="rw-bal"><div>'+coin+'<b>'+bal+'</b></div><p>Coins</p><details class="rw-earn"><summary>How to earn coins</summary><ul>'+EARN.map(e=>'<li><span>'+e[0]+'</span><b>'+e[1]+'</b></li>').join("")+'</ul><p>Improve your evidence later and you get the difference.</p></details></section>'+
      '<div class="rw-tabs" role="tablist">'+[["hat","Kit"],["expr","Faces"],["shape","Shapes"],["colour","Colours"],["game","Games"]].map(t=>'<button type="button" role="tab" aria-selected="'+(tab===t[0])+'" class="'+(tab===t[0]?"on":"")+'" data-tab="'+t[0]+'">'+t[1]+'</button>').join("")+'</div>'+
      '<div class="rw-grid">'+list.map(it=>{const own=r.owned.includes(it.id),on=own&&inUse(it),price=RARITY[it.rarity].price;
        return '<div class="rw-item r-'+it.rarity+(own?" own":"")+(on?" on":"")+'" id="rw-'+it.id+'">'+tag(it.rarity)+preview(it)+'<strong>'+esc(it.label)+'</strong><small>'+esc(it.about)+'</small>'+
          (own?'<button type="button" class="rw-btn'+(on?" on":"")+'" data-use="'+it.id+'">'+(on?(it.kind==="hat"?"Wearing":"In use"):(it.kind==="hat"?"Wear":it.kind==="game"?"Play":"Use"))+'</button>'
            :'<button type="button" class="rw-btn buy" data-buy="'+it.id+'"'+(bal>=price?"":" disabled")+'>'+coin+price+'</button>')+'</div>'}).join("")+'</div>'+
      (tab==="shape"||tab==="colour"?'<p class="rw-note">Circle, Squircle and Cloud, and Yellow, Green and Blue, are always free.</p>':tab==="expr"?'<p class="rw-note">Evia’s classic face is always free. Tap “In use” to go back to it.</p>':tab==="game"?'<p class="rw-note">Games you unlock are in the Teach me tab too. Each game pays a few coins, up to '+GAME_DAILY+' a day.</p>':"")+'</div>';
    requestAnimationFrame(()=>fitAll(scr()));
    scr().querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{tab=b.dataset.tab;page()});
    scr().querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>buy(b.dataset.buy));
    scr().querySelectorAll("[data-use]").forEach(b=>b.onclick=()=>use(b.dataset.use));
  }
  /* From a locked shape or colour in the pickers: open Rewards on that item. */
  function openItem(id){
    const it=item(id);if(!it)return;tab=it.kind;
    window.nav("rewards");setTimeout(()=>{const el=document.getElementById("rw-"+id);if(el){el.scrollIntoView({block:"center",behavior:"smooth"});el.classList.add("rw-flash")}},450);
  }

  /* ---------- The reveal when something is bought ---------- */
  function overlay(html){const o=document.createElement("div");o.className="rw-over";o.setAttribute("role","dialog");o.setAttribute("aria-modal","true");o.innerHTML=html;document.body.appendChild(o);return o}
  function reveal(it){
    const o=overlay('<div class="rw-reveal r-'+it.rarity+'"><span class="rw-burst" aria-hidden="true"></span>'+tag(it.rarity)+
      '<div class="rw-big">'+preview(it)+'</div><h2>'+esc(it.label)+'</h2><p>It’s yours.</p>'+
      '<div class="rw-reveal-btns"><button type="button" class="rw-btn buy" data-go="use">'+(it.kind==="hat"?"Wear it":it.kind==="game"?"Play it":"Use it")+'</button><button type="button" class="rw-btn" data-go="ok">Later</button></div></div>');
    requestAnimationFrame(()=>fitAll(o));
    const close=()=>{o.classList.add("out");setTimeout(()=>o.remove(),200);if(isOpen())page();badge()};
    o.querySelector('[data-go="ok"]').onclick=close;
    o.querySelector('[data-go="use"]').onclick=()=>{const r=read();if(it.kind==="hat"&&r.hat===it.id){close();return}use(it.id);close()};
    if(it.rarity==="legendary"&&window.eviaMood)window.eviaMood("happy");
  }

  /* No nagging dot on the Rewards tab (it was for loot boxes); cleared for anyone who still has it. */
  function badge(){const b=document.querySelector('[data-nav="rewards"]');if(b)b.classList.remove("rw-dot")}

  /* The expression in use goes on <html>, so every Evia in the app shows it (moods still win for a moment). */
  function applyExpr(){const r=read(),on=r.expr&&owns("expr-"+r.expr);if(on)document.documentElement.setAttribute("data-evia-expr",r.expr);else document.documentElement.removeAttribute("data-evia-expr")}
  applyExpr();
  window.eviaRewards={carry,coin:()=>coin,gameCoins,prize,gameRoom,GAME_DAILY,owns,page,later,XP_PER_COIN,EV_PAY,applyExpr,kitHtml,fitAll,locked,openItem,hatHtml,hatSvg,wearOn,sync,balance,catalogue,FIT};
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)sync()});
  setTimeout(()=>{sync();wearOn()},500);
  /* Keep the hat on when Evia's shape changes. */
  new MutationObserver(()=>wearOn()).observe(document.documentElement,{attributes:true,attributeFilter:["data-evia-shape"]});
})();
