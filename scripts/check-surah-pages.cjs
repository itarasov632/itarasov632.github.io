const { webkit } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const output = process.env.SURAH_QA_DIR;
if (output) fs.mkdirSync(output, {recursive:true});
(async () => {
 const browser = await webkit.launch({headless:true});
 const context = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 const page=await context.newPage(); const errors=[];
 page.on('pageerror', e=>errors.push(e.message));
 const base=process.argv[2]||'http://127.0.0.1:8765';
 const ids=[67,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114];
 const results=[];
 for(const id of ids){
  await page.goto(`${base}/pages/surah.html?id=${id}`,{waitUntil:'networkidle'});
  await page.locator('.surah-content img').evaluateAll(images=>images.forEach(i=>i.loading='eager'));
  const state=await page.evaluate(async()=>{
   const images=[...document.querySelectorAll('.surah-content img')];
   await Promise.all(images.map(i=>i.decode()));
   return {id:currentSurahId,count:images.length,expected:surahsData[currentSurahId].ayahCount+1,overflow:document.documentElement.scrollWidth>innerWidth,
    images:images.map(i=>{const b=i.getBoundingClientRect();return {width:b.width,height:b.height,nw:i.naturalWidth,nh:i.naturalHeight,src:i.src};})};
  });
  assert.equal(state.count,state.expected);assert.equal(state.overflow,false);
  for(const im of state.images){assert(im.nw>0);assert(im.width<=330.1);assert(Math.abs(im.width/im.height-im.nw/im.nh)<.01);assert(im.height>=59.9);}
  results.push(state);
  if(output && [67,96,97,98,101,103,105,107,112,114].includes(id)) await page.screenshot({path:path.join(output,`iphone-${id}.png`)});
 }
 assert.deepEqual(errors,[]);
 await page.goto(`${base}/pages/surah.html?id=67`);
 await page.evaluate(()=>{
  window.played=[];
  window.Audio=class{constructor(src){this.src=src;window.played.push(src);}play(){return Promise.resolve();}pause(){}currentTime=0;};
 });
 await page.locator('[data-ayah-number="2"]').click();
 assert((await page.evaluate(()=>played.at(-1))).endsWith('67_2.mp3'));
 await page.evaluate(()=>currentAudio.onended());
 assert((await page.evaluate(()=>played.at(-1))).endsWith('67_3.mp3'));
 await page.locator('[data-ayah-number="3"]').click();
 for(const expected of ['67_4.mp3','67_5.mp3','67_6.mp3']){
  assert((await page.evaluate(()=>played.at(-1))).endsWith(expected));
  await page.evaluate(()=>currentAudio.onended());
 }
 await page.locator('[data-ayah-number="13"]').click();
 assert.match(await page.locator('#audioStatus').innerText(),/пока не добавлена/);
 await page.locator('#surahArabicName').click();
 assert.equal(await page.evaluate(()=>fullSurahQueue.length),19);
 await page.locator('#nextButton').click();
 assert.equal(await page.evaluate(()=>currentSurahId),96);
 await page.goto(`${base}/pages/surah.html?id=1`); await page.waitForURL('**/al-fatiha.html');
 assert.equal(await page.locator('h1').count(),1);
 for(const width of [375,320]){
  await page.setViewportSize({width,height:844});await page.goto(`${base}/pages/surah.html?id=98`);
  await page.locator('.surah-content img').evaluateAll(imgs=>imgs.forEach(i=>i.loading='eager'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 if (output) fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify({base,engine:'WebKit',viewport:'390x844',surahs:results.length,images:results.reduce((s,r)=>s+r.count,0),errors,results},null,2));
 console.log(`PASS: ${results.length} surahs, ${results.reduce((s,r)=>s+r.count,0)} images; iPhone-sized WebKit, aspect ratios, navigation, audio grouping, 375/320px widths.`);
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
