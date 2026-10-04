'use client';
import {useEffect,useRef,useState} from 'react';
import {Timer,ArrowLeft,Play,Pause,RotateCcw} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useI18n} from '@/lib/i18n';
import {navigationFeedback} from '@/lib/haptic-feedback';
import {pourRecipes,pourPlan,pourStepIndex,timerSeconds,timerText} from '@/lib/pour-recipes';
export type PourResult={dose:number;water:number;temp?:number;time:string;grind:string;method:string};
export function PourTimer({dose,onComplete}:{dose:number;onComplete:(result:PourResult)=>void}){
 const {language}=useI18n(),en=language==='en',say=(zh:string,english:string)=>en?english:zh;
 const [open,setOpen]=useState(false),[recipeId,setRecipeId]=useState('basic'),[grams,setGrams]=useState('15');
 const [started,setStarted]=useState<number|null>(null),[accumulated,setAccumulated]=useState(0),[now,setNow]=useState(Date.now()),[finished,setFinished]=useState(false);
 const lastStep=useRef(-1),recipe=pourRecipes.find(r=>r.id===recipeId)!,valid=Number.isFinite(Number(grams))&&Number(grams)>=1&&Number(grams)<=60;
 const plan=pourPlan(recipe,valid?Number(grams):15),seconds=timerSeconds(accumulated,started,now),index=pourStepIndex(recipe,seconds),step=plan.steps[index],running=started!==null,locked=running||accumulated>0||finished;
 useEffect(()=>{if(!running)return;const update=()=>setNow(Date.now());const id=setInterval(update,200);document.addEventListener('visibilitychange',update);return()=>{clearInterval(id);document.removeEventListener('visibilitychange',update)}},[running]);
 useEffect(()=>{if(running&&index!==lastStep.current){lastStep.current=index;navigationFeedback()}},[index,running]);
 useEffect(()=>{if(!running)return;let disposed=false;let lock:WakeLockSentinel|undefined;const acquire=async()=>{if(document.visibilityState!=='visible')return;try{const next=await navigator.wakeLock?.request('screen');if(disposed)void next?.release();else lock=next}catch{}};void acquire();document.addEventListener('visibilitychange',acquire);return()=>{disposed=true;void lock?.release();document.removeEventListener('visibilitychange',acquire)}},[running]);
 function reset(){setStarted(null);setAccumulated(0);setNow(Date.now());setFinished(false);lastStep.current=-1}
 function pause(){const end=Date.now();setAccumulated(v=>v+(started===null?0:end-started));setStarted(null);setNow(end)}
 function begin(){const start=Date.now();setNow(start);setStarted(start)}
 function finish(){pause();setFinished(true)}
 return <><button type="button" className="pour-timer-entry" onClick={()=>{reset();setGrams(String(dose>0&&dose<=60?dose:15));setOpen(true)}}><Timer size={18}/>{say('跟着冲 · 计时与注水','Brew along · timer & pours')}</button><Dialog open={open} onOpenChange={value=>{if(!running)setOpen(value)}}><DialogContent className="pour-timer-dialog" showCloseButton={false} onEscapeKeyDown={event=>{if(running)event.preventDefault()}} onPointerDownOutside={event=>{if(running)event.preventDefault()}}>
 <div className="pour-timer-nav"><button type="button" className="icon-button" aria-label={say('返回','Back')} disabled={running} onClick={()=>setOpen(false)}><ArrowLeft size={20}/></button><DialogTitle>{say('慢慢冲一杯','A little brewing time')}</DialogTitle><span className="sticker sticker-dripper" aria-hidden="true"/></div>
 <DialogDescription className="pour-timer-caption">{say('水量为目标值，请配合咖啡秤。冲煮时保持页面打开。','Water amounts are targets; use a scale. Keep this screen open while brewing.')}</DialogDescription>
 <div className="pour-timer-scroll"><div className="pour-timer-setup"><label className="field">{say('冲法','Recipe')}<select disabled={locked} value={recipeId} onChange={e=>setRecipeId(e.target.value)}>{pourRecipes.map(r=><option key={r.id} value={r.id}>{en?r.en:r.zh}</option>)}</select></label><label className="field">{say('粉量 · g','Coffee · g')}<input disabled={locked} type="number" min="1" max="60" step="0.1" value={grams} onChange={e=>setGrams(e.target.value)}/></label></div>
 {!valid&&<p role="alert" className="error">{say('粉量请输入 1–60 g','Enter 1–60 g of coffee')}</p>}
 <div className="pour-timer-facts">1 : {recipe.ratio.toFixed(1)} · {plan.total} g · {en?recipe.grindEn:recipe.grindZh}{recipe.temp?` · ${recipe.temp} °C`:''}</div>
 <div className="pour-timer-clock"><span>{finished?say('这一杯的用时','Your brew time'):running?say('正在冲煮','Brewing'):accumulated?say('已暂停','Paused'):say('准备好再开始','Ready when you are')}</span><strong role="timer" aria-label={say('冲煮计时','Brew timer')}>{timerText(seconds)}</strong><small>{say('参考完成','Suggested finish')} {timerText(recipe.seconds)}</small></div>
 <section className="pour-timer-target" aria-live="polite"><span>{seconds>=recipe.seconds?say('滴滤结束后，点「冲好了」','Tap “Finished” when drained'):en?step.en:step.zh}</span><strong>{say('累计注到','Pour up to')} <b>{step.target}</b> g</strong><small>{say('本段增加','Add this pour')} {step.amount} g{plan.steps[index+1]?` · ${say('下一段','Next')} ${timerText(plan.steps[index+1].at)}`:''}</small></section>
 <ol className="pour-timer-steps">{plan.steps.map((s,i)=><li key={s.at} aria-current={i===index?'step':undefined}><time>{timerText(s.at)}</time><span>{i===0?say('闷蒸','Bloom'):say('注水','Pour')} <small>+{s.amount} g</small></span><strong>{s.target} g</strong></li>)}</ol>
 <details className="pour-timer-notes"><summary>{say('冲法说明与来源','Recipe notes & source')}</summary><p>{en?recipe.noteEn:recipe.noteZh}</p><p>{say('按粉量等比例换算水量，时间不同比例缩放；滴滤速度和口味优先。','Water scales with your dose; timing does not. Follow drainage and taste.')}</p><a href={recipe.source} target="_blank" rel="noreferrer">{say('查看原配方 ↗','Original recipe ↗')}</a></details></div>
 <div className="pour-timer-actions">{finished?<><button type="button" className="secondary" onClick={reset}><RotateCcw size={16}/>{say('重来','Reset')}</button><button type="button" className="primary" onClick={()=>{onComplete({dose:Number(grams),water:plan.total,temp:recipe.temp,time:timerText(seconds),grind:en?recipe.grindEn:recipe.grindZh,method:en?recipe.en:recipe.zh});setOpen(false)}}>{say('带入记录','Use in record')}</button></>:<><button type="button" className="primary" disabled={!valid} onClick={running?pause:begin}>{running?<Pause size={17}/>:<Play size={17}/>} {running?say('暂停','Pause'):accumulated?say('继续','Resume'):say('开始','Start')}</button>{locked&&<button type="button" className="secondary" onClick={finish}>{say('冲好了','Finished')}</button>}{!running&&locked&&<button type="button" className="icon-button" aria-label={say('重新计时','Reset timer')} onClick={reset}><RotateCcw size={17}/></button>}</>}</div>
 </DialogContent></Dialog></>;
}
