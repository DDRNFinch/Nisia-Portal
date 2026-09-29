(() => {
  'use strict';

  const BUILD='0.25.0';
  const STATE_KEY='samos.classroom.data';
  const BOOKING_KEY='symi.calendar.bookings.v1';
  const DAY_RANGE=90;
  const WEEKDAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const pad=n=>String(n).padStart(2,'0');
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const fromKey=key=>{const [y,m,d]=String(key).split('-').map(Number);return new Date(y,(m||1)-1,d||1,12,0,0,0)};
  const addDays=(d,n)=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate(),12);x.setDate(x.getDate()+n);return x};
  const prettyDate=key=>fromKey(key).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const uid=()=>`booking-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
  const sessionCache=new Map();

  function readState(){try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')||{}}catch(_){return {}}}
  function readBookings(){try{const x=JSON.parse(localStorage.getItem(BOOKING_KEY)||'[]');return Array.isArray(x)?x:[]}catch(_){return []}}
  function writeBookings(rows){localStorage.setItem(BOOKING_KEY,JSON.stringify(rows))}
  function startOfWeek(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate(),12);x.setDate(x.getDate()-((x.getDay()+6)%7));return x}
  function weekDistance(a,b){return Math.round((startOfWeek(b)-startOfWeek(a))/(7*86400000))}
  function monthDistance(a,b){return (b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth())}
  function recurrence(c){const r=c?.recurrence||{};return {type:r.type==='monthly'?'monthly':'weekly',interval:Math.max(1,Number(r.interval)||1)}}
  function scheduleRows(c){return (Array.isArray(c?.schedule)?c.schedule:[]).slice().sort((a,b)=>{const ai=a.dayOfMonth||WEEKDAYS.indexOf(a.day),bi=b.dayOfMonth||WEEKDAYS.indexOf(b.day);return ai-bi||String(a.start||'').localeCompare(String(b.start||''))})}
  function inRange(c,key){return (!c.startDate||key>=c.startDate)&&(!c.endDate||key<=c.endDate)}
  function prettyTime(start,end){return [start,end].filter(Boolean).join('–')}
  function detail(label,value){return value?`<div class="scal-detail"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`:''}

  function slotOccurs(c,slot,key){
    if(!inRange(c,key))return false;
    const d=fromKey(key),r=recurrence(c),start=c.startDate?fromKey(c.startDate):null;
    if(slot.dayOfMonth){
      if(d.getDate()!==Number(slot.dayOfMonth))return false;
      if(!start)return true;
      const diff=monthDistance(start,d);return diff>=0&&diff%r.interval===0;
    }
    if(WEEKDAYS[d.getDay()]!==slot.day)return false;
    if(!start)return true;
    const diff=weekDistance(start,d);return diff>=0&&diff%r.interval===0;
  }

  function sessionNumberFor(c,key,targetSlot){
    if(!c.startDate)return 0;
    const cacheKey=`${c.id}|${key}|${targetSlot.dayOfMonth||targetSlot.day}|${targetSlot.start||''}`;
    if(sessionCache.has(cacheKey))return sessionCache.get(cacheKey);
    let count=0,d=fromKey(c.startDate),end=fromKey(key),guard=0;
    while(d<=end&&guard<1500){
      const k=dateKey(d);
      for(const slot of scheduleRows(c)){
        if(!slotOccurs(c,slot,k))continue;
        count++;
        const sameDay=k===key;
        const sameSlot=String(slot.dayOfMonth||slot.day)===String(targetSlot.dayOfMonth||targetSlot.day)&&String(slot.start||'')===String(targetSlot.start||'');
        if(sameDay&&sameSlot){sessionCache.set(cacheKey,count);return count}
      }
      d=addDays(d,1);guard++;
    }
    sessionCache.set(cacheKey,count);return count;
  }

  function lessonFor(state,c,sessionNumber){
    if(!c.courseId||!sessionNumber)return null;
    const course=(state.courses||[]).find(x=>x.id===c.courseId)||null;
    const lessons=(state.resources||[]).filter(r=>r.type==='lesson-plan'&&r.courseId===c.courseId);
    let lesson=lessons.find(r=>Number(r.sessionNumber)===Number(sessionNumber))||null;
    if(!lesson&&course?.lessonPlanIds?.[sessionNumber-1])lesson=(state.resources||[]).find(r=>r.id===course.lessonPlanIds[sessionNumber-1])||null;
    return lesson;
  }

  function classEvents(key,state=readState()){
    const rows=[];
    for(const c of (state.teachingClasses||[])){
      for(const slot of scheduleRows(c)){
        if(!slotOccurs(c,slot,key))continue;
        const n=sessionNumberFor(c,key,slot),lesson=lessonFor(state,c,n),course=(state.courses||[]).find(x=>x.id===c.courseId)||null;
        rows.push({
          id:`class-${c.id}-${key}-${slot.start||''}`,source:'class',type:'class',date:key,time:slot.start||'',endTime:slot.end||'',title:c.name||'Class',
          note:[c.room?`Room ${c.room}`:'',lesson?`Lesson ${n}: ${lesson.title}`:(n?`Session ${n}`:'')].filter(Boolean).join(' · '),
          classId:c.id,lessonId:lesson?.id||'',room:c.room||'',courseTitle:course?.title||course?.name||'',sessionNumber:n,lessonTitle:lesson?.title||'',editable:false,removable:false
        });
      }
    }
    return rows;
  }

  function eventsFor(key){
    const state=readState(),rows=classEvents(key,state);
    readBookings().filter(x=>x.date===key).forEach(x=>rows.push({...x,source:'booking',editable:true,removable:true}));
    return rows.sort((a,b)=>String(a.time||'99:99').localeCompare(String(b.time||'99:99'))||String(a.title||'').localeCompare(String(b.title||'')));
  }

  function dayHtml(d){
    const key=dateKey(d),today=key===dateKey(new Date()),count=eventsFor(key).length,weekday=d.toLocaleDateString('en-GB',{weekday:'short'}).toUpperCase(),month=d.toLocaleDateString('en-GB',{month:'short'}).toUpperCase();
    return `<button type="button" class="scal-day${today?' is-today':''}" data-scal-date="${key}" ${today?'aria-current="date"':''} aria-label="${esc(prettyDate(key))}${count?`, ${count} item${count===1?'':'s'}`:''}"><span>${weekday}</span><strong>${d.getDate()}</strong><small>${today?'TODAY':month}</small><i>${count?`${'<b></b>'.repeat(Math.min(3,count))}${count>3?`<em>${count}</em>`:''}`:''}</i></button>`;
  }

  function calendarHtml(){const today=new Date(),days=[];for(let i=-DAY_RANGE;i<=DAY_RANGE;i++)days.push(dayHtml(addDays(today,i)));return `<section class="scal-shell" aria-label="Symi weekday calendar"><div class="scal-head"><span>Schedule</span><button type="button" data-scal-today>Today</button></div><div class="scal-strip" id="symiCalendarStrip">${days.join('')}</div></section>`}
  function mount(){const arches=document.querySelector('.vh-arches');if(!arches)return false;const holder=document.createElement('div');holder.className='scal-home-holder';holder.innerHTML=calendarHtml();arches.replaceWith(holder);requestAnimationFrame(scrollToday);return true}
  function refresh(){const strip=document.getElementById('symiCalendarStrip');if(!strip)return;const selected=strip.querySelector('.scal-day.is-selected')?.dataset.scalDate||'',today=new Date(),days=[];sessionCache.clear();for(let i=-DAY_RANGE;i<=DAY_RANGE;i++)days.push(dayHtml(addDays(today,i)));strip.innerHTML=days.join('');if(selected)strip.querySelector(`[data-scal-date="${selected}"]`)?.classList.add('is-selected')}
  function scrollToday(){document.querySelector('.scal-day[aria-current="date"]')?.scrollIntoView({behavior:'instant',block:'nearest',inline:'center'})}

  function layer(){let el=document.getElementById('symiCalendarLayer');if(!el){el=document.createElement('section');el.id='symiCalendarLayer';el.className='scal-layer';el.hidden=true;document.body.appendChild(el)}return el}
  function closeLayer(){const el=layer();el.hidden=true;el.innerHTML=''}
  function typeLabel(type){return ({class:'Class / session',lesson:'Lesson',meeting:'Meeting',other:'Booking'})[type]||'Booking'}
  function eventRow(e){return `<button type="button" class="scal-event scal-event-open" data-scal-event="${esc(e.id)}" data-scal-source="${esc(e.source)}" data-scal-event-date="${esc(e.date)}"><span data-type="${esc(e.type||'other')}"></span><div><small>${esc([prettyTime(e.time,e.endTime),typeLabel(e.type)].filter(Boolean).join(' · '))}</small><strong>${esc(e.title||typeLabel(e.type))}</strong>${e.note?`<p>${esc(e.note)}</p>`:''}</div><i>›</i></button>`}

  function bookingForm(key,item){
    const state=readState(),classes=state.teachingClasses||[],lessons=(state.resources||[]).filter(r=>r.type==='lesson-plan'),editing=!!item;
    const v=item||{date:key,time:'09:00',endTime:'',type:'class',classId:'',lessonId:'',title:'',location:'',note:''};
    return `<form class="scal-form scal-booking-editor" data-scal-form data-date="${esc(v.date||key)}" data-booking-id="${editing?esc(v.id):''}"><div class="scal-grid"><label><span>Date</span><input name="date" type="date" value="${esc(v.date||key)}" required></label><label><span>Type</span><select name="type">${['class','lesson','meeting','other'].map(t=>`<option value="${t}"${v.type===t?' selected':''}>${esc(typeLabel(t))}</option>`).join('')}</select></label></div><div class="scal-grid"><label><span>Start</span><input name="time" type="time" value="${esc(v.time||'09:00')}"></label><label><span>Finish</span><input name="endTime" type="time" value="${esc(v.endTime||'')}"></label></div><label><span>Class</span><select name="classId"><option value="">No class</option>${classes.map(c=>`<option value="${esc(c.id)}"${v.classId===c.id?' selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label><span>Lesson plan</span><select name="lessonId"><option value="">No lesson</option>${lessons.map(l=>`<option value="${esc(l.id)}"${v.lessonId===l.id?' selected':''}>${esc(l.title)}</option>`).join('')}</select></label><label><span>Title</span><input name="title" maxlength="120" value="${esc(v.title||'')}" placeholder="e.g. Workshop practical"></label><label><span>Location / room</span><input name="location" maxlength="160" value="${esc(v.location||'')}" placeholder="Workshop, classroom or online"></label><label><span>Notes</span><textarea name="note" rows="3" maxlength="1000" placeholder="Resources, preparation or other details">${esc(v.note||'')}</textarea></label><button type="submit">${editing?'Save changes':'Save booking'}</button></form>`;
  }

  function openDay(key,formOpen=false){
    document.querySelectorAll('.scal-day').forEach(b=>b.classList.toggle('is-selected',b.dataset.scalDate===key));
    const events=eventsFor(key),el=layer();el.hidden=false;
    el.innerHTML=`<div class="scal-scrim" data-scal-close></div><div class="scal-sheet" role="dialog" aria-modal="true"><header><div><small>SYMI SCHEDULE</small><h2>${esc(prettyDate(key))}</h2></div><button type="button" data-scal-close>×</button></header><div class="scal-events">${events.length?events.map(eventRow).join(''):'<div class="scal-empty">Nothing planned for this day.</div>'}</div><button class="scal-add" type="button" data-scal-add="${key}">+ Add booking</button>${formOpen?bookingForm(key,null):''}</div>`;
  }

  function findEvent(id,source,key){return eventsFor(key).find(x=>x.id===id&&x.source===source)||null}
  function openEvent(item){
    if(!item)return;
    const state=readState(),c=(state.teachingClasses||[]).find(x=>x.id===item.classId),l=(state.resources||[]).find(x=>x.id===item.lessonId);
    const className=c?.name||'',lessonTitle=item.lessonTitle||l?.title||'',room=item.location||item.room||c?.room||'';
    const sourceNote=item.editable?'This is a Symi booking. You can change the date, time or details.':'This class comes from the teaching timetable. Change the class timetable to alter its recurring dates.';
    const el=layer();el.hidden=false;
    el.innerHTML=`<div class="scal-scrim" data-scal-close></div><div class="scal-sheet scal-detail-sheet" role="dialog" aria-modal="true"><header><div><small>${esc(typeLabel(item.type).toUpperCase())}</small><h2>${esc(item.title||typeLabel(item.type))}</h2></div><button type="button" data-scal-close>×</button></header><div class="scal-detail-grid">${detail('Date',prettyDate(item.date))}${detail('Time',prettyTime(item.time,item.endTime)||'No time set')}${detail('Class',className)}${detail('Course',item.courseTitle||'')}${detail('Session',item.sessionNumber?`Session ${item.sessionNumber}`:'')}${detail('Lesson plan',lessonTitle)}${detail('Location / room',room)}${detail('Notes',item.note||'')}</div><p class="scal-source-note">${esc(sourceNote)}</p><div class="scal-detail-actions"><button type="button" class="scal-secondary" data-scal-back-day="${esc(item.date)}">Back to day</button>${item.editable?`<button type="button" class="scal-primary-action" data-scal-edit="${esc(item.id)}">Edit / reschedule</button><button type="button" class="scal-danger" data-scal-delete="${esc(item.id)}">Delete booking</button>`:''}</div></div>`;
  }
  function openEdit(id){const item=readBookings().find(x=>x.id===id);if(!item)return;const el=layer();el.hidden=false;el.innerHTML=`<div class="scal-scrim" data-scal-close></div><div class="scal-sheet" role="dialog" aria-modal="true"><header><div><small>EDIT BOOKING</small><h2>${esc(item.title||typeLabel(item.type))}</h2></div><button type="button" data-scal-close>×</button></header>${bookingForm(item.date,item)}</div>`}

  function saveBooking(form){
    const state=readState(),fd=new FormData(form),bookingId=clean(form.dataset.bookingId,120),type=clean(fd.get('type'),24)||'other',classId=clean(fd.get('classId'),100),lessonId=clean(fd.get('lessonId'),100),c=(state.teachingClasses||[]).find(x=>x.id===classId),l=(state.resources||[]).find(x=>x.id===lessonId),typed=clean(fd.get('title'),120);
    const title=typed||(type==='lesson'&&l?.title?l.title:type==='class'&&c?.name?c.name:typeLabel(type));
    const item={id:bookingId||uid(),date:clean(fd.get('date'),20)||clean(form.dataset.date,20),time:clean(fd.get('time'),10),endTime:clean(fd.get('endTime'),10),type,classId,lessonId,title,location:clean(fd.get('location'),160),note:clean(fd.get('note'),1000),createdAt:Date.now(),updatedAt:Date.now()};
    const rows=readBookings(),index=rows.findIndex(x=>x.id===item.id);if(index>=0){item.createdAt=rows[index].createdAt||item.createdAt;rows[index]=item}else rows.push(item);writeBookings(rows);refresh();openDay(item.date,false);
  }
  function removeBooking(id){const rows=readBookings(),item=rows.find(x=>x.id===id);if(!item)return;if(window.confirm&&!window.confirm(`Delete ${item.title||typeLabel(item.type)}?`))return;writeBookings(rows.filter(x=>x.id!==id));refresh();openDay(item.date,false)}

  document.addEventListener('click',e=>{
    const day=e.target.closest?.('[data-scal-date]');if(day){e.preventDefault();openDay(day.dataset.scalDate);return}
    if(e.target.closest?.('[data-scal-today]')){e.preventDefault();scrollToday();return}
    const add=e.target.closest?.('[data-scal-add]');if(add){e.preventDefault();openDay(add.dataset.scalAdd,true);return}
    const eventButton=e.target.closest?.('[data-scal-event]');if(eventButton){e.preventDefault();openEvent(findEvent(eventButton.dataset.scalEvent,eventButton.dataset.scalSource,eventButton.dataset.scalEventDate));return}
    const back=e.target.closest?.('[data-scal-back-day]');if(back){e.preventDefault();openDay(back.dataset.scalBackDay,false);return}
    const edit=e.target.closest?.('[data-scal-edit]');if(edit){e.preventDefault();openEdit(edit.dataset.scalEdit);return}
    const del=e.target.closest?.('[data-scal-delete]');if(del){e.preventDefault();removeBooking(del.dataset.scalDelete);return}
    if(e.target.closest?.('[data-scal-close]')){e.preventDefault();closeLayer()}
  },true);
  document.addEventListener('submit',e=>{const form=e.target.closest?.('[data-scal-form]');if(!form)return;e.preventDefault();saveBooking(form)},true);

  function start(){mount();const observer=new MutationObserver(()=>mount());observer.observe(document.getElementById('staffApp')||document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

  window.SymiWeekCalendar=Object.freeze({build:BUILD,eventsFor,classEvents,readBookings,dateKey,openDay});
})();
