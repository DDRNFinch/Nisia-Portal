/* Evia7 review prep pack: everything Evia knows about the learner since their last progress review, in one place, so
   they arrive ready and their assessor sees the same. "Get ready for my review" (evia-coach.js) works through what
   needs doing; this is the result:
     Ready        a percentage: each area Evia checks looks good, and their comments are in
     Since last   evidence added, KSBs covered, learning hours (against the course's minimum), attendance, tests,
                  Teach me, confidence, targets, time spent learning in Evia, and their future goals (future.js)
     Share        a PDF of it, sent from the learner's own phone (email, WhatsApp…) for an assessor who doesn't use
                  Milos. Connected to a college, Milos already has it all (the summary in nisia.js), so nothing to send.
   Time in Evia: minutes the app was open and in use (a tap or key in the last 90 seconds), kept by day on this phone.
   The learner sees it here first, so nothing is counted behind their back.
   window.eviaPrepPack: open(), pack(), ready(), minutesSince(t), share() */
(function(){
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const DAY=864e5,AKEY="evia7-active-mins";
  const dkey=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const readMins=()=>{try{return JSON.parse(localStorage.getItem(AKEY)||"{}")||{}}catch(_){return {}}};

  /* ---------- Time in Evia ---------- */
  let lastUse=Date.now();
  ["pointerdown","keydown","touchstart","wheel"].forEach(e=>addEventListener(e,()=>{lastUse=Date.now()},{passive:true,capture:true}));
  setInterval(()=>{
    if(document.visibilityState!=="visible"||Date.now()-lastUse>90000)return;
    const m=readMins(),k=dkey(new Date()),old=dkey(new Date(Date.now()-400*DAY));
    m[k]=(m[k]||0)+1;Object.keys(m).forEach(d=>{if(d<old)delete m[d]});
    try{localStorage.setItem(AKEY,JSON.stringify(m))}catch(_){}
  },60000);
  const minutesSince=t=>{const from=dkey(new Date(t));return Object.entries(readMins()).filter(([d])=>d>=from).reduce((n,[,v])=>n+(Number(v)||0),0)};
  const hm=m=>window.eviaHM?window.eviaHM(m/60):m+"m";

  /* ---------- What's in the pack ---------- */
  /* From the last review: the one the college recorded, else 3 months before the next one is due (the same reckoning as
     eviaReviewDue in reviews.js), else the start of the course, else 3 months ago. */
  function since(){
    try{const en=window.eviaData.enrolment&&window.eviaData.enrolment();if(en&&en.lastReview&&Date.parse(en.lastReview))return Date.parse(en.lastReview)}catch(_){}
    try{const rd=window.eviaReviewDue&&window.eviaReviewDue();if(rd&&rd.due){const d=new Date(rd.due);d.setMonth(d.getMonth()-3);if(d.getTime()<Date.now())return d.getTime()}}catch(_){}
    try{const s=Date.parse((window.eviaData.learner()||{}).start||"");if(s)return s}catch(_){}
    return Date.now()-91*DAY;
  }
  const entryTime=e=>{const t=Date.parse(e.savedAt||"");if(!isNaN(t))return t;const m=String(e.d||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?new Date(+m[3],m[2]-1,+m[1]).getTime():0};
  function ready(){
    try{const p=window.eviaReviewPrep&&window.eviaReviewPrep();if(!p)return null;
      const areas=(p.all||[]).filter(x=>x.id!=="review"),ok=areas.filter(x=>x.ok).length+(p.commentsDone?1:0);
      return {pct:Math.round(ok/Math.max(1,areas.length+1)*100),areas,commentsDone:!!p.commentsDone,rd:p.rd,todo:areas.filter(x=>!x.ok).map(x=>x.title).concat(p.commentsDone?[]:["Your comments"])};
    }catch(_){return null}
  }
  function pack(){
    const S=window.eviaStats.compute(),a=S.a,from=since(),now=Date.now();
    const newer=(a.entries||[]).filter(e=>entryTime(e)>=from);
    const H=typeof hours!=="undefined"&&Array.isArray(hours)?hours:[];
    const hoursSince=H.filter(x=>Number(x.on||x.createdAt)>=from).reduce((n,x)=>n+Number(x.n||0),0);
    let planned=null;try{const en=window.eviaData.enrolment&&window.eviaData.enrolment();planned=Number(en&&en.plannedOtjHours)||null}catch(_){}
    const AT=window.eviaAttendance&&window.eviaAttendance.data?window.eviaAttendance.data():null;
    const tg=window.eviaTargets?window.eviaTargets.mine():[];
    const conf=S.confidence||{},sc=conf.scores||[];
    const fut=window.eviaFuture&&window.eviaFuture.summary?window.eviaFuture.summary():null;
    return {
      from,to:now,name:(window.eviaData.learner()||{}).name||"",course:(()=>{try{return typeof C!=="undefined"&&C[course]?C[course].name:""}catch(_){return ""}})(),
      evidence:{since:newer.length,units:[...new Set(newer.map(e=>e.u).filter(Boolean))],total:(a.entries||[]).length},
      ksb:{met:a.met,total:a.total,pct:a.ksbPct,timePct:a.timePct},
      hours:{since:Math.round(hoursSince*10)/10,total:Math.round((S.otjTotal||0)*10)/10,planned},
      attendance:AT&&AT.n?{pct:AT.pct,here:AT.here,n:AT.n,absent:AT.none}:null,
      tests:(S.tests||[]).map(t=>({name:t.name,count:t.count,best:t.best,latest:t.latest?t.latest.pct:null})),
      teach:S.teach?{done:S.teach.done||0,total:S.teach.total||0,avg:S.teach.avg}:null,
      confidence:sc.length?{confident:(conf.confident||[]).length,total:sc.length,practise:(conf.practise||[]).slice(0,4)}:null,
      targets:{done:tg.filter(t=>t.done).length,total:tg.length,open:tg.filter(t=>!t.done).map(t=>t.title).slice(0,5)},
      minutes:minutesSince(from),future:fut,ready:ready()
    };
  }

  /* ---------- The screen ---------- */
  const STYLE=`.rp-hero{display:flex;align-items:center;gap:16px;margin:4px 0 14px}
.rp-ring{--p:0;width:86px;height:86px;border-radius:50%;flex:none;display:grid;place-items:center;background:conic-gradient(var(--yellow,#e7b900) calc(var(--p)*1%),#eef0f3 0)}
.rp-ring b{width:68px;height:68px;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:21px;font-weight:800}
.rp-hero p{margin:0;font-size:15px;line-height:1.45;color:var(--ui-text,#344054)}
.rp-list{list-style:none;margin:0 0 6px;padding:0}
.rp-list li{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-top:1px solid var(--ui-line,#eef0f3);font-size:14.5px;line-height:1.4}
.rp-list li:first-child{border-top:0}
.rp-ic{width:22px;height:22px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:12px;font-weight:800;background:#e7f6ee;color:#067647}
.rp-list li.no .rp-ic{background:#fff4e5;color:#b54708}
.rp-list small{display:block;color:var(--ui-muted,#667085);font-size:12.5px}
.rp-h{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--ui-muted,#667085);font-weight:800;margin:18px 0 6px}
.rp-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.rp-cell{padding:11px 12px;border-radius:14px;background:#f6f7f9}
.rp-cell span{display:block;font-size:12px;color:var(--ui-muted,#667085)}.rp-cell strong{display:block;font-size:17px;margin-top:2px}.rp-cell small{display:block;font-size:12px;color:var(--ui-muted,#667085);margin-top:2px}
.rp-acts{display:flex;flex-direction:column;gap:8px;margin:18px 0 4px}
.rp-btn{border:0;border-radius:14px;padding:13px;font-weight:700;font-size:15px;cursor:pointer;background:#f2f4f7;color:#172033}
.rp-btn.primary{background:var(--yellow,#e7b900);color:var(--ui-on-accent,#172033)}`;
  function close(){const r=document.getElementById("modal-root");if(r)r.innerHTML=""}
  function open(){
    if(!document.getElementById("rp-style")){const s=document.createElement("style");s.id="rp-style";s.textContent=STYLE;document.head.appendChild(s)}
    let P;try{P=pack()}catch(err){console.warn("Evia: prep pack",err&&err.message);return}
    const R=P.ready||{pct:0,areas:[],commentsDone:false,todo:[]},rd=R.rd,college=!!(window.eviaNisia&&window.eviaNisia.joined()&&window.eviaNisia.joined().live);
    const due=rd?(rd.days<0?"Your review was due on "+rd.due.toLocaleDateString("en-GB",{day:"numeric",month:"long"})+".":rd.days===0?"Your review is today.":"Your review is on "+rd.due.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})+"."):"";
    const cell=(l,v,s)=>'<div class="rp-cell"><span>'+esc(l)+'</span><strong>'+esc(v)+'</strong>'+(s?'<small>'+esc(s)+'</small>':"")+'</div>';
    const fromTxt=new Date(P.from).toLocaleDateString("en-GB",{day:"numeric",month:"long"});
    const root=document.getElementById("modal-root");
    root.innerHTML='<div class="overlay pv-overlay"><section class="sheet pr-sheet pv-sheet rp-sheet" role="dialog" aria-modal="true" aria-labelledby="rp-title"><div class="sheet-head"><div><div class="chat-kicker">PROGRESS REVIEW</div><h2 id="rp-title">My review prep</h2></div><button class="close" id="rp-close" type="button" aria-label="Close">×</button></div><div class="pr-body">'+
      '<div class="rp-hero"><span class="rp-ring" style="--p:'+R.pct+'"><b>'+R.pct+'%</b></span><p><strong>'+(R.pct>=100?"You’re ready.":"Ready so far.")+'</strong> '+esc(due)+(R.todo.length?" "+(R.todo.length===1?"1 thing":R.todo.length+" things")+" still to do.":"")+'</p></div>'+
      '<ul class="rp-list">'+R.areas.map(x=>'<li class="'+(x.ok?"ok":"no")+'"><span class="rp-ic" aria-hidden="true">'+(x.ok?"✓":"!")+'</span><span><strong>'+esc(x.title)+'</strong><small>'+esc(x.text)+'</small></span></li>').join("")+
        '<li class="'+(R.commentsDone?"ok":"no")+'"><span class="rp-ic" aria-hidden="true">'+(R.commentsDone?"✓":"!")+'</span><span><strong>Your comments</strong><small>'+(R.commentsDone?"Done: your assessor can read them":"How it’s going, how things are at work, any help you need")+'</small></span></li></ul>'+
      '<div class="rp-h">Since '+esc(fromTxt)+'</div><div class="rp-grid">'+
        cell("Evidence added",P.evidence.since,P.evidence.units.slice(0,3).join(", "))+
        cell("KSBs with evidence",P.ksb.met+" of "+P.ksb.total,P.ksb.pct+"% · "+P.ksb.timePct+"% of the way through")+
        cell("Learning hours",hm(Math.round(P.hours.since*60)),"Total "+P.hours.total+"h"+(P.hours.planned?" of "+P.hours.planned+"h":""))+
        (P.attendance?cell("Attendance",P.attendance.pct+"%",P.attendance.here+" of "+P.attendance.n+" sessions"):"")+
        (P.teach&&P.teach.total?cell("Teach me",P.teach.done+" of "+P.teach.total+" lessons",P.teach.avg!=null?"Average "+P.teach.avg+"%":""):"")+
        (P.tests.length?cell("Tests",P.tests.reduce((n,t)=>n+t.count,0)+" taken","Best "+Math.max(...P.tests.map(t=>t.best||0))+"%"):"")+
        (P.confidence?cell("Confidence",P.confidence.confident+" of "+P.confidence.total+" skills",P.confidence.practise.length?"Practising: "+P.confidence.practise.slice(0,2).join(", "):""):"")+
        cell("Targets",P.targets.done+" of "+P.targets.total+" done",P.targets.open[0]?"Next: "+P.targets.open[0]:"")+
        cell("Time learning in Evia",hm(P.minutes),"Counted on this phone")+
        (P.future&&P.future.goal?cell("My future",P.future.goal,P.future.steps?P.future.steps+" steps":""):"")+
      '</div>'+
      '<div class="rp-acts">'+(R.pct<100?'<button type="button" class="rp-btn primary" id="rp-go">Get ready now</button>':"")+
        '<button type="button" class="rp-btn'+(R.pct>=100?" primary":"")+'" id="rp-share">Share my prep (PDF)</button></div>'+
      '<p class="pv-note"><span aria-hidden="true">💡</span><span>'+(college?"Your assessor sees all of this in Milos before your review. Share it only if they ask for a copy.":"Send it to your assessor before your review, from your own phone: email, WhatsApp or however you normally talk.")+'</span></p>'+
      '</div></section></div>';
    root.querySelector("#rp-close").onclick=close;
    root.querySelector(".overlay").addEventListener("click",e=>{if(e.target.classList.contains("overlay"))close()});
    const go=root.querySelector("#rp-go");if(go)go.onclick=()=>{close();if(window.chat)window.chat({quiet:true});setTimeout(()=>{const C=window.eviaCoachFlows;if(C&&C.prepare)C.prepare()},150)};
    root.querySelector("#rp-share").onclick=async e=>{const b=e.currentTarget;b.disabled=true;const t=b.textContent;b.textContent="Making the PDF…";
      try{await share(P)}catch(err){if(!err||err.name!=="AbortError")alert("That didn’t work: "+((err&&err.message)||"try again."))}finally{b.disabled=false;b.textContent=t}};
  }

  /* ---------- The PDF, shared from the learner's own phone ---------- */
  function loadPdf(){
    if(window.jspdf)return Promise.resolve(window.jspdf);
    return new Promise((res,rej)=>{const s=document.createElement("script");s.src="vendor/jspdf.umd.min.js";s.onload=()=>window.jspdf?res(window.jspdf):rej(new Error("The PDF maker didn’t load."));s.onerror=()=>rej(new Error("The PDF maker didn’t load."));document.head.appendChild(s)});
  }
  /* The PDF reads like the review already written: Evia's summary in plain sentences, then each part of the review
     with the facts behind it, the learner's own comments, what the employer said, and space to sign. Everything comes
     from what's in Evia; the assessor checks it and adds their own words on the day. */
  async function pdf(P){
    P=P||pack();
    const {jsPDF}=await loadPdf(),doc=new jsPDF({unit:"mm",format:"a4"}),W=210,H=297,M=16,CW=W-2*M;let y=0,page=1;
    const D=window.eviaData,L=(D.learner&&D.learner())||{},EN=(D.enrolment&&D.enrolment())||{};
    const first=String(P.name||L.name||"The learner").split(" ")[0];
    const fmt=t=>new Date(t).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
    const short=t=>new Date(t).toLocaleDateString("en-GB",{day:"numeric",month:"short"});
    const INK=[23,32,51],MUT=[102,112,133],LINE=[228,231,236],SOFT=[246,247,249],Y=[231,185,0];
    const col=(c,f)=>f?doc.setFillColor(...c):doc.setTextColor(...c);
    const foot=()=>{doc.setFont("helvetica","normal");doc.setFontSize(8);col(MUT);doc.text("Prepared by Evia from "+first+"’s records on "+fmt(Date.now())+". The assessor checks it and adds their own comments at the review.",M,H-9);doc.text("Page "+page,W-M,H-9,{align:"right"})};
    const room=h=>{if(y+h>H-18){foot();doc.addPage();page++;y=18}};
    const text=(t,o)=>{o=o||{};doc.setFont("helvetica",o.bold?"bold":"normal");doc.setFontSize(o.size||10);col(o.c||INK);
      const lines=doc.splitTextToSize(String(t),o.w||CW),lh=(o.size||10)*0.46;lines.forEach(l=>{room(lh+1);doc.text(l,o.x||M,y);y+=lh});y+=o.gap==null?1.6:o.gap};
    const section=t=>{room(18);y+=4;col(Y,true);doc.rect(M,y-3.6,1.6,5,"F");doc.setFont("helvetica","bold");doc.setFontSize(12.5);col(INK);doc.text(t,M+4,y);y+=3;doc.setDrawColor(...LINE);doc.line(M,y,W-M,y);y+=5};
    /* A small table: [label, value] rows, or columns with a header. */
    const table=(head,rows,widths)=>{
      const ws=widths||head.map(()=>CW/head.length),draw=(cells,bold,fill)=>{
        doc.setFont("helvetica",bold?"bold":"normal");doc.setFontSize(9);
        const split=cells.map((c,i)=>doc.splitTextToSize(String(c==null?"":c),ws[i]-4)),h=Math.max(...split.map(s=>s.length))*4.2+3;
        room(h);if(fill){col(SOFT,true);doc.rect(M,y-3.6,CW,h,"F")}
        let x=M;split.forEach((s,i)=>{col(bold?MUT:INK);s.forEach((l,j)=>doc.text(l,x+2,y+j*4.2));x+=ws[i]});
        y+=h;doc.setDrawColor(...LINE);doc.line(M,y-3.4,W-M,y-3.4)};
      if(head)draw(head,true,true);rows.forEach(r=>draw(r,false,false));y+=3};
    const bar=(pct,label)=>{room(9);col(MUT);doc.setFont("helvetica","normal");doc.setFontSize(9);doc.text(label,M,y);y+=2;col([238,240,243],true);doc.roundedRect(M,y,CW,3,1.5,1.5,"F");col(Y,true);doc.roundedRect(M,y,Math.max(3,CW*Math.min(100,pct)/100),3,1.5,1.5,"F");y+=8};

    /* ---- The top ---- */
    col(INK,true);doc.rect(0,0,W,38,"F");
    doc.setFont("helvetica","bold");doc.setFontSize(20);doc.setTextColor(255,255,255);doc.text("Progress review",M,16);
    doc.setFont("helvetica","normal");doc.setFontSize(10.5);doc.setTextColor(220,224,230);
    doc.text([P.name||L.name,P.course].filter(Boolean).join("  ·  "),M,24);
    doc.text("Covering "+fmt(P.from)+" to "+fmt(P.to),M,30);
    doc.setFontSize(8.5);doc.setTextColor(231,185,0);doc.text("PREPARED BY EVIA",W-M,16,{align:"right"});
    y=48;
    const rd=window.eviaReviewDue&&window.eviaReviewDue();
    table(null,[["Learner",P.name||L.name||""],["Apprenticeship",P.course||""],["College",EN.college||""],["Employer",EN.employer||L.employer||""],
      ["Assessor",EN.assessor||""],["Started",EN.start||L.start?fmt((EN.start||L.start)+"T12:00:00"):""],["Planned end",EN.end||L.end?fmt((EN.end||L.end)+"T12:00:00"):""],
      ["Review date",rd&&rd.due?fmt(rd.due):"To be agreed"]].filter(r=>r[1]),[45,CW-45]);

    /* ---- Evia's summary ---- */
    const behind=P.ksb.timePct!=null&&P.ksb.timePct-P.ksb.pct>10,aimWk=P.hours.planned&&EN.start&&EN.end?P.hours.planned/((Date.parse(EN.end)-Date.parse(EN.start))/(7*DAY)):6;
    const weeks=Math.max(1,(P.to-P.from)/(7*DAY)),perWk=P.hours.since/weeks;
    const R=P.ready||{pct:0,todo:[]};
    section("Summary");
    text(first+" has added "+(P.evidence.since?P.evidence.since+" piece"+(P.evidence.since===1?"":"s")+" of evidence"+(P.evidence.units.length?" ("+P.evidence.units.slice(0,4).join(", ")+")":""):"no new evidence")+" since the last review. "+
      (P.ksb.total?P.ksb.pct+"% of the course’s KSBs now have evidence ("+P.ksb.met+" of "+P.ksb.total+")"+(P.ksb.timePct!=null?", "+P.ksb.timePct+"% of the way through the apprenticeship, so "+(behind?"a little behind where they should be.":"on track."):"."):"")+" "+
      "Off-the-job learning averaged about "+hm(Math.round(perWk*60))+" a week (aim "+hm(Math.round(aimWk*60))+"), "+(perWk>=aimWk*0.9?"which is on track.":"which is below the aim.")+
      (P.attendance?" College attendance is "+P.attendance.pct+"%.":"")+
      (P.targets.total?" "+P.targets.done+" of "+P.targets.total+" targets from the last review are done.":""),{size:10.5,gap:3});
    bar(P.ksb.pct,"KSBs with evidence: "+P.ksb.pct+"%"+(P.ksb.timePct!=null?" (time through the course: "+P.ksb.timePct+"%)":""));
    const CL=window.eviaReviewChecklist?window.eviaReviewChecklist():null,todo=CL?CL.items.filter(x=>!x.ok).map(x=>x.title):R.todo||[];
    if(CL)text("Ready for the review: "+CL.done+" of "+CL.items.length+(todo.length?". Still to do: "+todo.join(", ")+".":". Everything’s in."),{c:MUT,size:9.5});
    else if(todo.length)text("Still to do before the review: "+todo.join(", ")+".",{c:MUT,size:9.5});

    /* ---- Evidence ---- */
    section("Evidence and the standard");
    const us=typeof data==="function"?(data().u||[]):[],ev=typeof evidence!=="undefined"?evidence:[];
    const LV={strong:"Strong",good:"Good",weak:"Weak"};
    table(["Topic","Evidence","Strength","Since last review"],us.map(u=>{const all=ev.filter(e=>e.c===course&&e.u===u[0]&&!e.induction),nw=all.filter(e=>entryTime(e)>=P.from).length,lv=typeof unitStrengthForCourse==="function"?unitStrengthForCourse(u[0]):null;
      return [u[0],all.length||"–",lv?LV[lv]:"Not started",nw?"+"+nw:""]}),[CW*0.46,CW*0.16,CW*0.18,CW*0.2]);

    /* ---- Learning hours ---- */
    section("Off-the-job learning");
    text("Since the last review: "+hm(Math.round(P.hours.since*60))+" logged, about "+hm(Math.round(perWk*60))+" a week. In total: "+P.hours.total+"h"+(P.hours.planned?" of the "+P.hours.planned+"h planned":"")+".");
    const H2=(typeof hours!=="undefined"&&Array.isArray(hours)?hours:[]).filter(x=>Number(x.on||x.createdAt)>=P.from).sort((a,b)=>Number(b.on||b.createdAt)-Number(a.on||a.createdAt));
    if(H2.length)table(["Date","Time","What"],H2.slice(0,12).map(x=>[short(Number(x.on||x.createdAt)),hm(Math.round(Number(x.n||0)*60)),String(x.description||x.t||"").slice(0,120)]),[CW*0.16,CW*0.14,CW*0.7]);
    if(H2.length>12)text("And "+(H2.length-12)+" more entries in Evia’s learning log.",{c:MUT,size:9});
    if(P.attendance){section("College attendance");text(P.attendance.pct+"% attendance: "+P.attendance.here+" of "+P.attendance.n+" sessions"+(P.attendance.absent?", "+P.attendance.absent+" missed":"")+".")}

    /* ---- Targets ---- */
    section("Targets from the last review");
    const tg=window.eviaTargets?window.eviaTargets.mine():[];
    if(tg.length){let S=null;try{S=window.eviaStats.compute()}catch(_){}
      table(["Target","Due","Progress"],tg.map(t=>{let p=0;try{p=window.eviaTargets.progress(t,S).pct}catch(_){}return [t.title,t.due?short(t.due+"T12:00:00"):"",t.done?"Done":Math.round(p*100)+"%"]}),[CW*0.62,CW*0.18,CW*0.2])}
    else text("No targets were set at the last review.",{c:MUT});

    /* ---- Skills and knowledge ---- */
    section("Skills and knowledge");
    if(P.confidence)text("Confidence check: confident in "+P.confidence.confident+" of "+P.confidence.total+" skills"+(P.confidence.practise.length?"; wants more practice with "+P.confidence.practise.join(", ")+".":"."));
    else text("Confidence check: not done yet.",{c:MUT});
    if(P.tests.length)table(["Test","Taken","Best","Latest"],P.tests.map(t=>[t.name,t.count,t.best+"%",t.latest!=null?t.latest+"%":""]),[CW*0.46,CW*0.18,CW*0.18,CW*0.18]);
    if(P.teach&&P.teach.total)text("Teach me lessons: "+P.teach.done+" of "+P.teach.total+" done"+(P.teach.avg!=null?", average score "+P.teach.avg+"%":"")+".");

    /* ---- The employer ---- */
    const EM=window.eviaEmployer&&window.eviaEmployer.get();
    if(EM){section("From the employer");
      const BEH=["","Needs support","Developing","Good","Excellent"],r=(EM.ratings||[])[0];
      if(r){text((EM.who||"The employer")+" rated "+first+"’s behaviours on "+fmt(r.created_at)+":",{gap:2});
        table(["Behaviour","Rating"],Object.entries(r.ratings||{}).sort().map(([k,v])=>[k,BEH[v]||v]),[CW*0.7,CW*0.3]);
        if(r.comment)text("“"+r.comment+"”",{c:MUT})}
      (EM.witness||[]).filter(w=>Date.parse(w.at)>=P.from).slice(0,3).forEach(w=>text("Witness testimony"+(w.unit?" ("+w.unit+")":"")+": “"+String(w.statement||"").slice(0,400)+"”",{c:MUT}));
    }

    /* ---- The learner's own words ---- */
    section(first+"’s comments");
    const C=window.eviaComments&&window.eviaComments.latest(),c=C&&C.reflection||{};
    if(C){table(null,[["Feels safe at work and college",c.feelsSafe],["Knows who to tell if worried",c.knowsReporting],["Changes at work",c.changes+(c.changesDetail?": "+c.changesDetail:"")],
        ["Accidents or safety worries",c.hsIncident+(c.hsDetail?": "+c.hsDetail:"")],["Training time in paid hours",c.otjHappening]].filter(r=>r[1]&&r[1]!=="undefined"),[CW*0.5,CW*0.5]);
      [["How it’s going",c.learnerFeedback],["Help that would make a difference",c.support],["After the apprenticeship",c.nextSteps]].filter(x=>x[1]).forEach(x=>{text(x[0],{bold:true,size:9.5,gap:1});text(x[1],{gap:3})})}
    else text(first+" hasn’t added comments yet.",{c:MUT});
    if(P.future&&P.future.goal){text("Their goal: "+P.future.goal+(P.future.list&&P.future.list.length?". Next steps: "+P.future.list.slice(0,3).join("; ")+".":"."),{gap:3})}

    /* ---- To agree on the day ---- */
    section("Agreed at the review");
    text("New targets, and anything else agreed:",{c:MUT,size:9.5,gap:2});
    room(40);doc.setDrawColor(...LINE);for(let i=0;i<5;i++){doc.line(M,y+i*7,W-M,y+i*7)}y+=38;
    section("Signatures");
    room(30);const third=CW/3;["Learner","Employer","Assessor"].forEach((who,i)=>{const x=M+i*third;doc.setFont("helvetica","bold");doc.setFontSize(9);col(MUT);doc.text(who,x,y);doc.setDrawColor(...LINE);doc.line(x,y+14,x+third-6,y+14);doc.setFont("helvetica","normal");doc.text("Signature and date",x,y+18)});y+=24;
    foot();
    return doc.output("blob");
  }
  async function share(P){
    P=P||pack();
    const blob=await pdf(P),name="Review prep"+(P.name?" - "+P.name:"")+" - "+dkey(new Date())+".pdf";
    const file=typeof File==="function"?new File([blob],name,{type:"application/pdf"}):null;
    if(file&&navigator.canShare&&navigator.canShare({files:[file]}))return navigator.share({files:[file],title:"My review prep",text:"My progress review prep from Evia"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
  }

  window.eviaPrepPack={open,pack,ready,minutesSince,share,pdf};
})();
