const chapters = document.querySelector("#chapters");
const sections = document.querySelector("#sections");
const lesson = document.querySelector("#lesson");
const fields = ["이름", "날짜", "시작 시각", "종료 시각", "장소", "반복 주기"];
const stepLinks = [["design", "실험 설계"], ["experience", "체험"], ["analysis", "결과"], ["check", "퀴즈"]];
let currentRoute;
let audioContext;
let audioOutput;

function sectionHeader(title, description = "") {
  return `<div class="section-head"><h2>${title}</h2>${description ? `<p>${description}</p>` : ""}</div>`;
}

function renderSidebar(reportId) {
  chapters.innerHTML = reports.map(item => `
    <a class="chapter ${item.id === reportId ? "selected" : ""}" href="#${item.id}" ${item.id === reportId ? 'aria-current="page"' : ""}>
      <span class="chapter-number">${item.number}</span>
      <span>${item.short}</span>
    </a>`).join("") + `
    <a class="chapter chapter-concepts ${reportId ? "" : "selected"}" href="#concepts" ${reportId ? "" : 'aria-current="page"'}>개념</a>`;
}

function conceptLink(id) {
  return `<a href="#concept/${id}">${concepts[id].title}</a>`;
}

function renderDataTable({caption, headings, rows}) {
  return `<div class="table-scroll" tabindex="0" aria-label="${caption}">
    <table class="data-table">
      <caption>${caption}</caption>
      <thead><tr>${headings.map(heading => `<th scope="col">${heading}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(row => `<tr>${row.map((value, index) => index === 0 ? `<th scope="row">${value}</th>` : `<td>${value}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  </div>`;
}

function renderChapter(report) {
  const position = reports.indexOf(report);
  const next = reports[position + 1] || reports[0];
  const isPlan = !report.charts;
  sections.innerHTML = stepLinks.map(([target, title], index) => `
    <button class="jump" type="button" data-to="${target}" ${index === 0 ? 'aria-current="location"' : ""}>${target === "analysis" && isPlan ? "분석 계획" : title}</button>`).join("");
  lesson.innerHTML = `
    <article>
      <header class="lesson-heading">
        <p class="report-type">${report.field} <span aria-hidden="true">·</span> ${report.type}</p>
        <h1>${report.title}</h1>
        <p class="intro">${report.intro}</p>
        <nav class="related-concepts" aria-label="관련 개념">${report.conceptIds.map(conceptLink).join("")}</nav>
      </header>
      <section id="design" class="section" tabindex="-1">
        ${sectionHeader("실험 설계")}
        <dl class="design-grid">${report.design.map(([title, body]) => `
          <div><dt>${title}</dt><dd>${body}</dd></div>`).join("")}</dl>
      </section>
      <section id="experience" class="section" tabindex="-1">
        ${sectionHeader(...report.demo)}
        <div id="demo" class="demo"></div>
      </section>
      <section id="analysis" class="section" tabindex="-1">
        ${sectionHeader(report.chartTitle)}
        ${isPlan
          ? `<div class="plan-grid">${report.plan.map(([title, body]) => `<div><h3>${title}</h3><p>${body}</p></div>`).join("")}</div>`
          : `<div class="chart"><div class="choices" id="chart-tabs" aria-label="그래프 지표"></div><div id="plot" aria-live="polite"></div></div>`}
        ${report.takeaway ? `<p class="interpretation">${report.takeaway}</p>` : ""}
        ${report.hypothesis ? renderDataTable(report.hypothesis) : ""}
        ${report.findings ? `<dl class="design-grid findings">${report.findings.map(([title, body]) =>
          `<div><dt>${title}</dt><dd>${body}</dd></div>`).join("")}</dl>` : ""}
      </section>
      <section id="check" class="section" tabindex="-1">
        ${sectionHeader(report.quiz[0])}
        <div id="answers">${report.quiz[1].map((choice, index) => `<button class="answer" type="button" data-answer="${index}" aria-pressed="false">${choice}</button>`).join("")}</div>
        <p id="feedback" class="feedback" role="status"></p>
      </section>
      <div class="endnotes">
        <details><summary>보고서 출처</summary><p>${report.source[0]} · ${report.date}</p><p>${report.source[1]}</p></details>
        <a href="#${next.id}" aria-label="${position === reports.length - 1 ? "첫" : "다음"} 보고서, ${next.short}">${next.short} <span aria-hidden="true">→</span></a>
      </div>
    </article>`;

  document.title = `${report.short} · 인간공학 실험 노트`;
  setupDemo(report.id);
  if (!isPlan) setupChart(report.charts);
  document.querySelector("#answers").addEventListener("click", event => {
    const answer = event.target.closest("button[data-answer]");
    if (!answer) return;
    const correct = Number(answer.dataset.answer) === report.quiz[2];
    document.querySelectorAll(".answer").forEach(button => {
      button.setAttribute("aria-pressed", String(button === answer));
      button.classList.toggle("correct", button === answer && correct);
    });
    const feedback = document.querySelector("#feedback");
    feedback.textContent = correct ? `정답 · ${report.quiz[3]}` : "오답";
    feedback.classList.toggle("success", correct);
  });
}

function renderConceptIndex() {
  document.title = "개념 · 인간공학 실험 노트";
  sections.innerHTML = '<a href="#concepts" aria-current="page">개념 목차</a>';
  lesson.innerHTML = `
    <header class="lesson-heading"><h1>개념</h1></header>
    <ul class="concept-index">${Object.keys(concepts).map(id => `<li>${conceptLink(id)}</li>`).join("")}</ul>`;
}

function renderConcept(id) {
  const concept = concepts[id];
  const [locator, ...examples] = concept.report;
  const matchingReports = reports.filter(report => report.conceptIds.includes(id));
  const table = concept.table;
  document.title = `${concept.plainTitle || concept.title} · 인간공학 실험 노트`;
  sections.innerHTML = '<a href="#concepts">← 개념 목차</a>';
  lesson.innerHTML = `
    <article class="concept-page">
      <header class="lesson-heading">
        <h1>${concept.title}</h1>
        <p class="intro">${concept.summary}</p>
      </header>
      <section class="section">
        <h2>수식</h2>
        <dl class="equations">${concept.equations.map(([label, formula]) => `
          <div><dt>${label}</dt><dd class="formula-line">${formula}</dd></div>`).join("")}</dl>
      </section>
      <section class="section">
        <h2>계산과 해석</h2>
        <ol class="worked-steps">${concept.steps.map(([title, body, calculation]) => `
          <li><h3>${title}</h3><p>${body}</p>${calculation ? `<div class="formula-line">${calculation}</div>` : ""}</li>`).join("")}</ol>
      </section>
      <section class="section">
        <h2>보고서 적용</h2>
        <p class="report-locator">${locator}</p>
        <ul class="formula-examples">${examples.map(formula => `<li class="formula-line">${formula}</li>`).join("")}</ul>
        <p class="concept-reading">${concept.reading}</p>
        ${table ? renderDataTable(table) : ""}
      </section>
      <div class="concept-end">
        <nav class="related-concepts" aria-label="관련 보고서">${matchingReports.map(report => `<a href="#${report.id}">${report.short}</a>`).join("")}</nav>
        ${concept.source ? `<a class="reference" href="${concept.source[1]}" target="_blank" rel="noopener noreferrer">${concept.source[0]}</a>` : ""}
      </div>
    </article>`;
}

function selectChoice(group, index) {
  Array.from(group.querySelectorAll("button")).forEach((button, position) => {
    button.setAttribute("aria-pressed", String(index === position));
  });
}

function choiceGroup(element, labels, update) {
  element.innerHTML = labels.map((label, index) => `<button type="button" data-index="${index}" aria-pressed="false">${label}</button>`).join("");
  function show(index) {
    selectChoice(element, index);
    update(index);
  }
  element.addEventListener("click", event => {
    const button = event.target.closest("button[data-index]");
    if (button) show(Number(button.dataset.index));
  });
  show(0);
}

function setupChart(charts) {
  choiceGroup(document.querySelector("#chart-tabs"), charts.map(chart => chart.name), index => {
    const chart = charts[index];
    const bars = values => `<div class="bars">${values.map(([label, value, display], row) => `
      <div class="bar-row"><span>${label}</span><div class="bar-track" aria-hidden="true"><i class="bar-fill fill-${row % 3}" style="--bar-width:${100 * value / chart.max}%"></i></div><strong>${display}<small>${chart.unit}</small></strong></div>`).join("")}</div>`;
    document.querySelector("#plot").innerHTML = `
      <h3>${chart.label}</h3>
      ${chart.groups ? chart.groups.map(([label, values]) => `<div class="bar-group"><h4>${label}</h4>${bars(values)}</div>`).join("") : bars(chart.values)}
      <div class="axis" aria-hidden="true"><span>0</span><span>${chart.max} ${chart.unit}</span></div>
      <p class="plot-note">${chart.note}</p>`;
  });
}

function setupDemo(id) {
  const demo = document.querySelector("#demo");
  if (id === "alert") {
    demo.innerHTML = `<div class="choices" id="alert-mode" aria-label="문안 배열"></div>
      <div class="message" id="message" aria-live="polite"></div>`;
    choiceGroup(document.querySelector("#alert-mode"), ["맥락 우선형", "조건·행동 우선형"], index => {
      const context = `<div><span>맥락</span><p>집중호우로 하천 수위 상승.</p></div>`;
      const action = `<div><span>조건·행동</span><p>하천 산책로에 있다면 산책로 밖으로 이동.</p></div>`;
      document.querySelector("#message").innerHTML = index ? action + context : context + action;
    });
  } else if (id === "workload") {
    demo.innerHTML = `<div class="choices" id="notice-mode" aria-label="알림 양식"></div>
      <div class="timeline" id="timeline" aria-live="polite"></div>`;
    choiceGroup(document.querySelector("#notice-mode"), ["아이콘", "알림음"], index => {
      document.querySelector("#timeline").innerHTML = index
        ? `<div><b>0밀리초</b><span>첫 음 시작</span></div><span class="timeline-line" aria-hidden="true"></span><div><b>+167밀리초</b><span>둘째 음 시작 · 범주 정보 제시</span></div>`
        : `<div><b>0밀리초</b><span>아이콘 표시와 동시에 범주 정보 제시</span></div>`;
    });
  } else if (id === "calendar") {
    demo.innerHTML = `<div class="choices" id="complexity" aria-label="일정 복잡도"></div>
      <fieldset class="fields"><legend>오입력·누락 항목</legend><div id="fields"></div></fieldset>
      <output class="formula" id="rate" aria-live="polite"></output>`;
    const fieldList = document.querySelector("#fields");
    const rate = document.querySelector("#rate");
    const updateRate = () => {
      const required = fieldList.querySelectorAll("input").length;
      const errors = fieldList.querySelectorAll("input:checked").length;
      const percent = Number((100 * errors / required).toFixed(1));
      rate.innerHTML = `${errors}개 ÷ ${required}개 × 100 <strong>= ${percent}%</strong>`;
    };
    choiceGroup(document.querySelector("#complexity"), ["낮음 · 2개", "중간 · 4개", "높음 · 6개"], index => {
      fieldList.innerHTML = fields.slice(0, 2 * (index + 1)).map(field => `<label><input type="checkbox"> ${field}</label>`).join("");
      updateRate();
    });
    fieldList.addEventListener("change", updateRate);
  } else {
    setupSound(demo);
  }
}

function stopAudio() {
  if (!audioOutput) return;
  audioOutput.disconnect();
  audioOutput = undefined;
}

function setupSound(demo) {
  demo.innerHTML = `<div class="sound-controls">
      <div><label for="direction">음 진행</label><select id="direction"><option value="up">상승</option><option value="flat">동일</option><option value="down">하강</option></select></div>
      <div><label for="timbre">음색</label><select id="timbre"><option value="sine">순음</option><option value="bell">벨</option><option value="marimba">마림바</option></select></div>
      <div><label for="duration">길이</label><select id="duration"><option value="0.25">0.25초</option><option value="0.7">0.7초</option></select></div>
      <button type="button" class="primary" id="play-sound"><span aria-hidden="true">▷</span> 소리 재생</button>
    </div>
    <p class="audio-status" id="audio-status" role="status"></p>`;
  document.querySelector("#play-sound").addEventListener("click", async event => {
    const player = event.currentTarget;
    const status = document.querySelector("#audio-status");
    try {
      audioContext ||= new AudioContext();
      if (audioContext.state !== "running") await audioContext.resume();
      if (!player.isConnected) return;
      const direction = document.querySelector("#direction");
      const timbre = document.querySelector("#timbre");
      const duration = Number(document.querySelector("#duration").value);
      const pitches = { up: [880, 1320], flat: [1078, 1078], down: [1320, 880] }[direction.value];
      const partials = { sine: [[1, 1]], bell: [[1, .8], [2.41, .32], [4.1, .17]], marimba: [[1, .9], [4, .24], [9.2, .07]] }[timbre.value];
      stopAudio();
      audioOutput = audioContext.createGain();
      audioOutput.gain.value = .09;
      audioOutput.connect(audioContext.destination);
      const start = audioContext.currentTime + .02;
      pitches.forEach((frequency, index) => {
        const onset = start + index * duration * .5;
        partials.forEach(([ratio, level], harmonic) => {
          const wave = audioContext.createOscillator();
          const envelope = audioContext.createGain();
          const tail = duration * (.5 - .08 * harmonic);
          wave.frequency.value = frequency * ratio;
          envelope.gain.setValueAtTime(.0001, onset);
          envelope.gain.exponentialRampToValueAtTime(level, onset + .008);
          envelope.gain.exponentialRampToValueAtTime(.0001, onset + tail);
          wave.connect(envelope).connect(audioOutput);
          wave.start(onset);
          wave.stop(onset + tail);
        });
      });
      status.textContent = `${direction.selectedOptions[0].text} · ${timbre.selectedOptions[0].text} · ${duration}초 재생`;
    } catch {
      status.textContent = "브라우저에서 소리 재생 불가.";
    }
  });
}

sections.addEventListener("click", event => {
  const button = event.target.closest("button[data-to]");
  if (!button) return;
  const target = document.getElementById(button.dataset.to);
  target.focus({ preventScroll: true });
  target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
});

window.addEventListener("scroll", () => {
  const buttons = Array.from(sections.querySelectorAll("button[data-to]"));
  if (!buttons.length) return;
  const threshold = sections.getBoundingClientRect().bottom + 48;
  const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
  const active = atEnd ? buttons.at(-1)
    : buttons.findLast(button => document.getElementById(button.dataset.to).getBoundingClientRect().top <= threshold) || buttons[0];
  buttons.forEach(button => {
    if (button === active) button.setAttribute("aria-current", "location");
    else button.removeAttribute("aria-current");
  });
}, { passive: true });

function openFromHash(focus = false) {
  const route = location.hash.slice(1);
  if (route === "lesson" && currentRoute !== undefined) return;
  if (currentRoute === route) {
    if (focus) window.scrollTo(0, 0);
    return;
  }
  currentRoute = route;
  stopAudio();
  const conceptId = route.startsWith("concept/") ? route.slice("concept/".length) : "";
  if (route === "concepts" || conceptId) {
    renderSidebar();
    if (Object.hasOwn(concepts, conceptId)) renderConcept(conceptId);
    else renderConceptIndex();
  } else {
    const report = reports.find(item => item.id === route) || reports[0];
    renderSidebar(report.id);
    renderChapter(report);
  }
  if (focus) {
    lesson.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

window.addEventListener("hashchange", () => openFromHash(true));
openFromHash();
