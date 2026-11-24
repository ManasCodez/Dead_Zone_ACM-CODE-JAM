import * as THREE from 'three';

export const ROUTE_STAGES=[
  {name:'ASH STREET CLINIC',action:'Search the clinic',x:-28,z:-23,weapon:'smg',kills:2},
  {name:'NORTH BLOCK ARMORY',action:'Raid the armory',x:22,z:-89,weapon:'shotgun',kills:3},
  {name:'RELAY SAFEHOUSE',action:'Recover the evacuation codes',x:-22,z:-174,weapon:'lmg',kills:3},
  {name:'NORTH EXTRACTION',action:'Activate the extraction beacon',x:0,z:-260,kills:4}
];
export function outsideSafeZone(p){return Math.abs(p.x)>38||p.z>26||p.z< -272;}
export class Mission {
  constructor(game){this.game=game;this.marker=new THREE.Group();const m=new THREE.MeshBasicMaterial({color:'#ffd275',transparent:true,opacity:.7,depthWrite:false});const ring=new THREE.Mesh(new THREE.TorusGeometry(1.2,.08,6,32),m);ring.rotation.x=Math.PI/2;this.marker.add(ring);const arrow=new THREE.Mesh(new THREE.ConeGeometry(.55,1.1,4),m);arrow.rotation.z=Math.PI;arrow.position.y=5.3;this.marker.add(arrow);game.scene.add(this.marker);this.reset();}
  reset(){this.index=0;this.looted=false;this.killStart=0;this.complete=false;this.readyToBoard=false;this.finalWaveStarted=false;this.game.helicopter?.setReady(false);this.hazardTime=0;this.xp=0;this.level=1;this.updateMarker();}
  get stage(){return ROUTE_STAGES[Math.min(this.index,ROUTE_STAGES.length-1)];}
  get target(){return new THREE.Vector3(this.stage.x,0,this.stage.z);}
  get killsLeft(){if(this.index===3&&this.finalWaveStarted)return (this.game.toSpawn||0)+(this.game.zombies||[]).filter(z=>!z.dead).length;return Math.max(0,this.stage.kills-(this.game.kills-this.killStart));}
  nearLoot(){return !this.complete&&Math.hypot(this.game.player.position.x-this.stage.x,this.game.player.position.z-this.stage.z)<2;}
  interact(){if(!this.nearLoot()||this.looted)return false;this.looted=true;this.marker.visible=false;const g=this.game;g.world.setCacheOpened?.(this.index,true);if(g.stats)g.stats.objectives++;g.player.health=Math.min(g.player.maxHealth||100,g.player.health+25);g.combat.reserve=Math.min(360,g.combat.reserve+90);g.grenades.count=Math.min(g.grenades.maxCount||6,g.grenades.count+2);g.sound.play('pickup');if(this.index===3){this.finalWaveStarted=true;g.beginFinalWave?.();}g.ui.toast(this.index===3?'BEACON ONLINE / CLEAR THE FINAL WAVE':'SUPPLIES SECURED / +25 HP · +90 AMMO · +2 GRENADES');return true;}
  nearHelicopter(){const point=this.game.helicopter?.boardingPosition;return Boolean(point&&Math.hypot(this.game.player.position.x-point.x,this.game.player.position.z-point.z)<2.4);}
  board(){if(!this.readyToBoard||this.complete||!this.nearHelicopter()||this.game.state!=='playing')return false;if(!this.game.extraction.start())return false;this.complete=true;this.marker.visible=false;return true;}
  awardKill(){this.awardXP(25);}
  awardXP(amount){this.xp+=amount;const next=1+Math.floor(this.xp/150);if(next>this.level){this.level=next;this.game.player.health=Math.min(this.game.player.maxHealth||100,this.game.player.health+15);this.game.ui.toast(`SURVIVOR LEVEL ${this.level} / +15 HP`);}}
  updateMarker(){this.marker.visible=!this.complete&&(!this.looted||this.readyToBoard);if(this.readyToBoard)this.marker.position.copy(this.game.helicopter.boardingPosition).setY(.12);else this.marker.position.set(this.stage.x,.12,this.stage.z);}
  update(dt){const g=this.game;if(outsideSafeZone(g.player.position)){this.hazardTime+=dt;while(this.hazardTime>=1&&g.state==='playing'){this.hazardTime-=1;g.damage(10);}}else this.hazardTime=0;
    if(g.campaign?.mode==='endless'){this.marker.visible=false;return;}const room=g.world.routeRooms?.[this.index],inside=room&&Math.abs(g.player.position.x-room.x)<5.7&&Math.abs(g.player.position.z-room.z)<5.7;this.marker.children[1].position.y=(inside?2.7:5.3)+Math.sin(g.elapsed*3)*.25;
    if(this.complete||g.state!=='playing')return;
    if(this.index===3){if(this.looted&&this.finalWaveStarted&&!this.readyToBoard&&this.killsLeft===0){this.readyToBoard=true;g.helicopter.setReady(true);this.updateMarker();g.ui.announce('FINAL WAVE CLEARED / EVAC READY','BOARD THE HELICOPTER',4);g.ui.toast('FOLLOW THE ARROW TO THE OPEN DOOR / PRESS E TO BOARD');g.sound.play('wave');}return;}
    if(!this.looted||this.killsLeft>0)return;
    this.awardXP(75);this.index++;g.campaign?.requestCheckpoint(this.index-1);this.looted=false;this.killStart=g.kills;this.updateMarker();g.ui.announce(`CHAPTER ${this.index+1} / PUSH NORTH`,this.stage.name,3.8);g.sound.play('wave');
    // Each destination has an ambush, so advancing always includes a fight.
    if(this.index<3)g.spawnAmbush(this.target,Math.max(3,this.stage.kills));
  }
}
