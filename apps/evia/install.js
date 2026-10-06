/* Evia7: get the app first. Opened in a phone's browser, Evia asks the learner to install the app before anything else,
   so their profile and evidence are kept in the app from the start. One button: the App Store or Google Play once the
   listings are live (STORE below); until then it installs Evia from the browser (Android), or shows the two taps to add
   it to the Home Screen (iPhone). Not shown inside the installed app. There's no carrying on in the browser: what's
   saved there can be lost, so the learner's profile and evidence would be too. For testing only, ?browser in the
   address skips it until the tab is closed. Loaded before everything else, so it can catch Android's install prompt. */
(function(){
  const STORE={ios:"",android:""};   /* App Store and Google Play links, once the listings are live */
  const ua=navigator.userAgent||"";
  const ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1),android=/Android/i.test(ua);
  const installed=()=>{try{return matchMedia("(display-mode: standalone)").matches||matchMedia("(display-mode: fullscreen)").matches||navigator.standalone===true||!!window.Capacitor||/EviaApp/.test(ua)}catch(_){return false}};
  let prompt=null;
  addEventListener("beforeinstallprompt",e=>{e.preventDefault();prompt=e;const b=document.getElementById("gi-go");if(b)b.disabled=false});
  addEventListener("appinstalled",()=>done("Evia is installed. Open it from your Home Screen."));
  const skipped=()=>{try{if(/[?&]browser\b/.test(location.search))sessionStorage.setItem("evia7-install-later","1");return sessionStorage.getItem("evia7-install-later")==="1"}catch(_){return false}};
  if(installed()||skipped()||!(ios||android))return;

  const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const label=ios&&STORE.ios?"Download on the App Store":android&&STORE.android?"Get it on Google Play":"Get the app";
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
      #get-app .gi-step svg{width:20px;height:20px;vertical-align:-4px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}`;
    document.head.appendChild(s);
    const el=document.createElement("div");el.id="get-app";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-labelledby","gi-title");
    el.innerHTML='<span class="evia-mini gi-evia" aria-hidden="true"><span class="evia-face"><i></i><i></i></span></span>'+
      '<h1 id="gi-title">Get the Evia app</h1><p>Install Evia first, so your profile and evidence are saved safely on your phone.</p>'+
      '<div class="gi-body"><button type="button" class="primary gi-go" id="gi-go">'+esc(label)+'</button></div>';
    document.body.appendChild(el);
    el.querySelector("#gi-go").onclick=go;
  }
  const SHARE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3.5"/><path d="m7.5 8 4.5-4.5L16.5 8"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/></svg>';
  const PLUS='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>';
  async function go(){
    if(ios&&STORE.ios){location.href=STORE.ios;return}
    if(android&&STORE.android){location.href=STORE.android;return}
    if(prompt){prompt.prompt();try{const r=await prompt.userChoice;if(r&&r.outcome==="accepted")done("Evia is installing. Open it from your Home Screen.")}catch(_){}prompt=null;return}
    /* iPhone (and Android browsers without the install prompt): the taps to add Evia to the Home Screen. */
    const body=document.querySelector("#get-app .gi-body");if(!body)return;
    body.innerHTML='<div class="gi-steps">'+(ios?
      '<div class="gi-step"><b>1</b><span>Tap '+SHARE+' <strong>Share</strong> at the bottom of Safari</span></div><div class="gi-step"><b>2</b><span>Tap '+PLUS+' <strong>Add to Home Screen</strong>, then <strong>Add</strong></span></div><div class="gi-step"><b>3</b><span>Open Evia from your Home Screen</span></div>':
      '<div class="gi-step"><b>1</b><span>Tap the <strong>⋮</strong> menu at the top of your browser</span></div><div class="gi-step"><b>2</b><span>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong></span></div><div class="gi-step"><b>3</b><span>Open Evia from your Home Screen</span></div>')+'</div>';
  }
  function done(text){const el=document.getElementById("get-app");if(!el)return;const b=el.querySelector(".gi-body");if(b)b.innerHTML='<p><strong>'+esc(text)+'</strong></p>'}
  if(document.body)show();else addEventListener("DOMContentLoaded",show);
  window.eviaInstall={show,installed};
})();
