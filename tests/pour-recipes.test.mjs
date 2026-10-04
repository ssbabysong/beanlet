import assert from 'node:assert/strict';
import {pourRecipes,pourPlan,pourStepIndex,timerSeconds,timerText} from '../lib/pour-recipes.ts';
const [basic,kasuya,hoffmann]=pourRecipes;
assert.deepEqual(pourPlan(hoffmann,15).steps.map(s=>s.target),[50,100,150,200,250]);
assert.deepEqual(pourPlan(kasuya,20).steps.map(s=>s.amount),[50,70,60,60,60]);
assert.deepEqual(pourPlan(basic,15).steps.map(s=>s.target),[30,250]);
for(const recipe of pourRecipes)for(const dose of [1,12.5,15,20,60]){const plan=pourPlan(recipe,dose);assert.equal(plan.steps.reduce((n,s)=>n+s.amount,0),plan.total);assert.equal(plan.steps.at(-1).target,plan.total);assert.ok(plan.steps.every(s=>s.amount>0));}
for(const dose of [0,-1,NaN,Infinity,61])assert.throws(()=>pourPlan(basic,dose));
assert.equal(pourStepIndex(hoffmann,44),0);assert.equal(pourStepIndex(hoffmann,45),1);assert.equal(pourStepIndex(hoffmann,110),4);assert.equal(pourStepIndex(hoffmann,1000),4);
assert.equal(timerSeconds(0,1000,61000),60);assert.equal(timerSeconds(45000,null,900000),45);assert.equal(timerSeconds(45000,900000,910000),55);assert.equal(timerText(210),'3:30');
console.log('Pour recipes: source ratios, rounded totals, stage boundaries, invalid doses and elapsed/pause/resume passed');

const three=pourRecipes.find(r=>r.id==='three');
assert.deepEqual(pourPlan(three,15).steps.map(s=>s.target),[30,120,225]);
assert.deepEqual(pourPlan(three,20).steps.map(s=>s.amount),[40,120,140]);
assert.equal(pourStepIndex(three,29),0);assert.equal(pourStepIndex(three,30),1);assert.equal(pourStepIndex(three,60),2);
