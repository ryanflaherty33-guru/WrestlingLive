import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';
import { PlayerData, Screen, WrestlerStats, Tournament, MatchState } from './src/data/types';
import { getExpForLevel, TIER_UNLOCK_LEVEL } from './src/data/gameData';
import { getMatchResult } from './src/engine/matchEngine';
import { savePlayer, loadPlayer } from './src/utils/storage';
import { COLORS } from './src/utils/theme';

import { HomeScreen } from './src/screens/HomeScreen';
import { PracticeScreen } from './src/screens/PracticeScreen';
import { TrainingScreen } from './src/screens/TrainingScreen';
import { TournamentScreen } from './src/screens/TournamentScreen';
import { MatchScreen } from './src/screens/MatchScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { CreatePlayerScreen } from './src/screens/CreatePlayerScreen';

export default function App() {
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [loading, setLoading] = useState(true);

  // Tournament state
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [currentRound, setCurrentRound] = useState(0);

  useEffect(() => {
    loadPlayer().then(saved => {
      if (saved) setPlayer(saved);
      setLoading(false);
    });
  }, []);

  const persistPlayer = useCallback((updated: PlayerData) => {
    setPlayer(updated);
    savePlayer(updated);
  }, []);

  function updateStats(current: PlayerData, boosts: Partial<WrestlerStats>): PlayerData {
    const newStats = { ...current.stats };
    for (const [key, val] of Object.entries(boosts)) {
      const k = key as keyof WrestlerStats;
      newStats[k] = Math.min(99, newStats[k] + (val as number));
    }
    return { ...current, stats: newStats };
  }

  function checkLevelUp(p: PlayerData): PlayerData {
    let updated = { ...p };
    let expNeeded = getExpForLevel(updated.level + 1);
    while (updated.experience >= expNeeded) {
      updated.experience -= expNeeded;
      updated.level += 1;
      expNeeded = getExpForLevel(updated.level + 1);

      const tiers = ['local', 'regional', 'state', 'national', 'world'] as const;
      const currentIdx = tiers.indexOf(updated.currentTournamentTier);
      if (currentIdx < tiers.length - 1) {
        const nextTier = tiers[currentIdx + 1];
        if (updated.level >= TIER_UNLOCK_LEVEL[nextTier]) {
          updated.currentTournamentTier = nextTier;
        }
      }
    }
    return updated;
  }

  function handleCreatePlayer(newPlayer: PlayerData) {
    persistPlayer(newPlayer);
  }

  function handleNavigate(screen: Screen) {
    setCurrentScreen(screen);
  }

  function handleNewDay() {
    if (!player) return;
    persistPlayer({ ...player, trainedToday: false, practicedToday: false });
  }

  function handlePracticeComplete(boosts: Partial<WrestlerStats>) {
    if (!player) return;
    let updated = updateStats(player, boosts);
    updated.practicedToday = true;
    updated.experience += 10;
    updated = checkLevelUp(updated);
    persistPlayer(updated);
  }

  function handleTrain(cost: number, boosts: Partial<WrestlerStats>) {
    if (!player) return;
    let updated = updateStats(player, boosts);
    updated.money -= cost;
    updated.trainedToday = true;
    updated.experience += 15;
    updated = checkLevelUp(updated);
    persistPlayer(updated);
  }

  function handleEnterMatch(tournament: Tournament, roundIndex: number) {
    if (!player) return;

    if (roundIndex === 0) {
      persistPlayer({ ...player, money: player.money - tournament.entryFee });
    }

    setActiveTournament(tournament);
    setCurrentRound(roundIndex);
    setCurrentScreen('match');
  }

  function handleMatchEnd(result: 'win' | 'loss', finalState: MatchState) {
    if (!player || !activeTournament) return;

    let updated = { ...player };

    if (result === 'win') {
      updated.record.wins += 1;
      if (finalState.pinCount >= 3) updated.record.pins += 1;
      updated.experience += Math.floor(activeTournament.expReward / activeTournament.rounds);
      updated.money += Math.floor(activeTournament.prize / activeTournament.rounds / 2);

      if (currentRound + 1 >= activeTournament.rounds) {
        updated.money += activeTournament.prize;
        updated.experience += activeTournament.expReward;
        updated = checkLevelUp(updated);
        persistPlayer(updated);
        setActiveTournament(null);
        setCurrentScreen('home');
      } else {
        updated = checkLevelUp(updated);
        persistPlayer(updated);
        setCurrentRound(currentRound + 1);
        setCurrentScreen('tournament');
      }
    } else {
      updated.record.losses += 1;
      updated.experience += Math.floor(activeTournament.expReward / activeTournament.rounds / 3);
      updated = checkLevelUp(updated);
      persistPlayer(updated);
      setActiveTournament(null);
      setCurrentScreen('home');
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>WRESTLING LIVE</Text>
        <StatusBar style="light" />
      </View>
    );
  }

  if (!player) {
    return (
      <>
        <CreatePlayerScreen onCreate={handleCreatePlayer} />
        <StatusBar style="light" />
      </>
    );
  }

  function renderScreen() {
    if (!player) return null;

    switch (currentScreen) {
      case 'home':
        return (
          <HomeScreen
            player={player}
            onNavigate={handleNavigate}
            onNewDay={handleNewDay}
          />
        );
      case 'practice':
        return (
          <PracticeScreen
            player={player}
            onComplete={handlePracticeComplete}
            onBack={() => setCurrentScreen('home')}
          />
        );
      case 'training':
        return (
          <TrainingScreen
            player={player}
            onTrain={handleTrain}
            onBack={() => setCurrentScreen('home')}
          />
        );
      case 'tournament':
        return (
          <TournamentScreen
            player={player}
            onEnterMatch={handleEnterMatch}
            onBack={() => { setActiveTournament(null); setCurrentScreen('home'); }}
          />
        );
      case 'match':
        if (!activeTournament) return null;
        return (
          <MatchScreen
            player={player}
            opponent={activeTournament.opponents[currentRound]}
            onMatchEnd={handleMatchEnd}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            player={player}
            onBack={() => setCurrentScreen('home')}
          />
        );
      default:
        return null;
    }
  }

  return (
    <>
      {renderScreen()}
      <StatusBar style={currentScreen === 'match' ? 'light' : 'auto'} />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.accent,
    letterSpacing: 4,
  },
});
