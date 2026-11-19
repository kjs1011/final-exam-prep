(() => {
  'use strict';
  const $=id=>document.getElementById(id),cards=[...document.querySelectorAll('.formula-card')],sections=[...document.querySelectorAll('[data-formula-section]')],links=[...document.querySelectorAll('.formula-toc a')];
  const normalize=s=>s.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim();
  const searches=new Map(cards.map(card=>[card,normalize(card.dataset.search)]));
  function closeMenu(){document.body.classList.remove('sidebar-open');$('menu').setAttribute('aria-expanded','false');$('shade').hidden=true;}
  function fitEquations(){
    document.querySelectorAll('.sheet-equation').forEach(el=>{
      if(el.scrollWidth>el.clientWidth+2){el.tabIndex=0;el.setAttribute('aria-label','수식: 좌우로 스크롤하여 전체 보기');}
      else{el.removeAttribute('tabindex');el.removeAttribute('aria-label');}
    });
  }
  function filter(){
    const query=normalize($('formula-search').value),words=query.split(' ').filter(Boolean);let count=0;
    cards.forEach(card=>{card.hidden=!words.every(word=>/^[a-z]$/.test(word)?new RegExp('(^|[^a-z])'+word+'($|[^a-z])').test(searches.get(card)):searches.get(card).includes(word));if(!card.hidden)count++;});
    sections.forEach(section=>section.hidden=![...section.querySelectorAll('.formula-card')].some(card=>!card.hidden));
    $('symbols').hidden=!!query;$('search-clear').hidden=!query;$('formula-empty').hidden=count!==0;
    $('search-status').textContent=query?'검색 결과 '+count+'개 / 전체 '+cards.length+'개':cards.length+'개 공식 항목';
    fitEquations();
  }
  $('formula-search').oninput=filter;
  $('search-clear').onclick=()=>{$('formula-search').value='';filter();$('formula-search').focus();};
  $('menu').onclick=()=>{const open=document.body.classList.toggle('sidebar-open');$('menu').setAttribute('aria-expanded',open);$('shade').hidden=!open;};
  $('shade').onclick=closeMenu;
  links.forEach(link=>link.addEventListener('click',()=>{if($('formula-search').value){$('formula-search').value='';filter();}closeMenu();}));
  const observer=new IntersectionObserver(entries=>{
    const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];
    if(!visible)return;
    links.forEach(link=>{const active=link.hash==='#'+visible.target.id;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
  },{rootMargin:'-85px 0px -65% 0px'});
  [$('symbols'),...sections].forEach(section=>observer.observe(section));
  $('sheet-print').onclick=()=>window.print();
  let tableFocus;
  $('sheet-tables').onclick=()=>{tableFocus=document.activeElement;$('tables-dialog').showModal();};
  function closeTables(){$('tables-dialog').close();tableFocus?.focus();}
  document.querySelector('#tables-dialog .close-dialog').onclick=closeTables;
  $('tables-dialog').onclick=e=>{if(e.target!==$('tables-dialog'))return;const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeTables();};
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!$('tables-dialog').open)$('formula-search').focus();}
    if(e.key==='Escape'){closeMenu();if(document.activeElement===$('formula-search')){$('formula-search').value='';filter();}}
  });
  window.addEventListener('resize',fitEquations);document.fonts.ready.then(fitEquations);
  window.addEventListener('hashchange',()=>{const target=document.getElementById(location.hash.slice(1));if(target?.closest('[hidden]')){$('formula-search').value='';filter();target.scrollIntoView();}});
  filter();
})();
