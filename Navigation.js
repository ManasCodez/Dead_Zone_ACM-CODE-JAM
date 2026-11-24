import * as THREE from 'three';

export function findRoute(start,goal,obstacles,bounds={minX:-36,maxX:36,minZ:-270,maxZ:24},step=1.5){
  const w=Math.floor((bounds.maxX-bounds.minX)/step)+1,h=Math.floor((bounds.maxZ-bounds.minZ)/step)+1;
  const blocked=new Uint8Array(w*h);const cell=(x,z)=>({x:bounds.minX+x*step,z:bounds.minZ+z*step});
  for(const o of obstacles){const a=Math.max(0,Math.floor((o.minX-.6-bounds.minX)/step)),b=Math.min(w-1,Math.ceil((o.maxX+.6-bounds.minX)/step)),c=Math.max(0,Math.floor((o.minZ-.6-bounds.minZ)/step)),d=Math.min(h-1,Math.ceil((o.maxZ+.6-bounds.minZ)/step));for(let z=c;z<=d;z++)for(let x=a;x<=b;x++){const p=cell(x,z);if(p.x>o.minX-.6&&p.x<o.maxX+.6&&p.z>o.minZ-.6&&p.z<o.maxZ+.6)blocked[z*w+x]=1;}}
  function nearest(p){const x=THREE.MathUtils.clamp(Math.round((p.x-bounds.minX)/step),0,w-1),z=THREE.MathUtils.clamp(Math.round((p.z-bounds.minZ)/step),0,h-1);for(let r=0;r<6;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const a=x+dx,b=z+dz;if(a>=0&&a<w&&b>=0&&b<h&&!blocked[b*w+a])return b*w+a;}return -1;}
  const first=nearest(start),last=nearest(goal);if(first<0||last<0)return [];
  const scores=new Float64Array(w*h).fill(Infinity),parent=new Int32Array(w*h).fill(-1),closed=new Uint8Array(w*h),heap=[];
  function push(id,score){const item={id,score};heap.push(item);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p].score<=score)break;heap[i]=heap[p];i=p;}heap[i]=item;}
  function pop(){const result=heap[0],item=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1].score<heap[j].score)j++;if(heap[j].score>=item.score)break;heap[i]=heap[j];i=j;}heap[i]=item;}return result.id;}
  scores[first]=0;push(first,0);let found=false;
  while(heap.length){const current=pop();if(closed[current])continue;if(current===last){found=true;break;}closed[current]=1;const x=current%w,z=Math.floor(current/w);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const a=x+dx,b=z+dz;if(a<0||a>=w||b<0||b>=h)continue;const next=b*w+a;if(blocked[next]||closed[next]||(dx&&dz&&(blocked[z*w+a]||blocked[b*w+x])))continue;const cost=scores[current]+Math.hypot(dx,dz);if(cost>=scores[next])continue;scores[next]=cost;parent[next]=current;push(next,cost+Math.hypot(a-last%w,b-Math.floor(last/w)));}}
  if(!found)return [];const result=[];for(let id=last;id!==-1;id=parent[id]){const p=cell(id%w,Math.floor(id/w));result.push(new THREE.Vector3(p.x,.13,p.z));}result.reverse();result.unshift(new THREE.Vector3(start.x,.13,start.z));result.push(new THREE.Vector3(goal.x,.13,goal.z));return result;
}
export class Navigation {
  constructor(game){this.game=game;this.reset();}
  reset(){this.path=[];this.timer=0;this.lastPosition=new THREE.Vector3(Infinity,0,0);this.lastKey='';this.goal=new THREE.Vector3();this.action='FOLLOW ROUTE';}
  chooseGoal(){const g=this.game,m=g.mission,s=m.stage,p=g.player.position,room=g.world.routeRooms[m.index];if(g.campaign?.mode==='endless'){this.action='ENDLESS SURVIVAL / CLEAR INFECTED';return g.zombies.find(z=>!z.dead)?.position.clone()||p.clone();}
    if(m.readyToBoard){this.action='BOARD RESCUE HELICOPTER [E]';return g.helicopter.boardingPosition.clone();}
    if(m.looted&&m.killsLeft){let enemy=null,best=Infinity;for(const z of g.zombies){if(z.dead)continue;const d=z.position.distanceToSquared(p);if(d<best){best=d;enemy=z;}}this.action=enemy?'CLEAR HOSTILES':'HOLD / INFECTED INBOUND';return enemy?enemy.position.clone():m.target;}
    if(room){const inside=Math.abs(p.x-room.x)<5.7&&Math.abs(p.z-room.z)<5.7,entry=new THREE.Vector3(room.front-room.side*2,0,room.z);if(!inside&&entry.distanceTo(p)>2.5){this.action='ENTER LIT DOORWAY';return entry;}this.action='OPEN GOLD SUPPLY CHEST';return new THREE.Vector3(room.x-room.side*1.7,0,room.z);}
    this.action='ACTIVATE EXTRACTION';return m.target;
  }
  update(dt,force=false){const g=this.game;this.timer-=dt;const goal=this.chooseGoal(),key=`${g.mission.index}:${g.mission.looted}:${this.action}`;if(!force&&this.timer>0&&key===this.lastKey&&this.lastPosition.distanceTo(g.player.position)<3)return;this.timer=1.2;this.lastKey=key;this.lastPosition.copy(g.player.position);this.goal.copy(goal);this.path=findRoute(g.player.position,goal,g.world.obstacles);}
  get next(){return this.path.find(p=>p.distanceTo(this.game.player.position)>3)||this.goal;}
}
