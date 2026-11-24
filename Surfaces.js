import * as THREE from 'three';
import {materialMaps,applyMaterialDetail} from './MaterialLibrary.js';

export class Surfaces {
  constructor(){this.maps=new Map();this.materials=new Map();}
  texture(kind){const map=materialMaps(kind).map;this.maps.set(kind,map);return map;}
  apply(mesh,kind,tint='#ffffff'){
    const key=kind+tint;this.texture(kind);
    if(!this.materials.has(key)){
      const color=new THREE.Color(tint);color.lerp(new THREE.Color('#a6acac'),kind==='asphalt'?.2:.12);
      const material=new THREE.MeshStandardMaterial({color,roughness:1,metalness:0});
      applyMaterialDetail(material,kind,kind==='brick'?.7:kind==='asphalt'?.2:.2);this.materials.set(key,material);
    }
    mesh.material=this.materials.get(key);mesh.userData.surface=kind;
    const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,uv=mesh.geometry.attributes.uv,scale=kind==='brick'?1.1:kind==='asphalt'?.28:.55;
    for(let i=0;i<p.count;i++){const x=p.getX(i)+mesh.position.x,y=p.getY(i)+mesh.position.y,z=p.getZ(i)+mesh.position.z,nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv.setXY(i,(nx>.5?z:x)*scale,(ny>.5?z:y)*scale);}uv.needsUpdate=true;return mesh;
  }
}
