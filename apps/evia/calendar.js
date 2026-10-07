/* Evia7 Calendar tab: the learner's time in one place. College days come from Nisia (the tutor's registers in Symi):
   classes coming up, attendance and days off. Learning hours sit on the same days, with Log hours and the learning
   logs. A connected learner can't add or move college days; they check in, or say they can't make it.
   Learners not connected to a college set their own college days (kept on the phone) until Nisia takes over. */
(function(){
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const scr=()=>document.getElementById("screen");
  const dkey=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const longDay=k=>new Date(k+"T12:00:00").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
  const shortDay=k=>new Date(k+"T12:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});
  const hm=h=>window.eviaHM?window.eviaHM(h):Math.round(h*10)/10+" h";
  const WEEK_GOAL=6;
  const courseName=()=>{try{return data().name}catch(_){return ""}};
  /* Logged learning hours by day (the day it happened, not the day it was logged). */
  function hoursByDay(){
    const by={};
    (typeof hours!=="undefined"?hours:[]).forEach(h=>{const t=Number(h.on)||Number(h.createdAt);if(!t)return;const k=dkey(new Date(t));(by[k]=by[k]||[]).push(h)});
    return by;
  }
  function weekHours(by){
    const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);let n=0;
    for(let i=0;i<7;i++){(by[dkey(d)]||[]).forEach(h=>n+=Number(h.n)||0);d.setDate(d.getDate()+1)}
    return n;
  }
  const inChat=run=>{if(window.chat)window.chat({quiet:true});setTimeout(run,120)};
  const logHours=()=>inChat(()=>{const C=window.eviaCoachFlows||{};if(C.hours)C.hours()});
  /* College days for learners not connected to a college: weekdays (0 Sunday to 6 Saturday). */
  const CD_KEY="evia7-college-days";
  const myDays=()=>{try{const d=JSON.parse(localStorage.getItem(CD_KEY)||"[]");return Array.isArray(d)?d.filter(n=>n>=0&&n<=6):[]}catch(_){return []}};
  const setDays=d=>{try{localStorage.setItem(CD_KEY,JSON.stringify(d))}catch(_){}};
  const PICK=[[1,"Mon"],[2,"Tue"],[3,"Wed"],[4,"Thu"],[5,"Fri"],[6,"Sat"],[0,"Sun"]];
  let cur=null,editDays=false;
  function page(){
    const A=window.eviaAttendance,AT=A&&A.data?A.data():null,KEY=A?A.KEY:[],LABEL=Object.fromEntries(KEY),DETAIL=(A&&A.DETAIL)||{},by=hoursByDay(),today=dkey(new Date());
    const N=window.eviaNisia,now=N&&N.classNow?N.classNow():null;
    /* Not connected: the learner's own college days, from today to two months ahead. */
    const own=!AT?myDays():[],ownComing=[];
    if(own.length){const e=new Date();e.setMonth(e.getMonth()+3,0);for(let d=new Date();d<=e;d.setDate(d.getDate()+1))if(own.includes(d.getDay()))ownComing.push({session_date:dkey(d),class:"College"})}
    const coming=AT?AT.coming:ownComing;
    const next=coming.slice().sort((a,b)=>String(a.session_date+(a.starts_at||"")).localeCompare(b.session_date+(b.starts_at||"")))[0];
    const wk=weekHours(by),pct=Math.min(100,Math.round(wk/WEEK_GOAL*100));
    const time=s=>s&&s.starts_at?new Date(s.starts_at).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}):"";
    /* This week: the next class (check in when it's on) and learning hours against the week's goal. */
    const editing=!AT&&(editDays||!own.length);
    const classCard=editing?'<section class="cal-card cal-wide"><span class="cal-label">Your college days</span><small>Tap the days you’re at college</small><span class="cal-days">'+
      PICK.map(([n,t])=>'<button type="button" class="cal-day'+(own.includes(n)?" on":"")+'" data-cd="'+n+'" aria-pressed="'+own.includes(n)+'">'+t+'</button>').join("")+'</span>'+
      (own.length?'<button type="button" class="cal-btn primary" id="cal-days-done">Done</button>':"")+'</section>':
      '<section class="cal-card"><span class="cal-label">Next class</span>'+
      (next?'<strong>'+(next.session_date===today?"Today":esc(shortDay(next.session_date)))+(time(next)?" · "+esc(time(next)):"")+'</strong><small>'+esc(next.class||"")+'</small>':'<strong>None booked</strong><small>Your tutor sets your college days</small>')+
      (now&&window.eviaCheckIn?'<button type="button" class="cal-btn primary" id="cal-checkin">Check in</button>':"")+(AT?"":'<button type="button" class="cal-link cal-change" id="cal-days-edit">Change days</button>')+'</section>';
    const hoursCard='<section class="cal-card'+(!AT&&(editDays||!myDays().length)?" cal-wide":"")+'"><span class="cal-label">Learning hours this week</span><strong>'+esc(hm(wk))+'<small> of '+WEEK_GOAL+' h</small></strong>'+
      '<span class="cal-bar" aria-hidden="true"><i style="width:'+pct+'%"></i></span><button type="button" class="cal-btn primary" id="cal-log">Log hours</button></section>';
    const start=(()=>{try{const s=window.eviaData.enrolment&&window.eviaData.enrolment().start;return s?new Date(s+"T12:00:00"):null}catch(_){return null}})()||new Date(Date.now()-365*864e5);
    const n0=new Date(),minM=start.getFullYear()*12+start.getMonth(),maxM=n0.getFullYear()*12+n0.getMonth()+2;
    if(cur==null||cur<minM||cur>maxM)cur=n0.getFullYear()*12+n0.getMonth();
    scr().innerHTML='<header class="ui-page-head"><h1>Calendar</h1><span>'+esc(courseName())+'</span></header>'+
      '<div class="cal-top">'+classCard+hoursCard+'</div>'+
      '<div class="pv-acal cal-month" id="cal-month"></div><p class="pv-acal-day" id="cal-day" aria-live="polite">Tap a day to see what happened.</p>'+
      '<div class="pv-acal-key cal-key">'+(AT?KEY.map(([k,t])=>'<span><i class="pv-a-'+k+'"></i>'+esc(t)+'</span>').join(""):"")+(!AT&&own.length?'<span><i class="pv-a-coming"></i>College day</span>':"")+'<span><i class="cal-key-h"></i>Learning hours</span></div>'+
      '<div class="cal-links">'+(AT&&N&&N.bookAbsence&&window.eviaTodo&&window.eviaTodo.away?'<button type="button" class="cal-link" id="cal-away">Can’t make college?</button>':"")+
      '<button type="button" class="cal-link" id="cal-logs">Learning logs</button></div>';
    const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],byDay={};
    if(AT){
      AT.marks.forEach(x=>{(byDay[x.date]=byDay[x.date]||{marks:[]}).marks.push(x)});
      AT.booked.forEach(a=>{for(let d=new Date(a.starts_on+"T12:00:00");dkey(d)<=a.ends_on;d.setDate(d.getDate()+1)){const k=dkey(d);(byDay[k]=byDay[k]||{marks:[]}).booked=a}});
    }
    coming.forEach(x=>{(byDay[x.session_date]=byDay[x.session_date]||{marks:[]}).coming=x});
    const draw=()=>{
      const y=Math.floor(cur/12),m=cur%12,first=new Date(y,m,1),days=new Date(y,m+1,0).getDate(),lead=(first.getDay()+6)%7;
      let cells="";for(let i=0;i<lead;i++)cells+='<span class="pv-acal-blank"></span>';
      for(let d=1;d<=days;d++){
        const k=dkey(new Date(y,m,d)),o=byDay[k],h=by[k],c=o?(o.marks.length?(o.marks.find(x=>x.k==="none")||o.marks[0]).g:o.booked?"booked":o.coming?"coming":""):"";
        cells+='<button type="button" class="pv-acal-d'+(c?" pv-a-"+c:"")+(h?" cal-h":"")+(k===today?" pv-today":"")+'" data-day="'+k+'" aria-label="'+esc(longDay(k)+(c?": "+LABEL[c]:"")+(h?", learning hours logged":""))+'">'+d+'</button>';
      }
      const box=document.getElementById("cal-month");
      box.innerHTML='<div class="pv-acal-head"><button type="button" class="pv-acal-nav" data-m="-1" aria-label="Previous month"'+(cur<=minM?" disabled":"")+'>‹</button><strong>'+first.toLocaleDateString("en-GB",{month:"long",year:"numeric"})+'</strong><button type="button" class="pv-acal-nav" data-m="1" aria-label="Next month"'+(cur>=maxM?" disabled":"")+'>›</button></div>'+
        '<div class="pv-acal-grid">'+DAYS.map(x=>'<span class="pv-acal-dow">'+x+'</span>').join("")+cells+'</div>';
      box.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{cur+=+b.dataset.m;draw()});
      box.querySelectorAll("[data-day]").forEach(b=>b.onclick=()=>{
        box.querySelectorAll(".pv-picked").forEach(x=>x.classList.remove("pv-picked"));b.classList.add("pv-picked");
        const k=b.dataset.day,o=byDay[k],h=by[k]||[];
        const lines=o?o.marks.map(x=>esc(x.class)+": <strong>"+esc(DETAIL[x.k])+"</strong>"+(x.k==="here"||x.k==="late"?(x.minutes?" · "+Math.floor(x.minutes/60)+"h"+(x.minutes%60?" "+(x.minutes%60)+"m":""):""):x.reason&&!String(DETAIL[x.k]).toLowerCase().includes(x.reason.toLowerCase())?" · "+esc(x.reason):"")):[];
        if(o&&o.booked&&!o.marks.length)lines.push("<strong>Booked off</strong> · "+esc(o.booked.reason));
        if(o&&o.coming&&!o.marks.length)lines.push(esc(o.coming.class)+(time(o.coming)?" at "+esc(time(o.coming)):"")+": <strong>class coming up</strong>");
        h.forEach(x=>lines.push("<strong>"+esc(hm(Number(x.n)||0))+" learning</strong>"+(x.description?" · "+esc(x.description):"")));
        document.getElementById("cal-day").innerHTML="<span>"+esc(longDay(k))+"</span>"+(lines.length?lines.join("<br>"):(AT?"No class and no learning hours that day.":"No learning hours that day."));
      });
    };
    draw();
    const on=(id,fn)=>{const b=document.getElementById(id);if(b)b.onclick=fn};
    on("cal-log",logHours);
    scr().querySelectorAll("[data-cd]").forEach(b=>b.onclick=()=>{const n=+b.dataset.cd,d=myDays();setDays(d.includes(n)?d.filter(x=>x!==n):d.concat(n));editDays=true;page()});
    on("cal-days-done",()=>{editDays=false;page()});
    on("cal-days-edit",()=>{editDays=true;page()});
    on("cal-checkin",()=>window.eviaCheckIn&&window.eviaCheckIn.open());
    on("cal-away",()=>inChat(()=>window.eviaTodo.away()));
    on("cal-logs",()=>window.eviaOpenLearningLogs&&window.eviaOpenLearningLogs());
  }
  window.eviaCalendar={page};

  const prev=window.render;
  window.render=function(){
    if(screen!=="calendar")return prev();
    const pb=document.getElementById("profile-btn");if(pb)pb.style.display="flex";
    document.querySelectorAll("[data-nav]").forEach(b=>b.classList.toggle("active",b.dataset.nav==="calendar"));
    const s=scr();if(s)s.classList.add("ui-top");
    const t=document.getElementById("page-title");if(t)t.textContent="Calendar";
    page();
  };
  /* New hours or a synced register while it's open: draw it again. */
  let t=null;
  if(window.eviaData&&window.eviaData.on)window.eviaData.on("change",()=>{clearTimeout(t);t=setTimeout(()=>{if(typeof screen!=="undefined"&&screen==="calendar"&&!document.querySelector(".chat-sheet,#modal-root .pv-sheet"))page()},300)});
})();
