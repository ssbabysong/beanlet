import {collectTasted,coffeeIdentity} from './tasted';
import {z} from 'zod';
import {builtInCatalog} from './catalog';
import {roastOptions,civilDay} from './coffee-guide';
const beanSchema=z.object({id:z.string().min(1),name:z.string().max(500),roaster:z.string().max(500),origin:z.string().max(500),process:z.string().max(500),roast:z.string().max(50),flavor:z.string().max(500),status:z.enum(['未开封','正在喝','已喝完']),rating:z.number().min(0).max(5),repurchase:z.boolean(),photo:z.string().max(8_000_000).refine(v=>!v||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v),'Invalid photo'),roastDate:z.string().refine(v=>!v||civilDay(v)!==null),notes:z.string().max(4000),recordType:z.enum(['bean','catalog']).optional(),icon:z.string().max(30).optional(),catalogId:z.string().max(200).optional(),sourceUrl:z.string().max(500).refine(v=>!v||v.startsWith('https://')).optional(),sourceDate:z.string().optional(),variety:z.string().optional(),roastNote:z.string().optional(),useOriginalArt:z.boolean().optional()});
const brewSchema=z.object({id:z.string().min(1),beanId:z.string(),date:z.string().refine(v=>civilDay(v)!==null),dose:z.number().positive().max(200),water:z.number().positive().max(5000),temp:z.number().min(1).max(100),grind:z.string().max(100),time:z.string().max(50),notes:z.string().max(4000),rating:z.number().min(1).max(5)});
const tasteSchema=z.object({id:z.string().min(1),bean:beanSchema,firstDate:z.string().refine(v=>!v||civilDay(v)!==null),manual:z.boolean()}).refine(v=>v.id===coffeeIdentity(v.bean),'Coffee identity mismatch');
export const backupSchema=z.object({format:z.literal('beanlet'),version:z.literal(1),starterCleanupVersion:z.literal(1).optional(),tasted:z.array(tasteSchema).max(10000).default([]),beans:z.array(beanSchema).max(10000),catalog:z.array(beanSchema).max(10000),brews:z.array(brewSchema).max(100000)}).superRefine((s,ctx)=>{const ids=new Set(s.beans.map(b=>b.id));if(ids.size!==s.beans.length||new Set(s.catalog.map(b=>b.id)).size!==s.catalog.length||new Set(s.brews.map(b=>b.id)).size!==s.brews.length||new Set(s.tasted.map(b=>b.id)).size!==s.tasted.length)ctx.addIssue({code:'custom',message:'Duplicate IDs'});if(s.brews.some(b=>!ids.has(b.beanId)))ctx.addIssue({code:'custom',message:'Missing coffee for brew'});});
type State=z.infer<typeof backupSchema>;
const empty=():State=>({format:'beanlet',version:1,starterCleanupVersion:1,tasted:[],beans:[],catalog:[],brews:[]});
export function migrateStarters(state:State):State{
 if(state.starterCleanupVersion===1)return state;
 const used=new Set(state.brews.map(b=>b.beanId));
 const defaults=new Map(builtInCatalog.map(b=>['starter-'+b.id,{...b,id:'starter-'+b.id,catalogId:b.id,recordType:'bean',status:'未开封',useOriginalArt:true}]));
 return {...state,starterCleanupVersion:1,beans:state.beans.filter(bean=>{
  const original=defaults.get(bean.id);
  return !original||used.has(bean.id)||JSON.stringify(Object.entries(bean).sort())!==JSON.stringify(Object.entries(original).sort());
 })};
}
function db(){return new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('beanlet-journal',1);r.onupgradeneeded=()=>r.result.createObjectStore('journal');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new Error('无法打开本地存储'));});}
async function read():Promise<State>{const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('journal','readwrite');const store=tx.objectStore('journal');const r=store.get('data');let state:State;r.onsuccess=()=>{state=r.result?migrateStarters(r.result):empty();const tasted=collectTasted(state.beans,state.brews,state.tasted||[]);if(JSON.stringify(tasted)!==JSON.stringify(state.tasted)){state={...state,tasted}}if(!r.result||state!==r.result)store.put(state,'data')};tx.oncomplete=()=>{d.close();resolve(state)};tx.onerror=()=>{d.close();reject(tx.error)};tx.onabort=()=>{d.close();reject(tx.error)}})}
async function write(s:State){const d=await db();return new Promise<void>((resolve,reject)=>{const tx=d.transaction('journal','readwrite');tx.objectStore('journal').put(s,'data');tx.oncomplete=()=>{d.close();resolve()};tx.onerror=()=>{d.close();reject(new Error('保存失败，请检查浏览器存储空间'))};tx.onabort=()=>{d.close();reject(new Error('保存失败，请检查浏览器存储空间'))}})}
let pending=Promise.resolve();
function mutate<T>(fn:(s:State)=>Promise<T>){const task=pending.then(async()=>fn(await read()));pending=task.then(()=>{},()=>{});return task}
function readPhoto(file:File){if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('照片请使用 5 MB 内的 JPG、PNG 或 WebP');return new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('照片读取失败'));r.readAsDataURL(file)})}
export async function localApi(url:string,options?:RequestInit):Promise<any>{
 if(url==='/api/photos'){const file=(options?.body as FormData).get('photo');if(!(file instanceof File))throw new Error('照片读取失败');return {key:await readPhoto(file)}}
 if(!options?.method||options.method==='GET'){await pending;const s=await read();return {...s,catalog:[...builtInCatalog,...s.catalog]}}
 return mutate(async s=>{const body=JSON.parse(String(options.body));const {id,kind}=body;
 if(kind==='taste'){
  if(options.method==='DELETE'){s.tasted=s.tasted.filter(x=>x.id!==id)}
  else{const bean=beanSchema.parse(body.data);const key=coffeeIdentity(bean);if(!s.tasted.some(x=>x.id===key))s.tasted.push({id:key,bean,firstDate:'',manual:true})}
  await write(s);return {ok:true};
 }

 if(options.method==='DELETE'){if(kind==='bean'){s.beans=s.beans.filter(b=>b.id!==id);s.catalog=s.catalog.filter(b=>b.id!==id);s.brews=s.brews.filter(b=>b.beanId!==id)}else s.brews=s.brews.filter(b=>b.id!==id);await write(s);return {ok:true}}
 const updating=options.method==='PUT';const data={...body.data,id:updating?id:crypto.randomUUID()};
 if(kind==='bean'){
 if(!roastOptions.includes(data.roast))throw new Error('先选一个烘焙度');if(data.roastDate>`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`)throw new Error('烘焙日期不能在未来');
 const b=beanSchema.parse(data);const list=b.recordType==='catalog'?s.catalog:s.beans;const at=list.findIndex(x=>x.id===b.id);if(updating){if(at<0)throw new Error('记录不存在');list[at]=b}else{if(body.saveToCatalog&&b.recordType!=='catalog'&&!b.catalogId){const c={...b,id:crypto.randomUUID(),recordType:'catalog' as const};s.catalog.unshift(c);b.catalogId=c.id}list.unshift(b)}
 }else{const b=brewSchema.parse(data);if(!s.beans.some(x=>x.id===b.beanId))throw new Error('豆子不存在');s.brews.unshift(b)}await write(s);return {id:data.id}});
}
export async function exportBackup(){await pending;const s=await read();const blob=new Blob([JSON.stringify({...s,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`beanlet-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export async function importBackup(file:File){if(file.size>100*1024*1024)throw new Error('备份文件请小于 100 MB');let data:State;try{data=backupSchema.parse(JSON.parse(await file.text()))}catch{throw new Error('备份格式不正确，请选择 Beanlet 导出的文件')}return mutate(async s=>{let count=0;for(const key of ['beans','catalog','brews','tasted'] as const){const ids=new Set(s[key].map(b=>b.id));const incoming=data[key].filter(b=>!ids.has(b.id));(s[key] as unknown[]).push(...incoming);count+=incoming.length}await write(s);return count})}
