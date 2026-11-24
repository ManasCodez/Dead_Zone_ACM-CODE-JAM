import * as THREE from 'three';
import {DetailBatch,roundedBox,ellipsoid} from './Geometry.js';
import {applyMaterialDetail} from './MaterialLibrary.js';

function material(color,kind='metal',roughness=.8,metalness=0){return applyMaterialDetail(new THREE.MeshStandardMaterial({color,roughness,metalness}),kind,.3);}
export function createVehicle(world,x,z,color){
  // The existing collision footprint and bullet obstruction stay exactly the same.
  const collider=world.box(x,.65,z,2,1,4,color,true);collider.updateMatrixWorld(true);collider.removeFromParent();
  const root=new THREE.Group();root.position.set(x,0,z);root.name='weathered-abandoned-sedan';world.scene.add(root);
  const batch=new DetailBatch(),paint=material(color,'metal',.8,.35),steel=material('#89999e','metal',.55,.8),rubber=material('#263039','cloth',1),glass=new THREE.MeshStandardMaterial({color:'#637f8c',metalness:.25,roughness:.19,envMapIntensity:1.4}),dark=material('#343f48'),lamp=new THREE.MeshStandardMaterial({color:'#c3bca4',roughness:.35});
  const add=(geo,mat,p,r,scale)=>batch.add(root,geo,mat,p,r,scale);
  add(roundedBox(1.94,.59,4,2,.17),paint,[0,.69,0]);add(roundedBox(1.72,.18,1.25,2),paint,[0,.99,-1.2],[-.05,0,0]);
  add(roundedBox(1.67,.66,1.95,2,.18),glass,[0,1.24,.13]);add(roundedBox(1.72,.1,1.55,2),paint,[0,1.59,.24]);
  for(const side of [-1,1]){
    for(const dz of [-.64,.95])add(roundedBox(.085,.65,.1,2),paint,[side*.81,1.26,dz],[dz<0?.23:-.2,0,0]);
    add(roundedBox(.06,.58,.075,2),dark,[side*.85,1.26,.1]);add(roundedBox(.05,.04,2.3,1),steel,[side*.985,.87,.2]);add(roundedBox(.05,.05,.22,1),steel,[side*1,.9,.55]);add(roundedBox(.22,.12,.25,2),paint,[side*.98,1.18,-.57]);
    for(const dz of [-1.25,1.25]){add(new THREE.CylinderGeometry(.38,.38,.25,20),rubber,[side*.97,.43,dz],[0,0,Math.PI/2]);add(new THREE.CylinderGeometry(.23,.23,.27,16),steel,[side*.98,.43,dz],[0,0,Math.PI/2]);add(new THREE.CylinderGeometry(.08,.08,.28,12),dark,[side*.985,.43,dz],[0,0,Math.PI/2]);}
    add(roundedBox(.45,.15,.05,2),lamp,[side*.66,.85,-2]);add(roundedBox(.36,.14,.05,2),material('#823c35'),[side*.66,.85,2]);
    for(let n=0;n<3;n++)add(roundedBox(.014,.03,.42,1),steel,[side*.982,.6+n*.07,.3+n*.3],[.1,0,0]);
  }
  for(const dz of [-2.02,2.02])add(roundedBox(1.8,.13,.12,2),dark,[0,.49,dz]);add(roundedBox(.66,.16,.035,2),dark,[0,.78,-2.02]);
  for(let n=0;n<6;n++)add(roundedBox(.015,.12,.045,1),steel,[-.26+n*.1,.78,-2.045]);
  for(const mesh of batch.finish())mesh.castShadow=true;
}

export class EnvironmentArt {
  constructor(game){
    this.game=game;this.smoke=[];this.fire=[];this.rotorDust=[];this.seed=7261;
    this.m={concrete:material('#899093','concrete',1),metal:material('#64767f','metal',.75,.45),rust:material('#876452','metal',.9,.25),dark:material('#303d47'),cloth:material('#647478','cloth',1),wood:material('#87735e','wood',1),leaf:material('#596650','cloth',1)};
    this.buildDistricts();this.buildRooms();this.atmosphere();this.refineHelicopter();
  }
  random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
  buildDistricts(){
    const {world,scene}=this.game,m=this.m,warning=new THREE.MeshStandardMaterial({color:'#742326',emissive:'#e4434d',emissiveIntensity:1.7,roughness:.45});
    for(let district=0;district<6;district++){
      const center=8-district*49,root=new THREE.Group(),batch=new DetailBatch();root.name='district-environment-detail';scene.add(root);
      const add=(geo,mat,p,r,scale)=>batch.add(root,geo,mat,p,r,scale);
      for(const side of [-1,1]){
        // Sidewalk drains, service cabinets and vegetation stay outside the road.
        for(let n=0;n<3;n++){const z=center-n*12;add(roundedBox(.7,.035,1.5,1),m.dark,[side*10.2,.205,z]);for(let i=0;i<8;i++)add(new THREE.BoxGeometry(.62,.02,.045),m.metal,[side*10.2,.23,z-.6+i*.17]);}
        for(let n=0;n<10;n++){const z=center-18+this.random()*32,x=side*(12.4+this.random()*.4);for(let blade=0;blade<3;blade++)add(new THREE.PlaneGeometry(.07,.32+this.random()*.25),m.leaf,[x,.3,z],[0,blade*1.1,.25]);}
        // Exterior service equipment attached to existing skyline buildings.
        add(roundedBox(.5,1.4,1.1,2),m.metal,[side*37.8,1.3,center-8]);
        for(let n=0;n<6;n++)add(new THREE.BoxGeometry(.04,.035,.8),m.dark,[side*37.5,1+n*.1,center-8]);
        for(let n=0;n<3;n++){const h=14+this.random()*22,z=center+n*18-25,x=side*(69+this.random()*20);add(new THREE.BoxGeometry(9,h,12),m.concrete,[x,h/2,z]);add(new THREE.BoxGeometry(3,3,4),m.metal,[x,h+1.5,z]);for(let y=3;y<h-2;y+=3)for(let k=-4;k<=4;k+=3)add(new THREE.BoxGeometry(.035,1.3,1.2),m.dark,[x-side*4.51,y,z+k]);}
      }
      if(district===1||district===2){for(const side of [-1,1]){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(side*13,7,center-6),new THREE.Vector3(0,5.8,center-7),new THREE.Vector3(-side*13,7,center-6)]);add(new THREE.TubeGeometry(curve,16,.018,4,false),m.dark);}}
      if(district===3){for(const side of [-1,1]){add(new THREE.CylinderGeometry(1.1,1.1,6,16),m.rust,[side*45,25,center-6]);add(new THREE.TorusGeometry(1.15,.06,6,20),m.metal,[side*45,27,center-6],[Math.PI/2,0,0]);}world.sign('NORTHWORKS / SERVICE YARD',-32,5,-137,Math.PI/2,'#bfc6ca');}
      if(district===5){for(const side of [-1,1]){add(new THREE.BoxGeometry(1.6,.4,1.3),m.cloth,[side*23,.35,-267]);for(let n=0;n<3;n++)add(roundedBox(.8,.3,.6,2),m.cloth,[side*23+n*.5,.7,-267]);}world.sign('EVACUATION / LANDING PAD 07',12,4.6,-269,0,'#c6d4db');}
      if(district%2===0)for(const side of [-1,1]){
        const x=side*10.55,z=center-8;
        add(new THREE.CylinderGeometry(.045,.055,2.6,8),m.dark,[x,1.4,z]);
        add(new THREE.CylinderGeometry(.13,.13,.22,12),warning,[x,2.78,z]);
        const light=new THREE.PointLight('#df3b45',8,9,2);light.position.set(x,2.8,z);world.lightSources.push({light});
      }
      batch.finish();
    }
    // Selective shallow patches catch the sky without making the whole city glossy.
    const wet=new THREE.MeshStandardMaterial({color:'#596b72',roughness:.28,metalness:.2,transparent:true,opacity:.5,depthWrite:false});
    for(const [x,z,s] of [[-8,-9,1.8],[8,-76,2],[-8,-145,1.6],[8,-222,2.1]]){const mesh=new THREE.Mesh(new THREE.CircleGeometry(s,20),wet);mesh.rotation.x=-Math.PI/2;mesh.scale.y=.37;mesh.position.set(x,.07,z);scene.add(mesh);}
  }
  buildRooms(){
    const {world,districts,scene}=this.game,m=this.m,warning=new THREE.MeshStandardMaterial({color:'#78262a',emissive:'#e0454d',emissiveIntensity:1.45,roughness:.5});
    for(const room of [...world.routeRooms,...districts.rooms]){
      const {x,z,side}=room,half=room.width?5.6:4.6,root=new THREE.Group(),batch=new DetailBatch();root.position.set(x,0,z);root.name='room-storytelling';scene.add(root);
      const add=(geo,mat,p,r)=>batch.add(root,geo,mat,p,r);
      // Ceiling ribs, wall skirting, conduit and storage live against the walls.
      for(const dz of [-half,half]){add(new THREE.BoxGeometry(half*2,.16,.12),m.dark,[0,.2,dz]);add(new THREE.BoxGeometry(half*2,.12,.18),m.metal,[0,3.23,dz]);}
      for(const dz of [-2.5,2.5])add(new THREE.BoxGeometry(half*2,.1,.12),m.metal,[0,3.25,dz]);
      add(new THREE.CylinderGeometry(.035,.035,2.8,8),m.metal,[side*(half-.1),1.65,-1.8]);
      const board=new THREE.Mesh(new THREE.BoxGeometry(.045,1.1,1.7),m.wood);board.position.set(side*half,1.85,-2.8);root.add(board);
      for(let n=0;n<4;n++)add(new THREE.BoxGeometry(.03,.3,.36),m.concrete,[side*(half-.04),1.6+(n%2)*.4,-3.2+Math.floor(n/2)*.5]);
      if(room.index===0||room.id==='pharmacy'){add(roundedBox(.8,1.6,.45,2),m.concrete,[side*(half-.7),.9,-half+.6]);add(new THREE.BoxGeometry(.14,.55,.03),material('#9d5449'),[side*(half-.7),1.1,-half+.35]);add(new THREE.BoxGeometry(.45,.14,.03),material('#9d5449'),[side*(half-.7),1.1,-half+.34]);}
      else if(room.index===1||room.id==='warehouse'){for(let n=0;n<3;n++)add(roundedBox(.8,.4,.6,2),n%2?m.wood:m.cloth,[side*(half-.65),.3+n*.42,half-.6]);}
      else {add(roundedBox(.8,.65,.3,2),m.metal,[side*(half-.2),1.8,1.7]);for(let n=0;n<5;n++)add(new THREE.BoxGeometry(.04,.025,.2),m.dark,[side*(half-.62),1.6+n*.08,1.7]);}
      add(roundedBox(.6,.08,.16,2),warning,[side*(half-.2),2.9,2.4]);
      batch.finish();
      const bannerColor=room.index===0?'#accdc9':room.index===1?'#d3b18b':room.index===2?'#aec6db':'#9bbecb';
      world.sign(room.index===0?'TRIAGE / MEDICAL SUPPLIES':room.index===1?'EQUIPMENT / AUTHORIZED ACCESS':room.index===2?'RADIO / EMERGENCY FREQUENCY':'CIVIL DEFENCE / FIELD STATION',x,2.7,z-half+.05,0,bannerColor);
      const emergency=new THREE.PointLight('#cb454d',6,7,2);emergency.position.set(x+side*(half-.5),2.8,z+2.4);world.lightSources.push({light:emergency});
    }
  }
  atmosphere(){
    const size=64,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,r=Math.hypot((x-31.5)/32,(y-31.5)/32);data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.max(0,(1-r*r)**3)*180;if(r>1)data[i+3]=0;}
    this.cloud=new THREE.DataTexture(data,size,size);this.cloud.needsUpdate=true;this.cloud.magFilter=THREE.LinearFilter;
    for(const object of [...this.game.scene.children])if(object.name==='replaceable-barrel-flame'){object.geometry.dispose();object.removeFromParent();}
    for(const [x,z] of [[-13,-6],[13,11],[-13,30]])for(let n=0;n<2;n++){const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:this.cloud,color:n?'#ffd188':'#e67c38',transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending}));sprite.position.set(x,1.35+n*.12,z);sprite.scale.set(.65-n*.15,1.15-n*.35,1);this.game.scene.add(sprite);this.fire.push(sprite);}
    for(const [x,z] of [[-13,-6],[13,11],[-13,30],[-32,-132],[32,-202]])for(let n=0;n<4;n++){const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:this.cloud,color:'#7d8790',transparent:true,opacity:0,depthWrite:false}));this.game.scene.add(sprite);this.smoke.push({sprite,x,z,phase:n/4});}
    for(let n=0;n<12;n++){const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:this.cloud,color:'#a7a290',transparent:true,opacity:0,depthWrite:false}));this.game.scene.add(sprite);this.rotorDust.push(sprite);}
  }
  refineHelicopter(){
    const h=this.game.helicopter,root=h.group,batch=new DetailBatch(),m=this.m;
    root.traverse(o=>{if(!o.isMesh||!o.material.isMeshStandardMaterial)return;if(o.material.metalness>.6&&o.material.roughness<.2){o.material.color.set('#668b9a');o.material.metalness=.25;o.material.roughness=.16;o.material.envMapIntensity=1.4;}else applyMaterialDetail(o.material,'metal',.22);});
    for(const side of [-1,1]){for(let n=0;n<7;n++)batch.add(root,new THREE.SphereGeometry(.022,6,4),m.metal,[side*1.45,2.9,-.8+n*.32]);for(let n=0;n<5;n++)batch.add(root,new THREE.BoxGeometry(.45,.028,.08),m.dark,[side*.62,3.43,.3+n*.16]);batch.add(root,roundedBox(.15,.1,1.4,2),m.metal,[side*.9,1.3,.3]);}
    batch.add(root,new THREE.BoxGeometry(1.5,.18,.4),m.dark,[0,1.9,-1.6]);const glow=new THREE.MeshStandardMaterial({color:'#a1cbd2',emissive:'#77afbc',emissiveIntensity:.5,roughness:.3});for(const x of [-.4,0,.4])batch.add(root,new THREE.BoxGeometry(.24,.14,.025),glow,[x,2.02,-1.39]);batch.finish();
    const cabin=new THREE.PointLight('#c9dcd8',6,4,2);cabin.position.set(0,2.6,.25);this.game.world.lightSources.push({light:cabin,anchor:root});
  }
  update(dt,time,settings={}){
    const reduced=settings.reducedMotion,low=settings.quality==='low';this.fire.forEach((sprite,n)=>{sprite.material.opacity=settings.reducedFlash?.3:.6+(reduced?0:Math.sin(time*2+n)*.08);});
    for(let n=0;n<this.smoke.length;n++){const p=this.smoke[n],age=(time*.13+p.phase)%1;p.sprite.visible=!low&&!reduced;p.sprite.position.set(p.x+age*1.5,1.7+age*6,p.z);p.sprite.scale.setScalar(1+age*4);p.sprite.material.opacity=Math.sin(age*Math.PI)*.18;}
    const h=this.game.helicopter,speed=h.rotorSpeed,ground=Math.max(0,1-h.group.position.y/10);
    this.rotorDust.forEach((sprite,n)=>{const a=n*Math.PI/6+time*.15,r=2+(time*1.5+n*.43)%5;sprite.visible=!low&&!reduced&&speed>.25&&ground>0;sprite.position.set(12+Math.cos(a)*r,.4+r*.12,-261+Math.sin(a)*r);sprite.scale.set(3,1.5,1);sprite.material.opacity=.14*speed*ground*(1-r/8);});
  }
}
