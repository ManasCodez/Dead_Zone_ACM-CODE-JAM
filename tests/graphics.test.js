import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {materialMaps,applyMaterialDetail} from '../MaterialLibrary.js';
import {Zombie} from '../Zombie.js';
import {BlastEffect} from '../BlastEffect.js';
import {GRAPHICS_PRESETS,boundedPixelRatio} from '../Graphics.js';

test('ultrawide and high-DPI displays stay inside drawing-buffer budgets',()=>{
 for(const preset of Object.values(GRAPHICS_PRESETS))for(const [width,height] of [[1280,720],[3840,2160],[5120,2880],[7680,2160]])for(const requested of [1,1.5,2,3]){const ratio=boundedPixelRatio(width,height,requested,preset);assert.ok(width*height*ratio*ratio<=preset.maxPixels+1);assert.ok(ratio>0&&ratio<=requested&&ratio<=preset.ratio);}
});

test('shared PBR maps distinguish color from linear data and contain normalized surface normals',()=>{
 for(const kind of ['brick','concrete','asphalt','cloth','skin','wood','metal']){
  const maps=materialMaps(kind);assert.equal(maps,materialMaps(kind));assert.equal(maps.map.colorSpace,THREE.SRGBColorSpace);assert.equal(maps.normalMap.colorSpace,THREE.NoColorSpace);assert.equal(maps.roughnessMap.colorSpace,THREE.NoColorSpace);assert.notEqual(maps.map,maps.normalMap);
  const data=maps.normalMap.image.data;for(let i=0;i<data.length;i+=1364){const length=Math.hypot(data[i]/255*2-1,data[i+1]/255*2-1,data[i+2]/255*2-1);assert.ok(Math.abs(length-1)<.02);}
  const mat=new THREE.MeshStandardMaterial({bumpMap:maps.map});applyMaterialDetail(mat,kind);assert.equal(mat.bumpMap,null);assert.equal(mat.normalMap,maps.normalMap);mat.dispose();
 }
});

test('death pose settles above ground and no longer sinks the complete body below the street',()=>{
 const z=new Zombie(new THREE.Scene(),'normal',new THREE.Vector3());z.damage(100);for(let i=0;i<20;i++)z.update(.05,{settings:{},position:new THREE.Vector3()}, {}, [],()=>{});assert.ok(z.position.y>=0);assert.ok(z.mesh.rotation.z>1);assert.ok(z.mesh.userData.limbs['kneePivot1'].rotation.x<-.5);z.dispose();
});

test('reduced flash is applied at explosion creation, including its pooled light',()=>{
 const game={scene:new THREE.Scene(),settings:{value:{reducedFlash:true}},particleScale:.45,world:{lightSources:[]},player:{position:new THREE.Vector3(),shake(){}}};
 const effect=new BlastEffect(game,new THREE.Vector3());assert.ok(effect.flash.material.opacity<.15);assert.ok(effect.lightSource.light.intensity<8);assert.equal(effect.smoke.length,7);effect.update(.03);assert.ok(effect.fire.every(f=>f.mesh.material.opacity<.35));effect.dispose();assert.equal(game.world.lightSources.length,0);
});
