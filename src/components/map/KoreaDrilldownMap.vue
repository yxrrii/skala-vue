<script setup>
import { ref, computed, watch } from 'vue'
import { geoCentroid } from 'd3-geo'
import sidoTopo from '@/assets/map/boundaries/sido/all.topo.json'
import { toFeatureCollection } from './regionGeometry'
import { useKoreaProjection } from './useKoreaProjection'
import { useMapSelectionStore } from '@/stores/mapSelection'
import AttributionFooter from './AttributionFooter.vue'

const W = 800
const H = 900
const ZOOM_TRANSITION = 'transform 400ms ease'

const sidoFC = toFeatureCollection(sidoTopo)
const { path } = useKoreaProjection(sidoFC, W, H)
const store = useMapSelectionStore()

const emit = defineEmits(['region-select'])

const sggFC = ref(null)
const sggCache = new Map()
const hoveredLabel = ref(null)
const tooltipPos = ref({ x: 0, y: 0 })
const selectedInfo = ref(null)

watch(
  () => store.sidoCode,
  async (code) => {
    if (!code) return
    if (sggCache.has(code)) {
      sggFC.value = sggCache.get(code)
      return
    }
    const topo = await import(`../../assets/map/boundaries/sgg/by-sido/${code}.topo.json`)
    const fc = toFeatureCollection(topo.default ?? topo)
    sggCache.set(code, fc)
    sggFC.value = fc
  },
)

function onSidoClick(feature) {
  store.selectSido(feature.properties.code)
  const [lon, lat] = geoCentroid(feature)
  selectedInfo.value = { name: feature.properties.label, lat, lon, code: feature.properties.code }
}

function onSggClick(feature) {
  const [lon, lat] = geoCentroid(feature)
  selectedInfo.value = { name: feature.properties.name, lat, lon, code: feature.properties.code }
  emit('region-select', { name: feature.properties.name, lat, lon })
}

function onBackClick() {
  store.reset()
  selectedInfo.value = null
}

function onFeatureHover(feature, event) {
  hoveredLabel.value = feature.properties.label ?? feature.properties.name
  const rect = event.currentTarget.closest('.map-canvas').getBoundingClientRect()
  tooltipPos.value = { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function onFeatureLeave() {
  hoveredLabel.value = null
}

const groupStyle = computed(() => {
  if (store.level !== 'sido') {
    return { transform: 'translate(0px, 0px) scale(1)', transition: ZOOM_TRANSITION }
  }
  const target = sidoFC.features.find((f) => f.properties.code === store.sidoCode)
  const [[x0, y0], [x1, y1]] = path.bounds(target)
  const scale = Math.min(W / (x1 - x0), H / (y1 - y0)) * 0.9
  const tx = W / 2 - scale * ((x0 + x1) / 2)
  const ty = H / 2 - scale * ((y0 + y1) / 2)
  return { transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transition: ZOOM_TRANSITION }
})
</script>

<template>
  <div class="map-layout">
    <div class="map-panel">
      <button v-if="store.level === 'sido'" type="button" class="back-button" @click="onBackClick">← 전체 지도로</button>
      <div class="map-canvas">
        <svg :viewBox="`0 0 ${W} ${H}`" class="korea-map">
          <g :style="groupStyle" class="zoom-group">
            <g class="sido-layer" :class="{ faded: store.level === 'sido' }">
              <path v-for="f in sidoFC.features" :key="f.properties.code" :d="path(f)" @click="onSidoClick(f)" @mousemove="onFeatureHover(f, $event)" @mouseleave="onFeatureLeave" />
            </g>
            <g v-if="sggFC" class="sgg-layer" :class="{ visible: store.level === 'sido' }">
              <path v-for="f in sggFC.features" :key="f.properties.code" :d="path(f)" @click="onSggClick(f)" @mousemove="onFeatureHover(f, $event)" @mouseleave="onFeatureLeave" />
            </g>
          </g>
        </svg>
        <div v-if="hoveredLabel" class="map-tooltip" :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }">
          {{ hoveredLabel }}
        </div>
        <div v-if="selectedInfo" class="map-hud">
          <p class="hud-label"><span class="hud-marker"></span>선택 지역</p>
          <p class="hud-name">{{ selectedInfo.name }}</p>
          <div class="hud-meta">
            <div class="hud-meta-row">
              <span>위도 {{ selectedInfo.lat.toFixed(4) }}</span>
              <span>경도 {{ selectedInfo.lon.toFixed(4) }}</span>
            </div>
            <div class="hud-meta-row">
              <span>코드 {{ selectedInfo.code }}</span>
            </div>
          </div>
        </div>
      </div>
      <AttributionFooter />
    </div>
  </div>
</template>

<style scoped>
.map-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.map-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 20px;
}

.map-canvas {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
}

.map-tooltip {
  position: absolute;
  transform: translate(-50%, -130%);
  pointer-events: none;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--metal-800);
  padding: 5px 10px;
  border: 1px solid var(--metal-300);
  border-radius: var(--radius-md);
  background: var(--hud-panel-bg-strong);
  box-shadow: var(--shadow-card);
  z-index: 5;
}

.map-hud {
  position: absolute;
  left: 16px;
  bottom: 16px;
  z-index: 5;
  max-width: min(280px, 60%);
  pointer-events: none;
}

.hud-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  color: var(--metal-500);
}

.hud-marker {
  width: 8px;
  height: 8px;
  background: var(--hud-cyan);
  border-radius: 2px;
  box-shadow: 0 0 6px var(--hud-cyan);
}

.hud-name {
  margin: 0 0 8px;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--metal-900);
  text-shadow: var(--hud-glow-text);
}

.hud-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--metal-600);
}

.hud-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
}

.back-button {
  align-self: flex-start;
  cursor: pointer;
  font-family: var(--font-mono);
  color: var(--metal-700);
  border: 1px solid var(--metal-300);
  border-radius: 999px;
  background: transparent;
  padding: 0.4rem 0.9rem;
  font-size: 0.8rem;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}

.back-button:hover {
  border-color: var(--metal-500);
  color: var(--metal-900);
}

.korea-map {
  width: 100%;
  max-width: 720px;
  height: auto;
  filter: drop-shadow(0 0 18px rgba(56, 189, 248, 0.35)) drop-shadow(0 0 4px rgba(103, 232, 249, 0.5));
}

.zoom-group {
  transform-box: view-box;
  transform-origin: 0px 0px;
}

.korea-map path {
  stroke: var(--holo-1);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.sido-layer path {
  cursor: pointer;
  fill: rgba(56, 189, 248, 0.08);
  transition: fill 150ms ease;
}

.sido-layer path:hover,
.sgg-layer path:hover {
  fill: rgba(34, 211, 238, 0.55);
}

.sido-layer {
  transition: opacity 400ms ease;
  opacity: 1;
}

.sido-layer.faded {
  opacity: 0;
  pointer-events: none;
}

.sgg-layer {
  opacity: 0;
  pointer-events: none;
  transition: opacity 400ms ease;
}

.sgg-layer path {
  cursor: pointer;
  fill: rgba(56, 189, 248, 0.08);
  transition: fill 150ms ease;
}

.sgg-layer.visible {
  opacity: 1;
  pointer-events: auto;
}
</style>
