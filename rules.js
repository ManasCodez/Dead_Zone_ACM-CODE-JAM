export const ENEMY_TYPES=['normal','runner','tank','crawler','bloater'];
export function waveCount(wave){const base=wave===1?5:wave===2?8:12+Math.max(0,wave-3)*4;return Math.ceil(base*1.5);}
export function enemyType(wave,roll){return ENEMY_TYPES[Math.min(4,Math.floor(Math.max(0,roll)*5))];}
export function waveRoster(wave,random=Math.random){const roster=[...ENEMY_TYPES];while(roster.length<waveCount(wave))roster.push(enemyType(wave,random()));for(let i=roster.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[roster[i],roster[j]]=[roster[j],roster[i]];}return roster;}
