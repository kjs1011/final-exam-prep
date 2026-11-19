(() => {
  'use strict';

  const root = new URL('../', document.currentScript.src);
  const current = document.body.dataset.studyCourse;
  const nav = document.createElement('nav');
  nav.className = 'study-hub-nav';
  nav.setAttribute('aria-label', '기말고사 준비');

  const home = document.createElement('a');
  home.className = 'study-hub-home';
  home.href = root.href;
  home.textContent = '기말고사 준비';

  const subjects = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = '과목 전환';
  const list = document.createElement('ul');

  for (const course of window.studyHubCatalog) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = new URL('courses/' + course.id + '/', root).href;
    link.textContent = course.title;
    if (course.id === current) link.setAttribute('aria-current', 'true');
    item.append(link);
    list.append(item);
  }

  nav.addEventListener('keydown', event => {
    if (event.key === 'Escape' && subjects.open) {
      subjects.open = false;
      summary.focus();
      event.stopPropagation();
    }
  });
  document.addEventListener('click', event => {
    if (subjects.open && !subjects.contains(event.target)) subjects.open = false;
  });
  subjects.append(summary, list);
  nav.append(home, subjects);
  document.body.prepend(nav);
})();
