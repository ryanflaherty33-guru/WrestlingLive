import { Move, TrainingOption, PracticeDrill, Opponent, Tournament, WrestlerStats, TournamentTier, WeightClass } from './types';

export const MOVES: Move[] = [
  // Neutral position moves
  { type: 'shoot', name: 'Shoot', position: ['neutral'], primaryStat: 'takedownOffense', secondaryStat: 'conditioning', pointsOnSuccess: 2, description: 'Drive in for a double leg takedown', icon: '⬇' },
  { type: 'sprawl', name: 'Sprawl', position: ['neutral'], primaryStat: 'takedownDefense', secondaryStat: 'strength', pointsOnSuccess: 0, description: 'Defend against a shot attempt', icon: '⬆' },
  { type: 'snapdown', name: 'Snap Down', position: ['neutral'], primaryStat: 'takedownOffense', secondaryStat: 'strength', pointsOnSuccess: 2, description: 'Snap opponent down to the mat', icon: '↙' },
  { type: 'underhook', name: 'Underhook', position: ['neutral'], primaryStat: 'takedownOffense', secondaryStat: 'throwSkill', pointsOnSuccess: 2, description: 'Get inside control and work for position', icon: '↗' },
  { type: 'duckUnder', name: 'Duck Under', position: ['neutral'], primaryStat: 'takedownOffense', secondaryStat: 'conditioning', pointsOnSuccess: 2, description: 'Duck under the arm and get behind', icon: '↘' },

  // Bottom position moves
  { type: 'standup', name: 'Stand Up', position: ['playerBottom'], primaryStat: 'escapeAbility', secondaryStat: 'strength', pointsOnSuccess: 1, description: 'Base up and fight to your feet', icon: '⬆' },
  { type: 'sitout', name: 'Sit Out', position: ['playerBottom'], primaryStat: 'escapeAbility', secondaryStat: 'conditioning', pointsOnSuccess: 1, description: 'Sit out and turn to face opponent', icon: '↩' },
  { type: 'switch', name: 'Switch', position: ['playerBottom'], primaryStat: 'escapeAbility', secondaryStat: 'takedownOffense', pointsOnSuccess: 2, description: 'Hit a switch to reverse position', icon: '🔄' },
  { type: 'roll', name: 'Barrel Roll', position: ['playerBottom'], primaryStat: 'escapeAbility', secondaryStat: 'throwSkill', pointsOnSuccess: 2, description: 'Roll through to reverse position', icon: '↪' },

  // Top position moves (riding/turns)
  { type: 'halfNelson', name: 'Half Nelson', position: ['playerTop'], primaryStat: 'turnsAndPins', secondaryStat: 'strength', pointsOnSuccess: 2, description: 'Lock up a half nelson and turn', icon: '🔒' },
  { type: 'armbar', name: 'Arm Bar', position: ['playerTop'], primaryStat: 'ridingSkill', secondaryStat: 'turnsAndPins', pointsOnSuccess: 2, description: 'Control the arm and work a tilt', icon: '💪' },
  { type: 'cradle', name: 'Cradle', position: ['playerTop'], primaryStat: 'turnsAndPins', secondaryStat: 'strength', pointsOnSuccess: 3, description: 'Lock up a cradle for near fall', icon: '🤝' },
  { type: 'tilt', name: 'Tilt', position: ['playerTop'], primaryStat: 'turnsAndPins', secondaryStat: 'ridingSkill', pointsOnSuccess: 2, description: 'Tilt opponent to expose their back', icon: '↕' },

  // Throw moves (from neutral)
  { type: 'hipToss', name: 'Hip Toss', position: ['neutral'], primaryStat: 'throwSkill', secondaryStat: 'strength', pointsOnSuccess: 4, description: 'Hit a big hip toss for major points', icon: '🌀' },
  { type: 'headlock', name: 'Headlock', position: ['neutral'], primaryStat: 'throwSkill', secondaryStat: 'strength', pointsOnSuccess: 5, description: 'Lock up a headlock throw — high risk, high reward!', icon: '💫' },
  { type: 'fireman', name: "Fireman's Carry", position: ['neutral'], primaryStat: 'throwSkill', secondaryStat: 'takedownOffense', pointsOnSuccess: 4, description: "Hit a fireman's carry for big points", icon: '🔥' },
];

export const TRAINING_OPTIONS: TrainingOption[] = [
  { id: 'basic_weights', name: 'Basic Weight Room', description: 'Lift at the local gym', cost: 50, statBoosts: { strength: 2, conditioning: 1 }, icon: '🏋️', unlockLevel: 1 },
  { id: 'cardio', name: 'Cardio Session', description: 'Run and do conditioning drills', cost: 30, statBoosts: { conditioning: 3 }, icon: '🏃', unlockLevel: 1 },
  { id: 'wrestling_club', name: 'Wrestling Club', description: 'Extra practice at the local club', cost: 75, statBoosts: { takedownOffense: 1, takedownDefense: 1, escapeAbility: 1 }, icon: '🤼', unlockLevel: 2 },
  { id: 'private_coach', name: 'Private Coach', description: 'One-on-one technique session', cost: 150, statBoosts: { takedownOffense: 2, turnsAndPins: 2, throwSkill: 1 }, icon: '👨‍🏫', unlockLevel: 3 },
  { id: 'elite_gym', name: 'Elite Training Center', description: 'Train at a top-tier facility', cost: 300, statBoosts: { strength: 2, conditioning: 2, takedownOffense: 1, takedownDefense: 1 }, icon: '🏟️', unlockLevel: 5 },
  { id: 'olympic_camp', name: 'Olympic Training Camp', description: 'Train with the best in the country', cost: 500, statBoosts: { throwSkill: 3, takedownOffense: 2, ridingSkill: 2, turnsAndPins: 2 }, icon: '🥇', unlockLevel: 8 },
  { id: 'sports_science', name: 'Sports Science Lab', description: 'Advanced conditioning and recovery', cost: 400, statBoosts: { conditioning: 4, strength: 3 }, icon: '🔬', unlockLevel: 6 },
  { id: 'film_study', name: 'Film Study Session', description: 'Study opponents and technique', cost: 100, statBoosts: { takedownDefense: 2, ridingSkill: 2 }, icon: '📹', unlockLevel: 4 },
];

export const PRACTICE_DRILLS: PracticeDrill[] = [
  { id: 'td_singles', name: 'Single Leg Drills', description: 'Practice single leg takedowns', category: 'takedowns', statBoosts: { takedownOffense: 2 }, difficulty: 1, icon: '🦵' },
  { id: 'td_doubles', name: 'Double Leg Drills', description: 'Practice double leg setups and finishes', category: 'takedowns', statBoosts: { takedownOffense: 2, conditioning: 1 }, difficulty: 2, icon: '⬇' },
  { id: 'td_defense', name: 'Sprawl Drills', description: 'React and sprawl on incoming shots', category: 'takedowns', statBoosts: { takedownDefense: 3 }, difficulty: 2, icon: '🛡️' },
  { id: 'esc_standup', name: 'Stand Up Drills', description: 'Practice explosive standups', category: 'escapes', statBoosts: { escapeAbility: 2, strength: 1 }, difficulty: 1, icon: '⬆' },
  { id: 'esc_switch', name: 'Switch Drills', description: 'Practice hip switches from bottom', category: 'escapes', statBoosts: { escapeAbility: 2, takedownOffense: 1 }, difficulty: 2, icon: '🔄' },
  { id: 'esc_rolls', name: 'Roll Drills', description: 'Practice barrel rolls and granby rolls', category: 'escapes', statBoosts: { escapeAbility: 3 }, difficulty: 3, icon: '↪' },
  { id: 'turn_half', name: 'Half Nelson Drills', description: 'Practice half nelson turns', category: 'turns', statBoosts: { turnsAndPins: 2, strength: 1 }, difficulty: 1, icon: '🔒' },
  { id: 'turn_tilt', name: 'Tilt Series', description: 'Practice various tilts and cradles', category: 'turns', statBoosts: { turnsAndPins: 3 }, difficulty: 3, icon: '↕' },
  { id: 'turn_ride', name: 'Riding Drills', description: 'Practice riding and mat control', category: 'turns', statBoosts: { ridingSkill: 3 }, difficulty: 2, icon: '🏇' },
  { id: 'throw_hip', name: 'Hip Toss Drills', description: 'Practice hip tosses from the tie', category: 'throws', statBoosts: { throwSkill: 2, strength: 1 }, difficulty: 2, icon: '🌀' },
  { id: 'throw_head', name: 'Headlock Series', description: 'Practice headlock throws safely', category: 'throws', statBoosts: { throwSkill: 3 }, difficulty: 3, icon: '💫' },
  { id: 'throw_fireman', name: "Fireman's Carry", description: "Practice fireman's carry technique", category: 'throws', statBoosts: { throwSkill: 2, takedownOffense: 1 }, difficulty: 2, icon: '🔥' },
];

const FIRST_NAMES = ['Mike', 'Dan', 'Kyle', 'Jake', 'Cody', 'Tyler', 'Nick', 'Ben', 'Alex', 'Matt', 'Chris', 'Jordan', 'Sam', 'Ryan', 'Zach', 'Derek', 'Luke', 'Ethan', 'Noah', 'Mason'];
const LAST_NAMES = ['Smith', 'Johnson', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Brown', 'Garcia', 'Martinez', 'Lee', 'Clark', 'Lewis', 'Young', 'Walker', 'Hall', 'King', 'Wright'];

function randomName(): string {
  return `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
}

function generateStats(tier: TournamentTier): WrestlerStats {
  const baseByTier: Record<TournamentTier, number> = {
    local: 25,
    regional: 40,
    state: 55,
    national: 70,
    world: 85,
  };
  const base = baseByTier[tier];
  const variance = 15;
  const rand = () => Math.max(5, Math.min(99, base + Math.floor(Math.random() * variance * 2) - variance));
  return {
    takedownOffense: rand(),
    takedownDefense: rand(),
    escapeAbility: rand(),
    ridingSkill: rand(),
    turnsAndPins: rand(),
    throwSkill: rand(),
    conditioning: rand(),
    strength: rand(),
  };
}

export function generateOpponent(tier: TournamentTier, weightClass: WeightClass): Opponent {
  const styles: Opponent['style'][] = ['offensive', 'defensive', 'scrambler', 'technician'];
  return {
    name: randomName(),
    stats: generateStats(tier),
    weightClass,
    tier,
    style: styles[Math.floor(Math.random() * styles.length)],
  };
}

export function generateTournament(tier: TournamentTier, weightClass: WeightClass): Tournament {
  const config: Record<TournamentTier, { name: string; entryFee: number; prize: number; exp: number; rounds: number }> = {
    local: { name: 'Local Open', entryFee: 25, prize: 200, exp: 50, rounds: 3 },
    regional: { name: 'Regional Championship', entryFee: 75, prize: 500, exp: 150, rounds: 4 },
    state: { name: 'State Championship', entryFee: 150, prize: 1200, exp: 400, rounds: 4 },
    national: { name: 'National Championship', entryFee: 300, prize: 3000, exp: 1000, rounds: 5 },
    world: { name: 'World Championship', entryFee: 500, prize: 8000, exp: 3000, rounds: 5 },
  };
  const c = config[tier];
  const opponents = Array.from({ length: c.rounds }, () => generateOpponent(tier, weightClass));
  return {
    name: c.name,
    tier,
    entryFee: c.entryFee,
    prize: c.prize,
    expReward: c.exp,
    rounds: c.rounds,
    opponents,
  };
}

export const TIER_UNLOCK_LEVEL: Record<TournamentTier, number> = {
  local: 1,
  regional: 3,
  state: 5,
  national: 8,
  world: 12,
};

export const TIER_NAMES: Record<TournamentTier, string> = {
  local: 'Local',
  regional: 'Regional',
  state: 'State',
  national: 'National',
  world: 'World',
};

export function getExpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function createDefaultPlayer(name: string, weightClass: WeightClass): import('./types').PlayerData {
  return {
    name,
    weightClass,
    stats: {
      takedownOffense: 20,
      takedownDefense: 20,
      escapeAbility: 20,
      ridingSkill: 15,
      turnsAndPins: 15,
      throwSkill: 10,
      conditioning: 25,
      strength: 20,
    },
    level: 1,
    experience: 0,
    money: 200,
    record: { wins: 0, losses: 0, pins: 0 },
    currentTournamentTier: 'local',
    trainedToday: false,
    practicedToday: false,
  };
}
