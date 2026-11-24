export const SAVE_VERSION=1;
export const CHECKPOINT_KEY='dead-zone-checkpoint-v1';
function browserStorage(){try{return globalThis.localStorage;}catch{return null;}}
export function readJSON(key,fallback=null,storage=browserStorage()){try{return JSON.parse(storage?.getItem(key))??fallback;}catch{return fallback;}}
export function writeJSON(key,value,storage=browserStorage()){try{storage?.setItem(key,JSON.stringify(value));return Boolean(storage);}catch{return false;}}
export function validCheckpoint(data){
  return data?.version===SAVE_VERSION && Number.isInteger(data.chapter) && data.chapter>=1 && data.chapter<=3 &&
    Number.isFinite(data.xp) && data.xp>=0 && Number.isFinite(data.elapsed) && data.elapsed>=0 &&
    Array.isArray(data.inventory) && data.inventory.length>0 && data.inventory.length<=6 &&
    data.inventory.every(entry=>Array.isArray(entry)&&entry.length===2&&['rifle','smg','shotgun','lmg','marksman','revolver'].includes(entry[0])&&Number.isFinite(entry[1]?.ammo)&&Number.isFinite(entry[1]?.reserve)) &&
    new Set(data.inventory.map(entry=>entry[0])).size===data.inventory.length &&
    ['easy','normal','hard'].includes(data.difficulty) && Array.isArray(data.upgrades) && data.upgrades.length<=24 &&
    data.upgrades.every(id=>['health','reload','stability','magazine','damage','grenade','critical','armor'].includes(id)&&data.upgrades.filter(v=>v===id).length<=3) &&
    (data.completed===undefined||Array.isArray(data.completed)&&data.completed.every(id=>typeof id==='string')) &&
    (data.wave===undefined||Number.isInteger(data.wave)&&data.wave>=1&&data.wave<=100) &&
    ['kills','health','grenades'].every(key=>data[key]===undefined||Number.isFinite(data[key])&&data[key]>=0) &&
    (data.weapon===undefined||data.inventory.some(entry=>entry[0]===data.weapon));
}
export function loadCheckpoint(storage=browserStorage()){const data=readJSON(CHECKPOINT_KEY,null,storage);return validCheckpoint(data)?data:null;}
