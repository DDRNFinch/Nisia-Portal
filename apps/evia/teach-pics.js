/* Evia7 Teach me pictures (window.EVIA_TEACH.pics). SVG, drawn here so they work offline and scale cleanly.
   Accuracy comes first: brickwork is drawn to real sizes (215 × 65 mm faces, 102.5 mm headers, 10 mm joints,
   75 mm courses) with the right laps and closers; safety signs follow ISO 7010 shapes and colours; PPE, plant
   and tools look like the real kit. The Evia colour is only used where colour carries no meaning. */
(function(){
  const T=window.EVIA_TEACH=window.EVIA_TEACH||{courses:{},fs:[]};
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const r=v=>Math.round(v*100)/100;
  /* The shading. Every picture uses the same soft gradients (ui.css points each material at one, with a flat colour
     as a fallback), so they're added to the page once rather than to each picture. Stops go from light to dark:
     top to bottom for boards and blades, left to right for round things like buckets and extinguishers. */
  const GRAD={
    sand:[0,"#f2d396",1,"#d8ac62"],wet:[0,"#a59e90",1,"#7a7468"],dry:[0,"#e2d6b6",1,"#bdae88"],
    steel:[0,"#f1f3f6",.45,"#c8ced6",1,"#98a1ac"],steeld:[0,"#a7b0bb",1,"#6d7682"],handle:[0,"#e8b675",1,"#b8773a"],
    wood:[0,"#f3cb8e",1,"#dba462"],wood2:[0,"#e6b273",1,"#c88a48"],conc:[0,"#dde0e4",1,"#b3b9c0"],block:[0,"#d0d5db",1,"#a9b0ba"],
    mach:[0,"#f3f5f7",1,"#c7cdd4"],insul:[0,"#f8e39a",1,"#e8c250"],roof:[0,"#8d96a1",1,"#666f7a"],
    white:[0,"#ffffff",1,"#d9dee5"],navy:[0,"#4d5b76",1,"#2b3549"],hivis:[0,"#fd9f4f",1,"#e5650c"],trou:[0,"#4a5163",1,"#2c313d"],
    glass:["d",0,"#f3fafe",.5,"#d4ebf7",1,"#b6d9ec"],
    bkt:["h",0,"#525a65",.3,"#3a4049",1,"#1e2227"],tubk:["h",0,"#4a515b",.3,"#343a42",1,"#1c2025"],
    red:["h",0,"#ef5f50",.35,"#d52b1e",1,"#9e1b11"],copper:["h",0,"#e8a068",.4,"#c8793c",1,"#96521f"],
    tarp:[0,"#4388d1",1,"#22579a"],sack:[0,"#f4eddf",1,"#d9cfbb"],hatb:[0,"#5a9be6",1,"#1f5eab"],
    /* Tools keep their real colours whatever the learner's theme: tool yellow, red rubber, dark forged steel, brass. */
    tool:[0,"#fde68f",.5,"#f2c12e",1,"#d29c10"],rubr:[0,"#ea5a48",1,"#a92a1c"],hhead:[0,"#5d646e",1,"#2c3138"],brass:[0,"#f1d489",1,"#b98f2e"],
    /* The Evia colour, for kit whose colour carries no meaning, follows the learner's theme. */
    yel:[0,"color-mix(in srgb,var(--yellow) 66%,#fff)",.5,"var(--yellow)",1,"color-mix(in srgb,var(--yellow) 88%,#000)"]
  };
  /* Textures laid over a material to make it read as the real thing: concrete aggregate, block speckle, soil, and the
     grain of timber along its length (h across the page, v up and down). */
  const PATTERNS='<pattern id="tpp-conc" width="18" height="16" patternUnits="userSpaceOnUse"><g fill="#7d848c" fill-opacity=".45"><circle cx="3" cy="4" r="1.1"/><circle cx="12" cy="2.5" r=".8"/><path d="M8 9 l2.4 -.6 l-.7 2.2 z"/><circle cx="15" cy="11" r="1"/><circle cx="4" cy="13" r=".7"/><path d="M13 14.5 l1.8 .2 l-1 1.3 z"/></g></pattern>'+
    '<pattern id="tpp-block" width="12" height="11" patternUnits="userSpaceOnUse"><g fill="#6d747d" fill-opacity=".35"><circle cx="2" cy="3" r=".7"/><circle cx="8" cy="1.6" r=".5"/><circle cx="6" cy="7" r=".8"/><circle cx="10.5" cy="9" r=".5"/><circle cx="1.5" cy="9.5" r=".5"/></g></pattern>'+
    '<pattern id="tpp-soil" width="16" height="12" patternUnits="userSpaceOnUse"><g fill="none" stroke="#5e4630" stroke-opacity=".38" stroke-width=".9" stroke-linecap="round"><path d="M2 3 h3 M10 2 h2.5 M6 8 h3.5 M13 9 h2 M1 11 h2"/></g></pattern>'+
    '<pattern id="tpp-grainh" width="90" height="12" patternUnits="userSpaceOnUse"><g fill="none" stroke="#8b5a2b" stroke-opacity=".22" stroke-width=".8"><path d="M0 3 C20 1.5 40 4.5 60 3 S85 1.8 90 3"/><path d="M0 8.5 C18 10 44 7 62 8.6 S84 9.8 90 8.5"/></g></pattern>'+
    '<pattern id="tpp-grainv" width="12" height="90" patternUnits="userSpaceOnUse"><g fill="none" stroke="#8b5a2b" stroke-opacity=".22" stroke-width=".8"><path d="M3 0 C1.5 20 4.5 40 3 60 S1.8 85 3 90"/><path d="M8.5 0 C10 18 7 44 8.6 62 S9.8 84 8.5 90"/></g></pattern>';
  function gradients(){
    return Object.keys(GRAD).map(k=>{let g=GRAD[k],dir="v";if(typeof g[0]==="string"){dir=g[0];g=g.slice(1)}
      const xy=dir==="h"?'x1="0" y1="0" x2="1" y2="0"':dir==="d"?'x1="0" y1="0" x2="1" y2="1"':'x1="0" y1="0" x2="0" y2="1"';let st="";
      for(let i=0;i<g.length;i+=2)st+='<stop offset="'+g[i]+'" style="stop-color:'+g[i+1]+'"/>';
      return '<linearGradient id="tpg-'+k+'" '+xy+'>'+st+'</linearGradient>'}).join("");
  }
  function defs(){
    if(typeof document==="undefined"||!document.body||document.getElementById("tp-defs"))return;
    const d=document.createElementNS("http://www.w3.org/2000/svg","svg");d.id="tp-defs";d.setAttribute("aria-hidden","true");d.setAttribute("focusable","false");
    d.style.cssText="position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";d.innerHTML="<defs>"+gradients()+PATTERNS+"</defs>";
    document.body.appendChild(d);
  }
  /* A picture with a view tag (section, plan, elevation) grows a 12 px band above the drawing for it, so the tag never
     sits on the drawing. The drawing keeps its coordinates, so tap spots don't move. */
  const BAND=12;
  const svg=(w,h,body,label,at)=>{defs();let o=(at||"0 0").split(" ").map(Number);
    if(body.indexOf('class="tp-view"')>=0){o[1]-=BAND;h+=BAND;body=body.replace(/(<text class="tp-view" x="[\d.]+" y=")[\d.-]+"/,"$1"+r(o[1]+9)+'"')}
    return '<svg class="tp" viewBox="'+o[0]+' '+o[1]+' '+w+' '+h+'" role="img" aria-label="'+esc(label)+'">'+body+'</svg>'};
  const t=(x,y,s,c)=>'<text x="'+x+'" y="'+y+'"'+(c?' class="'+c+'"':"")+'>'+esc(s)+'</text>';
  const t2=(x,y,a,b,c)=>'<text x="'+x+'" y="'+y+'"'+(c?' class="'+c+'"':"")+'>'+esc(a)+'<tspan x="'+x+'" dy="12">'+esc(b)+'</tspan></text>';
  let uid=0;
  const P={};

  /* ---------- Brickwork to scale ----------
     s is px per mm. faces(k) lists course k's faces in mm, laid from the left with 10 mm joints and cut off at the
     edge of the panel: 215 a stretcher, 102.5 a header or half bat, 46.25 a queen closer. */
  const rep=(a,n)=>Array.from({length:n},(_,k)=>a[k%a.length]);
  const BOND={
    stretcher:k=>k%2?[102.5].concat(rep([215],30)):rep([215],30),
    english:k=>k%2?[102.5,46.25].concat(rep([102.5],40)):rep([215],30),
    flemish:k=>k%2?[102.5,46.25].concat(rep([215,102.5],30)):rep([215,102.5],30),
    /* English garden wall: three stretcher courses (half bond) to one header course, closer after the quoin header. */
    garden:k=>k%4===3?[102.5,46.25].concat(rep([102.5],40)):k%4===1?[102.5].concat(rep([215],30)):rep([215],30)
  };
  const kind=f=>f===215?"":f===46.25?" tp-cl":f===102.5?" tp-hd":"";
  /* Each brick gets a thin outline in a deeper brick colour, thinner as the bricks get smaller, and none at all on
     walls drawn so small that it would hide the mortar. */
  const bw=s=>'<g class="tp-bw" style="stroke-width:'+(s>=.3?.8:s>=.18?.55:s>=.11?.4:0)+'">';
  function brickwork(x,y,w,courses,s,faces,o){
    o=o||{};const hdr=o.headers!==false;
    let out='<rect class="tp-mortar" x="'+r(x)+'" y="'+r(y)+'" width="'+r(w)+'" height="'+r(courses*75*s-10*s)+'"/>'+bw(s);
    for(let k=0;k<courses;k++){
      const cy=y+k*75*s;
      if(o.band)out+='<rect class="'+o.band(k)+'" x="'+r(x)+'" y="'+r(k?cy-10*s:cy)+'" width="'+r(w)+'" height="'+r(k?75*s:65*s)+'"/>';
      let at=0,j=0;const f=faces(k);
      while(at*s<w-.01&&j<f.length){
        const fw=Math.min(f[j],w/s-at);
        out+='<rect class="tp-b'+(1+(k*7+j*3+(k*j)%5)%3)+(hdr&&fw===f[j]?kind(f[j]):"")+'" x="'+r(x+at*s)+'" y="'+r(cy)+'" width="'+r(fw*s)+'" height="'+r(65*s)+'"/>';
        at+=f[j]+10;j++;
      }
    }
    return out+'</g>';
  }

  /* ---------- Buckets and tools ---------- */
  /* A black builder's bucket seen slightly from above. mode: level (struck off), heaped, under (not full), empty. */
  function bucket(cx,top,fill,mode,k,noShadow){
    const id="tpk"+(++uid);
    let g='<g transform="translate('+cx+' '+top+')'+(k&&k!==1?' scale('+k+')':"")+'">'+(noShadow?"":'<ellipse class="tp-shadow" cx="0" cy="40.5" rx="19" ry="3.2"/>')+'<ellipse class="tp-bin" cx="0" cy="0" rx="20" ry="6"/>';
    if(mode==="level"||mode==="heaped")g+='<ellipse class="'+fill+'" cx="0" cy=".4" rx="18.6" ry="4.9"/>';
    if(mode==="under")g+='<clipPath id="'+id+'"><ellipse cx="0" cy="0" rx="19" ry="5.3"/></clipPath><ellipse class="'+fill+'" clip-path="url(#'+id+')" cx="0" cy="7" rx="17.4" ry="4.6"/>';
    g+='<path class="tp-bkt" d="M-20 0 L-15 36 A15 4.5 0 0 0 15 36 L20 0 A20 6 0 0 1 -20 0 Z"/><path class="tp-bktl" d="M-17.5 7 L-13.5 33"/>';
    g+='<ellipse class="tp-rim" cx="0" cy="0" rx="20" ry="6"/>';
    if(mode==="heaped")g+='<path class="'+fill+' tp-edge" d="M-19 .5 Q0 -27 19 .5 A19 5.5 0 0 1 -19 .5 Z"/><path class="tp-rim" d="M20 0 A20 6 0 0 1 -20 0"/>';
    return g+'<path class="tp-wire" d="M-19 3 Q0 24 19 3"/></g>';
  }
  const shovel=(x,y,a,fill)=>'<g transform="translate('+x+' '+y+') rotate('+a+')"><path class="tp-grip" d="M0 -6 H-10 Q-14 -6 -14 -2 V2 Q-14 6 -10 6 H0"/><rect class="tp-wood" x="0" y="-2.2" width="64" height="4.4" rx="2"/>'+
    '<path class="tp-steel" d="M62 -4 L68 -9 H86 Q93 -9 93 -2 V2 Q93 9 86 9 H68 L62 4 Z"/>'+(fill?'<path class="'+fill+'" d="M71 -8 Q84 -16 91 -7 Z"/>':"")+'</g>';
  /* A brick trowel from the side, with mortar of the given kind on the blade. */
  function trowel(ox,oy,kind){
    const M={
      good:'<path class="tp-wet" d="M12 63.5 C13 50 25 40 39 40.5 C53 41 63 51 65 63.5 Z"/><path class="tp-sheen" d="M24 50 C30 44 40 43 48 45"/>',
      wet:'<path class="tp-wet" d="M3 63.5 C6 59 20 57.5 37 57.5 C54 57.5 66 59 72 63.5 Z"/><path class="tp-wet" d="M5 64 Q2.5 70 5 74 Q7.5 70 5 64 Z M70 64 Q67.5 71 70 76 Q72.5 71 70 64 Z M38 67 Q36 72 38 75 Q40 72 38 67 Z"/><ellipse class="tp-water" cx="37" cy="59.5" rx="20" ry="1.6" opacity=".7"/><ellipse class="tp-wet" cx="37" cy="84" rx="22" ry="2.6" opacity=".55"/>',
      dry:'<path class="tp-dry2" d="M15 63.5 L17 55 L22 51 L26 53 L30 45 L36 47 L41 43 L47 48 L52 49 L55 55 L59 57 L62 63.5 Z"/><path class="tp-crk" d="M29 48 L32 56 M45 46 L43 54 M53 52 L50 59"/><g class="tp-dry2"><circle cx="18" cy="72" r="1.8"/><circle cx="62" cy="70" r="1.6"/><circle cx="21" cy="80" r="1.4"/><circle cx="60" cy="79" r="1.8"/><circle cx="57" cy="86" r="1.2"/></g>'
    };
    return '<g transform="translate('+ox+' '+oy+')">'+(M[kind]||"")+'<path class="tp-steel" d="M2 63.5 L72 63.5 L72 66.5 L7 66.5 Z"/><path class="tp-shank" d="M70 65 L76 51 L81 51"/>'+
      '<path class="tp-wood" d="M80 46.5 L100 48.5 Q103.5 51 100 53.5 L80 55.5 Z"/><rect class="tp-steel" x="78" y="46" width="4" height="10" rx="1"/></g>';
  }
  /* A site worker in PPE (front view), feet at y. */
  function person(cx,y,o){
    o=o||{};const s=o.scale||1;
    return '<g transform="translate('+cx+' '+y+') scale('+s+')"><ellipse class="tp-shadow" cx="0" cy="0" rx="17" ry="2.6"/>'+
      '<path class="tp-trou" d="M-11 -44 H-1 L-1.5 -6 H-10.5 Z M1 -44 H11 L10.5 -6 H1.5 Z"/><path class="tp-boot" d="M-12 -7 H-1 V0 H-14 Q-14 -7 -12 -7 Z M1 -7 H12 Q14 -7 14 0 H1 Z"/>'+
      '<path class="tp-navy" d="M-13 -73 Q-10 -77 -4 -77 H4 Q10 -77 13 -73 L14 -42 H-14 Z"/>'+
      (o.arm==="up"?'<path class="tp-navy" d="M11 -72 L24 -84 L28 -80 L15 -66 Z"/><circle class="tp-nitrile" cx="27" cy="-84" r="3.4"/>':'<path class="tp-navy" d="M11 -72 Q17 -68 18 -58 L19 -46 H14 L13 -58 Z"/><circle class="tp-nitrile" cx="16.5" cy="-44" r="3.2"/>')+
      '<path class="tp-navy" d="M-11 -72 Q-17 -68 -18 -58 L-19 -46 H-14 L-13 -58 Z"/><circle class="tp-nitrile" cx="-16.5" cy="-44" r="3.2"/>'+
      '<path class="tp-hivis" d="M-12 -72 Q-9 -76 -5 -76 L-3 -70 H3 L5 -76 Q9 -76 12 -72 L13 -44 H-13 Z"/><rect class="tp-refl" x="-13" y="-57" width="26" height="3"/><rect class="tp-refl" x="-13" y="-50" width="26" height="3"/><rect class="tp-refl" x="-9" y="-74" width="3" height="17"/><rect class="tp-refl" x="6" y="-74" width="3" height="17"/>'+
      '<circle class="tp-head" cx="0" cy="-86" r="8.5"/><path class="tp-hat" d="M-9 -88 Q-9 -99 0 -99 Q9 -99 9 -88 Z"/><path class="tp-hat" d="M-11 -88.5 H11 V-86.5 H-11 Z"/></g>';
  }

  /* ---------- Tools and kit, in the Evia illustration style ----------
     Each is drawn in its own small space and placed with at(x,y,scale). A lighter line (tp-shine) catches the
     light along the top and a see-through darker shape (tp-shade) shades the lower side, like the reference art. */
  const at=(x,y,k,body,rot)=>'<g transform="translate('+r(x)+' '+r(y)+')'+(rot?' rotate('+rot+')':"")+(k&&k!==1?' scale('+k+')':"")+'">'+body+'</g>';
  /* A callout: the label at (tx,ty) with a thin leader line to the point (px,py), ending in a dot. The text sits on the
     side away from the point, so the line never runs through it. */
  const call=(label,tx,ty,px,py,cls,anch)=>{const right=anch?anch==="start":tx>=px,ex=right?tx-3:tx+3,ey=ty-3.4,L=String(label).split("\n");
    return '<path class="tp-lead" d="M'+r(px)+' '+r(py)+' L'+r(ex)+' '+r(ey)+'"/><circle class="tp-leaddot" cx="'+r(px)+'" cy="'+r(py)+'" r="1.7"/>'+
      '<text x="'+r(tx)+'" y="'+r(ty)+'" class="'+(cls||"tp-sm")+' tp-cl" style="text-anchor:'+(right?"start":"end")+'">'+esc(L[0])+'</text>'+
      L.slice(1).map((l,i)=>'<text x="'+r(tx)+'" y="'+r(ty+11*(i+1))+'" class="tp-xs tp-cl" style="text-anchor:'+(right?"start":"end")+'">'+esc(l)+'</text>').join("")};
  /* What kind of drawing it is (section, plan, elevation), in the top corner. */
  const view=(label,x,y)=>'<text class="tp-view" x="'+(x||4)+'" y="'+(y||10)+'">'+esc(label)+'</text>';
  const shadow=(cx,cy,rx,ry)=>'<ellipse class="tp-shadow" cx="'+r(cx)+'" cy="'+r(cy)+'" rx="'+r(rx)+'" ry="'+r(ry||rx/7)+'"/>';
  /* A thick line (a rail, a spindle, a pipe) with an outline: a darker, wider copy underneath. */
  const olLine=(cls,d,w,o)=>'<path class="tp-olw'+(o?" "+o:"")+'" style="stroke-width:'+r(w+2.4)+'" d="'+d+'"/><path class="'+cls+'" d="'+d+'"/>';
  /* A pencil, eraser end at 0 and the point at 70. */
  const pencil=()=>'<rect class="tp-eraser" x="0" y="-4" width="7" height="8" rx="2"/><rect class="tp-steel" x="6" y="-4.2" width="6" height="8.4"/>'+
    '<path class="tp-pen" d="M12 -4 H56 V4 H12 Z"/><path class="tp-shade" d="M12 1.3 H56 V4 H12 Z"/><path class="tp-woodtip" d="M56 -4 L68 -1 V1 L56 4 Z"/><path class="tp-lead2" d="M66 -1.4 L70 0 L66 1.4 Z"/>';
  /* ---------- Hand tools, drawn from real sizes in millimetres (place them with at(x,y,scale)) ---------- */
  /* A London pattern brick trowel from above: 280 mm blade (one straight edge, one curved), tip at 0, handle to 420. */
  const trowelTop=()=>'<path class="tp-steel" d="M0 0 L262 -52 Q282 -54 284 -34 V36 Q282 56 262 56 C190 50 80 26 0 0 Z"/>'+
    '<path class="tp-shade" d="M0 0 H284 V36 Q282 56 262 56 C190 50 80 26 0 0 Z"/><path class="tp-shine" d="M34 -5 L258 -46"/>'+
    '<path class="tp-steeld" d="M280 -10 H312 V10 H280 Z"/><rect class="tp-brass" x="308" y="-19" width="22" height="38" rx="6"/>'+
    '<path class="tp-wood" d="M328 -18 C352 -20 388 -22 406 -20 Q424 -18 424 0 Q424 18 406 20 C388 22 352 20 328 18 Z"/><path class="tp-shine" d="M340 -10 C360 -12 390 -13 408 -11"/>';
  /* A 600 mm box-section spirit level from the front: rubber end caps, hand holes, a plumb vial and a level vial. */
  const levelTool=()=>'<rect class="tp-tool" x="0" y="0" width="600" height="70" rx="8"/><path class="tp-shade" d="M4 46 H596 V62 Q596 70 588 70 H12 Q4 70 4 62 Z"/><path class="tp-shine" d="M40 12 H560"/>'+
    '<rect class="tp-cap" x="0" y="0" width="34" height="70" rx="8"/><rect class="tp-cap" x="566" y="0" width="34" height="70" rx="8"/>'+
    '<rect class="tp-slotd" x="150" y="20" width="84" height="30" rx="15"/><rect class="tp-slotd" x="366" y="20" width="84" height="30" rx="15"/>'+
    '<rect class="tp-vialw" x="256" y="13" width="88" height="44" rx="14"/><rect class="tp-vial" x="268" y="24" width="64" height="22" rx="11"/><circle class="tp-bub" cx="300" cy="35" r="7"/><path class="tp-vialx" d="M288 24 V46 M312 24 V46"/>'+
    '<rect class="tp-vialw" x="62" y="9" width="46" height="52" rx="12"/><rect class="tp-vial" x="74" y="16" width="22" height="38" rx="11"/><circle class="tp-bub" cx="85" cy="35" r="6"/><path class="tp-vialx" d="M74 29 H96 M74 41 H96"/>';
  /* A flat steel line pin from the side, 110 mm, point down. */
  const linePin=()=>'<path class="tp-steeld" d="M-16 0 H16 Q18 0 18 3 V11 H-18 V3 Q-18 0 -16 0 Z"/><path class="tp-steel" d="M-13 10 H13 L6 84 L0 110 L-6 84 Z"/><path class="tp-shade" d="M0 10 H13 L6 84 L0 110 Z"/><path class="tp-shine" d="M-7 18 L-3 80"/>';
  /* A 100 mm brick bolster, striking end at the top, 216 mm long: hexagon bar, rubber hand guard, wide fan-shaped blade. */
  const bolsterTool=()=>'<path class="tp-steel" d="M-9.5 146 C-10 165 -48 178 -50 192 V214 Q-50 216 -48 216 H48 Q50 216 50 214 V192 C48 178 10 165 9.5 146 Z"/>'+
    '<path class="tp-shade" d="M0 146 H9.5 C10 165 48 178 50 192 V214 Q50 216 48 216 H0 Z"/><path class="tp-edgel" d="M-50 205 H50"/>'+
    '<rect class="tp-steel" x="-9.5" y="10" width="19" height="140"/><path class="tp-facet" d="M-3.5 12 V148 M3.5 12 V148"/><path class="tp-shine" d="M-6.5 84 V144"/>'+
    '<path class="tp-steel" d="M-9.5 4 Q-9.5 0 -5.5 0 H5.5 Q9.5 0 9.5 4 V12 H-9.5 Z"/>'+
    '<path class="tp-guard2" d="M-13 26 C-18 27 -38 58 -38 72 V78 H38 V72 C38 58 18 27 13 26 Z"/><path class="tp-shade" d="M0 26 H13 C18 27 38 58 38 72 V78 H0 Z"/><path class="tp-shine" d="M-12 36 C-20 46 -27 58 -29 68"/>';
  /* A club hammer from the side, 260 mm: fibreglass handle with a rubber grip, and the heavy head across the end. */
  const clubHammer=()=>'<path class="tp-tool" d="M5 -15 C60 -15 150 -12.5 185 -12.5 C200 -12.5 208 -15 216 -16 V16 C208 15 200 12.5 185 12.5 C150 12.5 60 15 5 15 Q0 15 0 10 V-10 Q0 -15 5 -15 Z"/>'+
    '<path class="tp-rubber" d="M5 -16 C40 -16 80 -15.5 106 -15 V15 C80 15.5 40 16 5 16 Q0 16 0 11 V-11 Q0 -16 5 -16 Z"/><path class="tp-ribw" d="M22 -15 V15 M38 -15 V15 M54 -15 V15 M70 -15 V15 M86 -15 V15"/>'+
    '<path class="tp-shine" d="M112 -8 C140 -8.5 170 -8 200 -9"/>'+
    '<path class="tp-hhead" d="M220 -52 H255 L260 -47 V47 L255 52 H220 L215 47 V-47 Z"/><path class="tp-steel" d="M220 -52 H255 L260 -47 H215 Z M215 47 H260 L255 52 H220 Z"/>'+
    '<path class="tp-shine" d="M222 -40 V40"/><path class="tp-shade" d="M240 -47 H260 V47 H240 Z"/>';
  /* A sled-runner brick jointer, 250 mm, with its handle on two posts. */
  const jointerTool=()=>'<path class="tp-olk" stroke-width="16" d="M0 58 C24 58 28 26 60 26 H190 C222 26 226 58 250 58"/><path class="tp-stl" stroke-width="11" d="M0 58 C24 58 28 26 60 26 H190 C222 26 226 58 250 58"/>'+
    '<rect class="tp-steel" x="86" y="-4" width="12" height="28"/><rect class="tp-steel" x="152" y="-4" width="12" height="28"/>'+
    '<path class="tp-wood" d="M70 -8 Q70 -30 92 -30 H158 Q180 -30 180 -8 Q180 0 172 0 H78 Q70 0 70 -8 Z"/><path class="tp-shine" d="M86 -22 H164"/>';
  /* A work glove, back of the hand, fingers up: about 50 wide and 72 tall. */
  const gloveKit=()=>'<rect class="tp-glove" x="-20" y="8" width="9" height="36" rx="4.5"/><rect class="tp-glove" x="-10.5" y="2" width="9" height="40" rx="4.5"/>'+
    '<rect class="tp-glove" x="-1" y="5" width="9" height="38" rx="4.5"/><rect class="tp-glove" x="8.5" y="14" width="8" height="30" rx="4"/>'+
    '<path class="tp-glove" d="M-16 50 L-31 33 Q-34 28.5 -30.5 26 Q-27 24 -24.5 27.5 L-12 42 Z"/>'+
    '<path class="tp-glove" d="M-21 30 H17 V52 Q17 60 10 62 H-14 Q-21 60 -21 52 Z"/><path class="tp-shade" d="M4 31 H16 V52 Q16 59 10 61 H4 Z"/>'+
    '<path class="tp-seam" d="M-19 36 Q-2 39 15 36"/><rect class="tp-cuff" x="-19" y="60" width="34" height="12" rx="2.5"/>'+
    '<path class="tp-rib" d="M-14 62 V70 M-9 62 V70 M-4 62 V70 M1 62 V70 M6 62 V70 M11 62 V70"/>';
  /* Safety glasses from the front, 92 across. */
  const specsKit=()=>'<path class="tp-arm" d="M-38 -11 L-46 -6 M38 -11 L46 -6"/>'+
    '<path class="tp-goggle" d="M-38 -10 Q-38 -14 -32 -14 H-6 Q-3 -14 -3 -10 L-4 3 Q-6 12 -16 12 H-26 Q-38 12 -38 2 Z"/>'+
    '<path class="tp-goggle" d="M38 -10 Q38 -14 32 -14 H6 Q3 -14 3 -10 L4 3 Q6 12 16 12 H26 Q38 12 38 2 Z"/>'+
    '<path class="tp-brow" d="M-39 -13.5 Q0 -17 39 -13.5"/><path class="tp-arm" d="M-4 -7 Q0 -10 4 -7"/>'+
    '<path class="tp-glint" d="M-31 -8 L-25 -1 M-22 -9.5 L-19.5 -6.5 M13 -8 L19 -1 M22 -9.5 L24.5 -6.5"/>';
  /* A disposable FFP3 dust mask with a valve, from the front, 70 across. */
  const maskKit=()=>'<path class="tp-strapw" d="M-23 -8 L-35 -13 M23 -8 L35 -13 M-21 9 L-35 13 M21 9 L35 13"/>'+
    '<path class="tp-mask" d="M-24 -13 Q0 -22 24 -13 Q27 3 18 14 Q0 26 -18 14 Q-27 3 -24 -13 Z"/><path class="tp-shade" d="M0 -17.5 Q13 -16.5 24 -13 Q27 3 18 14 Q9 20.5 0 21.5 Z"/>'+
    '<path class="tp-seam" d="M0 -17.5 V21.5"/><path class="tp-clip" d="M-9 -16.5 Q0 -19.5 9 -16.5"/>'+
    '<circle class="tp-valve2" cx="0" cy="4" r="7.5"/><path class="tp-slots" d="M-3.5 1 H3.5 M-4.5 4 H4.5 M-3.5 7 H3.5"/>';
  /* A 25 kg paper sack of cement, 52 wide and 60 tall, with its printed band. */
  const cementSack=()=>'<path class="tp-sack" d="M1 8 H51 L52 54 Q52 59 47 59 H5 Q0 59 0 54 Z"/><path class="tp-shade" d="M34 8 H51 L52 54 Q52 59 47 59 H34 Z"/>'+
    '<path class="tp-sackt" d="M2 0 H50 L51 9 H1 Z"/><path class="tp-stitch" d="M3 7 '+Array.from({length:12},()=>'l2 -2 l2 2').join(" ")+'"/>'+
    '<rect class="tp-grey2" x="0" y="22" width="52" height="17"/><path class="tp-fold" d="M6 12 Q4 30 6 52"/>';
  /* A 5 litre can of plasticiser: body, handle, cap and label. */
  const jerryCan=()=>'<path class="tp-can" d="M0 14 Q0 8 6 8 H38 Q44 8 44 14 V52 Q44 58 38 58 H6 Q0 58 0 52 Z"/><path class="tp-shade" d="M30 8 H38 Q44 8 44 14 V52 Q44 58 38 58 H30 Z"/>'+
    '<rect class="tp-capk" x="5" y="0" width="12" height="9" rx="2"/><path class="tp-canh" d="M25 8 V2.5 H40 V8"/><rect class="tp-paper" x="6" y="22" width="32" height="20" rx="2"/><path class="tp-thin" d="M11 29 H33 M11 35 H28"/>';
  /* A wheelbarrow, wheel on the left, about 70 long, with an optional load. */
  const barrow=load=>shadow(30,27,32,3.2)+'<path class="tp-leg" d="M40 14 L43 26 M16 14 L18 20"/><path class="tp-leg" d="M44 5 L66 1"/><rect class="tp-gripk" x="62" y="-1.6" width="9" height="4.6" rx="2.3" transform="rotate(-10 66 1)"/>'+
    '<circle class="tp-tyre" cx="4" cy="18" r="7.2"/><circle class="tp-hubw" cx="4" cy="18" r="2.6"/><path class="tp-leg" d="M4 18 L14 9"/>'+
    '<path class="tp-barrow" d="M0 0 H52 L44 15 H11 Z"/><path class="tp-shade" d="M26 0 H52 L44 15 H26 Z"/>'+(load?'<path class="'+load+'" d="M5 .5 Q26 -13 47 .5 Z"/>':"")+'<path class="tp-rimb" d="M-1.5 0 H53.5"/>';
  /* A fire extinguisher, x its middle: red body, coloured band, valve and lever, hose or CO2 horn. */
  function extinguisher(x,band,co2){
    return shadow(x,101,19,3)+
      (co2?'<path class="tp-horn" d="M'+(x+6)+' 24 C'+(x+26)+' 24 '+(x+26)+' 40 '+(x+22)+' 60 L'+(x+30)+' 64 L'+(x+26)+' 52"/>':'<path class="tp-hosex" d="M'+(x+6)+' 24 C'+(x+24)+' 26 '+(x+24)+' 50 '+(x+20)+' 70"/><rect class="tp-exhead" x="'+(x+17.5)+'" y="68" width="5" height="7" rx="1.5"/>')+
      '<path class="tp-exbody" d="M'+(x-15)+' 37 Q'+(x-15)+' 29 '+(x-8)+' 29 H'+(x+8)+' Q'+(x+15)+' 29 '+(x+15)+' 37 V96 Q'+(x+15)+' 100 '+(x+11)+' 100 H'+(x-11)+' Q'+(x-15)+' 100 '+(x-15)+' 96 Z"/>'+
      '<rect class="'+band+'" x="'+(x-15)+'" y="47" width="30" height="15"/><path class="tp-shine" d="M'+(x-9)+' 35 V44 M'+(x-9)+' 66 V92"/>'+
      '<rect class="tp-exbase" x="'+(x-15)+'" y="94" width="30" height="6" rx="2"/>'+
      '<rect class="tp-exhead" x="'+(x-5)+'" y="19" width="10" height="11" rx="2"/><path class="tp-lever" d="M'+(x-5)+' 19 L'+(x+13)+' 13.5 L'+(x+14.5)+' 16.5 L'+(x-3)+' 22 Z"/>'+
      '<circle class="tp-gauge" cx="'+(x-8.5)+'" cy="24" r="3.2"/>';
  }

  /* A worker in PPE for mixing, front on (drawn in a 320 × 210 space). */
  const PPE=()=>'<ellipse class="tp-shadow" cx="160" cy="203" rx="40" ry="4"/>'+
      '<path class="tp-trou" d="M139 132 H158 L157 186 H141 Z M162 132 H181 L179 186 H163 Z"/>'+
      '<path class="tp-boot" d="M140 184 H157 V200 H134 Q134 188 140 184 Z M163 184 H180 Q186 188 186 200 H163 Z"/><path class="tp-toe" d="M134 196 H148 M172 196 H186"/>'+
      '<path class="tp-navy" d="M136 77 Q124 84 121 104 L115 128 H127 L132 106 Z M184 77 Q196 84 199 104 L205 128 H193 L188 106 Z"/>'+
      '<path class="tp-nitrile" d="M114 126 H128 V139 Q128 147 121 147 Q114 147 114 139 Z M192 126 H206 V139 Q206 147 199 147 Q192 147 192 139 Z"/>'+
      '<rect class="tp-head" x="153" y="60" width="14" height="12"/><path class="tp-navy" d="M136 77 Q140 70 150 69 H170 Q180 70 184 77 L186 134 H134 Z"/>'+
      '<path class="tp-hivis" d="M137 78 Q141 72 150 71 L154 80 H166 L170 71 Q179 72 183 78 L185 132 H135 Z"/><rect class="tp-refl" x="135" y="103" width="50" height="5"/><rect class="tp-refl" x="135" y="116" width="50" height="5"/><rect class="tp-refl" x="143" y="73" width="5" height="30"/><rect class="tp-refl" x="172" y="73" width="5" height="30"/>'+
      '<circle class="tp-head" cx="160" cy="46" r="17"/><path class="tp-strap" d="M143 50 H177"/><rect class="tp-lens" x="145" y="45" width="13" height="9" rx="3.5"/><rect class="tp-lens" x="162" y="45" width="13" height="9" rx="3.5"/>'+
      '<path class="tp-strap2" d="M150 57 L143 54 M170 57 L177 54"/><path class="tp-maskw" d="M149 56 Q160 52 171 56 L169 64 Q160 70 151 64 Z"/>'+
      '<path class="tp-hat" d="M142 40 Q142 22 160 22 Q178 22 178 40 Z"/><path class="tp-hat" d="M137 39.5 H183 Q183 44 179 44 H141 Q137 44 137 39.5 Z"/><path class="tp-thin" d="M160 23 V39"/>';
  /* ---------- Mixing mortar ---------- */
  Object.assign(P,{
    ingredients:()=>svg(320,122,
      shadow(54,98.5,50,3)+'<path class="tp-sand" d="M8 98 C22 70 38 56 54 56 C70 56 86 70 100 98 Z"/><g class="tp-grain"><circle cx="40" cy="80" r="1.2"/><circle cx="58" cy="70" r="1.2"/><circle cx="70" cy="86" r="1.2"/><circle cx="30" cy="92" r="1.2"/><circle cx="52" cy="90" r="1.2"/><circle cx="80" cy="92" r="1.2"/></g>'+
      shadow(142,98,31,3)+at(116,38,1,cementSack())+'<text class="tp-on" x="142" y="72.5">CEMENT</text><text class="tp-xs" x="142" y="90">25 kg</text>'+
      bucket(205,60,"tp-water","level")+
      shadow(272,98.5,27,3)+at(250,40,1,jerryCan())+
      t(54,116,"Sand")+t(142,116,"Cement")+t(205,116,"Water")+t(272,116,"Plasticiser"),
      "Building sand, a 25 kg bag of cement, a bucket of water and a tub of plasticiser"),
    ratio:()=>svg(320,112,
      '<g class="tp-pop" style="--d:0">'+bucket(36,40,"tp-cement","level")+'</g>'+t(76,68,":","tp-big")+
      [0,1,2,3].map(i=>'<g class="tp-pop" style="--d:'+(i+1)+'">'+bucket(116+i*50,40,"tp-sand","level")+'</g>').join("")+
      t(36,102,"1 cement")+t(191,102,"4 sand"),"A 1:4 mix: one bucket of cement to four buckets of sand, each filled level"),
    ratio3:()=>svg(320,110,
      bucket(30,46,"tp-cement","level",.72)+t(51,66,":","tp-mid")+bucket(72,46,"tp-lime","level",.72)+t(93,66,":","tp-mid")+
      [0,1,2,3,4,5].map(i=>bucket(116+i*33,46,"tp-sand","level",.72)).join("")+
      t2(30,90,"1","cement")+t2(72,90,"1","lime")+t2(198.5,90,"6","sand"),"A 1:1:6 mix: one bucket of cement, one of lime and six of sand"),
    level:()=>svg(72,82,bucket(36,26,"tp-sand","level",1.3),"A bucket of sand struck off level with the rim"),
    heaped:()=>svg(72,82,bucket(36,26,"tp-sand","heaped",1.3),"A bucket of sand heaped above the rim"),
    under:()=>svg(72,82,bucket(36,26,"tp-sand","under",1.3),"A bucket of sand that isn't filled to the rim"),
    strike:()=>svg(320,132,
      bucket(160,58,"tp-sand","level",1.7)+
      '<g class="tp-slide"><rect class="tp-wood" x="104" y="49" width="118" height="7" rx="1.5"/></g>'+
      '<g class="tp-fall tp-sand"><circle cx="203" cy="66" r="1.6"/><circle cx="207" cy="74" r="1.4"/><circle cx="204" cy="82" r="1.6"/></g><path class="tp-sand" d="M198 126 Q210 112 222 126 Z"/>'+
      '<path class="tp-arrow" d="M238 40 H262"/><path class="tp-arrowh" d="M258 35 L264 40 L258 45"/>'+t(262,28,"Strike off level"),
      "A bucket of sand struck off level with a timber straight edge, the extra falling away"),
    gauge:()=>svg(320,112,
      bucket(60,44,"tp-sand","level",1.2)+'<path class="tp-okm" d="M88 22 L94 28 L106 14"/>'+t(60,104,"Level: right")+
      bucket(160,44,"tp-sand","heaped",1.2)+'<path class="tp-cross" d="M186 14 L200 28 M200 14 L186 28"/>'+t(160,104,"Heaped: wrong")+
      bucket(260,44,"tp-sand","under",1.2)+'<path class="tp-cross" d="M286 14 L300 28 M300 14 L286 28"/>'+t(260,104,"Not full: wrong"),
      "Three buckets: struck off level is right, heaped or not full is wrong"),
    cracks:()=>{
      const s=.13,x1=12,x2=168,y=8,st=BOND.stretcher;
      const pts=[[895,0],[895,70],[782.5,70],[782.5,145],[670,145],[670,220],[557.5,220],[557.5,295],[445,295],[445,370],[332.5,370],[332.5,445],[220,445],[220,520],[107.5,520],[107.5,590]];
      const jag=[[560,0],[541,62],[572,118],[522,186],[548,254],[494,330],[514,402],[468,468],[492,536],[452,590]];
      const path=(x,p)=>"M"+p.map(q=>r(x+q[0]*s)+" "+r(y+q[1]*s)).join(" L");
      return svg(320,122,brickwork(x1,y,140,8,s,st,{headers:false})+'<path class="tp-crk" d="'+path(x1,pts)+'"/>'+
        brickwork(x2,y,140,8,s,st,{headers:false})+'<path class="tp-crk" d="'+path(x2,jag)+'"/>'+
        t(82,101,"Crack in the joints")+t(82,114,"mortar right: easy to repoint","tp-xs")+t(238,101,"Crack through bricks")+t(238,114,"mortar too strong","tp-xs"),
        "Two cracked walls: in one the crack steps along the mortar joints, in the other it splits the bricks");
    },
    banding:()=>svg(320,128,
      brickwork(10,8,240,6,.25,BOND.stretcher,{headers:false,band:k=>k<2?"tp-mortar":k<4?"tp-mortar2":"tp-mortar3"})+
      '<path class="tp-dim" d="M258 9 V42 M258 47 V80 M258 85 V118"/>'+t(290,29,"Batch 1")+t(290,67,"Batch 2")+t(290,104,"Batch 3"),
      "A wall where each batch of mortar dried a different colour, so the joints look patchy"),
    consistency:()=>svg(320,112,
      trowel(2,0,"wet")+trowel(108,0,"good")+trowel(214,0,"dry")+
      t(52,104,"Too wet")+t(158,104,"Just right","tp-ok")+t(264,104,"Too dry"),
      "Three trowels of mortar: too wet and running off, just right and holding its shape, and too dry and crumbly"),
    "trowel-wet":()=>svg(108,92,trowel(2,0,"wet"),"Mortar on a trowel, slumped flat and dripping off the edges"),
    "trowel-good":()=>svg(108,92,trowel(2,0,"good"),"Mortar on a trowel, holding a neat rounded shape"),
    "trowel-dry":()=>svg(108,92,trowel(2,0,"dry"),"Mortar on a trowel, crumbly and cracked with bits falling off"),
    hand1:()=>svg(320,118,
      '<path class="tp-ply" d="M44 90 H276 L294 104 H26 Z"/><path class="tp-ply2" d="M26 104 H294 V109 H26 Z"/>'+
      '<path class="tp-sand" d="M78 96 C98 66 130 54 160 54 C190 54 222 66 242 96 Z"/><path class="tp-cement" d="M126 60 C138 48 182 48 194 60 C184 66 136 66 126 60 Z"/>'+
      bucket(268,66,"","empty",.75),"Sand and cement gauged into a heap on a clean mixing board"),
    hand2:()=>svg(320,118,
      '<path class="tp-ply" d="M44 90 H276 L294 104 H26 Z"/><path class="tp-ply2" d="M26 104 H294 V109 H26 Z"/>'+
      '<path class="tp-dry" d="M78 96 C98 66 130 54 160 54 C190 54 222 66 242 96 Z"/>'+
      '<g class="tp-dig">'+shovel(252,34,152,"tp-dry")+'</g><path class="tp-arrow" d="M122 40 C136 24 170 22 188 34"/><path class="tp-arrowh" d="M181 28 L189 35 L179 38"/>',
      "The dry sand and cement turned over with a shovel until it's one even colour"),
    hand3:()=>svg(320,118,
      '<path class="tp-ply" d="M44 90 H276 L294 104 H26 Z"/><path class="tp-ply2" d="M26 104 H294 V109 H26 Z"/>'+
      '<path class="tp-dry" d="M78 96 C94 68 116 58 132 58 C138 62 148 64 160 64 C172 64 182 62 188 58 C204 58 226 68 242 96 Z"/><ellipse class="tp-water" cx="160" cy="61" rx="23" ry="4.2"/>'+
      '<g transform="translate(222 30) rotate(-58)">'+bucket(0,0,"tp-water","level",.8,true)+'</g><path class="tp-pour" d="M210 32 Q186 36 172 58"/>',
      "A well made in the middle of the dry mix, with water poured into it from a bucket"),
    hand4:()=>svg(320,118,
      '<path class="tp-ply" d="M44 90 H276 L294 104 H26 Z"/><path class="tp-ply2" d="M26 104 H294 V109 H26 Z"/>'+
      '<path class="tp-wet" d="M84 96 C100 70 130 60 160 60 C190 60 220 70 236 96 Z"/><path class="tp-sheen" d="M122 72 C140 64 172 64 192 70"/>'+
      '<path class="tp-arrow" d="M52 82 H80"/><path class="tp-arrowh" d="M75 77 L81 82 L75 87"/><path class="tp-arrow" d="M268 82 H240"/><path class="tp-arrowh" d="M245 77 L239 82 L245 87"/>'+
      '<g class="tp-dig">'+shovel(64,30,28,"tp-wet")+'</g>',"Wet mortar turned in from the edges until it's smooth and workable"),
    mixload:()=>{
      const steps=[["Some","water","tp-water"],["Half the","sand","tp-sand"],["All the","cement","tp-cement"],["Rest of","the sand","tp-sand"],["Top up","water","tp-water"]];
      return svg(320,104,steps.map((st,i)=>{const x=34+i*63;return '<circle class="tp-num" cx="'+x+'" cy="14" r="9"/>'+t(x,18,String(i+1),"tp-numt")+bucket(x,36,st[2],"level",.75)+t2(x,84,st[0],st[1])+(i<4?'<path class="tp-chev" d="M'+(x+26)+' 44 L'+(x+34)+' 50 L'+(x+26)+' 56"/>':"")}).join(""),
        "Loading a drum mixer: some water, half the sand, all the cement, the rest of the sand, then top up the water");
    },
    mixer:()=>svg(320,170,
      '<ellipse class="tp-shadow" cx="160" cy="161" rx="96" ry="5"/>'+
      '<path class="tp-frame" d="M150 104 L112 158 M150 104 L188 158 M124 141 H176"/><path class="tp-frame" d="M104 158 H120 M180 158 H196"/>'+
      '<path class="tp-shaft" d="M104 92 H126"/><circle class="tp-wheel3" cx="104" cy="92" r="15"/><path class="tp-shaft" d="M104 77 V107 M89 92 H119"/><circle class="tp-motor" cx="104" cy="92" r="3.5"/><circle class="tp-motor" cx="93" cy="81" r="3"/>'+
      '<rect class="tp-motor" x="124" y="84" width="54" height="26" rx="4"/><path class="tp-vent" d="M162 90 V104 M167 90 V104 M172 90 V104"/>'+
      '<g transform="translate(150 80) rotate(-32)"><path class="tp-drum2" d="M0 -30 C12 -34 22 -36 34 -36 L88 -18 L88 18 L34 36 C22 36 12 34 0 30 Z"/>'+
        '<g class="tp-spin"><path class="tp-band" d="M46 -32.5 L54 -30 V30 L46 32.5 Z"/><path class="tp-band" d="M66 -25.8 L73 -23.4 V23.4 L66 25.8 Z"/></g>'+
        '<rect class="tp-ring" x="17" y="-35.5" width="8" height="71" rx="2"/><path class="tp-teeth" d="M17 -28 H25 M17 -20 H25 M17 -12 H25 M17 -4 H25 M17 4 H25 M17 12 H25 M17 20 H25 M17 28 H25"/>'+
        '<ellipse class="tp-motor" cx="0" cy="0" rx="5" ry="30"/><ellipse class="tp-hole" cx="88" cy="0" rx="5" ry="18"/><ellipse class="tp-lip" cx="88" cy="0" rx="5" ry="18"/></g>'+
      '<path class="tp-cable" d="M178 104 C198 110 198 152 226 153 L252 153"/><rect class="tp-plug" x="252" y="145" width="24" height="16" rx="4"/><rect class="tp-plug" x="274" y="148" width="6" height="10" rx="1.5"/>'+t(266,138,"110 V","tp-xs"),
      "A drum mixer on its stand: the turning drum, the tipping wheel, the motor, and a yellow 110 V plug"),
    silo:()=>svg(320,200,
      '<ellipse class="tp-shadow" cx="150" cy="194" rx="118" ry="4"/>'+
      '<path class="tp-frame2" d="M100 110 L96 190 M128 110 L132 190"/><path class="tp-frame" d="M84 100 L76 190 M144 100 L152 190 M80 146 L148 186 M148 146 L80 186"/>'+
      '<path class="tp-silo2" d="M80 22 Q80 8 114 8 Q148 8 148 22 V104 L126 126 H102 L80 104 Z"/><path class="tp-thin" d="M80 36 H148 M80 70 H148"/>'+
      t(114,54,"DRY","tp-sm")+t(114,66,"MORTAR","tp-sm")+
      '<rect class="tp-steel" x="106" y="124" width="16" height="10"/><rect class="tp-steel" x="104" y="132" width="96" height="14" rx="7"/><rect class="tp-motor" x="86" y="128" width="22" height="22" rx="3"/>'+
      '<path class="tp-steel" d="M192 144 H202 V156 L198 160 H194 L192 156 Z"/><g class="tp-drop tp-wet"><circle cx="197" cy="164" r="2"/><circle cx="197" cy="170" r="1.6"/></g>'+
      at(172,172,.85,barrow("tp-wet"))+
      '<rect class="tp-motor" x="150" y="104" width="22" height="18" rx="2"/><circle class="tp-go" cx="161" cy="113" r="4.2"/><path class="tp-lead" d="M172 110 C190 110 196 94 214 94"/>'+
      '<path class="tp-pipe" d="M292 192 V120"/><path class="tp-pipe" d="M292 122 H282 V128"/><rect class="tp-motor" x="286" y="112" width="12" height="5" rx="2"/>'+
      '<path class="tp-hose" d="M282 128 C262 132 248 120 232 122 C216 124 206 128 196 132"/>',
      "A mortar silo: dry pre-blended mortar in the silo, a mixer at the bottom fed by a water hose, a control box, and mortar coming out into a barrow"),
    premix:()=>svg(320,120,
      shadow(54,100.5,44,3)+shadow(153,100.5,44,3)+'<path class="tp-tubk" d="M12 56 H96 L89 100 H19 Z"/><rect class="tp-lid" x="8" y="48" width="92" height="9" rx="3"/><rect class="tp-paper" x="36" y="66" width="36" height="17" rx="2"/><path class="tp-thin" d="M41 72 H67 M41 78 H61"/>'+
      '<path class="tp-tubk" d="M111 56 H195 L188 100 H118 Z"/><ellipse class="tp-wet" cx="153" cy="57" rx="41" ry="6"/><path class="tp-sheen" d="M134 56 C146 53 162 53 174 55"/>'+
      '<g transform="rotate(6 250 70)"><rect class="tp-paper" x="228" y="38" width="44" height="58" rx="2"/>'+t(250,52,"USE BY","tp-xs")+t(250,64,"Fri 4 pm","tp-xs")+'<path class="tp-thin" d="M234 74 H266 M234 81 H260 M234 88 H264"/></g>'+
      t(54,116,"Keep it covered")+t(153,116,"Ready to use")+t(258,116,"Check the ticket"),
      "Tubs of ready-to-use mortar, one with its lid on and one open, and a delivery ticket with a use-by time"),
    "ppe-person":()=>svg(320,210,PPE(),"A worker kitted up to mix mortar: hard hat, goggles, dust mask, long sleeves under a hi-vis vest, gloves and safety boots"),
    "ppe-close":()=>svg(124,196,PPE(),"A worker kitted up to mix mortar: hard hat, goggles, dust mask, long sleeves under a hi-vis vest, gloves and safety boots","98 12"),

    team:()=>svg(320,140,
      brickwork(12,72,104,7,.12,BOND.stretcher,{headers:false})+
      person(140,134,{arm:"up"})+
      at(194,108,.92,barrow("tp-wet"))+
      person(276,134)+
      '<path class="tp-bubble" d="M148 3 H300 Q306 3 306 9 V24 Q306 30 300 30 H172 L154 42 L162 30 H148 Q142 30 142 24 V9 Q142 3 148 3 Z"/>'+t(224,20,"More mortar in 30 mins?","tp-sm"),
      "A bricklayer at a wall asking the labourer, who has a barrow of mortar, for more mortar in half an hour"),
    "wall-est":()=>{
      const s=.052;
      return svg(320,130,brickwork(34,16,256,16,s,BOND.stretcher,{headers:false})+
        '<path class="tp-dim" d="M34 90 H290 M34 85 V95 M290 85 V95 M20 16 V77.9 M15 16 H25 M15 77.9 H25"/>'+t(162,106,"5 m")+'<text transform="rotate(-90 10 47)" x="10" y="47">1.2 m</text>'+
        t(162,124,"Half-brick wall: about 60 bricks per m²","tp-xs"),"A half-brick wall 5 metres long and 1.2 metres high");
    }
  });

  Object.assign(P,{
    /* One bucket of each material, for dragging into a mix. */
    "bucket-cement":()=>svg(48,48,bucket(24,8,"tp-cement","level",.92),"A bucket of cement"),
    "bucket-sand":()=>svg(48,48,bucket(24,8,"tp-sand","level",.92),"A bucket of sand"),
    "bucket-lime":()=>svg(48,48,bucket(24,8,"tp-lime","level",.92),"A bucket of lime"),
    "bucket-water":()=>svg(48,48,bucket(24,8,"tp-water","level",.92),"A bucket of water"),
    sandcover:()=>svg(320,112,
      '<g class="tp-rain">'+[[34,6],[62,14],[90,4],[118,12],[48,30],[104,28],[76,34],[132,32]].map(p=>'<path d="M'+p[0]+' '+p[1]+' l-3 10"/>').join("")+'</g>'+
      '<path class="tp-sandwet" d="M16 92 C32 64 54 54 78 54 C102 54 124 64 140 92 Z"/><ellipse class="tp-water" cx="58" cy="90" rx="14" ry="2.2" opacity=".8"/><ellipse class="tp-water" cx="108" cy="91" rx="10" ry="1.8" opacity=".8"/>'+
      '<path class="tp-sand" d="M180 92 C196 64 218 54 242 54 C266 54 288 64 304 92 Z"/><path class="tp-tarp" d="M174 94 C190 60 216 46 242 46 C268 46 294 60 310 94 Z"/><path class="tp-fold" d="M212 56 C224 68 230 80 232 92 M262 52 C258 66 258 80 262 92"/>'+
      '<rect class="tp-b2" x="170" y="86" width="22" height="8" rx="1"/><rect class="tp-b1" x="292" y="86" width="22" height="8" rx="1"/>'+
      t(78,108,"Left out: soaked")+t(242,108,"Covered: stays the same"),"Two heaps of sand: one left out in the rain and soaked, one kept under a sheet"),
    clock2h:()=>svg(320,112,
      '<circle class="tp-face2" cx="92" cy="52" r="40"/><path class="tp-arc" d="M92 52 L92 16 A36 36 0 0 1 123.2 34 Z"/>'+
      Array.from({length:12},(_,k)=>{const a=k*Math.PI/6,x1=92+Math.sin(a)*33,y1=52-Math.cos(a)*33,x2=92+Math.sin(a)*37,y2=52-Math.cos(a)*37;return '<path class="tp-tickc" d="M'+r(x1)+' '+r(y1)+' L'+r(x2)+' '+r(y2)+'"/>'}).join("")+
      '<path class="tp-hand2" d="M92 52 L92 22 M92 52 L109 42"/><circle class="tp-hub2" cx="92" cy="52" r="3"/>'+t(92,108,"About 2 hours")+
      '<path class="tp-arrow" d="M148 52 H176"/><path class="tp-arrowh" d="M171 47 L177 52 L171 57"/>'+
      shadow(242,86.5,46,3)+'<path class="tp-tubk" d="M192 40 H292 L284 86 H200 Z"/><ellipse class="tp-wet" cx="242" cy="41" rx="48" ry="6.5"/><path class="tp-crk" d="M222 40 L230 43 L226 46 M254 38 L262 42"/>'+t(242,108,"Setting? Mix fresh"),
      "A clock showing about two hours, then a tub of mortar starting to set: mix a fresh batch"),
  });

  /* ---------- Safety signs (ISO 7010 shapes and colours) ----------
     Blue circle: must do. Red ring and bar: must not. Yellow triangle: warning. Green square: safe condition.
     Red square: fire equipment. Each sign is 100 × 100. */
  const SIGN={
    eyes:['M004 Wear eye protection','<circle class="tp-sb" cx="50" cy="50" r="46"/><path class="tp-sw" d="M50 17 C38 17 31 26 31 38 C31 51 39 61 50 61 C61 61 69 51 69 38 C69 26 62 17 50 17 Z M23 84 C25 71 36 64 50 64 C64 64 75 71 77 84 Z"/><rect class="tp-sb" x="30" y="31" width="40" height="13" rx="6.5"/><rect class="tp-sw" x="34" y="33.5" width="14" height="8" rx="4"/><rect class="tp-sw" x="52" y="33.5" width="14" height="8" rx="4"/>'],
    hat:['M014 Wear head protection','<circle class="tp-sb" cx="50" cy="50" r="46"/><path class="tp-sw" d="M28 42 C28 24 38 14 50 14 C62 14 72 24 72 42 Z M23 43 H77 V49 H23 Z M35 52 C35 62 41 68 50 68 C59 68 65 62 65 52 Z M24 86 C26 76 36 71 50 71 C64 71 74 76 76 86 Z"/><path class="tp-sbl" d="M50 16 V40"/>'],
    gloves:['M009 Wear hand protection','<circle class="tp-sb" cx="50" cy="50" r="46"/><g class="tp-sw"><rect x="34" y="27" width="7.5" height="27" rx="3.75"/><rect x="42.5" y="21" width="7.5" height="31" rx="3.75"/><rect x="51" y="24" width="7.5" height="29" rx="3.75"/><rect x="59.5" y="31" width="7" height="23" rx="3.5"/><path d="M34 46 H66.5 V69 C66.5 75 62 79 56 79 H42 C37 79 34 75 34 70 Z"/><path d="M35 62 L23 48 C21 45.5 22 42.5 25 41.5 C27 41 29 42 30.5 44 L39 55 Z"/><rect x="36" y="80" width="28" height="9" rx="2"/></g>'],
    nosmoke:['P002 No smoking','<circle class="tp-sw" cx="50" cy="50" r="46"/><rect class="tp-sk" x="20" y="54" width="44" height="10"/><rect class="tp-sk" x="66" y="54" width="14" height="10"/><path class="tp-skl" d="M24 48 C19 42 28 38 24 31 C20 25 28 21 26 15"/><path class="tp-srl" d="M22 22 L78 78"/><circle class="tp-srl" cx="50" cy="50" r="41"/>'],
    nophone:['P013 No mobile phones','<circle class="tp-sw" cx="50" cy="50" r="46"/><rect class="tp-sk" x="37" y="20" width="26" height="60" rx="5"/><rect class="tp-sw" x="41" y="27" width="18" height="38" rx="1.5"/><circle class="tp-sw" cx="50" cy="72" r="3"/><path class="tp-srl" d="M22 22 L78 78"/><circle class="tp-srl" cx="50" cy="50" r="41"/>'],
    warn:['W001 General warning','<path class="tp-sy tp-syl" d="M50 9 L93 85 H7 Z"/><rect class="tp-sk" x="46" y="34" width="8" height="31" rx="4"/><circle class="tp-sk" cx="50" cy="74" r="5"/>'],
    electric:['W012 Warning: electricity','<path class="tp-sy tp-syl" d="M50 9 L93 85 H7 Z"/><path class="tp-sk" d="M55 30 L40 56 H50 L42 79 L39 76 L40 84 L47 80 L44 79 L60 50 H50 L59 30 Z"/>'],
    firstaid:['E003 First aid','<rect class="tp-sg" x="4" y="4" width="92" height="92" rx="4"/><path class="tp-sw" d="M38 18 H62 V38 H82 V62 H62 V82 H38 V62 H18 V38 H38 Z"/>'],
    eyewash:['E011 Eyewash station','<rect class="tp-sg" x="4" y="4" width="92" height="92" rx="4"/><path class="tp-sw" d="M16 40 Q50 12 84 40 Q50 68 16 40 Z"/><circle class="tp-sg" cx="50" cy="40" r="11"/><circle class="tp-sw" cx="50" cy="40" r="4.5"/><rect class="tp-sw" x="43" y="80" width="14" height="10" rx="2"/><path class="tp-swl" d="M47 79 Q42 66 38 56 M50 78 V58 M53 79 Q58 66 62 56"/>'],
    extinguisher:['F001 Fire extinguisher','<rect class="tp-sr" x="4" y="4" width="92" height="92" rx="4"/><g class="tp-sw"><rect x="30" y="34" width="22" height="50" rx="8"/><rect x="36" y="24" width="10" height="11" rx="2"/><path d="M36 26 L22 20 L24 16 L38 22 Z"/><path d="M68 84 C60 84 56 76 58 68 C60 62 64 60 64 52 C70 58 70 64 69 68 C72 66 73 62 72 58 C78 64 80 72 76 78 C74 82 71 84 68 84 Z"/></g><path class="tp-swl" d="M46 28 C56 26 60 34 60 44"/>']
  };
  Object.keys(SIGN).forEach(k=>{P["sign-"+k]=()=>svg(100,100,SIGN[k][1],SIGN[k][0])});
  const place=(k,x,y,sz)=>'<g transform="translate('+r(x-sz/2)+' '+r(y-sz/2)+') scale('+r(sz/100)+')">'+SIGN[k][1]+'</g>';
  Object.assign(P,{
    signs:()=>svg(320,98,["eyes","nosmoke","warn","firstaid","extinguisher"].map((k,i)=>place(k,34+i*63,40,54)).join("")+
      ["Must do","Must not","Warning","Safe","Fire kit"].map((l,i)=>t(34+i*63,88,l)).join(""),
      "The five kinds of safety sign: blue circle must do, red ring and bar must not, yellow triangle warning, green square safe condition, red square fire equipment"),
    signs4:()=>svg(320,84,["eyes","nosmoke","warn","firstaid"].map((k,i)=>place(k,44+i*77,42,66)).join(""),
      "Four safety signs: wear eye protection, no smoking, general warning and first aid")
  });

  /* ---------- Other units ---------- */
  const sbucket=(x,y,cls,heap)=>'<g transform="translate('+x+' '+y+')">'+(heap?'<path class="'+cls+'" d="M4 10 Q20 -12 36 10 Z"/>':"")+'<path class="'+cls+'" d="M4 10 H36 L32 46 H8 Z"/><path class="tp-line" d="M2 10 H38 M4 10 L8 46 H32 L36 10"/><path class="tp-thin" d="M6 10 Q20 -8 34 10"/></g>';
  const bondPanel=(x,label,sub,faces)=>'<g>'+brickwork(x,10,96,7,.12,faces)+t(x+48,88,label)+t(x+48,101,sub,"tp-xs")+'</g>';
  Object.assign(P,{
    tape:()=>svg(320,120,
      shadow(50,96,40,3)+'<rect class="tp-blade" x="78" y="52" width="228" height="22" rx="1"/><path class="tp-shine" d="M86 55 H302"/>'+Array.from({length:23},(_,k)=>'<path class="tp-tick" d="M'+(88+k*9.5)+' 52 V'+(k%5===0?66:59)+'"/>').join("")+
      '<path class="tp-steel" d="M303.5 48.5 H311 V77.5 H303.5 V74 H307 V52 H303.5 Z"/>'+
      '<rect class="tp-tape" x="14" y="30" width="70" height="62" rx="14"/><path class="tp-shade" d="M60 31 H70 Q83 31 83 44 V78 Q83 91 70 91 H60 Z"/>'+
      '<path class="tp-rubber" d="M14 74 H84 V78 Q84 92 70 92 H28 Q14 92 14 78 Z"/><rect class="tp-grip2" x="58" y="24.5" width="17" height="7" rx="2.5"/>'+
      '<circle class="tp-hubm" cx="49" cy="55" r="12"/><circle class="tp-screw" cx="49" cy="55" r="2.6"/>'+
      '<text x="88" y="90">0</text><text x="135.5" y="90">50</text><text x="183" y="90">100</text><text x="230.5" y="90">150</text><text x="278" y="90">200 mm</text>',"A tape measure marked in millimetres"),
    /* A room in plan, 4 m by 3 m, drawn to scale (40 px a metre). */
    area:()=>svg(320,154,'<rect class="tp-floor" x="80" y="10" width="160" height="120" rx="1"/>'+Array.from({length:3},(_,k)=>'<path class="tp-gridl" d="M'+(120+k*40)+' 10 V130"/>').join("")+Array.from({length:2},(_,k)=>'<path class="tp-gridl" d="M80 '+(50+k*40)+' H240"/>').join("")+
      '<rect class="tp-wallo" x="80" y="10" width="160" height="120"/>'+'<path class="tp-dim" d="M80 0 H240 M80 -4 V4 M240 -4 V4"/>'+t(160,-6,"4 m","tp-sm")+'<path class="tp-dim" d="M256 10 V130 M252 10 H260 M252 130 H260"/>'+t(276,74,"3 m","tp-sm"),
      "A room in plan 4 metres by 3 metres, with a 1 metre grid showing its 12 square metres","0 -20"),
    write:()=>svg(320,120,
      '<rect class="tp-page" x="70" y="10" width="180" height="104" rx="8"/>'+[0,1,2,3,4].map(k=>'<path class="tp-thin" d="M88 '+(34+k*16)+' H232"/>').join("")+
      '<text class="tp-hand" x="160" y="30">First, I checked the drawings.</text><text class="tp-hand" x="160" y="46">Then I set out the job.</text><text class="tp-hand" x="160" y="62">Finally, I checked the quality.</text>'+
      at(296,36,1,pencil(),116.6),"A neat write-up in full sentences"),
    heap:()=>svg(320,120,
      '<rect class="tp-board" x="20" y="88" width="280" height="10" rx="3"/><path class="tp-mix" d="M50 88 Q160 8 270 88 Z"/><ellipse class="tp-water" cx="160" cy="52" rx="34" ry="9"/>'+
      '<path class="tp-thin" d="M126 50 Q160 30 194 50"/><text x="160" y="116">A well in the middle for the water</text>',"A mixed heap on a board with a well of water"),
    ppe:()=>svg(320,120,
      at(70,26,1.02,gloveKit())+at(177,58,1,specsKit())+at(282,60,1,maskKit())+
      '<text x="68" y="116">Gloves</text><text x="177" y="116">Eye protection</text><text x="282" y="116">Dust mask</text>',"Gloves, eye protection and a dust mask"),
    /* Joint finishes in section: the face of the wall is on the left. */
    joints:()=>svg(320,124,view("Section")+[["Flush","",'<path class="tp-mortar" d="M0 34 H56 V50 H0 Z"/>'],["Half round","(bucket handle)",'<path class="tp-mortar" d="M0 34 H56 V50 H0 V49 A7.5 7.5 0 0 0 0 35 Z"/>'],["Weather","struck",'<path class="tp-mortar" d="M6 34 H56 V50 H0 Z"/>'],["Recessed","",'<path class="tp-mortar" d="M6 34 H56 V50 H6 Z"/>']].map((j,i)=>{const x=14+i*78;return '<g transform="translate('+x+' 4)"><rect class="tp-brick" x="0" y="0" width="56" height="34"/><rect class="tp-brick" x="0" y="50" width="56" height="34"/>'+j[2]+'<path class="tp-face" d="M0 -2 V86"/></g>'+t(x+28,102,j[0],"tp-sm")+(j[1]?t(x+28,114,j[1],"tp-xs"):"")}).join(""),"Joint finishes cut through the wall with the face on the left: flush, half round, weather struck and recessed"),
    /* The three main bonds, to scale, each with a stopped end on the left: half bats in stretcher bond, a header
       and queen closer starting the header courses of English bond and every other course of Flemish bond. */
    bonds:()=>svg(320,108,bondPanel(8,"Stretcher","half-brick wall",BOND.stretcher)+bondPanel(112,"English","one-brick wall",BOND.english)+bondPanel(216,"Flemish","one-brick wall",BOND.flemish),
      "Stretcher bond, English bond and Flemish bond, each with a stopped end on the left"),
    cavity:()=>{const M=scaler(108,132,.3),W=[0,102.5,152.5,252.5,352.5],zb=-70,zt=415;
      return svg(320,150,view("Section")+leaf(M,W[0],W[1],zb,zt,65,"tp-bu")+pir(M,W[2],W[3],zb,zt)+'<path class="tp-foil" d="M'+M.X(W[2])+' '+M.Y(220)+' H'+M.X(W[3])+'"/>'+
        leaf(M,W[3],W[4],zb,zt,215,"tp-block","tp-x-block")+dpcIn(M,W[0],W[1],-10)+dpcIn(M,W[3],W[4],-10)+wallTie(M,40,305,220,127.5,W[2])+
        call("Outer leaf: brick",98,30,M.X(51),M.Y(330))+call("Clear cavity",98,62,M.X(127.5),M.Y(290))+call("DPC",98,140,M.X(30),M.Y(-5))+
        call("Insulation",224,30,M.X(202.5),M.Y(330))+call("Inner leaf: block",224,62,M.X(302.5),M.Y(300))+call("Wall tie",224,100,M.X(127.5),+M.Y(220)+4.2),
        "A cavity wall cut through: a brick outer leaf and a block inner leaf, insulation boards held tight to the inner leaf, a clear cavity, a wall tie bedded in both leaves with its drip in the clear cavity, and the DPC in both leaves")},
  });
  /* ---------- Walls in section, to scale ----------
     A section cuts through a wall, so each leaf shows its courses: 65 mm bricks or 215 mm blocks, each on a 10 mm bed
     joint, coursed up from z = 0 (the top of a bed joint). Sizes are in millimetres; X and Y turn them into the picture. */
  const scaler=(ox,oy,s)=>({X:x=>r(ox+x*s),Y:z=>r(oy-z*s),s});
  function leaf(M,x1,x2,z1,z2,uh,cls,tex,base){
    const c=uh+10;base=base||0;z1-=base;z2-=base;const M0=M;M={X:M0.X,Y:z=>M0.Y(z+base),s:M0.s};let o='<rect class="tp-mortar" x="'+M.X(x1)+'" y="'+M.Y(z2)+'" width="'+r(M.X(x2)-M.X(x1))+'" height="'+r(M.Y(z1)-M.Y(z2))+'"/>';
    for(let k=Math.floor(z1/c)-1;k*c<z2;k++){const a=Math.max(z1,k*c),b=Math.min(z2,k*c+uh);
      if(b>a)o+='<rect class="'+cls+'" x="'+M.X(x1)+'" y="'+M.Y(b)+'" width="'+r(M.X(x2)-M.X(x1))+'" height="'+r(M.Y(a)-M.Y(b))+'"/>'}
    return o+(tex?'<rect class="'+tex+'" x="'+M.X(x1)+'" y="'+M.Y(z2)+'" width="'+r(M.X(x2)-M.X(x1))+'" height="'+r(M.Y(z1)-M.Y(z2))+'"/>':"");
  }
  /* A foil-faced insulation board in section. */
  const pir=(M,x1,x2,z1,z2)=>'<rect class="tp-pir" x="'+M.X(x1)+'" y="'+M.Y(z2)+'" width="'+r(M.X(x2)-M.X(x1))+'" height="'+r(M.Y(z1)-M.Y(z2))+'"/><path class="tp-foil" d="M'+M.X(x1)+' '+M.Y(z2)+' V'+M.Y(z1)+' M'+M.X(x2)+' '+M.Y(z2)+' V'+M.Y(z1)+'"/>';
  /* A stainless wall tie across the cavity at height z: ends bedded 50 mm+ in each leaf, falling slightly to the outer
     leaf, the drip at dx in the clear cavity, and (for partial fill) a clip holding the board at clipX. */
  const wallTie=(M,xa,xb,z,dripX,clipX)=>{const f=r(2.2*M.s*4);
    return '<path class="tp-tie2" d="M'+M.X(xa)+' '+r(+M.Y(z)+f)+' L'+M.X(dripX-12)+' '+r(+M.Y(z)+f*.55)+' L'+M.X(dripX)+' '+r(+M.Y(z)+f*.5+22*M.s)+' L'+M.X(dripX+12)+' '+r(+M.Y(z)+f*.45)+' L'+M.X(xb)+' '+M.Y(z)+'"/>'+
      (clipX!=null?'<rect class="tp-clip2" x="'+r(M.X(clipX)-3*M.s*3)+'" y="'+r(+M.Y(z)-22*M.s)+'" width="'+r(3*M.s*6)+'" height="'+r(44*M.s)+'" rx="1"/>':"");
  };
  const dpcIn=(M,x1,x2,z)=>'<rect class="tp-dpc2" x="'+r(M.X(x1)-1.5)+'" y="'+M.Y(z)+'" width="'+r(M.X(x2)-M.X(x1)+3)+'" height="'+r(Math.max(2,10*M.s))+'"/>';
  /* ---------- Bricklayer ---------- */
  const panel=(x,y,w,c,s,f,o)=>brickwork(x,y,w,c,s,f||BOND.stretcher,Object.assign({headers:false},o||{}));
  const dimV=(x,y1,y2,label,side)=>'<path class="tp-dim" d="M'+x+' '+y1+' V'+y2+' M'+(x-4)+' '+y1+' H'+(x+4)+' M'+(x-4)+' '+y2+' H'+(x+4)+'"/>'+t(x+(side||14),(y1+y2)/2+4,label,"tp-sm");
  const dimH=(y,x1,x2,label)=>'<path class="tp-dim" d="M'+x1+' '+y+' H'+x2+' M'+x1+' '+(y-4)+' V'+(y+4)+' M'+x2+' '+(y-4)+' V'+(y+4)+'"/>'+t((x1+x2)/2,y+14,label,"tp-sm");
  Object.assign(P,{
    protect:()=>svg(320,120,
      '<g class="tp-rain">'+[[40,6],[70,14],[100,4],[130,12],[250,6],[280,16],[222,12]].map(p=>'<path d="M'+p[0]+' '+p[1]+' l-3 10"/>').join("")+'</g>'+
      panel(90,40,140,4,.2)+'<path class="tp-tarp" d="M82 40 H238 V58 Q236 62 232 58 V44 H88 V58 Q86 62 82 58 Z"/>'+
      '<rect class="tp-wood" x="100" y="31" width="120" height="8" rx="1.5"/>'+t(160,114,"Cover new work, held clear of the face","tp-xs"),
      "A newly built wall with a waterproof sheet over the top, weighted down with a board, in the rain"),
    defects:()=>svg(320,110,panel(10,6,300,6,.2)+
      '<path class="tp-spall" d="M34 7.2 H73 V12 L66 16 L58 13 L50 17 L40 14 L34 16 Z"/>'+
      '<g class="tp-salt"><ellipse cx="140" cy="48" rx="22" ry="10"/><ellipse cx="165" cy="58" rx="16" ry="8"/><ellipse cx="128" cy="62" rx="12" ry="6"/></g>'+
      '<path class="tp-crk" d="M268 6 V20 H245.5 V35 H223 V50 H200.5 V65 H178 V80"/>'+
      '<path class="tp-erode" d="M40 79 H120 M40 94 H120 M62 79 V94 M107 79 V94"/>',
      "A brick wall with a spalled brick face, white efflorescence salts, a stepped crack and crumbling joints"),
    course75:()=>svg(320,130,panel(60,10,150,3,.5)+
      dimV(222,10,42.5,"",0)+t(262,30,"65 brick","tp-sm")+'<path class="tp-dim" d="M222 42.5 H232 M222 47.5 H232"/>'+t(262,50,"10 joint","tp-sm")+
      dimV(46,10,47.5,"",0)+t(26,32,"75","tp-sm")+t(135,126,"brick + joint = 75 mm a course","tp-xs"),
      "Three courses of brickwork: each course is a 65 millimetre brick and a 10 millimetre joint, 75 millimetres"),
    tools:()=>svg(320,128,
      at(6,30,.21,trowelTop())+at(106,24,.15,levelTool())+
      at(228,13,.26,linePin())+at(272,13,.26,linePin())+'<path class="tp-string" d="M231 22 Q250 24.5 269 22"/><path class="tp-wrap" d="M223.6 17.6 L232.4 19.4 M223.6 20.3 L232.4 22.1 M223.6 23 L232.4 24.8"/>'+
      at(20,88,.26,bolsterTool(),-90)+at(112,88,.3,clubHammer())+at(222,80,.24,jointerTool())+
      t(50,56,"Trowel","tp-xs")+t(151,52,"Spirit level","tp-xs")+t(250,58,"Line and pins","tp-xs")+t(48,122,"Bolster","tp-xs")+t(151,122,"Club hammer","tp-xs")+t(252,122,"Jointer","tp-xs"),
      "Bricklaying hand tools: trowel, spirit level, line and pins, bolster, club hammer and jointer"),
    coping:()=>svg(320,124,view("Section")+panel(120,52,80,3,.26,BOND.english)+
      '<path class="tp-dpc" d="M116 51 H204"/><path class="tp-coping" d="M104 50 V40 L160 26 L216 40 V50 Z"/><path class="tp-dripg" d="M112 50 a3 3 0 0 0 6 0 M202 50 a3 3 0 0 0 6 0"/>'+
      '<g class="tp-drop2"><circle cx="110" cy="62" r="2"/><circle cx="110" cy="74" r="2"/><circle cx="210" cy="62" r="2"/><circle cx="210" cy="74" r="2"/></g>'+
      call("Drip",86,64,115,52)+call("DPC",240,64,204,51)+t(160,118,"Water drips clear of the wall face","tp-xs"),
      "A coping on top of a brick wall, with a DPC underneath and drips under each overhang so water falls clear of the face"),
    /* Checking a corner is square: lines 3 m and 4 m from the corner peg, 5 m across. Drawn to scale (32 px a metre). */
    square345:()=>{const A=[64,112],B=[64+128,112],C=[64,112-96],peg=(p)=>'<rect class="tp-peg2" x="'+(p[0]-4)+'" y="'+(p[1]-4)+'" width="8" height="8" rx="1.2"/>';
      return svg(320,130,view("Plan")+'<path class="tp-tri" d="M'+A+' L'+B+' L'+C+' Z"/><path class="tp-string2" d="M'+B+' H300 M'+C+' V4"/><path class="tp-string" d="M'+A+' L'+B+' M'+A+' L'+C+' M'+B+' L'+C+'"/>'+
        '<path class="tp-thin" d="M64 100 H76 V112"/>'+peg(A)+peg(B)+peg(C)+
        t(128,126,"4 m","tp-sm")+t(46,68,"3 m","tp-sm")+t(138,58,"5 m","tp-sm")+t(258,56,"3, 4, 5 means","tp-xs")+t(258,68,"a right angle","tp-xs"),
        "A corner set out with lines: 3 metres one way, 4 metres the other, and 5 metres across means the corner is square")},
    /* Piers in plan, one course seen from above, to scale. The attached pier is bonded in: three headers run from the
       back of the half-brick wall right into the pier, and a stretcher and a half bat finish its face. The isolated pier
       is a one-brick pier: two stretchers side by side (the next course turns them round). */
    piers:()=>{const k=.22,B=(x,y,w,h,ox,oy)=>'<rect class="tp-bplan" x="'+r(ox+x*k)+'" y="'+r(oy+y*k)+'" width="'+r(w*k)+'" height="'+r(h*k)+'"/>';
      const ax=12,ay=22,m=(x,y,w,h,ox,oy)=>'<rect class="tp-mortar" x="'+r(ox+x*k)+'" y="'+r(oy+y*k)+'" width="'+r(w*k)+'" height="'+r(h*k)+'"/>';
      let A=m(0,0,900,102.5,ax,ay)+m(276.25,0,347.5,327.5,ax,ay);
      [[0,51.25],[61.25,215],[623.75,215],[848.75,51.25]].forEach(b=>{A+=B(b[0],0,b[1],102.5,ax,ay)});
      [286.25,398.75,511.25].forEach(x=>{A+=B(x,0,102.5,215,ax,ay)});
      A+=B(286.25,225,215,102.5,ax,ay)+B(511.25,225,102.5,102.5,ax,ay);
      const ix=240,iy=34;let I=m(0,0,215,215,ix,iy)+B(0,0,215,102.5,ix,iy)+B(0,112.5,215,102.5,ix,iy);
      return svg(320,130,view("Plan: one course")+A+I+
        t(111,110,"Attached pier","tp-sm")+t(111,122,"headers bond it into the wall","tp-xs")+t(264,110,"Isolated pier","tp-sm")+t(264,122,"stands on its own","tp-xs"),
        "Plans of one course: an attached pier bonded into a half-brick wall by three headers running into it, and a one-brick isolated pier of two stretchers")},
    "garden-bond":()=>svg(320,112,'<g>'+brickwork(70,8,180,8,.12,BOND.garden)+'</g>'+t(160,94,"English garden wall bond")+t(160,107,"3 stretcher courses, then a header course","tp-xs"),
      "English garden wall bond: three courses of stretchers, then a course of headers"),
    soldier:()=>{const s2=.14,W=140,n=Math.floor(W/(75*s2)),row=(x,y,h,k0)=>bw(s2)+Array.from({length:n},(_,k)=>'<rect class="tp-b'+(1+(k+k0)%3)+'" x="'+r(x+k*75*s2)+'" y="'+r(y)+'" width="'+r(65*s2)+'" height="'+r(h*s2)+'"/>').join("")+'</g>';
      return svg(320,122,view("Elevation")+panel(16,6,W,2,s2)+'<rect class="tp-mortar" x="16" y="'+r(6+2*75*s2-10*s2)+'" width="'+W+'" height="'+r(225*s2+2)+'"/>'+row(16,6+2*75*s2,215,0)+panel(16,r(6+2*75*s2+225*s2),W,2,s2)+
        '<rect class="tp-mortar" x="168" y="'+r(28-10*s2)+'" width="'+W+'" height="'+r(112.5*s2+1)+'"/>'+row(168,28,102.5,1)+panel(168,r(28+112.5*s2),W,4,s2)+
        t(86,112,"Soldier course: on end","tp-sm")+t(238,112,"Brick-on-edge capping","tp-sm"),"A soldier course of bricks stood on end in a wall, and a brick-on-edge capping along the top of a wall")},
    /* DPC height in section: both leaves coursed from the DPC, the DPC 150 mm above the finished ground, and the cavity
       filled with concrete below ground to 225 mm under the DPC. 1:5ish, sizes in millimetres. */
    dpc150:()=>{const M=scaler(118,52,.2),zb=-360,zt=260,W=[0,102.5,202.5,302.5];
      const box=(x1,x2,z1,z2,c)=>'<rect class="'+c+'" x="'+M.X(x1)+'" y="'+M.Y(z2)+'" width="'+r(M.X(x2)-M.X(x1))+'" height="'+r(M.Y(z1)-M.Y(z2))+'"/>';
      return svg(320,130,view("Section")+box(-330,W[0],zb,0,"tp-soil")+box(-330,W[0],zb,0,"tp-x-soil")+box(W[3],W[3]+300,zb,0,"tp-soil")+box(W[3],W[3]+300,zb,0,"tp-x-soil")+
        box(W[1],W[2],zb,-75,"tp-conc")+box(W[1],W[2],zb,-75,"tp-x-conc")+
        leaf(M,W[0],W[1],zb,zt,65,"tp-bu",null,150)+leaf(M,W[2],W[3],zb,zt,215,"tp-block","tp-x-block",150)+dpcIn(M,W[0],W[1],140)+dpcIn(M,W[2],W[3],140)+
        '<path class="tp-ground" d="M'+M.X(-330)+' '+M.Y(0)+' H'+M.X(W[0])+' M'+M.X(W[3])+' '+M.Y(0)+' H'+M.X(W[3]+300)+'"/>'+
        '<path class="tp-dim" d="M'+M.X(-60)+' '+M.Y(0)+' V'+M.Y(150)+' M'+r(M.X(-60)-4)+' '+M.Y(150)+' H'+r(M.X(-60)+4)+' M'+r(M.X(-60)-4)+' '+M.Y(0)+' H'+r(M.X(-60)+4)+'"/>'+
        '<text class="tp-sm" x="'+r(M.X(-60)-6)+'" y="'+r(M.Y(75)+2)+'" style="text-anchor:end">150 mm</text><text class="tp-xs" x="'+r(M.X(-60)-6)+'" y="'+r(M.Y(75)+13)+'" style="text-anchor:end">at least</text>'+
        call("DPC",238,22,M.X(W[3]),M.Y(145))+call("Ground level",238,52,M.X(W[3]+220),M.Y(0))+call("Cavity fill",238,98,M.X(152),M.Y(-200)),
        "A cavity wall cut through at ground level: the DPC in both leaves at least 150 millimetres above the ground, and the cavity filled with concrete below ground")},

    gaugerod:()=>{let m="";for(let k=0;k<=13;k++){const y=116-k*7.5;m+='<path class="tp-tickc" d="M150 '+y+' H'+(k%4===0?166:160)+'"/>'}
      return svg(320,124,'<rect class="tp-wood" x="146" y="10" width="14" height="108"/>'+m+'<path class="tp-mark" d="M146 71 H178 M146 26 H178"/>'+t(214,74,"Sill height")+t(218,29,"Lintel bearing")+t(96,119,"Ground / DPC","tp-xs")+t(84,56,"A mark every","tp-xs")+t(84,68,"course (75 mm)","tp-xs"),
      "A timber gauge rod with a mark every 75 millimetre course and the sill and lintel heights marked")},
    /* UK fire extinguishers: all red, with a coloured band. */
    extinguishers:()=>svg(320,124,[["Water","tp-exw"],["Foam","tp-exf"],["CO2","tp-exc"],["Powder","tp-exp"]].map((e,i)=>{const x=40+i*80;
      return extinguisher(x,e[1],e[0]==="CO2")+t(x,116,e[0])}).join(""),
      "Four red fire extinguishers with coloured bands: water red, foam cream, CO2 black with a horn, and dry powder blue"),
    opening:()=>{const s2=.13,L=110-150*s2,LW=100+300*s2,n=Math.floor(LW/(75*s2));return svg(320,146,view("Elevation")+panel(20,6,280,14,s2)+'<rect class="tp-hole2" x="110" y="45" width="100" height="62"/>'+
      '<rect class="tp-lintel" x="'+r(L)+'" y="36" width="'+r(LW)+'" height="9"/><rect class="tp-mortar" x="'+r(L)+'" y="7" width="'+r(LW)+'" height="29"/>'+
      bw(s2)+Array.from({length:n},(_,k)=>'<rect class="tp-b'+(1+k%3)+'" x="'+r(L+(LW-n*75*s2+10*s2)/2+k*75*s2)+'" y="8" width="'+r(65*s2)+'" height="'+r(215*s2)+'"/>').join("")+'</g>'+
      '<rect class="tp-sill" x="104" y="107" width="112" height="10"/><rect class="tp-weep" x="129.5" y="30" width="2" height="5"/><rect class="tp-weep" x="188" y="30" width="2" height="5"/>'+
      dimH(128,r(L),110,"150")+dimH(128,210,r(210+150*s2),"150")+t(160,80,"Opening","tp-xs"),
      "A window opening in brickwork: a lintel with a soldier course above, 150 millimetre bearings at each end, a brick-on-edge sill and weep holes")},
    movement:()=>svg(320,120,view("Elevation")+panel(20,8,128,6,.2)+panel(158,8,142,6,.2,k=>k%2?rep([215],30):[102.5].concat(rep([215],30)))+
      '<rect class="tp-filler" x="148" y="8" width="10" height="88"/><rect class="tp-seal" x="148" y="8" width="3" height="88"/>'+t(153,112,"Movement joint: filler and sealant, no mortar","tp-xs"),
      "Two panels of brickwork with a movement joint between them filled with compressible filler and sealant"),
    gable:()=>{const id="tpg"+(++uid);return svg(320,130,view("Elevation")+'<clipPath id="'+id+'"><path d="M30 118 L160 12 L290 118 Z"/></clipPath><g clip-path="url(#'+id+')">'+panel(20,10,280,14,.1)+'</g>'+
      '<path class="tp-rake" d="M26 121 L160 9 L294 121"/><path class="tp-string" d="M160 9 L300 124"/>'+t(262,40,"Line set","tp-xs")+t(262,52,"to the rake","tp-xs")+t(58,40,"Bricks cut","tp-xs")+t(58,52,"to the line","tp-xs"),
      "A gable end wall with each course cut along a line set to the angle of the rake")},
    /* Cutting a brick: the brick in 3D with its header face towards you and the cut marked on every face, the bolster
       standing with its blade across the mark, and the club hammer raised to strike it. Everything to one scale. */
    bolster:()=>{const k=.45,w=102.5*k,h=65*k,L=215*k*.5,dx=L*Math.cos(Math.PI/6),dy=-L*Math.sin(Math.PI/6),x0=106,y0=149.3;
      const P2=(x,y)=>r(x)+' '+r(y),mx=x0+dx/2,my=y0+dy/2,H=[172,22];
      return svg(320,188,shadow(x0+w/2+dx/2,y0+h+1,70,5)+
        '<path class="tp-brick" d="M'+P2(x0,y0)+' L'+P2(x0+dx,y0+dy)+' L'+P2(x0+w+dx,y0+dy)+' L'+P2(x0+w,y0)+' Z"/><path class="tp-lit" d="M'+P2(x0,y0)+' L'+P2(x0+dx,y0+dy)+' L'+P2(x0+w+dx,y0+dy)+' L'+P2(x0+w,y0)+' Z"/>'+
        '<path class="tp-brick" d="M'+P2(x0+w,y0)+' L'+P2(x0+w+dx,y0+dy)+' L'+P2(x0+w+dx,y0+dy+h)+' L'+P2(x0+w,y0+h)+' Z"/><path class="tp-shade" d="M'+P2(x0+w,y0)+' L'+P2(x0+w+dx,y0+dy)+' L'+P2(x0+w+dx,y0+dy+h)+' L'+P2(x0+w,y0+h)+' Z"/>'+
        '<rect class="tp-brick" x="'+r(x0)+'" y="'+r(y0)+'" width="'+r(w)+'" height="'+r(h)+'"/>'+
        '<path class="tp-pencil" d="M'+P2(mx,my)+' L'+P2(mx+w,my)+' L'+P2(mx+w,my+h)+'"/>'+
        at(mx+w/2,my-216*k,k,bolsterTool())+at(H[0]+237.5*k*.63,H[1]+237.5*k*.77,k,clubHammer(),-129.4)+
        call("Mark all faces",232,150,mx+w,my+h*.62)+call("Blade on the mark",108,112,mx+4,my-1.5)+call("Club hammer",246,66,196.4,52.1),
        "A brick marked for cutting on all its faces, a bolster standing with its blade across the mark on top, and a club hammer raised to strike it")}
  });
  /* ---------- Timber in 3D (oblique view: depth drawn up and to the right at half size) ----------
     obox draws a length of timber as a box: the front, top and right faces, lit from above. grain "v" means the
     timber runs up and down (so its top is end grain), "h" left to right (so its right end is end grain). oprism
     extrudes a flat outline (like a board with dovetails cut in it) back by its thickness. */
  const op=(x,y,z)=>r(x+z*.433)+' '+r(y-z*.25);
  const oface=(d,end,tone,tex)=>'<path class="'+(end?"tp-endg":"tp-tim")+'" d="'+d+'"/>'+(tone?'<path class="'+tone+'" d="'+d+'"/>':"")+(tex&&!end?'<path class="'+tex+'" d="'+d+'"/>':"");
  function obox(x,y,z,w,h,d,grain,faces){
    const f=faces||"trf",P=[];
    if(f.includes("t"))P.push(oface('M'+op(x,y,z)+' L'+op(x+w,y,z)+' L'+op(x+w,y,z+d)+' L'+op(x,y,z+d)+' Z',grain==="v","tp-lit"));
    if(f.includes("r"))P.push(oface('M'+op(x+w,y,z)+' L'+op(x+w,y+h,z)+' L'+op(x+w,y+h,z+d)+' L'+op(x+w,y,z+d)+' Z',grain==="h","tp-shade"));
    if(f.includes("f"))P.push(oface('M'+op(x,y,z)+' L'+op(x+w,y,z)+' L'+op(x+w,y+h,z)+' L'+op(x,y+h,z)+' Z',false,"",grain==="v"?"tp-x-grainv":"tp-x-grainh"));
    return P.join("");
  }
  function oprism(pts,z,d,frontEnd,grain){
    const n=pts.length,cx=pts.reduce((a,p)=>a+p[0],0)/n,cy=pts.reduce((a,p)=>a+p[1],0)/n;let area=0;
    for(let i=0;i<n;i++){const p=pts[i],q=pts[(i+1)%n];area+=p[0]*q[1]-q[0]*p[1]}
    const side=[];
    for(let i=0;i<n;i++){const p=pts[i],q=pts[(i+1)%n];let nx=q[1]-p[1],ny=-(q[0]-p[0]);if(area<0){nx=-nx;ny=-ny}
      if(nx*.433+ny*-.25>1e-6){const d2='M'+op(p[0],p[1],z)+' L'+op(q[0],q[1],z)+' L'+op(q[0],q[1],z+d)+' L'+op(p[0],p[1],z+d)+' Z';
        side.push({d:d2,k:(p[1]+q[1])/2-(p[0]+q[0])/2*.2,end:grain==="v"?Math.abs(ny)>Math.abs(nx):Math.abs(nx)>Math.abs(ny),tone:ny<-Math.abs(nx)*.5?"tp-lit":"tp-shade"})}}
    side.sort((a,b)=>b.k-a.k);
    const front='M'+pts.map(p=>op(p[0],p[1],z)).join(" L")+' Z';
    return side.map(f=>oface(f.d,f.end,f.tone)).join("")+oface(front,frontEnd,"",grain==="v"?"tp-x-grainv":"tp-x-grainh");
  }
  /* ---------- Joinery and carpentry ---------- */
  Object.assign(P,{
    /* The four basic joints, pulled apart, in 3D. Mortise and tenon: the tenon is the middle third of the rail's
       thickness and fits the mortise cut in the stile's edge. Dovetail: the tails flare out towards their ends and fit
       sockets that are narrow at the top; the pins board is seen end on. Bridle: an open slot (fork) in the stile's end
       takes the rail's tongue. Cross halving: each piece is cut away to half its depth where they cross. */
    joints4:()=>{const D=21,T=D/3;
      const mt=obox(8,10,0,16,86,D,"v")+'<path class="tp-slot" d="M'+op(24,38,T)+' L'+op(24,66,T)+' L'+op(24,66,2*T)+' L'+op(24,38,2*T)+' Z"/>'+
        obox(32,39,T,10,26,T,"h","tf")+obox(42,36,0,30,32,D,"h");
      const tails=[[88,4],[150,4],[150,16],[141,16],[145,34],[127,34],[131,16],[107,16],[111,34],[93,34],[97,16],[88,16]];
      const pins=[[88,48],[97,48],[93,66],[111,66],[107,48],[131,48],[127,66],[145,66],[141,48],[150,48],[150,98],[88,98]];
      const dt=oprism(tails,0,12,false,"h")+oprism(pins,0,12,true,"v");
      const br=obox(168,44,0,16,54,D,"v")+obox(168,12,2*T,16,32,T,"v")+'<path class="tp-slotin" d="M'+op(168,12,2*T)+' L'+op(184,12,2*T)+' L'+op(184,44,2*T)+' L'+op(168,44,2*T)+' Z"/>'+
        '<path class="tp-slotin" d="M'+op(184,12,T)+' L'+op(184,44,T)+' L'+op(184,44,2*T)+' L'+op(184,12,2*T)+' Z"/>'+obox(168,12,0,16,32,T,"v")+
        obox(192,18,T,12,26,T,"h","tf")+obox(204,18,0,30,26,D,"h");
      const hv=obox(246,76,0,24,16,D,"h","tf")+obox(270,84,0,18,8,D,"h","t")+'<path class="tp-shade" d="M'+op(270,76,0)+' L'+op(270,84,0)+' L'+op(270,84,D)+' L'+op(270,76,D)+' Z"/>'+obox(270,84,0,18,8,D,"h","f")+obox(288,76,0,24,16,D,"h")+
        obox(270,30,-14,18,16,48,"h")+'<path class="tp-arrow" d="M'+op(279,52,4)+' L'+op(279,70,4)+'"/><path class="tp-arrowh" d="M'+op(275,65,4)+' L'+op(279,70,4)+' L'+op(283,65,4)+'"/>';
      return svg(320,124,mt+dt+br+hv+
        t2(45,110,"Mortise","and tenon","tp-sm")+t(124,110,"Dovetail","tp-sm")+t(203,110,"Bridle","tp-sm")+t(282,110,"Halving","tp-sm"),
        "Four joints pulled apart: a tenon a third of the rail's thickness beside the mortise in the stile's edge, dovetail tails flaring towards their ends above the pins board's sockets, a bridle's open slot and tongue, and a cross halving cut to half depth")},
    /* A casement window from the outside, and a section through the sill. */
    window:()=>svg(320,140,view("Elevation and sill section")+'<rect class="tp-tim" x="20" y="10" width="160" height="112"/><rect class="tp-glass" x="30" y="20" width="60" height="90"/><rect class="tp-tim2" x="98" y="18" width="74" height="96"/><rect class="tp-glass" x="106" y="26" width="58" height="80"/>'+
      '<path class="tp-tim" d="M14 122 H186 L184 132 H16 Z"/>'+
      /* Sill section (outside on the right), 0.6 px a mm: 140 mm wide, the casement closing on the rebate, the top
         weathered down to a rounded front, and the drip groove under the part that projects past the wall face. */
      '<rect class="tp-mortar" x="210" y="78" width="61" height="6"/><rect class="tp-dpc2" x="210" y="78" width="61" height="2"/><rect class="tp-brick" x="210" y="84" width="61" height="34"/><path class="tp-thin" d="M204 118 H277"/>'+
      '<path class="tp-tim" d="M214 78 V39.6 H236.8 V45.6 L290.8 54 Q298 54 298 60 V78 H289.8 A2.6 2.6 0 0 0 284.6 78 Z"/><rect class="tp-tim2" x="222" y="10" width="14.8" height="29.6"/>'+
      '<g class="tp-drop2"><circle cx="287.2" cy="88" r="2"/><circle cx="287.2" cy="99" r="2"/></g>'+
      call("Weathered\ntop",252,16,246,46.7,null,"start")+call("Drip groove",266,134,286,79),
      "A timber casement window from outside: frame with head, jambs and sill, an opening casement and glass, and a section through the sloping sill with a drip groove underneath"),
    /* A straight flight from the side, to scale: 190 mm rise, 250 mm going, 25 mm treads with a 20 mm nosing, 15 mm
       risers standing on the tread below, and the wall string behind carrying them (the near string is left off so you
       can see the steps). The pitch line joins the nosings. */
    stair:()=>{const M=scaler(40,140,.18),S=[1,2,3,4];let st="";
      const R=190,G=250,P3=(x,z)=>M.X(x)+' '+M.Y(z),k=R/G,top=x=>R+(x+20)*k+62.8,bot=x=>top(x)-282,x0=(282-62.8-R)/k-20;
      const str='<path class="tp-string4" d="M'+P3(-120,0)+' L'+P3(x0,0)+' L'+P3(1060,bot(1060))+' L'+P3(1060,top(1060))+' L'+P3(-120,top(-120))+' Z"/>';
      S.forEach(i=>{const x=(i-1)*G,tp=i*R;
        st+='<rect class="tp-tim2" x="'+M.X(x)+'" y="'+M.Y(tp-25)+'" width="'+r(15*M.s)+'" height="'+r((R-25)*M.s)+'"/>'+
          '<path class="tp-tim" d="M'+P3(x-20,tp)+' L'+P3(i*G+15,tp)+' L'+P3(i*G+15,tp-25)+' L'+P3(x-8,tp-25)+' Q'+P3(x-20,tp-25)+' '+P3(x-20,tp-12)+' Z"/>'});
      return svg(320,150,view("Side view")+'<path class="tp-ground" d="M'+P3(-120,0)+' H'+M.X(700)+'"/>'+str+st+'<path class="tp-pitch" d="M'+P3(-20,R)+' L'+P3(3.6*G-20,4.6*R)+'"/>'+
        '<path class="tp-dim" d="M'+P3(2*G+200,2*R)+' V'+M.Y(3*R)+' M'+r(+M.X(2*G+200)-3)+' '+M.Y(2*R)+' H'+r(+M.X(2*G+200)+3)+' M'+r(+M.X(2*G+200)-3)+' '+M.Y(3*R)+' H'+r(+M.X(2*G+200)+3)+'"/>'+t(+M.X(2*G+200)+16,+M.Y(2.5*R)+3,"Rise","tp-xs")+
        '<path class="tp-dim" d="M'+P3(G-20,R+85)+' H'+M.X(2*G-20)+' M'+M.X(G-20)+' '+r(+M.Y(R+85)-3)+' V'+r(+M.Y(R+85)+3)+' M'+M.X(2*G-20)+' '+r(+M.Y(R+85)-3)+' V'+r(+M.Y(R+85)+3)+'"/>'+t(+M.X(1.5*G-20),+M.Y(R+85)-4,"Going","tp-xs")+
        call("Nosing",40,84,M.X(G-18),M.Y(2*R-12))+call("Tread",118,22,M.X(2*G+60),M.Y(3*R))+call("Riser",176,132,M.X(G+7),M.Y(R+60))+call("String, behind",220,104,M.X(620),M.Y(470))+call("Pitch line",236,30,M.X(3*G+30),M.Y(4*R+45)),
        "A straight flight of stairs from the side: treads with nosings, risers standing on the tread below, the wall string behind carrying them, the pitch line through the nosings, and the rise and going marked")},
    /* Door frame (rebated, solid) and door lining (thin board with a planted stop), in section. */
    framelining:()=>svg(320,120,view("Section")+'<path class="tp-tim" d="M40 20 H110 V80 H80 V60 H40 Z"/><rect class="tp-door2" x="40" y="62" width="38" height="46"/>'+
      '<rect class="tp-tim" x="190" y="30" width="100" height="18"/><rect class="tp-tim2" x="224" y="48" width="12" height="12"/><rect class="tp-door2" x="190" y="60" width="32" height="46"/>'+
      t(75,14,"Door frame","tp-sm")+call("Rebate cut in",120,98,79,70)+t(240,24,"Door lining","tp-sm")+call("Planted stop",246,84,236,55),
      "Sections through a solid door frame with a rebate cut into it, and a thin door lining with a separate stop fixed on"),
    /* A four-panel door and a ledged and braced door (hinges on the left). */
    doors:()=>svg(320,148,view("Elevation")+'<rect class="tp-tim" x="30" y="8" width="90" height="124"/><rect class="tp-panel" x="42" y="18" width="30" height="46"/><rect class="tp-panel" x="78" y="18" width="30" height="46"/><rect class="tp-panel" x="42" y="76" width="30" height="46"/><rect class="tp-panel" x="78" y="76" width="30" height="46"/>'+
      '<rect class="tp-tim2" x="190" y="8" width="90" height="124"/>'+[0,1,2,3,4].map(k=>'<path class="tp-thin" d="M'+(208+k*18)+' 8 V132"/>').join("")+
      '<rect class="tp-tim" x="190" y="18" width="90" height="12"/><rect class="tp-tim" x="190" y="64" width="90" height="12"/><rect class="tp-tim" x="190" y="110" width="90" height="12"/>'+
      olLine("tp-brace","M198 108 L272 78 M198 62 L272 30",9,"sq")+
      [24,116].map(y=>'<path class="tp-hinge" d="M184 '+(y-7)+' H190 V'+(y-2)+' H194 L244 '+(y-1.2)+' Q247 '+y+' 244 '+(y+1.2)+' L194 '+(y+2)+' H190 V'+(y+7)+' H184 Z"/>'+[200,216,232].map(x=>'<circle class="tp-nail" cx="'+x+'" cy="'+y+'" r="1"/>').join("")).join("")+
      t(75,144,"Panelled","tp-xs")+t(235,144,"Ledged and braced","tp-xs"),
      "A four-panel door with stiles, rails, a muntin and panels, and a ledged and braced door hung on the left, its braces rising away from the hinges"),
    /* Chisel edge: ground at 25 degrees, honed at 30. */
    chisel:()=>svg(320,110,view("Side view")+'<path class="tp-steel" d="M20 50 H220 L250.4 63 L255.2 66 H20 Z"/><path class="tp-honed" d="M250.4 63 L255.2 66 H250.4 Z"/>'+
      '<path class="tp-thin" d="M220 66 H290"/><path class="tp-dim" d="M236 66 A16 16 0 0 0 234.5 59.2"/>'+call("Grinding bevel\nabout 25°",202,92,234,58)+call("Honing bevel\nabout 30°",240,30,253,64)+call("Flat back",96,90,120,66),
      "The end of a chisel from the side: a flat back, a grinding bevel at about 25 degrees and a small honing bevel at about 30 degrees"),
    /* A room wall with the mouldings. */
    mouldings:()=>svg(320,140,view("Elevation")+'<rect class="tp-wallp" x="10" y="8" width="300" height="124"/><rect class="tp-door3" x="204" y="42" width="50" height="90"/>'+
      '<path class="tp-mould" d="M196 132 V34 H262 V132 H254 V42 H204 V132 Z"/>'+
      '<rect class="tp-mould" x="10" y="22" width="300" height="4"/><rect class="tp-mould" x="10" y="80" width="186" height="5"/><rect class="tp-mould" x="10" y="122" width="186" height="10"/><rect class="tp-mould" x="262" y="122" width="48" height="10"/>',
      "A wall with a picture rail near the top, a dado rail part way up, skirting along the bottom and architrave around the door"),
    /* A balustrade: newel, handrail, spindles and baserail, with the 100 mm rule. */
    balustrade:()=>{let sp="";for(let k=0;k<9;k++){const x=62+k*22,d=(x-46)*16/220;sp+=olLine("tp-spindle",'M'+x+' '+r(104-d)+' V'+r(28-d),5)}
      return svg(320,130,'<rect class="tp-tim" x="30" y="16" width="16" height="110"/><rect class="tp-tim" x="266" y="2" width="16" height="108"/>'+
        olLine("tp-rail","M46 26 L266 10",9,"rc")+olLine("tp-rail","M46 106 L266 90",9,"rc")+sp+'<circle class="tp-sphere" cx="73" cy="64" r="9"/>'+t(110,124,"Gaps under 100 mm","tp-xs")+call("Handrail",204,9,182,15)+call("Newel post",60,9,38,24),
        "A stair balustrade: newel posts, a handrail, a baserail and spindles close enough that a 100 millimetre sphere can't pass between them")},
    /* Where hinges and the handle go on a door. */
    hinges:()=>svg(320,140,view("Elevation")+'<rect class="tp-door3" x="110" y="6" width="80" height="130"/><rect class="tp-hinge" x="106" y="16" width="8" height="12"/><rect class="tp-hinge" x="106" y="108" width="8" height="12"/>'+
      '<circle class="tp-knob" cx="180" cy="76" r="4"/><rect class="tp-knob" x="178" y="76" width="4" height="10"/>'+
      dimV(90,6,22,"",0)+t(60,18,"150 mm","tp-xs")+dimV(90,114,136,"",0)+t(60,128,"225 mm","tp-xs")+dimV(214,76,136,"",0)+t(250,108,"about 1,000","tp-xs"),
      "A door with the top hinge about 150 millimetres from the top, the bottom hinge about 225 millimetres from the bottom, and the handle about 1,000 millimetres from the floor"),
    /* A band saw from the front: stand, lower and upper wheel housings (doors shut), the blade running down through
       the cast iron table, and the top guard with its guides lowered to just above the timber (about 10 mm). */
    bandsaw:()=>svg(320,140,shadow(166,136,62,3)+
      '<path class="tp-machd" d="M134 106 H198 L204 136 H128 Z"/><rect class="tp-mach" x="120" y="76" width="92" height="30" rx="6"/><path class="tp-machl" d="M126 82 H206"/><rect class="tp-knobk" x="196" y="87" width="4" height="10" rx="2"/>'+
      '<rect class="tp-mach" x="122" y="34" width="22" height="44"/><path class="tp-machl" d="M138 38 V74"/>'+
      '<path class="tp-mach" d="M122 44 V30 Q122 4 166 4 Q210 4 210 30 V44 Z"/><path class="tp-machl" d="M128 38 V30 Q128 10 166 10 Q204 10 204 30 V38"/><rect class="tp-knobk" x="196" y="24" width="4" height="10" rx="2"/>'+
      '<rect class="tp-steel" x="186" y="44" width="4" height="7"/><rect class="tp-guard" x="178" y="49" width="12" height="9" rx="1.5"/><path class="tp-blade3" d="M184 58 V69"/>'+
      '<rect class="tp-tim" x="150" y="60.5" width="72" height="8" rx="1"/><path class="tp-x-grainh" d="M150 60.5 H222 V68.5 H150 Z"/>'+
      '<rect class="tp-table" x="104" y="68.5" width="124" height="5.5" rx="1"/><rect class="tp-machd" x="152" y="74" width="30" height="3"/>'+
      '<circle class="tp-go" cx="113" cy="90" r="3.6"/><rect class="tp-stop" x="109" y="95" width="8" height="5" rx="1.5"/>'+
      call("Top guard\njust above work",222,40,184,57)+call("Table",236,86,226,71)+call("Wheel housings",112,22,126,28),
      "A band saw with its top guard lowered to just above the piece of timber on the table")
  });
  /* ---------- Site carpentry ---------- */
  Object.assign(P,{
    /* A load-bearing stud wall: plates, studs at 600 mm centres, noggins and a door opening. */
    studwall:()=>{const full=[20,80,98,180,240,296].map(x=>'<rect class="tp-tim" x="'+x+'" y="14" width="8" height="98"/>').join("");
      return svg(320,144,view("Elevation")+'<rect class="tp-tim2" x="14" y="112" width="92" height="8"/><rect class="tp-tim2" x="180" y="112" width="130" height="8"/><rect class="tp-tim2" x="14" y="6" width="296" height="8"/>'+full+
        '<rect class="tp-tim" x="106" y="30" width="8" height="82"/><rect class="tp-tim" x="172" y="30" width="8" height="82"/><rect class="tp-lint" x="106" y="20" width="74" height="10"/><rect class="tp-tim" x="139" y="14" width="8" height="6"/>'+
        '<rect class="tp-tim2" x="28" y="58" width="52" height="7"/><rect class="tp-tim2" x="188" y="62" width="52" height="7"/><rect class="tp-tim2" x="248" y="58" width="48" height="7"/>'+
        dimH(126,24,84,"600 centres")+t(143,72,"Opening","tp-xs"),"A load-bearing stud wall: head and sole plates, studs at 600 millimetre centres, noggins, and a door opening with a lintel sitting on cripple studs beside full-height studs")},
    /* Metal partition: U-tracks top and bottom with C-studs between. */
    metalstud:()=>svg(320,130,view("Elevation")+'<path class="tp-metal" d="M20 8 H300 V16 H20 Z M20 104 H300 V112 H20 Z"/>'+[40,110,180,250].map(x=>'<path class="tp-metal2" d="M'+x+' 16 H'+(x+10)+' V104 H'+x+' Z"/><path class="tp-thin" d="M'+(x+3)+' 16 V104"/>').join("")+
      t(80,126,"C-studs between","tp-xs")+t(230,126,"U-tracks top and bottom","tp-xs"),"A metal stud partition: U-shaped tracks at the top and bottom with C-studs clipped between them"),
    /* Where you may notch and drill a floor joist (from each support). */
    joist:()=>{const L=20,W=280,x=f=>L+f*W;return svg(320,120,view("Elevation")+'<rect class="tp-tim" x="20" y="40" width="280" height="36"/><rect class="tp-wallb" x="6" y="40" width="14" height="70"/><rect class="tp-wallb" x="300" y="40" width="14" height="70"/>'+
      '<rect class="tp-zone1" x="'+x(.07)+'" y="40" width="'+(x(.25)-x(.07))+'" height="5"/><rect class="tp-zone1" x="'+x(.75)+'" y="40" width="'+(x(.93)-x(.75))+'" height="5"/>'+
      '<rect class="tp-zone2" x="'+x(.25)+'" y="52" width="'+(x(.4)-x(.25))+'" height="12"/><rect class="tp-zone2" x="'+x(.6)+'" y="52" width="'+(x(.75)-x(.6))+'" height="12"/>'+
      '<circle class="tp-holec" cx="'+x(.3)+'" cy="58" r="4"/><circle class="tp-holec" cx="'+x(.35)+'" cy="58" r="4"/><path class="tp-cent" d="M20 58 H300"/>'+
      t(x(.16),30,"Notches: top edge","tp-xs")+t(x(.16),18,"0.07 to 0.25 of span","tp-xs")+t(x(.325),92,"Holes: on the centre line","tp-xs")+t(x(.325),104,"0.25 to 0.4 of span","tp-xs"),
      "A floor joist between two supports: notches allowed in the top edge between 0.07 and 0.25 of the span from each support, holes on the centre line between 0.25 and 0.4 of the span")},
    /* A joist hanger: nailed through every hole. */
    hanger:()=>svg(320,120,view("Side view")+'<rect class="tp-wallb" x="30" y="10" width="60" height="104"/><rect class="tp-tim" x="96" y="40" width="200" height="40"/>'+
      '<path class="tp-hang" d="M90 30 H100 V84 H122 V36 H128 V90 H90 Z"/>'+[[94,40],[94,60],[112,70],[112,50],[124,60]].map(p=>'<circle class="tp-nail" cx="'+p[0]+'" cy="'+p[1]+'" r="2"/>').join("")+
      t(200,104,"Right nails in every hole","tp-xs")+t(60,8,"","tp-xs"),"A joist end sitting in a galvanised joist hanger fixed to a wall, with a nail in every hole"),
    /* Boxing in a pipe: battens, boards and an access panel at the valve. */
    boxing:()=>svg(320,130,view("Elevation")+'<rect class="tp-wallp" x="10" y="6" width="300" height="118"/><rect class="tp-pipe2" x="60" y="6" width="10" height="118"/><rect class="tp-pipe2" x="80" y="6" width="10" height="118"/><rect class="tp-valve" x="56" y="58" width="18" height="10"/>'+
      '<rect class="tp-box" x="44" y="6" width="62" height="118"/><rect class="tp-access" x="50" y="46" width="50" height="34"/><circle class="tp-nail" cx="54" cy="50" r="1.6"/><circle class="tp-nail" cx="96" cy="50" r="1.6"/><circle class="tp-nail" cx="54" cy="76" r="1.6"/><circle class="tp-nail" cx="96" cy="76" r="1.6"/>'+
      call("Access panel\nat the valve",140,58,100,63),"Pipes boxed in with boards, and a screwed-on access panel where the valve is"),
    /* Timber cladding in section, to scale: blockwork, a breathable membrane, vertical battens (shown dashed: the cut is
       between two battens) making a 25 mm ventilated gap, and feather-edge boards, thin edge up, each lapping 25 mm
       over the one below. Air comes in at the bottom and rises behind the boards. */
    cladding:()=>{const M=scaler(64,127,.55),P3=(x,z)=>M.X(x)+' '+M.Y(z);let B="";
      for(let i=0;i<3;i++){const zb=i*125-20,zt=zb+150;B+='<path class="tp-board2" d="M'+P3(128,zt)+' L'+P3(134,zt)+' L'+P3(152,zb)+' L'+P3(136,zb)+' Z"/><path class="tp-x-grainv" d="M'+P3(128,zt)+' L'+P3(134,zt)+' L'+P3(152,zb)+' L'+P3(136,zb)+' Z"/>'}
      return svg(320,130,view("Section")+leaf(M,0,100,0,232,215,"tp-block","tp-x-block")+
        '<rect class="tp-batten" x="'+M.X(103)+'" y="'+M.Y(232)+'" width="'+r(25*M.s)+'" height="'+r(232*M.s)+'"/><rect class="tp-memb" x="'+M.X(100)+'" y="'+M.Y(232)+'" width="'+r(3*M.s)+'" height="'+r(232*M.s)+'"/>'+B+
        '<path class="tp-airflow" d="M'+P3(115,12)+' V'+M.Y(205)+'"/><path class="tp-arrowh" d="M'+r(+M.X(115)-3.5)+' '+r(+M.Y(205)+5)+' L'+P3(115,205)+' L'+r(+M.X(115)+3.5)+' '+r(+M.Y(205)+5)+'"/>'+
        call("Breathable membrane",176,22,M.X(101.5),M.Y(200))+call("Batten, behind",176,50,M.X(124),M.Y(172))+
        call("Ventilated gap",176,82,M.X(115),M.Y(100))+call("Feather-edge boards",176,114,M.X(145),M.Y(40)),
        "A section through timber cladding: blockwork, a breathable membrane, vertical battens making a ventilated gap with air rising behind, and feather-edge boards each overlapping the one below")},
    /* Skirting corners from above: a scribe inside, a mitre outside. */
    corners:()=>svg(320,130,view("Plan")+'<path class="tp-wallp2" d="M20 20 H140 V36 H36 V110 H20 Z"/><rect class="tp-tim" x="36" y="36" width="104" height="10"/><path class="tp-tim2" d="M36 46 H46 V110 H36 Z"/><path class="tp-scribe" d="M36 46 Q41 42 46 46"/>'+
      '<path class="tp-wallp2" d="M190 110 V40 H300 V24 H174 V110 Z"/><path class="tp-tim" d="M190 40 H300 V30 H180 Z"/><path class="tp-tim2" d="M180 30 L190 40 V110 H180 Z"/>'+
      t(80,126,"Internal corner: scribe","tp-xs")+t(240,126,"External corner: mitre","tp-xs"),"Skirting corners seen from above: an internal corner with one board scribed over the other, and an external corner with a 45 degree mitre"),
    /* A window board from above: horns notched round the reveals, bullnosed front. */
    windowboard:()=>svg(320,110,view("Plan")+'<rect class="tp-wallp2" x="10" y="10" width="80" height="50"/><rect class="tp-wallp2" x="230" y="10" width="80" height="50"/><rect class="tp-frame3" x="90" y="10" width="140" height="10"/>'+
      '<path class="tp-tim" d="M90 20 H230 V60 H254 V82 Q254 88 248 88 H72 Q66 88 66 82 V60 H90 Z"/>'+t(78,100,"Horn","tp-xs")+t(160,100,"Bullnosed front edge","tp-xs")+t(160,46,"Window board","tp-xs")+t(50,40,"Reveal","tp-xs"),
      "A window board seen from above, running past the reveals with notched horns and a rounded front edge"),
    /* A traditional cut roof: ridge, rafters, purlin, wall plate, birdsmouth and ceiling joist. */
    cutroof:()=>svg(320,130,view("Section")+'<rect class="tp-wallb" x="20" y="94" width="20" height="34"/><rect class="tp-wallb" x="280" y="94" width="20" height="34"/><rect class="tp-tim2" x="20" y="88" width="20" height="6"/><rect class="tp-tim2" x="280" y="88" width="20" height="6"/>'+
      '<rect class="tp-tim" x="20" y="94" width="280" height="6"/><path class="tp-tim" d="M10 96 L156 14 L162 20 L44 88 L40 88 L38 94 Z"/><path class="tp-tim" d="M310 96 L164 14 L158 20 L276 88 L280 88 L282 94 Z"/><rect class="tp-tim2" x="156" y="8" width="8" height="18"/>'+
      '<rect class="tp-tim2" x="84" y="50" width="12" height="12"/><rect class="tp-tim2" x="224" y="50" width="12" height="12"/>',
      "A cut roof in section: rafters from the wall plates up to the ridge, birdsmouth notches over the wall plates, purlins part way up and ceiling joists across"),
    /* Flat roofs: warm (insulation above the deck) and cold (insulation between the joists, ventilated). */
    flatroofs:()=>svg(320,130,view("Section")+'<g><rect class="tp-memb2" x="16" y="18" width="130" height="5"/><rect class="tp-insul" x="16" y="23" width="130" height="16"/><rect class="tp-vcl" x="16" y="39" width="130" height="3"/><rect class="tp-deck" x="16" y="42" width="130" height="6"/>'+
      [26,70,114].map(x=>'<rect class="tp-tim" x="'+x+'" y="48" width="10" height="36"/>').join("")+'</g>'+
      '<g><rect class="tp-memb2" x="174" y="18" width="130" height="5"/><rect class="tp-deck" x="174" y="23" width="130" height="6"/>'+[184,228,272].map(x=>'<rect class="tp-tim" x="'+x+'" y="29" width="10" height="55"/>').join("")+
      [194,238].map(x=>'<rect class="tp-insul" x="'+x+'" y="50" width="34" height="34"/>').join("")+'<rect class="tp-vcl" x="174" y="84" width="130" height="3"/><path class="tp-airflow" d="M198 40 H290"/><path class="tp-arrowh" d="M284 36 L292 40 L284 44"/></g>'+
      t(81,108,"Warm roof","tp-sm")+t(81,121,"insulation above the deck","tp-xs")+t(239,108,"Cold roof","tp-sm")+t(239,121,"between joists, ventilated","tp-xs"),
      "Two flat roof sections: a warm roof with insulation above the deck over a vapour control layer, and a cold roof with insulation between the joists and a ventilated gap above")
  });
  /* ---------- Trowel Level 3 ---------- */
  const polar=(cx,cy,R,a)=>r(cx+R*Math.sin(a))+' '+r(cy-R*Math.cos(a));
  Object.assign(P,{
    /* A segmental arch, rough ringed: 17 voussoirs on end radiating from one centre, an odd number so a key sits at
       the crown, skewbacks on the radial lines at each end. Span 1,170 mm, rise 230 mm (about a fifth of the span). */
    arch:()=>{const s=.12,cx=160,sp=90,S=70,rise=28,R=(S*S+rise*rise)/(2*rise),cy=sp+R-rise,D=215*s,R2=R+D,th=Math.asin(S/R),n=17,dA=2*th/n,g=10*s/R;
      let v="";for(let k=0;k<n;k++){const a0=-th+k*dA+g/2,a1=a0+dA-g;v+='<path class="tp-b'+(1+k%3)+'" d="M'+polar(cx,cy,R,a0)+' A'+r(R)+' '+r(R)+' 0 0 1 '+polar(cx,cy,R,a1)+' L'+polar(cx,cy,R2,a1)+' A'+r(R2)+' '+r(R2)+' 0 0 0 '+polar(cx,cy,R2,a0)+' Z"/>'}
      return svg(320,150,view("Elevation")+panel(20,6,280,16,s)+
        '<path class="tp-mortar" d="M'+polar(cx,cy,R,-th)+' A'+r(R)+' '+r(R)+' 0 0 1 '+polar(cx,cy,R,th)+' L'+polar(cx,cy,R2,th)+' A'+r(R2)+' '+r(R2)+' 0 0 0 '+polar(cx,cy,R2,-th)+' Z"/>'+bw(s)+v+'</g>'+
        '<path class="tp-hole2" d="M90 150 V90 A'+r(R)+' '+r(R)+' 0 0 1 230 90 V150 Z"/><path class="tp-cent" d="M26 90 H294"/>'+
        dimH(132,90,230,"")+dimV(160,62,90,"",0),
        "A segmental brick arch over an opening: wedge-shaped voussoirs on end with a key brick at the crown, the springing line across the tops of the jambs, the span and the rise")},
    /* A chimney stack two bricks wide through a 27° roof, seen from the side: pot and flaunching, two oversailing
       courses, the flue liner inside (dashed) and stepped flashing tucked into the bed joints. */
    chimney:()=>{const s=.14,W=440*s,x0=130,roof=x=>160-(x-20)*.5,J=[101.3,90.8,80.3,69.8,59.3];
      const pts=[];let x=x0;while(x<x0+W-.01){const top=Math.max(...J.filter(j=>j<=roof(x)-7)),nx=Math.min(x0+W,20+(153-top)*2);pts.push([x,top],[nx,top]);x=nx+.01}
      const step='<path class="tp-leadf" d="M'+x0+' '+roof(x0)+' '+pts.map(p=>'L'+r(p[0])+' '+r(p[1])).join(" ")+' L'+r(x0+W)+' '+r(roof(x0+W))+' Z"/>';
      return svg(150,130,view("Side view")+panel(x0,49.5,W,6,s)+brickwork(x0-3,39,W+6,1,s,BOND.stretcher,{headers:false})+brickwork(x0-6,28.5,W+12,1,s,k=>[102.5].concat(rep([215],6)),{headers:false})+
        '<path class="tp-mortar" d="M'+(x0-6)+' 28 L150 20 H172 L'+r(x0+W+6)+' 28 Z"/><path class="tp-pot" d="M150 20 L152 4 H170 L172 20 Z"/>'+
        '<path class="tp-cent" d="M144.4 28 V104 M177.2 28 V88"/>'+
        '<path class="tp-roof" d="M20 160 L300 20 V160 Z"/>'+step,
        "A chimney stack through a pitched roof seen from the side: a pot in sloping mortar flaunching, two oversailing courses at the top, a flue liner inside and lead stepped flashing where the stack meets the roof","90 0")},
    /* Decorative courses in elevation: a dentil course (alternate headers project), a string course in contrasting
       bricks and a plinth course with a bevelled top above the base. */
    decor:()=>{const s=.2,X=20,W=280,y=k=>6+k*15,row=(k,f,cls)=>brickwork(X,y(k),W,1,s,()=>f,{headers:false}).replace(/tp-b[123]/g,m=>cls||m);
      let dent="";const hw=102.5*s,step=112.5*s;for(let i=0;X+i*step<X+W;i++){const w=Math.min(hw,X+W-(X+i*step));dent+='<rect class="'+(i%2?"tp-rec":"tp-b2")+'" x="'+r(X+i*step)+'" y="'+y(1)+'" width="'+r(w)+'" height="13"/>'+(i%2?"":'<rect class="tp-shadow2" x="'+r(X+i*step)+'" y="'+(y(1)+13)+'" width="'+r(w)+'" height="3"/>')}
      return svg(320,130,view("Elevation")+'<rect class="tp-mortar" x="'+X+'" y="6" width="'+W+'" height="118"/>'+row(0,BOND.stretcher(0))+row(2,BOND.stretcher(1))+bw(s)+dent+'</g>'+row(3,BOND.stretcher(0))+row(4,BOND.stretcher(1),"tp-bf")+row(5,BOND.stretcher(0))+
        row(6,BOND.stretcher(1))+'<rect class="tp-chamf" x="'+X+'" y="'+y(6)+'" width="'+W+'" height="4"/>'+row(7,BOND.stretcher(0)),
        "A brick wall with a dentil course of alternate projecting headers near the top, a string course of contrasting buff bricks across the middle, and a plinth course with a bevelled top near the bottom")},
    /* A corbel in section: three courses each stepping out a quarter brick (56 mm), 168 mm in all, less than the
       215 mm wall it comes out of. */
    corbel:()=>{const s=.34,X=110,W=215*s,c=75*s,b=65*s,top=8;let o="";
      const N=[3,2,1,0,0];N.forEach((n,k)=>{const w=r(W+n*56.25*s);o+='<rect class="tp-mortar" x="'+X+'" y="'+r(top+k*c)+'" width="'+r(W+(k<4?N[k+1]:n)*56.25*s)+'" height="'+r(k<4?c:b)+'"/><rect class="tp-brick" x="'+X+'" y="'+r(top+k*c)+'" width="'+w+'" height="'+r(b)+'"/>'});
      return svg(320,132,view("Section")+o+'<path class="tp-cent" d="M'+r(X+W)+' 4 V128"/>',
        "A corbel cut through: three brick courses each stepping out a quarter brick further than the one below, from a one-brick wall")},
    /* Brick cladding on a concrete frame, in section: a steel support angle bolted to the slab edge carries the
       brickwork above; a compressible movement joint sits under it; a cavity tray over it; ties back to the frame. */
    supportangle:()=>{const s=.4,bx=166,bw=102.5*s,cr=(y,h)=>'<rect class="tp-brick" x="'+bx+'" y="'+y+'" width="'+r(bw)+'" height="'+h+'"/>';
      return svg(320,150,view("Section")+'<rect class="tp-block" x="60" y="0" width="50" height="58"/><rect class="tp-block" x="60" y="100" width="50" height="50"/><rect class="tp-conc" x="20" y="58" width="90" height="42"/>'+
        '<rect class="tp-mortar" x="'+bx+'" y="0" width="'+r(bw)+'" height="96"/>'+cr(0,6)+cr(10,26)+cr(40,26)+cr(70,26)+
        '<path class="tp-dpc" d="M111 40 L'+bx+' 88 V95 H'+r(bx+bw)+'"/>'+
        '<path class="tp-hang" d="M110 64 H114 V94 H'+r(bx+bw-6)+' V98 H110 Z"/><rect class="tp-nail" x="100" y="72" width="16" height="4"/>'+
        '<rect class="tp-filler" x="'+bx+'" y="98" width="'+r(bw)+'" height="6"/><rect class="tp-seal" x="'+r(bx+bw-3)+'" y="98" width="3" height="6"/>'+
        '<rect class="tp-mortar" x="'+bx+'" y="104" width="'+r(bw)+'" height="46"/>'+cr(104,26)+cr(134,16)+
        '<path class="tp-tie" d="M'+(bx+20)+' 23 H104 M'+(bx+20)+' 127 H104"/>',
        "A section through brick cladding on a concrete frame: a steel support angle bolted to the slab edge carries the brickwork, a cavity tray runs over it, a compressible movement joint sits under it, and ties hold the brickwork back to the frame")},
    /* A drain in long section: pipe on a granular bed and surround laid to a steady fall into an inspection chamber,
       trench backfilled above. The fall is exaggerated so you can see it. */
    drain:()=>svg(320,130,view("Long section")+'<rect class="tp-soil" x="0" y="20" width="320" height="110"/><path class="tp-ground" d="M0 20 H320"/>'+
      '<rect class="tp-backfill" x="10" y="21" width="230" height="100"/><path class="tp-gravel" d="M10 82 L240 94 V121 H10 Z"/>'+olLine("tp-pipe3","M10 94 L246 106",9,"pipe")+''+
      '<rect class="tp-brick" x="240" y="16" width="12" height="104"/><rect class="tp-brick" x="292" y="16" width="12" height="104"/><rect class="tp-conc" x="240" y="120" width="64" height="8"/>'+
      '<path class="tp-conc" d="M252 102 Q272 118 292 102 V120 H252 Z"/><rect class="tp-steel" x="236" y="12" width="72" height="5"/><rect class="tp-hole2" x="252" y="17" width="40" height="85"/><path class="tp-conc" d="M252 102 Q272 118 292 102 V120 H252 Z"/>'+
      '<path class="tp-arrow" d="M60 76 L150 81"/><path class="tp-arrowh" d="M143 76 L151 81 L143 86"/>',
      "A drain in long section: a pipe on a granular bed laid to a steady fall into a brick inspection chamber with a cover, with the flow arrow showing the water running downhill and the trench backfilled above"),
    /* Setting out in plan: the foundation trench, building lines on profile boards set clear of the dig, diagonals
       checked, and a temporary bench mark (TBM) peg. */
    profiles:()=>{const bh=(x,y)=>'<rect class="tp-wood" x="'+(x-12)+'" y="'+(y-3)+'" width="24" height="6"/><circle class="tp-peg" cx="'+(x-12)+'" cy="'+y+'" r="3"/><circle class="tp-peg" cx="'+(x+12)+'" cy="'+y+'" r="3"/>',
      bv=(x,y)=>'<rect class="tp-wood" x="'+(x-3)+'" y="'+(y-12)+'" width="6" height="24"/><circle class="tp-peg" cx="'+x+'" cy="'+(y-12)+'" r="3"/><circle class="tp-peg" cx="'+x+'" cy="'+(y+12)+'" r="3"/>';
      return svg(320,140,view("Plan")+'<path class="tp-trench" fill-rule="evenodd" d="M84 29 H236 V111 H84 Z M96 41 H224 V99 H96 Z"/>'+
        '<path class="tp-string" d="M34 35 H286 M34 105 H286 M90 8 V132 M230 8 V132"/><path class="tp-string2" d="M90 35 L230 105 M230 35 L90 105"/>'+
        bv(34,35)+bv(286,35)+bv(34,105)+bv(286,105)+bh(90,8)+bh(230,8)+bh(90,132)+bh(230,132)+
        '<circle class="tp-peg" cx="300" cy="128" r="5"/><path class="tp-bm" d="M293 117 L300 107 L307 117 Z M290 118 H310"/>',
        "Setting out a building in plan: the foundation trench, string lines on profile boards set back clear of the trench at each end, the diagonals strung to check it's square, and a temporary bench mark peg")},
    /* Thin joint aircrete blockwork: first course bedded on a normal 10 mm mortar bed, then 2 to 3 mm joints; and the
       serrated scoop that spreads the jointing mortar. */
    thinjoint:()=>{const s=.14,bw=440*s,bh=215*s,X=20,W=190;let o="";
      for(let k=0;k<3;k++){const y=104-1.4-(k+1)*(bh+.42);let x=X-(k%2?bw/2:0);while(x<X+W){const a=Math.max(x,X),w=Math.min(x+bw,X+W)-a;if(w>1)o+='<rect class="tp-aircrete" x="'+r(a)+'" y="'+r(y)+'" width="'+r(w-.42)+'" height="'+r(bh)+'"/>';x+=bw+.42}}
      return svg(320,130,view("Elevation")+'<rect class="tp-conc" x="10" y="104" width="210" height="22"/><rect class="tp-mortar" x="'+X+'" y="101.2" width="'+W+'" height="2.8"/><path class="tp-dpc" d="M'+X+' 104 H'+(X+W)+'"/>'+o+
        '<path class="tp-scoop" d="M236 46 H300 V70 H236 Z"/><path class="tp-teeth2" d="M236 70 '+Array.from({length:8},(_,k)=>'l4 6 l4 -6').join(" ")+'"/><rect class="tp-grip2" x="258" y="30" width="20" height="8" rx="3"/><path class="tp-shank" d="M262 38 V46 M274 38 V46"/>',
        "Thin joint aircrete blockwork: the first course on a normal mortar bed over the DPC, then courses with 2 to 3 millimetre joints, next to the serrated scoop used to spread the jointing mortar")},
    /* A wall curved on plan, built in headers so joints stay small, with the trammel (radius rod) swinging from the
       centre peg to check each course. 2.5 m radius. */
    curved:()=>{const s=.05,cx=160,cy=140,R=125,D=215*s,h=102.5*s,n=46,th=.96;let o="";
      for(let k=0;k<n;k++){const a=-th+(k+.5)*2*th/n,c=Math.cos(a),sn=Math.sin(a),px=(rr,w)=>r(cx+rr*sn+w*c)+' '+r(cy-rr*c+w*sn);
        o+='<path class="tp-b'+(1+k%3)+'" d="M'+px(R-D,-h/2)+' L'+px(R,-h/2)+' L'+px(R,h/2)+' L'+px(R-D,h/2)+' Z"/>'}
      return svg(320,150,view("Plan")+'<path class="tp-mortar" d="M'+polar(cx,cy,R-D,-th)+' A'+(R-D)+' '+(R-D)+' 0 0 1 '+polar(cx,cy,R-D,th)+' L'+polar(cx,cy,R,th)+' A'+R+' '+R+' 0 0 0 '+polar(cx,cy,R,-th)+' Z"/>'+o+
        olLine("tp-rod",'M'+cx+' '+cy+' L'+polar(cx,cy,R,.42),4,"rc")+'<circle class="tp-peg" cx="'+cx+'" cy="'+cy+'" r="5"/>',
        "A wall curved on plan, seen from above, built in headers, with a trammel rod pivoting on a peg at the centre of the curve reaching out to the face of the wall")},
    /* A simple bar chart programme: when each activity runs and what has to finish first. */
    gantt:()=>{const rows=[["Set out",0,1],["Foundations",1,3],["Walls to DPC",3,4],["Superstructure",4,8]],X=110,wk=24;
      return svg(320,130,Array.from({length:9},(_,k)=>'<path class="tp-gridl" d="M'+(X+k*wk)+' 14 V112"/>').join("")+Array.from({length:8},(_,k)=>t(X+k*wk+12,11,String(k+1),"tp-xs")).join("")+
        rows.map((w,i)=>{const y=20+i*23;return t(56,y+12,w[0],"tp-sm")+'<rect class="tp-bar" x="'+(X+w[1]*wk+2)+'" y="'+y+'" width="'+((w[2]-w[1])*wk-4)+'" height="14" rx="3"/>'}).join("")+t(206,126,"Weeks","tp-xs"),
        "A bar chart programme over 8 weeks: set out in week 1, foundations weeks 2 and 3, walls to DPC in week 4, superstructure weeks 5 to 8")},
    /* Repointing in section, face on the left: joints raked out to at least 15 mm, then pointed with matching mortar. */
    repoint:()=>svg(320,120,view("Section")+[["Raked out",'<rect class="tp-mortar2" x="15" y="39" width="45" height="6"/>'],["Repointed",'<rect class="tp-mortar2" x="15" y="39" width="45" height="6"/><rect class="tp-mortar" x="0" y="39" width="15" height="6"/>']].map((j,i)=>{const x=50+i*140;
      return '<g transform="translate('+x+' 6)"><rect class="tp-brick" x="0" y="0" width="60" height="39"/><rect class="tp-brick" x="0" y="45" width="60" height="39"/>'+j[1]+'<path class="tp-face" d="M0 -2 V86"/></g>'+t(x+30,108,j[0],"tp-sm")}).join("")+
      '<path class="tp-thin" d="M124 51 H72"/>'+t(150,54,"15 mm+","tp-xs"),
      "Repointing cut through the wall, face on the left: the joint raked out at least 15 millimetres deep, then refilled with new mortar to the face")
  });
  /* ---------- Maths and English ---------- */
  Object.assign(P,{
    /* A number line from −6 to 10 with a jump from −2 to 9 (warming by 11 degrees). */
    numline:()=>{const x=v=>40+(v+6)*15;let o='<path class="tp-line" d="M'+x(-6)+' 60 H'+x(10)+'"/>';
      for(let v=-6;v<=10;v++)o+='<path class="tp-tickc" d="M'+x(v)+' 55 V'+(v%2?62:65)+'"/>'+(v%2?"":t(x(v),80,String(v).replace("-","−"),"tp-sm"));
      return svg(320,90,o+'<path class="tp-arrow" d="M'+x(-2)+' 50 Q'+x(3.5)+' 6 '+x(9)+' 50"/><path class="tp-arrowh" d="M'+(x(9)-7)+' 43 L'+x(9)+' 50 L'+(x(9)+2)+' 41"/>'+t(x(3.5),22,"+11","tp-sm"),
        "A number line from minus 6 to 10 with a jump from minus 2 up to 9, which is 11")},
    /* The same amount three ways: a bar split into quarters with three shaded. */
    fdp:()=>svg(320,90,Array.from({length:4},(_,k)=>'<rect class="'+(k<3?"tp-bar":"tp-barx")+'" x="'+(40+k*60)+'" y="14" width="60" height="30"/>').join("")+t(160,70,"¾  =  0.75  =  75%","tp-mid"),"A bar split into four equal parts with three shaded: three quarters, 0.75, 75 percent"),
    /* Site waste by type: half timber, a quarter bricks, an eighth plasterboard, an eighth other. */
    pie:()=>{const cx=90,cy=65,R=52,seg=(a0,a1,c)=>{const p=a=>r(cx+R*Math.sin(a*Math.PI/180))+' '+r(cy-R*Math.cos(a*Math.PI/180));return '<path class="'+c+'" d="M'+cx+' '+cy+' L'+p(a0)+' A'+R+' '+R+' 0 '+(a1-a0>180?1:0)+' 1 '+p(a1)+' Z"/>'};
      const parts=[["Timber",0,180,"tp-pie1"],["Bricks",180,270,"tp-pie2"],["Plasterboard",270,315,"tp-pie3"],["Other",315,360,"tp-pie4"]];
      return svg(320,130,parts.map(p=>seg(p[1],p[2],p[3])).join("")+parts.map((p,i)=>'<rect class="'+p[3]+'" x="180" y="'+(24+i*22)+'" width="14" height="14" rx="3"/>'+'<text x="202" y="'+(35+i*22)+'" style="text-anchor:start">'+esc(p[0])+'</text>').join(""),
        "A pie chart of site waste: timber half, bricks a quarter, plasterboard an eighth and other an eighth")},
    /* Deliveries a day, Monday to Friday: 3, 5, 3, 8, 6. */
    bars:()=>{const d=[["Mon",3],["Tue",5],["Wed",3],["Thu",8],["Fri",6]],y=v=>110-v*10;let o="";
      for(let v=0;v<=10;v+=2)o+='<path class="tp-gridl" d="M60 '+y(v)+' H290"/>'+t(48,y(v)+4,String(v),"tp-xs");
      return svg(320,130,o+d.map((b,i)=>'<rect class="tp-bar" x="'+(74+i*44)+'" y="'+y(b[1])+'" width="28" height="'+b[1]*10+'"/>'+t(88+i*44,124,b[0],"tp-xs")).join("")+'<path class="tp-line" d="M60 6 V110 H290"/>',
        "A bar chart of deliveries each day: Monday 3, Tuesday 5, Wednesday 3, Thursday 8, Friday 6")},
    /* A right-angled triangle: 90°, 35° and the unknown angle. */
    triangle:()=>svg(320,120,'<path class="tp-tri" d="M100 104 H228 L100 14 Z"/><path class="tp-thin" d="M100 92 H112 V104"/><path class="tp-arrow" d="M200 104 A28 28 0 0 0 205.1 88"/>'+t(118,86,"90°","tp-sm")+t(180,98,"35°","tp-sm")+t(112,44,"?","tp-mid"),
      "A right-angled triangle with angles of 90 degrees and 35 degrees, and the third angle unknown"),
    /* A concrete trench fill as a box: 10 m long, 0.6 m wide, 0.2 m deep (not to scale). */
    trench:()=>svg(320,120,'<path class="tp-conc" d="M40 60 H250 L280 40 H70 Z"/><path class="tp-lit" d="M40 60 H250 L280 40 H70 Z"/><path class="tp-conc" d="M40 60 H250 V84 H40 Z"/><path class="tp-conc" d="M250 60 L280 40 V64 L250 84 Z"/><path class="tp-shade" d="M250 60 L280 40 V64 L250 84 Z"/>'+
      '<path class="tp-dim" d="M40 98 H250 M40 94 V102 M250 94 V102"/>'+t(145,113,"10 m","tp-sm")+'<path class="tp-dim" d="M262 90 L292 70"/>'+t(300,92,"0.6 m","tp-sm")+'<path class="tp-dim" d="M28 60 V84 M24 60 H32 M24 84 H32"/>'+t(30,52,"0.2 m","tp-sm"),
      "A block of concrete 10 metres long, 0.6 metres wide and 0.2 metres deep"),
    /* The probability scale from 0 to 1. */
    probline:()=>{const x=v=>40+v*240;return svg(320,80,'<path class="tp-line" d="M40 34 H280"/>'+[[0,"0","Impossible"],[.5,"½","Even"],[1,"1","Certain"]].map(p=>'<path class="tp-tickc" d="M'+x(p[0])+' 26 V42"/>'+t(x(p[0]),18,p[1],"tp-sm")+t(x(p[0]),60,p[2],"tp-xs")).join("")+
      '<path class="tp-tickc" d="M'+x(.25)+' 30 V38 M'+x(.75)+' 30 V38"/>'+t(x(.25),60,"Unlikely","tp-xs")+t(x(.75),60,"Likely","tp-xs"),"The probability scale from 0, impossible, through a half, even chance, to 1, certain")},
    /* A 4.8 m run with posts every 1.2 m: 4 gaps, 5 posts. */
    posts:()=>svg(320,90,olLine("tp-rail2","M40 30 H280",6)+[0,1,2,3,4].map(k=>'<rect class="tp-tim2" x="'+(35+k*60)+'" y="20" width="10" height="44"/>').join("")+'<path class="tp-ground" d="M20 64 H300"/>'+
      '<path class="tp-dim" d="M40 76 H100 M40 72 V80 M100 72 V80"/>'+t(70,88,"1.2 m","tp-xs")+t(210,88,"4.8 m in all","tp-xs"),"A fence 4.8 metres long with posts every 1.2 metres: 4 gaps and 5 posts"),
    /* A short, well laid-out work email. */
    email:()=>svg(320,150,'<rect class="tp-page" x="14" y="6" width="292" height="140" rx="8"/><path class="tp-thin" d="M14 44 H306"/>'+
      '<text x="28" y="22" style="text-anchor:start" class="tp-xs">To: Site office</text><text x="28" y="37" style="text-anchor:start">Subject: Delivery for 14 High St on Friday</text>'+
      '<text x="28" y="62" style="text-anchor:start">Dear Jo,</text><text x="28" y="80" style="text-anchor:start" class="tp-xs">The bricks will arrive on Friday at 8am.</text>'+
      '<text x="28" y="94" style="text-anchor:start" class="tp-xs">Please keep the gate open so we can unload.</text><text x="28" y="118" style="text-anchor:start">Kind regards,</text><text x="28" y="134" style="text-anchor:start">Sam</text>',
      "A work email with a To line, a clear subject line, a greeting, two short lines saying why and what’s needed, and a sign-off with a name"),
    /* A delivery note. */
    delnote:()=>{const rows=[["Facing bricks","2,000"],["Wall ties","250"],["Steel lintels","4"],["Building sand","1 bulk bag"],["Cement","10 bags"]];
      return svg(320,150,'<rect class="tp-page" x="40" y="6" width="240" height="140" rx="6"/>'+t(160,24,"DELIVERY NOTE","tp-sm")+'<path class="tp-thin" d="M40 32 H280 M200 32 V146"/>'+
        rows.map((w,i)=>'<text x="54" y="'+(52+i*20)+'" style="text-anchor:start" class="tp-xs">'+esc(w[0])+'</text><text x="240" y="'+(52+i*20)+'" class="tp-xs">'+esc(w[1])+'</text>').join(""),
        "A delivery note listing facing bricks 2,000, wall ties 250, steel lintels 4, building sand 1 bulk bag and cement 10 bags")}
  });
  /* The old simple bucket, kept for any lesson that still uses it. */
  P.sbucket=()=>svg(120,100,sbucket(40,34,"tp-sand"),"A bucket");
  T.pics=Object.assign(T.pics||{},P);
  /* A picture's own space: its size, and where it starts when it's a close-up of a bigger drawing. */
  T.picSize=name=>{const f=T.pics[name];if(!f)return null;const m=/viewBox="([\d.-]+) ([\d.-]+) ([\d.]+) ([\d.]+)"/.exec(f());return m?{x:+m[1],y:+m[2],w:+m[3],h:+m[4]}:null};
})();
