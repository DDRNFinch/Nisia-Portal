/* Quick check (no browser needed): every script parses, and every file the app loads or caches offline exists.
   Run: node tests/check-files.js */
const fs=require("fs"),path=require("path"),{execFileSync}=require("child_process");
const root=path.join(__dirname,"..");
const problems=[];
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const exists=f=>fs.existsSync(path.join(root,f.replace(/^\.\//,"").replace(/[?#].*$/,"")));

for(const f of fs.readdirSync(root).filter(f=>f.endsWith(".js"))){
  try{execFileSync(process.execPath,["--check",path.join(root,f)],{stdio:"pipe"})}
  catch(e){problems.push(f+" does not parse: "+String(e.stderr).split("\n").find(l=>/Error/.test(l)))}
}
const html=read("index.html");
/* "@course-pack" stands for each course's own files (packs.js): each must exist, and they're cached when first
   loaded rather than up front, so they aren't expected in the offline list. */
const packFiles=[...(read("packs.js").match(/const FILES=\{([\s\S]*?)\n  \};/)||[,""])[1].matchAll(/"([^"]+\.js[^"]*)"/g)].map(m=>m[1]);
if(!packFiles.length)problems.push("packs.js lists no course pack files");
const loaderRaw=(html.match(/data-app-scripts="([^"]*)"/)||[])[1]||"";
if(!/(^|\s)@course-pack(\s|$)/.test(loaderRaw))problems.push("index.html has no @course-pack in its app scripts");
const loader=loaderRaw.split(/\s+/).filter(f=>f&&!f.startsWith("@course-pack")).join(" ");
packFiles.forEach(f=>{if(!exists(f))problems.push("packs.js lists a missing file: "+f)});
const pageFiles=[...loader.split(/\s+/).filter(Boolean),...[...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map(m=>m[1])];
pageFiles.forEach(f=>{if(!exists(f))problems.push("index.html loads a missing file: "+f)});
const sw=read("sw-v16.js");
const shell=[...sw.matchAll(/"(\.\/[^"]*)"/g)].map(m=>m[1]).filter(f=>f!=="./");
shell.forEach(f=>{if(!exists(f))problems.push("Offline list (sw-v16.js) has a missing file: "+f)});
loader.split(/\s+/).filter(Boolean).map(f=>"./"+f.replace(/^\.\//,"").replace(/\?.*$/,"")).forEach(f=>{if(!shell.includes(f))problems.push("Loaded but not saved for offline use: "+f)});
const swVersion=(sw.match(/VERSION = "([^"]+)"/)||[])[1],regVersion=(html.match(/sw-v16\.js\?v=([^"]+)"/)||[])[1];
if(!swVersion||!regVersion||!swVersion.endsWith(regVersion))problems.push("Service worker version ("+swVersion+") and the one index.html registers ("+regVersion+") don't match");
/* Learner data is read and written only through data.js (eviaData), so the storage under it can change in one place.
   Evidence and hours are still loaded by app.js, which data.js wraps. teach.js keeps where a lesson was left. */
const DATA_KEYS=["profile","confidence","test-results","progress-reviews","review-targets","scenarios","nvq-answers","teach","rewards","supporting-evidence"];
const ALLOWED={"data.js":1,"storage.js":1,"sw-v16.js":1,"app.js":["supporting-evidence"],"teach.js":["teach"]};
for(const f of fs.readdirSync(root).filter(f=>f.endsWith(".js"))){
  if(ALLOWED[f]===1)continue;
  const src=read(f).replace(/\/\*[\s\S]*?\*\//g,"");
  DATA_KEYS.filter(k=>src.includes('"evia7-'+k+'"')&&!(ALLOWED[f]||[]).includes(k)).forEach(k=>problems.push(f+" reads evia7-"+k+" directly; use eviaData (data.js)"));
}

if(problems.length){console.error("✗ "+problems.length+" problem(s):\n  "+problems.join("\n  "));process.exit(1)}
console.log("✓ All scripts parse and every loaded/offline file exists.");
