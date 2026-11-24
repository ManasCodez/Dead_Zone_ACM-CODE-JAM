import * as THREE from 'three';
import {createGrenadeModel} from './GrenadeModel.js';
import {disposeModel} from './Weapons.js';
import {BlastEffect} from './BlastEffect.js';
import {GRENADE_STEP,stepGrenade} from './GrenadePhysics.js';
export const GRENADE_GRAVITY=12;
export const GRENADE_FUSE=1.6;
export function grenadePoint(start,velocity,time){return start.clone().addScaledVector(velocity,time).add(new THREE.Vector3(0,-.5*GRENADE_GRAVITY*time*time,0));}
export class Grenades {
  constructor(game){this.game=game;this.count=2;this.aiming=false;this.projectiles=[];this.explosions=[];this.ray=new THREE.Raycaster();this.pathGeometry=new THREE.BufferGeometry();this.path=new THREE.Line(this.pathGeometry,new THREE.LineDashedMaterial({color:'#ffda79',dashSize:.4,gapSize:.18,depthTest:false,transparent:true,opacity:.9}));this.path.renderOrder=10;game.scene.add(this.path);this.landing=new THREE.Mesh(new THREE.RingGeometry(.55,.7,32),new THREE.MeshBasicMaterial({color:'#ffcd69',side:THREE.DoubleSide,transparent:true,opacity:.8,depthTest:false}));this.landing.rotation.x=-Math.PI/2;this.landing.renderOrder=10;game.scene.add(this.landing);this.cancel();}
  reset(){this.cancel();this.count=2;for(const p of this.projectiles){this.game.scene.remove(p.mesh);disposeModel(p.mesh);}this.projectiles=[];for(const e of this.explosions)e.dispose();this.explosions=[];}
  begin(){if(this.count<=0){this.game.ui.toast('NO GRENADES / SEARCH BUILDINGS FOR SUPPLIES');return;}this.aiming=true;this.updatePreview();}
  cancel(){this.aiming=false;this.path.visible=false;this.landing.visible=false;}
  launchData(){const p=this.game.player;const forward=new THREE.Vector3(-Math.sin(p.yaw),0,-Math.cos(p.yaw));const origin=p.position.clone().add(new THREE.Vector3(0,1.45,0));const start=origin.clone().addScaledVector(forward,.75);const obstruction=this.segmentHit(origin,start);if(obstruction)start.copy(obstruction).addScaledVector(forward,-.16);const lift=THREE.MathUtils.clamp(.5-p.pitch*.8,.1,1.05);const velocity=forward.multiplyScalar(13*Math.cos(lift));velocity.y=13*Math.sin(lift)+2;return {start,velocity};}
  collision(a,b){const delta=b.clone().sub(a),length=delta.length();if(length>1e-6){this.ray.set(a,delta.normalize());this.ray.far=length;const hit=this.ray.intersectObjects(this.game.world.solids,false)[0];if(hit)return {point:hit.point.clone(),normal:hit.face.normal.clone().transformDirection(hit.object.matrixWorld)};}if(b.y<=.12){const t=THREE.MathUtils.clamp((a.y-.12)/(a.y-b.y||1),0,1);return {point:a.clone().lerp(b,t).setY(.12),normal:new THREE.Vector3(0,1,0)};}return null;}
  segmentHit(a,b){return this.collision(a,b)?.point||null;}
  updatePreview(){if(!this.aiming)return;const {start,velocity}=this.launchData(),state={position:start.clone(),velocity},points=[start];for(let i=1;i<=Math.round(GRENADE_FUSE/GRENADE_STEP);i++){stepGrenade(state,GRENADE_STEP,(a,b)=>this.collision(a,b));if(i%4===0)points.push(state.position.clone());}this.pathGeometry.setFromPoints(points);this.path.computeLineDistances();this.path.visible=true;this.landing.position.copy(state.position).add(new THREE.Vector3(0,.02,0));this.landing.visible=true;}
  release(){if(!this.aiming||this.game.state!=='playing')return;const data=this.launchData();this.cancel();this.count--;this.game.player.throwTime=.45;if(this.game.stats)this.game.stats.grenadesUsed++;this.game.world.alertNoise?.(data.start,40);const mesh=createGrenadeModel();mesh.position.copy(data.start);this.game.scene.add(mesh);this.projectiles.push({...data,mesh,time:0,landed:false,fuse:GRENADE_FUSE});this.game.sound.tone?.(300,.1,'triangle',.2,130);this.game.ui.toast('FRAG OUT');}
  explode(position){const g=this.game;g.world.alertNoise?.(position,70);g.sound.noise?.(.65,1);g.sound.tone?.(100,.55,'triangle',.9,24);g.combat.burst(position,'spark',40);
    for(const zombie of g.zombies){if(zombie.dead)continue;const target=zombie.position.clone().add(new THREE.Vector3(0,.65,0)),distance=target.distanceTo(position);if(distance>7)continue;const from=position.clone().add(new THREE.Vector3(0,.25,0));this.ray.set(from,target.clone().sub(from).normalize());this.ray.far=Math.max(0,from.distanceTo(target)-.2);if(this.ray.intersectObjects(g.world.solids,false).length)continue;const damage=Math.round(240*(1-distance/9));if(zombie.damage(damage))g.onKill(zombie);g.ui.hit();}
    this.explosions.push(new BlastEffect(g,position));while(this.explosions.length>6)this.explosions.shift().dispose();
  }
  update(dt){this.updatePreview();for(let i=this.projectiles.length-1;i>=0;i--){const p=this.projectiles[i];p.position||=p.mesh.position;p.accumulator=(p.accumulator||0)+dt;while(p.accumulator>=GRENADE_STEP-1e-8&&p.time<GRENADE_FUSE-1e-8){stepGrenade(p,GRENADE_STEP,(a,b)=>this.collision(a,b));p.time+=GRENADE_STEP;p.fuse=GRENADE_FUSE-p.time;p.accumulator-=GRENADE_STEP;}p.mesh.rotation.x+=dt*8;if(p.fuse<=1e-8){this.explode(p.mesh.position);this.game.scene.remove(p.mesh);disposeModel(p.mesh);this.projectiles.splice(i,1);}}
    for(let i=this.explosions.length-1;i>=0;i--){const effect=this.explosions[i];if(effect.update(dt)){effect.dispose();this.explosions.splice(i,1);}}
  }
}
