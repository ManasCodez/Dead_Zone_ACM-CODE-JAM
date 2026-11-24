import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';

const output=new URL('../graphics-review/night/',import.meta.url);await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--host-resolver-rules=MAP fonts.googleapis.com ~NOTFOUND, MAP fonts.gstatic.com ~NOTFOUND']});
try{
  const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[],results=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{let seed=7183;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);window.requestAnimationFrame=()=>0;localStorage.clear();localStorage.setItem('dead-zone-settings',JSON.stringify({quality:'balanced'}));});
  await page.goto('http://127.0.0.1:5173',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__DEAD_ZONE__);
  await page.evaluate(()=>{const g=window.__DEAD_ZONE__;g.start({captureMouse:false});g.state='review';g.toSpawn=0;g.ui.state('playing');});
  if(process.env.RELOAD_ONLY)await page.evaluate(()=>{document.querySelectorAll('body > :not(canvas):not(script)').forEach(e=>e.style.display='none');});
  const scenes=process.env.RELOAD_ONLY?[]:[
    ['gameplay-hud',[2,3.3,12],[0,1,-12]],
    ['street',[16,6.5,28],[-2,2,-14]],
    ['clinic-exterior',[-12,5,-14],[-28,1.7,-23]],
    ['clinic-interior',[-23,2.6,-20],[-31,1.4,-25]],
    ['armory-exterior',[9,5,-80],[22,1.7,-89]],
    ['armory-interior',[17,2.6,-86],[25,1.4,-91]],
    ['extraction',[2,6,-249],[12,2,-261]],
    ['infected',[0,5.5,8],[0,1.8,-7]]
  ];
  for(const [name,eye,target] of scenes){
    const result=await page.evaluate(async({name,eye,target})=>{
      const g=window.__DEAD_ZONE__,THREE=await import('/node_modules/three/build/three.module.js');
      g.player.position.set(0,0,8);g.player.mesh.visible=name==='gameplay-hud';
      const extras=[];if(name==='infected'){for(const [i,type] of ['normal','runner','tank','crawler','bloater','screamer','brute','spitter','stalker','riot','exploder','alpha'].entries()){const z=g.createZombie(type,new THREE.Vector3((i%6-2.5)*3,0,-3-Math.floor(i/6)*6));z.mesh.rotation.y=Math.PI;extras.push(z);}}
      g.world.sun.position.set(-24,42,target[2]-28);g.world.sun.target.position.set(0,0,target[2]);g.world.update(0,0,{...g,player:{position:new THREE.Vector3(...target)}});
      g.camera.position.set(...eye);g.camera.lookAt(...target);g.scene.updateMatrixWorld(true);g.graphics.update(0,0);for(let i=0;i<3;i++)g.graphics.render();
      const pixels=new Uint8Array(4*24*24),gl=g.renderer.getContext();gl.readPixels(468,258,24,24,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let luminance=0;for(let i=0;i<pixels.length;i+=4)luminance+=pixels[i]+pixels[i+1]+pixels[i+2];
      g.reviewExtras=extras;return {name,luminance,draws:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles,error:gl.getError()};
    },{name,eye,target});
    if(name!=='gameplay-hud')await page.evaluate(()=>{document.querySelectorAll('body > :not(canvas):not(script)').forEach(e=>e.style.display='none');});
    await page.screenshot({path:new URL(`${name}.png`,output).pathname,timeout:120000});results.push(result);console.log(JSON.stringify(result));await page.evaluate(()=>{window.__DEAD_ZONE__.reviewExtras.forEach(z=>z.dispose());});
  }
  for(const id of ['rifle','smg','shotgun','lmg','marksman','revolver']){
    const result=await page.evaluate(async id=>{
      const g=window.__DEAD_ZONE__,THREE=await import('/node_modules/three/build/three.module.js');
      g.combat.equip(id,true);g.combat.ammo=0;g.combat.reload();g.combat.update(g.combat.reloadDuration*.45);
      g.player.position.set(0,0,8);g.player.mesh.visible=true;g.player.setAiming(true,true);g.camera.position.set(2.7,2.15,9.85);g.camera.lookAt(.25,1.28,7.1);g.player.poseWeapon();g.scene.updateMatrixWorld(true);g.world.update(0,0,g);g.graphics.update(0,0);for(let i=0;i<3;i++)g.graphics.render();
      const l=g.player.mesh.userData.limbs,gun=l.gun;return {name:`reload-${id}`,progress:g.player.reloadProgress,ammo:g.combat.ammo,supportHand:l['hand-1'].getWorldPosition(new THREE.Vector3()).toArray(),grip:gun.localToWorld(gun.userData.supportGrip.clone()).toArray(),error:g.renderer.getContext().getError()};
    },id);
    await page.screenshot({path:new URL(`${result.name}.png`,output).pathname,timeout:120000});results.push(result);console.log(JSON.stringify(result));
  }
  const previous=process.env.RELOAD_ONLY?await readFile(new URL('report.json',output),'utf8').then(JSON.parse).catch(()=>null):null;
  const combined=process.env.RELOAD_ONLY?[...(previous?.results||[]).filter(r=>!r.name.startsWith('reload-')),...results]:results;
  await writeFile(new URL('report.json',output),JSON.stringify({viewport:[960,540],quality:'balanced',errors,results:combined},null,2));
  if(errors.length||results.some(r=>r.error))throw new Error(errors.join('\n')||'WebGL error');
}finally{await browser.close();}
