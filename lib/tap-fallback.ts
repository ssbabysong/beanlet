// iOS app only. On the iPhone Duo, WebKit sometimes delivers a whole touch (pointerdown, pointerup, touchend — not
// cancelled, no scroll) and then withholds the mouse events and the click, so buttons and fields on the editor pages
// seem dead (seen on device, 2026-11-03). When a tap ends where it started and no click follows, send the click
// ourselves; a field is focused straight away on lift-off so the keyboard still opens. If WebKit's own click turns up
// late, it is swallowed so nothing fires twice.
const field='input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=button]):not([type=submit]),textarea,[contenteditable=true]';

export function installTapFallback(){
 let down:{x:number;y:number;t:number;id:number}|null=null,clickedAt=0,synthetic:{x:number;y:number;t:number}|null=null,timer=0;
 window.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||!e.isPrimary)return;down={x:e.clientX,y:e.clientY,t:e.timeStamp,id:e.pointerId}},true);
 window.addEventListener('pointercancel',()=>{down=null;window.clearTimeout(timer)},true);
 window.addEventListener('pointerup',e=>{
  const d=down;down=null;
  if(!d||e.pointerId!==d.id||Math.hypot(e.clientX-d.x,e.clientY-d.y)>12||e.timeStamp-d.t>600)return;
  const x=e.clientX,y=e.clientY,target=document.elementFromPoint(x,y) as HTMLElement|null;if(!target)return;
  // Fields: focus inside the touch so iOS still raises the keyboard.
  const input=target.closest(field) as HTMLElement|null;
  if(input&&document.activeElement!==input)input.focus();
  const pressedAt=performance.now();
  window.clearTimeout(timer);
  timer=window.setTimeout(()=>{
   if(clickedAt>=pressedAt||!target.isConnected)return;
   synthetic={x,y,t:performance.now()};
   target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window,clientX:x,clientY:y,detail:1}));
  },80);
 },true);
 window.addEventListener('click',e=>{
  // A late real click at the spot we already clicked for: drop it.
  if(e.isTrusted&&synthetic&&performance.now()-synthetic.t<700&&Math.hypot(e.clientX-synthetic.x,e.clientY-synthetic.y)<16){e.preventDefault();e.stopImmediatePropagation();synthetic=null;return}
  if(e.isTrusted)clickedAt=performance.now();
 },true);
}
