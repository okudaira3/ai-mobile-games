import { useEffect, useState } from "react";
import { games } from "./data/games";
import WaterSortLab from "./games/water-sort/WaterSortLab";
import ScrewJam from "./games/screw-sort/ScrewJam";
import BusJam from "./games/bus-jam/BusJam";

function useHashRoute() {
  const readRoute = () => window.location.hash || "#/";
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}
function GameList() {
  return (
    <main className="home-shell">
      <section className="hero" aria-labelledby="site-title">
        <p className="eyebrow">PLAYABLE AD GAMES</p>
        <h1 id="site-title">AI Mobile Games</h1>
        <p>広告で見かけたゲームを、ちゃんと遊べるようにする場所</p>
      </section>
      <section className="games-section" aria-labelledby="games-heading">
        <div className="section-heading"><h2 id="games-heading">ゲーム一覧</h2><span>{games.length} GAMES</span></div>
        <div className="game-grid">
          {games.map((game) => (
            <article className={`game-card ${game.accent}`} key={game.id}>
              <div className="card-orb" aria-hidden="true" />
              <p className="card-eyebrow">{game.eyebrow}</p>
              <h3>{game.title}</h3>
              <p className="card-description">{game.description}</p>
              {game.status === "playable" ? <a className="play-button" href={game.route}>プレイする <span aria-hidden="true">→</span></a> : <span className="coming-soon">準備中</span>}
            </article>
          ))}
        </div>
      </section>
      <footer>NEW GAMES ARE GROWING HERE.</footer>
    </main>
  );
}
export default function App() {
  const route = useHashRoute();
  if (route === "#/water-sort") return <main className="water-sort-page"><a className="back-link" href="#/">← ゲーム一覧</a><WaterSortLab /></main>;
  if (route === "#/screw-sort") return <main className="screw-sort-page"><a className="back-link" href="#/">← ゲーム一覧</a><ScrewJam /></main>;
  if (route === "#/bus-jam") return <main className="bus-jam-page"><a className="back-link" href="#/">← ゲーム一覧</a><BusJam /></main>;
  return <GameList />;
}
