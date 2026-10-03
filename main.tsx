import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './app/page';
import './app/globals.css';

const root=document.getElementById('root')!;
// Include portal dialogs while preserving React's record long-press handlers.
for(const event of ['dragstart','contextmenu']){
  document.addEventListener(event,e=>{
    if(e.target instanceof Element&&e.target.closest('img,svg,.sticker,.coffee-bag'))e.preventDefault();
  });
}
createRoot(root).render(<App/>);
