/* Evia7 evidence UX: single-page working evidence pack. */
(function(){
  const WORKING_KEY="evia7-working-evidence-packs";
  const DB_NAME="evia7-evidence-db";
  const DB_VERSION=2;
  const PHOTO_STORE="photos";
  const SUPPORT_STORE="supporting";
  let dbPromise=null;
  const openDB=()=>dbPromise||(dbPromise=new Promise((resolve,reject)=>{
    if(!("indexedDB" in window))return reject(new Error("IndexedDB unavailable"));
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(PHOTO_STORE))db.createObjectStore(PHOTO_STORE,{keyPath:"id"});if(!db.objectStoreNames.contains(SUPPORT_STORE))db.createObjectStore(SUPPORT_STORE,{keyPath:"id"})};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error("IndexedDB unavailable"));
  }));
  const idbPut=value=>openDB().then(db=>new Promise((resolve,reject)=>{
    const tx=db.transaction(PHOTO_STORE,"readwrite");tx.objectStore(PHOTO_STORE).put(value);
    tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error||new Error("Photo save failed"));
  }));
  const idbGet=id=>openDB().then(db=>new Promise((resolve,reject)=>{
    const tx=db.transaction(PHOTO_STORE,"readonly"),req=tx.objectStore(PHOTO_STORE).get(id);
    req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error||new Error("Photo load failed"));
  }));
  const idbDelete=id=>openDB().then(db=>new Promise((resolve,reject)=>{
    const tx=db.transaction(PHOTO_STORE,"readwrite");tx.objectStore(PHOTO_STORE).delete(id);
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error("Photo delete failed"));
  }));
  const dataUrlToBlob=src=>fetch(src).then(r=>r.blob());
  const blobToDataUrl=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error("Photo conversion failed"));r.readAsDataURL(blob)});
  const makeThumb=file=>new Promise((resolve,reject)=>{
    const r=new FileReader();r.onload=()=>{
      const img=new Image();img.onload=()=>{
        const max=1280,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
        const c=document.createElement("canvas");c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));
        c.getContext("2d",{alpha:false}).drawImage(img,0,0,c.width,c.height);
        c.toBlob(blob=>blob?resolve(blob):reject(new Error("photo compression")),"image/jpeg",.78);
      };img.onerror=reject;img.src=r.result;
    };r.onerror=reject;r.readAsDataURL(file);
  });
  function readWorking(){try{return JSON.parse(localStorage.getItem(WORKING_KEY)||"{}")}catch(_){return{}}}
  function writeWorking(all){try{localStorage.setItem(WORKING_KEY,JSON.stringify(all));return true}catch(_){alert("Evia could not save this evidence pack. Please try again.");return false}}
  function packKey(){return course+"|"+data().u[unit][0]}
  function newPack(){return {course,unit:data().u[unit][0],unitIndex:unit,photos:[],write:"",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}
  async function getPack(){const all=readWorking(),key=packKey();if(!all[key]){all[key]=newPack();writeWorking(all)}const pack=all[key];pack.photos=Array.isArray(pack.photos)?pack.photos:[];return pack}
  async function savePack(pack){const all=readWorking();pack.updatedAt=new Date().toISOString();all[packKey()]=pack;return writeWorking(all)}
  async function removePack(){const all=readWorking(),pack=all[packKey()];if(pack&&Array.isArray(pack.photos))for(const p of pack.photos)if(p.id)await idbDelete(p.id);if(pack&&Array.isArray(pack.media))for(const m of pack.media)if(m.id)await idbDelete(m.id);delete all[packKey()];writeWorking(all)}
  async function migrateLegacyPack(pack){
    if(!pack||!Array.isArray(pack.photos))return pack;let changed=false;const next=[];
    for(const p of pack.photos){if(p&&p.id){next.push(p);continue}if(p&&p.src){const id="photo-"+Date.now()+"-"+Math.random().toString(36).slice(2);await idbPut({id,blob:await dataUrlToBlob(p.src),addedAt:p.addedAt||new Date().toISOString()});next.push({id,addedAt:p.addedAt||new Date().toISOString()});changed=true}}
    if(changed){pack.photos=next;await savePack(pack)}return pack;
  }
  function ksbGroups(){
    const items=data().u[unit][1]||[];
    return {
      skills:items.filter(k=>String(code(k)).toUpperCase().startsWith("S")),
      writeups:items.filter(k=>!String(code(k)).toUpperCase().startsWith("S"))
    };
  }
  function clean(k,skills){
    const raw=String(text(k)||"").trim();
    return raw.replace(new RegExp("^(Skills?|Knowledge|Behaviours?):\\s*","i"),"");
  }

  const LEARNER_PROMPTS={
    bricklayer:{
      "Mixing mortar":{photos:"mixing mortar · ratio · silos · pre-mix · gauging · hand/mechanical · mortar quantity · safety signage · teamwork",writeup:"ratio · silos · pre-mix · gauging · hand/mechanical · mortar quantity · safety signage · teamwork · health · wellbeing"},
      "Jointing Styles":{photos:"joint finishes · half round · flush · weather struck · recessed · PPE · protection",writeup:"joint finishes · PPE · frost/water protection · construction damage · teamwork"},
      "Repair brick walling":{photos:"brick repairs · damaged bricks · safe working area",writeup:"defects · repair methods · asbestos · safe systems · toolbox talks · risk assessments · method statements · terminology · environment"},
      "Basic Brick wall":{photos:"wall setting-out · construction · capping · PPE · hand tools · tool maintenance",writeup:"solid wall construction · health & safety · building principles · DPCs · brick ties · materials · health · safety · wellbeing"},
      "Set out solid walling":{photos:"wall setting-out · drawings · specifications · communication",writeup:"solid wall setting-out · drawings · specifications · slips/trips/falls · communication · digital design/modelling · decorative walling · piers · banding · ownership"},
      "Build solid walling":{photos:"solid wall construction · drawings/specifications · environmental practices",writeup:"wall construction · drawings · specifications · resource efficiency · recycling · waste · surface water · English/Flemish/garden/broken bonds · environment"},
      "Set out Cavity Walling":{photos:"cavity setting-out · openings · levels · profiles · gauge rods · squares · DPCs · cavity trays · weep holes",writeup:"bricks/blocks · wall ties · insulation · DPCs · cavity trays · lintels · mortar · materials · CoSHH · PUWER · electrical safety · manual handling · learning"},
      "Construct Cavity Walling":{photos:"stretcher bond · returns · openings · insulation · fire stopping",writeup:"cavity construction · drawings/specifications · fire safety · fire extinguishers · wellbeing · thermal qualities · airtightness · ventilation · sustainability · learning"},
      "Cavity opening":{photos:"cavity closure · edge sill · wall ties · lintel · soldiers",writeup:"cavity closure · wall ties · lintels · standards · building regulations · warranty standards · inclusion · equity · diversity · expansion joints · modern construction"},
      "Gable end/Raked wall":{photos:"raking cut · gable/garden wall · measuring · cutting · PPE",writeup:"raking walls · working at height · confined spaces · hand-tool cutting · disc cutters · mixers/drills · ownership"}
    },
    site:{
      "Structural carcassing":{photos:"structural carcassing · load-bearing studwork · power tools",writeup:"carcassing · health & safety · power-tool use/storage · timber characteristics · health · safety · wellbeing"},
      "Timber/metal partition walls":{photos:"timber/metal partitions · laser level · timber sizing",writeup:"partition installation · laser levels · timber sizing · building methods · learning & development"},
      "Floor joists (and coverings)":{photos:"floor joists · coverings · safety equipment · structural fixings",writeup:"joists/coverings · CoSHH · PUWER · electrical safety · manual handling · structural fixings · timber sizing · timber decay/repair · environment"},
      "Straight flights of stairs":{photos:"straight stairs · safety · drawings · specifications",writeup:"stair installation · safety · slips/trips/falls · drawings · specifications · digital design/modelling · health · safety · wellbeing"},
      "Service encasement":{photos:"service encasement · safety equipment · hand tools",writeup:"service encasement · fire safety · fire extinguishers · hand tools · tool storage · wellbeing · inclusion · diversity"},
      "Cladding":{photos:"cladding · safe working area",writeup:"cladding · asbestos · safe systems · site inductions · toolbox talks · risk assessments · method statements · hazard identification · mental/physical health · safety"},
      "Wall and floor units":{photos:"wall/floor units · environmental practices · jigs",writeup:"units/fitments · recycling · reuse · waste · sustainable forestry · jig production · teamwork"},
      "Handrails and spindles":{photos:"handrails · spindles · safety signage · communication",writeup:"handrails/spindles · safety signage · communication · construction terminology · hand tools · learning & development"},
      "Internal and external doors":{photos:"doors · joints · nails/screws/bolts · adhesive · hand tools",writeup:"doors · mastics · preservatives · wood fillers · plastics · ironmongery · tool maintenance · sharpening · drawings/specifications · health · safety · wellbeing"},
      "Skirting boards and architrave":{photos:"skirting · architrave · safety equipment · splicing · scribing",writeup:"mouldings · PPE/RPE/LEV · splicing · scribing · employment types · small business · tax · environment"},
      "Window boards":{photos:"window boards · measuring · marking out · cutting · mitring · hinging · recessing",writeup:"window boards · standards · building regulations · warranty standards · measuring · fitting · cutting · mitring · inclusion · equity · diversity"},
      "Roofs and loft hatch":{photos:"rafter roofs · trussed/traditional roofs · verge · eaves · loft access · material estimation · cutting list",writeup:"roof installation · rafter/trussed roofs · confined spaces · working at height · material estimation · timber lengths · fixings · cutting lists · flat roofs · teamwork"}
    },
    joiner:{
      "Basic woodworking joints":{photos:"dovetail · bridal · mortise/tenon · halving · dowels · biscuit · staples · adhesives",writeup:"timber joints · joint production · connections · timber characteristics · health · safety · wellbeing"},
      "Timber Window":{photos:"timber window · casement · glazing rebates · ironmongery · safety equipment · drawings",writeup:"window manufacture/assembly · asbestos · drawings/specifications · digital design/modelling · environment"},
      "Straight staircases":{photos:"straight staircase · material estimation · cutting list · communication",writeup:"staircase manufacture/assembly · working at height · confined spaces · material estimation · timber lengths · fixings · cutting lists · terminology · inclusion · equity · diversity"},
      "Door frames and linings":{photos:"door frames · linings · safety equipment · hand tools",writeup:"frame/lining manufacture · safety signage · hand-tool maintenance · sharpening · timber decay/repair · learning & development"},
      "Timber doors":{photos:"timber doors · power tools · safe working",writeup:"door manufacture/assembly · CoSHH · PUWER · electrical safety · manual handling · power-tool use/storage · timber · health · safety · wellbeing · teamwork"},
      "Wall and floor units":{photos:"wall/floor units · PPE · environmental practices",writeup:"units/fitments · PPE · recycling · reuse · waste · jig production · employment types · small business · tax · health · safety · wellbeing"},
      "Timber mouldings":{photos:"timber mouldings · safe working · environmental practices",writeup:"moulding manufacture · recycling · reuse · waste · wellbeing · mental/physical health · teamwork · environment"},
      "Staircase spindles and balustrades":{photos:"spindles · balustrades · safety · jigs",writeup:"staircase components · safety · jig production · teamwork"},
      "Ironmongery":{photos:"ironmongery · measuring/marking · hand tools · products used",writeup:"ironmongery · mastics · preservatives · wood fillers · plastics · standards · building regulations · warranty standards · hand tools · tool storage · inclusion · equity · diversity · learning & development"},
      "Fixed Machinery":{photos:"fixed machinery · PPE · safe working area",writeup:"machinery · safe systems · site inductions · toolbox talks · risk assessments · method statements · hazard identification · building principles · learning & development · teamwork"}
    }
  };
  Object.assign(LEARNER_PROMPTS,window.EVIA_EXTRA_PROMPTS||{});
  window.eviaLearnerPrompts=LEARNER_PROMPTS;
  function learnerPrompts(){
    const coursePrompts=LEARNER_PROMPTS[course]||{};
    return coursePrompts[data().u[unit][0]]||{photos:"",writeup:""};
  }
  async function renderPhotos(pack){
    const g=$("#evidence-photos");
    const items=await Promise.all((pack.photos||[]).map(async(p,i)=>{
      try{const rec=p.id?await idbGet(p.id):null,src=rec?URL.createObjectURL(rec.blob):p.src||"";return '<div class="photo-item"><img class="thumb" src="'+src+'" alt="Evidence photo"><button type="button" class="photo-remove" data-remove-photo="'+i+'" aria-label="Remove photo">×</button></div>'}catch(_){return ""}
    }));
    g.innerHTML=items.join("");
    g.querySelectorAll("[data-remove-photo]").forEach(b=>b.onclick=async()=>{const i=+b.dataset.removePhoto,p=pack.photos[i];if(p&&p.id)await idbDelete(p.id);pack.photos.splice(i,1);await savePack(pack);await renderPack(pack)});
  }

  /* A pack is made one of two ways, both in Evia's sheets (guide.js): Evia guides it step by step, or free range, with
     every photo first and all the things to capture listed, then the write-up with all the things to mention.
     Whatever is in progress shows on the unit page, above the saved evidence. openAt opens free range at "photos" or
     "write" once the page is drawn (Evia's coach uses it). */
  let openAt=null;
  async function renderPack(pack){
    const u=data().u[unit],photos=pack.photos||[],media=pack.media||[],prompts=learnerPrompts();
    const text=String(pack.write||"").trim(),started=photos.length||text||media.length,ready=!!(photos.length||text||media.length);
    const RA=k=>window.eviaRouteAvatar?window.eviaRouteAvatar(k):'<span class="evia-mini" aria-hidden="true"><span class="evia-face"><i></i><i></i></span></span>';
    const card=(id,kind,title,sub,cls)=>'<button type="button" class="eg-start'+(cls?" "+cls:"")+'" id="'+id+'">'+RA(kind)+'<span><strong>'+title+'</strong><small>'+sub+'</small></span><span class="eg-start-chev" aria-hidden="true">›</span></button>';
    /* Catch up: only once the assessor has looked at this unit's evidence and wants more (app.js moreRequired). */
    const missing=(window.eviaMoreRequired?window.eviaMoreRequired():[]).filter(x=>x.unit===u[0]).map(x=>({code:x.code,text:(u[1].find(k=>code(k)===x.code)||"").split("|").slice(1).join("|")||((typeof allK==="function"?allK():[]).find(y=>y[0]===x.code)||[])[1]||""}));
    const nv=media.filter(x=>x.kind==="video").length,na=media.filter(x=>x.kind==="audio").length;
    const mediaSum=[nv?nv+" video"+(nv===1?"":"s"):"",na?na+" voice note"+(na===1?"":"s"):""].filter(Boolean).join(" · ");
    $("#page-title").textContent=u[0];
    $("#screen").innerHTML='<div class="evidence-pack-page">'+
      '<div class="evidence-heading"><div class="evidence-label">EVIDENCE PACK</div><h2>'+esc(u[0])+'</h2><p>Capture the whole job in one pack. Take photos from the <strong>beginning, middle and end</strong> of the job.</p></div>'+
        '<div class="ev-modes">'+
        (missing.length&&window.eviaGuide?card("cu-start","catch",pack.catch&&!pack.catch.used&&pack.catch.at?"Carry on catching up":"Catch up","Just what your assessor still needs: "+esc(missing.map(x=>x.code).join(", ")),"catch"):"")+
        (window.eviaGuide?card("eg-start","guide",pack.guide&&!pack.guide.used&&(pack.guide.at||Object.values(pack.guide.answers||{}).some(Boolean))?"Carry on with Evia":"Let Evia guide you",pack.guide&&!pack.guide.used&&pack.guide.at?"Pick up where you left off":"Photos one at a time, then a few questions"):"")+
        card("fr-start","free",photos.length||text?"Carry on in free range":"Free range mode",photos.length||text?photos.length+" photo"+(photos.length===1?"":"s")+(text?" and a write-up":"")+" so far":"Add whatever you like: all your photos, then your write-up","fr-start")+
        (window.eviaRecordings&&window.eviaGuide&&window.eviaGuide.record?card("rec-start","record",media.length?"Film or talk some more":"Film it or talk it through",media.length?esc(mediaSum)+" so far":"A video of the job, or a voice note explaining it"):"")+
        '</div>'+
      (started?'<section class="evidence-section fr-progress"><div class="evidence-section-title">IN PROGRESS</div>'+
        '<div class="evidence-thumbs" id="evidence-photos"></div>'+
        (media.length?'<div class="ev-media-chips">'+media.map((m,i)=>'<span class="ev-media-chip '+m.kind+'"><i aria-hidden="true">'+(m.kind==="video"?"▶":"🎙")+'</i>'+(m.kind==="video"?"Video":"Voice note")+(m.secs?" · "+Math.floor(m.secs/60)+":"+String(m.secs%60).padStart(2,"0"):"")+'<button type="button" data-remove-media="'+i+'" aria-label="Remove recording">×</button></span>').join("")+'</div>':"")+
        '<p class="fr-progress-sum">'+[photos.length+' photo'+(photos.length===1?"":"s"),mediaSum,text?text.split(/\s+/).length+' words written':(media.length?"":'no write-up yet')].filter(Boolean).join(" · ")+'</p>'+
        (text?'<p class="fr-progress-text">'+esc(text.length>220?text.slice(0,220).replace(/\s+\S*$/,"")+"…":text)+'</p>':"")+
        '<div class="pack-actions fr-actions"><button class="primary" id="submit-evidence" '+(ready?"":"disabled")+'>Submit to Portfolio</button></div>'+
        '<p class="submit-hint">'+(ready?"Ready to submit. Photos, a write-up, or both: whatever shows the job.":"Add a photo or a write-up to submit.")+'</p></section>':"")+
      (window.eviaStrength?'<button type="button" class="st-how" id="st-how">How to build a strong portfolio ›</button>':"")+
      '</div>';

    const addFiles=async files=>{
      if(!files.length)return;
      try{
        for(const file of files.filter(f=>f&&f.size>0)){
          const blob=await makeThumb(file),id="photo-"+Date.now()+"-"+Math.random().toString(36).slice(2);
          await idbPut({id,blob,addedAt:new Date().toISOString()});
          pack.photos.push({id,addedAt:new Date().toISOString(),takenAt:file.eviaTakenAt||file.lastModified||Date.now()});
        }
        await savePack(pack);await renderPack(pack);
      }catch(err){console.error("Evia evidence photo save failed",err);alert("That photo could not be added. Please try again.")}
    };
    /* A recording: kept with the photos, listed in the pack with its length and what Evia wrote down. */
    const addMedia=async(blob,mime,info)=>{
      try{const id="media-"+Date.now()+"-"+Math.random().toString(36).slice(2);await idbPut({id,blob,addedAt:new Date().toISOString()});
        pack.media=(pack.media||[]).concat({id,kind:info.kind,mime:mime||blob.type,secs:info.secs||0,transcript:info.transcript||"",takenAt:Date.now()});await savePack(pack)}
      catch(err){console.error("Evia recording save failed",err);alert("That recording could not be saved. Please try again.")}
    };
    const ctx={unitName:u[0],prompts,ksbs:u[1],pack,addFiles,addMedia,save:()=>savePack(pack),done:()=>renderPack(pack),submit:async()=>{try{await submitPack(pack)}catch(err){console.error("Evia evidence submission failed",err);alert("Evia could not save this evidence to your portfolio. Please try again.");renderPack(pack)}}};
    const eg=$("#eg-start");if(eg)eg.onclick=()=>(pack.onlyKsbs&&(delete pack.onlyKsbs,savePack(pack)),window.eviaGuide.start(Object.assign({},ctx,{done:()=>{renderPack(pack);if(String(pack.write||"").trim())window.eviaGuide.free(ctx,"write")}})));
    const fr=$("#fr-start");if(fr)fr.onclick=()=>{if(pack.onlyKsbs){delete pack.onlyKsbs;savePack(pack)}window.eviaGuide.free(ctx)};
    const rs=$("#rec-start");if(rs)rs.onclick=()=>window.eviaGuide.record(ctx);
    /* Catch up on an empty pack makes a pack just for the missing KSBs; added to a pack in progress, the pack keeps the unit's. */
    const cu=$("#cu-start");if(cu)cu.onclick=()=>{const empty=!photos.length&&!text&&!media.length;if(empty)pack.onlyKsbs=missing.map(x=>x.code);savePack(pack);
      window.eviaGuide.catchUp(Object.assign({},ctx,{missing,done:()=>renderPack(pack)}))};
    document.querySelectorAll("[data-remove-media]").forEach(b=>b.onclick=async()=>{const i=+b.dataset.removeMedia,m=(pack.media||[])[i];if(!m||!confirm("Remove this recording?"))return;await idbDelete(m.id);pack.media.splice(i,1);await savePack(pack);renderPack(pack)});
    const how=$("#st-how");if(how)how.onclick=()=>window.eviaStrength.guide();
    let submitting=false;
    if($("#submit-evidence"))$("#submit-evidence").onclick=async()=>{
      if(submitting)return;
      submitting=true;
      const btn=$("#submit-evidence");
      if(btn){btn.disabled=true;btn.textContent="Saving to Portfolio…";}
      try{await submitPack(pack)}
      catch(err){
        console.error("Evia evidence submission failed",err);
        submitting=false;
        if(btn){btn.disabled=false;btn.textContent="Submit to Portfolio";}
        alert("Evia could not save this evidence to your portfolio. Please try again.");
      }
    };
    if(started)renderPhotos(pack);
    if(window.eviaSavedTiles)window.eviaSavedTiles(u[0],document.querySelector(".evidence-pack-page"));
    if(openAt){const at=openAt;openAt=null;window.eviaGuide.free(ctx,at)}
  }

  async function migrateSubmittedEvidence(){
    let changed=false;
    for(const e of evidence){
      if(!e||!Array.isArray(e.p)||!e.p.length||Array.isArray(e.photoIds))continue;
      const ids=[];
      for(const src of e.p){
        if(!src)continue;
        const id="submitted-"+Date.now()+"-"+Math.random().toString(36).slice(2);
        await idbPut({id,blob:await dataUrlToBlob(src),addedAt:e.savedAt||new Date().toISOString()});
        ids.push(id);
      }
      e.photoIds=ids;e.p=[];changed=true;
    }
    if(changed)persist();
    return evidence;
  }
  async function getEvidencePhotoData(e){
    if(!e)return[];
    if(Array.isArray(e.p)&&e.p.length)return e.p;
    if(!Array.isArray(e.photoIds))return[];
    const out=[];
    for(const id of e.photoIds){
      /* An unreadable photo is skipped rather than failing the whole evidence pack. */
      try{const rec=await idbGet(id);if(rec&&rec.blob)out.push(await blobToDataUrl(rec.blob))}
      catch(err){console.warn("Evia photo unreadable",id,err)}
    }
    return out;
  }
  window.eviaGetEvidencePhotoData=getEvidencePhotoData;
  /* One evidence photo by its id, as a Blob (used by data.js: eviaData.files.get). */
  window.eviaGetEvidencePhoto=id=>idbGet(id).then(r=>r&&r.blob?r.blob:null);
  /* A photo from Nisia (Evia on a new device), under the id its evidence already uses. */
  window.eviaDeleteEvidencePhoto=id=>idbDelete(id);
  window.eviaPutEvidencePhoto=(id,blob)=>idbPut({id,blob,addedAt:new Date().toISOString()}).then(()=>id);
  window.eviaStoreEvidencePhoto=blob=>{const id="submitted-"+Date.now()+"-"+Math.random().toString(36).slice(2);return idbPut({id,blob,addedAt:new Date().toISOString()}).then(()=>id)};
  const supportingPut=value=>openDB().then(db=>new Promise((resolve,reject)=>{const tx=db.transaction(SUPPORT_STORE,"readwrite");tx.objectStore(SUPPORT_STORE).put(value);tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error||new Error("Supporting evidence save failed"))}));
  const supportingGet=id=>openDB().then(db=>new Promise((resolve,reject)=>{const tx=db.transaction(SUPPORT_STORE,"readonly"),req=tx.objectStore(SUPPORT_STORE).get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error||new Error("Supporting evidence load failed"))}));
  window.eviaSupportingFilePut=supportingPut;
  window.eviaSupportingFileGet=supportingGet;

  async function submitPack(pack){
    if(!(pack.photos||[]).length&&!String(pack.write||"").trim()&&!(pack.media||[]).length)return false;
    const u=data().u[unit];
    const id=Date.now()+"-"+Math.random().toString(36).slice(2,8);
    const photoIds=[];
    for(const p of (pack.photos||[])){
      if(!p||!p.id)continue;
      const rec=await idbGet(p.id);
      if(!rec||!rec.blob)throw new Error("Evidence photo could not be loaded");
      const permanentId="submitted-"+Date.now()+"-"+Math.random().toString(36).slice(2);
      await idbPut({id:permanentId,blob:rec.blob,addedAt:rec.addedAt||new Date().toISOString()});
      photoIds.push(permanentId);
    }
    /* Recordings, kept the same way as photos, with what Evia wrote down while they were recorded. */
    const media=[];
    for(const m of (pack.media||[])){
      const rec=await idbGet(m.id);if(!rec||!rec.blob)throw new Error("Recording could not be loaded");
      const permanentId="submitted-media-"+Date.now()+"-"+Math.random().toString(36).slice(2);
      await idbPut({id:permanentId,blob:rec.blob,addedAt:rec.addedAt||new Date().toISOString()});
      media.push({id:permanentId,kind:m.kind,mime:m.mime||rec.blob.type,secs:m.secs||0,transcript:m.transcript||""});
    }
    /* The unit's KSBs, plus any the learner is aiming for that they ticked as shown by this job. */
    window.eviaData.put("evidence",{id,course,unit:u[0],text:pack.write,ksbs:[...new Set((pack.onlyKsbs&&pack.onlyKsbs.length?pack.onlyKsbs:u[1].map(code)).concat(pack.extraKsbs||[]))],photoIds,media,
      photoTakenAt:(pack.photos||[]).filter(p=>p&&p.id).map(p=>p.takenAt||null),
      /* Areas answered with guided Evia count in full towards the unit's strength (strength.js). */
      guidedAreas:window.eviaStrength?window.eviaStrength.guidedAreas(pack):[]});
    await removePack();
    /* Back to the same unit: the new pack shows as the first saved tile. */
    window.openUnit(unit);
    if(typeof showEvidenceToast==="function")setTimeout(()=>showEvidenceToast("Evidence saved"),300);
    return true;
  }

  migrateSubmittedEvidence().catch(err=>console.error("Evia evidence migration failed",err));

  /* step opens free range at "photos" or "write" (Evia's coach uses it); otherwise the unit opens on the choice. */
  window.openUnit=function(i,step){
    openAt=step==="photos"||step==="write"?step:null;
    const profileBtn=document.getElementById("profile-btn");
    if(profileBtn)profileBtn.style.display="none";
    screen="unit";unit=i;getPack().then(p=>migrateLegacyPack(p)).then(renderPack).catch(err=>{console.error(err);alert("Evia could not open this evidence pack.")});
  };

  window.addEventListener("load",()=>{
    const style=document.createElement("style");
    style.textContent=`
      .topbar{display:none}
      .profile-btn{position:fixed;z-index:9999;top:12px;right:12px;width:43px;height:43px;display:flex;align-items:center;justify-content:center}
            .evidence-pack-page{padding:18px 16px 28px}
      .evidence-heading{padding:0 2px}
      .evidence-label{font-size:11px;font-weight:700;letter-spacing:.1em;color:#98a2b3}
      .evidence-heading h2{margin:6px 0 7px;font-size:26px;line-height:1.16;letter-spacing:-.025em}
      .evidence-heading p{max-width:560px;margin:0;font-size:13px;line-height:1.55;color:#667085}
      .evidence-photo-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}
      .evidence-photo-button{aspect-ratio:1/1;min-height:0;height:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;padding:10px;border:1px solid #e3e7ed;border-radius:20px;background:#fff;font-size:13px;font-weight:700;color:#273244;cursor:pointer;transition:transform .15s ease,background .15s ease,border-color .15s ease}
      .evidence-photo-button:active{transform:scale(.96);background:#f8fafb}
      .evidence-photo-button input{display:none}
      .evidence-photo-icon{width:44px;height:44px;border-radius:50%;background:var(--soft,#fff7d6);display:flex;align-items:center;justify-content:center;color:var(--yellow-ink,#6e5c00);flex:0 0 auto}
      .evidence-photo-icon svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;display:block}
      .evidence-section-divider{height:1px;background:linear-gradient(90deg,transparent,var(--line,#edf0f4) 12%,var(--line,#edf0f4) 88%,transparent);margin:22px 2px}
      .evidence-thumbs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}
      .evidence-thumbs:empty{display:none}
      .photo-item{position:relative;min-width:0}
      .thumb{display:block;width:100%;height:auto;aspect-ratio:1;object-fit:cover;border-radius:12px;background:#f3f5f7;border:1px solid #edf0f4}
      .photo-remove{position:absolute;right:6px;top:6px;width:24px;height:24px;border:0;border-radius:50%;background:rgba(23,32,51,.78);color:#fff;font-size:15px;line-height:22px;padding:0}
      .evidence-section{margin-top:22px;padding-top:1px}
      .evidence-section-title{margin-bottom:8px;font-size:11px;font-weight:750;letter-spacing:.075em;color:#344054}
      .compact-prompts{font-size:13px;line-height:1.65;color:#667085}
      .writeup-section{margin-top:28px}
      .evidence-subtitle{margin-top:18px}
      #write{display:block;width:100%;min-height:150px;box-sizing:border-box;margin-top:10px;padding:14px 15px;border:1px solid #dfe4ea;border-radius:15px;background:#fff;color:#172033;font-size:14px;line-height:1.55;resize:vertical;outline:none;transition:border-color .15s ease,box-shadow .15s ease}
      #write:focus{border-color:#b9c1cc;box-shadow:0 0 0 3px rgba(27,36,53,.06)}
      #write::placeholder{color:#a0a9b7}
      .pack-actions{display:grid;grid-template-columns:1fr 1.35fr;gap:10px;margin-top:18px}
      .pack-actions button{min-height:50px;padding:12px 14px;border-radius:15px;font-size:13px}
      .pack-actions .secondary{background:#f4f6f8}
      .pack-actions .primary{background:#1b2435}
      .pack-actions.fr-actions{grid-template-columns:1fr}
      .fr-progress{margin-top:6px}
      .fr-progress-sum{margin:10px 2px 0;font-size:12.5px;font-weight:650;color:#475467}
      .fr-progress-text{margin:6px 2px 0;font-size:13px;line-height:1.55;color:#667085;white-space:pre-line}
      /* Free range write-up: with all the things to mention above it, the box keeps its height and the sheet scrolls,
         so the writing check opens below it rather than under it. */
      html body .eg-full .pr-body:has(.fr-mention)>.wc-field{flex:0 0 auto}
      html body .eg-full .pr-body:has(.fr-mention) .eg-text{flex:none;min-height:170px}
      /* Free range: a prohibited sign (🚫) over Evia at half size. */
      .fr-no{position:relative;flex:0 0 auto;width:34px;height:34px;border-radius:50%;border:2.5px solid #d92d20;background:#fff;display:grid;place-items:center;box-sizing:border-box}
      .fr-no .evia-mini{position:absolute;left:50%;top:50%;margin:0;transform:translate(-50%,-50%) scale(.5)}
      .fr-strike{position:absolute;z-index:2;left:50%;top:50%;width:100%;height:2.5px;border-radius:2px;background:#d92d20;transform:translate(-50%,-50%) rotate(45deg);pointer-events:none}
      html body .eg-full .fr-no{width:30px;height:30px}
      /* The two ways to make a pack, always the same size. */
      .ev-modes{display:grid;grid-auto-rows:1fr;gap:12px;margin:4px 0 14px}
      .ev-modes .eg-start{margin:0;height:100%}
      /* One full-width button, e.g. "Get started". */
      html body .eg-wide{display:flex}
      html body .eg-wide>button{flex:1 1 100%;width:100%}
      .submit-hint{text-align:center;font-size:11.5px;line-height:1.45;color:#98a2b3;margin:9px 6px 0}
      .prompt-list,.writeup-prompts,.photo-guide,.capture-intro{display:none}
      button:disabled{opacity:.45;cursor:not-allowed}
      @media(min-width:600px){.evidence-pack-page{padding-left:4px;padding-right:4px}}
      @media(max-width:520px){.evidence-pack-page{padding-top:14px}.evidence-heading h2{font-size:24px}.evidence-photo-actions{margin-top:18px}.pack-actions{grid-template-columns:1fr 1.25fr}}
`;
    document.head.appendChild(style);
  });
})();