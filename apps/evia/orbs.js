/* Evia7 advanced Evias: animates the orb shapes that theme.js draws.
   Particle orbs: a sphere of glowing points that turns and ripples, on a canvas over the still picture.
   Glass orbs: the light line across the orb is Evia's voice; it ripples gently, and more while she's thinking,
   speaking (discussion questions) or listening.
   Only orbs 44px or bigger animate (the Evia button, Rewards). Small icons, reduced motion and a hidden app stay still.
   One animation loop runs at about 30 frames a second. */
(function(){
  const reduced=()=>window.eviaAccessibility?window.eviaAccessibility.reducedMotion():matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* Points spread evenly over a sphere (a Fibonacci sphere). */
  const N=380,PTS=[];
  for(let i=0;i<N;i++){const y=1-(i+.5)/N*2,r=Math.sqrt(1-y*y),t=i*2.399963;PTS.push([Math.cos(t)*r,y,Math.sin(t)*r])}
  const hex=h=>{const n=parseInt(h.slice(1),16);return [n>>16&255,n>>8&255,n&255]};
  /* How lively Evia is right now: thinking in the chat, speaking out loud, or listening in a discussion. */
  const lively=()=>!!(document.querySelector("#modal-root .evia-thinking,.dr-mic.on,.vc-on")||(window.speechSynthesis&&speechSynthesis.speaking));
  let amp=0;

  function drawParticles(el,cv,t,energy){
    const s=el.getBoundingClientRect().width,dpr=Math.min(2,window.devicePixelRatio||1),px=Math.round(s*dpr);
    if(cv.width!==px){cv.width=px;cv.height=px}
    const ctx=cv.getContext("2d"),c=hex(el.dataset.c||"#3ee6ff"),R=px*.4,cx=px/2,cy=px/2;
    ctx.clearRect(0,0,px,px);
    const ay=t*.35,ax=.35+Math.sin(t*.2)*.15,ca=Math.cos(ay),sa=Math.sin(ay),cb=Math.cos(ax),sb=Math.sin(ax);
    for(const p of PTS){
      /* The surface ripples: more when she's lively. */
      const w=1+(.035+energy*.05)*Math.sin(p[1]*5+t*1.6)+(.025+energy*.04)*Math.sin(p[0]*4-t*1.1);
      let x=p[0]*w,y=p[1]*w,z=p[2]*w;
      const x1=x*ca+z*sa,z1=-x*sa+z*ca,y1=y*cb-z1*sb,z2=y*sb+z1*cb;
      const depth=(z2+1)/2,a=.12+depth*.78;
      ctx.fillStyle="rgba("+c[0]+","+c[1]+","+c[2]+","+a.toFixed(2)+")";
      const r=(.5+depth*1.1)*dpr*(s>80?1.1:.8);
      ctx.fillRect(cx+x1*R-r/2,cy+y1*R-r/2,r,r);
    }
  }
  function drawLine(el,t,energy){
    const paths=el.querySelectorAll(".orb-line,.orb-line-glow");if(!paths.length)return;
    const c=50+Math.sin(t*.9)*30,A=1.2+energy*6,pts=[];
    for(let x=6;x<=94;x+=2){
      const bump=Math.exp(-((x-c)*(x-c))/(energy>.3?90:60)),edge=Math.sin((x-6)/88*Math.PI);
      pts.push(x+" "+(66-(A*bump*(1+.35*Math.sin(t*9+x*.5))+ .5*Math.sin(x*.3+t*2)*edge)).toFixed(2));
    }
    const d="M"+pts.join(" L");paths.forEach(p=>p.setAttribute("d",d));
  }
  let last=0;
  function frame(now){
    requestAnimationFrame(frame);
    if(document.hidden||now-last<33)return;last=now;
    const orbs=[...document.querySelectorAll(".evia-orb")];if(!orbs.length)return;
    const still=reduced(),t=now/1000;
    amp+=((lively()?1:0)-amp)*.08;
    for(const el of orbs){
      const r=el.getBoundingClientRect();
      if(!r.width||r.bottom<0||r.top>innerHeight)continue;
      if(!el.dataset.c){const S=window.eviaShapes||{},o=S[el.dataset.orb]&&S[el.dataset.orb].orb;if(o)el.dataset.c=o.c}
      const big=r.width>=44,cv=el.querySelector(".orb-cv");
      if(el.classList.contains("orb-particle")){
        if(!cv)continue;
        if(!big){cv.hidden=true;continue}
        cv.hidden=false;if(still&&cv.dataset.done)continue;
        drawParticles(el,cv,still?0:t,still?0:amp);cv.dataset.done="1";
        el.classList.add("orb-live");
      }else if(big&&!still)drawLine(el,t,amp);
    }
  }
  requestAnimationFrame(frame);
})();
