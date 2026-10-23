// Optional browser regression harness; PLAYWRIGHT_PACKAGE points to installed external Playwright.
const fs=require('fs'),path=require('path'),{spawn}=require('child_process'),crypto=require('crypto');
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'outputs/separation-browser');fs.mkdirSync(out,{recursive:true});
const cases=[
 {name:'baseline',cwd:path.join(root,'outputs/separation-baseline'),port:5190,vite:path.join(root,'node_modules/vite/bin/vite.js')},
 {name:'mvp',cwd:path.join(root,'apps/promptify-mvp'),port:5191},
 {name:'intrepid',cwd:path.join(root,'apps/promptify-intrepid'),port:5192},
];
const processes=[],results=[];
(async()=>{
 let browser;
 try{
  for(const c of cases){const env={...process.env,VITE_REBUILD_PRODUCTION:'false'};for(const key of Object.keys(env))if(/SUPABASE|GEMINI|OPENAI|GOOGLE|STAGING_|ROSTER_WORKER/.test(key))delete env[key];const p=spawn(process.execPath,[c.vite||path.join(c.cwd,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',String(c.port),'--strictPort'],{cwd:c.cwd,env,windowsHide:true,stdio:'ignore'});processes.push(p);let ready=false;for(let n=0;n<100;n++){try{if((await fetch('http://127.0.0.1:'+c.port)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}if(!ready)throw Error(c.name+' failed to start');}
  browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  async function capture(server,url,name){const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await context.route('**/*',route=>{const u=new URL(route.request().url());return u.hostname==='127.0.0.1'?route.continue():route.abort();});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.port+url,{waitUntil:'networkidle'});await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'});await page.waitForTimeout(250);const text=await page.locator('body').innerText();const image=await page.screenshot({path:path.join(out,name+'.png'),fullPage:true,animations:'disabled'});const record={name,url,errors,text,sha256:crypto.createHash('sha256').update(image).digest('hex')};results.push(record);await context.close();return record;}
  const pairs=[['mvp-landing','/',cases[1],'/'],['intrepid-landing','/production?ui=00',cases[2],'/?ui=00'],['intrepid-signin','/production?ui=01',cases[2],'/?ui=01'],['review','/rebuild',cases[2],'/rebuild']];
  const checks=[];
  for(const [name,oldUrl,target,newUrl]of pairs){const before=await capture(cases[0],oldUrl,'before-'+name),after=await capture(target,newUrl,'after-'+name);checks.push({name,textEqual:before.text===after.text,pixelsEqual:before.sha256===after.sha256,pageErrors:[...before.errors,...after.errors]});}
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,captures:results},null,2));console.log(JSON.stringify(checks,null,2));if(checks.some(c=>!c.textEqual||!c.pixelsEqual||c.pageErrors.length))process.exitCode=1;
 }finally{if(browser)await browser.close();for(const p of processes)p.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
