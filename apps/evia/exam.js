/* Evia7 tests in exam style: full screen, plain and serious, like the real thing.
   No hints or right/wrong while the test is running. Learners can move between questions and change answers, then
   see their score, what to revise and every answer (with the explanation, where there is one) at the end.
   window.eviaExam.open({title, kind, intro, questions:[{q, options, correct, explanation, ksb}], onFinish(result)})
   result = {questions:[{question,chosen,correct,ok,explanation,ksb}], score, total, pct, seconds} */
(function(){
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const L="ABCDEFGH";
  const time=s=>Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0");
  let root=null,timer=null;
  function open(o){
    if(root)root.remove();
    const qs=o.questions,ans=new Array(qs.length).fill(null),flag=new Array(qs.length).fill(false);let i=0,started=0;
    const FLAG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4M6 4h11l-2.5 4L17 12H6"/></svg>';
    const answered=()=>ans.filter(a=>a!=null).length;
    root=document.createElement("div");root.className="ex";root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");root.setAttribute("aria-label",o.title);
    document.body.appendChild(root);
    const leave=()=>{if(started&&!confirm("Leave the test? Your answers won’t be saved."))return;shut()};
    const shut=()=>{clearInterval(timer);timer=null;const r=root;root=null;if(r){r.classList.add("ex-out");setTimeout(()=>r.remove(),180)}};
    const intro=()=>{
      if(!root)return;
      root.innerHTML='<header class="ex-bar"><button type="button" class="ex-x" aria-label="Close">×</button><span class="ex-title">'+esc(o.title)+'</span></header>'+
        '<div class="ex-body ex-intro"><div class="ex-paper"><span class="ex-kicker">'+esc(o.kind||"Test")+'</span><h1>'+esc(o.title)+'</h1>'+
        '<div class="ex-facts"><span><b>'+qs.length+'</b>questions</span><span><b>A–'+L[Math.max(0,Math.max(...qs.map(q=>q.options.length))-1)]+'</b>one answer each</span><span><b>No limit</b>a clock shows your time</span></div>'+
        '<ul class="ex-rules"><li>No hints while you answer.</li><li>Move between questions, change answers, and flag any to come back to.</li><li>Your score, what to revise and every answer are shown at the end.</li></ul>'+
        (o.intro?'<p class="ex-note">'+esc(o.intro)+'</p>':"")+
        '</div></div><footer class="ex-foot"><button type="button" class="ex-btn ex-primary" id="ex-start">Start the test</button></footer>';
      root.querySelector(".ex-x").onclick=leave;
      root.querySelector("#ex-start").onclick=()=>{started=Date.now();timer=setInterval(()=>{const t=root&&root.querySelector(".ex-time");if(t)t.textContent=time((Date.now()-started)/1000)},1000);show()};
    };
    const show=()=>{
      if(!root)return;
      const q=qs[i],last=i===qs.length-1;
      root.innerHTML='<header class="ex-bar"><button type="button" class="ex-x" aria-label="Leave the test">×</button><span class="ex-title">'+esc(o.title)+'<small>Question '+(i+1)+' of '+qs.length+' · <span class="ex-count">'+answered()+'</span> answered</small></span><span class="ex-time" aria-label="Time taken">'+time((Date.now()-started)/1000)+'</span></header>'+
        '<div class="ex-prog" aria-hidden="true"><i style="width:'+Math.round(answered()/qs.length*100)+'%"></i></div>'+
        '<nav class="ex-nav" aria-label="Questions">'+qs.map((_,k)=>'<button type="button" class="ex-n'+(k===i?" now":"")+(ans[k]!=null?" done":"")+(flag[k]?" flag":"")+'" data-go="'+k+'" aria-label="Question '+(k+1)+(ans[k]!=null?", answered":"")+(flag[k]?", flagged":"")+'">'+(k+1)+'</button>').join("")+'</nav>'+
        '<div class="ex-body"><div class="ex-card"><div class="ex-qhead"><span class="ex-qn">Question '+(i+1)+'</span><button type="button" class="ex-flag'+(flag[i]?" on":"")+'" id="ex-flag" aria-pressed="'+flag[i]+'">'+FLAG+(flag[i]?"Flagged":"Flag for review")+'</button></div><h2 class="ex-q">'+esc(q.q)+'</h2><div class="ex-opts" role="radiogroup">'+q.options.map((a,k)=>'<button type="button" class="ex-opt'+(ans[i]===k?" on":"")+'" role="radio" aria-checked="'+(ans[i]===k)+'" data-k="'+k+'"><span class="ex-l">'+L[k]+'</span><span>'+esc(a)+'</span></button>').join("")+'</div></div></div>'+
        '<footer class="ex-foot ex-row"><button type="button" class="ex-btn" id="ex-prev"'+(i?"":" disabled")+'>Back</button><button type="button" class="ex-btn ex-primary" id="ex-next">'+(last?"Finish test":"Next")+'</button></footer>';
      root.querySelector(".ex-x").onclick=leave;
      root.querySelectorAll(".ex-opt").forEach(b=>b.onclick=()=>{ans[i]=+b.dataset.k;root.querySelectorAll(".ex-opt").forEach(x=>{const on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-checked",on)});const n=root.querySelector('.ex-n[data-go="'+i+'"]');if(n)n.classList.add("done");
        const c=root.querySelector(".ex-count");if(c)c.textContent=answered();const p=root.querySelector(".ex-prog i");if(p)p.style.width=Math.round(answered()/qs.length*100)+"%"});
      root.querySelector("#ex-flag").onclick=()=>{flag[i]=!flag[i];show()};
      root.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{i=+b.dataset.go;show()});
      root.querySelector("#ex-prev").onclick=()=>{if(i){i--;show()}};
      root.querySelector("#ex-next").onclick=()=>{if(!last){i++;show();return}finish()};
      const now=root.querySelector(".ex-n.now");if(now)now.scrollIntoView({block:"nearest",inline:"center"});
    };
    const finish=()=>{
      if(!root)return;
      const gaps=ans.filter(a=>a==null).length,flagged=flag.filter(Boolean).length;
      if((gaps||flagged)&&!confirm([gaps?"You haven’t answered "+gaps+" question"+(gaps===1?"":"s")+".":"",flagged?flagged+" question"+(flagged===1?" is":"s are")+" flagged for review.":""].filter(Boolean).join(" ")+" Finish anyway?"))return;
      clearInterval(timer);timer=null;
      const seconds=Math.round((Date.now()-started)/1000);
      const questions=qs.map((q,k)=>{const chosen=ans[k]==null?"":q.options[ans[k]],ok=chosen===q.correct;return {question:q.q,chosen,correct:q.correct,ok,explanation:q.explanation||"",ksb:q.ksb||""}});
      const score=questions.filter(x=>x.ok).length,pct=qs.length?Math.round(score/qs.length*100):0;
      const result={questions,score,total:qs.length,pct,seconds};
      const extra=o.onFinish?o.onFinish(result)||{}:{};
      root.innerHTML='<header class="ex-bar"><button type="button" class="ex-x" aria-label="Close">×</button><span class="ex-title">Results</span></header>'+
        '<div class="ex-body"><div class="ex-score"><span class="ex-kicker">'+esc(o.title)+'</span><span class="ex-ring" style="--p:'+pct+'"><b>'+pct+'%</b></span><span class="ex-score-sub"><strong>'+score+' of '+qs.length+'</strong> correct · '+time(seconds)+'</span></div>'+
        (extra.revise&&extra.revise.length?'<div class="ex-revise"><strong>Worth revising</strong><ul>'+extra.revise.map(r=>'<li>'+esc(r)+'</li>').join("")+'</ul></div>':"")+
        '<h3 class="ex-h">Your answers</h3><ol class="ex-review">'+questions.map((x,k)=>'<li class="'+(x.ok?"ok":"no")+'"><p class="ex-rq"><span class="ex-mark" aria-label="'+(x.ok?"Correct":"Incorrect")+'">'+(x.ok?"✓":"✗")+'</span>'+esc(x.question)+'</p>'+
          '<p class="ex-ra">Your answer: <strong>'+esc(x.chosen||"Not answered")+'</strong></p>'+(x.ok?"":'<p class="ex-ra">Correct answer: <strong>'+esc(x.correct)+'</strong></p>')+(x.explanation?'<p class="ex-ex">'+esc(x.explanation)+'</p>':"")+'</li>').join("")+'</ol>'+
        '<p class="ex-note">Saved for your progress review.</p></div><footer class="ex-foot"><button type="button" class="ex-btn ex-primary" id="ex-done">Done</button></footer>';
      started=0;
      root.querySelector(".ex-x").onclick=shut;root.querySelector("#ex-done").onclick=shut;
    };
    intro();
  }
  window.eviaExam={open};
})();
