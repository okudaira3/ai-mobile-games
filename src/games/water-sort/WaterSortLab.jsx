import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const CAP = 4;
const T_TRAVEL = 240;
const T_POUR = 420;
const T_BACK = 220;
const MAX_PER_ROW = 10;
const NODE_CAP = 120000;
const SAVE_KEY = "wsl:save:v1";

const PALETTE = [
  ["#FF3B5C", "#FF8095"],
  ["#FF7A3D", "#FFAD82"],
  ["#FFA800", "#FFC95E"],
  ["#FFD400", "#FFE97A"],
  ["#CBD84A", "#E4ED91"],
  ["#8CE04A", "#BDF28E"],
  ["#23B14D", "#63D989"],
  ["#0E7A4A", "#3FA878"],
  ["#12C9A0", "#5FE4C6"],
  ["#00CBD8", "#5FE6EE"],
  ["#2EA8FF", "#8ACDFF"],
  ["#2563EB", "#6E97F5"],
  ["#5468FF", "#94A0FF"],
  ["#8B5CF6", "#B492FA"],
  ["#C026D3", "#DE6BE8"],
  ["#FF5FD2", "#FFA3E4"],
  ["#F09AB8", "#F8C4D6"],
  ["#C77B3A", "#E0A472"],
  ["#7C4A2D", "#A87352"],
  ["#93A3B8", "#C2CCD9"],
];

const PATTERNS = [
  null,
  { img: "repeating-linear-gradient(0deg, rgba(255,255,255,.30) 0 1px, rgba(255,255,255,0) 1px 4.5px)" },
  { img: "repeating-linear-gradient(45deg, rgba(255,255,255,.28) 0 1.5px, rgba(255,255,255,0) 1.5px 5px)" },
  { img: "repeating-linear-gradient(-45deg, rgba(0,0,0,.24) 0 1.5px, rgba(0,0,0,0) 1.5px 5px)" },
  { img: "radial-gradient(rgba(255,255,255,.38) .9px, rgba(255,255,255,0) 1px)", size: "4.5px 4.5px" },
  { img: "repeating-linear-gradient(90deg, rgba(0,0,0,.22) 0 1px, rgba(0,0,0,0) 1px 4px)" },
];

// 栓が刺さった時に飛ぶ星（上方向の扇状に固定）
const SPARKS = Array.from({ length: 10 }, (_, i) => {
  const ang = ((-165 + i * 15) * Math.PI) / 180;
  const dist = 20 + ((i * 7) % 15);
  return { x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, delay: (i % 5) * 35, size: 5 + ((i * 3) % 4) };
});

/* ---------- ルール ---------- */

const isUniform = (t) => t.length > 0 && t.every((x) => x === t[0]);
const isDone = (t) => t.length === 0 || (t.length === CAP && isUniform(t));
const isSealed = (t) => t.length === CAP && isUniform(t);
const isWin = (ts) => ts.every(isDone);

function topGroup(t) {
  const c = t[t.length - 1];
  let n = 1;
  for (let i = t.length - 2; i >= 0 && t[i] === c; i--) n++;
  return n;
}

function canPour(ts, i, j) {
  if (i === j) return false;
  const f = ts[i];
  const g = ts[j];
  if (f.length === 0 || g.length >= CAP) return false;
  if (g.length === 0) return true;
  return f[f.length - 1] === g[g.length - 1];
}

function applyPour(ts, i, j) {
  const next = ts.map((t) => t.slice());
  const n = Math.min(topGroup(next[i]), CAP - next[j].length);
  for (let k = 0; k < n; k++) next[j].push(next[i].pop());
  return { tubes: next, moved: n };
}

/* ---------- ソルバー ---------- */

const keyOf = (ts) => ts.map((t) => t.join(",")).sort().join("/");
const CAP_HIT = Symbol("cap");

function search(start, nodeCap) {
  const seen = new Set();
  let nodes = 0;
  function rec(ts, depth) {
    if (isWin(ts)) return true;
    if (++nodes > nodeCap || depth > 400) throw CAP_HIT;
    const k = keyOf(ts);
    if (seen.has(k)) return false;
    seen.add(k);
    const moves = [];
    for (let i = 0; i < ts.length; i++) {
      if (ts[i].length === 0) continue;
      const top = ts[i][ts[i].length - 1];
      const g = topGroup(ts[i]);
      for (let j = 0; j < ts.length; j++) {
        if (!canPour(ts, i, j)) continue;
        if (ts[j].length === 0 && isUniform(ts[i])) continue;
        const space = CAP - ts[j].length;
        if (ts[j].length > 0 && g >= space && isUniform(ts[j]) && ts[j][0] === top)
          return rec(applyPour(ts, i, j).tubes, depth + 1);
        moves.push({ i, j, score: (g <= space ? 2 : 0) + (ts[j].length > 0 ? 1 : 0) });
      }
    }
    moves.sort((a, b) => b.score - a.score);
    for (const m of moves) if (rec(applyPour(ts, m.i, m.j).tubes, depth + 1)) return true;
    return false;
  }
  try {
    return rec(start, 0) ? "solvable" : "dead";
  } catch (e) {
    if (e === CAP_HIT) return "unknown";
    throw e;
  }
}

function deal(colorCount, emptyCount) {
  let last = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    const pool = [];
    for (let c = 0; c < colorCount; c++) for (let k = 0; k < CAP; k++) pool.push(c);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const tubes = [];
    for (let i = 0; i < colorCount; i++) tubes.push(pool.slice(i * CAP, (i + 1) * CAP));
    if (tubes.some(isUniform)) continue;
    for (let i = 0; i < emptyCount; i++) tubes.push([]);
    last = tubes;
    if (search(tubes, 60000) !== "dead") return tubes;
  }
  return last;
}

const colorsForLevel = (lv) => Math.min(5 + lv, PALETTE.length);
const emptiesForColors = (c) => (c >= 13 ? 3 : 2);

/* ---------- 音 ---------- */

function makeSfx(onRef) {
  let ctx = null;
  const get = () => {
    if (!onRef.current) return null;
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    } catch {
      return null;
    }
  };
  const tone = (c, f, dur, { type = "sine", vol = 0.12, at = 0, to = null } = {}) => {
    const t = c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  };
  return {
    lift: () => { const c = get(); if (c) tone(c, 620, 0.08, { vol: 0.07, to: 900 }); },
    drop: () => { const c = get(); if (c) tone(c, 300, 0.08, { vol: 0.05, to: 200 }); },
    nope: () => { const c = get(); if (c) tone(c, 150, 0.09, { type: "square", vol: 0.045 }); },
    dead: () => {
      const c = get();
      if (!c) return;
      tone(c, 260, 0.5, { type: "triangle", vol: 0.08, to: 130 });
      tone(c, 196, 0.6, { vol: 0.06, at: 0.1, to: 98 });
    },
    pour(units) {
      const c = get();
      if (!c) return;
      const t = c.currentTime;
      const len = Math.floor(c.sampleRate * 0.6);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
      const src = c.createBufferSource();
      src.buffer = buf;
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 1.1;
      bp.frequency.setValueAtTime(520, t);
      bp.frequency.exponentialRampToValueAtTime(1700, t + 0.42);
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.13, t + 0.06);
      g.gain.setValueAtTime(0.11, t + 0.3);
      g.gain.linearRampToValueAtTime(0, t + 0.5);
      src.connect(bp).connect(g).connect(c.destination);
      src.start(t);
      src.stop(t + 0.6);
      for (let i = 0; i < units; i++) tone(c, 130 + i * 26, 0.13, { vol: 0.09, at: i * 0.1, to: 190 + i * 30 });
    },
    seal() {
      const c = get();
      if (!c) return;
      tone(c, 340, 0.07, { type: "triangle", vol: 0.1, to: 180 });
      tone(c, 990, 0.4, { vol: 0.09, at: 0.05 });
      tone(c, 1480, 0.45, { vol: 0.05, at: 0.09 });
      tone(c, 1976, 0.3, { vol: 0.03, at: 0.14 });
    },
    clear() {
      const c = get();
      if (!c) return;
      [523, 659, 784, 1046, 1318].forEach((f, i) => tone(c, f, 0.55, { vol: 0.1, at: i * 0.085 }));
      [1046, 1318, 1568].forEach((f, i) => tone(c, f, 0.7, { vol: 0.05, at: 0.5 + i * 0.05 }));
    },
  };
}

/* ---------- 描画 ---------- */

function runs(tube) {
  const r = [];
  for (const c of tube) {
    if (r.length && r[r.length - 1].c === c) r[r.length - 1].n++;
    else r.push({ c, n: 1 });
  }
  return r;
}

function liquid(c, patterned) {
  const base = `linear-gradient(90deg, ${PALETTE[c][0]} 0%, ${PALETTE[c][1]} 45%, ${PALETTE[c][0]} 100%)`;
  const p = patterned ? PATTERNS[c % PATTERNS.length] : null;
  if (!p) return { background: base };
  return { background: `${p.img}, ${base}`, backgroundSize: p.size ? `${p.size}, auto` : undefined };
}

function splitRows(n, maxPerRow) {
  if (n <= 0) return [];
  const rowCount = Math.ceil(n / maxPerRow);
  const perRow = Math.ceil(n / rowCount);
  const out = [];
  for (let s = 0; s < n; s += perRow) out.push(Array.from({ length: Math.min(perRow, n - s) }, (_, k) => s + k));
  return out;
}

const CSS = `
.wsl { --bg:#0B131F; --panel:#131E2E; --line:#22344B; --glass:#93AECB; --ink:#E4EDF7; --dim:#7D93AC; --mint:#63E0C4; --warn:#F0A93B;
  --tw:34px; --th:140px;
  min-height:100%; padding:18px 12px 30px; color:var(--ink); background-color:var(--bg);
  background-image:linear-gradient(rgba(99,224,196,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(99,224,196,.05) 1px,transparent 1px);
  background-size:26px 26px;
  font-family:system-ui,-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif; }
@media (max-width:430px){ .wsl { --tw:30px; --th:124px; } }
.mono { font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-variant-numeric:tabular-nums; letter-spacing:.05em; }

.wsl-title { font-size:11px; color:var(--mint); text-transform:uppercase; }
.wsl-sub { font-size:19px; font-weight:700; letter-spacing:.12em; margin-top:2px; }
.stat { border:1px solid var(--line); background:rgba(19,30,46,.7); border-radius:4px; padding:4px 8px; }
.stat-k { font-size:9px; color:var(--dim); text-transform:uppercase; }
.stat-v { font-size:14px; font-weight:700; }

.deadbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:8px;
  border:1px solid var(--warn); border-left-width:4px; background:rgba(240,169,59,.1);
  border-radius:4px; padding:9px 12px; animation:slidein .3s ease both; }
@keyframes slidein { from{opacity:0; transform:translateY(-6px)} to{opacity:1; transform:none} }
.deadbar b { color:var(--warn); font-size:13px; }
.deadbar span { font-size:12px; }

.board { border:1px solid var(--line); background:rgba(19,30,46,.45); border-radius:4px;
  min-height:200px; position:relative; padding:46px 4px 20px;
  display:flex; flex-direction:column; align-items:center; gap:32px; transition:border-color .3s; }
.board.dead { border-color:rgba(240,169,59,.5); }
.row { display:flex; justify-content:center; align-items:flex-end; }

.slot { background:none; border:0; padding:3px 4px 0; cursor:pointer; position:relative; line-height:0; }
.slot.flying { z-index:40; }
.slot:focus-visible { outline:2px solid var(--mint); outline-offset:1px; border-radius:4px; }

.tube { display:flex; flex-direction:column-reverse; width:var(--tw); height:var(--th);
  border:2px solid rgba(147,174,203,.45); border-top:none; border-radius:3px 3px 18px 18px;
  background:rgba(147,174,203,.05); position:relative; overflow:hidden; transform-origin:50% 0;
  transition:transform .16s ease, box-shadow .16s ease, border-color .16s ease; }
.tube::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(100deg,rgba(255,255,255,.16) 0 4px,transparent 5px 100%); }
.sel .tube { transform:translateY(-14px); border-color:var(--mint); box-shadow:0 0 0 1px rgba(99,224,196,.4),0 10px 20px rgba(0,0,0,.45); }
.hint .tube { border-color:rgba(99,224,196,.6); box-shadow:0 0 12px rgba(99,224,196,.2); }
.tube.fly { transition:transform ${T_TRAVEL}ms cubic-bezier(.34,.9,.4,1); box-shadow:0 14px 28px rgba(0,0,0,.5); }
.tube.back { transition:transform ${T_BACK}ms cubic-bezier(.4,0,.5,1); }

.rim { position:absolute; top:0; left:-3px; right:-3px; height:4px; border-radius:2px; background:rgba(147,174,203,.55); z-index:3; }
.run { position:relative; flex:0 0 auto; display:flex; align-items:center; justify-content:center; overflow:hidden; }
.run + .run { box-shadow:inset 0 1px 0 rgba(255,255,255,.3); }
.moving { transition:height ${T_POUR}ms linear; }
.crown::before { content:""; position:absolute; top:-3px; left:0; right:0; height:5px; border-radius:50%;
  background:inherit; filter:brightness(1.3); }
.tag { font-size:10px; font-weight:800; color:rgba(8,18,28,.62); line-height:1; position:relative;
  text-shadow:0 1px 0 rgba(255,255,255,.35); }
.settle { animation:settle .45s cubic-bezier(.3,1.6,.5,1) both; }
@keyframes settle { 0%{transform:scaleY(1.1)} 55%{transform:scaleY(.97)} 100%{transform:scaleY(1)} }

.cork { position:absolute; top:2px; left:50%; width:calc(var(--tw) - 8px); height:11px; z-index:5; border-radius:3px;
  background:linear-gradient(180deg,#D9A25E,#A9702F); box-shadow:0 1px 0 rgba(0,0,0,.35);
  animation:cork .34s cubic-bezier(.3,1.5,.5,1) both; }
@keyframes cork { from{transform:translate(-50%,-24px) rotate(-14deg); opacity:0} to{transform:translate(-50%,0) rotate(0); opacity:1} }
.flash { position:absolute; inset:-5px; border-radius:6px; border:2px solid var(--mint); pointer-events:none;
  animation:flash .5s ease-out both; z-index:4; }
@keyframes flash { from{opacity:.9; transform:scale(.9)} to{opacity:0; transform:scale(1.15)} }

/* 栓が刺さった時の星 */
.sparks { position:absolute; top:8px; left:50%; width:0; height:0; z-index:12; pointer-events:none; }
.spark { position:absolute; display:block; background:#FFE9A8;
  clip-path:polygon(50% 0%,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0% 50%,40% 40%);
  animation:spark 620ms cubic-bezier(.2,.8,.3,1) both; }
@keyframes spark {
  0%   { transform:translate(-50%,-50%) scale(0) rotate(0deg); opacity:0 }
  22%  { transform:translate(calc(-50% + var(--tx)*.45), calc(-50% + var(--ty)*.45)) scale(1.15) rotate(50deg); opacity:1 }
  100% { transform:translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(.15) rotate(150deg); opacity:0 }
}

.stream { position:fixed; width:8px; margin-left:-4px; z-index:39; pointer-events:none; border-radius:0 0 4px 4px;
  transform-origin:top; animation:streamin .1s linear both; box-shadow:0 0 10px rgba(255,255,255,.18); }
@keyframes streamin { from{transform:scaleY(0)} to{transform:scaleY(1)} }
.splash { position:fixed; width:18px; height:5px; margin-left:-9px; border-radius:50%; z-index:39; pointer-events:none;
  animation:splash .38s ease-out infinite; }
@keyframes splash { 0%{transform:scale(.5); opacity:.85} 100%{transform:scale(1.5); opacity:0} }

.btn { border:1px solid var(--line); background:var(--panel); color:var(--ink); border-radius:4px;
  padding:8px 12px; font-size:12.5px; font-weight:600; cursor:pointer; transition:background .15s,border-color .15s; }
.btn:hover:not(:disabled) { background:#1B2A3E; border-color:var(--glass); }
.btn:disabled { opacity:.35; cursor:default; }
.btn-go { background:var(--mint); color:#062018; border-color:var(--mint); }
.btn-warn { background:var(--warn); color:#241503; border-color:var(--warn); padding:6px 11px; font-size:12px; }

.veil { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  background:rgba(11,19,31,.86); z-index:50; overflow:hidden; animation:fade .3s ease both; }
@keyframes fade { from{opacity:0} to{opacity:1} }
.card { border:1px solid var(--mint); background:var(--panel); border-radius:6px; padding:24px 28px; text-align:center;
  box-shadow:0 18px 44px rgba(0,0,0,.5); animation:pop .35s cubic-bezier(.3,1.5,.5,1) both; position:relative; z-index:2; }
@keyframes pop { from{transform:scale(.9); opacity:0} to{transform:scale(1); opacity:0.999} }

/* クリア時の紙吹雪 */
.confetti { position:absolute; inset:0; overflow:hidden; pointer-events:none; z-index:1; }
.conf { position:absolute; top:-20px; opacity:0; animation-name:confall; animation-timing-function:cubic-bezier(.3,.4,.6,1); animation-fill-mode:both; }
@keyframes confall {
  0%   { opacity:0; transform:translate3d(0,-20px,0) rotate(0deg) }
  8%   { opacity:1 }
  85%  { opacity:1 }
  100% { opacity:0; transform:translate3d(var(--dx), var(--fall), 0) rotate(var(--spin)) }
}

@media (prefers-reduced-motion:reduce){ .wsl *,.wsl *::before,.wsl *::after { animation-duration:.01ms !important; transition-duration:.01ms !important } }
`;

export default function WaterSortLab() {
  const [level, setLevel] = useState(1);
  const [tubes, setTubes] = useState([]);
  const [past, setPast] = useState([]);
  const [sel, setSel] = useState(null);
  const [moves, setMoves] = useState(0);
  const [anim, setAnim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [helped, setHelped] = useState(false);
  const [sealed, setSealed] = useState([]);
  const [won, setWon] = useState(false);
  const [sound, setSound] = useState(true);
  const [tags, setTags] = useState(false);
  const [pattern, setPattern] = useState(true);
  const [watch, setWatch] = useState(true);
  const [verdict, setVerdict] = useState("ok");
  const [perRowMax, setPerRowMax] = useState(8);
  const [ready, setReady] = useState(false);
  const [best, setBest] = useState({});
  const restoreRef = useRef(null);

  const soundRef = useRef(true);
  soundRef.current = sound;
  const sfxRef = useRef(null);
  if (!sfxRef.current) sfxRef.current = makeSfx(soundRef);
  const sfx = sfxRef.current;

  const boardRef = useRef(null);
  const tubeEls = useRef([]);
  const timers = useRef([]);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => clearTimers, []);

  const safe = useRef(null);
  const pastRef = useRef([]);
  const movesRef = useRef(0);
  pastRef.current = past;
  movesRef.current = moves;
  const checkToken = useRef(0);

  // 紙吹雪はレベルごとに一度だけ生成
  const confetti = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => {
        const c = PALETTE[(i * 7) % PALETTE.length];
        const round = i % 4 === 0;
        return {
          left: `${(i * 13.7) % 100}%`,
          w: round ? 6 : 5 + (i % 4),
          h: round ? 6 : 9 + (i % 5),
          round,
          color: i % 3 === 0 ? c[1] : c[0],
          dx: `${((i * 37) % 120) - 60}px`,
          fall: `${360 + ((i * 29) % 220)}px`,
          spin: `${((i * 97) % 900) - 300}deg`,
          dur: `${1900 + ((i * 53) % 1500)}ms`,
          delay: `${(i * 31) % 1100}ms`,
        };
      }),
    [level]
  );

  // 起動時に保存データを読む。読み終わるまで盤面を配らない
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const saved = window.localStorage.getItem(SAVE_KEY);
        const d = saved ? JSON.parse(saved) : null;
        if (alive && d) {
          const s = d.settings || {};
          if (typeof s.sound === "boolean") setSound(s.sound);
          if (typeof s.pattern === "boolean") setPattern(s.pattern);
          if (typeof s.tags === "boolean") setTags(s.tags);
          if (typeof s.watch === "boolean") setWatch(s.watch);
          if (d.best && typeof d.best === "object") setBest(d.best);
          if (typeof d.level === "number" && d.level >= 1) {
            if (d.board && Array.isArray(d.board.tubes) && d.board.tubes.length)
              restoreRef.current = { level: d.level, ...d.board };
            setLevel(d.level);
          }
        }
      } catch (e) {
        /* 保存が無い・壊れている場合は素通り */
      }
      if (alive) setReady(true);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const el = boardRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = (w) => {
      const tw = parseFloat(getComputedStyle(el).getPropertyValue("--tw")) || 34;
      setPerRowMax(Math.min(MAX_PER_ROW, Math.max(3, Math.floor(w / (tw + 8)))));
    };
    measure(el.clientWidth);
    const ro = new ResizeObserver((e) => measure(e[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (loading || anim || won || !tubes.length) return;
    if (!watch) { setVerdict("ok"); return; }
    const token = ++checkToken.current;
    const snapPast = pastRef.current;
    const snapMoves = movesRef.current;
    const id = setTimeout(() => {
      const r = search(tubes, NODE_CAP);
      if (token !== checkToken.current) return;
      if (r === "dead") {
        setVerdict("dead");
        sfx.dead();
      } else {
        setVerdict("ok");
        safe.current = { tubes, past: snapPast, moves: snapMoves };
      }
    }, 0);
    return () => clearTimeout(id);
  }, [tubes, loading, anim, won, watch, sfx]);

  const build = useCallback((lv) => {
    clearTimers();
    checkToken.current++;
    safe.current = null;
    setVerdict("ok");
    setLoading(true);
    setSel(null);
    setPast([]);
    setMoves(0);
    setAnim(null);
    setHelped(false);
    setSealed([]);
    setWon(false);
    setTimeout(() => {
      const c = colorsForLevel(lv);
      setTubes(deal(c, emptiesForColors(c)));
      setLoading(false);
    }, 30);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const r = restoreRef.current;
    if (r && r.level === level) {
      restoreRef.current = null;
      clearTimers();
      checkToken.current++;
      safe.current = null;
      setVerdict("ok");
      setSel(null);
      setAnim(null);
      setSealed([]);
      setWon(false);
      setTubes(r.tubes);
      setPast(Array.isArray(r.past) ? r.past : []);
      setMoves(r.moves || 0);
      setHelped(!!r.helped);
      setLoading(false);
      return;
    }
    build(level);
  }, [level, build, ready]);

  // 変化のたびに保存（連打をまとめるため少し待つ）
  useEffect(() => {
    if (!ready || loading || !tubes.length) return;
    const id = setTimeout(() => {
      const payload = {
        level,
        best,
        settings: { sound, pattern, tags, watch },
        board: won ? null : { tubes, past: past.slice(-50), moves, helped },
      };
      try {
        window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      } catch (e) {
        /* 保存できなくても遊べる */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [ready, loading, tubes, past, moves, helped, level, best, sound, pattern, tags, watch, won]);

  const busy = anim !== null || loading || won;

  function tap(i) {
    if (busy) return;
    if (sel === null) {
      if (tubes[i].length === 0 || isDone(tubes[i])) { sfx.nope(); return; }
      setSel(i);
      sfx.lift();
      return;
    }
    if (sel === i) { setSel(null); sfx.drop(); return; }
    if (!canPour(tubes, sel, i)) {
      sfx.nope();
      if (tubes[i].length && !isDone(tubes[i])) { setSel(i); sfx.lift(); } else setSel(null);
      return;
    }
    startPour(sel, i);
  }

  function startPour(from, to) {
    const before = tubes;
    const { tubes: after, moved } = applyPour(before, from, to);
    const color = before[from][before[from].length - 1];

    const sr = tubeEls.current[from].getBoundingClientRect();
    const dr = tubeEls.current[to].getBoundingClientRect();
    const dir = dr.left + dr.width / 2 >= sr.left + sr.width / 2 ? 1 : -1;
    const mouthX = dr.left + dr.width / 2 - dir * dr.width * 0.78;
    const mouthY = dr.top - dr.height * 0.28;
    const surfaceY = dr.top + 6 + (CAP - before[to].length - moved) * ((dr.height - 6) / CAP) * 0.6;

    setPast((p) => [...p, before]);
    setTubes(after);
    setMoves((m) => m + 1);
    setSel(null);
    setAnim({
      from, to, color, count: moved,
      baseFrom: after[from], baseTo: before[to], phase: "travel",
      dx: mouthX - (sr.left + sr.width / 2),
      dy: mouthY - sr.top,
      rot: dir * 76,
      streamX: dr.left + dr.width / 2,
      streamTop: mouthY + 4,
      streamH: Math.max(20, surfaceY - mouthY),
    });

    later(() => { setAnim((a) => a && { ...a, phase: "pour" }); sfx.pour(moved); }, T_TRAVEL);
    later(() => setAnim((a) => a && { ...a, phase: "back" }), T_TRAVEL + T_POUR);
    later(() => {
      setAnim(null);
      const fresh = after
        .map((t, idx) => (isSealed(t) && !isSealed(before[idx]) ? idx : -1))
        .filter((x) => x >= 0);
      if (fresh.length) {
        setSealed((s) => [...s, ...fresh]);
        sfx.seal();
        later(() => setSealed((s) => s.filter((x) => !fresh.includes(x))), 760);
      }
      if (isWin(after))
        later(() => {
          setWon(true);
          sfx.clear();
          const m = movesRef.current;
          setBest((b) => {
            const prev = b[String(level)];
            return prev != null && prev <= m ? b : { ...b, [String(level)]: m };
          });
        }, 340);
    }, T_TRAVEL + T_POUR + T_BACK);
  }

  function undo() {
    if (busy || !past.length) return;
    setTubes(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
    setSel(null);
    setMoves((m) => Math.max(0, m - 1));
    sfx.drop();
  }

  function rollback() {
    const s = safe.current;
    if (!s || busy) return;
    setTubes(s.tubes);
    setPast(s.past);
    setMoves(s.moves);
    setSel(null);
    sfx.drop();
  }

  function resetProgress() {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      /* 消せなくても続行 */
    }
    restoreRef.current = null;
    setBest({});
    if (level === 1) build(1);
    else setLevel(1);
  }

  function addTube() {
    if (busy || helped) return;
    setPast((p) => [...p, tubes]);
    setTubes((t) => [...t, []]);
    setHelped(true);
    setSel(null);
    sfx.lift();
  }

  const colorCount = colorsForLevel(level);
  const cleared = tubes.filter(isSealed).length;
  const rows = splitRows(tubes.length, perRowMax);
  const bestHere = best[String(level)];
  const isDead = watch && verdict === "dead" && !won;
  const wasted = isDead && safe.current ? moves - safe.current.moves : 0;

  const renderTube = (ti) => {
    const t = tubes[ti];
    const animating = anim && (anim.from === ti || anim.to === ti);
    const isSrc = anim && anim.from === ti;
    const base = animating ? (isSrc ? anim.baseFrom : anim.baseTo) : t;
    let extra = 0;
    if (animating) {
      if (isSrc) extra = anim.phase === "travel" ? anim.count : 0;
      else extra = anim.phase === "travel" ? 0 : anim.count;
    }
    const rs = runs(base);
    const justSealed = sealed.includes(ti);
    const style =
      isSrc && anim.phase !== "back"
        ? { transform: `translate(${anim.dx}px, ${anim.dy}px) rotate(${anim.rot}deg)` }
        : isSrc
        ? { transform: "none" }
        : undefined;

    return (
      <button
        key={ti}
        className={
          "slot" +
          (sel === ti ? " sel" : "") +
          (sel !== null && sel !== ti && canPour(tubes, sel, ti) ? " hint" : "") +
          (isSrc ? " flying" : "")
        }
        onClick={() => tap(ti)}
        aria-label={`試験管${ti + 1}、${t.length}層`}
      >
        {justSealed && (
          <span className="sparks">
            {SPARKS.map((s, k) => (
              <i
                key={k}
                className="spark"
                style={{
                  width: s.size,
                  height: s.size,
                  animationDelay: `${s.delay}ms`,
                  "--tx": `${s.x}px`,
                  "--ty": `${s.y}px`,
                }}
              />
            ))}
          </span>
        )}
        <span
          ref={(el) => (tubeEls.current[ti] = el)}
          className={"tube" + (isSrc && anim.phase !== "back" ? " fly" : "") + (isSrc && anim.phase === "back" ? " back" : "")}
          style={style}
        >
          <span className="rim" />
          {isSealed(t) && !animating && <span className="cork" />}
          {justSealed && <span className="flash" />}
          {rs.map((r, ri) => (
            <span
              key={ri}
              className={"run" + (ri === rs.length - 1 && extra === 0 ? " crown" : "")}
              style={{ height: `${r.n * 25}%`, ...liquid(r.c, pattern) }}
            >
              {tags && <span className="tag mono">{r.c + 1}</span>}
            </span>
          ))}
          {animating && (
            <span
              className={"run moving crown" + (!isSrc && anim.phase === "back" ? " settle" : "")}
              style={{ height: `${extra * 25}%`, ...liquid(anim.color, pattern) }}
            >
              {tags && extra > 0 && <span className="tag mono">{anim.color + 1}</span>}
            </span>
          )}
        </span>
      </button>
    );
  };

  return (
    <div className="wsl">
      <style>{CSS}</style>

      <div className="mx-auto" style={{ maxWidth: 660 }}>
        <header className="flex items-end justify-between mb-3 gap-3">
          <div>
            <div className="wsl-title mono">Water Sort</div>
            <h1 className="wsl-sub mono">みずわけ実験室</h1>
          </div>
          <div className="flex gap-1.5">
            <div className="stat mono">
              <div className="stat-k">Level</div>
              <div className="stat-v">{String(level).padStart(2, "0")}</div>
            </div>
            <div className="stat mono">
              <div className="stat-k">Tubes</div>
              <div className="stat-v">{tubes.length}</div>
            </div>
            <div className="stat mono">
              <div className="stat-k">Moves</div>
              <div className="stat-v">{moves}</div>
            </div>
            <div className="stat mono">
              <div className="stat-k">Done</div>
              <div className="stat-v">{cleared}/{colorCount}</div>
            </div>
            <div className="stat mono" title="このレベルの自己ベスト">
              <div className="stat-k">Best</div>
              <div className="stat-v">{bestHere != null ? bestHere : "—"}</div>
            </div>
          </div>
        </header>

        {isDead && (
          <div className="deadbar">
            <b className="mono">DEAD END</b>
            <span>
              この盤面はもう完成できません
              {wasted > 0 ? `（${wasted}手前が分かれ道）` : ""}
            </span>
            <button className="btn btn-warn ml-auto" onClick={rollback} disabled={!safe.current || busy}>
              解ける局面まで戻す
            </button>
          </div>
        )}

        <div className={"board" + (isDead ? " dead" : "")} ref={boardRef}>
          {loading && (
            <div className="mono" style={{ color: "var(--dim)", fontSize: 13, margin: "auto" }}>
              盤面を配っています…
            </div>
          )}

          {!loading && rows.map((row, ri) => <div className="row" key={ri}>{row.map(renderTube)}</div>)}

          {won && (
            <div className="veil">
              <div className="confetti">
                {confetti.map((c, i) => (
                  <span
                    key={i}
                    className="conf"
                    style={{
                      left: c.left,
                      width: c.w,
                      height: c.h,
                      background: c.color,
                      borderRadius: c.round ? "50%" : "1px",
                      animationDuration: c.dur,
                      animationDelay: c.delay,
                      "--dx": c.dx,
                      "--fall": c.fall,
                      "--spin": c.spin,
                    }}
                  />
                ))}
              </div>
              <div className="card">
                <div className="mono" style={{ fontSize: 11, color: "var(--mint)", letterSpacing: ".2em" }}>ALL SORTED</div>
                <div style={{ fontSize: 23, fontWeight: 700, margin: "8px 0 4px" }}>レベル {level} クリア</div>
                <div className="mono" style={{ fontSize: 13, color: "var(--dim)", marginBottom: 6 }}>
                  {moves} 手 / {colorCount} 色 / 試験管 {tubes.length} 本
                </div>
                <div className="mono" style={{ fontSize: 12, marginBottom: 18, color: bestHere === moves ? "var(--mint)" : "var(--dim)" }}>
                  {bestHere === moves ? "自己ベスト更新" : `自己ベスト ${bestHere} 手`}
                </div>
                <button className="btn btn-go" onClick={() => setLevel((l) => l + 1)}>次のレベルへ</button>
              </div>
            </div>
          )}
        </div>

        {anim && anim.phase === "pour" && (
          <>
            <div className="stream" style={{ left: anim.streamX, top: anim.streamTop, height: anim.streamH, ...liquid(anim.color, pattern) }} />
            <div className="splash" style={{ left: anim.streamX, top: anim.streamTop + anim.streamH - 3, background: PALETTE[anim.color][1] }} />
          </>
        )}

        <div className="flex flex-wrap gap-1.5 mt-4">
          <button className="btn" onClick={undo} disabled={!past.length || busy}>1手もどす</button>
          <button className="btn" onClick={() => build(level)} disabled={loading}>やり直す</button>
          <button className="btn" onClick={addTube} disabled={helped || busy}>試験管+1{helped ? "（済）" : ""}</button>
          <button className="btn" onClick={() => setWatch((v) => !v)}>詰み警告 {watch ? "ON" : "OFF"}</button>
          <button className="btn" onClick={() => setPattern((v) => !v)}>模様 {pattern ? "ON" : "OFF"}</button>
          <button className="btn" onClick={() => setTags((v) => !v)}>番号 {tags ? "ON" : "OFF"}</button>
          <button className="btn" onClick={() => setSound((s) => !s)}>音 {sound ? "ON" : "OFF"}</button>
          <button className="btn ml-auto" onClick={() => setLevel((l) => Math.max(1, l - 1))} disabled={level === 1 || loading}>◀</button>
          <button className="btn" onClick={() => setLevel((l) => l + 1)} disabled={loading}>次の面 ▶</button>
          <button className="btn" onClick={() => setLevel((l) => l + 5)} disabled={loading}>+5面</button>
        </div>

        <p className="mono mt-3" style={{ fontSize: 11.5, color: "var(--dim)", lineHeight: 1.75 }}>
          試験管をタップして選び、注ぎ先をタップ。空き試験管は{emptiesForColors(colorCount)}本です。
          {watch ? "詰み警告ONの間、1手ごとに完成可能か検証しています。" : ""}
          <br />
          レベル・途中の盤面・設定・自己ベストは自動で保存され、次に開いた時に続きから遊べます。
          <button
            onClick={resetProgress}
            style={{ background: "none", border: 0, color: "var(--warn)", cursor: "pointer", padding: 0, marginLeft: 6, font: "inherit", textDecoration: "underline" }}
          >
            記録を消す
          </button>
        </p>
      </div>
    </div>
  );
}
