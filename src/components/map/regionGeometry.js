import { feature } from 'topojson-client'

export function toFeatureCollection(topology) {
  return feature(topology, topology.objects.regions)
}
