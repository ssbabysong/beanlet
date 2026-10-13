// Every bag gets one of these pouch colors. Users pick it in the editor; new bags start on a random one.
export const bagColors=[
 {name:'雾蓝',fill:'#dce7f1',line:'#8b9aa4',side:'#c6d5e0'},{name:'薰衣草',fill:'#e9dff0',line:'#a297af',side:'#d7cce1'},
 {name:'抹茶',fill:'#e3e9d7',line:'#939d83',side:'#cfd8bd'},{name:'奶茶',fill:'#f0e6d6',line:'#afa38c',side:'#e1d3bd'},
 {name:'薄荷',fill:'#e1e9e6',line:'#8eaaa1',side:'#c8d9d3'},{name:'玫瑰',fill:'#f1dce0',line:'#b89b9f',side:'#e4c5cd'},
 {name:'葡萄',fill:'#ebdceb',line:'#ad96b1',side:'#dac5de'},{name:'蜜桃',fill:'#f2e0db',line:'#bc9f95',side:'#e6ccc4'},
];
type Coffee={id:string;catalogId?:string;icon?:string;photo?:string;bagColor?:number;useOriginalArt?:boolean};
export type BeanPalette={fill:string;line:string;side:string};
// Illustrated flavor stickers default to a nearby pouch color.
const iconPalette:Record<string,number>={
 bag:0,cup:1,dripper:4,flower:6,
 berry:5,blueberry:0,citrus:3,peach:7,grape:6,jasmine:1,
 honey:3,chocolate:3,hazelnut:3,tea:2,brownie:3,cherry:5,cookie:3,
};
export function isBagColor(value:unknown):value is number{return Number.isInteger(value)&&(value as number)>=0&&(value as number)<bagColors.length}
export function randomBagColor(){return Math.floor(Math.random()*bagColors.length)}
// Bags saved before colors were selectable keep a stable default: the sticker's color, or an identity hash for photos and covers.
export function bagColorIndex(bean:Coffee,hasArt=false){
 if(isBagColor(bean.bagColor))return bean.bagColor;
 if(!bean.photo&&!hasArt&&bean.icon&&iconPalette[bean.icon]!=null)return iconPalette[bean.icon];
 let hash=0;for(const c of bean.catalogId||bean.id)hash=(Math.imul(hash,31)+c.charCodeAt(0))|0;
 return (hash>>>0)%bagColors.length;
}
export function beanPalette(bean:Coffee,hasArt=false):BeanPalette{const {fill,line,side}=bagColors[bagColorIndex(bean,hasArt)];return {fill,line,side}}
export function calendarColors<T extends Coffee>(beans:T[],resolve:((bean:T)=>BeanPalette)=beanPalette as (bean:T)=>BeanPalette){const colors=[...new Set(beans.map(b=>resolve(b).fill))];return colors.length<2?colors[0]||'transparent':`linear-gradient(135deg,${colors.map((c,i)=>`${c} ${i/colors.length*100}% ${(i+1)/colors.length*100}%`).join(',')})`}
