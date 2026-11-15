import * as THREE from 'three';

// Reusable tileable surfaces generated locally; no image downloads.
export class Surfaces {
  constructor(){this.maps=new Map();this.materials=new Map();this.seed=4917;}
  random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
  texture(kind){if(this.maps.has(kind))return this.maps.get(kind);const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');c.scale(2,2);c.fillStyle=kind==='brick'?'#a19e94':kind==='wood'?'#c0b39c':kind==='asphalt'?'#a3a7a4':'#c7c8c0';c.fillRect(0,0,256,256);
    if(kind==='brick'){for(let row=0;row<8;row++)for(let col=-1;col<5;col++){const x=col*64+(row%2)*32,y=row*32,v=133+Math.floor(this.random()*42);c.fillStyle=`rgb(${v+12},${v},${v-6})`;c.fillRect(x+2,y+2,60,28);c.fillStyle='#ffffff16';c.fillRect(x+3,y+3,58,2);}}
    if(kind==='wood'){for(let x=0;x<256;x+=64){c.fillStyle='#524d4266';c.fillRect(x,0,3,256);for(let i=0;i<24;i++){c.strokeStyle='#463c2522';c.beginPath();c.moveTo(x+5+this.random()*55,0);c.bezierCurveTo(x+this.random()*64,80,x+this.random()*64,160,x+this.random()*64,256);c.stroke();}}}
    const data=c.getImageData(0,0,512,512);for(let i=0;i<data.data.length;i+=4){const n=(this.random()-.5)*(kind==='asphalt'?44:25);for(let k=0;k<3;k++)data.data[i+k]=Math.max(0,Math.min(255,data.data[i+k]+n));}c.putImageData(data,0,0);
    if(kind!=='wood'){for(let i=0;i<30;i++){const x=this.random()*256,y=this.random()*256,r=8+this.random()*30;const gradient=c.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,'#17221918');gradient.addColorStop(1,'#17221900');c.fillStyle=gradient;c.fillRect(x-r,y-r,r*2,r*2);}for(let i=0;i<4;i++){c.strokeStyle='#242c2445';c.lineWidth=.6;let x=this.random()*256,y=this.random()*256;c.beginPath();c.moveTo(x,y);for(let n=0;n<7;n++){x+=(this.random()-.4)*14;y+=7+this.random()*9;c.lineTo(x,y);}c.stroke();}}
    const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;this.maps.set(kind,texture);return texture;
  }
  apply(mesh,kind,tint='#ffffff'){const key=kind+tint;if(!this.materials.has(key)){const map=this.texture(kind);this.materials.set(key,new THREE.MeshStandardMaterial({color:tint,map,bumpMap:map,bumpScale:kind==='brick'?.09:.035,roughness:kind==='wood'?.86:.94}));}mesh.material=this.materials.get(key);const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,uv=mesh.geometry.attributes.uv;for(let i=0;i<p.count;i++){const x=p.getX(i)+mesh.position.x,y=p.getY(i)+mesh.position.y,z=p.getZ(i)+mesh.position.z;const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv.setXY(i,(nx>.5?z:x)*.5,(ny>.5?z:y)*.5);}uv.needsUpdate=true;return mesh;}
}
