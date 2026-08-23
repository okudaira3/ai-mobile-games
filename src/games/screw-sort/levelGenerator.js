import { createInitialState, isBlocked, isHoleExposed, reachableStates, screwAtHole, stateKey, transitions } from './screwEngine.js';

const PLATE_COLORS = ['#a78be8', '#78d4ab', '#78b9e8', '#e5a85c', '#e8a0c4'];
const SCREW_COLORS = ['#f06d73', '#f4c65b', '#63e0c4', '#89b9f5', '#d7a3ef', '#f49ec1'];
const MIN_DISTANCE = 13;

const rng = (seed) => () => { let t = seed += 0x6d2b79f5; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// Screw count drives the state space, so it grows slowly: every board below is
// verified by complete enumeration, never by a node budget.
function profile(number) {
  if (number <= 3) return { screws: 4, plates: 2, free: 2 };
  if (number <= 8) return { screws: 5, plates: 3, free: 2 };
  if (number <= 16) return { screws: 6, plates: 3, free: 2 };
  if (number <= 26) return { screws: 7, plates: 4, free: 2 };
  return { screws: 8, plates: 4, free: 2 };
}

const inside = (plate) => plate.x >= 2 && plate.y >= 2 && plate.x + plate.w <= 98 && plate.y + plate.h <= 98;

// Plates overlap partially instead of nesting. Nested plates peel off strictly
// top-down, which makes the order forced; partial overlap means each plate hides a
// different set of workbench holes, so which plate you free first actually matters.
function makePlates(count, random) {
  const plates = [];
  for (let index = 0; index < count; index += 1) {
    const w = 30 + random() * 26, h = 26 + random() * 24;
    const x = 4 + random() * (94 - w), y = 4 + random() * (94 - h);
    plates.push({ id: `p${index}`, x: +x.toFixed(2), y: +y.toFixed(2), w: +w.toFixed(2), h: +h.toFixed(2), r: Math.round((random() - .5) * 16), z: index, color: PLATE_COLORS[index % PLATE_COLORS.length] });
  }
  // Every plate above the bottom must actually cover part of a lower plate or the
  // hidden layer is decorative, which is exactly how the first version failed.
  const overlaps = plates.slice(1).every((plate, index) => plates.slice(0, index + 1).some((lower) => plate.x < lower.x + lower.w && lower.x < plate.x + plate.w && plate.y < lower.y + lower.h && lower.y < plate.y + plate.h));
  return overlaps ? plates : null;
}

const farEnough = (holes, x, y, z) => holes.every((hole) => hole.z !== z || Math.hypot(hole.x - x, hole.y - y) >= MIN_DISTANCE);

function candidate(number, attempt) {
  const { screws: screwCount, plates: plateCount, free } = profile(number);
  const random = rng(number * 7919 + attempt * 104729);
  const plates = makePlates(plateCount, random);
  if (!plates || plates.length < 2) return null;
  const topZ = Math.max(...plates.map((plate) => plate.z));
  const holes = [];

  // One screw hole per plate first, so every plate is really fastened, then spread
  // the rest over the plates that still have room.
  const perPlate = plates.map(() => 1);
  for (let extra = plates.length; extra < screwCount; extra += 1) perPlate[Math.floor(random() * plates.length)] += 1;
  for (const [index, plate] of plates.entries()) {
    for (let k = 0; k < perPlate[index]; k += 1) {
      let placed = null;
      for (let tries = 0; tries < 80 && !placed; tries += 1) {
        const x = plate.x + 5 + random() * Math.max(1, plate.w - 10), y = plate.y + 5 + random() * Math.max(1, plate.h - 10);
        if (farEnough(holes, x, y, plate.z)) placed = { id: `h${holes.length}`, x: +x.toFixed(2), y: +y.toFixed(2), plateId: plate.id, z: plate.z };
      }
      if (!placed) return null;
      holes.push(placed);
    }
  }
  if (holes.length !== screwCount) return null;

  // Workbench holes: exactly enough to park every screw at the end. Only `free` of
  // them start uncovered, so the player must stage screws on the plates.
  const bench = [];
  const covered = (x, y) => plates.some((plate) => plate.z > -1 && isPointInside(plate, x, y));
  for (let tries = 0; tries < 900 && bench.length < screwCount - free; tries += 1) {
    const x = 8 + random() * 84, y = 8 + random() * 84;
    if (covered(x, y) && farEnough([...holes, ...bench], x, y, -1)) bench.push({ id: `b${bench.length}`, x: +x.toFixed(2), y: +y.toFixed(2), plateId: null, z: -1 });
  }
  for (let tries = 0; tries < 900 && bench.length < screwCount; tries += 1) {
    const x = 5 + random() * 90, y = 5 + random() * 90;
    if (!covered(x, y) && farEnough([...holes, ...bench], x, y, -1)) bench.push({ id: `b${bench.length}`, x: +x.toFixed(2), y: +y.toFixed(2), plateId: null, z: -1 });
  }
  if (bench.length !== screwCount) return null;

  const all = [...holes, ...bench].map(({ z, ...hole }) => hole);
  const screws = holes.map((hole, index) => ({ id: `s${index}`, holeId: hole.id, color: SCREW_COLORS[index % SCREW_COLORS.length] }));
  const level = { id: number, plates, holes: all, screws };
  return plates.every(inside) && topZ >= 1 ? level : null;
}

function isPointInside(plate, x, y) {
  const cx = plate.x + plate.w / 2, cy = plate.y + plate.h / 2, radians = -plate.r * Math.PI / 180;
  const dx = x - cx, dy = y - cy;
  const lx = cx + dx * Math.cos(radians) - dy * Math.sin(radians), ly = cy + dx * Math.sin(radians) + dy * Math.cos(radians);
  return lx >= plate.x && lx <= plate.x + plate.w && ly >= plate.y && ly <= plate.y + plate.h;
}

// Complete enumeration: every number reported here is measured, never asserted.
export function analyseLevel(level, randomRuns = 300) {
  const initial = createInitialState(level);
  const states = reachableStates(level);
  const key = (state) => stateKey(level, state);
  const winning = new Set(), predecessors = new Map(states.map((state) => [key(state), []]));
  for (const state of states) {
    if (state.cleared) winning.add(key(state));
    for (const move of transitions(level, state)) predecessors.get(key(move.state))?.push(key(state));
  }
  const frontier = [...winning];
  while (frontier.length) for (const previous of predecessors.get(frontier.pop()) ?? []) if (!winning.has(previous)) { winning.add(previous); frontier.push(previous); }

  // Exact optimal length by breadth-first search over the same enumerated graph.
  let optimal = null;
  const distance = new Map([[key(initial), 0]]), queue = [initial];
  while (queue.length) {
    const state = queue.shift(), d = distance.get(key(state));
    if (state.cleared) { optimal = d; break; }
    for (const move of transitions(level, state)) if (!distance.has(key(move.state))) { distance.set(key(move.state), d + 1); queue.push(move.state); }
  }

  const emptySafe = states.every((state) => state.cleared || level.holes.some((hole) => !screwAtHole(level, state, hole.id) && isHoleExposed(level, state, hole)));
  let choices = 0, decisionStates = 0, detourStates = 0;
  for (const state of states) {
    const moves = transitions(level, state);
    if (!moves.length || state.cleared) continue;
    choices += 1;
    const winners = moves.filter((move) => winning.has(key(move.state))).length;
    if (winners > 0 && winners < moves.length) decisionStates += 1;
    // Without losing moves, the real skill is not wandering: count states where most
    // moves increase the distance that still remains to the goal.
    const here = distance.get(key(state));
    if (here !== undefined && moves.some((move) => (distance.get(key(move.state)) ?? Infinity) > here + 1)) detourStates += 1;
  }

  let wins = 0, randomMoves = 0;
  for (let run = 0; run < randomRuns; run += 1) {
    const random = rng(level.id * 7919 + run * 97);
    let state = initial, steps = 0;
    while (!state.cleared && steps < 400) {
      const moves = transitions(level, state);
      if (!moves.length) break;
      state = moves[Math.floor(random() * moves.length)].state; steps += 1;
    }
    if (state.cleared) { wins += 1; randomMoves += steps; }
  }

  return {
    solvable: winning.has(key(initial)), states: states.length, optimal, emptySafe,
    blocked: level.screws.filter((screw) => isBlocked(level, initial, screw)).length,
    initialEmpty: level.holes.filter((hole) => !screwAtHole(level, initial, hole.id) && isHoleExposed(level, initial, hole)).length,
    randomWins: wins, randomRuns, randomAverageMoves: wins ? +(randomMoves / wins).toFixed(1) : null,
    decisionRate: choices ? decisionStates / choices : 0, detourRate: choices ? detourStates / choices : 0,
  };
}

export function hasValidGeometry(level) {
  const z = (hole) => hole.plateId ? level.plates.find((plate) => plate.id === hole.plateId).z : -1;
  return level.plates.every(inside) && level.holes.every((a, index) => level.holes.slice(index + 1).every((b) => z(a) !== z(b) || Math.hypot(a.x - b.x, a.y - b.y) >= MIN_DISTANCE));
}

function firstValid() {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const level = candidate(1, attempt);
    if (!level || !hasValidGeometry(level)) continue;
    const report = analyseLevel(level, 0);
    if (report.solvable && report.emptySafe && report.blocked / level.screws.length >= .3) return level;
  }
  return candidate(1, 0);
}
const FALLBACK = firstValid();

// Deterministic and total: it searches seeds for a board that passes complete
// enumeration, and falls back to a verified board rather than throwing.
export function generateLevel(number) {
  const levelNumber = Math.min(40, Math.max(1, Number(number) || 1));
  for (let attempt = 0; attempt < 900; attempt += 1) {
    const level = candidate(levelNumber, attempt);
    if (!level || !hasValidGeometry(level)) continue;
    const report = analyseLevel(level, 0);
    if (!report.solvable || !report.emptySafe) continue;
    if (report.blocked / level.screws.length < .3) continue;
    if (report.initialEmpty > 3) continue;
    if (report.optimal === null) continue;
    return level;
  }
  return { ...FALLBACK, id: levelNumber };
}

export function levelMetrics(number) { return analyseLevel(generateLevel(number)); }
