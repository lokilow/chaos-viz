import CobwebMap from './CobwebMap'

export default function QuadraticMap() {
  return (
    <CobwebMap
      title="Quadratic Map"
      defaultExpr="2 - x*x"
      defaultX0={0.5}
      bounds={{ xMin: -2.2, xMax: 2.2, yMin: -2.2, yMax: 2.2 }}
      gridStep={1}
      iterations={50}
    />
  )
}
