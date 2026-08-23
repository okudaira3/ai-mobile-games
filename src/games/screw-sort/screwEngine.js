// Rules engine.  A position deliberately contains no screw identity: screws are
// interchangeable, so the only game state is occupied hole ids plus fallen plates.
const EPSILON = 1e-7;
const includes = (items, id) => items.includes(id);

export function isPointInPlate(plate, x, y) {
  const cx = plate.x + plate.w / 2;
  const cy = plate.y + plate.h / 2;
  const radians = -plate.r * Math.PI / 180;
  const dx = x - cx, dy = y - cy;
  const localX = cx + dx * Math.cos(radians) - dy * Math.sin(radians);
  const localY = cy + dx * Math.sin(radians) + dy * Math.cos(radians);
  return localX >= plate.x - EPSILON && localX <= plate.x + plate.w + EPSILON
    && localY >= plate.y - EPSILON && localY <= plate.y + plate.h + EPSILON;
}

export const holeById = (level, id) => level.holes.find((hole) => hole.id === id);
export const plateById = (level, id) => level.plates.find((plate) => plate.id === id);

export function isHoleExposed(level, state, hole) {
  if (!hole || (hole.plateId && includes(state.fallen, hole.plateId))) return false;
  const ownerZ = hole.plateId ? plateById(level, hole.plateId).z : -1;
  return !level.plates.some((plate) => !includes(state.fallen, plate.id)
    && plate.z > ownerZ && isPointInPlate(plate, hole.x, hole.y));
}

export function createInitialState(level) {
  const state = { occupied: level.screws.map((screw) => screw.holeId).sort(), fallen: [], moves: 0, cleared: false };
  settle(level, state);
  return state;
}

function clone(state) { return { ...state, occupied: [...state.occupied], fallen: [...state.fallen] }; }
export function screwAtHole(_level, state, holeId) { return includes(state.occupied, holeId) ? { id: holeId, holeId } : null; }
export function isBlocked(level, state, screwOrHole) {
  const holeId = typeof screwOrHole === 'string' ? screwOrHole : screwOrHole.holeId;
  return !isHoleExposed(level, state, holeById(level, holeId));
}
export function removableScrews(level, state) {
  return state.occupied.filter((holeId) => isHoleExposed(level, state, holeById(level, holeId)));
}
export function legalDestinations(level, state, fromHoleId) {
  if (!includes(state.occupied, fromHoleId) || isBlocked(level, state, fromHoleId)) return [];
  // Screws are interchangeable, so a move only means something when it changes which
  // plate is fastened. Same-plate hops (and workbench-to-workbench hops) are pure
  // no-ops; the first version let them through and 15-31% of its legal moves were junk.
  const fromPlate = holeById(level, fromHoleId)?.plateId ?? null;
  return level.holes.filter((hole) => hole.id !== fromHoleId && !includes(state.occupied, hole.id)
    && (hole.plateId ?? null) !== fromPlate && isHoleExposed(level, state, hole)).map((hole) => hole.id);
}

export function settle(level, state) {
  const fallen = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const plate of level.plates) {
      if (includes(state.fallen, plate.id)) continue;
      if (!level.holes.some((hole) => hole.plateId === plate.id && includes(state.occupied, hole.id))) {
        state.fallen.push(plate.id);
        // Holes on a fallen plate leave the board; an occupied one cannot exist here.
        fallen.push(plate.id);
        changed = true;
      }
    }
  }
  state.fallen.sort();
  state.cleared = state.fallen.length === level.plates.length;
  return fallen;
}

export function applyMove(level, before, fromHoleId, destinationId) {
  if (!legalDestinations(level, before, fromHoleId).includes(destinationId)) return { state: before, accepted: false };
  const state = clone(before);
  state.occupied.splice(state.occupied.indexOf(fromHoleId), 1);
  state.occupied.push(destinationId);
  state.occupied.sort();
  state.moves += 1;
  const fallen = settle(level, state);
  return { state, accepted: true, fallen };
}

export const stateKey = (_level, state) => `${state.occupied.join(',')}|${state.fallen.join(',')}`;

export function transitions(level, state) {
  const out = [];
  for (const from of removableScrews(level, state)) for (const to of legalDestinations(level, state, from)) {
    const result = applyMove(level, state, from, to);
    if (result.accepted) out.push({ from, to, state: result.state });
  }
  return out;
}

// Exhaustive DFS. There is intentionally no node budget or metadata shortcut.
export function searchFromState(level, start) {
  const memo = new Map();
  const visiting = new Set();
  function walk(state) {
    if (state.cleared) return [];
    const key = stateKey(level, state);
    if (memo.has(key)) return memo.get(key);
    if (visiting.has(key)) return null;
    visiting.add(key);
    for (const move of transitions(level, state)) {
      const tail = walk(move.state);
      if (tail) { const solution = [[move.from, move.to], ...tail]; memo.set(key, solution); visiting.delete(key); return solution; }
    }
    visiting.delete(key); memo.set(key, null); return null;
  }
  return { solution: walk(start), memo };
}
export function search(level) { return searchFromState(level, createInitialState(level)); }

// Breadth-first, so the hint points along a genuinely shortest route. The DFS above
// finds *a* solution, which can wander for many extra moves - bad advice to give.
export function shortestSolution(level, start) {
  const from = new Map([[stateKey(level, start), null]]);
  const queue = [start];
  while (queue.length) {
    const state = queue.shift();
    if (state.cleared) {
      const path = [];
      for (let key = stateKey(level, state); from.get(key); key = from.get(key).key) path.unshift(from.get(key).move);
      return path;
    }
    for (const move of transitions(level, state)) {
      const key = stateKey(level, move.state);
      if (from.has(key)) continue;
      from.set(key, { key: stateKey(level, state), move: [move.from, move.to] });
      queue.push(move.state);
    }
  }
  return null;
}
export const findSolution = (level) => search(level).solution;
export const isSolvable = (level) => Boolean(findSolution(level));

export function reachableStates(level) {
  const states = [], seen = new Set(), queue = [createInitialState(level)];
  while (queue.length) {
    const state = queue.shift(), key = stateKey(level, state);
    if (seen.has(key)) continue;
    seen.add(key); states.push(state);
    for (const move of transitions(level, state)) queue.push(move.state);
  }
  return states;
}
