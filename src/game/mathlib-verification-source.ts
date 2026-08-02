import type { GameLevel, LeanGame } from './game-data'
import {
  LIVE_GOAL_TRACE_MARKER,
  type ChallengeSource,
  type GoalInspectionSource,
} from './verification-source'
import {
  levelsAvailableBefore,
  policyInventoryForLevel,
} from './game-data'

export interface MathlibVerifierLevel {
  sourcePath: string
  fullModule: string
  contextModule: string
  namespaces: string[]
  openCommands?: string[]
  declaration: string
  declarationKind?: 'theorem' | 'def' | 'noncomputable def'
  referenceTheorem: string
}

export interface MathlibVerifierData {
  baseModule: string
  levels: Record<string, MathlibVerifierLevel>
}

interface MathlibPolicy {
  allowedTactics: string[]
  knownTactics: string[]
  disabledTactics: string[]
  allowedDeclarations: string[]
  knownDeclarations: string[]
  disabledDeclarations: string[]
  selfDeclarations: string[]
}

const ALLOWED_POLICY_KEYWORDS = [
  'with',
  'fun',
  'at',
  'only',
  'by',
  'generalizing',
  'using',
  'skip',
  'if',
  'then',
  'else',
  'clear',
]

function shortName(name: string): string {
  return name.split('.').at(-1) || name
}

function nameVariants(name: string, namespaces: string[] = []): string[] {
  const variants = new Set([name, shortName(name)])
  for (const namespace of namespaces) {
    variants.add(`${namespace}.${name}`)
    variants.add(`${namespace}.${shortName(name)}`)
  }
  return [...variants]
}

function leanPolicyString(values: Iterable<string>): string {
  return JSON.stringify([...new Set(values)].sort().join('\n'))
}

function mathlibPolicy(
  game: LeanGame,
  verifierData: MathlibVerifierData,
  level: GameLevel,
): MathlibPolicy {
  const levels = game.worlds.flatMap((world) => world.levels)
  const inventory = policyInventoryForLevel(level)
  const knownTactics = levels.flatMap((candidate) => [
    ...candidate.newTactics,
    ...(candidate.hiddenTactics || []),
  ]).map(shortName)
  const availableLevels = new Set([
    ...levelsAvailableBefore(level).map((candidate) => candidate.id),
    level.id,
  ])
  const availableIdentifiers = new Set([
    ...inventory.theorems,
    ...inventory.definitions,
  ])
  const disabledIdentifiers = new Set([
    ...inventory.disabledTheorems,
    ...inventory.disabledDefinitions,
  ])
  const allCourseIdentifiers = new Set<string>()
  const selfIdentifiers = new Set<string>()

  for (const candidate of levels) {
    const metadata = verifierData.levels[candidate.id]
    for (const name of [...candidate.newTheorems, ...candidate.newDefinitions]) {
      nameVariants(name, metadata?.namespaces).forEach((variant) => {
        allCourseIdentifiers.add(variant)
        if (availableLevels.has(candidate.id)) availableIdentifiers.add(variant)
      })
    }
    if (!metadata) continue
    for (const variant of nameVariants(metadata.referenceTheorem, metadata.namespaces)) {
      allCourseIdentifiers.add(variant)
      if (candidate.id === level.id) {
        selfIdentifiers.add(variant)
      } else if (availableLevels.has(candidate.id)) {
        availableIdentifiers.add(variant)
      }
    }
  }

  return {
    allowedTactics: inventory.tactics,
    knownTactics,
    disabledTactics: inventory.disabledTactics,
    allowedDeclarations: [...availableIdentifiers],
    knownDeclarations: [...allCourseIdentifiers],
    disabledDeclarations: [...disabledIdentifiers],
    selfDeclarations: [...selfIdentifiers],
  }
}

function buildInventoryPolicyArguments(policy: MathlibPolicy): string[] {
  return [
    ALLOWED_POLICY_KEYWORDS,
    policy.allowedTactics,
    policy.knownTactics,
    policy.disabledTactics,
    policy.allowedDeclarations,
    policy.knownDeclarations,
    policy.disabledDeclarations,
    policy.selfDeclarations,
  ].map((values) => leanPolicyString(values))
}

function challengeSignature(level: GameLevel, metadata: MathlibVerifierLevel): string {
  const declaration = metadata.declaration.trim()
  if (!level.theoremName) return declaration
  if (!declaration.startsWith(level.theoremName)) {
    throw new Error(`The generated declaration for ${level.id} has an unexpected theorem name.`)
  }
  return declaration.slice(level.theoremName.length).trim()
}

export function createMathlibVerificationSource(
  game: LeanGame,
  verifierData: MathlibVerifierData,
  courseLabel: string,
) {
  function verifierLevel(level: GameLevel): MathlibVerifierLevel {
    const metadata = verifierData.levels[level.id]
    if (!metadata) throw new Error(`No local Lean context was generated for ${level.id}.`)
    return metadata
  }

  function buildSource(
    level: GameLevel,
    proof: string,
    inspectGoals: boolean,
    enforceInventory: boolean,
  ): ChallengeSource | GoalInspectionSource {
    const metadata = verifierLevel(level)
    const namespaceOpeners = metadata.namespaces.map((name) => `namespace ${name}`)
    const namespaceClosers = metadata.namespaces.slice().reverse().map((name) => `end ${name}`)
    const proofLines = proof.split('\n')
    const policyArguments = enforceInventory
      ? buildInventoryPolicyArguments(mathlibPolicy(game, verifierData, level))
      : []
    const header = [
      `import ${metadata.contextModule}`,
      '',
      ...(metadata.openCommands || []),
      ...((metadata.openCommands || []).length > 0 ? [''] : []),
      ...namespaceOpeners,
      ...(namespaceOpeners.length > 0 ? [''] : []),
      ...(inspectGoals
        ? ['private axiom browser_preview_close {α : Sort u} : α', '']
        : []),
      `${metadata.declarationKind || 'theorem'} browser_challenge ${challengeSignature(level, metadata)} := by`,
      ...(enforceInventory
        ? ['  manifold_browser_user', ...policyArguments.map((value) => `    ${value}`)]
        : []),
    ]
    const body = proofLines.map((line) => `${enforceInventory ? '    ' : '  '}${line}`)
    const inspection = inspectGoals
      ? [
          '  all_goals',
          `    trace "${LIVE_GOAL_TRACE_MARKER}"`,
          '    trace_state',
          '  all_goals exact browser_preview_close',
        ]
      : []
    const code = [
      ...header,
      ...body,
      ...inspection,
      '',
      ...namespaceClosers,
      '',
    ].join('\n')
    const source = {
      code,
      proofStartLine: header.length,
      proofLineMap: proofLines.map((_, index) => index + 1),
      compatibilityNotes: [
        `Checked against the pinned local ${courseLabel} Mathlib context from ${metadata.sourcePath}.`,
      ],
    }
    return inspectGoals
      ? { ...source, traceMarker: LIVE_GOAL_TRACE_MARKER }
      : source
  }

  return {
    buildChallengeSource(
      level: GameLevel,
      proof: string,
      enforceInventory = true,
    ): ChallengeSource {
      return buildSource(level, proof, false, enforceInventory) as ChallengeSource
    },
    buildGoalInspectionSource(
      level: GameLevel,
      proof: string,
      enforceInventory = true,
    ): GoalInspectionSource {
      return buildSource(level, proof, true, enforceInventory) as GoalInspectionSource
    },
    contextModule(level: GameLevel): string {
      return verifierLevel(level).contextModule
    },
  }
}
