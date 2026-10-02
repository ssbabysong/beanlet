import assert from 'node:assert/strict';
import {flavorWindow,roastOptions,civilDay} from '../lib/coffee-guide.ts';
const day=(n)=>new Date(Date.UTC(2026,8,1+n)).toISOString().slice(0,10);
for(const roast of roastOptions){assert.equal(flavorWindow(roast,'',day(0)).phase,'undated');assert.equal(flavorWindow(roast,day(0),day(0)).phase,'resting');assert.equal(flavorWindow(roast,day(0),day(60)).phase,'past');}
for(const [age,phase] of [[6,'resting'],[7,'peak'],[26,'peak'],[27,'soon'],[30,'soon'],[31,'past']])assert.equal(flavorWindow('浅烘焙',day(0),day(age)).phase,phase);
for(const [age,phase] of [[20,'resting'],[21,'opening'],[28,'peak'],[39,'soon'],[43,'past']])assert.equal(flavorWindow('浅烘焙',day(0),day(age),'Hydrangea').phase,phase);
assert.equal(civilDay('2026-02-30'),null);assert.equal(flavorWindow('浅烘焙',day(3),day(0)).phase,'invalid');assert.equal(flavorWindow('未记录','',day(0)).phase,'unknown');
console.log('Roast guidance: all roast levels, boundaries, missing/invalid dates, Hydrangea override passed');
