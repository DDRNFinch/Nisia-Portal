/* Evia Basic (tester): build your brickwork portfolio with Evia. Works on its own: nothing goes to Evia Portal,
   Milos, Paros or Symi, and everything stays on the phone (photos and PDFs in IndexedDB, the rest in localStorage, all
   under "eviab", apart from Evia's own storage on the same site).
     Topics     the goal (every topic into the portfolio, and the next one), then the topics, 2 wide. A tick when
                it's in the portfolio, orange when photos are waiting.
     Topics     18 of them, each a K (or a few) with the S and/or B that match it, so all 18 cover all 59 KSBs.
                On the job: straight into the square camera, with the things to capture under the picture one at a
                time (each photo labelled with its one); Save goes to the write-up. Talk about it: a few questions,
                answered in their own words.
     Write up   each photo with a box: what does it show? Save makes a PDF (photo on the left, words on the right),
                puts it in the Portfolio, and Evia celebrates.
     Progress   the KSBs with evidence (a topic's KSBs count once it's in the portfolio), how far through the course,
                and each KSB's meaning. Your details: name, course dates and Evia's colour.
     Learn      Teach me (Evia's lessons, taken from Evia as they are) and EPA practice (10 questions at a time).
     Portfolio  the PDFs, newest first. Tap one to see it, then Share.
   Evia says hello when it opens, sits in the top right of every page (tap her and she shows and says what to do),
   and celebrates when a topic goes in. */
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
  const BLANK=()=>({name:"",drafts:{},pf:[],tests:[],start:"",end:"",colour:0});
  const S=(()=>{try{return Object.assign(BLANK(),JSON.parse(localStorage.getItem(KEY)||"{}"))}catch(_){return BLANK()}})();
  const V=(document.querySelector('meta[name="evia-version"]')||{}).content||"";
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
  /* Saved before the 18 topics (there were 10): PDFs keep their old names and KSBs; photos not yet written up are
     cleared, as they belonged to the old topics. */
  if(S.layout!==2){
    const O=window.EB_OLD_TOPICS||[];
    S.pf.forEach(p=>{if(p.route==null&&p.name==null){const o=O[p.topic]||{};p.name=o.name||"Evidence";p.ksbs=(o.ksbs||[]).slice()}});
    Object.values(S.drafts||{}).forEach(d=>(d.photos||[]).forEach(ph=>del(ph.id).catch(()=>{})));
    S.drafts={};S.layout=2;save();
  }
  const pfName=p=>p.name||(T[p.route]||{}).name||"Evidence";

  /* ---------- Evia: what to do on this page ---------- */
  const HELP={
    topics:["Tap a topic.","Take photos of your work.","Say what they show."],

    camera:["Take a photo of what it says under the picture.","Then the next one comes up.","Tap Save when you’re done."],
    write:["Look at each photo.","Type what it shows.","Tap Save."],
    talk:["Read each question.","Answer it in your own words.","Tap Save."],
    portfolio:["Your saved work is here.","Tap one to see it.","Tap Share to send it."],
    progress:["The ring shows how much of your course has evidence.","Tap a KSB to see what it means."],
    learn:["Tap Teach me for short lessons.","Tap EPA practice to test yourself."]
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
  const done=i=>S.pf.some(p=>p.route===i);
  const started=i=>{const d=draft(i);return d.photos.length>0||Object.values(d.answers||{}).some(a=>String(a).trim())};
  function topics(){
    page="topics";tabs("topics");
    const n=T.filter((_,k)=>done(k)).length,next=T.findIndex((_,k)=>!done(k));
    app.innerHTML=top("Brickwork")+
      '<button type="button" class="card goal" id="goal">'+ring(Math.round(n/T.length*100),'<b>'+n+'</b><small>of '+T.length+'</small>')+
        '<span><span class="card-k"><span>Your goal</span></span><strong>'+(n>=T.length?"Every topic is in your portfolio":"Get all "+T.length+" topics into your portfolio")+'</strong>'+(next>=0?'<small>Next: '+esc(T[next].name)+' ›</small>':"")+'</span></button>'+
      ["photo","talk"].map(kind=>'<h2 class="group-h">'+(kind==="photo"?"On the job <small>Take photos</small>":"Talk about it <small>Answer a few questions</small>")+'</h2><div class="grid">'+T.map((t,i)=>{if(t.kind!==kind)return "";const d=done(i),g=!d&&started(i);
      return '<button type="button" class="tile'+(d?" done":g?" going":"")+'" data-t="'+i+'"><span class="n">'+(i+1)+'</span><strong>'+esc(t.name)+'</strong><small class="codes">'+esc(t.ksbs.join(" · "))+'</small>'+(d?'<span class="st" aria-label="Done">'+ICON.tick+'</span>':g?'<span class="st" aria-label="Started">'+ICON.dots+'</span>':"")+'</button>'}).join("")+'</div>').join("");
    wireEvia();
    app.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>topic(+b.dataset.t));
    document.getElementById("goal").onclick=()=>{if(next>=0)topic(next);else portfolio()};
  }
  /* A topic: straight into the camera, or to the write-up if photos are already waiting. "Talk about it" topics ask
     their questions instead. */
  function topic(i){if(T[i].kind==="talk")talk(i);else if(draft(i).photos.length)write(i);else camera(i)}

  /* ---------- Talk about it: a few questions, answered in their own words ---------- */
  function talk(i){
    page="talk";tabs(null);
    const t=T[i],d=draft(i);d.answers=d.answers||{};
    app.innerHTML=top(t.name,true)+'<p class="lead">Answer in your own words. A few sentences is plenty.</p>'+
      '<div class="wu">'+t.ask.map((q,k)=>'<div class="ask"><div class="k">QUESTION '+(k+1)+'</div><strong>'+esc(q)+'</strong><textarea rows="4" data-q="'+k+'" placeholder="Your answer">'+esc(d.answers[k]||"")+'</textarea></div>').join("")+'</div>'+
      '<p class="codes-line">Covers '+esc(t.ksbs.join(", "))+'</p>'+
      dock('<button type="button" class="big" id="save">'+ICON.save+'Save</button>');
    wireEvia("talk");
    app.querySelectorAll("[data-q]").forEach(ta=>ta.oninput=()=>{d.answers[ta.dataset.q]=ta.value;save()});
    document.getElementById("back").onclick=topics;
    document.getElementById("save").onclick=async()=>{
      const empty=[...app.querySelectorAll("[data-q]")].filter(ta=>ta.value.trim().split(/\s+/).filter(Boolean).length<3);
      if(empty.length){empty[0].scrollIntoView({behavior:"smooth",block:"center"});empty[0].focus();toast(empty.length===1?"Answer 1 more question":"Answer "+empty.length+" more questions");return}
      await saveToPortfolio(i,{answers:t.ask.length});
    };
  }
  /* The PDF goes in the Portfolio, the topic starts fresh, and Evia celebrates. */
  async function saveToPortfolio(i,extra){
    const t=T[i],d=draft(i),b=document.createElement("div");b.className="busy";b.textContent="Saving…";document.body.appendChild(b);
    try{
      const blob=await pdf(i),id=uid("pdf");await put(id,blob);
      S.pf.unshift(Object.assign({id,route:i,name:t.name,ksbs:t.ksbs.slice(),at:Date.now(),photos:d.photos.length},extra||{}));
      for(const p of d.photos){await del(p.id).catch(()=>{});if(urls[p.id]){URL.revokeObjectURL(urls[p.id]);delete urls[p.id]}}
      S.drafts[i]={photos:[],notes:{}};save();
      b.remove();celebrate(i,()=>portfolio(id));
    }catch(err){b.remove();console.error("Evia Basic: PDF",err);alert("That didn’t save. Please try again.")}
  }

  /* ---------- Camera: square, stays open, Save when done ----------
     The topic's things to capture show under the picture, one at a time. Each photo is labelled with the one on screen
     and the next comes up; Skip (or the arrows) moves along without one. After the last, more photos are welcome. */
  function camera(i){
    const t=T[i],shots=[],list=t.capture,have=new Set(draft(i).photos.map(p=>p.label).filter(Boolean));let stream=null;
    let step=Math.max(0,list.findIndex(c=>!have.has(c[0])));if(have.size&&list.every(c=>have.has(c[0])))step=list.length;
    const el=document.createElement("div");el.className="cam";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");
    el.innerHTML='<header class="cam-top"><button type="button" class="cam-x" data-x aria-label="Close">'+ICON.x+'</button><strong>'+esc(t.name)+'</strong>'+EVIA.replace('id="evia"','id="evia-cam"')+'</header>'+
      '<div class="cam-stage"><video playsinline muted autoplay></video><span class="flash"></span><span class="cam-n" hidden></span></div>'+
      '<div class="cam-prompt" aria-live="polite"><button type="button" class="cp-nav" data-prev aria-label="Back one">‹</button><div class="cp-mid"><small class="cp-n"></small><strong class="cp-say"></strong><span class="cp-hint"></span></div><button type="button" class="cp-nav cp-skip" data-next>Skip</button></div>'+
      '<div class="cam-strip"></div>'+
      '<footer class="cam-bottom"><label class="cam-gal" aria-label="Add from gallery">'+ICON.gal+'<input type="file" accept="image/*" multiple hidden></label>'+
      '<button type="button" class="shutter" aria-label="Take photo"><i></i></button><button type="button" class="cam-save" disabled>Save</button></footer>';
    document.body.appendChild(el);
    const video=el.querySelector("video"),strip=el.querySelector(".cam-strip"),saveB=el.querySelector(".cam-save"),n=el.querySelector(".cam-n");
    const prompt=()=>{
      const c=list[step],dots=list.map((x,k)=>'<i class="'+(k===step?"now":shots.some(s=>s.label===x[0])||have.has(x[0])?"got":"")+'"></i>').join("");
      el.querySelector(".cp-n").innerHTML=c?(step+1)+" of "+list.length+'<span class="cp-dots">'+dots+'</span>':"";
      el.querySelector(".cp-say").textContent=c?c[0]:"That’s everything";
      el.querySelector(".cp-hint").textContent=c?c[1]:"Take any more you like, then tap Save.";
      el.querySelector("[data-prev]").disabled=step===0;
      const nx=el.querySelector("[data-next]");nx.hidden=!c;nx.textContent="Skip";
    };
    el.querySelector("[data-prev]").onclick=()=>{if(step>0){step--;prompt()}};
    el.querySelector("[data-next]").onclick=()=>{if(step<list.length){step++;prompt()}};
    const refresh=()=>{prompt();saveB.disabled=!shots.length;n.hidden=!shots.length;n.textContent=shots.length+" photo"+(shots.length===1?"":"s");
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
      const label=list[step]?list[step][0]:"";
      c.toBlob(b=>{if(b){shots.push({blob:b,url:URL.createObjectURL(b),at:Date.now(),label});if(step<list.length)step++;refresh()}},"image/jpeg",.86);
    };
    /* From the gallery: made square the same way. */
    const pick=el.querySelector("input");
    pick.onchange=async()=>{for(const f of [...pick.files].filter(f=>/^image\//.test(f.type||""))){const b=await square(f);if(b){shots.push({blob:b,url:URL.createObjectURL(b),at:f.lastModified||Date.now(),label:list[step]?list[step][0]:""});if(step<list.length)step++}}pick.value="";refresh()};
    saveB.onclick=async()=>{
      const d=draft(i);
      for(const s of shots){const id=uid("p");await put(id,s.blob);urls[id]=s.url;d.photos.push({id,at:s.at,label:s.label||""})}
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
    if(!d.photos.length)return topics();
    const hint=l=>{const c=t.capture.find(x=>x[0]===l);return c?c[1]:""};
    app.innerHTML=top("Write up",true)+
      (S.name?"":'<label class="name"><span>Your name</span><input id="nm" autocomplete="name" placeholder="First and last name"></label>')+
      '<div class="wu">'+d.photos.map((p,k)=>'<div class="wu-row" data-p="'+esc(p.id)+'"><img alt="Photo '+(k+1)+'"><div><div class="k">PHOTO '+(k+1)+(p.label?' · '+esc(p.label.toUpperCase()):"")+'</div><textarea rows="4" placeholder="'+esc(p.label?"What does it show? "+hint(p.label):"What does it show?")+'">'+esc(d.notes[p.id]||"")+'</textarea><button type="button" class="rm">Remove photo</button></div></div>').join("")+'</div>'+
      dock('<button type="button" class="big alt" id="more">'+ICON.cam+'More</button><button type="button" class="big" id="save">'+ICON.save+'Save</button>');
    wireEvia();
    for(const row of app.querySelectorAll(".wu-row")){const u=await url(row.dataset.p);row.querySelector("img").src=u}
    /* Words are kept as they're typed, so nothing is lost. */
    app.querySelectorAll(".wu-row textarea").forEach(ta=>ta.oninput=()=>{d.notes[ta.closest(".wu-row").dataset.p]=ta.value;save()});
    app.querySelectorAll(".wu-row .rm").forEach(b=>b.onclick=async()=>{const id=b.closest(".wu-row").dataset.p;if(!confirm("Remove this photo?"))return;
      d.photos=d.photos.filter(p=>p.id!==id);delete d.notes[id];save();await del(id).catch(()=>{});write(i)});
    const nm=document.getElementById("nm");if(nm)nm.oninput=()=>{S.name=nm.value.trim();save()};
    document.getElementById("back").onclick=topics;
    document.getElementById("more").onclick=()=>camera(i);
    document.getElementById("save").onclick=async()=>{
      const empty=d.photos.filter(p=>!String(d.notes[p.id]||"").trim()).length;
      if(nm&&!nm.value.trim()){nm.focus();toast("Type your name first");return}
      if(empty){const ta=[...app.querySelectorAll(".wu-row")].find(r=>!r.querySelector("textarea").value.trim());if(ta){ta.scrollIntoView({behavior:"smooth",block:"center"});ta.querySelector("textarea").focus()}toast(empty===1?"Say what 1 photo shows":"Say what "+empty+" photos show");return}
      await saveToPortfolio(i);
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
    /* What this covers, in the standard's own words. */
    y+=1;t.ksbs.forEach(c=>{const l=doc.setFont("helvetica","normal").setFontSize(8.5).splitTextToSize(txt((window.EB_KSBS||{})[c]||""),CW-14);
      if(y+l.length*3.8>H-M-8){doc.addPage();y=M}doc.setFont("helvetica","bold");doc.setTextColor(...ink);doc.text(c,M,y+3);doc.setFont("helvetica","normal");doc.setTextColor(...muted);doc.text(l,M+14,y+3);y+=l.length*3.8+1.2});
    y+=2;doc.setDrawColor(229,188,2);doc.setLineWidth(.8);doc.line(M,y,W-M,y);y+=6;
    /* Talk about it: each question and the learner's answer. */
    if(t.kind==="talk")t.ask.forEach((q,k)=>{
      const ql=doc.setFont("helvetica","bold").setFontSize(11).splitTextToSize(txt((k+1)+". "+q),CW),al=doc.setFont("helvetica","normal").setFontSize(11).splitTextToSize(txt((d.answers||{})[k]||""),CW);
      if(y+ql.length*5.2+al.length*5.2+8>H-M-8){doc.addPage();y=M}
      doc.setFont("helvetica","bold");doc.setTextColor(...ink);doc.text(ql,M,y+4);y+=ql.length*5.2+1;
      doc.setFont("helvetica","normal");doc.text(al,M,y+4);y+=al.length*5.2+7;
    });
    for(let k=0;k<d.photos.length;k++){
      const p=d.photos[k],b=await get(p.id);if(!b)continue;
      const lines=doc.setFont("helvetica","normal").setFontSize(11).splitTextToSize(txt(d.notes[p.id]||""),CW-IMG-8);
      const h=Math.max(IMG,10+lines.length*5.2);
      if(y+h>H-M-8){doc.addPage();y=M}
      doc.addImage(await dataUrl(b),"JPEG",M,y,IMG,IMG,undefined,"FAST");
      const x=M+IMG+8;doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(...ink);doc.text(txt("Photo "+(k+1)+(p.label?": "+p.label:"")),x,y+4);
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
    app.innerHTML=top("Portfolio")+(S.pf.length?'<div class="pf">'+S.pf.map(p=>'<button type="button" class="pf-row'+(p.id===fresh?" new":"")+'" data-pf="'+esc(p.id)+'"><span class="ic">PDF</span><span><strong>'+esc(pfName(p))+'</strong><small>'+esc(new Date(p.at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}))+' · '+(p.answers?p.answers+' answers':p.photos+' photo'+(p.photos===1?"":"s"))+'</small></span></button>').join("")+'</div>'
      :'<div class="empty"><b>📂</b>Nothing here yet.<br>Pick a topic and take photos.</div>');
    wireEvia();
    app.querySelectorAll("[data-pf]").forEach(b=>b.onclick=()=>openPdf(S.pf.find(p=>p.id===b.dataset.pf)));
  }
  /* Tapping a PDF shows it on screen, page by page (pdf.js, kept with the app so it works offline), with Share. */
  const PDFJS="vendor/pdfjs-3.11.174/";
  let pdfjsP=null;
  const loadPdfjs=()=>window.pdfjsLib?Promise.resolve(window.pdfjsLib):pdfjsP||(pdfjsP=new Promise((res,rej)=>{
    const s=document.createElement("script");s.src=PDFJS+"pdf.min.js";
    s.onload=()=>{if(!window.pdfjsLib)return rej(new Error("no viewer"));window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+"pdf.worker.min.js";res(window.pdfjsLib)};
    s.onerror=()=>{pdfjsP=null;rej(new Error("no viewer"))};document.head.appendChild(s)}));
  const pdfName=p=>pfName(p).replace(/[\\/:*?"<>|]/g,"-")+" - "+new Date(p.at).toISOString().slice(0,10)+".pdf";
  async function sharePdf(p,blob){
    const name=pdfName(p),file=typeof File==="function"?new File([blob],name,{type:"application/pdf"}):null;
    if(file&&navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:name});return}catch(e){if(e&&e.name==="AbortError")return}}
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000);
  }
  async function openPdf(p){
    const blob=await get(p.id);if(!blob){alert("That PDF isn’t on this phone any more.");return}
    const el=document.createElement("div");el.className="pv";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");
    el.innerHTML='<header class="pv-top"><button type="button" class="cam-x" data-x aria-label="Close">'+ICON.x+'</button><strong>'+esc(pfName(p))+'</strong>'+
      '<button type="button" class="pv-share" data-share>Share</button></header><div class="pv-pages"><p class="pv-wait">Opening…</p></div>';
    document.body.appendChild(el);document.body.classList.add("pv-open");
    let closed=false;const close=()=>{closed=true;el.remove();document.body.classList.remove("pv-open")};
    el.querySelector("[data-x]").onclick=close;
    el.querySelector("[data-share]").onclick=()=>sharePdf(p,blob);
    const box=el.querySelector(".pv-pages");
    try{
      const lib=await loadPdfjs(),doc=await lib.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise;
      box.innerHTML="";
      const w=Math.min(box.clientWidth||window.innerWidth,900)-24,dpr=Math.min(window.devicePixelRatio||1,2.5);
      for(let n=1;n<=doc.numPages&&!closed;n++){
        const pg=await doc.getPage(n),v1=pg.getViewport({scale:1}),vp=pg.getViewport({scale:w/v1.width*dpr});
        const c=document.createElement("canvas");c.width=vp.width;c.height=vp.height;c.style.width=w+"px";c.style.height=(vp.height/dpr)+"px";c.setAttribute("aria-label","Page "+n);
        box.appendChild(c);await pg.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;
      }
    }catch(err){console.error("Evia Basic: preview",err);if(!closed)box.innerHTML='<p class="pv-wait">The preview didn’t open. Tap Share to open it in another app.</p>'}
  }

  /* ---------- Teach me and the EPA questions (taken from Evia), loaded once in the background ---------- */
  const LEARN=["learn/shim.js","learn/teach-kit.js","learn/teach-pics.js","learn/teach-play.js","learn/teach-maths.js","learn/teach-english.js","learn/teach-edi.js","learn/teach-bricklayer.js","learn/teach.js","learn/test-bank-bricklayer.js"];
  let learnP=null;
  const loadLearn=()=>learnP||(learnP=(async()=>{
    const css=document.createElement("link");css.rel="stylesheet";css.href="learn/teach.css?v="+V;document.head.appendChild(css);
    for(const f of LEARN)await new Promise((res,rej)=>{const s=document.createElement("script");s.src=f+"?v="+V;s.onload=res;s.onerror=()=>rej(new Error(f));document.head.appendChild(s)});
    return window.eviaTeach;
  })().catch(err=>{learnP=null;throw err}));
  const teachReport=()=>{try{return window.eviaTeach?window.eviaTeach.report():null}catch(_){return null}};
  const bestTest=()=>S.tests.length?Math.max(...S.tests.map(t=>Math.round(t.score/t.total*100))):null;

  /* ---------- Progress: how much of the course has evidence ---------- */
  const ALL=Object.keys(window.EB_KSBS||{});
  const evidenced=()=>{const s=new Set();S.pf.forEach(p=>(p.ksbs||(T[p.route]||{}).ksbs||[]).forEach(k=>s.add(k)));return s};
  const timePct=()=>{const a=Date.parse(S.start||""),b=Date.parse(S.end||"");return a&&b&&b>a?Math.max(0,Math.min(100,Math.round((Date.now()-a)/(b-a)*100))):null};
  const ring=(p,inner,size)=>'<span class="ring'+(size?" "+size:"")+'" style="--p:'+Math.max(0,Math.min(100,p))+'"><span>'+inner+'</span></span>';
  async function progress(){
    page="progress";tabs("progress");
    const have=evidenced(),pct=ALL.length?Math.round(have.size/ALL.length*100):0,tp=timePct(),doneN=T.filter((_,i)=>done(i)).length;
    const R=teachReport(),best=bestTest();
    const verdict=tp==null?"":pct>=tp-10?'<span class="pill good">On track</span>':'<span class="pill low">Behind</span>';
    const group=(l,n)=>{const ks=ALL.filter(k=>k[0]===l);return '<section class="card"><div class="card-k"><span>'+n+'</span><b>'+ks.filter(k=>have.has(k)).length+' of '+ks.length+'</b></div><div class="chips">'+
      ks.map(k=>'<button type="button" class="chip'+(have.has(k)?" on":"")+'" data-k="'+k+'">'+k+'</button>').join("")+'</div></section>'};
    app.innerHTML=top("Progress")+
      '<section class="card hero">'+ring(pct,'<b>'+pct+'%</b>',"big")+'<div><strong>'+have.size+' of '+ALL.length+' KSBs</strong><small>have evidence in your portfolio</small>'+verdict+'</div></section>'+
      (tp!=null?'<section class="card"><div class="card-k"><span>Your course</span><b>'+tp+'% through</b></div><span class="bar"><i style="width:'+tp+'%"></i></span><small class="muted">'+esc(fmtDate(S.start))+' to '+esc(fmtDate(S.end))+'</small></section>'
        :'<button type="button" class="card row" id="dates"><span>Add your course dates</span><small>So Evia can tell you if you’re on track</small><i>›</i></button>')+
      '<div class="stats"><div><b>'+doneN+'<small>/'+T.length+'</small></b><span>topics</span></div><div><b>'+(R?R.done:"–")+(R?'<small>/'+R.total+'</small>':"")+'</b><span>lessons</span></div><div><b>'+(best==null?"–":best+"%")+'</b><span>best EPA</span></div></div>'+
      group("K","Knowledge")+group("S","Skills")+group("B","Behaviours")+
      '<button type="button" class="card row" id="me"><span>Your details</span><small>'+esc(S.name||"Name, course dates and colour")+'</small><i>›</i></button>';
    wireEvia();
    app.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{const k=b.dataset.k,where=T.filter((t,i)=>t.ksbs.includes(k)).map(t=>t.name);
      sheet('<span class="sheet-k">'+k+'</span><p class="sheet-big">'+esc(window.EB_KSBS[k]||"")+'</p><p class="muted">'+(have.has(k)?"✓ In your portfolio":"Not in your portfolio yet")+(where.length?". Topic"+(where.length>1?"s":"")+": "+esc(where.join(", ")):"")+'</p>')});
    const d=document.getElementById("dates");if(d)d.onclick=me;
    document.getElementById("me").onclick=me;
    if(!R)loadLearn().then(()=>{if(page==="progress")progress()}).catch(()=>{});
  }
  const fmtDate=s=>s?new Date(s+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"";
  function sheet(html,after){
    const w=document.createElement("div");w.className="sheet-wrap";w.innerHTML='<div class="sheet" role="dialog" aria-modal="true">'+html+'<button type="button" class="big sheet-ok">OK</button></div>';
    const close=()=>{w.classList.add("out");setTimeout(()=>{w.remove();document.body.classList.remove("pv-open")},180);if(after)after(w)};
    w.onclick=e=>{if(e.target===w)close()};w.querySelector(".sheet-ok").onclick=close;document.body.appendChild(w);document.body.classList.add("pv-open");return w;
  }
  /* Your details: name, course dates and Evia's colour. */
  const COLOURS=[["#e7b900","#fff7d6"],["#f79009","#fef0c7"],["#12b76a","#d1fadf"],["#2e90fa","#d1e9ff"],["#7a5af8","#ebe9fe"],["#ee46bc","#fce7f6"]];
  function paint(){const c=COLOURS[S.colour||0]||COLOURS[0];document.documentElement.style.setProperty("--yellow",c[0]);document.documentElement.style.setProperty("--soft",c[1]);const m=document.querySelector('meta[name="theme-color"]');if(m)m.content="#fffdfa"}
  function me(){
    const w=sheet('<span class="sheet-k">Your details</span>'+
      '<label class="field"><span>Your name</span><input id="me-n" value="'+esc(S.name)+'" autocomplete="name"></label>'+
      '<div class="two"><label class="field"><span>Course start</span><input type="date" id="me-s" value="'+esc(S.start||"")+'"></label><label class="field"><span>Course end</span><input type="date" id="me-e" value="'+esc(S.end||"")+'"></label></div>'+
      '<span class="field"><span>Evia’s colour</span><span class="swatches">'+COLOURS.map((c,i)=>'<button type="button" class="sw'+((S.colour||0)===i?" on":"")+'" data-c="'+i+'" style="--c:'+c[0]+'" aria-label="Colour '+(i+1)+'"></button>').join("")+'</span></span>',
      w=>{S.name=w.querySelector("#me-n").value.trim();S.start=w.querySelector("#me-s").value;S.end=w.querySelector("#me-e").value;save();if(page==="progress")progress()});
    w.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>{S.colour=+b.dataset.c;save();paint();w.querySelectorAll(".sw").forEach(x=>x.classList.toggle("on",x===b))});
  }

  /* ---------- Learn: Teach me lessons and EPA practice ---------- */
  async function learn(){
    page="learn";tabs("learn");
    app.innerHTML=top("Learn")+'<p class="muted center">Loading…</p>';wireEvia();
    try{await loadLearn()}catch(_){app.innerHTML=top("Learn")+'<p class="muted center">Lessons didn’t load. Check your signal and try again.</p>';wireEvia();return}
    if(page!=="learn")return;
    const R=teachReport()||{subjects:[],done:0,total:0},next=window.eviaTeach.summary(),best=bestTest();
    const SUB={course:["Bricklaying","🧱"],maths:["Maths","➗"],english:["English","✏️"],edi:["Safeguarding","🛡️"]};
    app.innerHTML=top("Learn")+
      '<button type="button" class="card teach" id="teach">'+'<span class="evia small"><span class="face"><i></i><i></i></span></span>'+
        '<span><span class="card-k"><span>Teach me</span></span><strong>'+esc(next.next||"Every lesson done")+'</strong><small>'+R.done+' of '+R.total+' lessons done</small></span><span class="go">'+(R.done?"Carry on":"Start")+'</span></button>'+
      '<div class="subjects">'+R.subjects.map(s=>{const p=s.total?Math.round(s.done/s.total*100):0;return '<button type="button" class="subj" data-s="'+s.id+'"><span class="subj-ic" aria-hidden="true">'+(SUB[s.id]||["",""])[1]+'</span>'+ring(p,p+"%","small")+'<strong>'+esc((SUB[s.id]||[s.name])[0])+'</strong><small>'+s.done+' of '+s.total+' lessons</small></button>'}).join("")+'</div>'+
      '<button type="button" class="card epa" id="epa"><span><span class="card-k"><span>End-point assessment</span></span><strong>EPA practice</strong><small>10 questions · about 5 minutes</small></span><span class="epa-best">'+(best==null?"Start":best+"%<small>best</small>")+'</span></button>';
    wireEvia();
    document.getElementById("teach").onclick=()=>window.eviaTeach.open();
    app.querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>window.eviaTeach.open(b.dataset.s));
    document.getElementById("epa").onclick=epa;
  }
  /* Teach me closing: back to Learn with the new numbers. */
  new MutationObserver(()=>{if(page==="learn"&&!document.querySelector(".tm")&&learn.open){learn.open=false;learn()}if(document.querySelector(".tm"))learn.open=true}).observe(document.body,{childList:true});

  /* EPA practice: 10 questions from the bricklaying EPA bank, one at a time, right or wrong straight away. */
  async function epa(){
    await loadLearn();
    const bank=(window.EPA_QUESTIONS||{}).bricklaying||[];if(!bank.length)return toast("No questions yet");
    const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
    const qs=shuffle(bank).slice(0,10).map(q=>({code:q[0],q:q[1],right:q[2][0],opts:shuffle(q[2])}));
    let i=0,score=0;const missed=[];
    const el=document.createElement("div");el.className="quiz";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");document.body.appendChild(el);document.body.classList.add("pv-open");
    const close=()=>{el.remove();document.body.classList.remove("pv-open");if(page==="learn")learn()};
    const face='<span class="evia quiz-evia"><span class="face"><i></i><i></i></span></span>';
    const show=()=>{
      const q=qs[i];
      el.innerHTML='<header class="quiz-top"><button type="button" class="cam-x" data-x aria-label="Close">'+ICON.x+'</button><span class="bar"><i style="width:'+Math.round(i/qs.length*100)+'%"></i></span><b>'+(i+1)+'/'+qs.length+'</b></header>'+
        '<div class="quiz-body">'+face+'<p class="quiz-q">'+esc(q.q)+'</p><div class="quiz-opts">'+q.opts.map((o,k)=>'<button type="button" class="opt" data-o="'+k+'"><span>'+"ABCD"[k]+'</span>'+esc(o)+'</button>').join("")+'</div></div>'+
        '<footer class="quiz-foot"><button type="button" class="big" id="qn" hidden>'+(i===qs.length-1?"See my score":"Next")+'</button></footer>';
      el.querySelector("[data-x]").onclick=()=>{if(i&&!confirm("Stop this practice?"))return;close()};
      el.querySelectorAll("[data-o]").forEach(b=>b.onclick=()=>{
        if(el.querySelector(".opt.right"))return;
        const ok=q.opts[+b.dataset.o]===q.right;if(ok)score++;else missed.push(q);
        el.querySelectorAll(".opt").forEach(x=>{if(q.opts[+x.dataset.o]===q.right)x.classList.add("right");else if(x===b)x.classList.add("wrong");x.disabled=true});
        const e=el.querySelector(".quiz-evia");e.classList.add(ok?"happy":"oops");try{navigator.vibrate&&navigator.vibrate(ok?12:[20,40,20])}catch(_){}
        const n=el.querySelector("#qn");n.hidden=false;n.focus();
      });
      el.querySelector("#qn").onclick=()=>{i++;i<qs.length?show():end()};
    };
    const end=()=>{
      S.tests.push({at:Date.now(),score,total:qs.length});save();
      const p=Math.round(score/qs.length*100),best=bestTest();
      el.innerHTML='<header class="quiz-top"><button type="button" class="cam-x" data-x aria-label="Close">'+ICON.x+'</button><span></span></header>'+
        '<div class="quiz-body center">'+ring(p,'<b>'+p+'%</b>',"big")+'<h2>'+(p>=80?"Brilliant!":p>=60?"Good going":"Keep practising")+'</h2><p class="muted">You got '+score+' of '+qs.length+' right'+(best===p&&S.tests.length>1?". A new best!":".")+'</p>'+
        (missed.length?'<div class="missed"><span class="card-k"><span>Worth another look</span></span>'+missed.map(q=>'<div class="miss"><p>'+esc(q.q)+'</p><b>✓ '+esc(q.right)+'</b></div>').join("")+'</div>':"")+'</div>'+
        '<footer class="quiz-foot two"><button type="button" class="big alt" id="qa">Again</button><button type="button" class="big" id="qd">Done</button></footer>';
      el.querySelector("[data-x]").onclick=close;el.querySelector("#qd").onclick=close;el.querySelector("#qa").onclick=()=>{close();epa()};
      if(p>=80)confetti();
    };
    show();
  }

  /* ---------- Evia's charm: hello, and a celebration when a topic goes in the portfolio ---------- */
  function confetti(){
    const c=document.createElement("div");c.className="confetti";c.setAttribute("aria-hidden","true");
    const cols=["var(--yellow)","#12b76a","#2e90fa","#f79009","#ee46bc"];
    c.innerHTML=Array.from({length:36},(_,k)=>'<i style="left:'+Math.round(Math.random()*100)+'%;background:'+cols[k%cols.length]+';animation-delay:'+(Math.random()*.4).toFixed(2)+'s;--x:'+Math.round(Math.random()*120-60)+'px;--r:'+Math.round(Math.random()*720)+'deg"></i>').join("");
    document.body.appendChild(c);setTimeout(()=>c.remove(),2400);
  }
  function celebrate(i,then){
    const n=T.filter((_,k)=>done(k)).length;
    const w=document.createElement("div");w.className="party";
    w.innerHTML='<div class="hello-in"><span class="evia huge happy"><span class="face"><i></i><i></i></span></span><h2>'+esc(T[i].name)+' saved!</h2><p>'+(n>=T.length?"Every topic is in your portfolio. Amazing!":n+" of "+T.length+" topics in your portfolio")+'</p></div>';
    document.body.appendChild(w);confetti();try{navigator.vibrate&&navigator.vibrate([15,60,15])}catch(_){}
    const go=()=>{if(!w.parentNode)return;w.classList.add("out");setTimeout(()=>w.remove(),300);then()};
    w.onclick=go;setTimeout(go,2200);
  }
  function welcome(){
    const w=document.createElement("div");w.className="hello";
    if(!S.name){
      w.innerHTML='<div class="hello-in"><span class="evia huge"><span class="face"><i></i><i></i></span></span><h1>Hi, I’m Evia</h1><p>I’ll help you build your brickwork portfolio, one topic at a time.</p>'+
        '<label class="field"><span>What’s your name?</span><input id="hello-n" autocomplete="name" placeholder="First and last name"></label><button type="button" class="big" id="hello-go">Let’s go</button></div>';
      document.body.appendChild(w);
      const n=w.querySelector("#hello-n"),go=w.querySelector("#hello-go");
      go.onclick=()=>{if(!n.value.trim()){n.focus();return}S.name=n.value.trim();save();w.classList.add("out");setTimeout(()=>{w.remove();help("topics")},350)};
      n.onkeydown=e=>{if(e.key==="Enter")go.click()};
      return;
    }
    w.innerHTML='<div class="hello-in"><span class="evia huge happy"><span class="face"><i></i><i></i></span></span><h1>Hi '+esc(S.name.split(/\s+/)[0])+'</h1></div>';
    document.body.appendChild(w);
    const go=()=>{if(!w.parentNode)return;w.classList.add("out");setTimeout(()=>w.remove(),450)};
    w.onclick=go;setTimeout(go,1600);
  }

  const PAGES={topics,progress,learn,portfolio};
  document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>(PAGES[b.dataset.tab]||topics)());
  paint();topics();welcome();
  /* Lessons load quietly once the app is open, so Learn opens straight away. */
  setTimeout(()=>loadLearn().catch(()=>{}),2500);
  window.eviaBasic={topics,topic,write,portfolio,progress,learn,epa,camera,pdf,state:S,help,loadLearn};
})();
