export { gameEventBus } from './GameEventBus.ts'
export type {
  GameEventMap,
  GameOverEventPayload,
  ScoreUpdateEventPayload,
  HudMessageEventPayload,
} from './GameEventBus.ts'

export { MiniGameScene } from './MiniGameScene.ts'

export {
  registerGame,
  getAllRegisteredGames,
  findRegisteredGameById,
} from './GameRegistry.ts'
export type { GameDefinition } from './GameRegistry.ts'

export { PenaltyKickScene, PENALTY_KICK_SCENE_KEY } from './scenes/PenaltyKickScene.ts'
export { PenaltyGoalkeepingScene, PENALTY_GOALKEEPING_SCENE_KEY } from './scenes/PenaltyGoalkeepingScene.ts'
export { KeepieTuppiesScene, KEEPIE_TUPPIES_SCENE_KEY } from './scenes/KeepieTuppiesScene.ts'
export { FreeKickScene, FREE_KICK_SCENE_KEY } from './scenes/FreeKickScene.ts'
export { DribblingSlalomScene, DRIBBLING_SLALOM_SCENE_KEY } from './scenes/DribblingSlalomScene.ts'
export { HeaderChallengeScene, HEADER_CHALLENGE_SCENE_KEY } from './scenes/HeaderChallengeScene.ts'
export { PuzzleBobbleScene, PUZZLE_BOBBLE_SCENE_KEY } from './scenes/PuzzleBobbleScene.ts'

// Side-effect import: registers all games into the registry on module load.
import './registrations.ts'
