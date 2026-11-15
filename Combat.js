import * as THREE from 'three';
import {WEAPONS,WEAPON_IDS} from './Weapons.js';
import {Music} from './Music.js';
export const WEAPON=WEAPONS.rifle;
export class Sound {
  constructor(){this.context=null;this.master=null;}
  unlock(){try{if(!this.context){this.context=new (window.AudioContext||window.webkitAudioContext)();this.master=this.context.createGain();this.master.gain.value=.24;this.master.connect(this.context.destination);this.music=new Music(this.context,this.master);}this.context.resume().catch(()=>{});}catch{/* The game remains playable when audio is unavailable. */}}
  tone(freq,duration,type='sine',volume=.4,end=80,delay=0){if(!this.context||this.context.state!=='running')return;const c=this.context,t=c.currentTime+delay,osc=c.createOscillator(),g=c.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);osc.connect(g);g.connect(this.master);osc.start(t);osc.stop(t+duration+.02);osc.onended=()=>{osc.disconnect();g.disconnect();};}
  noise(duration=.12,volume=.7){if(!this.context||this.context.state!=='running')return;const c=this.context,buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);const src=c.createBufferSource(),g=c.createGain(),filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1800;src.buffer=buffer;g.gain.value=volume;src.connect(filter);filter.connect(g);g.connect(this.master);src.start();src.onended=()=>{src.disconnect();filter.disconnect();g.disconnect();};}
  play(name){switch(name){case'shoot':this.noise(.13,.8);this.tone(130,.14,'triangle',.7,35);break;case'hit':this.tone(90,.09,'square',.1,40);break;case'damage':this.noise(.2,.45);this.tone(70,.23,'sawtooth',.35,32);break;case'attack':this.tone(115,.2,'sawtooth',.1,50);break;case'pickup':this.tone(440,.12,'sine',.35,660);this.tone(660,.22,'sine',.25,880,.1);break;case'reload':this.noise(.08,.3);this.tone(280,.08,'square',.1,160);this.tone(500,.08,'square',.08,220,1.7);break;case'wave':this.tone(220,.4,'triangle',.3,220);this.tone(330,.45,'triangle',.25,330,.18);this.tone(440,.6,'triangle',.2,440,.36);break;case'over':this.tone(220,.8,'sawtooth',.2,55);this.tone(110,1.5,'triangle',.25,30,.2);break;case'empty':this.tone(150,.035,'square',.12,120);break;}}
}
export class Combat {
  constructor(scene,camera,player,world,sound,onKill,onHit){Object.assign(this,{scene,camera,player,world,sound,onKill,onHit});this.ray=new THREE.Raycaster();this.particles=[];this.tracers=[];this.particleGeometry=new THREE.BoxGeometry(.065,.065,.065);this.particleMaterials={blood:new THREE.MeshBasicMaterial({color:'#9f3e27'}),spark:new THREE.MeshBasicMaterial({color:'#ffe0a1'})};this.reset();}
  get spec(){return WEAPONS[this.weaponId];}
  get ammo(){return this.inventory.get(this.weaponId).ammo;}
  set ammo(value){this.inventory.get(this.weaponId).ammo=value;}
  get reserve(){return this.inventory.get(this.weaponId).reserve;}
  set reserve(value){this.inventory.get(this.weaponId).reserve=value;}
  reset(){this.inventory=new Map([['rifle',{ammo:30,reserve:180}]]);this.weaponId='rifle';this.player.setWeapon?.('rifle');this.cooldown=0;this.reloadLeft=0;for(const p of this.particles)this.scene.remove(p.mesh);this.particles=[];for(const t of this.tracers){this.scene.remove(t.line);t.line.geometry.dispose();t.line.material.dispose();}this.tracers=[];}
  equip(id,pickup=false){if(!WEAPONS[id])return false;if(pickup){if(!this.inventory.has(id))this.inventory.set(id,{ammo:WEAPONS[id].capacity,reserve:WEAPONS[id].capacity*4});else this.inventory.get(id).reserve=Math.min(360,this.inventory.get(id).reserve+WEAPONS[id].capacity*2);}if(!this.inventory.has(id))return false;if(id===this.weaponId)return true;this.weaponId=id;this.reloadLeft=0;this.cooldown=Math.max(this.cooldown,.2);this.player.setWeapon?.(id);return true;}
  cycle(direction=1){const ids=WEAPON_IDS.filter(id=>this.inventory.has(id));return this.equip(ids[(ids.indexOf(this.weaponId)+(direction<0?-1:1)+ids.length)%ids.length]);}
  reload(){if(this.reloadLeft>0||this.ammo===this.spec.capacity||this.reserve<=0)return false;this.reloadLeft=this.spec.reloadTime;this.sound.play('reload');return true;}
  shoot(zombies){
    if(this.cooldown>0||this.reloadLeft>0)return;
    if(this.ammo<=0){this.cooldown=.3;if(this.reserve>0)this.reload();else this.sound.play('empty');return;}
    const spec=this.spec;
    this.ammo--;this.cooldown=spec.interval;this.player.flashTime=.06;
    this.sound.play('shoot');if(this.weaponId==='shotgun')this.sound.noise?.(.25,1);if(this.weaponId==='lmg')this.sound.tone?.(85,.17,'triangle',.6,30);
    this.camera.updateMatrixWorld();this.ray.setFromCamera(new THREE.Vector2(0,0),this.camera);this.ray.far=spec.range;
    const targets=zombies.filter(z=>!z.dead).map(z=>z.mesh),surfaces=[...this.world.solids,...targets];
    const aimHit=this.ray.intersectObjects(surfaces,true)[0];
    const target=aimHit?aimHit.point:this.ray.ray.at(spec.range,new THREE.Vector3());
    const start=this.player.muzzlePosition();
    if(this.player.position){const origin=this.player.position.clone().add(new THREE.Vector3(0,1.3,0)),toMuzzle=start.clone().sub(origin),distance=toMuzzle.length();this.ray.set(origin,toMuzzle.normalize());this.ray.far=distance;const obstruction=this.ray.intersectObjects(this.world.solids,false)[0];if(obstruction)start.copy(obstruction.point).addScaledVector(toMuzzle,-.04);}
    const forward=target.clone().sub(start).normalize();
    const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize(),up=new THREE.Vector3().crossVectors(right,forward).normalize();
    for(let pellet=0;pellet<spec.pellets;pellet++){
      const direction=forward.clone();if(spec.spread){const angle=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*spec.spread;direction.addScaledVector(right,Math.cos(angle)*r).addScaledVector(up,Math.sin(angle)*r).normalize();}
      // Cast from the muzzle so nearby cover blocks every pellet.
      this.ray.set(start,direction);this.ray.far=spec.range;
      const hit=this.ray.intersectObjects(surfaces,true).find(h=>!h.object.userData.zombie?.dead);
      const end=hit?hit.point:start.clone().addScaledVector(direction,spec.range);
      if(hit){const zombie=hit.object.userData.zombie;if(zombie){if(zombie.damage(spec.damage))this.onKill(zombie);this.onHit();this.sound.play('hit');this.burst(end,'blood',spec.pellets>1?3:9);}else this.burst(end,'spark',3);}
      const geo=new THREE.BufferGeometry().setFromPoints([start,end]);const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:'#ffdc9a',transparent:true,opacity:.65}));this.scene.add(line);this.tracers.push({line,life:.055});
    }
    this.player.kick?.(spec.recoil);
  }
  burst(position,type,count){for(let i=0;i<count&&this.particles.length<200;i++){const mesh=new THREE.Mesh(this.particleGeometry,this.particleMaterials[type]);mesh.position.copy(position);this.scene.add(mesh);this.particles.push({mesh,velocity:new THREE.Vector3((Math.random()-.5)*4,Math.random()*3,(Math.random()-.5)*4),life:.3+Math.random()*.3});}}
  update(dt){this.cooldown=Math.max(0,this.cooldown-dt);if(this.reloadLeft>0){this.reloadLeft=Math.max(0,this.reloadLeft-dt);if(this.reloadLeft===0){const amount=Math.min(this.spec.capacity-this.ammo,this.reserve);this.ammo+=amount;this.reserve-=amount;}}
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;p.velocity.y-=dt*10;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.scale.setScalar(Math.max(.01,p.life*2));if(p.life<=0){this.scene.remove(p.mesh);this.particles.splice(i,1);}}
    for(let i=this.tracers.length-1;i>=0;i--){const t=this.tracers[i];t.life-=dt;if(t.life<=0){this.scene.remove(t.line);t.line.geometry.dispose();t.line.material.dispose();this.tracers.splice(i,1);}}
  }
}
