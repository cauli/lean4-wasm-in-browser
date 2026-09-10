import { useEffect, useId, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import './ConceptLab.css'
import './ManifoldObjectLab.css'

/**
 * - `inclusion`: Ada's place on the bead is also a vector of the room
 * - `velocity`: the velocity of a great-circle walk, drawn in the room
 * - `plane`: every velocity lies in the plane perpendicular to the radius
 */
export type TangentPlaneFocus = 'overview' | 'inclusion' | 'velocity' | 'plane'

interface Props {
  focus?: TangentPlaneFocus
  compact?: boolean
}

interface SceneHandles {
  setPlace: (place: THREE.Vector3) => void
  setDirection: (radians: number) => void
}

const PLACE_COLOR = 0xc13d70
const PLANE_COLOR = 0x1976d2
const VELOCITY_COLOR = 0xc46620
const RADIUS_COLOR = 0x39885a

/** An orthonormal pair spanning the tangent plane at a unit vector. */
function tangentFrame(place: THREE.Vector3): [THREE.Vector3, THREE.Vector3] {
  const helper = Math.abs(place.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  const east = new THREE.Vector3().crossVectors(helper, place).normalize()
  const north = new THREE.Vector3().crossVectors(place, east).normalize()
  return [east, north]
}

function focusCaption(focus: TangentPlaneFocus): string {
  if (focus === 'inclusion') return 'The bead sits in the room'
  if (focus === 'velocity') return 'A velocity on the bead is a vector in the room'
  if (focus === 'plane') return 'The tangent plane is square to the radius'
  return 'Tangent lab'
}

export function TangentPlaneLab({ focus = 'overview', compact = false }: Props) {
  const controlId = useId()
  const mountRef = useRef<HTMLDivElement>(null)
  const handlesRef = useRef<SceneHandles | null>(null)
  // Mirrors of the React state, so a rebuilt scene (focus change) starts
  // from the current point instead of the default.
  const latestRef = useRef({ place: new THREE.Vector3(0.55, 0.62, 0.56).normalize(), direction: 0.6 })
  const [place, setPlaceState] = useState(() => new THREE.Vector3(0.55, 0.62, 0.56).normalize())
  const [direction, setDirection] = useState(0.6)

  const [east, north] = tangentFrame(place)
  const velocity = east.clone().multiplyScalar(Math.cos(direction))
    .add(north.clone().multiplyScalar(Math.sin(direction)))
  const dot = velocity.dot(place)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let frame = 0
    let renderer: THREE.WebGLRenderer | undefined
    let controls: OrbitControls | undefined
    const scene = new THREE.Scene()
    const disposables: Array<{ dispose: () => void }> = []

    try {
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100)
      camera.position.set(3.1, 2.0, 3.4)
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.domElement.setAttribute('role', 'img')
      renderer.domElement.setAttribute(
        'aria-label',
        'Interactive tangent plane on a sphere. Drag the marked point to move it; drag elsewhere to turn the view.',
      )
      mount.replaceChildren(renderer.domElement)

      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.minDistance = 2.2
      controls.maxDistance = 7

      scene.add(new THREE.HemisphereLight(0xf7fbff, 0x24445f, 2.2))
      const key = new THREE.DirectionalLight(0xffffff, 2.6)
      key.position.set(3.5, 4.5, 5)
      scene.add(key)

      const sphereGeometry = new THREE.SphereGeometry(1, 64, 48)
      const sphereMaterial = new THREE.MeshStandardMaterial({
        color: 0xd8e3ef,
        roughness: 0.55,
        metalness: 0.05,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
      sphere.renderOrder = 1
      scene.add(sphere)
      disposables.push(sphereGeometry, sphereMaterial)

      const gridMaterial = new THREE.LineBasicMaterial({ color: 0x8aa0b8, transparent: true, opacity: 0.35 })
      disposables.push(gridMaterial)
      const circlePoints = (count: number, mapper: (t: number) => THREE.Vector3) => {
        const points: THREE.Vector3[] = []
        for (let index = 0; index <= count; index += 1) points.push(mapper((index / count) * Math.PI * 2))
        return points
      }
      for (const latitude of [-0.6, -0.3, 0, 0.3, 0.6]) {
        const r = Math.sqrt(1 - latitude * latitude)
        const geometry = new THREE.BufferGeometry().setFromPoints(
          circlePoints(96, (t) => new THREE.Vector3(r * Math.cos(t), latitude, r * Math.sin(t))),
        )
        scene.add(new THREE.Line(geometry, gridMaterial))
        disposables.push(geometry)
      }
      for (const meridian of [0, Math.PI / 3, 2 * Math.PI / 3]) {
        const geometry = new THREE.BufferGeometry().setFromPoints(
          circlePoints(96, (t) => new THREE.Vector3(Math.cos(t) * Math.cos(meridian), Math.sin(t), Math.cos(t) * Math.sin(meridian))),
        )
        scene.add(new THREE.Line(geometry, gridMaterial))
        disposables.push(geometry)
      }

      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 24, 16),
        new THREE.MeshStandardMaterial({ color: PLACE_COLOR, emissive: PLACE_COLOR, emissiveIntensity: 0.35 }),
      )
      scene.add(marker)
      disposables.push(marker.geometry, marker.material as THREE.Material)

      const planeGeometry = new THREE.CircleGeometry(0.48, 48)
      const planeMaterial = new THREE.MeshStandardMaterial({
        color: PLANE_COLOR,
        transparent: true,
        opacity: focus === 'inclusion' ? 0.12 : 0.32,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      const plane = new THREE.Mesh(planeGeometry, planeMaterial)
      plane.renderOrder = 2
      scene.add(plane)
      disposables.push(planeGeometry, planeMaterial)

      const radiusArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 1, RADIUS_COLOR, 0.12, 0.06)
      scene.add(radiusArrow)
      const velocityArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.55, VELOCITY_COLOR, 0.12, 0.06)
      scene.add(velocityArrow)

      const curveMaterial = new THREE.LineBasicMaterial({ color: VELOCITY_COLOR, transparent: true, opacity: 0.75 })
      const curveGeometry = new THREE.BufferGeometry()
      const curve = new THREE.Line(curveGeometry, curveMaterial)
      scene.add(curve)
      disposables.push(curveMaterial, curveGeometry)

      const axesMaterial = new THREE.LineBasicMaterial({ color: 0x5b6b7f, transparent: true, opacity: 0.5 })
      disposables.push(axesMaterial)
      for (const axis of [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]) {
        const geometry = new THREE.BufferGeometry().setFromPoints([axis.clone().multiplyScalar(-1.6), axis.clone().multiplyScalar(1.6)])
        scene.add(new THREE.Line(geometry, axesMaterial))
        disposables.push(geometry)
      }

      let currentPlace = latestRef.current.place.clone()
      let currentDirection = latestRef.current.direction
      const applyState = () => {
        marker.position.copy(currentPlace)
        plane.position.copy(currentPlace)
        plane.lookAt(currentPlace.clone().multiplyScalar(2))
        radiusArrow.setDirection(currentPlace)
        radiusArrow.setLength(1, 0.12, 0.06)
        const [e, n] = tangentFrame(currentPlace)
        const v = e.clone().multiplyScalar(Math.cos(currentDirection)).add(n.clone().multiplyScalar(Math.sin(currentDirection)))
        velocityArrow.position.copy(currentPlace)
        velocityArrow.setDirection(v)
        velocityArrow.setLength(0.55, 0.12, 0.06)
        // The great circle through the place with that velocity: the walk
        // whose derivative at t = 0 is the arrow.
        const points: THREE.Vector3[] = []
        for (let index = -30; index <= 30; index += 1) {
          const t = (index / 30) * 0.9
          points.push(currentPlace.clone().multiplyScalar(Math.cos(t)).add(v.clone().multiplyScalar(Math.sin(t))))
        }
        curveGeometry.setFromPoints(points)
        velocityArrow.visible = focus !== 'inclusion'
        curve.visible = focus !== 'inclusion'
      }
      handlesRef.current = {
        setPlace: (next) => { currentPlace = next.clone().normalize(); applyState() },
        setDirection: (radians) => { currentDirection = radians; applyState() },
      }
      applyState()

      // Dragging the marker moves Ada; dragging anywhere else orbits.
      const raycaster = new THREE.Raycaster()
      const pointer = new THREE.Vector2()
      let draggingPlace = false
      const pointerToNdc = (event: PointerEvent) => {
        const rect = renderer!.domElement.getBoundingClientRect()
        pointer.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        )
      }
      const hitSphere = (): THREE.Vector3 | null => {
        raycaster.setFromCamera(pointer, camera)
        const hit = raycaster.intersectObject(sphere, false)[0]
        return hit ? hit.point.clone().normalize() : null
      }
      const onDown = (event: PointerEvent) => {
        pointerToNdc(event)
        raycaster.setFromCamera(pointer, camera)
        const nearMarker = raycaster.intersectObject(marker, false).length > 0
        const hit = hitSphere()
        if (hit && (nearMarker || hit.distanceTo(currentPlace) < 0.35)) {
          draggingPlace = true
          controls!.enabled = false
          renderer!.domElement.setPointerCapture(event.pointerId)
          setPlaceState(hit)
        }
      }
      const onMove = (event: PointerEvent) => {
        if (!draggingPlace) return
        pointerToNdc(event)
        const hit = hitSphere()
        if (hit) setPlaceState(hit)
      }
      const onUp = (event: PointerEvent) => {
        if (!draggingPlace) return
        draggingPlace = false
        controls!.enabled = true
        if (renderer!.domElement.hasPointerCapture(event.pointerId)) {
          renderer!.domElement.releasePointerCapture(event.pointerId)
        }
      }
      renderer.domElement.addEventListener('pointerdown', onDown)
      renderer.domElement.addEventListener('pointermove', onMove)
      renderer.domElement.addEventListener('pointerup', onUp)
      renderer.domElement.addEventListener('pointercancel', onUp)
      renderer.domElement.style.touchAction = 'none'

      const resize = () => {
        const width = Math.max(mount.clientWidth, 280)
        const height = Math.max(mount.clientHeight, compact ? 260 : 360)
        renderer?.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
      }
      const observer = new ResizeObserver(resize)
      observer.observe(mount)
      resize()

      const animate = () => {
        controls?.update()
        renderer?.render(scene, camera)
        frame = requestAnimationFrame(animate)
      }
      animate()

      return () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
        renderer?.domElement.removeEventListener('pointerdown', onDown)
        renderer?.domElement.removeEventListener('pointermove', onMove)
        renderer?.domElement.removeEventListener('pointerup', onUp)
        renderer?.domElement.removeEventListener('pointercancel', onUp)
        controls?.dispose()
        radiusArrow.dispose()
        velocityArrow.dispose()
        disposables.forEach((item) => item.dispose())
        renderer?.dispose()
        renderer?.domElement.remove()
        handlesRef.current = null
      }
    } catch {
      renderer?.dispose()
      const fallback = document.createElement('p')
      fallback.setAttribute('role', 'status')
      fallback.textContent = 'Your browser could not display the interactive 3D model. You can still use the lesson text and diagrams.'
      mount.replaceChildren(fallback)
    }
  }, [compact, focus])

  useEffect(() => {
    latestRef.current.place = place
    handlesRef.current?.setPlace(place)
  }, [place])
  useEffect(() => {
    latestRef.current.direction = direction
    handlesRef.current?.setDirection(direction)
  }, [direction])

  const status = (() => {
    if (focus === 'inclusion') {
      return `Ada's place is the unit vector (${place.x.toFixed(2)}, ${place.y.toFixed(2)}, ${place.z.toFixed(2)}) of the room. Forgetting that its length is 1 is the inclusion map, and it is smooth.`
    }
    if (focus === 'velocity') {
      return 'The orange arrow is the velocity of a walk along a great circle. It is an ordinary vector of the room, and turning it gives a different room vector: the derivative of the inclusion loses nothing.'
    }
    return `Whatever direction Ada picks, her velocity stays in the blue plane, and its dot product with the green radius is ${dot.toFixed(2)}. The tangent plane is the orthogonal complement of the radius.`
  })()

  return (
    <section className={`concept-lab tangent-plane-lab${compact ? ' concept-lab-compact' : ''}`}>
      <header className="concept-lab-heading">
        <div>
          <span>{focusCaption(focus)}</span>
          <strong>Tangent plane on the bead</strong>
        </div>
      </header>
      <div className="concept-lab-controls">
        <label htmlFor={`${controlId}-direction`}>
          <span>Direction of the walk <output aria-hidden="true">{Math.round(direction * 180 / Math.PI)}°</output></span>
          <input
            id={`${controlId}-direction`}
            type="range"
            min="0"
            max="360"
            step="1"
            value={Math.round(direction * 180 / Math.PI)}
            onChange={(event) => setDirection(Number(event.target.value) * Math.PI / 180)}
          />
        </label>
        <div className="concept-lab-controls-buttons">
          <button type="button" onClick={() => setPlaceState(new THREE.Vector3(0, 1, 0))}>Stand on the north pole</button>
          {' '}
          <button type="button" onClick={() => setPlaceState(new THREE.Vector3(1, 0, 0))}>Stand on the equator</button>
        </div>
      </div>
      <div ref={mountRef} className="manifold-object-canvas" />
      <div className="concept-lab-readout">
        <div><span>Place on the bead</span><output>({place.x.toFixed(2)}, {place.y.toFixed(2)}, {place.z.toFixed(2)})</output></div>
        <div><span>Velocity in the room</span><output>({velocity.x.toFixed(2)}, {velocity.y.toFixed(2)}, {velocity.z.toFixed(2)})</output></div>
        <div><span>Velocity · place</span><output>{dot.toFixed(2)}</output></div>
      </div>
      <p className="concept-lab-status" aria-live="polite">{status}</p>
    </section>
  )
}

export default TangentPlaneLab
