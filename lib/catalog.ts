// Public product facts checked 2026-10-02. Original product art is attributed to Hydrangea Coffee Roasters.
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
export const builtInCatalog=products.map(([handle,name,origin,process,flavor,icon,variety])=>({id:'hydrangea-'+handle,name,origin,process,flavor,icon,variety,roaster:'Hydrangea',roast:'浅烘焙',roastNote:'按品牌浅烘焙定位预填，可按豆袋调整',sourceUrl:'https://hydrangea.coffee/products/'+handle,sourceDate:'2026-10-02',photo:'',roastDate:'',status:'未开封',rating:0,repurchase:false,notes:'',recordType:'catalog',catalogId:''}));

export function originalArt(bean?:{id?:string;catalogId?:string;sourceUrl?:string;icon?:string;useOriginalArt?:boolean}){
 if(!bean)return '';
 const entry=builtInCatalog.find(c=>c.id===bean.id||c.id===bean.catalogId||c.sourceUrl===bean.sourceUrl);
 return entry?'./hydrangea-art/'+entry.id.slice('hydrangea-'.length)+'.webp':'';
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
export const builtInLocales=Object.fromEntries(builtInCatalog.map((bean,i)=>[bean.id,{
 zh:{name:shortNames[bean.id.slice('hydrangea-'.length)]||bean.name,origin:bean.origin,process:bean.process,flavor:bean.flavor},
 en:{name:englishDetails[i][0],origin:englishDetails[i][1],process:englishDetails[i][2],flavor:englishDetails[i][3]},
}]));
type NamedBean={nameEn?:string;id?:string;catalogId?:string;sourceUrl?:string;name?:string;origin?:string;process?:string;flavor?:string};
export function bilingualBean(b?:NamedBean){
 const i=builtInCatalog.findIndex(c=>c.id===b?.id||c.id===b?.catalogId||c.sourceUrl===b?.sourceUrl);
 if(i<0||!b)return {zh:b?.name||'咖啡豆',en:b?.nameEn?.trim()||b?.name||'Coffee',originEn:b?.origin||'',processEn:b?.process||'',flavorEn:b?.flavor||''};
 const c=builtInCatalog[i],local=builtInLocales[c.id],e=[local.en.name,local.en.origin,local.en.process,local.en.flavor],unchanged=b.name===c.name;
 return {zh:unchanged?beanLabel(c):b.name||beanLabel(c),en:b.nameEn!==undefined?(b.nameEn.trim()||b.name||e[0]):unchanged?e[0]:b.name||e[0],originEn:b.origin===c.origin?e[1]:b.origin||'',processEn:b.process===c.process?e[2]:b.process||'',flavorEn:b.flavor===c.flavor?e[3]:b.flavor||''};
}

// Fill the two editable names without altering the catalog identity or details.
export function editableBeanNames(b:NamedBean){const names=bilingualBean(b);return {name:names.zh,nameEn:b.nameEn??(names.en!==names.zh?names.en:'')}}
