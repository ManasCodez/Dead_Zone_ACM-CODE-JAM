import * as THREE from 'three';
import {applyMaterialDetail} from './MaterialLibrary.js';
import {roundedBox,DetailBatch} from './Geometry.js';

export const WEAPONS = {
  rifle: {name:'AR–25',label:'ASSAULT RIFLE',capacity:30,damage:25,reloadTime:2,interval:.2,pellets:1,spread:0,recoil:.045,range:95,color:'#eac27c',caliber:'5.56 MM · AUTOMATIC'},
  smg: {name:'VX–9',label:'SUBMACHINE GUN',capacity:40,damage:15,reloadTime:1.6,interval:.085,pellets:1,spread:.009,recoil:.025,range:65,color:'#8fd9e9',caliber:'9 MM · RAPID FIRE'},
  shotgun: {name:'BREACH–12',label:'COMBAT SHOTGUN',capacity:8,damage:13,reloadTime:2.7,interval:.8,pellets:8,spread:.048,recoil:.12,range:32,color:'#f99b76',caliber:'12 GAUGE · 8 PELLETS'},
  lmg: {name:'M–60',label:'LIGHT MACHINE GUN',capacity:60,damage:32,reloadTime:3.5,interval:.145,pellets:1,spread:.012,recoil:.065,range:100,color:'#c2b0fa',caliber:'7.62 MM · HEAVY AUTOMATIC'},
  marksman: {name:'SENTINEL',label:'MARKSMAN RIFLE',capacity:12,damage:70,reloadTime:2.5,interval:.45,pellets:1,spread:0,recoil:.09,range:140,color:'#a5c9de',caliber:'7.62 MM · SEMI-AUTOMATIC',semi:true},
  revolver: {name:'IRON–6',label:'HEAVY REVOLVER',capacity:6,damage:65,reloadTime:2.3,interval:.48,pellets:1,spread:.005,recoil:.1,range:60,color:'#dfbc83',caliber:'.44 MAGNUM · SEMI-AUTOMATIC',semi:true}
};
export const WEAPON_IDS=Object.keys(WEAPONS);

export function createWeaponModel(id='rifle',flash=true) {
  const group=new THREE.Group(),spec=WEAPONS[id];
  const dark=new THREE.MeshStandardMaterial({color:'#45545b',metalness:.35,roughness:.53});
  const steel=new THREE.MeshStandardMaterial({color:'#9babb1',metalness:.55,roughness:.36});
  const accent=new THREE.MeshStandardMaterial({color:spec.color,roughness:.55});
  const brass=new THREE.MeshStandardMaterial({color:'#b88a50',metalness:.75,roughness:.3});
  function box(w,h,d,x,y,z,mat=dark){const m=new THREE.Mesh(roundedBox(w,h,d,2,Math.min(w,h,d)*.14),mat);m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;}
  applyMaterialDetail(dark,'metal',.18);applyMaterialDetail(steel,'metal',.12);
  const length=id==='revolver'?.3:id==='smg'?.43:id==='marksman'?1:id==='lmg'?.87:.68;
  box(.15,.18,length,0,0,0);box(.13,.12,.26,0,.025,length/2+.1);box(.1,.24,.13,0,-.17,.16);
  if(id!=='shotgun'&&id!=='revolver'){
    const magazine=box(id==='lmg'?.3:.14,id==='lmg'?.25:.21,id==='lmg'?.28:.13,0,-.19,-.05,dark);
    magazine.userData.homeY=-.19;group.userData.magazine=magazine;
  }
  box(.1,.06,length*.8,0,.12,-.06,steel);box(.035,.07,.06,0,.18,-.2,steel);
  const barrelLength=id==='lmg'?.55:id==='smg'?.2:.4;
  const tip=-length/2-barrelLength;
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,barrelLength,32),steel);barrel.rotation.x=Math.PI/2;barrel.position.set(0,.025,-length/2-barrelLength/2);group.add(barrel);
  box(.17,.12,.22,0,-.025,-length/2+.08,accent);
  if(id==='shotgun'){
    group.userData.pump=box(.12,.09,.4,0,-.06,-.43,steel);
    const shell=new THREE.Mesh(new THREE.CylinderGeometry(.038,.038,.12,12),brass);shell.rotation.x=Math.PI/2;shell.position.set(-.1,-.18,.03);shell.visible=false;group.add(shell);group.userData.shell=shell;
  }
  if(id==='lmg'){
    box(.04,.3,.04,-.13,-.18,tip+.15,steel);box(.04,.3,.04,.13,-.18,tip+.15,steel);
    const hinge=new THREE.Group();hinge.position.set(0,.16,.16);group.add(hinge);
    const cover=new THREE.Mesh(roundedBox(.27,.035,.34,2),steel);cover.position.z=-.17;cover.castShadow=true;hinge.add(cover);group.userData.feedCover=hinge;
  }
  if(id==='rifle'){box(.11,.1,.17,0,.2,.05);box(.13,.015,.06,0,.26,.05,accent);}
  if(id==='marksman'){box(.12,.09,.45,0,.24,-.05);const scope=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.4,24),dark);scope.rotation.x=Math.PI/2;scope.position.set(0,.23,-.08);group.add(scope);box(.055,.25,.05,-.15,-.16,-.8,steel);box(.055,.25,.05,.15,-.16,-.8,steel);}
  if(id==='revolver'){
    const drum=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.2,24),steel);drum.rotation.x=Math.PI/2;drum.position.set(0,0,-.08);group.add(drum);group.userData.cylinder=drum;box(.12,.2,.12,0,-.19,.2,accent);
    const speedloader=new THREE.Group();speedloader.position.set(-.3,-.12,-.08);speedloader.visible=false;group.add(speedloader);
    for(let n=0;n<6;n++){const a=n*Math.PI/3,round=new THREE.Mesh(new THREE.CylinderGeometry(.021,.021,.09,8),brass);round.rotation.x=Math.PI/2;round.position.set(Math.cos(a)*.067,Math.sin(a)*.067,0);speedloader.add(round);}group.userData.speedloader=speedloader;
  }
  if(id==='rifle'||id==='smg'||id==='lmg'||id==='marksman')group.userData.bolt=box(.045,.055,.11,.105,.08,.03,steel);
  const details=new DetailBatch();for(let i=0;i<8;i++)details.add(group,roundedBox(.16,.025,.025,2),steel,[0,.155,-length*.32+i*length*.075]);if(id==='rifle'){details.add(group,new THREE.CylinderGeometry(.06,.06,.23,32),dark,[0,.22,.05],[Math.PI/2,0,0]);details.add(group,new THREE.CircleGeometry(.044,32),accent,[0,.22,-.07],[0,Math.PI,0]);}for(const side of [-1,1])for(let i=0;i<3;i++)details.add(group,new THREE.CylinderGeometry(.012,.012,.012,16),steel,[side*.082,-.015,-.15+i*.12],[0,0,Math.PI/2]);details.finish();
  const muzzle=new THREE.Object3D();muzzle.position.set(0,.025,tip);group.add(muzzle);group.userData.muzzle=muzzle;
  if(flash){const m=new THREE.Mesh(new THREE.ConeGeometry(id==='shotgun'?.2:.1,id==='lmg'?.48:.32,6),new THREE.MeshBasicMaterial({color:'#ffe7a0',transparent:true,opacity:.8,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.z=-.16;m.visible=false;muzzle.add(m);group.userData.flash=m;}
  return group;
}
const smooth=(p,a,b)=>THREE.MathUtils.smoothstep(p,a,b);
const pulse=(p,a,b)=>{const t=THREE.MathUtils.clamp((p-a)/(b-a),0,1);return Math.sin(t*Math.PI);};
const reloadGripTarget=new THREE.Vector3();

// All coordinates are weapon-local, so the support hand follows the real moving part.
export function poseWeaponReload(group,id,progress=0,shells=1){
  const p=THREE.MathUtils.clamp(progress,0,1),data=group.userData;
  const hand=data.supportGrip||(data.supportGrip=new THREE.Vector3(-.1,-.06,-.25));
  const motion=data.reloadMotion||(data.reloadMotion={x:0,y:0,z:0,pitch:0,roll:0});
  hand.set(-.1,-.06,-.25);motion.x=motion.y=motion.z=motion.pitch=motion.roll=0;
  if(data.magazine){data.magazine.position.set(0,data.magazine.userData.homeY,-.05);data.magazine.rotation.set(0,0,0);}
  if(data.bolt)data.bolt.position.z=.03;
  if(data.pump)data.pump.position.z=-.43;
  if(data.feedCover)data.feedCover.rotation.x=0;
  if(data.shell)data.shell.visible=false;
  if(data.cylinder){data.cylinder.position.x=0;data.cylinder.rotation.set(Math.PI/2,0,0);}
  if(data.speedloader)data.speedloader.visible=false;
  if(!p)return motion;

  if(id==='shotgun'){
    const count=Math.max(1,shells),cycle=Math.min(.999,p*count%1),reach=smooth(cycle,.05,.28)*(1-smooth(cycle,.76,.98));
    motion.y=-.055;motion.pitch=.11;hand.lerp(reloadGripTarget.set(-.11,-.19,.03),reach);
    data.shell.visible=p<.999&&cycle>.12&&cycle<.89;
    data.shell.position.set(-.1,-.25+smooth(cycle,.18,.76)*.17,.03);
    data.pump.position.z=-.43+.14*pulse(p,.87,1);
  }else if(id==='revolver'){
    const open=smooth(p,.12,.34)*(1-smooth(p,.77,.96));
    motion.x=-.025;motion.y=-.09;motion.roll=-.16*open;motion.pitch=.14;
    data.cylinder.position.x=-.18*open;data.cylinder.rotation.y=open*.65+p*2.2;
    data.speedloader.visible=p>.37&&p<.78;
    data.speedloader.position.set(-.3+smooth(p,.48,.7)*.12,-.14+smooth(p,.45,.72)*.13,-.08);
    hand.lerp(reloadGripTarget.set(-.28,-.13,-.08),open);
  }else{
    const magOut=smooth(p,.12,.4)*(1-smooth(p,.58,.81)),seat=pulse(p,.62,.88);
    const amount=id==='lmg'?.28:id==='smg'?.24:.21;
    data.magazine.position.y=data.magazine.userData.homeY-magOut*amount;
    data.magazine.rotation.z=(id==='smg'?-.22:.1)*magOut;
    data.bolt.position.z=.03+.09*pulse(p,.8,.98);
    motion.y=-(id==='lmg'?.13:.09)*Math.sin(p*Math.PI);
    motion.x=id==='smg'?.04*Math.sin(p*Math.PI):0;
    motion.pitch=(id==='marksman'?.18:.11)*Math.sin(p*Math.PI);
    motion.roll=(id==='smg'?-.12:id==='lmg'?.09:.04)*Math.sin(p*Math.PI);
    hand.lerp(reloadGripTarget.set(-.11,-.22-magOut*amount,-.05),Math.max(magOut,seat));
    if(data.feedCover)data.feedCover.rotation.x=-.9*smooth(p,.08,.25)*(1-smooth(p,.77,.96));
  }
  return motion;
}
export function disposeModel(group){const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const g of o.userData.detailGeometries||[])geometries.add(g);for(const m of (Array.isArray(o.material)?o.material:[o.material]))materials.add(m);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
