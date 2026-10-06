/* Site Showdown: a battle game. Evia and the learner face one site enemy after another: fires, hazards, substances,
   signs, plans, mortar, their trade, maths, English and people. Each enemy is a scenario with four moves that fit it;
   the right move is super effective and beats it. A wrong move isn't very effective: the learner loses a heart, learns
   why, and tries again. Three hearts; how far can you get? Every 5 wins there's a boss: a situation in steps (boss 1
   has 1 step, boss 2 has 2… up to 5), and every step has to be right to beat it. The encounters are in
   showdown-data.js. All the artwork is drawn here, our own. */
(function(){
  const G=window.eviaGames,D=window.EVIA_SHOWDOWN;if(!G||!G.register||!D)return;
  const {esc,buzz,reduced}=G;
  const BEST="evia7-showdown-best",HEARTS=3;
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  const wait=ms=>new Promise(r=>setTimeout(r,reduced()?Math.min(ms,60):ms));
  const TYPES={fire:["Fire","#ea580c"],ppe:["Hazard","#ca8a04"],coshh:["Substance","#2563eb"],sign:["Sign","#15803d"],plan:["Plan","#1d4ed8"],mix:["Mortar","#57534e"],
    brick:["Brickwork","#b45309"],wood:["Timber","#a16207"],site:["Site","#dc2626"],maths:["Maths","#7c3aed"],english:["English","#0e7490"],edi:["People","#db2777"]};

  /* ---------- Who's playing, and what they face ---------- */
  function learnerName(){try{const n=String((window.eviaData.learner()||{}).name||"").trim().split(/\s+/)[0];return n?n.charAt(0).toUpperCase()+n.slice(1):""}catch(_){return ""}}
  function types(){
    const g=G.group(),L=(()=>{try{return window.eviaData.learner()||{}}catch(_){return{}}})();
    const t=["fire","ppe","coshh","sign","plan","site","edi"];
    if(g==="brick")t.push("mix","brick");else t.push("wood");
    if(L.mathsEnabled)t.push("maths");
    if(L.englishEnabled)t.push("english");
    return t;
  }
  const fill=(s,n)=>{const who=n||"the apprentice";let t=String(s).replace(/\{n\}/g,who);return t.charAt(0).toUpperCase()+t.slice(1)};

  /* ---------- Artwork (all ours) ----------
     Friendly cartoon creatures, 120 × 120, dark outlines. Each type has its own body, and the variant shows what it is:
     a fire's fuel, a hazard's cause, a sign's real shape and colour. */
  const INK="#1f2733";
  function eyes(cx,cy,s,angry){
    s=s||1;const e=(x,d)=>'<ellipse cx="'+x+'" cy="'+cy+'" rx="'+(6*s)+'" ry="'+(7.5*s)+'" fill="#fff" stroke="'+INK+'" stroke-width="2.4"/><circle cx="'+(x+1.4*s*d)+'" cy="'+(cy+1.5*s)+'" r="'+(3.2*s)+'" fill="'+INK+'"/><circle cx="'+(x+2.4*s*d)+'" cy="'+(cy-.3*s)+'" r="'+(1.1*s)+'" fill="#fff"/>';
    return '<g class="sd-eyes">'+e(cx-9*s,-1)+e(cx+9*s,1)+(angry?'<path d="M'+(cx-17*s)+' '+(cy-11*s)+'L'+(cx-4*s)+' '+(cy-6*s)+'M'+(cx+17*s)+' '+(cy-11*s)+'L'+(cx+4*s)+' '+(cy-6*s)+'" stroke="'+INK+'" stroke-width="3.2" stroke-linecap="round"/>':"")+'</g>';
  }
  const mouth=(cx,cy,w,open)=>open?'<path d="M'+(cx-w)+' '+cy+'q'+w+' '+(w*.9)+' '+(2*w)+' 0z" fill="#7f1d1d" stroke="'+INK+'" stroke-width="2.2" stroke-linejoin="round"/>':'<path d="M'+(cx-w)+' '+cy+'q'+w+' '+(w*.6)+' '+(2*w)+' 0" fill="none" stroke="'+INK+'" stroke-width="2.4" stroke-linecap="round"/>';
  const FUEL={
    wood:'<g transform="rotate(-10 60 104)"><rect x="30" y="97" width="60" height="13" rx="6.5" fill="#92400e" stroke="'+INK+'" stroke-width="2.5"/><ellipse cx="36" cy="103.5" rx="4" ry="5.5" fill="#fcd9a8" stroke="'+INK+'" stroke-width="2"/></g><g transform="rotate(10 60 104)"><rect x="30" y="97" width="60" height="13" rx="6.5" fill="#a16207" stroke="'+INK+'" stroke-width="2.5"/><ellipse cx="84" cy="103.5" rx="4" ry="5.5" fill="#fcd9a8" stroke="'+INK+'" stroke-width="2"/></g>',
    liquid:'<path d="M40 92h36l4 6v18H40z" fill="#dc2626" stroke="'+INK+'" stroke-width="2.5" stroke-linejoin="round"/><path d="M76 92l8-8" stroke="'+INK+'" stroke-width="4" stroke-linecap="round"/><rect x="47" y="100" width="22" height="10" rx="2" fill="#fde68a" stroke="'+INK+'" stroke-width="1.5"/><path d="M84 110c6 0 12 2 16 6" fill="none" stroke="#a16207" stroke-width="3" stroke-linecap="round" opacity=".7"/>',
    gas:'<rect x="46" y="86" width="28" height="30" rx="11" fill="#dc2626" stroke="'+INK+'" stroke-width="2.5"/><rect x="55" y="80" width="10" height="8" rx="2" fill="#9ca3af" stroke="'+INK+'" stroke-width="2"/><path d="M50 98h20" stroke="#fff" stroke-width="2" opacity=".6"/>',
    elec:'<rect x="40" y="90" width="40" height="26" rx="5" fill="#f3f4f6" stroke="'+INK+'" stroke-width="2.5"/><rect x="50" y="97" width="4" height="9" rx="1" fill="'+INK+'"/><rect x="66" y="97" width="4" height="9" rx="1" fill="'+INK+'"/><path d="M84 88l-8 12h7l-6 12" fill="none" stroke="#facc15" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>',
    oil:'<ellipse cx="56" cy="104" rx="26" ry="9" fill="#374151" stroke="'+INK+'" stroke-width="2.5"/><path d="M80 102l24-6" stroke="'+INK+'" stroke-width="5" stroke-linecap="round"/><ellipse cx="56" cy="101" rx="20" ry="5" fill="#eab308" opacity=".85"/>',
    metal:'<path d="M34 112c6-10 14-4 18-10s12 0 16-8 12 2 18 4 6 10 2 14z" fill="#9ca3af" stroke="'+INK+'" stroke-width="2.5" stroke-linejoin="round"/><path d="M44 106c3-3 6-2 8-5M64 104c3-4 7-3 10-6" fill="none" stroke="#e5e7eb" stroke-width="2" stroke-linecap="round"/>'
  };
  function fire(v,boss){
    return '<g class="sd-flame">'+FUEL[v in FUEL?v:"wood"]+
      '<path d="M60 12C74 30 90 42 88 66c-1 18-13 30-28 30S32 86 32 70c0-12 7-20 12-30 2 9 6 14 12 15-2-13-1-28 4-43z" fill="#f97316" stroke="#9a3412" stroke-width="3" stroke-linejoin="round"/>'+
      '<path d="M60 40c9 12 17 19 16 33-1 11-7 18-16 18s-15-7-15-15c0-11 9-17 15-36z" fill="#fbbf24"/>'+
      '<path d="M60 64c4 6 7 9 6 15-1 5-3 8-6 8s-6-3-6-7c0-5 4-8 6-16z" fill="#fff4c2"/></g>'+eyes(60,62,boss?1.15:1,boss)+mouth(60,78,6,true);
  }
  const HAZ={
    dust:'<g fill="#d1d5db" stroke="#6b7280" stroke-width="2"><circle cx="18" cy="38" r="9"/><circle cx="30" cy="28" r="7"/><circle cx="100" cy="36" r="8"/><circle cx="92" cy="24" r="6"/><circle cx="108" cy="52" r="5"/></g>',
    noise:'<g fill="none" stroke="#7c3aed" stroke-width="3.5" stroke-linecap="round"><path d="M96 30a16 16 0 0 1 0 24"/><path d="M104 22a28 28 0 0 1 0 40"/><path d="M24 30a16 16 0 0 0 0 24"/><path d="M16 22a28 28 0 0 0 0 40"/></g>',
    drop:'<g transform="rotate(14 92 18)"><rect x="76" y="8" width="32" height="14" rx="2" fill="#b45309" stroke="'+INK+'" stroke-width="2.5"/></g><path d="M86 30v8M94 28v10M102 30v8" stroke="#9ca3af" stroke-width="2.5" stroke-linecap="round"/>',
    splash:'<g fill="#38bdf8" stroke="#0369a1" stroke-width="2"><path d="M22 20c5 8 8 12 8 16a8 8 0 0 1-16 0c0-4 3-8 8-16z"/><path d="M98 14c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12z"/><path d="M104 44c3 5 5 7 5 10a5 5 0 0 1-10 0c0-3 2-5 5-10z"/></g>',
    nail:'<g stroke="'+INK+'" stroke-width="2.4" fill="#9ca3af"><path d="M20 112l6-20 6 20z"/><path d="M94 112l6-24 6 24z"/><path d="M104 112l4-14 4 14z"/></g>',
    plant:'<g stroke="'+INK+'" stroke-width="2.4"><rect x="80" y="14" width="30" height="16" rx="3" fill="#f59e0b"/><circle cx="86" cy="32" r="5" fill="#374151"/><circle cx="104" cy="32" r="5" fill="#374151"/><path d="M80 18l-12-6" stroke-linecap="round"/></g>',
    sun:'<g stroke="#f59e0b" stroke-width="3.5" stroke-linecap="round"><circle cx="100" cy="22" r="9" fill="#fde047" stroke="#b45309" stroke-width="2.5"/><path d="M100 6v-2M100 40v-2M84 22h-2M118 22h-2M89 11l-2-2M113 35l-2-2M89 33l-2 2M113 9l-2 2"/></g>',
    hazard:''
  };
  function hazard(v,boss){
    return (HAZ[v]||"")+'<path d="M60 14L110 102H10z" fill="#facc15" stroke="'+INK+'" stroke-width="4" stroke-linejoin="round"/><path d="M60 30L96 94H24z" fill="none" stroke="'+INK+'" stroke-width="2" opacity=".25" stroke-linejoin="round"/>'+
      eyes(60,66,boss?1.1:1,boss)+mouth(60,82,7,boss)+'<path d="M40 102l-4 12M80 102l4 12" stroke="'+INK+'" stroke-width="4" stroke-linecap="round"/>';
  }
  function drum(boss){
    return '<rect x="30" y="26" width="60" height="84" rx="8" fill="#2563eb" stroke="'+INK+'" stroke-width="3"/><path d="M30 44h60M30 94h60" stroke="#1e3a8a" stroke-width="4"/><ellipse cx="60" cy="26" rx="30" ry="6" fill="#3b82f6" stroke="'+INK+'" stroke-width="3"/>'+
      '<rect x="40" y="60" width="40" height="30" rx="3" fill="#fff" stroke="'+INK+'" stroke-width="2"/><rect x="52" y="64" width="16" height="16" transform="rotate(45 60 72)" fill="#fff" stroke="#dc2626" stroke-width="3"/><path d="M60 66v7" stroke="'+INK+'" stroke-width="2.6" stroke-linecap="round"/><circle cx="60" cy="77" r="1.5" fill="'+INK+'"/>'+
      '<path d="M92 50c3 5 4 7 4 9a4 4 0 0 1-8 0c0-2 1-4 4-9z" fill="#84cc16" stroke="#3f6212" stroke-width="1.6"/>'+eyes(60,44,.9,boss);
  }
  /* Safety signs, in BS EN ISO 7010 shapes and colours, on a friendly post. */
  const PICT={
    hardhat:c=>'<path d="M44 48a16 14 0 0 1 32 0z" fill="'+c+'"/><rect x="40" y="47" width="40" height="5" rx="2" fill="'+c+'"/><rect x="58" y="32" width="4" height="10" rx="2" fill="'+c+'" opacity=".6"/>',
    smoke:c=>'<rect x="42" y="44" width="30" height="6" rx="1" fill="'+c+'"/><rect x="72" y="44" width="6" height="6" fill="#f97316"/><path d="M76 40c-2-3 2-5 0-8" fill="none" stroke="'+c+'" stroke-width="2" stroke-linecap="round"/>',
    bolt:c=>'<path d="M63 26L50 48h9l-5 18 15-24h-9l6-16z" fill="'+c+'"/>',
    cross:c=>'<path d="M54 30h12v12h12v12H66v12H54V54H42V42h12z" fill="'+c+'"/>',
    ext:c=>'<rect x="52" y="34" width="16" height="30" rx="6" fill="'+c+'"/><path d="M60 34v-5h10M70 29l6 5" fill="none" stroke="'+c+'" stroke-width="3" stroke-linecap="round"/>',
    ears:c=>'<path d="M44 50a16 18 0 0 1 32 0" fill="none" stroke="'+c+'" stroke-width="4"/><rect x="39" y="46" width="10" height="16" rx="4" fill="'+c+'"/><rect x="71" y="46" width="10" height="16" rx="4" fill="'+c+'"/>',
    goggles:c=>'<rect x="40" y="40" width="18" height="13" rx="5" fill="'+c+'"/><rect x="62" y="40" width="18" height="13" rx="5" fill="'+c+'"/><path d="M58 46h4M36 45h4M80 45h4" stroke="'+c+'" stroke-width="3"/>',
    warn:c=>'<rect x="57.5" y="32" width="5" height="20" rx="2" fill="'+c+'"/><circle cx="60" cy="58" r="3" fill="'+c+'"/>',
    must:c=>'<rect x="57.5" y="30" width="5" height="22" rx="2" fill="'+c+'"/><circle cx="60" cy="59" r="3" fill="'+c+'"/>'
  };
  const SIGNKIND={hardhat:"must",ears:"must",goggles:"must",must:"must",smoke:"ban",bolt:"warn",warn:"warn",cross:"safe",ext:"fire"};
  function sign(v,boss){
    const k=SIGNKIND[v]||"warn",p=PICT[v]||PICT.warn;
    const board=k==="must"?'<circle cx="60" cy="46" r="30" fill="#1d4ed8" stroke="'+INK+'" stroke-width="2.5"/>'+p("#fff"):
      k==="ban"?'<circle cx="60" cy="46" r="30" fill="#fff" stroke="#dc2626" stroke-width="7"/>'+p(INK)+'<path d="M40 26l40 40" stroke="#dc2626" stroke-width="7"/>':
      k==="warn"?'<path d="M60 12L94 74H26z" fill="#facc15" stroke="'+INK+'" stroke-width="5" stroke-linejoin="round"/>'+'<g transform="translate(0 8)">'+p(INK)+'</g>':
      k==="safe"?'<rect x="28" y="16" width="64" height="60" rx="5" fill="#16a34a" stroke="'+INK+'" stroke-width="2.5"/>'+p("#fff"):
      '<rect x="28" y="16" width="64" height="60" rx="5" fill="#dc2626" stroke="'+INK+'" stroke-width="2.5"/>'+p("#fff");
    return '<rect x="49" y="70" width="22" height="42" rx="6" fill="#d6a15e" stroke="'+INK+'" stroke-width="2.5"/>'+board+eyes(60,88,.7,boss)+'<path d="M49 96l-12 6M71 96l12 6" stroke="'+INK+'" stroke-width="3.5" stroke-linecap="round"/>';
  }
  function plan(boss){
    return '<rect x="24" y="30" width="72" height="66" rx="3" fill="#dbeafe" stroke="#1e3a8a" stroke-width="3"/>'+
      '<g stroke="#93c5fd" stroke-width="1">'+[38,50,62,74,86].map(y=>'<path d="M24 '+y+'h72"/>').join("")+[36,48,60,72,84].map(x=>'<path d="M'+x+' 30v66"/>').join("")+'</g>'+
      '<path d="M34 76V60h24v16H34zM58 60h26v16" fill="none" stroke="#1e3a8a" stroke-width="2.5"/>'+
      '<rect x="16" y="26" width="12" height="74" rx="6" fill="#bfdbfe" stroke="#1e3a8a" stroke-width="3"/><rect x="92" y="26" width="12" height="74" rx="6" fill="#bfdbfe" stroke="#1e3a8a" stroke-width="3"/>'+
      eyes(60,46,.9,boss)+mouth(60,56,5,boss)+'<rect x="30" y="102" width="60" height="9" rx="2" fill="#fde68a" stroke="'+INK+'" stroke-width="2"/><path d="M36 102v4M44 102v3M52 102v4M60 102v3M68 102v4M76 102v3M84 102v4" stroke="'+INK+'" stroke-width="1.4"/>';
  }
  function tub(boss){
    return '<path d="M84 22l-10 30" stroke="#a16207" stroke-width="6" stroke-linecap="round"/><path d="M70 50l-8 12 14 2z" fill="#cbd5e1" stroke="'+INK+'" stroke-width="2.5" stroke-linejoin="round"/>'+
      '<path d="M24 56h72l-8 50H32z" fill="#1f2937" stroke="'+INK+'" stroke-width="3" stroke-linejoin="round"/><ellipse cx="60" cy="56" rx="36" ry="9" fill="#9ca3af" stroke="'+INK+'" stroke-width="3"/><path d="M40 55c6-3 10 1 16-1s10-3 16 0" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round"/>'+eyes(60,78,1,boss)+mouth(60,92,6,boss);
  }
  function wall(boss){
    const b=(x,y,w)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="16" rx="2" fill="#c2410c" stroke="'+INK+'" stroke-width="2.2"/>';
    return '<rect x="18" y="28" width="84" height="80" rx="4" fill="#e7e5e4" stroke="'+INK+'" stroke-width="3"/>'+
      b(20,30,38)+b(62,30,38)+b(20,50,18)+b(42,50,38)+b(84,50,16)+b(20,70,38)+b(62,70,38)+b(20,90,18)+b(42,90,38)+b(84,90,16)+
      '<rect x="34" y="52" width="52" height="30" rx="10" fill="#fed7aa" opacity=".85"/>'+eyes(60,64,1,boss)+mouth(60,77,5,boss);
  }
  function plank(boss){
    return '<rect x="14" y="40" width="92" height="50" rx="6" fill="#e0a458" stroke="'+INK+'" stroke-width="3"/><path d="M20 52c20-6 36 6 56-2s24 2 26 0M20 78c14 4 30-6 48 0s28 2 34-2" fill="none" stroke="#a16207" stroke-width="2" stroke-linecap="round"/><ellipse cx="88" cy="62" rx="5" ry="3" fill="none" stroke="#a16207" stroke-width="2"/>'+
      eyes(52,62,1,boss)+mouth(52,76,6,boss)+'<path d="M34 90l-4 18M78 90l4 18" stroke="'+INK+'" stroke-width="4" stroke-linecap="round"/>';
  }
  function calc(boss){
    let keys="";for(let r=0;r<3;r++)for(let c=0;c<3;c++)keys+='<rect x="'+(36+c*18)+'" y="'+(70+r*13)+'" width="12" height="9" rx="2" fill="'+(c===2?"#f59e0b":"#e5e7eb")+'" stroke="'+INK+'" stroke-width="1.5"/>';
    return '<rect x="28" y="18" width="64" height="94" rx="10" fill="#7c3aed" stroke="'+INK+'" stroke-width="3"/><rect x="36" y="26" width="48" height="34" rx="4" fill="#d9f99d" stroke="'+INK+'" stroke-width="2"/>'+eyes(60,42,.85,boss)+keys;
  }
  function book(boss){
    return '<path d="M60 30c-12-8-28-8-44-4v74c16-4 32-4 44 4z" fill="#fff" stroke="'+INK+'" stroke-width="3" stroke-linejoin="round"/><path d="M60 30c12-8 28-8 44-4v74c-16-4-32-4-44 4z" fill="#f8fafc" stroke="'+INK+'" stroke-width="3" stroke-linejoin="round"/>'+
      '<path d="M24 80h28M24 88h24M68 80h28M68 88h22" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/><path d="M16 100c16-4 32-4 44 4 12-8 28-8 44-4v6c-16-4-32-4-44 4-12-8-28-8-44-4z" fill="#0e7490" stroke="'+INK+'" stroke-width="2.5"/>'+eyes(38,56,.85,boss)+eyes(82,56,.85,boss).replace('class="sd-eyes"','class="sd-eyes sd-eyes2"');
  }
  function cloud(boss){
    return '<path d="M30 86c-12 0-18-10-14-20 3-8 11-10 16-9 1-12 12-20 24-17 6-10 22-12 30-2 10-2 20 6 20 16 10 2 14 12 10 20-3 8-10 12-18 11z" fill="#f472b6" stroke="'+INK+'" stroke-width="3" stroke-linejoin="round"/>'+
      '<path d="M40 86l-8 18 22-16" fill="#f472b6" stroke="'+INK+'" stroke-width="3" stroke-linejoin="round"/>'+eyes(62,58,1,boss)+mouth(62,72,7,boss);
  }
  const ART={fire:(v,b)=>fire(v,b),ppe:(v,b)=>hazard(v,b),site:(v,b)=>v==="cloud"?cloud(b):hazard(v,b),coshh:(v,b)=>drum(b),sign:(v,b)=>sign(v,b),plan:(v,b)=>plan(b),mix:(v,b)=>tub(b),
    brick:(v,b)=>wall(b),wood:(v,b)=>plank(b),maths:(v,b)=>calc(b),english:(v,b)=>book(b),edi:(v,b)=>cloud(b)};
  const BOSSART={elec:b=>fire("elec",b),wood:b=>fire("wood",b),oil:b=>fire("oil",b),hazard:b=>hazard("drop",b),dust:b=>hazard("dust",b),drop:b=>hazard("drop",b)};
  const svg=(inner,boss)=>'<svg viewBox="0 0 120 120" aria-hidden="true" class="'+(boss?"sd-boss-art":"")+'">'+inner+'</svg>';
  const HEART='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.4 2.9 4 7 4c2.2 0 3.8 1.2 5 3 1.2-1.8 2.8-3 5-3 4.1 0 6.2 4.4 4.6 7.8C19.5 16.4 12 21 12 21z"/></svg>';
  /* The battlefield: a building site under a blue sky, with a crane and a half-built block, kept soft behind the fight. */
  const BG='<svg class="sd-bg" viewBox="0 0 360 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">'+
    '<g fill="none" stroke="#9cc3e6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M40 176V38M40 38h150M40 60l150-22M58 38V60M40 60h18M170 38v24M170 62v14"/><path d="M40 176l-10 8M40 176l10 8"/><rect x="164" y="76" width="12" height="8" rx="1"/></g>'+
    '<g fill="#dbe8f4" stroke="#b3cde4" stroke-width="2"><rect x="232" y="104" width="96" height="72"/><path d="M232 128h96M232 152h96M264 104v72M296 104v72"/></g>'+
    '<g stroke="#b3cde4" stroke-width="2"><path d="M226 96v80M334 96v80M226 96h108M226 128h108"/></g>'+
    '<circle cx="300" cy="44" r="16" fill="#fff6c9"/></svg>';
  const MINI='<span class="evia-mini sd-evia"><span class="evia-face"><i></i><i></i></span></span>';
  const icon='<svg viewBox="0 0 24 24"><path d="M5 19l6-6M13 11l6-6M15 5h4v4"/><path d="M4 15l5 5M3 20l2-2"/><circle cx="17" cy="17" r="3.5"/></svg>';

  /* ---------- The game ---------- */
  function run(ctx){
    const name=learnerName(),me=name||"You",body=ctx.body;
    const allowed=types(),pool=D.foes.filter(f=>allowed.includes(f[0]));
    const best=()=>{try{return +localStorage.getItem(BEST)||0}catch(_){return 0}};
    let s=null,alive=true;ctx.stops.push(()=>{alive=false});
    window.eviaShowdown.state=()=>s;

    function title(){
      body.innerHTML='<div class="sd sd-title"><div class="sd-title-art"><span class="sd-vs-me">'+MINI+'</span><b class="sd-vs">VS</b><span class="sd-vs-foe">'+svg(fire("wood"))+'</span></div>'+
        '<h2>Site Showdown</h2><p>Fires, hazards, signs, plans'+(allowed.includes("mix")?", mortar":"")+' and more. Pick the right move for each one.</p>'+
        '<ul class="sd-how"><li><b>Super effective</b> beats it.</li><li><b>Not very effective</b> costs a heart. You get 3.</li><li>Every 5 wins, a <b>boss</b>: get every step right.</li></ul>'+
        (best()?'<p class="sd-best">Your best: <b>'+best()+' wins</b></p>':"")+'<button type="button" class="primary sd-go">Battle!</button></div>';
      body.querySelector(".sd-go").onclick=start;
      if(window.eviaTheme&&window.eviaTheme.decorate)window.eviaTheme.decorate(body);
    }
    function start(){
      s={hp:HEARTS,wins:0,bosses:0,seen:new Set(),wrong:0};
      body.innerHTML='<div class="sd"><div class="sd-field">'+BG+
        '<div class="sd-card sd-foe-card"><div class="sd-card-top"><strong class="sd-foe-name"></strong><span class="sd-type"></span></div><div class="sd-foe-bar"><i></i></div><div class="sd-steps"></div></div>'+
        '<div class="sd-foe"><span class="sd-pad"></span><div class="sd-foe-art"></div></div>'+
        '<div class="sd-me"><span class="sd-pad"></span><div class="sd-me-art">'+MINI+'</div></div>'+
        '<div class="sd-card sd-me-card"><div class="sd-card-top"><strong>'+esc(me)+' <small>&amp; Evia</small></strong><span class="sd-wins">0 wins</span></div><div class="sd-hearts">'+HEART.repeat(HEARTS)+'</div></div>'+
        '</div><div class="sd-box"><p class="sd-msg" aria-live="polite"></p><div class="sd-moves"></div></div></div>';
      if(window.eviaTheme&&window.eviaTheme.decorate)window.eviaTheme.decorate(body);
      next();
    }
    const $=q=>body.querySelector(q);
    let typing=null;
    /* Messages type out quickly; a tap on the box shows them in full. */
    function say(html){
      const el=$(".sd-msg");if(!el)return Promise.resolve();
      clearInterval(typing);
      if(reduced()){el.innerHTML=html;return Promise.resolve()}
      const tmp=document.createElement("div");tmp.innerHTML=html;const text=tmp.textContent;let i=0;
      el.textContent="";el.classList.add("typing");
      return new Promise(res=>{
        const done=()=>{clearInterval(typing);el.innerHTML=html;el.classList.remove("typing");$(".sd-box").onclick=null;res()};
        $(".sd-box").onclick=done;
        typing=setInterval(()=>{i+=2;el.textContent=text.slice(0,i);if(i>=text.length)done()},16);
      });
    }
    function moves(list,onPick){
      const box=$(".sd-moves");
      box.innerHTML=list.map((m,i)=>'<button type="button" class="sd-move" data-i="'+i+'"><span>'+esc(m[0])+'</span></button>').join("");
      box.querySelectorAll(".sd-move").forEach(b=>b.onclick=()=>{if(box.classList.contains("busy"))return;onPick(+b.dataset.i,b)});
      box.classList.remove("busy");
    }
    function nextButton(label,go){
      $(".sd-moves").innerHTML='<button type="button" class="sd-next primary">'+esc(label)+' ›</button>';
      $(".sd-next").onclick=go;setTimeout(()=>{try{$(".sd-next").focus({preventScroll:true})}catch(_){}},50);
    }
    function hearts(){body.querySelectorAll(".sd-hearts svg").forEach((h,i)=>h.classList.toggle("lost",i>=s.hp))}
    function foeCard(f){
      const [label,col]=TYPES[f.type]||["Site","#dc2626"];
      $(".sd-foe-name").textContent=f.name;const t=$(".sd-type");t.textContent=f.boss?"BOSS":label;t.style.background=f.boss?"#111827":col;
      $(".sd-foe-bar i").style.width="100%";$(".sd-foe-bar").classList.remove("low");
      $(".sd-steps").innerHTML=f.boss?f.steps.map((_,i)=>'<i class="'+(i<f.at?"done":i===f.at?"now":"")+'"></i>').join("")+'<small>Step '+(f.at+1)+' of '+f.steps.length+'</small>':"";
      $(".sd-foe-card").classList.toggle("boss",!!f.boss);
    }
    async function enter(f){
      $(".sd-moves").innerHTML="";
      const art=$(".sd-foe-art");art.innerHTML=svg(f.boss?BOSSART[f.art](true):ART[f.type](f.art,false),f.boss);
      const foe=$(".sd-foe");foe.className="sd-foe"+(f.boss?" boss":"");void foe.offsetWidth;foe.classList.add("enter");
      foeCard(f);
      await say(f.boss?"<b>Boss!</b> "+esc(f.name)+" appears. "+esc(fill(f.intro,name)):esc(f.name)+" blocks the way!");
      await wait(500);
    }
    /* The next enemy: a boss after every 5 wins, else one they haven't met this run, harder as they go. */
    function choose(){
      if(s.wins>0&&s.wins%5===0&&s.bosses<s.wins/5){
        const n=s.wins/5,def=D.bosses[(n-1)%D.bosses.length],k=Math.min(n,5),idx=def.key.slice(0,k).sort((a,b)=>a-b);
        return {boss:true,name:def.name,art:def.art,intro:def.intro,type:"site",steps:idx.map(i=>def.steps[i]),at:0};
      }
      const tier=s.wins<3?1:s.wins<8?2:3;
      let c=pool.filter(f=>f[1]<=tier&&!s.seen.has(f[2]));
      if(!c.length){s.seen.clear();c=pool.filter(f=>f[1]<=tier)}
      /* Lean towards the newest tier once it's open, so it gets harder. */
      const top=c.filter(f=>f[1]===tier),f=top.length&&Math.random()<.6?pick(top):pick(c);
      s.seen.add(f[2]);
      return {type:f[0],name:f[2],q:f[3],opts:[f[4],f[5],f[6],f[7]],art:f[8]};
    }
    async function next(){
      if(!alive)return;
      const f=choose();s.foe=f;
      await enter(f);
      ask(f);
    }
    function ask(f){
      const q=f.boss?f.steps[f.at][0]:f.q,opts=f.boss?f.steps[f.at].slice(1):f.opts;
      const right=opts[0],shown=shuffle(opts);
      say(esc(fill(q,name)));
      moves(shown,async(i,btn)=>{
        const m=shown[i],box=$(".sd-moves");box.classList.add("busy");
        const meEl=$(".sd-me"),foe=$(".sd-foe");
        if(m===right){
          meEl.classList.remove("lunge");void meEl.offsetWidth;meEl.classList.add("lunge");buzz(15);
          await wait(260);foe.classList.remove("hit");void foe.offsetWidth;foe.classList.add("hit");
          if(f.boss&&f.at<f.steps.length-1){
            f.at++;$(".sd-foe-bar i").style.width=Math.round((1-f.at/f.steps.length)*100)+"%";$(".sd-foe-bar").classList.toggle("low",f.at/f.steps.length>.5);
            await say("<b>"+esc(name||"You")+" used "+esc(m[0])+"!</b> <em class=\"sd-good\">Good call!</em> "+esc(m[1]));
            nextButton("Next step",()=>{foeCard(f);ask(f)});
            return;
          }
          $(".sd-foe-bar i").style.width="0%";
          await say("<b>"+esc(name||"You")+" used "+esc(m[0])+"!</b> <em class=\"sd-good\">It’s super effective!</em> "+esc(m[1]));
          await wait(300);foe.classList.add("faint");
          s.wins++;if(f.boss)s.bosses++;
          $(".sd-wins").textContent=s.wins+" win"+(s.wins===1?"":"s");
          nextButton(f.boss?"Boss beaten! Next":"Next",()=>{foe.classList.remove("faint","hit");next()});
          return;
        }
        /* Not very effective: the enemy hits back. The move is crossed out; try again with the rest. */
        btn.classList.add("wrong");btn.disabled=true;s.wrong++;
        foe.classList.remove("attack");void foe.offsetWidth;foe.classList.add("attack");
        await wait(280);meEl.classList.remove("hurt");void meEl.offsetWidth;meEl.classList.add("hurt");buzz([30,40,30]);
        s.hp--;hearts();
        await say("<b>"+esc(name||"You")+" used "+esc(m[0])+"…</b> <em class=\"sd-bad\">It’s not very effective.</em> "+esc(m[1]));
        if(s.hp<=0){await wait(400);return over()}
        box.classList.remove("busy");
      });
    }
    function over(){
      const b=best(),nb=s.wins>b;if(nb)try{localStorage.setItem(BEST,String(s.wins))}catch(_){}
      $(".sd-me").classList.add("faint");
      G.finish(ctx,{title:s.wins?"You beat "+s.wins+" enem"+(s.wins===1?"y":"ies"):"Out of hearts",
        sub:(nb&&s.wins?"A new best!":"Best: "+Math.max(b,s.wins)+" wins")+(s.bosses?" · "+s.bosses+" boss"+(s.bosses===1?"":"es")+" beaten":""),
        coins:Math.min(15,2+s.wins),lb:{game:"showdown",score:s.wins},again:start});
    }
    title();
  }
  G.register({id:"game-showdown",key:"showdown",label:"Site Showdown",rarity:"rare",about:"Battle fires, hazards and site problems with the right moves. How far can you get?"},run,icon);
  window.eviaShowdown={types,fill,art:(t,v,boss)=>svg(boss?BOSSART[v](true):ART[t](v,false),boss)};
})();
