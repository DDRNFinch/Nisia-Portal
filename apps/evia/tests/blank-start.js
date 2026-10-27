/* Evia opening on an empty page: it goes to Topics by itself, and only if that doesn't show either does it say "Evia
   didn't start properly", with what it was trying to show (the page, the course, the pack) and its own warnings, so a
   screenshot says why.   Run: node tests/blank-start.js */
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
  const open=async(breakTopics)=>{
    const page=await (await browser.newContext({...devices["Pixel 7"],serviceWorkers:"block"})).newPage();
    await page.goto(url+"manifest.json");
    await page.evaluate(()=>{localStorage.clear();sessionStorage.setItem("evia7-install-later","1");["evia7-theme-picked","evia7-shape-picked"].forEach(k=>localStorage.setItem(k,"1"));
      localStorage.setItem("evia7-onboarding",'{"stage":"done"}');localStorage.setItem("evia7-tips-seen",'["*"]');localStorage.setItem("evia7-profile",JSON.stringify({name:"Callum Test"}))});
    await page.addInitScript(b=>{window.__breakTopics=b},breakTopics);
    await page.goto(url);
    /* Something leaves the page empty as Evia opens (and, the second time, Topics doesn't draw either). */
    await page.waitForFunction(()=>typeof nav==="function"&&document.getElementById("screen")&&document.getElementById("screen").textContent.trim(),null,{timeout:15000});
    await page.evaluate(()=>{const w=document.getElementById("welcome-screen");if(w)w.remove();document.getElementById("app").classList.remove("welcome-app-hidden");
      if(window.__breakTopics){window.courses=window.learning=window.progress=window.render=function(){};}
      console.warn("Evia: pack","topics couldn't be matched");
      screen="somewhere";document.getElementById("screen").innerHTML=""});
    await page.waitForTimeout(9000);
    return page;
  };
  try{
    const a=await open(false);
    const r=await a.evaluate(()=>({card:/didn.t start properly/.test(document.body.textContent),screen,text:document.getElementById("screen").innerText.slice(0,60)}));
    check("An empty page as Evia opens goes to Topics by itself, with no warning",!r.card&&r.screen==="course"&&r.text.length>0,JSON.stringify(r));
    const b=await open(true);
    const t=await b.evaluate(()=>{const c=document.querySelector("#screen pre");return c?c.textContent:"NO CARD: "+JSON.stringify({screen,html:document.getElementById("screen").innerHTML.slice(0,200),errs:window.eviaErrors.list().slice(-3).map(x=>x.message)})});
    check("If Topics doesn't show either, the message says what Evia was showing (page, course, pack) and its own warnings",
      /evia7-v\d+/.test(t)&&/page: (course|somewhere)/.test(t)&&/course: bricklayer · enrolled on/.test(t)&&/pack: Evia's own · topics shown: 10/.test(t)&&/Evia: pack topics couldn't be matched/.test(t),t);
  }catch(e){check("The test ran to the end",false,e.stack)}
  await browser.close();server.close();
  const failed=results.filter(x=>!x).length;
  console.log(failed?"\n"+failed+" check(s) failed.":"\nAll "+results.length+" checks passed.");
  process.exit(failed?1:0);
})();
