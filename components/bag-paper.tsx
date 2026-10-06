import {useId,type CSSProperties} from 'react';
const outline='M38 24 Q32 20 35 40 Q13 96 13 168 Q13 188 50 198 Q93 198 144 184 Q152 180 149 154 Q146 80 126 36 Q131 16 115 14Z';
const side='M35 40 Q13 100 13 168 Q13 184 50 197 Q39 154 38 84Z';
export function BagPaper({ratio,sway=false}:{ratio?:number;sway?:boolean}){
 const id=useId().replaceAll(':','');
 const y=14+(1-(ratio??1))*184,tilt=18;
 const isEmpty=ratio!=null&&ratio<=0;
 const sideOpacity=ratio==null||ratio>=1?.7:isEmpty?.06:.1;
 return <svg className="coffee-bag-body" viewBox="0 0 160 200" aria-hidden="true">
  <defs><clipPath id={id}><path d={outline}/></clipPath><clipPath id={`${id}-side`}><path d={side}/></clipPath></defs>
  <path d={outline} fill="var(--bag-fill)" opacity={ratio==null||ratio===1?1:.1}/>
  {ratio!=null&&ratio>0&&ratio<1&&<g clipPath={`url(#${id})`}><path className={'bag-liquid'+(sway?' is-swaying':'')} style={{transformOrigin:`80px ${y}px`} as CSSProperties} fill="var(--bag-fill)" d={`M-40 ${y+tilt} L200 ${y-tilt} V250 H-40Z`}/></g>}
  <path className="bag-paper" style={{fill:'none'}} d={outline}/>
  <path className="bag-side" style={{opacity:sideOpacity,fill:isEmpty?'var(--bag-fill)':'var(--bag-side)'}} d={side}/>
  {ratio!=null&&ratio>0&&ratio<1&&<g clipPath={`url(#${id}-side)`}><path className={'bag-liquid bag-side-liquid'+(sway?' is-swaying':'')} style={{transformOrigin:`80px ${y}px`} as CSSProperties} fill="var(--bag-side)" d={`M-40 ${y+tilt} L200 ${y-tilt} V250 H-40Z`}/></g>}
  <path className="bag-fold" d="M38 36 L123 24 M40 40 Q42 120 49 194"/>
  <path className="bag-crease" d="M24 150 Q20 173 30 180 M24 184 L31 190 M134 44 Q141 50 143 60"/>
  <rect className="bag-tape" x="75" y="9" width="19" height="36" rx="3"/>
 </svg>;
}
