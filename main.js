import * as THREE from 'three';
import {Extraction} from './Extraction.js';
import {Intro} from './Intro.js';
import {World} from './World.js';
import {Player} from './Player.js';
import {Zombie} from './Zombie.js';
import {Combat,Sound} from './Combat.js';
import {UI} from './UI.js';
import {Grenades} from './Grenades.js';
import {Navigation} from './Navigation.js';
import {Mission} from './Mission.js';
import {waveRoster} from './rules.js';
import {WEAPON_IDS,WEAPONS} from './Weapons.js';

class Game {
  constructor(){
    this.canvas=document.getElementById('game');
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.setSize(innerWidth,innerHeight);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,180);this.world=new World(this.scene);this.helicopter=this.world.helicopter;this.player=new Player(this.scene,this.camera,this.world);this.sound=new Sound();this.ui=new UI();this.zombies=[];this.keys=new Set();this.shooting=false;this.state='menu';this.elapsed=0;this.kills=0;this.wave=0;this.toSpawn=0;this.breakLeft=0;this.spawnTimer=0;this.menuTime=0;
    this.combat=new Combat(this.scene,this.camera,this.player,this.world,this.sound,z=>this.onKill(z),()=>this.ui.hit());
    this.grenades=new Grenades(this);this.mission=new Mission(this);this.navigation=new Navigation(this);this.intro=new Intro(this);this.extraction=new Extraction(this);this.ui.state('menu');this.events();this.last=performance.now();this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);
  }
  events(){
    document.getElementById('play').addEventListener('click',()=>this.intro.play());
    for(const id of ['restart','pause-restart','victory-restart'])document.getElementById(id).addEventListener('click',()=>this.start());
    for(const id of ['map-button','map-close'])document.getElementById(id).addEventListener('click',()=>this.toggleMap());
    document.getElementById('music-button').addEventListener('click',()=>this.toggleMusic());
    document.getElementById('resume').addEventListener('click',()=>this.resume());document.getElementById('pause-button').addEventListener('click',()=>this.pause());
    window.addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);});
    window.addEventListener('keydown',e=>{if(this.state==='extraction'){if(e.code==='Escape'){e.preventDefault();this.extraction.finish();}return;}if(this.state==='intro'){if(e.code==='Escape'){e.preventDefault();this.intro.finish();}return;}if(e.code==='Tab'&&(this.state==='playing'||this.state==='pause')){e.preventDefault();if(!e.repeat)this.toggleMap();return;}if(e.code==='Escape'&&this.ui.mapExpanded){this.toggleMap();return;}if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='KeyM'&&!e.repeat){this.toggleMusic();return;}if(e.code==='Escape'){if(this.state==='playing')this.pause();else if(this.state==='pause')this.resume();return;}if(this.state!=='playing')return;this.keys.add(e.code);if(e.code==='Space'&&!e.repeat)this.player.jumpQueued=true;if(e.code==='KeyR')this.combat.reload();if(!e.repeat&&e.code==='KeyE')this.interact();if(!e.repeat&&e.code==='KeyG')this.grenades.begin();if(!e.repeat&&e.code==='KeyQ')this.combat.cycle();if(!e.repeat&&/^Digit[1-4]$/.test(e.code))this.combat.equip(WEAPON_IDS[Number(e.code.slice(-1))-1]);});
    window.addEventListener('keyup',e=>{this.keys.delete(e.code);if(e.code==='KeyG')this.grenades.release();});
    this.canvas.addEventListener('wheel',e=>{if(this.state!=='playing')return;e.preventDefault();if(!e.deltaY)return;const now=performance.now();if(now<(this.wheelReady||0))return;this.wheelReady=now+130;this.combat.cycle(Math.sign(e.deltaY));},{passive:false});
    window.addEventListener('mousemove',e=>{if(this.state==='playing'&&(document.pointerLockElement===this.canvas||this.dragAim))this.player.look(e.movementX,e.movementY);});
    this.canvas.addEventListener('mousedown',e=>{if(this.state!=='playing')return;if(e.button===0){this.shooting=true;this.sound.unlock();}if(e.button===2){this.dragAim=true;this.setAiming(true);}if(document.pointerLockElement!==this.canvas)this.lock();});
    window.addEventListener('mouseup',e=>{if(e.button===0)this.shooting=false;if(e.button===2){this.dragAim=false;this.setAiming(false);}});
    this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
    document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement===this.canvas)document.getElementById('lock-hint').classList.add('hidden');if(!document.pointerLockElement&&this.state==='playing')this.pause();});
    document.addEventListener('pointerlockerror',()=>{if(this.state==='playing')this.ui.toast('Mouse capture unavailable · Hold right mouse to aim');});
    window.addEventListener('blur',()=>this.pause());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();});
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.pause();this.showError('The graphics context was lost. Reload this page to restore the renderer.');});
  }
  lock(){try{const p=this.canvas.requestPointerLock?.();p?.catch?.(()=>{if(this.state==='playing')this.ui.toast('Hold right mouse to aim · Left click to fire');});}catch{this.ui.toast('Hold right mouse to aim · Left click to fire');}}
  start({captureMouse=true}={}){
    for(const z of this.zombies)z.dispose();this.zombies=[];this.extraction.reset();this.world.clearPickups();this.world.clearWeapons();this.grenades.reset();this.player.reset();this.setAiming(false,true);this.combat.reset();this.keys.clear();this.shooting=false;this.dragAim=false;this.elapsed=0;this.kills=0;this.wave=0;this.breakLeft=0;this.toSpawn=0;this.spawnTimer=0;this.ui.damageTime=0;this.ui.toastTime=0;this.state='playing';this.ui.state('playing');
    this.world.resetSupplies();this.mission.reset();this.navigation.reset();this.navigation.update(0,true);this.sound.unlock();this.sound.music?.setActive(true,true);this.nextWave();this.ui.update(0,this);this.last=performance.now();if(captureMouse)this.lock();
  }

  beginFinalWave(){this.wave=Math.max(4,this.wave+1);this.spawnQueue=waveRoster(3);this.toSpawn=this.spawnQueue.length;this.spawnTimer=.5;this.breakLeft=0;for(const zombie of this.zombies)if(!zombie.dead&&zombie.position.distanceTo(this.player.position)>45)zombie.position.copy(this.world.spawnPosition(this.player.position,19,28));this.ui.announce('EVAC REQUEST ACCEPTED / HOLD THE LANDING ZONE','FINAL WAVE',4);this.sound.play('wave');}
  nextWave(){this.wave++;this.spawnQueue=waveRoster(this.wave);this.toSpawn=this.spawnQueue.length;this.spawnTimer=.6;this.breakLeft=0;this.ui.announce(`SECTOR 07 / ${this.toSpawn} HOSTILES INBOUND`,`WAVE ${String(this.wave).padStart(2,'0')}`,3.5);this.sound.play('wave');if(this.wave>1){this.player.health=Math.min(100,this.player.health+10);this.combat.reserve=Math.min(360,this.combat.reserve+30);this.ui.toast('WAVE SUPPLIES  +10 HP  /  +30 AMMO');}}
  pause(){if(this.state!=='playing')return;this.state='pause';this.setAiming(false,true);this.keys.clear();this.shooting=false;this.dragAim=false;this.grenades.cancel();this.player.moveVelocity.set(0,0,0);this.ui.state('pause');this.sound.music?.setActive(false);if(document.pointerLockElement)document.exitPointerLock();}
  resume(){if(this.state!=='pause')return;this.state='playing';this.ui.state('playing');this.sound.unlock();this.sound.music?.setActive(true);this.lock();}
  toggleMap(){if(this.ui.mapExpanded){this.ui.mapExpanded=false;document.getElementById('tactical-map').classList.add('hidden');if(this.mapWasPlaying)this.resume();else this.ui.state('pause');return;}if(this.state!=='playing'&&this.state!=='pause')return;this.mapWasPlaying=this.state==='playing';if(this.mapWasPlaying)this.pause();document.getElementById('pause').classList.add('hidden');this.ui.mapExpanded=true;this.ui.drawMap(this);document.getElementById('tactical-map').classList.remove('hidden');document.getElementById('map-close').focus();}
  setAiming(active,immediate=false){this.player.setAiming(active,immediate);document.body.classList.toggle('aiming',active);}
  toggleMusic(){this.sound.unlock();const muted=this.sound.music?.toggle();document.getElementById('music-button').textContent=muted?'♫ OFF':'♫ ON';document.getElementById('music-button').setAttribute('aria-pressed',String(!muted));}
  nearbyWeapon(){return this.world.weaponPickups.find(p=>Math.hypot(p.group.position.x-this.player.position.x,p.group.position.z-this.player.position.z)<2.2);}
  collectWeapon(){const p=this.nearbyWeapon();if(!p)return;this.combat.equip(p.id,true);this.world.removeWeaponPickup(p);this.sound.play('pickup');this.ui.toast(`${WEAPONS[p.id].name} EQUIPPED / 1–4 OR Q TO SWITCH`);}
  interact(){if(this.mission.index===3&&this.mission.nearHelicopter()){if(!this.mission.board())this.ui.toast('HELICOPTER LOCKED / ACTIVATE THE BEACON AND CLEAR ALL INFECTED');return;}if(this.mission.nearLoot()&&!this.mission.looted){this.mission.interact();return;}this.collectWeapon();}
  spawnAmbush(target,count){const types=['runner','normal','crawler','tank','bloater'];for(let i=0;i<count;i++){const position=this.world.spawnPosition(target,12,20);this.zombies.push(new Zombie(this.scene,types[i%types.length],position,this.wave));}}
  win(){this.state='victory';this.setAiming(false,true);this.dragAim=false;this.shooting=false;this.keys.clear();this.grenades.cancel();this.ui.state('victory');document.getElementById('victory-stats').textContent=`${this.kills} ELIMINATIONS / ${Math.floor(this.elapsed/60)}m ${Math.floor(this.elapsed%60)}s / LEVEL ${this.mission.level}`;this.sound.music?.setActive(false);this.sound.play('wave');if(document.pointerLockElement)document.exitPointerLock();}
  onKill(zombie){this.kills++;this.mission.awardKill();this.combat.burst(zombie.position.clone().add(new THREE.Vector3(0,1,0)),'blood',12);if(Math.random()<.38){const type=Math.random()<.2?'grenade':Math.random()<.4?'health':Math.random()<.8?'ammo':'speed';this.world.addPickup(type,zombie.position.clone());}}
  damage(amount){if(this.state!=='playing')return;this.player.health=Math.max(0,this.player.health-amount);this.ui.damage();this.sound.play('attack');this.sound.play('damage');if(this.player.health<=0){this.state='gameover';this.setAiming(false,true);this.dragAim=false;this.grenades.cancel();this.keys.clear();this.shooting=false;this.ui.update(0,this);this.ui.gameover(this);this.sound.music?.setActive(false);this.sound.play('over');if(document.pointerLockElement)document.exitPointerLock();}}
  update(dt){
    this.elapsed+=dt;this.player.update(dt,this.keys);this.combat.update(dt);this.grenades.update(dt);this.mission.update(dt);if(this.state!=='playing')return;this.navigation.update(dt);
    if(this.shooting&&!this.grenades.aiming)this.combat.shoot(this.zombies);
    if(this.toSpawn>0){this.spawnTimer-=dt;if(this.spawnTimer<=0){const type=this.spawnQueue.shift();this.zombies.push(new Zombie(this.scene,type,this.world.spawnPosition(this.player.position),this.wave));this.toSpawn--;this.spawnTimer=Math.max(.3,1.1-this.wave*.035);}}
    for(let i=this.zombies.length-1;i>=0;i--){const z=this.zombies[i];if(z.update(dt,this.player,this.world,this.zombies,amount=>this.damage(amount))){z.dispose();this.zombies.splice(i,1);}else if(z.flash<=0)z.mesh.userData.limbs.torso.material.emissiveIntensity=0;if(this.state!=='playing')break;}
    if(this.state!=='playing')return;
    if(this.mission.index<3&&this.toSpawn===0&&!this.zombies.some(z=>!z.dead)){if(this.breakLeft===0){this.breakLeft=9;this.ui.announce('AREA SECURED / RESUPPLY & REPOSITION','WAVE CLEARED',3);this.sound.play('wave');const p=this.world.spawnPosition(this.player.position,4,9);this.world.addPickup('ammo',p);this.world.addPickup('health',this.world.spawnPosition(this.player.position,4,9));}else {this.breakLeft-=dt;if(this.breakLeft<=0)this.nextWave();}}
    for(let i=this.world.pickups.length-1;i>=0;i--){const p=this.world.pickups[i];const distance=Math.hypot(p.group.position.x-this.player.position.x,p.group.position.z-this.player.position.z);if(distance>1.2)continue;if(p.type==='health'&&this.player.health>=100)continue;if(p.type==='ammo'&&this.combat.reserve>=360)continue;
      if(p.type==='health'){this.player.health=Math.min(100,this.player.health+30);this.ui.toast('MEDKIT RECOVERED  +30 HP');}else if(p.type==='ammo'){this.combat.reserve=Math.min(360,this.combat.reserve+60);this.ui.toast('AMMUNITION RECOVERED  +60 ROUNDS');if(this.combat.ammo===0)this.combat.reload();}else if(p.type==='grenade'){if(this.grenades.count>=6)continue;this.grenades.count=Math.min(6,this.grenades.count+2);this.ui.toast('FRAG GRENADES +2 / HOLD G TO AIM, RELEASE TO THROW');}else{this.player.speedBoost=12;this.ui.toast('ADRENALINE  /  SPEED BOOST 12s');}
      this.sound.play('pickup');this.world.removePickup(p);
    }
    // Keep long sessions bounded even if the player avoids every supply drop.
    while(this.world.pickups.length>32){const p=this.world.pickups[0];this.world.removePickup(p);}
  }
  frame(now){requestAnimationFrame(this.frame);const dt=Math.min((now-this.last)/1000,.5);this.last=now;if(this.state==='intro'||(this.state==='extraction'&&this.extraction.videoMode))return;
    if(this.state==='playing'){let remaining=dt;while(remaining>1e-6&&this.state==='playing'){const step=Math.min(.05,remaining);this.update(step);remaining-=step;}this.ui.update(dt,this);this.world.update(dt,this.elapsed,this);this.world.sun.position.z=this.player.position.z-28;this.world.sun.target.position.z=this.player.position.z;}else if(this.state==='extraction'){this.extraction.update(dt);this.world.update(dt,this.elapsed,this);}else if(this.state==='menu'){this.menuTime+=dt;this.world.update(dt,this.menuTime);const a=.3+Math.sin(this.menuTime*.045)*.25;this.camera.position.set(12+Math.sin(a)*12,6.5,21+Math.cos(a)*7);this.camera.lookAt(-2,2,-14);}
    this.sound.music?.update(this.wave);this.renderer.render(this.scene,this.camera);
  }
  showError(message){document.getElementById('error-text').textContent=message;document.getElementById('fatal-error').classList.remove('hidden');}
}
try{const game=new Game();if(import.meta.env.DEV)window.__DEAD_ZONE__=game;}catch(error){console.error(error);document.getElementById('error-text').textContent='WebGL could not initialize. Use a desktop browser with hardware acceleration enabled. '+error.message;document.getElementById('fatal-error').classList.remove('hidden');}
