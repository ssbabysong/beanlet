// Use catalog identity so every bag and memory of a coffee keeps the same color.
const palettes=[
 ['#dce7f1','#8b9aa4','#c6d5e0'],['#e9dff0','#a297af','#d7cce1'],
 ['#e3e9d7','#939d83','#cfd8bd'],['#f0e6d6','#afa38c','#e1d3bd'],
 ['#e1e9e6','#8eaaa1','#c8d9d3'],['#f1dce0','#b89b9f','#e4c5cd'],
 ['#ebdceb','#ad96b1','#dac5de'],['#f2e0db','#bc9f95','#e6ccc4'],
];
type Coffee={id:string;catalogId?:string};
export function beanPalette(bean:Coffee){let hash=0;for(const c of bean.catalogId||bean.id)hash=(Math.imul(hash,31)+c.charCodeAt(0))|0;const [fill,line,side]=palettes[(hash>>>0)%palettes.length];return {fill,line,side}}
export function calendarColors(beans:Coffee[]){const colors=[...new Set(beans.map(b=>beanPalette(b).fill))];return colors.length<2?colors[0]||'transparent':`linear-gradient(135deg,${colors.map((c,i)=>`${c} ${i/colors.length*100}% ${(i+1)/colors.length*100}%`).join(',')})`}
