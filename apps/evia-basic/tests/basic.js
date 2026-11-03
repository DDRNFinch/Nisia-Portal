/* Evia Basic: the whole journey on a phone, with a pretend camera. Evia asks their name the first time, then asks
   what they're doing today and floats up to show the practical activities. An activity shows the areas it gets
   evidence for; Evia's guide asks for each photo in the order of the job and says what's next; stopping part-way
   keeps the photos to carry on; at the end she says what to talk about; Save makes one PDF and she says they're done
   for today. Also: None of these (photos and questions), the Portfolio and its preview, Progress, Learn (Teach me,
   EPA practice), portfolios from before, and Evia's help.   Run: node tests/basic.js [screenshot folder] */
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
  const camReady=()=>page.waitForFunction(()=>document.querySelector(".cam video")&&document.querySelector(".cam video").videoWidth>0,null,{timeout:8000});
  const text=sel=>page.evaluate(s=>(document.querySelector(s)||{}).innerText||"",sel).then(t=>t.replace(/\s+/g," ").trim());
  try{
    await page.goto(url);await page.waitForSelector(".hello #hello-n");
    check("The first time, Evia says hello and asks their name",/Hi, I’m Evia/.test(await text(".hello")));
    await page.fill("#hello-n","Callum Test");await page.click("#hello-go");
    /* Evia, big in the middle, asks what they're doing today; then floats up and the activities appear. */
    await page.waitForSelector(".ev-home.intro");
    const intro=await page.evaluate(()=>({say:document.querySelector(".ev-say").textContent,size:document.querySelector(".ev-big").getBoundingClientRect().width,listShown:getComputedStyle(document.querySelector(".ev-list")).opacity}));
    check("Evia is the home screen: big in the middle, she asks what they're doing today",intro.say==="Hi Callum. What are you doing today?"&&intro.size>100&&intro.listShown<.5,JSON.stringify(intro));
    await snap("1-intro");
    await page.waitForSelector(".ev-home.up");await page.waitForTimeout(900);
    const up=await page.evaluate(()=>({tabs:!!document.querySelector(".tabs"),list:[...document.querySelectorAll(".ev-act")].slice(0,2).map(b=>Math.round(b.getBoundingClientRect().left)).join(),size:Math.round(document.querySelector(".ev-big").getBoundingClientRect().width),top:Math.round(document.querySelector(".ev-big").getBoundingClientRect().top),acts:[...document.querySelectorAll(".ev-act strong")].map(x=>x.textContent).join("|")}));
    check("…then she floats up and lists the practical activities (Repair work too), None of these, then See my portfolio, My progress and Learn; no bottom bar",up.size<80&&up.top<120&&up.acts==="Mixing mortar|Setting out|Labouring|Cavity walling|Solid walling|Raked walling|Repair work|None of these|See my portfolio|My progress|Learn"&&!up.tabs&&up.list.split(",")[0]===up.list.split(",")[1],JSON.stringify(up));
    await snap("2-home");
    await page.click("#evia",{force:true});await page.waitForSelector(".bubble");
    check("Tapping Evia says what to do here",/Tap what you’re doing today/.test(await text(".bubble")));
    await page.click(".bubble button");
    /* Solid walling: the areas it gets evidence for. */
    await page.click('.ev-act[data-a="4"]');await page.waitForSelector(".area");
    const areas=await page.$$eval(".area",x=>x.map(a=>a.innerText.replace(/\s+/g," ").trim()));
    check("An activity shows the areas it gets evidence for, with their KSBs, and Begin evidence",areas.length===5&&/^PPE K2 · S2 · B1/.test(areas[0])&&areas.some(a=>/Solid walls and bonds K6/.test(a))&&/Begin evidence/.test(await text("#begin")),areas.join(" | "));
    await snap("3-areas");
    /* Evia's guide: one photo at a time, saying what's next. */
    await page.click("#begin");await camReady();
    const g1={n:await text(".cp-n"),say:await text(".cp-say"),next:await text(".cp-next")};
    check("Evia's guide asks for each photo in the order of the job and says what's next",/^Photo 1 of 12/.test(g1.n)&&g1.say==="You in your PPE"&&g1.next==="Next: The drawing",JSON.stringify(g1));
    await page.click(".shutter");await page.waitForFunction(()=>document.querySelector(".cp-say").textContent==="The drawing");
    await page.click("[data-next]");await page.waitForFunction(()=>document.querySelector(".cp-say").textContent==="Setting out");
    await page.click(".shutter");await page.waitForFunction(()=>document.querySelector(".cp-say").textContent==="The bond");
    await page.click(".shutter");await page.waitForFunction(()=>document.querySelector(".cp-say").textContent==="Level and plumb");
    const sq=await page.evaluate(()=>{const s=document.querySelector(".cam-stage").getBoundingClientRect();return Math.round(s.width)===Math.round(s.height)});
    check("A photo moves on to the next; Skip moves on without one; the camera is square and counts them",sq&&await text(".cam-n")==="3 photos"&&!await page.evaluate(()=>document.querySelector(".cam-save").disabled));
    await snap("4-guide");
    /* Stop part-way: the photos are kept, and home offers to carry on. */
    await page.click(".cam [data-x]");await page.waitForSelector("#carry");
    check("Stopping part-way keeps the photos: home offers to carry on",/Carry on Solid walling 3 photos so far/i.test(await text("#carry")));
    await page.click("#carry");await camReady();
    check("Carrying on picks up where they left off",await text(".cp-say")==="Level and plumb");
    await page.click(".cam-save");await page.waitForSelector(".tg");
    /* Talk about it: what to talk about, for the photos taken. */
    const tg=await page.evaluate(()=>[...document.querySelectorAll(".tg")].map(g=>g.querySelector(".tg-h strong").textContent+":"+g.querySelectorAll(".wu-row").length+":"+[...g.querySelectorAll(".tg-m i")].map(i=>i.textContent).join(",")));
    check("At the end Evia says what to talk about for the photos taken, area by area",tg.length===2&&/^PPE:1:the PPE you wore and why/.test(tg[0])&&/^Solid walls and bonds:2:setting out,the bond you used/.test(tg[1]),JSON.stringify(tg));
    await snap("5-talk");
    const tas=await page.$$(".wu-row textarea");await tas[0].fill("My hard hat, boots, gloves and hi-vis.");
    await page.click("#save");await page.waitForSelector(".toast");
    check("Save waits until every photo says what it shows",/Say what 2 photos show/.test(await text(".toast"))&&!await page.$(".party"));
    await tas[1].fill("Setting out the wall from the drawing with a tape and line.");await tas[2].fill("English bond, headers and stretchers.");
    await page.click("#save");await page.waitForSelector(".party #dn-another",{timeout:15000});
    const dn=await text(".party");
    check("Saved: Evia says they're done for today, it's in the portfolio, and they can do another",/That’s you done for today, Callum!/.test(dn)&&/solid walling evidence is saved in your portfolio/.test(dn)&&/Do another one/.test(dn)&&/See my portfolio/.test(dn),dn);
    await snap("6-done");
    await page.click("#dn-pf");await page.waitForSelector(".pf-row");
    const pf=await page.evaluate(()=>({txt:document.querySelector(".pf-row").innerText.replace(/\s+/g," "),session:window.eviaBasic.state.session}));
    check("One PDF for the day in the Portfolio, and the session is cleared",/Solid walling/.test(pf.txt)&&/3 photos/.test(pf.txt)&&!pf.session,JSON.stringify(pf));
    const head=await page.evaluate(async()=>{const id=window.eviaBasic.state.pf[0].id;const r=await new Promise(res=>{const o=indexedDB.open("evia-basic",1);o.onsuccess=()=>{const g=o.result.transaction("files").objectStore("files").get(id);g.onsuccess=()=>res(g.result)}});return r&&r.blob?{size:r.blob.size,head:await r.blob.slice(0,5).text(),b64:await new Promise(res=>{const f=new FileReader();f.onload=()=>res(f.result.split(",")[1]);f.readAsDataURL(r.blob)})}:null});
    if(shots&&head)fs.writeFileSync(path.join(shots,"evidence.pdf"),Buffer.from(head.b64,"base64"));
    check("The PDF is a real PDF with the photos in it",head&&head.head==="%PDF-"&&head.size>20000,JSON.stringify(head&&{size:head.size,head:head.head}));
    await page.click(".pf-row");await page.waitForSelector(".pv canvas",{timeout:15000});
    check("Tapping it shows a preview, with Share",await page.evaluate(()=>!!document.querySelector(".pv [data-share]")&&document.querySelector(".pv-top strong").textContent==="Solid walling"));
    await snap("7-preview");
    await page.click(".pv [data-x]");
    /* The areas now show they've been done once. */
    await page.click("[data-home]");await page.waitForSelector(".ev-home.up");
    check("Back home, Evia goes straight to the activities (no second hello)",!await page.$(".ev-home.intro"));
    await page.click('.ev-act[data-a="4"]');await page.waitForSelector(".area");
    const counts=await page.$$eval(".area",x=>x.map(a=>a.querySelector(".area-n").textContent));
    check("An area's number shows how many times it's in the portfolio",counts[0]==="1"&&counts.filter(Boolean).length===2,JSON.stringify(counts));
    await page.click("#back");await page.waitForSelector(".ev-home.up");
    /* None of these: photos, then questions. */
    await page.click('.ev-act[data-a="7"]');await page.waitForSelector(".area");
    const other=await page.$$eval(".area",x=>x.map(a=>a.innerText.replace(/\s+/g," ")));
    check("None of these holds what isn't part of a day's practical work, with questions for the talk topics",other.some(a=>/Health and safety/.test(a))&&!other.some(a=>/Repairs/.test(a))&&other.filter(a=>/Questions/.test(a)).length===4,other.join(" | "));
    await page.click("#begin");await camReady();await page.click(".shutter");await page.waitForTimeout(400);await page.click(".cam-save");await page.waitForSelector(".tg");
    const qn=await page.$$eval("[data-q]",x=>x.length);
    await page.fill(".wu-row textarea","The cracked bricks before I started the repair.");
    for(const ta of await page.$$("[data-q]"))await ta.fill("A good answer in my own words here.");
    await page.click("#save");await page.waitForSelector(".party #dn-another",{timeout:15000});
    check("None of these: a photo and its questions (12 of them), saved like the rest",qn===12);
    await page.click("#dn-another");await page.waitForSelector(".ev-home.up");
    /* Progress: each KSB counted once. */
    await page.click("#go-progress");await page.waitForSelector(".hero");
    const pr=await page.evaluate(()=>({hero:document.querySelector(".hero").innerText.replace(/\s+/g," "),on:[...document.querySelectorAll(".chip.on")].length}));
    check("Progress counts each KSB with evidence once",/of 59 KSBs/.test(pr.hero)&&pr.on>=14&&(/(\d+) of 59/.exec(pr.hero)||[])[1]==String(pr.on),JSON.stringify(pr));
    await page.click('.chip[data-k="S13"]');await page.waitForSelector(".sheet");
    check("Tapping a KSB says what it means and where it's evidenced",/Set out and construct a simple brick solid wall/.test(await text(".sheet"))&&/In your portfolio/.test(await text(".sheet")));
    await page.click(".sheet-ok");await page.waitForTimeout(300);
    await page.click("#me");await page.waitForSelector("#me-s");await page.fill("#me-s","2026-04-09");await page.fill("#me-e","2028-04-08");await page.click('.sw[data-c="3"]');
    const col=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue("--yellow").trim());
    await page.click(".sheet-ok");await page.waitForSelector(".hero .pill");
    check("Course dates show whether they're on track; Evia's colour changes",col==="#2e90fa"&&/Behind|On track/.test(await text(".hero .pill")));
    await snap("8-progress");
    /* Learn: Teach me and EPA practice. */
    await page.click("[data-home]");await page.waitForSelector("#go-learn");await page.click("#go-learn");await page.waitForSelector(".subj",{timeout:15000});
    check("Learn has Teach me, the four subjects and EPA practice",(await page.$$eval(".subj strong",x=>x.map(e=>e.textContent).join()))==="Bricklaying,Maths,English,Safeguarding"&&/What’s in mortar/.test(await text("#teach")));
    await page.click("#teach");await page.waitForSelector(".tm .tm-node.next button");
    check("Teach me opens Evia's lessons",await page.evaluate(()=>!!document.querySelector(".tm")));
    await page.evaluate(()=>document.querySelector(".tm").remove());await page.waitForSelector(".subj");
    await page.click("#epa");await page.waitForSelector(".quiz .opt");
    for(let k=0;k<10;k++){await page.click(".quiz .opt >> nth=0");await page.waitForSelector("#qn:not([hidden])");await page.click("#qn")}
    await page.waitForSelector(".quiz .ring");
    check("EPA practice: 10 questions, then the score",/You got \d+ of 10 right/.test(await text(".quiz")));
    await page.click("#qd");await page.waitForSelector("#epa");
    /* Opening again: Evia asks what they're doing today, and everything is still there. */
    await page.reload();await page.waitForSelector(".ev-home.intro");
    check("Opening again, Evia asks by name what they're doing today",await text(".ev-say")==="Hi Callum. What are you doing today?"&&!await page.$(".hello"));
    check("Everything is still there after closing and opening again",await page.evaluate(()=>window.eviaBasic.state.pf.length===2));
    check("No script errors",!errors.length,errors.join(" | "));
    /* Portfolios saved before (the old 10 units) keep their names and still count their KSBs. */
    const old=await (await browser.newContext({...devices["Pixel 7"],serviceWorkers:"block"})).newPage();
    await old.goto(url+"manifest.json");await old.evaluate(()=>{localStorage.clear();localStorage.setItem("eviab",JSON.stringify({name:"Old Learner",pf:[{id:"old-1",topic:0,at:Date.now(),photos:4}],drafts:{}}))});
    await old.goto(url);await old.waitForSelector(".ev-home");
    await old.waitForSelector("#see-pf");await old.click("#see-pf");await old.waitForSelector(".pf-row");
    const op=await old.textContent(".pf-row");
    await old.click("[data-home]");await old.waitForSelector("#go-progress");await old.click("#go-progress");await old.waitForSelector(".hero");
    const oh=await old.evaluate(()=>document.querySelector(".hero").innerText.replace(/\s+/g," "));
    check("Portfolios saved before keep their names and still count their KSBs",/Mixing mortar/.test(op)&&/8 of 59 KSBs/.test(oh),JSON.stringify({op,oh}));
  }catch(e){check("The test ran to the end",false,e.stack+" | "+errors.join(" | "))}
  await browser.close();server.close();
  const failed=results.filter(x=>!x).length;
  console.log(failed?"\n"+failed+" check(s) failed.":"\nAll "+results.length+" checks passed.");
  process.exit(failed?1:0);
})();
