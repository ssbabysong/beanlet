import {Capacitor} from '@capacitor/core';
import {Haptics,ImpactStyle} from '@capacitor/haptics';
export function navigationFeedback(){
 if(Capacitor.isNativePlatform())void Haptics.impact({style:ImpactStyle.Light}).catch(()=>{});
 else if(typeof navigator.vibrate==='function')navigator.vibrate(12);
}
