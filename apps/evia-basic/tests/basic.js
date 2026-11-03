/* Evia Basic: the whole journey on a phone, with a pretend camera. Evia's hello (and the name the first time), the
   goal, Topics (2 wide, 10 of them), a topic's things to capture, the square camera (photo after photo, Save), the
   write-up (each photo, what it shows, Save), the celebration, the PDF in the Portfolio and its preview, Progress
   (KSBs with evidence, course dates, Evia's colour), Learn (Teach me lessons, EPA practice). Evia's help on every page.   Run: node tests/basic.js [screenshot folder] */
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
  const snap=async n=>{if(shots){await page.waitForTimeout(500);await page.screenshot({path:path.join(shots,n+".png")})}};
  try{
    await page.goto(url);await page.waitForSelector(".hello #hello-n");
    const hi=await page.textContent(".hello");
    check("The first time, Evia says hello and asks their name",/Hi, I’m Evia/.test(hi)&&/portfolio/.test(hi),hi);
    await page.fill("#hello-n","Callum Test");await page.click("#hello-go");await page.waitForSelector(".bubble");
    check("…then shows what to do",/Tap a topic/.test(await page.textContent(".bubble")));
    await page.click(".bubble button");await page.waitForFunction(()=>!document.querySelector(".hello"));
    const goal=await page.evaluate(()=>document.getElementById("goal").innerText.replace(/\s+/g," "));
    check("Topics leads with the goal: every topic into the portfolio, and the next one",/0 of 18/.test(goal)&&/Get all 18 topics into your portfolio/.test(goal)&&/Next: Mixing mortar/.test(goal),goal);
    const grid=await page.evaluate(()=>{const t=[...document.querySelectorAll(".tile")],r=t.map(x=>x.getBoundingClientRect());return {n:t.length,cols:new Set(r.map(x=>Math.round(x.left))).size,rows:new Set(r.map(x=>Math.round(x.top))).size,first:t[0].innerText.replace(/\s+/g," "),evia:!!document.querySelector(".top .evia")}});
    const groups=await page.evaluate(()=>[...document.querySelectorAll(".group-h")].map(h=>h.textContent+":"+h.nextElementSibling.querySelectorAll(".tile").length).join("|"));
    check("Home shows 18 topics, 2 wide, in two groups (On the job: 14, Talk about it: 4), each with its KSBs, and Evia in the top right",grid.n===18&&grid.cols===2&&/1 Mixing mortar K20 · S14/.test(grid.first)&&grid.evia&&/On the job.*:14\|Talk about it.*:4/.test(groups),JSON.stringify({grid,groups}));
    await snap("1-topics");
    await page.click("#evia",{force:true});await page.waitForSelector(".bubble");
    const b=await page.textContent(".bubble");
    check("Tapping Evia shows what to do on this page, in a few words",/Tap a topic/.test(b),b);
    await snap("2-help");await page.click(".bubble button");
    /* Tapping a topic opens the camera straight away, with the first thing to capture under the picture. */
    await page.click('.tile[data-t="0"]');await page.waitForSelector(".cam video");
    await page.waitForFunction(()=>document.querySelector(".cam video").videoWidth>0,null,{timeout:8000});
    const p1=await page.evaluate(()=>({n:document.querySelector(".cp-n").textContent,say:document.querySelector(".cp-say").textContent,hint:document.querySelector(".cp-hint").textContent}));
    check("Tapping a topic opens the camera straight away, with the first thing to capture under the picture",/^1 of 6/.test(p1.n)&&p1.say==="Silos"&&/silo you used/.test(p1.hint),JSON.stringify(p1));
    await snap("3-prompt");
    await page.click(".shutter");await page.waitForFunction(()=>document.querySelector(".cp-say").textContent==="Pre-mix");
    await page.click("[data-next]");await page.waitForFunction(()=>document.querySelector(".cp-say").textContent==="Gauging");
    await page.click("[data-prev]");await page.waitForFunction(()=>document.querySelector(".cp-say").textContent==="Pre-mix");
    check("Each photo moves on to the next thing to capture; Skip and back move along without one",true);
    for(let k=0;k<2;k++){await page.click(".shutter");await page.waitForTimeout(300)}
    await page.waitForFunction(()=>document.querySelectorAll(".cam-strip img").length===3);
    const sq=await page.evaluate(()=>{const s=document.querySelector(".cam-stage").getBoundingClientRect();return Math.round(s.width)===Math.round(s.height)});
    check("The camera is square, stays open for photo after photo, and counts them",sq&&await page.textContent(".cam-n")==="3 photos");
    await snap("4-camera");
    await page.click(".cam-save");await page.waitForSelector(".wu-row");
    const wu=await page.evaluate(()=>({rows:document.querySelectorAll(".wu-row").length,img:[...document.querySelectorAll(".wu-row img")].every(i=>i.src.startsWith("blob:")),name:!!document.getElementById("nm"),labels:[...document.querySelectorAll(".wu-row .k")].map(k=>k.textContent).join("|"),ph:document.querySelector(".wu-row textarea").placeholder}));
    check("Save goes to the write-up: each photo, labelled with what it was for, with a box for what it shows",wu.rows===3&&wu.img&&!wu.name&&wu.labels==="PHOTO 1 · SILOS|PHOTO 2 · PRE-MIX|PHOTO 3 · GAUGING"&&/silo you used/.test(wu.ph),JSON.stringify(wu));
    /* Save with a box empty: it says so and goes to it. */
    const tas=await page.$$(".wu-row textarea");await tas[0].fill("Gauging the mix 1 to 4 with buckets.");await tas[1].fill("The mixer and silo, with the water feed.");
    await page.click("#save");await page.waitForSelector(".toast");
    check("Saving with a photo not explained says which, and doesn't save",/Say what 1 photo shows/.test(await page.textContent(".toast"))&&!await page.$(".pf-row"));
    await tas[2].fill("The finished mortar, ready to use, with the area left clean.");
    await snap("5-write");
    await page.click("#save");await page.waitForSelector(".party",{timeout:15000});
    const party=await page.textContent(".party");
    check("Saving celebrates: Evia, confetti, and how many topics are in the portfolio",/Mixing mortar saved!/.test(party)&&/1 of 18 topics/.test(party)&&!!await page.$(".confetti"),party);
    await snap("6a-saved");
    await page.waitForSelector(".pf-row",{timeout:15000});
    const pf=await page.evaluate(async()=>{const S=window.eviaBasic.state;return {rows:document.querySelectorAll(".pf-row").length,txt:document.querySelector(".pf-row").innerText.replace(/\s+/g," "),isNew:document.querySelector(".pf-row").classList.contains("new"),badge:document.getElementById("pf-n").textContent,drafts:S.drafts[0].photos.length,name:S.name}});
    check("Save makes a PDF and it's in the Portfolio (with the count on the tab), and the topic starts fresh",pf.rows===1&&/Mixing mortar/.test(pf.txt)&&/3 photos/.test(pf.txt)&&pf.isNew&&pf.badge==="1"&&pf.drafts===0&&pf.name==="Callum Test",JSON.stringify(pf));
    await snap("6-portfolio");
    /* The PDF itself. */
    const size=await page.evaluate(async()=>{const id=window.eviaBasic.state.pf[0].id;const r=await new Promise(res=>{const o=indexedDB.open("evia-basic",1);o.onsuccess=()=>{const g=o.result.transaction("files").objectStore("files").get(id);g.onsuccess=()=>res(g.result)}});return r&&r.blob?{size:r.blob.size,type:r.blob.type,head:await r.blob.slice(0,5).text()}:null});
    if(shots){const b64=await page.evaluate(async()=>{const id=window.eviaBasic.state.pf[0].id;const r=await new Promise(res=>{const o=indexedDB.open("evia-basic",1);o.onsuccess=()=>{const g=o.result.transaction("files").objectStore("files").get(id);g.onsuccess=()=>res(g.result)}});return await new Promise(res=>{const f=new FileReader();f.onload=()=>res(f.result.split(",")[1]);f.readAsDataURL(r.blob)})});fs.writeFileSync(path.join(shots,"evidence.pdf"),Buffer.from(b64,"base64"))}
    check("The PDF is a real PDF with the photos in it",size&&size.head==="%PDF-"&&size.size>20000,JSON.stringify(size));
    /* Tapping it shows the PDF on screen, with Share and a way back. */
    await page.click(".pf-row");await page.waitForSelector(".pv canvas",{timeout:15000});await page.waitForTimeout(800);
    const pv=await page.evaluate(()=>{const c=document.querySelector(".pv canvas"),x=c.getContext("2d").getImageData(0,0,c.width,c.height).data;let ink=0;for(let k=0;k<x.length;k+=40)if(x[k]<200)ink++;
      return {pages:document.querySelectorAll(".pv canvas").length,ink:ink>200,share:!!document.querySelector(".pv [data-share]"),title:document.querySelector(".pv-top strong").textContent,tabs:getComputedStyle(document.querySelector(".tabs")).display}});
    check("Tapping a PDF in the Portfolio shows a preview of it, with Share",pv.pages>=1&&pv.ink&&pv.share&&pv.title==="Mixing mortar"&&pv.tabs==="none",JSON.stringify(pv));
    await snap("7-preview");
    await page.click(".pv [data-x]");
    check("Closing the preview goes back to the Portfolio",!await page.$(".pv")&&!!await page.$(".pf-row"));
    await page.click('[data-tab="topics"]');await page.waitForSelector(".tile");
    check("Back on Topics, Mixing mortar has a tick, and the goal moves on",await page.evaluate(()=>document.querySelector('.tile[data-t="0"]').classList.contains("done")&&/1 of 18/.test(document.getElementById("goal").innerText.replace(/\s+/g," "))&&/Next: Materials and estimating/.test(document.getElementById("goal").innerText)));
    /* Talk about it: questions instead of photos. */
    await page.click('.tile[data-t="14"]');await page.waitForSelector(".ask textarea");
    const asks=await page.$$eval(".ask strong",x=>x.map(e=>e.textContent));
    await page.fill('[data-q="0"]',"Building regulations Part A and British Standards for masonry.");await page.click("#save");await page.waitForSelector(".toast");
    const short=await page.textContent(".toast");
    await page.fill('[data-q="1"]',"Precast lintels and corner profiles on our site.");await page.fill('[data-q="2"]',"So the wall can expand and shrink without cracking.");
    await snap("7b-talk");
    await page.click("#save");await page.waitForSelector(".party");await page.waitForSelector(".pf-row");
    const tr=await page.evaluate(()=>document.querySelector(".pf-row").innerText.replace(/\s+/g," "));
    check("A Talk about it topic asks its questions, wants every one answered, then saves a PDF to the Portfolio",asks.length===3&&/building regulations/i.test(asks[0])&&/Answer 2 more questions/.test(short)&&/Regulations and standards/.test(tr)&&/3 answers/.test(tr),JSON.stringify({asks,short,tr}));
    await page.click('[data-tab="topics"]');await page.waitForSelector(".tile");
    /* Progress: the KSBs in the portfolio, what each means, course dates and Evia's colour. */
    await page.click('[data-tab="progress"]');await page.waitForSelector(".hero");
    const pr=await page.evaluate(()=>({hero:document.querySelector(".hero").innerText.replace(/\s+/g," "),on:[...document.querySelectorAll(".chip.on")].map(c=>c.textContent).sort().join(),chips:document.querySelectorAll(".chip").length,dates:!!document.getElementById("dates")}));
    check("Progress shows how many KSBs have evidence (Mixing mortar's 2 and Regulations' 4: 6 of 59), each one lit up",/6 of 59 KSBs/.test(pr.hero)&&/10%/.test(pr.hero)&&pr.chips===59&&pr.on==="K19,K20,K7,K9,S14,S4"&&pr.dates,JSON.stringify(pr));
    await page.click('.chip[data-k="S14"]');await page.waitForSelector(".sheet");
    check("Tapping a KSB says what it means and where it's evidenced",/Gauge and hand mix mortar to ratio/.test(await page.textContent(".sheet"))&&/In your portfolio/.test(await page.textContent(".sheet")));
    await page.click(".sheet-ok");await page.waitForTimeout(300);
    await page.click("#me");await page.waitForSelector("#me-s");await page.fill("#me-s","2026-04-09");await page.fill("#me-e","2028-04-08");await page.click('.sw[data-c="3"]');
    const col=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue("--yellow").trim());
    await page.click(".sheet-ok");await page.waitForSelector(".hero .pill");
    const pr2=await page.evaluate(()=>({pill:document.querySelector(".hero .pill").textContent,course:(document.querySelector(".card .bar")||{}).outerHTML||""}));
    check("Course dates show how far through they are and whether they're on track; Evia's colour changes",col==="#2e90fa"&&/Behind|On track/.test(pr2.pill)&&/width/.test(pr2.course),JSON.stringify({col,pr2}));
    await snap("8-progress");
    /* Learn: Teach me and EPA practice. */
    await page.click('[data-tab="learn"]');await page.waitForSelector(".subj",{timeout:15000});
    const ln=await page.evaluate(()=>({subj:[...document.querySelectorAll(".subj strong")].map(x=>x.textContent).join(),teach:document.getElementById("teach").innerText.replace(/\s+/g," "),epa:document.getElementById("epa").innerText.replace(/\s+/g," ")}));
    check("Learn has Teach me (next lesson and how many done), the four subjects and EPA practice",ln.subj==="Bricklaying,Maths,English,Safeguarding"&&/What’s in mortar/.test(ln.teach)&&/0 of \d+ lessons/.test(ln.teach)&&/EPA practice/.test(ln.epa),JSON.stringify(ln));
    await snap("9-learn");
    await page.click("#teach");await page.waitForSelector(".tm .tm-node.next button");
    await page.click(".tm .tm-node.next button");await page.waitForSelector(".tm .tm-bar,.tm-explore,.tm-step",{timeout:8000}).catch(()=>{});
    check("Teach me opens Evia's lessons, with her pictures",await page.evaluate(()=>!!document.querySelector(".tm")&&!!document.querySelector(".tm svg.tp, .tm .tp")));
    await snap("10-lesson");
    await page.evaluate(()=>document.querySelector(".tm").remove());await page.waitForSelector(".subj");
    await page.click("#epa");await page.waitForSelector(".quiz .opt");
    for(let k=0;k<10;k++){await page.click(".quiz .opt >> nth=0");await page.waitForSelector("#qn:not([hidden])");if(k===0)await snap("11-epa");await page.click("#qn")}
    await page.waitForSelector(".quiz .ring");
    const res=await page.evaluate(()=>({txt:document.querySelector(".quiz").innerText.replace(/\s+/g," "),tests:window.eviaBasic.state.tests.length}));
    check("EPA practice: 10 questions, right or wrong straight away, then the score and what to look at again",/You got \d+ of 10 right/.test(res.txt)&&res.tests===1,res.txt.slice(0,200));
    await snap("12-score");
    await page.click("#qd");await page.waitForSelector("#epa");
    check("The best EPA score shows on Learn",/%/.test(await page.textContent("#epa .epa-best")));
    await page.click('[data-tab="topics"]');await page.waitForSelector(".tile");
    /* Photos waiting (taken, not written up yet) show on the tile; the topic offers More and Write up. */
    await page.click('.tile[data-t="1"]');await page.waitForFunction(()=>document.querySelector(".cam video")&&document.querySelector(".cam video").videoWidth>0);
    await page.click(".shutter");await page.waitForTimeout(300);await page.click(".cam-save");await page.waitForSelector(".wu-row");
    await page.click("#back");await page.waitForSelector(".tile");
    const going=await page.evaluate(()=>document.querySelector('.tile[data-t="1"]').classList.contains("going"));
    await page.click('.tile[data-t="1"]');await page.waitForSelector(".wu-row");
    const again=await page.evaluate(()=>({rows:document.querySelectorAll(".wu-row").length}));
    await page.click("#more");await page.waitForSelector(".cam .cp-say");
    const nextSay=await page.textContent(".cp-say");
    await page.click(".cam [data-x]");await page.click("#back");await page.waitForSelector(".tile");
    check("Photos not written up yet stay with the topic: its tile shows it's started, tapping it goes to the write-up, and More picks up at the next thing to capture",going&&again.rows===1&&nextSay!=="PPE"&&nextSay.length>0,JSON.stringify({going,again,nextSay}));
    /* Kept after closing the app. */
    await page.reload();await page.waitForSelector(".hello");
    check("Opening again, Evia says hi by name and then gets out of the way",/Hi Callum/.test(await page.textContent(".hello")));
    await page.waitForFunction(()=>!document.querySelector(".hello"),null,{timeout:5000});
    check("Everything is still there after closing and opening again",await page.evaluate(()=>document.querySelector('.tile[data-t="0"]').classList.contains("done")&&document.querySelector('.tile[data-t="1"]').classList.contains("going")&&document.getElementById("pf-n").textContent==="2"));
    check("No script errors",!errors.length,errors.join(" | "));
    /* A portfolio saved with the old 10 topics keeps its name and counts its KSBs. */
    const old=await (await browser.newContext({...devices["Pixel 7"],serviceWorkers:"block"})).newPage();
    await old.goto(url+"manifest.json");await old.evaluate(()=>{localStorage.clear();localStorage.setItem("eviab",JSON.stringify({name:"Old Learner",pf:[{id:"old-1",topic:0,at:Date.now(),photos:4}],drafts:{3:{photos:[{id:"gone"}],notes:{}}}}))});
    await old.goto(url);await old.waitForFunction(()=>!document.querySelector(".hello"),null,{timeout:6000});
    await old.click('[data-tab="portfolio"]');await old.waitForSelector(".pf-row");
    const op=await old.textContent(".pf-row");
    await old.click('[data-tab="progress"]');await old.waitForSelector(".hero");
    const oh=await old.evaluate(()=>document.querySelector(".hero").innerText.replace(/\s+/g," "));
    check("Portfolios saved with the old 10 topics keep their names and still count their KSBs",/Mixing mortar/.test(op)&&/8 of 59 KSBs/.test(oh)&&await old.evaluate(()=>Object.values(window.eviaBasic.state.drafts).every(d=>!d.photos.length)),JSON.stringify({op,oh}));
  }catch(e){check("The test ran to the end",false,e.stack+" | "+errors.join(" | "))}
  await browser.close();server.close();
  const failed=results.filter(x=>!x).length;
  console.log(failed?"\n"+failed+" check(s) failed.":"\nAll "+results.length+" checks passed.");
  process.exit(failed?1:0);
})();
