import {useEffect,useId,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {Trash2} from 'lucide-react';
import {navigationFeedback} from '@/lib/haptic-feedback';

export type SwipeAction={label:string;icon:ReactNode;onAction:()=>void;tone?:'plain'|'add'|'link'|'delete'};
type SwipeActionsProps={children:ReactNode;deleteLabel:string;onDelete:()=>void;leadingActions?:SwipeAction[];className?:string};
const openEvent='beanlet-swipe-actions-open';

export function SwipeActions({children,deleteLabel,onDelete,leadingActions=[],className=''}:SwipeActionsProps){
 const rowId=useId(),actions:SwipeAction[]=[...leadingActions,{label:deleteLabel,icon:<Trash2 size={16}/>,onAction:onDelete,tone:'delete'}],actionWidth=Math.min(300,actions.length*(actions.length>1?64:84)),[offset,setOffset]=useState(0),[dragging,setDragging]=useState(false),offsetRef=useRef(0),openRef=useRef(false),gesture=useRef<{x:number;y:number;offset:number;axis?:'x'|'y'}|null>(null),moved=useRef(false);
 function move(next:number){offsetRef.current=next;setOffset(next)}
 function close(){openRef.current=false;move(0)}
 function reveal(feedback=true){if(feedback&&!openRef.current)navigationFeedback();document.dispatchEvent(new CustomEvent(openEvent,{detail:rowId}));openRef.current=true;move(-actionWidth)}
 function action(run:()=>void){close();run()}
 useEffect(()=>{const closeOther=(event:Event)=>{if((event as CustomEvent<string>).detail===rowId)return;openRef.current=false;offsetRef.current=0;setOffset(0)};document.addEventListener(openEvent,closeOther);return()=>document.removeEventListener(openEvent,closeOther)},[rowId]);
 return <div className={`swipe-row swipe-actions-row ${className}`.trim()} style={{'--swipe-action-width':`${actionWidth}px`,'--swipe-action-count':actions.length} as CSSProperties}>
  {/* The buttons ride in from the right edge with the row, iOS style, instead of fading in underneath it. */}
  <div className="swipe-actions" aria-hidden={offset===0} style={{transform:`translateX(${actionWidth+offset}px)`,transition:dragging?'none':undefined}}>
   {actions.map((item,index)=><button className={`swipe-action swipe-${item.tone||'plain'}`} type="button" key={`${item.label}-${index}`} tabIndex={offset===0?-1:0} aria-label={item.label} onFocus={()=>reveal(false)} onClick={()=>action(item.onAction)}>{item.icon}<span>{item.label}</span></button>)}
  </div>
  <div className={'swipe-content'+(offset<0?' is-swiped':'')} style={{transform:`translateX(${offset}px)`,transition:dragging?'none':undefined}}
   onPointerDown={e=>{if(e.button!==0)return;moved.current=false;gesture.current={x:e.clientX,y:e.clientY,offset:offsetRef.current}}}
   onPointerMove={e=>{const g=gesture.current;if(!g)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(!g.axis&&Math.max(Math.abs(dx),Math.abs(dy))>8)g.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';if(g.axis==='x'){e.currentTarget.setPointerCapture(e.pointerId);moved.current=true;setDragging(true);move(Math.max(-actionWidth,Math.min(0,g.offset+dx)))}}}
   onPointerUp={e=>{const horizontal=gesture.current?.axis==='x';if(horizontal){if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);const threshold=Math.max(28,actionWidth*.35);offsetRef.current<-threshold?reveal():close()}gesture.current=null;setDragging(false)}}
   onPointerCancel={()=>{move(gesture.current?.offset||0);gesture.current=null;setDragging(false)}}
   onClickCapture={e=>{if(moved.current){e.preventDefault();e.stopPropagation();moved.current=false}else if(offsetRef.current){e.preventDefault();e.stopPropagation();close()}}}
   onKeyDown={e=>{if(e.key==='Escape')close()}}>{children}</div>
 </div>
}
