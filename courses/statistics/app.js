(() => {
  'use strict';
  const D=window.STUDY_DATA, $=id=>document.getElementById(id);
  const KEY='statistics-study-room-v1';
  const icon={bookmark:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h12v17L12 17l-6 3.5z"/></svg>'};
  let stored={};try{stored=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{}
  const tabModes=['ultra','detail','quiz','practice'];
  const modes=[...tabModes,'advanced'];
  const names={ultra:'초고압축',detail:'상세',quiz:'확인문제',practice:'기본 30제',advanced:'심화 20제'};
  const isPractice=mode=>mode==='practice'||mode==='advanced';
  const noteKey=()=>state.mode==='practice'?state.index:`advanced:${state.index}`;
  let state={mode:'ultra',index:0,positions:{ultra:0,detail:0,quiz:0,practice:0},saved:[],answers:{},practiceNotes:{},...stored};
  if(!modes.includes(state.mode))state.mode='ultra';
  if(!Array.isArray(state.saved))state.saved=[];
  state.positions={ultra:0,detail:0,quiz:0,practice:0,advanced:0,...state.positions};state.answers=state.answers||{};state.practiceNotes=state.practiceNotes||{};
  if(!isPractice(state.practiceSet))state.practiceSet='practice';
  let previousFocus=null;
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const plain=s=>String(s).replace(/<[^>]+>/g,' ').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&amp;/g,'&').replace(/^[=!]/,'');
  const pretty=s=>window.STUDY_FORMATTING[s]??(s.startsWith('=')?s.slice(1):s);
  function findTerms(strings){
    const text=strings.join(' ').replace(/<[^>]+>/g,' ');
    return window.STUDY_TERMS.map(term=>({term,at:text.search(new RegExp(term.pattern))})).filter(x=>x.at>=0).sort((a,b)=>a.at-b.at).map(x=>x.term);
  }
  function termsMarkup(strings,exclude=[]){
    const terms=findTerms(strings).filter(term=>!exclude.includes(term.id));
    return terms.length?`<dl class="term-guide" aria-label="이 페이지 용어 풀이">${terms.map(t=>`<div data-term="${t.id}"><dt><abbr title="${escape(t.english)}">${escape(t.label)}</abbr></dt><dd>${escape(t.name)}</dd></div>`).join('')}</dl>`:'';
  }
  const noteTerms=s=>[s.title,...s.panels.flatMap(p=>[p.title,...p.items])];
  function fitMath(){
    document.querySelectorAll('#lesson .inline-math').forEach(el=>{
      el.classList.remove('math-wide');
      const parent=el.closest('p,li,h1,.answer')||el.parentElement;
      const style=getComputedStyle(parent),available=parent.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
      if([...el.querySelectorAll('.katex-html>.base')].some(base=>base.getBoundingClientRect().width>available+1))el.classList.add('math-wide');
    });
  }
  const deck=()=>D[state.mode];
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}};
  const chapterStart=(mode,ch)=>D[mode].findIndex(s=>s.ch===ch);

  function parseRoute(){
    const m=location.hash.match(/^#(ultra|detail|quiz|practice|advanced)\/(\d+)$/);
    if(m){state.mode=m[1];state.index=+m[2]-1;return true}return false;
  }
  function route(replace=false){
    const hash=`#${state.mode}/${state.index+1}`;
    if(location.hash!==hash)history[replace?'replaceState':'pushState'](null,'',hash);
  }
  function navigate(mode,index,{replace=false,focus=false}={}){
    state.positions[state.mode]=state.index;state.mode=mode;state.index=index;
    state.index=Math.max(0,Math.min(D[mode].length-1,state.index|0));
    state.positions[mode]=state.index;route(replace);render();closeMenu();
    window.scrollTo({top:0,behavior:'instant'});if(focus)$('lesson').focus({preventScroll:true});
  }
  function changeMode(mode){
    if(mode===state.mode)return;
    const current=deck()[state.index];let target=state.positions[mode];
    const start=chapterStart(mode,current.ch);
    if(start>=0&&D[mode][target]?.ch!==current.ch)target=start;
    navigate(mode,target);
  }
  function sourceMarkup(s){ return `<p class="source-text">${escape(s.src)}</p>`; }
  function noteMarkup(s){
    const key=`${state.mode}:${state.index}`,marked=state.saved.includes(key);
    return `<div class="lesson-top"><span class="chapter-label">${String(s.ch).padStart(2,'0')} / ${escape(D.chapters[s.ch])}</span><button id="bookmark" class="icon-button bookmark" aria-label="${marked?'표시 해제':'내용 표시'}" aria-pressed="${marked}">${icon.bookmark}</button></div>
    <h1>${s.title}</h1>${termsMarkup(noteTerms(s))}<div class="panels">${s.panels.map(p=>`<section class="panel"><h2>${p.title}</h2>${p.items.map(item=>`<p class="${item.startsWith('=')?'math':''}">${pretty(item)}</p>`).join('')}</section>`).join('')}</div>
    <details class="supplement"><summary>${s.warnings.length?'주의·출처':'출처'}</summary><div class="supplement-body">${s.warnings.map(w=>`<p>${pretty(w)}</p>`).join('')}${sourceMarkup(s)}</div></details>`;
  }
  function quizMarkup(q){
    const selected=state.answers[state.index],answered=Number.isInteger(selected),correct=answered&&selected===q.answer;
    return `<section class="quiz"><div class="lesson-top"><span class="chapter-label">${String(q.ch).padStart(2,'0')} / ${escape(D.chapters[q.ch])}</span></div>
    <h1>${pretty(q.prompt)}</h1>${termsMarkup([q.prompt,...q.options])}<div class="answers" role="group" aria-label="답 선택">${q.options.map((option,i)=>`<button class="answer ${answered&&i===q.answer?'correct':''} ${answered&&i===selected&&i!==q.answer?'wrong':''}" data-answer="${i}" ${answered?'disabled':''}><span class="answer-number">${answered&&i===q.answer?'✓':i+1}</span><span>${pretty(option)}</span><span class="sr-only">${answered&&i===q.answer?'정답':answered&&i===selected?'선택한 오답':''}</span></button>`).join('')}</div>
    ${answered?`<div class="quiz-result ${correct?'':'wrong'}" role="status"><b>${correct?'정답':'정답은 '+(q.answer+1)+'번'}</b>${termsMarkup([q.explanation],findTerms([q.prompt,...q.options]).map(t=>t.id))}<p>${pretty(q.explanation)}</p></div><div class="quiz-tools"><button id="related">개념 보기 ↗</button><button id="retry">다시 풀기</button></div>`:''}
    ${footerMarkup()}</section>`;
  }
  function footerMarkup(){
    const list=deck(),next=list[state.index+1];
    return `<footer class="lesson-footer"><span class="page-count">${String(state.index+1).padStart(2,'0')} / ${String(list.length).padStart(2,'0')}</span><div class="page-nav"><button class="nav-button prev" id="prev" ${state.index===0?'disabled':''}>← 이전</button><button class="nav-button next" id="next" ${state.index===list.length-1?'disabled':''}>다음 →</button></div></footer><div class="page-progress" aria-hidden="true"><span style="width:${(state.index+1)/list.length*100}%"></span></div>`;
  }
  function tableMarkup(table){
    return `<div class="table-scroll"><table class="practice-table"><thead><tr>${table.headers.map(h=>`<th scope="col">${escape(h)}</th>`).join('')}</tr></thead><tbody>${table.rows.map(row=>`<tr>${row.map((cell,i)=>i===0?`<th scope="row">${escape(cell)}</th>`:`<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function practiceMarkup(q){
    const marked=state.saved.includes(`${state.mode}:${state.index}`);
    const visible=[q.title,...q.stem,...q.parts],known=findTerms(visible).map(t=>t.id);
    return `<article class="practice"><div class="practice-sets" role="group" aria-label="문제 세트"><button data-practice-set="practice" aria-pressed="${state.mode==='practice'}">기본 30제</button><button data-practice-set="advanced" aria-pressed="${state.mode==='advanced'}">심화 20제</button></div><div class="lesson-top"><span class="chapter-label">${q.ch===6?'6(1) / 일표본 t 추론':String(q.ch).padStart(2,'0')+' / '+escape(D.chapters[q.ch])}</span><button id="bookmark" class="icon-button bookmark" aria-label="${marked?'표시 해제':'내용 표시'}" aria-pressed="${marked}">${icon.bookmark}</button></div>
    <div class="practice-heading"><h1>${q.n}. ${q.title}</h1><button id="tables-open" class="table-shortcut">통계표 ↗</button></div>
    ${termsMarkup(visible)}
    <section class="practice-question">${q.stem.map(s=>`<p>${pretty(s)}</p>`).join('')}${q.table?tableMarkup(q.table):''}<ol class="practice-parts">${q.parts.map(s=>`<li>${pretty(s)}</li>`).join('')}</ol></section>
    <div class="practice-notes"><label for="practice-note">내 답안</label><textarea id="practice-note" rows="3" aria-label="내 답안" spellcheck="false">${escape(state.practiceNotes[noteKey()]||'')}</textarea></div>
    <details class="practice-solution"><summary>정답·해설</summary><div class="solution-body">${termsMarkup(q.answer,known)}${q.answer.map(s=>`<p class="${s.startsWith('=')?'math':''}">${pretty(s)}</p>`).join('')}<div class="solution-source">${sourceMarkup(q)}</div></div></details>
    ${footerMarkup()}</article>`;
  }
  function showTables(){
    const T=window.STUDY_TABLES;
    $('tables-content').innerHTML=`<p class="table-convention">Φ(z)=P(Z≤z). 임계값의 α는 오른쪽 꼬리확률입니다.</p><h3>표준정규 누적확률</h3>${tableMarkup(T.normal)}<h3>정규 임계값</h3>${tableMarkup(T.z)}<h3>t 임계값</h3>${tableMarkup(T.t)}<h3>χ² 임계값</h3>${tableMarkup(T.chi)}<h3>F 임계값</h3>${tableMarkup(T.f)}`;
    showDialog('tables-dialog');
  }
  function render(){
    state.index=Math.max(0,Math.min(deck().length-1,state.index|0));
    const s=deck()[state.index];state.positions[state.mode]=state.index;
    document.title=`${plain(s.title||s.prompt)} · 통계학`;
    if(isPractice(state.mode))state.practiceSet=state.mode;
    document.querySelectorAll('[data-mode]').forEach(b=>{const active=b.dataset.mode===(isPractice(state.mode)?'practice':state.mode);b.setAttribute('aria-selected',active);b.tabIndex=active?0:-1});
    const availableChapters=new Set(deck().map(topic=>topic.ch));
    $('chapters').innerHTML=Object.entries(D.chapters).filter(([ch])=>availableChapters.has(+ch)).map(([ch,title])=>`<button class="chapter-button ${+ch===s.ch?'active':''}" data-ch="${ch}" ${+ch===s.ch?'aria-current="page"':''}><span class="number">${ch.padStart(2,'0')}</span>${escape(isPractice(state.mode)&&+ch===6?'일표본 t 추론':title)}</button>`).join('');
    $('topics').innerHTML=deck().map((topic,i)=>topic.ch===s.ch?`<button class="topic-button ${i===state.index?'active':''}" data-topic="${i}" ${i===state.index?'aria-current="page"':''}>${escape(plain(topic.title||topic.prompt))}</button>`:'').join('');
    $('lesson').innerHTML=state.mode==='quiz'?quizMarkup(s):isPractice(state.mode)?practiceMarkup(s):noteMarkup(s)+footerMarkup();
    fitMath();document.fonts.ready.then(fitMath);
    $('saved-count').textContent=state.saved.length||'';
    $('prev').onclick=()=>navigate(state.mode,state.index-1);$('next').onclick=()=>navigate(state.mode,state.index+1);
    if(state.mode!=='quiz')$('bookmark').onclick=()=>{const key=`${state.mode}:${state.index}`,i=state.saved.indexOf(key);if(i>=0)state.saved.splice(i,1);else state.saved.push(key);const y=scrollY;render();scrollTo(0,y);$('bookmark').focus({preventScroll:true})};
    else{
      document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{state.answers[state.index]=+b.dataset.answer;render()});
      if($('retry'))$('retry').onclick=()=>{delete state.answers[state.index];render()};
      if($('related'))$('related').onclick=()=>navigate('detail',s.related,{focus:true});
    }
    if(isPractice(state.mode)){
      document.querySelectorAll('[data-practice-set]').forEach(b=>b.onclick=()=>{
        const mode=b.dataset.practiceSet;if(mode!==state.mode)navigate(mode,state.positions[mode]||0);
      });
      $('practice-note').oninput=e=>{state.practiceNotes[noteKey()]=e.target.value;save()};
      $('tables-open').onclick=showTables;
    }
    $('status').textContent=`${names[state.mode]} ${state.index+1}, ${plain(s.title||s.prompt)}`;
    save();
  }
  function showDialog(id){previousFocus=document.activeElement;$(id).showModal()}
  function closeMenu(){$('menu').setAttribute('aria-expanded','false');document.body.classList.remove('sidebar-open');$('shade').hidden=true}
  function closeDialog(dialog){dialog.close();if(previousFocus?.isConnected)previousFocus.focus()}
  function search(){
    const query=$('search-input').value.trim().toLocaleLowerCase();
    if(!query){$('search-results').innerHTML='';return}
    const results=[];
    for(const mode of ['ultra','detail'])D[mode].forEach((s,i)=>{
      const hay=plain(s.title+' '+s.panels.map(p=>p.title+' '+p.items.join(' ')).join(' ')+' '+s.warnings.join(' ')).toLocaleLowerCase();
      if(hay.includes(query))results.push({mode,index:i,ch:s.ch,title:s.title});
    });
    for(const mode of ['practice','advanced'])D[mode].forEach((s,i)=>{if(plain(s.title+' '+s.stem.join(' ')+' '+s.parts.join(' ')).toLocaleLowerCase().includes(query))results.push({mode,index:i,ch:s.ch,title:s.n+'. '+s.title})});
    $('search-results').innerHTML=results.length?results.slice(0,70).map(r=>`<button class="result-item" data-result-mode="${r.mode}" data-result-index="${r.index}"><small>${r.ch}장 · ${names[r.mode]}</small>${escape(r.title)}</button>`).join(''):'<p class="empty">검색 결과가 없습니다.</p>';
  }
  $('home').onclick=e=>{e.preventDefault();navigate('ultra',0)};
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>changeMode(b.dataset.mode==='practice'?state.practiceSet:b.dataset.mode));
  $('chapters').onclick=e=>{const b=e.target.closest('[data-ch]');if(b)navigate(state.mode,chapterStart(state.mode,+b.dataset.ch))};
  $('topics').onclick=e=>{const b=e.target.closest('[data-topic]');if(b)navigate(state.mode,+b.dataset.topic)};
  $('menu').onclick=()=>{const open=document.body.classList.toggle('sidebar-open');$('menu').setAttribute('aria-expanded',open);$('shade').hidden=!open};$('shade').onclick=closeMenu;
  $('focus').onclick=()=>{const focused=document.body.classList.toggle('focus-mode');$('focus').setAttribute('aria-pressed',focused);$('focus').setAttribute('aria-label',focused?'목차 보이기':'집중 모드')};
  $('search-open').onclick=()=>{showDialog('search-dialog');$('search-input').focus()};$('search-input').oninput=search;
  $('saved-open').onclick=()=>{
    $('saved-results').innerHTML=state.saved.length?state.saved.map(key=>{const [mode,num]=key.split(':'),s=D[mode]?.[+num];return s?`<button class="result-item" data-result-mode="${mode}" data-result-index="${num}"><small>${s.ch}장 · ${names[mode]}</small>${escape(s.title)}</button>`:''}).join(''):'<p class="empty">주제 옆의 표시 버튼으로 저장할 수 있어요.</p>';showDialog('saved-dialog');
  };
  document.querySelectorAll('dialog').forEach(dialog=>{
    dialog.querySelector('.close-dialog').onclick=()=>closeDialog(dialog);
    dialog.onclick=e=>{
      const target=e.target.closest('[data-result-mode]');
      if(target){closeDialog(dialog);navigate(target.dataset.resultMode,+target.dataset.resultIndex,{focus:true})}
      if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(dialog)}
    };
  });
  document.querySelector('.mode-tabs').onkeydown=e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();let i=tabModes.indexOf(isPractice(state.mode)?'practice':state.mode);
    i=e.key==='Home'?0:e.key==='End'?tabModes.length-1:(i+(e.key==='ArrowRight'?1:tabModes.length-1))%tabModes.length;
    changeMode(tabModes[i]==='practice'?state.practiceSet:tabModes[i]);$('mode-'+tabModes[i]).focus();
  };
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!$('search-dialog').open)$('search-open').click();return}
    if(e.key==='Escape'){closeMenu();return}
    if(document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT','BUTTON','SUMMARY','A'].includes(document.activeElement.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();navigate(state.mode,state.index+1)}
    if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();navigate(state.mode,state.index-1)}
  });
  window.addEventListener('popstate',()=>{if(parseRoute())render()});
  window.addEventListener('hashchange',()=>{if(parseRoute())render()});
  window.addEventListener('resize',fitMath);
  $('lesson').addEventListener('toggle',fitMath,true);
  parseRoute();route(true);render();
})();
