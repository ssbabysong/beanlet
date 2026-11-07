// 图鉴: two collections. 杯子 — every cup, in date order, grouped by month so a month index can jump to it.
// 豆子 — every coffee in the catalog plus any tried outside it, grouped by roaster, tried ones lit and the rest left to collect.
export type CupKind='pourOver'|'milk'|'cafe';
export type AtlasBrew={id:string;beanId:string;date:string;kind?:CupKind;photo?:string;photoCutout?:boolean;place?:string;drink?:string;serving?:string;rating?:number;notes?:string};
export type AtlasCup<B>={id:string;date:string;kind:CupKind;bean?:B;place?:string;drink?:string;photo?:string;cutout:boolean;serving?:string;rating:number;notes:string};

// Cups oldest first. A café cup needs a café name; a home brew needs its bag. `only` keeps one way of drinking.
export function atlasCups<B extends {id:string}>(beans:B[],brews:AtlasBrew[],only?:CupKind):AtlasCup<B>[]{
 const byId=new Map(beans.map(bean=>[bean.id,bean]));
 return brews
  .map(brew=>{const kind:CupKind=brew.kind==='cafe'||brew.kind==='milk'?brew.kind:'pourOver';return {id:brew.id,date:brew.date,kind,bean:kind==='cafe'?undefined:byId.get(brew.beanId),place:brew.place?.trim()||undefined,drink:brew.drink?.trim()||undefined,photo:brew.photo||undefined,cutout:!!brew.photoCutout,serving:brew.serving&&brew.serving!=='未记录'?brew.serving:undefined,rating:brew.rating||0,notes:brew.notes?.trim()||''}})
  .filter(cup=>(!only||cup.kind===only)&&(cup.kind==='cafe'?!!cup.place:!!cup.bean))
  .sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}

export type MonthGroup<T>={month:string;items:T[]};
// Consecutive months in date order ('YYYY-MM'); items keep their order inside a month.
export function byMonth<T>(items:T[],dateOf:(item:T)=>string):MonthGroup<T>[]{
 const groups=new Map<string,T[]>();
 for(const item of items){const month=dateOf(item).slice(0,7);if(!month)continue;const list=groups.get(month)||[];list.push(item);groups.set(month,list)}
 return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([month,list])=>({month,items:list}));
}

export type AtlasCoffee<B>={id:string;bean:B;tried:boolean;firstDate:string};
export type RoasterShelf<B>={roaster:string;coffees:AtlasCoffee<B>[];tried:number};
type Coffee={id:string;roaster?:string;name?:string};
// Catalog coffees and tried coffees (matched by identity) grouped by roaster. Roasters you've tried the most of come first;
// inside a roaster, tried coffees first (most recent first), then the ones still to try by name. '' collects coffees with no roaster.
export function roasterShelves<B extends Coffee>(catalog:B[],tasted:{id:string;bean:B;firstDate:string}[]):RoasterShelf<B>[]{
 const tried=new Map(tasted.map(x=>[x.id,x])),coffees=new Map<string,AtlasCoffee<B>>();
 for(const bean of catalog){const t=tried.get(bean.id);coffees.set(bean.id,{id:bean.id,bean,tried:!!t,firstDate:t?.firstDate||''})}
 for(const t of tasted)if(!coffees.has(t.id))coffees.set(t.id,{id:t.id,bean:t.bean,tried:true,firstDate:t.firstDate});
 const shelves=new Map<string,AtlasCoffee<B>[]>();
 for(const coffee of coffees.values()){const roaster=(coffee.bean.roaster||'').trim();const list=shelves.get(roaster)||[];list.push(coffee);shelves.set(roaster,list)}
 return [...shelves].map(([roaster,list])=>({roaster,tried:list.filter(c=>c.tried).length,coffees:list.sort((a,b)=>Number(b.tried)-Number(a.tried)||(a.tried?b.firstDate.localeCompare(a.firstDate):0)||(a.bean.name||'').localeCompare(b.bean.name||''))}))
  .sort((a,b)=>b.tried-a.tried||b.coffees.length-a.coffees.length||(a.roaster?0:1)-(b.roaster?0:1)||a.roaster.localeCompare(b.roaster));
}

// Split a list into pages of `size` (six stickers to a journal page).
export function chunk<T>(items:T[],size=6):T[][]{const out:T[][]=[];for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));return out}

// Pack labelled groups (months, roasters) onto pages of `capacity` stickers without starting every group on a new page:
// a page holds one or more segments, and a group that doesn't fit carries on at the top of the next page.
export type PageSegment<T>={key:string;items:T[];continued:boolean};
export function packPages<T>(groups:{key:string;items:T[]}[],capacity=6):PageSegment<T>[][]{
 const pages:PageSegment<T>[][]=[];let page:PageSegment<T>[]=[],used=0;
 for(const group of groups){
  let offset=0;
  while(offset<group.items.length){
   if(used===capacity){pages.push(page);page=[];used=0}
   const take=Math.min(capacity-used,group.items.length-offset);
   page.push({key:group.key,items:group.items.slice(offset,offset+take),continued:offset>0});
   used+=take;offset+=take;
  }
 }
 if(page.length)pages.push(page);
 return pages;
}

// The year's dot chart: one row per month, one dot per day (cups that day); days past a month's end are left out.
export function yearDots(year:number,cupsOn:(date:string)=>number){
 return Array.from({length:12},(_,m)=>{const month=`${year}-${String(m+1).padStart(2,'0')}`,length=new Date(year,m+1,0).getDate();return {month,days:Array.from({length},(_,d)=>{const date=`${month}-${String(d+1).padStart(2,'0')}`;return {date,cups:cupsOn(date)}})}});
}
// Longest run of consecutive days with at least one cup, from days in date order.
export function longestStreak(days:{cups:number}[]){let best=0,run=0;for(const day of days){run=day.cups>0?run+1:0;best=Math.max(best,run)}return best}
