export type BrewKind='pourOver'|'milk';
export type BrewRecord={id:string;beanId:string;date:string;kind?:BrewKind;dose?:number;water?:number;temp?:number;yield?:number;milkAmount?:number;milkType?:string;serving?:string;grind:string;time:string;notes:string;rating:number;photo?:string;photoCutout?:boolean};
// remembered: the dose and grind saved with the previous brew of this kind.
export function brewDraftFor(kind:BrewKind,_records:BrewRecord[],remembered:{dose?:number;grind?:string}={}){
 const dose=typeof remembered.dose==='number'&&remembered.dose>0&&remembered.dose<=200?remembered.dose:kind==='milk'?16:15;
 return {kind,dose,water:undefined,temp:undefined,yield:undefined,milkAmount:undefined,milkType:undefined,serving:undefined,grind:remembered.grind||'',time:''};
}
export function brewPayload(d:Record<string,any>){
 const number=(v:unknown)=>v===''||v===undefined?undefined:Number(v);
 const common={beanId:d.beanId,date:d.date,kind:d.kind||'pourOver',dose:number(d.dose),grind:d.grind||'',time:d.time||'',notes:d.notes||'',rating:d.rating||0,photo:d.photo||undefined,photoCutout:d.photoCutout||undefined};
 return d.kind==='milk'?{...common,yield:number(d.yield),milkAmount:number(d.milkAmount),milkType:d.milkType||'未记录',serving:d.serving||'未记录'}:{...common,water:number(d.water),temp:number(d.temp)};
}
