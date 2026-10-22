/* Evia7 problem log: script errors and failed promises on this phone, kept so the learner can send them to their tutor
   (and, later, so Evia Portal receives them with everything else). Loaded before anything else. It keeps the last 50;
   the same problem again only counts up. Kept in localStorage (not IndexedDB) so it works from the first line.
   window.eviaErrors.list()  .log(message, {where, stack, kind})  .clear()  .text() */
(function(){
  const KEY="evia7-errors",MAX=50;
  const clip=(s,n)=>String(s==null?"":s).slice(0,n);
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v.filter(x=>x&&!IGNORE.test(x.message||"")):[]}catch(_){return []}};
  const write=list=>{try{localStorage.setItem(KEY,JSON.stringify(list.slice(-MAX)))}catch(_){}};
  const version=()=>{const m=[...document.scripts].map(s=>s.textContent).join(" ").match(/evia7-v\d+/);return m?m[0]:""};
  /* app.js's "screen" and "course" are page-wide variables; before it loads, "screen" is the browser's own object. */
  const place=()=>{try{return [typeof course==="string"?course:"",typeof screen==="string"?screen:""].filter(Boolean).join(" · ")}catch(_){return ""}};
  /* No signal isn't a fault in Evia: the sync waits and tries again, and the profile dot already says so. Left in, one
     night offline counted thousands of "Failed to fetch". */
  const IGNORE=/ResizeObserver loop|Script error\.?$|Failed to fetch|fetch failed|NetworkError|Load failed|network (error|connection was lost)|Internet connection appears to be offline|AuthRetryableFetchError|ERR_INTERNET_DISCONNECTED|ERR_NETWORK|didn.t answer in time/i;

  function log(message,extra){
    try{
      const e=extra||{},msg=clip(message,300).trim()||"Unknown problem",where=clip(e.where,200);
      if(IGNORE.test(msg))return;
      const list=read(),now=new Date().toISOString(),same=list.find(x=>x.message===msg&&x.where===where);
      if(same){same.count=(same.count||1)+1;same.lastAt=now;same.place=place()||same.place;list.splice(list.indexOf(same),1);list.push(same)}
      else list.push({id:"err-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6),message:msg,where,stack:clip(e.stack,1200),
        kind:e.kind||"error",place:place(),version:version(),at:now,lastAt:now,count:1});
      write(list);
    }catch(_){}
  }
  const text=()=>read().map(x=>x.lastAt.slice(0,16).replace("T"," ")+(x.count>1?" (×"+x.count+")":"")+"  "+x.message+
    (x.where?"\n  at "+x.where:"")+(x.place?"\n  in "+x.place:"")+(x.version?"  ["+x.version+"]":"")).join("\n\n");

  window.addEventListener("error",ev=>{
    if(ev.target&&ev.target!==window)return;   /* a picture or file that didn't load, not a script problem */
    const err=ev.error;
    log(err&&err.message||ev.message,{where:ev.filename?String(ev.filename).split("/").pop().replace(/\?.*$/,"")+":"+ev.lineno+":"+ev.colno:"",stack:err&&err.stack});
  },true);
  /* A page that stays empty after Evia starts (it broke while starting): say so, with what went wrong, instead of a
     blank screen, so the learner can show it to their tutor. */
  const blank=()=>{const sc=document.getElementById("screen"),app=document.getElementById("app");
    return sc&&app&&!app.classList.contains("welcome-app-hidden")&&!document.getElementById("welcome-screen")&&!sc.textContent.trim()&&!sc.querySelector("img,svg,canvas")};
  let checks=0;const watch=setInterval(()=>{
    if(++checks>15)return clearInterval(watch);
    if(checks<3||!blank())return;
    clearInterval(watch);
    const recent=read().slice(-3).reverse(),esc=t=>String(t).replace(/[<&>]/g,c=>({"<":"&lt;","&":"&amp;",">":"&gt;"}[c]));
    document.getElementById("screen").innerHTML='<div class="card" style="margin:16px"><h2 style="margin:0 0 8px">Evia didn’t start properly</h2><p style="margin:0 0 12px">Your work is safe. Tap Try again. If this keeps happening, send a screenshot of this to your tutor.</p>'+
      '<button type="button" class="primary" style="width:100%" onclick="location.reload()">Try again</button>'+
      '<pre style="white-space:pre-wrap;font-size:12px;margin:14px 0 0;color:#667085">'+esc(version()+"\n"+(recent.map(x=>x.message+(x.where?"\n  at "+x.where:"")+"\n  "+String(x.stack||"").split("\n").slice(1,4).map(l=>l.trim().replace(/https?:\/\/[^)\s]*\//g,"")).join(" < ")).join("\n\n")||"No error was recorded."))+'</pre></div>';
  },1000);
  window.addEventListener("unhandledrejection",ev=>{const r=ev.reason;log(r&&r.message||String(r),{stack:r&&r.stack,kind:"promise"})});
  /* Problems Evia catches and reports itself. */
  const original=console.error.bind(console);
  console.error=function(...args){
    original(...args);
    const err=args.find(a=>a instanceof Error);
    log(args.map(a=>a instanceof Error?a.message:typeof a==="string"?a:(()=>{try{return JSON.stringify(a)}catch(_){return String(a)}})()).join(" "),{stack:err&&err.stack,kind:"reported"});
  };

  window.eviaErrors={list:read,log,text,clear(){write([])}};
})();
