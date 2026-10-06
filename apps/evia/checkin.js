/* Checking in to a class: the learner scans the code on the classroom screen (Symi, the tutor's app), or types the
   6 characters under it. Nisia checks it: the code changes every 20 seconds, so a photo of it sent to someone who
   isn't there has expired before they can use it. Checking in ticks the learner on the tutor's register; the tutor
   confirms the hours at the end, and they arrive in the learning log (nisia.js). With no signal, the scan is kept
   and sent later; Nisia records it at the time it was scanned (the code proves when it was on the screen).
   Phones with a built-in QR reader (Android) use it; others (iPhone) use jsQR, loaded only when it's needed.
   window.eviaCheckIn.open() */
(function(){
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let stream=null,timer=null,layer=null,busy=false;
  const stop=()=>{clearInterval(timer);timer=null;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}};
  const close=()=>{stop();if(layer){layer.remove();layer=null}busy=false};

  function loadJsQR(){
    if(window.jsQR)return Promise.resolve();
    return new Promise((res,rej)=>{const s=document.createElement("script");s.src="vendor/jsqr-1.4.0.min.js";s.onload=res;s.onerror=()=>rej(new Error("no reader"));document.head.appendChild(s)});
  }
  async function reader(video){
    if("BarcodeDetector" in window){
      try{const f=await BarcodeDetector.getSupportedFormats();if(f.includes("qr_code")){const d=new BarcodeDetector({formats:["qr_code"]});return async()=>((await d.detect(video))[0]||{}).rawValue||""}}catch(_){}
    }
    await loadJsQR();
    const fn=typeof window.jsQR==="function"?window.jsQR:window.jsQR&&window.jsQR.default,cv=document.createElement("canvas"),cx=cv.getContext("2d",{willReadFrequently:true});
    return async()=>{
      const w=video.videoWidth,h=video.videoHeight;if(!w||!h)return "";
      const k=Math.min(1,720/Math.max(w,h));cv.width=Math.round(w*k);cv.height=Math.round(h*k);
      cx.drawImage(video,0,0,cv.width,cv.height);const img=cx.getImageData(0,0,cv.width,cv.height);
      const r=fn(img.data,cv.width,cv.height,{inversionAttempts:"dontInvert"});return r?r.data:"";
    };
  }

  function frame(html){
    if(!layer){layer=document.createElement("div");layer.id="ci-view";layer.setAttribute("role","dialog");layer.setAttribute("aria-modal","true");layer.setAttribute("aria-label","Check in to class");document.body.appendChild(layer)}
    layer.className="";layer.innerHTML=html;return layer;
  }
  async function open(){
    if(busy)return;busy=true;
    const e=window.eviaNisia&&window.eviaNisia.joined();
    if(!e||!e.live){busy=false;return typed("Connect Evia to your college first. Then you can check in to your classes.",true)}
    const can=!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
    if(!can){busy=false;return typed()}
    const el=frame('<video playsinline muted></video><div class="ci-frame" aria-hidden="true"></div>'+
      '<div class="ci-foot"><p><strong>Scan the code on the classroom screen</strong></p><div class="ci-btns"><button type="button" class="secondary" data-ci-type>Type the code</button><button type="button" class="secondary" data-ci-close>Cancel</button></div></div>');
    el.classList.add("ci-scan");
    el.querySelector("[data-ci-close]").onclick=close;
    el.querySelector("[data-ci-type]").onclick=()=>{stop();typed()};
    const video=el.querySelector("video");
    try{
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
      video.srcObject=stream;await video.play();
      const read=await reader(video);
      timer=setInterval(async()=>{
        if(!stream)return;
        let v="";try{v=await read()}catch(_){}
        if(/^NISI:IN:\d+:/.test(v)){stop();submit(v)}
        else if(v&&!/^NISI:IN:/.test(v))el.querySelector(".ci-foot p").innerHTML="<strong>That’s not a check-in code.</strong> Scan the one on the classroom screen.";
      },300);
    }catch(_){stop();typed("Evia couldn’t use the camera. Type the 6 characters under the code instead.")}
  }
  function typed(msg,noInput){
    busy=true;
    const el=frame('<section class="ci-sheet"><h2>Check in to class</h2><p class="ci-say">'+esc(msg||"Type the 6 characters under the code on the classroom screen. They change every 20 seconds.")+'</p>'+
      (noInput?"":'<form class="ci-form"><input class="ci-code" maxlength="7" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" aria-label="Check-in code" placeholder="ABC 123"><button type="submit" class="primary">Check in</button></form>')+
      '<button type="button" class="secondary ci-cancel" data-ci-close>'+(noInput?"OK":"Cancel")+'</button></section>');
    el.classList.add("ci-dim");
    el.querySelector("[data-ci-close]").onclick=close;
    const f=el.querySelector(".ci-form");
    if(f){const i=f.querySelector("input");i.focus();f.onsubmit=ev=>{ev.preventDefault();const v=i.value.toUpperCase().replace(/[^A-Z0-9]/g,"");if(v.length===6)submit(v);else i.select()}}
  }
  async function submit(code){
    const el=frame('<section class="ci-sheet ci-wait"><span class="ci-spin" aria-hidden="true"></span><p>Checking you in…</p></section>');el.classList.add("ci-dim");
    try{
      const r=await window.eviaNisia.checkIn(code);
      if(r&&r.queued){
        frame('<section class="ci-sheet ci-done ci-saved"><span class="ci-tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg></span>'+
          '<h2>Saved: no signal here</h2><p class="ci-class">'+esc(r.class||"")+(r.lesson?'<br><span>'+esc(r.lesson)+'</span>':"")+'</p>'+
          '<p class="ci-say">Evia sends your check-in as soon as she has signal, and it counts from now ('+esc(new Date(r.at).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}))+'). Your tutor can see it was made offline.</p>'+
          '<button type="button" class="primary" data-ci-close>Done</button></section>').classList.add("ci-dim");
        layer.querySelector("[data-ci-close]").onclick=close;
        if(window.eviaMood)try{window.eviaMood("happy")}catch(_){}
        return;
      }
      const at=r&&r.at?new Date(r.at).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}):"";
      frame('<section class="ci-sheet ci-done"><span class="ci-tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg></span>'+
        '<h2>'+(r&&r.again?"You’re already checked in":"You’re checked in")+'</h2><p class="ci-class">'+esc(r&&r.class||"")+(r&&r.lesson?'<br><span>'+esc(r.lesson)+'</span>':"")+'</p>'+
        '<p class="ci-say">'+(at?"At "+esc(at)+". ":"")+(r&&r.late?"You were marked late. ":"")+'Your tutor confirms your hours at the end of the session, then they’re in your learning log.</p>'+
        '<button type="button" class="primary" data-ci-close>Done</button></section>').classList.add("ci-dim");
      layer.querySelector("[data-ci-close]").onclick=close;
      if(window.eviaMood)try{window.eviaMood("happy")}catch(_){}
    }catch(err){
      frame('<section class="ci-sheet"><h2>Not checked in</h2><p class="ci-say">'+esc(err.message||"That didn’t work.")+'</p><div class="ci-btns"><button type="button" class="primary" data-ci-again>Scan again</button><button type="button" class="secondary" data-ci-close>Cancel</button></div></section>').classList.add("ci-dim");
      layer.querySelector("[data-ci-close]").onclick=close;
      layer.querySelector("[data-ci-again]").onclick=()=>{busy=false;open()};
    }
  }
  window.eviaCheckIn={open,close};
})();
