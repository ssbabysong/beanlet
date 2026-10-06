// Use catalog identity so every bag and memory of a coffee keeps the same color.
const palettes=[
 ['#dce7f1','#8b9aa4','#c6d5e0'],['#e9dff0','#a297af','#d7cce1'],
 ['#e3e9d7','#939d83','#cfd8bd'],['#f0e6d6','#afa38c','#e1d3bd'],
 ['#e1e9e6','#8eaaa1','#c8d9d3'],['#f1dce0','#b89b9f','#e4c5cd'],
 ['#ebdceb','#ad96b1','#dac5de'],['#f2e0db','#bc9f95','#e6ccc4'],
];
type Coffee={id:string;catalogId?:string;icon?:string};
export type BeanPalette={fill:string;line:string;side:string};
// Match each illustrated flavor with a nearby pouch color. Beans without an icon
// keep the stable identity-based fallback, so photos still receive a consistent color.
const iconPalette:Record<string,number>={
 bag:0,cup:1,dripper:4,flower:6,
 berry:5,blueberry:0,citrus:3,peach:7,grape:6,jasmine:1,
 honey:3,chocolate:3,hazelnut:3,tea:2,brownie:3,cherry:5,cookie:3,
};
export function beanPalette(bean:Coffee):BeanPalette{let hash=0;for(const c of bean.catalogId||bean.id)hash=(Math.imul(hash,31)+c.charCodeAt(0))|0;const index=bean.icon&&iconPalette[bean.icon]!=null?iconPalette[bean.icon]:(hash>>>0)%palettes.length;const [fill,line,side]=palettes[index];return {fill,line,side}}
export function calendarColors<T extends Coffee>(beans:T[],resolve:((bean:T)=>BeanPalette)=beanPalette as (bean:T)=>BeanPalette){const colors=[...new Set(beans.map(b=>resolve(b).fill))];return colors.length<2?colors[0]||'transparent':`linear-gradient(135deg,${colors.map((c,i)=>`${c} ${i/colors.length*100}% ${(i+1)/colors.length*100}%`).join(',')})`}

function mix(rgb:[number,number,number],target:[number,number,number],amount:number){return rgb.map((value,index)=>Math.round(value*(1-amount)+target[index]*amount)) as [number,number,number]}
function hex(rgb:[number,number,number]){return '#'+rgb.map(value=>value.toString(16).padStart(2,'0')).join('')}
export function paletteFromDominantColor(rgb:[number,number,number]):BeanPalette{
 return {fill:hex(mix(rgb,[255,255,255],.7)),side:hex(mix(rgb,[255,255,255],.58)),line:hex(mix(rgb,[82,78,88],.42))};
}

const imagePaletteCache=new Map<string,Promise<BeanPalette|null>>();
export function imagePalette(source:string){
 if(!source||typeof document==='undefined')return Promise.resolve(null);
 const cached=imagePaletteCache.get(source);if(cached)return cached;
 const task=new Promise<BeanPalette|null>(resolve=>{const image=new Image();image.decoding='async';image.crossOrigin='anonymous';image.onload=()=>{try{const canvas=document.createElement('canvas'),size=48;canvas.width=size;canvas.height=size;const context=canvas.getContext('2d',{willReadFrequently:true});if(!context){resolve(null);return}context.drawImage(image,0,0,size,size);const pixels=context.getImageData(0,0,size,size).data,buckets=new Map<number,{count:number;r:number;g:number;b:number}>();for(let i=0;i<pixels.length;i+=4){const alpha=pixels[i+3];if(alpha<96)continue;const r=pixels[i],g=pixels[i+1],b=pixels[i+2],max=Math.max(r,g,b),min=Math.min(r,g,b);if(max>246&&min>238)continue;if(max<24)continue;const weight=alpha/255,key=(r>>4)<<8|(g>>4)<<4|(b>>4),entry=buckets.get(key)||{count:0,r:0,g:0,b:0};entry.count+=weight;entry.r+=r*weight;entry.g+=g*weight;entry.b+=b*weight;buckets.set(key,entry)}const dominant=[...buckets.values()].sort((a,b)=>b.count-a.count)[0];if(!dominant){resolve(null);return}const count=Math.max(1,dominant.count);resolve(paletteFromDominantColor([Math.round(dominant.r/count),Math.round(dominant.g/count),Math.round(dominant.b/count)]))}catch{resolve(null)}};image.onerror=()=>resolve(null);image.src=source});imagePaletteCache.set(source,task);return task;
}
