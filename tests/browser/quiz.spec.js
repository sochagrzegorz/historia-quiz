import {test,expect}from '@playwright/test';import worker from '../../worker.js';import {questions}from '../../bank.js';
test('complete game, local hints, resume, backend error, summary, ranking and new round',async({page},info)=>{
 const kv=new Map(),errors=[],env={LEADERBOARD:{get:async k=>kv.get(k)?.value??null,put:async(k,v,o)=>{kv.set(k,{value:JSON.parse(v),metadata:o.metadata})},list:async({prefix})=>({keys:[...kv].filter(([k])=>k.startsWith(prefix)).map(([name,v])=>({name,metadata:v.metadata})),list_complete:true})},AI:{run:async()=>({response:{score:2,feedback:'Poprawna odpowiedź.'}})}};
 let failOnce=true,apiRequests=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://historia-quiz-ai.sochagrzegorz.workers.dev/**',async route=>{apiRequests++;const req=route.request(),body=req.postData();if(failOnce&&req.url().endsWith('/answer')&&questions.find(q=>q.id===JSON.parse(body).id)?.type==='open'){failOnce=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Testowa niedostępność AI'})});return;}
 const response=await worker.fetch(new Request(req.url(),{method:req.method(),headers:{Origin:'https://sochagrzegorz.github.io','Content-Type':'application/json','CF-Connecting-IP':info.project.name},...(body?{body}:{})}),env);await route.fulfill({status:response.status,headers:{...Object.fromEntries(response.headers),'Access-Control-Allow-Origin':'http://127.0.0.1:4173'},body:await response.text()});});
 await page.goto('/');await expect(page.locator('#startBtn')).toBeEnabled();await page.locator('#nickname').fill('Tester-'+info.project.name);await page.locator('#startBtn').click();await expect(page.locator('#play')).toHaveClass('view active');
 const active=await page.evaluate(()=>JSON.parse(localStorage.getItem('historiaQuizActive')));expect(active.picks.length).toBe(10);expect(active.picks.filter(id=>questions.find(q=>q.id===id)?.type==='open').length).toBe(3);
 const before=apiRequests;await page.locator('#hintBtn').click();await expect(page.locator('#hintArea')).toBeVisible();expect(apiRequests).toBe(before);
 for(let i=0;i<10;i++){
  const q=questions.find(q=>q.id===active.picks[i]);await expect(page.locator('#qText')).toHaveText(q.question);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(q.type==='abcd'){await page.getByRole('button',{name:q.correctAnswer,exact:true}).click();await expect(page.locator('.choice-option.correct')).toHaveCount(0);await page.locator('#checkBtn').click();}
  else{await page.locator('#userAnswer').fill(q.correctAnswer);await page.locator('#revealBtn').click();if(failOnce===false&&await page.locator('#feedback').textContent().then(t=>t.includes('Testowa'))){await expect(page.locator('#userAnswer')).toHaveValue(q.correctAnswer);await page.locator('#revealBtn').click();}}
  // If the asynchronous failure is still in flight, wait for either feedback or next.
  if(q.type==='open'){await expect(page.locator('#feedback')).not.toHaveText('Sprawdzanie odpowiedzi…');if((await page.locator('#feedback').textContent()).includes('Testowa'))await page.locator('#revealBtn').click();}
  await expect(page.locator('#nextBtn')).toBeVisible();
  if(i===1){await page.reload();await expect(page.locator('#qText')).toHaveText(q.question);await expect(page.locator('#nextBtn')).toBeVisible();}
  await page.locator('#nextBtn').click();
 }
 await expect(page.locator('#result')).toHaveClass('view active');await expect(page.locator('#resultScore')).toContainText('13/13');await expect(page.locator('#rankingStatus')).toContainText('Wynik zapisany');await page.locator('#mistakeSummary summary').click();await expect(page.locator('.mistake-item')).toHaveCount(10);await page.screenshot({path:'test-results/'+info.project.name+'-result.png',fullPage:true});
 await page.locator('#nextRoundBtn').click();await expect(page.locator('#play')).toHaveClass('view active');const next=await page.evaluate(()=>JSON.parse(localStorage.getItem('historiaQuizActive')));expect(next.picks.some(id=>active.picks.includes(id))).toBe(false);await expect(page.locator('#hintArea')).toBeHidden();expect(errors).toEqual([]);
});
