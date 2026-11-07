import {Capacitor} from '@capacitor/core';
import {nativeSticker} from './photo-compress';

function loadImage(source:string){
 return new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('无法读取照片'));image.src=source});
}

export function fileDataUrl(file:File){
 return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('无法读取照片'));reader.readAsDataURL(file)});
}

async function resizedDataUrl(file:File){
 const source=await fileDataUrl(file),image=await loadImage(source),max=1600,scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
 canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);
 return canvas.toDataURL('image/jpeg',.86);
}

export async function makeCoffeeSticker(file:File){
 if(!file.type.startsWith('image/'))throw new Error('请选择一张照片');
 const dataUrl=await resizedDataUrl(file);
 if(Capacitor.getPlatform()==='ios'){
  try{return {photo:(await nativeSticker.cutout({dataUrl})).dataUrl,photoCutout:true}}
  catch(error){throw new Error((error as Error).message||'没有识别到咖啡主体，请换个角度再拍')}
 }
 return {photo:dataUrl,photoCutout:false};
}

// A bag sticker is cut down to the bag itself, so it can stand on the shelf's floor and carry its tags at its own edges.
export async function trimSticker(file:File){
 const {alphaBounds}=await import('./image-bounds');
 const image=await loadImage(await fileDataUrl(file)),canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
 const context=canvas.getContext('2d',{willReadFrequently:true})!;context.drawImage(image,0,0);
 const bounds=alphaBounds(context.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
 if(!bounds||(bounds.width===canvas.width&&bounds.height===canvas.height))return file;
 const pad=4,out=document.createElement('canvas');out.width=bounds.width+pad*2;out.height=bounds.height+pad*2;
 out.getContext('2d')!.drawImage(canvas,bounds.x,bounds.y,bounds.width,bounds.height,pad,pad,bounds.width,bounds.height);
 const blob=await new Promise<Blob>((resolve,reject)=>out.toBlob(b=>b?resolve(b):reject(new Error('照片处理失败')),'image/png'));
 return new File([blob],file.name,{type:'image/png'});
}
