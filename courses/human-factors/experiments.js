(() => {
  const cdf=x=>{const t=1/(1+.2316419*Math.abs(x)),d=.3989422804*Math.exp(-x*x/2);const p=1-d*t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));return x>=0?p:1-p;};
  const density=x=>Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);
  const label=(title,id,min,max,value,step=1)=>`<label class="experiment-control" for="${id}"><span>${title}</span><output id="${id}-value">${value}</output><input id="${id}" type="range" min="${min}" max="${max}" value="${value}" step="${step}"></label>`;
  window.HF_EXPERIMENTS={
    render(l,c){
      if(c.id==='3'&&/민감도|판단기준|판단 기준|신호탐지|신호 탐지/.test(l.title))return `<section class="experiment" data-experiment="sdt"><h2>기준을 옮기면 무엇이 달라질까?</h2><p>분포의 간격과 판단기준을 각각 움직여 보세요.</p><svg class="experiment-chart" viewBox="0 0 600 225" role="img" aria-label="잡음과 신호 분포, 판단기준의 관계"></svg>${label('민감도 d′','sdt-d',.2,3,1.5,.1)}${label('판단기준 x꜀','sdt-c',-1,4,1,.1)}<div class="experiment-results" aria-live="polite"></div><p class="experiment-note">등분산 정규분포를 가정한 학습용 예시입니다. 선을 오른쪽으로 옮기면 신호라고 판단하기가 더 까다로워집니다.</p></section>`;
      if(c.id==='8'&&/Fitts|피츠|피트|목표.*크기|속도.*정확/.test(l.title))return `<section class="experiment" data-experiment="fitts"><h2>멀고 작은 목표일수록</h2><p>목표까지의 거리와 목표의 폭을 바꿔 보세요.</p><svg class="experiment-chart target-chart" viewBox="0 0 600 150" role="img" aria-label="출발점에서 목표까지의 거리와 목표 폭"></svg>${label('거리 D (예시 단위)','fitts-d',80,400,240,10)}${label('목표 폭 W (예시 단위)','fitts-w',15,100,50,5)}<div class="experiment-results" aria-live="polite"></div><p class="experiment-note">도식의 D/W는 거리와 폭의 비율입니다. D가 커지거나 W가 작아지면 목표를 가리키는 일이 어려워집니다. 실제 이동시간을 예측하는 값은 아닙니다.</p></section>`;
      if(c.id==='9'&&/백분위|설계.*원칙|극단|평균|설계.*적용/.test(l.title))return `<section class="experiment" data-experiment="sizing"><h2>누구를 기준으로 설계할까?</h2><div class="sizing-options" role="group" aria-label="설계 상황"><button data-sizing="reach" aria-pressed="true">손이 닿는 범위</button><button data-sizing="clearance" aria-pressed="false">통과할 여유 공간</button><button data-sizing="adjust" aria-pressed="false">높이 조절 의자</button></div><div class="sizing-answer" aria-live="polite"></div><p class="experiment-note">설계 대상을 먼저 정한 뒤 해당 집단의 치수 자료를 사용합니다. 한 신체치수의 백분위가 다른 모든 치수에서도 같지는 않습니다.</p></section>`;
      return '';
    },
    bind(root){
      const box=root.querySelector('[data-experiment]');if(!box)return;
      const kind=box.dataset.experiment,chart=box.querySelector('svg'),results=box.querySelector('.experiment-results');
      if(kind==='sdt'){
        const render=()=>{const d=+box.querySelector('#sdt-d').value,c=+box.querySelector('#sdt-c').value;box.querySelector('#sdt-d-value').textContent=d.toFixed(1);box.querySelector('#sdt-c-value').textContent=c.toFixed(1);
          const px=x=>50+(x+3)*64,py=y=>176-y*340;
          const curve=mean=>Array.from({length:181},(_,i)=>{const x=-3+i*.05;return `${i?'L':'M'}${px(x).toFixed(1)},${py(density(x-mean)).toFixed(1)}`;}).join(' ');
          const hit=1-cdf(c-d),fa=1-cdf(c);const pct=v=>(v*100).toFixed(1)+'%';
          chart.innerHTML=`<path d="M40 176H585" stroke="#bbb"/><path d="${curve(0)}" stroke="#888" stroke-dasharray="5 5" fill="none" stroke-width="2"/><path d="${curve(d)}" stroke="#222" fill="none" stroke-width="2.5"/><path d="M${px(c)} 25V176" stroke="#555" stroke-dasharray="3 4"/><text x="${px(0)}" y="209" text-anchor="middle">잡음</text><text x="${px(d)}" y="209" text-anchor="middle">신호 + 잡음</text><text x="${Math.min(px(c)+8,510)}" y="22">판단기준</text>`;
          results.innerHTML=`<div>적중 Hit<strong>${pct(hit)}</strong></div><div>오경보 FA<strong>${pct(fa)}</strong></div><div>누락 Miss<strong>${pct(1-hit)}</strong></div><div>정확기각 CR<strong>${pct(1-fa)}</strong></div>`;
        };box.addEventListener('input',render);render();
      }else if(kind==='fitts'){
        const render=()=>{const d=+box.querySelector('#fitts-d').value,w=+box.querySelector('#fitts-w').value;box.querySelector('#fitts-d-value').textContent=d;box.querySelector('#fitts-w-value').textContent=w;
          chart.innerHTML=`<circle cx="60" cy="65" r="7" fill="#222"/><path d="M60 105H${60+d}" stroke="#777"/><path d="M60 100V110M${60+d} 100V110" stroke="#777"/><rect x="${60+d-w/2}" y="35" width="${w}" height="60" rx="4" fill="#ededed" stroke="#222"/><text x="60" y="25" text-anchor="middle">출발</text><text x="${60+d}" y="25" text-anchor="middle">목표 W = ${w}</text><text x="${60+d/2}" y="132" text-anchor="middle">D = ${d}</text>`;
          results.innerHTML=`<div>거리 / 목표 폭<strong>${(d/w).toFixed(2)}</strong></div><div>같은 거리라면<strong>폭이 클수록 쉬움</strong></div>`;};box.addEventListener('input',render);render();
      }else{
        const answers={reach:'작은 사용자의 도달거리를 기준으로 봅니다. 큰 사람만 닿을 수 있는 위치에 두면 작은 사용자가 배제됩니다.',clearance:'큰 사용자의 치수를 기준으로 여유를 확보합니다. 작은 사람에게 맞춘 문이나 공간은 큰 사람이 통과하기 어렵습니다.',adjust:'다양한 사용자를 수용할 조절 범위를 정합니다. 여러 신체치수와 자세를 함께 확인하고 실제 사용으로 검증합니다.'};
        const select=key=>{box.querySelectorAll('[data-sizing]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sizing===key)));box.querySelector('.sizing-answer').textContent=answers[key];};box.addEventListener('click',e=>{const b=e.target.closest('[data-sizing]');if(b)select(b.dataset.sizing);});select('reach');
      }
    }
  };
})();
