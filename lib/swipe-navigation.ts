export type SwipeDirection='next'|'previous';
export function swipeDirection(dx:number,dy:number):SwipeDirection|null{
 if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.5)return null;
 return dx<0?'next':'previous';
}
export function adjacentMenu(current:string,direction:SwipeDirection){
 const menus=['beans','brews','catalog'];
 return menus[menus.indexOf(current)+(direction==='next'?1:-1)]||null;
}
