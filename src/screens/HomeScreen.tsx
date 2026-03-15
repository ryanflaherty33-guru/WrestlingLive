import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { COLORS, FONTS, SPACING } from '../utils/theme';
import { Button } from '../components/Button';
import { StatBar } from '../components/StatBar';
import { PlayerData, Screen } from '../data/types';
import { TIER_NAMES, getExpForLevel } from '../data/gameData';
import { APP_VERSION } from '../utils/version';

interface HomeScreenProps {
  player: PlayerData;
  onNavigate: (screen: Screen) => void;
  onNewDay: () => void;
  onOpenMat: () => void;
  onResetPlayer: () => void;
}

export function HomeScreen({ player, onNavigate, onNewDay, onOpenMat, onResetPlayer }: HomeScreenProps) {
  const expNeeded = getExpForLevel(player.level + 1);
  const expPct = Math.min(100, (player.experience / expNeeded) * 100);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  function handleResetPress() {
    if (Platform.OS === 'web') {
      setShowResetConfirm(true);
    } else {
      Alert.alert(
        'Start New Player',
        'This will permanently delete your current wrestler and all progress. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start Over', style: 'destructive', onPress: onResetPlayer },
        ]
      );
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.versionText}>v{APP_VERSION}</Text>
        <Text style={styles.gameName}>WRESTLING LIVE</Text>
        <Text style={styles.tagline}>Train. Compete. Dominate.</Text>
      </View>

      <View style={styles.playerCard}>
        <View style={styles.playerHeader}>
          <View>
            <Text style={styles.playerName}>{player.name}</Text>
            <Text style={styles.weightClass}>{player.weightClass} lbs</Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>LVL {player.level}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Record</Text>
            <Text style={styles.infoValue}>{player.record.wins}-{player.record.losses}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Pins</Text>
            <Text style={styles.infoValue}>{player.record.pins}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Money</Text>
            <Text style={styles.infoValue}>${player.money}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Tier</Text>
            <Text style={styles.infoValue}>{TIER_NAMES[player.currentTournamentTier]}</Text>
          </View>
        </View>

        <View style={styles.expBar}>
          <Text style={styles.expLabel}>EXP: {player.experience}/{expNeeded}</Text>
          <View style={styles.expBg}>
            <View style={[styles.expFill, { width: `${expPct}%` }]} />
          </View>
        </View>
      </View>

      <View style={styles.menuSection}>
        <Button
          title="Practice"
          icon="🤼"
          onPress={() => onNavigate('practice')}
          variant="primary"
          size="large"
          disabled={player.practicedToday}
          style={styles.menuButton}
        />
        <Button
          title="Training"
          icon="🏋️"
          onPress={() => onNavigate('training')}
          variant="primary"
          size="large"
          disabled={player.trainedToday}
          style={styles.menuButton}
        />
        <Button
          title="Tournament"
          icon="🏆"
          onPress={() => onNavigate('tournament')}
          variant="accent"
          size="large"
          style={styles.menuButton}
        />
        <Button
          title="My Stats"
          icon="📊"
          onPress={() => onNavigate('profile')}
          variant="secondary"
          size="large"
          style={styles.menuButton}
        />
      </View>

      {player.money < 25 && (
        <View style={styles.openMatBanner}>
          <Text style={styles.openMatText}>Low on cash? Hit the open mat for free!</Text>
          <Button
            title="Open Mat (Free)"
            icon="🤼"
            onPress={onOpenMat}
            variant="accent"
            size="medium"
          />
        </View>
      )}

      {(player.trainedToday || player.practicedToday) && (
        <Button
          title="Next Day"
          icon="🌅"
          onPress={onNewDay}
          variant="secondary"
          size="medium"
          style={styles.nextDayButton}
        />
      )}

      <View style={styles.quickStats}>
        <Text style={FONTS.subtitle}>Quick Stats</Text>
        <StatBar label="TD Offense" value={player.stats.takedownOffense} compact />
        <StatBar label="TD Defense" value={player.stats.takedownDefense} compact />
        <StatBar label="Escapes" value={player.stats.escapeAbility} compact />
        <StatBar label="Conditioning" value={player.stats.conditioning} compact />
        <StatBar label="Strength" value={player.stats.strength} compact />
      </View>

      <View style={styles.resetSection}>
        <Button
          title="Start New Player"
          icon="🔄"
          onPress={handleResetPress}
          variant="secondary"
          size="medium"
          style={styles.resetButton}
        />
      </View>

      {showResetConfirm && (
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Start New Player</Text>
            <Text style={styles.confirmText}>
              This will permanently delete your current wrestler and all progress. Are you sure?
            </Text>
            <View style={styles.confirmButtons}>
              <Button
                title="Cancel"
                onPress={() => setShowResetConfirm(false)}
                variant="secondary"
                size="medium"
                style={styles.confirmBtn}
              />
              <Button
                title="Start Over"
                onPress={() => { setShowResetConfirm(false); onResetPlayer(); }}
                variant="primary"
                size="medium"
                style={[styles.confirmBtn, { backgroundColor: COLORS.danger }]}
              />
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 40 },
  header: {
    backgroundColor: COLORS.primaryDark,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  versionText: {
    position: 'absolute',
    top: 44,
    right: SPACING.md,
    fontSize: 11,
    color: COLORS.matGray,
    opacity: 0.7,
  },
  gameName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.accent,
    letterSpacing: 3,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.matGray,
    marginTop: 4,
  },
  playerCard: {
    margin: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  playerName: { ...FONTS.subtitle },
  weightClass: { ...FONTS.small },
  levelBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  levelText: { fontWeight: 'bold', color: COLORS.textWhite, fontSize: 14 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { ...FONTS.small, fontSize: 11 },
  infoValue: { fontWeight: '600', fontSize: 16, color: COLORS.text, marginTop: 2 },
  expBar: { marginTop: SPACING.sm },
  expLabel: { ...FONTS.small, marginBottom: 4 },
  expBg: {
    height: 8,
    backgroundColor: COLORS.cardDark,
    borderRadius: 4,
    overflow: 'hidden',
  },
  expFill: {
    height: '100%',
    backgroundColor: COLORS.info,
    borderRadius: 4,
  },
  menuSection: {
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
  },
  menuButton: {
    marginVertical: 6,
  },
  openMatBanner: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  openMatText: {
    ...FONTS.body,
    marginBottom: SPACING.sm,
    textAlign: 'center',
    fontWeight: '600',
  },
  nextDayButton: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
  },
  quickStats: {
    margin: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: SPACING.md,
  },
  resetSection: {
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  resetButton: {
    opacity: 0.7,
  },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  confirmBox: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    width: '85%',
    maxWidth: 360,
  },
  confirmTitle: {
    ...FONTS.subtitle,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  confirmText: {
    ...FONTS.body,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  confirmBtn: {
    flex: 1,
  },
});
