/* Evia7 attendance for learners not connected to a college (no registers from Evia Portal). Their college days are the
   weekdays they picked in the calendar; each one that has passed can be marked "There" (with the hours, 6 to start,
   which can be changed) or "Missed". A day marked "There" is a "College day" learning log, so the hours count; changing
   the hours changes that log, and "Missed" takes it away. The percentage (days there out of days marked) is only for
   the learner's reference. Connected learners never see this: their tutor's registers are their attendance.
   Days are listed from the apprenticeship start date.
   Kept on the phone: evia7-own-attendance {"YYYY-MM-DD": {here, mins, hid}}; evia7-college-days-since (used without a start date). */
(function(){
  "use strict";
  const KEY="evia7-own-attendance",SINCE="evia7-college-days-since",DAYS_KEY="evia7-college-days",DAY=864e5,START_MINS=360,STEP=30;
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||"null");return v==null?d:v}catch(_){return d}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
  const dkey=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const hm=m=>{const h=Math.floor(m/60),r=m%60;return h&&r?h+"h "+r+"m":h?h+"h":r+"m"};
  const live=()=>{try{const N=window.eviaNisia,e=N&&N.joined&&N.joined();return !!(e&&e.live)}catch(_){return false}};
  const myDays=()=>{const d=read(DAYS_KEY,[]);return Array.isArray(d)?d.filter(n=>n>=0&&n<=6):[]};
  const reduced=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* From when: the start of the apprenticeship (from Evia Portal or the learner's profile); without one, the day the
     college days were first picked. */
  function startDate(){
    try{
      const en=(window.eviaData&&window.eviaData.enrolment&&window.eviaData.enrolment())||{},pr=(window.eviaData&&window.eviaData.learner&&window.eviaData.learner())||{};
      const t=Date.parse(en.start||en.startDate||pr.start||"");
      if(t&&t<=Date.now())return dkey(new Date(t));
    }catch(_){}
    return null;
  }
  function since(){
    const s=startDate();if(s)return s;
    let x=read(SINCE,null);
    if(!x&&myDays().length){x=dkey(new Date(Date.now()-28*DAY));write(SINCE,x)}
    return x;
  }
  const noteSet=()=>{if(!read(SINCE,null)&&myDays().length)write(SINCE,dkey(new Date()))};

  /* College days that have passed (today included), newest first, with what was marked. */
  function data(){
    if(live())return null;
    const own=myDays(),marks=read(KEY,{})||{};
    if(!own.length&&!Object.keys(marks).length)return null;
    const from=since(),today=dkey(new Date()),list={};
    if(from)for(let d=new Date(from+"T12:00:00");dkey(d)<=today;d.setDate(d.getDate()+1))if(own.includes(d.getDay()))list[dkey(d)]=null;
    Object.keys(marks).forEach(k=>{if(k<=today&&(!from||k>=from))list[k]=marks[k]});
    const days=Object.keys(list).sort().reverse().map(d=>{const m=list[d];return {d,state:m?(m.here?"here":"missed"):null,mins:m&&m.here?Number(m.mins)||START_MINS:0}});
    const here=days.filter(x=>x.state==="here").length,missed=days.filter(x=>x.state==="missed").length,marked=here+missed;
    return {days,here,missed,open:days.length-marked,pct:marked?Math.round(here/marked*100):null,mins:days.reduce((n,x)=>n+x.mins,0)};
  }

  /* The learning log behind a day: the one this made, or a "College day" the learner already logged that day. */
  function hoursList(){return typeof hours!=="undefined"&&Array.isArray(hours)?hours:[]}
  function logFor(day,m){
    const H=hoursList();
    if(m&&m.hid){const x=H.find(h=>h&&h.id===m.hid);if(x)return x}
    return H.find(h=>h&&!h.college&&/^College day/i.test(h.description||"")&&dkey(new Date(Number(h.on||h.createdAt)))===day)||null;
  }
  function mark(day,state,mins){
    const marks=read(KEY,{})||{},m=marks[day],D=window.eviaData,log=logFor(day,m);
    if(state==="here"){
      const n=Math.max(STEP,Math.min(720,Math.round((mins||(m&&m.here&&m.mins)||(log?Math.round(Number(log.n)*60):START_MINS))/5)*5));
      let hid=log?log.id:null;
      try{if(D)hid=D.put("hours",{id:hid||undefined,minutes:n,description:log&&log.description||"College day",occurredAt:new Date(day+"T12:00:00").getTime(),createdAt:log?log.createdAt:Date.now(),source:"manual"})}catch(_){}
      marks[day]={here:true,mins:n,hid};
    }else if(state==="missed"){
      if(log&&D)try{D.remove("hours",log.id)}catch(_){}
      marks[day]={here:false};
    }else delete marks[day];
    write(KEY,marks);
    try{window.dispatchEvent(new CustomEvent("evia-own-attendance"))}catch(_){}
  }

  /* Days marked before the apprenticeship started (marked before the start date was set) go, with the learning logs
     marking them made. */
  function tidy(){
    const st=startDate();if(!st)return;
    const marks=read(KEY,{})||{},H=hoursList();let changed=false;
    Object.keys(marks).forEach(k=>{if(k>=st)return;const m=marks[k];
      if(m&&m.hid&&H.some(h=>h&&h.id===m.hid))try{window.eviaData.remove("hours",m.hid)}catch(_){}
      delete marks[k];changed=true});
    if(changed)write(KEY,marks);
  }
  function sheet(){
    tidy();
    const root=document.getElementById("modal-root");if(!root)return;
    root.innerHTML='<div class="overlay pv-overlay"><section class="sheet pr-sheet pv-sheet oa-sheet" role="dialog" aria-modal="true" aria-labelledby="oa-title"><div class="sheet-head"><div><div class="chat-kicker">COLLEGE</div><h2 id="oa-title">Attendance</h2></div><button class="close" id="oa-close" type="button" aria-label="Close">×</button></div><div class="pr-body" id="oa-body"></div></section></div>';
    /* Back on the Time tab, its Attendance row shows what was marked. */
    const after=()=>{try{if(typeof screen!=="undefined"&&screen==="calendar"&&window.eviaTidy)window.eviaTidy.plan()}catch(_){}};
    const close=()=>{const o=root.querySelector(".overlay");after();if(!o||reduced()){root.innerHTML="";return}o.classList.add("pv-closing");setTimeout(()=>{if(root.contains(o))root.innerHTML=""},180)};
    root.querySelector("#oa-close").onclick=close;
    root.querySelector(".overlay").addEventListener("click",e=>{if(e.target.classList.contains("overlay"))close()});
    const body=root.querySelector("#oa-body");
    const draw=()=>{
      const A=data();
      if(!A||!A.days.length){body.innerHTML='<p class="oa-empty">'+(myDays().length?"Your first college day hasn’t come yet.":"Pick your college days in the calendar first.")+'</p>';return}
      const longDay=k=>new Date(k+"T12:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});
      body.innerHTML='<div class="oa-top"><div class="oa-pct"><b>'+(A.pct==null?"–":A.pct+"%")+'</b><span>'+(A.here+A.missed?A.here+" of "+(A.here+A.missed)+" college days":"No days marked yet")+'</span></div>'+
        '<div class="oa-hrs"><b>'+esc(hm(A.mins))+'</b><span>at college</span></div></div>'+
        '<p class="oa-ref">The percentage is just for you. It isn’t sent anywhere.'+(A.open?" "+A.open+" day"+(A.open===1?"":"s")+" still to mark.":"")+'</p>'+
        (()=>{const st=startDate(),f=since(),nice=k=>new Date(k+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
          return st?'<p class="oa-from">From your start date, '+esc(nice(st))+'</p>':
            '<label class="oa-from oa-set">'+(f?"From "+esc(nice(f))+". ":"")+'Add your start date to go back to it<input type="date" id="oa-start" max="'+dkey(new Date())+'"></label>'})()+
        (A.open>1?'<button type="button" class="secondary oa-all" id="oa-all">Mark the '+A.open+' unmarked days as There ('+hm(START_MINS)+' each)</button>':"")+
        '<div class="oa-list">'+A.days.map(x=>'<div class="oa-day'+(x.state?" oa-"+x.state:"")+'" data-day="'+x.d+'"><div class="oa-row"><strong>'+esc(longDay(x.d))+'</strong>'+
          '<span class="oa-seg" role="group" aria-label="'+esc(longDay(x.d))+'"><button type="button" data-st="here" aria-pressed="'+(x.state==="here")+'">There</button><button type="button" data-st="missed" aria-pressed="'+(x.state==="missed")+'">Missed</button></span></div>'+
          (x.state==="here"?'<div class="oa-time"><span>Hours</span><button type="button" class="oa-step" data-dm="-'+STEP+'" aria-label="30 minutes less"'+(x.mins<=STEP?" disabled":"")+'>−</button><b>'+esc(hm(x.mins))+'</b><button type="button" class="oa-step" data-dm="'+STEP+'" aria-label="30 minutes more"'+(x.mins>=720?" disabled":"")+'>+</button></div>':"")+
          '</div>').join("")+'</div>';
    };
    body.addEventListener("click",e=>{
      if(e.target.closest("#oa-all")){data().days.filter(x=>!x.state).forEach(x=>mark(x.d,"here"));draw();return}
      const row=e.target.closest(".oa-day");if(!row)return;const day=row.dataset.day,cur=(data().days.find(x=>x.d===day)||{});
      const st=e.target.closest("[data-st]"),step=e.target.closest("[data-dm]");
      if(st){mark(day,cur.state===st.dataset.st?null:st.dataset.st);draw()}
      else if(step){mark(day,"here",(cur.mins||START_MINS)+Number(step.dataset.dm));draw()}
    });
    body.addEventListener("change",e=>{
      if(e.target.id!=="oa-start"||!e.target.value)return;
      try{window.eviaData.put("learner",{start:e.target.value})}catch(_){}
      tidy();draw();
    });
    draw();
    const h=root.querySelector("#oa-title");h.setAttribute("tabindex","-1");h.focus({preventScroll:true});
  }

  window.eviaOwnAttendance={data,tidy,mark,open:sheet,noteSet,KEY,START_MINS};
})();
