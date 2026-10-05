import assert from 'node:assert/strict';
import {brewDraftFor,brewPayload} from '../lib/brew-types.ts';
const old={id:'old',beanId:'bean',date:'2026-10-02',dose:15,water:225,temp:92,time:'2:30',grind:'medium',notes:'',rating:4};
assert.equal(brewDraftFor('pourOver',[old]).water,undefined);
assert.equal(brewDraftFor('milk',[old]).dose,16);
assert.equal(brewPayload({kind:'milk',dose:'',water:225,temp:92,yield:36}).water,undefined);
assert.equal(brewPayload({kind:'milk',dose:'',yield:36}).dose,undefined);
assert.equal(brewPayload({kind:'pourOver',milkAmount:150,water:225}).milkAmount,undefined);
assert.equal(brewDraftFor('milk',[{...old,kind:'milk',yield:36,milkAmount:160}]).milkAmount,undefined);
const sticker='data:image/png;base64,aGVsbG8=';
assert.equal(brewPayload({...old,kind:'pourOver',photo:sticker,photoCutout:true}).photo,sticker);
assert.equal(brewPayload({...old,kind:'pourOver',photo:sticker,photoCutout:true}).photoCutout,true);
assert.equal(brewPayload({...old,kind:'pourOver',photo:'',photoCutout:false}).photo,undefined);
console.log('Recipe defaults and type-specific payloads passed');

assert.equal(brewDraftFor('pourOver',[]).dose,15);
assert.equal(brewDraftFor('milk',[]).dose,16);
assert.equal(brewDraftFor('pourOver',[{...old,dose:22}]).dose,15);
assert.equal(brewDraftFor('milk',[{...old,kind:'milk',dose:20}]).dose,16);
