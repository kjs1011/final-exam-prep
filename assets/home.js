(() => {
  'use strict';

  const courses = window.studyHubCatalog;
  const coursesById = new Map(courses.map(course => [course.id, course]));
  const courseList = document.querySelector('#course-list');
  const search = document.querySelector('#study-search');
  const subjects = document.querySelector('#subjects');
  const results = document.querySelector('#search-results');
  const resultList = document.querySelector('#result-list');
  const status = document.querySelector('#search-status');
  const searchable = [
    ...courses.map(course => ({
      course: course.id, title: course.title, href: '', detail: course.description,
    })),
    ...window.studyHubSearchIndex,
  ];

  function element(tag, text, className) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    item.textContent = text;
    return item;
  }

  function courseUrl(id, location = '') {
    return './courses/' + id + '/' + location;
  }

  function makeCard(course) {
    const card = element('a', '', 'course-card');
    card.href = courseUrl(course.id);
    card.append(element('h2', course.title));
    return card;
  }

  for (const course of courses) courseList.append(makeCard(course));

  function normalize(text) {
    return text.normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s\p{P}\p{S}]+/gu, '');
  }

  const index = searchable.map(entry => {
    const course = coursesById.get(entry.course);
    return {
      ...entry,
      label: course.title,
      titleKey: normalize(entry.title),
      searchKey: normalize([entry.title, entry.detail, course.title, course.topics.join(' ')].join(' ')),
    };
  });

  function matchScore(entry, words, phrase) {
    if (!words.every(word => entry.searchKey.includes(word))) return 0;
    if (entry.titleKey === phrase) return 5;
    if (entry.titleKey.startsWith(phrase)) return 4;
    if (words.every(word => entry.titleKey.includes(word))) return 3;
    return 1;
  }

  function renderSearch() {
    const words = search.value.trim().split(/\s+/).map(normalize).filter(Boolean);
    subjects.hidden = words.length > 0;
    results.hidden = !subjects.hidden;
    resultList.replaceChildren();
    if (results.hidden) {
      status.textContent = '';
      return;
    }

    const phrase = words.join('');
    const matches = index.map(entry => ({ entry, score: matchScore(entry, words, phrase) }))
      .filter(candidate => candidate.score > 0)
      .sort((a, b) => b.score - a.score);

    status.textContent = matches.length === 0
      ? '검색 결과 없음'
      : matches.length + '개 자료' + (matches.length > 40 ? ' · 상위 40개 표시' : '');
    for (const { entry } of matches.slice(0, 40)) {
      const item = element('li', '');
      const link = element('a', '', 'result-link');
      link.href = courseUrl(entry.course, entry.href);
      link.append(element('span', entry.title, 'result-title'), element('span', entry.label, 'result-course'));
      item.append(link);
      resultList.append(item);
    }
  }

  search.addEventListener('input', event => {
    if (!event.isComposing) renderSearch();
  });
  search.addEventListener('compositionend', renderSearch);
  document.querySelector('#search-form').addEventListener('submit', event => {
    event.preventDefault();
    renderSearch();
  });
  document.querySelector('#clear-search').addEventListener('click', () => {
    search.value = '';
    renderSearch();
    search.focus();
  });
})();
