import * as THREE from 'three';

const cache=new Map();
const clamp=THREE.MathUtils.clamp;
function hash(x,y){let n=Math.imul(x+31,374761393)^Math.imul(y+17,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}

// Shared, deterministic PBR tiles. Only base color uses sRGB; normal and roughness are linear data.
export function materialMaps(kind){
  if(cache.has(kind))return cache.get(kind);
  const size=256,albedo=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4),height=new Float32Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,n=hash(x,y),macro=Math.sin(x/size*Math.PI*4)*Math.cos(y/size*Math.PI*6),cloud=Math.sin(x/size*Math.PI*10+y/size*Math.PI*4)*.5;
    let value=219+(n-.5)*15+macro*2,relief=n*.15,roughness=.88;
    if(kind==='brick'){
      const row=Math.floor(y/32),bx=(x+(row%2)*32)%64,by=y%32,mortar=bx<2||by<2,variation=hash(Math.floor((x+(row%2)*32)/64)%4,row)*22;
      value=mortar?145:211+variation+(n-.5)*15+macro*2;relief=mortar?.08:.65+n*.06;roughness=mortar?.98:.88;
    }else if(kind==='asphalt'){
      const crack=Math.abs(Math.sin(y/256*Math.PI*2)*9+Math.sin(y/256*Math.PI*8)*2-(x%128-64))<.38;
      value=crack?142:207+(n-.5)*38+macro*2+cloud*2;relief=crack?0:.4+n*.16;roughness=.89+n*.1;
    }else if(kind==='wood'){
      const grain=Math.sin(x*.55+Math.sin(y/256*Math.PI*4)*1.3);value=209+grain*15+macro*9+(n-.5)*9;relief=.4+grain*.05;roughness=.83+n*.1;
    }else if(kind==='cloth'){
      const weave=(x%4<2?1:-1)*(y%4<2?1:-1);value=231+weave*7+(n-.5)*7;relief=.5+weave*.055;roughness=.95;
    }else if(kind==='skin'){
      value=234+(n-.5)*12+macro*4;relief=.5+(n-.5)*.045;roughness=.68+n*.1;
    }else if(kind==='metal'){
      const scratch=hash(x,Math.floor(y/48))>.986;value=218+macro*10+(n-.5)*9+(scratch?22:0);relief=.5+(scratch?-.025:0);roughness=.48+macro*.09+(scratch?-.18:0);
    }else {const pit=n<.02;value=230+macro*2+cloud*2+(n-.5)*13-(pit?22:0);relief=pit?.2:.5+n*.025;roughness=.93;}
    height[i]=relief;for(let c=0;c<3;c++){albedo[i*4+c]=clamp(value+(kind==='wood'?[7,0,-10][c]:kind==='skin'?[3,0,-4][c]:0),0,255);rough[i*4+c]=roughness*255;}albedo[i*4+3]=rough[i*4+3]=255;
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size],dy=height[((y+1)%size)*size+x]-height[((y+size-1)%size)*size+x],v=new THREE.Vector3(-dx*2,-dy*2,1).normalize(),i=(y*size+x)*4;
    normal[i]=(v.x*.5+.5)*255;normal[i+1]=(v.y*.5+.5)*255;normal[i+2]=(v.z*.5+.5)*255;normal[i+3]=255;
  }
  const texture=(data,color=false)=>{const t=new THREE.DataTexture(data,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.anisotropy=4;t.needsUpdate=true;t.name=`local-${kind}-${color?'color':'data'}`;return t;};
  const maps={map:texture(albedo,true),normalMap:texture(normal),roughnessMap:texture(rough)};cache.set(kind,maps);return maps;
}
export function applyMaterialDetail(material,kind,normalStrength=.35){Object.assign(material,materialMaps(kind));material.bumpMap=null;material.normalScale.setScalar(normalStrength);material.needsUpdate=true;material.userData.surface=kind;return material;}
