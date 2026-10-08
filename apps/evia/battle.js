/* Question Battle: two learners at the same college, live. Each has 5 HP and a hand of 4 question cards, dealt at
   random from their course's checked questions (Teach me); when the hand's used up, 4 fresh ones. They take turns: the
   attacker throws a card at the other, who has a few seconds to answer. Right: BLOCKED, no damage. Wrong or too slow:
   HIT, -1 HP (a boss card hits for 2, and blocking one heals 1). First to 0 HP loses. Each player sees the other's
   own Evia: their shape, colour and kit. Nisia keeps the battle and holds the right answer until it's answered
   (battles.sql); only first names and initials are shown, and there's no chat. Learners on different courses battle
   with the questions every course shares: maths, English and people.
   Free for everyone; in Learn, at the top of the games. */
(function(){
  const G=window.eviaGames;if(!G||!G.register)return;
  const {esc,buzz,reduced}=G;
  const A=()=>window.NisiaActions,R=()=>window.eviaRewards,N=()=>window.eviaNisia;
  const HAND=4,HP=5,POLL=1200;
  const KIND={quick:["Quickfire","15s"],think:["Thinking","25s"],trap:["Trap","20s"],boss:["Boss","2 damage · 30s"]};
  const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  const plain=s=>String(s||"").replace(/\*([^*]+)\*/g,"$1");
  const wait=ms=>new Promise(r=>setTimeout(r,ms));

  /* ---------- The cards: every question in the course's Teach me lessons ---------- */
  function cardsFrom(units,label){
    const out=[];
    (units||[]).forEach(u=>(u.lessons||[]).forEach(l=>{
      const challenge=(l.steps||[]).some(s=>s.t==="banner");
      (l.steps||[]).forEach(s=>{
        let c=null;
        if(s.t==="choice"&&s.opts)c={q:s.q,opts:s.opts.slice(),a:s.a||0,why:s.why,kind:"think"};
        else if(s.t==="tf")c={q:s.q,opts:["True","False"],a:s.a?0:1,why:s.why,kind:"quick",fixed:true};
        else if(s.t==="quick")(s.items||[]).forEach(i=>out.push({q:i.q,opts:["True","False"],a:i.a?0:1,why:"",kind:"quick",fixed:true,topic:label||u.unit}));
        else if(s.t==="scene"&&s.opts){const ok=s.opts.findIndex(o=>o.ok);c={q:(s.say?(s.who?s.who+": ":"")+"“"+s.say+"” ":"")+s.q,opts:s.opts.map(o=>o.text),a:ok<0?0:ok,why:(s.opts[ok]||{}).why||"",kind:"trap"}}
        else if(s.t==="spot"&&s.lines)c={q:s.q,opts:s.lines.slice(),a:s.a,why:s.why,kind:"think",fixed:true};
        else if(s.t==="next"&&s.opts)c={q:"What comes next? "+(s.seq||[]).join(" → ")+" → …",opts:s.opts.slice(),a:0,why:s.why,kind:"think"};
        if(!c||!c.q||!c.opts||c.opts.length<2)return;
        if(challenge&&c.kind==="think"&&Math.random()<.35)c.kind="boss";
        c.topic=label||u.unit;out.push(c);
      });
    }));
    return out.map(c=>Object.assign({},c,{q:plain(c.q),opts:c.opts.map(plain),why:plain(c.why)}));
  }
  function pool(mixed){
    const T=window.EVIA_TEACH||{},mine=typeof course!=="undefined"?course:"bricklayer";
    const shared=cardsFrom(T.fs||[]);
    const own=mixed?[]:cardsFrom((T.courses||{})[mine]||[]);
    return own.length?own.concat(shared.filter(()=>Math.random()<.15)):shared;
  }
  /* A card ready to throw: its answers in a new order (true/false and "spot the line" keep theirs). */
  function ready(c){
    if(c.fixed)return {q:c.q,opts:c.opts,a:c.a,why:c.why||"",kind:c.kind,topic:c.topic};
    const order=shuffle(c.opts.map((o,i)=>i));
    return {q:c.q,opts:order.map(i=>c.opts[i]),a:order.indexOf(c.a),why:c.why||"",kind:c.kind,topic:c.topic};
  }
  function deal(deck,used){const left=deck.filter(c=>!used.has(c.q)),from=left.length>=HAND?left:deck;return shuffle(from).slice(0,HAND).map(c=>{used.add(c.q);return ready(c)})}

  /* ---------- Who's playing ---------- */
  function me(){
    let L=window.eviaData&&window.eviaData.learner?window.eviaData.learner():{};if(Array.isArray(L))L=L[0];const parts=String(L&&L.name||"").trim().split(/\s+/);
    return {name:parts[0]?parts[0]+(parts[1]?" "+parts[1][0]+".":""):"Player",course:typeof course!=="undefined"?course:"",look:R()&&R().myLook?R().myLook():{}};
  }
  const avatar=(look,cls)=>R()&&R().lookHtml?R().lookHtml(look,"bt-av "+(cls||"")):'<span class="bt-av"></span>';
  const hearts=(n,cls)=>'<span class="bt-hp '+(cls||"")+'" aria-label="'+n+' of '+HP+' HP">'+Array.from({length:HP},(_,i)=>'<i class="'+(i<n?"on":"")+'"></i>').join("")+'</span>';

  /* ---------- The game ---------- */
  function run(ctx){
    const body=ctx.body;let st=null,id=null,timer=null,tick=null,deck=[],used=new Set(),hand=[],lastSeq=0,busy=false,shown="",clock=0,mixed=false,wrongs=[];
    const stop=()=>{clearInterval(timer);clearInterval(tick);timer=tick=null};
    ctx.stops.push(()=>{stop();if(id&&st&&(st.status==="playing"||st.status==="waiting"))A().send("battleLeave",{p_id:id}).catch(()=>{})});
    const joined=()=>{const n=N();const e=n&&n.joined&&n.joined();return !!(e&&e.live)};

    function lobby(note){
      stop();id=null;st=null;
      const m=me();
      body.innerHTML='<div class="bt bt-lobby"><div class="bt-lobby-me">'+avatar(m.look,"big")+'<strong>'+esc(m.name)+'</strong></div>'+
        '<h2>Question Battle</h2><p class="bt-lead">Take on someone from your college, live. Throw questions at their Evia; answer theirs to block.</p>'+
        '<ul class="bt-rules"><li><b>'+HP+' HP</b> each. A wrong or slow answer is a hit.</li><li><b>4 cards</b> in your hand. Use them all and you get 4 fresh ones.</li><li><b>Boss</b> cards hit for 2, but block one and you heal 1.</li></ul>'+
        (note?'<p class="bt-note">'+esc(note)+'</p>':"")+
        (joined()?'<button type="button" class="primary bt-go" data-find>Find a battle</button>':'<p class="bt-note">Connect Evia to your college to battle your classmates.</p>')+'</div>';
      const f=body.querySelector("[data-find]");if(f)f.onclick=find;
    }
    async function find(){
      const m=me();
      body.innerHTML='<div class="bt bt-wait"><div class="bt-radar">'+avatar(m.look,"big")+'</div><h2>Looking for someone at your college…</h2><p class="bt-lead">Ask a classmate to tap <b>Find a battle</b> too.</p><button type="button" class="secondary" data-cancel>Cancel</button></div>';
      body.querySelector("[data-cancel]").onclick=async()=>{const x=id;stop();id=null;if(x)A().send("battleLeave",{p_id:x}).catch(()=>{});lobby()};
      try{const r=await A().send("battleFind",{p_name:m.name,p_course:m.course,p_look:m.look});id=r.id}catch(e){return lobby(e.message||"Couldn’t reach Nisia. Try again.")}
      timer=setInterval(poll,POLL);poll();
    }
    async function poll(){
      if(!id||busy)return;
      let s;try{s=await A().send("battleState",{p_id:id})}catch(e){return}
      if(!id)return;
      if(s.status==="expired"){stop();return lobby("No one was free. Try again in a minute, or ask a classmate to join.")}
      if(s.status==="waiting"){st=s;return}
      const first=!st||st.status!=="playing"&&s.status==="playing";
      st=s;
      if(first){mixed=!!(s.me.course&&s.them.course&&s.me.course!==s.them.course);deck=pool(mixed);hand=deal(deck,used);lastSeq=s.last&&s.last.seq||0;return intro()}
      if(s.last&&s.last.seq>lastSeq){lastSeq=s.last.seq;await event(s.last);return draw(true)}
      draw();
    }
    /* VS screen */
    async function intro(){
      busy=true;
      body.innerHTML='<div class="bt bt-vs"><div class="bt-vs-side them">'+avatar(st.them.look,"big")+'<strong>'+esc(st.them.name)+'</strong></div><b class="bt-vs-x">VS</b><div class="bt-vs-side me">'+avatar(st.me.look,"big")+'<strong>'+esc(st.me.name)+'</strong></div>'+
        (mixed?'<p class="bt-note">Different courses: you’re battling with maths, English and people questions.</p>':"")+'</div>';
      fit();buzz(30);await wait(reduced()?900:2200);busy=false;draw(true);
    }
    const fit=()=>{if(R()&&R().fitAll)setTimeout(()=>R().fitAll(body),30)};
    /* What happened to the last card: blocked, or hit. */
    async function event(e){
      if(e.skip||e.left)return;
      busy=true;
      const mine=e.by===st.side,hit=!e.correct,dmg=e.dmg||0;
      const target=mine?".bt-top .bt-av":".bt-me .bt-av";
      draw(true,true);
      const el=body.querySelector(".bt-arena");
      if(el){
        el.innerHTML='<div class="bt-fx '+(hit?"hit":"block")+'"><b>'+(hit?(e.timeout?"TOO SLOW! ":"")+"HIT!":"BLOCKED!")+'</b><span>'+(hit?"−"+dmg+" HP":e.heal?"+1 HP":"No damage")+'</span></div>'+
          (!mine?'<div class="bt-learn"><small>'+(e.correct?"Right":"The answer")+'</small><p>'+esc((e.opts||[])[e.a]||"")+'</p>'+(e.why?'<p class="bt-why">'+esc(e.why)+'</p>':"")+'</div>':'<div class="bt-learn"><small>'+esc(st.them.name)+' '+(e.correct?"knew it":"didn’t know")+'</small><p>'+esc(e.q||"")+'</p></div>');
        const av=body.querySelector(target);if(av)av.classList.add(hit?"bt-shake":"bt-shield");
        buzz(hit?[40,30,60]:20);
        if(!mine&&!e.correct)wrongs.push(e);
      }
      await wait(hit&&!mine?3200:2400);busy=false;
    }
    function draw(force,hold){
      if(!st)return;
      if(st.status==="done")return end();
      const myTurn=st.turn===st.side,phase=st.phase,key=[st.moves,phase,st.turn,st.hp_me,st.hp_them,hand.length].join("|");
      clock=st.secs_left||0;
      if(!force&&key===shown){tickNow();return}
      shown=key;
      if(myTurn&&phase==="pick"&&!hand.length)hand=deal(deck,used);
      let arena="",bottom="";
      if(phase==="pick"&&myTurn){
        arena='<div class="bt-say"><b>Your attack!</b><span>Pick a card to throw at '+esc(st.them.name)+'</span></div>';
        bottom='<div class="bt-hand">'+hand.map((c,i)=>'<button type="button" class="bt-card k-'+c.kind+'" data-card="'+i+'"><span class="bt-kind">'+KIND[c.kind][0]+'<small>'+KIND[c.kind][1]+'</small></span><span class="bt-topic">'+esc(c.topic||"")+'</span><span class="bt-q">'+esc(c.q)+'</span></button>').join("")+'</div><p class="bt-left">'+hand.length+' of 4 cards left</p>';
      }else if(phase==="pick"){
        arena='<div class="bt-say"><b>'+esc(st.them.name)+' is choosing an attack…</b><span>Get ready to block.</span></div>';
        bottom='<p class="bt-left">'+hand.length+' of 4 cards in your hand</p>';
      }else if(phase==="answer"&&myTurn){
        arena='<div class="bt-flying up"><span class="bt-kind">'+KIND[(st.card||{}).kind||"think"][0]+'</span><p>'+esc((st.card||{}).q||"")+'</p></div><div class="bt-say"><span>Will '+esc(st.them.name)+' block it?</span></div>';
      }else if(phase==="answer"){
        const c=st.card||{};
        arena='<div class="bt-incoming"><span class="bt-kind k-'+esc(c.kind)+'">QUESTION ATTACK · '+KIND[c.kind||"think"][0]+'</span><p class="bt-iq">'+esc(c.q||"")+'</p></div>';
        bottom='<div class="bt-answers">'+(c.opts||[]).map((o,i)=>'<button type="button" data-ans="'+i+'"><i>'+"ABCDEF"[i]+'</i><span>'+esc(o)+'</span></button>').join("")+'</div>';
      }
      if(hold)bottom="";
      body.innerHTML='<div class="bt bt-play">'+
        '<div class="bt-top">'+avatar(st.them.look)+'<div><strong>'+esc(st.them.name)+'</strong>'+hearts(st.hp_them)+'</div><span class="bt-clock" aria-live="off"></span></div>'+
        '<div class="bt-arena">'+arena+'</div>'+
        '<div class="bt-me">'+avatar(st.me.look,"small")+'<div><strong>You</strong>'+hearts(st.hp_me)+'</div></div>'+bottom+'</div>';
      fit();tickNow();
      if(!tick)tick=setInterval(()=>{if(clock>0)clock--;tickNow()},1000);
      if(hold)return;
      body.querySelectorAll("[data-card]").forEach(b=>b.onclick=()=>throwCard(+b.dataset.card,b));
      body.querySelectorAll("[data-ans]").forEach(b=>b.onclick=()=>answer(+b.dataset.ans,b));
    }
    function tickNow(){const c=body.querySelector(".bt-clock");if(c&&st&&st.status==="playing"){c.textContent=clock+"s";c.classList.toggle("low",clock<=5)}}
    async function throwCard(i,btn){
      if(busy)return;busy=true;const c=hand[i];btn.classList.add("bt-throw");buzz(25);
      try{await A().send("battleAttack",{p_id:id,p_card:{q:c.q,opts:c.opts,a:c.a,why:c.why,kind:c.kind}});hand.splice(i,1);await wait(reduced()?0:450)}
      catch(e){btn.classList.remove("bt-throw");if(window.eviaToast)window.eviaToast(e.message)}
      busy=false;shown="";poll();
    }
    async function answer(i,btn){
      if(busy)return;busy=true;btn.classList.add("bt-picked");body.querySelectorAll("[data-ans]").forEach(b=>b.disabled=true);
      try{const s=await A().send("battleAnswer",{p_id:id,p_choice:i});st=s;if(s.last&&s.last.seq>lastSeq){lastSeq=s.last.seq;busy=false;await event(s.last)}}
      catch(e){}
      busy=false;shown="";draw(true);
    }
    function end(){
      stop();
      const won=st.winner===st.side,left=st.last&&st.last.left,gave=left&&left!==st.side;
      const got=R()&&R().gameCoins?R().gameCoins(won?20:5):0;
      if(won&&window.eviaLeaderboard)try{window.eviaLeaderboard.submit("battle",1)}catch(_){}
      body.innerHTML='<div class="bt bt-end '+(won?"won":"lost")+'"><div class="bt-end-avs">'+avatar(won?st.me.look:st.them.look,"big winner")+'</div>'+
        '<h2>'+(won?(gave?esc(st.them.name)+" left. You win!":"You win!"):"Good battle!")+'</h2><p class="bt-lead">'+(won?"You knocked out "+esc(st.them.name)+"’s Evia.":esc(st.them.name)+" won this one. Have another go.")+'</p>'+
        (got?'<p class="bt-coins">+'+got+' coins</p>':"")+
        (wrongs.length?'<div class="bt-review"><small>Worth another look</small>'+wrongs.slice(-4).map(w=>'<p><b>'+esc(w.q)+'</b><br>'+esc((w.opts||[])[w.a]||"")+(w.why?' · '+esc(w.why):"")+'</p>').join("")+'</div>':"")+
        '<div class="bt-end-btns"><button type="button" class="primary" data-again>Battle again</button><button type="button" class="secondary" data-done>Done</button></div></div>';
      fit();ctx.coins&&ctx.coins();
      if(won&&window.eviaMood)window.eviaMood("happy");
      id=null;
      body.querySelector("[data-again]").onclick=()=>{used=new Set();wrongs=[];lobby();find()};
      body.querySelector("[data-done]").onclick=()=>ctx.close();
    }
    lobby();
  }
  const icon='<svg viewBox="0 0 24 24"><path d="M5 19 19 5M14 5h5v5"/><path d="M19 19 5 5M10 5H5v5"/><circle cx="12" cy="12" r="2.2"/></svg>';
  G.register({id:"game-battle",key:"battle",label:"Question Battle",rarity:"common",about:"Battle a classmate live. Throw questions at their Evia; answer theirs to block."},run,icon);
})();
