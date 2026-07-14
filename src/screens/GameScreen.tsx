import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Line, Polygon, Polyline } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  DANGER,
  FORK_SCORE,
  MAX_MULTIPLIER,
  ORB_SCORE,
  PALETTES,
  STARTING_FUSES,
  WHITE,
  forksToClear,
  speedForCircuit,
} from '../game/constants';
import {
  Breaker,
  Fork,
  Leg,
  Section,
  TrackConfig,
  TrackState,
  Vec,
  extendTrack,
  isBlinkOn,
  legLen,
  makeTrack,
  pointOnLeg,
  pruneTrack,
} from '../game/track';

const { width: W, height: H } = Dimensions.get('window');
const CFG: TrackConfig = { W, laneGap: W * 0.28, rowH: 132 };
const CAMERA_ANCHOR = H * 0.32; // spark sits this far from the top of the screen
const ORB_RADIUS = 28;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // seconds remaining
  max: number;
  color: string;
  r: number;
}

interface GameState {
  track: TrackState;
  consumeIx: number; // next section index to feed into the spark's path
  legs: Leg[];
  legIx: number;
  legPos: number; // distance along current leg
  spark: Vec;
  deathFork: Fork | null; // set while riding a branch that ends in a solid breaker
  blinkWatch: Breaker | null; // blinking breaker on the branch being ridden
  circuit: number;
  forksThisCircuit: number;
  score: number;
  combo: number;
  fuses: number;
  invulnUntil: number;
  status: 'playing' | 'over';
  overAt: number;
  startedAt: number;
  now: number;
  banner: { text: string; sub: string; until: number } | null;
  shake: number;
  trail: Vec[];
  particles: Particle[];
  hintUntil: number;
}

function freshGame(): GameState {
  const t = Date.now();
  return {
    track: makeTrack(CFG, Math.floor(Math.random() * 2 ** 31)),
    consumeIx: 0,
    legs: [],
    legIx: 0,
    legPos: 0,
    spark: { x: W / 2, y: 0 },
    deathFork: null,
    blinkWatch: null,
    circuit: 1,
    forksThisCircuit: 0,
    score: 0,
    combo: 0,
    fuses: STARTING_FUSES,
    invulnUntil: 0,
    status: 'playing',
    overAt: 0,
    startedAt: t,
    now: t,
    banner: { text: 'CIRCUIT 1', sub: PALETTES[0].name, until: t + 2000 },
    shake: 0,
    trail: [],
    particles: [],
    hintUntil: t + 4500,
  };
}

const multiplier = (combo: number) =>
  Math.min(MAX_MULTIPLIER, 1 + Math.floor(combo / 3));

function burst(g: GameState, x: number, y: number, color: string, n: number, speed: number) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    g.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0.5 + Math.random() * 0.4,
      max: 0.9,
      color,
      r: 2 + Math.random() * 3,
    });
  }
  if (g.particles.length > 90) g.particles.splice(0, g.particles.length - 90);
}

function loseFuse(g: GameState, at: Vec) {
  g.fuses -= 1;
  g.shake = 1;
  g.combo = 0;
  g.invulnUntil = g.now + 1200;
  burst(g, at.x, at.y, DANGER, 18, 260);
  burst(g, at.x, at.y, WHITE, 8, 180);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  if (g.fuses <= 0) {
    g.status = 'over';
    g.overAt = g.now;
  }
}

/** Feed the next section's geometry into the spark's leg queue. */
function pullSection(g: GameState): boolean {
  const s = g.track.sections[g.consumeIx];
  if (!s) return false;
  g.consumeIx += 1;
  if (s.kind === 'wire') {
    g.legs.push(...s.legs);
    return true;
  }
  const f = s.fork;
  f.resolved = true;
  f.chosen = f.gate;
  const br = f.branches[f.gate];
  g.legs.push(...br.legs);
  if (br.deadly) g.deathFork = f;
  if (br.breaker?.blink) g.blinkWatch = br.breaker;

  // Score the fork pass; skipping the orb branch resets the combo.
  g.score += FORK_SCORE + 10 * (g.circuit - 1);
  if (f.orbSide !== null && f.orbSide !== f.gate) g.combo = 0;

  g.forksThisCircuit += 1;
  if (g.forksThisCircuit >= forksToClear(g.circuit)) {
    g.circuit += 1;
    g.forksThisCircuit = 0;
    const pal = PALETTES[(g.circuit - 1) % PALETTES.length];
    g.banner = {
      text: `CIRCUIT ${g.circuit}`,
      sub: pal.name,
      until: g.now + 2200,
    };
    g.score += 100 * g.circuit;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
  return true;
}

function step(g: GameState, dtMs: number) {
  const dt = Math.min(dtMs, 34) / 1000;
  g.now += dtMs;
  if (g.status !== 'playing') {
    updateParticles(g, dt);
    g.shake = Math.max(0, g.shake - dt * 2.2);
    return;
  }

  // Ramp speed in over the first two seconds of a run.
  const ramp = Math.min(1, 0.35 + (g.now - g.startedAt) / 2000);
  const speed = speedForCircuit(g.circuit) * ramp;

  // Keep track generated well past the screen.
  const camY = g.spark.y - CAMERA_ANCHOR;
  if (g.track.endY < camY + H * 1.8) {
    extendTrack(CFG, g.track, g.circuit, camY + H * 2.2);
  }

  let d = speed * dt;
  let guard = 0;
  while (d > 0 && guard++ < 40) {
    const leg = g.legs[g.legIx];
    if (!leg) {
      if (g.deathFork) {
        // Reached the end of a deadly branch: the breaker.
        const f = g.deathFork;
        const br = f.branches[f.chosen ?? f.gate].breaker;
        if (br) br.blown = true;
        g.deathFork = null;
        loseFuse(g, { ...g.spark });
        if (g.fuses <= 0) return;
        // Relocate to the safe continuation point.
        g.spark = { ...f.exit };
        g.legs = [];
        g.legIx = 0;
        g.legPos = 0;
        continue;
      }
      if (!pullSection(g)) break;
      continue;
    }
    const L = legLen(leg);
    const remain = L - g.legPos;
    if (d < remain) {
      g.legPos += d;
      d = 0;
    } else {
      d -= remain;
      g.legIx += 1;
      g.legPos = 0;
    }
    const cur = g.legs[g.legIx];
    const p = cur ? pointOnLeg(cur, g.legPos) : { x: leg.x2, y: leg.y2 };
    g.spark = p;
  }

  // Trim consumed legs so the queue stays small.
  if (g.legIx > 24) {
    g.legs.splice(0, g.legIx);
    g.legIx = 0;
  }

  // Blinking breaker contact check.
  if (g.blinkWatch) {
    const b = g.blinkWatch;
    if (g.spark.y > b.y + 24) {
      g.blinkWatch = null;
    } else if (
      g.now > g.invulnUntil &&
      b.blink &&
      !b.blown &&
      Math.abs(g.spark.y - b.y) < 14 &&
      Math.abs(g.spark.x - b.x) < 14 &&
      isBlinkOn(b.blink, g.now)
    ) {
      loseFuse(g, { x: b.x, y: b.y });
      if (g.fuses <= 0) return;
    }
  }

  // Orb collection.
  const pal = PALETTES[(g.circuit - 1) % PALETTES.length];
  for (const o of g.track.orbs) {
    if (o.taken || Math.abs(o.y - g.spark.y) > ORB_RADIUS + 8) continue;
    if (Math.hypot(o.x - g.spark.x, o.y - g.spark.y) < ORB_RADIUS) {
      o.taken = true;
      g.combo += 1;
      g.score += ORB_SCORE * multiplier(g.combo);
      burst(g, o.x, o.y, pal.accent, 10, 200);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }

  // Trail.
  g.trail.push({ ...g.spark });
  if (g.trail.length > 11) g.trail.shift();

  updateParticles(g, dt);
  g.shake = Math.max(0, g.shake - dt * 2.2);

  const removed = pruneTrack(g.track, camY - 400, g.consumeIx);
  g.consumeIx -= removed;
}

function updateParticles(g: GameState, dt: number) {
  for (const p of g.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.life -= dt;
  }
  g.particles = g.particles.filter((p) => p.life > 0);
}

/** Glow stroke helper: layered polylines from wide/faint to thin/bright. */
function GlowLine({
  pts,
  color,
  bright,
}: {
  pts: Vec[];
  color: string;
  bright: boolean;
}) {
  const str = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return (
    <>
      {bright && (
        <Polyline
          points={str}
          stroke={color}
          strokeWidth={11}
          strokeOpacity={0.14}
          fill="none"
          strokeLinejoin="round"
        />
      )}
      <Polyline
        points={str}
        stroke={color}
        strokeWidth={bright ? 5 : 3.5}
        strokeOpacity={bright ? 0.4 : 0.5}
        fill="none"
        strokeLinejoin="round"
      />
      <Polyline
        points={str}
        stroke={bright ? WHITE : color}
        strokeWidth={bright ? 2 : 1.4}
        strokeOpacity={bright ? 0.95 : 0.8}
        fill="none"
        strokeLinejoin="round"
      />
    </>
  );
}

function BreakerMark({ b, now, blownOut }: { b: Breaker; now: number; blownOut: boolean }) {
  const s = 13;
  let opacity = 1;
  let warn = false;
  if (b.blink && !b.blown) {
    const on = isBlinkOn(b.blink, now);
    opacity = on ? 1 : 0.16;
    warn = on;
  }
  const color = b.blown || blownOut ? '#5A5A6E' : DANGER;
  return (
    <>
      {warn && (
        <Circle cx={b.x} cy={b.y} r={20} stroke={DANGER} strokeOpacity={0.35} strokeWidth={3} fill="none" />
      )}
      <Circle cx={b.x} cy={b.y} r={16} stroke={color} strokeOpacity={0.25 * opacity} strokeWidth={6} fill="none" />
      <Circle cx={b.x} cy={b.y} r={16} stroke={color} strokeOpacity={0.9 * opacity} strokeWidth={2} fill="none" />
      <Line x1={b.x - s} y1={b.y - s} x2={b.x + s} y2={b.y + s} stroke={color} strokeWidth={3.5} strokeOpacity={opacity} />
      <Line x1={b.x - s} y1={b.y + s} x2={b.x + s} y2={b.y - s} stroke={color} strokeWidth={3.5} strokeOpacity={opacity} />
    </>
  );
}

/** Chevron on the energized branch of an unresolved fork. */
function GateChevron({ fork, color }: { fork: Fork; color: string }) {
  const leg = fork.branches[fork.gate].legs[0];
  const mx = leg.x1 + (leg.x2 - leg.x1) * 0.55;
  const my = leg.y1 + (leg.y2 - leg.y1) * 0.55;
  const ang = Math.atan2(leg.y2 - leg.y1, leg.x2 - leg.x1);
  const pts: Vec[] = [
    { x: 12, y: 0 },
    { x: -7, y: -8 },
    { x: -7, y: 8 },
  ].map((p) => ({
    x: mx + p.x * Math.cos(ang) - p.y * Math.sin(ang),
    y: my + p.x * Math.sin(ang) + p.y * Math.cos(ang),
  }));
  return (
    <Polygon
      points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
      fill={color}
      fillOpacity={0.95}
    />
  );
}

interface Props {
  best: { score: number; circuit: number };
  onGameOver: (score: number, circuit: number) => void;
  onHome: () => void;
}

export default function GameScreen({ best, onGameOver, onHome }: Props) {
  const gref = useRef<GameState>(freshGame());
  const [, setTick] = useState(0);
  const reportedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let last = Date.now();
    let raf = 0;
    const frame = () => {
      if (!mounted) return;
      const t = Date.now();
      const dt = t - last;
      last = t;
      const g = gref.current;
      step(g, dt);
      if (g.status === 'over' && !reportedRef.current) {
        reportedRef.current = true;
        onGameOver(g.score, g.circuit);
      }
      setTick((x) => x + 1);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
    };
  }, [onGameOver]);

  const g = gref.current;
  const pal = PALETTES[(g.circuit - 1) % PALETTES.length];
  const camY = g.spark.y - CAMERA_ANCHOR;
  const shakeX = g.shake > 0 ? (Math.random() - 0.5) * 16 * g.shake : 0;
  const shakeY = g.shake > 0 ? (Math.random() - 0.5) * 16 * g.shake : 0;

  const onTap = () => {
    if (g.status !== 'playing') return;
    for (let i = g.consumeIx; i < g.track.sections.length; i++) {
      const s = g.track.sections[i];
      if (s.kind === 'fork' && !s.fork.resolved) {
        s.fork.gate = s.fork.gate === 0 ? 1 : 0;
        Haptics.selectionAsync().catch(() => {});
        break;
      }
    }
  };

  const restart = () => {
    reportedRef.current = false;
    gref.current = freshGame();
  };

  // ---- Build visible scene ----
  const visible: Section[] = [];
  for (const s of g.track.sections) {
    if (s.endY < camY - 60 || s.startY > camY + H + 60) continue;
    visible.push(s);
  }

  const gridLines = useMemo(() => {
    return [0, 1, 2].map((l) => W / 2 + (l - 1) * CFG.laneGap);
  }, []);
  const gridTop = Math.floor(camY / CFG.rowH) * CFG.rowH;
  const hRows: number[] = [];
  for (let y = gridTop; y < camY + H + CFG.rowH; y += CFG.rowH) hRows.push(y);

  const invuln = g.now < g.invulnUntil;
  const sparkFlicker = invuln ? (Math.floor(g.now / 90) % 2 === 0 ? 0.35 : 1) : 1;
  const bannerAlpha = g.banner
    ? Math.max(0, Math.min(1, (g.banner.until - g.now) / 500))
    : 0;
  const orbPulse = 1 + 0.18 * Math.sin(g.now / 130);

  return (
    <Pressable style={[styles.root, { backgroundColor: pal.bg }]} onPress={onTap}>
      <Svg
        width={W}
        height={H}
        style={{ transform: [{ translateX: shakeX }, { translateY: shakeY }] }}
      >
        {/* faint circuit-board grid */}
        {gridLines.map((x, i) => (
          <Line key={`v${i}`} x1={x} y1={0} x2={x} y2={H} stroke={pal.grid} strokeWidth={1} />
        ))}
        {hRows.map((y) => (
          <Line
            key={`h${y}`}
            x1={0}
            y1={y - camY}
            x2={W}
            y2={y - camY}
            stroke={pal.grid}
            strokeWidth={1}
          />
        ))}

        {/* world, camera-shifted */}
        {visible.map((s, si) => {
          if (s.kind === 'wire') {
            const pts = s.poly.map((p) => ({ x: p.x, y: p.y - camY }));
            return <GlowLine key={`w${si}-${s.startY}`} pts={pts} color={pal.primary} bright />;
          }
          const f = s.fork;
          return (
            <React.Fragment key={`f${f.id}`}>
              {f.branches.map((br, bi) => {
                const active = f.resolved ? f.chosen === bi : f.gate === bi;
                const pts = br.poly.map((p) => ({ x: p.x, y: p.y - camY }));
                return (
                  <GlowLine
                    key={bi}
                    pts={pts}
                    color={active ? pal.primary : pal.dim}
                    bright={active}
                  />
                );
              })}
              {!f.resolved && <GateChevron fork={{ ...f, branches: [
                { ...f.branches[0], legs: f.branches[0].legs.map((l) => ({ ...l, y1: l.y1 - camY, y2: l.y2 - camY })) },
                { ...f.branches[1], legs: f.branches[1].legs.map((l) => ({ ...l, y1: l.y1 - camY, y2: l.y2 - camY })) },
              ] }} color={pal.accent} />}
              {f.branches.map((br, bi) =>
                br.breaker ? (
                  <BreakerMark
                    key={`b${bi}`}
                    b={{ ...br.breaker, y: br.breaker.y - camY }}
                    now={g.now}
                    blownOut={br.breaker.blown}
                  />
                ) : null,
              )}
            </React.Fragment>
          );
        })}

        {/* orbs */}
        {g.track.orbs.map((o) => {
          if (o.taken || o.y < camY - 40 || o.y > camY + H + 40) return null;
          const y = o.y - camY;
          return (
            <React.Fragment key={o.id}>
              <Circle cx={o.x} cy={y} r={11 * orbPulse} fill={pal.accent} fillOpacity={0.18} />
              <Circle cx={o.x} cy={y} r={6.5} fill={pal.accent} fillOpacity={0.85} />
              <Circle cx={o.x} cy={y} r={2.6} fill={WHITE} />
            </React.Fragment>
          );
        })}

        {/* spark trail */}
        {g.trail.map((p, i) => {
          const f = (i + 1) / g.trail.length;
          return (
            <Circle
              key={`t${i}`}
              cx={p.x}
              cy={p.y - camY}
              r={1.5 + 6 * f}
              fill={pal.primary}
              fillOpacity={0.08 + 0.2 * f}
            />
          );
        })}

        {/* the spark */}
        {g.status === 'playing' && (
          <>
            <Circle cx={g.spark.x} cy={g.spark.y - camY} r={17} fill={pal.primary} fillOpacity={0.16 * sparkFlicker} />
            <Circle cx={g.spark.x} cy={g.spark.y - camY} r={9.5} fill={pal.primary} fillOpacity={0.45 * sparkFlicker} />
            <Circle cx={g.spark.x} cy={g.spark.y - camY} r={4.5} fill={WHITE} fillOpacity={sparkFlicker} />
          </>
        )}

        {/* particles */}
        {g.particles.map((p, i) => (
          <Circle
            key={`p${i}`}
            cx={p.x}
            cy={p.y - camY}
            r={p.r}
            fill={p.color}
            fillOpacity={Math.max(0, p.life / p.max)}
          />
        ))}
      </Svg>

      {/* HUD */}
      <View style={styles.hudTop} pointerEvents="none">
        <View style={styles.hudSide}>
          <Text style={[styles.circuitLabel, { color: pal.primary }]}>
            CIRCUIT {g.circuit}
          </Text>
          <Text style={styles.circuitSub}>
            {g.forksThisCircuit}/{forksToClear(g.circuit)}
          </Text>
        </View>
        <View style={styles.hudCenter}>
          <Text style={[styles.score, { textShadowColor: pal.primary }]}>
            {g.score}
          </Text>
          {g.combo >= 3 && (
            <Text style={[styles.mult, { color: pal.accent }]}>
              x{multiplier(g.combo)}
            </Text>
          )}
        </View>
        <View style={[styles.hudSide, styles.fuseRow]}>
          {Array.from({ length: STARTING_FUSES }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.fuse,
                {
                  backgroundColor: i < g.fuses ? pal.accent : '#2A2A38',
                  shadowColor: pal.accent,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* tutorial hint */}
      {g.status === 'playing' && g.now < g.hintUntil && (
        <View style={styles.hint} pointerEvents="none">
          <Text style={[styles.hintText, { color: pal.primary }]}>
            TAP ANYWHERE — flip the switch at the next fork
          </Text>
          <Text style={styles.hintSub}>
            ride the bright wire · avoid <Text style={{ color: DANGER }}>✕</Text> · grab orbs
          </Text>
        </View>
      )}

      {/* circuit banner */}
      {g.banner && g.now < g.banner.until && (
        <View style={styles.banner} pointerEvents="none">
          <Text
            style={[
              styles.bannerText,
              { color: pal.primary, opacity: bannerAlpha, textShadowColor: pal.primary },
            ]}
          >
            {g.banner.text}
          </Text>
          <Text style={[styles.bannerSub, { color: pal.accent, opacity: bannerAlpha }]}>
            {g.banner.sub}
          </Text>
        </View>
      )}

      {/* game over */}
      {g.status === 'over' && g.now > g.overAt + 500 && (
        <View style={styles.overWrap}>
          <Text style={[styles.overTitle, { color: DANGER, textShadowColor: DANGER }]}>
            FUSE BLOWN
          </Text>
          <Text style={styles.overScore}>{g.score}</Text>
          <Text style={styles.overMeta}>
            reached circuit {g.circuit}
            {'\n'}best {Math.max(best.score, g.score)}
          </Text>
          <TouchableOpacity style={[styles.btn, { borderColor: pal.primary }]} onPress={restart}>
            <Text style={[styles.btnText, { color: pal.primary }]}>RE-CHARGE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} onPress={onHome}>
            <Text style={styles.btnGhostText}>HOME</Text>
          </TouchableOpacity>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hudTop: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
  },
  hudSide: { width: 92 },
  hudCenter: { flex: 1, alignItems: 'center' },
  circuitLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  circuitSub: { fontSize: 11, color: '#8890B0', fontWeight: '700', marginTop: 2 },
  score: {
    fontSize: 40,
    fontWeight: '900',
    color: WHITE,
    letterSpacing: 1,
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
    fontVariant: ['tabular-nums'],
  },
  mult: { fontSize: 16, fontWeight: '900', marginTop: -2, letterSpacing: 1 },
  fuseRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    paddingTop: 8,
  },
  fuse: { width: 12, height: 22, borderRadius: 4 },
  hint: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  hintSub: { fontSize: 13, color: '#9AA2C0', marginTop: 6, fontWeight: '600' },
  banner: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bannerText: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowRadius: 24,
    textShadowOffset: { width: 0, height: 0 },
  },
  bannerSub: { fontSize: 16, fontWeight: '800', letterSpacing: 6, marginTop: 4 },
  overWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,2,14,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overTitle: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowRadius: 22,
    textShadowOffset: { width: 0, height: 0 },
  },
  overScore: {
    fontSize: 64,
    fontWeight: '900',
    color: WHITE,
    marginTop: 12,
    fontVariant: ['tabular-nums'],
  },
  overMeta: {
    color: '#9AA2C0',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
    fontWeight: '600',
  },
  btn: {
    marginTop: 34,
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 44,
    paddingVertical: 14,
  },
  btnText: { fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  btnGhost: { marginTop: 16, padding: 10 },
  btnGhostText: {
    color: '#8890B0',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
