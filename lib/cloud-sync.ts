import {Capacitor,registerPlugin,type PluginListenerHandle} from '@capacitor/core';
import {applyCloudItems,cloudOutbox,markCloudSent,resetCloudSent,setChangeListener} from './local-store';
import type {CloudItem} from './cloud-merge';
// Syncs the journal through the user's private CloudKit database. Local saves are handed to the native sync engine
// shortly after they happen; changes from other devices arrive by push and on returning to the app.
type Result={available:boolean};
type CloudPlugin={
 start():Promise<Result>;
 push(options:{items:CloudItem[]}):Promise<Result>;
 sync():Promise<Result>;
 takeInbox():Promise<Result&{items?:CloudItem[]}>;
 ack(options:{items:{key:string;stamp:number}[]}):Promise<Result>;
 addListener(event:'changes'|'reset',fn:()=>void):Promise<PluginListenerHandle>;
};
const cloud=registerPlugin<CloudPlugin>('BeanletCloud');
export type CloudStatus='off'|'syncing'|'synced'|'unavailable'|'error';
export const cloudChangedEvent='beanlet-cloud-changed';
let status:CloudStatus='off',syncedAt=0,running:Promise<void>|null=null,again=false,timer=0,started=false;
const listeners=new Set<()=>void>();
function set(next:CloudStatus){status=next;listeners.forEach(fn=>fn())}
export function cloudStatus(){return {status,syncedAt}}
export function onCloudStatus(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn)}}
export function cloudSyncSupported(){return Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='ios'}

async function pull(){
 const {items=[]}=await cloud.takeInbox();if(!items.length)return;
 const {changed}=await applyCloudItems(items);
 await cloud.ack({items:items.map(({key,stamp})=>({key,stamp}))});
 if(changed)window.dispatchEvent(new Event(cloudChangedEvent));
}
/** Photos travel inside records, so hand them over a few megabytes at a time. */
async function push(){
 const items=await cloudOutbox();let batch:CloudItem[]=[],size=0;
 const flush=async()=>{if(!batch.length)return;await cloud.push({items:batch});await markCloudSent(batch);batch=[];size=0};
 for(const item of items){batch.push(item);size+=item.payload?.length||0;if(size>4_000_000||batch.length>=200)await flush()}
 await flush();
}
export function syncNow():Promise<void>{
 if(!cloudSyncSupported())return Promise.resolve();
 if(running){again=true;return running}
 running=(async()=>{do{again=false;set('syncing');try{
  if(!(await cloud.start()).available){set('unavailable');return}
  await pull();await push();await cloud.sync();await pull();
  syncedAt=Date.now();set('synced');
 }catch{set('error')}}while(again)})().finally(()=>{running=null});
 return running;
}
export function startCloudSync(){
 if(started||!cloudSyncSupported())return;started=true;
 setChangeListener(()=>{window.clearTimeout(timer);timer=window.setTimeout(syncNow,1500)});
 cloud.addListener('changes',()=>{syncNow()});
 cloud.addListener('reset',()=>{resetCloudSent().then(syncNow)});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')syncNow()});
 syncNow();
}
