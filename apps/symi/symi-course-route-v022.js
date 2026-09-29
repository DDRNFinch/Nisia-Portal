(()=>{
'use strict';
const VERSION='0.22.0',STORE='samos.classroom.data',AUTO='symi.course.auto-setup.v022';let queued=false;
const read=(k,d)=>{try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??d}catch{return d}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function state(){return read(STORE,{learners:[],teachingClasses:[],classes:[],courses:[]})}
function mainMenu(){
 const content=document.getElementById('samosContent'),menu=content?.querySelector('.ta-menu.as-main.v39-main');if(!menu||menu.dataset.courseRoute22==='1')return;
 const s=state(),reg=(s.classes||[]).find(x=>String(x.id)===String(s.activeClassId));menu.dataset.courseRoute22='1';
 const prompt=document.getElementById('samosPrompt'),hint=document.getElementById('samosHint');if(prompt)prompt.textContent='What are you teaching?';if(hint)hint.textContent='Start with a course. The SOW, register, learners, lessons and resources all sit inside it.';
 menu.innerHTML=`<button data-assistant="resources"><strong>My Courses</strong><span>${s.courses?.length?`${s.courses.length} running course${s.courses.length===1?'':'s'} · SOW, sessions, registers and resources.`:'Create your first course, then add its register and learners.'}</span></button><button data-assistant="registers"><strong>Registers</strong><span>${reg?`${esc(reg.name)} · attendance and learner timers.`:'Course attendance and learner timers.'}</span></button><button data-assistant="learners"><strong>Learners</strong><span>${s.learners?.length||0} saved across your courses.</span></button><button data-assistant="classes"><strong>Classes</strong><span>${s.teachingClasses?.length||0} course group${s.teachingClasses?.length===1?'':'s'} set up.</span></button>`;
}
function courseMenu(){
 const content=document.getElementById('samosContent');if(!content)return;const menu=content.querySelector('.ta-menu');if(!menu||menu.dataset.courseRoute22==='1')return;
 if(!menu.querySelector('[data-assistant-action="resources:courses"]'))return;
 const prompt=document.getElementById('samosPrompt'),hint=document.getElementById('samosHint'),s=state();if(prompt)prompt.textContent='My Courses';if(hint)hint.textContent='Open a running course or create a new one. Everything for delivery is kept with the course.';menu.dataset.courseRoute22='1';
 menu.innerHTML=`<button data-assistant-action="resources:courses"><strong>My Courses</strong><span>${s.courses?.length||0} course${s.courses?.length===1?'':'s'} · open the full SOW, sessions and teaching resources.</span></button><button data-assistant-action="create:course"><strong>Create course</strong><span>Create the course, then Symi takes you straight to its register and learners.</span></button><button data-assistant-action="resources:lessons"><strong>Lesson plans</strong><span>Open and edit lesson plans attached to your courses.</span></button><button data-assistant-action="resources:presentations"><strong>Slides</strong><span>Open or improve the presentations attached to lesson plans.</span></button><button data-assistant-action="resources:quizzes"><strong>Quizzes</strong><span>Course checks and classroom quizzes.</span></button><button data-assistant-action="resources:import"><strong>Import / upload</strong><span>Add an existing course or teaching resource.</span></button>`;
}
function courseDetail(){
 const app=document.getElementById('staffApp');if(!app)return;const box=app.querySelector('.symi-course-delivery');if(!box)return;const setup=box.querySelector('[data-symi-setup]'),h=box.querySelector('.symi-delivery-hero h3'),p=box.querySelector('.symi-delivery-hero p');if(!setup)return;
 const s=state(),cid=String(s.selectedCourseId||''),tc=(s.teachingClasses||[]).find(x=>String(x.courseId)===cid);
 if(tc){setup.textContent='Edit course register & learners';if(h)h.textContent='Course delivery';}
 else{setup.textContent='Create course register & add learners';if(h)h.textContent='Course register & learners';if(p)p.textContent='Set the course dates and register, then choose or add the learners on this course.';}
 const stamp=Number(sessionStorage.getItem(AUTO)||0);if(!tc&&stamp&&Date.now()-stamp<20000){sessionStorage.removeItem(AUTO);setTimeout(()=>setup.click(),80)}else if(stamp&&Date.now()-stamp>=20000)sessionStorage.removeItem(AUTO);
}
function patch(){mainMenu();courseMenu();courseDetail()}
function queue(){if(queued)return;queued=true;setTimeout(()=>{queued=false;patch()},0)}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-save-course]'))sessionStorage.setItem(AUTO,String(Date.now()));queue()},true);
new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});window.addEventListener('pageshow',queue);setTimeout(queue,180);
window.SymiCourseRoute=Object.freeze({version:VERSION,refresh:queue});
})();