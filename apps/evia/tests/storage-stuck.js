/* Evia's storage not answering (just after site data is cleared, or locked by another tab of the same site): Evia
   still starts, on localStorage, instead of an empty page and "Evia didn't start properly".
   Run: node tests/storage-stuck.js */
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
  const browser=await chromium.launch();
  const page=await (await browser.newContext({...devices["Pixel 7"],serviceWorkers:"block"})).newPage();
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  try{
    /* Evia's own database never answers. */
    await page.addInitScript(()=>{const open=indexedDB.open.bind(indexedDB);indexedDB.open=function(name,...a){if(name==="evia7-app-data")return {set onsuccess(f){},set onerror(f){},set onblocked(f){},set onupgradeneeded(f){}};return open(name,...a)}});
    await page.goto(url);
    await page.waitForFunction(()=>typeof render==="function"&&document.getElementById("screen")&&document.getElementById("screen").textContent.trim().length>0,null,{timeout:12000});
    await page.waitForTimeout(6000);
    const r=await page.evaluate(()=>({card:/didn.t start properly/.test(document.body.innerText),text:document.getElementById("screen").innerText.slice(0,80)}));
    check("When Evia's storage doesn't answer, she still starts (no empty page, no \"didn't start properly\")",!r.card&&r.text.length>0,JSON.stringify(r));
    await page.evaluate(()=>localStorage.setItem("evia7-probe","kept"));
    check("…and saves to the phone's other storage meanwhile",await page.evaluate(()=>localStorage.getItem("evia7-probe")==="kept"));
    check("No script errors",!errors.length,errors.join(" | "));
  }catch(e){check("The test ran to the end",false,e.stack+" | "+errors.join(" | "))}
  await browser.close();server.close();
  const failed=results.filter(x=>!x).length;
  console.log(failed?"\n"+failed+" check(s) failed.":"\nAll "+results.length+" checks passed.");
  process.exit(failed?1:0);
})();
