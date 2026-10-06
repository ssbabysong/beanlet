export type StickerPlacement={x:number;y:number;size:number;rotation:number;z:number};
export type WallStickerPlacement={x:number;y:number;size:number;lift:number;rotation:number;z:number};

function hashValue(value:string){let hash=2166136261;for(const char of value){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}return hash>>>0}
function unit(seed:number){return ((Math.imul(seed,1664525)+1013904223)>>>0)/4294967295}

/** Stable, tightly clustered placement. Portrait mode spreads the same pile for a 9:16 Reel. */
export function stickerPlacement(id:string,index:number,count:number,portrait=false):StickerPlacement{
 const seed=hashValue(id),jitter=unit(seed),angle=(index*137.508+jitter*38)*Math.PI/180;
 if(count<=1)return {x:50,y:portrait?52:50,size:portrait?52:38,rotation:(jitter-.5)*12,z:1};
 const progress=Math.sqrt(index/Math.max(1,count-1)),radius=(portrait?4:5)+progress*(portrait?27:39);
 const x=50+Math.cos(angle)*radius*(portrait?.9:1.08)+(unit(seed^0x9e3779b9)-.5)*(portrait?3:5);
 const y=(portrait?53:50)+Math.sin(angle)*radius*(portrait?.98:.72)+(unit(seed^0x85ebca6b)-.5)*(portrait?3:4);
 const base=portrait?Math.max(32,50-Math.sqrt(count)*1.6):Math.max(18,31-Math.sqrt(count)*1.45);
 return {x:Math.max(7,Math.min(93,x)),y:Math.max(8,Math.min(92,y)),size:base*(.86+unit(seed^0xc2b2ae35)*.32),rotation:-14+unit(seed^0x27d4eb2f)*28,z:index+1};
}

/** Stable loose packing for the monthly wall. Neighbours can touch at the edges without covering each other. */
export function wallStickerPlacement(id:string,index:number,count:number):WallStickerPlacement{
 const seed=hashValue(`${id}-${index}`);
 const columns=count<=3?Math.max(1,count):count<=6?3:count<=12?4:count<=24?5:6,rows=Math.ceil(count/columns);
 const column=index%columns,row=Math.floor(index/columns),cellWidth=100/columns,cellHeight=100/rows;
 const rowNudge=row%2?cellWidth*.055:-cellWidth*.025;
 const x=(column+.5)*cellWidth+rowNudge+(unit(seed^0x9e3779b9)-.5)*cellWidth*.15;
 const y=(row+.5)*cellHeight+(unit(seed^0x85ebca6b)-.5)*cellHeight*.18;
 const size=cellWidth*(.96+unit(seed^0xc2b2ae35)*.1);
 const lift=(unit(seed^0x27d4eb2f)-.5)*5;
 const rotation=-10+unit(seed^0x165667b1)*20;
 return {x:Math.max(size/2,Math.min(100-size/2,x)),y:Math.max(3,Math.min(97,y)),size,lift,rotation,z:index+1};
}
