/* Evia7 learner profile, course selection and welcome experience. */
(function(){
  const defaults={name:"",start:"",end:"",avatar:"",signature:"",mathsEnabled:false,englishEnabled:false};
  /* Read and written through eviaData (data.js), like all learner data. */
  const get=()=>Object.assign({},defaults,window.eviaData.learner(),{avatar:window.eviaData.files.photo(),signature:window.eviaData.files.signature()});
  const set=p=>window.eviaData.put("learner",Object.assign({},p,{course:undefined}));
  const esc=s=>String(s??"").replace(/[&<>"]/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[x]));
  function avatarMarkup(p,large){
    return p.avatar
      ? '<img class="'+(large?"welcome-avatar":"profile-photo")+'" src="'+p.avatar+'" alt="Profile photo">'
      : '<div class="'+(large?"welcome-avatar profile-placeholder":"profile-photo profile-placeholder")+'" role="img" aria-label="Default profile picture"><svg class="profile-silhouette" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="21" r="11"></circle><path d="M13 55c2-12 9-19 19-19s17 7 19 19"></path></svg></div>';
  }

  /* Problem log (errors.js): what went wrong on this phone, to send to a tutor. */
  const ago=t=>{const m=Math.round((Date.now()-Date.parse(t))/6e4);return m<1?"just now":m<60?m+" min ago":m<1440?Math.round(m/60)+" h ago":Math.round(m/1440)+" days ago"};
  function problemsSummary(){
    const list=window.eviaErrors?window.eviaErrors.list():[];
    return list.length?list.length+" recorded · last "+ago(list[list.length-1].lastAt):"Nothing has gone wrong";
  }
  /* Switch course, downloading its pack first if it isn't on the phone (packs.js). */
  async function pickCourse(button,k,then){
    button.disabled=true;
    try{await window.eviaPacks.ensure(k)}catch(err){button.disabled=false;if(typeof showEvidenceToast==="function")showEvidenceToast(err.message,true);return}
    window.eviaData.put("learner",{course:k});then();
  }
  function openProblems(){
    const E=window.eviaErrors,list=E?E.list().slice().reverse():[];
    document.getElementById("modal-root").innerHTML='<div class="overlay"><section class="sheet pr-sheet pf-problems" role="dialog" aria-modal="true" aria-label="Problem log">'+
      '<div class="sheet-head"><div><div class="chat-kicker">YOUR DATA</div><h2>Problem log</h2></div><button class="close" id="pl-close" aria-label="Close">×</button></div>'+
      (list.length?'<p class="pf-note">If Evia isn’t working properly, send this to your tutor. It holds no evidence or personal details.</p>'+
        '<ul class="pl-list">'+list.map(x=>'<li><strong>'+esc(x.message)+'</strong><small>'+esc(ago(x.lastAt))+(x.count>1?' · '+x.count+' times':"")+(x.place?' · '+esc(x.place):"")+'</small></li>').join("")+'</ul>'+
        '<div class="pf-data-actions"><button type="button" class="primary" id="pl-send">Send to tutor</button><button type="button" class="secondary" id="pl-clear">Clear</button></div>'
        :'<p class="pf-note">Nothing has gone wrong on this phone.</p>')+
      '</section></div>';
    const back=()=>openProfile();
    document.getElementById("pl-close").onclick=back;
    const send=document.getElementById("pl-send");
    if(send)send.onclick=async()=>{
      const text="Evia problem log\n\n"+E.text();
      try{if(navigator.share){await navigator.share({title:"Evia problem log",text});return}}catch(e){if(e&&e.name==="AbortError")return}
      try{await navigator.clipboard.writeText(text);if(typeof showEvidenceToast==="function")showEvidenceToast("Copied. Paste it into a message to your tutor")}
      catch(_){if(typeof showEvidenceToast==="function")showEvidenceToast("Couldn’t copy the log",true)}
    };
    const clear=document.getElementById("pl-clear");
    if(clear)clear.onclick=()=>{E.clear();openProblems()};
  }

  function openProfile(){
    const p=get();
    const nvqOn=!!(window.eviaNvq&&window.eviaNvq.on()),dsl=p.safeguarding||{};
    /* Connected to a college: the name, dates and course are Nisia's, so they're shown but not changed here. */
    const nis=window.eviaNisia&&window.eviaNisia.joined(),ro=nis?" readonly":"";
    const row=(id,icon,title,sub)=>'<button type="button" class="pf-row" id="'+id+'"><span class="pf-row-icon" aria-hidden="true">'+icon+'</span><span class="pf-row-copy"><strong>'+title+'</strong>'+(sub?'<small>'+sub+'</small>':"")+'</span><span class="pf-chev" aria-hidden="true">›</span></button>';
    const sw=(id,title,sub)=>'<label class="pf-row pf-switch"><span class="pf-row-copy"><strong>'+title+'</strong>'+(sub?'<small>'+sub+'</small>':"")+'</span><input id="'+id+'" type="checkbox" role="switch"><i aria-hidden="true"></i></label>';
    const group=(title,body,cls)=>'<section class="pf-group'+(cls?" "+cls:"")+'">'+(title?'<h3>'+title+'</h3>':"")+'<div class="pf-card">'+body+'</div></section>';
    document.getElementById("modal-root").innerHTML=
      '<div class="profile-overlay"><section class="profile-sheet pf-sheet" role="dialog" aria-modal="true" aria-label="Your profile">'+
      '<button class="profile-close pf-close" id="profile-close" aria-label="Close">×</button>'+
      '<header class="pf-head"><label class="pf-avatar" title="Change photo">'+avatarMarkup(p,false)+'<span class="pf-avatar-edit" aria-hidden="true">✎</span><input id="avatar-file" type="file" accept="image/*" hidden></label>'+
        '<input class="pf-name" id="profile-name" value="'+esc(p.name)+'" placeholder="Your name" aria-label="Your name" autocomplete="name"'+ro+'>'+
        '<span class="pf-course">'+esc(C[course].name)+' · '+esc(C[course].std)+'</span></header>'+
      group("Apprenticeship",
        '<div class="pf-dates"><label>Started<input id="profile-start" type="date" value="'+esc(p.start)+'"'+ro+'></label><label>Finishes<input id="profile-end" type="date" value="'+esc(p.end)+'"'+ro+'></label></div>'+
        (nis?'<div class="pf-college"><strong>'+esc(nis.college)+'</strong>'+[nis.employer&&"Employer: "+nis.employer,nis.assessor&&"Assessor: "+nis.assessor,nis.tutor&&"Tutor: "+nis.tutor].filter(Boolean).map(t=>'<small>'+esc(t)+'</small>').join("")+'<small class="pf-sync" id="pf-sync">'+esc(window.eviaNisia.statusText())+'</small></div>'
          :window.eviaJoinCollege?row("join-college",'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10 12 5l9 5-9 5z"/><path d="M7 12.5V17c3 2 7 2 10 0v-4.5"/></svg>',"Connect to your college","Scan your assessor’s QR code"):"")+
        (nvqOn?'<details class="pf-more"><summary>Optional units<span>'+esc(window.eviaNvq.optionalChosen().join(", "))+'</span></summary><div class="nvq-opts" id="profile-nvq-opts">'+window.eviaNvq.optionalHtml()+'</div></details>':"")+
        sw("profile-maths","Maths","Include maths in tests and reviews")+
        sw("profile-english","English","Include English in tests and reviews")+
        (nis?"":'<details class="pf-more pf-change"><summary>Change course<span>Only if you’ve moved course</span></summary><div class="course-options">'+window.eviaPacks.catalogue().map(c=>'<button type="button" class="course-option '+(c.id===course?"selected":"")+'" data-profile-course="'+c.id+'">'+esc(c.name)+'<span>'+(c.id===course?"Current":"›")+'</span></button>').join("")+'</div></details>'))+
      (window.eviaPush&&window.eviaPush.state()!=="not-joined"?group("Notifications",pushRow()):"")+
      group("Evia",
        row("open-shape-picker",'<span class="evia-mini"><span class="evia-face"><i></i><i></i></span></span>',"Evia’s shape")+
        row("open-theme-picker",'<i class="pf-dot"></i>',"Evia’s colour")+
        row("open-settings","Aa","Accessibility","Text size, reading font, contrast and more"))+
      group("Signature",'<div class="signature-wrap pf-sign"><canvas id="signature-pad" width="900" height="260" aria-label="Sign with your finger"></canvas><button type="button" id="clear-signature">Clear</button></div><p class="pf-note">Sign with your finger. It’s added to evidence you save.</p>')+
      group("Safeguarding",
        (nis&&nis.safeguarding?'<div class="pf-college pf-dsl"><strong>'+esc(dsl.name||"Safeguarding lead")+'</strong>'+[dsl.phone,dsl.email].filter(Boolean).map(t=>'<small>'+esc(t)+'</small>').join("")+'<small>Set by '+esc(nis.college)+'</small></div>':"")+'<details class="pf-more"'+(nis&&nis.safeguarding?" hidden":"")+'><summary>'+(dsl.name?esc(dsl.name):"Add your safeguarding lead")+'<span>'+(dsl.name?esc(dsl.phone||dsl.email||""):"Optional · your tutor can tell you who")+'</span></summary><div class="pf-fields"><label>Name<input id="profile-dsl-name" value="'+esc(dsl.name||"")+'" placeholder="e.g. Jo Smith" autocomplete="off"></label><label>Phone<input id="profile-dsl-phone" type="tel" value="'+esc(dsl.phone||"")+'" placeholder="e.g. 01234 567890"></label><label>Email<input id="profile-dsl-email" type="email" value="'+esc(dsl.email||"")+'" placeholder="e.g. safeguarding@college.ac.uk"></label></div></details>')+
      group("Your data",
        '<div class="evia-storage-block pf-data"><p id="evia-storage-usage">Checking storage…</p><p id="evia-storage-status"></p><p class="evia-storage-last" id="evia-storage-last"></p></div>'+
        '<div class="pf-data-actions"><button type="button" class="secondary" id="evia-backup">Back up</button><label class="secondary evia-restore-label">Restore<input id="evia-restore" type="file" accept=".zip,application/zip" hidden></label><button type="button" class="secondary" id="download-portfolio">Portfolio PDF</button></div>'+
        sw("usage-share","Share anonymous usage","Which features you use, as counts. Never your name, work or photos.")+
        row("open-problems",'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/></svg>',"Problem log",problemsSummary())+
        (window.eviaStorage&&window.eviaStorage.removeAll?row("remove-all",'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>',"Remove all data from this phone",nis?"Start again. Connect again to get your records back from "+esc(nis.college):"Start again with an empty Evia"):""))+
      '<div class="pf-save"><button type="button" class="primary" id="save-profile">Save</button></div>'+
      '</section></div>';

    const canvas=document.getElementById("signature-pad"),ctx=canvas.getContext("2d");
    ctx.lineWidth=4;ctx.lineCap="round";ctx.lineJoin="round";
    if(p.signature){const img=new Image();img.onload=()=>ctx.drawImage(img,0,0,canvas.width,canvas.height);img.src=p.signature}
    let drawing=false;
    const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}};
    canvas.onpointerdown=e=>{drawing=true;canvas.setPointerCapture(e.pointerId);const q=point(e);ctx.beginPath();ctx.moveTo(q.x,q.y)};
    canvas.onpointermove=e=>{if(!drawing)return;const q=point(e);ctx.lineTo(q.x,q.y);ctx.stroke()};
    canvas.onpointerup=canvas.onpointercancel=()=>drawing=false;
    document.getElementById("clear-signature").onclick=()=>ctx.clearRect(0,0,canvas.width,canvas.height);

    document.getElementById("avatar-file").onchange=e=>{
      const f=e.target.files[0];if(!f)return;
      const r=new FileReader();r.onload=async()=>{p.avatar=window.eviaShrinkAvatar?await window.eviaShrinkAvatar(r.result):r.result;set(p);refreshProfileButton();openProfile()};r.readAsDataURL(f);
    };
    document.querySelectorAll("[data-profile-course]").forEach(b=>b.onclick=()=>pickCourse(b,b.dataset.profileCourse,openProfile));
    document.querySelectorAll("#profile-nvq-opts input").forEach(i=>i.onchange=()=>{const list=window.eviaNvq.readOptional(document.getElementById("profile-nvq-opts"));if(!list.length){i.checked=true;return}window.eviaNvq.setOptional(list);if(typeof render==="function")render()});
    document.getElementById("open-settings").onclick=()=>{if(window.eviaAccessibility)window.eviaAccessibility.open()};
    const shapePickerBtn=document.getElementById("open-shape-picker");
    if(shapePickerBtn){
      shapePickerBtn.onclick=()=>{if(window.eviaShowShapePicker)window.eviaShowShapePicker()};
      shapePickerBtn.onkeydown=e=>{if((e.key==="Enter"||e.key===" ")&&window.eviaShowShapePicker)window.eviaShowShapePicker()};
    }
    bindPush();
    const joinBtn=document.getElementById("join-college");if(joinBtn)joinBtn.onclick=()=>window.eviaJoinCollege();
    const themePickerBtn=document.getElementById("open-theme-picker");
    if(themePickerBtn){
      themePickerBtn.onclick=()=>{if(window.eviaShowThemePicker)window.eviaShowThemePicker()};
      themePickerBtn.onkeydown=e=>{if((e.key==="Enter"||e.key===" ")&&window.eviaShowThemePicker)window.eviaShowThemePicker()};
    }
    document.getElementById("profile-close").onclick=()=>document.getElementById("modal-root").innerHTML="";
    document.getElementById("save-profile").onclick=()=>{
      const signature=canvasHasInk(canvas)?canvas.toDataURL("image/png"):(p.signature||"");
      set(Object.assign(get(),{name:document.getElementById("profile-name").value.trim(),start:document.getElementById("profile-start").value,end:document.getElementById("profile-end").value,avatar:p.avatar,signature,mathsEnabled:document.getElementById("profile-maths").checked,englishEnabled:document.getElementById("profile-english").checked,safeguarding:{name:document.getElementById("profile-dsl-name").value.trim(),phone:document.getElementById("profile-dsl-phone").value.trim(),email:document.getElementById("profile-dsl-email").value.trim()}}));
      refreshProfileButton();document.getElementById("modal-root").innerHTML="";
    };
    document.getElementById("download-portfolio").onclick=downloadEvidencePack;
    document.getElementById("open-problems").onclick=openProblems;
    const us=document.getElementById("usage-share");if(us){us.checked=!(window.eviaUsage&&window.eviaUsage.off());us.onchange=()=>{if(window.eviaUsage)window.eviaUsage.setOff(!us.checked)}}
    const rm=document.getElementById("remove-all");if(rm)rm.onclick=openRemoveAll;
    if(window.eviaStorage)window.eviaStorage.bindProfileCard(document.getElementById("modal-root"));
    document.getElementById("profile-maths").checked=!!p.mathsEnabled;
    document.getElementById("profile-english").checked=!!p.englishEnabled;
    /* The maths and English switches save straight away, so closing the profile doesn't lose them. */
    [["profile-maths","mathsEnabled"],["profile-english","englishEnabled"]].forEach(([id,key])=>{const el=document.getElementById(id);el.onchange=()=>{set(Object.assign(get(),{[key]:el.checked}));if(typeof render==="function")render()}});
  }

  /* Remove all data from this phone: everything Evia keeps here goes, and Evia starts again from the beginning.
     Connected learners get their records back by connecting again (a code from their assessor): Nisia keeps them.
     Anything that hasn't reached Nisia yet would be lost, so it says so, and offers to send it first. */
  function openRemoveAll(){
    const N=window.eviaNisia,nis=N&&N.joined(),st=nis?N.status():null,waiting=st?st.changes+st.media:0;
    const root=document.getElementById("modal-root");
    root.innerHTML='<div class="overlay"><section class="sheet pr-sheet rm-sheet" role="dialog" aria-modal="true" aria-labelledby="rm-title"><div class="sheet-head"><div><div class="chat-kicker">YOUR DATA</div><h2 id="rm-title">Remove all data from this phone?</h2></div><button class="close" id="rm-close" type="button" aria-label="Close">×</button></div><div class="pr-body">'+
      '<p class="pr-intro">This removes everything Evia has saved on this phone: your evidence, photos, learning hours, lessons, tests, rewards and settings. Evia then starts again from the beginning.</p>'+
      (nis?'<div class="pr-banner"><strong>'+esc(nis.college)+' keeps your records.</strong> To get them back, connect again with a new code from your assessor, and Evia brings them down.</div>'
        :'<div class="pr-banner"><strong>This can’t be undone.</strong> Evia isn’t connected to a college, so nothing is kept anywhere else. Back up first if you might want it again.</div>')+
      (waiting?'<div class="pr-banner rm-warn" id="rm-waiting"><strong>'+waiting+(waiting===1?" thing hasn’t":" things haven’t")+' reached '+esc(nis.college)+' yet</strong> and would be lost. '+(st.online?'<button type="button" class="secondary" id="rm-send">Send now</button>':"Connect to the internet (photos need WiFi) and wait for it to send first.")+'</div>':"")+
      '<label class="rm-type"><span>Type <b>DELETE</b> to confirm</span><input id="rm-word" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>'+
      '<div class="pr-actions">'+(nis?"":'<button type="button" class="secondary" id="rm-backup">Back up first</button>')+'<button type="button" class="secondary" id="rm-cancel">Cancel</button><button type="button" class="primary rm-go" id="rm-go" disabled>Remove everything</button></div><p class="pr-note" id="rm-note" role="status"></p>'+
      '</div></section></div>';
    const close=()=>{root.innerHTML=""};
    root.querySelector("#rm-close").onclick=root.querySelector("#rm-cancel").onclick=close;
    const word=root.querySelector("#rm-word"),go=root.querySelector("#rm-go"),note=root.querySelector("#rm-note");
    word.oninput=()=>{go.disabled=word.value.trim().toUpperCase()!=="DELETE"};
    const bk=root.querySelector("#rm-backup");if(bk)bk.onclick=async()=>{bk.disabled=true;try{await window.eviaStorage.backup();note.textContent="Backup saved."}catch(_){note.textContent="The backup didn’t work. Try again from Your data."}bk.disabled=false};
    const send=root.querySelector("#rm-send");if(send)send.onclick=async()=>{send.disabled=true;note.textContent="Sending…";
      try{await N.sync();const s=N.status(),left=s.changes+s.media;note.textContent=left?left+" still to send"+(s.media&&!s.wifi?" (photos wait for WiFi).":"."):"Everything has reached "+nis.college+".";if(!left){const w=root.querySelector("#rm-waiting");if(w)w.remove()}}
      catch(_){note.textContent="Couldn’t send just now. Check your signal and try again."}send.disabled=false};
    go.onclick=async()=>{
      if(go.disabled)return;go.disabled=true;go.textContent="Removing…";
      try{if(window.eviaPush&&window.eviaPush.state()==="on")await Promise.race([window.eviaPush.off(),new Promise(r=>setTimeout(r,3000))])}catch(_){}
      try{await window.eviaStorage.removeAll()}catch(err){console.error("Evia: remove all",err)}
      location.replace(location.pathname);
    };
    word.focus();
  }
  function canvasHasInk(canvas){
    const d=canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data;
    for(let i=3;i<d.length;i+=4)if(d[i]>20)return true;
    return false;
  }

  function formatUKDate(value){
    if(!value)return "";
    const s=String(value);
    const m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/);
    if(m)return m[3]+"/"+m[2]+"/"+m[1];
    const d=new Date(s);
    if(Number.isNaN(d.getTime()))return s;
    return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear();
  }

  function evidenceEntry(e){
    return '<article class="evidence-entry">'+
      '<div class="entry-meta">'+esc(formatUKDate(e.d||e.savedAt||""))+'</div>'+
      '<h2>'+esc(e.u)+'</h2>'+
      (e.p&&e.p.length?'<div class="evidence-photos">'+e.p.map(p=>'<img src="'+p+'" alt="Evidence photo">').join("")+'</div>':"")+
      (e.w?'<p class="evidence-notes">'+esc(e.w).replace(/\n/g,"<br>")+'</p>':"")+
      '<div class="evidence-ksbs">'+(e.k||[]).map(k=>'<span>'+esc(k)+'</span>').join("")+'</div>'+
      (e.signature?'<div class="evidence-signature"><img src="'+e.signature+'" alt="Learner signature"><span>Signed by '+esc((e.learnerProfile&&e.learnerProfile.name)||"Apprentice")+' · '+esc(e.savedAt||e.d||"")+'</span></div>':"")+
      '</article>';
  }

  function downloadEvidencePack(){
    const p=get();
    const mine=evidence.filter(e=>e.c===course);
    if(!mine.length){alert("Save evidence before downloading an evidence pack.");return;}
    openEvidencePackWindow(mine,"Evia evidence pack");
  }

  async function openEvidencePackWindow(mine,title){
    if(window.eviaGetEvidencePhotoData)mine=await Promise.all(mine.map(async e=>Object.assign({},e,{p:await window.eviaGetEvidencePhotoData(e)})));
    const p=get();
    const learner=p.name||"Apprentice";
    const pdfDate=formatUKDate(new Date().toISOString());
    const printWindow=window.open("","_blank");
    if(!printWindow){alert("Please allow pop-ups to download your evidence pack.");return false;}
    printWindow.document.write('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>'+esc(title)+'</title><style>'+
      '@page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;color:#172033;font:11pt -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.45}.pack-header{border-bottom:2px solid #e6b800;padding-bottom:14px;margin-bottom:20px}.eyebrow{font-size:9pt;letter-spacing:.12em;color:#667085;font-weight:700}.pack-header h1{font-size:24pt;letter-spacing:-.04em;margin:4px 0}.pack-details{display:grid;grid-template-columns:1fr 1fr;gap:5px;color:#475467}.evidence-entry{break-inside:avoid;page-break-inside:avoid;border:1px solid #e4e7ec;border-radius:12px;padding:15px;margin:0 0 14px}.entry-meta{font-size:9pt;letter-spacing:.08em;text-transform:uppercase;color:#667085}.evidence-entry h2{font-size:16pt;margin:4px 0 10px}.evidence-photos{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:10px 0}.evidence-photos img{width:100%;aspect-ratio:1/1;height:auto;object-fit:cover;object-position:center center;border-radius:7px;border:1px solid #eaecf0;background:#f5f6f8}.evidence-notes{white-space:normal;color:#344054}.evidence-ksbs{display:flex;flex-wrap:wrap;gap:5px;margin-top:12px}.evidence-ksbs span{background:#fff7d6;border-radius:999px;padding:3px 7px;font:700 8pt -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#675600}.evidence-signature{border-top:1px solid #eaecf0;margin-top:13px;padding-top:8px;display:grid;gap:3px;font-size:8pt;color:#667085}.evidence-signature img{width:140px;height:38px;object-fit:contain;object-position:left center}.learner-signature{break-inside:avoid;page-break-inside:avoid;margin-top:28px;padding-top:18px;border-top:2px solid #e6b800;display:grid;gap:5px}.learner-signature-title{font-size:10pt;font-weight:700;color:#172033}.learner-signature-meta{display:grid;gap:2px;font-size:9pt;color:#475467}.learner-signature img{width:220px;height:70px;object-fit:contain;object-position:left center;margin-top:8px}.learner-signature-line{width:220px;border-top:1px solid #98a2b3;margin-top:-1px}.supporting-notice{margin:0 0 16px;padding:10px 12px;border:1px solid #f1df91;border-radius:10px;background:#fffbe8;color:#675600;font-size:9pt}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body>'+
      '<header class="pack-header"><div class="eyebrow">EVIA · EVIDENCE PACK</div><h1>'+esc(learner)+'</h1><div class="pack-details"><span><strong>Course:</strong> '+esc(data().name)+'</span><span><strong>Standard:</strong> '+esc(data().std)+'</span>'+(p.start?'<span><strong>Start date:</strong> '+esc(formatUKDate(p.start))+'</span>':"")+(p.end?'<span><strong>End date:</strong> '+esc(formatUKDate(p.end))+'</span>':"")+(mine.length===1?'<span><strong>Unit:</strong> '+esc(mine[0].u)+'</span>':"")+'</div></header>'+(window.eviaData.list("supporting",{course}).length?'<div class="supporting-notice"><strong>Supporting evidence:</strong> Additional supporting evidence is available separately in Supporting-Evidence.zip.</div>':"")+mine.slice().reverse().map(evidenceEntry).join("")+(p.signature?'<section class="learner-signature"><div class="learner-signature-title">Learner signature</div><div class="learner-signature-meta"><span><strong>Learner:</strong> '+esc(learner)+'</span><span><strong>Date:</strong> '+esc(pdfDate)+'</span></div><img src="'+p.signature+'" alt="Learner signature"><div class="learner-signature-line"></div></section>':"")+'</body></html>');
    printWindow.document.close();
    const waitForPrintImages=()=>{
      const images=Array.from(printWindow.document.images||[]);
      if(!images.length){printWindow.focus();printWindow.print();return;}
      Promise.all(images.map(img=>{
        if(img.complete&&img.naturalWidth>0)return Promise.resolve();
        return new Promise(resolve=>{
          let settled=false;
          const done=()=>{if(settled)return;settled=true;resolve()};
          img.addEventListener("load",done,{once:true});
          img.addEventListener("error",done,{once:true});
          setTimeout(done,3000);
        });
      })).then(()=>{printWindow.focus();printWindow.print()});
    };
    if(printWindow.document.readyState==="complete")waitForPrintImages();
    else printWindow.addEventListener("load",waitForPrintImages,{once:true});
    return true;
  }

  function downloadUnitEvidencePack(unitName){
    const mine=evidence.filter(e=>e.c===course&&e.u===unitName);
    if(!mine.length){alert("Save evidence for this unit before downloading.");return;}
    const title="Evia evidence pack · "+unitName;
    openEvidencePackWindow(mine,title);
    const state=JSON.parse(localStorage.getItem("evia7-downloaded-unit-pdfs")||"{}");
    state[course+"|"+unitName]=Date.now();
    localStorage.setItem("evia7-downloaded-unit-pdfs",JSON.stringify(state));
  }

  window.downloadEvidencePack=downloadEvidencePack;
  window.downloadUnitEvidencePack=downloadUnitEvidencePack;

  function refreshProfileButton(){
    const b=document.getElementById("profile-btn");if(!b)return;
    const p=get();b.innerHTML=p.avatar?'<img src="'+p.avatar+'" alt="Profile">':'<svg class="profile-silhouette profile-button-silhouette" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="21" r="11"></circle><path d="M13 55c2-12 9-19 19-19s17 7 19 19"></path></svg>';
  }

  function courseOnboarding(){
    const root=document.createElement("div");
    root.id="course-onboarding";
    root.innerHTML='<div class="course-onboarding-inner">'+
      '<div class="course-onboarding-kicker">WELCOME TO EVIA</div>'+
      '<h2>Choose your apprenticeship course</h2>'+
      '<p>This is the course you will use throughout your apprenticeship.</p>'+
      '<div class="course-onboarding-options">'+
        window.eviaPacks.catalogue().map(c=>'<button type="button" class="course-onboarding-option" data-first-course="'+c.id+'"><strong>'+esc(c.name)+'</strong><span>'+esc(c.std)+'</span></button>').join("")+
      '</div>'+
      '</div>';
    document.body.appendChild(root);
    requestAnimationFrame(()=>root.classList.add("visible"));
    root.querySelectorAll("[data-first-course]").forEach(b=>b.onclick=()=>pickCourse(b,b.dataset.firstCourse,()=>{
      root.classList.add("leaving");
      setTimeout(()=>{root.remove();welcome()},320);
    }));
  }

  function welcome(){
    if(document.getElementById("welcome-screen"))return;
    const appEl=document.getElementById("app");
    if(appEl){
      appEl.classList.remove("welcome-app-visible");
      appEl.classList.add("welcome-app-hidden");
    }
    const p=get();
    const root=document.createElement("div");root.id="welcome-screen";root.style.zIndex="2000";
    root.innerHTML='<div class="welcome-inner">'+
      '<div class="welcome-avatar evia-welcome-face"><span class="evia-face"><i></i><i></i></span></div>'+
      '<div class="welcome-pulse"></div>'+
      '<div class="welcome-copy"><div class="welcome-small">EVIA</div><h2>Hi'+(p.name?", "+esc(String(p.name).trim().split(/\s+/)[0]):"")+'.</h2><p>What do you want to work on today?</p></div>'+
      '</div>';
    document.body.appendChild(root);
    requestAnimationFrame(()=>root.classList.add("visible"));
    root.querySelector(".welcome-avatar").onclick=finishWelcome;
  }

  function finishWelcome(){
    const root=document.getElementById("welcome-screen");
    const appEl=document.getElementById("app");
    if(!root||!appEl)return;
    void appEl.offsetWidth;
    root.classList.add("leaving");
    requestAnimationFrame(()=>appEl.classList.add("welcome-app-visible"));
    setTimeout(()=>{
      appEl.classList.remove("welcome-app-hidden","welcome-app-visible");
      root.remove();
    },600);
  }

  let eviaProfileInitialised=false;
  /* Course notifications: a switch when the phone can have them, otherwise what to do to get them. */
  function pushRow(){
    const st=window.eviaPush.state(),why={install:"On iPhone, add Evia to your Home Screen first (Share, then Add to Home Screen), then turn them on here.",
      blocked:"They’re blocked for Evia in your phone’s settings. Allow notifications for Evia there, then come back.",unsupported:"This phone or browser can’t get notifications from Evia."}[st];
    return why?'<div class="pf-row pf-push-off"><span class="pf-row-copy"><strong>Course notifications</strong><small>'+why+'</small></span></div>'
      :'<label class="pf-row pf-switch"><span class="pf-row-copy"><strong>Course notifications</strong><small id="pf-push-sub">'+"Sign-offs, targets, reviews and learning hours. Never between 9pm and 7:30am."+'</small></span><input id="pf-push" type="checkbox" role="switch"'+(st==="on"?" checked":"")+'><i aria-hidden="true"></i></label>';
  }
  function bindPush(){
    const box=document.getElementById("pf-push");if(!box)return;
    const sub=document.getElementById("pf-push-sub");
    box.onchange=async()=>{
      box.disabled=true;
      try{
        if(box.checked){const ok=await window.eviaPush.on();box.checked=ok;if(sub)sub.textContent=ok?"Sign-offs, targets, reviews and learning hours. Never between 9pm and 7:30am.":window.eviaPush.state()==="blocked"?"Blocked in your phone’s settings.":"Not turned on."}
        else{await window.eviaPush.off();if(sub)sub.textContent="Sign-offs, targets, reviews and learning hours. Never between 9pm and 7:30am."}
      }catch(err){console.warn("Evia: notifications",err&&err.message);box.checked=window.eviaPush.state()==="on";if(sub)sub.textContent="Couldn’t reach your college. Try again with signal."}
      box.disabled=false;
    };
  }
  function initEviaProfile(){
    if(eviaProfileInitialised)return;
    eviaProfileInitialised=true;
    try{refreshProfileButton()}catch(e){}
    const profileButton=document.getElementById("profile-btn");
    if(profileButton)profileButton.onclick=openProfile;
    window.eviaOpenProfile=openProfile;
    const style=document.createElement("style");
    style.textContent=`
      .profile-photo-row{align-items:center}.profile-photo-row .profile-photo{width:58px;height:58px;flex:0 0 58px;border-radius:14px;object-fit:cover}.profile-photo-copy{min-width:0}.profile-photo-copy p{margin:4px 0 8px}.profile-btn{overflow:hidden;padding:0;display:grid;place-items:center}.profile-btn img{display:block;width:100%;height:100%;object-fit:cover;border-radius:50%}.profile-btn .profile-button-silhouette{width:25px;height:25px}.profile-silhouette{display:block;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}      .settings-list{display:grid;gap:8px;margin:12px 0 20px}.settings-entry{width:100%;display:grid;grid-template-columns:42px 1fr 20px;align-items:center;gap:12px;text-align:left;padding:13px 14px;border:1px solid #e6e9ed;border-radius:16px;background:#fff;box-shadow:0 2px 8px rgba(25,36,55,.035);cursor:pointer}.settings-entry-icon{width:42px;height:42px;border-radius:12px;background:var(--soft);border:1px solid var(--yellow-line);display:grid;place-items:center;font-size:13px;font-weight:800;color:var(--yellow-ink)}.settings-entry-copy{display:grid;gap:4px}.settings-entry-copy strong{font-size:13px;color:#273244}.settings-entry-copy small{font-size:11px;line-height:1.4;color:#8a94a3}.settings-entry-arrow{font-size:20px;color:#7b8797}.settings-row{width:100%;display:flex;align-items:center;justify-content:space-between;gap:14px;text-align:left;padding:15px 14px;border:1px solid #e6e9ed;border-radius:16px;background:#fff;box-shadow:0 2px 8px rgba(25,36,55,.035);cursor:pointer}.settings-row>span:first-child{display:grid;gap:4px}.settings-row strong{font-size:13px;color:#273244}.settings-row small{font-size:11px;line-height:1.4;color:#8a94a3}.settings-row-value{font-size:11px;color:#7b8797;white-space:nowrap}.settings-row-value b{font-size:20px;font-weight:400;vertical-align:-2px;margin-left:3px}.settings-intro{font-size:13px;line-height:1.55;color:#667085;margin:0 0 16px}.settings-preview{margin:6px 0 18px}.settings-preview-head{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:7px;font-size:10px;letter-spacing:.1em;color:#98a2b3}.settings-preview-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.settings-preview-card{min-width:0;padding:14px;border:1px solid #e4e7ec;border-radius:16px;background:#fff;overflow:hidden}.settings-preview-card h3{font-size:15px;margin:4px 0 7px}.settings-preview-card p{font-size:12px;line-height:1.45;color:#667085;margin:0 0 10px}.settings-preview-card button{padding:9px 11px;border-radius:11px;background:#172033;color:#fff;font-size:11px;font-weight:700}.preview-scale-115 h3{font-size:17.25px!important}.preview-scale-115 p{font-size:12.65px!important}.preview-scale-115 button{font-size:11.5px!important}.preview-scale-130 h3{font-size:19.5px!important}.preview-scale-130 p{font-size:14.3px!important}.preview-scale-130 button{font-size:13px!important}.preview-scale-150 h3{font-size:22px!important}.preview-scale-150 p{font-size:16.5px!important}.preview-scale-150 button{font-size:15px!important}.preview-dyslexia,.preview-dyslexia *{font-family:"Trebuchet MS",Verdana,sans-serif!important;letter-spacing:.035em!important;word-spacing:.12em!important}.preview-dyslexia p{font-size:12.5px!important}.preview-letter *{letter-spacing:.08em!important}.preview-lines p{line-height:2!important}.preview-contrast{color:#fff!important;border-color:#000!important;background:#111!important}.preview-contrast p{color:#fff!important}.preview-contrast button{background:#fff!important;color:#000!important;border:2px solid #000!important}.preview-overlay-cream{background:#fff7df!important}.preview-overlay-soft-yellow{background:#fffbe8!important}.preview-overlay-soft-blue{background:#edf6ff!important}.preview-overlay-soft-pink{background:#fff0f5!important}.preview-focus{background:#f2f4f7!important;border:3px solid #172033!important;box-shadow:0 0 0 5px rgba(23,32,51,.14)!important}.preview-focus:before{content:"FOCUS";display:block;font-size:8px;letter-spacing:.16em;font-weight:800;color:#172033;margin-bottom:6px}.preview-guide{position:relative}.preview-guide:after{content:"";position:absolute;left:-13px;right:-13px;top:var(--preview-guide-position,48%);height:38px;transform:translateY(-50%);background:var(--preview-guide-background,rgba(255,220,0,.55));border-top:2px solid rgba(80,65,0,.45);border-bottom:2px solid rgba(80,65,0,.45);pointer-events:none;z-index:4}.guide-colour-options{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}.guide-colour-options button{min-height:42px;border:1px solid #e1e5ea;border-radius:12px;background:#fff;color:#4d5969;font-size:12px}.guide-colour-options button.selected{border-color:var(--yellow);background:var(--soft);color:var(--yellow-ink);font-weight:700}.guide-colour-options button i{display:block;width:22px;height:12px;border-radius:6px;margin:0 auto 5px;border:1px solid #dfe4ea}.guide-colour-options button[data-choice="clear"] i{background:transparent}.guide-colour-options button[data-choice="yellow"] i{background:rgba(255,220,0,.42)}.guide-colour-options button[data-choice="blue"] i{background:rgba(80,160,255,.30)}.guide-colour-options button[data-choice="pink"] i{background:rgba(255,100,160,.28)}.settings-actions{display:flex;gap:9px;margin:20px 0 4px;align-items:center}.settings-actions>*{flex:1}.setting-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 0;margin-top:12px;border-top:1px solid #edf0f3}.setting-toggle-row span{display:grid;gap:3px}.setting-toggle-row strong{font-size:13px;color:#273244}.setting-toggle-row small{font-size:11px;color:#8a94a3}.setting-switch{display:inline-flex;align-items:center;gap:8px;cursor:pointer}.setting-switch input{position:absolute;opacity:0;pointer-events:none}.setting-switch i{width:44px;height:26px;border-radius:999px;background:#d9dee5;position:relative;display:block;flex:0 0 44px}.setting-switch i:after{content:"";position:absolute;width:20px;height:20px;left:3px;top:3px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(16,24,40,.2);transition:transform .18s ease}.setting-switch input:checked+i{background:#172033}.setting-switch input:checked+i:after{transform:translateX(18px)}.setting-switch em{font-style:normal;font-size:11px;font-weight:700;color:#667085;min-width:22px}.setting-switch-large{justify-content:center;min-height:44px;padding:0 10px}.setting-switch-large em{font-size:13px}.settings-section{margin-top:20px}.settings-label{font-size:10px;letter-spacing:.13em;color:#98a2b3;font-weight:700;margin-bottom:8px}.settings-segment{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.settings-segment button,.overlay-options button{min-height:42px;border:1px solid #e1e5ea;border-radius:12px;background:#fff;color:#4d5969;font-size:12px}.settings-segment button.selected,.overlay-options button.selected{border-color:var(--yellow);background:var(--soft);color:var(--yellow-ink);font-weight:700}.setting-toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid #edf0f3}.setting-toggle span{display:grid;gap:3px}.setting-toggle strong{font-size:13px;color:#273244}.setting-toggle small{font-size:11px;color:#8a94a3}.setting-toggle input{position:absolute;opacity:0}.setting-toggle i{width:44px;height:26px;border-radius:999px;background:#d9dee5;position:relative;flex:0 0 44px}.setting-toggle i:after{content:"";position:absolute;width:20px;height:20px;left:3px;top:3px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(16,24,40,.2);transition:transform .18s ease}.setting-toggle input:checked+i{background:#172033}.setting-toggle input:checked+i:after{transform:translateX(18px)}.overlay-options{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.overlay-options button{display:grid;gap:6px;place-items:center;padding:7px}.overlay-options button i{width:22px;height:22px;border-radius:50%;background:#fff;border:1px solid #dfe4ea}.overlay-options button[data-overlay="soft-green"] i{background:#effaf1}.overlay-options button[data-overlay="soft-yellow"] i{background:#fffbe8}.overlay-options button[data-overlay="soft-blue"] i{background:#edf6ff}.overlay-options button[data-overlay="soft-pink"] i{background:#fff0f5}
      #welcome-screen{position:fixed;inset:0;z-index:2000;background:#fffdfa;display:grid;place-items:center;opacity:0;transition:opacity .45s ease}#welcome-screen.visible{opacity:1}#welcome-screen.leaving{opacity:0}.welcome-inner{text-align:center;position:relative;display:flex;flex-direction:column;align-items:center;gap:22px}.welcome-avatar .evia-face{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:10px}.welcome-avatar .evia-face i{display:block;width:28px;height:38px;border:4px solid var(--yellow);border-radius:50%;position:relative;transform-origin:center}.welcome-avatar .evia-face i:first-child{animation:welcomeEyeA 7s ease-in-out infinite}.welcome-avatar .evia-face i:nth-child(2){animation:welcomeEyeB 7s ease-in-out infinite}@keyframes welcomeEyeA{0%,12%{transform:translate(0,0) rotate(0)}20%,31%{transform:translate(4px,1px) rotate(8deg)}40%,50%{transform:translate(-3px,-2px) rotate(-7deg)}61%,72%{transform:translate(2px,2px) rotate(5deg)}82%,100%{transform:translate(0,0) rotate(0)}}@keyframes welcomeEyeB{0%,12%{transform:translate(0,0) rotate(0)}20%,31%{transform:translate(4px,1px) rotate(8deg)}40%,50%{transform:translate(-3px,-2px) rotate(-7deg)}61%,72%{transform:translate(2px,2px) rotate(5deg)}82%,100%{transform:translate(0,0) rotate(0)}}.welcome-avatar .evia-face{pointer-events:none}
      .welcome-avatar{width:138px;height:138px;border-radius:50%;border:6px solid var(--yellow);background:#fffdfa;box-shadow:0 18px 45px rgba(16,24,40,.12);display:grid;place-items:center;position:relative;z-index:2;overflow:hidden;cursor:pointer}.welcome-pulse{position:absolute;width:150px;height:150px;border:1px solid var(--yellow);border-radius:50%;animation:welcomePulse 2.1s ease-out infinite}.welcome-copy h2{font-size:28px;letter-spacing:-.045em;margin:0 0 5px}.welcome-copy p{font-size:15px;color:#7b8797;margin:0}.welcome-app-hidden{opacity:0!important;transition:opacity .56s ease!important}.welcome-app-hidden.welcome-app-visible{opacity:1!important}.welcome-main-hidden,.welcome-main-visible,.welcome-revealed{animation:none!important}@keyframes welcomePulse{0%{transform:scale(.75);opacity:.75}70%,100%{transform:scale(1.25);opacity:0}}@keyframes revealScreen{from{opacity:0}to{opacity:1}}@media(prefers-reduced-motion:reduce){#app.welcome-app-hidden,#welcome-screen,.welcome-flying,.welcome-revealed{animation:none!important;transition:none!important}.welcome-pulse{animation:none!important}
    `;
    document.head.appendChild(style);
    const shapePicked=window.eviaShapeHasBeenPicked&&window.eviaShapeHasBeenPicked();
    const colourPicked=window.eviaThemeHasBeenPicked&&window.eviaThemeHasBeenPicked();
    const afterPickers=()=>{if(!(window.eviaMaybeStartOnboarding&&window.eviaMaybeStartOnboarding(!colourPicked)))welcome()};
    /* Brand-new learners choose their course first; the demo shows the shape and colour pickers after that. */
    let freshStart=false;try{freshStart=!colourPicked&&!localStorage.getItem("evia7-onboarding")}catch(_){}
    if(freshStart&&window.eviaMaybeStartOnboarding&&window.eviaMaybeStartOnboarding(true)){}
    else if(!shapePicked&&window.eviaShowShapePicker){
      window.eviaShowShapePicker(()=>{
        if(window.eviaShowThemePicker&&!colourPicked)window.eviaShowThemePicker(afterPickers);
        else afterPickers();
      });
    }else if(!colourPicked&&window.eviaShowThemePicker){
      window.eviaShowThemePicker(afterPickers);
    }else{
      afterPickers();
    }
  }
  try{initEviaProfile()}catch(e){console.error("Evia profile initialisation failed",e)}
  window.addEventListener("load",()=>{
    try{initEviaProfile()}catch(e){console.error("Evia profile initialisation failed",e)}
  });

})();