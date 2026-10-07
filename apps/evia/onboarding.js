/* Evia7 first run, guided like a Teach me lesson, on the real screens.
   1. Connect to your college: scan the assessor's pairing QR (or type its code, or open the invite link). Nisia sends
      the learner's details and course; they check it's them (nisia.js). No code yet: pick the course, connect later.
   2. A short welcome lesson from Evia, with one quick question.
   3. The PPE induction, on a real evidence page with the real "Let Evia guide you": photos, two questions, a statement.
      It's saved to Supporting evidence as a PDF, linked to the KSBs it shows, and Evia shows where it went.
   4. "Tap this" steps round the app, what Evia means ringed (the rest can't be tapped), ending with the signature on the profile.
   Where the learner got to is kept (evia7-onboarding), so closing the app carries on from the same step. */
(function(){
  const KEY="evia7-onboarding",IND_KEY="evia7-induction";
  const nvqOn=()=>!!(window.eviaNvq&&window.eviaNvq.on());
  const ppeCodes=()=>nvqOn()?["102.1.2","102.1.4"]:["K2","S2"]; /* NVQ: using H&S control equipment, and why and when to use it */
  const COURSES=[
    {key:"bricklayer",label:"Bricklayer",sub:"Brickwork and blockwork",
      ic:'<svg viewBox="0 0 24 24"><rect x="3" y="13.5" width="8" height="5.5" rx="1"/><rect x="13" y="13.5" width="8" height="5.5" rx="1"/><rect x="8" y="6.5" width="8" height="5.5" rx="1"/></svg>'},
    {key:"site",label:"Site Carpenter",sub:"Carpentry on site",
      ic:'<svg viewBox="0 0 24 24"><path d="M2.5 12 12 4l9.5 8"/><path d="M5.5 10v9.5h13V10"/><path d="M12 4v15.5M5.5 14.5 12 9l6.5 5.5"/></svg>'},
    {key:"joiner",label:"Bench Joiner",sub:"Joinery in the workshop",
      ic:'<svg viewBox="0 0 24 24"><path d="M3.5 15.5h17v3.5h-17z"/><path d="M6 15.5l2-5h8l2 5"/><path d="M13 10.5c0-2.5 1.5-4.5 4-5"/></svg>'},
    {key:"trowel3",label:"Trowel Occupations L3",sub:"NVQ Level 3 Diploma · City & Guilds",
      ic:'<svg viewBox="0 0 24 24"><path d="M11 13 4 20"/><path d="M11 13l3-9 7 7-9 3z"/></svg>'}
  ];
  const escHtml=s=>String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
  const readState=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"null")}catch(_){return null}};
  const writeState=stage=>{try{localStorage.setItem(KEY,JSON.stringify({stage,updatedAt:new Date().toISOString()}))}catch(_){}};
  const firstName=()=>String(window.eviaData.learner().name||"").trim().split(/\s+/)[0]||"";
  const courseName=()=>{try{return C[course].name}catch(_){return ""}};

  function injectStyles(){
    if(document.getElementById("evia-onboarding-styles"))return;
    const style=document.createElement("style");
    style.id="evia-onboarding-styles";
    style.textContent=`
      #evia-onboard-course{position:fixed;inset:0;z-index:10040;background:var(--bg,#fffdfa);display:flex;align-items:center;justify-content:center;padding:32px 20px;opacity:0;transition:opacity .4s ease;overflow:auto}
      #evia-onboard-course.visible{opacity:1}
      #evia-onboard-course.leaving{opacity:0}
      .evia-onboard-inner{max-width:420px;width:100%;text-align:center}
      .evia-onboard-kicker{font-size:11px;letter-spacing:.16em;color:#9aa3af;font-weight:800;margin-bottom:8px}
      .evia-onboard-inner h2{font-size:26px;margin:0 0 8px;letter-spacing:-.03em;color:#172033}
      .evia-onboard-inner p{font-size:14px;color:#7b8797;margin:0 0 24px;line-height:1.5}
      .evia-onboard-courses{display:grid;gap:12px;text-align:left}
      .evia-onboard-course{display:flex;align-items:center;gap:14px;width:100%;padding:14px 16px;border-radius:20px;border:1px solid rgba(16,24,40,.08);background:#fff;cursor:pointer;box-shadow:0 1px 2px rgba(16,24,40,.04),0 6px 20px rgba(16,24,40,.05);color:#172033;font:inherit;transition:transform .12s ease,border-color .15s ease}
      .evia-onboard-course:active{transform:scale(.98)}
      .evia-onboard-course:hover,.evia-onboard-course:focus-visible{border-color:var(--yellow)}
      .evia-onboard-course-dot{width:46px;height:46px;flex:0 0 46px;border-radius:14px;display:grid;place-items:center;background:var(--soft);color:var(--yellow-ink)}
      .evia-onboard-course-dot svg{width:27px;height:27px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
      .evia-onboard-course-copy{flex:1;min-width:0;display:grid;gap:3px;text-align:left}
      .evia-onboard-course-copy strong{font-size:16.5px}
      .evia-onboard-course-copy small{font-size:12.5px;color:#7b8797}
      .evia-onboard-course-arrow{font-size:24px;color:#98a2b3}
      /* The very first screen: a welcome from Evia, then the course cards. */
      #evia-onboard-course.welcome{display:block;padding:0;background:#fffdfa}
      .ew-hero{position:relative;overflow:hidden;padding:max(40px,calc(env(safe-area-inset-top) + 26px)) 22px 56px;text-align:center;color:#172033;background:radial-gradient(120% 85% at 50% 0%,color-mix(in srgb,var(--yellow) 13%,#fffdfa) 0%,#fffdfa 72%)}
      .ew-hero::before{content:"";position:absolute;inset:0;opacity:.05;background-image:linear-gradient(#172033 1px,transparent 1px),linear-gradient(90deg,#172033 1px,transparent 1px);background-size:48px 20px;mask-image:linear-gradient(#000,transparent 75%);-webkit-mask-image:linear-gradient(#000,transparent 75%)}
      .ew-hero::after{content:"";position:absolute;left:50%;top:30px;width:240px;height:240px;margin-left:-120px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--yellow) 22%,transparent),transparent 68%);pointer-events:none}
      .ew-evia-wrap{position:relative;z-index:1;display:inline-block;animation:ewFloat 3.6s ease-in-out infinite}
      html body .ew-evia{width:100px;height:100px;border-width:6px;background:#fffdfa;box-shadow:0 12px 30px rgba(16,24,40,.12)}
      html body .ew-evia .evia-face{gap:12px}
      html body .ew-evia .evia-face i{width:18px!important;height:24px!important;border-width:4.5px!important;animation:ewBlink 4.2s infinite}
      .ew-say{position:relative;z-index:1;display:inline-block;margin:16px auto 0;padding:9px 16px;border-radius:16px;background:#fff;color:#172033;font-size:14.5px;font-weight:700;border:1px solid rgba(16,24,40,.07);box-shadow:0 6px 18px rgba(16,24,40,.07)}
      .ew-say::before{content:"";position:absolute;left:50%;top:-6px;width:12px;height:12px;margin-left:-6px;background:#fff;transform:rotate(45deg);border-left:1px solid rgba(16,24,40,.07);border-top:1px solid rgba(16,24,40,.07);border-radius:2px 0 0 0}
      .ew-pick{position:relative;z-index:2;max-width:440px;margin:-18px auto 0;padding:8px 18px calc(28px + env(safe-area-inset-bottom));background:transparent;text-align:left}
      .ew-pick h2{margin:0 4px 4px;font-size:22px;letter-spacing:-.02em;color:#172033}
      .ew-pick>p{margin:0 4px 16px;font-size:13.5px;color:#7b8797;line-height:1.45}
      .ew-in{opacity:0;transform:translateY(14px);animation:ewIn .55s cubic-bezier(.2,.8,.3,1) forwards;animation-delay:calc(var(--d,0) * 90ms + 150ms)}
      @keyframes ewIn{to{opacity:1;transform:none}}
      @keyframes ewFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
      @keyframes ewWave{0%,100%{transform:rotate(0)}20%,60%{transform:rotate(18deg)}40%,80%{transform:rotate(-10deg)}}
      @keyframes ewBlink{0%,46%,50%,100%{transform:scaleY(1)}48%{transform:scaleY(.1)}}
      @media (prefers-reduced-motion:reduce){.ew-evia-wrap,.ew-wave,html body .ew-evia .evia-face i{animation:none}.ew-in{animation:none;opacity:1;transform:none}}


      body.evia-onboarding .bottom-nav,body.evia-onboarding .evia-fab,body.evia-onboarding #profile-btn{pointer-events:none}
      body.evia-onboarding .bottom-nav{opacity:.55}
      body.evia-onboarding #screen{padding-bottom:230px}
      /* The thing to tap stays tappable, and stands out. */
      body.evia-onboarding .evia-guide-target{pointer-events:auto;opacity:1}
      .evia-guide-target{scroll-margin-top:90px;outline:3px solid var(--yellow)!important;outline-offset:4px;border-radius:14px;animation:eviaGuidePulse 1.6s ease-in-out infinite}
      @keyframes eviaGuidePulse{0%,100%{outline-offset:3px}50%{outline-offset:7px}}
      body.evia-onboarding .bottom-nav:has(.evia-guide-target){opacity:1}
      /* During the tour only what Evia asks for can be used: the thing she's pointing at (if she says tap it), her notes,
         and the date wheel she opens. Pointed-at things with a Next button are only looked at. */
      body.ob-lock #app,body.ob-lock #modal-root,body.ob-lock .bottom-nav,body.ob-lock .evia-fab,body.ob-lock #profile-btn{pointer-events:none}
      body.ob-lock .evia-guide-target,body.ob-lock .evia-guide-target *,body.ob-lock .dw-overlay,body.ob-lock .dw-overlay *{pointer-events:auto}
      body.ob-lock .evia-guide-target.ob-look,body.ob-lock .evia-guide-target.ob-look *{pointer-events:none}
      body.ob-lock .profile-sheet{overflow:hidden}
      .profile-sheet.ob-profile .evia-guide-target{scroll-margin-top:24px}
      /* Save sits at the end of the profile during the tour, so it isn't under Evia; she scrolls to it last. */
      .profile-sheet.ob-profile .pf-save{position:static;margin-top:16px}
      .profile-sheet.ob-profile{padding-bottom:45vh}
      #ob-spot i,#ob-spot b{position:fixed;z-index:10010;display:block}
      /* The rest of the page stays as it is (clear, not blurred), just not tappable; what Evia is talking about gets a ring. */
      #ob-spot i{background:transparent}
      #ob-spot u{position:fixed;z-index:10011;display:block;pointer-events:none;border:3px solid var(--evia-accent,var(--yellow));border-radius:16px;box-shadow:0 0 0 6px rgba(231,185,0,.22),0 10px 28px rgba(16,24,40,.14);animation:obRing 1.6s ease-in-out infinite;transition:left .2s ease,top .2s ease,width .2s ease,height .2s ease}
      #ob-spot.none u{display:none}
      @keyframes obRing{0%,100%{box-shadow:0 0 0 5px rgba(231,185,0,.18),0 10px 28px rgba(16,24,40,.14)}50%{box-shadow:0 0 0 11px rgba(231,185,0,.10),0 10px 28px rgba(16,24,40,.14)}}
      @media(prefers-reduced-motion:reduce){#ob-spot u{animation:none;transition:none}}
      body.ob-lock .evia-guide-target{outline:none!important;animation:none!important}
      #ob-spot b{background:transparent}
      #ob-spot.none i{background:transparent}
      #ob-spot.none i:first-child{inset:0!important;width:auto!important;height:auto!important}
      /* Evia's button stays in view, above the spotlight, for her speech bubble. */
      body.ob-lock .evia-fab{z-index:10020!important;opacity:1!important;translate:none!important}
      body.evia-onboarding .bottom-nav:has(.evia-guide-target) button:not(.evia-guide-target){opacity:.45}

      /* Teach me style screens (the welcome and the PPE unit) */
      .ob-lesson{z-index:10035}
      .ob-skip{margin-left:auto;border:0;background:none;min-height:36px;padding:6px 4px;font:inherit;font-size:13px;font-weight:700;color:var(--ui-muted,#667085);cursor:pointer}
      .ob-lesson .tm-bar strong+.ob-skip{margin-left:0}
      .ob-body{display:flex;flex-direction:column;gap:14px;max-width:520px;margin:0 auto}
      .ob-body .tm-hero{padding-top:28px}
      .ob-body .tm-says p{font-size:16px}

      /* Joining a college */
      .ob-field{display:grid;gap:6px;font-size:13px;font-weight:700;color:var(--ui-muted,#667085)}
      .ob-field input{width:100%;box-sizing:border-box;min-height:52px;padding:12px 15px;border:1px solid #dfe4ea;border-radius:16px;background:#fff;font:inherit;font-size:17px;font-weight:600;color:var(--ui-ink,#172033)}
      .ob-field input:focus{outline:none;border-color:var(--yellow);box-shadow:0 0 0 3px color-mix(in srgb,var(--yellow) 25%,transparent)}
      .ob-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important;letter-spacing:.14em;text-transform:uppercase;text-align:center}
      .ob-err{margin:-4px 2px 0;font-size:13.5px;font-weight:600;color:#b42318}
      .ob-err:empty{display:none}
      .ob-scan-btn{width:100%}
      .ob-link{align-self:center;border:0;background:none;padding:10px;font:inherit;font-size:14px;font-weight:700;color:var(--ui-muted,#667085);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
      .ew-pick .ob-link{display:block;margin:14px auto 0}
      .ob-share{display:grid;gap:8px;padding:14px;border-radius:18px;background:#fff;border:1px solid var(--pm-hair,rgba(16,24,40,.08))}
      .ob-share h3{margin:0 0 2px;font-size:13px;letter-spacing:.02em;color:var(--ui-muted,#667085)}
      .ob-yes,.ob-no{display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.4;color:var(--ui-ink,#172033)}
      .ob-yes svg,.ob-no svg{flex:0 0 20px;width:20px;height:20px;margin-top:1px;fill:none;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
      .ob-yes svg{stroke:#079455}.ob-no svg{stroke:#d92d20}
      .ob-small{margin:0 2px;font-size:13px;color:var(--ui-muted,#667085)}
      .ob-me{gap:0;padding:6px 16px}
      .ob-me-name{padding:12px 0 8px;font-size:19px;letter-spacing:-.01em;color:var(--ui-ink,#172033)}
      .ob-me-row{display:flex;justify-content:space-between;gap:14px;padding:10px 0;border-top:1px solid var(--pm-hair,rgba(16,24,40,.08));font-size:14.5px}
      .ob-me-row span{color:var(--ui-muted,#667085)}
      .ob-me-row b{text-align:right;color:var(--ui-ink,#172033);font-weight:700}
      #ob-lesson .tm-foot .tm-fb{margin:0 -18px 10px}
      #ob-lesson .tm-fb-ic svg{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round}
      #ob-scan-view{position:fixed;inset:0;z-index:10120;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:14px;padding:0 20px max(24px,env(safe-area-inset-bottom));color:#fff;text-align:center}
      #ob-scan-view video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
      #ob-scan-view .ob-scan-frame{position:absolute;left:50%;top:42%;width:min(64vw,260px);aspect-ratio:1;transform:translate(-50%,-50%);border:3px solid var(--yellow);border-radius:24px;box-shadow:0 0 0 100vmax rgba(0,0,0,.45)}
      #ob-scan-view p,#ob-scan-view button{position:relative;margin:0;font-size:15px;font-weight:700}
      #ob-scan-view button{min-width:160px}
      /* The tour speaks through Evia's normal bubble; it sits above the spotlight, with the tour's progress along the top. */
      html body .ui-evia-bubble.ob-card{z-index:10030}
      .ob-card-top{display:flex;align-items:center;gap:10px;margin:-2px 0 10px}
      .ob-card-top .tm-prog{height:8px}
      .ob-card-top .ob-skip{min-height:30px;padding:2px 0}
      body.evia-keyboard-editing .ob-card{opacity:0;pointer-events:none}
      @media(prefers-reduced-motion:reduce){.evia-guide-target{animation:none}.ob-card{transition:none}}
    `;
    document.head.appendChild(style);
  }

  const compressPhoto=file=>new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{
      const max=1280,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
      const c=document.createElement("canvas");c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));
      c.getContext("2d",{alpha:false}).drawImage(img,0,0,c.width,c.height);
      URL.revokeObjectURL(url);
      c.toBlob(blob=>blob?resolve(blob):reject(new Error("Photo compression failed")),"image/jpeg",.78);
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Photo could not be read"))};
    img.src=url;
  });
  function ppeKsbs(){const c=ppeCodes();return allK().filter(x=>c.includes(x[0]))}

  /* ---------- Screens in the Teach me style ----------
     A bar (progress or a title) with Skip, the content, and the buttons at the bottom. */
  const EVIA_BIG='<span class="tm-evia evia-mini xl" aria-hidden="true"><span class="evia-face"><i></i><i></i></span></span>';
  const EVIA_SM='<span class="tm-evia evia-mini sm" aria-hidden="true"><span class="evia-face"><i></i><i></i></span></span>';
  function lessonScreen(o){
    injectStyles();document.body.classList.add("evia-onboarding");
    let root=document.getElementById("ob-lesson");
    if(!root){root=document.createElement("div");root.id="ob-lesson";root.className="tm ob-lesson";root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");document.body.appendChild(root)}
    root.innerHTML='<header class="tm-bar tm-lbar">'+(o.prog!=null?'<span class="tm-prog" aria-hidden="true"><i style="width:'+o.prog+'%"></i></span>':'<strong>'+escHtml(o.title||"")+'</strong>')+
        (o.noSkip?'':'<button type="button" class="ob-skip" id="ob-skip">Skip</button>')+'</header>'+
      '<div class="tm-scroll"><div class="ob-body">'+o.body+'</div></div>'+
      '<footer class="tm-foot"><div class="tm-fb" hidden></div><div class="tm-row">'+o.buttons.map((b,i)=>'<button type="button" class="'+(b.primary?"primary":"secondary")+' tm-go" data-ob="'+i+'"'+(b.disabled?" disabled":"")+'>'+escHtml(b.label)+'</button>').join("")+'</div></footer>';
    root.querySelectorAll("[data-ob]").forEach(el=>el.onclick=()=>{if(!el.disabled)o.buttons[+el.dataset.ob].run()});
    const sk=root.querySelector("#ob-skip");if(sk)sk.onclick=skipDemo;
    root.querySelector(".tm-scroll").scrollTop=0;
    return root;
  }
  const closeLesson=()=>{const r=document.getElementById("ob-lesson");if(r)r.remove()};
  const tick='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',cross='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';

  /* ---------- 1. Connect to your college ----------
     The learner's assessor shows a pairing QR (or sends an invite link); the code under the QR can be typed instead.
     Nisia sends back who they are and their course, so they only check it's them. Everything they then add to Evia
     goes to their college (nisia.js). No code yet: pick the course, and connect later from the profile. */
  let later=false;   /* connecting from the profile, after the first run */
  const canScan=()=>"BarcodeDetector" in window&&!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
  function showJoin(code,err){
    if(!later)writeState("join");
    const scan=canScan();
    const el=lessonScreen({title:"Connect to your college",noSkip:true,
      body:'<div class="tm-says">'+EVIA_SM+'<p>Hi, I’m Evia. Your assessor will show you a <strong>QR code</strong>. '+(scan?"Scan it, or type":"Type")+' the code underneath it.</p></div>'+
        (scan?'<button type="button" class="primary ob-scan-btn" id="ob-scan">Scan the QR code</button>':'')+
        '<label class="ob-field"><span>'+(scan?"Or type the code":"The code under the QR")+'</span><input id="ob-code" class="ob-code" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12" value="'+escHtml(code||"")+'" placeholder="ABC-1234"></label>'+
        '<p class="ob-err" id="ob-err" role="alert">'+escHtml(err||"")+'</p>'+
        (later?'':'<button type="button" class="ob-link" id="ob-nocode">No code yet? Pick your course</button>'),
      buttons:(later?[{label:"Cancel",run:endLater}]:[]).concat([{label:"Continue",primary:true,run:go}])});
    const box=el.querySelector("#ob-code"),btn=el.querySelector('[data-ob="'+(later?1:0)+'"]');
    const fmt=()=>{const k=window.eviaNisia.clean(box.value);const v=k.length>3?k.slice(0,3)+"-"+k.slice(3):k;if(box.value!==v)box.value=v};
    const upd=()=>{btn.disabled=window.eviaNisia.clean(box.value).length<6};
    box.oninput=()=>{fmt();upd();el.querySelector("#ob-err").textContent=""};fmt();upd();
    box.onkeydown=e=>{if(e.key==="Enter"&&!btn.disabled)go()};
    const nc=el.querySelector("#ob-nocode");if(nc)nc.onclick=()=>{closeLesson();showCoursePicker()};
    const sc=el.querySelector("#ob-scan");if(sc)sc.onclick=()=>scanQr(v=>{box.value=v;fmt();upd();if(!btn.disabled)go()});
    async function go(){
      btn.disabled=true;btn.textContent="Checking…";
      try{showMe(await window.eviaNisia.pair(box.value))}
      catch(e){showJoin(box.value,e.message)}
    }
  }
  /* The pairing QR holds NISI:PAIR:2:<code> (or an invite link with ?pair=). */
  function scanQr(onCode){
    const ov=document.createElement("div");ov.id="ob-scan-view";ov.setAttribute("role","dialog");ov.setAttribute("aria-label","Scan the QR code");
    ov.innerHTML='<video playsinline muted></video><div class="ob-scan-frame" aria-hidden="true"></div><p>Point your camera at your assessor’s QR code</p><button type="button" class="secondary" id="ob-scan-x">Cancel</button>';
    document.body.appendChild(ov);
    let stream=null,alive=true;
    const stop=()=>{alive=false;if(stream)stream.getTracks().forEach(t=>t.stop());ov.remove()};
    ov.querySelector("#ob-scan-x").onclick=stop;
    (async()=>{
      try{
        stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});
        const v=ov.querySelector("video");v.srcObject=stream;await v.play();
        const det=new BarcodeDetector({formats:["qr_code"]});
        const look=async()=>{if(!alive)return;try{const r=await det.detect(v);const k=r&&r[0]&&window.eviaNisia.clean(r[0].rawValue);if(k&&k.length>=6){stop();onCode(k);return}}catch(_){}setTimeout(look,300)};
        look();
      }catch(_){stop();if(typeof showEvidenceToast==="function")showEvidenceToast("The camera didn’t open. Type the code instead.",true)}
    })();
  }
  const ukDate=d=>{const t=Date.parse(d);return isNaN(t)?"":new Date(t).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})};
  /* "Is this you?": what Nisia has for them. */
  function showMe(en){
    const name=String(en.name||"").split(/\s+/)[0];
    const course=(window.eviaPacks.catalogue().find(c=>c.id===en.course)||{}).name||en.course;
    const rows=[["Course",course],["College",en.college],["Employer",en.employer],["Assessor",en.assessor],["Tutor",en.tutor],["Dates",[ukDate(en.start),ukDate(en.end)].filter(Boolean).join(" to ")]].filter(r=>r[1]);
    lessonScreen({title:"Is this you?",noSkip:true,
      body:'<div class="tm-says">'+EVIA_SM+'<p>Hi <strong>'+escHtml(name)+'</strong>! Your college has sent me your details. Is this you?</p></div>'+
        '<div class="ob-share ob-me"><strong class="ob-me-name">'+escHtml(en.name)+'</strong>'+rows.map(r=>'<div class="ob-me-row"><span>'+escHtml(r[0])+'</span><b>'+escHtml(r[1])+'</b></div>').join("")+'</div>'+
        '<p class="ob-small">Everything you add to Evia goes to '+escHtml(en.college)+', so your assessor can check it and sign it off.</p>',
      buttons:[{label:"Not me",run:()=>showJoin("","Not you? Ask your assessor for your own code.")},{label:"That’s me",primary:true,run:async()=>{
        const b=document.querySelector('#ob-lesson [data-ob="1"]');if(b){b.disabled=true;b.textContent="Connecting…"}
        try{await window.eviaPacks.ensure(en.course)}catch(err){showJoin(en.code,err.message);return}
        try{await window.eviaNisia.accept(en)}catch(err){showJoin("",err.message);return}
        await applyEnrolment(en);
        if(later){endLater();if(typeof showEvidenceToast==="function")showEvidenceToast("Connected to "+en.college);return}
        closeLesson();afterJoin();
      }}]});
  }
  function endLater(){later=false;closeLesson();document.body.classList.remove("evia-onboarding");nav("course")}
  window.eviaJoinCollege=()=>{const m=document.getElementById("modal-root");if(m)m.innerHTML="";later=true;showJoin()};
  async function applyEnrolment(en){
    await window.eviaPacks.ensure(en.course);
    const p={course:en.course};["name","start","end"].forEach(k=>{if(en[k])p[k]=en[k]});
    if(Array.isArray(en.nvqOptional)&&en.nvqOptional.length)p.nvqOptional=en.nvqOptional.slice();
    window.eviaData.put("learner",p);
  }
  /* NVQ learners choose their optional unit unless Nisia already has it; then Evia's look, then the welcome lesson. */
  function afterJoin(){
    const needOptional=nvqOn()&&!(window.eviaData.learner().nvqOptional||[]).length;
    if(needOptional){writeState("optional");showOptionalPicker();return}
    writeState("welcome");pickersThen(()=>welcome(0));
  }

  /* No code yet: pick the course (they can join their college later). */
  function showCoursePicker(){
    injectStyles();
    const root=document.createElement("div");
    root.id="evia-onboard-course";
    root.className="welcome";
    root.innerHTML='<section class="ew-hero">'+
        '<div class="ew-evia-wrap ew-in" style="--d:0"><span class="evia-mini ew-evia" aria-hidden="true"><span class="evia-face"><i></i><i></i></span></span></div><br>'+
        '<div class="ew-say ew-in" style="--d:1">No problem. Which course are you on?</div></section>'+
      '<section class="ew-pick"><div class="evia-onboard-courses">'+COURSES.filter(c=>window.eviaPacks.COURSES.includes(c.key)).map((c,i)=>
        '<button type="button" class="evia-onboard-course ew-in" style="--d:'+(2+i)+'" data-onboard-course="'+c.key+'"><span class="evia-onboard-course-dot" aria-hidden="true">'+c.ic+'</span><span class="evia-onboard-course-copy"><strong>'+escHtml(c.label)+'</strong><small>'+escHtml(c.sub)+'</small></span><span class="evia-onboard-course-arrow" aria-hidden="true">›</span></button>'
      ).join("")+'</div><button type="button" class="ob-link ew-in" style="--d:6" id="ob-havecode">I’ve got a code</button></section>';
    document.body.appendChild(root);
    requestAnimationFrame(()=>root.classList.add("visible"));
    root.querySelector("#ob-havecode").onclick=()=>{root.remove();showJoin()};
    root.querySelectorAll("[data-onboard-course]").forEach(b=>b.onclick=async()=>{
      /* The course's pack is downloaded first if it isn't on the phone (packs.js). */
      const k=b.dataset.onboardCourse;b.disabled=true;
      try{await window.eviaPacks.ensure(k)}catch(err){b.disabled=false;if(typeof showEvidenceToast==="function")showEvidenceToast(err.message,true);return}
      window.eviaData.put("learner",{course:k});
      if(window.eviaHandoff)window.eviaHandoff(root,afterJoin);else{root.remove();afterJoin()}
    });
  }

  /* ---------- NVQ only: choose the optional unit(s) ---------- */
  function showOptionalPicker(){
    injectStyles();
    const root=document.createElement("div");
    root.id="evia-onboard-course";
    root.innerHTML='<div class="evia-onboard-inner">'+
      '<div class="evia-onboard-kicker">TROWEL OCCUPATIONS L3</div>'+
      '<h2>Which optional unit are you doing?</h2>'+
      '<p>You need at least one. Most learners do <strong>690 Repair and maintenance</strong>. You can change this later in Profile.</p>'+
      '<div class="nvq-opts">'+window.eviaNvq.optionalHtml()+'</div>'+
      '<button type="button" class="primary evia-onboard-go" id="nvq-opt-go">Continue</button></div>';
    document.body.appendChild(root);
    requestAnimationFrame(()=>root.classList.add("visible"));
    const go=root.querySelector("#nvq-opt-go"),upd=()=>{go.disabled=!window.eviaNvq.readOptional(root).length};
    root.querySelectorAll(".nvq-opt input").forEach(i=>i.onchange=upd);upd();
    go.onclick=()=>{
      window.eviaNvq.setOptional(window.eviaNvq.readOptional(root));
      writeState("welcome");
      const next=()=>pickersThen(()=>welcome(0));
      if(window.eviaHandoff)window.eviaHandoff(root,next);else{root.remove();next()}
    };
  }
  /* Evia's shape and colour, if not chosen yet, then carry on. */
  function pickersThen(next){
    const shape=window.eviaShapeHasBeenPicked&&window.eviaShapeHasBeenPicked(),colour=window.eviaThemeHasBeenPicked&&window.eviaThemeHasBeenPicked();
    const doColour=()=>{if(!colour&&window.eviaShowThemePicker)window.eviaShowThemePicker(next);else next()};
    if(!shape&&window.eviaShowShapePicker)window.eviaShowShapePicker(doColour);else doColour();
  }

  /* ---------- 2. The welcome lesson ----------
     Evia teaches a little, asks one question with feedback, then hands over to the PPE unit. */
  function welcome(i){
    writeState("welcome");
    const n=4,prog=Math.round((i+1)/n*100),next=()=>welcome(i+1),name=firstName();
    if(i===0)return lessonScreen({prog,body:'<div class="tm-hero">'+EVIA_BIG+'<p class="tm-say">Hi'+(name?" "+escHtml(name):"")+'! I’ll help you build your <strong>portfolio</strong>: the proof of what you can do at work.</p></div>',buttons:[{label:"Next",primary:true,run:next}]});
    if(i===1)return lessonScreen({prog,body:'<div class="tm-says">'+EVIA_SM+'<p>Each unit on <strong>'+escHtml(courseName())+'</strong> needs evidence: <strong>photos</strong> of a job you did, and a few words on <strong>how you did it</strong>.</p></div>'+
      '<div class="tm-says">'+EVIA_SM+'<p>You don’t need to know what to write. I’ll ask you questions, one at a time.</p></div>',buttons:[{label:"Next",primary:true,run:next}]});
    if(i===2){
      const opts=[["Photos of a job you did, and how you did it",true],["A selfie on your tea break",false],["Your college timetable",false]];
      const el=lessonScreen({prog,body:'<h2 class="tm-q">Quick one. Which of these is evidence?</h2><div class="tm-opts" role="group">'+opts.map((o,k)=>'<button type="button" class="tm-opt" data-k="'+k+'"><span>'+escHtml(o[0])+'</span></button>').join("")+'</div>',
        buttons:[{label:"Check",primary:true,disabled:true,run:check}]});
      let picked=null;const go=el.querySelector('[data-ob="0"]');
      el.querySelectorAll(".tm-opt").forEach(b=>b.onclick=()=>{el.querySelectorAll(".tm-opt").forEach(x=>x.classList.remove("on"));b.classList.add("on");picked=+b.dataset.k;go.disabled=false});
      function check(){
        const ok=opts[picked][1],f=el.querySelector(".tm-fb");
        el.querySelectorAll(".tm-opt").forEach(x=>{x.disabled=true;if(opts[+x.dataset.k][1])x.classList.add("right")});
        f.hidden=false;f.className="tm-fb "+(ok?"ok":"no");
        f.innerHTML='<div class="tm-fb-top"><span class="tm-fb-ic">'+(ok?tick:cross)+'</span><strong>'+(ok?"Spot on!":"Not quite")+'</strong>'+EVIA_SM+'</div><p>'+(ok?"Photos of the job, and your own words about it.":"Evidence shows you doing the job: photos, and how you did it.")+'</p>';
        el.classList.toggle("tm-happy",ok);el.classList.toggle("tm-oops",!ok);
        go.textContent="Continue";go.onclick=next;
      }
      return;
    }
    lessonScreen({prog:100,body:'<div class="tm-hero">'+EVIA_BIG+'<p class="tm-say">Let’s do your first one together: your <strong>PPE</strong>.<br>It takes a couple of minutes.</p></div>',
      buttons:[{label:"Start",primary:true,run:()=>{closeLesson();openInduction()}}]});
  }

  /* ---------- 3. The PPE induction, on a real evidence page ----------
     The same page and the same guided mode as every unit: Evia asks for the photos one at a time, then two questions,
     and puts the answers into a statement. It's kept while in progress (evia7-induction), then saved once, as a PDF in
     Supporting evidence, linked to the KSBs it shows (which ticks them off). */
  const PLAN={
    photos:[
      {key:"ready",say:"You in your full PPE",hint:"Head to toe. Ask someone to take it for you."},
      {key:"ready",say:"Your hard hat and hi-vis",hint:"Close enough to see they’re in good condition."},
      {key:"ready",say:"Your boots, gloves and eye protection",hint:"Wear them, or lay them out."}
    ],
    asks:[
      {key:"ready",title:"Your PPE",ask:"What does each bit of your PPE protect you from?",terms:[],topics:["Hard hat","Hi-vis","Safety boots","Gloves","Eye and ear protection","Something else"],can:[]},
      {key:"know",title:"Keeping it safe",ask:"When do you wear it, and how do you check it’s safe to use?",terms:[],topics:["When you wear it","Checking it for damage","Something else"],can:[]}
    ],
    stages:["Photos of your PPE","Two quick questions","Your statement"]
  };
  const readInd=()=>{try{const v=JSON.parse(localStorage.getItem(IND_KEY)||"null");return v&&typeof v==="object"?v:{photos:[],write:""}}catch(_){return {photos:[],write:""}}};
  const saveInd=p=>{try{localStorage.setItem(IND_KEY,JSON.stringify(p))}catch(_){}};
  let ind=null,guideOpen=false,modalWatch=null;
  function ksbLabel(){const c=ppeCodes();return nvqOn()?"Unit 102 criteria 1.2 and 1.4":"<strong>"+escHtml(c[0])+"</strong> and <strong>"+escHtml(c[1])+"</strong>"}
  function openInduction(){
    injectStyles();writeState("ppe");
    ind=ind||readInd();ind.photos=ind.photos||[];
    const scr=document.getElementById("screen");if(!scr){finish();return}
    const m=document.getElementById("modal-root");if(m&&!guideOpen)m.innerHTML="";
    const pb=document.getElementById("profile-btn");if(pb)pb.style.display="none";
    const photos=ind.photos,text=String(ind.write||"").trim(),started=photos.length||text||(ind.guide&&ind.guide.at);
    const pt=document.getElementById("page-title");if(pt)pt.textContent="PPE induction";
    scr.innerHTML='<div class="evidence-pack-page ob-induction">'+
      '<div class="evidence-heading"><div class="evidence-label">INDUCTION</div><h2>PPE induction</h2><p>Show your PPE and say what it’s for. It’s saved to <strong>Supporting evidence</strong>, linked to '+ksbLabel()+'.</p></div>'+
      '<div class="ev-modes"><button type="button" class="eg-start" id="eg-start"><span class="evia-mini" aria-hidden="true"><span class="evia-face"><i></i><i></i></span></span><span><strong>'+(started&&!text?"Carry on with Evia":text?"Go through it again":"Let Evia guide you")+'</strong><small>'+(started&&!text?"Pick up where you left off":"Photos one at a time, then two questions")+'</small></span><span class="eg-start-chev" aria-hidden="true">›</span></button></div>'+
      (started?'<section class="evidence-section fr-progress"><div class="evidence-section-title">IN PROGRESS</div>'+
        '<div class="evidence-thumbs" id="evidence-photos"></div>'+
        '<p class="fr-progress-sum">'+photos.length+' photo'+(photos.length===1?"":"s")+' · '+(text?text.split(/\s+/).length+' words written':'no statement yet')+'</p>'+
        (text?'<p class="fr-progress-text">'+escHtml(text.length>220?text.slice(0,220).replace(/\s+\S*$/,"")+"…":text)+'</p>':"")+
        '<div class="pack-actions fr-actions"><button class="primary" id="ob-ppe-save" '+(text?"":"disabled")+'>Save to Supporting evidence</button></div></section>':"")+
      '</div>';
    Promise.all(photos.map(async p=>{try{const b=await window.eviaGetEvidencePhoto(p.id);return b?'<div class="photo-item"><img class="thumb" src="'+URL.createObjectURL(b)+'" alt="PPE photo"></div>':""}catch(_){return ""}}))
      .then(h=>{const g=document.getElementById("evidence-photos");if(g)g.innerHTML=h.join("")});
    scr.querySelector("#eg-start").onclick=startGuide;
    const sv=scr.querySelector("#ob-ppe-save");if(sv)sv.onclick=ppeSave;
    /* Evia points at what to do next. */
    document.body.classList.add("evia-onboarding","ob-lock");
    if(text)point("#ob-ppe-save",true,"That’s your statement done. Tap <strong>Save to Supporting evidence</strong>.",null,40);
    else if(started)point("#eg-start",true,"Everything so far is saved. Tap to <strong>carry on</strong>.",null,20);
    else point("#eg-start",true,"Your first job: your <strong>PPE</strong>. Tap <strong>Let Evia guide you</strong>.",null,10);
  }
  function startGuide(){
    hideCard();document.body.classList.remove("ob-lock");guideOpen=true;
    const pack=ind;
    const ctx={unitName:"PPE induction",plan:PLAN,pack,
      addFiles:async files=>{
        for(const f of (files||[]).filter(x=>x&&x.size)){
          try{const id=await window.eviaStoreEvidencePhoto(await compressPhoto(f));pack.photos.push({id,takenAt:f.eviaTakenAt||f.lastModified||Date.now()});saveInd(pack)}
          catch(err){console.error("Evia PPE photo failed",err)}
        }
      },
      save:()=>saveInd(pack),
      done:()=>{guideOpen=false;saveInd(pack);openInduction()}};
    watchModal();
    window.eviaGuide.start(ctx);
  }
  /* Closing Evia's sheet part-way brings the page back, with her pointing at "Carry on". */
  function watchModal(){
    const m=document.getElementById("modal-root");if(!m)return;
    if(modalWatch)modalWatch.disconnect();
    let t=null;
    modalWatch=new MutationObserver(()=>{clearTimeout(t);t=setTimeout(()=>{
      if(!guideOpen){modalWatch.disconnect();modalWatch=null;return}
      if(!m.innerHTML.trim()&&!document.body.classList.contains("cam-open")&&!document.querySelector(".cam")){guideOpen=false;modalWatch.disconnect();modalWatch=null;saveInd(ind);openInduction()}
    },450)});
    modalWatch.observe(m,{childList:true,subtree:true});
  }
  /* The PPE page: the photos, the statement, the KSBs it shows, the learner's name and signature. */
  async function ppePdf(){
    const {jsPDF}=await window.eviaLoadJsPdf(),T=window.eviaPdfText||(s=>String(s||"")),L=window.eviaData.learner(),en=window.eviaData.enrolment()||{};
    const doc=new jsPDF({unit:"mm",format:"a4"}),W=210,M=16;let y=22;
    doc.setFont("helvetica","bold");doc.setFontSize(20);doc.setTextColor(23,32,51);doc.text("PPE induction",M,y);y+=7;
    doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(102,112,133);
    doc.text(T([L.name,courseName(),en.college,new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})].filter(Boolean).join("  ·  ")),M,y);y+=8;
    const shots=[];
    for(const p of ind.photos.slice(0,6)){
      try{const b=await window.eviaGetEvidencePhoto(p.id);if(!b)continue;const src=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)});
        const img=await new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src});if(img)shots.push({src,img})}catch(_){}
    }
    /* Photos two to a row. */
    const colW=(W-2*M-6)/2;
    for(let k=0;k<shots.length;k+=2){
      const row=shots.slice(k,k+2),h=Math.min(80,Math.max(...row.map(s=>colW*s.img.height/s.img.width)));
      if(y+h>280){doc.addPage();y=20}
      row.forEach((s,j)=>{const sc=Math.min(colW/s.img.width,h/s.img.height);try{doc.addImage(s.src,"JPEG",M+j*(colW+6),y,s.img.width*sc,s.img.height*sc)}catch(_){}});
      y+=h+6;
    }
    doc.setFont("helvetica","bold");doc.setFontSize(11);doc.setTextColor(23,32,51);if(y>260){doc.addPage();y=20}doc.text("My PPE and what it's for",M,y);y+=6;
    doc.setFont("helvetica","normal");doc.setFontSize(10.5);
    doc.splitTextToSize(T(ind.write),W-2*M).forEach(line=>{if(y>284){doc.addPage();y=20}doc.text(line,M,y);y+=5});y+=6;
    if(y>265){doc.addPage();y=20}
    doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text("Linked to",M,y);y+=6;
    doc.setFont("helvetica","normal");doc.setFontSize(9.5);doc.setTextColor(71,84,103);
    ppeKsbs().forEach(k=>{const t=doc.splitTextToSize(T(k[0]+"  "+k[1]),W-2*M);if(y+t.length*4.5>280){doc.addPage();y=20}doc.text(t,M,y);y+=t.length*4.5+2});
    const sig=window.eviaData.files.signature();
    if(sig){if(y>250){doc.addPage();y=20}y+=4;try{doc.addImage(sig,"PNG",M,y,50,14)}catch(_){}doc.setFontSize(9);doc.text("Signed",M,y+18)}
    return doc.output("blob");
  }
  let saving=false,savedId="";
  async function ppeSave(){
    if(saving||!ind||!String(ind.write||"").trim())return;saving=true;
    hideCard();
    const btn=document.getElementById("ob-ppe-save");if(btn){btn.disabled=true;btn.textContent="Saving…"}
    try{
      const pdf=await ppePdf(),id="supporting-"+Date.now()+"-"+Math.random().toString(36).slice(2,8);
      await window.eviaSupportingFilePut({id,blob:pdf});
      window.eviaData.put("supporting",{id,course,title:"PPE induction",type:"document",mime:"application/pdf",filename:"PPE-induction.pdf",size:pdf.size,
        nvqUnit:nvqOn()?"102":undefined,criteria:ppeCodes(),induction:true});
      savedId=id;ind=null;saving=false;
      try{localStorage.removeItem(IND_KEY)}catch(_){}
      if(typeof showEvidenceToast==="function")showEvidenceToast("Saved to Supporting evidence");
      tour(0);
    }catch(err){
      console.error("Evia PPE save failed",err);saving=false;
      if(btn){btn.disabled=false;btn.textContent="Save to Supporting evidence"}
      alert("Evia couldn’t save your PPE evidence. Please try again.");
    }
  }
  const savedTarget=()=>{const x=savedId||((window.eviaData.list("supporting").find(s=>s.induction)||{}).id)||"";return x?'[data-ev-open="'+CSS.escape(x)+'"]':"[data-ev-open]"};

  /* ---------- 4. The tour: one line from Evia per step ----------
     "Tap this" steps wait for the learner to tap the highlighted thing; the others have Next. */
  const $q=s=>document.querySelector(s);
  const TOUR=[
    {nav:"course",seen:"course",target:"[data-supporting-evidence]",tap:true,text:"It’s in <strong>Supporting evidence</strong>, on Topics. Tap it."},
    {seen:"supporting",target:savedTarget,text:"Here’s your PPE, linked to "+"{ksb}"+". Tap any file to see it or share it."},
    {nav:"course",target:"#screen .unit-card[data-u]",tap:true,text:"Your topics are here on <strong>Topics</strong>. Tap one."},
    {seen:"unit",target:".ev-modes",text:"Every unit works like your PPE: <strong>Evia guides you</strong>, or go <strong>free range</strong> and add it your way."},
    {target:'[data-nav="learning"]',tap:true,text:"Tap <strong>Progress</strong>."},
    {seen:"learning",text:"<strong>My progress</strong> shows how you’re doing, and what to do next."},
    {target:'[data-nav="calendar"]',tap:true,text:"Tap <strong>Calendar</strong>."},
    {seen:"calendar",text:"Your college days, set by your tutor, and your learning hours. Can’t make college? Tell me from here."},
    {target:'[data-nav="teach"]',tap:true,text:"Tap <strong>Learn</strong>."},
    {seen:"teach",target:"#tg-shop",text:"Lessons, tests and games, like the one you just did. Each earns <strong>coins</strong>: spend them in the <strong>Shop</strong> on new looks for me and mini games."},
    {seen:"evia",target:"#evia-fab",text:"And this is me. Tap me any time for help, evidence checks and practice tests."},
    {nav:"course",target:"#profile-btn",tap:true,text:"Last one: tap your <strong>profile</strong>."},
    {profile:true,seen:"profile"}
  ];
  let card=null,tapWatch=null,profileObserver=null;
  /* The spotlight: what Evia is pointing at gets a ring; everything else stays as it is but can't be used. Four clear panels frame it;
     when she's only showing it (Next), a clear cover stops it being tapped too. With nothing to point at, the page stays
     sharp but can't be used. */
  let spot=null,spotEl=null,spotLook=false,spotRaf=0;
  function spotlight(el,look){
    if(!spot){spot=document.createElement("div");spot.id="ob-spot";spot.innerHTML='<i></i><i></i><i></i><i></i><b></b><u></u>';document.body.appendChild(spot)}
    spotEl=el||null;spotLook=!!look;spot.classList.toggle("none",!el);
    cancelAnimationFrame(spotRaf);
    const [t,r,btm,l]=spot.querySelectorAll("i"),cover=spot.querySelector("b"),ring=spot.querySelector("u");
    const frame=()=>{
      if(spotEl&&document.body.contains(spotEl)){
        const R=spotEl.getBoundingClientRect(),p=6,x1=Math.max(0,R.left-p),y1=Math.max(0,R.top-p),x2=Math.min(innerWidth,R.right+p),y2=Math.min(innerHeight,R.bottom+p);
        t.style.cssText="left:0;top:0;width:100%;height:"+y1+"px";btm.style.cssText="left:0;top:"+y2+"px;width:100%;bottom:0";
        l.style.cssText="left:0;top:"+y1+"px;width:"+x1+"px;height:"+(y2-y1)+"px";r.style.cssText="left:"+x2+"px;top:"+y1+"px;right:0;height:"+(y2-y1)+"px";
        ring.style.cssText="left:"+(x1-2)+"px;top:"+(y1-2)+"px;width:"+(x2-x1+4)+"px;height:"+(y2-y1+4)+"px";
        cover.style.cssText=spotLook?"left:"+x1+"px;top:"+y1+"px;width:"+(x2-x1)+"px;height:"+(y2-y1)+"px":"display:none";
      }
      spotRaf=requestAnimationFrame(frame);
    };
    frame();
  }
  function spotOff(){cancelAnimationFrame(spotRaf);spotEl=null;if(spot){spot.remove();spot=null}}
  const stopWatch=()=>{if(tapWatch)document.removeEventListener("click",tapWatch,true);tapWatch=null};
  const clearTargets=()=>document.querySelectorAll(".evia-guide-target").forEach(el=>el.classList.remove("evia-guide-target","ob-look"));
  function hideCard(){stopWatch();clearTargets();spotOff();if(card){const c=card;card=null;c.classList.remove("show");setTimeout(()=>c.remove(),220)}}
  function renderCard(pct,text,tap,onNext){
    /* Evia's normal speech bubble (the one she uses everywhere, above her button), with the progress and Skip. */
    if(!card){card=document.createElement("div");card.className="ui-evia-bubble ob-card";card.setAttribute("role","status");card.setAttribute("aria-live","polite");document.body.appendChild(card);requestAnimationFrame(()=>requestAnimationFrame(()=>card&&card.classList.add("show")))}
    card.innerHTML='<div class="ob-card-top"><span class="tm-prog" aria-hidden="true"><i style="width:'+pct+'%"></i></span><button type="button" class="ob-skip">Skip</button></div>'+
      '<p>'+text+'</p>'+
      (tap?'':'<div class="ui-evia-bubble-actions"><button type="button" class="primary ob-next">Next</button></div>');
    card.querySelector(".ob-skip").onclick=skipDemo;
    const n=card.querySelector(".ob-next");if(n)n.onclick=onNext;
  }
  /* Evia points at one thing on the page: waits for it to be drawn, scrolls to it, rings it. A tap on it runs
     onTap (the thing's own action runs too); with no tap, Next runs onNext. */
  function point(sel,tap,text,onNext,pct,onTap){
    stopWatch();clearTargets();
    document.body.classList.add("evia-onboarding","ob-lock");
    renderCard(pct||0,text,tap,onNext);
    let tries=0;
    const go=()=>{
      const s=typeof sel==="function"?sel():sel,el=s&&$q(s);
      if(s&&!el&&tries++<20){setTimeout(go,100);return}
      if(el){el.classList.add("evia-guide-target");if(!tap)el.classList.add("ob-look");el.scrollIntoView({block:"center",behavior:"smooth"})}
      spotlight(el,!tap);
      if(tap){
        tapWatch=e=>{if(!(e.target.closest&&e.target.closest(s)))return;stopWatch();clearTargets();if(onTap)setTimeout(onTap,500)};
        document.addEventListener("click",tapWatch,true);
        if(!el&&onTap)setTimeout(onTap,300); /* nothing to tap on this phone: carry on */
      }
    };
    setTimeout(go,120);
  }
  function tour(i){
    stopWatch();clearTargets();
    if(i>=TOUR.length){finish();return}
    writeState("tour:"+i);
    const s=TOUR[i];
    /* What the tour explains doesn't get a first-visit note later (tips.js). */
    if(s.seen&&window.eviaTips)window.eviaTips.seen(s.seen);
    if(s.profile){document.body.classList.add("evia-onboarding","ob-lock");profileStep();return}
    const sel=typeof s.target==="function"?s.target():s.target;
    if(s.nav&&(screen!==s.nav||!(sel&&$q(sel)))){const m=document.getElementById("modal-root");if(m)m.innerHTML="";nav(s.nav)}
    const pct=Math.round(40+(i+1)/TOUR.length*60);
    setTimeout(()=>point(sel,s.tap,s.text.replace("{ksb}",ksbLabel()),()=>tour(i+1),pct,()=>tour(i+1)),s.nav?250:0);
  }
  /* The profile, one part at a time. Evia stays at the bottom, as in the rest of the tour; the part she's talking about is
     scrolled up above her and is the only thing that can be used. Name and dates are skipped when they're known already.
     Saving finishes the tour. */
  const PSTEPS=[
    {key:"name",sel:"#profile-name",hl:"#profile-name",text:"Type your <strong>name</strong>. It goes on all your evidence."},
    {key:"dates",sel:"#profile-start",hl:".pf-dates",text:"Add the <strong>start and end dates</strong> of your apprenticeship."},
    {key:"sign",sel:"#signature-pad",hl:".pf-sign",text:"Sign in the box with your finger. It goes on the evidence you save."},
    {key:"save",sel:"#save-profile",hl:"#save-profile",tap:true,text:"All done. Tap <strong>Save</strong>."}
  ];
  function profileStep(){
    hideCard();
    if(!window.eviaOpenProfile){finish();return}
    const L=window.eviaData.learner();
    const steps=PSTEPS.filter(p=>!(p.key==="name"&&String(L.name||"").trim())&&!(p.key==="dates"&&L.start&&L.end));
    const modal=document.getElementById("modal-root");let seen=false,at=-1;
    if(profileObserver)profileObserver.disconnect();
    const place=sheet=>{
      const p=steps[at],target=sheet.querySelector(p.sel);if(!target)return;
      clearTargets();
      const hl=sheet.querySelector(p.hl)||target;hl.classList.add("evia-guide-target");spotlight(hl,false);
      renderCard(Math.round((at+1)/steps.length*100),p.text,p.tap,()=>{at++;place(sheet)});
      if(card)card.classList.add("ob-over");
      setTimeout(()=>{hl.scrollIntoView({block:p.key==="save"?"center":"start",behavior:"smooth"});if(p.key==="name"&&!target.value)target.focus({preventScroll:true})},150);
    };
    const decorate=()=>{
      const sheet=modal.querySelector(".profile-sheet");
      if(sheet){seen=true;sheet.classList.add("ob-profile");if(at<0){at=0;place(sheet)}else if(!sheet.querySelector(".evia-guide-target"))place(sheet)}
      else if(seen&&!modal.innerHTML.trim()){observer.disconnect();profileObserver=null;finish()}
    };
    const observer=profileObserver=new MutationObserver(decorate);
    observer.observe(modal,{childList:true,subtree:true});
    window.eviaOpenProfile();decorate();
  }

  function skipDemo(){
    if(profileObserver){profileObserver.disconnect();profileObserver=null}
    if(modalWatch){modalWatch.disconnect();modalWatch=null}
    const modal=document.getElementById("modal-root");if(modal&&modal.querySelector(".ob-profile"))modal.innerHTML="";
    finish();
  }
  function finish(){
    writeState("done");guideOpen=false;
    hideCard();closeLesson();clearTargets();
    document.body.classList.remove("evia-onboarding","ob-lock");spotOff();
    const pick=document.getElementById("evia-onboard-course");if(pick)pick.remove();
    nav("course");
    if(typeof showEvidenceToast==="function")showEvidenceToast("You’re all set");
  }

  /* Picks up where the learner left off. Stages from older versions carry on at the nearest step. */
  function resume(stage){
    const t=/^tour:(\d+)$/.exec(stage||"");
    if(t)return tour(Math.min(+t[1],TOUR.length-1));
    if(stage==="join"||stage==="course"){
      const en=window.eviaData.enrolment&&window.eviaData.enrolment();
      if(en)applyEnrolment(en).then(afterJoin).catch(err=>{console.error(err);showJoin()});
      else{
        /* An invite link (?pair=) goes straight to "Is this you?". */
        let code="";try{const q=new URLSearchParams(location.search);code=q.get("pair")||q.get("code")||""}catch(_){}
        if(code)window.eviaNisia.pair(code).then(showMe).catch(e=>showJoin(code,e.message));else showJoin();
      }
      return;
    }
    if(stage==="joined")return afterJoin();
    if(stage==="optional"&&nvqOn())return showOptionalPicker();
    if(stage==="welcome"||stage==="optional")return pickersThen(()=>welcome(0));
    if(stage==="ppe"||stage==="unit")return openInduction();
    tour(0);
  }

  /* Called after the welcome screen. Returns true when the first run takes over. */
  window.eviaMaybeStartOnboarding=function(firstRun){
    let forced=false;
    try{
      const params=new URLSearchParams(location.search);
      if(params.has("demo")){
        forced=true;params.delete("demo");
        history.replaceState(null,"",location.pathname+(params.toString()?"?"+params:"")+location.hash);
      }
      /* Shared test pages only pass a plain #anchor, so #demo replays it too; #demo&course=site stands in for joining
         a college with that course. */
      const hash=new URLSearchParams(location.hash.slice(1));
      if(hash.has("demo")){forced=true;const c=hash.get("course");if(c&&!window.eviaData.enrolment())window.eviaData.enrol({course:c});history.replaceState(null,"",location.pathname+location.search)}
    }catch(_){}
    const state=readState();
    if(forced||(!state&&firstRun)){try{localStorage.removeItem(IND_KEY)}catch(_){}resume("join");return true}
    if(state&&state.stage&&state.stage!=="done"){resume(state.stage);return true}
    return false;
  };
})();
