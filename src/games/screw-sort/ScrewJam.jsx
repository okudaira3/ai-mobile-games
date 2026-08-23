import { useEffect, useMemo, useState } from 'react';
import { applyMove, createInitialState, holeById, isHoleExposed, legalDestinations, removableScrews, screwAtHole, searchFromState, shortestSolution } from './screwEngine';
import { LEVEL_COUNT, getLevel } from './levelPack';
import './ScrewJam.css';

const SAVE_KEY = 'screw-board:v1';
const load = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || { highest: 1, current: 1 }; } catch { return { highest: 1, current: 1 }; } };
const colors = ['#f06d73', '#f4c65b', '#63e0c4', '#89b9f5', '#d7a3ef', '#f49ec1'];

export default function ScrewJam() {
  const saved = useMemo(load, []); const [number, setNumber] = useState(saved.current); const level = useMemo(() => getLevel(number), [number]);
  const [state, setState] = useState(() => createInitialState(level)); const [history, setHistory] = useState([]); const [selected, setSelected] = useState(null); const [message, setMessage] = useState('ネジを選び、光っている空き穴へ移動してください。'); const [falling, setFalling] = useState([]);
  useEffect(() => { setState(createInitialState(level)); setHistory([]); setSelected(null); setFalling([]); }, [level]);
  useEffect(() => { const next = { highest: Math.max(saved.highest, number), current: number }; localStorage.setItem(SAVE_KEY, JSON.stringify(next)); }, [number, saved.highest]);
  const targets = selected ? legalDestinations(level, state, selected) : [];
  const move = (from, to) => { const result = applyMove(level, state, from, to); if (!result.accepted) return; setHistory((old) => [...old.slice(-29), state]); setState(result.state); setSelected(null); if (result.fallen.length) { setFalling(result.fallen); setTimeout(() => setFalling([]), 660); } setMessage(result.fallen.length ? '板が落ち、下の穴が現れました。' : 'ネジを移動しました。'); };
  const select = (hole) => { if (selected === hole) return setSelected(null); const destinations = legalDestinations(level, state, hole); setSelected(hole); setMessage(destinations.length ? '移動先を選んでください。' : 'このネジに移動先はありません。別の手を試してください。'); };
  const undo = () => { const previous = history.at(-1); if (!previous) return; setState(previous); setHistory((items) => items.slice(0, -1)); setSelected(null); setMessage('1手もどしました。'); };
  const hint = () => { if (state.cleared) return setMessage('このレベルはクリア済みです。'); const solution = shortestSolution(level, state); if (!solution) return setMessage('この盤面はもう解けません。1手もどすか、やり直してください。'); const [from, to] = solution[0]; setSelected(from); setMessage(`ヒント: 最短だとあと${solution.length}手です。光っている穴へ移動してください。`); if (!legalDestinations(level, state, from).includes(to)) setSelected(null); };
  const dead = useMemo(() => !state.cleared && !searchFromState(level, state).solution, [level, state]);
  const fallen = new Set(state.fallen);
  return <section className="screw-puzzle" aria-label="ネジ抜きパズル"><div className="sp-shell">
    <header className="sp-head"><div><p className="sp-kicker">SCREW BOARD</p><h1 className="sp-title">LEVEL {number} / {LEVEL_COUNT}</h1></div><div className="sp-stats"><span className="sp-stat">手数<b>{state.moves}</b></span><span className="sp-stat">残り板<b>{level.plates.length - state.fallen.length}</b></span></div></header>
    <div className="sp-stage"><div className="sp-board">
      {level.plates.filter((p) => !fallen.has(p.id)).sort((a, b) => a.z - b.z).map((p) => <div className="sp-plate" key={p.id} style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, height: `${p.h}%`, '--r': `${p.r}deg`, '--plate': p.color, zIndex: p.z + 2 }} />)}
      {level.plates.filter((p) => falling.includes(p.id)).map((p) => <div className="sp-plate falling" key={`fall-${p.id}`} style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, height: `${p.h}%`, '--r': `${p.r}deg`, '--plate': p.color, zIndex: p.z + 2 }} />)}
      {level.holes.filter((h) => !screwAtHole(level, state, h.id) && isHoleExposed(level, state, h)).map((h) => <button key={h.id} className={`sp-hole ${targets.includes(h.id) ? 'available' : ''}`} style={{ left: `${h.x}%`, top: `${h.y}%`, zIndex: 40 }} onClick={() => targets.includes(h.id) && move(selected, h.id)} aria-label="空き穴" />)}
      {removableScrews(level, state).map((id, index) => { const hole = holeById(level, id); return <button key={id} className={`sp-screw ${selected === id ? 'selected' : ''}`} style={{ left: `${hole.x}%`, top: `${hole.y}%`, '--screw': colors[index % colors.length], zIndex: 50 }} onClick={() => select(id)} aria-label="ネジを選ぶ" />; })}
    </div>
      <p className="sp-toast">{message}</p><div className="sp-controls"><button className="sp-btn" onClick={undo} disabled={!history.length}>1手もどす</button><button className="sp-btn" onClick={() => { setState(createInitialState(level)); setHistory([]); setSelected(null); }}>やり直す</button><button className="sp-btn" onClick={hint}>ヒント</button></div>
      {(dead || state.cleared) && <div className="sp-veil"><div className="sp-clear-card"><p className="sp-clear-kicker">{state.cleared ? 'CLEAR' : 'STUCK'}</p><h2 className="sp-clear-title">{state.cleared ? (number === LEVEL_COUNT ? '全レベルクリア' : 'クリアしました') : 'この盤面はもう解けません'}</h2><p className="sp-clear-meta">{state.cleared ? `${state.moves}手でクリアしました。` : '1手もどすか、最初からやり直してください。'}</p><div className="sp-controls">{!state.cleared && <button className="sp-btn" onClick={undo} disabled={!history.length}>1手もどす</button>}<button className="sp-btn" onClick={() => { setState(createInitialState(level)); setHistory([]); }}>やり直す</button>{state.cleared && number < LEVEL_COUNT && <button className="sp-btn primary" onClick={() => setNumber((n) => n + 1)}>次のレベルへ</button>}</div></div></div>}
    </div><p className="sp-help">板を留めるネジがすべてなくなると板が落ちます。色は見た目だけの違いです。</p>
  </div></section>;
}
