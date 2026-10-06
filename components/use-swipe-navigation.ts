import {useRef,type PointerEvent,type MouseEvent,type DragEvent} from 'react';
import {swipeDirection,type SwipeDirection} from '@/lib/swipe-navigation';
export function useSwipeNavigation(onSwipe:(direction:SwipeDirection)=>void,enabled=true,allowInteractive=false){
 const start=useRef<{x:number;y:number;axis?:'x'|'y'}|null>(null),moved=useRef(false);
 return {
  onDragStart(e:DragEvent<HTMLElement>){if(enabled)e.preventDefault()},
  onPointerDown(e:PointerEvent<HTMLElement>){
   start.current=null;moved.current=false;
   if(!enabled||e.button!==0||!e.isPrimary)return;
   const target=e.target as HTMLElement;
   if(!allowInteractive&&target.closest('button,a,input,textarea,select,[role=button],[role=slider],[role=combobox],[role=listbox],.swipe-row,.main-tabs'))return;
   // Portaled dialogs must never drive the page underneath them.
   if(target.closest('[role=dialog]')!==e.currentTarget.closest('[role=dialog]'))return;
   start.current={x:e.clientX,y:e.clientY};
  },
  onPointerMove(e:PointerEvent<HTMLElement>){
   const s=start.current;if(!s)return;
   const dx=e.clientX-s.x,dy=e.clientY-s.y;
   if(!s.axis&&Math.max(Math.abs(dx),Math.abs(dy))>12)s.axis=Math.abs(dx)>Math.abs(dy)*1.5?'x':'y';
   if(s.axis==='x'){moved.current=true;e.currentTarget.setPointerCapture(e.pointerId)}
  },
  onPointerUp(e:PointerEvent<HTMLElement>){
   const s=start.current;start.current=null;
   if(!enabled||s?.axis!=='x')return;
   const direction=swipeDirection(e.clientX-s.x,e.clientY-s.y);if(direction)onSwipe(direction);
  },
  onPointerCancel(){start.current=null;moved.current=false},
  onClickCapture(e:MouseEvent<HTMLElement>){if(moved.current){e.preventDefault();e.stopPropagation();moved.current=false}},
 };
}
