import {useEffect,useRef,useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useI18n} from '@/lib/i18n';

export function PhotoEditor({source,onCancel,onSave}:{source:File|string|null;onCancel:()=>void;onSave:(file:File)=>void}){
  const {language}=useI18n(),en=language==='en';
  const [url,setUrl]=useState(''),[size,setSize]=useState({w:0,h:0}),[zoom,setZoom]=useState(1),[pos,setPos]=useState({x:.5,y:.5}),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const img=useRef<HTMLImageElement>(null),frame=useRef<HTMLDivElement>(null),drag=useRef<{x:number;y:number;px:number;py:number}|null>(null);
  useEffect(()=>{setSize({w:0,h:0});setZoom(1);setPos({x:.5,y:.5});setError('');const u=source instanceof File?URL.createObjectURL(source):source||'';setUrl(u);return()=>{if(source instanceof File)URL.revokeObjectURL(u)}},[source]);
  const scale=size.w?Math.max(1/size.w,1/size.h)*zoom:1,w=size.w*scale,h=size.h*scale;
  async function save(){
    if(!img.current||!size.w)return;
    setBusy(true);setError('');
    try{
      const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
      const ctx=canvas.getContext('2d');if(!ctx)throw Error();
      ctx.fillStyle='#fff';ctx.fillRect(0,0,1024,1024);
      ctx.drawImage(img.current,(1-w)*pos.x*1024,(1-h)*pos.y*1024,w*1024,h*1024);
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error()),'image/jpeg',.86));
      onSave(new File([blob],'bean-photo.jpg',{type:'image/jpeg'}));
    }catch{setError(en?'Could not save this photo. Please try another.':'照片处理失败，请换一张试试。')}finally{setBusy(false)}
  }
  return <Dialog open={!!source} onOpenChange={v=>{if(!v&&!busy)onCancel()}}><DialogContent className="editor photo-editor" showCloseButton={false}>
    <DialogTitle>{en?'Adjust photo':'调整照片'}</DialogTitle><DialogDescription>{en?'Drag to reposition; use the slider to zoom.':'拖动调整位置，滑动调整大小'}</DialogDescription>
    <div ref={frame} className="photo-crop-frame" onPointerDown={e=>{if(!size.w||busy)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,px:pos.x,py:pos.y}}} onPointerMove={e=>{const d=drag.current;if(!d||!frame.current)return;const side=frame.current.clientWidth;setPos({x:w>1?Math.max(0,Math.min(1,d.px-(e.clientX-d.x)/(side*(w-1)))):.5,y:h>1?Math.max(0,Math.min(1,d.py-(e.clientY-d.y)/(side*(h-1)))):.5})}} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}>
      {url&&<img ref={img} src={url} draggable={false} alt={en?'Crop preview':'裁剪预览'} onLoad={e=>setSize({w:e.currentTarget.naturalWidth,h:e.currentTarget.naturalHeight})} onError={()=>setError(en?'This photo format is not supported. Choose JPG or PNG.':'无法读取这张照片，请选择 JPG 或 PNG。')} style={{width:`${w*100}%`,height:`${h*100}%`,left:`${(1-w)*pos.x*100}%`,top:`${(1-h)*pos.y*100}%`}}/>}
    </div>
    <label className="field">{en?'Zoom':'缩放'}<input type="range" min="1" max="3" step=".01" value={zoom} disabled={!size.w||busy} onChange={e=>setZoom(Number(e.target.value))}/></label>
    {error&&<p role="alert" className="error">{error}</p>}
    <div className="photo-editor-actions"><button className="secondary" disabled={busy} onClick={onCancel}>{en?'Cancel':'取消'}</button><button className="primary" disabled={busy||!size.w} onClick={()=>void save()}>{en?'Use photo':'使用照片'}</button></div>
  </DialogContent></Dialog>;
}
