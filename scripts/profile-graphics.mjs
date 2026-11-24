import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--host-resolver-rules=MAP fonts.googleapis.com ~NOTFOUND, MAP fonts.gstatic.com ~NOTFOUND']});
try{
 const page=await browser.newPage({viewport:{width:960,height:540}});await page.addInitScript(()=>localStorage.setItem('dead-zone-settings',JSON.stringify({quality:'low'})));await page.goto('http://127.0.0.1:5173',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__DEAD_ZONE__);
 const results=[];
 for(const quality of ['low','balanced','high'])results.push(await page.evaluate(async quality=>{
  const g=window.__DEAD_ZONE__;g.state='profile';g.camera.position.set(16,6.5,28);g.camera.lookAt(-2,2,-14);g.settings.value.quality=quality;g.settings.apply();
  const times=[];let last;for(let i=0;i<28;i++){const now=await new Promise(requestAnimationFrame);if(i>=4)times.push(now-last);last=now;}times.sort((a,b)=>a-b);
  const textures=new Set([g.scene.environment,g.scene.background]);g.scene.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[]))for(const value of Object.values(m))if(value?.isTexture)textures.add(value);});
  let bytes=0;for(const t of textures){const image=t?.image;if(!image?.width||!image?.height)continue;const component=t.type===1016?2:t.type===1015?4:1;bytes+=(image.data?.byteLength||image.width*image.height*4*component)*(t.generateMipmaps?4/3:1);}
  const target=g.graphics.composer?.inputBuffer,postBytes=target?target.width*target.height*16*(target.samples+1):0,shadowBytes=g.renderer.shadowMap.enabled?g.world.sun.shadow.mapSize.x**2*8:0;
  return {quality,viewport:[960,540],samples:times.length,rafMedianMs:times[Math.floor(times.length/2)],rafP95Ms:times[Math.floor(times.length*.95)],allPassCalls:g.renderer.info.render.calls,allPassTriangles:g.renderer.info.render.triangles,referencedTextureEstimateMiB:bytes/1048576,postTargetConservativeMiB:postBytes/1048576,shadowTargetConservativeMiB:shadowBytes/1048576,timerQueryAvailable:!!g.renderer.getContext().getExtension('EXT_disjoint_timer_query_webgl2')};
 },quality));
 const report={environment:'Installed Chromium/Brave with SwiftShader software WebGL; no hardware FPS claim',method:'Fixed panorama. Four warmup frames followed by 24 requestAnimationFrame intervals. Texture bytes are estimates for referenced maps plus mip levels, not measured VRAM. HDR/depth/MSAA storage is a conservative allocation estimate.',results};await writeFile(new URL('../graphics-review/frame-profile.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
