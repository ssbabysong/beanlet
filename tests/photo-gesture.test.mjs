import assert from 'node:assert/strict';
import {moveCrop} from '../lib/photo-gesture.ts';
const c={x:.5,y:.5},base={w:1,h:2};
const z=moveCrop({zoom:1,x:.5,y:.5},base,c,c,2);
assert.deepEqual(z,{zoom:2,x:.5,y:.5});
const pan=moveCrop(z,base,c,{x:.6,y:.6});
assert.ok(pan.x<.5&&pan.y<.5);
assert.equal(moveCrop(z,base,c,c,10).zoom,3);
assert.deepEqual(moveCrop(z,{w:1,h:1},c,c,.01),{zoom:1,x:.5,y:.5});
const edge=moveCrop(z,base,c,{x:20,y:-20});assert.equal(edge.x,0);assert.equal(edge.y,1);
const anchor={x:.25,y:.4};const a=moveCrop({zoom:1,x:.5,y:.5},base,anchor,anchor,2);
assert.ok(Math.abs(a.x-.25)<1e-9);
console.log('Photo gestures: pinch anchor, pan, zoom limits and crop bounds passed');
const {transformCrop}=await import('../lib/photo-gesture.ts');
const start={zoom:1,angle:0,cx:.5,cy:.5};
for(const base of [{w:1,h:1},{w:1,h:2},{w:3,h:1}])for(const angle of [-179,-90,-37,0,22,45,89,180]){
 const v=transformCrop(start,base,c,{x:.7,y:.3},.8,angle),r=v.angle*Math.PI/180;
 for(const x of [0,1])for(const y of [0,1]){
  const u=(x-v.cx)*Math.cos(r)+(y-v.cy)*Math.sin(r),w=-(x-v.cx)*Math.sin(r)+(y-v.cy)*Math.cos(r);
  assert.ok(Math.abs(u)<=base.w*v.zoom/2+1e-9);assert.ok(Math.abs(w)<=base.h*v.zoom/2+1e-9);
 }
}
assert.equal(transformCrop(start,{w:1,h:1},c,c,1,22).angle,22);
console.log('Free rotation: arbitrary angles and all crop corners stay covered');
const {transformSticker}=await import('../lib/photo-gesture.ts');
const free=transformSticker(start,c,{x:.7,y:.35},.5,31);
assert.equal(free.angle,31);
assert.equal(free.zoom,.5);
assert.ok(Number.isFinite(free.cx)&&Number.isFinite(free.cy));
assert.notDeepEqual({cx:free.cx,cy:free.cy},{cx:start.cx,cy:start.cy});
assert.equal(transformSticker(start,c,c,.01).zoom,.35);
assert.equal(transformSticker(start,c,c,10).zoom,4);
console.log('Sticker gestures: transparent margins, pan, zoom and free rotation passed');
