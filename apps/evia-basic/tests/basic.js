/* Evia Basic: the whole journey on a phone, with a pretend camera. Topics (2 wide, 10 of them), a topic's things to
   capture, the square camera (photo after photo, Save), the write-up (each photo, what it shows, Save), and the PDF
   in the Portfolio. Evia's help on every page.   Run: node tests/basic.js [screenshot folder] */
const http=require("http"),fs=require("fs"),path=require("path");
let playwright;
try{playwright=require("playwright")}catch(_){playwright=require(require("child_process").execSync("npm root -g").toString().trim()+"/playwright")}
const {chromium,devices}=playwright;
const root=path.join(__dirname,".."),shots=process.argv[2];
const TYPES={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png"};
const results=[];
const check=(name,ok,detail)=>{results.push(!!ok);console.log((ok?"✓ ":"✗ ")+name+(ok||!detail?"":" — "+String(detail).slice(0,600)))};
(async()=>{
  const server=http.createServer((req,res)=>{
    const file=path.join(root,decodeURIComponent(req.url.split("?")[0]).replace(/\/$/,"/index.html"));
    if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end()}
    res.writeHead(200,{"Content-Type":TYPES[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);
  }).listen(0);
  const url="http://localhost:"+server.address().port+"/";
  const browser=await chromium.launch({args:["--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]});
  const ctx=await browser.newContext({...devices["Pixel 7"],serviceWorkers:"block",permissions:["camera"]});
  const page=await ctx.newPage();
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  const snap=async n=>{if(shots)await page.screenshot({path:path.join(shots,n+".png")})};
  try{
    await page.goto(url);await page.waitForSelector(".tile");
    const grid=await page.evaluate(()=>{const t=[...document.querySelectorAll(".tile")],r=t.map(x=>x.getBoundingClientRect());return {n:t.length,cols:new Set(r.map(x=>Math.round(x.left))).size,rows:new Set(r.map(x=>Math.round(x.top))).size,first:t[0].innerText.replace(/\s+/g," "),evia:!!document.querySelector(".top .evia")}});
    check("Home shows the 10 brickwork topics, 2 wide and 5 down, with Evia in the top right",grid.n===10&&grid.cols===2&&grid.rows===5&&/1 Mixing mortar/.test(grid.first)&&grid.evia,JSON.stringify(grid));
    await snap("1-topics");
    await page.click("#evia",{force:true});await page.waitForSelector(".bubble");
    const b=await page.textContent(".bubble");
    check("Tapping Evia shows what to do on this page, in a few words",/Tap a topic/.test(b),b);
    await snap("2-help");await page.click(".bubble button");
    await page.click('.tile[data-t="0"]');await page.waitForSelector(".cap li");
    const cap=await page.evaluate(()=>({n:document.querySelectorAll(".cap li").length,first:document.querySelector(".cap li").innerText,btn:document.getElementById("go-cam").textContent,tabs:document.body.classList.contains("no-tabs")}));
    check("A topic shows what to capture and one Take photos button",cap.n===10&&/Silos/.test(cap.first)&&/Take photos/.test(cap.btn),JSON.stringify(cap));
    await snap("3-topic");
    await page.click("#go-cam");await page.waitForSelector(".cam video");
    await page.waitForFunction(()=>document.querySelector(".cam video").videoWidth>0,null,{timeout:8000});
    for(let k=0;k<3;k++){await page.click(".shutter");await page.waitForTimeout(300)}
    await page.waitForFunction(()=>document.querySelectorAll(".cam-strip img").length===3);
    const sq=await page.evaluate(()=>{const s=document.querySelector(".cam-stage").getBoundingClientRect();return Math.round(s.width)===Math.round(s.height)});
    check("The camera is square, stays open for photo after photo, and counts them",sq&&await page.textContent(".cam-n")==="3 photos");
    await snap("4-camera");
    await page.click(".cam-save");await page.waitForSelector(".wu-row");
    const wu=await page.evaluate(()=>({rows:document.querySelectorAll(".wu-row").length,img:[...document.querySelectorAll(".wu-row img")].every(i=>i.src.startsWith("blob:")),name:!!document.getElementById("nm")}));
    check("Save goes to the write-up: each photo with a box for what it shows",wu.rows===3&&wu.img&&wu.name,JSON.stringify(wu));
    /* Save with a box empty: it says so and goes to it. */
    await page.fill("#nm","Callum Test");
    const tas=await page.$$(".wu-row textarea");await tas[0].fill("Gauging the mix 1 to 4 with buckets.");await tas[1].fill("The mixer and silo, with the water feed.");
    await page.click("#save");await page.waitForSelector(".toast");
    check("Saving with a photo not explained says which, and doesn't save",/Say what 1 photo shows/.test(await page.textContent(".toast"))&&!await page.$(".pf-row"));
    await tas[2].fill("The finished mortar, ready to use, with the area left clean.");
    await snap("5-write");
    await page.click("#save");await page.waitForSelector(".pf-row",{timeout:15000});
    const pf=await page.evaluate(async()=>{const S=window.eviaBasic.state;return {rows:document.querySelectorAll(".pf-row").length,txt:document.querySelector(".pf-row").innerText.replace(/\s+/g," "),isNew:document.querySelector(".pf-row").classList.contains("new"),badge:document.getElementById("pf-n").textContent,drafts:S.drafts[0].photos.length,name:S.name}});
    check("Save makes a PDF and it's in the Portfolio (with the count on the tab), and the topic starts fresh",pf.rows===1&&/Mixing mortar/.test(pf.txt)&&/3 photos/.test(pf.txt)&&pf.isNew&&pf.badge==="1"&&pf.drafts===0&&pf.name==="Callum Test",JSON.stringify(pf));
    await snap("6-portfolio");
    /* The PDF itself. */
    const size=await page.evaluate(async()=>{const id=window.eviaBasic.state.pf[0].id;const r=await new Promise(res=>{const o=indexedDB.open("evia-basic",1);o.onsuccess=()=>{const g=o.result.transaction("files").objectStore("files").get(id);g.onsuccess=()=>res(g.result)}});return r&&r.blob?{size:r.blob.size,type:r.blob.type,head:await r.blob.slice(0,5).text()}:null});
    if(shots){const b64=await page.evaluate(async()=>{const id=window.eviaBasic.state.pf[0].id;const r=await new Promise(res=>{const o=indexedDB.open("evia-basic",1);o.onsuccess=()=>{const g=o.result.transaction("files").objectStore("files").get(id);g.onsuccess=()=>res(g.result)}});return await new Promise(res=>{const f=new FileReader();f.onload=()=>res(f.result.split(",")[1]);f.readAsDataURL(r.blob)})});fs.writeFileSync(path.join(shots,"evidence.pdf"),Buffer.from(b64,"base64"))}
    check("The PDF is a real PDF with the photos in it",size&&size.head==="%PDF-"&&size.size>20000,JSON.stringify(size));
    await page.click('[data-tab="topics"]');await page.waitForSelector(".tile");
    check("Back on Topics, Mixing mortar has a tick",await page.evaluate(()=>document.querySelector('.tile[data-t="0"]').classList.contains("done")));
    /* Photos waiting (taken, not written up yet) show on the tile; the topic offers More and Write up. */
    await page.click('.tile[data-t="1"]');await page.click("#go-cam");await page.waitForFunction(()=>document.querySelector(".cam video")&&document.querySelector(".cam video").videoWidth>0);
    await page.click(".shutter");await page.waitForTimeout(300);await page.click(".cam-save");await page.waitForSelector(".wu-row");
    await page.click("#back");await page.waitForSelector("#go-write");
    const again=await page.evaluate(()=>({have:document.querySelector(".have").textContent,more:document.getElementById("go-cam").textContent,thumbs:document.querySelectorAll("#th img").length}));
    await page.click("#back");await page.waitForSelector(".tile");
    check("Photos not written up yet stay with the topic (More or Write up), and its tile shows it's started",again.have==="1 photo"&&/More/.test(again.more)&&await page.evaluate(()=>document.querySelector('.tile[data-t="1"]').classList.contains("going")),JSON.stringify(again));
    /* Kept after closing the app. */
    await page.reload();await page.waitForSelector(".tile");
    check("Everything is still there after closing and opening again",await page.evaluate(()=>document.querySelector('.tile[data-t="0"]').classList.contains("done")&&document.querySelector('.tile[data-t="1"]').classList.contains("going")&&document.getElementById("pf-n").textContent==="1"));
    check("No script errors",!errors.length,errors.join(" | "));
  }catch(e){check("The test ran to the end",false,e.stack+" | "+errors.join(" | "))}
  await browser.close();server.close();
  const failed=results.filter(x=>!x).length;
  console.log(failed?"\n"+failed+" check(s) failed.":"\nAll "+results.length+" checks passed.");
  process.exit(failed?1:0);
})();
