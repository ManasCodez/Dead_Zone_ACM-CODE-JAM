import {test,expect} from '@playwright/test';

test('graphics presets render nonblack frames, resize correctly and release replaced targets',async({page})=>{
 test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|Framebuffer/i.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>localStorage.setItem('dead-zone-settings',JSON.stringify({quality:'low'})));
 await page.goto('/');await page.waitForFunction(()=>!!window.__DEAD_ZONE__);
 const results=await page.evaluate(()=>{const g=window.__DEAD_ZONE__,results=[];g.state='graphics-test';g.renderer.setSize(480,270);for(const quality of ['low','balanced','high','low','balanced','high','low','balanced','high']){
  g.settings.value.quality=quality;g.settings.apply();g.renderer.setPixelRatio(.5);g.graphics.resize();g.camera.position.set(2,4,14);g.camera.lookAt(0,1,-5);g.graphics.update(0,0);g.graphics.render();const gl=g.renderer.getContext(),pixels=new Uint8Array(4*20*20);gl.readPixels(100,50,20,20,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let luminance=0;for(let i=0;i<pixels.length;i+=4)luminance+=pixels[i]+pixels[i+1]+pixels[i+2];results.push({quality,luminance,post:!!g.graphics.composer,textures:g.renderer.info.memory.textures,width:g.graphics.composerSize.x,error:gl.getError(),tone:g.renderer.toneMapping,samples:g.graphics.composer?.multisampling});
 }return results;});
 for(const r of results){expect(r.luminance).toBeGreaterThan(5000);expect(r.error).toBe(0);expect(r.post).toBe(r.quality!=='low');if(r.post){expect(r.width).toBe(240);expect(r.tone).toBe(0);expect(r.samples).toBeGreaterThan(0);}}
 expect(results[8].textures).toBe(results[5].textures);expect(results[6].textures).toBe(results[3].textures);expect(errors).toEqual([]);
 await page.setViewportSize({width:1280,height:720});await expect.poll(()=>page.evaluate(()=>window.__DEAD_ZONE__.graphics.composerSize.x)).toBe(640);
});

test('reduced effects suppress bloom, smoke and rotor dust, with exact gameplay constants',async({page})=>{
 test.setTimeout(60000);await page.addInitScript(()=>localStorage.setItem('dead-zone-settings',JSON.stringify({quality:'low'})));await page.goto('/');await page.waitForFunction(()=>!!window.__DEAD_ZONE__);
 const result=await page.evaluate(async()=>{const g=window.__DEAD_ZONE__,{WALK_SPEED,SPRINT_SPEED}=await import('/Player.js'),{GRENADE_FUSE}=await import('/Grenades.js'),{BlastEffect}=await import('/BlastEffect.js');g.state='graphics-test';g.settings.value.quality='balanced';g.settings.value.reducedMotion=true;g.settings.value.reducedFlash=true;g.settings.apply();g.helicopter.rotorSpeed=1;g.graphics.update(.1,10);const explosion=new BlastEffect(g,g.player.position);explosion.update(.02);const result={bloom:g.graphics.bloom.intensity,smoke:g.environmentArt.smoke.some(p=>p.sprite.visible),dust:g.environmentArt.rotorDust.some(p=>p.visible),flash:explosion.flash.material.opacity,light:explosion.lightSource.light.intensity,walk:WALK_SPEED,sprint:SPRINT_SPEED,fuse:GRENADE_FUSE};explosion.dispose();return result;});
 expect(result).toMatchObject({bloom:0,smoke:false,dust:false,walk:4.8,sprint:5.76,fuse:1.6});expect(result.flash).toBeLessThan(.15);expect(result.light).toBeLessThan(8);
});

test('composer recovers after WebGL context restoration',async({page})=>{
 test.setTimeout(60000);await page.addInitScript(()=>localStorage.setItem('dead-zone-settings',JSON.stringify({quality:'balanced'})));
 await page.goto('/');await page.waitForFunction(()=>!!window.__DEAD_ZONE__?.graphics?.composer);
 const supported=await page.evaluate(()=>{const gl=window.__DEAD_ZONE__.renderer.getContext(),extension=gl.getExtension('WEBGL_lose_context');if(!extension)return false;window.__contextExtension=extension;extension.loseContext();return true;});
 test.skip(!supported,'WEBGL_lose_context unavailable');
 await page.waitForFunction(()=>window.__DEAD_ZONE__.graphics.contextLost);
 await page.evaluate(()=>window.__contextExtension.restoreContext());
 await page.waitForFunction(()=>!window.__DEAD_ZONE__.graphics.contextLost&&!!window.__DEAD_ZONE__.graphics.composer,{},{timeout:15000});
 const error=await page.evaluate(()=>{const g=window.__DEAD_ZONE__;g.graphics.render();return g.renderer.getContext().getError();});expect(error).toBe(0);
});

test('low health updates the game-state grade without covering the HUD',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('dead-zone-settings',JSON.stringify({quality:'balanced'})));
 await page.goto('/');await page.waitForFunction(()=>!!window.__DEAD_ZONE__?.graphics?.grade);
 const result=await page.evaluate(()=>{const g=window.__DEAD_ZONE__;g.state='playing';g.player.health=20;g.graphics.update(0,0);return {injury:g.graphics.grade.uniforms.get('injury').value,vignette:g.graphics.vignette.darkness,hudParent:document.getElementById('hud').parentElement.tagName};});
 expect(result.injury).toBeGreaterThan(.5);expect(result.vignette).toBeGreaterThan(.3);expect(result.hudParent).toBe('BODY');
});

test('postprocessing comparison serves every captured scene',async({page})=>{
 await page.goto('/graphics-review/postprocessing.html');
 for(const quality of ['low','balanced']){
  await page.locator('#quality').selectOption(quality);
  for(const name of await page.locator('#view option').evaluateAll(options=>options.map(o=>o.value))){
   await page.locator('#view').selectOption(name);
   await expect.poll(()=>page.locator('#current').evaluate(image=>image.complete&&image.naturalWidth)).toBeGreaterThan(0);
   await expect.poll(()=>page.locator('#previous').evaluate(image=>image.complete&&image.naturalWidth)).toBeGreaterThan(0);
  }
 }
});
