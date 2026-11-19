(() => {
  'use strict';
  const courses=window.COURSES;
  const examChapters=courses.map(c=>c.id);
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
  let imageWarmupTimer;
  const warmedImages=new Map();
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
    storageKey='study-hub-human-factors-chapter-'+course.id+'-study-v1';saved={};
    try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')||{};}catch{}
    state={
      known:new Set(Array.isArray(saved.known)?saved.known.filter(id=>facts.some(f=>f.id===id)):[]),
      wrong:new Set(Array.isArray(saved.wrong)?saved.wrong.filter(id=>quizzes.some(q=>q.id===id)):[]),
      last:lessons.some(l=>l.id===saved.last)?saved.last:null
    };
    memoryFilter='all';showAll=false;session=null;openGroups=new Set();
    const chapterLink=c=>'<a href="'+url('overview',c.id)+'"'+(c.id===course.id?' class="active" aria-current="page"':'')+'>'+c.id+'장</a>';
    $('#chapter-switch').innerHTML='<span class="chapter-label">학습할 장</span>'+courses.filter(c=>examChapters.includes(c.id)).map(chapterLink).join('');
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
      return '<div class="nav-group'+(open?' open':'')+'" data-group="'+g.id+'"><button class="group-toggle" data-group-toggle="'+g.id+'" aria-expanded="'+open+'"><span>'+g.title+'</span>'+chevron+'</button><div class="lesson-links">'+items.map(l=>'<a class="lesson-link'+(currentLesson===l.id?' active':'')+'" href="#lesson/'+l.id+'"'+(currentLesson===l.id?' aria-current="page"':'')+'>'+escape(l.title)+'</a>').join('')+'</div></div>';
    }).join('');
    scopeLinks($('#lesson-nav'));scopeLinks();
  }
  function heading(eyebrow,title,description){return '<div class="eyebrow">'+eyebrow+'</div><h1 class="page-title">'+title+'</h1>'+(description?'<p class="page-description">'+description+'</p>':'');}
  function overview(){
    const next=state.last||lessons[0].id;
    main.innerHTML='<section class="overview-header"><div>'+heading(course.id+'장',escape(course.title),escape(course.description))+'<div class="overview-meta"><span>개념 <strong>'+lessons.length+'</strong></span><span>암기 <strong>'+facts.length+'</strong></span><span>문제 <strong>'+quizzes.length+'</strong></span></div></div><a class="primary-button" href="#lesson/'+next+'">'+(state.last?'이어서 학습':'학습 시작')+arrow+'</a></section><section><div class="section-heading"><h2>학습 목차</h2></div><div class="group-grid">'+groups.map(g=>{
      const items=lessons.filter(l=>l.group===g.id),dest=items[0];
      return '<a class="group-card" href="#lesson/'+dest.id+'"><h3>'+g.title+'</h3><p>'+g.description+'</p><div class="card-bottom">'+arrow+'</div></a>';
    }).join('')+'</div></section><section><div class="section-heading"><h2>먼저 볼 개념</h2></div><div class="priority-list">'+priorities.map((id,i)=>{const l=lessons.find(l=>l.id===id);return '<a class="priority-link" href="#lesson/'+id+'"><span class="priority-title">'+escape(l.title)+'</span><span aria-hidden="true">↗</span></a>';}).join('')+'</div></section>';
  }
  function lesson(id){
    const l=lessons.find(l=>l.id===id);
    if(!l){go('overview');return;}
    currentLesson=id;state.last=id;persist();openGroups.add(l.group);
    const index=lessons.indexOf(l);
    let body=markdown(l.body);
    
    const visuals=(window.STUDY_VISUALS||{})[id]||[];
    let laterFigures=[];
    if(visuals.length){
      const figureBlocks=visuals.map((v,index)=>'<figure class="study-visual '+escape(v.kind)+'"><div class="study-images">'+v.images.map(img=>'<button class="figure-open" data-figure-src="'+escape(img.fullSrc||img.src)+'" aria-label="그림 확대: '+escape(img.alt)+'"><img src="'+escape(img.src)+'"'+(img.srcset?' srcset="'+escape(img.srcset)+'" sizes="'+escape(img.sizes)+'"':'')+' alt="'+escape(img.alt)+'" width="'+img.width+'" height="'+img.height+'" loading="'+(index?'lazy':'eager')+'" fetchpriority="'+(index?'low':'high')+'" decoding="async"></button>').join('')+'</div><figcaption>'+escape(v.caption)+'</figcaption></figure>');
      const figures=figureBlocks[0];laterFigures=figureBlocks.slice(1);
      const firstParagraph=body.indexOf('</p>');
      body=firstParagraph<0?figures+body:body.slice(0,firstParagraph+4)+figures+body.slice(firstParagraph+4);
    }
    const previous=index?{view:'lesson/'+lessons[index-1].id,title:lessons[index-1].title}:{view:'overview',title:course.id+'장 '+course.title};
    const next=index<lessons.length-1?{view:'lesson/'+lessons[index+1].id,title:lessons[index+1].title}:{view:'memory',title:'핵심 암기'};
    main.innerHTML='<article><header class="lesson-heading"><h1>'+escape(l.title)+'</h1></header><div class="reading-body">'+body+'</div></article><nav class="lesson-pagination" aria-label="이전 다음 개념"><a href="'+url(previous.view)+'" data-lesson-step="previous" aria-keyshortcuts="ArrowLeft" aria-label="이전: '+escape(previous.title)+'">'+arrow+'<b>'+escape(previous.title)+'</b></a><a href="'+url(next.view)+'" data-lesson-step="next" aria-keyshortcuts="ArrowRight" aria-label="다음: '+escape(next.title)+'"><b>'+escape(next.title)+'</b>'+arrow+'</a></nav>';
    if(laterFigures.length){
      const reading=$('.reading-body'),paragraphs=$$(':scope > p',reading);
      laterFigures.forEach((figure,i)=>{
        const target=paragraphs[Math.min((i+1)*2,paragraphs.length-1)];
        if(target)target.insertAdjacentHTML(/^(함정|혼동 주의):/.test(target.textContent.trim())?'beforebegin':'afterend',figure);
        else reading.insertAdjacentHTML('beforeend',figure);
      });
    }
    const article=$('article',main);
    const demo=window.HF_EXPERIMENTS?.render(l,course);
    if(demo){$('.reading-body').insertAdjacentHTML('beforeend',demo);window.HF_EXPERIMENTS.bind(main);}
    if(l.sources?.length)article.insertAdjacentHTML('beforeend','<details class="lesson-sources"><summary>녹음·강의자료 근거 <span>'+l.sources.length+'</span></summary><div>'+l.sources.map(source=>'<div class="source-citation"><b>'+escape(source.file)+'</b><span>'+escape(source.locator||'')+'</span><p>'+escape(source.note||'')+'</p>'+(window.HF_SOURCES?.some(s=>s.file===source.file)?'<a href="'+url('sources/'+encodeURIComponent(source.file)+'/'+encodeURIComponent(source.locator||''))+'">녹음 원문 확인 →</a>':'')+'</div>').join('')+'</div></details>');
    article.insertAdjacentHTML('beforeend','<a class="lesson-practice outline-button" href="'+url('quiz/related/'+id)+'">이 개념 확인하기'+arrow+'</a>');
    styleReading(id);
    warmNextLesson(index,id);
  }
  function warmNextLesson(index,id){
    clearTimeout(imageWarmupTimer);
    const connection=navigator.connection;
    if(connection?.saveData||['slow-2g','2g'].includes(connection?.effectiveType))return;
    const next=lessons[index+1],images=next?(window.STUDY_VISUALS||{})[next.id]?.[0]?.images:null;
    if(!images?.length)return;
    const schedule=()=>{
      if(currentLesson!==id)return;
      imageWarmupTimer=setTimeout(()=>{
        if(currentLesson!==id)return;
        for(const source of images){
          if(warmedImages.has(source.src))continue;
          const image=new Image();image.decoding='async';image.fetchPriority='low';
          if(source.srcset){image.srcset=source.srcset;image.sizes=source.sizes;}
          image.onerror=()=>warmedImages.delete(source.src);
          warmedImages.set(source.src,image);image.src=source.src;
        }
        while(warmedImages.size>6)warmedImages.delete(warmedImages.keys().next().value);
      },180);
    };
    const first=$('.study-visual img',main);
    if(first&&!first.complete)first.addEventListener('load',schedule,{once:true});
    else schedule();
  }
  function styleReading(id){
    const reading=$('.reading-body');
    $(':scope > p',reading)?.classList.add('reading-lead');
    $$(':scope > p',reading).forEach(p=>{if(/^(함정|혼동 주의|구분|주의):/.test(p.textContent.trim()))p.classList.add('reading-note');});
  }
  function memory(){
    let list=facts;
    if(memoryFilter==='unknown')list=facts.filter(f=>!state.known.has(f.id));
    if(memoryFilter==='known')list=facts.filter(f=>state.known.has(f.id));
    main.innerHTML=heading('RECALL','핵심 암기','질문을 보고 먼저 떠올린 뒤, 답을 펼쳐 확인하세요.')+'<div class="memory-count">'+state.known.size+' / '+facts.length+'개 암기 완료</div><div class="subheader"><div class="filter-tabs" aria-label="암기 카드 필터">'+[['all','전체',facts.length],['unknown','미암기',facts.length-state.known.size],['known','암기 완료',state.known.size]].map(([k,t,n])=>'<button class="'+(memoryFilter===k?'active':'')+'" data-memory-filter="'+k+'" aria-pressed="'+(memoryFilter===k)+'">'+t+'<span>'+n+'</span></button>').join('')+'</div><button class="text-button" data-action="expand-all">'+(showAll?'답 접기':'답 펼치기')+'</button></div>'+(list.length?'<div class="memory-list">'+list.map(f=>{const known=state.known.has(f.id);return '<details class="memory-item'+(known?' known':'')+'" data-memory-id="'+f.id+'"'+(showAll?' open':'')+'><summary><span class="memory-question">'+escape(f.question)+'</span>'+down+'</summary><div class="memory-answer"><p>'+escape(f.answer)+'</p><label class="memory-known"><input type="checkbox" data-known="'+f.id+'"'+(known?' checked':'')+'>외웠어요</label></div></details>';}).join('')+'</div>':'<div class="empty-state"><h2>'+(memoryFilter==='known'?'아직 표시한 카드가 없어요':'모두 기억했어요')+'</h2><p>'+(memoryFilter==='known'?'기억한 카드를 ‘외웠어요’로 표시해 보세요.':'문제 풀이로 한 번 더 확인해 보세요.')+'</p><a class="outline-button" href="'+(memoryFilter==='known'?'#memory':'#quiz')+'"'+(memoryFilter==='known'?' data-reset-memory="true"':'')+'>'+(memoryFilter==='known'?'전체 카드 보기':'문제 풀기')+arrow+'</a></div>');
    scopeLinks();
  }
  function quizMenu(){
    session=null;
    const descriptions={ox:'헷갈리는 문장을 정확하게 구별하기',short:'설명을 읽고 알맞은 용어 떠올리기',blank:'단계와 목록을 빠짐없이 기억하기',essay:'개념과 예시를 내 말로 연결하기'};
    main.innerHTML=heading('PRACTICE','문제 풀기','답을 먼저 생각하고, 해설로 헷갈리는 부분을 확인하세요.')+'<div class="quiz-types">'+['ox','short','blank','essay'].map((type,i)=>'<button class="quiz-type" data-start-quiz="'+type+'"><h2>'+typeNames[type]+'</h2><p>'+descriptions[type]+'</p><div class="quiz-type-bottom">'+arrow+'</div></button>').join('')+'</div><div class="quiz-review-row"><div>오답 복습 <span> &nbsp;'+state.wrong.size+'문제</span></div><button class="outline-button" data-start-quiz="wrong"'+(!state.wrong.size?' disabled':'')+'>오답만 풀기'+arrow+'</button></div><p class="quiz-practice-note">OX는 자동 채점, 단답·빈칸·서술형은 정답을 확인한 뒤 직접 평가합니다.</p>';
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
    main.innerHTML='<div class="quiz-session-top"><button data-action="exit-quiz">'+session.title+' <span aria-hidden="true">↗</span></button><span>'+String(index+1).padStart(2,'0')+' / '+list.length+'</span></div><div class="quiz-progress" aria-label="'+(index+1)+' / '+list.length+'번째 문제"><span style="width:'+((index+1)/list.length*100)+'%"></span></div><div class="quiz-label">'+(typeNames[q.type]||'').toUpperCase()+' &nbsp; / &nbsp; QUESTION '+String(index+1).padStart(2,'0')+'</div><h1 class="quiz-question">'+escape(q.question)+'</h1>'+(isOX?'<div class="ox-options" aria-label="정답 선택">'+['O','X'].map((value,i)=>'<button class="ox-button'+(session.selected===value?' selected':'')+'" data-ox="'+value+'"'+(revealed?' disabled':'')+'>'+value+'<span>'+(i?'틀리다':'맞다')+'</span></button>').join('')+'</div>':'<label class="sr-only" for="quiz-draft">내 답</label><textarea class="quiz-input" id="quiz-draft" placeholder="답을 떠올려 적어 보세요. (선택)"'+(revealed?' readonly':'')+'>'+escape(session.draft)+'</textarea>'+(!revealed?'<button class="primary-button quiz-reveal" data-action="reveal">정답 확인'+arrow+'</button>':''))+(revealed?answerPanel(q):'');
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
    main.innerHTML='<section class="quiz-results">'+heading('COMPLETE',wrong.length?'헷갈린 부분을 찾았어요':'잘 기억하고 있어요','')+'<div class="result-score">'+correct+'<span>/ '+session.list.length+'</span></div><p class="result-description">'+(session.list.some(q=>q.type!=='ox')?'자동 채점과 직접 평가 결과를 함께 집계했습니다.<br>':'')+(wrong.length?wrong.length+'문제는 오답 복습에 모아 두었습니다.':'이번 문제를 모두 맞혔습니다.')+'</p><div class="result-actions">'+(wrong.length?'<button class="primary-button" data-action="retry-session">이번 오답 다시 풀기'+arrow+'</button>':'')+'<a class="outline-button" href="#quiz">다른 문제 풀기'+arrow+'</a></div></section>'+(wrong.length?'<section class="wrong-summary"><h2>다시 볼 개념</h2>'+wrong.map((q,i)=>'<a href="#lesson/'+q.lesson+'"><span>'+String(i+1).padStart(2,'0')+'</span><div>'+escape(q.question)+'<div class="small-note">'+escape(lessons.find(l=>l.id===q.lesson)?.title||'')+' →</div></div></a>').join('')+'</section>':'');
  }
  function sourceView(file,locator){
    let decoded;try{decoded=file?decodeURIComponent(file):null;}catch{decoded=null;}
    const records=window.HF_SOURCES||[], selected=records.find(s=>s.file===decoded);
    if(!selected){
      main.innerHTML=heading('LECTURE NOTES','녹음 참고','수업의 설명을 원문에서 다시 확인하세요.')+'<p class="source-intro">전사 원문에는 음성 인식 오류가 남아 있습니다. 개념 학습에서는 강의자료와 교재를 함께 참고해 용어와 설명을 정리했습니다.</p><div class="recording-list">'+records.map(s=>'<a href="'+url('sources/'+encodeURIComponent(s.file))+'"><div><b>'+escape(s.file)+'</b><p>'+escape(s.topic)+'</p></div><span aria-hidden="true">↗</span></a>').join('')+'</div><p class="source-intro">장 번호는 교재를 따릅니다. 7장 전용 강의자료는 현재 폴더에 없어 별도 학습 단원에서 제외했습니다. 연습문제는 복습용으로 새로 구성했으며, 시험 범위를 뜻하지 않습니다.</p>';
      return;
    }
    main.innerHTML='<a class="back-link" href="'+url('sources')+'">← 녹음 목록</a>'+heading('TRANSCRIPT',escape(selected.file),escape(selected.topic))+'<label class="transcript-filter">원문에서 찾기<input type="search" id="transcript-query" placeholder="예: 양립성, 기억, 디스플레이" autocomplete="off"></label><p class="source-intro">원문 표기를 보존했습니다. 문단 번호는 빈 줄로 나눈 비어 있지 않은 문단의 순서입니다.</p><div id="transcript-results"></div>';
    const requested=locator?decodeURIComponent(locator):'';
    const render=()=>{const term=$('#transcript-query').value.trim().toLocaleLowerCase();const list=selected.paragraphs.map((text,index)=>({text,index})).filter(p=>!term||p.text.toLocaleLowerCase().includes(term));$('#transcript-results').innerHTML='<div class="transcript-count">'+list.length+' / '+selected.paragraphs.length+'문단</div>'+list.map(p=>'<section class="transcript-paragraph" id="para-'+(p.index+1)+'"><span>문단 '+(p.index+1)+'</span><p>'+escape(p.text)+'</p></section>').join('')+(list.length?'':'<p class="empty-state">검색 결과가 없습니다.</p>');};
    render();$('#transcript-query').addEventListener('input',render);
    if(requested){const m=requested.match(/문단\s*(\d+)/),time=requested.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/)?.[0],target=m?$('#para-'+m[1]):[...$$('.transcript-paragraph')].find(p=>p.textContent.includes(time||requested));if(target){target.classList.add('source-target');requestAnimationFrame(()=>target.scrollIntoView({block:'center'}));}}
  }
  function navigate(){
    const hash=location.hash.slice(1)||'chapter/1/overview';
    let parts=hash.split('/'),chapter='1';
    if(parts[0]==='chapter'){
      chapter=parts[1];parts=parts.slice(2);
    }else if(parts[0]==='lesson'){
      chapter=allLessons.find(l=>l.id===parts[1])?.chapter||'1';
    }else if(parts[0]==='quiz'&&parts[1]==='related'){
      chapter=allLessons.find(l=>l.id===parts[2])?.chapter||'1';
    }
    activateChapter(chapter);currentLesson=null;
    if(parts[0]==='lesson'){lesson(parts[1]);}
    else if(parts[0]==='sources'){sourceView(parts[1],parts[2]);}
    else if(parts[0]==='memory'){memory();}
    else if(parts[0]==='quiz'&&parts[1]){startSession(parts[1],parts[2]);}
    else if(parts[0]==='quiz'){quizMenu();}
    else{overview();}
    const activeView=parts[0]==='sources'?'sources':parts[0]==='memory'?'memory':parts[0]==='quiz'?'quiz':'learn';
    $$('.view-tabs a').forEach(a=>{a.classList.toggle('active',a.dataset.view===activeView);if(a.dataset.view===activeView)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    renderNav();closeMobile();
    document.body.classList.toggle('reading-page',!!currentLesson);
    document.title=(currentLesson?lessons.find(l=>l.id===currentLesson).title:activeView==='memory'?course.id+'장 핵심 암기':activeView==='quiz'?course.id+'장 문제 풀기':activeView==='sources'?'녹음 참고':course.id+'장 '+course.title)+' · 인간공학';
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
    if(el.dataset.figureSrc){
      const img=$('#figure-full-image');img.src=el.dataset.figureSrc;img.alt=$('img',el).alt;
      $('#figure-title').textContent=$('figcaption',el.closest('figure')).textContent;
      $('#figure-dialog').showModal();return;
    }
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
    if(currentLesson&&!editing&&!$('dialog[open]')&&!e.defaultPrevented&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){
      e.preventDefault();
      if(e.repeat)return;
      const direction=e.key==='ArrowLeft'?'previous':'next';
      const link=$('[data-lesson-step="'+direction+'"]',main);
      if(link)location.hash=link.hash;
    }
    if(e.key==='Escape')closeMobile();
  });
  window.addEventListener('hashchange',navigate);
  navigate();
})();
