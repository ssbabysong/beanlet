import assert from 'node:assert/strict';
import {stickerPlacement,wallStickerPlacement} from '../lib/sticker-layout.ts';

const square=Array.from({length:30},(_,index)=>stickerPlacement(`photo-${index}`,index,30));
assert.deepEqual(stickerPlacement('same',4,12),stickerPlacement('same',4,12));
assert.ok(square.every(item=>item.x>=7&&item.x<=93&&item.y>=8&&item.y<=92));
assert.ok(square.every(item=>item.size>=18&&item.rotation>=-14&&item.rotation<=14));
const portrait=Array.from({length:20},(_,index)=>stickerPlacement(`photo-${index}`,index,20,true));
assert.ok(portrait.every(item=>item.x>=7&&item.x<=93&&item.y>=8&&item.y<=92));
assert.equal(stickerPlacement('one',0,1).x,50);
const wall=Array.from({length:100},(_,index)=>wallStickerPlacement(`photo-${index}`,index,100));
assert.deepEqual(wallStickerPlacement('same',4,12),wallStickerPlacement('same',4,12));
assert.ok(wall.every(item=>item.size>=11&&item.size<=19&&item.lift>=-9&&item.lift<=9&&item.rotation>=-8&&item.rotation<=8));
console.log('Sticker layout: deterministic cluster, bounds, scale and portrait placement passed');
