/* Evia7 game leaderboards, kept in Nisia: one board per game, for the learner's college, starting again each month.
   The top 3 when a month ends win coins (100, 60, 30), paid the next time Evia syncs.
   Learners choose to join and pick the name shown (first name and initial to start with). Only that name and their
   scores go to Nisia; leaving removes them. Not joined, or not with a college: nothing is sent.
   Scores are queued on the phone and sent with the next sync, so offline games still count (within the month).
   Games report through eviaGames.finish({lb:{game,score}}) (games.js).
   window.eviaLeaderboard: submit(game,score), open(game), endLine(game,el), onSync(), settings(), GAMES */
(function(){
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const KEY="evia7-leaderboard",QUEUE="evia7-lb-queue",DAILY="evia7-lb-daily",WON="evia7-lb-won";
  const PRIZES=[100,60,30];
  /* What each board counts: a best (max), or how many (add, with a daily limit so replays don't pile up). */
  const GAMES={
    battle:{label:"Question Battle",mode:"add",perDay:20,unit:["win","wins"],what:"Battles won"},
    showdown:{label:"Site Showdown",mode:"max",unit:["win","wins"],what:"Best run"},
    flappy:{label:"Flappy Evia",mode:"max",unit:["point","points"],what:"Best score"},
    brickle:{label:"T.R.A.D.E",mode:"add",perDay:1,unit:["word","words"],what:"Daily words solved"},
    crossword:{label:"Crossword",mode:"add",perDay:5,unit:["crossword","crosswords"],what:"Solved without reveals"}
  };
  const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||"null");return v==null?f:v}catch(_){return f}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
  const month=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")};
  const today=()=>new Date().toISOString().slice(0,10);
  const college=()=>{const e=window.eviaNisia&&window.eviaNisia.joined();return e&&e.live?e:null};
  const settings=()=>read(KEY,{on:false,name:""});
  const defaultName=()=>{try{const p=String((window.eviaData.learner()||{}).name||"").trim().split(/\s+/);return p[0]?p[0]+(p[1]?" "+p[p.length-1][0].toUpperCase():""):""}catch(_){return ""}};
  const clean=n=>String(n||"").replace(/[^A-Za-z0-9 .'-]/g,"").replace(/\s+/g," ").trim().slice(0,20);
  const plural=(g,n)=>n+" "+(n===1?GAMES[g].unit[0]:GAMES[g].unit[1]);
  const ordinal=n=>n+(n%100>=11&&n%100<=13?"th":["th","st","nd","rd"][n%10]||"th");

  /* ---------- Sending scores ---------- */
  function submit(game,score){
    const g=GAMES[game],s=settings();if(!g||!s.on||!college())return false;
    score=Math.max(0,Math.floor(score)||0);if(g.mode==="max"&&!score)return false;
    if(g.mode==="add"){
      const d=read(DAILY,{}),k=game+":"+today();if((d[k]||0)>=g.perDay)return false;
      d[k]=(d[k]||0)+1;Object.keys(d).forEach(x=>{if(!x.endsWith(today()))delete d[x]});write(DAILY,d);score=1;
    }
    const q=read(QUEUE,[]);q.push({game,score,mode:g.mode,month:month()});write(QUEUE,q.slice(-200));
    flush().catch(()=>{});return true;
  }
  let flushing=null,again=false;
  function flush(){
    if(flushing){again=true;return flushing}
    flushing=(async()=>{
      const s=settings();if(!s.on||!college()||!navigator.onLine)return;
      const taken=read(QUEUE,[]),q=taken.filter(x=>x.month===month());   /* last month's board has closed */
      /* Bests only need their highest; counts go one at a time. */
      const best={};q.filter(x=>x.mode==="max").forEach(x=>{best[x.game]=Math.max(best[x.game]||0,x.score)});
      const jobs=Object.entries(best).map(([game,score])=>({game,score,mode:"max"})).concat(q.filter(x=>x.mode==="add"));
      const left=[];
      for(const j of jobs){
        try{await window.eviaNisia.rpc("nisia_game_score",{p_game:j.game,p_score:j.score,p_mode:j.mode,p_name:s.name})}
        catch(err){console.warn("Evia: leaderboard score",err&&err.message);left.push(Object.assign({month:month()},j))}
      }
      /* Anything added while these were sending stays for the next go. */
      write(QUEUE,left.concat(read(QUEUE,[]).slice(taken.length)));
    })().finally(()=>{flushing=null;if(again){again=false;flush().catch(()=>{})}});
    return flushing;
  }
  /* Prizes from months that have ended: paid once, celebrated by Evia (stats.js nudges). */
  async function claim(){
    if(!settings().on&&!read(WON,null))return;   /* never joined: nothing to claim */
    const rows=await window.eviaNisia.rpc("nisia_claim_prizes",{});
    if(!rows||!rows.length)return;
    const won=read(WON,[])||[];
    rows.forEach(r=>{
      const g=GAMES[r.game],label=g?g.label:r.game,when=new Date(r.month+"T12:00:00").toLocaleDateString("en-GB",{month:"long"});
      if(window.eviaRewards&&window.eviaRewards.prize)window.eviaRewards.prize(r.coins,ordinal(r.place)+" in "+label+" in "+when);
      won.push({id:r.game+":"+r.month,game:r.game,label,month:when,place:r.place,coins:r.coins,seen:false});
    });
    write(WON,won.slice(-24));
  }
  async function onSync(){await flush();try{await claim()}catch(err){console.warn("Evia: leaderboard prizes",err&&err.message)}}

  /* ---------- The boards ---------- */
  const MEDAL=p=>'<span class="lb-medal m'+p+'" aria-label="'+ordinal(p)+'">'+p+'</span>';
  function daysLeft(){const d=new Date(),end=new Date(d.getFullYear(),d.getMonth()+1,1);return Math.max(1,Math.ceil((end-d)/864e5))}
  function open(game){
    const root=document.getElementById("modal-root");
    let cur=GAMES[game]?game:"showdown";
    root.innerHTML='<div class="overlay lb-overlay"><section class="sheet pr-sheet lb-sheet" role="dialog" aria-modal="true" aria-labelledby="lb-title"><div class="sheet-head"><div><div class="chat-kicker">'+
      esc(new Date().toLocaleDateString("en-GB",{month:"long"}).toUpperCase())+' · '+daysLeft()+' DAY'+(daysLeft()===1?"":"S")+' LEFT</div><h2 id="lb-title">Leaderboards</h2></div><button class="close" id="lb-close" type="button" aria-label="Close">×</button></div>'+
      '<div class="pr-body"><div class="lb-tabs" role="tablist">'+Object.entries(GAMES).map(([k,g])=>'<button type="button" role="tab" data-lb="'+k+'">'+esc(g.label)+'</button>').join("")+'</div>'+
      '<p class="lb-prize"><b>Top 3 on the last day win coins:</b> '+PRIZES.map((c,i)=>MEDAL(i+1)+c).join(" ")+'</p><div class="lb-board" aria-live="polite"></div><div class="lb-me"></div></div></section></div>';
    const close=()=>{root.innerHTML=""};
    root.querySelector("#lb-close").onclick=close;root.querySelector(".overlay").onclick=e=>{if(e.target.classList.contains("overlay"))close()};
    const draw=async()=>{
      root.querySelectorAll("[data-lb]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.lb===cur)));
      const box=root.querySelector(".lb-board"),g=GAMES[cur];
      if(!college()){box.innerHTML='<p class="lb-note">Leaderboards are for learners connected to a college. Connect from your profile with your assessor’s code.</p>';drawMe();return}
      if(!navigator.onLine){box.innerHTML='<p class="lb-note">You’re offline. Leaderboards show when you have signal. Your scores still count: they go when you’re back online.</p>';drawMe();return}
      box.innerHTML='<p class="lb-note">Loading…</p>';
      try{
        await flush();
        const b=await window.eviaNisia.rpc("nisia_leaderboard",{p_game:cur});if(GAMES[cur]!==g)return;
        const top=(b&&b.top)||[],me=b&&b.me;
        box.innerHTML='<p class="lb-what">'+esc(g.what)+' this month · '+(b.players||0)+' player'+(b.players===1?"":"s")+'</p>'+
          (top.length?'<ol class="lb-list">'+top.map(r=>'<li class="'+(r.me?"me":"")+'">'+(r.place<=3?MEDAL(r.place):'<span class="lb-place">'+r.place+'</span>')+'<span class="lb-name">'+esc(r.name)+(r.me?' <small>(you)</small>':"")+'</span><b>'+esc(plural(cur,r.score))+'</b></li>').join("")+
            (me&&me.place>10?'<li class="me gap"><span class="lb-place">'+me.place+'</span><span class="lb-name">You</span><b>'+esc(plural(cur,me.score))+'</b></li>':"")+'</ol>'
            :'<p class="lb-note">Nobody’s on the board yet this month. Play '+esc(g.label)+' to be first.</p>');
      }catch(err){box.innerHTML='<p class="lb-note">Couldn’t load the leaderboard. Try again in a moment.</p>'}
      drawMe();
    };
    /* Joining, the name shown, and leaving. */
    const drawMe=()=>{
      const el=root.querySelector(".lb-me"),s=settings();if(!college()){el.innerHTML="";return}
      el.innerHTML=s.on?'<div class="lb-joined"><span>You’re on the boards as <b>'+esc(s.name)+'</b></span><button type="button" class="linkish" id="lb-rename">Change name</button><button type="button" class="linkish" id="lb-leave">Leave</button></div>':
        '<div class="lb-join"><strong>Join your college’s leaderboards</strong><p>Only the name you choose and your game scores are shared, with learners at your college. You can leave any time, and your scores are removed.</p>'+
        '<label class="lb-name-field">Name to show<input id="lb-name" maxlength="20" value="'+esc(s.name||defaultName())+'"></label><button type="button" class="primary" id="lb-join">Join</button></div>';
      const j=el.querySelector("#lb-join");if(j)j.onclick=async()=>{const n=clean(el.querySelector("#lb-name").value);if(n.length<2){el.querySelector("#lb-name").focus();return}write(KEY,{on:true,name:n});draw()};
      const rn=el.querySelector("#lb-rename");if(rn)rn.onclick=()=>{const n=clean(prompt("Name to show on the leaderboards",s.name)||"");if(n.length>=2){write(KEY,{on:true,name:n});draw()}};
      const lv=el.querySelector("#lb-leave");if(lv)lv.onclick=async()=>{if(!confirm("Leave the leaderboards? Your name and scores are removed."))return;
        try{await window.eviaNisia.rpc("nisia_game_leave",{})}catch(err){alert("Couldn’t reach Nisia. Try again when you have signal.");return}
        write(KEY,{on:false,name:s.name});write(QUEUE,[]);draw()};
    };
    root.querySelectorAll("[data-lb]").forEach(b=>b.onclick=()=>{cur=b.dataset.lb;draw()});
    draw();
  }
  /* The line on a game's end card: where they are this month, or an invitation to join. */
  async function endLine(game,el){
    if(!GAMES[game]||!college()){el.remove();return}
    const s=settings();
    if(!s.on){el.innerHTML='<button type="button" class="linkish" data-lb-open>Join your college’s leaderboard ›</button>';el.querySelector("[data-lb-open]").onclick=()=>open(game);return}
    el.innerHTML='<span class="lb-end-t">Checking the leaderboard…</span>';
    try{
      await flush();const b=await window.eviaNisia.rpc("nisia_leaderboard",{p_game:game}),me=b&&b.me;
      el.innerHTML=(me?'<span class="lb-end-t">'+(me.place<=3?MEDAL(me.place):"")+'You’re <b>'+ordinal(me.place)+'</b> of '+b.players+' at your college this month</span>':'<span class="lb-end-t">Not on this month’s board yet</span>')+
        '<button type="button" class="linkish" data-lb-open>See the leaderboard ›</button>';
      el.querySelector("[data-lb-open]").onclick=()=>open(game);
    }catch(_){el.innerHTML='<span class="lb-end-t">Your score goes on the leaderboard when you’re back online.</span>'}
  }
  const unseenWins=()=>(read(WON,[])||[]).filter(w=>!w.seen);
  const markWinsSeen=()=>{const w=read(WON,[])||[];w.forEach(x=>x.seen=true);write(WON,w)};
  window.eviaLeaderboard={GAMES,submit,open,endLine,onSync,settings,unseenWins,markWinsSeen};
})();
