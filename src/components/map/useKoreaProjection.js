import { geoMercator, geoPath } from 'd3-geo'

export function useKoreaProjection(nationFeatureCollection, width, height) {
  const projection = geoMercator().fitSize([width, height], nationFeatureCollection)
  const path = geoPath(projection)
  return { projection, path }
}
