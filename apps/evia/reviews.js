/* Evia7 reviews and targets.
   - Targets measure themselves from what Evia already records (OTJ hours, units, KSBs, tests, skills, scenarios…).
   - "My targets" shows them with progress; if there are none, Evia sets some.
   - A full review is a click-through of short sections; finishing it replaces the targets with new ones. */
(function(){
  const DAY=864e5;
  const escHtml=v=>String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
  const readJson=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||"null");return v??f}catch(_){return f}};
  /* Reviews and targets are read and written through eviaData (data.js); "detail" is the stored review or target. */
  const reviewsNow=()=>window.eviaData.list("reviews",{course}).map(r=>r.detail);
  const ukDate=t=>new Date(t).toLocaleDateString("en-GB",{day:"numeric",month:"short"});
  const plural=(n,w)=>n+" "+w+(n===1?"":"s");
  const clamp=v=>Math.max(0,Math.min(1,v));
  const stats=()=>{try{return window.eviaStats.compute()}catch(_){return null}};
  const skillMap=()=>{const m=new Map();window.eviaData.list("confidence").filter(x=>x&&x.course===course&&Array.isArray(x.scores)).forEach(s=>s.scores.forEach(sc=>m.set(sc.area,sc.score)));return m};
  const bestTestSince=(types,since,full)=>window.eviaData.list("tests").filter(t=>t&&t.course===course&&types.includes(t.type)&&Date.parse(t.takenAt)>=since&&(!full||t.full||t.total>=20)).reduce((n,t)=>Math.max(n,typeof t.pct==="number"?t.pct:Math.round((t.score||0)/(t.total||1)*100)),-1);
  const startedUnits=S=>S.a.units.filter(u=>u.started).length;

  const loggedSince=when=>{const d=new Date(Number(when)||Date.parse(when));d.setHours(0,0,0,0);const from=d.getTime();
    return Math.round(window.eviaData.list("hours").filter(h=>Date.parse(h.createdAt)>=from).reduce((n,h)=>n+(Number(h.minutes)||0),0)/60*10)/10};
  /* ---------- What each kind of target measures ---------- */
  const KINDS={
    /* Hours logged from the day the target was set (so hours logged earlier that day, before a review, count too). */
    otj:{measure:(t,S)=>t.createdAt?loggedSince(t.createdAt):S.otjTotal-t.baseline,unit:"hours",action:["Log hours","learning"]},
    units:{measure:(t,S)=>startedUnits(S)-t.baseline,unit:"units",action:["Capture evidence","course"]},
    ksb:{measure:(t,S)=>S.a.met-t.baseline,unit:"KSBs",action:["Capture evidence","course"]},
    epa:{measure:t=>bestTestSince(["epa"],t.createdAt,true),pct:true,action:["Take a full mock","epa-full"]},
    quiz:{measure:t=>bestTestSince(["epa"],t.createdAt,false)>=0?1:0,action:["Take a quiz","epa"]},
    maths:{measure:t=>bestTestSince(["maths"],t.createdAt),pct:true,action:["Maths test","maths"]},
    english:{measure:t=>bestTestSince(["english"],t.createdAt),pct:true,action:["English test","english"]},
    skill:{measure:t=>skillMap().get(t.param)||t.baseline,action:["Rate my skills","confidence"]},
    quality:{measure:(t,S)=>S.coverage||0,pct:true,action:["Go to My course","course"]},
    /* Lessons done in one Teach me subject (param: course, maths, english or edi). */
    lessons:{measure:t=>{const R=window.eviaTeach&&window.eviaTeach.report&&window.eviaTeach.report(),s=R&&R.subjects.find(x=>x.id===t.param);return s?s.done:0},action:["Open Teach me","teach"]},
    /* Targets set before the real-life scenarios moved into Teach me: they stay until the next review replaces them. */
    scenarios:{measure:t=>t.baseline||0,action:["Open Teach me","teach"]},
    streak:{measure:(t,S)=>S.streak,unit:"weeks",action:["Add evidence","course"]},
    rate:{measure:(t,S)=>S.confidence.sessions?1:0,action:["Rate my skills","confidence"]}
  };
  function progress(t,S){
    if(t.done)return {pct:1,value:t.target,text:"Done"};
    const k=KINDS[t.kind];if(!k||!S)return {pct:0,value:0,text:""};
    let v=k.measure(t,S),pct;
    if(t.kind==="skill")pct=t.target>t.baseline?(v-t.baseline)/(t.target-t.baseline):v>=t.target?1:0;
    else pct=t.target?Math.max(0,v)/t.target:0;
    pct=clamp(pct);
    const text=k.pct?(v<0?"Not tried since this target was set · aim "+t.target+"%":"Best since set: "+v+"% · aim "+t.target+"%"):t.kind==="skill"?["","Need training","Basics","Confident","Mastered"][v]+" · aim Confident":t.kind==="scenarios"?Math.max(0,v)+" of "+t.target+" done":t.kind==="quiz"||t.kind==="rate"?(pct>=1?"Done":"Not done yet"):(Math.round(Math.max(0,v)*10)/10)+" of "+t.target+" "+(k.unit||"")+(t.kind==="otj"&&t.createdAt?" logged since "+new Date(Number(t.createdAt)||Date.parse(t.createdAt)).toLocaleDateString("en-GB",{day:"numeric",month:"short"}):"");
    return {pct,value:v,text};
  }

  /* ---------- Choosing targets from Evia's stats ---------- */
  function suggest(S){
    const out=[],now=Date.now(),due=w=>new Date(now+w*7*DAY).toISOString().slice(0,10);
    const add=(kind,title,why,target,baseline,weeks,param)=>out.push({id:"t-"+now+"-"+out.length,course,kind,title,why,target,baseline:baseline||0,param:param||null,due:due(weeks),createdAt:now,done:false});
    const a=S.a,gap=a.timePct==null?0:a.timePct-a.ksbPct;
    if(S.unitsLeft>0){
      const n=gap>10&&S.unitsLeft>1?2:1,next=a.quickest;
      add("units","Capture evidence for "+plural(n,"new unit"),(gap>10?"You’re a little behind on evidence. ":"")+(next?"Start with "+next.name+": it covers "+plural(next.missing.length,"KSB")+" you still need.":"Pick a unit you haven’t started yet."),n,startedUnits(S),n===2?6:4);
    }else if(a.ksbPct<100){
      const n=Math.min(6,a.total-a.met);add("ksb","Get evidence for "+plural(n,"more KSB"),"Every unit has evidence; now fill the KSB gaps. Ask Evia “Which KSBs am I missing?”",n,a.met,6);
    }
    if(S.otjMonth<8)add("otj","Log 10 learning hours","You’ve logged "+(Math.round(S.otjMonth*10)/10)+" hours this month. Training, toolbox talks and research all count.",10,S.otjTotal,6);
    const epaBest=bestTestSince(["epa"],0,true);
    if((window.eviaNvq&&window.eviaNvq.on())){} /* NVQs have no end-point assessment */
    else if(a.timePct!=null&&a.timePct>=60)add("epa","Score 70% or more on a full EPA mock",epaBest>=0?"Your best full mock so far is "+epaBest+"%.":"You haven’t tried a full EPA mock yet, and your end-point assessment is getting closer.",70,0,4);
    else if(!S.tests.some(t=>t.type==="epa"))add("quiz","Try an EPA quick quiz","It only takes a few minutes and shows what the end-point test is like.",1,0,4);
    const skills=S.confidence.scores.filter(x=>x.score<=2).sort((x,y)=>x.score-y.score);
    if(skills.length){
      const sk=skills[0],task=window.eviaPractice&&window.eviaPractice.suggestTasks(1)[0];
      add("skill","Move "+sk.area+" up to Confident","You rated it “"+["Need more training","Know the basics"][sk.score-1]+"”."+(task?" The college task “"+task.task.title+"” practises it.":" Ask to get involved when the job comes up."),3,sk.score,8,sk.area);
    }else if(!S.confidence.sessions)add("rate","Rate your practical skills","A confidence check shows you and your tutor what to practise.",1,0,2);
    if(S.maths){const m=bestTestSince(["maths"],0);if(m<70)add("maths","Score 70% or more in a maths test",m>=0?"Your best so far is "+m+"%.":"No maths test taken yet.",70,0,6)}
    if(S.english){const e=bestTestSince(["english"],0);if(e<70)add("english","Score 70% or more in an English test",e>=0?"Your best so far is "+e+"%.":"No English test taken yet.",70,0,6)}
    if(S.coverage!=null&&S.coverage<70)add("quality","Get your write-ups covering 70% of key points","They cover "+S.coverage+"% now. Use the “Things to mention” list on each unit.",70,0,6);
    const R=window.eviaTeach&&window.eviaTeach.report&&window.eviaTeach.report(),edi=R&&R.subjects.find(x=>x.id==="edi");
    if(edi&&edi.done<edi.total)add("lessons","Finish the EDI and safeguarding lessons","Short lessons on staying safe, Prevent, British values and equality, in Teach me.",edi.total,edi.done,4,"edi");
    if(S.streak<4)add("streak","Stay active 4 weeks in a row","Add evidence or log learning each week. You’re on "+plural(S.streak,"week")+".",4,0,5);
    return out.slice(0,5);
  }

  /* ---------- Stored targets ---------- */
  const all=()=>window.eviaData.list("targets",{store:"review-targets"}).map(t=>t.detail);
  const mine=()=>all().filter(t=>t.course===course);
  /* All target and review writes go through eviaData (data.js). */
  function setTargets(list){window.eviaData.replace("targets",{course},list)}
  function ensureTargets(){
    let list=mine();
    if(list.length)return {list,created:false};
    const S=stats();if(!S)return {list:[],created:false};
    list=suggest(S);setTargets(list);return {list,created:true};
  }
  /* Marks targets done as they're reached, and celebrates each one once. */
  function check(celebrate){
    const S=stats();if(!S)return;
    const list=mine();let changed=false;const fresh=[];
    list.forEach(t=>{
      if(t.done||!KINDS[t.kind])return;
      if(progress(t,S).pct>=1){t.done=true;t.doneAt=Date.now();changed=true;fresh.push(t)}
    });
    if(changed)setTargets(list);
    if(celebrate&&fresh.length){
      if(typeof showEvidenceToast==="function")showEvidenceToast("Target complete: "+fresh[0].title);
      if(window.eviaMood)window.eviaMood("happy");
    }
  }
  const statusOf=t=>t.done?"done":new Date(t.due+"T23:59:59").getTime()<Date.now()?"overdue":"active";

  /* ---------- Targets card (Progress page and chat) ---------- */
  function cardHtml(opts={}){
    const list=mine(),S=stats();
    if(!list.length)return opts.chat?"":'<section class="ui-card pg-card" id="pg-targets"><header class="pg-head"><span class="pg-icon">'+ICON+'</span><h3>Targets</h3></header><p class="pg-note">No targets yet. Ask Evia for “My targets” and she’ll set some.</p><button type="button" class="pg-action" data-target-new>Set my targets</button></section>';
    const done=list.filter(t=>t.done).length;
    const rows=list.map((t,i)=>{
      const p=progress(t,S),st=statusOf(t),act=KINDS[t.kind].action;
      return '<div class="tg-row '+st+'">'+
        '<div class="pg-row-top"><span><strong>'+escHtml(t.title)+'</strong></span><em class="tg-chip '+st+'">'+(st==="done"?"Done ✓":st==="overdue"?"Overdue":"Due "+ukDate(t.due+"T12:00:00"))+'</em></div>'+
        (opts.chat?"":'<small class="tg-why">'+escHtml(t.why)+'</small>')+
        '<span class="pg-bar'+(st==="done"?" good":st==="overdue"?" low":"")+'"><i style="--to:'+Math.round(p.pct*100)+'%;--d:'+i*90+'ms"></i></span>'+
        '<div class="tg-foot"><small>'+escHtml(p.text)+'</small>'+(st==="done"?"":'<span class="tg-acts">'+'<button type="button" class="tg-btn primary-lite" data-target-act="'+t.id+'">'+act[0]+'</button></span>')+'</div>'+
      '</div>';
    }).join("");
    const from=list[0]&&list[0].reviewDate?"From your review on "+ukDate(list[0].reviewDate):"Set by Evia";
    return '<section class="ui-card pg-card tg-card" id="pg-targets"><header class="pg-head"><span class="pg-icon">'+ICON+'</span><h3>Targets</h3><span class="pg-meta">'+done+' of '+list.length+' done</span></header><small class="tg-from">'+escHtml(from)+'</small>'+rows+'</section>';
  }
  const ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>';
  function runAction(id){
    const t=mine().find(x=>x.id===id);if(!t)return;
    const a=KINDS[t.kind].action[1],close=()=>{const x=document.getElementById("x");if(x)x.click();else{const r=document.getElementById("modal-root");if(r)r.innerHTML=""}};
    close();
    setTimeout(()=>{
      if(a==="learning"||a==="course")nav(a==="learning"?"hours":a);
      else if(a==="confidence")window.eviaPractice&&window.eviaPractice.openConfidence();
      else if(a==="teach")nav("teach");
      else if(window.eviaStartTest)window.eviaStartTest(a==="epa-full"?"epa":a,a==="epa-full"?20:5,KINDS[t.kind].action[0]);
    },80);
  }
  /* Wires up the buttons in a targets card; redraw is called after new targets are set. */
  function bind(root,redraw){
    if(!root)return;
    root.querySelectorAll("[data-target-act]").forEach(b=>b.onclick=()=>runAction(b.dataset.targetAct));
    root.querySelectorAll("[data-target-new]").forEach(b=>b.onclick=()=>{ensureTargets();redraw&&redraw()});
  }

  /* ---------- The click-through review ---------- */
  function snapshot(S){
    const a=S.a,gap=a.timePct==null?null:a.timePct-a.ksbPct;
    const checks=S.checks.slice().sort((x,y)=>(y.covered.length/y.terms.length)-(x.covered.length/x.terms.length));
    const conf=S.confidence.scores,confPct=conf.length?Math.round(conf.reduce((n,x)=>n+x.score,0)/conf.length/4*100):null;
    const hist=window.eviaData.list("confidence").filter(x=>x&&x.course===course&&Array.isArray(x.scores)&&x.scores.length);
    const prevConf=hist.length>1?hist[hist.length-2].scores:null,confPrevPct=prevConf?Math.round(prevConf.reduce((n,x)=>n+x.score,0)/prevConf.length/4*100):null;
    const lastFull=window.eviaData.list("tests").filter(t=>t&&t.course===course&&t.type==="epa"&&(t.full||t.total>=20)).pop();
    const task=window.eviaPractice&&window.eviaPractice.suggestTasks(1)[0];
    const prevReview=reviewsNow().pop();
    const prevTargets=mine();
    const prof=window.eviaData.learner(),startMs=Date.parse(prof.start||"");
    return {
      weeksIn:isNaN(startMs)?null:Math.max(0,(Date.now()-startMs)/(7*864e5)),maths:!!prof.mathsEnabled,english:!!prof.englishEnabled,
      ksbPct:a.ksbPct,met:a.met,total:a.total,signoff:!!a.signoff,timePct:a.timePct,verdict:gap==null?null:gap>10?"behind":gap<-5?"ahead":"ontrack",weeksPerUnit:S.weeksPerUnit!=null?Math.max(1,Math.floor(S.weeksPerUnit)):null,weeksLeft:S.weeksLeft,
      unitsStarted:startedUnits(S),unitsTotal:a.units.length,packs:S.allPacks,coverage:S.coverage,avgPhotos:S.avgPhotos!=null?Math.round(S.avgPhotos*10)/10:null,
      strongest:checks[0]?checks[0].u.name:null,weakest:checks.length>1?checks[checks.length-1].u.name:null,weakestMissing:checks.length>1?checks[checks.length-1].missing.slice(0,3):[],
      otjTotal:Math.round(S.otjTotal*10)/10,otjMonth:Math.round(S.otjMonth*10)/10,streak:S.streak,longest:S.longest,lastUpload:S.lastUpload,
      tests:S.tests.map(t=>({name:t.name,latest:t.latest?(typeof t.latest.pct==="number"?t.latest.pct:Math.round((t.latest.score||0)/(t.latest.total||1)*100)):0,best:t.best})),missed:lastFull&&Array.isArray(lastFull.missed)?lastFull.missed.slice(0,8):[],
      confPct,confPrevPct,lowSkills:conf.filter(x=>x.score<=2).map(x=>x.area),highSkills:conf.filter(x=>x.score>=3).map(x=>x.area),task:task?task.task.title:null,
      teach:(()=>{const R=window.eviaTeach&&window.eviaTeach.report&&window.eviaTeach.report();return R?R.subjects.map(x=>({name:x.name,avg:x.avg,areasDone:x.areasDone,areas:x.areas.length,medals:x.medals})):[]})(),
      prevTargetList:prevTargets.map(t=>({title:t.title,done:!!t.done,due:t.due})),
      periodFrom:prevReview?prevReview.date:(prof.start||null),otjExpected:isNaN(startMs)?null:Math.round(Math.max(0,(Date.now()-startMs)/(7*864e5))*6),
      dsl:!!((prof.safeguarding||{}).name),nvq:!!(window.eviaNvq&&window.eviaNvq.on()),
      nvqQ:window.eviaNvq&&window.eviaNvq.on()?(()=>{const q=window.eviaNvq.myQuestions(),a=window.eviaNvq.answers();return {done:q.filter(x=>a[x]&&String(a[x].t).trim().split(/\s+/).length>=12).length,total:q.length}})():null,
      prevReviewDate:prevReview?prevReview.date:null,prevTargets:prevTargets.length?{done:prevTargets.filter(t=>t.done).length,total:prevTargets.length}:null
    };
  }
  const bar=(pct,cls,d)=>'<span class="pg-bar'+(cls?" "+cls:"")+'"><i style="--to:'+Math.round(Math.max(0,Math.min(100,pct)))+'%;--d:'+(d||0)+'ms"></i></span>';
  const row=(l,v,b)=>'<div class="pg-row"><div class="pg-row-top"><span>'+l+'</span><strong>'+v+'</strong></div>'+b+'</div>';
  /* "You" against "where you should be by now", with a tick when they're there. */
  const goals=list=>{list=list.filter(Boolean);return list.length?'<div class="rv-goals"><div class="rv-goals-head"><span></span><span>You</span><span>Where you should be</span></div>'+list.map(([label,you,target,ok,ahead])=>'<div class="rv-goal '+(ok?"ok":"under")+'"><span>'+label+'</span><b>'+you+(ahead?'<i class="rv-ahead">Ahead</i>':"")+'</b><em>'+target+'</em></div>').join("")+'</div>':""};
  /* Quick things to do now: the review saves your place and brings you back. */
  const quick=(readOnly,items)=>{items=items.filter(Boolean);return readOnly||!items.length?"":'<div class="rv-quick"><span>Want to do one now? I’ll bring you back here.</span><div>'+items.map(([id,label])=>'<button type="button" class="secondary" data-rv-quick="'+id+'">'+label+'</button>').join("")+'</div></div>'};
  const big=(n,l)=>'<div class="rv-big"><b>'+n+'</b><small>'+l+'</small></div>';
  /* A small Evia in the learner's own shape and colour. */
  const say=t=>'<p class="rv-evia"><span class="evia-mini" aria-hidden="true"><span class="evia-face"><i></i><i></i></span></span><span>'+t+'</span></p>';
  const chips=(list,cls)=>list.length?'<div class="rv-chips">'+list.map(x=>'<span class="pr-chip '+(cls||"")+'">'+escHtml(x)+'</span>').join("")+'</div>':"";
  function slides(r,readOnly){
    const s=r.snapshot,v={behind:["A little behind","low"],ontrack:["On track","good"],ahead:["Ahead of schedule","good"]}[s.verdict];
    const tp=s.timePct,nvq=!!(window.eviaNvq&&window.eviaNvq.on()),w=nvq?"criteria":"KSBs";
    const out=[];
    out.push({title:"Overview",body:
      '<div class="rv-hero"><div class="rv-ring" style="--p:'+s.ksbPct+'"><b>'+s.ksbPct+'%</b><small>of '+w+'</small></div><div class="rv-hero-side">'+
        (s.timePct!=null?row("Course time",s.timePct+"%",bar(s.timePct,"muted"))+row("Evidence",s.ksbPct+"%",bar(s.ksbPct,"",150)):"")+(v?'<span class="pg-verdict '+(v[1]==="good"?"ontrack":"behind")+'">'+v[0]+'</span>':"")+'</div></div>'+
      goals([tp!=null&&[(nvq?"Criteria":"KSBs")+" with evidence",s.ksbPct+"%","About "+tp+"%",s.ksbPct>=tp-10,s.ksbPct>=tp+10]])+
      say(s.met+" of "+s.total+" "+w+(s.signoff?" signed off by your assessor.":" have evidence.")+(
        s.met>=s.total&&s.total?" You’ve evidenced every one"+(tp!=null&&tp<90?", well ahead of schedule at "+tp+"% of the way through your course":"")+". Brilliant work. From here, focus on making your evidence stronger: more photos, fuller write-ups and "+(nvq?"your knowledge questions.":"getting ready for your end-point assessment."):
        tp==null?"":
        s.ksbPct>=tp+10?" You’re ahead of schedule: at "+tp+"% of the way through your course, you’d normally have about "+tp+"% evidenced. Keep it up.":
        s.ksbPct>=tp-10?" That’s about where you should be, "+tp+"% of the way through your course.":
        " "+tp+"% of the way through, you should have about "+tp+"% evidenced, so it’s worth catching up.")+
        (s.weeksPerUnit&&s.met<s.total?" You’ve got about "+plural(s.weeksLeft,"week")+" left, roughly "+plural(s.weeksPerUnit,"week")+" per unit still to start.":"")+(s.prevReviewDate?" Your last review was on "+ukDate(s.prevReviewDate)+".":""))});
    /* Looking back first: how the targets from the last review went. */
    const pt=s.prevTargetList||[];
    if(pt.length)out.push({title:"Your last targets",body:
      '<ul class="rv-last">'+pt.map(t=>'<li class="'+(t.done?"done":"")+'"><span aria-hidden="true">'+(t.done?"✓":"○")+'</span><strong>'+escHtml(t.title)+'</strong><em>'+(t.done?"Achieved":"Not yet")+'</em></li>').join("")+'</ul>'+
      say(pt.every(t=>t.done)?"You achieved every target from your last review. Brilliant.":pt.some(t=>t.done)?"You achieved "+pt.filter(t=>t.done).length+" of "+pt.length+". Anything not finished can carry on into your new targets.":"None of these are finished yet. Your new targets will pick up where they left off.")});
    const expUnits=tp!=null&&s.unitsTotal?Math.min(s.unitsTotal,Math.ceil(tp/100*s.unitsTotal)):null;
    out.push({title:"Evidence",body:
      '<div class="rv-bigs">'+big(s.unitsStarted+"/"+s.unitsTotal,nvq?"jobs started":"units started")+big(s.packs,"evidence packs")+big(s.avgPhotos==null?"–":s.avgPhotos,"photos per pack")+'</div>'+
      goals([expUnits!=null&&[nvq?"Jobs started":"Units started",s.unitsStarted+" of "+s.unitsTotal,"About "+expUnits,s.unitsStarted>=expUnits,s.unitsStarted>=expUnits+2],s.avgPhotos!=null&&["Photos per pack",s.avgPhotos,"5 or more",s.avgPhotos>=5],s.coverage!=null&&["Write-ups cover the key points",s.coverage+"%","70% or more",s.coverage>=70]])+
      say((s.strongest?"Your strongest write-up is <strong>"+escHtml(s.strongest)+"</strong>. ":"")+(s.weakest?"<strong>"+escHtml(s.weakest)+"</strong> needs the most work"+(s.weakestMissing.length?": mention "+escHtml(s.weakestMissing.join(", "))+" next time.":"."):s.packs?"":"Capture your first unit and Evia will start checking your write-ups."))});
    const otjDue=s.weeksIn!=null?Math.round(s.weeksIn*6):null;
    out.push({title:"Learning and activity",body:
      '<div class="rv-bigs">'+big(s.otjTotal,"learning hours")+big(s.otjMonth,"this month")+big(s.streak,"week streak")+'</div>'+
      goals([otjDue!=null&&["Learning hours in total",s.otjTotal,"About "+otjDue,s.otjTotal>=otjDue*.9,s.otjTotal>=otjDue*1.2&&otjDue>0],["Learning hours this month",s.otjMonth,"About 26",s.otjMonth>=22],["Weeks active in a row",s.streak,"Every week",s.streak>=2]])+
      say((s.lastUpload?"Your last upload was "+escHtml(window.eviaStats.ago(s.lastUpload).toLowerCase())+". ":"")+(s.otjMonth<22?"Try to log a few more learning hours each month.":"Good learning hours this month.")+" The OTJ targets assume about 6 hours a week. Your commitment statement says exactly how many you need.")+
      quick(readOnly,[["otj","Log learning hours"]])});
    out.push({title:"Tests",body:
      goals(s.tests.map(t=>[escHtml(t.name),t.latest+"%","70% or more",t.latest>=70]).concat([!nvq&&tp!=null&&tp>=75&&!s.tests.some(t=>/EPA/.test(t.name))&&["Full EPA mock","Not yet","Taken by now",false]]))+
      (s.tests.length?s.tests.map((t,i)=>row(escHtml(t.name),t.latest+"% <small>best "+t.best+"%</small>",bar(t.latest,t.latest>=70?"good":t.latest<50?"low":"",i*100))).join(""):'<p class="pg-note">No tests taken yet.</p>')+
      (s.missed.length?'<p class="rv-label">Worth revising from your last full mock</p>'+chips(s.missed):"")+
      say(s.tests.length?(s.tests.some(t=>t.latest<70)?"Keep practising the tests below 70%: little and often works best.":"Strong results. Keep them ticking over."):"A quick quiz takes about 3 minutes. It’s a good place to start.")+
      quick(readOnly,[["quiz",nvq?"Quick quiz · 3 min":"EPA quick quiz · 3 min"],s.maths&&["maths","Maths"],s.english&&["english","English"]])});
    const confDue=Math.round(40+(tp||0)*.35);
    out.push({title:"Your skills",body:
      goals([s.confPct!=null&&["Course confidence",s.confPct+"%","About "+confDue+"%",s.confPct>=confDue],s.confPct!=null&&["Skills needing training",s.lowSkills.length,tp!=null&&tp>=50?"None by now":"Fewer each check",tp!=null&&tp>=50?!s.lowSkills.length:true]])+
      (s.confPct!=null?'<div class="rv-bigs">'+big(s.confPct+"%","course confidence")+(s.confPrevPct!=null?big((s.confPct-s.confPrevPct>0?"+":"")+(s.confPct-s.confPrevPct),"since last check"):"")+'</div>':'<p class="pg-note">No confidence check yet.</p>')+
      (s.lowSkills.length?'<p class="rv-label">Needs more training</p>'+chips(s.lowSkills,"low"):"")+
      say(s.task?"A good college task for this: <strong>"+escHtml(s.task)+"</strong>. Ask your tutor to set it up.":s.lowSkills.length?"Tell your tutor you’d like more practice on these.":"Rate your skills regularly so your tutor knows where to focus.")+
      quick(readOnly,[["skills","Rate my skills"]])});
    /* Teach me: each subject's average score and areas completed. */
    if(s.teach&&s.teach.length)out.push({title:"Teach me",body:
      s.teach.map((t,i)=>row(escHtml(t.name),(t.avg==null?"No score yet":t.avg+"%")+" · "+t.areasDone+" of "+t.areas+" areas",bar(t.areas?t.areasDone/t.areas*100:0,t.areas&&t.areasDone===t.areas?"good":"",i*90))).join("")+
      say("Your score is your best go at each lesson. EDI and safeguarding lessons cover staying safe, Prevent, British values and equality.")+
      quick(readOnly,[["teach","Open Teach me"]])});
    /* Reviews saved before scenarios moved into Teach me keep their section as it was. */
    const scDone=s.scen?s.scen.reduce((n,t)=>n+t.done,0):0,scTotal=s.scen?s.scen.reduce((n,t)=>n+t.total,0):0;
    if(!s.teach&&s.scen&&s.scen.length)out.push({title:"Staying safe and respected",body:
      goals([["Scenarios done",scDone+" of "+scTotal,tp!=null&&tp<25?"All by 6 months in":"All "+scTotal,scDone===scTotal||(tp!=null&&tp<25)]])+
      s.scen.map((t,i)=>row(escHtml(t.title),t.done+" of "+t.total,bar(t.total?t.done/t.total*100:0,t.done===t.total?"good":"",i*90))).join("")+
      say(s.scen.every(t=>t.done===t.total)?"You’ve completed every real-life scenario. Brilliant.":"These cover safeguarding, Prevent, British values and equality. Each takes about 5 minutes.")+
      ""});
    const c=r.reflection||{},q=r.ksbFollowUp;
    /* A short check-in before the review with the assessor: they read it first, and it fills in their review. */
    const dsl=(window.eviaData.learner()||{}).safeguarding||{};
    const pick=(k,q,opts)=>'<label class="rv-q"><span>'+q+'</span>'+(readOnly?'<p class="rv-a">'+escHtml(c[k]||"Not answered.")+'</p>':'<select data-reflect="'+k+'"><option value="">Choose…</option>'+opts.map(o=>'<option'+(c[k]===o?" selected":"")+'>'+escHtml(o)+'</option>').join("")+'</select>')+'</label>';
    const note=(k,q)=>readOnly?(c[k]?'<label class="rv-q"><span>'+q+'</span><p class="rv-a">'+escHtml(c[k])+'</p></label>':""):'<label class="rv-q"><span>'+q+' <small>If yes</small></span><textarea data-reflect="'+k+'" rows="2">'+escHtml(c[k]||"")+'</textarea></label>';
    out.push({title:"How things are",body:
      pick("feelsSafe","Do you feel safe at work and at college?",["Yes","No","I’d like to talk about it"])+
      pick("knowsReporting","If something worried you, do you know who to tell?"+(dsl.name?" <small>Your safeguarding lead is "+escHtml(dsl.name)+(dsl.phone?", "+escHtml(dsl.phone):"")+".</small>":""),["Yes","No"])+
      pick("changes","Has anything changed at work: your employer, job, hours or contract?",["No","Yes"])+note("changesDetail","What’s changed?")+
      pick("hsIncident","Any accidents, near misses or health and safety worries at work?",["No","Yes"])+note("hsDetail","What happened?")+
      pick("otjHappening","Is your training time happening during your paid working hours?",["Yes","Mostly","No"])});
    out.push({title:"Your comments",body:
      '<label class="rv-q"><span>How are you finding your apprenticeship? <small>Optional</small></span>'+(readOnly?'<p class="rv-a">'+escHtml(c.learnerFeedback||"No comment.")+'</p>':'<textarea data-reflect="learnerFeedback" rows="3">'+escHtml(c.learnerFeedback||"")+'</textarea>')+'</label>'+
      '<label class="rv-q"><span>Is there anything that would help you learn? For example extra help with reading, writing or maths, or support for dyslexia, a disability or anything else. <small>Optional</small></span>'+(readOnly?'<p class="rv-a">'+escHtml(c.support||"No comment.")+'</p>':'<textarea data-reflect="support" rows="2">'+escHtml(c.support||"")+'</textarea>')+'</label>'+
      '<label class="rv-q"><span>What would you like to do after your apprenticeship? <small>Optional</small></span>'+(readOnly?'<p class="rv-a">'+escHtml(c.nextSteps||"No comment.")+'</p>':'<textarea data-reflect="nextSteps" rows="2" placeholder="e.g. stay on as a bricklayer, go on to Level 3, become a site supervisor…">'+escHtml(c.nextSteps||"")+'</textarea>')+'</label>'+
      (readOnly&&q&&c.ksbFollowUp?'<label class="rv-q"><span>'+escHtml(q.question)+'</span><p class="rv-a">'+escHtml(c.ksbFollowUp)+'</p></label>':"")});
    if(collegeSets()&&!readOnly)out.push({title:"Your targets",body:'<ol class="rv-targets">'+mine().map(t=>{const p=progress(t,stats());return '<li><strong>'+escHtml(t.title)+'</strong><small>'+escHtml(t.done?"Done":p.text||"")+'</small><em>Due '+ukDate(t.due+"T12:00:00")+'</em></li>'}).join("")+'</ol>'+
      say("Your assessor sets your new targets with you at the review. I’ll track them for you here.")});
    else out.push({title:readOnly?"Targets set":"Your new targets",body:
      (!readOnly&&s.prevTargets?'<p class="pg-note">These replace your current targets ('+s.prevTargets.done+' of '+s.prevTargets.total+' done).</p>':"")+
      '<ol class="rv-targets">'+r.targets.map(t=>'<li><strong>'+escHtml(t.title)+'</strong><small>'+escHtml(t.why)+'</small><em>Due '+ukDate(t.due+"T12:00:00")+'</em></li>').join("")+'</ol>'+
      say(readOnly?"You can see how you’re getting on with your current targets in My targets.":"These become your targets when you save the review. I’ll track them for you.")});
    /* Sign-off: all three agree the review. Employer and tutor can sign on this phone now, or on the PDF later. */
    const so=r.signoff||{},pf={signature:window.eviaData.files.signature()};
    const pad=(who,label,hint)=>{const v=so[who]||{};return '<div class="rv-sign" data-sign="'+who+'"><div class="rv-sign-top"><strong>'+label+'</strong>'+(v.sig?'<span class="rv-signed">✓ Signed '+escHtml(ukDate(v.date||r.date))+'</span>':'<small>'+hint+'</small>')+'</div>'+
      '<input type="text" class="rv-sign-name" placeholder="Their name" value="'+escHtml(v.name||"")+'" aria-label="'+label+' name">'+
      '<div class="rv-sign-pad"><canvas width="600" height="170" aria-label="'+label+' signature"></canvas><button type="button" class="rv-sign-clear">Clear</button></div></div>'};
    /* Connected to a college, everyone signs the review with the assessor in Milos, so there's nothing to sign here.
       Otherwise the apprentice signs, and shares the PDF with their employer and college. */
    if(!collegeSets())out.push({title:"Sign off",body:
      '<div class="rv-sign rv-sign-me"><div class="rv-sign-top"><strong>Apprentice</strong>'+(pf.signature?'<span class="rv-signed">✓ Signed</span>':'<small>Add your signature in Profile</small>')+'</div>'+(pf.signature?'<img src="'+pf.signature+'" alt="Your signature">':"")+'</div>'+
      say("Share the review PDF with your employer and college so they can see it and agree it.")});
    void pad;
    return out;
  }
  /* Quick actions from a review section (the slides' buttons, and "Improve this" in the chat). */
  const QUICK={
    otj:()=>window.eviaCoachFlows&&window.eviaCoachFlows.hours?(window.chat&&window.chat({quiet:true}),setTimeout(()=>window.eviaCoachFlows.hours(),120)):nav("learning"),
    quiz:()=>window.eviaStartTest&&window.eviaStartTest("epa",5,(window.eviaNvq&&window.eviaNvq.on())?"Quick quiz":"EPA quick quiz"),
    maths:()=>window.eviaStartTest&&window.eviaStartTest("maths",5,"Maths"),
    english:()=>window.eviaStartTest&&window.eviaStartTest("english",5,"English"),
    skills:()=>window.eviaPractice&&window.eviaPractice.openConfidence(),
    teach:()=>nav("teach")
  };
  /* A review left part-way through for a quick action: where it was, and any comments typed so far. */
  const DRAFT="evia7-review-draft";
  function hideResume(){const b=document.getElementById("rv-resume");if(b)b.remove()}
  function showResume(){
    hideResume();const d=readJson(DRAFT,null);if(!d||Date.now()-(d.at||0)>864e5||!collegeSets())return;
    const b=document.createElement("div");b.id="rv-resume";b.className="rv-resume";
    b.innerHTML='<button type="button" class="rv-resume-go">‹ Back to your review</button><button type="button" class="rv-resume-x" aria-label="Finish the review another time">×</button>';
    document.body.appendChild(b);
    b.querySelector(".rv-resume-go").onclick=resumeReview;
    b.querySelector(".rv-resume-x").onclick=()=>{localStorage.removeItem(DRAFT);hideResume()};
  }
  function resumeReview(){
    const d=readJson(DRAFT,null);hideResume();
    const m=document.getElementById("modal-root");if(m)m.innerHTML="";
    const fab=document.getElementById("evia-fab");if(fab)fab.classList.remove("chat-active");
    startReview(d||null);
  }
  /* Signature pads: kept on the review as images; a saved review can still be signed later. */
  function signKeep(root,r){root.querySelectorAll("[data-sign]").forEach(el=>{const who=el.dataset.sign,cv=el.querySelector("canvas"),name=el.querySelector(".rv-sign-name").value.trim();r.signoff=r.signoff||{};const prev=r.signoff[who]||{};
    const inked=cv&&cv.dataset.inked==="1";if(inked||name||prev.sig)r.signoff[who]={name:name||prev.name||"",sig:inked?cv.toDataURL("image/png"):prev.sig||"",date:inked?new Date().toISOString():prev.date||""}})}
  function signBind(root,r){root.querySelectorAll("[data-sign]").forEach(el=>{const cv=el.querySelector("canvas");if(!cv)return;const ctx=cv.getContext("2d");ctx.lineWidth=4;ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#172033";
    const prev=(r.signoff||{})[el.dataset.sign];if(prev&&prev.sig){const im=new Image();im.onload=()=>ctx.drawImage(im,0,0,cv.width,cv.height);im.src=prev.sig}
    let on=false;const pt=e=>{const b=cv.getBoundingClientRect();return{x:(e.clientX-b.left)*cv.width/b.width,y:(e.clientY-b.top)*cv.height/b.height}};
    cv.onpointerdown=e=>{on=true;cv.setPointerCapture(e.pointerId);const q=pt(e);ctx.beginPath();ctx.moveTo(q.x,q.y)};
    cv.onpointermove=e=>{if(!on)return;const q=pt(e);ctx.lineTo(q.x,q.y);ctx.stroke();cv.dataset.inked="1"};
    cv.onpointerup=cv.onpointercancel=()=>{on=false};
    el.querySelector(".rv-sign-clear").onclick=()=>{ctx.clearRect(0,0,cv.width,cv.height);cv.dataset.inked="";if(r.signoff&&r.signoff[el.dataset.sign])r.signoff[el.dataset.sign].sig=""}})}
  function openReview(r,readOnly,startAt){
    const list=slides(r,readOnly);let i=0;hideResume();
    const root=document.getElementById("modal-root");
    root.innerHTML='<div class="overlay"><section class="sheet pr-sheet rv-sheet" role="dialog" aria-modal="true" aria-labelledby="rv-title"><div class="sheet-head"><div><div class="chat-kicker" id="rv-kicker"></div><h2 id="rv-title" tabindex="-1"></h2></div><button class="close" id="rv-close" type="button" aria-label="Close">×</button></div>'+
      '<div class="rv-dots" id="rv-dots">'+list.map((s,n)=>'<button type="button" data-rv-go="'+n+'" aria-label="'+escHtml(s.title)+'"></button>').join("")+'</div>'+
      '<div class="rv-body pg-animate" id="rv-body"></div>'+
      '<div class="rv-nav"><button type="button" class="secondary" id="rv-back">Back</button><button type="button" class="primary" id="rv-next">Next</button></div></section></div>';
    const body=root.querySelector("#rv-body"),next=root.querySelector("#rv-next"),back=root.querySelector("#rv-back");
    const keepSigns=()=>signKeep(body,r);
    const bindSigns=()=>signBind(body,r);
    const saveSignsOnSaved=()=>{if(!readOnly)return;keepSigns();window.eviaData.put("reviews",{id:r.id,signoff:r.signoff})};
    const keepComments=()=>{keepSigns();saveSignsOnSaved();if(readOnly)return;body.querySelectorAll("[data-reflect]").forEach(t=>{r.reflection=r.reflection||{};r.reflection[t.dataset.reflect]=t.value.trim()})};
    const show=n=>{
      keepComments();i=Math.max(0,Math.min(list.length-1,n));
      root.querySelector("#rv-kicker").textContent=(readOnly?"REVIEW · "+ukDate(r.date).toUpperCase():"PROGRESS REVIEW")+" · "+(i+1)+" OF "+list.length;
      root.querySelector("#rv-title").textContent=list[i].title;
      body.innerHTML='<div class="pg-card rv-slide">'+list[i].body+'</div>';bindSigns();
      requestAnimationFrame(()=>requestAnimationFrame(()=>{const c=body.querySelector(".pg-card");if(c)c.classList.add("pg-in")}));
      root.querySelectorAll("[data-rv-go]").forEach((d,n)=>d.classList.toggle("on",n===i));
      back.style.visibility=i?"visible":"hidden";
      const last=i===list.length-1;
      next.textContent=last?(readOnly?"Download PDF":"Save review"):"Next";
      root.querySelector(".rv-sheet").scrollTop=0;body.scrollTop=0;
    };
    root.querySelector("#rv-close").onclick=()=>{keepComments();root.innerHTML="";if(!readOnly)localStorage.removeItem(DRAFT)};
    /* Quick actions: save the place (and any comments), do the thing, then offer the way back. */
    body.addEventListener("click",e=>{
      const b=e.target.closest("[data-rv-quick]");if(!b||!QUICK[b.dataset.rvQuick])return;
      keepComments();localStorage.setItem(DRAFT,JSON.stringify({i,reflection:r.reflection||{},at:Date.now()}));
      root.innerHTML="";QUICK[b.dataset.rvQuick]();setTimeout(showResume,300);
    });
    back.onclick=()=>show(i-1);
    root.querySelectorAll("[data-rv-go]").forEach(d=>d.onclick=()=>show(+d.dataset.rvGo));
    next.onclick=()=>{
      if(i<list.length-1)return show(i+1);
      if(readOnly){keepComments();if(window.eviaOpenReviewPdf)window.eviaOpenReviewPdf(r);else if(window.eviaDownloadReviewPdf)window.eviaDownloadReviewPdf(r);return}
      keepComments();save(r);root.innerHTML="";localStorage.removeItem(DRAFT);
      if(typeof showEvidenceToast==="function")showEvidenceToast("Review saved. Your new targets are ready.");
      /* The record needs sharing and signing by the learner, employer and provider: offer the PDF straight away. */
      if(window.eviaOpenReviewPdf)setTimeout(()=>window.eviaOpenReviewPdf(r),450);
      if(window.eviaMood)window.eviaMood("happy");
      if(typeof screen!=="undefined"&&(screen==="progress"||screen==="home"))render();
    };
    show(startAt||0);
  }
  /* The review as a conversation with Evia: each section is her message plus a card, and Next moves on. */
  function newReview(){
    const S=stats();if(!S)return null;
    const base=window.eviaBuildReviewRecord?window.eviaBuildReviewRecord():{course,date:new Date().toISOString()};
    const targets=suggest(S);
    return Object.assign(base,{id:"review-"+Date.now(),format:2,snapshot:snapshot(S),targets:targets.map(t=>Object.assign({},t,{reason:t.why,deadline:t.due})),reflection:{}});
  }
  function chatReview(){
    if(!collegeSets())return reminder();
    const k=window.eviaChatKit,r=newReview();
    if(!k||!r){startReview();return}
    const list=slides(r,false);
    const QUICK_LATER=[];
    const step=i=>{
      const sl=list[i],tmp=document.createElement("div");tmp.innerHTML=sl.body;
      /* Evia's line on the slide becomes her message; quick actions are offered once the review is saved. */
      const line=tmp.querySelector(".rv-evia");let words="";if(line){const sp=line.querySelector(":scope > span:last-child");words=sp?sp.innerHTML:"";line.remove()}
      const improve=[...tmp.querySelectorAll("[data-rv-quick]")].map(b=>b.dataset.rvQuick).find(q=>QUICK[q])||null;
      tmp.querySelectorAll("[data-rv-quick]").forEach(b=>{if(!QUICK_LATER.some(q=>q[0]===b.dataset.rvQuick))QUICK_LATER.push([b.dataset.rvQuick,b.textContent.trim()])});
      tmp.querySelectorAll(".rv-quick").forEach(x=>x.remove());
      if(words)k.say(words);
      k.widget('<div class="rvc"><div class="rvc-top"><strong>'+escHtml(sl.title)+'</strong><span>'+(i+1)+' of '+list.length+'</span></div><div class="pg-card rv-slide">'+tmp.innerHTML+'</div></div>',el=>{
        signBind(el,r);
        requestAnimationFrame(()=>requestAnimationFrame(()=>{const c=el.querySelector(".pg-card");if(c)c.classList.add("pg-in")}));
        el.dataset.rvStep=i;
      });
      const keep=()=>{const el=[...document.querySelectorAll("#chat .ui-widget")].reverse().find(w=>w.querySelector(".rvc"));if(!el)return;signKeep(el,r);el.querySelectorAll("[data-reflect]").forEach(t=>{r.reflection[t.dataset.reflect]=t.value.trim();t.disabled=true});el.querySelectorAll("canvas,.rv-sign-name,.rv-sign-clear").forEach(x=>{x.style.pointerEvents="none";x.disabled=true})};
      const last=i===list.length-1;
      k.replies(last?[{label:"Save my review",primary:true,run:()=>{keep();finish()}},{label:"Not now",run:()=>{k.say("No problem. We can do it another time.");k.somethingElse()}}]
        :[{label:i===0?"Let’s go":"Next",primary:true,run:()=>{keep();step(i+1)}},
          /* Something in this section to improve: go and do it now, and come back to the review after. */
          improve?{label:"Improve this",run:()=>{keep();localStorage.setItem(DRAFT,JSON.stringify({i,reflection:r.reflection||{},at:Date.now()}));k.closeChat();setTimeout(()=>{QUICK[improve]();setTimeout(showResume,400)},150)}}
            :{label:"Finish later",run:()=>{keep();localStorage.setItem(DRAFT,JSON.stringify({i,reflection:r.reflection||{},at:Date.now()}));k.say("No problem. Your review will be here when you’re ready.");k.somethingElse()}}]);
    };
    const finish=()=>{
      save(r);localStorage.removeItem(DRAFT);
      if(window.eviaMood)window.eviaMood("happy");
      if(collegeSets()){k.say("Thanks. Your comments are saved, and your assessor will read them before your review. You’ll sign it together then.")}
      else{k.say("That’s your review saved, and your new targets are set. I’ll keep track of them for you.");k.say("Share the PDF with your employer and college so they can see it and agree it.")}
      const q={otj:["Log my hours",()=>window.eviaCoachFlows.hours()],quiz:["Test me",()=>window.eviaTestMe&&window.eviaTestMe()],skills:["Confidence check",()=>window.eviaCoachFlows.confidence()],scenario:["A real-life scenario",()=>window.eviaCoachFlows.scenario()]};
      k.replies([{label:"Open the PDF",primary:true,run:()=>{k.closeChat();setTimeout(()=>window.eviaOpenReviewPdf&&window.eviaOpenReviewPdf(r),120)}}].concat(QUICK_LATER.filter(x=>q[x[0]]).slice(0,2).map(x=>({label:q[x[0]][0],run:q[x[0]][1]})),[{label:"Something else",run:k.somethingElse}]));
      if(typeof screen!=="undefined"&&(screen==="learning"||screen==="progress"))setTimeout(()=>{if(!document.querySelector(".chat-sheet"))render()},50);
    };
    step(0);
  }
  /* Connected to a college, the assessor sets the targets at the review (they arrive from Nisia); Evia's own review
     is the learner's side of it, so it keeps the targets they have. */
  const collegeSets=()=>!!(window.eviaNisia&&window.eviaNisia.joined());
  function save(r){
    window.eviaData.put("reviews",r);
    if(!collegeSets())setTargets(r.targets.map(t=>Object.assign({},t,{reviewId:r.id,reviewDate:r.date})));
  }
  /* Not connected to a college: the assessor has no access to Evia, so there's no review here, just the reminder.
     Reviews happen with the assessor and employer every 3 months; Evia says when, helps them get ready, and counts
     from the day they say it's been held. */
  const HELD="evia7-reviews-held";
  const heldDates=()=>(readJson(HELD,[])||[]).filter(x=>x&&x.course===course).map(x=>Date.parse(x.date)).filter(Boolean);
  function markHeld(){const a=readJson(HELD,[])||[];a.push({course,date:new Date().toISOString()});localStorage.setItem(HELD,JSON.stringify(a))}
  let tries=0;
  function reminder(){
    const k=window.eviaChatKit;
    if(!k||!document.querySelector(".chat-sheet")){if(window.chat&&tries++<3){window.chat({quiet:true});setTimeout(reminder,180)}return}
    tries=0;
    const rd=window.eviaReviewDue&&window.eviaReviewDue(),d=t=>t.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
    k.say(rd?(rd.days<0?"Your progress review was due on <strong>"+d(rd.due)+"</strong>.":rd.days===0?"Your progress review is due <strong>today</strong>.":"Your next progress review is due on <strong>"+d(rd.due)+"</strong>."):"Progress reviews are every 3 months.");
    k.say("Reviews are with your assessor and your employer. Evia isn’t connected to your college, so book it with them. I can help you get ready for it.");
    k.replies([{label:"Get ready for my review",primary:true,run:()=>window.eviaCoachFlows&&window.eviaCoachFlows.prepare()},
      {label:"I’ve had my review",run:()=>{markHeld();const n=window.eviaReviewDue();k.say("Great. Your next one is due on <strong>"+d(n.due)+"</strong>. I’ll remind you.");if(typeof render==="function")setTimeout(()=>{if(!document.querySelector(".chat-sheet"))render()},50);k.somethingElse()}},
      {label:"Something else",run:k.somethingElse}]);
  }
  function startReview(resume){
    if(!collegeSets()){localStorage.removeItem(DRAFT);return reminder()}
    if(resume&&resume.type)resume=null; /* called straight from a click */
    const r=newReview();if(!r)return;
    /* Picking up where they left off: fresh figures (the quick action may have changed them), same comments and step. */
    if(resume){r.reflection=resume.reflection||{};localStorage.removeItem(DRAFT)}
    openReview(r,false,resume?resume.i:0);
  }
  /* Opening a saved review: new ones use the click-through, older ones the original screen. */
  function showReview(id){
    const r=(window.eviaData.get("reviews",id)||{}).detail;if(!r)return;
    if(r.format===2)openReview(r,true);else if(window.eviaOpenLegacyReview)window.eviaOpenLegacyReview(r);
  }

  window.eviaTargets={ensure:ensureTargets,mine,progress,cardHtml,bind,check,stats};
  window.eviaStartReview=()=>startReview();
  window.eviaReviewReminder=reminder;
  window.eviaChatReview=chatReview;
  window.eviaResumeReview=resumeReview;
  /* Reviews are due every 3 calendar months: 3 months after the last one, or after the course start. */
  window.eviaReviewDue=()=>{
    const all=reviewsNow(),last=all[all.length-1],p=window.eviaData.learner();
    /* Connected to a college: the review is the one the assessor holds in Milos, when Nisia says it's due. From 7 days
       before, the learner's comments are wanted: done once they've finished a review here with something written. */
    const en=window.eviaData.enrolment&&window.eviaData.enrolment(),nd=en&&en.reviewDue?new Date(en.reviewDue+"T12:00:00"):null;
    if(nd&&!isNaN(nd)){
      const from=Math.max(nd-7*864e5,en.lastReview?Date.parse(en.lastReview):0);
      const said=r=>r&&r.reflection&&Object.values(r.reflection).some(v=>String(v||"").trim());
      const commentsDone=all.some(r=>Date.parse(r.date)>=from&&said(r));
      return {due:nd,days:Math.ceil((nd-Date.now())/864e5),first:!en.lastReview,college:true,commentsDone};
    }
    const since=[last?Date.parse(last.date):0].concat(heldDates()).filter(Boolean);
    const from=since.length?new Date(Math.max(...since)):p.start?new Date(p.start+"T12:00:00"):null;if(!from||isNaN(from))return null;
    const due=new Date(from);due.setMonth(due.getMonth()+3);
    const days=Math.ceil((due-Date.now())/864e5);return {due,days,first:!last};
  };
  window.eviaReviewDraft=()=>!!readJson(DRAFT,null);
  setTimeout(showResume,1500); /* a review left part-way through before the app was closed */
  window.eviaShowReview=showReview;
  window.eviaCheckTargets=()=>check(true);
})();
