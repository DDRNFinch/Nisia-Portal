/* The confidence check results in the review prep: every skill from the latest check and the change since the one
   before, on the page and in the PDF.   Run: node tests/review-confidence.js */
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
    await page.goto(url+"manifest.json");
    /* Callum's two checks: 8 October, then 20 October with eight skills up. */
    await page.evaluate(()=>{localStorage.clear();sessionStorage.setItem("evia7-install-later","1");["evia7-theme-picked","evia7-shape-picked"].forEach(k=>localStorage.setItem(k,"1"));
      localStorage.setItem("evia7-onboarding",'{"stage":"done"}');localStorage.setItem("evia7-tips-seen",'["*"]');localStorage.setItem("evia7-course","bricklayer");
      localStorage.setItem("evia7-profile",JSON.stringify({name:"Callum Test",start:"2026-01-05",end:"2027-12-01"}));
      const A=["Jointing styles","Mortar mixing","Setting out a solid wall","Brick bonds","Materials","Cavity wall setting out","Cavity wall construction","Lintels","Joint protection","Raking cuts","Cutting bricks","Brick repairs"];
      const mk=(d,s)=>({id:"confidence-"+Date.parse(d),course:"bricklayer",startedAt:d,savedAt:d,source:"self-assessment",scores:A.map((a,i)=>({area:a,score:s[i]}))});
      localStorage.setItem("evia7-confidence",JSON.stringify([mk("2026-10-08T07:31:10Z",[2,2,2,3,3,1,2,3,2,1,1,2]),mk("2026-10-20T11:14:48Z",[3,2,3,4,3,2,3,4,3,2,1,2])]))});
    await page.goto(url);await page.waitForTimeout(2500);
    await page.evaluate(()=>{document.getElementById("app").classList.remove("welcome-app-hidden");const w=document.getElementById("welcome-screen");if(w)w.remove()});
    await page.evaluate(()=>window.eviaPrepPack.open());await page.waitForSelector(".rp-sheet");
    const t=await page.evaluate(()=>{const c=document.querySelector(".rp-conf");return c?c.innerText:"NONE"});
    check("The review prep shows every skill from the latest confidence check, least confident first, with the change since the one before",
      /20 October/.test(t)&&t.indexOf("Cutting bricks")<t.indexOf("Lintels")&&/Cutting bricks\s+Need more training/.test(t)&&(t.match(/↑/g)||[]).length===8&&/Lintels\s+↑ Mastered/.test(t),t);
    check("…with Rate again beside it",await page.evaluate(()=>/Rate again/.test(document.querySelector(".has-conf").textContent)));
    if(process.argv[2]){await page.evaluate(()=>document.querySelector(".rp-conf").scrollIntoView({block:"center"}));await page.waitForTimeout(300);await page.screenshot({path:process.argv[2]})}
    /* The Review tab: tapping Confidence check shows the results, with the check itself a tap away. */
    await page.evaluate(()=>{document.getElementById("modal-root").innerHTML="";nav("learning")});await page.waitForSelector('[data-check="conf"]');
    const row=await page.textContent('[data-check="conf"]');
    await page.click('[data-check="conf"]');await page.waitForSelector("#modal-root .pv-sheet .pv-rows",{timeout:5000}).catch(()=>{});
    const res=await page.evaluate(()=>{const s=document.querySelector("#modal-root .pv-sheet");return s?s.innerText:"NO RESULTS: "+document.body.innerText.slice(0,300)});
    check("On the Review tab, tapping Confidence check shows the results, each skill and the change since last time, with Confidence check there to rate again",
      /Done 20 Oct · 5 skills to practise/i.test(row)&&/Cutting bricks/.test(res)&&/Lintels/.test(res)&&/Need more training/.test(res)&&/Last time/.test(res)&&/Confidence check/.test(res),row+" | "+res);
    if(process.argv[3])await page.screenshot({path:process.argv[3]});
    const size=await page.evaluate(async()=>(await window.eviaPrepPack.pdf()).size);
    check("The review PDF is made with the results in it",size>5000,size);
    check("No script errors",!errors.length,errors.join(" | "));
  }catch(e){check("The test ran to the end",false,e.stack+" | "+errors.join(" | "))}
  await browser.close();server.close();
  const failed=results.filter(x=>!x).length;
  console.log(failed?"\n"+failed+" check(s) failed.":"\nAll "+results.length+" checks passed.");
  process.exit(failed?1:0);
})();
