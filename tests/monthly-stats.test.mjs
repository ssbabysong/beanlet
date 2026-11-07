import assert from 'node:assert/strict';
import {annualBrewStats,monthlyBrewStats} from '../lib/monthly-stats.ts';

const stats=monthlyBrewStats([
 {date:'2026-10-01',kind:'pourOver',dose:15,beanId:'a'},
 {date:'2026-10-01',kind:'milk',dose:16,beanId:'b'},
 {date:'2026-10-03',kind:'pourOver',dose:15.5,beanId:'a'},
 {date:'2026-09-30',kind:'milk',dose:20,beanId:'a'},
],2026,10);
assert.equal(stats.records.length,3);
assert.equal(stats.daily.length,31);
assert.deepEqual(stats.daily.slice(0,3).map(day=>day.cups),[2,0,1]);
assert.equal(stats.pourOvers,2);assert.equal(stats.milks,1);assert.equal(stats.totalDose,46.5);
assert.equal(stats.activeDays,2);assert.equal(stats.averagePerActiveDay,1.5);assert.equal(stats.peakDay?.day,1);
assert.deepEqual(stats.beans,[{beanId:'a',count:2},{beanId:'b',count:1}]);
assert.equal(monthlyBrewStats([],2026,2).daily.length,28);
const annual=annualBrewStats([
 {date:'2026-01-01',kind:'pourOver',beanId:'a'},
 {date:'2026-01-01',kind:'milk',beanId:'b'},
 {date:'2026-12-31',kind:'milk',beanId:'a'},
 {date:'2025-12-31',kind:'pourOver',beanId:'a'},
],2026);
assert.equal(annual.records.length,3);assert.equal(annual.days.length,365);assert.equal(annual.months.length,12);
assert.equal(annual.months[0].cups,2);assert.equal(annual.months[11].cups,1);assert.equal(annual.pourOvers,1);assert.equal(annual.milks,2);
assert.deepEqual(annual.beans,[{beanId:'a',count:2},{beanId:'b',count:1}]);
// 探店: café coffees count as cups, sit in their own slice, and rank cafés instead of bags.
const out=monthlyBrewStats([
 {date:'2026-11-02',kind:'pourOver',dose:15,beanId:'a'},
 {date:'2026-11-03',kind:'cafe',beanId:'',place:'Blue Bottle'},
 {date:'2026-11-04',kind:'cafe',beanId:'',place:' blue bottle '},
 {date:'2026-11-05',kind:'cafe',beanId:'',place:'Manner'},
 {date:'2026-11-05',kind:'milk',dose:16,beanId:'a'},
],2026,11);
assert.equal(out.records.length,5);assert.equal(out.pourOvers,1);assert.equal(out.milks,1);assert.equal(out.cafes,3);
assert.deepEqual(out.beans,[{beanId:'a',count:2}]);
assert.deepEqual(out.places,[{place:'Blue Bottle',count:2},{place:'Manner',count:1}]);
assert.equal(out.totalDose,31);
const outYear=annualBrewStats([{date:'2026-01-01',kind:'cafe',beanId:'',place:'Manner'},{date:'2026-02-01',kind:'pourOver',beanId:'a'}],2026);
assert.equal(outYear.cafes,1);assert.equal(outYear.milks,0);assert.deepEqual(outYear.beans,[{beanId:'a',count:1}]);
console.log('Monthly stats: month boundaries, trends, type split, dose, rankings and cafés passed');
