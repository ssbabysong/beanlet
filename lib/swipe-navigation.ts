export type SwipeDirection='next'|'previous';
export function swipeDirection(dx:number,dy:number):SwipeDirection|null{
 if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.5)return null;
 return dx<0?'next':'previous';
}
export function adjacentTab(current:string,direction:SwipeDirection,tabs:readonly string[]){
 return tabs[tabs.indexOf(current)+(direction==='next'?1:-1)]||null;
}
