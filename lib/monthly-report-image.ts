import {stickerPlacement} from './sticker-layout';

type ReportPhoto={id:string;src:string;date?:string;cutout?:boolean};
type ReportDay={day:number;cups:number};
type ReportBean={name:string;count:number};
type MonthlyReportImageInput={
 language:'zh'|'en';month:string;year:number;monthIndex:number;cups:number;pourOvers:number;milks:number;
 beanCount:number;daily:ReportDay[];beanRanking:ReportBean[];photos:ReportPhoto[];
};

function loadImage(src:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('image'));image.src=src})}
function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.closePath()}
function fitText(ctx:CanvasRenderingContext2D,text:string,maxWidth:number,start:number,min:number,font:string){let size=start;while(size>min){ctx.font=`${size}px ${font}`;if(ctx.measureText(text).width<=maxWidth)break;size-=2}return size}
function card(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r=32){ctx.fillStyle='rgba(255,255,255,.57)';roundRect(ctx,x,y,w,h,r);ctx.fill()}
function drawBean(ctx:CanvasRenderingContext2D,x:number,y:number,size:number,rotation:number,color:string){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,0,size*.43,size*.62,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(92,67,57,.28)';ctx.lineWidth=Math.max(2,size*.035);ctx.beginPath();ctx.moveTo(-size*.08,-size*.48);ctx.bezierCurveTo(size*.16,-size*.20,-size*.18,size*.18,size*.08,size*.48);ctx.stroke();ctx.restore()}
function drawCheckStamp(ctx:CanvasRenderingContext2D,x:number,y:number,cups:number,index:number){const colors=['rgba(148,161,202,.72)','rgba(194,174,207,.72)','rgba(178,196,183,.72)'],radius=19;ctx.save();ctx.translate(x,y);ctx.rotate(((index%5)-2)*.035);ctx.fillStyle=colors[index%colors.length];ctx.beginPath();for(let point=0;point<24;point++){const angle=point/24*Math.PI*2-Math.PI/2,r=radius+(point%2?1.8:-1.2),px=Math.cos(angle)*r,py=Math.sin(angle)*r;if(point)ctx.lineTo(px,py);else ctx.moveTo(px,py)}ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(255,255,255,.62)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,14.5,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.92)';ctx.lineWidth=2.3;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(-2,5);ctx.lineTo(8,-6);ctx.stroke();if(cups>1){ctx.fillStyle='#f8f5f0';ctx.beginPath();ctx.arc(17,15,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(82,91,120,.75)';ctx.font='600 11px "Avenir Next","Helvetica Neue",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(`×${cups}`,17,15)}ctx.restore()}

export async function createMonthlyReportImage(input:MonthlyReportImageInput){
 await document.fonts?.ready;
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('canvas');
 const gradient=ctx.createLinearGradient(0,0,1080,1920);gradient.addColorStop(0,'#f8f5f0');gradient.addColorStop(.55,'#f1edf0');gradient.addColorStop(1,'#e7e8f1');ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1920);
 ctx.fillStyle='rgba(119,103,135,.075)';ctx.beginPath();ctx.ellipse(965,290,270,390,-.35,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(191,151,142,.07)';ctx.beginPath();ctx.ellipse(80,1690,300,280,.45,0,Math.PI*2);ctx.fill();
 const serif='"Bodoni 72",Didot,"Times New Roman",serif',ui='"LXGW WenKai Lite","Klee One","Songti SC",serif';
 ctx.textBaseline='top';ctx.fillStyle='rgba(86,62,52,.72)';ctx.font=`700 154px ${serif}`;const title='BEANLET',titleWidth=ctx.measureText(title).width;ctx.save();ctx.translate(48,25);ctx.scale(984/titleWidth,1);ctx.fillText(title,0,0);ctx.restore();
 const compactMonth=`${input.year}.${String(input.monthIndex+1).padStart(2,'0')}`;ctx.textAlign='right';ctx.font='600 30px "Avenir Next","Helvetica Neue",sans-serif';ctx.fillStyle='rgba(86,62,52,.58)';ctx.fillText(compactMonth,1030,185);ctx.textAlign='left';

 const loaded=(await Promise.all(input.photos.slice(0,24).map(async photo=>{try{return {photo,image:await loadImage(photo.src)}}catch{return null}}))).filter((item):item is {photo:ReportPhoto;image:HTMLImageElement}=>!!item);

 // Brew calendar
 card(ctx,48,245,984,435,38);
 const weekdays=input.language==='en'?['S','M','T','W','T','F','S']:['日','一','二','三','四','五','六'],cellW=126,startX=99;
 ctx.textAlign='center';ctx.font=`400 21px ${ui}`;ctx.fillStyle='rgba(82,91,120,.42)';weekdays.forEach((day,index)=>ctx.fillText(day,startX+index*cellW,280));
 const firstDay=new Date(input.year,input.monthIndex,1).getDay();
 input.daily.forEach((day,index)=>{const cell=firstDay+day.day-1,col=cell%7,row=Math.floor(cell/7),x=startX+col*cellW,y=330+row*50;if(day.cups)drawCheckStamp(ctx,x,y+12,day.cups,index);ctx.fillStyle=day.cups?'rgba(255,255,255,.96)':'rgba(78,87,115,.68)';ctx.font=`500 ${day.cups?15:21}px ${ui}`;ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(String(day.day),x,day.cups?y+2:y)});ctx.textAlign='left';ctx.textBaseline='top';

 // Sticker collection
 card(ctx,48,704,984,568,38);
 if(loaded.length){const columns=loaded.length<=3?loaded.length:loaded.length<=8?4:loaded.length<=15?5:6,rows=Math.ceil(loaded.length/columns),area={x:82,y:742,w:916,h:492},cellW=area.w/columns,cellH=area.h/rows;loaded.forEach(({photo,image},index)=>{const place=stickerPlacement(photo.id,index,loaded.length,false),row=Math.floor(index/columns),column=index%columns,itemsInRow=Math.min(columns,loaded.length-row*columns),rowOffset=(columns-itemsInRow)*cellW/2,ratio=Math.min(1.2,Math.max(.82,image.naturalHeight/image.naturalWidth)),size=Math.min(233,Math.max(98,Math.min(cellW*1.1,cellH*1.08/ratio))),dw=size,dh=size*ratio,cx=area.x+rowOffset+(column+.5)*cellW+(place.x-50)/50*cellW*.025,cy=area.y+(row+.5)*cellH+(place.y-50)/50*cellH*.025;ctx.save();ctx.translate(cx,cy);ctx.rotate(place.rotation*.65*Math.PI/180);if(!photo.cutout){ctx.fillStyle='rgba(255,255,255,.94)';ctx.shadowColor='rgba(69,60,78,.13)';ctx.shadowBlur=22;ctx.shadowOffsetY=8;roundRect(ctx,-dw/2-8,-dh/2-8,dw+16,dh+16,31);ctx.fill();ctx.shadowColor='transparent';roundRect(ctx,-dw/2,-dh/2,dw,dh,25);ctx.clip()}else{ctx.shadowColor='rgba(69,60,78,.11)';ctx.shadowBlur=15;ctx.shadowOffsetY=7}ctx.drawImage(image,-dw/2,-dh/2,dw,dh);ctx.restore()})}
 else{const colors=['#d8c7d7','#c8d5e8','#e7c8bd','#c9d9cf','#e7d9b9'];for(let i=0;i<13;i++){const angle=i*2.399,r=55+Math.sqrt(i)*92;drawBean(ctx,540+Math.cos(angle)*r,1000+Math.sin(angle)*r*.57,62+(i%4)*9,angle*.18,colors[i%colors.length])}}

 // Method split and daily line, 1:3 width
 card(ctx,48,1296,230,286,34);card(ctx,298,1296,734,286,34);ctx.fillStyle='rgba(82,91,120,.52)';ctx.font=`600 18px ${serif}`;ctx.fillText(input.language==='en'?'METHOD':'冲煮方式',72,1323);ctx.fillText(input.language==='en'?'DAILY BREWS':'冲煮趋势',326,1323);
 const total=Math.max(1,input.pourOvers+input.milks),pourAngle=Math.PI*2*input.pourOvers/total,cx=163,cy=1438;ctx.lineWidth=25;ctx.strokeStyle='rgba(203,183,214,.70)';ctx.beginPath();ctx.arc(cx,cy,58,-Math.PI/2,Math.PI*1.5);ctx.stroke();if(input.pourOvers){ctx.strokeStyle='rgba(139,153,198,.88)';ctx.beginPath();ctx.arc(cx,cy,58,-Math.PI/2,-Math.PI/2+pourAngle);ctx.stroke()}ctx.textAlign='center';ctx.fillStyle='#56617f';ctx.font=`600 34px ${ui}`;ctx.fillText(String(input.cups),cx,1415);ctx.font=`400 18px ${ui}`;ctx.fillStyle='rgba(82,91,120,.58)';ctx.fillText(input.language==='en'?'cups':'杯',cx,1453);ctx.font=`400 17px ${ui}`;ctx.fillStyle='#7783a9';ctx.fillText(`${input.language==='en'?'Pour':'手冲'} ${input.pourOvers}`,cx,1512);ctx.fillStyle='#a28eae';ctx.fillText(`${input.language==='en'?'Milk':'奶咖'} ${input.milks}`,cx,1540);ctx.textAlign='left';
 const graph={x:340,y:1386,w:648,h:137},barMax=Math.max(1,...input.daily.map(day=>day.cups)),step=graph.w/input.daily.length,barWidth=Math.max(7,step*.58);ctx.strokeStyle='rgba(90,99,127,.12)';ctx.lineWidth=2;for(let i=0;i<3;i++){const y=graph.y+i*graph.h/2;ctx.beginPath();ctx.moveTo(graph.x,y);ctx.lineTo(graph.x+graph.w,y);ctx.stroke()}input.daily.forEach((day,index)=>{if(!day.cups)return;const height=Math.max(8,day.cups/barMax*graph.h),x=graph.x+index*step+(step-barWidth)/2,y=graph.y+graph.h-height;ctx.fillStyle=index%2?'rgba(157,170,207,.72)':'rgba(133,149,198,.82)';roundRect(ctx,x,y,barWidth,height,barWidth/2);ctx.fill()});ctx.fillStyle='rgba(82,91,120,.45)';ctx.font=`400 17px ${ui}`;ctx.fillText('1',graph.x,1542);ctx.textAlign='center';ctx.fillText(String(Math.ceil(input.daily.length/2)),graph.x+graph.w/2,1542);ctx.textAlign='right';ctx.fillText(String(input.daily.length),graph.x+graph.w,1542);ctx.textAlign='left';

 // Bean ranking
 card(ctx,48,1608,984,248,38);ctx.fillStyle='rgba(82,91,120,.52)';ctx.font=`600 20px ${serif}`;ctx.fillText(input.language==='en'?'COFFEE RANKING':'咖啡豆排行',78,1638);const ranking=input.beanRanking.slice(0,4),rankMax=Math.max(1,...ranking.map(bean=>bean.count));ranking.forEach((bean,index)=>{const y=1686+index*40;ctx.fillStyle='rgba(82,91,120,.36)';ctx.font=`italic 600 21px ${serif}`;ctx.fillText(String(index+1).padStart(2,'0'),80,y);ctx.fillStyle='#56617f';const size=fitText(ctx,bean.name,430,24,17,ui);ctx.font=`500 ${size}px ${ui}`;ctx.fillText(bean.name,126,y-1);ctx.fillStyle='rgba(141,151,190,.28)';roundRect(ctx,610,y+4,330,12,6);ctx.fill();ctx.fillStyle='rgba(128,143,190,.78)';roundRect(ctx,610,y+4,330*bean.count/rankMax,12,6);ctx.fill();ctx.fillStyle='rgba(82,91,120,.65)';ctx.font=`italic 600 22px ${serif}`;ctx.textAlign='right';ctx.fillText(`×${bean.count}`,992,y-4);ctx.textAlign='left'});if(!ranking.length){ctx.fillStyle='rgba(82,91,120,.38)';ctx.font=`italic 500 24px ${serif}`;ctx.fillText('COFFEE, SLOWLY COLLECTED.',80,1715)}
 return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('image')),'image/png'));
}
