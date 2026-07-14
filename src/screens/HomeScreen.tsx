import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { PALETTES } from '../game/constants';
import { ScoreRow, fetchTopScores } from '../game/leaderboard';

const { width: W, height: H } = Dimensions.get('window');
const pal = PALETTES[0];

// Decorative zigzag wire behind the title.
const zig: { x: number; y: number }[] = [];
{
  let x = W * 0.18;
  for (let i = 0; i <= 8; i++) {
    zig.push({ x, y: H * 0.12 + i * (H * 0.09) });
    x = i % 2 === 0 ? W * 0.82 : W * 0.18;
  }
}
const zigStr = zig.map((p) => `${p.x},${p.y}`).join(' ');

interface Props {
  best: { score: number; circuit: number };
  onPlay: () => void;
}

export default function HomeScreen({ best, onPlay }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [board, setBoard] = useState<ScoreRow[] | null>(null);

  useEffect(() => {
    fetchTopScores(5)
      .then(setBoard)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  return (
    <Pressable style={styles.root} onPress={onPlay}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Polyline points={zigStr} stroke={pal.primary} strokeOpacity={0.07} strokeWidth={10} fill="none" strokeLinejoin="round" />
        <Polyline points={zigStr} stroke={pal.primary} strokeOpacity={0.18} strokeWidth={3} fill="none" strokeLinejoin="round" />
        {zig.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={pal.primary} fillOpacity={0.25} />
        ))}
        <Line x1={0} y1={H * 0.78} x2={W} y2={H * 0.78} stroke={pal.grid} strokeWidth={1} />
      </Svg>

      <View style={styles.center}>
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: glow,
              transform: [{ scale }],
              textShadowColor: pal.primary,
            },
          ]}
        >
          LIVEWIRE
        </Animated.Text>
        <Text style={styles.tag}>ride the current · flip the forks</Text>

        <View style={styles.rules}>
          <Text style={styles.rule}>
            <Text style={{ color: pal.primary, fontWeight: '900' }}>TAP</Text> anywhere to
            switch the next fork
          </Text>
          <Text style={styles.rule}>
            follow the <Text style={{ color: pal.primary, fontWeight: '900' }}>bright wire</Text>,
            dodge <Text style={{ color: '#FF3355', fontWeight: '900' }}>✕</Text> blown fuses
          </Text>
          <Text style={styles.rule}>
            grab <Text style={{ color: pal.accent, fontWeight: '900' }}>● charge orbs</Text> to
            stack your multiplier
          </Text>
        </View>

        <Animated.View style={[styles.playWrap, { opacity: glow }]}>
          <Text style={[styles.play, { color: pal.primary }]}>TAP TO PLAY</Text>
        </Animated.View>

        {best.score > 0 && (
          <Text style={styles.best}>
            YOUR BEST {best.score} · CIRCUIT {best.circuit}
          </Text>
        )}

        {board && board.length > 0 && (
          <View style={styles.boardWrap}>
            <Text style={[styles.boardTitle, { color: pal.accent }]}>WORLD TOP 5</Text>
            {board.map((r, i) => (
              <Text key={i} style={styles.boardRow}>
                {i + 1}. {r.initials.padEnd(3)}  {r.score}
              </Text>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: pal.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: {
    fontSize: 58,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 8,
    textShadowRadius: 30,
    textShadowOffset: { width: 0, height: 0 },
  },
  tag: {
    color: '#9AA2C0',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 10,
  },
  rules: { marginTop: 44, gap: 12, alignItems: 'center' },
  rule: { color: '#B8BEDA', fontSize: 14.5, fontWeight: '600', textAlign: 'center' },
  playWrap: {
    marginTop: 54,
    borderWidth: 2,
    borderColor: pal.primary,
    borderRadius: 999,
    paddingHorizontal: 40,
    paddingVertical: 15,
  },
  play: { fontSize: 19, fontWeight: '900', letterSpacing: 4 },
  best: {
    marginTop: 26,
    color: '#8890B0',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },
  boardWrap: { marginTop: 18, alignItems: 'center', gap: 3 },
  boardTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 3 },
  boardRow: {
    color: '#B8BEDA',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
