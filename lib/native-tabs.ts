import {Capacitor,registerPlugin} from '@capacitor/core';

type BarItem={id:string;symbol:string;title:string;icon?:string;prominent?:boolean;disabled?:boolean};
type NativeTabsPlugin={
 set(options:{active?:string;language?:string;overlay?:boolean;titles?:Record<string,string>;icons?:Record<string,{off:string;on:string}>}):Promise<void>;
 bar(options:{items:BarItem[];back?:{title:string;disabled?:boolean}}):Promise<void>;
 addListener(event:'select',listener:(event:{key:string})=>void):Promise<{remove():Promise<void>}>;
 addListener(event:'tap',listener:(event:{id:string})=>void):Promise<{remove():Promise<void>}>;
};
const plugin=registerPlugin<NativeTabsPlugin>('NativeTabs');

// Only the iOS app has the system tab bar; the browser keeps the web-drawn capsule.
// Local dev server only: ?native-preview lays the page out as the app does, for checking app-only layouts in a browser.
const nativePreview=()=>!!(import.meta as {env?:{DEV?:boolean}}).env?.DEV&&typeof location!=='undefined'&&new URLSearchParams(location.search).has('native-preview');
export const hasNativeTabs=()=>Capacitor.getPlatform()==='ios'&&Capacitor.isPluginAvailable('NativeTabs')||nativePreview();

function loadImage(source:string){
 return new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('icon'));image.src=source});
}
const png=(canvas:HTMLCanvasElement)=>canvas.toDataURL('image/png').split(',')[1];

// Tab icons are the same stickers as the web menu, cut from the 2×2 sprite at @3x (27pt).
const spriteCells:Record<string,[number,number]>={beans:[0,0],brews:[1,0],catalog:[1,1]};
let tabIcons:Promise<Record<string,{off:string;on:string}>>|null=null;
function stickerIcons(){
 return tabIcons??=loadImage('./coffee-stickers.png').then(sheet=>{
  // Each sticker has a wide margin in its cell; crop it so the icon fills the tab like a system symbol.
  const cell=sheet.naturalWidth/2,size=81,inset=.1,out:Record<string,{off:string;on:string}>={};
  for(const [key,[col,row]] of Object.entries(spriteCells)){
   const draw=(alpha:number,tilt:number)=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d')!;ctx.globalAlpha=alpha;ctx.translate(size/2,size/2);ctx.rotate(tilt);ctx.drawImage(sheet,(col+inset)*cell,(row+inset)*cell,cell*(1-2*inset),cell*(1-2*inset),-size/2,-size/2,size,size);return png(canvas)};
   out[key]={off:draw(.6,0),on:draw(1,-7*Math.PI/180)};
  }
  return out;
 });
}

// The 「我的」 blob from the web header, drawn in its own colours.
const meSvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="M9 29C4 23 6 12 13 7c8-5 19-1 21 8 3 9-4 19-13 20-5 0-9-2-12-6Z" fill="#e4e9d8"/><path d="M21 11c-6 1-9 8-6 12 3 4 9 2 10-3 1-4 0-8-4-9Z" fill="#baa5ce"/><path d="M21 13c-4 3 1 6-3 10M11 30c2-5 13-6 17-1" fill="none" stroke="#686b60" stroke-width="1.7" stroke-linecap="round"/></svg>`;
let meIcon:Promise<string>|null=null;
function personalIcon(){
 return meIcon??=loadImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(meSvg)).then(image=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=84;canvas.getContext('2d')!.drawImage(image,0,0,84,84);return png(canvas)});
}

let sentIcons=false;
export async function syncNativeTabs(state:{active:string;language:string;overlay:boolean;titles:Record<string,string>}){
 if(!hasNativeTabs()||nativePreview())return;
 const icons=sentIcons?undefined:await stickerIcons().catch(()=>undefined);
 await plugin.set({...state,icons});
 if(icons)sentIcons=true;
}

export async function syncNativeBar(items:(BarItem&{me?:boolean})[],back?:{title:string;disabled?:boolean}){
 if(!hasNativeTabs()||nativePreview())return;
 const withIcons=await Promise.all(items.map(async({me,...item})=>me?{...item,icon:await personalIcon().catch(()=>undefined)}:item));
 await plugin.bar({items:withIcons,back});
}

export function onNativeTabs(onSelect:(key:string)=>void,onTap:(id:string)=>void){
 if(!hasNativeTabs()||nativePreview())return ()=>{};
 const handles=[plugin.addListener('select',e=>onSelect(e.key)),plugin.addListener('tap',e=>onTap(e.id))];
 return ()=>{handles.forEach(h=>h.then(x=>x.remove()).catch(()=>{}))};
}
