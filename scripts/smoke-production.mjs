import {chromium} from '@playwright/test';

const base=process.env.GAME_BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('dead-zone-settings',JSON.stringify({quality:'low'})));
  const response=await page.goto(base,{waitUntil:'domcontentloaded'});
  if(response.status()!==200)throw new Error(`Index: HTTP ${response.status()}`);
  await page.locator('#play').waitFor({state:'visible'});
  if(await page.evaluate(()=>!!window.__DEAD_ZONE__))throw new Error('Development game hook leaked into production');
  const sources=await page.evaluate(()=>[document.getElementById('intro-video').src,document.getElementById('extraction-video').src]);
  for(const src of sources){if(!src)throw new Error('Missing bundled movie URL');const result=await page.request.get(src,{headers:{Range:'bytes=0-15'}});if(result.status()!==206||!result.headers()['content-type']?.includes('video/mp4'))throw new Error(`Movie response: ${result.status()} ${result.headers()['content-type']}`);}
  await page.locator('#play').click();await page.locator('#intro-skip').click();await page.locator('#hud').waitFor({state:'visible',timeout:20000});
  if(errors.length)throw new Error(errors.join('\n'));
  console.log(JSON.stringify({index:response.status(),movies:2,movieRangeStatus:206,introToGameplay:true,errors:0}));
}finally{await browser.close();}
