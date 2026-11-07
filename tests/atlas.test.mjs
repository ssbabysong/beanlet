import assert from 'node:assert/strict';
import {atlasCups,byMonth,roasterShelves,chunk,packPages,yearDots,longestStreak} from '../lib/atlas.ts';

const beans=[{id:'a'},{id:'b'}];
const brews=[
 {id:'3',beanId:'a',date:'2026-10-05',kind:'pourOver',photo:'p3',photoCutout:true,rating:4,notes:' 柑橘 '},
 {id:'1',beanId:'a',date:'2026-09-28',kind:'pourOver'},
 {id:'2',beanId:'b',date:'2026-10-02',kind:'milk',serving:'未记录'},
 {id:'4',beanId:'gone',date:'2026-10-03',kind:'pourOver'},
 {id:'5',beanId:'',date:'2026-10-04',kind:'cafe',place:' Manner ',drink:'澳白',serving:'冰'},
 {id:'6',beanId:'',date:'2026-10-06',kind:'cafe',place:'  '},
 {id:'7',beanId:'b',date:'2026-11-01'},
];
// All cups in date order; orphaned brews and unnamed cafés drop out; legacy brews without a kind are pour-overs.
assert.deepEqual(atlasCups(beans,brews).map(c=>c.id),['1','2','5','3','7']);
assert.deepEqual(atlasCups(beans,brews,'pourOver').map(c=>c.id),['1','3','7']);
assert.deepEqual(atlasCups(beans,brews,'cafe').map(c=>[c.place,c.drink,c.serving,c.bean]),[['Manner','澳白','冰',undefined]]);
const three=atlasCups(beans,brews).find(c=>c.id==='3');
assert.deepEqual([three.photo,three.cutout,three.rating,three.notes,three.bean.id],['p3',true,4,'柑橘','a']);
assert.equal(atlasCups(beans,brews,'milk')[0].serving,undefined);

// Months in date order, items keep their order; undated items are left out.
assert.deepEqual(byMonth(atlasCups(beans,brews),c=>c.date).map(g=>[g.month,g.items.map(c=>c.id)]),[['2026-09',['1']],['2026-10',['2','5','3']],['2026-11',['7']]]);
assert.deepEqual(byMonth([{d:'2026-12-01'},{d:''},{d:'2026-01-02'}],x=>x.d).map(g=>g.month),['2026-01','2026-12']);

// Roaster shelves: catalog coffees lit when tried; coffees tried outside the catalog still count; most-tried roasters first.
const catalog=[{id:'h1',roaster:'Hydrangea',name:'B'},{id:'h2',roaster:'Hydrangea',name:'A'},{id:'h3',roaster:'Hydrangea',name:'C'},{id:'bb1',roaster:'Blue Bottle',name:'Beta'},{id:'bb2',roaster:'Blue Bottle',name:'Alpha'},{id:'x1',roaster:'Onyx',name:'Z'}];
const tasted=[{id:'h3',bean:catalog[2],firstDate:'2026-10-01'},{id:'h1',bean:catalog[0],firstDate:'2026-10-20'},{id:'mine',bean:{id:'mine',name:'Home roast'},firstDate:'2026-09-01'},{id:'bb2',bean:catalog[4],firstDate:''}];
const shelves=roasterShelves(catalog,tasted);
assert.deepEqual(shelves.map(s=>[s.roaster,s.tried,s.coffees.length]),[['Hydrangea',2,3],['Blue Bottle',1,2],['',1,1],['Onyx',0,1]]);
// Inside a roaster: tried ones newest first, then the rest by name.
assert.deepEqual(shelves[0].coffees.map(c=>[c.id,c.tried]),[['h1',true],['h3',true],['h2',false]]);
assert.deepEqual(shelves[1].coffees.map(c=>c.id),['bb2','bb1']);
assert.deepEqual(roasterShelves([],[]),[]);
assert.deepEqual(chunk([1,2,3,4,5,6,7,8]),[[1,2,3,4,5,6],[7,8]]);assert.deepEqual(chunk([]),[]);assert.deepEqual(chunk([1,2,3],2),[[1,2],[3]]);
// Packing: groups share pages; a group that doesn't fit carries on (marked continued) on the next page.
const packed=packPages([{key:'09',items:[1,2]},{key:'10',items:[3,4,5,6,7,8,9]},{key:'11',items:[10]}]);
assert.deepEqual(packed.map(p=>p.map(s=>[s.key,s.items,s.continued])),[[['09',[1,2],false],['10',[3,4,5,6],false]],[['10',[7,8,9],true],['11',[10],false]]]);
assert.ok(packed.every(p=>p.reduce((n,s)=>n+s.items.length,0)<=6));
assert.deepEqual(packPages([]),[]);assert.deepEqual(packPages([{key:'a',items:[]}]),[]);
assert.deepEqual(packPages([{key:'a',items:[1,2,3,4,5,6]},{key:'b',items:[7]}]).map(p=>p.map(s=>s.key)),[['a'],['b']]);
// Year dots: twelve rows, each as long as its month (leap years included), cups looked up per day.
const dots=yearDots(2024,date=>date==='2024-02-29'?2:0);
assert.deepEqual(dots.map(r=>r.days.length),[31,29,31,30,31,30,31,31,30,31,30,31]);
assert.equal(dots[1].days[28].cups,2);assert.equal(dots[1].days[28].date,'2024-02-29');assert.equal(dots[0].month,'2024-01');
assert.equal(yearDots(2026,()=>0)[1].days.length,28);
assert.equal(longestStreak([{cups:1},{cups:2},{cups:0},{cups:1},{cups:1},{cups:1},{cups:0}]),3);
assert.equal(longestStreak([]),0);assert.equal(longestStreak([{cups:0}]),0);
console.log('Atlas: cups by kind and date, month groups, roaster shelves with tried and untried coffees, pages of six, packed pages, year dots and streaks passed');
