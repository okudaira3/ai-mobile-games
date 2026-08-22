import { createInitialState, isBlocked, isSolvable } from './screwEngine.js';

const COLORS = ['#f05d5e', '#f3a712', '#2bb5a7', '#4e7ddb', '#9a67d8', '#e76f9f'];
function mulberry32(seed) { return () => { let t = seed += 0x6d2b79f5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const profile = (n) => n <= 3 ? [3, 4, 2, 15] : n <= 8 ? [4, 6, 3, 21] : n <= 15 ? [5, 8, 3, 27] : [6, 10, 4, 33];
export function generateLevel(levelNumber) {
  const [colorCount, plateCount, layers, total] = profile(levelNumber);
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const random = mulberry32(levelNumber * 7919 + attempt * 104729);
    const plates = Array.from({ length: plateCount }, (_, i) => ({ id: `p${i}`, color: COLORS[(i + levelNumber) % COLORS.length], x: 8 + (i % 3) * 6 + random() * 4, y: 8 + (i % 2) * 8 + random() * 5, w: 76 - (i % 3) * 8, h: 76 - (i % 2) * 9, r: Math.round((random() - .5) * 18), z: i % layers }));
    const groups = total / 3, baseGroups = Math.floor(groups / colorCount), extraGroups = groups % colorCount; const screws = [];
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex += 1) for (let k = 0; k < (baseGroups + (colorIndex < extraGroups ? 1 : 0)) * 3; k += 1) {
      const anchorZ = (colorIndex + k + levelNumber) % layers;
      const candidates = plates.filter((p) => p.z === anchorZ); const plate = candidates[(k + colorIndex) % candidates.length];
      const angle = (k * 2.399 + colorIndex * .7 + random() * .3); const radius = 10 + (k % 3) * 8;
      screws.push({ id: `s${screws.length}`, x: Math.max(14, Math.min(86, plate.x + plate.w / 2 + Math.cos(angle) * radius)), y: Math.max(14, Math.min(86, plate.y + plate.h / 2 + Math.sin(angle) * radius)), color: COLORS[colorIndex], anchorZ });
    }
    const level = { id: levelNumber, plates, screws };
    const initial = createInitialState(level), blocked = screws.filter((s) => isBlocked(level, initial, s)).length;
    if (blocked / screws.length >= .3 && isSolvable(level)) return level;
  }
  throw new Error(`Could not generate level ${levelNumber}`);
}
