// Home Screen widgets read this compact copy of the journal; WidgetKit cannot open the web view's IndexedDB.
type WidgetBean={id:string;status?:string;icon?:string};
type WidgetBrew={beanId:string;date:string;kind?:'pourOver'|'milk';dose?:number};
type Palette={fill:string;line:string;side:string};
export type WidgetCoffee={id:string;name:string;roaster:string;icon:string;fill:string;line:string;side:string;remaining:number|null;total:number|null;ratio:number|null;thumb:string};
export type WidgetSnapshot={version:1;language:'zh'|'en';generatedAt:string;shelfCount:number;shelf:WidgetCoffee[];brewBean:WidgetCoffee|null;brewKind:'pourOver'|'milk';days:Record<string,{c:number;k:string[]}>};
type Input<B extends WidgetBean>={beans:B[];brews:WidgetBrew[];language:'zh'|'en';today:string;preference:{kind?:string;beanId?:string};name:(bean:B)=>string;roaster:(bean:B)=>string;palette:(bean:B)=>Palette;art:(bean:B)=>string;stock:(bean:B)=>{remaining:number;total:number;ratio:number}|null};

// The shelf widget tiles every bag; the cap only bounds memory for an unusually large shelf.
export const widgetShelfLimit=36,widgetHistoryDays=400;

// Short, stable file names let the app skip thumbnails the widget already has.
export function thumbKey(source:string){let hash=0x811c9dc5;for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,0x01000193)}return (hash>>>0).toString(16).padStart(8,'0')+source.length.toString(36)}

function shiftDay(day:string,offset:number){const date=new Date(day+'T12:00:00');date.setDate(date.getDate()+offset);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}

export function buildWidgetSnapshot<B extends WidgetBean>({beans,brews,language,today,preference,name,roaster,palette,art,stock:stockOf}:Input<B>){
 const thumbs:Record<string,string>={};
 const coffee=(bean:B):WidgetCoffee=>{
  const stock=stockOf(bean),{fill,line,side}=palette(bean),source=art(bean),thumb=source?thumbKey(source):'';
  if(thumb)thumbs[thumb]=source;
  return {id:bean.id,name:name(bean),roaster:roaster(bean),icon:bean.icon==='cherry'||bean.icon==='cookie'?'brownie':bean.icon||'bag',fill,line,side,remaining:stock?.remaining??null,total:stock?.total??null,ratio:stock?Math.round(stock.ratio*1000)/1000:null,thumb};
 };
 const shelf=beans.filter(bean=>bean.status!=='已喝完');
 // Same choice as the in-app "brew a cup" form: remembered bean, then the last one brewed, then the newest bag.
 const last=brews.find(brew=>shelf.some(bean=>bean.id===brew.beanId)),brewBean=shelf.find(bean=>bean.id===preference.beanId)||shelf.find(bean=>bean.id===last?.beanId)||shelf[0];
 const brewKind=preference.kind==='milk'||preference.kind==='pourOver'?preference.kind:last?.kind||'pourOver';
 const since=shiftDay(today,-widgetHistoryDays),days:WidgetSnapshot['days']={};
 for(const brew of brews){
  if(brew.date<since)continue;
  const day=days[brew.date]||(days[brew.date]={c:0,k:[]}),bean=beans.find(b=>b.id===brew.beanId),color=bean?palette(bean).fill:'';
  day.c++;
  if(color&&!day.k.includes(color)&&day.k.length<2)day.k.push(color);
 }
 const snapshot:WidgetSnapshot={version:1,language,generatedAt:new Date().toISOString(),shelfCount:shelf.length,shelf:shelf.slice(0,widgetShelfLimit).map(coffee),brewBean:brewBean?coffee(brewBean):null,brewKind,days};
 return {snapshot,thumbs};
}

export type WidgetLink={kind:'brew'|'shelf'|'calendar'|'year'}|{kind:'bean';id:string};
export function parseWidgetLink(url:string):WidgetLink|null{
 const match=/^beanlet:\/\/([a-z]+)(?:\/([^/?#]+))?/.exec(url);if(!match)return null;
 const [,kind,id]=match;
 if(kind==='bean')return id?{kind,id:decodeURIComponent(id)}:null;
 return kind==='brew'||kind==='shelf'||kind==='calendar'||kind==='year'?{kind}:null;
}
