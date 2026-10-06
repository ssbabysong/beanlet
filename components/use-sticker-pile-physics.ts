import {type RefObject,useCallback,useEffect,useRef} from 'react';

type Body={el:HTMLElement;x:number;y:number;vx:number;vy:number;r:number};

function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value))}
function hash(value:string){let result=2166136261;for(const char of value){result^=char.charCodeAt(0);result=Math.imul(result,16777619)}return result>>>0}
function random(seed:number){return ((Math.imul(seed,1664525)+1013904223)>>>0)/4294967295}

/** A small DOM physics loop for the coffee-photo pile. It avoids React renders while the phone moves. */
export function useStickerPilePhysics(stageRef:RefObject<HTMLElement|null>,resetKey:string,active:boolean){
 const bodies=useRef<Body[]>([]),frame=useRef(0),gravity=useRef({x:0,y:.035}),last=useRef(0),quiet=useRef(0),permissionStarted=useRef(false),activeRef=useRef(active);
 activeRef.current=active;

 const wake=useCallback(()=>{quiet.current=0;if(frame.current||!activeRef.current)return;last.current=0;frame.current=requestAnimationFrame(tick)},[]);

 function tick(now:number){
  const stage=stageRef.current,list=bodies.current;if(!stage||!activeRef.current){frame.current=0;return}
  if(last.current&&now-last.current<25){frame.current=requestAnimationFrame(tick);return}
  const dt=last.current?clamp((now-last.current)/16.67,.65,1.8):1;last.current=now;
  const width=stage.clientWidth,height=stage.clientHeight;
  for(const body of list){
   body.vx=(body.vx+gravity.current.x*dt)*.985;body.vy=(body.vy+gravity.current.y*dt)*.985;
   body.x+=body.vx*dt;body.y+=body.vy*dt;
   const left=body.r*.72,right=width-body.r*.72,top=body.r*.7,bottom=height-body.r*.7;
   if(body.x<left){body.x=left;body.vx=Math.abs(body.vx)*.48}
   if(body.x>right){body.x=right;body.vx=-Math.abs(body.vx)*.48}
   if(body.y<top){body.y=top;body.vy=Math.abs(body.vy)*.45}
   if(body.y>bottom){body.y=bottom;body.vy=-Math.abs(body.vy)*.38}
  }
  // Soft circular collisions allow a little overlap, so the result feels like a loose pile.
  for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
   const a=list[i],b=list[j],dx=b.x-a.x,dy=b.y-a.y,distance=Math.hypot(dx,dy)||.01,min=(a.r+b.r)*.80;
   if(distance>=min)continue;
   const nx=dx/distance,ny=dy/distance,push=(min-distance)*.36;
   a.x-=nx*push;a.y-=ny*push;b.x+=nx*push;b.y+=ny*push;
   const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
   if(relative<0){const impulse=-relative*.55;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny}
  }
  for(const body of list){
   body.el.style.setProperty('--motion-x',`${body.x-body.el.offsetLeft-body.el.offsetWidth/2}px`);
   body.el.style.setProperty('--motion-y',`${body.y-body.el.offsetTop-body.el.offsetHeight/2}px`);
   body.el.style.setProperty('--motion-turn',`${clamp(body.vx*.7+gravity.current.x*12,-3.5,3.5)}deg`);
  }
  const energy=list.reduce((sum,body)=>sum+Math.abs(body.vx)+Math.abs(body.vy),0);
  quiet.current=energy<Math.max(.18,list.length*.07)?quiet.current+1:0;
  if(quiet.current>32){frame.current=0;return}
  frame.current=requestAnimationFrame(tick);
 }

 const listen=useCallback(()=>{
  if(permissionStarted.current)return;permissionStarted.current=true;
  const onOrientation=(event:DeviceOrientationEvent)=>{
   const gamma=event.gamma??0,beta=event.beta??90;
   const next={x:clamp(gamma/35,-1,1)*.22,y:clamp((beta-78)/42,-1,1)*.18+.025},changed=Math.abs(next.x-gravity.current.x)+Math.abs(next.y-gravity.current.y)>.012;
   gravity.current=next;if(changed)wake();
  };
  window.addEventListener('deviceorientation',onOrientation,{passive:true});
 },[wake]);

 const enableMotion=useCallback(async()=>{
  const Orientation=window.DeviceOrientationEvent as typeof DeviceOrientationEvent&{requestPermission?:()=>Promise<'granted'|'denied'>};
  try{if(Orientation?.requestPermission&&await Orientation.requestPermission()!=='granted')return}catch{return}
  listen();wake();
 },[listen,wake]);

 useEffect(()=>{
  const stage=stageRef.current;if(!stage||!active)return;
  const setup=()=>{
   const elements=Array.from(stage.querySelectorAll<HTMLElement>('.month-sticker-collage figure')),width=stage.clientWidth,height=stage.clientHeight;
   if(!elements.length||!width||!height)return;
   bodies.current=elements.map((el,index)=>{
    const seed=hash(`${resetKey}-${index}`),spread=Math.min(1,.58+elements.length/24);
    const x=width*(.5+(random(seed^0x9e3779b9)-.5)*.72*spread),y=height*(.58+(random(seed^0x85ebca6b)-.5)*.46*spread);
    el.style.setProperty('--motion-x',`${x-el.offsetLeft-el.offsetWidth/2}px`);el.style.setProperty('--motion-y',`${y-el.offsetTop-el.offsetHeight/2}px`);el.style.setProperty('--motion-turn','0deg');
    return {el,x,y,vx:0,vy:0,r:Math.min(el.offsetWidth,el.offsetHeight)/2};
   });
   wake();
  };
  const timer=window.setTimeout(setup,30),resizer=new ResizeObserver(setup);resizer.observe(stage);
  const Orientation=window.DeviceOrientationEvent as typeof DeviceOrientationEvent&{requestPermission?:()=>Promise<'granted'|'denied'>};
  if(!Orientation?.requestPermission)listen();
  return()=>{window.clearTimeout(timer);resizer.disconnect();if(frame.current)cancelAnimationFrame(frame.current);frame.current=0;bodies.current=[]};
 },[active,resetKey,listen,stageRef,wake]);

 return enableMotion;
}
