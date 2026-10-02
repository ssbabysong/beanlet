import assert from 'node:assert/strict';
import {randomBeanName} from '../lib/bean-names.ts';
for(const lang of ['zh','en']){
 const names=[];for(let i=0;i<150;i++)names.push(randomBeanName(lang,names,()=>0));
 assert.equal(new Set(names).size,150);assert.notEqual(randomBeanName(lang,[],()=>0),randomBeanName(lang,[],()=>0.5));
}
assert.match(randomBeanName('en'),/^[A-Za-z ]+$/);
assert.match(randomBeanName('zh'),/[一-鿿]/);
console.log('Bean names: bilingual variety and collision avoidance passed');
