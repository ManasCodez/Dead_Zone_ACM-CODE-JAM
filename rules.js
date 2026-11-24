export const ENEMY_TYPES=['normal','runner','tank','crawler','bloater'];
export function waveCount(wave){const base=wave===1?5:wave===2?8:12+Math.max(0,wave-3)*4;return Math.ceil(base*1.5);}
export function enemyType(wave,roll){return ENEMY_TYPES[Math.min(4,Math.floor(Math.max(0,roll)*5))];}
export const SPECIAL_TYPES=['screamer','brute','spitter','stalker','riot','exploder'];
export function waveRoster(wave,random=Math.random,specials=false){const roster=[...ENEMY_TYPES];while(roster.length<waveCount(wave))roster.push(specials&&random()<Math.min(.4,.18+wave*.025)?SPECIAL_TYPES[Math.floor(random()*SPECIAL_TYPES.length)]:enemyType(wave,random()));for(let i=roster.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[roster[i],roster[j]]=[roster[j],roster[i]];}return roster;}
