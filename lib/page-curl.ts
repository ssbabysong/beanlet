// Page-curl geometry. The page is a flat sheet hinged on the spine (x=0, y down). The point C of its outer edge is
// lifted to P; the sheet folds along the perpendicular bisector of CP. Everything on C's side of that line is turned
// over (the flap, showing the back of the sheet) and everything else stays flat. Pure functions, so the gesture
// code only has to feed in P and paint the results.
export type Point={x:number;y:number};
export type Curl={
 front:Point[];      // flat part of the leaf, in leaf-local coordinates (origin at the leaf's top-left)
 flap:Point[];       // the turned-over part, in the back element's local coordinates (before its transform)
 revealed:Point[];   // where the page underneath shows through, in leaf-local coordinates
 matrix:[number,number,number,number,number,number]; // CSS matrix() for the back element, relative to the spine
 fold:{point:Point;normal:Point}; // fold line in spine coordinates; normal points towards C (the lifted side)
 progress:number;    // 0 = flat on its own side, 1 = laid flat on the other side
};

// side 'right': a leaf on [0,W] lifted at its right edge (a forward turn, or a single page coming back);
// side 'left': a leaf on [-W,0] lifted at its left edge (a backward turn of a spread).
export function pageCurl(side:'right'|'left',W:number,H:number,c:number,P:Point):Curl{
 const sign=side==='right'?1:-1,x0=side==='right'?0:-W,C={x:sign*W,y:c};
 const rect:Point[]=[{x:x0,y:0},{x:x0+W,y:0},{x:x0+W,y:H},{x:x0,y:H}];
 const dx=C.x-P.x,dy=C.y-P.y,len=Math.hypot(dx,dy);
 const toLeaf=(points:Point[])=>points.map(p=>({x:p.x-x0,y:p.y}));
 // Back element local a ↔ leaf point: right leaf x=W−a (its back lands on the left page), left leaf x=−a.
 const toBack=(points:Point[])=>points.map(p=>({x:side==='right'?W-p.x:-p.x,y:p.y}));
 if(len<.5)return {front:toLeaf(rect),flap:[],revealed:[],matrix:[-1,0,0,1,side==='right'?2*W:0,0],fold:{point:C,normal:{x:sign,y:0}},progress:0};
 const n={x:dx/len,y:dy/len},M={x:(C.x+P.x)/2,y:(C.y+P.y)/2};
 const towardC=(p:Point)=>(p.x-M.x)*n.x+(p.y-M.y)*n.y;
 const flat=clip(rect,p=>-towardC(p)),lifted=clip(rect,towardC);
 // Reflection across the fold: v ↦ v − 2((v−M)·n)n, i.e. A=I−2nnᵀ, t=2(M·n)n. The back element's local a maps to a
 // leaf point first (x=W−a or x=−a: linear part diag(−1,1)), so its matrix is A·diag(−1,1) with the matching offset.
 const A=[1-2*n.x*n.x,-2*n.x*n.y,-2*n.x*n.y,1-2*n.y*n.y],k=2*(M.x*n.x+M.y*n.y),t={x:k*n.x,y:k*n.y};
 const shift=side==='right'?W:0,e=A[0]*shift+t.x,f=A[2]*shift+t.y;
 const progress=Math.max(0,Math.min(1,sign*(C.x-P.x)/(2*W)));
 return {front:toLeaf(flat),flap:toBack(lifted),revealed:toLeaf(lifted),matrix:[-A[0],-A[2],A[1],A[3],e,f],fold:{point:M,normal:n},progress};
}

// Keep the lifted point where a real sheet could reach: no farther from the spine than the page is wide.
export function reachable(W:number,H:number,c:number,P:Point):Point{
 const dx=P.x,dy=P.y-c,d=Math.hypot(dx,dy),clampY=(y:number)=>Math.max(-H*.35,Math.min(H*1.35,y));
 if(d<=W)return {x:P.x,y:clampY(P.y)};
 return {x:dx/d*W,y:clampY(c+dy/d*W)};
}

// Sutherland–Hodgman against one half-plane: keeps points where value(p) ≥ 0.
function clip(polygon:Point[],value:(p:Point)=>number){
 const out:Point[]=[];
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],va=value(a),vb=value(b);
  if(va>=0)out.push(a);
  if((va>=0)!==(vb>=0)){const r=va/(va-vb);out.push({x:a.x+(b.x-a.x)*r,y:a.y+(b.y-a.y)*r})}
 }
 return out;
}

export const polygonCss=(points:Point[])=>points.length<3?'polygon(0 0,0 0,0 0)':`polygon(${points.map(p=>`${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(',')})`;
