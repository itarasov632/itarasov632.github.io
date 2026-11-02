const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let pw;try{pw=require('playwright')}catch{pw=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const base=(process.argv[2]||'http://127.0.0.1:8767/site').replace(/\/$/,'');
const out=process.env.READING_QA_DIR||path.resolve(__dirname,'../../design/reading-restored');fs.mkdirSync(out,{recursive:true});
const counts={67:30,96:19,97:5,98:8,99:8,100:11,101:11,102:8,103:3,104:9,105:5,106:4,107:7,108:3,109:6,110:3,111:5,112:4,113:5,114:6};
const mulk={1:[1],2:[2,3],3:[4,5,6],4:[7],5:[8,9],6:[10],7:[11],8:[12,13],9:[14,15],10:[21],11:[22],12:[23]};
const files=(s,a)=>[96,98].includes(s)?[]:s===67&&a!=='basmala'?(mulk[a]||[]).map(n=>`67_${n}.mp3`):[`${s}_${a}.mp3`];
(async()=>{
 const browser=await pw.webkit.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[],bad=[],report={base,layouts:[],audioCards:0,realMedia:[],recording:[]};
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push([r.status(),r.url()])});
 async function goto(route){await page.goto(base+route,{waitUntil:'networkidle'})}
 async function inspect(name,screenshot=false){
  const st=await page.evaluate(async()=>{
   const ims=[...document.images];ims.forEach(i=>i.loading='eager');await Promise.all(ims.map(i=>i.decode()));
   return {overflow:document.documentElement.scrollWidth>innerWidth,mahraj:/махрадж/i.test(document.body.innerText),watercolor:[...document.styleSheets].some(s=>s.href?.includes('watercolor.css')),
    images:ims.filter(i=>i.classList.contains('reading-image')&&i.getClientRects().length).map(i=>{const b=i.getBoundingClientRect(),s=getComputedStyle(i);return {src:i.src,width:b.width,height:b.height,ratio:i.naturalWidth/i.naturalHeight,filter:s.filter,blend:s.mixBlendMode}})};
  });assert(!st.overflow,name+' overflow');assert(!st.mahraj,name+' mahraj');assert(st.watercolor);
  for(const i of st.images){assert(i.width>0&&i.width<310);assert(Math.abs(i.width/i.height-i.ratio)<.02,name+' distorted');assert.equal(i.filter,'none');assert.equal(i.blend,'normal')}
  report.layouts.push({name,width:page.viewportSize().width,images:st.images.length});
  if(screenshot)await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});
 }
 async function mockAudio(){await page.evaluate(()=>{window.played=[];window.instances=[];window.Audio=class{constructor(src){this.src=src;this.currentTime=0;this.paused=true;instances.push(this)}play(){this.paused=false;played.push(this.src);return Promise.resolve()}pause(){this.paused=true}}})}
 if(process.env.READING_QA_PHASE !== 'media'){
 for(const [sid,count] of Object.entries(counts)){
  const s=+sid;await goto('/pages/surah.html?id='+s);await inspect('surah-'+s,[67,112,105].includes(s));
  assert.equal(await page.locator('.ayah img').count(),count);assert.equal(await page.locator('.basmala img').count(),1);assert.equal(await page.locator('.quran-scans').count(),0);
  await mockAudio();
  for(const a of ['basmala',...Array.from({length:count},(_,i)=>i+1)]){
   const expected=files(s,a);const target=a==='basmala'?page.locator('#basmalaElement'):page.locator(`[data-ayah-number="${a}"]`);
   await page.evaluate(()=>played=[]);await target.locator('img').click();
   for(const f of expected){assert((await page.evaluate(()=>played.at(-1))).endsWith('/'+f));await page.evaluate(()=>currentAudio.onended())}
   assert.equal((await page.evaluate(()=>played)).length,expected.length);assert.equal(await page.locator('.playing').count(),0);report.audioCards++;
  }
  const expected=['basmala',...Array.from({length:count},(_,i)=>i+1)].flatMap(a=>files(s,a));await page.locator('#surahArabicName').click();
  assert.deepEqual(await page.evaluate(()=>fullSurahQueue.map(i=>i.audioFile)),expected);
  if(expected.length){assert.equal(await page.locator('.playing').count(),1);await page.locator('#surahArabicName').click();assert.equal(await page.locator('.playing').count(),0)}
 }
 await goto('/pages/surah.html?id=67');await mockAudio();
 await page.locator('[data-ayah-number="2"] img').click();await page.evaluate(()=>{currentAudio.currentTime=8;window.old=currentAudio;window.stale=currentAudio.onended});
 await page.locator('[data-ayah-number="2"] img').click();assert(await page.evaluate(()=>old.paused&&old.currentTime===0&&currentAudio!==old));
 await page.locator('[data-ayah-number="3"] img').click();const before=await page.evaluate(()=>played.length);await page.evaluate(()=>stale());assert.equal(await page.evaluate(()=>played.length),before);
 assert.equal(await page.locator('.ayah.playing').getAttribute('data-ayah-number'),'3');await page.locator('#nextButton').click();assert(page.url().includes('id=96'));assert(await page.evaluate(()=>instances.every(a=>a.paused)));
 await page.goBack();assert(page.url().includes('id=67'));
 await goto('/pages/ayat-al-kursi.html');await inspect('kursi',true);assert.equal(await page.locator('.fragment img').count(),8);
 await page.locator('.fragment img').first().click();assert.match(await page.locator('#audioStatus').innerText(),/пока не добавлена/);assert.equal(await page.locator('.playing').count(),0);
 // Existing sequence behavior, exercised with fixtures because MP3s do not exist.
 await mockAudio();await page.evaluate(()=>fragmentsData.forEach(f=>f.available=true));
 for(let i=1;i<=8;i++){await page.locator(`[data-fragment-number="${i}"] img`).click();assert((await page.evaluate(()=>currentAudio.src)).endsWith('/'+i+'.mp3'));assert.equal(await page.locator('.fragment.playing').count(),1)}
 await page.locator('#ayatTitle').click();assert.deepEqual(await page.evaluate(()=>fullQueue.map(i=>i.audioFile)),Array.from({length:8},(_,i)=>(i+1)+'.mp3'));
 for(let i=1;i<=8;i++){assert((await page.evaluate(()=>currentAudio.src)).endsWith('/'+i+'.mp3'));await page.evaluate(()=>currentAudio.onended())}assert.equal(await page.locator('.playing').count(),0);
 console.log('PASS: 180 surah cards, grouped audio, repeat/switch, navigation, full sequences, eight Kursi fixtures.');
 }
 await goto('/pages/dhikr.html');await inspect('dhikr',true);assert.equal(await page.locator('.recite img').count(),11);
 // Real MP3 decoding, card matching, restart and exclusive playback in WebKit.
 for(let i=0;i<11;i++){
  const btn=page.locator('.recite').nth(i);const id=await btn.getAttribute('aria-controls');await btn.locator('img').click();
  await page.waitForFunction(id=>{const a=document.getElementById(id);return !a.paused&&a.currentTime>0&&a.readyState>=2},id);
  assert.equal(await page.locator('.recite.playing').count(),1);assert.equal(await btn.getAttribute('aria-pressed'),'true');
  await page.evaluate(id=>{
   const a=document.getElementById(id);a.currentTime=2;window.restartAtTap=null;
   document.querySelector(`[aria-controls="${id}"]`).addEventListener('click',()=>{restartAtTap=a.currentTime},{once:true});
  },id);await btn.locator('img').click();assert.equal(await page.evaluate(()=>restartAtTap),0,id+' did not restart');
  assert(await page.evaluate(id=>[...document.querySelectorAll('audio')].filter(a=>a.id!==id).every(a=>a.paused),id));
  report.realMedia.push(id);
 }
 await page.evaluate(()=>document.querySelectorAll('audio').forEach(a=>a.pause()));
 await goto('/pages/surah.html?id=112');await page.locator('.ayah img').first().click();await page.waitForFunction(()=>currentAudio&&!currentAudio.paused&&currentAudio.currentTime>0);report.realMedia.push('112_1.mp3');await page.evaluate(()=>stopFullSurah());
 await goto('/pages/al-fatiha.html');await page.locator('.lesson').first().waitFor();await inspect('fatiha',true);assert.equal(await page.locator('.lesson').count(),9);assert.equal(await page.locator('.lesson img').count(),8);
 for(let i=0;i<9;i++){
  await page.locator('.lesson').nth(i).click();await page.locator('#viewer').waitFor();const full=i===8;
  assert((await page.locator(full?'#fullArabic img':'#shortText img').getAttribute('src')).endsWith(`/fatiha/${full?'full':i+1}.png`));
  assert((await page.locator('video').getAttribute('src')).includes(String(i+1).padStart(2,'0')+'-'));
  assert.equal(await page.locator('#previous').isDisabled(),i===0);assert.equal(await page.locator('#next').isDisabled(),i===8);
  if(i===6)await inspect('fatiha-lesson',true);
  if(i===0){await page.locator('#togglePlay').click();await page.waitForFunction(()=>document.querySelector('video').currentTime>0);await page.locator('#togglePlay').click();assert(await page.locator('video').evaluate(v=>v.paused));await page.locator('#forward').click();assert(await page.locator('video').evaluate(v=>v.currentTime>=10));await page.locator('#repeat').click();await page.waitForFunction(()=>{const v=document.querySelector('video');return !v.paused&&v.currentTime<3});report.realMedia.push('01-bismillah.mp4')}
  await page.locator('#backToList').click();await page.locator('#lessonList').waitFor();assert.equal(await page.locator('video').count(),0);
 }
 const routes=['/','/pages/alphabet.html','/pages/letter.html?id=2','/pages/tajweed.html','/pages/surahs.html','/pages/random-setup.html','/pages/random-play.html','/pages/surah.html?id=67','/pages/surah.html?id=112','/pages/ayat-al-kursi.html','/pages/dhikr.html','/pages/al-fatiha.html'];
 await page.evaluate(()=>localStorage.setItem('randomSelectedSurahs','[112,113,114]'));
 for(const width of [320,390,768]){await page.setViewportSize({width,height:844});for(const route of routes){await goto(route);await inspect(route.replaceAll('/','_').replaceAll('?','_')+'-'+width,route==='/'&&width===390)}}
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);await browser.close();console.log('PASS: real MP3/video playback, video controls and 320/390/768px layouts.');
 // Exercise actual MediaRecorder with a synthetic microphone, without user's mic.
 const chromium=await pw.chromium.launch({headless:true,...(fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')?{channel:'chrome'}:{}),args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const cc=await chromium.newContext({permissions:['microphone'],viewport:{width:390,height:844}});const cp=await cc.newPage();
 for(const route of ['/pages/surah.html?id=112','/pages/ayat-al-kursi.html']){
  await cp.goto(base+route);await cp.locator('#recordButton').click();await cp.waitForFunction(()=>isRecording);await cp.waitForTimeout(350);await cp.locator('#recordButton').click();await cp.waitForFunction(()=>recordedBlob?.size>0&&!isRecording);assert(await cp.locator('#playbackButton').isEnabled());await cp.locator('#playbackButton').click();await cp.waitForFunction(()=>recordedAudio&&recordedAudio.readyState>=2);report.recording.push({route,...await cp.evaluate(()=>({bytes:recordedBlob.size,type:recordedBlob.type,streamReleased:mediaStream===null}))});
 }
 await chromium.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({...report,errors,bad},null,2));console.log(JSON.stringify({status:'PASS',cards:report.audioCards,layouts:report.layouts.length,realMedia:report.realMedia.length,recording:report.recording},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
