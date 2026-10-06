/* Evia7 My progress: the progress review at the top, then where the learner is, as animated charts. Each card opens a
   deep dive with the detail and a short note on how to improve it, and has its own way in underneath (log hours, a
   confidence check, a college task…). Everything is worked out on the device from data the app already keeps. */
(function(){
  const DAY=864e5,WEEK=7*DAY,OTJ_WEEK_GOAL=6;
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
  const readJson=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||"null");return v??f}catch(_){return f}};
  const nvqOn=()=>!!(window.eviaNvq&&window.eviaNvq.on());
  const term=()=>window.eviaTerm?window.eviaTerm():{one:"KSB",many:"KSBs",Many:"KSBs"};
  const reduced=()=>window.eviaAccessibility?window.eviaAccessibility.reducedMotion():matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const weekStart=t=>{const d=new Date(t);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getTime()};
  const dayStart=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()};
  const entryTime=e=>{const t=Date.parse(e.savedAt||"");if(!isNaN(t))return t;const m=String(e.d||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?new Date(+m[3],m[2]-1,+m[1]).getTime():0};
  const testPct=t=>typeof t.pct==="number"?t.pct:(t.total?Math.round((t.score||0)/t.total*100):0);
  const shortDate=t=>new Date(t).toLocaleDateString("en-GB",{day:"numeric",month:"short"});
  const longDate=t=>new Date(t).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
  /* Hours as a learner reads them: 1h:30m, never 1.5 (app.js). */
  const hm=h=>window.eviaHM(h);
  const hmBig=h=>{const m=Math.round((Number(h)||0)*60),H=Math.floor(m/60),M=m%60;return H?'<b class="pv-num" data-to="'+H+'">'+H+'</b><small>h</small>'+(M?'<small>:</small><b>'+String(M).padStart(2,"0")+'</b><small>m</small>':""):'<b>'+M+'</b><small>m</small>'};
  const num=(n,suffix)=>'<b class="pv-num" data-to="'+n+'">'+n+'</b>'+(suffix?'<small>'+suffix+'</small>':"");
  const CHEV='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
  const BADGE='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/></svg>';
  const LEVEL=["Need more training","Know the basics","Quite confident","Mastered"];

  /* ---------- Charts: plain SVG, drawn at rest; CSS plays them in when the card scrolls into view ---------- */
  /* Timeline: the evidence bar fills; the marker is where you are in the course. */
  function timeline(timePct,ksbPct,big){
    const h=big?14:10;
    return '<div class="pv-timeline'+(big?" big":"")+'" role="img" aria-label="'+(timePct!=null?timePct+"% of the way through the course, ":"")+ksbPct+"% of "+term().many+' with evidence">'+
      '<div class="pv-tl-track" style="height:'+h+'px"><i class="pv-tl-fill pv-grow-x" style="width:'+ksbPct+'%"></i></div>'+
      (timePct!=null?'<div class="pv-tl-mark pv-fade'+(timePct<15?" at-start":timePct>85?" at-end":"")+'" style="left:'+clamp(timePct,0,100)+'%"><span>Time</span></div>':"")+
      '<div class="pv-tl-ends"><span>Start</span><span>End</span></div></div>';
  }
  /* Ring: stroke drawn round from 12 o'clock. */
  /* pct in the full colour; soft (optional) is a lighter arc after it: evidence waiting for the assessor. */
  function ring(pct,size,stroke,inner,soft){
    const r=(size-stroke)/2,c=2*Math.PI*r,v=clamp(pct,0,100)/100*c,w=clamp(pct+(soft||0),0,100)/100*c;
    return '<span class="pv-ring" style="width:'+size+'px;height:'+size+'px"><svg viewBox="0 0 '+size+' '+size+'" aria-hidden="true"><circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" class="pv-ring-track" stroke-width="'+stroke+'"/>'+
      (w>v?'<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" class="pv-ring-fill pv-ring-soft pv-draw" stroke-width="'+stroke+'" style="--len:'+c.toFixed(1)+';--v:'+w.toFixed(1)+'" transform="rotate(-90 '+size/2+' '+size/2+')"/>':"")+(v>0?'<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" class="pv-ring-fill pv-draw" stroke-width="'+stroke+'" style="--len:'+c.toFixed(1)+';--v:'+v.toFixed(1)+'" transform="rotate(-90 '+size/2+' '+size/2+')"/>':"")+'</svg>'+(inner!=null?'<span class="pv-ring-label">'+inner+'</span>':"")+'</span>';
  }
  /* Columns from one baseline, 4px rounded tops, capped width, optional goal line. */
  function columns(values,labels,max,opts){
    opts=opts||{};
    const W=300,H=opts.h||96,pad=18,n=values.length,slot=W/n,bw=Math.min(24,slot*.62),top=6;
    const y=v=>H-pad-(clamp(v,0,max)/max)*(H-pad-top);
    const bars=values.map((v,i)=>{
      const x=i*slot+(slot-bw)/2,yy=y(v),bh=H-pad-yy;
      return bh>0?'<path class="pv-col pv-grow-y" style="--d:'+(i*45)+'ms;transform-origin:'+(x+bw/2)+'px '+(H-pad)+'px" d="M'+x+','+(H-pad)+'V'+(yy+Math.min(4,bh))+'q0,-4 4,-4h'+(bw-8)+'q4,0 4,4V'+(H-pad)+'Z"'+(opts.highlight===i?' data-hi="1"':"")+'/>':"";
    }).join("");
    const goal=opts.goal!=null?'<line class="pv-goal" x1="0" x2="'+W+'" y1="'+y(opts.goal)+'" y2="'+y(opts.goal)+'"/><text class="pv-goal-label" x="0" y="'+(y(opts.goal)-4)+'" text-anchor="start">'+esc(opts.goalLabel||"")+'</text>':"";
    const labs=labels.map((l,i)=>l?'<text class="pv-axis'+(opts.highlight===i?" on":"")+(opts.future!=null&&opts.future>=0&&i>opts.future?" future":"")+'" x="'+(i*slot+slot/2)+'" y="'+(H-4)+'" text-anchor="middle">'+esc(l)+'</text>':"").join("");
    const val=opts.valueAt!=null&&opts.valueAt>=0?'<text class="pv-end-label pv-fade" x="'+(opts.valueAt*slot+slot/2)+'" y="'+(y(values[opts.valueAt])-6)+'" text-anchor="middle">'+values[opts.valueAt]+'</text>':"";
    return '<svg class="pv-cols" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(opts.aria||"")+'"><line class="pv-base" x1="0" x2="'+W+'" y1="'+(H-pad)+'" y2="'+(H-pad)+'"/>'+goal+bars+labs+val+'</svg>';
  }
  /* Line of scores over time, 0–100, with the last value labelled at the end. */
  function line(values,opts){
    opts=opts||{};
    const W=300,H=opts.h||70,pad=8,n=values.length;
    if(!n)return"";
    const x=i=>n===1?W/2:pad+i*(W-pad*2-34)/(n-1),y=v=>H-pad-(clamp(v,0,100)/100)*(H-pad*2);
    const pts=values.map((v,i)=>x(i).toFixed(1)+","+y(v).toFixed(1));
    const last=values[n-1];
    return '<svg class="pv-line" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(opts.aria||"Scores over time")+'">'+
      '<line class="pv-base" x1="0" x2="'+W+'" y1="'+y(0)+'" y2="'+y(0)+'"/><line class="pv-grid" x1="0" x2="'+W+'" y1="'+y(80)+'" y2="'+y(80)+'"/>'+
      (n>1?'<polyline class="pv-stroke pv-draw-line" points="'+pts.join(" ")+'" pathLength="1"/>':"")+
      '<circle class="pv-dot pv-pop" cx="'+x(n-1)+'" cy="'+y(last)+'" r="4.5"/>'+
      '<text class="pv-end-label pv-fade" x="'+(x(n-1)+9)+'" y="'+(y(last)+4)+'">'+last+'%</text></svg>';
  }
  /* Spider chart of confidence: now (accent) and last time (grey outline). */
  function radar(areas,now,prev,size){
    const n=areas.length;if(n<3)return"";
    const big=size>200,S=size||180,c=S/2,R=S/2-(big?30:10),padX=big?78:0,padY=big?26:0;
    const pt=(i,v)=>{const a=-Math.PI/2+i*2*Math.PI/n,r=R*v/4;return [c+r*Math.cos(a),c+r*Math.sin(a)]};
    const poly=vals=>vals.map((v,i)=>pt(i,v||0).map(z=>z.toFixed(1)).join(",")).join(" ");
    const rings=[1,2,3,4].map(l=>'<polygon class="pv-radar-grid" points="'+poly(areas.map(()=>l))+'"/>').join("");
    const spokes=areas.map((_,i)=>{const [x,y]=pt(i,4);return '<line class="pv-radar-grid" x1="'+c+'" y1="'+c+'" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'"/>'}).join("");
    /* Long skill names wrap onto two lines instead of being cut off. */
    const wrap=t=>{if(t.length<=13)return[t];const w=t.split(" ");let a="",i=0;while(i<w.length&&(a+" "+w[i]).trim().length<=13){a=(a+" "+w[i]).trim();i++}if(!a){a=w[0];i=1}let b=w.slice(i).join(" ");if(b.length>14)b=b.slice(0,13)+"…";return b?[a,b]:[a]};
    const labels=big?areas.map((a,i)=>{const [x,y]=pt(i,4.75),lines=wrap(a),anchor=Math.abs(x-c)<8?"middle":x>c?"start":"end",dy=y<c-8?-(lines.length-1)*12:y>c+8?0:-(lines.length-1)*6;return '<text class="pv-axis pv-radar-label" x="'+x.toFixed(1)+'" y="'+(y+dy).toFixed(1)+'" text-anchor="'+anchor+'" dominant-baseline="middle">'+lines.map((l,n)=>'<tspan x="'+x.toFixed(1)+'" dy="'+(n?12:0)+'">'+esc(l)+'</tspan>').join("")+'</text>'}).join(""):"";
    return '<svg class="pv-radar" viewBox="'+(-padX)+' '+(-padY)+' '+(S+padX*2)+' '+(S+padY*2)+'" role="img" aria-label="Confidence in each skill">'+rings+spokes+
      (prev?'<polygon class="pv-radar-prev" points="'+poly(prev)+'"/>':"")+
      '<g class="pv-radar-now pv-scale" style="transform-origin:'+c+'px '+c+'px"><polygon points="'+poly(now)+'"/>'+now.map((v,i)=>{const [x,y]=pt(i,v||0);return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="3.5"/>'}).join("")+'</g>'+labels+'</svg>';
  }
  /* Activity by month: one bar for each month of the year, J to D, this month highlighted and labelled. */
  function monthCounts(counts,year){
    const out=Array(12).fill(0);counts.forEach((v,t)=>{const d=new Date(t);if(d.getFullYear()===year)out[d.getMonth()]+=v});return out;
  }
  function yearBars(counts,year,h){
    const now=new Date(),vals=monthCounts(counts,year),cur=year===now.getFullYear()?now.getMonth():-1;
    return columns(vals,"JFMAMJJASOND".split(""),Math.max(4,...vals)*1.15,{h:h||104,aria:"Evidence, hours and files added each month in "+year,highlight:cur,valueAt:cur,future:cur});
  }
  /* Calendar grid: one square per day, darker for busier days. Columns are weeks, Monday at the top. */
  function calendar(counts,weeks){
    const today=dayStart(Date.now()),start=weekStart(today)-(weeks-1)*WEEK,cells=[];
    for(let w=0;w<weeks;w++)for(let d=0;d<7;d++){
      const t=start+w*WEEK+d*DAY;if(t>today){cells.push('<i class="pv-cal-cell future"></i>');continue}
      const n=counts.get(t)||0,lvl=n===0?0:n===1?1:n===2?2:3;
      cells.push('<i class="pv-cal-cell l'+lvl+' pv-fade" style="--d:'+(w*25)+'ms" title="'+esc(shortDate(t)+": "+(n?n+" thing"+(n===1?"":"s")+" added":"nothing added"))+'"></i>');
    }
    return '<div class="pv-cal" style="grid-template-columns:repeat('+weeks+',1fr)" role="img" aria-label="Days you added evidence or hours over the last '+weeks+' weeks">'+cells.join("")+'</div>'+
      '<div class="pv-cal-key"><span>Less</span><i class="pv-cal-cell l0"></i><i class="pv-cal-cell l1"></i><i class="pv-cal-cell l2"></i><i class="pv-cal-cell l3"></i><span>More</span></div>';
  }
  /* Dial: a half circle from weak to strong. */
  function dial(pct){
    const r=70,c=Math.PI*r,v=clamp(pct,0,100)/100*c;
    return '<svg class="pv-dial" viewBox="0 0 180 120" role="img" aria-label="'+pct+'% of the key points covered"><path class="pv-dial-track" d="M20,94 A70,70 0 0 1 160,94"/>'+(v>0?'<path class="pv-dial-fill pv-draw" style="--len:'+c.toFixed(1)+';--v:'+v.toFixed(1)+'" d="M20,94 A70,70 0 0 1 160,94"/>':"")+
      '<text class="pv-axis" x="20" y="117" text-anchor="middle">Weak</text><text class="pv-axis" x="160" y="117" text-anchor="middle">Strong</text></svg>';
  }
  const bar=(pct,cls,d)=>'<span class="pv-bar'+(cls?" "+cls:"")+'"><i class="pv-grow-x" style="width:'+clamp(Math.round(pct),0,100)+'%;--d:'+(d||0)+'ms"></i></span>';

  /* ---------- Data ---------- */
  function gather(){
    const S=window.eviaStats.compute(),a=S.a;
    const gap=a.timePct==null?null:a.timePct-a.ksbPct;
    const verdict=gap==null?null:a.timePct<5&&a.ksbPct<5?{cls:"ontrack",text:"Just getting started",icon:"✓"}:gap>10?{cls:"behind",text:"A little behind",icon:"!"}:gap<-5?{cls:"ahead",text:"Ahead of schedule",icon:"↑"}:{cls:"ontrack",text:"On track",icon:"✓"};
    /* Off-the-job: the last 8 weeks, Monday to Sunday. */
    const thisWeek=weekStart(Date.now()),otjWeeks=[];
    for(let i=7;i>=0;i--){const ws=thisWeek-i*WEEK;otjWeeks.push({start:ws,h:hours.filter(x=>{const t=Number(x.on||x.createdAt);return t>=ws&&t<ws+WEEK}).reduce((n,x)=>n+Number(x.n||0),0)})}
    /* Activity by day: evidence, hours and supporting files. */
    const counts=new Map(),add=t=>{if(t>0){const d=dayStart(t);counts.set(d,(counts.get(d)||0)+1)}};
    a.entries.forEach(e=>add(entryTime(e)));hours.forEach(x=>add(Number(x.createdAt)));
    try{supportingMeta().filter(x=>x.course===course).forEach(x=>add(Date.parse(x.createdAt||x.addedAt)||Number(x.createdAt)))}catch(_){}
    const tests=window.eviaData.list("tests").filter(t=>t.course===course).sort((x,y)=>Date.parse(x.takenAt)-Date.parse(y.takenAt));
    const sessions=window.eviaData.list("confidence").filter(x=>x&&x.course===course&&Array.isArray(x.scores)&&x.scores.length);
    return {S,a,verdict,otjWeeks,counts,tests,sessions};
  }

  /* ---------- Cards ---------- */
  /* Each section's ways in, under its card: [label, what it does, primary?]. */
  const inChat=run=>()=>{if(window.chat)window.chat({quiet:true});setTimeout(()=>{const f=run();if(typeof f==="function")f()},120)};
  const coach=name=>inChat(()=>{const C=window.eviaCoachFlows||{};if(C[name])C[name]()});
  const kit=name=>inChat(()=>{const k=window.eviaChatKit;if(k&&k[name])k[name]()});
  const ACTS={
    review:[["Get ready for my review",coach("prepare"),1],["My review",inChat(()=>window.eviaChatReview&&window.eviaChatReview())],["Past reviews",()=>window.openSavedReviews&&window.openSavedReviews()]],
    where:[["Go to My course",()=>nav("course")]],
    ksb:[["Add evidence",()=>{let q=null;try{q=window.eviaChatKit.analyse().quickest}catch(_){}if(q&&window.openUnit)window.openUnit(q.index);else nav("course")},1]],
    otj:[["Log hours",coach("hours"),1],["Learning logs",()=>window.eviaOpenLearningLogs&&window.eviaOpenLearningLogs()]],
    tests:[[()=>nvqOn()?"Knowledge tests":"EPA mocks",coach("epa"),1]],
    conf:[["Confidence check",coach("confidence"),1],["Find a college task",kit("taskFromMenu")]],
    quality:[["Check my evidence",coach("evidenceCheck"),1]],
    targets:[["Show my targets",coach("targets"),1]],
    teach:[["Open Teach me",()=>nav("teach"),1]]
  };
  /* The ways in sit at the bottom of the section's deep dive; the sheet closes before each one runs. */
  function addActs(id){
    const body=document.querySelector("#modal-root .pv-sheet .pr-body");if(!body||!ACTS[id]||body.querySelector(".pv-deep-acts"))return;
    body.insertAdjacentHTML("beforeend",'<div class="pv-deep-acts">'+ACTS[id].map((a,i)=>'<button type="button" class="pv-act'+(a[2]?" on":"")+'" data-act="'+i+'">'+esc(typeof a[0]==="function"?a[0]():a[0])+'</button>').join("")+'</div>');
    body.querySelectorAll(".pv-deep-acts [data-act]").forEach(b=>b.onclick=()=>{const a=ACTS[id][+b.dataset.act];document.getElementById("modal-root").innerHTML="";a[1]()});
  }
  const openDeep=id=>{deep(id,gather());addActs(id)};
  /* ---------- Attendance: the percentage, and a calendar of every day ---------- */
  const ATT_KEY=[["here","Here"],["late","Late"],["holiday","Holiday"],["ill","Ill"],["reason","Other reason"],["none","Absent, no reason"],["booked","Booked off"],["coming","Class coming up"]];
  const dkey=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  function markKind(m){
    if(m.status==="present")return m.late?"late":"here";
    const why=String(m.reason||"");
    if(m.kind==="holiday"||/holiday/i.test(why))return "holiday";
    if(m.kind==="ill"||/\bill\b|sick/i.test(why))return "ill";
    return why||m.kind?"reason":"none";
  }
  function attendanceData(){
    const N=window.eviaNisia;if(!N||!N.attendance||!N.joined||!N.joined()||!N.joined().live)return null;
    const list=N.attendance()||[],marks=list.map(m=>Object.assign({},m,{k:markKind(m)})),n=marks.length,here=marks.filter(m=>m.k==="here"||m.k==="late").length,t=dkey(new Date());
    return {marks,n,here,late:marks.filter(m=>m.k==="late").length,why:marks.filter(m=>["holiday","ill","reason"].includes(m.k)).length,none:marks.filter(m=>m.k==="none").length,
      pct:n?Math.round(here/n*100):null,booked:N.absences?N.absences():[],coming:(N.sessions?N.sessions():[]).filter(x=>x.session_date>=t&&!x.checked_in_at&&x.status!=="finished")};
  }
  function attendanceSheet(){
    const AT=attendanceData();if(!AT)return;
    const first=AT.marks.length?new Date(AT.marks[0].date+"T12:00:00"):new Date(),now=new Date();
    const minM=first.getFullYear()*12+first.getMonth(),maxM=now.getFullYear()*12+now.getMonth()+1;let cur=now.getFullYear()*12+now.getMonth();
    const el=sheet("MY PROGRESS","Attendance",
      '<div class="pv-deep-hero">'+(AT.pct==null?"–":num(AT.pct,"%"))+'<span>'+(AT.n?"at college · "+AT.here+" of "+AT.n+" sessions":"No college registers yet")+'</span></div>'+
      '<div class="pv-stats">'+stat("Here",AT.here-AT.late)+stat("Late",AT.late)+stat("Off, with a reason",AT.why)+stat("Missed, no reason",AT.none)+'</div>'+
      '<div class="pv-acal" id="pv-acal"></div><p class="pv-acal-day" id="pv-acal-day" aria-live="polite">Tap a day to see what happened.</p>'+
      '<div class="pv-acal-key">'+ATT_KEY.map(([k,t])=>'<span><i class="pv-a-'+k+'"></i>'+t+'</span>').join("")+'</div>'+
      (AT.none?note("Missed a class? If there was a reason, tell your tutor. You can book days off ahead in Evia’s chat: “Can’t make college?”."):""));
    const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],LABEL=Object.fromEntries(ATT_KEY);
    const draw=()=>{
      const y=Math.floor(cur/12),m=cur%12,start=new Date(y,m,1),days=new Date(y,m+1,0).getDate(),lead=(start.getDay()+6)%7,today=dkey(new Date());
      const byDay={};
      AT.marks.forEach(x=>{(byDay[x.date]=byDay[x.date]||{marks:[]}).marks.push(x)});
      AT.booked.forEach(a=>{for(let d=new Date(a.starts_on+"T12:00:00");dkey(d)<=a.ends_on;d.setDate(d.getDate()+1)){const k=dkey(d);(byDay[k]=byDay[k]||{marks:[]}).booked=a}});
      AT.coming.forEach(x=>{(byDay[x.session_date]=byDay[x.session_date]||{marks:[]}).coming=x});
      let cells="";for(let i=0;i<lead;i++)cells+='<span class="pv-acal-blank"></span>';
      for(let d=1;d<=days;d++){
        const k=dkey(new Date(y,m,d)),o=byDay[k],c=o?(o.marks.length?(o.marks.find(x=>x.k==="none")||o.marks[0]).k:o.booked?"booked":o.coming?"coming":""):"";
        cells+='<button type="button" class="pv-acal-d'+(c?" pv-a-"+c:"")+(k===today?" pv-today":"")+'" data-day="'+k+'" aria-label="'+esc(new Date(k+"T12:00:00").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})+(c?": "+LABEL[c]:""))+'">'+d+'</button>';
      }
      const box=el.querySelector("#pv-acal");
      box.innerHTML='<div class="pv-acal-head"><button type="button" class="pv-acal-nav" data-m="-1" aria-label="Previous month"'+(cur<=minM?" disabled":"")+'>‹</button><strong>'+start.toLocaleDateString("en-GB",{month:"long",year:"numeric"})+'</strong><button type="button" class="pv-acal-nav" data-m="1" aria-label="Next month"'+(cur>=maxM?" disabled":"")+'>›</button></div>'+
        '<div class="pv-acal-grid">'+DAYS.map(x=>'<span class="pv-acal-dow">'+x+'</span>').join("")+cells+'</div>';
      box.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{cur+=+b.dataset.m;draw()});
      box.querySelectorAll("[data-day]").forEach(b=>b.onclick=()=>{
        box.querySelectorAll(".pv-picked").forEach(x=>x.classList.remove("pv-picked"));b.classList.add("pv-picked");
        const k=b.dataset.day,o=byDay[k],when=new Date(k+"T12:00:00").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
        const lines=o?o.marks.map(x=>esc(x.class)+": <strong>"+esc(LABEL[x.k])+"</strong>"+(x.k==="here"||x.k==="late"?(x.minutes?" · "+Math.floor(x.minutes/60)+"h"+(x.minutes%60?" "+(x.minutes%60)+"m":""):""):x.reason&&x.reason.toLowerCase()!==LABEL[x.k].toLowerCase()?" · "+esc(x.reason):"")):[];
        if(o&&o.booked&&!o.marks.length)lines.push("<strong>Booked off</strong> · "+esc(o.booked.reason));
        if(o&&o.coming&&!o.marks.length)lines.push(esc(o.coming.class)+(o.coming.starts_at?" at "+new Date(o.coming.starts_at).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}):"")+": <strong>class coming up</strong>");
        el.querySelector("#pv-acal-day").innerHTML="<span>"+esc(when)+"</span>"+(lines.length?lines.join("<br>"):"No class that day.");
      });
    };
    draw();
  }
  const BEH=["","Needs support","Developing","Good","Excellent"],WIT=["","Getting there","Competent","Excellent"];
  const behName=k=>{try{const o=window.EVIA_KSB_OFFICIAL||{},c=typeof course==="string"?course:"",m=o[c]||o[c==="trowel3"?"bricklayer":c]||{};return m[k]||""}catch(_){return ""}};
  window.eviaOpenEmployer=()=>{if(typeof nav==="function")nav("learning");setTimeout(()=>openDeep("employer"),250)};
  const card=(id,title,big,sub,chart,extra)=>cardBtn(id,title,big,sub,chart,extra);
  const cardBtn=(id,title,big,sub,chart,extra)=>'<button type="button" class="pv-card'+(extra||"")+'" data-pv="'+id+'" id="pv-'+id+'"><span class="pv-head"><span class="pv-title">'+title+'</span><span class="pv-chev">'+CHEV+'</span></span><span class="pv-big">'+big+'</span>'+(sub?'<span class="pv-sub">'+sub+'</span>':"")+(chart?'<span class="pv-chart">'+chart+'</span>':"")+'</button>';
  const empty=text=>'<span class="pv-empty">'+esc(text)+'</span>';
  /* Medals from Teach me, each popping in after the last: bronze, then silver, then gold. */
  const medalRow=m=>'<span class="pv-medals">'+["bronze","silver","gold"].map((k,i)=>'<span class="tg-medal medal-'+k+' pv-medal pv-pop" style="--d:'+(i*350)+'ms" aria-label="'+m[k]+' '+k+'"><i aria-hidden="true"></i>'+num(m[k])+'</span>').join("")+'</span>';

  function cards(D){
    const {S,a,verdict}=D,T=term(),out=[];
    // Progress review: when the next one is due, and the last one
    const rd=window.eviaReviewDue&&window.eviaReviewDue(),revs=window.eviaGetReviews?window.eviaGetReviews():[],lastR=revs[0];
    out.push(card("review","Progress review",rd?(rd.days<0?'<span class="pv-due late">Overdue</span>':rd.days===0?'<span class="pv-due soon">Due today</span>':num(rd.days)+'<small> day'+(rd.days===1?"":"s")+'</small>'):"–",
      rd?(rd.days<0?"It was due "+shortDate(rd.due):"until your next review · "+longDate(rd.due)):"Add your start date in Profile",
      '<span class="pv-rev-meta">'+(lastR?"Last review "+shortDate(lastR.date)+" · "+revs.length+" in all":"No reviews yet")+'</span>',rd&&rd.days<=14?" pv-alert":""));
    // Where you are
    out.push(card("where","Where you are",num(a.ksbPct,"%"),'of '+esc(T.many)+(a.signoff?' signed off':' have evidence')+(verdict?' · <em class="pv-verdict '+verdict.cls+'"><i aria-hidden="true">'+verdict.icon+'</i>'+verdict.text+'</em>':""),timeline(a.timePct,a.ksbPct),""));
    // KSB rings, or units for an NVQ
    if(nvqOn()){
      out.push(card("ksb","Your units",num(a.met)+'<small> / '+a.total+'</small>',"criteria with evidence",'<span class="pv-rings">'+ring(a.ksbPct,84,9,a.ksbPct+"%")+'</span>'));
    }else{
      const all=allK(),g=[["K","Knowledge"],["S","Skills"],["B","Behaviours"]].map(([l,n])=>{const items=all.filter(x=>x[0].startsWith(l)),d=items.filter(x=>a.evidenced.has(x[0])).length,w=items.filter(x=>a.possible&&a.possible.has(x[0])).length;return {n,d,t:items.length,p:items.length?Math.round(d/items.length*100):0,q:items.length?Math.round(w/items.length*100):0}}).filter(x=>x.t);
      const waiting=a.signoff&&a.possible?all.filter(x=>a.possible.has(x[0])).length:0;
      out.push(card("ksb",esc(T.Many),num(a.met)+'<small> / '+a.total+'</small>',a.signoff?"signed off"+(waiting?" · "+waiting+" waiting":""):"with evidence",'<span class="pv-rings">'+g.map(x=>'<span class="pv-ring-item">'+ring(x.p,74,8,x.p+"%",a.signoff?x.q:0)+'<small>'+x.n+'</small></span>').join("")+'</span>'));
    }
    // Learning hours
    const wk=D.otjWeeks;
    out.push(card("otj","Learning hours",hmBig(S.otjTotal),S.otjWeek?"+"+hm(S.otjWeek)+" this week":"Nothing logged this week yet",
      wk.some(w=>w.h>0)?columns(wk.map(w=>w.h),wk.map((w,i)=>i===wk.length-1?"This wk":i%2===1?shortDate(w.start):""),Math.max(OTJ_WEEK_GOAL*1.4,...wk.map(w=>w.h)),{goal:OTJ_WEEK_GOAL,goalLabel:OTJ_WEEK_GOAL+" h a week",aria:"Learning hours for each of the last 8 weeks",highlight:wk.length-1}):empty("Your weekly hours will chart here.")));
    // Tests
    const tests=D.tests,last=tests[tests.length-1];
    out.push(card("tests",nvqOn()?"Knowledge tests":"Tests",last?num(testPct(last),"%"):"–",last?"last score · best "+S.bestTest+"% · "+tests.length+" taken":"No tests taken yet",
      tests.length?line(tests.slice(-10).map(testPct),{aria:"Your last "+Math.min(10,tests.length)+" test scores"}):empty("Your scores will chart here")));
    // Confidence
    const ses=D.sessions,cur=S.confidence.scores;
    if(cur.length>=3){
      const areas=cur.map(x=>x.area),prev=ses.length>1?areas.map(ar=>{const s=ses[ses.length-2].scores.find(x=>x.area===ar);return s?s.score:0}):null;
      const good=cur.filter(x=>x.score>=3).length;
      out.push(card("conf","Confidence",num(good)+'<small> / '+cur.length+'</small>',"skills you feel confident in",'<span class="pv-radar-wrap">'+radar(areas,cur.map(x=>x.score),prev,170)+(prev?'<span class="pv-legend"><span><i class="now"></i>Now</span><span><i class="prev"></i>Last time</span></span>':"")+'</span>'));
    }else out.push(card("conf","Confidence","–","Not rated yet",empty("Rate your skills to see your shape")));
    // Activity
    const yr=new Date().getFullYear(),mc=monthCounts(D.counts,yr),thisMonth=mc[new Date().getMonth()],yearTotal=mc.reduce((n,v)=>n+v,0);
    out.push(card("act","Activity",num(thisMonth)+'<small> this month</small>',"things added in "+new Date().toLocaleDateString("en-GB",{month:"long"})+" · "+yearTotal+" in "+yr+(S.streak?" · "+S.streak+"-week streak":""),yearTotal?'<span class="pv-year">'+yr+'</span>'+yearBars(D.counts,yr):empty("Each month you add evidence or hours shows as a bar here.")));
    // Evidence quality
    out.push(card("quality","Evidence quality",S.coverage==null?"–":num(S.coverage,"%"),S.coverage==null?"Submit a unit with a write-up first":"of the key points covered"+(S.avgPhotos!=null?" · "+(Math.round(S.avgPhotos*10)/10)+(Math.round(S.avgPhotos*10)/10===1?" photo":" photos")+" a pack":""),S.coverage==null?empty("Evia checks each write-up once it’s saved"):dial(S.coverage)));
    if(window.eviaStrength)out.push('<button type="button" class="pv-guide" data-pv="guide" id="pv-guide"><span class="pv-guide-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2"/><path d="M8 7h6M8 11h6"/></svg></span><span><strong>How to build a strong portfolio</strong><small>What makes evidence Weak, Good or Strong</small></span><span class="pv-guide-chev" aria-hidden="true">›</span></button>');
    // Targets
    const T2=window.eviaTargets,tg=T2?T2.mine():[];
    if(T2&&tg.length){
      const done=tg.filter(t=>t.done).length;
      out.push(card("targets","Targets",num(done)+'<small> / '+tg.length+'</small>',"done",'<span class="pv-rows">'+tg.slice(0,3).map((t,i)=>{const p=T2.progress(t,S);return '<span class="pv-row"><span class="pv-row-top"><span>'+esc(t.title)+'</span><strong>'+Math.round(p.pct*100)+'%</strong></span>'+bar(p.pct*100,p.pct>=1?"good":"",i*80)+'</span>'}).join("")+'</span>'));
    }else out.push(card("targets","Targets","–","Set at your next progress review",""));
    // Teach me: average score, areas completed, and the medals popping in bronze, then silver, then gold.
    const TR=window.eviaTeach&&window.eviaTeach.report?window.eviaTeach.report():null;
    if(TR&&TR.total)out.push(card("teach","Teach me",TR.avg==null?"–":num(TR.avg,"%"),TR.avg==null?"Finish a lesson to get a score":"average score · "+TR.areasDone+" of "+TR.areasTotal+" areas completed",medalRow(TR.medals)));
    // Attendance at college (the tutor's registers in Symi), for learners connected to a college.
    const AT=attendanceData();
    if(AT)out.push(card("attendance","Attendance",AT.pct==null?"–":num(AT.pct,"%"),
      AT.n?AT.here+" of "+AT.n+" session"+(AT.n===1?"":"s")+(AT.late?" · "+AT.late+" late":"")+(AT.none?" · "+AT.none+" missed with no reason":""):"No college registers yet",
      AT.n?'<span class="pv-adots" aria-hidden="true">'+AT.marks.slice(-14).map((m,i)=>'<i class="pv-a-'+m.k+'" style="--d:'+(i*45)+'ms"></i>').join("")+'</span>':empty("Your tutor’s registers show here"),AT.none?" pv-warn":""));
    // From the employer (Paros): how they rate the behaviours, and their witness testimonies.
    const EM=window.eviaEmployer&&window.eviaEmployer.get();
    if(EM){
      const b=(EM.ratings||[])[0],n=(EM.witness||[]).length,fresh=window.eviaEmployer.unseen();
      const avg=b?Object.values(b.ratings||{}).reduce((t,v)=>t+Number(v),0)/Math.max(1,Object.keys(b.ratings||{}).length):null;
      out.push(card("employer","From your employer",b?BEH[Math.round(avg)]||"–":num(n),
        (fresh?"New · ":"")+(b?"behaviours overall"+(n?" · "+n+" witness testimon"+(n===1?"y":"ies"):""):"witness testimon"+(n===1?"y":"ies")),
        b?'<span class="pv-rows">'+Object.entries(b.ratings||{}).sort().slice(0,3).map(([k,v],i)=>'<span class="pv-row"><span class="pv-row-top"><span>'+esc(k+" "+behName(k))+'</span><strong>'+esc(BEH[v]||v)+'</strong></span>'+bar(v/4*100,v<=2?"low":v>=4?"good":"",i*80)+'</span>').join("")+'</span>':"",fresh?" pv-new":""));
    }
    // Achievements
    const ach=window.eviaStats.achievements(S),earned=ach.list.filter(x=>x.earned);
    out.push(card("ach","Achievements",num(ach.count)+'<small> / '+ach.list.length+'</small>',ach.fresh.length?"New one earned":"earned",earned.length?'<span class="pv-badges">'+earned.slice(0,6).map((x,i)=>'<span class="pv-badge pv-pop" style="--d:'+(i*70)+'ms" title="'+esc(x.label)+'">'+BADGE+'</span>').join("")+(earned.length>6?'<span class="pv-badge more">+'+(earned.length-6)+'</span>':"")+'</span>':empty("Your first one isn’t far away")));
    return out;
  }

  /* ---------- Deep dives ---------- */
  function sheet(kicker,title,body){
    const root=document.getElementById("modal-root");
    root.innerHTML='<div class="overlay pv-overlay"><section class="sheet pr-sheet pv-sheet" role="dialog" aria-modal="true" aria-labelledby="pv-sheet-title"><div class="sheet-head"><div><div class="chat-kicker">'+kicker+'</div><h2 id="pv-sheet-title">'+title+'</h2></div><button class="close" id="pv-close" type="button" aria-label="Close">×</button></div><div class="pr-body">'+body+'</div></section></div>';
    const close=()=>{const o=root.querySelector(".overlay");if(!o||reduced()){root.innerHTML="";return}o.classList.add("pv-closing");setTimeout(()=>{if(root.contains(o))root.innerHTML=""},180)};
    document.getElementById("pv-close").onclick=close;
    root.querySelector(".overlay").addEventListener("click",e=>{if(e.target.classList.contains("overlay"))close()});
    const h=document.getElementById("pv-sheet-title");h.setAttribute("tabindex","-1");h.focus({preventScroll:true});
    const el=root.querySelector(".pv-sheet");play(el,true);
    return el;
  }
  const note=text=>'<p class="pv-note"><span aria-hidden="true">💡</span><span>'+text+'</span></p>';
  const stat=(label,value)=>'<div class="pv-stat"><span>'+label+'</span><strong>'+value+'</strong></div>';

  function deep(id,D){
    if(id==="guide"){window.eviaStrength.guide();return}
    if(id==="attendance"){attendanceSheet();return}
    if(id==="employer"){
      const EM=window.eviaEmployer&&window.eviaEmployer.get();if(!EM)return;
      window.eviaEmployer.markSeen();
      const b=(EM.ratings||[])[0],prev=(EM.ratings||[])[1];
      sheet("FROM YOUR EMPLOYER",esc(EM.who||"Your employer"),
        (b?'<h3 class="pv-h3">Your behaviours</h3><p class="pv-sub">Rated '+esc(longDate(b.created_at))+(prev?', compared with '+esc(longDate(prev.created_at)):"")+'</p>'+
          '<div class="pv-rows">'+Object.entries(b.ratings||{}).sort().map(([k,v],i)=>{const was=prev&&prev.ratings?Number(prev.ratings[k]):null,ch=was?v-was:0;
            return '<span class="pv-row"><span class="pv-row-top"><span><strong>'+esc(k)+'</strong> '+esc(behName(k))+'</span><strong>'+(ch>0?'<em class="pv-up">↑</em> ':ch<0?'<em class="pv-down">↓</em> ':"")+esc(BEH[v]||v)+'</strong></span>'+bar(v/4*100,v<=2?"low":v>=4?"good":"",i*60)+'</span>'}).join("")+'</div>'+
          (b.comment?'<p class="pv-quote">“'+esc(b.comment)+'”</p>':""):"")+
        ((EM.witness||[]).length?'<h3 class="pv-h3">Witness testimonies</h3>'+EM.witness.map(w=>'<div class="pv-witness"><div class="pv-row-top"><strong>'+esc(w.unit||"Witness testimony")+'</strong><span>'+esc(WIT[w.rating]||"")+'</span></div><p class="pv-quote">“'+esc(w.statement)+'”</p><small class="pv-row-note">'+esc(longDate(w.at))+((w.ksbs||[]).length?" · "+esc(w.ksbs.join(", ")):"")+'</small></div>').join("")+
          note("They’re in your <strong>Supporting evidence</strong> too. Your assessor checks them and signs off the KSBs they show."):""));
      return;
    }
    if(id==="review"){
      const rd=window.eviaReviewDue&&window.eviaReviewDue(),revs=window.eviaGetReviews?window.eviaGetReviews():[];
      sheet("MY PROGRESS","Progress review",
        '<div class="pv-deep-hero">'+(rd?(rd.days<0?'<span class="pv-due late">Overdue</span>':rd.days===0?'<span class="pv-due soon">Due today</span>':num(rd.days)+'<small> day'+(rd.days===1?"":"s")+'</small>'):"–")+'<span>'+(rd?(rd.days<0?"It was due "+longDate(rd.due):"until your next review, on "+longDate(rd.due)):"Add your start date in Profile to plan reviews")+'</span></div>'+
        (revs.length?'<div class="pv-rows">'+revs.slice(0,5).map(r=>'<span class="pv-row"><span class="pv-row-top"><span>'+esc(longDate(r.date))+'</span><strong>'+(r.targets||[]).length+' target'+((r.targets||[]).length===1?"":"s")+'</strong></span></span>').join("")+'</div>':'<p class="pv-empty">No reviews yet.</p>')+
        note("A review looks at where you are, your evidence, learning, tests, skills and staying safe, then sets new targets. It takes about 5 minutes."));
      return;
    }
    const {S,a,verdict}=D,T=term();
    if(id==="where"){
      const p=window.eviaData.learner(),rd=window.eviaReviewDue&&window.eviaReviewDue();
      const el=sheet("MY PROGRESS","Where you are",
        '<div class="pv-deep-hero">'+num(a.ksbPct,"%")+'<span>of '+esc(T.many)+(a.signoff?' signed off by your assessor':' have evidence')+'</span></div>'+timeline(a.timePct,a.ksbPct,true)+
        '<div class="pv-stats">'+
          (a.timePct!=null?stat("Through your course",a.timePct+"%"):"")+
          (verdict?stat("Pace",'<em class="pv-verdict '+verdict.cls+'"><i aria-hidden="true">'+verdict.icon+'</i>'+verdict.text+'</em>'):"")+
          (S.weeksLeft!=null?stat("Weeks left",S.weeksLeft):"")+
          stat((nvqOn()?"Site jobs":"Units")+" not started",S.unitsLeft)+
          (S.weeksPerUnit!=null?stat("Time for each one","about "+Math.max(1,Math.floor(S.weeksPerUnit))+" weeks"):"")+
          (p.start&&p.end?stat("Course dates",longDate(p.start)+" – "+longDate(p.end)):"")+
          (rd?stat("Next review",rd.days<0?"Overdue · was due "+shortDate(rd.due):shortDate(rd.due)):"")+
        '</div>'+
        note(verdict&&verdict.cls==="behind"?"To catch up, start a unit you haven’t touched yet: it ticks off the most in one go. Evia can tell you which one.":"Keep adding evidence as you go. Evia can take you through your progress review when it’s due."));
    }
    else if(id==="ksb"){
      if(nvqOn()){
        const el=sheet("MY PROGRESS","Your units",window.eviaNvq.progressHtml(a)+note("Answering the knowledge questions and completing site jobs ticks off criteria across all your units."));
        if(window.eviaNvq.bindProgress)window.eviaNvq.bindProgress(()=>openDeep("ksb"));
        return el;
      }
      const all=allK(),groups=[["K","Knowledge"],["S","Skills"],["B","Behaviours"]];
      const el=sheet("MY PROGRESS",esc(T.Many),groups.map(([l,n])=>{
        const items=all.filter(x=>x[0].startsWith(l));if(!items.length)return"";
        const d=items.filter(x=>a.evidenced.has(x[0])).length,w=a.signoff?items.filter(x=>a.possible.has(x[0])).length:0,aims=a.aims||[];
        return '<div class="pv-ksb-group"><div class="pv-ksb-head">'+ring(Math.round(d/items.length*100),40,5,null,Math.round(w/items.length*100))+'<span><strong>'+n+'</strong><small>'+d+' of '+items.length+(a.signoff?' signed off'+(w?' · '+w+' waiting':''):' with evidence')+'</small></span></div><div class="pv-ksb-grid">'+items.map(x=>'<button type="button" class="pv-ksb'+(a.evidenced.has(x[0])?" met":a.signoff&&a.possible.has(x[0])?" maybe":"")+(aims.includes(x[0])?" aim":"")+'" data-ksb="'+esc(x[0])+'">'+esc(x[0])+'</button>').join("")+'</div></div>';
      }).join("")+(a.signoff?'<p class="pv-key"><span class="pv-ksb met">K1</span> signed off by your assessor <span class="pv-ksb maybe">K2</span> evidence added, waiting <span class="pv-ksb aim">K3</span> aiming for</p>':"")+note("Tap a code to see what it means"+(a.signoff?", or to aim for it":"")+". Units you haven’t started cover the most missing ones."));
      el.querySelectorAll("[data-ksb]").forEach(b=>b.onclick=()=>{const it=all.find(x=>x[0]===b.dataset.ksb);if(it&&typeof ksbDetail==="function")ksbDetail(it[0],it[1],a.evidenced.has(it[0]),()=>openDeep("ksb"))});
    }
    else if(id==="otj"){
      const wk=D.otjWeeks,log=hours.slice().sort((x,y)=>Number(y.on||y.createdAt)-Number(x.on||x.createdAt));
      const el=sheet("MY PROGRESS","Learning hours",
        '<div class="pv-deep-hero">'+hmBig(S.otjTotal)+'<span>logged in total</span></div>'+
        (wk.some(w=>w.h>0)?'<p class="pv-caption">Each bar is a week, Monday to Sunday.</p>'+columns(wk.map(w=>w.h),wk.map((w,i)=>i===wk.length-1?"This wk":i%2===1?shortDate(w.start):""),Math.max(OTJ_WEEK_GOAL*1.4,...wk.map(w=>w.h)),{h:130,goal:OTJ_WEEK_GOAL,goalLabel:OTJ_WEEK_GOAL+" h a week",aria:"Learning hours each week",highlight:wk.length-1}):'<span class="pv-empty">Nothing logged in the last 8 weeks.</span>')+
        '<div class="pv-stats">'+stat("This week",hm(S.otjWeek))+stat("This month",hm(S.otjMonth))+stat("Entries",log.length)+'</div>'+
        note("Most apprentices need about "+OTJ_WEEK_GOAL+" hours a week; your commitment statement has your exact number. Tell Evia what you did and she’ll log it. Your full log and its PDFs are in <strong>Learning logs</strong> on My course."));
    }
    else if(id==="tests"){
      const byType={};D.tests.forEach(t=>{(byType[t.type]=byType[t.type]||[]).push(t)});
      const NAMES={maths:"Maths",english:"English",epa:nvqOn()?"Knowledge test":"EPA mock",discussion:"Professional discussion"};
      sheet("MY PROGRESS",nvqOn()?"Knowledge tests":"Tests",
        (D.tests.length?Object.entries(byType).map(([k,list])=>{
          const sc=list.map(testPct),best=Math.max(...sc);
          return '<div class="pv-test"><div class="pv-row-top"><strong>'+esc(NAMES[k]||k)+'</strong><span>best '+best+'% · '+list.length+' taken</span></div>'+line(sc.slice(-12),{h:80,aria:(NAMES[k]||k)+" scores over time"})+'</div>';
        }).join(""):'<p class="pv-empty">No tests yet.</p>')+
        note("A score of 80% or more means you’re in good shape. A few practice questions a day adds up."));
    }
    else if(id==="conf"){
      const cur=S.confidence.scores,ses=D.sessions,prevS=ses.length>1?ses[ses.length-2].scores:[];
      if(cur.length<3){sheet("MY PROGRESS","Confidence",'<p class="pv-empty">You haven’t rated your skills yet.</p>'+note("A confidence check takes about two minutes."));return}
      const areas=cur.map(x=>x.area),prev=prevS.length?areas.map(ar=>{const s=prevS.find(x=>x.area===ar);return s?s.score:0}):null;
      sheet("MY PROGRESS","Confidence",
        '<div class="pv-radar-big">'+radar(areas,cur.map(x=>x.score),prev,300)+'</div>'+(prev?'<span class="pv-legend center"><span><i class="now"></i>Now</span><span><i class="prev"></i>Last time</span></span>':"")+
        '<div class="pv-rows">'+cur.slice().sort((x,y)=>x.score-y.score).map((x,i)=>{const p=prevS.find(s=>s.area===x.area),ch=p?x.score-p.score:0;return '<span class="pv-row"><span class="pv-row-top"><span>'+esc(x.area)+'</span><strong>'+(ch>0?'<em class="pv-up">↑</em> ':ch<0?'<em class="pv-down">↓</em> ':"")+LEVEL[x.score-1]+'</strong></span>'+bar(x.score/4*100,x.score<=2?"low":"",i*50)+'</span>'}).join("")+'</div>'+
        note("Skills at the top need the most practice. A college task can work on them."));
    }
    else if(id==="act"){
      const yr=new Date().getFullYear(),last=monthCounts(D.counts,yr-1).reduce((n,v)=>n+v,0),total=monthCounts(D.counts,yr).reduce((n,v)=>n+v,0);
      sheet("MY PROGRESS","Activity",
        '<div class="pv-deep-hero">'+num(total)+'<span>things added in '+yr+'</span></div>'+
        '<p class="pv-caption">Each bar is a month. It counts the evidence packs, learning hours entries and supporting files you added.</p>'+
        (total?'<span class="pv-year">'+yr+'</span>'+yearBars(D.counts,yr,150):'<span class="pv-empty">Nothing added yet this year.</span>')+
        (last?'<h3 class="pv-h">'+(yr-1)+'</h3>'+columns(monthCounts(D.counts,yr-1),"JFMAMJJASOND".split(""),Math.max(4,...monthCounts(D.counts,yr-1))*1.15,{h:110,aria:"Things added each month in "+(yr-1)}):"")+
        '<div class="pv-stats">'+stat("Weeks in a row",S.streak)+stat("Longest run",S.longest+" week"+(S.longest===1?"":"s"))+stat("Evidence packs",S.allPacks)+stat("Last upload",S.lastUpload?shortDate(S.lastUpload):"None yet")+'</div>'+
        note("Adding a little every week beats a lot at once. A week counts towards your streak when you add anything at all."));
    }
    else if(id==="quality"){
      const checks=(S.checks||[]).slice().sort((x,y)=>x.covered.length/x.terms.length-y.covered.length/y.terms.length);
      sheet("MY PROGRESS","Evidence quality",
        (S.coverage!=null?'<div class="pv-dial-big">'+dial(S.coverage)+'<div class="pv-dial-num">'+num(S.coverage,"%")+'<span>key points covered</span></div></div>':'<p class="pv-empty">Submit a unit with a write-up and Evia will score it.</p>')+
        (checks.length?'<div class="pv-rows">'+checks.map((c,i)=>{const p=Math.round(c.covered.length/c.terms.length*100);return '<span class="pv-row"><span class="pv-row-top"><span>'+esc(c.u.name)+'</span><strong>'+p+'%</strong></span>'+bar(p,p<50?"low":p>=80?"good":"",i*50)+'<small class="pv-row-note">'+c.photos+' photo'+(c.photos===1?"":"s")+' · '+c.words+' words'+(c.missing.length?' · missing: '+esc(c.missing.slice(0,4).join(", "))+(c.missing.length>4?"…":""):"")+'</small></span>'}).join("")+'</div>':"")+
        note("Strong evidence has plenty of photos from the start, middle and end of the job, and a write-up that talks about the things to mention in your own words. Evia can guide you through a pack if you’re not sure where to start."));
    }
    else if(id==="targets"){
      const T2=window.eviaTargets,tg=T2?T2.mine():[];
      sheet("MY PROGRESS","Targets",
        (tg.length?'<div class="pv-rows">'+tg.map((t,i)=>{const p=T2.progress(t,S);return '<span class="pv-row"><span class="pv-row-top"><span>'+esc(t.title)+'</span><strong>'+(t.done?"Done":Math.round(p.pct*100)+"%")+'</strong></span>'+bar(p.pct*100,p.pct>=1?"good":"",i*60)+'<small class="pv-row-note">'+esc(p.text||"")+(t.due&&!t.done?(p.text?" · ":"")+"by "+esc(shortDate(t.due)):"")+'</small></span>'}).join("")+'</div>':'<p class="pv-empty">No targets yet.</p>')+
        note("Targets are set at your progress review and tick off on their own as you go."));
    }
    else if(id==="teach"){
      const TR=window.eviaTeach.report();
      sheet("MY PROGRESS","Teach me",
        '<div class="pv-deep-hero">'+num(TR.medalCount)+'<span>medal'+(TR.medalCount===1?"":"s")+' won'+(TR.avg!=null?' · '+TR.avg+'% average':'')+'</span></div>'+medalRow(TR.medals)+
        TR.subjects.map(sj=>'<h3 class="pv-teach-h"><span>'+esc(sj.name)+'</span><strong>'+(sj.avg==null?"No score yet":sj.avg+"%")+'</strong></h3>'+
          '<p class="pv-teach-sub">'+sj.areasDone+' of '+sj.areas.length+' areas completed · '+(sj.medals.gold+sj.medals.silver+sj.medals.bronze)+' medals</p>'+
          '<div class="pv-rows">'+sj.areas.map((ar,i)=>'<span class="pv-row"><span class="pv-row-top"><span>'+esc(ar.name)+'</span><strong>'+(ar.avg==null?ar.done+" of "+ar.total:ar.avg+"%")+'</strong></span>'+
            bar(ar.total?ar.done/ar.total*100:0,ar.complete?"good":"",i*50)+'<small class="pv-row-note">'+ar.done+' of '+ar.total+' lessons'+(ar.medals.gold+ar.medals.silver+ar.medals.bronze?' · '+["gold","silver","bronze"].filter(k=>ar.medals[k]).map(k=>ar.medals[k]+" "+k).join(", "):"")+'</small></span>').join("")+'</div>').join("")+
        note("Your score is your best go at each lesson. Gold is 90% or more, silver 70% or more."));
    }
    else if(id==="ach"){
      sheet("MY PROGRESS","Achievements",window.eviaStats.badgesHtml(S));
      window.eviaStats.markSeen(window.eviaStats.achievements(S).fresh.map(x=>x.id));
    }
  }

  /* ---------- Animation: each card plays once as it scrolls into view ---------- */
  function countUp(el){
    const to=Number(el.dataset.to)||0,start=performance.now(),dur=900;
    const step=t=>{const k=Math.min(1,(t-start)/dur),e=1-Math.pow(1-k,3);el.textContent=Math.round(to*e);if(k<1)requestAnimationFrame(step)};
    el.textContent="0";requestAnimationFrame(step);
  }
  function play(el,now){
    if(!el)return;
    if(reduced()){el.classList.add("pv-in","pv-still");return}
    el.classList.add("pv-anim");
    const go=()=>{void el.offsetWidth;el.classList.add("pv-in");el.querySelectorAll(".pv-num").forEach(countUp)};
    if(now){requestAnimationFrame(()=>requestAnimationFrame(go));return}
    return go;
  }
  function observe(root){
    const list=[...root.querySelectorAll(".pv-card")];
    if(reduced()||!("IntersectionObserver" in window)){list.forEach(c=>play(c,true));return}
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);const go=play(e.target);if(go)requestAnimationFrame(()=>requestAnimationFrame(go))}}),{threshold:.2});
    list.forEach(c=>{c.classList.add("pv-anim");io.observe(c)});
  }

  /* ---------- The page ---------- */
  function page(){
    document.getElementById("page-title").textContent="My progress";
    let D;try{D=gather()}catch(err){console.error("My progress failed",err);$("#screen").innerHTML='<p class="pv-empty">Evia couldn’t work out your progress just now.</p>';return}
    const rd=window.eviaReviewDue&&window.eviaReviewDue();
    $("#screen").innerHTML='<header class="ui-page-head"><h1>My progress</h1><span>'+esc(typeof data==="function"?data().name:"")+'</span></header>'+'<div class="pv-grid">'+cards(D).join("")+'</div>';
    document.querySelectorAll("[data-pv]").forEach(b=>b.onclick=()=>openDeep(b.dataset.pv));
    observe(document.getElementById("screen"));
  }
  window.eviaProgressPage=page;
  window.eviaProgressDeep=openDeep;
})();
