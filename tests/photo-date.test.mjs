import assert from 'node:assert/strict';
import {exifDate} from '../lib/photo-date.ts';
// A minimal JPEG: SOI, then an APP1 Exif segment holding IFD0 → Exif IFD → DateTimeOriginal.
function jpeg(little,date,{original=true}={}){
 const tiff=[],w16=v=>little?[v&255,v>>8]:[v>>8,v&255],w32=v=>little?[v&255,(v>>8)&255,(v>>16)&255,v>>>24]:[v>>>24,(v>>16)&255,(v>>8)&255,v&255];
 const ascii=[...date].map(c=>c.charCodeAt(0)).concat(0);
 // header(8) + IFD0 at 8: 1 entry (2+12+4=18) → exif IFD at 26: 1 entry (18) → string at 44
 tiff.push(...(little?[0x49,0x49]:[0x4d,0x4d]),...w16(42),...w32(8));
 tiff.push(...w16(1),...(original?[...w16(0x8769),...w16(4),...w32(1),...w32(26)]:[...w16(0x0132),...w16(2),...w32(ascii.length),...w32(26)]),...w32(0));
 if(original)tiff.push(...w16(1),...w16(0x9003),...w16(2),...w32(ascii.length),...w32(44),...w32(0),...ascii);else tiff.push(...ascii);
 const app1=[0x45,0x78,0x69,0x66,0,0,...tiff],len=app1.length+2;
 return new Uint8Array([0xff,0xd8,0xff,0xe1,len>>8,len&255,...app1,0xff,0xd9]).buffer;
}
assert.equal(exifDate(jpeg(true,'2026:10:03 08:12:44')),'2026-10-03');
assert.equal(exifDate(jpeg(false,'2025:01:31 23:59:59')),'2025-01-31');
assert.equal(exifDate(jpeg(true,'2024:02:29 10:00:00',{original:false})),'2024-02-29');
assert.equal(exifDate(jpeg(true,'0000:00:00 00:00:00')),'');
assert.equal(exifDate(new Uint8Array([0x89,0x50,0x4e,0x47]).buffer),'');
assert.equal(exifDate(new Uint8Array([0xff,0xd8,0xff,0xd9]).buffer),'');
console.log('Photo date: EXIF DateTimeOriginal in both byte orders, DateTime fallback, blank and non-JPEG passed');
