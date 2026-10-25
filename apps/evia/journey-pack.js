/* Evia7 journey pack: where the learner is on their apprenticeship, at a glance, for their assessor or coach. Not a
   review (nothing to fill in): a picture of the journey so far, on screen, with Share as a PDF.
   - Where they are: a line from the course start to the end with "you are here", and how much of the course their
     evidence covers against that.
   - Four numbers: KSBs, learning hours, evidence, attendance.
   - Since the last review: evidence added, hours logged, topics worked on.
   - Topics: each with its 3 strength bars.
   - Targets with their progress, Teach me and tests, confidence, and their goal (My future).
   - Everything else Evia uses for a review: every KSB (criterion on an NVQ) with whether it's signed off, waiting or
     still needed; how good the evidence is; what was taught at college (Symi); attendance; the employer's feedback
     (Paros); their weekly check-ins with Evia; their own comments for the review; and time spent learning in Evia.
   The Review tab shows a small version of the first two (journeyCard).
   window.eviaJourneyPack: open(), share(), data(), journeyCard(). */
(function(){
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const DAY=864e5,hm=h=>window.eviaHM?window.eviaHM(h):Math.round(h*10)/10+"h";
  const dt=t=>new Date(t).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
  const LEVEL={strong:3,good:2,weak:1};

  /* The college or employer as Evia Portal sent it: a name, or a record with one. */
  const nameOf=x=>!x?"":typeof x==="object"?String(x.name||x.employer_name||x.title||""):String(x);
  function data(){
    const S=window.eviaStats.compute(),a=S.a,P=window.eviaPrepPack?window.eviaPrepPack.pack():null;
    const D=window.eviaData,en=(D.enrolment&&D.enrolment())||{},pr=D.learner()||{};
    const start=Date.parse(en.start||pr.start||"")||null,end=Date.parse(en.end||pr.end||"")||null;
    const ev=typeof evidence!=="undefined"?evidence:[],count=n=>ev.filter(e=>e.c===course&&e.u===n&&!e.induction).length;
    const units=(a.units||[]).map(u=>({name:u.name,n:count(u.name),level:typeof unitStrengthForCourse==="function"?unitStrengthForCourse(u.name):null}));
    const T=window.eviaTargets,tg=T?T.mine():[];
    const targets=tg.map(t=>{let p={pct:t.done?1:0,text:""};try{p=T.progress(t,S)}catch(_){}return {title:t.title,pct:Math.round((t.done?1:p.pct)*100),done:!!t.done,due:t.due}});
    const conf=S.confidence||{},sc=conf.scores||[];
    return {S,a,P,name:pr.name||en.name||"",course:(()=>{try{return C[course].name}catch(_){return ""}})(),college:nameOf(en.college),workplace:nameOf(en.employer),
      start,end,timePct:a.timePct,ksb:{met:a.met,total:a.total,pct:a.ksbPct,word:window.eviaNvq&&window.eviaNvq.on()?"criteria":"KSBs"},
      hours:{total:Math.round((S.otjTotal||0)*10)/10,planned:P&&P.hours.planned,since:P?P.hours.since:0},
      evidence:{total:(a.entries||[]).length,since:P?P.evidence.since:0,units:P?P.evidence.units:[]},
      attendance:P&&P.attendance,from:P?P.from:null,units,targets,
      teach:S.teach&&S.teach.total?{done:S.teach.done,total:S.teach.total,avg:S.teach.avg}:null,
      tests:(S.tests||[]).map(t=>({name:t.name,best:t.best,count:t.count})),
      confidence:sc.length?{confident:(conf.confident||[]).length,total:sc.length,practise:(conf.practise||[]).slice(0,4)}:null,
      future:window.eviaFuture&&window.eviaFuture.summary?window.eviaFuture.summary():null,
      ksbs:ksbList(a),quality:quality(S),taught:college(P?P.from:0),employer:employer(),checkins:checkins(P?P.from:0),comments:comments(),
      minutes:P?P.minutes:0,visits:visits()};
  }
  /* Every KSB (criterion on an NVQ): signed off (or with evidence, on its own), waiting for the assessor, or still needed. */
  function ksbList(a){
    let all=[];try{all=typeof allK==="function"?allK():[]}catch(_){}
    const st=k=>a.evidenced&&a.evidenced.has(k)?"met":a.possible&&a.possible.has(k)?"wait":"none";
    const nvq=window.eviaNvq&&window.eviaNvq.on();
    const groups=nvq?[...new Set(all.map(x=>String(x[0]).split(".")[0]))].map(u=>["Unit "+u,all.filter(x=>String(x[0]).split(".")[0]===u)])
      :[["Knowledge",all.filter(x=>/^K/i.test(x[0]))],["Skills",all.filter(x=>/^S/i.test(x[0]))],["Behaviours",all.filter(x=>/^B/i.test(x[0]))]].filter(g=>g[1].length);
    return {signoff:!!a.signoff,groups:groups.map(([name,items])=>({name,items:items.map(([code,text])=>({code,text,st:st(code)}))}))};
  }
  function quality(S){
    const lv={strong:0,good:0,weak:0};
    (S.a.units||[]).forEach(u=>{const l=typeof unitStrengthForCourse==="function"?unitStrengthForCourse(u.name):null;if(l)lv[l]++});
    return {coverage:S.coverage,photos:S.avgPhotos==null?null:Math.round(S.avgPhotos*10)/10,levels:lv};
  }
  const H=()=>typeof hours!=="undefined"&&Array.isArray(hours)?hours:[];
  function college(from){
    return H().filter(x=>x&&x.college&&Number(x.on||x.createdAt)>=from).map(x=>({date:x.college.date||"",cls:x.college.class||"",lesson:x.college.lesson||"",ksbs:x.college.ksbs||[]})).sort((x,y)=>String(y.date).localeCompare(String(x.date))).slice(0,8);
  }
  function employer(){
    const E=window.eviaEmployer&&window.eviaEmployer.get();if(!E)return null;
    const r=(E.ratings||[])[0],W=["","Needs support","Developing","Good","Excellent"];
    return {who:E.who||"Employer",witness:(E.witness||[]).length,lastWitness:(E.witness||[])[0]||null,ratings:r?Object.entries(r.ratings||{}).sort().map(([k,v])=>({k,v:Number(v),word:W[v]||""})):[],comment:r&&r.comment||""};
  }
  function checkins(from){
    let all=[];try{all=((JSON.parse(localStorage.getItem("evia7-coach")||"{}")||{}).checkins||[]).filter(c=>c&&Number(c.at)>=from)}catch(_){}
    if(!all.length)return null;
    const m={good:0,ok:0,low:0};all.forEach(c=>{if(m[c.mood]!=null)m[c.mood]++});
    const goals=all.filter(c=>c.goal),met=all.filter(c=>c.goalResult&&c.goalResult.done).length,last=all[all.length-1];
    return {n:all.length,moods:m,goals:goals.length,met,latestGoal:last.goal?last.goal.title:"",askedToTalk:all.some(c=>c.told)};
  }
  function comments(){
    const r=window.eviaComments&&window.eviaComments.latest&&window.eviaComments.latest(),c=r&&r.reflection;if(!c)return null;
    const Q=[["feelsSafe","Feels safe at work and college"],["knowsReporting","Knows who to tell if worried"],["changes","Changes at work"],["hsIncident","Accidents or near misses"],["otjHappening","Training in paid hours"],["supportNeeded","Needs extra help"]];
    return {at:r.date,answers:Q.filter(q=>c[q[0]]).map(q=>[q[1],c[q[0]]+(c[q[0]]==="Yes"&&c[q[0]+"Detail"]?": "+c[q[0]+"Detail"]:"")]),
      words:[["How it’s going",c.learnerFeedback],["What would help",c.support],["After the apprenticeship",c.nextSteps]].filter(x=>String(x[1]||"").trim())};
  }
  function visits(){
    const N=window.eviaNisia;return (N&&N.visits?N.visits():[]).filter(v=>Date.parse(v.starts_at)>Date.now()-DAY).slice(0,3).map(v=>({at:v.starts_at,kind:v.kind,place:v.place||""}));
  }

  /* ---------- On screen ---------- */
  const bars=level=>'<span class="jp-bars" aria-label="'+(level||"No evidence")+'">'+[1,2,3].map(i=>'<i class="'+(i<=(LEVEL[level]||0)?"on":"")+'"></i>').join("")+'</span>';
  function road(J){
    const k=Math.min(100,J.ksb.pct||0),t=J.timePct==null?null:Math.max(0,Math.min(100,J.timePct)),behind=t!=null&&t-k>10;
    return '<div class="jp-road"><div class="jp-track"><i class="jp-fill'+(behind?" behind":"")+'" style="width:'+k+'%"></i>'+(t!=null?'<span class="jp-now" style="left:'+t+'%"><em>Now</em></span>':"")+'</div>'+
      '<div class="jp-ends"><span>'+(J.start?esc(dt(J.start)):"Start")+'</span><span>'+(J.end?esc(dt(J.end)):"End")+'</span></div>'+
      '<p class="jp-say">'+(t==null?"Your evidence covers "+k+"% of your "+J.ksb.word+".":"You’re "+t+"% of the way through, and your evidence covers "+k+"% of your "+J.ksb.word+". "+(behind?"A bit behind where you’d want to be.":"On track."))+'</p></div>';
  }
  const tile=(big,small)=>'<div class="jp-tile"><b>'+big+'</b><small>'+small+'</small></div>';
  function tiles(J){
    return '<div class="jp-tiles">'+tile(J.ksb.met+'<i>/'+J.ksb.total+'</i>',J.ksb.word)+tile(esc(hm(J.hours.total)),J.hours.planned?"of "+J.hours.planned+"h learning":"learning hours")+
      tile(String(J.evidence.total),"pieces of evidence")+tile(J.attendance?J.attendance.pct+"%":"–","attendance")+'</div>';
  }
  /* The small version on the Review tab. */
  function journeyCard(){try{const J=data();return '<section class="th-hero jp-mini"><span class="th-k">Your journey</span>'+road(J)+tiles(J)+'</section>'}catch(_){return ""}}
  function body(J){
    const sec=(t,h)=>h?'<section class="jp-sec"><h3>'+t+'</h3>'+h+'</section>':"";
    return '<div class="jp-head"><strong>'+esc(J.name||"Apprentice")+'</strong><span>'+esc([J.course,J.workplace,J.college].filter(Boolean).join(" · "))+'</span></div>'+
      sec("Where I am",road(J)+tiles(J))+
      sec("Since my last review"+(J.from?" ("+esc(dt(J.from))+")":""),'<div class="jp-tiles jp-3">'+tile(String(J.evidence.since),"new evidence")+tile(esc(hm(J.hours.since)),"hours logged")+tile(String(J.evidence.units.length),"topics worked on")+'</div>'+
        (J.evidence.units.length?'<p class="jp-note">'+esc(J.evidence.units.join(", "))+'</p>':""))+
      sec("My topics",'<div class="jp-units">'+J.units.map(u=>'<div class="jp-unit"><span>'+esc(u.name)+'</span><small>'+(u.n?u.n+(u.n===1?" piece":" pieces"):"Not started")+'</small>'+bars(u.level)+'</div>').join("")+'</div>')+
      sec("My "+(J.ksbs.groups.length&&/^Unit/.test(J.ksbs.groups[0].name)?"criteria":J.ksb.word),J.ksbs.groups.map(g=>{const d=g.items.filter(x=>x.st==="met").length;
          return '<div class="jp-kgroup"><div class="jp-khead"><strong>'+esc(g.name)+'</strong><small>'+d+" of "+g.items.length+(J.ksbs.signoff?" signed off":" with evidence")+'</small></div><div class="jp-codes">'+
            g.items.map(x=>'<button type="button" class="jp-code '+x.st+'" data-k="'+esc(x.code)+'" title="'+esc(x.text)+'">'+esc(x.code)+'</button>').join("")+'</div></div>'}).join("")+
        '<p class="jp-key"><span class="jp-code met">K1</span> '+(J.ksbs.signoff?"signed off":"has evidence")+(J.ksbs.signoff?' <span class="jp-code wait">K2</span> waiting for the assessor':"")+' <span class="jp-code none">K3</span> still needed</p><p class="jp-note jp-ktext" hidden></p>')+
      sec("How good my evidence is",'<div class="jp-tiles jp-3">'+tile(J.quality.levels.strong+'<i>/'+(J.quality.levels.strong+J.quality.levels.good+J.quality.levels.weak)+'</i>',"topics at full strength")+tile(J.quality.coverage==null?"–":J.quality.coverage+"%","write-ups cover the key points")+tile(J.quality.photos==null?"–":String(J.quality.photos),"photos per piece")+'</div>')+
      sec("My targets",J.targets.length?J.targets.map(t=>'<div class="jp-goal"><span>'+esc(t.title)+'</span><span class="jp-bar"><i style="width:'+t.pct+'%" class="'+(t.done?"done":"")+'"></i></span><small>'+(t.done?"Done ✓":t.pct+"%")+'</small></div>').join(""):'<p class="jp-note">No targets set yet.</p>')+
      sec("Learning",(J.teach?'<div class="jp-goal"><span>Teach me lessons</span><span class="jp-bar"><i style="width:'+Math.round(J.teach.done/J.teach.total*100)+'%"></i></span><small>'+J.teach.done+" of "+J.teach.total+'</small></div>':"")+
        J.tests.map(t=>'<div class="jp-goal"><span>'+esc(t.name)+' (best)</span><span class="jp-bar"><i style="width:'+t.best+'%"></i></span><small>'+t.best+'%</small></div>').join("")+
        (J.confidence?'<p class="jp-note">Feels confident in '+J.confidence.confident+" of "+J.confidence.total+" practical areas"+(J.confidence.practise.length?"; wants more practice with "+esc(J.confidence.practise.join(", ").toLowerCase()):"")+'.</p>':""))+
      sec("At college",(J.attendance?'<div class="jp-goal"><span>Attendance</span><span class="jp-bar"><i style="width:'+(J.attendance.pct||0)+'%"></i></span><small>'+J.attendance.pct+'%</small></div><p class="jp-note">'+J.attendance.here+" of "+J.attendance.n+(J.attendance.own?" college days (marked by me)":" sessions")+(J.attendance.absent?", "+J.attendance.absent+" missed":"")+'</p>':"")+
        (J.taught.length?'<div class="jp-list">'+J.taught.map(c=>'<div><b>'+esc(c.lesson||c.cls||"Class")+'</b><small>'+esc([c.date?dt(c.date+"T12:00:00"):"",c.cls,c.ksbs.join(" ")].filter(Boolean).join(" · "))+'</small></div>').join("")+'</div>':(J.attendance?"":'<p class="jp-note">Nothing from college yet.</p>')))+
      (J.employer?sec("From "+esc(J.employer.who),(J.employer.ratings.length?J.employer.ratings.map(r=>'<div class="jp-goal"><span>'+esc(r.k)+'</span><span class="jp-bar"><i style="width:'+r.v*25+'%"></i></span><small>'+esc(r.word)+'</small></div>').join(""):"")+
        (J.employer.comment?'<p class="jp-note">“'+esc(J.employer.comment)+'”</p>':"")+(J.employer.witness?'<p class="jp-note">'+J.employer.witness+" witness testimon"+(J.employer.witness===1?"y":"ies")+'</p>':"")):"")+
      (J.checkins?sec("Check-ins with Evia",'<div class="jp-tiles jp-3">'+tile(String(J.checkins.n),"weekly catch-ups")+tile(J.checkins.met+'<i>/'+J.checkins.goals+'</i>',"weekly goals met")+tile(J.checkins.moods.good+J.checkins.moods.ok+'<i>/'+J.checkins.n+'</i>',"weeks feeling OK or good")+'</div>'+
        (J.checkins.latestGoal?'<p class="jp-note">This week’s goal: <b>'+esc(J.checkins.latestGoal)+'</b></p>':"")):"")+
      (J.comments?sec("My comments for the review",'<div class="jp-list">'+J.comments.answers.map(a=>'<div><b>'+esc(a[0])+'</b><small>'+esc(a[1])+'</small></div>').join("")+J.comments.words.map(w=>'<div><b>'+esc(w[0])+'</b><small>'+esc(w[1])+'</small></div>').join("")+'</div>'):"")+
      (J.minutes?sec("Time learning in Evia",'<p class="jp-note"><b>'+esc(hm(J.minutes/60))+'</b> since the last review</p>'):"")+
      (J.future?sec("Where I’m heading",'<p class="jp-note"><b>'+esc(J.future.goal)+'</b>'+(J.future.when?" · "+esc(J.future.when):"")+" · "+J.future.done+" of "+J.future.steps+' steps done</p>'):"");
  }
  function open(){
    let J;try{J=data()}catch(err){console.warn("Evia: journey pack",err&&err.message);return}
    const root=document.getElementById("modal-root");
    root.innerHTML='<div class="overlay pv-overlay"><section class="sheet pv-sheet jp-sheet" role="dialog" aria-modal="true" aria-labelledby="jp-title"><div class="sheet-head"><div><div class="chat-kicker">FOR MY ASSESSOR</div><h2 id="jp-title">My journey so far</h2></div><button class="close" id="jp-close" aria-label="Close">×</button></div>'+
      '<div class="jp">'+body(J)+'</div><div class="jp-acts"><button type="button" class="primary" id="jp-share">Share as a PDF</button></div></section></div>';
    const close=()=>{root.innerHTML=""};
    root.querySelector("#jp-close").onclick=close;
    root.querySelectorAll(".jp-code[data-k]").forEach(b=>b.onclick=()=>{const t=b.closest(".jp-sec").querySelector(".jp-ktext");root.querySelectorAll(".jp-code.on").forEach(x=>x.classList.remove("on"));b.classList.add("on");t.hidden=false;t.innerHTML="<b>"+esc(b.dataset.k)+"</b> "+esc(b.title)});
    root.querySelector(".overlay").addEventListener("click",e=>{if(e.target.classList.contains("overlay"))close()});
    root.querySelector("#jp-share").onclick=async e=>{const b=e.currentTarget,t=b.textContent;b.disabled=true;b.textContent="Making the PDF…";
      try{await share(J)}catch(err){if(!err||err.name!=="AbortError")alert("That didn’t work: "+((err&&err.message)||"try again."))}finally{b.disabled=false;b.textContent=t}};
  }

  /* ---------- The PDF: the same picture ---------- */
  function loadPdf(){
    if(window.jspdf)return Promise.resolve(window.jspdf);
    return new Promise((res,rej)=>{const s=document.createElement("script");s.src="vendor/jspdf.umd.min.js";s.onload=()=>window.jspdf?res(window.jspdf):rej(new Error("The PDF maker didn’t load."));s.onerror=()=>rej(new Error("The PDF maker didn’t load."));document.head.appendChild(s)});
  }
  async function pdf(J){
    J=J||data();
    const {jsPDF}=await loadPdf(),doc=new jsPDF({unit:"mm",format:"a4",compress:true}),W=210,H=297,M=16,CW=W-2*M,BOTTOM=H-18;let y=M;
    const txt=window.eviaPdfText||(x=>String(x||""));
    const ink=[23,32,51],muted=[102,112,133],line=[228,231,236],soft=[246,247,249],yellow=[231,185,0],green=[60,179,113],orange=[240,138,36];
    const need=h=>{if(y+h>BOTTOM){doc.addPage();y=M}};
    const font=(sz,b,c)=>{doc.setFont("helvetica",b?"bold":"normal");doc.setFontSize(sz);doc.setTextColor(...(c||ink))};
    const head=t=>{need(16);y+=4;font(12,true);doc.text(txt(t),M,y+4);y+=8};
    const bar=(x,yy,w,h,pct,col)=>{doc.setFillColor(...line);doc.roundedRect(x,yy,w,h,h/2,h/2,"F");if(pct>0){doc.setFillColor(...(col||yellow));doc.roundedRect(x,yy,Math.max(h,w*Math.min(1,pct/100)),h,h/2,h/2,"F")}};
    const tileRow=list=>{need(22);const n=list.length,g=4,tw=(CW-g*(n-1))/n;list.forEach(([big,small],i)=>{const x=M+i*(tw+g);doc.setFillColor(...soft);doc.roundedRect(x,y,tw,19,3,3,"F");font(15,true);doc.text(txt(big),x+4,y+9);font(8,false,muted);doc.text(txt(small),x+4,y+15)});y+=23};
    const para=(t,c)=>{font(9.5,false,c||muted);doc.splitTextToSize(txt(t),CW).forEach(l=>{need(5);doc.text(l,M,y+3.5);y+=4.8})};
    /* Header */
    doc.setFillColor(...yellow);doc.rect(0,0,W,4,"F");
    font(8,true,muted);doc.setCharSpace(.35);doc.text("EVIA · MY APPRENTICESHIP JOURNEY",M,y+4);doc.setCharSpace(0);y+=8;
    font(20,true);doc.text(txt(J.name||"Apprentice"),M,y+7);y+=11;
    font(10,false,muted);doc.text(txt([J.course,J.workplace,J.college].filter(Boolean).join(" · ")),M,y+3);font(8.5,false,muted);doc.text(txt("Prepared "+dt(Date.now())),W-M,y+3,{align:"right"});y+=9;
    /* Where I am: the road */
    head("Where I am");
    const k=Math.min(100,J.ksb.pct||0),t=J.timePct==null?null:Math.max(0,Math.min(100,J.timePct)),behind=t!=null&&t-k>10;
    need(24);bar(M,y+4,CW,5,k,behind?orange:green);
    if(t!=null){const x=M+CW*t/100;doc.setDrawColor(...ink);doc.setLineWidth(.6);doc.line(x,y+1,x,y+11);font(7.5,true);doc.text("Now",x,y,{align:"center"})}
    font(8,false,muted);doc.text(txt(J.start?dt(J.start):"Start"),M,y+15);doc.text(txt(J.end?dt(J.end):"End"),W-M,y+15,{align:"right"});y+=19;
    para(t==null?"Evidence covers "+k+"% of the "+J.ksb.word+".":t+"% of the way through the course; evidence covers "+k+"% of the "+J.ksb.word+". "+(behind?"A bit behind where they'd want to be.":"On track."),ink);y+=2;
    tileRow([[J.ksb.met+"/"+J.ksb.total,J.ksb.word],[hm(J.hours.total),J.hours.planned?"of "+J.hours.planned+"h learning":"learning hours"],[String(J.evidence.total),"pieces of evidence"],[J.attendance?J.attendance.pct+"%":"-","attendance"]]);
    /* Since the last review */
    head("Since the last review"+(J.from?" ("+dt(J.from)+")":""));
    tileRow([[String(J.evidence.since),"new evidence"],[hm(J.hours.since),"hours logged"],[String(J.evidence.units.length),"topics worked on"]]);
    if(J.evidence.units.length)para(J.evidence.units.join(", "));
    /* Topics with strength bars */
    head("Topics");
    J.units.forEach(u=>{need(7);font(9.5,false);doc.text(txt(u.name).slice(0,60),M,y+4);font(8,false,muted);doc.text(txt(u.n?u.n+(u.n===1?" piece":" pieces"):"Not started"),M+120,y+4);
      [1,2,3].forEach(i=>{const on=i<=(LEVEL[u.level]||0);doc.setFillColor(...(on?yellow:line));const bh=2+i*1.4;doc.roundedRect(W-M-14+(i-1)*4.5,y+5-bh,3,bh,.6,.6,"F")});
      doc.setDrawColor(...line);doc.setLineWidth(.2);doc.line(M,y+6.5,W-M,y+6.5);y+=7.5});
    /* Every KSB as a coloured chip: signed off, waiting, still needed */
    head("My "+(J.ksbs.groups.length&&/^Unit/.test(J.ksbs.groups[0].name)?"criteria":J.ksb.word));
    const COL={met:[[220,243,229],[6,118,71]],wait:[[255,243,204],[122,93,0]],none:[[242,244,247],[152,162,179]]};
    J.ksbs.groups.forEach(g=>{need(12);const d=g.items.filter(x=>x.st==="met").length;font(9.5,true);doc.text(txt(g.name),M,y+4);font(8,false,muted);doc.text(txt(d+" of "+g.items.length+(J.ksbs.signoff?" signed off":" with evidence")),W-M,y+4,{align:"right"});y+=6.5;
      let x=M;g.items.forEach(it=>{font(7.5,true);const w=Math.max(9,doc.getTextWidth(txt(it.code))+4);if(x+w>W-M){x=M;y+=6.5}need(7);const c=COL[it.st];doc.setFillColor(...c[0]);doc.roundedRect(x,y,w,5,1.2,1.2,"F");doc.setTextColor(...c[1]);doc.text(txt(it.code),x+w/2,y+3.6,{align:"center"});x+=w+1.6});y+=8});
    need(6);[["met",J.ksbs.signoff?"Signed off":"Has evidence"],J.ksbs.signoff?["wait","Waiting for the assessor"]:null,["none","Still needed"]].filter(Boolean).reduce((x,[k,l])=>{const c=COL[k];doc.setFillColor(...c[0]);doc.roundedRect(x,y,4,4,1,1,"F");font(8,false,muted);doc.text(txt(l),x+5.5,y+3.2);return x+12+doc.getTextWidth(txt(l))},M);y+=8;
    head("How good the evidence is");
    tileRow([[J.quality.levels.strong+"/"+(J.quality.levels.strong+J.quality.levels.good+J.quality.levels.weak),"topics at full strength"],[J.quality.coverage==null?"-":J.quality.coverage+"%","write-ups cover the key points"],[J.quality.photos==null?"-":String(J.quality.photos),"photos per piece"]]);
    /* Targets and learning */
    const goal=(label,pct,right,done)=>{need(8);font(9.5,false);doc.text(txt(label).slice(0,70),M,y+4);bar(M+118,y+1.6,40,3,pct,done?green:yellow);font(8.5,true,muted);doc.text(txt(right),W-M,y+4,{align:"right"});y+=7};
    head("Targets");
    if(J.targets.length)J.targets.forEach(x=>goal(x.title,x.pct,x.done?"Done":x.pct+"%",x.done));else para("No targets set yet.");
    head("Learning");
    if(J.teach)goal("Teach me lessons",Math.round(J.teach.done/J.teach.total*100),J.teach.done+" of "+J.teach.total);
    J.tests.forEach(x=>goal(x.name+" (best)",x.best,x.best+"%"));
    if(J.confidence)para("Feels confident in "+J.confidence.confident+" of "+J.confidence.total+" practical areas"+(J.confidence.practise.length?"; wants more practice with "+J.confidence.practise.join(", ").toLowerCase():"")+".");
    if(!J.teach&&!J.tests.length&&!J.confidence)para("Nothing yet.");
    head("At college");
    if(J.attendance){goal("Attendance ("+J.attendance.here+" of "+J.attendance.n+(J.attendance.own?" college days, marked by me)":" sessions)"),J.attendance.pct||0,J.attendance.pct+"%")}
    J.taught.forEach(c=>{need(10);font(9.5,true);doc.text(txt(c.lesson||c.cls||"Class").slice(0,80),M,y+4);font(8,false,muted);doc.text(txt([c.date?dt(c.date+"T12:00:00"):"",c.cls,c.ksbs.join(" ")].filter(Boolean).join(" · ")).slice(0,110),M,y+8.5);y+=11});
    if(!J.attendance&&!J.taught.length)para("Nothing from college yet.");
    if(J.employer){head("From "+J.employer.who);J.employer.ratings.forEach(r=>goal(r.k,r.v*25,r.word));if(J.employer.comment)para("\u201c"+J.employer.comment+"\u201d");if(J.employer.witness)para(J.employer.witness+" witness testimon"+(J.employer.witness===1?"y":"ies"))}
    if(J.checkins){head("Check-ins with Evia");tileRow([[String(J.checkins.n),"weekly catch-ups"],[J.checkins.met+"/"+J.checkins.goals,"weekly goals met"],[(J.checkins.moods.good+J.checkins.moods.ok)+"/"+J.checkins.n,"weeks feeling OK or good"]]);if(J.checkins.latestGoal)para("This week's goal: "+J.checkins.latestGoal,ink)}
    if(J.comments){head("Their comments for the review");J.comments.answers.concat(J.comments.words).forEach(([q,v])=>{need(10);font(9,true);doc.text(txt(q),M,y+4);y+=5;para(v,ink);y+=1})}
    if(J.minutes){head("Time learning in Evia");para(hm(J.minutes/60)+" since the last review",ink)}
    if(J.future){head("Where they're heading");para(J.future.goal+(J.future.when?" ("+J.future.when+")":"")+" · "+J.future.done+" of "+J.future.steps+" steps done",ink)}
    const pages=doc.getNumberOfPages();
    for(let n=1;n<=pages;n++){doc.setPage(n);font(7.5,false,muted);doc.text(txt((J.name||"Apprentice")+" · Apprenticeship journey"),M,H-9);doc.text("Page "+n+" of "+pages,W-M,H-9,{align:"right"})}
    return doc.output("blob");
  }
  async function share(J){
    J=J||data();
    const blob=await pdf(J),name="Apprenticeship journey"+(J.name?" - "+J.name:"")+" - "+new Date().toISOString().slice(0,10)+".pdf";
    const file=typeof File==="function"?new File([blob],name,{type:"application/pdf"}):null;
    if(file&&navigator.canShare&&navigator.canShare({files:[file]}))return navigator.share({files:[file],title:"My apprenticeship journey",text:"Where I am on my apprenticeship, from Evia"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
  }
  window.eviaJourneyPack={open,share,pdf,data,journeyCard};
})();
