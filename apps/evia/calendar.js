/* Evia7 Calendar tab: the learner's time in one place. College days come from Evia Portal (the tutor's registers in Symi):
   classes coming up, attendance and days off. Learning hours sit on the same days, with Log hours and the learning
   logs. A connected learner can't add or move college days; they check in, or say they can't make it.
   Learners not connected to a college set their own college days (kept on the phone) until Evia Portal takes over.
   Visits the assessor books in Milos show here too, with the next one at the top. */
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
  let editDays=false,picked=null;
  const RI={class:'<svg viewBox="0 0 24 24"><path d="M3 9.5 12 5l9 4.5-9 4.5z"/><path d="M7 11.5V16c1.5 1.3 3.2 2 5 2s3.5-.7 5-2v-4.5"/></svg>',
    hours:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    visit:'<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>',
    career:'<svg viewBox="0 0 24 24"><path d="M12 3.5l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.6-5 2.6.9-5.6-4-4 5.6-.8z"/></svg>',
    off:'<svg viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8 3.5v4M16 3.5v4M9.5 13.5l5 5M14.5 13.5l-5 5"/></svg>'};
  /* The tab is "College" for a learner connected to their college, "Me" on their own. At the top: their profile
     (where the profile button used to be) and their messages, then the calendar. */
  const live=()=>{try{const N=window.eviaNisia,e=N&&N.joined&&N.joined();return !!(e&&e.live)}catch(_){return false}};
  function tabName(){return "Time"}
  function label(){const l=document.getElementById("nav-college");if(l&&l.textContent!==tabName())l.textContent=tabName()}
  /* Profile and messages: one card, two rows. */
  function meCards(){
    const D=window.eviaData,p=(D&&D.learner&&D.learner())||{},photo=D&&D.files&&D.files.photo?D.files.photo():"",e=(D&&D.enrolment&&D.enrolment())||{};
    const name=String(p.name||"").trim()||"Your profile",n=live()&&window.eviaMessages?window.eviaMessages.unread():0;
    const initials=name.split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase();
    return '<div class="cal-me-wrap cw-group"><button type="button" class="cal-me" id="cal-me" aria-label="Your profile"><span class="cal-me-av">'+(photo?'<img src="'+photo+'" alt="">':esc(initials||"·"))+'</span>'+
      '<span class="cal-me-copy"><strong>'+esc(name)+'</strong><small>'+esc([courseName(),live()?e.college:""].filter(Boolean).join(" · ")||"Your details, signature and backups")+'</small></span><span class="cal-go" aria-hidden="true">›</span></button>'+
      (live()&&window.eviaMessages?'<button type="button" class="cal-me cal-msgs" id="cal-msgs"><span class="cal-me-av cal-msgs-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 12.2c0 4-3.6 7.1-8 7.1-1.1 0-2.2-.2-3.1-.6L4 20l1.3-3.7A6.6 6.6 0 0 1 4 12.2C4 8.3 7.6 5 12 5s8 3.3 8 7.2Z"/><path d="M8.5 11.5h7M8.5 14.3h4.5"/></svg></span>'+
        '<span class="cal-me-copy"><strong>Messages</strong><small>'+(n?(n===1?"1 new message":n+" new messages"):"Your tutor, assessor and employer")+'</small></span>'+(n?'<span class="cal-msgs-n">'+(n>99?"99+":n)+'</span>':"")+'<span class="cal-go" aria-hidden="true">›</span></button>':"")+'</div>';
  }
  /* New messages: the number on the tab, and on the Messages row when the page is open. */
  window.eviaCollegeUnread=n=>{
    label();
    const b=document.getElementById("nav-college-n");if(b){b.hidden=!n;b.textContent=n>99?"99+":String(n||"")}
    const row=document.getElementById("cal-msgs");if(row&&typeof screen!=="undefined"&&screen==="calendar")row.outerHTML=(new DOMParser().parseFromString(meCards(),"text/html").getElementById("cal-msgs")||row).outerHTML,on2();
  };
  const on2=()=>{const r=document.getElementById("cal-msgs");if(r)r.onclick=()=>window.eviaMessages&&window.eviaMessages.open()};
  setTimeout(label,0);if(window.eviaNisia&&window.eviaNisia.onStatus)window.eviaNisia.onStatus(label);
  /* The page: profile and messages, then the week (a day at a time underneath), then learning hours. The whole month
     is in Progress › Attendance. */
  let wkStart=null;
  const monday=d=>{const m=new Date(d);m.setHours(12,0,0,0);m.setDate(m.getDate()-(m.getDay()+6)%7);return m};
  function page(){
    label();
    const A=window.eviaAttendance,AT=A&&A.data?A.data():null,KEY=A?A.KEY:[],LABEL=Object.fromEntries(KEY),DETAIL=(A&&A.DETAIL)||{},by=hoursByDay(),today=dkey(new Date());
    const N=window.eviaNisia,now=N&&N.classNow?N.classNow():null,V=N&&N.visits?N.visits():[],CR=window.eviaCareers?window.eviaCareers.list():[];
    const VKIND={visit:"Assessor visit",observation:"Assessor observation",review:"Progress review"},clock=t=>new Date(t).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
    /* Not connected: the learner's own college days, for a year. */
    const own=!AT?myDays():[],ownComing=[];
    if(own.length){const e=new Date();e.setFullYear(e.getFullYear()+1);for(let d=new Date();d<=e;d.setDate(d.getDate()+1))if(own.includes(d.getDay()))ownComing.push({session_date:dkey(d),class:"College"})}
    const coming=AT?AT.coming:ownComing;
    const wk=weekHours(by),pct=Math.min(100,Math.round(wk/WEEK_GOAL*100));
    const time=s=>s&&s.starts_at?clock(s.starts_at):"";
    const byDay={},at=k=>byDay[k]=byDay[k]||{marks:[]};
    if(AT){AT.marks.forEach(x=>at(x.date).marks.push(x));
      AT.booked.forEach(a=>{for(let d=new Date(a.starts_on+"T12:00:00");dkey(d)<=a.ends_on;d.setDate(d.getDate()+1))at(dkey(d)).booked=a})}
    coming.forEach(x=>{at(x.session_date).coming=x});
    V.forEach(v=>{const o=at(dkey(new Date(v.starts_at)));(o.visits=o.visits||[]).push(v)});
    CR.forEach(c=>{const o=at(dkey(new Date(c.starts_at)));(o.careers=o.careers||[]).push(c)});
    /* What's next: the next class, visit or careers session. */
    const nowMs=Date.now(),ups=[].concat(
      coming.map(x=>({k:x.session_date,t:x.starts_at?Date.parse(x.starts_at):Date.parse(x.session_date+"T09:00:00"),what:x.class||"College",kind:"class"})),
      V.map(v=>({k:dkey(new Date(v.starts_at)),t:Date.parse(v.starts_at),what:VKIND[v.kind]||"Assessor visit",kind:"visit"})),
      CR.map(c=>({k:dkey(new Date(c.starts_at)),t:Date.parse(c.starts_at),what:c.title,kind:"career"}))).filter(x=>x.t+3*36e5>nowMs).sort((a,b)=>a.t-b.t);
    const next=ups[0];
    if(!wkStart)wkStart=monday(new Date());
    const editing=!AT&&(editDays||!own.length);
    const daysCard='<section class="cal-card cal-wide cw-pick"><span class="cal-label">Your college days</span><small>Tap the days you’re at college</small><span class="cal-days">'+
      PICK.map(([n,t])=>'<button type="button" class="cal-day'+(own.includes(n)?" on":"")+'" data-cd="'+n+'" aria-pressed="'+own.includes(n)+'">'+t+'</button>').join("")+'</span>'+
      (own.length?'<button type="button" class="cal-btn primary" id="cal-days-done">Done</button>':"")+'</section>';
    const nextLine=next?'<button type="button" class="cw-next" id="'+(next.kind==="visit"?"cal-visit":"cw-next")+'" data-go="'+next.k+'"><span class="cw-next-k">Next</span><span class="cw-next-t"><strong>'+esc(next.what)+'</strong><small>'+esc((next.k===today?"Today":shortDay(next.k))+(next.kind!=="class"||coming.find(x=>x.session_date===next.k&&x.starts_at)?" · "+clock(next.t):""))+'</small></span><span aria-hidden="true">›</span></button>'
      :(AT?'<p class="cw-none">No classes booked yet. Your tutor sets your college days.</p>':"");
    scr().innerHTML='<header class="ui-page-head"><h1>'+esc(tabName())+'</h1><span>'+esc(courseName())+'</span></header>'+
      (now&&window.eviaCheckIn?'<button type="button" class="cw-checkin" id="cal-checkin"><strong>Class is on now</strong><span>Check in</span></button>':"")+
      meCards()+(editing?daysCard:"")+
      '<div class="cw-head"><h2 class="cal-h">Your week</h2><span class="cw-nav"><button type="button" class="cw-arrow" data-w="-1" aria-label="Last week">‹</button><span id="cw-range"></span><button type="button" class="cw-arrow" data-w="1" aria-label="Next week">›</button></span></div>'+
      '<section class="cw-card" id="cal-month">'+nextLine+'<div class="cw-strip" id="cw-strip" role="group" aria-label="Days this week"></div><div class="cal-dcard" id="cal-day" aria-live="polite"></div></section>'+
      '<section class="cal-card cw-hours"><div class="cw-hours-top"><span><span class="cal-label">Learning hours this week</span><strong>'+esc(hm(wk))+'<small> of '+WEEK_GOAL+' h</small></strong></span><button type="button" class="cal-btn primary" id="cal-log">Log hours</button></div>'+
        '<span class="cal-bar" aria-hidden="true"><i style="width:'+pct+'%"></i></span><button type="button" class="cal-mini" id="cal-logs">See my learning logs</button></section>'+
      '<div class="cw-links">'+(AT&&window.eviaProgressDeep?'<button type="button" class="cal-mini" id="cw-month">See the whole month</button>':"")+
        (AT&&N&&N.bookAbsence&&window.eviaTodo&&window.eviaTodo.away?'<button type="button" class="cal-mini" id="cal-away">Can’t make college?</button>':"")+
        (!AT&&!editing?'<button type="button" class="cal-mini cal-change" id="cal-days-edit">Change my college days</button>':"")+'</div>';
    const row=(ic,title,sub,chip,cls,attr)=>'<li class="cal-row'+(attr?" cw-tap":"")+'"'+(attr||"")+'><span class="cal-ri ri-'+ic+'" aria-hidden="true">'+(RI[ic]||"")+'</span><span class="cal-rt"><strong>'+title+'</strong>'+(sub?'<small>'+sub+'</small>':"")+'</span>'+(chip?'<em class="cal-chip'+(cls?" "+cls:"")+'">'+chip+'</em>':"")+'</li>';
    const mins=n=>n?(n>=60?Math.floor(n/60)+"h"+(n%60?" "+(n%60)+"m":""):n+"m"):"";
    function showDay(k){
      picked=k;
      document.querySelectorAll("#cw-strip [data-day]").forEach(b=>{const on=b.dataset.day===k;b.classList.toggle("pv-picked",on);b.setAttribute("aria-pressed",on)});
      const o=byDay[k],h=by[k]||[],rows=[];
      const lessonOf=x=>{const c=h.find(y=>y.college&&y.college.class===x.class);return c&&c.college.lesson?c.college.lesson:""};
      ((o&&o.marks)||[]).forEach(x=>{const here=x.k==="here"||x.k==="late",why=x.reason&&!String(DETAIL[x.k]).toLowerCase().includes(x.reason.toLowerCase())?x.reason:"";
        rows.push(row("class",esc(x.class||"Class"),[A.taught&&A.taught(x)||(here?lessonOf(x):""),why].filter(Boolean).map(esc).join("<br>"),esc(DETAIL[x.k]||LABEL[x.g]||"")+(here&&x.minutes?" · "+mins(x.minutes):""),"pv-a-"+x.g))});
      if(o&&o.booked&&!o.marks.length)rows.push(row("off","Booked off",esc(o.booked.reason||""),"",""));
      if(o&&o.coming&&!o.marks.length)rows.push(row("class",esc(o.coming.class||"College"),[time(o.coming)?"Starts at "+esc(time(o.coming)):"",o.coming.lesson&&A&&A.clip?"Planned: "+esc(A.clip(o.coming.lesson,160)):""].filter(Boolean).join("<br>"),"Coming up","pv-a-coming"));
      if(o&&o.marks.some(x=>A.missed&&A.missed(x)))rows.push('<li class="cal-row cal-catch"><span class="cal-rt"><small>Catch up on what you missed in Teach me, or ask your tutor for the notes.</small></span></li>');
      ((o&&o.visits)||[]).forEach(v=>rows.push(row("visit",esc(VKIND[v.kind]||"Assessor visit"),[esc(clock(v.starts_at)),v.place?esc(v.place):"",v.booked_by?"with "+esc(v.booked_by):""].filter(Boolean).join(" · ")+(v.note?"<br><em>"+esc(v.note)+"</em>":""),"","")));
      ((o&&o.careers)||[]).forEach(c=>rows.push(row("career",esc(c.title),[esc(clock(c.starts_at)),c.place?esc(c.place):""].filter(Boolean).join(" · "),c.interested?"Interested":"Careers","cw-chip-c",' data-career="'+esc(c.id)+'" role="button" tabindex="0"')));
      h.filter(x=>!(x.college&&o&&o.marks.length)).forEach(x=>{const d=String(x.description||"").replace(/^([^:.]+):\s*\1\b[.:]?\s*/,"$1. ").trim(),m=d.match(/^([^.:]{2,60})[.:]\s*(.*)$/);
        const title=m?m[1]:d||"Learning",sub=x.learned||(m?m[2].replace(/^What I learned:\s*/i,""):"");
        rows.push(row("hours",esc(title),esc(sub.length>140?sub.slice(0,140).replace(/\s+\S*$/,"")+"…":sub),esc(hm(Number(x.n)||0)),"cal-chip-h"))});
      const box=document.getElementById("cal-day");
      box.innerHTML='<h3>'+esc(longDay(k))+(k===today?' <small>Today</small>':"")+'</h3>'+(rows.length?'<ul class="cal-rows">'+rows.join("")+'</ul>':'<p class="cal-empty">Nothing on this day.</p>');
      box.querySelectorAll("[data-career]").forEach(r=>{const go=()=>window.eviaFuture&&window.eviaFuture.session&&window.eviaFuture.session(r.dataset.career);r.onclick=go;r.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go()}}});
    }
    const DOW=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    function drawWeek(){
      const d=new Date(wkStart),cells=[];
      for(let i=0;i<7;i++){
        const k=dkey(d),o=byDay[k],h=by[k],g=o?(o.marks.length?(o.marks.find(x=>x.k==="none")||o.marks[0]).g:o.booked?"booked":o.coming?"coming":""):"";
        const dots=[g&&'<i class="cw-dot pv-a-'+g+'"></i>',o&&o.visits&&'<i class="cw-dot cw-dv"></i>',o&&o.careers&&'<i class="cw-dot cw-dc"></i>',h&&'<i class="cw-dot cw-dh"></i>'].filter(Boolean).join("");
        cells.push('<button type="button" class="cw-d'+(g?" cw-"+g:"")+(o&&o.visits?" cal-v":"")+(k===today?" pv-today":"")+'" data-day="'+k+'" aria-label="'+esc(longDay(k)+(g?": "+(LABEL[g]||g):"")+(o&&o.visits?", assessor visit":"")+(o&&o.careers?", careers session":"")+(h?", learning hours logged":""))+'"><small>'+DOW[i]+'</small><b>'+d.getDate()+'</b><span class="cw-dots">'+dots+'</span></button>');
        d.setDate(d.getDate()+1);
      }
      document.getElementById("cw-strip").innerHTML=cells.join("");
      const end=new Date(wkStart);end.setDate(end.getDate()+6);
      const same=wkStart.getMonth()===end.getMonth(),r=document.getElementById("cw-range");
      r.textContent=dkey(wkStart)===dkey(monday(new Date()))?"This week":wkStart.getDate()+(same?"":" "+wkStart.toLocaleDateString("en-GB",{month:"short"}))+"–"+end.getDate()+" "+end.toLocaleDateString("en-GB",{month:"short"});
      document.querySelectorAll("#cw-strip [data-day]").forEach(b=>b.onclick=()=>showDay(b.dataset.day));
      const keys=[...document.querySelectorAll("#cw-strip [data-day]")].map(b=>b.dataset.day);
      showDay(keys.includes(picked)?picked:keys.includes(today)?today:keys[0]);
    }
    const goTo=k=>{wkStart=monday(new Date(k+"T12:00:00"));picked=k;drawWeek()};
    drawWeek();
    document.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>{wkStart.setDate(wkStart.getDate()+7*b.dataset.w);picked=null;drawWeek()});
    document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>goTo(b.dataset.go));
    const on=(id,fn)=>{const b=document.getElementById(id);if(b)b.onclick=fn};
    on("cal-log",logHours);
    scr().querySelectorAll("[data-cd]").forEach(b=>b.onclick=()=>{const n=+b.dataset.cd,d=myDays();setDays(d.includes(n)?d.filter(x=>x!==n):d.concat(n));editDays=true;page()});
    on("cal-days-done",()=>{editDays=false;page()});
    on("cal-days-edit",()=>{editDays=true;page()});
    on("cal-checkin",()=>window.eviaCheckIn&&window.eviaCheckIn.open());
    on("cal-me",()=>window.eviaOpenProfile&&window.eviaOpenProfile());
    on("cal-msgs",()=>window.eviaMessages&&window.eviaMessages.open());
    on("cal-away",()=>inChat(()=>window.eviaTodo.away()));
    on("cal-logs",()=>window.eviaOpenLearningLogs&&window.eviaOpenLearningLogs());
    on("cw-month",()=>window.eviaProgressDeep("attendance"));
    if(window.eviaCareers&&!page.asked){page.asked=true;window.eviaCareers.load().finally(()=>{setTimeout(()=>{page.asked=false},30000)})}
  }
  window.addEventListener("evia-careers",()=>{if(typeof screen!=="undefined"&&screen==="calendar"&&!document.querySelector(".chat-sheet,#modal-root .pv-sheet"))(window.eviaTidy?window.eviaTidy.plan():page())});
  window.eviaCalendar={page,name:tabName};

  const prev=window.render;
  window.render=function(){
    if(screen!=="calendar")return prev();
    document.querySelectorAll("[data-nav]").forEach(b=>b.classList.toggle("active",b.dataset.nav==="calendar"));
    const s=scr();if(s)s.classList.add("ui-top");
    const t=document.getElementById("page-title");if(t)t.textContent=tabName();
    page();
  };
  /* New hours or a synced register while it's open: draw it again. */
  let t=null;
  if(window.eviaData&&window.eviaData.on)window.eviaData.on("change",()=>{clearTimeout(t);t=setTimeout(()=>{if(typeof screen!=="undefined"&&screen==="calendar"&&!document.querySelector(".chat-sheet,#modal-root .pv-sheet"))(window.eviaTidy?window.eviaTidy.plan():page())},300)});
})();
