import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const verifier = JSON.parse(fs.readFileSync(
  new URL('../src/game/manifolds-verifier.generated.json', import.meta.url),
  'utf8',
))
const loader = fs.readFileSync(
  new URL('../src/game/useLeanGameVerifier.ts', import.meta.url),
  'utf8',
)

test('the first manifold level imports only its homeomorphism world', () => {
  const first = verifier.levels['homeomorphisms-1']
  assert.equal(first.contextModule, 'ManifoldAdventure.Homeomorphisms')

  const source = fs.readFileSync(
    new URL('../lean/ManifoldAdventure/Homeomorphisms.lean', import.meta.url),
    'utf8',
  )
  assert.match(source, /public import Mathlib\.Topology\.Homeomorph\.Defs/)
  assert.doesNotMatch(source, /IsManifold\.Basic/)
})

test('the manifold loader does not stage the Real Analysis course', () => {
  const start = loader.indexOf('const ensureManifoldLayer')
  const end = loader.indexOf('const trySnapshot', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)

  const manifoldLoader = loader.slice(start, end)
  assert.doesNotMatch(manifoldLoader, /ensureRealAnalysisLayer/)
  assert.doesNotMatch(manifoldLoader, /real-analysis/)
  assert.match(manifoldLoader, /manifold-course-layer-index/)
  assert.match(manifoldLoader, /slice\(0, targetIndex \+ 1\)/)
})
