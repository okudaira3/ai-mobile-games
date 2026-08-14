export function isPointOnPlate(plate, x, y) {
  const originX = plate.x + (plate.x + plate.w / 2 < 50 ? 0 : plate.w);
  const originY = plate.y + plate.h;
  const radians = (plate.r * Math.PI) / 180;
  const dx = x - originX;
  const dy = y - originY;
  const localX = originX + Math.cos(radians) * dx + Math.sin(radians) * dy;
  const localY = originY - Math.sin(radians) * dx + Math.cos(radians) * dy;
  return localX >= plate.x && localX <= plate.x + plate.w && localY >= plate.y && localY <= plate.y + plate.h;
}

export function createHoles(stage) {
  return { ...stage.screws, ...Object.fromEntries(stage.parkingHoles.map((point, index) => [`park-${index}`, point])) };
}

export function plateFor(stage, screwId) {
  return stage.plates.find((plate) => plate.screws.includes(screwId));
}

export function isVisible(stage, holes, released, holeId, zIndex) {
  const [x, y] = holes[holeId];
  return !stage.plates.some((plate) => plate.z * 10 > zIndex && !released.has(plate.id) && isPointOnPlate(plate, x, y));
}

export function legalMoves(stage, placements, released) {
  const holes = createHoles(stage);
  const screwIds = Object.keys(stage.screws);
  const occupied = new Set(screwIds.map((id) => placements[id] || id));
  const moves = [];
  for (const screwId of screwIds) {
    const plate = plateFor(stage, screwId);
    const sourceId = placements[screwId] || screwId;
    const screwZ = sourceId === screwId && !released.has(plate.id) ? plate.z * 10 + 5 : 55;
    if (!isVisible(stage, holes, released, sourceId, screwZ)) continue;
    for (const holeId of Object.keys(holes)) {
      if (occupied.has(holeId)) continue;
      const owner = stage.plates.find((candidate) => candidate.screws.includes(holeId));
      const holeZ = owner && !released.has(owner.id) ? owner.z * 10 + 4 : 54;
      if (isVisible(stage, holes, released, holeId, holeZ)) moves.push({ screwId, holeId });
    }
  }
  return moves;
}

export function applyMove(stage, placements, released, move) {
  const plate = plateFor(stage, move.screwId);
  const nextPlacements = { ...placements, [move.screwId]: move.holeId };
  const nextReleased = new Set(released);
  if (!released.has(plate.id) && plate.screws.every((id) => (nextPlacements[id] || id) !== id)) nextReleased.add(plate.id);
  return { placements: nextPlacements, released: nextReleased, releasedPlateId: nextReleased.size > released.size ? plate.id : null };
}

export function findHint(stage, placements, released) {
  return legalMoves(stage, placements, released)[0] ?? null;
}

export function solveStage(stage, nodeLimit = 1000000) {
  const ids = Object.keys(stage.screws);
  const queue = [{ placements: {}, released: new Set(), moves: [] }];
  const seen = new Set();
  for (let cursor = 0; cursor < queue.length && cursor < nodeLimit; cursor++) {
    const state = queue[cursor];
    if (state.released.size === stage.plates.length) return state.moves;
    const key = `${ids.map((id) => state.placements[id] || id).join(",")}/${[...state.released].sort().join(",")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const move of legalMoves(stage, state.placements, state.released)) {
      if (state.placements[move.screwId]) continue;
      const next = applyMove(stage, state.placements, state.released, move);
      queue.push({ placements: next.placements, released: next.released, moves: [...state.moves, move] });
    }
  }
  return null;
}
