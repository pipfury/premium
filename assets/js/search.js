
async function searchLoad(){
 const DATA_ROOT = window.location.pathname.split('/').filter(Boolean).length ? '../data/' : 'data/';
 const files=['vsa-lessons.json','vsa-signals.json','vsa-case-files.json','vsa-mistakes.json','vsa-glossary.json'];
 const all=[];
 for(const file of files){ const arr=await (await fetch(DATA_ROOT+file)).json(); arr.forEach(x=>all.push({file,...x,text:JSON.stringify(x).toLowerCase()})); }
 const input=document.querySelector('#siteSearch'), out=document.querySelector('#searchResults');
 const render=()=>{ const q=input.value.toLowerCase().trim(); if(!q){out.innerHTML='<p class="muted">Type a VSA term such as no demand, stopping volume, test, background, or upthrust.</p>';return} const res=all.filter(x=>x.text.includes(q)).slice(0,30); out.innerHTML=res.length?res.map(r=>`<article class="card"><span class="tag">${r.file.replace('vsa-','').replace('.json','')}</span><h3>${r.title||r.term||r.market}</h3><p class="muted">${r.summary||r.definition||r.problem||r.lesson||''}</p></article>`).join(''):'<p class="muted">No result yet. Add more JSON data later and search will grow automatically.</p>'; };
 input.addEventListener('input',render); render();
}
window.addEventListener('DOMContentLoaded',searchLoad);
