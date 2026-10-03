import {useRef,type ReactNode} from 'react';
// Catalog rows own their swipe-to-delete gesture; the header and remaining
// atlas surface own page changes. Vertical gestures stay with scrolling.
export function AtlasSwipe({children,onSwipe}:{children:ReactNode;onSwipe:(direction:'next'|'previous')=>void}){
 const start=useRef<{x:number;y:number;axis?:'x'|'y'}|null>(null),moved=useRef(false);
 return <div className="atlas-swipe" onPointerDown={e=>{
  moved.current=false;
  if(e.button!==0||(e.target as HTMLElement).closest('.swipe-row,input,select,textarea,[role=combobox]'))return;
  start.current={x:e.clientX,y:e.clientY};
 }} onPointerMove={e=>{const s=start.current;if(!s)return;const dx=e.clientX-s.x,dy=e.clientY-s.y;if(!s.axis&&Math.max(Math.abs(dx),Math.abs(dy))>10)s.axis=Math.abs(dx)>Math.abs(dy)*1.4?'x':'y';if(s.axis==='x'){moved.current=true;e.currentTarget.setPointerCapture(e.pointerId)}}}
 onPointerUp={e=>{const s=start.current;start.current=null;if(s?.axis==='x'&&Math.abs(e.clientX-s.x)>55)onSwipe(e.clientX<s.x?'next':'previous')}}
 onPointerCancel={()=>{start.current=null}}
 onClickCapture={e=>{if(moved.current){e.preventDefault();e.stopPropagation();moved.current=false}}}>{children}</div>
}
