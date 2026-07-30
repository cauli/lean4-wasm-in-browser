export type TopoModelId =
  | 'sphere-charts'
  | 'torus-loops'
  | 'mobius-band'
  | 'trefoil-circle'
  | 'sphere-triangle'
  | 'figure-eight'
  | 'tangent-plane'

export interface TopoModelInfo {
  label: string
  caption: string
  /** Unit-ish direction from the model's center to the camera (Y up). */
  viewFrom?: [number, number, number]
}

export const topoModels: Record<TopoModelId, TopoModelInfo> = {
  'sphere-charts': {
    label: 'Sphere with two charts',
    caption: 'Two translucent chart regions cover the sphere. The amber chart comes from the north, the teal chart comes from the south, and their transition map is defined on the overlap.',
  },
  'torus-loops': {
    label: 'Torus with its two loops',
    caption: 'Neither highlighted loop can be shrunk to a point while staying on the surface. The two loops are the standard generators for paths around a torus.',
  },
  'mobius-band': {
    label: 'Möbius band',
    caption: 'Follow the arrows around the band once and they return flipped. The band has one boundary curve and no consistent choice of "up".',
  },
  'trefoil-circle': {
    label: 'Circle and trefoil embeddings',
    caption: 'Both tubes are copies of the same one-manifold, the circle. They differ only in how they are embedded in three-dimensional space.',
  },
  'sphere-triangle': {
    label: 'A triangle with three right angles',
    caption: 'This geodesic triangle on the sphere has three right angles. Its angles total 270°, and the 90° excess measures curvature from within the surface.',
    viewFrom: [1, 0.85, -1.1],
  },
  'figure-eight': {
    label: 'Figure-eight crossing',
    caption: 'Every point except the red crossing has a neighborhood like an interval. Removing the crossing leaves four arms instead of two, so that point fails the local interval test.',
  },
  'tangent-plane': {
    label: 'Tangent plane at a point',
    caption: 'The plane contains the possible velocity vectors at Ada\'s point. It is the tangent space where calculus on the surface takes place.',
  },
}
