export type PixelBounds={x:number;y:number;width:number;height:number};

export function alphaBounds(data:ArrayLike<number>,width:number,height:number,threshold=8):PixelBounds|null{
 let left=width,top=height,right=-1,bottom=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if((data[(y*width+x)*4+3]||0)>threshold){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}
 return right<left||bottom<top?null:{x:left,y:top,width:right-left+1,height:bottom-top+1};
}
