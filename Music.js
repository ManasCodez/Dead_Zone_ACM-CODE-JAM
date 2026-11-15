// Original 144 BPM industrial score, synthesized locally without audio assets.
export class Music {
  constructor(context,output){this.context=context;this.bus=context.createGain();this.bus.gain.value=0;this.bus.connect(output);this.active=false;this.muted=false;this.step=0;this.next=0;this.intensity=1;this.noise=context.createBuffer(1,context.sampleRate*.3,context.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
  setActive(active,restart=false){this.active=active;if(restart){this.step=0;this.next=this.context.currentTime+.04;}if(active&&this.next<this.context.currentTime)this.next=this.context.currentTime+.04;this.applyVolume();}
  toggle(){this.muted=!this.muted;this.applyVolume();return this.muted;}
  applyVolume(){const t=this.context.currentTime;this.bus.gain.cancelScheduledValues(t);this.bus.gain.setTargetAtTime(this.active&&!this.muted?.62:0,t,.05);}
  note(frequency,time,duration,volume,type='sawtooth',cutoff=900,end=frequency){const c=this.context,o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();o.type=type;o.frequency.setValueAtTime(frequency,time);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),time+duration);f.type='lowpass';f.frequency.value=cutoff;g.gain.setValueAtTime(.001,time);g.gain.linearRampToValueAtTime(volume,time+.008);g.gain.exponentialRampToValueAtTime(.001,time+duration);o.connect(f);f.connect(g);g.connect(this.bus);o.start(time);o.stop(time+duration+.02);o.onended=()=>{o.disconnect();f.disconnect();g.disconnect();};}
  percussion(time,duration,volume,highpass){const c=this.context,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;f.type='highpass';f.frequency.value=highpass;g.gain.setValueAtTime(volume,time);g.gain.exponentialRampToValueAtTime(.001,time+duration);s.connect(f);f.connect(g);g.connect(this.bus);s.start(time);s.stop(time+duration);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};}
  update(wave=1){if(!this.active||this.muted||this.context.state!=='running')return;const now=this.context.currentTime;if(this.next<now-.15)this.next=now+.02;const stepDuration=60/144/4;while(this.next<now+.14){const s=this.step%16,bar=Math.floor(this.step/16),t=this.next;const root=[55,55,49,51.913][Math.floor(bar/2)%4];
      if(s%4===0||s===10)this.note(145,t,.17,.9,'sine',1200,36);
      if(s===4||s===12){this.percussion(t,.14,.3,900);this.note(175,t,.09,.17,'triangle',1800,90);}
      if(s%2===0||wave>2)this.percussion(t,.025,s%4===2?.11:.055,6500);
      if(s%2===0)this.note(root*(s===14?2:1),t,.13,.24,'sawtooth',500+Math.min(wave,10)*65);
      const minor=[0,7,12,3,10,7,15,12];if(s%2===1){const freq=root*4*2**(minor[(s>>1)%8]/12);this.note(freq,t,.12,.055,'square',1400);}
      if(s===0&&bar%2===0){this.note(root*2,t,.75,.09,'triangle',700);this.note(root*2*2**(3/12),t,.7,.045,'triangle',700);}
      this.step++;this.next+=stepDuration;
    }}
}
