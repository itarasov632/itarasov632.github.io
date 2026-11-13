const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const base=(process.argv[2]||'http://127.0.0.1:8767').replace(/\/$/,'');
const out=process.env.TAFSIR_QA_DIR||path.join(os.tmpdir(),'second-teacher-tafsir-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox']});
 const errors=[],results=[];
 async function setup(mobile=false){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:2});
  await context.route('https://azan.info/tafsir/an-nas/*',route=>{const ayah=new URL(route.request().url()).pathname.split('/').at(-1);return route.fulfill({contentType:'text/html',body:`<!doctype html><html lang=ru><meta charset=utf-8><body><main id=fixture>Тафсир Ан-Нас, аят ${ayah}</main></body></html>`})});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.played=[];window.Audio=class{constructor(src){this.src=src;this.currentTime=0;this.paused=true;}play(){this.paused=false;window.played.push(this.src);return Promise.resolve()}pause(){this.paused=true}}});
  await page.goto(base+'/pages/surah.html?id=114');
  return {context,page};
 }
 const {context,page}=await setup();
 const dialog=page.locator('#tafsirDialog'),close=page.locator('#closeTafsir');
 const card=n=>page.locator(`[data-ayah-number="${n}"]`);
 async function count(){return page.evaluate(()=>window.played.length)}
 async function hold(n,duration=700){
  const target=card(n);await target.evaluate(el=>el.scrollIntoView({block:'center'}));const b=await target.boundingBox();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(duration);await page.mouse.up();
  await dialog.waitFor({state:'visible'});
 }
 // Quick click keeps the existing audio action.
 await card(1).click();assert.equal(await count(),1);assert((await page.evaluate(()=>played.at(-1))).endsWith('114_1.mp3'));assert.equal(await dialog.isVisible(),false);
 for(let n=1;n<=6;n++){
  const before=await count();await hold(n);assert.equal(await count(),before,'longpress fired audio '+n);
  const title=await page.locator('#tafsirTitle').innerText();assert.match(title,/Ан-Нас/i);assert.match(title,new RegExp('аят[^0-9]*'+n+'(?:[^0-9]|$)','i'));
  assert.equal(await dialog.locator('#tafsirSource').getAttribute('href'),`https://azan.info/tafsir/an-nas/${n}`);
  assert.equal(await dialog.locator('#tafsirFrame').getAttribute('src'),`https://azan.info/tafsir/an-nas/${n}`);
  await page.frameLocator('#tafsirFrame').locator('#fixture').waitFor();
  assert.match(await page.frameLocator('#tafsirFrame').locator('#fixture').innerText(),new RegExp('аят '+n+'$'));
  assert(await page.evaluate(()=>document.activeElement?.closest('#tafsirDialog')!==null),'focus outside modal');
  await close.click();await dialog.waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.getElementById('tafsirFrame').getAttribute('src')==='about:blank');
  assert(await card(n).evaluate(el=>document.activeElement===el),'focus not restored '+n);
  // Suppression from the hold must not leak into the NEXT intentional click.
  await card(n).click();assert.equal(await count(),before+1,'next tap was swallowed '+n);
 }
 results.push('six ayahs: correct dialog titles, source, focus, suppressed hold audio, ordinary next tap');
 // Escape with focus on parent modal controls, and backdrop dismissal.
 await hold(2);await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert(await card(2).evaluate(el=>document.activeElement===el));
 await hold(3);const db=await dialog.boundingBox();await page.mouse.click(db.x>5?2:db.x+db.width+2,2);await dialog.waitFor({state:'hidden'});
 results.push('close button, Escape from modal controls, backdrop, focus restore');
 // A pointer movement before the threshold cancels the gesture.
 let b=await card(2).boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+50,b.y+b.height/2+25);await page.waitForTimeout(750);await page.mouse.up();assert.equal(await dialog.isVisible(),false);
 // Explicit cancellation must also prevent deferred opening.
 await card(2).dispatchEvent('pointerdown',{button:0,pointerId:9,pointerType:'touch',isPrimary:true,clientX:100,clientY:300});
 await card(2).dispatchEvent('pointercancel',{pointerId:9,pointerType:'touch',isPrimary:true});await page.waitForTimeout(750);assert.equal(await dialog.isVisible(),false);
 results.push('pointer movement and cancellation do not open tafsir');
 // Keyboard alternative is required because press-and-hold alone is inaccessible.
 await card(4).focus();await page.keyboard.press('Shift+F10');await dialog.waitFor({state:'visible'});assert.match(await page.locator('#tafsirTitle').innerText(),/аят[^0-9]*4/i);await close.click();
 results.push('Shift+F10 keyboard access');
 // Basmalas and neighboring surahs retain their current behavior.
 const bm=page.locator('#basmalaElement');await bm.scrollIntoViewIfNeeded();b=await bm.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(750);await page.mouse.up();assert.equal(await dialog.isVisible(),false);
 await page.goto(base+'/pages/surah.html?id=113');await card(1).scrollIntoViewIfNeeded();b=await card(1).boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(750);await page.mouse.up();assert.equal(await dialog.isVisible(),false);assert((await page.evaluate(()=>played.at(-1))).endsWith('113_1.mp3'));
 results.push('basmala and surah 113 unchanged');
 // No pending timer survives navigation to a different surah.
 await page.goto(base+'/pages/surah.html?id=114');await card(1).dispatchEvent('pointerdown',{button:0,pointerId:8,pointerType:'touch',isPrimary:true,clientX:100,clientY:300});await page.evaluate(()=>navigateToSurah(113));await page.waitForTimeout(750);assert.equal(await dialog.isVisible(),false);
 results.push('navigation cancels pending longpress');
 // Real CDP touch events (and browser-synthesized click) on a mobile context.
 const mobile=await setup(true),mp=mobile.page,cdp=await mobile.context.newCDPSession(mp);
 const mt=mp.locator('[data-ayah-number="1"]');await mt.evaluate(el=>el.scrollIntoView({block:'center'}));b=await mt.boundingBox();const tx=b.x+b.width/2,ty=b.y+b.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});await mp.waitForTimeout(750);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mp.locator('#tafsirDialog').waitFor({state:'visible'});assert.equal(await mp.evaluate(()=>played.length),0,'real touch longpress played audio');await mp.locator('#closeTafsir').click();
 await mt.tap();assert.equal(await mp.evaluate(()=>played.length),1,'next real tap swallowed');
 await mt.evaluate(el=>el.scrollIntoView({block:'center'}));b=await mt.boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2-100}]});await mp.waitForTimeout(750);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await mp.locator('#tafsirDialog').isVisible(),false,'scroll opened tafsir');
 results.push('real mobile touch hold, quick tap and scrolling');
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});await page.goto(base+'/pages/surah.html?id=114');await hold(6);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const bounds=await dialog.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width+1&&bounds.height<=844);
  await page.screenshot({path:out+'/tafsir-'+width+'.png'});await close.click();
 }
 results.push('dialog at 320/390/768px');assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/report.json',JSON.stringify({status:'PASS',base,results,errors},null,2));console.log(JSON.stringify({status:'PASS',results},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
