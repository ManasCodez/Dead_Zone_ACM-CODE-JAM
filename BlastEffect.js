import * as THREE from 'three';

let cloudMap;
function cloudTexture(){if(cloudMap)return cloudMap;const size=128,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=(x+.5)/size*2-1,v=(y+.5)/size*2-1,r=Math.hypot(u,v),noise=.8+.12*Math.sin(x*.31+y*.19)+.08*Math.cos(x*.17-y*.29),i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.max(0,Math.min(255,(1-r)*noise*330));}cloudMap=new THREE.DataTexture(data,size,size);cloudMap.needsUpdate=true;cloudMap.magFilter=THREE.LinearFilter;cloudMap.minFilter=THREE.LinearFilter;return cloudMap;}
export class BlastEffect {
  constructor(game,position){this.game=game;this.age=0;this.group=new THREE.Group();this.group.name='grenade-blast';this.group.position.copy(position);game.scene.add(this.group);this.fire=[];this.smoke=[];this.debris=[];
    const sprite=(color,opacity,additive=false)=>{const m=new THREE.SpriteMaterial({map:cloudTexture(),color,transparent:true,opacity,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending});const s=new THREE.Sprite(m);this.group.add(s);return s;};
    this.flash=sprite('#fff3cc',1,true);this.flash.scale.setScalar(1.4);
    for(let n=0;n<8;n++){const angle=n*Math.PI*2/8;this.fire.push({mesh:sprite(n%2?'#ff9d31':'#ffd572',.9,true),velocity:new THREE.Vector3(Math.cos(angle)*(2+Math.random()),1+Math.random()*2,Math.sin(angle)*(2+Math.random())),size:.9+Math.random()*.7});}
    for(let n=0;n<14;n++){const angle=n*2.399;const mesh=sprite(n%2?'#4b4c43':'#6c6a59',0);this.smoke.push({mesh,velocity:new THREE.Vector3(Math.cos(angle)*(1+Math.random()*2),.7+Math.random()*1.5,Math.sin(angle)*(1+Math.random()*2)),size:1+Math.random()*1.2,delay:n*.012});}
    const points=new Float32Array(72*3);this.sparkVelocities=[];for(let n=0;n<72;n++){const a=Math.random()*Math.PI*2,speed=4+Math.random()*11;this.sparkVelocities.push(new THREE.Vector3(Math.cos(a)*speed,2+Math.random()*10,Math.sin(a)*speed));}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(points,3));this.sparks=new THREE.Points(geometry,new THREE.PointsMaterial({color:'#ffe4a0',size:.075,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));this.group.add(this.sparks);
    const fragmentGeometry=new THREE.IcosahedronGeometry(.055,1),fragmentMaterial=new THREE.MeshStandardMaterial({color:'#504e39',metalness:.4,roughness:.7});for(let n=0;n<10;n++){const mesh=new THREE.Mesh(fragmentGeometry,fragmentMaterial);this.group.add(mesh);const a=Math.random()*Math.PI*2;this.debris.push({mesh,velocity:new THREE.Vector3(Math.cos(a)*(3+Math.random()*4),3+Math.random()*5,Math.sin(a)*(3+Math.random()*4))});}
    this.shockwave=new THREE.Mesh(new THREE.RingGeometry(.88,1,64),new THREE.MeshBasicMaterial({color:'#dfc69b',transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}));this.shockwave.rotation.x=-Math.PI/2;this.shockwave.position.y=.04;this.group.add(this.shockwave);
    const light=new THREE.PointLight('#ffc773',65,18,2);light.position.copy(position).add(new THREE.Vector3(0,.8,0));this.lightSource={light};game.world.lightSources?.push(this.lightSource);
    const distance=game.player.position.distanceTo(position);if(distance<22)game.player.shake?.(.1*(1-distance/22));
  }
  clearLight(){const sources=this.game.world.lightSources;if(sources){const i=sources.indexOf(this.lightSource);if(i>=0)sources.splice(i,1);}}
  update(dt){this.age+=dt;const age=this.age;this.flash.scale.setScalar(.8+age*15);this.flash.material.opacity=Math.max(0,1-age*7);this.lightSource.light.intensity=65*Math.max(0,1-age/.24);if(age>.24)this.clearLight();
    for(const f of this.fire){f.mesh.position.copy(f.velocity).multiplyScalar(age);f.mesh.scale.setScalar(f.size+age*6);f.mesh.material.opacity=Math.max(0,.9-age*2.2);}
    for(const s of this.smoke){const t=Math.max(0,age-s.delay);s.mesh.position.copy(s.velocity).multiplyScalar(t);s.mesh.scale.setScalar(s.size+t*2.4);s.mesh.material.opacity=Math.max(0,Math.min(.5,t*2)*(1-t/2.25));s.mesh.material.rotation=t*.2;}
    const attribute=this.sparks.geometry.attributes.position;for(let i=0;i<this.sparkVelocities.length;i++){const v=this.sparkVelocities[i];attribute.setXYZ(i,v.x*age,Math.max(.04-this.group.position.y,v.y*age-6*age*age),v.z*age);}attribute.needsUpdate=true;this.sparks.material.opacity=Math.max(0,1-age/1.05);
    for(const d of this.debris){d.velocity.y-=dt*12;d.mesh.position.addScaledVector(d.velocity,dt);const floor=.06-this.group.position.y;if(d.mesh.position.y<floor){d.mesh.position.y=floor;d.velocity.multiplyScalar(.35);d.velocity.y=Math.abs(d.velocity.y)*.35;}d.mesh.rotation.x+=dt*9;d.mesh.rotation.z+=dt*6;}
    this.shockwave.scale.setScalar(.4+age*17);this.shockwave.material.opacity=Math.max(0,.55-age*1.3);return age>2.35;
  }
  dispose(){this.clearLight();this.game.scene.remove(this.group);const geometries=new Set(),materials=new Set();this.group.traverse(o=>{if((o.isMesh||o.isPoints)&&o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
}
