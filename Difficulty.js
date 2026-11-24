export const DIFFICULTIES={easy:{label:'STORY',damage:.65,health:.8,spawn:1.25},normal:{label:'SURVIVOR',damage:1,health:1,spawn:1},hard:{label:'NIGHTMARE',damage:1.3,health:1.25,spawn:.8}};
export function difficultyFor(id){return DIFFICULTIES[id]||DIFFICULTIES.normal;}
