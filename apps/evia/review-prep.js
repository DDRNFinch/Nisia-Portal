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
  async function pdf(P){
    P=P||pack();
    const {jsPDF}=await loadPdf(),doc=new jsPDF({unit:"mm",format:"a4"}),W=210,M=18;let y=20;
    const line=(t,o)=>{o=o||{};doc.setFont("helvetica",o.bold?"bold":"normal");doc.setFontSize(o.size||11);doc.setTextColor(o.grey?110:23,o.grey?118:32,o.grey?132:51);
      doc.splitTextToSize(String(t),W-2*M).forEach(l=>{if(y>280){doc.addPage();y=20}doc.text(l,M,y);y+=(o.size||11)*0.48});y+=o.gap==null?1.5:o.gap};
    const R=P.ready||{pct:0,todo:[]};
    line("Progress review prep",{bold:true,size:20,gap:2});
    line([P.name,P.course].filter(Boolean).join(" · "),{grey:true});
    line("From "+new Date(P.from).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})+" to "+new Date(P.to).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}),{grey:true,gap:5});
    line("Ready: "+R.pct+"%"+(R.todo.length?" · Still to do: "+R.todo.join(", "):""),{bold:true,size:13,gap:5});
    const row=(l,v)=>line(l+": "+v);
    line("Since the last review",{bold:true,size:13});
    row("Evidence added",P.evidence.since+(P.evidence.units.length?" ("+P.evidence.units.join(", ")+")":""));
    row("KSBs with evidence",P.ksb.met+" of "+P.ksb.total+" ("+P.ksb.pct+"%), "+P.ksb.timePct+"% of the way through the course");
    row("Learning hours",hm(Math.round(P.hours.since*60))+" since; "+P.hours.total+"h in total"+(P.hours.planned?" of "+P.hours.planned+"h":""));
    if(P.attendance)row("College attendance",P.attendance.pct+"% ("+P.attendance.here+" of "+P.attendance.n+" sessions"+(P.attendance.absent?", "+P.attendance.absent+" absent":"")+")");
    if(P.teach&&P.teach.total)row("Teach me lessons",P.teach.done+" of "+P.teach.total+(P.teach.avg!=null?", average "+P.teach.avg+"%":""));
    P.tests.forEach(t=>row(t.name,t.count+" taken, best "+t.best+"%"+(t.latest!=null?", latest "+t.latest+"%":"")));
    if(P.confidence)row("Confidence",P.confidence.confident+" of "+P.confidence.total+" skills confident"+(P.confidence.practise.length?"; practising "+P.confidence.practise.join(", "):""));
    row("Targets",P.targets.done+" of "+P.targets.total+" done"+(P.targets.open.length?"; still open: "+P.targets.open.join("; "):""));
    row("Time learning in Evia",hm(P.minutes));
    if(P.future&&P.future.goal){y+=3;line("My future",{bold:true,size:13});line(P.future.goal);(P.future.list||[]).forEach(s=>line("• "+s))}
    y+=4;line("Made in Evia on "+new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})+". The figures are Evia’s own, from what was added to the app.",{grey:true,size:9});
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
