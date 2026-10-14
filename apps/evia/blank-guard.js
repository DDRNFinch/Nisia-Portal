/* Evia7: never left on an empty page. A few seconds after Evia opens, and whenever it's come back to, it checks that
   something is showing above the bottom bar. If nothing is (the page and its heading hidden, no welcome screen, sheet or
   lesson open), it notes what was covering the page in the problem log, so it reaches the college with the rest, and goes
   back to Topics. */
(function(){
  const OVERLAYS="#welcome-screen,#get-app,#evia-theme-screen,#evia-onboard-course,.evia-guide,.ui-sheet,.modal,.lesson,[role=dialog]";
  const desc=el=>{const out=[];for(let e=el,i=0;e&&e!==document.documentElement&&i<5;e=e.parentElement,i++){
    const cs=getComputedStyle(e);out.push(e.tagName.toLowerCase()+(e.id?"#"+e.id:"")+(typeof e.className==="string"&&e.className.trim()?"."+e.className.trim().split(/\s+/).slice(0,3).join("."):"")+
      (cs.opacity!=="1"?"[o="+cs.opacity+"]":"")+(cs.visibility!=="visible"?"[v="+cs.visibility+"]":""))}return out.join(" < ")};
  const seen=el=>{if(!el)return false;const r=el.getBoundingClientRect();if(r.width<2||r.height<2)return false;
    for(let e=el;e&&e!==document.documentElement;e=e.parentElement){const cs=getComputedStyle(e);if(cs.display==="none"||cs.visibility==="hidden"||Number(cs.opacity)<.05)return false}return true};
  function blank(){
    if(document.hidden||document.documentElement.classList.contains("evia-booting")||window.EVIA_DEMO_ENDED)return null;
    if([...document.querySelectorAll(OVERLAYS)].some(seen))return null;
    if(document.querySelector("#modal-root")&&[...document.querySelectorAll("#modal-root > *")].some(seen))return null;
    const scr=document.getElementById("screen"),title=document.getElementById("page-title");
    const shows=seen(scr)&&(scr.innerText||"").trim().length>0;
    if(shows)return null;
    /* What's at the middle of the page, where the content should be. */
    const hit=document.elementFromPoint(innerWidth/2,innerHeight*.4);
    return {hit:hit?desc(hit):"none",screen:scr?desc(scr):"no #screen",title:title?desc(title):"no title",
      text:scr?(scr.innerText||"").trim().length:-1,nav:typeof screen==="string"?screen:"",body:document.body.className.slice(0,80),app:(document.getElementById("app")||{}).className||""};
  }
  let busy=false;
  function check(why){
    if(busy)return;const b=blank();if(!b)return;busy=true;
    try{window.eviaErrors&&window.eviaErrors.log("Empty page ("+why+"), went back to Topics",{kind:"blank",where:JSON.stringify(b).slice(0,600)})}catch(_){}
    try{const app=document.getElementById("app");if(app)app.classList.remove("welcome-app-hidden","welcome-app-visible")}catch(_){}
    try{if(typeof nav==="function")nav("course")}catch(err){try{window.eviaErrors&&window.eviaErrors.log("Topics after an empty page: "+(err&&err.message),{kind:"blank"})}catch(_){}}
    setTimeout(()=>{busy=false;const still=blank();if(still)try{window.eviaErrors&&window.eviaErrors.log("Still empty after going back to Topics",{kind:"blank",where:JSON.stringify(still).slice(0,600)})}catch(_){}},1500);
  }
  addEventListener("load",()=>setTimeout(()=>check("open"),6000));
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(()=>check("back"),2500)});
  window.eviaBlankCheck=blank;
})();
