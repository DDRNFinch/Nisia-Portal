/* Evia on a computer (1024 px and wider): the pages are arranged like Evia Portal's, with the page's summary card
   (its hero) in a panel on the right that stays in view, and everything else in the main column. Phones and tablets
   are untouched. The sidebar itself is desktop.css; this fills in the learner's name and arranges each page as it's
   drawn. */
(function(){
  const wide=matchMedia("(min-width:1024px)");
  const screenEl=()=>document.getElementById("screen");
  function name(){
    const el=document.getElementById("ev-side-name");if(!el)return;
    let n="";try{n=String((window.eviaData&&window.eviaData.learner&&window.eviaData.learner().name)||"").trim()}catch(_){}
    el.textContent=n||"Your profile";
  }
  /* Header first, then the main column and the side panel. Moving the elements keeps everything wired to them. */
  function arrange(){
    const s=screenEl();if(!s)return;
    if(!wide.matches){undo(s);return}
    if(s.querySelector(":scope > .d-layout"))return;
    const hero=s.querySelector(":scope > .th-hero");if(!hero)return;
    const lay=document.createElement("div");lay.className="d-layout";
    const main=document.createElement("div");main.className="d-main";
    const side=document.createElement("aside");side.className="d-side";
    [...s.children].forEach(c=>{if(c.classList.contains("th-head"))return;(c===hero?side:main).appendChild(c)});
    lay.append(main,side);s.appendChild(lay);
  }
  function undo(s){
    const lay=s.querySelector(":scope > .d-layout");if(!lay)return;
    const main=lay.querySelector(".d-main"),side=lay.querySelector(".d-side"),hero=side&&side.firstElementChild;
    const kids=[...(main?main.children:[])];
    lay.remove();if(hero)s.appendChild(hero);kids.forEach(k=>s.appendChild(k));
  }
  let queued=false;
  const later=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;arrange();name()})};
  function start(){
    const s=screenEl();if(!s)return setTimeout(start,300);
    new MutationObserver(later).observe(s,{childList:true});
    (wide.addEventListener?wide.addEventListener("change",later):wide.addListener(later));
    later();
  }
  if(document.readyState==="loading")addEventListener("DOMContentLoaded",start);else start();
  window.eviaDesktop={arrange,wide:()=>wide.matches};
})();
