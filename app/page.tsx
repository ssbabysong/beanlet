"use client";
import { useEffect,useState,useRef,FormEvent,type CSSProperties } from 'react';
import {coffeeIdentity,stickerShape,groupFinished,type Taste} from '@/lib/tasted';
import {beanPalette,calendarColors} from '@/lib/bean-appearance';
import {brewDraftFor,brewPayload,type BrewRecord,type BrewKind} from '@/lib/brew-types';
import {RoasterInput} from '@/components/roaster-input';
import {PhotoEditor} from '@/components/photo-editor';
import {PourTimer} from '@/components/pour-timer';
import {StockSlider} from '@/components/stock-slider';
import {beanStock} from '@/lib/bean-stock';
import {randomBeanName} from '@/lib/bean-names';
import {localApi as api,exportBackup,importBackup} from '@/lib/local-store';
import { ArrowLeft,Coffee,Plus,CalendarDays,BarChart3,Star,Camera,ChevronDown,ChevronLeft,ChevronRight,Heart,Pencil,Trash2,Droplets,Timer,ArrowUpRight,Share2,X } from 'lucide-react';
import { Dialog,DialogContent,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { Sheet,SheetContent,SheetTitle,SheetDescription } from '@/components/ui/sheet';
import { Tabs,TabsList,TabsTrigger,TabsContent } from '@/components/ui/tabs';
import { Select,SelectTrigger,SelectValue,SelectContent,SelectItem } from '@/components/ui/select';
import { AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogAction,AlertDialogCancel,AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Collapsible,CollapsibleTrigger,CollapsibleContent } from '@/components/ui/collapsible';
import { RadioGroup,RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty,EmptyHeader,EmptyTitle,EmptyDescription } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster,toast } from 'sonner';
import { Calendar,CalendarDayButton } from '@/components/ui/calendar';
import { roastGuide, flavorWindow, roastOptions } from '@/lib/coffee-guide';
import { originalArt,displayedArt,beanLabel } from '@/lib/catalog';
import { LocaleProvider,useI18n } from '@/lib/i18n';
import {countryOf,processOf,matchesFilters,emptyFilters,type CatalogFilters} from '@/lib/catalog-filters';
import {PressableRecord} from '@/components/pressable-record';
import {useSwipeNavigation} from '@/components/use-swipe-navigation';
import {adjacentTab} from '@/lib/swipe-navigation';
import {navigationFeedback} from '@/lib/haptic-feedback';
import {BagPaper} from '@/components/bag-paper';
import {bilingualBean,editableBeanNames,editableBeanInfo,usesOriginalBeanName} from '@/lib/catalog';
import { zhCN,enUS } from 'date-fns/locale';
import {fileDataUrl,makeCoffeeSticker} from '@/lib/coffee-sticker';
import {monthlyBrewStats,monthlyReportText} from '@/lib/monthly-stats';
import {createMonthlyReportImage} from '@/lib/monthly-report-image';
import {stickerPlacement,wallStickerPlacement} from '@/lib/sticker-layout';
import {CoffeeReel} from '@/components/coffee-reel';
import {ResponsiveContainer,BarChart,Bar,XAxis,YAxis,Tooltip,PieChart,Pie,Cell} from 'recharts';
type Bean={weight?:number;stockAdjustment?:number;nameEn?:string;useOriginalArt?:boolean;recordType?:string;catalogId?:string;sourceUrl?:string;sourceDate?:string;variety?:string;roastNote?:string;icon?:string;id:string;name:string;roaster:string;origin:string;process:string;roast:string;flavor:string;status:string;rating:number;repurchase:boolean;photo:string;roastDate:string;notes:string};
type Brew=BrewRecord;
const fresh={icon:'bag',name:'',nameEn:'',roaster:'',origin:'',process:'未记录',roast:'',flavor:'',status:'未开封',rating:0,repurchase:false,photo:'',roastDate:'',notes:''};
const photo=(key:string)=>key;
const brewPreferenceKey='beanlet-brew-preference';
function brewPreference(){try{return JSON.parse(localStorage.getItem(brewPreferenceKey)||'{}') as {kind?:BrewKind;beanId?:string}}catch{return {}}}
function rememberBrewPreference(kind:BrewKind,beanId?:string){try{localStorage.setItem(brewPreferenceKey,JSON.stringify({kind,beanId}))}catch{}}

const icons=[{id:'bag',name:'豆袋'},{id:'cup',name:'咖啡杯'},{id:'dripper',name:'手冲壶'},{id:'flower',name:'小花'},{id:'berry',name:'莓果'},{id:'blueberry',name:'蓝莓'},{id:'citrus',name:'柑橘'},{id:'peach',name:'蜜桃'},{id:'grape',name:'葡萄'},{id:'jasmine',name:'茉莉'},{id:'honey',name:'蜂蜜'},{id:'chocolate',name:'巧克力'},{id:'hazelnut',name:'榛果'},{id:'tea',name:'红茶'},{id:'brownie',name:'布朗尼'}];
function Sticker({icon='bag',className=''}:{icon?:string;className?:string}){if(icon==='cherry'||icon==='cookie')icon='brownie';const {t,language,label}=useI18n();return <span role="img" aria-label={t(icons.find(x=>x.id===icon)?.name||'豆袋')} className={`sticker sticker-${icon} ${className}`}/>}
function BeanVisual({bean}:{bean?:Bean}){const {t,language,label}=useI18n();return bean?.photo?<img className="bean-thumb" src={photo(bean.photo)} alt={t(bean.name)}/>:displayedArt(bean)?<img className="bean-thumb original-art" src={displayedArt(bean)} alt={t(`${bean?.name} · Hydrangea 原插画`)} loading="lazy"/>:<Sticker icon={bean?.icon}/>}
function dateKey(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function CoffeeGuide({bean,onEdit}:{bean:Bean;onEdit:()=>void}){const {t,language,label}=useI18n();const guide=roastGuide(bean.roast,bean.roaster),window=flavorWindow(bean.roast,bean.roastDate,dateKey(new Date()),bean.roaster);return <section className="coffee-guide"><div className="guide-heading"><Sticker icon="dripper"/><h3>{t("这包怎么喝")}</h3></div>{bean.roastDate&&<p className="guide-roast-date">{t("烘焙于")} <time dateTime={bean.roastDate}>{bean.roastDate}</time></p>}{guide?<><span className="meta">{t("养豆与最佳赏味期 · 参考")}</span><strong>{t(window.label)}</strong><p className="guide-dates">{t(window.dates)}</p><p className="guide-dates">{t(window.hint)}</p><div className="guide-recipe"><span>{guide.temp} °C</span><span>{guide.ratio}</span><span>{t(guide.grind)}</span></div><Collapsible><CollapsibleTrigger className="guide-more">{t("小贴士")}<ChevronDown size={13}/></CollapsibleTrigger><CollapsibleContent><p>{t("先用 15 g 粉，闷蒸 30–45 秒。酸涩偏薄试着磨细，苦涩试着磨粗，每次只改一项。")}</p><p>{t("常温密封整豆的估算范围，开封与储存会影响风味，以烘焙商建议和实际味道为准。赏味窗口不是保质期。")}</p><p>{/hydrangea/i.test(bean.roaster)&&<><a href="https://hydrangea.coffee/pages/faq" target="_blank" rel="noreferrer">{t("Hydrangea 官方：养豆 2–3 周，佳期 4–6 周")}</a>{t("。浅烘焙优先采用此建议。")}<br/></>}{t("参考")}<a href="https://rovala.nl/en/pages/brewing-tips" target="_blank" rel="noreferrer">{t("Rovala 冲煮指南")}</a> · <a href="https://sca.coffee/sca-news/coffee-decoded-9-fresh-coffee" target="_blank" rel="noreferrer">{t("SCA 新鲜度")}</a>{t("；中间烘焙度与窗口终点为综合估算。")}</p></CollapsibleContent></Collapsible></>:<button className="guide-edit" onClick={onEdit}>{t(window.label)} <Pencil size={14}/></button>}</section>}
function Choice({label,value,options,onChange}:{label:string;value:string;options:string[];onChange:(s:string)=>void}){const {t}=useI18n();return <label className="field">{label}<Select value={value} onValueChange={onChange}><SelectTrigger className="choice"><SelectValue placeholder={t("请选择")}/></SelectTrigger><SelectContent>{options.map(x=><SelectItem key={x} value={x}>{t(x)}</SelectItem>)}</SelectContent></Select></label>}
function Rating({value,onChange}:{value:number;onChange?:(n:number)=>void}){const {t,language,label}=useI18n();return <div className="stars" aria-label={t(`评分 ${value} / 5`)}>{[1,2,3,4,5].map(n=>onChange?<button key={n} type="button" aria-label={t(`${n} 星`)} aria-pressed={value===n} onClick={()=>onChange(n)}><Star size={23} fill={n<=value?'currentColor':'none'}/></button>:<Star key={n} size={15} fill={n<=value?'currentColor':'none'}/>)}</div>}
export default function Home(){return <LocaleProvider><Journal/></LocaleProvider>}
function Journal(){

 const atlasInitialized=useRef(false);
 const {t,language,setLanguage,label,otherLabel,info}=useI18n();const [settingsOpen,setSettingsOpen]=useState(false);const [filters,setFilters]=useState<CatalogFilters>({...emptyFilters});
 const [today,setToday]=useState(()=>dateKey(new Date()));useEffect(()=>{const timer=setInterval(()=>setToday(dateKey(new Date())),60000);return()=>clearInterval(timer)},[]);
 const [favorites,setFavorites]=useState<string[]>([]),[returnToTaste,setReturnToTaste]=useState<string|null>(null);
 const [atlasView,setAtlasView]=useState('discover'),[tasted,setTasted]=useState<Taste<Bean>[]>([]),[tasteDetail,setTasteDetail]=useState<string|null>(null);
 const [catalog,setCatalog]=useState<Bean[]>([]),[catalogQuery,setCatalogQuery]=useState(''),[pickerOpen,setPickerOpen]=useState(false),[saveToCatalog,setSaveToCatalog]=useState(true);
 const [beans,setBeans]=useState<Bean[]>([]),[brews,setBrews]=useState<Brew[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[tab,setTab]=useState('beans');

 const [photoSource,setPhotoSource]=useState<File|string|null>(null);
 const [editing,setEditing]=useState<string|null>(null),[beanOpen,setBeanOpen]=useState(false),[draft,setDraft]=useState<any>(fresh),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[detail,setDetail]=useState<string|null>(null),[busy,setBusy]=useState(false),[formError,setFormError]=useState('');
 const [brewView,setBrewView]=useState('calendar'),[calendarDay,setCalendarDay]=useState(()=>new Date()),[calendarMonth,setCalendarMonth]=useState(()=>new Date()),[sharingMonth,setSharingMonth]=useState(false),[monthReport,setMonthReport]=useState<{blob:Blob;url:string;name:string;text:string}|null>(null);
 const [brewActions,setBrewActions]=useState<Brew|null>(null);

 const [editingBrew,setEditingBrew]=useState<string|null>(null);
 const [brewOpen,setBrewOpen]=useState(false),[brewDraft,setBrewDraft]=useState<any>({}),[brewPhotoBusy,setBrewPhotoBusy]=useState(false),[brewPhotoEdit,setBrewPhotoEdit]=useState<{source:string;cutout:boolean}|null>(null),[deleteId,setDeleteId]=useState<{id:string;kind:string}|null>(null);
 async function refresh(){try{const data=await api('/api/journal');setBeans(data.beans);setCatalog(data.catalog);setBrews(data.brews);setTasted(data.tasted||[]);if(!atlasInitialized.current){setAtlasView(data.tasted?.length?'tasted':'discover');atlasInitialized.current=true;}setFavorites(data.favorites||[]);setError('')}catch(e){setError((e as Error).message)}finally{setLoading(false)}}
 useEffect(()=>{refresh()},[]);
 useEffect(()=>{if(!file){setPreview('');return}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);
 useEffect(()=>()=>{if(monthReport)URL.revokeObjectURL(monthReport.url)},[monthReport]);
 useEffect(()=>{const ctx=(document as any).modelContext;if(!ctx?.registerTool)return;const life=new AbortController();try{Promise.resolve(ctx.registerTool({name:'start_coffee_bean_collection',description:'打开新增咖啡豆表单；不会保存记录。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute(input:unknown){if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('Expected an empty object');setEditing(null);setDraft({...fresh});setFile(null);setFormError('');setBeanOpen(true);return {opened:true,saved:false}}},{signal:life.signal})).catch(()=>{})}catch{}return()=>life.abort()},[]);
 function startBean(b?:Bean,asCatalog=false){setSaveToCatalog(!b);setPickerOpen(false);setEditing(b?.id||null);setDraft(b?{...fresh,...b,...editableBeanNames(b),...editableBeanInfo(b)}:{...fresh,recordType:asCatalog?'catalog':'bean'});setFile(null);setFormError('');setBeanOpen(true)}
 function startBrew(id?:string){setEditingBrew(null);const last=brews[0],preference=brewPreference(),kind=preference.kind==='milk'||preference.kind==='pourOver'?preference.kind:last?.kind||'pourOver',beanId=id||(beans.some(b=>b.id===preference.beanId)?preference.beanId:beans.some(b=>b.id===last?.beanId)?last!.beanId:beans[0]?.id)||'';rememberBrewPreference(kind,beanId);setBrewDraft({...brewDraftFor(kind,brews),beanId,date:tab==='brews'&&brewView==='calendar'?dateKey(calendarDay):dateKey(new Date()),notes:'',rating:0});setFormError('');setBrewOpen(true)}
 function editBrew(b:Brew){setEditingBrew(b.id);setBrewDraft({...b,kind:b.kind||'pourOver'});setFormError('');setBrewOpen(true)}
 function changeBrewKind(kind:BrewKind){rememberBrewPreference(kind,brewDraft.beanId);if(kind===brewDraft.kind)return;setBrewDraft((draft:any)=>({...draft,...brewDraftFor(kind,brews)}))}
 async function addBrewPhoto(file?:File){if(!file)return;setBrewPhotoBusy(true);setFormError('');try{const sticker=await makeCoffeeSticker(file);setBrewPhotoEdit({source:sticker.photo,cutout:sticker.photoCutout})}catch(error){setFormError((error as Error).message)}finally{setBrewPhotoBusy(false)}}
 async function saveBean(e:FormEvent){e.preventDefault();if(!roastOptions.includes(draft.roast)){setFormError('先选一个烘焙度');return;}if(draft.recordType!=='catalog'&&draft.roastDate>dateKey(new Date())){setFormError('烘焙日期不能在未来');return;}setBusy(true);setFormError('');try{let key=draft.photo;if(file){const f=new FormData();f.set('photo',file);key=(await api('/api/photos',{method:'POST',body:f})).key;setDraft((d:any)=>({...d,photo:key}));setFile(null)}const data={...draft,...(draft.recordType==='catalog'&&!editing?{roastDate:'',status:'未开封',notes:''}:{}),roaster:draft.roaster.trim(),weight:draft.recordType==='catalog'||draft.weight===''||draft.weight==null?undefined:Number(draft.weight),stockAdjustment:draft.recordType==='catalog'?undefined:draft.stockAdjustment,nameEn:draft.nameEn?.trim()||'',name:draft.name.trim()||draft.nameEn?.trim()||randomBeanName(language,[...beans,...catalog].map(b=>b.name)),photo:key};const saved=await api('/api/journal',{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'bean',id:editing,data,saveToCatalog:!editing&&saveToCatalog&&draft.recordType!=='catalog'&&!draft.catalogId})});if(!editing&&draft.recordType==='catalog')setAtlasView('discover');setBeanOpen(false);if(!editing)setTab(draft.recordType==='catalog'?'catalog':'beans');await refresh();toast.success(t(editing?'豆子资料已更新':draft.recordType==='catalog'?'已加入豆子合集':'已放进豆仓'))}catch(e){setFormError((e as Error).message)}finally{setBusy(false)}}
 async function saveBrew(e:FormEvent){e.preventDefault();if(!Number.isFinite(Number(brewDraft.dose))||Number(brewDraft.dose)<=0||Number(brewDraft.dose)>200){setFormError('请填写粉量（大于 0，最多 200 g）');return}setBusy(true);setFormError('');try{await api('/api/journal',{method:editingBrew?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'brew',id:editingBrew,data:brewPayload(brewDraft)})});setBrewOpen(false);const savedDate=new Date(brewDraft.date+'T12:00:00');setCalendarDay(savedDate);setCalendarMonth(savedDate);await refresh();toast.success(t(editingBrew?'咖啡记录已更新':'这杯咖啡，记下了'))}catch(e){setFormError((e as Error).message)}finally{setBusy(false)}}
 async function remove(){if(!deleteId)return;setBusy(true);try{await api('/api/journal',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify(deleteId)});if(deleteId.kind==='bean')setDetail(null);if(deleteId.kind==='catalog'){setBeanOpen(false);setEditing(null)}setDeleteId(null);await refresh();toast.success(t('记录已删除'))}catch(e){toast.error(t((e as Error).message))}finally{setBusy(false)}}
 function chooseCatalog(b:Bean){setEditing(null);setDraft({...fresh,...b,...editableBeanNames(b),...editableBeanInfo(b),weight:undefined,stockAdjustment:undefined,id:undefined,recordType:'bean',catalogId:b.id,roastDate:'',status:'未开封',rating:0,repurchase:false,notes:''});setSaveToCatalog(false);setPickerOpen(false);setFile(null);setFormError('');setBeanOpen(true)}
 const catalogShown=catalog.filter(b=>matchesFilters(b,filters)&&[b.name,...Object.values(bilingualBean(b)),b.roaster,b.origin,b.flavor,b.variety,t(b.roast),t(b.process)].join(' ').toLowerCase().includes(catalogQuery.trim().toLowerCase()));
 const tastedShown=tasted.filter(x=>[label(x.bean),otherLabel(x.bean),x.bean.roaster,x.bean.flavor,x.bean.origin].join(' ').toLowerCase().includes(catalogQuery.trim().toLowerCase()));
 const memory=tasted.find(x=>x.id===tasteDetail);
 const memoryBags=memory?beans.filter(b=>coffeeIdentity(b)===memory.id).sort((a,b)=>(b.roastDate||'').localeCompare(a.roastDate||'')):[];
 const memoryBrews=brews.filter(b=>memoryBags.some(bag=>bag.id===b.beanId)).sort((a,b)=>a.date.localeCompare(b.date));
 function isFavorite(bean:Bean){return favorites.includes(coffeeIdentity(bean))}
 async function toggleFavorite(bean:Bean){if(busy)return;setBusy(true);try{await api('/api/journal',{method:'POST',body:JSON.stringify({kind:'favorite',id:coffeeIdentity(bean)})});await refresh()}catch(e){toast.error(t((e as Error).message))}finally{setBusy(false)}}
 function backFromBean(){setDetail(null);if(returnToTaste)setTasteDetail(returnToTaste);setReturnToTaste(null)}
 function detailHeader(bean:Bean,back:()=>void){return <div className="detail-nav"><button className="detail-back" onClick={back} aria-label={t('返回上一层')}><ArrowLeft size={21}/><span>{t('返回')}</span></button><button className="favorite-toggle" disabled={busy} aria-label={t(isFavorite(bean)?'取消收藏':'收藏这款豆子')} aria-pressed={isFavorite(bean)} onClick={()=>toggleFavorite(bean)}><Heart size={24} fill={isFavorite(bean)?'currentColor':'none'}/></button></div>}
 async function markTasted(bean:Bean){if(busy)return;setBusy(true);try{await api('/api/journal',{method:'POST',body:JSON.stringify({kind:'taste',data:bean})});await refresh();toast.success(t('又点亮一款豆子'))}catch(e){toast.error(t((e as Error).message))}finally{setBusy(false)}}
 async function undoTaste(id:string){if(busy)return;setBusy(true);try{await api('/api/journal',{method:'DELETE',body:JSON.stringify({kind:'taste',id})});setTasteDetail(null);await refresh()}catch(e){toast.error(t((e as Error).message))}finally{setBusy(false)}}
 const filterDefinitions:[keyof CatalogFilters,string,(b:Bean)=>string][]=[['brand','品牌',b=>b.roaster||'未记录'],['roast','烘焙度',b=>b.roast||'未记录'],['origin','产地',b=>countryOf(b.origin)],['process','处理法',b=>processOf(b.process)]];
 function filterControls(){return <div className="catalog-filter-panel"><div className="catalog-filters">{filterDefinitions.map(([key,title,get])=><Choice key={key} label={t(title)} value={filters[key]} options={['全部',...Array.from(new Set(catalog.map(get))).filter(x=>x!=='全部')]} onChange={value=>setFilters(f=>({...f,[key]:value}))}/>)}</div>{(Object.values(filters).some(v=>v!=='全部')||catalogQuery)&&<button className="clear-filters" onClick={()=>{setFilters({...emptyFilters});setCatalogQuery('')}}>{t('清除筛选')}</button>}</div>}

 const selected=beans.find(b=>b.id===detail),finished=groupFinished(beans),shown=beans.filter(b=>b.status!=='已喝完');const d=(key:string,value:unknown)=>setDraft((p:any)=>({...p,[key]:value}));const bd=(key:string,value:unknown)=>setBrewDraft((p:any)=>({...p,[key]:value}));
 const monthStats=monthlyBrewStats(brews,calendarMonth.getFullYear(),calendarMonth.getMonth()+1),monthBrews=monthStats.records,monthPourOvers=monthStats.pourOvers,monthMilks=monthStats.milks,monthBeanCounts=monthStats.beans.map(({beanId,count})=>({bean:beans.find(b=>b.id===beanId),count})).filter((row):row is {bean:Bean;count:number}=>!!row.bean),monthMaxBeanCount=Math.max(1,...monthBeanCounts.map(row=>row.count));
 const monthDailyMax=Math.max(1,...monthStats.daily.map(day=>day.cups)),monthDailyTicks=Array.from(new Set([0,Math.ceil(monthDailyMax/2),monthDailyMax]));
 const monthKindData=(monthBrews.length?[{name:t('手冲'),value:monthPourOvers,color:'#9ba8ce'},{name:t('奶咖'),value:monthMilks,color:'#c8b4d7'}]:[{name:t('暂无记录'),value:1,color:'#e7e8f0'}]).filter(item=>item.value>0);
 const photoStickerBrews=monthBrews.filter(brew=>brew.photo).slice().sort((a,b)=>b.date.localeCompare(a.date)),monthLabel=new Intl.DateTimeFormat(language==='en'?'en-US':'zh-CN',{year:'numeric',month:'long'}).format(calendarMonth);
 async function openMonthlyReport(){if(sharingMonth)return;const top=monthBeanCounts[0],topBean=top?{name:label(top.bean),count:top.count}:undefined,text=monthlyReportText({language,month:monthLabel,cups:monthBrews.length,pourOvers:monthPourOvers,milks:monthMilks,beanCount:monthBeanCounts.length,topBean});setSharingMonth(true);try{const blob=await createMonthlyReportImage({language,month:monthLabel,year:calendarMonth.getFullYear(),monthIndex:calendarMonth.getMonth(),cups:monthBrews.length,pourOvers:monthPourOvers,milks:monthMilks,beanCount:monthBeanCounts.length,daily:monthStats.daily,beanRanking:monthBeanCounts.map(row=>({name:label(row.bean),count:row.count})),photos:photoStickerBrews.map(brew=>({id:brew.id,src:brew.photo!,date:brew.date,cutout:brew.photoCutout}))}),name=`beanlet-${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth()+1).padStart(2,'0')}.png`;setMonthReport({blob,url:URL.createObjectURL(blob),name,text})}catch{toast.error(t('分享失败，请再试一次'))}finally{setSharingMonth(false)}}
 async function shareMonthlyReport(){if(!monthReport)return;try{if((globalThis as any).Capacitor?.isNativePlatform?.()){const {shareNativeImage}=await import('@/lib/native-video');await shareNativeImage(monthReport.blob,monthReport.name,`Beanlet · ${monthLabel}`)}else{const file=new File([monthReport.blob],monthReport.name,{type:'image/png'}),shareData={title:`Beanlet · ${monthLabel}`,text:monthReport.text,files:[file]};if(navigator.share&&navigator.canShare?.(shareData))await navigator.share(shareData);else{const link=document.createElement('a');link.href=monthReport.url;link.download=monthReport.name;link.click();toast.success(t('月报图片已保存'))}}}catch(error){if((error as Error).name!=='AbortError')toast.error(t('分享失败，请再试一次'))}}
 async function toggleFinished(b:Bean){if(busy)return;setBusy(true);try{await api('/api/journal',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'bean',id:b.id,data:{...b,status:b.status==='已喝完'?'正在喝':'已喝完'}})});await refresh();toast.success(t(b.status==='已喝完'?'放回豆架了':'收进喝完的豆子了'))}catch(e){toast.error(t((e as Error).message))}finally{setBusy(false)}}
 function beanCard(b:Bean,group?:Bean[]){const stock=beanStock(b,brews),fade=stock?1-stock.ratio:0;return <button className="bean-card" key={b.id} aria-label={label(b)+(group?` · ${group.length} ${t('包')}`:'')} onClick={()=>{setReturnToTaste(null);if(group){setTasteDetail(coffeeIdentity(b))}else setDetail(b.id)}}><div className='coffee-bag' style={{'--bag-fill':beanPalette(b).fill,'--bag-line':beanPalette(b).line,'--bag-side':beanPalette(b).side} as CSSProperties}>{group&&group.length>1&&<span className="finished-count"><span className="finished-times">×</span>{group.length}</span>}{b.roaster&&<span className="bag-brand-tag" title={b.roaster}><span>{b.roaster}</span></span>}<BagPaper ratio={stock?.ratio}/><span style={stock?{maskImage:`linear-gradient(to bottom,rgba(0,0,0,.18) ${fade*100}%,#000 ${fade*100}%)`}:undefined} className={'coffee-bag-label'+(b.photo||displayedArt(b)?' has-picture':'')}><BeanVisual bean={b}/></span>{b.roastDate&&(!group||group.length===1)&&<span className="bag-date-tag" title={t('烘焙于')+' '+b.roastDate} aria-label={t('烘焙于')+' '+b.roastDate}><time dateTime={b.roastDate}>{b.roastDate.replaceAll('-','.')}</time></span>}<span className="bag-meta-row">{stock&&!group&&<span className="bag-remaining" aria-label={language==='en'?`${stock.remaining}g remaining`:`剩余 ${stock.remaining}g`}>{stock.remaining}<small>g</small></span>}</span>{isFavorite(b)&&<span className="bag-heart" aria-label={t("已收藏")}><Heart size={16} fill="currentColor"/></span>}</div><div className="bean-info"><h3>{label(b)}</h3>{info(b,'flavor')&&<p className="shelf-name-secondary">{info(b,'flavor')}</p>}</div></button>}

 function brewCard(b:Brew,hideDate=false,inMemory=false){const hasDetails=!!(b.dose||b.grind||b.time||b.notes||b.rating||b.photo||(b.kind==='milk'?(b.yield||b.milkAmount||(b.milkType&&b.milkType!=='未记录')||(b.serving&&b.serving!=='未记录')):(b.water||b.temp)));return <PressableRecord className={'brew-card'+(hasDetails?'':' brew-card-compact')+(inMemory?' memory-coffee-record':'')+(b.photo?' has-brew-photo':'')} key={b.id} label={label(beans.find(x=>x.id===b.beanId))+' · '+b.date+' · '+t('点击编辑记录')} onClick={()=>editBrew(b)} onActions={()=>setBrewActions(b)}>{!inMemory&&<span className="brew-bean" style={{backgroundColor:beanPalette(beans.find(x=>x.id===b.beanId)||{id:b.beanId}).fill}} aria-hidden="true"><BeanVisual bean={beans.find(x=>x.id===b.beanId)}/></span>}{b.photo&&<span className={'brew-photo-sticker'+(b.photoCutout?' is-cutout':'')} aria-label={t('这杯咖啡的照片')}><img src={b.photo} alt=""/></span>}<div className="brew-body"><div className="row"><h3>{inMemory?<time dateTime={b.date}>{new Intl.DateTimeFormat(language==='en'?'en-US':'zh-CN',{year:'numeric',month:'short',day:'numeric'}).format(new Date(b.date+'T12:00:00'))}</time>:label(beans.find(x=>x.id===b.beanId))}</h3></div>{!hideDate&&!inMemory&&<span className="meta brew-record-date">{b.date}</span>}<div className="parameters">{b.dose!=null&&<span>{b.dose} {t('g 粉')}</span>}{b.kind==='milk'?<>{b.yield!=null&&<span>{t('出液')} {b.yield} g</span>}{b.milkAmount!=null&&<span>{t('奶量')} {b.milkAmount} ml</span>}{b.milkType&&b.milkType!=='未记录'&&<span>{t(b.milkType)}</span>}{b.serving&&b.serving!=='未记录'&&<span>{t(b.serving)}</span>}</>:<>{b.water!=null&&<span>{b.water} {t('ml 水')}</span>}{b.temp!=null&&<span>{b.temp} °C</span>}{!!b.dose&&!!b.water&&<span>1 : {(b.water/b.dose).toFixed(1)}</span>}</>}</div>{(b.grind||b.time)&&<p className="meta brew-method">{[b.grind&&t(`研磨 ${b.grind}`),b.time&&t(`用时 ${b.time}`)].filter(Boolean).join(' · ')}</p>}{b.notes&&<p className="notes">{b.notes}</p>}{b.rating>0&&<Rating value={b.rating}/>}</div></PressableRecord>}
 function selectMenu(value:string){setTab(value);if(value==='catalog'){setAtlasView(tasted.length?'tasted':'discover');setCatalogQuery('');setFilters({...emptyFilters})}}
 const mainSwipe=useSwipeNavigation(direction=>{const tabs=tab==='brews'?['calendar','stats']:tab==='catalog'?(tasted.length?['tasted','discover']:['discover','tasted']):[];const current=tab==='brews'?brewView:atlasView,next=adjacentTab(current,direction,tabs);if(!next)return;if(tab==='brews')setBrewView(next);else{setAtlasView(next);setCatalogQuery('');setFilters({...emptyFilters})}navigationFeedback()},(tab==='brews'||tab==='catalog')&&!beanOpen&&!brewOpen&&!settingsOpen&&!pickerOpen&&!detail&&!tasteDetail&&!brewActions&&!deleteId);
 return (
   <>
     <Toaster
       className="beanlet-toaster"
       position="bottom-center"
       offset="calc(106px + env(safe-area-inset-bottom, 0px))"
       mobileOffset="calc(106px + env(safe-area-inset-bottom, 0px))"
       visibleToasts={1}
       toastOptions={{ className: "beanlet-toast", duration: 2500 }}
       icons={{
         success: (
           <span className="toast-tick" aria-hidden="true">
             ✓
           </span>
         ),
       }}
     />
     <header className="top">
       <a className="brand" href="./" aria-label={t("Beanlet 首页")}>
         <img
           className="beanlet-logo"
           src="./brand/beanlet-wordmark.webp"
           alt="Beanlet"
           width="160"
           height="64"
         />
       </a>
       {tab === "catalog" && (
         <button
           className="personal-entry"
           aria-label={t("个人管理")}
           onClick={() => setSettingsOpen(true)}
         >
           <svg viewBox="0 0 40 40" aria-hidden="true">
             <path
               d="M9 29C4 23 6 12 13 7c8-5 19-1 21 8 3 9-4 19-13 20-5 0-9-2-12-6Z"
               fill="#e4e9d8"
             />
             <path
               d="M21 11c-6 1-9 8-6 12 3 4 9 2 10-3 1-4 0-8-4-9Z"
               fill="#baa5ce"
             />
             <path
               d="M21 13c-4 3 1 6-3 10M11 30c2-5 13-6 17-1"
               fill="none"
               stroke="#686b60"
               strokeWidth="1.7"
               strokeLinecap="round"
             />
           </svg>
           <span>{t("我的")}</span>
         </button>
       )}
     </header>
     <main className="menu-swipe" {...mainSwipe}>
       <section className="heading">
         <div>
           <h1>
             {tab === "beans"
               ? t("我的豆仓")
               : tab === "catalog"
                 ? t("豆子图鉴")
                 : t("咖啡记录")}
           </h1>
           {tab === "beans" && (
             <p className="subtitle">
               {t(
                 `${beans.filter((b) => b.status !== "已喝完").length} 包在手边`,
               )}
             </p>
           )}
         </div>
         {(tab !== "catalog" || atlasView === "discover") && (
           <button
             className="add-button"
             aria-label={t(
               tab === "beans"
                 ? "收藏新豆子"
                 : tab === "catalog"
                   ? "添加到豆子合集"
                   : "记录一杯咖啡",
             )}
             disabled={tab === "brews" && !beans.length}
             onClick={() =>
               tab === "beans"
                 ? startBean()
                 : tab === "catalog"
                   ? startBean(undefined, true)
                   : startBrew()
             }
           >
             <Plus size={26} />
           </button>
         )}
       </section>
       <Tabs value={tab} onValueChange={selectMenu} className="collection">
         <div
           className={tab !== "brews" ? "toolbar toolbar-hidden" : "toolbar"}
         >
           {tab === "beans" ? null : tab === "catalog" ? null : (
             <RadioGroup
               className="view-picker"
               aria-label={t("记录视图")}
               value={brewView}
               onValueChange={setBrewView}
             >
               {[
                 { id: "calendar", name: t("日历"), icon: CalendarDays },
                 { id: "stats", name: t("当月统计"), icon: BarChart3 },
               ].map((v) => (
                 <label key={v.id}>
                   <RadioGroupItem value={v.id} aria-label={t(v.name)} />
                   <v.icon size={18} />
                 </label>
               ))}
             </RadioGroup>
           )}
         </div>
         <span className="bottom-menu-backdrop" aria-hidden="true" />
         <TabsList className="main-tabs">
           <span
             className="nav-active"
             aria-hidden="true"
             style={{
               transform: `translateX(${["beans", "brews", "catalog"].indexOf(tab) * 100}%)`,
             }}
           />
           <TabsTrigger
             value="beans"
             aria-label={t("豆子收藏")}
             title={t("豆子收藏")}
           >
             <Sticker icon="bag" />
           </TabsTrigger>
           <TabsTrigger
             value="brews"
             aria-label={t("咖啡记录")}
             title={t("咖啡记录")}
           >
             <Sticker icon="cup" />
           </TabsTrigger>
           <TabsTrigger
             value="catalog"
             aria-label={t("豆子图鉴")}
             title={t("豆子图鉴")}
           >
             <Sticker icon="flower" />
           </TabsTrigger>
         </TabsList>
         {error && (
           <div role="alert" className="error">
             {t(error)}{" "}
             {error.includes("登录") ? (
               <a href="/signin-with-chatgpt?return_to=/" target="_top">
                 {t("登录")}
               </a>
             ) : (
               <button onClick={refresh}>{t("重新加载")}</button>
             )}
           </div>
         )}
         {loading ? (
           <div className="cards">
             {[0, 1, 2].map((x) => (
               <Skeleton key={x} className="h-64 rounded-xl" />
             ))}
           </div>
         ) : (
           <>
             <TabsContent value="beans" className="bean-shelf">
               {shown.length ? (
                 <div className="cards">{shown.map((b) => beanCard(b))}</div>
               ) : (
                 <Empty className="empty">
                   <EmptyHeader>
                     <div className="empty-stickers">
                       <Sticker icon="bag" />
                       <Sticker icon="cup" />
                     </div>
                     <EmptyTitle>
                       {beans.length ? t("这里还空着") : t("还没有豆豆")}
                     </EmptyTitle>
                   </EmptyHeader>
                   <button className="secondary" onClick={() => startBean()}>
                     <Plus size={17} />
                     {t("加一包")}
                   </button>
                 </Empty>
               )}
               {finished.length > 0 && (
                 <Collapsible className="finished-group">
                   <CollapsibleTrigger className="finished-trigger">
                     <Sticker icon="cup" />
                     <span>
                       {t("喝完的 ·")}
                       {finished.length}
                       {t("款")}
                     </span>
                     <ChevronDown size={17} />
                   </CollapsibleTrigger>
                   <CollapsibleContent>
                     <div className="cards">
                       {finished.map((group) => beanCard(group[0], group))}
                     </div>
                   </CollapsibleContent>
                 </Collapsible>
               )}
             </TabsContent>
             <TabsContent value="catalog">
               <div className="atlas-content">
                 <div
                   className="atlas-switch"
                   role="group"
                   aria-label={t("图鉴视图")}
                 >
                   {(tasted.length
                     ? [
                         ["tasted", "我的图鉴"],
                         ["discover", "豆子合集"],
                       ]
                     : [
                         ["discover", "豆子合集"],
                         ["tasted", "我的图鉴"],
                       ]
                   ).map(([value, title]) => (
                     <button
                       key={value}
                       aria-pressed={atlasView === value}
                       onClick={() => {
                         setAtlasView(value);
                         setCatalogQuery("");
                         setFilters({ ...emptyFilters });
                       }}
                     >
                       {t(title)}
                     </button>
                   ))}
                 </div>
                 {atlasView === "discover" ? (
                   <>
                     <input
                       className="catalog-search discovery-search"
                       aria-label={t("搜索豆子图鉴")}
                       placeholder={t("找名字、产地或风味")}
                       value={catalogQuery}
                       onChange={(e) => setCatalogQuery(e.target.value)}
                     />
                     {filterControls()}
                     <div className="catalog-list">
                       {catalogShown.map((b) => (
                           <article className="catalog-card" key={b.id}>
                             <div
                               className="catalog-art"
                               style={{ backgroundColor: beanPalette(b).fill }}
                             >
                               <BeanVisual bean={b} />
                             </div>
                             <div className="catalog-copy">
                               <span className="meta">
                                 {b.roaster || t("我的收录")}
                               </span>
                               <h3 title={b.name}>{label(b)}</h3>
                               <p>
                                 {info(b, "flavor") ||
                                   info(b, "origin") ||
                                   t(b.roast)}
                               </p>
                               <span className="meta">{b.variety}</span>
                               <div className="catalog-actions">
                                 <button
                                   className="taste-mark"
                                   disabled={busy}
                                   onClick={() =>
                                     tasted.some(
                                       (x) => x.id === coffeeIdentity(b),
                                     )
                                       ? setTasteDetail(coffeeIdentity(b))
                                       : markTasted(b)
                                   }
                                 >
                                   {t(
                                     tasted.some(
                                       (x) => x.id === coffeeIdentity(b),
                                     )
                                       ? "已喝过"
                                       : "标记喝过",
                                   )}
                                 </button>
                                 <button
                                   className="secondary"
                                   onClick={() => chooseCatalog(b)}
                                 >
                                   <Plus size={14} />
                                   {t("放进豆仓")}
                                 </button>
                                 <button
                                   className="icon-button"
                                   aria-label={t(`编辑${b.name}`)}
                                   onClick={() =>
                                     startBean({ ...b, recordType: "catalog" })
                                   }
                                 >
                                   <Pencil size={15} />
                                 </button>
                                 {b.sourceUrl && (
                                   <a
                                     href={b.sourceUrl}
                                     target="_blank"
                                     rel="noreferrer"
                                     aria-label={t(`${b.name}官网资料`)}
                                   >
                                     <ArrowUpRight size={17} />
                                   </a>
                                 )}
                               </div>
                               {beans.some(
                                 (x) =>
                                   x.catalogId === b.id &&
                                   x.status !== "已喝完",
                               ) && <small>{t("豆仓里有这款")}</small>}
                             </div>
                           </article>
                       ))}
                     </div>
                     {!catalogShown.length && (
                       <p className="day-empty">{t("没有符合条件的豆子")}</p>
                     )}
                     <p className="catalog-source">
                       {t(
                         "Hydrangea 官网资料 · 2026.10.02 收录 · 原插画 © Hydrangea Coffee Roasters",
                       )}
                     </p>
                   </>
                 ) : (
                   <>
                     {tastedShown.length ? (
                       <div className="tasted-wall">
                         {tastedShown.map((x) => (
                           <button
                             className="taste-sticker"
                             key={x.id}
                             onClick={() => setTasteDetail(x.id)}
                           >
                             <div
                               className={`taste-art taste-shape-${stickerShape(x.id)}`}
                               style={
                                 {
                                   "--sticker-paper": beanPalette(x.bean).fill,
                                 } as CSSProperties
                               }
                             >
                               <BeanVisual bean={x.bean} />
                               <span
                                 className="taste-stamp"
                                 aria-label={t("已喝过")}
                               >
                                 ✓
                               </span>
                             </div>
                             <span className="taste-name" title={label(x.bean)}>
                               {label(x.bean)}
                             </span>
                             {x.bean.roaster && (
                               <span className="taste-roaster">
                                 {x.bean.roaster}
                               </span>
                             )}
                             {isFavorite(x.bean) && (
                               <Heart
                                 className="taste-heart"
                                 size={13}
                                 fill="currentColor"
                                 aria-label={t("喜欢")}
                               />
                             )}
                           </button>
                         ))}
                       </div>
                     ) : (
                       <div className="taste-empty">
                         <Sticker icon="cup" />
                         <p>
                           {t(
                             catalogQuery
                               ? "没有符合条件的豆子"
                               : "第一口，点亮第一颗豆子",
                           )}
                         </p>
                         <button
                           className="secondary"
                           onClick={() => {
                             setAtlasView("discover");
                             setCatalogQuery("");
                           }}
                         >
                           {t("去豆子合集")}
                         </button>
                       </div>
                     )}
                     <button
                       className="taste-add"
                       onClick={() => startBean(undefined, true)}
                     >
                       <Plus size={16} />
                       {t("补录一款喝过的")}
                     </button>
                   </>
                 )}
               </div>
             </TabsContent>
             <TabsContent value="brews">
               {brewView === "calendar" ? (
                 <>
                   <div className="calendar-panel">
                     <Calendar
                       className="brew-calendar"
                       mode="single"
                       required
                       locale={language === "en" ? enUS : zhCN}
                       weekStartsOn={1}
                       showOutsideDays={false}
                       selected={calendarDay}
                       month={calendarMonth}
                       onSelect={(day) => day && setCalendarDay(day)}
                       onMonthChange={(month) => {
                         setCalendarMonth(month);
                         const now = new Date();
                         setCalendarDay(
                           month.getFullYear() === now.getFullYear() &&
                             month.getMonth() === now.getMonth()
                             ? now
                             : new Date(
                                 month.getFullYear(),
                                 month.getMonth(),
                                 1,
                               ),
                         );
                       }}
                       labels={{
                         labelNext: () => t("下个月"),
                         labelPrevious: () => t("上个月"),
                       }}
                       components={{
                         DayButton: (props) => {
                           const key = dateKey(props.day.date),
                             records = brews.filter((b) => b.date === key),
                             dayBeans = Array.from(
                               new Set(records.map((b) => b.beanId)),
                             )
                               .map((id) => beans.find((b) => b.id === id))
                               .filter((b): b is Bean => !!b),
                             photoRecords = records.filter((b) => !!b.photo),
                             photographedBeans = new Set(
                               photoRecords.map((b) => b.beanId),
                             ),
                             dayVisuals = [
                               ...photoRecords.map((record) => ({
                                 key: `photo-${record.id}`,
                                 photo: record.photo!,
                                 cutout: !!record.photoCutout,
                                 bean: beans.find(
                                   (bean) => bean.id === record.beanId,
                                 ),
                               })),
                               ...dayBeans
                                 .filter(
                                   (bean) => !photographedBeans.has(bean.id),
                                 )
                                 .map((bean) => ({
                                   key: `bean-${bean.id}`,
                                   photo: "",
                                   cutout: false,
                                   bean,
                                 })),
                             ];
                           return (
                             <CalendarDayButton
                               {...props}
                               data-has-coffee={dayBeans.length > 0}
                               style={
                                 {
                                   ...props.style,
                                   "--day-coffee": calendarColors(dayBeans),
                                 } as CSSProperties
                               }
                               aria-label={
                                 new Intl.DateTimeFormat(
                                   language === "en" ? "en-US" : "zh-CN",
                                   { month: "long", day: "numeric" },
                                 ).format(props.day.date) +
                                 ", " +
                                 t(`${records.length} 杯`) +
                                 ", " +
                                 dayBeans.map(label).join(", ")
                               }
                             >
                               <span className="day-number">
                                 {props.day.date.getDate()}
                               </span>
                               <span className="day-beans">
                                 {dayVisuals.slice(0, 2).map((visual) => (
                                   <span
                                     key={visual.key}
                                     className={`day-bean${visual.photo ? " day-coffee-photo" : ""}${visual.cutout ? " is-cutout" : ""}`}
                                     style={{
                                       backgroundColor: visual.bean
                                         ? beanPalette(visual.bean).fill
                                         : undefined,
                                     }}
                                   >
                                     {visual.photo ? (
                                       <img
                                         src={visual.photo}
                                         alt={t("当天咖啡照片")}
                                       />
                                     ) : (
                                       <BeanVisual bean={visual.bean} />
                                     )}
                                   </span>
                                 ))}
                                 {dayVisuals.length > 2 && (
                                   <span className="day-more">
                                     +{dayVisuals.length - 2}
                                   </span>
                                 )}
                               </span>
                             </CalendarDayButton>
                           );
                         },
                       }}
                     />
                     <button
                       className="today-button"
                       onClick={() => {
                         const now = new Date();
                         setCalendarMonth(now);
                         setCalendarDay(now);
                       }}
                     >
                       {t("今天")}
                     </button>
                   </div>
                   <div className="day-heading">
                     <h2>
                       {new Intl.DateTimeFormat(
                         language === "en" ? "en-US" : "zh-CN",
                         { month: "long", day: "numeric" },
                       ).format(calendarDay)}
                     </h2>
                     <button
                       className="icon-button"
                       aria-label={t("记录选中日期的咖啡")}
                       disabled={!beans.length}
                       onClick={() => startBrew()}
                     >
                       <Plus size={20} />
                     </button>
                   </div>
                   {brews.some((b) => b.date === dateKey(calendarDay)) ? (
                     <div className="brew-list day-records">
                       {brews
                         .filter((b) => b.date === dateKey(calendarDay))
                         .map((b) => brewCard(b, true))}
                     </div>
                   ) : (
                     <div className="day-empty">
                       <Sticker icon="cup" />
                       <span>{t("这天还没记")}</span>
                       {!beans.length && (
                         <button
                           className="secondary"
                           onClick={() => startBean()}
                         >
                           {t("加一包豆子")}
                         </button>
                       )}
                     </div>
                   )}
                 </>
               ) : (
                 <section className="month-stats">
                   <header className="month-stats-heading">
                     <button className="icon-button" aria-label={t("上个月")} onClick={()=>setCalendarMonth(month=>new Date(month.getFullYear(),month.getMonth()-1,1))}><ChevronLeft size={19}/></button>
                     <h2>{monthLabel}</h2>
                     <button className="icon-button" aria-label={t("下个月")} onClick={()=>setCalendarMonth(month=>new Date(month.getFullYear(),month.getMonth()+1,1))}><ChevronRight size={19}/></button>
                   </header>
                   {photoStickerBrews.length>0&&<section className="month-sticker-wall" aria-label={t("所有咖啡照片贴纸")}>
                     <div className="month-sticker-collage">{photoStickerBrews.map((brew,index)=>{const place=wallStickerPlacement(brew.id,index,photoStickerBrews.length);return <figure className={brew.photoCutout?'is-cutout':''} key={brew.id} style={{'--wall-sticker-size':`${place.size}%`,'--wall-sticker-lift':`${place.lift}px`,'--wall-sticker-rotation':`${place.rotation}deg`} as CSSProperties}><img src={brew.photo} alt={label(beans.find(bean=>bean.id===brew.beanId))}/></figure>})}</div>
                   </section>}
                   <div className="month-analysis-grid">
                     <section className="month-chart-card month-trend-card">
                       <header><h3>{t("每日冲煮")}</h3></header>
                       <div className="month-chart" aria-label={t("本月每日冲煮杯数图表")}>
                         <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={monthStats.daily} margin={{top:8,right:2,left:-26,bottom:0}}>
                             <XAxis dataKey="label" interval={4} axisLine={false} tickLine={false} tick={{fill:'#9a9fb0',fontSize:9}}/>
                             <YAxis allowDecimals={false} domain={[0,monthDailyMax+1]} ticks={monthDailyTicks} axisLine={false} tickLine={false} tick={{fill:'#a3a7b7',fontSize:9}}/>
                             <Tooltip cursor={{fill:'#eff0f7'}} contentStyle={{border:0,borderRadius:12,boxShadow:'0 6px 18px #656d8b20',fontSize:11,color:'#687393'}} labelFormatter={label=>`${label} ${t('日')}`}/>
                             <Bar dataKey="cups" name={t("杯")} fill="#a8b2d1" radius={[6,6,2,2]} maxBarSize={14}/>
                           </BarChart>
                         </ResponsiveContainer>
                       </div>
                     </section>
                     <section className="month-chart-card month-kind-card">
                       <header><h3>{t("冲煮方式")}</h3><span>{monthBrews.length} {t("杯")}</span></header>
                       <div className="month-kind-chart">
                         <div className="month-donut">
                           <ResponsiveContainer width="100%" height="100%">
                             <PieChart><Pie data={monthKindData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={58} paddingAngle={monthBrews.length?4:0} stroke="none">{monthKindData.map(item=><Cell key={item.name} fill={item.color}/>)}</Pie></PieChart>
                           </ResponsiveContainer>
                           <span><strong>{monthBrews.length}</strong>{t("杯")}</span>
                         </div>
                         <div className="month-kind-legend">
                           <span><i style={{background:'#9ba8ce'}}/>{t("手冲")}<strong>{monthPourOvers}</strong></span>
                           <span><i style={{background:'#c8b4d7'}}/>{t("奶咖")}<strong>{monthMilks}</strong></span>
                         </div>
                       </div>
                     </section>
                   </div>
                   <div className="month-bean-table">
                     <h3>{t("本月常喝")}</h3>
                     {monthBeanCounts.length?monthBeanCounts.slice(0,5).map(({bean,count})=><div className="month-bean-row" key={bean.id}>
                       <span className="month-bean-art" style={{backgroundColor:beanPalette(bean).fill}}><BeanVisual bean={bean}/></span>
                       <span className="month-bean-name">{label(bean)}<i><b style={{width:`${count/monthMaxBeanCount*100}%`}}/></i></span>
                       <strong>{count} {t("杯")}</strong>
                     </div>):<div className="month-stats-empty"><Sticker icon="cup"/><span>{t("这个月还没有咖啡记录")}</span></div>}
                   </div>
                   <div className="month-share-actions">
                     <button type="button" className="month-share-button" disabled={!monthBrews.length||sharingMonth} onClick={openMonthlyReport}><Share2 size={18}/><span>{sharingMonth?t("正在生成…"):t("分享月报")}</span></button>
                     <CoffeeReel fullButton photos={photoStickerBrews.map(brew=>({id:brew.id,src:brew.photo!,cutout:brew.photoCutout}))} month={monthLabel}/>
                   </div>
                 </section>
               )}
             </TabsContent>
           </>
         )}
       </Tabs>
     </main>
     <Sheet open={!!memory} onOpenChange={(v) => !v && setTasteDetail(null)}>
       <SheetContent
         onSwipeBack={() => setTasteDetail(null)}
         className="detail-panel memory-panel"
         showCloseButton={false}
       >
         {memory && (
           <>
             {detailHeader(memory.bean, () => setTasteDetail(null))}
             <SheetTitle className="detail-title">
               {label(memory.bean)}
             </SheetTitle>
             <SheetDescription>
               {memory.bean.roaster || t("我的品饮回忆")}
             </SheetDescription>
             <div className="memory-art">
               <BeanVisual bean={memory.bean} />
             </div>
             <p className="memory-flavor">{info(memory.bean, "flavor")}</p>
             {memory.firstDate && (
               <p className="meta memory-first-date">
                 {t("初尝于")}{" "}
                 <time dateTime={memory.firstDate}>
                   {new Intl.DateTimeFormat(
                     language === "en" ? "en-US" : "zh-CN",
                     { year: "numeric", month: "short", day: "numeric" },
                   ).format(new Date(memory.firstDate + "T12:00:00"))}
                 </time>
               </p>
             )}
             {memory.bean.notes && <p className="notes">{memory.bean.notes}</p>}
             {memoryBags.length > 0 && (
               <Collapsible className="memory-bags-fold" key={memory.id}>
                 <CollapsibleTrigger className="memory-bags-trigger">
                   <span>
                     {t("我的豆袋")} ·{" "}
                     {language === "en"
                       ? `${memoryBags.length} bags`
                       : `${memoryBags.length} 包`}
                   </span>
                   <ChevronDown size={16} />
                 </CollapsibleTrigger>
                 <CollapsibleContent>
                   <div className="memory-bag-dots">
                     {memoryBags.map((b, i) => {
                       const stock = beanStock(b, brews);
                       return (
                         <button
                           className="memory-bag-dot"
                           key={b.id}
                           style={
                             {
                               "--bag-dot-color": beanPalette(b).fill,
                             } as CSSProperties
                           }
                           aria-label={`${language === "en" ? "Bag" : "第"} ${i + 1} · ${t(b.status)}`}
                           onClick={() => {
                             setReturnToTaste(memory.id);
                             setTasteDetail(null);
                             setDetail(b.id);
                           }}
                         >
                           <span className="bag-dot-heading">
                             <span
                               className="bag-dot-number"
                               aria-hidden="true"
                             />
                             <span className="bag-sequence">
                               {language === "en"
                                 ? `Bag ${i + 1}`
                                 : `第 ${i + 1} 包`}
                             </span>
                             <span>{t(b.status)}</span>
                             <span className="bag-dot-date">
                               {b.roastDate ? (
                                 <>
                                   {t("烘焙于")}{" "}
                                   <time dateTime={b.roastDate}>
                                     {b.roastDate.replaceAll("-", ".")}
                                   </time>
                                 </>
                               ) : (
                                 t("烘焙日期未记录")
                               )}
                             </span>
                           </span>
                           {stock && b.status !== "已喝完" && (
                             <span className="bag-dot-amount">
                               {language === "en"
                                 ? `${stock.remaining}g left`
                                 : `余 ${stock.remaining}g`}
                             </span>
                           )}
                         </button>
                       );
                     })}
                   </div>
                 </CollapsibleContent>
               </Collapsible>
             )}
             <div className="memory-coffee-list">
               {memoryBrews.length ? (
                 memoryBrews.map((b) => brewCard(b, false, true))
               ) : (
                 <p className="meta memory-no-coffee">{t("还没有咖啡记录")}</p>
               )}
             </div>
             {memory.manual &&
               !memoryBags.some((b) => b.status === "已喝完") &&
               !memoryBrews.length && (
                 <button
                   className="taste-add"
                   disabled={busy}
                   onClick={() => undoTaste(memory.id)}
                 >
                   {t("撤销喝过标记")}
                 </button>
               )}
           </>
         )}
       </SheetContent>
     </Sheet>
     <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
       <DialogContent
         onSwipeBack={() => setSettingsOpen(false)}
         className="editor settings-dialog"
       >
         <DialogTitle>{t("个人管理")}</DialogTitle>
         <DialogDescription>{t("选择界面语言")}</DialogDescription>
         <RadioGroup
           aria-label={t("语言")}
           value={language}
           onValueChange={(v) => setLanguage(v as "zh" | "en")}
           className="language-options"
         >
           <label>
             <span>中文</span>
             <RadioGroupItem value="zh" aria-label="中文" />
           </label>
           <label>
             <span>English</span>
             <RadioGroupItem value="en" aria-label="English" />
           </label>
         </RadioGroup>
         <p className="meta">{t("语言偏好保存在这台设备上")}</p>
         <div className="backup-actions">
           <p className="backup-note">
             {t(
               "豆子、照片和咖啡记录仅保存在当前浏览器。清理浏览器数据前请导出备份。",
             )}
           </p>
           <button
             className="secondary"
             disabled={busy}
             onClick={async () => {
               try {
                 await exportBackup();
                 toast.success(t("备份已导出"));
               } catch {
                 toast.error(t("导出失败，请重试"));
               }
             }}
           >
             {t("导出备份")}
           </button>
           <label className="secondary">
             {t("导入备份")}
             <input
               aria-label={t("导入备份")}
               disabled={busy}
               type="file"
               accept=".json,application/json"
               className="sr-only"
               onChange={async (e) => {
                 const file = e.target.files?.[0];
                 if (!file) return;
                 setBusy(true);
                 try {
                   await importBackup(file);
                   await refresh();
                   toast.success(t("备份已合并，相同记录已跳过"));
                 } catch (error) {
                   toast.error(t((error as Error).message));
                 } finally {
                   setBusy(false);
                   e.target.value = "";
                 }
               }}
             />
           </label>
           <p className="backup-note">
             {t("导入会补充新记录，已有记录不会被覆盖。")}
           </p>
           <a
             className="meta"
             href="https://bean-island-journal.csscss.chatgpt.site/"
             target="_blank"
             rel="noreferrer"
           >
             {t("旧版云端数据：打开原网站导出备份 ↗")}
           </a>
         </div>
       </DialogContent>
     </Dialog>
     <PhotoEditor
       source={photoSource}
       onCancel={() => setPhotoSource(null)}
       onSave={(f) => {
         setFile(f);
         d("useOriginalArt", false);
         setFormError("");
         setPhotoSource(null);
       }}
     />
     <PhotoEditor
       source={brewPhotoEdit?.source || null}
       mode={brewPhotoEdit?.cutout ? "sticker" : "photo"}
       onCancel={() => setBrewPhotoEdit(null)}
       onSave={async (file) => {
         try {
           const photo = await fileDataUrl(file);
           setBrewDraft((draft: any) => ({
             ...draft,
             photo,
             photoCutout: !!brewPhotoEdit?.cutout,
           }));
           setFormError("");
           setBrewPhotoEdit(null);
         } catch (error) {
           setFormError((error as Error).message);
         }
       }}
     />
     <Dialog open={beanOpen} onOpenChange={(v) => !busy && setBeanOpen(v)}>
       <DialogContent
         onSwipeBack={() => {
           if (!busy) setBeanOpen(false);
         }}
         className="editor bean-editor form-editor"
       >
         <DialogTitle>
           {editing
             ? t("改一改")
             : draft.recordType === "catalog"
               ? t("添加到豆子合集")
               : t("加一包")}
         </DialogTitle>
         <DialogDescription className="sr-only">
           {t("烘焙度必填，其他信息可稍后补充。")}
         </DialogDescription>
         <form onSubmit={saveBean}>
           <div className="form-scroll">
             {!editing && draft.recordType !== "catalog" && (
               <button
                 type="button"
                 className="catalog-entry"
                 onClick={() => {
                   setBeanOpen(false);
                   setCatalogQuery("");
                   setFilters({ ...emptyFilters });
                   setPickerOpen(true);
                 }}
               >
                 <Sticker icon="flower" />
                 {t("从图鉴选")}
                 <ArrowUpRight size={16} />
               </button>
             )}
             <div className="quick-name">
               <label className="field full">
                 {language === "en" ? "Name" : "名字"}
                 <input
                   maxLength={100}
                   value={language === "en" ? draft.nameEn || "" : draft.name}
                   onChange={(e) => {
                     const value = e.target.value;
                     if (usesOriginalBeanName(draft))
                       setDraft((current: any) => ({
                         ...current,
                         name: value,
                         nameEn: value,
                       }));
                     else d(language === "en" ? "nameEn" : "name", value);
                   }}
                   placeholder={t("留空会自动起个名字")}
                 />
               </label>
             </div>
             <div className="roast-required">
               <RoasterInput
                 value={draft.roaster}
                 options={[...beans, ...catalog].map((b) => b.roaster)}
                 onChange={(value) => d("roaster", value)}
               />
               <Choice
                 label={t("烘焙度 · 必选")}
                 value={draft.roast}
                 options={roastOptions}
                 onChange={(s) => d("roast", s)}
               />
               {draft.recordType !== "catalog" && (
                 <label className="field full">
                   {t("烘焙日期（可选）")}
                   <input
                     type="date"
                     max={dateKey(new Date())}
                     value={draft.roastDate}
                     onInput={(e) => d("roastDate", e.currentTarget.value)}
                     onChange={(e) => d("roastDate", e.target.value)}
                   />
                 </label>
               )}
             </div>
             {draft.recordType !== "catalog" && (
               <div className="bag-weight-field">
                 <label className="field">
                   {t("包装重量（g，可选）")}
                   <input
                     type="number"
                     min="0.1"
                     max="100000"
                     step="0.1"
                     inputMode="decimal"
                     value={draft.weight ?? ""}
                     placeholder={t("填好后自动计算余量")}
                     onChange={(e) =>
                       d(
                         "weight",
                         e.target.value === "" ? "" : Number(e.target.value),
                       )
                     }
                   />
                 </label>
                 <div className="weight-presets">
                   {[100, 200, 250].map((g) => (
                     <button
                       type="button"
                       key={g}
                       aria-pressed={draft.weight === g}
                       onClick={() => d("weight", g)}
                     >
                       {g}g
                     </button>
                   ))}
                 </div>
               </div>
             )}
             {draft.recordType !== "catalog" && draft.roast && (
               <div className="draft-guide">
                 <span>
                   {t(
                     flavorWindow(
                       draft.roast,
                       draft.roastDate,
                       dateKey(new Date()),
                       draft.roaster,
                     ).label,
                   )}
                 </span>
                 <small>
                   {t(
                     flavorWindow(
                       draft.roast,
                       draft.roastDate,
                       dateKey(new Date()),
                       draft.roaster,
                     ).dates,
                   )}
                 </small>
                 {draft.roastNote && <small>{t(draft.roastNote)}</small>}
               </div>
             )}
             {originalArt(draft) && (
               <button
                 type="button"
                 className="original-art-choice"
                 aria-pressed={
                   !preview && !draft.photo && !!displayedArt(draft)
                 }
                 onClick={() => {
                   setFile(null);
                   d("photo", "");
                   d("useOriginalArt", true);
                 }}
               >
                 <img src={originalArt(draft)} alt={t("Hydrangea 官网插画")} />
                 <span>{t("使用官网插画")}</span>
               </button>
             )}
             <RadioGroup
               aria-label={t("选择插画图标")}
               className="sticker-picker"
               value={
                 preview || draft.photo || displayedArt(draft)
                   ? ""
                   : draft.icon === "cherry" || draft.icon === "cookie"
                     ? "brownie"
                     : draft.icon || "bag"
               }
               onValueChange={(value) => {
                 setFile(null);
                 d("photo", "");
                 d("useOriginalArt", false);
                 d("icon", value);
               }}
             >
               {icons.map((icon) => (
                 <label
                   key={icon.id}
                   className="sticker-option"
                   title={t(icon.name)}
                 >
                   <RadioGroupItem
                     className="sticker-radio"
                     value={icon.id}
                     aria-label={t(icon.name)}
                   />
                   <Sticker icon={icon.id} />
                 </label>
               ))}
             </RadioGroup>
             <div className="photo-upload-row">
               <label className="upload">
                 {preview || draft.photo ? (
                   <img
                     src={preview || photo(draft.photo)}
                     alt={t("豆袋预览")}
                   />
                 ) : (
                   <Camera size={20} />
                 )}
                 <span>
                   {preview || draft.photo ? t("换张照片") : t("或上传照片")}
                 </span>
                 <input
                   aria-label={t("上传豆袋照片")}
                   type="file"
                   accept="image/*"
                   onChange={(e) => {
                     const f = e.target.files?.[0];
                     e.target.value = "";
                     if (f) {
                       setFormError("");
                       setPhotoSource(f);
                     }
                   }}
                 />
               </label>
               {(file || draft.photo) && (
                 <button
                   className="stock-adjust"
                   type="button"
                   onClick={() => setPhotoSource(file || photo(draft.photo))}
                 >
                   {language === "en" ? "Adjust photo" : "调整照片"}
                 </button>
               )}
             </div>
             <Collapsible className="more-info">
               <CollapsibleTrigger className="more-trigger" type="button">
                 <span>{t("再记一点")}</span>
                 <ChevronDown size={17} />
               </CollapsibleTrigger>
               <CollapsibleContent>
                 <div className="form-grid">
                   {[
                     ["origin", t("产地 / 庄园"), t("例如：埃塞俄比亚")],
                     ["flavor", t("风味标签"), t("茉莉、柑橘、蜂蜜")],
                   ].map(([key, label, placeholder]) => (
                     <label
                       className={"field " + (key === "flavor" ? "full" : "")}
                       key={key}
                     >
                       {label}
                       <input
                         maxLength={200}
                         value={draft[key]}
                         onChange={(e) => d(key, e.target.value)}
                         placeholder={t(placeholder)}
                       />
                     </label>
                   ))}
                   <Choice
                     label={t("处理法")}
                     value={draft.process}
                     options={Array.from(
                       new Set([
                         "未记录",
                         "水洗",
                         "日晒",
                         "蜜处理",
                         "厌氧处理",
                         "其他",
                         draft.process,
                       ]),
                     )}
                     onChange={(s) => d("process", s)}
                   />
                   {draft.recordType !== "catalog" && (
                     <>
                       <Choice
                         label={t("豆子状态")}
                         value={draft.status}
                         options={["未开封", "正在喝", "已喝完"]}
                         onChange={(s) => d("status", s)}
                       />
                       <label className="field full">
                         {t("品饮笔记")}
                         <textarea
                           rows={3}
                           maxLength={4000}
                           value={draft.notes}
                           onChange={(e) => d("notes", e.target.value)}
                           placeholder={t("记下第一口的印象……")}
                         />
                       </label>
                     </>
                   )}
                 </div>
               </CollapsibleContent>
             </Collapsible>
             {!editing &&
               draft.recordType !== "catalog" &&
               !draft.catalogId && (
                 <label className="check-field catalog-check">
                   <Checkbox
                     checked={saveToCatalog}
                     onCheckedChange={(s) => setSaveToCatalog(s === true)}
                   />
                   {t("也收进我的图鉴")}
                 </label>
               )}
           </div>
           <div className="form-submit">
             {formError && (
               <p role="alert" className="error">
                 {t(formError)}
               </p>
             )}
             <div className="form-submit-actions">
               {editing && draft.recordType === "catalog" && (
                 <button type="button" className="edit-delete" disabled={busy} onClick={()=>setDeleteId({id:editing,kind:'catalog'})}>
                   <Trash2 size={17}/><span>{t("删除")}</span>
                 </button>
               )}
               <button type="submit" className="primary save" disabled={busy}>
                 {busy ? t("正在保存…") : t("收好")}
               </button>
             </div>
           </div>
         </form>
       </DialogContent>
     </Dialog>
     <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
       <DialogContent
         onSwipeBack={() => {
           setPickerOpen(false);
           setBeanOpen(true);
         }}
         className="editor catalog-picker"
       >
         <DialogTitle>{t("挑一包")}</DialogTitle>
         <DialogDescription className="sr-only">
           {t("从豆子图鉴快速添加到豆仓。")}
         </DialogDescription>
         <div className="pick-list">
           {catalog.map((b) => (
             <button key={b.id} onClick={() => chooseCatalog(b)}>
               <BeanVisual bean={b} />
               <span>
                 <strong>{label(b)}</strong>
                 <small>
                   {b.roaster} · {info(b, "flavor") || t(b.roast)}
                 </small>
               </span>
               <Plus size={17} />
             </button>
           ))}
           {!catalog.length && <p>{t("没找到这包，自己记一包吧")}</p>}
         </div>
         <button className="secondary" onClick={() => startBean()}>
           {t("自己记一包")}
         </button>
       </DialogContent>
     </Dialog>
     <Dialog open={brewOpen} onOpenChange={(v) => !busy && setBrewOpen(v)}>
       <DialogContent
         onSwipeBack={() => {
           if (!busy) setBrewOpen(false);
         }}
         className="editor form-editor"
       >
         <DialogTitle>{t(editingBrew ? "编辑咖啡记录" : "记一杯")}</DialogTitle>
         <DialogDescription className="sr-only">
           {t("简单记下这杯咖啡。")}
         </DialogDescription>
         <form onSubmit={saveBrew}>
           <div className="form-scroll">
             <div
               className="brew-kind-picker"
               role="group"
               aria-label={t("今天喝什么")}
             >
               {(["pourOver", "milk"] as const).map((kind) => (
                 <button
                   type="button"
                   key={kind}
                   aria-pressed={brewDraft.kind === kind}
                   onClick={() => changeBrewKind(kind)}
                 >
                   <Sticker icon={kind === "milk" ? "cup" : "dripper"} />
                   <span>{t(kind === "milk" ? "奶咖" : "手冲")}</span>
                 </button>
               ))}
             </div>
             <label className="field">
               {t("今天冲哪包？")}
               <Select
                 value={brewDraft.beanId}
                 onValueChange={(s) => {
                   bd("beanId", s);
                   rememberBrewPreference(brewDraft.kind || "pourOver", s);
                 }}
               >
                 <SelectTrigger
                   className="choice brew-coffee-trigger"
                   aria-label={t("今天冲哪包？")}
                 >
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent
                   className="brew-coffee-menu"
                   position="popper"
                   align="start"
                 >
                   {beans.map((b) => (
                     <SelectItem
                       className="brew-coffee-option"
                       key={b.id}
                       value={b.id}
                       textValue={label(b)}
                     >
                       <span className="brew-coffee-choice">
                         <span
                           className="brew-coffee-art"
                           style={{ backgroundColor: beanPalette(b).fill }}
                           aria-hidden="true"
                         >
                           <BeanVisual bean={b} />
                         </span>
                         <span className="brew-coffee-name">{label(b)}</span>
                       </span>
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </label>
             <div className="form-grid brew-basics">
               <label className="field">
                 {t("日期")}
                 <input
                   required
                   type="date"
                   value={brewDraft.date || ""}
                   onInput={(e) => bd("date", e.currentTarget.value)}
                   onChange={(e) => bd("date", e.target.value)}
                 />
               </label>
               <label className="field">
                 {t("粉量（g）· 必填")}
                 <input
                   required
                   type="number"
                   inputMode="decimal"
                   min="0.1"
                   max="200"
                   step="0.1"
                   value={brewDraft.dose ?? ""}
                   onChange={(e) =>
                     bd(
                       "dose",
                       e.target.value === "" ? "" : Number(e.target.value),
                     )
                   }
                   placeholder={t("填写咖啡粉克数")}
                 />
               </label>
             </div>
             {brewDraft.kind === "pourOver" && (
               <PourTimer
                 dose={Number(brewDraft.dose)}
                 onComplete={(result) =>
                   setBrewDraft((draft: any) => ({
                     ...draft,
                     dose: result.dose,
                     water: result.water,
                     temp: result.temp ?? draft.temp,
                     time: result.time,
                     grind: result.grind,
                   }))
                 }
               />
             )}
             <section className="brew-photo-field">
               <div className="brew-photo-heading">
                 <span>{t("给这杯留张照片")}</span>
                 <small>{t("iPhone 会自动抠出咖啡并做成贴纸")}</small>
               </div>
               {brewDraft.photo ? (
                 <div className={"brew-photo-preview"+(brewDraft.photoCutout?" is-cutout":"")}>
                   <img src={brewDraft.photo} alt={t("咖啡贴纸预览")} />
                   <div>
                     <button type="button" className="secondary" onClick={()=>setBrewPhotoEdit({source:brewDraft.photo,cutout:!!brewDraft.photoCutout})}><Pencil size={15}/>{t("调整")}</button>
                     <label className="secondary">
                       {t("换一张")}
                       <input type="file" accept="image/*" onChange={(e)=>{const selected=e.target.files?.[0];e.target.value="";void addBrewPhoto(selected)}} />
                     </label>
                     <button type="button" className="icon-button" aria-label={t("移除照片")} onClick={()=>setBrewDraft((draft:any)=>({...draft,photo:undefined,photoCutout:undefined}))}><Trash2 size={17}/></button>
                   </div>
                 </div>
               ) : (
                 <div className="brew-photo-buttons">
                   <label className="secondary">
                     <Camera size={17}/>{brewPhotoBusy?t("正在制作贴纸…"):t("拍一张")}
                     <input disabled={brewPhotoBusy} type="file" accept="image/*" capture="environment" onChange={(e)=>{const selected=e.target.files?.[0];e.target.value="";void addBrewPhoto(selected)}} />
                   </label>
                   <label className="secondary">
                     {t("从相册选")}
                     <input disabled={brewPhotoBusy} type="file" accept="image/*" onChange={(e)=>{const selected=e.target.files?.[0];e.target.value="";void addBrewPhoto(selected)}} />
                   </label>
                 </div>
               )}
             </section>
             <div className="form-grid">
               <label className="field full">
                 {t("笔记")}
                 <textarea
                   rows={3}
                   maxLength={4000}
                   value={brewDraft.notes || ""}
                   onChange={(e) => bd("notes", e.target.value)}
                   placeholder={t("味道怎么样？")}
                 />
               </label>
             </div>
           </div>
           <div className="form-submit">
             {formError && (
               <p className="error" role="alert">
                 {t(formError)}
               </p>
             )}
             <button type="submit" className="primary save" disabled={busy||brewPhotoBusy}>
               {busy ? t("正在保存…") : brewPhotoBusy?t("正在制作贴纸…"):t("保存")}
             </button>
           </div>
         </form>
       </DialogContent>
     </Dialog>
     <Sheet open={!!selected} onOpenChange={(v) => !v && backFromBean()}>
       <SheetContent
         onSwipeBack={backFromBean}
         className="detail-panel"
         showCloseButton={false}
       >
         {selected && (
           <>
             {detailHeader(selected, backFromBean)}
             <div className="bean-detail-heading">
               <div className="bean-detail-copy">
                 <SheetTitle className="detail-title">
                   {label(selected)}
                 </SheetTitle>
                 {info(selected, "flavor") && (
                   <p className="original-product-name">
                     {info(selected, "flavor")}
                   </p>
                 )}
                 <SheetDescription
                   className={
                     !selected.roaster && !selected.origin ? "sr-only" : ""
                   }
                 >
                   {[selected.roaster, info(selected, "origin")]
                     .filter(Boolean)
                     .join(" · ") || t("豆子详情")}
                 </SheetDescription>
               </div>
               <div className="bean-detail-thumbnail">
                 {selected.photo ? (
                   <img src={photo(selected.photo)} alt="" />
                 ) : (
                   <BeanVisual bean={selected} />
                 )}
               </div>
             </div>
             <div className="detail-tags">
               <span>{t(selected.status)}</span>
               {selected.process !== "未记录" && (
                 <span>{t(info(selected, "process"))}</span>
               )}
               {selected.roast !== "未记录" && <span>{t(selected.roast)}</span>}
             </div>
             <p className="notes">{selected.notes}</p>
             {beanStock(selected, brews) && selected.status !== "已喝完" && (
               <section className="stock-details">
                 <StockSlider
                   key={selected.id}
                   value={beanStock(selected, brews)!.remaining}
                   max={selected.weight!}
                   label={t("剩余")}
                   disabled={busy}
                   onSave={async (remaining) => {
                     setBusy(true);
                     try {
                       await api("/api/journal", {
                         method: "PUT",
                         body: JSON.stringify({
                           kind: "stock",
                           id: selected.id,
                           remaining,
                         }),
                       });
                       await refresh();
                     } catch (error) {
                       toast.error(t((error as Error).message));
                       throw error;
                     } finally {
                       setBusy(false);
                     }
                   }}
                 />
                 {beanStock(selected, brews)!.remaining === 0 && (
                   <p className="stock-empty-hint">
                     {t("这包见底了，喝完后点下方「喝完了」收好。")}
                   </p>
                 )}
               </section>
             )}
             <CoffeeGuide bean={selected} onEdit={() => startBean(selected)} />
             <div className="detail-actions bean-detail-actions">
               <button
                 className="finish-button"
                 disabled={busy}
                 onClick={() => toggleFinished(selected)}
               >
                 <Sticker icon="cup" />
                 {selected.status === "已喝完" ? t("放回豆架") : t("喝完了")}
               </button>
               <button
                 className="primary"
                 onClick={() => startBrew(selected.id)}
               >
                 <Plus size={17} />
                 {t("记一杯")}
               </button>
               <button
                 className="secondary"
                 onClick={() => startBean(selected)}
               >
                 <Pencil size={16} />
                 {t("编辑")}
               </button>
               <button
                 className="icon-button"
                 aria-label={t("删除这包豆子")}
                 onClick={() => setDeleteId({ id: selected.id, kind: "bean" })}
               >
                 <Trash2 size={18} />
               </button>
             </div>
             <h3 className="history-title">{t("咖啡记录")}</h3>
             {brews.filter((b) => b.beanId === selected.id).length ? (
               brews
                 .filter((b) => b.beanId === selected.id)
                 .map((b) => brewCard(b))
             ) : (
               <p className="meta">{t("还没开冲")}</p>
             )}
           </>
         )}
       </SheetContent>
     </Sheet>
     <Dialog
       open={!!brewActions}
       onOpenChange={(v) => !v && setBrewActions(null)}
     >
       <DialogContent className="record-action-menu" showCloseButton={false}>
         <DialogTitle>{t("咖啡记录")}</DialogTitle>
         <DialogDescription>
           {brewActions?.date} ·{" "}
           {label(beans.find((b) => b.id === brewActions?.beanId))}
         </DialogDescription>
         <button
           type="button"
           onClick={() => {
             const record = brewActions;
             setBrewActions(null);
             if (record) editBrew(record);
           }}
         >
           <Pencil size={18} />
           {t("编辑")}
         </button>
         <button
           type="button"
           className="record-action-delete"
           onClick={() => {
             if (brewActions) setDeleteId({ id: brewActions.id, kind: "brew" });
             setBrewActions(null);
           }}
         >
           <Trash2 size={18} />
           {t("删除")}
         </button>
         <button
           type="button"
           className="record-action-cancel"
           onClick={() => setBrewActions(null)}
         >
           {t("取消")}
         </button>
       </DialogContent>
     </Dialog>
     <Dialog open={!!monthReport} onOpenChange={(open)=>!open&&setMonthReport(null)}>
       <DialogContent className="monthly-report-dialog" showCloseButton={false}>
         <header className="reel-dialog-heading">
           <button className="icon-button" onClick={()=>setMonthReport(null)} aria-label={t("关闭")}><X size={20}/></button>
           <DialogTitle>{t("月报预览")}</DialogTitle>
           <span/>
         </header>
         <DialogDescription className="sr-only">{t("查看完整月报图片后再分享")}</DialogDescription>
         {monthReport&&<img className="monthly-report-preview" src={monthReport.url} alt={t("月报预览")}/>}
         <button type="button" className="primary monthly-report-share" onClick={shareMonthlyReport}><Share2 size={18}/>{t("分享图片")}</button>
       </DialogContent>
     </Dialog>
     <AlertDialog
       open={!!deleteId}
       onOpenChange={(v) => !busy && !v && setDeleteId(null)}
     >
       <AlertDialogContent>
         <AlertDialogTitle>
           {t("删除")}
           {deleteId?.kind === "catalog"
             ? t("这款图鉴豆子")
             : deleteId?.kind === "bean"
               ? t("这包豆子")
               : t("这条咖啡记录")}
           ？
         </AlertDialogTitle>
         <AlertDialogDescription>
           {deleteId?.kind === "catalog"
             ? t("从豆子合集中移除，豆仓和咖啡记录会保留。")
             : deleteId?.kind === "bean"
               ? t("豆子和它的所有咖啡记录都会删除，无法恢复。")
               : t("这条记录会永久删除，无法恢复。")}
         </AlertDialogDescription>
         <AlertDialogFooter>
           <AlertDialogCancel disabled={busy}>{t("保留")}</AlertDialogCancel>
           <AlertDialogAction
             disabled={busy}
             onClick={(e) => {
               e.preventDefault();
               remove();
             }}
           >
             {busy ? t("正在删除…") : t("确认删除")}
           </AlertDialogAction>
         </AlertDialogFooter>
       </AlertDialogContent>
     </AlertDialog>
   </>
 );
}
