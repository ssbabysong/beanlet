import {Capacitor,registerPlugin} from '@capacitor/core';
// Photos travel to iCloud inside each record, so they're kept small. On iPhone they become HEIC, which keeps a
// sticker's transparency at a fraction of a PNG's size; elsewhere stickers stay PNG and plain photos become JPEG.
type StickerPlugin={cutout(options:{dataUrl:string}):Promise<{dataUrl:string}>;compress(options:{dataUrl:string;maxSide:number}):Promise<{dataUrl:string}>};
export const nativeSticker=registerPlugin<StickerPlugin>('BeanletSticker');
export const stickerSize=768,photoSize=1024;

function loadImage(source:string){
 return new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('无法读取照片'));image.src=source});
}

/** HEIC from the system encoder, used only once this web view has shown it can draw the result. */
async function nativeCompact(source:string,maxSide:number){
 if(Capacitor.getPlatform()!=='ios')return;
 try{const {dataUrl}=await nativeSticker.compress({dataUrl:source,maxSide});const image=await loadImage(dataUrl);return image.naturalWidth?dataUrl:undefined}catch{return}
}

/** A smaller copy of a photo, or the original when that is already as small. */
export async function compactPhoto(source:string,cutout:boolean){
 const max=cutout?stickerSize:photoSize,native=await nativeCompact(source,max);
 if(native)return native.length<source.length?native:source;
 const image=await loadImage(source),scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
 const ctx=canvas.getContext('2d')!;if(!cutout){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height)}
 ctx.drawImage(image,0,0,canvas.width,canvas.height);
 const smaller=canvas.toDataURL(cutout?'image/png':'image/jpeg',.8);
 return smaller.length<source.length?smaller:source;
}

/** The photo editor's output, compressed the same way before it's saved. */
export async function compactPhotoFile(file:File,cutout:boolean){
 const source=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('无法读取照片'));r.readAsDataURL(file)});
 const photo=await compactPhoto(source,cutout);if(photo===source)return file;
 const type=photo.slice(5,photo.indexOf(';'));
 return new File([await (await fetch(photo)).blob()],file.name.replace(/\.\w+$/,'.'+type.slice(6)),{type});
}
