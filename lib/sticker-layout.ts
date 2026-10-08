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

/**
 * Reel collage: big stickers piled over each other until they hide most of the 9:16 frame below the masthead.
 * Each sticker tries a few dozen seeded spots, drawn mostly near the middle, and takes the one where the pile is
 * thinnest, discounted by distance from the centre: the pile grows outward from the middle without lining up in a
 * grid, leaving some background at the corners. Later stickers land on top. Positions are % of width/height.
 */
export function reelStickerLayout(ids:string[]):StickerPlacement[]{
 const count=ids.length,frame=16/9*100,top=.15*frame,areaH=frame-top;   // heights below are in % of the width
 if(!count)return [];
 // Total sticker area ≈ 2.1× the area, so stickers overlap and little background shows; never narrower than half the frame.
 const base=Math.max(50,Math.min(84,Math.sqrt(2.1*100*areaH/count)));
 const gx=24,gy=Math.round(gx*areaH/100),cw=100/gx,ch=areaH/gy,cover=new Uint16Array(gx*gy);
 return ids.map((id,index)=>{
  const seed=hashValue(`${id}-${index}`),size=count===1?base:Math.max(50,base*(.88+unit(seed^0xc2b2ae35)*.26)),half=size*.42;
  const cy=top+areaH*.48,ry=areaH/2-half*.3;
  let best={x:50,y:cy,score:-1};
  for(let k=0;k<(count===1?1:32);k++){
   // Sum of two uniforms: candidates cluster around the centre but can still reach the edges
   const u=(salt:number)=>unit(seed^Math.imul(k+1,salt)),x=count===1?50:50+(u(0x9e3779b9)+u(0x7feb352d)-1)*44,y=count===1?cy:cy+(u(0x85ebca6b)+u(0x846ca68b)-1)*ry;
   const d2=((x-50)/44)**2+((y-cy)/ry)**2;
   let score=0;
   for(let gyi=Math.max(0,Math.floor((y-top-half)/ch));gyi<Math.min(gy,Math.ceil((y-top+half)/ch));gyi++)
    for(let gxi=Math.max(0,Math.floor((x-half)/cw));gxi<Math.min(gx,Math.ceil((x+half)/cw));gxi++)score+=1/(1+cover[gyi*gx+gxi]);
   score=score/(1+.8*d2)+unit(seed^k)*.01;
   if(score>best.score)best={x,y,score};
  }
  for(let gyi=Math.max(0,Math.floor((best.y-top-half)/ch));gyi<Math.min(gy,Math.ceil((best.y-top+half)/ch));gyi++)
   for(let gxi=Math.max(0,Math.floor((best.x-half)/cw));gxi<Math.min(gx,Math.ceil((best.x+half)/cw));gxi++)cover[gyi*gx+gxi]++;
  return {x:best.x,y:best.y/frame*100,size,rotation:-16+unit(seed^0x27d4eb2f)*32,z:index+1};
 });
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
