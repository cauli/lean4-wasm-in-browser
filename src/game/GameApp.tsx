import { lazy, Suspense, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { LeanEditor, type LeanMarker } from '../editor/LeanEditor'
import {
  allInventory,
  findGameFromPath,
  findLevelFromPath,
  findWorldFromPath,
  gameForLevel,
  games,
  getWorld,
  inventoryForLevel,
  levelPath,
  manifoldGame,
  nextLevel,
  nngGame,
  realAnalysisGame,
  splitLiveGoal,
  splitStatement,
  worldPath,
  type GameRules,
  type GameLevel,
  type GameWorld,
  type LeanGame,
  type StructuredGoal,
  type VerificationSupport,
} from './game-data'
import { GameMarkdown } from './GameMarkdown'
import type { TopoModelId } from './topo-models'
import type { RobotWorkspaceFocus } from './RobotWorkspaceLab'
import { CourseWorldTree, GameInventoryOverview, NaturalNumberWorldTree } from './WorldTree'
import {
  useLeanGameVerifier,
  type GameVerificationResult,
  type GameGoalInspection,
  type LeanGameVerifier,
  type VerificationStage,
} from './useLeanGameVerifier'
import './GameApp.css'

const ManifoldObjectLab = lazy(() => import('./ManifoldObjectLab'))
const RobotWorkspaceLab = lazy(() => import('./RobotWorkspaceLab'))
const TopoScene = lazy(() => import('./TopoScene'))

declare global {
  interface Window {
    __leanGameConformance?: {
      runRealAnalysisReferences: (
        rules?: GameRules,
        range?: { start?: number; end?: number },
      ) => Promise<Array<{ id: string; result: GameVerificationResult }>>
      runManifoldReferences: (
        rules?: GameRules,
      ) => Promise<Array<{ id: string; result: GameVerificationResult }>>
    }
  }
}

interface SavedProgress {
  answers: Record<string, string>
  completed: string[]
  attempts: Record<string, number>
  rules: GameRules
}

const EMPTY_PROGRESS: SavedProgress = { answers: {}, completed: [], attempts: {}, rules: 'regular' }

function readProgress(game: LeanGame): SavedProgress {
  try {
    const saved = JSON.parse(localStorage.getItem(game.progressKey) || 'null') as Partial<SavedProgress> | null
    if (saved) {
      return {
        answers: saved.answers || {},
        completed: saved.completed || [],
        attempts: saved.attempts || {},
        rules: saved.rules === 'none' || saved.rules === 'relaxed' ? saved.rules : 'regular',
      }
    }
  } catch {
    // A malformed local save should never prevent opening the game.
  }
  return EMPTY_PROGRESS
}

function supportLabel(support: VerificationSupport): string {
  if (support === 'kernel') return 'Local kernel'
  if (support === 'partial') return 'Partial'
  return 'Blocked'
}

interface LevelTopoScene {
  model: TopoModelId
  caption: string
  highlight?: string[]
}

const topoSceneByLevel: Record<string, LevelTopoScene> = {
  'localcharts-4': {
    model: 'sphere-charts',
    caption: 'A chart can take a point to its drawing and back only inside the colored patch where that chart is valid.',
    highlight: ['NorthChart'],
  },
  'chartedspaces-5': {
    model: 'sphere-charts',
    caption: 'The amber and teal chart sources overlap and together cover the sphere, just as an atlas covers a surface with local maps.',
    highlight: ['NorthChart', 'SouthChart'],
  },
  'canonicalcharts-4': {
    model: 'torus-loops',
    caption: 'The two highlighted loops picture Ada\'s two circle readings. A product chart combines one local chart from each factor.',
    highlight: ['MeridianLoop', 'LongitudeLoop'],
  },
  'canonicalcharts-5': {
    model: 'torus-loops',
    caption: 'The surface is emphasized as the home of the paired point, while its two factor loops recede.',
    highlight: ['Torus'],
  },
  'tangentspaces-1': {
    model: 'tangent-plane',
    caption: 'The attached plane pictures the tangent space at Ada\'s chosen place. Standing still is its zero vector.',
    highlight: ['Ada', 'TangentPlane'],
  },
  'tangentspaces-2': {
    model: 'tangent-plane',
    caption: 'A tangent-bundle point keeps the location on the surface together with a velocity from the tangent space attached there.',
    highlight: ['Ada', 'TangentPlane', 'Velocity'],
  },
  'mapprojections-1': {
    model: 'sphere-charts',
    caption: 'A stereographic chart draws every point except its chosen pole. The missing point is the price of flattening the sphere onto one leaf.',
    highlight: ['NorthChart'],
  },
  'mapprojections-5': {
    model: 'sphere-charts',
    caption: 'Each colored chart misses one pole. Because the poles differ, the two chart sources cover the whole sphere.',
    highlight: ['NorthChart', 'SouthChart'],
  },
  'robotarm-1': {
    model: 'robot-arm',
    caption: 'The orange displacement ends at the elbow. Adding the teal displacement places the red tip on the work plane.',
    highlight: ['MA_FirstLink', 'MA_SecondLink', 'MA_Tip'],
  },
  'robotarm-3': {
    model: 'robot-arm',
    caption: 'Turning the shoulder through a full revolution changes the angle but not either link direction, so the tip returns to the same point.',
    highlight: ['MA_ShoulderAngle', 'MA_FirstLink', 'MA_SecondLink', 'MA_Tip'],
  },
  'robotarm-4': {
    model: 'robot-arm',
    caption: 'Small changes at either circular joint produce small changes at the tip. The final proof states that this forward-kinematics map is continuous.',
    highlight: ['MA_ShoulderAngle', 'MA_ElbowAngle', 'MA_FirstLink', 'MA_SecondLink', 'MA_Tip'],
  },
}

function topoSceneForLevel(level: GameLevel): LevelTopoScene | undefined {
  if (level.gameId !== manifoldGame.id) return undefined
  return topoSceneByLevel[level.id]
}

const robotWorkspaceFocusByLevel: Record<string, RobotWorkspaceFocus> = {
  'robotreachability-1': 'outer',
  'robotreachability-2': 'inner',
  'robotreachability-3': 'annulus',
  'robotreachability-4': 'unreachable',
}

function canOpenLevel(level: GameLevel, completed: Set<string>): boolean {
  const game = gameForLevel(level)
  if (completed.has(level.id)) return true
  const world = getWorld(level.world, game)
  if (!world) return false
  const prerequisitesDone = world.prerequisites.every((id) => (
    getWorld(id, game)?.levels.every((candidate) => completed.has(candidate.id))
  ))
  if (!prerequisitesDone) return false
  const index = world.levels.findIndex((candidate) => candidate.id === level.id)
  const previous = world.levels[index - 1]
  return index === 0 || Boolean(previous && completed.has(previous.id))
}

function AppLink({
  href,
  navigate,
  className,
  ariaLabel,
  children,
}: {
  href: string
  navigate: (path: string) => void
  className?: string
  ariaLabel?: string
  children: ReactNode
}) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(href)
  }
  return <a aria-label={ariaLabel} className={className} href={href} onClick={onClick}>{children}</a>
}

function StatusTag({ support }: { support: VerificationSupport }) {
  return <span className={`game-status game-status-${support}`}>{supportLabel(support)}</span>
}

function DevelopmentBadge({ game }: { game: LeanGame }) {
  if (game.developmentStatus !== 'work-in-progress') return null
  return (
    <span className="game-development-badge" aria-label="Work in progress">
      <span>WIP</span>
      <span className="game-development-badge-label">Work in progress</span>
    </span>
  )
}

function formatStepElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function RuntimePreparationBar({
  verifier,
  ready,
  onRetry,
}: {
  verifier: LeanGameVerifier
  ready: boolean
  onRetry: () => void
}) {
  // Some preparation steps compute for minutes without a new message (module
  // finalization, opening a world's definitions). Count seconds since the last
  // message so silence reads as work, not as a hang.
  const [stepSeconds, setStepSeconds] = useState(0)
  const [seenProgress, setSeenProgress] = useState(verifier.progress)
  if (seenProgress !== verifier.progress) {
    setSeenProgress(verifier.progress)
    setStepSeconds(0)
  }
  const active = !ready && verifier.status === 'loading'
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setStepSeconds((seconds) => seconds + 1), 1000)
    return () => window.clearInterval(id)
  }, [active])
  if (ready && verifier.status !== 'error') return null
  const failed = verifier.status === 'error'
  const showStall = active && stepSeconds >= 8
  return (
    <section
      className={`game-runtime-status${failed ? ' game-runtime-status-error' : ''}`}
      aria-live="polite"
    >
      <div className="game-runtime-status-copy">
        <strong>{failed ? 'Lean stopped while preparing' : 'Preparing local Lean'}</strong>
        <span>{verifier.progress}</span>
        {showStall && (
          <span className="game-runtime-status-stall">
            Still working ({formatStepElapsed(stepSeconds)} in this step) — the larger
            Lean steps run single-threaded and can take a few minutes on first load.
          </span>
        )}
      </div>
      {!failed ? (
        <div
          className="game-runtime-progress"
          role="progressbar"
          aria-label="Preparing local Lean"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={verifier.loadPercent}
          aria-valuetext={verifier.progress}
        >
          <span style={{ width: `${verifier.loadPercent}%` }} />
        </div>
      ) : (
        <button type="button" className="game-runtime-retry" onClick={onRetry}>
          Try again
        </button>
      )}
    </section>
  )
}

function WorldMap({
  game,
  progress,
  updateProgress,
  navigate,
}: {
  game: LeanGame
  progress: SavedProgress
  updateProgress: (updater: (current: SavedProgress) => SavedProgress) => void
  navigate: (path: string) => void
}) {
  const completed = new Set(progress.completed)
  return (
    <main className="game-map-shell">
      <aside className="game-welcome-pane">
        <article className="game-prose game-welcome-copy">
          <GameMarkdown assetBase={game.assetBase}>{game.introduction}</GameMarkdown>
          <aside className="game-port-credit" aria-label="Upstream project credits">
            <strong>{game.id === manifoldGame.id ? 'About this course' : 'About this port'}</strong>
            {game.id === manifoldGame.id ? (
              <p>
                This course was written for this local library. It uses the interface from{' '}
                <a href="https://github.com/leanprover-community/lean4game" target="_blank" rel="noreferrer">Lean4Game</a>,
                primarily developed by Alexander Bentkamp and Jon Eugster. The mathematical
                sources used to write the lessons are credited and linked above.
              </p>
            ) : (
              <p>
                This is a convenience port for running the game locally in a browser. The original
                game framework is <a href="https://github.com/leanprover-community/lean4game" target="_blank" rel="noreferrer">Lean4Game</a>,
                primarily developed by Alexander Bentkamp and Jon Eugster. The{' '}
                <a href={game.source.repository} target="_blank" rel="noreferrer">{game.title}</a>{' '}
                is by {game.creator}
                {game.id === nngGame.id
                  ? ', with Patrick Massot’s NNG4 prototype and many Lean community contributors.'
                  : ', created for Rutgers University Math 311H.'}
              </p>
            )}
          </aside>
        </article>
        <details className="game-map-audit">
          <summary>Browser port status</summary>
          <VerificationAudit game={game} />
        </details>
      </aside>

      {game.id === nngGame.id ? (
        <NaturalNumberWorldTree
          completed={completed}
          navigate={navigate}
          rules={progress.rules}
          onRulesChange={(rules) => updateProgress((current) => ({ ...current, rules }))}
        />
      ) : (
        <CourseWorldTree
          game={game}
          completed={completed}
          navigate={navigate}
          rules={progress.rules}
          onRulesChange={(rules) => updateProgress((current) => ({ ...current, rules }))}
        />
      )}

      <GameInventoryOverview game={game} completed={completed} rules={progress.rules} />
    </main>
  )
}

function VerificationAudit({ game }: { game: LeanGame }) {
  const nngRows: Array<{ label: string; state: 'ready' | 'partial' | 'missing'; detail: string }> = [
    { label: 'Course structure', state: 'ready', detail: 'All 9 active worlds and 79 levels come from NNG4.' },
    { label: 'Proof elaboration', state: 'ready', detail: 'Supported answers are elaborated by the in-browser Lean runtime.' },
    { label: 'Kernel verification', state: 'ready', detail: 'Accepted proof terms are checked locally, without a proof server.' },
    { label: 'Reference solutions', state: 'ready', detail: 'Every lesson can reveal and load its upstream NNG4 solution for testing.' },
    { label: 'Reference conformance', state: 'partial', detail: '21 of 79 upstream solutions currently pass the regular policy gate and local kernel unchanged; all 79 are pinned by the WASM matrix.' },
    { label: 'Rule modes', state: 'ready', detail: 'Regular, relaxed, and no-restriction modes match Lean4Game level and inventory locking.' },
    { label: 'Tactic inventory', state: 'ready', detail: 'Lean parses tactic syntax and enforces visible, hidden, locked, disabled, and unavailable tactics plus theorem and definition inventory.' },
    { label: 'Live proof state', state: 'ready', detail: 'Open goals and hypotheses are inspected locally after proof edits.' },
    { label: 'Lesson formatting', state: 'ready', detail: 'Markdown, GFM tables and lists, sanitized HTML and images, and inline or display KaTeX render locally.' },
    { label: 'Contextual hints', state: 'partial', detail: 'Static hints render. Branch-sensitive Hint and Branch evaluation is not ported.' },
    { label: 'Game packages', state: 'partial', detail: 'A local Mathlib browser layer is available for Real Analysis. NNG still uses its generated compatibility environment, and branch-sensitive GameServer behavior is not bundled.' },
    { label: 'Version parity', state: 'partial', detail: `NNG4 uses ${nngGame.source.toolchain}; a visible compatibility layer adapts it to this newer Lean build.` },
    { label: 'Progress and unlocks', state: 'ready', detail: 'Completion, answers, attempts, level locks, and world locks persist locally.' },
  ]
  const realAnalysisRows: typeof nngRows = [
    { label: 'Course structure', state: 'ready', detail: 'All 44 active worlds and 139 levels are imported from the pinned upstream snapshot.' },
    { label: 'Lesson content', state: 'ready', detail: 'Statements, introductions, conclusions, hints, reference solutions, inventory, dependency edges, and course images render locally.' },
    { label: 'Reference solutions', state: 'ready', detail: 'Every level exposes its pinned upstream proof, with narrow compatibility adaptations recorded by the import script and upstream placeholders left visible.' },
    { label: 'Markdown and mathematics', state: 'ready', detail: 'Markdown, KaTeX, tables, sanitized HTML, links, and the upstream image set render locally.' },
    { label: 'Progress and unlocks', state: 'ready', detail: 'Answers, attempts, rules, and progress use a separate local save from the Natural Number Game.' },
    { label: 'Proof elaboration', state: 'ready', detail: 'The first proof lazily loads the pinned Mathlib and adapted course package into the browser’s persistent Lean worker.' },
    { label: 'Live proof state', state: 'ready', detail: 'Open goals and hypotheses are inspected by the same local Mathlib environment after proof edits.' },
    { label: 'Kernel verification', state: 'ready', detail: 'Accepted answers elaborate and pass Lean’s kernel locally; no proof server or container participates while playing.' },
    { label: 'Reference conformance', state: 'partial', detail: '125 of 139 reference answers pass regular inventory enforcement and the browser kernel. Ten upstream sorry proofs and four browser call-stack limits remain explicit failures.' },
    { label: 'Trusted course base', state: 'partial', detail: 'The pinned upstream course contains 50 sorry placeholders across 14 helper or lesson modules. The port preserves and discloses them, so checking is relative to that course environment.' },
    { label: 'Answer inventory', state: 'ready', detail: 'The pinned GameServer syntax walk is mirrored locally: Lean parses tactic syntax, resolves theorem names in scope, and enforces unlocked, disabled, unavailable, and self-reference rules.' },
    { label: 'Contextual hints', state: 'partial', detail: 'Static hint text renders; branch-sensitive GameServer Hint and Branch evaluation remains unported.' },
    { label: 'Version parity', state: 'partial', detail: `The course targets ${game.source.toolchain}; a reproducible compatibility transform builds it against the exact newer Lean and Mathlib commits used by this browser.` },
  ]
  const manifoldRows: typeof nngRows = [
    { label: 'Course structure', state: 'ready', detail: 'The course has 10 worlds and 44 levels. A six-world main path is joined by optional branches on stereographic projection, circular motion, robot kinematics, and reachability.' },
    { label: 'Difficulty ladder', state: 'ready', detail: 'The main path moves from bundled structures to dependent tangent-bundle values. Optional branches turn the same topology into concrete calculations and constructions.' },
    { label: 'Proof elaboration', state: 'ready', detail: 'Every exercise elaborates in the pinned Mathlib manifold context; the statements use Mathlib structures rather than proxy propositions.' },
    { label: 'Kernel verification', state: 'ready', detail: "Lean's local kernel checks every accepted proof. No proof server is involved." },
    { label: 'Mathlib API unlocks', state: 'ready', detail: 'Levels unlock actual declarations such as Homeomorph.continuous, mem_chart_source, stereographic_source, Circle.exp_add_two_pi, and contMDiff_circleExp.' },
    { label: 'Course theorem unlocks', state: 'ready', detail: 'Each completed exercise also adds its proved ManifoldAdventure theorem to the inventory for later reuse.' },
    { label: 'Reference solutions', state: 'ready', detail: 'The generated BrowserBase contains no course axioms, sorry declarations, or unsafe placeholders.' },
    { label: 'Pinned source', state: 'ready', detail: 'Compiler, upstream Lean base, and Mathlib revisions are pinned. All 44 reference solutions passed the matching Linux i386 CI kernel gate for revision r3.' },
    { label: 'Learning prerequisites', state: 'partial', detail: 'The opening worlds introduce Lean notation, but the smooth-manifold worlds assume some topology and linear-algebra vocabulary.' },
    { label: 'Sources', state: 'ready', detail: 'The course links its generated Lean source and recommends Tu, Lee, and Milnor for the surrounding mathematics.' },
    { label: 'Browser artifacts', state: 'ready', detail: 'The graph-aware browser package includes the sphere, circle, robot-arm, and reachability branches. Its first proof and persistent offline cache passed the documented Chromium gate.' },
    { label: 'Saved progress', state: 'ready', detail: 'The game keeps answers, attempts, completed levels, locks, and rule settings in its own local save.' },
  ]
  const rows = game.id === nngGame.id
    ? nngRows
    : game.id === realAnalysisGame.id
      ? realAnalysisRows
      : manifoldRows

  return (
    <section className="verification-audit" aria-labelledby="verification-audit-title">
      <div className="game-section-heading">
        <h2 id="verification-audit-title">Verification audit</h2>
        <p>What is real today, and what still needs porting</p>
      </div>
      <div className="audit-grid">
        {rows.map((row) => (
          <div className="audit-row" key={row.label}>
            <span className={`audit-state audit-state-${row.state}`}>{row.state}</span>
            <strong>{row.label}</strong>
            <p>{row.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function WorldOverview({
  game,
  world,
  progress,
  navigate,
}: {
  game: LeanGame
  world: GameWorld
  progress: SavedProgress
  navigate: (path: string) => void
}) {
  const completed = new Set(progress.completed)
  return (
    <main className="world-overview">
      <AppLink href={game.basePath} navigate={navigate} className="game-back-link">Back to world tree</AppLink>
      <section className="world-overview-heading">
        <div>
          <StatusTag support={world.verification} />
          <h1>{world.title}</h1>
        </div>
        <span>{world.levels.filter((level) => completed.has(level.id)).length}/{world.levels.length} complete</span>
      </section>
      <div className="world-overview-grid">
        <article className="game-prose world-introduction">
          <GameMarkdown assetBase={game.assetBase}>{world.introduction}</GameMarkdown>
          {game.id === manifoldGame.id && world.id === 'CanonicalCharts' && (
            <Suspense fallback={<p>Loading the local 3D model…</p>}>
              <ManifoldObjectLab />
            </Suspense>
          )}
          {game.id === manifoldGame.id && world.id === 'RobotArm' && (
            <Suspense fallback={<p>Loading the local 3D model...</p>}>
              <TopoScene
                model="robot-arm"
                caption="Each ring is one circle-valued joint. Reading both rings gives one point of the arm's configuration space."
                highlight={['MA_ShoulderAngle', 'MA_ElbowAngle']}
              />
            </Suspense>
          )}
          {game.id === manifoldGame.id && world.id === 'RobotReachability' && (
            <Suspense fallback={<p>Loading the reachability lab...</p>}>
              <RobotWorkspaceLab allowThreeLinks />
            </Suspense>
          )}
        </article>
        <ol className="world-level-list">
          {world.levels.map((level) => (
            <li key={level.id}>
              <AppLink href={levelPath(level)} navigate={navigate}>
                <span>{String(level.number).padStart(2, '0')}</span>
                <strong>{level.title}</strong>
                <span>{completed.has(level.id) ? 'Completed' : supportLabel(level.verification)}</span>
              </AppLink>
            </li>
          ))}
        </ol>
      </div>
    </main>
  )
}

function LockedLevel({
  level,
  navigate,
}: {
  level: GameLevel
  navigate: (path: string) => void
}) {
  const game = gameForLevel(level)
  const world = getWorld(level.world, game)
  const previous = world?.levels[level.number - 2]
  return (
    <main className="locked-level-page">
      <div className="locked-level-symbol" aria-hidden="true">🔒</div>
      <p>{world?.title} · Level {level.number}</p>
      <h1>{level.title} is locked under regular rules.</h1>
      <p>
        {previous
          ? `Complete "${previous.title}" first, or change Rules to relaxed or none on the world tree.`
          : 'Complete this world’s prerequisites first, or change Rules on the world tree.'}
      </p>
      <AppLink href={game.basePath} navigate={navigate} className="game-primary-button">
        Back to world tree
      </AppLink>
    </main>
  )
}

function GameTableOfContents({
  game,
  selected,
  progress,
  navigate,
}: {
  game: LeanGame
  selected: GameLevel
  progress: SavedProgress
  navigate: (path: string) => void
}) {
  const completed = new Set(progress.completed)
  return (
    <nav className="game-toc" aria-label="Game worlds and levels">
      <AppLink href={game.basePath} navigate={navigate} className="game-toc-map-link">World tree</AppLink>
      {game.worlds.map((world) => (
        <details key={world.id} open={world.id === selected.world}>
          <summary>
            <span>{world.title}</span>
            <span>{world.levels.filter((level) => completed.has(level.id)).length}/{world.levels.length}</span>
          </summary>
          <ol>
            {world.levels.map((level) => (
              <li key={level.id}>
                <AppLink
                  href={levelPath(level)}
                  navigate={navigate}
                  className={level.id === selected.id ? 'active' : undefined}
                >
                  <span>{level.number}</span>
                  <span>{level.title}</span>
                  <span aria-label={completed.has(level.id) ? 'Completed' : 'Not completed'}>
                    {completed.has(level.id) ? '✓' : ''}
                  </span>
                </AppLink>
              </li>
            ))}
          </ol>
        </details>
      ))}
    </nav>
  )
}

function Inventory({ game, level, rules }: { game: LeanGame; level: GameLevel; rules: GameRules }) {
  const inventory = useMemo(() => inventoryForLevel(level), [level])
  const completeInventory = useMemo(() => allInventory(game), [game])
  const [tab, setTab] = useState<keyof typeof inventory>('tactics')
  const items = completeInventory[tab]
  const available = new Set(rules === 'none' ? items : inventory[tab])
  return (
    <aside className="game-inventory">
      <div className="inventory-tabs" role="tablist" aria-label="Unlocked inventory">
        {(['tactics', 'theorems', 'definitions'] as const).map((name) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === name}
            className={tab === name ? 'active' : ''}
            onClick={() => setTab(name)}
            key={name}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="inventory-content">
        <h2>Available {tab}</h2>
        {items.length ? (
          <ul>
            {items.map((item) => (
              <li className={available.has(item) ? 'available' : 'locked'} key={item}>
                <code>{!available.has(item) && <span aria-hidden="true">🔒 </span>}{item}</code>
              </li>
            ))}
          </ul>
        ) : (
          <p>Nothing in this category has been unlocked yet.</p>
        )}
      </div>
      <details className="compatibility-note">
        <summary>Verification scope</summary>
        <p>
          {game.id === manifoldGame.id
            ? 'A pinned local Mathlib layer checks these Homeomorph, ChartedSpace, IsManifold, and TangentBundle exercises and shows their live goals in your browser.'
            : game.verifier === 'natural-number'
              ? 'The local kernel checks proofs and live goals. Exact contextual Branch and Hint matching is still being ported.'
            : 'A lazy local Mathlib layer checks proofs and live goals in this browser. Branch-sensitive hints and exact GameServer inventory semantics remain outside the current port.'}
        </p>
      </details>
    </aside>
  )
}

function StageList({ stages }: { stages: VerificationStage[] }) {
  return (
    <ol className="verification-stages">
      {stages.map((stage) => (
        <li className={`verification-stage verification-stage-${stage.state}`} key={stage.label}>
          <span>{stage.state}</span>
          <div><strong>{stage.label}</strong><p>{stage.detail}</p></div>
        </li>
      ))}
    </ol>
  )
}

function LeanExpression({ children }: { children: string }) {
  const tokens = children.split(/(\b\d+\b|[ℕℤℚℝ]|[=+*×^≤≥<>≠∧∨¬→←])/g)
  return (
    <>
      {tokens.map((token, index) => {
        const kind = /^\d+$/.test(token)
          ? 'number'
          : /^[ℕℤℚℝ]$/.test(token)
            ? 'type'
            : /^[=+*×^≤≥<>≠∧∨¬→←]$/.test(token)
              ? 'operator'
              : ''
        return kind
          ? <span className={`lean-token-${kind}`} key={`${index}-${token}`}>{token}</span>
          : token
      })}
    </>
  )
}

function GoalBindingList({
  title,
  bindings,
}: {
  title: string
  bindings: StructuredGoal['objects']
}) {
  if (bindings.length === 0) return null
  return (
    <section className="goal-context-section">
      <h3>{title}</h3>
      <dl>
        {bindings.map((binding, index) => (
          <div className="goal-binding" key={`${index}-${binding.names}-${binding.type}`}>
            <dt>{binding.names || 'instance'}</dt>
            <dd>
              {binding.names && <span aria-hidden="true">:</span>}
              <code><LeanExpression>{binding.type}</LeanExpression></code>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function StructuredGoalView({ goal }: { goal: StructuredGoal }) {
  const hasInaccessible = [...goal.objects, ...goal.assumptions]
    .some((binding) => binding.names.includes('✝'))
  return (
    <div className="structured-goal">
      {goal.caseName && <p className="goal-case-name">case {goal.caseName}</p>}
      <div className="goal-context">
        <GoalBindingList title="Objects" bindings={goal.objects} />
        <GoalBindingList title="Assumptions" bindings={goal.assumptions} />
        {goal.objects.length === 0 && goal.assumptions.length === 0 && (
          <p className="goal-empty-context">No local objects or assumptions</p>
        )}
        {hasInaccessible && (
          <p className="goal-inaccessible-note">
            A hypothesis marked <code>✝</code> has no name, so tactics cannot refer
            to it. Give it one when you create it, for example <code>intro hCamp</code>{' '}
            instead of <code>intro</code>.
          </p>
        )}
      </div>
      <div className="goal-target">
        <span aria-hidden="true">⊢</span>
        <code><LeanExpression>{goal.goal}</LeanExpression></code>
      </div>
    </div>
  )
}

function LevelRewards({
  game,
  level,
  completed,
}: {
  game: LeanGame
  level: GameLevel
  completed: boolean
}) {
  const newTools = [
    ...level.newTactics.map((name) => ({ kind: 'Tactic', name })),
    ...(level.completionTactics || []).map((name) => ({ kind: 'Completion tactic', name })),
    ...level.newDefinitions.map((name) => ({
      kind: game.id === manifoldGame.id ? 'Mathlib definition' : 'Definition',
      name,
    })),
    ...level.newTheorems.map((name) => ({
      kind: game.id === manifoldGame.id ? 'Mathlib declaration' : 'Theorem',
      name,
    })),
  ]

  return (
    <aside
      className={`level-rewards${completed ? ' level-rewards-earned' : ''}`}
      aria-label="Level unlocks"
    >
      <div className="level-rewards-heading">
        <span aria-hidden="true">{completed ? '✓' : '◇'}</span>
        <strong>{completed ? 'Level rewards earned' : 'Level rewards'}</strong>
      </div>
      {newTools.length > 0 && (
        <div className="level-reward-row">
          <span>New this level</span>
          <div>
            {newTools.map(({ kind, name }) => (
              <code title={kind} key={`${kind}-${name}`}>{name}</code>
            ))}
          </div>
        </div>
      )}
      {level.theoremName && (
        <div className="level-reward-row">
          <span>
            {game.id === manifoldGame.id
              ? completed ? 'Course declaration earned' : 'Prove this course declaration'
              : completed ? 'Theorem unlocked' : 'Prove to unlock'}
          </span>
          <code>{level.theoremName}</code>
        </div>
      )}
      <p>
        {game.id === manifoldGame.id
          ? 'Mathlib names are library declarations; the course declaration is your reusable result.'
          : 'Unlocked theorems become usable in later proofs under regular rules.'}
      </p>
    </aside>
  )
}

function LevelWorkspace({
  game,
  level,
  progress,
  updateProgress,
  navigate,
  verifier,
  rules,
}: {
  game: LeanGame
  level: GameLevel
  progress: SavedProgress
  updateProgress: (updater: (current: SavedProgress) => SavedProgress) => void
  navigate: (path: string) => void
  verifier: LeanGameVerifier
  rules: GameRules
}) {
  const initialProof = progress.answers[level.id] || ''
  const [proof, setProof] = useState(initialProof)
  const proofRef = useRef(initialProof)
  const [result, setResult] = useState<GameVerificationResult | null>(null)
  const [hintIndex, setHintIndex] = useState(-1)
  const [solutionVisible, setSolutionVisible] = useState(false)
  const [goalInspection, setGoalInspection] = useState<GameGoalInspection | null>(null)
  const [lastOpenGoals, setLastOpenGoals] = useState<string[]>([])
  const [goalPreviewPending, setGoalPreviewPending] = useState(Boolean(initialProof.trim()))
  const goalPreviewRevision = useRef(0)
  const { status, progress: checkerProgress, inspectGoals, verify } = verifier
  const statement = useMemo(() => splitStatement(level), [level])
  const following = nextLevel(level)
  const world = getWorld(level.world, game)
  const topoScene = topoSceneForLevel(level)
  const robotWorkspaceFocus = robotWorkspaceFocusByLevel[level.id]
  const levelCompleted = progress.completed.includes(level.id)
  const levelReady = verifier.isLevelReady(level)
  const isChecking = status === 'checking'
  const verifyDisabled = !levelReady || status === 'loading' || status === 'checking' || status === 'error'
  const verifyTooltip = !levelReady
    ? `Lean is still preparing this level. ${checkerProgress}`
    : status === 'checking'
      ? 'Lean is checking the current proof.'
      : status === 'error'
        ? checkerProgress
        : 'Check this proof with the local Lean kernel.'

  useEffect(() => {
    const revision = goalPreviewRevision.current + 1
    goalPreviewRevision.current = revision

    if (!proof.trim()) return
    const timeout = window.setTimeout(async () => {
      const inspection = await inspectGoals(level, proof, rules)
      if (goalPreviewRevision.current !== revision) return
      setGoalInspection(inspection)
      if (inspection.kind === 'goals') setLastOpenGoals(inspection.goals)
      setGoalPreviewPending(false)
    }, 450)

    return () => {
      window.clearTimeout(timeout)
      if (goalPreviewRevision.current === revision) goalPreviewRevision.current += 1
    }
  }, [inspectGoals, level, proof, rules])

  const changeProof = (value: string) => {
    proofRef.current = value
    setProof(value)
    setResult(null)
    if (value.trim()) {
      setGoalPreviewPending(true)
    } else {
      goalPreviewRevision.current += 1
      setGoalInspection(null)
      setLastOpenGoals([])
      setGoalPreviewPending(false)
    }
    updateProgress((current) => ({
      ...current,
      answers: { ...current.answers, [level.id]: value },
    }))
  }

  const checkAnswer = async () => {
    updateProgress((current) => ({
      ...current,
      attempts: { ...current.attempts, [level.id]: (current.attempts[level.id] || 0) + 1 },
    }))
    const nextResult = await verify(level, proofRef.current, rules)
    setResult(nextResult)
    if (nextResult.success) {
      updateProgress((current) => ({
        ...current,
        completed: current.completed.includes(level.id)
          ? current.completed
          : [...current.completed, level.id],
      }))
    }
  }

  const markers: LeanMarker[] = result?.diagnostics || goalInspection?.diagnostics || []
  const visibleGoals = goalInspection?.kind === 'goals'
    ? goalInspection.goals
    : lastOpenGoals
  const goalPanelStatus = goalPreviewPending
    ? status === 'loading' ? 'Starting Lean locally…' : 'Updating locally…'
    : goalInspection?.kind === 'complete'
      ? 'Last goal before completion'
      : goalInspection?.kind === 'goals'
        ? goalInspection.detail
        : goalInspection
          ? 'Last valid goal'
          : 'Initial goal'

  return (
    <main className="level-shell">
      <aside className="level-story">
        <div className="level-story-scroll">
          <header className="level-heading">
            <div>
              {world && <AppLink href={worldPath(world)} navigate={navigate}>{world.title}</AppLink>}
              <span>Level {level.number} of {world?.levels.length}</span>
            </div>
            <h1>{level.title}</h1>
            <StatusTag support={level.verification} />
          </header>

          <article className="game-prose level-introduction">
            <GameMarkdown assetBase={game.assetBase}>{level.introduction}</GameMarkdown>
            {topoScene && (
              <Suspense fallback={<p>Loading the 3D model...</p>}>
                <TopoScene
                  model={topoScene.model}
                  caption={topoScene.caption}
                  highlight={topoScene.highlight}
                  compact
                />
              </Suspense>
            )}
            {robotWorkspaceFocus && (
              <Suspense fallback={<p>Loading the reachability lab...</p>}>
                <RobotWorkspaceLab focus={robotWorkspaceFocus} compact />
              </Suspense>
            )}
          </article>

          {game.id === manifoldGame.id && (
            <LevelRewards game={game} level={level} completed={levelCompleted} />
          )}

          {hintIndex >= 0 && (
            <aside className="hint-panel">
              <strong>Hint {hintIndex + 1}</strong>
              <GameMarkdown assetBase={game.assetBase}>{level.hints[hintIndex]}</GameMarkdown>
            </aside>
          )}

          {solutionVisible && (
            <aside className="solution-panel" aria-live="polite">
              <div className="solution-panel-heading">
                <strong>Reference solution</strong>
                <span>{game.id === manifoldGame.id ? 'reference answer' : `${game.shortTitle} upstream`}</span>
              </div>
              <p>Viewing this proof does not change your current answer.</p>
              <pre><code>{level.solution}</code></pre>
              <button type="button" className="game-secondary-button" onClick={() => changeProof(level.solution)}>
                Use in editor
              </button>
            </aside>
          )}

          {result?.success && (
            <section className="level-conclusion">
              <article className="game-prose">
                <GameMarkdown assetBase={game.assetBase}>{level.conclusion || 'The proof is complete.'}</GameMarkdown>
              </article>
              {following && (
                <AppLink href={levelPath(following)} navigate={navigate} className="game-next-button">
                  Next: {following.title}
                </AppLink>
              )}
            </section>
          )}
        </div>
        <GameTableOfContents game={game} selected={level} progress={progress} navigate={navigate} />
      </aside>

      <section className="level-workspace">
        {level.statementText && (
          <article className="game-prose level-statement">
            <GameMarkdown assetBase={game.assetBase}>{level.statementText}</GameMarkdown>
          </article>
        )}
        <section
          className={`goal-panel goal-panel-${goalInspection?.kind || 'initial'}`}
          aria-labelledby="goal-title"
          aria-live="polite"
          aria-busy={goalPreviewPending}
        >
          <div className="goal-panel-labels">
            <span id="goal-title">
              Active {goalInspection?.kind === 'goals' && goalInspection.goals.length > 1 ? 'goals' : 'goal'}
            </span>
            <span className="live-goal-indicator">{goalPanelStatus}</span>
          </div>
          {visibleGoals.length > 0 ? (
            <>
              <ol className="live-goal-list">
                {visibleGoals.map((goal, index) => {
                  const parsed = splitLiveGoal(goal)
                  if (index === 0) {
                    return (
                      <li key={`${index}-${goal}`}>
                        {visibleGoals.length > 1 && (
                          <strong className="live-goal-number">
                            Active goal · {visibleGoals.length - 1} more waiting
                          </strong>
                        )}
                        <StructuredGoalView goal={parsed} />
                      </li>
                    )
                  }
                  return (
                    <li key={`${index}-${goal}`} className="live-goal-upcoming">
                      <span className="goal-case-name">
                        {parsed.caseName ? `case ${parsed.caseName}` : `goal ${index + 1}`}
                      </span>
                      <span aria-hidden="true">⊢</span>
                      <code><LeanExpression>{parsed.goal}</LeanExpression></code>
                    </li>
                  )
                })}
              </ol>
              {visibleGoals.length > 1 && (
                <p className="live-goal-footnote">
                  Tactics act on the active goal. The waiting goals keep their
                  hypotheses and become active in order, one focus bullet <code>·</code> each.
                </p>
              )}
            </>
          ) : <StructuredGoalView goal={statement} />}
        </section>

        <section className="proof-panel" aria-labelledby="proof-title">
          <div className="proof-panel-heading">
            <div>
              <h2 id="proof-title">Your proof</h2>
              <p>Enter tactics only. The surrounding <code>by</code> is supplied for you.</p>
            </div>
            <span>{progress.attempts[level.id] || 0} attempts</span>
          </div>
          <div className="game-editor">
            <div className="game-editor-prefix">by</div>
            <LeanEditor
              file={`${game.id}/${level.world}/${level.number}.lean`}
              content={proof}
              markers={markers}
              onChange={changeProof}
              theme="lean-light"
            />
          </div>
          <div className="proof-actions">
            <span className="verify-button-tooltip" title={verifyTooltip}>
              <button
                type="button"
                className="game-primary-button"
                onClick={checkAnswer}
                disabled={verifyDisabled}
              >
                {isChecking ? 'Checking...' : 'Verify answer'}
              </button>
            </span>
            {following && levelCompleted && (
              <AppLink
                href={levelPath(following)}
                navigate={navigate}
                className="game-next-level-button"
                ariaLabel={`Next level: ${following.title}`}
              >
                <span aria-hidden="true">✓</span>
                <strong>Next level</strong>
                <span aria-hidden="true">→</span>
              </AppLink>
            )}
            {level.hints.length > 0 && (
              <button
                type="button"
                className="game-secondary-button"
                onClick={() => setHintIndex((current) => Math.min(level.hints.length - 1, current + 1))}
                disabled={hintIndex >= level.hints.length - 1}
              >
                {hintIndex < 0
                  ? 'Show a hint'
                  : hintIndex === level.hints.length - 2
                    ? 'Reveal solution hint'
                    : hintIndex >= level.hints.length - 1
                      ? 'Solution hint shown'
                      : 'Next hint'}
              </button>
            )}
            <button
              type="button"
              className="game-secondary-button game-solution-button"
              aria-expanded={solutionVisible}
              onClick={() => setSolutionVisible((current) => !current)}
            >
              {solutionVisible ? 'Hide solution' : 'View solution'}
            </button>
            {levelReady && (
              <span className={`checker-state checker-state-${status}`}>
                {checkerProgress}
              </span>
            )}
          </div>
          {(result || (!goalPreviewPending && goalInspection?.kind !== 'goals' && goalInspection)) && (
            <div className="proof-feedback" aria-live="polite">
              {result ? (
                <section className={`verification-result verification-result-${result.success ? 'success' : 'failure'}`}>
                  <div className="verification-result-copy">
                    <span>{result.success ? 'Verified' : 'Needs work'}</span>
                    <h2>{result.headline}</h2>
                    <p>{result.detail}</p>
                  </div>
                  <StageList stages={result.stages} />
                </section>
              ) : goalInspection?.kind === 'complete' ? (
                <div className="live-goal-complete">
                  <span aria-hidden="true">✓</span>
                  <div>
                    <strong>No goals remain</strong>
                    <p>{goalInspection.detail}</p>
                  </div>
                </div>
              ) : (
                <div className="live-goal-error">
                  <strong>Goal preview stopped here</strong>
                  <p>{goalInspection?.detail}</p>
                </div>
              )}
            </div>
          )}
        </section>
      </section>
      <Inventory game={game} level={level} rules={rules} />
    </main>
  )
}

function catalogCaption(game: LeanGame): string {
  if (game.caption) return game.caption

  const plain = game.introduction
    .replace(/^#+\s*/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (plain.length <= 210) return plain

  const preview = plain.slice(0, 210)
  const sentenceEnd = Math.max(
    preview.lastIndexOf('. '),
    preview.lastIndexOf('! '),
    preview.lastIndexOf('? '),
  )
  if (sentenceEnd >= 100) return preview.slice(0, sentenceEnd + 1)

  const wordEnd = preview.lastIndexOf(' ')
  return `${preview.slice(0, wordEnd).trimEnd()}…`
}

function GameCatalog({
  progressByGame,
  navigate,
}: {
  progressByGame: Record<string, SavedProgress>
  navigate: (path: string) => void
}) {
  return (
    <main className="game-catalog">
      <section className="game-catalog-intro">
        <p className="game-kicker">Local Lean4Game library</p>
        <h1>Choose a game</h1>
        <p>
          Each course keeps its own answers, rules, and completion progress. Course content is
          pinned to its credited upstream repository and stays available offline after the app loads.
        </p>
      </section>
      <div className="game-catalog-grid">
        {games.map((game) => {
          const progress = progressByGame[game.id] || EMPTY_PROGRESS
          const levels = game.worlds.flatMap((world) => world.levels)
          const completed = new Set(progress.completed)
          const completedCount = levels.filter((level) => completed.has(level.id)).length
          const kernelCount = levels.filter((level) => level.verification === 'kernel').length
          return (
            <article className={`game-card game-card-${game.id}`} key={game.id}>
              <AppLink href={game.basePath} navigate={navigate} className="game-card-cover">
                {game.coverImage && game.assetBase ? (
                  <img src={`${game.assetBase}/${game.coverImage.replace(/^images\//, '')}`} alt="" />
                ) : (
                  <span aria-hidden="true">{game.symbol}</span>
                )}
              </AppLink>
              <div className="game-card-body">
                <div className="game-card-meta">
                  <span>{game.worlds.length} worlds</span>
                  <span>{levels.length} levels</span>
                  <DevelopmentBadge game={game} />
                </div>
                <h2><AppLink href={game.basePath} navigate={navigate}>{game.title}</AppLink></h2>
                <p>{catalogCaption(game)}</p>
                <div className="game-card-status">
                  <span><strong>{completedCount}</strong> completed</span>
                  <span>
                    {game.verifier === 'natural-number'
                      ? `${kernelCount} browser-kernel levels`
                      : `${kernelCount} browser-kernel levels · local Mathlib`}
                  </span>
                </div>
                <div className="game-card-actions">
                  <AppLink href={game.basePath} navigate={navigate} className="game-primary-button">
                    {completedCount > 0 ? 'Continue game' : 'Open game'}
                  </AppLink>
                  <a href={game.source.repository} target="_blank" rel="noreferrer">Upstream source</a>
                </div>
                <small>By {game.creator} · {game.source.license}</small>
              </div>
            </article>
          )
        })}
      </div>
      <aside className="game-catalog-credit">
        <strong>Built on the original Lean4Game</strong>
        <p>
          This local library is a convenience port. Lean4Game is primarily developed by Alexander
          Bentkamp and Jon Eugster with the Lean community; all game authors and repositories remain
          credited on their course pages.
        </p>
      </aside>
    </main>
  )
}

export default function GameApp() {
  const [pathname, setPathname] = useState(window.location.pathname)
  const [progressByGame, setProgressByGame] = useState<Record<string, SavedProgress>>(() => (
    Object.fromEntries(games.map((game) => [game.id, readProgress(game)]))
  ))
  const verifier = useLeanGameVerifier()

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('conformance') === '1'
    if (!import.meta.env.DEV || !requested) return

    const api = {
      runRealAnalysisReferences: async (
        rules: GameRules = 'regular',
        range: { start?: number; end?: number } = {},
      ) => {
        const results: Array<{ id: string; result: GameVerificationResult }> = []
        const levels = realAnalysisGame.worlds.flatMap((world) => world.levels)
          .slice(range.start ?? 0, range.end ?? undefined)
        for (const level of levels) {
          results.push({
            id: level.id,
            result: await verifier.verify(level, level.solution, rules),
          })
        }
        return results
      },
      runManifoldReferences: async (rules: GameRules = 'regular') => {
        const results: Array<{ id: string; result: GameVerificationResult }> = []
        for (const level of manifoldGame.worlds.flatMap((world) => world.levels)) {
          results.push({
            id: level.id,
            result: await verifier.verify(level, level.solution, rules),
          })
        }
        return results
      },
    }
    window.__leanGameConformance = api
    return () => {
      if (window.__leanGameConformance === api) delete window.__leanGameConformance
    }
  }, [verifier])
  const game = findGameFromPath(pathname)
  const progress = game ? progressByGame[game.id] || EMPTY_PROGRESS : EMPTY_PROGRESS
  const selectedLevel = game ? findLevelFromPath(pathname, game) : undefined
  const selectedWorld = game ? findWorldFromPath(pathname, game) : undefined
  const completed = new Set(progress.completed)
  const selectedLevelLocked = Boolean(
    selectedLevel
    && progress.rules === 'regular'
    && !canOpenLevel(selectedLevel, completed),
  )
  const isCatalog = !game
  const isWorldMap = Boolean(game && !selectedLevel && !selectedWorld)
  const preparationLevel = selectedLevel && !selectedLevelLocked ? selectedLevel : undefined
  // The level this player would resume at: reading the world map is dead time
  // otherwise, so its course packs download and its world opens in Lean while
  // they read. Game data is module-static, so the reference is render-stable.
  const resumeCandidates = game
    ? (selectedWorld ? selectedWorld.levels : game.worlds.flatMap((world) => world.levels))
    : []
  const playableLevel = (candidate: GameLevel) => (
    progress.rules !== 'regular' || canOpenLevel(candidate, completed)
  )
  const backgroundLevel = preparationLevel
    ? undefined
    : resumeCandidates.find((candidate) => !completed.has(candidate.id) && playableLevel(candidate))
      ?? resumeCandidates.find(playableLevel)
  const { prepareLevel, prepareRuntime, prefetchRuntimeAssets } = verifier

  useEffect(() => {
    if (isCatalog) {
      const timeout = window.setTimeout(prefetchRuntimeAssets, 350)
      return () => window.clearTimeout(timeout)
    }
    if (preparationLevel) {
      void prepareLevel(preparationLevel).catch(() => undefined)
    } else if (backgroundLevel) {
      void prepareLevel(backgroundLevel).catch(() => undefined)
    } else {
      void prepareRuntime().catch(() => undefined)
    }
  }, [isCatalog, preparationLevel, backgroundLevel, prefetchRuntimeAssets, prepareLevel, prepareRuntime])

  useEffect(() => {
    const previousTitle = document.title
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const previousDescription = description?.content
    document.title = selectedLevel && game
      ? `${selectedLevel.title} | ${game.title}`
      : selectedWorld
        ? `${selectedWorld.title} | ${game?.title}`
        : game
          ? `${game.title} in your browser`
          : 'Local Lean4Game library'
    if (description) {
      description.content = game
        ? `Play ${game.title} locally in your browser.`
        : 'Choose a locally hosted Lean4Game course.'
    }
    return () => {
      document.title = previousTitle
      if (description && previousDescription !== undefined) description.content = previousDescription
    }
  }, [game, selectedLevel, selectedWorld])

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    for (const currentGame of games) {
      localStorage.setItem(
        currentGame.progressKey,
        JSON.stringify(progressByGame[currentGame.id] || EMPTY_PROGRESS),
      )
    }
  }, [progressByGame])

  const navigate = (path: string) => {
    window.history.pushState({}, '', path)
    setPathname(path)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const updateProgress = (updater: (current: SavedProgress) => SavedProgress) => {
    if (!game) return
    setProgressByGame((current) => ({
      ...current,
      [game.id]: updater(current[game.id] || EMPTY_PROGRESS),
    }))
  }
  const runtimeReady = preparationLevel
    ? verifier.isLevelReady(preparationLevel)
    : verifier.status === 'ready' || verifier.status === 'checking'
  const retryRuntimePreparation = () => {
    if (preparationLevel) {
      void prepareLevel(preparationLevel).catch(() => undefined)
    } else if (backgroundLevel) {
      void prepareLevel(backgroundLevel).catch(() => undefined)
    } else {
      void prepareRuntime().catch(() => undefined)
    }
  }

  return (
    <div className="game-app">
      <header className={`game-header${isWorldMap || isCatalog ? ' game-header-map' : ''}`}>
        {isCatalog ? (
          <>
            <a href="/" className="game-map-exit" aria-label="Back to Lean playground">← <span>◎</span></a>
            <AppLink href="/games" navigate={navigate} className="game-map-brand">
              Lean4Game Library
            </AppLink>
            <nav>
              <a href="/">Lean playground</a>
              <a href="https://github.com/leanprover-community/lean4game" target="_blank" rel="noreferrer">Lean4Game source</a>
            </nav>
          </>
        ) : isWorldMap && game ? (
          <>
            <AppLink
              href="/games"
              navigate={navigate}
              className="game-map-exit"
              ariaLabel="Back to all games"
            >
              ← <span>◎</span>
            </AppLink>
            <div className="game-map-title">
              <AppLink href={game.basePath} navigate={navigate} className="game-map-brand">
                {game.title}
              </AppLink>
              <DevelopmentBadge game={game} />
            </div>
            <details className="game-map-menu">
              <summary aria-label="Open game menu">☰</summary>
              <nav>
                <AppLink href="/games" navigate={navigate}>All games</AppLink>
                <AppLink href={game.basePath} navigate={navigate}>World tree</AppLink>
                <a href="/">Lean playground</a>
                <a href={game.source.repository} target="_blank" rel="noreferrer">Game source</a>
              </nav>
            </details>
          </>
        ) : game ? (
          <>
            <AppLink href={game.basePath} navigate={navigate} className="game-brand">
              <span>{game.symbol}</span>
              <span>{game.shortTitle}</span>
              <DevelopmentBadge game={game} />
            </AppLink>
            {selectedLevel && (
              <div className="game-header-level">
                <div className="game-header-level-meta">
                  <span>{getWorld(selectedLevel.world, game)?.title} · Level {selectedLevel.number}</span>
                  {completed.has(selectedLevel.id) && (
                    <span className="game-header-complete" role="status">
                      <span aria-hidden="true">✓</span>
                      Completed
                    </span>
                  )}
                </div>
                <strong>{selectedLevel.title}</strong>
              </div>
            )}
            <nav>
              <AppLink href="/games" navigate={navigate}>Games</AppLink>
              <AppLink href={game.basePath} navigate={navigate}>Worlds</AppLink>
              <a href="/">Lean playground</a>
              <a href={game.source.repository} target="_blank" rel="noreferrer">Game source</a>
            </nav>
          </>
        ) : null}
      </header>

      {!isCatalog && (
        <RuntimePreparationBar
          verifier={verifier}
          ready={runtimeReady}
          onRetry={retryRuntimePreparation}
        />
      )}

      {isCatalog ? (
        <GameCatalog progressByGame={progressByGame} navigate={navigate} />
      ) : selectedLevel && selectedLevelLocked ? (
        <LockedLevel level={selectedLevel} navigate={navigate} />
      ) : selectedLevel && game ? (
        <LevelWorkspace
          key={selectedLevel.id}
          game={game}
          level={selectedLevel}
          progress={progress}
          updateProgress={updateProgress}
          navigate={navigate}
          verifier={verifier}
          rules={progress.rules}
        />
      ) : selectedWorld && game ? (
        <WorldOverview game={game} world={selectedWorld} progress={progress} navigate={navigate} />
      ) : game ? (
        <WorldMap game={game} progress={progress} updateProgress={updateProgress} navigate={navigate} />
      ) : null}

      <footer className={`game-footer${selectedLevel || isWorldMap || isCatalog ? ' game-footer-level' : ''}`}>
        <span>Convenience port of Lean4Game; upstream creators and licenses retain credit.</span>
        <span>
          {game
            ? game.verifier === 'natural-number'
              ? 'Proof checking stays in this browser.'
              : 'Mathlib proof checking stays in this browser.'
            : 'Choose a game to begin.'}
        </span>
      </footer>
    </div>
  )
}
