import * as THREE from 'three';
import {Helicopter} from './Helicopter.js';
import {Architecture} from './Architecture.js';
import {roundedBox} from './Geometry.js';
import {createGrenadeModel} from './GrenadeModel.js';
import {Surfaces} from './Surfaces.js';
import {ROUTE_STAGES} from './Mission.js';
import {createWeaponModel,WEAPONS,disposeModel} from './Weapons.js';

export const ARENA_SIZE = 54;
export function resolveCollision(position, radius, obstacles, limit = ARENA_SIZE) {
  const bounds=typeof limit==='number'?{minX:-limit,maxX:limit,minZ:-limit,maxZ:limit}:limit;
  position.x = THREE.MathUtils.clamp(position.x, bounds.minX + radius, bounds.maxX - radius);
  position.z = THREE.MathUtils.clamp(position.z, bounds.minZ + radius, bounds.maxZ - radius);
  for (const o of obstacles) {
    const x = THREE.MathUtils.clamp(position.x, o.minX, o.maxX);
    const z = THREE.MathUtils.clamp(position.z, o.minZ, o.maxZ);
    let dx = position.x - x, dz = position.z - z;
    const d2 = dx * dx + dz * dz;
    if (d2 >= radius * radius) continue;
    if (d2 > .000001) {
      const d = Math.sqrt(d2), push = (radius - d) / d;
      position.x += dx * push; position.z += dz * push;
    } else {
      const sides = [position.x - o.minX, o.maxX - position.x, position.z - o.minZ, o.maxZ - position.z];
      const i = sides.indexOf(Math.min(...sides));
      if (i === 0) position.x = o.minX - radius;
      if (i === 1) position.x = o.maxX + radius;
      if (i === 2) position.z = o.minZ - radius;
      if (i === 3) position.z = o.maxZ + radius;
    }
  }
  return position;
}

export class World {
  constructor(scene) {
    this.bounds={minX:-60,maxX:60,minZ:-196,maxZ:60};this.scene = scene; this.obstacles = []; this.solids = []; this.lamps = []; this.pickups = []; this.weaponPickups=[];
    this.architecture=new Architecture(scene);this.surfaces=new Surfaces();this.materials = new Map(); this.seed = 713;
    this.build();this.buildRoute();this.helicopter=new Helicopter(this);this.initLightPool();
  }
  initLightPool(){const lights=[];this.scene.traverse(o=>{if(o.isPointLight)lights.push(o);});this.lightSources=lights.map(light=>{light.removeFromParent();return {light};});this.lightPool=Array.from({length:8},()=>{const light=new THREE.PointLight('#ffffff',0,12,2);light.name='pooled-environment-light';this.scene.add(light);return light;});this.updateLightPool(new THREE.Vector3(0,0,8));}
  updateLightPool(position){const ranked=this.lightSources.map(source=>{const p=source.light.position.clone();if(source.anchor)source.anchor.localToWorld(p);return {source,position:p,distance:p.distanceToSquared(position)};}).sort((a,b)=>a.distance-b.distance);this.lightPool.forEach((light,i)=>{const nearest=ranked[i];if(!nearest){light.intensity=0;return;}const source=nearest.source.light;light.position.copy(nearest.position);light.color.copy(source.color);light.intensity=source.intensity;light.distance=source.distance;light.decay=source.decay;});}
  random() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
  mat(color, extra = {}) { const key = color + JSON.stringify(extra); if (!this.materials.has(key)) this.materials.set(key, new THREE.MeshStandardMaterial({color, roughness:.88, ...extra})); return this.materials.get(key); }
  box(x,y,z,w,h,d,color,collide=false,extra={}) {
    const mesh = new THREE.Mesh((h>=3&&Math.max(w,d)>=3?roundedBox(w,h,d,3,Math.min(.12,Math.min(w,h,d)*.12)):new THREE.BoxGeometry(w,h,d)),this.mat(color,extra));
    mesh.position.set(x,y,z); mesh.castShadow=w>.5&&h>.5&&d>.5; mesh.receiveShadow=true; this.scene.add(mesh);
    if(h>=6&&Math.max(w,d)>=8)this.surfaces.apply(mesh,'brick',color);else if(h>=3&&Math.max(w,d)>=3)this.surfaces.apply(mesh,'concrete',color);else if(Math.max(w,d)>=20&&h<.4)this.surfaces.apply(mesh,'asphalt',color);
    if (collide) { this.obstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2}); this.solids.push(mesh); }
    return mesh;
  }
  cylinder(x,y,z,r,h,color) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,32), this.mat(color));m.position.set(x,y,z);m.castShadow=true;this.scene.add(m);return m; }
  build() {
    this.scene.background = new THREE.Color('#526261');
    this.scene.fog = new THREE.FogExp2('#526261', .019);
    this.scene.add(new THREE.HemisphereLight('#baccc5','#333829',2.0));
    const sun = new THREE.DirectionalLight('#f2d4a4',2.7);sun.position.set(-24,42,-28);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-48;sun.shadow.camera.right=48;sun.shadow.camera.top=48;sun.shadow.camera.bottom=-48;sun.shadow.normalBias=.04;sun.shadow.bias=-.0001;this.scene.add(sun);this.sun=sun;this.scene.add(sun.target);
    this.box(0,-.18,0,124,.3,124,'#313b38');
    this.box(0,-.015,0,20,.06,112,'#262e2e');
    this.box(0,.005,4,110,.06,16,'#2c3433');
    for (let n=-50;n<=50;n+=7) {this.box(-1,.045,n,.11,.015,3,'#b5a57a');this.box(1,.045,n,.11,.015,3,'#b5a57a'); if(Math.abs(n)>13)this.box(n,.045,4,3,.015,.17,'#aba88e');}
    for (let side of [-1,1]) {this.box(side*11.3,.08,0,2.5,.2,110,'#62675e');for(let z=-49;z<52;z+=3)this.box(side*11.3,.19,z,2.4,.012,.025,'#424d47');}
    for (let x=-46;x<=46;x+=18) for (let z=-43;z<=47;z+=20) {
      if (Math.abs(x)<14 || Math.abs(z-4)<13 || (x===-28&&z===-23)) continue;
      const w=11+this.random()*4,d=11+this.random()*4,h=9+this.random()*20;
      const color=['#555d55','#62675d','#474f4d','#6e7061'][Math.floor(this.random()*4)];
      this.box(x,h/2,z,w,h,d,color,true);this.box(x,h+.2,z,w+.4,.5,d+.4,'#353f3b');
      // Uneven shattered parapets, exposed steel and boarded windows.
      if (x<0 || z>20) {
        for(let k=0;k<4;k++) {
          const fragment=this.box(x-w/2+1+k*w/4,h+.7+(k%2)*.35,z+d/2-.2,1.1,.7+(k%2)*.7,.5,color);
          fragment.rotation.z=(k%2?1:-1)*.13;
          this.box(x-w/2+1+k*w/4,h+1.6,z+d/2-.2,.06,1.5,.06,'#333d35');
        }
        const board=this.box(x-1,2,z+d/2+.09,2.1,.19,.1,'#8a7656');board.rotation.z=.25;
        const board2=this.box(x-1,2.5,z+d/2+.1,2.1,.19,.1,'#77694e');board2.rotation.z=-.3;
      }
      for (let y=2;y<h-1;y+=3.1) for(let wx=-w/2+1.3;wx<w/2-.5;wx+=2.5) {
        const lit=this.random()>.88;
        this.box(x+wx,y,z+d/2+.02,1.15,1.6,.08,lit?'#9e8151':'#202e2c',false,lit?{emissive:'#8d622d',emissiveIntensity:.45}:{});
        this.box(x+wx,y,z-d/2-.02,1.15,1.6,.08,'#26322f');
      }
      for(let y=2;y<h-1;y+=3.1)for(let wz=-d/2+1;wz<d/2-.5;wz+=2.8) {this.box(x+w/2+.03,y,z+wz,.08,1.6,1.25,'#24302c');this.box(x-w/2-.03,y,z+wz,.08,1.6,1.25,'#24302c');}
      this.box(x-w/2+.2,h+1,z-d/2+.2,.5,2,.5,'#777968');
      if(this.random()>.5)this.box(x,h+1,z,3,1.6,3,'#3d4945');
      this.box(x,1.35,z+d/2+.1,2,2.7,.1,'#26312d');
      for(let y=3;y<h;y+=6)this.box(x,y,z+d/2+.08,w+.15,.16,.22,'#7a7e6d');
      for(const side of [-1,1]){this.box(x+side*(w/2-.35),h/2,z+d/2+.1,.25,h,.25,'#737b6a');this.box(x+side*(w/2-.55),1.5,z+d/2+.2,.18,3,.18,'#383f35');}
      this.box(x,2.95,z+d/2+.65,2.7,.16,1.3,'#4d6056');this.architecture.addBuilding({x,z,w,d,h});
    }
    // Checkpoint barricades leave a navigable central street.
    for(const [x,z] of [[-7,-14],[7,19],[-7,28],[19,-3],[-24,12],[7,-36]]) {
      this.box(x,.65,z,4,1.3,1,'#8c8b73',true);
      for(let k=-1;k<=1;k++) {const stripe=this.box(x+k*1.1,.68,z+.515,.43,1.15,.025,'#303d36');stripe.rotation.z=-.35;}
    }
    for(const [x,z,c] of [[6,-8,'#626b58'],[-6,15,'#8d8170'],[6,34,'#3c5656'],[-7,-32,'#656b64'],[26,7,'#64645b'],[-29,0,'#5c6968']]) this.car(x,z,c);
    for(let i=0;i<24;i++) {
      let x=(this.random()-.5)*95,z=(this.random()-.5)*95;
      if(Math.abs(x)<4&&Math.abs(z)<10)continue;
      if(this.obstacles.some(o=>x>o.minX-2&&x<o.maxX+2&&z>o.minZ-2&&z<o.maxZ+2))continue;
      this.box(x,.5,z,1.3,1,1.3,'#6d654a',true);this.box(x,.5,z+.66,1.35,.1,.04,'#333b30');this.box(x,1.02,z,1.4,.07,1.4,'#85795a');
    }
    for(let side of [-1,1])for(let z=-38;z<=42;z+=20) {
      const x=side*10.8;this.cylinder(x,3,z,.1,6,'#35423c');this.box(x-side*.8,6,z,1.7,.12,.13,'#35423c');
      this.box(x-side*1.5,5.94,z,.6,.1,.4,'#e6c485',false,{emissive:'#ffcb78',emissiveIntensity:2});
      const light=new THREE.PointLight('#ffd397',12,12,2);light.position.set(x-side*1.5,5.6,z);this.scene.add(light);this.lamps.push({light,phase:this.random()*10});
    }
    for(const [x,z] of [[-13,-6],[13,11],[-13,30]]) {
      this.cylinder(x,.55,z,.46,1.1,'#744335');
      const fire=new THREE.Mesh(new THREE.IcosahedronGeometry(.3,0),this.mat('#ffc66a',{emissive:'#ff7c24',emissiveIntensity:3}));fire.position.set(x,1.3,z);this.scene.add(fire);
      const l=new THREE.PointLight('#ff8c3d',22,10);l.position.set(x,1.7,z);this.scene.add(l);this.lamps.push({light:l,phase:x});
    }
    // Debris, cracks and old road markings, all created from geometry.
    for(let i=0;i<150;i++) {
      const x=(this.random()-.5)*105,z=(this.random()-.5)*105;
      const s=.08+this.random()*.22;
      const m=this.box(x,s/2,z,s*2,s,s,'#6b7162');m.rotation.y=this.random()*Math.PI;
    }
    for(let z of [-22,23])for(let x=-8;x<=8;x+=2)this.box(x,.055,z,1,.015,3,'#9b9e85');
    const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=128;
    const ctx=signCanvas.getContext('2d');ctx.fillStyle='#202f2b';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#999c79';ctx.lineWidth=5;ctx.strokeRect(7,7,498,114);ctx.fillStyle='#d6c7a1';ctx.font='bold 45px monospace';ctx.textAlign='center';ctx.fillText('QUARANTINE',256,58);ctx.font='23px monospace';ctx.fillText('SECTOR 07 / NO ENTRY',256,96);
    const sign=new THREE.Mesh(new THREE.BoxGeometry(8,2,.2),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(signCanvas)}));sign.position.set(0,5,-43);this.scene.add(sign);this.box(-4,2.5,-43,.18,5,.18,'#46564a');this.box(4,2.5,-43,.18,5,.18,'#46564a');
    // Dust uses a single draw call.
    const pos=new Float32Array(350*3);for(let i=0;i<pos.length;i+=3){pos[i]=(this.random()-.5)*100;pos[i+1]=this.random()*10;pos[i+2]=(this.random()-.5)*100;}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));this.dust=new THREE.Points(g,new THREE.PointsMaterial({color:'#c5c9ae',size:.045,transparent:true,opacity:.45,depthWrite:false}));this.scene.add(this.dust);
  }
  sign(text,x,y,z,rotation=0,color='#d5c28c'){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const c=canvas.getContext('2d');c.fillStyle='#1a2b28';c.fillRect(0,0,512,96);c.strokeStyle=color;c.lineWidth=4;c.strokeRect(4,4,504,88);c.fillStyle=color;c.textAlign='center';c.font='bold 32px monospace';c.fillText(text,256,60);const texture=new THREE.CanvasTexture(canvas),mesh=new THREE.Mesh(new THREE.PlaneGeometry(5.5,1),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));mesh.position.set(x,y,z);mesh.rotation.y=rotation;this.scene.add(mesh);return mesh;
  }
  buildRoute(){
    this.box(0,-.2,-75,140,.3,290,'#313b38');this.box(0,-.01,-103,20,.07,166,'#293332');
    for(const side of [-1,1]){this.box(side*11.3,.08,-111,2.5,.2,146,'#62675e');for(let z=-184;z<26;z+=8){this.box(side*38,.05,z,.22,.03,6,'#ac5942');this.cylinder(side*38,.7,z,.08,1.4,'#7a5140');this.box(side*38,1.4,z,.18,.13,.18,'#ef7950',false,{emissive:'#ef5930',emissiveIntensity:1});}}
    for(let z=-60;z> -184;z-=8){this.box(-1,.05,z,.11,.01,3,'#b5a57a');this.box(1,.05,z,.11,.01,3,'#b5a57a');}
    for(let z=-63;z> -183;z-=25)for(const side of [-1,1]){const x=side*43,h=12+(Math.abs(z)%13);this.box(x,h/2,z,10,h,16,'#535e55',true);this.architecture.addBuilding({x,z,w:10,d:16,h});for(let y=2;y<h-1;y+=3)for(let wz=-5;wz<=5;wz+=3)this.box(x-side*5.02,y,z+wz,.06,1.5,1.1,'#24342f');}
    this.routeRooms=[];this.caches=[];
    for(const [index,s] of ROUTE_STAGES.entries()){
      if(index===3){this.box(s.x,.3,s.z,5,.5,5,'#45594c');this.cylinder(s.x,1.1,s.z,.25,1.7,'#68786a');this.box(s.x,2,s.z,.6,.3,.6,'#a4decd',false,{emissive:'#80dbbf',emissiveIntensity:1.8});this.sign('NORTH / EXTRACTION',0,4,-177);continue;}
      const x=s.x,z=s.z,side=Math.sign(x),w=12,d=12,front=x-side*w/2;
      this.box(x,.02,z,w,.07,d,'#5a6256');
      this.box(x+side*w/2,1.8,z,.35,3.6,d,'#6a7061',true);
      for(const dz of [-d/2,d/2])this.box(x,1.8,z+dz,w,3.6,.35,'#626e60',true);
      // Split the street-facing wall around a four-unit walk-through doorway.
      for(const dz of [-4,4])this.box(front,1.8,z+dz,.35,3.6,4,'#6a7061',true);
      const lintel=this.box(front,3.15,z,.4,.8,4,'#7a7e69');this.solids.push(lintel);
      const roof=this.box(x,3.75,z,w+.5,.25,d+.5,'#485448');this.solids.push(roof);
      this.sign(s.name,front-side*.22,3.12,z,side>0?-Math.PI/2:Math.PI/2);
      const light=new THREE.PointLight('#e6c78a',28,12,2);light.position.set(x,2.8,z);this.scene.add(light);
      this.box(x+side*3,.9,z+3,2,.12,1,'#7a7151',true);this.box(x+side*3,1.6,z-4,2,3,.5,'#35483b',true);
      this.caches.push(this.buildChest(x,z,side,index));
      const room={x,z,front,side,width:w,depth:d,index};this.decorateRoom(room,s);this.routeRooms.push(room);
      this.sign('SUPPLIES / E TO SEARCH',x+side*5.7,2.3,z,side>0?-Math.PI/2:Math.PI/2,'#efd18b');
    }
    for(const z of [-55,-96,-145]){this.car(6,z,'#5c6b57');this.box(-7,.65,z-8,3,1.3,1,'#8c8b73',true);}
    for(let z=-55;z> -180;z-=24){this.cylinder(-10.8,3,z,.1,6,'#35423c');this.box(-10,6,z,1.6,.12,.2,'#35423c');const light=new THREE.PointLight('#ffd397',12,12,2);light.position.set(-10,5.5,z);this.scene.add(light);this.lamps.push({light,phase:Math.abs(z)});}
    this.sign('NORTHBOUND / FOLLOW THE SIGNAL',0,4,-48);
  }
  label(text,color='#ffd275',width=6){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=160;const c=canvas.getContext('2d');c.fillStyle='#0b1c1ce8';c.fillRect(0,0,1024,160);c.strokeStyle=color;c.lineWidth=6;c.strokeRect(4,4,1016,152);c.fillStyle=color;c.textAlign='center';c.font='bold 48px Arial';c.fillText(text,512,98);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false}));sprite.scale.set(width,width*160/1024,1);this.scene.add(sprite);return sprite;}
  buildChest(x,z,side,index){
    const group=new THREE.Group();group.position.set(x,.07,z);group.rotation.y=side*Math.PI/2;this.scene.add(group);
    const add=(w,h,d,px,py,pz,color,parent=group)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.mat(color,{metalness:.35,roughness:.55}));mesh.position.set(px,py,pz);mesh.castShadow=true;parent.add(mesh);return mesh;};
    const body=add(1.7,.85,1.15,0,.47,0,'#536d5b');this.obstacles.push({minX:x-.6,maxX:x+.6,minZ:z-.9,maxZ:z+.9});this.solids.push(body);this.surfaces.apply(body,'wood','#8d9b72');add(1.73,.1,1.18,0,.11,0,'#283a34');
    const lid=new THREE.Group();lid.position.set(0,.94,.57);group.add(lid);add(1.8,.2,1.24,0,.1,-.57,'#687c61',lid);
    for(const sx of [-.64,.64]){add(.11,.85,1.2,sx,.5,0,'#b8a46f');add(.13,.23,1.27,sx,.12,-.57,'#d8b563',lid);}
    const latch=add(.26,.3,.1,0,.75,-.62,'#f7ce75');latch.material=new THREE.MeshStandardMaterial({color:'#f7ce75',emissive:'#d7a43e',emissiveIntensity:.8,metalness:.7,roughness:.3});
    add(.6,.08,.12,0,.55,-.65,'#263b32');const interior=add(1.35,.04,.9,0,.92,0,'#d7c26d');interior.material=new THREE.MeshBasicMaterial({color:'#dcc889'});
    const ring=new THREE.Mesh(new THREE.RingGeometry(1.15,1.24,40),new THREE.MeshBasicMaterial({color:'#ffd36e',side:THREE.DoubleSide,transparent:true,opacity:.8}));ring.rotation.x=-Math.PI/2;ring.position.y=.015;group.add(ring);
    const label=this.label(`${String(index+1).padStart(2,'0')}  SUPPLY CHEST  [ E ]`,'#ffda81',3.8);label.position.set(x,2.15,z);label.visible=false;
    return {group,lid,latch,ring,label,opened:false,index};
  }
  setCacheOpened(index,opened,immediate=false){const chest=this.caches[index];if(!chest)return;chest.opened=opened;if(immediate)chest.lid.rotation.x=opened?1.2:0;chest.ring.material.color.set(opened?'#79c9a7':'#ffd36e');chest.label.visible=!opened;}
  decorateRoom(room,stage){const {x,z,front,side,index}=room,palette=['#8bbfa7','#b6795c','#83a8bd'],accent=palette[index];
    // Distinct facade cladding, reinforced corners, canopy and roof equipment.
    const facing=front-side*.24;
    for(const dz of [-4,4]){const panel=this.box(facing,1.45,z+dz,.12,2.8,3.7,accent);this.surfaces.apply(panel,index===1?'brick':'concrete',accent);this.box(facing-side*.06,.32,z+dz,.18,.4,3.8,'#35483e');}
    const frameMaterial=new THREE.MeshBasicMaterial({color:'#75d7b3'});const frame=new THREE.Group();
    for(const [dy,dz,h,d] of [[1.5,-2,3,.14],[1.5,2,3,.14],[2.95,0,.15,4.1]]){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.2,h,d),frameMaterial);mesh.position.set(facing-side*.12,dy,z+dz);frame.add(mesh);}this.scene.add(frame);room.frame=frame;room.frameMaterial=frameMaterial;
    this.box(front-side*.9,3.65,z,2.2,.16,5,'#354c43');this.box(front-side*1.8,.055,z,3.2,.05,3.9,'#4f7161');
    for(const dz of [-5.8,5.8])this.box(front-side*.1,1.8,z+dz,.6,3.7,.4,'#b1b49a');
    const label=this.label(`${index+1}  ${stage.name}  /  ENTER`,'#8de4bc',9);label.position.set(front,5,z);room.label=label;
    // Large identity symbol on the roof and a visible entrance floor stencil.
    if(index===0){this.box(x,5,z,.3,2.3,.3,'#b6ead0',false,{emissive:'#83cba5',emissiveIntensity:.7});this.box(x,5,z,1.7,.35,.3,'#b6ead0',false,{emissive:'#83cba5',emissiveIntensity:.7});}
    if(index===1){for(const dz of [-2,0,2])this.box(x,4.25,z+dz,3,.8,1,'#414d40');this.sign('ARMORY / WEAPONS',front-side*.4,2,z+4,side>0?-Math.PI/2:Math.PI/2,'#e4bd7e');}
    if(index===2){this.cylinder(x,5,z,.08,3,'#a5b4ac');const dish=new THREE.Mesh(new THREE.SphereGeometry(.9,48,32,0,Math.PI),this.mat('#a1b3b0',{side:THREE.DoubleSide,metalness:.5}));dish.position.set(x,5.2,z);dish.rotation.z=.4;this.scene.add(dish);}
    this.sign('ENTER  >>>',facing-side*.08,1.8,z-4,side>0?-Math.PI/2:Math.PI/2,'#bfe5c0');this.architecture.decorateRoom(room);
  }
  resetSupplies(){for(let i=0;i<this.caches.length;i++)this.setCacheOpened(i,false,true);this.clearPickups();this.clearWeapons();this.addPickup('health',new THREE.Vector3(-4,0,3));this.addPickup('ammo',new THREE.Vector3(4,0,-4));this.addPickup('grenade',new THREE.Vector3(3,0,3));this.addWeaponPickup('rifle',-4,4);
    for(const s of ROUTE_STAGES.filter(s=>s.weapon)){this.addWeaponPickup(s.weapon,s.x+1.8,s.z-1.4);this.addPickup('health',new THREE.Vector3(s.x-2,0,s.z-2));this.addPickup('ammo',new THREE.Vector3(s.x-2,0,s.z+2));this.addPickup('grenade',new THREE.Vector3(s.x+2,0,s.z+2));}
  }
  car(x,z,color) {
    this.box(x,.65,z,2,1,4,color,true);this.box(x,1.35,z-.1,1.8,.7,2.1,'#293b37');this.box(x,1.73,z-.1,1.9,.12,2.2,color);this.box(x,.73,z+2.02,1.7,.2,.06,'#9b9277');
    for(const a of [-1,1])for(const b of [-1,1]){const w=this.cylinder(x+a*1.02,.42,z+b*1.3,.4,.22,'#1e2624');w.rotation.z=Math.PI/2;}
  }
  isFree(x,z,r=1.5) {return Math.abs(x)<37&&z> -183&&z<25&&!this.obstacles.some(o=>x>o.minX-r&&x<o.maxX+r&&z>o.minZ-r&&z<o.maxZ+r);}
  spawnPosition(player,min=19,max=30) {
    for(let i=0;i<100;i++){const a=Math.random()*Math.PI*2,d=min+Math.random()*(max-min),x=player.x+Math.sin(a)*d,z=player.z+Math.cos(a)*d;if(this.isFree(x,z))return new THREE.Vector3(x,0,z);}
    // Enumerate free cells so spawns never fall back inside the player or a building.
    for(let x=-34;x<=34;x+=4)for(let z=-180;z<=24;z+=4)if(Math.hypot(x-player.x,z-player.z)>min&&this.isFree(x,z))return new THREE.Vector3(x,0,z);
    return new THREE.Vector3(0,0,-38);
  }
  addPickup(type,position) {
    const color={health:'#a4e1b0',ammo:'#eac27c',speed:'#8fd9e9',grenade:'#c9db83'}[type];
    const group=new THREE.Group();group.position.copy(position);group.position.y=.65;
    const body=new THREE.Mesh(new THREE.BoxGeometry(.65,.55,.5),this.mat('#344f43'));group.add(body);
    const glow=this.mat(color,{emissive:color,emissiveIntensity:1.4});
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(.42,.13,.53),glow);group.add(stripe);
    if(type==='health')group.add(new THREE.Mesh(new THREE.BoxGeometry(.13,.4,.53),glow));
    if(type==='ammo')for(let i=-1;i<=1;i++){const bullet=new THREE.Mesh(new THREE.BoxGeometry(.07,.28,.08),glow);bullet.position.set(i*.15,.35,0);group.add(bullet);}
    if(type==='grenade'){body.visible=false;stripe.visible=false;const frag=createGrenadeModel();frag.scale.setScalar(1.7);frag.position.y=.15;group.add(frag);}
    if(type==='speed'){body.rotation.z=.4;stripe.rotation.z=-.4;}
    const ring=new THREE.Mesh(new THREE.RingGeometry(.65,.72,24),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.45,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-.59;group.add(ring);
    this.scene.add(group);this.pickups.push({type,group,ring,baseY:.65});
  }
  addWeaponPickup(id,x,z){
    if(!this.isFree(x,z,1)){let found=false;for(let r=1;r<12&&!found;r++)for(const [dx,dz] of [[r,0],[-r,0],[0,r],[0,-r]])if(this.isFree(x+dx,z+dz,1)){x+=dx;z+=dz;found=true;break;}}
    const spec=WEAPONS[id],group=new THREE.Group();group.position.set(x,.85,z);
    const model=createWeaponModel(id,false);model.rotation.z=Math.PI/2;group.add(model);
    const ring=new THREE.Mesh(new THREE.RingGeometry(.7,.8,32),new THREE.MeshBasicMaterial({color:'#ffd56a',side:THREE.DoubleSide,transparent:true,opacity:.9}));ring.rotation.x=-Math.PI/2;ring.position.y=-.78;group.add(ring);
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(.35,.65,9,12,1,true),new THREE.MeshBasicMaterial({color:'#ffcf55',side:THREE.DoubleSide,transparent:true,opacity:.13,depthWrite:false}));beam.position.y=3.8;group.add(beam);const glow=new THREE.Mesh(new THREE.SphereGeometry(.16,8,6),new THREE.MeshBasicMaterial({color:'#fff0b0'}));glow.position.y=3;group.add(glow);const light=new THREE.PointLight('#ffd16b',10,6,2);light.position.y=1;const lightSource={light,anchor:group};this.lightSources.push(lightSource);
    this.scene.add(group);this.weaponPickups.push({id,group,model,ring,lightSource});
  }
  removeWeaponPickup(p){const sourceIndex=this.lightSources.indexOf(p.lightSource);if(sourceIndex>=0)this.lightSources.splice(sourceIndex,1);this.scene.remove(p.group);disposeModel(p.group);this.weaponPickups.splice(this.weaponPickups.indexOf(p),1);}
  clearWeapons(){for(const p of [...this.weaponPickups])this.removeWeaponPickup(p);}
  removePickup(p){this.scene.remove(p.group);const materials=new Set();p.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(o.userData.ownedMaterial)materials.add(o.material);}});for(const m of materials)m.dispose();p.ring.material.dispose();this.pickups.splice(this.pickups.indexOf(p),1);}
  clearPickups(){for(const p of [...this.pickups])this.removePickup(p);}
  update(dt,time,game=null) {this.helicopter.update(dt);for(const chest of this.caches){chest.lid.rotation.x=THREE.MathUtils.lerp(chest.lid.rotation.x,chest.opened?1.2:0,1-Math.exp(-dt*6));const room=this.routeRooms[chest.index],p=game?.player.position,inside=p&&Math.abs(p.x-room.x)<5.7&&Math.abs(p.z-room.z)<5.7;chest.label.visible=Boolean(game&&game.mission.index===chest.index&&inside&&!chest.opened);chest.ring.visible=Boolean(game&&game.mission.index===chest.index&&!chest.opened);const active=game?.mission.index===chest.index;room.frameMaterial.color.set(active?'#ffe29b':'#75d7b3');room.label.visible=Boolean(!game||Math.hypot((p?.x||0)-room.x,(p?.z||0)-room.z)<75);}
    for(const p of this.weaponPickups){p.model.rotation.y+=dt*.55;p.model.position.y=Math.sin(time*2+p.group.position.x)*.1;}this.dust.rotation.y+=dt*.002;for(const l of this.lamps)l.light.intensity=(l.phase<0?20:11)*(1+.07*Math.sin(time*13+l.phase)+.03*Math.sin(time*37));for(const p of this.pickups){p.group.rotation.y+=dt*.8;p.group.position.y=p.baseY+Math.sin(time*2+p.group.position.x)*.12;}this.updateLightPool(game?.player.position||new THREE.Vector3(0,0,8));}
}
