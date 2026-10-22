// Starting estimates for sealed whole beans; flavor windows are not safety expiry dates.
const guides: Record<string,{rest:number;start:number;end:number;temp:string;grind:string;ratio:string}> = {
 '浅烘焙':{rest:7,start:7,end:30,temp:'94–96',grind:'中细研磨',ratio:'1:16–17'},
 '中浅烘焙':{rest:5,start:5,end:28,temp:'93–95',grind:'中细研磨',ratio:'1:16'},
 '中烘焙':{rest:4,start:4,end:21,temp:'92–94',grind:'中等研磨',ratio:'1:15–16'},
 '中深烘焙':{rest:3,start:3,end:21,temp:'90–92',grind:'中等偏粗',ratio:'1:15–16'},
 '深烘焙':{rest:3,start:3,end:18,temp:'90–92',grind:'中等偏粗',ratio:'1:15'},
};
export const roastOptions=Object.keys(guides);
// The short shelf tag for a bag; past, undated and unknown windows get none.
export function shelfPhase(window:{phase:string;days?:number}){
 const n=window.days??0;
 if(window.phase==='peak')return {phase:'peak',label:'最佳赏味'};
 if(window.phase==='soon')return {phase:'soon',label:n?`赏味期剩 ${n} 天`:'赏味期最后一天'};
 if(window.phase==='opening')return {phase:'opening',label:'可以开冲'};
 if(window.phase==='resting')return {phase:'resting',label:`养豆 · 还需 ${n} 天`};
}
export function roastGuide(roast:string,roaster=''){if(!guides[roast])return undefined;return /hydrangea/i.test(roaster)&&roast==='浅烘焙'?{rest:21,start:28,end:42,temp:'93',grind:'中细研磨',ratio:'1:16.7'}:guides[roast]}
export function civilDay(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const time=Date.parse(value+'T00:00:00Z');if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==value)return null;return time/86400000}
// A bag's own resting days move the whole flavor window by the difference from the guide.
export function flavorWindow(roast:string,roastDate:string,today:string,roaster='',restDays?:number){
 const guide=roastGuide(roast,roaster);if(!guide)return {phase:'unknown',label:'补选烘焙度',dates:'',hint:'选择后自动计算'};
 const custom=typeof restDays==='number'&&Number.isInteger(restDays)&&restDays>=0,shift=custom?restDays-guide.rest:0,g={...guide,rest:guide.rest+shift,start:guide.start+shift,end:guide.end+shift};
 const range=custom?`养豆 ${g.rest} 天 · 赏味第 ${g.start}–${g.end} 天`:`建议养豆 ${/hydrangea/i.test(roaster)&&roast==='浅烘焙'?'14–21':g.rest} 天 · 赏味第 ${g.start}–${g.end} 天`;
 const day=civilDay(roastDate),now=civilDay(today);
 if(day===null||now===null)return {phase:'undated',label:`赏味第 ${g.start}–${g.end} 天`,dates:range,hint:'填烘焙日期，开启状态提示'};
 const age=now-day;
 if(age<0)return {phase:'invalid',label:'检查烘焙日期',dates:range,hint:'日期在未来'};
 const fmt=(n:number)=>new Date(n*86400000).toISOString().slice(0,10).replaceAll('-','.');
 const dates=`${fmt(day+g.start)} — ${fmt(day+g.end)}`;
 if(age<g.rest)return {phase:'resting',label:`养豆中 · 还需 ${g.rest-age} 天`,dates,hint:range,days:g.rest-age};
 if(age<g.start)return {phase:'opening',label:`可以开冲 · ${g.start-age} 天后进入佳期`,dates,hint:range,days:g.start-age};
 if(age>g.end)return {phase:'past',label:'已过参考赏味期',dates,hint:'先尝一杯，风味可能减弱'};
 if(g.end-age<=3)return {phase:'soon',label:g.end===age?'赏味期今天结束':`赏味期还剩 ${g.end-age} 天`,dates,hint:'这几天优先喝它',days:g.end-age};
 return {phase:'peak',label:'适饮中 · 正是好时候',dates,hint:`赏味期还剩 ${g.end-age} 天`,days:g.end-age};
}
