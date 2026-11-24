import * as THREE from 'three';

// Clip the whole camera volume, including the smoothing path, against solid walls.
export function clipCamera(pivot, desired, obstacles, radius = .24) {
  const delta = desired.clone().sub(pivot);
  let fraction = 1;
  for (const box of obstacles) {
    let near = 0, far = 1;
    for (const [axis, min, max] of [
      ['x', box.minX-radius, box.maxX+radius],
      ['y', (box.minY ?? -.3)-radius, (box.maxY ?? 4)+radius],
      ['z', box.minZ-radius, box.maxZ+radius]
    ]) {
      if (Math.abs(delta[axis]) < 1e-8) {
        if (pivot[axis] < min || pivot[axis] > max) { near=2; break; }
      } else {
        const a=(min-pivot[axis])/delta[axis], b=(max-pivot[axis])/delta[axis];
        near=Math.max(near,Math.min(a,b)); far=Math.min(far,Math.max(a,b));
      }
    }
    if (near<=far && far>=0 && near>0) fraction=Math.min(fraction,Math.max(0,near-.015));
  }
  return pivot.clone().addScaledVector(delta,fraction);
}

export class CameraRig {
  constructor(player) { this.player=player; this.ray=new THREE.Raycaster(); }
  constrain(pivot,desired) {
    const p=this.player, delta=desired.clone().sub(pivot), distance=delta.length();
    let result=clipCamera(pivot,desired,p.world.obstacles||[]);
    if(distance>.01){
      this.ray.set(pivot,delta.normalize());this.ray.far=distance+.25;
      const hit=this.ray.intersectObjects(p.world.solids||[],false)[0];
      if(hit && hit.distance<result.distanceTo(pivot)+.25) result=pivot.clone().addScaledVector(delta,Math.max(.15,hit.distance-.28));
    }
    return result;
  }
}
