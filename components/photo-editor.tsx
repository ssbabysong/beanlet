import {Eraser,Move,RotateCcw,Undo2} from 'lucide-react';
import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {transformCrop,transformSticker,type CropPoint} from '@/lib/photo-gesture';
import {alphaBounds} from '@/lib/image-bounds';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useI18n} from '@/lib/i18n';

type ErasePoint={x:number;y:number};
type EraseStroke={id:number;points:ErasePoint[];width:number};

export function PhotoEditor({source,onCancel,onSave,mode='photo'}:{source:File|string|null;onCancel:()=>void;onSave:(file:File)=>void;mode?:'photo'|'sticker'}){
  const {language}=useI18n(),en=language==='en';
  const sticker=mode==='sticker';
  const [url,setUrl]=useState(''),[size,setSize]=useState({w:0,h:0}),[crop,setCrop]=useState({zoom:1,angle:0,cx:.5,cy:.5}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[erasing,setErasing]=useState(false),[eraseStrokes,setEraseStrokes]=useState<EraseStroke[]>([]);
  const img=useRef<HTMLImageElement>(null),preview=useRef<HTMLCanvasElement>(null),frame=useRef<HTMLDivElement>(null),pointers=useRef(new Map<number,CropPoint>()),view=useRef({zoom:1,angle:0,cx:.5,cy:.5}),erasePointer=useRef<number|null>(null),activeStroke=useRef<number|null>(null);
  useEffect(()=>{pointers.current.clear();erasePointer.current=null;activeStroke.current=null;view.current={zoom:1,angle:0,cx:.5,cy:.5};setSize({w:0,h:0});setCrop(view.current);setEraseStrokes([]);setErasing(false);setError('');const u=source instanceof File?URL.createObjectURL(source):source||'';setUrl(u);return()=>{if(source instanceof File)URL.revokeObjectURL(u)}},[source]);
  const baseScale=size.w?(sticker?Math.min(1/size.w,1/size.h)*.82:Math.max(1/size.w,1/size.h)):1,scale=baseScale*crop.zoom;
  function point(e:PointerEvent<HTMLDivElement>){const r=e.currentTarget.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.width}}
  function imagePoint(p:CropPoint){const r=-crop.angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r),dx=p.x-crop.cx,dy=p.y-crop.cy;return {x:size.w/2+(dx*c-dy*s)/scale,y:size.h/2+(dx*s+dy*c)/scale}}
  function draw(canvas:HTMLCanvasElement,output:number){
    const image=img.current,ctx=canvas.getContext('2d');if(!image||!ctx||!size.w)return;
    canvas.width=output;canvas.height=output;ctx.clearRect(0,0,output,output);if(!sticker){ctx.fillStyle='#fff';ctx.fillRect(0,0,output,output)}
    ctx.save();ctx.translate(crop.cx*output,crop.cy*output);ctx.rotate(crop.angle*Math.PI/180);ctx.scale(scale*output,scale*output);ctx.drawImage(image,-size.w/2,-size.h/2,size.w,size.h);
    if(sticker&&eraseStrokes.length){ctx.globalCompositeOperation='destination-out';ctx.lineCap='round';ctx.lineJoin='round';for(const stroke of eraseStrokes){ctx.lineWidth=stroke.width;ctx.beginPath();const first=stroke.points[0];if(!first)continue;if(stroke.points.length===1){ctx.arc(first.x-size.w/2,first.y-size.h/2,stroke.width/2,0,Math.PI*2);ctx.fill()}else{ctx.moveTo(first.x-size.w/2,first.y-size.h/2);for(const p of stroke.points.slice(1))ctx.lineTo(p.x-size.w/2,p.y-size.h/2);ctx.stroke()}}}
    ctx.restore();
  }
  function fittedSticker(source:HTMLCanvasElement,output:number){
    const sourceContext=source.getContext('2d',{willReadFrequently:true});if(!sourceContext)return source;
    const bounds=alphaBounds(sourceContext.getImageData(0,0,source.width,source.height).data,source.width,source.height);if(!bounds)return source;
    const target=document.createElement('canvas'),padding=Math.round(output*.035),available=output-padding*2,fit=Math.min(available/bounds.width,available/bounds.height),width=bounds.width*fit,height=bounds.height*fit;
    target.width=output;target.height=output;target.getContext('2d')!.drawImage(source,bounds.x,bounds.y,bounds.width,bounds.height,(output-width)/2,(output-height)/2,width,height);
    return target;
  }
  useEffect(()=>{if(preview.current&&size.w)draw(preview.current,768)},[crop,size,eraseStrokes,sticker]);
  function update(from:CropPoint,to:CropPoint,factor=1,turn=0){
    const next=sticker?transformSticker(view.current,from,to,factor,turn):transformCrop(view.current,{w:size.w*baseScale,h:size.h*baseScale},from,to,factor,turn);
    view.current=next;setCrop(next);
  }
  function move(e:PointerEvent<HTMLDivElement>){
    if(erasing){if(erasePointer.current!==e.pointerId||busy)return;const p=imagePoint(point(e)),id=activeStroke.current;if(id!==null)setEraseStrokes(strokes=>strokes.map(stroke=>stroke.id===id?{...stroke,points:[...stroke.points,p]}:stroke));return}
    const points=pointers.current;if(!points.has(e.pointerId)||busy)return;
    const before=[...points.values()];points.set(e.pointerId,point(e));const after=[...points.values()];
    if(before.length===1){update(before[0],after[0]);return}
    const mid=(p:CropPoint[])=>({x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2});
    const distance=(p:CropPoint[])=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
    const angle=(p:CropPoint[])=>Math.atan2(p[1].y-p[0].y,p[1].x-p[0].x);
    const d=distance(before),turn=(angle(after)-angle(before))*180/Math.PI;
    update(mid(before),mid(after),d>.001?distance(after)/d:1,d>.001?turn:0);
  }
  function end(e:PointerEvent<HTMLDivElement>){pointers.current.delete(e.pointerId);if(erasePointer.current===e.pointerId){erasePointer.current=null;activeStroke.current=null}}
  async function save(){
    if(!img.current||!size.w)return;
    setBusy(true);setError('');
    try{
      const canvas=document.createElement('canvas');draw(canvas,1024);const result=sticker?fittedSticker(canvas,1024):canvas;
      const type=sticker?'image/png':'image/jpeg';
      const blob=await new Promise<Blob>((resolve,reject)=>result.toBlob(b=>b?resolve(b):reject(Error()),type,.86));
      onSave(new File([blob],sticker?'coffee-sticker.png':'bean-photo.jpg',{type}));
    }catch{setError(en?'Could not save this photo. Please try another.':'照片处理失败，请换一张试试。')}finally{setBusy(false)}
  }
  return <Dialog open={!!source} onOpenChange={v=>{if(!v&&!busy)onCancel()}}><DialogContent className={`editor photo-editor${sticker?' sticker-editor':''}`} showCloseButton={false}>
    <DialogTitle>{sticker?(en?'Adjust coffee sticker':'调整咖啡贴纸'):(en?'Adjust photo':'调整照片')}</DialogTitle><DialogDescription>{erasing?(en?'Brush over anything you want to remove.':'用手指涂过想要抹掉的部分'):(en?'Drag to move; pinch and twist to zoom and rotate.':'单指移动，双指缩放和旋转')}</DialogDescription>
    <div ref={frame} className="photo-crop-frame" tabIndex={0} aria-label={en?'Photo crop; plus/minus to zoom, arrow keys to rotate':'照片裁剪，加减键缩放，左右键旋转'}
      data-mode={erasing?'erase':'move'}
      onPointerDown={e=>{if(!size.w||busy||e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);if(erasing){if(erasePointer.current!==null)return;const id=Date.now(),p=imagePoint(point(e));erasePointer.current=e.pointerId;activeStroke.current=id;setEraseStrokes(strokes=>[...strokes,{id,points:[p],width:.085/scale}]);return}if(pointers.current.size>=2)return;pointers.current.set(e.pointerId,point(e))}}
      onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
      onWheel={e=>{if(!size.w||busy||erasing)return;const r=e.currentTarget.getBoundingClientRect();const p={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.width};update(p,p,Math.exp(-e.deltaY*.002))}}
      onKeyDown={e=>{if(!size.w||busy||erasing)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();update({x:.5,y:.5},{x:.5,y:.5},1,e.key==='ArrowLeft'?-1:1)}if(['+','=','-'].includes(e.key)){e.preventDefault();update({x:.5,y:.5},{x:.5,y:.5},e.key==='-'?1/1.1:1.1)}}}>

      {url&&<img ref={img} className="photo-editor-source" src={url} draggable={false} alt="" aria-hidden="true" onLoad={e=>setSize({w:e.currentTarget.naturalWidth,h:e.currentTarget.naturalHeight})} onError={()=>setError(en?'This photo format is not supported. Choose JPG or PNG.':'无法读取这张照片，请选择 JPG 或 PNG。')}/>}<canvas ref={preview} aria-label={en?'Edited sticker preview':'贴纸编辑预览'}/>
    </div>

    <div className="photo-editor-tools">
      {sticker&&<><button type="button" aria-pressed={!erasing} onClick={()=>setErasing(false)}><Move size={16}/>{en?'Adjust':'调整'}</button><button type="button" aria-pressed={erasing} onClick={()=>{pointers.current.clear();setErasing(true)}}><Eraser size={16}/>{en?'Erase':'擦除'}</button><button type="button" disabled={!eraseStrokes.length} onClick={()=>setEraseStrokes(strokes=>strokes.slice(0,-1))}><Undo2 size={16}/>{en?'Undo':'撤销'}</button></>}
      <button type="button" disabled={busy||!size.w} onClick={()=>{pointers.current.clear();view.current={zoom:1,angle:0,cx:.5,cy:.5};setCrop(view.current);setEraseStrokes([])}}><RotateCcw size={17}/>{en?'Reset':'重置'}</button>
    </div>
    {error&&<p role="alert" className="error">{error}</p>}
    <div className="photo-editor-actions"><button className="secondary" disabled={busy} onClick={onCancel}>{en?'Cancel':'取消'}</button><button className="primary" disabled={busy||!size.w} onClick={()=>void save()}>{en?'Use photo':'使用照片'}</button></div>
  </DialogContent></Dialog>;
}
