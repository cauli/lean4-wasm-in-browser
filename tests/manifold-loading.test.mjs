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
const manifoldPackager = fs.readFileSync(
  new URL('../scripts/package-manifold-layers.sh', import.meta.url),
  'utf8',
)
const layerIndexer = fs.readFileSync(
  new URL('../scripts/create-manifold-layer-index.mjs', import.meta.url),
  'utf8',
)
const stagingPool = fs.readFileSync(
  new URL('../src/game/artifact-pack-stager.ts', import.meta.url),
  'utf8',
)
const artifactCache = fs.readFileSync(
  new URL('../src/artifact-pack-cache.ts', import.meta.url),
  'utf8',
)
const gameApp = fs.readFileSync(
  new URL('../src/game/GameApp.tsx', import.meta.url),
  'utf8',
)
const manifoldWorkflow = fs.readFileSync(
  new URL('../.github/workflows/build-manifold-layer.yml', import.meta.url),
  'utf8',
)
const pagesBuilder = fs.readFileSync(
  new URL('../deploy/build-pages.sh', import.meta.url),
  'utf8',
)
const pagesAssetPackager = fs.readFileSync(
  new URL('../deploy/pack-pages-assets.sh', import.meta.url),
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
  assert.match(manifoldLoader, /manifoldLayersForWorld\(index, level\.world\)/)
  assert.doesNotMatch(manifoldLoader, /index\.layers\.slice/)
})

test('optional worlds package and load only their graph prerequisites', () => {
  assert.match(loader, /for \(const prerequisite of layer\.prerequisites \|\| \[\]\) visit\(prerequisite\)/)
  assert.match(layerIndexer, /\['MapProjections',[\s\S]*\['LocalCharts'\]/)
  assert.match(layerIndexer, /\['CircleMotion',[\s\S]*\['SmoothManifolds'\]/)
  assert.match(layerIndexer, /\['RobotArm',[\s\S]*\['CircleMotion'\]/)
  assert.match(manifoldPackager, /map-projections circle-motion robot-arm/)
  assert.match(
    manifoldPackager,
    /homeomorphisms,local-charts,charted-spaces,canonical-charts,smooth-manifolds,circle-motion/,
  )
  assert.match(manifoldWorkflow, /Mathlib\.Geometry\.Manifold\.Instances\.Sphere/)
  assert.match(manifoldWorkflow, /Mathlib\.Analysis\.SpecialFunctions\.Complex\.Circle/)
  assert.doesNotMatch(
    manifoldWorkflow,
    /mathlib_layer_run_id:[\s\S]{0,180}default: "30693760471"/,
  )
  assert.match(manifoldWorkflow, /index\.layers\.length !== 9/)
  assert.match(manifoldWorkflow, /verifiedReferenceSolutions\?\.length !== 40/)
  assert.match(pagesBuilder, /map-projections circle-motion robot-arm/)
  assert.match(pagesAssetPackager, /map-projections circle-motion robot-arm/)
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

test('packed Mathlib layers use a versioned persistent browser cache', () => {
  assert.match(artifactCache, /const CACHE_PREFIX = 'lean-artifact-packs-'/)
  assert.match(artifactCache, /await cache\.match\(requestUrl\)/)
  assert.match(artifactCache, /await cache\.put\(requestUrl/)
  assert.match(artifactCache, /navigator\.storage\.persist\(\)/)
  assert.match(loader, /artifactPackCacheDescriptor\(libraryRoot, manifest\)/)
  assert.match(loader, /cachedCompressedBytes \+= staged\.compressedBytes/)
})

test('game routes prepare Lean before the player asks to verify', () => {
  assert.match(gameApp, /void prepareLevel\(preparationLevel\)/)
  assert.match(gameApp, /void prepareRuntime\(\)/)
  assert.match(gameApp, /window\.setTimeout\(prefetchRuntimeAssets, 350\)/)
  assert.match(gameApp, /role="progressbar"/)
  assert.match(gameApp, /disabled=\{verifyDisabled\}/)
  assert.match(loader, /compileCode\(`import \$\{contextModule\}\\n`\)/)
})
