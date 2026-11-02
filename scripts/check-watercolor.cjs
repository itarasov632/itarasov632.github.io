const { webkit } = require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const base=process.argv[2] || 'http://127.0.0.1:8765';
const out=path.resolve(__dirname,'../../design/watercolor-implemented');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await webkit.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await context.addInitScript(()=>localStorage.setItem('randomSelectedSurahs','[112,113,114]'));
 const page=await context.newPage(), errors=[], bad=[],report=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)bad.push([r.status(),r.url()]);});
 const routes=[['01-home','/'],['02-alphabet','/pages/alphabet.html'],['03-letter','/pages/letter.html?id=2'],['04-tajweed','/pages/tajweed.html'],['05-fatiha','/pages/al-fatiha.html'],['07-surahs','/pages/surahs.html'],['08-surah','/pages/surah.html?id=112'],['09-random-setup','/pages/random-setup.html'],['10-random-play','/pages/random-play.html'],['12-kursi','/pages/ayat-al-kursi.html'],['13-dhikr','/pages/dhikr.html']];
 async function inspect(name){
   const state=await page.evaluate(async()=>{
     const images=[...document.images]; images.forEach(i=>i.loading='eager');
     await Promise.all(images.map(i=>i.decode()));
     return {url:location.href,overflow:document.documentElement.scrollWidth>innerWidth,
       anatomy:/махрадж/i.test(document.body.innerText),images:images.map(i=>({src:i.src,width:i.naturalWidth})),
       scans:[...document.querySelectorAll('.quran-scan img')].map(i=>({filter:getComputedStyle(i).filter,blend:getComputedStyle(i).mixBlendMode,src:i.src}))};
   });
   assert.equal(state.overflow,false,name+' horizontal overflow');assert.equal(state.anatomy,false,name+' anatomy');
   for(const im of state.images)assert(im.width>0,name+' broken image');
   for(const im of state.scans){assert.equal(im.filter,'none');assert.equal(im.blend,'normal');assert(im.src.includes('/quran-scans/'));}
   report.push({name,...state});
   await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});
 }
 for(const [name,route] of routes){
   await page.goto(base+route,{waitUntil:'networkidle'});
   await inspect(name);
   if(name==='05-fatiha'){
     assert.equal(await page.locator('.lesson').count(),9);
     await page.locator('.lesson').first().click();await page.locator('video').waitFor();
     await inspect('06-fatiha-player');
     assert.equal(await page.locator('#shortText .quran-scan img').count(),1);
     await page.locator('#backToList').click();await page.locator('#lessonList').waitFor();
   }
   if(name==='10-random-play'){
     await page.locator('#infoButton').click();assert(await page.locator('#ayahInfo').isVisible());await inspect('11-random-answer');
   }
   if(name==='09-random-setup'){
     await page.locator('.surah-checkbox[data-surah-id="112"]').check();
     assert.equal(await page.locator('#startButton').isDisabled(),false);
     assert((await page.locator('#selectedCount').innerText()).includes('1'));
     await page.locator('#selectAllCheckbox').check();
     assert.equal(await page.locator('.surah-checkbox:checked').count(),21);
     await page.locator('#selectAllCheckbox').uncheck();
     assert.equal(await page.locator('#startButton').isDisabled(),true);
   }
   if(name==='08-surah'){
     await page.locator('[data-scan]').first().click();assert(await page.locator('dialog').isVisible());
     await page.locator('dialog header button').click();assert(!(await page.locator('dialog').isVisible()));
   }
 }
 for(const id of [67,...Array.from({length:19},(_,i)=>96+i)]){
   await page.goto(base+'/pages/surah.html?id='+id,{waitUntil:'networkidle'});
   await page.locator('.quran-scan img').evaluateAll(async imgs=>{await Promise.all(imgs.map(i=>i.decode()));});
   const st=await page.evaluate(()=>({count:document.querySelectorAll('[data-ayah-number]').length,expected:surahsData[currentSurahId].ayahCount,scans:document.querySelectorAll('.quran-scan img').length,overflow:document.documentElement.scrollWidth>innerWidth}));
   assert.equal(st.count,st.expected);assert(st.scans>0);assert.equal(st.overflow,false);
 }
 for(const id of [1,2,14,28]){
   await page.goto(base+'/pages/letter.html?id='+id,{waitUntil:'networkidle'});
   assert.equal(await page.locator('#makhrajImage').count(),0);
   assert((await page.locator('#letterSymbol').innerText()).trim());
 }
 // Verify grouped Al-Mulk audio retained its existing sequence, without sound.
 await page.goto(base+'/pages/surah.html?id=67',{waitUntil:'networkidle'});
 await page.evaluate(()=>{window.played=[];window.Audio=class{constructor(src){this.src=src;played.push(src);}play(){return Promise.resolve();}pause(){}currentTime=0;};});
 await page.locator('[data-ayah-number="2"]').click();assert((await page.evaluate(()=>played.at(-1))).endsWith('67_2.mp3'));
 await page.evaluate(()=>currentAudio.onended());assert((await page.evaluate(()=>played.at(-1))).endsWith('67_3.mp3'));
 for(const width of [320,768]){
   await page.setViewportSize({width,height:900});
   for(const [,route] of routes){await page.goto(base+route,{waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+' width '+width);}
 }
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({routes:report.length,errors,bad,report},null,2));
 await browser.close();console.log('PASS: 13 states, 20 surahs, letter navigation, PDF zoom, grouped audio and 320/390/768px layouts.');
})().catch(e=>{console.error(e);process.exit(1)});
