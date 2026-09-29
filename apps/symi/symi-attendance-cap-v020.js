(()=>{
'use strict';
const VERSION='0.20.0';let queued=false;
function clampText(root=document){root.querySelectorAll?.('.symi-otj-dialog b,.symi-course-dialog b,.class-title-line b,.class-summary-grid strong').forEach(el=>{const t=String(el.textContent||'').trim(),m=t.match(/^(\d+(?:\.\d+)?)%$/);if(m&&Number(m[1])>100)el.textContent='100%'})}
function unb64(v){const x=String(v||'').replace(/-/g,'+').replace(/_/g,'/'),p=x+'='.repeat((4-x.length%4)%4),bin=atob(p),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return JSON.parse(new TextDecoder().decode(bytes))}
function b64(value){const bytes=new TextEncoder().encode(JSON.stringify(value));let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'')}
function clampQr(raw){const prefix='NISI:SYMI:COLLEGEOTJ:1:';if(!String(raw||'').startsWith(prefix))return raw;try{const p=unb64(String(raw).slice(prefix.length));if(p?.a&&Number.isFinite(Number(p.a.p)))p.a.p=Math.max(0,Math.min(100,Math.round(Number(p.a.p))));if(p?.a&&Number.isFinite(Number(p.a.bp)))p.a.bp=Math.max(0,Math.min(100,Math.round(Number(p.a.bp))));return prefix+b64(p)}catch{return raw}}
function patchQR(){for(const name of ['SamosQR','SymiQR']){const q=window[name];if(!q||q.__attendanceCap020||typeof q.render!=='function')continue;const render=q.render.bind(q),next={...q,render(target,raw,...rest){return render(target,clampQr(raw),...rest)},__attendanceCap020:true};try{window[name]=Object.freeze(next)}catch{}}}
function patch(){patchQR();clampText()}
function queue(){if(queued)return;queued=true;setTimeout(()=>{queued=false;patch()},0)}
new MutationObserver(queue).observe(document.body,{childList:true,subtree:true,characterData:true});document.addEventListener('click',queue,true);window.addEventListener('pageshow',queue);setTimeout(queue,100);
window.SymiAttendanceCap=Object.freeze({version:VERSION,clampQr});
})();
