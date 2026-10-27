/* A college's own pack (its own topic names and groupings of KSBs): the things to capture and mention follow the KSBs,
   so Evia's guide and free range show them for the college's topics too.   Run: node tests/pack-prompts.js */
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
    await page.evaluate(()=>{localStorage.clear();sessionStorage.setItem("evia7-install-later","1");["evia7-theme-picked","evia7-shape-picked"].forEach(k=>localStorage.setItem(k,"1"));
      localStorage.setItem("evia7-onboarding",'{"stage":"done"}');localStorage.setItem("evia7-tips-seen",'["*"]');
      localStorage.setItem("evia7-profile",JSON.stringify({name:"Callum Test",start:"2026-01-05",end:"2027-12-01"}))});
    await page.goto(url);await page.waitForTimeout(2500);
    /* A pack like the college's "Brick Duty's": its own topic names, KSBs grouped its own way. */
    const got=await page.evaluate(()=>{document.getElementById("app").classList.remove("welcome-app-hidden");const w=document.getElementById("welcome-screen");if(w)w.remove();
      window.eviaPacks.follow({course:"bricklayer",hash:"brick-duties",title:"Brick Duty's",topics:[
        {id:"college/hs",name:"Health & Safety",ksbs:["K1","K2","S1","B1"].map(code=>({code,text:""}))},
        {id:"college/mortar",name:"Mortar and materials",ksbs:["K20","K12","S14","S6"].map(code=>({code,text:""}))}]},"bricklayer");
      render();const P=window.eviaLearnerPrompts.bricklayer;return {units:data().u.map(u=>u[0]),hs:P["Health & Safety"],mortar:P["Mortar and materials"],own:P["Mixing mortar"]}});
    check("The college's topics are what Evia shows",got.units.join()==="Health & Safety,Mortar and materials",JSON.stringify(got.units));
    check("Each college topic has things to capture and to mention, from the KSBs it covers",got.hs&&got.hs.photos&&got.hs.writeup&&got.mortar&&/gaug/i.test(got.mortar.photos+got.mortar.writeup)&&/ratio/i.test(got.mortar.writeup),JSON.stringify({hs:got.hs,mortar:got.mortar}));
    check("…and the mortar topic doesn't get health and safety's (they follow the KSBs, not the whole old topic)",!/safety signage/i.test(got.mortar.photos),JSON.stringify(got.mortar));
    /* The guide's photo list, and free range's things to mention. */
    await page.evaluate(()=>openUnit(1));await page.waitForSelector("#eg-start");await page.click("#eg-start");await page.waitForSelector(".eg-shots li");
    const shots=await page.$$eval(".eg-shots li strong",x=>x.map(e=>e.textContent));
    check("Evia's guide lists the things to capture for a college topic",shots.length>=3&&shots.some(t=>/gaug|ratio|mix/i.test(t)),JSON.stringify(shots));
    await page.evaluate(()=>{document.getElementById("modal-root").innerHTML="";openUnit(1,"write")});await page.waitForSelector(".fr-mention");
    const mention=await page.textContent(".fr-mention");
    check("Free range lists the things to mention for a college topic",/THINGS TO MENTION/.test(mention)&&/ratio/i.test(mention),mention);
    check("No script errors",!errors.length,errors.join(" | "));
  }catch(e){check("The test ran to the end",false,e.stack+" | "+errors.join(" | "))}
  await browser.close();server.close();
  const failed=results.filter(x=>!x).length;
  console.log(failed?"\n"+failed+" check(s) failed.":"\nAll "+results.length+" checks passed.");
  process.exit(failed?1:0);
})();
