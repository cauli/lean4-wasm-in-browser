import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import './ManifoldObjectLab.css'

export type ManifoldObject = 'sphere' | 'torus' | 'mobius'

interface Props {
  initialObject?: ManifoldObject
  compact?: boolean
}

const objectCopy: Record<ManifoldObject, { label: string; description: string }> = {
  sphere: {
    label: 'Sphere',
    description: 'This is a closed two-manifold without boundary. Each small patch of its surface looks like a piece of a plane.',
  },
  torus: {
    label: 'Torus',
    description: 'This closed two-manifold has two looping directions: around the tube and through the hole.',
  },
  mobius: {
    label: 'Möbius strip',
    description: 'This non-orientable two-manifold has a single boundary curve.',
  },
}

function mobiusGeometry(segments = 180, widthSegments = 28): THREE.BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []

  for (let uIndex = 0; uIndex < segments; uIndex += 1) {
    const u = (uIndex / segments) * Math.PI * 2
    for (let vIndex = 0; vIndex <= widthSegments; vIndex += 1) {
      const v = (vIndex / widthSegments - 0.5) * 1.05
      const radius = 1.48 + v * Math.cos(u / 2)
      positions.push(
        radius * Math.cos(u),
        radius * Math.sin(u),
        v * Math.sin(u / 2),
      )
    }
  }

  const row = widthSegments + 1
  for (let uIndex = 0; uIndex < segments; uIndex += 1) {
    const nextU = (uIndex + 1) % segments
    const closesTwistedSeam = nextU === 0
    for (let vIndex = 0; vIndex < widthSegments; vIndex += 1) {
      const a = uIndex * row + vIndex
      const nextV = closesTwistedSeam ? widthSegments - vIndex : vIndex
      const nextVPlusOne = closesTwistedSeam
        ? widthSegments - vIndex - 1
        : vIndex + 1
      const b = nextU * row + nextV
      const c = nextU * row + nextVPlusOne
      indices.push(a, b, a + 1, b, c, a + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.center()
  return geometry
}

function geometryFor(object: ManifoldObject): THREE.BufferGeometry {
  if (object === 'sphere') return new THREE.SphereGeometry(1.42, 72, 48)
  if (object === 'torus') return new THREE.TorusGeometry(1.15, 0.48, 42, 110)
  return mobiusGeometry()
}

function materialFor(object: ManifoldObject): THREE.MeshPhysicalMaterial {
  const color = object === 'sphere'
    ? 0x4b9bd3
    : object === 'torus'
      ? 0xf2a93b
      : 0x49b6aa
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.36,
    metalness: 0.02,
    clearcoat: 0.26,
    clearcoatRoughness: 0.5,
    side: THREE.DoubleSide,
  })
}

export function ManifoldObjectLab({ initialObject = 'sphere', compact = false }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [autoRotate, setAutoRotate] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const autoRotateRef = useRef(autoRotate)
  const [selected, setSelected] = useState<ManifoldObject>(initialObject)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let frame = 0
    let renderer: THREE.WebGLRenderer | undefined

    try {
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
      camera.position.set(3.5, 2.45, 4.8)

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.domElement.setAttribute('role', 'img')
      renderer.domElement.setAttribute(
        'aria-label',
        `Interactive 3D model of a ${objectCopy[selected].label}. Drag to turn it, scroll to zoom, or use the arrow keys to move the view.`,
      )
      renderer.domElement.tabIndex = 0
      mount.replaceChildren(renderer.domElement)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.07
      controls.enablePan = true
      controls.minDistance = 3
      controls.maxDistance = 9
      controls.autoRotateSpeed = 1.25
      controls.listenToKeyEvents(mount)

      scene.add(new THREE.HemisphereLight(0xf7fbff, 0x24445f, 2.4))
      const key = new THREE.DirectionalLight(0xffffff, 3.2)
      key.position.set(3.5, 4.5, 5)
      scene.add(key)
      const rim = new THREE.DirectionalLight(0x90caf9, 2.1)
      rim.position.set(-4, 1, -3)
      scene.add(rim)

      const geometry = geometryFor(selected)
      const material = materialFor(selected)
      const mesh = new THREE.Mesh(geometry, material)
      if (selected === 'mobius') mesh.rotation.x = -0.52
      else mesh.rotation.x = 0.2
      scene.add(mesh)

      const grid = new THREE.GridHelper(7, 14, 0x8db6d4, 0xc9dcea)
      grid.position.y = -1.85
      grid.material.transparent = true
      grid.material.opacity = 0.32
      scene.add(grid)

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
        controls.autoRotate = autoRotateRef.current
        controls.update()
        renderer?.render(scene, camera)
        frame = requestAnimationFrame(animate)
      }
      animate()

      return () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
        controls.stopListenToKeyEvents()
        controls.dispose()
        geometry.dispose()
        material.dispose()
        renderer?.dispose()
        renderer?.domElement.remove()
      }
    } catch {
      renderer?.dispose()
      const fallback = document.createElement('p')
      fallback.setAttribute('role', 'status')
      fallback.textContent = 'Your browser could not display the interactive 3D model. You can still use the lesson text and diagrams.'
      mount.replaceChildren(fallback)
    }
  }, [compact, selected])

  const toggleRotation = () => {
    autoRotateRef.current = !autoRotateRef.current
    setAutoRotate(autoRotateRef.current)
  }

  return (
    <section className={`manifold-object-lab${compact ? ' manifold-object-lab-compact' : ''}`} aria-labelledby="manifold-object-lab-title">
      <div className="manifold-object-lab-copy">
        <div>
          <p>Explore the shape</p>
          <h2 id="manifold-object-lab-title">{objectCopy[selected].label}</h2>
        </div>
        <p>{objectCopy[selected].description}</p>
      </div>
      <div className="manifold-object-tabs" role="tablist" aria-label="Choose a shape">
        {(Object.keys(objectCopy) as ManifoldObject[]).map((object) => (
          <button
            type="button"
            role="tab"
            aria-selected={selected === object}
            onClick={() => setSelected(object)}
            key={object}
          >
            {objectCopy[object].label}
          </button>
        ))}
        <button type="button" className="manifold-motion-toggle" aria-pressed={autoRotate} onClick={toggleRotation}>
          {autoRotate ? 'Pause rotation' : 'Resume rotation'}
        </button>
      </div>
      <div
        ref={mountRef}
        className="manifold-object-canvas"
        aria-live="polite"
      />
      <p className="manifold-object-help">
        Drag to turn the model. Scroll or pinch to zoom. Focus the model and use the arrow keys to move the view.
      </p>
    </section>
  )
}

export default ManifoldObjectLab
