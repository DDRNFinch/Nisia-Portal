/* Checks every Teach me lesson file: unique ids, answers present, games that can be finished, and pictures (and
   the spots on them) that exist. Run: node tests/check-lessons.js   (exit code 0 = all fine) */
const fs=require("fs"),path=require("path"),vm=require("vm");
const root=path.join(__dirname,"..");
const ctx={window:{}};vm.createContext(ctx);
const files=["teach-kit.js","teach-pics.js",...fs.readdirSync(root).filter(f=>/^teach-(?!kit|pics|play).*\.js$/.test(f)).sort()];
files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),"utf8"),ctx,{filename:f}));
const T=ctx.window.EVIA_TEACH,P=T.pics||{},problems=[],ids=new Set();let lessons=0,steps=0;
const size=name=>{const m=/viewBox="([\d.-]+) ([\d.-]+) ([\d.]+) ([\d.]+)"/.exec(P[name]());return {x:+m[1],y:+m[2],w:+m[3],h:+m[4]}};
const uniq=a=>new Set(a).size===a.length;
const txt=o=>typeof o==="object"?(o.text||o.pic):o;
const KINDS=new Set(["teach","learn","explore","watch","cards","choice","tf","tap","gap","build","order","match","sort","judge","spot","next","scene","hot","label","load","quick","banner"]);
function checkStep(s,at){
  const bad=m=>problems.push(at+m),pic=n=>{if(n&&!P[n])bad("no picture called "+n)};
  if(!KINDS.has(s.t))return bad("unknown step type "+s.t);
  pic(s.pic);
  const spots=(need,o)=>{
    if(!Array.isArray(s.spots)||s.spots.length<need)return bad("needs "+need+"+ spots");
    if(!s.pic||!P[s.pic])return;const z=size(s.pic);
    s.spots.forEach((p,k)=>{
      if(!(p.x>=z.x&&p.x<=z.x+z.w&&p.y>=z.y&&p.y<=z.y+z.h))bad("spot "+(k+1)+" is off the picture");
      if(o&&o.label&&!p.label)bad("spot "+(k+1)+" needs a label");
      if(o&&o.text&&!p.text)bad("spot "+(k+1)+" needs text");
      if(p.px!=null&&!(p.px>=z.x&&p.px<=z.x+z.w&&p.py>=z.y&&p.py<=z.y+z.h))bad("spot "+(k+1)+" points off the picture");
    });
    if(o&&o.label&&!uniq(s.spots.map(p=>p.label)))bad("repeated label");
  };
  switch(s.t){
    case "teach":case "learn":if(!s.title||!(s.say||s.text))bad("teaching needs a title and text");break;
    case "explore":if(!s.title)bad("explore needs a title");spots(2,{label:1,text:1});break;
    case "watch":if(!Array.isArray(s.frames)||s.frames.length<2)bad("watch needs 2+ frames");else s.frames.forEach((f,k)=>{if(!f.text)bad("frame "+(k+1)+" needs text");pic(f.pic)});break;
    case "cards":if(!Array.isArray(s.cards)||s.cards.length<2)bad("cards need 2+ cards");else s.cards.forEach((c,k)=>{if(!(c.front||c.pic)||!c.back)bad("card "+(k+1)+" needs a front and back");pic(c.pic)});break;
    case "choice":
      if(!s.q)bad("no question");
      if(!Array.isArray(s.opts)||s.opts.length<2)bad("choice needs options");
      else{if(!uniq(s.opts.map(txt)))bad("repeated option");s.opts.forEach(o=>typeof o==="object"&&pic(o.pic));if(!(s.a>=0&&s.a<s.opts.length))bad("answer out of range")}
      break;
    case "tf":if(typeof s.a!=="boolean")bad("true/false needs a boolean");if(!s.q)bad("no question");break;
    case "tap":{const t=String(s.text||"").split(/\s+/);if(!t.some(w=>/^\{[^}]+\}\W*$/.test(w)))bad("tap needs a {answer}");if(!s.why)bad("tap needs a why");break}
    case "gap":{
      const ans=(String(s.text||"").match(/\[([^\]]+)\]/g)||[]).map(x=>x.slice(1,-1).toLowerCase());
      if(!ans.length)bad("gap needs a [gap]");
      (s.opts||[]).forEach(o=>{if(ans.includes(String(o).toLowerCase()))bad("a spare tile is also an answer: "+o)});
      break;
    }
    case "build":{const a=Array.isArray(s.answer)?s.answer:String(s.answer||"").split(" ");if(a.length<3)bad("build needs 3+ tiles");if(!s.q)bad("no question");break}
    case "order":if(!Array.isArray(s.items)||s.items.length<3||!uniq(s.items))bad("order needs 3+ different items");break;
    case "match":{
      if(!Array.isArray(s.pairs)||s.pairs.length<3)return bad("match needs 3+ pairs");
      const l=s.pairs.map(p=>txt(p[0])),r=s.pairs.map(p=>txt(p[1]));
      if(!uniq(l)||!uniq(r))bad("match has a repeated item");if(s.pairs.some(p=>p.length!==2))bad("bad pair");
      s.pairs.forEach(p=>p.forEach(x=>typeof x==="object"&&pic(x.pic)));break;
    }
    case "sort":
      if(!Array.isArray(s.bins)||s.bins.length<2)bad("sort needs 2+ boxes");
      if(!Array.isArray(s.items)||s.items.length<3)bad("sort needs 3+ items");
      else s.items.forEach((it,k)=>{if(!(it.bin>=0&&it.bin<s.bins.length))bad("item "+(k+1)+" has no box");if(!it.text&&!it.pic)bad("item "+(k+1)+" is empty");pic(it.pic)});
      break;
    case "judge":
      if(!Array.isArray(s.items)||s.items.length<3)bad("good or bad needs 3+ items");
      else s.items.forEach((it,k)=>{if(typeof it.good!=="boolean")bad("item "+(k+1)+" needs good true or false");if(!it.why)bad("item "+(k+1)+" needs a why");pic(it.pic)});
      break;
    case "spot":if(!Array.isArray(s.lines)||s.lines.length<3)bad("spot the mistake needs 3+ lines");else if(!(s.a>=0&&s.a<s.lines.length))bad("answer out of range");if(!s.why)bad("spot needs a why");break;
    case "next":if(!Array.isArray(s.seq)||s.seq.length<2)bad("what comes next needs 2+ steps");if(!Array.isArray(s.opts)||s.opts.length<2||!uniq(s.opts))bad("needs 2+ different options");else if(!(s.a>=0&&s.a<s.opts.length))bad("answer out of range");break;
    case "scene":
      if(!s.say||!s.q)bad("scenario needs what's said and a question");
      if(!Array.isArray(s.opts)||s.opts.length<2)bad("scenario needs 2+ options");
      else{if(s.opts.filter(o=>o.ok).length!==1)bad("scenario needs exactly one right option");s.opts.forEach((o,k)=>{if(!o.text||!o.why)bad("option "+(k+1)+" needs text and a why")})}
      break;
    case "hot":spots(2,{label:1});if(!(s.a>=0&&s.spots&&s.a<s.spots.length))bad("answer out of range");if(!s.q||!s.why)bad("needs a question and a why");break;
    case "label":spots(3,{label:1});break;
    case "load":
      if(!Array.isArray(s.items)||s.items.length<2)bad("load needs 2+ items");
      else{s.items.forEach(it=>pic(it.pic));Object.keys(s.need||{}).forEach(k=>{if(!s.items.some(it=>it.key===k))bad("needs "+k+" but there's no "+k+" to drag")});if(!Object.values(s.need||{}).some(v=>v>0))bad("load needs something to load")}
      break;
    case "quick":if(!Array.isArray(s.items)||s.items.length<3)bad("quick fire needs 3+ items");else s.items.forEach((it,k)=>{if(!it.q)bad("item "+(k+1)+" needs a question");if(it.opts?!(it.a>=0&&it.a<it.opts.length):typeof it.a!=="boolean")bad("item "+(k+1)+" needs an answer")});break;
    case "banner":if(!s.title)bad("banner needs a title");break;
  }
}
const units=[].concat(...Object.values(T.courses),T.fs);
units.forEach(u=>{
  if(!u.unit||!u.lessons||!u.lessons.length)problems.push("unit without lessons: "+u.unit);
  u.lessons.forEach(l=>{
    lessons++;
    if(ids.has(l.id))problems.push("duplicate lesson id "+l.id);ids.add(l.id);
    if(!l.steps.some(s=>!["teach","learn","explore","watch","banner"].includes(s.t)&&!(s.t==="cards"&&!s.recall)))problems.push(l.id+": no questions");
    l.steps.forEach((s,i)=>{steps++;checkStep(s,l.id+" step "+(i+1)+": ")});
    l.steps.forEach((s,i)=>{if(s.again)checkStep(s.again,l.id+" step "+(i+1)+" second go: ")});
    if(l.surprise){if(l.surprise.t==="banner")problems.push(l.id+": the surprise must be a question");checkStep(l.surprise,l.id+" surprise: ")}
  });
});
const byCourse=Object.entries(T.courses).map(([c,us])=>c+" "+us.length+" units").join(", ");
if(problems.length){console.log(problems.join("\n"));console.log("\n✗ "+problems.length+" problem(s)");process.exit(1)}
console.log("✓ "+lessons+" lessons, "+steps+" steps OK · "+(byCourse||"no course units yet")+" · maths/English "+T.fs.length+" units · "+Object.keys(P).length+" pictures");
