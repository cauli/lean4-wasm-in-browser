#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const sourceRoot = path.resolve(process.argv[2] || '/tmp/realanalysisgame-port')
const gameDataPath = path.resolve(process.argv[3] || 'src/game/real-analysis.generated.json')
const outputRoot = path.resolve(process.argv[4] || '/tmp/real-analysis-game-lean-port')
const verifierDataPath = path.resolve(
  process.argv[5] || 'src/game/real-analysis-verifier.generated.json',
)

const sourceMarker = path.join(sourceRoot, 'Game.lean')
if (!fs.existsSync(sourceMarker) || !fs.existsSync(gameDataPath)) {
  console.error(
    'Usage: node scripts/port-real-analysis-lean.mjs SOURCE_ROOT GAME_DATA [OUTPUT_ROOT] [VERIFIER_DATA]',
  )
  process.exit(1)
}

if (outputRoot === sourceRoot || outputRoot === path.parse(outputRoot).root) {
  throw new Error(`Refusing to replace unsafe output path: ${outputRoot}`)
}

const gameData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'))
const levels = gameData.worlds.flatMap((world) => world.levels)
const levelByPath = new Map(levels.map((level) => [level.sourcePath, level]))

function moduleForRelativePath(relativePath) {
  return relativePath.replace(/\.lean$/, '').split(path.sep).join('.')
}

function relativePathForModule(moduleName) {
  return `${moduleName.replaceAll('.', path.sep)}.lean`
}

function readSource(relativePath) {
  return fs.readFileSync(path.join(sourceRoot, relativePath), 'utf8')
}

function writeOutput(relativePath, contents) {
  const destination = path.join(outputRoot, relativePath)
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.writeFileSync(destination, contents.endsWith('\n') ? contents : `${contents}\n`)
}

function closingQuote(text, openingQuote) {
  for (let cursor = openingQuote + 1; cursor < text.length; cursor += 1) {
    if (text[cursor] !== '"') continue
    let backslashes = 0
    for (let index = cursor - 1; index >= 0 && text[index] === '\\'; index -= 1) {
      backslashes += 1
    }
    if (backslashes % 2 === 0) return cursor
  }
  return -1
}

function endOfLine(text, position) {
  const newline = text.indexOf('\n', position)
  return newline < 0 ? text.length : newline + 1
}

function removeRanges(text, ranges) {
  const sorted = ranges
    .filter(([start, end]) => start >= 0 && end > start)
    .sort((left, right) => left[0] - right[0])
  let output = ''
  let cursor = 0
  for (const [start, end] of sorted) {
    if (start < cursor) continue
    output += text.slice(cursor, start)
    cursor = end
  }
  return output + text.slice(cursor)
}

function leadingDocCommentStart(text, commandStart) {
  const prefix = text.slice(0, commandStart)
  const close = prefix.lastIndexOf('-/')
  if (close < 0 || prefix.slice(close + 2).trim() !== '') return commandStart
  const open = prefix.lastIndexOf('/--', close)
  return open >= 0 ? open : commandStart
}

const stringCommands = [
  'Title',
  'Introduction',
  'Conclusion',
  'Info',
  'CaptionLong',
  'CoverImage',
]

const lineCommands = [
  'World',
  'Level',
  'TacticDoc',
  'TheoremDoc',
  'DefinitionDoc',
  'NewTactic',
  'NewHiddenTactic',
  'NewTheorem',
  'NewDefinition',
  'DisabledTactic',
  'DisabledTheorem',
  'DisabledDefinition',
]

function removeGameCommands(text) {
  const ranges = []
  for (const command of stringCommands) {
    const expression = new RegExp(`^${command}\\b`, 'gm')
    let match
    while ((match = expression.exec(text))) {
      const quote = text.indexOf('"', match.index + match[0].length)
      const close = quote < 0 ? -1 : closingQuote(text, quote)
      ranges.push([
        leadingDocCommentStart(text, match.index),
        close < 0 ? endOfLine(text, match.index) : endOfLine(text, close + 1),
      ])
    }
  }

  for (const command of lineCommands) {
    const expression = new RegExp(`^${command}\\b.*$`, 'gm')
    let match
    while ((match = expression.exec(text))) {
      let commandEnd = endOfLine(text, match.index + match[0].length)
      while (commandEnd < text.length) {
        const continuationEnd = endOfLine(text, commandEnd)
        const continuation = text.slice(commandEnd, continuationEnd)
        if (!/^[ \t]+\S/.test(continuation)) break
        commandEnd = continuationEnd
      }
      ranges.push([
        leadingDocCommentStart(text, match.index),
        commandEnd,
      ])
    }
  }

  const hintExpression = /^[ \t]*Hint\b/gm
  let hint
  while ((hint = hintExpression.exec(text))) {
    const quote = text.indexOf('"', hint.index + hint[0].length)
    const close = quote < 0 ? -1 : closingQuote(text, quote)
    ranges.push([
      leadingDocCommentStart(text, hint.index),
      close < 0 ? endOfLine(text, hint.index) : endOfLine(text, close + 1),
    ])
  }

  return removeRanges(text, ranges)
    .replace(/^import GameServer\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function challengeMatch(text, level) {
  const statement = /^Statement\b/m.exec(text)
  if (statement) return { kind: 'Statement', index: statement.index, length: statement[0].length }
  const lemmaName = level.theoremName || /^([A-Za-z_][A-Za-z0-9_']*)\b/.exec(level.statement)?.[1]
  if (!lemmaName) throw new Error(`No challenge command found for ${level.id}`)
  const lemma = new RegExp(`^lemma\\s+${lemmaName}\\b`, 'm').exec(text)
  if (!lemma) throw new Error(`No challenge lemma found for ${level.id}`)
  return { kind: 'lemma', index: lemma.index, length: 'lemma'.length }
}

function safeName(value) {
  const cleaned = value.replace(/[^A-Za-z0-9_']/g, '_')
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `L_${cleaned}`
}

function fullChallengeName(level) {
  return `RealAnalysisLevel_${safeName(level.world)}_${level.number}`
}

/**
 * Lean 4's module system applies the modern layout rules to tactic blocks.
 * The upstream game still contains a few legacy declarations whose proof
 * starts in column zero after `:= by`. They were accepted by its older
 * toolchain but are parsed as a finished declaration by 4.33.
 */
function indentTopLevelProofBodies(text) {
  const lines = text.split('\n')
  const topLevelCommand = /^(?:\/--|\/-!|@\[|(?:(?:private|protected|noncomputable)\s+)?(?:theorem|lemma|def|abbrev|opaque|axiom|example|instance|inductive|structure|class)\b|namespace\b|(?:noncomputable\s+)?section\b|end\b|open\b|export\b|attribute\b|local\b|scoped\b|syntax\b|macro\b|elab\b|initialize\b|variable\b|set_option\b|notation\b|infix[lr]?\b|prefix\b|postfix\b|mutual\b)/
  let inProof = false

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (inProof) {
      if (line && !/^[ \t]/.test(line) && topLevelCommand.test(line)) {
        inProof = false
      } else if (line) {
        lines[index] = `  ${line}`
        continue
      }
    }
    if (!inProof && /:=\s*(?:by\s*)?(?:--.*)?$/.test(lines[index])) {
      inProof = true
    }
  }

  return lines.join('\n')
}

function enableModuleSystem(text) {
  const withPublicImports = text.replace(/^import\s+/gm, 'public import ')
  const imports = [...withPublicImports.matchAll(/^public import\b.*$/gm)]
  const lastImport = imports.at(-1)
  const publicSectionAt = lastImport
    ? (lastImport.index || 0) + lastImport[0].length
    : 0
  return [
    'module',
    '',
    withPublicImports.slice(0, publicSectionAt).trimEnd(),
    '',
    '@[expose] public section',
    '',
    withPublicImports.slice(publicSectionAt).trimStart(),
  ].filter((line, index, lines) => (
    line !== '' || (index > 0 && index < lines.length - 1)
  )).join('\n').trim()
}

function transformFullLevel(relativePath, text, level) {
  const challenge = challengeMatch(text, level)
  let transformed = text
  if (challenge.kind === 'Statement') {
    const hasName = Boolean(level.theoremName)
    const replacement = hasName
      ? 'theorem'
      : `theorem ${fullChallengeName(level)}`
    transformed = `${text.slice(0, challenge.index)}${replacement}${text.slice(challenge.index + challenge.length)}`
  }
  return transformSupportModule(moduleForRelativePath(relativePath), transformed)
}

function transformSupportModule(moduleName, text) {
  let compatibleText = text
  if (moduleName === 'Game.CustomTactic.Linarith') {
    compatibleText = compatibleText.replace(
        '(← elabLinarithConfig cfg).updateReducibility',
        '(← Mathlib.Tactic.elabLinarithConfig cfg).updateReducibility',
      )
  }
  if (moduleName === 'Game.Levels.L4Levels.L01_NonConverge') {
    compatibleText = compatibleText.replace(
      'have f6 : (-1 : ℝ) ^ (2 * N + 1) = -1 := by bound',
      'have f6 : (-1 : ℝ) ^ (2 * N + 1) = -1 := by rw [pow_succ, f5]; norm_num',
    )
  }
  if (moduleName === 'Game.Levels.L12Levels.L00_SubseqIterate') {
    compatibleText = compatibleText.replace(
      `theorem subseq_of_succ (σ : ℕ → ℕ) (hσ : ∀ n, σ n < σ (n + 1)) : Subseq σ := by
  intro i j hij
  induction hij with
  | refl => exact hσ i
  | step hi h =>
      specialize hσ m
      linarith [h, hσ]`,
      `theorem subseq_of_succ (σ : ℕ → ℕ) (hσ : ∀ n, σ n < σ (n + 1)) : Subseq σ := by
  exact strictMono_nat_of_lt_succ hσ`,
    )
  }
  if (moduleName === 'Game.Levels.L18Pset.L05') {
    compatibleText = compatibleText.replace(
      `cases' nEvenOrOdd with h
choose k hk using h
specialize hN1 k (by bound)
change |a (2 * k) - L| < ε at hN1
rewrite [hk]
rewrite [show k + k = 2 * k by ring_nf]
apply hN1
choose k hk using h
specialize hN2 k (by bound)
change |a (2 * k + 1) - L| < ε at hN2
rewrite [hk]
apply hN2`,
      `cases' nEvenOrOdd with hEven hOdd
· choose k hk using hEven
  specialize hN1 k (by bound)
  change |a (2 * k) - L| < ε at hN1
  rewrite [hk]
  rewrite [show k + k = 2 * k by ring_nf]
  apply hN1
· choose k hk using hOdd
  specialize hN2 k (by bound)
  change |a (2 * k + 1) - L| < ε at hN2
  rewrite [hk]
  apply hN2`,
    )
  }
  if (moduleName === 'Game.Levels.L18Pset.L06') {
    compatibleText = compatibleText.replace(
      `rewrite [show ((-1) ^ (2 * (n + 1)) * a (2 * (n + 1)) +
    (-1) ^ (2 * (n + 1) + 1) * a (2 * (n + 1) + 1))
    = a (2 * (n + 1)) + -a (2 * (n + 1) + 1) by bound]`,
      `have heven : (-1 : ℝ) ^ (2 * (n + 1)) = 1 := by rw [pow_mul]; norm_num
have hodd : (-1 : ℝ) ^ (2 * (n + 1) + 1) = -1 := by rw [pow_add, heven]; norm_num
rewrite [heven, hodd]
simp only [one_mul, neg_one_mul]`,
    )
  }
  if (moduleName === 'Game.Levels.L18Pset.L07') {
    compatibleText = compatibleText.replace(
      `rw [show (-1 : ℝ) ^ (2 * (n + 1) + 1) * a (2 * (n + 1) + 1) =
        -a (2 * (n + 1) + 1) by bound]
rw [show (-1 : ℝ) ^ (2 * (n + 1) + 2) = 1 by ring_nf; bound]`,
      `have hevenBase : (-1 : ℝ) ^ (2 * (n + 1)) = 1 := by rw [pow_mul]; norm_num
have hodd : (-1 : ℝ) ^ (2 * (n + 1) + 1) = -1 := by rw [pow_add, hevenBase]; norm_num
have heven : (-1 : ℝ) ^ (2 * (n + 1) + 2) = 1 := by
  rw [show 2 * (n + 1) + 2 = 2 * (n + 2) by ring_nf, pow_mul]
  norm_num
rw [hodd, heven]
simp only [one_mul, neg_one_mul]`,
    )
  }
  if (moduleName === 'Game.Levels.L22Levels.L03') {
    compatibleText = compatibleText
      .replace(/^attribute \[grind\] Mathlib\.Tactic\.(?:Zify\.natCast_le|Qify\.intCast_le|Rify\.ratCast_le)\._simp_1\s*$/gm, '')
  }
  let statementNumber = 0
  const transformed = removeGameCommands(compatibleText).replace(/^Statement\b/gm, (command, offset, source) => {
    statementNumber += 1
    const tail = source.slice(offset + command.length).trimStart()
    const hasExplicitName = /^[A-Za-z_][A-Za-z0-9_']*\b/.test(tail)
    return hasExplicitName
      ? 'theorem'
      : `theorem PortedStatement_${safeName(moduleName)}_${statementNumber}`
  })
  return enableModuleSystem(indentTopLevelProofBodies(transformed))
}

function namespacesAt(text, position) {
  const stack = []
  const prefix = text.slice(0, position)
  const expression = /^(namespace\s+([A-Za-z_][A-Za-z0-9_'.]*)|end(?:\s+([A-Za-z_][A-Za-z0-9_'.]*))?)\s*$/gm
  let match
  while ((match = expression.exec(prefix))) {
    if (match[2]) {
      stack.push(match[2])
    } else if (stack.length > 0) {
      stack.pop()
    }
  }
  return stack
}

function openCommandsAt(text, position) {
  const prefix = removeGameCommands(text.slice(0, position))
  return prefix
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^open(?:\s+scoped)?\s+[A-Za-z_][A-Za-z0-9_'.]*(?:\s+[A-Za-z_][A-Za-z0-9_'.]*)*$/.test(line))
}

function contextModule(level) {
  return `RealAnalysisGame.Context.${safeName(level.world)}.L${level.number}`
}

function contextSource(text, level) {
  const challenge = challengeMatch(text, level)
  // A doc comment immediately before `Statement` belongs to the challenge.
  // Once the challenge is removed, leaving that comment at EOF is a syntax
  // error because Lean expects it to document a declaration.
  const prefix = removeGameCommands(text.slice(0, challenge.index))
    .replace(/\/--[\s\S]*?-\//g, '')
    .trim()
  const namespaces = namespacesAt(text, challenge.index)
  const closers = namespaces.slice().reverse().map((name) => `end ${name}`).join('\n')
  return {
    contents: [prefix, closers].filter(Boolean).join('\n\n'),
    namespaces,
  }
}

function importedGameModules(text) {
  return [...text.matchAll(/^import\s+(Game(?:\.[A-Za-z0-9_'.]+)*)\s*$/gm)]
    .map((match) => match[1])
    .filter((moduleName) => moduleName !== 'GameServer')
}

const requiredModules = new Set(['Game.Metadata'])
const browserBaseModule = 'RealAnalysisGame.BrowserBase'
const pendingModules = levels.map((level) => moduleForRelativePath(level.sourcePath))
while (pendingModules.length > 0) {
  const moduleName = pendingModules.pop()
  if (!moduleName || requiredModules.has(moduleName)) continue
  const relativePath = relativePathForModule(moduleName)
  const absolutePath = path.join(sourceRoot, relativePath)
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing imported game module ${moduleName} (${relativePath})`)
  }
  requiredModules.add(moduleName)
  for (const imported of importedGameModules(fs.readFileSync(absolutePath, 'utf8'))) {
    if (!requiredModules.has(imported)) pendingModules.push(imported)
  }
}

for (const supportModule of ['Game.CustomTactic.Linarith']) {
  requiredModules.add(supportModule)
}

if (process.env.PORT_PRESERVE_BUILD !== '1') {
  fs.rmSync(outputRoot, { recursive: true, force: true })
}
fs.mkdirSync(outputRoot, { recursive: true })

const verifierLevels = {}
const transformedModules = new Map()
for (const moduleName of [...requiredModules].sort()) {
  const relativePath = relativePathForModule(moduleName)
  const original = readSource(relativePath)
  const level = levelByPath.get(relativePath)
  if (!level) {
    const transformed = transformSupportModule(moduleName, original)
    transformedModules.set(moduleName, transformed)
    writeOutput(relativePath, transformed)
    continue
  }

  const transformed = transformFullLevel(relativePath, original, level)
  transformedModules.set(moduleName, transformed)
  writeOutput(relativePath, transformed)
  const context = contextSource(original, level)
  writeOutput(
    relativePathForModule(contextModule(level)),
    enableModuleSystem(context.contents),
  )
  verifierLevels[level.id] = {
    sourcePath: relativePath,
    fullModule: moduleName,
    contextModule: contextModule(level),
    namespaces: context.namespaces,
    openCommands: openCommandsAt(original, challengeMatch(original, level).index),
    declaration: level.statement,
    referenceTheorem: level.theoremName || fullChallengeName(level),
  }
}

function moduleBody(text) {
  return text
    .split('\n')
    .filter((line) => (
      line.trim() !== 'module'
      && !/^public import\b/.test(line)
      && line.trim() !== '@[expose] public section'
    ))
    .join('\n')
    .trim()
}

const orderedModules = []
const visitedModules = new Set()
function visitModule(moduleName) {
  if (visitedModules.has(moduleName)) return
  visitedModules.add(moduleName)
  const sourcePath = path.join(sourceRoot, relativePathForModule(moduleName))
  for (const imported of importedGameModules(fs.readFileSync(sourcePath, 'utf8'))) {
    if (requiredModules.has(imported)) visitModule(imported)
  }
  orderedModules.push(moduleName)
}
for (const moduleName of [...requiredModules].sort()) visitModule(moduleName)

const separatelyImportedModules = new Set([
  'Game.Metadata',
  'Game.CustomTactic.Linarith',
])
const browserCourseBodies = orderedModules
  .filter((moduleName) => !separatelyImportedModules.has(moduleName))
  .map((moduleName) => {
    const body = moduleBody(transformedModules.get(moduleName) || '')
    if (!body) return ''
    return [
      `section BrowserPort_${safeName(moduleName)}`,
      '',
      body,
      '',
      `end BrowserPort_${safeName(moduleName)}`,
    ].join('\n')
  })
  .filter(Boolean)

writeOutput(
  relativePathForModule(browserBaseModule),
  [
    'module',
    '',
    'public import Game.Metadata',
    '',
    '@[expose] public section',
    '',
    ...browserCourseBodies,
  ].join('\n'),
)

const lakefile = `import Lake
open Lake DSL

require mathlib from "../mathlib4-lean62"

package realanalysisgame where
  srcDir := "."

lean_lib Game where
  globs := #[\`Game.+]

lean_lib RealAnalysisGame where
  globs := #[\`RealAnalysisGame.+]
`

writeOutput('lakefile.lean', lakefile)
writeOutput('lean-toolchain', 'leanprover/lean4:nightly-2026-07-07')
writeOutput(
  'build-targets.txt',
  `+${browserBaseModule}:olean`,
)
writeOutput(
  'PORT.md',
  `# Local Lean port

Generated from ${gameData.source.repository} at commit \`${gameData.source.commit}\`.

The transformation removes Lean4Game/GameServer presentation commands, converts each
\`Statement\` to an ordinary theorem, and emits a theorem-free context module for every
browser challenge. Mathematical declarations and reference proof bodies are preserved.
For browser startup, those declarations are also assembled in dependency order into the
single \`${browserBaseModule}\` module, avoiding repeated Mathlib imports.
`,
)

const verifierData = {
  source: gameData.source,
  generatedAt: new Date().toISOString(),
  outputRoot,
  baseModule: browserBaseModule,
  levels: verifierLevels,
}
fs.mkdirSync(path.dirname(verifierDataPath), { recursive: true })
fs.writeFileSync(verifierDataPath, `${JSON.stringify(verifierData, null, 2)}\n`)

console.log(`Ported ${requiredModules.size} course modules and ${levels.length} challenge contexts`)
console.log(`Lean source: ${outputRoot}`)
console.log(`Verifier metadata: ${verifierDataPath}`)
