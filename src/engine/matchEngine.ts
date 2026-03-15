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

interface OpponentAction {
  action: string;
  scoreChange: number;
  newPosition: MatchPosition;
  staminaCost: number;
  nearFall: boolean;
  pinAdvance: boolean;
}

function opponentAI(state: MatchState, opponent: Opponent, playerStats: WrestlerStats): OpponentAction {
  const position = state.position;

  // Opponent on top (player is on bottom)
  if (position === 'playerBottom') {
    // Opponent tries turn/pin moves using their stats vs player's escape ability
    const turnMoves = MOVES.filter(m => m.position.includes('playerTop'));
    const move = turnMoves[Math.floor(Math.random() * turnMoves.length)];
    const attackStat = opponent.stats[move.primaryStat];
    const defenseStat = playerStats.escapeAbility;
    const chance = calculateSuccessChance(attackStat, defenseStat, state.opponentStamina);

    if (Math.random() < chance) {
      const isPin = Math.random() < chance * 0.3;
      return {
        action: `Opponent hits a ${move.name.toLowerCase()}! ${move.pointsOnSuccess} near fall points!`,
        scoreChange: move.pointsOnSuccess,
        newPosition: position,
        staminaCost: 10,
        nearFall: true,
        pinAdvance: isPin,
      };
    }
    return {
      action: 'Opponent tries to turn you but you hold position.',
      scoreChange: 0,
      newPosition: position,
      staminaCost: 5,
      nearFall: false,
      pinAdvance: false,
    };
  }

  // Opponent on bottom (player is on top) — opponent tries to escape/reverse
  if (position === 'playerTop') {
    const defenseStat = playerStats.ridingSkill;
    const chance = calculateSuccessChance(opponent.stats.escapeAbility, defenseStat, state.opponentStamina);
    if (Math.random() < chance) {
      const reversed = Math.random() < 0.35;
      return {
        action: reversed ? 'Opponent reverses! 2 points!' : 'Opponent escapes! Back to neutral. 1 point.',
        scoreChange: reversed ? 2 : 1,
        newPosition: reversed ? 'playerBottom' : 'neutral',
        staminaCost: 10,
        nearFall: false,
        pinAdvance: false,
      };
    }
    return {
      action: 'Opponent struggles underneath but you maintain control.',
      scoreChange: 0,
      newPosition: position,
      staminaCost: 6,
      nearFall: false,
      pinAdvance: false,
    };
  }

  // Neutral — opponent attacks
  if (position === 'neutral') {
    const aggressiveness = opponent.style === 'offensive' ? 0.65
      : opponent.style === 'defensive' ? 0.3
      : opponent.style === 'scrambler' ? 0.55
      : 0.45; // technician

    if (Math.random() < aggressiveness) {
      // Decide attack type: takedown or throw
      const useThrow = opponent.stats.throwSkill > opponent.stats.takedownOffense && Math.random() < 0.35;

      if (useThrow) {
        const throwMoves = MOVES.filter(m => m.position.includes('neutral') && m.primaryStat === 'throwSkill');
        const move = throwMoves[Math.floor(Math.random() * throwMoves.length)];
        const chance = calculateSuccessChance(opponent.stats.throwSkill, playerStats.takedownDefense, state.opponentStamina, opponent.stats.strength);

        if (Math.random() < chance) {
          return {
            action: `Opponent hits a ${move.name.toLowerCase()}! ${move.pointsOnSuccess} points!`,
            scoreChange: move.pointsOnSuccess,
            newPosition: 'playerBottom',
            staminaCost: 15,
            nearFall: move.pointsOnSuccess >= 4,
            pinAdvance: Math.random() < chance * 0.2,
          };
        }
        // Failed throw — possible counter
        if (move.type === 'headlock' && Math.random() < 0.3) {
          return {
            action: 'Opponent tries a headlock — you counter! You take their back — 5 points!',
            scoreChange: -5, // negative = player scores
            newPosition: 'playerTop',
            staminaCost: 12,
            nearFall: false,
            pinAdvance: false,
          };
        }
        return {
          action: `Opponent tries a ${move.name.toLowerCase()} but you defend!`,
          scoreChange: 0,
          newPosition: 'neutral',
          staminaCost: 10,
          nearFall: false,
          pinAdvance: false,
        };
      }

      // Regular takedown attempt
      const chance = calculateSuccessChance(opponent.stats.takedownOffense, playerStats.takedownDefense, state.opponentStamina);
      if (Math.random() < chance) {
        return {
          action: 'Opponent shoots and scores a takedown! 2 points!',
          scoreChange: 2,
          newPosition: 'playerBottom',
          staminaCost: 12,
          nearFall: false,
          pinAdvance: false,
        };
      }
      return {
        action: 'Opponent shoots but you defend!',
        scoreChange: 0,
        newPosition: 'neutral',
        staminaCost: 8,
        nearFall: false,
        pinAdvance: false,
      };
    }
    return {
      action: 'Opponent circles, looking for an opening.',
      scoreChange: 0,
      newPosition: 'neutral',
      staminaCost: 3,
      nearFall: false,
      pinAdvance: false,
    };
  }

  return { action: '', scoreChange: 0, newPosition: position, staminaCost: 3, nearFall: false, pinAdvance: false };
}

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

export function executeMove(
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
          const counterChance = 0.3;
          if (Math.random() < counterChance) {
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

export function advanceMatchTime(state: MatchState, seconds: number = 8): MatchState {
  let newState = { ...state };
  newState.timeRemaining -= seconds;

  if (newState.timeRemaining <= 0) {
    if (newState.period < 3) {
      newState.period = (newState.period + 1) as 1 | 2 | 3;
      newState.timeRemaining = PERIOD_LENGTH;
      // Alternate positions each period
      if (newState.period === 2) {
        newState.position = 'playerBottom';
        newState.lastAction = `Period 2! You start on bottom.`;
      } else {
        newState.position = 'playerTop';
        newState.lastAction = `Period 3! You start on top.`;
      }
      // Restore some stamina between periods
      newState.playerStamina = Math.min(100, newState.playerStamina + 20);
      newState.opponentStamina = Math.min(100, newState.opponentStamina + 20);
      // Reset near fall state between periods
      newState.nearFall = false;
      newState.opponentNearFall = false;
    } else {
      newState.isActive = false;
      newState.lastAction = 'Match is over!';
    }
  }

  // Player near fall / pin tracking
  if (newState.nearFall) {
    newState.pinCount += 1;
    if (newState.pinCount >= 3) {
      newState.isActive = false;
      newState.lastAction = 'PIN! You pinned your opponent!';
    }
  } else {
    newState.pinCount = Math.max(0, newState.pinCount - 1);
  }

  // Opponent near fall / pin tracking
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

export function processFullTurn(
  moveType: MoveType,
  state: MatchState,
  playerStats: WrestlerStats,
  opponent: Opponent
): MatchState {
  const moveResult = executeMove(moveType, state, playerStats, opponent);

  let newState = { ...state };
  newState.playerScore += moveResult.playerScoreChange;
  newState.opponentScore += moveResult.opponentScoreChange;
  newState.position = moveResult.newPosition;
  newState.playerStamina = Math.max(0, newState.playerStamina - moveResult.playerStaminaCost);
  newState.opponentStamina = Math.max(0, newState.opponentStamina - moveResult.opponentStaminaCost);
  newState.nearFall = moveResult.nearFall;

  // Reset opponent near fall — player just acted, opponent hasn't yet
  newState.opponentNearFall = false;

  let message = moveResult.message;

  // Opponent always gets a response action
  const opponentAction = opponentAI(newState, opponent, playerStats);

  // Handle opponent score (negative scoreChange means player scored on a counter)
  if (opponentAction.scoreChange < 0) {
    newState.playerScore += Math.abs(opponentAction.scoreChange);
  } else {
    newState.opponentScore += opponentAction.scoreChange;
  }

  newState.position = opponentAction.newPosition;
  newState.opponentStamina = Math.max(0, newState.opponentStamina - opponentAction.staminaCost);
  newState.opponentNearFall = opponentAction.nearFall;

  if (opponentAction.action) {
    message += '\n' + opponentAction.action;
  }

  // Check for tech fall (15 point lead)
  if (newState.playerScore - newState.opponentScore >= 15) {
    newState.isActive = false;
    message += '\nTECH FALL! Dominant victory!';
  } else if (newState.opponentScore - newState.playerScore >= 15) {
    newState.isActive = false;
    message += '\nTech fall... you lose by technical superiority.';
  }

  newState.lastAction = message;
  newState = advanceMatchTime(newState);

  // Stamina recovery
  newState.playerStamina = Math.min(100, newState.playerStamina + 2);
  newState.opponentStamina = Math.min(100, newState.opponentStamina + 2);

  return newState;
}

export function getMatchResult(state: MatchState): 'win' | 'loss' | 'ongoing' {
  if (state.isActive) return 'ongoing';
  if (state.pinCount >= 3) return 'win';
  if (state.opponentPinCount >= 3) return 'loss';
  if (state.playerScore > state.opponentScore) return 'win';
  if (state.playerScore < state.opponentScore) return 'loss';
  // Tie goes to... random for now
  return Math.random() < 0.5 ? 'win' : 'loss';
}
