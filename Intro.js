import introUrl from './intro.mp4?url';

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export class Intro {
  constructor(game){this.game=game;this.overlay=document.getElementById('intro-screen');this.video=document.getElementById('intro-video');this.fade=document.getElementById('intro-fade');this.resumeButton=document.getElementById('intro-resume');this.video.src=introUrl;this.active=false;this.finishing=false;this.frame=0;
    this.video.addEventListener('ended',()=>this.finish());this.video.addEventListener('error',()=>{if(this.active)this.finish();});
    document.getElementById('intro-skip').addEventListener('click',()=>this.finish());this.resumeButton.addEventListener('click',()=>this.tryPlay());
    document.addEventListener('visibilitychange',()=>{if(!this.active||this.finishing)return;if(document.hidden)this.video.pause();else this.tryPlay();});
  }
  play(){if(this.active||this.game.state!=='menu')return;this.active=true;this.finishing=false;this.game.state='intro';this.game.keys.clear();this.game.shooting=false;this.game.ui.state('intro');this.game.sound.unlock();this.game.sound.music?.setActive(false);this.overlay.classList.remove('hidden','intro-leaving');this.fade.style.transition='none';this.fade.style.opacity='0';this.video.currentTime=0;this.video.volume=1;document.getElementById('intro-skip').style.opacity='1';document.getElementById('intro-skip').style.pointerEvents='auto';document.body.classList.add('intro-playing');document.getElementById('intro-skip').focus();if(this.video.error){this.finish();return;}this.tryPlay();this.updateFade();}
  tryPlay(){if(!this.active||this.finishing||document.hidden)return;this.resumeButton.classList.add('hidden');this.video.play().catch(()=>{if(this.active&&!this.finishing){if(this.video.error)this.finish();else this.resumeButton.classList.remove('hidden');}});}
  updateFade(){if(!this.active||this.finishing)return;const remaining=this.video.duration-this.video.currentTime;const progress=Number.isFinite(remaining)?Math.max(0,Math.min(1,1-remaining)):0;this.fade.style.opacity=String(progress);this.video.volume=1-progress;document.getElementById('intro-skip').style.opacity=String(1-progress);this.frame=requestAnimationFrame(()=>this.updateFade());}
  async finish(){if(!this.active||this.finishing)return;this.finishing=true;document.getElementById('intro-skip').style.opacity='0';document.getElementById('intro-skip').style.pointerEvents='none';cancelAnimationFrame(this.frame);this.resumeButton.classList.add('hidden');this.fade.style.transition='opacity 700ms ease-in-out';this.fade.style.opacity='1';this.video.volume=0;
    await wait(750);this.video.pause();if(document.hidden)await new Promise(resolve=>{const visible=()=>{if(!document.hidden){document.removeEventListener('visibilitychange',visible);resolve();}};document.addEventListener('visibilitychange',visible);});
    this.game.start({captureMouse:false});this.overlay.classList.add('intro-leaving');await wait(400);this.overlay.classList.add('hidden');document.body.classList.remove('intro-playing');this.active=false;this.finishing=false;document.getElementById('lock-hint').classList.remove('hidden');this.game.canvas.focus();
  }
}
