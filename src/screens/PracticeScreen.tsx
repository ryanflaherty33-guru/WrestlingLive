import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING } from '../utils/theme';
import { Button } from '../components/Button';
import { PlayerData, WrestlerStats } from '../data/types';
import { PRACTICE_DRILLS } from '../data/gameData';

interface PracticeScreenProps {
  player: PlayerData;
  onComplete: (statBoosts: Partial<WrestlerStats>) => void;
  onBack: () => void;
}

type DrillCategory = 'takedowns' | 'escapes' | 'turns' | 'throws';

export function PracticeScreen({ player, onComplete, onBack }: PracticeScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<DrillCategory>('takedowns');
  const [drillResult, setDrillResult] = useState<string | null>(null);
  const [drillDone, setDrillDone] = useState(false);

  const categories: { key: DrillCategory; label: string; icon: string }[] = [
    { key: 'takedowns', label: 'Takedowns', icon: '⬇' },
    { key: 'escapes', label: 'Escapes', icon: '⬆' },
    { key: 'turns', label: 'Turns', icon: '🔄' },
    { key: 'throws', label: 'Throws', icon: '🌀' },
  ];

  const drills = PRACTICE_DRILLS.filter(d => d.category === selectedCategory);

  function runDrill(drillId: string) {
    const drill = PRACTICE_DRILLS.find(d => d.id === drillId);
    if (!drill) return;

    // Practice mini-game: timing based success
    const skillCheck = Math.random() * 100;
    const threshold = drill.difficulty * 25;
    const success = skillCheck > threshold;

    if (success) {
      const boosts = drill.statBoosts;
      setDrillResult(
        `Great practice! ${drill.name} drill complete.\n` +
        Object.entries(boosts).map(([stat, val]) => `${formatStatName(stat)} +${val}`).join(', ')
      );
      onComplete(boosts);
    } else {
      // Still get partial credit
      const partialBoosts: Partial<WrestlerStats> = {};
      for (const [key, val] of Object.entries(drill.statBoosts)) {
        partialBoosts[key as keyof WrestlerStats] = Math.max(1, Math.floor((val as number) / 2));
      }
      setDrillResult(
        `Tough drill. You struggled but still improved.\n` +
        Object.entries(partialBoosts).map(([stat, val]) => `${formatStatName(stat)} +${val}`).join(', ')
      );
      onComplete(partialBoosts);
    }
    setDrillDone(true);
  }

  function formatStatName(stat: string): string {
    const names: Record<string, string> = {
      takedownOffense: 'TD Offense',
      takedownDefense: 'TD Defense',
      escapeAbility: 'Escapes',
      ridingSkill: 'Riding',
      turnsAndPins: 'Turns & Pins',
      throwSkill: 'Throws',
      conditioning: 'Conditioning',
      strength: 'Strength',
    };
    return names[stat] || stat;
  }

  if (drillDone) {
    return (
      <View style={styles.container}>
        <View style={styles.resultContainer}>
          <Text style={styles.resultIcon}>🤼</Text>
          <Text style={styles.resultTitle}>Practice Complete!</Text>
          <Text style={styles.resultText}>{drillResult}</Text>
          <Button title="Back to Home" onPress={onBack} variant="primary" size="large" style={{ marginTop: 20 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Practice Room</Text>
      </View>

      <View style={styles.categoryRow}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.categoryTab, selectedCategory === cat.key && styles.categoryTabActive]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text style={[styles.categoryLabel, selectedCategory === cat.key && styles.categoryLabelActive]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.drillList} contentContainerStyle={{ paddingBottom: 40 }}>
        {drills.map(drill => (
          <View key={drill.id} style={styles.drillCard}>
            <View style={styles.drillInfo}>
              <Text style={styles.drillIcon}>{drill.icon}</Text>
              <View style={styles.drillText}>
                <Text style={styles.drillName}>{drill.name}</Text>
                <Text style={styles.drillDesc}>{drill.description}</Text>
                <Text style={styles.drillBoosts}>
                  {Object.entries(drill.statBoosts).map(([stat, val]) => `${formatStatName(stat)} +${val}`).join('  ')}
                </Text>
              </View>
            </View>
            <View style={styles.drillDifficulty}>
              {Array.from({ length: 3 }, (_, i) => (
                <View key={i} style={[styles.diffDot, i < drill.difficulty && styles.diffDotActive]} />
              ))}
            </View>
            <Button title="Drill" onPress={() => runDrill(drill.id)} size="small" variant="primary" />
          </View>
        ))}
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
  categoryRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  categoryTabActive: { borderBottomColor: COLORS.accent },
  categoryIcon: { fontSize: 18 },
  categoryLabel: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  categoryLabelActive: { color: COLORS.accent, fontWeight: '600' },
  drillList: { flex: 1, padding: SPACING.md },
  drillCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  drillInfo: { flexDirection: 'row', marginBottom: 8 },
  drillIcon: { fontSize: 28, marginRight: 12 },
  drillText: { flex: 1 },
  drillName: { ...FONTS.subtitle, fontSize: 16 },
  drillDesc: { ...FONTS.small, marginTop: 2 },
  drillBoosts: { fontSize: 12, color: COLORS.success, fontWeight: '500', marginTop: 4 },
  drillDifficulty: { flexDirection: 'row', marginBottom: 8 },
  diffDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.cardDark,
    marginRight: 4,
  },
  diffDotActive: { backgroundColor: COLORS.warning },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  resultIcon: { fontSize: 60, marginBottom: 16 },
  resultTitle: { ...FONTS.title, marginBottom: 16 },
  resultText: { ...FONTS.body, textAlign: 'center', lineHeight: 24 },
});
