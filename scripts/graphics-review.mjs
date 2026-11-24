import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const phase=process.argv[2]||'after';
if(!['before','after','postprocessing'].includes(phase))throw new Error('Expected before, after or postprocessing');
const output=new URL('../graphics-review/',import.meta.url);
await mkdir(new URL(phase+'/',output),{recursive:true});
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-precise-memory-info','--js-flags=--expose-gc','--host-resolver-rules=MAP fonts.googleapis.com ~NOTFOUND, MAP fonts.gstatic.com ~NOTFOUND']});
const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[],measurements=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('net::')&&!m.text().includes('404 (Not Found)'))errors.push(m.text());});
await page.addInitScript(()=>{let seed=7183;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);window.requestAnimationFrame=()=>0;localStorage.clear();localStorage.setItem('dead-zone-settings',JSON.stringify({quality:'low'}));});
await page.goto('http://127.0.0.1:5173',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>!!window.__DEAD_ZONE__);
await page.evaluate(async()=>{const g=window.__DEAD_ZONE__,THREE=await import('/node_modules/three/build/three.module.js'),{BlastEffect}=await import('/BlastEffect.js');g.start({captureMouse:false});g.state='review';g.toSpawn=0;g.ui.state('playing');document.querySelectorAll('body > :not(canvas):not(script)').forEach(e=>e.style.display='none');g.review={THREE,BlastEffect};});
const views=[
 ['panorama',[16,6.5,28],[-2,2,-14]],
 ['player',[1.05,2.52,12.75],[1.05,1.4,-25]],
 ['aim',[.85,2.2,10.8],[.85,1.4,-25]],
 ['reload',[2.8,2.3,9.6],[0,1.1,8]],
 ['infected',[0,5.5,8],[0,1.8,-7]],
 ['clinic-exterior',[-12,5,-14],[-28,1.7,-23]],
 ['clinic-interior',[-23,2.6,-20],[-31,1.4,-25]],
 ['armory-exterior',[9,5,-80],[22,1.7,-89]],
 ['armory-interior',[17,2.6,-86],[25,1.4,-91]],
 ['industrial',[3,4,-120],[-7,2,-151]],
 ['optional',[10,4,-202],[26,1.7,-211]],
 ['explosion',[2,3,9],[0,1,-1]],
 ['extraction',[2,6,-249],[12,2,-261]],
 ['low-health',[1.05,2.52,12.75],[1.05,1.4,-25]]
];
const selectedViews=process.env.REVIEW_VIEWS?.split(',');
const selectedQualities=process.env.REVIEW_QUALITIES?.split(',')||['low','balanced'];
const previous=phase==='postprocessing'?await readFile(new URL(`${phase}.json`,output),'utf8').then(JSON.parse).catch(()=>null):null;
const merged=()=>[...(previous?.measurements||[]).filter(a=>!measurements.some(b=>b.name===a.name&&b.quality===a.quality)),...measurements];
try{for(const quality of selectedQualities)for(const [name,eye,target] of views.filter(([name])=>!selectedViews||selectedViews.includes(name))){
 const result=await page.evaluate(async({quality,name,eye,target})=>{
  const g=window.__DEAD_ZONE__,{THREE,BlastEffect}=g.review;g.settings.value.quality=quality;g.settings.apply();g.camera.fov=name==='aim'?34:58;g.camera.updateProjectionMatrix();g.player.position.set(0,0,8);g.player.health=name==='low-health'?20:100;g.state=name==='low-health'?'playing':'review';g.player.mesh.visible=['player','aim','reload','low-health'].includes(name);g.player.body.rotation.set(0,0,0);g.player.reloadProgress=name==='reload'?.5:0;g.player.poseWeapon();
  const extras=[];if(name==='infected'){const types=['normal','runner','tank','crawler','bloater','screamer','brute','spitter','stalker','riot','exploder','alpha'];for(let i=0;i<types.length;i++){const z=g.createZombie(types[i],new THREE.Vector3((i%6-2.5)*3,0,-3-Math.floor(i/6)*6));z.mesh.rotation.y=Math.PI;extras.push(z);}}
  let blast;if(name==='explosion'){blast=new BlastEffect(g,new THREE.Vector3(0,.15,-1));blast.update(.19);}
  g.world.sun.position.set(-24,42,target[2]-28);g.world.sun.target.position.set(0,0,target[2]);g.world.update(0,0,{...g,player:{position:new THREE.Vector3(...target)}});g.camera.position.set(...eye);g.camera.lookAt(...target);g.scene.updateMatrixWorld(true);g.graphics?.update(0,0);const draw=()=>g.graphics?g.graphics.render(0):g.renderer.render(g.scene,g.camera);
  for(let i=0;i<3;i++)draw();const samples=[];for(let i=0;i<7;i++){const t=performance.now();draw();g.renderer.getContext().finish();samples.push(performance.now()-t);}
  samples.sort((a,b)=>a-b);const totals={...g.renderer.info.render};const autoReset=g.renderer.info.autoReset;g.renderer.info.autoReset=true;g.renderer.setRenderTarget(null);g.renderer.render(g.scene,g.camera);const colorScene={...g.renderer.info.render};g.renderer.info.autoReset=autoReset;draw();const result={name,quality,eye,target,colorCalls:colorScene.calls,colorTriangles:colorScene.triangles,calls:totals.calls,triangles:totals.triangles,geometries:g.renderer.info.memory.geometries,textures:g.renderer.info.memory.textures,cpuSubmitMedianMs:samples[3],cpuSubmitP95Ms:samples[6],heap:performance.memory?.usedJSHeapSize};
  g.review.cleanup=()=>{extras.forEach(z=>z.dispose());blast?.dispose();};return result;
 },{quality,name,eye,target});
 if(!process.env.REVIEW_METRICS_ONLY)await page.screenshot({path:new URL(`${phase}/${quality}-${name}.png`,output).pathname,timeout:120000});measurements.push(result);console.log(JSON.stringify(result));await page.evaluate(()=>window.__DEAD_ZONE__.review.cleanup());
 if(phase==='postprocessing')await writeFile(new URL(`${phase}.json`,output),JSON.stringify({phase,renderer:'Chromium / SwiftShader software WebGL',timingNote:'Synchronous JS render submission including gl.finish; not GPU duration or hardware FPS',viewport:[960,540],errors,measurements:merged(),restarts:previous?.restarts||[]},null,2));
}
 const resources=await page.evaluate(()=>{const g=window.__DEAD_ZONE__,samples=[];for(let i=0;i<7;i++){g.start({captureMouse:false});g.state='review';g.graphics?g.graphics.render(0):g.renderer.render(g.scene,g.camera);window.gc?.();samples.push({geometry:g.renderer.info.memory.geometries,textures:g.renderer.info.memory.textures,heap:performance.memory?.usedJSHeapSize});}return samples;});
 const report={phase,renderer:'Chromium / SwiftShader software WebGL',timingNote:'Synchronous JS render submission including gl.finish; not GPU duration or hardware FPS',viewport:[960,540],errors,measurements:phase==='postprocessing'?merged():measurements,restarts:resources};
 if(process.env.REVIEW_METRICS_ONLY){await writeFile(new URL(`${phase}-counter-audit.json`,output),JSON.stringify(report,null,2));const prior=JSON.parse(await readFile(new URL(`${phase}.json`,output),'utf8'));for(const m of prior.measurements){const current=measurements.find(c=>c.name===m.name&&c.quality===m.quality);m.colorCalls=current.colorCalls;m.colorTriangles=current.colorTriangles;}prior.counterNote='Color-scene counters audited separately. CPU timings retain the matched screenshot run; counter-only queue stalls are not comparable timing samples.';await writeFile(new URL(`${phase}.json`,output),JSON.stringify(prior,null,2));}else await writeFile(new URL(`${phase}.json`,output),JSON.stringify(report,null,2));
 if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser.close();}
