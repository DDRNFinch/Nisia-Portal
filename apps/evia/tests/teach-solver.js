/* Test helper for tests/smoke.js: plays whatever Teach me screen is showing, the right way (or wrong first when
   asked), using what window.eviaTeach.current() says is on screen. Not part of the app. */
window.__teachSolve=async function(o){
  o=o||{};const w=ms=>new Promise(r=>setTimeout(r,ms)),$=q=>document.querySelector(q),$$=q=>[...document.querySelectorAll(q)];
  const go=async()=>{const b=$$(".tm-btns .tm-go").pop();if(b&&!b.disabled)b.click();await w(90)};
  const cur=window.eviaTeach.current();if(!cur)return "none";const s=cur.step;
  const wrongFirst=o.wrong;
  switch(s.t){
    case "teach":case "learn":case "banner":await go();break;
    case "explore":for(const b of $$(".tm-spot")){b.click();await w(30)}await go();break;
    case "watch":for(let k=0;k<s.frames.length;k++)await go();break;
    case "cards":for(let k=0;k<s.cards.length;k++){$(".tm-flip").click();await w(60);if(s.recall){$$(".tm-btns .tm-go").pop().click();await w(90)}else await go()}if(s.recall)await go();break;
    case "choice":case "tf":case "next":case "scene":{
      const a=s.t==="tf"?(s.a?0:1):s.t==="scene"?s.opts.findIndex(x=>x.ok):s.a;
      if(wrongFirst){const x=$$(".tm-opt").find(b=>+b.dataset.k!==a);x.click();await w(30);await go();
        const last=/Continue/.test(($$(".tm-btns .tm-go").pop()||{}).textContent||"");await go();if(last)break}
      $('.tm-opt[data-k="'+a+'"]').click();await w(30);await go();await go();break}
    case "spot":if(wrongFirst){$$(".tm-lopt").find(b=>+b.dataset.k!==s.a).click();await w(60);await go()}$('.tm-lopt[data-k="'+s.a+'"]').click();await w(60);await go();break;
    case "tap":if(wrongFirst){$$(".tm-tok").find(b=>!b.dataset.ans).click();await w(60);await go()}$(".tm-tok[data-ans]").click();await w(60);await go();break;
    case "hot":if(o.wrong===2){const bad=$$(".tm-hit").filter(b=>+b.dataset.i!==s.a);bad[0].click();await w(60);await go();bad[1].click();await w(60);await go();break}
      if(wrongFirst){$$(".tm-hit").find(b=>+b.dataset.i!==s.a).click();await w(60);await go()}$('.tm-hit[data-i="'+s.a+'"]').click();await w(60);await go();break;
    case "gap":{const ans=(s.text.match(/\[([^\]]+)\]/g)||[]).map(x=>x.slice(1,-1));for(const a of ans){const t=$$(".tm-bank .tm-wt:not(.used)").find(b=>b.textContent===a);t.click();await w(40)}await go();await go();break}
    case "build":{const want=Array.isArray(s.answer)?s.answer:s.answer.split(" ");for(const a of want){const t=$$(".tm-bank .tm-wt:not(.used)").find(b=>b.textContent===a);t.click();await w(40)}await go();await go();break}
    case "order":for(let k=0;k<s.items.length;k++){$('.tm-pool [data-in="'+k+'"]').click();await w(40)}await go();await go();break;
    case "label":for(let k=0;k<s.spots.length;k++){$('.tm-bank .tm-wt[data-c="'+k+'"]').click();await w(40);$('.tm-drop[data-i="'+k+'"]').click();await w(40)}await go();await go();break;
    case "load":for(const it of s.items){for(let n=0;n<(s.need[it.key]||0);n++){$('.tm-src[data-key="'+it.key+'"]').click();await w(30)}}await go();await go();break;
    case "match":for(let k=0;k<s.pairs.length;k++){$('.tm-m[data-side=l][data-k="'+k+'"]').click();$('.tm-m[data-side=r][data-k="'+k+'"]').click();await w(40)}await w(400);await go();break;
    case "sort":case "judge":{let first=true;for(let k=0;k<s.items.length;k++){const i=+$(".tm-sortcard").dataset.i,it=s.items[i],bin=s.t==="judge"?(it.good?0:1):it.bin;
      if(wrongFirst&&first){first=false;$('.tm-bin[data-bin="'+(bin?0:1)+'"]').click();await w(80);await go();await w(60)}else{$('.tm-bin[data-bin="'+bin+'"]').click();await w(420)}}await go();break}
    case "quick":await go();for(let k=0;k<s.items.length;k++){const i=+$(".tm-qf-card").dataset.i,it=s.items[i],a=it.opts?it.a:(it.a?0:1);$('.tm-qbtn[data-j="'+a+'"]').click();await w(480)}await go();break;
    default:return "unknown "+s.t;
  }
  return s.t;
};
