/* A meeting guest (someone added to a college for one meeting, to try Evia) has a demo that ends: their account is
   deleted by the college's server, and from then on this phone shows "This demo has ended" instead of Evia, with
   everything Evia kept on it cleared. Checked first, before anything of Evia loads. (nisia.js keeps the end time.) */
(function(){
  let ended=false;
  /* A new code (?pair=…) on a phone whose earlier demo ended starts afresh: the ended demo doesn't lock the phone. */
  try{if(/[?&]pair=/.test(location.search)&&localStorage.getItem("evia-demo-ended")==="1")["evia-demo-ended","evia-demo-ends","evia-demo-guest"].forEach(k=>localStorage.removeItem(k))}catch(_){}
  try{const ends=Number(localStorage.getItem("evia-demo-ends")||0);ended=localStorage.getItem("evia-demo-ended")==="1"||(ends>0&&Date.now()>=ends);if(ended)localStorage.setItem("evia-demo-ended","1")}catch(_){}
  if(!ended)return;
  window.EVIA_DEMO_ENDED=true;
  try{Object.keys(localStorage).filter(k=>/^evia7-/.test(k)).forEach(k=>localStorage.removeItem(k))}catch(_){}
  try{["evia7-app-data","evia7-evidence-db","evia7-supporting-files"].forEach(n=>indexedDB.deleteDatabase(n))}catch(_){}
  try{caches.keys().then(ks=>ks.filter(k=>/evia/i.test(k)).forEach(k=>caches.delete(k)))}catch(_){}
  const show=()=>{document.body.innerHTML='<main style="min-height:100vh;display:grid;place-items:center;padding:28px;text-align:center;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#fffdfa;color:#172033">'+
    '<div style="max-width:340px"><h1 style="font-size:26px;margin:0 0 10px">This demo has ended</h1><p style="margin:0;color:#667085;font-size:16px;line-height:1.5">Thank you for trying Evia. Everything from the demo has been deleted.</p></div></main>';};
  if(document.body)show();else document.addEventListener("DOMContentLoaded",show);
})();
/* Evia7: get the app first. Opened in a phone's browser, Evia asks the learner to install the app before anything else,
   so their profile and evidence are kept in the app from the start. One button: the App Store or Google Play once the
   listings are live (STORE below); until then it installs Evia from the browser (Android), or shows the two taps to add
   it to the Home Screen (iPhone). Not shown inside the installed app. Opened inside another app's browser (WhatsApp,
   Gmail…), which can't install anything, it opens Evia in Chrome (Android) or copies the link for Safari (iPhone).
   A phone that still can't install it carries on in the browser ("Can't install it?", for two weeks before asking
   again): once Evia is connected to the college, the learner's work is kept there too. ?browser in the address skips
   it until the tab is closed. Loaded before everything else, so it can catch Android's install prompt. */
(function(){
  const STORE={ios:"",android:""};   /* App Store and Google Play links, once the listings are live */
  const ua=navigator.userAgent||"";
  const ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1),android=/Android/i.test(ua);
  const installed=()=>{try{return matchMedia("(display-mode: standalone)").matches||matchMedia("(display-mode: fullscreen)").matches||navigator.standalone===true||!!window.Capacitor||/EviaApp/.test(ua)}catch(_){return false}};
  let prompt=null;
  addEventListener("beforeinstallprompt",e=>{e.preventDefault();prompt=e;const b=document.getElementById("gi-go");if(b)b.disabled=false});
  addEventListener("appinstalled",()=>done("Evia is installed. Open it from your Home Screen."));
  /* Another app's built-in browser (WhatsApp, Gmail, Facebook, Instagram…): nothing can be installed from there. */
  const inApp=/; ?wv\)|FBAN|FBAV|Instagram|Line\/|GSA\/|Snapchat|WhatsApp|Gmail/i.test(ua)||(ios&&!/safari/i.test(ua)&&!/crios|fxios|edgios/i.test(ua));
  const samsung=/SamsungBrowser/i.test(ua),iosChrome=/CriOS/i.test(ua);
  /* Android: opens this same page in Chrome itself, which can install (from Chrome it just opens it again). */
  const inChrome="intent://"+location.host+location.pathname+location.search+"#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url="+encodeURIComponent(location.href)+";end";
  /* A learner whose phone can't install it carries on in the browser: their work still goes to the college. */
  /* (Not an "evia7-" name: those move into Evia's database, which loads after this has to decide.) */
  const USE_BROWSER="evia-install-browser";
  /* ?install brings this screen back for a phone that chose the browser earlier. */
  try{if(/[?&]install\b/.test(location.search)){localStorage.removeItem(USE_BROWSER);sessionStorage.removeItem("evia7-install-later")}}catch(_){}
  const skipped=()=>{try{if(/[?&]browser\b/.test(location.search))sessionStorage.setItem("evia7-install-later","1");return sessionStorage.getItem("evia7-install-later")==="1"||Date.now()-Number(localStorage.getItem(USE_BROWSER)||0)<14*864e5}catch(_){return false}};
  if(window.EVIA_DEMO_ENDED||installed()||skipped()||!(ios||android))return;

  const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const label=ios&&STORE.ios?"Download on the App Store":android&&STORE.android?"Get it on Google Play":inApp&&android?"Open in Chrome":inApp?"Copy the link for Safari":"Get the app";
  function show(){
    if(document.getElementById("get-app"))return;
    const s=document.createElement("style");
    s.textContent=`
      #get-app{position:fixed;inset:0;z-index:10100;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:max(28px,env(safe-area-inset-top)) 24px max(28px,env(safe-area-inset-bottom));background:var(--bg,#fffdfa);text-align:center;font-family:inherit;overflow:auto}
      #get-app .gi-evia{width:96px;height:96px;border-width:5px}
      #get-app .gi-evia .evia-face{gap:11px}
      #get-app .gi-evia .evia-face i{width:18px!important;height:24px!important;border-width:4px!important}
      #get-app h1{margin:0;font-size:26px;line-height:1.15;letter-spacing:-.02em;color:#172033}
      #get-app p{margin:0;max-width:320px;font-size:15px;line-height:1.5;color:#667085}
      #get-app .gi-body{width:100%;display:flex;justify-content:center}
      #get-app .gi-go{width:min(340px,100%);min-height:56px;border-radius:18px;font-size:17px;font-weight:800}
      #get-app .gi-steps{display:grid;gap:10px;width:min(340px,100%);text-align:left}
      #get-app .gi-step{display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:16px;background:#fff;border:1px solid rgba(16,24,40,.08);font-size:15px;color:#172033}
      #get-app .gi-step b{flex:0 0 28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--soft,#fff7d6);color:var(--yellow-ink,#6e5c00)}
      #get-app .gi-why{font-weight:600;color:#172033}
      #get-app .gi-browser{display:block;margin-top:4px;background:none;border:0;padding:10px;font:inherit;font-size:14px;color:#667085;text-decoration:underline;cursor:pointer}
      #get-app .gi-step svg{width:20px;height:20px;vertical-align:-4px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}`;
    document.head.appendChild(s);
    const el=document.createElement("div");el.id="get-app";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-labelledby","gi-title");
    el.innerHTML='<span class="evia-mini gi-evia" aria-hidden="true"><span class="evia-face"><i></i><i></i></span></span>'+
      '<h1 id="gi-title">Get the Evia app</h1><p>Install Evia first, so your profile and evidence are saved safely on your phone.</p>'+
      (inApp?'<p class="gi-why">This window can’t install apps. '+(android?'Open Evia in Chrome, then install it there.':'Copy the link, open Safari, paste it in, then add Evia to your Home Screen.')+'</p>':'')+
      '<div class="gi-body"><button type="button" class="primary gi-go" id="gi-go">'+esc(label)+'</button></div>'+
      '<button type="button" class="gi-browser" id="gi-browser">Can’t install it? Use Evia in this browser</button>';
    document.body.appendChild(el);
    el.querySelector("#gi-go").onclick=go;
    el.querySelector("#gi-browser").onclick=()=>{try{localStorage.setItem(USE_BROWSER,String(Date.now()))}catch(_){}el.remove()};
  }
  const SHARE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3.5"/><path d="m7.5 8 4.5-4.5L16.5 8"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/></svg>';
  const PLUS='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>';
  async function go(){
    if(ios&&STORE.ios){location.href=STORE.ios;return}
    if(android&&STORE.android){location.href=STORE.android;return}
    if(inApp&&android){location.href=inChrome;return}
    if(inApp){try{await navigator.clipboard.writeText(location.href);const b=document.getElementById("gi-go");if(b)b.textContent="Copied. Now open Safari and paste it"}catch(_){try{window.prompt("Copy this link, then open it in Safari:",location.href)}catch(_){}}return}
    if(prompt){prompt.prompt();try{const r=await prompt.userChoice;if(r&&r.outcome==="accepted")done("Evia is installing. Open it from your Home Screen.")}catch(_){}prompt=null;return}
    /* iPhone (and Android browsers without the install prompt): the taps to add Evia to the Home Screen. */
    const body=document.querySelector("#get-app .gi-body");if(!body)return;
    body.innerHTML='<div class="gi-steps">'+(ios?
      '<div class="gi-step"><b>1</b><span>Tap '+SHARE+' <strong>Share</strong> '+(iosChrome?'at the top right':'at the bottom of Safari')+'</span></div><div class="gi-step"><b>2</b><span>Tap '+PLUS+' <strong>Add to Home Screen</strong>, then <strong>Add</strong></span></div><div class="gi-step"><b>3</b><span>Open Evia from your Home Screen</span></div>':
      (samsung?'<div class="gi-step"><b>1</b><span>Tap the <strong>☰</strong> menu at the bottom right</span></div><div class="gi-step"><b>2</b><span>Tap <strong>Add page to</strong>, then <strong>Home screen</strong></span></div>':
      '<div class="gi-step"><b>1</b><span>Tap the <strong>⋮</strong> menu at the top right of Chrome</span></div><div class="gi-step"><b>2</b><span>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong></span></div>')+
      '<div class="gi-step"><b>3</b><span>Open Evia from your Home Screen</span></div>')+'</div>'+
      (android&&!samsung?'<a class="gi-browser" href="'+esc(inChrome)+'">Not in Chrome, or no Install there? Open in Chrome</a>':'');
  }
  function done(text){const el=document.getElementById("get-app");if(!el)return;const b=el.querySelector(".gi-body");if(b)b.innerHTML='<p><strong>'+esc(text)+'</strong></p>'}
  if(document.body)show();else addEventListener("DOMContentLoaded",show);
  window.eviaInstall={show,installed};
})();
