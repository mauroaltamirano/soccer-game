import type Phaser from 'phaser'

export interface GameDefinition {
  id: string
  title: string
  description: string
  thumbnailTextureKey: string
  sceneClass: typeof Phaser.Scene
  tags: string[]
}

const registeredGames: GameDefinition[] = []

export function registerGame(definition: GameDefinition): void {
  const alreadyRegistered = registeredGames.some(game => game.id === definition.id)
  if (alreadyRegistered) {
    throw new Error(`A game with id "${definition.id}" is already registered.`)
  }
  registeredGames.push(definition)
}

export function getAllRegisteredGames(): GameDefinition[] {
  return [...registeredGames]
}

export function findRegisteredGameById(gameId: string): GameDefinition | undefined {
  return registeredGames.find(game => game.id === gameId)
}
