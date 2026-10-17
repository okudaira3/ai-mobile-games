import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./BusJam.css";

const COLORS = [0xf56b6b, 0x55b5f5, 0x77d78a];
const BUSES = [
  { id: 0, color: 0, x: -2.7, z: -1.8 },
  { id: 1, color: 1, x: 0, z: -1.8 },
  { id: 2, color: 2, x: 2.7, z: -1.8 },
  { id: 3, color: 1, x: -2.7, z: 1.4 },
  { id: 4, color: 2, x: 0, z: 1.4 },
  { id: 5, color: 0, x: 2.7, z: 1.4 },
];
const ORDER = [0, 1, 2, 1, 2, 0];
const CAPACITY = 3;
const WAITING_LIMIT = 3;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function box(w, h, d, color, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material || new THREE.MeshStandardMaterial({ color, roughness: 0.65 }));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
function makeBus(color) {
  const group = new THREE.Group();
  group.add(box(1.22, .58, 1.9, COLORS[color], 0, .58, 0));
  group.add(box(1.05, .38, 1.25, 0xeaf8ff, 0, 1.04, -.12));
  group.add(box(.95, .28, .09, 0x334866, 0, .72, -.98));
  for (const x of [-.65, .65]) for (const z of [-.58, .58]) group.add(box(.14, .36, .38, 0x26344c, x, .34, z));
  group.add(box(.2, .13, .1, 0xfff2ae, -.42, .5, -1));
  group.add(box(.2, .13, .1, 0xfff2ae, .42, .5, -1));
  return group;
}
function makePerson(color) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: COLORS[color], roughness: .65 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffd9b8 }));
  head.position.y = .7; group.add(head);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(.17, .2, .38, 10), mat);
  torso.position.y = .37; group.add(torso);
  for (const x of [-.09, .09]) group.add(box(.09, .25, .1, 0x52617c, x, .11, 0));
  return group;
}
function tween(object, target, duration, update, valid) {
  return new Promise(resolve => {
    const from = object.position.clone();
    const start = performance.now();
    const tick = now => {
      if (!valid()) return resolve();
      const t = Math.min(1, (now - start) / duration);
      const eased = t * t * (3 - 2 * t);
      object.position.lerpVectors(from, target, eased);
      if (update) update(t);
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}
export default function BusJam() {
  const mount = useRef(null);
  const engine = useRef(null);
  const generation = useRef(0);
  const [state, setState] = useState({ remaining: BUSES.length, passengers: ORDER.length * CAPACITY, waiting: 0, busy: false, done: false, hint: "バスをタップして出発させよう！" });
  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe6f3ff);
    const camera = new THREE.PerspectiveCamera(37, 1, .1, 100);
    camera.position.set(12, 17, 21); camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9bb5cf, 2.3));
    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.set(-6, 15, 10); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18;
    scene.add(sun);
    scene.add(box(14, .2, 15, 0xc6e8cb, 0, -.15, 0));
    scene.add(box(9, .05, 8, 0x9faec1, 0, 0, .2));
    scene.add(box(9, .06, 2.1, 0x6d819d, 0, .03, -5.2));
    scene.add(box(9, .06, 2.1, 0xf5e6ba, 0, .03, -8));
    for (const x of [-1.35, 1.35]) scene.add(box(.06, .04, 7.6, 0xe9f1f8, x, .07, .2));
    for (const z of [-3.4, -.1, 3.0]) scene.add(box(8.6, .04, .06, 0xe9f1f8, 0, .07, z));
    const buses = BUSES.map(spec => {
      const model = makeBus(spec.color);
      model.position.set(spec.x, 0, spec.z);
      scene.add(model);
      return { ...spec, model, status: "parked", seats: 0 };
    });
    const queue = ORDER.flatMap(color => Array(CAPACITY).fill(color));
    const people = queue.map((color, i) => {
      const model = makePerson(color);
      model.position.set(-4.1 + (i % 9) * 1.02, 0, -8.05 - Math.floor(i / 9) * .85);
      scene.add(model);
      return { color, model };
    });
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clock = new THREE.Clock();
    const active = { running: true, busy: false, queue, people, buses, waiting: [], served: 0 };
    const valid = () => active.running;
    const sync = (hint) => {
      if (!valid()) return;
      setState({ remaining: buses.filter(b => b.status === "parked").length, passengers: active.queue.length, waiting: active.waiting.length, busy: active.busy, done: active.queue.length === 0, hint });
    };
    async function board(bus) {
      while (valid() && active.queue[0] === bus.color && bus.seats < CAPACITY) {
        const person = active.people.shift();
        active.queue.shift();
        const target = new THREE.Vector3(bus.model.position.x - .72, 0, bus.model.position.z + .25);
        await tween(person.model, target, 360, null, valid);
        if (!valid()) return;
        await tween(person.model, bus.model.position.clone().add(new THREE.Vector3(-.15, .45, 0)), 260, t => { person.model.scale.setScalar(1 - t * .85); }, valid);
        scene.remove(person.model);
        bus.seats++;
        sync("乗車中！ " + bus.seats + "/" + CAPACITY);
      }
      if (bus.seats === CAPACITY) {
        active.waiting = active.waiting.filter(b => b !== bus);
        await tween(bus.model, new THREE.Vector3(9, 0, -5.2), 850, null, valid);
        scene.remove(bus.model);
        bus.status = "departed";
        sync("満員！ 出発！");
      }
    }
    async function tap(bus) {
      if (active.busy || bus.status !== "parked") return;
      if (active.waiting.length >= WAITING_LIMIT) return sync("乗り場がいっぱい！ 最初からやり直そう");
      if (buses.some(b => b.status === "parked" && b.x === bus.x && b.z < bus.z)) return sync("前にバスがいるよ！");
      active.busy = true;
      bus.status = "moving";
      sync("バスが出発！");
      bus.model.scale.setScalar(1.08);
      await tween(bus.model, new THREE.Vector3(bus.x, 0, -5.2), 520, null, valid);
      bus.model.scale.setScalar(1);
      if (!valid()) return;
      const bayIndex = active.waiting.length;
      await tween(bus.model, new THREE.Vector3(-2.7 + bayIndex * 2.7, 0, -5.2), 480, null, valid);
      bus.status = "waiting";
      active.waiting.push(bus);
      // The first bus of the correct color boards. Other waiting buses stay visible.
      let found = true;
      while (valid() && found) {
        found = false;
        const matching = active.waiting.find(b => b.color === active.queue[0]);
        if (matching) { found = true; await board(matching); }
      }
      active.busy = false;
      sync(active.queue.length ? "次のバスを選ぼう！" : "クリア！ おめでとう！");
    }
    const onPointer = event => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const parked = buses.filter(b => b.status === "parked");
      const hits = raycaster.intersectObjects(parked.map(b => b.model), true);
      if (!hits.length) return;
      const bus = parked.find(b => { let obj = hits[0].object; while (obj.parent && obj !== b.model) obj = obj.parent; return obj === b.model; });
      if (bus) tap(bus);
    };
    renderer.domElement.addEventListener("pointerdown", onPointer);
    const resize = () => { const w = host.clientWidth, h = host.clientHeight; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    let frame;
    const animate = () => { frame = requestAnimationFrame(animate); const elapsed = clock.getElapsedTime(); for (const bus of buses) if (bus.status === "parked") bus.model.position.y = Math.sin(elapsed * 2 + bus.id) * .015; renderer.render(scene, camera); };
    animate();
    engine.current = { reset: () => { generation.current++; }, sync };
    return () => {
      active.running = false;
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointer);
      cancelAnimationFrame(frame);
      scene.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => m.dispose());
      });
      renderer.dispose();
      if (host.contains(renderer.domElement)) host.removeChild(renderer.domElement);
      engine.current = null;
    };
  }, [generation.current]);
  const reset = () => { setState({ remaining: BUSES.length, passengers: ORDER.length * CAPACITY, waiting: 0, busy: false, done: false, hint: "もう一度遊ぼう！" }); generation.current++; forceReset(n => n + 1); };
  const [, forceReset] = useState(0);
  return <section className="bj3-root">
    <header className="bj3-header"><div><span>MINIATURE BUS PUZZLE</span><h1>Bus Jam 3D</h1></div><span className="bj3-pill">STAGE 01</span></header>
    <div className="bj3-stats"><span>乗客 <b>{state.passengers}</b></span><span>駐車中 <b>{state.remaining}</b></span><span>乗り場 <b>{state.waiting}/3</b></span></div>
    <div className="bj3-scene" ref={mount} role="application" aria-label="3Dのバス駐車場。バスをタップして出発させる" />
    <p className="bj3-hint" aria-live="polite">{state.done ? "全員乗車！ クリア！" : state.hint}</p>
    <div className="bj3-actions"><button onClick={reset}>↻ 最初から遊ぶ</button></div>
    <p className="bj3-note">まずは1ステージの3D試作。バスが走り、乗客が歩いて乗り込むよ。</p>
  </section>;
}
