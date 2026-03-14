import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING } from '../utils/theme';
import { Button } from '../components/Button';
import { WeightClass, PlayerData } from '../data/types';
import { createDefaultPlayer } from '../data/gameData';

interface CreatePlayerScreenProps {
  onCreate: (player: PlayerData) => void;
}

const WEIGHT_CLASSES: WeightClass[] = ['125', '133', '141', '149', '157', '165', '174', '184', '197', '285'];

export function CreatePlayerScreen({ onCreate }: CreatePlayerScreenProps) {
  const [name, setName] = useState('');
  const [weightClass, setWeightClass] = useState<WeightClass>('157');

  function handleCreate() {
    const playerName = name.trim() || 'Rookie';
    const player = createDefaultPlayer(playerName, weightClass);
    onCreate(player);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.gameName}>WRESTLING LIVE</Text>
        <Text style={styles.tagline}>Create Your Wrestler</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Wrestler Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your name..."
          placeholderTextColor={COLORS.textLight}
          maxLength={20}
        />

        <Text style={[styles.label, { marginTop: SPACING.lg }]}>Weight Class</Text>
        <View style={styles.weightGrid}>
          {WEIGHT_CLASSES.map(wc => (
            <TouchableOpacity
              key={wc}
              style={[styles.weightBtn, weightClass === wc && styles.weightBtnActive]}
              onPress={() => setWeightClass(wc)}
            >
              <Text style={[styles.weightText, weightClass === wc && styles.weightTextActive]}>
                {wc}
              </Text>
              <Text style={[styles.weightUnit, weightClass === wc && styles.weightTextActive]}>
                lbs
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Starting Stats</Text>
          <Text style={styles.previewText}>
            All skills start low — you'll build them up through practice and training!
          </Text>
          <Text style={styles.previewText}>Starting Money: $200</Text>
          <Text style={styles.previewText}>Tournament Tier: Local</Text>
        </View>

        <Button
          title="Start Wrestling!"
          onPress={handleCreate}
          variant="accent"
          size="large"
          icon="🤼"
          style={{ marginTop: SPACING.lg }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryDark },
  content: { paddingBottom: 60 },
  header: {
    paddingTop: 80,
    paddingBottom: 30,
    alignItems: 'center',
  },
  gameName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.accent,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 18,
    color: COLORS.matGray,
    marginTop: 8,
  },
  form: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    flex: 1,
  },
  label: { ...FONTS.subtitle, marginBottom: SPACING.sm },
  input: {
    backgroundColor: COLORS.cardDark,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  weightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  weightBtn: {
    backgroundColor: COLORS.cardDark,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: '18%',
    flexGrow: 1,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  weightBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.accent,
  },
  weightText: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  weightUnit: { fontSize: 11, color: COLORS.textLight },
  weightTextActive: { color: COLORS.textWhite },
  preview: {
    backgroundColor: COLORS.cardDark,
    borderRadius: 14,
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  previewTitle: { ...FONTS.subtitle, marginBottom: 8 },
  previewText: { ...FONTS.body, color: COLORS.textLight, marginBottom: 4 },
});
