import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { COLORS, FONTS, SPACING } from '../utils/theme';
import { Button } from '../components/Button';
import { PlayerData, WrestlerStats } from '../data/types';
import { TRAINING_OPTIONS } from '../data/gameData';

interface TrainingScreenProps {
  player: PlayerData;
  onTrain: (cost: number, boosts: Partial<WrestlerStats>) => void;
  onBack: () => void;
}

export function TrainingScreen({ player, onTrain, onBack }: TrainingScreenProps) {
  const [result, setResult] = useState<string | null>(null);

  const availableTraining = TRAINING_OPTIONS.filter(t => t.unlockLevel <= player.level);
  const lockedTraining = TRAINING_OPTIONS.filter(t => t.unlockLevel > player.level);

  function handleTrain(optionId: string) {
    const option = TRAINING_OPTIONS.find(t => t.id === optionId);
    if (!option) return;

    if (player.money < option.cost) {
      Alert.alert('Not Enough Money', `You need $${option.cost} for ${option.name}. You have $${player.money}.`);
      return;
    }

    const boostText = Object.entries(option.statBoosts)
      .map(([stat, val]) => `${formatStatName(stat)} +${val}`)
      .join(', ');

    setResult(`${option.name} complete!\n${boostText}\nCost: $${option.cost}`);
    onTrain(option.cost, option.statBoosts);
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

  if (result) {
    return (
      <View style={styles.container}>
        <View style={styles.resultContainer}>
          <Text style={styles.resultIcon}>🏋️</Text>
          <Text style={styles.resultTitle}>Training Complete!</Text>
          <Text style={styles.resultText}>{result}</Text>
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
        <Text style={styles.title}>Training Center</Text>
        <Text style={styles.moneyBadge}>${player.money}</Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 40 }}>
        {availableTraining.map(option => (
          <View key={option.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <View style={styles.optionInfo}>
                <Text style={styles.optionName}>{option.name}</Text>
                <Text style={styles.optionDesc}>{option.description}</Text>
              </View>
              <Text style={[styles.cost, player.money < option.cost && styles.costInsufficient]}>
                ${option.cost}
              </Text>
            </View>
            <Text style={styles.boosts}>
              {Object.entries(option.statBoosts).map(([stat, val]) => `${formatStatName(stat)} +${val}`).join('  ')}
            </Text>
            <Button
              title="Train"
              onPress={() => handleTrain(option.id)}
              size="small"
              variant={player.money >= option.cost ? 'primary' : 'secondary'}
              disabled={player.money < option.cost}
            />
          </View>
        ))}

        {lockedTraining.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Locked Training</Text>
            {lockedTraining.map(option => (
              <View key={option.id} style={[styles.card, styles.lockedCard]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.optionIcon}>{option.icon}</Text>
                  <View style={styles.optionInfo}>
                    <Text style={[styles.optionName, { color: COLORS.textLight }]}>{option.name}</Text>
                    <Text style={styles.optionDesc}>Unlocks at Level {option.unlockLevel}</Text>
                  </View>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              </View>
            ))}
          </>
        )}
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
  title: { ...FONTS.title, color: COLORS.textWhite, flex: 1 },
  moneyBadge: {
    backgroundColor: COLORS.accent,
    color: COLORS.textWhite,
    fontWeight: 'bold',
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  list: { flex: 1, padding: SPACING.md },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  lockedCard: { opacity: 0.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  optionIcon: { fontSize: 32, marginRight: 12 },
  optionInfo: { flex: 1 },
  optionName: { ...FONTS.subtitle, fontSize: 16 },
  optionDesc: { ...FONTS.small, marginTop: 2 },
  cost: { fontSize: 18, fontWeight: 'bold', color: COLORS.success },
  costInsufficient: { color: COLORS.danger },
  boosts: { fontSize: 12, color: COLORS.success, fontWeight: '500', marginBottom: 8 },
  lockIcon: { fontSize: 20 },
  sectionTitle: { ...FONTS.subtitle, marginTop: SPACING.md, marginBottom: SPACING.sm, color: COLORS.textLight },
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
