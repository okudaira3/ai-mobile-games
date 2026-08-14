/**
 * Authored screw-release stage data.
 *
 * @typedef {Object} ScrewStage
 * @property {string} id Stable save/progression identifier. Never reuse an id.
 * @property {string} name Player-facing stage name.
 * @property {"beginner" | "standard" | "advanced"} difficulty Intended difficulty band.
 * @property {number} parMoves Minimum moves for the authored solution. This is
 * the baseline for star scoring, not a limit that blocks completion.
 * @property {string} [hint] Optional concise rule reminder for the stage.
 * @property {[number, number][]} parkingHoles Empty holes available at start,
 * in board percentage coordinates.
 * @property {Array<{id: string, color: string, x: number, y: number, w: number, h: number, r: number, z: number, screws: string[]}>} plates
 * Plates are rendered from low to high `z`; every screw id must belong to
 * exactly one plate.
 * @property {Record<string, [number, number]>} screws Original screw-hole
 * positions in board percentage coordinates.
 */

/** @type {ScrewStage[]} */
export const SCREW_STAGES = [
  {
    id: "first-mechanism",
    name: "はじめの機構",
    difficulty: "beginner",
    parMoves: 8,
    hint: "上の板から、空いた元の穴を使って外していきましょう。",
    parkingHoles: [[8, 14], [92, 86]],
    plates: [
      { id: "violet-top", color: "violet", x: 14, y: 15, w: 68, h: 22, r: 0, z: 2, screws: ["a", "b"] },
      { id: "mint-arm", color: "wood-mint", x: 20, y: 20, w: 39, h: 60, r: -25, z: 3, screws: ["c", "d"] },
      { id: "violet-right", color: "violet", x: 48, y: 40, w: 41, h: 22, r: -2, z: 2, screws: ["e", "f"] },
      { id: "violet-bottom", color: "violet", x: 39, y: 66, w: 47, h: 22, r: 2, z: 1, screws: ["g", "h"] },
    ],
    screws: {
      a: [28, 26], b: [68, 27], c: [40, 35], d: [46, 57], e: [58, 51], f: [80, 50], g: [40, 78], h: [78, 76],
    },
  },
  {
    id: "crossing-frame",
    name: "交差するフレーム",
    difficulty: "standard",
    parMoves: 8,
    hint: "重なりの順番を読み、見えているネジから外しましょう。",
    parkingHoles: [[8, 14], [92, 86]],
    plates: [
      { id: "base", color: "orange", x: 19, y: 67, w: 65, h: 16, r: 0, z: 1, screws: ["a", "b"] },
      { id: "left", color: "violet", x: 18, y: 31, w: 22, h: 49, r: 0, z: 2, screws: ["c", "d"] },
      { id: "top", color: "wood-mint", x: 31, y: 19, w: 51, h: 16, r: 0, z: 3, screws: ["e", "f"] },
      { id: "diagonal", color: "blue", x: 45, y: 30, w: 25, h: 58, r: 32, z: 4, screws: ["g", "h"] },
    ],
    screws: {
      a: [31, 75], b: [72, 75], c: [29, 43], d: [29, 60], e: [42, 27], f: [72, 27], g: [85, 38], h: [57, 77],
    },
  },
  {
    id: "triple-lock",
    name: "三重ロック",
    difficulty: "advanced",
    parMoves: 10,
    hint: "空き穴はひとつ。外した穴を次のネジへつなげなさい。",
    parkingHoles: [[8, 14]],
    plates: [
      { id: "base", color: "orange", x: 17, y: 68, w: 68, h: 16, r: 0, z: 1, screws: ["a", "b"] },
      { id: "upright", color: "violet", x: 66, y: 24, w: 18, h: 58, r: 0, z: 2, screws: ["c", "d"] },
      { id: "cross", color: "blue", x: 22, y: 43, w: 58, h: 16, r: 0, z: 3, screws: ["e", "f"] },
      { id: "arm", color: "wood-mint", x: 29, y: 21, w: 24, h: 61, r: -26, z: 4, screws: ["g", "h"] },
      { id: "cap", color: "violet", x: 54, y: 25, w: 27, h: 16, r: 0, z: 5, screws: ["i", "j"] },
    ],
    screws: {
      a: [30, 76], b: [73, 76], c: [80, 47], d: [75, 62], e: [33, 51], f: [69, 51], g: [9, 32], h: [45, 61], i: [62, 33], j: [75, 33],
    },
  },
  {
    id: "two-step-release", name: "二段の解放", difficulty: "beginner", parMoves: 4,
    hint: "上の板を外すと、下の穴が使えます。", parkingHoles: [[8, 14]],
    plates: [
      { id: "base", color: "orange", x: 25, y: 60, w: 50, h: 18, r: 0, z: 1, screws: ["a", "b"] },
      { id: "top", color: "violet", x: 31, y: 34, w: 38, h: 18, r: 0, z: 2, screws: ["c", "d"] },
    ], screws: { a: [34, 69], b: [66, 69], c: [39, 43], d: [61, 43] },
  },
  {
    id: "three-link-relay", name: "穴のリレー", difficulty: "beginner", parMoves: 6,
    hint: "外した穴を、次のネジの逃げ道に。", parkingHoles: [[8, 14]],
    plates: [
      { id: "base", color: "orange", x: 18, y: 69, w: 64, h: 15, r: 0, z: 1, screws: ["a", "b"] },
      { id: "mid", color: "wood-mint", x: 39, y: 43, w: 44, h: 15, r: 0, z: 2, screws: ["c", "d"] },
      { id: "cap", color: "blue", x: 26, y: 20, w: 31, h: 15, r: 0, z: 3, screws: ["e", "f"] },
    ], screws: { a: [29, 76], b: [72, 76], c: [47, 50], d: [75, 50], e: [34, 27], f: [50, 27] },
  },
  {
    id: "tilted-lesson", name: "斜めのレッスン", difficulty: "beginner", parMoves: 6,
    hint: "斜めの板も、いちばん上から。", parkingHoles: [[8, 14]],
    plates: [
      { id: "base", color: "orange", x: 24, y: 69, w: 57, h: 15, r: 0, z: 1, screws: ["a", "b"] },
      { id: "rail", color: "violet", x: 25, y: 39, w: 21, h: 46, r: -18, z: 2, screws: ["c", "d"] },
      { id: "top", color: "blue", x: 49, y: 26, w: 27, h: 45, r: 24, z: 3, screws: ["e", "f"] },
    ], screws: { a: [34, 76], b: [71, 76], c: [34, 48], d: [39, 69], e: [64, 36], f: [67, 58] },
  },
  {
    id: "bridge-choice", name: "橋の順番", difficulty: "standard", parMoves: 6,
    hint: "端のネジから道を開けなさい。", parkingHoles: [[8, 14]],
    plates: [
      { id: "base", color: "orange", x: 17, y: 69, w: 66, h: 15, r: 0, z: 1, screws: ["a", "b"] },
      { id: "left", color: "violet", x: 20, y: 31, w: 22, h: 49, r: 0, z: 2, screws: ["c", "d"] },
      { id: "bridge", color: "wood-mint", x: 32, y: 42, w: 52, h: 15, r: 0, z: 3, screws: ["e", "f"] },
    ], screws: { a: [27, 76], b: [73, 76], c: [30, 43], d: [30, 67], e: [42, 49], f: [73, 49] },
  },
  {
    id: "windmill", name: "風車の軸", difficulty: "standard", parMoves: 8,
    hint: "いちばん手前の羽根を探して。", parkingHoles: [[8, 14]],
    plates: [
      { id: "base", color: "orange", x: 22, y: 69, w: 58, h: 15, r: 0, z: 1, screws: ["a", "b"] },
      { id: "left", color: "violet", x: 22, y: 37, w: 20, h: 42, r: -18, z: 2, screws: ["c", "d"] },
      { id: "right", color: "wood-mint", x: 57, y: 37, w: 20, h: 42, r: 0, z: 3, screws: ["e", "f"] },
      { id: "axis", color: "blue", x: 39, y: 41, w: 22, h: 18, r: 0, z: 4, screws: ["g", "h"] },
    ], screws: { a: [31, 76], b: [71, 76], c: [31, 48], d: [39, 67], e: [66, 48], f: [58, 67], g: [45, 50], h: [55, 50] },
  },
  {
    id: "single-slot", name: "一本の空き穴", difficulty: "standard", parMoves: 8,
    hint: "空き穴は一つ。戻る道を残しなさい。", parkingHoles: [[8, 14]],
    plates: [
      { id: "base", color: "orange", x: 18, y: 69, w: 64, h: 15, r: 0, z: 1, screws: ["a", "b"] },
      { id: "left", color: "violet", x: 19, y: 40, w: 20, h: 36, r: 0, z: 2, screws: ["c", "d"] },
      { id: "cross", color: "blue", x: 34, y: 45, w: 47, h: 15, r: 0, z: 3, screws: ["e", "f"] },
      { id: "cap", color: "wood-mint", x: 58, y: 24, w: 24, h: 16, r: 0, z: 4, screws: ["g", "h"] },
    ], screws: { a: [28, 76], b: [73, 76], c: [29, 49], d: [29, 68], e: [42, 52], f: [73, 52], g: [64, 32], h: [76, 32] },
  },
  {
    id: "offset-sandwich", name: "ずれた三層", difficulty: "standard", parMoves: 8,
    hint: "重なりの中心ではなく、見えている端を見る。", parkingHoles: [[8, 14]],
    plates: [
      { id: "base", color: "orange", x: 17, y: 68, w: 67, h: 16, r: 0, z: 1, screws: ["a", "b"] },
      { id: "low", color: "violet", x: 28, y: 48, w: 48, h: 16, r: -8, z: 2, screws: ["c", "d"] },
      { id: "high", color: "wood-mint", x: 39, y: 28, w: 39, h: 16, r: 9, z: 3, screws: ["e", "f"] },
      { id: "key", color: "blue", x: 22, y: 26, w: 20, h: 43, r: -21, z: 4, screws: ["g", "h"] },
    ], screws: { a: [28, 76], b: [74, 76], c: [36, 56], d: [66, 56], e: [47, 36], f: [70, 36], g: [28, 37], h: [39, 61] },
  },
  {
    id: "zigzag-gate", name: "ジグザグの門", difficulty: "advanced", parMoves: 10,
    hint: "上から順に、折れ道をほどきなさい。", parkingHoles: [[8, 14]],
    plates: [
      { id: "base", color: "orange", x: 17, y: 70, w: 67, h: 14, r: 0, z: 1, screws: ["a", "b"] }, { id: "left", color: "violet", x: 19, y: 44, w: 22, h: 35, r: 0, z: 2, screws: ["c", "d"] }, { id: "mid", color: "wood-mint", x: 37, y: 48, w: 35, h: 14, r: 0, z: 3, screws: ["e", "f"] }, { id: "right", color: "blue", x: 64, y: 27, w: 20, h: 49, r: 0, z: 4, screws: ["g", "h"] }, { id: "cap", color: "violet", x: 39, y: 25, w: 33, h: 14, r: 0, z: 5, screws: ["i", "j"] },
    ], screws: { a: [27, 77], b: [74, 77], c: [29, 54], d: [29, 70], e: [44, 55], f: [65, 55], g: [74, 39], h: [74, 65], i: [46, 32], j: [65, 32] },
  },
  {
    id: "crown-lock", name: "王冠ロック", difficulty: "advanced", parMoves: 10,
    hint: "王冠の先端から、土台へ。", parkingHoles: [[8, 14]],
    plates: [
      { id: "base", color: "orange", x: 18, y: 70, w: 64, h: 14, r: 0, z: 1, screws: ["a", "b"] }, { id: "left", color: "violet", x: 22, y: 41, w: 20, h: 38, r: -18, z: 2, screws: ["c", "d"] }, { id: "right", color: "wood-mint", x: 58, y: 41, w: 20, h: 38, r: 18, z: 3, screws: ["e", "f"] }, { id: "crown", color: "blue", x: 32, y: 27, w: 38, h: 14, r: 0, z: 4, screws: ["g", "h"] }, { id: "gem", color: "violet", x: 45, y: 14, w: 20, h: 17, r: 0, z: 5, screws: ["i", "j"] },
    ], screws: { a: [27, 77], b: [74, 77], c: [31, 51], d: [39, 70], e: [69, 51], f: [61, 70], g: [40, 34], h: [64, 34], i: [51, 22], j: [59, 22] },
  },
  {
    id: "weaving-rails", name: "編み込むレール", difficulty: "advanced", parMoves: 10,
    hint: "交差点では、手前のレールが先。", parkingHoles: [[8, 14]],
    plates: [
      { id: "base", color: "orange", x: 19, y: 70, w: 62, h: 14, r: 0, z: 1, screws: ["a", "b"] }, { id: "diag-left", color: "violet", x: 23, y: 32, w: 21, h: 49, r: 0, z: 2, screws: ["c", "d"] }, { id: "mid", color: "wood-mint", x: 35, y: 48, w: 45, h: 14, r: 0, z: 3, screws: ["e", "f"] }, { id: "diag-right", color: "blue", x: 57, y: 27, w: 21, h: 53, r: 0, z: 4, screws: ["g", "h"] }, { id: "top", color: "violet", x: 35, y: 20, w: 34, h: 14, r: 0, z: 5, screws: ["i", "j"] },
    ], screws: { a: [28, 77], b: [72, 77], c: [30, 44], d: [39, 68], e: [43, 55], f: [71, 55], g: [66, 39], h: [75, 66], i: [43, 27], j: [62, 27] },
  },
  {
    id: "spiral-release", name: "渦の解放", difficulty: "advanced", parMoves: 10,
    hint: "外側からではなく、中心のふたから。", parkingHoles: [[8, 14]],
    plates: [
      { id: "base", color: "orange", x: 18, y: 70, w: 64, h: 14, r: 0, z: 1, screws: ["a", "b"] }, { id: "low", color: "violet", x: 20, y: 48, w: 43, h: 14, r: 0, z: 2, screws: ["c", "d"] }, { id: "side", color: "wood-mint", x: 61, y: 35, w: 18, h: 43, r: 0, z: 3, screws: ["e", "f"] }, { id: "top", color: "blue", x: 36, y: 27, w: 40, h: 14, r: 0, z: 4, screws: ["g", "h"] }, { id: "core", color: "violet", x: 46, y: 40, w: 18, h: 16, r: 0, z: 5, screws: ["i", "j"] },
    ], screws: { a: [27, 77], b: [74, 77], c: [28, 55], d: [56, 55], e: [70, 45], f: [70, 68], g: [44, 34], h: [68, 34], i: [51, 48], j: [59, 48] },
  },
  {
    id: "six-way-switch", name: "六方向スイッチ", difficulty: "advanced", parMoves: 12,
    hint: "最上層の二本から、交差をほどくのです。", parkingHoles: [[8, 14]],
    plates: [
      { id: "base", color: "orange", x: 14, y: 63, w: 72, h: 21, r: 0, z: 1, screws: ["a", "b"] }, { id: "left", color: "violet", x: 15, y: 51, w: 70, h: 24, r: 0, z: 2, screws: ["c", "d"] }, { id: "right", color: "wood-mint", x: 16, y: 39, w: 68, h: 24, r: 0, z: 3, screws: ["e", "f"] }, { id: "cross", color: "blue", x: 17, y: 27, w: 66, h: 24, r: 0, z: 4, screws: ["g", "h"] }, { id: "diagonal", color: "violet", x: 18, y: 15, w: 64, h: 24, r: 0, z: 5, screws: ["i", "j"] }, { id: "cap", color: "wood-mint", x: 19, y: 5, w: 62, h: 22, r: 0, z: 6, screws: ["k", "l"] },
    ], screws: { a: [24, 75], b: [76, 75], c: [24, 63], d: [76, 63], e: [24, 51], f: [76, 51], g: [24, 39], h: [76, 39], i: [24, 27], j: [76, 27], k: [24, 15], l: [76, 15] },
  },
  {
    id: "royal-seal", name: "王家の封印", difficulty: "advanced", parMoves: 12,
    hint: "最前面の封印を解けば、すべてが動き出す。", parkingHoles: [[8, 14]],
    plates: [
      { id: "base", color: "orange", x: 14, y: 63, w: 72, h: 21, r: 0, z: 1, screws: ["a", "b"] }, { id: "left", color: "violet", x: 15, y: 51, w: 70, h: 24, r: 0, z: 2, screws: ["c", "d"] }, { id: "right", color: "wood-mint", x: 16, y: 39, w: 68, h: 24, r: 0, z: 3, screws: ["e", "f"] }, { id: "rail", color: "blue", x: 17, y: 27, w: 66, h: 24, r: 0, z: 4, screws: ["g", "h"] }, { id: "crown", color: "violet", x: 18, y: 15, w: 64, h: 24, r: 0, z: 5, screws: ["i", "j"] }, { id: "seal", color: "wood-mint", x: 19, y: 5, w: 62, h: 22, r: 0, z: 6, screws: ["k", "l"] },
    ], screws: { a: [24, 75], b: [76, 75], c: [24, 63], d: [76, 63], e: [24, 51], f: [76, 51], g: [24, 39], h: [76, 39], i: [24, 27], j: [76, 27], k: [24, 15], l: [76, 15] },
  },
];

/*
 * Add future stages only after a solver has verified at least one solution and
 * its `parMoves`. Do not pad progression with copied layouts: every authored
 * stage should introduce one deliberate idea or combination of prior ideas.
 */
