import * as THREE from 'three';
import {drawNavigationMap} from './MapRenderer.js';
import {outsideSafeZone} from './Mission.js';
import {WEAPON_IDS,WEAPONS} from './Weapons.js';
export const formatTime=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const el=id=>document.getElementById(id);
export class UI {
  constructor(){this.announcementTime=0;this.toastTime=0;this.hitTime=0;this.damageTime=0;this.map=el('minimap').getContext('2d');this.mapTick=0;this.mapExpanded=false;}
  state(state){if(state!=='pause'){this.mapExpanded=false;el('tactical-map').classList.add('hidden');}for(const id of ['menu','pause','gameover','victory'])el(id).classList.toggle('hidden',id!==state);el('hud').classList.toggle('hidden',(state==='menu'||state==='intro'||state==='extraction'));el('menu-footer').classList.toggle('hidden',state!=='menu');document.body.classList.toggle('in-menu',state==='menu');document.body.classList.toggle('playing',state!=='menu');el('lock-hint').classList.add('hidden');}
  announce(kicker,title,duration=3){el('announcement-kicker').textContent=kicker;el('announcement-title').textContent=title;el('announcement').style.opacity=1;this.announcementTime=duration;}
  toast(message){el('pickup-toast').textContent=message;el('pickup-toast').style.opacity=1;this.toastTime=2.4;}
  hit(){this.hitTime=.12;el('hitmarker').style.opacity=1;}
  damage(){this.damageTime=.4;}
  update(dt,game){
    const {player,combat}=game;
    el('health').textContent=Math.ceil(player.health);el('health-bar').style.width=`${Math.max(0,player.health)}%`;
    el('ammo').textContent=String(combat.ammo).padStart(2,'0');el('ammo').style.color=combat.ammo<6?'#f04b39':'';el('reserve').textContent=combat.reserve;
    el('kills').textContent=String(game.kills).padStart(2,'0');el('wave').textContent=String(game.wave).padStart(2,'0');el('timer').textContent=formatTime(game.elapsed);
    const remaining=game.toSpawn+game.zombies.filter(z=>!z.dead).length;
    el('enemies').textContent=game.mission.readyToBoard?'EVAC READY / BOARD THE HELICOPTER':game.breakLeft>0?`NEXT WAVE IN ${Math.ceil(game.breakLeft)}s`:`${remaining} INFECTED REMAINING`;
    el('reload-status').textContent=combat.reloadLeft>0?'RELOADING…':combat.ammo===0?(combat.reserve>0?'PRESS R TO RELOAD':'FIND AMMO SUPPLIES'):combat.spec.caliber;
    el('reload-track').firstElementChild.style.width=combat.reloadLeft>0?`${(1-combat.reloadLeft/combat.spec.reloadTime)*100}%`:'0%';
    el('weapon-name').textContent=combat.spec.name;el('weapon-type').textContent='/ '+combat.spec.label;
    for(const id of WEAPON_IDS){const slot=el('slot-'+id);slot.classList.toggle('locked',!combat.inventory.has(id));slot.classList.toggle('selected',combat.weaponId===id);}
    const nearHeli=game.mission.index===3&&game.mission.nearHelicopter();const nearLoot=game.mission.nearLoot()&&!game.mission.looted,nearby=game.nearbyWeapon();el('interaction-hint').classList.toggle('hidden',(!nearby&&!nearLoot&&!nearHeli)||game.state!=='playing');if(nearHeli)el('interaction-hint').textContent=game.mission.readyToBoard?'[ E ] BOARD RESCUE HELICOPTER':'CLEAR THE FINAL WAVE TO BOARD';else if(nearLoot)el('interaction-hint').textContent=game.mission.index===3?'[ E ] ACTIVATE EXTRACTION BEACON':'[ E ] SEARCH SUPPLY CACHE';else if(nearby)el('interaction-hint').textContent=`[ E ] UNLOCK ${WEAPONS[nearby.id].name} / ${WEAPONS[nearby.id].label}`;
    const mission=game.mission,s=mission.stage,dx=game.navigation.next.x-player.position.x,dz=game.navigation.next.z-player.position.z;el('chapter-label').textContent=`NORTHBOUND / CHAPTER ${mission.index+1} OF 4`;el('objective-title').textContent=s.name;el('objective-task').textContent=mission.readyToBoard?'[ E ] Board the rescue helicopter':mission.looted?(mission.index===3?'✓ Evacuation beacon online':'✓ Supplies secured'):`${s.action} [E]`;el('objective-combat').textContent=mission.readyToBoard?'✓ Final wave cleared / Evac ready':mission.index===3&&!mission.looted?'Activate beacon to begin the final wave':mission.killsLeft?`Eliminate ${mission.killsLeft} more infected`:'✓ Hostiles cleared · Continue north';el('objective-distance').textContent=`${Math.round(game.navigation.goal.distanceTo(player.position))} m / ${game.navigation.action}`;el('bearing-arrow').style.transform=`rotate(${Math.atan2(dx,-dz)+player.yaw}rad)`;el('level-label').textContent=`SURVIVOR LV ${mission.level}`;el('xp-label').textContent=`${mission.xp} XP`;el('xp-bar').style.width=`${mission.xp%150/150*100}%`;el('hazard-warning').classList.toggle('hidden',!outsideSafeZone(player.position));el('navigation-instruction').textContent=game.navigation.action;this.updateWaypoint(game);el('grenade-count').textContent=game.grenades.count;el('grenade-status').classList.toggle('aiming',game.grenades.aiming);
    el('boost').textContent=player.speedBoost>0?` ↑ ${Math.ceil(player.speedBoost)}s`:'';
    this.announcementTime=Math.max(0,this.announcementTime-dt);if(this.announcementTime===0)el('announcement').style.opacity=0;
    this.toastTime=Math.max(0,this.toastTime-dt);if(this.toastTime===0)el('pickup-toast').style.opacity=0;
    this.hitTime=Math.max(0,this.hitTime-dt);if(this.hitTime===0)el('hitmarker').style.opacity=0;
    this.damageTime=Math.max(0,this.damageTime-dt);el('damage-overlay').style.opacity=this.damageTime*1.2;
    this.mapTick+=dt;if(this.mapTick>.1){this.mapTick=0;this.drawMap(game);}
  }
  updateWaypoint(game){const target=game.navigation.goal.clone();target.y=game.navigation.action.includes('DOORWAY')?2.2:1.5;const relative=target.clone().sub(game.camera.position),forward=game.camera.getWorldDirection(new THREE.Vector3()),projected=target.clone().project(game.camera);const visible=relative.dot(forward)>0&&Math.abs(projected.x)<.9&&Math.abs(projected.y)<.8;const pin=el('world-waypoint');pin.classList.toggle('hidden',!visible||game.state!=='playing'||(game.mission.looted&&!game.mission.readyToBoard));if(visible){pin.style.left=`${(projected.x*.5+.5)*100}%`;pin.style.top=`${(-projected.y*.5+.5)*100}%`;el('waypoint-label').textContent=game.navigation.action.includes('DOORWAY')?'ENTER HERE':game.mission.readyToBoard?'HELICOPTER [E]':game.mission.index===3?'EXTRACTION':'SUPPLY CHEST [E]';}}
  drawMap(game){drawNavigationMap(el('minimap'),game);if(this.mapExpanded){drawNavigationMap(el('tactical-canvas'),game,true);[...el('tactical-objectives').children].forEach((item,i)=>{item.classList.toggle('current',i===game.mission.index);item.classList.toggle('completed',i<game.mission.index);});}}
  gameover(game){el('final-wave').textContent=game.wave;el('final-kills').textContent=game.kills;el('final-time').textContent=formatTime(game.elapsed);let best=game.kills;try{best=Math.max(Number(localStorage.getItem('dead-zone-best'))||0,game.kills);localStorage.setItem('dead-zone-best',String(best));}catch{/* Storage is optional in private browsing. */}el('best-record').textContent=`PERSONAL BEST / ${best} ELIMINATIONS`;this.state('gameover');}
}
