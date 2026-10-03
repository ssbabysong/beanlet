import assert from 'node:assert/strict';
import {collectTasted,coffeeIdentity,stickerShape} from '../lib/tasted.ts';
const bag={id:'a',catalogId:'coffee-1',name:'Coffee',status:'未开封',rating:0,repurchase:false};
assert.equal(collectTasted([bag],[]).length,0);
let result=collectTasted([bag],[{beanId:'a',date:'2026-09-20'}]);
assert.equal(result.length,1);assert.equal(result[0].firstDate,'2026-09-20');
const second={...bag,id:'b',status:'已喝完',rating:5};
result=collectTasted([bag,second],[{beanId:'b',date:'2026-09-10'},{beanId:'a',date:'2026-09-20'}],result);
assert.equal(result.length,1);assert.equal(result[0].firstDate,'2026-09-10');assert.equal(result[0].bean.rating,5);
assert.deepEqual(collectTasted([],[],result),result);
assert.equal(collectTasted([{...bag,status:'已喝完'}],[])[0].firstDate,'');
assert.equal(collectTasted([bag,{...second,catalogId:'coffee-2'}],[{beanId:'a',date:'2026-09-20'}]).length,2);
assert.equal(coffeeIdentity({...bag,catalogId:''}),'a');
assert.equal(collectTasted([bag],[],[{id:'coffee-1',bean:bag,firstDate:'',manual:true}]).length,1);
console.log('Tasted atlas: unopened, brewed, finished, multiple bags, dates, separate coffees and preserved memories passed');

assert.equal(stickerShape('coffee-1'),stickerShape('coffee-1'));
assert.equal(new Set(Array.from({length:30},(_,i)=>stickerShape('coffee-'+i))).size,5);

const {groupFinished}=await import('../lib/tasted.ts');
const bags=[
 {id:'bag-a',catalogId:'same-coffee',name:'A',status:'已喝完',rating:0,repurchase:false},
 {id:'bag-b',catalogId:'same-coffee',name:'A',status:'已喝完',rating:0,repurchase:false},
 {id:'bag-c',catalogId:'different-coffee',name:'A',status:'已喝完',rating:0,repurchase:false},
 {id:'bag-d',catalogId:'same-coffee',name:'A',status:'正在喝',rating:0,repurchase:false},
];
assert.deepEqual(groupFinished(bags).map(g=>g.map(b=>b.id)),[['bag-a','bag-b'],['bag-c']]);
assert.equal(bags.length,4);
assert.equal(groupFinished(bags.slice(3)).length,0);
console.log('Finished bags: same coffee grouped, distinct coffees separated, originals retained');
