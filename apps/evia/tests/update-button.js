/* Update available: when a new version of Evia is published while it's open, it downloads in the background and a
   button says so; Evia never reloads by itself. Tapping the button switches to the new version. A copy of Evia is
   served here, and its version changed while it's open.   Run: node tests/update-button.js */
const http=require("http"),fs=require("fs"),path=require("path");
let playwright;
try{playwright=require("playwright")}catch(_){playwright=require(require("child_process").execSync("npm root -g").toString().trim()+"/playwright")}
const {chromium,devices}=playwright;
const root=path.join(__dirname,"..");
const TYPES={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".woff2":"font/woff2",".jpg":"image/jpeg"};
const results=[];
const check=(name,ok,detail)=>{results.push(!!ok);console.log((ok?"✓ ":"✗ ")+name+(ok||!detail?"":" — "+String(detail).slice(0,600)))};
let version=null; /* when set, the service worker served is this "new" version */
(async()=>{
  const server=http.createServer((req,res)=>{
    const file=path.join(root,decodeURIComponent(req.url.split("?")[0]).replace(/\/$/,"/index.html"));
    if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end()}
    if(/sw-v16\.js$/.test(file)&&version){res.writeHead(200,{"Content-Type":"text/javascript","Cache-Control":"no-store"});
      return res.end(fs.readFileSync(file,"utf8").replace(/const VERSION = "[^"]*"/,'const VERSION = "'+version+'"'))}
    res.writeHead(200,{"Content-Type":TYPES[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"});fs.createReadStream(file).pipe(res);
  }).listen(0);
  const url="http://localhost:"+server.address().port+"/";
  const browser=await chromium.launch();
  const page=await (await browser.newContext({...devices["Pixel 7"]})).newPage();
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  try{
    await page.goto(url+"manifest.json");
    await page.evaluate(()=>{localStorage.clear();sessionStorage.setItem("evia7-install-later","1");["evia7-theme-picked","evia7-shape-picked"].forEach(k=>localStorage.setItem(k,"1"));
      localStorage.setItem("evia7-onboarding",'{"stage":"done"}');localStorage.setItem("evia7-tips-seen",'["*"]')});
    await page.goto(url);await page.waitForFunction(()=>navigator.serviceWorker&&navigator.serviceWorker.controller,null,{timeout:60000}).catch(()=>{});
    await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:60000});
    const v1=await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return r&&r.active&&r.active.scriptURL});
    check("Evia runs from its saved copy, with no update button",!!v1&&!(await page.$(".app-update")),v1);
    /* A new version is published while Evia is open. */
    await page.evaluate(()=>{window.__still=1});
    version="2099-01-01-evia7-test";
    await page.evaluate(()=>{Object.defineProperty(document,"hidden",{configurable:true,get:()=>false});document.dispatchEvent(new Event("visibilitychange"))});
    const shown=await page.waitForSelector(".app-update",{timeout:60000}).then(()=>true).catch(()=>false);
    await page.waitForTimeout(3000);
    const stayed=await page.evaluate(()=>window.__still===1&&/Update available/.test(document.querySelector(".app-update").textContent));
    check("A new version downloads in the background: Update available shows, and Evia doesn't reload by itself",shown&&stayed,JSON.stringify({shown,stayed}));
    await Promise.all([page.waitForNavigation({timeout:20000}).catch(()=>{}),page.click(".app-update")]);
    await page.waitForTimeout(2500);
    const after=await page.evaluate(async()=>({still:window.__still===1,cache:(await caches.keys()).join(),button:!!document.querySelector(".app-update")}));
    check("Tapping it switches to the new version (and the button goes)",!after.still&&/2099-01-01-evia7-test/.test(after.cache)&&!after.button,JSON.stringify(after));
    check("No script errors",!errors.length,errors.join(" | "));
  }catch(e){check("The test ran to the end",false,e.stack+" | "+errors.join(" | "))}
  await browser.close();server.close();
  const failed=results.filter(x=>!x).length;
  console.log(failed?"\n"+failed+" check(s) failed.":"\nAll "+results.length+" checks passed.");
  process.exit(failed?1:0);
})();
