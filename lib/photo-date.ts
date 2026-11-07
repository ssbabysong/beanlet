// The day a photo was taken, read from its EXIF (DateTimeOriginal, else DateTime) as 'YYYY-MM-DD'; '' when it has none.
export function exifDate(buffer:ArrayBuffer):string{
 const view=new DataView(buffer);
 if(view.byteLength<4||view.getUint16(0)!==0xFFD8)return '';
 let at=2;
 while(at+4<=view.byteLength){
  const marker=view.getUint16(at),size=view.getUint16(at+2);
  if((marker&0xFF00)!==0xFF00)return '';
  if(marker===0xFFE1&&at+10<=view.byteLength&&view.getUint32(at+4)===0x45786966)return tiffDate(view,at+10);
  if(marker===0xFFDA)return '';
  at+=2+size;
 }
 return '';
}
function tiffDate(view:DataView,tiff:number){
 const little=view.getUint16(tiff)===0x4949,u16=(o:number)=>view.getUint16(o,little),u32=(o:number)=>view.getUint32(o,little);
 const entries=(ifd:number)=>{const out=new Map<number,number>();if(ifd+2>view.byteLength)return out;const count=u16(ifd);for(let i=0;i<count;i++){const e=ifd+2+i*12;if(e+12>view.byteLength)break;out.set(u16(e),e)}return out};
 const text=(entry:number|undefined)=>{if(entry===undefined)return '';const count=u32(entry+4),start=count>4?tiff+u32(entry+8):entry+8;let s='';for(let i=0;i<Math.min(count,20)&&start+i<view.byteLength;i++){const c=view.getUint8(start+i);if(!c)break;s+=String.fromCharCode(c)}return s};
 try{
  const ifd0=entries(tiff+u32(tiff+4)),exifPointer=ifd0.get(0x8769),exif=exifPointer!==undefined?entries(tiff+u32(exifPointer+8)):new Map<number,number>();
  const raw=text(exif.get(0x9003))||text(ifd0.get(0x0132)),match=/^(\d{4}):(\d{2}):(\d{2})/.exec(raw);
  return match&&match[1]!=='0000'?`${match[1]}-${match[2]}-${match[3]}`:'';
 }catch{return ''}
}
export async function photoDate(file:Blob){try{return exifDate(await file.slice(0,256*1024).arrayBuffer())}catch{return ''}}
