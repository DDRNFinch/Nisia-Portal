/* Property Maintenance Operative (ST0171 v1.1): a learner on the course gets everything a bricklayer does: the units
   and the official KSBs, Teach me (every lesson plays through), the EPA tests and discussions, practice tasks, evidence
   prompts and examples, the games in their trade, and Evia's glossary.   Run: node tests/pmo.js */
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
  const page=await (await browser.newContext({...devices["Pixel 7"]})).newPage();
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  try{
    await page.goto(url+"manifest.json");
    await page.evaluate(()=>{localStorage.clear();sessionStorage.setItem("evia7-install-later","1");["evia7-theme-picked","evia7-shape-picked"].forEach(k=>localStorage.setItem(k,"1"));
      localStorage.setItem("evia7-onboarding",'{"stage":"done"}');localStorage.setItem("evia7-tips-seen",'["*"]');localStorage.setItem("evia7-course","pmo");
      localStorage.setItem("evia7-profile",JSON.stringify({name:"Pat Morgan",start:"2025-09-01",end:"2027-08-31"}))});
    await page.goto(url);await page.waitForTimeout(2500);
    await page.evaluate(()=>{document.getElementById("app").classList.remove("welcome-app-hidden");const w=document.getElementById("welcome-screen");if(w)w.remove();nav("course")});await page.waitForTimeout(700);
    await page.screenshot({path:path.join(__dirname,"..","shots","pmo-topics.png"),fullPage:true}).catch(()=>{});
    const base=await page.evaluate(()=>({course,name:C[course].name,std:C[course].std,units:data().u.map(u=>u[0]),ksbs:allK().length,k5:(allK().find(k=>k[0]==="K5")||[])[1],
      topics:[...document.querySelectorAll("#screen [data-u]")].map(x=>(x.querySelector("strong,.unit-title")||x).textContent.trim())}));
    check("The course is Property Maintenance Operative ST0171 v1.1, with its 10 units on Topics",base.course==="pmo"&&base.std==="ST0171 v1.1"&&base.units.length===10&&base.topics.length===10&&base.topics[2]==="Plumbing repairs",JSON.stringify(base));
    check("Every KSB on the standard (31 K, 25 S, 6 B) with the standard's own wording",base.ksbs===62&&/BSI Flex 8670/.test(base.k5),JSON.stringify(base.ksbs));
    const onb=await page.evaluate(()=>{const s=fs=>fs;return document.documentElement.innerHTML.length>0&&typeof window.eviaPacks.catalogue==="function"?window.eviaPacks.catalogue().some(c=>c.id==="pmo"&&/Property Maintenance/.test(c.name)):false});
    check("It's in the course list learners pick from",onb);
    /* Teach me: every lesson in every unit plays through to the end. */
    await page.evaluate(()=>nav("teach"));await page.waitForTimeout(600);
    await page.evaluate(()=>{const b=document.querySelector('[data-go="course"]');if(b)b.click()});await page.waitForTimeout(600);
    await page.addScriptTag({path:path.join(__dirname,"teach-solver.js")});
    const played=await page.evaluate(async()=>{
      const w=ms=>new Promise(r=>setTimeout(r,ms)),types=new Set(),out=[];
      window.EVIA_TEACH.surpriseChance=0;
      const ids=((window.EVIA_TEACH.courses||{}).pmo||[]).flatMap(u=>u.lessons.map(l=>l.id));
      for(const id of ids){
        const b=document.querySelector('[data-lesson="'+id+'"]');if(!b){out.push(id+": not on the page");continue}
        b.click();await w(120);
        for(let n=0;n<120&&window.eviaTeach.current();n++){types.add(window.eviaTeach.current().step.t);await window.__teachSolve();await w(40)}
        const ok=/(Lesson|Unit) complete/.test((document.querySelector(".tm")||{}).textContent||"");if(!ok)out.push(id+": didn’t finish");
        const p=document.querySelector("#tm-path");if(p)p.click();await w(120);
      }
      return {n:ids.length,problems:out,types:[...types]};
    });
    await page.screenshot({path:path.join(__dirname,"..","shots","pmo-teach.png")}).catch(()=>{});
    check("Teach me: all 30 lessons (2 lessons and a unit challenge in each unit) play through to the end",played.n===30&&!played.problems.length,JSON.stringify(played));
    const more=await page.evaluate(()=>{
      const tasks=(window.EVIA_PRACTICE_TASKS||{}).pmo||[],skills=new Set(confidenceQuestions().map(q=>q[0]));
      const P=window.eviaLearnerPrompts&&window.eviaLearnerPrompts.pmo||{};
      return {epa:(EPA_QUESTIONS.propertyMaintenance||[]).length,disc:(EPA_DISCUSSIONS.propertyMaintenance||[]).length,guide:(window.EVIA_EPA_GUIDE.propertyMaintenance||[]).length,
        tasks:tasks.length,tasksOk:tasks.every(t=>t.skills.every(s=>skills.has(s))&&t.marks.length>=5&&/hour/.test(t.time)),conf:confidenceQuestions().length,confPmo:/maintenance job/.test(confidenceQuestions()[0][1]),
        prompts:data().u.every(u=>P[u[0]]&&P[u[0]].photos&&P[u[0]].writeup),meta:courseProgressMeta()};
    });
    check("EPA: 62 knowledge questions (two for every K), 5 professional discussions with model answers and prompts",more.epa===62&&more.disc===5&&more.guide===5,JSON.stringify(more));
    check("13 practice tasks, each matched to the course's confidence check, with marks and a time",more.tasks===13&&more.tasksOk&&more.conf===12&&more.confPmo,JSON.stringify(more));
    check("Every unit has its things to photograph and things to mention, and the course is 24 months with a 3-month EPA",more.prompts&&more.meta.durationMonths===24&&more.meta.epaMonths===3,JSON.stringify(more));
    const games=await page.evaluate(()=>{const S=window.EVIA_SHOWDOWN.foes.filter(f=>f[0]==="maint");return {showdown:S.length,types:window.eviaShowdown&&window.eviaShowdown.types?window.eviaShowdown.types():null}});
    check("Site Showdown has 12 property maintenance encounters for this trade",games.showdown===12&&(!games.types||games.types.includes("maint")),JSON.stringify(games));
    await page.evaluate(()=>{document.querySelectorAll(".tm-x").forEach(b=>b.click());nav("course");window.chat({quiet:true})});await page.waitForTimeout(600);
    await page.evaluate(()=>window.eviaBrain.answer("What's a trap?"));
    await page.waitForSelector("#chat .br-term",{timeout:15000}).catch(()=>{});
    const term=await page.evaluate(()=>{const t=document.querySelector("#chat .br-term");return t?t.innerText:""});
    check("Evia's glossary knows property maintenance terms (a trap)",/water/i.test(term)&&/smell/i.test(term),term);
    check("No script errors",!errors.length,errors.join(" | "));
  }catch(e){check("The test ran to the end",false,e.stack+" | "+errors.join(" | "))}
  await browser.close();server.close();
  const failed=results.filter(x=>!x).length;
  console.log(failed?"\n"+failed+" check(s) failed.":"\nAll "+results.length+" checks passed.");
  process.exit(failed?1:0);
})();
