export type TastedBean={id:string;catalogId?:string;recordType?:string;name:string;status:string;rating:number;repurchase:boolean;[key:string]:unknown};
export type Taste<T extends TastedBean=TastedBean>={id:string;bean:T;firstDate:string;manual:boolean};
export function coffeeIdentity(b:TastedBean){return b.catalogId||b.id}
// Keep a coffee's memory even when its bag is later removed from the shelf.
export function collectTasted<T extends TastedBean>(beans:T[],brews:{beanId:string;date:string}[],saved:Taste<T>[]=[]):Taste<T>[] {
 const result=new Map(saved.map(x=>[x.id,{...x}]));
 for(const bean of beans){
  const dates=brews.filter(b=>b.beanId===bean.id).map(b=>b.date).sort();
  if(bean.status!=='已喝完'&&!dates.length)continue;
  const id=coffeeIdentity(bean),old=result.get(id);
  const firstDate=[old?.firstDate,dates[0]].filter(Boolean).sort()[0]||'';
  result.set(id,{id,bean:{...bean,rating:Math.max(bean.rating,old?.bean.rating||0),repurchase:bean.repurchase||!!old?.bean.repurchase},firstDate,manual:old?.manual||false});
 }
 return [...result.values()];
}

// A coffee keeps its silhouette when searching, reordering or reloading.
export function stickerShape(id:string){let hash=0;for(const char of id)hash=(Math.imul(hash,31)+char.charCodeAt(0))|0;return (hash>>>0)%5;}
