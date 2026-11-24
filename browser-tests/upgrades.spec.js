import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{await page.addInitScript(()=>{if(!localStorage.getItem('dead-zone-settings'))localStorage.setItem('dead-zone-settings',JSON.stringify({quality:'low'}));});});

async function ready(page){
 await page.goto('/');await page.waitForFunction(()=>!!window.__DEAD_ZONE__);await expect(page.locator('#boot-status')).toHaveCount(0);
 await page.evaluate(()=>{HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.resolve();const g=window.__DEAD_ZONE__;g.settings.value.quality='low';g.settings.apply();g.renderer.setPixelRatio(.4);});
}
async function start(page){await ready(page);await page.evaluate(()=>window.__DEAD_ZONE__.start({captureMouse:false}));}

test('settings are keyboard accessible, persist, pause input and fit desktop sizes',async({page})=>{
 test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
 await page.locator('#menu .settings-open').click();await expect(page.locator('#settings-panel')).toBeVisible();
 await page.locator('[data-setting="lookSensitivity"]').fill('1.7');await page.locator('[data-setting="fov"]').fill('70');await page.locator('[data-setting="reducedFlash"]').check();await page.locator('[data-setting="difficulty"]').selectOption('hard');
 await page.screenshot({path:'test-results/settings.png'});await page.keyboard.press('Escape');await expect(page.locator('#settings-panel')).toBeHidden();
 await page.reload();await page.waitForFunction(()=>!!window.__DEAD_ZONE__);expect(await page.evaluate(()=>window.__DEAD_ZONE__.settings.value.fov)).toBe(70);expect(await page.evaluate(()=>window.__DEAD_ZONE__.settings.value.lookSensitivity)).toBe(1.7);
 await page.evaluate(()=>{const g=window.__DEAD_ZONE__;g.settings.value.quality='low';g.settings.apply();g.renderer.setPixelRatio(.4);HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.resolve();g.start({captureMouse:false});});
 for(const size of [{width:1280,height:720},{width:1920,height:1080},{width:2560,height:1440}]){await page.setViewportSize(size);await expect(page.locator('#objective-bearing')).toBeInViewport();await expect(page.locator('#pause-button')).toBeInViewport();await expect(page.locator('#ammo')).toBeInViewport();}
 await page.locator('#pause-button').click();await page.locator('#pause .settings-open').click();const before=await page.evaluate(()=>window.__DEAD_ZONE__.player.position.toArray());await page.keyboard.press('KeyW');expect(await page.evaluate(()=>window.__DEAD_ZONE__.player.position.toArray())).toEqual(before);await page.keyboard.press('Escape');await expect(page.locator('#pause')).toBeVisible();expect(errors).toEqual([]);
});

test('upgrade choices spend XP points, checkpoint continues equipment and progress safely',async({page})=>{
 test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
 await page.evaluate(()=>{const g=window.__DEAD_ZONE__;g.mission.awardXP(600);});await page.keyboard.press('KeyU');await expect(page.locator('#upgrade-panel')).toBeVisible();await expect(page.locator('#upgrade-options button')).toHaveCount(3);await page.locator('#upgrade-options button').first().click();expect(await page.evaluate(()=>window.__DEAD_ZONE__.player.maxHealth)).toBe(120);expect(await page.evaluate(()=>window.__DEAD_ZONE__.campaign.points)).toBe(3);await page.keyboard.press('Escape');
 await expect(page.locator('#upgrade-panel')).toBeHidden();await page.keyboard.press('Escape');await expect(page.locator('#pause')).toBeVisible();await page.locator('#resume').click();const saved=await page.evaluate(()=>{const g=window.__DEAD_ZONE__;for(const z of g.zombies)z.dispose();g.zombies=[];g.toSpawn=0;g.spawnQueue=[];g.hazards.reset();g.combat.equip('marksman',true);g.combat.ammo=7;g.mission.index=1;g.mission.looted=false;g.campaign.requestCheckpoint(0);g.player.position.set(-20,0,-23);return g.campaign.saveCheckpoint();});expect(saved).toBe(true);
 await page.reload();await page.waitForFunction(()=>!!window.__DEAD_ZONE__);await page.evaluate(()=>{HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.resolve();window.__DEAD_ZONE__.renderer.setPixelRatio(.4);});await expect(page.locator('#continue')).toBeVisible();await page.locator('#continue').click();
 expect(await page.evaluate(()=>({chapter:window.__DEAD_ZONE__.mission.index,xp:window.__DEAD_ZONE__.mission.xp,weapon:window.__DEAD_ZONE__.combat.weaponId,ammo:window.__DEAD_ZONE__.combat.ammo,maxHealth:window.__DEAD_ZONE__.player.maxHealth}))).toEqual({chapter:1,xp:600,weapon:'marksman',ammo:7,maxHealth:120});expect(await page.evaluate(()=>{localStorage.setItem('dead-zone-scores','{}');window.__DEAD_ZONE__.campaign.recordScore();return JSON.parse(localStorage.getItem('dead-zone-scores')).length;})).toBe(1);expect(errors).toEqual([]);
});

test('optional rooms are reachable, quests unlock gold weapon caches and resets restore them',async({page})=>{
 test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
 const routes=await page.evaluate(async()=>{const {findRoute}=await import('/Navigation.js');const g=window.__DEAD_ZONE__;return g.districts.rooms.map(r=>{const route=findRoute({x:r.front-r.side*2,z:r.z},{x:r.x-r.side*1.2,z:r.z},g.world.obstacles);return {id:r.id,length:route.length,end:route.at(-1)?.toArray()};});});expect(routes.every(r=>r.length>2)).toBe(true);
 await page.evaluate(()=>{const g=window.__DEAD_ZONE__,r=g.districts.rooms[0];g.player.position.set(r.x,0,r.z);g.player.moveVelocity.set(0,0,0);});await page.keyboard.press('KeyE');await expect.poll(()=>page.evaluate(()=>window.__DEAD_ZONE__.districts.rooms[0].complete)).toBe(true);
 await page.evaluate(()=>{const g=window.__DEAD_ZONE__,p=g.world.weaponPickups.find(p=>p.id==='revolver');g.player.position.copy(p.group.position).setY(0);});await page.keyboard.press('KeyE');await expect(page.locator('#weapon-name')).toHaveText('IRON–6');
 await page.evaluate(()=>{const g=window.__DEAD_ZONE__,r=g.districts.rooms[1];g.player.position.set(r.x,0,r.z);g.districts.interact();g.districts.update(20.1);for(const t of g.districts.targets)t.damage(150);g.districts.update(.01);});expect(await page.evaluate(()=>window.__DEAD_ZONE__.districts.rooms[1].complete)).toBe(true);expect(await page.evaluate(()=>!!window.__DEAD_ZONE__.world.weaponPickups.find(p=>p.id==='marksman'))).toBe(true);
 await page.evaluate(()=>{const g=window.__DEAD_ZONE__;g.start({captureMouse:false});});expect(await page.evaluate(()=>window.__DEAD_ZONE__.districts.rooms.every(r=>!r.complete&&!r.started))).toBe(true);expect(errors).toEqual([]);
});

test('extended extraction includes the Alpha and repeated restarts keep resources bounded',async({page})=>{
 test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
 expect(await page.evaluate(()=>window.__DEAD_ZONE__.world.bounds.minZ)).toBeLessThan(-280);
 const result=await page.evaluate(()=>{const g=window.__DEAD_ZONE__;g.mission.index=3;g.player.position.copy(g.mission.target);g.mission.interact();return {queue:[...g.spawnQueue],canBoard:g.mission.readyToBoard};});expect(result.queue).toContain('alpha');expect(new Set(result.queue).size).toBe(12);expect(result.queue).toHaveLength(18);expect(result.canBoard).toBe(false);
 const counts=await page.evaluate(()=>{const g=window.__DEAD_ZONE__,counts=[];for(let i=0;i<6;i++){g.start({captureMouse:false});g.combat.cooldown=0;g.combat.shoot([]);g.combat.update(1);g.renderer.render(g.scene,g.camera);counts.push(g.renderer.info.memory.geometries);}return counts;});expect(Math.max(...counts.slice(2))-Math.min(...counts.slice(2))).toBeLessThan(12);
  await page.keyboard.press('F3');await expect(page.locator('#performance')).toBeVisible();await page.keyboard.down('F3');await page.keyboard.down('F3');await page.keyboard.up('F3');await expect(page.locator('#performance')).toBeHidden();await page.screenshot({path:'test-results/campaign-upgrade.png'});expect(errors).toEqual([]);
});

test('endless retains boundary damage, and challenge modifiers enforce their rules',async({page})=>{
 test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);await page.evaluate(()=>{localStorage.setItem('dead-zone-completed','true');window.__DEAD_ZONE__.campaign.refreshContinue();});await page.locator('#endless').click();
 const endless=await page.evaluate(()=>{const g=window.__DEAD_ZONE__;g.player.position.set(39,0,8);g.player.health=100;g.mission.hazardTime=0;for(let i=0;i<21;i++)g.update(.05);g.ui.update(0,g);return {health:g.player.health,marker:g.mission.marker.visible,mode:g.campaign.mode};});expect(endless).toEqual({health:90,marker:false,mode:'endless'});await expect(page.locator('#objective-task')).toHaveText('Survive escalating mixed waves');
 const modifiers=await page.evaluate(()=>{const g=window.__DEAD_ZONE__;g.settings.value.challenge='shotgun';g.start({captureMouse:false});const shotgun=[...g.combat.inventory.keys()];g.settings.value.challenge='runners';g.start({captureMouse:false});const z=g.createZombie('tank',g.player.position.clone().setZ(-15)),type=z.type;z.dispose();g.settings.value.challenge='scarcity';g.start({captureMouse:false});return {shotgun,type,reserve:g.combat.reserve};});expect(modifiers).toEqual({shotgun:['shotgun'],type:'runner',reserve:60});expect(errors).toEqual([]);
});
