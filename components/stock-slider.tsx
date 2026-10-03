import {useEffect,useRef,useState,type CSSProperties} from 'react';

export function StockSlider({value,max,label,disabled,onSave}:{value:number;max:number;label:string;disabled:boolean;onSave:(value:number)=>Promise<void>}) {
  const [draft,setDraft]=useState(value);
  const pending=useRef(value),dirty=useRef(false),saving=useRef(false);
  useEffect(()=>{if(!dirty.current){pending.current=value;setDraft(value)}},[value]);
  async function commit(){
    if(!dirty.current||saving.current||disabled)return;
    dirty.current=false;
    if(pending.current===value)return;
    saving.current=true;
    try{await onSave(pending.current)}catch{pending.current=value;setDraft(value)}finally{saving.current=false}
  }
  return <label className="field stock-slider-field stock-direct">
    <span className="stock-slider-heading">{label}<output>{draft}g</output></span>
    <input className="stock-slider" type="range" min="0" max={Math.floor(max)} step="1" value={draft} disabled={disabled}
      style={{'--stock-percent':`${max?draft/max*100:0}%`} as CSSProperties}
      onChange={e=>{pending.current=Number(e.target.value);dirty.current=true;setDraft(pending.current)}}
      onPointerUp={()=>void commit()} onBlur={()=>void commit()}
      onKeyUp={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))void commit()}}
      onPointerCancel={()=>{dirty.current=false;pending.current=value;setDraft(value)}}/>
    <span className="stock-slider-scale"><span>0g</span><span>{max}g</span></span>
  </label>;
}
