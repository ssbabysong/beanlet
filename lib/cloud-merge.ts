// Record-level merge for iCloud sync. Every change stamps `clock[key]`; every deletion leaves `removed[key]`,
// so two devices can merge in any order and the most recent edit or deletion of each record wins.
type Item={id:string};
export type Syncable={beans:Item[];catalog:Item[];brews:(Item&{beanId:string})[];tasted:Item[];favorites:string[];hiddenCatalog:string[];clock?:Record<string,number>;removed?:Record<string,number>};
const lists=['beans','catalog','brews','tasted'] as const;
const sets=['favorites','hiddenCatalog'] as const;
/** JSON with object keys sorted, so copies that differ only in key order compare equal. */
function stable(value:unknown):string{
 if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().filter(k=>(value as any)[k]!==undefined).map(k=>JSON.stringify(k)+':'+stable((value as any)[k])).join(',')+'}';
 return JSON.stringify(value);
}
/** Same records, stamps and settings, whatever order each device keeps them in. */
export function sameState(a:Syncable,b:Syncable){
 const sorted=(s:Syncable)=>({...s,...Object.fromEntries([...lists,...sets].map(name=>[name,[...s[name]].sort((x:any,y:any)=>{const i=typeof x==='string'?x:x.id,j=typeof y==='string'?y:y.id;return i<j?-1:i>j?1:0})]))});
 return stable(sorted(a))===stable(sorted(b));
}
function entries(s:Syncable){
 const out=new Map<string,{value:unknown;order:number}>();let order=0;
 for(const name of lists)for(const item of s[name])out.set(name+':'+item.id,{value:item,order:order++});
 for(const name of sets)for(const id of s[name])out.set(name+':'+id,{value:id,order:order++});
 return out;
}

/** Stamps the records that differ between the stored state and the one about to be saved. */
export function stampChanges<T extends Syncable>(before:Syncable|undefined,next:T,now=Date.now()):T{
 const clock={...(next.clock||before?.clock||{})},removed={...(next.removed||before?.removed||{})};
 const old=before?entries(before):new Map(),fresh=entries(next);
 for(const [key,{value}] of fresh){const prev=old.get(key);if(!prev||stable(prev.value)!==stable(value)){clock[key]=now;delete removed[key]}}
 for(const key of old.keys())if(!fresh.has(key)){removed[key]=now;delete clock[key]}
 return {...next,clock,removed};
}

/** Present records carry their clock (0 when never stamped); deleted ones carry their tombstone; unknown is -1. */
function timeOf(s:Syncable,map:Map<string,unknown>,key:string){return map.has(key)?s.clock?.[key]??0:s.removed?.[key]??-1}

export function mergeStates<T extends Syncable>(local:T,remote:Syncable):T{
 const mine=entries(local),theirs=entries(remote);
 const keys=new Set([...mine.keys(),...theirs.keys(),...Object.keys(local.removed||{}),...Object.keys(remote.removed||{})]);
 const clock:Record<string,number>={},removed:Record<string,number>={};
 const kept:{key:string;value:unknown;order:number;time:number}[]=[];
 for(const key of keys){
  const lt=timeOf(local,mine,key),rt=timeOf(remote,theirs,key);
  const time=Math.max(lt,rt),source=rt>lt?theirs.get(key):mine.get(key);
  // Records new to this device go first (newest first); the rest keep this device's order.
  if(source){kept.push({key,value:source.value,order:mine.get(key)?.order??-1,time});if(time>0)clock[key]=time}
  else if(time>=0)removed[key]=time;
 }
 kept.sort((a,b)=>a.order<0||b.order<0?(a.order<0&&b.order<0?b.time-a.time:a.order<0?-1:1):a.order-b.order);
 const out:any={...local,clock,removed};
 for(const name of [...lists,...sets])out[name]=[];
 for(const {key,value} of kept){const name=key.slice(0,key.indexOf(':'));out[name].push(value)}
 const beanIds=new Set(out.beans.map((b:Item)=>b.id));
 out.brews=out.brews.filter((b:{beanId:string;kind?:string})=>b.kind==='cafe'||beanIds.has(b.beanId));
 return out;
}

/** One record as it travels to and from CloudKit. `payload` is the record's JSON; deleted records have none. */
export type CloudItem={key:string;stamp:number;deleted:boolean;payload?:string};

/** Records whose latest change hasn't been handed to CloudKit yet. Records saved before sync existed count as very old. */
export function outgoing(s:Syncable,sent:Record<string,number>):CloudItem[]{
 const out:CloudItem[]=[];
 for(const [key,{value}] of entries(s)){const stamp=s.clock?.[key]??1;if(sent[key]!==stamp)out.push({key,stamp,deleted:false,payload:JSON.stringify(value)})}
 for(const [key,stamp] of Object.entries(s.removed||{}))if(sent[key]!==stamp)out.push({key,stamp,deleted:true});
 return out;
}

/** Turns records from CloudKit into a partial journal for mergeStates; `valid` rejects anything malformed. */
export function incoming(items:CloudItem[],valid:(collection:string,value:unknown)=>unknown):Syncable{
 const s:any={beans:[],catalog:[],brews:[],tasted:[],favorites:[],hiddenCatalog:[],clock:{},removed:{}};
 for(const item of items){
  const name=item.key.slice(0,item.key.indexOf(':'));if(!(name in s)||name==='clock'||name==='removed')continue;
  if(item.deleted){s.removed[item.key]=item.stamp;continue}
  try{const value=valid(name,JSON.parse(item.payload||''));if(value===undefined)continue;s[name].push(value);s.clock[item.key]=item.stamp}catch{}
 }
 return s;
}
