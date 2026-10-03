export type StockBean={id:string;weight?:number;stockAdjustment?:number;status?:string};
export function usedGrams(beanId:string,brews:{beanId:string;dose?:number}[]){return brews.reduce((sum,b)=>sum+(b.beanId===beanId&&Number.isFinite(b.dose)&&b.dose!>0?b.dose!:0),0)}
export function beanStock(bean:StockBean,brews:{beanId:string;dose?:number}[]){
 if(!bean.weight||!Number.isFinite(bean.weight))return null;
 const used=usedGrams(bean.id,brews),remaining=bean.status==='已喝完'?0:Math.round(Math.max(0,Math.min(bean.weight,bean.weight-used+(bean.stockAdjustment||0)))*10)/10;
 return {total:bean.weight,used,remaining,ratio:remaining/bean.weight};
}
