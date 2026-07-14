// Procedural circuit-board track generation. Pure logic, no React Native
// imports, so it can be unit-smoke-tested with plain node.

export interface TrackConfig {
  W: number; // screen width
  laneGap: number; // horizontal distance between adjacent lanes
  rowH: number; // vertical distance of one "row" of circuit
}

export interface Vec {
  x: number;
  y: number;
}

export interface Leg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Orb {
  id: number;
  x: number;
  y: number;
  taken: boolean;
}

export interface Blink {
  period: number; // ms
  onFrac: number; // fraction of period the breaker is lethal
  phase: number; // ms offset
}

export interface Breaker {
  x: number;
  y: number;
  blink?: Blink;
  blown: boolean; // true once the player has crashed into it
}

export interface Branch {
  lane: number; // lane the branch lands in after the fork diagonal
  legs: Leg[]; // geometry the spark rides if this branch is chosen
  poly: Vec[]; // polyline for drawing (same shape as legs)
  deadly: boolean; // ends in a solid breaker
  breaker?: Breaker;
  orbs: Orb[];
}

export interface Fork {
  id: number;
  x: number; // junction point
  y: number;
  gate: 0 | 1; // which branch is currently energized (0 = left)
  resolved: boolean; // spark has passed the junction; gate is locked
  chosen?: 0 | 1;
  branches: [Branch, Branch];
  orbSide: 0 | 1 | null; // branch holding bonus orbs (combo resets if skipped)
  exit: Vec; // where the track continues after this fork
  exitLane: number;
}

export type Section =
  | {
      kind: 'wire';
      startY: number;
      endY: number;
      legs: Leg[];
      poly: Vec[];
      exitLane: number;
    }
  | { kind: 'fork'; startY: number; endY: number; fork: Fork; exitLane: number };

export interface TrackState {
  sections: Section[];
  orbs: Orb[]; // every orb in the world, flat, for collision checks
  endY: number;
  endLane: number;
  nextId: number;
  sinceFork: number; // wire sections emitted since the last fork
  rng: () => number;
}

export const laneX = (cfg: TrackConfig, lane: number) =>
  cfg.W / 2 + (lane - 1) * cfg.laneGap;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isBlinkOn(blink: Blink, tMs: number): boolean {
  const p = ((tMs + blink.phase) % blink.period + blink.period) % blink.period;
  return p < blink.period * blink.onFrac;
}

export function makeTrack(cfg: TrackConfig, seed: number): TrackState {
  const state: TrackState = {
    sections: [],
    orbs: [],
    endY: 0,
    endLane: 1,
    nextId: 1,
    sinceFork: 0,
    rng: mulberry32(seed),
  };
  // Opening grace run so the player can get oriented.
  pushWire(cfg, state, 1, 3);
  return state;
}

function pushWire(cfg: TrackConfig, state: TrackState, toLane: number, rows: number) {
  const x1 = laneX(cfg, state.endLane);
  const x2 = laneX(cfg, toLane);
  const startY = state.endY;
  const endY = startY + rows * cfg.rowH;
  const legs: Leg[] =
    toLane === state.endLane
      ? [{ x1, y1: startY, x2, y2: endY }]
      : [
          { x1, y1: startY, x2, y2: startY + cfg.rowH },
          ...(rows > 1 ? [{ x1: x2, y1: startY + cfg.rowH, x2, y2: endY }] : []),
        ];
  const poly: Vec[] = [{ x: x1, y: startY }, ...legs.map((l) => ({ x: l.x2, y: l.y2 }))];
  state.sections.push({ kind: 'wire', startY, endY, legs, poly, exitLane: toLane });
  state.endY = endY;
  state.endLane = toLane;
  state.sinceFork += 1;
}

function branchTargets(entryLane: number): [number, number] {
  if (entryLane === 0) return [0, 1];
  if (entryLane === 2) return [1, 2];
  return [0, 2];
}

function pushFork(cfg: TrackConfig, state: TrackState, circuit: number) {
  const rng = state.rng;
  const entryLane = state.endLane;
  const y = state.endY;
  const jx = laneX(cfg, entryLane);
  const [tL, tR] = branchTargets(entryLane);

  // Fork flavor probabilities shift as circuits climb.
  const r = rng();
  const phaseAllowed = circuit >= 3;
  let flavor: 'trap' | 'reward' | 'phase';
  if (phaseAllowed) flavor = r < 0.5 ? 'trap' : r < 0.78 ? 'phase' : 'reward';
  else flavor = r < 0.55 ? 'trap' : 'reward';

  const deadlySide: 0 | 1 = rng() < 0.5 ? 0 : 1;
  const specialSide: 0 | 1 = flavor === 'trap' ? deadlySide : rng() < 0.5 ? 0 : 1;

  const mergeLane = flavor === 'trap' ? -1 : rng() < 0.5 ? tL : tR;
  const rowsTall = flavor === 'trap' ? 2 : 3;
  const endY = y + rowsTall * cfg.rowH;

  const makeBranch = (side: 0 | 1): Branch => {
    const t = side === 0 ? tL : tR;
    const bx = laneX(cfg, t);
    const legs: Leg[] = [{ x1: jx, y1: y, x2: bx, y2: y + cfg.rowH }];
    const orbs: Orb[] = [];
    let deadly = false;
    let breaker: Breaker | undefined;

    if (flavor === 'trap' && side === deadlySide) {
      deadly = true;
      const by = y + 1.6 * cfg.rowH;
      legs.push({ x1: bx, y1: y + cfg.rowH, x2: bx, y2: by });
      breaker = { x: bx, y: by, blown: false };
    } else {
      legs.push({ x1: bx, y1: y + cfg.rowH, x2: bx, y2: y + 2 * cfg.rowH });
      if (flavor !== 'trap') {
        const mx = laneX(cfg, mergeLane);
        legs.push({ x1: bx, y1: y + 2 * cfg.rowH, x2: mx, y2: endY });
      }
      if (flavor === 'trap' && rng() < 0.4) {
        orbs.push({ id: state.nextId++, x: bx, y: y + 1.5 * cfg.rowH, taken: false });
      }
      if (flavor === 'reward' && side === specialSide) {
        for (const f of [1.15, 1.5, 1.85]) {
          orbs.push({ id: state.nextId++, x: bx, y: y + f * cfg.rowH, taken: false });
        }
      }
      if (flavor === 'phase' && side === specialSide) {
        breaker = {
          x: bx,
          y: y + 1.5 * cfg.rowH,
          blown: false,
          blink: {
            period: Math.max(700, 1350 - 90 * circuit),
            onFrac: 0.42,
            phase: Math.floor(rng() * 1350),
          },
        };
        for (const f of [1.15, 1.85]) {
          orbs.push({ id: state.nextId++, x: bx, y: y + f * cfg.rowH, taken: false });
        }
      }
    }
    const poly: Vec[] = [{ x: jx, y }, ...legs.map((l) => ({ x: l.x2, y: l.y2 }))];
    state.orbs.push(...orbs);
    return { lane: t, legs, poly, deadly, breaker, orbs };
  };

  const branches: [Branch, Branch] = [makeBranch(0), makeBranch(1)];

  const exitLane =
    flavor === 'trap' ? branches[deadlySide === 0 ? 1 : 0].lane : mergeLane;
  const exit: Vec = { x: laneX(cfg, exitLane), y: endY };

  let orbSide: 0 | 1 | null = null;
  if (flavor !== 'trap') orbSide = specialSide;

  const fork: Fork = {
    id: state.nextId++,
    x: jx,
    y,
    gate: rng() < 0.5 ? 0 : 1,
    resolved: false,
    branches,
    orbSide,
    exit,
    exitLane,
  };
  state.sections.push({ kind: 'fork', startY: y, endY, fork, exitLane });
  state.endY = endY;
  state.endLane = exitLane;
  state.sinceFork = 0;
}

/**
 * Grow the track until it reaches at least `untilY`. Difficulty knobs come
 * from the current circuit number.
 */
export function extendTrack(
  cfg: TrackConfig,
  state: TrackState,
  circuit: number,
  untilY: number,
) {
  let guard = 0;
  while (state.endY < untilY && guard++ < 200) {
    const rng = state.rng;
    // Breathing room between forks shrinks on later circuits.
    const minGap = circuit >= 5 ? 1 : circuit >= 3 ? 1 : 2;
    if (state.sinceFork >= minGap && rng() < 0.75) {
      pushFork(cfg, state, circuit);
    } else {
      // Straight run, occasionally sliding a lane over for visual variety.
      let toLane = state.endLane;
      if (rng() < 0.35) {
        const opts = [state.endLane - 1, state.endLane + 1].filter(
          (l) => l >= 0 && l <= 2,
        );
        toLane = opts[Math.floor(rng() * opts.length)];
      }
      const rows = toLane === state.endLane && rng() < 0.4 ? 2 : 1;
      pushWire(cfg, state, toLane, rows);
      // Loose orb on some straights.
      if (rng() < 0.3) {
        const last = state.sections[state.sections.length - 1];
        state.orbs.push({
          id: state.nextId++,
          x: laneX(cfg, toLane),
          y: last.endY - cfg.rowH / 2,
          taken: false,
        });
      }
    }
  }
}

/** Drop world data far above the camera to keep arrays small. */
export function pruneTrack(state: TrackState, aboveY: number, consumedIx: number): number {
  let removed = 0;
  while (
    state.sections.length > 0 &&
    removed < consumedIx &&
    state.sections[0].endY < aboveY
  ) {
    state.sections.shift();
    removed++;
  }
  if (removed > 0) {
    state.orbs = state.orbs.filter((o) => o.y >= aboveY || !o.taken);
    state.orbs = state.orbs.filter((o) => o.y >= aboveY - 400);
  }
  return removed;
}

export const legLen = (l: Leg) => Math.hypot(l.x2 - l.x1, l.y2 - l.y1);

export const pointOnLeg = (l: Leg, dist: number): Vec => {
  const L = legLen(l);
  const t = L === 0 ? 1 : Math.min(1, dist / L);
  return { x: l.x1 + (l.x2 - l.x1) * t, y: l.y1 + (l.y2 - l.y1) * t };
};
