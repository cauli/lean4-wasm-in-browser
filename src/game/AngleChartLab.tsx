import { useId, useState } from 'react'
import './ConceptLab.css'

/**
 * - `turns`: the same pointer position under angles a whole turn apart
 * - `charts`: two arcs of the dial, each read by its own angle, and the
 *   overlap where the two readings differ by a fixed shift
 */
export type AngleChartFocus = 'overview' | 'turns' | 'charts'

interface Props {
  focus?: AngleChartFocus
  compact?: boolean
}

const WIDTH = 720
const HEIGHT = 420
const DIAL = { x: 200, y: 200 }
const RADIUS = 120
const LINE = { left: 400, right: 690, y: 200 }
const TAU = Math.PI * 2
const LINE_MIN = -TAU
const LINE_MAX = 2 * TAU

function onDial(angle: number) {
  return { x: DIAL.x + RADIUS * Math.cos(angle), y: DIAL.y - RADIUS * Math.sin(angle) }
}

function onLine(angle: number) {
  return LINE.left + (angle - LINE_MIN) / (LINE_MAX - LINE_MIN) * (LINE.right - LINE.left)
}

/** Reduce an angle into the half-open window (base, base + 2π]. */
function readingIn(angle: number, base: number): number {
  let value = angle
  while (value <= base) value += TAU
  while (value > base + TAU) value -= TAU
  return value
}

// The amber arc rides just outside the dial and the teal arc just inside, so
// the long overlap of the two charts stays readable as two bands.
function arcPath(from: number, to: number, radius: number): string {
  const at = (angle: number) => ({ x: DIAL.x + radius * Math.cos(angle), y: DIAL.y - radius * Math.sin(angle) })
  const start = at(from)
  const end = at(to)
  const large = to - from > Math.PI ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 0 ${end.x} ${end.y}`
}

function formatTurns(angle: number): string {
  return `${(angle / Math.PI).toFixed(2)}π`
}

function focusCaption(focus: AngleChartFocus): string {
  if (focus === 'turns') return 'A full turn changes nothing'
  if (focus === 'charts') return 'Two arcs, two angle charts'
  return 'Angle lab'
}

export function AngleChartLab({ focus = 'overview', compact = false }: Props) {
  const controlId = useId()
  const [angle, setAngle] = useState(focus === 'charts' ? 2.6 : 0.9)

  const point = onDial(angle)
  // Chart one reads angles in (-π, π]; the missing point of its arc is the
  // west point of the dial. Chart two reads (0, 2π]; its missing point is
  // east. Both arcs are drawn slightly short of their missing point.
  const firstReading = readingIn(angle, -Math.PI)
  const secondReading = readingIn(angle, 0)
  const inFirst = Math.abs(firstReading - Math.PI) > 0.02
  const inSecond = Math.abs(secondReading - TAU) > 0.02
  const inOverlap = inFirst && inSecond
  const shift = secondReading - firstReading
  const turns = Math.round((angle - firstReading) / TAU)

  const status = (() => {
    if (focus === 'charts' || focus === 'overview') {
      if (!inFirst) return 'The pointer sits on the point the amber chart cannot read. Only the teal chart has a reading here.'
      if (!inSecond) return 'The pointer sits on the point the teal chart cannot read. Only the amber chart has a reading here.'
      return shift === 0
        ? 'On this part of the overlap both charts agree. The transition map between them is the identity here.'
        : 'On this part of the overlap the two readings differ by exactly 2π. The transition map between the charts is a shift by 2π, which is smooth.'
    }
    return turns === 0
      ? 'The angle and the pointer agree. Add a full turn and watch the pointer stay put while the angle moves.'
      : `The angle has moved by ${turns > 0 ? '+' : ''}${turns} full turn${Math.abs(turns) === 1 ? '' : 's'}, and the pointer has not moved at all. Circle.exp forgets whole turns.`
  })()

  return (
    <section className={`concept-lab angle-chart-lab${compact ? ' concept-lab-compact' : ''}`}>
      <header className="concept-lab-heading">
        <div>
          <span>{focusCaption(focus)}</span>
          <strong>Angles on a dial</strong>
        </div>
      </header>

      <div className="concept-lab-controls">
        <label htmlFor={`${controlId}-angle`}>
          <span>Angle fed to Circle.exp <output aria-hidden="true">{formatTurns(angle)}</output></span>
          <input
            id={`${controlId}-angle`}
            type="range"
            min="-6.28"
            max="12.56"
            step="0.01"
            value={angle}
            onChange={(event) => setAngle(Number(event.target.value))}
          />
        </label>
        <div className="concept-lab-controls-buttons">
          <button type="button" onClick={() => setAngle((value) => Math.min(LINE_MAX, value + TAU))}>Add a full turn</button>
          {' '}
          <button type="button" onClick={() => setAngle((value) => Math.max(LINE_MIN, value - TAU))}>Remove a full turn</button>
        </div>
      </div>

      <svg
        className="concept-lab-plot"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Angle chart lab. ${status}`}
      >
        <circle className="angle-circle" cx={DIAL.x} cy={DIAL.y} r={RADIUS} />
        {focus !== 'turns' && (
          <>
            <path className="angle-arc is-first" d={arcPath(-Math.PI + 0.12, Math.PI - 0.12, RADIUS + 8)} />
            <circle className="angle-arc-gap is-first" cx={onDial(Math.PI).x} cy={onDial(Math.PI).y} r="5" />
            <path className="angle-arc is-second" d={arcPath(0.12, TAU - 0.12, RADIUS - 8)} />
            <circle className="angle-arc-gap is-second" cx={onDial(0).x} cy={onDial(0).y} r="5" />
            <text className="concept-lab-label" x={DIAL.x - RADIUS - 8} y={DIAL.y - 6} textAnchor="end">amber chart</text>
            <text className="concept-lab-label" x={DIAL.x - RADIUS - 8} y={DIAL.y + 10} textAnchor="end">cannot read</text>
            <text className="concept-lab-label" x={DIAL.x + RADIUS + 8} y={DIAL.y - 6}>teal chart</text>
            <text className="concept-lab-label" x={DIAL.x + RADIUS + 8} y={DIAL.y + 10}>cannot read</text>
          </>
        )}
        <line className="angle-pointer" x1={DIAL.x} y1={DIAL.y} x2={point.x} y2={point.y} />
        <g className="angle-point">
          <circle cx={point.x} cy={point.y} r="14" />
          <circle cx={point.x} cy={point.y} r="6" />
        </g>
        <text className="concept-lab-label" x={DIAL.x} y={DIAL.y + RADIUS + 28} textAnchor="middle">the dial: Circle</text>

        <line className="angle-line" x1={LINE.left} y1={LINE.y} x2={LINE.right} y2={LINE.y} />
        {[-TAU, -Math.PI, 0, Math.PI, TAU, 3 * Math.PI, 2 * TAU].map((tick) => (
          <g key={tick}>
            <line className="angle-tick" x1={onLine(tick)} y1={LINE.y - 6} x2={onLine(tick)} y2={LINE.y + 6} />
            <text className="concept-lab-label" x={onLine(tick)} y={LINE.y + 22} textAnchor="middle">
              {tick === 0 ? '0' : `${tick / Math.PI}π`}
            </text>
          </g>
        ))}
        {[-2, -1, 1, 2].map((turn) => {
          const ghost = angle + turn * TAU
          if (ghost < LINE_MIN || ghost > LINE_MAX) return null
          return <circle className="angle-line-point is-ghost" cx={onLine(ghost)} cy={LINE.y} r="5" key={turn} />
        })}
        <circle className="angle-line-point" cx={onLine(angle)} cy={LINE.y} r="6" />
        <text className="concept-lab-label" x={(LINE.left + LINE.right) / 2} y={LINE.y - 40} textAnchor="middle">the angle line: ℝ</text>
        <text className="concept-lab-label" x={(LINE.left + LINE.right) / 2} y={LINE.y - 24} textAnchor="middle">pale dots are the other angles with the same pointer</text>
      </svg>

      <div className="concept-lab-readout">
        {focus === 'turns' ? (
          <>
            <div><span>Angle</span><output>{formatTurns(angle)}</output></div>
            <div><span>Pointer position</span><output>({Math.cos(angle).toFixed(2)}, {Math.sin(angle).toFixed(2)})</output></div>
            <div><span>Whole turns hidden</span><output>{turns}</output></div>
          </>
        ) : (
          <>
            <div><span>Amber chart reading</span><output>{inFirst ? formatTurns(firstReading) : 'none'}</output></div>
            <div><span>Teal chart reading</span><output>{inSecond ? formatTurns(secondReading) : 'none'}</output></div>
            <div><span>Difference on overlap</span><output>{inOverlap ? formatTurns(shift) : 'not in overlap'}</output></div>
          </>
        )}
      </div>
      <p className="concept-lab-status" aria-live="polite">{status}</p>
    </section>
  )
}

export default AngleChartLab
