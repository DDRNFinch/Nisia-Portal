/* Evia Basic: what Teach me (teach.js, taken from Evia) expects to find, kept on this phone only and apart from Evia's
   own storage (both apps live on the same site). Lesson results and XP go in "eviab-teach". */
var course="bricklayer";
function data(){return {name:"Bricklaying",u:window.EB_TOPICS.map(t=>[t.name,t.ksbs])}}
window.EPA_QUESTIONS=window.EPA_QUESTIONS||{};window.EPA_DISCUSSIONS=window.EPA_DISCUSSIONS||{};
(function(){
  const KEY="eviab-teach";
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch(_){return {}}};
  const write=s=>{try{localStorage.setItem(KEY,JSON.stringify(s))}catch(_){}};
  window.eviaData={
    list(c,f){
      const s=read();
      if(c==="lessonResults"){const L=s.lessons||{};return Object.keys(L).map(id=>Object.assign({course:(f&&f.course)||course,lessonId:id},L[id]))}
      if(c==="rewards")return [{me:s.me||{}}];
      return [];
    },
    put(c,r){
      const s=read();
      if(c==="lessonResults"){
        const L=s.lessons=s.lessons||{},was=L[r.lessonId],score=Math.max(0,Math.min(1,Number(r.last)||0));
        L[r.lessonId]={done:true,best:Math.max(score,was?Number(was.best)||0:0),last:score,at:Date.now(),attempts:((was&&was.attempts)||(was?1:0))+1};
      }else if(c==="rewards"&&r.me)s.me=r.me;
      write(s);
    },
    learner(){try{return {name:(JSON.parse(localStorage.getItem("eviab")||"{}").name)||""}}catch(_){return {}}}
  };
})();
