/* Evia Basic (tester): the simplest way to collect evidence.
     Topics     the 10 brickwork topics, 2 wide. A tick when it's in the portfolio, orange when photos are waiting.
     Topic      what to capture, then Take photos: a square camera that stays open for photo after photo, then Save.
     Write up   each photo with a box: what does it show? Save makes a PDF (photo on the left, words on the right)
                and puts it in the Portfolio.
     Portfolio  the PDFs, newest first. Tap one to open or share it.
   Evia sits in the top right of every page. Tap her and she says (and shows) what to do on that page.
   Everything stays on the phone: photos and PDFs in IndexedDB, the rest in localStorage. */
(function(){
  const T=window.EB_TOPICS,COURSE=window.EB_COURSE;
  const app=document.getElementById("app");
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const ICON={
    back:'<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    cam:'<svg viewBox="0 0 24 24"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5Z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    pen:'<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/></svg>',
    tick:'<svg viewBox="0 0 24 24"><path d="m6 12.5 4 4 8-9"/></svg>',
    dots:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.5"/></svg>',
    x:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    gal:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M4 16.5l5-5 4 4 3-3 4 4"/></svg>',
    save:'<svg viewBox="0 0 24 24"><path d="m6 12.5 4 4 8-9"/></svg>'
  };
  const EVIA='<button type="button" class="evia" id="evia" aria-label="Help from Evia"><span class="face"><i></i><i></i></span></button>';

  /* ---------- Storage ---------- */
  const KEY="eviab";
  const S=(()=>{try{return Object.assign({name:"",drafts:{},pf:[]},JSON.parse(localStorage.getItem(KEY)||"{}"))}catch(_){return {name:"",drafts:{},pf:[]}}})();
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(_){}};
  const draft=i=>S.drafts[i]||(S.drafts[i]={photos:[],notes:{}});
  let dbP=null;
  const db=()=>dbP||(dbP=new Promise((res,rej)=>{const r=indexedDB.open("evia-basic",1);r.onupgradeneeded=()=>r.result.createObjectStore("files",{keyPath:"id"});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
  const tx=(mode,fn)=>db().then(d=>new Promise((res,rej)=>{const t=d.transaction("files",mode),st=t.objectStore("files"),out=fn(st);t.oncomplete=()=>res(out&&out.result);t.onerror=()=>rej(t.error)}));
  const put=(id,blob)=>tx("readwrite",st=>st.put({id,blob}));
  const get=id=>tx("readonly",st=>st.get(id)).then(r=>r&&r.blob);
  const del=id=>tx("readwrite",st=>st.delete(id));
  const urls={};
  const url=async id=>urls[id]||(urls[id]=await get(id).then(b=>b?URL.createObjectURL(b):""));
  const uid=p=>p+"-"+Date.now()+"-"+Math.random().toString(36).slice(2,7);

  /* ---------- Evia: what to do on this page ---------- */
  const HELP={
    topics:["Tap a topic.","Take photos of your work.","Say what they show."],
    topic:["Look at the list.","Take photos of these at work.","Tap Take photos."],
    camera:["Point at your work.","Tap the big white button.","Tap Save when you’re done."],
    write:["Look at each photo.","Type what it shows.","Tap Save."],
    portfolio:["Your saved work is here.","Tap one to open or share it."]
  };
  let page="topics";
  function help(which){
    const steps=HELP[which||page]||[];
    const w=document.createElement("div");w.className="bubble-wrap";
    w.innerHTML='<div class="bubble" role="dialog" aria-label="Evia says"><ol>'+steps.map(s=>'<li>'+esc(s)+'</li>').join("")+'</ol><button type="button">OK</button></div>';
    const close=()=>{w.remove();try{speechSynthesis.cancel()}catch(_){}document.querySelectorAll(".evia").forEach(e=>e.classList.remove("talk"))};
    w.onclick=e=>{if(e.target===w||e.target.tagName==="BUTTON")close()};
    document.body.appendChild(w);
    /* Said out loud too: many learners won't read it. */
    try{if(window.speechSynthesis){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(steps.join(" "));u.lang="en-GB";u.rate=.95;
      document.querySelectorAll(".evia").forEach(e=>e.classList.add("talk"));u.onend=()=>document.querySelectorAll(".evia").forEach(e=>e.classList.remove("talk"));speechSynthesis.speak(u)}}catch(_){}
  }
  const wireEvia=which=>{const e=document.getElementById("evia");if(e)e.onclick=()=>help(which)};
  function toast(t){document.querySelectorAll(".toast").forEach(x=>x.remove());const o=document.createElement("div");o.className="toast";o.textContent=t;document.body.appendChild(o);setTimeout(()=>o.remove(),2600)}
  const top=(title,back)=>'<header class="top">'+(back?'<button type="button" class="back" id="back" aria-label="Back">'+ICON.back+'</button>':"")+'<h1>'+esc(title)+'</h1>'+EVIA+'</header>';
  const dock=html=>'<div class="dock"><div class="dock-in">'+html+'</div></div>';

  /* ---------- Pages ---------- */
  function tabs(on){
    document.body.classList.toggle("no-tabs",!on);
    document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("on",b.dataset.tab===on));
    const n=document.getElementById("pf-n");if(n){n.hidden=!S.pf.length;n.textContent=S.pf.length}
  }
  const done=i=>S.pf.some(p=>p.topic===i);
  function topics(){
    page="topics";tabs("topics");
    app.innerHTML=top("Brickwork")+'<div class="grid">'+T.map((t,i)=>{const d=done(i),g=!d&&draft(i).photos.length;
      return '<button type="button" class="tile'+(d?" done":g?" going":"")+'" data-t="'+i+'"><span class="n">'+(i+1)+'</span><strong>'+esc(t.name)+'</strong>'+(d?'<span class="st" aria-label="Done">'+ICON.tick+'</span>':g?'<span class="st" aria-label="Started">'+ICON.dots+'</span>':"")+'</button>'}).join("")+'</div>';
    wireEvia();
    app.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>topic(+b.dataset.t));
  }
  async function topic(i){
    page="topic";tabs(null);
    const t=T[i],d=draft(i),n=d.photos.length;
    app.innerHTML=top(t.name,true)+
      (n?'<p class="have">'+n+' photo'+(n===1?"":"s")+'</p><div class="thumbs" id="th"></div>':"")+
      '<ul class="cap">'+t.capture.map(c=>'<li><span class="ic">'+ICON.cam+'</span><span><strong>'+esc(c[0])+'</strong><small>'+esc(c[1])+'</small></span></li>').join("")+'</ul>'+
      dock(n?'<button type="button" class="big alt" id="go-cam">'+ICON.cam+'More</button><button type="button" class="big" id="go-write">'+ICON.pen+'Write up</button>'
        :'<button type="button" class="big" id="go-cam">'+ICON.cam+'Take photos</button>');
    wireEvia();
    document.getElementById("back").onclick=topics;
    document.getElementById("go-cam").onclick=()=>camera(i);
    const w=document.getElementById("go-write");if(w)w.onclick=()=>write(i);
    const th=document.getElementById("th");
    if(th)for(const p of d.photos){const u=await url(p.id);if(u)th.insertAdjacentHTML("beforeend",'<img src="'+u+'" alt="">')}
  }

  /* ---------- Camera: square, stays open, Save when done ---------- */
  function camera(i){
    const t=T[i],shots=[];let stream=null;
    const el=document.createElement("div");el.className="cam";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");
    el.innerHTML='<header class="cam-top"><button type="button" class="cam-x" data-x aria-label="Close">'+ICON.x+'</button><strong>'+esc(t.name)+'</strong>'+EVIA.replace('id="evia"','id="evia-cam"')+'</header>'+
      '<div class="cam-stage"><video playsinline muted autoplay></video><span class="flash"></span><span class="cam-n" hidden></span></div>'+
      '<div class="cam-strip"></div>'+
      '<footer class="cam-bottom"><label class="cam-gal" aria-label="Add from gallery">'+ICON.gal+'<input type="file" accept="image/*" multiple hidden></label>'+
      '<button type="button" class="shutter" aria-label="Take photo"><i></i></button><button type="button" class="cam-save" disabled>Save</button></footer>';
    document.body.appendChild(el);
    const video=el.querySelector("video"),strip=el.querySelector(".cam-strip"),saveB=el.querySelector(".cam-save"),n=el.querySelector(".cam-n");
    const refresh=()=>{saveB.disabled=!shots.length;n.hidden=!shots.length;n.textContent=shots.length+" photo"+(shots.length===1?"":"s");
      strip.innerHTML=shots.map((s,k)=>'<span><img src="'+s.url+'" alt=""><button type="button" data-rm="'+k+'" aria-label="Remove">×</button></span>').join("");
      strip.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{const [s]=shots.splice(+b.dataset.rm,1);if(s)URL.revokeObjectURL(s.url);refresh()});
      strip.scrollLeft=strip.scrollWidth};
    const stop=()=>{if(stream)stream.getTracks().forEach(x=>x.stop());el.remove()};
    /* The middle square of what the camera sees, like the preview. */
    el.querySelector(".shutter").onclick=()=>{
      if(!video.videoWidth)return;
      const side=Math.min(video.videoWidth,video.videoHeight),px=Math.min(side,1600),c=document.createElement("canvas");c.width=c.height=px;
      c.getContext("2d").drawImage(video,(video.videoWidth-side)/2,(video.videoHeight-side)/2,side,side,0,0,px,px);
      try{navigator.vibrate&&navigator.vibrate(12)}catch(_){}
      const f=el.querySelector(".flash");f.classList.remove("on");void f.offsetWidth;f.classList.add("on");
      c.toBlob(b=>{if(b){shots.push({blob:b,url:URL.createObjectURL(b),at:Date.now()});refresh()}},"image/jpeg",.86);
    };
    /* From the gallery: made square the same way. */
    const pick=el.querySelector("input");
    pick.onchange=async()=>{for(const f of [...pick.files].filter(f=>/^image\//.test(f.type||""))){const b=await square(f);if(b)shots.push({blob:b,url:URL.createObjectURL(b),at:f.lastModified||Date.now()})}pick.value="";refresh()};
    saveB.onclick=async()=>{
      const d=draft(i);
      for(const s of shots){const id=uid("p");await put(id,s.blob);urls[id]=s.url;d.photos.push({id,at:s.at})}
      save();stop();write(i);
    };
    el.querySelector("[data-x]").onclick=()=>{if(shots.length&&!confirm("Lose these "+shots.length+" photos?"))return;shots.forEach(s=>URL.revokeObjectURL(s.url));stop()};
    el.querySelector("#evia-cam").onclick=()=>help("camera");
    navigator.mediaDevices&&navigator.mediaDevices.getUserMedia?navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1920}},audio:false})
      .then(s=>{stream=s;video.srcObject=s;return video.play().catch(()=>{})})
      .catch(err=>{el.querySelector(".cam-stage").insertAdjacentHTML("beforeend",'<div class="cam-msg">'+(err&&err.name==="NotAllowedError"?"Allow the camera in your phone settings, then try again.":"The camera didn’t start. Use the gallery button instead.")+'</div>')})
      :el.querySelector(".cam-stage").insertAdjacentHTML("beforeend",'<div class="cam-msg">Use the gallery button to add photos.</div>');
    refresh();
  }
  function square(file){
    return new Promise(res=>{const img=new Image(),u=URL.createObjectURL(file);img.onload=()=>{const side=Math.min(img.naturalWidth,img.naturalHeight),px=Math.min(side,1600),c=document.createElement("canvas");c.width=c.height=px;
      c.getContext("2d").drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,px,px);URL.revokeObjectURL(u);c.toBlob(b=>res(b),"image/jpeg",.86)};img.onerror=()=>{URL.revokeObjectURL(u);res(null)};img.src=u});
  }

  /* ---------- Write up: each photo, what it shows ---------- */
  async function write(i){
    page="write";tabs(null);
    const t=T[i],d=draft(i);
    if(!d.photos.length)return topic(i);
    app.innerHTML=top("Write up",true)+
      (S.name?"":'<label class="name"><span>Your name</span><input id="nm" autocomplete="name" placeholder="First and last name"></label>')+
      '<div class="wu">'+d.photos.map((p,k)=>'<div class="wu-row" data-p="'+esc(p.id)+'"><img alt="Photo '+(k+1)+'"><div><div class="k">PHOTO '+(k+1)+'</div><textarea rows="4" placeholder="What does it show?">'+esc(d.notes[p.id]||"")+'</textarea><button type="button" class="rm">Remove photo</button></div></div>').join("")+'</div>'+
      dock('<button type="button" class="big alt" id="more">'+ICON.cam+'More</button><button type="button" class="big" id="save">'+ICON.save+'Save</button>');
    wireEvia();
    for(const row of app.querySelectorAll(".wu-row")){const u=await url(row.dataset.p);row.querySelector("img").src=u}
    /* Words are kept as they're typed, so nothing is lost. */
    app.querySelectorAll(".wu-row textarea").forEach(ta=>ta.oninput=()=>{d.notes[ta.closest(".wu-row").dataset.p]=ta.value;save()});
    app.querySelectorAll(".wu-row .rm").forEach(b=>b.onclick=async()=>{const id=b.closest(".wu-row").dataset.p;if(!confirm("Remove this photo?"))return;
      d.photos=d.photos.filter(p=>p.id!==id);delete d.notes[id];save();await del(id).catch(()=>{});write(i)});
    const nm=document.getElementById("nm");if(nm)nm.oninput=()=>{S.name=nm.value.trim();save()};
    document.getElementById("back").onclick=()=>topic(i);
    document.getElementById("more").onclick=()=>camera(i);
    document.getElementById("save").onclick=async()=>{
      const empty=d.photos.filter(p=>!String(d.notes[p.id]||"").trim()).length;
      if(nm&&!nm.value.trim()){nm.focus();toast("Type your name first");return}
      if(empty){const ta=[...app.querySelectorAll(".wu-row")].find(r=>!r.querySelector("textarea").value.trim());if(ta){ta.scrollIntoView({behavior:"smooth",block:"center"});ta.querySelector("textarea").focus()}toast(empty===1?"Say what 1 photo shows":"Say what "+empty+" photos show");return}
      const b=document.createElement("div");b.className="busy";b.textContent="Saving…";document.body.appendChild(b);
      try{
        const blob=await pdf(i),id=uid("pdf");await put(id,blob);
        S.pf.unshift({id,topic:i,at:Date.now(),photos:d.photos.length});
        /* The photos are in the PDF now; the topic starts fresh for next time. */
        for(const p of d.photos){await del(p.id).catch(()=>{});if(urls[p.id]){URL.revokeObjectURL(urls[p.id]);delete urls[p.id]}}
        S.drafts[i]={photos:[],notes:{}};save();
        b.remove();portfolio(id);toast("Saved to your portfolio");
      }catch(err){b.remove();console.error("Evia Basic: PDF",err);alert("That didn’t save. Please try again.")}
    };
  }

  /* ---------- The PDF: photo on the left, what it shows on the right ---------- */
  function loadPdf(){
    if(window.jspdf)return Promise.resolve(window.jspdf);
    return new Promise((res,rej)=>{const s=document.createElement("script");s.src="vendor/jspdf.umd.min.js";s.onload=()=>window.jspdf?res(window.jspdf):rej(new Error("PDF maker didn't load"));s.onerror=()=>rej(new Error("PDF maker didn't load"));document.head.appendChild(s)});
  }
  const dataUrl=blob=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(blob)});
  const when=t=>new Date(t).toLocaleString("en-GB",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"});
  async function pdf(i){
    const t=T[i],d=draft(i),{jsPDF}=await loadPdf(),doc=new jsPDF({unit:"mm",format:"a4",compress:true});
    const W=210,H=297,M=16,CW=W-2*M,IMG=62,ink=[23,32,51],muted=[102,112,133];let y=M;
    const txt=s=>String(s||"").replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,"-").replace(/[^\x00-\xFF]/g,"");
    doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(...muted);doc.setCharSpace(.35);doc.text("EVIA · EVIDENCE",M,y+3);doc.setCharSpace(0);y+=7;
    doc.setFontSize(20);doc.setTextColor(...ink);doc.text(txt(t.name),M,y+7);y+=12;
    doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(71,84,103);
    [["Apprentice",S.name||""],["Course",COURSE.name+" ("+COURSE.std+")"],["Submitted",when(Date.now())],["KSBs",t.ksbs.join(", ")]].forEach(([k,v])=>{doc.setFont("helvetica","bold");doc.text(k+":",M,y+4);doc.setFont("helvetica","normal");doc.text(txt(v),M+26,y+4);y+=5.6});
    y+=2;doc.setDrawColor(229,188,2);doc.setLineWidth(.8);doc.line(M,y,W-M,y);y+=6;
    for(let k=0;k<d.photos.length;k++){
      const p=d.photos[k],b=await get(p.id);if(!b)continue;
      const lines=doc.setFont("helvetica","normal").setFontSize(11).splitTextToSize(txt(d.notes[p.id]||""),CW-IMG-8);
      const h=Math.max(IMG,10+lines.length*5.2);
      if(y+h>H-M-8){doc.addPage();y=M}
      doc.addImage(await dataUrl(b),"JPEG",M,y,IMG,IMG,undefined,"FAST");
      const x=M+IMG+8;doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(...ink);doc.text("Photo "+(k+1),x,y+4);
      doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.setTextColor(...muted);doc.text("Taken "+txt(when(p.at)),x,y+8.5);
      doc.setFontSize(11);doc.setTextColor(...ink);doc.text(lines,x,y+15);
      y+=h+8;
    }
    const pages=doc.getNumberOfPages();
    for(let n=1;n<=pages;n++){doc.setPage(n);doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(...muted);
      doc.text(txt((S.name||"Apprentice")+" · "+t.name),M,H-9);doc.text("Page "+n+" of "+pages,W-M,H-9,{align:"right"})}
    return doc.output("blob");
  }

  /* ---------- Portfolio ---------- */
  function portfolio(fresh){
    page="portfolio";tabs("portfolio");
    app.innerHTML=top("Portfolio")+(S.pf.length?'<div class="pf">'+S.pf.map(p=>'<button type="button" class="pf-row'+(p.id===fresh?" new":"")+'" data-pf="'+esc(p.id)+'"><span class="ic">PDF</span><span><strong>'+esc((T[p.topic]||{}).name||"Topic")+'</strong><small>'+esc(new Date(p.at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}))+' · '+p.photos+' photo'+(p.photos===1?"":"s")+'</small></span></button>').join("")+'</div>'
      :'<div class="empty"><b>📂</b>Nothing here yet.<br>Pick a topic and take photos.</div>');
    wireEvia();
    app.querySelectorAll("[data-pf]").forEach(b=>b.onclick=()=>openPdf(S.pf.find(p=>p.id===b.dataset.pf)));
  }
  async function openPdf(p){
    const blob=await get(p.id);if(!blob){alert("That PDF isn’t on this phone any more.");return}
    const name=((T[p.topic]||{}).name||"Evidence").replace(/[\\/:*?"<>|]/g,"-")+" - "+new Date(p.at).toISOString().slice(0,10)+".pdf";
    const file=typeof File==="function"?new File([blob],name,{type:"application/pdf"}):null;
    if(file&&navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:name});return}catch(e){if(e&&e.name==="AbortError")return}}
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.target="_blank";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000);
  }

  document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>b.dataset.tab==="portfolio"?portfolio():topics());
  topics();
  window.eviaBasic={topics,topic,write,portfolio,camera,pdf,state:S,help};
})();
