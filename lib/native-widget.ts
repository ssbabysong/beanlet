import {Capacitor,registerPlugin} from '@capacitor/core';
import type {WidgetSnapshot} from './widget-snapshot';

type WidgetPlugin={
 update(options:{snapshot:string;thumbs:Record<string,string>}):Promise<{missing:string[]}>;
 addListener(event:'widgetAction',listener:(event:{url:string})=>void):Promise<{remove():Promise<void>}>;
};
const nativeWidget=registerPlugin<WidgetPlugin>('BeanletWidget');
const isIOS=()=>Capacitor.getPlatform()==='ios';

function loadImage(source:string){
 return new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('thumbnail'));image.src=source});
}
// Widgets have a tight memory budget, so covers and photos travel as small PNGs (PNG keeps sticker cutouts transparent).
async function thumbnail(source:string){
 const image=await loadImage(source),size=180,scale=size/Math.max(image.naturalWidth,image.naturalHeight);
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
 canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);
 return canvas.toDataURL('image/png');
}

// The native side keeps thumbnails between launches and reports only the ones it lacks.
export async function syncWidgets({snapshot,thumbs}:{snapshot:WidgetSnapshot;thumbs:Record<string,string>}){
 if(!isIOS())return;
 const data=JSON.stringify(snapshot),{missing}=await nativeWidget.update({snapshot:data,thumbs:{}});
 if(!missing?.length)return;
 const fresh:Record<string,string>={};
 for(const key of missing){
  if(!thumbs[key])continue;
  try{fresh[key]=await thumbnail(thumbs[key])}catch{}
 }
 if(Object.keys(fresh).length)await nativeWidget.update({snapshot:data,thumbs:fresh});
}

// Taps on a widget open beanlet://… links; the native side holds a cold-start link until this listener attaches.
export function onWidgetLink(listener:(url:string)=>void){
 if(!isIOS())return ()=>{};
 const handle=nativeWidget.addListener('widgetAction',event=>listener(event.url));
 return ()=>{handle.then(h=>h.remove()).catch(()=>{})};
}
