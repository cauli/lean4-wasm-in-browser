import { useId, useState, type PointerEvent as ReactPointerEvent } from 'react'
import './ConceptLab.css'

/**
 * Which part of the story a level page wants in front:
 * - `pole`: the projected mark runs off the leaf as Ada nears the pole
 * - `antipode`: the point opposite the pole lands at the origin
 * - `cover`: both leaves together show every point
 * - `transition`: the two readings of one point multiply to four
 */
export type StereographicFocus = 'overview' | 'pole' | 'antipode' | 'cover' | 'transition'

interface Props {
  focus?: StereographicFocus
  compact?: boolean
}

type LeafChoice = 'north' | 'south' | 'both'

const WIDTH = 720
const HEIGHT = 420
const CENTER = { x: 360, y: 200 }
const RADIUS = 120
const LEAF_HALF = 330
const OFFSCREEN = 1e6

function screen(x: number, y: number) {
  return { x: CENTER.x + x * RADIUS, y: CENTER.y - y * RADIUS }
}

/**
 * Stereographic projection of the unit circle, with Mathlib's normalisation:
 * `stereographic` sends x to (2 / (1 - ⟪pole, x⟫)) times its projection onto
 * the line orthogonal to the pole. From the north pole (0, 1) a point (x, y)
 * therefore reads 2x / (1 - y); from the south pole, 2x / (1 + y). The two
 * readings of one point multiply to 4, which is the transition map between
 * the two charts: r ↦ 4 / r.
 */
function project(angle: number, pole: 'north' | 'south'): number {
  const x = Math.cos(angle)
  const y = Math.sin(angle)
  const denominator = pole === 'north' ? 1 - y : 1 + y
  if (Math.abs(denominator) < 1e-9) return Number.POSITIVE_INFINITY * Math.sign(x || 1)
  return 2 * x / denominator
}

function formatReading(value: number): string {
  if (!Number.isFinite(value)) return 'no mark'
  if (Math.abs(value) > 999) return `${value > 0 ? '' : '-'}∞`
  return value.toFixed(2)
}

function defaultAngle(focus: StereographicFocus): number {
  if (focus === 'pole') return 1.15
  if (focus === 'antipode') return -Math.PI / 2
  if (focus === 'transition') return 0.55
  return 0.7
}

function defaultLeaf(focus: StereographicFocus): LeafChoice {
  if (focus === 'pole' || focus === 'antipode') return 'north'
  return 'both'
}

function focusCaption(focus: StereographicFocus): string {
  if (focus === 'pole') return 'The pole has no mark'
  if (focus === 'antipode') return 'The far pole lands in the middle'
  if (focus === 'cover') return 'Two leaves cover the bead'
  if (focus === 'transition') return 'One point, two readings'
  return 'Projection lab'
}

export function StereographicLab({ focus = 'overview', compact = false }: Props) {
  const controlId = useId()
  const [angle, setAngle] = useState(() => defaultAngle(focus))
  const [leaf, setLeaf] = useState<LeafChoice>(() => defaultLeaf(focus))
  const [dragging, setDragging] = useState(false)

  const point = { x: Math.cos(angle), y: Math.sin(angle) }
  const pointScreen = screen(point.x, point.y)
  const northReading = project(angle, 'north')
  const southReading = project(angle, 'south')
  const showNorth = leaf !== 'south'
  const showSouth = leaf !== 'north'
  const atNorth = Math.abs(angle - Math.PI / 2) < 0.02
  const atSouth = Math.abs(angle + Math.PI / 2) < 0.02
  const product = Number.isFinite(northReading) && Number.isFinite(southReading)
    ? northReading * southReading
    : Number.NaN

  const status = (() => {
    if (atNorth) {
      return 'Ada stands on the north pole. The north leaf has no mark for her, and only the south leaf shows her, at the origin.'
    }
    if (atSouth) {
      return 'Ada stands on the south pole. The south leaf has no mark for her, and only the north leaf shows her, at the origin.'
    }
    if (Math.abs(northReading) > 6 || Math.abs(southReading) > 6) {
      return 'Ada is close to a pole. On that leaf her mark has run far off the drawing; on the other leaf it sits near the origin.'
    }
    if (focus === 'transition' || leaf === 'both') {
      return "Away from both poles she has two readings. Their product is 4 with Mathlib's scaling: reading the north leaf into the south leaf is the map x ↦ 4/x, a smooth map wherever both readings exist."
    }
    return 'Drag Ada around the bead. The dashed ray from the pole through her position meets the leaf at her mark.'
  })()

  const updateFromPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const svgX = (event.clientX - rect.left) * (WIDTH / rect.width)
    const svgY = (event.clientY - rect.top) * (HEIGHT / rect.height)
    setAngle(Math.atan2(CENTER.y - svgY, svgX - CENTER.x))
  }

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    updateFromPointer(event)
  }
  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragging) updateFromPointer(event)
  }
  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const north = screen(0, 1)
  const south = screen(0, -1)
  const leafY = CENTER.y
  const leafLeft = CENTER.x - LEAF_HALF
  const leafRight = CENTER.x + LEAF_HALF

  const markX = (reading: number) => {
    if (!Number.isFinite(reading)) return reading > 0 ? OFFSCREEN : -OFFSCREEN
    return CENTER.x + reading * RADIUS / 2
  }
  const rayEnd = (pole: { x: number; y: number }, reading: number) => {
    // Extend the ray from the pole through Ada to the leaf line, clipped to
    // the drawing so a far-off mark still shows its direction.
    const target = { x: markX(reading), y: leafY }
    const dx = target.x - pole.x
    const dy = target.y - pole.y
    const limit = Math.max(1, Math.abs(dx) / (LEAF_HALF + 20))
    return { x: pole.x + dx / limit, y: pole.y + dy / limit }
  }

  const sourceArc = (pole: 'north' | 'south') => {
    // The chart source is the circle minus its pole: draw the arc that starts
    // and ends just beside that pole. The north source sits just outside the
    // bead and the south source just inside, so both stay visible together.
    const gap = 0.16
    const radius = pole === 'north' ? RADIUS + 7 : RADIUS - 7
    const start = pole === 'north' ? Math.PI / 2 + gap : -Math.PI / 2 + gap
    const end = start + 2 * Math.PI - 2 * gap
    const from = { x: CENTER.x + radius * Math.cos(start), y: CENTER.y - radius * Math.sin(start) }
    const to = { x: CENTER.x + radius * Math.cos(end), y: CENTER.y - radius * Math.sin(end) }
    return `M ${from.x} ${from.y} A ${radius} ${radius} 0 1 0 ${to.x} ${to.y}`
  }

  return (
    <section className={`concept-lab stereographic-lab${compact ? ' concept-lab-compact' : ''}`}>
      <header className="concept-lab-heading">
        <div>
          <span>{focusCaption(focus)}</span>
          <strong>Stereographic projection of a circle</strong>
        </div>
        <div className="concept-lab-switch" aria-label="Which leaf to draw">
          <button type="button" aria-pressed={leaf === 'north'} onClick={() => setLeaf('north')}>North leaf</button>
          <button type="button" aria-pressed={leaf === 'south'} onClick={() => setLeaf('south')}>South leaf</button>
          <button type="button" aria-pressed={leaf === 'both'} onClick={() => setLeaf('both')}>Both</button>
        </div>
      </header>

      <div className="concept-lab-controls">
        <label htmlFor={`${controlId}-angle`}>
          <span>Ada's position on the bead <output aria-hidden="true">{Math.round(angle * 180 / Math.PI)}°</output></span>
          <input
            id={`${controlId}-angle`}
            type="range"
            min="-180"
            max="180"
            step="1"
            value={Math.round(angle * 180 / Math.PI)}
            onChange={(event) => setAngle(Number(event.target.value) * Math.PI / 180)}
          />
        </label>
        <div className="concept-lab-controls-buttons">
          <button type="button" onClick={() => setAngle(Math.PI / 2 - 0.08)}>Walk near the north pole</button>
          {' '}
          <button type="button" onClick={() => setAngle(-Math.PI / 2)}>Stand on the south pole</button>
        </div>
      </div>

      <svg
        className={`concept-lab-plot${dragging ? ' is-dragging' : ''}`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Stereographic projection lab. ${status}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setDragging(false)}
      >
        <line className="concept-lab-axis" x1={CENTER.x} y1="24" x2={CENTER.x} y2={HEIGHT - 24} />
        <line className="stereo-leaf" x1={leafLeft} y1={leafY} x2={leafRight} y2={leafY} />
        <text className="concept-lab-label" x={leafRight - 4} y={leafY + 16} textAnchor="end">the leaf</text>
        <circle className="stereo-sphere" cx={CENTER.x} cy={CENTER.y} r={RADIUS} />
        {showNorth && <path className="stereo-source is-north" d={sourceArc('north')} />}
        {showSouth && <path className="stereo-source is-south" d={sourceArc('south')} />}

        {showNorth && !atNorth && (
          <line className="stereo-ray is-north" x1={north.x} y1={north.y} x2={rayEnd(north, northReading).x} y2={rayEnd(north, northReading).y} />
        )}
        {showSouth && !atSouth && (
          <line className="stereo-ray is-south" x1={south.x} y1={south.y} x2={rayEnd(south, southReading).x} y2={rayEnd(south, southReading).y} />
        )}

        {showNorth && Number.isFinite(northReading) && Math.abs(markX(northReading) - CENTER.x) <= LEAF_HALF && (
          <circle className="stereo-mark is-north" cx={markX(northReading)} cy={leafY} r="6" />
        )}
        {showNorth && (!Number.isFinite(northReading) || Math.abs(markX(northReading) - CENTER.x) > LEAF_HALF) && !atNorth && (
          <text className="stereo-offscreen" x={northReading > 0 ? leafRight - 6 : leafLeft + 6} y={leafY - 10} textAnchor={northReading > 0 ? 'end' : 'start'}>
            north mark far off the leaf {northReading > 0 ? '→' : '←'}
          </text>
        )}
        {showSouth && Number.isFinite(southReading) && Math.abs(markX(southReading) - CENTER.x) <= LEAF_HALF && (
          <circle className="stereo-mark is-south" cx={markX(southReading)} cy={leafY} r="6" />
        )}
        {showSouth && (!Number.isFinite(southReading) || Math.abs(markX(southReading) - CENTER.x) > LEAF_HALF) && !atSouth && (
          <text className="stereo-offscreen" style={{ fill: '#12808a' }} x={southReading > 0 ? leafRight - 6 : leafLeft + 6} y={leafY + 28} textAnchor={southReading > 0 ? 'end' : 'start'}>
            south mark far off the leaf {southReading > 0 ? '→' : '←'}
          </text>
        )}

        <circle className="stereo-pole is-north" cx={north.x} cy={north.y} r="6" />
        <text className="concept-lab-label" x={north.x + 10} y={north.y - 6}>north pole</text>
        <circle className="stereo-pole is-south" cx={south.x} cy={south.y} r="6" />
        <text className="concept-lab-label" x={south.x + 10} y={south.y + 16}>south pole</text>

        <g className="stereo-ada">
          <circle cx={pointScreen.x} cy={pointScreen.y} r="14" />
          <circle cx={pointScreen.x} cy={pointScreen.y} r="6" />
        </g>
        <text className="concept-lab-label is-strong" x={pointScreen.x + 12} y={pointScreen.y + 4}>Ada</text>
      </svg>

      <div className="concept-lab-readout">
        <div><span>North leaf reading</span><output>{atNorth ? 'no mark' : formatReading(northReading)}</output></div>
        <div><span>South leaf reading</span><output>{atSouth ? 'no mark' : formatReading(southReading)}</output></div>
        <div><span>Product of the two</span><output>{Number.isFinite(product) ? product.toFixed(2) : 'undefined'}</output></div>
      </div>
      <p className="concept-lab-status" aria-live="polite">{status}</p>
    </section>
  )
}

export default StereographicLab
