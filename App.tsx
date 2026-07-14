import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';

const BEST_KEY = '@livewire/best';

interface Best {
  score: number;
  circuit: number;
}

export default function App() {
  const [screen, setScreen] = useState<'home' | 'game'>('home');
  const [best, setBest] = useState<Best>({ score: 0, circuit: 1 });

  useEffect(() => {
    AsyncStorage.getItem(BEST_KEY)
      .then((raw) => {
        if (raw) setBest(JSON.parse(raw));
      })
      .catch(() => {});
  }, []);

  const handleGameOver = useCallback((score: number, circuit: number) => {
    setBest((prev) => {
      if (score <= prev.score) return prev;
      const next = { score, circuit: Math.max(prev.circuit, circuit) };
      AsyncStorage.setItem(BEST_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {screen === 'home' ? (
        <HomeScreen best={best} onPlay={() => setScreen('game')} />
      ) : (
        <GameScreen
          best={best}
          onGameOver={handleGameOver}
          onHome={() => setScreen('home')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060312' },
});
