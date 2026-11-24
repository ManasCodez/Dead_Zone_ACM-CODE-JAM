import * as THREE from 'three';
export const GRENADE_STEP=.01;
// Preview and live throws advance through the very same fixed-size steps.
export function stepGrenade(state,dt,collision){
  if(state.landed)return;
  const next=state.position.clone().addScaledVector(state.velocity,dt);next.y-=6*dt*dt;
  const hit=collision(state.position,next);
  state.velocity.y-=12*dt;
  if(hit){
    const point=hit.point||hit,normal=hit.normal||new THREE.Vector3(0,1,0);state.position.copy(point).addScaledVector(normal,.025);
    const normalSpeed=state.velocity.dot(normal);if(normalSpeed<0)state.velocity.addScaledVector(normal,-(1+(normal.y>.7?.28:.4))*normalSpeed);
    state.velocity.multiplyScalar(normal.y>.7?.66:.8);state.bounces=(state.bounces||0)+1;
    if(state.velocity.length()<1.1||state.bounces>=6){state.landed=true;state.velocity.set(0,0,0);}
  }else state.position.copy(next);
}
