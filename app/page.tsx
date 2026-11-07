"use client";
import { useEffect,useMemo,useState,useRef,FormEvent,type CSSProperties,type ReactNode } from 'react';
import {atlasCups,byMonth,chunk,longestStreak,roasterShelves,yearDots,type AtlasCup} from '@/lib/atlas';
import {FlipBook} from '@/components/flip-book';
import {coffeeIdentity,stickerShape,type Taste} from '@/lib/tasted';
import {bagColorIndex,bagColors,beanPalette,calendarColors,randomBagColor} from '@/lib/bean-appearance';
import {brewDraftFor,brewPayload,cafeDrinks,type BrewRecord,type BrewKind} from '@/lib/brew-types';
import {RoasterInput} from '@/components/roaster-input';
import {PhotoEditor} from '@/components/photo-editor';
import {PourTimer} from '@/components/pour-timer';
import {StockSlider} from '@/components/stock-slider';
import {beanFinishedDate,beanStock,consumedBagFills} from '@/lib/bean-stock';
import {randomBeanName} from '@/lib/bean-names';
import {localApi as api,exportBackup,importBackup,compactStoredPhotos} from '@/lib/local-store';
import { ArrowLeft,Coffee,Plus,Star,Camera,ChevronDown,ChevronLeft,ChevronRight,Heart,Pencil,Trash2,Droplets,Timer,ArrowUpRight,Share2,X } from 'lucide-react';
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
import { roastGuide, flavorWindow, roastOptions, shelfPhase } from '@/lib/coffee-guide';
import { originalArt,displayedArt,beanLabel } from '@/lib/catalog';
import { LocaleProvider,useI18n } from '@/lib/i18n';
import {countryOf,processOf,matchesFilters,emptyFilters,type CatalogFilters} from '@/lib/catalog-filters';
import {PressableRecord} from '@/components/pressable-record';
import {useSwipeNavigation} from '@/components/use-swipe-navigation';
import {navigationFeedback} from '@/lib/haptic-feedback';
import {BagPaper} from '@/components/bag-paper';
import {bilingualBean,editableBeanNames,editableBeanInfo,usesOriginalBeanName} from '@/lib/catalog';
import { zhCN,enUS } from 'date-fns/locale';
import {fileDataUrl,makeCoffeeSticker,trimSticker} from '@/lib/coffee-sticker';
import {photoDate} from '@/lib/photo-date';
import {annualBrewStats,monthlyBrewStats} from '@/lib/monthly-stats';
import {buildWidgetSnapshot,parseWidgetLink} from '@/lib/widget-snapshot';
import {onWidgetLink,syncWidgets} from '@/lib/native-widget';
import {runDevSeed} from '@/lib/dev-seed';
import {installTapFallback} from '@/lib/tap-fallback';
import {compactPhoto} from '@/lib/photo-compress';
import {cloudChangedEvent,cloudStatus,cloudSyncSupported,onCloudStatus,startCloudSync,syncNow,type CloudStatus} from '@/lib/cloud-sync';
import {hasNativeTabs,onNativeTabs,syncNativeBar,syncNativeTabs} from '@/lib/native-tabs';
type Bean={restDays?:number;bagColor?:number;weight?:number;stockAdjustment?:number;finishedDate?:string;nameEn?:string;useOriginalArt?:boolean;recordType?:string;catalogId?:string;sourceUrl?:string;sourceDate?:string;variety?:string;roastNote?:string;icon?:string;id:string;name:string;roaster:string;origin:string;process:string;roast:string;flavor:string;status:string;rating:number;repurchase:boolean;photo:string;photoCutout?:boolean;roastDate:string;notes:string};
type Brew=BrewRecord;
const fresh={icon:'bag',name:'',nameEn:'',roaster:'',origin:'',process:'未记录',roast:'',flavor:'',status:'未开封',rating:0,repurchase:false,photo:'',roastDate:'',notes:''};
const photo=(key:string)=>key;
const brewPreferenceKey='beanlet-brew-preference';
// grind is kept per kind and per kind+bag, so each bag reopens with the grind last used for it.
type BrewPreference={kind?:BrewKind;beanId?:string;dose?:Partial<Record<BrewKind,number>>;grind?:Record<string,string>};
function brewPreference(){try{return JSON.parse(localStorage.getItem(brewPreferenceKey)||'{}') as BrewPreference}catch{return {}}}
function saveBrewPreference(next:BrewPreference){try{localStorage.setItem(brewPreferenceKey,JSON.stringify(next))}catch{}}
function rememberBrewPreference(kind:BrewKind,beanId?:string){saveBrewPreference({...brewPreference(),kind,beanId})}
function rememberedBrew(kind:BrewKind,beanId?:string){const p=brewPreference();return {dose:p.dose?.[kind],grind:(beanId&&p.grind?.[`${kind}:${beanId}`])||p.grind?.[kind]}}
function rememberBrewSettings(kind:BrewKind,beanId:string,dose:number,grind:string){const p=brewPreference(),grinds={...p.grind};if(grind){grinds[kind]=grind;grinds[`${kind}:${beanId}`]=grind}else delete grinds[`${kind}:${beanId}`];saveBrewPreference({...p,kind,beanId,dose:{...p.dose,[kind]:dose},grind:grinds})}
// New bags start from the roast, bag weight and resting days of the last bag added; resting days are kept per roast.
const beanPreferenceKey='beanlet-bean-preference';
type BeanPreference={roast?:string;weight?:number;rest?:Record<string,number>};
function beanPreference(){try{return JSON.parse(localStorage.getItem(beanPreferenceKey)||'{}') as BeanPreference}catch{return {}}}
function rememberBeanPreference(roast:string,weight?:number,restDays?:number){const p=beanPreference(),rest={...p.rest};if(restDays===undefined)delete rest[roast];else rest[roast]=restDays;try{localStorage.setItem(beanPreferenceKey,JSON.stringify({roast,weight:weight??p.weight,rest}))}catch{}}
function rememberedBean(roast?:string){const p=beanPreference(),known=roast??(p.roast&&roastOptions.includes(p.roast)?p.roast:'');return {roast:known,weight:p.weight,restDays:known?p.rest?.[known]:undefined}}
const restValue=(value:unknown)=>value===''||value==null?undefined:Number(value);

const icons=[{id:'cafe',name:'探店'},{id:'bag',name:'豆袋'},{id:'cup',name:'咖啡杯'},{id:'dripper',name:'手冲壶'},{id:'flower',name:'小花'},{id:'berry',name:'莓果'},{id:'blueberry',name:'蓝莓'},{id:'citrus',name:'柑橘'},{id:'peach',name:'蜜桃'},{id:'grape',name:'葡萄'},{id:'jasmine',name:'茉莉'},{id:'honey',name:'蜂蜜'},{id:'chocolate',name:'巧克力'},{id:'hazelnut',name:'榛果'},{id:'tea',name:'红茶'},{id:'brownie',name:'布朗尼'}];
function Sticker({icon='bag',className=''}:{icon?:string;className?:string}){if(icon==='cherry'||icon==='cookie')icon='brownie';const {t,language,label}=useI18n();return <span role="img" aria-label={t(icons.find(x=>x.id===icon)?.name||'豆袋')} className={`sticker sticker-${icon} ${className}`}/>}
function BeanVisual({bean}:{bean?:Bean}){const {t,language,label}=useI18n();return bean?.photo?<img className={"bean-thumb"+(bean.photoCutout?" is-cutout":"")} src={photo(bean.photo)} alt={t(bean.name)}/>:displayedArt(bean)?<img className="bean-thumb original-art" src={displayedArt(bean)} alt={`${t(bean?.name||"")} · ${t("水彩封面")}`} loading="lazy"/>:<Sticker icon={bean?.icon}/>}
function dateKey(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
const cloudLabels:Record<CloudStatus,string>={off:'iCloud 同步准备中',syncing:'正在与 iCloud 同步…',synced:'已通过 iCloud 同步',unavailable:'未登录 iCloud，记录只保存在这台设备',error:'iCloud 同步失败，稍后会自动重试'};
function CoffeeGuide({bean,onEdit}:{bean:Bean;onEdit:()=>void}){const {t,language,label}=useI18n();const guide=roastGuide(bean.roast,bean.roaster),window=flavorWindow(bean.roast,bean.roastDate,dateKey(new Date()),bean.roaster,bean.restDays);return <section className="coffee-guide"><div className="guide-heading"><Sticker icon="dripper"/><h3>{t("这包怎么喝")}</h3></div>{bean.roastDate&&<p className="guide-roast-date">{t("烘焙于")} <time dateTime={bean.roastDate}>{bean.roastDate}</time></p>}{guide?<><span className="meta">{t("养豆与最佳赏味期 · 参考")}</span><strong>{t(window.label)}</strong><p className="guide-dates">{t(window.dates)}</p><p className="guide-dates">{t(window.hint)}</p><div className="guide-recipe"><span>{guide.temp} °C</span><span>{guide.ratio}</span><span>{t(guide.grind)}</span></div><Collapsible><CollapsibleTrigger className="guide-more">{t("小贴士")}<ChevronDown size={13}/></CollapsibleTrigger><CollapsibleContent><p>{t("先用 15 g 粉，闷蒸 30–45 秒。酸涩偏薄试着磨细，苦涩试着磨粗，每次只改一项。")}</p><p>{t("常温密封整豆的估算范围，开封与储存会影响风味，以烘焙商建议和实际味道为准。赏味窗口不是保质期。")}</p><p>{/hydrangea/i.test(bean.roaster)&&<><a href="https://hydrangea.coffee/pages/faq" target="_blank" rel="noreferrer">{t("Hydrangea 官方：养豆 2–3 周，佳期 4–6 周")}</a>{t("。浅烘焙优先采用此建议。")}<br/></>}{t("参考")}<a href="https://rovala.nl/en/pages/brewing-tips" target="_blank" rel="noreferrer">{t("Rovala 冲煮指南")}</a> · <a href="https://sca.coffee/sca-news/coffee-decoded-9-fresh-coffee" target="_blank" rel="noreferrer">{t("SCA 新鲜度")}</a>{t("；中间烘焙度与窗口终点为综合估算。")}</p></CollapsibleContent></Collapsible></>:<button className="guide-edit" onClick={onEdit}>{t(window.label)} <Pencil size={14}/></button>}</section>}
function Choice({label,value,options,onChange}:{label:string;value:string;options:string[];onChange:(s:string)=>void}){const {t}=useI18n();return <label className="field">{label}<Select value={value} onValueChange={onChange}><SelectTrigger className="choice"><SelectValue placeholder={t("请选择")}/></SelectTrigger><SelectContent>{options.map(x=><SelectItem key={x} value={x}>{t(x)}</SelectItem>)}</SelectContent></Select></label>}
function Rating({value,onChange}:{value:number;onChange?:(n:number)=>void}){const {t,language,label}=useI18n();return <div className="stars" aria-label={t(`评分 ${value} / 5`)}>{[1,2,3,4,5].map(n=>onChange?<button key={n} type="button" aria-label={t(`${n} 星`)} aria-pressed={value===n} onClick={()=>onChange(n)}><Star size={23} fill={n<=value?'currentColor':'none'}/></button>:<Star key={n} size={15} fill={n<=value?'currentColor':'none'}/>)}</div>}
export default function Home(){return <LocaleProvider><Journal/></LocaleProvider>}
function Journal(){

 const {t,language,setLanguage,label,otherLabel,info}=useI18n();const [settingsOpen,setSettingsOpen]=useState(false);const [filters,setFilters]=useState<CatalogFilters>({...emptyFilters});
 const [today,setToday]=useState(()=>dateKey(new Date()));useEffect(()=>{const timer=setInterval(()=>setToday(dateKey(new Date())),60000);return()=>clearInterval(timer)},[]);
 const [favorites,setFavorites]=useState<string[]>([]),[returnToTaste,setReturnToTaste]=useState<string|null>(null);
 const [flippedSticker,setFlippedSticker]=useState<string|null>(null);
 const [beansView,setBeansView]=useState<'shelf'|'catalog'>('shelf'),[tasted,setTasted]=useState<Taste<Bean>[]>([]),[tasteDetail,setTasteDetail]=useState<string|null>(null);
 const [catalog,setCatalog]=useState<Bean[]>([]),[catalogQuery,setCatalogQuery]=useState(''),[pickerOpen,setPickerOpen]=useState(false),[saveToCatalog,setSaveToCatalog]=useState(true);
 const [beans,setBeans]=useState<Bean[]>([]),[brews,setBrews]=useState<Brew[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[tab,setTab]=useState('beans'),[beanShelfWaving,setBeanShelfWaving]=useState(false);

 const [viewBrew,setViewBrew]=useState<Brew|null>(null),[zoomPhoto,setZoomPhoto]=useState<{src:string;cutout:boolean}|null>(null),[photoSource,setPhotoSource]=useState<File|string|null>(null),[photoMode,setPhotoMode]=useState<'photo'|'sticker'>('photo'),[beanPhoto,setBeanPhoto]=useState<{original:File;cutout?:string}|null>(null),[beanPhotoBusy,setBeanPhotoBusy]=useState(false);
 const [editing,setEditing]=useState<string|null>(null),[beanOpen,setBeanOpen]=useState(false),[draft,setDraft]=useState<any>(fresh),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[detail,setDetail]=useState<string|null>(null),[busy,setBusy]=useState(false),[formError,setFormError]=useState('');
 const beanInitialDraft=useRef(''),brewInitialDraft=useRef('');
 const [calendarDay,setCalendarDay]=useState(()=>new Date()),[calendarMonth,setCalendarMonth]=useState(()=>new Date());
 // A year's journal (图鉴, or a month's journal entry in the calendar): open at `journalTarget` ('YYYY-MM').
 const [journalYear,setJournalYear]=useState<number|null>(null),[journalTarget,setJournalTarget]=useState('');
 // Opening a journal shows the whole month rail for a moment before it folds, so the margin is known to open.
 function openJournal(year:number,month=''){setJournalTarget(month);setJournalYear(year);setRailOpen(year!==0)}
 const [editingBrew,setEditingBrew]=useState<string|null>(null);
 const [brewOpen,setBrewOpen]=useState(false),[brewDraft,setBrewDraft]=useState<any>({}),[brewPhotoBusy,setBrewPhotoBusy]=useState(false),[brewPhotoEdit,setBrewPhotoEdit]=useState<{source:string;cutout:boolean}|null>(null),[deleteId,setDeleteId]=useState<{id:string;kind:string}|null>(null);
 async function refresh(){try{const data=await api('/api/journal');setBeans(data.beans);setCatalog(data.catalog);setBrews(data.brews);setTasted(data.tasted||[]);setFavorites(data.favorites||[]);setError('')}catch(e){setError((e as Error).message)}finally{setLoading(false)}}
 useEffect(()=>{runDevSeed().catch(()=>false).finally(refresh)},[]);
 const [cloud,setCloud]=useState(cloudStatus());
 useEffect(()=>{const changed=()=>{refresh()};window.addEventListener(cloudChangedEvent,changed);const off=onCloudStatus(()=>setCloud(cloudStatus()));compactStoredPhotos(compactPhoto).then(changed=>{if(changed)refresh()},()=>{}).finally(startCloudSync);return()=>{window.removeEventListener(cloudChangedEvent,changed);off()}},[]);
 useEffect(()=>{if(tab!=='beans'||loading){setBeanShelfWaving(false);return}setBeanShelfWaving(false);const start=window.setTimeout(()=>setBeanShelfWaving(true),60),stop=window.setTimeout(()=>setBeanShelfWaving(false),2600);return()=>{window.clearTimeout(start);window.clearTimeout(stop)}},[tab,loading]);
 useEffect(()=>{if(!file){setPreview('');return}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);
 useEffect(()=>{const ctx=(document as any).modelContext;if(!ctx?.registerTool)return;const life=new AbortController();try{Promise.resolve(ctx.registerTool({name:'start_coffee_bean_collection',description:'打开新增咖啡豆表单；不会保存记录。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute(input:unknown){if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('Expected an empty object');const next={...fresh};beanInitialDraft.current=JSON.stringify(next);setEditing(null);setDraft(next);setFile(null);setFormError('');setBeanOpen(true);return {opened:true,saved:false}}},{signal:life.signal})).catch(()=>{})}catch{}return()=>life.abort()},[]);
 function startBean(b?:Bean,asCatalog=false){const next=b?{...fresh,...b,...editableBeanNames(b),...editableBeanInfo(b),bagColor:bagColorIndex(b,!!displayedArt(b))}:{...fresh,recordType:asCatalog?'catalog':'bean',bagColor:randomBagColor(),...(asCatalog?{roast:rememberedBean().roast}:rememberedBean())};beanInitialDraft.current=JSON.stringify(next);setSaveToCatalog(!b);setPickerOpen(false);setEditing(b?.id||null);setDraft(next);setFile(null);setFormError('');setBeanOpen(true)}
 function startBrew(id?:string,forToday=false){setEditingBrew(null);const available=beans.filter(bean=>bean.status!=='已喝完'),last=brews.find(brew=>available.some(bean=>bean.id===brew.beanId)),preference=brewPreference(),kind:BrewKind=!available.length?'cafe':preference.kind==='milk'||preference.kind==='pourOver'?preference.kind:last?.kind==='milk'?'milk':'pourOver',beanId=id&&available.some(bean=>bean.id===id)?id:(available.some(b=>b.id===preference.beanId)?preference.beanId:available.some(b=>b.id===last?.beanId)?last!.beanId:available[0]?.id)||'',next={...brewDraftFor(kind,brews,rememberedBrew(kind,beanId)),beanId,date:!forToday&&tab==='brews'?dateKey(calendarDay):dateKey(new Date()),notes:'',rating:0};if(kind!=='cafe')rememberBrewPreference(kind,beanId);brewInitialDraft.current=JSON.stringify(next);setBrewDraft(next);setFormError('');setBrewOpen(true)}
 function editBrew(b:Brew,preview=true){if(preview){setViewBrew(b);return}setViewBrew(null);const next={...b,kind:b.kind||'pourOver'};brewInitialDraft.current=JSON.stringify(next);setEditingBrew(b.id);setBrewDraft(next);setFormError('');setBrewOpen(true)}
 function changeBrewKind(kind:BrewKind){const beanId=brewDraft.beanId||beans.find(bean=>bean.status!=='已喝完')?.id||'';if(kind!=='cafe')rememberBrewPreference(kind,beanId);if(kind===brewDraft.kind)return;setBrewDraft((draft:any)=>({...draft,...brewDraftFor(kind,brews,rememberedBrew(kind,beanId)),beanId}))}
 // Cafés visited before, most recent first, so the next visit is one tap.
 const recentPlaces=[...new Map(brews.filter(b=>b.kind==='cafe'&&b.place?.trim()).sort((a,b)=>b.date.localeCompare(a.date)).map(b=>[b.place!.trim().toLowerCase(),b.place!.trim()] as const)).values()].slice(0,8);
 function brewTitle(b:Brew){return b.kind==='cafe'?(b.place||t('探店')):label(beans.find(x=>x.id===b.beanId))}
 // A bag photo: lift the bag out of the photo when the phone can, so it stands on the shelf as itself; keep the original to fall back to.
 async function addBeanPhoto(file:File){setBeanPhotoBusy(true);setFormError('');let cutout:string|undefined;try{const sticker=await makeCoffeeSticker(file);if(sticker.photoCutout)cutout=sticker.photo}catch{}finally{setBeanPhotoBusy(false)}setBeanPhoto({original:file,cutout});setPhotoMode(cutout?'sticker':'photo');setPhotoSource(cutout||file)}
 useEffect(()=>{if(!beanOpen)setBeanPhoto(null)},[beanOpen]);
 async function addBrewPhoto(file?:File){if(!file)return;setBrewPhotoBusy(true);setFormError('');
  // The cup's day follows the photo's: the date it was taken goes into the record (still editable), with a note saying so.
  const taken=await photoDate(file);if(taken&&taken<=dateKey(new Date())&&taken!==brewDraft.date){bd('date',taken);toast(language==='en'?`Date set to ${taken}, when the photo was taken`:`已按照片拍摄时间填入日期 ${taken.replaceAll('-','.')}`)}
  try{const sticker=await makeCoffeeSticker(file);setBrewPhotoEdit({source:sticker.photo,cutout:sticker.photoCutout})}catch(error){setFormError((error as Error).message)}finally{setBrewPhotoBusy(false)}}
 async function saveBean(e:FormEvent){e.preventDefault();if(!roastOptions.includes(draft.roast)){setFormError('先选一个烘焙度');return;}if(draft.recordType!=='catalog'&&draft.roastDate>dateKey(new Date())){setFormError('烘焙日期不能在未来');return;}const restDays=draft.recordType==='catalog'?undefined:restValue(draft.restDays);if(restDays!==undefined&&!(Number.isInteger(restDays)&&restDays>=0&&restDays<=90)){setFormError('养豆天数请填 0–90 的整数');return;}setBusy(true);setFormError('');try{let key=draft.photo;if(file){const f=new FormData();f.set('photo',file);key=(await api('/api/photos',{method:'POST',body:f})).key;setDraft((d:any)=>({...d,photo:key}));setFile(null)}const previous=editing?beans.find(bean=>bean.id===editing):undefined;const data={...draft,...(draft.recordType==='catalog'&&!editing?{roastDate:'',status:'未开封',notes:''}:{}),roaster:draft.roaster.trim(),weight:draft.recordType==='catalog'||draft.weight===''||draft.weight==null?undefined:Number(draft.weight),stockAdjustment:draft.recordType==='catalog'?undefined:draft.stockAdjustment,restDays,finishedDate:draft.recordType==='catalog'||draft.status!=='已喝完'?'':draft.finishedDate||previous?.finishedDate||dateKey(new Date()),nameEn:draft.nameEn?.trim()||'',name:draft.name.trim()||draft.nameEn?.trim()||randomBeanName(language,[...beans,...catalog].map(b=>b.name)),photo:key};const saved=await api('/api/journal',{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'bean',id:editing,data,saveToCatalog:!editing&&saveToCatalog&&draft.recordType!=='catalog'&&!draft.catalogId})});if(!editing&&draft.recordType!=='catalog')rememberBeanPreference(data.roast,data.weight,restDays);setBeanOpen(false);if(!editing){setTab('beans');setBeansView(draft.recordType==='catalog'?'catalog':'shelf')}await refresh();toast.success(t(editing?'豆子资料已更新':draft.recordType==='catalog'?'已加入豆子合集':'已放进豆仓'))}catch(e){setFormError((e as Error).message)}finally{setBusy(false)}}
 async function saveBrew(e:FormEvent){e.preventDefault();const cafe=brewDraft.kind==='cafe';if(cafe&&!String(brewDraft.place||'').trim()){setFormError('写一下在哪家店喝的');return}if(!cafe&&(!Number.isFinite(Number(brewDraft.dose))||Number(brewDraft.dose)<=0||Number(brewDraft.dose)>200)){setFormError('请填写粉量（大于 0，最多 200 g）');return}setBusy(true);setFormError('');try{await api('/api/journal',{method:editingBrew?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'brew',id:editingBrew,data:brewPayload(brewDraft)})});if(!editingBrew&&!cafe)rememberBrewSettings(brewDraft.kind||'pourOver',brewDraft.beanId,Number(brewDraft.dose),(brewDraft.grind||'').trim());const cafeCoffee=cafe&&brewDraft.catalogId?catalog.find(b=>b.id===brewDraft.catalogId):undefined;if(cafeCoffee&&!tasted.some(x=>x.id===coffeeIdentity(cafeCoffee)))await api('/api/journal',{method:'POST',body:JSON.stringify({kind:'taste',data:cafeCoffee})}).catch(()=>{});setBrewOpen(false);const savedDate=new Date(brewDraft.date+'T12:00:00');setCalendarDay(savedDate);setCalendarMonth(savedDate);await refresh();toast.success(t(editingBrew?'咖啡记录已更新':'这杯咖啡，记下了'))}catch(e){setFormError((e as Error).message)}finally{setBusy(false)}}
 async function remove(){if(!deleteId)return;setBusy(true);try{await api('/api/journal',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify(deleteId)});if(deleteId.kind==='bean')setDetail(null);if(deleteId.kind==='catalog'){setBeanOpen(false);setEditing(null)}if(deleteId.kind==='brew'){setBrewOpen(false);setEditingBrew(null)}setDeleteId(null);await refresh();toast.success(t('记录已删除'))}catch(e){toast.error(t((e as Error).message))}finally{setBusy(false)}}
 function chooseCatalog(b:Bean){const next={...fresh,...b,...editableBeanNames(b),...editableBeanInfo(b),weight:rememberedBean(b.roast).weight,restDays:rememberedBean(b.roast).restDays,stockAdjustment:undefined,id:undefined,recordType:'bean',catalogId:b.id,bagColor:randomBagColor(),roastDate:'',status:'未开封',rating:0,repurchase:false,notes:''};beanInitialDraft.current=JSON.stringify(next);setEditing(null);setDraft(next);setSaveToCatalog(false);setPickerOpen(false);setFile(null);setFormError('');setBeanOpen(true)}
 const catalogShown=catalog.filter(b=>matchesFilters(b,filters)&&[b.name,...Object.values(bilingualBean(b)),b.roaster,b.origin,b.flavor,b.variety,t(b.roast),t(b.process)].join(' ').toLowerCase().includes(catalogQuery.trim().toLowerCase()));
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

 const selected=beans.find(b=>b.id===detail),shown=beans.filter(b=>b.status!=='已喝完');const d=(key:string,value:unknown)=>setDraft((p:any)=>({...p,[key]:value}));const bd=(key:string,value:unknown)=>setBrewDraft((p:any)=>({...p,[key]:value}));
 const paletteFor=(bean:Pick<Bean,'id'> & Partial<Bean>)=>beanPalette(bean,!!displayedArt(bean));
 const monthStats=monthlyBrewStats(brews,calendarMonth.getFullYear(),calendarMonth.getMonth()+1),monthBrews=monthStats.records,monthPourOvers=monthStats.pourOvers,monthMilks=monthStats.milks,monthCafes=monthStats.cafes;
 // Statistics for a year, or one month of it: how the cups were made, the trend (by day or by month), the coffees that
 // went furthest (in bags) and the cafés. The year journal shows them for the year and at the start of each month.
 function periodStats(year:number,month?:number){
  const stats=month?monthlyBrewStats(brews,year,month):annualBrewStats(brews,year),records=stats.records;
  const trend=('months' in stats?stats.months:[]).map(({label,cups})=>({label,cups})),trendMax=Math.max(1,...trend.map(point=>point.cups));
  const beanIds=new Set(records.map(brew=>brew.beanId));
  const bagRanking=[...beans.filter(bean=>beanIds.has(bean.id)).reduce((groups,bean)=>{const key=coffeeIdentity(bean),group=groups.get(key)||{key,bean,bags:[] as Bean[],drunk:0,bagUnits:0},drunk=records.filter(brew=>brew.beanId===bean.id).reduce((sum,brew)=>sum+(brew.dose||15),0),bagWeight=bean.weight&&Number.isFinite(bean.weight)&&bean.weight>0?bean.weight:250;group.bags.push(bean);group.drunk+=drunk;group.bagUnits+=drunk/bagWeight;groups.set(key,group);return groups},new Map<string,{key:string;bean:Bean;bags:Bean[];drunk:number;bagUnits:number}>()).values()].sort((a,b)=>b.drunk-a.drunk||b.bagUnits-a.bagUnits||label(a.bean).localeCompare(label(b.bean))).slice(0,month?3:5);
  const kindData=(records.length?[{name:t('手冲'),value:stats.pourOvers,color:'#8b6b4a'},{name:t('奶咖'),value:stats.milks,color:'#cdb08a'},{name:t('探店'),value:stats.cafes,color:'#9aa58c'}]:[{name:t('暂无记录'),value:1,color:'#e4dfd5'}]).filter(item=>item.value>0);
  return {year,month,records,pourOvers:stats.pourOvers,milks:stats.milks,cafes:stats.cafes,places:stats.places,trend,trendMax,trendTicks:Array.from(new Set([0,Math.ceil(trendMax/2),trendMax])),bagRanking,kindData,photos:records.filter(brew=>brew.photo).sort((a,b)=>b.date.localeCompare(a.date))};
 }
 type PeriodStats=ReturnType<typeof periodStats>;
 // The methods ring as a conic gradient: drawn in one paint, so a turned-to page never redraws it.
 function donutGradient(parts:{value:number;color:string}[]){const total=parts.reduce((sum,part)=>sum+part.value,0)||1;let at=0;return `conic-gradient(${parts.map(part=>{const from=at;at+=part.value/total*100;return `${part.color} ${from}% ${at}%`}).join(',')})`}
 // The calendar month's journal entry, under its cup count: two or three photos fanned as polaroids; opens that
 // year's journal at the month.
 function monthGlance(){
  const year=calendarMonth.getFullYear(),month=`${year}-${String(calendarMonth.getMonth()+1).padStart(2,'0')}`,name=new Intl.DateTimeFormat(language==='en'?'en-US':'zh-CN',{month:'long'}).format(calendarMonth);
  return <button type="button" className="month-glance" disabled={!monthBrews.length} onClick={()=>openJournal(year,month)} aria-label={`${name} · ${monthBrews.length} ${t('杯')} · ${t('月手帐')}`}>
   {journalPicks.length>0?<span className="month-journal-fan">{journalPicks.map((brew,index)=><figure key={brew.id} className={brew.photoCutout?'is-cutout':''} style={{'--i':index,'--n':journalPicks.length} as CSSProperties}><span className="fan-photo"><img src={brew.photo} alt=""/></span></figure>)}</span>
    :<span className="month-glance-total"><strong>{monthBrews.length}</strong><small>{t('杯')}</small></span>}
   <span className="month-glance-body">
    <span className="month-glance-title">{language==='en'?`${new Intl.DateTimeFormat('en-US',{month:'short'}).format(calendarMonth)} journal`:`${calendarMonth.getMonth()+1}月手帐`}<b>{monthBrews.length}</b>{t('杯')}</span>
    {monthBrews.length>0&&<span className="month-glance-bar" aria-hidden="true">{[[monthPourOvers,'#8b6b4a'],[monthMilks,'#cdb08a'],[monthCafes,'#9aa58c']].filter(([n])=>+n>0).map(([n,c])=><i key={c} style={{flexGrow:+n,background:c as string}}/>)}</span>}
    <span className="month-glance-cells"><span><i style={{background:'#8b6b4a'}}/>{t('手冲')}<strong>{monthPourOvers}</strong></span><span><i style={{background:'#cdb08a'}}/>{t('奶咖')}<strong>{monthMilks}</strong></span><span><i style={{background:'#9aa58c'}}/>{t('探店')}<strong>{monthCafes}</strong></span></span>
   </span>
   {monthBrews.length>0&&<ChevronRight size={18} className="month-glance-arrow"/>}
  </button>;
 }
 // The calendar's month: its best two or three photos make the cover of its journal entry.
 const monthPhotos=monthBrews.filter(brew=>brew.photo).sort((a,b)=>b.date.localeCompare(a.date)),journalPicks=[...monthPhotos].sort((a,b)=>(b.rating||0)-(a.rating||0)||b.date.localeCompare(a.date)).slice(0,3);
 function shiftCalendarMonth(offset:number){setCalendarMonth(current=>{const next=new Date(current.getFullYear(),current.getMonth()+offset,1),now=new Date();setCalendarDay(next.getFullYear()===now.getFullYear()&&next.getMonth()===now.getMonth()?now:next);return next});navigationFeedback()}
 async function toggleFinished(b:Bean){if(busy)return;setBusy(true);try{const finishing=b.status!=='已喝完';await api('/api/journal',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'bean',id:b.id,data:{...b,status:finishing?'已喝完':'正在喝',finishedDate:finishing?b.finishedDate||dateKey(new Date()):''}})});await refresh();toast.success(t(b.status==='已喝完'?'放回豆架了':'收进喝完的豆子了'))}catch(e){toast.error(t((e as Error).message))}finally{setBusy(false)}}
 // A bag as it stands on the shelf: drawn (its picture on the label) or the real one lifted from a photo, with its tags.
 function bagVisual(b:Bean,group?:Bean[],stock?:ReturnType<typeof beanStock>,coverFade=0){return <div className={'coffee-bag'+(b.photo&&b.photoCutout?' is-real':'')} style={{'--bag-fill':paletteFor(b).fill,'--bag-line':paletteFor(b).line,'--bag-side':paletteFor(b).side} as CSSProperties}>{group&&group.length>1&&<span className="finished-count"><span className="finished-times">×</span>{group.length}</span>}{b.roaster&&<span className="bag-brand-tag" title={b.roaster}><span>{b.roaster}</span></span>}{b.photo&&b.photoCutout?<span className="real-bag" style={{'--drunk':1-(stock?.ratio??1)} as CSSProperties}><img className="real-bag-empty" src={photo(b.photo)} alt=""/><img className="real-bag-full" src={photo(b.photo)} alt={label(b)} onLoad={event=>{const img=event.currentTarget;if(img.naturalHeight)img.closest<HTMLElement>('.coffee-bag')?.style.setProperty('--r',String(img.naturalWidth/img.naturalHeight))}}/><i className="real-bag-tape" aria-hidden="true"/></span>:<><BagPaper ratio={stock?.ratio} sway={beanShelfWaving}/><span style={stock?{'--water-stop':`${coverFade*100}%`,maskImage:'linear-gradient(var(--water-angle,172.47deg),rgba(0,0,0,.18) var(--water-stop),#000 var(--water-stop))'} as CSSProperties:undefined} className={'coffee-bag-label label-shape-'+stickerShape(b.id)+(b.photo||displayedArt(b)?' has-picture':'')+(beanShelfWaving?' is-swaying':'')}><BeanVisual bean={b}/></span></>}{b.roastDate&&(!group||group.length===1)&&<span className="bag-date-tag" title={t('烘焙于')+' '+b.roastDate} aria-label={t('烘焙于')+' '+b.roastDate}><time dateTime={b.roastDate}>{b.roastDate.replaceAll('-','.')}</time></span>}<span className="bag-meta-row">{stock&&!group&&<span className="bag-remaining" aria-label={language==='en'?`${stock.remaining}g remaining`:`剩余 ${stock.remaining}g`}>{stock.remaining}<small>g</small></span>}</span>{isFavorite(b)&&<span className="bag-heart" aria-label={t("已收藏")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.2 20.7C10.5 19.4 4.1 15.5 3.7 9.9 3.5 7.1 5.2 5.1 7.9 5c1.7-.1 3.3.8 4.2 2.2.8-1.6 2.3-2.7 4.2-2.8 2.7-.1 4.5 1.7 4.5 4.4.1 5.8-6.9 10.7-8.6 11.9Z"/></svg></span>}</div>}
 function beanCard(b:Bean,group?:Bean[]){const phase=b.status==='已喝完'?undefined:shelfPhase(flavorWindow(b.roast,b.roastDate,today,b.roaster,b.restDays)),stock=beanStock(b,brews),fade=stock?1-stock.ratio:0,coverFade=((14+fade*184)-66)/92;return <button className="bean-card" key={b.id} aria-label={label(b)+(group?` · ${group.length} ${t('包')}`:'')} onClick={()=>{setReturnToTaste(null);if(group){setTasteDetail(coffeeIdentity(b))}else setDetail(b.id)}}>{bagVisual(b,group,stock,coverFade)}<div className="bean-info"><h3>{label(b)}</h3>{info(b,'flavor')&&<p className="shelf-name-secondary">{info(b,'flavor')}</p>}{phase&&<span className={'bag-phase is-'+phase.phase}>{t(phase.label)}</span>}</div></button>}

 function brewCard(b:Brew,hideDate=false,inMemory=false){if(b.kind==='cafe'){const coffee=b.catalogId?catalog.find(x=>x.id===b.catalogId):undefined;return <div key={b.id} className="brew-swipe-row"><PressableRecord className={'brew-card cafe-card'+(b.photo?' has-brew-photo':'')} label={brewTitle(b)+' · '+b.date+' · '+t('点击编辑记录')} onClick={()=>editBrew(b)}><span className="brew-bean cafe-badge" aria-hidden="true"><Sticker icon="cafe"/></span>{b.photo&&<span className={'brew-photo-sticker'+(b.photoCutout?' is-cutout':'')} aria-label={t('这杯咖啡的照片')}><img src={b.photo} alt=""/></span>}<div className="brew-body"><div className="row"><h3>{brewTitle(b)}</h3></div>{!hideDate&&<span className="meta brew-record-date">{b.date}</span>}<div className="parameters"><span className="cafe-tag">{t('探店')}</span>{b.drink&&<span>{t(b.drink)}</span>}{b.serving&&b.serving!=='未记录'&&<span>{t(b.serving)}</span>}</div>{coffee&&<p className="meta brew-method">{label(coffee)}{coffee.roaster?` · ${coffee.roaster}`:''}</p>}{b.notes&&<p className="notes">{b.notes}</p>}{b.rating>0&&<Rating value={b.rating}/>}</div></PressableRecord></div>}const hasDetails=!!(b.dose||b.grind||b.time||b.notes||b.rating||b.photo||(b.kind==='milk'?(b.yield||b.milkAmount||(b.milkType&&b.milkType!=='未记录')||(b.serving&&b.serving!=='未记录')):(b.water||b.temp)));return <div key={b.id} className="brew-swipe-row"><PressableRecord className={'brew-card'+(hasDetails?'':' brew-card-compact')+(inMemory?' memory-coffee-record':'')+(b.photo?' has-brew-photo':'')} label={label(beans.find(x=>x.id===b.beanId))+' · '+b.date+' · '+t('点击编辑记录')} onClick={()=>editBrew(b)}>{!inMemory&&<span className="brew-bean" style={{backgroundColor:paletteFor(beans.find(x=>x.id===b.beanId)||{id:b.beanId}).fill}} aria-hidden="true"><BeanVisual bean={beans.find(x=>x.id===b.beanId)}/></span>}{b.photo&&<span className={'brew-photo-sticker'+(b.photoCutout?' is-cutout':'')} aria-label={t('这杯咖啡的照片')}><img src={b.photo} alt=""/></span>}<div className="brew-body"><div className="row"><h3>{inMemory?<time dateTime={b.date}>{new Intl.DateTimeFormat(language==='en'?'en-US':'zh-CN',{year:'numeric',month:'short',day:'numeric'}).format(new Date(b.date+'T12:00:00'))}</time>:label(beans.find(x=>x.id===b.beanId))}</h3></div>{!hideDate&&!inMemory&&<span className="meta brew-record-date">{b.date}</span>}<div className="parameters">{b.dose!=null&&<span>{b.dose} {t('g 粉')}</span>}{b.kind==='milk'?<>{b.yield!=null&&<span>{t('出液')} {b.yield} g</span>}{b.milkAmount!=null&&<span>{t('奶量')} {b.milkAmount} ml</span>}{b.milkType&&b.milkType!=='未记录'&&<span>{t(b.milkType)}</span>}{b.serving&&b.serving!=='未记录'&&<span>{t(b.serving)}</span>}</>:<>{b.water!=null&&<span>{b.water} {t('ml 水')}</span>}{b.temp!=null&&<span>{b.temp} °C</span>}{!!b.dose&&!!b.water&&<span>1 : {(b.water/b.dose).toFixed(1)}</span>}</>}</div>{(b.grind||b.time)&&<p className="meta brew-method">{[b.grind&&t(`研磨 ${b.grind}`),b.time&&t(`用时 ${b.time}`)].filter(Boolean).join(' · ')}</p>}{b.notes&&<p className="notes">{b.notes}</p>}{b.rating>0&&<Rating value={b.rating}/>}</div></PressableRecord></div>}
 // 图鉴: a shelf with one journal per year. A year's journal turns its pages under the finger (components/flip-book.tsx):
 // a month index first, then the year's statistics, then every cup of the year as polaroids, six to a page, in date
 // order whatever the way it was made. A month's name heads only the page where that month begins.
 const allCups=useMemo(()=>atlasCups(beans,brews),[beans,brews]);
 const shelves=useMemo(()=>roasterShelves(catalog,tasted),[catalog,tasted]);
 const journalYears=useMemo(()=>[...new Set([new Date().getFullYear(),...allCups.map(cup=>Number(cup.date.slice(0,4)))])].sort((a,b)=>b-a),[allCups]);
 const monthName=(month:string)=>new Intl.DateTimeFormat(language==='en'?'en-US':'zh-CN',{year:'numeric',month:'long'}).format(new Date(month+'-15T12:00:00'));
 const stars=(n:number)=>n>0?<span className="atlas-stars" aria-label={t(`评分 ${n} / 5`)}>{'★'.repeat(n)}<i>{'★'.repeat(5-n)}</i></span>:null;
 const bookJump=useRef<((page:number)=>void)|null>(null),monthFirstPage=useRef(new Map<string,number>()),[journalAt,setJournalAt]=useState(0),[railOpen,setRailOpen]=useState(false),zoomClosedAt=useRef(0),popTrack=useRef<HTMLDivElement|null>(null),popSwipe=useRef<{x:number;y:number;moved:boolean}|null>(null),railPrev=useRef({at:-1,dir:1});
 // The month rail shows only the open month until the left margin is touched; it folds away again after a few idle seconds.
 useEffect(()=>{if(!railOpen)return;const timer=setTimeout(()=>setRailOpen(false),4000);return()=>clearTimeout(timer)},[railOpen,journalAt]);
 useEffect(()=>{setFlippedSticker(null)},[tab,journalYear]);
 useEffect(()=>{if(journalYear===null)return;const key=(event:KeyboardEvent)=>{if(event.key==='Escape')setJournalYear(null)};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[journalYear]);
 // Open at the asked-for month once the book is laid out.
 useEffect(()=>{if(journalYear===null||!journalTarget)return;const frame=requestAnimationFrame(()=>{const page=monthFirstPage.current.get(journalTarget);if(page!==undefined)bookJump.current?.(page)});return()=>cancelAnimationFrame(frame)},[journalYear,journalTarget]);
 function cupSticker(cup:AtlasCup<Bean>,index:number){
  const flipped=flippedSticker===cup.id,title=cup.kind==='cafe'?cup.place||t('探店'):label(cup.bean),kindLabel=t(cup.kind==='cafe'?(cup.drink||'探店'):cup.kind==='milk'?'奶咖':'手冲');
  return <div key={cup.id} className={`atlas-cup${flipped?' is-flipped':''}`} style={{'--tilt':`${[-7,5,-3,8,-5,4][index%6]}deg`} as CSSProperties}>
   <div role="button" tabIndex={0} className="atlas-card" aria-pressed={flipped} aria-label={`${title} · ${cup.date} · ${t(flipped?'翻回正面':'翻到背面')}`} onClick={()=>setFlippedSticker(current=>current===cup.id?null:cup.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setFlippedSticker(current=>current===cup.id?null:cup.id)}}}>
    <span className="atlas-face is-front">{cup.photo?<img className={cup.cutout?'is-cutout':'is-photo'} src={cup.photo} alt=""/>:<span className={`atlas-art taste-shape-${stickerShape(cup.id)}`} style={{backgroundColor:cup.kind==='cafe'?'#f1e7dc':paletteFor(cup.bean||{id:cup.id}).fill}}>{cup.kind==='cafe'?<Sticker icon="cafe"/>:<BeanVisual bean={cup.bean}/>}</span>}</span>
    {(()=>{const brew=brews.find(b=>b.id===cup.id),key=brew?brewFacts(brew).filter(([k])=>k!==t('喝了')&&k!==t('冷热')).slice(0,3).map(([,v])=>v).join(' · '):'',fill=cup.kind==='cafe'?'#f1e7dc':paletteFor(cup.bean||{id:cup.id}).fill;
     // The back has the front's outline: the photo's frame (the photo faint beneath), the cut-out's own silhouette, or the painted blob.
     const shape=cup.photo&&cup.cutout?<span className="atlas-back-shape is-cutout" style={{'--fill':fill,WebkitMaskImage:`url("${cup.photo}")`,maskImage:`url("${cup.photo}")`} as CSSProperties}/>
      :cup.photo?<span className="atlas-back-shape is-photo" style={{backgroundImage:`linear-gradient(#fffdf8e0,#fffdf8e0),url("${cup.photo}")`}}/>
      :<span className={`atlas-back-shape is-art taste-shape-${stickerShape(cup.id)}`} style={{'--fill':fill} as CSSProperties}/>;
     return <span className={'atlas-face is-back'+(cup.photo&&cup.cutout?' is-cutout':'')}>{shape}<span className="atlas-back-text">
      <strong>{title}</strong><small>{[kindLabel,cup.serving&&t(cup.serving)].filter(Boolean).join(' · ')}</small>
      {key&&<em>{key}</em>}{cup.rating>0&&stars(cup.rating)}{cup.notes&&<p>{cup.notes}</p>}
      <button type="button" className="atlas-edit" onClick={event=>{event.stopPropagation();if(brew)editBrew(brew,false)}}>{t('编辑')}</button>
     </span></span>})()}
   </div>
   <time dateTime={cup.date}>{cup.date.slice(5).replace('-','.')}</time>
  </div>;
 }
 function yearBook(year:number,spread:boolean){
  const pages:ReactNode[]=[],cups=allCups.filter(cup=>cup.date.startsWith(`${year}-`)),months=byMonth(cups,cup=>cup.date);
  monthFirstPage.current=new Map();
  const sheet=(key:string,body:ReactNode,extra='')=><section className={`journal-page${extra}`} key={key}>{body}{!/is-(cover|blank|end)/.test(extra)&&<span className="journal-folio" aria-hidden="true">{pages.length+1}</span>}</section>;
  const blank=(key:string)=>sheet(key,<span/>,' is-blank');
  if(spread)pages.push(sheet('cover',<div className="journal-cover"><span className="journal-cover-year">{year}</span><span>{t('咖啡手帐')}</span></div>,' is-cover'));
  // First page: the whole year as dots, a month to a row, a dot a day, darker for more cups. A month's name opens its pages.
  const perDay=new Map<string,number>();for(const cup of cups)perDay.set(cup.date,(perDay.get(cup.date)||0)+1);
  const dots=yearDots(year,date=>perDay.get(date)||0),allDays=dots.flatMap(row=>row.days),activeDays=allDays.filter(day=>day.cups>0).length;
  const indexPage=pages.length;
  pages.push(sheet('dots',<div className="journal-dots-page">
   <h2>{language==='en'?`Every cup of ${year}`:`${year} 的每一杯`}</h2>
   <p className="journal-totals">{language==='en'?`${cups.length} cups · ${activeDays} days · longest run ${longestStreak(allDays)} days`:`${cups.length} 杯 · 喝了 ${activeDays} 天 · 最长连续 ${longestStreak(allDays)} 天`}</p>
   <div className="journal-dots">{dots.map((row,m)=>{const has=months.some(group=>group.month===row.month);return <button type="button" className="journal-dots-row" key={row.month} disabled={!has} onClick={()=>{const page=monthFirstPage.current.get(row.month);if(page!==undefined)bookJump.current?.(page)}}>
    <span className="journal-dots-month">{language==='en'?new Intl.DateTimeFormat('en-US',{month:'short'}).format(new Date(row.month+'-15T12:00:00')):`${m+1}月`}</span>
    <span className="journal-dots-days">{row.days.map(day=><i key={day.date} data-level={Math.min(day.cups,4)}/>)}</span>
    <ChevronRight size={14} className="journal-dots-go"/>
   </button>})}</div>
   <p className="journal-dots-key">{t('少')}<i data-level="0"/><i data-level="1"/><i data-level="2"/><i data-level="3"/><i data-level="4"/>{t('多')}</p>
  </div>,' is-dots'));
  // Then the whole year on one page, up front: how the cups were made, its coffees and its cafés.
  const yearPage=pages.length,whole=periodStats(year);
  const yearHead=<div className="journal-month-head"><span className="journal-label">{language==='en'?`${year}`:`${year} 年`}<small>{whole.records.length} {t('杯')}</small></span></div>;
  pages.push(sheet('year',<div className="journal-stats is-year">{yearHead}<section className="month-stats">{statsCharts(whole)}{statsLists(whole)}</section></div>,' is-stats'));
  const monthsPage=pages.length;
  for(const group of months){
   // A month opens on a fresh page with its statistics: how the cups were made beside the daily cups, then the
   // favourite coffees and the cafés. Sharing the month sits beside its name.
   monthFirstPage.current.set(group.month,pages.length);
   const [y,m]=group.month.split('-').map(Number),d=periodStats(y,m);
   const kinds=[[d.pourOvers,'手冲'],[d.milks,'奶咖'],[d.cafes,'探店']].filter(([n])=>+n>0).map(([n,k])=>language==='en'?`${n} ${t(k as string)}`:`${t(k as string)} ${n}`);
   pages.push(sheet(`${group.month}-stats`,<div className="journal-month-open">
    <span className="journal-month-big">{language==='en'?new Intl.DateTimeFormat('en-US',{month:'short'}).format(new Date(group.month+'-15T12:00:00')):m}</span>
    {language!=='en'&&<span className="journal-month-unit">月</span>}
    <p className="journal-totals">{kinds.join(' · ')}</p>
    {d.places.length>0&&<div className="journal-month-places"><h3>{t('去过的店')}</h3>{d.places.slice(0,4).map(({place,count})=><span key={place}><Sticker icon="cafe"/>{place}<small>{language==='en'?`×${count}`:`${count} 次`}</small></span>)}</div>}
   </div>,' is-month-open'));
   chunk(group.items,6).forEach((items,i)=>pages.push(sheet(`${group.month}-${i}`,<div className="journal-body"><div className="journal-grid is-stickers">{items.map((cup,j)=>cupSticker(cup,j))}</div></div>)));
  }
  if(!cups.length)pages.push(sheet('empty',<p className="journal-empty">{t('记一杯，贴下第一张')}</p>));
  // The book always closes on its last page with "End" (on a spread, the right-hand page).
  if(spread&&pages.length%2===0)pages.push(sheet('pre-end',<span/>,' is-blank'));pages.push(sheet('end',<div className="journal-end"><span>End</span></div>,' is-end'));
  return {pages,indexPage,yearPage,monthsPage};
 }
 // The bean book: every coffee drunk, roaster by roaster, four to a page; an index of roasters opens it.
 const BEAN_BOOK=0;
 const triedShelves=useMemo(()=>shelves.map(shelf=>({...shelf,coffees:shelf.coffees.filter(coffee=>coffee.tried)})).filter(shelf=>shelf.coffees.length),[shelves]);
 const beanPicks=useMemo(()=>triedShelves.flatMap(shelf=>shelf.coffees).sort((a,b)=>Number(!!b.bean.photo)-Number(!!a.bean.photo)||b.bean.rating-a.bean.rating||b.firstDate.localeCompare(a.firstDate)).slice(0,3),[triedShelves]);
 function beanEntry(coffee:(typeof triedShelves)[number]['coffees'][number],index:number){
  // Your own bag of it (its photo, its colour) before the catalog's picture of it.
  const bean=[...beans].reverse().find(x=>coffeeIdentity(x)===coffee.id)||tasted.find(x=>x.id===coffee.id)?.bean||coffee.bean,bags=Math.max(1,beans.filter(x=>coffeeIdentity(x)===coffee.id).length);
  return <button type="button" key={coffee.id} className="bean-entry" style={{'--tilt':`${[-5,4,-3,6][index%4]}deg`} as CSSProperties} onClick={()=>setTasteDetail(coffee.id)} aria-label={label(bean)}>
   <span className="bean-shelf bean-entry-bag">{bagVisual({...bean,roastDate:''})}</span>
   <strong>{label(bean)}</strong>
   <small>{language==='en'?`${bags} ${bags===1?'bag':'bags'}`:`喝了 ${bags} 袋`}</small>
   {stars(bean.rating)}
  </button>;
 }
 function beanBook(spread:boolean){
  const pages:ReactNode[]=[],firsts=new Map<string,number>(),count=triedShelves.reduce((sum,shelf)=>sum+shelf.coffees.length,0);
  const sheet=(key:string,body:ReactNode,extra='')=><section className={`journal-page${extra}`} key={key}>{body}{!/is-(cover|blank|end)/.test(extra)&&<span className="journal-folio" aria-hidden="true">{pages.length+1}</span>}</section>;
  if(spread)pages.push(sheet('cover',<div className="journal-cover is-beans"><span className="journal-cover-year">{count}</span><span>{t('豆子手帐')}</span></div>,' is-cover'));
  const indexPage=pages.length;
  pages.push(sheet('index',<div className="journal-dots-page bean-index">
   <h2>{t('我的豆子图鉴')}</h2>
   <p className="journal-totals">{language==='en'?`${count} coffees · ${triedShelves.length} roasters`:`${count} 款 · ${triedShelves.length} 家烘焙商`}</p>
   <div className="bean-index-list">{triedShelves.map(shelf=><button type="button" className="bean-index-row" key={shelf.roaster||'mine'} onClick={()=>{const page=firsts.get(shelf.roaster);if(page!==undefined)bookJump.current?.(page)}}>
    <span className="bean-index-name">{shelf.roaster||t('我的收录')}</span>
    <span className="bean-index-dots">{shelf.coffees.slice(0,8).map(coffee=><i key={coffee.id} style={{background:paletteFor(coffee.bean).fill}}/>)}</span>
    <b>{shelf.coffees.length}</b>
    <ChevronRight size={14}/>
   </button>)}</div>
   {count>0&&<p className="journal-dots-hint">{t('点烘焙商，翻到那一页')}</p>}
  </div>,' is-dots'));
  for(const shelf of triedShelves){
   firsts.set(shelf.roaster,pages.length);
   chunk(shelf.coffees,4).forEach((items,i)=>pages.push(sheet(`${shelf.roaster||'mine'}-${i}`,<div className="journal-body">
    {i===0&&<div className="journal-month-head"><span className="journal-label">{shelf.roaster||t('我的收录')}<small>{language==='en'?`${shelf.coffees.length}`:`${shelf.coffees.length} 款`}</small></span></div>}
    <div className="journal-grid bean-entries">{items.map((coffee,j)=>beanEntry(coffee,j))}</div>
   </div>)));
  }
  pages.push(sheet('add',<div className="bean-book-end"><p>{t(count?'还有没记下的？':'喝完一包，这里就会贴上它')}</p><button type="button" className="taste-add" onClick={()=>startBean(undefined,true)}><Plus size={16}/>{t('补录一款喝过的')}</button></div>));
  if(spread&&pages.length%2===0)pages.push(sheet('pre-end',<span/>,' is-blank'));pages.push(sheet('end',<div className="journal-end"><span>End</span></div>,' is-end'));
  return {pages,indexPage,yearPage:pages.length,monthsPage:pages.length};
 }
 function yearPicks(year:number){return allCups.filter(cup=>cup.photo&&cup.date.startsWith(`${year}-`)).sort((a,b)=>b.rating-a.rating||b.date.localeCompare(a.date)).slice(0,3)}
 // A period's statistics: how the cups were made beside the trend, then the favourite coffees and the cafés.
 function statsCharts(d:PeriodStats){return <>
                   <div className="month-analysis-grid">
                     <section className="month-chart-card month-kind-card">
                       <header><h3>{t("冲煮方式")}</h3><span>{d.records.length} {t("杯")}</span></header>
                       <div className="month-kind-chart">
                         <div className="month-donut">
                           <i className="month-donut-ring" style={{background:donutGradient(d.kindData)}}/>
                           <span><strong>{d.records.length}</strong>{t("杯")}</span>
                         </div>
                         <div className="month-kind-legend">
                           <span><i style={{background:'#8b6b4a'}}/>{t("手冲")}<strong>{d.pourOvers}</strong></span>
                           <span><i style={{background:'#cdb08a'}}/>{t("奶咖")}<strong>{d.milks}</strong></span>
                           {d.cafes>0&&<span><i style={{background:'#9aa58c'}}/>{t("探店")}<strong>{d.cafes}</strong></span>}
                         </div>
                       </div>
                     </section>
                     
                   </div>
 </>}
 function statsLists(d:PeriodStats){return <>
                   <div className="month-bean-table">
                     <h3>{t(d.month?"本月常喝":"本年喝过的豆子")}</h3>
                     {d.bagRanking.length?d.bagRanking.slice(0,d.month?undefined:5).map(({key,bean,bagUnits},index)=>{const fills=consumedBagFills(bagUnits),displayCount=Math.round(bagUnits*10)/10,palette=paletteFor(bean);return <div className="stats-bag-row" key={key}>
                       <span className="stats-bag-rank">{String(index+1).padStart(2,'0')}</span>
                       <button type="button" className="stats-bag-name" onClick={()=>{setReturnToTaste(null);setDetail(bean.id)}} aria-label={`${t("查看豆袋")} · ${label(bean)}`}>{label(bean)}</button>
                       <span className="stats-bag-list" aria-label={language==='en'?`${displayCount} bags brewed`:`喝了 ${displayCount} 包`}>{fills.map((fill,bagIndex)=>{const stop=`${Math.round((1-fill)*100)}%`,labelMask=`linear-gradient(to bottom,rgba(0,0,0,.18) 0 ${stop},#000 ${stop} 100%)`;return <span className="stats-mini-bag" key={`${key}-${bagIndex}`} style={{'--bag-fill':palette.fill,'--bag-line':palette.line,'--bag-side':palette.side} as CSSProperties}><BagPaper ratio={fill}/><span className="stats-mini-label" style={{maskImage:labelMask,WebkitMaskImage:labelMask}}><BeanVisual bean={bean}/></span></span>})}{bagUnits>10&&<span className="stats-bag-more">… ×{displayCount}</span>}</span>
                     </div>}):<div className="month-stats-empty"><Sticker icon="cup"/><span>{t(d.month?"这个月还没有咖啡记录":"这一年还没有咖啡记录")}</span></div>}
                   </div>
                   {d.places.length>0&&<div className="month-bean-table month-place-table">
                     <h3>{t(d.month?"去过的店":"本年去过的店")}</h3>
                     {d.places.slice(0,3).map(({place,count},index)=><div className="stats-place-row" key={place}>
                       <span className="stats-bag-rank">{String(index+1).padStart(2,'0')}</span>
                       <Sticker icon="cafe"/>
                       <span className="stats-place-name">{place}</span>
                       <span className="stats-place-count">{language==='en'?`${count} ${count===1?'visit':'visits'}`:`${count} 次`}</span>
                     </div>)}
                   </div>}

 </>}
 const [widgetLink,setWidgetLink]=useState<string|null>(null);
 useEffect(()=>onWidgetLink(setWidgetLink),[]);
 useEffect(()=>{if(loading||!widgetLink)return;const link=parseWidgetLink(widgetLink),now=new Date();setWidgetLink(null);if(!link)return;setDetail(null);setTasteDetail(null);setSettingsOpen(false);setPickerOpen(false);
  if(link.kind==='brew'){setBeanOpen(false);startBrew(undefined,true);return}
  setBeanOpen(false);setBrewOpen(false);
  if(link.kind==='shelf'||link.kind==='bean'){selectMenu('beans');if(link.kind==='bean'&&beans.some(b=>b.id===link.id))setDetail(link.id);return}
  setTab('brews');setCalendarMonth(now);setCalendarDay(now);
  if(link.kind==='year')openJournal(now.getFullYear());
  requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));
 },[widgetLink,loading]);
 useEffect(()=>{if(loading)return;const timer=window.setTimeout(()=>{syncWidgets(buildWidgetSnapshot({beans,brews,language,today,preference:brewPreference(),name:label,roaster:bean=>bean.roaster||'',palette:paletteFor,art:bean=>bean.photo?photo(bean.photo):displayedArt(bean),stock:bean=>beanStock(bean,brews)})).catch(()=>{})},400);return()=>window.clearTimeout(timer)},[loading,beans,brews,language,today]);
 function selectMenu(value:string){setTab(value);if(value==='beans')setBeansView('shelf');requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'})))}
 // iOS app: the system tab bar and navigation bar replace the web menu capsule and header buttons (see lib/native-tabs.ts).
 const nativeTabs=hasNativeTabs();
 useEffect(()=>{if(nativeTabs){document.documentElement.classList.add('native-tabs');installTapFallback()}},[]);
 // Sheets and editors cover the whole screen and step the tab bar aside.
 const sheetOpen=!!(memory||selected||settingsOpen||beanOpen||brewOpen||pickerOpen||deleteId||photoSource||brewPhotoEdit);
 // An open year journal fills the screen too, so the tab bar steps aside; the system back button closes it.
 const coversTabs=sheetOpen||journalYear!==null||!!viewBrew||!!zoomPhoto,overlayOpen=coversTabs;
 const showAdd=tab!=='catalog';
 const browsingCatalog=tab==='beans'&&beansView==='catalog';
 const addLabel=t(browsingCatalog?'添加到豆子合集':tab==='beans'?'收藏新豆子':'记录一杯咖啡');
 function addFromHeader(){if(browsingCatalog)startBean(undefined,true);else if(tab==='beans')startBean();else startBrew()}
 function openCatalog(){setTab('beans');setBeansView('catalog');setCatalogQuery('');setFilters({...emptyFilters});requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}))}
 const beanFormRef=useRef<HTMLFormElement>(null),brewFormRef=useRef<HTMLFormElement>(null);
 const nativeTap=useRef<(id:string)=>void>(()=>{});nativeTap.current=id=>{if(id==='add')addFromHeader();else if(id==='me')setSettingsOpen(true);else if(id==='save-bean')beanFormRef.current?.requestSubmit();else if(id==='save-brew')brewFormRef.current?.requestSubmit();else if(id==='edit-brew'){if(viewBrew)editBrew(viewBrew,false)}else if(id==='detail-brew'){if(selected)startBrew(selected.id)}else if(id==='detail-edit'){if(selected)startBean(selected)}else if(id==='back'){if(busy)return;if(zoomPhoto)setZoomPhoto(null);else if(viewBrew&&!brewOpen)setViewBrew(null);else if(brewOpen){if(!brewTimerRunning)setBrewOpen(false)}else if(beanOpen)setBeanOpen(false);else if(selected)backFromBean();else if(memory)setTasteDetail(null);else if(journalYear!==null)setJournalYear(null);else if(browsingCatalog)setBeansView('shelf');}};
 const nativeSelect=useRef<(key:string)=>void>(()=>{});nativeSelect.current=key=>{if(key!==tab){selectMenu(key);navigationFeedback()}};
 useEffect(()=>onNativeTabs(key=>nativeSelect.current(key),id=>nativeTap.current(id)),[]);
 useEffect(()=>{syncNativeTabs({active:tab,language,overlay:coversTabs,titles:{beans:t('豆仓'),brews:t('记录'),catalog:t('图鉴')}}).catch(()=>{})},[tab,language,coversTabs]);
 const calendarSwipe=useSwipeNavigation(direction=>shiftCalendarMonth(direction==='next'?1:-1),tab==='brews'&&!beanOpen&&!brewOpen&&!settingsOpen&&!pickerOpen&&!detail&&!tasteDetail&&!deleteId,true);
 const mainSwipe=useSwipeNavigation(direction=>{if(tab==='brews')return;if(browsingCatalog&&direction==='previous'){setBeansView('shelf');navigationFeedback()}},browsingCatalog&&!beanOpen&&!brewOpen&&!settingsOpen&&!pickerOpen&&!detail&&!tasteDetail&&!deleteId);
 // Unfolded iPhone Duo (app only, so the browser stays as it is): the brew form and its timer share one full-screen workspace
 // instead of a timer dialog stacked on the brew dialog stacked on the bean sheet.
 const [wide,setWide]=useState(false);useEffect(()=>{const query=matchMedia('(min-width: 720px)'),update=()=>setWide(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update)},[]);
 const brewWorkspace=nativeTabs&&wide,[brewTimerRunning,setBrewTimerRunning]=useState(false);
 useEffect(()=>{if(!brewOpen)setBrewTimerRunning(false)},[brewOpen]);
 // App: adding a bag picks from the catalog inside the same sheet (a switch on a phone or the folded Duo,
 // a list beside the form when unfolded) instead of closing it and opening a second picker dialog.
 const beanPicking=nativeTabs&&!editing&&draft.recordType!=='catalog',beanWorkspace=beanPicking&&wide;
 const [beanSource,setBeanSource]=useState<'manual'|'catalog'>('manual'),[pickQuery,setPickQuery]=useState('');
 useEffect(()=>{if(beanOpen){setBeanSource('manual');setPickQuery('')}},[beanOpen]);
 const pickShown=catalog.filter(b=>[label(b),otherLabel(b),b.roaster,b.origin,b.flavor].join(' ').toLowerCase().includes(pickQuery.trim().toLowerCase()));
 const catalogPicker=(
  <div className="inline-picker">
   <input className="catalog-search" aria-label={t("搜索豆子图鉴")} placeholder={t("找名字、产地或风味")} value={pickQuery} onChange={(e) => setPickQuery(e.target.value)} />
   <div className="pick-list">
    {pickShown.map((b) => (
     <button type="button" key={b.id} aria-pressed={draft.catalogId === b.id} onClick={() => { chooseCatalog(b); setBeanSource("manual"); }}>
      <BeanVisual bean={b} />
      <span>
       <strong>{label(b)}</strong>
       <small>{b.roaster} · {info(b, "flavor") || t(b.roast)}</small>
      </span>
      <Plus size={17} />
     </button>
    ))}
    {!pickShown.length && <p className="day-empty">{t("没有符合条件的豆子")}</p>}
   </div>
  </div>
 );
 // Native bar buttons for the current view. While an editor page is on top, its save button moves there too
 // (on the folded Duo: the column under the status bar); the web save button is hidden in the app.
 const saveLabel=t(busy?'正在保存…':brewPhotoBusy?'正在制作贴纸…':brewOpen?'保存':'收好');
 const editorSave=photoSource||brewPhotoEdit||pickerOpen||deleteId?null:brewOpen?'save-brew':beanOpen&&!(beanPicking&&!beanWorkspace&&beanSource==='catalog')?'save-bean':null;
 const nativeBarItems=editorSave?[{id:editorSave,symbol:'',title:saveLabel,prominent:true,disabled:busy||(editorSave==='save-brew'&&brewPhotoBusy)}]:viewBrew&&!zoomPhoto?[{id:'edit-brew',symbol:'pencil',title:t('编辑'),prominent:true}]:selected&&!zoomPhoto&&!settingsOpen&&!pickerOpen&&!deleteId&&!photoSource?[{id:'detail-edit',symbol:'pencil',title:t('编辑')},{id:'detail-brew',symbol:'plus',title:t('记一杯'),prominent:true}]:overlayOpen?[]:[...(tab==='beans'&&!browsingCatalog?[{id:'me',symbol:'person.crop.circle',title:t('我的'),me:true}]:[]),...(showAdd?[{id:'add',symbol:'plus',title:addLabel}]:[])];
 // The system back button (on the Duo: in the column beside the status bar, where its other buttons are) also leaves the
 // recap and catalog pages; their web back links are hidden in the app.
 const nativeBack=editorSave?{title:t('返回'),disabled:busy||(editorSave==='save-brew'&&brewTimerRunning)}:zoomPhoto||viewBrew||((selected||memory)&&!settingsOpen&&!pickerOpen&&!deleteId&&!photoSource)?{title:t('返回')}:sheetOpen?undefined:journalYear!==null?{title:t('合上手帐')}:overlayOpen?undefined:browsingCatalog?{title:t('豆仓')}:undefined;
 useEffect(()=>{syncNativeBar(nativeBarItems,nativeBack).catch(()=>{})},[JSON.stringify(nativeBarItems),JSON.stringify(nativeBack)]);
 // Toasts also keep clear of the side bars (the Duo status-bar column).
 const nativeToastOffset={bottom:'calc(16px + env(safe-area-inset-bottom, 0px))',left:'calc(16px + env(safe-area-inset-left, 0px))',right:'calc(16px + env(safe-area-inset-right, 0px))'};
 // Opening a saved cup shows it first, read-only: its photo large, then what it was, how it was made and what was noted.
 // A cup's measured facts as label/value pairs (no grams: the dose isn't what you want to see again).
 function brewFacts(b:any){const cafe=b.kind==='cafe',coffee=cafe&&b.catalogId?catalog.find(x=>x.id===b.catalogId):undefined;return (b.kind==='milk'?[b.milkAmount!=null&&[t('奶量'),`${b.milkAmount} ml`],b.milkType&&b.milkType!=='未记录'&&[t('奶'),t(b.milkType)],b.serving&&b.serving!=='未记录'&&[t('冷热'),t(b.serving)],b.grind&&[t('研磨'),b.grind],b.time&&[t('用时'),b.time]]
   :cafe?[b.drink&&[t('喝了'),t(b.drink)],b.serving&&b.serving!=='未记录'&&[t('冷热'),t(b.serving)],coffee&&[t('豆子'),label(coffee)]]
   :[b.water!=null&&[t('水量'),`${b.water} ml`],b.temp!=null&&[t('水温'),`${b.temp} °C`],!!b.dose&&!!b.water&&[t('粉水比'),`1 : ${(b.water/b.dose).toFixed(1)}`],b.grind&&[t('研磨'),b.grind],b.time&&[t('用时'),b.time]]).filter(Boolean) as [string,string][]}
 function brewPreview(b:any,extra='',props:React.HTMLAttributes<HTMLElement>={}){
  const cafe=b.kind==='cafe',bean=cafe?undefined:beans.find(x=>x.id===b.beanId),coffee=cafe&&b.catalogId?catalog.find(x=>x.id===b.catalogId):undefined;
  const title=cafe?brewTitle(b):label(bean),kindLabel=t(cafe?'探店':b.kind==='milk'?'奶咖':'手冲');
  const facts=brewFacts(b);
  const key=facts.slice(0,4).map(([,v])=>v).join(' · ');
  const {key:cardKey,...rest}=props as any;
  return <figure key={cardKey} className={'brew-polaroid'+(b.photo&&b.photoCutout?' is-cutout':'')+extra} {...rest}>
    <div className="brew-polaroid-photo" style={b.photo&&!b.photoCutout?undefined:{backgroundColor:cafe?'#f1e7dc':paletteFor(bean||{id:b.beanId}).fill}}>{b.photo?<img src={b.photo} alt={t('这杯咖啡的照片')}/>:cafe?<Sticker icon="cafe"/>:<BeanVisual bean={bean}/>}</div>
    <figcaption>
     <strong>{title}</strong>
     <span className="brew-polaroid-date">{kindLabel} · <time dateTime={b.date}>{new Intl.DateTimeFormat(language==='en'?'en-US':'zh-CN',{month:'long',day:'numeric',weekday:'short'}).format(new Date(b.date+'T12:00:00'))}</time></span>
     {key&&<span className="brew-polaroid-key">{key}</span>}
     {b.rating>0&&stars(b.rating)}
     {b.notes&&<p>{b.notes}</p>}
    </figcaption>
   </figure>;
 }
 const brewPhotoField=(
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
 );
 return (
   <>
     <Toaster
       className="beanlet-toaster"
       position="bottom-center"
       offset={nativeTabs ? nativeToastOffset : "calc(106px + env(safe-area-inset-bottom, 0px))"}
       mobileOffset={nativeTabs ? nativeToastOffset : "calc(106px + env(safe-area-inset-bottom, 0px))"}
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
       {tab === "beans" && !browsingCatalog && (
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
       <section className={tab === "catalog" ? "heading heading-hidden" : "heading"}>
         <div>
           <h1>
             {browsingCatalog
               ? t("豆子合集")
               : tab === "beans"
                 ? t("我的豆仓")
                 : tab === "catalog"
                   ? t("图鉴")
                   : t("咖啡记录")}
           </h1>
           {tab === "beans" && !browsingCatalog && (
             <p className="subtitle">
               {t(
                 `${beans.filter((b) => b.status !== "已喝完").length} 包在手边`,
               )}
             </p>
           )}
         </div>
         {showAdd && (
           <button
             className="add-button"
             aria-label={addLabel}
             onClick={addFromHeader}
           >
             <Plus size={26} />
           </button>
         )}
       </section>
       <Tabs value={tab} onValueChange={selectMenu} className="collection">
         <div className="toolbar toolbar-hidden" />
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
             <TabsContent value="beans" className={beansView === "catalog" ? "catalog-page" : "bean-shelf"}>
               {beansView === "catalog" ? (
                 <div className="atlas-content">
                   <div className="review-page-nav">
                     <button type="button" onClick={() => setBeansView("shelf")} aria-label={t("返回豆仓")}>
                       <ArrowLeft size={19}/><span>{t("豆仓")}</span>
                     </button>
                   </div>
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
                         <div key={b.id} className="catalog-row">
                           <button className="catalog-card" type="button" onClick={() => startBean({...b,recordType:"catalog"})}>
                             <div
                               className="catalog-art"
                               style={{ backgroundColor: paletteFor(b).fill }}
                             >
                               <BeanVisual bean={b} />
                             </div>
                             <div className="catalog-copy">
                               <span className="meta catalog-roaster">
                                 {b.roaster || t("我的收录")}
                               </span>
                               <h3 title={b.name}>{label(b)}</h3>
                               <p>
                                 {info(b, "flavor") ||
                                   info(b, "origin") ||
                                   t(b.roast)}
                               </p>
                               {beans.some(
                                 (x) =>
                                   x.catalogId === b.id &&
                                   x.status !== "已喝完",
                               ) && <small>{t("豆仓里有这款")}</small>}
                             </div>
                           </button>
                           {/* Quick actions on the row; edit and delete live inside the entry. */}
                           <div className="catalog-quick">
                             {!tasted.some((x) => x.id === coffeeIdentity(b)) && (
                               <button type="button" className="catalog-quick-button" disabled={busy} onClick={() => markTasted(b)}>
                                 <Coffee size={17} /><span>{t("标记喝过")}</span>
                               </button>
                             )}
                             <button type="button" className="catalog-quick-button is-add" onClick={() => chooseCatalog(b)}>
                               <Plus size={17} /><span>{t("放进豆仓")}</span>
                             </button>
                           </div>
                         </div>
                       ))}
                     </div>
                     {!catalogShown.length && (
                       <p className="day-empty">{t("没有符合条件的豆子")}</p>
                     )}
                     <p className="catalog-source">
                       {t(
                         "咖啡资料来自烘焙商官网 · 封面为 Beanlet 原创水彩",
                       )}
                     </p>
                 </div>
               ) : (<>
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
               <button type="button" className="catalog-entry-card" onClick={openCatalog}>
                 <span className="catalog-entry-stickers" aria-hidden="true">{catalog.slice(0, 3).map((b) => <span key={b.id} style={{ backgroundColor: paletteFor(b).fill }}><BeanVisual bean={b} /></span>)}</span>
                 <span className="catalog-entry-copy"><strong>{t("逛逛豆子合集")}</strong><small>{language === "en" ? `${catalog.length} coffees from roasters` : `${catalog.length} 款烘焙商的豆子`}</small></span>
                 <ChevronRight size={18} />
               </button>
               </>)}
             </TabsContent>
             <TabsContent value="catalog">
               <div className="journal-shelf">{journalYears.map(year=>{const picks=yearPicks(year),count=allCups.filter(cup=>cup.date.startsWith(`${year}-`)).length;return <button type="button" key={year} className="journal-book" onClick={()=>openJournal(year)} aria-label={language==='en'?`${year} journal`:`${year} 年手帐`}>
                 <span className="month-journal-fan">{picks.map((cup,index)=><figure key={cup.id} className={cup.cutout?'is-cutout':''} style={{'--i':index,'--n':picks.length} as CSSProperties}><span className="fan-photo"><img src={cup.photo} alt=""/></span></figure>)}</span>
                 <span className="journal-book-copy"><strong>{year}</strong><small>{language==='en'?`${count} cups`:`${count} 杯 · 年手帐`}</small></span>
               </button>})}
               <button type="button" className="journal-book is-beans" onClick={()=>openJournal(BEAN_BOOK)} aria-label={t('豆子手帐')}>
                 <span className="bean-book-fan" aria-hidden="true">{beanPicks.map((coffee,index)=><span key={coffee.id} className="bean-shelf bean-fan-bag" style={{'--i':index,'--n':beanPicks.length} as CSSProperties}>{bagVisual({...coffee.bean,roastDate:''})}</span>)}</span>
                 <span className="journal-book-copy"><strong>{t('豆子')}</strong><small>{language==='en'?`${triedShelves.reduce((sum,shelf)=>sum+shelf.coffees.length,0)} coffees`:`${triedShelves.reduce((sum,shelf)=>sum+shelf.coffees.length,0)} 款 · 豆子手帐`}</small></span>
               </button></div>
             </TabsContent>
             <TabsContent value="brews">
                 <div className="calendar-layout">
                   <div className="calendar-side">
                   {!brewWorkspace && monthGlance()}
                   <div className="calendar-panel" {...calendarSwipe}>
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
                             places = records.filter((b) => b.kind === "cafe").map((b) => b.place || t("探店"));
                           return (
                             <CalendarDayButton
                               {...props}
                               data-has-coffee={records.length > 0}
                               data-has-photo={photoRecords.length > 0}
                               style={
                                 {
                                   ...props.style,
                                   "--day-coffee": dayBeans.length ? calendarColors(dayBeans,paletteFor) : records.length ? "#f1e7dc" : "transparent",
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
                                 [...dayBeans.map(label), ...places].join(", ")
                               }
                             >
                               {/* A day with a photo shows that one photo; every other day shows its date, large and centred. */}
                               {photoRecords[0] ? (
                                 <span className="day-beans">
                                   <span className={`day-bean day-coffee-photo${photoRecords[0].photoCutout ? " is-cutout" : ""}`}>
                                     <img src={photoRecords[0].photo} alt={t("当天咖啡照片")} />
                                   </span>
                                 </span>
                               ) : (
                                 <span className="day-number">{props.day.date.getDate()}</span>
                               )}
                               {/* More than one cup that day: a small "+n" tucked into the corner, clear of the sticker. */}
                               {records.length > 1 && <span className="day-more" aria-hidden="true">+{records.length - 1}</span>}
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
                   </div>
                   <div className="calendar-day">
                   {brewWorkspace && (
                     <section className="calendar-month-glance" aria-label={t("本月概览")}>
                       {monthGlance()}
                     </section>
                   )}
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
                   </div>
                 </div>
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
               <Collapsible className="memory-bags-fold" key={memory.id} defaultOpen>
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
                       const finishedDate = beanFinishedDate(b, brews);
                       return (
                         <button
                           className="memory-bag-dot"
                           key={b.id}
                           style={
                             {
                               "--bag-dot-color": paletteFor(b).fill,
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
                             {b.status === "已喝完" && <span className="bag-dot-date">
                               {finishedDate ? (
                                 <>
                                   {t("喝完于")}{" "}
                                   <time dateTime={finishedDate}>
                                     {finishedDate.replaceAll("-", ".")}
                                   </time>
                                 </>
                               ) : (
                                 t("喝完日期未记录")
                               )}
                             </span>}
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
           {cloudSyncSupported() ? (
             <div className="cloud-sync">
               <p className="backup-note">
                 {t(cloudLabels[cloud.status])}
                 {cloud.status === "synced" && (
                   <>
                     {" · "}
                     <time dateTime={new Date(cloud.syncedAt).toISOString()}>
                       {new Date(cloud.syncedAt).toLocaleTimeString(language === "en" ? "en-US" : "zh-CN", { hour: "2-digit", minute: "2-digit" })}
                     </time>
                   </>
                 )}
               </p>
               <p className="backup-note">
                 {t("登录同一个 Apple 账户的设备会自动同步豆子、照片和咖啡记录。")}
               </p>
               <button className="secondary" disabled={cloud.status === "syncing"} onClick={() => syncNow()}>
                 {t("立即同步")}
               </button>
             </div>
           ) : (
             <p className="backup-note">
               {t(
                 "豆子、照片和咖啡记录仅保存在当前浏览器。清理浏览器数据前请导出备份。",
               )}
             </p>
           )}
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
           {/* Migration from the old cloud site only matters on the web; the App Store build starts fresh. */}
           {!(globalThis as any).Capacitor?.isNativePlatform?.() && (
             <a
               className="meta"
               href="https://bean-island-journal.csscss.chatgpt.site/"
               target="_blank"
               rel="noreferrer"
             >
               {t("旧版云端数据：打开原网站导出备份 ↗")}
             </a>
           )}
         </div>
       </DialogContent>
     </Dialog>
     <PhotoEditor
       source={photoSource}
       mode={photoMode}
       onCancel={() => setPhotoSource(null)}
       onSave={async (f) => {
         const cut = photoMode === "sticker";
         setFile(cut ? await trimSticker(f).catch(() => f) : f);
         d("photoCutout", cut);
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
         onSwipeDown={!nativeTabs && !busy && !file && JSON.stringify(draft) === beanInitialDraft.current ? () => setBeanOpen(false) : undefined}
         onOpenAutoFocus={(event) => event.preventDefault()}
         className={"editor bean-editor form-editor" + (beanPicking ? " bean-sheet" : "") + (beanWorkspace ? " bean-workspace" : "")}
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
         {beanWorkspace && (
           <aside className="bean-workspace-side">
             <h3>{t("从图鉴选")}</h3>
             {catalogPicker}
           </aside>
         )}
         {beanPicking && !beanWorkspace && (
           <div className="atlas-switch bean-source-switch" role="group" aria-label={t("从图鉴选")}>
             <button type="button" aria-pressed={beanSource === "manual"} onClick={() => setBeanSource("manual")}>{t("自己填")}</button>
             <button type="button" aria-pressed={beanSource === "catalog"} onClick={() => setBeanSource("catalog")}>{t("从图鉴选")}</button>
           </div>
         )}
         {beanPicking && !beanWorkspace && beanSource === "catalog" && catalogPicker}
         <form ref={beanFormRef} onSubmit={saveBean} hidden={beanPicking && !beanWorkspace && beanSource === "catalog"}>
           <div className="form-scroll">
             {!editing && draft.recordType !== "catalog" && !beanPicking && (
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
                 onChange={(s) =>
                   editing
                     ? d("roast", s)
                     : setDraft((current: any) => ({
                         ...current,
                         roast: s,
                         restDays: rememberedBean(s).restDays ?? "",
                       }))
                 }
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
               <label className="field rest-days-field">
                 {t("养豆天数（可选）")}
                 <input
                   type="number"
                   min="0"
                   max="90"
                   step="1"
                   inputMode="numeric"
                   value={draft.restDays ?? ""}
                   placeholder={t(`建议 ${roastGuide(draft.roast, draft.roaster)?.rest ?? 0} 天`)}
                   onChange={(e) =>
                     d(
                       "restDays",
                       e.target.value === "" ? "" : Number(e.target.value),
                     )
                   }
                 />
               </label>
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
                       restValue(draft.restDays),
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
                       restValue(draft.restDays),
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
                <img src={originalArt(draft)} alt={t("水彩封面")} />
                 <span>{t("使用水彩封面")}</span>
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
             <div className="bag-color-picker" role="radiogroup" aria-label={t("袋子颜色")}>
               <span>{t("袋子颜色")}</span>
               <div>
                 {bagColors.map((color, index) => (
                   <button
                     key={color.fill}
                     type="button"
                     role="radio"
                     aria-checked={bagColorIndex(draft, !!displayedArt(draft)) === index}
                     aria-label={t(color.name)}
                     title={t(color.name)}
                     style={{ "--swatch-fill": color.fill, "--swatch-line": color.line } as CSSProperties}
                     onClick={() => d("bagColor", index)}
                   />
                 ))}
               </div>
             </div>
             <div className="photo-upload-row">
               <label className="upload">
                 {preview || draft.photo ? (
                   <img
                     className={(file ? photoMode === "sticker" : draft.photoCutout) ? "is-cutout" : undefined}
                     src={preview || photo(draft.photo)}
                     alt={t("豆袋预览")}
                   />
                 ) : (
                   <Camera size={20} />
                 )}
                 <span>
                   {beanPhotoBusy ? t("正在抠出袋子…") : preview || draft.photo ? t("换张照片") : t("或上传照片")}
                 </span>
                 <input
                   aria-label={t("上传豆袋照片")}
                   type="file"
                   accept="image/*"
                   onChange={(e) => {
                     const f = e.target.files?.[0];
                     e.target.value = "";
                     if (f) {
                       addBeanPhoto(f);
                     }
                   }}
                 />
               </label>
               {(file || draft.photo) && (
                 <button
                   className="stock-adjust"
                   type="button"
                   onClick={() => { setPhotoMode((file ? photoMode === "sticker" : draft.photoCutout) ? "sticker" : "photo"); setPhotoSource(file || photo(draft.photo)); }}
                 >
                   {language === "en" ? "Adjust photo" : "调整照片"}
                 </button>
               )}
               {beanPhoto && file && (photoMode === "sticker" || beanPhoto.cutout) && (
                 <button
                   className="stock-adjust"
                   type="button"
                   onClick={() => { const cut = photoMode === "sticker"; setPhotoMode(cut ? "photo" : "sticker"); setPhotoSource(cut ? beanPhoto.original : beanPhoto.cutout!); }}
                 >
                   {t(photoMode === "sticker" ? "用原图" : "抠出袋子")}
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
             {draft.recordType === "catalog" && editing && draft.sourceUrl && (
               <button type="button" className="link-button source-link" onClick={() => window.open(draft.sourceUrl, "_blank", "noopener,noreferrer")}>
                 {t("官网资料")} ↗
               </button>
             )}
             <div className="form-submit-actions">
               {draft.recordType === "catalog" && editing && (
                 <button type="button" className="icon-button delete-entry" aria-label={t("从图鉴删除")} disabled={busy} onClick={() => setDeleteId({ id: editing, kind: "catalog" })}>
                   <Trash2 size={18} />
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
     {journalYear !== null && (() => { const beanBookOpen = journalYear === BEAN_BOOK, book = beanBookOpen ? beanBook(wide) : yearBook(journalYear, wide); return <div className="journal-shell" onPointerDown={event => { if (railOpen && !(event.target as Element).closest(".journal-rail")) setRailOpen(false); }}>
       <FlipBook key={journalYear} pages={book.pages} jumpRef={bookJump} spread={wide} onPage={setJournalAt} onTap={() => { if (!flippedSticker) return false; setFlippedSticker(null); return true; }} label={beanBookOpen ? t("豆子手帐") : language === "en" ? `${journalYear} journal` : `${journalYear} 年手帐`} hint={!journalTarget} />
       {!beanBookOpen && (() => { const firsts = monthFirstPage.current, shown = wide ? journalAt + 1 : journalAt, current = shown >= book.yearPage && shown < book.monthsPage ? "year" : [...firsts].filter(([, page]) => page <= shown).pop()?.[0];
         // Rail stops: 总览, the twelve months, 全年. The ink mark slides to the open stop; folded, the label rolls in from the side it came from.
         const label = (m: number) => language === "en" ? new Intl.DateTimeFormat("en-US", { month: "narrow" }).format(new Date(journalYear, m, 15)) : <>{m + 1}<small className="journal-rail-unit">月</small></>;
         const at = !current || current === "year" ? 0 : Number(current.slice(5)), prev = railPrev.current;
         if (prev.at !== at) { if (prev.at >= 0) { prev.dir = at > prev.at ? 1 : -1; if (at > 0) navigationFeedback(); } prev.at = at; }
         const y = at === 0 ? 0 : 26 + (at - 1) * 22;
         return <nav className={`journal-rail${railOpen ? " is-open" : ""}`} aria-label={t("月份")} aria-expanded={railOpen} style={{ "--rail-y": `${y}px`, "--rail-from": `${prev.dir * -100}%` } as CSSProperties} onClickCapture={event => { if (!railOpen) { event.stopPropagation(); event.preventDefault(); setRailOpen(true); } }}>
         <div className="journal-rail-list">
          <i className="journal-rail-mark" aria-hidden="true" />
          <button type="button" className="is-word is-year" aria-current={!current || current === "year"} onClick={() => { bookJump.current?.(book.indexPage); setRailOpen(false); }}>{t("总览")}</button>
          {Array.from({ length: 12 }, (_, m) => { const month = `${journalYear}-${String(m + 1).padStart(2, "0")}`, page = firsts.get(month); return <button type="button" key={month} disabled={page === undefined} aria-current={current === month} onClick={() => { if (page !== undefined) bookJump.current?.(page); setRailOpen(false); }}>{label(m)}</button>; })}
         </div>
         <span className="journal-rail-now" aria-hidden="true"><b key={at} className={at === 0 ? "is-word" : undefined}>{at === 0 ? t("总览") : label(at - 1)}</b></span>
       </nav>; })()}
       <button type="button" className="journal-close" onClick={() => setJournalYear(null)} aria-label={t("合上手帐")}><X size={20} /></button>
     </div>; })()}
     {zoomPhoto && <div className="brew-pop photo-zoom" role="dialog" aria-modal="true" aria-label={t("看大图")} onClick={() => { zoomClosedAt.current = Date.now(); setZoomPhoto(null) }}>
       <img className={zoomPhoto.cutout ? "is-cutout" : undefined} src={zoomPhoto.src} alt="" />
     </div>}
     {viewBrew && (() => { const order = [...brews].sort((x, y) => x.date.localeCompare(y.date) || x.id.localeCompare(y.id)), at = order.findIndex(x => x.id === viewBrew.id), shown = order[at] || viewBrew, prev = at > 0 ? order[at - 1] : undefined, next = at >= 0 && at < order.length - 1 ? order[at + 1] : undefined;
       // Five cards stay mounted in slots (far left, left, centre, right, far right); moving to a neighbour only changes slots, so each card glides
       // to its new place. A drag moves the whole stage with the finger, then the stage eases back to 0 as the cards settle.
       const go = (brew?: Brew) => { if (brew) setViewBrew(brew); };
       const stage = (dx: number, animate: boolean) => { const el = popTrack.current; if (!el) return; el.style.transition = animate ? "transform .42s cubic-bezier(.22,1,.36,1)" : "none"; el.style.transform = `translateX(${dx}px)`; };
       const cards = [-2, -1, 0, 1, 2].map(o => ({ o, brew: at >= 0 ? order[at + o] : o === 0 ? shown : undefined })).filter(c => c.brew) as { o: number; brew: Brew }[];
       const end = (event: React.PointerEvent) => { const start = popSwipe.current; if (!start || !start.moved) return; const dx = event.clientX - start.x, target = dx < 0 ? next : prev; if (Math.abs(dx) > 44 && target) go(target); stage(0, true); };
       return <div className="brew-pop" role="dialog" aria-modal="true" aria-label={t("咖啡记录")}
         onDragStart={event => event.preventDefault()}
         onPointerDown={event => { popSwipe.current = { x: event.clientX, y: event.clientY, moved: false }; }}
         onPointerMove={event => { const start = popSwipe.current; if (!start) return; const dx = event.clientX - start.x; if (!start.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(event.clientY - start.y)) { start.moved = true; event.currentTarget.setPointerCapture(event.pointerId); } if (start.moved) stage((dx < 0 && !next) || (dx > 0 && !prev) ? dx * .25 : dx, false); }}
         onPointerUp={end}
         onPointerCancel={() => { popSwipe.current = null; stage(0, true); }}
         onClick={() => { if (popSwipe.current?.moved) { popSwipe.current = null; return; } setViewBrew(null); }} onKeyDown={event => { if (event.key === "Escape") setViewBrew(null); else if (event.key === "ArrowLeft") go(prev); else if (event.key === "ArrowRight") go(next); }} tabIndex={-1}>
         <div className="brew-pop-stage" ref={popTrack}>
           {cards.map(({ o, brew }) => brewPreview(brew, ` is-slot slot-${o < 0 ? "m" : "p"}${Math.abs(o)}`, { key: brew.id, onClick: (event: React.MouseEvent) => { event.stopPropagation(); if (popSwipe.current?.moved) return; if (o) go(brew); }, "aria-hidden": o ? true : undefined } as React.HTMLAttributes<HTMLElement>))}
         </div>
         <button type="button" className="primary brew-preview-edit" onClick={event => { event.stopPropagation(); editBrew(shown, false); }}><Pencil size={16} />{t("编辑")}</button>
       </div>; })()}
     <Dialog open={brewOpen} onOpenChange={(v) => !busy && !brewTimerRunning && setBrewOpen(v)}>
       <DialogContent
         onSwipeBack={() => {
           if (!busy && !brewTimerRunning) setBrewOpen(false);
         }}
         onSwipeDown={!nativeTabs && !busy && !brewTimerRunning && JSON.stringify(brewDraft) === brewInitialDraft.current ? () => setBrewOpen(false) : undefined}
         onOpenAutoFocus={(event) => event.preventDefault()}
         className={"editor form-editor" + (brewWorkspace ? " brew-workspace" : "")}
       >
         <DialogTitle>{t(editingBrew ? "编辑咖啡记录" : "记一杯")}</DialogTitle>
         <DialogDescription className="sr-only">
           {t("简单记下这杯咖啡。")}
         </DialogDescription>
         <form ref={brewFormRef} onSubmit={saveBrew}>
           <div className="form-scroll">
             <div
               className="brew-kind-picker"
               role="group"
               aria-label={t("今天喝什么")}
             >
               {(["pourOver", "milk", "cafe"] as const).map((kind) => (
                 <button
                   type="button"
                   key={kind}
                   aria-pressed={brewDraft.kind === kind}
                   disabled={kind !== "cafe" && !beans.some((b) => b.status !== "已喝完")}
                   onClick={() => changeBrewKind(kind)}
                 >
                   <Sticker icon={kind === "milk" ? "cup" : kind === "cafe" ? "cafe" : "dripper"} />
                   <span>{t(kind === "milk" ? "奶咖" : kind === "cafe" ? "探店" : "手冲")}</span>
                 </button>
               ))}
             </div>
             {brewDraft.kind === "cafe" ? (
               <div className="cafe-fields">
                 <label className="field">
                   {t("在哪家店？")}
                   <input
                     maxLength={100}
                     value={brewDraft.place || ""}
                     onChange={(e) => bd("place", e.target.value)}
                     placeholder={t("例如：Blue Bottle 三里屯")}
                   />
                 </label>
                 {recentPlaces.length > 0 && (
                   <div className="cafe-chips" role="group" aria-label={t("去过的店")}>
                     {recentPlaces.map((place) => (
                       <button type="button" key={place} aria-pressed={(brewDraft.place || "").trim().toLowerCase() === place.toLowerCase()} onClick={() => bd("place", place)}>{place}</button>
                     ))}
                   </div>
                 )}
                 <div className="field">
                   <span>{t("喝了什么")}</span>
                   <div className="cafe-chips" role="group" aria-label={t("喝了什么")}>
                     {cafeDrinks.map((drink) => (
                       <button type="button" key={drink} aria-pressed={brewDraft.drink === drink} onClick={() => bd("drink", brewDraft.drink === drink ? "" : drink)}>{t(drink)}</button>
                     ))}
                   </div>
                   <input
                     maxLength={100}
                     value={cafeDrinks.includes(brewDraft.drink) ? "" : brewDraft.drink || ""}
                     onChange={(e) => bd("drink", e.target.value)}
                     placeholder={t("或者自己写，例如：桂花拿铁")}
                     aria-label={t("自己写喝了什么")}
                   />
                 </div>
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
                   <div className="field">
                     <span>{t("冷热")}</span>
                     <div className="cafe-chips cafe-serving" role="group" aria-label={t("冷热")}>
                       {(["热", "冰"] as const).map((serving) => (
                         <button type="button" key={serving} aria-pressed={brewDraft.serving === serving} onClick={() => bd("serving", brewDraft.serving === serving ? "未记录" : serving)}>{t(serving)}</button>
                       ))}
                     </div>
                   </div>
                 </div>
                 <label className="field">
                   {t("用的哪款豆子？（选填）")}
                   <Select value={brewDraft.catalogId || "none"} onValueChange={(v) => bd("catalogId", v === "none" ? "" : v)}>
                     <SelectTrigger className="choice brew-coffee-trigger" aria-label={t("用的哪款豆子？（选填）")}>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent className="brew-coffee-menu" position="popper" align="start">
                       <SelectItem className="brew-coffee-option" value="none" textValue={t("不知道 / 不记了")}>{t("不知道 / 不记了")}</SelectItem>
                       {catalog.map((b) => (
                         <SelectItem className="brew-coffee-option" key={b.id} value={b.id} textValue={label(b)}>
                           <span className="brew-coffee-choice">
                             <span className="brew-coffee-art" style={{ backgroundColor: paletteFor(b).fill }} aria-hidden="true"><BeanVisual bean={b} /></span>
                             <span className="brew-coffee-name">{label(b)}{b.roaster ? ` · ${b.roaster}` : ""}</span>
                           </span>
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </label>
               </div>
             ) : (<>
             <label className="field">
               {t("今天冲哪包？")}
               <Select
                 value={brewDraft.beanId}
                 onValueChange={(s) => {
                   const kind = brewDraft.kind || "pourOver";
                   setBrewDraft((draft: any) => ({
                     ...draft,
                     beanId: s,
                     grind: editingBrew ? draft.grind : rememberedBrew(kind, s).grind ?? draft.grind,
                   }));
                   rememberBrewPreference(kind, s);
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
                   {beans.filter((b) => b.status !== "已喝完" || (editingBrew && b.id === brewDraft.beanId)).map((b) => (
                     <SelectItem
                       className="brew-coffee-option"
                       key={b.id}
                       value={b.id}
                       textValue={label(b)}
                     >
                       <span className="brew-coffee-choice">
                         <span
                           className="brew-coffee-art"
                           style={{ backgroundColor: paletteFor(b).fill }}
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
               <label className="field full">
                 {t("研磨度")}
                 <input
                   maxLength={100}
                   value={brewDraft.grind || ""}
                   onChange={(e) => bd("grind", e.target.value)}
                   placeholder={t("例如：C40 24 格")}
                 />
               </label>
             </div>
             </>)}
             {brewDraft.kind === "pourOver" && !brewWorkspace && (
               <PourTimer
                 dose={Number(brewDraft.dose)}
                 onComplete={(result) =>
                   setBrewDraft((draft: any) => ({
                     ...draft,
                     dose: result.dose,
                     water: result.water,
                     temp: result.temp ?? draft.temp,
                     time: result.time,
                     grind: draft.grind || result.grind,
                   }))
                 }
               />
             )}
             {!(brewWorkspace&&brewDraft.kind!=="pourOver")&&brewPhotoField}
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
             <div className="form-submit-actions">
               {editingBrew && (
                 <button type="button" className="icon-button delete-entry" aria-label={t("删除这条记录")} disabled={busy} onClick={() => setDeleteId({ id: editingBrew, kind: "brew" })}>
                   <Trash2 size={18} />
                 </button>
               )}
               <button type="submit" className="primary save" disabled={busy||brewPhotoBusy}>
                 {busy ? t("正在保存…") : brewPhotoBusy?t("正在制作贴纸…"):t("保存")}
               </button>
             </div>
           </div>
         </form>
           {brewWorkspace && (
             <aside className="brew-workspace-side">
               {brewDraft.kind === "pourOver" ? (
                 <PourTimer
                   inline
                   onRunningChange={setBrewTimerRunning}
                   dose={Number(brewDraft.dose)}
                 onComplete={(result) =>
                   setBrewDraft((draft: any) => ({
                     ...draft,
                     dose: result.dose,
                     water: result.water,
                     temp: result.temp ?? draft.temp,
                     time: result.time,
                     grind: draft.grind || result.grind,
                   }))
                 }
                 />
               ) : brewPhotoField}
             </aside>
           )}
       </DialogContent>
     </Dialog>
     <Sheet open={!!selected} onOpenChange={(v) => !v && backFromBean()}>
       <SheetContent
         onSwipeBack={backFromBean}
         onInteractOutside={(e) => { if (zoomPhoto || Date.now() - zoomClosedAt.current < 600) e.preventDefault() }}
         onEscapeKeyDown={(e) => { if (zoomPhoto) { e.preventDefault(); setZoomPhoto(null) } }}
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
               {selected.photo ? (
                 <button type="button" className={"bean-detail-thumbnail is-zoomable"+(selected.photoCutout?" is-cutout":"")} aria-label={t("看大图")} onClick={() => setZoomPhoto({ src: photo(selected.photo), cutout: !!selected.photoCutout })}>
                   <img className={selected.photoCutout ? "is-cutout" : undefined} src={photo(selected.photo)} alt="" />
                 </button>
               ) : (
                 <div className="bean-detail-thumbnail"><BeanVisual bean={selected} /></div>
               )}
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
                 className="primary detail-native-action"
                 onClick={() => startBrew(selected.id)}
               >
                 <Plus size={17} />
                 {t("记一杯")}
               </button>
               <button
                 className="secondary detail-native-action"
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
