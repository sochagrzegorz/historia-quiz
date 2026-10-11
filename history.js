import {mapQuestion,mixOptions,concept} from './core.js';
const API='https://historia-quiz-ai.sochagrzegorz.workers.dev',KEY='historiaQuizActive',HISTORY='historiaQuizHistory';
let source=[],token='',result=null,starting=false;
const storage={get(k,f=null){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}},remove(k){try{localStorage.removeItem(k)}catch{}}};
async function api(path,body){const c=new AbortController(),timer=setTimeout(()=>c.abort(),45000);try{const r=await fetch(API+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:c.signal});const d=await r.json();if(!r.ok)throw Error(d.error||'Błąd serwera '+r.status);return d;}catch(e){if(e.name==='AbortError')throw Error('Serwer nie odpowiedział na czas. Odpowiedź jest zachowana — spróbuj ponownie.');throw e;}finally{clearTimeout(timer)}}
function save(){if(token)storage.set(KEY,{token,index,nickname:playerNickname,picks:session.map(q=>q.id),options:session.map(q=>q.options),drafts:answers.map(a=>a?.value||''),hints:session.filter(q=>q.hintOpened).map(q=>q.id)});}
function error(message){$('feedback').className='feedback show bad';$('feedback').textContent=message;}
function applyGrade(q,g){return {value:q.kind==='choice'?q.sourceOptions.find(o=>o.id===g.value)?.text:g.value,checked:true,rated:q.kind==='open',points:g.score,correct:g.score===g.max,aiFeedback:g.feedback};}
start=async function(){
 if(starting||gradePending)return;
 if(token&&!finished){show('play');return;}
 const name=$('nickname').value.trim();if(!name||name.length>24||/[<>\u0000-\u001f]/.test(name)){$('nicknameError').textContent='Podaj pseudonim do 24 znaków, bez znaków < i >.';$('nicknameError').hidden=false;return;}
 starting=true;$('startBtn').disabled=true;$('nextRoundBtn').disabled=true;$('nicknameError').hidden=true;
 try{const data=await api('/session',{quiz:'historia',nickname:name,history:storage.get(HISTORY,[])});token=data.token;playerNickname=data.nickname;safeStorage.setItem('historiaQuizNickname',playerNickname);result=null;sessionVersion++;finished=false;index=0;answers=Array(10).fill(null);
 session=data.picks.map(id=>{const raw=source.find(q=>q.id===id),q=mapQuestion(raw);q.sourceOptions=raw.options||[];q.options=mixOptions(raw).options.map(o=>o.text);return q;});
 const history=storage.get(HISTORY,[]);storage.set(HISTORY,[...history,session.map(q=>q.id)].slice(-5));save();renderQ();show('play');
 }catch(e){$('nicknameError').textContent=e.message;$('nicknameError').hidden=false;$('rankingStatus').textContent=e.message;}finally{starting=false;$('startBtn').disabled=false;$('nextRoundBtn').disabled=false;}
};
check=async function(){const q=session[index];if(!q||gradePending||finished||answers[index]?.checked)return;const value=q.kind==='choice'?answers[index]?.value:$('userAnswer')?.value.trim();if(!value){error('Wybierz lub wpisz odpowiedź przed zatwierdzeniem.');return;}
 answers[index]={value};save();const at=index,version=sessionVersion;gradePending=true;
 for(const control of $('inputArea').querySelectorAll('button,textarea'))control.disabled=true;
 $('checkBtn').disabled=true;$('revealBtn').disabled=true;$('feedback').className='feedback show';$('feedback').textContent='Sprawdzanie odpowiedzi…';
 try{const answer=q.kind==='choice'?q.sourceOptions.find(o=>o.text===value)?.id:value;const g=await api('/answer',{token,id:q.id,answer});if(version!==sessionVersion||at!==index)return;answers[at]=applyGrade(q,g);gradePending=false;save();renderQ();}
 catch(e){gradePending=false;renderQ();error(e.message);}finally{gradePending=false;$('checkBtn').disabled=false;$('revealBtn').disabled=false;}
};
gradeOpen=check;
// The existing biology renderer and feedback remain in use.
const baseRender=renderQ;
renderQ=function(){baseRender();const q=session[index],a=answers[index];if(!q)return;$('checkBtn').disabled=gradePending;$('userAnswer')?.setAttribute('aria-label','Twoja odpowiedź');
 if(a?.checked&&q.kind==='choice'&&a.correct){const p=document.createElement('div');p.className='ai-explanation';p.textContent=q.explanation;$('feedback').append(p);}
 save();
};
explainChoiceWithAI=()=>{}; // Supplied explanations need no paid model request.
const originalChoose=chooseNoteTopic;
chooseNoteTopic=function(topic){
 const excluded=new Set(session.map(q=>concept(q)));
 notePool=notebookNotes.filter(n=>(topic==='all'||n.topic===topic)&&(!token||finished||!excluded.has(concept(source.find(q=>q.id===n.questionId)||{id:n.questionId}))));
 if(!notePool.length)notePool=notebookNotes.filter(n=>!session.some(q=>q.id===n.questionId));
 notePosition=Math.floor(Math.random()*notePool.length);$('noteTopic').value=topic;renderNotebook();
};
next=function(){if(gradePending||finished||!answers[index]?.checked)return;if(index<9){index++;renderQ();save()}else finish();};
finish=async function(){if(gradePending)return;gradePending=true;$('nextBtn').disabled=true;try{result=await api('/finish',{token});finished=true;save();show('result');$('playerName').textContent='Wynik dla: '+playerNickname;$('resultTitle').textContent=result.percent>=80?'Świetna robota!':result.percent>=50?'Dobra praca!':'Warto powtórzyć';$('resultScore').textContent=result.points+'/13 pkt · '+result.percent+'% punktów';$('resultMessage').textContent='W pełni poprawne: '+result.correct+'/10 ('+result.correctPercent+'%). Częściowo poprawne: '+result.partial+'. Błędne: '+result.wrong+'. Podpowiedzi: '+session.filter(q=>q.hintOpened).length+'.';$('correctStat').textContent=result.points+' / 13';$('openStat').textContent='3';
 const review=$('mistakeList');review.replaceChildren();$('mistakeSummary').querySelector('summary').firstChild.textContent='Przejrzyj odpowiedzi i wyjaśnienia ';$('mistakeCount').textContent='(10)';
 session.forEach((q,i)=>{const a=answers[i],article=document.createElement('article');article.className='mistake-item';for(const [tag,txt]of [['strong',q.text],['p','Twoja odpowiedź: '+a.value],['p','Punkty: '+a.points+'/'+(q.kind==='open'?2:1)],['p','Poprawna odpowiedź: '+q.answer],['p',q.explanation],['p',a.aiFeedback||'']]){const el=document.createElement(tag);el.textContent=txt;article.append(el)}review.append(article)});
 safeStorage.setItem('historiaQuizLastScore',String(result.points));await recordRanking();
 }catch(e){error(e.message);}finally{gradePending=false;$('nextBtn').disabled=false;}};
recordRanking=async function(){try{$('rankingStatus').textContent='Zapisywanie wyniku…';await api('/leaderboard',{quiz:'historia',token,ticket:result.ticket});$('rankingStatus').textContent='Wynik zapisany. Ranking pokazuje najlepszy wynik każdego pseudonimu.';await renderRankings();}catch(e){$('rankingStatus').textContent='Nie udało się zapisać wyniku. '+e.message;const b=document.createElement('button');b.className='btn secondary';b.textContent='Ponów zapis';b.onclick=recordRanking;$('rankingStatus').append(b);}};
renderRankings=async function(){const hosts=[$('rankHome'),$('rankResult')];try{const data=await api('/leaderboard?quiz=historia');for(const host of hosts){host.replaceChildren();if(!data.entries.length){host.textContent='Brak wyników. Zagraj, aby pojawić się w rankingu.';continue;}const ol=document.createElement('ol');ol.className='ranking';data.entries.forEach((r,i)=>{const li=document.createElement('li');for(const [cls,txt]of [['rank-number',String(i+1)+'.'],['rank-name',r.nickname],['rank-score',r.points+'/13 pkt']]){const span=document.createElement('span');span.className=cls;span.textContent=txt;li.append(span)}ol.append(li)});host.append(ol);}}catch(e){hosts.forEach(h=>h.textContent='Ranking jest chwilowo niedostępny. '+e.message);}};
home=function(){save();show('home');$('startBtn').textContent=token&&!finished?'Wznów quiz →':'Zaczynamy →';};
$('startBtn').onclick=start;$('nextRoundBtn').onclick=()=>{token='';finished=true;storage.remove(KEY);start();};$('homeBtn').onclick=home;$('resultHomeBtn').onclick=home;$('checkBtn').onclick=check;$('revealBtn').onclick=gradeOpen;$('nextBtn').onclick=next;
$('inputArea').addEventListener('input',save);$('hintBtn').addEventListener('click',save);window.addEventListener('pagehide',save);
async function init(){
 $('startBtn').disabled=true;
 try{const r=await fetch('./egipt_izrael_pismo_pytania.json');if(!r.ok)throw Error('Nie udało się pobrać pytań.');source=(await r.json()).questions;bank=source.map(mapQuestion);const active=storage.get(KEY);
 if(active?.token){try{const data=await api('/resume',{token:active.token});token=data.token;playerNickname=data.nickname;session=data.picks.map((id,i)=>{const raw=source.find(q=>q.id===id);return {...mapQuestion(raw),sourceOptions:raw.options||[],options:active.options?.[i]||mixOptions(raw).options.map(o=>o.text),hintOpened:active.hints?.includes(id)};});answers=session.map((q,i)=>data.grades[q.id]?applyGrade(q,data.grades[q.id]):{value:active.drafts?.[i]||''});index=Math.min(Math.max(active.index||0,0),9);finished=false;renderQ();show('play');if(data.result)await finish();}
 catch(e){$('nicknameError').textContent='Nie udało się wznowić poprzedniej sesji: '+e.message;$('nicknameError').hidden=false;}}
 renderRankings();
 }catch(e){$('nicknameError').textContent=e.message;$('nicknameError').hidden=false;}finally{$('startBtn').disabled=!source.length;}
}
init();
