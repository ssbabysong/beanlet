export type MonthlyBrew={date:string;kind?:'pourOver'|'milk';dose?:number;beanId:string};
type MonthlyReportInput={language:'zh'|'en';month:string;cups:number;pourOvers:number;milks:number;beanCount:number;topBean?:{name:string;count:number}};

export function monthlyReportText({language,month,cups,pourOvers,milks,beanCount,topBean}:MonthlyReportInput){
 const lines=language==='en'
  ?[`BEANLET · ${month}`,`${cups} coffees`,`${pourOvers} pour-over · ${milks} milk`,`${beanCount} beans`]
  :[`BEANLET · ${month}`,`${cups} 杯咖啡`,`手冲 ${pourOvers} · 奶咖 ${milks}`,`尝了 ${beanCount} 款豆子`];
 if(topBean)lines.push(language==='en'?`Most brewed: ${topBean.name} ×${topBean.count}`:`最常喝：${topBean.name} ×${topBean.count}`);
 return lines.join('\n');
}

export function monthlyBrewStats<T extends MonthlyBrew>(brews:T[],year:number,month:number){
 const prefix=`${year}-${String(month).padStart(2,'0')}`,daysInMonth=new Date(year,month,0).getDate(),records=brews.filter(b=>b.date.startsWith(prefix));
 const daily=Array.from({length:daysInMonth},(_,index)=>{const day=index+1,dayKey=`${prefix}-${String(day).padStart(2,'0')}`,items=records.filter(b=>b.date===dayKey);return {day,label:String(day),cups:items.length,dose:Math.round(items.reduce((sum,b)=>sum+(b.dose||0),0)*10)/10}});
 const pourOvers=records.filter(b=>(b.kind||'pourOver')==='pourOver').length,milks=records.length-pourOvers,totalDose=Math.round(records.reduce((sum,b)=>sum+(b.dose||0),0)*10)/10,activeDays=daily.filter(d=>d.cups>0).length;
 const peak=daily.reduce<(typeof daily)[number]|null>((best,day)=>day.cups>(best?.cups||0)?day:best,null);
 const beans=Array.from(records.reduce((counts,b)=>counts.set(b.beanId,(counts.get(b.beanId)||0)+1),new Map<string,number>())).map(([beanId,count])=>({beanId,count})).sort((a,b)=>b.count-a.count);
 return {prefix,records,daily,pourOvers,milks,totalDose,activeDays,averagePerActiveDay:activeDays?Math.round(records.length/activeDays*10)/10:0,peakDay:peak?.cups?peak:null,beans};
}

export function annualBrewStats<T extends MonthlyBrew>(brews:T[],year:number){
 const prefix=`${year}-`,records=brews.filter(b=>b.date.startsWith(prefix));
 const months=Array.from({length:12},(_,index)=>{const month=index+1,key=`${year}-${String(month).padStart(2,'0')}`,items=records.filter(b=>b.date.startsWith(key));return {month,label:String(month),cups:items.length}});
 const start=new Date(year,0,1),end=new Date(year+1,0,1),days: {date:string;cups:number}[]=[];
 for(const cursor=new Date(start);cursor<end;cursor.setDate(cursor.getDate()+1)){const date=`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`;days.push({date,cups:records.filter(b=>b.date===date).length})}
 const pourOvers=records.filter(b=>(b.kind||'pourOver')==='pourOver').length,milks=records.length-pourOvers;
 const beans=Array.from(records.reduce((counts,b)=>counts.set(b.beanId,(counts.get(b.beanId)||0)+1),new Map<string,number>())).map(([beanId,count])=>({beanId,count})).sort((a,b)=>b.count-a.count);
 return {prefix,records,months,days,pourOvers,milks,beans};
}
