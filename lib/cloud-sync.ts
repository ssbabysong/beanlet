import {Capacitor,registerPlugin} from '@capacitor/core';
import {mergeCloud,setChangeListener} from './local-store';
// Keeps the journal in the app's private iCloud container: pull and merge on launch, on return to the app and
// every minute; push shortly after each local save.
type CloudPlugin={read():Promise<{available:boolean;contents?:string[]}>;write(options:{contents:string}):Promise<{available:boolean}>};
const cloud=registerPlugin<CloudPlugin>('BeanletCloud');
export type CloudStatus='off'|'syncing'|'synced'|'unavailable'|'error';
export const cloudChangedEvent='beanlet-cloud-changed';
let status:CloudStatus='off',syncedAt=0,running:Promise<void>|null=null,again=false,timer=0,started=false;
const listeners=new Set<()=>void>();
function set(next:CloudStatus){status=next;listeners.forEach(fn=>fn())}
export function cloudStatus(){return {status,syncedAt}}
export function onCloudStatus(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn)}}
export function cloudSyncSupported(){return Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='ios'}
export function syncNow():Promise<void>{
 if(!cloudSyncSupported())return Promise.resolve();
 if(running){again=true;return running}
 running=(async()=>{do{again=false;set('syncing');try{
  const remote=await cloud.read();if(!remote.available){set('unavailable');return}
  const result=await mergeCloud(remote.contents||[]);
  if(result.changed)window.dispatchEvent(new Event(cloudChangedEvent));
  if(result.contents)await cloud.write({contents:result.contents});
  syncedAt=Date.now();set('synced');
 }catch{set('error')}}while(again)})().finally(()=>{running=null});
 return running;
}
export function startCloudSync(){
 if(started||!cloudSyncSupported())return;started=true;
 setChangeListener(()=>{window.clearTimeout(timer);timer=window.setTimeout(syncNow,1500)});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')syncNow()});
 window.setInterval(()=>{if(document.visibilityState==='visible')syncNow()},60_000);
 syncNow();
}
