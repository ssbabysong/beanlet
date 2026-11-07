import assert from 'node:assert/strict';
import {pageCurl,reachable,polygonCss} from '../lib/page-curl.ts';
const W=100,H=200,close=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-6,`${msg}: ${a} ≠ ${b}`);
const area=ps=>Math.abs(ps.reduce((s,p,i)=>{const q=ps[(i+1)%ps.length];return s+p.x*q.y-q.x*p.y},0))/2;
const apply=(m,p)=>({x:m[0]*p.x+m[2]*p.y+m[4],y:m[1]*p.x+m[3]*p.y+m[5]});
// Untouched: the whole leaf is flat.
let c=pageCurl('right',W,H,H,{x:W,y:H});assert.equal(area(c.front),W*H);assert.equal(c.flap.length,0);assert.equal(c.progress,0);
// Laid flat on the other side: nothing flat remains, and the back lands exactly on the left page, unmirrored.
c=pageCurl('right',W,H,H,{x:-W,y:H});close(area(c.front),0,'front');close(area(c.flap),W*H,'flap');close(c.progress,1,'progress');
for(const p of [{x:0,y:0},{x:W,y:0},{x:30,y:70}]){const q=apply(c.matrix,p);close(q.x,p.x-W,'x');close(q.y,p.y,'y')}
// Mid-curl: areas add up, every flap point lands at the fold reflection of its leaf point, and the lifted corner is under the finger.
for(const [side,P,cy] of [['right',{x:40,y:150},H],['right',{x:20,y:120},100],['left',{x:-30,y:60},0],['left',{x:10,y:180},H]]){
 c=pageCurl(side,W,H,cy,P);
 close(area(c.front)+area(c.revealed),W*H,`${side} areas`);
 assert.equal(c.flap.length,c.revealed.length);
 const {point:M,normal:n}=c.fold,x0=side==='right'?0:-W;
 c.revealed.forEach((p,i)=>{const leaf={x:p.x+x0,y:p.y},d=(leaf.x-M.x)*n.x+(leaf.y-M.y)*n.y,r={x:leaf.x-2*d*n.x,y:leaf.y-2*d*n.y},q=apply(c.matrix,c.flap[i]);close(q.x,r.x,`${side} reflect x`);close(q.y,r.y,`${side} reflect y`)});
 const C={x:side==='right'?W:-W,y:cy},back={x:side==='right'?W-C.x:-C.x,y:C.y},q=apply(c.matrix,back);close(q.x,P.x,`${side} corner x`);close(q.y,P.y,`${side} corner y`);
 assert.ok(c.progress>0&&c.progress<1);
}
// A sheet can't be pulled farther from the spine than it is wide.
const r=reachable(W,H,H,{x:-300,y:H});close(Math.hypot(r.x,r.y-H),W,'reach');
assert.deepEqual(reachable(W,H,H,{x:50,y:150}),{x:50,y:150});
assert.match(polygonCss([{x:0,y:0},{x:1,y:0},{x:1,y:1}]),/^polygon\(0\.0px 0\.0px,/);
console.log('Page curl: flat, turned, mid-curl reflection, corner tracking, both sides and reach passed');
