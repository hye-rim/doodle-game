'use strict';

// 공책 낙서 지우기: 규칙만 모아 둔 파일 (그리기·입력 없음). 브라우저와 테스트(Node)가 같이 쓴다.
//
// - 45초 동안 미션 그림과 같은 낙서만 찾아 누른다. 다른 낙서를 누르면 2초 손해, 연속 기록이 끊긴다
// - 한 장을 다 지우면 보너스(20 + 단계×2)를 받고 잠시 뒤 다음 장. 단계가 오를수록 낙서와 찾을 그림이 많아진다
// - 점수: 하나에 10점 + 연속 보너스(두 번째부터 2점씩, 최대 +20)
const LOGIC_DOODLE = (() => {
const DOODLES = [
  { icon: '⭐', name: '별' }, { icon: '🐱', name: '고양이' }, { icon: '🍓', name: '딸기' },
  { icon: '☁️', name: '구름' }, { icon: '🐸', name: '개구리' }, { icon: '🎈', name: '풍선' },
  { icon: '🍀', name: '클로버' }, { icon: '🐰', name: '토끼' }, { icon: '🌙', name: '달' },
  { icon: '🍄', name: '버섯' }, { icon: '🐟', name: '물고기' }, { icon: '🌼', name: '꽃' },
];
const START_TIME = 45, WRONG_TIME = 2;

// 단계별 낙서 수와 그중 찾을 그림 수
function roundSpec(level) {
  const total = Math.min(12 + (level - 1) * 2, 28);
  return { total, targets: Math.min(2 + Math.floor((level + 1) / 3), 8, total - 2) };
}
const gainFor = (streak) => 10 + Math.min(Math.max(0, streak - 1) * 2, 20);
const clearBonus = (level) => 20 + level * 2;

function newGame(rand = Math.random) {
  const st = { rand, level: 1, score: 0, timeLeft: START_TIME, streak: 0, state: 'play', cards: [], target: null, targetsLeft: 0, targetsTotal: 0 };
  makeRound(st);
  return st;
}

// 새 장: 찾을 그림 targets 개 + 다른 낙서로 채워 섞는다
function makeRound(st) {
  const { total, targets } = roundSpec(st.level);
  const rand = st.rand;
  const target = DOODLES[(rand() * DOODLES.length) | 0];
  const cards = [];
  for (let i = 0; i < targets; i++) cards.push({ ...target, isTarget: true, found: false });
  while (cards.length < total) {
    const item = DOODLES[(rand() * DOODLES.length) | 0];
    if (item.icon !== target.icon) cards.push({ ...item, isTarget: false, found: false });
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  Object.assign(st, { cards, target, targetsLeft: targets, targetsTotal: targets, state: 'play' });
}

// i 번 낙서를 누른다. 결과: null(못 누름) · { ok:true, gained, streak, cleared, bonus } · { ok:false }
function erase(st, i) {
  const card = st.cards[i];
  if (st.state !== 'play' || !card || card.found) return null;
  if (card.isTarget) {
    card.found = true;
    st.targetsLeft--;
    st.streak++;
    const gained = gainFor(st.streak);
    st.score += gained;
    const cleared = st.targetsLeft === 0;
    let bonus = 0;
    if (cleared) { bonus = clearBonus(st.level); st.score += bonus; st.state = 'between'; }
    return { ok: true, gained, streak: st.streak, cleared, bonus };
  }
  st.streak = 0;
  st.timeLeft = Math.max(0, st.timeLeft - WRONG_TIME);
  if (st.timeLeft <= 0) st.state = 'over';
  return { ok: false };
}

// 다 지운 장에서 다음 장으로
function advance(st) {
  if (st.state !== 'between') return false;
  st.level++;
  makeRound(st);
  return true;
}

// 시간이 흐른다 (다음 장으로 넘어가는 동안에도 흐른다)
function tick(st, dt) {
  if (st.state !== 'play' && st.state !== 'between') return;
  st.timeLeft = Math.max(0, st.timeLeft - dt);
  if (st.timeLeft <= 0) st.state = 'over';
}

// 정리한 장 수 (지금 장을 다 지웠으면 그 장까지)
const pagesDone = (st) => st.level - (st.targetsLeft === 0 ? 0 : 1);

return { DOODLES, START_TIME, WRONG_TIME, roundSpec, gainFor, clearBonus, newGame, makeRound, erase, advance, tick, pagesDone };
})();
if (typeof module !== 'undefined') module.exports = LOGIC_DOODLE;
