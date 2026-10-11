import {chromium,webkit,devices} from '@playwright/test';
import fs from 'node:fs';import assert from 'node:assert/strict';import vm from 'node:vm';
const url='https://sochagrzegorz.github.io/historia-quiz/',api='https://historia-quiz-ai.sochagrzegorz.workers.dev';
const bank=JSON.parse(fs.readFileSync('egipt_izrael_pismo_pytania.json','utf8')).questions;
const report={date:new Date().toISOString(),checks:[]};
const record=(name,value)=>{report.checks.push({name,value});console.log(JSON.stringify({name,value}));fs.writeFileSync('production-report.json',JSON.stringify(report,null,2));};
async function call(path,body){const r=await fetch(api+path,{method:body?'POST':'GET',headers:{Origin:'https://sochagrzegorz.github.io','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const d=await r.json();assert.ok(r.ok,JSON.stringify(d));return d;}
record('worker-health',await call('/health'));
const html=await fetch(url);assert.equal(html.status,200);assert.ok((await html.text()).includes('Egipt Izrael'));record('HTTPS',200);
const browser=await webkit.launch();const context=await browser.newContext({...devices['iPhone 13']});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(url);await page.locator('#startBtn').waitFor();await page.waitForFunction(()=>!document.getElementById('startBtn').disabled);await page.screenshot({path:'production-start-iphone.png',fullPage:true});
await page.locator('#nickname').fill('Test wdrożenia');await page.locator('#startBtn').click();await page.locator('#play.active').waitFor({timeout:60000});
const active=await page.evaluate(()=>JSON.parse(localStorage.getItem('historiaQuizActive')));record('production-picks',active.picks);
let backendCalls=0;page.on('request',r=>{if(r.url().startsWith(api))backendCalls++});
await page.locator('#hintBtn').click();assert.ok(await page.locator('#hintArea').isVisible());assert.equal(backendCalls,0);record('local-hint',true);
for(let i=0;i<10;i++){
 const q=bank.find(q=>q.id===active.picks[i]);assert.equal(await page.locator('#qText').textContent(),q.question);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if(q.type==='abcd'){await page.getByRole('button',{name:q.correctAnswer,exact:true}).click();await page.locator('#checkBtn').click();}
 else{await page.locator('#userAnswer').fill(q.correctAnswer);await page.locator('#revealBtn').click();}
 await page.locator('#nextBtn').waitFor({state:'visible',timeout:60000});record('answer-'+q.id,await page.locator('#feedback').textContent());
 if(i===2){await page.reload();await page.locator('#nextBtn').waitFor({state:'visible',timeout:60000});record('production-resume',true);}
 await page.locator('#nextBtn').click();
}
await page.locator('#result.active').waitFor({timeout:60000});await page.waitForFunction(()=>document.getElementById('rankingStatus').textContent.includes('Wynik zapisany'),{timeout:60000});record('result',await page.locator('#resultScore').textContent());record('ranking-saved',await page.locator('#rankingStatus').textContent());await page.screenshot({path:'production-result-iphone.png',fullPage:true});assert.deepEqual(errors,[]);record('javascript-errors',errors);await browser.close();
const session=await call('/session',{quiz:'historia',nickname:'Test AI',history:[]});const open=bank.find(q=>session.picks.includes(q.id)&&q.type==='open');const wrong=await call('/answer',{token:session.token,id:open.id,answer:'Nie wiem. Egipt leżał na Marsie, a pismo wynaleziono wczoraj.'});assert.equal(wrong.score,0);record('real-ai-wrong-answer',{id:open.id,score:wrong.score,feedback:wrong.feedback});
const bioResponse=await fetch('https://sochagrzegorz.github.io/quiz/biologia/');assert.equal(bioResponse.status,200);const bioHtml=await bioResponse.text();const bioBank=vm.runInNewContext(bioHtml.slice(bioHtml.indexOf('const bank='),bioHtml.indexOf('let session='))+'\nbank');assert.equal(bioBank.length,100);
const desktop=await chromium.launch();const bp=await desktop.newPage();const be=[];bp.on('pageerror',e=>be.push(e.message));await bp.goto('https://sochagrzegorz.github.io/quiz/biologia/');await bp.locator('#nickname').fill('Test regresji');await bp.locator('#startBtn').click();let openChecked=false;
for(let i=0;i<10&&!openChecked;i++) {const text=await bp.locator('#qText').textContent();const q=bioBank.find(q=>q.text===text);assert.ok(q);if(q.kind==='choice'){await bp.getByRole('button',{name:q.answer,exact:true}).click();await bp.locator('#checkBtn').click();}else{if(q.fields){for(let j=0;j<q.fields.length;j++)await bp.locator('#openField'+j).fill(q.fields[j].answer||q.answer);}else await bp.locator('#userAnswer').fill(q.answer);await bp.locator('#revealBtn').click();openChecked=true;}await bp.locator('#nextBtn').waitFor({state:'visible',timeout:60000});record('biology-'+q.kind,await bp.locator('#feedback').textContent());if(!openChecked)await bp.locator('#nextBtn').click();}
assert.deepEqual(be,[]);record('biology-regression',{status:200,questions:100,ai:openChecked,errors:be});await desktop.close();
