// Verify the published build and capture actual mobile browser screenshots.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
let pw;try{pw=require('playwright')}catch{pw=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')}
const root=path.resolve(__dirname,'..'),base='https://itarasov632.github.io/',revision=process.argv[2];
if(!revision)throw new Error('Supply the published commit SHA');
const out=path.resolve(__dirname,'../../design/reading-restored/published');fs.mkdirSync(out,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'scripts/reading-card-sources.json'),'utf8'));
 const queue=Object.values(manifest.cards).map(c=>[c.file,c.sha256]);
 for(const f of ['pages/surah.html','pages/ayat-al-kursi.html','pages/dhikr.html','pages/al-fatiha.html','js/reading-cards.js','js/data/reading-cards.js','js/pages/al-fatiha.js','css/watercolor.css','service-worker.js'])queue.push([f,hash(execFileSync('git',['show',revision+':'+f],{cwd:root}))]);
 const count=queue.length;
 await Promise.all(Array.from({length:6},async()=>{while(queue.length){const [file,expected]=queue.shift();const r=await fetch(base+file+'?v='+revision);assert(r.ok,file+' HTTP '+r.status);assert.equal(hash(Buffer.from(await r.arrayBuffer())),expected,file+' public content differs')}}));
 const b=await pw.webkit.launch({headless:true});const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const errors=[],bad=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push([r.status(),r.url()])});
 for(const [name,route] of [['home',''],['surah','pages/surah.html?id=112'],['kursi','pages/ayat-al-kursi.html'],['dhikr','pages/dhikr.html'],['fatiha','pages/al-fatiha.html']]){
  await p.goto(base+route+(route.includes('?')?'&':'?')+'v='+revision,{waitUntil:'networkidle'});
  if(name==='fatiha'){await p.locator('.lesson').first().waitFor();await p.locator('.lesson').nth(6).click();await p.locator('#viewer').waitFor()}
  await p.locator('img').evaluateAll(async ims=>{ims.forEach(i=>i.loading='eager');await Promise.all(ims.map(i=>i.decode()))});
  assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));assert(!/махрадж/i.test(await p.locator('body').innerText()));
  if(name==='surah'){assert.equal(await p.locator('.ayah img').count(),4);await p.locator('.ayah img').first().click();await p.waitForFunction(()=>currentAudio&&!currentAudio.paused&&currentAudio.currentTime>0);assert.equal(await p.locator('.ayah.playing').count(),1)}
  if(name==='kursi'){assert.equal(await p.locator('.fragment img').count(),8);await p.locator('.fragment img').first().click();assert.match(await p.locator('#audioStatus').innerText(),/пока не добавлена/)}
  if(name==='dhikr'){assert.equal(await p.locator('.recite img').count(),11);await p.locator('.recite').nth(1).locator('img').click();await p.waitForFunction(()=>document.getElementById('audio-al-hashr-22-1').currentTime>0);assert.equal(await p.locator('.recite.playing').count(),1)}
  await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:path.join(out,'mobile-'+name+'.png')});
  await p.screenshot({path:path.join(out,'full-'+name+'.png'),fullPage:true});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);await b.close();const report={status:'PASS',revision,verifiedFiles:count,verifiedImages:Object.keys(manifest.cards).length,mobilePages:5,realAudio:['112_1.mp3','al-hashr-22-1.mp3'],errors,bad};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
