import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, FONTS } from '../utils/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'primary', size = 'medium', disabled = false, icon, style }: ButtonProps) {
  const bgColor = disabled ? COLORS.matGray :
    variant === 'primary' ? COLORS.primary :
    variant === 'secondary' ? COLORS.cardDark :
    variant === 'accent' ? COLORS.accent :
    COLORS.danger;

  const textColor = variant === 'secondary' ? COLORS.text : COLORS.textWhite;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: bgColor },
        size === 'small' && styles.small,
        size === 'large' && styles.large,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, { color: textColor }, size === 'small' && styles.smallText]}>
        {icon ? `${icon} ${title}` : title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  text: {
    ...FONTS.button,
  },
  smallText: {
    fontSize: 13,
  },
});
