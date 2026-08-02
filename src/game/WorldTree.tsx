import { useMemo, useState, type MouseEvent } from 'react'
import {
  getWorld,
  levelPath,
  nngGame,
  type GameRules,
  type GameLevel,
  type GameWorld,
  type LeanGame,
} from './game-data'

interface Point {
  x: number
  y: number
}

interface Props {
  game?: LeanGame
  completed: Set<string>
  navigate: (path: string) => void
  rules: GameRules
  onRulesChange: (rules: GameRules) => void
}

const NNG_WORLD_POSITIONS: Record<string, Point> = {
  Tutorial: { x: 500, y: 110 },
  Addition: { x: 500, y: 340 },
  Multiplication: { x: 290, y: 590 },
  Implication: { x: 690, y: 590 },
  Power: { x: 220, y: 870 },
  Algorithm: { x: 510, y: 870 },
  AdvAddition: { x: 820, y: 870 },
  LessOrEqual: { x: 690, y: 1170 },
  AdvMultiplication: { x: 460, y: 1480 },
}

const LEVEL_RADIUS = 13
const MAX_RING_SEGMENTS = 17

function geometry(levelCount: number) {
  const count = Math.max(levelCount, 5)
  const segments = Math.min(count + 2, MAX_RING_SEGMENTS)
  const angle = 2 * Math.PI / segments
  const orbit = 1.1 * LEVEL_RADIUS / Math.sin(angle / 2)
  return {
    angle,
    orbit,
    hubRadius: orbit - 1.2 * LEVEL_RADIUS,
  }
}

function worldComplete(world: GameWorld, completed: Set<string>): boolean {
  return world.levels.every((level) => completed.has(level.id))
}

function worldUnlocked(world: GameWorld, game: LeanGame, completed: Set<string>): boolean {
  return world.prerequisites.every((id) => {
    const prerequisite = getWorld(id, game)
    return prerequisite ? worldComplete(prerequisite, completed) : false
  })
}

function firstIncomplete(world: GameWorld, completed: Set<string>): GameLevel {
  return world.levels.find((level) => !completed.has(level.id)) || world.levels[world.levels.length - 1]
}

function navigateGraph(
  event: MouseEvent<Element>,
  path: string,
  disabled: boolean,
  navigate: (path: string) => void,
) {
  if (disabled || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    if (disabled) event.preventDefault()
    return
  }
  event.preventDefault()
  navigate(path)
}

function RulesControl({
  value,
  onChange,
}: {
  value: GameRules
  onChange: (rules: GameRules) => void
}) {
  const options: Array<{ value: GameRules; label: string; description: string }> = [
    { value: 'regular', label: 'regular', description: 'Lock levels and inventory until earned.' },
    { value: 'relaxed', label: 'relaxed', description: 'Open every level but keep inventory rules.' },
    { value: 'none', label: 'none', description: 'Open levels and disable inventory restrictions.' },
  ]

  return (
    <fieldset className="tree-rules">
      <legend>Rules</legend>
      {options.map((option) => (
        <label key={option.value} title={option.description}>
          <input
            type="radio"
            name="game-rules"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span aria-hidden="true" />
          {option.label}
        </label>
      ))}
    </fieldset>
  )
}

function WorldGraph({
  game,
  completed,
  navigate,
  rules,
}: Required<Pick<Props, 'game' | 'completed' | 'navigate' | 'rules'>>) {
  const positionFor = (world: GameWorld): Point | undefined => (
    world.mapPosition || (game.id === nngGame.id ? NNG_WORLD_POSITIONS[world.id] : undefined)
  )
  const positionedWorlds = game.worlds.filter((world) => positionFor(world))
  const mapHeight = Math.max(500, ...positionedWorlds.map(
    (world) => positionFor(world)?.y || 0,
  )) + 180
  const edges = game.worlds.flatMap((world) => (
    world.prerequisites.map((source) => ({ source, target: world.id }))
  ))
  const titleId = `${game.id}-tree-title`
  const descriptionId = `${game.id}-tree-description`

  return (
    <svg
      className={`nng-world-tree${game.id === nngGame.id ? '' : ' course-world-graph'}`}
      viewBox={`0 0 1000 ${mapHeight}`}
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
    >
      <title id={titleId}>{game.title} world and level tree</title>
      <desc id={descriptionId}>
        {game.worlds.length} connected worlds containing{' '}
        {game.worlds.reduce((sum, world) => sum + world.levels.length, 0)} levels.
      </desc>

      <g className="tree-connections" aria-hidden="true">
        {edges.map(({ source, target }) => {
          const sourceWorld = getWorld(source, game)
          const targetWorld = getWorld(target, game)
          const from = sourceWorld ? positionFor(sourceWorld) : undefined
          const to = targetWorld ? positionFor(targetWorld) : undefined
          if (!from || !to || !sourceWorld) return null
          return (
            <line
              key={`${source}-${target}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className={worldComplete(sourceWorld, completed) ? 'complete' : undefined}
            />
          )
        })}
      </g>

      {game.worlds.map((world) => {
        const position = positionFor(world)
        if (!position) return null
        const shape = geometry(world.levels.length)
        const unlocked = worldUnlocked(world, game, completed)
        const complete = worldComplete(world, completed)
        const disabled = rules === 'regular' && !unlocked && !complete
        const target = firstIncomplete(world, completed)
        const labelY = position.y + shape.orbit + LEVEL_RADIUS + 14

        return (
          <g className="tree-world-group" key={world.id}>
            <a
              href={levelPath(target)}
              className={`tree-world ${complete ? 'complete' : unlocked ? 'unlocked' : 'locked'}${world.optional ? ' optional' : ''}${disabled ? ' disabled' : ''}`}
              aria-disabled={disabled}
              tabIndex={disabled ? -1 : 0}
              onClick={(event) => navigateGraph(event, levelPath(target), disabled, navigate)}
            >
              <title>{world.title}: open {target.title}</title>
              <circle
                className="tree-world-hub"
                cx={position.x}
                cy={position.y}
                r={shape.hubRadius}
              />
              <foreignObject
                x={position.x - 84}
                y={labelY}
                width="168"
                height={world.optional ? 58 : 46}
                className="tree-world-label-wrap"
              >
                <div className="tree-world-label">
                  <span>{world.title}</span>
                  {world.optional && <small>optional path</small>}
                </div>
              </foreignObject>
            </a>

            {world.levels.map((level, index) => {
              const angle = (index + 1) * shape.angle
              const x = position.x + Math.sin(angle) * shape.orbit
              const y = position.y - Math.cos(angle) * shape.orbit
              const levelComplete = completed.has(level.id)
              const levelUnlocked = unlocked && (index === 0 || completed.has(world.levels[index - 1].id))
              const levelDisabled = rules === 'regular' && !levelUnlocked && !levelComplete
              return (
                <a
                  href={levelPath(level)}
                  key={level.id}
                  className={`tree-level ${levelComplete ? 'complete' : levelUnlocked ? 'unlocked' : 'locked'}${levelDisabled ? ' disabled' : ''}`}
                  aria-label={`${world.title}, level ${level.number}: ${level.title}${levelDisabled ? ' (locked)' : ''}`}
                  aria-disabled={levelDisabled}
                  tabIndex={levelDisabled ? -1 : 0}
                  onClick={(event) => navigateGraph(event, levelPath(level), levelDisabled, navigate)}
                >
                  <title>Level {level.number}: {level.title}</title>
                  <circle cx={x} cy={y} r={LEVEL_RADIUS} />
                  <text x={x} y={y} dy="0.35em">{level.number}</text>
                </a>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

type InventoryTab = 'theorems' | 'tactics' | 'definitions'

function inventoryItems(game: LeanGame, tab: InventoryTab): string[] {
  const items = new Set<string>()
  for (const world of game.worlds) {
    for (const level of world.levels) {
      const source = tab === 'tactics'
        ? level.newTactics
        : tab === 'definitions'
          ? level.newDefinitions
          : [...level.newTheorems, ...(level.theoremName ? [level.theoremName] : [])]
      source.forEach((name) => items.add(name.split('.').at(-1) || name))
    }
  }
  return [...items].sort((left, right) => left.localeCompare(right))
}

function unlockedInventory(game: LeanGame, tab: InventoryTab, completed: Set<string>): Set<string> {
  const items = new Set<string>()
  for (const world of game.worlds) {
    for (const level of world.levels) {
      if (!completed.has(level.id)) continue
      const source = tab === 'tactics'
        ? level.newTactics
        : tab === 'definitions'
          ? level.newDefinitions
          : [...level.newTheorems, ...(level.theoremName ? [level.theoremName] : [])]
      source.forEach((name) => items.add(name.split('.').at(-1) || name))
    }
  }
  return items
}

export function GameInventoryOverview({
  game = nngGame,
  completed,
  rules,
}: Pick<Props, 'game' | 'completed' | 'rules'>) {
  const [tab, setTab] = useState<InventoryTab>('tactics')
  const items = useMemo(() => inventoryItems(game, tab), [game, tab])
  const unlocked = useMemo(() => unlockedInventory(game, tab, completed), [completed, game, tab])

  return (
    <aside className="map-inventory" aria-label="Game inventory">
      <div className="map-inventory-tabs" role="tablist" aria-label="Inventory categories">
        {(['theorems', 'tactics', 'definitions'] as const).map((name) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === name}
            className={tab === name ? 'active' : ''}
            onClick={() => setTab(name)}
            key={name}
          >
            {name[0].toUpperCase() + name.slice(1)}
          </button>
        ))}
      </div>
      <div className="map-inventory-list">
        {items.map((item) => {
          const available = rules === 'none' || unlocked.has(item)
          return (
            <span className={available ? 'available' : 'locked'} key={item}>
              {!available && <span aria-hidden="true">🔒</span>}
              {item}
            </span>
          )
        })}
      </div>
    </aside>
  )
}

export function NaturalNumberWorldTree(props: Props) {
  return (
    <section className="game-tree-panel" aria-label="World tree">
      <RulesControl value={props.rules} onChange={props.onRulesChange} />
      <div className="game-tree-scroll">
        <WorldGraph
          game={nngGame}
          completed={props.completed}
          navigate={props.navigate}
          rules={props.rules}
        />
      </div>
    </section>
  )
}

export function CourseWorldTree({
  game,
  completed,
  navigate,
  rules,
  onRulesChange,
}: Required<Pick<Props, 'game' | 'completed' | 'navigate' | 'rules' | 'onRulesChange'>>) {
  const hasGraphLayout = game.worlds.every((world) => world.mapPosition)
  return (
    <section className="game-tree-panel course-tree-panel" aria-label={`${game.title} world tree`}>
      <div className="course-tree-toolbar">
        <div>
          <strong>Full course tree</strong>
          <span>{game.worlds.length} worlds · {game.worlds.reduce((sum, world) => sum + world.levels.length, 0)} levels</span>
        </div>
        <RulesControl value={rules} onChange={onRulesChange} />
      </div>
      {hasGraphLayout ? (
        <div className="game-tree-scroll">
          <WorldGraph game={game} completed={completed} navigate={navigate} rules={rules} />
        </div>
      ) : (
        <div className="course-world-grid">
          {game.worlds.map((world, index) => {
          const unlocked = worldUnlocked(world, game, completed)
          const complete = worldComplete(world, completed)
          const disabled = rules === 'regular' && !unlocked && !complete
          const target = firstIncomplete(world, completed)
          const done = world.levels.filter((level) => completed.has(level.id)).length
          return (
            <article
              className={`course-world-card ${complete ? 'complete' : unlocked ? 'unlocked' : 'locked'}`}
              key={world.id}
            >
              <div className="course-world-index">{String(index + 1).padStart(2, '0')}</div>
              <div className="course-world-copy">
                <a
                  href={levelPath(target)}
                  aria-disabled={disabled}
                  onClick={(event) => navigateGraph(event, levelPath(target), disabled, navigate)}
                >
                  <strong>{world.title}</strong>
                  <span>{done}/{world.levels.length} complete</span>
                </a>
                {world.prerequisites.length > 0 && (
                  <p>
                    after {world.prerequisites.map((id) => getWorld(id, game)?.title || id).join(' · ')}
                  </p>
                )}
                <div className="course-level-dots" aria-label={`${world.levels.length} levels`}>
                  {world.levels.map((level, levelIndex) => {
                    const levelComplete = completed.has(level.id)
                    const levelUnlocked = unlocked && (
                      levelIndex === 0 || completed.has(world.levels[levelIndex - 1].id)
                    )
                    const levelDisabled = rules === 'regular' && !levelUnlocked && !levelComplete
                    return (
                      <a
                        href={levelPath(level)}
                        key={level.id}
                        className={levelComplete ? 'complete' : levelUnlocked ? 'unlocked' : 'locked'}
                        aria-label={`${world.title}, level ${level.number}: ${level.title}${levelDisabled ? ' (locked)' : ''}`}
                        aria-disabled={levelDisabled}
                        onClick={(event) => navigateGraph(
                          event,
                          levelPath(level),
                          levelDisabled,
                          navigate,
                        )}
                      >
                        {levelComplete ? '✓' : level.number}
                      </a>
                    )
                  })}
                </div>
              </div>
            </article>
          )
          })}
        </div>
      )}
    </section>
  )
}
