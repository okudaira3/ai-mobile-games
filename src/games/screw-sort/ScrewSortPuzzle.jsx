import { useEffect, useMemo, useRef, useState } from "react";
import { applyMove, createLocations, findHint, holeZ, isComplete, isGoalUnlocked, isUsableHole, isVisible, legalMoves, occupiedHoles, placementOf, screwZ, TRAY, trayScrews } from "./screwEngine";
import { SCREW_STAGES } from "./screwStages";
import "./ScrewSortPuzzle.css";

const SAVE_KEY = "screw-puzzle:save:v8";
const LEVELS = SCREW_STAGES;
const save = (payload) => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(payload)); } catch { /* Optional persistence. */ } };
const starsFor = (level, moves, undoCount) => moves <= level.parMoves && undoCount === 0 ? 3 : moves <= level.parMoves + 3 ? 2 : 1;

export default function ScrewSortPuzzle() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [placements, setPlacements] = useState({});
  const [released, setReleased] = useState([]);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("ネジを選び、光る移動先へ動かしなさい。");
  const [cleared, setCleared] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [releasing, setReleasing] = useState(null);
  const [progress, setProgress] = useState({ completed: {}, unlocked: 1 });
  const [showStages, setShowStages] = useState(true);
  const loaded = useRef(false);
  const releaseTimers = useRef([]);
  const level = LEVELS[levelIndex];
  const screwIds = useMemo(() => Object.keys(level.screws), [level]);
  const locations = useMemo(() => createLocations(level), [level]);
  const fallen = useMemo(() => new Set(released), [released]);
  const at = (id) => placementOf(level, placements, id);
  const occupied = useMemo(() => occupiedHoles(level, placements), [level, placements]);
  const availableMoves = useMemo(() => legalMoves(level, placements, fallen), [level, placements, fallen]);
  const stored = useMemo(() => trayScrews(level, placements), [level, placements]);
  const remaining = screwIds.filter((id) => at(id) !== level.goals[id].id).length;
  const isDeadEnd = !cleared && !releasing && history.length > 0 && availableMoves.length === 0;

  useEffect(() => () => releaseTimers.current.forEach(clearTimeout), []);
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (data && Number.isInteger(data.level) && data.level >= 0 && data.level < LEVELS.length) {
        const stage = LEVELS[data.level];
        const validDestinations = new Set([...Object.keys(createLocations(stage)), TRAY]);
        const next = Object.entries(data.placements ?? {}).filter(([id, hole]) => stage.screws[id] && validDestinations.has(hole));
        const board = next.filter(([, hole]) => hole !== TRAY);
        if (new Set(board.map(([, hole]) => hole)).size === board.length) {
          setLevelIndex(data.level);
          setPlacements(Object.fromEntries(next));
          setReleased(Array.isArray(data.released) ? data.released.filter((id) => stage.plates.some((plate) => plate.id === id)) : []);
        }
      }
      if (data?.progress?.completed && Number.isInteger(data.progress.unlocked)) setProgress({ completed: data.progress.completed, unlocked: Math.max(1, Math.min(data.progress.unlocked, LEVELS.length)) });
    } catch { /* Start fresh if storage is malformed. */ }
    loaded.current = true;
  }, []);
  useEffect(() => { if (loaded.current) save({ level: levelIndex, placements, released, progress }); }, [levelIndex, placements, released, progress]);
  useEffect(() => {
    if (!isComplete(level, placements, fallen) || cleared) return;
    const moves = history.length;
    const stars = starsFor(level, moves, undoCount);
    setProgress((current) => ({ completed: { ...current.completed, [level.id]: { stars: Math.max(stars, current.completed[level.id]?.stars ?? 0), bestMoves: Math.min(moves, current.completed[level.id]?.bestMoves ?? moves) } }, unlocked: Math.max(current.unlocked, Math.min(levelIndex + 2, LEVELS.length)) }));
    setCleared(true); setMessage("全ネジを格納したわ。機構の解除成功よ。");
  }, [placements, fallen, level, cleared, history.length, undoCount, levelIndex]);

  const visible = (holeId, z) => isVisible(level, locations, fallen, holeId, z);
  const screwLayer = (id) => screwZ(level, placements, fallen, id);
  const holeLayer = (id) => holeZ(level, fallen, id);
  const canMoveTo = (screwId, holeId) => availableMoves.some((move) => move.screwId === screwId && move.holeId === holeId);
  const resetBoard = (index = levelIndex) => { setLevelIndex(index); setPlacements({}); setReleased([]); setHistory([]); setSelected(null); setCleared(false); setUndoCount(0); };

  function choose(id) {
    if (releasing || at(id) === level.goals[id].id) return;
    if (at(id) !== TRAY && !visible(at(id), screwLayer(id))) { setMessage("そのネジは上の板に隠れているわ。"); return; }
    const next = selected === id ? null : id;
    setSelected(next); setMessage(next ? "光る穴へ移すか、回収トレイへ一時置きしなさい。" : "選択を取り消したわ。");
  }
  function move(holeId) {
    if (releasing || !selected || !canMoveTo(selected, holeId)) return;
    const result = applyMove(level, placements, fallen, { screwId: selected, holeId });
    setHistory((current) => [...current, { placements, released }]); setPlacements(result.placements); setSelected(null);
    if (!result.releasedPlateIds.length) { setMessage(holeId === TRAY ? "トレイへ一時置きしたわ。" : holeId.startsWith("goal-") ? "対応する格納穴へ収めたわ。" : "穴を渡したわ。次のネジを選びなさい。"); return; }
    const plateId = result.releasedPlateIds[0];
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const wait = reduced ? 0 : 120, fall = reduced ? 0 : 260, finish = reduced ? 0 : 920;
    setMessage("板を固定するネジがなくなった…！"); setReleasing({ id: plateId, phase: "armed" });
    releaseTimers.current.push(setTimeout(() => setReleasing({ id: plateId, phase: "unlocking" }), wait));
    releaseTimers.current.push(setTimeout(() => setReleasing({ id: plateId, phase: "falling" }), fall));
    releaseTimers.current.push(setTimeout(() => { setReleased([...result.released]); setReleasing(null); window.navigator?.vibrate?.(12); setMessage("板が外れたわ。新しい格納穴を使えるはずよ。"); }, finish));
  }
  function cancelRelease() { releaseTimers.current.forEach(clearTimeout); releaseTimers.current = []; setReleasing(null); }
  function restart() { cancelRelease(); resetBoard(); setMessage("盤面を戻したわ。空き穴を動かして機構をほどきなさい。"); }
  function undo() { if (!history.length || releasing) return; const last = history.at(-1); setPlacements(last.placements); setReleased(last.released); setHistory((current) => current.slice(0, -1)); setSelected(null); setCleared(false); setUndoCount((count) => count + 1); setMessage("一手戻したわ。"); }
  function next() { cancelRelease(); const index = Math.min(levelIndex + 1, LEVELS.length - 1); resetBoard(index); setMessage(`LEVEL ${String(index + 1).padStart(2, "0")}、${LEVELS[index].name}。`); }
  function selectStage(index) { if (index >= progress.unlocked) return; cancelRelease(); resetBoard(index); setShowStages(false); setMessage(`LEVEL ${String(index + 1).padStart(2, "0")}、${LEVELS[index].name}。`); }

  if (showStages) return <section className="screw-puzzle"><div className="sp-shell sp-picker"><p className="sp-kicker sp-mono">SELECT A MECHANISM</p><h1 className="sp-title">ネジ抜き工房</h1><div className="sp-stage-grid">{LEVELS.map((stage, index) => { const result = progress.completed[stage.id]; const locked = index >= progress.unlocked; return <button className="sp-stage-button" disabled={locked} onClick={() => selectStage(index)} key={stage.id}><span>LEVEL {String(index + 1).padStart(2, "0")}</span><b>{locked ? "LOCKED" : stage.name}</b><em>{locked ? "前の機構を解除" : "★".repeat(result?.stars ?? 0) || "未挑戦"}</em></button>; })}</div></div></section>;

  return <section className="screw-puzzle" aria-labelledby="screw-title"><div className="sp-shell">
    <header className="sp-head"><div><p className="sp-kicker sp-mono">SCREW RELEASE</p><h1 id="screw-title" className="sp-title sp-mono">ネジ抜き工房</h1></div><div className="sp-stats"><span className="sp-stat">LEVEL<b>{String(levelIndex + 1).padStart(2, "0")}</b></span><span className="sp-stat">SCREWS<b>{remaining}</b></span><span className="sp-stat">TRAY<b>{stored.length}/{level.trayCapacity}</b></span><span className="sp-stat">DONE<b>{fallen.size}/{level.plates.length}</b></span></div></header>
    <div className="sp-stage"><div className={`sp-board${releasing ? " locking" : ""}`} aria-label={`${level.name}の盤面`}>
      {[...level.plates].sort((a, b) => a.z - b.z).map((plate) => { const phase = releasing?.id === plate.id ? ` ${releasing.phase}` : ""; const towardLeft = plate.x + plate.w / 2 < 50; return <div key={plate.id} className={`sp-plate${plate.color === "wood-mint" ? " movable" : ""}${fallen.has(plate.id) ? " gone" : ""}${phase}`} style={{ left: `${plate.x}%`, top: `${plate.y}%`, width: `${plate.w}%`, height: `${plate.h}%`, "--r": `${plate.r}deg`, "--fall-r": `${plate.r + (towardLeft ? -22 : 22)}deg`, "--plate": `var(--${plate.color})`, transformOrigin: towardLeft ? "left bottom" : "right bottom", zIndex: plate.z * 10 }} />; })}
      {Object.entries(level.goals).map(([screwId, goal]) => { const unlocked = isGoalUnlocked(level, fallen, goal); const filled = at(screwId) === goal.id; return <button key={goal.id} className={`sp-goal${unlocked ? " unlocked" : ""}${filled ? " filled" : ""}`} style={{ left: `${goal.point[0]}%`, top: `${goal.point[1]}%`, "--goal": goal.color, zIndex: 70 }} disabled={!unlocked || filled || !canMoveTo(selected, goal.id)} onClick={() => move(goal.id)} aria-label={`${goal.symbol}の最終格納穴`}>{filled ? goal.symbol : unlocked ? "" : "?"}</button>; })}
      {Object.entries(level.holes).map(([id, [x, y]]) => { const guide = level.holeRules?.[id]?.accepts?.[0]; return !occupied.has(id) && isUsableHole(level, fallen, id) && visible(id, holeLayer(id)) && <button key={id} className={`sp-hole${guide ? " guided" : ""}${selected && canMoveTo(selected, id) ? " available" : ""}`} style={{ left: `${x}%`, top: `${y}%`, zIndex: holeLayer(id), "--guide": guide ? level.screws[guide].color : undefined }} onClick={() => move(id)} disabled={!selected || !canMoveTo(selected, id)} aria-label={guide ? "対応ネジ専用の案内穴" : "空き穴"} />; })}
      {screwIds.filter((id) => at(id) !== TRAY && at(id) !== level.goals[id].id && visible(at(id), screwLayer(id))).map((id) => { const [x, y] = locations[at(id)]; return <button key={id} className={`sp-screw${selected === id ? " selected" : ""}`} style={{ left: `${x}%`, top: `${y}%`, zIndex: screwLayer(id), "--screw": level.screws[id].color }} onClick={() => choose(id)} aria-label={`ネジ ${level.screws[id].symbol}`} />; })}
      {cleared && <div className="sp-veil"><div className="sp-clear-card"><div className="sp-clear-kicker sp-mono">ALL STORED</div><div className="sp-clear-title">レベル {levelIndex + 1} クリア</div><p className="sp-clear-meta sp-mono">{history.length} 手 / プレート {level.plates.length} 枚</p><div className="sp-stars" aria-label={`星${starsFor(level, history.length, undoCount)}つ`}>{`${"★".repeat(starsFor(level, history.length, undoCount))}${"☆".repeat(3 - starsFor(level, history.length, undoCount))}`}</div><div className="sp-controls" style={{ justifyContent: "center" }}><button className="sp-btn" onClick={restart}>もう一度</button>{levelIndex < LEVELS.length - 1 && <button className="sp-btn primary" onClick={next}>次の面へ</button>}</div></div></div>}
    </div></div>
    {level.trayCapacity > 0 && <div className="sp-tray-row"><div className={`sp-tray${selected && canMoveTo(selected, TRAY) ? " available" : ""}`}><button className="sp-tray-drop" onClick={() => move(TRAY)} disabled={!selected || !canMoveTo(selected, TRAY)}><span className="sp-tray-prompt">↧ ネジをここへ一時置き</span><strong>回収トレイ</strong></button><span className="sp-tray-slots" aria-label="回収トレイ">{Array.from({ length: level.trayCapacity }, (_, index) => { const screwId = stored[index]; return screwId ? <button className={`sp-tray-slot filled${selected === screwId ? " selected" : ""}`} key={index} onClick={() => choose(screwId)} style={{ "--screw": level.screws[screwId].color }} aria-label={`トレイ内のネジ ${level.screws[screwId].symbol}`}>{level.screws[screwId].symbol}</button> : <i className="sp-tray-slot" key={index} />; })}</span><b>{stored.length}/{level.trayCapacity}</b></div><span>トレイのネジは、あとで再び穴へ移せます。</span></div>}
    <p className="sp-toast sp-mono" aria-live="polite">{isDeadEnd ? "手詰まり。1手もどしましょう。" : message}</p>
    <div className="sp-controls"><button className="sp-btn" onClick={() => setShowStages(true)}>面を選ぶ</button><button className="sp-btn" onClick={undo} disabled={!history.length}>↶ 1手もどす</button><button className="sp-btn" onClick={() => { const hint = findHint(level, placements, fallen); if (hint) { setSelected(hint.screwId); setMessage("ヒント：光る移動先を選びなさい。"); } }}>ヒント</button><button className="sp-btn" onClick={restart}>やり直す</button></div>
    <p className="sp-help sp-mono">板の穴にネジが残る限り、板は外れません。作業穴・別の板・トレイを使い、空き穴を渡していきなさい。</p>
  </div></section>;
}
