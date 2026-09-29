(()=>{
'use strict';
const VERSION='0.21.0';
const STORE='samos.classroom.data',SESSIONS='symi.course.sessions.v1',LESSONS='symi.session.lesson.v1',NOTES='symi.session.note.v1';
const PROVIDER_KEY='symi.sync.provider.v1',MIRROR_KEY='symi.shared.course.snapshots.v1',OUTBOX_KEY='symi.sync.outbox.v1',STATUS_KEY='symi.sync.status.v1';
const providers=new Map();let running=false,timer=0,lastFingerprints={};
const read=(k,d)=>{try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??d}catch{return d}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const clone=v=>JSON.parse(JSON.stringify(v));
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
function state(){const s=read(STORE,null);return s&&typeof s==='object'?s:null}
function sessionsFor(courseId){const x=read(SESSIONS,{});return Array.isArray(x?.[courseId])?clone(x[courseId]):[]}
function courseSnapshot(courseId){
 const s=state();if(!s)return null;const course=(s.courses||[]).find(x=>String(x.id)===String(courseId));if(!course)return null;
 const teachingClasses=(s.teachingClasses||[]).filter(x=>String(x.courseId)===String(courseId));const tcIds=new Set(teachingClasses.map(x=>String(x.id)));
 const registers=(s.classes||[]).filter(x=>tcIds.has(String(x.teachingClassId)));const registerIds=new Set(registers.map(x=>String(x.id)));
 const learnerIds=new Set();teachingClasses.forEach(x=>(x.learnerIds||[]).forEach(id=>learnerIds.add(String(id))));registers.forEach(x=>(x.learners||[]).forEach(l=>learnerIds.add(String(l?.id||l))));
 const learners=(s.learners||[]).filter(x=>learnerIds.has(String(x.id)));
 const resources=(s.resources||[]).filter(x=>String(x.courseId)===String(courseId));
 const history=(s.history||[]).filter(x=>registerIds.has(String(x.classId)));
 const attendance={};for(const [k,v] of Object.entries(s.attendance||{})){const id=String(k).split(':')[0];if(registerIds.has(id))attendance[k]=v}
 const lessonMap={},noteMap={};for(const [k,v] of Object.entries(read(LESSONS,{}))){if(registerIds.has(String(k).split(':')[0]))lessonMap[k]=v}for(const [k,v] of Object.entries(read(NOTES,{}))){if(registerIds.has(String(k).split(':')[0]))noteMap[k]=v}
 const sessions=sessionsFor(courseId),completed=sessions.filter(x=>x.completed||x.status==='complete'||history.some(h=>String(h.classId)===String(x.registerId)&&String(h.date)===String(x.date))).length;
 let expected=0,attended=0;for(const h of history){for(const r of Object.values(h?.data||{})){expected+=Number(r?.expectedMs)||Number(h?.scheduledMs)||0;attended+=Number(r?.attendedMs)||0}}
 const attendancePercent=expected?Math.max(0,Math.min(100,Math.round(attended/expected*100))):0;
 const updatedAt=Date.now();
 const payload={course:clone(course),teachingClasses:clone(teachingClasses),registers:clone(registers),learners:clone(learners),resources:clone(resources),sessions,history:clone(history),attendance:clone(attendance),lessonMap,noteMap};
 return{schema:'nisia.running-course.v1',app:'symi',appVersion:VERSION,courseId:String(course.id),courseName:String(course.name||'Course'),updatedAt,managerSummary:{learners:learners.length,registers:registers.length,sessions:sessions.length,lessonsCompleted:completed,attendancePercent,nextSession:sessions.filter(x=>x?.date&&x.date>=new Date().toISOString().slice(0,10)).sort((a,b)=>String(a.date).localeCompare(String(b.date)))[0]?.date||''},payload};
}
function allCourseIds(){return(state()?.courses||[]).map(x=>String(x.id)).filter(Boolean)}
const localProvider={
 name:'local',label:'This device',async list(){return Object.values(read(MIRROR_KEY,{})).map(x=>({courseId:x.courseId,courseName:x.courseName,updatedAt:x.updatedAt,managerSummary:x.managerSummary}))},
 async pull(courseId){return read(MIRROR_KEY,{})?.[courseId]||null},
 async push(snapshot){const all=read(MIRROR_KEY,{});all[snapshot.courseId]=snapshot;if(!write(MIRROR_KEY,all))throw Error('Could not save shared course mirror');return{revision:String(snapshot.updatedAt),updatedAt:snapshot.updatedAt}},
 async acquireSessionLock(){return{ok:true,mode:'local'}},async releaseSessionLock(){return true}
};
providers.set('local',localProvider);
function providerName(){return String(localStorage.getItem(PROVIDER_KEY)||'local')}
function provider(){return providers.get(providerName())||localProvider}
function status(){return read(STATUS_KEY,{provider:providerName(),state:'ready',pending:0,lastSync:0})}
function setStatus(patch){const next={...status(),...patch,provider:providerName()};write(STATUS_KEY,next);window.dispatchEvent(new CustomEvent('symi:sync-status',{detail:next}));return next}
function enqueue(snapshot,error=''){const xs=read(OUTBOX_KEY,[]),rest=(Array.isArray(xs)?xs:[]).filter(x=>String(x.courseId)!==String(snapshot.courseId));rest.push({courseId:snapshot.courseId,snapshot,queuedAt:Date.now(),error:String(error||'')});write(OUTBOX_KEY,rest.slice(-100));setStatus({state:'offline',pending:rest.length})}
async function flushOutbox(){const p=provider(),xs=read(OUTBOX_KEY,[]);if(!Array.isArray(xs)||!xs.length)return;const keep=[];for(const item of xs){try{await p.push(item.snapshot)}catch(e){keep.push({...item,error:String(e?.message||e)})}}write(OUTBOX_KEY,keep);setStatus({state:keep.length?'offline':'synced',pending:keep.length,lastSync:keep.length?status().lastSync:Date.now()})}
async function syncCourse(courseId,force=false){const snap=courseSnapshot(courseId);if(!snap)return null;const serial=JSON.stringify(snap.payload),fingerprint=hash(serial);if(!force&&lastFingerprints[courseId]===fingerprint)return null;lastFingerprints[courseId]=fingerprint;const p=provider();try{setStatus({state:'syncing'});const result=await p.push(snap);setStatus({state:'synced',pending:read(OUTBOX_KEY,[]).length,lastSync:Date.now()});return result}catch(e){enqueue(snap,e?.message||e);return null}}
async function syncAll(force=false){if(running)return;running=true;try{await flushOutbox();for(const id of allCourseIds())await syncCourse(id,force)}finally{running=false}}
function registerProvider(name,adapter){name=String(name||'').trim();if(!name||!adapter||typeof adapter.push!=='function'||typeof adapter.pull!=='function'||typeof adapter.list!=='function')throw Error('A Symi sync provider needs list, pull and push methods.');providers.set(name,{name,...adapter});return true}
async function useProvider(name){if(!providers.has(name))throw Error(`Sync provider '${name}' is not registered.`);localStorage.setItem(PROVIDER_KEY,name);setStatus({provider:name,state:'ready'});await syncAll(true);return name}
async function listSharedCourses(){return provider().list()}
async function getSharedCourse(courseId){return provider().pull(String(courseId))}
async function lockSession(courseId,sessionId,actor={}){const p=provider();return typeof p.acquireSessionLock==='function'?p.acquireSessionLock(String(courseId),String(sessionId),actor):{ok:true}}
async function unlockSession(courseId,sessionId,actor={}){const p=provider();return typeof p.releaseSessionLock==='function'?p.releaseSessionLock(String(courseId),String(sessionId),actor):true}
function start(){clearInterval(timer);syncAll(true);timer=setInterval(()=>syncAll(false),3000)}
window.addEventListener('online',()=>syncAll(true));window.addEventListener('pagehide',()=>syncAll(false));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')syncAll(false)});window.addEventListener('pageshow',start);setTimeout(start,350);
window.SymiDataHub=Object.freeze({version:VERSION,schema:'nisia.running-course.v1',registerProvider,useProvider,providerName,status,syncAll,syncCourse,listSharedCourses,getSharedCourse,courseSnapshot,lockSession,unlockSession,providerContract:{required:['list','pull','push'],optional:['acquireSessionLock','releaseSessionLock']}});
})();
