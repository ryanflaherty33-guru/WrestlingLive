import { MatchState, MatchPosition, MoveType, WrestlerStats, Opponent, PlayerData, Move } from '../data/types';
import { MOVES } from '../data/gameData';

const PERIOD_LENGTH = 120; // 2 minutes per period

export function createMatchState(): MatchState {
  return {
    playerScore: 0,
    opponentScore: 0,
    period: 1,
    timeRemaining: PERIOD_LENGTH,
    position: 'neutral',
    playerStamina: 100,
    opponentStamina: 100,
    isActive: true,
    lastAction: 'Match begins! Wrestlers in neutral position.',
    nearFall: false,
    pinCount: 0,
    opponentNearFall: false,
    opponentPinCount: 0,
  };
}

export function getAvailableMoves(position: MatchPosition): Move[] {
  return MOVES.filter(m => m.position.includes(position));
}

function calculateSuccessChance(
  attackerStat: number,
  defenderStat: number,
  attackerStamina: number,
  secondaryStat?: number
): number {
  const primary = attackerStat;
  const secondary = secondaryStat ?? attackerStat;
  const combined = primary * 0.7 + secondary * 0.3;
  const staminaModifier = attackerStamina / 100;
  const base = (combined - defenderStat * 0.6) / 100;
  return Math.max(0.1, Math.min(0.9, 0.45 + base * staminaModifier));
}

function getDefenseStat(position: MatchPosition, move: Move, opponentStats: WrestlerStats): number {
  if (position === 'neutral') {
    if (move.primaryStat === 'throwSkill') return opponentStats.takedownDefense;
    return opponentStats.takedownDefense;
  }
  if (position === 'playerBottom') return opponentStats.ridingSkill;
  if (position === 'playerTop') return opponentStats.escapeAbility;
  return 50;
}

// ─── Defense options for reacting to opponent attacks ───

export interface DefenseOption {
  id: string;
  name: string;
  icon: string;
  effectiveness: 'best' | 'good' | 'bad';
  stat: keyof WrestlerStats;
}

export interface OpponentAttack {
  name: string;
  description: string;
  icon: string;
  points: number;
  position: MatchPosition;           // current position
  resultPosition: MatchPosition;     // position if attack succeeds
  attackStat: number;                 // opponent's attack stat value
  defenseOptions: DefenseOption[];    // 2-3 options for the player
  nearFall: boolean;                  // does this create a near fall?
  reactionWindowMs: number;           // how long player has to react
}

export function generateOpponentAttack(
  state: MatchState,
  opponent: Opponent
): OpponentAttack | null {
  const position = state.position;

  // From neutral — opponent shoots or throws
  if (position === 'neutral') {
    const useThrow = opponent.stats.throwSkill > opponent.stats.takedownOffense && Math.random() < 0.3;

    if (useThrow) {
      const throwMoves = ['Hip Toss', "Fireman's Carry", 'Headlock'];
      const pick = throwMoves[Math.floor(Math.random() * throwMoves.length)];
      const baseReaction = 2800 - (opponent.stats.throwSkill * 5); // faster with higher skill
      return {
        name: pick,
        description: `Opponent is setting up a ${pick.toLowerCase()}!`,
        icon: pick === 'Headlock' ? '💫' : pick === 'Hip Toss' ? '🌀' : '🔥',
        points: pick === 'Headlock' ? 5 : 4,
        position: 'neutral',
        resultPosition: 'playerBottom',
        attackStat: opponent.stats.throwSkill,
        nearFall: true,
        reactionWindowMs: Math.max(1500, Math.min(3000, baseReaction)),
        defenseOptions: [
          { id: 'underhook', name: 'Underhook', icon: '↗', effectiveness: 'best', stat: 'takedownDefense' },
          { id: 'circle', name: 'Circle Away', icon: '↩', effectiveness: 'good', stat: 'conditioning' },
          { id: 'clinch', name: 'Clinch Up', icon: '🤝', effectiveness: 'bad', stat: 'strength' },
        ],
      };
    }

    // Regular shot
    const shotTypes = ['single leg', 'double leg', 'low single'];
    const pick = shotTypes[Math.floor(Math.random() * shotTypes.length)];
    const baseReaction = 3000 - (opponent.stats.takedownOffense * 5);
    return {
      name: `${pick.charAt(0).toUpperCase() + pick.slice(1)}`,
      description: `Opponent shoots a ${pick}!`,
      icon: '⬇',
      points: 2,
      position: 'neutral',
      resultPosition: 'playerBottom',
      attackStat: opponent.stats.takedownOffense,
      nearFall: false,
      reactionWindowMs: Math.max(1500, Math.min(3000, baseReaction)),
      defenseOptions: [
        { id: 'sprawl', name: 'Sprawl', icon: '⬆', effectiveness: 'best', stat: 'takedownDefense' },
        { id: 'crossface', name: 'Crossface', icon: '✋', effectiveness: 'good', stat: 'strength' },
        { id: 'pullGuard', name: 'Snap Down', icon: '↙', effectiveness: 'bad', stat: 'takedownOffense' },
      ],
    };
  }

  // Opponent on top (player on bottom) — opponent tries turn/pin
  if (position === 'playerBottom') {
    const turnTypes = [
      { name: 'Half Nelson', icon: '🔒', points: 2, stat: 'turnsAndPins' as keyof WrestlerStats },
      { name: 'Cradle', icon: '🤝', points: 3, stat: 'turnsAndPins' as keyof WrestlerStats },
      { name: 'Arm Bar', icon: '💪', points: 2, stat: 'ridingSkill' as keyof WrestlerStats },
      { name: 'Tilt', icon: '↕', points: 2, stat: 'turnsAndPins' as keyof WrestlerStats },
    ];
    const pick = turnTypes[Math.floor(Math.random() * turnTypes.length)];
    const baseReaction = 2600 - (opponent.stats[pick.stat] * 4);
    return {
      name: pick.name,
      description: `Opponent is locking up a ${pick.name.toLowerCase()}!`,
      icon: pick.icon,
      points: pick.points,
      position: 'playerBottom',
      resultPosition: 'playerBottom',
      attackStat: opponent.stats[pick.stat],
      nearFall: true,
      reactionWindowMs: Math.max(1500, Math.min(3000, baseReaction)),
      defenseOptions: [
        { id: 'fightHands', name: 'Fight Hands', icon: '✊', effectiveness: 'best', stat: 'escapeAbility' },
        { id: 'bellyDown', name: 'Belly Down', icon: '⬇', effectiveness: 'good', stat: 'strength' },
        { id: 'bridge', name: 'Bridge Out', icon: '🌉', effectiveness: 'bad', stat: 'conditioning' },
      ],
    };
  }

  // Player on top — opponent tries to escape/reverse
  if (position === 'playerTop') {
    const escapeTypes = [
      { name: 'Stand Up', points: 1, resultPos: 'neutral' as MatchPosition },
      { name: 'Switch', points: 2, resultPos: 'playerBottom' as MatchPosition },
      { name: 'Sit Out', points: 1, resultPos: 'neutral' as MatchPosition },
    ];
    const pick = escapeTypes[Math.floor(Math.random() * escapeTypes.length)];
    const baseReaction = 2800 - (opponent.stats.escapeAbility * 4);
    return {
      name: pick.name,
      description: `Opponent is trying to ${pick.name.toLowerCase()}!`,
      icon: pick.name === 'Switch' ? '🔄' : '⬆',
      points: pick.points,
      position: 'playerTop',
      resultPosition: pick.resultPos,
      attackStat: opponent.stats.escapeAbility,
      nearFall: false,
      reactionWindowMs: Math.max(1800, Math.min(3200, baseReaction)),
      defenseOptions: [
        { id: 'driveWeight', name: 'Drive Weight', icon: '⬇', effectiveness: 'best', stat: 'ridingSkill' },
        { id: 'relock', name: 'Re-lock Hands', icon: '🔒', effectiveness: 'good', stat: 'strength' },
        { id: 'followHips', name: 'Follow Hips', icon: '↩', effectiveness: 'bad', stat: 'conditioning' },
      ],
    };
  }

  return null;
}

export interface DefenseResult {
  success: boolean;
  message: string;
  opponentScoreChange: number;
  playerScoreChange: number;
  newPosition: MatchPosition;
  opponentStaminaCost: number;
  playerStaminaCost: number;
  opponentNearFall: boolean;
  nearFall: boolean;
}

export function resolveOpponentAttack(
  attack: OpponentAttack,
  chosenDefense: DefenseOption | null, // null = timed out
  state: MatchState,
  playerStats: WrestlerStats,
  opponent: Opponent
): DefenseResult {
  // Player timed out — opponent attack auto-succeeds
  if (!chosenDefense) {
    const isNearFall = attack.nearFall;
    return {
      success: false,
      message: `Too slow! Opponent hits the ${attack.name.toLowerCase()}! ${attack.points} points!`,
      opponentScoreChange: attack.points,
      playerScoreChange: 0,
      newPosition: attack.resultPosition,
      opponentStaminaCost: 8,
      playerStaminaCost: 3,
      opponentNearFall: isNearFall,
      nearFall: false,
    };
  }

  // Calculate defense success based on chosen option effectiveness and player stat
  const defStat = playerStats[chosenDefense.stat];
  let defenseBonus = 0;
  if (chosenDefense.effectiveness === 'best') defenseBonus = 15;
  else if (chosenDefense.effectiveness === 'good') defenseBonus = 5;
  else defenseBonus = -10; // bad choice

  const effectiveDefense = defStat + defenseBonus;
  const chance = calculateSuccessChance(attack.attackStat, effectiveDefense, state.opponentStamina);
  const roll = Math.random();
  const opponentSucceeds = roll < chance;

  if (opponentSucceeds) {
    // Opponent's attack lands despite defense attempt
    const isNearFall = attack.nearFall;
    return {
      success: false,
      message: `You try to ${chosenDefense.name.toLowerCase()} but opponent powers through the ${attack.name.toLowerCase()}! ${attack.points} points!`,
      opponentScoreChange: attack.points,
      playerScoreChange: 0,
      newPosition: attack.resultPosition,
      opponentStaminaCost: 10,
      playerStaminaCost: 6,
      opponentNearFall: isNearFall,
      nearFall: false,
    };
  }

  // Defense succeeds
  // Check for counter opportunity on 'best' defense
  if (chosenDefense.effectiveness === 'best' && Math.random() < 0.25) {
    // Counter! Player scores
    const counterPos = attack.position === 'neutral' ? 'playerTop' : attack.position === 'playerBottom' ? 'neutral' : 'playerTop';
    const counterPoints = attack.position === 'neutral' ? 2 : 1;
    return {
      success: true,
      message: `Great ${chosenDefense.name.toLowerCase()}! You counter the ${attack.name.toLowerCase()} and score ${counterPoints} points!`,
      opponentScoreChange: 0,
      playerScoreChange: counterPoints,
      newPosition: counterPos,
      opponentStaminaCost: 8,
      playerStaminaCost: 8,
      opponentNearFall: false,
      nearFall: false,
    };
  }

  return {
    success: true,
    message: `Good ${chosenDefense.name.toLowerCase()}! You defend the ${attack.name.toLowerCase()}.`,
    opponentScoreChange: 0,
    playerScoreChange: 0,
    newPosition: state.position,
    opponentStaminaCost: 6,
    playerStaminaCost: 4,
    opponentNearFall: false,
    nearFall: false,
  };
}

// ─── Player-initiated attacks (same as before, but no opponent counter-response) ───

export interface MoveResult {
  success: boolean;
  message: string;
  playerScoreChange: number;
  opponentScoreChange: number;
  newPosition: MatchPosition;
  playerStaminaCost: number;
  opponentStaminaCost: number;
  nearFall: boolean;
  pinAdvance: boolean;
}

export function executePlayerAttack(
  moveType: MoveType,
  state: MatchState,
  playerStats: WrestlerStats,
  opponent: Opponent
): MoveResult {
  const move = MOVES.find(m => m.type === moveType);
  if (!move) {
    return { success: false, message: 'Invalid move!', playerScoreChange: 0, opponentScoreChange: 0, newPosition: state.position, playerStaminaCost: 0, opponentStaminaCost: 0, nearFall: false, pinAdvance: false };
  }

  const primaryVal = playerStats[move.primaryStat];
  const secondaryVal = move.secondaryStat ? playerStats[move.secondaryStat] : undefined;
  const defenseStat = getDefenseStat(state.position, move, opponent.stats);
  const chance = calculateSuccessChance(primaryVal, defenseStat, state.playerStamina, secondaryVal);
  const roll = Math.random();
  const success = roll < chance;

  let result: MoveResult = {
    success,
    message: '',
    playerScoreChange: 0,
    opponentScoreChange: 0,
    newPosition: state.position,
    playerStaminaCost: success ? 10 : 6,
    opponentStaminaCost: 0,
    nearFall: false,
    pinAdvance: false,
  };

  if (success) {
    result.playerScoreChange = move.pointsOnSuccess;

    switch (state.position) {
      case 'neutral':
        if (move.primaryStat === 'throwSkill') {
          result.message = `You hit a beautiful ${move.name.toLowerCase()}! ${move.pointsOnSuccess} points!`;
          result.newPosition = 'playerTop';
          result.nearFall = move.pointsOnSuccess >= 4;
          result.playerStaminaCost = 15;
        } else if (move.type === 'sprawl') {
          result.message = 'Great sprawl! You stuff the shot.';
          result.playerScoreChange = 0;
          result.playerStaminaCost = 5;
        } else {
          result.message = `${move.name} connects! Takedown — 2 points!`;
          result.newPosition = 'playerTop';
        }
        break;

      case 'playerBottom':
        if (move.type === 'switch' || move.type === 'roll') {
          result.message = `Great ${move.name.toLowerCase()}! Reversal — ${move.pointsOnSuccess} points!`;
          result.newPosition = 'playerTop';
        } else {
          result.message = `${move.name} works! Escape — 1 point!`;
          result.newPosition = 'neutral';
        }
        break;

      case 'playerTop':
        result.message = `${move.name} turns him! ${move.pointsOnSuccess} near fall points!`;
        result.nearFall = true;
        result.pinAdvance = roll < chance * 0.3;
        break;
    }
  } else {
    switch (state.position) {
      case 'neutral':
        if (move.type === 'headlock') {
          if (Math.random() < 0.3) {
            result.message = 'Your headlock is countered! Opponent takes your back — 5 points!';
            result.opponentScoreChange = 5;
            result.newPosition = 'playerBottom';
          } else {
            result.message = 'Headlock attempt fails, back to wrestling.';
          }
        } else if (move.type === 'sprawl') {
          result.message = 'You sprawl but nothing was there.';
          result.playerStaminaCost = 3;
        } else {
          result.message = `${move.name} attempt is defended. Good defense by opponent.`;
        }
        break;
      case 'playerBottom':
        result.message = `${move.name} attempt fails. Opponent keeps you down.`;
        break;
      case 'playerTop':
        result.message = `${move.name} doesn't work. Opponent fights it off.`;
        break;
    }
  }

  return result;
}

// ─── Apply results to match state ───

export function applyPlayerAttack(
  moveType: MoveType,
  state: MatchState,
  playerStats: WrestlerStats,
  opponent: Opponent
): MatchState {
  const result = executePlayerAttack(moveType, state, playerStats, opponent);

  let newState = { ...state };
  newState.playerScore += result.playerScoreChange;
  newState.opponentScore += result.opponentScoreChange;
  newState.position = result.newPosition;
  newState.playerStamina = Math.max(0, newState.playerStamina - result.playerStaminaCost);
  newState.opponentStamina = Math.max(0, newState.opponentStamina - result.opponentStaminaCost);
  newState.nearFall = result.nearFall;
  newState.opponentNearFall = false;
  newState.lastAction = result.message;

  newState = checkTechFall(newState);
  newState = advanceMatchTime(newState);
  newState = recoverStamina(newState);

  return newState;
}

export function applyDefenseResult(
  result: DefenseResult,
  state: MatchState
): MatchState {
  let newState = { ...state };
  newState.opponentScore += result.opponentScoreChange;
  newState.playerScore += result.playerScoreChange;
  newState.position = result.newPosition;
  newState.opponentStamina = Math.max(0, newState.opponentStamina - result.opponentStaminaCost);
  newState.playerStamina = Math.max(0, newState.playerStamina - result.playerStaminaCost);
  newState.opponentNearFall = result.opponentNearFall;
  newState.nearFall = result.nearFall;
  newState.lastAction = result.message;

  newState = checkTechFall(newState);
  newState = advanceMatchTime(newState);
  newState = recoverStamina(newState);

  return newState;
}

function checkTechFall(state: MatchState): MatchState {
  let newState = { ...state };
  if (newState.playerScore - newState.opponentScore >= 15) {
    newState.isActive = false;
    newState.lastAction += '\nTECH FALL! Dominant victory!';
  } else if (newState.opponentScore - newState.playerScore >= 15) {
    newState.isActive = false;
    newState.lastAction += '\nTech fall... you lose by technical superiority.';
  }
  return newState;
}

function recoverStamina(state: MatchState): MatchState {
  return {
    ...state,
    playerStamina: Math.min(100, state.playerStamina + 2),
    opponentStamina: Math.min(100, state.opponentStamina + 2),
  };
}

export function advanceMatchTime(state: MatchState, seconds: number = 6): MatchState {
  let newState = { ...state };
  newState.timeRemaining -= seconds;

  if (newState.timeRemaining <= 0) {
    if (newState.period < 3) {
      newState.period = (newState.period + 1) as 1 | 2 | 3;
      newState.timeRemaining = PERIOD_LENGTH;
      if (newState.period === 2) {
        newState.position = 'playerBottom';
        newState.lastAction = `Period 2! You start on bottom.`;
      } else {
        newState.position = 'playerTop';
        newState.lastAction = `Period 3! You start on top.`;
      }
      newState.playerStamina = Math.min(100, newState.playerStamina + 20);
      newState.opponentStamina = Math.min(100, newState.opponentStamina + 20);
      newState.nearFall = false;
      newState.opponentNearFall = false;
    } else {
      newState.isActive = false;
      newState.lastAction = 'Match is over!';
    }
  }

  // Player pin tracking
  if (newState.nearFall) {
    newState.pinCount += 1;
    if (newState.pinCount >= 3) {
      newState.isActive = false;
      newState.lastAction = 'PIN! You pinned your opponent!';
    }
  } else {
    newState.pinCount = Math.max(0, newState.pinCount - 1);
  }

  // Opponent pin tracking
  if (newState.opponentNearFall) {
    newState.opponentPinCount += 1;
    if (newState.opponentPinCount >= 3) {
      newState.isActive = false;
      newState.lastAction = 'PINNED! Opponent pins you!';
    }
  } else {
    newState.opponentPinCount = Math.max(0, newState.opponentPinCount - 1);
  }

  return newState;
}

// ─── Timing helpers ───

export function getOpponentAttackInterval(opponent: Opponent): number {
  // How often opponent initiates attacks (ms)
  const baseInterval = 4000;
  const styleModifier = opponent.style === 'offensive' ? -800
    : opponent.style === 'scrambler' ? -400
    : opponent.style === 'defensive' ? 600
    : 0; // technician
  const conditioningModifier = -(opponent.stats.conditioning * 5);
  return Math.max(2500, Math.min(5500, baseInterval + styleModifier + conditioningModifier));
}

export function getMatchResult(state: MatchState): 'win' | 'loss' | 'ongoing' {
  if (state.isActive) return 'ongoing';
  if (state.pinCount >= 3) return 'win';
  if (state.opponentPinCount >= 3) return 'loss';
  if (state.playerScore > state.opponentScore) return 'win';
  if (state.playerScore < state.opponentScore) return 'loss';
  return Math.random() < 0.5 ? 'win' : 'loss';
}

// Keep old exports for backward compat (but they're no longer used by MatchScreen)
export { calculateSuccessChance };
