import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING } from '../utils/theme';
import { Button } from '../components/Button';
import { PixelScene } from '../components/PixelWrestler';
import { MatchState, Opponent, PlayerData, MoveType, Move } from '../data/types';
import {
  createMatchState,
  getAvailableMoves,
  getMatchResult,
  generateOpponentAttack,
  resolveOpponentAttack,
  applyPlayerAttack,
  applyDefenseResult,
  getOpponentAttackInterval,
  OpponentAttack,
  DefenseOption,
} from '../engine/matchEngine';

interface MatchScreenProps {
  player: PlayerData;
  opponent: Opponent;
  onMatchEnd: (result: 'win' | 'loss', finalState: MatchState) => void;
}

type MatchPhase = 'attacking' | 'defending';

export function MatchScreen({ player, opponent, onMatchEnd }: MatchScreenProps) {
  const [matchState, setMatchState] = useState<MatchState>(createMatchState());
  const [actionLog, setActionLog] = useState<string[]>(['Match begins! Shake hands and wrestle!']);
  const [showResult, setShowResult] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  // Real-time phase system
  const [phase, setPhase] = useState<MatchPhase>('attacking');
  const [currentAttack, setCurrentAttack] = useState<OpponentAttack | null>(null);
  const [reactionTimeLeft, setReactionTimeLeft] = useState(0);
  const [reactionTotal, setReactionTotal] = useState(0);

  // Refs to access latest state in timers
  const matchStateRef = useRef(matchState);
  const phaseRef = useRef(phase);
  const attackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reactionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const showResultRef = useRef(showResult);
  const currentAttackRef = useRef(currentAttack);

  matchStateRef.current = matchState;
  phaseRef.current = phase;
  showResultRef.current = showResult;
  currentAttackRef.current = currentAttack;

  const availableMoves = getAvailableMoves(matchState.position);

  // ─── Real-time match clock (ticks every second) ───
  useEffect(() => {
    clockTimerRef.current = setInterval(() => {
      setMatchState(prev => {
        if (!prev.isActive) return prev;
        const newTime = prev.timeRemaining - 1;
        if (newTime <= 0) {
          if (prev.period < 3) {
            const nextPeriod = (prev.period + 1) as 1 | 2 | 3;
            return {
              ...prev,
              period: nextPeriod,
              timeRemaining: 120,
              position: nextPeriod === 2 ? 'playerBottom' : 'playerTop',
              playerStamina: Math.min(100, prev.playerStamina + 20),
              opponentStamina: Math.min(100, prev.opponentStamina + 20),
              nearFall: false,
              opponentNearFall: false,
              lastAction: nextPeriod === 2 ? 'Period 2! You start on bottom.' : 'Period 3! You start on top.',
            };
          } else {
            return { ...prev, timeRemaining: 0, isActive: false, lastAction: 'Match is over!' };
          }
        }
        return { ...prev, timeRemaining: newTime };
      });
    }, 1000);
    return () => { if (clockTimerRef.current) clearInterval(clockTimerRef.current); };
  }, []);

  // When match ends (from clock, pin, or tech fall), show result
  useEffect(() => {
    if (!matchState.isActive && !showResult) {
      if (clockTimerRef.current) clearInterval(clockTimerRef.current);
      if (attackTimerRef.current) clearInterval(attackTimerRef.current);
      if (reactionTimerRef.current) clearInterval(reactionTimerRef.current);
      setPhase('attacking');
      setCurrentAttack(null);
      setTimeout(() => setShowResult(true), 500);
    }
  }, [matchState.isActive, showResult]);

  // ─── Independent opponent attack loop ───
  useEffect(() => {
    const interval = getOpponentAttackInterval(opponent);

    function tryAttack() {
      const state = matchStateRef.current;
      if (!state.isActive || showResultRef.current) return;

      // Don't attack if already in defense phase
      if (phaseRef.current !== 'attacking') return;

      const attack = generateOpponentAttack(state, opponent);
      if (!attack) return;

      setCurrentAttack(attack);
      setPhase('defending');
      setReactionTimeLeft(attack.reactionWindowMs);
      setReactionTotal(attack.reactionWindowMs);
      setActionLog(prev => [attack.description, ...prev.slice(0, 20)]);
    }

    // Start with a short delay so match doesn't immediately go to defense
    const initialDelay = setTimeout(() => {
      tryAttack();
      // Then keep attacking on interval
      attackTimerRef.current = setInterval(() => {
        tryAttack();
      }, interval + Math.floor(Math.random() * 1000));
    }, 1500 + Math.floor(Math.random() * 1000));

    return () => {
      clearTimeout(initialDelay);
      if (attackTimerRef.current) clearInterval(attackTimerRef.current);
    };
  }, [opponent]);

  // ─── Reaction countdown ───
  useEffect(() => {
    if (phase === 'defending' && currentAttack && matchState.isActive) {
      if (reactionTimerRef.current) clearInterval(reactionTimerRef.current);

      const tickMs = 50;
      reactionTimerRef.current = setInterval(() => {
        setReactionTimeLeft(prev => {
          const next = prev - tickMs;
          if (next <= 0) {
            if (reactionTimerRef.current) clearInterval(reactionTimerRef.current);
            handleDefenseTimeout();
            return 0;
          }
          return next;
        });
      }, tickMs);

      return () => {
        if (reactionTimerRef.current) clearInterval(reactionTimerRef.current);
      };
    }
  }, [phase, currentAttack]);

  function handleDefenseTimeout() {
    const state = matchStateRef.current;
    if (!state.isActive) return;

    const attack = currentAttackRef.current;
    if (!attack) return;

    const result = resolveOpponentAttack(attack, null, state, player.stats, opponent);
    const newState = applyDefenseResult(result, state);

    setMatchState(newState);
    setActionLog(prev => [newState.lastAction, ...prev.slice(0, 20)]);
    setPhase('attacking');
    setCurrentAttack(null);
  }

  function handleDefenseChoice(defense: DefenseOption) {
    if (reactionTimerRef.current) clearInterval(reactionTimerRef.current);

    const state = matchStateRef.current;
    if (!state.isActive || !currentAttack) return;

    const result = resolveOpponentAttack(currentAttack, defense, state, player.stats, opponent);
    const newState = applyDefenseResult(result, state);

    setMatchState(newState);
    setActionLog(prev => [newState.lastAction, ...prev.slice(0, 20)]);
    setPhase('attacking');
    setCurrentAttack(null);
  }

  function handlePlayerAttack(moveType: MoveType) {
    if (!matchState.isActive || cooldown || phase !== 'attacking') return;

    setCooldown(true);

    // Don't cancel opponent timer — it runs independently
    const newState = applyPlayerAttack(moveType, matchState, player.stats, opponent);
    setMatchState(newState);
    setActionLog(prev => [newState.lastAction, ...prev.slice(0, 20)]);

    setTimeout(() => setCooldown(false), 800);
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(Math.max(0, seconds) / 60);
    const s = Math.max(0, seconds) % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function getPositionText(pos: string): string {
    switch (pos) {
      case 'neutral': return 'Neutral (On Feet)';
      case 'playerTop': return 'You on Top';
      case 'playerBottom': return 'You on Bottom';
      default: return pos;
    }
  }

  function getPositionColor(pos: string): string {
    switch (pos) {
      case 'playerTop': return COLORS.success;
      case 'playerBottom': return COLORS.danger;
      default: return COLORS.info;
    }
  }

  if (showResult) {
    const rawResult = getMatchResult(matchState);
    const result: 'win' | 'loss' = rawResult === 'win' ? 'win' : 'loss';
    const isWin = result === 'win';
    return (
      <View style={[styles.container, { backgroundColor: isWin ? '#1a3a1a' : '#3a1a1a' }]}>
        <View style={styles.resultScreen}>
          <Text style={styles.resultEmoji}>{isWin ? '🏆' : '😤'}</Text>
          <Text style={[styles.resultTitle, { color: isWin ? COLORS.success : COLORS.danger }]}>
            {isWin ? 'VICTORY!' : 'DEFEAT'}
          </Text>
          <Text style={styles.resultScore}>
            {matchState.playerScore} - {matchState.opponentScore}
          </Text>
          <Text style={styles.resultVs}>vs {opponent.name}</Text>
          {matchState.pinCount >= 3 && <Text style={styles.pinText}>WIN BY PIN!</Text>}
          {matchState.opponentPinCount >= 3 && <Text style={[styles.pinText, { color: COLORS.danger }]}>LOSS BY PIN!</Text>}
          {Math.abs(matchState.playerScore - matchState.opponentScore) >= 15 && (
            <Text style={styles.pinText}>TECH FALL!</Text>
          )}
          <Button
            title="Continue"
            onPress={() => onMatchEnd(result, matchState)}
            variant={isWin ? 'accent' : 'primary'}
            size="large"
            style={{ marginTop: 30 }}
          />
        </View>
      </View>
    );
  }

  const reactionPct = reactionTotal > 0 ? (reactionTimeLeft / reactionTotal) * 100 : 0;
  const reactionBarColor = reactionPct > 50 ? COLORS.success : reactionPct > 25 ? COLORS.warning : COLORS.danger;

  return (
    <View style={styles.container}>
      {/* Scoreboard */}
      <View style={styles.scoreboard}>
        <View style={styles.scoreSection}>
          <Text style={styles.scoreName}>{player.name}</Text>
          <Text style={styles.scoreValue}>{matchState.playerScore}</Text>
        </View>
        <View style={styles.scoreCenter}>
          <Text style={styles.periodText}>Period {matchState.period}</Text>
          <Text style={styles.timerText}>{formatTime(matchState.timeRemaining)}</Text>
        </View>
        <View style={styles.scoreSection}>
          <Text style={styles.scoreName}>{opponent.name}</Text>
          <Text style={styles.scoreValue}>{matchState.opponentScore}</Text>
        </View>
      </View>

      {/* Mat / Position Display */}
      <View style={[styles.matArea, phase === 'defending' && styles.matAreaDefending]}>
        <View style={[styles.positionBadge, { backgroundColor: getPositionColor(matchState.position) }]}>
          <Text style={styles.positionText}>{getPositionText(matchState.position)}</Text>
        </View>

        <PixelScene
          position={matchState.position}
          attackMove={currentAttack?.name}
          isDefending={phase === 'defending'}
        />

        <View style={styles.wrestlerLabels}>
          <View style={styles.wrestlerLabelBadge}>
            <View style={[styles.colorDot, { backgroundColor: '#2E7D32' }]} />
            <Text style={styles.wrestlerLabelText}>{player.name.split(' ')[0]}</Text>
          </View>
          <Text style={styles.vsText}>vs</Text>
          <View style={styles.wrestlerLabelBadge}>
            <View style={[styles.colorDot, { backgroundColor: '#C62828' }]} />
            <Text style={styles.wrestlerLabelText}>{opponent.name.split(' ')[0]}</Text>
          </View>
        </View>

        <View style={styles.staminaRow}>
          <View style={styles.staminaContainer}>
            <Text style={styles.staminaLabel}>Your Stamina</Text>
            <View style={styles.staminaBg}>
              <View style={[styles.staminaFill, { width: `${matchState.playerStamina}%`, backgroundColor: COLORS.success }]} />
            </View>
          </View>
          <View style={styles.staminaContainer}>
            <Text style={styles.staminaLabel}>Opp Stamina</Text>
            <View style={styles.staminaBg}>
              <View style={[styles.staminaFill, { width: `${matchState.opponentStamina}%`, backgroundColor: COLORS.danger }]} />
            </View>
          </View>
        </View>

        {matchState.nearFall && (
          <View style={styles.nearFallBanner}>
            <Text style={styles.nearFallText}>NEAR FALL! ({matchState.pinCount}/3)</Text>
          </View>
        )}
        {matchState.opponentNearFall && (
          <View style={[styles.nearFallBanner, styles.opponentNearFallBanner]}>
            <Text style={styles.nearFallText}>DANGER! NEAR FALL! ({matchState.opponentPinCount}/3)</Text>
          </View>
        )}
      </View>

      {/* Action Log */}
      <ScrollView style={styles.actionLog}>
        {actionLog.map((msg, i) => (
          <Text key={i} style={[styles.logText, i === 0 && styles.logTextLatest]}>
            {msg}
          </Text>
        ))}
      </ScrollView>

      {/* Bottom area: Attack moves OR Defense options */}
      {phase === 'defending' && currentAttack ? (
        <View style={styles.defendArea}>
          {/* Reaction timer bar */}
          <View style={styles.reactionBarContainer}>
            <View style={styles.reactionBarBg}>
              <View style={[styles.reactionBarFill, { width: `${reactionPct}%`, backgroundColor: reactionBarColor }]} />
            </View>
            <Text style={styles.reactionTimeText}>{(reactionTimeLeft / 1000).toFixed(1)}s</Text>
          </View>

          <View style={styles.defendHeader}>
            <Text style={styles.defendIcon}>{currentAttack.icon}</Text>
            <Text style={styles.defendLabel}>{currentAttack.description}</Text>
          </View>

          <Text style={styles.defendPrompt}>DEFEND NOW!</Text>

          <View style={styles.defenseGrid}>
            {currentAttack.defenseOptions.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={styles.defenseButton}
                onPress={() => handleDefenseChoice(opt)}
                activeOpacity={0.7}
              >
                <Text style={styles.defenseIcon}>{opt.icon}</Text>
                <Text style={styles.defenseName}>{opt.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.moveArea}>
          <View style={styles.moveLabelRow}>
            <Text style={styles.moveLabel}>Your Moves:</Text>
            {cooldown && <Text style={styles.cooldownText}>Wait...</Text>}
          </View>
          <View style={styles.moveGrid}>
            {availableMoves.map(move => (
              <TouchableOpacity
                key={move.type}
                style={[styles.moveButton, cooldown && styles.moveButtonDisabled]}
                onPress={() => handlePlayerAttack(move.type)}
                activeOpacity={cooldown ? 1 : 0.7}
                disabled={cooldown}
              >
                <Text style={styles.moveIcon}>{move.icon}</Text>
                <Text style={styles.moveName}>{move.name}</Text>
                <Text style={styles.movePoints}>+{move.pointsOnSuccess}pts</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryDark },
  scoreboard: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  scoreSection: { flex: 1, alignItems: 'center' },
  scoreName: { color: COLORS.textWhite, fontSize: 12, fontWeight: '500' },
  scoreValue: { color: COLORS.textWhite, fontSize: 36, fontWeight: 'bold' },
  scoreCenter: { alignItems: 'center', paddingHorizontal: SPACING.md },
  periodText: { color: COLORS.matGray, fontSize: 12 },
  timerText: { color: COLORS.accent, fontSize: 24, fontWeight: 'bold' },
  matArea: {
    backgroundColor: COLORS.matBlue,
    margin: SPACING.sm,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
  },
  matAreaDefending: {
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  positionBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 4,
  },
  positionText: { color: COLORS.textWhite, fontWeight: 'bold', fontSize: 16 },
  wrestlerLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  wrestlerLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  wrestlerLabelText: {
    color: COLORS.textWhite,
    fontSize: 11,
    fontWeight: '600',
  },
  vsText: {
    color: COLORS.matGray,
    fontSize: 10,
  },
  staminaRow: { flexDirection: 'row', width: '100%', gap: 12 },
  staminaContainer: { flex: 1 },
  staminaLabel: { color: COLORS.textWhite, fontSize: 11, marginBottom: 2 },
  staminaBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
  staminaFill: { height: '100%', borderRadius: 4 },
  nearFallBanner: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: SPACING.sm,
  },
  nearFallText: { color: COLORS.textWhite, fontWeight: 'bold', fontSize: 16 },
  opponentNearFallBanner: {
    backgroundColor: '#8B0000',
  },
  actionLog: {
    flex: 1,
    backgroundColor: COLORS.card,
    margin: SPACING.sm,
    borderRadius: 10,
    padding: SPACING.sm,
  },
  logText: { fontSize: 13, color: COLORS.textLight, marginBottom: 4, lineHeight: 18 },
  logTextLatest: { color: COLORS.text, fontWeight: '600', fontSize: 14 },

  // ─── Attack mode (player's turn) ───
  moveArea: {
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  moveLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginHorizontal: 4,
  },
  moveLabel: { ...FONTS.small },
  cooldownText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  moveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  moveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: '22%',
    flexGrow: 1,
  },
  moveButtonDisabled: {
    opacity: 0.4,
  },
  moveIcon: { fontSize: 18 },
  moveName: { color: COLORS.textWhite, fontSize: 11, fontWeight: '600', marginTop: 2 },
  movePoints: { color: COLORS.accentLight, fontSize: 10, marginTop: 1 },

  // ─── Defend mode ───
  defendArea: {
    backgroundColor: '#3a1a1a',
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 3,
    borderTopColor: COLORS.danger,
  },
  reactionBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  reactionBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  reactionBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  reactionTimeText: {
    color: COLORS.textWhite,
    fontSize: 13,
    fontWeight: 'bold',
    width: 36,
    textAlign: 'right',
  },
  defendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  defendIcon: {
    fontSize: 22,
  },
  defendLabel: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  defendPrompt: {
    color: COLORS.danger,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 2,
  },
  defenseGrid: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  defenseButton: {
    backgroundColor: COLORS.matRed,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    flex: 1,
    maxWidth: 120,
  },
  defenseIcon: {
    fontSize: 24,
  },
  defenseName: {
    color: COLORS.textWhite,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },

  // ─── Result screen ───
  resultScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  resultEmoji: { fontSize: 80 },
  resultTitle: { fontSize: 40, fontWeight: 'bold', marginTop: 16 },
  resultScore: { fontSize: 48, fontWeight: 'bold', color: COLORS.textWhite, marginTop: 8 },
  resultVs: { fontSize: 18, color: COLORS.matGray, marginTop: 8 },
  pinText: { fontSize: 22, fontWeight: 'bold', color: COLORS.accent, marginTop: 8 },
});
