/* Evia7 usage: which features are used, so they can be improved (or retired), and so colleges can see Evia at work.
   Counts only: how many times each feature was opened today, plus what was saved (evidence, hours, lessons, tests…).
   Once a day, the days before today go to Nisia as one row each: the counts, the course, the app's version and the
   kind of device. No name, no text, no photos, and no identifier: two days from the same phone can't be joined up.
   Connected to a college, Nisia works out which college from the sign-in (for that college's impact report).
   The learner can turn it off in their profile ("Share anonymous usage"); nothing is counted or sent while it's off. */
(function(){
  const KEY="evia7-usage",OFF="evia7-usage-off",URL="https://ffgfigkeeeauzkifopei.supabase.co/rest/v1/rpc/nisia_usage_ping",
    API="sb_publishable_w_R4Kqq3UqNKQuv6erQzAQ_bXBkw8Bc";
  const day=(t)=>{const d=t?new Date(t):new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"null")||{days:{}}}catch(_){return {days:{}}}};
  let st=read(),saveT=null;
  const save=()=>{clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(st))}catch(_){}},800)};
  const off=()=>{try{return localStorage.getItem(OFF)==="1"}catch(_){return false}};
  function hit(f){
    if(off()||!f)return;
    const d=day(),c=st.days[d]=st.days[d]||{};
    const k=String(f).toLowerCase().replace(/[^a-z0-9_.-]+/g,"-").slice(0,48);
    c[k]=Math.min(5000,(c[k]||0)+1);save();
  }
  /* A function on window (or on an object on window) that counts each time it's called. */
  function wrap(path,feature){
    const parts=path.split("."),name=parts.pop();let o=window;
    for(const p of parts){o=o&&o[p];if(!o)return}
    const fn=o[name];if(typeof fn!=="function"||fn.__counted)return;
    const w=function(){try{hit(typeof feature==="function"?feature.apply(this,arguments):feature)}catch(_){}return fn.apply(this,arguments)};
    w.__counted=true;o[name]=w;
  }
  const POINTS=[
    ["nav",s=>"screen."+s],["chat","chat.open"],["eviaOpenProfile","profile.open"],
    /* Evidence */
    ["eviaGuide.start","evidence.guide"],["eviaGuide.free","evidence.free"],["eviaGuide.record","evidence.record"],["eviaGuide.catchUp","evidence.catch-up"],
    ["eviaCoachFlows.evidenceCheck","evidence.check"],["eviaOpenSendToPortfolio","evidence.send-to-portfolio"],
    /* Evia's chat actions */
    ["eviaCoachFlows.hours","chat.log-hours"],["eviaCoachFlows.confidence","chat.confidence"],["eviaCoachFlows.upskill","chat.upskill"],
    ["eviaCoachFlows.evidence","chat.evidence"],["eviaCoachFlows.quickReview","chat.quick-review"],["eviaCoachFlows.prepare","chat.review-prep"],
    ["eviaCoachFlows.targets","chat.targets"],["eviaCoachFlows.epa","chat.epa"],["eviaBrain.answer","chat.question"],
    /* Learning */
    ["eviaTeach.open",s=>"teach.open."+s],["eviaTeach.play","teach.lesson"],["eviaTeach.confidence","teach.confidence"],
    ["eviaOpenEpa","epa.open"],["eviaExam.open","epa.exam"],["eviaDiscussion.open","epa.discussion"],["eviaPractice.startTest",t=>"test."+t],
    ["eviaPractice.openSkills","skills.open"],["eviaPractice.openConfidence","confidence.open"],
    /* Hours, reviews, targets */
    ["eviaOpenLearningLogs","hours.logs"],["eviaOpenOtjPdf","hours.pdf"],["eviaStartReview","review.open"],["eviaChatReview","review.open"],
    ["eviaReviewReminder","review.reminder"],["eviaOpenReviewPdf","review.pdf"],
    /* College */
    ["eviaCheckIn.open","college.check-in"],["eviaJoinCollege","college.connect"],
    /* Fun */
    ["eviaGames.open",k=>"games."+k],["eviaLeaderboard.open","games.leaderboard"],["eviaRewards.openItem","rewards.item"],
    ["eviaShowShapePicker","look.shape"],["eviaShowThemePicker","look.colour"],["eviaAccessibility.open","settings.accessibility"],
    /* Data */
    ["eviaStorage.backup","data.backup"],["eviaStorage.restore","data.restore"]
  ];
  const wrapAll=()=>POINTS.forEach(([p,f])=>wrap(p,f));
  /* What was saved on a day, from Evia's own records (so it's counted however it was done). */
  const when=r=>r.createdAt||r.takenAt||r.completedAt||r.lastAt||r.date||null;
  function saved(d){
    const out={},add=(k,n)=>{if(n)out[k]=(out[k]||0)+n};
    const D=window.eviaData;if(!D)return out;
    ["evidence","supporting","hours","lessonResults","tests","confidence","scenarios","reviews","skills"].forEach(c=>{
      let rows=[];try{rows=D.list(c)}catch(_){return}
      rows.filter(r=>r&&!r.deletedAt&&when(r)&&day(when(r))===d).forEach(r=>{
        add("saved."+c,1);
        if(c==="hours"&&r.source)add("saved.hours."+r.source,1);
        if(c==="tests"&&r.type)add("saved.tests."+r.type,1);
        if(c==="supporting"&&r.type)add("saved.supporting."+r.type,1);
        if(c==="lessonResults"&&r.done)add("saved.lessons-done",1);
      });
    });
    return out;
  }
  const platform=()=>{const u=navigator.userAgent,app=(matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone;
    return (/iP(hone|ad|od)/.test(u)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1)?"ios":/Android/.test(u)?"android":"desktop")+(app?"-app":"-web")};
  const version=()=>((document.querySelector('meta[name="evia-version"]')||{}).content)||"";
  let sending=false;
  async function send(){
    if(sending||!navigator.onLine||/^(localhost|127\.)/.test(location.hostname))return;   /* never from a test copy */
    const today=day(),days=Object.keys(st.days).filter(d=>d<today).sort();
    if(!days.length)return;
    if(off()){days.forEach(d=>delete st.days[d]);save();return}
    sending=true;
    try{
      let token="";try{const a=JSON.parse(localStorage.getItem("evia7-nisia-auth")||"null");token=a&&a.access_token||""}catch(_){}
      for(const d of days.slice(-14)){
        const body={p:{day:d,app:"evia",version:version(),course:typeof course==="string"?course:"",platform:platform(),counts:Object.assign({},saved(d),st.days[d])}};
        const post=auth=>fetch(URL,{method:"POST",headers:Object.assign({"Content-Type":"application/json",apikey:API},auth?{Authorization:"Bearer "+auth}:{}),body:JSON.stringify(body)});
        let r=await post(token);
        if(r.status===401&&token)r=await post("");   /* an old sign-in: send it without the college */
        if(!r.ok)break;
        delete st.days[d];
      }
      days.filter(d=>d<day(Date.now()-14*864e5)).forEach(d=>delete st.days[d]);
      try{localStorage.setItem(KEY,JSON.stringify(st))}catch(_){}
    }catch(_){/* try again later */}
    finally{sending=false}
  }
  window.eviaUsage={hit,send,off,setOff(v){try{v?localStorage.setItem(OFF,"1"):localStorage.removeItem(OFF)}catch(_){}if(v){st={days:{}};try{localStorage.removeItem(KEY)}catch(_){}}}};
  /* Once everything is loaded (the functions to count are defined by then), and again when the day changes. */
  const start=()=>{wrapAll();setTimeout(wrapAll,3000);setTimeout(send,8000)};
  if(document.readyState==="complete")start();else addEventListener("load",start);
  addEventListener("online",()=>setTimeout(send,5000));
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")setTimeout(send,5000)});
})();
