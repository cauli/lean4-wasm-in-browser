#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const sourceRoot = path.resolve(process.argv[2] || '/tmp/realanalysisgame-port')
const outputPath = path.resolve(process.argv[3] || 'src/game/real-analysis.generated.json')
const gameFile = path.join(sourceRoot, 'Game.lean')

if (!fs.existsSync(gameFile)) {
  console.error(`Real Analysis Game source not found at ${sourceRoot}`)
  console.error('Usage: node scripts/import-real-analysis-game.mjs /path/to/realanalysisgame [output.json]')
  process.exit(1)
}

function source(relativePath) {
  return fs.readFileSync(path.join(sourceRoot, relativePath), 'utf8')
}

function decodeLeanStringAt(text, start) {
  let cursor = start
  while (cursor < text.length && /\s/.test(text[cursor])) cursor += 1
  if (text[cursor] !== '"') return null
  cursor += 1
  let value = ''
  while (cursor < text.length) {
    const character = text[cursor]
    if (character === '"') return { value, end: cursor + 1 }
    if (character === '\\') {
      const escaped = text[cursor + 1]
      if (escaped === 'n') value += '\n'
      else if (escaped === 't') value += '\t'
      else if (escaped === '"') value += '"'
      else if (escaped === '\\') value += '\\'
      else value += escaped ?? ''
      cursor += 2
      continue
    }
    value += character
    cursor += 1
  }
  return null
}

function commandStrings(text, command) {
  const values = []
  const expression = new RegExp(`^${command}\\b`, 'gm')
  let match
  while ((match = expression.exec(text))) {
    const parsed = decodeLeanStringAt(text, match.index + match[0].length)
    if (parsed) {
      values.push(parsed.value.trim())
      expression.lastIndex = parsed.end
    }
  }
  return values
}

function firstCommandString(text, command, fallback = '') {
  return commandStrings(text, command)[0] || fallback
}

function firstCommandNumber(text, command) {
  const match = text.match(new RegExp(`^${command}\\s+(\\d+)\\b`, 'm'))
  return match ? Number(match[1]) : null
}

function stripLeanComments(text) {
  return text
    .replace(/\/-[\s\S]*?-\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function challengeCommand(text) {
  return /^Statement\b/m.exec(text) || /^lemma\b/m.exec(text)
}

function statementDeclaration(text) {
  const statement = challengeCommand(text)
  if (!statement) return ''
  const start = statement.index + statement[0].length
  const end = text.indexOf(':= by', start)
  return end < 0 ? '' : stripLeanComments(text.slice(start, end))
}

function removeBranchBlocks(text) {
  const lines = text.split('\n')
  const kept = []
  for (let index = 0; index < lines.length; index += 1) {
    const branch = /^([ \t]*)Branch\b/.exec(lines[index])
    if (!branch) {
      kept.push(lines[index])
      continue
    }
    const indentation = branch[1].length
    index += 1
    while (index < lines.length) {
      const line = lines[index]
      if (!line.trim() || /^[ \t]*--/.test(line)) {
        index += 1
        continue
      }
      const currentIndent = /^[ \t]*/.exec(line)?.[0].length || 0
      if (currentIndent <= indentation) {
        index -= 1
        break
      }
      index += 1
    }
  }
  return kept.join('\n')
}

function removeHintCommands(text) {
  let output = ''
  let cursor = 0
  const expression = /\bHint\b/g
  let match
  while ((match = expression.exec(text))) {
    output += text.slice(cursor, match.index)
    const quote = text.indexOf('"', match.index + match[0].length)
    const parsed = quote < 0 ? null : decodeLeanStringAt(text, quote)
    if (!parsed) break
    const lineEnd = text.indexOf('\n', parsed.end)
    if (lineEnd >= 0) output += '\n'
    cursor = lineEnd < 0 ? text.length : lineEnd + 1
    expression.lastIndex = cursor
  }
  return output + text.slice(cursor)
}

function statementSolution(text) {
  const statement = challengeCommand(text)
  if (!statement) return ''
  const proofStart = text.indexOf(':= by', statement.index + statement[0].length)
  if (proofStart < 0) return ''
  const remaining = text.slice(proofStart + ':= by'.length)
  const nextCommand = /\n(?=(?:Conclusion|New(?:Hidden)?Tactic|NewTheorem|NewDefinition|DisabledTactic|DisabledTheorem|DisabledDefinition|TacticDoc|TheoremDoc|DefinitionDoc|World|Level|Title|Introduction|namespace)\b|end\s+[A-Za-z_][A-Za-z0-9_']*\b)/.exec(remaining)
  const body = nextCommand ? remaining.slice(0, nextCommand.index) : remaining
  const lines = removeHintCommands(removeBranchBlocks(body))
    .split('\n')
    .filter((line) => line.trim())
  const indentation = lines.reduce(
    (minimum, line) => Math.min(minimum, /^[ \t]*/.exec(line)?.[0].length || 0),
    Infinity,
  )
  return lines
    .map((line) => line.slice(Number.isFinite(indentation) ? indentation : 0).trimEnd())
    .join('\n')
    .trim()
}

const portAddedTactics = new Map([
  ['lecture4-1', ['congr', 'ring']],
  ['lecture15-1', ['norm_cast']],
  ['lecture24-4', ['simp']],
  ['lecture24-5', ['cases']],
])

const portAddedHiddenTactics = new Map([
  // GameServer's syntax walk sees these term-language words as tactic atoms.
  // Declare them once, hidden, so the browser port keeps the exact checker
  // while accepting the upstream course's own reference syntax.
  ['realanalysisstory-1', ['Type', 'match', 'exfalso']],
])

const portAddedTheorems = new Map([
  ['lecture4-1', ['pow_succ']],
  ['l18pset-6', ['even_two_mul']],
  ['l24pset-2', ['isOpen_Ioo']],
])

function adaptReferenceSolution(levelId, solution) {
  let adapted = solution
  if (levelId === 'lecture4-1') {
    adapted = adapted.replace(
      'have f6 : (-1 : ℝ) ^ (2 * N + 1) = -1 := by bound',
      `have f6 : (-1 : ℝ) ^ (2 * N + 1) = -1 := by
  rewrite [pow_succ, f5]
  ring`,
    )
  }
  if (levelId === 'l18pset-5') {
    const lines = adapted.split('\n')
    const casesAt = lines.findIndex((line) => line.trim() === "cases' nEvenOrOdd with h")
    const branchStarts = lines
      .map((line, index) => line.trim() === 'choose k hk using h' ? index : -1)
      .filter((index) => index > casesAt)
    if (casesAt >= 0 && branchStarts.length === 2) {
      lines[casesAt] = "cases' nEvenOrOdd with he ho"
      for (let index = casesAt + 1; index < lines.length; index += 1) {
        lines[index] = branchStarts.includes(index)
          ? `· ${lines[index].trim()}`
          : `  ${lines[index]}`
      }
      lines[branchStarts[0]] = lines[branchStarts[0]].replace('using h', 'using he')
      lines[branchStarts[1]] = lines[branchStarts[1]].replace('using h', 'using ho')
      adapted = lines.join('\n')
    }
  }
  if (levelId === 'l18pset-6') {
    adapted = adapted.replace(
      '    = a (2 * (n + 1)) + -a (2 * (n + 1) + 1) by bound]',
      `    = a (2 * (n + 1)) + -a (2 * (n + 1) + 1) by
  have he : Even (2 * (n + 1)) := even_two_mul (n + 1)
  have ho : Odd (2 * (n + 1) + 1) := he.add_one
  rewrite [he.neg_one_pow, ho.neg_one_pow]
  ring]`,
    )
  }
  if (levelId === 'l18pset-7') {
    adapted = adapted.replace(
      `rw [show (-1 : ℝ) ^ (2 * (n + 1) + 1) * a (2 * (n + 1) + 1) =
        -a (2 * (n + 1) + 1) by bound]`,
      `rewrite [show (-1 : ℝ) ^ (2 * (n + 1) + 1) * a (2 * (n + 1) + 1) =
        -a (2 * (n + 1) + 1) by
  have he : Even (2 * (n + 1)) := even_two_mul (n + 1)
  have ho : Odd (2 * (n + 1) + 1) := he.add_one
  rewrite [ho.neg_one_pow]
  ring]`,
    )
  }
  if (levelId === 'l18pset-7' || levelId === 'lecture24-2') {
    adapted = adapted.replace(/\brw\b/g, 'rewrite')
  }
  if (levelId === 'lecture24-2' || levelId === 'lecture24-3') {
    adapted = adapted.replace(/^(\s*)set\b/gm, '$1let')
  }
  if (levelId === 'lecture24-4' || levelId === 'lecture24-5') {
    adapted = adapted.replace(/\bexact\b/g, 'apply')
  }
  if (levelId === 'l24pset-2') {
    adapted = `change IsOpen (Set.Ioo (x - r) (x + r))
apply isOpen_Ioo`
  }
  return adapted
}

function commandTokens(text, command) {
  const values = []
  const expression = new RegExp(`^${command}\\s+([^\\n]+)`, 'gm')
  let match
  while ((match = expression.exec(text))) {
    const clean = match[1].replace(/--.*$/, '').trim()
    const tokens = clean.match(/«[^»]+»|[A-Za-z_][A-Za-z0-9_'.]*/g) || []
    values.push(...tokens.map((token) => token.replace(/^«|»$/g, '')))
  }
  return [...new Set(values)]
}

function hints(text) {
  const values = []
  const expression = /\bHint\b/g
  let match
  while ((match = expression.exec(text))) {
    const quote = text.indexOf('"', match.index + match[0].length)
    const parsed = quote < 0 ? null : decodeLeanStringAt(text, quote)
    if (parsed) {
      values.push(parsed.value.trim())
      expression.lastIndex = parsed.end
    }
  }
  return values
}

function namedDeclaration(declaration) {
  const trimmed = declaration.trim()
  if (!trimmed || /^[(:]/.test(trimmed)) return null
  return /^([A-Za-z_][A-Za-z0-9_']*)\b/.exec(trimmed)?.[1] || null
}

function shortName(name) {
  return name.split('.').at(-1) || name
}

function proofIdentifiers(proof) {
  return new Set(
    stripLeanComments(proof)
      .match(/[A-Za-z_][A-Za-z0-9_']*(?:\.[A-Za-z_][A-Za-z0-9_']*)*/g) || [],
  )
}

const gameSource = source('Game.lean')
const worldModules = [...gameSource.matchAll(/^import\s+Game\.Levels\.([A-Za-z0-9_.']+)$/gm)]
  .map((match) => match[1])
const dependencyPairs = [...gameSource.matchAll(
  /^Dependency\s+([A-Za-z0-9_']+)\s+(?:→|->)\s+([A-Za-z0-9_']+)/gm,
)].map((match) => ({ source: match[1], target: match[2] }))

function worldData(moduleName) {
  const relativePath = `Game/Levels/${moduleName.replaceAll('.', '/')}.lean`
  const text = source(relativePath)
  const id = firstCommandString(text, 'World', moduleName)
  const prerequisites = dependencyPairs
    .filter((dependency) => dependency.target === id)
    .map((dependency) => dependency.source)
  const levelModules = [...text.matchAll(/^import\s+Game\.Levels\.([A-Za-z0-9_.']+)$/gm)]
    .map((match) => match[1])
    .filter((candidate) => {
      const candidatePath = path.join(
        sourceRoot,
        'Game/Levels',
        `${candidate.replaceAll('.', '/')}.lean`,
      )
      return fs.existsSync(candidatePath) && /^Level\s+\d+\b/m.test(fs.readFileSync(candidatePath, 'utf8'))
    })

  const levels = levelModules.map((levelModule) => {
    const levelPath = `Game/Levels/${levelModule.replaceAll('.', '/')}.lean`
    const levelSource = source(levelPath)
    const declaration = statementDeclaration(levelSource)
    const number = firstCommandNumber(levelSource, 'Level')
    const levelId = `${id.toLowerCase()}-${number}`
    return {
      id: levelId,
      world: id,
      number,
      title: firstCommandString(levelSource, 'Title', `Level ${number}`),
      introduction: commandStrings(levelSource, 'Introduction').join('\n\n'),
      conclusion: firstCommandString(levelSource, 'Conclusion'),
      statement: declaration,
      theoremName: namedDeclaration(declaration),
      solution: adaptReferenceSolution(levelId, statementSolution(levelSource)),
      hints: hints(levelSource),
      newTactics: [
        ...new Set([
          ...commandTokens(levelSource, 'NewTactic'),
          ...(portAddedTactics.get(levelId) || []),
        ]),
      ],
      hiddenTactics: [
        ...new Set([
          ...commandTokens(levelSource, 'NewHiddenTactic'),
          ...(portAddedHiddenTactics.get(levelId) || []),
        ]),
      ],
      newTheorems: [
        ...new Set([
          ...commandTokens(levelSource, 'NewTheorem'),
          ...(portAddedTheorems.get(levelId) || []),
        ]),
      ],
      newDefinitions: commandTokens(levelSource, 'NewDefinition'),
      disabledTactics: commandTokens(levelSource, 'DisabledTactic'),
      disabledTheorems: commandTokens(levelSource, 'DisabledTheorem'),
      disabledDefinitions: commandTokens(levelSource, 'DisabledDefinition'),
      sourcePath: levelPath,
      verification: 'blocked',
    }
  }).sort((left, right) => left.number - right.number)

  return {
    id,
    title: firstCommandString(text, 'Title', id),
    introduction: firstCommandString(text, 'Introduction'),
    prerequisites,
    verification: 'blocked',
    levels,
  }
}

/**
 * Lean4Game's `MakeGame` augments the hand-written world graph with edges
 * inferred from inventory items used by each reference solution. Reproduce
 * that step here: importing only the literal `Dependency` commands leaves
 * worlds such as L1Pset unable to see the tactics introduced in the opening
 * tutorial even though the upstream game unlocks them through this inferred
 * graph.
 */
function withComputedDependencies(worlds) {
  const introductions = new Map()
  const introducedByWorld = new Map()

  for (const world of worlds) {
    const introduced = new Set()
    for (const level of world.levels) {
      for (const item of [
        ...level.newTactics,
        ...(level.hiddenTactics || []),
        ...level.newTheorems,
        ...level.newDefinitions,
        ...(level.theoremName ? [level.theoremName] : []),
      ]) {
        introduced.add(item)
        if (!introductions.has(item)) introductions.set(item, new Set())
        introductions.get(item).add(world.id)
      }
    }
    introducedByWorld.set(world.id, introduced)
  }

  const dependencies = new Map(
    worlds.map((world) => [world.id, new Set(world.prerequisites)]),
  )
  for (const world of worlds) {
    const identifiers = new Set(
      world.levels.flatMap((level) => [...proofIdentifiers(level.solution)]),
    )
    const introducedHere = introducedByWorld.get(world.id) || new Set()
    for (const [item, introducingWorlds] of introductions) {
      if (introducedHere.has(item)) continue
      if (!identifiers.has(item) && !identifiers.has(shortName(item))) continue
      for (const sourceWorld of introducingWorlds) {
        if (sourceWorld !== world.id) dependencies.get(world.id).add(sourceWorld)
      }
    }
  }

  const outgoing = new Map(worlds.map((world) => [world.id, new Set()]))
  for (const [target, sources] of dependencies) {
    for (const source of sources) outgoing.get(source)?.add(target)
  }
  const hasAlternativePath = (source, target) => {
    const pending = [...(outgoing.get(source) || [])].filter(
      (next) => next !== target,
    )
    const seen = new Set([source])
    while (pending.length > 0) {
      const current = pending.pop()
      if (current === target) return true
      if (!current || seen.has(current)) continue
      seen.add(current)
      pending.push(...(outgoing.get(current) || []))
    }
    return false
  }

  return worlds.map((world) => ({
    ...world,
    prerequisites: [...dependencies.get(world.id)]
      .filter((source) => !hasAlternativePath(source, world.id))
      .sort(),
  }))
}

const commit = execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim()
const data = {
  source: {
    repository: 'https://github.com/alexkontorovich/realanalysisgame',
    commit,
    license: 'Apache-2.0',
    toolchain: source('lean-toolchain').trim(),
    importedAt: new Date().toISOString(),
  },
  title: firstCommandString(gameSource, 'Title', 'Real Analysis, The Game'),
  introduction: firstCommandString(gameSource, 'Introduction'),
  information: firstCommandString(gameSource, 'Info'),
  caption: firstCommandString(gameSource, 'CaptionLong'),
  coverImage: firstCommandString(gameSource, 'CoverImage'),
  worlds: withComputedDependencies(worldModules.map(worldData)),
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`)
console.log(
  `Imported ${data.worlds.length} worlds and ${data.worlds.reduce((sum, world) => sum + world.levels.length, 0)} levels`,
)
console.log(`Wrote ${outputPath}`)
