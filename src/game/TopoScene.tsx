import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { topoModels, type TopoModelId } from './topo-models'
import './ManifoldObjectLab.css'

interface Props {
  model: TopoModelId
  compact?: boolean
  showCaption?: boolean
  assetBase?: string
}

function showFallback(mount: HTMLElement) {
  const fallback = document.createElement('p')
  fallback.setAttribute('role', 'status')
  fallback.textContent = 'Your browser could not display the interactive 3D model. You can still use the lesson text and diagrams.'
  mount.replaceChildren(fallback)
}

export function TopoScene({
  model,
  compact = false,
  showCaption = true,
  assetBase = '/game-assets/manifolds',
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [autoRotate, setAutoRotate] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const autoRotateRef = useRef(autoRotate)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let frame = 0
    let disposed = false
    let renderer: THREE.WebGLRenderer | undefined
    let controls: OrbitControls | undefined
    const scene = new THREE.Scene()

    try {
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.domElement.setAttribute('role', 'img')
      renderer.domElement.setAttribute(
        'aria-label',
        `Interactive 3D model of a ${topoModels[model].label}. Drag to turn it, scroll to zoom, or use the arrow keys to move the view.`,
      )
      renderer.domElement.tabIndex = 0
      mount.replaceChildren(renderer.domElement)

      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.07
      controls.autoRotateSpeed = 1.1
      controls.listenToKeyEvents(mount)

      scene.add(new THREE.HemisphereLight(0xf7fbff, 0x24445f, 2.4))
      const key = new THREE.DirectionalLight(0xffffff, 3.0)
      key.position.set(3.5, 4.5, 5)
      scene.add(key)
      const rim = new THREE.DirectionalLight(0x90caf9, 1.9)
      rim.position.set(-4, 1, -3)
      scene.add(rim)

      const loader = new GLTFLoader()
      loader.load(
        `${assetBase}/models/${model}.glb`,
        (gltf) => {
          if (disposed) return
          const root = gltf.scene
          root.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const materials = Array.isArray(child.material) ? child.material : [child.material]
              for (const material of materials) {
                if (material.transparent) {
                  material.depthWrite = false
                  child.renderOrder = 1
                }
              }
            }
          })
          scene.add(root)

          const bounds = new THREE.Box3().setFromObject(root)
          const sphere = bounds.getBoundingSphere(new THREE.Sphere())
          const radius = Math.max(sphere.radius, 0.001)
          camera.position.copy(sphere.center.clone().add(
            new THREE.Vector3(...(topoModels[model].viewFrom || [1, 0.62, 1.35]))
              .normalize().multiplyScalar(radius * 2.7),
          ))
          camera.near = radius / 50
          camera.far = radius * 40
          camera.updateProjectionMatrix()
          if (controls) {
            controls.target.copy(sphere.center)
            controls.minDistance = radius * 1.25
            controls.maxDistance = radius * 6
            controls.update()
          }
        },
        undefined,
        () => {
          if (!disposed) showFallback(mount)
        },
      )

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
        if (controls) {
          controls.autoRotate = autoRotateRef.current
          controls.update()
        }
        renderer?.render(scene, camera)
        frame = requestAnimationFrame(animate)
      }
      animate()

      return () => {
        disposed = true
        cancelAnimationFrame(frame)
        observer.disconnect()
        controls?.stopListenToKeyEvents()
        controls?.dispose()
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            materials.forEach((material) => material.dispose())
          }
        })
        renderer?.dispose()
        renderer?.domElement.remove()
      }
    } catch {
      renderer?.dispose()
      showFallback(mount)
    }
  }, [assetBase, compact, model])

  const toggleRotation = () => {
    autoRotateRef.current = !autoRotateRef.current
    setAutoRotate(autoRotateRef.current)
  }

  return (
    <div className={`topo-scene${compact ? ' topo-scene-compact' : ''}`}>
      <div ref={mountRef} className="manifold-object-canvas" aria-live="polite" />
      <div className="topo-scene-footer">
        {showCaption && <p className="topo-scene-caption">{topoModels[model].caption}</p>}
        <button
          type="button"
          className="manifold-motion-toggle"
          aria-pressed={autoRotate}
          onClick={toggleRotation}
        >
          {autoRotate ? 'Pause rotation' : 'Resume rotation'}
        </button>
      </div>
    </div>
  )
}

export default TopoScene
