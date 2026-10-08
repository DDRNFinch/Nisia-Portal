/* Evia7 Learn tab (the course, maths and English lessons, tests and the mini games), with the coins and the Shop
   (rewards.js) at the top. The Shop opens from Learn; it isn't in the bottom bar. */
(function(){
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const scr=()=>document.getElementById("screen");
  const courseName=()=>{try{return data().name}catch(_){return ""}};
  const head=title=>'<header class="ui-page-head"><h1>'+esc(title)+'</h1><span>'+esc(courseName())+'</span></header>';
  const ICON={
    course:'<svg viewBox="0 0 24 24"><rect x="3" y="14" width="8" height="5" rx="1"/><rect x="13" y="14" width="8" height="5" rx="1"/><rect x="8" y="8" width="8" height="5" rx="1"/><path d="M3 21h18"/></svg>',
    maths:'<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 7.5h8M8.5 12h1M12 12h1M15 12h1M8.5 16h1M12 16h1M15 16h1"/></svg>',
    edi:'<svg viewBox="0 0 24 24"><circle cx="8" cy="7.5" r="2.6"/><circle cx="16" cy="7.5" r="2.6"/><path d="M3.5 19c0-3 2-5 4.5-5s4.5 2 4.5 5M11.5 19c0-3 2-5 4.5-5s4.5 2 4.5 5"/></svg>',
    skills:'<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4V3h6v1"/><path d="M8.5 10l1.5 1.5 3-3M8.5 16l1.5 1.5 3-3M15 11h1.5M15 17h1.5"/></svg>',
    english:'<svg viewBox="0 0 24 24"><path d="M4 20l5.5-15h1L16 20M6.2 14.5h7.6"/><path d="M17 12.5c1-1 3.5-1 3.5 1.2V20M20.5 16.2c-2.7-.4-4 .5-4 1.9 0 1 .8 1.9 2 1.9 1.3 0 2-1 2-1"/></svg>'
  };
  /* Lessons done out of the total for a list of units, from the Teach me store. */
  function count(us){
    const L=Object.fromEntries(window.eviaData.list("lessonResults",{course}).map(r=>[r.lessonId,r]));
    const ls=[].concat(...us.map(u=>u.lessons));return {done:ls.filter(l=>L[l.id]&&L[l.id].done).length,total:ls.length};
  }
  /* Medals from Teach me, by best score: gold 90%+, silver 70%+, bronze below (as teach.js). */
  function medals(){
    const L=Object.fromEntries(window.eviaData.list("lessonResults",{course}).map(r=>[r.lessonId,r]));
    const m={gold:0,silver:0,bronze:0};Object.values(L).forEach(r=>{if(r&&r.done)m[r.best>=.9?"gold":r.best>=.7?"silver":"bronze"]++});return m;
  }
  /* A doodle behind each subject tile, like the games' backgrounds: line drawings in the learner's colour. */
  const D=(inner)=>'<span class="tg-doodle" aria-hidden="true"><svg viewBox="0 0 160 120" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'+inner+'</svg></span>';
  const DOODLE={
    /* Bricks, a trowel and a spirit level. */
    brick:D('<path d="M40 112h116M40 96h116M40 80h116M40 64h116M58 112V96M96 112V96M134 112V96M77 96V80M115 96V80M153 96V80M58 80V64M96 80V64M134 80V64"/><path d="M92 40l30-22 16 6-26 26z"/><path d="M122 18l14-14"/><rect x="18" y="20" width="56" height="12" rx="3"/><circle cx="46" cy="26" r="3"/>'),
    /* A saw, a square and a plank with grain. */
    timber:D('<path d="M40 104h112l-6 12H46z"/><path d="M60 110c14-3 30 2 44-1s26 2 36-1"/><path d="M88 18l52 40-8 10-52-40z"/><path d="M140 58l12 12-8 8-12-12"/><path d="M92 26l4-4M100 32l4-4M108 38l4-4M116 44l4-4M124 50l4-4"/><path d="M18 20v52h48"/><path d="M28 30v32h28"/>'),
    /* Numbers, signs, a set square and a ruler. */
    maths:D('<path d="M44 20h16M52 12v16"/><path d="M118 14l12 12M130 14l-12 12"/><path d="M82 30h16M82 38h16"/><path d="M60 108V60l48 48z"/><path d="M68 92v8h8"/><rect x="118" y="44" width="16" height="70" rx="3" transform="rotate(12 126 79)"/><path d="M124 56l6 1M123 66l6 1M121 76l6 1M119 86l6 1M117 96l6 1"/><path d="M20 70c0-8 12-8 12 0s-12 12-12 18h12"/>'),
    /* A speech bubble, a pencil, lines of writing and quote marks. */
    english:D('<path d="M86 14h56a10 10 0 0 1 10 10v24a10 10 0 0 1-10 10h-34l-14 12V58h-8a10 10 0 0 1-10-10V24a10 10 0 0 1 10-10z"/><path d="M92 28h42M92 40h28"/><path d="M40 112l6-20 56-56 14 14-56 56z"/><path d="M96 42l14 14"/><path d="M122 84h30M122 96h30M122 108h20"/><path d="M26 22c-6 2-8 8-6 14M38 22c-6 2-8 8-6 14"/>'),
    /* A clipboard with ticks, a tape measure and a square. */
    skills:D('<rect x="70" y="16" width="56" height="74" rx="6"/><path d="M88 16v-6h20v6"/><path d="M80 36l5 5 9-9M80 56l5 5 9-9M80 76l5 5 9-9M102 38h16M102 58h16M102 78h16"/><rect x="18" y="80" width="34" height="34" rx="8"/><circle cx="35" cy="97" r="7"/><path d="M52 104h40"/><path d="M134 50v62h-22"/>'),
    /* People together, a heart and a shield. */
    edi:D('<circle cx="54" cy="70" r="9"/><circle cx="84" cy="62" r="10"/><circle cx="114" cy="70" r="9"/><path d="M38 110c2-14 9-22 16-22s14 8 16 22M66 110c2-18 9-28 18-28s16 10 18 28M98 110c2-14 9-22 16-22s14 8 16 22"/><path d="M84 36c-6-10-20-6-18 4 2 8 18 16 18 16s16-8 18-16c2-10-12-14-18-4z"/><path d="M140 14l14 6v12c0 10-6 16-14 20-8-4-14-10-14-20V20z"/><path d="M134 32l5 5 9-9"/>')
  };
  const doodleFor=id=>id==="course"?(["site","joiner"].includes(course)?DOODLE.timber:DOODLE.brick):DOODLE[id]||"";
  const PLAY='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
  function teachPage(){
    const T=window.eviaTeach,E=window.EVIA_TEACH||{fs:[]},R=window.eviaRewards,I=(E.ui&&E.ui.ICON)||{};
    const trade=(T&&T.COURSES&&T.COURSES[course])||[],fs=f=>(E.fs||[]).filter(u=>u.fs===f);
    const subjects=[["course",courseName()||"Your course",count(trade)],["maths","Maths",count(fs("maths"))],["english","English",count(fs("english"))],["edi","EDI and safeguarding",count(fs("edi"))]].filter(x=>x[2].total||x[0]==="course");
    const me=T&&T.stats?T.stats():{xp:0,streak:0,today:false},bal=R&&R.balance?R.balance():0,md=medals(),won=md.gold+md.silver+md.bronze;
    /* The player card: Evia, the medals won in Teach me, the day streak and coins. */
    const player='<section class="tg-player"><div class="tg-me"><span class="tg-evia evia-mini" aria-hidden="true"><span class="evia-face"><i></i><i></i></span></span></div>'+
      '<div class="tg-xp"><div class="tg-xp-top"><strong>'+won+'<small> '+(won===1?"medal":"medals")+'</small></strong><span>'+(won?"Replay a lesson to go for gold":"Finish a lesson to win one")+'</span></div>'+
      '<div class="tg-medals">'+["gold","silver","bronze"].map(k=>'<span class="tg-medal medal-'+k+'" aria-label="'+md[k]+' '+k+'"><i aria-hidden="true"></i><b>'+md[k]+'</b></span>').join("")+'</div>'+
      '<div class="tg-pills"><span class="tg-pill fire'+(me.today?" lit":"")+'">'+(I.flame||"")+'<b>'+me.streak+'</b> day streak</span><span class="tg-pill coin">'+(R&&R.coin?R.coin():"")+'<b>'+bal+'</b> coins</span>'+'</div></div></section>';
    /* Up next: one tap straight into the next lesson. */
    const nx=T&&T.nextUp?T.nextUp():null;
    const next=nx?'<button type="button" class="tg-next" data-play="'+esc(nx.id)+'"><span class="tg-next-copy"><small>'+(nx.resume?"Carry on":"Up next")+' · '+esc(nx.unit)+'</small><strong>'+esc(nx.title)+'</strong><span>Lesson '+nx.n+' of '+nx.of+' · about '+nx.mins+' min</span></span><span class="tg-play">'+PLAY+'</span></button>':"";
    const tile=([id,title,c])=>{const pct=c.total?Math.round(c.done/c.total*100):0;
      return '<button type="button" class="tt-card tg-tile tg-'+id+'" data-go="'+id+'">'+doodleFor(id)+'<span class="tg-tile-top"><span class="tg-tile-ic" aria-hidden="true">'+ICON[id]+'</span><span class="tg-ring" style="--p:'+pct+'" aria-hidden="true"><b>'+pct+'%</b></span></span><strong>'+esc(title)+'</strong><small>'+c.done+' of '+c.total+' lessons</small></button>'};
    /* The Shop: a big button under the player card, so learners can't miss where their coins go. */
    const shopBtn=R?'<button type="button" class="tg-shop-big" id="tg-shop"><span class="tg-shop-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg></span><span class="tg-shop-txt"><strong>Shop</strong><small>Spend your '+bal+' coins on new looks for Evia</small></span><span class="tg-shop-go" aria-hidden="true">›</span></button>':"";
    scr().innerHTML=head("Learn")+player+shopBtn+next+'<h2 class="ui-section-label">Subjects</h2><div class="tg-grid">'+subjects.map(tile).join("")+'</div><div class="tg-duo">'+skillsTile()+epaTile()+'</div>'+games();
    const shop=document.getElementById("tg-shop");if(shop)shop.onclick=()=>nav("rewards");
    const et=document.getElementById("tg-epa");if(et)et.onclick=()=>window.eviaOpenEpa&&window.eviaOpenEpa();
    const sk=document.getElementById("tg-skills");if(sk)sk.onclick=()=>window.eviaPractice&&window.eviaPractice.openSkills();
    scr().querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{if(T)T.open(b.dataset.go)});
    scr().querySelectorAll("[data-play]").forEach(b=>b.onclick=()=>{if(T&&T.play)T.play(b.dataset.play)});
    const lbo=document.getElementById("lb-open");if(lbo)lbo.onclick=()=>window.eviaLeaderboard.open();
    scr().querySelectorAll("[data-game]").forEach(b=>b.onclick=()=>{const id=b.dataset.game;
      if(R&&R.owns(id))window.eviaGames.open(b.dataset.key);else if(R)R.openItem(id)});
  }
  /* Skills: practical college tasks (1 to 6 hours) that Evia picks from the confidence check, with a self mark sheet
     (practice.js). Sits beside EPA practice, the two sharing a row. */
  function skillsTile(){
    const P=window.eviaPractice,s=P&&P.skillsSummary?P.skillsSummary():null;
    if(!s||!(window.EVIA_PRACTICE_TASKS||{})[course])return "";
    const line=s.active?"In progress":s.picks?s.picks+(s.picks===1?" pick":" picks")+" for you":s.checked?"Pick a task":"Do a confidence check";
    return '<button type="button" class="tt-card tg-tile tg-skills" id="tg-skills">'+DOODLE.skills+'<span class="tg-tile-top"><span class="tg-tile-ic" aria-hidden="true">'+ICON.skills+'</span>'+(s.picks&&!s.active?'<span class="tg-badge" aria-hidden="true">'+s.picks+'</span>':"")+'</span><strong>Skills</strong><small>'+esc(line)+'</small><small class="tg-sub">'+(s.done?s.done+" completed":"College tasks, 1 to 6 hours")+'</small></button>';
  }
  /* EPA practice: the end-point assessment (knowledge tests on the NVQ), dark like the practice itself. */
  function epaTile(){
    if(!window.eviaOpenEpa)return "";
    const nvq=window.eviaNvq&&window.eviaNvq.on(),tests=window.eviaData.list("tests").filter(t=>t&&t.course===course&&t.type==="epa");
    const best=tests.length?Math.max(...tests.map(t=>Number(t.pct)||0)):null,last=tests.length?tests[tests.length-1]:null;
    return '<button type="button" class="tg-epa" id="tg-epa"><span class="tg-epa-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15l-3-1.8-3 1.8-3-1.8-3 1.8V5A1.5 1.5 0 0 1 7 3.5Z"/><path d="M9 8.5h6M9 12h6"/></svg></span>'+
      '<span class="tg-epa-copy"><small>'+(nvq?"Knowledge":"End-point assessment")+'</small><strong>'+(nvq?"Knowledge tests":"EPA practice")+'</strong><span>'+(nvq?"Quick practice and full knowledge tests":"Quick practice, full mocks and professional discussion")+'</span></span>'+
      '<span class="tg-epa-score">'+(best==null?'<b>Start</b><small>No tests yet</small>':'<b>'+best+'%</b><small>best · last '+last.pct+'%</small>')+'</span></button>';
  }
  /* Mini games: all free, played here. */
  const LOCK='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>';
  const SHOTS=["battle","brickle","crossword","flappy","showdown","siterun","quest"]; /* games/<key>.jpg (siterun and quest are parked) */
  function games(){
    const G=window.eviaGames,R=window.eviaRewards;if(!G||!R)return "";
    const PRICE={common:30,rare:80,epic:180},room=R.gameRoom(),earned=R.GAME_DAILY-room;
    return '<section class="tt-games"><div class="tt-games-head"><h2 class="ui-section-label">Mini games</h2><span>'+(room?earned+" of "+R.GAME_DAILY+" game coins today":"Today’s game coins collected")+'</span></div>'+
      (window.eviaLeaderboard?'<button type="button" class="lb-open-btn" id="lb-open"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg><span><strong>Leaderboards</strong><small>This month at your college · top 3 win coins</small></span><span aria-hidden="true">›</span></button>':"")+'<div class="tg-games">'+
      G.GAMES.map(g=>{const own=R.owns(g.id);
        /* Top three-quarters: a screenshot of the game. Bottom quarter: its name and what it is. */
        return '<button type="button" class="tt-game tg-game g-'+g.key+(own?"":" locked")+'" data-game="'+g.id+'" data-key="'+g.key+'" aria-label="'+esc(g.label+". "+g.about+(own?"":" Unlock in Rewards."))+'">'+
          '<span class="tg-shot">'+(SHOTS.includes(g.key)?'<img src="games/'+g.key+'.jpg" alt="" loading="lazy" decoding="async">':'<span class="tg-game-ic" aria-hidden="true">'+G.iconFor(g.key)+'</span>')+
          (own?'<span class="tg-game-go">'+PLAY+'Play</span>':'<span class="tg-game-go lock">'+LOCK+(PRICE[g.rarity]?'<b>'+PRICE[g.rarity]+'</b>':"")+'</span>')+'</span>'+
          '<span class="tg-info"><strong>'+esc(g.label)+'</strong><small>'+esc(g.about)+'</small></span></button>'}).join("")+'</div></section>';
  }
  /* The Shop, opened from Learn, with a way back. */
  function rewardsPage(){
    if(window.eviaRewards)window.eviaRewards.page();else scr().innerHTML=head("Shop");
    const h=scr().querySelector(".ui-page-head h1");if(h&&h.textContent==="Rewards")h.textContent="Shop";
    const b=document.createElement("button");b.type="button";b.className="secondary tg-back";b.textContent="‹ Learn";b.onclick=()=>nav("teach");
    const hd=scr().querySelector(".ui-page-head");if(hd)hd.after(b);else scr().prepend(b);
  }

  const prev=window.render;
  window.render=function(){
    if(window.eviaRewards&&window.eviaRewards.later)window.eviaRewards.later();
    if(screen!=="teach"&&screen!=="rewards")return prev();
    const pb=document.getElementById("profile-btn");if(pb)pb.style.display="flex";
    document.querySelectorAll("[data-nav]").forEach(b=>b.classList.toggle("active",b.dataset.nav==="teach"));
    const s=scr();if(s)s.classList.add("ui-top");
    const t=document.getElementById("page-title");if(t)t.textContent=screen==="teach"?"Learn":"Shop";
    if(screen==="teach")teachPage();else rewardsPage();
  };
})();
