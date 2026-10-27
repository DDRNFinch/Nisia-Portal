/* Evia's guide: take the photos first, then Complete write-ups goes through them one at a time ("Photo 1: what does it
   show?", with the things to mention and the topic's KSBs). The words go on the PDF beside each numbered photo.
   Run: node tests/writeups.js */
const http=require("http"),fs=require("fs"),path=require("path"),zlib=require("zlib");
let playwright;
try{playwright=require("playwright")}catch(_){playwright=require(require("child_process").execSync("npm root -g").toString().trim()+"/playwright")}
const {chromium,devices}=playwright;
const root=path.join(__dirname,"..");
const TYPES={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".woff2":"font/woff2",".jpg":"image/jpeg"};
const results=[];
const check=(name,ok,detail)=>{results.push(!!ok);console.log((ok?"✓ ":"✗ ")+name+(ok||!detail?"":" — "+String(detail).slice(0,600)))};
/* The words on a PDF's pages, in order. */
const pdfWords=buf=>{let out="";const re=/stream\r?\n([\s\S]*?)endstream/g;let m;while((m=re.exec(buf.toString("latin1")))){
  try{const t=zlib.inflateSync(Buffer.from(m[1],"latin1")).toString("latin1");out+=(t.match(/\((.*?)\) Tj/g)||[]).map(x=>x.slice(1,-4)).join(" | ")+" | "}catch(_){}}return out};
(async()=>{
  const server=http.createServer((req,res)=>{
    const file=path.join(root,decodeURIComponent(req.url.split("?")[0]).replace(/\/$/,"/index.html"));
    if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end()}
    res.writeHead(200,{"Content-Type":TYPES[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res);
  }).listen(0);
  const url="http://localhost:"+server.address().port+"/";
  const browser=await chromium.launch({args:["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"]});
  const page=await (await browser.newContext({...devices["Pixel 7"],serviceWorkers:"block",permissions:["camera"]})).newPage();
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  const sheetButtons=()=>page.$$eval(".eg-sheet .eg-actions button",b=>b.map(x=>x.textContent.trim()));
  try{
    await page.goto(url+"manifest.json");
    await page.evaluate(()=>{localStorage.clear();sessionStorage.setItem("evia7-install-later","1");["evia7-theme-picked","evia7-shape-picked"].forEach(k=>localStorage.setItem(k,"1"));
      localStorage.setItem("evia7-onboarding",'{"stage":"done"}');localStorage.setItem("evia7-tips-seen",'["*"]');
      localStorage.setItem("evia7-profile",JSON.stringify({name:"Callum Test",start:"2026-01-05",end:"2027-12-01"}))});
    await page.goto(url);await page.waitForTimeout(2500);
    await page.evaluate(()=>{const w=document.getElementById("welcome-screen");if(w)w.remove();document.getElementById("app").classList.remove("welcome-app-hidden");openUnit(0)});
    await page.waitForSelector("#eg-start");await page.click("#eg-start");await page.waitForSelector(".eg-shots");
    const first=await sheetButtons();
    check("The guide starts with the photo list: Take photos and Add from gallery (no write-up yet)",first.join()==="Take photos,Add from gallery",JSON.stringify(first));
    const jpg=async colour=>page.evaluate(async c=>{const cv=document.createElement("canvas");cv.width=800;cv.height=600;const g=cv.getContext("2d");g.fillStyle=c;g.fillRect(0,0,800,600);
      return [...new Uint8Array(await (await new Promise(r=>cv.toBlob(r,"image/jpeg"))).arrayBuffer())]},colour);
    const files=[];for(const [i,c] of ["#c33","#3a3","#33c"].entries())files.push({name:"p"+i+".jpg",mimeType:"image/jpeg",buffer:Buffer.from(await jpg(c))});
    const [chooser]=await Promise.all([page.waitForEvent("filechooser"),page.click(".eg-sheet .eg-actions button:has-text('Add from gallery')")]);
    await chooser.setFiles(files);await page.waitForTimeout(2000);
    const after=await sheetButtons();
    check("With photos: Take more photos, Add from gallery and Complete write-ups (no Write it up now, no I'm finished)",after.join()==="Take more photos,Add from gallery,Complete write-ups",JSON.stringify(after));
    await page.click(".eg-sheet .eg-actions button:has-text('Complete write-ups')");await page.waitForSelector("#eg-photo img");
    const q=await page.evaluate(()=>({q:document.querySelector(".eg-q").textContent,ksbs:document.querySelectorAll(".eg-ksbs li").length,mention:document.querySelectorAll(".eg-chip").length,kicker:document.querySelector(".chat-kicker").textContent}));
    check("Complete write-ups shows each photo and asks “Photo 1: what does it show?”, with things to mention and the topic's KSBs",/^Photo 1: what does it show\?$/.test(q.q)&&q.ksbs>0&&q.mention>0&&/PHOTO 1 OF 3/.test(q.kicker),JSON.stringify(q));
    const said=["Gauging the sand with a bucket so the ratio stays the same.","Mixing to 4 to 1 in the mixer until it is an even colour.","The finished mortar on the spot board, ready to use."];
    for(let i=0;i<3;i++){await page.fill("#eg-text",said[i]);await page.click(".eg-sheet .eg-actions button.primary");await page.waitForTimeout(400)}
    const final=await page.evaluate(()=>document.getElementById("eg-final").value);
    check("The write-up is numbered to match the photos",final===said.map((t,i)=>"Photo "+(i+1)+": "+t).join("\n\n"),final);
    await page.click(".eg-sheet .eg-actions button:has-text('Use this write-up')");await page.waitForTimeout(800);
    const opened=await page.evaluate(()=>{const s=document.querySelector("#modal-root .eg-sheet");return s?s.querySelector(".chat-kicker").textContent+" | "+s.querySelector("h2").textContent+" | "+[...s.querySelectorAll("button")].map(b=>b.textContent).join(","):"none"});console.log("   after use:",opened);
    await page.click("#submit-evidence");await page.waitForTimeout(1500);
    const e=await page.evaluate(()=>{const x=evidence[evidence.length-1];return {captions:x.captions,photos:(x.photoIds||[]).length,w:x.w}});
    check("The evidence keeps each photo's words, in photo order",JSON.stringify(e.captions)===JSON.stringify(said)&&e.photos===3,JSON.stringify(e));
    const pdf=await page.evaluate(async()=>{const x=evidence[evidence.length-1];const ph=await window.eviaGetEvidencePhotoData(x);
      const b=await window.eviaBuildUnitPdf(x.u,[x],[ph]);return [...new Uint8Array(await b.arrayBuffer())]});
    const words=pdfWords(Buffer.from(pdf));
    const order=["PHOTO 1",said[0].slice(0,20),"PHOTO 2",said[1].slice(0,20),"PHOTO 3",said[2].slice(0,20)].map(t=>words.indexOf(t));
    check("The PDF shows each numbered photo with its words beside it, in order, and no separate write-up",order.every((x,i)=>x>=0&&(i===0||x>order[i-1]))&&!/WRITE-UP/.test(words),JSON.stringify({order,words:words.slice(0,600)}));
    fs.writeFileSync(path.join(__dirname,"..","shots","writeups.pdf"),Buffer.from(pdf));
    check("No script errors",!errors.length,errors.join(" | "));
  }catch(err){check("The test ran to the end",false,err.stack+" | "+errors.join(" | "))}
  await browser.close();server.close();
  const failed=results.filter(x=>!x).length;
  console.log(failed?"\n"+failed+" check(s) failed.":"\nAll "+results.length+" checks passed.");
  process.exit(failed?1:0);
})();
