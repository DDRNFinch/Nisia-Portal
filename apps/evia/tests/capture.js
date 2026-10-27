/* Skills and Knowledge: the learner chooses how to gather a topic's evidence. Skills is photos and videos, mapped to the
   topic's S criteria only; Knowledge is a write-up and voice notes, mapped to its K and B criteria. Each is submitted on
   its own, and the other part carries on. Videos and voice notes are kept small.   Run: node tests/capture.js */
const http=require("http"),fs=require("fs"),path=require("path");
let playwright;
try{playwright=require("playwright")}catch(_){playwright=require(require("child_process").execSync("npm root -g").toString().trim()+"/playwright")}
const {chromium,devices}=playwright;
const root=path.join(__dirname,"..");
const TYPES={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".woff2":"font/woff2",".jpg":"image/jpeg"};
const results=[];
const check=(name,ok,detail)=>{results.push(!!ok);console.log((ok?"✓ ":"✗ ")+name+(ok||!detail?"":" — "+String(detail).slice(0,600)))};
(async()=>{
  const server=http.createServer((req,res)=>{
    const file=path.join(root,decodeURIComponent(req.url.split("?")[0]).replace(/\/$/,"/index.html"));
    if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end()}
    res.writeHead(200,{"Content-Type":TYPES[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);
  }).listen(0);
  const url="http://localhost:"+server.address().port+"/";
  const browser=await chromium.launch({args:["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"]});
  const page=await (await browser.newContext({...devices["Pixel 7"],serviceWorkers:"block",permissions:["camera","microphone"]})).newPage();
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  try{
    await page.goto(url+"manifest.json");
    await page.evaluate(()=>{localStorage.clear();sessionStorage.setItem("evia7-install-later","1");["evia7-theme-picked","evia7-shape-picked"].forEach(k=>localStorage.setItem(k,"1"));
      localStorage.setItem("evia7-onboarding",'{"stage":"done"}');localStorage.setItem("evia7-tips-seen",'["*"]');
      localStorage.setItem("evia7-profile",JSON.stringify({name:"Callum Test",start:"2026-01-05",end:"2027-12-01"}))});
    await page.goto(url);await page.waitForTimeout(2500);
    await page.evaluate(()=>{const w=document.getElementById("welcome-screen");if(w)w.remove();document.getElementById("app").classList.remove("welcome-app-hidden");openUnit(0)});
    await page.waitForSelector("#sk-start");
    const cards=await page.evaluate(()=>({sk:document.querySelector("#sk-start").textContent,kn:document.querySelector("#kn-start").textContent,
      old:!!document.querySelector("#eg-start,#fr-start,#rec-start"),anim:!!document.querySelector("#sk-start .ra-skills .ra-cam")&&!!document.querySelector("#kn-start .ra-knowledge .ra-mic")}));
    check("A topic offers Skills (photos and videos) and Knowledge (written and audio) instead of guided and free range, each with its own Evia",
      /Skills/.test(cards.sk)&&/Photos and videos/.test(cards.sk)&&/Knowledge/.test(cards.kn)&&/voice note/.test(cards.kn)&&!cards.old&&cards.anim,JSON.stringify(cards));
    /* Skills: only the S criteria are listed; a photo from the gallery and a short video. */
    await page.click("#sk-start");await page.waitForSelector(".cx-crit li");
    const sCodes=await page.$$eval(".cx-crit li b",x=>x.map(e=>e.textContent));
    const unitCodes=await page.evaluate(()=>data().u[0][1].map(code));
    check("Skills lists only the topic's S criteria",sCodes.length&&sCodes.every(c=>/^S/.test(c))&&sCodes.length===unitCodes.filter(c=>/^S/.test(c)).length,JSON.stringify({sCodes,unitCodes}));
    const jpg=await page.evaluate(async()=>{const c=document.createElement("canvas");c.width=800;c.height=600;const g=c.getContext("2d");g.fillStyle="#a33";g.fillRect(0,0,800,600);
      return [...new Uint8Array(await (await new Promise(r=>c.toBlob(r,"image/jpeg"))).arrayBuffer())]});
    const [chooser]=await Promise.all([page.waitForEvent("filechooser"),page.click("text=Add photos from gallery")]);
    await chooser.setFiles({name:"wall.jpg",mimeType:"image/jpeg",buffer:Buffer.from(jpg)});await page.waitForTimeout(1200);
    await page.click("text=Film a video");await page.waitForSelector(".cam-record");await page.waitForTimeout(1500);
    await page.click(".cam-record");await page.waitForTimeout(6000);await page.click(".cam-record");
    await page.waitForSelector("[data-keep]:not([hidden])",{timeout:15000});await page.click("[data-keep]");await page.waitForTimeout(1500);
    const sk=await page.evaluate(()=>({say:document.querySelector(".eg-say").textContent,submit:[...document.querySelectorAll(".eg-actions button")].some(b=>/Submit skills/.test(b.textContent))}));
    check("…a photo from the gallery and a video are kept in Skills, ready to submit",/1 photo and 1 video/.test(sk.say)&&sk.submit,JSON.stringify(sk));
    /* Knowledge: only K and B; write some, and a voice note. */
    await page.click("#eg-close");await page.waitForTimeout(500);await page.click("#kn-start");await page.waitForSelector("#write");
    const kCodes=await page.$$eval(".cx-crit li b",x=>x.map(e=>e.textContent));
    check("Knowledge lists only the topic's K and B criteria",kCodes.length&&kCodes.every(c=>/^[KB]/.test(c))&&kCodes.length===unitCodes.filter(c=>/^[KB]/.test(c)).length,JSON.stringify(kCodes));
    await page.fill("#write","Gauging means measuring the sand and cement by volume so every mix is the same ratio, like 4 to 1.");
    await page.click(".eg-actions button:has-text(\"Voice note\")");await page.waitForSelector(".cam-record");await page.waitForTimeout(800);
    await page.click(".cam-record");await page.waitForTimeout(6000);await page.click(".cam-record");
    await page.waitForSelector("[data-keep]:not([hidden])",{timeout:15000});await page.click("[data-keep]");await page.waitForTimeout(1500);
    const kn=await page.evaluate(()=>({chips:document.querySelectorAll(".eg-sheet .ev-media-chip.audio").length,text:document.querySelector("#write").value}));
    check("…written words and a voice note are kept in Knowledge (and the writing is still there after recording)",kn.chips===1&&/Gauging/.test(kn.text),JSON.stringify(kn));
    await page.click("#eg-close");await page.waitForTimeout(600);
    const prog=await page.evaluate(()=>[...document.querySelectorAll(".cx-progress .evidence-section-title")].map(x=>x.textContent).join());
    check("The topic page shows Skills and Knowledge in progress, each with its own Submit",/SKILLS IN PROGRESS/.test(prog)&&/KNOWLEDGE IN PROGRESS/.test(prog)&&!!(await page.$("#submit-skills"))&&!!(await page.$("#submit-knowledge")),prog);
    /* Sizes, read before submitting. */
    const sizes=await page.evaluate(async()=>{const P=JSON.parse(localStorage.getItem("evia7-working-evidence-packs"));const pack=Object.values(P)[0];
      const out={};for(const m of pack.media){const b=await new Promise(r=>{const q=indexedDB.open("evia7-evidence-db");q.onsuccess=()=>{const g=q.result.transaction("photos").objectStore("photos").get(m.id);g.onsuccess=()=>r(g.result.blob)}});
        out[m.kind]={kb:Math.round(b.size/1024),secs:m.secs,perMinMB:+(b.size/Math.max(1,m.secs)*60/1048576).toFixed(2),type:b.type}}return out});
    check("Videos are small (under 8 MB a minute) and voice notes tiny (under 0.6 MB a minute)",sizes.video&&sizes.video.perMinMB<8&&sizes.audio&&sizes.audio.perMinMB<0.6,JSON.stringify(sizes));
    console.log("   sizes: "+JSON.stringify(sizes));
    /* Submit Skills: an evidence record with the photo and video, mapped to S only; Knowledge stays in progress. */
    await page.click("#submit-skills");await page.waitForTimeout(1500);
    const a=await page.evaluate(()=>{const e=evidence[evidence.length-1];return {kind:e.kind,k:e.k,photos:(e.photoIds||[]).length,media:(e.media||[]).map(m=>m.kind),w:e.w,
      knowStill:!!document.querySelector("#submit-knowledge"),skillsGone:!document.querySelector("#submit-skills")}});
    check("Submitting Skills saves the photos and video as evidence mapped to S criteria only, and Knowledge carries on",
      a.kind==="skills"&&a.k.length&&a.k.every(c=>/^S/.test(c))&&a.photos===1&&a.media.join()==="video"&&!a.w&&a.knowStill&&a.skillsGone,JSON.stringify(a));
    await page.click("#submit-knowledge");await page.waitForTimeout(1500);
    const b=await page.evaluate(()=>{const e=evidence[evidence.length-1];return {n:evidence.length,kind:e.kind,k:e.k,photos:(e.photoIds||[]).length,media:(e.media||[]).map(m=>m.kind),w:e.w,
      empty:!document.querySelector(".cx-progress"),pack:Object.values(JSON.parse(localStorage.getItem("evia7-working-evidence-packs")||"{}")).filter(p=>(p.photos||[]).length||(p.media||[]).length||String(p.write||"").trim()).length}});
    check("Submitting Knowledge saves the writing and voice note mapped to K and B criteria only, and the topic is clear again",
      b.n===2&&b.kind==="knowledge"&&b.k.length&&b.k.every(c=>/^[KB]/.test(c))&&b.photos===0&&b.media.join()==="audio"&&/Gauging/.test(b.w)&&b.empty&&b.pack===0,JSON.stringify(b));
    /* The PDF says which it is. */
    const pdf=await page.evaluate(async()=>{const u=data().u[0][0];const blob=await window.eviaBuildUnitPdf(u,evidence.slice(),[[],[]]);const t=new Uint8Array(await blob.arrayBuffer());let s="";t.forEach(c=>s+=String.fromCharCode(c));return s.length});
    check("The unit PDF still builds with both",pdf>1000,String(pdf));
    /* Share all: every file labelled with a type and name Chrome on Android shares (it refuses the whole share if one
       isn't), including a voice note and a video as an Android phone makes them (MP4). */
    const CHROME_TYPES=["application/pdf","audio/flac","audio/mp3","audio/mpeg","audio/ogg","audio/wav","audio/webm","audio/x-m4a","image/avif","image/bmp","image/gif","image/jpeg","image/png","image/svg+xml","image/tiff","image/webp","image/x-icon","image/x-ms-bmp","image/x-xbitmap","text/comma-separated-values","text/css","text/csv","text/html","text/plain","video/mp4","video/mpeg","video/ogg","video/webm"];
    const CHROME_EXT=["avif","bmp","css","csv","flac","gif","htm","html","ico","jfif","jpeg","jpg","m4a","m4v","mp3","mp4","mpeg","mpg","oga","ogg","ogv","opus","pdf","pjp","pjpeg","png","svg","svgz","text","tif","tiff","txt","wav","weba","webm","webp","xbm"];
    const shared=await page.evaluate(async()=>{
      const put=async(type)=>{const id=await window.eviaStoreEvidencePhoto(new Blob([new Uint8Array(200)],{type}));return id};
      const v=await put("video/mp4"),a=await put("audio/mp4");const u=data().u[0][0];
      window.eviaData.put("evidence",{course,unit:u,kind:"skills",text:"",ksbs:["S14"],photoIds:[],media:[{id:v,kind:"video",mime:"video/mp4",secs:5}]});
      window.eviaData.put("evidence",{course,unit:u,kind:"knowledge",text:"",ksbs:["K20"],photoIds:[],media:[{id:a,kind:"audio",mime:"audio/mp4",secs:5,transcript:"Gauging box"}]});
      let got=null;navigator.canShare=()=>true;navigator.share=async d=>{got=d.files.map(f=>({name:f.name,type:f.type}))};
      window.eviaOpenSendToPortfolio(u);
      for(let i=0;i<80&&!document.getElementById("eport-share-all");i++)await new Promise(r=>setTimeout(r,250));
      const b=document.getElementById("eport-share-all");if(!b)return null;b.click();await new Promise(r=>setTimeout(r,500));return got});
    const bad=(shared||[]).filter(f=>!CHROME_TYPES.includes(f.type)||!CHROME_EXT.includes(f.name.split(".").pop().toLowerCase()));
    check("Share all: every file (PDF, photos, videos, voice notes, what was said) has a type and name Chrome on Android will share",
      shared&&shared.length>=5&&!bad.length&&shared.some(f=>f.type==="audio/x-m4a")&&shared.some(f=>f.type==="video/mp4"),JSON.stringify({bad,shared}));
    await page.screenshot({path:path.join(__dirname,"..","shots","capture-topic.png")}).catch(()=>{});
    check("No script errors",!errors.length,errors.join(" | "));
  }catch(e){check("The test ran to the end",false,e.stack+" | "+errors.join(" | "))}
  await browser.close();server.close();
  const failed=results.filter(x=>!x).length;
  console.log(failed?"\n"+failed+" check(s) failed.":"\nAll "+results.length+" checks passed.");
  process.exit(failed?1:0);
})();
