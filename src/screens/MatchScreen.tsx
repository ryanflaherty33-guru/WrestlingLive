import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING } from '../utils/theme';
import { Button } from '../components/Button';
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

function WrestlerVisual({ position, playerName, opponentName }: { position: string; playerName: string; opponentName: string }) {
  const getVisual = () => {
    switch (position) {
      case 'neutral':
        return (
          <View style={visualStyles.scene}>
            <View style={visualStyles.wrestlerRow}>
              <View style={[visualStyles.wrestler, visualStyles.playerWrestler]}>
                <Text style={visualStyles.wrestlerEmoji}>🧍</Text>
                <Text style={visualStyles.wrestlerLabel}>{playerName}</Text>
              </View>
              <Text style={visualStyles.vsText}>vs</Text>
              <View style={[visualStyles.wrestler, visualStyles.opponentWrestler]}>
                <Text style={visualStyles.wrestlerEmoji}>🧍</Text>
                <Text style={visualStyles.wrestlerLabel}>{opponentName}</Text>
              </View>
            </View>
            <Text style={visualStyles.posDesc}>Tied up on feet</Text>
          </View>
        );
      case 'playerTop':
        return (
          <View style={visualStyles.scene}>
            <View style={visualStyles.groundStack}>
              <View style={[visualStyles.wrestler, visualStyles.playerWrestler]}>
                <Text style={visualStyles.wrestlerEmoji}>🏋️</Text>
                <Text style={visualStyles.wrestlerLabel}>{playerName}</Text>
              </View>
              <Text style={visualStyles.onTopText}>on top of</Text>
              <View style={[visualStyles.wrestler, visualStyles.opponentWrestler, visualStyles.bottomWrestler]}>
                <Text style={visualStyles.wrestlerEmoji}>🧎</Text>
                <Text style={visualStyles.wrestlerLabel}>{opponentName}</Text>
              </View>
            </View>
            <Text style={visualStyles.posDesc}>Riding — work for a turn!</Text>
          </View>
        );
      case 'playerBottom':
        return (
          <View style={visualStyles.scene}>
            <View style={visualStyles.groundStack}>
              <View style={[visualStyles.wrestler, visualStyles.opponentWrestler]}>
                <Text style={visualStyles.wrestlerEmoji}>🏋️</Text>
                <Text style={visualStyles.wrestlerLabel}>{opponentName}</Text>
              </View>
              <Text style={visualStyles.onTopText}>on top of</Text>
              <View style={[visualStyles.wrestler, visualStyles.playerWrestler, visualStyles.bottomWrestler]}>
                <Text style={visualStyles.wrestlerEmoji}>🧎</Text>
                <Text style={visualStyles.wrestlerLabel}>{playerName}</Text>
              </View>
            </View>
            <Text style={visualStyles.posDesc}>Escape or reverse!</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return <View style={visualStyles.container}>{getVisual()}</View>;
}

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
  const attackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const showResultRef = useRef(showResult);

  matchStateRef.current = matchState;
  phaseRef.current = phase;
  showResultRef.current = showResult;

  const availableMoves = getAvailableMoves(matchState.position);

  // ─── Schedule next opponent attack ───
  const scheduleOpponentAttack = useCallback(() => {
    if (attackTimerRef.current) clearTimeout(attackTimerRef.current);

    const interval = getOpponentAttackInterval(opponent);
    // Add some randomness
    const delay = interval + Math.floor(Math.random() * 1500) - 500;

    attackTimerRef.current = setTimeout(() => {
      const state = matchStateRef.current;
      if (!state.isActive || showResultRef.current) return;
      if (phaseRef.current !== 'attacking') {
        // If already defending, reschedule
        scheduleOpponentAttack();
        return;
      }

      const attack = generateOpponentAttack(state, opponent);
      if (!attack) {
        scheduleOpponentAttack();
        return;
      }

      setCurrentAttack(attack);
      setPhase('defending');
      setReactionTimeLeft(attack.reactionWindowMs);
      setReactionTotal(attack.reactionWindowMs);
      setActionLog(prev => [attack.description, ...prev.slice(0, 20)]);
    }, delay);
  }, [opponent]);

  // ─── Start opponent attack timer on mount ───
  useEffect(() => {
    scheduleOpponentAttack();
    return () => {
      if (attackTimerRef.current) clearTimeout(attackTimerRef.current);
      if (reactionTimerRef.current) clearInterval(reactionTimerRef.current);
    };
  }, [scheduleOpponentAttack]);

  // ─── Reaction countdown ───
  useEffect(() => {
    if (phase === 'defending' && currentAttack && matchState.isActive) {
      if (reactionTimerRef.current) clearInterval(reactionTimerRef.current);

      const tickMs = 50;
      reactionTimerRef.current = setInterval(() => {
        setReactionTimeLeft(prev => {
          const next = prev - tickMs;
          if (next <= 0) {
            // Time's up! Opponent attack auto-succeeds
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

    const attack = currentAttack;
    if (!attack) return;

    const result = resolveOpponentAttack(attack, null, state, player.stats, opponent);
    const newState = applyDefenseResult(result, state);

    setMatchState(newState);
    setActionLog(prev => [newState.lastAction, ...prev.slice(0, 20)]);
    setPhase('attacking');
    setCurrentAttack(null);

    if (!newState.isActive) {
      setTimeout(() => setShowResult(true), 500);
    } else {
      scheduleOpponentAttack();
    }
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

    if (!newState.isActive) {
      setTimeout(() => setShowResult(true), 500);
    } else {
      scheduleOpponentAttack();
    }
  }

  function handlePlayerAttack(moveType: MoveType) {
    if (!matchState.isActive || cooldown || phase !== 'attacking') return;

    setCooldown(true);

    // Cancel pending opponent attack and reschedule after
    if (attackTimerRef.current) clearTimeout(attackTimerRef.current);

    const newState = applyPlayerAttack(moveType, matchState, player.stats, opponent);
    setMatchState(newState);
    setActionLog(prev => [newState.lastAction, ...prev.slice(0, 20)]);

    if (!newState.isActive) {
      setTimeout(() => setShowResult(true), 500);
    } else {
      scheduleOpponentAttack();
    }

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

        <WrestlerVisual
          position={matchState.position}
          playerName={player.name.split(' ')[0]}
          opponentName={opponent.name.split(' ')[0]}
        />

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

const visualStyles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: '100%',
  },
  scene: {
    alignItems: 'center',
  },
  wrestlerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  groundStack: {
    alignItems: 'center',
  },
  wrestler: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  playerWrestler: {
    backgroundColor: 'rgba(46, 125, 50, 0.3)',
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  opponentWrestler: {
    backgroundColor: 'rgba(198, 40, 40, 0.3)',
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  bottomWrestler: {
    marginTop: -4,
  },
  wrestlerEmoji: {
    fontSize: 28,
  },
  wrestlerLabel: {
    color: COLORS.textWhite,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  vsText: {
    color: COLORS.matGray,
    fontSize: 14,
    fontWeight: 'bold',
  },
  onTopText: {
    color: COLORS.matGray,
    fontSize: 10,
    marginVertical: 2,
  },
  posDesc: {
    color: COLORS.matGray,
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

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
