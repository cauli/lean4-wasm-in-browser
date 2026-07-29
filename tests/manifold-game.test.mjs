import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const game = JSON.parse(fs.readFileSync(
  new URL('../src/game/manifolds.generated.json', import.meta.url),
  'utf8',
))
const conformance = JSON.parse(fs.readFileSync(
  new URL('../src/game/manifolds.conformance.json', import.meta.url),
  'utf8',
))

const levels = game.worlds.flatMap((world) => world.levels)

test('the original Manifold Adventure has a complete linear learning path', () => {
  assert.equal(game.title, 'The Manifold Adventure')
  assert.equal(game.worlds.length, 6)
  assert.equal(levels.length, 25)
  assert.equal(new Set(levels.map((level) => level.id)).size, 25)
  assert.deepEqual(game.worlds[0].prerequisites, [])

  for (let index = 1; index < game.worlds.length; index += 1) {
    assert.deepEqual(
      game.worlds[index].prerequisites,
      [game.worlds[index - 1].id],
      `${game.worlds[index].id} should follow the previous world`,
    )
  }
})

test('every world teaches at least one genuinely new proof move', () => {
  // A proof's "shape" keeps the tactic, its argument count, and whether it
  // nests applications — so `exact h`, `exact f h`, and `exact f (g h)` are
  // three different moves, but renaming hypotheses changes nothing.
  const proofShape = (solution) => solution
    .split('\n')
    .map((line) => {
      const tokens = line.trim().replace(/^·\s*/, '').split(/\s+/)
      const nested = line.includes('(') ? '(nested)' : ''
      return `${tokens[0]}/${tokens.length - 1}${nested}`
    })
    .join(' ')
  const seenShapes = new Set()
  for (const world of game.worlds) {
    const newShapes = world.levels
      .map((level) => proofShape(level.solution))
      .filter((shape) => !seenShapes.has(shape))
    assert.ok(
      newShapes.length > 0,
      `${world.id} only repeats proof shapes already taught`,
    )
    newShapes.forEach((shape) => seenShapes.add(shape))
  }
})

test('every Manifold Adventure level is an honest kernel exercise with a reference proof', () => {
  for (const level of levels) {
    assert.equal(level.verification, 'kernel', `${level.id} support changed`)
    assert.ok(level.statement.startsWith(`${level.theoremName} `), `${level.id} lost its theorem name`)
    assert.ok(level.solution.trim(), `${level.id} has no solution`)
    assert.doesNotMatch(level.solution, /\b(sorry|admit|unsafe)\b/, `${level.id} uses a placeholder`)
    assert.doesNotMatch(
      level.introduction,
      /What Lean checks here:/,
      `${level.id} repeats the verification note`,
    )
  }
})

test('the browser-kernel matrix covers all 25 Manifold Adventure references', () => {
  assert.equal(conformance.sourceCommit, game.source.commit)
  assert.equal(conformance.summary.total, levels.length)
  assert.equal(conformance.summary.kernel, 25)
  assert.equal(conformance.summary.partial, 0)
  assert.deepEqual(
    new Set(conformance.verifiedReferenceSolutions),
    new Set(levels.map((level) => level.id)),
  )
})

test('the course covers the requested objects without common manifold misconceptions', () => {
  const content = JSON.stringify(game)

  assert.match(content, /Ada/)
  assert.match(content, /Flatland/)
  assert.match(content, /sphere/)
  assert.match(content, /torus/)
  assert.match(content, /double pendulum/)
  assert.match(content, /Möbius strip is a \*\*two-manifold with boundary\*\*/)
  assert.match(content, /figure eight/)
  assert.match(content, /Riemann/)
  assert.match(content, /tangent space/)
  assert.match(content, /Differential forms/)
  assert.match(content, /Riemannian metric/)
  assert.match(content, /curvature/)
  assert.match(content, /Theorema Egregium/)
  assert.match(content, /Gauss–Bonnet/)
})

test('course credits and reading links are present in the local data', () => {
  const content = `${game.introduction}\n${game.information}`
  const expectedLinks = [
    'https://www.quantamagazine.org/what-is-a-manifold-20251103/',
    'https://www.gutenberg.org/ebooks/97',
    'https://link.springer.com/book/10.1007/978-1-4419-7400-6',
    'https://math.uchicago.edu/~may/REU2017/MilnorDiff.pdf',
    'https://bookstore.ams.org/CHEL/370.H',
    'https://link.springer.com/book/10.1007/978-0-387-21752-9',
    'https://ocw.mit.edu/courses/18-950-differential-geometry-fall-2008/',
  ]

  for (const link of expectedLinks) {
    assert.ok(content.includes(link), `missing credited source ${link}`)
  }
})

test('introduced mathematical symbols link to references and show their Lean input', () => {
  const prose = [
    game.introduction,
    game.information,
    ...game.worlds.flatMap((world) => [
      world.introduction,
      ...world.levels.flatMap((level) => [
        level.introduction,
        level.conclusion,
        ...level.hints,
      ]),
    ]),
  ].join('\n')
  const symbols = [
    ['=', 'https://en.wikipedia.org/wiki/Equals_sign', null],
    ['ℕ', 'https://en.wikipedia.org/wiki/Natural_number', '\\N'],
    ['∧', 'https://en.wikipedia.org/wiki/Logical_conjunction', '\\and'],
    ['∨', 'https://en.wikipedia.org/wiki/Logical_disjunction', '\\or'],
    ['→', 'https://en.wikipedia.org/wiki/Material_conditional', '\\to'],
    ['ℝ', 'https://en.wikipedia.org/wiki/Real_number', '\\R'],
    ['¬', 'https://en.wikipedia.org/wiki/Negation', '\\not'],
    ['×', 'https://en.wikipedia.org/wiki/Cartesian_product', '\\times'],
  ]

  for (const [symbol, link, command] of symbols) {
    assert.ok(prose.includes(`[${symbol}](${link})`), `${symbol} is not linked to ${link}`)
    if (command) {
      assert.ok(prose.includes(`\`${command}\``), `${symbol} does not show ${command}`)
    }
  }
  assert.match(prose, /equals sign \[=\].*does not need a backslash command/)
})

test('all Manifold Adventure SVG assets referenced by the course are bundled', () => {
  const assetDirectory = new URL('../public/game-assets/manifolds/', import.meta.url)
  const assets = new Set(fs.readdirSync(assetDirectory))
  const references = [...JSON.stringify(game).matchAll(/images\/([^)"\\]+\.svg)/g)]
    .map((match) => match[1])

  assert.ok(references.length >= 6)
  for (const reference of references) {
    assert.ok(assets.has(reference), `missing manifold asset ${reference}`)
  }
})

test('all Blender-built GLB models used by the 3D scenes are bundled', () => {
  const modelDirectory = new URL('../public/game-assets/manifolds/models/', import.meta.url)
  const models = new Set(fs.readdirSync(modelDirectory))
  const expected = [
    'sphere-charts.glb',
    'torus-loops.glb',
    'mobius-band.glb',
    'trefoil-circle.glb',
    'sphere-triangle.glb',
    'figure-eight.glb',
    'tangent-plane.glb',
  ]
  for (const model of expected) {
    assert.ok(models.has(model), `missing 3D model ${model}`)
  }
})
