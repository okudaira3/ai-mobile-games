import { createInitialState, isBlocked, isPointInPlate, isSolvable } from './screwEngine.js';

const SCREW_COLORS = ['#f05d5e', '#f3a712', '#2bb5a7', '#4e7ddb', '#9a67d8', '#e76f9f'];
const PLATE_COLORS = ['#9a7654', '#65727a', '#5d7d7a', '#8a715e', '#66748b', '#7b7564'];
const MIN_SAME_LAYER_DISTANCE = 13;
function mulberry32(seed) { return () => { let t = seed += 0x6d2b79f5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function profile(n) {
  if (n <= 3) return [3, 4, 2, 15];
  if (n <= 8) return [4, 6, 3, 21];
  if (n <= 15) return [5, 8, 3, 27];
  const rise = Math.min(4, Math.floor((n - 16) / 11));
  return [6, Math.min(14, 10 + Math.floor((n - 16) / 9)), Math.min(6, 4 + Math.floor((n - 16) / 18)), 33 + rise * 3];
}
function rotatedInsideBoard(plate) {
  const cx = plate.x + plate.w / 2, cy = plate.y + plate.h / 2, rad = plate.r * Math.PI / 180;
  return [[-1,-1],[1,-1],[1,1],[-1,1]].every(([sx, sy]) => {
    const dx = sx * plate.w / 2, dy = sy * plate.h / 2;
    const x = cx + dx * Math.cos(rad) - dy * Math.sin(rad), y = cy + dx * Math.sin(rad) + dy * Math.cos(rad);
    return x >= 0 && x <= 100 && y >= 0 && y <= 100;
  });
}
function makePlates(count, layers, random, levelNumber) {
  return Array.from({ length: count }, (_, i) => {
    for (let trial = 0; trial < 80; trial += 1) {
      const w = 22 + random() * 48, h = 22 + random() * 48, r = Math.round((random() - .5) * 50);
      // A broad but shared central band guarantees mechanically meaningful overlap without concentric copies.
      const cx = 22 + random() * 56, cy = 22 + random() * 56;
      const plate = { id: `p${i}`, color: PLATE_COLORS[(i + levelNumber) % PLATE_COLORS.length], x: cx - w / 2, y: cy - h / 2, w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10, r, z: i % layers };
      if (rotatedInsideBoard(plate)) return plate;
    }
    return { id: `p${i}`, color: PLATE_COLORS[(i + levelNumber) % PLATE_COLORS.length], x: 25, y: 30, w: 50, h: 40, r: 0, z: i % layers };
  });
}
function sampleOnPlate(plate, random) {
  const lx = plate.x + 4 + random() * Math.max(1, plate.w - 8), ly = plate.y + 4 + random() * Math.max(1, plate.h - 8);
  const cx = plate.x + plate.w / 2, cy = plate.y + plate.h / 2, rad = plate.r * Math.PI / 180, dx = lx - cx, dy = ly - cy;
  return { x: cx + dx * Math.cos(rad) - dy * Math.sin(rad), y: cy + dx * Math.sin(rad) + dy * Math.cos(rad) };
}
function placeScrew(plates, screws, anchorZ, random) {
  const sources = plates.filter((p) => p.z === anchorZ);
  for (let trial = 0; trial < 140; trial += 1) {
    const source = sources[Math.floor(random() * sources.length)], point = sampleOnPlate(source, random);
    const covered = plates.some((p) => p.z > anchorZ && isPointInPlate(p, point.x, point.y));
    const needsCover = anchorZ < Math.max(...plates.map((p) => p.z)) && trial < 95;
    const farEnough = screws.filter((s) => s.anchorZ === anchorZ).every((s) => Math.hypot(s.x - point.x, s.y - point.y) >= MIN_SAME_LAYER_DISTANCE);
    if ((!needsCover || covered) && farEnough) return point;
  }
  return null;
}
export function generateLevel(levelNumber) {
  const [colorCount, plateCount, layers, total] = profile(levelNumber);
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const random = mulberry32(levelNumber * 7919 + attempt * 104729), plates = makePlates(plateCount, layers, random, levelNumber), screws = [];
    const groups = total / 3, baseGroups = Math.floor(groups / colorCount), extraGroups = groups % colorCount;
    let failed = false;
    for (let colorIndex = 0; colorIndex < colorCount && !failed; colorIndex += 1) for (let k = 0; k < (baseGroups + (colorIndex < extraGroups ? 1 : 0)) * 3; k += 1) {
      const anchorZ = screws.length % layers, point = placeScrew(plates, screws, anchorZ, random);
      if (!point) { failed = true; break; }
      screws.push({ id: `s${screws.length}`, ...point, color: SCREW_COLORS[colorIndex], anchorZ });
    }
    if (failed) continue;
    const level = { id: levelNumber, plates, screws }, initial = createInitialState(level), blocked = screws.filter((s) => isBlocked(level, initial, s)).length;
    if (blocked / screws.length >= .3 && isSolvable(level)) return level;
  }
  throw new Error(`Could not generate level ${levelNumber}`);
}
