/* Evia7 ↔ Nisia: pairing and sync.
   Joining: the learner scans their assessor's pairing QR (NISI:PAIR:2:<code>), opens the invite link (?pair=<code>) or
   types the code shown under the QR. Nisia replies with the learner's enrolment: who they are, their course and dates,
   college, employer, assessor, tutor and safeguarding lead, so the learner doesn't type any of it.
   Sync: Nisia sees everything the learner does in Evia. Records (evidence, hours, lessons, tests, reviews, targets…)
   go on any connection, from eviaData.changesSince(); photos, videos and files go only on WiFi, and wait until then.
   Live: Nisia's Supabase (London). Pairing signs the learner in (no password); every record goes to evia_records
   (and evidence and learning hours to their own tables, for the college's counts); photos and files go to the
   private evidence store. The example codes below are a demo that never leaves the phone (the shared test app).
   window.eviaNisia: pair(code)  accept(enrolment)  joined()  sync()  status()  clean(code)  onStatus(fn) */
(function(){
  const NISIA_URL="https://ffgfigkeeeauzkifopei.supabase.co",NISIA_KEY="sb_publishable_w_R4Kqq3UqNKQuv6erQzAQ_bXBkw8Bc";
  const MEDIA_KEY="evia7-nisia-media",STATUS_KEY="evia7-nisia-status",IDS_KEY="evia7-nisia-ids";
  /* supabase-js is only loaded once the learner connects (vendor/, about 110 KB). */
  let client=null;
  function sb(){
    if(client)return Promise.resolve(client);
    return new Promise((res,rej)=>{
      const go=()=>{client=window.supabase.createClient(NISIA_URL,NISIA_KEY,{auth:{persistSession:true,autoRefreshToken:true,storageKey:"evia7-nisia-auth",detectSessionInUrl:false}});res(client)};
      if(window.supabase&&window.supabase.createClient)return go();
      const el=document.createElement("script");el.src="vendor/supabase-2.45.4.js";el.onload=go;el.onerror=()=>rej(new Error("Evia couldn’t reach Nisia. Check your signal and try again."));document.head.appendChild(el);
    });
  }
  /* Example learners (from the Nisia portal mock-up), one per course. */
  const COLLEGE={college:"Brookfield College",safeguarding:{name:"Sarah Mitchell",phone:"01922 555 010",email:"safeguarding@brookfield.example"}};
  const LEARNERS={
    BRK7Q4M:{learnerId:"nisia-demo-callum",name:"Callum Hughes",course:"bricklayer",start:"2025-09-01",end:"2027-08-31",group:"Bricklaying 2025 intake",employer:"Hughes & Sons Builders",assessor:"Mark Ellis",tutor:"Dan Okafor"},
    CJ4H8KP:{learnerId:"nisia-demo-amira",name:"Amira Khan",course:"site",start:"2025-09-01",end:"2027-08-31",group:"Site Carpentry 2025",employer:"Kestrel Homes",assessor:"Mark Ellis",tutor:"Priya Shah"},
    JNR5W2C:{learnerId:"nisia-demo-jordan",name:"Jordan Price",course:"joiner",start:"2025-09-01",end:"2027-08-31",group:"Bench Joinery 2025",employer:"Oakline Joinery",assessor:"Mark Ellis",tutor:"Priya Shah"},
    TRW3M6D:{learnerId:"nisia-demo-ellie",name:"Ellie Morgan",course:"trowel3",start:"2026-01-05",end:"2027-07-30",group:"Plastering L3",employer:"Morgan Plastering",assessor:"Mark Ellis",tutor:"Mark Ellis",nvqOptional:["690"]}
  };
  /* The code under the QR, however it arrives: typed with dashes or spaces, a scanned NISI:PAIR:2: payload, or a link. */
  const clean=s=>{s=String(s||"").trim();const m=/^NISI:PAIR:\d+:(.+)$/i.exec(s)||/[?&#](?:pair|code)=([A-Za-z0-9-]+)/.exec(s);return (m?m[1]:s).toUpperCase().replace(/[^A-Z0-9]/g,"")};

  async function pair(code){
    const k=clean(code);
    if(k.length<6)throw new Error("That code looks too short. It’s under your assessor’s QR code.");
    if(LEARNERS[k])return Object.assign({code:k,demo:true},COLLEGE,LEARNERS[k]);
    if(!navigator.onLine)throw new Error("You need signal to connect. Try again when you’re online.");
    let r,d={};
    try{r=await fetch(NISIA_URL+"/functions/v1/nisia-setup",{method:"POST",headers:{"Content-Type":"application/json",apikey:NISIA_KEY},body:JSON.stringify({action:"pair",code:k})});d=await r.json()}
    catch(_){throw new Error("Evia couldn’t reach your college. Check your signal and try again.")}
    if(!r.ok||d.error)throw new Error(d.error||"That code didn’t work. Ask your assessor for a new one.");
    return {code:k,live:true,token_hash:d.token_hash,learnerId:d.learnerId,organisationId:d.organisationId,enrolmentId:d.enrolmentId,courseId:d.courseId,memberId:d.memberId,
      name:d.name,course:d.course,start:d.start,end:d.end,college:d.college,employer:d.employer,employerContact:d.employerContact,assessor:d.assessor,tutor:d.tutor,
      plannedOtjHours:d.plannedOtjHours,safeguarding:d.safeguarding||undefined,reviewDue:d.reviewDue||null,nvqOptional:d.nvqOptional&&d.nvqOptional.length?d.nvqOptional:undefined};
  }
  /* The learner confirmed it's them: sign in with the one-time token, then the enrolment and their details come
     from Nisia from now on. */
  async function accept(en){
    let c=null;
    if(en.live){
      c=await sb();
      const {error}=await c.auth.verifyOtp({token_hash:en.token_hash,type:"magiclink"});
      if(error)throw new Error("That code has already been used. Ask your assessor for a new one.");
    }
    try{if(en.learnerId)localStorage.setItem("evia7-learner-id",en.learnerId)}catch(_){}
    const e=Object.assign({},en,{joinedAt:new Date().toISOString()});delete e.token_hash;
    window.eviaData.enrol(e);
    /* Evia already in use on another device: bring it all here and restart with it. */
    if(c){let back=false;try{back=await restore(c,e)}catch(err){console.warn("Evia: restore",err&&err.message)}
      if(back){try{sessionStorage.setItem("evia7-welcome-back","1");if(window.eviaStorage)await window.eviaStorage.flush()}catch(_){}location.reload();return new Promise(()=>{})}}
    window.eviaData.put("learner",{name:en.name,start:en.start,end:en.end,safeguarding:en.safeguarding,...(en.nvqOptional?{nvqOptional:en.nvqOptional}:{})});
    setTimeout(()=>sync().catch(()=>{}),500);
    return e;
  }
  const joined=()=>{const e=window.eviaData.enrolment();return e&&e.college?e:null};
  /* Feedback from the assessor: for a piece of evidence, the latest for a unit, and anything new to tell them about. */
  window.eviaFeedback={
    forEvidence:id=>(readJson("evia7-nisia-feedback",{})||{})[String(id)]||null,
    forUnit:unit=>Object.values(readJson("evia7-nisia-feedback",{})||{}).filter(f=>f.unit===unit&&f.kind!=="observation").sort((a,b)=>String(b.at).localeCompare(String(a.at)))[0]||null,
    unseen:()=>Object.entries(readJson("evia7-nisia-feedback",{})||{}).filter(([,f])=>!f.seen).map(([id,f])=>Object.assign({id},f)).sort((a,b)=>String(b.at).localeCompare(String(a.at))),
    markSeen:ids=>{const all=readJson("evia7-nisia-feedback",{})||{};(ids||Object.keys(all)).forEach(i=>{if(all[i])all[i].seen=true});writeJson("evia7-nisia-feedback",all)}
  };

  /* ---------- Sync ---------- */
  const readJson=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||"null");return v??f}catch(_){return f}};
  const writeJson=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
  /* WiFi (or a cable) only for media. Phones that don't say what they're on (iPhone) count as WiFi unless data saver is on. */
  const onWifi=()=>{const c=navigator.connection;if(!c||!c.type)return !(c&&c.saveData);return c.type==="wifi"||c.type==="ethernet"};
  /* Every photo and file the records point at. */
  function mediaIds(){
    const D=window.eviaData,out=[];
    D.list("evidence").forEach(e=>(e.photoIds||[]).concat((e.media||[]).map(m=>m.id)).forEach(id=>out.push({id,kind:"photo",evidence:e.id})));
    D.list("supporting").filter(s=>!s.observation).forEach(s=>out.push({id:s.id,kind:"supporting"}));
    return out;
  }
  const listeners=[];
  const note=s=>{const st=Object.assign(readJson(STATUS_KEY,{})||{},s);writeJson(STATUS_KEY,st);listeners.slice().forEach(fn=>{try{fn(st)}catch(_){}});return st};
  /* A stable Nisia id for each Evia record that has its own Nisia table. */
  const uuidFor=key=>{const m=readJson(IDS_KEY,{})||{};if(!m[key]){m[key]=crypto.randomUUID?crypto.randomUUID():"10000000-1000-4000-8000-100000000000".replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));writeJson(IDS_KEY,m)}return m[key]};
  const EVIDENCE_TYPES=["photo","video","written","audio","document"];
  /* Records: everything into evia_records; evidence, supporting evidence and learning hours also into their own tables. */
  async function sendRecords(c,e,batch){
    const base={organisation_id:e.organisationId,enrolment_id:e.enrolmentId};
    const rows=batch.map(ch=>Object.assign({},base,{learner_member_id:e.memberId,collection:ch.collection,record_id:String(ch.record.id),data:ch.record,deleted_at:ch.fingerprint?null:new Date().toISOString()}));
    const {error}=await c.from("evia_records").upsert(rows,{onConflict:"enrolment_id,collection,record_id"});
    if(error)throw error;
    for(const ch of batch){
      const r=ch.record,gone=!ch.fingerprint;
      if(ch.collection==="hours"){
        if(r.source==="college")continue;             /* the tutor's register: Nisia already has it */
        const id=uuidFor("hours:"+r.id),hours=Math.round((Number(r.minutes)||0)/60*100)/100;
        if(gone||!(hours>0&&hours<=24)){await c.from("otj_entries").delete().eq("id",id);continue}
        const {error:oe}=await c.from("otj_entries").upsert(Object.assign({},base,{id,created_by_member_id:e.memberId,activity_date:String(r.occurredAt||r.createdAt||new Date().toISOString()).slice(0,10),
          activity_type:r.source||"evia",description:String(r.description||r.did||"Learning").slice(0,2000),hours}));
        if(oe)console.warn("Evia: Nisia hours",oe.message);
      }
      /* An assessor's observation came from Nisia: it's already there. */
      if(ch.collection==="supporting"&&(r.observation||/^obs-/.test(String(r.id))))continue;
      if(ch.collection==="evidence"||ch.collection==="supporting"){
        const id=uuidFor(ch.collection+":"+r.id);
        /* Deleted in Evia: its photos and files go too. (Anything the assessor has accepted stays; the rules refuse.) */
        if(gone){const {data:fl}=await c.from("evidence_files").select("storage_path").eq("evidence_id",id);if(fl&&fl.length)await c.storage.from("evidence").remove(fl.map(f=>f.storage_path));await c.from("evidence").delete().eq("id",id);continue}
        const rm=r.media||[],type=ch.collection==="evidence"?((r.photoIds||[]).length?"photo":rm.some(m=>m.kind==="video")?"video":rm.length?"audio":"written"):(EVIDENCE_TYPES.includes(r.type)?r.type:"document");
        const {error:ee}=await c.from("evidence").upsert(Object.assign({},base,{id,course_id:e.courseId,created_by_member_id:e.memberId,evidence_type:type,
          title:String(r.unit||r.title||"Evidence").slice(0,300),client_reference:ch.collection+":"+r.id,
          source_metadata:{collection:ch.collection,unit:r.unit||null,unitId:r.unitId||null,text:r.text||null,ksbs:r.ksbs||r.criteria||[],photoIds:r.photoIds||[],
            media:rm.map(m=>({id:m.id,kind:m.kind,secs:m.secs||0})),transcript:r.transcript||null}}));
        if(ee)console.warn("Evia: Nisia evidence",ee.message);
      }
    }
  }
  /* Evia's own summary of where the learner is (the same numbers they see), for Milos's reviews: KSB coverage and
     what's missing per unit, time through the course, learning hours, tests, confidence, Teach me and write-up quality. */
  function snapshot(){
    try{
      const S=window.eviaStats.compute(),a=S.a;
      return {at:new Date().toISOString(),course:typeof course==="string"?course:"",
        ksb:{met:a.met,total:a.total,pct:a.ksbPct,timePct:a.timePct,evidenced:[...(a.evidenced||[])],signoff:!!a.signoff,waiting:[...(a.possible||[])],aims:(a.aims||[]).slice()},
        units:(a.units||[]).map(u=>({name:u.name,total:(u.codes||[]).length,missing:(u.missing||[]).slice(),started:!!u.started,packs:(u.entries||[]).length,
          strength:typeof unitStrengthForCourse==="function"?unitStrengthForCourse(u.name):window.eviaStrength?window.eviaStrength.unit(u.name):null})),
        packs:S.packs,coursePack:pack()?{code:pack().code,version:pack().version,hash:pack().hash,matches:packMatches()}:null,daysSince:S.daysSince,lastUpload:S.lastUpload?new Date(S.lastUpload).toISOString():null,
        otj:{total:S.otjTotal,month:S.otjMonth,week:S.otjWeek},streak:S.streak,writeupCoverage:S.coverage,
        tests:(S.tests||[]).map(t=>({type:t.type,name:t.name,count:t.count,best:t.best,latest:t.latest?{pct:t.latest.pct,takenAt:t.latest.takenAt}:null})),
        confidence:S.confidence,teach:S.teach,maths:S.maths,english:S.english,ppeDone:S.ppeDone,
        /* Each target and how far along it is, so the next review marks it met, partly met or not met. */
        targets:(window.eviaTargets?window.eviaTargets.mine():[]).map(t=>{const p=window.eviaTargets.progress(t,S);return {id:t.id,nisiaId:t.nisiaId||null,title:t.title,due:t.due,done:!!t.done,doneAt:t.doneAt||null,pct:Math.round((p.pct||0)*100),text:p.text||"",reviewId:t.reviewId||null}})};
    }catch(err){console.warn("Evia: snapshot",err&&err.message);return null}
  }
  async function sendSnapshot(c,e){
    const snap=snapshot();if(!snap)return;
    const key=JSON.stringify(Object.assign({},snap,{at:0}));let last="";try{last=localStorage.getItem("evia7-nisia-snap")||""}catch(_){}
    if(key===last)return;
    const {error}=await c.from("evia_records").upsert({organisation_id:e.organisationId,enrolment_id:e.enrolmentId,learner_member_id:e.memberId,collection:"snapshot",record_id:"current",data:snap},{onConflict:"enrolment_id,collection,record_id"});
    if(error)throw error;
    try{localStorage.setItem("evia7-nisia-snap",key)}catch(_){}
  }
  /* A photo or file into the college's private evidence store, recorded against its evidence. */
  async function sendMedia(c,e,m){
    const D=window.eviaData,blob=await D.files.get(m.id,m.kind);if(!blob)return "missing";
    const owner=m.kind==="supporting"?"supporting:"+m.id:"evidence:"+m.evidence,evId=uuidFor(owner);
    const ext=(blob.type.split("/")[1]||"bin").replace(/[^a-z0-9]/g,"").slice(0,5),path=e.organisationId+"/"+evId+"/"+m.id.replace(/[^A-Za-z0-9_-]/g,"")+"."+ext;
    const {error}=await c.storage.from("evidence").upload(path,blob,{contentType:blob.type||"application/octet-stream",upsert:false});
    if(error&&!/exists|Duplicate/i.test(error.message))throw error;
    if(!error){const {error:fe}=await c.from("evidence_files").insert({organisation_id:e.organisationId,evidence_id:evId,uploaded_by_member_id:e.memberId,storage_path:path,mime_type:blob.type||"application/octet-stream",size_bytes:blob.size});if(fe)console.warn("Evia: Nisia file",fe.message)}
    return new Date().toISOString();
  }
  /* ---------- A new device (a computer, or a replacement phone) ----------
     Evia keeps the learner's work on the device. So a new device can start where the old one left off, Evia's own
     saved data goes to Nisia too, key by key, exactly as it's stored ("store" records). Connecting a new device puts it
     back, restarts Evia with it, then brings the photos and files down on WiFi. Sign-in, the sync bookkeeping and
     things that belong to one device stay where they are. */
  const STORE_SENT_KEY="evia7-nisia-store-sent",RESTORED_KEY="evia7-nisia-restored",FETCH_KEY="evia7-nisia-fetch";
  const NOT_BACKED_UP=/^evia7-(nisia-(auth|status|media|store-sent|restored|fetch|snap|observations|review-targets|feedback)|data-synced|enrolment|learner-id|install-later|errors|offline-|evidence-db|supporting-files|last-backup|downloaded-unit-pdfs|lb-queue|lb-daily)/;
  /* Most of Evia's data is in IndexedDB behind localStorage (storage.js), so its keys come from there. */
  const backupKeys=()=>{const all=new Set(window.eviaStorage&&window.eviaStorage.keys?window.eviaStorage.keys():[]);
    for(let i=0;i<localStorage.length;i++)all.add(localStorage.key(i));return [...all].filter(k=>k&&k.startsWith("evia7-")&&!NOT_BACKED_UP.test(k))};
  const hash=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)+"."+s.length};
  async function sendStore(c,e){
    const sent=readJson(STORE_SENT_KEY,{})||{},now={},rows=[],base={organisation_id:e.organisationId,enrolment_id:e.enrolmentId,learner_member_id:e.memberId,collection:"store"};
    backupKeys().forEach(k=>{const raw=localStorage.getItem(k);if(raw==null||raw.length>4e6)return;now[k]=hash(raw);if(sent[k]!==now[k])rows.push(Object.assign({},base,{record_id:k,data:{raw},deleted_at:null}))});
    Object.keys(sent).forEach(k=>{if(!(k in now))rows.push(Object.assign({},base,{record_id:k,data:{raw:null},deleted_at:new Date().toISOString()}))});
    for(let i=0;i<rows.length;i+=20){const {error}=await c.from("evia_records").upsert(rows.slice(i,i+20),{onConflict:"enrolment_id,collection,record_id"});if(error)throw error}
    writeJson(STORE_SENT_KEY,now);
  }
  /* Straight after connecting: if this learner already has Evia somewhere else, their saved data comes back here.
     Lists of records with ids are merged (nothing made here is lost); everything else is taken from the backup.
     Returns true when anything came back, and Evia then restarts to load it. */
  async function restore(c,e){
    const {data,error}=await c.from("evia_records").select("record_id,data").eq("enrolment_id",e.enrolmentId).eq("collection","store").is("deleted_at",null);
    if(error||!data||!data.length)return false;
    const sent={};
    data.forEach(r=>{
      const k=r.record_id,raw=r.data&&r.data.raw;if(typeof raw!=="string"||!/^evia7-/.test(k)||NOT_BACKED_UP.test(k))return;
      let v=raw;const here=localStorage.getItem(k);
      if(here!=null&&here!==raw)try{
        const a=JSON.parse(here),b=JSON.parse(raw);
        if(Array.isArray(a)&&Array.isArray(b)&&a.concat(b).every(x=>x&&x.id!=null)){const ids=new Set(b.map(x=>String(x.id)));v=JSON.stringify(b.concat(a.filter(x=>!ids.has(String(x.id)))))}
        else if(k===IDS_KEY)v=JSON.stringify(Object.assign({},a,b));
      }catch(_){}
      try{localStorage.setItem(k,v);sent[k]=hash(v)}catch(err){console.warn("Evia: restore",k,err&&err.message)}
    });
    if(!Object.keys(sent).length)return false;
    writeJson(STORE_SENT_KEY,sent);writeJson(RESTORED_KEY,new Date().toISOString());writeJson(FETCH_KEY,{});
    return true;
  }
  /* After the restart: what came back is already in Nisia, so it isn't sent again. */
  function afterRestore(){
    if(!readJson(RESTORED_KEY,null))return;
    try{const D=window.eviaData;D.markSynced(D.changesSince());const sent=readJson(MEDIA_KEY,{})||{};mediaIds().forEach(m=>{sent[m.id]=sent[m.id]||"restored"});writeJson(MEDIA_KEY,sent)}catch(err){console.warn("Evia: after restore",err&&err.message)}
    try{localStorage.removeItem(RESTORED_KEY)}catch(_){}
  }
  /* Photos and files from the other device, on WiFi: each saved where Evia keeps them, then crossed off. */
  async function fetchMedia(c,e){
    const done=readJson(FETCH_KEY,null);if(!done)return;
    const {data:ev,error}=await c.from("evidence").select("id,client_reference").eq("enrolment_id",e.enrolmentId);if(error)throw error;
    const ref={};(ev||[]).forEach(x=>{ref[x.id]=x.client_reference||""});
    const ids=Object.keys(ref);if(!ids.length){try{localStorage.removeItem(FETCH_KEY)}catch(_){}return}
    const {data:files,error:fe}=await c.from("evidence_files").select("evidence_id,storage_path").in("evidence_id",ids);if(fe)throw fe;
    for(const f of files||[]){
      if(done[f.storage_path])continue;
      if(/^observation:/.test(ref[f.evidence_id])){done[f.storage_path]=1;continue}   /* fetchObservations brings these */
      const id=f.storage_path.split("/").pop().replace(/\.[^.]*$/,""),supporting=/^supporting:/.test(ref[f.evidence_id]);
      const have=await window.eviaData.files.get(id,supporting?"supporting":"photo").catch(()=>null);
      if(!have){
        const {data:blob,error:de}=await c.storage.from("evidence").download(f.storage_path);if(de)throw de;
        if(supporting)await window.eviaSupportingFilePut({id,blob});else await window.eviaPutEvidencePhoto(id,blob);
      }
      done[f.storage_path]=1;writeJson(FETCH_KEY,done);
    }
    try{localStorage.removeItem(FETCH_KEY)}catch(_){}
  }
  /* Observations the assessor made in Milos: each arrives as a PDF (with the photos, what they saw and the KSBs they
     signed off) in the learner's Supporting evidence, on WiFi like other files. Fetched once; if the learner removes
     one, the college keeps it and it isn't fetched again. */
  const OBS_KEY="evia7-nisia-observations";
  async function fetchObservations(c,e){
    const got=readJson(OBS_KEY,{})||{};
    const {data:ev,error}=await c.from("evidence").select("id,title,created_at,source_metadata").eq("enrolment_id",e.enrolmentId).eq("source_metadata->>collection","observation");
    if(error)throw error;
    for(const x of ev||[]){
      if(got[x.id])continue;
      const m=x.source_metadata||{};
      const {data:fl,error:fe}=await c.from("evidence_files").select("storage_path,size_bytes").eq("evidence_id",x.id).like("storage_path","%/observation.pdf");
      if(fe)throw fe;
      if(!fl||!fl.length)continue;                    /* still on its way from the assessor's phone */
      const {data:blob,error:de}=await c.storage.from("evidence").download(fl[0].storage_path);if(de)throw de;
      const id="obs-"+x.id,on=m.observedOn||String(x.created_at).slice(0,10);
      await window.eviaSupportingFilePut({id,blob});
      window.eviaData.put("supporting",{id,title:"Observation: "+(m.unit||x.title||"workplace"),type:"document",mime:"application/pdf",size:blob.size,
        filename:("Observation "+(m.unit||"")+" "+on).replace(/[^A-Za-z0-9 -]+/g,"").trim().replace(/\s+/g,"-")+".pdf",
        observation:{by:m.observedBy||"",on,unit:m.unit||"",evidenceId:x.id},criteria:m.ksbs||[],...(m.nvqUnit?{nvqUnit:m.nvqUnit}:{})});
      window.eviaData.markSynced(window.eviaData.changesSince().filter(ch=>ch.collection==="supporting"&&ch.record.id===id));   /* it came from Nisia */
      got[x.id]=new Date().toISOString();writeJson(OBS_KEY,got);
    }
  }
  /* From the employer (Paros): witness testimonies go into Supporting evidence as a document (for the assessor to
     sign off, so they don't tick anything off by themselves), and behaviour ratings show in My progress. */
  const EMP_KEY="evia7-nisia-employer";
  const WRATE=["","Getting there","Competent","Excellent"];
  function loadPdf(){
    if(window.jspdf)return Promise.resolve(window.jspdf);
    return new Promise((res,rej)=>{const el=document.createElement("script");el.src="vendor/jspdf.umd.min.js";el.onload=()=>window.jspdf?res(window.jspdf):rej(new Error("no pdf"));el.onerror=()=>rej(new Error("no pdf"));document.head.appendChild(el)});
  }
  async function witnessFile(w,who,learner){
    const on=new Date(w.signed_at||w.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
    try{
      const {jsPDF}=await loadPdf(),doc=new jsPDF({unit:"mm",format:"a4"}),W=170;let y=24;
      doc.setFont("helvetica","bold");doc.setFontSize(18);doc.text("Witness testimony",20,y);y+=8;
      doc.setFont("helvetica","normal");doc.setFontSize(11);doc.setTextColor(90);
      [["Apprentice",learner],["Employer",who],["Unit",w.unit||""],["Date",on],["How well",WRATE[w.rating]||""],["KSBs",(w.ksbs||[]).join(", ")]].forEach(([k,v])=>{if(!v)return;doc.text(k+": "+v,20,y);y+=6});
      y+=4;doc.setTextColor(20);doc.setFontSize(12);
      doc.splitTextToSize(String(w.statement||""),W).forEach(l=>{if(y>275){doc.addPage();y=20}doc.text(l,20,y);y+=6});
      y+=6;doc.setFontSize(10);doc.setTextColor(90);
      if(w.signed_at)doc.text("Signed in Paros by the employer as seen first hand, "+on+".",20,y);
      return {blob:doc.output("blob"),mime:"application/pdf",ext:"pdf"};
    }catch(_){
      const t="Witness testimony\n\nApprentice: "+learner+"\nEmployer: "+who+"\nUnit: "+(w.unit||"")+"\nDate: "+on+"\nHow well: "+(WRATE[w.rating]||"")+"\nKSBs: "+(w.ksbs||[]).join(", ")+"\n\n"+(w.statement||"")+"\n";
      return {blob:new Blob([t],{type:"text/plain"}),mime:"text/plain",ext:"txt"};
    }
  }
  const BRATE=["","Needs support","Developing","Good","Excellent"];
  const behName=k=>{try{const o=window.EVIA_KSB_OFFICIAL||{},c=typeof course==="string"?course:"";return (o[c]||o[c==="trowel3"?"bricklayer":c]||{})[k]||""}catch(_){return ""}};
  async function ratingFile(b,who,learner){
    const on=new Date(b.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}),rows=Object.entries(b.ratings||{}).sort();
    try{
      const {jsPDF}=await loadPdf(),doc=new jsPDF({unit:"mm",format:"a4"});let y=24;
      doc.setFont("helvetica","bold");doc.setFontSize(18);doc.text("Employer feedback: behaviours",20,y);y+=8;
      doc.setFont("helvetica","normal");doc.setFontSize(11);doc.setTextColor(90);
      [["Apprentice",learner],["Employer",who],["Date",on]].forEach(([k,v])=>{if(v){doc.text(k+": "+v,20,y);y+=6}});
      y+=4;doc.setTextColor(20);
      rows.forEach(([k,v])=>{const lines=doc.splitTextToSize(k+"  "+behName(k),130);doc.setFont("helvetica","normal");doc.text(lines,20,y);doc.setFont("helvetica","bold");doc.text(BRATE[v]||String(v),190,y,{align:"right"});y+=lines.length*5.5+3;if(y>270){doc.addPage();y=20}});
      if(b.comment){y+=4;doc.setFont("helvetica","normal");doc.setFontSize(12);doc.splitTextToSize("“"+b.comment+"”",170).forEach(l=>{if(y>275){doc.addPage();y=20}doc.text(l,20,y);y+=6})}
      return {blob:doc.output("blob"),mime:"application/pdf",ext:"pdf"};
    }catch(_){
      const t="Employer feedback: behaviours\n\nApprentice: "+learner+"\nEmployer: "+who+"\nDate: "+on+"\n\n"+rows.map(([k,v])=>k+" "+behName(k)+": "+(BRATE[v]||v)).join("\n")+(b.comment?"\n\n"+b.comment:"")+"\n";
      return {blob:new Blob([t],{type:"text/plain"}),mime:"text/plain",ext:"txt"};
    }
  }
  async function fetchEmployer(emp,e){
    const w={data:(emp&&emp.witness)||[]},r={data:(emp&&emp.ratings)||[]};
    const was=readJson(EMP_KEY,{})||{},seen=new Set(was.seen||[]),who=e.employer||"Your employer",learner=(window.eviaData.learner()||{}).name||e.name||"";
    const have=new Set(window.eviaData.list("supporting").map(x=>x.id));
    for(const t of w.data||[]){
      const id="emp-"+t.id;if(have.has(id))continue;
      const f=await witnessFile(t,who,learner),on=String(t.signed_at||t.created_at).slice(0,10);
      await window.eviaSupportingFilePut({id,blob:f.blob});
      window.eviaData.put("supporting",{id,title:"Witness testimony: "+(t.unit||"workplace"),type:"document",mime:f.mime,size:f.blob.size,
        filename:("Witness testimony "+(t.unit||"")+" "+on).replace(/[^A-Za-z0-9 -]+/g,"").trim().replace(/\s+/g,"-")+"."+f.ext,
        witness:{name:who,role:"Employer"},employer:{id:t.id,statement:t.statement,rating:t.rating,unit:t.unit||"",ksbs:t.ksbs||[],at:t.signed_at||t.created_at,signed:!!t.signed_at}});
      window.eviaData.markSynced(window.eviaData.changesSince().filter(ch=>ch.collection==="supporting"&&ch.record.id===id));   /* it came from Nisia */
    }
    for(const b of r.data||[]){
      const id="emp-"+b.id;if(have.has(id))continue;
      const f=await ratingFile(b,who,learner),on=String(b.created_at).slice(0,10);
      await window.eviaSupportingFilePut({id,blob:f.blob});
      window.eviaData.put("supporting",{id,title:"Employer feedback: behaviours",type:"document",mime:f.mime,size:f.blob.size,
        filename:("Employer feedback behaviours "+on).replace(/\s+/g,"-")+"."+f.ext,
        witness:{name:who,role:"Employer"},employer:{id:b.id,kind:"behaviours",ratings:b.ratings||{},comment:b.comment||"",at:b.created_at}});
      window.eviaData.markSynced(window.eviaData.changesSince().filter(ch=>ch.collection==="supporting"&&ch.record.id===id));
    }
    writeJson(EMP_KEY,{who,witness:(w.data||[]).map(t=>({id:t.id,unit:t.unit,rating:t.rating,statement:t.statement,ksbs:t.ksbs||[],at:t.signed_at||t.created_at})),ratings:r.data||[],seen:[...seen],at:Date.now()});
  }
  window.eviaEmployer={
    get(){const d=readJson(EMP_KEY,null);return d&&((d.witness||[]).length||(d.ratings||[]).length)?d:null},
    unseen(){const d=this.get();if(!d)return 0;const s=new Set(d.seen||[]);return [...d.witness,...d.ratings].filter(x=>!s.has(x.id)).length},
    markSeen(){const d=readJson(EMP_KEY,null);if(!d)return;d.seen=[...(d.witness||[]),...(d.ratings||[])].map(x=>x.id);writeJson(EMP_KEY,d)}
  };
  /* College hours: each session the tutor finished in Symi, with what was taught. They're in the learning log,
     confirmed by the tutor, so the learner can't change or delete them; a session later marked absent goes. */
  async function fetchCollege(data){
    const D=window.eviaData,have=new Map(D.list("hours").filter(h=>h.source==="college").map(h=>[h.id,h])),keep=new Set();let changed=false;
    for(const s of data||[]){
      if(!(s.minutes>0)||s.status==="absent")continue;
      const id="college-"+s.id,old=have.get(id);keep.add(id);
      const college={class:s.class||"",lesson:s.lesson||"",ksbs:s.ksbs||[],date:s.session_date,checkedInAt:s.checked_in_at||null};
      const description="College · "+(s.class||"class")+(s.lesson?": "+s.lesson:"");
      if(old&&old.minutes===s.minutes&&old.description===description)continue;
      D.put("hours",{id,minutes:s.minutes,description,source:"college",college,occurredAt:s.session_date+"T12:00:00",createdAt:old?old.createdAt:new Date().toISOString()});
      changed=true;
    }
    have.forEach((h,id)=>{if(!keep.has(id)){D.remove("hours",id);changed=true}});
    if(changed){D.markSynced(D.changesSince().filter(ch=>ch.collection==="hours"&&String(ch.record.id).startsWith("college-")));if(typeof persist==="function")try{persist()}catch(_){}}
  }
  /* ---------- Registers: this week's classes, checking in with no signal, and days off ----------
     All through the shared Nisia actions (nisia-actions.js, the same file every Nisia app uses): one request for
     everything about the learner's registers (whatsNew), and check-ins and days off that are kept with no signal and
     sent when there is. A kept scan goes with when it was scanned: the code proves when it was on the classroom
     screen, so Nisia records the check-in at that time (and tells the tutor it was made offline). Days off tell
     everyone with the learner: their tutor, assessor and employer. */
  const A=window.NisiaActions;
  A.use(async(fn,args)=>{const c=await sb(),{data,error}=await c.rpc(fn,args);if(error)throw new Error(error.message||"That didn’t work. Try again.");return data},{app:"evia"});
  /* The learner's course pack from Nisia (its topics and KSBs), kept on the phone. With your packs Evia's topics stay
     its own (they're the same); with a college's own pack, Evia's topics follow it (packs.js). */
  const PACK_KEY="evia7-nisia-pack";
  const pack=()=>readJson(PACK_KEY,null);
  async function fetchPack(c){
    const have=pack(),{data,error}=await c.rpc("nisia_my_pack",{p_have:have&&have.hash||null});
    if(error)throw error;
    if(data&&!data.unchanged){writeJson(PACK_KEY,data);
      /* A college's own pack: Evia's topics follow it now (and back again if the learner returns to yours). */
      try{if(window.eviaPacks&&window.eviaPacks.followKept(typeof course==="string"?course:"")&&typeof render==="function"&&!document.querySelector(".chat-sheet"))render()}catch(err){console.warn("Evia: pack",err&&err.message)}}
  }
  /* Whether Nisia's pack has the same topics and KSBs as Evia's own for the course (true for your packs). */
  function packMatches(){
    const p=pack(),mine=window.eviaPacks&&p&&p.course!=="trowel3"&&window.eviaPacks.pack(p.course);
    if(!p||!mine)return null;
    return JSON.stringify(p.topics.map(t=>[t.id,t.name,t.ksbs.map(k=>k.code)]))===JSON.stringify(mine.units.map(u=>[u.id,u.name,u.ksbs.map(k=>k.code)]));
  }
  const SESS_KEY="evia7-nisia-sessions",CR_KEY="evia7-nisia-checkin-results",ABS_KEY="evia7-nisia-absences",ATT_KEY="evia7-nisia-attendance",VIS_KEY="evia7-nisia-visits",TT_KEY="evia7-nisia-timetable";
  /* Kept by an older Evia (before the shared actions): moved across once. */
  try{const q=readJson("evia7-nisia-checkin-queue",[])||[],b=readJson("evia7-nisia-absence-queue",[])||[];
    if(q.length||b.length){const K="nisia-outbox-v1:evia",o=readJson(K,[])||[];
      q.forEach(x=>o.push({name:"checkIn",args:{p_code:x.code},tag:"checkin:"+(x.session||"unknown"),at:x.at}));
      b.forEach(x=>o.push({name:"bookAbsence",args:x.args,tag:"absence:"+x.local.id,at:new Date().toISOString()}));
      writeJson(K,o);localStorage.removeItem("evia7-nisia-checkin-queue");localStorage.removeItem("evia7-nisia-absence-queue")}}catch(_){}
  const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
  const sessions=()=>((readJson(SESS_KEY,null)||{}).list)||[];
  const keptCheckIns=()=>A.waiting().filter(x=>x.name==="checkIn");
  function markChecked(r){
    if(!r||!r.session)return;
    const st=readJson(SESS_KEY,null);if(!st)return;
    st.list.forEach(s=>{if(s.id===r.session){s.checked_in_at=s.checked_in_at||r.at;s.late=!!r.late}});writeJson(SESS_KEY,st);
  }
  /* Everything about the learner's registers, in one request: college hours, this week's classes, days off. */
  async function fetchRegisters(){
    const w=await A.send("whatsNew")||{};
    await fetchCollege(w.college||[]);
    writeJson(SESS_KEY,{at:Date.now(),list:w.sessions||[]});
    const kept=new Set(A.waiting().filter(x=>x.name==="bookAbsence").map(x=>x.tag));
    writeJson(ABS_KEY,(w.absences||[]).concat((readJson(ABS_KEY,[])||[]).filter(a=>a.local&&kept.has("absence:"+a.id))));
    if(Array.isArray(w.attendance))writeJson(ATT_KEY,{at:Date.now(),list:w.attendance});
    /* Visits the assessor has booked (Milos): on the Calendar. */
    if(Array.isArray(w.visits))writeJson(VIS_KEY,w.visits);
    /* The class timetable (days, times, start and end dates), so the Calendar shows every college day ahead. */
    if(Array.isArray(w.timetable))writeJson(TT_KEY,w.timetable);
    return w;
  }
  /* Kept with no signal, now sent. A check-in Nisia turns down is kept as a problem for the learner to see. */
  async function sendKept(){
    if(!A.waiting().length)return;
    const res=readJson(CR_KEY,[])||[];
    for(const x of await A.flush()){
      if(x.name==="checkIn"){if(x.ok)markChecked(x.result);else res.push({at:x.at,class:(sessions().find(s=>"checkin:"+s.id===x.tag)||{}).class||"",message:x.error||"",seen:false})}
      else if(!x.ok)console.warn("Evia: Nisia",x.name,x.error);
    }
    writeJson(CR_KEY,res.slice(-5));
  }
  /* The class on now: from 30 minutes before it starts until it ends, not checked in (or waiting to send) and not booked off. */
  function classNow(){
    const t=Date.now(),kept=new Set(keptCheckIns().map(x=>x.tag));
    return sessions().find(s=>s.starts_at&&!s.checked_in_at&&!s.reason&&s.status!=="finished"&&t>=Date.parse(s.starts_at)-30*60e3&&
      t<=(Date.parse(s.ends_at||"")||Date.parse(s.starts_at)+3*36e5)&&!kept.has("checkin:"+s.id)&&!absences().some(a=>s.session_date>=a.starts_on&&s.session_date<=a.ends_on))||null;
  }
  /* Checking in to a class: the code on the classroom screen (Symi), checked by Nisia. With no signal, kept. */
  async function checkIn(code){
    const e=joined();if(!e||!e.live)throw new Error("Connect Evia to your college first.");
    code=String(code||"").trim();
    const m=/^NISI:IN:\d+:([0-9a-f-]{36}):/.exec(code),now=classNow(),sid=m?m[1]:now&&now.id;
    if(navigator.onLine){const c=await sb(),{data:s}=await c.auth.getSession();if(!s||!s.session)throw new Error("Evia isn’t signed in to your college. Ask your assessor for a new code.")}
    const r=await A.send("checkIn",{p_code:code},{tag:"checkin:"+(sid||"unknown")});
    if(r&&r.kept){const s=sessions().find(x=>x.id===sid);return {queued:true,class:s&&s.class||"",lesson:s&&s.lesson||"",at:r.at}}
    markChecked(r);
    return r;
  }
  /* Check-ins that didn't go through once there was signal: the learner should tell their tutor. */
  const checkInProblems=()=>(readJson(CR_KEY,[])||[]).filter(x=>!x.seen);
  function seenCheckInProblems(){writeJson(CR_KEY,(readJson(CR_KEY,[])||[]).map(x=>Object.assign(x,{seen:true})))}
  const waitingCheckIns=()=>keptCheckIns().length;

  /* Days off: the learner's own, soonest first; booked ones waiting for signal too. */
  /* College days from the timetable between two days (YYYY-MM-DD): each class's weekly (or every few weeks), monthly
     or one-off days, within its start and end dates. Sessions Symi has already opened come from sessions(). */
  function timetableDays(from,to){
    const DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],out=[],key=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
    (readJson(TT_KEY,[])||[]).forEach(t=>{
      const s=t&&t.schedule||{},r=s.recurrence||{},type=r.type||"weekly",lo=r.startDate&&r.startDate>from?r.startDate:from,hi=r.endDate&&r.endDate<to?r.endDate:to;
      const at=(k,hm)=>{const d=new Date(k+"T"+(hm||"09:00"));return isNaN(d)?null:d.toISOString()};
      const add=k=>out.push({session_date:k,class:t.class||"",room:t.room||"",starts_at:at(k,s.start),ends_at:at(k,s.end),planned:true});
      if(type==="once"){const k=r.onceDate||r.startDate;if(k&&k>=from&&k<=to)add(k);return}
      if(lo>hi)return;
      const wd=new Set((r.weekdays&&r.weekdays.length?r.weekdays:[s.day]).map(x=>DAYS.indexOf(x)).filter(i=>i>=0)),md=new Set((r.monthDays||[]).map(Number)),every=Math.max(1,Number(r.interval)||1);
      const anchor=new Date((r.anchorDate||r.startDate||lo)+"T12:00:00"),monday=d=>{const x=new Date(d);x.setDate(x.getDate()-(x.getDay()+6)%7);return x};
      for(let d=new Date(lo+"T12:00:00");key(d)<=hi;d.setDate(d.getDate()+1)){
        if(type==="monthly"){const months=(d.getFullYear()-anchor.getFullYear())*12+d.getMonth()-anchor.getMonth();if(md.has(d.getDate())&&months%every===0)add(key(d));continue}
        const weeks=Math.round((monday(d)-monday(anchor))/6048e5);if(wd.has(d.getDay())&&((weeks%every)+every)%every===0)add(key(d));
      }
    });
    return out;
  }
  const absences=()=>(readJson(ABS_KEY,[])||[]).filter(a=>a&&a.ends_on>=today()).sort((a,b)=>a.starts_on<b.starts_on?-1:1);
  const KINDS={ill:"Ill",holiday:"Holiday",appointment:"Appointment",work:"At work",other:"Other"};
  async function bookAbsence(from,to,kind,reason){
    const e=joined();if(!e||!e.live)throw new Error("Connect Evia to your college first.");
    if(!from||!to||to<from)throw new Error("Choose the first and last day.");
    if(!KINDS[kind])throw new Error("Choose a reason.");
    reason=String(reason||"").trim().slice(0,200);
    if(kind==="other"&&!reason)throw new Error("Say what the reason is.");
    const local={id:"local-"+Date.now(),starts_on:from,ends_on:to,kind,reason:reason||KINDS[kind],booked_by:"You",booked_by_role:"learner",local:true};
    const r=await A.send("bookAbsence",{p_from:from,p_to:to,p_kind:kind,p_reason:reason||null},{tag:"absence:"+local.id}),sent=r&&!r.kept?r:null;
    writeJson(ABS_KEY,(readJson(ABS_KEY,[])||[]).concat(sent?Object.assign({},local,{id:sent.id,local:false}):local));
    /* Classes those days: no "Check in" card. */
    const st=readJson(SESS_KEY,null);if(st){st.list.forEach(s=>{if(s.session_date>=from&&s.session_date<=to&&!s.checked_in_at)s.reason=local.reason});writeJson(SESS_KEY,st)}
    return {sent:!!sent,reason:local.reason};
  }
  async function cancelAbsence(id){
    if(String(id).startsWith("local-"))A.drop("absence:"+id);
    else{if(!navigator.onLine)throw new Error("You need signal to cancel it.");await A.send("cancelAbsence",{p_id:id})}
    const gone=(readJson(ABS_KEY,[])||[]).find(a=>a.id===id);
    writeJson(ABS_KEY,(readJson(ABS_KEY,[])||[]).filter(a=>a.id!==id));
    const st=readJson(SESS_KEY,null);if(st&&gone){st.list.forEach(s=>{if(s.session_date>=gone.starts_on&&s.session_date<=gone.ends_on&&s.reason===gone.reason)s.reason=null});writeJson(SESS_KEY,st)}
  }
  /* The assessor's sign-offs and feedback on the learner's own evidence (Milos), kept by Evia's id for each piece. */
  const FEEDBACK_KEY="evia7-nisia-feedback";
  async function fetchFeedback(data){
    const was=readJson(FEEDBACK_KEY,{})||{},now={};
    (data||[]).forEach(f=>{const m=/^(evidence|supporting|observation):(.+)$/.exec(f.client_reference||"");if(!m)return;
      const id=m[1]==="evidence"?m[2]:m[1]+":"+m[2],prev=was[id];
      now[id]={kind:m[1],unit:f.unit||"",decision:f.decision,feedback:f.feedback||"",ksbs:f.ksbs||[],at:f.assessed_at,by:f.assessor||"",seen:prev&&prev.at===f.assessed_at?prev.seen:false}});
    if(JSON.stringify(now)!==JSON.stringify(was)){writeJson(FEEDBACK_KEY,now);try{if(typeof render==="function"&&!document.querySelector(".chat-sheet"))render()}catch(_){}}
  }
  /* Targets the assessor set at a review in Milos: they replace Evia's current targets for the course, and Evia
     measures them the same way (hours, units, KSBs, tests, confidence, write-ups, lessons). Applied once per review. */
  const REVIEW_TARGETS_KEY="evia7-nisia-review-targets";
  async function fetchTargets(c,e){
    const {data,error}=await c.from("targets").select("id,review_id,title,description,due_date,measure,created_at").eq("enrolment_id",e.enrolmentId).not("measure","is",null).order("created_at",{ascending:false}).limit(20);
    if(error)throw error;
    const latest=(data||[])[0];if(!latest||!latest.review_id)return;
    if(readJson(REVIEW_TARGETS_KEY,null)===latest.review_id)return;
    const set=data.filter(t=>t.review_id===latest.review_id).reverse(),when=Date.parse(latest.created_at)||Date.now();
    const list=set.map(t=>{const m=t.measure||{};return {id:"nt-"+t.id,nisiaId:t.id,course:typeof course==="string"?course:"",kind:m.kind,title:t.title,why:t.description||"",
      target:Number(m.target)||1,baseline:Number(m.baseline)||0,param:m.param??null,due:t.due_date||new Date(when+42*864e5).toISOString().slice(0,10),createdAt:when,done:false,reviewId:t.review_id,reviewDate:new Date(when).toISOString().slice(0,10)}});
    if(!list.length)return;
    window.eviaData.replace("targets",{course:list[0].course},list);
    writeJson(REVIEW_TARGETS_KEY,latest.review_id);
    try{window.eviaTargets&&window.eviaTargets.check(false)}catch(_){}
  }
  /* The college's current details for this learner (name, dates, assessor, safeguarding lead, next review), so a
     change made in Nisia reaches Evia on the next sync. */
  async function refreshDetails(c,e){
    const {data:d,error}=await c.rpc("nisia_my_details");
    if(error||!d)return;
    const keep=v=>v===null||v===undefined?undefined:v;
    const next=Object.assign({},e,{name:keep(d.name)??e.name,college:keep(d.college)??e.college,start:keep(d.start)??e.start,end:keep(d.end)??e.end,
      employer:keep(d.employer)??e.employer,employerContact:keep(d.employerContact)??e.employerContact,assessor:keep(d.assessor)??e.assessor,tutor:keep(d.tutor)??e.tutor,
      plannedOtjHours:keep(d.plannedOtjHours)??e.plannedOtjHours,reviewDue:d.reviewDue||null,lastReview:d.lastReview||null,safeguarding:d.safeguarding||e.safeguarding});
    const pick=o=>JSON.stringify([o.name,o.college,o.start,o.end,o.employer,o.employerContact,o.assessor,o.tutor,o.plannedOtjHours,o.reviewDue,o.lastReview,o.safeguarding]);
    if(pick(next)!==pick(e))window.eviaData.enrol(next);
    const L=window.eviaData.learner()||{},upd={};
    if(d.name&&d.name!==L.name)upd.name=d.name;
    if(d.start&&d.start!==L.start)upd.start=d.start;
    if(d.end&&d.end!==L.end)upd.end=d.end;
    if(d.safeguarding&&JSON.stringify(d.safeguarding)!==JSON.stringify(L.safeguarding||null))upd.safeguarding=d.safeguarding;
    if(Object.keys(upd).length){window.eviaData.put("learner",upd);if(typeof render==="function")try{render()}catch(_){}}
  }
  let running=null;
  function sync(){
    if(running)return running;
    running=(async()=>{
      if(!joined())return status();
      if(!navigator.onLine)return note({offline:true});
      const D=window.eviaData,e=joined(),changes=D.changesSince();
      const c=e.live?await sb():null;
      if(c){const {data}=await c.auth.getSession();if(!data.session)return note({error:"signed-out"})}
      if(c)try{await refreshDetails(c,e)}catch(err){console.warn("Evia: Nisia details",err&&err.message)}
      if(c)try{await fetchTargets(c,e)}catch(err){console.warn("Evia: Nisia targets",err&&err.message)}
      /* Everything Nisia has for the learner, in one request (whatsNew): registers, attendance, days off, feedback. */
      if(c)try{await sendKept();const w=await fetchRegisters();
        /* Only what Nisia actually sent replaces what Evia has: an older Nisia without these parts leaves them alone. */
        try{await fetchFeedback(Array.isArray(w.feedback)?w.feedback:await c.rpc("nisia_my_feedback").then(r=>{if(r.error)throw r.error;return r.data||[]}))}catch(err){console.warn("Evia: Nisia feedback",err&&err.message)}
        try{if(w.employer)await fetchEmployer(w.employer,e)}catch(err){console.warn("Evia: Nisia employer feedback",err&&err.message)}
        try{await fetchPack(c)}catch(err){console.warn("Evia: Nisia pack",err&&err.message)}
      }catch(err){console.warn("Evia: Nisia registers",err&&err.message)}
      /* Game leaderboards: scores waiting to go, and prizes from last month (leaderboard.js). */
      if(c&&window.eviaLeaderboard)try{await window.eviaLeaderboard.onSync()}catch(err){console.warn("Evia: Nisia leaderboards",err&&err.message)}
      /* Records: small, on any connection, in batches. (The demo keeps them on the phone.) */
      for(let i=0;i<changes.length;i+=50){const batch=changes.slice(i,i+50);if(c)await sendRecords(c,e,batch);D.markSynced(batch)}
      if(c)await sendSnapshot(c,e);
      if(c)await sendStore(c,e);
      /* Media: only on WiFi, both ways. */
      const sent=readJson(MEDIA_KEY,{})||{};
      if(onWifi()){
        if(c)try{await fetchMedia(c,e)}catch(err){console.warn("Evia: Nisia media down",err&&err.message)}
        if(c)try{await fetchObservations(c,e)}catch(err){console.warn("Evia: Nisia observations",err&&err.message)}
        for(const m of mediaIds().filter(m=>!sent[m.id])){
          try{sent[m.id]=c?await sendMedia(c,e,m):new Date().toISOString();writeJson(MEDIA_KEY,sent)}
          catch(err){console.warn("Evia: Nisia media",m.id,err&&err.message);break}
        }
      }
      return note({offline:false,error:null,lastSync:new Date().toISOString()});
    })().catch(err=>{note({error:String(err&&err.message||err)});throw err}).finally(()=>{running=null});
    return running;
  }
  /* What's still to send: changes waiting, and photos and files waiting for WiFi. */
  function status(){
    const st=readJson(STATUS_KEY,{})||{},sent=readJson(MEDIA_KEY,{})||{};
    let changes=0,media=0;
    try{changes=window.eviaData.changesSince().length;media=mediaIds().filter(m=>!sent[m.id]).length}catch(_){}
    return {joined:!!joined(),lastSync:st.lastSync||null,changes,media,wifi:onWifi(),online:navigator.onLine,error:st.error||null};
  }
  /* In words, for the profile. */
  function statusText(){
    const s=status(),e=joined();if(!e)return "";
    if(s.error==="signed-out")return "Not connected. Ask your assessor for a new code to connect Evia again.";
    if(!s.online)return "Offline. Everything is saved on your phone and goes to "+e.college+" when you’re back online.";
    if(s.media&&!s.wifi)return s.media+" photo"+(s.media===1?"":"s")+" and file"+(s.media===1?"":"s")+" waiting for WiFi.";
    if(s.changes||s.media)return "Sending to "+e.college+"…";
    if(s.lastSync){const m=Math.round((Date.now()-Date.parse(s.lastSync))/60000);return "Up to date with "+e.college+" · "+(m<1?"just now":m<60?m+" min ago":new Date(s.lastSync).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))}
    return "Waiting to send to "+e.college+".";
  }

  /* When: soon after something changes, when the phone comes back online or onto WiFi, when Evia opens, and every few minutes. */
  let t=null;const soon=()=>{clearTimeout(t);t=setTimeout(()=>{if(joined())sync().catch(()=>{})},3000)};
  addEventListener("online",soon);
  if(navigator.connection&&navigator.connection.addEventListener)navigator.connection.addEventListener("change",soon);
  addEventListener("load",()=>{
    afterRestore();
    let back=false;try{back=sessionStorage.getItem("evia7-welcome-back")==="1";sessionStorage.removeItem("evia7-welcome-back")}catch(_){}
    if(back)setTimeout(()=>{if(typeof showEvidenceToast==="function")showEvidenceToast("Welcome back. Your work is here, and photos follow on WiFi.")},800);
    if(window.eviaData&&window.eviaData.on)window.eviaData.on("change",soon);setTimeout(soon,back?500:3000);setInterval(soon,5*60000)});

  /* A dot on the profile button while anything is waiting (no signal, or photos waiting for WiFi), so nobody thinks
     their work has reached the college when it hasn't. The profile says what's waiting. */
  function badge(){const b=document.getElementById("profile-btn");if(!b)return;const st=status();b.classList.toggle("nisia-waiting",st.joined&&(st.changes>0&&!st.online||st.media>0&&!st.wifi));
    const line=document.getElementById("pf-sync");if(line)line.textContent=statusText()}
  listeners.push(badge);addEventListener("offline",badge);addEventListener("online",badge);
  addEventListener("load",()=>setInterval(badge,30000));
  /* One of Nisia's functions, for the learner's own enrolment (leaderboard.js). Needs signal and a live connection. */
  async function rpc(name,args){
    const e=joined();if(!e||!e.live)throw new Error("not connected");if(!navigator.onLine)throw new Error("offline");
    const c=await sb(),{data,error}=await c.rpc(name,Object.assign({p_enrolment:e.enrolmentId},args||{}));if(error)throw error;return data;
  }
  window.eviaNisia={pair,accept,joined,sync,status,statusText,clean,rpc,checkIn,onStatus:fn=>listeners.push(fn),
    sessions,classNow,waitingCheckIns,coursePack:pack,coursePackMatches:packMatches,attendance:()=>((readJson(ATT_KEY,null)||{}).list)||null,timetableDays,visits:()=>(readJson(VIS_KEY,[])||[]).filter(v=>v&&v.starts_at),checkInProblems,seenCheckInProblems,absences,bookAbsence,cancelAbsence,absenceKinds:KINDS};

  /* ---------- Notifications ----------
     Course things only, and only if the learner turns them on: evidence signed off or sent back, new targets, reviews,
     and reminders when a review or target is due or learning hours are behind on a Friday. Nisia sends them (Web
     Push, no app store), outside 9pm to 7:30am. iPhones need Evia added to the Home Screen first.
     state(): not-joined | unsupported | install | blocked | off | on */
  const VAPID="BCvAqfno7ja_7c6SDkZXFkl37v0t7zrZ6RkqVvTGNhtB9pL_7fYN2wT9hwYQBp0Y_4QfiNFc2opCpVw4IAcyxLk",PUSH_KEY="evia7-push";
  const canPush=()=>"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
  const isIos=()=>/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const standalone=()=>{try{return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true}catch(_){return false}};
  const keyBytes=k=>Uint8Array.from(atob(k.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((k.length+3)%4)),c=>c.charCodeAt(0));
  const pushPref=v=>{const p=Object.assign(readJson(PUSH_KEY,{})||{},v||{});if(v)writeJson(PUSH_KEY,p);return p};
  function pushState(){
    const e=joined();if(!e||!e.live)return "not-joined";
    if(!canPush())return isIos()&&!standalone()?"install":"unsupported";
    if(Notification.permission==="denied")return "blocked";
    return Notification.permission==="granted"&&pushPref().on?"on":"off";
  }
  async function pushSave(sub){
    const c=await sb(),{data}=await c.auth.getSession();if(!data||!data.session)throw new Error("not signed in");
    const j=sub.toJSON();
    const {error}=await c.from("device_tokens").upsert({user_id:data.session.user.id,platform:"web",app:"evia",token:j.endpoint,subscription:{endpoint:j.endpoint,keys:j.keys},last_seen_at:new Date().toISOString()},{onConflict:"token"});
    if(error)throw error;pushPref({saved:new Date().toISOString().slice(0,10)});
  }
  async function subscription(){
    const reg=await navigator.serviceWorker.ready;
    return (await reg.pushManager.getSubscription())||reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(VAPID)});
  }
  /* From a tap (phones only ask for permission from one). */
  async function pushOn(){
    if(!canPush())return false;
    const perm=await Notification.requestPermission();
    pushPref({asked:new Date().toISOString()});
    if(perm!=="granted")return false;
    await pushSave(await subscription());
    pushPref({on:true});return true;
  }
  async function pushOff(){
    pushPref({on:false});
    try{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();
      if(sub){try{const c=await sb();await c.from("device_tokens").delete().eq("token",sub.endpoint)}catch(_){}await sub.unsubscribe()}}catch(_){}
  }
  /* Once a day while on: the phone's subscription can change, so Nisia gets the current one. */
  async function pushRefresh(){
    if(pushState()!=="on"||!navigator.onLine||pushPref().saved===new Date().toISOString().slice(0,10))return;
    try{await pushSave(await subscription())}catch(err){console.warn("Evia: notifications",err&&err.message)}
  }
  /* What a tapped notification opens. */
  function pushOpen(what){
    const K=window.eviaChatKit;if(!K||!what)return;
    const run=()=>{
      if(what==="feedback"){const f=window.eviaFeedback&&window.eviaFeedback.unseen()[0];if(f)K.runNudge({action:{kind:"feedback",label:"See feedback"},feedback:f});else if(window.eviaEmployer&&window.eviaEmployer.unseen()&&typeof openSupportingDetails==="function"){
        const x=window.eviaData.list("supporting").filter(r=>String(r.id).startsWith("emp-")).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))[0];
        window.eviaEmployer.markSeen();if(x)openSupportingDetails(x.id,false);else if(window.eviaOpenEmployer)window.eviaOpenEmployer()}else if(typeof nav==="function")nav("course")}
      else if(what==="targets")K.runNudge({action:{kind:"targets",label:"My targets"}});
      else if(what==="review")K.runNudge({action:{kind:"prep",label:"Get ready for my review"}});
      else if(what==="calendar"){if(typeof nav==="function")nav("calendar")}
      else if(what==="hours")K.runNudge({action:{kind:"learning",label:"Log learning hours"}});
    };
    /* Fetch what the assessor did first, so it's there to show. */
    Promise.race([joined()?sync().catch(()=>{}):null,new Promise(r=>setTimeout(r,6000))]).then(run);
  }
  if("serviceWorker" in navigator)navigator.serviceWorker.addEventListener("message",ev=>{if(ev.data&&ev.data.type==="evia-open")pushOpen(ev.data.open)});
  addEventListener("load",()=>{
    let open="";try{const q=new URLSearchParams(location.search);open=q.get("open")||"";if(open){q.delete("open");history.replaceState(null,"",location.pathname+(q.toString()?"?"+q:"")+location.hash)}}catch(_){}
    if(open)setTimeout(()=>pushOpen(open),1200);
    setTimeout(pushRefresh,8000);
  });
  window.eviaPush={state:pushState,on:pushOn,off:pushOff,asked:()=>!!pushPref().asked,open:pushOpen};
})();
