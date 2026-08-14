import { useEffect, useMemo, useRef, useState } from "react";
import { applyMove, createHoles, findHint, isVisible, legalMoves, plateFor } from "./screwEngine";
import { SCREW_STAGES } from "./screwStages";

const SAVE_KEY = "screw-puzzle:save:v5";

const LEVELS = SCREW_STAGES;

import "./ScrewSortPuzzle.css";
function save(payload) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(payload)); } catch { /* Optional persistence. */ } }
function starsFor(level, moves, undoCount) { return moves <= level.parMoves && undoCount === 0 ? 3 : moves <= level.parMoves + 3 ? 2 : 1; }

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
  const [progress, setProgress] = useState({ completed: {}, unlocked: 1 });
  const [showStages, setShowStages] = useState(true);
  const loaded = useRef(false);
  const releaseTimers = useRef([]);
  const level = LEVELS[levelIndex];
  const screwIds = useMemo(() => Object.keys(level.screws), [level]);
  const holes = useMemo(() => createHoles(level), [level]);
  const at = (id) => placements[id] || id;
  const occupied = useMemo(() => new Set(screwIds.map(at)), [screwIds, placements]);
  const fallen = useMemo(() => new Set(released), [released]);
  const availableMoves = useMemo(() => legalMoves(level, placements, fallen), [level, placements, fallen]);
  const isDeadEnd = !cleared && !releasing && history.length > 0 && availableMoves.length === 0;
  const looseScrews = screwIds.filter((id) => at(id) === id).length;
  const confetti = useMemo(() => Array.from({ length: 46 }, (_, i) => ({
    left: `${(i * 17.3) % 100}%`, color: ["#63E0C4", "#B47BDB", "#75B9D8", "#FFE9A8"][i % 4],
    dx: `${((i * 41) % 120) - 60}px`, fall: `${330 + ((i * 31) % 190)}px`, spin: `${(i * 83) % 720 - 260}deg`,
    dur: `${1700 + ((i * 47) % 1100)}ms`, delay: `${(i * 29) % 800}ms`, size: 5 + (i % 4),
  })), [levelIndex]);

  useEffect(() => () => releaseTimers.current.forEach(clearTimeout), []);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY)) ?? JSON.parse(localStorage.getItem("screw-puzzle:save:v4"));
      if (data && Number.isInteger(data.level) && data.level >= 0 && data.level < LEVELS.length && data.placements && typeof data.placements === "object") {
        const ids = new Set(Object.keys(LEVELS[data.level].screws));
        const destinations = new Set([...ids, ...LEVELS[data.level].parkingHoles.map((_, i) => `park-${i}`)]);
        const next = Object.entries(data.placements).filter(([id, hole]) => ids.has(id) && destinations.has(hole));
        if (new Set(next.map(([, hole]) => hole)).size === next.length) {
          const savedReleased = Array.isArray(data.released) ? data.released.filter((id) => LEVELS[data.level].plates.some((p) => p.id === id)) : [];
          setLevelIndex(data.level);
          if (savedReleased.length < LEVELS[data.level].plates.length) { setPlacements(Object.fromEntries(next)); setReleased(savedReleased); }
        }
      }
      if (data?.progress?.completed && Number.isInteger(data.progress.unlocked)) setProgress({ completed: data.progress.completed, unlocked: Math.max(1, Math.min(data.progress.unlocked, LEVELS.length)) });
      else if (Number.isInteger(data?.level)) setProgress({ completed: {}, unlocked: Math.min(data.level + 1, LEVELS.length) });
    } catch { /* Start fresh if storage is malformed. */ }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    save({ level: levelIndex, placements, released, progress });
  }, [levelIndex, placements, released, progress]);

  useEffect(() => {
    const done = fallen.size === level.plates.length;
    if (done && !cleared) {
      const moves = history.length;
      const stars = starsFor(level, moves, undoCount);
      setProgress((current) => ({ completed: { ...current.completed, [level.id]: { stars: Math.max(stars, current.completed[level.id]?.stars ?? 0), bestMoves: Math.min(moves, current.completed[level.id]?.bestMoves ?? moves) } }, unlocked: Math.max(current.unlocked, Math.min(levelIndex + 2, LEVELS.length)) }));
      setCleared(true); setMessage("解除成功。次の機構へ進めるわ。");
    }
  }, [fallen, level, cleared]);

  const visible = (holeId, z) => isVisible(level, holes, fallen, holeId, z);
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
    const result = applyMove(level, placements, fallen, { screwId: selected, holeId });
    const plate = plateFor(level, selected);
    const justReleased = result.releasedPlateId === plate.id;
    setHistory((h) => [...h, { placements, released }]); setPlacements(result.placements); setSelected(null);
    if (!justReleased) { setMessage("移動したわ。次のネジを選びなさい。"); return; }
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const wait = reduced ? 0 : 120, fall = reduced ? 0 : 260, finish = reduced ? 0 : 920;
    setMessage("ロックが外れた…！"); setReleasing({ id: plate.id, phase: "armed" });
    releaseTimers.current.push(setTimeout(() => setReleasing({ id: plate.id, phase: "unlocking" }), wait));
    releaseTimers.current.push(setTimeout(() => setReleasing({ id: plate.id, phase: "falling" }), fall));
    releaseTimers.current.push(setTimeout(() => { setReleased([...result.released]); window.navigator?.vibrate?.(12); setReleasing(null); setMessage("板が落ちたわ。下の仕掛けが見えたはずよ。"); }, finish));
  }
  function cancelRelease() { releaseTimers.current.forEach(clearTimeout); releaseTimers.current = []; setReleasing(null); }
  function restart() { cancelRelease(); setPlacements({}); setReleased([]); setHistory([]); setSelected(null); setCleared(false); setUndoCount(0); setMessage("盤面を戻したわ。ネジを選んでから空き穴へ。 "); }
  function undo() { if (!history.length || releasing) return; const last = history.at(-1); setPlacements(last.placements); setReleased(last.released); setHistory((h) => h.slice(0, -1)); setSelected(null); setCleared(false); setUndoCount((n) => n + 1); setMessage("一手戻したわ。"); }
  function next() { cancelRelease(); const n = (levelIndex + 1) % LEVELS.length; setLevelIndex(n); setPlacements({}); setReleased([]); setHistory([]); setSelected(null); setCleared(false); setUndoCount(0); setMessage(`LEVEL ${String(n + 1).padStart(2, "0")}、${LEVELS[n].name}。`); }
  function selectStage(index) { if (index >= progress.unlocked) return; cancelRelease(); setLevelIndex(index); setPlacements({}); setReleased([]); setHistory([]); setSelected(null); setCleared(false); setUndoCount(0); setShowStages(false); setMessage(`LEVEL ${String(index + 1).padStart(2, "0")}、${LEVELS[index].name}。`); }

  if (showStages) return <section className="screw-puzzle"><div className="sp-shell sp-picker"><p className="sp-kicker sp-mono">SELECT A MECHANISM</p><h1 className="sp-title">ネジ抜き工房</h1><div className="sp-stage-grid">{LEVELS.map((stage, index) => { const result = progress.completed[stage.id]; const locked = index >= progress.unlocked; return <button className="sp-stage-button" disabled={locked} onClick={() => selectStage(index)} key={stage.id}><span>LEVEL {String(index + 1).padStart(2, "0")}</span><b>{locked ? "LOCKED" : stage.name}</b><em>{locked ? "前の機構を解除" : "★".repeat(result?.stars ?? 0) || "未挑戦"}</em></button>; })}</div></div></section>;

  return <section className="screw-puzzle" aria-labelledby="screw-title"><div className="sp-shell">
    <header className="sp-head"><div><p className="sp-kicker sp-mono">SCREW RELEASE</p><h1 id="screw-title" className="sp-title sp-mono">ネジ抜き工房</h1></div><div className="sp-stats"><span className="sp-stat">LEVEL<b>{String(levelIndex + 1).padStart(2, "0")}</b></span><span className="sp-stat">SCREWS<b>{looseScrews}</b></span><span className="sp-stat">MOVES<b>{history.length}</b></span><span className="sp-stat">DONE<b>{fallen.size}/{level.plates.length}</b></span></div></header>
    <div className="sp-stage"><div className={`sp-board${releasing ? " locking" : ""}`} aria-label={`${level.name}の盤面`}>
      {[...level.plates].sort((a,b) => a.z-b.z).map((p) => { const phase = releasing?.id === p.id ? ` ${releasing.phase}` : ""; const towardLeft = p.x + p.w / 2 < 50; return <div key={p.id} className={`sp-plate${p.color === "wood-mint" ? " movable" : ""}${fallen.has(p.id) ? " gone" : ""}${phase}`} style={{ left:`${p.x}%`,top:`${p.y}%`,width:`${p.w}%`,height:`${p.h}%`,"--r":`${p.r}deg`,"--fall-r":`${p.r + (towardLeft ? -22 : 22)}deg`,"--plate":`var(--${p.color})`,transformOrigin:towardLeft ? "left bottom" : "right bottom",zIndex:p.z }} />})}
      {Object.entries(holes).map(([id,[x,y]]) => !occupied.has(id) && <button key={id} className={`sp-hole${selected && visible(id, holeZ(id)) ? " available" : ""}`} style={{left:`${x}%`,top:`${y}%`,zIndex:holeZ(id)}} onClick={() => move(id)} disabled={!selected || !visible(id, holeZ(id))} aria-label={`空き穴、${selected ? "ネジを入れられます" : "移動先"}`} />)}
      {screwIds.filter((id) => visible(at(id), screwZ(id))).map((id) => { const [x,y] = holes[at(id)]; return <button key={id} className={`sp-screw${selected === id ? " selected" : ""}`} style={{left:`${x}%`,top:`${y}%`,zIndex:screwZ(id)}} onClick={() => choose(id)} aria-label={`ネジ ${id}、選択できます`} />; })}
      {cleared && <div className="sp-veil"><div className="sp-confetti">{confetti.map((c, i) => <i key={i} className="sp-conf" style={{left:c.left,width:c.size,height:c.size,background:c.color,"--dx":c.dx,"--fall":c.fall,"--spin":c.spin,"--dur":c.dur,"--delay":c.delay}} />)}</div><div className="sp-clear-card"><div className="sp-clear-kicker sp-mono">ALL RELEASED</div><div className="sp-clear-title">レベル {levelIndex + 1} クリア</div><p className="sp-clear-meta sp-mono">{history.length} 手 / プレート {level.plates.length} 枚</p><div className="sp-stars" aria-label={`星${starsFor(level, history.length, undoCount)}つ`}>{`${"★".repeat(starsFor(level, history.length, undoCount))}${"☆".repeat(3 - starsFor(level, history.length, undoCount))}`}</div>{starsFor(level, history.length, undoCount) === 3 && <p className="sp-perfect sp-mono">PERFECT RELEASE</p>}<div className="sp-controls" style={{ justifyContent: "center" }}><button className="sp-btn" onClick={restart}>この面をもう一度</button><button className="sp-btn primary" onClick={next}>次の面へ</button></div></div></div>}
    </div></div>
    <p className="sp-toast sp-mono" aria-live="polite">{isDeadEnd ? "手詰まり。1手もどしましょう。" : message}</p>
    <div className="sp-controls"><button className="sp-btn" onClick={() => setShowStages(true)}>面を選ぶ</button><button className="sp-btn" onClick={undo} disabled={!history.length}>↶ 1手もどす</button><button className="sp-btn" onClick={() => { const hint = findHint(level, placements, fallen); if (hint) { setSelected(hint.screwId); setMessage("ヒント：光る穴へ移しなさい。"); } }}>ヒント</button><button className="sp-btn" onClick={restart}>やり直す</button>{cleared && <button className="sp-btn primary" onClick={next}>次の面へ →</button>}</div>
    <p className="sp-help sp-mono">ネジをタップして選び、光る空き穴へ移動。元のネジ穴も移動先に使えます。上の板に隠れた穴を読んで、解放する順番を選びなさい。</p>
  </div></section>;
}
