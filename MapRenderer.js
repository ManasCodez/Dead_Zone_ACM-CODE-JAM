import {ROUTE_STAGES} from './Mission.js';
const NAMES=['CLINIC','ARMORY','SAFEHOUSE','EXTRACTION'];
export function drawNavigationMap(canvas,game,expanded=false){
  const c=canvas.getContext('2d'),ratio=expanded?1:2,w=canvas.width/ratio,h=canvas.height/ratio,scale=expanded?Math.min((w-70)/96,(h-70)/220):3.1;
  const center=expanded?{x:0,z:-80}:game.player.position;
  const point=(x,z)=>({x:w/2+(x-center.x)*scale,y:h/2+(z-center.z)*scale});
  c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,w,h);c.fillStyle='#0d1e20';c.fillRect(0,0,w,h);c.save();
  const rect=(x,z,width,depth,fill)=>{const p=point(x,z);c.fillStyle=fill;c.fillRect(p.x-width*scale/2,p.y-depth*scale/2,width*scale,depth*scale);};
  rect(0,-79,76,210,'#172b2a');rect(0,-79,20,210,'#283d39');rect(0,4,76,16,'#283d39');
  c.strokeStyle='#799d8d18';c.lineWidth=1;for(let x=-60;x<=60;x+=10){const a=point(x,-200),b=point(x,45);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}for(let z=-200;z<=45;z+=10){const a=point(-65,z),b=point(65,z);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
  c.strokeStyle='#b36d4d88';c.setLineDash([5,5]);const safe=point(-38,-184);c.strokeRect(safe.x,safe.y,76*scale,210*scale);c.setLineDash([]);
  for(const o of game.world.obstacles){const a=point(o.minX,o.minZ);c.fillStyle='#71897b44';c.fillRect(a.x,a.y,(o.maxX-o.minX)*scale,(o.maxZ-o.minZ)*scale);c.strokeStyle='#8b9e8b44';c.strokeRect(a.x,a.y,(o.maxX-o.minX)*scale,(o.maxZ-o.minZ)*scale);}
  if(expanded){c.strokeStyle='#a1b8a355';c.lineWidth=2;c.setLineDash([6,6]);c.beginPath();let p=point(0,8);c.moveTo(p.x,p.y);for(const s of ROUTE_STAGES){p=point(0,s.z);c.lineTo(p.x,p.y);p=point(s.x,s.z);c.lineTo(p.x,p.y);p=point(0,s.z);c.lineTo(p.x,p.y);}c.stroke();c.setLineDash([]);}
  const path=game.navigation.path;if(path.length){c.strokeStyle='#ffd47c';c.lineWidth=expanded?3:2.5;c.beginPath();path.forEach((v,i)=>{const p=point(v.x,v.z);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);});c.stroke();}
  for(const [i,s] of ROUTE_STAGES.entries()){
    const p=point(s.x,s.z),active=i===game.mission.index,color=active?'#ffdc84':i<game.mission.index?'#83b69b':'#7caea3';
    if(i<3){rect(s.x,s.z,12,12,active?'#b2934355':'#3c76644d');c.strokeStyle=color;c.lineWidth=active?3:1.5;c.strokeRect(p.x-6*scale,p.y-6*scale,12*scale,12*scale);const room=game.world.routeRooms[i],entry=point(room.front-room.side,room.z);c.fillStyle='#eaf5d3';c.beginPath();c.arc(entry.x,entry.y,3,0,Math.PI*2);c.fill();c.fillStyle=color;c.fillRect(p.x-5,p.y-4,10,8);c.strokeStyle='#0d1e20';c.beginPath();c.moveTo(p.x-4,p.y-1);c.lineTo(p.x+4,p.y-1);c.stroke();}
    else{c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.arc(p.x,p.y,9,0,Math.PI*2);c.stroke();}
    c.font=`bold ${expanded?14:11}px Arial`;c.textAlign='center';c.fillStyle=color;c.shadowColor='#000';c.shadowBlur=4;c.fillText(`${i+1} ${NAMES[i]}`,p.x,p.y-6*scale-8);c.shadowBlur=0;
  }
  if(game.helicopter){const heli=point(game.helicopter.group.position.x,game.helicopter.group.position.z);c.strokeStyle=game.mission.readyToBoard?'#ffe09a':'#96ccb1';c.lineWidth=2;c.strokeRect(heli.x-5,heli.y-7,10,14);c.beginPath();c.moveTo(heli.x-11,heli.y-2);c.lineTo(heli.x+11,heli.y-2);c.moveTo(heli.x,heli.y+7);c.lineTo(heli.x,heli.y+13);c.stroke();c.font='bold 9px Arial';c.textAlign='center';c.fillStyle=c.strokeStyle;c.fillText('HELI',heli.x,heli.y+25);}
  for(const p of game.world.pickups){const a=point(p.group.position.x,p.group.position.z);c.fillStyle=p.type==='health'?'#9dddac':'#a9bd90';c.fillRect(a.x-2,a.y-2,4,4);}
  for(const p of game.world.weaponPickups){const a=point(p.group.position.x,p.group.position.z);c.fillStyle='#ffe49c';c.beginPath();c.moveTo(a.x,a.y-4);c.lineTo(a.x+4,a.y);c.lineTo(a.x,a.y+4);c.lineTo(a.x-4,a.y);c.closePath();c.fill();}
  for(const z of game.zombies){if(z.dead)continue;const a=point(z.position.x,z.position.z);c.fillStyle=z.type==='tank'?'#ffb86b':'#f97a60';c.beginPath();c.arc(a.x,a.y,expanded?3:3.5,0,Math.PI*2);c.fill();}
  const p=point(game.player.position.x,game.player.position.z);c.save();c.translate(p.x,p.y);c.rotate(-game.player.yaw);c.fillStyle='#f4f8de';c.shadowColor='#bbefd0';c.shadowBlur=8;c.beginPath();c.moveTo(0,-9);c.lineTo(-6,7);c.lineTo(0,4);c.lineTo(6,7);c.closePath();c.fill();c.restore();
  if(expanded){c.font='bold 12px Arial';c.textAlign='left';c.fillStyle='#dce7d5';c.fillText('N ↑',20,25);c.fillStyle='#8ba99b';c.fillText('NORTHBOUND / SECTOR 07',20,h-18);}else{c.font='bold 12px Arial';c.fillStyle='#dbe6cf';c.fillText('N ↑',12,20);c.fillStyle='#a4bba7';c.font='10px Arial';c.fillText('100 m',w-49,h-12);}
  c.restore();
}
