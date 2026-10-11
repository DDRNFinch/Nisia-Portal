/* Install button for the Nisia apps that don't have their own (Paros, the Nisia portal). A small pill offers to install
   the app when the phone or computer allows it (Android and desktop Chrome or Edge); on an iPhone it explains Share →
   Add to Home Screen. It stays away once installed, and for two weeks after "Not now".
   Use: <script src=".../install-chip.js" data-app="Paros" data-color="#F28C28" data-icon="icons/icon-192.png"></script> */
(function(){
  const me=document.currentScript,name=(me&&me.dataset.app)||"the app",color=(me&&me.dataset.color)||"#0E9384",icon=(me&&me.dataset.icon)||"",KEY="nisia-install-later-"+name.toLowerCase();
  const standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
  const later=()=>{try{return Date.now()-Number(localStorage.getItem(KEY)||0)<14*864e5}catch(_){return false}};
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)&&!/crios|fxios/i.test(navigator.userAgent);
  let prompt=null,el=null;
  function hide(){if(el){el.remove();el=null}}
  function show(){
    if(el||standalone()||later())return;
    el=document.createElement("div");el.className="nisia-install";el.setAttribute("role","region");el.setAttribute("aria-label","Install "+name);
    el.innerHTML='<style>.nisia-install{position:fixed;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:9000;max-width:420px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;background:#fff;color:#172033;box-shadow:0 10px 30px rgba(16,24,40,.18);font:500 15px/1.35 system-ui,sans-serif}'+
      '.nisia-install b{display:block;font-size:15px}.nisia-install small{color:#5b6472;font-size:13px}.nisia-install .ni-ic{flex:none;width:44px;height:44px;border-radius:11px;background:'+color+';display:flex;align-items:center;justify-content:center;gap:8px;overflow:hidden}.nisia-install .ni-ic img{width:100%;height:100%;display:block}.nisia-install .ni-ic i{display:block;width:10px;height:15px;border-radius:50%;background:#fff}'+
      '.nisia-install button{font:inherit;cursor:pointer;border-radius:999px;min-height:40px;padding:8px 14px;border:0}.nisia-install .ni-go{background:'+color+';color:#fff;font-weight:700}.nisia-install .ni-x{background:none;color:#5b6472;font-size:18px;padding:8px 10px}</style>'+
      '<span class="ni-ic" aria-hidden="true">'+(icon?'<img src="'+icon+'" alt="">':'<i></i><i></i>')+'</span><span style="flex:1"><b>Install '+name+'</b><small>'+(prompt?"Adds it to your home screen.":"Tap Share, then “Add to Home Screen”.")+'</small></span>'+
      (prompt?'<button type="button" class="ni-go">Install</button>':"")+'<button type="button" class="ni-x" aria-label="Not now">✕</button>';
    document.body.appendChild(el);
    const go=el.querySelector(".ni-go");if(go)go.onclick=async()=>{const p=prompt;prompt=null;hide();if(p){p.prompt();try{await p.userChoice}catch(_){}}};
    el.querySelector(".ni-x").onclick=()=>{try{localStorage.setItem(KEY,String(Date.now()))}catch(_){}hide()};
  }
  addEventListener("beforeinstallprompt",e=>{e.preventDefault();prompt=e;hide();setTimeout(show,1500)});
  addEventListener("appinstalled",hide);
  if(ios&&!standalone())addEventListener("load",()=>setTimeout(show,2500));
})();
