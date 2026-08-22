export const BOX_COUNT = 3;
export const BOX_SIZE = 3;
export const SPARE_CAPACITY = 5;

export function isPointInPlate(plate, x, y) {
  const cx = plate.x + plate.w / 2, cy = plate.y + plate.h / 2;
  const radians = (-plate.r * Math.PI) / 180;
  const dx = x - cx, dy = y - cy, c = Math.cos(radians), s = Math.sin(radians);
  const lx = cx + dx * c - dy * s, ly = cy + dx * s + dy * c;
  return lx >= plate.x - 1e-7 && lx <= plate.x + plate.w + 1e-7 && ly >= plate.y - 1e-7 && ly <= plate.y + plate.h + 1e-7;
}

export function createInitialState(level) {
  return { removed: [], boxes: Array.from({ length: BOX_COUNT }, () => ({ color: null, screws: [] })), spare: [], fallen: [], moves: 0, gameOver: false, cleared: false, last: null };
}
const has = (items, value) => items.includes(value);
export function remainingScrews(level, state) { return level.screws.filter((s) => !has(state.removed, s.id)); }
export function containingPlates(level, state, screw) { return level.plates.filter((p) => !has(state.fallen, p.id) && isPointInPlate(p, screw.x, screw.y)); }
export function isBlocked(level, state, screw) {
  return containingPlates(level, state, screw).some((plate) => plate.z > (screw.anchorZ ?? plate.z));
}
export function removableScrews(level, state) { return remainingScrews(level, state).filter((s) => !isBlocked(level, state, s)); }
function clone(state) { return { ...state, removed: [...state.removed], boxes: state.boxes.map((b) => ({ color: b.color, screws: [...b.screws] })), spare: [...state.spare], fallen: [...state.fallen] }; }
function place(state, screw) {
  let box = state.boxes.find((b) => b.color === screw.color && b.screws.length < BOX_SIZE);
  if (!box) box = state.boxes.find((b) => b.color === null);
  if (box) { if (!box.color) box.color = screw.color; box.screws.push(screw.id); return 'box'; }
  if (state.spare.length < SPARE_CAPACITY) { state.spare.push(screw.id); return 'spare'; }
  return null;
}
function settle(level, state) {
  const resolved = [], flushed = [];
  let changed = true;
  while (changed) {
    changed = false;
    state.boxes.forEach((box, index) => { if (box.screws.length === BOX_SIZE) { resolved.push(index); box.color = null; box.screws = []; changed = true; } });
    for (let i = 0; i < state.spare.length;) {
      const screw = level.screws.find((s) => s.id === state.spare[i]);
      const box = state.boxes.find((b) => b.color === screw.color && b.screws.length < BOX_SIZE) || state.boxes.find((b) => b.color === null);
      if (!box) { i += 1; continue; }
      if (!box.color) box.color = screw.color;
      box.screws.push(screw.id); state.spare.splice(i, 1); flushed.push(screw.id); changed = true;
    }
  }
  // An anchor is the screw head visibly fastening this plate. Shared screws still release every plate they geometrically contain.
  const fallen = [];
  let falling = true;
  while (falling) {
    falling = false;
    level.plates.forEach((plate) => {
      if (has(state.fallen, plate.id)) return;
      const anchorsRemain = remainingScrews(level, state).some((s) => s.anchorZ === plate.z && isPointInPlate(plate, s.x, s.y));
      if (!anchorsRemain) { state.fallen.push(plate.id); fallen.push(plate.id); falling = true; }
    });
  }
  return { resolved, flushed, fallen };
}
export function applyTap(level, before, screwId) {
  if (before.gameOver || before.cleared) return { state: before, accepted: false };
  const screw = level.screws.find((s) => s.id === screwId);
  if (!screw || has(before.removed, screw.id) || isBlocked(level, before, screw)) return { state: before, accepted: false };
  const state = clone(before); const destination = place(state, screw);
  if (!destination) return { state: { ...before, gameOver: true, last: { failed: true, screwId } }, accepted: false, failed: true };
  state.removed.push(screw.id); state.moves += 1;
  const events = settle(level, state);
  state.cleared = state.removed.length === level.screws.length;
  state.last = { screwId, destination, ...events };
  return { state, accepted: true, destination, ...events };
}
export function stateKey(level, state) {
  const boxes = state.boxes.map((b) => `${b.color || '-'}:${b.screws.length}`).sort().join('|');
  const spare = state.spare.map((id) => level.screws.find((s) => s.id === id).color).sort().join('');
  return `${state.removed.slice().sort().join(',')}/${boxes}/${spare}`;
}
export function findSolution(level, limit = 20000) {
  const seen = new Set(); let nodes = 0;
  function visit(state) {
    if (state.cleared) return [];
    if (++nodes > limit) return null;
    const key = stateKey(level, state); if (seen.has(key)) return null; seen.add(key);
    const choices = removableScrews(level, state).sort((a, b) => a.color.localeCompare(b.color));
    for (const screw of choices) {
      const result = applyTap(level, state, screw.id); if (!result.accepted) continue;
      const tail = visit(result.state); if (tail) return [screw.id, ...tail];
    }
    return null;
  }
  return visit(createInitialState(level));
}
export function isSolvable(level, limit = 20000) { return Boolean(findSolution(level, limit)); }
