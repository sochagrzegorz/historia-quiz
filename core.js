// Fisher–Yates, as in the biology quiz. Stable option IDs survive shuffling.
export function shuffle(list, random = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const topics = {egipt:'W Egipcie faraonów',izrael:'W starożytnym Izraelu',pismo:'Od hieroglifów do alfabetu'};
// Additional grouping does not change the supplied IDs or remove similar questions.
const groups = [[3,71],[6,8],[7,81],[10,72],[13,74],[16,17,75],[19,76],[21,77],[23,59,78],[24,80],[25,79],[27,82],[29,83],[31,84],[33,34,85],[36,37,86],[39,87],[41,42,88],[43,44,89],[45,48],[46,90],[47,91],[50,51],[52,92,95],[55,56,93],[57,58,94],[61,100],[62,63,96],[64,65,97],[66,67,98],[69,70,99]];
export function concept(q) {const n=Number(q.id.slice(2));return groups.find(g=>g.includes(n))?.join('-') || q.id;}
export function selectQuestions(bank, history = [], random = Math.random) {
  const recent=new Set(history.slice(-5).flat()), used=new Set(), chosen=[];
  for(const [type,count] of [['open',3],['abcd',7]]) {
    const perTopic={egipt:0,izrael:0,pismo:0};
    for(let i=0;i<count;i++) {
      let pool=bank.filter(q=>q.type===type&&!chosen.some(x=>x.id===q.id));
      // Prefer unseen IDs; only relax when the remaining pool is exhausted.
      const fresh=pool.filter(q=>!recent.has(q.id));if(fresh.length)pool=fresh;
      else {const last=id=>history.findLastIndex(round=>round.includes(id));const oldest=Math.min(...pool.map(q=>last(q.id)));pool=pool.filter(q=>last(q.id)===oldest);}
      const distinct=pool.filter(q=>!used.has(concept(q)));if(distinct.length)pool=distinct;
      const min=Math.min(...pool.map(q=>perTopic[q.topic]));pool=pool.filter(q=>perTopic[q.topic]===min);
      const q=shuffle(pool,random)[0];if(!q)throw Error('Niepełna baza pytań.');
      chosen.push(q);used.add(concept(q));perTopic[q.topic]++;
    }
  }
  return shuffle(chosen,random);
}
export function mixOptions(q, random=Math.random) {
  const options=shuffle(q.options||[],random).map((o,i)=>({...o,label:'ABCD'[i]}));
  return {options,correctOption:q.correctOption,correctLabel:options.find(o=>o.id===q.correctOption)?.label};
}
export function mapQuestion(q) {return {...q,kind:q.type==='abcd'?'choice':'open',text:q.question,answer:q.correctAnswer,choices:q.options?.map(o=>o.text),topic:topics[q.topic],topicKey:q.topic};}
export function summary(grades) {
  const values=Object.values(grades),points=values.reduce((s,a)=>s+a.score,0),correct=values.filter(a=>a.score===a.max).length,partial=values.filter(a=>a.score>0&&a.score<a.max).length;
  return {points,maxPoints:13,percent:Math.round(points/13*100),correct,partial,wrong:values.filter(a=>a.score===0).length,correctPercent:correct*10};
}
