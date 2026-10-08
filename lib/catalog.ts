// Public product facts checked 2026-10-02. Covers are original Beanlet watercolor illustrations.
const products = [
 ['castillo-lulo-washed-finca-santa-monica','Santa Monica · Lulo','哥伦比亚 · Quindio','露露果共发酵水洗','菠萝、露露果、热带水果','citrus','Castillo'],
 ['salma-bermudez','El Paraiso · Salma','哥伦比亚 · Cauca','特殊发酵水洗','芒果、牛奶焦糖、接骨木花','honey','Gesha'],
 ['el-paraiso-peach','El Paraiso · Peach','哥伦比亚 · Cauca','热冲击双重发酵','蜜桃饮料、大黄、樱花','peach','Pink Bourbon'],
 ['el-paraiso-lychee','El Paraiso · Lychee','哥伦比亚 · Cauca','双重厌氧热冲击','桂花、荔枝、果味软糖','jasmine','Castillo'],
 ['letty-bermudez','El Paraiso · Letty','哥伦比亚 · Cauca','双重发酵热冲击','白桃、茉莉奶茶、干玫瑰','peach','Gesha'],
 ['gesha-washed-drd-elida-estate-torre-lot','Elida · Torre','巴拿马 · Chiriqui','水洗 / 暗室干燥','佛手柑、栀子花、荔枝','jasmine','Gesha'],
 ['sl34-sl28-ruiru-11-batian-washed-karinga-aa','Karinga AB','肯尼亚 · Kiambu','水洗','黑莓、西拉葡萄酒、薰衣草','blueberry','SL34 / SL28 / Ruiru 11 / Batian'],
 ['pink-bourbon-washed-finca-el-pedregal','El Pedregal','哥伦比亚 · Inza, Narino','水洗','富士苹果、橙皮、乌龙茶','tea','Pink Bourbon'],
 ['catimor-washed-yi-nian-yi-su-collective','碧野生 · 一念一宿','中国 · 云南德宏','水洗','普洱茶、枸杞、青苹果','tea','Catimor'],
 ['gesha-natural-drd-elida-estate-lot-vuelta','Elida · Vuelta','巴拿马 · Chiriqui','日晒 / 暗室干燥','红木兰、黄油桃、康科德葡萄','grape','Gesha'],
 ['landrace-natural-banko-chelchele','Banko Chelchele','埃塞俄比亚 · Gedeb','日晒','西瓜、黄桃、花香','berry','74112 / 74110'],
 ['caturra-semi-washed-finca-el-sendero','El Sendero','哥伦比亚 · Cauca','半水洗','伯爵茶、热带水果、柠檬草','citrus','Caturra'],
 ['catimor-honey-chichang','高三林 · Gaosanlin','中国 · 云南孟连','厌氧蜜处理','瓦伦西亚橙、杏干、红茶','honey','Catimor'],
 ['finca-potosi-xo','Potosi · XO','哥伦比亚 · Valle del Cauca','XO 日晒','朗姆酒、菠萝、橡木','hazelnut','San Juan'],
];
const catalogDefaults={photo:'',roastDate:'',status:'未开封',rating:0,repurchase:false,notes:'',recordType:'catalog',catalogId:''};
const hydrangeaCatalog=products.map(([handle,name,origin,process,flavor,icon,variety])=>({id:'hydrangea-'+handle,name,origin,process,flavor,icon,variety,roaster:'Hydrangea',roast:'浅烘焙',roastNote:'按品牌浅烘焙定位预填，可按豆袋调整',sourceUrl:'https://hydrangea.coffee/products/'+handle,sourceDate:'2026-10-02',...catalogDefaults}));
const americanProducts=[
 {id:'onyx-monarch',name:'Monarch',roaster:'Onyx Coffee Lab',origin:'产地随季节调整',process:'季节性拼配',flavor:'黑巧克力、糖蜜、红酒、莓果',icon:'chocolate',variety:'Blend',roast:'深烘焙',sourceUrl:'https://onyxcoffeelab.com/products/monarch',en:{origin:'Seasonal origins',process:'Seasonal blend',flavor:'Dark chocolate, molasses, red wine, dried berries'}},
 {id:'onyx-geometry',name:'Geometry',roaster:'Onyx Coffee Lab',origin:'产地随季节调整',process:'季节性拼配',flavor:'莓果、核果、伯爵茶、金银花',icon:'jasmine',variety:'Blend',roast:'浅烘焙',sourceUrl:'https://onyxcoffeelab.com/products/geometry',en:{origin:'Seasonal origins',process:'Seasonal blend',flavor:'Berries, stone fruit, Earl Grey, honeysuckle'}},
 {id:'onyx-tropical-weather',name:'Tropical Weather',roaster:'Onyx Coffee Lab',origin:'埃塞俄比亚',process:'水洗与日晒拼配',flavor:'混合莓果、甜茶、蜂蜜、李子',icon:'berry',variety:'Blend',roast:'浅烘焙',sourceUrl:'https://onyxcoffeelab.com/products/tropical-weather',en:{origin:'Ethiopia',process:'Washed and natural blend',flavor:'Mixed berries, sweet tea, raw honey, plum'}},
 {id:'onyx-southern-weather',name:'Southern Weather',roaster:'Onyx Coffee Lab',origin:'洪都拉斯、哥伦比亚、埃塞俄比亚',process:'水洗拼配',flavor:'牛奶巧克力、李子、糖渍核桃、柑橘',icon:'chocolate',variety:'Blend',roast:'中烘焙',sourceUrl:'https://onyxcoffeelab.com/products/southern-weather',en:{origin:'Honduras, Colombia, Ethiopia',process:'Washed blend',flavor:'Milk chocolate, plum, candied walnuts, citrus'}},
 {id:'black-white-the-natural',name:'The Natural',roaster:'Black & White Coffee Roasters',origin:'产地随季节调整',process:'日晒拼配',flavor:'明亮红色水果、浓郁果香',icon:'berry',variety:'Blend',roast:'中烘焙',sourceUrl:'https://www.blackwhiteroasters.com/products/the-natural',en:{origin:'Seasonal origins',process:'Natural blend',flavor:'Vibrant red fruit, bold fruit character'}},
 {id:'black-white-the-classic',name:'The Classic',roaster:'Black & White Coffee Roasters',origin:'哥伦比亚与中美洲',process:'水洗拼配',flavor:'牛奶巧克力、甜焦糖',icon:'chocolate',variety:'Blend',roast:'中烘焙',sourceUrl:'https://www.blackwhiteroasters.com/products/the-classic',en:{origin:'Colombia and Central America',process:'Washed blend',flavor:'Milk chocolate, sweet caramel'}},
 {id:'black-white-the-original',name:'The Original',roaster:'Black & White Coffee Roasters',origin:'埃塞俄比亚',process:'季节性拼配',flavor:'明亮柑橘、花香',icon:'citrus',variety:'Blend',roast:'浅烘焙',sourceUrl:'https://www.blackwhiteroasters.com/products/the-original-1',en:{origin:'Ethiopia',process:'Seasonal blend',flavor:'Bright citrus, floral'}},
 {id:'black-white-the-traditional',name:'The Traditional',roaster:'Black & White Coffee Roasters',origin:'哥伦比亚',process:'水洗',flavor:'黑巧克力、樱桃、杏仁糖',icon:'chocolate',variety:'Blend',roast:'深烘焙',sourceUrl:'https://www.blackwhiteroasters.com/products/the-traditional-1',en:{origin:'Colombia',process:'Washed',flavor:'Dark chocolate, cherry, marzipan'}},
 {id:'black-white-sugarcane-decaf',name:'Sugarcane Decaf',roaster:'Black & White Coffee Roasters',origin:'产地随季节调整',process:'甘蔗 EA 脱咖啡因',flavor:'焦糖、牛奶巧克力、均衡',icon:'chocolate',variety:'Seasonal',roast:'中深烘焙',sourceUrl:'https://www.blackwhiteroasters.com/products/r-decaf-colombia',en:{origin:'Seasonal origins',process:'Sugarcane EA decaf',flavor:'Caramel, milk chocolate, balanced'}},
 {id:'black-white-new-school-strawberry',name:'The New School · Strawberry',roaster:'Black & White Coffee Roasters',origin:'埃塞俄比亚与哥伦比亚',process:'水洗与草莓共发酵拼配',flavor:'草莓果酱、菠萝罐头、牛奶巧克力',icon:'berry',variety:'Blend',roast:'中烘焙',sourceUrl:'https://www.blackwhiteroasters.com/products/r-the-new-school-strawberry',en:{origin:'Ethiopia and Colombia',process:'Washed and strawberry co-ferment blend',flavor:'Strawberry jam, canned pineapple, milk chocolate'}},
 {id:'heart-stereo',name:'Stereo Seasonal Blend',roaster:'Heart Coffee Roasters',origin:'危地马拉与埃塞俄比亚',process:'季节性拼配',flavor:'樱桃、甜奶油、软糖',icon:'berry',variety:'Blend',roast:'中浅烘焙',sourceUrl:'https://www.heartroasters.com/collections/beans/products/stereo-seasonal-blend',en:{origin:'Guatemala and Ethiopia',process:'Seasonal blend',flavor:'Cherry, sweet cream, fudge'}},
 {id:'heart-phono',name:'Phono',roaster:'Heart Coffee Roasters',origin:'产地随季节调整',process:'轮换单一产地',flavor:'柑橘、黑巧克力、苹果花',icon:'citrus',variety:'Seasonal',roast:'中浅烘焙',sourceUrl:'https://www.heartroasters.com/products/phono',en:{origin:'Seasonal single origin',process:'Rotating single origin',flavor:'Mandarin, dark chocolate, apple blossom'}},
 {id:'heart-colombia-decaf',name:'Colombia Decaf',roaster:'Heart Coffee Roasters',origin:'哥伦比亚 · San Agustín',process:'脱咖啡因',flavor:'无花果、牛奶巧克力、太妃糖',icon:'chocolate',variety:'Seasonal',roast:'中浅烘焙',sourceUrl:'https://www.heartroasters.com/products/colombia-decaf',en:{origin:'Colombia · San Agustín',process:'Decaffeinated',flavor:'Fig, milk chocolate, toffee'}},
 {id:'counter-culture-apollo',name:'Apollo',roaster:'Counter Culture Coffee',origin:'埃塞俄比亚',process:'水洗拼配',flavor:'柑橘、花香、丝滑',icon:'citrus',variety:'Blend',roast:'浅烘焙',sourceUrl:'https://counterculturecoffee.com/products/apollo',en:{origin:'Ethiopia',process:'Washed blend',flavor:'Citrus, floral, silky'}},
 {id:'counter-culture-hologram',name:'Hologram',roaster:'Counter Culture Coffee',origin:'产地随季节调整',process:'季节性拼配',flavor:'水果、牛奶巧克力、糖浆感',icon:'chocolate',variety:'Blend',roast:'中烘焙',sourceUrl:'https://counterculturecoffee.com/collections/coffee/products/12-oz-hologram',en:{origin:'Seasonal origins',process:'Seasonal blend',flavor:'Fruity, milk chocolate, syrupy'}},
 {id:'counter-culture-big-trouble',name:'Big Trouble',roaster:'Counter Culture Coffee',origin:'产地随季节调整',process:'水洗拼配',flavor:'焦糖、坚果、圆润',icon:'hazelnut',variety:'Blend',roast:'中深烘焙',sourceUrl:'https://counterculturecoffee.com/collections/coffee/products/big-trouble',en:{origin:'Seasonal origins',process:'Washed blend',flavor:'Caramel, nutty, round'}},
 {id:'counter-culture-forty-six',name:'Forty-Six',roaster:'Counter Culture Coffee',origin:'产地随季节调整',process:'水洗与日晒拼配',flavor:'黑巧克力、甜感、醇厚',icon:'chocolate',variety:'Blend',roast:'深烘焙',sourceUrl:'https://counterculturecoffee.com/collections/coffee/products/12-oz-forty-six',en:{origin:'Seasonal origins',process:'Washed and natural blend',flavor:'Dark chocolate, sweet, full-bodied'}},
 {id:'counter-culture-gradient',name:'Gradient',roaster:'Counter Culture Coffee',origin:'哥伦比亚',process:'水洗拼配',flavor:'黑巧克力、烘烤坚果、莓果',icon:'chocolate',variety:'Blend',roast:'深烘焙',sourceUrl:'https://counterculturecoffee.com/collections/blends/products/12-oz-gradient',en:{origin:'Colombia',process:'Washed blend',flavor:'Dark chocolate, roasted nuts, berry'}},
 {id:'counter-culture-fast-forward',name:'Fast Forward',roaster:'Counter Culture Coffee',origin:'拉丁美洲与非洲',process:'季节性拼配',flavor:'坚果、甜感、奶油感',icon:'hazelnut',variety:'Blend',roast:'中烘焙',sourceUrl:'https://counterculturecoffee.com/products/fast-forward-12oz-bag',en:{origin:'Latin America and Africa',process:'Seasonal blend',flavor:'Nutty, sweet, creamy'}},
 {id:'counter-culture-slow-motion',name:'Slow Motion · Decaf',roaster:'Counter Culture Coffee',origin:'拉丁美洲',process:'瑞士水处理脱咖啡因',flavor:'糖蜜、可可、顺滑',icon:'chocolate',variety:'Blend',roast:'中烘焙',sourceUrl:'https://counterculturecoffee.com/products/12-oz-slow-motion',en:{origin:'Latin America',process:'Swiss Water decaf',flavor:'Molasses, cocoa, smooth'}},
 {id:'counter-culture-even-keel',name:'Even Keel · Half-Caff',roaster:'Counter Culture Coffee',origin:'产地随季节调整',process:'半咖啡因水洗拼配',flavor:'全麦饼干、糖蜜、柔和',icon:'cookie',variety:'Blend',roast:'中深烘焙',sourceUrl:'https://counterculturecoffee.com/products/even-keel',en:{origin:'Seasonal origins',process:'Washed half-caff blend',flavor:'Graham cracker, molasses, soft'}},
 {id:'george-howell-dota',name:'Dota',roaster:'George Howell Coffee',origin:'哥斯达黎加 · Dota',process:'水洗',flavor:'牛奶巧克力、樱桃、橙子',icon:'chocolate',variety:'Traditional',roast:'浅烘焙',sourceUrl:'https://georgehowellcoffee.com/products/dota-costa-rica',en:{origin:'Costa Rica · Dota',process:'Washed',flavor:'Milk chocolate, cherry, orange'}},
 {id:'george-howell-alchemy',name:'Alchemy Espresso',roaster:'George Howell Coffee',origin:'非洲、南美洲与中美洲',process:'水洗与日晒拼配',flavor:'黑巧克力布朗尼、深色焦糖、覆盆子果酱、牛轧糖',icon:'brownie',variety:'Traditional',roast:'中深烘焙',sourceUrl:'https://georgehowellcoffee.com/products/alchemy-espresso-alc-001',en:{origin:'Africa, South America, Central America',process:'Washed and natural blend',flavor:'Dark chocolate brownie, dark caramel, raspberry jam, nougat'}},
 {id:'george-howell-dota-medium',name:'Dota Medium',roaster:'George Howell Coffee',origin:'哥斯达黎加 · Dota',process:'水洗',flavor:'半甜巧克力、黑樱桃、橙子',icon:'chocolate',variety:'Caturra & Catuai',roast:'中烘焙',sourceUrl:'https://georgehowellcoffee.com/products/dota-medium-costa-rica',en:{origin:'Costa Rica · Dota',process:'Washed',flavor:'Semi-sweet chocolate, dark cherry, orange'}},
 {id:'george-howell-dota-dark',name:'Dota Dark',roaster:'George Howell Coffee',origin:'哥斯达黎加 · Dota',process:'水洗',flavor:'黑巧克力、焦糖、核桃',icon:'chocolate',variety:'Caturra & Catuai',roast:'深烘焙',sourceUrl:'https://georgehowellcoffee.com/products/dota-dark',en:{origin:'Costa Rica · Dota',process:'Washed',flavor:'Dark chocolate, caramel, walnut'}},
 {id:'george-howell-la-minita',name:'La Minita',roaster:'George Howell Coffee',origin:'哥斯达黎加 · Frailes',process:'水洗',flavor:'枫糖浆、橙子、牛奶巧克力',icon:'chocolate',variety:'Caturra',roast:'浅烘焙',sourceUrl:'https://georgehowellcoffee.com/products/la-minute-costa-rica',en:{origin:'Costa Rica · Frailes',process:'Washed',flavor:'Maple syrup, orange, milk chocolate'}},
].map(product=>({...product,sourceDate:'2026-10-06',roastNote:'按品牌定位预填，可按豆袋调整',...catalogDefaults}));
export const builtInCatalog=[...hydrangeaCatalog,...americanProducts.map(({en,...product})=>product)];

export function originalArt(bean?:{id?:string;catalogId?:string;sourceUrl?:string;icon?:string;useOriginalArt?:boolean}){
 if(!bean)return '';
 const entry=builtInCatalog.find(c=>c.id===bean.id||c.id===bean.catalogId||c.sourceUrl===bean.sourceUrl);
 return entry?'./watercolor-art/'+entry.id+'.jpg':'';
}
export function displayedArt(bean?:{id?:string;catalogId?:string;sourceUrl?:string;icon?:string;useOriginalArt?:boolean}){
 if(!bean||bean.useOriginalArt===false)return '';
 const entry=builtInCatalog.find(c=>c.id===bean.id||c.id===bean.catalogId||c.sourceUrl===bean.sourceUrl);
 // Preserve previously customized icons; otherwise upgrade old catalog imports automatically.
 return entry&&(bean.useOriginalArt===true||!bean.icon||bean.icon===entry.icon)?originalArt(bean):'';
}

// Short Chinese display names; retain the original product names for search and details.
const shortNames:Record<string,string>={
 'castillo-lulo-washed-finca-santa-monica':'圣莫妮卡 · 露露果',
 'salma-bermudez':'天堂庄园 · 萨尔玛',
 'el-paraiso-peach':'天堂庄园 · 蜜桃',
 'el-paraiso-lychee':'天堂庄园 · 荔枝',
 'letty-bermudez':'天堂庄园 · 蕾蒂',
 'gesha-washed-drd-elida-estate-torre-lot':'艾利达 · 托雷',
 'sl34-sl28-ruiru-11-batian-washed-karinga-aa':'卡林加 AB',
 'pink-bourbon-washed-finca-el-pedregal':'石头庄园 · 粉波旁',
 'catimor-washed-yi-nian-yi-su-collective':'碧野生 · 一念一宿',
 'gesha-natural-drd-elida-estate-lot-vuelta':'艾利达 · 薇尔塔',
 'landrace-natural-banko-chelchele':'班可 · 切尔切勒',
 'caturra-semi-washed-finca-el-sendero':'小径庄园 · 卡杜拉',
 'catimor-honey-chichang':'高三林 · 蜜处理',
 'finca-potosi-xo':'波托西 · XO',
};
export function beanLabel(bean?:{id?:string;catalogId?:string;sourceUrl?:string;name?:string}){
 if(!bean)return '咖啡豆';
 const entry=builtInCatalog.find(c=>c.id===bean.id||c.id===bean.catalogId||c.sourceUrl===bean.sourceUrl);
 return entry&&bean.name===entry.name?(shortNames[entry.id.slice('hydrangea-'.length)]||bean.name):bean.name||'咖啡豆';
}
const englishDetails=[
 ['Santa Monica · Lulo','Colombia · Quindio','Lulo co-fermented, washed','Pineapple, lulo, tropical fruit'],
 ['El Paraiso · Salma','Colombia · Cauca','Special fermentation, washed','Mango, dulce de leche, elderflower'],
 ['El Paraiso · Peach','Colombia · Cauca','Thermal shock, two-stage fermentation','Peach drink, rhubarb, sakura'],
 ['El Paraiso · Lychee','Colombia · Cauca','Double anaerobic thermal shock','Osmanthus, lychee, fruit gummies'],
 ['El Paraiso · Letty','Colombia · Cauca','Double fermentation thermal shock','White peach, jasmine milk tea, dried rose'],
 ['Elida · Torre','Panama · Chiriqui','Washed, dark room drying','Bergamot, gardenia, lychee'],
 ['Karinga AB','Kenya · Kiambu','Washed','Blackberry, Syrah, lavender'],
 ['El Pedregal','Colombia · Inza, Narino','Washed','Fuji apple, orange zest, oolong'],
 ['Biyesheng · Yi Nian Yi Su','China · Dehong, Yunnan','Washed','Pu’er, goji, green apple'],
 ['Elida · Vuelta','Panama · Chiriqui','Natural, dark room drying','Red magnolia, yellow nectarine, Concord grape'],
 ['Banko Chelchele','Ethiopia · Gedeb','Natural','Watermelon, yellow peach, floral'],
 ['El Sendero','Colombia · Cauca','Semi-washed','Earl Grey, tropical fruit, lemongrass'],
 ['Gaosanlin · Anaerobic Honey','China · Menglian, Yunnan','Anaerobic honey','Valencia orange, dried apricot, black tea'],
 ['Potosi · XO','Colombia · Valle del Cauca','XO natural','Rum, pineapple, oak'],
];
// Bundled bilingual product text: works offline and switches without translation requests.
export const builtInLocales=Object.fromEntries([
 ...hydrangeaCatalog.map((bean,i)=>[bean.id,{zh:{name:englishDetails[i][0],origin:englishDetails[i][1],process:englishDetails[i][2],flavor:englishDetails[i][3]},en:{name:englishDetails[i][0],origin:englishDetails[i][1],process:englishDetails[i][2],flavor:englishDetails[i][3]}}]),
 ...americanProducts.map(bean=>[bean.id,{zh:{name:bean.name,origin:bean.origin,process:bean.process,flavor:bean.flavor},en:{name:bean.name,...bean.en}}]),
]);
type NamedBean={roaster?:string;nameEn?:string;id?:string;catalogId?:string;sourceUrl?:string;name?:string;origin?:string;process?:string;flavor?:string};
function localizedBean(b?:NamedBean){
 const i=builtInCatalog.findIndex(c=>c.id===b?.id||c.id===b?.catalogId||c.sourceUrl===b?.sourceUrl);
 if(i<0||!b)return {zh:b?.name||'咖啡豆',en:b?.nameEn?.trim()||b?.name||'Coffee',originEn:b?.origin||'',processEn:b?.process||'',flavorEn:b?.flavor||''};
 const c=builtInCatalog[i],local=builtInLocales[c.id],e=[local.en.name,local.en.origin,local.en.process,local.en.flavor],unchanged=b.name===c.name||b.name===shortNames[c.id.slice('hydrangea-'.length)];
 return {zh:unchanged?beanLabel(c):b.name||beanLabel(c),en:b.nameEn?.trim()||(unchanged?e[0]:b.name||e[0]),originEn:b.origin===c.origin?e[1]:b.origin||'',processEn:b.process===c.process?e[2]:b.process||'',flavorEn:b.flavor===c.flavor?e[3]:b.flavor||''};
}

export function usesOriginalBeanName(b?:NamedBean){
 return !!b && (/^hydrangea$/i.test(b.roaster?.trim()||'') || hydrangeaCatalog.some(c=>c.id===b.id||c.id===b.catalogId||c.sourceUrl===b.sourceUrl));
}
export function bilingualBean(b?:NamedBean){
 const names=localizedBean(b);
 return usesOriginalBeanName(b)?{...names,zh:names.en}:names;
}

// Fill the two editable names without altering the catalog identity or details.
export function editableBeanNames(b:NamedBean){const names=bilingualBean(b);if(usesOriginalBeanName(b))return {name:names.en,nameEn:names.en};return {name:names.zh,nameEn:b.nameEn??(names.en!==names.zh?names.en:'')}}

// Hydrangea product facts retain their English wording in either interface language.
export function beanInfo(b:NamedBean|undefined,key:'origin'|'process'|'flavor',language:'zh'|'en'){
 return language==='en'||usesOriginalBeanName(b)?bilingualBean(b)[`${key}En`]:b?.[key]||'';
}
export function editableBeanInfo(b:NamedBean){
 return usesOriginalBeanName(b)?{origin:beanInfo(b,'origin','en'),process:beanInfo(b,'process','en'),flavor:beanInfo(b,'flavor','en')}:{};
}
