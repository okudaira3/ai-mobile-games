import assert from 'node:assert/strict';
import { BOX_SIZE, applyTap, createInitialState, findSolution, isBlocked, isPointInPlate, isSolvable } from '../src/games/screw-sort/screwEngine.js';
import { generateLevel } from '../src/games/screw-sort/levelGenerator.js';

function rotationTests() {
  const base = { id:'p', x:40, y:40, w:20, h:10, z:0 };
  assert(isPointInPlate({ ...base, r:0 }, 40, 45)); assert(!isPointInPlate({ ...base, r:0 }, 39.9, 45));
  assert(isPointInPlate({ ...base, r:45 }, 50, 45)); assert(!isPointInPlate({ ...base, r:45 }, 62, 57));
  assert(isPointInPlate({ ...base, r:-30 }, 50, 45)); assert(!isPointInPlate({ ...base, r:-30 }, 65, 45));
}
function engineTests() {
  const plates=[{id:'a',x:0,y:0,w:100,h:100,r:0,z:0},{id:'b',x:20,y:20,w:60,h:60,r:0,z:1}]; const shared={id:'s',x:10,y:10,color:'r',anchorZ:0}; const level={plates,screws:[shared]};
  let result=applyTap(level,createInitialState(level),'s'); assert.equal(result.state.fallen.length,2,'shared screw releases both plates');
  const flush={plates:[{id:'p',x:0,y:0,w:100,h:100,r:0,z:0}],screws:[{id:'a0',x:10,y:10,color:'a',anchorZ:0},{id:'a1',x:11,y:10,color:'a',anchorZ:0},{id:'a2',x:12,y:10,color:'a',anchorZ:0},{id:'a3',x:13,y:10,color:'a',anchorZ:0}]}; let state=createInitialState(flush); state.boxes[0]={color:'a',screws:['a0','a1']}; state.spare=['a2']; state=applyTap(flush,state,'a3').state;
  assert.equal(state.spare.length,0); assert.equal(state.boxes[0].screws.length,1,'spare flushes after full box resolves');
  const full={plates:[{id:'p',x:0,y:0,w:100,h:100,r:0,z:0}],screws:[...Array(9)].map((_,i)=>({id:`x${i}`,x:10+i,y:10,color:`c${i}`,anchorZ:0}))}; state=createInitialState(full); for(let i=0;i<8;i++) state=applyTap(full,state,`x${i}`).state; assert(applyTap(full,state,'x8').state.gameOver,'no placement sets game over');
}
rotationTests(); engineTests();
let minimumDistance = Infinity; const plateSizes = new Set();
for (let number=1;number<=60;number+=1) {
  const start=performance.now(), a=generateLevel(number), b=generateLevel(number), elapsed=performance.now()-start;
  assert.deepEqual(a,b,`level ${number} deterministic`); assert(elapsed<500,`level ${number} generated in ${elapsed}ms`);
  const initial=createInitialState(a), blocked=a.screws.filter(s=>isBlocked(a,initial,s)).length;
  assert(blocked/a.screws.length>=.3,`level ${number} blocked ${blocked}/${a.screws.length}`);
  const counts={}; a.screws.forEach(s=>counts[s.color]=(counts[s.color]||0)+1); Object.values(counts).forEach(n=>assert.equal(n%3,0,`level ${number} color count`));
  a.plates.forEach((p)=>{ plateSizes.add(`${p.w}x${p.h}`); assert(p.x>=0&&p.y>=0&&p.x+p.w<=100&&p.y+p.h<=100,`level ${number} plate bounds`); });
  for(let i=0;i<a.screws.length;i++) for(let j=i+1;j<a.screws.length;j++) if(a.screws[i].anchorZ===a.screws[j].anchorZ){ const distance=Math.hypot(a.screws[i].x-a.screws[j].x,a.screws[i].y-a.screws[j].y); minimumDistance=Math.min(minimumDistance,distance); assert(distance>=13,`level ${number} same-layer spacing ${distance}`); }
  assert(isSolvable(a),`level ${number} solvable`);
  if ([1,20,60].includes(number)) { let state=initial; const route=findSolution(a); assert(route,`level ${number} route`); route.forEach((id)=>{state=applyTap(a,state,id).state;}); assert(state.cleared,`level ${number} engine playthrough`); }
  console.log(`L${String(number).padStart(2,'0')} ok: ${a.screws.length} screws, blocked ${blocked}/${a.screws.length}, ${elapsed.toFixed(1)}ms`);
}
assert(plateSizes.size>=20,`plate size variety ${plateSizes.size}`);
console.log(`Metrics: min same-layer screw distance ${minimumDistance.toFixed(2)}%, plate sizes ${plateSizes.size}.`);
console.log('Engine geometry, shared fastener, holder flush, game-over, and L1/L20/L60 playthrough tests passed.');
