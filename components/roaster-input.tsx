import {useId} from 'react';
import {useI18n} from '@/lib/i18n';

export function RoasterInput({value,options,onChange}:{value:string;options:string[];onChange:(v:string)=>void}){
 const {language,t}=useI18n(),id=useId();
 const names=Array.from(new Set(options.map(s=>s.trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
 return <label className="field roaster-field">{t('烘焙商')}
   <input list={id} maxLength={200} value={value} onChange={e=>onChange(e.target.value)} placeholder={language==='en'?'Choose or type':'选择或输入'} autoComplete="off"/>
   <datalist id={id}>{names.map(name=><option key={name} value={name}/>)}</datalist>
 </label>;
}
