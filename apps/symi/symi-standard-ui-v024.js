(()=>{
  'use strict';
  const brandWord=()=> 'Sym<span class="app-brand-i">i</span>';
  function patch(){
    document.body.classList.add('standard-ui');
    const header=document.getElementById('samosBrand');
    if(header&&!header.querySelector('.app-brand-i'))header.innerHTML=brandWord();
    const home=document.querySelector('.staff-face-copy strong');
    if(home&&!home.querySelector('.app-brand-i'))home.innerHTML=brandWord();
    const homeHint=document.querySelector('.staff-face-copy span');
    if(homeHint&&homeHint.textContent!=='Tap me to get started')homeHint.textContent='Tap me to get started';
    const greeting=document.querySelector('.evia-greeting');
    if(greeting&&!greeting.querySelector('.app-brand-i'))greeting.innerHTML=brandWord();
  }
  let queued=false;
  function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;patch();});}
  function start(){
    patch();
    const root=document.body;
    new MutationObserver(records=>{if(records.some(r=>r.type==='childList'&&(r.addedNodes.length||r.removedNodes.length)))schedule();}).observe(root,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.SymiStandardUI=Object.freeze({version:'0.24',patch});
})();
