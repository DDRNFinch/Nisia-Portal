/* Evia7 camera and recorder.
   eviaCamera.open({title, prompts, onDone(files)}): a full-screen square camera that stays open, so learners can take
   photo after photo; the unit's "Things to capture" sit under the picture as a plain reminder.
   eviaRecorder.open({type:"video"|"audio", onDone(blob,mime,info)}): a full-screen recorder with an unmistakable
   recording state, a time limit (2 minutes unless opts.limit) and Keep / Retake before anything is saved.
   For evidence (guide.js) it also takes opts.prompts with opts.promptsTitle (the unit's things to capture or mention,
   laid out like the photo camera's), and opts.transcribe: where the phone can turn speech into text, what's said is
   written down as it's recorded, and each thing to mention lights up once it's been said. info={secs,transcript}. */
(function(){
  const escHtml=v=>String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
  const supported=()=>!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
  const buzz=ms=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(_){}};
  const stamp=()=>new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);
  const X='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  function overlay(cls,html){
    const el=document.createElement("div");el.className="cam "+cls;el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.innerHTML=html;
    document.body.appendChild(el);document.body.classList.add("cam-open");
    requestAnimationFrame(()=>el.classList.add("show"));
    return el;
  }
  function closeOverlay(el,stream){
    if(stream)stream.getTracks().forEach(t=>t.stop());
    el.classList.remove("show");document.body.classList.remove("cam-open");
    setTimeout(()=>el.remove(),220);
  }
  function denied(el,err,what){
    const msg=err&&err.name==="NotAllowedError"?"Evia needs permission to use your "+what+". Allow it in your browser or phone settings, then try again.":"Evia couldn’t start your "+what+". Close any other app using it and try again.";
    el.querySelector(".cam-stage").innerHTML='<div class="cam-denied"><p>'+escHtml(msg)+'</p></div>';
  }

  /* ---------- Photo camera ---------- */
  function openCamera(opts){
    const prompts=(opts.prompts||[]).map(p=>String(p).trim()).filter(Boolean);
    /* Guided mode (guide.js): opts.guide=[{say,hint}] — Evia asks for one thing at a time; Skip or Next moves on. */
    const guide=Array.isArray(opts.guide)&&opts.guide.length?opts.guide:null;
    /* opts.startStep picks up a guide part-way; opts.onStep(step) hears each move; opts.onShot(file) takes each photo
       as it's taken (so nothing is lost if the learner stops), and onDone(files,{finished,step}) then gets none. */
    const shots=[];let stream=null,step=guide?Math.max(0,Math.min(opts.startStep||0,guide.length-1)):0;
    const asFile=(s,i)=>{const f=new File([s.blob],"photo-"+stamp()+"-"+(i+1)+".jpg",{type:s.blob.type||"image/jpeg"});f.eviaTakenAt=s.takenAt||Date.now();return f};
    const el=overlay("cam-photo",
      '<header class="cam-top"><button type="button" class="cam-icon" data-cam-close aria-label="Close camera">'+X+'</button><strong>'+escHtml(opts.title||"Camera")+'</strong><span class="cam-count" aria-live="polite">0 photos</span></header>'+
      (guide?'<div class="cam-progress" aria-hidden="true"><i></i></div>':"")+
      '<div class="cam-stage"><video playsinline muted autoplay></video><span class="cam-frame" aria-hidden="true"></span></div>'+
      /* Things to capture as plain text under the picture: ideas for what to photograph, nothing to tick off. */
      (guide?'<div class="cam-guide" aria-live="polite"><span class="evia-mini" aria-hidden="true"><span class="evia-face"><i></i><i></i></span></span><div><small class="cam-guide-n"></small><p class="cam-guide-say"></p><span class="cam-guide-hint"></span></div></div>':
       prompts.length?'<div class="cam-prompts"><span class="cam-prompts-h">Things to capture</span><p>'+prompts.map(escHtml).join('<span class="cam-dot" aria-hidden="true"> · </span>')+'</p></div>':"")+
      /* Photos are of the learner's work, not people: one plain reminder every time the camera opens. */
      '<p class="cam-consent">Photograph your work, not people. Ask first if anyone’s in shot.</p>'+
      '<div class="cam-strip" aria-label="Photos taken"></div>'+
      '<footer class="cam-bottom"><label class="cam-gallery"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M4 16.5l5-5 4 4 3-3 4 4"/></svg><span>Gallery</span><input type="file" accept="image/*" multiple hidden></label><button type="button" class="cam-shutter" aria-label="Take photo"><i></i></button><button type="button" class="cam-done" disabled>Done</button></footer>');
    const video=el.querySelector("video"),strip=el.querySelector(".cam-strip"),count=el.querySelector(".cam-count"),doneBtn=el.querySelector(".cam-done"),shutter=el.querySelector(".cam-shutter");
    const refresh=()=>{
      count.textContent=shots.length+" photo"+(shots.length===1?"":"s");
      if(guide){
        /* The request stays on screen; the learner moves on whenever they're ready. */
        const g=guide[step],last=step===guide.length-1,P=opts.progress||{done:0,total:guide.length};
        el.querySelector(".cam-guide-n").textContent=(step+1)+" of "+guide.length;
        el.querySelector(".cam-guide-say").textContent=g.say;
        el.querySelector(".cam-guide-hint").textContent=g.hint||"";
        el.querySelector(".cam-progress i").style.width=Math.round((P.done+step+1)/P.total*100)+"%";
        doneBtn.disabled=false;doneBtn.textContent=last?"Finish":"Next";
      }else{doneBtn.disabled=!shots.length;doneBtn.textContent=shots.length?"Done ("+shots.length+")":"Done"}
      strip.innerHTML=shots.map((s,i)=>'<span class="cam-thumb"><img src="'+s.url+'" alt="Photo '+(i+1)+'">'+(opts.onShot?"":'<button type="button" data-remove="'+i+'" aria-label="Remove photo '+(i+1)+'">'+X+'</button>')+'</span>').join("");
      strip.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{const [s]=shots.splice(+b.dataset.remove,1);if(s)URL.revokeObjectURL(s.url);refresh()});
      strip.scrollLeft=strip.scrollWidth;
    };
    const take=()=>{
      if(!video.videoWidth)return;
      const side=Math.min(video.videoWidth,video.videoHeight),px=Math.min(side,1600);
      const c=document.createElement("canvas");c.width=c.height=px;
      c.getContext("2d").drawImage(video,(video.videoWidth-side)/2,(video.videoHeight-side)/2,side,side,0,0,px,px);
      buzz(12);shutter.classList.add("snap");setTimeout(()=>shutter.classList.remove("snap"),160);
      c.toBlob(b=>{
        if(!b)return;
        shots.push({blob:b,url:URL.createObjectURL(b)});if(opts.onShot)opts.onShot(asFile(shots[shots.length-1],shots.length-1));refresh();
      },"image/jpeg",.88);
    };
    shutter.onclick=take;
    /* Photos already on the phone can be added without leaving the camera (including mid-guide). */
    const pick=el.querySelector(".cam-gallery input");
    pick.onchange=()=>{[...pick.files].filter(f=>f&&f.size&&/^image\//.test(f.type||"image/")).forEach(f=>{shots.push({blob:f,url:URL.createObjectURL(f),takenAt:f.lastModified||Date.now()});if(opts.onShot)opts.onShot(f)});pick.value="";refresh()};
    const finish=(keep,finished)=>{
      const files=keep&&!opts.onShot?shots.map(asFile):[];
      shots.forEach(s=>URL.revokeObjectURL(s.url));closeOverlay(el,stream);
      if((files.length||guide)&&opts.onDone)opts.onDone(files,{finished:!!finished,step});
    };
    doneBtn.onclick=()=>{
      if(guide&&step<guide.length-1){step++;if(opts.onStep)opts.onStep(step);refresh();buzz(8);return}
      finish(true,true);
    };
    el.querySelector("[data-cam-close]").onclick=()=>{if(!opts.onShot&&shots.length&&!confirm("Keep the "+shots.length+" photo"+(shots.length===1?"":"s")+" you’ve taken?")){finish(false);return}finish(true,!guide)};
    navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1920}},audio:false})
      .then(s=>{stream=s;video.srcObject=s;return video.play().catch(()=>{})})
      .catch(err=>{console.error("Evia camera failed",err);denied(el,err,"camera");shutter.disabled=true});
    refresh();
  }

  /* ---------- Video and voice recorder ---------- */
  const LIMIT=120; /* seconds */
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  /* A true MP4 recording (H.264 picture, AAC sound) put together on the phone with WebCodecs, so it plays with sound in
     every phone gallery and PC player, the old Windows Media Player included. It behaves like a MediaRecorder
     (start, stop, onstop, ondataavailable). Resolves to null where the browser can't do it, and MediaRecorder is used. */
  let muxP=null;
  const loadMux=()=>window.Mp4Muxer?Promise.resolve(window.Mp4Muxer):muxP||(muxP=new Promise((res,rej)=>{
    const s=document.createElement("script");s.src="vendor/mp4-muxer-5.2.2.js";
    s.onload=()=>window.Mp4Muxer?res(window.Mp4Muxer):rej(new Error("MP4 muxer unavailable"));
    s.onerror=()=>{muxP=null;rej(new Error("MP4 muxer unavailable"))};document.head.appendChild(s);
  }));
  let mp4Broken=false;
  async function mp4Recorder(stream,video){
    const W=window;if(mp4Broken||!W.AudioEncoder||!W.MediaStreamTrackProcessor||(video&&!W.VideoEncoder))return null;
    const a0=stream.getAudioTracks()[0],v0=video?stream.getVideoTracks()[0]:null;if(!a0||(video&&!v0))return null;
    const tracks=[],readers=[];
    const drop=()=>{readers.forEach(r=>r.cancel().catch(()=>{}));tracks.forEach(t=>t.stop())};
    try{
      const Mux=await loadMux();
      const reader=t=>{const c=t.clone();tracks.push(c);const r=new MediaStreamTrackProcessor({track:c}).readable.getReader();readers.push(r);return r};
      const first=r=>Promise.race([r.read().then(x=>x.value),new Promise(res=>setTimeout(()=>res(null),3000))]);
      const ar=reader(a0),vr=video?reader(v0):null;
      const fa=await first(ar),fv=vr?await first(vr):null;
      if(!fa||(video&&!fv)){if(fa)fa.close();if(fv)fv.close();drop();return null}
      const sampleRate=fa.sampleRate,numberOfChannels=Math.min(2,fa.numberOfChannels||1);fa.close();
      const aConf={codec:"mp4a.40.2",sampleRate,numberOfChannels,bitrate:video?96000:128000};
      if(!(await AudioEncoder.isConfigSupported(aConf)).supported){if(fv)fv.close();drop();return null}
      let vConf=null,width=0,height=0;
      if(video){
        width=fv.displayWidth&~1;height=fv.displayHeight&~1;fv.close();
        for(const codec of ["avc1.42E028","avc1.4D4028","avc1.640028","avc1.42E032","avc1.42001f"]){
          const c={codec,width,height,bitrate:1500000,framerate:30,latencyMode:"realtime",avc:{format:"avc"}};
          try{if((await VideoEncoder.isConfigSupported(c)).supported){vConf=c;break}}catch(_){}
        }
        if(!vConf){drop();return null}
      }
      const target=new Mux.ArrayBufferTarget();
      const muxer=new Mux.Muxer({target,fastStart:"in-memory",firstTimestampBehavior:"cross-track-offset",
        audio:{codec:"aac",sampleRate,numberOfChannels},...(video?{video:{codec:"avc",width,height}}:{})});
      let failed=null;const fail=e=>{failed=failed||e;mp4Broken=true;console.error("Evia MP4 recorder",e)};
      const add=(fn,chunk,meta)=>{try{fn.call(muxer,chunk,meta)}catch(e){fail(e)}};
      const aEnc=new AudioEncoder({output:(c,m)=>add(muxer.addAudioChunk,c,m),error:fail});aEnc.configure(aConf);
      const vEnc=video?new VideoEncoder({output:(c,m)=>add(muxer.addVideoChunk,c,m),error:fail}):null;if(vEnc)vEnc.configure(vConf);
      const rec={mimeType:video?"video/mp4;codecs=avc1,mp4a.40.2":"audio/mp4;codecs=mp4a.40.2",state:"inactive",onstop:null,ondataavailable:null};
      let lastKey=-1e12;
      const pump=async(r,fn)=>{for(;;){let x;try{x=await r.read()}catch(_){break}if(x.done)break;const f=x.value;
        if(rec.state!=="recording"||failed){f.close();continue}try{fn(f)}catch(e){fail(e)}f.close()}};
      const pa=pump(ar,d=>{if(aEnc.state==="configured")aEnc.encode(d)});
      const pv=vr?pump(vr,f=>{
        if(vEnc.state!=="configured"||(f.displayWidth&~1)!==width||(f.displayHeight&~1)!==height||vEnc.encodeQueueSize>4)return;
        const key=f.timestamp-lastKey>=2e6;if(key)lastKey=f.timestamp;vEnc.encode(f,{keyFrame:key});
      }):Promise.resolve();
      rec.start=()=>{rec.state="recording"};
      rec.stop=async()=>{
        if(rec.state==="inactive")return;rec.state="inactive";drop();await Promise.all([pa,pv]);
        let blob=null;
        try{await aEnc.flush();if(vEnc)await vEnc.flush();if(failed)throw failed;muxer.finalize();blob=new Blob([target.buffer],{type:rec.mimeType.split(";")[0]})}catch(e){fail(e)}
        try{aEnc.close();if(vEnc)vEnc.close()}catch(_){}
        if(blob&&rec.ondataavailable)rec.ondataavailable({data:blob});
        if(rec.onstop)rec.onstop();
      };
      return rec;
    }catch(e){console.warn("Evia MP4 recorder unavailable",e);drop();return null}
  }
  function openRecorder(opts){
    const video=opts.type==="video",limit=opts.limit||LIMIT,prompts=(opts.prompts||[]).map(p=>String(p).trim()).filter(Boolean);
    const mins=limit%60?fmtLimit(limit):(limit/60)+" minute"+(limit===60?"":"s");
    /* The transcript: final phrases, plus the one being heard. Restarted if the phone stops listening in a pause. */
    let heard="",interim="",sr=null,listening=false;
    const transcript=()=>(heard+" "+interim).replace(/\s+/g," ").trim();
    let stream=null,recorder=null,chunks=[],blob=null,mime="",started=0,timer=null,audioCtx=null,raf=null,secs=0;
    const el=overlay("cam-rec"+(video?"":" cam-audio"),
      '<header class="cam-top"><button type="button" class="cam-icon" data-cam-close aria-label="Close recorder">'+X+'</button><strong>'+(video?"Record a video":"Record a voice note")+'</strong><span class="cam-rec-badge" aria-live="polite"><i></i><b>0:00</b></span></header>'+
      '<div class="cam-stage">'+(video?'<video playsinline muted autoplay></video>':'<div class="cam-meter" aria-hidden="true">'+Array.from({length:28},()=>'<i></i>').join("")+'</div>')+'<div class="cam-review"></div></div>'+
      (prompts.length?'<div class="cam-prompts rec-prompts"><span class="cam-prompts-h">'+escHtml(opts.promptsTitle||(video?"Things to capture":"Things to mention"))+'</span><p>'+prompts.map((p,i)=>'<span class="rec-term" data-term="'+i+'">'+escHtml(p)+'</span>').join('<span class="cam-dot" aria-hidden="true"> · </span>')+'</p></div>':"")+
      (opts.transcribe&&SR?'<p class="rec-live" aria-live="polite" hidden></p>':"")+
      (video?'<p class="cam-consent">Film your work. Ask first if anyone else will be in shot.</p>':"")+
      '<p class="cam-hint">'+(video?"Tap the red button to start. Talk about what you’re doing as you film. Up to "+mins+".":"Tap the red button and talk it through in your own words. Up to "+mins+".")+'</p>'+
      '<footer class="cam-bottom"><button type="button" class="cam-alt" data-retake hidden>Retake</button><button type="button" class="cam-record" aria-label="Start recording"><i></i><svg class="cam-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/></svg></button><button type="button" class="cam-done" data-keep hidden>Keep</button></footer>');
    const live=el.querySelector("video"),rec=el.querySelector(".cam-record"),badge=el.querySelector(".cam-rec-badge b"),hint=el.querySelector(".cam-hint"),review=el.querySelector(".cam-review");
    const keepBtn=el.querySelector("[data-keep]"),retake=el.querySelector("[data-retake]"),ring=el.querySelector(".cam-ring circle");
    const fmt=s=>Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0");
    const liveEl=el.querySelector(".rec-live"),terms=[...el.querySelectorAll(".rec-term")];
    /* Things to mention light up once they've been said. */
    const tick=()=>{const t=transcript();if(liveEl){liveEl.hidden=!t;liveEl.textContent=t.length>160?"…"+t.slice(-160):t}
      if(window.eviaTermMatched)terms.forEach(x=>x.classList.toggle("said",window.eviaTermMatched(prompts[+x.dataset.term],t)))};
    const listen=()=>{
      if(!opts.transcribe||!SR)return;
      try{
        sr=new SR();sr.lang="en-GB";sr.continuous=true;sr.interimResults=true;listening=true;
        sr.onresult=e=>{interim="";for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i];if(r.isFinal)heard+=" "+r[0].transcript;else interim+=" "+r[0].transcript}tick()};
        sr.onerror=()=>{};
        sr.onend=()=>{if(listening)try{sr.start()}catch(_){}};
        sr.start();
      }catch(_){sr=null}
    };
    const deaf=()=>{listening=false;if(sr)try{sr.stop()}catch(_){}interim="";tick()};
    /* Where the MP4 recorder above can't run, MediaRecorder. Android and computers: WebM with Opus sound (Chrome's own
       MP4 recordings can carry Opus sound that players reject). iPhones and iPads: MP4 with AAC sound, as Safari records. */
    const ua=navigator.userAgent||"",apple=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)||(/Safari/.test(ua)&&!/Chrome|Chromium|CriOS|Android|Edg/.test(ua));
    const WEBM=video?["video/webm;codecs=vp8,opus","video/webm;codecs=vp9,opus","video/webm"]:["audio/webm;codecs=opus","audio/webm"];
    const MP4=video?["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4;codecs=avc1,mp4a","video/mp4"]:["audio/mp4;codecs=mp4a.40.2","audio/mp4"];
    const pickMime=()=>(apple?MP4.concat(WEBM):WEBM.concat(MP4)).find(x=>window.MediaRecorder&&MediaRecorder.isTypeSupported(x))||"";
    const meter=()=>{
      if(video||!stream)return;
      try{
        audioCtx=new (window.AudioContext||window.webkitAudioContext)();const an=audioCtx.createAnalyser();an.fftSize=64;audioCtx.createMediaStreamSource(stream).connect(an);
        const data=new Uint8Array(an.frequencyBinCount),bars=[...el.querySelectorAll(".cam-meter i")];
        const draw=()=>{an.getByteFrequencyData(data);bars.forEach((b,i)=>{const v=data[Math.min(data.length-1,i)]/255;b.style.transform="scaleY("+Math.max(.08,v).toFixed(2)+")"});raf=requestAnimationFrame(draw)};draw();
      }catch(_){}
    };
    const setState=s=>{el.dataset.state=s;rec.setAttribute("aria-label",s==="recording"?"Stop recording":"Start recording")};
    const getStream=async()=>{
      if(stream)return stream;
      stream=await navigator.mediaDevices.getUserMedia(video?{video:{facingMode:{ideal:"environment"},width:{ideal:1080},height:{ideal:1080}},audio:true}:{audio:true});
      if(live){live.srcObject=stream;live.play().catch(()=>{})}
      meter();return stream;
    };
    const stop=()=>{if(recorder&&recorder.state!=="inactive")recorder.stop();clearInterval(timer);deaf()};
    const start=async()=>{
      try{await getStream()}catch(err){console.error("Evia recorder failed",err);denied(el,err,video?"camera and microphone":"microphone");rec.disabled=true;return}
      rec.disabled=true;recorder=await mp4Recorder(stream,video);rec.disabled=false;
      if(!recorder){
        const chosen=pickMime(),o={};if(chosen)o.mimeType=chosen;
        if(video){o.videoBitsPerSecond=1500000;o.audioBitsPerSecond=64000}else o.audioBitsPerSecond=128000;
        try{recorder=new MediaRecorder(stream,o)}catch(_){recorder=new MediaRecorder(stream)}
      }
      mime=recorder.mimeType||(video?"video/webm":"audio/webm");chunks=[];
      recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
      recorder.onstop=()=>{
        blob=new Blob(chunks,{type:mime.split(";")[0]});chunks=[];
        if(!blob.size){blob=null;setState("ready");hint.textContent="Evia couldn’t save that one. Tap the red button to try again.";return}
        setState("review");buzz(20);
        const url=URL.createObjectURL(blob);
        review.innerHTML=video?'<video src="'+url+'" controls playsinline></video>':'<audio src="'+url+'" controls></audio>';
        hint.textContent="Play it back, then keep it or record again.";keepBtn.hidden=false;retake.hidden=false;
      };
      recorder.start(1000);started=Date.now();setState("recording");buzz(20);listen();
      hint.textContent="Recording… tap the square to stop.";
      timer=setInterval(()=>{
        const s=(Date.now()-started)/1000;badge.textContent=fmt(s);secs=Math.round(s);
        const left=limit-s;el.classList.toggle("cam-ending",left<=15);
        if(left<=15&&ring)ring.style.strokeDashoffset=String(289*(1-Math.max(0,left)/15));
        if(left<=0)stop();
      },250);
    };
    rec.onclick=()=>{if(el.dataset.state==="recording")stop();else if(el.dataset.state!=="review")start()};
    retake.onclick=()=>{review.innerHTML="";blob=null;heard="";interim="";tick();badge.textContent="0:00";keepBtn.hidden=true;retake.hidden=true;el.classList.remove("cam-ending");if(ring)ring.style.strokeDashoffset="0";setState("ready");hint.textContent="Tap the red button to start again."};
    const cleanup=()=>{clearInterval(timer);deaf();if(raf)cancelAnimationFrame(raf);if(audioCtx)audioCtx.close().catch(()=>{});closeOverlay(el,stream)};
    keepBtn.onclick=()=>{const b=blob,m=mime,info={secs,transcript:transcript()};cleanup();if(b&&opts.onDone)opts.onDone(b,m,info)};
    el.querySelector("[data-cam-close]").onclick=()=>{if(el.dataset.state==="recording"&&!confirm("Stop and discard this recording?"))return;if(recorder&&recorder.state!=="inactive"){recorder.onstop=null;recorder.stop()}cleanup()};
    setState("ready");
    if(video)getStream().catch(err=>{console.error("Evia recorder failed",err);denied(el,err,"camera and microphone");rec.disabled=true});
  }

  function fmtLimit(s){return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
  window.eviaCamera={open:openCamera,supported};
  /* Videos and voice notes are switched off for now: they take up too much storage. true brings them all back. */
  window.eviaRecordings=false;
  window.eviaRecorder={open:openRecorder,supported:()=>window.eviaRecordings&&supported()&&!!window.MediaRecorder};
})();
