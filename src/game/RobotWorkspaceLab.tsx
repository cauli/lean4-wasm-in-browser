import { useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import './RobotWorkspaceLab.css'

export type RobotWorkspaceFocus = 'overview' | 'outer' | 'inner' | 'annulus' | 'unreachable'

interface Props {
  focus?: RobotWorkspaceFocus
  compact?: boolean
  allowThreeLinks?: boolean
}

interface Point {
  x: number
  y: number
}

interface ArmPose {
  points: Point[]
}

const CENTER = { x: 360, y: 220 }
const TAU = Math.PI * 2

function polar(radius: number, angle: number): Point {
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) }
}

function norm(point: Point): number {
  return Math.hypot(point.x, point.y)
}

function defaultTarget(focus: RobotWorkspaceFocus): Point {
  if (focus === 'inner') return polar(0.55, 0.34)
  if (focus === 'outer' || focus === 'unreachable') return polar(3.35, 0.34)
  return polar(2.2, 0.38)
}

function twoLinkPoses(firstLength: number, secondLength: number, target: Point): ArmPose[] {
  const radius = norm(target)
  const inner = Math.abs(firstLength - secondLength)
  const outer = firstLength + secondLength
  if (radius < inner - 1e-8 || radius > outer + 1e-8) return []
  if (radius < 1e-8) {
    if (inner > 1e-8) return []
    return [1, -1].map((direction) => ({
      points: [
        { x: 0, y: 0 },
        { x: direction * firstLength, y: 0 },
        target,
      ],
    }))
  }

  const cosine = Math.max(-1, Math.min(1,
    (radius * radius - firstLength * firstLength - secondLength * secondLength)
      / (2 * firstLength * secondLength),
  ))
  const elbowAngle = Math.acos(cosine)
  const targetAngle = Math.atan2(target.y, target.x)

  return [1, -1].map((sign) => {
    const relativeAngle = sign * elbowAngle
    const shoulderAngle = targetAngle - Math.atan2(
      secondLength * Math.sin(relativeAngle),
      firstLength + secondLength * Math.cos(relativeAngle),
    )
    const elbow = polar(firstLength, shoulderAngle)
    return { points: [{ x: 0, y: 0 }, elbow, target] }
  })
}

function threeLinkPoseFamily(
  firstLength: number,
  secondLength: number,
  thirdLength: number,
  target: Point,
): ArmPose[] {
  const poses: ArmPose[] = []
  const samples = 180
  for (let index = 0; index < samples; index += 1) {
    const thirdAngle = (index / samples) * TAU
    const thirdVector = polar(thirdLength, thirdAngle)
    const wrist = { x: target.x - thirdVector.x, y: target.y - thirdVector.y }
    for (const pose of twoLinkPoses(firstLength, secondLength, wrist)) {
      poses.push({ points: [...pose.points, target] })
    }
  }
  return poses
}

function workspaceBounds(lengths: number[]): { inner: number; outer: number } {
  const outer = lengths.reduce((sum, length) => sum + length, 0)
  const longest = Math.max(...lengths)
  return { inner: Math.max(0, 2 * longest - outer), outer }
}

function annulusPath(outer: number, inner: number): string {
  const outerPart = [
    `M ${CENTER.x - outer} ${CENTER.y}`,
    `a ${outer} ${outer} 0 1 0 ${2 * outer} 0`,
    `a ${outer} ${outer} 0 1 0 ${-2 * outer} 0`,
  ]
  if (inner < 0.01) return outerPart.join(' ')
  return [
    ...outerPart,
    `M ${CENTER.x - inner} ${CENTER.y}`,
    `a ${inner} ${inner} 0 1 0 ${2 * inner} 0`,
    `a ${inner} ${inner} 0 1 0 ${-2 * inner} 0`,
  ].join(' ')
}

function screenPoint(point: Point, scale: number): Point {
  return { x: CENTER.x + point.x * scale, y: CENTER.y - point.y * scale }
}

function pointList(pose: ArmPose, scale: number): string {
  return pose.points.map((point) => {
    const screen = screenPoint(point, scale)
    return `${screen.x},${screen.y}`
  }).join(' ')
}

function focusCaption(focus: RobotWorkspaceFocus): string {
  if (focus === 'outer') return 'Outer limit'
  if (focus === 'inner') return 'Folded gap'
  if (focus === 'annulus') return 'Every pose stays in the ring'
  if (focus === 'unreachable') return 'Outside the ring'
  return 'Reachability lab'
}

export function RobotWorkspaceLab({
  focus = 'overview',
  compact = false,
  allowThreeLinks = false,
}: Props) {
  const controlId = useId()
  const [jointCount, setJointCount] = useState<2 | 3>(2)
  const [firstLength, setFirstLength] = useState(2)
  const [secondLength, setSecondLength] = useState(1)
  const [thirdLength, setThirdLength] = useState(1)
  const [target, setTarget] = useState(() => defaultTarget(focus))
  const [familyPosition, setFamilyPosition] = useState(0.34)
  const dragging = useRef(false)

  const lengths = jointCount === 3
    ? [firstLength, secondLength, thirdLength]
    : [firstLength, secondLength]
  const bounds = workspaceBounds(lengths)
  const targetRadius = norm(target)
  const targetAngle = Math.atan2(target.y, target.x)
  const reachable = targetRadius >= bounds.inner - 1e-8 && targetRadius <= bounds.outer + 1e-8
  const viewRadius = Math.max(bounds.outer * 1.16, targetRadius * 1.08, 1)
  const scale = 180 / viewRadius
  const targetScreen = screenPoint(target, scale)
  const innerPixels = bounds.inner * scale
  const outerPixels = bounds.outer * scale

  const twoPoses = useMemo(
    () => twoLinkPoses(firstLength, secondLength, target),
    [firstLength, secondLength, target],
  )
  const threePoses = useMemo(
    () => jointCount === 3
      ? threeLinkPoseFamily(firstLength, secondLength, thirdLength, target)
      : [],
    [firstLength, jointCount, secondLength, target, thirdLength],
  )
  const selectedThreePose = threePoses.length > 0
    ? threePoses[Math.min(threePoses.length - 1, Math.round(familyPosition * (threePoses.length - 1)))]
    : undefined
  const ghostStride = Math.max(1, Math.floor(threePoses.length / 18))
  const ghostPoses = threePoses.filter((_, index) => index % ghostStride === 0).slice(0, 18)
  const onBoundary = reachable && (
    Math.abs(targetRadius - bounds.inner) < 0.035
      || Math.abs(targetRadius - bounds.outer) < 0.035
  )

  const status = (() => {
    if (targetRadius > bounds.outer + 1e-8) {
      return `Unreachable: ${targetRadius.toFixed(2)} is beyond the outer limit ${bounds.outer.toFixed(2)}.`
    }
    if (targetRadius < bounds.inner - 1e-8) {
      return `Unreachable: ${targetRadius.toFixed(2)} lies inside the folded gap ${bounds.inner.toFixed(2)}.`
    }
    if (jointCount === 3) {
      return 'Reachable: the extra joint gives a continuous family of poses with the same tip.'
    }
    if (onBoundary) {
      return 'Reachable but singular: the two poses meet and the endpoint loses one direction of motion.'
    }
    return 'Reachable: the target has two configurations.'
  })()

  const setTargetPolar = (radius: number, angle: number) => {
    setTarget(polar(radius, angle))
  }

  const updateTargetFromPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const boundsRect = event.currentTarget.getBoundingClientRect()
    const svgX = (event.clientX - boundsRect.left) * (720 / boundsRect.width)
    const svgY = (event.clientY - boundsRect.top) * (440 / boundsRect.height)
    const nextTarget = { x: (svgX - CENTER.x) / scale, y: (CENTER.y - svgY) / scale }
    const nextRadius = norm(nextTarget)
    setTarget(nextRadius > 7
      ? { x: nextTarget.x * 7 / nextRadius, y: nextTarget.y * 7 / nextRadius }
      : nextTarget)
  }

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    dragging.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    updateTargetFromPointer(event)
  }

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragging.current) updateTargetFromPointer(event)
  }

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    dragging.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <section className={`robot-workspace-lab${compact ? ' robot-workspace-lab-compact' : ''}`}>
      <header className="robot-workspace-heading">
        <div>
          <span>{focusCaption(focus)}</span>
          <strong>{jointCount === 2 ? 'Two-link arm' : 'Three-link outlook'}</strong>
        </div>
        {allowThreeLinks && (
          <div className="robot-joint-switch" aria-label="Number of links">
            <button type="button" aria-pressed={jointCount === 2} onClick={() => setJointCount(2)}>
              Two links
            </button>
            <button type="button" aria-pressed={jointCount === 3} onClick={() => setJointCount(3)}>
              Three links
            </button>
          </div>
        )}
      </header>

      <div className="robot-workspace-controls">
        <label htmlFor={`${controlId}-first-link`}>
          <span>First link <output aria-hidden="true">{firstLength.toFixed(1)}</output></span>
          <input id={`${controlId}-first-link`} type="range" min="0.5" max="3" step="0.1" value={firstLength}
            onChange={(event) => setFirstLength(Number(event.target.value))} />
        </label>
        <label htmlFor={`${controlId}-second-link`}>
          <span>Second link <output aria-hidden="true">{secondLength.toFixed(1)}</output></span>
          <input id={`${controlId}-second-link`} type="range" min="0.5" max="3" step="0.1" value={secondLength}
            onChange={(event) => setSecondLength(Number(event.target.value))} />
        </label>
        {jointCount === 3 && (
          <label htmlFor={`${controlId}-third-link`}>
            <span>Third link <output aria-hidden="true">{thirdLength.toFixed(1)}</output></span>
            <input id={`${controlId}-third-link`} type="range" min="0.5" max="3" step="0.1" value={thirdLength}
              onChange={(event) => setThirdLength(Number(event.target.value))} />
          </label>
        )}
        <label htmlFor={`${controlId}-target-radius`}>
          <span>Target radius <output aria-hidden="true">{targetRadius.toFixed(2)}</output></span>
          <input id={`${controlId}-target-radius`} type="range" min="0" max="7" step="0.02" value={Math.min(7, targetRadius)}
            onChange={(event) => setTargetPolar(Number(event.target.value), targetAngle)} />
        </label>
        <label htmlFor={`${controlId}-target-angle`}>
          <span>Target angle <output aria-hidden="true">{Math.round(targetAngle * 180 / Math.PI)}°</output></span>
          <input id={`${controlId}-target-angle`} type="range" min="-180" max="180" step="1" value={targetAngle * 180 / Math.PI}
            onChange={(event) => setTargetPolar(targetRadius, Number(event.target.value) * Math.PI / 180)} />
        </label>
        {jointCount === 3 && threePoses.length > 0 && (
          <label htmlFor={`${controlId}-fiber-position`}>
            <span>Pose along the fiber</span>
            <input id={`${controlId}-fiber-position`} type="range" min="0" max="1" step="0.01" value={familyPosition}
              onChange={(event) => setFamilyPosition(Number(event.target.value))} />
          </label>
        )}
      </div>

      <svg
        className="robot-workspace-plot"
        viewBox="0 0 720 440"
        role="img"
        aria-label={`${jointCount}-link robot workspace. ${status}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { dragging.current = false }}
      >
        <line className="robot-workspace-axis" x1="68" y1={CENTER.y} x2="652" y2={CENTER.y} />
        <line className="robot-workspace-axis" x1={CENTER.x} y1="25" x2={CENTER.x} y2="415" />
        <path className="robot-workspace-region" d={annulusPath(outerPixels, innerPixels)} />
        <circle
          className={`robot-workspace-boundary${focus === 'outer' ? ' is-focused' : ''}`}
          cx={CENTER.x}
          cy={CENTER.y}
          r={outerPixels}
        />
        {innerPixels > 0.01 && (
          <circle
            className={`robot-workspace-boundary${focus === 'inner' ? ' is-focused' : ''}`}
            cx={CENTER.x}
            cy={CENTER.y}
            r={innerPixels}
          />
        )}

        {jointCount === 2 && twoPoses.map((pose, index) => (
          <g className={`robot-arm-pose robot-arm-pose-${index + 1}`} key={index}>
            <polyline points={pointList(pose, scale)} />
            <circle cx={screenPoint(pose.points[1], scale).x} cy={screenPoint(pose.points[1], scale).y} r="6" />
          </g>
        ))}

        {jointCount === 3 && ghostPoses.map((pose, index) => (
          <polyline className="robot-arm-family-pose" points={pointList(pose, scale)} key={index} />
        ))}
        {jointCount === 3 && selectedThreePose && (
          <g className="robot-arm-pose robot-arm-pose-3">
            <polyline points={pointList(selectedThreePose, scale)} />
            {selectedThreePose.points.slice(1, -1).map((point, index) => {
              const screen = screenPoint(point, scale)
              return <circle cx={screen.x} cy={screen.y} r="6" key={index} />
            })}
          </g>
        )}

        <circle className="robot-workspace-base" cx={CENTER.x} cy={CENTER.y} r="5" />
        <g className="robot-workspace-target" transform={`translate(${targetScreen.x} ${targetScreen.y})`}>
          <circle r="14" />
          <circle r="7" />
        </g>
        <text className="robot-workspace-label" x={CENTER.x + outerPixels + 7} y={CENTER.y - 8}>
          outer {bounds.outer.toFixed(1)}
        </text>
        {innerPixels > 0.01 && (
          <text className="robot-workspace-label" x={CENTER.x + innerPixels + 7} y={CENTER.y + 17}>
            inner {bounds.inner.toFixed(1)}
          </text>
        )}
      </svg>

      <footer className={`robot-workspace-status${reachable ? '' : ' is-unreachable'}`} aria-live="polite">
        <strong>{reachable ? 'Reachable' : 'Unreachable'}</strong>
        <span>{status.replace(/^(Reachable|Unreachable)( but singular)?:\s*/, '')}</span>
      </footer>
      <p className="robot-workspace-help">
        Drag the target on the plot or use the target sliders.
      </p>
    </section>
  )
}

export default RobotWorkspaceLab
