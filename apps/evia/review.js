/* Evia review/test layer. Uses the copied DDRNFinch/EPA banks in test-banks.js. */
(function(){
  /* Learner data is read and written through eviaData (data.js). */
  const D=()=>window.eviaData;
  const courseMap={bricklayer:"bricklaying",site:"siteCarpentry",joiner:"benchJoinery"};
  const academicEnabled=subject=>{
    return !!D().learner()[subject+"Enabled"];
  };
  const enabledSubjects=()=>["maths","english"].filter(academicEnabled);
  const escLocal=s=>String(s??"").replace(/[&<>"]/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[x]));
  const shuffle=a=>[...a].sort(()=>Math.random()-.5);
  const bankFor=subject=>{
    const key=courseMap[course]||"bricklaying";
    if(subject==="discussion")return Array.isArray(EPA_DISCUSSIONS?.[key])?EPA_DISCUSSIONS[key]:[];
    if(subject==="epa")return Array.isArray(EPA_QUESTIONS?.[key])?EPA_QUESTIONS[key]:[];
    if(subject==="maths")return Array.isArray(EPA_MATHS_QUESTIONS)?EPA_MATHS_QUESTIONS:[];
    if(subject==="english")return Array.isArray(EPA_ENGLISH_QUESTIONS)?EPA_ENGLISH_QUESTIONS:[];
    return [];
  };
  const saveTest=(type,result)=>{
    window.eviaData.put("tests",{...result,type,course});
    try{window.dispatchEvent(new CustomEvent("evia:test-saved",{detail:{type,pct:result.pct,score:result.score,total:result.total,full:!!result.full,missed:result.missed||[]}}))}catch(_){}
  };
  const latestTest=type=>{
    const all=D().list("tests",{course,type});
    return all[all.length-1]||null;
  };
  const latestTests=()=>({discussion:latestTest("discussion"),epa:latestTest("epa"),maths:latestTest("maths"),english:latestTest("english")});
  const testLabel=t=>({discussion:"Discussion",epa:"EPA MCQ",maths:"Maths",english:"English"}[t]||t);
  const formatUKDate=value=>{if(!value)return "";const s=String(value);const m=s.match(/^(\\d{4})-(\\d{2})-(\\d{2})(?:$|T|\\s)/);if(m)return m[3]+"/"+m[2]+"/"+m[1];const d=new Date(s);return Number.isNaN(d.getTime())?s:d.toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"})};
  const wordCount=s=>String(s||"").trim().split(/\\s+/).filter(Boolean).length;
  const evidenceStrength=(photos,words)=>{const p=photos<=4?"weak":photos<=9?"good":"strong",w=words<=49?"weak":words<=99?"good":"strong";return p==="strong"&&w==="strong"?"strong":p==="weak"||w==="weak"?"weak":"good"};
  const strengthLabel=s=>s==="strong"?"Strong":s==="good"?"Good":s==="weak"?"Weak":"No evidence";
  const meaningfulTerms=text=>{const stop=new Set("the and for with from that this have has was were are is to of a an in on at by as it i we our my you your they them did do done then than into using used use about what when where how while after before very also just more less good great completed complete evidence task job work".split(" "));const raw=String(text||"").toLowerCase().replace(/[^a-z0-9' -]/g," ").split(/\\s+/).filter(Boolean);const counts=new Map();for(let i=0;i<raw.length;i++){const w=raw[i];if(w.length>=4&&!stop.has(w))counts.set(w,(counts.get(w)||0)+1);if(i<raw.length-1){const b=w+" "+raw[i+1];if(w.length>=3&&raw[i+1].length>=3&&!stop.has(w)&&!stop.has(raw[i+1]))counts.set(b,(counts.get(b)||0)+1)}}return [...counts.entries()].sort((a,b)=>b[1]-a[1]||b[0].length-a[0].length).map(x=>x[0]).filter((x,i,a)=>!a.some((y,j)=>j<i&&y.includes(x))).slice(0,3)};
  const unitStatement=(u,name)=>{const es=evidence.filter(e=>e.c===course&&e.u===u);if(!es.length)return "No evidence has been submitted for this unit yet.";const photos=es.reduce((n,e)=>n+(Array.isArray(e.photoIds)?e.photoIds.length:(Number.isFinite(Number(e.photoCount))?Number(e.photoCount):(Array.isArray(e.p)?e.p.length:0))),0),words=es.reduce((n,e)=>n+wordCount(e.w),0),strength=evidenceStrength(photos,words),terms=meaningfulTerms(es.map(e=>e.w||"").join(" "));const area=terms.length?" and has referenced areas such as "+terms.join(", "):"";const opening=strength==="strong"?"has built a strong evidence pack for":strength==="good"?"has built a good evidence pack for":"has started the evidence pack for";const close=strength==="strong"?"This is currently classed as a strong evidence pack based on the amount of supporting material provided.":strength==="good"?"This is currently classed as a good evidence pack based on the amount of supporting material provided.":"Further evidence or written detail would strengthen the pack.";return name+" "+opening+" "+u+area+". They have provided "+es.length+" "+(es.length===1?"occasion":"occasions")+" consisting of "+photos+" photos and "+words+" written words. "+close};
  const bar=(label,value)=>'<div class="review-bar-row"><div><strong>'+escLocal(label)+'</strong><span>'+value+'%</span></div><div class="review-bar-track"><i style="width:'+Math.max(0,Math.min(100,Number(value)||0))+'%"></i></div></div>';
  const stat=(label,value,sub="")=>'<div class="review-stat"><span>'+escLocal(label)+'</span><strong>'+escLocal(value)+'</strong>'+(sub?'<small>'+escLocal(sub)+'</small>':"")+'</div>';
  const ensureReviewStyles=()=>{if(document.getElementById("evia-review-dashboard-style"))return;const s=document.createElement("style");s.id="evia-review-dashboard-style";s.textContent='.review-dashboard{display:grid;gap:14px}.review-section{border:1px solid #e4e7ec;border-radius:16px;padding:15px;background:#fff}.review-section h3{margin:0 0 11px}.review-sub{color:#667085;font-size:12px;margin:0 0 12px}.review-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.review-stat{border:1px solid #edf0f3;border-radius:12px;padding:11px;display:grid;gap:3px}.review-stat span{font-size:11px;color:#667085}.review-stat strong{font-size:18px}.review-stat small{font-size:10px;color:#98a2b3}.review-bar-row{margin:10px 0}.review-bar-row>div:first-child{display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px}.review-bar-track{height:9px;border-radius:999px;background:#eef1f4;overflow:hidden}.review-bar-track i{display:block;height:100%;border-radius:999px;background:#1b2435}.review-chart{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;align-items:end;height:110px;padding-top:8px}.review-chart-col{height:100%;display:flex;flex-direction:column;justify-content:end;align-items:center;gap:5px}.review-chart-col i{display:block;width:70%;max-width:28px;min-height:3px;border-radius:6px 6px 2px 2px;background:#1b2435}.review-chart-col span{font-size:9px;color:#667085;text-align:center}.review-pills{display:flex;flex-wrap:wrap;gap:6px}.review-pill{border:1px solid #e1e5ea;border-radius:999px;padding:7px 9px;font-size:11px}.review-generated{line-height:1.55;color:#344054}.review-unit-strength{display:flex;align-items:center;gap:8px}.review-strength-bars{display:flex;gap:3px}.review-strength-bars i{width:7px;height:13px;border-radius:2px;background:#e5e7eb}.review-strength-bars i.filled{background:#1b2435}.target-complete-overlay{position:fixed;inset:0;z-index:300;background:rgba(20,28,42,.28);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:22px}.target-complete-modal{position:relative;width:min(92vw,390px);background:#fff;border-radius:28px;padding:28px 24px 30px;text-align:center;box-shadow:0 24px 70px rgba(16,24,40,.22);overflow:hidden}.target-complete-close{position:absolute;top:10px;right:12px;border:0;background:transparent;font-size:28px;line-height:1;color:#667085;cursor:pointer}.target-evia{width:82px;height:82px;margin:4px auto 14px;border-radius:50%;background:#f5c400;display:flex;align-items:center;justify-content:center;animation:targetEviaJump 900ms cubic-bezier(.2,.8,.2,1) both}.target-evia .evia-face{display:flex;gap:12px;align-items:center}.target-evia .evia-face i{display:block;width:10px;height:15px;border-radius:50%;background:#174b5b}.target-complete-kicker{font-size:11px;letter-spacing:.16em;font-weight:900;color:var(--yellow);margin-top:3px}.target-complete-modal h2{margin:7px 20px 5px;font-size:22px}.target-complete-modal p{margin:0 0 18px;color:#667085}.target-complete-bar{height:16px;border-radius:999px;background:#eceff2;overflow:hidden}.target-complete-bar i{display:block;width:0;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--yellow-line),var(--yellow));transition:width 1.4s cubic-bezier(.2,.8,.2,1)}.target-complete-bar i.complete{box-shadow:0 0 18px color-mix(in srgb,var(--yellow) 38%,transparent)}.target-complete-percent{font-size:24px;font-weight:900;margin-top:9px}.target-complete-message{opacity:0;transform:translateY(8px) scale(.94);font-size:16px;font-weight:900;color:var(--yellow);margin-top:12px;transition:opacity .35s ease,transform .35s ease}.target-complete-message.show{opacity:1;transform:none}@keyframes targetEviaJump{0%{transform:translateY(18px) scale(.88)}35%{transform:translateY(-12px) scale(1.04)}58%{transform:translateY(2px) scale(.98)}78%{transform:translateY(-5px) scale(1.01)}100%{transform:none}}@media(min-width:700px){.review-stat-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}';document.head.appendChild(s)};

  const reply=(html,delay=700)=>{const chat=$("#chat");if(!chat)return;const el=document.createElement("div");el.className="bubble evia evia-thinking";el.innerHTML='<span class="thinking-label">Evia is thinking</span><span class="thinking-dots"><i></i><i></i><i></i></span>';chat.appendChild(el);chat.scrollTop=chat.scrollHeight;setTimeout(()=>{el.outerHTML='<div class="bubble evia" data-thought-complete="1">'+html+'</div>';chat.scrollTop=chat.scrollHeight},delay)};

  /* opts.type starts a test straight away; opts.count sets how many questions (the full EPA mock uses 20). */
  function eviaTestMe(opts){
    opts=opts||{};
    const options=(window.eviaNvq&&window.eviaNvq.on())?[["epa","Quick quiz"],["epa-full","Full knowledge test"],["discussion","Discussion practice"]]:[["epa","EPA quick quiz"],["epa-full","EPA full mock"],["discussion","Discussion"]];
    if(academicEnabled("maths"))options.push(["maths","Maths"]);
    if(academicEnabled("english"))options.push(["english","English"]);
    const chatEl=$("#chat");
    const addBubble=v=>chatEl.insertAdjacentHTML("beforeend",'<div class="bubble user">'+escLocal(v)+'</div>');
    const scroll=()=>chatEl.scrollTop=chatEl.scrollHeight;
    if(opts.type){start(opts.type==="epa"&&opts.count>=20?"epa-full":opts.type);return}
    chatEl.insertAdjacentHTML("beforeend",'<div class="bubble evia"><strong>Test me</strong><br>Choose a test.</div><div class="chat-options">'+options.map(o=>'<button class="chat-pill" data-test-kind="'+o[0]+'"><strong>'+o[1]+'</strong></button>').join("")+'</div>');
    scroll();
    document.querySelectorAll("[data-test-kind]").forEach(b=>b.onclick=()=>{
      document.querySelectorAll("[data-test-kind]").forEach(x=>x.remove());
      addBubble(b.textContent.trim());
      start(b.dataset.testKind);
    });
    function start(kind){
      if(kind==="discussion"&&window.eviaDiscussion){const x=document.getElementById("x");if(x)x.click();setTimeout(()=>window.eviaDiscussion.open({count:opts.count}),150)}
      else if(kind==="discussion")runDiscussion();
      else if(kind==="epa-full")runChoiceTest("epa",20);
      else runChoiceTest(kind,opts.count||5);
    }

    function runDiscussion(){
      const bank=bankFor("discussion"),qs=opts.count&&opts.count<5?shuffle(bank).slice(0,opts.count):bank.slice(0,5);
      const result={questions:[],score:0,total:qs.length};
      let i=0;
      const ask=()=>{
        if(i>=qs.length){
          result.pct=result.total?Math.round(result.score/result.total*100):0;
          chatEl.insertAdjacentHTML("beforeend",'<div class="bubble evia"><strong>Discussion complete</strong><br>'+result.score+' / '+result.total+' areas covered ('+result.pct+'%). I’ve saved this for your progress review.</div>');
          scroll();
          saveTest("discussion",result);
          return;
        }
        const q=qs[i];
        chatEl.insertAdjacentHTML("beforeend",'<div class="bubble evia"><strong>Question '+(i+1)+' of '+qs.length+'</strong><br>'+escLocal(q.prompt)+'</div><textarea class="test-response" data-discussion-answer placeholder="Type or use your phone microphone to answer..."></textarea><button class="chat-pill test-submit" data-discussion-submit><strong>Submit answer</strong></button>');
        scroll();
        const submit=document.querySelector("[data-discussion-submit]");
        submit.onclick=()=>{
          const input=document.querySelector("[data-discussion-answer]");
          const answer=String(input?.value||"").trim();
          if(!answer)return;
          const lower=answer.toLowerCase();
          const covered=q.points.filter(p=>p.terms.some(term=>lower.includes(term.toLowerCase())));
          const pct=Math.round(covered.length/q.points.length*100);
          const passed=covered.length>=3;
          if(passed)result.score++;
          result.questions.push({prompt:q.prompt,answer,covered:covered.map(x=>x.label),missing:q.points.filter(x=>!covered.includes(x)).map(x=>x.label),pct,correct:passed});
          input.disabled=true;submit.remove();
          chatEl.insertAdjacentHTML("beforeend",'<div class="bubble user">'+escLocal(answer)+'</div><div class="bubble evia">'+(passed?"Good coverage. ":"There are areas to develop. ")+'You covered '+covered.length+' of '+q.points.length+' key areas.'+(passed?"":"<br><strong>Mini-session:</strong> Revisit "+q.points.filter(x=>!covered.includes(x)).map(x=>escLocal(x.label)).join(", ")+" before your next attempt.")+'</div><button class="chat-pill test-submit" data-next-test><strong>'+(i+1<qs.length?"Next question":"Finish")+'</strong></button>');
          document.querySelector("[data-next-test]").onclick=()=>{document.querySelector("[data-next-test]").remove();i++;ask()};
          scroll();
        };
      };
      ask();
    }

    function runChoiceTest(type,count){
      const source=bankFor(type),full=type==="epa"&&count>=20;
      const qs=shuffle(source).slice(0,count||5);
      /* Tests run as a proper exam on their own screen (exam.js): no hints until the end. */
      if(window.eviaExam&&qs.length){
        const nvq=!!(window.eviaNvq&&window.eviaNvq.on()),isA=type==="maths"||type==="english";
        const title=full?(nvq?"Full knowledge test":"EPA full mock"):type==="epa"?(nvq?"Knowledge quick quiz":"EPA quick quiz"):testLabel(type)+" test";
        const questions=qs.map(q=>({q:q[1],options:shuffle(q[2]),correct:isA?q[3]:q[2][0],explanation:isA?q[4]:"",ksb:isA?"":q[0]}));
        chatEl.insertAdjacentHTML("beforeend",'<div class="bubble evia"><strong>'+escLocal(title)+'</strong><br>Opening your test now. There are no hints until the end. Good luck!</div>');scroll();
        setTimeout(()=>{
          const x=document.getElementById("x");if(x)x.click();
          window.eviaExam.open({title,kind:type==="epa"?(nvq?"Knowledge test":"End-point assessment practice"):"Practice test",intro:full?"Take your time and answer each one as you would in the real test.":"",questions,onFinish:r=>{
            const missed=type==="epa"?[...new Set(r.questions.filter(x=>!x.ok).map(x=>x.ksb).filter(Boolean))]:[];
            saveTest(type,Object.assign({},r,{full,missed}));
            /* Show what each missed KSB covers, not just its code. */
            const text=c=>{try{for(const u of data().u)for(const k of u[1]){const [cd,t]=String(k).split("|");if(cd===c&&t)return t.split(/:\s|\.\s/)[0].replace(/[.,;]+$/,"")}}catch(_){}return c};
            return {revise:missed.slice(0,6).map(text)};
          }});
        },900);
        return;
      }
      if(full)chatEl.insertAdjacentHTML("beforeend",'<div class="bubble evia"><strong>EPA full mock</strong><br>'+qs.length+' questions from across your KSBs. Take your time and answer each one as you would in the real test.</div>');
      let i=0,score=0;
      const result={questions:[],score:0,total:qs.length};
      const ask=()=>{
        if(i>=qs.length){
          result.score=score;result.pct=qs.length?Math.round(score/qs.length*100):0;
          result.full=full;
          const missed=type==="epa"?[...new Set(result.questions.filter(x=>!x.ok).map(x=>x.ksb).filter(Boolean))]:[];
          result.missed=missed;
          chatEl.insertAdjacentHTML("beforeend",'<div class="bubble evia"><strong>'+(full?"EPA full mock":testLabel(type))+' complete</strong><br>'+score+' / '+qs.length+' correct ('+result.pct+'%). I’ve saved this for your progress review.'+(missed.length?'<br><br><strong>Worth revising:</strong> '+escLocal(missed.slice(0,6).join(", "))+(missed.length>6?' and '+(missed.length-6)+' more':'')+'. Tap a KSB on My progress to read what it covers.':'')+'</div>');
          scroll();
          saveTest(type,result);
          return;
        }
        const q=qs[i];
        const isAcademic=type==="maths"||type==="english";
        const answers=isAcademic?q[2]:q[2];
        const correct=isAcademic?q[3]:q[2][0];
        const explanation=isAcademic?q[4]:"";
        chatEl.insertAdjacentHTML("beforeend",'<div class="bubble evia"><strong>Question '+(i+1)+' of '+qs.length+'</strong><br>'+escLocal(q[1])+'</div><div class="rating-options">'+shuffle(answers).map((a,n)=>'<button class="rating-pill" data-test-answer="'+encodeURIComponent(a)+'"><strong>'+String.fromCharCode(65+n)+'. '+escLocal(a)+'</strong></button>').join("")+'</div>');
        scroll();
        document.querySelectorAll("[data-test-answer]").forEach(btn=>btn.onclick=()=>{
          const chosen=decodeURIComponent(btn.dataset.testAnswer);
          const ok=chosen===correct;
          if(ok)score++;
          result.questions.push({question:q[1],chosen,correct,ok,explanation,ksb:isAcademic?"":q[0]});
          document.querySelectorAll("[data-test-answer]").forEach(x=>x.disabled=true);
          document.querySelectorAll("[data-test-answer]").forEach(x=>{if(decodeURIComponent(x.dataset.testAnswer)===correct)x.classList.add("correct")});
          if(!ok)btn.classList.add("wrong");else btn.classList.add("chosen");
          if(window.eviaMood)window.eviaMood(ok?"happy":"oops");
          const currentOptions=btn.closest(".rating-options");
          if(currentOptions){currentOptions.classList.add("answered");currentOptions.querySelectorAll("[data-test-answer]").forEach(x=>x.removeAttribute("data-test-answer"))} /* the answers stay, marked, so the learner sees which was right */
          const hasMini=!ok && isAcademic && q[5] && Array.isArray(q[6]);
          const microId="micro-"+Date.now()+"-"+i+"-"+Math.random().toString(36).slice(2,7);
          const miniHtml=hasMini
            ? '<div id="'+microId+'" class="micro-teach"><div class="tag">Mini-session</div><p><strong>'+escLocal(q[5])+'</strong></p><div class="rating-options micro-options">'+q[6].map((a,n)=>'<button type="button" class="rating-pill" data-micro-answer="'+encodeURIComponent(a)+'"><strong>'+String.fromCharCode(65+n)+'. '+escLocal(a)+'</strong></button>').join("")+'</div><div class="micro-result"></div></div>'
            : '';
          chatEl.insertAdjacentHTML("beforeend",'<div class="bubble evia"><strong>'+(ok?"Correct":"Not quite")+'</strong><br>'+(ok?"That is correct.":"The correct answer is: "+escLocal(correct)+".")+(explanation?'<br><br>'+escLocal(explanation):"")+'</div>'+miniHtml+(hasMini?'':'<button type="button" class="chat-pill test-submit" data-next-test><strong>'+(i+1<qs.length?"Next question":"Finish")+'</strong></button>'));
          if(hasMini){
            const microBlock=document.getElementById(microId);
            const microButtons=Array.from(microBlock.querySelectorAll("[data-micro-answer]"));
            microButtons.forEach(mb=>mb.onclick=e=>{
              e.preventDefault();
              e.stopPropagation();
              if(microBlock.dataset.answered==="1")return;
              microBlock.dataset.answered="1";
              const microChosen=decodeURIComponent(mb.dataset.microAnswer);
              const microCorrect=String(q[7]??q[6][0]);
              microButtons.forEach(x=>x.disabled=true);
              const box=microBlock.querySelector(".micro-result");
              if(microChosen===microCorrect){
                mb.classList.add("correct");
                box.innerHTML='<strong>Mini-session complete.</strong> You can move on.';
              }else{
                mb.classList.add("wrong");
                microButtons.forEach(x=>{if(decodeURIComponent(x.dataset.microAnswer)===microCorrect)x.classList.add("correct")});
                box.innerHTML='Not quite. The correct answer is <strong>'+escLocal(microCorrect)+'</strong>.';
              }
              const nextWrap=document.createElement("div");
              nextWrap.innerHTML='<button type="button" class="chat-pill test-submit" data-next-test><strong>'+(i+1<qs.length?"Next question":"Finish")+'</strong></button>';
              microBlock.appendChild(nextWrap.firstElementChild);
              const next=microBlock.querySelector("[data-next-test]");
              next.onclick=e=>{e.preventDefault();e.stopPropagation();next.remove();i++;ask()};
              scroll();
            });
          }else{
            const next=document.querySelector("[data-next-test]");
            if(next)next.onclick=()=>{next.remove();i++;ask()};
          }
          scroll();
        });
      };
      ask();
    }
  }

  function targetProgress(t){
    const value=String(t.measure||"");
    if(value==="otj_hours"){
      const total=hours.filter(x=>x.course===course||!x.course).reduce((n,x)=>n+Number(x.n||0),0);
      return t.targetValue?Math.max(0,Math.min(100,total/Number(t.targetValue)*100)):0;
    }
    return Number(t.progress||0);
  }
  function targetStatus(t){
    const progress=targetProgress(t);
    if(t.completed||progress>=100)return "complete";
    if(new Date(t.deadline+"T23:59:59").getTime()<Date.now())return "overdue";
    return "active";
  }
  function metrics(){
    const entries=evidence.filter(e=>e.c===course), units=data().u;
    const covered=new Set(entries.map(e=>e.u).filter(n=>units.some(u=>u[0]===n)));
    const totalPhotos=entries.reduce((n,e)=>n+(Array.isArray(e.photoIds)?e.photoIds.length:(Number.isFinite(Number(e.photoCount))?Number(e.photoCount):(Array.isArray(e.p)?e.p.length:0))),0);
    const totalWords=entries.reduce((n,e)=>n+String(e.w||"").trim().split(/\s+/).filter(Boolean).length,0);
    const allKsb=new Map(); units.forEach(u=>u[1].forEach(k=>allKsb.set(code(k),text(k))));
    const captured=new Set(entries.flatMap(e=>Array.isArray(e.k)?e.k:[]).concat(inductionKsbs()));
    const groups={S:0,K:0,B:0,capturedS:0,capturedK:0,capturedB:0};
    allKsb.forEach((_,k)=>{if(groups[k[0]]!==undefined)groups[k[0]]++});
    captured.forEach(k=>{if(groups["captured"+k[0]]!==undefined)groups["captured"+k[0]]++});
    const unitDetails=units.map(u=>{
      const es=entries.filter(e=>e.u===u[0]);
      return {unit:u[0],entries:es.length,photos:es.reduce((n,e)=>n+(Array.isArray(e.photoIds)?e.photoIds.length:(Number.isFinite(Number(e.photoCount))?Number(e.photoCount):(Array.isArray(e.p)?e.p.length:0))),0),words:es.reduce((n,e)=>n+String(e.w||"").trim().split(/\s+/).filter(Boolean).length,0),ksbs:[...new Set(es.flatMap(e=>Array.isArray(e.k)?e.k:[]))],evidence:es.map(e=>({date:formatUKDate(e.savedAt||e.d||""),photos:Array.isArray(e.photoIds)?e.photoIds.length:(Number.isFinite(Number(e.photoCount))?Number(e.photoCount):(Array.isArray(e.p)?e.p.length:0)),notes:e.w||"",ksbs:Array.isArray(e.k)?e.k:[]}))};
    });
    const totalOTJ=hours.reduce((n,x)=>n+Number(x.n||0),0), meta=courseProgressMeta(), p=D().learner();
    let elapsed=0;
    if(p.start&&p.end){const s=new Date(p.start+"T00:00:00").getTime(),e=new Date(p.end+"T23:59:59").getTime();if(e>s)elapsed=Math.max(0,Math.min(1,(Date.now()-s)/(e-s)));}
    const history=confidenceHistory().filter(x=>x.course===course&&Array.isArray(x.scores)), current=history[history.length-1]||null, previous=history[history.length-2]||null;
    const confidenceAverage=current&&current.scores.length?Math.round(current.scores.reduce((n,x)=>n+x.score,0)/current.scores.length*100)/100:null;
    const pct=type=>{const t=latestTest(type);return t&&typeof t.pct==="number"?t.pct:null};
    const tests={discussion:latestTest("discussion"),epa:latestTest("epa"),maths:latestTest("maths"),english:latestTest("english")};
    const testDetails={};Object.keys(tests).forEach(k=>{const t=tests[k];testDetails[k]=t?{pct:t.pct,score:t.score,total:t.total,questions:t.questions||[],savedAt:t.takenAt?formatUKDate(t.takenAt):null}:null});
    const otjDetails=hours.map(x=>({date:formatUKDate(x.savedAt||x.d||""),hours:Number(x.n||0),description:x.description||""}));
    return {covered:covered.size,units:units.length,unitGap:Math.max(0,units.length-covered.size),completion:units.length?Math.round(covered.size/units.length*100):0,entries:entries.length,totalPhotos,totalWords,unitDetails,otjDetails,ksbTotal:allKsb.size,ksbCaptured:captured.size,ksbCompletion:allKsb.size?Math.round(captured.size/allKsb.size*100):0,ksbGroups:groups,totalOTJ,otjEntries:hours.length,otjBatches:otjBatches.length,otjTarget:meta.otjTarget,otjBehind:meta.otjTarget?totalOTJ<Math.max(1,meta.otjTarget*elapsed):false,elapsed,timePercent:Math.round(elapsed*100),tests:testDetails,confidenceAverage,confidenceRatings:current?.scores||[],previousConfidenceRatings:previous?.scores||[],confidenceChecks:history.length,lowConfidence:(current?.scores||[]).filter(x=>x.score<=2).map(x=>x.area)};
  }
  function targetHtml(t){
    const status=targetStatus(t), progress=Math.round(targetProgress(t)), label=status==="complete"?"Completed":status==="overdue"?"Overdue":"Active";
    return '<div class="target-item '+status+'"><div><strong>'+escLocal(t.title)+'</strong><p>'+escLocal(t.reason)+'</p><small>Due '+escLocal(new Date(t.deadline+"T00:00:00").toLocaleDateString("en-GB"))+' · '+label+'</small></div><b>'+progress+'%</b></div>';
  }
  function reviewKsbFollowUp(metrics){
    const captured=new Set(evidence.filter(e=>e.c===course).flatMap(e=>Array.isArray(e.k)?e.k:[]).concat(inductionKsbs()));
    const areas=[
      {key:"Teamwork",question:"Can you describe a recent time when you worked effectively as part of a team?",match:k=>/^B5$/i.test(code(k))||/team[- ]?focus|team work|teamwork|team goals|wider build team/i.test(text(k))},
      {key:"Equality, diversity and inclusion",question:"Can you describe a recent example of treating people fairly, respectfully and inclusively at work?",match:k=>/^B3$/i.test(code(k))||/inclusive|inclusion|divers|equity/i.test(text(k))},
      {key:"Health & safety",question:"Can you describe a recent example of how you worked safely and followed the correct health and safety procedures?",match:k=>/^S1$/i.test(code(k))||/^S2$/i.test(code(k))||/health and safety|safe systems of work|safety control|risk assessment|hazard/i.test(text(k))},
      {key:"Wellbeing",question:"Can you describe how you recognise wellbeing needs for yourself or others and know where to get support?",match:k=>/^S13$/i.test(code(k))||/^K20$/i.test(code(k))||/well-being|wellbeing|mental and physical health|access support/i.test(text(k))},
      {key:"Communication",question:"Can you describe a recent example of communicating clearly with others at work?",match:k=>/^S8$/i.test(code(k))||/^K13$/i.test(code(k))||/verbal communication|communication techniques|communicate with others/i.test(text(k))}
    ];
    const all=data().u.flatMap(u=>u[1]);
    for(const area of areas){
      const relevant=all.filter(area.match);
      const outstanding=relevant.filter(k=>!captured.has(code(k)));
      if(outstanding.length)return {area:area.key,question:area.question,ksbs:outstanding.map(k=>code(k))};
    }
    return null;
  }
  function reviewAutoSummary(m){
    const active=m.unitDetails.filter(u=>u.entries>0);
    const outstanding=m.unitDetails.filter(u=>u.entries===0);
    const strong=active.filter(u=>evidenceStrength(u.photos,u.words)==="strong");
    const good=active.filter(u=>evidenceStrength(u.photos,u.words)==="good");
    const successes=[];
    if(strong.length)successes.push("You have built strong evidence in "+strong.slice(0,3).map(u=>u.unit).join(", ")+".");
    else if(good.length)successes.push("You have built good evidence in "+good.slice(0,3).map(u=>u.unit).join(", ")+".");
    else if(active.length)successes.push("You have started building evidence across "+active.length+" course "+(active.length===1?"unit":"units")+".");
    if(m.ksbCaptured>0)successes.push("You have evidenced "+m.ksbCaptured+" of "+m.ksbTotal+" mapped KSBs.");
    const development=[];
    if(outstanding.length)development.push("Evidence is still outstanding for "+outstanding.slice(0,3).map(u=>u.unit).join(", ")+".");
    const weak=active.filter(u=>evidenceStrength(u.photos,u.words)==="weak");
    if(weak.length)development.push(weak.slice(0,3).map(u=>u.unit).join(", ")+" would benefit from more supporting evidence or written detail.");
    if(!development.length)development.push("Continue building evidence across your remaining learning activities and strengthen existing evidence where needed.");
    return {successes:successes.join(" "),development:development.join(" ")};
  }
  function reviewDashboardHtml(review){ensureReviewStyles();const m=review.metrics,p=D().learner(),name=String(review.learner||p.name||"Apprentice").split(/\\s+/)[0]||"Apprentice",timePct=Number(m.timePercent||m.elapsed*100||0),ksbPct=Number(m.ksbCompletion||0),strengthCounts={strong:0,good:0,weak:0};m.unitDetails.forEach(u=>{const s=evidenceStrength(u.photos,u.words);if(s)strengthCounts[s]++});const testCards=["maths","english","epa","discussion"].map(k=>{const t=m.tests[k],enabled=k==="maths"||k==="english"?academicEnabled(k):true;if(!enabled)return stat(testLabel(k),"Not enabled");if(!t)return stat(testLabel(k),"No test yet","0 attempts");const all=D().list("tests",{course,type:k}),scores=all.map(x=>Number(x.pct)||0);return stat(testLabel(k),t.pct+"%",all.length+" attempts · best "+Math.max(...scores)+"%")}).join(""),recentTests=["maths","english","epa","discussion"].flatMap(k=>D().list("tests",{course,type:k}).map(x=>({k,pct:Number(x.pct)||0,date:x.takenAt||""}))).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(-4),testChart=recentTests.length?'<div class="review-chart">'+recentTests.map(x=>'<div class="review-chart-col"><i style="height:'+Math.max(4,Math.min(100,x.pct))+'%"></i><span>'+escLocal(testLabel(x.k))+'<br>'+x.pct+'%</span></div>').join("")+'</div>':'<p class="review-sub">No test attempts recorded yet.</p>',unitHtml=m.unitDetails.map(u=>{const s=evidenceStrength(u.photos,u.words);return '<details class="review-detail"><summary><strong>'+escLocal(u.unit)+'</strong><span>'+u.entries+' occasions · '+u.photos+' photos</span></summary><div class="review-unit-strength"><span class="review-strength-bars">'+[0,1,2].map(i=>'<i class="'+(i<(s==="strong"?3:s==="good"?2:s==="weak"?1:0)?"filled":"")+'"></i>').join("")+'</span><strong>'+strengthLabel(s)+'</strong></div><p class="review-generated">'+escLocal(unitStatement(u.unit,name))+'</p><p>'+u.words+' written words · '+u.ksbs.length+' KSBs captured.</p>'+u.evidence.map(e=>'<div class="review-detail-row"><strong>'+escLocal(e.date)+'</strong><span>'+e.photos+' photos · '+escLocal(e.ksbs.join(", "))+'</span></div>').join("")+'</details>'}).join(""),subjectCards=["maths","english"].map(k=>'<div class="review-stat"><span>'+testLabel(k)+'</span><strong>'+(academicEnabled(k)?"Enabled":"Not enabled")+'</strong><small>'+(!academicEnabled(k)?"Not part of current learner setup.":m.tests[k]?m.tests[k].pct+"% latest · "+D().list("tests",{course,type:k}).length+" attempts":"Enabled · no test completed yet")+'</small></div>').join(""),conf=m.confidenceRatings.length?m.confidenceRatings.map(x=>'<span class="review-pill">'+escLocal(x.area)+': '+x.score+'/4</span>').join(""):'<span class="review-pill">No confidence check yet</span>';return '<div class="review-dashboard"><section class="review-section"><h3>Time on programme vs KSB coverage</h3><p class="review-sub">Elapsed course time compared with KSBs captured in evidence.</p>'+bar("Time on programme",timePct)+bar("KSBs captured",ksbPct)+'</section><section class="review-section"><h3>KSB coverage</h3><div class="review-stat-grid">'+stat("Overall",m.ksbCaptured+"/"+m.ksbTotal,ksbPct+"% captured")+stat("Skills",m.ksbGroups.capturedS+"/"+m.ksbGroups.S,m.ksbGroups.S?Math.round(m.ksbGroups.capturedS/m.ksbGroups.S*100)+"%":"0%")+stat("Knowledge",m.ksbGroups.capturedK+"/"+m.ksbGroups.K,m.ksbGroups.K?Math.round(m.ksbGroups.capturedK/m.ksbGroups.K*100)+"%":"0%")+stat("Behaviours",m.ksbGroups.capturedB+"/"+m.ksbGroups.B,m.ksbGroups.B?Math.round(m.ksbGroups.capturedB/m.ksbGroups.B*100)+"%":"0%")+'</div></section><section class="review-section"><h3>Evidence portfolio</h3><div class="review-stat-grid">'+stat("Evidence occasions",m.entries)+stat("Photos",m.totalPhotos)+stat("Written words",m.totalWords)+stat("Units covered",m.covered+"/"+m.units,m.completion+"%")+'</div><div class="review-pills"><span class="review-pill">Strong: '+strengthCounts.strong+'</span><span class="review-pill">Good: '+strengthCounts.good+'</span><span class="review-pill">Weak: '+strengthCounts.weak+'</span></div></section><section class="review-section"><h3>Maths & English</h3><div class="review-stat-grid">'+subjectCards+'</div></section><section class="review-section"><h3>EPA & practice tests</h3><div class="review-stat-grid">'+testCards+'</div>'+testChart+'</section><section class="review-section"><h3>Confidence</h3><div class="review-stat-grid">'+stat("Checks",m.confidenceChecks)+stat("Latest average",m.confidenceAverage!==null?m.confidenceAverage+"/4":"No check")+'</div><div class="review-pills">'+conf+'</div></section><section class="review-section"><h3>Off-the-job learning</h3><div class="review-stat-grid">'+stat("Total OTJ",m.totalOTJ.toFixed(2)+" hours")+stat("Learning entries",m.otjEntries)+stat("OTJ PDF batches",m.otjBatches)+'</div></section><section class="review-section"><h3>Evidence by unit</h3>'+unitHtml+'</section><section class="review-section"><h3>Targets</h3>'+review.targets.map(targetHtml).join("")+'</section></div>'}
  function openSavedReview(review){
    ensureReviewStyles();
    const auto=review.autoSummary||reviewAutoSummary(review.metrics);
    const followUp=review.ksbFollowUp;
    const reflection=review.reflection||{};
    const ksbHtml=followUp?'<section class="review-section"><h3>Additional KSB review question</h3><p class="review-sub">'+escLocal(followUp.area)+' was not fully evidenced at the time of this review.</p><div class="review-generated">'+(reflection.ksbFollowUp?escLocal(reflection.ksbFollowUp):"No response recorded.")+'</div></section>':"";
    const reflectionHtml='<section class="review-section"><h3>Learner comments</h3>'+(reflection.learnerFeedback?'<p class="review-generated"><strong>Learner feedback:</strong> '+escLocal(reflection.learnerFeedback)+'</p>':'<p class="review-sub">No learner feedback was recorded.</p>')+'</section>';
    const autoHtml='<section class="review-section"><h3>Review summary</h3><div class="review-generated"><p><strong>Successes:</strong> '+escLocal(auto.successes)+'</p><p><strong>Areas for development:</strong> '+escLocal(auto.development)+'</p></div></section>';
    $("#modal-root").innerHTML='<div class="overlay"><section class="sheet review-sheet"><div class="sheet-head"><div><div class="chat-kicker">EVIA</div><h2>Full progress review · '+formatUKDate(review.date)+'</h2></div><button class="close" id="review-close" aria-label="Close">×</button></div><div class="review-content">'+autoHtml+ksbHtml+reflectionHtml+reviewDashboardHtml(review)+'</div><div class="review-actions"><button class="secondary" id="review-pdf">Download PDF</button></div></section></div>';
    $("#review-close").onclick=()=>$("#modal-root").innerHTML="";
    $("#review-pdf").onclick=()=>downloadReviewPdf(review);
  }
    function downloadReviewPdf(review){
    const p=D().learner(),m=review.metrics,win=window.open("","_blank");
    if(!win){alert("Please allow pop-ups to download the progress review PDF.");return;}
    const tests=[["Discussion",review.tests.discussion],["EPA MCQ",review.tests.epa],["Maths",review.tests.maths],["English",review.tests.english]].filter(([,v])=>v!==null);
    const auto=review.autoSummary||reviewAutoSummary(review.metrics), followUp=review.ksbFollowUp, reflection=review.reflection||{};
    const testHtml=tests.map(([l,v])=>'<div class="stat"><strong>'+l+'</strong><span>'+v+'%</span></div>').join("");
    const unitHtml=m.unitDetails.map(u=>'<section class="unit"><h3>'+escLocal(u.unit)+'</h3><p><strong>'+u.entries+'</strong> evidence entries · <strong>'+u.photos+'</strong> photos · <strong>'+u.words+'</strong> written words · <strong>'+u.ksbs.length+'</strong> KSBs captured</p>'+u.evidence.map(e=>'<div class="record"><strong>'+escLocal(e.date)+'</strong><span>'+e.photos+' photos'+(e.ksbs.length?' · '+escLocal(e.ksbs.join(", ")):"")+'</span>'+(e.notes?'<p>'+escLocal(e.notes)+'</p>':"")+'</div>').join("")+'</section>').join("");
    const otjHtml=m.otjDetails.map(x=>'<div class="record"><strong>'+escLocal(x.date)+'</strong><span>'+window.eviaHM(x.hours)+'</span>'+(x.description?'<p>'+escLocal(x.description)+'</p>':"")+'</div>').join("");
    const confHtml=m.confidenceRatings.length?m.confidenceRatings.map(x=>'<span class="pill">'+escLocal(x.area)+': '+x.score+'/4</span>').join(""):'No confidence check recorded';
    const prevConf=m.previousConfidenceRatings.length?m.previousConfidenceRatings.map(x=>'<span class="pill">'+escLocal(x.area)+': '+x.score+'/4</span>').join(""):'No previous confidence check recorded';
    const targets=review.targets.map((t,i)=>'<section class="target"><strong>'+(i+1)+'. '+escLocal(t.title)+'</strong><p>'+escLocal(t.reason)+'</p><span>Due '+new Date(t.deadline+"T00:00:00").toLocaleDateString("en-GB")+' · '+(targetStatus(t)==="complete"?"Completed":targetStatus(t)==="overdue"?"Overdue":"Active")+' · '+Number(t.progress||0)+'%</span></section>').join("");
    const qHtml=Object.entries(m.tests).filter(([,t])=>t).map(([k,t])=>'<section class="test"><h3>'+escLocal(testLabel(k))+'</h3><p><strong>'+t.score+' / '+t.total+'</strong> · '+t.pct+'% · '+escLocal(t.savedAt||"")+'</p>'+t.questions.map((q,i)=>'<div class="record"><strong>Question '+(i+1)+'</strong><p>'+escLocal(q.question||q.prompt||"")+'</p>'+(q.chosen!==undefined?'<p>Answer: '+escLocal(q.chosen)+' · '+(q.ok?"Correct":"Incorrect")+'</p>':"")+(q.answer!==undefined?'<p>Response: '+escLocal(q.answer)+'</p>':"")+(q.explanation?'<p>Explanation: '+escLocal(q.explanation)+'</p>':"")+(q.covered?'<p>Areas covered: '+escLocal(q.covered.join(", "))+'</p>':"")+'</div>').join("")+'</section>').join("");
    win.document.write('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Evia Progress Review</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#172033;font:10pt -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.45}header{border-bottom:2px solid #e6b800;padding-bottom:14px;margin-bottom:18px}h1{font-size:23pt;margin:4px 0}h2{font-size:16pt;margin:20px 0 9px}h3{font-size:12pt;margin:0 0 6px}.eyebrow{font-size:8pt;letter-spacing:.13em;color:#667085;font-weight:800}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.stat{border:1px solid #e4e7ec;border-radius:10px;padding:10px;display:flex;justify-content:space-between}.unit,.test,.target{border:1px solid #e4e7ec;border-radius:10px;padding:11px;margin:8px 0;break-inside:avoid}.record{border-top:1px solid #eef0f3;padding:8px 0}.record:first-of-type{border-top:0}.record strong{display:block}.record span,.target span{color:#667085;font-size:9pt}.record p{margin:4px 0}.pill{display:inline-block;border:1px solid #dfe3e8;border-radius:999px;padding:4px 7px;margin:2px}.small{color:#667085;font-size:9pt}.page-break{break-before:page}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body><header><div class="eyebrow">EVIA · FULL PROGRESS REVIEW</div><h1>'+escLocal(p.name||"Apprentice")+'</h1><p>'+escLocal(data().name)+' · '+escLocal(data().std)+' · Review date '+new Date(review.date).toLocaleDateString("en-GB")+'</p></header><h2>Course progress</h2><div class="grid"><div class="stat"><strong>Unit completion</strong><span>'+m.completion+'% ('+m.covered+'/'+m.units+')</span></div><div class="stat"><strong>Evidence entries</strong><span>'+m.entries+'</span></div><div class="stat"><strong>Evidence photos</strong><span>'+m.totalPhotos+'</span></div><div class="stat"><strong>Written evidence</strong><span>'+m.totalWords+' words</span></div><div class="stat"><strong>KSB coverage</strong><span>'+m.ksbCompletion+'% ('+m.ksbCaptured+'/'+m.ksbTotal+')</span></div><div class="stat"><strong>OTJ learning</strong><span>'+m.totalOTJ.toFixed(2)+(m.otjTarget?" / "+m.otjTarget:"")+' hours</span></div></div><p class="small">KSB breakdown: Skills '+m.ksbGroups.capturedS+'/'+m.ksbGroups.S+' · Knowledge '+m.ksbGroups.capturedK+'/'+m.ksbGroups.K+' · Behaviours '+m.ksbGroups.capturedB+'/'+m.ksbGroups.B+'.</p><h2>Unit-by-unit evidence tracking</h2>'+unitHtml+'<h2>Off-the-job learning records</h2>'+otjHtml+'<h2>Practice and tests</h2><div class="grid">'+testHtml+'</div>'+qHtml+'<h2>Confidence tracking</h2><p>'+m.confidenceChecks+' checks recorded'+(m.confidenceAverage!==null?' · latest average '+m.confidenceAverage+'/4':'')+'.</p><p><strong>Latest:</strong> '+confHtml+'</p><p><strong>Previous:</strong> '+prevConf+'</p>'+(m.lowConfidence.length?'<p><strong>Low-confidence areas:</strong> '+escLocal(m.lowConfidence.join(", "))+'</p>':"")+'<h2>Review summary</h2><p><strong>Successes:</strong> '+escLocal(auto.successes)+'</p><p><strong>Areas for development:</strong> '+escLocal(auto.development)+'</p>'+(followUp?'<h2>Additional KSB review question</h2><p><strong>'+escLocal(followUp.area)+'</strong> was not fully evidenced at the time of this review.</p><p>'+escLocal(reflection.ksbFollowUp||"No response recorded.")+'</p>':"")+'<h2>Learner comments</h2><p><strong>Learner feedback:</strong> '+escLocal(reflection.learnerFeedback||"No comment recorded.")+'</p><h2>Review targets</h2>'+targets+'</body></html>');
    win.document.close();win.focus();setTimeout(()=>win.print(),250);
  }
  /* reviews.js builds the new click-through review on top of these saved fields, so old screens and the PDF keep working. */
  window.eviaBuildReviewRecord=()=>{
    const m=metrics(),test=latestTests(),p=D().learner();
    return {course,date:new Date().toISOString(),learner:String(p.name||"").trim(),profile:{start:p.start||"",end:p.end||""},metrics:m,tests:{discussion:test.discussion?.pct??null,epa:test.epa?.pct??null,maths:academicEnabled("maths")?(test.maths?.pct??null):null,english:academicEnabled("english")?(test.english?.pct??null):null},testDetails:m.tests,confidence:m.confidenceRatings,previousConfidence:m.previousConfidenceRatings,autoSummary:reviewAutoSummary(m),ksbFollowUp:reviewKsbFollowUp(m)};
  };
  window.eviaOpenLegacyReview=openSavedReview;
  window.eviaTestMe=eviaTestMe;
  window.eviaDownloadReviewPdf=downloadReviewPdf;
  window.eviaGetReviews=()=>D().list("reviews",{course}).map(r=>r.detail).reverse();
})();
