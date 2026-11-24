export class Statistics {
  constructor(){this.reset();}
  reset(){this.eliminations=0;this.shots=0;this.hits=0;this.headshots=0;this.damageTaken=0;this.grenadesUsed=0;this.objectives=0;this.secrets=0;}
  get accuracy(){return this.shots?Math.min(100,Math.round(this.hits/this.shots*100)):0;}
  get score(){return Math.max(0,this.eliminations*25+this.hits*10+this.headshots*50+this.objectives*500+this.secrets*200-Math.round(this.damageTaken)*2);}
  snapshot(){return Object.fromEntries(Object.keys(this).map(k=>[k,this[k]]));}
  restore(data={}){this.reset();for(const key of Object.keys(this))if(Number.isFinite(data[key]))this[key]=Math.max(0,data[key]);}
}
