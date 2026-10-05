export type MonthlyBrew={date:string;kind?:'pourOver'|'milk';dose?:number;beanId:string};

export function monthlyBrewStats<T extends MonthlyBrew>(brews:T[],year:number,month:number){
 const prefix=`${year}-${String(month).padStart(2,'0')}`,daysInMonth=new Date(year,month,0).getDate(),records=brews.filter(b=>b.date.startsWith(prefix));
 const daily=Array.from({length:daysInMonth},(_,index)=>{const day=index+1,dayKey=`${prefix}-${String(day).padStart(2,'0')}`,items=records.filter(b=>b.date===dayKey);return {day,label:String(day),cups:items.length,dose:Math.round(items.reduce((sum,b)=>sum+(b.dose||0),0)*10)/10}});
 const pourOvers=records.filter(b=>(b.kind||'pourOver')==='pourOver').length,milks=records.length-pourOvers,totalDose=Math.round(records.reduce((sum,b)=>sum+(b.dose||0),0)*10)/10,activeDays=daily.filter(d=>d.cups>0).length;
 const peak=daily.reduce<(typeof daily)[number]|null>((best,day)=>day.cups>(best?.cups||0)?day:best,null);
 const beans=Array.from(records.reduce((counts,b)=>counts.set(b.beanId,(counts.get(b.beanId)||0)+1),new Map<string,number>())).map(([beanId,count])=>({beanId,count})).sort((a,b)=>b.count-a.count);
 return {prefix,records,daily,pourOvers,milks,totalDose,activeDays,averagePerActiveDay:activeDays?Math.round(records.length/activeDays*10)/10:0,peakDay:peak?.cups?peak:null,beans};
}
