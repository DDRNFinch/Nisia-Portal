/* Evia made simple (tester): Evia opens by itself after 3 seconds, and the first tab says what to do this week, the
   one next job with a Start button straight into Evia's photo list, and where each topic is in plain words.
   Run: node tests/simple.js */
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
  const open=async extra=>{
    const page=await (await browser.newContext({...devices["Pixel 7"],serviceWorkers:"block"})).newPage();
    const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(/Evia: simple/.test(m.text()))errors.push(m.text())});
    await page.goto(url+"manifest.json");
    await page.evaluate(extra=>{localStorage.clear();sessionStorage.setItem("evia7-install-later","1");["evia7-theme-picked","evia7-shape-picked"].forEach(k=>localStorage.setItem(k,"1"));
      localStorage.setItem("evia7-onboarding",'{"stage":"done"}');localStorage.setItem("evia7-tips-seen",'["*"]');localStorage.setItem("evia7-course","bricklayer");
      localStorage.setItem("evia7-profile",JSON.stringify({name:"Callum Test",start:"2026-04-09",end:"2028-04-08"}));
      Object.entries(extra||{}).forEach(([k,v])=>localStorage.setItem(k,JSON.stringify(v)))},extra);
    await page.goto(url);
    return {page,errors};
  };
  try{
    /* Callum: one piece this week, 2.5 hours logged, a pack started on Repair brick walling. */
    const {page,errors}=await open({"evia7-evidence":[{id:"e2",c:"bricklayer",u:"Jointing Styles",w:"I did a bucket handle joint.",photoCount:3,k:["S1"],savedAt:new Date().toISOString(),createdAt:Date.now()}],
      "evia7-hours":[{id:"h1",n:2.5,description:"Toolbox talk",createdAt:Date.now(),on:Date.now()}],
      "evia7-working-evidence-packs":{"bricklayer|Repair brick walling":{photos:[{id:"x"}],write:""}}});
    await page.waitForTimeout(1500);
    const w1=await page.evaluate(()=>!!document.getElementById("welcome-screen"));
    await page.waitForTimeout(3000);
    const w2=await page.evaluate(()=>!!document.getElementById("welcome-screen")),shown=await page.evaluate(()=>!document.getElementById("app").classList.contains("welcome-app-hidden"));
    check("Evia's welcome opens the app by itself after 3 seconds",w1&&!w2&&shown,JSON.stringify({w1,w2,shown}));
    const t=await page.evaluate(()=>{const h=document.querySelector(".sm-home");return h?h.innerText:"NO HOME"});
    check("The first tab, Home, says what to do this week, ticking off what's done",/1 of 3 done/.test(t)&&/Evidence added\s+Jointing Styles/.test(t)&&/2h:30m of 6h this week/.test(t)&&/Do one 5-minute lesson/.test(t)&&
      await page.evaluate(()=>document.querySelector("#ui-course-head h1").textContent==="Home"&&document.querySelector('[data-nav="course"] span:last-child').textContent==="Home"),t);
    check("The next job is the pack they started, to finish and submit",/YOUR NEXT JOB\s+Repair brick walling/i.test(t)&&/Carry on/.test(t),t);
    const rows=await page.$$eval(".th-row[data-u]",r=>r.map(b=>b.innerText.replace(/\s+/g," ")));
    check("Each topic says where it is in words, and the next job is marked",/Jointing Styles Add more photos and words · 1 piece/.test(rows[1])&&/Repair brick walling Started: finish it and submit.*Next/.test(rows[2])&&/Basic Brick wall Not started/.test(rows[3]),rows.slice(0,4).join(" | "));
    check("No script errors",!errors.length,errors.join(" | "));
    /* Nothing started: Start goes straight into Evia's photo list for the first topic. */
    const b=await open({});
    await b.page.waitForTimeout(4500);await b.page.waitForSelector("#sm-start");
    const job=await b.page.textContent(".sm-job h2");
    await b.page.click("#sm-start");await b.page.waitForSelector(".eg-shots li",{timeout:8000}).catch(()=>{});
    const shots=await b.page.$$eval(".eg-shots li",x=>x.length);
    check("With nothing started, the next job is the first topic and Start goes straight to Evia's list of photos to take",job==="Mixing mortar"&&shots>=3,JSON.stringify({job,shots}));
    await b.page.evaluate(()=>{document.querySelectorAll(".evia-guide,.eg-wrap").forEach(x=>x.remove());document.getElementById("modal-root").innerHTML="";openUnit(4)});await b.page.waitForTimeout(500);
    const u=await b.page.evaluate(()=>({steps:document.querySelectorAll(".sm-how-unit li").length,lead:(document.querySelector(".sm-lead strong")||{}).textContent,more:!!document.querySelector(".sm-more #fr-start")}));
    check("A topic's page shows the three steps, one Start, and the other ways folded away",u.steps===3&&u.lead==="Start: take photos"&&u.more,JSON.stringify(u));
    check("No script errors (second learner)",!b.errors.length,b.errors.join(" | "));
  }catch(e){check("The test ran to the end",false,e.stack)}
  await browser.close();server.close();
  const failed=results.filter(x=>!x).length;
  console.log(failed?"\n"+failed+" check(s) failed.":"\nAll "+results.length+" checks passed.");
  process.exit(failed?1:0);
})();
