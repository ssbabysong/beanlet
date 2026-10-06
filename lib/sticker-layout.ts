export type StickerPlacement={x:number;y:number;size:number;rotation:number;z:number};
export type WallStickerPlacement={size:number;lift:number;rotation:number};

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

/** Stable portrait scatter that fills a Reel from the masthead to the bottom edge. */
export function reelStickerPlacement(id:string,index:number,count:number):StickerPlacement{
 const seed=hashValue(`${id}-${index}`);
 if(count<=1)return {x:50,y:55,size:64,rotation:(unit(seed)-.5)*10,z:1};
 const columns=count<=8?2:count<=18?3:4,rows=Math.ceil(count/columns),row=Math.floor(index/columns),column=index%columns;
 const cellWidth=84/columns,cellHeight=76/rows;
 const x=8+(column+.5)*cellWidth+(unit(seed^0x9e3779b9)-.5)*cellWidth*.34;
 const y=17+(row+.5)*cellHeight+(unit(seed^0x85ebca6b)-.5)*cellHeight*.34;
 const base=count<=5?47:count<=10?38:count<=20?31:25;
 return {x:Math.max(7,Math.min(93,x)),y:Math.max(16,Math.min(95,y)),size:base*(.88+unit(seed^0xc2b2ae35)*.24),rotation:-12+unit(seed^0x27d4eb2f)*24,z:index+1};
}

/** Stable, row-based scatter for the monthly wall. Items vary in size and lift, but keep their own layout space. */
export function wallStickerPlacement(id:string,index:number,count:number):WallStickerPlacement{
 const seed=hashValue(`${id}-${index}`);
 const columns=count<=6?Math.max(1,count):count<=18?5:6;
 const base=(count<=6?96:100)/columns;
 const size=base*(.74+unit(seed^0x9e3779b9)*.30);
 const lift=(unit(seed^0x85ebca6b)-.5)*8;
 const rotation=-8+unit(seed^0xc2b2ae35)*16;
 return {size, lift, rotation};
}
