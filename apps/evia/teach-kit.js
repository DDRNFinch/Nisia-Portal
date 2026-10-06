/* Evia7 Teach me content kit. The lesson files (teach-*.js) use these helpers to add units to window.EVIA_TEACH,
   which teach.js reads. Options are always shuffled when shown, so write the right answer first.
   Teaching:  TE(title,say,pic,key) Evia explains · EX(title,say,pic,[[x,y,label,text]]) tap to explore
              W(title,[[pic,text],...]) step by step · CD(title,[[front|{pic},term,back],...]) flashcards
   Games:     Q(q,[right,...wrong],why,more) · T(q,true|false,why,more) · M(q,[[a,b],...],why)
              O(q,[first,...last],why,more) · G(text with [gaps],[spare tiles],why,more) · B(q,answer,[spares],why)
              TAP(q,"text with {answer}",why,hint) · S(q,[boxes],[[text|{pic},box,why],...]) sort it
              J(q,[[text,good,why],...],[labels]) good or bad · SP(q,[lines],wrongIndex,why) spot the mistake
              N([steps so far],[next,...wrong],why) what comes next · SC(who,say,q,[[right,why],[wrong,why],...],pic)
              HOT(q,pic,[[x,y,r,label],...],rightIndex,why) · LB(q,pic,[[x,y,px,py,label],...],why)
              LD(q,into,items,need,why,hint) drag in the right amounts · QF([[q,true|false],...]) quick fire
              CHAL() a quick-challenge splash · TROPHY(n) the unit challenge splash
   more: {again: a different question for the second go, pic, q...}. Old helpers L(title,text,pic) still work.
   lesson(id,title,blurb,steps,more)  ·  unit(name,skill,lessons)  (skill = the confidence-check area it informs) */
(function(){
  const T=window.EVIA_TEACH=window.EVIA_TEACH||{courses:{},fs:[]};
  const x=(o,more)=>Object.assign(o,more||{});
  Object.assign(T,{
    L:(title,text,pic)=>({t:"learn",title,text,pic}),
    TE:(title,say,pic,key)=>x({t:"teach",title,say,pic},key?{key}:null),
    EX:(title,say,pic,spots)=>({t:"explore",title,say,pic,spots:spots.map(s=>({x:s[0],y:s[1],label:s[2],text:s[3]}))}),
    W:(title,frames)=>({t:"watch",title,frames:frames.map(f=>({pic:f[0],text:f[1]}))}),
    CD:(title,cards,recall)=>({t:"cards",title,recall:!!recall,cards:cards.map(c=>typeof c[0]==="object"?{pic:c[0].pic,term:c[1],back:c[2]}:{front:c[0],term:c[1]||c[0],back:c[2]})}),
    Q:(q,opts,why,more)=>x({t:"choice",q,opts,a:0,why,shuffle:true},more),
    T:(q,a,why,more)=>x({t:"tf",q,a,why},more),
    M:(q,pairs,why)=>({t:"match",q,pairs,why}),
    O:(q,items,why,more)=>x({t:"order",q,items,why},more),
    G:(text,opts,why,more)=>x({t:"gap",text,opts,why},more),
    B:(q,answer,extra,why)=>({t:"build",q,answer,extra,why}),
    TAP:(q,text,why,hint)=>({t:"tap",q,text,why,hint}),
    S:(q,bins,items)=>({t:"sort",q,bins,items:items.map(i=>x(typeof i[0]==="object"?{pic:i[0].pic}:{text:i[0]},{bin:i[1],why:i[2]}))}),
    J:(q,items,labels)=>x({t:"judge",q,items:items.map(i=>({text:i[0],good:i[1],why:i[2]}))},labels?{labels}:null),
    SP:(q,lines,a,why)=>({t:"spot",q,lines,a,why}),
    N:(seq,opts,why)=>({t:"next",seq,opts,a:0,why}),
    SC:(who,say,q,opts,pic)=>x({t:"scene",who,say,q,opts:opts.map((o,k)=>({text:o[0],ok:k===0,why:o[1]}))},pic?{pic}:null),
    HOT:(q,pic,spots,a,why)=>({t:"hot",q,pic,a,why,spots:spots.map(s=>x({x:s[0],y:s[1],r:s[2],label:s[3]},s[4]?{why:s[4]}:null))}),
    LB:(q,pic,spots,why)=>({t:"label",q,pic,why,spots:spots.map(s=>({x:s[0],y:s[1],px:s[2],py:s[3],label:s[4]}))}),
    LD:(q,into,items,need,why,hint)=>({t:"load",q,into,items,need,why,hint}),
    QF:items=>({t:"quick",items:items.map(i=>({q:i[0],a:i[1]}))}),
    CHAL:()=>({t:"banner",kind:"challenge",title:"Quick challenge",text:"A couple of harder ones to finish. Show what you’ve got!"}),
    TROPHY:n=>({t:"banner",kind:"trophy",title:"Unit challenge",text:(n||8)+" new questions from across the unit, getting harder as you go. It’s all you!",go:"I’m ready",xp:"Bonus coins for finishing"}),
    lesson:(id,title,blurb,steps,more)=>x({id,title,blurb,steps},more),
    unit:(unit,skill,lessons,extra)=>Object.assign({unit,skill,lessons},extra||{}),
    add:(course,units)=>{T.courses[course]=(T.courses[course]||[]).concat(units)}
  });
})();
