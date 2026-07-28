import rawVerifierData from './real-analysis-verifier.generated.json'
import {
  levelsAvailableBefore,
  policyInventoryForLevel,
  realAnalysisGame,
  type GameLevel,
} from './game-data'
import {
  INVENTORY_POLICY_MARKER,
  LIVE_GOAL_TRACE_MARKER,
  type ChallengeSource,
  type GoalInspectionSource,
} from './verification-source'

interface RealAnalysisVerifierLevel {
  sourcePath: string
  fullModule: string
  contextModule: string
  namespaces: string[]
  openCommands?: string[]
  declaration: string
  referenceTheorem: string
}

interface RealAnalysisVerifierData {
  baseModule: string
  levels: Record<string, RealAnalysisVerifierLevel>
}

const verifierData = rawVerifierData as RealAnalysisVerifierData
const realAnalysisLevels = realAnalysisGame.worlds.flatMap((world) => world.levels)
const verifierLevelById = verifierData.levels

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

interface RealAnalysisPolicy {
  allowedTactics: string[]
  knownTactics: string[]
  disabledTactics: string[]
  allowedDeclarations: string[]
  knownDeclarations: string[]
  disabledDeclarations: string[]
  selfDeclarations: string[]
}

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

function leanStringList(values: Iterable<string>): string {
  return `[${[...new Set(values)].sort().map((value) => JSON.stringify(value)).join(', ')}]`
}

function realAnalysisPolicy(level: GameLevel): RealAnalysisPolicy {
  const inventory = policyInventoryForLevel(level)
  const knownTactics = realAnalysisLevels.flatMap((candidate) => [
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

  for (const candidate of realAnalysisLevels) {
    const metadata = verifierLevelById[candidate.id]
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

function buildInventoryPolicyPrelude(level: GameLevel): string {
  const policy = realAnalysisPolicy(level)
  return `
private meta def browserAllowedKeywords : List String :=
  ${leanStringList(ALLOWED_POLICY_KEYWORDS)}

private meta def browserAllowedTactics : List String :=
  ${leanStringList(policy.allowedTactics)}

private meta def browserKnownTactics : List String :=
  ${leanStringList(policy.knownTactics)}

private meta def browserDisabledTactics : List String :=
  ${leanStringList(policy.disabledTactics)}

private meta def browserAllowedDeclarations : List String :=
  ${leanStringList(policy.allowedDeclarations)}

private meta def browserKnownDeclarations : List String :=
  ${leanStringList(policy.knownDeclarations)}

private meta def browserDisabledDeclarations : List String :=
  ${leanStringList(policy.disabledDeclarations)}

private meta def browserSelfDeclarations : List String :=
  ${leanStringList(policy.selfDeclarations)}

private meta def browserInventoryError (stx : Lean.Syntax) (message : String) :
    Lean.Elab.Tactic.TacticM Unit :=
  Lean.logErrorAt stx ("${INVENTORY_POLICY_MARKER} " ++ message)

private meta partial def browserCheckInventory
    (stx : Lean.Syntax) : Lean.Elab.Tactic.TacticM Unit := do
  match stx with
  | .missing => return
  | .node _ _ args =>
    for arg in args do
      browserCheckInventory arg
  | .atom _ value =>
    if 0 < value.length
        && value.toList[0]!.isAlpha
        && !browserAllowedKeywords.contains value
        && !browserAllowedTactics.contains value then
      let message :=
        if browserDisabledTactics.contains value then
          s!"The tactic '{value}' is disabled in this level."
        else if browserKnownTactics.contains value then
          s!"You have not unlocked the tactic '{value}' yet."
        else
          s!"The tactic '{value}' is not available in this game."
      browserInventoryError stx message
  | .ident _ _ value _ =>
    let names ←
      try Lean.resolveGlobalConst (Lean.mkIdent value)
      catch _ => pure []
    for name in names do
      let some (.thmInfo ..) := (← Lean.getEnv).find? name
        | return
      let resolved := name.toString
      let written := value.toString
      if browserSelfDeclarations.contains resolved
          || browserSelfDeclarations.contains written then
        browserInventoryError stx
          s!"You cannot use the level theorem '{resolved}' to prove itself."
      else if browserDisabledDeclarations.contains resolved
          || browserDisabledDeclarations.contains written then
        browserInventoryError stx
          s!"The theorem or definition '{resolved}' is disabled in this level."
      else if !browserKnownDeclarations.contains resolved
          && !browserKnownDeclarations.contains written then
        browserInventoryError stx
          s!"The theorem or definition '{resolved}' is not available in this game."
      else if !browserAllowedDeclarations.contains resolved
          && !browserAllowedDeclarations.contains written then
        browserInventoryError stx
          s!"You have not unlocked the theorem or definition '{resolved}' yet."

local syntax "browser_user" ppLine tacticSeq : tactic

elab_rules : tactic
  | \`(tactic| browser_user $tactics:tacticSeq) => do
      browserCheckInventory tactics.raw
      Lean.Elab.Tactic.evalTactic tactics
`.trim()
}

function verifierLevel(level: GameLevel): RealAnalysisVerifierLevel {
  const metadata = verifierData.levels[level.id]
  if (!metadata) throw new Error(`No local Lean context was generated for ${level.id}.`)
  return metadata
}

function challengeSignature(level: GameLevel, metadata: RealAnalysisVerifierLevel): string {
  const declaration = metadata.declaration.trim()
  if (!level.theoremName) return declaration
  if (!declaration.startsWith(level.theoremName)) {
    throw new Error(`The generated declaration for ${level.id} has an unexpected theorem name.`)
  }
  return declaration.slice(level.theoremName.length).trim()
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
  const header = [
    `import ${verifierData.baseModule}`,
    '',
    ...(enforceInventory ? [buildInventoryPolicyPrelude(level), ''] : []),
    ...(metadata.openCommands || []),
    ...((metadata.openCommands || []).length > 0 ? [''] : []),
    ...namespaceOpeners,
    ...(namespaceOpeners.length > 0 ? [''] : []),
    'private axiom browser_preview_close {α : Sort u} : α',
    '',
    `theorem browser_challenge ${challengeSignature(level, metadata)} := by`,
    ...(enforceInventory ? ['  browser_user'] : []),
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
      `Checked against the local Lean port of ${metadata.sourcePath}.`,
    ],
  }
  return inspectGoals
    ? { ...source, traceMarker: LIVE_GOAL_TRACE_MARKER }
    : source
}

export function buildRealAnalysisChallengeSource(
  level: GameLevel,
  proof: string,
  enforceInventory = true,
): ChallengeSource {
  return buildSource(level, proof, false, enforceInventory) as ChallengeSource
}

export function buildRealAnalysisGoalInspectionSource(
  level: GameLevel,
  proof: string,
  enforceInventory = true,
): GoalInspectionSource {
  return buildSource(level, proof, true, enforceInventory) as GoalInspectionSource
}

export function realAnalysisContextModule(level: GameLevel): string {
  verifierLevel(level)
  return verifierData.baseModule
}
