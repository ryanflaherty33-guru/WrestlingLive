import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerData } from '../data/types';

const PLAYER_KEY = 'wrestling_live_player';

export async function savePlayer(player: PlayerData): Promise<void> {
  try {
    await AsyncStorage.setItem(PLAYER_KEY, JSON.stringify(player));
  } catch (e) {
    console.error('Failed to save player data:', e);
  }
}

export async function loadPlayer(): Promise<PlayerData | null> {
  try {
    const data = await AsyncStorage.getItem(PLAYER_KEY);
    if (data) return JSON.parse(data);
    return null;
  } catch (e) {
    console.error('Failed to load player data:', e);
    return null;
  }
}

export async function deletePlayer(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PLAYER_KEY);
  } catch (e) {
    console.error('Failed to delete player data:', e);
  }
}
