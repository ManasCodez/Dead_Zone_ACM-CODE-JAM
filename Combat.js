import * as THREE from 'three';
import {WEAPONS,WEAPON_IDS} from './Weapons.js';
import {Music} from './Music.js';
import {CombatEffects} from './CombatEffects.js';
export const WEAPON=WEAPONS.rifle;
export class Sound {
  constructor(){this.context=null;this.master=null;this.voices=0;this.settings={master:.8,music:.65,effects:.8};}
  unlock(){try{if(!this.context){this.context=new (window.AudioContext||window.webkitAudioContext)();this.master=this.context.createGain();this.master.gain.value=.24;this.master.connect(this.context.destination);this.music=new Music(this.context,this.master);this.applySettings();}this.context.resume().catch(()=>{});}catch{/* The game remains playable when audio is unavailable. */}}
  applySettings(){if(!this.master)return;this.master.gain.setTargetAtTime(.3*this.settings.master,this.context.currentTime,.03);if(this.music){this.music.volume=this.settings.music;this.music.muted=Boolean(this.settings.musicMuted);this.music.applyVolume();}}
  tone(freq,duration,type='sine',volume=.4,end=80,delay=0,pan=0){if(!this.context||this.context.state!=='running'||this.voices>=32)return;this.voices++;const c=this.context,t=c.currentTime+delay,osc=c.createOscillator(),g=c.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);g.gain.setValueAtTime(volume*this.settings.effects,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);osc.connect(g);let panner;if(pan&&c.createStereoPanner){panner=c.createStereoPanner();panner.pan.value=pan;g.connect(panner);panner.connect(this.master);}else g.connect(this.master);osc.start(t);osc.stop(t+duration+.02);osc.onended=()=>{this.voices--;osc.disconnect();g.disconnect();panner?.disconnect();};}
  noise(duration=.12,volume=.7){if(!this.context||this.context.state!=='running'||this.voices>=32)return;this.voices++;const c=this.context;this.noiseBuffers||=new Map();let buffer=this.noiseBuffers.get(duration);if(!buffer){buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);this.noiseBuffers.set(duration,buffer);}const src=c.createBufferSource(),g=c.createGain(),filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1800;src.buffer=buffer;g.gain.value=volume*this.settings.effects;src.connect(filter);filter.connect(g);g.connect(this.master);src.start();src.onended=()=>{this.voices--;src.disconnect();filter.disconnect();g.disconnect();};}
  spatial(name,position,player){const distance=position.distanceTo(player.position);if(distance>32)return;const angle=Math.atan2(position.x-player.position.x,-(position.z-player.position.z))+player.yaw,pitch={runner:170,tank:60,brute:48,crawler:250,scream:390,spitter:210,stalker:140,riot:85,exploder:110,alpha:40,step:75}[name]||100;this.tone(pitch,name==='step'?.045:.3,'triangle',(name==='step'?.09:.15)*(1-distance/32),pitch*.5,0,Math.sin(angle));}
  play(name){switch(name){case'shoot':this.noise(.13,.8);this.tone(130,.14,'triangle',.7,35);break;case'hit':this.tone(90,.09,'square',.1,40);break;case'damage':this.noise(.2,.45);this.tone(70,.23,'sawtooth',.35,32);break;case'attack':this.tone(115,.2,'sawtooth',.1,50);break;case'pickup':this.tone(440,.12,'sine',.35,660);this.tone(660,.22,'sine',.25,880,.1);break;case'reload':this.noise(.08,.3);this.tone(280,.08,'square',.1,160);this.tone(500,.08,'square',.08,220,1.7);break;case'wave':this.tone(220,.4,'triangle',.3,220);this.tone(330,.45,'triangle',.25,330,.18);this.tone(440,.6,'triangle',.2,440,.36);break;case'over':this.tone(220,.8,'sawtooth',.2,55);this.tone(110,1.5,'triangle',.25,30,.2);break;case'empty':this.tone(150,.035,'square',.12,120);break;}}
}
export class Combat {
  constructor(scene,camera,player,world,sound,onKill,onHit){Object.assign(this,{scene,camera,player,world,sound,onKill,onHit});this.ray=new THREE.Raycaster();this.effects=new CombatEffects(scene);this.particles=this.effects.particles;this.tracers=this.effects.tracers;this.reset();}
  get spec(){const base=WEAPONS[this.weaponId],u=this.upgrades||{};return {...base,capacity:base.capacity+(u.magazine||0)*Math.ceil(base.capacity*.15),reloadTime:base.reloadTime*(1-(u.reload||0)*.08),damage:base.damage*(1+(u.damage||0)*.1),recoil:base.recoil*(1-(u.stability||0)*.12)};}
  get ammo(){return this.inventory.get(this.weaponId).ammo;}
  set ammo(value){this.inventory.get(this.weaponId).ammo=value;}
  get reserve(){return this.inventory.get(this.weaponId).reserve;}
  set reserve(value){this.inventory.get(this.weaponId).reserve=value;}
  reset(){this.upgrades={};this.inventory=new Map([['rifle',{ammo:30,reserve:180}]]);this.weaponId='rifle';this.player.setWeapon?.('rifle');this.cooldown=0;this.reloadLeft=0;this.reloadDuration=0;this.reloadTarget=0;this.reloadInserted=0;this.autoReloadLeft=0;this.triggerHeld=false;this.player.reloadProgress=0;this.player.reloadShells=1;this.effects.reset();}
  equip(id,pickup=false){if(!WEAPONS[id])return false;if(pickup){if(!this.inventory.has(id))this.inventory.set(id,{ammo:WEAPONS[id].capacity,reserve:WEAPONS[id].capacity*4});else this.inventory.get(id).reserve=Math.min(360,this.inventory.get(id).reserve+WEAPONS[id].capacity*2);}if(!this.inventory.has(id))return false;if(id===this.weaponId)return true;this.weaponId=id;this.reloadLeft=0;this.reloadDuration=0;this.reloadTarget=0;this.reloadInserted=0;this.triggerHeld=false;this.autoReloadLeft=0;this.cooldown=Math.max(this.cooldown,.2);this.player.reloadProgress=0;this.player.reloadShells=1;this.player.setWeapon?.(id);return true;}
  cycle(direction=1){const ids=WEAPON_IDS.filter(id=>this.inventory.has(id));return this.equip(ids[(ids.indexOf(this.weaponId)+(direction<0?-1:1)+ids.length)%ids.length]);}
  reload(){if(this.reloadLeft>0||this.ammo>=this.spec.capacity||this.reserve<=0)return false;this.reloadDuration=this.spec.reloadTime;this.reloadLeft=this.reloadDuration;this.reloadTarget=Math.min(this.spec.capacity-this.ammo,this.reserve);this.reloadInserted=0;this.player.reloadProgress=0;this.player.reloadShells=this.weaponId==='shotgun'?this.reloadTarget:1;this.sound.play('reload');return true;}
  shoot(zombies){
    if(this.cooldown>0||this.reloadLeft>0||(this.spec.semi&&this.triggerHeld))return;
    if(this.ammo<=0){this.cooldown=.3;if(this.reserve>0&&!this.autoReloadLeft)this.autoReloadLeft=.4;else if(!this.reserve)this.sound.play('empty');return;}
    const spec=this.spec;this.triggerHeld=true;
    this.ammo--;this.cooldown=spec.interval;this.player.flashTime=.06;this.stats&&(this.stats.shots++);this.world.alertNoise?.(this.player.position,55);this.effects.particle(this.player.muzzlePosition(),'shell',new THREE.Vector3(Math.cos(this.player.yaw||0)*2,2,-Math.sin(this.player.yaw||0)*2),.8);this.autoReloadLeft=this.ammo===0?.4:0;
    this.sound.play('shoot');if(this.weaponId==='shotgun')this.sound.noise?.(.25,1);if(this.weaponId==='lmg')this.sound.tone?.(85,.17,'triangle',.6,30);
    this.camera.updateMatrixWorld();this.ray.setFromCamera(new THREE.Vector2(0,0),this.camera);this.ray.far=spec.range;
    const targets=zombies.filter(z=>!z.dead).map(z=>z.mesh),surfaces=[...this.world.solids,...targets];
    const aimHit=this.ray.intersectObjects(surfaces,true)[0];
    const target=aimHit?aimHit.point:this.ray.ray.at(spec.range,new THREE.Vector3());
    const start=this.player.muzzlePosition();
    if(this.player.position){const origin=this.player.position.clone().add(new THREE.Vector3(0,1.3,0)),toMuzzle=start.clone().sub(origin),distance=toMuzzle.length();this.ray.set(origin,toMuzzle.normalize());this.ray.far=distance;const obstruction=this.ray.intersectObjects(this.world.solids,false)[0];if(obstruction)start.copy(obstruction.point).addScaledVector(toMuzzle,-.04);}
    const forward=target.clone().sub(start).normalize();
    const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize(),up=new THREE.Vector3().crossVectors(right,forward).normalize();
    let shotHit=false,headHit=false;for(let pellet=0;pellet<spec.pellets;pellet++){
      const direction=forward.clone();if(spec.spread){const angle=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*spec.spread;direction.addScaledVector(right,Math.cos(angle)*r).addScaledVector(up,Math.sin(angle)*r).normalize();}
      // Cast from the muzzle so nearby cover blocks every pellet.
      this.ray.set(start,direction);this.ray.far=spec.range;
      const hit=this.ray.intersectObjects(surfaces,true).find(h=>!h.object.userData.zombie?.dead&&!h.object.userData.destructible?.dead);
      const end=hit?hit.point:start.clone().addScaledVector(direction,spec.range);
      if(hit){const zombie=hit.object.userData.zombie;if(zombie){const critical=(hit.object.userData.hitZone==='head'||zombie.mesh.worldToLocal(hit.point.clone()).y>1.65),falloff=Math.max(.55,1-Math.max(0,hit.distance-spec.range*.4)/spec.range*.5),damage=spec.damage*falloff*(critical?2+(this.criticalBonus||0):1);const killed=zombie.damage(damage,{direction,point:hit.point,critical,source:start});if(killed)this.onKill(zombie);const feedback=killed?'kill':zombie.lastArmored?'armor':critical?'critical':'hit';this.onHit(feedback);this.sound.play('hit');this.burst(end,'blood',spec.pellets>1?3:9);if(this.stats){if(!shotHit){this.stats.hits++;shotHit=true;}if(critical&&!headHit){this.stats.headshots++;headHit=true;this.onHeadshot?.();}}}else{hit.object.userData.destructible?.damage(spec.damage);const surface=hit.object.userData.surface||hit.object.material?.userData?.surface,material=hit.object.material,impact=surface==='wood'?'wood':material?.metalness>.4?'spark':material?.roughness<.3?'glass':'concrete';this.burst(end,impact,impact==='spark'?5:4);}}
      this.effects.tracer(start,end);
    }
    this.player.kick?.(spec.recoil);if(this.weaponId==='marksman'||this.weaponId==='revolver')this.sound.tone?.(this.weaponId==='revolver'?74:105,.22,'triangle',.5,28);
  }
  burst(position,type,count){for(let i=0;i<count*(this.particleScale||1);i++)this.effects.particle(position,type,new THREE.Vector3((Math.random()-.5)*4,Math.random()*3,(Math.random()-.5)*4),.3+Math.random()*.3);}
  update(dt){
    this.cooldown=Math.max(0,this.cooldown-dt);
    if(this.autoReloadLeft>0){this.autoReloadLeft=Math.max(0,this.autoReloadLeft-dt);if(!this.autoReloadLeft&&this.ammo===0)this.reload();}
    if(this.reloadLeft>0){
      this.reloadLeft=Math.max(0,this.reloadLeft-dt);
      const progress=1-this.reloadLeft/this.reloadDuration;
      if(this.weaponId==='shotgun'){
        const inserted=Math.min(this.reloadTarget,Math.floor(progress*this.reloadTarget+1e-7)),amount=Math.min(inserted-this.reloadInserted,this.reserve);
        if(amount>0){this.ammo+=amount;this.reserve-=amount;this.reloadInserted+=amount;this.sound.tone?.(360,.045,'square',.06,230);}
      }else if(this.reloadLeft===0){const amount=Math.min(this.reloadTarget,this.reserve);this.ammo+=amount;this.reserve-=amount;}
      this.player.reloadProgress=this.reloadLeft>0?progress:0;
    }else this.player.reloadProgress=0;
    this.effects.update(dt);
  }
}
