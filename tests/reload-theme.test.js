import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Player} from '../Player.js';
import {Combat} from '../Combat.js';
import {WEAPON_IDS,WEAPONS,disposeModel} from '../Weapons.js';

test('each gun has a distinct moving reload part and the support hand follows it while aiming and moving',()=>{
  const player=new Player(new THREE.Scene(),new THREE.PerspectiveCamera(),{obstacles:[]});
  for(const id of WEAPON_IDS){
    player.setWeapon(id);player.reloadShells=id==='shotgun'?6:1;player.reloadProgress=.45;player.setAiming(true,true);
    player.update(1/60,new Set(['KeyW','ShiftLeft']));
    const gun=player.mesh.userData.limbs.gun,parts=gun.userData;
    assert.ok(parts.reloadMotion.pitch!==0,`${id} pitches during reload`);
    if(id==='shotgun')assert.equal(parts.shell.visible,true);
    else if(id==='revolver'){assert.ok(parts.cylinder.position.x<-.1);assert.equal(parts.speedloader.visible,true);}
    else assert.ok(parts.magazine.position.y<parts.magazine.userData.homeY-.05,`${id} magazine moves`);
    player.mesh.updateMatrixWorld(true);
    const hand=player.mesh.userData.limbs['hand-1'].getWorldPosition(new THREE.Vector3());
    const grip=gun.localToWorld(parts.supportGrip.clone());
    assert.ok(hand.distanceTo(grip)<.001,`${id} support hand tracks the reload part`);
    player.reloadProgress=0;player.poseWeapon();
    assert.ok(!parts.shell||!parts.shell.visible);
  }
  disposeModel(player.mesh);
});

test('shotgun shells enter ammo as they are inserted; other guns fill at the end',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),player={setWeapon(){},muzzlePosition:()=>new THREE.Vector3()},world={solids:[]},sound={play(){},tone(){}};
  const combat=new Combat(scene,camera,player,world,sound,()=>{},()=>{});
  for(const id of WEAPON_IDS){
    if(id!=='rifle')combat.equip(id,true);
    combat.ammo=0;combat.reserve=WEAPONS[id].capacity;
    assert.equal(combat.reload(),true);
    const duration=combat.reloadDuration;
    combat.update(duration/2);
    if(id==='shotgun'){assert.equal(combat.ammo,4);assert.equal(combat.reserve,4);assert.equal(player.reloadShells,8);}
    else assert.equal(combat.ammo,0,`${id} ammo waits for magazine or cylinder closure`);
    combat.update(duration/2);
    assert.equal(combat.ammo,WEAPONS[id].capacity);assert.equal(combat.reserve,0);assert.equal(player.reloadProgress,0);
  }
});

test('switching away from a partly loaded shotgun keeps inserted shells and conserves reserve',()=>{
  const combat=new Combat(new THREE.Scene(),new THREE.PerspectiveCamera(),{setWeapon(){},muzzlePosition:()=>new THREE.Vector3()},{solids:[]},{play(){},tone(){}},()=>{},()=>{});
  combat.equip('shotgun',true);combat.ammo=2;combat.reserve=6;combat.reload();combat.update(1.35);
  assert.equal(combat.ammo,5);assert.equal(combat.reserve,3);
  combat.equip('rifle');combat.equip('shotgun');assert.equal(combat.ammo,5);assert.equal(combat.reserve,3);
  combat.reload();combat.update(2.7);assert.equal(combat.ammo,8);assert.equal(combat.reserve,0);
});
