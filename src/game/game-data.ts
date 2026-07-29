import rawNngGame from './nng4.generated.json'
import nngConformance from './nng4.conformance.json'
import rawRealAnalysisGame from './real-analysis.generated.json'
import realAnalysisConformance from './real-analysis.conformance.json'
import rawManifoldGame from './manifolds.generated.json'
import manifoldConformance from './manifolds.conformance.json'

export type VerificationSupport = 'kernel' | 'partial' | 'blocked'
export type GameRules = 'regular' | 'relaxed' | 'none'
export type GameVerifierKind = 'natural-number' | 'real-analysis' | 'manifold'

export interface GameLevel {
  gameId: string
  id: string
  world: string
  number: number
  title: string
  introduction: string
  conclusion: string
  statementText?: string
  statement: string
  theoremName: string | null
  solution: string
  hints: string[]
  newTactics: string[]
  hiddenTactics?: string[]
  newTheorems: string[]
  newDefinitions: string[]
  disabledTactics: string[]
  disabledTheorems: string[]
  disabledDefinitions?: string[]
  sourcePath: string
  verification: VerificationSupport
}

export interface GameWorld {
  gameId: string
  id: string
  title: string
  introduction: string
  prerequisites: string[]
  verification: VerificationSupport
  levels: GameLevel[]
}

interface RawGame {
  source: {
    repository: string
    commit: string
    license: string
    toolchain: string
    importedAt: string
  }
  title: string
  introduction: string
  information?: string
  caption?: string
  coverImage?: string
  worlds: Array<Omit<GameWorld, 'gameId' | 'levels'> & {
    levels: Array<Omit<GameLevel, 'gameId'>>
  }>
}

export interface LeanGame extends Omit<RawGame, 'worlds'> {
  id: string
  shortTitle: string
  symbol: string
  developmentStatus?: 'work-in-progress'
  basePath: string
  progressKey: string
  assetBase?: string
  verifier: GameVerifierKind
  creator: string
  creatorUrl: string
  courseNotesUrl?: string
  worlds: GameWorld[]
}

// Backwards-compatible names used by the NNG verifier and its tests.
export type NngLevel = GameLevel
export type NngWorld = GameWorld
export type NngGame = LeanGame

export interface LevelInventory {
  tactics: string[]
  theorems: string[]
  definitions: string[]
}

export interface LevelPolicyInventory extends LevelInventory {
  disabledTactics: string[]
  disabledTheorems: string[]
  disabledDefinitions: string[]
}

function enrichGame(
  raw: RawGame,
  metadata: Omit<LeanGame, keyof RawGame | 'worlds'>,
  supportForLevel: (level: Omit<GameLevel, 'gameId'>) => VerificationSupport,
): LeanGame {
  const worlds = raw.worlds.map((world) => {
    const levels = world.levels.map((level) => ({
      ...level,
      gameId: metadata.id,
      verification: supportForLevel(level),
    }))
    return {
      ...world,
      gameId: metadata.id,
      verification: levels.every((level) => level.verification === 'kernel')
        ? 'kernel' as const
        : levels.some((level) => level.verification !== 'blocked')
          ? 'partial' as const
          : 'blocked' as const,
      levels,
    }
  })
  return { ...raw, ...metadata, worlds }
}

const kernelVerifiedLevels = new Set(nngConformance.verifiedReferenceSolutions)

export const nngGame = enrichGame(
  rawNngGame as RawGame,
  {
    id: 'natural-number-game',
    shortTitle: 'Natural Number Game',
    symbol: 'ℕ',
    basePath: '/game',
    progressKey: 'nng4LocalProgress',
    verifier: 'natural-number',
    creator: 'Kevin Buzzard and Mohammad Pedramfar',
    creatorUrl: 'https://github.com/leanprover-community/NNG4',
  },
  (level) => kernelVerifiedLevels.has(level.id) ? 'kernel' : 'partial',
)

const realAnalysisKernelVerifiedLevels = new Set(
  realAnalysisConformance.verifiedReferenceSolutions,
)

export const realAnalysisGame = enrichGame(
  rawRealAnalysisGame as RawGame,
  {
    id: 'real-analysis-game',
    shortTitle: 'Real Analysis',
    symbol: 'ℝ',
    basePath: '/games/real-analysis-game',
    progressKey: 'realAnalysisGameLocalProgress',
    assetBase: '/game-assets/real-analysis',
    verifier: 'real-analysis',
    creator: 'Alex Kontorovich',
    creatorUrl: 'https://math.rutgers.edu/~alexk',
    courseNotesUrl: 'https://alexkontorovich.github.io/2025F311H',
  },
  (level) => realAnalysisKernelVerifiedLevels.has(level.id) ? 'kernel' : 'partial',
)

const manifoldKernelVerifiedLevels = new Set(manifoldConformance.verifiedReferenceSolutions)

export const manifoldGame = enrichGame(
  rawManifoldGame as RawGame,
  {
    id: 'manifold-adventure',
    shortTitle: 'Manifold Adventure',
    symbol: '𝓜',
    developmentStatus: 'work-in-progress',
    basePath: '/games/manifold-adventure',
    progressKey: 'manifoldAdventureV4MathlibProgress',
    assetBase: '/game-assets/manifolds',
    verifier: 'manifold',
    creator: 'this project',
    creatorUrl: 'https://github.com/cauli/lean4-wasm-in-browser',
    courseNotesUrl: 'https://link.springer.com/book/10.1007/978-1-4419-7400-6',
  },
  (level) => manifoldKernelVerifiedLevels.has(level.id)
    ? 'kernel'
    : 'partial',
)

export const games = [nngGame, realAnalysisGame, manifoldGame]
export const allLevels = nngGame.worlds.flatMap((world) => world.levels)

export function getGame(id: string): LeanGame | undefined {
  return games.find((game) => game.id === id)
}

export function gameForLevel(level: GameLevel): LeanGame {
  return getGame(level.gameId) || nngGame
}

export function gameForWorld(world: GameWorld): LeanGame {
  return getGame(world.gameId) || nngGame
}

export function findGameFromPath(pathname: string): LeanGame | undefined {
  if (/^\/game(?:\/|$)/.test(pathname)) return nngGame
  if (/^\/games\/natural-number-game(?:\/|$)/.test(pathname)) return nngGame
  if (/^\/games\/real-analysis-game(?:\/|$)/.test(pathname)) return realAnalysisGame
  if (/^\/games\/manifold-adventure(?:\/|$)/.test(pathname)) return manifoldGame
  return undefined
}

export function getWorld(id: string, game: LeanGame = nngGame): GameWorld | undefined {
  return game.worlds.find((world) => world.id === id)
}

export function getLevel(id: string, game: LeanGame = nngGame): GameLevel | undefined {
  return game.worlds.flatMap((world) => world.levels).find((level) => level.id === id)
}

export function levelPath(level: GameLevel): string {
  const game = gameForLevel(level)
  return `${game.basePath}/${level.world.toLowerCase()}/${level.number}`
}

export function worldPath(world: GameWorld): string {
  const game = gameForWorld(world)
  return `${game.basePath}/${world.id.toLowerCase()}`
}

function pathWithinGame(pathname: string, game: LeanGame): string | undefined {
  if (game.id === nngGame.id) {
    const legacy = /^\/game(\/.*)?$/.exec(pathname)
    if (legacy) return legacy[1] || ''
    const scoped = /^\/games\/natural-number-game(\/.*)?$/.exec(pathname)
    return scoped?.[1] || (scoped ? '' : undefined)
  }
  const match = new RegExp(`^${game.basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\/.*)?$`).exec(pathname)
  return match?.[1] || (match ? '' : undefined)
}

export function findLevelFromPath(
  pathname: string,
  game: LeanGame = findGameFromPath(pathname) || nngGame,
): GameLevel | undefined {
  const remainder = pathWithinGame(pathname, game)
  const match = /^\/([^/]+)\/(\d+)\/?$/.exec(remainder || '')
  if (!match) return undefined
  const world = game.worlds.find((candidate) => candidate.id.toLowerCase() === match[1])
  return world?.levels.find((level) => level.number === Number(match[2]))
}

export function findWorldFromPath(
  pathname: string,
  game: LeanGame = findGameFromPath(pathname) || nngGame,
): GameWorld | undefined {
  const remainder = pathWithinGame(pathname, game)
  const match = /^\/([^/]+)\/?$/.exec(remainder || '')
  if (!match) return undefined
  return game.worlds.find((candidate) => candidate.id.toLowerCase() === match[1])
}

function ancestorWorldIds(
  world: GameWorld,
  game: LeanGame,
  found = new Set<string>(),
): Set<string> {
  for (const prerequisite of world.prerequisites) {
    if (found.has(prerequisite)) continue
    found.add(prerequisite)
    const prerequisiteWorld = getWorld(prerequisite, game)
    if (prerequisiteWorld) ancestorWorldIds(prerequisiteWorld, game, found)
  }
  return found
}

export function levelsAvailableBefore(level: GameLevel): GameLevel[] {
  const game = gameForLevel(level)
  const world = getWorld(level.world, game)
  if (!world) return []
  const ancestors = ancestorWorldIds(world, game)
  return game.worlds.flatMap((candidate) => {
    if (ancestors.has(candidate.id)) return candidate.levels
    if (candidate.id === world.id) {
      return candidate.levels.filter((candidateLevel) => candidateLevel.number < level.number)
    }
    return []
  })
}

function shortName(name: string): string {
  return name.split('.').at(-1) || name
}

export function allInventory(game: LeanGame = nngGame): LevelInventory {
  const tactics = new Set<string>()
  const theorems = new Set<string>()
  const definitions = new Set<string>()

  for (const level of game.worlds.flatMap((world) => world.levels)) {
    level.newTactics.forEach((name) => tactics.add(shortName(name)))
    level.newTheorems.forEach((name) => theorems.add(shortName(name)))
    level.newDefinitions.forEach((name) => definitions.add(shortName(name)))
    if (level.theoremName) theorems.add(level.theoremName)
  }

  return {
    tactics: [...tactics].sort(),
    theorems: [...theorems].sort(),
    definitions: [...definitions].sort(),
  }
}

export function inventoryForLevel(level: GameLevel): LevelInventory {
  const available = [...levelsAvailableBefore(level), level]
  const tactics = new Set<string>()
  const theorems = new Set<string>()
  const definitions = new Set<string>()

  for (const candidate of available) {
    candidate.newTactics.forEach((name) => tactics.add(shortName(name)))
    candidate.newTheorems.forEach((name) => theorems.add(shortName(name)))
    candidate.newDefinitions.forEach((name) => definitions.add(shortName(name)))
    if (candidate.theoremName && candidate.id !== level.id) theorems.add(candidate.theoremName)
  }
  level.disabledTactics.forEach((name) => tactics.delete(shortName(name)))
  level.disabledTheorems.forEach((name) => theorems.delete(shortName(name)))
  level.disabledDefinitions?.forEach((name) => definitions.delete(shortName(name)))

  return {
    tactics: [...tactics].sort(),
    theorems: [...theorems].sort(),
    definitions: [...definitions].sort(),
  }
}

/**
 * Inventory used by the NNG verifier. Hidden tactics remain absent from the
 * visible inventory, but Lean4Game permits them after their introduction.
 */
export function policyInventoryForLevel(level: GameLevel): LevelPolicyInventory {
  const available = [...levelsAvailableBefore(level), level]
  const tactics = new Set<string>()
  const theorems = new Set<string>()
  const definitions = new Set<string>()

  for (const candidate of available) {
    candidate.newTactics.forEach((name) => tactics.add(shortName(name)))
    candidate.hiddenTactics?.forEach((name) => tactics.add(shortName(name)))
    candidate.newTheorems.forEach((name) => {
      theorems.add(name)
      theorems.add(shortName(name))
    })
    candidate.newDefinitions.forEach((name) => {
      definitions.add(name)
      definitions.add(shortName(name))
    })
    if (candidate.theoremName && candidate.id !== level.id) {
      theorems.add(candidate.theoremName)
      theorems.add(`MyNat.${candidate.theoremName}`)
    }
  }

  const disabledTactics = (level.disabledTactics || []).map(shortName)
  const disabledTheorems = (level.disabledTheorems || []).flatMap((name) => [name, shortName(name)])
  const disabledDefinitions = (level.disabledDefinitions || []).flatMap((name) => [name, shortName(name)])

  disabledTactics.forEach((name) => tactics.delete(name))
  disabledTheorems.forEach((name) => theorems.delete(name))
  disabledDefinitions.forEach((name) => definitions.delete(name))

  return {
    tactics: [...tactics].sort(),
    theorems: [...theorems].sort(),
    definitions: [...definitions].sort(),
    disabledTactics: [...new Set(disabledTactics)].sort(),
    disabledTheorems: [...new Set(disabledTheorems)].sort(),
    disabledDefinitions: [...new Set(disabledDefinitions)].sort(),
  }
}

export function nextLevel(level: GameLevel): GameLevel | undefined {
  const levels = gameForLevel(level).worlds.flatMap((world) => world.levels)
  const index = levels.findIndex((candidate) => candidate.id === level.id)
  return index >= 0 ? levels[index + 1] : undefined
}

export interface GoalBinding {
  names: string
  type: string
}

export interface StructuredGoal {
  caseName?: string
  objects: GoalBinding[]
  assumptions: GoalBinding[]
  goal: string
}

function topLevelColon(value: string): number {
  let depth = 0
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (character === '(' || character === '[' || character === '{') depth += 1
    else if (character === ')' || character === ']' || character === '}') depth = Math.max(0, depth - 1)
    else if (character === ':' && depth === 0) return index
  }
  return -1
}

function binderGroups(value: string): Array<{ body: string; delimiter: string }> {
  const groups: Array<{ body: string; delimiter: string }> = []
  const closing: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
  let cursor = 0

  while (cursor < value.length) {
    while (/\s/.test(value[cursor] || '')) cursor += 1
    const opener = value[cursor]
    const closer = closing[opener]
    if (!closer) break

    let depth = 1
    let end = cursor + 1
    while (end < value.length && depth > 0) {
      if (value[end] === opener) depth += 1
      else if (value[end] === closer) depth -= 1
      end += 1
    }
    if (depth !== 0) break
    groups.push({ body: value.slice(cursor + 1, end - 1).trim(), delimiter: opener })
    cursor = end
  }
  return groups
}

function namesIn(binding: GoalBinding): string[] {
  return binding.names
    .replace(/[{}[\]]/g, '')
    .split(/\s+/)
    .filter(Boolean)
}

function isAssumption(binding: GoalBinding, propositionNames: Set<string>): boolean {
  if (binding.type === 'Prop') return false
  const names = namesIn(binding)
  if (names.some((name) => (
    name === 'h'
    || /^h[A-Z0-9_']/.test(name)
    || /^h[a-z]{1,3}$/.test(name)
  ))) return true
  if (/[=≠≤≥<>∧∨¬∀∃]/.test(binding.type)) return true
  const typeNames = binding.type.match(/[A-Za-z_][A-Za-z0-9_']*/g) || []
  return typeNames.some((name) => propositionNames.has(name))
}

function partitionBindings(bindings: GoalBinding[]): Pick<StructuredGoal, 'objects' | 'assumptions'> {
  const propositionNames = new Set<string>()
  const objects: GoalBinding[] = []
  const assumptions: GoalBinding[] = []

  for (const binding of bindings) {
    const assumption = isAssumption(binding, propositionNames)
    if (assumption) assumptions.push(binding)
    else objects.push(binding)
    if (!assumption && binding.type === 'Prop') {
      namesIn(binding).forEach((name) => propositionNames.add(name))
    }
  }
  return { objects, assumptions }
}

export function splitStatement(level: GameLevel): StructuredGoal {
  let declaration = level.statement.trim()
  if (level.theoremName && declaration.startsWith(level.theoremName)) {
    declaration = declaration.slice(level.theoremName.length).trim()
  }

  let depth = 0
  let splitAt = -1
  for (let index = 0; index < declaration.length; index += 1) {
    const character = declaration[index]
    if (character === '(' || character === '[' || character === '{') depth += 1
    else if (character === ')' || character === ']' || character === '}') depth = Math.max(0, depth - 1)
    else if (character === ':' && depth === 0) splitAt = index
  }

  if (splitAt < 0) return { objects: [], assumptions: [], goal: declaration }
  const context = declaration.slice(0, splitAt).trim()
  const bindings = binderGroups(context).map(({ body, delimiter }) => {
    const colon = topLevelColon(body)
    if (colon < 0) {
      return {
        names: '',
        type: delimiter === '[' ? `[${body}]` : body,
      }
    }
    return {
      names: body.slice(0, colon).trim(),
      type: body.slice(colon + 1).trim(),
    }
  })
  return {
    ...partitionBindings(bindings),
    goal: declaration.slice(splitAt + 1).trim(),
  }
}

export function splitLiveGoal(state: string): StructuredGoal {
  const turnstile = state.lastIndexOf('⊢')
  if (turnstile < 0) return { objects: [], assumptions: [], goal: state.trim() }

  const context = state.slice(0, turnstile).trim()
  const lines = context.split('\n')
  const caseLine = lines[0]?.trim().match(/^case\s+(.+)$/)
  if (caseLine) lines.shift()

  const bindings: GoalBinding[] = []
  for (const sourceLine of lines) {
    const line = sourceLine.trim()
    if (!line) continue
    const colon = line.indexOf(':')
    if (colon > 0) {
      bindings.push({
        names: line.slice(0, colon).trim(),
        type: line.slice(colon + 1).trim(),
      })
    } else if (bindings.length > 0) {
      bindings[bindings.length - 1].type += ` ${line}`
    }
  }

  return {
    caseName: caseLine?.[1],
    ...partitionBindings(bindings),
    goal: state.slice(turnstile + 1).trim(),
  }
}
