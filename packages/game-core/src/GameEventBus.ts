import EventEmitter from 'eventemitter3'

export interface GameOverEventPayload {
  finalScore: number
  stars: number
}

export interface ScoreUpdateEventPayload {
  score: number
  combo?: number
}

export interface HudMessageEventPayload {
  message: string
}

export type GameEventMap = {
  'game:ready': []
  'game:over': [GameOverEventPayload]
  'game:paused': []
  'game:resumed': []
  'score:update': [ScoreUpdateEventPayload]
  'hud:message': [HudMessageEventPayload]
}

class GameEventBus extends EventEmitter<GameEventMap> {}

export const gameEventBus = new GameEventBus()
