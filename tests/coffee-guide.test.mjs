import assert from 'node:assert/strict';
import {flavorWindow,roastOptions,civilDay,shelfPhase} from '../lib/coffee-guide.ts';
const day=(n)=>new Date(Date.UTC(2026,8,1+n)).toISOString().slice(0,10);
for(const roast of roastOptions){assert.equal(flavorWindow(roast,'',day(0)).phase,'undated');assert.equal(flavorWindow(roast,day(0),day(0)).phase,'resting');assert.equal(flavorWindow(roast,day(0),day(60)).phase,'past');}
for(const [age,phase] of [[6,'resting'],[7,'peak'],[26,'peak'],[27,'soon'],[30,'soon'],[31,'past']])assert.equal(flavorWindow('浅烘焙',day(0),day(age)).phase,phase);
for(const [age,phase] of [[20,'resting'],[21,'opening'],[28,'peak'],[39,'soon'],[43,'past']])assert.equal(flavorWindow('浅烘焙',day(0),day(age),'Hydrangea').phase,phase);
assert.equal(civilDay('2026-02-30'),null);assert.equal(flavorWindow('浅烘焙',day(3),day(0)).phase,'invalid');assert.equal(flavorWindow('未记录','',day(0)).phase,'unknown');
for(const [age,phase] of [[13,'resting'],[14,'peak'],[37,'soon'],[38,'past']])assert.equal(flavorWindow('浅烘焙',day(0),day(age),'',14).phase,phase);
for(const [age,phase] of [[1,'resting'],[2,'peak'],[21,'peak'],[22,'soon'],[26,'past']])assert.equal(flavorWindow('浅烘焙',day(0),day(age),'',2).phase,phase);
assert.equal(flavorWindow('浅烘焙',day(0),day(26),'Hydrangea',7).phase,'soon');assert.equal(flavorWindow('浅烘焙','',day(0),'',10).dates,'养豆 10 天 · 赏味第 10–33 天');
const tag=(age,roaster='')=>shelfPhase(flavorWindow('浅烘焙',day(0),day(age),roaster))?.label;
assert.equal(tag(4),'养豆 · 还需 3 天');assert.equal(tag(10),'最佳赏味');assert.equal(tag(28),'赏味期剩 2 天');assert.equal(tag(30),'赏味期最后一天');assert.equal(tag(31),undefined);assert.equal(tag(22,'Hydrangea'),'可以开冲');
assert.equal(shelfPhase(flavorWindow('浅烘焙','',day(0))),undefined);assert.equal(shelfPhase(flavorWindow('未记录',day(0),day(0))),undefined);
console.log('Roast guidance: custom resting days shift the window;');
console.log('Roast guidance: all roast levels, boundaries, missing/invalid dates, Hydrangea override passed');
