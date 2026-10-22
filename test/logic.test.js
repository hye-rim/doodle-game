'use strict';
// 공책 낙서 지우기 규칙 시험. 실행: node test/logic.test.js
const test = require('node:test');
const assert = require('node:assert');
const L = require('../logic.js');

function rng(seed) {                                   // mulberry32 (시험용 고정 난수)
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const targets = (st) => st.cards.map((c, i) => (c.isTarget ? i : -1)).filter((i) => i >= 0);
const decoy = (st) => st.cards.findIndex((c) => !c.isTarget);

test('pages grow from 12 to 28 doodles; the number to find grows to 8', () => {
  assert.deepStrictEqual(L.roundSpec(1), { total: 12, targets: 2 });
  assert.deepStrictEqual(L.roundSpec(100), { total: 28, targets: 8 });
  for (let n = 2; n <= 30; n++) {
    const a = L.roundSpec(n - 1), b = L.roundSpec(n);
    assert.ok(b.total >= a.total && b.targets >= a.targets && b.targets <= b.total - 2);
  }
});

test('every page has exactly the right number of the mission doodle and nothing else like it', () => {
  for (let s = 1; s <= 40; s++) {
    const st = L.newGame(rng(s));
    for (let level = 1; level <= 12; level++) {
      st.level = level; L.makeRound(st);
      const spec = L.roundSpec(level);
      assert.strictEqual(st.cards.length, spec.total);
      assert.strictEqual(st.cards.filter((c) => c.icon === st.target.icon).length, spec.targets);
      assert.ok(st.cards.every((c) => c.isTarget === (c.icon === st.target.icon)));
      assert.strictEqual(st.targetsLeft, spec.targets);
    }
  }
});

test('finding doodles: streak bonus, no double counting, page bonus, next page', () => {
  const st = L.newGame(rng(1));
  const [a, b] = targets(st);
  assert.deepStrictEqual(L.erase(st, a), { ok: true, gained: 10, streak: 1, cleared: false, bonus: 0 });
  assert.strictEqual(L.erase(st, a), null, 'already erased');
  const r = L.erase(st, b);
  assert.strictEqual(r.gained, 12);
  assert.ok(r.cleared);
  assert.strictEqual(r.bonus, L.clearBonus(1));
  assert.strictEqual(st.score, 10 + 12 + 22);
  assert.strictEqual(st.state, 'between');
  assert.strictEqual(L.erase(st, decoy(st)), null, 'no tapping while the page turns');
  assert.ok(L.advance(st));
  assert.strictEqual(st.level, 2);
  assert.strictEqual(st.state, 'play');
  assert.strictEqual(st.streak, 2, 'the streak carries over to the next page');
  assert.strictEqual(L.gainFor(50), 30, 'streak bonus capped at +20');
});

test('a wrong doodle costs 2 seconds and the streak; it can end the game', () => {
  const st = L.newGame(rng(2));
  L.erase(st, targets(st)[0]);
  assert.deepStrictEqual(L.erase(st, decoy(st)), { ok: false });
  assert.strictEqual(st.timeLeft, L.START_TIME - 2);
  assert.strictEqual(st.streak, 0);
  st.timeLeft = 1;
  L.erase(st, decoy(st));
  assert.strictEqual(st.state, 'over');
  assert.strictEqual(st.timeLeft, 0);
});

test('the clock runs out after 45 seconds and counts finished pages', () => {
  const st = L.newGame(rng(3));
  for (const i of targets(st)) L.erase(st, i);
  L.advance(st);
  L.tick(st, 50);
  assert.strictEqual(st.state, 'over');
  assert.strictEqual(L.pagesDone(st), 1);
  assert.strictEqual(L.erase(st, 0), null);
});

test('a steady player (0.5 s per doodle, 0.65 s page turns) clears many pages', () => {
  const st = L.newGame(rng(4));
  while (st.state !== 'over') {
    if (st.state === 'between') { L.tick(st, 0.65); if (st.state !== 'over') L.advance(st); continue; }
    L.tick(st, 0.5);
    if (st.state === 'play') L.erase(st, targets(st).find((i) => !st.cards[i].found));
  }
  assert.ok(L.pagesDone(st) >= 8 && L.pagesDone(st) <= 15, 'pages: ' + L.pagesDone(st));
});
