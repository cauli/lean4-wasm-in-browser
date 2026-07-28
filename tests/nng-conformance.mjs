import fs from 'node:fs'
import { build } from 'esbuild'

const game = JSON.parse(fs.readFileSync(
  new URL('../src/game/nng4.generated.json', import.meta.url),
  'utf8',
))
const conformance = JSON.parse(fs.readFileSync(
  new URL('../src/game/nng4.conformance.json', import.meta.url),
  'utf8',
))
const expectedKernel = new Set(conformance.verifiedReferenceSolutions)

if (conformance.sourceCommit !== game.source.commit) {
  throw new Error(
    `NNG4 conformance is for ${conformance.sourceCommit}, but course data is ${game.source.commit}`,
  )
}

// Bundle the browser module in memory so this suite exercises the exact source
// builder and policy gate shipped by Vite. Node cannot directly resolve the
// browser module's extensionless TypeScript and JSON imports.
const bundled = await build({
  entryPoints: [new URL('../src/game/verification-source.ts', import.meta.url).pathname],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node24',
  write: false,
  logLevel: 'silent',
})
const moduleSource = bundled.outputFiles[0]?.text
if (!moduleSource) throw new Error('Could not bundle the browser game verifier')

const verification = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
)

export const nngReferenceCases = game.worlds.flatMap((world) => (
  world.levels.map((level) => {
    const policy = verification.checkProofPolicy(level, level.solution, {
      enforceInventory: true,
    })
    const challenge = verification.buildChallengeSource(level, level.solution)
    return {
      id: level.id,
      world: world.title,
      number: level.number,
      title: level.title,
      expected: expectedKernel.has(level.id) ? 'kernel' : 'partial',
      policy,
      challenge,
    }
  })
))

export const nngPolicyProbes = {
  browserAxiom: verification.checkProofPolicy(
    game.worlds[0].levels[0],
    'exact browser_xyzzy _',
    { enforceInventory: true },
  ),
}

const levelById = new Map(
  game.worlds.flatMap((world) => world.levels).map((level) => [level.id, level]),
)

function inventoryCase(name, levelId, proof, expectation) {
  const level = levelById.get(levelId)
  if (!level) throw new Error(`Unknown inventory probe level ${levelId}`)
  return {
    name,
    levelId,
    proof,
    expectation,
    challenge: verification.buildChallengeSource(level, proof, {
      enforceInventory: true,
    }),
  }
}

export const nngInventoryCases = [
  inventoryCase(
    'parsed inventory permits a hidden tactic at its unlock level',
    'tutorial-2',
    'repeat rw [h]',
    { pass: true },
  ),
  inventoryCase(
    'parsed inventory rejects a locked tactic',
    'tutorial-1',
    'rw [add_zero]',
    { policy: /not unlocked.*rw/i },
  ),
  inventoryCase(
    'parsed inventory rejects a tactic absent from the game',
    'tutorial-1',
    'constructor',
    { policy: /constructor.*not available/i },
  ),
  inventoryCase(
    'parsed inventory rejects a locked game theorem',
    'tutorial-2',
    'rw [mul_comm]',
    { policy: /not unlocked.*mul_comm/i },
  ),
  inventoryCase(
    'parsed inventory rejects an unlisted Init declaration',
    'implication-1',
    'exact Eq.trans h1 (Eq.refl _)',
    { policy: /Eq\.trans.*not available/i },
  ),
  inventoryCase(
    'parsed inventory rejects a theorem disabled for this level',
    'algorithm-5',
    'exact succ_inj a b h',
    { policy: /succ_inj.*disabled/i },
  ),
  inventoryCase(
    'parsed inventory ignores tactic and theorem text in comments',
    'tutorial-1',
    'rfl -- constructor; Eq.symm',
    { pass: true },
  ),
  inventoryCase(
    'parsed inventory rejects structural self-reference',
    'advaddition-1',
    'exact add_right_cancel',
    { policy: /structural recursion.*add_right_cancel/i },
  ),
]

if (nngReferenceCases.length !== 79) {
  throw new Error(`Expected 79 NNG4 reference cases, found ${nngReferenceCases.length}`)
}
if (expectedKernel.size !== conformance.summary.kernel) {
  throw new Error('NNG4 conformance summary does not match its verified level list')
}
