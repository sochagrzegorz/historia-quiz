import test from 'node:test';import assert from 'node:assert/strict';import worker,{gradeOpen}from '../worker.js';import {questions}from '../bank.js';
class KV{data=new Map();async get(k){return this.data.get(k)?.value??null}async put(k,v,options){this.data.set(k,{value:JSON.parse(v),metadata:options.metadata})}async list({prefix}){return {keys:[...this.data].filter(([k])=>k.startsWith(prefix)).map(([name,v])=>({name,metadata:v.metadata})),list_complete:true}}}
const env={LEADERBOARD:new KV(),AI:{run:async()=>({response:{score:2,feedback:'Poprawna odpowiedź.'}})}};
let ip=0;async function call(path,data,opts={}){const r=await worker.fetch(new Request('https://api.test'+path,{method:data?'POST':'GET',headers:{Origin:'https://sochagrzegorz.github.io','Content-Type':'application/json','CF-Connecting-IP':'test-'+(++ip)},...(data?{body:JSON.stringify(data)}:{})}),opts.env||env);return {status:r.status,data:await r.json()};}
test('full real worker flow with mocked AI: forged scores refused, history isolated, replay idempotent',async()=>{
 env.LEADERBOARD.data.set('leaderboard',{value:[{nickname:'Biologia',quiz:'biologia',points:13}]});
 const s=await call('/session',{quiz:'historia',nickname:'Test',history:[]});assert.equal(s.status,200);assert.equal(s.data.picks.length,10);const token=s.data.token;
 assert.equal((await call('/finish',{token})).status,409);assert.equal((await call('/answer',{token,id:'INVALID',answer:'A'})).status,400);
 for(const id of s.data.picks){const q=questions.find(q=>q.id===id),answer=q.type==='abcd'?q.correctOption:q.correctAnswer;const a=await call('/answer',{token,id,answer});assert.equal(a.status,200);assert.equal(a.data.score,q.type==='abcd'?1:2);assert.deepEqual((await call('/answer',{token,id,answer})).data,a.data);assert.equal((await call('/answer',{token,id,answer:q.type==='abcd'?'B':'inna odpowiedź'})).status,409);}
 const r=await call('/finish',{token});assert.equal(r.data.points,13);assert.equal(r.data.correct,10);assert.equal((await call('/leaderboard',{quiz:'historia',token,ticket:r.data.ticket,points:13})).status,400);
 assert.equal((await call('/leaderboard',{quiz:'biologia',token,ticket:r.data.ticket})).status,400);
 for(let i=0;i<2;i++)assert.equal((await call('/leaderboard',{quiz:'historia',token,ticket:r.data.ticket})).status,200);
 const rank=await call('/leaderboard?quiz=historia');assert.equal(rank.data.entries.length,1);assert.equal(rank.data.entries[0].quiz,'historia');assert.equal(env.LEADERBOARD.data.get('leaderboard').value[0].points,13);
 const resumed=await call('/resume',{token});assert.equal(Object.keys(resumed.data.grades).length,10);assert.equal(resumed.data.result.points,13);
});
test('AI outage and malformed grading do not award points',async()=>{
 const q=questions.find(q=>q.type==='open');for(const AI of [{run:async()=>{throw Error('offline')}},{run:async()=>({response:{score:5,feedback:'x'}})},{run:async()=>({response:{score:2,feedback:''}})}])await assert.rejects(()=>gradeOpen(q,'odpowiedź',{AI}));
});
test('AI gets trusted question and semantic instructions, not client rubric',async()=>{let input;await gradeOpen(questions.find(q=>q.id==='H-073'),'rzemieslnicy, kaplani i rolnicy',{AI:{run:async(m,args)=>{input=args;return {response:{score:2,feedback:'Trzy poprawne grupy.'}}}}});assert.match(input.messages[0].content,/synonimy/);assert.match(input.messages[0].content,/nie zamkniętym kluczem/);assert.match(input.messages.find(m=>m.role==='user').content,/rzemieslnicy/);});
test('CORS, invalid JSON and nickname input validation',async()=>{
 const r=await worker.fetch(new Request('https://api.test/session',{method:'OPTIONS',headers:{Origin:'https://sochagrzegorz.github.io'}}),env);assert.equal(r.status,204);
 assert.equal((await worker.fetch(new Request('https://api.test/health',{headers:{Origin:'https://evil.test'}}),env)).status,403);
 assert.equal((await call('/session',{quiz:'historia',nickname:'<script>'})).status,400);assert.equal((await call('/session',{quiz:'biologia',nickname:'Test'})).status,400);
});
