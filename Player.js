import * as THREE from 'three';
import {resolveCollision} from './World.js';
import {createHumanoid,setCharacterWeapon,poseSurvivorArms} from './Models.js';
export {createHumanoid} from './Models.js';
export const WALK_SPEED=4.8;
export const SPRINT_SPEED=WALK_SPEED*1.2;

export class Player {
  constructor(scene,camera,world){this.scene=scene;this.camera=camera;this.world=world;this.body=createHumanoid();this.mesh=new THREE.Group();this.mesh.add(this.body);this.mesh.userData.limbs=this.body.userData.limbs;scene.add(this.mesh);this.position=this.mesh.position;this.moveVelocity=new THREE.Vector3();this.reset();}
  reset(){this.aiming=false;this.aimBlend=0;this.camera.fov=58;this.camera.updateProjectionMatrix();this.position.set(0,0,8);this.yaw=0;this.pitch=.16;this.velocityY=0;this.health=100;this.speedBoost=0;this.walkPhase=0;this.runBlend=0;this.gaitBlend=0;this.shakeIntensity=0;this.shakeClock=0;this.jumpQueued=false;this.flashTime=0;this.recoil=0;this.moveVelocity.set(0,0,0);this.body.position.set(0,0,0);this.body.rotation.set(0,0,0);this.setWeapon('rifle');for(const side of [-1,1]){this.mesh.userData.limbs['legPivot'+side].rotation.set(0,0,0);this.mesh.userData.limbs['kneePivot'+side].rotation.set(0,0,0);this.mesh.userData.limbs['armPivot'+side].position.y=1.48;}this.mesh.rotation.set(0,0,0);this.camera.position.set(2.1,3.7,14.5);this.updateCamera(1);this.poseWeapon();}
  setWeapon(id){setCharacterWeapon(this.body,id);}
  kick(amount){this.recoil=Math.min(.22,this.recoil+amount);this.flashTime=.06;this.mesh.userData.limbs.flash.visible=true;}
  shake(amount){this.shakeIntensity=Math.max(this.shakeIntensity,amount);}
  setAiming(active,immediate=false){this.aiming=active;if(immediate){this.aimBlend=active?1:0;this.camera.fov=active?34:58;this.camera.updateProjectionMatrix();}}
  look(dx,dy){const sensitivity=this.aiming?.6:1;this.yaw-=dx*.0025*sensitivity;this.pitch=THREE.MathUtils.clamp(this.pitch+dy*.002*sensitivity,-.5,.85);}
  update(dt,keys){
    let x=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),z=Number(keys.has('KeyS'))-Number(keys.has('KeyW'));
    const inputLength=Math.hypot(x,z);if(inputLength){x/=inputLength;z/=inputLength;}
    const sprint=(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&inputLength>0,speed=(sprint?SPRINT_SPEED:WALK_SPEED)*(this.speedBoost>0?1.5:1);
    const desired=new THREE.Vector3((x*Math.cos(this.yaw)+z*Math.sin(this.yaw))*speed,0,(-x*Math.sin(this.yaw)+z*Math.cos(this.yaw))*speed);
    this.moveVelocity.lerp(desired,1-Math.exp(-dt*(inputLength?11:15)));
    const before=this.position.clone();this.position.addScaledVector(this.moveVelocity,dt);resolveCollision(this.position,.43,this.world.obstacles,this.world.bounds);
    const actualSpeed=Math.hypot(this.position.x-before.x,this.position.z-before.z)/Math.max(dt,.001),moving=actualSpeed>.15;
    if((this.jumpQueued||keys.has('Space'))&&this.position.y<=.001){this.velocityY=6.7;keys.delete('Space');}
    this.jumpQueued=false;this.velocityY-=19*dt;this.position.y=Math.max(0,this.position.y+this.velocityY*dt);if(this.position.y===0)this.velocityY=0;
    this.speedBoost=Math.max(0,this.speedBoost-dt);const delta=THREE.MathUtils.euclideanModulo(this.yaw-this.mesh.rotation.y+Math.PI,Math.PI*2)-Math.PI;this.mesh.rotation.y+=delta*(1-Math.exp(-dt*14));
    const l=this.mesh.userData.limbs,grounded=this.position.y===0,blend=Math.min(1,actualSpeed/WALK_SPEED);
    this.runBlend=THREE.MathUtils.lerp(this.runBlend,sprint&&moving&&grounded?1:0,1-Math.exp(-dt*7));this.gaitBlend=THREE.MathUtils.lerp(this.gaitBlend,moving&&grounded?blend:0,1-Math.exp(-dt*10));
    this.walkPhase+=dt*actualSpeed*(1.8+.12*this.runBlend);const direction=z>0?-1:1;
    for(const side of [-1,1]){const cycle=this.walkPhase+(side===1?0:Math.PI),swing=Math.sin(cycle),hip=grounded?swing*(.46+.22*this.runBlend)*this.gaitBlend*direction:-.25*side,knee=grounded?-(.08+Math.max(0,-swing)*(.65+.5*this.runBlend))*this.gaitBlend:-.5;
      const response=1-Math.exp(-dt*14);l['legPivot'+side].rotation.x=THREE.MathUtils.lerp(l['legPivot'+side].rotation.x,hip,response);l['legPivot'+side].rotation.z=THREE.MathUtils.lerp(l['legPivot'+side].rotation.z,-x*.07*this.gaitBlend,response);l['kneePivot'+side].rotation.x=THREE.MathUtils.lerp(l['kneePivot'+side].rotation.x,knee,response);l['armPivot'+side].position.y=1.48+Math.sin(cycle)*.012*this.runBlend;
    }
    const bob=Math.abs(Math.sin(this.walkPhase))*(.022+.018*this.runBlend)*this.gaitBlend;
    this.body.position.y=THREE.MathUtils.lerp(this.body.position.y,bob,1-Math.exp(-dt*12));this.body.position.x=Math.sin(this.walkPhase)*.018*this.gaitBlend;
    this.body.rotation.z=THREE.MathUtils.lerp(this.body.rotation.z,(-x*.04+Math.sin(this.walkPhase)*.025*this.runBlend)*this.gaitBlend,1-Math.exp(-dt*8));
    this.body.rotation.y=THREE.MathUtils.lerp(this.body.rotation.y,Math.sin(this.walkPhase)*.035*this.runBlend,1-Math.exp(-dt*10));
    this.recoil*=Math.exp(-dt*12);this.body.rotation.x=THREE.MathUtils.lerp(this.body.rotation.x,this.runBlend*.08-this.recoil*.35,1-Math.exp(-dt*10));
    this.flashTime=Math.max(0,this.flashTime-dt);l.flash.visible=this.flashTime>0;this.updateCamera(dt);this.poseWeapon();
  }
  poseWeapon(){
    const l=this.mesh.userData.limbs;l.gun.position.set(.43,1.31-this.runBlend*.045+Math.sin(this.walkPhase)*.009*this.gaitBlend,-.65+this.recoil*.6+this.runBlend*.035);
    this.body.updateWorldMatrix(true,false);this.camera.updateMatrixWorld();const target=this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(40).add(this.camera.position);this.body.worldToLocal(target);
    const direction=target.sub(l.gun.position).normalize();l.gun.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),direction);poseSurvivorArms(this.body);
  }
  updateCamera(dt){
    this.aimBlend=THREE.MathUtils.lerp(this.aimBlend,this.aiming?1:0,1-Math.exp(-dt*12));
    const fov=THREE.MathUtils.lerp(58,34,this.aimBlend);if(Math.abs(this.camera.fov-fov)>.001){this.camera.fov=fov;this.camera.updateProjectionMatrix();}
    const shoulderOffset=THREE.MathUtils.lerp(1.05,.85,this.aimBlend),followDistance=THREE.MathUtils.lerp(4.8,2.8,this.aimBlend);
    const aimPitch=this.pitch-this.recoil*.5;const forward=new THREE.Vector3(-Math.sin(this.yaw)*Math.cos(aimPitch),-Math.sin(aimPitch),-Math.cos(this.yaw)*Math.cos(aimPitch));
    const shoulder=new THREE.Vector3(Math.cos(this.yaw)*shoulderOffset,1.75,-Math.sin(this.yaw)*shoulderOffset).add(this.position),desired=shoulder.clone().addScaledVector(forward,-followDistance),dir=desired.clone().sub(shoulder),dist=dir.length();dir.normalize();
    const hit=new THREE.Raycaster(shoulder,dir,0,dist).intersectObjects(this.world.solids,false)[0];if(hit)desired.copy(shoulder).addScaledVector(dir,Math.max(.45,hit.distance-.3));
    this.camera.position.lerp(desired,1-Math.exp(-dt*14));this.shakeClock+=dt;this.shakeIntensity*=Math.exp(-dt*10);this.camera.position.x+=Math.sin(this.shakeClock*93)*this.shakeIntensity;this.camera.position.y+=Math.cos(this.shakeClock*117)*this.shakeIntensity*.7;this.camera.lookAt(shoulder.clone().addScaledVector(forward,40));
  }
  muzzlePosition(){this.mesh.updateMatrixWorld(true);return this.mesh.userData.limbs.muzzle.getWorldPosition(new THREE.Vector3());}
}
