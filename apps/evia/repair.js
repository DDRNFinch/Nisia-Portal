// Evia7 final stability fixes: evidence photos and fixed navigation. (Accessibility lives in accessibility.js.)
(function(){
  const PACK_KEY="evia7-working-evidence-packs";
  const readJson=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||"")||f}catch(_){return f}};

  const style=document.createElement("style");
  style.id="evia-final-layout-fixes";
  style.textContent=`
    :root{--evia-nav-bottom:max(14px,env(safe-area-inset-bottom));--evia-nav-height:72px;--evia-fab-size:48px}
    @media(max-width:520px){:root{--evia-nav-height:70px}}
    .bottom-nav{position:fixed!important;bottom:var(--evia-nav-bottom)!important;transform:none!important}
    /* Wide screens: the bar is a fixed width, centred with margins (it can't use a transform, which is held at none above). */
    @media(min-width:800px){.bottom-nav{left:0!important;right:0!important;width:min(680px,calc(100% - 32px))!important;max-width:680px!important;margin:0 auto!important}}
    .evia-fab{position:fixed!important;bottom:calc(var(--evia-nav-bottom) + (var(--evia-nav-height) - var(--evia-fab-size))/2)!important;width:var(--evia-fab-size)!important;height:var(--evia-fab-size)!important;transform:translateX(-50%)!important}
    body.evia-keyboard-editing .bottom-nav{transform:none!important;opacity:1!important;pointer-events:auto!important}
    body.evia-keyboard-editing .evia-fab{transform:translateX(-50%)!important;opacity:1!important}
    .bottom-nav,.evia-fab{-webkit-backface-visibility:hidden;backface-visibility:hidden}
    body.evia-kb-open .bottom-nav,body.evia-kb-open .evia-fab{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
  `;
  document.head.appendChild(style);


  document.addEventListener("focusin",()=>document.body.classList.remove("evia-keyboard-editing"));
  document.addEventListener("focusout",()=>document.body.classList.remove("evia-keyboard-editing"));

  /* iPhone: the keyboard covers the page without making it shorter, so a fixed bar at the bottom ends up floating
     over the middle of what's being typed, and can stay out of place after the keyboard closes. While the keyboard
     is up (the visible part of the page is much shorter than the page), the nav and Evia's button step aside; when
     it goes, the page is nudged so iOS puts fixed things back. Android shortens the page itself, so this never fires
     there. */
  const vv=window.visualViewport;
  if(vv){
    let kb=false;
    const typing=()=>{const a=document.activeElement;return !!a&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable)};
    const check=()=>{
      const now=typing()&&window.innerHeight-vv.height>120;
      if(now===kb)return;
      kb=now;document.body.classList.toggle("evia-kb-open",kb);
      if(!kb)setTimeout(()=>window.scrollTo(window.scrollX,window.scrollY),60);
    };
    vv.addEventListener("resize",check);
    document.addEventListener("focusin",()=>setTimeout(check,300));
    document.addEventListener("focusout",()=>setTimeout(check,150));
  }
})();

// Supporting evidence blob storage.
(function(){
  const DB_NAME="evia7-supporting-files";
  const STORE="files";
  function openDB(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"});
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error("IndexedDB unavailable"));
    });
  }
  window.eviaSupportingFilePut=async function({id,blob}){
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite");
      tx.objectStore(STORE).put({id,blob});
      tx.oncomplete=()=>{db.close();resolve()};
      tx.onerror=()=>{db.close();reject(tx.error||new Error("Could not save file"))};
      tx.onabort=()=>{db.close();reject(tx.error||new Error("Could not save file"))};
    });
  };
  window.eviaSupportingFileDelete=async function(id){
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(id);
      tx.oncomplete=()=>{db.close();resolve()};
      tx.onerror=()=>{db.close();reject(tx.error||new Error("Could not delete file"))};
    });
  };
  window.eviaSupportingFileGet=async function(id){
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readonly");
      const req=tx.objectStore(STORE).get(id);
      req.onsuccess=()=>{const value=req.result||null;db.close();resolve(value)};
      req.onerror=()=>{db.close();reject(req.error||new Error("Could not load file"))};
    });
  };
})();
