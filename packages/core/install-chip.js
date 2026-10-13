/* Install pop-up for the Evia Portal apps (Milos, Symi, Paros and the portal; Evia has its own). A small card at the
   bottom offers to install the app. When the browser offers its own install (Android and desktop Chrome or Edge), the
   card's button uses it. When it doesn't (it was dismissed before, an older copy is still remembered, Samsung
   Internet, an iPhone, or a link opened inside Gmail, WhatsApp or another app's browser), the card shows the steps
   for that phone and browser instead, so there's always a way to install.
   It stays away once installed, and for a week after ✕; the steps hide themselves after 20 seconds. Adding ?install
   to the address always shows it.
   data-fallback-only: the app has its own Install button for when the browser offers one; this only shows the steps.
   Use: <script src=".../install-chip.js" data-app="Paros" data-color="#F28C28" data-icon="icons/icon-192.png"></script> */
(function(){
  const me=document.currentScript,d=(me&&me.dataset)||{},name=d.app||"the app",color=d.color||"#0E9384",icon=d.icon||"",fallbackOnly=d.fallbackOnly!=null,KEY="nisia-install-later-"+name.toLowerCase();
  const ua=navigator.userAgent||"";
  const standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
  const force=/[?&]install\b/.test(location.search);
  const later=()=>{if(force)return false;try{return Date.now()-Number(localStorage.getItem(KEY)||0)<7*864e5}catch(_){return false}};
  const ios=/iphone|ipad|ipod/i.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const android=/android/i.test(ua);
  /* Another app's built-in browser: these can't install anything. */
  const inApp=/; ?wv\)|FBAN|FBAV|Instagram|Line\/|GSA\/|Snapchat|WhatsApp|Gmail/i.test(ua)||(ios&&!/safari/i.test(ua)&&!/crios|fxios|edgios/i.test(ua));
  const samsung=/SamsungBrowser/i.test(ua),firefox=/firefox|fxios/i.test(ua),edge=/edg/i.test(ua),iosChrome=/crios/i.test(ua);
  /* Android: one tap opens this same page in Chrome itself (from Gmail, WhatsApp, Facebook, or Chrome's own
     in-app tab, none of which can install). From Chrome it simply opens it again. */
  const inChrome="intent://"+location.host+location.pathname+location.search+"#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url="+encodeURIComponent(location.href)+";end";
  function steps(){
    if(inApp&&android)return {t:"Open "+name+" in Chrome to install it",s:"This window can't install apps. Tap Open in Chrome, then install it there.",go:"Open in Chrome",href:inChrome};
    if(inApp)return {t:"Open "+name+" in Safari to install it",s:"This window can't install apps. Tap Copy link, open Safari, paste it in the address bar, then Share › Add to Home Screen.",go:"Copy link",copy:true};
    if(ios)return {t:"Install "+name,s:(iosChrome?"Tap Share (top right), ":"Tap Share (the square with an arrow, at the bottom), ")+"then Add to Home Screen."};
    if(samsung)return {t:"Install "+name,s:"Tap ☰ (bottom right), then Add page to, then Home screen."};
    if(firefox)return {t:"Install "+name,s:"Tap ⋮, then Install (or Add to Home screen)."};
    if(android)return {t:"Install "+name,s:"Tap ⋮ (top right in Chrome), then Install app or Add to Home screen. No Install there? Tap Open in Chrome.",go:"Open in Chrome",href:inChrome};
    return {t:"Install "+name,s:edge?"Click the install icon in the address bar, or ⋯ then Apps, then Install.":"Click the install icon at the right of the address bar, or ⋮ then Cast, save and share, then Install page as app."};
  }
  let prompt=null,el=null;
  const prompt0=()=>{try{window.prompt("Copy this link, then open it in Safari:",location.href)}catch(_){}};
  function hide(){if(el){el.remove();el=null}}
  function show(){
    if(el||standalone()||later())return;
    if(prompt&&fallbackOnly)return;
    const st=steps();
    el=document.createElement("div");el.className="nisia-install";el.setAttribute("role","region");el.setAttribute("aria-label","Install "+name);
    el.innerHTML='<style>.nisia-install{position:fixed;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:9000;max-width:440px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:12px 12px 12px 14px;border-radius:18px;background:#fff;color:#172033;box-shadow:0 10px 32px rgba(16,24,40,.22);font:500 14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif}'+
      '.nisia-install b{display:block;font-size:15px}.nisia-install small{display:block;color:#4b5563;font-size:13.5px;margin-top:2px}.nisia-install .ni-ic{flex:none;width:44px;height:44px;border-radius:11px;background:'+color+';display:flex;align-items:center;justify-content:center;overflow:hidden}.nisia-install .ni-ic img{width:100%;height:100%}'+
      '.nisia-install button{font:inherit;cursor:pointer;border-radius:999px;min-height:40px;padding:8px 14px;border:0}.nisia-install .ni-go{background:'+color+';color:#fff;font-weight:700;flex:none;text-decoration:none;display:inline-flex;align-items:center;border-radius:999px;min-height:40px;padding:8px 14px}.nisia-install .ni-x{background:#eef0f3;color:#333;min-width:40px;padding:8px 0}'+
      '@media (prefers-color-scheme:dark){.nisia-install{background:#1d2633;color:#eef2f6}.nisia-install small{color:#b6c0cc}.nisia-install .ni-x{background:#2c3746;color:#eef2f6}}</style>'+
      '<span class="ni-ic" aria-hidden="true">'+(icon?'<img src="'+icon+'" alt="">':"")+'</span><span style="flex:1"><b>'+(prompt?"Install "+name:st.t)+'</b><small>'+(prompt?"Adds it to your home screen, like any other app.":st.s)+'</small></span>'+
      (prompt?'<button type="button" class="ni-go">Install</button>':st.href?'<a class="ni-go ni-link" href="'+st.href.replace(/"/g,"&quot;")+'">'+st.go+'</a>':st.copy?'<button type="button" class="ni-go ni-copy">'+st.go+'</button>':"")+'<button type="button" class="ni-x" aria-label="Not now">✕</button>';
    document.body.appendChild(el);
    const cp=el.querySelector(".ni-copy");if(cp)cp.onclick=async()=>{try{await navigator.clipboard.writeText(location.href);cp.textContent="Copied"}catch(_){prompt0()}};
    const go=el.querySelector("button.ni-go:not(.ni-copy)");if(go)go.onclick=async()=>{const p=prompt;prompt=null;hide();if(p){p.prompt();try{await p.userChoice}catch(_){}}};
    el.querySelector(".ni-x").onclick=()=>{try{localStorage.setItem(KEY,String(Date.now()))}catch(_){}hide()};
    /* The steps tidy themselves away after 20 seconds, so they never sit over the app's menu for long. */
    if(!prompt){const mine=el;setTimeout(()=>{if(el===mine)hide()},st.go?45000:20000)}
  }
  addEventListener("beforeinstallprompt",e=>{if(!fallbackOnly)e.preventDefault();prompt=e;hide();if(!fallbackOnly)setTimeout(show,1200)});
  addEventListener("appinstalled",()=>{prompt=null;hide()});
  /* No offer from the browser within a few seconds: show the steps instead. */
  /* (Not in automated test browsers, unless asked for with ?install: they never get the browser's own offer.) */
  const later2=()=>setTimeout(()=>{if(!prompt&&(force||!navigator.webdriver))show()},force?600:3500);
  if(document.readyState==="complete")later2();else addEventListener("load",later2);
  window.NisiaInstall={show:()=>{try{localStorage.removeItem(KEY)}catch(_){}show()}};
})();
