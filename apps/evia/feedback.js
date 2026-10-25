/* Rate Evia: at the bottom of Review, whenever the learner likes. Stars (1 to 5) and what they think (both needed), then
   "Share my usage over time and send": their rating, their words and the numbers of their time with Evia, week by week
   (evidence, learning hours, lessons, tests), to Evia Portal with no name, no photos, no write-ups and no identifier.
   "Send without my usage" sends just the rating and words. Sent without signal, it waits and goes when there is one.
     window.eviaRate.open()   the sheet      .sub()   the line under the row on Review      .summary()   what's shared */
(function(){
  const URL="https://ffgfigkeeeauzkifopei.supabase.co/rest/v1/rpc/nisia_feedback_send",API="sb_publishable_w_R4Kqq3UqNKQuv6erQzAQ_bXBkw8Bc";
  const LAST="evia7-rated",WAIT="evia7-rate-waiting",DAY=864e5,WEEK=7*DAY,MIN=10;
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||"null")||d}catch(_){return d}};
  const write=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
  const D=()=>window.eviaData;
  const list=c=>{try{return D().list(c)||[]}catch(_){return []}};
  const t=v=>{const n=typeof v==="number"?v:Date.parse(v||"");return isFinite(n)&&n>0?n:0};
  /* Not counted: the testers, and the owner's own phones (set from Evia Portal's Usage page). */
  const tester=()=>{try{return /-ui\//.test(location.pathname)||/^(localhost|127\.)/.test(location.hostname)||localStorage.getItem("nisia-not-counted")==="1"}catch(_){return false}};
  const platform=()=>{const u=navigator.userAgent,app=(matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone;
    return (/iP(hone|ad|od)/.test(u)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1)?"ios":/Android/.test(u)?"android":"desktop")+(app?"-app":"-web")};
  const version=()=>((document.querySelector('meta[name="evia-version"]')||{}).content)||"";

  /* Their time with Evia in numbers: week 1 is the week they started (their start date, or their first record). */
  function summary(){
    const ev=list("evidence").map(r=>t(r.createdAt)),sup=list("supporting").map(r=>t(r.createdAt)),
      hrs=list("hours").map(r=>[t(r.occurredAt||r.createdAt),(Number(r.minutes)||0)/60,r.source]),
      les=list("lessonResults").filter(r=>r.done).map(r=>t(r.lastAt||r.updatedAt)),tst=list("tests").map(r=>t(r.takenAt));
    let start=0;try{const en=D().enrolment&&D().enrolment(),p=(D().learner&&D().learner())||{};start=t((en&&en.start)||p.start)}catch(_){}
    const all=[...ev,...sup,...hrs.map(h=>h[0]),...les,...tst].filter(Boolean);
    const first=all.length?Math.min(...all):Date.now();
    if(!start||start>first)start=first;
    const weeks=Math.max(1,Math.ceil((Date.now()-start)/WEEK)),n=Math.min(weeks,156),w=x=>Math.floor((x-start)/WEEK);
    const by=Array.from({length:n},(_,i)=>({w:i+1,e:0,s:0,h:0,l:0,t:0}));
    const add=(x,k,v)=>{const i=w(x);if(x&&i>=0&&i<n)by[i][k]+=v};
    ev.forEach(x=>add(x,"e",1));sup.forEach(x=>add(x,"s",1));hrs.forEach(h=>add(h[0],"h",h[1]));les.forEach(x=>add(x,"l",1));tst.forEach(x=>add(x,"t",1));
    by.forEach(b=>b.h=Math.round(b.h*10)/10);
    let ksb=null;try{const a=window.eviaStats.compute().a;ksb={met:a.met,total:a.total}}catch(_){}
    let aim=null;try{const en=D().enrolment&&D().enrolment(),p=D().learner()||{},s=t((en&&en.start)||p.start),e=t((en&&en.end)||p.end),pl=Number(en&&en.plannedOtjHours);if(pl>0&&e>s)aim=Math.round(pl/((e-s)/WEEK)*10)/10}catch(_){}
    let connected=false;try{connected=!!(window.eviaNisia&&window.eviaNisia.joined&&window.eviaNisia.joined())}catch(_){}
    const sum=k=>Math.round(by.reduce((a,b)=>a+b[k],0)*10)/10;
    return {weeks,active_weeks:by.filter(b=>b.e||b.s||b.h||b.l||b.t).length,aim_per_week:aim,connected,ksbs:ksb,
      totals:{evidence:sum("e"),supporting:sum("s"),hours:sum("h"),lessons:sum("l"),tests:sum("t"),reviews:list("reviews").length,
        college_hours:Math.round(hrs.filter(h=>h[2]==="college").reduce((a,h)=>a+h[1],0)*10)/10},
      by_week:by};
  }

  async function post(body){
    const r=await fetch(URL,{method:"POST",headers:{"Content-Type":"application/json",apikey:API},body:JSON.stringify({p:body})});
    if(!r.ok)throw new Error("HTTP "+r.status);
  }
  /* Anything that couldn't go (no signal), sent when there is one. */
  async function flush(){
    const q=read(WAIT,[]);if(!q.length||!navigator.onLine)return;
    const left=[];for(const b of q){try{await post(b)}catch(_){left.push(b)}}
    write(WAIT,left.length?left:null);
  }
  async function send(stars,words,withUsage){
    let c="";try{c=typeof course==="string"?course:""}catch(_){}
    /* A random code made on this phone, so rating again counts once in the results; it isn't tied to anyone. */
    let fid=read("evia7-rate-fid",null);if(!fid){fid=Math.random().toString(36).slice(2)+Date.now().toString(36);write("evia7-rate-fid",fid)}
    const body={stars,comment:words.slice(0,2000),app:"evia",fid,version:version(),platform:platform(),course:c.slice(0,24),tester:tester(),usage:withUsage?summary():null};
    write(LAST,{stars,at:Date.now()});
    try{if(!navigator.onLine)throw 0;await post(body);return true}
    catch(_){const q=read(WAIT,[]);q.push(body);write(WAIT,q.slice(-5));return false}
  }

  function sub(){
    const l=read(LAST,null);
    return l?"You gave "+l.stars+" star"+(l.stars===1?"":"s")+" · rate again any time":"Tell us what you think: it helps Evia get better";
  }
  const STAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/></svg>';
  const SAY=["","Not for me","Needs work","It’s OK","Really good","Love it"];
  function open(){
    if(document.querySelector(".er-wrap"))return;
    let stars=0;
    const o=document.createElement("div");o.className="th-sheet-wrap er-wrap";
    o.innerHTML='<section class="th-sheet th-tall" role="dialog" aria-modal="true" aria-labelledby="er-t"><header class="th-sheet-head"><h2 id="er-t">Rate Evia</h2><button type="button" class="th-x" aria-label="Close">×</button></header>'+
      '<div class="th-group th-form"><div class="th-q"><span class="th-qt">How would you rate Evia?</span>'+
        '<span class="er-stars" role="radiogroup" aria-label="Stars">'+[1,2,3,4,5].map(i=>'<button type="button" class="er-star" role="radio" aria-checked="false" aria-label="'+i+' star'+(i>1?"s":"")+'" data-s="'+i+'">'+STAR+'</button>').join("")+'</span>'+
        '<small class="er-say" aria-live="polite">Tap a star</small></div>'+
      '<div class="th-q"><label class="th-qt" for="er-words">What do you think of Evia?</label><textarea class="th-ta" id="er-words" rows="4" maxlength="2000" placeholder="What you like, what’s missing, what would make it better"></textarea><small class="er-left"></small></div></div>'+
      '<details class="er-what"><summary>What’s shared</summary><p>Your stars and what you write, your course, and the numbers of your time with Evia, week by week: evidence added, learning hours, lessons and tests done, and how many of your '+esc(window.eviaTerm?window.eviaTerm().many:"KSBs")+' are covered.</p><p>Never your name, photos, write-ups or anything that says who you are.</p></details>'+
      '<div class="th-btns th-sticky"><button type="button" class="primary" id="er-send" disabled>Share my usage over time and send</button><button type="button" class="er-plain" id="er-just" disabled>Send without my usage</button></div></section>';
    const close=()=>o.remove(),words=o.querySelector("#er-words"),go=o.querySelector("#er-send"),just=o.querySelector("#er-just"),left=o.querySelector(".er-left");
    o.querySelector(".th-x").onclick=close;
    o.addEventListener("click",e=>{if(e.target===o)close()});
    const check=()=>{const n=words.value.trim().length,ok=stars>0&&n>=MIN;go.disabled=just.disabled=!ok;
      left.textContent=n>=MIN?"":stars?"A few more words, please ("+(MIN-n)+" more letters)":"";};
    o.querySelectorAll(".er-star").forEach(b=>b.onclick=()=>{stars=+b.dataset.s;
      o.querySelectorAll(".er-star").forEach(x=>{const on=+x.dataset.s<=stars;x.classList.toggle("on",on);x.setAttribute("aria-checked",String(+x.dataset.s===stars))});
      o.querySelector(".er-say").textContent=SAY[stars];check();if(!words.value.trim())words.focus()});
    words.oninput=check;
    const done=async withUsage=>{go.disabled=just.disabled=true;go.textContent="Sending…";
      const ok=await send(stars,words.value.trim(),withUsage);close();
      if(typeof showEvidenceToast==="function")showEvidenceToast(ok?"Thank you! Your feedback is with Evia’s team":"Saved: it’ll send when you have signal");
      if(typeof screen!=="undefined"&&screen==="learning"&&typeof render==="function")render()};
    go.onclick=()=>done(true);just.onclick=()=>done(false);
    document.body.appendChild(o);check();
  }
  window.eviaRate={open,sub,summary,flush};
  addEventListener("online",()=>setTimeout(flush,4000));
  addEventListener("load",()=>setTimeout(flush,9000));
})();
