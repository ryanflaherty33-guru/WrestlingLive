import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING } from '../utils/theme';
import { StatBar } from '../components/StatBar';
import { PlayerData } from '../data/types';
import { TIER_NAMES, getExpForLevel } from '../data/gameData';

interface ProfileScreenProps {
  player: PlayerData;
  onBack: () => void;
}

export function ProfileScreen({ player, onBack }: ProfileScreenProps) {
  const expNeeded = getExpForLevel(player.level + 1);
  const winRate = player.record.wins + player.record.losses > 0
    ? Math.round((player.record.wins / (player.record.wins + player.record.losses)) * 100)
    : 0;

  const statAvg = Math.round(
    (player.stats.takedownOffense +
      player.stats.takedownDefense +
      player.stats.escapeAbility +
      player.stats.ridingSkill +
      player.stats.turnsAndPins +
      player.stats.throwSkill +
      player.stats.conditioning +
      player.stats.strength) / 8
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Wrestler Profile</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{player.name.charAt(0)}</Text>
          </View>
          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={styles.weightClass}>{player.weightClass} lbs</Text>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeValue}>LVL {player.level}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: COLORS.success }]}>
              <Text style={styles.badgeValue}>OVR {statAvg}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: COLORS.matRed }]}>
              <Text style={styles.badgeValue}>{TIER_NAMES[player.currentTournamentTier]}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Record</Text>
          <View style={styles.recordRow}>
            <View style={styles.recordItem}>
              <Text style={styles.recordValue}>{player.record.wins}</Text>
              <Text style={styles.recordLabel}>Wins</Text>
            </View>
            <View style={styles.recordItem}>
              <Text style={[styles.recordValue, { color: COLORS.danger }]}>{player.record.losses}</Text>
              <Text style={styles.recordLabel}>Losses</Text>
            </View>
            <View style={styles.recordItem}>
              <Text style={[styles.recordValue, { color: COLORS.accent }]}>{player.record.pins}</Text>
              <Text style={styles.recordLabel}>Pins</Text>
            </View>
            <View style={styles.recordItem}>
              <Text style={styles.recordValue}>{winRate}%</Text>
              <Text style={styles.recordLabel}>Win Rate</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Experience</Text>
          <Text style={styles.expText}>{player.experience} / {expNeeded} EXP to Level {player.level + 1}</Text>
          <View style={styles.expBg}>
            <View style={[styles.expFill, { width: `${Math.min(100, (player.experience / expNeeded) * 100)}%` }]} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <StatBar label="TD Offense" value={player.stats.takedownOffense} />
          <StatBar label="TD Defense" value={player.stats.takedownDefense} />
          <StatBar label="Escapes" value={player.stats.escapeAbility} />
          <StatBar label="Riding" value={player.stats.ridingSkill} />
          <StatBar label="Turns & Pins" value={player.stats.turnsAndPins} />
          <StatBar label="Throws" value={player.stats.throwSkill} />
          <StatBar label="Conditioning" value={player.stats.conditioning} />
          <StatBar label="Strength" value={player.stats.strength} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Finances</Text>
          <Text style={styles.moneyText}>${player.money}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
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
  profileCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: COLORS.textWhite },
  playerName: { fontSize: 24, fontWeight: 'bold', color: COLORS.textWhite },
  weightClass: { fontSize: 16, color: COLORS.matGray, marginTop: 4 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: SPACING.md },
  badge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeValue: { color: COLORS.textWhite, fontWeight: 'bold', fontSize: 13 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: { ...FONTS.subtitle, marginBottom: SPACING.sm },
  recordRow: { flexDirection: 'row', justifyContent: 'space-around' },
  recordItem: { alignItems: 'center' },
  recordValue: { fontSize: 28, fontWeight: 'bold', color: COLORS.success },
  recordLabel: { ...FONTS.small, marginTop: 4 },
  expText: { ...FONTS.small, marginBottom: 8 },
  expBg: { height: 12, backgroundColor: COLORS.cardDark, borderRadius: 6, overflow: 'hidden' },
  expFill: { height: '100%', backgroundColor: COLORS.info, borderRadius: 6 },
  moneyText: { fontSize: 36, fontWeight: 'bold', color: COLORS.success, textAlign: 'center' },
});
