import * as THREE from 'three';
import {applyMaterialDetail} from './MaterialLibrary.js';
import {roundedBox,ellipsoid,DetailBatch} from './Geometry.js';

export function createGrenadeModel(){
  const group=new THREE.Group();group.name='fragmentation-grenade';const details=new DetailBatch();
  const shell=new THREE.MeshStandardMaterial({color:'#58633c',metalness:.5,roughness:.48}),ribs=new THREE.MeshStandardMaterial({color:'#303e29',metalness:.6,roughness:.48}),steel=new THREE.MeshStandardMaterial({color:'#9aa69a',metalness:.85,roughness:.27}),band=new THREE.MeshStandardMaterial({color:'#d1ad52',metalness:.5,roughness:.42});
  applyMaterialDetail(shell,'metal',.35);applyMaterialDetail(steel,'metal',.15);
  const add=(geo,mat,p,r,scale)=>details.add(group,geo,mat,p,r,scale);
  add(ellipsoid(.3,.36,.3,40),shell,[0,-.025,0]);
  for(const y of [-.13,-.065,0,.065,.13]){const radius=.15*Math.sqrt(Math.max(.1,1-((y+.025)/.18)**2));add(new THREE.TorusGeometry(radius,.008,8,40),ribs,[0,y,0],[Math.PI/2,0,0]);}
  for(let n=0;n<10;n++){const a=n*Math.PI/5,points=[];for(let k=0;k<=12;k++){const y=-.17+k*.025,r=.152*Math.sqrt(Math.max(.04,1-((y+.025)/.18)**2));points.push(new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r));}add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.005,6,false),ribs);}
  add(new THREE.CylinderGeometry(.061,.075,.085,32),ribs,[0,.17,0]);add(new THREE.TorusGeometry(.071,.01,8,32),band,[0,.135,0],[Math.PI/2,0,0]);
  add(roundedBox(.095,.035,.12,3),steel,[0,.217,0]);add(roundedBox(.055,.3,.025,3),steel,[0,.09,.14],[-.23,0,0]);add(new THREE.TorusGeometry(.048,.008,10,36),steel,[.095,.192,0],[0,Math.PI/2,0]);add(new THREE.CylinderGeometry(.009,.009,.14,16),steel,[.035,.19,0],[0,0,Math.PI/2]);
  add(roundedBox(.06,.025,.012,2),band,[0,.015,-.153]);
  const meshes=details.finish();for(const mesh of meshes)mesh.userData.ownedMaterial=true;return group;
}
