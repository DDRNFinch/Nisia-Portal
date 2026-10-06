/* Evia7 learner data: one module every screen can use, and the only one Nisia will talk to.
   See the "Evia data model" write-up. For now this is an adapter over the storage the app already uses: reads hand
   back records in the new shape (stable id, learnerId, ISO dates, v), and writes are turned back into today's shape,
   so there is only ever one copy of the learner's data. When every screen goes through here, the storage underneath
   can change format in one step without touching the screens.

   eviaData.list(collection, filter)   eviaData.get(collection, id)   eviaData.put(collection, record)
   eviaData.remove(collection, id)     eviaData.on("change", fn)       eviaData.learnerId()
   eviaData.files.get(fileId, kind)    eviaData.files.signature()/photo()   eviaData.learner()   eviaData.snapshot()
   Screens read through here too. "detail" on tests, reviews and targets (and "state" on rewards) is Evia's own working
   copy of the record, for the screens that show it; the fields around it are what Nisia reads.
   Sync (for Nisia, nothing else):     eviaData.changesSince()  eviaData.markSynced(records)
   Collections: learner, evidence, supporting, nvqAnswers, hours, lessonResults, tests, confidence, scenarios,
   reviews, targets, rewards, errors (the problem log, read only). Every other collection is written through here.
   eviaData.replace("targets", {course}, list) swaps a course's targets after a review. */
(function(){
  const V=1,ID_KEY="evia7-learner-id",SYNC_KEY="evia7-data-synced";
  const readJson=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||"null");return v??f}catch(_){return f}};
  const writeJson=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
  /* app.js keeps these as top-level variables, which every script can see by name. data.js loads before app.js (app.js
     draws its first screen as it loads, and screens read through here), so they are looked up when used. */
  const G=name=>name==="evidence"?(typeof evidence!=="undefined"?evidence:undefined):name==="hours"?(typeof hours!=="undefined"?hours:undefined)
    :name==="otjBatches"?(typeof otjBatches!=="undefined"?otjBatches:undefined):name==="course"?(typeof course!=="undefined"?course:undefined):undefined;
  const courseNow=()=>G("course")||localStorage.getItem("evia7-course")||"";

  /* The learner id comes from Nisia at sign-in. Until then a local one, kept on the phone. */
  function learnerId(){
    let id=localStorage.getItem(ID_KEY);
    if(!id){id="local-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);try{localStorage.setItem(ID_KEY,id)}catch(_){}}
    return id;
  }

  /* One date format: ISO 8601 UTC. Today's data has ms numbers, ISO strings and en-GB "dd/mm/yyyy, hh:mm:ss". */
  function iso(v){
    if(v==null||v==="")return null;
    if(typeof v==="number"||/^\d{10,}$/.test(String(v))){const d=new Date(Number(v));return isNaN(d)?null:d.toISOString()}
    const s=String(v),uk=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if(uk){const d=new Date(+uk[3],uk[2]-1,+uk[1],+(uk[4]||0),+(uk[5]||0),+(uk[6]||0));return isNaN(d)?null:d.toISOString()}
    const d=new Date(s);return isNaN(d)?null:d.toISOString();
  }
  const ms=v=>{const t=Date.parse(iso(v)||"");return isNaN(t)?Date.now():t};
  const slug=s=>String(s||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
  /* Units are named in older evidence. Stable ids come from the course packs (packs.js), which fix an id for every
     unit; new evidence keeps its unit id ("uid") as well as the name. */
  const unitId=(c,name)=>!c||!name?null:window.eviaPacks?window.eviaPacks.unitId(c,name):c+"/"+slug(name);
  const shared=key=>(readJson("evia7-shared",{})||{})[key]||null;
  const submission=key=>{const at=shared(key);return {status:at?"shared":"not sent",at:iso(at),by:null,feedback:null}};
  const base=(id,extra)=>Object.assign({id:String(id),v:V,learnerId:learnerId()},extra);

  /* ---------- Reading: today's storage into the new shape ---------- */
  const R={
    learner(){
      const p=readJson("evia7-profile",{})||{},rest=Object.assign({},p);delete rest.signature;delete rest.avatar;
      /* Other details (safeguarding lead and so on) are kept as they are; the signature and photo are files. */
      return [base("learner",{...rest,course:courseNow(),name:p.name||"",start:p.start||"",end:p.end||"",mathsEnabled:!!p.mathsEnabled,englishEnabled:!!p.englishEnabled,
        nvqOptional:Array.isArray(p.nvqOptional)?p.nvqOptional.slice():null,hasSignature:!!p.signature,hasPhoto:!!p.avatar,updatedAt:iso(p.updatedAt)})];
    },
    evidence(){
      return (G("evidence")||readJson("evia7-evidence",[])||[]).filter(Boolean).map(e=>{
        const lp=e.learnerProfile||{},made=iso(e.savedAt)||iso(e.d);
        return base(e.id,{course:e.c||"",unitId:e.uid||unitId(e.c,e.u),unit:e.u||"",text:e.w||"",ksbs:(e.k||[]).filter(Boolean),
          photoIds:Array.isArray(e.photoIds)?e.photoIds.slice():[],media:(e.media||[]).map(m=>({id:m.id,kind:m.kind,mime:m.mime,secs:m.secs||0})),transcript:(e.media||[]).map(m=>m.transcript||"").filter(Boolean).join("\n\n"),inlinePhotos:Array.isArray(e.p)?e.p.length:0,photoTakenAt:(e.photoTimes||[]).map(iso),
          guidedAreas:(e.guidedAreas||[]).slice(),signedAs:{name:lp.name||""},hasSignature:!!e.signature,
          createdAt:made,updatedAt:iso(e.updatedAt)||made,deletedAt:null,submission:submission("pack:"+e.id)});
      });
    },
    supporting(){
      const list=typeof supportingMeta==="function"?supportingMeta():readJson("evia7-supporting-evidence",[]);
      return (list||[]).filter(Boolean).map(x=>base(x.id,{course:x.course||"",title:x.title||x.filename||"",type:x.witness&&x.witness.name?"witness":x.type||"file",
        fileId:x.id,mime:x.mime||"",size:x.size||0,filename:x.filename||"",witness:x.witness&&x.witness.name?{name:x.witness.name,role:x.witness.role||""}:null,
        nvqUnit:x.nvqUnit||null,criteria:(x.ksbs||x.criteria||[]).slice(),induction:!!x.induction,observation:x.observation||null,employer:x.employer||null,createdAt:iso(x.addedAt),updatedAt:iso(x.updatedAt||x.addedAt),deletedAt:null,submission:submission("sup:"+x.id)}));
    },
    nvqAnswers(){
      const all=readJson("evia7-nvq-answers",{})||{},nvq=(window.EVIA_NVQ||{}).id||"trowel3";   /* the only NVQ; its pack may not be loaded */
      return Object.keys(all).map(q=>base(q,{course:nvq,questionId:q,text:all[q].t||"",createdAt:iso(all[q].savedAt),updatedAt:iso(all[q].updatedAt||all[q].savedAt),deletedAt:null}));
    },
    hours(){
      const batches=G("otjBatches")||readJson("evia7-otj-batches",[])||[];
      const batchOf=x=>{const t=Number(x.createdAt);const b=batches.find(b=>(b.entryIds||[]).includes(x.id))||batches.find(b=>Number(b.cutoff)>=t);return b?b.id:null};
      return (G("hours")||readJson("evia7-hours",[])||[]).filter(Boolean).map(x=>{
        const made=iso(x.createdAt)||iso(x.savedAt);
        return base(x.id,{minutes:Math.round(x.mins!=null?Number(x.mins):Number(x.n||0)*60),description:x.description||"",did:x.did||"",learned:x.learned||"",
          source:x.college?"college":x.auto?"auto":("did" in x||"learned" in x)?"evia":"manual",activityKey:x.autoKey||null,occurredAt:iso(x.on)||made,createdAt:made,
          updatedAt:iso(x.updatedAt)||made,deletedAt:null,confirmed:x.confirmed||null,exportedIn:batchOf(x),...(x.college?{college:x.college}:{})});
      });
    },
    lessonResults(){
      const s=readJson("evia7-teach",{})||{},out=[];
      Object.keys(s).filter(c=>c!=="_me").forEach(c=>{const L=(s[c]||{}).lessons||{};Object.keys(L).forEach(id=>{const r=L[id]||{};
        out.push(base(c+":"+id,{course:c,lessonId:id,done:!!r.done,best:Number(r.best)||0,last:Number(r.last)||0,attempts:r.attempts||null,lastAt:iso(r.at),updatedAt:iso(r.at)}))})});
      return out;
    },
    tests(){
      return (readJson("evia7-test-results",[])||[]).filter(Boolean).map((t,i)=>base(t.id||("test-"+(ms(t.savedAt))+"-"+i),{course:t.course||"",type:t.type||"test",
        score:t.score??null,total:t.total??null,pct:t.pct??(t.total?Math.round((t.score||0)/t.total*100):null),full:!!t.full,missed:(t.missed||[]).slice(),
        questions:Array.isArray(t.questions)?t.questions:null,takenAt:iso(t.savedAt),updatedAt:iso(t.savedAt),detail:t}));
    },
    confidence(){
      return (readJson("evia7-confidence",[])||[]).filter(Boolean).map((c,i)=>base(c.id||("confidence-"+i),{course:c.course||"",takenAt:iso(c.savedAt||c.startedAt),
        scores:(c.scores||[]).map(s=>({area:s.area,score:s.score,question:s.question||"",answeredAt:iso(s.answeredAt),carried:!!s.carried})),updatedAt:iso(c.savedAt)}));
    },
    scenarios(){
      const d=readJson("evia7-scenarios",{})||{};
      return Object.keys(d).map(id=>base(id,{scenarioId:id,doneAt:iso(d[id].at),best:!!d[id].best,updatedAt:iso(d[id].at)}));
    },
    reviews(){
      return (readJson("evia7-progress-reviews",[])||[]).filter(Boolean).map((r,i)=>base(r.id||("review-"+i),{course:r.course||"",date:iso(r.date),format:r.format||1,
        snapshot:r.snapshot||r.metrics||null,reflection:r.reflection||null,targetIds:(r.targets||[]).map(t=>t.id).filter(Boolean),
        signedBy:Object.fromEntries(Object.keys(r.signoff||{}).map(k=>[k,{name:(r.signoff[k]||{}).name||"",at:iso((r.signoff[k]||{}).date),signed:!!(r.signoff[k]||{}).sig}])),
        updatedAt:iso(r.updatedAt||r.date),detail:r}));
    },
    /* One target store (evia7-review-targets). evia7-targets is the old one from before the review was rebuilt: nothing
       writes it now, and its targets are read as history (store "legacy") so nothing on the phone is lost. */
    targets(){
      const a=(readJson("evia7-review-targets",[])||[]).filter(Boolean).map(t=>base(t.id,{course:t.course||"",kind:t.kind||"",title:t.title||"",why:t.why||t.reason||"",
        goal:t.target??null,baseline:t.baseline??0,param:t.param||null,due:iso(t.due||t.deadline),setBy:"evia",reviewId:t.reviewId||null,metAt:t.done?iso(t.doneAt||t.createdAt):null,
        createdAt:iso(t.createdAt),updatedAt:iso(t.updatedAt||t.createdAt),store:"review-targets",detail:t}));
      const b=(readJson("evia7-targets",[])||[]).filter(Boolean).map((t,i)=>base(t.id||("target-"+i),{course:t.course||courseNow(),kind:t.kind||"",title:t.title||"",why:t.reason||"",
        goal:t.targetValue??null,baseline:0,param:t.measure||null,due:iso(t.deadline),setBy:"evia",reviewId:null,metAt:t.done||t.completed?iso(t.doneAt||t.completedAt):null,createdAt:null,updatedAt:null,store:"legacy",detail:t}));
      return a.concat(b);
    },
    /* Skills (practice.js): college tasks the learner finished and marked. Symi will add the tutor's marks later. */
    skills(){
      return ((readJson("evia7-skills",{})||{}).done||[]).filter(x=>x&&x.id).map(x=>base(x.id,{course:x.course||"",taskId:x.taskId||"",title:x.title||"",hours:x.hours||0,
        skills:x.skills||[],startedAt:iso(x.startedAt),completedAt:iso(x.doneAt),markedBy:x.markedBy||"self",marks:(x.marks||[]).map(m=>({text:m.text,met:!!m.met})),
        note:x.note||"",updatedAt:iso(x.doneAt)}));
    },
    /* The problem log (errors.js): read only, so Nisia can see what went wrong on the phone. */
    errors(){
      return (window.eviaErrors?window.eviaErrors.list():[]).map(x=>base(x.id,{message:x.message,where:x.where||"",stack:x.stack||"",kind:x.kind||"error",
        place:x.place||"",appVersion:x.version||"",count:x.count||1,createdAt:x.at,updatedAt:x.lastAt||x.at,device:navigator.userAgent.slice(0,160)}));
    },
    rewards(){
      const r=readJson("evia7-rewards",{})||{},me=(readJson("evia7-teach",{})||{})._me||{};
      return [base("rewards",{coins:Math.max(0,(r.bank||0)-(r.spent||0)),earned:r.bank||0,spent:r.spent||0,owned:(r.owned||[]).slice(),hat:r.hat||"",expr:r.expr||"",
        xp:me.xp||0,streak:me.streak||0,lastDay:me.last||null,updatedAt:iso(r.updatedAt),state:r,me})];
    }
  };
  const COLLECTIONS=Object.keys(R);
  function list(c,filter){
    if(!R[c])throw new Error("eviaData: unknown collection "+c);
    let out=R[c]();
    if(filter)out=out.filter(r=>Object.keys(filter).every(k=>filter[k]===undefined||r[k]===filter[k]));
    return out;
  }
  const get=(c,id)=>list(c).find(r=>r.id===String(id))||null;

  /* ---------- Writing: the new shape back into today's storage ---------- */
  const listeners=[];
  const emit=c=>listeners.slice().forEach(fn=>{try{fn(c)}catch(err){console.error("eviaData listener",err)}});
  const save=()=>{if(typeof persist==="function")persist()};
  const W={
    hours:{
      put(r){
        const arr=G("hours");if(!arr)throw new Error("eviaData: hours are not loaded");
        const minutes=Math.max(0,Math.round(Number(r.minutes)||0)),t=r.createdAt?ms(r.createdAt):Date.now();
        const legacy={id:String(r.id||("otj-"+Date.now()+"-"+Math.random().toString(36).slice(2,8))),n:Math.round(minutes/60*100)/100,mins:minutes,description:r.description||"",
          createdAt:t,savedAt:typeof formatDateTime==="function"?formatDateTime(t):new Date(t).toLocaleString("en-GB"),updatedAt:Date.now()};
        /* The day it happened, when that isn't the day it was logged (backdated). createdAt stays the logging time, so
           the next learning hours PDF still picks it up. */
        if(r.occurredAt!=null)legacy.on=ms(r.occurredAt);
        if(r.source==="evia"||r.did!=null||r.learned!=null){legacy.did=r.did||"";legacy.learned=r.learned||""}
        if(r.source==="auto"){legacy.auto=true;legacy.autoKey=r.activityKey||null}
        /* From the tutor's register in Symi, through Nisia: confirmed by the tutor, so it can't be changed here. */
        if(r.source==="college"){legacy.college=r.college||{};legacy.confirmed=true}
        const i=arr.findIndex(x=>x&&x.id===legacy.id);
        if(i>=0)arr[i]=Object.assign({},arr[i],legacy);else arr.push(legacy);
        save();return legacy.id;
      },
      remove(id){const arr=G("hours");const i=arr?arr.findIndex(x=>x&&x.id===String(id)):-1;if(i<0)return false;arr.splice(i,1);save();return true}
    },
    evidence:{
      /* New evidence (no id, or an id not seen yet) or changes to the write-up and KSBs. The learner's name, dates and
         signature are copied in here, so screens don't have to. Photos go into their store first (files), and the
         record only points to them; inlinePhotos is the old fallback for phones without IndexedDB. */
      put(r){
        const arr=G("evidence");if(!arr)throw new Error("eviaData: evidence is not loaded");
        const e=r.id!=null&&arr.find(x=>x&&String(x.id)===String(r.id));
        if(e){if(r.text!=null)e.w=String(r.text);if(Array.isArray(r.ksbs))e.k=r.ksbs.slice();e.updatedAt=new Date().toISOString();save();return e.id}
        const p=readJson("evia7-profile",{})||{},now=new Date(),photoIds=(r.photoIds||[]).slice(),inline=(r.inlinePhotos||[]).slice();
        const legacy={id:String(r.id||(Date.now()+"-"+Math.random().toString(36).slice(2,8))),c:r.course||courseNow(),u:r.unit||"",d:now.toLocaleString("en-GB"),p:inline,
          w:String(r.text||"").trim(),k:(r.ksbs||[]).slice(),learnerProfile:{name:p.name||"",start:p.start||"",end:p.end||""},signature:p.signature||"",
          savedAt:now.toISOString(),photoCount:photoIds.length+inline.length};
        legacy.uid=r.unitId||unitId(legacy.c,legacy.u);   /* the unit's stable id (packs.js), kept even if the unit is renamed */
        if(photoIds.length)legacy.photoIds=photoIds;
        if(Array.isArray(r.media)&&r.media.length)legacy.media=r.media.map(m=>({id:m.id,kind:m.kind,mime:m.mime,secs:m.secs||0,transcript:m.transcript||""}));
        if(r.photoTakenAt)legacy.photoTimes=r.photoTakenAt.slice();
        if(r.guidedAreas)legacy.guidedAreas=r.guidedAreas.slice();
        if(r.induction)legacy.induction=true;
        arr.push(legacy);save();return legacy.id;
      },
      /* Deleting a saved pack: the record, then its photos. (Nisia keeps anything the assessor has already accepted.) */
      remove(id){const arr=G("evidence");const i=arr?arr.findIndex(x=>x&&String(x.id)===String(id)):-1;if(i<0)return false;
        const gone=arr.splice(i,1)[0];save();(gone.photoIds||[]).forEach(pid=>{try{window.eviaDeleteEvidencePhoto&&window.eviaDeleteEvidencePhoto(pid)}catch(_){}});return true}
    },
    /* Supporting evidence details. The file itself is stored first (eviaSupportingFilePut) under the same id. */
    supporting:{
      put(r){
        const list=readJson("evia7-supporting-evidence",[])||[],x=list.find(v=>v&&v.id===String(r.id));
        const rec=x||{id:String(r.id||("supporting-"+Date.now()+"-"+Math.random().toString(36).slice(2,8))),course:r.course||courseNow(),addedAt:new Date().toISOString()};
        ["title","type","mime","filename","size"].forEach(k=>{if(r[k]!=null)rec[k]=r[k]});
        if(r.witness!==undefined){if(r.witness&&r.witness.name)rec.witness={name:r.witness.name,role:r.witness.role||""};else delete rec.witness}
        if(r.nvqUnit!==undefined){if(r.nvqUnit){rec.nvqUnit=r.nvqUnit;rec.ksbs=(r.criteria||[]).slice()}else{delete rec.nvqUnit;rec.ksbs=[]}}
        /* The one-time PPE induction (onboarding.js) is linked to its KSBs on any course, and ticks them off. */
        if(r.induction){rec.induction=true;rec.ksbs=(r.criteria||[]).slice()}
        /* An assessor's observation from Milos (nisia.js): what they signed off counts as evidenced. */
        if(r.observation){rec.observation=Object.assign({},r.observation);rec.ksbs=(r.criteria||[]).slice()}
        /* An employer's witness testimony from Paros (nisia.js): what they wrote, for the assessor to sign off. */
        if(r.employer)rec.employer=Object.assign({},r.employer);
        if(x)rec.updatedAt=new Date().toISOString();else list.push(rec);
        writeJson("evia7-supporting-evidence",list.slice(-500));return rec.id;
      },
      remove(id){const list=readJson("evia7-supporting-evidence",[])||[],i=list.findIndex(v=>v&&v.id===String(id));if(i<0)return false;list.splice(i,1);writeJson("evia7-supporting-evidence",list);
        try{window.eviaSupportingFileDelete&&window.eviaSupportingFileDelete(String(id))}catch(_){}return true}
    },
    /* An NVQ knowledge answer, by question id. Empty text removes it. */
    nvqAnswers:{
      put(r){
        const all=readJson("evia7-nvq-answers",{})||{},q=String(r.questionId||r.id),t=String(r.text||"").trim(),now=new Date().toISOString();
        if(t)all[q]={t,savedAt:all[q]&&all[q].savedAt||now,updatedAt:now};else delete all[q];
        writeJson("evia7-nvq-answers",all);return q;
      },
      remove(id){const all=readJson("evia7-nvq-answers",{})||{};if(!(id in all))return false;delete all[id];writeJson("evia7-nvq-answers",all);return true}
    },
    /* A finished test, mock or discussion. Extra detail (questions and answers) is kept as it is. The phone keeps 50. */
    tests:{
      put(r){
        const all=readJson("evia7-test-results",[])||[],rec=Object.assign({},r.detail||{},r);
        delete rec.detail;delete rec.v;delete rec.learnerId;
        rec.id=String(r.id||("test-"+Date.now()+"-"+Math.random().toString(36).slice(2,6)));rec.course=r.course||courseNow();rec.savedAt=r.takenAt||new Date().toISOString();delete rec.takenAt;
        all.push(rec);writeJson("evia7-test-results",all.slice(-50));return rec.id;
      }
    },
    /* A lesson finished: best score kept, last score and the number of goes updated. */
    lessonResults:{
      put(r){
        const s=readJson("evia7-teach",{})||{},c=r.course||courseNow(),C=s[c]=s[c]||{lessons:{}};C.lessons=C.lessons||{};
        const was=C.lessons[r.lessonId],score=Math.max(0,Math.min(1,Number(r.last)||0));
        C.lessons[r.lessonId]={done:true,best:Math.max(score,was?Number(was.best)||0:0),last:score,at:Date.now(),attempts:((was&&was.attempts)||(was?1:0))+1};
        writeJson("evia7-teach",s);return c+":"+r.lessonId;
      }
    },
    confidence:{
      put(r){
        const all=readJson("evia7-confidence",[])||[],now=new Date().toISOString(),c=r.course||courseNow();
        const rec={id:String(r.id||("confidence-"+Date.now())),course:c,startedAt:r.startedAt||now,savedAt:now,source:"self-assessment",scores:(r.scores||[]).map(x=>Object.assign({},x))};
        all.push(rec);writeJson("evia7-confidence",all);
        try{localStorage.removeItem("evia7-confidence-cycle-"+c)}catch(_){}
        return rec.id;
      }
    },
    scenarios:{
      put(r){const d=readJson("evia7-scenarios",{})||{},id=String(r.scenarioId||r.id);d[id]={at:Date.now(),best:!!r.best};writeJson("evia7-scenarios",d);return id}
    },
    /* A review as reviews.js builds it. A new one is added (the phone keeps 30); an existing one only takes the fields
       that change after saving: sign-offs and the learner's comments. */
    reviews:{
      put(r){
        const all=readJson("evia7-progress-reviews",[])||[],i=all.findIndex(x=>x&&x.id===r.id);
        if(i>=0){["signoff","reflection"].forEach(k=>{if(r[k]!==undefined)all[i][k]=r[k]});all[i].updatedAt=new Date().toISOString()}
        else{const rec=Object.assign({},r);delete rec.v;delete rec.learnerId;rec.id=String(r.id||("review-"+Date.now()));rec.course=r.course||courseNow();all.push(rec)}
        writeJson("evia7-progress-reviews",all.slice(-30));return String(r.id||all[all.length-1].id);
      }
    },
    /* The learner's own details, merged into the profile; course switches the course. (Nisia will own course and dates.) */
    learner:{
      put(r){
        /* Every profile field is kept (name, dates, photo, signature, maths and English, NVQ units, safeguarding lead…);
           only the record's own fields and the course are left out. */
        const SKIP=new Set(["id","v","learnerId","course","hasSignature","hasPhoto","updatedAt"]);
        const p=readJson("evia7-profile",{})||{};let changed=false;
        Object.keys(r).forEach(k=>{if(!SKIP.has(k)&&r[k]!==undefined){p[k]=r[k];changed=true}});
        if(changed){p.updatedAt=new Date().toISOString();writeJson("evia7-profile",p)}
        if(r.course){
          const P=window.eviaPacks,to=r.course,redraw=()=>{emit("learner");if(typeof render==="function"&&typeof course!=="undefined"&&course===to)render()};
          const switchNow=()=>{if(typeof course!=="undefined")course=to;try{localStorage.setItem("evia7-course",to)}catch(_){}save()};
          const failed=err=>{console.error(err);if(typeof showEvidenceToast==="function")showEvidenceToast(err.message,true)};
          /* Only the learner's own course pack is loaded (packs.js). A course whose units come with its pack (the NVQ)
             switches once the pack is in; the others switch now, and their lessons follow. */
          if(typeof C!=="undefined"&&!C[to]&&P)P.ensure(to).then(()=>{if(C[to]){switchNow();redraw()}}).catch(failed);
          else{switchNow();if(P&&!P.loaded(to))P.ensure(to).then(redraw).catch(failed)}
        }
        return "learner";
      }
    },
    /* Rewards are kept whole by rewards.js (state) and teach.js (me: XP and the day streak). */
    rewards:{
      put(r){
        if(r.state){const st=Object.assign({},r.state,{updatedAt:new Date().toISOString()});writeJson("evia7-rewards",st)}
        if(r.me){const s=readJson("evia7-teach",{})||{};s._me=r.me;writeJson("evia7-teach",s)}
        return "rewards";
      }
    },
    /* Targets in reviews.js's shape. put adds or updates one; replace("targets",{course},list) swaps a course's set. */
    targets:{
      put(t){
        const all=readJson("evia7-review-targets",[])||[],rec=Object.assign({},t);delete rec.v;delete rec.learnerId;delete rec.store;
        rec.id=String(t.id||("t-"+Date.now()+"-"+Math.random().toString(36).slice(2,6)));rec.course=t.course||courseNow();rec.updatedAt=Date.now();
        const i=all.findIndex(x=>x&&x.id===rec.id);if(i>=0)all[i]=Object.assign({},all[i],rec);else all.push(rec);
        writeJson("evia7-review-targets",all);return rec.id;
      },
      remove(id){const all=readJson("evia7-review-targets",[])||[],i=all.findIndex(x=>x&&x.id===String(id));if(i<0)return false;all.splice(i,1);writeJson("evia7-review-targets",all);return true},
      replace(filter,list){
        const c=(filter&&filter.course)||courseNow(),now=Date.now();
        const keep=(readJson("evia7-review-targets",[])||[]).filter(t=>t&&t.course!==c);
        writeJson("evia7-review-targets",keep.concat((list||[]).map(t=>Object.assign({},t,{course:t.course||c,updatedAt:t.updatedAt||now}))));
      }
    }
  };
  function put(c,r){if(!W[c])throw new Error("eviaData: "+c+" can't be written through eviaData yet");const id=W[c].put(r||{});emit(c);return id}
  function remove(c,id){if(!W[c]||!W[c].remove)throw new Error("eviaData: "+c+" can't be removed through eviaData");const ok=W[c].remove(id);if(ok)emit(c);return ok}
  function replace(c,filter,list){if(!W[c]||!W[c].replace)throw new Error("eviaData: "+c+" can't be replaced through eviaData");W[c].replace(filter,list);emit(c)}

  /* ---------- Files: photos, supporting files (signatures later) ---------- */
  const files={
    async get(fileId,kind){
      if(kind==="supporting"||!kind){const rec=window.eviaSupportingFileGet?await window.eviaSupportingFileGet(fileId):null;if(rec&&rec.blob)return rec.blob;if(kind)return null}
      return window.eviaGetEvidencePhoto?window.eviaGetEvidencePhoto(fileId):null;
    },
    /* The learner's signature and photo, as image data (they go on PDFs, so screens need them straight away). */
    signature:()=>(readJson("evia7-profile",{})||{}).signature||"",
    photo:()=>(readJson("evia7-profile",{})||{}).avatar||""
  };

  /* ---------- Sync with Nisia ----------
     Works whoever wrote the data (a screen not yet moved here included): each record's fingerprint is compared with
     the one last sent. changesSince() gives new and changed records, plus ids that have gone (deleted). */
  const SYNCED=["learner","evidence","supporting","nvqAnswers","hours","lessonResults","tests","confidence","scenarios","reviews","targets","rewards","errors","skills"];
  const fp=r=>{const s=JSON.stringify(r);let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)};
  function changesSince(){
    const done=readJson(SYNC_KEY,{})||{},out=[];
    SYNCED.forEach(c=>{const seen=done[c]||{},now=list(c),ids=new Set();
      now.forEach(r=>{ids.add(r.id);const f=fp(r);if(seen[r.id]!==f)out.push({collection:c,record:r,fingerprint:f})});
      Object.keys(seen).forEach(id=>{if(!ids.has(id))out.push({collection:c,record:base(id,{deletedAt:new Date().toISOString()}),fingerprint:null})})});
    return out;
  }
  function markSynced(changes){
    const done=readJson(SYNC_KEY,{})||{};
    (changes||[]).forEach(ch=>{const m=done[ch.collection]=done[ch.collection]||{};if(ch.fingerprint)m[ch.record.id]=ch.fingerprint;else delete m[ch.record.id]});
    writeJson(SYNC_KEY,done);
  }
  /* Everything, in the new shape: for Nisia's first upload, and for checking the move worked. */
  const snapshot=()=>{const o={v:V,learnerId:learnerId(),at:new Date().toISOString()};COLLECTIONS.forEach(c=>{o[c]=list(c)});return o};

  /* The learner's enrolment, set by Nisia when they're signed up: {course, name, start, end, nvqOptional}. Nisia saves
     it with enrol() at sign-in; until Nisia is connected, ?course=bricklayer in the address does the same for testing.
     Onboarding takes the course from here, so the learner doesn't pick it. */
  const ENROL_KEY="evia7-enrolment";
  function enrolment(){
    let e=readJson(ENROL_KEY,null);
    try{const q=new URLSearchParams(location.search).get("course");if(q&&!(e&&e.course))e=Object.assign({},e,{course:q})}catch(_){}
    return e&&e.course&&(!window.eviaPacks||window.eviaPacks.COURSES.includes(e.course))?e:null;
  }
  const enrol=e=>writeJson(ENROL_KEY,Object.assign({},e,{at:new Date().toISOString()}));
  /* The learner's own record, for screens that only need a name or dates. */
  const learner=()=>R.learner()[0];

  window.eviaData={V,COLLECTIONS,list,get,put,remove,replace,files,learner,enrolment,enrol,learnerId,iso,unitId,changesSince,markSynced,snapshot,
    on(ev,fn){if(ev==="change"&&typeof fn==="function")listeners.push(fn);return()=>{const i=listeners.indexOf(fn);if(i>=0)listeners.splice(i,1)}}};
})();
