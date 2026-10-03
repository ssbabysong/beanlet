import {RotateCcw} from 'lucide-react';
import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {transformCrop,type CropPoint} from '@/lib/photo-gesture';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useI18n} from '@/lib/i18n';

export function PhotoEditor({source,onCancel,onSave}:{source:File|string|null;onCancel:()=>void;onSave:(file:File)=>void}){
  const {language}=useI18n(),en=language==='en';
  const [url,setUrl]=useState(''),[size,setSize]=useState({w:0,h:0}),[crop,setCrop]=useState({zoom:1,angle:0,cx:.5,cy:.5}),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const img=useRef<HTMLImageElement>(null),frame=useRef<HTMLDivElement>(null),pointers=useRef(new Map<number,CropPoint>()),view=useRef({zoom:1,angle:0,cx:.5,cy:.5});
  useEffect(()=>{pointers.current.clear();view.current={zoom:1,angle:0,cx:.5,cy:.5};setSize({w:0,h:0});setCrop(view.current);setError('');const u=source instanceof File?URL.createObjectURL(source):source||'';setUrl(u);return()=>{if(source instanceof File)URL.revokeObjectURL(u)}},[source]);
  const baseScale=size.w?Math.max(1/size.w,1/size.h):1,scale=baseScale*crop.zoom;
  function point(e:PointerEvent<HTMLDivElement>){const r=e.currentTarget.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.width}}
  function update(from:CropPoint,to:CropPoint,factor=1,turn=0){
    const next=transformCrop(view.current,{w:size.w*baseScale,h:size.h*baseScale},from,to,factor,turn);
    view.current=next;setCrop(next);
  }
  function move(e:PointerEvent<HTMLDivElement>){
    const points=pointers.current;if(!points.has(e.pointerId)||busy)return;
    const before=[...points.values()];points.set(e.pointerId,point(e));const after=[...points.values()];
    if(before.length===1){update(before[0],after[0]);return}
    const mid=(p:CropPoint[])=>({x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2});
    const distance=(p:CropPoint[])=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
    const angle=(p:CropPoint[])=>Math.atan2(p[1].y-p[0].y,p[1].x-p[0].x);
    const d=distance(before),turn=(angle(after)-angle(before))*180/Math.PI;
    update(mid(before),mid(after),d>.001?distance(after)/d:1,d>.001?turn:0);
  }
  function end(e:PointerEvent<HTMLDivElement>){pointers.current.delete(e.pointerId)}
  async function save(){
    if(!img.current||!size.w)return;
    setBusy(true);setError('');
    try{
      const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
      const ctx=canvas.getContext('2d');if(!ctx)throw Error();
      ctx.fillStyle='#fff';ctx.fillRect(0,0,1024,1024);
      ctx.translate(crop.cx*1024,crop.cy*1024);
      ctx.rotate(crop.angle*Math.PI/180);
      ctx.drawImage(img.current,-size.w*scale*512,-size.h*scale*512,size.w*scale*1024,size.h*scale*1024);
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error()),'image/jpeg',.86));
      onSave(new File([blob],'bean-photo.jpg',{type:'image/jpeg'}));
    }catch{setError(en?'Could not save this photo. Please try another.':'照片处理失败，请换一张试试。')}finally{setBusy(false)}
  }
  return <Dialog open={!!source} onOpenChange={v=>{if(!v&&!busy)onCancel()}}><DialogContent className="editor photo-editor" showCloseButton={false}>
    <DialogTitle>{en?'Adjust photo':'调整照片'}</DialogTitle><DialogDescription>{en?'Drag to move; pinch and twist to zoom and rotate.':'单指移动，双指缩放和旋转'}</DialogDescription>
    <div ref={frame} className="photo-crop-frame" tabIndex={0} aria-label={en?'Photo crop; plus/minus to zoom, arrow keys to rotate':'照片裁剪，加减键缩放，左右键旋转'}
      onPointerDown={e=>{if(!size.w||busy||e.button!==0||pointers.current.size>=2)return;e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,point(e))}}
      onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
      onWheel={e=>{if(!size.w||busy)return;const r=e.currentTarget.getBoundingClientRect();const p={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.width};update(p,p,Math.exp(-e.deltaY*.002))}}
      onKeyDown={e=>{if(!size.w||busy)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();update({x:.5,y:.5},{x:.5,y:.5},1,e.key==='ArrowLeft'?-1:1)}if(['+','=','-'].includes(e.key)){e.preventDefault();update({x:.5,y:.5},{x:.5,y:.5},e.key==='-'?1/1.1:1.1)}}}>

      {url&&<img ref={img} src={url} draggable={false} alt={en?'Crop preview':'裁剪预览'} onLoad={e=>setSize({w:e.currentTarget.naturalWidth,h:e.currentTarget.naturalHeight})} onError={()=>setError(en?'This photo format is not supported. Choose JPG or PNG.':'无法读取这张照片，请选择 JPG 或 PNG。')} style={{width:`${size.w*scale*100}%`,height:`${size.h*scale*100}%`,left:`${crop.cx*100}%`,top:`${crop.cy*100}%`,transform:`translate(-50%,-50%) rotate(${crop.angle}deg)`}}/>}
    </div>

    <button type="button" className="photo-rotate" disabled={busy||!size.w} onClick={()=>{pointers.current.clear();view.current={zoom:1,angle:0,cx:.5,cy:.5};setCrop(view.current)}}><RotateCcw size={17}/>{en?'Reset':'重置'}</button>
    {error&&<p role="alert" className="error">{error}</p>}
    <div className="photo-editor-actions"><button className="secondary" disabled={busy} onClick={onCancel}>{en?'Cancel':'取消'}</button><button className="primary" disabled={busy||!size.w} onClick={()=>void save()}>{en?'Use photo':'使用照片'}</button></div>
  </DialogContent></Dialog>;
}
