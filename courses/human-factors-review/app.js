(() => {
  'use strict';
  const courses=window.COURSES;
  const allLessons=courses.flatMap(c=>c.lessons.map(l=>({...l,chapter:c.id})));
  let course,groups,lessons,facts,quizzes,priorities,storageKey,saved,state;
  const $=(s,root=document)=>root.querySelector(s);
  const $$=(s,root=document)=>[...root.querySelectorAll(s)];
  const main=$('#main');
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const arrow='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
  const chevron='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
  const down='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const check='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
  let currentLesson=null, memoryFilter='all', showAll=false, session=null, toastTimer;
  let openGroups=new Set();
  const typeNames={ox:'OX',short:'개념 맞히기',blank:'순서·빈칸',essay:'서술형',wrong:'오답 복습'};
  function url(view='overview',chapter=course.id){return '#chapter/'+chapter+'/'+view;}
  function go(view){location.hash=url(view);}
  function scopeLinks(root=main){
    $$('a[href^="#"]',root).forEach(a=>{
      const view=a.getAttribute('href').slice(1);
      if(!view.startsWith('chapter/'))a.setAttribute('href',url(view));
    });
  }
  function activateChapter(id){
    const next=courses.find(c=>c.id===id)||courses[0];
    if(course===next)return;
    course=next;({groups,lessons,facts,quizzes,priorities}=course);
    storageKey='study-hub-human-factors-review-chapter-'+course.id+'-study-v1';saved={};
    try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')||{};}catch{}
    state={
      known:new Set(Array.isArray(saved.known)?saved.known.filter(id=>facts.some(f=>f.id===id)):[]),
      wrong:new Set(Array.isArray(saved.wrong)?saved.wrong.filter(id=>quizzes.some(q=>q.id===id)):[]),
      last:lessons.some(l=>l.id===saved.last)?saved.last:null
    };
    memoryFilter='all';showAll=false;session=null;openGroups=new Set();
    $('#chapter-switch').innerHTML=courses.map(c=>'<a href="'+url('overview',c.id)+'"'+(c.id===course.id?' class="active" aria-current="page"':'')+'>'+c.id+'장</a>').join('');
    $('#chapter-title').textContent=course.title;$('#chapter-title').href=url();
    $('.brand').href=url();
    $('#footer-chapter').textContent=course.id+'장 '+course.title;
    $$('.view-tabs a').forEach(a=>a.href=url(a.dataset.view==='learn'?'overview':a.dataset.view));
  }
  function persist(){
    try{localStorage.setItem(storageKey,JSON.stringify({...saved,...state,known:[...state.known],wrong:[...state.wrong]}));}
    catch{toast('브라우저 저장 공간을 사용할 수 없습니다.');}
  }
  function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2400);}
  function inline(s){return escape(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');}
  function markdown(text){
    const lines=text.split('\n'),out=[];let i=0;
    while(i<lines.length){
      const line=lines[i].trim();
      if(!line){i++;continue;}
      if(line.startsWith('|')){
        const rows=[];
        while(i<lines.length&&lines[i].trim().startsWith('|')){const r=lines[i].trim().split('|').slice(1,-1).map(c=>c.trim());if(!r.every(c=>/^[-: ]+$/.test(c)))rows.push(r);i++;}
        out.push('<div class="table-wrap" role="region" aria-label="학습 내용 비교표" tabindex="0"><table><thead><tr>'+rows[0].map(c=>'<th scope="col">'+inline(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.slice(1).map(r=>'<tr>'+r.map(c=>'<td>'+inline(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>');continue;
      }
      if(/^\d+\.\s/.test(line)||/^-\s/.test(line)){
        const ordered=/^\d+\./.test(line),tag=ordered?'ol':'ul',items=[];
        while(i<lines.length&&(ordered?/^\d+\.\s/:/^-\s/).test(lines[i].trim())){items.push('<li>'+inline(lines[i].trim().replace(/^(\d+\.|-)\s/,''))+'</li>');i++;}
        out.push('<'+tag+'>'+items.join('')+'</'+tag+'>');continue;
      }
      const paragraph=[];
      while(i<lines.length&&lines[i].trim()&&!/^(\||\d+\.\s|-\s)/.test(lines[i].trim())){paragraph.push(lines[i].trim());i++;}
      const p=paragraph.join(' '),isFlow=/^\*\*.+→.+\*\*$/.test(p);
      out.push('<p'+(isFlow?' class="flow-line"':'')+'>'+inline(p)+'</p>');
    }
    return out.join('');
  }
  function renderNav(){
    $('#lesson-nav').innerHTML=groups.map(g=>{
      const items=lessons.filter(l=>l.group===g.id),open=openGroups.has(g.id);
      return '<div class="nav-group'+(open?' open':'')+'" data-group="'+g.id+'"><button class="group-toggle" data-group-toggle="'+g.id+'" aria-expanded="'+open+'"><span class="group-number">0'+g.id+'</span><span>'+g.title+'</span>'+chevron+'</button><div class="lesson-links">'+items.map(l=>'<a class="lesson-link'+(currentLesson===l.id?' active':'')+'" href="#lesson/'+l.id+'"'+(currentLesson===l.id?' aria-current="page"':'')+'>'+escape(l.title)+'</a>').join('')+'</div></div>';
    }).join('');
    scopeLinks($('#lesson-nav'));scopeLinks();
  }

  function heading(eyebrow,title,description){return (/^\d+장$/.test(eyebrow)?'<div class="eyebrow">'+eyebrow+'</div>':'')+'<h1 class="page-title">'+title+'</h1>'+(description?'<p class="page-description">'+description+'</p>':'');}
  function overview(){
    const next=state.last||lessons[0].id;
    main.innerHTML='<section class="overview-header"><div>'+heading(course.id+'장',escape(course.title),escape(course.description))+'</div><a class="primary-button" href="#lesson/'+next+'">'+(state.last?'이어서 학습':'학습 시작')+arrow+'</a></section><div class="overview-meta"><span><strong>'+lessons.length+'</strong> 개념</span><span><strong>'+facts.length+'</strong> 암기 카드</span><span><strong>'+quizzes.length+'</strong> 문제</span></div><section><div class="group-grid">'+groups.map(g=>{
      const items=lessons.filter(l=>l.group===g.id);
      return '<a class="group-card" href="#lesson/'+items[0].id+'"><div class="card-top"><span class="card-number">0'+g.id+'</span></div><h3>'+g.title+'</h3><p>'+g.description+'</p><div class="card-bottom"><span>'+items.length+'개 개념</span>'+arrow+'</div></a>';
    }).join('')+'</div></section>';
  }
  function lesson(id){
    const l=lessons.find(l=>l.id===id);
    if(!l){go('overview');return;}
    currentLesson=id;state.last=id;persist();openGroups.add(l.group);
    const index=lessons.indexOf(l);
    let body=markdown(l.body);
    main.innerHTML='<article><header class="lesson-heading"><h1>'+escape(l.title)+'</h1></header><div class="reading-body">'+body+'</div><details class="source-note"><summary>출처</summary><p>'+escape(l.pages)+' · 학습용으로 다시 작성. 계산 예제·연습문제는 직접 구성.</p></details></article><nav class="lesson-pagination" aria-label="이전 다음 개념">'+(index?'<a href="#lesson/'+lessons[index-1].id+'"><span>← 이전</span>'+escape(lessons[index-1].title)+'</a>':'<a href="#overview"><span>← 목차</span>'+course.id+'장 '+escape(course.title)+'</a>')+(index<lessons.length-1?'<a href="#lesson/'+lessons[index+1].id+'"><span>다음 →</span>'+escape(lessons[index+1].title)+'</a>':'<a href="#memory"><span>다음 →</span>핵심 암기</a>')+'</nav>';
  }
  function memory(){
    let list=facts;
    if(memoryFilter==='unknown')list=facts.filter(f=>!state.known.has(f.id));
    if(memoryFilter==='known')list=facts.filter(f=>state.known.has(f.id));
    main.innerHTML=heading('RECALL','핵심 암기','')+'<div class="memory-count">'+state.known.size+' / '+facts.length+'개 암기 완료</div><div class="subheader"><div class="filter-tabs" aria-label="암기 카드 필터">'+[['all','전체',facts.length],['unknown','미암기',facts.length-state.known.size],['known','암기 완료',state.known.size]].map(([k,t,n])=>'<button class="'+(memoryFilter===k?'active':'')+'" data-memory-filter="'+k+'" aria-pressed="'+(memoryFilter===k)+'">'+t+'<span>'+n+'</span></button>').join('')+'</div><button class="text-button" data-action="expand-all">'+(showAll?'답 접기':'답 펼치기')+'</button></div>'+(list.length?'<div class="memory-list">'+list.map(f=>{const known=state.known.has(f.id);return '<details class="memory-item'+(known?' known':'')+'" data-memory-id="'+f.id+'"'+(showAll?' open':'')+'><summary><span class="memory-index"><span>'+String(facts.indexOf(f)+1).padStart(2,'0')+'</span></span><span class="memory-question">'+escape(f.question)+'</span><span class="memory-size">'+escape(f.count)+'</span>'+down+'</summary><div class="memory-answer"><p>'+escape(f.answer)+'</p><label class="memory-known"><input type="checkbox" data-known="'+f.id+'"'+(known?' checked':'')+'>외웠어요</label></div></details>';}).join('')+'</div>':'<div class="empty-state"><h2>'+(memoryFilter==='known'?'아직 표시한 카드가 없어요':'모두 기억했어요')+'</h2><p>'+(memoryFilter==='known'?'기억한 카드를 ‘외웠어요’로 표시해 보세요.':'문제 풀이로 한 번 더 확인해 보세요.')+'</p><a class="outline-button" href="'+(memoryFilter==='known'?'#memory':'#quiz')+'"'+(memoryFilter==='known'?' data-reset-memory="true"':'')+'>'+(memoryFilter==='known'?'전체 카드 보기':'문제 풀기')+arrow+'</a></div>');
    scopeLinks();
  }
  function quizMenu(){
    session=null;
    const descriptions={ox:'헷갈리는 문장을 정확하게 구별하기',short:'설명을 읽고 알맞은 용어 떠올리기',blank:'단계와 목록을 빠짐없이 기억하기',essay:'개념과 예시를 내 말로 연결하기'};
    main.innerHTML=heading('PRACTICE','문제 풀기','')+'<div class="quiz-types">'+['ox','short','blank','essay'].map((type,i)=>'<button class="quiz-type" data-start-quiz="'+type+'"><span class="quiz-type-number">0'+(i+1)+'</span><h2>'+typeNames[type]+'</h2><div class="quiz-type-bottom"><span>'+quizzes.filter(q=>q.type===type).length+'문제</span>'+arrow+'</div></button>').join('')+'</div><div class="quiz-review-row"><div>오답 복습 <span> &nbsp;'+state.wrong.size+'문제</span></div><button class="outline-button" data-start-quiz="wrong"'+(!state.wrong.size?' disabled':'')+'>오답만 풀기'+arrow+'</button></div><p class="quiz-practice-note">OX 자동 채점 · 단답·빈칸·서술형 직접 평가</p>';
  }
  function startSession(kind,lessonId){
    let list=kind==='wrong'?quizzes.filter(q=>state.wrong.has(q.id)):kind==='related'?quizzes.filter(q=>q.lesson===lessonId):quizzes.filter(q=>q.type===kind);
    if(!list.length){session=null;main.innerHTML=heading('PRACTICE',kind==='related'?'직접 설명해 보기':'오답이 없습니다',kind==='related'?'이 개념의 핵심 내용을 내 말로 정리해 보세요.':'문제를 풀고 다시 확인할 문항을 모아 보세요.')+(kind==='related'?'<div class="answer-panel"><p class="answer-content">'+escape(lessons.find(l=>l.id===lessonId)?.title||'')+'의 정의와 특징을 예시와 함께 설명해 보세요.</p><a class="related-link" href="#lesson/'+lessonId+'">개념으로 돌아가기 →</a></div>':'<a class="outline-button" href="#quiz">전체 문제 보기'+arrow+'</a>');return;}
    session={kind,title:kind==='related'?'개념 확인':typeNames[kind],list,index:0,answers:[],revealed:false,selected:null,draft:'',graded:false};
    renderQuestion();
  }
  function renderQuestion(){
    if(!session)return;
    const {list,index,revealed}=session,q=list[index];
    if(!q){renderResults();scopeLinks();return;}
    const isOX=q.type==='ox';
    main.innerHTML='<div class="quiz-session-top"><button data-action="exit-quiz">'+session.title+' <span aria-hidden="true">↗</span></button><span>'+String(index+1).padStart(2,'0')+' / '+list.length+'</span></div><div class="quiz-progress" aria-label="'+(index+1)+' / '+list.length+'번째 문제"><span style="width:'+((index+1)/list.length*100)+'%"></span></div><div class="quiz-label">'+(typeNames[q.type]||'')+'</div><h1 class="quiz-question">'+escape(q.question)+'</h1>'+(isOX?'<div class="ox-options" aria-label="정답 선택">'+['O','X'].map((value,i)=>'<button class="ox-button'+(session.selected===value?' selected':'')+'" data-ox="'+value+'"'+(revealed?' disabled':'')+'>'+value+'<span>'+(i?'틀리다':'맞다')+'</span></button>').join('')+'</div>':'<label class="sr-only" for="quiz-draft">내 답</label><textarea class="quiz-input" id="quiz-draft" placeholder="답을 떠올려 적어 보세요. (선택)"'+(revealed?' readonly':'')+'>'+escape(session.draft)+'</textarea>'+(!revealed?'<button class="primary-button quiz-reveal" data-action="reveal">정답 확인'+arrow+'</button>':''))+(revealed?answerPanel(q):'');
    scopeLinks();
  }
  function answerPanel(q){
    const isOX=q.type==='ox',correct=session.selected===q.answer,l=lessons.find(l=>l.id===q.lesson);
    return '<section class="answer-panel" aria-live="polite"><div class="answer-status">'+(isOX?(correct?check:'<span aria-hidden="true">↺</span>'):'')+(isOX?(correct?'정답입니다':'다시 확인해 보세요'):'모범 답안')+'</div>'+(isOX?'<div class="answer-label">정답 '+q.answer+'</div>':'')+'<p class="answer-content">'+escape(isOX?q.explanation:q.answer)+'</p>'+(l?'<a class="related-link" href="#lesson/'+l.id+'">'+escape(l.title)+' 복습 →</a>':'')+'</section>'+(isOX?'<div class="quiz-next"><button class="primary-button" data-action="next-question">'+(session.index===session.list.length-1?'결과 보기':'다음 문제')+arrow+'</button></div>':'<div class="self-grade"><button class="outline-button" data-grade="wrong">다시 볼게요</button><button class="primary-button" data-grade="correct">기억했어요'+check+'</button></div>');
  }
  function gradeQuestion(correct){
    if(!session||session.graded)return;
    const q=session.list[session.index];session.answers.push({id:q.id,correct});session.graded=true;
    if(correct)state.wrong.delete(q.id);else state.wrong.add(q.id);persist();
  }
  function nextQuestion(){
    if(!session||!session.graded)return;
    session.index++;session.revealed=false;session.selected=null;session.draft='';session.graded=false;
    renderQuestion();window.scrollTo({top:0,behavior:'instant'});
  }
  function renderResults(){
    const correct=session.answers.filter(a=>a.correct).length,wrong=session.answers.filter(a=>!a.correct).map(a=>quizzes.find(q=>q.id===a.id));
    main.innerHTML='<section class="quiz-results">'+heading('', '결과','')+'<div class="result-score">'+correct+'<span>/ '+session.list.length+'</span></div><p class="result-description">'+(session.list.some(q=>q.type!=='ox')?'자동 채점과 직접 평가 결과를 함께 집계했습니다.<br>':'')+(wrong.length?wrong.length+'문제는 오답 복습에 모아 두었습니다.':'이번 문제를 모두 맞혔습니다.')+'</p><div class="result-actions">'+(wrong.length?'<button class="primary-button" data-action="retry-session">이번 오답 다시 풀기'+arrow+'</button>':'')+'<a class="outline-button" href="#quiz">다른 문제 풀기'+arrow+'</a></div></section>'+(wrong.length?'<section class="wrong-summary"><h2>다시 볼 개념</h2>'+wrong.map((q,i)=>'<a href="#lesson/'+q.lesson+'"><span>'+String(i+1).padStart(2,'0')+'</span><div>'+escape(q.question)+'<div class="small-note">'+escape(lessons.find(l=>l.id===q.lesson)?.title||'')+' →</div></div></a>').join('')+'</section>':'');
  }
  function navigate(){
    const hash=location.hash.slice(1)||'overview';
    let parts=hash.split('/'),chapter='1';
    if(parts[0]==='quiz'&&(parts[1]==='all'||/^[1-5]$/.test(parts[1]))){chapter=parts[1]==='all'?'1':parts[1];parts=['quiz'];}
    else if(parts[0]==='chapter'){
      chapter=parts[1];parts=parts.slice(2);
    }else if(parts[0]==='lesson'){
      chapter=allLessons.find(l=>l.id===parts[1])?.chapter||'1';
    }else if(parts[0]==='quiz'&&parts[1]==='related'){
      chapter=allLessons.find(l=>l.id===parts[2])?.chapter||'1';
    }
    activateChapter(chapter);currentLesson=null;
    if(parts[0]==='lesson'){lesson(parts[1]);}
    else if(parts[0]==='memory'){memory();}
    else if(parts[0]==='quiz'&&parts[1]){startSession(parts[1],parts[2]);}
    else if(parts[0]==='quiz'){quizMenu();}
    else{overview();}
    const activeView=parts[0]==='memory'?'memory':parts[0]==='quiz'?'quiz':'learn';
    $$('.view-tabs a').forEach(a=>{a.classList.toggle('active',a.dataset.view===activeView);if(a.dataset.view===activeView)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    renderNav();closeMobile();
    document.body.classList.toggle('reading-page',!!currentLesson);
    document.title=(currentLesson?lessons.find(l=>l.id===currentLesson).title:activeView==='memory'?course.id+'장 핵심 암기':activeView==='quiz'?course.id+'장 문제 풀기':course.id+'장 '+course.title)+' · 인간공학';
    window.scrollTo({top:0,behavior:'instant'});
    main.focus({preventScroll:true});
  }
  function closeMobile(){ $('#sidebar').classList.remove('open');$('#sidebar').inert=window.matchMedia('(max-width:700px)').matches;$('#sidebar-shade').hidden=true;$('#menu-toggle').setAttribute('aria-expanded','false');}
  function search(query){
    const term=query.trim().toLocaleLowerCase();
    const list=term?allLessons.filter(l=>(l.title+' '+l.body).toLocaleLowerCase().includes(term)):priorities.map(id=>allLessons.find(l=>l.id===id));
    $('#search-results').innerHTML=list.length?'<div class="search-result-list">'+list.map(l=>'<a class="search-result" href="'+url('lesson/'+l.id,l.chapter)+'"><span>'+l.chapter+'장</span><div>'+escape(l.title)+'<small>'+escape(courses.find(c=>c.id===l.chapter).title)+'</small></div></a>').join('')+'</div>':'<div class="search-empty">‘'+escape(query)+'’ 검색 결과가 없습니다.<br>다른 용어로 찾아보세요.</div>';
  }
  function openSearch(){search('');$('#search-input').value='';$('#search-dialog').showModal();$('#search-input').focus();}
  $('#search-open').addEventListener('click',openSearch);
  $('#search-input').addEventListener('input',e=>search(e.target.value));
  $('#search-input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const a=$('.search-result');if(a){$('#search-dialog').close();location.hash=a.hash;}}});
  $('#search-results').addEventListener('click',e=>{if(e.target.closest('a'))$('#search-dialog').close();});
  $$('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}}));
  $('#menu-toggle').addEventListener('click',()=>{const open=!$('#sidebar').classList.contains('open');$('#sidebar').classList.toggle('open',open);$('#sidebar').inert=!open;$('#sidebar-shade').hidden=!open;$('#menu-toggle').setAttribute('aria-expanded',String(open));});
  $('#sidebar-shade').addEventListener('click',closeMobile);
  $('.skip-link').addEventListener('click',e=>{e.preventDefault();main.focus();main.scrollIntoView();});
  window.matchMedia('(max-width:700px)').addEventListener('change',closeMobile);
  $('#lesson-nav').addEventListener('click',e=>{const b=e.target.closest('[data-group-toggle]');if(!b)return;const id=b.dataset.groupToggle;if(openGroups.has(id))openGroups.delete(id);else openGroups.add(id);renderNav();});
  main.addEventListener('click',e=>{
    const el=e.target.closest('button,[data-reset-memory]');if(!el)return;
    if(el.dataset.memoryFilter){memoryFilter=el.dataset.memoryFilter;memory();return;}
    if(el.dataset.resetMemory){e.preventDefault();memoryFilter='all';memory();return;}
    if(el.dataset.startQuiz){go('quiz/'+el.dataset.startQuiz);return;}
    if(el.dataset.ox){if(!session||session.revealed)return;session.selected=el.dataset.ox;session.revealed=true;gradeQuestion(session.selected===session.list[session.index].answer);renderQuestion();return;}
    if(el.dataset.grade){gradeQuestion(el.dataset.grade==='correct');nextQuestion();return;}
    switch(el.dataset.action){
      case 'expand-all':showAll=!showAll;$$('.memory-item',main).forEach(d=>d.open=showAll);el.textContent=showAll?'답 접기':'답 펼치기';break;
      case 'exit-quiz':go('quiz');break;
      case 'reveal':if(session){session.draft=$('#quiz-draft')?.value||'';session.revealed=true;renderQuestion();}break;
      case 'next-question':nextQuestion();break;
      case 'retry-session':{const ids=session.answers.filter(a=>!a.correct).map(a=>a.id);session={kind:'retry',title:'오답 복습',list:ids.map(id=>quizzes.find(q=>q.id===id)),index:0,answers:[],revealed:false,selected:null,draft:'',graded:false};renderQuestion();window.scrollTo({top:0,behavior:'instant'});break;}
    }
  });
  main.addEventListener('change',e=>{
    if(!e.target.matches('[data-known]'))return;
    const id=e.target.dataset.known,known=e.target.checked;
    if(known)state.known.add(id);else state.known.delete(id);
    persist();e.target.closest('.memory-item').classList.toggle('known',known);
    const y=window.scrollY,openIds=$$('.memory-item[open]',main).map(d=>d.dataset.memoryId);
    memory();openIds.forEach(id=>{const d=$('[data-memory-id="'+id+'"]',main);if(d)d.open=true;});window.scrollTo({top:y,behavior:'instant'});
  });
  document.addEventListener('keydown',e=>{
    const editing=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)||document.activeElement?.isContentEditable;
    if(e.key==='/'&&!editing&&!$('dialog[open]')){e.preventDefault();openSearch();}
    if(e.key==='Escape')closeMobile();
  });
  window.addEventListener('hashchange',navigate);
  navigate();
})();
