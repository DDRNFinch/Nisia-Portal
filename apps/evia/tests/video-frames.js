/* A video keeps moving when the camera changes its picture size part-way through (phones do, as the camera settles or
   the phone is turned): every frame is kept in the MP4, not just those the size of the first. The camera here is a
   moving drawing that changes size after a second. (This computer has no AAC sound encoder, so a stand-in makes the
   sound track; the picture is real H.264.)   Run: node tests/video-frames.js */
const http=require("http"),fs=require("fs"),path=require("path");
let playwright;
try{playwright=require("playwright")}catch(_){playwright=require(require("child_process").execSync("npm root -g").toString().trim()+"/playwright")}
const {chromium,devices}=playwright;
const root=path.join(__dirname,"..");
const TYPES={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".woff2":"font/woff2"};
const results=[];
const check=(name,ok,detail)=>{results.push(!!ok);console.log((ok?"✓ ":"✗ ")+name+(ok||!detail?"":" — "+String(detail).slice(0,600)))};
/* The number of pictures in the MP4's video track (its stsz box). */
const videoSamples=buf=>{const v=buf.indexOf("vide"),i=buf.indexOf("stsz",v);return v<0||i<0?0:buf.readUInt32BE(i+12)};
(async()=>{
  const server=http.createServer((req,res)=>{
    const file=path.join(root,decodeURIComponent(req.url.split("?")[0]).replace(/\/$/,"/index.html"));
    if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end()}
    res.writeHead(200,{"Content-Type":TYPES[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);
  }).listen(0);
  const url="http://localhost:"+server.address().port+"/";
  const browser=await chromium.launch();
  const page=await (await browser.newContext({...devices["Pixel 7"],serviceWorkers:"block"})).newPage();
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(()=>{
    /* The camera: a moving square on a canvas, 640x480, then 480x640 after a second (the phone turned). */
    navigator.mediaDevices.getUserMedia=async c=>{
      const cv=document.createElement("canvas");cv.width=640;cv.height=480;const g=cv.getContext("2d");let t=0;
      setTimeout(()=>{cv.width=480;cv.height=640},window.__resizeAt||1e9);
      (function draw(){t++;g.fillStyle="#246";g.fillRect(0,0,cv.width,cv.height);g.fillStyle="#fc0";g.fillRect((t*7)%cv.width,(t*5)%cv.height,60,60);requestAnimationFrame(draw)})();
      const ac=new AudioContext(),o=ac.createOscillator(),d=ac.createMediaStreamDestination();o.connect(d);o.start();
      const s=c&&c.video?cv.captureStream(24):new MediaStream();d.stream.getAudioTracks().forEach(x=>s.addTrack(x));return s;
    };
    /* A stand-in AAC encoder: real timing, placeholder sound. With __audioClock the sound is timed from zero while the
       picture keeps the camera's own clock, as some phones do. */
    window.AudioEncoder=class{constructor(o){this.o=o;this.state="unconfigured";this.n=0}static async isConfigSupported(){return {supported:true}}
      configure(c){this.c=c;this.state="configured"}
      encode(d){const ch=new EncodedAudioChunk({type:"key",timestamp:window.__audioClock?d.timestamp-(this.base=this.base==null?d.timestamp:this.base):d.timestamp,duration:Math.round(d.numberOfFrames/d.sampleRate*1e6),data:new Uint8Array(6)});
        this.o.output(ch,this.n++?{}:{decoderConfig:{codec:"mp4a.40.2",sampleRate:this.c.sampleRate,numberOfChannels:this.c.numberOfChannels,description:new Uint8Array([0x11,0x90])}})}
      async flush(){}close(){this.state="closed"}};
  });
  const record=async(resizeAt,audioClock,noMp4)=>{
    await page.goto(url+"manifest.json");
    await page.evaluate(()=>{localStorage.clear();sessionStorage.setItem("evia7-install-later","1");["evia7-theme-picked","evia7-shape-picked"].forEach(k=>localStorage.setItem(k,"1"));
      localStorage.setItem("evia7-onboarding",'{"stage":"done"}');localStorage.setItem("evia7-tips-seen",'["*"]')});
    await page.goto(url);await page.waitForTimeout(2000);
    await page.evaluate(([r,a,n])=>{window.__resizeAt=r;window.__audioClock=a||0;if(n)window.AudioEncoder=undefined;window.eviaRecorder.open({type:"video",limit:60,transcribe:true,onDone:async(b,m)=>{window.__out={type:m,bytes:[...new Uint8Array(await b.arrayBuffer())],url:URL.createObjectURL(b)}}})},[resizeAt,audioClock,noMp4]);
    await page.waitForSelector(".cam-record");await page.waitForTimeout(600);
    await page.click(".cam-record");await page.waitForTimeout(4000);await page.click(".cam-record");
    await page.waitForSelector("[data-keep]:not([hidden])",{timeout:15000});await page.click("[data-keep]");
    await page.waitForFunction(()=>!!window.__out,null,{timeout:10000});
    const o=await page.evaluate(()=>window.__out);
    /* Played back with ffmpeg (the browser's own player stops at the stand-in sound): the picture at 0.5 s and at 2.5 s
       compared (the square moves), the size, and when the picture starts and ends. */
    const cp=require("child_process"),os=require("os"),tmp=fs.mkdtempSync(path.join(os.tmpdir(),"evia-v-")),f=path.join(tmp,"v.mp4");
    fs.writeFileSync(f,Buffer.from(o.bytes));
    const probe=JSON.parse(cp.execFileSync("ffprobe",["-v","error","-select_streams","v","-show_entries","stream=width,height,start_time,duration","-of","json",f]).toString()).streams[0]||{};
    const grab=t=>{try{return cp.execFileSync("ffmpeg",["-v","quiet","-ss",String(t),"-i",f,"-frames:v","1","-f","rawvideo","-pix_fmt","gray","-"],{maxBuffer:1<<26}).toString("base64")}catch(_){return ""}};
    const a=grab(.5),b=grab(2.5);fs.rmSync(tmp,{recursive:true,force:true});
    const play={w:probe.width,h:probe.height,start:+(+probe.start_time).toFixed(2),dur:+(+probe.duration).toFixed(1),moves:!!a&&!!b&&a!==b};
    return {type:o.type,frames:videoSamples(Buffer.from(o.bytes)),...play};
  };
  try{
    const steady=await record(1e9);console.log("   "+JSON.stringify(steady));
    check("A 4-second video is an MP4 with a moving picture (about 24 pictures a second) when played back",/video\/mp4/.test(steady.type)&&steady.frames>=60&&steady.moves,JSON.stringify(steady));
    const turned=await record(1500);
    check("…and it keeps moving when the camera changes size part-way through (every picture kept)",/video\/mp4/.test(turned.type)&&turned.frames>=60&&turned.moves,JSON.stringify(turned));
    const clocks=await record(1e9,1);console.log("   "+JSON.stringify(clocks));
    check("…and when the phone times the sound and the picture with different clocks, the picture still plays from the start",clocks.moves&&clocks.start<.5&&clocks.dur<8,JSON.stringify(clocks));
    const webm=await record(1500,0,true);
    check("On a phone that can't make MP4, the video (WebM) is square too and keeps moving",/webm/.test(webm.type)&&webm.w===720&&webm.h===720&&webm.moves,JSON.stringify(webm));
    check("Videos are square (1:1), like the photos",steady.w>0&&steady.w===steady.h&&turned.w===turned.h,JSON.stringify({steady,turned}));
    const beep=await page.evaluate(()=>{const ua=navigator.userAgent;return /Android/.test(ua)});
    check("On a phone, nothing listens for speech while recording (Android's beeps every few seconds)",beep&&!(await page.evaluate(()=>!!document.querySelector(".rec-live"))));
    check("No script errors",!errors.length,errors.join(" | "));
  }catch(e){check("The test ran to the end",false,e.stack+" | "+errors.join(" | "))}
  await browser.close();server.close();
  const failed=results.filter(x=>!x).length;
  console.log(failed?"\n"+failed+" check(s) failed.":"\nAll "+results.length+" checks passed.");
  process.exit(failed?1:0);
})();
