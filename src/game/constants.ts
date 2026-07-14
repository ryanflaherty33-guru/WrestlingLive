export interface Palette {
  name: string;
  primary: string; // energized wire + spark tint
  accent: string; // orbs, score pops
  dim: string; // de-energized branches
  bg: string;
  grid: string;
}

export const PALETTES: Palette[] = [
  { name: 'NEON CITY', primary: '#00F0FF', accent: '#FF3DF2', dim: '#1E3A55', bg: '#060312', grid: '#101B33' },
  { name: 'SOLAR FLARE', primary: '#FFB300', accent: '#B36BFF', dim: '#4A3520', bg: '#0D0510', grid: '#241533' },
  { name: 'TOXIC RUSH', primary: '#B6FF00', accent: '#FF2E88', dim: '#2E4418', bg: '#04100A', grid: '#0F2A1A' },
  { name: 'DEEP FREEZE', primary: '#7DF9FF', accent: '#FF5C33', dim: '#22405A', bg: '#03081A', grid: '#0E1E3E' },
  { name: 'GOLD RUSH', primary: '#FFD700', accent: '#00FFC6', dim: '#4A4020', bg: '#100A03', grid: '#2A2210' },
];

export const DANGER = '#FF3355';
export const WHITE = '#FFFFFF';

// Speed in world pixels/second at circuit n (1-based).
export const speedForCircuit = (circuit: number) =>
  Math.min(660, 235 + (circuit - 1) * 48);

// Forks you must pass to finish circuit n and advance.
export const forksToClear = (circuit: number) => 5 + circuit;

export const STARTING_FUSES = 3;
export const ORB_SCORE = 40;
export const FORK_SCORE = 20;
export const MAX_MULTIPLIER = 9;
