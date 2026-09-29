(()=>{
'use strict';
const VERSION='0.17.0';
const ATTRS=['aria-label','title','placeholder'];
let queued=false;
function swapText(value){return String(value??'').replace(/\bSAMOS\b/g,'SYMI').replace(/\bSamos\b/g,'Symi')}
function patch(root=document.body){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
    const parent=node.parentElement;if(!parent||parent.closest('script,style,textarea'))continue;
    const next=swapText(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;
  }
  root.querySelectorAll?.('*').forEach(el=>{
    for(const name of ATTRS){const value=el.getAttribute?.(name);if(!value)continue;const next=swapText(value);if(next!==value)el.setAttribute(name,next)}
  });
  window.SymiQR=window.SamosQR||window.SymiQR;
}
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;patch()})}
patch();
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
window.SYMI_BUILD=VERSION;
})();
