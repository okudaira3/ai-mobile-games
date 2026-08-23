// Generates the 40 shipped boards and writes them to src/games/screw-sort/levelPack.js.
// Searching seeds needs complete enumeration per candidate, which is far too slow to
// run while React renders, so it happens here and the app just reads the result.
import { writeFileSync } from 'node:fs';
import { analyseLevel, generateLevel } from '../src/games/screw-sort/levelGenerator.js';

const started = Date.now();
const levels = [];
for (let number = 1; number <= 40; number += 1) {
  const level = generateLevel(number);
  const report = analyseLevel(level, 300);
  if (!report.solvable) throw new Error(`L${number} is not solvable`);
  levels.push({ ...level, metrics: { optimal: report.optimal, states: report.states, blocked: report.blocked, initialEmpty: report.initialEmpty, randomWinRate: +(report.randomWins / report.randomRuns).toFixed(3), randomAverageMoves: report.randomAverageMoves } });
  console.log(`L${String(number).padStart(2, '0')} optimal=${report.optimal} states=${report.states} hidden=${report.blocked}/${level.screws.length} random=${Math.round(report.randomWins / report.randomRuns * 100)}% avg=${report.randomAverageMoves}`);
}

const body = `// GENERATED FILE - do not edit by hand.
// Run \`npm run build:screw-levels\` to regenerate.
export const LEVEL_PACK = ${JSON.stringify(levels)};
export const LEVEL_COUNT = LEVEL_PACK.length;
export const getLevel = (number) => LEVEL_PACK[Math.min(LEVEL_COUNT, Math.max(1, Number(number) || 1)) - 1];
`;
writeFileSync(new URL('../src/games/screw-sort/levelPack.js', import.meta.url), body);
console.log(`\nWrote ${levels.length} levels in ${((Date.now() - started) / 1000).toFixed(1)}s`);
