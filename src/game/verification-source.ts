import {
  gameForLevel,
  levelsAvailableBefore,
  policyInventoryForLevel,
  type NngLevel,
} from './game-data'
import initDeclarations from './init-declarations.generated.json'

export interface PolicyResult {
  ok: boolean
  messages: string[]
}

export interface PolicyOptions {
  enforceInventory?: boolean
}

export interface ChallengeSource {
  code: string
  proofStartLine: number
  proofLineMap: number[]
  compatibilityNotes: string[]
}

export interface ChallengeOptions {
  unlockAll?: boolean
  enforceInventory?: boolean
}

export interface GoalInspectionSource extends ChallengeSource {
  traceMarker: string
}

export const LIVE_GOAL_TRACE_MARKER = '__LEAN4GAME_LIVE_GOAL_7D4B2A__'
export const INVENTORY_POLICY_MARKER = '__LEAN4GAME_INVENTORY_POLICY_2F6C1D__'

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

const INIT_DECLARATIONS = new Set<string>(initDeclarations.declarations)

const BROWSER_COMPATIBILITY_MACROS = `
local macro "browser_compat_zero" : tactic =>
  \`(tactic| exact browser_zero_eq_zero)

local macro "browser_compat_xyzzy" : tactic =>
  \`(tactic| exact browser_xyzzy _)
`.trim()

const BASE_PRELUDE = String.raw`
inductive MyNat where
  | zero : MyNat
  | succ : MyNat → MyNat

attribute [pp_nodot] MyNat.succ

notation (name := MyNatNotation) (priority := 1000000) "ℕ" => MyNat

namespace MyNat

instance : Inhabited MyNat where
  default := MyNat.zero

@[reducible] def ofNat (n : Nat) : MyNat :=
  match n with
  | Nat.zero => MyNat.zero
  | Nat.succ k => MyNat.succ (ofNat k)

@[reducible] instance instOfNat {n : Nat} : OfNat MyNat n where
  ofNat := ofNat n

private axiom browser_zero_eq_zero : (0 : ℕ) = MyNat.zero

opaque add : MyNat → MyNat → MyNat
instance : Add MyNat where add := add

opaque mul : MyNat → MyNat → MyNat
instance : Mul MyNat where mul := mul

opaque pow : MyNat → MyNat → MyNat
instance : HPow MyNat MyNat MyNat where hPow := pow
instance : HPow MyNat Nat MyNat where hPow a n := pow a (ofNat n)

def le (a b : MyNat) := ∃ c : MyNat, b = a + c
instance : LE MyNat where le := le

axiom add_zero (a : ℕ) : a + MyNat.zero = a
axiom add_succ (a d : ℕ) : a + succ d = succ (a + d)
axiom mul_zero (a : ℕ) : a * MyNat.zero = MyNat.zero
axiom mul_succ (a b : ℕ) : a * succ b = a * b + a
axiom pow_zero (a : ℕ) : HPow.hPow a MyNat.zero = 1
axiom pow_succ (a b : ℕ) : a ^ succ b = a ^ b * a

axiom one_eq_succ_zero : (1 : ℕ) = succ 0
axiom two_eq_succ_one : (2 : ℕ) = succ 1
axiom three_eq_succ_two : (3 : ℕ) = succ 2
axiom four_eq_succ_three : (4 : ℕ) = succ 3

axiom succ_inj (a b : ℕ) (h : succ a = succ b) : a = b
axiom zero_ne_succ (a : ℕ) : 0 ≠ succ a
axiom succ_ne_zero_base (a : ℕ) : succ a ≠ 0

def pred : ℕ → ℕ
  | 0 => 37
  | succ n => n

def is_zero : ℕ → Prop
  | 0 => True
  | succ _ => False

private axiom browser_xyzzy (goal : Prop) : goal
private axiom browser_preview_close {α : Sort u} : α
`.trim()

function axiomFromLevel(level: NngLevel): string | null {
  if (!level.theoremName) return null
  return `axiom ${level.statement}`
}

function challengeDeclaration(level: NngLevel): string {
  if (!level.theoremName) return `theorem browser_challenge ${level.statement}`
  const signature = level.statement.slice(level.theoremName.length).trim()
  return `theorem ${level.theoremName} ${signature}`
}

function shortName(name: string): string {
  return name.split('.').at(-1) || name
}

function nameVariants(name: string): string[] {
  return name.includes('.') ? [name, shortName(name)] : [name, `MyNat.${name}`]
}

function leanStringList(values: Iterable<string>): string {
  return `[${[...new Set(values)].sort().map((value) => JSON.stringify(value)).join(', ')}]`
}

interface LeanInventoryPolicy {
  allowedTactics: string[]
  knownTactics: string[]
  disabledTactics: string[]
  lockedIdentifiers: string[]
  disabledIdentifiers: string[]
  unavailableIdentifiers: string[]
  selfIdentifiers: string[]
}

function proofIdentifiers(proof: string): string[] {
  const surface = proofPolicySurface(proof)
  return [...new Set(
    surface.match(/[\p{L}_][\p{L}\p{N}_']*[!?]?(?:\.[\p{L}_][\p{L}\p{N}_']*[!?]?)*/gu) || [],
  )]
}

function inventoryPolicyForProof(level: NngLevel, proof: string): LeanInventoryPolicy {
  const inventory = policyInventoryForLevel(level)
  const gameLevels = gameForLevel(level).worlds.flatMap((world) => world.levels)
  const knownTactics = gameLevels.flatMap((candidate) => [
    ...candidate.newTactics,
    ...(candidate.hiddenTactics || []),
  ]).map(shortName)

  const gameTheorems = new Set<string>()
  const gameDefinitions = new Set<string>()
  for (const candidate of gameLevels) {
    candidate.newTheorems.flatMap(nameVariants).forEach((name) => gameTheorems.add(name))
    candidate.newDefinitions.flatMap(nameVariants).forEach((name) => gameDefinitions.add(name))
    if (candidate.theoremName) {
      gameTheorems.add(candidate.theoremName)
      gameTheorems.add(`MyNat.${candidate.theoremName}`)
    }
  }

  const available = new Set([...inventory.theorems, ...inventory.definitions])
  const disabled = new Set([
    ...inventory.disabledTheorems,
    ...inventory.disabledDefinitions,
  ])
  const currentNames = level.theoremName
    ? new Set([level.theoremName, `MyNat.${level.theoremName}`])
    : new Set<string>()
  const lockedIdentifiers = new Set<string>()
  const disabledIdentifiers = new Set<string>()
  const unavailableIdentifiers = new Set<string>()
  const selfIdentifiers = new Set<string>()

  for (const identifier of proofIdentifiers(proof)) {
    if (currentNames.has(identifier)) {
      selfIdentifiers.add(identifier)
      continue
    }
    if (disabled.has(identifier)) {
      disabledIdentifiers.add(identifier)
      continue
    }
    if (gameTheorems.has(identifier) || gameDefinitions.has(identifier)) {
      if (!available.has(identifier)) lockedIdentifiers.add(identifier)
      continue
    }
    if (INIT_DECLARATIONS.has(identifier)) unavailableIdentifiers.add(identifier)
  }

  return {
    allowedTactics: inventory.tactics,
    knownTactics,
    disabledTactics: inventory.disabledTactics,
    lockedIdentifiers: [...lockedIdentifiers],
    disabledIdentifiers: [...disabledIdentifiers],
    unavailableIdentifiers: [...unavailableIdentifiers],
    selfIdentifiers: [...selfIdentifiers],
  }
}

function buildInventoryPolicyPrelude(level: NngLevel, proof: string): string {
  const policy = inventoryPolicyForProof(level, proof)
  return `
private meta def browserAllowedKeywords : List String :=
  ${leanStringList(ALLOWED_POLICY_KEYWORDS)}

private meta def browserAllowedTactics : List String :=
  ${leanStringList([...policy.allowedTactics, 'browser_compat_zero', 'browser_compat_xyzzy'])}

private meta def browserKnownTactics : List String :=
  ${leanStringList(policy.knownTactics)}

private meta def browserDisabledTactics : List String :=
  ${leanStringList(policy.disabledTactics)}

private meta def browserLockedIdentifiers : List String :=
  ${leanStringList(policy.lockedIdentifiers)}

private meta def browserDisabledIdentifiers : List String :=
  ${leanStringList(policy.disabledIdentifiers)}

private meta def browserUnavailableIdentifiers : List String :=
  ${leanStringList(policy.unavailableIdentifiers)}

private meta def browserSelfIdentifiers : List String :=
  ${leanStringList(policy.selfIdentifiers)}

private meta partial def browserInventoryViolation
    (stx : Lean.Syntax) : Option (Lean.Syntax × String) :=
  match stx with
  | .missing => none
  | .node _ _ args =>
    args.findSome? browserInventoryViolation
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
      some (stx, message)
    else
      none
  | .ident _ _ value _ =>
    let name := value.toString
    if browserSelfIdentifiers.contains name then
      some (stx, s!"Structural recursion: you cannot use '{name}' to prove itself.")
    else if browserDisabledIdentifiers.contains name then
      some (stx, s!"The theorem or definition '{name}' is disabled in this level.")
    else if browserLockedIdentifiers.contains name then
      some (stx, s!"You have not unlocked the theorem or definition '{name}' yet.")
    else if browserUnavailableIdentifiers.contains name then
      some (stx, s!"The theorem or definition '{name}' is not available in this game.")
    else
      none

local syntax "browser_user" ppLine tacticSeq : tactic

local macro_rules
  | \`(tactic| browser_user $tactics:tacticSeq) => do
      match browserInventoryViolation tactics.raw with
      | some (stx, message) =>
          Lean.Macro.throwErrorAt stx ("${INVENTORY_POLICY_MARKER} " ++ message)
      | none =>
          \`(tactic| ($tactics))
`.trim()
}

export function normalizeGameProofSyntax(proof: string): { code: string; notes: string[]; lineMap: number[] } {
  const lines = proof.split('\n')
  const lineMap = lines.map((_, index) => index + 1)
  const notes: string[] = []
  let expandedGameTactic = false

  for (let index = 0; index < lines.length; index += 1) {
    const simpleAddition = /^(\s*)simp_add\s*$/.exec(lines[index])
    const magic = /^(\s*)xyzzy\s*$/.exec(lines[index])
    if (simpleAddition) {
      lines[index] = `${simpleAddition[1]}simp only [add_assoc, add_left_comm, add_comm]`
      expandedGameTactic = true
    } else if (magic) {
      lines[index] = `${magic[1]}browser_compat_xyzzy`
      expandedGameTactic = true
    }
  }
  if (expandedGameTactic) {
    notes.push('Expanded an NNG4 game-only tactic to its browser-compatible proof step.')
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const legacy = /^(\s*)induction\s+(.+?)\s+with\s+(.+?)(?:\s+generalizing\s+(.+))?\s*$/.exec(line)
    if (!legacy || legacy[3].trim().startsWith('|')) continue

    const headerIndent = legacy[1].length
    let firstCase = -1
    let secondCase = -1
    let caseIndent = -1
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const bullet = /^(\s*)·\s?(.*)$/.exec(lines[cursor])
      if (!bullet || bullet[1].length < headerIndent) continue
      if (firstCase < 0) {
        firstCase = cursor
        caseIndent = bullet[1].length
      } else if (bullet[1].length === caseIndent) {
        secondCase = cursor
        break
      }
    }
    if (firstCase < 0 || secondCase < 0) continue

    const target = legacy[2].trim()
    const successorNames = legacy[3].trim()
    const generalizing = legacy[4]?.trim()
    const firstBullet = /^(\s*)·\s?(.*)$/.exec(lines[firstCase])!
    const secondBullet = /^(\s*)·\s?(.*)$/.exec(lines[secondCase])!
    lines[index] = `${legacy[1]}induction ${target}${generalizing ? ` generalizing ${generalizing}` : ''} with`
    lines[secondCase] = `${' '.repeat(caseIndent)}| succ ${successorNames} =>`
    if (secondBullet[2]) {
      lines.splice(secondCase + 1, 0, `${' '.repeat(caseIndent + 2)}${secondBullet[2]}`)
      lineMap.splice(secondCase + 1, 0, lineMap[secondCase])
    }
    lines[firstCase] = `${' '.repeat(caseIndent)}| zero =>`
    if (firstBullet[2]) {
      lines.splice(firstCase + 1, 0, `${' '.repeat(caseIndent + 2)}${firstBullet[2]}`)
      lineMap.splice(firstCase + 1, 0, lineMap[firstCase])
    }
    const adjustedSecondCase = secondCase + (firstBullet[2] ? 1 : 0)
    for (let cursor = firstCase + 1; cursor < adjustedSecondCase; cursor += 1) {
      const reflexivity = /^(\s*)rfl\s*$/.exec(lines[cursor])
      if (reflexivity) lines[cursor] = `${reflexivity[1]}browser_compat_zero`
    }
    notes.push('Adapted NNG4 legacy induction syntax to the constructor syntax required by this Lean build.')
    notes.push('Kept NNG4 numeral reflexivity compatible with the newer elaborator.')
  }

  let removedClosedGoalRfl = false
  for (let index = 1; index < lines.length; index += 1) {
    const reflexivity = /^(\s*)rfl\s*$/.exec(lines[index])
    if (!reflexivity) continue
    let previous = index - 1
    while (previous >= 0 && !lines[previous].trim()) previous -= 1
    if (previous >= 0 && /^\s*rw\b/.test(lines[previous])) {
      lines[index] = `${reflexivity[1]}-- The preceding rewrite closes this goal in the browser's newer Lean build.`
      removedClosedGoalRfl = true
    }
  }
  if (removedClosedGoalRfl) {
    notes.push('Removed redundant NNG4 rfl steps after rewrites that already close the goal in this Lean build.')
  }

  return { code: lines.join('\n'), notes, lineMap }
}

export function buildChallengeSource(
  level: NngLevel,
  proof: string,
  options: ChallengeOptions = {},
): ChallengeSource {
  const normalized = normalizeGameProofSyntax(proof)
  const enforceInventory = options.enforceInventory ?? true
  const gameLevels = gameForLevel(level).worlds.flatMap((world) => world.levels)
  const sourceLevels = options.unlockAll
    ? gameLevels.filter((candidate) => candidate.id !== level.id)
    : levelsAvailableBefore(level)
  const availableAxioms = sourceLevels
    .map(axiomFromLevel)
    .filter((value): value is string => Boolean(value))

  const beforeProof = [
    BASE_PRELUDE,
    ...availableAxioms,
    BROWSER_COMPATIBILITY_MACROS,
    ...(enforceInventory ? [buildInventoryPolicyPrelude(level, normalized.code)] : []),
    '',
    `${challengeDeclaration(level)} := by`,
    ...(enforceInventory ? ['  browser_user'] : []),
  ].join('\n')
  const indentedProof = normalized.code
    .split('\n')
    .map((line) => `${enforceInventory ? '    ' : '  '}${line}`)
    .join('\n')

  return {
    code: `${beforeProof}\n${indentedProof.trimEnd()}\n\nend MyNat\n`,
    proofStartLine: beforeProof.split('\n').length + 1,
    proofLineMap: normalized.lineMap,
    compatibilityNotes: normalized.notes,
  }
}

export function buildGoalInspectionSource(
  level: NngLevel,
  proof: string,
  options: ChallengeOptions = {},
): GoalInspectionSource {
  const challenge = buildChallengeSource(level, proof, options)
  const closing = '\n\nend MyNat\n'
  const inspection = [
    '  all_goals',
    `    trace "${LIVE_GOAL_TRACE_MARKER}"`,
    '    trace_state',
    '  all_goals exact browser_preview_close',
  ].join('\n')

  return {
    ...challenge,
    code: challenge.code.replace(closing, `\n${inspection}${closing}`),
    traceMarker: LIVE_GOAL_TRACE_MARKER,
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function containsIdentifier(code: string, identifier: string): boolean {
  return new RegExp(`(^|[^A-Za-z0-9_'])${escapeRegExp(identifier)}([^A-Za-z0-9_']|$)`, 'm').test(code)
}

function proofPolicySurface(code: string): string {
  let output = ''
  let index = 0
  let blockDepth = 0
  let inString = false

  while (index < code.length) {
    const current = code[index]
    const next = code[index + 1]

    if (blockDepth > 0) {
      if (current === '/' && next === '-') {
        blockDepth += 1
        output += '  '
        index += 2
      } else if (current === '-' && next === '/') {
        blockDepth -= 1
        output += '  '
        index += 2
      } else {
        output += current === '\n' ? '\n' : ' '
        index += 1
      }
      continue
    }

    if (inString) {
      if (current === '\\') {
        output += '  '
        index += Math.min(2, code.length - index)
      } else {
        if (current === '"') inString = false
        output += current === '\n' ? '\n' : ' '
        index += 1
      }
      continue
    }

    if (current === '-' && next === '-') {
      while (index < code.length && code[index] !== '\n') {
        output += ' '
        index += 1
      }
      continue
    }
    if (current === '/' && next === '-') {
      blockDepth = 1
      output += '  '
      index += 2
      continue
    }
    if (current === '"') {
      inString = true
      output += ' '
      index += 1
      continue
    }

    output += current
    index += 1
  }

  return output
}

export function checkProofPolicy(
  level: NngLevel,
  proof: string,
  options: PolicyOptions = {},
): PolicyResult {
  const messages: string[] = []
  const trimmed = proof.trim()
  const policyCode = proofPolicySurface(trimmed)
  void level
  void options
  if (!trimmed) messages.push('Enter at least one tactic.')

  const forbidden = [
    'sorry',
    'admit',
    'unsafe',
    'exact?',
    'apply?',
    'simp?',
    'aesop?',
    'native_decide',
    'browser_xyzzy',
    'browser_preview_close',
    'browser_compat_zero',
    'browser_compat_xyzzy',
  ]
  for (const token of forbidden) {
    if (containsIdentifier(policyCode, token)) messages.push(`"${token}" is not accepted in game answers.`)
  }

  return { ok: messages.length === 0, messages: [...new Set(messages)] }
}
