/* Evia7 first-visit tips: retired. Evia used to explain each page the first time it opened; learners found it
   repetitive, so pages speak for themselves now. The tour (onboarding.js) still marks what it explained, so this keeps
   the same small API and remembers it, but never shows anything.
   eviaTips.seen(key)   eviaTips.show(key) (does nothing)   eviaTips.reset() */
(function(){
  const KEY="evia7-tips-seen";
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v:[]}catch(_){return []}};
  const seen=k=>{const s=read();if(!s.includes(k)){s.push(k);try{localStorage.setItem(KEY,JSON.stringify(s))}catch(_){}}};
  window.eviaTips={seen,show(){return false},reset(){try{localStorage.removeItem(KEY)}catch(_){}},TIPS:{}};
})();
