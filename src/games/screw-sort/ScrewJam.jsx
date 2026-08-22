import { useEffect, useMemo, useRef, useState } from 'react';
import { BOX_SIZE, SPARE_CAPACITY, applyTap, createInitialState, isBlocked, remainingScrews } from './screwEngine';
import { generateLevel } from './levelGenerator';
import './ScrewJam.css';

const SAVE_KEY = 'screw-jam:v1';
function loadProgress() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || { highest: 1, current: 1 }; } catch { return { highest: 1, current: 1 }; } }
function tone(kind) { try { const C = window.AudioContext || window.webkitAudioContext; const ctx = tone.ctx || (tone.ctx = new C()); const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = kind === 'clear' ? 880 : kind === 'fall' ? 95 : 360; g.gain.setValueAtTime(.07, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .13); o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + .14); } catch {} }
export default function ScrewJam() {
  const saved = useMemo(loadProgress, []); const [number, setNumber] = useState(saved.current); const level = useMemo(() => generateLevel(number), [number]);
  const [state, setState] = useState(() => createInitialState(level)); const [history, setHistory] = useState([]); const [muted, setMuted] = useState(() => localStorage.getItem('screw-jam:mute') === '1'); const [flying, setFlying] = useState(null); const [falling, setFalling] = useState([]); const timer = useRef();
  useEffect(() => { setState(createInitialState(level)); setHistory([]); setFalling([]); }, [level]);
  useEffect(() => { localStorage.setItem(SAVE_KEY, JSON.stringify({ highest: Math.max(saved.highest, number), current: number })); }, [number, saved.highest]);
  const tap = (screw) => {
    const result = applyTap(level, state, screw.id);
    // The failed state carries gameOver; commit it so the overlay appears instead of silently ignoring the tap.
    if (result.failed) { setState(result.state); navigator.vibrate?.(60); if (!muted) tone('fail'); return; }
    if (!result.accepted) return;
    setHistory((old) => [...old.slice(-19), state]); setState(result.state); setFlying(screw); if (result.fallen?.length) { setFalling(result.fallen); setTimeout(() => setFalling([]), 700); } clearTimeout(timer.current); timer.current = setTimeout(() => setFlying(null), 330);
    navigator.vibrate?.(18); if (!muted) tone(result.resolved?.length ? 'clear' : result.fallen?.length ? 'fall' : 'tap');
  };
  const undo = () => { const prior = history.at(-1); if (prior) { setState(prior); setHistory((h) => h.slice(0, -1)); } };
  const reset = () => { setState(createInitialState(level)); setHistory([]); };
  const fallen = new Set(state.fallen), visible = remainingScrews(level, state).filter((s) => !isBlocked(level, state, s));
  return <section className="sj" aria-label="ネジ抜きパズル">
    <header className="sj-head"><span>LEVEL {number}</span><strong>残り {level.screws.length - state.removed.length}</strong><button onClick={() => { const next = !muted; setMuted(next); localStorage.setItem('screw-jam:mute', next ? '1' : '0'); }} aria-label="サウンド切替">{muted ? '🔇' : '🔊'}</button></header>
    <div className="sj-board">
      {level.plates.filter((p) => !fallen.has(p.id)).sort((a,b) => a.z-b.z).map((p) => <div className="sj-plate" key={p.id} style={{ left:`${p.x}%`,top:`${p.y}%`,width:`${p.w}%`,height:`${p.h}%`,transform:`rotate(${p.r}deg)`,background:p.color,zIndex:p.z+1 }} />)}
      {level.plates.filter((p) => falling.includes(p.id)).map((p) => <div className="sj-plate is-falling" key={`fall-${p.id}`} style={{ left:`${p.x}%`,top:`${p.y}%`,width:`${p.w}%`,height:`${p.h}%`,transform:`rotate(${p.r}deg)`,background:p.color,zIndex:p.z+1 }} />)}
      {visible.map((s) => <button className="sj-screw" key={s.id} onClick={() => tap(s)} style={{ left:`${s.x}%`, top:`${s.y}%`, '--c':s.color, zIndex:20+s.anchorZ }} aria-label={`${s.color}のネジを抜く`}><i>+</i></button>)}
      {flying && <span className="sj-fly" style={{ left:`${flying.x}%`,top:`${flying.y}%`, '--c':flying.color }}>+</span>}
    </div>
    <div className={`sj-spare ${state.spare.length === SPARE_CAPACITY - 1 ? 'is-warning' : ''}`}><span>予備トレイ</span>{Array.from({length:SPARE_CAPACITY},(_,i) => { const id=state.spare[i], s=level.screws.find(x=>x.id===id); return <b key={i} style={{background:s?.color}}>{s ? '+' : ''}</b>; })}</div>
    <div className="sj-holder">{state.boxes.map((box,i)=><div className="sj-box" key={i} style={{'--box':box.color || '#526177'}}>{Array.from({length:BOX_SIZE},(_,j)=>{const id=box.screws[j],s=level.screws.find(x=>x.id===id); return <b key={j} style={{background:s?.color}}>{s?'+':''}</b>;})}</div>)}</div>
    <div className="sj-actions"><button onClick={undo} disabled={!history.length}>1手もどす</button><button onClick={reset}>やり直す</button><a href="#/">ゲーム一覧へ</a></div>
    {state.gameOver && <div className="sj-overlay"><div><h2>入れる場所がありません</h2><p>1手もどすか、最初からやり直してください。</p><button onClick={reset}>やり直す</button><button onClick={undo} disabled={!history.length}>1手もどす</button></div></div>}
    {state.cleared && <div className="sj-overlay"><div><h2>クリア！</h2><p>{state.moves}手でクリアしました。</p><button onClick={() => setNumber((n) => n + 1)}>次のレベルへ</button></div></div>}
  </section>;
}
