const words={
 zh:[['打瞌睡的','散步的','月光下的','慢半拍的','周末的','偷偷发光的','云朵里的','刚醒来的','漫游的','好奇的','口袋里的','晒太阳的'],['小豆星','小宇宙','咖啡精灵','小尾巴','云朵','小岛','纸飞机','小蘑菇','小月亮','小熊','白日梦','小花园']],
 en:[['Sleepy','Wandering','Moonlit','Slow','Sunday','Twinkling','Cloudy','Dreamy','Cosmic','Curious','Pocket','Sunny'],['Bean','Orbit','Pixie','Comet','Cloud','Island','Kite','Mushroom','Moon','Bear','Daydream','Garden']]
};
export function randomBeanName(language:'zh'|'en',existing:string[]=[],random:()=>number=Math.random){
 const [first,last]=words[language];const total=first.length*last.length;
 const start=Math.floor(random()*total)%total;
 const names=new Set(existing);
 for(let offset=0;offset<total;offset++){
  const i=(start+offset)%total;
  const name=first[Math.floor(i/last.length)]+(language==='en'?' ':'')+last[i%last.length];
  if(!names.has(name))return name;
 }
 const base=language==='en'?'Little Bean':'小豆星';let n=2;while(names.has(`${base} ${n}`))n++;return `${base} ${n}`;
}
