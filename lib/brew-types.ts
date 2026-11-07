// cafe: a coffee bought out (探店) — no bag from the shelf, so no dose and no stock taken.
export type BrewKind='pourOver'|'milk'|'cafe';
export const cafeDrinks=['拿铁','美式','手冲','澳白','卡布奇诺','Dirty','意式浓缩','冷萃'];
export type BrewRecord={id:string;beanId:string;date:string;kind?:BrewKind;dose?:number;water?:number;temp?:number;yield?:number;milkAmount?:number;milkType?:string;serving?:string;place?:string;drink?:string;catalogId?:string;grind:string;time:string;notes:string;rating:number;photo?:string;photoCutout?:boolean};
// remembered: the dose and grind saved with the previous brew of this kind.
export function brewDraftFor(kind:BrewKind,_records:BrewRecord[],remembered:{dose?:number;grind?:string}={}){
 if(kind==='cafe')return {kind,dose:undefined,water:undefined,temp:undefined,yield:undefined,milkAmount:undefined,milkType:undefined,serving:'未记录',grind:'',time:'',place:'',drink:'',catalogId:''};
 const dose=typeof remembered.dose==='number'&&remembered.dose>0&&remembered.dose<=200?remembered.dose:kind==='milk'?16:15;
 return {kind,dose,water:undefined,temp:undefined,yield:undefined,milkAmount:undefined,milkType:undefined,serving:undefined,grind:remembered.grind||'',time:'',place:undefined,drink:undefined,catalogId:undefined};
}
export function brewPayload(d:Record<string,any>){
 const number=(v:unknown)=>v===''||v===undefined?undefined:Number(v);
 const common={beanId:d.beanId,date:d.date,kind:d.kind||'pourOver',dose:number(d.dose),grind:d.grind||'',time:d.time||'',notes:d.notes||'',rating:d.rating||0,photo:d.photo||undefined,photoCutout:d.photoCutout||undefined};
 if(d.kind==='cafe')return {...common,beanId:'',dose:undefined,grind:'',time:'',place:(d.place||'').trim(),drink:(d.drink||'').trim()||undefined,serving:d.serving||'未记录',catalogId:d.catalogId||undefined};
 return d.kind==='milk'?{...common,yield:number(d.yield),milkAmount:number(d.milkAmount),milkType:d.milkType||'未记录',serving:d.serving||'未记录'}:{...common,water:number(d.water),temp:number(d.temp)};
}
