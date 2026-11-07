'use client';
import {useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {pageCurl,polygonCss,reachable,type Point} from '@/lib/page-curl';

// A book whose pages curl under the finger: grab anywhere and the sheet lifts at that height (near the top or bottom it
// peels from the corner), and moving the finger up or down swings the fold with it. Let go after pulling about a third
// of a page (or flick) and it turns over; otherwise it falls back. Pulled past the middle, it turns over by itself. One page on a phone; an open spread when there is room.
type Turn={dir:'next'|'prev';from:number;to:number;side:'right'|'left'};

// jumpRef lets the pages' own links (a contents page) open the book at a page; onPage hears which page lies open.
export function FlipBook({pages,spread=false,label,className='',hint=false,jumpRef,onPage,onTap}:{pages:ReactNode[];spread?:boolean;label:string;className?:string;hint?:boolean;jumpRef?:{current:((page:number)=>void)|null};onPage?:(page:number)=>void;onTap?:()=>boolean}){
 const step=spread?2:1;
 // A spread always starts on an even page; callers pad the front so the first page lands on the right.
 const [at,setAt]=useState(0),[turn,setTurn]=useState<Turn|null>(null);
 const total=pages.length,last=spread?Math.max(0,total-1-((total-1)%2)):total-1;
 const stage=useRef<HTMLDivElement>(null),front=useRef<HTMLDivElement>(null),flap=useRef<HTMLDivElement>(null),flapShade=useRef<HTMLDivElement>(null),revealed=useRef<HTMLDivElement>(null);
 const live=useRef<{turn:Turn;c:number;P:Point;W:number;H:number;animating:boolean}|null>(null);
 const gesture=useRef<{x:number;y:number;id:number;decided:boolean;vertical:boolean;origin?:Point;lastX:number;lastT:number}|null>(null);
 const frame=useRef(0);
 useEffect(()=>{setAt(current=>Math.min(spread?current-(current%2):current,last));setTurn(null);live.current=null},[spread,total]);
 useEffect(()=>()=>cancelAnimationFrame(frame.current),[]);
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const page=(index:number)=>index>=0&&index<total?pages[index]:<div className="flip-blank" aria-hidden="true"/>;
 const size=()=>{const r=stage.current?.getBoundingClientRect();const width=r?.width||390,height=r?.height||800;return {W:spread?width/2:width,H:height}};
 // Where the lifted point rests: at the start of a turn, flat on its own side (home), and laid over on the other side.
 const rest=(t:Turn,W:number,c:number)=>({start:{x:t.side==='right'?(t.dir==='next'?W:-W):-W,y:c},home:{x:t.side==='right'?W:-W,y:c},over:{x:t.side==='right'?-W:W,y:c}});

 // Paint the curl for the current lifted point straight onto the DOM, every frame of a drag.
 function paint(){
  const s=live.current;if(!s||!front.current||!flap.current)return;
  const {turn:t,W,H,c,P}=s,curl=pageCurl(t.side,W,H,c,P),n=curl.fold.normal,M=curl.fold.point,x0=t.side==='right'?0:-W;
  front.current.style.clipPath=polygonCss(curl.front);
  flap.current.style.clipPath=polygonCss(curl.flap);
  flap.current.style.transform=`matrix(${curl.matrix.map(v=>v.toFixed(5)).join(',')})`;
  const gradient=(u:Point,origin:Point,stops:[string,number][])=>{
   const deg=Math.atan2(u.x,-u.y)*180/Math.PI,rad=deg*Math.PI/180,L=Math.abs(W*Math.sin(rad))+Math.abs(H*Math.cos(rad))||1;
   const s0=((origin.x-W/2)*u.x+(origin.y-H/2)*u.y)/L+.5;
   return `linear-gradient(${deg.toFixed(2)}deg,transparent ${(s0*100-.1).toFixed(2)}%,${stops.map(([color,px])=>`${color} ${((s0+px/L)*100).toFixed(2)}%`).join(',')})`;
  };
  const lift=Math.sin(Math.PI*Math.min(1,Math.max(0,curl.progress)));
  // Shadow the lifted sheet casts on the page it uncovers, darkest along the fold.
  if(revealed.current){revealed.current.style.clipPath=polygonCss(curl.revealed);revealed.current.style.background=gradient(n,{x:M.x-x0,y:M.y},[[`rgba(46,50,78,${(.1+.18*lift).toFixed(3)})`,0],['rgba(46,50,78,.05)',26],['rgba(46,50,78,0)',80]])}
  // The back of the sheet rounds over at the fold: a crease shadow, a highlight on the curve, then flat paper.
  if(flapShade.current){const u={x:-n.x,y:n.y},origin={x:t.side==='right'?W-M.x:-M.x,y:M.y};flapShade.current.style.background=gradient(u,origin,[['rgba(46,50,78,.16)',0],['rgba(255,255,255,.42)',16],['rgba(255,255,255,.1)',44],['rgba(46,50,78,0)',90],['rgba(46,50,78,.05)',600]])}
 }
 useLayoutEffect(()=>{if(turn){paint();return}stage.current?.querySelectorAll<HTMLElement>('[data-slot]').forEach(el=>{el.style.clipPath='';el.style.transform=''})},[turn]);

 function begin(dir:'next'|'prev',cy?:number){
  const to=dir==='next'?at+step:at-step;if(to<0||to>last)return null;
  const {W,H}=size(),c=cy??H,t:Turn={dir,from:at,to,side:spread&&dir==='prev'?'left':'right'};
  live.current={turn:t,c,P:rest(t,W,c).start,W,H,animating:false};setTurn(t);return live.current;
 }
 function end(done:boolean){const s=live.current;live.current=null;cancelAnimationFrame(frame.current);if(s&&done)setAt(s.turn.to);setTurn(null)}
 // Ease the lifted point to where it belongs, then land.
 function settle(done:boolean,speed=1){
  const s=live.current;if(!s)return;
  // A forward turn is done when the sheet lies on the left; a single page brought back is done when it lies home again.
  const goal=rest(s.turn,s.W,s.c),target=(s.turn.side==='right'&&s.turn.dir==='prev')?(done?goal.home:goal.over):(done?goal.over:goal.home);
  if(reduced()){end(done);return}
  const from={...s.P},dist=Math.hypot(target.x-from.x,target.y-from.y),duration=Math.max(160,Math.min(600,(200+400*dist/(2*s.W))/Math.max(.8,Math.min(2.2,speed)))),started=performance.now();
  s.animating=true;
  const tick=(now:number)=>{const k=Math.min(1,(now-started)/duration),e=1-Math.pow(1-k,3);s.P={x:from.x+(target.x-from.x)*e,y:from.y+(target.y-from.y)*e};paint();if(k<1)frame.current=requestAnimationFrame(tick);else end(done)};
  frame.current=requestAnimationFrame(tick);
 }
 useEffect(()=>{const key=(event:KeyboardEvent)=>{if(live.current)return;const dir=event.key==='ArrowRight'?'next':event.key==='ArrowLeft'?'prev':null;if(dir&&begin(dir,size().H*.86))requestAnimationFrame(()=>settle(true))};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)});
 // On opening, the corner of the first page lifts a little and settles back, so it's clear the pages turn.
 useEffect(()=>{if(!hint||last<step||reduced())return;const timer=window.setTimeout(()=>{if(live.current)return;const s=begin('next');if(!s)return;const C={...s.P},started=performance.now();s.animating=true;const tick=(now:number)=>{if(live.current!==s)return;const k=Math.min(1,(now-started)/1100),e=Math.sin(Math.PI*k);s.P={x:C.x-s.W*.2*e,y:C.y-s.H*.06*e};paint();if(k<1)frame.current=requestAnimationFrame(tick);else end(false)};frame.current=requestAnimationFrame(tick)},650);return()=>window.clearTimeout(timer)},[hint,spread]);

 const handlers={
  onPointerDown:(event:React.PointerEvent<HTMLDivElement>)=>{if(live.current?.animating||!event.isPrimary)return;gesture.current={x:event.clientX,y:event.clientY,id:event.pointerId,decided:false,vertical:false,lastX:event.clientX,lastT:event.timeStamp}},
  onPointerMove:(event:React.PointerEvent<HTMLDivElement>)=>{
   const g=gesture.current;if(!g||g.vertical||event.pointerId!==g.id)return;
   const dx=event.clientX-g.x,dy=event.clientY-g.y;
   if(!g.decided){
    if(Math.abs(dx)<8&&Math.abs(dy)<8)return;
    if(Math.abs(dy)>Math.abs(dx)*1.4){g.vertical=true;return}
    g.decided=true;
    // The sheet is lifted at the finger's height; near the top or bottom it peels from the corner instead.
    const r=stage.current!.getBoundingClientRect(),y=g.y-r.top,H=r.height,cy=y<H*.18?0:y>H*.82?H:y;
    const s=begin(dx<0?'next':'prev',cy);if(!s){gesture.current=null;return}
    g.origin={...s.P};event.currentTarget.setPointerCapture(event.pointerId);
   }
   const s=live.current;if(!s||!g.origin)return;
   const P={x:g.origin.x+dx,y:g.origin.y+dy};
   s.P=s.turn.side==='right'?reachable(s.W,s.H,s.c,P):(()=>{const m=reachable(s.W,s.H,s.c,{x:-P.x,y:P.y});return {x:-m.x,y:m.y}})();
   if(event.timeStamp-g.lastT>40){g.lastX=event.clientX;g.lastT=event.timeStamp}
   // Past the middle (the lifted edge has reached the spine) the sheet falls over by itself; the finger no longer drags it.
   if(Math.abs(s.P.x-rest(s.turn,s.W,s.c).start.x)>=s.W){gesture.current=null;settle(true,1.4);return}
   cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(paint);
  },
  onPointerUp:(event:React.PointerEvent<HTMLDivElement>)=>{
   const g=gesture.current;gesture.current=null;
   // A tap (no drag) on the right half turns forward, on the left half back — unless it landed on something tappable.
   if(g&&!g.decided&&!g.vertical&&!live.current&&!(event.target as HTMLElement).closest('button,a,input,textarea,select,[role=button]')){
    if(onTap?.())return;
    const r=stage.current!.getBoundingClientRect(),dir=event.clientX-r.left>r.width/2?'next':'prev';
    if(begin(dir,r.height*.86))requestAnimationFrame(()=>settle(true));return;
   }
   const s=live.current;if(!g||!g.decided||!s||s.animating)return;
   const velocity=(event.clientX-g.lastX)/Math.max(8,event.timeStamp-g.lastT),toward=s.turn.dir==='next'?-velocity:velocity;
   // How far the sheet has travelled, in page widths, from where it started.
   const moved=Math.abs(s.P.x-rest(s.turn,s.W,s.c).start.x)/s.W;
   settle(moved>.3||toward>.4,Math.abs(velocity));
  },
  onPointerCancel:()=>{gesture.current=null;if(live.current&&!live.current.animating)settle(false)},
 };

 // Jump straight to a page: no curl, the book just opens there.
 function open(target:number){if(live.current){cancelAnimationFrame(frame.current);live.current=null;setTurn(null)}const page=Math.max(0,Math.min(last,spread?target-(target%2):target));if(page!==at)setAt(page)}
 if(jumpRef)jumpRef.current=open;
 useEffect(()=>{onPage?.(at)},[at,onPage]);

 // Every page sits in its own keyed slot, so a page keeps its element (decoded photos, painted paper) as it moves from the
 // flat spread to the turning sheet and back. Rebuilding them at the end of a turn made the whole book flash.
 type Role='page'|'left'|'right'|'face'|'flap';
 const slots:{key:string;role:Role;node:ReactNode}[]=[];
 const add=(index:number,role:Role)=>slots.push({key:'p'+index,role,node:page(index)});
 const t=turn;
 if(!t){if(spread){add(at,'left');add(at+1,'right')}else add(at,'page')}
 else if(!spread){
  add(t.dir==='next'?t.to:t.from,'page');add(t.dir==='next'?t.from:t.to,'face');
  slots.push({key:'paper-back',role:'flap',node:<div className="flip-paper-back" aria-hidden="true"/>});
 }else if(t.dir==='next'){add(t.from,'left');add(t.to+1,'right');add(t.from+1,'face');add(t.to,'flap')}
 else{add(t.to,'left');add(t.from+1,'right');add(t.from,'face');add(t.to+1,'flap')}
 const inner=(role:Role)=>role==='face'?`flip-leaf is-face is-${t!.side}`:role==='flap'?`flip-flap is-${t!.side}`:role==='page'?'flip-page':`flip-page is-${role}`;
 const layers=<>
  {slots.map(({key,role,node})=><div key={key} className={role==='flap'?'flip-flap-shadow':'flip-slot'}>
   <div ref={role==='face'?front:role==='flap'?flap:undefined} data-slot className={inner(role)}>{node}{role==='flap'&&<div ref={flapShade} className="flip-flap-shade" aria-hidden="true"/>}</div>
  </div>)}
  {t&&<div key="revealed" className={`flip-leaf is-${t.side}`}><div ref={revealed} className="flip-revealed" aria-hidden="true"/></div>}
 </>;
 return <section className={`flip-book${spread?' is-spread':''} ${className}`} aria-roledescription="book" aria-label={label}>
  <div ref={stage} className="flip-stage" {...handlers}>{layers}</div>
  <span className="flip-counter" aria-hidden="true">{spread?`${Math.min(total,at+1)}–${Math.min(total,at+2)}`:at+1} / {total}</span>
 </section>;
}
