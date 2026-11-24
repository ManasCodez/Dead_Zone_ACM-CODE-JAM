import {test,expect} from '@playwright/test';

test('all six reloads animate in the night scene with visible weapons and correct ammo timing',async({page})=>{
 test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|Framebuffer/i.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>localStorage.setItem('dead-zone-settings',JSON.stringify({quality:'balanced'})));
 await page.goto('/');await page.waitForFunction(()=>!!window.__DEAD_ZONE__);
 const results=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js'),g=window.__DEAD_ZONE__,rows=[];
  g.start({captureMouse:false});g.state='reload-test';g.toSpawn=0;
  for(const id of ['rifle','smg','shotgun','lmg','marksman','revolver']){
   g.combat.equip(id,true);g.combat.ammo=0;g.combat.reload();g.combat.update(g.combat.reloadDuration*.45);g.player.update(.016,new Set(['KeyW']));g.scene.updateMatrixWorld(true);g.graphics.update(0,0);g.graphics.render();
   const gun=g.player.mesh.userData.limbs.gun,hand=g.player.mesh.userData.limbs['hand-1'].getWorldPosition(new THREE.Vector3()),grip=gun.localToWorld(gun.userData.supportGrip.clone()),screen=new THREE.Box3().setFromObject(gun).getCenter(new THREE.Vector3()).project(g.camera);
   rows.push({id,ammo:g.combat.ammo,progress:g.player.reloadProgress,handError:hand.distanceTo(grip),screenX:screen.x,screenY:screen.y,glError:g.renderer.getContext().getError()});
  }
  return rows;
 });
 for(const row of results){expect(row.progress).toBeGreaterThan(.4);expect(row.handError).toBeLessThan(.001);expect(Math.abs(row.screenX)).toBeLessThan(1);expect(Math.abs(row.screenY)).toBeLessThan(1);expect(row.glError).toBe(0);expect(row.ammo).toBe(row.id==='shotgun'?3:0);}
 expect(errors).toEqual([]);
 await expect(page.locator('#bearing-arrow')).toBeVisible();
});

test('night review gallery serves every gameplay and reload capture',async({page})=>{
 await page.goto('/graphics-review/night/index.html');
 await expect(page.locator('figure')).toHaveCount(14);
 for(const image of await page.locator('figure img').all())await expect.poll(()=>image.evaluate(node=>node.complete&&node.naturalWidth)).toBeGreaterThan(0);
});
