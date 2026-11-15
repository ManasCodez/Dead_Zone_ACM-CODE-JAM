import * as THREE from 'three';
import {roundedBox,DetailBatch} from './Geometry.js';

export const WEAPONS = {
  rifle: {name:'AR–25',label:'ASSAULT RIFLE',capacity:30,damage:25,reloadTime:2,interval:.2,pellets:1,spread:0,recoil:.045,range:95,color:'#eac27c',caliber:'5.56 MM · AUTOMATIC'},
  smg: {name:'VX–9',label:'SUBMACHINE GUN',capacity:40,damage:15,reloadTime:1.6,interval:.085,pellets:1,spread:.009,recoil:.025,range:65,color:'#8fd9e9',caliber:'9 MM · RAPID FIRE'},
  shotgun: {name:'BREACH–12',label:'COMBAT SHOTGUN',capacity:8,damage:13,reloadTime:2.7,interval:.8,pellets:8,spread:.048,recoil:.12,range:32,color:'#f99b76',caliber:'12 GAUGE · 8 PELLETS'},
  lmg: {name:'M–60',label:'LIGHT MACHINE GUN',capacity:60,damage:32,reloadTime:3.5,interval:.145,pellets:1,spread:.012,recoil:.065,range:100,color:'#c2b0fa',caliber:'7.62 MM · HEAVY AUTOMATIC'}
};
export const WEAPON_IDS=Object.keys(WEAPONS);

export function createWeaponModel(id='rifle',flash=true) {
  const group=new THREE.Group(),spec=WEAPONS[id];
  const dark=new THREE.MeshStandardMaterial({color:'#26302e',metalness:.65,roughness:.38});
  const steel=new THREE.MeshStandardMaterial({color:'#66746d',metalness:.75,roughness:.32});
  const accent=new THREE.MeshStandardMaterial({color:spec.color,roughness:.55});
  function box(w,h,d,x,y,z,mat=dark){const m=new THREE.Mesh(roundedBox(w,h,d,2,Math.min(w,h,d)*.14),mat);m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;}
  const length=id==='smg'?.43:id==='lmg'?.87:.68;
  box(.15,.18,length,0,0,0);box(.13,.12,.26,0,.025,length/2+.1);box(.1,.24,.13,0,-.17,.16);
  box(.14,.21,id==='lmg'?.28:.13,0,-.19,-.05,id==='shotgun'?accent:dark);
  box(.1,.06,length*.8,0,.12,-.06,steel);box(.035,.07,.06,0,.18,-.2,steel);
  const barrelLength=id==='lmg'?.55:id==='smg'?.2:.4;
  const tip=-length/2-barrelLength;
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,barrelLength,32),steel);barrel.rotation.x=Math.PI/2;barrel.position.set(0,.025,-length/2-barrelLength/2);group.add(barrel);
  box(.17,.12,.22,0,-.025,-length/2+.08,accent);
  if(id==='shotgun')box(.08,.07,.55,0,-.06,-.48,steel);
  if(id==='lmg'){box(.3,.25,.26,.07,-.17,-.03);box(.04,.3,.04,-.13,-.18,tip+.15,steel);box(.04,.3,.04,.13,-.18,tip+.15,steel);}
  if(id==='rifle'){box(.11,.1,.17,0,.2,.05);box(.13,.015,.06,0,.26,.05,accent);}
  const details=new DetailBatch();for(let i=0;i<8;i++)details.add(group,roundedBox(.16,.025,.025,2),steel,[0,.155,-length*.32+i*length*.075]);if(id==='rifle'){details.add(group,new THREE.CylinderGeometry(.06,.06,.23,32),dark,[0,.22,.05],[Math.PI/2,0,0]);details.add(group,new THREE.CircleGeometry(.044,32),accent,[0,.22,-.07],[0,Math.PI,0]);}for(const side of [-1,1])for(let i=0;i<3;i++)details.add(group,new THREE.CylinderGeometry(.012,.012,.012,16),steel,[side*.082,-.015,-.15+i*.12],[0,0,Math.PI/2]);details.finish();
  const muzzle=new THREE.Object3D();muzzle.position.set(0,.025,tip);group.add(muzzle);group.userData.muzzle=muzzle;
  if(flash){const m=new THREE.Mesh(new THREE.ConeGeometry(.13,.38,6),new THREE.MeshBasicMaterial({color:'#ffe7a0'}));m.rotation.x=-Math.PI/2;m.position.z=-.16;m.visible=false;muzzle.add(m);group.userData.flash=m;}
  return group;
}
export function disposeModel(group){const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const g of o.userData.detailGeometries||[])geometries.add(g);for(const m of (Array.isArray(o.material)?o.material:[o.material]))materials.add(m);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
