/* Evia7 "My stats": activity, streaks, pace, quality, tests, confidence and achievements, plus the daily nudge Evia
   chooses. Everything is worked out from data already on the device; nothing leaves the phone. */
(function(){
  const PPE_UNIT="Personal protective equipment";
  const EARNED_KEY="evia7-achievements";
  const DAY=864e5,WEEK=7*DAY;
  const readJson=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||"null");return v??f}catch(_){return f}};
  const entryTime=e=>{const t=Date.parse(e.savedAt||"");if(!isNaN(t))return t;const m=String(e.d||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?new Date(+m[3],m[2]-1,+m[1]).getTime():0};
  const weekStart=t=>{const d=new Date(t);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getTime()};
  const monthStart=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1).getTime()};
  const photoCount=e=>Array.isArray(e.photoIds)?e.photoIds.length:Number.isFinite(Number(e.photoCount))?Number(e.photoCount):Array.isArray(e.p)?e.p.length:0;
  const testPct=t=>typeof t.pct==="number"?t.pct:(t.total?Math.round((t.score||0)/t.total*100):0);
  const TEST_NAMES={maths:"Maths",english:"English",epa:"EPA mock",discussion:"Professional discussion"};

  function compute(){
    const coach=window.eviaCoach,a=coach.analyse(),now=Date.now();
    const entries=a.entries,unitEntries=entries.filter(e=>e.u!==PPE_UNIT);
    /* Activity: any evidence, off-the-job entry or supporting file counts towards a week. */
    const supporting=(()=>{try{return supportingMeta().filter(x=>x.course===course)}catch(_){return[]}})();
    const times=[...entries.map(entryTime),...hours.map(x=>Number(x.createdAt)||0),...supporting.map(x=>Date.parse(x.addedAt)||0)].filter(t=>t>0);
    const weeks=new Set(times.map(weekStart));
    let streak=0,w=weekStart(now);
    if(!weeks.has(w))w-=WEEK; /* this week isn't over yet, so an empty week so far doesn't break the streak */
    while(weeks.has(w)){streak++;w-=WEEK}
    let longest=0,run=0,prev=null;
    [...weeks].sort((x,y)=>x-y).forEach(t=>{run=prev!==null&&Math.round((t-prev)/WEEK)===1?run+1:1;longest=Math.max(longest,run);prev=t});
    const otjSince=t=>hours.filter(x=>Number(x.on||x.createdAt)>=t).reduce((n,x)=>n+Number(x.n||0),0);
    /* Pace: weeks left for each unit that has no evidence yet. */
    const unitsLeft=a.units.filter(u=>!u.started).length;
    const weeksLeft=a.endDate?Math.max(0,Math.round((a.endDate.getTime()-now)/WEEK)):null;
    /* Quality: how many key points the latest write-up of each unit covers. */
    const prompts=(window.eviaLearnerPrompts||{})[course]||{};
    const checks=coach.checkUnit?a.units.filter(u=>u.started&&prompts[u.name]).map(u=>coach.checkUnit(u,prompts)).filter(c=>c.terms.length):[];
    const coverage=checks.length?Math.round(checks.reduce((n,c)=>n+c.covered.length/c.terms.length,0)/checks.length*100):null;
    /* Tests saved by review.js. */
    const tests=window.eviaData.list("tests").filter(t=>t&&t.course===course);
    const byType={};
    tests.forEach(t=>{const k=t.type;if(!byType[k])byType[k]={type:k,name:(k==="epa"&&(window.eviaNvq&&window.eviaNvq.on())?"Knowledge test":TEST_NAMES[k])||k,count:0,best:0,latest:null};const s=byType[k];s.count++;s.best=Math.max(s.best,testPct(t));if(!s.latest||Date.parse(t.takenAt)>Date.parse(s.latest.takenAt))s.latest=t});
    /* Confidence: the learner's own rating. 1–2 = needs practice, 3–4 = confident. */
    const sessions=window.eviaData.list("confidence").filter(x=>x&&x.course===course&&Array.isArray(x.scores)&&x.scores.length);
    const lastConf=sessions[sessions.length-1]||null;
    const latestByArea=new Map();
    sessions.forEach(sess=>sess.scores.forEach(sc=>latestByArea.set(sc.area,sc.score)));
    const practise=[...latestByArea].filter(([,v])=>v<=2).map(([k])=>k);
    const confident=[...latestByArea].filter(([,v])=>v>=3).map(([k])=>k);
    const p=window.eviaData.learner();
    return {
      a,now,packs:unitEntries.length,allPacks:entries.length,
      lastUpload:a.lastEntry?entryTime(a.lastEntry):null,daysSince:a.daysSince,
      packsThisMonth:entries.filter(e=>entryTime(e)>=monthStart()).length,
      otjWeek:otjSince(weekStart(now)),otjMonth:otjSince(monthStart()),otjTotal:a.otj,
      streak,longest,activeThisWeek:weeks.has(weekStart(now)),
      unitsLeft,weeksLeft,weeksPerUnit:weeksLeft!=null&&unitsLeft?weeksLeft/unitsLeft:null,
      coverage,checks,avgPhotos:unitEntries.length?unitEntries.reduce((n,e)=>n+photoCount(e),0)/unitEntries.length:null,
      tests:Object.values(byType),testCount:tests.length,bestTest:tests.reduce((n,t)=>Math.max(n,testPct(t)),0),
      lastTestAt:type=>{const s=byType[type];return s&&s.latest?Date.parse(s.latest.takenAt):null},
      confidence:{last:lastConf?Date.parse(lastConf.takenAt||0)||null:null,practise,confident,sessions:sessions.length,scores:[...latestByArea].map(([area,score])=>({area,score}))},
      maths:!!p.mathsEnabled,english:!!p.englishEnabled,
      ppeDone:entries.some(e=>e.u===PPE_UNIT),
      teach:window.eviaTeach&&window.eviaTeach.report?window.eviaTeach.report():{subjects:[],avg:null,done:0,total:0,areasDone:0,areasTotal:0,medals:{gold:0,silver:0,bronze:0},medalCount:0}
    };
  }

  /* ---------- Achievements ---------- */
  const ACHIEVEMENTS=[
    {id:"ppe",label:"Safety first",desc:"Completed the PPE induction",test:s=>s.ppeDone},
    {id:"first-pack",label:"First evidence",desc:"Submitted your first evidence pack",test:s=>s.packs>=1},
    {id:"five-packs",label:"Building up",desc:"Submitted 5 evidence packs",test:s=>s.packs>=5},
    {id:"ten-packs",label:"Portfolio pro",desc:"Submitted 10 evidence packs",test:s=>s.packs>=10},
    {id:"ksb-25",label:"Quarter way",desc:"Evidence for 25% of your KSBs",test:s=>s.a.ksbPct>=25},
    {id:"ksb-50",label:"Halfway",desc:"Evidence for 50% of your KSBs",test:s=>s.a.ksbPct>=50},
    {id:"ksb-75",label:"Three quarters",desc:"Evidence for 75% of your KSBs",test:s=>s.a.ksbPct>=75},
    {id:"ksb-100",label:"Every KSB",desc:"Evidence for every KSB",test:s=>s.a.ksbPct>=100},
    {id:"all-units",label:"All-rounder",desc:"Evidence in every unit",test:s=>s.a.units.length>0&&s.unitsLeft===0},
    {id:"streak-4",label:"On a roll",desc:"Active 4 weeks in a row",test:s=>s.longest>=4},
    {id:"streak-12",label:"Steady worker",desc:"Active 12 weeks in a row",test:s=>s.longest>=12},
    {id:"otj-10",label:"Learning logged",desc:"10 learning hours logged",test:s=>s.otjTotal>=10},
    {id:"otj-50",label:"Dedicated learner",desc:"50 learning hours logged",test:s=>s.otjTotal>=50},
    {id:"first-test",label:"Test taker",desc:"Completed your first test",test:s=>s.testCount>=1},
    {id:"test-80",label:"Top marks",desc:"Scored 80% or more in a test",test:s=>s.bestTest>=80},
    {id:"confidence",label:"Know yourself",desc:"Completed a confidence check",test:s=>s.confidence.sessions>=1},
    {id:"writeup",label:"Full marks write-up",desc:"A write-up covering every key point",test:s=>s.checks.some(c=>c.covered.length===c.terms.length)},
    {id:"medal",label:"First medal",desc:"Won your first medal in Teach me",test:s=>s.teach.medalCount>=1},
    {id:"gold-5",label:"Gold standard",desc:"Won five gold medals in Teach me",test:s=>s.teach.medals.gold>=5}
  ];
  /* Records when each achievement was first earned; newly earned ones are returned so Evia can celebrate them. */
  function achievements(s){
    const earned=readJson(EARNED_KEY,{});let changed=false;const fresh=[];
    const list=ACHIEVEMENTS.map(x=>{
      const has=!!x.test(s);
      if(has&&!earned[x.id]){earned[x.id]={at:Date.now(),seen:false};changed=true}
      const rec=earned[x.id];
      if(has&&rec&&!rec.seen)fresh.push(x);
      return Object.assign({},x,{earned:has||!!rec,at:rec?rec.at:null});
    });
    if(changed)localStorage.setItem(EARNED_KEY,JSON.stringify(earned));
    return {list,fresh,count:list.filter(x=>x.earned).length};
  }
  function markSeen(ids){
    const earned=readJson(EARNED_KEY,{});
    ids.forEach(id=>{if(earned[id])earned[id].seen=true});
    localStorage.setItem(EARNED_KEY,JSON.stringify(earned));
  }

  /* ---------- Evia's nudges, most useful first ---------- */
  const escHtmlS=v=>String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
  function nudges(s){
    const list=[],ach=achievements(s),day=new Date().getDay();
    const daysAgo=t=>t==null?Infinity:(s.now-t)/DAY;
    if(ach.fresh.length){
      const x=ach.fresh[0];
      list.push({id:"ach-"+x.id,celebrate:true,achievements:ach.fresh.map(f=>f.id),text:"You’ve earned a new achievement: <strong>"+x.label+"</strong>. "+x.desc+".",action:{label:"See my progress",kind:"stats"}});
    }
    /* New from the assessor: a sign-off (or a request for more) on their evidence, said once. */
    const fbNew=window.eviaFeedback?window.eviaFeedback.unseen().filter(f=>f.kind!=="observation"):[];
    if(fbNew.length){const f=fbNew[0];list.push({id:"fb-"+f.id,celebrate:f.decision==="accepted",feedback:f,
      text:(f.decision==="accepted"?(f.by?escHtmlS(f.by.split(" ")[0]):"Your assessor")+" signed off your "+escHtmlS(f.unit||"evidence")+" evidence"+(f.ksbs&&f.ksbs.length?" ("+f.ksbs.length+" KSB"+(f.ksbs.length===1?"":"s")+")":"")+". "+(f.feedback?"They said: “"+escHtmlS(f.feedback.slice(0,160))+(f.feedback.length>160?"…":"")+"”":""):
        "Your assessor looked at your "+escHtmlS(f.unit||"evidence")+" evidence and would like a bit more."+(f.feedback?" “"+escHtmlS(f.feedback.slice(0,160))+"”":""))+
        (()=>{const m=window.eviaMoreRequired?window.eviaMoreRequired().filter(x=>x.unit===f.unit).map(x=>x.code):[];return m.length?" <strong>More required: "+escHtmlS(m.slice(0,4).join(", "))+(m.length>4?"…":"")+"</strong>. Aim for "+(m.length===1?"it":"them")+" next time.":""})(),
      action:{label:"See it",kind:"feedback"}})}
    /* A leaderboard prize from last month (leaderboard.js): celebrated once. */
    const lbWon=window.eviaLeaderboard?window.eviaLeaderboard.unseenWins():[];
    if(lbWon.length){const x=lbWon[0];list.push({id:"lb-"+x.id,celebrate:true,lbWin:true,text:"You came <strong>"+x.place+(x.place===1?"st":x.place===2?"nd":"rd")+"</strong> in "+escHtmlS(x.label)+" at your college in "+escHtmlS(x.month)+"! That’s <strong>+"+x.coins+" coins</strong>."+(lbWon.length>1?" And "+(lbWon.length-1)+" more prize"+(lbWon.length>2?"s":"")+".":""),action:{label:"See the leaderboards",kind:"leaderboard"}})}
    /* Near the end, with KSBs still to be signed off and none chosen: suggest picking the ones to aim for. */
    if(s.a&&s.a.signoff&&s.a.timePct!=null&&s.a.timePct>=75&&s.a.met<s.a.total&&!(s.a.aims||[]).length){const left=s.a.total-s.a.met;
      list.push({id:"aims",text:"You’re "+s.a.timePct+"% through your course with "+left+" KSB"+(left===1?"":"s")+" still to be signed off. Pick the ones to aim for next, and Evia will point you at the jobs that cover them.",action:{label:"Choose KSBs",kind:"stats"}})}
    /* Backups: everything lives on this phone, so remind learners before there's a lot to lose. */
    const packsAll=(typeof evidence!=="undefined"?evidence:[]).filter(e=>e&&!e.induction),lastBackup=Date.parse(localStorage.getItem("evia7-last-backup")||"")||null;
    const since=lastBackup?packsAll.filter(e=>(Date.parse(e.savedAt||"")||0)>lastBackup).length:packsAll.length;
    if(!lastBackup&&packsAll.length>=3)list.push({id:"backup",text:"Your portfolio is only saved on this phone. Back it up now so you don’t lose it if your phone breaks or goes missing.",action:{label:"Back up now",kind:"backup"}});
    else if(lastBackup&&(since>=5||(since>=1&&daysAgo(lastBackup)>30)))list.push({id:"backup",text:"You’ve added "+since+" evidence pack"+(since===1?"":"s")+" since your last backup "+Math.round(daysAgo(lastBackup))+" days ago. Back up now so "+(since===1?"it’s":"they’re")+" safe.",action:{label:"Back up now",kind:"backup"}});
    if(s.daysSince==null&&s.a.units.length)list.push({id:"first-evidence",text:"Ready for your first unit? Any job from site can be evidence. Take photos and write up what you did.",action:{label:"Go to Topics",kind:"course"}});
    else if(s.daysSince!=null&&s.daysSince>=14)list.push({id:"quiet",text:"It’s been "+s.daysSince+" days since your last evidence. Anything from site this week worth capturing?",action:{label:"Go to Topics",kind:"course"}});
    /* Targets and reviews */
    const T=window.eviaTargets,targets=T?T.mine():[],overdue=targets.filter(t=>!t.done&&new Date(t.due+"T23:59:59").getTime()<s.now);
    if(overdue.length)list.push({id:"target-overdue",text:"Your target “"+overdue[0].title+"” is past its date. Want to take a look?",action:{label:"My targets",kind:"targets"}});
    const reviews=window.eviaData.list("reviews",{course}).map(r=>r.detail),lastReview=reviews.length?Date.parse(reviews[reviews.length-1].date):null;
    const rd=window.eviaReviewDue?window.eviaReviewDue():null,dueTxt=rd?rd.due.toLocaleDateString("en-GB",{day:"numeric",month:"short"}):"";
    if(rd&&rd.college){
      /* From 14 days before the review: getting ready, first thing Evia says each day, until it's all done
         (and every day from 7 days before until their comments are in). */
      const left=window.eviaReviewPrepCount?window.eviaReviewPrepCount():0;
      const when=rd.days<0?"Your progress review was due on "+dueTxt+".":rd.days===0?"Your progress review is today.":"Your progress review is on "+dueTxt+", in "+rd.days+" day"+(rd.days===1?"":"s")+".";
      if(left&&rd.days<=14)list.splice(ach.fresh.length?1:0,0,{id:"review-comments",text:when+" Let’s get you ready: "+left+" thing"+(left===1?"":"s")+" to look at"+(rd.commentsDone?"":", including your comments for your assessor")+", one at a time.",action:{label:"Get ready",kind:"prep"}});
    }
    else if(rd&&rd.days<=14&&(s.packs>=1||!rd.first))list.push({id:"review",text:rd.days<0?"Your progress review was due on "+dueTxt+". It takes about 3 minutes and sets your next targets.":rd.days===0?"Your progress review is due today. It takes about 3 minutes and sets your next targets.":"Your next progress review is due on "+dueTxt+". It takes about 3 minutes and sets your next targets.",action:{label:"Get ready",kind:"prep"}});
    else if(!rd&&s.packs>=2&&(lastReview==null||daysAgo(lastReview)>70))list.push({id:"review",text:lastReview?"It’s been over 10 weeks since your last progress review. It takes about 3 minutes and sets your next targets.":"Ready for your first progress review? It takes about 3 minutes and sets your targets.",action:{label:"Start a review",kind:"review"}});
    if(s.otjWeek===0&&(day===0||day>=4))list.push({id:"otj-week",text:"No learning hours logged this week yet. Training, toolbox talks and research all count.",action:{label:"Log learning hours",kind:"learning"}});
    const timePct=s.a.timePct;
    if(timePct!=null&&timePct>=75&&!(window.eviaNvq&&window.eviaNvq.on())){ /* NVQs have no end-point assessment */
      const gap=timePct>=90?7:14;
      if(daysAgo(s.lastTestAt("epa"))>gap)list.push({id:"epa",text:"You’re "+timePct+"% of the way through your course, so it’s time to practise for your end-point assessment. Try an EPA mock test.",action:{label:"Take an EPA full mock",kind:"test"}});
    }
    if(s.maths&&daysAgo(s.lastTestAt("maths"))>14)list.push({id:"maths",text:"It’s been a while since your last maths practice. A quick test keeps it fresh.",action:{label:"Take a maths test",kind:"test"}});
    if(s.english&&daysAgo(s.lastTestAt("english"))>14)list.push({id:"english",text:"Fancy a quick English practice test? It only takes a few minutes.",action:{label:"Take an English test",kind:"test"}});
    if(daysAgo(s.confidence.last)>30)list.push({id:"confidence",text:s.confidence.sessions?"It’s been a month since your last confidence check. Rate yourself again so your tutor knows what to focus on.":"Rate how confident you feel on each practical skill. It shows you and your tutor what to practise.",action:{label:"Do a confidence check",kind:"confidence"}});
    return list;
  }

  /* ---------- Stats section (Progress page) ---------- */
  const escHtml=v=>String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
  const ago=t=>{if(t==null)return"Not yet";const d=Math.floor((new Date().setHours(0,0,0,0)-new Date(t).setHours(0,0,0,0))/DAY);return d<=0?"Today":d===1?"Yesterday":d+" days ago"};
  const BADGE='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/></svg>';
  /* ---------- Progress page: one card style, animated bars, counting numbers and popping badges ---------- */
  const ICON={
    pace:'<path d="M12 21a9 9 0 1 1 9-9"/><path d="M12 12l4-3"/><circle cx="12" cy="12" r="1.2"/>',
    activity:'<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    quality:'<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9Z"/>',
    tests:'<path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15l-3-1.8-3 1.8-3-1.8-3 1.8V5A1.5 1.5 0 0 1 7 3.5Z"/><path d="M9 8.5h6M9 12h6"/>',
    skills:'<path d="M4 20h16"/><rect x="5.5" y="12" width="3" height="6" rx="1"/><rect x="10.5" y="8" width="3" height="10" rx="1"/><rect x="15.5" y="4" width="3" height="14" rx="1"/>',
    scen:'<path d="M12 3.5 5 6v5.5c0 4.4 3 7.9 7 9 4-1.1 7-4.6 7-9V6l-7-2.5Z"/>',
    award:'<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
    flame:'<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.1 2-5.2 3.6-7 .5 1.8 1.5 2.9 2.6 3.4-.3-3 .9-5.8 3.3-8.2.3 2.9 1.4 4.6 2.7 6.4 1 1.4 1.8 3 1.8 5.1 0 3.9-2.9 6.5-7.5 6.5Z"/>',
    camera:'<rect x="3" y="6.5" width="18" height="14" rx="3"/><path d="M8 6.5l1.4-2h5.2l1.4 2"/><circle cx="12" cy="13.5" r="3.5"/>',
    clock:'<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>'
  };
  const svg=d=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';
  const num=(to,opts={})=>'<b class="pg-num" data-to="'+to+'" data-dec="'+(opts.dec||0)+'">'+(opts.dec?Number(to).toFixed(opts.dec):to)+'</b>';
  const bar=(pct,opts={})=>{const p=Math.max(0,Math.min(100,Math.round(pct)));return '<span class="pg-bar'+(opts.cls?" "+opts.cls:"")+'" role="img" aria-label="'+escHtml(opts.label||p+"%")+'"><i style="--to:'+p+'%;--d:'+(opts.delay||0)+'ms"></i>'+(opts.mark!=null?'<em style="left:'+Math.max(0,Math.min(100,opts.mark))+'%"></em>':"")+'</span>'};
  const card=(id,icon,title,meta,body,action)=>'<section class="ui-card pg-card" id="'+id+'"><header class="pg-head"><span class="pg-icon">'+svg(ICON[icon])+'</span><h3>'+title+'</h3>'+(meta?'<span class="pg-meta">'+meta+'</span>':"")+'</header>'+body+(action?'<button type="button" class="pg-action" data-st-action="'+action[1]+'">'+action[0]+'</button>':"")+'</section>';
  const row=(label,value,barHtml)=>'<div class="pg-row"><div class="pg-row-top"><span>'+label+'</span><strong>'+value+'</strong></div>'+barHtml+'</div>';

  /* Top of the Progress page: KSB ring plus course time against evidence. */
  function heroHtml(s){
    const a=s.a,tp=a.timePct,gap=tp==null?null:tp-a.ksbPct;
    const verdict=gap==null?null:gap>10?["behind","A little behind"]:gap<-5?["ahead","Ahead of schedule"]:["ontrack","On track"];
    const perUnit=s.weeksPerUnit!=null?Math.max(1,Math.floor(s.weeksPerUnit)):null;
    return '<section class="ui-card pg-card pg-hero" id="pg-hero">'+
      '<div class="pg-hero-ring" data-ring="'+a.ksbPct+'">'+ringSvg(a.ksbPct)+'<span class="pg-hero-label"><span class="pg-hero-num">'+num(a.ksbPct)+'<small>%</small></span><em>of KSBs</em></span></div>'+
      '<div class="pg-hero-side">'+
        '<p class="pg-hero-lead"><strong>'+num(a.met)+' of '+a.total+'</strong> KSBs '+(a.signoff?'signed off':'have evidence')+'</p>'+
        (tp!=null?row("Course time",tp+"%",bar(tp,{cls:"muted"}))+row("Evidence",a.ksbPct+"%",bar(a.ksbPct,{delay:150})):'<p class="pg-note">Add your start and end dates in Profile to see if you’re on track.</p>')+
        (verdict?'<span class="pg-verdict '+verdict[0]+'">'+verdict[1]+'</span>':"")+
        (perUnit?'<span class="pg-note">About '+perUnit+' week'+(perUnit===1?"":"s")+' per unit left</span>':"")+
      '</div>'+
    '</section>';
  }
  function ringSvg(pct){const r=52,c=2*Math.PI*r;return '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="'+r+'" class="pg-ring-track"/><circle cx="60" cy="60" r="'+r+'" class="pg-ring-fill" style="--c:'+c.toFixed(1)+';--v:'+(c*Math.max(0,Math.min(100,pct))/100).toFixed(1)+'" transform="rotate(-90 60 60)"/></svg>'}

  /* Learning tab: one number per thing, the detail one tap away. */
  function tilesHtml(s){
    const nvq=window.eviaNvq&&window.eviaNvq.on(),ach=achievements(s),tr=s.teach;
    const last=s.tests.map(t=>t.latest).filter(Boolean).sort((x,y)=>Date.parse(y.takenAt||0)-Date.parse(x.takenAt||0))[0];
    const lastPct=last?(typeof last.pct==="number"?last.pct:Math.round((last.score||0)/(last.total||1)*100)):null;
    const low=s.confidence.scores.filter(x=>x.score<=2).length;
    const tasks=((window.EVIA_PRACTICE_TASKS||{})[course]||[]).length,picks=window.eviaPractice?window.eviaPractice.suggestTasks(1):[];
    const epaDue=window.eviaPractice&&window.eviaPractice.epaDue&&window.eviaPractice.epaDue();
    const reviews=window.eviaGetReviews?window.eviaGetReviews().length:0;
    const hrs=window.eviaHM(s.otjTotal),wk=s.otjWeek>0?window.eviaHM(s.otjWeek):0;
    const tile=(id,icon,value,label,sub,flag)=>'<button type="button" class="ui-tile-stat" data-tile="'+id+'" id="lt-'+id+'"><span class="pg-icon">'+svg(ICON[icon])+'</span><strong>'+value+(flag?' <em class="pg-x-new">'+flag+'</em>':"")+'</strong><span>'+label+'</span><small>'+sub+'</small></button>';
    const out=[
      tile("hours","clock",hrs,"Learning hours",wk?"+"+wk+" this week":"None this week"),
      tile("tests","tests",lastPct!=null?lastPct+"%":"–",nvq?"Knowledge tests":"Tests and EPA mocks",s.testCount?"Last score · "+s.testCount+" taken":"None taken yet",epaDue?"Due":""),
      nvq&&window.eviaNvq.myQuestions?(()=>{const qs=window.eviaNvq.myQuestions(),ans=window.eviaNvq.answers(),d=qs.filter(q=>ans[q]&&String(ans[q].t).trim().split(/\s+/).length>=12).length;return tile("knowledge","quality",d+'<small> / '+qs.length+'</small>',"Knowledge questions","Answered")})():"",
      tile("skills","skills",s.confidence.last?String(low):"–","Skills to practise",s.confidence.last?"Rated "+escHtml(ago(s.confidence.last).toLowerCase()):"Rate your skills",s.confidence.last&&Date.now()-s.confidence.last>30*DAY?"Due":""),
      tasks?tile("tasks","camera",String(tasks),"Skills",picks.length?"1 picked for you":"For the workshop"):"",
      tr&&tr.total?tile("teach","award",tr.avg==null?"–":tr.avg+"%","Teach me",tr.medalCount+" medal"+(tr.medalCount===1?"":"s")+" · "+tr.areasDone+" of "+tr.areasTotal+" areas"):"",
      tile("badges","award",ach.count+'<small> / '+ach.list.length+'</small>',"Achievements",ach.fresh.length?"New one earned":"Earned",ach.fresh.length?"New":""),
      tile("reviews","pace",String(reviews),"Progress reviews",reviews?"Saved":"None yet")
    ];
    return '<div class="ui-tiles-grid" id="ui-stats">'+out.join("")+'</div>';
  }
  function badgesHtml(s){
    const ach=achievements(s),earned=ach.list.filter(x=>x.earned),fresh=new Set(ach.fresh.map(x=>x.id));
    return (earned.length?'<ul class="pg-badges">'+earned.map((x,i)=>'<li class="pg-badge'+(fresh.has(x.id)?" new":"")+'" style="--i:'+i+'" title="'+escHtml(x.desc)+'"><span class="pg-badge-icon">'+BADGE+'</span><strong>'+escHtml(x.label)+'</strong></li>').join("")+'</ul>':'<p class="pg-note">None yet. Your first one isn’t far away.</p>')+
      '<h3 class="pr-h">Still to earn</h3><ul class="pg-locked">'+ach.list.filter(x=>!x.earned).map(x=>'<li><span class="pg-badge-icon">'+BADGE+'</span><span><strong>'+escHtml(x.label)+'</strong><small>'+escHtml(x.desc)+'</small></span></li>').join("")+'</ul>';
  }

  /* Plays each card's animation as it scrolls into view; everything shows at once with reduced motion. */
  function animate(root,still){
    if(!root)return;
    const reduced=still||(window.eviaAccessibility&&window.eviaAccessibility.reducedMotion())||matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cards=[...root.querySelectorAll(".pg-card,.ui-groups")];
    const countUp=el=>{
      const to=Number(el.dataset.to)||0,dec=Number(el.dataset.dec)||0,start=performance.now(),dur=900;
      const step=t=>{const k=Math.min(1,(t-start)/dur),e=1-Math.pow(1-k,3);el.textContent=(to*e).toFixed(dec);if(k<1)requestAnimationFrame(step)};
      el.textContent=(0).toFixed(dec);requestAnimationFrame(step);
    };
    const play=c=>{
      if(c.classList.contains("pg-in"))return;
      c.classList.add("pg-in");
      if(reduced)return;
      c.querySelectorAll(".pg-num").forEach(countUp);
      c.querySelectorAll(".ui-ring-fill").forEach(el=>{const full=el.getAttribute("stroke-dasharray");if(!full)return;const circ=full.split(" ")[1];el.style.transition="none";el.setAttribute("stroke-dasharray","0 "+circ);void el.getBoundingClientRect();el.style.transition="stroke-dasharray 1s cubic-bezier(.3,.8,.3,1)";el.setAttribute("stroke-dasharray",full)});
    };
    if(reduced||!("IntersectionObserver" in window)){cards.forEach(c=>{c.classList.add("pg-in","pg-still")});return}
    root.classList.add("pg-animate");
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){play(e.target);io.unobserve(e.target)}}),{threshold:.25});
    cards.forEach(c=>io.observe(c));
  }

  window.eviaStats={compute,achievements,markSeen,nudges,tilesHtml,badgesHtml,heroHtml,animate,ago};
})();
