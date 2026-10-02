import {useRef,useState,type ReactNode} from 'react';
import {Trash2} from 'lucide-react';
export function SwipeToDelete({children,label,onDelete}:{children:ReactNode;label:string;onDelete:()=>void}){
 const [offset,setOffset]=useState(0),[dragging,setDragging]=useState(false);
 const gesture=useRef<{x:number;y:number;offset:number;axis?:'x'|'y'}|null>(null);
 const moved=useRef(false);
 return <div className="swipe-row">
  <button className="swipe-delete" type="button" aria-label={label} onFocus={()=>setOffset(-72)} onClick={onDelete}><Trash2 size={19}/></button>
  <div className="swipe-content" style={{transform:`translateX(${offset}px)`,transition:dragging?'none':undefined}}
   onPointerDown={e=>{if(e.button!==0)return;moved.current=false;gesture.current={x:e.clientX,y:e.clientY,offset}}}
   onPointerMove={e=>{const g=gesture.current;if(!g)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(!g.axis&&Math.max(Math.abs(dx),Math.abs(dy))>8)g.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';if(g.axis==='x'){e.currentTarget.setPointerCapture(e.pointerId);moved.current=true;setDragging(true);setOffset(Math.max(-72,Math.min(0,g.offset+dx)))}}}
   onPointerUp={()=>{if(gesture.current?.axis==='x')setOffset(offset<-30?-72:0);gesture.current=null;setDragging(false)}}
   onPointerCancel={()=>{setOffset(gesture.current?.offset||0);gesture.current=null;setDragging(false)}}
   onClickCapture={e=>{if(moved.current){e.preventDefault();e.stopPropagation();moved.current=false}else if(offset){e.preventDefault();e.stopPropagation();setOffset(0)}}}
   onKeyDown={e=>{if(e.key==='Escape')setOffset(0)}}>{children}</div>
 </div>
}
