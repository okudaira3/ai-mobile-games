import { useMemo, useState } from "react";
import "./BusJam.css";

const COLORS = [
  { name: "赤", hex: "#f35c5c" }, { name: "青", hex: "#4aaff2" },
  { name: "緑", hex: "#6ccf78" }, { name: "黄", hex: "#f7cb4d" },
  { name: "紫", hex: "#ac81ed" }, { name: "ピンク", hex: "#ef83bc" },
];
const SIZE = 4;
const CAPACITY = 2;
const MAX_BAYS = 3;

function makeLevel(number) {
  // Every column exits toward the top. Passenger order follows row-major order,
  // so each level has at least one valid solution without requiring lucky guesses.
  let seed = number * 7919 + 17;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const palette = Math.min(3 + Math.floor((number - 1) / 3), COLORS.length);
  const buses = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      buses.push({ id: row * SIZE + col, row, col, color: Math.floor(rand() * palette) });
    }
  }
  // Two passengers per bus. Queue is intentionally solvable from the initial state.
  const passengers = buses.flatMap(bus => [bus.color, bus.color]);
  return { buses, passengers };
}
function settle(bays, passengers) {
  const nextBays = bays.map(bus => ({ ...bus }));
  let queue = [...passengers];
  // A waiting bus may board only when its color matches the front of the queue.
  // Repeat after a departure so a newly exposed bay can board automatically.
  let changed = true;
  while (changed && queue.length) {
    changed = false;
    const index = nextBays.findIndex(bus => bus.color === queue[0]);
    if (index >= 0) {
      const bus = nextBays[index];
      while (bus.seats < CAPACITY && queue[0] === bus.color) {
        bus.seats++;
        queue.shift();
        changed = true;
      }
      if (bus.seats === CAPACITY) nextBays.splice(index, 1);
    }
  }
  return { bays: nextBays, passengers: queue };
}
function isFree(bus, parked) {
  return !parked.some(other => other.col === bus.col && other.row < bus.row);
}
export default function BusJam() {
  const [level, setLevel] = useState(1);
  const [history, setHistory] = useState([]);
  const initial = useMemo(() => makeLevel(level), [level]);
  const current = history.length ? history[history.length - 1] : { parked: initial.buses, bays: [], passengers: initial.passengers };
  const { parked, bays, passengers } = current;
  const complete = passengers.length === 0 && parked.length === 0 && bays.length === 0;
  const blocked = bays.length >= MAX_BAYS && !bays.some(bus => bus.color === passengers[0]);
  function dispatch(bus) {
    if (complete || bays.length >= MAX_BAYS || !isFree(bus, parked)) return;
    const next = settle([...bays, { ...bus, seats: 0 }], passengers);
    setHistory(old => [...old, { parked: parked.filter(item => item.id !== bus.id), ...next }]);
  }
  const reset = () => setHistory([]);
  const advance = () => { setLevel(old => old === 10 ? 1 : old + 1); setHistory([]); };
  return (
    <section className="bj-root" aria-label="Bus Jam Mini">
      <header className="bj-heading"><div><p>RELAXING COLOR PUZZLE</p><h1>Bus Jam Mini</h1></div><span>LEVEL {level} / 10</span></header>
      <div className="bj-queue-panel">
        <div className="bj-label">乗客の行列 <strong>あと {passengers.length} 人</strong></div>
        <div className="bj-queue" aria-label="乗客の色の順番">
          {passengers.slice(0, 20).map((color, index) => <span key={index} className="bj-person" style={{ "--bus-color": COLORS[color].hex }} title={COLORS[color].name} />)}
          {passengers.length > 20 && <span className="bj-more">+{passengers.length - 20}</span>}
          {passengers.length === 0 && <span>全員乗車したよ！</span>}
        </div>
      </div>
      <div className="bj-label">乗り場 <strong>{bays.length} / {MAX_BAYS} 台</strong></div>
      <div className="bj-bays">
        {Array.from({ length: MAX_BAYS }, (_, i) => {
          const bus = bays[i];
          return <div key={i} className="bj-bay">{bus && <div className="bj-bus bj-waiting" style={{ "--bus-color": COLORS[bus.color].hex }}><span>▲</span><b>{COLORS[bus.color].name}</b><small>{bus.seats}/{CAPACITY}</small></div>}</div>;
        })}
      </div>
      <div className="bj-label">駐車場 <strong>残り {parked.length} 台</strong></div>
      <div className="bj-lot">
        {initial.buses.map(bus => {
          const visible = parked.some(item => item.id === bus.id);
          if (!visible) return <div key={bus.id} className="bj-space" />;
          const free = isFree(bus, parked) && bays.length < MAX_BAYS;
          return <button key={bus.id} className={`bj-bus bj-parked ${free ? "bj-free" : "bj-locked"}`} style={{ "--bus-color": COLORS[bus.color].hex }} onClick={() => dispatch(bus)} disabled={!free} aria-label={`${COLORS[bus.color].name}のバス、${free ? "出発可能" : "出発不可"}`}><span>↑</span><b>{COLORS[bus.color].name}</b></button>;
        })}
      </div>
      {complete ? <div className="bj-message bj-success">クリア！ 全員を送り届けたよ！ <button onClick={advance}>次のステージ →</button></div>
        : blocked ? <div className="bj-message">乗り場がいっぱい！ Undoで戻してみよう。</div>
        : <p className="bj-hint">上に道が空いているバスをタップ。先頭の乗客と同じ色を乗せよう。</p>}
      <div className="bj-actions"><button onClick={() => setHistory(old => old.slice(0, -1))} disabled={!history.length}>↶ 1手戻す</button><button onClick={reset} disabled={!history.length}>最初から</button><button onClick={advance}>ステージ変更 →</button></div>
    </section>
  );
}
