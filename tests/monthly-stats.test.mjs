import assert from 'node:assert/strict';
import {monthlyBrewStats,monthlyReportText} from '../lib/monthly-stats.ts';

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
assert.equal(monthlyReportText({language:'zh',month:'2026年10月',cups:3,pourOvers:2,milks:1,beanCount:2,topBean:{name:'Letty',count:2}}),'BEANLET · 2026年10月\n3 杯咖啡\n手冲 2 · 奶咖 1\n尝了 2 款豆子\n最常喝：Letty ×2');
assert.equal(monthlyReportText({language:'en',month:'October 2026',cups:0,pourOvers:0,milks:0,beanCount:0}),'BEANLET · October 2026\n0 coffees\n0 pour-over · 0 milk\n0 beans');
console.log('Monthly stats: month boundaries, trends, type split, dose and rankings passed');
