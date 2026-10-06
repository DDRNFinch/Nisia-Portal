/* Evia7 "Send to e-portfolio": per-unit files (evidence PDF + original photos) ready to upload to Aptem or any e-portfolio. */
(function(){
  const SENT_KEY="evia7-downloaded-unit-pdfs";
  const escHtml=s=>String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
  const readJson=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||"null");return v??f}catch(_){return f}};
  const slug=s=>String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,60)||"Evidence";
  const isoDate=d=>{const x=new Date(d);return isNaN(x)?new Date().toISOString().slice(0,10):x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")};
  const ukDate=d=>{const x=new Date(d);return isNaN(x)?String(d||""):x.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})};
  const formatBytes=n=>n<1024*1024?Math.max(1,Math.round(n/1024))+" KB":(n/1024/1024).toFixed(1)+" MB";
  const canShareFiles=files=>{try{return !!(navigator.canShare&&navigator.share&&navigator.canShare({files}))}catch(_){return false}};
  const entryTime=e=>{const t=Date.parse(e.savedAt||"");if(!isNaN(t))return t;const m=String(e.d||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?new Date(+m[3],m[2]-1,+m[1]).getTime():0};

  let jspdfPromise=null;
  function loadJsPdf(){
    if(window.jspdf)return Promise.resolve(window.jspdf);
    return jspdfPromise||(jspdfPromise=new Promise((resolve,reject)=>{
      const s=document.createElement("script");s.src="vendor/jspdf.umd.min.js";
      s.onload=()=>window.jspdf?resolve(window.jspdf):reject(new Error("PDF library unavailable"));
      s.onerror=()=>{jspdfPromise=null;reject(new Error("PDF library unavailable"))};
      document.head.appendChild(s);
    }));
  }
  const loadImage=src=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src});
  /* Crops a photo to a centred square that fills the tile, with softly rounded corners (white, to match the page). */
  async function squareTile(src,px=640){
    const img=await loadImage(src);if(!img||!img.naturalWidth)return null;
    const side=Math.min(img.naturalWidth,img.naturalHeight),sx=(img.naturalWidth-side)/2,sy=(img.naturalHeight-side)/2;
    const c=document.createElement("canvas");c.width=c.height=px;const g=c.getContext("2d");
    g.fillStyle="#fff";g.fillRect(0,0,px,px);
    const r=px*.05;g.beginPath();g.moveTo(r,0);g.arcTo(px,0,px,px,r);g.arcTo(px,px,0,px,r);g.arcTo(0,px,0,0,r);g.arcTo(0,0,px,0,r);g.closePath();g.clip();
    g.drawImage(img,sx,sy,side,side,0,0,px,px);
    return c.toDataURL("image/jpeg",.85);
  }
  /* The built-in PDF fonts only cover Latin-1, so swap smart punctuation and drop anything else (e.g. emoji). */
  const pdfText=s=>String(s||"").replace(/[‘’′]/g,"'").replace(/[“”″]/g,'"').replace(/[–—−]/g,"-").replace(/…/g,"...").replace(/•/g,"-").replace(/[^\n\x20-\x7E\u00A0-\u00FF]/g,"").replace(/[ \t]{2,}/g," ");
  function accentRgb(){
    const v=getComputedStyle(document.documentElement).getPropertyValue("--yellow").trim()||"#e7b900";
    const m=v.match(/^#?([0-9a-f]{6})$/i);if(!m)return[231,185,0];
    const n=parseInt(m[1],16);return[(n>>16)&255,(n>>8)&255,n&255];
  }

  async function buildUnitPdf(unitName,entries,photosByEntry){
    const {jsPDF}=await loadJsPdf();
    const doc=new jsPDF({unit:"mm",format:"a4",compress:true});
    const profile=window.eviaData.learner(),learner=profile.name||"Apprentice";
    const W=210,H=297,M=16,CW=W-2*M,BOTTOM=H-M-8;
    const ink=[23,32,51],muted=[102,112,133],accent=accentRgb();
    let y=M;
    const need=h=>{if(y+h>BOTTOM){doc.addPage();y=M;return true}return false};
    const label=(t,x,yy)=>{doc.setFont("helvetica","bold");doc.setFontSize(7.5);doc.setTextColor(...muted);doc.setCharSpace(.35);doc.text(pdfText(t).toUpperCase(),x,yy);doc.setCharSpace(0)};

    // Header
    label("Evia · Evidence pack",M,y+3);y+=6;
    doc.setFont("helvetica","bold");doc.setFontSize(21);doc.setTextColor(...ink);doc.text(pdfText(unitName),M,y+7);y+=11;
    const details=[["Learner",learner],["Course",data().name],["Standard",data().std],["Evidence entries",String(entries.length)]];
    if(profile.start)details.push(["Start date",ukDate(profile.start)]);
    if(profile.end)details.push(["End date",ukDate(profile.end)]);
    details.push(["PDF created",ukDate(Date.now())]);
    doc.setFontSize(9);
    details.forEach((d,i)=>{const x=M+(i%2)*(CW/2),yy=y+Math.floor(i/2)*5.2;doc.setFont("helvetica","bold");doc.setTextColor(...ink);doc.text(pdfText(d[0])+":",x,yy+3.5);const lw=doc.getTextWidth(pdfText(d[0])+": ");doc.setFont("helvetica","normal");doc.setTextColor(71,84,103);doc.text(pdfText(d[1]),x+lw,yy+3.5)});
    y+=Math.ceil(details.length/2)*5.2+3;
    doc.setDrawColor(...accent);doc.setLineWidth(.8);doc.line(M,y,W-M,y);y+=8;
    /* More than one entry: a contents list, filled in with page numbers once every entry has been laid out. */
    let tocY=null;const starts=[];
    if(entries.length>1){label("Contents",M,y+3);y+=6;tocY=y;y+=entries.length*5.6+4;doc.setDrawColor(234,236,240);doc.setLineWidth(.3);doc.line(M,y,W-M,y);y+=8}

    for(let i=0;i<entries.length;i++){
      const e=entries[i],photos=photosByEntry[i]||[];
      if(i>0){doc.addPage();y=M} /* each evidence occasion starts on its own page */
      starts.push(doc.getNumberOfPages());
      need(20);
      label("Evidence "+(i+1)+" of "+entries.length+" · "+ukDate(entryTime(e)||e.d),M,y+3);y+=7;
      // Photos: four square tiles per row, each cropped from the centre to fill its tile.
      const cols=4,gap=3,tile=(CW-gap*(cols-1))/cols;
      for(let p=0;p<photos.length;p+=cols){
        const row=[];
        for(const src of photos.slice(p,p+cols)){const t=await squareTile(src);if(t)row.push(t)}
        if(!row.length)continue;
        need(tile+gap);
        row.forEach((t,j)=>{
          const x=M+j*(tile+gap);
          try{doc.addImage(t,"JPEG",x,y,tile,tile,undefined,"FAST");doc.setDrawColor(234,236,240);doc.setLineWidth(.25);doc.roundedRect(x,y,tile,tile,tile*.05,tile*.05,"S")}catch(err){console.warn("Evia PDF photo skipped",err)}
        });
        y+=tile+gap;
      }
      y+=1;
      /* The write-up, then what was said in any recordings (the files themselves stay in Evia and Nisia). */
      const recs=(e.media||[]),recNote=recs.length?recs.map(m=>(m.kind==="video"?"Video":"Voice note")+(m.secs?" "+Math.floor(m.secs/60)+":"+String(m.secs%60).padStart(2,"0"):"")).join(", "):"";
      const blocks=[e.w?["Write-up",e.w]:null,recs.length?["Recording"+(recs.length===1?"":"s")+" ("+recNote+")",recs.map(m=>m.transcript).filter(Boolean).join("\n\n")||"Recorded in Evia. Ask the learner or their assessor to play it."]:null].filter(Boolean);
      for(const [title,body] of blocks){
        /* The write-up sits in a tile with a light grey outline; a long one carries on in a new tile on the next page. */
        need(14);label(title,M,y+3);y+=5.5;
        const PAD=4.5,size=10.5,lh=size*.3528*1.45;
        doc.setFont("helvetica","normal");doc.setFontSize(size);
        let lines=doc.splitTextToSize(pdfText(body),CW-PAD*2);
        while(lines.length){
          if(BOTTOM-y<PAD*2+lh*2){doc.addPage();y=M}
          const fit=Math.max(1,Math.min(lines.length,Math.floor((BOTTOM-y-PAD*2)/lh))),chunk=lines.splice(0,fit),h=chunk.length*lh+PAD*2-1;
          doc.setFillColor(250,251,252);doc.setDrawColor(223,227,233);doc.setLineWidth(.3);doc.roundedRect(M,y,CW,h,2.5,2.5,"FD");
          doc.setFont("helvetica","normal");doc.setFontSize(size);doc.setTextColor(52,64,84);
          chunk.forEach((l,n)=>doc.text(l,M+PAD,y+PAD+lh*.75+n*lh));
          y+=h+(lines.length?0:5);
          if(lines.length){doc.addPage();y=M}
        }
      }
      const ksbs=(e.k||[]).filter(Boolean);
      if(ksbs.length){
        /* Small grey pills, wrapping onto new lines as needed. */
        need(12);label("KSBs covered",M,y+3);y+=5.5;
        doc.setFont("helvetica","bold");doc.setFontSize(7.5);
        const ph=5,px=2.4,pg=1.6;let x=M;
        ksbs.forEach(k=>{
          const t=pdfText(k),w=doc.getTextWidth(t)+px*2;
          if(x+w>W-M){x=M;y+=ph+pg}
          need(ph+2);
          doc.setFillColor(242,244,247);doc.setDrawColor(228,231,236);doc.setLineWidth(.2);doc.roundedRect(x,y,w,ph,ph/2,ph/2,"FD");
          doc.setTextColor(71,84,103);doc.text(t,x+px,y+ph/2+1.05);
          x+=w+pg;
        });
        y+=ph+5;
      }
      if(e.signature){
        need(22);
        try{doc.addImage(e.signature,"PNG",M,y,48,14,undefined,"FAST")}catch(_){}
        y+=15;
        doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(...muted);
        doc.text(pdfText("Signed by "+((e.learnerProfile&&e.learnerProfile.name)||learner)+" · "+ukDate(entryTime(e)||e.d)),M,y+2.5);y+=5;
      }
    }

    if(tocY!=null){
      doc.setPage(1);doc.setFontSize(9.5);
      entries.forEach((e,i)=>{
        const yy=tocY+i*5.6+3.5,n=(photosByEntry[i]||[]).length;
        doc.setFont("helvetica","bold");doc.setTextColor(...ink);doc.text("Evidence "+(i+1),M,yy);
        doc.setFont("helvetica","normal");doc.setTextColor(71,84,103);doc.text(pdfText(ukDate(entryTime(e)||e.d)+" · "+n+" photo"+(n===1?"":"s")),M+24,yy);
        doc.setTextColor(...muted);doc.text("Page "+starts[i],W-M,yy,{align:"right"});
      });
    }
    const pages=doc.getNumberOfPages();
    for(let n=1;n<=pages;n++){
      doc.setPage(n);doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(...muted);
      doc.text(pdfText(learner+" · "+unitName),M,H-9);
      doc.text("Page "+n+" of "+pages,W-M,H-9,{align:"right"});
      /* Branding: a tiny Evia (yellow square, two eyes) and "Created using Evia", centred. */
      const brand="Created using Evia",bw=doc.getTextWidth(brand),s=3.4,bx=W/2-(s+1.6+bw)/2,by=H-9-2.6;
      doc.setFillColor(229,188,2);doc.roundedRect(bx,by,s,s,.7,.7,"F");
      doc.setFillColor(255,255,255);doc.ellipse(bx+s*.2835,by+s*.49,s*.111,s*.168,"F");doc.ellipse(bx+s*.7165,by+s*.49,s*.111,s*.168,"F");
      doc.setTextColor(...muted);doc.text(brand,bx+s+1.6,H-9);
    }
    const out=doc.output("blob");out.evPages=pages;return out;
  }

  function saveFile(file){
    const a=document.createElement("a");a.href=URL.createObjectURL(file);a.download=file.name;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),60000);
  }
  function notify(message){if(typeof showEvidenceToast==="function")showEvidenceToast(message,true);else alert(message)}
  /* Resolves true once shared. Never falls back to downloading: a failed share says so and leaves Save for the learner. */
  async function shareFiles(files){
    try{await navigator.share({files});return true}
    catch(err){
      if(err&&err.name==="AbortError")return false;
      console.warn("Evia share failed",err);
      notify(err&&err.name==="NotAllowedError"?"Sharing isn't allowed here. Use Save instead.":"Your phone couldn't open sharing. Use Save instead.");
      return false;
    }
  }
  function markSent(unitName,list){
    if(list&&window.eviaMarkShared)list.forEach(e=>window.eviaMarkShared("pack:"+e.id));
    const state=readJson(SENT_KEY,{});state[course+"|"+unitName]=Date.now();
    localStorage.setItem(SENT_KEY,JSON.stringify(state));
    const el=document.getElementById("eport-sent");if(el)el.textContent="Last sent "+ukDate(Date.now());
  }

  const icon={
    pdf:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>',
    share:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
    save:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>'
  };

  function injectStyles(){
    if(document.getElementById("evia-eport-styles"))return;
    const style=document.createElement("style");style.id="evia-eport-styles";
    style.textContent=`
      .eport-page{display:grid;gap:12px}
      .eport-intro h2{margin:2px 0 6px}
      .eport-intro p{margin:0;font-size:12.5px;line-height:1.5;color:#667085}
      .eport-sent{display:inline-block;margin-top:10px;font-size:11px;font-weight:700;color:var(--yellow-ink);background:var(--soft);border-radius:999px;padding:4px 10px}
      .eport-sent:empty{display:none}
      .eport-ksbs{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 12px}
      .eport-ksbs span{font-size:11px;font-weight:750;color:var(--yellow-ink);background:var(--soft);border:1px solid var(--yellow-line);border-radius:999px;padding:3px 9px}
      .eport-all{margin-top:12px}
      .eport-copy{min-height:40px;padding:8px 14px;border-radius:12px;border:1px solid #e3e7ed;background:#fff;font-size:12px;font-weight:700;cursor:pointer}
      .eport-files{display:grid;gap:10px;margin-bottom:13px}
      .eport-pdf{display:grid;gap:12px;margin:0!important}
      .eport-sheet{position:relative;display:flex;flex-direction:column;gap:6px;width:min(230px,70%);aspect-ratio:1/1.414;margin:4px auto 0;padding:16px 14px;border-radius:6px;border:1px solid #e4e7ec;background:#fff;box-shadow:0 10px 26px rgba(16,24,40,.12),0 2px 4px rgba(16,24,40,.06);text-align:left;font:inherit;color:#172033;cursor:pointer;overflow:hidden;transition:transform .2s ease,box-shadow .2s ease}
      .eport-sheet:active{transform:scale(.98)}
      .eport-sheet-kicker{font-size:6.5px;font-weight:800;letter-spacing:.14em;color:#667085}
      .eport-sheet-title{font-size:14px;line-height:1.15;font-weight:800}
      .eport-sheet-sub{font-size:7.5px;color:#667085}
      .eport-sheet-rule{height:2px;background:var(--yellow);border-radius:2px;margin:2px 0}
      .eport-sheet-photos{display:grid;grid-template-columns:repeat(4,1fr);gap:3px}
      .eport-sheet-photos img{width:100%;aspect-ratio:1/1;object-fit:cover;object-position:center;border-radius:2px;background:#f2f4f7}
      .eport-sheet-text{font-size:7.5px;line-height:1.45;color:#344054;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden}
      .eport-sheet-ksbs{display:flex;flex-wrap:wrap;gap:3px}
      .eport-sheet-ksbs i{font-style:normal;font-size:6.5px;font-weight:800;padding:1.5px 4px;border-radius:3px;background:var(--soft);color:var(--yellow-ink)}
      .eport-sheet-open{position:absolute;left:0;right:0;bottom:0;padding:8px;background:linear-gradient(transparent,rgba(255,255,255,.96) 40%);font-size:10px;font-weight:800;color:var(--yellow-ink);text-align:center}
      .eport-sheet.is-loading{cursor:default;gap:10px;box-shadow:0 6px 18px rgba(16,24,40,.08)}
      .eport-sheet.is-loading span{display:block;height:10px;border-radius:4px;background:linear-gradient(90deg,#f2f4f7,#e9edf2,#f2f4f7);background-size:200% 100%;animation:eportShimmer 1.2s linear infinite}
      .eport-sheet.is-loading span:nth-child(1){width:60%;height:14px}.eport-sheet.is-loading span:nth-child(3){height:70px}
      @keyframes eportShimmer{to{background-position:-200% 0}}
      .eport-status{margin:0;text-align:center;font-size:12px;color:#667085}
      .eport-status strong{color:#172033}
      .eport-main{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .eport-main.single{grid-template-columns:1fr}
      .eport-main button{min-height:50px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14.5px}
      .eport-main svg,.eport-zip svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}
      .eport-zip{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:13px 16px;border-radius:16px;border:1px dashed #d0d5dd;background:transparent;font:inherit;text-align:left;color:#344054;cursor:pointer}
      .eport-zip span{display:grid;gap:2px}
      .eport-zip strong{font-size:13.5px;color:#172033}
      .eport-zip small{font-size:11.5px;color:#667085}
      .eport-zip:disabled{opacity:.6}
      .eport-steps{margin:0;padding-left:18px;font-size:12px;line-height:1.6;color:#475467}
    `;
    document.head.appendChild(style);
  }

  /* entryId: share just one saved pack (from its tile on the unit page). */
  async function openSendToPortfolio(unitName,entryId){
    injectStyles();
    const profileBtn=document.getElementById("profile-btn");if(profileBtn)profileBtn.style.display="none";
    const unitIndex=data().u.findIndex(u=>u[0]===unitName);
    const entries=evidence.filter(e=>e.c===course&&e.u===unitName&&(entryId==null||String(e.id)===String(entryId))).sort((a,b)=>entryTime(a)-entryTime(b));
    const learnerSlug=slug(window.eviaData.learner().name||"");
    const base=(learnerSlug&&learnerSlug!=="Evidence"?learnerSlug+"_":"")+slug(unitName);
    const sent=readJson(SENT_KEY,{})[course+"|"+unitName];
    const goBack=()=>{if(unitIndex>=0)openUnit(unitIndex);else nav("course")};
    $("#page-title").textContent="Send to e-portfolio";
    const back='<button class="secondary" id="eport-back" type="button">‹ '+escHtml(unitName)+'</button>';
    if(!entries.length){
      $("#screen").innerHTML=back+'<div class="eport-page"><div class="card eport-intro"><div class="section-title">SEND TO E-PORTFOLIO</div><h2>'+escHtml(unitName)+'</h2><p>There is no evidence saved for this unit yet. Capture some evidence first, then come back here to send it to your e-portfolio.</p></div>'+(unitIndex>=0?'<button class="primary" id="eport-open-unit" type="button">Open unit</button>':"")+'</div>';
      $("#eport-back").onclick=goBack;
      const openBtn=$("#eport-open-unit");if(openBtn)openBtn.onclick=()=>openUnit(unitIndex);
      return;
    }
    const ksbs=[...new Set(entries.flatMap(e=>e.k||[]))];
    const unitTotal=evidence.filter(e=>e.c===course&&e.u===unitName).length;
    /* One entry opened from its tile: offer every saved entry for the unit in one PDF instead. */
    const allLink=entryId!=null&&unitTotal>1?'<button type="button" class="eport-copy eport-all" id="eport-all">Everything for this unit ('+unitTotal+' pieces)</button>':"";
    const introText=(entryId==null&&entries.length>1?"All "+entries.length+" pieces of evidence for this unit: one PDF (oldest first, each with its date), plus the photos and any recordings.":"This evidence as a PDF, plus the photos and any recordings.")+" Save it as one zip, or share it to Aptem or email. Every file is named so your assessor can see what it is.";
    $("#screen").innerHTML=back+
      '<div class="eport-page">'+
        '<div class="card eport-intro"><div class="section-title">SEND TO E-PORTFOLIO</div><h2>'+escHtml(unitName)+'</h2><p>'+escHtml(introText)+'</p><span class="eport-sent" id="eport-sent">'+(sent?"Last sent "+escHtml(ukDate(sent)):"")+'</span>'+(allLink?'<div>'+allLink+'</div>':"")+'</div>'+
        '<div class="card"><div class="section-title">KSBS COVERED</div><div class="eport-ksbs">'+ksbs.map(k=>'<span>'+escHtml(k)+'</span>').join("")+'</div><button type="button" class="eport-copy" id="eport-copy">Copy KSB codes</button></div>'+
        '<div class="eport-files" id="eport-files"><div class="card eport-pdf"><div class="eport-sheet is-loading" aria-hidden="true"><span></span><span></span><span></span></div><p class="eport-status">Preparing your evidence PDF…</p></div></div>'+
        '<div class="card"><div class="section-title">HOW TO UPLOAD</div><ol class="eport-steps"><li>Tap <strong>Share all</strong> to send everything to email or another app, or <strong>Save .zip</strong> to keep it all in one file.</li><li>In Aptem (or your e-portfolio), add new evidence and upload the zip, or the PDF and any recordings.</li><li>Tag the KSBs listed above.</li></ol></div>'+
      '</div>';
    $("#eport-back").onclick=goBack;
    const allBtn=$("#eport-all");if(allBtn)allBtn.onclick=()=>openSendToPortfolio(unitName);
    $("#eport-copy").onclick=async()=>{
      const text=ksbs.join(", ");
      try{await navigator.clipboard.writeText(text);if(typeof showEvidenceToast==="function")showEvidenceToast("KSB codes copied")}
      catch(_){prompt("Copy these KSB codes:",text)}
    };

    // Prepare the files up front so Share still counts as a direct tap when it is pressed.
    /* Each part is prepared on its own, so one unreadable photo or a PDF problem never blocks the rest. */
    const files=[],problems=[];
    const photosByEntry=[];let expected=0;
    for(const e of entries){
      expected+=Array.isArray(e.photoIds)&&e.photoIds.length?e.photoIds.length:Array.isArray(e.p)?e.p.length:0;
      try{photosByEntry.push(window.eviaGetEvidencePhotoData?await window.eviaGetEvidencePhotoData(e):(e.p||[]))}
      catch(err){console.error("Evia photo read failed",err);photosByEntry.push([])}
    }
    const lastDate=isoDate(entryTime(entries[entries.length-1])||Date.now()),firstDate=isoDate(entryTime(entries[0])||Date.now());
    try{
      const pdf=await buildUnitPdf(unitName,entries,photosByEntry);
      files.push({kind:"pdf",title:"Evidence PDF",pages:pdf.evPages,file:new File([pdf],base+"_evidence_"+(entries.length>1&&firstDate!==lastDate?firstDate+"_to_"+lastDate:lastDate)+".pdf",{type:"application/pdf"})});
    }catch(err){console.error("Evia PDF failed",err);problems.push(/PDF library/.test(err&&err.message)?"The PDF couldn’t be made because part of Evia hasn’t downloaded yet. Open Evia once with signal, then try again.":"The PDF couldn’t be made on this phone ("+escHtml((err&&err.message)||"unknown error")+").")}
    let n=0,unreadable=Math.max(0,expected-photosByEntry.flat().length);
    for(const src of photosByEntry.flat()){
      try{
        const blob=await (await fetch(src)).blob();
        n++;
        const ext=/png/i.test(blob.type)?"png":"jpg";
        files.push({kind:"photo",title:"Photo "+n,src,file:new File([blob],base+"_photo-"+String(n).padStart(2,"0")+"."+ext,{type:blob.type||"image/jpeg"})});
      }catch(err){console.error("Evia photo file failed",err);unreadable++}
    }
    /* Videos and voice notes, as they are (they play anywhere), plus what Evia wrote down from them. */
    let r=0,recMissing=0;
    for(const e of entries)for(const m of (e.media||[])){
      try{
        const blob=window.eviaGetEvidencePhoto?await window.eviaGetEvidencePhoto(m.id):null;if(!blob)throw new Error("missing");
        r++;const mp4=/mp4|m4a|aac/i.test(m.mime||blob.type),ext=m.kind==="video"?(mp4?"mp4":"webm"):(mp4?"m4a":"webm");
        files.push({kind:m.kind,title:(m.kind==="video"?"Video ":"Voice note ")+r,file:new File([blob],base+"_"+(m.kind==="video"?"video":"voice-note")+"-"+String(r).padStart(2,"0")+"."+ext,{type:blob.type||m.mime||"application/octet-stream"})});
      }catch(err){recMissing++}
    }
    const said=entries.flatMap(e=>(e.media||[]).map(m=>String(m.transcript||"").trim()).filter(Boolean));
    if(said.length)files.push({kind:"text",title:"Transcript",file:new File([said.join("\n\n")],base+"_what-was-said.txt",{type:"text/plain"})});
    if(recMissing)problems.push(recMissing+" recording"+(recMissing===1?"":"s")+" couldn’t be read on this phone and "+(recMissing===1?"was":"were")+" left out.");
    if(unreadable)problems.push(unreadable+" photo"+(unreadable===1?"":"s")+" couldn’t be read on this phone and "+(unreadable===1?"was":"were")+" left out. If this evidence came from a backup, restore the backup again from your profile.");
    const list=$("#eport-files");
    if(!files.length){
      if(list)list.innerHTML='<div class="card"><p>Evia couldn’t prepare the files. '+(problems.join(" ")||"Please try again.")+'</p></div>';
      return;
    }
    if(!document.getElementById("eport-files"))return; // learner navigated away
    /* The PDF is the main download, with a preview of its first page; the zip (PDF plus every photo) is there just in case. */
    const pdf=files.find(f=>f.kind==="pdf"),photos=files.filter(f=>f.kind==="photo"),recs=files.filter(f=>f.kind==="video"||f.kind==="audio");
    /* Everything together is the main download: a zip to save, or all the files at once to share (phones won't share a
       zip, but they will share the files themselves). The PDF on its own is still there underneath. */
    const everything=files.map(f=>f.file),shareAll=canShareFiles(everything),shareOk=pdf&&canShareFiles([pdf.file]);
    const parts=[pdf?"the PDF":"",photos.length?photos.length+" photo"+(photos.length===1?"":"s"):"",recs.length?recs.length+" recording"+(recs.length===1?"":"s"):"",said.length?"what was said":""].filter(Boolean);
    const partText=parts.length>1?parts.slice(0,-1).join(", ")+" and "+parts[parts.length-1]:parts[0]||"";
    const first=entries[0]||{},firstPhotos=(photosByEntry[0]||[]).slice(0,4);
    const excerpt=String(first.w||"").trim();
    const preview=pdf?'<button type="button" class="eport-sheet" id="eport-preview" aria-label="Open the full evidence PDF">'+
        '<span class="eport-sheet-kicker">EVIA · EVIDENCE PACK</span>'+
        '<strong class="eport-sheet-title">'+escHtml(unitName)+'</strong>'+
        '<span class="eport-sheet-sub">'+escHtml(window.eviaData.learner().name||"Apprentice")+' · '+entries.length+' evidence entr'+(entries.length===1?"y":"ies")+'</span>'+
        '<span class="eport-sheet-rule"></span>'+
        (firstPhotos.length?'<span class="eport-sheet-photos">'+firstPhotos.map(src=>'<img src="'+src+'" alt="">').join("")+'</span>':"")+
        (excerpt?'<span class="eport-sheet-text">'+escHtml(excerpt.length>150?excerpt.slice(0,150).trim()+"…":excerpt)+'</span>':"")+
        '<span class="eport-sheet-ksbs">'+ksbs.slice(0,8).map(k=>'<i>'+escHtml(k)+'</i>').join("")+(ksbs.length>8?'<i>+'+(ksbs.length-8)+'</i>':"")+'</span>'+
        '<span class="eport-sheet-open">Tap to open the full PDF</span>'+
      '</button>':"";
    $("#eport-files").innerHTML=
      (problems.length?'<div class="card eport-note" role="status"><p>'+problems.join("<br>")+'</p></div>':"")+
      '<div class="card eport-pdf">'+preview+
        '<p class="eport-status"><strong>Everything</strong> · '+escHtml(partText)+' · '+formatBytes(everything.reduce((n,f)=>n+f.size,0))+'</p>'+
        '<div class="eport-main'+(shareAll?"":" single")+'">'+(shareAll?'<button type="button" class="primary" id="eport-share-all">'+icon.share+'Share all</button>':"")+'<button type="button" class="'+(shareAll?"secondary":"primary")+'" id="eport-zip">'+icon.save+'Save .zip</button></div>'+
      '</div>'+
      (pdf?'<button type="button" class="eport-zip" id="eport-pdf-only"><span><strong>Just the PDF</strong><small>'+(pdf.pages?pdf.pages+" page"+(pdf.pages===1?"":"s")+" · ":"")+formatBytes(pdf.file.size)+(recs.length?" · recordings aren’t in a PDF":"")+'</small></span>'+(shareOk?icon.share:icon.save)+'</button>':"");
    if(pdf){
      const pdfUrl=URL.createObjectURL(pdf.file);
      const pv=$("#eport-preview");if(pv)pv.onclick=()=>{const w=window.open(pdfUrl,"_blank");if(!w)saveFile(pdf.file)};
      $("#eport-pdf-only").onclick=async()=>{if(shareOk){if(await shareFiles([pdf.file]))markSent(unitName,entries)}else{saveFile(pdf.file);markSent(unitName,entries)}};
    }
    const sa=$("#eport-share-all");if(sa)sa.onclick=async()=>{if(await shareFiles(everything))markSent(unitName,entries)};
    $("#eport-zip").onclick=async()=>{
      const btn=$("#eport-zip"),was=btn.innerHTML;btn.disabled=true;btn.textContent="Preparing zip…";
      try{
        const zip=await makeStoredZip(files.map(f=>({path:f.file.name,blob:f.file})));
        saveFile(new File([zip],base+"_"+isoDate(Date.now())+".zip",{type:"application/zip"}));markSent(unitName,entries);
      }catch(err){console.error("Evia zip failed",err);alert("Evia couldn't create the zip. Please try again.")}
      finally{btn.disabled=false;btn.innerHTML=was}
    };
  }

  /* ---------- Off-the-job learning log as a proper PDF, with the same preview, Share and Save ---------- */
  async function buildOtjPdf(entries,createdAt){
    const {jsPDF}=await loadJsPdf();
    const doc=new jsPDF({unit:"mm",format:"a4",compress:true});
    const profile=window.eviaData.learner(),learner=profile.name||"Apprentice";
    const W=210,H=297,M=16,CW=W-2*M,BOTTOM=H-M-8,ink=[23,32,51],muted=[102,112,133],accent=accentRgb();
    const total=entries.reduce((n,x)=>n+Number(x.n||0),0);
    let y=M;
    const label=(t,x,yy)=>{doc.setFont("helvetica","bold");doc.setFontSize(7.5);doc.setTextColor(...muted);doc.setCharSpace(.35);doc.text(pdfText(t).toUpperCase(),x,yy);doc.setCharSpace(0)};
    label("Evia · Learning hours",M,y+3);y+=6;
    doc.setFont("helvetica","bold");doc.setFontSize(21);doc.setTextColor(...ink);doc.text(pdfText(learner),M,y+7);y+=11;
    const details=[["Course",data().name],["Standard",data().std],["Entries",String(entries.length)],["Total hours",window.eviaHM(total)]];
    if(profile.start)details.push(["Start date",ukDate(profile.start)]);
    if(profile.end)details.push(["End date",ukDate(profile.end)]);
    details.push(["PDF created",ukDate(createdAt)]);
    doc.setFontSize(9);
    details.forEach((d,i)=>{const x=M+(i%2)*(CW/2),yy=y+Math.floor(i/2)*5.2;doc.setFont("helvetica","bold");doc.setTextColor(...ink);doc.text(pdfText(d[0])+":",x,yy+3.5);const lw=doc.getTextWidth(pdfText(d[0])+": ");doc.setFont("helvetica","normal");doc.setTextColor(71,84,103);doc.text(pdfText(d[1]),x+lw,yy+3.5)});
    y+=Math.ceil(details.length/2)*5.2+3;
    doc.setDrawColor(...accent);doc.setLineWidth(.8);doc.line(M,y,W-M,y);y+=8;
    /* One outlined tile per entry: date and hours on top, what they did underneath. */
    const PAD=4.5,size=10.5,lh=size*.3528*1.45;
    entries.slice().sort((a,b)=>Number(a.createdAt)-Number(b.createdAt)).forEach(x=>{
      doc.setFont("helvetica","normal");doc.setFontSize(size);
      const lines=doc.splitTextToSize(pdfText(x.description||"No description recorded."),CW-PAD*2);
      const h=PAD*2+5+lines.length*lh;
      if(y+Math.min(h,60)>BOTTOM){doc.addPage();y=M}
      let rest=lines.slice(),first=true;
      while(rest.length||first){
        const room=Math.max(1,Math.floor((BOTTOM-y-PAD*2-(first?5:0))/lh)),chunk=rest.splice(0,room),hh=PAD*2+(first?5:0)+chunk.length*lh-1;
        doc.setFillColor(250,251,252);doc.setDrawColor(223,227,233);doc.setLineWidth(.3);doc.roundedRect(M,y,CW,hh,2.5,2.5,"FD");
        let ty=y+PAD;
        if(first){doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(...ink);doc.text(pdfText(ukDate(Number(x.createdAt)||x.savedAt)),M+PAD,ty+3);doc.text(window.eviaHM(x.n),W-M-PAD,ty+3,{align:"right"});ty+=5}
        doc.setFont("helvetica","normal");doc.setFontSize(size);doc.setTextColor(52,64,84);
        chunk.forEach((l,n)=>doc.text(l,M+PAD,ty+lh*.75+n*lh));
        y+=hh+4;first=false;
        if(rest.length){doc.addPage();y=M}
      }
    });
    const pages=doc.getNumberOfPages();
    for(let n=1;n<=pages;n++){
      doc.setPage(n);doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(...muted);
      doc.text(pdfText(learner+" · Learning hours"),M,H-9);
      doc.text("Page "+n+" of "+pages,W-M,H-9,{align:"right"});
      const brand="Created using Evia",bw=doc.getTextWidth(brand),sq=3.4,bx=W/2-(sq+1.6+bw)/2,by=H-9-2.6;
      doc.setFillColor(229,188,2);doc.roundedRect(bx,by,sq,sq,.7,.7,"F");
      doc.setFillColor(255,255,255);doc.ellipse(bx+sq*.2835,by+sq*.49,sq*.111,sq*.168,"F");doc.ellipse(bx+sq*.7165,by+sq*.49,sq*.111,sq*.168,"F");
      doc.setTextColor(...muted);doc.text(brand,bx+sq+1.6,H-9);
    }
    const out=doc.output("blob");out.evPages=pages;return out;
  }
  async function openOtjPdf(entries,createdAt,onReady){
    injectStyles();
    const profileBtn=document.getElementById("profile-btn");if(profileBtn)profileBtn.style.display="none";
    const learner=window.eviaData.learner().name||"Apprentice",total=entries.reduce((n,x)=>n+Number(x.n||0),0);
    const sorted=entries.slice().sort((a,b)=>Number(a.createdAt)-Number(b.createdAt));
    $("#page-title").textContent="Learning hours PDF";
    $("#screen").innerHTML='<button class="secondary" id="eport-back" type="button">‹ Learning logs</button>'+
      '<div class="eport-page"><div class="card eport-intro"><div class="section-title">LEARNING HOURS</div><h2>Your learning hours</h2><p>'+entries.length+' entr'+(entries.length===1?"y":"ies")+' · '+window.eviaHM(total)+'. Upload this PDF to Aptem or your e-portfolio so your hours are counted.</p></div>'+
      '<div class="eport-files" id="eport-files"><div class="card eport-pdf"><div class="eport-sheet is-loading" aria-hidden="true"><span></span><span></span><span></span></div><p class="eport-status">Preparing your learning hours PDF…</p></div></div></div>';
    $("#eport-back").onclick=()=>window.eviaOpenLearningLogs?window.eviaOpenLearningLogs():nav("course");
    let pdf;
    try{const blob=await buildOtjPdf(sorted,createdAt);pdf={pages:blob.evPages,file:new File([blob],slug(learner)+"_OTJ-log_"+isoDate(createdAt)+".pdf",{type:"application/pdf"})}}
    catch(err){console.error("Evia OTJ PDF failed",err);const l=$("#eport-files");if(l)l.innerHTML='<div class="card"><p>'+(/PDF library/.test(err&&err.message)?"The PDF couldn’t be made because part of Evia hasn’t downloaded yet. Open Evia once with signal, then try again.":"Evia couldn’t make the PDF. Please try again.")+'</p></div>';return}
    if(!document.getElementById("eport-files"))return;
    if(onReady)onReady();
    const shareOk=canShareFiles([pdf.file]);
    $("#eport-files").innerHTML='<div class="card eport-pdf">'+
      '<button type="button" class="eport-sheet" id="eport-preview" aria-label="Open the full learning hours PDF">'+
        '<span class="eport-sheet-kicker">EVIA · LEARNING HOURS</span>'+
        '<strong class="eport-sheet-title">'+escHtml(learner)+'</strong>'+
        '<span class="eport-sheet-sub">'+entries.length+' entr'+(entries.length===1?"y":"ies")+' · '+window.eviaHM(total)+'</span>'+
        '<span class="eport-sheet-rule"></span>'+
        sorted.slice(0,3).map(x=>'<span class="eport-sheet-text"><b>'+escHtml(ukDate(Number(x.createdAt)))+' · '+Number(x.n||0).toFixed(2)+' h</b> '+escHtml(String(x.description||"").slice(0,70))+'</span>').join("")+
        '<span class="eport-sheet-open">Tap to open the full PDF</span>'+
      '</button>'+
      '<p class="eport-status"><strong>Learning hours PDF</strong> · '+pdf.pages+' page'+(pdf.pages===1?"":"s")+' · '+formatBytes(pdf.file.size)+'</p>'+
      '<div class="eport-main'+(shareOk?"":" single")+'">'+(shareOk?'<button type="button" class="primary" id="eport-share">'+icon.share+'Share PDF</button>':"")+'<button type="button" class="'+(shareOk?"secondary":"primary")+'" id="eport-save">'+icon.save+'Save PDF</button></div></div>';
    const url=URL.createObjectURL(pdf.file);
    $("#eport-preview").onclick=()=>{const w=window.open(url,"_blank");if(!w)saveFile(pdf.file)};
    const sb=$("#eport-share");if(sb)sb.onclick=()=>shareFiles([pdf.file]);
    $("#eport-save").onclick=()=>saveFile(pdf.file);
  }
  /* ---------- Progress review PDF: two pages you can take in at a glance ----------
     Page 1: where the learner is (status, tiles against where they should be, going well / focus on).
     Page 2: what happens next (last targets, SMART targets, off-the-job plan, personal development,
     comments, employer and tutor boxes, signatures) - the parts a progress review record needs. */
  async function buildReviewPdf(r){
    const {jsPDF}=await loadJsPdf();
    const doc=new jsPDF({unit:"mm",format:"a4",compress:true});
    const s=r.snapshot||{},profile=window.eviaData.learner(),learner=r.learner||profile.name||"Apprentice";
    const W=210,H=297,M=14,CW=W-2*M,BOTTOM=H-18,ink=[23,32,51],muted=[102,112,133],faint=[152,162,179],line=[228,231,236],accent=accentRgb();
    const GREEN=[18,183,106],AMBER=[247,144,9],RED=[217,45,32],GREY=[190,196,206];
    const nvq=!!s.nvq,w=nvq?"criteria":"KSBs",tp=s.timePct;
    const reviewDate=new Date(r.date),next=new Date(reviewDate);next.setMonth(next.getMonth()+3);
    let y=M;
    const T=(t,x,yy,size,style,color,opts)=>{doc.setFont("helvetica",style||"normal");doc.setFontSize(size);doc.setTextColor(...(color||ink));doc.text(pdfText(t),x,yy,opts)};
    const label=(t,x,yy,color)=>{doc.setFont("helvetica","bold");doc.setFontSize(7.2);doc.setTextColor(...(color||muted));doc.setCharSpace(.4);doc.text(pdfText(t).toUpperCase(),x,yy);doc.setCharSpace(0)};
    const box=(x,yy,ww,hh,fill,stroke,r0)=>{if(fill)doc.setFillColor(...fill);if(stroke){doc.setDrawColor(...stroke);doc.setLineWidth(.3)}doc.roundedRect(x,yy,ww,hh,r0==null?3:r0,r0==null?3:r0,fill&&stroke?"FD":fill?"F":"S")};
    const bar=(x,yy,ww,pct,color,h)=>{h=h||1.8;box(x,yy,ww,h,[237,240,244],null,h/2);const f=Math.max(0,Math.min(1,pct/100))*ww;if(f>0.5){doc.setFillColor(...color);doc.roundedRect(x,yy,Math.max(h,f),h,h/2,h/2,"F")}};
    const dot=(x,yy,color)=>{doc.setFillColor(...color);doc.circle(x,yy,1.5,"F")};
    const ring=(cx,cy,rad,pct,color,width)=>{
      doc.setLineCap("round");doc.setLineWidth(width);doc.setDrawColor(237,240,244);doc.circle(cx,cy,rad,"S");
      const end=Math.max(0,Math.min(1,pct/100))*360;if(end<=0)return;
      doc.setDrawColor(...color);let a0=-90;
      for(let a=-90+3;a<=-90+end+0.01;a+=3){const r1=a0*Math.PI/180,r2=Math.min(a,-90+end)*Math.PI/180;doc.line(cx+rad*Math.cos(r1),cy+rad*Math.sin(r1),cx+rad*Math.cos(r2),cy+rad*Math.sin(r2));a0=a}
      doc.setLineCap("butt");
    };
    const status=(ok,ahead,none)=>none?GREY:ok?GREEN:ahead===false?RED:AMBER;
    const wrap=(t,x,yy,ww,size,color,lh,style)=>{doc.setFont("helvetica",style||"normal");doc.setFontSize(size);doc.setTextColor(...(color||ink));const ls=doc.splitTextToSize(pdfText(t),ww);ls.forEach((l,i)=>doc.text(l,x,yy+i*(lh||size*.42)));return ls.length*(lh||size*.42)};

    /* ----- Page 1: header ----- */
    label("Evia · Progress review",M,y+3,accent.map(c=>Math.round(c*.6)));
    T(ukDate(r.date),W-M,y+3,9,"bold",ink,{align:"right"});y+=6;
    T(learner,M,y+8,22,"bold");y+=11;
    T(data().name+"  ·  "+data().std,M,y+4,9.5,"normal",muted);y+=8;
    const meta=[["Period covered",(s.periodFrom?ukDate(s.periodFrom):"Start")+" to "+ukDate(r.date)],["Apprenticeship",(profile.start?ukDate(profile.start):"—")+" to "+(profile.end?ukDate(profile.end):"—")],["Next review due",ukDate(next)]];
    meta.forEach((m,i)=>{const x=M+i*(CW/3);label(m[0],x,y+2);T(m[1],x,y+7,9,"bold")});y+=12;

    /* ----- Status panel ----- */
    const soft=accent.map(c=>Math.round(c+(255-c)*.9));
    box(M,y,CW,44,soft,null,5);
    const verdict=tp==null?null:s.ksbPct>=tp+10?["Ahead of schedule",GREEN]:s.ksbPct>=tp-10?["On track",GREEN]:["Behind schedule",AMBER];
    ring(M+24,y+22,14,s.ksbPct,accent,4.2);
    T(s.ksbPct+"%",M+24,y+23.5,16,"bold",ink,{align:"center"});T("of "+w,M+24,y+28,7.5,"normal",muted,{align:"center"});
    const px=M+48,pw=CW-56;
    T(s.met+" of "+s.total+" "+w+(s.signoff?" signed off":" have evidence"),px,y+9,11,"bold");
    if(tp!=null){T("Course time",px,y+17,8.5,"normal",muted);T(tp+"%",px+pw,y+17,8.5,"bold",ink,{align:"right"});bar(px,y+19,pw,tp,[152,162,179]);
      T("Evidence",px,y+26,8.5,"normal",muted);T(s.ksbPct+"%",px+pw,y+26,8.5,"bold",ink,{align:"right"});bar(px,y+28,pw,s.ksbPct,accent)}
    if(verdict){doc.setFont("helvetica","bold");doc.setFontSize(8.5);const vw=doc.getTextWidth(verdict[0])+8;box(px,y+33,vw,6.5,verdict[1].map(c=>Math.round(c+(255-c)*.82)),null,3.25);T(verdict[0],px+4,y+37.4,8.5,"bold",verdict[1].map(c=>Math.round(c*.55)))}
    if(s.weeksLeft!=null&&s.met<s.total){T("About "+s.weeksLeft+" weeks left",px+pw,y+37.4,8.5,"normal",muted,{align:"right"})}
    y+=50;

    /* ----- At a glance: tiles against where they should be ----- */
    label("At a glance",M,y+2);
    {doc.setFont("helvetica","normal");doc.setFontSize(6.8);let lx=W-M;[["Not started",GREY],["Needs attention",AMBER],["On track",GREEN]].forEach(([t,c])=>{const tw0=doc.getTextWidth(t);lx-=tw0;T(t,lx,y+2,6.8,"normal",muted);lx-=3;doc.setFillColor(...c);doc.circle(lx,y+1.1,1,"F");lx-=5})}
    y+=5;
    const expUnits=tp!=null&&s.unitsTotal?Math.min(s.unitsTotal,Math.ceil(tp/100*s.unitsTotal)):null;
    const tests=s.tests||[],findT=re=>tests.find(t=>re.test(t.name));
    const knowledge=findT(/EPA|Knowledge/),maths=findT(/Maths/),english=findT(/English/);
    /* Staying safe: the EDI and safeguarding lessons in Teach me (reviews saved before that used real-life scenarios). */
    const edi=(s.teach||[]).find(t=>/EDI/.test(t.name));
    const scDone=s.teach?(edi?edi.areasDone:0):(s.scen||[]).reduce((n,t)=>n+t.done,0),scTotal=s.teach?(edi?edi.areas:0):(s.scen||[]).reduce((n,t)=>n+t.total,0);
    const tiles=[
      [(nvq?"Criteria":"KSBs")+" evidenced",s.met+"/"+s.total,tp!=null?"Expected about "+tp+"%":"Add course dates to compare",s.ksbPct,tp==null?null:s.ksbPct>=tp-10,false],
      [nvq?"Site jobs started":"Units started",s.unitsStarted+"/"+s.unitsTotal,expUnits!=null?"Expected about "+expUnits:"",s.unitsTotal?s.unitsStarted/s.unitsTotal*100:0,expUnits==null?null:s.unitsStarted>=expUnits,false],
      ["Learning hours",String(s.otjTotal),s.otjExpected!=null?"Planned about "+s.otjExpected+" by now":s.otjMonth+" this month",s.otjExpected?s.otjTotal/s.otjExpected*100:0,s.otjExpected==null?null:s.otjTotal>=s.otjExpected*.9,false],
      [nvq?"Knowledge test":"EPA practice",knowledge?knowledge.latest+"%":"Not yet","Target 70% or more",knowledge?knowledge.latest:0,knowledge?knowledge.latest>=70:null,!knowledge],
      nvq&&s.nvqQ?["Knowledge questions",s.nvqQ.done+"/"+s.nvqQ.total,"Answered in own words",s.nvqQ.total?s.nvqQ.done/s.nvqQ.total*100:0,tp==null?null:s.nvqQ.done/Math.max(1,s.nvqQ.total)*100>=tp-15,false]:null,
      s.maths||maths?["Maths",maths?maths.latest+"%":"Not yet","Target 70% or more",maths?maths.latest:0,maths?maths.latest>=70:null,!maths]:null,
      s.english||english?["English",english?english.latest+"%":"Not yet","Target 70% or more",english?english.latest:0,english?english.latest>=70:null,!english]:null,
      ["Skills confidence",s.confPct!=null?s.confPct+"%":"Not yet",s.lowSkills&&s.lowSkills.length?s.lowSkills.length+" skill"+(s.lowSkills.length===1?"":"s")+" need training":"Self-rated",s.confPct||0,s.confPct==null?null:s.confPct>=Math.round(40+(tp||0)*.35),s.confPct==null],
      ["Staying safe",scTotal?scDone+"/"+scTotal:"—","Safeguarding, Prevent, values",scTotal?scDone/scTotal*100:0,scTotal?scDone===scTotal||(tp!=null&&tp<25):null,!scDone],
      ["Write-up quality",s.coverage!=null?s.coverage+"%":"—","Key points covered",s.coverage||0,s.coverage==null?null:s.coverage>=70,s.coverage==null]
    ].filter(Boolean);
    if(tiles.length>9)tiles.splice(tiles.findIndex(t=>t[0]==="Write-up quality"),1); /* keep a tidy 3 by 3 grid */
    const cols=3,gap=3,tw=(CW-gap*(cols-1))/cols,th=23;
    tiles.forEach((t,i)=>{
      const x=M+(i%cols)*(tw+gap),yy=y+Math.floor(i/cols)*(th+gap);
      const col=t[5]||t[4]==null?GREY:t[4]?GREEN:AMBER;
      box(x,yy,tw,th,[255,255,255],line,3);
      dot(x+4.5,yy+5.2,col);T(t[0],x+8,yy+6.3,7.6,"bold",muted);
      T(t[1],x+4,yy+14.5,15,"bold",ink);
      T(t[2],x+4,yy+19.4,6.9,"normal",muted);
      bar(x+4,yy+th-2.6,tw-8,t[3],col,1.1);
    });
    y+=Math.ceil(tiles.length/cols)*(th+gap)+4;

    /* ----- Going well / Focus on ----- */
    const good=tiles.filter(t=>t[4]===true).map(t=>t[0]+": "+t[1]);
    const focus=tiles.filter(t=>t[4]===false||(t[5]&&!/Staying|Write/.test(t[0]))).map(t=>t[0]+(t[4]===false?": "+t[1]+" ("+t[2].toLowerCase()+")":": not started"));
    const colW=(CW-gap)/2,listH=Math.max(good.length,focus.length,1)*5.2+11;
    [[good,"Going well",GREEN],[focus,"Focus on next",AMBER]].forEach(([list,title,col],i)=>{
      const x=M+i*(colW+gap);box(x,y,colW,listH,col.map(c=>Math.round(c+(255-c)*.9)),null,3);
      T(title,x+4,y+6.5,9,"bold",col.map(c=>Math.round(c*.55)));
      (list.length?list:["Nothing yet"]).slice(0,6).forEach((l,n)=>{dot(x+5,y+11.7+n*5.2,col);T(l,x+8,y+12.7+n*5.2,7.8,"normal",ink)});
    });
    y+=listH+4;
    if(s.missed&&s.missed.length){label("Worth revising",M,y+2);T(s.missed.slice(0,8).join("  ·  "),M,y+7,8,"normal",ink);y+=10}
    /* Readiness to finish: what has to be in place before gateway (standards) or completion (NVQ). */
    {const checks=nvq?[
        ["All criteria evidenced",s.met>=s.total],
        ["Knowledge questions answered",s.nvqQ?s.nvqQ.done>=s.nvqQ.total:false],
        ["Learning hours on plan",s.otjExpected!=null&&s.otjTotal>=s.otjExpected*.9],
        ["Witness testimony added","na"],
        [s.teach?"EDI and safeguarding lessons done":"Staying safe scenarios done",scTotal>0&&scDone===scTotal]
      ]:[
        ["All KSBs evidenced",s.met>=s.total],
        ["Practice test 70%+",!!knowledge&&knowledge.latest>=70],
        ["Learning hours on plan",s.otjExpected!=null&&s.otjTotal>=s.otjExpected*.9],
        ["English and maths",(!s.maths||!!maths&&maths.latest>=70)&&(!s.english||!!english&&english.latest>=70)],
        [s.teach?"EDI and safeguarding lessons done":"Staying safe scenarios done",scTotal>0&&scDone===scTotal]
      ];
     if(y+26<BOTTOM){
       label(nvq?"Ready to complete?":"Ready for gateway?",M,y+2);T(checks.filter(c=>c[1]===true).length+" of "+checks.filter(c=>c[1]!=="na").length+" in place",W-M,y+2,7.4,"bold",muted,{align:"right"});y+=5;
       const cw5=(CW-gap*(checks.length-1))/checks.length;
       checks.forEach(([t,ok],i)=>{const x=M+i*(cw5+gap);const na=ok==="na",col=na?GREY:ok?GREEN:[208,213,221];
         box(x,y,cw5,15,ok===true?[236,253,243]:[250,251,252],line,2.5);
         doc.setFillColor(...col);doc.circle(x+cw5/2,y+4.8,2.3,"F");if(ok===true){doc.setDrawColor(255,255,255);doc.setLineWidth(.5);doc.line(x+cw5/2-1.1,y+4.9,x+cw5/2-.2,y+5.8);doc.line(x+cw5/2-.2,y+5.8,x+cw5/2+1.3,y+3.9)}
         doc.setFont("helvetica","bold");doc.setFontSize(6.6);const ls=doc.splitTextToSize(pdfText(na?t+" (tutor to check)":t),cw5-4);ls.slice(0,2).forEach((l,n)=>T(l,x+cw5/2,y+10+n*2.8,6.6,"bold",ok===true?[5,96,58]:muted,{align:"center"}))});
       y+=19}}

    /* ----- Page 2 ----- */
    doc.addPage();y=M;
    const section=(title,h)=>{if(y+h>BOTTOM){doc.addPage();y=M}label(title,M,y+3);y+=6};
    // Last targets
    const pt=s.prevTargetList||[];
    if(pt.length){
      section("Targets from last review · "+pt.filter(t=>t.done).length+" of "+pt.length+" achieved",8+Math.ceil(pt.length/2)*6.5);
      const hw=(CW-gap)/2;
      pt.forEach((t,i)=>{const x=M+(i%2)*(hw+gap),yy=y+Math.floor(i/2)*6.5;box(x,yy,hw,5.6,t.done?[236,253,243]:[255,250,235],null,2.2);dot(x+3.5,yy+2.8,t.done?GREEN:AMBER);
        doc.setFont("helvetica","normal");doc.setFontSize(7.6);const tl=doc.splitTextToSize(pdfText(t.title),hw-26)[0];T(tl,x+7,yy+3.9,7.6,"normal",ink);T(t.done?"Achieved":"Not yet",x+hw-3,yy+3.9,7.2,"bold",t.done?[5,96,58]:[181,71,8],{align:"right"})});
      y+=Math.ceil(pt.length/2)*6.5+3;
    }
    // New targets
    const tg=r.targets||[];
    section("New targets · agreed "+ukDate(r.date),8+tg.length*12);
    tg.forEach((t,i)=>{
      doc.setFont("helvetica","normal");doc.setFontSize(7.8);const why=doc.splitTextToSize(pdfText(t.why||t.reason||""),CW-44);const h=7+why.length*3.3;
      box(M,y,CW,h,[255,255,255],line,2.5);
      doc.setFillColor(...accent);doc.circle(M+5,y+4.6,2.6,"F");T(String(i+1),M+5,y+5.6,8,"bold",[255,255,255],{align:"center"});
      T(t.title,M+10,y+5,9,"bold");T("By "+ukDate((t.due||t.deadline)+"T12:00:00"),W-M-4,y+5,8,"bold",accent.map(c=>Math.round(c*.6)),{align:"right"});
      T(why,M+10,y+9,7.8,"normal",muted);y+=h+2;
    });
    y+=2;
    // Off-the-job plan
    section("Learning hours",22);
    {const exp=s.otjExpected,got=s.otjTotal,short=exp!=null?Math.max(0,Math.round((exp-got)*10)/10):null;
     const endMs=Date.parse(profile.end||""),weeks=isNaN(endMs)?null:Math.max(1,Math.round((endMs-Date.now())/(7*864e5)));
     box(M,y,CW,16,[250,251,252],line,3);
     T("Logged "+got+" hrs"+(exp!=null?" · planned about "+exp+" hrs by now":""),M+4,y+6,9,"bold");
     const plan=short==null?"Add course dates in Evia to track this against the plan.":short<=0?"On plan. Keep logging training, toolbox talks and research each week.":"About "+short+" hrs behind plan. Re-plan with your employer and tutor: spread over the "+(weeks||"remaining")+" weeks left, that's about "+(weeks?Math.round((6+short/weeks)*10)/10:"a few more")+" hrs a week instead of 6.";
     T(plan,M+4,y+11.8,8.2,"normal",short>0?[181,71,8]:muted);y+=20}
    // Personal development
    section("Personal development and staying safe",24);
    {const topics=s.teach?s.teach.map(t=>({title:t.name,done:t.areasDone,total:t.areas})):s.scen||[],cw=(CW-gap*3)/4;
     topics.slice(0,4).forEach((t,i)=>{const x=M+i*(cw+gap),done=t.done===t.total;box(x,y,cw,11,done?[236,253,243]:[250,251,252],line,2.5);T(t.title,x+3,y+4.6,7.4,"bold",ink);T(t.done+" of "+t.total+(done?" ✓":""),x+3,y+8.8,7.4,"normal",done?[5,96,58]:muted)});
     y+=13;
     T("Safeguarding lead saved in Evia: "+(s.dsl?"Yes":"Not yet")+"   ·   Latest skills self-rating: "+(s.confPct!=null?s.confPct+"%":"not done"),M,y+3,7.8,"normal",muted);y+=7}
    // Apprentice comments
    const c=r.reflection||{};
    const comments=[["How the apprenticeship is going",c.learnerFeedback],["Extra help with learning",c.support],["Next steps and career plans",c.nextSteps]].filter((x,i)=>i<1||x[1]);
    section("Apprentice's comments",30);
    comments.forEach(([q,a])=>{doc.setFont("helvetica","normal");doc.setFontSize(8.2);const ls=doc.splitTextToSize(pdfText(a||"No comment."),CW-8);const h=6.5+ls.length*3.6;if(y+h>BOTTOM){doc.addPage();y=M}
      box(M,y,CW,h,[255,255,255],line,2.5);T(q,M+4,y+4.3,7.4,"bold",muted);ls.forEach((l,n)=>T(l,M+4,y+8.3+n*3.6,8.2,"normal",a?ink:faint));y+=h+2});
    y+=2;
    // Employer and tutor
    section("Employer and training provider comments",26);
    {const hw=(CW-gap)/2;[["Employer","Progress at work, support, learning hours"],["Tutor / assessor","Progress, English and maths, "+(nvq?"completion":"gateway")]].forEach(([q,sub],i)=>{const x=M+i*(hw+gap);box(x,y,hw,24,[255,255,255],line,2.5);T(q,x+4,y+4.5,7.6,"bold",ink);T(sub,x+4,y+8,6.6,"normal",faint);doc.setDrawColor(...line);doc.setLineWidth(.2);[14,19].forEach(o=>doc.line(x+4,y+o,x+hw-4,y+o))});y+=27}
    // Signatures
    section("Signed and agreed by all three",31);
    {const sw=(CW-gap*2)/3,so=r.signoff||{};
     [["Apprentice",learner,window.eviaData.files.signature()||r.signature,r.date],["Employer",(so.employer||{}).name,(so.employer||{}).sig,(so.employer||{}).date],["Training provider",(so.provider||{}).name,(so.provider||{}).sig,(so.provider||{}).date]].forEach(([role,name,sig,date],i)=>{const x=M+i*(sw+gap);box(x,y,sw,28,[255,255,255],line,2.5);T(role,x+3,y+4.6,7.4,"bold",muted);
       if(sig){try{doc.addImage(sig,"PNG",x+3,y+6,sw-6,9,undefined,"FAST")}catch(_){}}
       doc.setDrawColor(...line);doc.line(x+3,y+16.5,x+sw-3,y+16.5);
       T("Name: "+(name||""),x+3,y+21,7.4,"normal",name?ink:faint);T("Date: "+((sig||i===0)&&date?ukDate(date):""),x+3,y+25.5,7.4,"normal",sig||i===0?ink:faint)});
     y+=32}

    const pages=doc.getNumberOfPages();
    for(let n=1;n<=pages;n++){
      doc.setPage(n);doc.setFont("helvetica","normal");doc.setFontSize(7.2);doc.setTextColor(...muted);
      doc.text(pdfText(learner+" · Progress review · "+ukDate(r.date)),M,H-8);doc.text("Page "+n+" of "+pages,W-M,H-8,{align:"right"});
      const brand="Created using Evia",bw=doc.getTextWidth(brand),sq=3.2,bx=W/2-(sq+1.6+bw)/2,by=H-8-2.5;
      doc.setFillColor(229,188,2);doc.roundedRect(bx,by,sq,sq,.7,.7,"F");doc.setFillColor(255,255,255);doc.ellipse(bx+sq*.2835,by+sq*.49,sq*.111,sq*.168,"F");doc.ellipse(bx+sq*.7165,by+sq*.49,sq*.111,sq*.168,"F");
      doc.setTextColor(...muted);doc.text(brand,bx+sq+1.6,H-8);
    }
    const out=doc.output("blob");out.evPages=pages;return out;
  }
  async function openReviewPdf(r){
    injectStyles();
    const root=document.getElementById("modal-root");
    const learner=r.learner||window.eviaData.learner().name||"Apprentice";
    root.innerHTML='<div class="overlay"><section class="sheet pr-sheet" role="dialog" aria-modal="true"><div class="sheet-head"><div><div class="chat-kicker">PROGRESS REVIEW · '+escHtml(ukDate(r.date).toUpperCase())+'</div><h2>Review PDF</h2></div><button class="close" id="rvp-close" type="button" aria-label="Close">×</button></div>'+
      '<div class="eport-files" id="rvp-files"><div class="card eport-pdf"><div class="eport-sheet is-loading" aria-hidden="true"><span></span><span></span><span></span></div><p class="eport-status">Preparing your review PDF…</p></div></div>'+
      '<p class="pg-note">Two pages: where you are, then your targets and signatures. Share it with your employer and tutor so all three of you can sign it.</p></section></div>';
    root.querySelector("#rvp-close").onclick=()=>{root.innerHTML=""};
    let file;
    try{const blob=await buildReviewPdf(r);file=new File([blob],slug(learner)+"_progress-review_"+isoDate(r.date)+".pdf",{type:"application/pdf"});file.evPages=blob.evPages}
    catch(err){console.error("Evia review PDF failed",err);const l=document.getElementById("rvp-files");if(l)l.innerHTML='<div class="card"><p>Evia couldn’t make the PDF. Please try again.</p></div>';return}
    const list=document.getElementById("rvp-files");if(!list)return;
    const shareOk=canShareFiles([file]),s=r.snapshot||{};
    list.innerHTML='<div class="card eport-pdf"><button type="button" class="eport-sheet" id="rvp-preview" aria-label="Open the review PDF">'+
      '<span class="eport-sheet-kicker">EVIA · PROGRESS REVIEW</span><strong class="eport-sheet-title">'+escHtml(learner)+'</strong>'+
      '<span class="eport-sheet-sub">'+escHtml(ukDate(r.date))+' · '+(s.ksbPct!=null?s.ksbPct+'% '+(s.nvq?"criteria":"KSBs"):"")+(s.timePct!=null?' · '+s.timePct+'% through':"")+'</span><span class="eport-sheet-rule"></span>'+
      (r.targets||[]).slice(0,3).map((t,i)=>'<span class="eport-sheet-text"><b>'+(i+1)+'.</b> '+escHtml(t.title)+'</span>').join("")+
      '<span class="eport-sheet-open">Tap to open the full PDF</span></button>'+
      '<p class="eport-status"><strong>Review PDF</strong> · '+file.evPages+' pages · '+formatBytes(file.size)+'</p>'+
      '<div class="eport-main'+(shareOk?"":" single")+'">'+(shareOk?'<button type="button" class="primary" id="rvp-share">'+icon.share+'Share PDF</button>':"")+'<button type="button" class="'+(shareOk?"secondary":"primary")+'" id="rvp-save">'+icon.save+'Save PDF</button></div></div>';
    const url=URL.createObjectURL(file);
    document.getElementById("rvp-preview").onclick=()=>{const w=window.open(url,"_blank");if(!w)saveFile(file)};
    const sb=document.getElementById("rvp-share");if(sb)sb.onclick=()=>shareFiles([file]);
    document.getElementById("rvp-save").onclick=()=>saveFile(file);
  }
  window.eviaBuildReviewPdf=buildReviewPdf;
  window.eviaLoadJsPdf=loadJsPdf;
  window.eviaPdfText=pdfText;
  window.eviaOpenReviewPdf=openReviewPdf;
  window.eviaOpenOtjPdf=openOtjPdf;
  window.eviaOpenSendToPortfolio=openSendToPortfolio;
})();
