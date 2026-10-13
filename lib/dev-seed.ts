import {Capacitor,registerPlugin} from '@capacitor/core';
import {builtInCatalog} from './catalog';
import {importBackup,localApi} from './local-store';

// Debug builds only: the native side answers from the -seed N / -unseed launch arguments and always says 0 in release.
// Test bags use ids starting with "dev-seed-", so -unseed removes them and leaves real records alone.
const plugin=registerPlugin<{devSeed():Promise<{n:number;clear:boolean}>}>('NativeTabs');
const prefix='dev-seed-';

function day(offset:number){const d=new Date();d.setDate(d.getDate()-offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}

export async function runDevSeed(){
 if(Capacitor.getPlatform()!=='ios'||!Capacitor.isPluginAvailable('NativeTabs'))return false;
 const {n,clear}=await plugin.devSeed().catch(()=>({n:0,clear:false}));
 if(!n&&!clear)return false;
 const {beans}=await localApi('/api/journal');
 for(const bean of beans.filter((b:{id:string})=>b.id.startsWith(prefix)))await localApi('/api/journal',{method:'DELETE',body:JSON.stringify({id:bean.id,kind:'bean'})});
 if(n){
  const weights=[100,200,250,250,340];
  const seeded=Array.from({length:n},(_,i)=>{
   const source=builtInCatalog[i%builtInCatalog.length],weight=weights[i%weights.length];
   return {...source,id:`${prefix}${i+1}`,recordType:'bean' as const,catalogId:source.id,useOriginalArt:true,weight,
    // A spread of fill levels so the shelf shows full, half and nearly empty bags.
    stockAdjustment:-Math.round(weight*((i*37)%90)/100),
    status:i%3===0?'未开封' as const:'正在喝' as const,roastDate:day(4+(i*5)%40),bagColor:i%8,rating:0,repurchase:false,notes:''};
  });
  const backup={format:'beanlet',version:1,hiddenCatalog:[],favorites:[],tasted:[],catalog:[],brews:[],beans:seeded};
  await importBackup(new File([JSON.stringify(backup)],'dev-seed.json',{type:'application/json'}));
 }
 return true;
}
