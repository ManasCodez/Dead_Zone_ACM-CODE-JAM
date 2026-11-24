export class SpatialHash {
  constructor(size=4){this.size=size;this.cells=new Map();}
  rebuild(items){this.cells.clear();for(const item of items){if(item.dead)continue;const p=item.position,key=`${Math.floor(p.x/this.size)},${Math.floor(p.z/this.size)}`;if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(item);}}
  nearby(p,radius=4){const result=[],s=this.size;for(let x=Math.floor((p.x-radius)/s);x<=Math.floor((p.x+radius)/s);x++)for(let z=Math.floor((p.z-radius)/s);z<=Math.floor((p.z+radius)/s);z++)result.push(...(this.cells.get(`${x},${z}`)||[]));return result;}
}
