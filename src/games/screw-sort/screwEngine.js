export const TRAY = "tray";

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

export function createLocations(stage) {
  return { ...stage.holes, ...Object.fromEntries(Object.values(stage.goals).map((goal) => [goal.id, goal.point])) };
}

export function plateForHole(stage, holeId) {
  return stage.plates.find((plate) => plate.holes.includes(holeId));
}

export function goalForHole(stage, holeId) {
  return Object.entries(stage.goals).find(([, goal]) => goal.id === holeId)?.[1] ?? null;
}

export function initialPlacement(stage, screwId) {
  return stage.screws[screwId].holeId;
}

export function placementOf(stage, placements, screwId) {
  return placements[screwId] ?? initialPlacement(stage, screwId);
}

export function occupiedHoles(stage, placements) {
  return new Set(Object.keys(stage.screws).map((id) => placementOf(stage, placements, id)).filter((id) => id !== TRAY));
}

export function trayScrews(stage, placements) {
  return Object.keys(stage.screws).filter((id) => placementOf(stage, placements, id) === TRAY);
}

export function isGoalUnlocked(stage, released, goal) {
  return goal.unlockAfter.every((plateId) => released.has(plateId));
}

export function isTrayUnlocked(stage, placements, released) {
  const occupied = occupiedHoles(stage, placements);
  const groups = stage.trayUnlockGroups ?? [{ released: stage.trayUnlockAfter ?? [], occupied: stage.trayUnlockOccupied ?? [] }];
  return groups.some((group) => (group.released ?? []).every((plateId) => released.has(plateId))
    && (group.occupied ?? []).every((holeId) => occupied.has(holeId)));
}

export function isComplete(stage, placements, released) {
  return released.size === stage.plates.length && Object.entries(stage.goals).every(([screwId, goal]) => placementOf(stage, placements, screwId) === goal.id);
}

export function isVisible(stage, locations, released, holeId, zIndex) {
  const point = locations[holeId];
  if (!point) return false;
  const [x, y] = point;
  return !stage.plates.some((plate) => plate.z * 10 > zIndex && !released.has(plate.id) && isPointOnPlate(plate, x, y));
}

export function holeZ(stage, released, holeId) {
  const plate = plateForHole(stage, holeId);
  return plate && !released.has(plate.id) ? plate.z * 10 + 4 : 54;
}

export function screwZ(stage, placements, released, screwId) {
  const holeId = placementOf(stage, placements, screwId);
  if (holeId === TRAY) return -1;
  const goal = goalForHole(stage, holeId);
  return goal ? 75 : holeZ(stage, released, holeId) + 1;
}

export function isUsableHole(stage, released, holeId) {
  const plate = plateForHole(stage, holeId);
  return !plate || !released.has(plate.id);
}

export function legalMoves(stage, placements, released) {
  const locations = createLocations(stage);
  const occupied = occupiedHoles(stage, placements);
  const tray = trayScrews(stage, placements);
  const moves = [];

  for (const screwId of Object.keys(stage.screws)) {
    const sourceId = placementOf(stage, placements, screwId);
    const sourceGoal = goalForHole(stage, sourceId);
    if (sourceGoal) continue;
    const zIndex = screwZ(stage, placements, released, screwId);
    if (sourceId !== TRAY && !isVisible(stage, locations, released, sourceId, zIndex)) continue;

    if (sourceId !== TRAY && tray.length < stage.trayCapacity && isTrayUnlocked(stage, placements, released)) moves.push({ screwId, holeId: TRAY });
    for (const holeId of Object.keys(locations)) {
      const goal = goalForHole(stage, holeId);
      if (occupied.has(holeId) || !isUsableHole(stage, released, holeId)) continue;
      const allowedScrews = stage.holeRules?.[holeId]?.accepts;
      if (allowedScrews && !allowedScrews.includes(screwId)) continue;
      if (goal && (!isGoalUnlocked(stage, released, goal) || goal.screwId !== screwId)) continue;
      if (isVisible(stage, locations, released, holeId, holeZ(stage, released, holeId))) moves.push({ screwId, holeId });
    }
  }
  return moves;
}

export function applyMove(stage, placements, released, move) {
  const nextPlacements = { ...placements, [move.screwId]: move.holeId };
  const nextReleased = new Set(released);
  const occupied = occupiedHoles(stage, nextPlacements);
  const releasedPlateIds = [];

  for (const plate of stage.plates) {
    if (nextReleased.has(plate.id) || plate.holes.some((holeId) => occupied.has(holeId))) continue;
    nextReleased.add(plate.id);
    releasedPlateIds.push(plate.id);
  }
  return { placements: nextPlacements, released: nextReleased, releasedPlateIds };
}

export function solveStage(stage, nodeLimit = 250000, initialState = {}) {
  const ids = Object.keys(stage.screws);
  const queue = [{ placements: initialState.placements ?? {}, released: new Set(initialState.released ?? []), moves: [] }];
  const seen = new Set();
  for (let cursor = 0; cursor < queue.length && cursor < nodeLimit; cursor++) {
    const state = queue[cursor];
    if (isComplete(stage, state.placements, state.released)) return state.moves;
    const key = `${ids.map((id) => placementOf(stage, state.placements, id)).join(",")}/${[...state.released].sort().join(",")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const move of legalMoves(stage, state.placements, state.released)) {
      const next = applyMove(stage, state.placements, state.released, move);
      queue.push({ placements: next.placements, released: next.released, moves: [...state.moves, move] });
    }
  }
  return null;
}

export function findHint(stage, placements, released) {
  return solveStage(stage, 250000, { placements, released })?.[0] ?? null;
}
