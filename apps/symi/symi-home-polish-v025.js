(()=>{
  'use strict';
  const BUILD='0.26.0';
  const word=()=> 'Sym<span class="app-brand-i">i</span>';

  function patch(){
    const brand=document.getElementById('samosBrand');
    if(brand&&brand.innerHTML!==word())brand.innerHTML=word();

    const panel=document.getElementById('samosFacePanel');
    const copy=panel&&panel.querySelector('.staff-face-copy');
    if(copy){
      copy.querySelectorAll('strong').forEach(el=>el.remove());
      let hint=copy.querySelector('span');
      if(!hint){hint=document.createElement('span');copy.appendChild(hint);}
      hint.textContent='Tap me to get started';
      [...copy.children].filter(el=>el!==hint).forEach(el=>el.remove());
    }

    const greeting=document.querySelector('#samosOverlay .evia-greeting');
    if(greeting&&greeting.innerHTML!==word())greeting.innerHTML=word();
  }

  async function repairStartup(){
    const key='symi-startup-repair-026';
    if(sessionStorage.getItem(key)==='1'){
      alert('Symi could not start cleanly. Close the installed app fully and open it again.');
      return;
    }
    sessionStorage.setItem(key,'1');
    try{
      if('caches' in window){
        const keys=await caches.keys();
        await Promise.all(keys.filter(name=>/^(?:symi|samos)-/i.test(name)).map(name=>caches.delete(name)));
      }
      if('serviceWorker' in navigator){
        const regs=await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.filter(reg=>String(reg.scope||'').includes('/Symi/')).map(reg=>reg.unregister()));
      }
    }catch(_){ }
    const base=`${location.pathname}?v=${BUILD}&repair=1`;
    location.replace(base);
  }

  function openFromHome(event){
    const trigger=event.target&&event.target.closest&&event.target.closest('#eviaFace,#helpButton');
    if(!trigger)return;
    if(window.SamosApp&&typeof window.SamosApp.openAssistantMenu==='function'){
      event.preventDefault();
      event.stopImmediatePropagation();
      window.SamosApp.openAssistantMenu();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    repairStartup();
  }

  function start(){
    patch();
    document.addEventListener('click',openFromHome,true);
    window.addEventListener('pageshow',patch);
    setTimeout(()=>{
      patch();
      if(window.SamosApp)sessionStorage.removeItem('symi-startup-repair-026');
    },250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.SymiHomePolish=Object.freeze({version:'0.26',patch,repairStartup});
})();
