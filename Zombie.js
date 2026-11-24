import * as THREE from 'three';
import {createHumanoid,setCharacterDetail} from './Models.js';
import {disposeModel} from './Weapons.js';
import {resolveCollision} from './World.js';
export const ZOMBIE_TYPES={
  normal:{hp:75,speed:1.65,damage:9,color:'#5e6a52',shirt:'#656657'},
  runner:{hp:50,speed:3.5,damage:12,color:'#9d9173',shirt:'#814e3d'},
  tank:{hp:225,speed:1.05,damage:22,color:'#89906a',shirt:'#424e43'},
  crawler:{hp:40,speed:2.65,damage:7,color:'#8eaa78',shirt:'#57594b'},
  bloater:{hp:150,speed:1.35,damage:16,color:'#a49b67',shirt:'#655943'},
  screamer:{hp:60,speed:1.5,damage:6,color:'#a29a7a',shirt:'#55435c'},
  brute:{hp:330,speed:1.15,damage:28,color:'#7f8773',shirt:'#504b40'},
  spitter:{hp:85,speed:1.7,damage:8,color:'#a1ad62',shirt:'#4c6253'},
  stalker:{hp:65,speed:3.1,damage:15,color:'#6c7f7f',shirt:'#273c40'},
  riot:{hp:150,speed:1.35,damage:18,color:'#8e9983',shirt:'#314551'},
  exploder:{hp:90,speed:2,damage:32,color:'#b49c68',shirt:'#7c5340'},
  alpha:{hp:1100,speed:1.5,damage:32,color:'#8d8374',shirt:'#433c35'}
};
export class Zombie {
  constructor(scene,type,position,wave=1){this.scene=scene;this.type=type;this.stats=ZOMBIE_TYPES[type]||ZOMBIE_TYPES.normal;this.health=this.stats.hp;this.maxHealth=this.health;this.speed=this.stats.speed*(1+Math.min(.65,(wave-1)*.035));const color=new THREE.Color(this.stats.color).offsetHSL((Math.random()-.5)*.035,0,(Math.random()-.5)*.06),shirt=new THREE.Color(this.stats.shirt).offsetHSL((Math.random()-.5)*.1,0,(Math.random()-.5)*.09);this.mesh=createHumanoid({skin:color,shirt,zombie:true,type});this.mesh.position.copy(position);this.radius=['tank','brute','alpha'].includes(type)?.7:type==='bloater'?.67:.42;this.mesh.traverse(o=>{if(o.isMesh)o.userData.zombie=this;});scene.add(this.mesh);this.attackCooldown=.7;this.phase=Math.random()*6.28;this.dead=false;this.deathTime=0;this.flash=0;this.state='idle';this.alertTime=0;this.staggerTime=0;this.windup=0;this.specialCooldown=2+Math.random()*3;this.reaction=new THREE.Vector3();this.steerSide=Math.random()<.5?-1:1;}
  get position(){return this.mesh.position;}
  update(dt,player,world,others,onAttack){
    this.reducedFlash=Boolean(player.settings?.reducedFlash);if(this.dead){this.state='dead';this.deathTime+=dt;this.mesh.rotation.z=THREE.MathUtils.lerp(this.mesh.rotation.z,Math.PI/2,Math.min(1,dt*5));this.mesh.position.y=Math.sin(this.mesh.rotation.z)*.25;const l=this.mesh.userData.limbs;for(const side of [-1,1]){l['kneePivot'+side].rotation.x=THREE.MathUtils.lerp(l['kneePivot'+side].rotation.x,-.7,Math.min(1,dt*7));l['armPivot'+side].rotation.x=THREE.MathUtils.lerp(l['armPivot'+side].rotation.x,.3,Math.min(1,dt*6));}return this.deathTime>1.4;}
    const distance=this.position.distanceTo(player.position),lod=player.detailDistance||32;setCharacterDetail(this.mesh,distance>lod?true:distance<lod-6?false:Boolean(this.mesh.userData.lowDetail));this.attackCooldown-=dt;this.specialCooldown-=dt;this.flash=Math.max(0,this.flash-dt);this.staggerTime=Math.max(0,this.staggerTime-dt);
    const sight=distance<24&&(!world.enemyNavigation||world.enemyNavigation.visible(this.position,player.position)),noise=world.lastNoise&&Math.hypot(this.position.x-world.lastNoise.x,this.position.z-world.lastNoise.z)<world.lastNoise.radius;
    if(sight||distance<6||noise)this.alertTime=9;else this.alertTime=Math.max(0,this.alertTime-dt);
    if(this.staggerTime>0){this.state='stagger';this.position.addScaledVector(this.reaction,dt);resolveCollision(this.position,this.radius,world.obstacles||[],world.bounds);return false;}
    if(this.alertTime===0){this.state='idle';return false;}this.soundCooldown=(this.soundCooldown||0)-dt;if(this.soundCooldown<=0){this.soundCooldown=3+Math.random()*4;world.enemySound?.(this.type,this.position);}
    let dx=player.position.x-this.position.x,dz=player.position.z-this.position.z;this.mesh.rotation.y=Math.atan2(-dx,-dz);this.state=sight?'chase':noise?'investigate':'search';
    const reach=['tank','brute','alpha'].includes(this.type)?2:this.type==='crawler'?1.15:1.35;
    if(this.type==='alpha'){const ratio=this.health/this.maxHealth;this.bossPhase=ratio<.35?3:ratio<.7?2:1;if(this.bossPhase>(this.lastBossPhase||1)){this.lastBossPhase=this.bossPhase;this.mesh.userData.limbs.sternum?.material.color.set(this.bossPhase===3?'#b96a4e':'#c29c79');world.spawnBossAdds?.(this.position,this.bossPhase);}}
    if(this.type==='screamer'&&this.specialCooldown<=0&&distance<22){this.specialCooldown=7;world.alertNoise?.(this.position,38);for(const z of (world.crowd?.nearby(this.position,12)||others))if(!z.dead&&z.position.distanceTo(this.position)<12){z.enraged=4;z.alertTime=9;}world.enemySound?.('scream',this.position);}
    if((this.type==='spitter'||this.type==='alpha')&&this.specialCooldown<=0&&distance>5&&distance<22&&sight){this.specialCooldown=this.type==='alpha'?3:4.5;world.hazards?.spit(this.position,player.position,this.stats.damage);this.state='attack';}
    if(this.type==='exploder'&&distance<3.5&&this.specialCooldown<=0){this.state='attack';this.explodeTimer=(this.explodeTimer||0)+dt;this.mesh.userData.limbs.torso.material.emissive.set('#ff7a32');this.mesh.userData.limbs.torso.material.emissiveIntensity=this.reducedFlash?.12:.3+this.explodeTimer*.4;if(this.explodeTimer>.85){this.dead=true;world.onEnemySuicide?.(this);return false;}}
    else if(distance>reach*.85){const direction=world.enemyNavigation?.direction(this.position,player.position)||{x:dx,z:dz};dx=direction.x;dz=direction.z;let len=Math.hypot(dx,dz)||1;dx/=len;dz/=len;
      if((this.type==='runner'||this.type==='stalker')&&distance>4&&distance<14&&sight){const flank=.45*this.steerSide,tx=dx;dx+=-dz*flank;dz+=tx*flank;this.state='flank';}
      for(const other of (world.crowd?.nearby(this.position,3)||others)){if(other===this||other.dead)continue;const sx=this.position.x-other.position.x,sz=this.position.z-other.position.z,d2=sx*sx+sz*sz,separation=this.radius+other.radius+.2;if(d2>0&&d2<separation*separation){dx+=sx*.6/(d2+.1);dz+=sz*.6/(d2+.1);}}
      len=Math.hypot(dx,dz)||1;this.enraged=Math.max(0,(this.enraged||0)-dt);const speed=this.speed*(this.enraged>0?1.25:1)*(this.bossPhase===3?1.3:1)*(this.type==='spitter'&&distance<8?-.5:1);const before=this.position.clone();this.position.x+=dx/len*speed*dt;this.position.z+=dz/len*speed*dt;resolveCollision(this.position,this.radius,world.obstacles||[],world.bounds);this.phase+=before.distanceTo(this.position)*(this.type==='crawler'?5:this.type==='runner'||this.type==='stalker'?3.6:3);
    }
    if(this.windup>0){this.state='attack';this.windup-=dt;if(this.windup<=0){if(distance<reach+.35&&player.position.y<1.1&&(!world.enemyNavigation||world.enemyNavigation.visible(this.position,player.position)))onAttack(this.stats.damage,this.position);this.attackCooldown=this.type==='runner'?.85:1.25;this.followThrough=.2;}}
    else if(distance<reach&&player.position.y<1.1&&this.attackCooldown<=0)this.windup=['brute','alpha'].includes(this.type)?.65:.28;
    this.followThrough=Math.max(0,(this.followThrough||0)-dt);const limbs=this.mesh.userData.limbs;for(const s of [-1,1]){limbs['legPivot'+s].rotation.x=Math.sin(this.phase)*.45*s;limbs['kneePivot'+s].rotation.x=-Math.max(0,-Math.sin(this.phase+s))*.45;limbs['armPivot'+s].rotation.x=(this.type==='crawler'?1.65:1.22)+Math.sin(this.phase+s)*.12+(this.windup>0?-.28:this.followThrough>0?.42:0);limbs['elbowPivot'+s].rotation.x=.15+Math.sin(this.phase+s)*.13;}this.mesh.rotation.z=Math.sin(this.phase*.5)*(this.type==='normal'?.055:.03);this.mesh.rotation.x=['runner','stalker'].includes(this.type)?.09:this.type==='crawler'?.12:0;return false;
  }
  damage(amount,hit={}){if(this.dead)return false;this.lastArmored=false;if(hit.source&&(this.type==='riot'||this.type==='tank')){const toward=hit.source.clone().sub(this.position).normalize(),forward=new THREE.Vector3(-Math.sin(this.mesh.rotation.y),0,-Math.cos(this.mesh.rotation.y));if(toward.dot(forward)>.35){amount*=hit.critical?.7:this.type==='riot'?.2:.5;this.lastArmored=true;}}this.health-=amount;this.alertTime=9;this.flash=.12;if(amount>15){this.staggerTime=Math.min(.2,amount/500);this.reaction.copy(hit.direction||new THREE.Vector3()).multiplyScalar(.8);}this.mesh.userData.limbs.torso.material.emissive.set('#b53c1e');this.mesh.userData.limbs.torso.material.emissiveIntensity=this.reducedFlash?.12:.4;if(this.health<=0){this.dead=true;this.state='dead';return true;}return false;}
  dispose(){this.scene.remove(this.mesh);disposeModel(this.mesh);}
}
