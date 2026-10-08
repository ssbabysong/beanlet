import assert from 'node:assert/strict';
import {reelStickerLayout,stickerPlacement,wallStickerPlacement} from '../lib/sticker-layout.ts';

const square=Array.from({length:30},(_,index)=>stickerPlacement(`photo-${index}`,index,30));
assert.deepEqual(stickerPlacement('same',4,12),stickerPlacement('same',4,12));
assert.ok(square.every(item=>item.x>=7&&item.x<=93&&item.y>=8&&item.y<=92));
assert.ok(square.every(item=>item.size>=18&&item.rotation>=-14&&item.rotation<=14));
const portrait=Array.from({length:20},(_,index)=>stickerPlacement(`photo-${index}`,index,20,true));
assert.ok(portrait.every(item=>item.x>=7&&item.x<=93&&item.y>=8&&item.y<=92));
assert.equal(stickerPlacement('one',0,1).x,50);
const ids=n=>Array.from({length:n},(_,index)=>`photo-${index}`);
assert.deepEqual(reelStickerLayout(ids(12)),reelStickerLayout(ids(12)));
assert.ok(reelStickerLayout(['one'])[0].size>=80&&reelStickerLayout(ids(2)).every(p=>p.size>=60),'few stickers stay large');
// From five stickers on, big overlapping stickers pile up around the middle and still hide most of the frame below the masthead (15%–100% of the height)
for(const n of [5,12,30,60]){
 const reel=reelStickerLayout(ids(n)),aspect=16/9;let covered=0,total=0;
 for(let gy=0;gy<60;gy++)for(let gx=0;gx<34;gx++){const x=(gx+.5)/34*100,y=15+(gy+.5)/60*85;total++;if(reel.some(p=>Math.abs(x-p.x)<p.size*.45&&Math.abs(y-p.y)*aspect<p.size*.45))covered++}
 assert.ok(covered/total>=.75,`${n} stickers should cover at least 75%, got ${Math.round(covered/total*100)}%`);
 assert.ok(reel.reduce((a,p)=>a+Math.abs(p.x-50),0)/n<20,'the pile gathers towards the centre');
 assert.ok(reel.every(p=>p.size>=50),'every sticker is at least half the frame width');
 if(n>1)assert.ok(reel.some((p,i)=>reel.some((q,j)=>i<j&&Math.abs(p.x-q.x)<(p.size+q.size)*.4&&Math.abs(p.y-q.y)*aspect<(p.size+q.size)*.4)),'stickers overlap');
}
const wall=Array.from({length:100},(_,index)=>wallStickerPlacement(`photo-${index}`,index,100));
assert.deepEqual(wallStickerPlacement('same',4,12),wallStickerPlacement('same',4,12));
assert.ok(wall.every(item=>item.size>=11&&item.size<=19&&item.lift>=-9&&item.lift<=9&&item.rotation>=-8&&item.rotation<=8));
console.log('Sticker layout: deterministic cluster, bounds, scale, portrait placement and stacked reel coverage passed');
