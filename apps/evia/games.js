/* Evia7 mini games: short games that teach without feeling like lessons. Unlocked in Rewards, played from Teach me.
     T.R.A.D.E       guess the trade word in six tries (like Wordle); the word's meaning is shown at the end, and as a
                     clue after four tries.
     Crossword       a new small crossword each time from the trade's terms; the clues are what each term means.
     Flappy Evia     fly Evia through the scaffold; every few gaps a safety gate asks a true-or-false question.
   Games pay a few coins each, even when you don't win (rewards.js caps game coins at 60 a day). Hints are free:
   learning matters more than coins.
   window.eviaGames: {GAMES, open(key), iconFor(key)} */
(function(){
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const reduced=()=>window.eviaAccessibility?window.eviaAccessibility.reducedMotion():matchMedia("(prefers-reduced-motion: reduce)").matches;
  const buzz=ms=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(_){}};
  const R=()=>window.eviaRewards;
  const coinSvg=()=>R()&&R().coin?R().coin():"";
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const group=()=>{const c=typeof course!=="undefined"?course:"";return c==="joiner"?"bench":c==="site"?"site":"brick"};

  const ICONS={
    brickle:'<svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="5.5" height="6" rx="1.2"/><rect x="9.25" y="5" width="5.5" height="6" rx="1.2"/><rect x="16" y="5" width="5.5" height="6" rx="1.2"/><rect x="2.5" y="13" width="5.5" height="6" rx="1.2"/><rect x="9.25" y="13" width="5.5" height="6" rx="1.2"/><rect x="16" y="13" width="5.5" height="6" rx="1.2"/></svg>',
    crossword:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="9" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/><rect x="9" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/></svg>',
    flappy:'<svg viewBox="0 0 24 24"><circle cx="13" cy="12" r="7"/><path d="M11 11v1.5M15 11v1.5M2.5 9h3M2 12.5h3.5M2.5 16h3"/></svg>'
  };
  const GAMES=[
    {id:"game-brickle",key:"brickle",label:"T.R.A.D.E",rarity:"common",about:"Guess the trade word in six tries."},
    {id:"game-crossword",key:"crossword",label:"Crossword",rarity:"common",about:"Fill in the trade words from what they mean."},
    {id:"game-flappy",key:"flappy",label:"Flappy Evia",rarity:"rare",about:"Fly through the scaffold and pass the safety gates."}
  ];

  /* ---------- The game screen ---------- */
  let cur=null;
  function shell(g){
    if(cur)cur.close();
    const o=document.createElement("div");o.className="gm gm-"+g.key;o.setAttribute("role","dialog");o.setAttribute("aria-modal","true");o.setAttribute("aria-label",g.label);
    o.innerHTML='<header class="gm-bar"><button type="button" class="gm-x" aria-label="Close">×</button><strong>'+esc(g.label)+'</strong><span class="gm-coins" title="Game coins today">'+coinSvg()+'<b></b></span></header><div class="gm-body"></div>';
    document.body.appendChild(o);document.documentElement.classList.add("gm-open");
    const ctx={o,g,body:o.querySelector(".gm-body"),stops:[],
      coins(){const b=o.querySelector(".gm-coins b"),rm=R()&&R().gameRoom?R().gameRoom():0;b.textContent=(R()?R().GAME_DAILY:60)-rm+"/"+(R()?R().GAME_DAILY:60);o.querySelector(".gm-coins").setAttribute("aria-label","Game coins today: "+b.textContent)},
      close(){ctx.stops.forEach(f=>{try{f()}catch(_){}});o.remove();document.removeEventListener("keydown",esc2);if(cur===ctx)cur=null;if(!document.querySelector(".gm"))document.documentElement.classList.remove("gm-open");if(typeof screen!=="undefined"&&screen==="teach"&&window.render)window.render()}};
    const esc2=e=>{if(e.key==="Escape")ctx.close()};document.addEventListener("keydown",esc2);
    o.querySelector(".gm-x").onclick=()=>ctx.close();ctx.coins();cur=ctx;return ctx;
  }
  /* The end of a round: coins (within today's cap), a summary, then play again or done. */
  function finish(ctx,o){
    const got=o.coins>0&&R()&&R().gameCoins?R().gameCoins(o.coins):0;ctx.coins();
    const card=document.createElement("div");card.className="gm-end";
    card.innerHTML='<div class="gm-end-card"><h2>'+esc(o.title)+'</h2>'+(o.sub?'<p class="gm-end-sub">'+o.sub+'</p>':"")+
      '<div class="gm-end-coins">'+coinSvg()+'<b>+'+got+'</b><span>'+(got?"coins":o.coins>0?"Today’s game coins are all collected. Play for fun!":"coins")+'</span></div>'+
      (o.html||"")+(o.lb||window.eviaLeaderboard&&window.eviaLeaderboard.GAMES[ctx.g.key]?'<div class="gm-lb"></div>':"")+'<div class="gm-end-btns"><button type="button" class="primary" data-a="again">Play again</button><button type="button" class="secondary" data-a="done">Done</button></div></div>';
    ctx.body.appendChild(card);
    /* Leaderboards (leaderboard.js): the score goes to the college board, and the card says where they are. */
    const lbEl=card.querySelector(".gm-lb");
    if(lbEl&&window.eviaLeaderboard){if(o.lb)window.eviaLeaderboard.submit(o.lb.game,o.lb.score);window.eviaLeaderboard.endLine(ctx.g.key,lbEl)}
    card.querySelector('[data-a="again"]').onclick=()=>{card.remove();o.again()};
    card.querySelector('[data-a="done"]').onclick=()=>ctx.close();
    if(got&&window.eviaMood)window.eviaMood("happy");
    setTimeout(()=>{const b=card.querySelector('[data-a="again"]');try{b.focus({preventScroll:true})}catch(_){}},80);
  }

  /* ---------- T.R.A.D.E (was Brickle: the key, "brickle", is kept so unlocks and scores carry over) ---------- */
  const WORDS={
    brick:[
      ["LEVEL","A spirit level. It checks courses are level and, held upright, that walls are plumb."],
      ["PLUMB","Perfectly upright. Check it by holding the level against the wall."],
      ["GAUGE","Keeping every course the same height: 75 mm for a brick and its joint. Check it with a gauge rod."],
      ["BRICK","A standard UK brick is 215 × 102.5 × 65 mm."],
      ["BLOCK","A concrete block’s face is 440 × 215 mm: the size of six bricks."],
      ["JOINT","The mortar between bricks, usually 10 mm. Bed joints are flat; perpends are upright."],
      ["DATUM","A fixed height that everything is measured from, often marked on a peg or a wall."],
      ["ARRIS","The sharp edge where two faces of a brick meet."],
      ["QUOIN","The outside corner of a wall. Build the quoins first, then run a line between them."],
      ["CHASE","A groove cut into a wall for pipes or cables."],
      ["FLUSH","A joint finished level with the face of the bricks."],
      ["BATCH","One mix of mortar. Gauge every batch the same so the colour matches."],
      ["MIXER","A drum mixer for mortar. Keep hands and shovels out of the drum while it turns."],
      ["PIERS","Thicker columns of brickwork that stiffen a wall or carry a load."],
      ["LINES","A builder’s line pinned between the corners keeps each course straight."],
      ["SPALL","A chip or flake broken off the face of a brick, often by frost."],
      ["TRAYS","Cavity trays catch water in the cavity over an opening and lead it out through weep holes."],
      ["WEEPS","Weep holes: open perpends above a cavity tray that let water out of the cavity."],
      ["SILLS","The ledge under a window that throws rainwater clear of the wall."],
      ["FROST","Frost can freeze the water in fresh mortar and ruin the joints. Protect new work overnight."],
      ["RAKED","A joint raked back from the face, for a recessed finish or ready for pointing."],
      ["STACK","Stack bond: bricks laid straight on top of each other. Decorative only, as it doesn’t bond."],
      ["TOOTH","Toothing: leaving alternate courses sticking out at the end of a wall so it can be carried on later."],
      ["BATTS","Slabs of insulation fitted in the cavity between the wall ties."],
      ["VENTS","Air bricks and vents let air under a suspended timber floor so it doesn’t rot."],
      ["FACES","The face of a brick is the side that shows. Lay the best faces out."],
      ["ANGLE","Set out a right angle with a builder’s square or the 3-4-5 method."],
      ["SCALE","Drawings are to scale, like 1:50. Measure the drawing and multiply to get the real size."],
      ["PLANS","A plan shows the building from above: where every wall goes."],
      ["HOIST","A hoist lifts materials up the scaffold. Never ride on a goods hoist."],
      ["SLUMP","How wet concrete is. The slump test drops a cone of concrete and measures how far it sinks."],
      ["BONDS","The patterns bricks are laid in, like stretcher, English and Flemish."],
      ["CURED","Mortar and concrete harden as they cure. Keep them from drying out too fast or freezing."]
    ],
    site:[
      ["JOIST","A timber beam that carries a floor or ceiling, usually at 400 mm centres."],
      ["TRUSS","A factory-made triangle frame that holds up a roof."],
      ["RIDGE","The top line of a roof, where the two slopes meet."],
      ["EAVES","The lower edge of a roof that overhangs the wall."],
      ["TREAD","The part of a stair step you stand on."],
      ["RISER","The upright part between two stair treads."],
      ["NEWEL","The big post at the top or bottom of a staircase that holds the handrail."],
      ["PITCH","The angle of a roof or a staircase."],
      ["STILE","An upright side piece of a door or window frame."],
      ["HINGE","Doors hang on hinges. Fire doors need three."],
      ["LATCH","Holds a door shut until you turn the handle."],
      ["MITRE","A joint cut at 45° on each piece to turn a corner, like skirting on an outside corner."],
      ["STUDS","The upright timbers in a stud wall, usually at 400 or 600 mm centres."],
      ["JAMBS","The upright sides of a door frame or lining."],
      ["PLUMB","Perfectly upright. Door linings must be plumb or the door swings open or shut on its own."],
      ["PLATE","The wall plate: the timber bedded on top of the wall that the rafters sit on."],
      ["VERGE","The sloping edge of a roof at the gable end."],
      ["GABLE","The triangular top of an end wall under a pitched roof."],
      ["SCREW","Screws grip better than nails and can be taken out. Pilot drill hardwood first."],
      ["NAILS","Round wire nails for carcassing; oval nails for finish work, laid with the grain."],
      ["LEDGE","A ledged and braced door has ledges across the back of the boards."],
      ["BRACE","The diagonal on a ledged and braced door. It rises from the hinge side so the door can’t sag."],
      ["GOING","The going is the depth of a stair tread, measured nosing to nosing."],
      ["SPANS","How far a joist or beam reaches between its supports."],
      ["STOPS","Door stops: the thin strips round the lining that the door closes against."],
      ["WEDGE","Folding wedges pack and level frames, joists and linings."],
      ["STRUT","A timber that props up a purlin or stiffens a frame."],
      ["CLEAT","A short block fixed on to support or join timbers."],
      ["HATCH","A loft hatch gives access into the roof space. Its opening is framed with trimmers."],
      ["CHALK","A chalk line snaps a long straight line across boards, walls or floors."],
      ["LEVEL","A spirit level checks work is level and, held upright, plumb."],
      ["BEADS","Glazing beads hold the glass in a window frame."]
    ],
    bench:[
      ["TENON","The tongue on the end of a rail that fits into a mortice."],
      ["MITRE","A joint cut at 45° on each piece to turn a corner."],
      ["DOWEL","A round wooden pin glued into holes to join two pieces."],
      ["STILE","An upright side piece of a door or frame."],
      ["RAILS","The flat pieces of a door or frame, joined into the stiles."],
      ["PLANE","A hand plane shaves timber smooth, straight and to size."],
      ["GRAIN","The way the wood fibres run. Plane and sand with the grain."],
      ["KNOTS","Where a branch grew. Big or loose knots weaken the timber."],
      ["BEVEL","A sloping edge, or the sliding bevel you use to mark angles."],
      ["CRAMP","What joiners call a clamp. Cramps hold joints tight while the glue sets."],
      ["HINGE","Doors hang on hinges. Fire doors need three."],
      ["TREAD","The part of a stair step you stand on."],
      ["RISER","The upright part between two stair treads."],
      ["NEWEL","The big post at the top or bottom of a staircase that holds the handrail."],
      ["ARRIS","The sharp edge between two faces. Take it off with a light sand."],
      ["PANEL","A panel fills the space between the rails and stiles of a door."],
      ["BEADS","Glazing beads hold the glass in a frame."],
      ["STAIN","A stain colours the timber but lets the grain show through."],
      ["LATHE","A lathe spins timber so it can be turned, for spindles and newel caps."],
      ["AUGER","An auger bit bores deep, clean holes in timber."],
      ["GAUGE","A marking gauge scribes a line parallel to an edge."],
      ["JOINT","Joinery is joints: mortise and tenon, dovetail, housing, halving."],
      ["WEDGE","Wedges driven into a through tenon lock the joint tight."],
      ["BEECH","A pale, hard, close-grained hardwood, used for bench tops and tool handles."],
      ["LARCH","A tough, durable softwood, often used for cladding."],
      ["CEDAR","Western red cedar is light and naturally durable, used for cladding."],
      ["FENCE","The guide on a saw or router that keeps the cut parallel to the edge."],
      ["GUARD","Machine guards must be in place and set right before you cut."],
      ["CHECK","Checks are splits along the grain that open as timber dries."],
      ["TWIST","A warp where timber turns like a propeller. Spot it with winding strips."]
    ]
  };
  const TOPIC={brick:"a bricklaying word",site:"a site carpentry word",bench:"a joinery word"};
  const dayNo=()=>{const d=new Date();return Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5)};
  let brickleRound=0,lastWord="";
  /* Colours for a guess: right place, in the word, or not in it (repeated letters handled like Wordle). */
  function score(guess,word){
    const out=Array(5).fill("no"),left={};
    for(let i=0;i<5;i++){if(guess[i]===word[i])out[i]="hit";else left[word[i]]=(left[word[i]]||0)+1}
    for(let i=0;i<5;i++)if(out[i]!=="hit"&&left[guess[i]]){out[i]="near";left[guess[i]]--}
    return out;
  }
  function brickle(ctx){
    const list=WORDS[group()];
    /* The first game of the day is the day's word; after that, a different word each time. */
    let pair=brickleRound++===0?list[dayNo()%list.length]:pick(list.filter(w=>w[0]!==lastWord));
    lastWord=pair[0];
    const word=pair[0],rows=[],keys={};let row=0,cell="",over=false;
    const KB=["QWERTYUIOP","ASDFGHJKL","⏎ZXCVBNM⌫"];
    ctx.body.innerHTML='<div class="bk"><p class="bk-say">Guess '+TOPIC[group()]+' in six tries.</p><div class="bk-grid">'+
      Array.from({length:6},(_,r)=>'<div class="bk-row">'+Array.from({length:5},()=>'<span class="bk-t"></span>').join("")+'</div>').join("")+'</div>'+
      '<p class="bk-clue" hidden></p><p class="bk-msg" aria-live="polite"></p>'+
      '<div class="bk-kb">'+KB.map(r=>'<div>'+[...r].map(k=>'<button type="button" data-k="'+k+'" class="'+(k==="⏎"||k==="⌫"?"wide":"")+'" aria-label="'+(k==="⏎"?"Enter":k==="⌫"?"Delete":k)+'">'+(k==="⏎"?"Enter":k)+'</button>').join("")+'</div>').join("")+'</div>'+
      '<details class="bk-how"><summary>How to play</summary><p><span class="bk-t hit">A</span> right letter, right place. <span class="bk-t near">B</span> in the word, wrong place. <span class="bk-t no">C</span> not in the word.</p></details></div>';
    const $=q=>ctx.body.querySelector(q),tiles=r=>[...ctx.body.querySelectorAll(".bk-row")[r].children];
    const msg=t=>{$(".bk-msg").textContent=t};
    const paint=()=>tiles(row).forEach((t,i)=>{t.textContent=cell[i]||"";t.classList.toggle("full",!!cell[i])});
    const shake=()=>{const r=ctx.body.querySelectorAll(".bk-row")[row];r.classList.remove("shake");void r.offsetWidth;r.classList.add("shake")};
    function enter(){
      if(over)return;
      if(cell.length<5){msg("Five letters, please.");shake();return}
      const res=score(cell,word),ts=tiles(row);
      ts.forEach((t,i)=>{setTimeout(()=>{t.classList.add(res[i],"flip")},reduced()?0:i*170)});
      [...cell].forEach((ch,i)=>{const rank={no:1,near:2,hit:3},was=keys[ch];if(!was||rank[res[i]]>rank[was])keys[ch]=res[i]});
      setTimeout(()=>{ctx.body.querySelectorAll("[data-k]").forEach(b=>{const s=keys[b.dataset.k];b.className=(b.classList.contains("wide")?"wide ":"")+(s||"")})},reduced()?0:900);
      rows.push(cell);const won=cell===word;row++;cell="";msg("");
      if(won||row===6){over=true;setTimeout(()=>end(won),reduced()?200:1150);return}
      if(row===4){const c=$(".bk-clue");c.hidden=false;c.innerHTML="<strong>Clue:</strong> "+esc(pair[1].replace(new RegExp(word,"ig"),"_____"))}
    }
    function key(k){
      if(over)return;
      if(k==="⏎"||k==="ENTER")return enter();
      if(k==="⌫"||k==="BACKSPACE"){cell=cell.slice(0,-1);return paint()}
      if(/^[A-Z]$/.test(k)&&cell.length<5){cell+=k;paint();buzz(5)}
    }
    ctx.body.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>key(b.dataset.k));
    const kd=e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key.toUpperCase();if(k==="ENTER"||k==="BACKSPACE"||/^[A-Z]$/.test(k)){e.preventDefault();key(k)}};
    document.addEventListener("keydown",kd);ctx.stops.push(()=>document.removeEventListener("keydown",kd));
    function end(won){
      document.removeEventListener("keydown",kd);
      finish(ctx,{title:won?(rows.length<=2?"Brilliant!":rows.length<=4?"Nice one!":"Got it!"):"The word was "+word,
        sub:won?"You got <strong>"+word+"</strong> in "+rows.length+(rows.length===1?" try.":" tries."):"Here’s what it means, for next time.",
        coins:won?Math.max(4,9-rows.length):2,lb:won?{game:"brickle",score:1}:null,
        html:'<div class="gm-learn"><strong>'+word+'</strong><p>'+esc(pair[1])+'</p></div>',
        again:()=>brickle(ctx)});
    }
  }

  /* ---------- Crossword ----------
     A fresh small crossword each time, built from the trade's terms. The clues are what each term means, so filling it
     in is learning the words. Tap a square to pick a word (tap again to switch across/down), type with the keys. */
  const CLUES={
    brick:[
      ["MORTAR","Sand, cement and water, mixed to bed and joint the bricks"],["TROWEL","The tool for spreading and cutting mortar"],
      ["LINTEL","A beam over a window or door that carries the brickwork above"],["DATUM","A fixed height that all levels are measured from"],
      ["QUOIN","The outside corner of a wall, built before the rest"],["GAUGE","Keeping courses the same height: 75 mm for a brick and its joint"],
      ["PLUMB","Perfectly upright"],["LEVEL","The tool that checks each course is flat"],["ARRIS","The sharp edge where two faces of a brick meet"],
      ["HEADER","A brick laid with its end showing on the face"],["STRETCHER","A brick laid lengthways along the wall"],
      ["BOLSTER","A wide chisel for cutting bricks with a club hammer"],["CAVITY","The gap between the two leaves of an outside wall"],
      ["TIES","Metal fixings that join the two leaves of a cavity wall"],["FROG","The dent in the top of some bricks"],
      ["PERPEND","An upright joint between two bricks"],["CORBEL","Brickwork that steps out from the face of the wall"],
      ["COPING","The top layer of a free-standing wall that throws off the rain"],["HOD","A tray on a pole for carrying bricks or mortar"],
      ["BOND","The pattern bricks are laid in, so the joints don’t line up"],["LINE","Pinned between the corners to keep each course straight"],
      ["PIER","A thicker column of brickwork that stiffens a wall"],["JOINT","The mortar between bricks, usually 10 mm"],
      ["WEEPHOLE","A gap in a perpend that lets water out of the cavity"],["TRAY","Catches water in the cavity over an opening"],
      ["DPC","Stops rising damp (initials)"],["GAUGEROD","A timber rod marked with the course heights"],
      ["FOOTING","The concrete base a wall is built on"],["SOLDIER","A brick stood on its end, often in a row over an opening"],
      ["ENGLISH","Bond with whole courses of headers and whole courses of stretchers"],["FLEMISH","Bond with headers and stretchers taking turns in each course"],
      ["POINTING","Raking out joints and filling them with fresh mortar"],["PLASTICISER","Added to mortar to make it easier to work"],
      ["LIME","Added to mortar to make it more workable and flexible"],["SAND","Mixed with cement to make mortar"],
      ["BATTS","Slabs of insulation fitted between the wall ties"],["CHARIOT","Rakes joints back for a recessed finish"],
      ["JOINTER","A tool for shaping mortar joints"],["SCAFFOLD","A temporary platform for working at height"],
      ["CLOSER","A cut brick that finishes the bond at a corner or opening"],["BAT","Part of a brick, like a half"],
      ["SILL","The ledge under a window"],["ARCH","A curved span over an opening"]
    ],
    site:[
      ["JOIST","A timber beam that carries a floor, usually at 400 mm centres"],["RAFTER","A sloping timber that carries the roof covering"],
      ["TRUSS","A factory-made triangle frame that holds up a roof"],["RIDGE","The top line of a roof, where the two slopes meet"],
      ["EAVES","The lower edge of a roof that overhangs the wall"],["PURLIN","A roof beam that supports the rafters halfway up"],
      ["FASCIA","The board fixed to the rafter ends that carries the gutter"],["SOFFIT","The board under the roof overhang, between the fascia and the wall"],
      ["TREAD","The part of a stair step you stand on"],["RISER","The upright part between two stair treads"],
      ["NEWEL","The big post at the top or bottom of a staircase"],["STRING","The board each side of a staircase that carries the treads"],
      ["ARCHITRAVE","The trim round a door lining that covers the joint with the wall"],["SKIRTING","The board fixed along the bottom of a wall"],
      ["STUD","An upright timber in a partition wall"],["NOGGING","A short timber fixed between studs to stiffen the wall"],
      ["LINING","The frame of boards fixed in a doorway that the door hangs in"],["HINGE","Fire doors hang on three of these"],
      ["MITRE","A joint cut at 45° on each piece, like skirting on an outside corner"],["SCRIBE","To cut one piece to fit the shape of another"],
      ["PLUMB","Perfectly upright"],["LATCH","Holds a door shut until you turn the handle"],["JAMB","An upright side of a door frame"],
      ["WALLPLATE","The timber on top of a wall that the rafters sit on"],["VERGE","The sloping edge of a roof at the gable"],
      ["GABLE","The triangular top of an end wall"],["HIP","Where two roof slopes meet at an outside corner"],
      ["VALLEY","Where two roof slopes meet at an inside corner"],["TRIMMER","A joist that frames round an opening, like a stairwell"],
      ["HANGER","A steel bracket that carries the end of a joist"],["GOING","The depth of a stair tread, nosing to nosing"],
      ["NOSING","The front edge of a stair tread"],["BALUSTER","One of the upright spindles under a handrail"],
      ["HANDRAIL","What you hold going up the stairs"],["STOP","The strip a door closes against"],
      ["BRACE","The diagonal that stops a ledged door sagging"],["PACKER","A thin piece used to level or plumb a frame"],
      ["CLADDING","Boards fixed to the outside of a wall to weather it"],["BATTEN","A thin strip of timber that tiles or cladding are fixed to"],
      ["SPAN","How far a joist reaches between supports"],["PITCH","The angle of a roof"]
    ],
    bench:[
      ["TENON","The tongue on the end of a rail that fits into a mortice"],["MORTICE","A rectangular hole cut to take a tenon"],
      ["DOWEL","A round wooden pin glued into holes to join two pieces"],["STILE","An upright side piece of a door or frame"],
      ["RAIL","A cross piece of a door or frame, joined into the stiles"],["MUNTIN","An upright bar between the rails in the middle of a door"],
      ["PLANE","Shaves timber smooth, straight and to size"],["GRAIN","The way the wood fibres run: plane and sand with it"],
      ["KNOT","Where a branch grew; big loose ones weaken timber"],["BEVEL","A sloping edge, or the tool for marking angles"],
      ["CRAMP","What joiners call a clamp"],["REBATE","A step cut along the edge of timber, for glass or a door"],
      ["HOUSING","A groove cut across the grain for another piece to fit into"],["DOVETAIL","A strong fan-shaped joint used on drawers"],
      ["VENEER","A thin sheet of wood glued onto a panel"],["PLYWOOD","Board made of thin layers glued with the grain crossing"],
      ["SASH","The part of a window that opens"],["ARRIS","The sharp edge between two faces"],["CHISEL","Cuts mortices and pares joints to fit"],
      ["MITRE","A joint cut at 45° on each piece to turn a corner"],["TEMPLATE","A pattern used to mark out the same shape many times"],
      ["ROD","A full-size drawing of a job, used to set out joinery"],["GLUE","Holds a joint together once it’s cramped up"],
      ["HAUNCH","The short part of a tenon that fills the groove at the end of a stile"],["WEDGE","Driven into a through tenon to lock it"],
      ["MOULDING","A shaped strip of timber, like an architrave or dado rail"],["ROUTER","Cuts grooves, rebates and mouldings"],
      ["SPOKESHAVE","A small plane with two handles for shaping curves"],["LATHE","Spins timber so it can be turned"],
      ["AUGER","A bit for boring deep holes"],["GAUGE","A marking ___ scribes a line parallel to an edge"],
      ["PANEL","Fills the space between the rails and stiles"],["BEAD","A small moulding that holds the glass in"],
      ["TRANSOM","A horizontal bar across a window frame"],["MULLION","An upright bar dividing a window frame"],
      ["HARDWOOD","Timber from broad-leaved trees, like oak"],["SOFTWOOD","Timber from conifers, like pine and spruce"],
      ["CUP","A warp across the width of a board"],["TWIST","A warp like a propeller"],
      ["FENCE","The guide that keeps a cut parallel to the edge"],["PUSHSTICK","Keeps your hands clear of the blade on a saw bench"],
      ["SCRIBE","To mark or cut one piece to fit another"]
    ]
  };
  /* Build a crossword: words placed across and down, only touching where they cross. Tries a few times and keeps the
     one with the most words that still fits a phone (up to 11 squares wide). */
  function build(list,want){
    const N=21,M=10;let best=null;
    for(let tries=0;tries<40;tries++){
      const pool=list.slice().sort(()=>Math.random()-.5),grid=Array.from({length:N},()=>Array(N).fill("")),placed=[];
      const at=(r,c)=>r>=0&&c>=0&&r<N&&c<N?grid[r][c]:"";
      const fits=(w,r,c,d)=>{
        const dr=d?1:0,dc=d?0:1;let cross=0;
        if(at(r-dr,c-dc)||at(r+dr*w.length,c+dc*w.length))return -1;
        for(let i=0;i<w.length;i++){
          const rr=r+dr*i,cc=c+dc*i;if(rr<0||cc<0||rr>=N||cc>=N)return -1;const g=grid[rr][cc];
          if(g){if(g!==w[i])return -1;cross++}
          else if(at(rr+dc,cc+dr)||at(rr-dc,cc-dr))return -1;
        }
        return cross;
      };
      const put=(w,r,c,d,clue)=>{for(let i=0;i<w.length;i++)grid[r+(d?i:0)][c+(d?0:i)]=w[i];placed.push({w,r,c,d,clue})};
      const first=pool.find(p=>p[0].length>=5&&p[0].length<=M)||pool[0];put(first[0],10,10-Math.floor(first[0].length/2),0,first[1]);
      for(const [w,clue] of pool){
        if(placed.length>=want)break;if(placed.some(p=>p.w===w)||w.length>M)continue;
        const opts=[];
        for(const p of placed)for(let i=0;i<p.w.length;i++)for(let j=0;j<w.length;j++){
          if(p.w[i]!==w[j])continue;const d=p.d?0:1,r=p.d?p.r+i:p.r-j,c=p.d?p.c-j:p.c+i,x=fits(w,r,c,d);if(x>0)opts.push({r,c,d,x});
        }
        if(!opts.length)continue;
        /* Prefer more crossings, then staying compact. */
        const box=o=>{const rs=placed.map(p=>[p.r,p.r+(p.d?p.w.length-1:0)]).flat().concat([o.r,o.r+(o.d?w.length-1:0)]),cs=placed.map(p=>[p.c,p.c+(p.d?0:p.w.length-1)]).flat().concat([o.c,o.c+(o.d?0:w.length-1)]);return Math.max(Math.max(...rs)-Math.min(...rs),Math.max(...cs)-Math.min(...cs))};
        opts.sort((a,b)=>b.x-a.x||box(a)-box(b));const o=opts[0];if(box(o)>=M+1)continue;put(w,o.r,o.c,o.d,clue);
      }
      if(!best||placed.length>best.length)best=placed;if(best.length>=want)break;
    }
    const r0=Math.min(...best.map(p=>p.r)),c0=Math.min(...best.map(p=>p.c));
    const words=best.map(p=>Object.assign({},p,{r:p.r-r0,c:p.c-c0}));
    const rows=Math.max(...words.map(p=>p.r+(p.d?p.w.length:1))),cols=Math.max(...words.map(p=>p.c+(p.d?1:p.w.length)));
    /* Number the squares where words start, top to bottom, left to right. */
    const starts=[...new Set(words.map(p=>p.r*100+p.c))].sort((a,b)=>a-b);
    words.forEach(p=>p.n=starts.indexOf(p.r*100+p.c)+1);
    words.sort((a,b)=>a.d-b.d||a.n-b.n);
    return {words,rows,cols};
  }
  function crossword(ctx){
    const pz=build(CLUES[group()],7),{words,rows,cols}=pz,sol={},val={},wrong=new Set();
    words.forEach(p=>{for(let i=0;i<p.w.length;i++)sol[(p.r+(p.d?i:0))+","+(p.c+(p.d?0:i))]=p.w[i]});
    let cur=0,pos=0,reveals=0,over=false;
    const cells=p=>Array.from({length:p.w.length},(_,i)=>(p.r+(p.d?i:0))+","+(p.c+(p.d?0:i)));
    const KB=["QWERTYUIOP","ASDFGHJKL","ZXCVBNM⌫"];
    const num={};words.forEach(p=>{num[p.r+","+p.c]=p.n});
    ctx.body.innerHTML='<div class="cw"><div class="cw-grid" style="--cols:'+cols+'">'+
      Array.from({length:rows*cols},(_,k)=>{const r=Math.floor(k/cols),c=k%cols,key=r+","+c;
        return sol[key]?'<button type="button" class="cw-c" data-c="'+key+'" aria-label="Square '+(r+1)+', '+(c+1)+'">'+(num[key]?'<i>'+num[key]+'</i>':"")+'<b></b></button>':'<span class="cw-x"></span>'}).join("")+'</div>'+
      '<div class="cw-clue"><button type="button" class="cw-nav" data-nav="-1" aria-label="Previous clue">‹</button><p aria-live="polite"></p><button type="button" class="cw-nav" data-nav="1" aria-label="Next clue">›</button></div>'+
      '<div class="cw-tools"><button type="button" data-t="check">Check</button><button type="button" data-t="reveal">Reveal a letter</button><span class="cw-msg" aria-live="polite"></span></div>'+
      '<div class="bk-kb">'+KB.map(r=>'<div>'+[...r].map(k=>'<button type="button" data-k="'+k+'" class="'+(k==="⌫"?"wide":"")+'" aria-label="'+(k==="⌫"?"Delete":k)+'">'+k+'</button>').join("")+'</div>').join("")+'</div></div>';
    const $=q=>ctx.body.querySelector(q),cellEl=k=>ctx.body.querySelector('[data-c="'+k+'"]'),msg=t=>{$(".cw-msg").textContent=t||""};
    function paint(){
      const cs=cells(words[cur]);
      ctx.body.querySelectorAll(".cw-c").forEach(b=>{const k=b.dataset.c;b.querySelector("b").textContent=val[k]||"";b.classList.toggle("in",cs.includes(k));b.classList.toggle("on",cs[pos]===k);b.classList.toggle("bad",wrong.has(k));b.classList.toggle("ok",over)});
      const p=words[cur];$(".cw-clue p").innerHTML='<strong>'+p.n+(p.d?" Down":" Across")+'</strong> '+esc(p.clue)+' <span>('+p.w.length+')</span>';
    }
    const select=(i,at)=>{cur=(i+words.length)%words.length;const cs=cells(words[cur]);pos=at!=null?at:Math.max(0,cs.findIndex(k=>!val[k]));paint()};
    ctx.body.querySelectorAll(".cw-c").forEach(b=>b.onclick=()=>{
      if(over)return;const k=b.dataset.c,cs=cells(words[cur]);
      if(cs.includes(k)&&cs[pos]===k){const o=words.findIndex((p,i)=>i!==cur&&cells(p).includes(k));if(o>=0)return select(o,cells(words[o]).indexOf(k))}
      if(cs.includes(k)){pos=cs.indexOf(k);return paint()}
      const i=words.findIndex(p=>cells(p).includes(k));select(i,cells(words[i]).indexOf(k));
    });
    ctx.body.querySelectorAll("[data-nav]").forEach(b=>b.onclick=()=>select(cur+Number(b.dataset.nav)));
    const full=()=>Object.keys(sol).every(k=>val[k]);
    const right=()=>Object.keys(sol).every(k=>val[k]===sol[k]);
    function after(){
      if(!full())return;
      if(right()){over=true;paint();buzz([10,40,10]);setTimeout(end,reduced()?150:700)}
      else msg("Nearly! Something’s not right. Tap Check.");
    }
    function type(ch){
      if(over)return;const cs=cells(words[cur]);
      if(ch==="⌫"){if(!val[cs[pos]]&&pos>0)pos--;delete val[cs[pos]];wrong.delete(cs[pos]);msg();return paint()}
      val[cs[pos]]=ch;wrong.delete(cs[pos]);buzz(5);msg();
      if(pos<cs.length-1)pos++;
      else if(cs.every(k=>val[k])){const nx=words.findIndex((p,i)=>i>cur&&cells(p).some(k=>!val[k])),n2=nx>=0?nx:words.findIndex(p=>cells(p).some(k=>!val[k]));if(n2>=0){paint();return setTimeout(()=>{select(n2);},120)}}
      paint();after();
    }
    ctx.body.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>type(b.dataset.k));
    ctx.body.querySelector('[data-t="check"]').onclick=()=>{
      Object.keys(val).forEach(k=>{if(val[k]!==sol[k])wrong.add(k)});paint();
      msg(wrong.size?wrong.size+(wrong.size===1?" letter isn’t right.":" letters aren’t right."):Object.keys(val).length?"All correct so far.":"Fill in some squares first.");
    };
    ctx.body.querySelector('[data-t="reveal"]').onclick=()=>{
      if(over)return;const cs=cells(words[cur]),k=cs.find(x=>val[x]!==sol[x]);if(!k)return;
      val[k]=sol[k];wrong.delete(k);reveals++;pos=cs.indexOf(k);msg("");paint();after();
    };
    const kd=e=>{if(e.ctrlKey||e.metaKey||e.altKey||over)return;const k=e.key.toUpperCase();
      if(/^[A-Z]$/.test(k)){e.preventDefault();type(k)}else if(k==="BACKSPACE"){e.preventDefault();type("⌫")}
      else if(e.key==="ArrowRight"||e.key==="ArrowDown"||e.key==="Tab"){e.preventDefault();select(cur+1)}else if(e.key==="ArrowLeft"||e.key==="ArrowUp"){e.preventDefault();select(cur-1)}};
    document.addEventListener("keydown",kd);ctx.stops.push(()=>document.removeEventListener("keydown",kd));
    select(0,0);
    function end(){
      document.removeEventListener("keydown",kd);
      finish(ctx,{title:reveals?"Crossword done!":"Solved it yourself!",sub:reveals?"With "+reveals+(reveals===1?" letter":" letters")+" revealed.":"No letters revealed. Top work.",
        coins:8,lb:reveals?null:{game:"crossword",score:1},
        html:'<ol class="gm-list">'+words.map(p=>'<li class="ok"><strong>'+p.w+'</strong><span>'+esc(p.clue)+'</span></li>').join("")+'</ol>',
        again:()=>crossword(ctx)});
    }
  }

  /* ---------- Flappy Evia ---------- */
  const GATES=[
    ["Toe boards stop tools and materials falling off a scaffold platform.",true,"Toe boards run along the edge of the platform so nothing gets kicked off onto people below."],
    ["You can take a scaffold tie out if it’s in your way.",false,"Only a competent scaffolder should alter a scaffold. Removing a tie can make it collapse."],
    ["Check the scaffold tag before you go up.",true,"The tag shows it has been inspected and is safe to use. No tag, or a red tag, means don’t use it."],
    ["A ladder should lean at about 75°: 1 out for every 4 up.",true,"That’s the 1-in-4 rule. Too steep and it can tip back; too shallow and the feet can slide."],
    ["Working at height only means above 2 metres.",false,"It’s anywhere you could fall and hurt yourself, even from a step or into a hole."],
    ["It’s fine to overload a platform for a minute or two.",false,"Overloading can make boards break or the scaffold fail. Stick to the safe load, however quick the job."],
    ["A ladder should stick out about 1 metre above where you step off.",true,"It gives you a handhold as you get on and off."],
    ["Keep the scaffold platform clear of offcuts and loose bricks.",true,"Clutter causes trips, and things can fall onto people below."],
    ["A missing guard rail is OK if you’re careful.",false,"Guard rails must be in place along every open edge. Don’t work there until it’s fixed."],
    ["Report damaged scaffold boards straight away.",true,"Split or rotten boards can snap. Report them and don’t use that bay."],
    ["You should wear a harness on a normal tube scaffold with guard rails.",false,"Guard rails and toe boards are the protection there. Harnesses are for other jobs, like MEWPs, when you’ve been trained."],
    ["Never climb the outside of a scaffold: use the ladder or stairs.",true,"Climbing the frame can pull it over, and you could slip. Use the access provided."],
    ["Power tools on UK sites should run on 110 V.",true,"110 V cuts the risk of a fatal electric shock."],
    ["A nicked cable can be taped up and used until the end of the day.",false,"A damaged cable can kill. Stop, label it and report it."],
    ["An FFP1 mask is fine for silica dust.",false,"Silica dust needs FFP3, face-fit tested."],
    ["Report a near miss even if nobody was hurt.",true,"So the cause is fixed before someone gets hurt."],
    ["Wet cement can burn your skin.",true,"It’s alkaline. Wash it off straight away and wear waterproof gloves."],
    ["You can skip the site induction if you’ve worked on sites before.",false,"Every site has its own rules, hazards and emergency plans."],
    ["PPE is the first thing to think about when controlling a risk.",false,"It’s the last line of defence. Remove or reduce the hazard first."],
    ["If you have to shout to be heard a metre away, you need hearing protection.",true,"It’s loud enough to damage your hearing."],
    ["Damage from hand-arm vibration can be permanent.",true,"It damages nerves and blood vessels. Limit your time on vibrating tools."],
    ["CO2 extinguishers are safe to use on electrical fires.",true,"CO2 doesn’t conduct and leaves nothing behind."],
    ["Water is safe to use on a burning chip pan.",false,"Water on burning oil causes a fireball. Use wet chemical or a fire blanket."],
    ["Buildings from before 2000 can contain asbestos.",true,"If you find something suspicious, stop and tell your supervisor."],
    ["You can walk under a load being lifted if you’re quick.",false,"Never go under a suspended load."],
    ["Lift with your knees bent and your back straight.",true,"Let your legs do the work, and keep the load close."]
  ];
  /* Each trade's own safety gates, mixed in with the ones above. */
  const TRADE_GATES={
    brick:[
      ["Wall ties go at 900 mm across and 450 mm up.",true,"That’s the standard spacing, with extra ties at openings."],
      ["The DPC must be at least 150 mm above ground level.",true,"So rain splashing off the ground can’t bridge it."],
      ["Stretcher bond overlaps by a quarter of a brick.",false,"It’s half a brick."],
      ["Mortar that’s started to set can be knocked up with water and used.",false,"Retempering weakens it. Mix fresh."],
      ["Weep holes let water out of the cavity.",true,"They drain the cavity tray."],
      ["A standard brick is 215 mm long.",true,"215 × 102.5 × 65 mm."],
      ["One course of brickwork with its joint is 75 mm.",true,"65 mm brick + 10 mm joint."],
      ["Mortar droppings can be left in the cavity.",false,"They bridge the cavity and let damp across. Keep it clean."],
      ["Fresh brickwork should be covered against frost and rain.",true,"Frost and rain ruin fresh joints."],
      ["A lintel needs at least 150 mm bearing at each end.",true,"It spreads the load onto the wall."],
      ["English bond has headers and stretchers taking turns in every course.",false,"That’s Flemish. English has whole courses of each."],
      ["Dry-cutting blocks is fine without a mask if you’re outdoors.",false,"Silica dust still gets breathed in. Use water suppression and FFP3."]
    ],
    site:[
      ["Floor joists are often set at 400 mm centres.",true,"400 or 600 mm, to suit the boards and loads."],
      ["Trussed rafters can be cut or notched on site to fit.",false,"Never alter a truss without the designer’s say-so."],
      ["The maximum pitch for a private stair is 42°.",true,"That’s the limit in Approved Document K."],
      ["Fire doors need three hinges.",true,"Three hinges keep the door closed and in line in a fire."],
      ["Measuring both diagonals checks a frame is square.",true,"If they’re equal, it’s square."],
      ["Noggins stiffen a stud wall and give fixings for the boards.",true,"They go between the studs."],
      ["It’s fine to tape back a nail gun’s safety tip to work faster.",false,"That’s how nails get fired into people."],
      ["The maximum rise on a private stair is 250 mm.",false,"It’s 220 mm."],
      ["Timber used outside should be treated against rot.",true,"Treated timber lasts much longer outside."],
      ["Skirting on an outside corner is joined with a mitre.",true,"Two 45° cuts make a neat outside corner."],
      ["A door lining can be a little out of plumb without problems.",false,"The door will swing open or shut on its own."],
      ["Joist hangers need every nail hole filled with the right nails.",true,"Fewer nails means less strength."]
    ],
    bench:[
      ["Use a push stick to feed short pieces through a saw bench.",true,"It keeps your hands away from the blade."],
      ["It’s OK to take a guard off to see the cut better.",false,"Guards must be in place and set right."],
      ["A dovetail joint resists being pulled apart.",true,"That’s why it’s used on drawers."],
      ["A rip saw cuts across the grain.",false,"Rip saws cut along the grain."],
      ["Timber shrinks most along its length.",false,"Hardly at all lengthways. Most along the growth rings."],
      ["Hardwood comes from broad-leaved trees.",true,"Like oak, ash and beech."],
      ["MDF dust is harmless.",false,"Wood dust, MDF included, can cause asthma and cancer. Use extraction and a mask."],
      ["Plane with the grain to avoid tearing the surface.",true,"Against the grain tears the fibres."],
      ["A mortise and tenon is the usual joint for rails into stiles.",true,"Strong and square."],
      ["Stop and isolate a machine before clearing a blockage.",true,"Never reach in while it can start."],
      ["Loose gloves are safe to wear on a spindle moulder.",false,"They can get caught and pull your hand in."],
      ["Stack timber on bearers with sticks between the layers.",true,"Air circulates so it dries evenly and doesn’t warp."]
    ]
  };
  function flappy(ctx){
    ctx.body.innerHTML='<div class="fl"><canvas aria-label="Flappy Evia game"></canvas><div class="fl-hud"><b class="fl-score">0</b><span class="fl-shield" hidden>Shield</span></div>'+
      '<div class="fl-tip"><strong>Tap to flap</strong><span>Fly through the gaps in the scaffold. Every fifth gap is a safety gate: get it right for a shield and bonus points.</span></div><div class="fl-q" hidden></div></div>';
    const wrap=ctx.body.querySelector(".fl"),cv=wrap.querySelector("canvas"),g=cv.getContext("2d"),tip=wrap.querySelector(".fl-tip"),qEl=wrap.querySelector(".fl-q");
    const accent=getComputedStyle(document.documentElement).getPropertyValue("--yellow").trim()||"#f5c400";
    let W=0,H=0,dpr=1;
    const size=()=>{const r=wrap.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);W=r.width;H=r.height;cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+"px";cv.style.height=H+"px"};
    size();const ro=new ResizeObserver(size);ro.observe(wrap);ctx.stops.push(()=>ro.disconnect());
    const GROUND=40,R=15;
    let s,raf=0,last=0,state="ready",asked=[];
    const reset=()=>{s={y:H*.42,v:0,x:W*.28,pipes:[],made:0,t:0,score:0,dist:0,passed:0,shield:false,flash:0,gates:0,right:0,bg:0}};
    reset();
    const gap=()=>Math.max(128,168-s.passed*2),speed=()=>Math.min(3.2,2.2+s.passed*.04);
    const addPipe=x=>{const gp=gap(),top=60+Math.random()*(H-GROUND-gp-120);s.pipes.push({x,top,gp,gate:++s.made%5===0,done:false})};
    function flap(){
      if(state==="q"||state==="over")return;
      if(state==="ready"){state="play";tip.hidden=true;addPipe(W+40)}
      s.v=-6.2;buzz(6);
    }
    const down=e=>{if(e.target.closest&&e.target.closest(".fl-q,.gm-end"))return;e.preventDefault();flap()};
    cv.addEventListener("pointerdown",down);tip.addEventListener("pointerdown",down);
    const kd=e=>{if(e.code==="Space"||e.key===" "||e.key==="ArrowUp"){if(document.querySelector(".gm-end"))return;e.preventDefault();flap()}};
    document.addEventListener("keydown",kd);ctx.stops.push(()=>{document.removeEventListener("keydown",kd);cancelAnimationFrame(raf)});

    function ask(){
      state="q";const all=GATES.concat(TRADE_GATES[group()]||[]),pool=all.filter(q=>!asked.includes(q[0]));const q=pick(pool.length?pool:all);asked.push(q[0]);s.gates++;
      qEl.hidden=false;qEl.innerHTML='<div class="fl-q-card"><span class="fl-q-tag">Safety gate</span><p>'+esc(q[0])+'</p><div class="fl-q-btns"><button type="button" data-a="1">True</button><button type="button" data-a="0">False</button></div></div>';
      qEl.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>{
        const ok=(b.dataset.a==="1")===q[1];if(ok){s.right++;s.score+=3;s.shield=true}
        qEl.innerHTML='<div class="fl-q-card '+(ok?"ok":"no")+'"><span class="fl-q-tag">'+(ok?"Right! +3 and a shield":"Not quite")+'</span><p><strong>'+(q[1]?"True.":"False.")+'</strong> '+esc(q[2])+'</p><div class="fl-q-btns"><button type="button" class="go">Keep flying</button></div></div>';
        const go=qEl.querySelector(".go");try{go.focus({preventScroll:true})}catch(_){}
        go.onclick=()=>{qEl.hidden=true;state="play";s.v=-4;last=performance.now()};
      });
    }
    function hit(){
      if(s.shield){s.shield=false;s.flash=40;s.v=-5;return false}
      state="over";buzz([30,40,30]);
      const best=Math.max(s.score,Number(localStorage.getItem("evia7-flappy-best")||0));try{localStorage.setItem("evia7-flappy-best",best)}catch(_){}
      setTimeout(()=>finish(ctx,{title:"Score: "+s.score,sub:(s.score>=best&&s.score?"A new best!":"Best: "+best)+(s.gates?" · Safety gates: "+s.right+" of "+s.gates:""),
        coins:Math.min(15,Math.floor(s.score/2)+s.right),lb:{game:"flappy",score:s.score},again:()=>flappy(ctx)}),500);
      return true;
    }
    /* Drawing: sky, buildings and a crane far away, scaffold towers, the ground, and Evia. */
    function draw(){
      g.setTransform(dpr,0,0,dpr,0,0);
      const sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,"#bfe3ff");sky.addColorStop(1,"#eef8ff");g.fillStyle=sky;g.fillRect(0,0,W,H);
      const off=(s.bg*.3)%240;g.fillStyle="#d3e3f0";
      for(let x=-off;x<W+240;x+=240){g.fillRect(x+10,H-GROUND-110,50,110);g.fillRect(x+70,H-GROUND-70,40,70);g.fillRect(x+150,H-GROUND-140,44,140);
        g.strokeStyle="#c3d6e6";g.lineWidth=3;g.beginPath();g.moveTo(x+200,H-GROUND);g.lineTo(x+200,H-GROUND-190);g.lineTo(x+280,H-GROUND-190);g.moveTo(x+170,H-GROUND-190);g.lineTo(x+200,H-GROUND-190);g.stroke()}
      for(const p of s.pipes){
        const tw=46;
        const tower=(y1,y2,end)=>{g.fillStyle="#8d99a8";g.fillRect(p.x,y1,5,y2-y1);g.fillRect(p.x+tw-5,y1,5,y2-y1);
          g.strokeStyle="#9fabb9";g.lineWidth=3;for(let y=y1+16;y<y2-4;y+=26){g.beginPath();g.moveTo(p.x,y);g.lineTo(p.x+tw,y);g.stroke()}
          g.lineWidth=2;g.strokeStyle="#b3bdc9";for(let y=y1+16;y<y2-26;y+=26){g.beginPath();g.moveTo(p.x+4,y);g.lineTo(p.x+tw-4,y+26);g.stroke()}
          g.fillStyle="#c99a57";g.fillRect(p.x-6,end-4,tw+12,8);g.fillStyle="#9c7338";g.fillRect(p.x-6,end+3,tw+12,2)};
        tower(-10,p.top,p.top);tower(p.top+p.gp,H-GROUND,p.top+p.gp);
        if(p.gate&&!p.done){g.fillStyle="rgba(22,163,74,.16)";g.fillRect(p.x,p.top+4,tw,p.gp-8);g.fillStyle="#16a34a";g.beginPath();g.roundRect?g.roundRect(p.x-8,p.top+p.gp/2-11,tw+16,22,6):g.rect(p.x-8,p.top+p.gp/2-11,tw+16,22);g.fill();
          g.fillStyle="#fff";g.font="700 11px system-ui,sans-serif";g.textAlign="center";g.fillText("GATE",p.x+tw/2,p.top+p.gp/2+4)}
      }
      g.fillStyle="#cbb78c";g.fillRect(0,H-GROUND,W,GROUND);g.fillStyle="#b69f70";const go=s.dist%24;for(let x=-go;x<W;x+=24)g.fillRect(x,H-GROUND,12,4);
      /* Evia */
      g.save();g.translate(s.x,s.y);g.rotate(Math.max(-.4,Math.min(.9,s.v*.07)));
      if(s.shield||s.flash%8>3){g.strokeStyle="rgba(59,130,246,.55)";g.lineWidth=4;g.beginPath();g.arc(0,0,R+7,0,Math.PI*2);g.stroke()}
      g.fillStyle="#fff";g.strokeStyle=accent;g.lineWidth=4;g.beginPath();g.arc(0,0,R,0,Math.PI*2);g.fill();g.stroke();
      g.strokeStyle=accent;g.lineWidth=2.6;g.lineCap="round";g.beginPath();g.moveTo(-4.5,-4);g.lineTo(-4.5,2);g.moveTo(4.5,-4);g.lineTo(4.5,2);g.stroke();
      g.fillStyle="#2f6fcf";g.beginPath();g.arc(0,-R+3,R*.78,Math.PI,0);g.fill();g.fillRect(-R-2,-R+2,2*R+4,3.5);
      g.restore();
    }
    function step(now){
      raf=requestAnimationFrame(step);
      if(document.hidden){last=now;return}
      const dt=Math.min(2,(now-(last||now))/16.67);last=now;
      if(state==="ready"){s.t+=dt;s.y=H*.42+Math.sin(s.t*.08)*6;s.bg+=dt*speed();s.dist+=dt*speed();draw();return}
      if(state==="q"){draw();return}
      if(state==="over"){if(s.y<H-GROUND-R){s.v+=.5*dt;s.y=Math.min(H-GROUND-R,s.y+s.v*dt)}draw();return}
      const sp=speed()*dt;s.v=Math.min(9,s.v+.36*dt);s.y+=s.v*dt;s.bg+=sp;s.dist+=sp;if(s.flash>0)s.flash-=dt;
      for(const p of s.pipes)p.x-=sp;
      if(s.pipes.length&&s.pipes[s.pipes.length-1].x<W-210)addPipe(W+20);
      s.pipes=s.pipes.filter(p=>p.x>-70);
      for(const p of s.pipes){
        if(!p.done&&p.x+46<s.x-R){p.done=true;s.passed++;s.score++;wrap.querySelector(".fl-score").textContent=s.score;if(p.gate){ask();break}}
        if(s.flash<=0&&s.x+R-3>p.x&&s.x-R+3<p.x+46&&(s.y-R+3<p.top+4||s.y+R-3>p.top+p.gp-4)){if(hit())break;}
      }
      if(s.y>H-GROUND-R){s.y=H-GROUND-R;if(state==="play"&&!hit())s.v=-6}
      if(s.y<R){s.y=R;s.v=0}
      wrap.querySelector(".fl-shield").hidden=!s.shield;
      draw();
    }
    raf=requestAnimationFrame(step);
  }

  const RUN={brickle,crossword,flappy};
  function open(key){const g=GAMES.find(x=>x.key===key);if(!g||!RUN[key])return;const ctx=shell(g);RUN[key](ctx)}
  /* Bigger games live in their own files (site-run.js) and add themselves here. */
  function register(g,run,icon){if(!GAMES.some(x=>x.key===g.key))GAMES.push(g);RUN[g.key]=run;if(icon)ICONS[g.key]=icon}
  window.eviaGames={GAMES,open,register,finish,group,iconFor:k=>ICONS[k]||"",WORDS,CLUES,build,GATES,TRADE_GATES,score,esc,buzz,reduced};
})();
