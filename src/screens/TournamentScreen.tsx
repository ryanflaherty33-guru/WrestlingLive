import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { COLORS, FONTS, SPACING } from '../utils/theme';
import { Button } from '../components/Button';
import { PlayerData, Tournament, TournamentTier, Screen, Opponent } from '../data/types';
import { generateTournament, TIER_UNLOCK_LEVEL, TIER_NAMES } from '../data/gameData';
import { StatBar } from '../components/StatBar';

interface TournamentScreenProps {
  player: PlayerData;
  activeTournament: Tournament | null;
  currentRound: number;
  onEnterMatch: (tournament: Tournament, roundIndex: number) => void;
  onBack: () => void;
}

export function TournamentScreen({ player, activeTournament, currentRound: appRound, onBack, onEnterMatch }: TournamentScreenProps) {
  const [selectedTier, setSelectedTier] = useState<TournamentTier | null>(null);
  const [newTournament, setNewTournament] = useState<Tournament | null>(null);

  const tiers: TournamentTier[] = ['local', 'regional', 'state', 'national', 'world'];

  // Use active tournament from App if we're mid-tournament, otherwise use locally created one
  const tournament = activeTournament || newTournament;
  const currentRound = activeTournament ? appRound : 0;

  function selectTier(tier: TournamentTier) {
    if (player.level < TIER_UNLOCK_LEVEL[tier]) {
      Alert.alert('Locked', `${TIER_NAMES[tier]} tournaments unlock at Level ${TIER_UNLOCK_LEVEL[tier]}.`);
      return;
    }
    setSelectedTier(tier);
    const t = generateTournament(tier, player.weightClass);
    setNewTournament(t);
  }

  function enterTournament() {
    if (!tournament) return;
    if (currentRound === 0 && player.money < tournament.entryFee) {
      Alert.alert('Not Enough Money', `Entry fee is $${tournament.entryFee}. You have $${player.money}.`);
      return;
    }
    onEnterMatch(tournament, currentRound);
  }

  if (tournament) {
    const currentOpponent = tournament.opponents[currentRound];
    const isMidTournament = activeTournament != null && currentRound > 0;
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            if (isMidTournament) {
              Alert.alert(
                'Forfeit Tournament?',
                'You will lose your entry fee if you leave now.',
                [
                  { text: 'Stay', style: 'cancel' },
                  { text: 'Forfeit', style: 'destructive', onPress: () => { setNewTournament(null); setSelectedTier(null); onBack(); } },
                ]
              );
            } else {
              setNewTournament(null);
              setSelectedTier(null);
              if (activeTournament) {
                onBack();
              }
            }
          }} style={styles.backBtn}>
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{tournament.name}</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Bracket display */}
          <View style={styles.bracketContainer}>
            <Text style={styles.sectionTitle}>Tournament Bracket</Text>
            {tournament.opponents.map((opp, i) => (
              <View
                key={i}
                style={[
                  styles.bracketRound,
                  i === currentRound && styles.bracketRoundCurrent,
                  i < currentRound && styles.bracketRoundDone,
                ]}
              >
                <Text style={styles.bracketRoundLabel}>
                  {i < currentRound ? '✅' : i === currentRound ? '➡️' : '⬜'} Round {i + 1}
                </Text>
                <Text style={styles.bracketOpponent}>
                  vs {opp.name} ({opp.style})
                </Text>
              </View>
            ))}
          </View>

          {/* Current opponent preview */}
          <View style={styles.opponentCard}>
            <Text style={styles.sectionTitle}>
              {currentRound > 0 ? `Round ${currentRound + 1} Opponent` : 'Next Opponent'}
            </Text>
            <View style={styles.oppHeader}>
              <Text style={styles.oppName}>{currentOpponent.name}</Text>
              <Text style={styles.oppStyle}>{currentOpponent.style}</Text>
            </View>
            <StatBar label="TD Offense" value={currentOpponent.stats.takedownOffense} compact />
            <StatBar label="TD Defense" value={currentOpponent.stats.takedownDefense} compact />
            <StatBar label="Escapes" value={currentOpponent.stats.escapeAbility} compact />
            <StatBar label="Riding" value={currentOpponent.stats.ridingSkill} compact />
            <StatBar label="Turns" value={currentOpponent.stats.turnsAndPins} compact />
            <StatBar label="Throws" value={currentOpponent.stats.throwSkill} compact />
            <StatBar label="Conditioning" value={currentOpponent.stats.conditioning} compact />
            <StatBar label="Strength" value={currentOpponent.stats.strength} compact />
          </View>

          <View style={styles.entryInfo}>
            {currentRound === 0 && (
              <Text style={styles.entryText}>Entry Fee: ${tournament.entryFee}</Text>
            )}
            {currentRound > 0 && (
              <Text style={[styles.entryText, { color: COLORS.success, fontWeight: '600' }]}>
                ✅ Entry fee paid — Round {currentRound + 1} of {tournament.rounds}
              </Text>
            )}
            <Text style={styles.entryText}>Prize: ${tournament.prize}</Text>
            <Text style={styles.entryText}>EXP: +{tournament.expReward}</Text>
          </View>

          <Button
            title={`Wrestle Round ${currentRound + 1}`}
            onPress={enterTournament}
            variant="accent"
            size="large"
            icon="🤼"
            disabled={currentRound === 0 && player.money < tournament.entryFee}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tournaments</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {tiers.map(tier => {
          const unlocked = player.level >= TIER_UNLOCK_LEVEL[tier];
          return (
            <TouchableOpacity
              key={tier}
              style={[styles.tierCard, !unlocked && styles.tierLocked]}
              onPress={() => selectTier(tier)}
              activeOpacity={unlocked ? 0.7 : 1}
            >
              <View style={styles.tierHeader}>
                <Text style={styles.tierIcon}>
                  {tier === 'local' ? '🏠' : tier === 'regional' ? '🏢' : tier === 'state' ? '🏛️' : tier === 'national' ? '🇺🇸' : '🌍'}
                </Text>
                <View style={styles.tierInfo}>
                  <Text style={[styles.tierName, !unlocked && { color: COLORS.textLight }]}>
                    {TIER_NAMES[tier]} Tournament
                  </Text>
                  {unlocked ? (
                    <Text style={styles.tierDesc}>Test your skills at the {tier} level</Text>
                  ) : (
                    <Text style={styles.tierLockText}>Unlocks at Level {TIER_UNLOCK_LEVEL[tier]}</Text>
                  )}
                </View>
                {!unlocked && <Text style={styles.lockIcon}>🔒</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.accent,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: { marginRight: 12 },
  backText: { color: COLORS.textWhite, fontSize: 16 },
  title: { ...FONTS.title, color: COLORS.textWhite },
  content: { flex: 1, padding: SPACING.md },
  tierCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tierLocked: { opacity: 0.5 },
  tierHeader: { flexDirection: 'row', alignItems: 'center' },
  tierIcon: { fontSize: 36, marginRight: 14 },
  tierInfo: { flex: 1 },
  tierName: { ...FONTS.subtitle },
  tierDesc: { ...FONTS.small, marginTop: 2 },
  tierLockText: { color: COLORS.danger, fontSize: 13, marginTop: 2 },
  lockIcon: { fontSize: 22 },
  sectionTitle: { ...FONTS.subtitle, marginBottom: SPACING.sm },
  bracketContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  bracketRound: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.border,
    marginBottom: 4,
  },
  bracketRoundCurrent: {
    borderLeftColor: COLORS.accent,
    backgroundColor: COLORS.cardDark,
    borderRadius: 8,
  },
  bracketRoundDone: { borderLeftColor: COLORS.success },
  bracketRoundLabel: { fontWeight: '600', fontSize: 14, color: COLORS.text },
  bracketOpponent: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  opponentCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  oppHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  oppName: { ...FONTS.subtitle },
  oppStyle: {
    backgroundColor: COLORS.primaryLight,
    color: COLORS.textWhite,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  entryInfo: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  entryText: { ...FONTS.body, marginBottom: 4 },
});
