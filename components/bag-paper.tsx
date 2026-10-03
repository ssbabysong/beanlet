import {useEffect,useId,useState,type CSSProperties} from 'react';
const outline='M30 13 Q78 9 131 14 L128 35 Q133 54 140 76 L146 171 Q148 182 136 187 Q78 197 24 186 Q13 183 15 171 L21 77 Q28 54 32 35Z';
export function BagPaper({ratio}:{ratio?:number}){
 const id=useId().replaceAll(':',''),[sway,setSway]=useState(false);
 const partial=ratio!=null&&ratio>0&&ratio<1;
 useEffect(()=>{
  if(!partial)return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let timer:ReturnType<typeof setTimeout>,settle:ReturnType<typeof setTimeout>;
  function schedule(){timer=setTimeout(()=>{if(!motion.matches&&!document.hidden){setSway(true);settle=setTimeout(()=>setSway(false),2400)}schedule()},9000+Math.random()*15000)}
  schedule();return()=>{clearTimeout(timer);clearTimeout(settle)};
 },[partial]);
 const y=13+(1-(ratio??1))*175;
 return <svg className="coffee-bag-body" viewBox="0 0 160 200" aria-hidden="true">
  <defs><clipPath id={id}><path d={outline}/></clipPath></defs>
  <path d={outline} fill="var(--bag-fill)" opacity={ratio==null||ratio===1?1:.1}/>
  {ratio!=null&&ratio>0&&ratio<1&&<g clipPath={`url(#${id})`}><path className={'bag-liquid'+(sway?' is-swaying':'')} style={{transformOrigin:`80px ${y}px`} as CSSProperties} fill="var(--bag-fill)" d={`M-40 ${y} Q20 ${y-1} 80 ${y} T200 ${y} V250 H-40Z`}/></g>}
  <path className="bag-paper" style={{fill:'none'}} d={outline}/>
  <path className="bag-side" d="M32 35 Q27 81 28 137 L29 185 L23 183 Q17 181 19 171 L25 77Z"/>
  <path className="bag-fold" d="M32 25 Q79 22 129 26 M34 34 Q80 31 127 35 M32 172 Q83 182 133 171"/>
  <path className="bag-crease" d="M25 77 L33 68 M131 70 L138 78 M28 182 L37 172 M134 180 L126 172"/>
  <rect className="bag-tape" x="73" y="12" width="17" height="28" rx="3"/>
 </svg>;
}
