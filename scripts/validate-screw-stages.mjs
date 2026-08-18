import { SCREW_STAGES } from "../src/games/screw-sort/screwStages.js";
import { applyMove, createLocations, isComplete, isPointOnPlate, legalMoves, solveStage } from "../src/games/screw-sort/screwEngine.js";

if (SCREW_STAGES.length !== 3) throw new Error(`Expected the 3-stage vertical slice, got ${SCREW_STAGES.length}.`);

for (const stage of SCREW_STAGES) {
  const locations = createLocations(stage);
  for (const plate of stage.plates) {
    for (const holeId of plate.holes) {
      if (!isPointOnPlate(plate, ...locations[holeId])) throw new Error(`${stage.id}: ${holeId} is outside ${plate.id}.`);
    }
  }

  let placements = {};
  let released = new Set();
  for (const move of stage.solution) {
    if (!legalMoves(stage, placements, released).some((candidate) => candidate.screwId === move.screwId && candidate.holeId === move.holeId)) throw new Error(`${stage.id}: authored move is illegal (${move.screwId} → ${move.holeId}).`);
    ({ placements, released } = applyMove(stage, placements, released, move));
  }
  if (!isComplete(stage, placements, released)) throw new Error(`${stage.id}: authored route does not complete the stage.`);
  if (stage.solution.length !== stage.parMoves) throw new Error(`${stage.id}: par move count is incorrect.`);
  if (!solveStage(stage, 250000)) throw new Error(`${stage.id}: solver found no solution.`);
  console.log(`PASS ${stage.id} (${stage.solution.length} moves)`);
}
