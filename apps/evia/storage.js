/* Evia7 storage: keeps learner data in IndexedDB (no 5 MB localStorage cap), trims oversized data,
   asks the browser to keep it, and provides portfolio backup/restore. Loads the app scripts once data is ready. */
(function(){
  const DB_NAME="evia7-app-data",STORE="kv";
  /* Small settings needed before first paint, and the problem log (errors.js), stay in localStorage; every other evia7-* key lives in IndexedDB. */
  const KEEP=new Set(["evia7-theme","evia7-theme-picked","evia7-shape","evia7-shape-picked","evia7-accessibility","evia7-errors"]);
  const BLOB_DBS=["evia7-evidence-db","evia7-supporting-files"];
  const LAST_BACKUP_KEY="evia7-last-backup";
  const moved=k=>typeof k==="string"&&k.startsWith("evia7-")&&!KEEP.has(k);
  const proto=Storage.prototype,orig={getItem:proto.getItem,setItem:proto.setItem,removeItem:proto.removeItem,key:proto.key};
  const cache=new Map();
  let db=null;

  const req2p=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  const txDone=tx=>new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error("Storage write failed"));tx.onabort=()=>reject(tx.error||new Error("Storage write aborted"))});
  function openAppDB(){
    return new Promise((resolve,reject)=>{
      if(!("indexedDB" in window))return reject(new Error("IndexedDB unavailable"));
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error("IndexedDB unavailable"));
      req.onblocked=()=>reject(new Error("IndexedDB blocked"));
    });
  }
  let errorShown=0;
  function reportWriteError(err){
    console.error("Evia storage write failed",err);
    if(Date.now()-errorShown<5000)return;errorShown=Date.now();
    const msg="Evia couldn't save — your phone may be low on storage";
    if(typeof showEvidenceToast==="function")showEvidenceToast(msg,true);else alert(msg);
  }
  /* Writes happen in the background; flush() waits for them all, e.g. before a reload after restoring a backup. */
  const pendingWrites=new Set();
  let wiping=false; /* removeAll(): nothing more is saved */
  function write(key,value){
    if(wiping||!db)return;
    const tx=db.transaction(STORE,"readwrite"),store=tx.objectStore(STORE);
    if(value===null)store.delete(key);else store.put(value,key);
    const done=txDone(tx).catch(reportWriteError);
    pendingWrites.add(done);done.finally(()=>pendingWrites.delete(done));
  }
  const flush=()=>Promise.all([...pendingWrites]);
  function patchLocalStorage(){
    proto.getItem=function(k){if(this===window.localStorage&&moved(k))return cache.has(k)?cache.get(k):null;return orig.getItem.call(this,k)};
    proto.setItem=function(k,v){if(this===window.localStorage&&moved(k)){v=String(v);cache.set(k,v);write(k,v);return}return orig.setItem.call(this,k,v)};
    proto.removeItem=function(k){if(this===window.localStorage&&moved(k)){cache.delete(k);write(k,null);return}return orig.removeItem.call(this,k)};
  }
  async function loadAppData(){
    db=await openAppDB();
    const tx=db.transaction(STORE,"readonly"),store=tx.objectStore(STORE);
    const [keys,values]=await Promise.all([req2p(store.getAllKeys()),req2p(store.getAll())]);
    keys.forEach((k,i)=>cache.set(k,values[i]));
    /* One-off move of existing learners' data out of localStorage. */
    const legacy=[];
    for(let i=0;i<localStorage.length;i++){const k=orig.key.call(localStorage,i);if(moved(k))legacy.push(k)}
    if(legacy.length){
      const wtx=db.transaction(STORE,"readwrite"),ws=wtx.objectStore(STORE);
      legacy.forEach(k=>{if(!cache.has(k)){const v=orig.getItem.call(localStorage,k);cache.set(k,v);ws.put(v,k)}});
      await txDone(wtx);
      legacy.forEach(k=>orig.removeItem.call(localStorage,k));
    }
    patchLocalStorage();
  }

  /* ---------- 1. Trim oversized data ---------- */
  const readJson=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||"null");return v??f}catch(_){return f}};
  function shrinkImage(src,max,quality){
    return new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>{
        const scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
        const c=document.createElement("canvas");c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));
        c.getContext("2d",{alpha:false}).drawImage(img,0,0,c.width,c.height);
        try{resolve(c.toDataURL("image/jpeg",quality))}catch(_){resolve(null)}
      };
      img.onerror=()=>resolve(null);
      img.src=src;
    });
  }
  function appDataKeys(){
    if(db)return [...cache.keys()];
    const keys=[];for(let i=0;i<localStorage.length;i++){const k=orig.key.call(localStorage,i);if(moved(k))keys.push(k)}return keys;
  }
  /* Profile pictures are shown as a small thumbnail, so keep them around 20–40 KB. */
  window.eviaShrinkAvatar=src=>shrinkImage(src,320,.82).then(out=>out||src);
  async function trimData(){
    const evidence=readJson("evia7-evidence",null);
    if(Array.isArray(evidence)){
      let changed=false;
      evidence.forEach(e=>{
        const lp=e&&e.learnerProfile;
        if(lp&&typeof lp==="object"&&(lp.avatar||lp.signature||Object.keys(lp).some(k=>!["name","start","end"].includes(k)))){
          e.learnerProfile={name:lp.name||"",start:lp.start||"",end:lp.end||""};changed=true;
        }
      });
      if(changed)localStorage.setItem("evia7-evidence",JSON.stringify(evidence));
    }
    const profile=readJson("evia7-profile",null);
    if(profile&&typeof profile.avatar==="string"&&profile.avatar.length>80000){
      const small=await shrinkImage(profile.avatar,320,.82);
      if(small&&small.length<profile.avatar.length){profile.avatar=small;localStorage.setItem("evia7-profile",JSON.stringify(profile))}
    }
  }

  /* ---------- 3. Ask the browser to keep Evia's data ---------- */
  async function persisted(){try{return !!(navigator.storage&&navigator.storage.persisted&&await navigator.storage.persisted())}catch(_){return false}}
  async function requestPersist(){try{if(!navigator.storage||!navigator.storage.persist)return false;if(await persisted())return true;return !!(await navigator.storage.persist())}catch(_){return false}}

  /* ---------- 4. Usage, backup and restore ---------- */
  async function estimate(){try{return navigator.storage&&navigator.storage.estimate?await navigator.storage.estimate():null}catch(_){return null}}
  const isIOS=()=>/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const isStandalone=()=>window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
  function formatBytes(n){if(!Number.isFinite(n))return"";if(n<1024*1024)return Math.max(1,Math.round(n/1024))+" KB";if(n<1024*1024*1024)return(n/1024/1024).toFixed(1)+" MB";return(n/1024/1024/1024).toFixed(1)+" GB"}

  /* Opens an existing database without creating it. Resolves null if it does not exist. */
  function openExisting(name){
    return new Promise(resolve=>{
      let created=false;
      const req=indexedDB.open(name);
      req.onupgradeneeded=()=>{created=true;req.transaction.abort()};
      req.onsuccess=()=>resolve(created?(req.result.close(),null):req.result);
      req.onerror=()=>resolve(null);
      req.onblocked=()=>resolve(null);
    });
  }
  function dehydrate(value,blobs){
    if(value instanceof Blob){const path="blobs/"+String(blobs.length).padStart(6,"0");blobs.push({path,blob:value});return{__eviaBlob:path,type:value.type}}
    if(Array.isArray(value))return value.map(v=>dehydrate(v,blobs));
    if(value&&typeof value==="object"&&Object.getPrototypeOf(value)===Object.prototype){const out={};for(const k in value)out[k]=dehydrate(value[k],blobs);return out}
    return value;
  }
  function rehydrate(value,files){
    if(value&&typeof value==="object"&&typeof value.__eviaBlob==="string"){const f=files.get(value.__eviaBlob);return f?new Blob([f],{type:value.type||""}):null}
    if(Array.isArray(value))return value.map(v=>rehydrate(v,files));
    if(value&&typeof value==="object"){const out={};for(const k in value)out[k]=rehydrate(value[k],files);return out}
    return value;
  }

  const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0}return t})();
  const crc32=bytes=>{let c=0xffffffff;for(let i=0;i<bytes.length;i++)c=crcTable[(c^bytes[i])&255]^(c>>>8);return(c^0xffffffff)>>>0};
  /* Uncompressed ZIP built from Blob parts, so only one file is held in memory at a time. */
  async function buildZip(files){
    const enc=new TextEncoder(),parts=[],central=[];let offset=0;
    const header=(sig,fields)=>{const b=new DataView(new ArrayBuffer(fields.reduce((n,f)=>n+f[1],4)));b.setUint32(0,sig,true);let p=4;fields.forEach(([v,size])=>{if(size===2)b.setUint16(p,v,true);else b.setUint32(p,v,true);p+=size});return new Uint8Array(b.buffer)};
    const d=new Date(),time=(d.getHours()<<11)|(d.getMinutes()<<5)|Math.floor(d.getSeconds()/2),date=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
    for(const f of files){
      const name=enc.encode(f.path),blob=f.blob instanceof Blob?f.blob:new Blob([f.blob]);
      const crc=crc32(new Uint8Array(await blob.arrayBuffer())),size=blob.size;
      parts.push(header(0x04034b50,[[20,2],[0x800,2],[0,2],[time,2],[date,2],[crc,4],[size,4],[size,4],[name.length,2],[0,2]]),name,blob);
      central.push({name,crc,size,offset});
      offset+=30+name.length+size;
    }
    let cdSize=0;
    central.forEach(f=>{const h=header(0x02014b50,[[20,2],[20,2],[0x800,2],[0,2],[time,2],[date,2],[f.crc,4],[f.size,4],[f.size,4],[f.name.length,2],[0,2],[0,2],[0,2],[0,2],[0,4],[f.offset,4]]);parts.push(h,f.name);cdSize+=h.length+f.name.length});
    parts.push(header(0x06054b50,[[0,2],[0,2],[central.length,2],[central.length,2],[cdSize,4],[offset,4],[0,2]]));
    return new Blob(parts,{type:"application/zip"});
  }
  /* Reads the uncompressed ZIPs written by buildZip. */
  async function readZip(file){
    const view=async(start,end)=>new DataView(await file.slice(start,end).arrayBuffer());
    const tailStart=Math.max(0,file.size-65557),tail=await view(tailStart,file.size);
    let eocd=-1;for(let i=tail.byteLength-22;i>=0;i--)if(tail.getUint32(i,true)===0x06054b50){eocd=i;break}
    if(eocd<0)throw new Error("Not a backup file");
    const count=tail.getUint16(eocd+10,true),cdSize=tail.getUint32(eocd+12,true),cdOffset=tail.getUint32(eocd+16,true);
    const cd=await view(cdOffset,cdOffset+cdSize),dec=new TextDecoder(),out=new Map();
    let p=0;
    for(let i=0;i<count;i++){
      if(cd.getUint32(p,true)!==0x02014b50)throw new Error("Backup file is damaged");
      const method=cd.getUint16(p+10,true),size=cd.getUint32(p+20,true),nameLen=cd.getUint16(p+28,true),extraLen=cd.getUint16(p+30,true),commentLen=cd.getUint16(p+32,true),local=cd.getUint32(p+42,true);
      const name=dec.decode(new Uint8Array(cd.buffer,cd.byteOffset+p+46,nameLen));
      if(method!==0)throw new Error("Unsupported backup file");
      const lh=await view(local,local+30),start=local+30+lh.getUint16(26,true)+lh.getUint16(28,true);
      out.set(name,file.slice(start,start+size));
      p+=46+nameLen+extraLen+commentLen;
    }
    return out;
  }

  async function backup(){
    const blobs=[],data={},settings={};
    appDataKeys().forEach(k=>{if(k!==LAST_BACKUP_KEY)data[k]=localStorage.getItem(k)});
    KEEP.forEach(k=>{const v=orig.getItem.call(localStorage,k);if(v!==null)settings[k]=v});
    const databases=[];
    for(const name of BLOB_DBS){
      const idb=await openExisting(name);if(!idb)continue;
      const stores=[];
      for(const storeName of [...idb.objectStoreNames]){
        const store=idb.transaction(storeName,"readonly").objectStore(storeName);
        const records=await req2p(store.getAll());
        stores.push({name:storeName,keyPath:store.keyPath,autoIncrement:store.autoIncrement,records:dehydrate(records,blobs)});
      }
      databases.push({name,version:idb.version,stores});
      idb.close();
    }
    const createdAt=new Date().toISOString();
    const manifest={app:"evia7",format:1,createdAt,data,settings,databases};
    const zip=await buildZip([{path:"evia-backup.json",blob:new Blob([JSON.stringify(manifest)],{type:"application/json"})},...blobs]);
    const learner=(readJson("evia7-profile",{}).name||"learner").trim().replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()||"learner";
    const a=document.createElement("a");
    a.href=URL.createObjectURL(zip);a.download="evia-backup-"+learner+"-"+createdAt.slice(0,10)+".zip";
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),60000);
    localStorage.setItem(LAST_BACKUP_KEY,createdAt);
    return {size:zip.size,createdAt};
  }

  async function restore(file){
    const files=await readZip(file),manifestFile=files.get("evia-backup.json");
    if(!manifestFile)throw new Error("Not an Evia backup");
    const manifest=JSON.parse(await manifestFile.text());
    if(!manifest||manifest.app!=="evia7")throw new Error("Not an Evia backup");
    const bytes=files;
    for(const dbInfo of manifest.databases||[]){
      const existing=await openExisting(dbInfo.name);
      let target=existing;
      const missing=(dbInfo.stores||[]).filter(s=>!existing||!existing.objectStoreNames.contains(s.name));
      if(missing.length){
        const version=existing?existing.version+1:(dbInfo.version||1);if(existing)existing.close();
        target=await new Promise((resolve,reject)=>{
          const req=indexedDB.open(dbInfo.name,version);
          req.onupgradeneeded=()=>missing.forEach(s=>req.result.createObjectStore(s.name,{keyPath:s.keyPath||undefined,autoIncrement:!!s.autoIncrement}));
          req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error("Close other Evia tabs and try again"));
        });
      }
      for(const s of dbInfo.stores||[]){
        const clearTx=target.transaction(s.name,"readwrite");clearTx.objectStore(s.name).clear();await txDone(clearTx);
        /* Photos are copied into Evia's own storage (not left pointing at the backup file, which some phones stop
           letting the app read after a reload). Done in small batches to keep memory low. */
        const records=s.records||[];
        for(let i=0;i<records.length;i+=20){
          const batch=records.slice(i,i+20);
          const needed=new Set();JSON.stringify(batch,(k,v)=>{if(k==="__eviaBlob")needed.add(v);return v});
          const copies=new Map();
          for(const path of needed){const f=bytes.get(path);if(f)copies.set(path,new Blob([await f.arrayBuffer()]))}
          const tx=target.transaction(s.name,"readwrite"),store=tx.objectStore(s.name);
          rehydrate(batch,copies).forEach(r=>store.put(r));
          await txDone(tx);
        }
      }
      target.close();
    }
    appDataKeys().forEach(k=>localStorage.removeItem(k));
    Object.keys(manifest.data||{}).forEach(k=>{if(moved(k))localStorage.setItem(k,manifest.data[k])});
    Object.keys(manifest.settings||{}).forEach(k=>{if(KEEP.has(k))orig.setItem.call(localStorage,k,manifest.settings[k])});
    localStorage.setItem(LAST_BACKUP_KEY,manifest.createdAt||new Date().toISOString());
    await flush(); /* everything must be on disk before Evia reloads */
    return manifest;
  }

  /* Fills the "Your data" block in the profile sheet. */
  async function bindProfileCard(root){
    const usage=root.querySelector("#evia-storage-usage"),status=root.querySelector("#evia-storage-status"),last=root.querySelector("#evia-storage-last");
    const backupBtn=root.querySelector("#evia-backup"),restoreInput=root.querySelector("#evia-restore");
    const refresh=async()=>{
      const est=await estimate(),kept=await persisted();
      if(usage)usage.textContent=est&&Number.isFinite(est.usage)?"Evia is using "+formatBytes(est.usage)+" on this device"+(est.quota?" (up to "+formatBytes(est.quota)+" available).":"."):"Storage details are not available in this browser.";
      if(status){
        let text=kept?"Protected: your browser won't clear Evia's data to free up space.":"Your browser may clear Evia's data if the device runs low on space. Back up regularly.";
        if(isIOS()&&!isStandalone())text+=" On iPhone, add Evia to your Home Screen (Share › Add to Home Screen) so Safari doesn't delete your data after 7 days without use.";
        status.textContent=text;
      }
      const lastAt=localStorage.getItem(LAST_BACKUP_KEY);
      if(last)last.textContent=lastAt?"Last backup: "+new Date(lastAt).toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"You haven't backed up yet.";
    };
    refresh();
    if(backupBtn)backupBtn.onclick=async()=>{
      backupBtn.disabled=true;const label=backupBtn.textContent;backupBtn.textContent="Preparing backup…";
      try{await backup();refresh()}catch(e){console.error("Evia backup failed",e);alert("Evia couldn't create the backup. Please try again.")}
      finally{backupBtn.disabled=false;backupBtn.textContent=label}
    };
    if(restoreInput)restoreInput.onchange=async()=>{
      const file=restoreInput.files&&restoreInput.files[0];restoreInput.value="";
      if(!file)return;
      if(!confirm("Restoring replaces everything Evia has saved on this device with the backup. Continue?"))return;
      try{await restore(file);alert("Your backup has been restored. Evia will now reload.");location.reload()}
      catch(e){console.error("Evia restore failed",e);alert(/Evia backup|backup file|Unsupported/.test(e.message)?e.message+".":"Evia couldn't restore that backup. Please check the file and try again.")}
    };
  }

  /* ---------- 5. Remove everything from this device ----------
     Evia's own data only (every evia7-* key, its databases and the Nisia sign-in): the other Nisia apps share this
     website, so their data is left alone, and the app itself stays installed and works offline. Nothing on Nisia is
     touched, so connecting again with a code from the college brings the learner's records back. */
  async function removeAll(){
    wiping=true;
    await flush().catch(()=>{});
    const own=s=>{const out=[];for(let i=0;i<s.length;i++){const k=orig.key.call(s,i);if(k&&k.startsWith("evia7-"))out.push(k)}return out};
    own(localStorage).forEach(k=>orig.removeItem.call(localStorage,k));
    try{own(sessionStorage).forEach(k=>sessionStorage.removeItem(k))}catch(_){}
    cache.clear();
    try{if(db)db.close()}catch(_){}
    db=null;
    await Promise.all([DB_NAME].concat(BLOB_DBS).map(name=>new Promise(res=>{try{const r=indexedDB.deleteDatabase(name);r.onsuccess=r.onerror=r.onblocked=()=>res()}catch(_){res()}})));
  }
  window.eviaStorage={flush,backup,restore,estimate,persisted,requestPersist,bindProfileCard,formatBytes,keys:appDataKeys,removeAll};

  /* ---------- Boot: load data, then the app scripts in order ---------- */
  function loadScripts(me){
    /* "@course-pack" is where the learner's own course pack goes (packs.js): only that trade's content is loaded.
       "@course-pack-early" is for the pack files that must run before app.js (the NVQ's criteria and screens). */
    const saved=(()=>{try{return localStorage.getItem("evia7-course")||"bricklayer"}catch(_){return "bricklayer"}})();
    const list=(me&&me.dataset.appScripts||"").split(/\s+/).filter(Boolean)
      .flatMap(src=>src==="@course-pack"||src==="@course-pack-early"?(window.eviaPacks?window.eviaPacks.files(saved,src==="@course-pack"?"late":"early"):[]):[src]);
    const reveal=()=>document.documentElement.classList.remove("evia-booting");
    if(!list.length){reveal();return}
    list.forEach((src,i)=>{
      const s=document.createElement("script");s.src=src;s.async=false;
      if(i===list.length-1)s.onload=s.onerror=()=>{
        reveal();
        /* Scripts that wait for window "load" missed it if it fired while data was loading. */
        if(document.readyState==="complete")window.dispatchEvent(new Event("load"));
        requestPersist();
      };
      document.head.appendChild(s);
    });
  }
  const scriptEl=document.currentScript;
  setTimeout(()=>document.documentElement.classList.remove("evia-booting"),5000);
  loadAppData()
    .catch(err=>console.warn("Evia is using browser localStorage because IndexedDB is unavailable",err))
    .then(()=>trimData().catch(err=>console.error("Evia storage tidy-up failed",err)))
    .then(()=>loadScripts(scriptEl||document.querySelector("script[data-app-scripts]")));
})();
