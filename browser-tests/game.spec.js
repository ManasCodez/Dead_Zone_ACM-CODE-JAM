import {test,expect} from '@playwright/test';

async function enterGame(page){await page.locator('#play').click();await page.locator('#intro-skip').click();await expect(page.locator('#intro-screen')).toBeHidden({timeout:15000});}


test('render and exercise a complete survival session',async({page})=>{
  test.setTimeout(90000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#play')).toBeVisible();
  await page.waitForFunction(()=>!!window.__DEAD_ZONE__);
  await page.screenshot({path:'test-results/menu.png'});
  // Pointer lock is disabled in this test so headless browser focus cannot interrupt input.
  await page.evaluate(()=>{HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.resolve();});
  // Keep the controls regression responsive under software WebGL; dedicated visual tests retain shadows.
  await page.evaluate(()=>{const r=window.__DEAD_ZONE__.renderer;r.setPixelRatio(.4);r.shadowMap.enabled=false;});
  await enterGame(page);
  await expect(page.locator('#hud')).toBeVisible();
  const initial=await page.evaluate(()=>window.__DEAD_ZONE__.player.position.z);
  await page.keyboard.down('KeyW');await expect.poll(()=>page.evaluate(()=>window.__DEAD_ZONE__.player.position.z),{timeout:12000}).toBeLessThan(initial-.3);await page.keyboard.up('KeyW');
  expect(await page.evaluate(()=>window.__DEAD_ZONE__.player.position.z)).toBeLessThan(initial-.2);
  await page.keyboard.down('Space');await page.waitForFunction(()=>window.__DEAD_ZONE__.player.position.y>.1);await page.keyboard.up('Space');
  expect(await page.evaluate(()=>window.__DEAD_ZONE__.player.position.y)).toBeGreaterThan(0);
  await page.waitForTimeout(800);
  await page.mouse.move(720,450);await page.mouse.down();await page.waitForTimeout(550);await page.mouse.up();
  expect(await page.evaluate(()=>window.__DEAD_ZONE__.combat.ammo)).toBeLessThan(30);
  await page.keyboard.press('KeyR');await expect(page.locator('#reload-status')).toHaveText('RELOADING…');await expect(page.locator('#ammo')).toHaveText('30',{timeout:15000});
  await page.locator('#pause-button').click();await expect(page.locator('#pause')).toBeVisible();const frozen=await page.evaluate(()=>window.__DEAD_ZONE__.elapsed);await page.waitForTimeout(200);expect(await page.evaluate(()=>window.__DEAD_ZONE__.elapsed)).toBe(frozen);
  await page.locator('#resume').click();await expect(page.locator('#pause')).toBeHidden();
  await page.evaluate(()=>{const g=window.__DEAD_ZONE__;g.player.health=40;const p=g.world.pickups.find(p=>p.type==='health');g.player.position.copy(p.group.position);g.player.position.y=0;});
  await expect(page.locator('#health')).toHaveText('70');
  await page.evaluate(()=>{const g=window.__DEAD_ZONE__;for(const z of g.zombies){z.damage(999);g.onKill(z);}g.toSpawn=0;});
  await expect(page.locator('#announcement-title')).toHaveText('WAVE CLEARED');
  await page.evaluate(()=>{window.__DEAD_ZONE__.breakLeft=.05;});await expect(page.locator('#wave')).toHaveText('02');
  await page.screenshot({path:'test-results/gameplay.png'});
  await page.evaluate(()=>window.__DEAD_ZONE__.damage(999));await expect(page.locator('#gameover')).toBeVisible();
  await page.locator('#restart').click();await expect(page.locator('#gameover')).toBeHidden();await expect(page.locator('#health')).toHaveText('100');await expect(page.locator('#kills')).toHaveText('00');await expect(page.locator('#wave')).toHaveText('01');await expect(page.locator('#ammo')).toHaveText('30');
  expect(errors).toEqual([]);
});

test('compact layout keeps the play control available',async({page})=>{await page.setViewportSize({width:680,height:720});await page.goto('/');await expect(page.locator('#play')).toBeInViewport();await page.screenshot({path:'test-results/compact-menu.png'});});

test('native pointer capture turns the camera and Escape pauses',async({page})=>{
  await page.goto('/');await page.waitForFunction(()=>!!window.__DEAD_ZONE__);
  await page.evaluate(()=>window.__DEAD_ZONE__.renderer.setPixelRatio(.5));
  await enterGame(page);
  await page.locator('#game').click({position:{x:720,y:450}});
  await page.waitForFunction(()=>document.pointerLockElement===document.getElementById('game'));
  const yaw=await page.evaluate(()=>window.__DEAD_ZONE__.player.yaw);
  await page.mouse.move(900,450);await page.mouse.move(1050,500);
  await expect.poll(()=>page.evaluate(()=>window.__DEAD_ZONE__.player.yaw)).not.toBe(yaw);
  await page.keyboard.press('Escape');await expect(page.locator('#pause')).toBeVisible();
});

test('collect guns, switch inventory, recoil, mixed wave one and music lifecycle',async({page})=>{
  test.setTimeout(90000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.waitForFunction(()=>!!window.__DEAD_ZONE__);
  await page.evaluate(()=>{HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.resolve();window.__DEAD_ZONE__.renderer.setPixelRatio(.6);});await enterGame(page);
  expect(await page.evaluate(()=>{const g=window.__DEAD_ZONE__;return new Set([...g.spawnQueue,...g.zombies.map(z=>z.type)]).size;})).toBe(5);
  await expect.poll(()=>page.evaluate(()=>window.__DEAD_ZONE__.sound.music.step)).toBeGreaterThan(0);
  for(const id of ['smg','shotgun','lmg']){
    await page.evaluate(id=>{const g=window.__DEAD_ZONE__,p=g.world.weaponPickups.find(p=>p.id===id);g.player.position.copy(p.group.position);g.player.position.y=0;},id);
    await expect(page.locator('#interaction-hint')).toBeVisible();await page.keyboard.press('KeyE');
    await expect.poll(()=>page.evaluate(()=>window.__DEAD_ZONE__.combat.weaponId)).toBe(id);
    expect(await page.evaluate(()=>window.__DEAD_ZONE__.combat.ammo)).toBe(({smg:40,shotgun:8,lmg:60})[id]);
  }
  await page.keyboard.press('Digit3');await expect(page.locator('#weapon-name')).toHaveText('BREACH–12',{timeout:15000});
  await page.evaluate(()=>{const g=window.__DEAD_ZONE__;g.combat.cooldown=0;g.combat.shoot([]);});expect(await page.evaluate(()=>window.__DEAD_ZONE__.player.recoil)).toBeGreaterThan(0);
  await page.keyboard.press('KeyM');expect(await page.evaluate(()=>window.__DEAD_ZONE__.sound.music.muted)).toBe(true);await page.keyboard.press('KeyM');expect(await page.evaluate(()=>window.__DEAD_ZONE__.sound.music.muted)).toBe(false);
  await page.locator('#pause-button').click();expect(await page.evaluate(()=>window.__DEAD_ZONE__.sound.music.active)).toBe(false);await page.locator('#resume').click();expect(await page.evaluate(()=>window.__DEAD_ZONE__.sound.music.active)).toBe(true);
  await page.evaluate(()=>window.__DEAD_ZONE__.damage(999));expect(await page.evaluate(()=>window.__DEAD_ZONE__.sound.music.active)).toBe(false);
  await page.locator('#restart').click();expect(await page.evaluate(()=>window.__DEAD_ZONE__.combat.inventory.size)).toBe(1);expect(await page.evaluate(()=>window.__DEAD_ZONE__.world.weaponPickups.length)).toBe(4);
  // Inspect the actual procedural models together, with the game simulation held still.
  await page.evaluate(async()=>{const {Zombie}=await import('/Zombie.js');const THREE=await import('/node_modules/.vite/deps/three.js');const g=window.__DEAD_ZONE__;g.state='inspection';g.sound.music.setActive(false);g.ui.state('menu');document.getElementById('menu').classList.add('hidden');document.getElementById('menu-footer').classList.add('hidden');document.body.classList.remove('in-menu');for(const z of g.zombies)z.dispose();g.zombies=[];const types=['normal','runner','tank','crawler','bloater'];types.forEach((type,i)=>g.zombies.push(new Zombie(g.scene,type,new THREE.Vector3(-4+i*2.3,0,3),1)));g.player.position.set(-6,0,3);g.player.mesh.rotation.y=0;g.camera.position.set(0,3.6,-9);g.camera.lookAt(-.5,1.3,3);g.renderer.setPixelRatio(1);});
  await page.screenshot({path:'test-results/character-lineup.png'});expect(errors).toEqual([]);
});

test('mouse wheel cycles both ways; G previews, throws and cancels on pause',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.waitForFunction(()=>!!window.__DEAD_ZONE__);await page.evaluate(()=>{HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.resolve();window.__DEAD_ZONE__.renderer.setPixelRatio(.5);});await enterGame(page);
  await page.evaluate(()=>{const g=window.__DEAD_ZONE__;g.combat.equip('smg',true);g.combat.equip('shotgun',true);g.combat.equip('rifle');});
  await page.mouse.move(750,480);await page.mouse.wheel(0,120);await expect(page.locator('#weapon-name')).toHaveText('VX–9');await page.waitForTimeout(160);await page.mouse.wheel(0,-120);await expect(page.locator('#weapon-name')).toHaveText('AR–25');
  await page.keyboard.down('KeyG');await expect.poll(()=>page.evaluate(()=>window.__DEAD_ZONE__.grenades.path.visible)).toBe(true);expect(await page.evaluate(()=>window.__DEAD_ZONE__.grenades.count)).toBe(2);await page.screenshot({path:'test-results/grenade-trajectory.png'});await page.keyboard.up('KeyG');await expect(page.locator('#grenade-count')).toHaveText('1');await expect.poll(()=>page.evaluate(()=>window.__DEAD_ZONE__.grenades.projectiles.length)).toBe(1);
  await page.keyboard.down('KeyG');await page.locator('#pause-button').click();await page.keyboard.up('KeyG');expect(await page.evaluate(()=>window.__DEAD_ZONE__.grenades.aiming)).toBe(false);expect(await page.evaluate(()=>window.__DEAD_ZONE__.grenades.count)).toBe(1);await page.locator('#resume').click();
  await page.evaluate(()=>{const g=window.__DEAD_ZONE__,p=g.world.pickups.find(p=>p.type==='grenade');g.player.position.copy(p.group.position);g.player.position.y=0;});await expect(page.locator('#grenade-count')).toHaveText('3');
  await page.evaluate(()=>{window.__DEAD_ZONE__.player.position.set(0,0,30);});await expect(page.locator('#hazard-warning')).toBeVisible();const hp=await page.evaluate(()=>window.__DEAD_ZONE__.player.health);await expect.poll(()=>page.evaluate(()=>window.__DEAD_ZONE__.player.health),{timeout:10000}).toBeLessThan(hp);await page.evaluate(()=>window.__DEAD_ZONE__.player.position.set(0,0,15));await expect(page.locator('#hazard-warning')).toBeHidden();expect(errors).toEqual([]);
});

test('enter open buildings, loot, fight, advance north and extract; restart resets the route',async({page})=>{
  test.setTimeout(90000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.waitForFunction(()=>!!window.__DEAD_ZONE__);await page.evaluate(()=>{HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.resolve();window.__DEAD_ZONE__.renderer.setPixelRatio(.5);});await enterGame(page);
  for(let chapter=0;chapter<4;chapter++){
    await page.evaluate(chapter=>{const g=window.__DEAD_ZONE__,s=g.mission.stage;g.player.moveVelocity.set(0,0,0);if(chapter<3){const room=g.world.routeRooms[chapter];g.player.position.set(room.front-room.side*2,0,s.z);g.player.yaw=room.side>0?-Math.PI/2:Math.PI/2;for(let i=0;i<100;i++)g.player.update(.02,new Set(['KeyW']));g.player.moveVelocity.set(0,0,0);}else g.player.position.copy(g.mission.target);},chapter);
    expect(await page.evaluate(()=>window.__DEAD_ZONE__.mission.nearLoot())).toBe(true);
    await page.keyboard.press('KeyE');expect(await page.evaluate(()=>window.__DEAD_ZONE__.mission.looted)).toBe(true);
    if(chapter===0){await page.screenshot({path:'test-results/clinic-interior.png'});}
    // Exercise real enemy damage and kill rewards to satisfy each chapter's combat requirement.
    await page.evaluate(()=>{const g=window.__DEAD_ZONE__;if(g.mission.index===3){g.toSpawn=0;g.spawnQueue=[];}if(g.zombies.filter(z=>!z.dead).length<g.mission.killsLeft)g.spawnAmbush(g.player.position,g.mission.killsLeft);for(const z of g.zombies){if(g.mission.killsLeft<=0)break;if(!z.dead){z.damage(999);g.onKill(z);}}g.mission.update(.01);});
    if(chapter<3)await expect.poll(()=>page.evaluate(()=>window.__DEAD_ZONE__.mission.index)).toBe(chapter+1);
  }
  await expect.poll(()=>page.evaluate(()=>window.__DEAD_ZONE__.mission.readyToBoard)).toBe(true);await expect(page.locator('#victory')).toBeHidden();await page.evaluate(()=>{const g=window.__DEAD_ZONE__;g.player.position.copy(g.helicopter.boardingPosition);g.player.moveVelocity.set(0,0,0);});await page.keyboard.press('KeyE');await expect(page.locator('#extraction-screen')).toBeVisible();await page.locator('#extraction-skip').click();await expect(page.locator('#victory')).toBeVisible();await page.locator('#victory-restart').click();await expect(page.locator('#victory')).toBeHidden();expect(await page.evaluate(()=>window.__DEAD_ZONE__.mission.index)).toBe(0);expect(await page.evaluate(()=>window.__DEAD_ZONE__.grenades.count)).toBe(2);await expect(page.locator('#health')).toHaveText('100');expect(errors).toEqual([]);
});

test('right mouse zooms with a centered reticle, supports firing and clears on release or pause',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.waitForFunction(()=>!!window.__DEAD_ZONE__);await page.evaluate(()=>{HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.resolve();window.__DEAD_ZONE__.renderer.setPixelRatio(.5);});await enterGame(page);await page.mouse.move(720,450);await page.mouse.down({button:'right'});
  await expect.poll(()=>page.evaluate(()=>window.__DEAD_ZONE__.camera.fov),{timeout:15000}).toBeLessThan(38);await expect(page.locator('body')).toHaveClass(/aiming/);
  const reticle=await page.locator('#crosshair').boundingBox();expect(Math.abs(reticle.x+reticle.width/2-720)).toBeLessThan(1);expect(Math.abs(reticle.y+reticle.height/2-450)).toBeLessThan(1);
  await page.mouse.down({button:'left'});await expect.poll(()=>page.evaluate(()=>window.__DEAD_ZONE__.combat.ammo)).toBeLessThan(30);await page.mouse.up({button:'left'});await page.screenshot({path:'test-results/right-click-aim.png'});
  await page.mouse.up({button:'right'});await expect.poll(()=>page.evaluate(()=>window.__DEAD_ZONE__.camera.fov),{timeout:15000}).toBeGreaterThan(56);await expect(page.locator('body')).not.toHaveClass(/aiming/);
  await page.mouse.down({button:'right'});await expect.poll(()=>page.evaluate(()=>window.__DEAD_ZONE__.camera.fov)).toBeLessThan(40);await page.keyboard.press('Escape');await expect(page.locator('#pause')).toBeVisible();expect(await page.evaluate(()=>window.__DEAD_ZONE__.camera.fov)).toBe(58);await page.mouse.up({button:'right'});await page.locator('#resume').click();expect(await page.evaluate(()=>window.__DEAD_ZONE__.player.aiming)).toBe(false);expect(errors).toEqual([]);
});

test('larger navigation, full map, textured landmarks and opening chests',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.waitForFunction(()=>!!window.__DEAD_ZONE__);await page.evaluate(()=>{HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.resolve();window.__DEAD_ZONE__.renderer.setPixelRatio(.5);});await enterGame(page);
  expect((await page.locator('.radar').boundingBox()).width).toBeGreaterThan(250);expect((await page.locator('#bearing-arrow').boundingBox()).width).toBeGreaterThan(55);
  expect(await page.evaluate(()=>window.__DEAD_ZONE__.navigation.action)).toBe('ENTER LIT DOORWAY');expect(await page.evaluate(()=>window.__DEAD_ZONE__.navigation.path.length)).toBeGreaterThan(3);
  await page.keyboard.press('Tab');await expect(page.locator('#tactical-map')).toBeVisible();await expect(page.locator('#pause')).toBeHidden();expect(await page.evaluate(()=>window.__DEAD_ZONE__.state)).toBe('pause');await expect(page.locator('#tactical-objectives li.current')).toHaveCount(1);await page.screenshot({path:'test-results/tactical-map.png'});await page.keyboard.press('Escape');await expect(page.locator('#tactical-map')).toBeHidden();expect(await page.evaluate(()=>window.__DEAD_ZONE__.state)).toBe('playing');
  await page.evaluate(()=>{const g=window.__DEAD_ZONE__,room=g.world.routeRooms[0];g.player.position.set(room.front-room.side*7,0,room.z+6);g.player.yaw=Math.PI/2;g.player.pitch=.05;g.player.update(.1,new Set());g.navigation.update(0,true);g.ui.announcementTime=0;});await page.screenshot({path:'test-results/clinic-exterior-upgraded.png'});
  expect(await page.evaluate(()=>{const w=window.__DEAD_ZONE__.world;return w.surfaces.maps.size;})).toBeGreaterThanOrEqual(3);
  await page.evaluate(()=>{const g=window.__DEAD_ZONE__;g.player.position.set(-26.3,0,-23);g.player.moveVelocity.set(0,0,0);g.navigation.update(0,true);});await expect(page.locator('#interaction-hint')).toHaveText('[ E ] SEARCH SUPPLY CACHE');await expect.poll(()=>page.evaluate(()=>window.__DEAD_ZONE__.world.caches[0].label.visible)).toBe(true);await page.keyboard.press('KeyE');expect(await page.evaluate(()=>window.__DEAD_ZONE__.world.caches[0].opened)).toBe(true);await expect.poll(()=>page.evaluate(()=>window.__DEAD_ZONE__.world.caches[0].lid.rotation.x)).toBeGreaterThan(.5);await page.screenshot({path:'test-results/opened-supply-chest.png'});
  await page.locator('#pause-button').click();await page.locator('#pause-restart').click();expect(await page.evaluate(()=>window.__DEAD_ZONE__.world.caches[0].opened)).toBe(false);expect(await page.evaluate(()=>window.__DEAD_ZONE__.world.caches[0].lid.rotation.x)).toBe(0);expect(errors).toEqual([]);
});

test('higher-poly characters and architecture render with working detail levels',async({page})=>{
  test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.waitForFunction(()=>!!window.__DEAD_ZONE__);
  const stats=await page.evaluate(()=>{const g=window.__DEAD_ZONE__;let triangles=0;g.player.mesh.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});let windowInstances=0;for(const lod of g.world.architecture.lods)lod.traverse(o=>{if(o.isInstancedMesh)windowInstances+=o.count;});return {triangles,windowInstances,buildings:g.world.architecture.lods.length};});expect(stats.triangles).toBeGreaterThan(55000);expect(stats.windowInstances).toBeGreaterThan(1000);expect(stats.buildings).toBeGreaterThan(10);
  await page.evaluate(async()=>{const {Zombie}=await import('/Zombie.js'),THREE=await import('/node_modules/.vite/deps/three.js');const g=window.__DEAD_ZONE__;g.state='inspection';g.ui.state('menu');document.getElementById('menu').classList.add('hidden');document.getElementById('menu-footer').classList.add('hidden');document.body.classList.remove('in-menu');g.world.resetSupplies();g.player.position.set(-6,0,3);g.player.mesh.rotation.y=0;['normal','runner','tank','crawler','bloater'].forEach((type,i)=>g.zombies.push(new Zombie(g.scene,type,new THREE.Vector3(-4+i*2.3,0,3),1)));g.camera.position.set(0,3.3,-9);g.camera.lookAt(-.5,1.3,3);g.renderer.setPixelRatio(1);});
  await page.screenshot({path:'test-results/high-poly-characters.png'});
  await page.evaluate(()=>{const g=window.__DEAD_ZONE__;g.camera.position.set(-11,5.7,-12);g.camera.lookAt(-28,2,-23);});await page.screenshot({path:'test-results/high-poly-clinic.png'});
  await page.evaluate(()=>{const g=window.__DEAD_ZONE__;g.camera.position.set(2,4.8,13);g.camera.lookAt(0,7,-25);});await page.screenshot({path:'test-results/high-poly-city.png'});expect(errors).toEqual([]);
});

test('short grenade fuse, layered blast, reset cleanup and smoother slower sprint',async({page})=>{
  test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.waitForFunction(()=>!!window.__DEAD_ZONE__);await page.evaluate(()=>{HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.resolve();window.__DEAD_ZONE__.renderer.setPixelRatio(.5);});await enterGame(page);
  const sprint=await page.evaluate(()=>{const g=window.__DEAD_ZONE__;for(let i=0;i<90;i++)g.player.update(1/60,new Set(['KeyW','ShiftLeft']));return {speed:g.player.moveVelocity.length(),knee:Math.abs(g.player.mesh.userData.limbs.kneePivot1.rotation.x),run:g.player.runBlend};});expect(sprint.speed).toBeGreaterThan(5.7);expect(sprint.speed).toBeLessThan(5.8);expect(sprint.run).toBeGreaterThan(.9);
  await page.keyboard.down('KeyG');await expect.poll(()=>page.evaluate(()=>window.__DEAD_ZONE__.grenades.aiming)).toBe(true);await page.keyboard.up('KeyG');expect(await page.evaluate(()=>window.__DEAD_ZONE__.grenades.projectiles[0].fuse)).toBeLessThanOrEqual(1.6);
  const detonation=await page.evaluate(()=>{const g=window.__DEAD_ZONE__;for(let i=0;i<33;i++)g.grenades.update(.05);return {thrown:g.grenades.projectiles.length,blasts:g.grenades.explosions.length,smoke:g.grenades.explosions[0].smoke.length};});expect(detonation.thrown).toBe(0);expect(detonation.blasts).toBe(1);expect(detonation.smoke).toBeGreaterThan(5);
  await page.locator('#pause-button').click();await page.locator('#pause-restart').click();expect(await page.evaluate(()=>window.__DEAD_ZONE__.grenades.explosions.length)).toBe(0);expect(await page.evaluate(()=>window.__DEAD_ZONE__.grenades.projectiles.length)).toBe(0);
  await page.evaluate(async()=>{const THREE=await import('/node_modules/.vite/deps/three.js');const {createGrenadeModel}=await import('/GrenadeModel.js');const g=window.__DEAD_ZONE__;g.state='inspection';g.sound.music?.setActive(false);g.ui.state('menu');document.getElementById('menu').classList.add('hidden');document.getElementById('menu-footer').classList.add('hidden');document.body.classList.remove('in-menu');g.player.mesh.visible=false;const model=createGrenadeModel();model.position.set(0,1.2,3);model.scale.setScalar(3);g.scene.add(model);g.camera.position.set(1.5,1.9,.7);g.camera.lookAt(0,1.3,3);g.renderer.setPixelRatio(1);window.__grenadePreview=model;});await page.screenshot({path:'test-results/detailed-grenade.png'});
  await page.evaluate(async()=>{const THREE=await import('/node_modules/.vite/deps/three.js');const g=window.__DEAD_ZONE__;g.scene.remove(window.__grenadePreview);g.camera.position.set(3.5,3.2,11);g.camera.lookAt(0,.7,2);g.grenades.explode(new THREE.Vector3(0,.2,2));g.grenades.update(.12);g.world.update(.12,g.elapsed,g);});await page.screenshot({path:'test-results/grenade-explosion.png'});
  await page.evaluate(()=>window.__DEAD_ZONE__.grenades.update(.5));await page.screenshot({path:'test-results/grenade-smoke.png'});expect(errors).toEqual([]);
});
