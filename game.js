'use strict';

// 공책 낙서 지우기: 미션 그림만 찾아 제한 시간 안에 지우는 짧은 터치 퍼즐.
// 화면·입력만 여기서 하고, 규칙(판·판정·점수·시간)은 logic.js (LOGIC_DOODLE) 에 있다.
const L = LOGIC_DOODLE;
const $ = (id) => document.getElementById(id);
const board = $('board');
const overlay = $('overlay');
const card = $('card');

const storage = {
  get(key) { try { return Number(localStorage.getItem(key)) || 0; } catch (_) { return 0; } },
  set(key, value) { try { localStorage.setItem(key, String(value)); } catch (_) {} },
};

let mode = 'title';   // title | play | paused | over
let best = storage.get('doodleBest');
let st = L.newGame();
let lastTick = performance.now();
let roundTimer = 0;

const transitioning = () => st.state === 'between';

function updateHud() {
  $('score').textContent = st.score.toLocaleString('ko-KR');
  $('best').textContent = best.toLocaleString('ko-KR');
  $('level').textContent = st.level;
  $('remaining').textContent = `${st.targetsLeft}개 남음`;
  $('progress').style.width = st.targetsTotal ? `${((st.targetsTotal - st.targetsLeft) / st.targetsTotal) * 100}%` : '0%';
  $('pause').disabled = mode !== 'play' || transitioning();
  $('pause').style.opacity = mode === 'play' ? '1' : '.55';
}

function showOverlay(html) {
  card.innerHTML = html;
  overlay.classList.remove('hidden');
}

function hideOverlay() { overlay.classList.add('hidden'); }

function drawRound() {
  $('target').textContent = st.target.icon;
  $('target').setAttribute('aria-label', `찾을 그림: ${st.target.name}`);
  board.replaceChildren(...st.cards.map((item, i) => {
    const button = document.createElement('button');
    button.className = 'doodle';
    button.type = 'button';
    button.textContent = item.icon;
    button.setAttribute('aria-label', `${item.name} 낙서`);
    button.addEventListener('click', () => erase(button, i));
    return button;
  }));
  $('feedback').textContent = st.level === 1 ? '미션 그림을 모두 누르면 다음 공책으로!' : `새 공책! ${st.target.name} 낙서 ${st.targetsTotal}개를 찾아요`;
  updateHud();
}

function erase(button, i) {
  if (mode !== 'play') return;
  const r = L.erase(st, i);
  if (!r) return;
  if (r.ok) {
    button.classList.add('found');
    $('feedback').textContent = r.streak >= 3 ? `찰떡! ${r.streak}연속 지우기 +${r.gained}점` : `쓱싹! +${r.gained}점`;
    updateHud();
    if (r.cleared) {
      $('feedback').textContent = `공책 ${st.level}장 정리 완료! 보너스 +${r.bonus}점`;
      updateHud();
      roundTimer = setTimeout(advanceRound, 650);
    }
  } else {
    button.classList.remove('wrong');
    // 애니메이션 재시작
    void button.offsetWidth;
    button.classList.add('wrong');
    $('feedback').textContent = `앗, 다른 낙서예요! ${L.WRONG_TIME}초 깎였어요`;
    updateHud();
    if (st.state === 'over') finishGame();
  }
}

function advanceRound() {
  if (mode !== 'play') return;
  if (L.advance(st)) drawRound();
}

function startGame() {
  clearTimeout(roundTimer);
  st = L.newGame();
  mode = 'play';
  lastTick = performance.now();
  hideOverlay();
  drawRound();
}

function finishGame() {
  if (mode !== 'play') return;
  mode = 'over';
  clearTimeout(roundTimer);
  if (st.score > best) {
    best = st.score;
    storage.set('doodleBest', best);
  }
  updateHud();
  showOverlay(`<div class="card"><div class="sticker">🧽</div><h2>종이 울렸어요!</h2><p>오늘은 <b>${L.pagesDone(st)}장</b>을 정리했어요</p><p style="margin-top:8px">점수 <b>${st.score.toLocaleString('ko-KR')}</b> · 최고 <b>${best.toLocaleString('ko-KR')}</b></p><button class="primary" id="again">다시 하기</button></div>`);
  $('again').addEventListener('click', startGame);
}

function pauseGame() {
  if (mode !== 'play' || transitioning()) return;
  mode = 'paused';
  updateHud();
  showOverlay(`<div class="card"><div class="sticker">⏸️</div><h2>잠깐 쉬어요</h2><p>종이 치기 전까지 낙서를 찾아요.</p><button class="primary" id="resume">계속하기</button></div>`);
  $('resume').addEventListener('click', () => {
    mode = 'play';
    lastTick = performance.now();
    hideOverlay();
    updateHud();
    if (transitioning()) advanceRound();
  });
}

function showTitle() {
  mode = 'title';
  updateHud();
  showOverlay(`<div class="card"><div class="sticker">📓✏️</div><h2>공책 낙서 지우기</h2><p>위쪽 미션 그림과 똑같은 낙서만 찾아 눌러요.<br>다른 그림을 누르면 <b>2초</b> 손해!</p><p class="small">연속으로 맞히면 점수가 더 올라가요.<br>45초 동안 몇 장이나 정리할 수 있을까요?</p><button class="primary" id="start">시작하기</button><p class="small">마우스 클릭 또는 화면 터치</p></div>`);
  $('start').addEventListener('click', startGame);
}

function frame(now) {
  if (mode === 'play') {
    const dt = Math.min((now - lastTick) / 1000, 0.15);
    L.tick(st, dt);
    $('time').textContent = `${st.timeLeft.toFixed(1)}초`;
    if (st.state === 'over') finishGame();
  } else {
    $('time').textContent = `${st.timeLeft.toFixed(1)}초`;
  }
  lastTick = now;
  requestAnimationFrame(frame);
}

$('pause').addEventListener('click', pauseGame);
document.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  if (event.code === 'Escape' || event.code === 'KeyP') {
    if (mode === 'play') pauseGame();
    else if (mode === 'paused') $('resume')?.click();
  } else if ((event.code === 'Enter' || event.code === 'Space') && mode === 'title') {
    event.preventDefault();
    startGame();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame();
});

showTitle();
requestAnimationFrame(frame);
