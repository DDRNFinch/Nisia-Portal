/* Evia7 evidence drop (trying it out in the tester): a topic as a folder. The learner drops photos into it whenever
   they're on that kind of work, any day, and says what each one shows, then or later. Every photo is saved as its own
   piece of evidence the moment it's taken, mapped to the topic's KSBs, and its line becomes that evidence's write-up.
   The ideas for photos are shown as ideas, not a checklist. Which evidence came from a drop is kept on this phone.
   window.eviaDrops: open({unitName, ksbs, prompts, done}), count(unitName) */
(function(){
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const KEY="evia7-drops";
  const ids=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v:[]}catch(_){return []}};
  const remember=id=>{const l=ids();l.push(String(id));try{localStorage.setItem(KEY,JSON.stringify(l))}catch(_){}};
  const list=name=>{const s=new Set(ids());return (typeof evidence!=="undefined"?evidence:[]).filter(e=>e.c===course&&e.u===name&&s.has(String(e.id))).sort((a,b)=>String(b.savedAt).localeCompare(String(a.savedAt)))};
  const split=s=>String(s||"").split("·").map(t=>t.trim()).filter(Boolean);
  const cap=t=>t.charAt(0).toUpperCase()+t.slice(1);
  let cur=null;

  function style(){
    if(document.getElementById("dr-style"))return;
    const s=document.createElement("style");s.id="dr-style";
    s.textContent=`.dr-ideas{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 14px}.dr-ideas span{padding:6px 10px;border-radius:999px;background:#f2f4f7;font-size:13px;font-weight:600;color:#344054}
.dr-add{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:54px;border:0;border-radius:16px;background:var(--ui-ink,#172033);color:#fff;font:inherit;font-weight:800;font-size:16px;cursor:pointer}
.dr-add svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.dr-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}
.dr-item{position:relative;border:0;padding:0;border-radius:14px;overflow:hidden;aspect-ratio:1;background:#eef0f3;cursor:pointer}
.dr-item img{width:100%;height:100%;object-fit:cover;display:block}
.dr-item b{position:absolute;left:6px;right:6px;bottom:6px;padding:4px 6px;border-radius:8px;font-size:11px;font-weight:700;line-height:1.25;background:rgba(255,255,255,.92);color:#172033;text-align:left;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.dr-item b.dr-need{background:var(--yellow,#e7b900);color:#172033}
.dr-empty{margin:14px 0 0;color:var(--ui-muted,#667085);font-size:14px;text-align:center}
.dr-photo{width:100%;border-radius:16px;overflow:hidden;margin-bottom:10px;max-height:40vh}.dr-photo img{width:100%;max-height:40vh;object-fit:cover;display:block}
.dr-text{width:100%;box-sizing:border-box;border:1px solid #d0d5dd;border-radius:14px;padding:12px;font:inherit;font-size:16px;min-height:90px;resize:vertical}
.dr-btns{display:flex;gap:8px;margin-top:12px}.dr-btns button{flex:1;min-height:48px;border-radius:14px;font-weight:800}`;
    document.head.appendChild(s);
  }
  function sheet(html){
    const root=document.getElementById("modal-root");
    root.innerHTML='<div class="overlay pv-overlay"><section class="sheet pr-sheet pv-sheet" role="dialog" aria-modal="true" aria-labelledby="dr-title"><div class="sheet-head"><div><div class="chat-kicker">EVIDENCE DROP</div><h2 id="dr-title">'+esc(cur.unitName)+'</h2></div><button class="close" id="dr-close" type="button" aria-label="Close">×</button></div><div class="pr-body">'+html+'</div></section></div>';
    root.querySelector("#dr-close").onclick=close;
    root.querySelector(".overlay").onclick=e=>{if(e.target.classList.contains("overlay"))close()};
    return root.querySelector(".pr-body");
  }
  function close(){const r=document.getElementById("modal-root");if(r)r.innerHTML="";if(cur&&cur.done)cur.done()}
  const src=async e=>{const id=(e.photoIds||[])[0];if(!id||!window.eviaGetEvidencePhoto)return "";const b=await window.eviaGetEvidencePhoto(id);return b?URL.createObjectURL(b):""};

  /* The folder: ideas, one button, every photo dropped so far. */
  async function folder(){
    style();
    const items=list(cur.unitName),ideas=split(cur.prompts&&cur.prompts.photos);
    const body=sheet('<p class="eg-say" style="margin:0 0 8px">Drop photos in whenever you’re on this kind of job, any day. Say what each one shows, now or later.</p>'+
      (ideas.length?'<div class="eg-small" style="margin:0">Ideas for photos</div><div class="dr-ideas">'+ideas.map(t=>'<span>'+esc(cap(t))+'</span>').join("")+'</div>':"")+
      '<button type="button" class="dr-add" id="dr-add"><svg viewBox="0 0 24 24"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5Z"/><circle cx="12" cy="13" r="3.5"/></svg>Add photos</button>'+
      (items.length?'<div class="dr-grid" id="dr-grid">'+items.map(e=>'<button type="button" class="dr-item" data-id="'+esc(e.id)+'"><img alt=""><b class="'+(String(e.w||"").trim()?"":"dr-need")+'">'+(String(e.w||"").trim()?esc(e.w):"Add a line")+'</b></button>').join("")+'</div>'
        :'<p class="dr-empty">Nothing dropped yet.</p>'));
    body.querySelector("#dr-add").onclick=add;
    body.querySelectorAll("[data-id]").forEach(async b=>{const e=items.find(x=>String(x.id)===b.dataset.id);b.onclick=()=>describe(e);const s=await src(e);if(s)b.querySelector("img").src=s});
  }
  /* Add photos: the camera with the ideas listed, or the gallery. Each one is saved as evidence straight away. */
  function add(){
    const save=async files=>{for(const f of files.filter(x=>x&&x.size>0)){
        const blob=window.eviaMakeThumb?await window.eviaMakeThumb(f):f,pid=await window.eviaStoreEvidencePhoto(blob);
        const id=window.eviaData.put("evidence",{course,unit:cur.unitName,text:"",ksbs:cur.ksbs,photoIds:[pid],photoTakenAt:[f.eviaTakenAt||f.lastModified||Date.now()]});
        remember(id)}
      if(typeof showEvidenceToast==="function"&&files.length)showEvidenceToast(files.length+" photo"+(files.length===1?"":"s")+" dropped into "+cur.unitName);
      folder()};
    if(window.eviaCamera&&window.eviaCamera.supported()){document.getElementById("modal-root").innerHTML="";
      window.eviaCamera.open({title:cur.unitName,prompts:split(cur.prompts&&cur.prompts.photos),onDone:files=>save(files||[])});return}
    const i=document.createElement("input");i.type="file";i.accept="image/*";i.multiple=true;i.onchange=()=>save([...i.files]);i.click();
  }
  /* One photo: what it shows, in a line or two (the mic works here too). */
  async function describe(e){
    const words=split(cur.prompts&&cur.prompts.writeup).slice(0,8);
    const body=sheet('<div class="dr-photo"><img id="dr-img" alt="Your photo"></div>'+
      '<p class="eg-say eg-q" style="margin:0 0 6px">What does this photo show?</p>'+
      '<textarea class="dr-text" id="dr-text" placeholder="Here I’m…" aria-label="What this photo shows">'+esc(e.w||"")+'</textarea>'+
      (words.length?'<div class="eg-small" style="margin:10px 0 0">Ideas to mention, if they fit</div><div class="dr-ideas">'+words.map(t=>'<span>'+esc(cap(t))+'</span>').join("")+'</div>':"")+
      '<div class="dr-btns"><button type="button" class="secondary" id="dr-back">Back</button><button type="button" class="primary" id="dr-save">Save</button></div>');
    const s=await src(e);if(s)body.querySelector("#dr-img").src=s;
    body.querySelector("#dr-back").onclick=folder;
    body.querySelector("#dr-save").onclick=()=>{window.eviaData.put("evidence",{id:e.id,text:body.querySelector("#dr-text").value.trim()});folder()};
  }
  window.eviaDrops={open(o){cur=o;folder()},count:name=>list(name).length};
})();
