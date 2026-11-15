import * as THREE from 'three';
import {createHumanoid,setCharacterDetail} from './Models.js';
import {disposeModel} from './Weapons.js';
import {resolveCollision} from './World.js';
export const ZOMBIE_TYPES={normal:{hp:75,speed:1.65,damage:9,color:'#5e6a52',shirt:'#656657'},runner:{hp:50,speed:3.5,damage:12,color:'#9d9173',shirt:'#814e3d'},tank:{hp:225,speed:1.05,damage:22,color:'#89906a',shirt:'#424e43'},crawler:{hp:40,speed:2.65,damage:7,color:'#8eaa78',shirt:'#57594b'},bloater:{hp:150,speed:1.35,damage:16,color:'#a49b67',shirt:'#655943'}};
export class Zombie {
  constructor(scene,type,position,wave){this.scene=scene;this.type=type;this.stats=ZOMBIE_TYPES[type];this.health=this.stats.hp;this.speed=this.stats.speed*(1+Math.min(.65,(wave-1)*.035));this.mesh=createHumanoid({skin:this.stats.color,shirt:this.stats.shirt,zombie:true,type});this.mesh.position.copy(position);this.radius=type==='tank'?.7:type==='bloater'?.67:.42;this.mesh.traverse(o=>{if(o.isMesh)o.userData.zombie=this;});scene.add(this.mesh);this.attackCooldown=.7;this.phase=Math.random()*6.28;this.dead=false;this.deathTime=0;this.flash=0;this.steerSide=Math.random()<.5?-1:1;}
  get position(){return this.mesh.position;}
  update(dt,player,world,others,onAttack){
    if(this.dead){this.deathTime+=dt;this.mesh.rotation.z=THREE.MathUtils.lerp(this.mesh.rotation.z,Math.PI/2,Math.min(1,dt*5));this.mesh.position.y-=dt*.4;return this.deathTime>1.4;}
    const distanceSquared=this.position.distanceToSquared(player.position);setCharacterDetail(this.mesh,distanceSquared>32*32?true:distanceSquared<26*26?false:Boolean(this.mesh.userData.lowDetail));
    this.attackCooldown-=dt;this.phase+=dt*this.speed*4;this.flash=Math.max(0,this.flash-dt);
    let dx=player.position.x-this.position.x,dz=player.position.z-this.position.z;const distance=Math.hypot(dx,dz);
    this.mesh.rotation.y=Math.atan2(-dx,-dz);
    const reach=this.type==='tank'?1.8:this.type==='crawler'?1.15:1.35;
    if(distance>reach*.8){
      dx/=distance||1;dz/=distance||1;
      // Feel ahead and steer along obstacles rather than repeatedly pushing into a wall.
      for(const o of world.obstacles){const px=this.position.x+dx*1.65,pz=this.position.z+dz*1.65;if(px>o.minX-this.radius&&px<o.maxX+this.radius&&pz>o.minZ-this.radius&&pz<o.maxZ+this.radius){const tx=-dz*this.steerSide,tz=dx*this.steerSide;dx=dx*.15+tx;dz=dz*.15+tz;break;}}
      for(const other of others){if(other===this||other.dead)continue;const sx=this.position.x-other.position.x,sz=this.position.z-other.position.z,d2=sx*sx+sz*sz;if(d2>0&&d2<1.7){dx+=sx*.7/(d2+.1);dz+=sz*.7/(d2+.1);}}
      const len=Math.hypot(dx,dz)||1;this.position.x+=dx/len*this.speed*dt;this.position.z+=dz/len*this.speed*dt;resolveCollision(this.position,this.radius,world.obstacles,world.bounds);
    }
    if(distance<reach&&player.position.y<1.1&&this.attackCooldown<=0){onAttack(this.stats.damage);this.attackCooldown=this.type==='runner'?.85:1.25;}
    const limbs=this.mesh.userData.limbs;
    for(const s of [-1,1]){limbs['legPivot'+s].rotation.x=Math.sin(this.phase)*.45*s;limbs['armPivot'+s].rotation.x=(this.type==='crawler'?1.65:1.22)+Math.sin(this.phase+s)*.12+(this.attackCooldown>.9?.35:0);limbs['elbowPivot'+s].rotation.x=.15+Math.sin(this.phase+s)*.13;}
    this.mesh.rotation.z=Math.sin(this.phase*.5)*.035;
    return false;
  }
  damage(amount){if(this.dead)return false;this.health-=amount;this.flash=.12;this.mesh.userData.limbs.torso.material.emissive.set('#b53c1e');this.mesh.userData.limbs.torso.material.emissiveIntensity=.8;if(this.health<=0){this.dead=true;return true;}return false;}
  dispose(){this.scene.remove(this.mesh);disposeModel(this.mesh);}
}
