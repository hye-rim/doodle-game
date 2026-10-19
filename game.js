'use strict';

// 공책 낙서 지우기: 미션 그림만 찾아 제한 시간 안에 지우는 짧은 터치 퍼즐.
const $ = (id) => document.getElementById(id);
const board = $('board');
const overlay = $('overlay');
const card = $('card');
const doodles = [
  { icon: '⭐', name: '별' }, { icon: '🐱', name: '고양이' }, { icon: '🍓', name: '딸기' },
  { icon: '☁️', name: '구름' }, { icon: '🐸', name: '개구리' }, { icon: '🎈', name: '풍선' },
  { icon: '🍀', name: '클로버' }, { icon: '🐰', name: '토끼' }, { icon: '🌙', name: '달' },
  { icon: '🍄', name: '버섯' }, { icon: '🐟', name: '물고기' }, { icon: '🌼', name: '꽃' },
];

const storage = {
  get(key) { try { return Number(localStorage.getItem(key)) || 0; } catch (_) { return 0; } },
  set(key, value) { try { localStorage.setItem(key, String(value)); } catch (_) {} },
};

let mode = 'title';
let score = 0;
let best = storage.get('doodleBest');
let level = 1;
let timeLeft = 45;
let targetsLeft = 0;
let targetsTotal = 0;
let streak = 0;
let lastTick = performance.now();
let transitionLock = false;
let pendingRound = false;
let roundTimer = 0;

function updateHud() {
  $('score').textContent = score.toLocaleString('ko-KR');
  $('best').textContent = best.toLocaleString('ko-KR');
  $('level').textContent = level;
  $('remaining').textContent = `${targetsLeft}개 남음`;
  $('progress').style.width = targetsTotal ? `${((targetsTotal - targetsLeft) / targetsTotal) * 100}%` : '0%';
  $('pause').disabled = mode !== 'play' || transitionLock;
  $('pause').style.opacity = mode === 'play' ? '1' : '.55';
}

function showOverlay(html) {
  card.innerHTML = html;
  overlay.classList.remove('hidden');
}

function hideOverlay() { overlay.classList.add('hidden'); }

function makeRound() {
  const total = Math.min(12 + (level - 1) * 2, 28);
  targetsTotal = Math.min(2 + Math.floor((level + 1) / 3), 8, total - 2);
  targetsLeft = targetsTotal;
  const target = doodles[(Math.random() * doodles.length) | 0];
  $('target').textContent = target.icon;
  $('target').setAttribute('aria-label', `찾을 그림: ${target.name}`);

  const choices = [];
  for (let i = 0; i < targetsTotal; i++) choices.push({ ...target, isTarget: true });
  while (choices.length < total) {
    const item = doodles[(Math.random() * doodles.length) | 0];
    if (item.icon !== target.icon) choices.push({ ...item, isTarget: false });
  }
  for (let i = choices.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  board.replaceChildren(...choices.map((item) => {
    const button = document.createElement('button');
    button.className = 'doodle';
    button.type = 'button';
    button.textContent = item.icon;
    button.setAttribute('aria-label', `${item.name} 낙서`);
    button.dataset.target = item.isTarget ? 'yes' : 'no';
    button.addEventListener('click', () => erase(button));
    return button;
  }));
  $('feedback').textContent = level === 1 ? '미션 그림을 모두 누르면 다음 공책으로!' : `새 공책! ${target.name} 낙서 ${targetsTotal}개를 찾아요`;
  updateHud();
}

function erase(button) {
  if (mode !== 'play' || transitionLock || button.classList.contains('found')) return;
  if (button.dataset.target === 'yes') {
    button.classList.add('found');
    targetsLeft--;
    streak++;
    const gained = 10 + Math.min(Math.max(0, streak - 1) * 2, 20);
    score += gained;
    $('feedback').textContent = streak >= 3 ? `찰떡! ${streak}연속 지우기 +${gained}점` : `쓱싹! +${gained}점`;
    updateHud();
    if (targetsLeft === 0) clearRound();
  } else {
    button.classList.remove('wrong');
    // 애니메이션 재시작
    void button.offsetWidth;
    button.classList.add('wrong');
    streak = 0;
    timeLeft = Math.max(0, timeLeft - 2);
    $('feedback').textContent = '앗, 다른 낙서예요! 2초 깎였어요';
    updateHud();
    if (timeLeft <= 0) finishGame();
  }
}

function clearRound() {
  transitionLock = true;
  pendingRound = true;
  score += 20 + level * 2;
  $('feedback').textContent = `공책 ${level}장 정리 완료! 보너스 +${20 + level * 2}점`;
  updateHud();
  roundTimer = setTimeout(() => {
    advanceRound();
  }, 650);
}

function advanceRound() {
  if (!pendingRound || mode !== 'play') return;
  pendingRound = false;
  transitionLock = false;
  level++;
  makeRound();
}

function startGame() {
  clearTimeout(roundTimer);
  score = 0;
  level = 1;
  timeLeft = 45;
  streak = 0;
  transitionLock = false;
  pendingRound = false;
  mode = 'play';
  lastTick = performance.now();
  hideOverlay();
  makeRound();
}

function finishGame() {
  if (mode !== 'play') return;
  mode = 'over';
  transitionLock = false;
  clearTimeout(roundTimer);
  if (score > best) {
    best = score;
    storage.set('doodleBest', best);
  }
  updateHud();
  showOverlay(`<div class="card"><div class="sticker">🧽</div><h2>종이 울렸어요!</h2><p>오늘은 <b>${level - (targetsLeft === 0 ? 0 : 1)}장</b>을 정리했어요</p><p style="margin-top:8px">점수 <b>${score.toLocaleString('ko-KR')}</b> · 최고 <b>${best.toLocaleString('ko-KR')}</b></p><button class="primary" id="again">다시 하기</button></div>`);
  $('again').addEventListener('click', startGame);
}

function pauseGame() {
  if (mode !== 'play' || transitionLock) return;
  mode = 'paused';
  updateHud();
  showOverlay(`<div class="card"><div class="sticker">⏸️</div><h2>잠깐 쉬어요</h2><p>종이 치기 전까지 낙서를 찾아요.</p><button class="primary" id="resume">계속하기</button></div>`);
  $('resume').addEventListener('click', () => {
    mode = 'play';
    lastTick = performance.now();
    hideOverlay();
    updateHud();
    if (pendingRound) advanceRound();
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
    timeLeft = Math.max(0, timeLeft - dt);
    $('time').textContent = `${timeLeft.toFixed(1)}초`;
    if (timeLeft <= 0) finishGame();
  } else {
    $('time').textContent = `${timeLeft.toFixed(1)}초`;
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
