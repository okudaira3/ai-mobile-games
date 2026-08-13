import { useEffect, useMemo, useRef, useState } from "react";

const SAVE_KEY = "screw-puzzle:save:v4";

const LEVELS = [
  {
    name: "はじめの機構",
    parkingHoles: [[8, 14], [92, 86]],
    plates: [
      { id: "violet-top", color: "violet", x: 14, y: 15, w: 68, h: 22, r: 0, z: 2, screws: ["a", "b"] },
      { id: "mint-arm", color: "wood-mint", x: 20, y: 20, w: 39, h: 60, r: -25, z: 3, screws: ["c", "d"] },
      { id: "violet-right", color: "violet", x: 48, y: 40, w: 41, h: 22, r: -2, z: 2, screws: ["e", "f"] },
      { id: "violet-bottom", color: "violet", x: 39, y: 66, w: 47, h: 22, r: 2, z: 1, screws: ["g", "h"] },
    ],
    screws: {
      a: [28, 26], b: [68, 27], c: [28, 28], d: [53, 70], e: [58, 51], f: [80, 50], g: [50, 77], h: [78, 76],
    },
  },
  {
    name: "交差するフレーム",
    parkingHoles: [[8, 14], [92, 86]],
    plates: [
      { id: "base", color: "orange", x: 19, y: 67, w: 65, h: 16, r: 0, z: 1, screws: ["a", "b"] },
      { id: "left", color: "violet", x: 18, y: 31, w: 22, h: 49, r: 0, z: 2, screws: ["c", "d"] },
      { id: "top", color: "wood-mint", x: 31, y: 19, w: 51, h: 16, r: 0, z: 3, screws: ["e", "f"] },
      { id: "diagonal", color: "blue", x: 45, y: 30, w: 25, h: 58, r: 32, z: 4, screws: ["g", "h"] },
    ],
    screws: {
      a: [31, 75], b: [72, 75], c: [29, 43], d: [29, 69], e: [42, 27], f: [72, 27], g: [56, 38], h: [57, 77],
    },
  },
  {
    name: "三重ロック",
    parkingHoles: [[8, 14]],
    plates: [
      { id: "base", color: "orange", x: 17, y: 68, w: 68, h: 16, r: 0, z: 1, screws: ["a", "b"] },
      { id: "upright", color: "violet", x: 66, y: 24, w: 18, h: 58, r: 0, z: 2, screws: ["c", "d"] },
      { id: "cross", color: "blue", x: 22, y: 43, w: 58, h: 16, r: 0, z: 3, screws: ["e", "f"] },
      { id: "arm", color: "wood-mint", x: 29, y: 21, w: 24, h: 61, r: -26, z: 4, screws: ["g", "h"] },
      { id: "cap", color: "violet", x: 54, y: 25, w: 27, h: 16, r: 0, z: 5, screws: ["i", "j"] },
    ],
    screws: {
      a: [30, 76], b: [73, 76], c: [75, 37], d: [75, 70], e: [33, 51], f: [69, 51], g: [33, 28], h: [53, 70], i: [62, 33], j: [75, 33],
    },
  },
];

const STYLE = `
.screw-puzzle{--bg:#0B131F;--panel:#131E2E;--line:#22344B;--ink:#E4EDF7;--dim:#7D93AC;--mint:#63E0C4;--warn:#F0A93B;--violet:#b47bdb;--wood-mint:#89d99e;--blue:#75b9d8;--orange:#e6a65e;min-height:100%;padding:72px 12px 30px;color:var(--ink);background-color:var(--bg);background-image:linear-gradient(rgba(99,224,196,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(99,224,196,.05) 1px,transparent 1px);background-size:26px 26px;font-family:system-ui,-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif}.sp-shell{max-width:660px;margin:auto}.sp-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;letter-spacing:.05em}.sp-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:12px}.sp-kicker{margin:0;color:var(--mint);font:700 11px ui-monospace,monospace;letter-spacing:.1em}.sp-title{margin:2px 0 0;font-size:19px;font-weight:700;letter-spacing:.12em}.sp-stats{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.sp-stat{min-width:48px;padding:4px 7px;border:1px solid var(--line);border-radius:4px;background:rgba(19,30,46,.7);color:var(--ink);text-align:center;font:700 10px ui-monospace,monospace}.sp-stat b{display:block;margin-top:1px;font-size:14px}.sp-stage{position:relative;border:1px solid var(--line);border-radius:4px;background:rgba(19,30,46,.45);padding:14px;box-shadow:0 14px 35px rgba(0,0,0,.2)}.sp-board{position:relative;width:min(100%,420px);aspect-ratio:1;margin:auto;overflow:hidden;border:5px solid #321f1c;border-radius:13px;background:repeating-linear-gradient(88deg,rgba(91,47,18,.15) 0 2px,transparent 2px 14px),linear-gradient(90deg,#dd9c56,#f3c77f 42%,#d99650);box-shadow:inset 0 0 0 2px rgba(255,244,207,.45),0 14px 28px rgba(0,0,0,.36)}.sp-board:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(100deg,rgba(255,255,255,.18),transparent 27%,rgba(68,26,14,.1))}.sp-plate{position:absolute;border:2px solid rgba(83,48,80,.42);border-radius:8px;background:linear-gradient(145deg,rgba(255,255,255,.5),rgba(255,255,255,.07) 38%),var(--plate);box-shadow:inset 0 2px 1px rgba(255,255,255,.42),inset 0 -3px 4px rgba(72,35,58,.2),0 3px 4px rgba(72,33,26,.38);transform:rotate(var(--r));transform-origin:center;transition:opacity .36s,transform .52s cubic-bezier(.25,.9,.3,1.25),filter .2s}.sp-plate.gone{opacity:0;filter:brightness(1.5);transform:rotate(var(--r)) translateY(160px) rotate(18deg) scale(.92);pointer-events:none}.sp-screw{position:absolute;width:46px;height:46px;padding:0;border:0;border-radius:50%;background:radial-gradient(circle at 34% 29%,#fff 0 8%,#dfe3e5 26%,#8d979c 58%,#f5f7f6 62%,#687177 78%,#e4e6e4 81%);box-shadow:0 2px 3px rgba(46,26,24,.55),inset 0 1px 2px #fff;transform:translate(-50%,-50%);cursor:pointer;transition:left .2s cubic-bezier(.25,.9,.3,1.2),top .2s cubic-bezier(.25,.9,.3,1.2),transform .15s,filter .15s}.sp-screw::after{content:"+";display:block;color:#31363a;font:800 31px/43px Arial;text-shadow:0 1px #fff}.sp-screw:hover:not(:disabled),.sp-screw.selected{transform:translate(-50%,-50%) scale(1.12);filter:drop-shadow(0 0 5px #ffeb78)}.sp-screw:focus-visible,.sp-hole:focus-visible{outline:2px solid var(--mint);outline-offset:2px}.sp-screw:disabled{cursor:not-allowed;filter:brightness(.72) saturate(.65)}.sp-hole{position:absolute;width:34px;height:34px;padding:0;border:0;border-radius:50%;transform:translate(-50%,-50%);background:radial-gradient(circle at 35% 30%,#72522f,#382319 68%,#160f0d);box-shadow:inset 1px 2px 3px rgba(0,0,0,.65),0 1px rgba(255,238,183,.45);cursor:pointer}.sp-hole:disabled{cursor:default}.sp-hole.available{box-shadow:inset 1px 2px 3px rgba(0,0,0,.65),0 0 0 2px var(--mint);animation:sp-pulse .85s ease-in-out infinite alternate}@keyframes sp-pulse{to{transform:translate(-50%,-50%) scale(1.13)}}.sp-toast{min-height:29px;margin:10px 0 4px;padding:6px 9px;border-left:3px solid var(--mint);background:rgba(99,224,196,.07);color:var(--ink);font-size:12px;line-height:1.4}.sp-controls{display:flex;gap:6px;flex-wrap:wrap;margin-top:14px}.sp-btn{border:1px solid var(--line);border-radius:4px;padding:8px 12px;background:var(--panel);color:var(--ink);font-size:12.5px;font-weight:600;cursor:pointer;transition:background .15s,border-color .15s}.sp-btn:hover:not(:disabled){background:#1B2A3E;border-color:#93AECB}.sp-btn:disabled{opacity:.35;cursor:default}.sp-btn.primary{background:var(--mint);color:#062018;border-color:var(--mint)}.sp-help{margin:13px 1px 0;color:var(--dim);font-size:11.5px;line-height:1.75}.sp-veil{position:absolute;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;overflow:hidden;background:rgba(11,19,31,.88);animation:sp-fade .3s ease both}@keyframes sp-fade{from{opacity:0}to{opacity:1}}.sp-clear-card{position:relative;z-index:2;min-width:min(290px,88%);border:1px solid var(--mint);border-radius:6px;padding:24px 28px;background:var(--panel);text-align:center;box-shadow:0 18px 44px rgba(0,0,0,.5);animation:sp-pop .35s cubic-bezier(.3,1.5,.5,1) both}@keyframes sp-pop{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}.sp-clear-kicker{color:var(--mint);font-size:11px;font-weight:700;letter-spacing:.2em}.sp-clear-title{margin:8px 0 4px;font-size:23px;font-weight:700}.sp-clear-meta{margin:0;color:var(--dim);font-size:13px}.sp-stars{margin:13px 0;color:#FFE9A8;font-size:28px;letter-spacing:5px;text-shadow:0 0 14px rgba(255,233,168,.35)}.sp-perfect{margin:0 0 17px;color:var(--mint);font-size:11px;font-weight:700;letter-spacing:.14em}.sp-confetti{position:absolute;inset:0;overflow:hidden;pointer-events:none}.sp-conf{position:absolute;top:-20px;opacity:0;animation:sp-confetti var(--dur) cubic-bezier(.3,.4,.6,1) var(--delay) both}@keyframes sp-confetti{0%{opacity:0;transform:translate3d(0,-20px,0) rotate(0)}8%,85%{opacity:1}100%{opacity:0;transform:translate3d(var(--dx),var(--fall),0) rotate(var(--spin))}}@media(max-width:530px){.sp-head{align-items:flex-start;flex-direction:column}.sp-stats{justify-content:flex-start}.sp-stage{padding:9px}.sp-screw{width:44px;height:44px}.sp-screw::after{line-height:41px}}@media(prefers-reduced-motion:reduce){.sp-plate,.sp-screw,.sp-hole,.sp-veil,.sp-clear-card,.sp-conf{transition-duration:.01ms!important;animation-duration:.01ms!important}}
/* Modern casual-game skin: Water Sort's result UX, not its terminal-like visual theme. */
.screw-puzzle{--cream:#fff9f2;--lavender:#eee8ff;--ink:#342c4d;--muted:#786f8c;--coral:#ff6e8e;--sun:#ffc94b;--aqua:#4ecdb8;--violet:#aa82e9;--wood-mint:#8cdaa1;--blue:#73bee5;--orange:#f2a95f;padding:72px 14px 34px;background:radial-gradient(circle at 12% 4%,#fff 0 11%,transparent 34%),radial-gradient(circle at 91% 0,#d9fff5 0,transparent 32%),linear-gradient(155deg,#f6f1ff 0%,#fff9ef 52%,#eafff7 100%);color:var(--ink)}.sp-shell{max-width:600px}.sp-mono{font-family:inherit;font-variant-numeric:tabular-nums;letter-spacing:0}.sp-head{align-items:center;margin:0 4px 18px}.sp-kicker{color:var(--coral);font-size:12px;font-weight:900;letter-spacing:.08em}.sp-title{margin-top:3px;font-size:27px;letter-spacing:-.04em;line-height:1.05}.sp-stats{gap:7px}.sp-stat{display:flex;align-items:center;gap:5px;min-width:0;padding:7px 10px;border:0;border-radius:999px;background:rgba(255,255,255,.9);color:var(--muted);box-shadow:0 5px 14px rgba(95,71,123,.12);font-size:10px;font-weight:800}.sp-stat:nth-child(1){color:#7251b4}.sp-stat:nth-child(2){color:#239b86}.sp-stat:nth-child(3){color:#e4607e}.sp-stat:nth-child(4){color:#d28c17}.sp-stat b{margin:0;font-size:16px;color:var(--ink)}.sp-stage{padding:13px;border:0;border-radius:25px;background:rgba(255,255,255,.68);box-shadow:0 16px 38px rgba(83,60,106,.16),inset 0 1px rgba(255,255,255,.9)}.sp-board{border:6px solid #6d4936;border-radius:19px;box-shadow:inset 0 0 0 2px rgba(255,244,207,.62),0 10px 22px rgba(82,48,33,.25)}.sp-plate{border-color:rgba(255,255,255,.45);border-radius:12px;box-shadow:inset 0 2px 2px rgba(255,255,255,.55),inset 0 -4px 5px rgba(72,35,58,.18),0 5px 7px rgba(72,33,26,.32)}.sp-plate.gone{transform:rotate(var(--r)) translateY(190px) rotate(24deg) scale(.86)}.sp-screw{box-shadow:0 4px 5px rgba(46,26,24,.48),inset 0 2px 2px #fff}.sp-screw:hover:not(:disabled),.sp-screw.selected{transform:translate(-50%,-50%) translateY(-5px) scale(1.12);filter:drop-shadow(0 9px 7px rgba(255,103,141,.35))}.sp-screw:active{transform:translate(-50%,-50%) scale(.96)}.sp-screw:focus-visible,.sp-hole:focus-visible{outline-color:var(--coral)}.sp-hole.available{box-shadow:inset 1px 2px 3px rgba(0,0,0,.65),0 0 0 3px #fff,0 0 0 6px var(--coral);animation:sp-pulse .7s cubic-bezier(.34,1.56,.64,1) infinite alternate}.sp-toast{margin:14px 5px 5px;padding:10px 13px;border:0;border-radius:13px;background:#fff;color:var(--ink);box-shadow:0 7px 18px rgba(90,64,113,.1);font-size:13px;font-weight:700}.sp-toast::before{content:"✦";margin-right:7px;color:var(--coral)}.sp-controls{justify-content:center;gap:9px;margin-top:15px}.sp-btn{border:0;border-radius:14px;padding:11px 16px;background:#fff;color:var(--ink);box-shadow:0 5px 12px rgba(87,61,106,.14);font-size:13px;font-weight:800}.sp-btn:hover:not(:disabled){background:#fff;transform:translateY(-2px)}.sp-btn:active:not(:disabled){transform:scale(.96)}.sp-btn.primary{background:linear-gradient(135deg,#ff7c9a,#ff5f84);color:#fff;box-shadow:0 7px 16px rgba(244,92,132,.34)}.sp-help{margin:15px 8px 0;color:var(--muted);font-size:12px;font-weight:600;text-align:center}.sp-veil{border-radius:19px;background:rgba(54,40,73,.45);backdrop-filter:blur(4px)}.sp-clear-card{border:0;border-radius:25px;background:linear-gradient(160deg,#fff,#fff6e5);box-shadow:0 20px 48px rgba(50,30,66,.3);color:var(--ink)}.sp-clear-kicker{color:var(--coral);font-size:12px}.sp-clear-title{font-size:26px}.sp-clear-meta{color:var(--muted)}.sp-stars{color:var(--sun);text-shadow:0 3px 0 #df9d17,0 0 15px rgba(255,201,75,.42)}.sp-perfect{color:var(--aqua)}@media(max-width:530px){.sp-head{align-items:flex-start;gap:11px}.sp-title{font-size:25px}.sp-stats{gap:5px}.sp-stat{padding:6px 8px;font-size:9px}.sp-stat b{font-size:14px}.sp-stage{padding:8px;border-radius:20px}.sp-board{border-radius:15px}.sp-clear-card{border-radius:21px}}
/* Flat premium-puzzle refinement: one top-left light source, few colors, no photorealism. */
.screw-puzzle{--ink:#383450;--muted:#817c98;--violet:#a78be8;--wood-mint:#82d6b0;--blue:#a78be8;--orange:#82d6b0;--coral:#f47a92;--sun:#ffd35f;background:radial-gradient(circle at 12% 0,#fff 0,transparent 28%),linear-gradient(155deg,#f2efff 0%,#fff9ee 58%,#effdf8 100%)}.sp-stage{padding:14px;border-radius:30px;background:rgba(255,255,255,.72);box-shadow:0 14px 32px rgba(69,55,103,.12)}.sp-board{border:0;border-radius:24px;background:linear-gradient(135deg,#f1c77f,#e9b967);box-shadow:inset 0 2px 0 rgba(255,255,255,.38),0 10px 22px rgba(103,71,38,.18)}.sp-board:after{background:radial-gradient(rgba(113,76,36,.14) .65px,transparent .7px);background-size:7px 7px;opacity:.22}.sp-plate{border:0;border-radius:17px;background:linear-gradient(135deg,rgba(255,255,255,.25),rgba(255,255,255,0) 48%),var(--plate);box-shadow:0 6px 0 rgba(68,52,93,.17),0 10px 16px rgba(67,51,86,.16)}.sp-plate.gone{filter:none}.sp-screw{width:44px;height:44px;background:linear-gradient(135deg,#fff,#dfe4ec);box-shadow:0 4px 0 #aab1bd,0 7px 12px rgba(56,50,70,.2)}.sp-screw::after{color:#596171;font-size:28px;line-height:41px;text-shadow:none}.sp-screw:hover:not(:disabled),.sp-screw.selected{filter:none;box-shadow:0 7px 0 #aab1bd,0 14px 16px rgba(244,122,146,.25)}.sp-hole{width:32px;height:32px;background:#72563c;box-shadow:inset 0 3px 4px rgba(48,31,18,.38),0 1px 0 rgba(255,255,255,.28)}.sp-hole.available{box-shadow:inset 0 3px 4px rgba(48,31,18,.38),0 0 0 3px #fff,0 0 0 6px var(--coral)}.sp-stat{box-shadow:0 4px 10px rgba(79,63,112,.1)}.sp-btn{border-radius:17px;box-shadow:0 4px 0 rgba(78,61,103,.12),0 7px 13px rgba(78,61,103,.1)}.sp-btn.primary{background:linear-gradient(135deg,#f78aa0,#ef6e89);box-shadow:0 5px 0 #d45b75,0 10px 16px rgba(244,92,132,.22)}.sp-clear-card{border-radius:30px;background:linear-gradient(135deg,#fff,#fff8ec);box-shadow:0 18px 40px rgba(54,40,73,.24)}
/* Board motion stays below the clear overlay and releases with a deliberate, toy-like fall. */
.sp-veil{z-index:60}.sp-clear-card{z-index:70}.sp-confetti{z-index:71}.sp-plate{transition:opacity .55s ease-out,transform .85s cubic-bezier(.32,0,.2,1.4),filter .25s}.sp-plate.gone{transform:rotate(var(--r)) translateY(174px) rotate(16deg) scale(.9)}
/* Share Water Sort Lab's surrounding UI system; the flat wood puzzle remains the focal surface. */
.screw-puzzle{--bg:#0B131F;--panel:#131E2E;--line:#22344B;--ink:#E4EDF7;--dim:#7D93AC;--mint:#63E0C4;--warn:#F0A93B;padding:68px 12px 30px;background-color:var(--bg);background-image:linear-gradient(rgba(99,224,196,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(99,224,196,.05) 1px,transparent 1px);background-size:26px 26px}.sp-shell{max-width:660px}.sp-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;letter-spacing:.05em}.sp-head{align-items:end;margin-bottom:12px}.sp-kicker{color:var(--mint);font-size:11px;letter-spacing:.1em}.sp-title{font-size:19px;letter-spacing:.12em}.sp-stats{gap:5px}.sp-stat{display:block;min-width:48px;padding:4px 7px;border:1px solid var(--line);border-radius:4px;background:rgba(19,30,46,.7);color:var(--dim);box-shadow:none;text-align:center;font:700 10px ui-monospace,monospace}.sp-stat:nth-child(n){color:var(--dim)}.sp-stat b{display:block;margin-top:1px;color:var(--ink);font-size:14px}.sp-stage{padding:14px;border:1px solid var(--line);border-radius:4px;background:rgba(19,30,46,.45);box-shadow:none}.sp-toast{margin:10px 0 4px;padding:6px 9px;border-left:3px solid var(--mint);border-radius:0;background:rgba(99,224,196,.07);box-shadow:none;color:var(--ink);font-size:12px;font-weight:400}.sp-toast::before{display:none}.sp-controls{justify-content:flex-start;gap:6px;margin-top:14px}.sp-btn{border:1px solid var(--line);border-radius:4px;padding:8px 12px;background:var(--panel);box-shadow:none;color:var(--ink);font-size:12.5px;font-weight:600}.sp-btn:hover:not(:disabled){background:#1B2A3E;border-color:#93AECB;transform:none}.sp-btn:active:not(:disabled){transform:none}.sp-btn.primary{background:var(--mint);border-color:var(--mint);box-shadow:none;color:#062018}.sp-help{margin:13px 1px 0;color:var(--dim);font-size:11.5px;font-weight:400;text-align:left}.sp-veil{border-radius:4px;background:rgba(11,19,31,.86);backdrop-filter:none}.sp-clear-card{border:1px solid var(--mint);border-radius:6px;background:var(--panel);box-shadow:0 18px 44px rgba(0,0,0,.5);color:var(--ink)}.sp-clear-kicker,.sp-perfect{color:var(--mint)}.sp-clear-meta{color:var(--dim)}.sp-stars{color:#FFE9A8;text-shadow:0 0 14px rgba(255,233,168,.35)}@media(max-width:530px){.sp-head{align-items:flex-start;flex-direction:column}.sp-stats{justify-content:flex-start}.sp-stage{padding:9px;border-radius:4px}.sp-board{border-radius:19px}.sp-clear-card{border-radius:6px}}
/* Proportion and hierarchy pass: chunky pieces, quieter structure, touch targets kept larger than the bolt artwork. */
.screw-puzzle{--violet:#b6a0e6;--wood-mint:#91d9b9;--blue:#b6a0e6;--orange:#91d9b9;--ink:#3b3850;--muted:#898397;background:linear-gradient(155deg,#f4f1ff 0%,#fffaf0 59%,#f1fcf7 100%)}.sp-stage{padding:11px;border-radius:28px;box-shadow:0 12px 27px rgba(69,55,103,.1)}.sp-board{border-radius:23px;background:linear-gradient(180deg,#efc779,#eabb6c);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 7px 16px rgba(103,71,38,.13)}.sp-board:after{background:radial-gradient(rgba(107,77,40,.15) .55px,transparent .6px);background-size:8px 8px;opacity:.14}.sp-plate{border-radius:16px;background:linear-gradient(150deg,rgba(255,255,255,.17),rgba(255,255,255,0) 46%),var(--plate);box-shadow:0 3px 5px rgba(67,51,86,.14)}.sp-plate.gone{transform:rotate(var(--r)) translateY(174px) rotate(16deg) scale(.9)}.sp-screw{width:44px;height:44px;background:transparent;box-shadow:none}.sp-screw::before{content:"";position:absolute;inset:4px;border-radius:50%;background:linear-gradient(145deg,#fffefb,#e9e9e7);box-shadow:0 2px 4px rgba(58,54,68,.18)}.sp-screw::after{position:relative;color:#8d9097;font-size:22px;font-weight:700;line-height:43px;text-shadow:none}.sp-screw:hover:not(:disabled),.sp-screw.selected{box-shadow:none;filter:none}.sp-screw.selected::before{box-shadow:0 3px 7px rgba(244,122,146,.25),0 0 0 3px rgba(244,122,146,.35)}.sp-hole{width:24px;height:24px;background:#8d7155;box-shadow:inset 0 2px 3px rgba(55,37,22,.28)}.sp-hole.available{box-shadow:inset 0 2px 3px rgba(55,37,22,.28),0 0 0 3px #fff,0 0 0 5px rgba(244,122,146,.82)}.sp-toast{box-shadow:0 5px 12px rgba(90,64,113,.08)}.sp-stat{box-shadow:0 3px 8px rgba(79,63,112,.08)}
/* Final shell parity with Water Sort Lab. Kept last to prevent puzzle-skin overrides from leaking into the shared UI. */
section.screw-puzzle{--bg:#0B131F;--panel:#131E2E;--line:#22344B;--ink:#E4EDF7;--dim:#7D93AC;--mint:#63E0C4;min-height:100%;padding:18px 12px 30px;color:var(--ink);background-color:var(--bg);background-image:linear-gradient(rgba(99,224,196,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(99,224,196,.05) 1px,transparent 1px);background-size:26px 26px}section.screw-puzzle .sp-shell{max-width:660px}section.screw-puzzle .sp-head{align-items:end;margin-bottom:12px}section.screw-puzzle .sp-kicker{color:var(--mint);font:700 11px ui-monospace,monospace;letter-spacing:.1em}section.screw-puzzle .sp-title{color:var(--ink);font-size:19px;letter-spacing:.12em}section.screw-puzzle .sp-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.05em}section.screw-puzzle .sp-stats{gap:5px}section.screw-puzzle .sp-stat{display:block;min-width:48px;padding:4px 7px;border:1px solid var(--line);border-radius:4px;background:rgba(19,30,46,.7);box-shadow:none;color:var(--dim);text-align:center;font:700 10px ui-monospace,monospace}section.screw-puzzle .sp-stat:nth-child(n){color:var(--dim)}section.screw-puzzle .sp-stat b{display:block;margin-top:1px;color:var(--ink);font-size:14px}section.screw-puzzle .sp-stage{padding:14px;border:1px solid var(--line);border-radius:4px;background:rgba(19,30,46,.45);box-shadow:none}section.screw-puzzle .sp-toast{margin:10px 0 4px;padding:6px 9px;border:0;border-left:3px solid var(--mint);border-radius:0;background:rgba(99,224,196,.07);box-shadow:none;color:var(--ink);font-size:12px;font-weight:400}section.screw-puzzle .sp-toast::before{display:none}section.screw-puzzle .sp-controls{justify-content:flex-start;gap:6px;margin-top:14px}section.screw-puzzle .sp-btn{border:1px solid var(--line);border-radius:4px;padding:8px 12px;background:var(--panel);box-shadow:none;color:var(--ink);font-size:12.5px;font-weight:600;transform:none}section.screw-puzzle .sp-btn.primary{background:var(--mint);border-color:var(--mint);color:#062018}section.screw-puzzle .sp-help{margin:13px 1px 0;color:var(--dim);font-size:11.5px;font-weight:400;text-align:left}section.screw-puzzle .sp-veil{border-radius:4px;background:rgba(11,19,31,.86);backdrop-filter:none}section.screw-puzzle .sp-clear-card{border:1px solid var(--mint);border-radius:6px;background:var(--panel);box-shadow:0 18px 44px rgba(0,0,0,.5);color:var(--ink)}section.screw-puzzle .sp-clear-kicker,section.screw-puzzle .sp-perfect{color:var(--mint)}section.screw-puzzle .sp-clear-meta{color:var(--dim)}
/* Gameplay readability: a larger board, chunky pieces, and a clearly elevated movable piece. */
section.screw-puzzle .sp-board{width:min(100%,500px);border-radius:18px}section.screw-puzzle .sp-plate{box-shadow:0 4px 9px rgba(44,34,61,.11)}section.screw-puzzle .sp-plate.movable{background:linear-gradient(145deg,rgba(255,255,255,.22),rgba(255,255,255,0) 48%),#78d4ab;box-shadow:0 5px 11px rgba(36,115,84,.2)}section.screw-puzzle .sp-screw::before{background:#f6f5f0;box-shadow:inset 0 1px 1px rgba(255,255,255,.9),0 1px 3px rgba(44,42,53,.16)}section.screw-puzzle .sp-screw::after{color:#9a9ca2;font-size:20px;line-height:43px}section.screw-puzzle .sp-toast{margin-top:18px}section.screw-puzzle .sp-help{margin-top:15px}@media(max-width:530px){section.screw-puzzle .sp-board{width:100%;border-radius:16px}}
/* Release sequence: a short unlock pause, then gravity-like rotation and fall. */
section.screw-puzzle .sp-board.locking{pointer-events:none}section.screw-puzzle .sp-plate.unlocking{animation:sp-unlock 140ms cubic-bezier(.34,1.56,.64,1) both;box-shadow:0 10px 17px rgba(44,34,61,.2)}section.screw-puzzle .sp-plate.falling{animation:sp-fall 660ms cubic-bezier(.55,0,1,.45) both;box-shadow:0 14px 20px rgba(44,34,61,.12)}@keyframes sp-unlock{0%{transform:rotate(var(--r)) translateY(0)}45%{transform:rotate(var(--r)) translateY(-4px)}72%{transform:rotate(calc(var(--r) + 1deg)) translateY(-2px)}100%{transform:rotate(var(--r)) translateY(0)}}@keyframes sp-fall{0%{opacity:1;transform:rotate(var(--r)) translateY(-2px) scale(1)}68%{opacity:1;transform:rotate(var(--fall-r)) translateY(210px) scale(.96)}100%{opacity:.1;transform:rotate(var(--fall-r)) translateY(224px) scale(.94)}}
section.screw-puzzle .sp-plate.gone{opacity:0;transform:rotate(var(--fall-r,var(--r))) translateY(224px) scale(.94)}@media(prefers-reduced-motion:reduce){section.screw-puzzle .sp-plate.unlocking,section.screw-puzzle .sp-plate.falling{animation-duration:.01ms!important}}
`;

function plateFor(level, screw) { return level.plates.find((plate) => plate.screws.includes(screw)); }

function save(payload) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(payload)); } catch { /* Optional persistence. */ } }

export default function ScrewSortPuzzle() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [placements, setPlacements] = useState({});
  const [released, setReleased] = useState([]);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("ネジを選び、光る空き穴へ移しなさい。");
  const [cleared, setCleared] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [releasing, setReleasing] = useState(null);
  const loaded = useRef(false);
  const releaseTimers = useRef([]);
  const level = LEVELS[levelIndex];
  const screwIds = useMemo(() => Object.keys(level.screws), [level]);
  const holes = useMemo(() => ({ ...level.screws, ...Object.fromEntries(level.parkingHoles.map((p, i) => [`park-${i}`, p])) }), [level]);
  const at = (id) => placements[id] || id;
  const occupied = useMemo(() => new Set(screwIds.map(at)), [screwIds, placements]);
  const fallen = useMemo(() => new Set(released), [released]);
  const looseScrews = screwIds.filter((id) => at(id) === id).length;
  const confetti = useMemo(() => Array.from({ length: 46 }, (_, i) => ({
    left: `${(i * 17.3) % 100}%`, color: ["#63E0C4", "#B47BDB", "#75B9D8", "#FFE9A8"][i % 4],
    dx: `${((i * 41) % 120) - 60}px`, fall: `${330 + ((i * 31) % 190)}px`, spin: `${(i * 83) % 720 - 260}deg`,
    dur: `${1700 + ((i * 47) % 1100)}ms`, delay: `${(i * 29) % 800}ms`, size: 5 + (i % 4),
  })), [levelIndex]);

  useEffect(() => () => releaseTimers.current.forEach(clearTimeout), []);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (data && Number.isInteger(data.level) && data.level >= 0 && data.level < LEVELS.length && data.placements && typeof data.placements === "object") {
        const ids = new Set(Object.keys(LEVELS[data.level].screws));
        const destinations = new Set([...ids, ...LEVELS[data.level].parkingHoles.map((_, i) => `park-${i}`)]);
        const next = Object.entries(data.placements).filter(([id, hole]) => ids.has(id) && destinations.has(hole));
        if (new Set(next.map(([, hole]) => hole)).size === next.length) {
          const savedReleased = Array.isArray(data.released) ? data.released.filter((id) => LEVELS[data.level].plates.some((p) => p.id === id)) : [];
          setLevelIndex(data.level); setPlacements(Object.fromEntries(next)); setReleased(savedReleased);
        }
      }
    } catch { /* Start fresh if storage is malformed. */ }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    save({ level: levelIndex, placements, released });
  }, [levelIndex, placements, released]);

  useEffect(() => {
    const done = fallen.size === level.plates.length;
    if (done && !cleared) { setCleared(true); setMessage("解除成功。次の機構へ進めるわ。"); }
  }, [fallen, level, cleared]);

  function visible(holeId, z) {
    const [x, y] = holes[holeId];
    return !level.plates.some((p) => p.z * 10 > z && !fallen.has(p.id) && x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
  }
  // Board content is kept below 60; clear UI begins at 60.
  function screwZ(id) { const plate = plateFor(level, id); return at(id) === id && !fallen.has(plate.id) ? plate.z * 10 + 5 : 55; }
  function holeZ(id) { const plate = level.plates.find((p) => p.screws.includes(id)); return plate && !fallen.has(plate.id) ? plate.z * 10 + 4 : 54; }
  function choose(id) {
    if (releasing) return;
    if (!visible(at(id), screwZ(id))) { setMessage("そのネジは上の板に隠れているわ。"); return; }
    setSelected(selected === id ? null : id); setMessage(selected === id ? "選択を取り消したわ。" : "移動先の空き穴を選びなさい。");
  }
  function move(holeId) {
    if (releasing || !selected || occupied.has(holeId) || !visible(holeId, holeZ(holeId))) return;
    const next = { ...placements, [selected]: holeId }, plate = plateFor(level, selected);
    const justReleased = !fallen.has(plate.id) && plate.screws.every((id) => (next[id] || id) !== id);
    setHistory((h) => [...h, { placements, released }]); setPlacements(next); setSelected(null);
    if (!justReleased) { setMessage("移動したわ。次のネジを選びなさい。"); return; }
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const wait = reduced ? 0 : 120, fall = reduced ? 0 : 260, finish = reduced ? 0 : 920;
    setMessage("ロックが外れた…！"); setReleasing({ id: plate.id, phase: "armed" });
    releaseTimers.current.push(setTimeout(() => setReleasing({ id: plate.id, phase: "unlocking" }), wait));
    releaseTimers.current.push(setTimeout(() => setReleasing({ id: plate.id, phase: "falling" }), fall));
    releaseTimers.current.push(setTimeout(() => { setReleased((r) => [...r, plate.id]); setReleasing(null); setMessage("板が落ちたわ。下の仕掛けが見えたはずよ。"); }, finish));
  }
  function cancelRelease() { releaseTimers.current.forEach(clearTimeout); releaseTimers.current = []; setReleasing(null); }
  function restart() { cancelRelease(); setPlacements({}); setReleased([]); setHistory([]); setSelected(null); setCleared(false); setUndoCount(0); setMessage("盤面を戻したわ。ネジを選んでから空き穴へ。 "); }
  function undo() { if (!history.length || releasing) return; const last = history.at(-1); setPlacements(last.placements); setReleased(last.released); setHistory((h) => h.slice(0, -1)); setSelected(null); setCleared(false); setUndoCount((n) => n + 1); setMessage("一手戻したわ。"); }
  function next() { cancelRelease(); const n = (levelIndex + 1) % LEVELS.length; setLevelIndex(n); setPlacements({}); setReleased([]); setHistory([]); setSelected(null); setCleared(false); setUndoCount(0); setMessage(`LEVEL ${String(n + 1).padStart(2, "0")}、${LEVELS[n].name}。`); }

  return <section className="screw-puzzle" aria-labelledby="screw-title"><style>{STYLE}</style><div className="sp-shell">
    <header className="sp-head"><div><p className="sp-kicker sp-mono">SCREW RELEASE</p><h1 id="screw-title" className="sp-title sp-mono">ネジ抜き工房</h1></div><div className="sp-stats"><span className="sp-stat">LEVEL<b>{String(levelIndex + 1).padStart(2, "0")}</b></span><span className="sp-stat">SCREWS<b>{looseScrews}</b></span><span className="sp-stat">MOVES<b>{history.length}</b></span><span className="sp-stat">DONE<b>{fallen.size}/{level.plates.length}</b></span></div></header>
    <div className="sp-stage"><div className={`sp-board${releasing ? " locking" : ""}`} aria-label={`${level.name}の盤面`}>
      {[...level.plates].sort((a,b) => a.z-b.z).map((p) => { const phase = releasing?.id === p.id ? ` ${releasing.phase}` : ""; const towardLeft = p.x + p.w / 2 < 50; return <div key={p.id} className={`sp-plate${p.color === "wood-mint" ? " movable" : ""}${fallen.has(p.id) ? " gone" : ""}${phase}`} style={{ left:`${p.x}%`,top:`${p.y}%`,width:`${p.w}%`,height:`${p.h}%`,"--r":`${p.r}deg`,"--fall-r":`${p.r + (towardLeft ? -22 : 22)}deg`,"--plate":`var(--${p.color})`,transformOrigin:towardLeft ? "left bottom" : "right bottom",zIndex:p.z }} />})}
      {Object.entries(holes).map(([id,[x,y]]) => !occupied.has(id) && <button key={id} className={`sp-hole${selected && visible(id, holeZ(id)) ? " available" : ""}`} style={{left:`${x}%`,top:`${y}%`,zIndex:holeZ(id)}} onClick={() => move(id)} disabled={!selected || !visible(id, holeZ(id))} aria-label={`空き穴、${selected ? "ネジを入れられます" : "移動先"}`} />)}
      {screwIds.map((id) => { const [x,y] = holes[at(id)], open = visible(at(id), screwZ(id)); return <button key={id} className={`sp-screw${selected === id ? " selected" : ""}`} style={{left:`${x}%`,top:`${y}%`,zIndex:screwZ(id)}} onClick={() => choose(id)} aria-label={`ネジ ${id}、${open ? "選択できます" : "板に隠れています"}`} disabled={!open} />; })}
      {cleared && <div className="sp-veil"><div className="sp-confetti">{confetti.map((c, i) => <i key={i} className="sp-conf" style={{left:c.left,width:c.size,height:c.size,background:c.color,"--dx":c.dx,"--fall":c.fall,"--spin":c.spin,"--dur":c.dur,"--delay":c.delay}} />)}</div><div className="sp-clear-card"><div className="sp-clear-kicker sp-mono">ALL RELEASED</div><div className="sp-clear-title">レベル {levelIndex + 1} クリア</div><p className="sp-clear-meta sp-mono">{history.length} 手 / プレート {level.plates.length} 枚</p><div className="sp-stars" aria-label={undoCount === 0 ? "星3つ" : "星2つ"}>{undoCount === 0 ? "★★★" : "★★☆"}</div>{undoCount === 0 && <p className="sp-perfect sp-mono">PERFECT RELEASE</p>}<div className="sp-controls" style={{ justifyContent: "center" }}><button className="sp-btn" onClick={restart}>この面をもう一度</button><button className="sp-btn primary" onClick={next}>次のレベルへ</button></div></div></div>}
    </div></div>
    <p className="sp-toast sp-mono" aria-live="polite">{message}</p>
    <div className="sp-controls"><button className="sp-btn" onClick={undo} disabled={!history.length}>↶ 1手もどす</button><button className="sp-btn" onClick={restart}>やり直す</button>{cleared && <button className="sp-btn primary" onClick={next}>次の面へ →</button>}</div>
    <p className="sp-help sp-mono">ネジをタップして選び、光る空き穴へ移動。元のネジ穴も移動先に使えます。上の板に隠れた穴を読んで、解放する順番を選びなさい。</p>
  </div></section>;
}
