"use client";
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import dictionary from './translations.json';
import {bilingualBean} from './catalog';
export type Language='zh'|'en';
const LocaleContext=createContext<{language:Language;setLanguage:(l:Language)=>void}>({language:'zh',setLanguage:()=>{}});
export function LocaleProvider({children}:{children:ReactNode}){const [language,setLanguageState]=useState<Language>('zh');useEffect(()=>{try{if(localStorage.getItem('beanlet-language')==='en')setLanguageState('en')}catch{}},[]);useEffect(()=>{document.documentElement.lang=language==='en'?'en':'zh-CN'},[language]);function setLanguage(l:Language){setLanguageState(l);try{localStorage.setItem('beanlet-language',l)}catch{}}return <LocaleContext.Provider value={{language,setLanguage}}>{children}</LocaleContext.Provider>}
export function translate(value:string,language:Language):string{
 if(language==='zh'||!value)return value;
 const exact=(dictionary as Record<string,string>)[value.trim()];if(exact)return exact;
 const rules:[RegExp,(...p:string[])=>string][]=[
 [/^养豆中 · 还需 (\d+) 天$/,n=>`Resting · ${n} days to go`],
 [/^可以开冲 · (\d+) 天后进入佳期$/,n=>`Ready to brew · peak in ${n} days`],
 [/^赏味期还剩 (\d+) 天$/,n=>`${n} days left in the flavor window`],
 [/^赏味第 (\d+)–(\d+) 天$/,(a,b)=>`Enjoy on days ${a}–${b}`],
 [/^建议养豆 ([\d–]+) 天 · 赏味第 (\d+)–(\d+) 天$/,(r,a,b)=>`Rest ${r} days · enjoy on days ${a}–${b}`],
 [/^ · 养豆约 (\d+) 天$/,n=>` · rest about ${n} days`],
 [/^(\d+) 包在手边$/,n=>`${n} bags on your shelf`],
 [/^(\d+) 款风味，慢慢收集$/,n=>`${n} coffees to discover`],
 [/^(\d+) 杯$/,n=>`${n} brews`],
 [/^评分 (\d+) \/ 5$/,n=>`Rating ${n} / 5`],[/^(\d+) 星$/,n=>`${n} stars`],
 [/^研磨 (.*) · $/,n=>`Grind ${n} · `],[/^用时 (.*)$/,n=>`Time ${n}`],
 [/^查看(.*)$/,n=>`View ${n}`],[/^编辑(.*)$/,n=>`Edit ${n}`],[/^(.*)官网资料$/,n=>`${n} source`],
 ];
 for(const [r,fn] of rules){const m=value.match(r);if(m)return fn(...m.slice(1))}
 return value;
}
export function useI18n(){const {language,setLanguage}=useContext(LocaleContext);const t=(s:string)=>translate(s,language);return {language,setLanguage,t,label:(b?:Parameters<typeof bilingualBean>[0])=>bilingualBean(b)[language],otherLabel:(b?:Parameters<typeof bilingualBean>[0])=>bilingualBean(b)[language==='en'?'zh':'en'],info:(b:Parameters<typeof bilingualBean>[0],key:'origin'|'process'|'flavor')=>language==='en'?bilingualBean(b)[`${key}En`]:b?.[key]||''}}
