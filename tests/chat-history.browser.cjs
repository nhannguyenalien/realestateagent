const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.TEST_BASE_URL||'http://localhost:3087';
 await page.route('**/api/**',route=>{const url=route.request().url();if(url.includes('/ai/conversations'))return route.fulfill({status:401,json:{error:'Authentication required'}});if(url.includes('/ai/chat'))return route.fulfill({json:{reply:'Saved answer',properties:[]}});return route.fulfill({json:{properties:[]}})});
 await page.goto(base);await page.locator('.aiLauncher').click();const drawer=await page.locator('.aiPanel').boundingBox();assert.equal(drawer.height,900);assert.equal(drawer.width,560);
 await page.locator('input[name=message]').fill('Find a home in District 1');await page.locator('.aiPanel form button').click();await page.getByText('Saved answer',{exact:true}).waitFor();
 await page.locator('.aiExpand').click();await page.locator('.aiWorkspace').waitFor();await page.getByText('Saved answer',{exact:true}).waitFor();assert.equal(await page.locator('.aiHistoryList button').count(),1);
 await page.reload();await page.getByText('Saved answer',{exact:true}).waitFor();
 await page.locator('.aiNewChat').click();await page.locator('input[name=message]').fill('Find another home');await page.locator('.aiPanel form button').click();await page.getByText('Saved answer',{exact:true}).waitFor();assert.equal(await page.locator('.aiHistoryList button').count(),2);
 await page.locator('.aiHistoryList button').filter({hasText:'District 1'}).click();assert.equal(await page.locator('.aiMessages .user').innerText(),'Find a home in District 1');
 await page.getByRole('textbox',{name:'Search conversations'}).fill('another');assert.equal(await page.locator('.aiHistoryList button').count(),1);
 await page.getByRole('textbox',{name:'Search conversations'}).fill('');
 await page.setViewportSize({width:375,height:812});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert((await page.locator('.aiPanel form').boundingBox()).y<812);
 assert.deepEqual(errors,[]);console.log('PASS: full-height drawer, dedicated chat, history navigation, reload persistence, new conversations, search and mobile layout. Guest storage; AI mocked.');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
