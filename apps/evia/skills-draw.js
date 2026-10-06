/* Skills: college practical tasks with accurate drawings and a mark sheet (the tutor marks it).
   Every drawing is calculated, not drawn by hand: bricks 215 × 102.5 × 65 with 10 mm joints (225 along a course, 75 up
   each course), blocks 440 × 215 × 100 (450 × 225 with joints). Each brick, joint, opening and dimension is placed from
   those sizes, and check() proves the dimension chains add up, the bond has no straight joints, the lintel bears at
   least 150 mm and the ties are within spacing, before a drawing is shown.
   Drawings are SVG sheets in millimetres (A3 landscape, 420 × 297) at a true 1:10, so a PDF printed at 100% can be
   measured, and a PNG can be shared.   window.eviaSkillsDraw.cavityOpening(opts) → {svg, checks, materials, marks, meta} */
(function(root){
  const B={l:215,w:102.5,h:65,j:10},GA=225,GV=75,BL={l:440,h:215,t:100},GB=450,GBV=225;
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const f=n=>Number.isInteger(n)?String(n):String(Math.round(n*10)/10);
  const thou=n=>f(n).replace(/\B(?=(\d{3})+(?!\d))/g,",");

  /* One course of a stretcher-bond leaf between x0 and x1 (a stopped end or reveal at each side). Full-start courses
     begin with a whole unit, the others with a half; halves close the far end as needed. Returns the pieces. */
  function course(x0,x1,fullStart,unit,gauge){
    const out=[];let x=x0,first=true;
    while(x<x1-0.01){
      let len=first&&!fullStart?(unit-B.j)/2:unit;   /* half = (unit − joint) / 2: 102.5 for a brick, 215 for a block */
      if(unit===BL.l)len=first&&!fullStart?215:BL.l;
      if(x+len>x1+0.01)len=x1-x;
      out.push({x,len,half:len<unit-1});
      x+=len+B.j;first=false;
    }
    return out;
  }

  /* ---------- The task: a cavity wall with a window opening ---------- */
  function cavityOpening(o){
    o=Object.assign({pierBricks:3,openingBricks:3,courses:15,sillCourse:3,openingCourses:9,lintelLength:1050,cavity:100,innerCourses:4,learner:"",date:new Date()},o||{});
    const pier=o.pierBricks*GA-B.j, open=o.openingBricks*GA+B.j, L=2*pier+open, H=o.courses*GV;
    const sillH=o.sillCourse*GV, openH=o.openingCourses*GV, headH=sillH+openH, lintelH=150, bearing=(o.lintelLength-open)/2;
    const revL=pier, revR=pier+open;
    /* Outer leaf, course by course (course 1 starts with a whole brick). */
    const outer=[];
    for(let c=1;c<=o.courses;c++){
      const y=(c-1)*GV, full=c%2===1, inOpening=y>=sillH-0.01&&y<headH-0.01;
      const pieces=inOpening?course(0,revL,full,B.l).concat(course(revR,L,full,B.l)):course(0,L,full,B.l);
      outer.push({c,y,pieces,inOpening});
    }
    /* Inner leaf (blocks) to lintel height. */
    const inner=[];
    for(let c=1;c<=o.innerCourses;c++){
      const y=(c-1)*GBV, full=c%2===1, inOpening=y>=sillH-0.01&&y<headH-0.01;
      inner.push({c,y,pieces:inOpening?course(0,revL,full,BL.l).concat(course(revR,L,!full,BL.l)):course(0,L,full,BL.l),inOpening});
    }
    /* Wall ties: two columns in each pier (within 225 of the stopped end and of the reveal), in the bed joints every
       225 up to the lintel (Approved Document A: within 225 of a jamb at 300 or less; 750 × 450 elsewhere). */
    const tieX=[B.l/2+B.j/2,revL-112.5,revR+112.5,L-B.l/2-B.j/2],tieY=[];for(let y=GBV;y<o.innerCourses*GBV;y+=GBV)tieY.push(y);
    const ties=[];tieX.forEach(x=>tieY.forEach(y=>ties.push({x,y})));

    /* ---------- Checks: nothing is shown unless these all pass ---------- */
    const checks=[];const ok=(name,pass,detail)=>checks.push({name,pass:!!pass,detail:detail||""});
    ok("Overall length = pier + opening + pier",Math.abs(pier+open+pier-L)<0.01,thou(pier)+" + "+thou(open)+" + "+thou(pier)+" = "+thou(L));
    ok("Every outer course fills its length exactly",outer.every(r=>{const segs=r.inOpening?[[0,revL],[revR,L]]:[[0,L]];return segs.every(([a,b])=>{const p=r.pieces.filter(q=>q.x>=a-0.01&&q.x<b);const end=p[p.length-1];return Math.abs(p[0].x-a)<0.01&&Math.abs(end.x+end.len-b)<0.01&&p.every(q=>Math.abs(q.len-B.l)<0.01||Math.abs(q.len-B.w)<0.01)})}),"whole bricks and halves only");
    ok("Height = courses × 75",Math.abs(o.courses*GV-H)<0.01,o.courses+" × 75 = "+thou(H));
    ok("Opening height on the gauge",Math.abs(openH%GV)<0.01&&Math.abs(sillH%GV)<0.01,thou(sillH)+" to "+thou(headH));
    ok("Head of the opening on a block course too",Math.abs(headH%GBV)<0.01,thou(headH)+" = "+(headH/GBV)+" × 225");
    /* Perpend joints: only between neighbouring bricks (a reveal isn't a joint). */
    const joints=r=>r.pieces.filter((p,i)=>i&&Math.abs(r.pieces[i-1].x+r.pieces[i-1].len+B.j-p.x)<0.01).map(p=>p.x-B.j/2);
    let straight=0;for(let i=1;i<outer.length;i++){const a=joints(outer[i-1]),b=joints(outer[i]);straight+=b.filter(x=>a.some(y=>Math.abs(x-y)<40)).length}
    ok("No straight joints (perpends lap by half a brick)",straight===0,"half-bond lap "+f(GA/2)+" mm");
    ok("Lintel bearing at least 150 mm each end",bearing>=150,thou(bearing)+" mm each end on a "+thou(o.lintelLength)+" lintel");
    ok("Blocks fit the piers without odd cuts",inner.every(r=>r.pieces.every(q=>[BL.l,215].some(v=>Math.abs(q.len-v)<0.01))),"440 + 10 + 215 = "+thou(pier));
    const tieXs=[...new Set(ties.map(t=>t.x))].sort((a,b)=>a-b),tieYs=[...new Set(ties.map(t=>t.y))].sort((a,b)=>a-b);
    ok("Ties within 225 of every jamb and stopped end, 300 or less apart vertically",tieXs[0]<=225&&revL-tieXs[1]<=225&&tieXs[2]-revR<=225&&L-tieXs[3]<=225&&tieYs.every((y,i)=>i===0?y<=300:y-tieYs[i-1]<=300),tieYs.map(f).join(", ")+" mm up");
    ok("Ties in bed joints of both leaves",ties.every(t=>Math.abs(t.y%GV)<0.01&&Math.abs(t.y%GBV)<0.01));

    /* ---------- Materials ---------- */
    let whole=0,halves=0;outer.forEach(r=>r.pieces.forEach(p=>p.half?halves++:whole++));
    const bricks=whole+Math.ceil(halves/2);
    let bWhole=0,bHalf=0;inner.forEach(r=>r.pieces.forEach(p=>Math.abs(p.len-BL.l)<0.01?bWhole++:bHalf++));
    const blocks=bWhole+Math.ceil(bHalf/2);
    const materials=[["Facing bricks 215 × 102.5 × 65",bricks+" ("+whole+" whole, "+halves+" halves) + 5% = "+Math.ceil(bricks*1.05)],
      ["Dense blocks 440 × 215 × 100",blocks+" ("+bWhole+" whole, "+bHalf+" halves) + 1 spare = "+(blocks+1)],
      ["Wall ties for a "+o.cavity+" mm cavity",ties.length+" + 2 spare = "+(ties.length+2)],
      ["Steel cavity lintel","1 × "+thou(o.lintelLength)+" mm, for a "+o.cavity+" mm cavity"],
      ["Insulated cavity closers","2 × "+thou(openH)+" mm (reveals)"],
      ["Mortar","1:6 cement : building sand with plasticiser, or as your tutor gives you. Mix in small batches."]];

    /* ---------- The sheet ---------- */
    const S=0.1;                                     /* 1:10 at A3: 1 mm of wall = 0.1 mm of paper */
    const EX=38,EY=152,SX=268,PY=200;               /* elevation bottom-left, section left, plan top (sheet mm) */
    const ex=x=>EX+x*S,ey=y=>EY-y*S;
    const parts=[];const add=s=>parts.push(s);
    const line=(x1,y1,x2,y2,cls)=>'<line x1="'+f(x1)+'" y1="'+f(y1)+'" x2="'+f(x2)+'" y2="'+f(y2)+'" class="'+(cls||"")+'"/>';
    const rect=(x,y,w,h,cls)=>'<rect x="'+f3(x)+'" y="'+f3(y)+'" width="'+f3(w)+'" height="'+f3(h)+'" class="'+cls+'"/>';
    const f3=n=>String(Math.round(n*1000)/1000);
    const text=(x,y,s,cls,anchor,rot)=>'<text x="'+f3(x)+'" y="'+f3(y)+'" class="'+(cls||"")+'"'+(anchor?' text-anchor="'+anchor+'"':"")+(rot?' transform="rotate('+rot+' '+f3(x)+' '+f3(y)+')"':"")+'>'+esc(s)+'</text>';
    /* A dimension: extension lines, a line with ticks, and the figure. */
    function dimH(x1,x2,y,label,base){add(line(x1,base,x1,y+1.2,"ext")+line(x2,base,x2,y+1.2,"ext")+line(x1,y,x2,y,"dim")+tick(x1,y)+tick(x2,y)+text((x1+x2)/2,y-1,label,"dt","middle"))}
    function dimV(y1,y2,x,label,base){add(line(base,y1,x+1.2,y1,"ext")+line(base,y2,x+1.2,y2,"ext")+line(x,y1,x,y2,"dim")+tick(x,y1)+tick(x,y2)+text(x+2.4,(y1+y2)/2,label,"dt","middle",-90))}
    const tick=(x,y)=>line(x-1,y+1,x+1,y-1,"tick");

    /* Elevation of the outer leaf. */
    add('<g class="brickwork">');
    outer.forEach(r=>r.pieces.forEach(p=>add(rect(ex(p.x),ey(r.y+GV),p.len*S,B.h*S,"brick"+(p.half?" half":"")))));
    add('</g>');
    add(rect(ex(revL),ey(headH),open*S,openH*S,"opening"));
    add(line(ex(revL),ey(headH),ex(revR),ey(headH),"lintel-toe"));
    add(rect(ex(revL-bearing),ey(headH+lintelH),o.lintelLength*S,lintelH*S,"hidden"));
    add(line(ex(revR+bearing),ey(headH+lintelH/2),ex(revR+bearing)+14,ey(H)-4,"ext")+text(ex(revR+bearing)+14.5,ey(H)-4.6,"Steel cavity lintel "+thou(o.lintelLength)+" (hidden), "+thou(bearing)+" bearing each end","note","start"));
    add(text(ex(L/2),ey(sillH+openH/2),"OPENING","lbl","middle"));
    add(text(ex(L/2),ey(sillH+openH/2)+4,thou(open)+" × "+thou(openH),"note","middle"));
    add(line(ex(L),ey(0),ex(L+120),ey(0),"ground"));add(line(ex(-120),ey(0),ex(0),ey(0),"ground"));
    add(text(EX,EY+25,"ELEVATION · OUTER LEAF","h","start")+text(EX+56,EY+25,"Scale 1:10","sub","start"));
    /* Gauge rod: every course. */
    const gx=EX-12;add(line(gx,ey(0),gx,ey(H),"rod"));
    for(let c=0;c<=o.courses;c++){add(line(gx-1.4,ey(c*GV),gx+1.4,ey(c*GV),"rodtick"));if(c)add(text(gx-2.2,ey(c*GV-GV/2)+1,String(c),"rodn","end"))}
    add(text(gx,ey(H)-3,"Gauge rod","note","middle")+text(gx,ey(H)-0.6,"75 per course","note","middle"));
    /* Dimensions. */
    dimH(ex(0),ex(revL),EY+8,thou(pier),EY+1);dimH(ex(revL),ex(revR),EY+8,thou(open),EY+1);dimH(ex(revR),ex(L),EY+8,thou(pier),EY+1);
    dimH(ex(0),ex(L),EY+16,thou(L)+" overall (9 bricks)",EY+1);
    const dx=ex(L)+7;dimV(ey(0),ey(sillH),dx,thou(sillH),ex(L)+1);dimV(ey(sillH),ey(headH),dx,thou(openH),ex(L)+1);dimV(ey(headH),ey(H),dx,thou(H-headH),ex(L)+1);
    dimV(ey(0),ey(H),dx+9,thou(H)+" (15 courses)",ex(L)+1);
    /* Section mark through the left pier. */
    const cx=ex(revL-112.5-40);add(line(cx,ey(H)-6,cx,ey(H)-1,"cut")+line(cx,ey(0)+1,cx,ey(0)+6,"cut")+text(cx,ey(H)-7.5,"A","cutl","middle")+text(cx,ey(0)+10,"A","cutl","middle"));

    /* Section A–A through the pier (outer leaf, cavity, inner leaf, ties). */
    const sx=x=>SX+x*S,sy=ey,T=B.w+o.cavity+BL.t;
    for(let c=1;c<=o.courses;c++)add(rect(sx(0),sy(c*GV),B.w*S,B.h*S,"brick sec"));
    for(let c=1;c<=o.innerCourses;c++)add(rect(sx(B.w+o.cavity),sy(c*GBV),BL.t*S,BL.h*S,"block sec"));
    /* A steel cavity lintel: the toe in the outer leaf's bed joint, a sloping plate across the cavity, the box on the inner leaf. */
    add('<path class="lintelsec" d="M'+[[0,headH+5],[B.w,headH+5],[B.w+o.cavity,headH+lintelH-10],[B.w+o.cavity,headH+lintelH],[T,headH+lintelH],[T,headH],[B.w+o.cavity,headH],[B.w+o.cavity,headH+lintelH-24],[B.w+8,headH+8],[0,headH+8]].map(([x,y])=>f3(sx(x))+" "+f3(sy(y))).join(" L")+' Z"/>');
    add(text(sx(T)+2,sy(headH+lintelH/2)+1,"Steel cavity lintel","note","start"));
    tieY.forEach(y=>add(line(sx(B.w/2),sy(y)-0.15,sx(B.w+o.cavity+BL.t/2),sy(y)+0.15,"tie")));
    add(text(sx(T)+2,sy(tieY[0])+1,"Ties at "+tieY.map(f).join(", "),"note","start"));
    add(line(sx(-40),ey(0),sx(T+40),ey(0),"ground"));
    dimH(sx(0),sx(B.w),EY+8,f(B.w),EY+1);dimH(sx(B.w),sx(B.w+o.cavity),EY+8,f(o.cavity),EY+1);dimH(sx(B.w+o.cavity),sx(T),EY+8,f(BL.t),EY+1);
    dimH(sx(0),sx(T),EY+16,f(T),EY+1);
    dimV(sy(0),sy(o.innerCourses*GBV),sx(T)+14,thou(o.innerCourses*GBV)+" inner leaf",sx(T)+1);
    add(text(SX,EY+25,"SECTION A–A","h","start")+text(SX+30,EY+25,"Scale 1:10","sub","start"));

    /* Plan at course 5 (through the opening), outer leaf, cavity with closers, inner leaf. */
    const px=ex,py=y=>PY+y*S,r5=outer[4],ib=inner[1];
    r5.pieces.forEach(p=>add(rect(px(p.x),py(0),p.len*S,B.w*S,"brick plan"+(p.half?" half":""))));
    ib.pieces.forEach(p=>add(rect(px(p.x),py(B.w+o.cavity),p.len*S,BL.t*S,"block plan")));
    [revL,revR].forEach((x,i)=>add(rect(px(i?x:x-60),py(B.w),60*S,o.cavity*S,"closer")));
    add(line(px(0),py(B.w+o.cavity/2),px(revL),py(B.w+o.cavity/2),"cavline")+line(px(revR),py(B.w+o.cavity/2),px(L),py(B.w+o.cavity/2),"cavline"));
    add(text(px(L/2),py(B.w+o.cavity/2)+1,"OPENING","lbl","middle"));
    dimH(px(0),px(revL),PY+T*S+8,thou(pier),PY+T*S+1);dimH(px(revL),px(revR),PY+T*S+8,thou(open),PY+T*S+1);dimH(px(revR),px(L),PY+T*S+8,thou(pier),PY+T*S+1);
    dimH(px(0),px(L),PY+T*S+16,thou(L),PY+T*S+1);
    const pdx=px(L)+7;dimV(py(0),py(B.w),pdx,f(B.w),px(L)+1);dimV(py(B.w),py(B.w+o.cavity),pdx,f(o.cavity),px(L)+1);dimV(py(B.w+o.cavity),py(T),pdx,f(BL.t),px(L)+1);
    add(text(px(0),py(0)-2,"Outside face","note","start")+text(px(0),py(T)+3.2,"Inside face","note","start"));
    add(text(px(revL)-7,py(B.w+o.cavity/2)+0.8,"Cavity closer","note","end"));
    add(text(EX,PY+T*S+25,"PLAN AT COURSE 5","h","start")+text(EX+45,PY+T*S+25,"Scale 1:10","sub","start"));

    /* Notes and materials. */
    const NX=268,NY=196;
    const notes=["Stretcher bond, half-bond lap. Course 1 starts with a whole brick at the left end.","Bricks 215 × 102.5 × 65, 10 mm joints: 225 along a course, 75 per course.",
      "Blocks 440 × 215 × 100, 10 mm joints. Inner leaf built to "+thou(o.innerCourses*GBV)+" for the lintel.","Ties sloping down to the outer leaf, drip in the middle of the cavity. Keep the cavity clean.",
      "Opening "+thou(open)+" wide × "+thou(openH)+" high, "+thou(sillH)+" above the base. Joint finish: half round.","Full PPE: safety boots, hard hat, hi-vis, gloves, and eye protection when cutting."];
    add(text(NX,NY,"NOTES","h","start"));
    let ny=NY+5.5;notes.forEach((n,i)=>wrap((i+1)+". "+n,56).forEach((l,k)=>{add(text(NX+(k?2.6:0),ny,l,"small","start"));ny+=3.5}));
    ny+=3;add(text(NX,ny,"MATERIALS","h","start"));ny+=5.5;
    materials.forEach(([a,b])=>wrap(a+": "+b,56).forEach((l,k)=>{add(text(NX+(k?2.6:0),ny,l,"small","start"));ny+=3.5}));

    /* Title block. */
    const TX=346,meta={task:"Cavity wall with a window opening",course:"Bricklayer",std:"ST0095 v1.2",units:["Set out Cavity Walling","Construct Cavity Walling","Cavity opening"],
      ksbs:["S10","K21","S11","K22","S1","S4","S5","S6","S19","S21","K1","K5","K7","K8","K9","K12","K19","K28","K31","B4","B5"],time:"6 hours (college)",no:"EVIA-SK-BR-01",rev:"A"};
    add(rect(TX,8,64,281,"tb"));
    const tb=[["EVIA · SKILLS",""],["Task",meta.task],["Course",meta.course+" · "+meta.std],["Units",meta.units.join(", ")],["KSBs",meta.ksbs.join(" ")],
      ["Time",meta.time],["Learner",o.learner||"…………………………"],["Scale","1:10 at A3 (print at 100%)"],["Units of measure","Millimetres"],["Drawing",meta.no+"  Rev "+meta.rev],["Date",new Date(o.date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})]];
    let ty=18;tb.forEach(([k,v],i)=>{if(!i){add(text(TX+4,ty,k,"brand","start"));ty+=9;return}
      add(text(TX+4,ty,k.toUpperCase(),"tk","start"));ty+=4.4;
      wrap(v,34).forEach(l=>{add(text(TX+4,ty,l,"tv","start"));ty+=4.4});ty+=2.6;add(line(TX,ty-3,TX+64,ty-3,"tbl"))});
    add(text(TX+4,268,"Work to written dimensions.","warn","start")+text(TX+4,273,"Do not scale from this drawing.","warn","start"));
    /* Scale bar: 0–1 m at 1:10. */
    const sb=TX+4;for(let i=0;i<5;i++)add(rect(sb+i*10,280,10,2.4,i%2?"sbw":"sbb"));
    add(text(sb,286.5,"0","note","middle")+text(sb+50,286.5,"500 mm","note","middle"));

    const W=420,Hs=297;
    const css='text{font-family:Inter,Helvetica,Arial,sans-serif;fill:#111827}.brick{fill:#e8b7a4;stroke:#7c2d12;stroke-width:.14}.brick.half{fill:#dfa58f}.brick.sec{fill:#e8b7a4}'+
      '.block{fill:#d1d5db;stroke:#374151;stroke-width:.14}.brick.plan{stroke-width:.12}.opening{fill:#fff;stroke:#111827;stroke-width:.25}.lintel-toe{stroke:#111827;stroke-width:.6}'+
      '.hidden{fill:none;stroke:#111827;stroke-width:.2;stroke-dasharray:1.2 .8}.lintelsec{fill:#6b7280;stroke:#111827;stroke-width:.2}.closer{fill:#fde68a;stroke:#92400e;stroke-width:.14}'+
      '.cavline{stroke:#9ca3af;stroke-width:.12;stroke-dasharray:.8 .8}.tie{stroke:#111827;stroke-width:.35}.ground{stroke:#111827;stroke-width:.35}.rod{stroke:#111827;stroke-width:.3}.rodtick{stroke:#111827;stroke-width:.2}'+
      '.ext{stroke:#374151;stroke-width:.12}.dim{stroke:#111827;stroke-width:.16}.tick{stroke:#111827;stroke-width:.3}.dt{font-size:2.5px;font-weight:600}.note{font-size:2.1px;fill:#374151}.lbl{font-size:3px;font-weight:700;letter-spacing:.3px;fill:#6b7280}'+
      '.rodn{font-size:1.8px;fill:#374151}.h{font-size:3.4px;font-weight:800;letter-spacing:.3px}.sub{font-size:2.6px;fill:#6b7280}.small{font-size:2.35px;fill:#1f2937}.cut{stroke:#111827;stroke-width:.5}.cutl{font-size:3.4px;font-weight:800}'+
      '.tb{fill:#fff;stroke:#111827;stroke-width:.35}.tbl{stroke:#d1d5db;stroke-width:.2}.brand{font-size:4.6px;font-weight:800;fill:#b45309;letter-spacing:.4px}.tk{font-size:2px;font-weight:700;fill:#6b7280;letter-spacing:.3px}.tv{font-size:2.9px;font-weight:600}'+
      '.warn{font-size:2.6px;font-weight:800;fill:#b91c1c}.sbb{fill:#111827}.sbw{fill:#fff;stroke:#111827;stroke-width:.2}.frame{fill:none;stroke:#111827;stroke-width:.5}';
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+Hs+'" width="'+W+'mm" height="'+Hs+'mm"><style>'+css+'</style><rect width="'+W+'" height="'+Hs+'" fill="#fff"/>'+
      rect(6,6,W-12,Hs-12,"frame")+parts.join("")+'</svg>';
    return {svg,checks,materials,meta,dims:{L,H,pier,open,openH,sillH,headH,bearing,ties:ties.length},marks:marksFor(meta,{L,H,open,openH,sillH,bearing,courses:o.courses})};
  }
  function wrap(s,n){const w=String(s).split(" "),out=[];let l="";w.forEach(x=>{if((l+" "+x).trim().length>n){out.push(l);l=x}else l=(l+" "+x).trim()});if(l)out.push(l);return out}

  /* ---------- The mark sheet: site standards the tutor checks on the finished work ---------- */
  function marksFor(meta,d){
    return {meta,sections:[
      ["Setting out",[["Overall length",thou(d.L)+" mm","± 5 mm"],["Opening width",thou(d.open)+" mm at sill and head","± 5 mm"],["Opening height",thou(d.openH)+" mm, sill "+thou(d.sillH)+" above base","± 5 mm"],["Square","Returns and reveals square to the face","3-4-5 check"]]],
      ["Accuracy",[["Gauge",d.courses+" courses = "+thou(d.H)+" mm; 4 courses = 300","± 5 mm over the height"],["Level","Bed joints level along the length","± 3 mm"],["Plumb","Ends and reveals plumb","± 3 mm over the height"],["Line","Face straight along the wall","± 3 mm on a 1 m straightedge"],["Perpends","Perpends in line every other course","± 5 mm"]]],
      ["Construction",[["Bond","Stretcher bond, half lap, no straight joints",""],["Joints","Bed and perpend joints 10 mm, fully filled","± 3 mm"],["Wall ties","In the right places, sloping to the outer leaf, drips central",""],["Lintel","Bedded level, "+thou(d.bearing)+" mm bearing each end","min. 150 mm"],["Cavity","Clean, no mortar bridging; closers fitted",""]]],
      ["Finish",[["Joint finish","Half round, even and consistent",""],["Clean work","Face clean, no smears or snots",""]]],
      ["Health, safety and working",[["PPE","Worn throughout",""],["Work area","Tidy, safe, materials stacked; tools used safely",""],["Time","Finished within 6 hours",""]]]]};
  }
  function markSheetHtml(m,o){
    o=o||{};const row=([what,std,tol])=>'<tr><td><b>'+esc(what)+'</b><span>'+esc(std)+'</span></td><td class="t">'+esc(tol||"")+'</td><td class="b"><i></i></td><td class="b"><i></i></td><td class="c"></td></tr>';
    return '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Mark sheet</title><style>@page{size:A4;margin:12mm}body{font:10pt Inter,Helvetica,Arial,sans-serif;color:#111827;margin:0}'+
      'header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #111827;padding-bottom:6px;margin-bottom:8px}h1{font-size:16pt;margin:0}.brand{color:#b45309;font-weight:800;letter-spacing:.06em;font-size:9pt}'+
      '.meta{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px 14px;margin:6px 0 10px;font-size:9pt}.meta b{display:block;font-size:7.5pt;color:#6b7280;text-transform:uppercase;letter-spacing:.05em}.meta span{display:block;border-bottom:1px solid #d1d5db;min-height:14px}'+
      'table{width:100%;border-collapse:collapse;margin-bottom:6px}th{font-size:7.5pt;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;text-align:left;border-bottom:1px solid #111827;padding:3px 4px}'+
      'td{border-bottom:1px solid #e5e7eb;padding:4px;vertical-align:top}td b{display:block}td span{display:block;color:#4b5563;font-size:8.5pt}.t{width:22%;font-size:8.5pt}.b{width:9%;text-align:center}.b i{display:inline-block;width:12px;height:12px;border:1.3px solid #111827;border-radius:3px}.c{width:24%}'+
      'h2{font-size:9.5pt;margin:8px 0 2px;text-transform:uppercase;letter-spacing:.05em}.result{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.box{border:1.3px solid #111827;border-radius:6px;padding:8px;min-height:44px}.box b{font-size:7.5pt;text-transform:uppercase;color:#6b7280;letter-spacing:.05em}'+
      '.foot{margin-top:8px;font-size:8pt;color:#6b7280}</style></head><body>'+
      '<header><div><div class="brand">EVIA · SKILLS · MARK SHEET</div><h1>'+esc(m.meta.task)+'</h1></div><div style="text-align:right;font-size:9pt">'+esc(m.meta.course+" · "+m.meta.std)+'<br>'+esc(m.meta.no)+' · '+esc(m.meta.time)+'</div></header>'+
      '<div class="meta"><div><b>Learner</b><span>'+esc(o.learner||"")+'</span></div><div><b>Tutor</b><span>'+esc(o.tutor||"")+'</span></div><div><b>Date</b><span>'+esc(o.date||"")+'</span></div>'+
      '<div style="grid-column:1/-1"><b>Units and KSBs</b><span>'+esc(m.meta.units.join(", ")+" · "+m.meta.ksbs.join(" "))+'</span></div></div>'+
      m.sections.map(([h,rows])=>'<h2>'+esc(h)+'</h2><table><thead><tr><th>What the tutor checks</th><th>Tolerance</th><th class="b">Met</th><th class="b">Not yet</th><th>Comment</th></tr></thead><tbody>'+rows.map(row).join("")+'</tbody></table>').join("")+
      '<div class="result"><div class="box"><b>Result</b><br>☐ Competent &nbsp;&nbsp; ☐ Not yet competent: redo the items marked Not yet</div><div class="box"><b>Tutor feedback</b></div>'+
      '<div class="box"><b>Tutor signature</b></div><div class="box"><b>Learner signature</b></div></div>'+
      '<p class="foot">Checked with a spirit level, tape and 1 m straightedge on the finished work. Tolerances are the usual site standards for brickwork; your college may set its own.</p></body></html>';
  }
  const api={cavityOpening,markSheetHtml};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.eviaSkillsDraw=api;
})(typeof window!=="undefined"?window:globalThis);
