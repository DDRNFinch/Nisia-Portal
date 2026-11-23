/* First open: if scripts arrive slowly, the Course page must still end up in the new layout without a refresh. */
const http=require("http"),fs=require("fs"),path=require("path");
const {chromium,devices}=require("playwright");
const root=process.argv[2]||require("path").join(__dirname,"..");
const TYPES={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png"};
(async()=>{
  const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(req.url.split("?")[0]).replace(/\/$/,"/index.html"));
    if(!fs.existsSync(file)){res.writeHead(404);return res.end()}res.writeHead(200,{"Content-Type":TYPES[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res)}).listen(0);
  const url="http://localhost:"+server.address().port+"/";
  const browser=await chromium.launch();let fails=0;
  for(const slow of ["ui-tidy.js","tabs.js","none"]){
    const ctx=await browser.newContext({...devices["Pixel 7"]});const page=await ctx.newPage();
    await page.goto(url+"manifest.json");
    await page.evaluate(()=>{localStorage.clear();sessionStorage.setItem("evia7-install-later","1");["evia7-theme-picked","evia7-shape-picked"].forEach(k=>localStorage.setItem(k,"1"));
      localStorage.setItem("evia7-onboarding",'{"stage":"done"}');localStorage.setItem("evia7-tips-seen",'["*"]');localStorage.setItem("evia7-home-tip",JSON.stringify({day:new Date().toDateString(),id:"x"}));
      localStorage.setItem("evia7-profile",JSON.stringify({name:"Sam Taylor",start:"2024-11-01",end:"2026-12-01",email:"sam@example.com",signature:"x"}))});
    if(slow!=="none")await page.route("**/"+slow+"*",async r=>{await new Promise(z=>setTimeout(z,3500));r.continue()});
    await page.goto(url);await page.waitForTimeout(9000);
    const st=await page.evaluate(()=>({tidy:!!document.querySelector("#screen .th-head"),old:!!document.querySelector("#screen .ui-hero, #screen .ui-page-head"),scr:window.screen}));
    const ok=st.tidy&&!st.old;if(!ok)fails++;
    console.log((ok?"✓ ":"✗ ")+"slow "+slow+": "+JSON.stringify(st));
    if(process.env.SHOT)await page.screenshot({path:process.env.SHOT+"-"+slow+".png"});
    await ctx.close();
  }
  await browser.close();server.close();process.exit(fails?1:0);
})();
