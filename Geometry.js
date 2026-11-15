import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function roundedBox(w,h,d,segments=3,radius=Math.min(w,h,d)*.18){return new RoundedBoxGeometry(w,h,d,segments,radius);}
export function ellipsoid(w,h,d,segments=32){return new THREE.SphereGeometry(1,segments,Math.round(segments*.75)).scale(w/2,h/2,d/2);}
export function capsule(w,h,d,segments=24){return new THREE.CapsuleGeometry(.5,1,Math.round(segments/3),segments).scale(w,h/2,d);}

// Bake rigid details together by parent and material to keep the richer models inexpensive to draw.
export class DetailBatch {
  constructor(){this.parents=new Map();}
  add(parent,geometry,material,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1]){const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(...scale));let geo=geometry.index?geometry.toNonIndexed():geometry.clone();geo.applyMatrix4(matrix);geometry.dispose();if(!this.parents.has(parent))this.parents.set(parent,new Map());const materials=this.parents.get(parent);if(!materials.has(material))materials.set(material,[]);materials.get(material).push(geo);}
  finish(){const meshes=[];for(const [parent,materials] of this.parents)for(const [material,geometries] of materials){const geometry=mergeGeometries(geometries);for(const g of geometries)g.dispose();const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;parent.add(mesh);meshes.push(mesh);}this.parents.clear();return meshes;}
}

const maps=new Map();
export function characterTexture(kind){if(maps.has(kind))return maps.get(kind);const size=128,data=new Uint8Array(size*size*4);let seed=kind==='skin'?127:493;for(let y=0;y<size;y++)for(let x=0;x<size;x++){seed=(seed*1664525+1013904223)>>>0;const noise=(seed/4294967296-.5)*(kind==='skin'?20:14),weave=kind==='cloth'?((x%4===0||y%4===0)?-23:4):Math.sin(x*.19+y*.13)*5;const i=(y*size+x)*4;data[i]=220+noise+weave;data[i+1]=kind==='skin'?213+noise+weave:220+noise+weave;data[i+2]=kind==='skin'?205+noise+weave:220+noise+weave;data[i+3]=255;}const texture=new THREE.DataTexture(data,size,size);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;maps.set(kind,texture);return texture;}
