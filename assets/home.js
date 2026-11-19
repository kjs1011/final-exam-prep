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
    const heading = element('div', '', 'course-heading');
    heading.append(element('h4', course.title));

    const topics = element('ul', '', 'course-topics');
    for (const topic of course.topics) topics.append(element('li', topic));
    card.append(heading, element('p', course.description), topics);
    return card;
  }

  const groups = new Map();
  for (const course of courses) {
    if (!groups.has(course.subject)) groups.set(course.subject, []);
    groups.get(course.subject).push(course);
  }
  for (const [name, group] of groups) {
    const section = element('section', '', 'subject');
    section.append(element('h3', name, 'subject-title'));
    const cards = element('div', '', 'course-grid');
    for (const course of group) cards.append(makeCard(course));
    section.append(cards);
    courseList.append(section);
  }

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
      ? '일치하는 자료가 없어요. 다른 검색어로 찾아보세요.'
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
  document.querySelector('.header-link').addEventListener('click', () => {
    if (!subjects.hidden) return;
    search.value = '';
    renderSearch();
  });
})();
