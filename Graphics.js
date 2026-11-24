import * as THREE from 'three';
import {EffectComposer,RenderPass,EffectPass,Effect,BloomEffect,SSAOEffect,VignetteEffect,ToneMappingEffect,ToneMappingMode} from 'postprocessing';

export const GRAPHICS_PRESETS=Object.freeze({
  low:{maxPixels:1800000,ratio:1,shadows:false,shadowSize:512,lod:20,particles:.45,post:false,samples:0,fog:.018,ao:0,bloom:0},
  balanced:{maxPixels:2500000,ratio:1.3,shadows:true,shadowSize:1024,lod:30,particles:.75,post:true,samples:2,fog:.015,ao:.26,bloom:.22},
  high:{maxPixels:3700000,ratio:1.6,shadows:true,shadowSize:2048,lod:42,particles:1,post:true,samples:4,fog:.013,ao:.36,bloom:.3}
});

export function boundedPixelRatio(width,height,requested,preset){return Math.min(requested,preset.ratio,Math.sqrt(preset.maxPixels/Math.max(1,width*height)));}

// The DOM HUD stays outside the post pipeline, so its labels and crosshair remain sharp.
export class Graphics {
  constructor(game){
    this.game=game;this.renderer=game.renderer;this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.hdrSupported=this.renderer.extensions.has('EXT_color_buffer_float');this.renderer.info.autoReset=false;this.quality=null;this.environment();
    this.composer=null;this.composerSize=new THREE.Vector2();this.contextLost=false;
    this.onContextLost=e=>{e.preventDefault();this.contextLost=true;this.releaseComposer();};
    this.onContextRestored=()=>{this.contextLost=false;this.hdrSupported=this.renderer.extensions.has('EXT_color_buffer_float');if(this.settings)this.configure(this.settings);};
    this.renderer.domElement.addEventListener('webglcontextlost',this.onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored',this.onContextRestored);
    this.contacts();
  }
  environment(){
    const {scene,world}=this.game,c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,512);
    for(const [stop,color] of [[0,'#020610'],[.3,'#0b1828'],[.49,'#24384b'],[.55,'#14283a'],[1,'#050c17']])gradient.addColorStop(stop,color);
    ctx.fillStyle=gradient;ctx.fillRect(0,0,1024,512);
    // Deterministic cloud bands and moon; the night sky stays local and asset-free.
    for(let n=0;n<48;n++){const x=(n*193)%1024,y=75+(n*41)%140,r=35+(n%5)*14,g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#8fa8be12');g.addColorStop(1,'#8fa8be00');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
    const moon=ctx.createRadialGradient(735,106,3,735,106,56);moon.addColorStop(0,'#e5efffd9');moon.addColorStop(.23,'#c7d9f27a');moon.addColorStop(1,'#b6c9e900');ctx.fillStyle=moon;ctx.fillRect(679,50,112,112);
    const sky=new THREE.CanvasTexture(c);sky.colorSpace=THREE.SRGBColorSpace;sky.mapping=THREE.EquirectangularReflectionMapping;this.sky=sky;
    const pmrem=new THREE.PMREMGenerator(this.renderer);this.environmentTarget=pmrem.fromEquirectangular(sky);pmrem.dispose();scene.environment=this.environmentTarget.texture;scene.environmentIntensity=.38;scene.background=sky;scene.backgroundIntensity=.85;scene.backgroundBlurriness=.05;scene.fog.color.set('#101e2b');
    scene.traverse(o=>{if(o.isHemisphereLight){o.color.set('#829eb4');o.groundColor.set('#1b252d');o.intensity=1.05;}});
    world.sun.color.set('#afc8e2');world.sun.intensity=1.4;world.sun.shadow.normalBias=.025;world.sun.shadow.bias=-.00008;world.sun.shadow.camera.left=world.sun.shadow.camera.bottom=-34;world.sun.shadow.camera.right=world.sun.shadow.camera.top=34;world.sun.shadow.camera.updateProjectionMatrix();
    const survivorFill=new THREE.PointLight('#8caec4',2.8,4.5,2);survivorFill.position.set(.35,1.9,.65);
    this.survivorFill={light:survivorFill,anchor:this.game.player.mesh};world.lightSources.push(this.survivorFill);
    this.renderer.toneMappingExposure=1.25;
  }
  contacts(){
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,uniforms:{},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;void main(){float a=1.-smoothstep(.08,.5,length(vUv-.5));gl_FragColor=vec4(.035,.045,.055,a*.23);}`});
    this.contactShadows=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),material,44);this.contactShadows.name='bounded-character-contact-shadows';this.contactShadows.frustumCulled=false;this.contactShadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.contactShadows.count=0;this.game.scene.add(this.contactShadows);this.transform=new THREE.Object3D();
  }
  configure(settings){
    const preset=GRAPHICS_PRESETS[settings.quality];this.settings=settings;this.preset={...preset,post:preset.post&&this.hdrSupported,samples:Math.min(preset.samples,this.renderer.capabilities.maxSamples)};
    if(this.quality!==settings.quality){this.quality=settings.quality;this.game.world.sun.shadow.map?.dispose();this.game.world.sun.shadow.map=null;this.game.world.sun.shadow.mapSize.setScalar(preset.shadowSize);this.game.world.sun.shadow.needsUpdate=true;}
    this.renderer.toneMapping=this.preset.post?THREE.NoToneMapping:THREE.ACESFilmicToneMapping;
    this.renderer.autoClear=!this.preset.post;
    if(!this.preset.post){this.releaseComposer();}else if(!this.composer||this.composer.multisampling!==this.preset.samples){this.buildComposer();}
    this.resize();this.game.scene.fog.density=preset.fog;
    if(this.ao)this.ao.uniforms.get('intensity').value=preset.ao;
    if(this.bloom)this.bloom.intensity=settings.reducedFlash?0:preset.bloom;
  }
  buildComposer(){
    this.releaseComposer();const {scene,camera}=this.game;
    this.composer=new EffectComposer(this.renderer,{frameBufferType:THREE.HalfFloatType,multisampling:this.preset.samples,depthBuffer:true});
    this.ao=new SSAOEffect(camera,null,{samples:this.quality==='high'?9:6,rings:7,resolutionScale:.5,radius:.06,intensity:this.preset.ao,luminanceInfluence:.75});
    this.bloom=new BloomEffect({luminanceThreshold:1.4,luminanceSmoothing:.18,intensity:this.preset.bloom,radius:.45,levels:5});
    this.grade=new Effect('DeadZoneGrade',`
      uniform float injury;
      void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){
        vec3 color=inputColor.rgb;
        float luma=dot(color,vec3(.2126,.7152,.0722));
        color=mix(color,vec3(luma),.045+injury*.22);
        float shadow=1.-smoothstep(.08,1.2,luma);
        color*=mix(vec3(1.),vec3(.95,1.,1.05),shadow*.22);
        float edge=smoothstep(.32,.75,length((uv-.5)*vec2(1.,.8)));
        color*=mix(vec3(1.),vec3(1.08,.68,.67),injury*edge*.55);
        outputColor=vec4(color,inputColor.a);
      }`,{uniforms:new Map([['injury',new THREE.Uniform(0)]])});
    this.vignette=new VignetteEffect({offset:.45,darkness:.22});
    this.tone=new ToneMappingEffect({mode:ToneMappingMode.ACES_FILMIC});
    this.composer.addPass(new RenderPass(scene,camera));
    this.composer.addPass(new EffectPass(camera,this.ao,this.bloom,this.grade,this.vignette));
    this.composer.addPass(new EffectPass(camera,this.tone));
  }
  releaseComposer(){
    // SSAO owns a generated noise texture inside its material; Effect.dispose only
    // traverses direct properties, so release this nested texture explicitly.
    this.ao?.ssaoMaterial.uniforms.noiseTexture.value?.dispose();
    if(this.composer){this.composer.dispose();this.composer=null;}
    this.ao=null;this.bloom=null;this.grade=null;this.vignette=null;this.tone=null;this.composerSize.set(0,0);
  }
  resize(){
    if(!this.preset)return;const viewport=this.renderer.getSize(new THREE.Vector2()),ratio=boundedPixelRatio(viewport.x,viewport.y,this.renderer.getPixelRatio(),this.preset);if(ratio<this.renderer.getPixelRatio())this.renderer.setPixelRatio(ratio);const size=this.renderer.getDrawingBufferSize(new THREE.Vector2());
    if(!this.composer||this.composerSize.equals(size))return;
    // Composer.setSize expects CSS pixels and updates the renderer as well.
    this.composer.setSize(viewport.x,viewport.y,false);this.composerSize.copy(size);
  }
  update(dt,time){
    const g=this.game,actors=[g.player,...g.zombies.filter(z=>!z.dead)].slice(0,44);let count=0;
    for(const actor of actors){if(actor.mesh?.visible===false)continue;const p=actor.position;if(p.distanceToSquared(g.camera.position)>55*55)continue;const scale=actor.radius?actor.radius*3:1.35;this.transform.position.set(p.x,.065,p.z);this.transform.rotation.set(-Math.PI/2,0,0);this.transform.scale.set(scale,scale*.7,1);this.transform.updateMatrix();this.contactShadows.setMatrixAt(count++,this.transform.matrix);}
    this.contactShadows.count=count;this.contactShadows.instanceMatrix.needsUpdate=true;
    g.world.dust.position.z=g.camera.position.z;g.world.dust.material.opacity=this.settings?.reducedMotion?0:.28;
    g.environmentArt?.update(dt,time,this.settings);
    if(this.vignette){const injury=g.state==='playing'?Math.max(0,1-g.player.health/(g.player.maxHealth||100)*2):0;this.vignette.darkness=.22+injury*.28;this.grade.uniforms.get('injury').value=injury;}
  }
  render(){
    if(this.contextLost)return;const {scene,camera}=this.game,r=this.renderer;r.info.reset();
    if(!this.preset?.post){r.setRenderTarget(null);r.render(scene,camera);return;}
    this.resize();this.composer.render();
  }
  dispose(){this.renderer.domElement.removeEventListener('webglcontextlost',this.onContextLost);this.renderer.domElement.removeEventListener('webglcontextrestored',this.onContextRestored);this.releaseComposer();const sources=this.game.world.lightSources,index=sources.indexOf(this.survivorFill);if(index>=0)sources.splice(index,1);this.environmentTarget.dispose();this.sky.dispose();this.contactShadows.geometry.dispose();this.contactShadows.material.dispose();this.contactShadows.removeFromParent();}
}
