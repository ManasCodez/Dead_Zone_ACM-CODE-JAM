import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--host-resolver-rules=MAP fonts.googleapis.com ~NOTFOUND, MAP fonts.gstatic.com ~NOTFOUND']});
try{
  const page=await browser.newPage({viewport:{width:960,height:540}});
  await page.addInitScript(()=>localStorage.setItem('dead-zone-settings',JSON.stringify({quality:'low'})));
  await page.goto('http://127.0.0.1:5173',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.__DEAD_ZONE__);
  const results=[];
  for(const quality of ['low','balanced'])for(const enemyCount of [5,24]){
    const sample=await page.evaluate(async({quality,enemyCount})=>{
      const THREE=await import('/node_modules/three/build/three.module.js'),g=window.__DEAD_ZONE__;
      g.zombies.forEach(z=>z.dispose());g.zombies=[];g.toSpawn=0;g.state='profile';
      g.player.position.set(0,0,8);g.player.mesh.visible=true;
      g.camera.position.set(0,5,14);g.camera.lookAt(0,1,-12);
      g.settings.value.quality=quality;g.settings.apply();
      const types=['normal','runner','tank','crawler','bloater','screamer','brute','spitter','stalker','riot','exploder','alpha'];
      for(let i=0;i<enemyCount;i++)g.zombies.push(g.createZombie(types[i%types.length],new THREE.Vector3((i%6-2.5)*3.5,0,-5-Math.floor(i/6)*5)));
      const intervals=[];let last;for(let i=0;i<28;i++){const now=await new Promise(requestAnimationFrame);if(i>=4)intervals.push(now-last);last=now;}
      intervals.sort((a,b)=>a-b);
      const result={quality,enemyCount,samples:intervals.length,rafMedianMs:intervals[12],rafP95Ms:intervals[Math.floor(intervals.length*.95)],drawCalls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles,textures:g.renderer.info.memory.textures,geometries:g.renderer.info.memory.geometries,gpuTimerAvailable:!!g.renderer.getContext().getExtension('EXT_disjoint_timer_query_webgl2')};
      g.zombies.forEach(z=>z.dispose());g.zombies=[];return result;
    },{quality,enemyCount});
    results.push(sample);console.log(JSON.stringify(sample));
  }
  await writeFile(new URL('../graphics-review/postprocessing-frame-profile.json',import.meta.url),JSON.stringify({environment:'Brave/Chromium with SwiftShader software WebGL',method:'Fixed third-person camera, active 5-enemy and 24-enemy scenes, four warmup frames and 24 requestAnimationFrame intervals. These are frame intervals in software WebGL, not hardware GPU timings or FPS targets.',viewport:[960,540],results},null,2));
}finally{await browser.close();}
