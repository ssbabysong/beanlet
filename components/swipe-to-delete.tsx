import {useRef,useState,type ReactNode} from 'react';
import {Pencil,Trash2} from 'lucide-react';
import {navigationFeedback} from '@/lib/haptic-feedback';

type SwipeActionsProps={children:ReactNode;editLabel:string;deleteLabel:string;onEdit:()=>void;onDelete:()=>void;className?:string};

export function SwipeActions({children,editLabel,deleteLabel,onEdit,onDelete,className=''}:SwipeActionsProps){
 const actionWidth=132,[offset,setOffset]=useState(0),[dragging,setDragging]=useState(false),offsetRef=useRef(0),openRef=useRef(false),gesture=useRef<{x:number;y:number;offset:number;axis?:'x'|'y'}|null>(null),moved=useRef(false);
 function move(next:number){offsetRef.current=next;setOffset(next)}
 function close(){openRef.current=false;move(0)}
 function reveal(feedback=true){if(feedback&&!openRef.current)navigationFeedback();openRef.current=true;move(-actionWidth)}
 function action(run:()=>void){close();run()}
 return <div className={`swipe-row swipe-actions-row ${className}`.trim()}>
  <div className="swipe-actions" aria-hidden={offset===0} style={{opacity:Math.min(1,Math.abs(offset)/36)}}>
   <button className="swipe-edit" type="button" tabIndex={offset===0?-1:0} aria-label={editLabel} onFocus={()=>reveal(false)} onClick={()=>action(onEdit)}><Pencil size={17}/><span>{editLabel}</span></button>
   <button className="swipe-delete" type="button" tabIndex={offset===0?-1:0} aria-label={deleteLabel} onFocus={()=>reveal(false)} onClick={()=>action(onDelete)}><Trash2 size={17}/><span>{deleteLabel}</span></button>
  </div>
  <div className="swipe-content" style={{transform:`translateX(${offset}px)`,transition:dragging?'none':undefined}}
   onPointerDown={e=>{if(e.button!==0)return;moved.current=false;gesture.current={x:e.clientX,y:e.clientY,offset:offsetRef.current}}}
   onPointerMove={e=>{const g=gesture.current;if(!g)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(!g.axis&&Math.max(Math.abs(dx),Math.abs(dy))>8)g.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';if(g.axis==='x'){e.currentTarget.setPointerCapture(e.pointerId);moved.current=true;setDragging(true);move(Math.max(-actionWidth,Math.min(0,g.offset+dx)))}}}
   onPointerUp={e=>{const horizontal=gesture.current?.axis==='x';if(horizontal){if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);offsetRef.current<-38?reveal():close()}gesture.current=null;setDragging(false)}}
   onPointerCancel={()=>{move(gesture.current?.offset||0);gesture.current=null;setDragging(false)}}
   onClickCapture={e=>{if(moved.current){e.preventDefault();e.stopPropagation();moved.current=false}else if(offsetRef.current){e.preventDefault();e.stopPropagation();close()}}}
   onKeyDown={e=>{if(e.key==='Escape')close()}}>{children}</div>
 </div>
}
