import {Filesystem,Directory,Encoding} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
// Share a real file so iOS can save a backup to Files or AirDrop it.
export async function shareNativeBackup(data:string,name:string){
 const {uri}=await Filesystem.writeFile({path:name,data,directory:Directory.Cache,encoding:Encoding.UTF8});
 try{await Share.share({title:'Beanlet backup',files:[uri]})}
 finally{await Filesystem.deleteFile({path:name,directory:Directory.Cache}).catch(()=>{})}
}
