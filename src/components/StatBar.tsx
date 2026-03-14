import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/theme';

interface StatBarProps {
  label: string;
  value: number;
  maxValue?: number;
  showValue?: boolean;
  compact?: boolean;
}

export function StatBar({ label, value, maxValue = 100, showValue = true, compact = false }: StatBarProps) {
  const pct = Math.min(100, (value / maxValue) * 100);
  const color = pct >= 60 ? COLORS.statHigh : pct >= 35 ? COLORS.statMid : COLORS.statLow;

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Text style={[styles.label, compact && styles.labelCompact]}>{label}</Text>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      {showValue && <Text style={[styles.value, compact && styles.valueCompact]}>{value}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  compact: {
    marginVertical: 1,
  },
  label: {
    width: 120,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  labelCompact: {
    width: 90,
    fontSize: 11,
  },
  barBg: {
    flex: 1,
    height: 12,
    backgroundColor: COLORS.cardDark,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  value: {
    width: 32,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  valueCompact: {
    width: 26,
    fontSize: 11,
  },
});
