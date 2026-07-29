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
    caption: 'Two translucent pages, amber from the north and teal from the south, cover the globe. The transition map lives on the band where they overlap.',
  },
  'torus-loops': {
    label: 'Torus with its two loops',
    caption: 'Neither highlighted loop can be shrunk to a point without leaving the surface. Together they describe every way to wander a torus.',
  },
  'mobius-band': {
    label: 'Möbius band',
    caption: 'Follow the arrows once around the band: they come back flipped. One boundary curve, and no consistent notion of "up".',
  },
  'trefoil-circle': {
    label: 'A circle, knotted and not',
    caption: 'To an inhabitant, both tubes are the same one-manifold: the circle. The knotting only exists in how one of them sits inside 3D space.',
  },
  'sphere-triangle': {
    label: 'A triangle with three right angles',
    caption: 'A geodesic triangle on the sphere carrying 270° of angle. The 90° of excess is curvature, measured entirely from inside.',
    viewFrom: [1, 0.85, -1.1],
  },
  'figure-eight': {
    label: 'The crossing that fails',
    caption: 'Remove the red point and four arms fall away; an interval would leave two. Every other point passes the line test, and the one failure disqualifies the curve.',
  },
  'tangent-plane': {
    label: 'Tangent plane at a point',
    caption: 'Every velocity Ada could have at her point, collected into one plane: the tangent space, where the calculus of her world happens.',
  },
}
