import { useState } from 'react'
import { TopoScene } from './TopoScene'
import { topoModels, type TopoModelId } from './topo-models'
import './ManifoldObjectLab.css'

interface Props {
  initialObject?: TopoModelId
  compact?: boolean
}

export function ManifoldObjectLab({ initialObject = 'sphere-charts', compact = false }: Props) {
  const [selected, setSelected] = useState<TopoModelId>(initialObject)

  return (
    <section
      className={`manifold-object-lab${compact ? ' manifold-object-lab-compact' : ''}`}
      aria-labelledby="manifold-object-lab-title"
    >
      <div className="manifold-object-lab-copy">
        <div>
          <p>Explore the shape</p>
          <h2 id="manifold-object-lab-title">{topoModels[selected].label}</h2>
        </div>
      </div>
      <div className="manifold-object-tabs" role="tablist" aria-label="Choose a shape">
        {(Object.keys(topoModels) as TopoModelId[]).map((object) => (
          <button
            type="button"
            role="tab"
            aria-selected={selected === object}
            onClick={() => setSelected(object)}
            key={object}
          >
            {topoModels[object].label}
          </button>
        ))}
      </div>
      <TopoScene model={selected} compact={compact} />
      <p className="manifold-object-help">
        Drag to turn the model. Scroll or pinch to zoom. Focus the model and use the arrow keys to move the view.
      </p>
    </section>
  )
}

export default ManifoldObjectLab
