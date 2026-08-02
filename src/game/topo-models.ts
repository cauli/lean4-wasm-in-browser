export type TopoModelId =
  | 'sphere-charts'
  | 'torus-loops'
  | 'mobius-band'
  | 'trefoil-circle'
  | 'sphere-triangle'
  | 'figure-eight'
  | 'tangent-plane'
  | 'robot-arm'

export interface TopoModelInfo {
  label: string
  caption: string
  outlook?: boolean
  /** Unit-ish direction from the model's center to the camera (Y up). */
  viewFrom?: [number, number, number]
}

export const topoModels: Record<TopoModelId, TopoModelInfo> = {
  'sphere-charts': {
    label: 'Sphere with two charts',
    caption: 'Ada uses the amber leaf near the north and the teal leaf near the south. Both charts work on the overlap, where a transition map translates between their coordinates.',
  },
  'torus-loops': {
    label: 'Torus with its two loops',
    caption: 'Ada can follow either highlighted loop around the torus. Neither loop can be shrunk to a point while staying on the surface.',
  },
  'mobius-band': {
    label: 'Möbius band',
    caption: 'Ada carries an arrow once around the band and finds it flipped on her return. There is no consistent choice of "up" across the whole surface.',
    outlook: true,
  },
  'trefoil-circle': {
    label: 'Circle and trefoil embeddings',
    caption: 'From inside either tube, Ada experiences the same one-manifold: a circle. The knot belongs to the way one circle sits in three-dimensional space.',
    outlook: true,
  },
  'sphere-triangle': {
    label: 'A triangle with three right angles',
    caption: 'Ada walks three geodesic edges and turns through a right angle at every corner. The 270° angle total reveals curvature from within the sphere.',
    outlook: true,
    viewFrom: [1, 0.85, -1.1],
  },
  'figure-eight': {
    label: 'Figure-eight crossing',
    caption: 'Ada tests the red crossing as a possible point on a one-manifold. Removing it leaves four nearby arms instead of the two she would find on an interval.',
    outlook: true,
  },
  'tangent-plane': {
    label: 'Tangent plane at a point',
    caption: 'The plane contains the velocity vectors Ada could choose at this point. It is the tangent space where local motion becomes linear.',
  },
  'robot-arm': {
    label: 'Two-joint robot arm',
    caption: 'The orange and teal links turn at two circular joints. Their joint state determines the red tip position on the work plane.',
    viewFrom: [1.1, 0.9, -1.25],
  },
}

export const topologyGalleryModelIds: TopoModelId[] = [
  'sphere-charts',
  'torus-loops',
  'mobius-band',
  'trefoil-circle',
  'sphere-triangle',
  'figure-eight',
  'tangent-plane',
]
