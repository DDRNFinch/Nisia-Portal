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
    try{const t=window.eviaTargets&&window.eviaTargets.lastReviewAt&&window.eviaTargets.lastReviewAt();if(t)return t}catch(_){}
    try{const rd=window.eviaReviewDue&&window.eviaReviewDue();if(rd&&rd.due){const d=new Date(rd.due);d.setMonth(d.getMonth()-3);if(d.getTime()<Date.now())return d.getTime()}}catch(_){}
    try{const s=Date.parse((window.eviaData.learner()||{}).start||"");if(s)return s}catch(_){}
    return Date.now()-91*DAY;
  }
  const entryTime=e=>{const t=Date.parse(e.savedAt||"");if(!isNaN(t))return t;const m=String(e.d||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?new Date(+m[3],m[2]-1,+m[1]).getTime():0};
  /* How ready: the share of the checklist that's done (things the college or employer fill in don't count). */
  function ready(){
    try{const L=checklist(),todo=L.filter(x=>x.state==="todo"),ok=L.filter(x=>x.state==="ok");
      return {pct:Math.round(ok.length/Math.max(1,ok.length+todo.length)*100),todo:todo.map(x=>x.title),commentsDone:answered(),rd:window.eviaReviewDue&&window.eviaReviewDue()};
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
      minutes:minutesSince(from),future:fut
    };
  }

  /* ---------- The learner's answers: five quick taps, kept with the reviews so Milos reads them ---------- */
  const QS=[["feelsSafe","Do you feel safe at work and at college?",["Yes","No"],"No",""],
    ["changes","Any change to your job, hours or employer?",["No","Yes"],"Yes","What’s changed?"],
    ["hsIncident","Any accident or near miss at work?",["No","Yes"],"Yes","What happened?"],
    ["supportNeeded","Do you need any extra help?",["No","Yes"],"Yes","What would help?"]];
  const live=()=>{try{const e=window.eviaNisia&&window.eviaNisia.joined();return !!(e&&e.live)}catch(_){return false}};
  const reviewsAll=()=>{try{return window.eviaData.list("reviews",{course}).map(r=>r.detail).filter(Boolean)}catch(_){return []}};
  /* The latest answers since the last review (a comments review from before counts too). */
  function latestAnswers(){
    const from=since()-DAY,said=r=>r.reflection&&Object.values(r.reflection).some(v=>String(v||"").trim());
    return reviewsAll().filter(r=>Date.parse(r.date)>=from&&said(r)).sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]||null;
  }
  const answered=()=>!!latestAnswers();
  function answers(after){
    style();
    const old=(latestAnswers()||{}).reflection||{},v=Object.assign({},old);
    if(old.support&&!old.supportNeeded)v.supportNeeded="Yes";
    const root=document.getElementById("modal-root");
    root.innerHTML='<div class="overlay pv-overlay"><section class="sheet pr-sheet pv-sheet rp-sheet" role="dialog" aria-modal="true" aria-labelledby="rp-qt"><div class="sheet-head"><div><div class="chat-kicker">PROGRESS REVIEW</div><h2 id="rp-qt">A few quick questions</h2></div><button class="close" id="rp-close" type="button" aria-label="Close">×</button></div><div class="pr-body">'+
      '<p class="rp-lead">Just tap. Your assessor reads these before your review.</p>'+
      QS.map(([k,q,opts,more,ph])=>'<div class="rp-q" data-q="'+k+'"><strong>'+esc(q)+'</strong><span class="rp-chips">'+opts.map(o=>'<button type="button" class="rp-chip'+(v[k]===o?" on":"")+'" data-v="'+esc(o)+'" aria-pressed="'+(v[k]===o)+'">'+esc(o)+'</button>').join("")+'</span>'+
        (ph?'<input class="rp-in" data-more="'+k+'" maxlength="300" placeholder="'+esc(ph)+'" value="'+esc(k==="changes"?v.changesDetail||"":k==="hsIncident"?v.hsDetail||"":v.support||"")+'"'+(v[k]===more?"":" hidden")+'>':"")+'</div>').join("")+
      '<div class="rp-q"><strong>How’s it going? <span class="rp-opt">(optional)</span></strong><input class="rp-in" id="rp-fb" maxlength="500" placeholder="A sentence is plenty" value="'+esc(v.learnerFeedback||"")+'"></div>'+
      '<button type="button" class="rp-btn primary" id="rp-save" style="width:100%;margin-top:14px">Save</button></div></section></div>';
    const done=()=>{root.innerHTML="";if(after)after()};
    root.querySelector("#rp-close").onclick=done;
    root.querySelectorAll(".rp-q[data-q]").forEach(q=>{const k=q.dataset.q,more=(QS.find(x=>x[0]===k)||[])[3];
      q.querySelectorAll(".rp-chip").forEach(b=>b.onclick=()=>{v[k]=b.dataset.v;q.querySelectorAll(".rp-chip").forEach(x=>{x.classList.toggle("on",x===b);x.setAttribute("aria-pressed",x===b)});
        const i=q.querySelector("[data-more]");if(i){i.hidden=v[k]!==more;if(!i.hidden)i.focus()}})});
    root.querySelector("#rp-save").onclick=()=>{
      const t=k=>{const i=root.querySelector('[data-more="'+k+'"]');return i&&!i.hidden?i.value.trim():""};
      const reflection={feelsSafe:v.feelsSafe||"",changes:v.changes||"",changesDetail:t("changes"),hsIncident:v.hsIncident||"",hsDetail:t("hsIncident"),
        supportNeeded:v.supportNeeded||"",support:t("supportNeeded")||(v.supportNeeded==="Yes"?"Asked for extra help":""),learnerFeedback:root.querySelector("#rp-fb").value.trim()};
      const prev=latestAnswers();
      window.eviaData.put("reviews",prev&&prev.kind==="prep"?{id:prev.id,reflection}:{id:"prep-"+Date.now(),kind:"prep",course,date:new Date().toISOString(),format:2,reflection,targets:[]});
      if(typeof showEvidenceToast==="function")showEvidenceToast("Saved for your review");
      if(window.eviaUsage&&window.eviaUsage.hit)window.eviaUsage.hit("review.answers");
      done();
    };
  }

  /* ---------- The checklist: everything for the review, each done or not since the last one ----------
     state: ok (done), todo (something the learner can do now), info (the college or employer fills it in). */
  const inChat=fn=>()=>{close();if(window.chat)window.chat({quiet:true});setTimeout(()=>{const C=window.eviaCoachFlows||{};if(C[fn])C[fn]()},160)};
  const goTo=where=>()=>{close();setTimeout(()=>{if(typeof nav==="function")nav(where)},60)};
  function checklist(){
    const p=window.eviaReviewPrep?window.eviaReviewPrep():{all:[]},A=Object.fromEntries((p.all||[]).map(x=>[x.id,x])),P=pack(),out=[];
    const add=(id,title,state,text,label,run)=>out.push({id,title,state,text,action:label?{label,run}:null});
    const st=a=>a?(a.ok?"ok":"todo"):"info";
    add("evidence","Evidence added",P.evidence.since?"ok":"todo",P.evidence.since?P.evidence.since+" since your last review"+(P.evidence.units.length?": "+P.evidence.units.slice(0,3).join(", "):""):"Nothing added since your last review","Add evidence",goTo("course"));
    if(A.where)add("where",A.where.title,st(A.where),A.where.text,"Add evidence",goTo("course"));
    if(A.quality)add("quality",A.quality.title,st(A.quality),A.quality.text,"Check my write-ups",inChat("evidenceCheck"));
    if(A.otj)add("otj",A.otj.title,st(A.otj),A.otj.text,"Log hours",inChat("hours"));
    if(A.targets)add("targets","Targets from your last review",st(A.targets),A.targets.text,"See my targets",inChat("targets"));
    if(A.tests)add("tests",A.tests.title,st(A.tests),A.tests.text,"Take a practice test",inChat("epa"));
    const R=window.eviaTeach&&window.eviaTeach.report&&window.eviaTeach.report(),sub=id=>R&&R.subjects.find(x=>x.id===id);
    const S=(()=>{try{return window.eviaStats.compute()}catch(_){return {}}})();
    [["maths","Maths"],["english","English"]].forEach(([id,name])=>{if(!S[id])return;const t=(P.tests||[]).find(x=>new RegExp(name,"i").test(x.name));
      add(id,name,t&&t.best>=70?"ok":"todo",t?"Best test "+t.best+"%"+(t.best>=70?"":" (aim for 70%)"):"No test yet","Practise "+name,()=>{close();setTimeout(()=>window.eviaTeach&&window.eviaTeach.open(id),60)})});
    if(A.conf)add("conf",A.conf.title,st(A.conf),A.conf.text,"Rate my skills",inChat("confidence"));
    const edi=sub("edi");if(edi&&edi.total)add("edi","Safeguarding, Prevent and British values",edi.done>=edi.total?"ok":"todo",edi.done+" of "+edi.total+" short lessons done","Open the lessons",()=>{close();setTimeout(()=>window.eviaTeach&&window.eviaTeach.open("edi"),60)});
    const fut=P.future;add("future","My future",fut&&fut.goal?"ok":"todo",fut&&fut.goal?fut.goal:"No goal yet: where do you want your trade to take you?",fut&&fut.goal?"":"Set my goal",()=>{close();setTimeout(()=>window.eviaFuture&&window.eviaFuture.open(),60)});
    if(live()&&P.attendance)add("attendance","College attendance",P.attendance.pct>=90?"ok":"info",P.attendance.pct+"% ("+P.attendance.here+" of "+P.attendance.n+" sessions)");
    else add("attendance","College attendance","info",live()?"Your tutor’s registers fill this in":"Your college adds this at the review");
    const emp=employerSince();add("employer","Your employer’s feedback",emp.length?"ok":"info",emp.length?emp.length+" from your employer since your last review":live()?"Your employer can add it in Paros, or at the review":"Your employer adds this at the review");
    const ans=latestAnswers();add("answers","A few quick questions",ans?"ok":"todo",ans?"Done":"Five quick taps for your assessor",ans?"Change":"Answer now",()=>answers(open));
    return out;
  }
  const employerSince=()=>{try{const f=since()-DAY;return (typeof supportingMeta==="function"?supportingMeta():[]).filter(x=>x&&x.employer&&x.course===course&&Date.parse(x.employer.at||x.addedAt)>=f)}catch(_){return []}};

  /* ---------- The page ---------- */
  const STYLE=`.rp-hero{display:flex;align-items:center;gap:16px;margin:4px 0 12px}
.rp-ring{--p:0;width:80px;height:80px;border-radius:50%;flex:none;display:grid;place-items:center;background:conic-gradient(var(--yellow,#e7b900) calc(var(--p)*1%),#eef0f3 0)}
.rp-ring b{width:62px;height:62px;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:19px;font-weight:800}
.rp-hero p{margin:0;font-size:15px;line-height:1.45;color:var(--ui-text,#344054)}
.rp-since{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13.5px;color:var(--ui-muted,#667085);margin:0 0 8px}
.rp-since input{font:inherit;padding:6px 8px;border:1px solid #d0d5dd;border-radius:10px}
.rp-list{list-style:none;margin:0 0 6px;padding:0}
.rp-list li{display:flex;gap:10px;align-items:center;padding:10px 0;border-top:1px solid var(--ui-line,#eef0f3);font-size:14.5px;line-height:1.35}
.rp-list li:first-child{border-top:0}
.rp-list li>span:nth-child(2){flex:1;min-width:0}
.rp-ic{width:24px;height:24px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:12px;font-weight:800;background:#e7f6ee;color:#067647}
.rp-list li.todo .rp-ic{background:#fff4e5;color:#b54708}.rp-list li.info .rp-ic{background:#f2f4f7;color:#667085}
.rp-list small{display:block;color:var(--ui-muted,#667085);font-size:12.5px;margin-top:1px}
.rp-do{flex:none;border:1px solid var(--ui-line,#e4e7ec);background:#fff;border-radius:12px;padding:8px 10px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;color:#172033}
.rp-acts{display:flex;flex-direction:column;gap:8px;margin:16px 0 4px}
.rp-btn{border:0;border-radius:14px;padding:13px;font-weight:700;font-size:15px;cursor:pointer;background:#f2f4f7;color:#172033}
.rp-btn.primary{background:var(--yellow,#e7b900);color:var(--ui-on-accent,#172033)}
.rp-lead{margin:0 0 12px;color:var(--ui-muted,#667085);font-size:14.5px}
.rp-q{padding:12px 0;border-top:1px solid var(--ui-line,#eef0f3)}.rp-q strong{display:block;font-size:15px;margin-bottom:8px}
.rp-opt{font-weight:400;color:var(--ui-muted,#667085)}
.rp-chips{display:flex;gap:8px}.rp-chip{flex:1;border:1.5px solid #e4e7ec;background:#fff;border-radius:12px;padding:11px;font:inherit;font-weight:700;cursor:pointer;color:#172033}
.rp-chip.on{border-color:var(--yellow,#e7b900);background:var(--soft,#fff7d6)}
.rp-in{width:100%;box-sizing:border-box;margin-top:8px;border:1px solid #d0d5dd;border-radius:12px;padding:11px 12px;font:inherit;font-size:15px}`;
  const style=()=>{if(!document.getElementById("rp-style")){const s=document.createElement("style");s.id="rp-style";s.textContent=STYLE;document.head.appendChild(s)}};
  function close(){const r=document.getElementById("modal-root");if(r)r.innerHTML=""}
  function open(){
    style();
    let L,P;try{L=checklist();P=pack()}catch(err){console.warn("Evia: prep pack",err&&err.message);return}
    const R=ready()||{pct:0,todo:[]},rd=R.rd,college=live();
    const due=rd?(rd.days<0?"Your review was due on "+rd.due.toLocaleDateString("en-GB",{day:"numeric",month:"long"})+".":rd.days===0?"Your review is today.":"Your review is on "+rd.due.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})+"."):"";
    const left=L.filter(x=>x.state==="todo").length,iso=d=>dkey(new Date(d));
    const root=document.getElementById("modal-root");
    root.innerHTML='<div class="overlay pv-overlay"><section class="sheet pr-sheet pv-sheet rp-sheet" role="dialog" aria-modal="true" aria-labelledby="rp-title"><div class="sheet-head"><div><div class="chat-kicker">PROGRESS REVIEW</div><h2 id="rp-title">My review prep</h2></div><button class="close" id="rp-close" type="button" aria-label="Close">×</button></div><div class="pr-body">'+
      '<div class="rp-hero"><span class="rp-ring" style="--p:'+R.pct+'"><b>'+R.pct+'%</b></span><p><strong>'+(!left?"You’re ready.":R.pct>=60?"Nearly there.":"Let’s get you ready.")+'</strong> '+esc(due)+(left?" "+(left===1?"1 thing":left+" things")+" you can do now.":"")+'</p></div>'+
      (college?'<p class="rp-since">Since your last review, '+esc(new Date(P.from).toLocaleDateString("en-GB",{day:"numeric",month:"long"}))+'</p>'
        :'<label class="rp-since">Your last review <input type="date" id="rp-last" value="'+iso(P.from)+'" max="'+iso(Date.now())+'"></label>')+
      '<ul class="rp-list">'+L.map((x,i)=>'<li class="'+x.state+'"><span class="rp-ic" aria-hidden="true">'+(x.state==="ok"?"✓":x.state==="todo"?"!":"–")+'</span><span><strong>'+esc(x.title)+'</strong><small>'+esc(x.text)+'</small></span>'+
        (x.action&&x.action.label&&(x.state==="todo"||x.id==="answers")?'<button type="button" class="rp-do" data-do="'+i+'">'+esc(x.state==="todo"&&x.id!=="answers"?"Do it now":x.action.label)+'</button>':"")+'</li>').join("")+'</ul>'+
      '<div class="rp-acts"><button type="button" class="rp-btn'+(college?"":" primary")+'" id="rp-share">'+(college?"Share as a PDF":"Share my review prep (PDF)")+'</button></div>'+
      '<p class="pv-note"><span aria-hidden="true">💡</span><span>'+(college?"Your assessor sees all of this in Milos. There’s nothing to send.":"Send the PDF to your assessor and employer before your review. The parts for them are left blank to fill in on the day.")+'</span></p>'+
      '</div></section></div>';
    root.querySelector("#rp-close").onclick=close;
    root.querySelector(".overlay").addEventListener("click",e=>{if(e.target.classList.contains("overlay"))close()});
    root.querySelectorAll("[data-do]").forEach(b=>b.onclick=()=>{const x=L[+b.dataset.do];if(x&&x.action&&x.action.run)x.action.run()});
    const last=root.querySelector("#rp-last");if(last)last.onchange=()=>{if(last.value&&window.eviaSetLastReview){window.eviaSetLastReview(last.value+"T12:00:00");open()}};
    root.querySelector("#rp-share").onclick=async e=>{const b=e.currentTarget;b.disabled=true;const t=b.textContent;b.textContent="Making the PDF…";
      try{await share()}catch(err){if(!err||err.name!=="AbortError")alert("That didn’t work: "+((err&&err.message)||"try again."))}finally{b.disabled=false;b.textContent=t}};
  }

  /* ---------- The PDF: what Evia knows filled in; what the college, employer and assessor add left blank ---------- */
  function loadPdf(){
    if(window.jspdf)return Promise.resolve(window.jspdf);
    return new Promise((res,rej)=>{const s=document.createElement("script");s.src="vendor/jspdf.umd.min.js";s.onload=()=>window.jspdf?res(window.jspdf):rej(new Error("The PDF maker didn’t load."));s.onerror=()=>rej(new Error("The PDF maker didn’t load."));document.head.appendChild(s)});
  }
  async function pdf(P){
    P=P||pack();
    const L=checklist(),ans=(latestAnswers()||{}).reflection||null,college=live(),en=(()=>{try{return window.eviaData.enrolment()||{}}catch(_){return {}}})();
    const T=(window.eviaTargets?window.eviaTargets.mine():[]),S=(()=>{try{return window.eviaStats.compute()}catch(_){return null}})();
    const txt=window.eviaPdfText||(x=>String(x||""));
    const {jsPDF}=await loadPdf(),doc=new jsPDF({unit:"mm",format:"a4",compress:true}),W=210,H=297,M=16,CW=W-2*M,BOTTOM=H-M-6;let y=M;
    const ink=[23,32,51],muted=[102,112,133],soft=[234,236,240];
    const need=h=>{if(y+h>BOTTOM){doc.addPage();y=M}};
    const label=t=>{need(10);doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(...muted);doc.setCharSpace(.35);doc.text(txt(t).toUpperCase(),M,y+3);doc.setCharSpace(0);y+=6};
    const head=t=>{need(16);y+=3;doc.setFont("helvetica","bold");doc.setFontSize(13);doc.setTextColor(...ink);doc.text(txt(t),M,y+4);y+=8};
    const para=(t,o)=>{o=o||{};doc.setFont("helvetica",o.bold?"bold":"normal");doc.setFontSize(o.size||10);doc.setTextColor(...(o.grey?muted:ink));
      doc.splitTextToSize(txt(t),o.w||CW).forEach(l=>{need(5);doc.text(l,o.x||M,y+3.5);y+=4.6})};
    const blank=(n,lbl)=>{for(let i=0;i<n;i++){need(9);if(lbl&&!i){doc.setFont("helvetica","normal");doc.setFontSize(9.5);doc.setTextColor(...muted);doc.text(txt(lbl),M,y+4)}doc.setDrawColor(200,205,212);doc.setLineWidth(.3);doc.line(lbl&&!i?M+doc.getTextWidth(txt(lbl))+2:M,y+6,W-M,y+6);y+=8}y+=1};
    const box=t=>{doc.setDrawColor(150,158,170);doc.setLineWidth(.3);doc.rect(t.x,t.y,3.6,3.6)};
    const dt=d=>new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
    // Header
    doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(...muted);doc.setCharSpace(.35);doc.text("EVIA · PROGRESS REVIEW",M,y+3);doc.setCharSpace(0);y+=6;
    doc.setFontSize(20);doc.setTextColor(...ink);doc.text("Progress review",M,y+7);y+=12;
    const det=[["Apprentice",P.name],["Course",P.course],["Employer",en.employer||""],["College",en.college||""],["Assessor",en.assessor||""],["Period",dt(P.from)+" to "+dt(P.to)],["Review date",""],["How",""]];
    doc.setFontSize(9.5);
    det.forEach((d,i)=>{const x=M+(i%2)*(CW/2),yy=y+Math.floor(i/2)*7;doc.setFont("helvetica","bold");doc.setTextColor(...ink);doc.text(d[0]+":",x,yy+4);const lw=doc.getTextWidth(d[0]+": ");
      if(d[1]){doc.setFont("helvetica","normal");doc.setTextColor(71,84,103);doc.text(txt(d[1]).slice(0,48),x+lw,yy+4)}else{doc.setDrawColor(200,205,212);doc.line(x+lw,yy+5,x+CW/2-6,yy+5)}});
    y+=Math.ceil(det.length/2)*7+2;doc.setDrawColor(229,188,2);doc.setLineWidth(.8);doc.line(M,y,W-M,y);y+=6;
    // 1. Progress from Evia
    head("1. Progress since the last review");
    para("Filled in by Evia from what the apprentice has done in the app.",{grey:true,size:9});y+=1;
    L.filter(x=>!["answers","attendance","employer"].includes(x.id)).forEach(x=>{need(10);
      const mark=x.state==="ok"?"Done":x.state==="todo"?"To do":"-";
      doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(...ink);doc.text(txt(x.title),M,y+3.5);
      doc.setFont("helvetica","bold");doc.setFontSize(8.5);doc.setTextColor(...(x.state==="ok"?[6,118,71]:[181,71,8]));doc.text(mark,W-M,y+3.5,{align:"right"});y+=4.6;
      para(x.text,{grey:true,size:9});y+=1.5;doc.setDrawColor(...soft);doc.setLineWidth(.2);doc.line(M,y,W-M,y);y+=2});
    if(S){y+=1;para("Learning hours: "+P.hours.since+" h since the last review, "+P.hours.total+" h in total"+(P.hours.planned?" of "+P.hours.planned+" h planned":"")+". KSBs with evidence: "+P.ksb.met+" of "+P.ksb.total+" ("+P.ksb.pct+"%), "+P.ksb.timePct+"% of the way through the course.",{size:9.5})}
    // 2. Targets
    head("2. Targets from the last review");
    if(T.length)T.forEach(t=>{let pr="";try{pr=window.eviaTargets.progress(t,window.eviaTargets.stats?window.eviaTargets.stats():S).text||""}catch(_){}
      para((t.done?"[Met] ":"[Not yet] ")+t.title+(pr?" - "+pr:""),{size:10})});
    else para("None recorded in Evia.",{grey:true});
    // 3. Apprentice
    head("3. The apprentice");
    const q=(lbl,v,detail)=>{need(8);doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(...ink);doc.text(txt(lbl),M,y+4);
      if(v){doc.setFont("helvetica","bold");doc.text(txt(v+(detail?": "+detail:"")).slice(0,70),M+108,y+4);y+=7}else{["Yes","No"].forEach((o,i)=>{const x=M+110+i*22;box({x,y:y+1});doc.setFont("helvetica","normal");doc.text(o,x+5.5,y+4)});y+=7}};
    q("Feels safe at work and at college",ans&&ans.feelsSafe);
    q("Any change to job, hours or employer",ans&&ans.changes,ans&&ans.changesDetail);
    q("Any accident or near miss at work",ans&&ans.hsIncident,ans&&ans.hsDetail);
    q("Needs extra help",ans&&(ans.supportNeeded||(ans.support?"Yes":"")),ans&&ans.support&&ans.support!=="Asked for extra help"?ans.support:"");
    if(ans&&ans.learnerFeedback){label("How it's going, in their words");para(ans.learnerFeedback)}else blank(2,"How it's going:");
    if(P.future&&P.future.goal){label("Their goal (My future)");para(P.future.goal+(P.future.when?" ("+P.future.when+")":""))}
    // 4. Attendance
    head("4. College attendance");
    const att=L.find(x=>x.id==="attendance");
    if(college&&P.attendance)para(att.text);else blank(1,"Attendance this period (college to complete):");
    // 5. Employer
    head("5. The employer");
    const emp=employerSince();if(emp.length)para("From the employer in Paros: "+emp.map(x=>x.employer.kind==="behaviours"?"behaviour ratings":"witness testimony"+(x.employer.unit?" ("+x.employer.unit+")":"")).join(", ")+".",{size:9.5});
    need(8);doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(...ink);doc.text("Off-the-job training happens in paid working hours",M,y+4);["Yes","No"].forEach((o,i)=>{const x=M+110+i*22;box({x,y:y+1});doc.text(o,x+5.5,y+4)});y+=8;
    blank(4,"Employer's comments:");
    // 6. Assessor
    head("6. The assessor");
    need(8);doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(...ink);doc.text("Overall progress",M,y+4);["On track","Slightly behind","At risk"].forEach((o,i)=>{const x=M+70+i*36;box({x,y:y+1});doc.text(o,x+5.5,y+4)});y+=8;
    need(8);doc.text("Safeguarding, Prevent and British values discussed",M,y+4);["Yes","No"].forEach((o,i)=>{const x=M+110+i*22;box({x,y:y+1});doc.text(o,x+5.5,y+4)});y+=8;
    blank(4,"Assessor's comments:");
    // 7. New targets
    head("7. New targets");
    for(let i=1;i<=3;i++){need(18);blank(1,i+". What:");blank(1,"    By when, and who helps:")}
    blank(1,"Next review date:");
    // 8. Signatures
    need(62);head("8. Signatures");
    [["Apprentice",P.name],["Employer",""],["Assessor",en.assessor||""]].forEach(([w,n])=>{need(22);doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(...ink);doc.text(w,M,y+4);y+=6;
      doc.setFont("helvetica","normal");doc.setFontSize(9.5);doc.setTextColor(...muted);[["Name",n,0],["Signature","",62],["Date","",130]].forEach(([l,v,dx])=>{doc.text(l+":",M+dx,y+4);const lw=doc.getTextWidth(l+": ");if(v){doc.setTextColor(...ink);doc.text(txt(v).slice(0,26),M+dx+lw,y+4);doc.setTextColor(...muted)}doc.setDrawColor(200,205,212);doc.line(M+dx+lw,y+5,M+dx+(dx===130?CW-130:60),y+5)});y+=10});
    // Footer
    const pages=doc.getNumberOfPages();
    for(let n=1;n<=pages;n++){doc.setPage(n);doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(...muted);
      doc.text(txt((P.name||"Apprentice")+" · Progress review"),M,H-9);doc.text("Page "+n+" of "+pages,W-M,H-9,{align:"right"});doc.text("Prepared in Evia "+dt(Date.now()),W/2,H-9,{align:"center"})}
    return doc.output("blob");
  }
  async function share(P){
    P=P||pack();
    const blob=await pdf(P),name="Progress review"+(P.name?" - "+P.name:"")+" - "+dkey(new Date())+".pdf";
    const file=typeof File==="function"?new File([blob],name,{type:"application/pdf"}):null;
    if(file&&navigator.canShare&&navigator.canShare({files:[file]}))return navigator.share({files:[file],title:"My progress review",text:"My progress review prep from Evia"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
  }

  window.eviaPrepPack={open,pack,ready,minutesSince,share,pdf,checklist,answers,answered};
})();
