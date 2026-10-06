import assert from 'node:assert/strict';
import {countryOf,processOf,matchesFilters,emptyFilters} from '../lib/catalog-filters.ts';
import {builtInCatalog,bilingualBean,originalArt} from '../lib/catalog.ts';
assert.equal(countryOf('China · Yunnan'),'中国');
assert.equal(countryOf('中国 · 云南'),'中国');
assert.equal(countryOf(''),'未记录');
assert.equal(processOf('Anaerobic honey'),'蜜处理');
assert.equal(processOf('Double anaerobic thermal shock'),'发酵处理');
assert.equal(processOf('Natural, dark room drying'),'日晒');
assert.equal(builtInCatalog.filter(b=>matchesFilters(b,emptyFilters)).length,24);
const filtered=builtInCatalog.filter(b=>matchesFilters(b,{brand:'Hydrangea',roast:'浅烘焙',origin:'中国',process:'蜜处理'}));
assert.equal(filtered.length,1);
assert.match(bilingualBean(filtered[0]).en,/Gaosanlin/);
assert.equal(builtInCatalog.filter(b=>matchesFilters(b,{...emptyFilters,origin:'中国',process:'日晒'})).length,0);
const custom={roaster:'My roaster',roast:'深烘焙',origin:'Brazil',process:'Natural'};
assert.ok(matchesFilters(custom,{brand:'My roaster',roast:'深烘焙',origin:'Brazil',process:'日晒'}));
assert.ok(!matchesFilters(custom,{...emptyFilters,brand:'Hydrangea'}));
for(const b of builtInCatalog){const names=bilingualBean(b);assert.equal(names.zh,names.en);assert.ok(names.originEn);assert.ok(names.processEn);assert.ok(names.flavorEn)}
assert.equal(builtInCatalog.filter(b=>b.roaster==='Onyx Coffee Lab').length,3);
assert.equal(builtInCatalog.filter(b=>b.roaster==='Black & White Coffee Roasters').length,3);
for(const b of builtInCatalog)assert.ok(originalArt(b),`${b.name} should have bundled official art`);
assert.equal(originalArt(builtInCatalog.find(b=>b.id==='onyx-monarch')),'./american-art/onyx-monarch.png');
assert.equal(bilingualBean({...builtInCatalog[0],name:'我的自定义名'}).en,'我的自定义名');
console.log('Catalog: bilingual names, custom names, combined filters, reset, empty results passed');

const {editableBeanNames}=await import('../lib/catalog.ts');
const letty=builtInCatalog.find(b=>b.name==='El Paraiso · Letty');
assert.deepEqual(editableBeanNames(letty),{name:'El Paraiso · Letty',nameEn:'El Paraiso · Letty'});
assert.equal(bilingualBean({name:'我的豆子',nameEn:'My coffee'}).en,'My coffee');
assert.equal(bilingualBean({name:'我的豆子',nameEn:''}).en,'我的豆子');
assert.equal(bilingualBean({...letty,...editableBeanNames(letty)}).zh,'El Paraiso · Letty');
assert.equal(bilingualBean({...letty,...editableBeanNames(letty)}).en,'El Paraiso · Letty');
assert.equal(bilingualBean({...letty,...editableBeanNames(letty),name:'自定义中文'}).en,'El Paraiso · Letty');

const {builtInLocales}=await import('../lib/catalog.ts');
assert.equal(Object.keys(builtInLocales).length,builtInCatalog.length);
for(const b of builtInCatalog){
 const local=builtInLocales[b.id];
 for(const language of ['zh','en'])for(const field of ['name','origin','process','flavor'])assert.ok(local[language][field]);
 const names=bilingualBean(b);assert.equal(names.zh,local.zh.name);assert.equal(names.en,local.en.name);assert.equal(names.flavorEn,local.en.flavor);
}
console.log('Built-in bilingual names and flavor text complete for every coffee');

assert.equal(bilingualBean({...letty,name:'天堂庄园 · 蕾蒂',nameEn:'El Paraiso · Letty'}).zh,'El Paraiso · Letty');
assert.equal(bilingualBean({roaster:'Hydrangea',name:'中文旧名',nameEn:'Original Name'}).zh,'Original Name');
assert.equal(bilingualBean({roaster:'Other',name:'中文名称',nameEn:'English Name'}).zh,'中文名称');

assert.equal(bilingualBean({...letty,name:'天堂庄园 · 蕾蒂',nameEn:''}).zh,'El Paraiso · Letty');

const {beanInfo,editableBeanInfo}=await import('../lib/catalog.ts');
for(const b of builtInCatalog){
 for(const key of ['origin','process','flavor'])assert.equal(beanInfo(b,key,'zh'),builtInLocales[b.id][b.roaster==='Hydrangea'?'en':'zh'][key]);
 if(b.roaster==='Hydrangea')assert.equal(editableBeanInfo(b).flavor,builtInLocales[b.id].en.flavor);
 else assert.deepEqual(editableBeanInfo(b),{});
}
assert.equal(beanInfo({...letty,flavor:'Custom tasting notes'},'flavor','zh'),'Custom tasting notes');
assert.equal(beanInfo({roaster:'Other',flavor:'茉莉'},'flavor','zh'),'茉莉');
