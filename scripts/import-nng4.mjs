#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const sourceRoot = path.resolve(process.argv[2] || '/tmp/nng4-game-source')
const outputPath = path.resolve(process.argv[3] || 'src/game/nng4.generated.json')
const gameFile = path.join(sourceRoot, 'Game.lean')

if (!fs.existsSync(gameFile)) {
  console.error(`NNG4 source not found at ${sourceRoot}`)
  console.error('Usage: node scripts/import-nng4.mjs /path/to/NNG4 [output.json]')
  process.exit(1)
}

function source(rel) {
  return fs.readFileSync(path.join(sourceRoot, rel), 'utf8')
}

function decodeLeanStringAt(text, start) {
  let i = start
  while (i < text.length && /\s/.test(text[i])) i += 1
  if (text[i] !== '"') return null
  i += 1
  let value = ''
  while (i < text.length) {
    const ch = text[i]
    if (ch === '"') return { value, end: i + 1 }
    if (ch === '\\') {
      const next = text[i + 1]
      if (next === 'n') value += '\n'
      else if (next === 't') value += '\t'
      else if (next === '"') value += '"'
      else if (next === '\\') value += '\\'
      else {
        value += next ?? ''
      }
      i += 2
      continue
    }
    value += ch
    i += 1
  }
  return null
}

function commandStrings(text, command) {
  const results = []
  const re = new RegExp(`^${command}\\b`, 'gm')
  let match
  while ((match = re.exec(text))) {
    const parsed = decodeLeanStringAt(text, match.index + match[0].length)
    if (parsed) {
      results.push(parsed.value.trim())
      re.lastIndex = parsed.end
    }
  }
  return results
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

function statementDeclaration(text) {
  const startMatch = /^Statement\b/m.exec(text)
  if (!startMatch) return ''
  const start = startMatch.index + startMatch[0].length
  const end = text.indexOf(':= by', start)
  if (end < 0) return ''
  return stripLeanComments(text.slice(start, end))
}

function statementDescription(text) {
  const statement = /^Statement\b/m.exec(text)
  if (!statement) return ''

  const before = text.slice(0, statement.index)
  const start = before.lastIndexOf('/--')
  if (start < 0) return ''
  const end = before.indexOf('-/', start + 3)
  if (end < 0 || before.slice(end + 2).trim()) return ''

  return before
    .slice(start + 3, end)
    .replace(/^\s*\*\s?/gm, '')
    .trim()
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

    const branchIndent = branch[1].length
    index += 1
    while (index < lines.length) {
      const line = lines[index]
      if (!line.trim() || /^[ \t]*--/.test(line)) {
        index += 1
        continue
      }
      const indentation = /^[ \t]*/.exec(line)?.[0].length || 0
      if (indentation <= branchIndent) {
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
  const hint = /\bHint\b/g
  let match

  while ((match = hint.exec(text))) {
    output += text.slice(cursor, match.index)
    const quote = text.indexOf('"', match.index + match[0].length)
    if (quote < 0) break
    const parsed = decodeLeanStringAt(text, quote)
    if (!parsed) break
    const lineEnd = text.indexOf('\n', parsed.end)
    if (lineEnd >= 0) output += '\n'
    cursor = lineEnd < 0 ? text.length : lineEnd + 1
    hint.lastIndex = cursor
  }

  return output + text.slice(cursor)
}

function statementSolution(text) {
  const startMatch = /^Statement\b/m.exec(text)
  if (!startMatch) return ''
  const proofStart = text.indexOf(':= by', startMatch.index + startMatch[0].length)
  if (proofStart < 0) return ''

  const bodyStart = proofStart + ':= by'.length
  const remaining = text.slice(bodyStart)
  const nextCommand = /\n(?=\S)/.exec(remaining)
  const body = nextCommand ? remaining.slice(0, nextCommand.index) : remaining
  const cleaned = removeHintCommands(removeBranchBlocks(body))
  const lines = cleaned
    .split('\n')
    .filter((line) => line.trim())
  const indentation = lines
    .filter((line) => line.trim())
    .reduce((minimum, line) => Math.min(minimum, /^[ \t]*/.exec(line)?.[0].length || 0), Infinity)

  return lines
    .map((line) => line.slice(Number.isFinite(indentation) ? indentation : 0).trimEnd())
    .join('\n')
    .trim()
}

function commandTokens(text, command) {
  const results = []
  const re = new RegExp(`^${command}\\s+([^\\n]+)`, 'gm')
  let match
  while ((match = re.exec(text))) {
    const clean = match[1].replace(/--.*$/, '').trim()
    const tokens = clean.match(/«[^»]+»|[A-Za-z_][A-Za-z0-9_'.!?]*/g) || []
    results.push(...tokens.map((token) => token.replace(/^«|»$/g, '')))
  }
  return [...new Set(results)]
}

function hints(text) {
  const results = []
  const re = /\bHint\b/g
  let match
  while ((match = re.exec(text))) {
    const quote = text.indexOf('"', match.index + match[0].length)
    const parsed = quote < 0 ? null : decodeLeanStringAt(text, quote)
    if (parsed) {
      results.push(parsed.value.trim())
      re.lastIndex = parsed.end
    }
  }
  return results
}

function namedDeclaration(declaration) {
  const trimmed = declaration.trim()
  if (!trimmed || /^[(:]/.test(trimmed)) return null
  const match = /^([A-Za-z_][A-Za-z0-9_']*)\b/.exec(trimmed)
  return match?.[1] || null
}

const worldOrder = [
  'Tutorial',
  'Addition',
  'Multiplication',
  'Power',
  'Implication',
  'Algorithm',
  'AdvAddition',
  'LessOrEqual',
  'AdvMultiplication',
]

const prerequisites = {
  Tutorial: [],
  Addition: ['Tutorial'],
  Multiplication: ['Addition'],
  Power: ['Multiplication'],
  Implication: ['Addition'],
  Algorithm: ['Addition', 'Implication'],
  AdvAddition: ['Implication', 'Algorithm'],
  LessOrEqual: ['AdvAddition'],
  AdvMultiplication: ['Multiplication', 'LessOrEqual'],
}

const localVerification = {
  Tutorial: 'kernel',
  Addition: 'kernel',
  Multiplication: 'kernel',
  Power: 'kernel',
  Implication: 'kernel',
  Algorithm: 'partial',
  AdvAddition: 'kernel',
  LessOrEqual: 'partial',
  AdvMultiplication: 'partial',
}

function verificationForLevel(world, number) {
  // NNG intentionally implements its final FLT level with the magic `xyzzy`
  // axiom, so the browser can elaborate it but should not call it constructive.
  if (world === 'Power' && number === 10) return 'partial'
  return localVerification[world]
}

function worldData(id) {
  const rel = `Game/Levels/${id}.lean`
  const text = source(rel)
  const imports = [...text.matchAll(/^import\s+Game\.Levels\.([A-Za-z0-9_.']+)/gm)]
    .map((match) => match[1])
    .filter((name) => name.startsWith(`${id}.`))
  const levels = imports.map((moduleName) => {
    const levelRel = `Game/Levels/${moduleName.replaceAll('.', '/')}.lean`
    const levelText = source(levelRel)
    const declaration = statementDeclaration(levelText)
    const number = firstCommandNumber(levelText, 'Level')
    return {
      id: `${id.toLowerCase()}-${number}`,
      world: id,
      number,
      title: firstCommandString(levelText, 'Title', `Level ${number}`),
      introduction: commandStrings(levelText, 'Introduction').join('\n\n'),
      conclusion: firstCommandString(levelText, 'Conclusion'),
      statementText: statementDescription(levelText),
      statement: declaration,
      theoremName: namedDeclaration(declaration),
      solution: statementSolution(levelText),
      hints: hints(levelText),
      newTactics: commandTokens(levelText, 'NewTactic'),
      hiddenTactics: commandTokens(levelText, 'NewHiddenTactic'),
      newTheorems: commandTokens(levelText, 'NewTheorem'),
      newDefinitions: commandTokens(levelText, 'NewDefinition'),
      disabledTactics: commandTokens(levelText, 'DisabledTactic'),
      disabledTheorems: commandTokens(levelText, 'DisabledTheorem'),
      disabledDefinitions: commandTokens(levelText, 'DisabledDefinition'),
      sourcePath: levelRel,
      verification: verificationForLevel(id, number),
    }
  }).sort((a, b) => a.number - b.number)

  return {
    id,
    title: firstCommandString(text, 'Title', id),
    introduction: firstCommandString(text, 'Introduction'),
    prerequisites: prerequisites[id],
    verification: localVerification[id],
    levels,
  }
}

const commit = execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const toolchain = source('lean-toolchain').trim()
const gameSource = source('Game.lean')
const data = {
  source: {
    repository: 'https://github.com/leanprover-community/NNG4',
    commit,
    license: 'Apache-2.0',
    toolchain,
    importedAt: new Date().toISOString(),
  },
  title: firstCommandString(gameSource, 'Title', 'Natural Number Game'),
  caption: "Build the natural numbers from scratch in Lean. Start with 2 + 2 = 4, prove that addition commutes, and work toward Fermat's Last Theorem.",
  introduction: firstCommandString(gameSource, 'Introduction'),
  worlds: worldOrder.map(worldData),
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`)
console.log(`Imported ${data.worlds.length} worlds and ${data.worlds.reduce((sum, world) => sum + world.levels.length, 0)} levels`)
console.log(`Wrote ${outputPath}`)
