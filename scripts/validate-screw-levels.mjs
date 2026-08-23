import assert from 'node:assert/strict';
import { applyMove, createInitialState, findSolution, isHoleExposed, legalDestinations, searchFromState } from '../src/games/screw-sort/screwEngine.js';
import { analyseLevel, hasValidGeometry } from '../src/games/screw-sort/levelGenerator.js';
import { LEVEL_PACK } from '../src/games/screw-sort/levelPack.js';

// Static import keeps this file directly runnable in Node while leaving the test
// values visible above (no browser-only test harness required).
import { isPointInPlate } from '../src/games/screw-sort/screwEngine.js';
function engineTests() {
  assert(isPointInPlate({ x: 20, y: 20, w: 40, h: 40, r: 0 }, 20, 20));
  assert(isPointInPlate({ x: 20, y: 20, w: 40, h: 40, r: 45 }, 50, 50));
  assert(!isPointInPlate({ x: 20, y: 20, w: 40, h: 40, r: 45 }, 21.7, 21.7));
  assert(isPointInPlate({ x: 20, y: 20, w: 40, h: 40, r: -30 }, 50, 50));
  const level = { plates: [{ id: 'top', x: 20, y: 20, w: 60, h: 60, r: 0, z: 1 }, { id: 'bottom', x: 35, y: 35, w: 30, h: 30, r: 0, z: 0 }], holes: [{ id: 'a', x: 30, y: 30, plateId: 'top' }, { id: 'b', x: 50, y: 50, plateId: 'bottom' }, { id: 'w', x: 5, y: 5, plateId: null }], screws: [{ id: 's', holeId: 'a' }] };
  let state = createInitialState(level);
  assert(!legalDestinations(level, state, 'a').includes('b'), 'covered hole cannot be destination');
  state = applyMove(level, state, 'a', 'w').state;
  assert(state.fallen.includes('top') && state.fallen.includes('bottom'), 'fall and chain fall work');
  assert(state.cleared, 'all fallen clears');
  // Three screws but only one workbench hole, so no ordering can win. Legal moves do
  // remain (the bottom screw can hop onto `side`), which is exactly the shape the first
  // version mistook for a playable position and left the player silently stuck in.
  const dead = {
    plates: [{ id: 'top', x: 20, y: 20, w: 60, h: 60, r: 0, z: 1 }, { id: 'bottom', x: 30, y: 30, w: 40, h: 40, r: 0, z: 0 }, { id: 'side', x: 2, y: 80, w: 16, h: 16, r: 0, z: 0 }],
    holes: [{ id: 'tA', x: 25, y: 25, plateId: 'top' }, { id: 'bA', x: 42, y: 42, plateId: 'bottom' }, { id: 'sA', x: 6, y: 84, plateId: 'side' }, { id: 'sB', x: 14, y: 92, plateId: 'side' }, { id: 'w', x: 90, y: 5, plateId: null }],
    screws: [{ id: 'a', holeId: 'tA' }, { id: 'b', holeId: 'bA' }, { id: 'c', holeId: 'sA' }],
  };
  const stuck = applyMove(dead, createInitialState(dead), 'tA', 'w').state;
  assert(stuck.fallen.includes('top'), 'freeing the top plate drops it');
  assert(!stuck.cleared && legalDestinations(dead, stuck, 'bA').length > 0, 'dead fixture retains legal moves');
  assert.equal(searchFromState(dead, stuck).solution, null, 'exhaustive search identifies an unsolvable state');
  const same = { plates: [{ id: 'p', x: 10, y: 10, w: 70, h: 70, r: 0, z: 0 }], holes: [{ id: 'x', x: 20, y: 20, plateId: 'p' }, { id: 'y', x: 60, y: 60, plateId: 'p' }, { id: 'w', x: 90, y: 90, plateId: null }], screws: [{ id: 's', holeId: 'x' }] };
  assert(!legalDestinations(same, createInitialState(same), 'x').includes('y'), 'same-plate hop is not a legal move');
  console.log('Engine geometry, cover, chain-fall, clear, and exhaustive-dead tests passed.');
}

engineTests();
assert.equal(LEVEL_PACK.length, 40, 'level pack holds 40 boards');
const signatures = new Set();
for (const level of LEVEL_PACK) {
  const number = level.id, report = analyseLevel(level, 300);
  signatures.add(JSON.stringify([level.plates, level.holes]));
  assert(report.solvable && findSolution(level), `L${number}: exhaustive solution exists`);
  assert(level.holes.filter((h) => h.plateId === null).length >= level.screws.length, `L${number}: enough workbench holes`);
  assert(report.blocked / level.screws.length >= .3, `L${number}: hidden screws under plates`);
  assert(report.initialEmpty <= 3, `L${number}: few exposed empty holes at the start`);
  assert(report.emptySafe, `L${number}: never reaches a board with no exposed empty hole`);
  assert(hasValidGeometry(level), `L${number}: plate bounds and same-layer hole spacing`);
  assert.equal(report.optimal, level.metrics.optimal, `L${number}: recorded optimal matches a fresh measurement`);
  console.log(`L${String(number).padStart(2, '0')} ok: screws=${level.screws.length} plates=${level.plates.length} optimal=${report.optimal} states=${report.states} hidden=${report.blocked}/${level.screws.length} randomAvgMoves=${report.randomAverageMoves}`);
}
assert(signatures.size >= 35, `distinct boards: ${signatures.size}`);
console.log(`
Distinct boards: ${signatures.size}/40`);
