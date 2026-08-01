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
const packager = fs.readFileSync(
  new URL('../scripts/package-real-analysis-layer.mjs', import.meta.url),
  'utf8',
)
const stagingPool = fs.readFileSync(
  new URL('../src/game/artifact-pack-stager.ts', import.meta.url),
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

test('the first course layer retains Init files needed by Lean module resolution', () => {
  assert.doesNotMatch(packager, /providedByRuntimeInitialization/)
  assert.doesNotMatch(packager, /runtimeProvidedModules/)
  assert.match(loader, /await trySnapshot\(\)[\s\S]*await addInitFiles\(\)/)
})

test('the artifact staging experiment keeps one Lean worker and bounds helper workers', () => {
  assert.match(stagingPool, /Math\.min\(3, requested\)/)
  assert.match(loader, /new ArtifactPackStagerPool\(Math\.min\(workerCount, packs\.length\)\)/)
  assert.match(loader, /const lookahead = stager \? Math\.min\(workerCount, packs\.length\) : 1/)
  assert.match(loader, /window\.__leanGameLayerTimings\.push\(timing\)/)
})
