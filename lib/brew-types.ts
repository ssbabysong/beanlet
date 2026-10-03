export type BrewKind='pourOver'|'milk';
export type BrewRecord={id:string;beanId:string;date:string;kind?:BrewKind;dose?:number;water?:number;temp?:number;yield?:number;milkAmount?:number;milkType?:string;serving?:string;grind:string;time:string;notes:string;rating:number};
export function brewDraftFor(kind:BrewKind,records:BrewRecord[]){
 const last=records.find(b=>(b.kind||'pourOver')===kind);
 return {kind,dose:kind==='milk'?16:15,water:kind==='pourOver'?last?.water??'':undefined,temp:kind==='pourOver'?last?.temp??'':undefined,yield:kind==='milk'?last?.yield??'':undefined,milkAmount:kind==='milk'?last?.milkAmount??'':undefined,milkType:kind==='milk'?last?.milkType||'未记录':undefined,serving:kind==='milk'?last?.serving||'未记录':undefined,grind:last?.grind||'',time:last?.time||''};
}
export function brewPayload(d:Record<string,any>){
 const number=(v:unknown)=>v===''||v===undefined?undefined:Number(v);
 const common={beanId:d.beanId,date:d.date,kind:d.kind||'pourOver',dose:number(d.dose),grind:d.grind||'',time:d.time||'',notes:d.notes||'',rating:d.rating||0};
 return d.kind==='milk'?{...common,yield:number(d.yield),milkAmount:number(d.milkAmount),milkType:d.milkType||'未记录',serving:d.serving||'未记录'}:{...common,water:number(d.water),temp:number(d.temp)};
}
