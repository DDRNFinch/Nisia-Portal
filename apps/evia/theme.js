(function(){
  const THEMES={
    yellow:{label:"Yellow",accent:"#e7b900",soft:"#fff7d6",line:"#f1d878",ink:"#6e5c00",bg:"#fffdfa"},
    green:{label:"Green",accent:"#1fae5c",soft:"#e6f8ee",line:"#a9e2c2",ink:"#146238",bg:"#f8fcfa"},
    blue:{label:"Blue",accent:"#2f6fed",soft:"#e8f0ff",line:"#aecbfa",ink:"#1a3f91",bg:"#f8faff"},
    purple:{label:"Purple",accent:"#8b5cf6",soft:"#f2ecff",line:"#d2bdfb",ink:"#5b32b0",bg:"#fbf9ff"},
    pink:{label:"Pink",accent:"#ef5da8",soft:"#fdecf4",line:"#f7bcd9",ink:"#a52a6f",bg:"#fff9fc"},
    red:{label:"Red",accent:"#e2483d",soft:"#fdeceb",line:"#f5b6af",ink:"#a32921",bg:"#fff9f8"},
    orange:{label:"Orange",accent:"#f47c20",soft:"#fff1e6",line:"#fbc79a",ink:"#9a4a0b",bg:"#fffbf7"},
    teal:{label:"Teal",accent:"#0fa3a3",soft:"#e3f7f7",line:"#9edede",ink:"#0b6464",bg:"#f7fdfd"},
    midnight:{label:"Midnight",accent:"#334155",soft:"#eef1f6",line:"#c6cfdc",ink:"#1e293b",bg:"#f8fafc"},
    sky:{label:"Sky",accent:"#0ea5e9",soft:"#e3f5fd",line:"#a5dcf6",ink:"#075985",bg:"#f7fcff"},
    coral:{label:"Coral",accent:"#f26b5b",soft:"#feeeec",line:"#f9c1ba",ink:"#a13a2e",bg:"#fffaf9"},
    gold:{label:"Gold",accent:"#c99a2e",soft:"#faf3e0",line:"#e9d3a0",ink:"#7a5a12",bg:"#fffdf7"},
    forest:{label:"Forest",accent:"#2f7d4f",soft:"#e8f3ec",line:"#b3d6c0",ink:"#1d4f32",bg:"#f8fbf9"},
    rose:{label:"Rose",accent:"#d9466f",soft:"#fcebf0",line:"#f2b8c9",ink:"#97244a",bg:"#fff9fb"},
    navy:{label:"Navy",accent:"#24407a",soft:"#e9eef8",line:"#b8c6e3",ink:"#172a52",bg:"#f8f9fc"},
    graphite:{label:"Graphite",accent:"#4b5563",soft:"#eef0f3",line:"#cbd0d7",ink:"#1f2937",bg:"#f9fafb"},
    /* Legendary: the whole app in a gradient (or, for Site, hazard stripes), Evia's outline too (legendary.css). */
    rainbow:{label:"Rainbow",accent:"#8b5cf6",soft:"#f6f1ff",line:"#dccbfb",ink:"#5b32b0",bg:"#fffdfd",legendary:true,
      stops:["#ff4d4d","#ff9f1a","#ffd60a","#2ecc71","#2f80ed","#8b5cf6","#ff4d9a","#ff4d4d"]},
    neon:{label:"Neon",accent:"#ff2bd6",soft:"#fdeaff",line:"#f6a8ec",ink:"#9b0a82",bg:"#fdf8ff",legendary:true,stops:["#ff2bd6","#7a5cff","#00d9ff"]},
    site:{label:"Site",accent:"#ffc400",soft:"#fff4c7",line:"#e6b000",ink:"#1a1a1a",bg:"#fffcef",legendary:true,stripes:["#ffc400","#1a1a1a"]},
    galaxy:{label:"Galaxy",accent:"#6d4aff",soft:"#efeaff",line:"#c9bcff",ink:"#3b2399",bg:"#fbfaff",legendary:true,stops:["#24116e","#6d4aff","#c13cff","#ff6ec7"]},
    sunset:{label:"Sunset",accent:"#ff6b4a",soft:"#fff0ea",line:"#ffc2ae",ink:"#a3361c",bg:"#fffaf7",legendary:true,stops:["#ffb347","#ff6b4a","#e84a8a","#8e44ad"]}
  };
  /* A legendary colour's paint: a gradient across its colours, or hazard stripes. */
  const paintOf=t=>t.stripes?"repeating-linear-gradient(-45deg,"+t.stripes[0]+" 0 9px,"+t.stripes[1]+" 9px 18px)":t.stops?"linear-gradient(110deg,"+t.stops.join(",")+")":"";
  /* Evia's outline is an SVG line, so it gets an SVG gradient (or stripe pattern) of the same colours. */
  /* One for the colour in use (#evia-legend) and one for each legendary colour, for the store and the picker. */
  function legendDefs(t){
    let d=document.getElementById("evia-legend-defs");
    if(!d){if(!document.body)return;d=document.createElementNS("http://www.w3.org/2000/svg","svg");d.id="evia-legend-defs";d.setAttribute("aria-hidden","true");d.style.cssText="position:absolute;width:0;height:0;overflow:hidden";document.body.appendChild(d)}
    const one=(id,x)=>x.stripes?'<pattern id="'+id+'" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="'+x.stripes[0]+'"/><rect width="6" height="12" fill="'+x.stripes[1]+'"/></pattern>'
      :'<linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1">'+x.stops.map((c,i,a)=>'<stop offset="'+(i/(a.length-1))+'" stop-color="'+c+'"/>').join("")+'</linearGradient>';
    d.innerHTML="<defs>"+(t&&t.legendary?one("evia-legend",t):"")+Object.keys(THEMES).filter(k=>THEMES[k].legendary).map(k=>one("evia-legend-"+k,THEMES[k])).join("")+"</defs>";
  }
  /* Free for everyone and shown on the first-run pickers; the rest are unlocked in Rewards (rewards.js). */
  const FREE_THEMES=["yellow","green","blue"],FREE_SHAPES=["circle","squircle","cloud"];
  const KEY="evia7-theme";
  const PICKED_KEY="evia7-theme-picked";
  const SHAPE_KEY="evia7-shape";
  const SHAPE_PICKED_KEY="evia7-shape-picked";
  const SHAPES={
    circle:{label:"Circle",className:"circle"},
    squircle:{label:"Squircle",className:"squircle"},
    cloud:{label:"Cloud",className:"cloud",svg:true},
    splat:{label:"Splat",className:"splat",svg:true},
    gear:{label:"Gear",className:"gear",svg:true},
    oval:{label:"Oval",className:"oval",svg:true},
    hex:{label:"Hexagon",className:"hex",svg:true},
    shield:{label:"Shield",className:"shield",svg:true},
    ghost:{label:"Ghost",className:"ghost",svg:true},
    cat:{label:"Cat",className:"cat",svg:true},
    dog:{label:"Dog",className:"dog",svg:true},
    robot:{label:"Robot",className:"robot",svg:true},
    alien:{label:"Alien",className:"alien",svg:true},
    /* Advanced Evias (legendary): animated orbs, drawn by orbs.js. */
    "particle-aqua":{label:"Aqua particle",className:"particle-aqua",svg:true,orb:{style:"particle",c:"#3ee6ff",d:"#04141d"}},
    "particle-violet":{label:"Violet particle",className:"particle-violet",svg:true,orb:{style:"particle",c:"#b8a2ff",d:"#0f0a26"}},
    "particle-ember":{label:"Ember particle",className:"particle-ember",svg:true,orb:{style:"particle",c:"#ff9d52",d:"#1f0c03"}},
    "glass-aqua":{label:"Aqua glass",className:"glass-aqua",svg:true,orb:{style:"glass",c:"#4ff0e0",d:"#0a0b24"}},
    "glass-violet":{label:"Violet glass",className:"glass-violet",svg:true,orb:{style:"glass",c:"#c4a8ff",d:"#120a2a"}},
    "glass-ember":{label:"Ember glass",className:"glass-ember",svg:true,orb:{style:"glass",c:"#ffb066",d:"#1c0b06"}}
  };
  /* Outline shapes are drawn as SVG (0–100 box) behind Evia's eyes. "body" is filled and outlined. */
  const OUTLINES={
    cloud:{body:["M26 78C13 79 6 69 10 60C2 54 6 40 18 40C18 26 34 19 45 26C52 15 72 16 76 30C89 30 95 44 88 54C95 64 86 77 74 76C68 84 52 85 46 79C40 84 30 83 26 78Z"]},
    splat:{body:["M50 10C54.4 9.8 57.8 19.9 63.5 22.1C69.1 24.3 80.5 19.8 83.6 23.2C86.7 26.6 81.6 36.8 82.2 42.7C82.7 48.5 88.6 54.2 87 58.5C85.5 62.7 75.6 62.7 72.7 68.1C69.8 73.4 73.3 88.2 69.5 90.5C65.7 92.9 56.1 82.9 50 82C43.9 81.1 37 87.4 33.1 85.1C29.2 82.9 30.5 73 26.5 68.7C22.5 64.4 10.2 63.6 9.1 59.3C7.9 55.1 17.8 48.5 19.8 43.1C21.8 37.7 18.2 30.3 21.1 26.9C23.9 23.6 32.2 25.8 37 23C41.8 20.1 45.6 10.2 50 10Z"],dots:[[91,84,4],[12,84,3],[86,11,2.6]]},
    gear:{body:["M43.8 12.5L45.0 3.3A47 47 0 0 1 55.0 3.3L56.2 12.5A38 38 0 0 1 67.0 16.0L73.4 9.2A47 47 0 0 1 81.5 15.1L77.0 23.3A38 38 0 0 1 83.7 32.5L92.9 30.8A47 47 0 0 1 96.0 40.3L87.6 44.3A38 38 0 0 1 87.6 55.7L96.0 59.7A47 47 0 0 1 92.9 69.2L83.7 67.5A38 38 0 0 1 77.0 76.7L81.5 84.9A47 47 0 0 1 73.4 90.8L67.0 84.0A38 38 0 0 1 56.2 87.5L55.0 96.7A47 47 0 0 1 45.0 96.7L43.8 87.5A38 38 0 0 1 33.0 84.0L26.6 90.8A47 47 0 0 1 18.5 84.9L23.0 76.7A38 38 0 0 1 16.3 67.5L7.1 69.2A47 47 0 0 1 4.0 59.7L12.4 55.7A38 38 0 0 1 12.4 44.3L4.0 40.3A47 47 0 0 1 7.1 30.8L16.3 32.5A38 38 0 0 1 23.0 23.3L18.5 15.1A47 47 0 0 1 26.6 9.2L33.0 16.0A38 38 0 0 1 43.8 12.5Z"]},
    oval:{body:["M4 50A46 34 0 1 1 96 50A46 34 0 1 1 4 50Z"]},
    hex:{body:["M30 9Q28 9 27 10.7L8.2 47.4Q7 50 8.2 52.6L27 89.3Q28 91 30 91H70Q72 91 73 89.3L91.8 52.6Q93 50 91.8 47.4L73 10.7Q72 9 70 9Z"]},
    shield:{body:["M50 7C62 12 75 13 88 11Q91 11 91 14V47C91 71 74 86 51.5 94.5Q50 95 48.5 94.5C26 86 9 71 9 47V14Q9 11 12 11C25 13 38 12 50 7Z"]},
    /* Characters: parts behind the head (ears, antennae) come first, so the head's outline sits on top. */
    ghost:{body:["M18 90V46C18 24 32 8 50 8C68 8 82 24 82 46V90C78 94 74 94 71 89C68 84 64 84 61 89C58 94 54 94 50 89C46 94 42 94 39 89C36 84 32 84 29 89C26 94 22 94 18 90Z"]},
    cat:{body:["M14 44L15 11Q16 6 20.5 8.5L38 22Q50 18 62 22L79.5 8.5Q84 6 85 11L86 44Q92 56 88 68Q82 88 50 90Q18 88 12 68Q8 56 14 44Z"]},
    dog:{body:["M27 20C12 15 3 30 4.5 50C5.5 63 14 66 18.5 57C20 45 22 33 31 25Z","M73 20C88 15 97 30 95.5 50C94.5 63 86 66 81.5 57C80 45 78 33 69 25Z","M50 16C72 16 84 32 84 54C84 76 70 90 50 90C30 90 16 76 16 54C16 32 28 16 50 16Z"]},
    robot:{body:["M48.5 25V12H51.5V25Z","M5 48H13V66H5Q3 66 3 64V50Q3 48 5 48Z","M95 48H87V66H95Q97 66 97 64V50Q97 48 95 48Z","M20 24H80Q88 24 88 32V80Q88 88 80 88H20Q12 88 12 80V32Q12 24 20 24Z"],dots:[[50,9,4.5]]},
    alien:{body:["M34 17L25.5 6L28 4.4L36.5 15.4Z","M66 17L74.5 6L72 4.4L63.5 15.4Z","M50 14C75 14 92 28 92 46C92 66 70 90 50 90C30 90 8 66 8 46C8 28 25 14 50 14Z"],dots:[[25.5,5,4],[74.5,5,4]]}
  };
  /* An advanced Evia's still picture: a dark sphere with a glowing rim, and either particle rings or a glass sheen and
     a light line. orbs.js animates the larger ones (a canvas of particles, or the moving line). */
  let orbId=0;
  function orbSvg(name){
    const o=SHAPES[name].orb,id="evo"+(++orbId),glass=o.style==="glass";
    return '<span class="evia-outline evia-orb orb-'+o.style+'" data-orb="'+name+'" aria-hidden="true"><svg viewBox="0 0 100 100" focusable="false"><defs>'+
      '<radialGradient id="'+id+'b" cx="50%" cy="46%" r="55%"><stop offset="0" stop-color="'+o.d+'" stop-opacity="'+(glass?.55:.9)+'"/><stop offset=".78" stop-color="'+o.d+'"/><stop offset="1" stop-color="'+o.c+'" stop-opacity=".55"/></radialGradient>'+
      '<filter id="'+id+'g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter></defs>'+
      '<circle cx="50" cy="50" r="49" fill="url(#'+id+'b)"/>'+
      '<circle cx="50" cy="50" r="47.5" fill="none" stroke="'+o.c+'" stroke-width="3" filter="url(#'+id+'g)" opacity=".9"/>'+
      '<circle cx="50" cy="50" r="47.5" fill="none" stroke="'+o.c+'" stroke-width="1.4"/>'+
      (glass?'<path d="M22 26 A34 34 0 0 1 60 12" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".55"/><circle cx="72" cy="20" r="2" fill="#fff" opacity=".8"/>'+
        '<path class="orb-line" d="M6 66 H94" fill="none" stroke="'+o.c+'" stroke-width="1.6" stroke-linecap="round"/><path class="orb-line-glow" d="M6 66 H94" fill="none" stroke="'+o.c+'" stroke-width="4" stroke-linecap="round" filter="url(#'+id+'g)" opacity=".7"/>'
        :[20,34,48,62,76].map(y=>'<ellipse cx="50" cy="'+y+'" rx="'+Math.sqrt(Math.max(0,47*47-(y-50)*(y-50))).toFixed(1)+'" ry="'+(4+Math.abs(50-y)/9).toFixed(1)+'" fill="none" stroke="'+o.c+'" stroke-width=".9" stroke-dasharray=".6 2.4" stroke-linecap="round" opacity=".55"/>').join("")+
          [0,36,72,108,144].map(a=>'<ellipse cx="50" cy="50" rx="'+(47*Math.abs(Math.cos(a*Math.PI/180))).toFixed(1)+'" ry="47" fill="none" stroke="'+o.c+'" stroke-width=".9" stroke-dasharray=".6 2.4" stroke-linecap="round" opacity=".4"/>').join(""))+
      '</svg>'+(glass?"":'<canvas class="orb-cv"></canvas>')+'</span>';
  }
  function outlineSvg(name){
    if(SHAPES[name]&&SHAPES[name].orb)return orbSvg(name);
    const o=OUTLINES[name];if(!o)return"";
    return '<svg class="evia-outline" viewBox="0 0 100 100" aria-hidden="true" focusable="false">'+
      o.body.map(d=>'<path class="evia-outline-body" d="'+d+'"/>').join("")+
      (o.dots||[]).map(c=>'<circle class="evia-outline-body" cx="'+c[0]+'" cy="'+c[1]+'" r="'+c[2]+'"/>').join("")+
    '</svg>';
  }
  /* Every place Evia's face appears gets the outline for its shape: pickers use their own shape, everything else the learner's. */
  const HOSTS=".evia-fab,.evia-welcome-face,.target-evia,.evia-mini,.evia-shape-avatar,.evia-theme-avatar";
  function hostShape(el){const m=[...el.classList].find(c=>c.startsWith("shape-")&&c!=="shape-svg");return m&&SHAPES[m.slice(6)]?m.slice(6):(el.classList.contains("evia-shape-avatar")?null:currentShape())}
  function decorate(el){
    const name=el.classList.contains("evia-theme-avatar")?currentShape():hostShape(el);if(!name)return;
    const svg=SHAPES[name]&&SHAPES[name].svg;
    if(el.dataset.eviaOutline===(svg?name:"")&&(!svg||el.querySelector(":scope > .evia-outline")))return;
    const old=el.querySelector(":scope > .evia-outline");if(old)old.remove();
    [...el.classList].filter(c=>c.startsWith("evia-outline-")).forEach(c=>el.classList.remove(c));
    el.classList.toggle("evia-svg-shape",!!svg);
    const orb=SHAPES[name]&&SHAPES[name].orb;el.classList.toggle("evia-orb-host",!!orb);
    if(orb){el.style.setProperty("--orb",orb.c);el.style.setProperty("--evia-shape-stroke",orb.c)}else{el.style.removeProperty("--orb");el.style.removeProperty("--evia-shape-stroke")}
    el.dataset.eviaOutline=svg?name:"";
    if(svg){el.classList.add("evia-outline-"+name);el.insertAdjacentHTML("afterbegin",outlineSvg(name))}
  }
  function decorateAll(root){(root||document).querySelectorAll(HOSTS).forEach(decorate)}

  function applyTheme(name){
    const t=THEMES[name]||THEMES.yellow;
    const root=document.documentElement.style;
    root.setProperty("--yellow",t.accent);
    root.setProperty("--soft",t.soft);
    root.setProperty("--yellow-line",t.line);
    root.setProperty("--yellow-ink",t.ink);
    root.setProperty("--bg",t.bg);
    /* Buttons, bars and highlights take the gradient; Site keeps its yellow there (stripes behind words can't be read). */
    if(t.legendary&&!t.stripes)root.setProperty("--accent-fill",paintOf(t));else root.removeProperty("--accent-fill");
    if(t.legendary)root.setProperty("--evia-legend",paintOf(t));else root.removeProperty("--evia-legend");
    document.documentElement.toggleAttribute("data-evia-legendary",!!t.legendary);
    document.documentElement.setAttribute("data-evia-theme",THEMES[name]?name:"yellow");
    if(document.body)legendDefs(t);else document.addEventListener("DOMContentLoaded",()=>legendDefs(THEMES[currentTheme()]),{once:true});
  }
  function currentTheme(){return localStorage.getItem(KEY)||"yellow"}
  function currentShape(){const saved=({sun:"gear"})[localStorage.getItem(SHAPE_KEY)]||localStorage.getItem(SHAPE_KEY);return SHAPES[saved]?saved:"circle"}
  function setShape(name){
    if(!SHAPES[name])return;
    localStorage.setItem(SHAPE_KEY,name);
    document.documentElement.setAttribute("data-evia-shape",SHAPES[name].className);
    decorateAll();
  }
  function hasPickedShape(){return localStorage.getItem(SHAPE_PICKED_KEY)==="1"}
  function markShapePicked(){localStorage.setItem(SHAPE_PICKED_KEY,"1")}
  function setTheme(name){
    if(!THEMES[name])return;
    localStorage.setItem(KEY,name);
    applyTheme(name);
  }
  function hasPickedTheme(){return localStorage.getItem(PICKED_KEY)==="1"}
  function markPicked(){localStorage.setItem(PICKED_KEY,"1")}

  setShape(currentShape());
  applyTheme(currentTheme());
  new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(!(n instanceof Element))continue;if(n.matches(HOSTS))decorate(n);if(n.querySelector&&n.querySelector(HOSTS))decorateAll(n)}}).observe(document.body||document.documentElement,{childList:true,subtree:true});

  function faceMarkup(name,t,selected){
    const shape=currentShape(),lock=locked("colour",name);
    return '<button type="button" class="evia-theme-option'+(selected?" selected":"")+(lock?" locked":"")+'" data-theme="'+name+'" aria-label="'+t.label+' Evia'+(lock?", locked":"")+'" style="--opt-accent:'+t.accent+(t.legendary?';--opt-legend:'+paintOf(t):"")+'"'+(t.legendary?' data-legendary':"")+'>'+
      '<span class="evia-theme-avatar shape-'+SHAPES[shape].className+'"><span class="evia-face"><i></i><i></i></span></span>'+
      '<strong>'+t.label+'</strong>'+lockTag(lock)+
    '</button>';
  }

  function shapeMarkup(name,s,selected){
    const lock=locked("shape",name);
    return '<button type="button" class="evia-shape-option '+(selected?"selected":"")+(lock?" locked":"")+'" data-shape="'+name+'" aria-label="'+s.label+' Evia'+(lock?", locked":"")+'">'+
      '<span class="evia-shape-avatar shape-'+s.className+'"><span class="evia-face"><i></i><i></i></span></span>'+
      '<strong>'+s.label+'</strong>'+lockTag(lock)+
    '</button>';
  }
  /* Locked items show their rarity; the rarity and ownership live in rewards.js. */
  const R=()=>window.eviaRewards;
  function locked(kind,name){const r=R();return (r&&r.locked&&r.locked(kind,name))||false}
  const lockTag=lock=>lock?'<span class="evia-lock-tag r-'+lock+'"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="10.5" width="13" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>'+lock+'</span>':"";
  const firstRun=()=>!hasPickedShape()||!hasPickedTheme();

  function injectStyles(){
    if(document.getElementById("evia-theme-styles"))return;
    const style=document.createElement("style");
    style.id="evia-theme-styles";
    style.textContent=
      '#evia-theme-screen{position:fixed;inset:0;z-index:10050;background:var(--bg,#fffdfa);display:flex;flex-direction:column;align-items:center;padding:max(32px,env(safe-area-inset-top)) 24px max(32px,env(safe-area-inset-bottom));opacity:0;transition:opacity .4s ease;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}'+
      /* Centred when it fits, scrolls from the top when there are more shapes or colours than fit. */
      '#evia-theme-screen>.evia-theme-inner{margin:auto 0;flex:none}'+
      '#evia-theme-screen.visible{opacity:1}'+
      '#evia-theme-screen.leaving{opacity:0}'+
      '.evia-theme-inner{max-width:420px;width:100%;text-align:center;position:relative}'+
      '.evia-theme-close{position:fixed;top:22px;right:22px;width:38px;height:38px;border-radius:50%;background:#fff;border:1px solid #e9edf2;color:#7b8797;font-size:20px;line-height:1;cursor:pointer}'+
      '.evia-theme-kicker{font-size:11px;letter-spacing:.16em;color:#9aa3af;font-weight:800;margin-bottom:8px}'+
      '.evia-theme-inner h2{font-size:26px;margin:0 0 8px;letter-spacing:-.03em;color:#172033}'+
      '.evia-theme-inner p{font-size:14px;color:#7b8797;margin:0 0 26px;line-height:1.5}'+
      '.evia-theme-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}'+
      '.evia-theme-option{display:flex;flex-direction:column;align-items:center;gap:10px;padding:14px 6px;border-radius:20px;border:2px solid #edf0f4;background:#fff;cursor:pointer;box-shadow:0 4px 14px rgba(25,36,55,.05)}'+
      '.evia-theme-option.selected{border-color:var(--opt-accent)}'+
      '.evia-theme-option:active{transform:scale(.97)}'+
      '.evia-theme-avatar{width:64px;height:64px;background:var(--opt-accent);border:0;display:grid;place-items:center;position:relative;overflow:hidden}'+
      '.evia-theme-avatar:before{content:"";position:absolute;inset:4px;background:#fffdfa;z-index:0}'+
      '.evia-theme-avatar .evia-face{position:relative;z-index:1}'+
      '.evia-theme-avatar .evia-face i{border-color:var(--opt-accent)!important;background:transparent!important}'+
      '.evia-theme-avatar .evia-face i:after{background:var(--opt-accent)!important}'+
      '.evia-theme-avatar.shape-circle,.evia-theme-avatar.shape-circle:before,.evia-shape-avatar.shape-circle,.evia-shape-avatar.shape-circle:before{border-radius:50%}'+
      '.evia-theme-avatar.shape-squircle,.evia-theme-avatar.shape-squircle:before,.evia-shape-avatar.shape-squircle,.evia-shape-avatar.shape-squircle:before{border-radius:30%}'+
      '.evia-theme-option strong,.evia-shape-option strong{font-size:12px;font-weight:700;color:#273244}'+
      '.evia-shape-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}'+
      '.evia-shape-option{display:flex;flex-direction:column;align-items:center;gap:10px;padding:14px 6px;border-radius:20px;border:2px solid #edf0f4;background:#fff;cursor:pointer;box-shadow:0 4px 14px rgba(25,36,55,.05)}'+
      '.evia-shape-option.selected{border-color:var(--yellow)}'+
      '.evia-shape-option:active{transform:scale(.97)}'+
      '.evia-shape-avatar{width:64px;height:64px;background:var(--yellow);border:0;display:grid;place-items:center;position:relative;overflow:hidden}'+
      '.evia-shape-avatar:before{content:"";position:absolute;inset:4px;background:#fffdfa;z-index:0}'+
      '.evia-shape-avatar .evia-face{position:relative;z-index:1}'+
      '.shape-circle,.shape-circle:before{border-radius:50%}'+
      '.shape-squircle,.shape-squircle:before{border-radius:30%}'+
      '.evia-shape-avatar .evia-face i{border-color:var(--yellow)!important;background:transparent!important}'+
      '.evia-shape-avatar .evia-face i:after{background:var(--yellow)!important}'+
      '@media(max-width:380px){.evia-theme-grid,.evia-shape-grid{gap:10px}.evia-theme-avatar,.evia-shape-avatar{width:56px;height:56px}}'+
      '.evia-theme-dot{display:block;width:18px;height:18px;border-radius:50%;background:var(--yellow);border:2px solid #fff;box-shadow:0 0 0 1px var(--yellow-line)}'+
      '@media(max-width:380px){.evia-theme-grid{gap:10px}.evia-theme-avatar{width:56px;height:56px}}'+
      '.evia-shape-option,.evia-theme-option{position:relative}.evia-shape-option.locked .evia-shape-avatar,.evia-theme-option.locked .evia-theme-avatar{opacity:.45;filter:grayscale(.4)}'+
      '.evia-lock-tag{display:inline-flex;align-items:center;gap:3px;margin-top:-4px;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:800;text-transform:capitalize;color:#fff;background:#8792a2}'+
      '.evia-lock-tag svg{width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:2.4}'+
      '.evia-lock-tag.r-common{background:#8792a2}.evia-lock-tag.r-rare{background:#2f6fed}.evia-lock-tag.r-epic{background:#8b5cf6}.evia-lock-tag.r-legendary{background:linear-gradient(90deg,#e0a800,#f5c542);color:#3b2a00}'+
      '.evia-more{margin:18px 0 0!important;font-size:13px!important;color:#98a2b3!important}';
    document.head.appendChild(style);
  }

  function showShapePicker(onDone){
    injectStyles();
    const root=document.createElement("div");
    root.id="evia-theme-screen";
    const current=currentShape(),first=firstRun();
    root.innerHTML='<div class="evia-theme-inner">'+
      '<button type="button" class="evia-theme-close" id="evia-shape-close" aria-label="Close">\u00d7</button>'+
      '<div class="evia-theme-kicker">WELCOME TO EVIA</div>'+
      '<h2>Choose your Evia shape</h2>'+
      '<p>Pick the Evia shape you like. You can change it anytime from your profile.</p>'+
      '<div class="evia-shape-grid">'+Object.keys(SHAPES).filter(k=>!first||FREE_SHAPES.includes(k)).map(k=>shapeMarkup(k,SHAPES[k],k===current)).join("")+'</div>'+
      '<p class="evia-more">'+(first?"More shapes to unlock in Rewards as you learn.":"Locked shapes are unlocked in Rewards.")+'</p>'+
      '</div>';
    document.body.appendChild(root);
    requestAnimationFrame(()=>root.classList.add("visible"));
    const finish=name=>{
      if(name)setShape(name);
      markShapePicked();
      handoff(root,onDone);
    };
    root.querySelectorAll("[data-shape]").forEach(b=>b.onclick=()=>{if(b.classList.contains("locked")){finish(null);setTimeout(()=>R()&&R().openItem("shape-"+b.dataset.shape),350);return}finish(b.dataset.shape)});
    document.getElementById("evia-shape-close").onclick=()=>finish(null);
  }

  function showPicker(onDone){
    injectStyles();
    const root=document.createElement("div");
    root.id="evia-theme-screen";
    const current=currentTheme(),first=firstRun();
    root.innerHTML='<div class="evia-theme-inner">'+
      '<button type="button" class="evia-theme-close" id="evia-theme-close" aria-label="Close">\u00d7</button>'+
      '<div class="evia-theme-kicker">WELCOME TO EVIA</div>'+
      '<h2>Pick your Evia colour</h2>'+
      '<p>Choose a colour and Evia will use it throughout the app. You can change this anytime from your profile.</p>'+
      '<div class="evia-theme-grid">'+Object.keys(THEMES).filter(k=>!first||FREE_THEMES.includes(k)).map(k=>faceMarkup(k,THEMES[k],k===current)).join("")+'</div>'+
      '<p class="evia-more">'+(first?"More colours to unlock in Rewards as you learn.":"Locked colours are unlocked in Rewards.")+'</p>'+
      '</div>';
    document.body.appendChild(root);
    requestAnimationFrame(()=>root.classList.add("visible"));
    const finish=name=>{
      if(name)setTheme(name);
      markPicked();
      handoff(root,onDone);
    };
    root.querySelectorAll("[data-theme]").forEach(b=>b.onclick=()=>{if(b.classList.contains("locked")){finish(null);setTimeout(()=>R()&&R().openItem("colour-"+b.dataset.theme),350);return}finish(b.dataset.theme)});
    document.getElementById("evia-theme-close").onclick=()=>finish(null);
  }

  window.eviaThemes=THEMES;
  window.eviaThemePaint=name=>THEMES[name]?paintOf(THEMES[name]):"";
  window.eviaSetTheme=setTheme;
  window.eviaCurrentTheme=currentTheme;
  /* One full-screen step hands over to the next: the next one fades in on top, then the old one goes, so the app
     behind never flashes through. When nothing follows, the step just fades out. */
  function handoff(root,next){
    if(next)next();
    const newer=[...document.querySelectorAll("#evia-theme-screen,#evia-onboard-course")].some(el=>el!==root);
    if(newer){root.style.zIndex="10030";root.style.transition="none";setTimeout(()=>root.remove(),450);return}
    root.classList.add("leaving");setTimeout(()=>root.remove(),320);
  }
  window.eviaHandoff=handoff;
  window.eviaShowThemePicker=showPicker;
  window.eviaThemeHasBeenPicked=hasPickedTheme;
  window.eviaShapes=SHAPES;
  window.eviaSetShape=setShape;
  window.eviaCurrentShape=currentShape;
  window.eviaShowShapePicker=showShapePicker;
  window.eviaShapeHasBeenPicked=hasPickedShape;
  window.eviaFree={themes:FREE_THEMES,shapes:FREE_SHAPES};
  window.eviaOutlineSvg=outlineSvg;
})();