import {ChevronDown} from 'lucide-react';
import {useEffect,useId,useRef,useState} from 'react';
import {useI18n} from '@/lib/i18n';

export function RoasterInput({value,options,onChange}:{value:string;options:string[];onChange:(v:string)=>void}){
 const {language,t}=useI18n(),id=useId(),root=useRef<HTMLDivElement>(null),[open,setOpen]=useState(false);
 const names=Array.from(new Set(options.map(s=>s.trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
 const shown=names.filter(name=>!value.trim()||name.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()));
 useEffect(()=>{const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[]);
 return <div className="field roaster-field" ref={root}>
   <label htmlFor={id}>{t('烘焙商')}</label>
   <div className="roaster-combobox" role="combobox" aria-expanded={open} aria-controls={`${id}-options`}>
     <input id={id} maxLength={200} value={value} onFocus={()=>setOpen(true)} onChange={e=>{onChange(e.target.value);setOpen(true)}} placeholder={language==='en'?'Choose or type':'选择或输入'} autoComplete="off"/>
     <button type="button" className="roaster-dropdown-button" aria-label={language==='en'?'Show roasters':'展开烘焙商'} onClick={()=>setOpen(current=>!current)}><ChevronDown size={16}/></button>
     {open&&names.length>0&&<div className="roaster-options" id={`${id}-options`} role="listbox">
       {(shown.length?shown:names).map(name=><button type="button" role="option" aria-selected={name===value} key={name} onClick={()=>{onChange(name);setOpen(false)}}>{name}</button>)}
     </div>}
   </div>
 </div>;
}
