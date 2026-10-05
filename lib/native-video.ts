import {Filesystem,Directory} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';

function blobBase64(blob:Blob){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)})}

export async function shareNativeVideo(blob:Blob,name:string){
 const path=`reels/${name}`,data=await blobBase64(blob),{uri}=await Filesystem.writeFile({path,data,directory:Directory.Cache,recursive:true});
 try{await Share.share({title:'Beanlet Reel',files:[uri]})}
 finally{await Filesystem.deleteFile({path,directory:Directory.Cache}).catch(()=>{})}
}

export async function shareNativeImage(blob:Blob,name:string,title:string){
 const path=`reports/${name}`,data=await blobBase64(blob),{uri}=await Filesystem.writeFile({path,data,directory:Directory.Cache,recursive:true});
 try{await Share.share({title,files:[uri]})}
 finally{await Filesystem.deleteFile({path,directory:Directory.Cache}).catch(()=>{})}
}
