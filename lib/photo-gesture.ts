export type CropView={zoom:number;x:number;y:number};
export type CropPoint={x:number;y:number};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
// Coordinates and image dimensions are expressed relative to the square crop area.
export function moveCrop(view:CropView,base:{w:number;h:number},from:CropPoint,to:CropPoint,factor=1):CropView{
 const zoom=clamp(view.zoom*factor,1,3),ratio=zoom/view.zoom;
 const width=base.w*view.zoom,height=base.h*view.zoom;
 const left=to.x-(from.x-(1-width)*view.x)*ratio;
 const top=to.y-(from.y-(1-height)*view.y)*ratio;
 return {zoom,x:base.w*zoom>1?clamp(left/(1-base.w*zoom),0,1):.5,y:base.h*zoom>1?clamp(top/(1-base.h*zoom),0,1):.5};
}

export type FreeCrop={zoom:number;angle:number;cx:number;cy:number};
export function transformCrop(view:FreeCrop,base:{w:number;h:number},from:CropPoint,to:CropPoint,factor=1,turn=0):FreeCrop{
 const angle=((view.angle+turn+180)%360+360)%360-180,r=angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
 const span=Math.abs(c)+Math.abs(s),zoom=clamp(view.zoom*factor,Math.max(span/base.w,span/base.h),4);
 const delta=turn*Math.PI/180,dc=Math.cos(delta),ds=Math.sin(delta),ratio=zoom/view.zoom;
 const x=view.cx-from.x,y=view.cy-from.y;
 const cx=to.x+(x*dc-y*ds)*ratio,cy=to.y+(x*ds+y*dc)*ratio;
 // Clamp in image coordinates so the rotated photo always covers all crop corners.
 const ux=(cx-.5)*c+(cy-.5)*s,uy=-(cx-.5)*s+(cy-.5)*c;
 const mx=Math.max(0,(base.w*zoom-span)/2),my=Math.max(0,(base.h*zoom-span)/2);
 const bx=clamp(ux,-mx,mx),by=clamp(uy,-my,my);
 return {zoom,angle,cx:.5+bx*c-by*s,cy:.5+bx*s+by*c};
}

// Sticker editing intentionally allows transparent space around the cut-out subject.
export function transformSticker(view:FreeCrop,from:CropPoint,to:CropPoint,factor=1,turn=0):FreeCrop{
 const angle=((view.angle+turn+180)%360+360)%360-180,zoom=clamp(view.zoom*factor,.35,4);
 const delta=turn*Math.PI/180,dc=Math.cos(delta),ds=Math.sin(delta),ratio=zoom/view.zoom;
 const x=view.cx-from.x,y=view.cy-from.y;
 return {
  zoom,
  angle,
  cx:clamp(to.x+(x*dc-y*ds)*ratio,-.65,1.65),
  cy:clamp(to.y+(x*ds+y*dc)*ratio,-.65,1.65),
 };
}
