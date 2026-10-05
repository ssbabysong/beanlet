import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Capacitor} from '@capacitor/core';
import {Haptics,ImpactStyle} from '@capacitor/haptics';
function feedback(){
 if(Capacitor.isNativePlatform())void Haptics.impact({style:ImpactStyle.Light}).catch(()=>{});
 else if(typeof navigator.vibrate==='function')navigator.vibrate(15);
}
export function PressableRecord({children,className,label,onClick,onActions}:{children:ReactNode;className:string;label:string;onClick:()=>void;onActions:()=>void}){
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),origin=useRef<{x:number;y:number}|null>(null),fired=useRef(false);
 const [pressing,setPressing]=useState(false);
 function cancel(){if(timer.current)clearTimeout(timer.current);timer.current=null;origin.current=null;setPressing(false)}
 function open(){if(fired.current)return;fired.current=true;cancel();feedback();onActions()}
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 return <article className={className+(pressing?' is-pressing':'')} tabIndex={0} aria-label={label} aria-haspopup="dialog"
 onPointerDown={e=>{fired.current=false;if(e.button!==0||!e.isPrimary){cancel();return}cancel();origin.current={x:e.clientX,y:e.clientY};setPressing(true);timer.current=setTimeout(open,500)}}
 onPointerMove={e=>{const p=origin.current;if(p&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>9)cancel()}}
 onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel} onBlur={cancel}
 onClickCapture={e=>{if(fired.current){e.preventDefault();e.stopPropagation();fired.current=false}}}
 onClick={e=>{if(!e.defaultPrevented)onClick()}}
 onContextMenu={e=>{e.preventDefault();e.stopPropagation();if(!fired.current)open()}}
 onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.shiftKey&&e.key==='F10'){e.preventDefault();fired.current=false;open()}else if(e.key==='Enter'||e.key===' '){e.preventDefault();onClick()}if(e.key==='Escape')cancel()}}>{children}</article>
}
