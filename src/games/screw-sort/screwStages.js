/**
 * Vertical slice for the hole-to-hole puzzle rule.
 *
 * Plate holes (brass) physically hold their plate. Workbench holes (steel)
 * are safe temporary storage. A coloured vault accepts only its matching
 * screw after its lock has been exposed.
 */

const screw = (holeId, color, symbol) => ({ holeId, color, symbol });
const goal = (screwId, point, color, symbol, unlockAfter) => ({ id: `goal-${screwId}`, screwId, point, color, symbol, unlockAfter });
const plate = (id, color, x, y, w, h, z, holes, r = 0) => ({ id, color, x, y, w, h, z, holes, r });

export const SCREW_STAGES = [
  {
    id: "first-mechanism", name: "空き穴の基本", difficulty: "beginner", parMoves: 4,
    trayCapacity: 0, hint: "二本のネジを下の作業穴へ移すと、板が外れます。",
    plates: [plate("cap", "violet", 20, 40, 60, 22, 1, ["cap-left", "cap-right"])],
    holes: { "cap-left": [35, 51], "cap-right": [65, 51], "work-left": [35, 80], "work-right": [65, 80] },
    screws: { red: screw("cap-left", "#F47A92", "●"), blue: screw("cap-right", "#75B9D8", "▲") },
    goals: { red: goal("red", [35, 18], "#F47A92", "●", ["cap"]), blue: goal("blue", [65, 18], "#75B9D8", "▲", ["cap"]) },
    solution: [{ screwId: "red", holeId: "work-left" }, { screwId: "blue", holeId: "work-right" }, { screwId: "red", holeId: "goal-red" }, { screwId: "blue", holeId: "goal-blue" }],
  },
  {
    id: "crossing-frame", name: "仮留めの連鎖", difficulty: "beginner", parMoves: 6,
    trayCapacity: 2, trayUnlockAfter: ["cap"], hint: "赤を下の空き穴へ。青を作業穴へ逃がして、上の板を外しましょう。",
    plates: [
      plate("base", "orange", 13, 61, 74, 20, 1, ["base-empty", "base-yellow"]),
      plate("cap", "violet", 22, 37, 56, 22, 2, ["cap-red", "cap-blue"]),
    ],
    holes: { "cap-red": [36, 48], "cap-blue": [64, 48], "base-empty": [22, 71], "base-yellow": [78, 71], work: [50, 87] },
    screws: { red: screw("cap-red", "#F47A92", "●"), blue: screw("cap-blue", "#75B9D8", "▲"), yellow: screw("base-yellow", "#F4C56C", "■") },
    goals: {
      red: goal("red", [30, 17], "#F47A92", "●", ["cap"]), blue: goal("blue", [50, 17], "#75B9D8", "▲", ["cap"]), yellow: goal("yellow", [70, 17], "#F4C56C", "■", ["base"]),
    },
    solution: [{ screwId: "red", holeId: "base-empty" }, { screwId: "blue", holeId: "work" }, { screwId: "red", holeId: "goal-red" }, { screwId: "blue", holeId: "goal-blue" }, { screwId: "yellow", holeId: "tray" }, { screwId: "yellow", holeId: "goal-yellow" }],
  },
  {
    id: "triple-lock", name: "穴を渡す", difficulty: "standard", parMoves: 9,
    trayCapacity: 2, trayUnlockGroups: [{ occupied: ["cap-one", "base-empty"] }, { released: ["cap"] }], hint: "赤の案内穴へ赤を、空いた上の案内穴へ黄を。そこからトレイが使えます。",
    plates: [
      plate("base", "orange", 12, 61, 76, 22, 1, ["base-empty", "base-yellow"]),
      plate("cap", "violet", 22, 36, 56, 24, 2, ["cap-one", "cap-two", "cap-three"]),
    ],
    holes: { "cap-one": [33, 48], "cap-two": [50, 48], "cap-three": [67, 48], "base-empty": [22, 72], "base-yellow": [78, 72] },
    holeRules: { "base-empty": { accepts: ["red"] }, "cap-one": { accepts: ["yellow"] } },
    screws: {
      red: screw("cap-one", "#F47A92", "●"), blue: screw("cap-two", "#75B9D8", "▲"), green: screw("cap-three", "#78D4AB", "◆"), yellow: screw("base-yellow", "#F4C56C", "■"),
    },
    goals: {
      blue: goal("blue", [24, 16], "#75B9D8", "▲", ["cap"]), yellow: goal("yellow", [43, 16], "#F4C56C", "■", ["cap"]), red: goal("red", [62, 16], "#F47A92", "●", ["base"]), green: goal("green", [81, 16], "#78D4AB", "◆", ["base"]),
    },
    solution: [
      { screwId: "red", holeId: "base-empty" }, { screwId: "yellow", holeId: "cap-one" }, { screwId: "blue", holeId: "tray" }, { screwId: "yellow", holeId: "tray" }, { screwId: "red", holeId: "cap-two" },
      { screwId: "red", holeId: "goal-red" }, { screwId: "green", holeId: "goal-green" }, { screwId: "blue", holeId: "goal-blue" }, { screwId: "yellow", holeId: "goal-yellow" },
    ],
  },
];
