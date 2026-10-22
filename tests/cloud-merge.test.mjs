import assert from 'node:assert/strict';
import {stampChanges,mergeStates} from '../lib/cloud-merge.ts';
const base={beans:[],catalog:[],brews:[],tasted:[],favorites:[],hiddenCatalog:[]};
const bean=(id,name)=>({id,name});
// Each device edits on its own; both edits survive the merge in either direction.
let phone=stampChanges(base,{...base,beans:[bean('a','A')]},100);
let pad=stampChanges(base,{...base,beans:[bean('b','B')],favorites:['x']},110);
let merged=mergeStates(phone,pad);
assert.deepEqual(merged.beans.map(b=>b.id),['b','a']);
assert.deepEqual(merged.favorites,['x']);
assert.deepEqual(mergeStates(pad,phone).beans.map(b=>b.id).sort(),['a','b']);
// The later edit of the same record wins.
const renamed=stampChanges(merged,{...merged,beans:merged.beans.map(b=>b.id==='a'?{...b,name:'A2'}:b)},200);
assert.equal(mergeStates(merged,renamed).beans.find(b=>b.id==='a').name,'A2');
assert.equal(mergeStates(renamed,merged).beans.find(b=>b.id==='a').name,'A2');
// A deletion is remembered, so the other copy can't bring the record back, and its brews go with it.
const withBrew=stampChanges(merged,{...merged,brews:[{id:'r1',beanId:'a'}]},150);
const deleted=stampChanges(withBrew,{...withBrew,beans:withBrew.beans.filter(b=>b.id!=='a'),brews:[]},300);
const back=mergeStates(withBrew,deleted);
assert.deepEqual(back.beans.map(b=>b.id),['b']);
assert.deepEqual(back.brews,[]);
assert.equal(back.removed['beans:a'],300);
// ...but a record edited after the deletion comes back.
const revived=stampChanges(withBrew,{...withBrew,beans:withBrew.beans.map(b=>b.id==='a'?{...b,name:'A3'}:b)},400);
assert.equal(mergeStates(deleted,revived).beans.find(b=>b.id==='a').name,'A3');
// Unfavoriting syncs too.
const unfav=stampChanges(merged,{...merged,favorites:[]},500);
assert.deepEqual(mergeStates(merged,unfav).favorites,[]);
// Records saved before sync existed (no clock) still merge in, and an empty new device loses nothing.
assert.deepEqual(mergeStates(base,{...base,beans:[bean('old','Old')]}).beans.map(b=>b.id),['old']);
assert.deepEqual(mergeStates({...base,beans:[bean('old','Old')]},base).beans.map(b=>b.id),['old']);
// Merging is stable: merging a result with itself changes nothing.
assert.deepEqual(mergeStates(back,back),back);
console.log('Cloud merge: both-device edits, latest wins, deletions, revivals, favorites, legacy data passed');
// Key order and list order don't count as changes, so two devices never keep re-uploading to each other.
const {sameState}=await import('../lib/cloud-merge.ts');
const shuffled={...back,beans:[...back.beans].reverse().map(b=>({name:b.name,id:b.id})),removed:Object.fromEntries(Object.entries(back.removed).reverse())};
assert.ok(sameState(back,shuffled));
assert.ok(sameState(mergeStates(back,shuffled),back));
assert.ok(!sameState(back,{...back,favorites:['y']}));
