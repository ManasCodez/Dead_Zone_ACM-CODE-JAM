import * as THREE from 'three';
import {roundedBox,DetailBatch} from './Geometry.js';

export class Architecture {
  constructor(scene){this.scene=scene;this.lods=[];this.windowGeometries=new Map();this.materials={stone:new THREE.MeshStandardMaterial({color:'#969d8a',roughness:.86}),frame:new THREE.MeshStandardMaterial({color:'#53685f',metalness:.5,roughness:.38}),steel:new THREE.MeshStandardMaterial({color:'#788b83',metalness:.65,roughness:.35}),dark:new THREE.MeshStandardMaterial({color:'#263932',roughness:.72}),wood:new THREE.MeshStandardMaterial({color:'#8b7b58',roughness:.85}),glass:new THREE.MeshStandardMaterial({color:'#4c7070',metalness:.3,roughness:.2})};}
  windowGeometry(w,h,d){const key=[w,h,d].join(',');if(!this.windowGeometries.has(key))this.windowGeometries.set(key,roundedBox(w,h,d,2));return this.windowGeometries.get(key);}
  addBuilding({x,z,w,d,h}){
    const root=new THREE.Group();root.name='sculpted-building-details';const batch=new DetailBatch(),m=this.materials,windows=new Map();
    const add=(geometry,material,pos,rot,scale)=>batch.add(root,geometry,material,pos,rot,scale);
    // Frames sit proud of the original recessed panes, with real sills and mullions.
    for(const face of [0,1,2,3]){const width=face<2?w:d,angle=[0,Math.PI,Math.PI/2,-Math.PI/2][face],normal=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle)),offset=face<2?d/2:w/2;
      const window=(u,y,geo,mat,du=0,dy=0,depth=0,rz=0)=>{const p=new THREE.Vector3(u+du,y+dy,offset+depth).applyAxisAngle(new THREE.Vector3(0,1,0),angle),key=geo.uuid+mat.uuid;if(!windows.has(key))windows.set(key,{geometry:geo,material:mat,matrices:[]});windows.get(key).matrices.push(new THREE.Matrix4().compose(p,new THREE.Quaternion().setFromEuler(new THREE.Euler(0,angle,rz)),new THREE.Vector3(1,1,1)));};
      for(let y=2;y<h-1;y+=3.1)for(let u=-width/2+1.3;u<width/2-.5;u+=2.5){
        for(const side of [-1,1])window(u,y,this.windowGeometry(.075,1.76,.17),m.frame,side*.62,0,.11);
        for(const side of [-1,1])window(u,y,this.windowGeometry(1.3,.075,.17),m.frame,0,side*.85,.11);
        window(u,y,this.windowGeometry(.045,1.62,.1),m.steel,0,0,.13);window(u,y,this.windowGeometry(1.42,.14,.38),m.stone,0,-.96,.13);
        if(y<3&&Math.round(u*10)%3===0)window(u,y,this.windowGeometry(1.55,.15,.075),m.wood,0,0,.25,.22);
      }
      const p=normal.clone().multiplyScalar(offset+.04);p.y=h+.25;add(roundedBox(width+.35,.4,.35,3),m.stone,p.toArray(),[0,angle,0]);
    }
    // Curved service pipes, flanges and rooftop water storage.
    for(const side of [-1,1]){const px=side*(w/2-.32),pz=d/2+.24;add(new THREE.CylinderGeometry(.07,.07,h,24),m.steel,[px,h/2,pz]);for(let y=1;y<h;y+=4)add(new THREE.TorusGeometry(.09,.018,8,24),m.frame,[px,y,pz],[Math.PI/2,0,0]);}
    const tankX=w*.22,tankZ=-d*.15;add(new THREE.CylinderGeometry(1,1.05,1.7,48,4),m.steel,[tankX,h+1.15,tankZ]);add(new THREE.SphereGeometry(1,40,20,0,Math.PI*2,0,Math.PI/2),m.steel,[tankX,h+2,tankZ],[0,0,0],[1,.38,1]);for(const y of [h+.4,h+1.6])add(new THREE.TorusGeometry(1.035,.045,10,48),m.frame,[tankX,y,tankZ],[Math.PI/2,0,0]);
    for(const side of [-1,1])add(new THREE.CylinderGeometry(.06,.06,.65,20),m.frame,[tankX+side*.7,h+.28,tankZ]);
    add(roundedBox(2.4,.85,1.6,4),m.dark,[-w*.2,h+.65,d*.17]);for(let n=0;n<8;n++)add(roundedBox(.08,.52,1.45,2),m.steel,[-w*.2-.84+n*.24,h+.7,d*.17]);
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-w*.2,h+.5,d*.17),new THREE.Vector3(-w*.3,h+.6,-d*.15),new THREE.Vector3(-w*.3,h+.25,-d*.3)]);add(new THREE.TubeGeometry(curve,32,.11,16,false),m.steel);
    for(const {geometry,material,matrices} of windows.values()){const instances=new THREE.InstancedMesh(geometry,material,matrices.length);matrices.forEach((matrix,i)=>instances.setMatrixAt(i,matrix));instances.receiveShadow=true;root.add(instances);}
    batch.finish();const lod=new THREE.LOD();lod.position.set(x,0,z);lod.addLevel(root,0);lod.addLevel(new THREE.Group(),75);this.scene.add(lod);this.lods.push(lod);
  }
  decorateRoom(room){
    const {x,z,front,side,index}=room,root=new THREE.Group();root.position.set(x,0,z);root.name='detailed-safehouse';this.scene.add(root);const batch=new DetailBatch(),m=this.materials;
    const add=(geo,mat,pos,rot,scale)=>batch.add(root,geo,mat,pos,rot,scale);
    // Rounded roof coping and interior skirting frame each complete room.
    for(const dz of [-5.9,5.9]){add(roundedBox(12.4,.25,.35,3),m.stone,[0,3.93,dz]);add(roundedBox(11.6,.18,.12,3),m.wood,[0,.15,dz]);}
    add(roundedBox(.35,.25,12.4,3),m.stone,[side*6,3.93,0]);
    for(const dz of [-4,4]){const px=front-x-side*.34;
      add(roundedBox(.2,1.7,2.7,3),m.frame,[px,1.8,dz]);add(roundedBox(.055,1.48,2.42,2),m.glass,[px-side*.12,1.8,dz]);
      add(roundedBox(.09,1.52,.055,2),m.steel,[px-side*.17,1.8,dz]);add(roundedBox(.09,.055,2.45,2),m.steel,[px-side*.17,1.8,dz]);add(roundedBox(.45,.13,2.9,3),m.stone,[px-side*.12,.87,dz]);
    }
    // Storage shelves, slats, radiator fins and overhead fixtures stay clear of the doorway and chest.
    for(let shelf=0;shelf<4;shelf++){
      add(roundedBox(1.8,.065,.62,3),m.wood,[side*3,.4+shelf*.57,-4.2]);
      for(let item=0;item<3;item++)add(roundedBox(.27,.26,.35,3),item%2?m.steel:m.wood,[side*3-.6+item*.6,.57+shelf*.57,-4.2]);
    }
    for(let n=0;n<12;n++)add(roundedBox(.08,.6,.22,3),m.stone,[-1.1+n*.2,.55,5.65]);
    add(roundedBox(3.2,.09,.55,4),m.frame,[0,3.45,0]);const lamp=new THREE.MeshStandardMaterial({color:'#fff1c9',emissive:'#ffe2a4',emissiveIntensity:1.5});add(roundedBox(2.8,.055,.35,3),lamp,[0,3.37,0]);
    if(index===0){add(roundedBox(1.35,.12,2.2,4),m.stone,[side*4.3,.85,2.2]);for(const a of [-1,1])for(const b of [-1,1])add(new THREE.CylinderGeometry(.045,.045,.8,20),m.steel,[side*4.3+a*.48,.4,2.2+b*.85]);add(roundedBox(1.15,.12,.45,4),m.wood,[side*4.3,.99,2.85]);}
    if(index===1){for(let n=0;n<5;n++){add(roundedBox(.08,1.8,.09,3),m.steel,[side*5.65,1.6,-2+n*.65],[0,0,.13]);add(new THREE.CylinderGeometry(.035,.035,.7,24),m.dark,[side*5.65,2.7,-2+n*.65]);}}
    if(index===2){add(roundedBox(1.3,.09,.8,3),m.wood,[side*4.3,1,2.6]);add(roundedBox(.85,.55,.12,4),m.frame,[side*4.3,1.35,2.75]);add(roundedBox(.72,.4,.025,3),m.glass,[side*4.3,1.36,2.675]);}
    batch.finish();
  }
}
