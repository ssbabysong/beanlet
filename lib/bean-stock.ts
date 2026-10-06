export type StockBean={id:string;weight?:number;stockAdjustment?:number;status?:string;finishedDate?:string};
export function usedGrams(beanId:string,brews:{beanId:string;dose?:number}[]){return brews.reduce((sum,b)=>sum+(b.beanId===beanId&&Number.isFinite(b.dose)&&b.dose!>0?b.dose!:0),0)}
export function beanStock(bean:StockBean,brews:{beanId:string;dose?:number}[]){
 if(!bean.weight||!Number.isFinite(bean.weight))return null;
 const used=usedGrams(bean.id,brews),remaining=bean.status==='已喝完'?0:Math.round(Math.max(0,Math.min(bean.weight,bean.weight-used+(bean.stockAdjustment||0)))*10)/10;
 return {total:bean.weight,used,remaining,ratio:remaining/bean.weight};
}

export function consumedBagFills(bags:number,limit=10){
 const total=Math.max(0,Number.isFinite(bags)?bags:0),whole=Math.floor(total),partial=Math.round((total-whole)*1000)/1000;
 return [...Array(Math.min(whole,limit)).fill(1),...(whole<limit&&partial>.001?[partial]:[])];
}

export function beanFinishedDate(bean:StockBean,brews:{beanId:string;date:string}[]){
 if(bean.status!=='已喝完')return '';
 if(bean.finishedDate)return bean.finishedDate;
 return brews.filter(brew=>brew.beanId===bean.id).reduce((latest,brew)=>brew.date>latest?brew.date:latest,'');
}
