import React from 'react';
import { View, StyleSheet } from 'react-native';

// Each pose is an array of strings. Each character maps to a color:
// '.' = transparent, 'h' = hair, 's' = skin, 'u' = uniform (team color), 'b' = boots, 'o' = outline

const PIXEL_SIZE = 4;

const SKIN = '#F4C794';
const SKIN_SHADOW = '#D4A874';
const HAIR = '#3B2314';
const BOOTS = '#222222';
const OUTLINE = '#1A1A1A';
const MAT_SHADOW = 'rgba(0,0,0,0.15)';

// ─── POSE DEFINITIONS ───
// Each row is a string, each character is a pixel

const POSES: Record<string, string[]> = {
  // Standing neutral stance (facing right)
  standing: [
    '...hhh..',
    '..hsssh.',
    '..ssssh.',
    '..sssso.',
    '...uuu..',
    '..uuuuo.',
    '.suuuus.',
    '..suus..',
    '...uu...',
    '..su.us.',
    '..u...u.',
    '.bb...bb',
  ],

  // Shooting - driving forward low for a takedown
  shooting: [
    '........',
    '..hhh...',
    '.hsssh..',
    '.ssssh..',
    '..suuuus',
    '...uuuuu',
    '....uuu.',
    '...uu...',
    '..uu....',
    '.uu.....',
    'bb......',
    '........',
  ],

  // Sprawling - hips down, legs back
  sprawling: [
    '........',
    '........',
    '...hhh..',
    '..hsssh.',
    '..ssssh.',
    's.suuuu.',
    '.s..uuuu',
    '.....uuu',
    '......uu',
    '.....u.u',
    '....b..b',
    '........',
  ],

  // On top - riding/controlling (kneeling behind opponent)
  onTopRide: [
    '..hhh...',
    '.hsssh..',
    '.ssssh..',
    '.sssso..',
    '..uuu...',
    '.uuuuu..',
    'suuuuus.',
    '..uuuu..',
    '..u..u..',
    '.bb..bb.',
    '........',
    '........',
  ],

  // On bottom - referee's position (hands and knees)
  onBottom: [
    '........',
    '........',
    '........',
    '.hhh....',
    'hsssh...',
    'ssssh...',
    'suuuuus.',
    '.uuuuuu.',
    '.u..u..u',
    '.b..b..b',
    '........',
    '........',
  ],

  // Turning opponent (half nelson / tilt from top)
  turning: [
    '........',
    '..hhh...',
    '.hsssh..',
    '.ssssh..',
    '.ssuuus.',
    '..uuuuu.',
    '.suuuus.',
    '..uuus..',
    '..uu.u..',
    '.bb..bb.',
    '........',
    '........',
  ],

  // Being turned (back exposed)
  beingTurned: [
    '........',
    '........',
    '........',
    '........',
    '...hhh..',
    '..hsssh.',
    '..ssssh.',
    '.suuuus.',
    '.uuuuuu.',
    'uuu..uu.',
    'bb...bb.',
    '........',
  ],

  // Throwing (hip toss / headlock throw - upright, lifting)
  throwing: [
    '...hhh..',
    '..hsssh.',
    '..ssssh.',
    '..sssss.',
    '..suuus.',
    '..uuuuu.',
    '.suuuus.',
    '..suu...',
    '...uu...',
    '..u..u..',
    '.bb..bb.',
    '........',
  ],

  // Being thrown (in the air, rotated)
  beingThrown: [
    '........',
    '.....hh.',
    '....hssh',
    '....ssss',
    '...suuus',
    '..uuuuu.',
    '.suuus..',
    '.uu.....',
    'uu......',
    'b.......',
    '........',
    '........',
  ],

  // Escaping (explosive standup from bottom)
  escaping: [
    '........',
    '..hhh...',
    '.hsssh..',
    '.ssssh..',
    '..suus..',
    '..uuuu..',
    '.suuuus.',
    '..suu...',
    '..uu....',
    '.u...u..',
    '.b...b..',
    '........',
  ],

  // Pinning (pressing opponent's shoulders)
  pinning: [
    '..hhh...',
    '.hsssh..',
    '.ssssh..',
    '..suuus.',
    '..uuuuus',
    '.suuuuuu',
    '..uuuuu.',
    '...uuu..',
    '..uu.u..',
    '.bb..bb.',
    '........',
    '........',
  ],

  // Being pinned (shoulders on mat)
  beingPinned: [
    '........',
    '........',
    '........',
    '........',
    '....hhh.',
    '...hsss.',
    '..ssssh.',
    '.suuuus.',
    'uuuuuuu.',
    'uu...uu.',
    'bb...bb.',
    '........',
  ],
};

// Mirror a pose horizontally (for facing left)
function mirrorPose(pose: string[]): string[] {
  return pose.map(row => row.split('').reverse().join(''));
}

interface PixelWrestlerProps {
  pose: keyof typeof POSES;
  teamColor: string;
  teamColorDark: string;
  mirrored?: boolean;
  scale?: number;
}

export function PixelWrestler({ pose, teamColor, teamColorDark, mirrored = false, scale = 1 }: PixelWrestlerProps) {
  const poseData = POSES[pose] || POSES.standing;
  const pixels = mirrored ? mirrorPose(poseData) : poseData;
  const pxSize = PIXEL_SIZE * scale;

  return (
    <View style={{ alignItems: 'center' }}>
      {pixels.map((row, y) => (
        <View key={y} style={{ flexDirection: 'row' }}>
          {row.split('').map((char, x) => {
            let color: string | null = null;
            switch (char) {
              case 'h': color = HAIR; break;
              case 's': color = SKIN; break;
              case 'o': color = SKIN_SHADOW; break;
              case 'u': color = teamColor; break;
              case 'd': color = teamColorDark; break;
              case 'b': color = BOOTS; break;
              default: color = null;
            }
            return (
              <View
                key={x}
                style={{
                  width: pxSize,
                  height: pxSize,
                  backgroundColor: color || 'transparent',
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── SCENE COMPOSITIONS ───
// Pre-composed scenes with two wrestlers for each match state

const PLAYER_COLOR = '#2E7D32';
const PLAYER_COLOR_DARK = '#1B5E20';
const OPPONENT_COLOR = '#C62828';
const OPPONENT_COLOR_DARK = '#8B1A1A';

interface PixelSceneProps {
  position: string;
  attackMove?: string; // name of current attack for contextual visuals
  isDefending?: boolean;
}

export function PixelScene({ position, attackMove, isDefending }: PixelSceneProps) {
  // Choose poses based on match position and current action
  let playerPose: keyof typeof POSES = 'standing';
  let opponentPose: keyof typeof POSES = 'standing';
  let playerMirrored = false;
  let opponentMirrored = true;
  let stackVertical = false;
  let overlap = 0;

  if (isDefending && attackMove) {
    // Opponent is attacking — show the attack happening
    const move = attackMove.toLowerCase();
    if (move.includes('single') || move.includes('double') || move.includes('low single') || move.includes('shoot')) {
      playerPose = 'sprawling';
      opponentPose = 'shooting';
      overlap = 16;
    } else if (move.includes('hip toss') || move.includes('headlock') || move.includes("fireman")) {
      playerPose = 'beingThrown';
      opponentPose = 'throwing';
      overlap = 20;
      stackVertical = true;
    } else if (move.includes('half nelson') || move.includes('cradle') || move.includes('arm bar') || move.includes('tilt')) {
      playerPose = 'beingTurned';
      opponentPose = 'turning';
      stackVertical = true;
      overlap = 16;
    } else if (move.includes('stand up') || move.includes('switch') || move.includes('sit out')) {
      playerPose = 'onTopRide';
      opponentPose = 'escaping';
      overlap = 12;
    } else {
      playerPose = 'standing';
      opponentPose = 'shooting';
      overlap = 14;
    }
  } else {
    switch (position) {
      case 'neutral':
        playerPose = 'standing';
        opponentPose = 'standing';
        break;
      case 'playerTop':
        playerPose = 'onTopRide';
        opponentPose = 'onBottom';
        stackVertical = true;
        overlap = 14;
        break;
      case 'playerBottom':
        playerPose = 'onBottom';
        opponentPose = 'onTopRide';
        playerMirrored = false;
        opponentMirrored = false;
        stackVertical = true;
        overlap = 14;
        break;
    }
  }

  if (stackVertical) {
    // One wrestler on top of the other
    const topIsPlayer = position === 'playerTop' || (isDefending && !['playerBottom'].includes(position));
    const topPose = topIsPlayer ? playerPose : opponentPose;
    const bottomPose = topIsPlayer ? opponentPose : playerPose;
    const topColor = topIsPlayer ? PLAYER_COLOR : OPPONENT_COLOR;
    const topColorDark = topIsPlayer ? PLAYER_COLOR_DARK : OPPONENT_COLOR_DARK;
    const bottomColor = topIsPlayer ? OPPONENT_COLOR : PLAYER_COLOR;
    const bottomColorDark = topIsPlayer ? OPPONENT_COLOR_DARK : PLAYER_COLOR_DARK;
    const topMirrored = topIsPlayer ? playerMirrored : opponentMirrored;
    const bottomMirrored = topIsPlayer ? opponentMirrored : playerMirrored;

    return (
      <View style={sceneStyles.container}>
        <View style={{ marginBottom: -overlap }}>
          <PixelWrestler
            pose={topPose}
            teamColor={topColor}
            teamColorDark={topColorDark}
            mirrored={topMirrored}
            scale={1.2}
          />
        </View>
        <PixelWrestler
          pose={bottomPose}
          teamColor={bottomColor}
          teamColorDark={bottomColorDark}
          mirrored={bottomMirrored}
          scale={1.2}
        />
        {/* Mat shadow */}
        <View style={sceneStyles.matShadow} />
      </View>
    );
  }

  // Side by side (neutral)
  return (
    <View style={sceneStyles.container}>
      <View style={sceneStyles.sideByRow}>
        <View style={{ marginRight: -overlap }}>
          <PixelWrestler
            pose={playerPose}
            teamColor={PLAYER_COLOR}
            teamColorDark={PLAYER_COLOR_DARK}
            mirrored={playerMirrored}
            scale={1.2}
          />
        </View>
        <PixelWrestler
          pose={opponentPose}
          teamColor={OPPONENT_COLOR}
          teamColorDark={OPPONENT_COLOR_DARK}
          mirrored={opponentMirrored}
          scale={1.2}
        />
      </View>
      {/* Mat shadow */}
      <View style={sceneStyles.matShadow} />
    </View>
  );
}

const sceneStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  sideByRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  matShadow: {
    width: 80,
    height: 4,
    backgroundColor: MAT_SHADOW,
    borderRadius: 40,
    marginTop: 2,
  },
});
