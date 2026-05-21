import { registerGame } from './GameRegistry.ts'
import { PenaltyKickScene } from './scenes/PenaltyKickScene.ts'
import { PenaltyGoalkeepingScene } from './scenes/PenaltyGoalkeepingScene.ts'
import { KeepieTuppiesScene } from './scenes/KeepieTuppiesScene.ts'
import { FreeKickScene } from './scenes/FreeKickScene.ts'
import { DribblingSlalomScene } from './scenes/DribblingSlalomScene.ts'
import { HeaderChallengeScene } from './scenes/HeaderChallengeScene.ts'

registerGame({
  id: 'penalty-kick',
  title: 'Penalty Kick',
  description: 'Aim and shoot — score as many penalties as you can.',
  thumbnailTextureKey: 'thumbnail-penalty-kick',
  sceneClass: PenaltyKickScene,
  tags: ['shooting', 'classic'],
})

registerGame({
  id: 'penalty-goalkeeping',
  title: 'Goalkeeping',
  description: 'Read the shooter and dive to save every penalty.',
  thumbnailTextureKey: 'thumbnail-penalty-goalkeeping',
  sceneClass: PenaltyGoalkeepingScene,
  tags: ['reaction', 'defense'],
})

registerGame({
  id: 'keepie-tuppies',
  title: 'Defender Buster',
  description: 'Break through the wall of defenders and score the goal.',
  thumbnailTextureKey: 'thumbnail-keepie-tuppies',
  sceneClass: KeepieTuppiesScene,
  tags: ['arcade', 'breakout'],
})

registerGame({
  id: 'free-kick',
  title: 'Free Kick',
  description: 'Curl the ball past the wall and into the net.',
  thumbnailTextureKey: 'thumbnail-free-kick',
  sceneClass: FreeKickScene,
  tags: ['shooting', 'precision'],
})

registerGame({
  id: 'dribbling-slalom',
  title: 'Dribbling Slalom',
  description: 'Navigate the ball through cones and past defenders.',
  thumbnailTextureKey: 'thumbnail-dribbling-slalom',
  sceneClass: DribblingSlalomScene,
  tags: ['dribbling', 'time-trial'],
})

registerGame({
  id: 'header-challenge',
  title: 'Header Challenge',
  description: 'Time your jump and head crosses into the goal.',
  thumbnailTextureKey: 'thumbnail-header-challenge',
  sceneClass: HeaderChallengeScene,
  tags: ['timing', 'shooting'],
})
