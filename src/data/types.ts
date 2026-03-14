// Core game types

export interface WrestlerStats {
  takedownOffense: number;    // 1-100
  takedownDefense: number;    // 1-100
  escapeAbility: number;      // 1-100
  ridingSkill: number;        // 1-100
  turnsAndPins: number;       // 1-100
  throwSkill: number;         // 1-100
  conditioning: number;       // 1-100
  strength: number;           // 1-100
}

export interface PlayerData {
  name: string;
  weightClass: WeightClass;
  stats: WrestlerStats;
  level: number;
  experience: number;
  money: number;
  record: { wins: number; losses: number; pins: number };
  currentTournamentTier: TournamentTier;
  trainedToday: boolean;
  practicedToday: boolean;
}

export type WeightClass = '125' | '133' | '141' | '149' | '157' | '165' | '174' | '184' | '197' | '285';

export type TournamentTier = 'local' | 'regional' | 'state' | 'national' | 'world';

export type MatchPosition = 'neutral' | 'playerTop' | 'playerBottom' | 'opponentTop' | 'opponentBottom';

export type MoveType =
  | 'shoot' | 'sprawl' | 'snapdown' | 'underhook'   // neutral moves
  | 'standup' | 'sitout' | 'switch' | 'roll'          // bottom moves
  | 'halfNelson' | 'armbar' | 'cradle' | 'tilt'       // top/turn moves
  | 'hipToss' | 'headlock' | 'fireman' | 'duckUnder'; // throw/advanced moves

export interface Move {
  type: MoveType;
  name: string;
  position: MatchPosition[];  // valid positions for this move
  primaryStat: keyof WrestlerStats;
  secondaryStat?: keyof WrestlerStats;
  pointsOnSuccess: number;
  description: string;
  icon: string;
}

export interface MatchState {
  playerScore: number;
  opponentScore: number;
  period: 1 | 2 | 3;
  timeRemaining: number;      // seconds
  position: MatchPosition;
  playerStamina: number;       // 0-100
  opponentStamina: number;     // 0-100
  isActive: boolean;
  lastAction: string;
  nearFall: boolean;
  pinCount: number;            // 0-3, if reaches 3 = pin
}

export interface Opponent {
  name: string;
  stats: WrestlerStats;
  weightClass: WeightClass;
  tier: TournamentTier;
  style: 'offensive' | 'defensive' | 'scrambler' | 'technician';
}

export interface Tournament {
  name: string;
  tier: TournamentTier;
  entryFee: number;
  prize: number;
  expReward: number;
  rounds: number;
  opponents: Opponent[];
}

export interface TrainingOption {
  id: string;
  name: string;
  description: string;
  cost: number;
  statBoosts: Partial<WrestlerStats>;
  icon: string;
  unlockLevel: number;
}

export interface PracticeDrill {
  id: string;
  name: string;
  description: string;
  category: 'takedowns' | 'escapes' | 'turns' | 'throws';
  statBoosts: Partial<WrestlerStats>;
  difficulty: number;
  icon: string;
}

export type Screen = 'home' | 'practice' | 'training' | 'tournament' | 'match' | 'bracket' | 'profile';
