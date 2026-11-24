import * as THREE from 'three';
import {roundedBox,ellipsoid,capsule,DetailBatch} from './Geometry.js';
import {materialMaps,applyMaterialDetail} from './MaterialLibrary.js';
import {createWeaponModel,disposeModel} from './Weapons.js';

// All models face -Z. Positive shoulder X rotation reaches forward.
export function createHumanoid({skin='#b49c7c',shirt='#43594e',pants='#303f38',zombie=false,type='normal',tank=false}={}) {
  if(tank)type='tank';
  const group=new THREE.Group(),limbs={},details=new DetailBatch(),lodParts=[];
  const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
  const skinMap=materialMaps('skin'),clothMap=materialMaps('cloth');
  const skinMat=mat(skin,{...skinMap,normalScale:new THREE.Vector2(.2,.2),roughness:1}),shirtMat=mat(shirt,{...clothMap,normalScale:new THREE.Vector2(.3,.3),roughness:1}),pantsMat=mat(pants,{...clothMap,normalScale:new THREE.Vector2(.25,.25),roughness:1}),dark=mat('#202d29',{roughness:.5}),bone=mat('#cfbfa0');
  function part(name,w,h,d,x,y,z,material,parent=group,round=false){
    const organic=/^(neck|jaw|nose|ear|thigh|shin|upperArm|forearm|hand|knee)/.test(name);
    function build(low){if(name.startsWith('spike'))return new THREE.ConeGeometry(w*.6,h,low?6:16).scale(1,1,d/w);if(round){const g=new THREE.SphereGeometry(1,low?10:32,low?8:24);if(name==='head'){const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),narrow=y<-.2?1+(y+.2)*.2:1;p.setX(i,p.getX(i)*narrow);}g.computeVertexNormals();}if(name==='torso'){const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);p.setX(i,p.getX(i)*(y<0?.82+y*.07:1.05));p.setZ(i,p.getZ(i)*(p.getZ(i)>0?.9:1));}g.computeVertexNormals();}return g;}if(organic)return capsule(w,h,d,low?8:24);return roundedBox(w,h,d,low?1:3,Math.min(w,h,d)*.2);}
    const high=build(false),low=build(true),m=new THREE.Mesh(high,material);m.userData.hitZone=/^(head|jaw|nose|ear|socket|eye|mouth|tooth)/.test(name)?'head':'body';m.userData.detailGeometries=[high,low];lodParts.push(m);if(round)m.scale.set(w/2,h/2,d/2);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);limbs[name]=m;return m;
  }
  const detail=(parent,geometry,material,position,rotation,scale)=>details.add(parent,geometry,material,position,rotation,scale);
  part('pelvis',.58,.25,.37,0,.82,0,pantsMat);
  part('torso',.69,.65,.4,0,1.21,0,shirtMat,group,true);
  part('neck',.2,.19,.21,0,1.59,0,skinMat);
  part('head',.4,.47,.4,0,1.85,-.015,skinMat,group,true);
  part('jaw',.29,.12,.28,0,1.69,-.09,skinMat);
  part('nose',.08,.11,.1,0,1.84,-.22,skinMat);
  for(const s of [-1,1]) {
    part('ear'+s,.08,.14,.12,s*.21,1.84,0,skinMat);
    const leg=new THREE.Group();leg.position.set(s*.18,.8,0);group.add(leg);limbs['legPivot'+s]=leg;
    part('thigh'+s,.27,.37,.3,0,-.18,0,pantsMat,leg);
    const knee=new THREE.Group();knee.position.y=-.38;leg.add(knee);limbs['kneePivot'+s]=knee;
    part('knee'+s,.26,.16,.32,0,-.01,-.025,zombie?skinMat:dark,knee);
    part('shin'+s,.23,.28,.25,0,-.19,.015,pantsMat,knee);
    part('boot'+s,.29,.19,.43,0,-.34,-.065,dark,knee);
    const arm=new THREE.Group();arm.position.set(s*.43,1.48,0);group.add(arm);limbs['armPivot'+s]=arm;
    part('shoulder'+s,.28,.23,.3,0,-.06,0,shirtMat,arm,true);
    part('upperArm'+s,.21,.32,.23,0,-.19,0,shirtMat,arm);
    const elbow=new THREE.Group();elbow.position.y=-.37;arm.add(elbow);limbs['elbowPivot'+s]=elbow;
    part('forearm'+s,.18,.3,.2,0,-.14,0,zombie?skinMat:shirtMat,elbow);
    const hand=part('hand'+s,.19,.17,.21,0,-.35,0,zombie?skinMat:dark,elbow);
    for(let finger=0;finger<4;finger++){const fx=(finger-1.5)*.043,length=.09+(finger===1||finger===2?.025:0);detail(hand,capsule(.038,length,.04,16),zombie?skinMat:dark,[fx,-.1,-.015],[.25,0,(finger-1.5)*.035]);detail(hand,capsule(.031,.065,.035,16),zombie?skinMat:dark,[fx,-.16,-.035],[.7,0,0]);if(zombie)detail(hand,new THREE.ConeGeometry(.014,.05,12),bone,[fx,-.205,-.055],[Math.PI,0,0]);else detail(hand,ellipsoid(.042,.027,.04,16),shirtMat,[fx,-.02,-.096]);}
    detail(hand,capsule(.047,.1,.05,16),zombie?skinMat:dark,[s*.1,-.025,-.02],[0,0,s*.65]);
    if(zombie){arm.rotation.x=1.22;elbow.rotation.x=.12;}
    else {arm.rotation.x=s===1?.63:.9;arm.rotation.z=s===1?-.08:-.25;elbow.rotation.x=s===1?1.05:1.15;}
  }
  if(zombie){
    const eyes=mat(type==='crawler'?'#bafc97':'#ffb367',{emissive:type==='crawler'?'#72ed67':'#ff592f',emissiveIntensity:1.1});
    for(const s of [-1,1]){part('socket'+s,.13,.12,.04,s*.105,1.88,-.193,dark,group,true);part('eye'+s,.045,.038,.035,s*.105,1.89,-.22,eyes,group,true);}
    part('mouth',.22,.08,.035,0,1.73,-.235,dark);for(let i=-1;i<=1;i++)part('tooth'+i,.035,.045,.035,i*.065,1.75,-.26,bone);
    const wound=mat('#7d3930');part('wound',.19,.26,.035,-.16,1.25,-.205,wound);part('rib',.21,.045,.035,-.15,1.3,-.23,bone);
    limbs.head.rotation.z=.13;
    if(type==='runner'||type==='stalker'){group.scale.set(type==='stalker'?.65:.78,1.08,.8);part('hood',.43,.2,.42,0,2.02,.02,shirtMat);part('strap',.07,.62,.05,.17,1.22,-.22,dark);}
    if(type==='screamer'){group.scale.set(.78,1.23,.8);part('throat',.27,.38,.26,0,1.58,-.16,mat('#dc926e',{emissive:'#a34935',emissiveIntensity:.5}),group,true);limbs.head.rotation.x=-.2;}
    if(type==='brute'||type==='alpha'){group.scale.set(type==='alpha'?1.85:1.7,type==='alpha'?1.8:1.6,1.5);for(const side of [-1,1]){part('growthShoulder'+side,.55,.5,.5,side*.45,1.48,0,skinMat,group,true);part('spike'+side,.18,.5,.2,side*.52,1.8,0,bone);}part('sternum',.38,.64,.17,0,1.2,-.26,bone,group,true);}
    if(type==='riot'){group.scale.set(1.12,1.12,1);part('shield',.88,1.15,.12,-.3,1.02,-.52,dark);part('visor',.4,.15,.07,0,1.9,-.24,mat('#749d9b',{metalness:.7}));part('helmet',.48,.27,.48,0,2,0,dark);}
    if(type==='spitter'||type==='exploder'){group.scale.set(type==='exploder'?1.3:.87,type==='exploder'?1.05:1.13,1.1);const toxic=mat(type==='exploder'?'#ed9956':'#afcf63',{emissive:type==='exploder'?'#b04a20':'#5d9b24',emissiveIntensity:.75});for(const side of [-1,1])part('sac'+side,.38,.55,.42,side*.28,1.2,.27,toxic,group,true);if(type==='spitter')part('jawSac',.35,.27,.34,0,1.65,-.18,toxic,group,true);}
    if(type==='tank'){
      group.scale.set(1.5,1.42,1.35);part('chestArmor',.74,.43,.18,0,1.28,-.22,dark);part('helmet',.47,.26,.47,0,2,0,dark);
      for(const s of [-1,1])part('pauldron'+s,.38,.27,.42,s*.46,1.5,0,dark);
      part('visor',.38,.055,.04,0,1.92,-.25,eyes);
    }
    if(type==='crawler'){
      group.scale.set(1.08,.55,1.32);limbs.torso.rotation.x=.3;
      for(const [name,part] of Object.entries(limbs))if(/^(head|jaw|nose|ear|socket|eye|mouth|tooth)/.test(name))part.position.z-=.15;
      for(const s of [-1,1]){limbs['armPivot'+s].position.z=-.12;limbs['forearm'+s].scale.y=1.4;limbs['hand'+s].position.y=-.44;}
    }
    if(type==='bloater'){
      group.scale.set(1.27,1.08,1.22);limbs.torso.scale.set(.63,.59,.43);limbs.torso.position.y=1.13;
      part('belly',1.1,.96,.88,0,1.06,-.08,skinMat,group,true);part('belt',.91,.09,.63,0,.77,0,dark);
      const toxic=mat('#a6bd54',{emissive:'#6c8424',emissiveIntensity:.5});for(const [x,y,z] of [[-.3,1.3,-.45],[.27,1.13,-.48],[.16,.96,-.51]])part('growth'+x,.18,.19,.16,x,y,z,toxic,group,true);
    }
  }else {
    part('vest',.7,.54,.17,0,1.23,-.24,mat('#293d35'));part('backpack',.54,.58,.31,0,1.22,.32,mat('#696e4f'));
    part('packPocket',.35,.24,.13,0,1.1,.52,mat('#4a5541'));part('belt',.64,.09,.44,0,.87,0,dark);
    for(const s of [-1,1]){part('pouch'+s,.17,.23,.13,s*.2,1.13,-.37,mat('#6b7452'));part('packStrap'+s,.075,.63,.045,s*.22,1.25,-.34,dark);}
    part('helmet',.47,.24,.47,0,2.02,0,mat('#4b604b'),group,true);part('helmetRim',.49,.06,.5,0,1.96,-.02,dark);
    part('goggles',.35,.11,.06,0,1.9,-.22,dark);part('lens',.29,.065,.035,0,1.91,-.26,mat('#96b9b0',{metalness:.65,roughness:.18}));
    part('mask',.29,.15,.1,0,1.75,-.21,mat('#58604e'));part('scarf',.36,.12,.39,0,1.6,0,mat('#9a8965'));
    part('antenna',.025,.48,.025,.23,1.75,.37,dark);
    setCharacterWeapon(group,'rifle',limbs);
  }
  const metal=mat('#657971',{metalness:.65,roughness:.33}),seam=mat(zombie?'#4e5041':'#a39b76',{roughness:.8});
  if(!zombie){
    for(const side of [-1,1]){
      const leg=limbs['legPivot'+side],knee=limbs['kneePivot'+side],arm=limbs['armPivot'+side];
      detail(knee,roundedBox(.18,.2,.07),dark,[0,-.01,-.19]);
      for(let n=0;n<4;n++)detail(knee,roundedBox(.18,.016,.028,2),metal,[0,-.34+n*.035,-.26]);
      detail(arm,ellipsoid(.22,.19,.15),dark,[0,-.065,-.11]);
      detail(group,roundedBox(.09,.55,.055),seam,[side*.24,1.25,.49],[0,0,side*.08]);
      for(let n=0;n<3;n++)detail(group,roundedBox(.14,.18,.075),dark,[side*.2,1.04+n*.1,-.39]);
      detail(group,roundedBox(.11,.07,.045),metal,[side*.22,1.48,-.34]);
    }
    const helmet=limbs.helmet;detail(helmet,new THREE.TorusGeometry(.82,.035,10,48),dark,[0,-.3,0],[Math.PI/2,0,0],[1,.96,1]);
    detail(group,roundedBox(.13,.07,.15),metal,[.13,2.06,-.13]);
    detail(group,ellipsoid(.12,.19,.07),dark,[-.25,1.88,.02]);
    const radioCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.25,1.88,.06),new THREE.Vector3(-.3,1.75,-.02),new THREE.Vector3(-.15,1.72,-.27)]);detail(group,new THREE.TubeGeometry(radioCurve,20,.011,8,false),dark);
    for(const side of [-1,1]){const strap=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.23,1.47,.36),new THREE.Vector3(side*.3,1.55,.02),new THREE.Vector3(side*.24,1.38,-.31)]);detail(group,new THREE.TubeGeometry(strap,24,.025,8,false),seam);}
    for(let i=0;i<5;i++)detail(group,roundedBox(.36,.014,.022,2),seam,[0,1.02+i*.08,.555]);
    detail(group,roundedBox(.13,.32,.12),dark,[.33,1.25,.34]);
    detail(group,new THREE.CylinderGeometry(.016,.016,.47,16),metal,[.33,1.64,.34]);
  }else{
    const face=new THREE.Group();if(type==='crawler')face.position.z=-.15;group.add(face);
    // Sculpted brow, cheeks, lips and exposed teeth, with an asymmetric damaged face.
    for(const side of [-1,1]){
      detail(face,ellipsoid(.14,.06,.065,24),skinMat,[side*.105,1.94,-.2],[0,0,side*.13]);
      detail(face,ellipsoid(.11,.11,.06,24),skinMat,[side*.14,1.79,-.18]);
      detail(face,new THREE.TorusGeometry(.045,.008,8,24),bone,[side*.105,1.89,-.227]);
      detail(face,new THREE.SphereGeometry(.015,16,12),dark,[side*.105,1.89,-.244]);
      for(let n=0;n<3;n++)detail(group,capsule(.025,.08,.045,16),bone,[side*(.09+n*.04),1.09+n*.08,-.205],[0,0,side*.85]);
    }
    const scar=mat('#733f35',{roughness:.62});const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.16,1.98,-.12),new THREE.Vector3(-.12,1.9,-.22),new THREE.Vector3(-.06,1.82,-.22)]);detail(face,new THREE.TubeGeometry(curve,18,.008,8,false),scar);
    detail(face,ellipsoid(.19,.03,.025,24),scar,[0,1.705,-.235]);
    for(let n=0;n<6;n++)detail(face,capsule(.018,.04,.024,12),bone,[(n-2.5)*.032,1.742,-.258]);
    for(const side of [-1,1])for(let n=0;n<3;n++)detail(limbs['legPivot'+side],new THREE.ConeGeometry(.035,.11,12),shirtMat,[side*.08,-.24-n*.06,-.11],[0,0,side*.8]);
    if(type==='tank'){for(const side of [-1,1]){detail(group,ellipsoid(.4,.29,.39),metal,[side*.46,1.5,0]);for(let n=0;n<4;n++)detail(group,new THREE.CylinderGeometry(.018,.018,.04,12),metal,[side*.29,1.12+n*.1,-.33],[Math.PI/2,0,0]);}detail(group,roundedBox(.5,.1,.035),metal,[0,1.01,-.3]);}
    if(type==='bloater'){for(let n=0;n<10;n++){const a=n*2.399,x=Math.sin(a)*.36,y=.88+(n%4)*.12,z=-.38-Math.cos(a)*.04;detail(group,ellipsoid(.08+(n%3)*.025,.1,.07,20),skinMat,[x,y,z]);}const vein=mat('#667346');for(const side of [-1,1]){const points=[new THREE.Vector3(side*.3,.9,-.4),new THREE.Vector3(side*.18,1.12,-.51),new THREE.Vector3(side*.31,1.36,-.35)];detail(group,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),20,.012,8,false),vein);}}
    if(type==='crawler'){for(const side of [-1,1])detail(group,ellipsoid(.24,.17,.25),skinMat,[side*.32,1.5,.08]);}
  }

  // Layered tailoring and anatomical transitions; no collision or reach changes.
  for(const side of [-1,1]){
    const leg=limbs['legPivot'+side],knee=limbs['kneePivot'+side];
    detail(leg,ellipsoid(.29,.14,.31,20),pantsMat,[0,-.07,0]);
    for(let fold=0;fold<2;fold++)detail(leg,ellipsoid(.27,.035,.29,16),pantsMat,[0,-.2-fold*.085,-.01],[0,0,side*.09]);
    detail(knee,roundedBox(.3,.035,.43,2),dark,[0,-.435,-.065]);
    if(!zombie){
      detail(leg,roundedBox(.035,.16,.14,2),shirtMat,[side*.145,-.15,.03]);
      detail(group,ellipsoid(.1,.16,.25,20),shirtMat,[side*.33,1.43,.02]);
      detail(group,roundedBox(.075,.035,.06,2),metal,[side*.24,1.05,.57]);
    }else{
      detail(group,ellipsoid(.12,.23,.15,20),skinMat,[side*.16,1.5,-.08],[0,0,side*.2]);
      detail(group,ellipsoid(.16,.035,.13,16),skinMat,[side*.17,1.53,-.15],[0,0,-side*.2]);
      detail(limbs['elbowPivot'+side],capsule(.06,.24,.065,16),bone,[side*.035,-.13,-.07],[0,0,side*.1]);
    }
  }
  if(!zombie){
    applyMaterialDetail(limbs.backpack.material,'cloth',.35);applyMaterialDetail(limbs.vest.material,'cloth',.25);
    detail(group,new THREE.CylinderGeometry(.13,.13,.63,24),shirtMat,[0,.87,.37],[0,0,Math.PI/2]);
    for(const side of [-1,1])detail(group,roundedBox(.045,.26,.28,2),dark,[side*.21,.87,.37]);
    detail(group,roundedBox(.3,.13,.012,2),seam,[0,1.43,.484]);
    for(let n=0;n<3;n++)detail(group,roundedBox(.04,.06,.02,1),dark,[-.09+n*.09,1.43,.497]);
  }else{
    if(type==='normal'){detail(group,roundedBox(.07,.4,.04,2),dark,[.08,1.26,-.22],[0,0,-.2]);detail(group,roundedBox(.17,.12,.04,2),pantsMat,[-.19,1.35,-.21]);}
    if(type==='runner'||type==='stalker'){for(const side of [-1,1])detail(limbs['armPivot'+side],ellipsoid(.16,.31,.18,20),skinMat,[0,-.25,0]);}
    if(type==='screamer'){for(let n=0;n<5;n++)detail(group,new THREE.TorusGeometry(.12,.014,6,16),skinMat,[0,1.42+n*.06,-.15],[Math.PI/2,0,0]);}
    if(type==='riot'){for(const side of [-1,1])detail(group,roundedBox(.04,1.12,.035,2),metal,[-.3+side*.43,1.02,-.59]);detail(group,roundedBox(.65,.16,.015,2),seam,[-.3,1.3,-.589]);}
    if(type==='brute'||type==='alpha'){for(let n=0;n<(type==='alpha'?7:3);n++){const y=.94+n*.13;detail(group,new THREE.ConeGeometry(.07,.23+n*.02,12),bone,[.03,y,.28],[.8,0,.15]);}for(const side of [-1,1])detail(limbs['armPivot'+side],ellipsoid(.3,.37,.31,24),skinMat,[0,-.18,0]);}
    if(['spitter','exploder','bloater','alpha'].includes(type)){for(let n=0;n<5;n++){const p=new THREE.Vector3(Math.sin(n*2.4)*.26,1+n*.09,.25);detail(group,ellipsoid(.09,.16,.13,16),bone,p.toArray(),[0,0,n*.3]);}}
  }
  group.userData.detailMeshes=details.finish();group.userData.lodParts=lodParts;
  group.userData.limbs=limbs;return group;
}
export function setCharacterWeapon(group,id,limbs=group.userData.limbs){if(limbs.gun){group.remove(limbs.gun);disposeModel(limbs.gun);}const gun=createWeaponModel(id);gun.position.set(.43,1.31,-.65);gun.scale.setScalar(1.2);group.add(gun);limbs.gun=gun;limbs.flash=gun.userData.flash;limbs.muzzle=gun.userData.muzzle;poseSurvivorArms(group,limbs);}

// Two-bone arm placement keeps both hands on the weapon as it pitches and recoils.
export function poseSurvivorArms(group,limbs=group.userData.limbs){
  const down=new THREE.Vector3(0,-1,0);
  for(const side of [-1,1]){
    const arm=limbs['armPivot'+side],forearm=limbs['elbowPivot'+side];arm.rotation.set(0,0,0);forearm.rotation.set(0,0,0);
    const point=side===1?new THREE.Vector3(0,-.14,.18):(limbs.gun.userData.supportGrip?.clone()||new THREE.Vector3(-.1,-.06,-.25));const grip=point.multiply(limbs.gun.scale).applyQuaternion(limbs.gun.quaternion).add(limbs.gun.position).sub(arm.position);
    const direction=grip.clone().normalize(),bend=new THREE.Vector3(side*.4,-1,.15);bend.addScaledVector(direction,-bend.dot(direction)).normalize();
    const elbow=grip.clone().multiplyScalar(.5).addScaledVector(bend,Math.sqrt(Math.max(.0064,.46*.46-grip.lengthSq()/4)));
    const upper=limbs['upperArm'+side];upper.position.copy(elbow).multiplyScalar(.5);upper.scale.y=elbow.length()/.32;upper.quaternion.setFromUnitVectors(down,elbow.clone().normalize());
    forearm.position.copy(elbow);const lowerDirection=grip.clone().sub(elbow),lower=limbs['forearm'+side];lower.position.copy(lowerDirection).multiplyScalar(.5);lower.scale.y=lowerDirection.length()/.3;lower.quaternion.setFromUnitVectors(down,lowerDirection.clone().normalize());
    limbs['hand'+side].position.copy(lowerDirection);limbs['hand'+side].rotation.x=Math.PI/2;
  }
}

export function setCharacterDetail(group,low){if(group.userData.lowDetail===low)return;group.userData.lowDetail=low;for(const mesh of group.userData.lodParts||[])mesh.geometry=mesh.userData.detailGeometries[low?1:0];for(const mesh of group.userData.detailMeshes||[]){mesh.visible=!low;mesh.layers.set(low?1:0);}}
