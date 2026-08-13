<script setup>
// 나만의 추가 View: 날씨 통계 요약 → 전국 기상 관측 통합 대시보드로 확장
// OpenWeatherMap 현재 날씨 응답에 이미 담겨 있는 필드(체감온도/기압/시정)를 추가로 활용해,
// API 호출 수(85건, 동시 10건)는 그대로 유지하면서 관측 항목만 넓힌다
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { cities } from '../data/cities.js'
import { fetchCurrentWeather } from '../api/weather.js'
import { mapWithConcurrency } from '../utils/concurrency.js'
import { useConfigStore } from '../stores/configStore.js'
import BaseDashboardCard from '../components/exercise/BaseDashboardCard.vue'

const configStore = useConfigStore()

const isLoading = ref(true)
const cityRecords = ref([])
const lastUpdated = ref(null)
const now = ref(new Date())
let clockTimer = null

// 전국 85개 시의 OpenWeatherMap 현재 날씨를 가져와 통계 산출 (과제 요구사항 1)
// 동시 10건씩 나눠 호출해 무료 API 요금제의 분당 호출 제한을 피한다
const loadStats = async () => {
  isLoading.value = true
  try {
    const records = await mapWithConcurrency(cities, 10, (c) =>
      fetchCurrentWeather(c).then((data) => ({
        id: c.id,
        name: c.name,
        temp: data.main.temp,
        feelsLike: data.main.feels_like,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: data.wind.speed,
        visibility: data.visibility ?? 10000,
        status: data.weather[0].description,
      })),
    )
    cityRecords.value = records
    lastUpdated.value = new Date()
  } catch (error) {
    console.error('통계 데이터를 가져오지 못했습니다:', error)
    alert('통계 데이터를 가져오지 못했습니다.')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadStats()
  clockTimer = setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  clearInterval(clockTimer)
})

const timeLabel = (date) => (date ? date.toLocaleTimeString('ko-KR', { hour12: false }) : '--:--:--')
const nowLabel = computed(() => timeLabel(now.value))
const updatedLabel = computed(() => timeLabel(lastUpdated.value))

// --- 상단 관측 요약 지표 ---
const average = (key) => {
  if (!cityRecords.value.length) return null
  const sum = cityRecords.value.reduce((acc, r) => acc + r[key], 0)
  return sum / cityRecords.value.length
}
const averageTemp = computed(() => average('temp')?.toFixed(1) ?? '-')
const averageFeelsLike = computed(() => average('feelsLike')?.toFixed(1) ?? '-')
const averageHumidity = computed(() => {
  const v = average('humidity')
  return v === null ? '-' : Math.round(v)
})
const averagePressure = computed(() => {
  const v = average('pressure')
  return v === null ? '-' : Math.round(v)
})
const averageWindSpeed = computed(() => average('windSpeed')?.toFixed(1) ?? '-')
const averageVisibilityKm = computed(() => {
  const v = average('visibility')
  return v === null ? '-' : (v / 1000).toFixed(1)
})
const hotCityCount = computed(() => cityRecords.value.filter((r) => r.temp >= configStore.hotThreshold).length)

// --- 기온 분포 히스토그램 (유지) ---
const BIN_SIZE = 2
const CHART_W = 960
const CHART_H = 170
const PAD = { top: 10, right: 8, bottom: 22, left: 8 }

const histogramBins = computed(() => {
  // TOP5 등에도 반올림 없이 소수점까지 그대로 보여주므로, 히스토그램도 원본 소수점 온도로
  // 구간을 나눈다 (표시값을 그대로 보여주니 어느 막대에 속하는지 숫자만 보고도 알 수 있다)
  const temps = cityRecords.value.map((r) => r.temp)
  if (!temps.length) return []
  const min = Math.min(...temps)
  const max = Math.max(...temps)
  const start = Math.floor(min / BIN_SIZE) * BIN_SIZE
  const end = Math.ceil(max / BIN_SIZE) * BIN_SIZE || start + BIN_SIZE
  const bins = []
  for (let lo = start; lo < end; lo += BIN_SIZE) {
    bins.push({ lo, hi: lo + BIN_SIZE, count: 0 })
  }
  temps.forEach((t) => {
    const idx = Math.min(Math.floor((t - start) / BIN_SIZE), bins.length - 1)
    bins[idx].count += 1
  })
  return bins
})

// 화면에 그릴 막대 좌표 계산 (막대 높이 = 해당 구간 도시 수)
const chartBars = computed(() => {
  const bins = histogramBins.value
  if (!bins.length) return []
  const maxCount = Math.max(...bins.map((b) => b.count), 1)
  const plotW = CHART_W - PAD.left - PAD.right
  const plotH = CHART_H - PAD.top - PAD.bottom
  const gap = 4
  const barWidth = plotW / bins.length - gap
  return bins.map((b, i) => {
    const height = (b.count / maxCount) * plotH
    return {
      x: PAD.left + i * (barWidth + gap),
      y: PAD.top + (plotH - height),
      width: Math.max(barWidth, 1),
      height,
      label: `${b.lo}~${b.hi}°`,
      count: b.count,
    }
  })
})

// '더움' 기준선(configStore.hotThreshold)을 그래프 위에 함께 표시
const hotThresholdX = computed(() => {
  const bins = histogramBins.value
  if (!bins.length) return null
  const start = bins[0].lo
  const end = bins[bins.length - 1].hi
  const threshold = configStore.hotThreshold
  if (threshold < start || threshold > end) return null
  const plotW = CHART_W - PAD.left - PAD.right
  return PAD.left + ((threshold - start) / (end - start)) * plotW
})

const hoveredBar = ref(null)
const tooltipPos = ref({ x: 0, y: 0 })

const onBarHover = (bar, event) => {
  hoveredBar.value = bar
  const rect = event.currentTarget.closest('.chart-canvas').getBoundingClientRect()
  tooltipPos.value = { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

const onBarLeave = () => {
  hoveredBar.value = null
}

// --- 랭킹 막대 폭 계산 공통 유틸: 관측값 전체 범위를 공통 스케일로 사용해
//     같은 패널 안 막대끼리 길이를 비교할 수 있게 한다 ---
const domainOf = (key) => {
  const values = cityRecords.value.map((r) => r[key])
  if (!values.length) return { min: 0, max: 1 }
  return { min: Math.min(...values), max: Math.max(...values) }
}
const scaleWidth = (value, { min, max }) => {
  if (max === min) return 100
  // 최솟값에 가까운 막대가 완전히 안 보이는 것을 막기 위한 최소 표시 폭
  return Math.max(((value - min) / (max - min)) * 100, 3)
}

// --- 최고/최저 기온 TOP 5 (유지) ---
const tempDomain = computed(() => domainOf('temp'))
const rankWidth = (temp) => scaleWidth(temp, tempDomain.value)
const hottestCities = computed(() => [...cityRecords.value].sort((a, b) => b.temp - a.temp).slice(0, 5))
const coldestCities = computed(() => [...cityRecords.value].sort((a, b) => a.temp - b.temp).slice(0, 5))

// --- 체감온도 편차 TOP 5 (신규: feels_like - temp) ---
const feelsDeviationDomain = computed(() => {
  const abs = cityRecords.value.map((r) => Math.abs(r.feelsLike - r.temp))
  return { min: 0, max: Math.max(...abs, 1) }
})
const deviationWidth = (deviation) => scaleWidth(Math.abs(deviation), feelsDeviationDomain.value)
const topDeviationCities = computed(() =>
  [...cityRecords.value]
    .map((r) => ({ ...r, deviation: r.feelsLike - r.temp }))
    .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
    .slice(0, 5),
)

// --- 저기압 지역 TOP 5 (신규: main.pressure) ---
const pressureDomain = computed(() => domainOf('pressure'))
const pressureWidth = (p) => scaleWidth(p, pressureDomain.value)
const lowPressureCities = computed(() => [...cityRecords.value].sort((a, b) => a.pressure - b.pressure).slice(0, 5))

// --- 저시정 주의 지역 TOP 5 (신규: visibility, 미터 단위) ---
const visibilityDomain = computed(() => domainOf('visibility'))
const visibilityWidth = (v) => scaleWidth(v, visibilityDomain.value)
const lowVisibilityCities = computed(() => [...cityRecords.value].sort((a, b) => a.visibility - b.visibility).slice(0, 5))

// --- 강풍 지역 TOP 5 (신규: wind.speed 상위 목록으로 확장) ---
const windDomain = computed(() => domainOf('windSpeed'))
const windWidth = (w) => scaleWidth(w, windDomain.value)
const windyCities = computed(() => [...cityRecords.value].sort((a, b) => b.windSpeed - a.windSpeed).slice(0, 5))

// --- 날씨 상태(맑음/흐림 등) 분포 (유지) ---
const statusCounts = computed(() => {
  const counts = new Map()
  cityRecords.value.forEach((r) => {
    counts.set(r.status, (counts.get(r.status) ?? 0) + 1)
  })
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
})
const maxStatusCount = computed(() => Math.max(...statusCounts.value.map((s) => s.count), 1))
</script>

<template>
  <div class="stats">
    <header class="dash-header">
      <div class="title-block">
        <h1 class="page-title"><span class="title-marker"></span>기상 관측 통합 대시보드</h1>
        <p class="page-sub">NATIONAL WEATHER MONITORING · 전국 {{ cities.length }}개소 실시간 관측</p>
      </div>
      <div class="dash-status">
        <span class="live-badge"><span class="live-dot"></span>LIVE</span>
        <span class="clock">{{ nowLabel }}</span>
        <span class="updated" v-if="lastUpdated">최종 갱신 {{ updatedLabel }}</span>
        <button class="refresh-btn" @click="loadStats" :disabled="isLoading">
          {{ isLoading ? '갱신 중…' : '↻ 새로고침' }}
        </button>
      </div>
    </header>
    <hr class="divider" />

    <template v-if="isLoading && !cityRecords.length">
      <p class="loading-line">전국 관측망에 연결하는 중...</p>
    </template>
    <template v-else>
      <div class="kpi-grid">
        <div class="kpi-tile">
          <span class="kpi-label">등록 지역</span>
          <span class="kpi-value">{{ cities.length }}<span class="kpi-unit">개소</span></span>
        </div>
        <div class="kpi-tile">
          <span class="kpi-label">평균 기온</span>
          <span class="kpi-value">{{ averageTemp }}<span class="kpi-unit">°C</span></span>
        </div>
        <div class="kpi-tile">
          <span class="kpi-label">평균 체감</span>
          <span class="kpi-value">{{ averageFeelsLike }}<span class="kpi-unit">°C</span></span>
        </div>
        <div class="kpi-tile">
          <span class="kpi-label">평균 습도</span>
          <span class="kpi-value">{{ averageHumidity }}<span class="kpi-unit">%</span></span>
        </div>
        <div class="kpi-tile">
          <span class="kpi-label">평균 기압</span>
          <span class="kpi-value">{{ averagePressure }}<span class="kpi-unit">hPa</span></span>
        </div>
        <div class="kpi-tile">
          <span class="kpi-label">평균 풍속</span>
          <span class="kpi-value">{{ averageWindSpeed }}<span class="kpi-unit">m/s</span></span>
        </div>
        <div class="kpi-tile">
          <span class="kpi-label">평균 시정</span>
          <span class="kpi-value">{{ averageVisibilityKm }}<span class="kpi-unit">km</span></span>
        </div>
        <div class="kpi-tile" :class="{ 'kpi-tile--warning': hotCityCount > 0 }">
          <span class="kpi-label">{{ configStore.hotThreshold }}° 이상</span>
          <span class="kpi-value">{{ hotCityCount }}<span class="kpi-unit">개소</span></span>
        </div>
      </div>

      <BaseDashboardCard title="기온 분포 · 전국 관측 히스토그램">
        <p class="chart-caption">기온 구간(°C)별 지역 수 · 점선: '더움' 기준선</p>
        <div class="chart-canvas">
          <svg :viewBox="`0 0 ${CHART_W} ${CHART_H}`" class="histogram" role="img" :aria-label="`기온 구간별 지역 수 히스토그램, 총 ${cities.length}개소`">
            <line :x1="PAD.left" :x2="CHART_W - PAD.right" :y1="CHART_H - PAD.bottom" :y2="CHART_H - PAD.bottom" class="baseline" />
            <line v-if="hotThresholdX !== null" :x1="hotThresholdX" :x2="hotThresholdX" :y1="PAD.top" :y2="CHART_H - PAD.bottom" class="threshold-line" />
            <g v-for="bar in chartBars" :key="bar.label" @mousemove="onBarHover(bar, $event)" @mouseleave="onBarLeave">
              <rect :x="bar.x" :y="bar.y" :width="bar.width" :height="Math.max(bar.height, 1)" rx="2" class="bar" :class="{ hovered: hoveredBar === bar }" />
              <text v-if="chartBars.length <= 20" :x="bar.x + bar.width / 2" :y="CHART_H - PAD.bottom + 13" class="bar-label">
                {{ bar.label }}
              </text>
            </g>
          </svg>
          <div v-if="hoveredBar" class="chart-tooltip" :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }">{{ hoveredBar.label }} · {{ hoveredBar.count }}개소</div>
        </div>
      </BaseDashboardCard>

      <div class="rank-grid">
        <BaseDashboardCard title="최고 기온 TOP 5">
          <div class="rank-list">
            <div v-for="city in hottestCities" :key="city.id" class="rank-row">
              <span class="rank-name">{{ city.name }}</span>
              <div class="rank-track">
                <div class="rank-fill hot" :style="{ width: rankWidth(city.temp) + '%' }"></div>
              </div>
              <span class="rank-value">{{ city.temp.toFixed(1) }}°</span>
            </div>
          </div>
        </BaseDashboardCard>
        <BaseDashboardCard title="최저 기온 TOP 5">
          <div class="rank-list">
            <div v-for="city in coldestCities" :key="city.id" class="rank-row">
              <span class="rank-name">{{ city.name }}</span>
              <div class="rank-track">
                <div class="rank-fill cold" :style="{ width: rankWidth(city.temp) + '%' }"></div>
              </div>
              <span class="rank-value">{{ city.temp.toFixed(1) }}°</span>
            </div>
          </div>
        </BaseDashboardCard>
        <BaseDashboardCard title="체감 편차 TOP 5">
          <div class="rank-list">
            <div v-for="city in topDeviationCities" :key="city.id" class="rank-row">
              <span class="rank-name">{{ city.name }}</span>
              <div class="rank-track">
                <div class="rank-fill" :class="city.deviation >= 0 ? 'hot' : 'cold'" :style="{ width: deviationWidth(city.deviation) + '%' }"></div>
              </div>
              <span class="rank-value">{{ city.deviation >= 0 ? '+' : '−' }}{{ Math.abs(city.deviation).toFixed(1) }}°</span>
            </div>
          </div>
        </BaseDashboardCard>
      </div>

      <div class="rank-grid">
        <BaseDashboardCard title="저기압 지역 TOP 5">
          <div class="rank-list">
            <div v-for="city in lowPressureCities" :key="city.id" class="rank-row">
              <span class="rank-name">{{ city.name }}</span>
              <div class="rank-track">
                <div class="rank-fill pressure" :style="{ width: pressureWidth(city.pressure) + '%' }"></div>
              </div>
              <span class="rank-value">{{ city.pressure }}hPa</span>
            </div>
          </div>
        </BaseDashboardCard>
        <BaseDashboardCard title="저시정 주의 TOP 5">
          <div class="rank-list">
            <div v-for="city in lowVisibilityCities" :key="city.id" class="rank-row">
              <span class="rank-name">{{ city.name }}</span>
              <div class="rank-track">
                <div class="rank-fill visibility" :style="{ width: visibilityWidth(city.visibility) + '%' }"></div>
              </div>
              <span class="rank-value">{{ (city.visibility / 1000).toFixed(1) }}km</span>
            </div>
          </div>
        </BaseDashboardCard>
        <BaseDashboardCard title="강풍 지역 TOP 5">
          <div class="rank-list">
            <div v-for="city in windyCities" :key="city.id" class="rank-row">
              <span class="rank-name">{{ city.name }}</span>
              <div class="rank-track">
                <div class="rank-fill pressure" :style="{ width: windWidth(city.windSpeed) + '%' }"></div>
              </div>
              <span class="rank-value">{{ city.windSpeed.toFixed(1) }}m/s</span>
            </div>
          </div>
        </BaseDashboardCard>
      </div>

      <BaseDashboardCard title="날씨 상태 분포">
        <div class="rank-list">
          <div v-for="s in statusCounts" :key="s.label" class="rank-row">
            <span class="rank-name">{{ s.label }}</span>
            <div class="rank-track">
              <div class="rank-fill status" :style="{ width: (s.count / maxStatusCount) * 100 + '%' }"></div>
            </div>
            <span class="rank-value">{{ s.count }}개</span>
          </div>
        </div>
      </BaseDashboardCard>
    </template>

    <RouterLink to="/" class="back-btn">← 대시보드로 돌아가기</RouterLink>
  </div>
</template>

<style scoped>
/* HUD 톤에 맞춘 앰버 글로우 / 시안 글로우 (더움/최저기온·체감편차·저시정 등 상태 표시 공용) */
.stats {
  --stat-hot: #fb923c;
  --stat-cold: #22d3ee;
  padding: 8px clamp(4px, 2vw, 24px) 64px;
}

.dash-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px 24px;
  margin-bottom: 16px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 6px;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--metal-900);
  text-shadow: var(--hud-glow-text);
}

.title-marker {
  width: 8px;
  height: 8px;
  background: var(--hud-cyan);
  box-shadow: 0 0 6px var(--hud-cyan);
  border-radius: 2px;
  flex-shrink: 0;
}

.page-sub {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  color: var(--metal-500);
}

.dash-status {
  display: flex;
  align-items: center;
  gap: 16px;
  font-family: var(--font-mono);
}

.live-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--hud-cyan);
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--hud-cyan);
  box-shadow: 0 0 8px var(--hud-cyan);
  animation: live-pulse 1.6s ease-in-out infinite;
}

@keyframes live-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.clock {
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--metal-800);
}

.updated {
  font-size: 0.72rem;
  color: var(--metal-500);
}

.refresh-btn {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.02em;
  color: var(--metal-700);
  background: var(--metal-50);
  border: 1px solid var(--metal-300);
  border-radius: 999px;
  padding: 6px 14px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  border-color: var(--hud-cyan);
  color: var(--metal-900);
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.3);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.divider {
  border: none;
  border-top: 1px solid var(--metal-200);
  margin: 0 0 20px;
}

.loading-line {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--metal-500);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.kpi-tile {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid var(--metal-200);
  border-left: 2px solid var(--hud-cyan);
  border-radius: var(--radius-md);
  background: var(--hud-panel-bg);
}

.kpi-tile--warning {
  border-left-color: var(--stat-hot);
}

.kpi-label {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  color: var(--metal-500);
}

.kpi-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--metal-900);
  text-shadow: var(--hud-glow-text);
}

.kpi-tile--warning .kpi-value {
  color: var(--stat-hot);
  text-shadow: 0 0 14px rgba(251, 146, 60, 0.4);
}

.kpi-unit {
  margin-left: 3px;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--metal-500);
}

.chart-caption {
  margin: 0 0 10px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--metal-500);
}

.chart-canvas {
  position: relative;
}

.histogram {
  width: 100%;
  height: auto;
}

.baseline {
  stroke: var(--metal-300);
  stroke-width: 1;
}

.threshold-line {
  stroke: var(--stat-hot);
  stroke-width: 1.5;
  stroke-dasharray: 4 3;
}

.bar {
  fill: rgba(56, 189, 248, 0.4);
  stroke: rgba(56, 189, 248, 0.7);
  stroke-width: 1.5;
  transition: fill 150ms ease;
}

.bar:hover,
.bar.hovered {
  fill: var(--hud-cyan);
}

.bar-label {
  font-family: var(--font-mono);
  font-size: 9px;
  fill: var(--metal-500);
  text-anchor: middle;
}

.rank-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
  margin-bottom: 4px;
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rank-row {
  display: grid;
  grid-template-columns: 56px 1fr 60px;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--metal-700);
}

.rank-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-track {
  height: 8px;
  border-radius: 999px;
  background: var(--metal-100);
  overflow: hidden;
}

.rank-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 300ms ease;
}

.rank-fill.hot {
  background: var(--stat-hot);
}

.rank-fill.cold {
  background: var(--stat-cold);
}

.rank-fill.pressure {
  background: var(--metal-400);
}

.rank-fill.visibility {
  background: var(--stat-hot);
}

.rank-fill.status {
  background: var(--metal-500);
}

.rank-value {
  text-align: right;
  font-weight: 700;
  color: var(--metal-900);
}

.chart-tooltip {
  position: absolute;
  transform: translate(-50%, -130%);
  pointer-events: none;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--metal-800);
  padding: 5px 10px;
  border: 1px solid var(--metal-300);
  border-radius: var(--radius-md);
  background: var(--hud-panel-bg-strong);
  box-shadow: var(--shadow-card);
  z-index: 5;
}

.back-btn {
  display: inline-block;
  margin-top: 20px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--metal-700);
  background: var(--metal-50);
  border: 1px solid var(--metal-300);
  border-radius: 999px;
  padding: 8px 16px;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.back-btn:hover {
  border-color: var(--hud-cyan);
  color: var(--metal-900);
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.3);
}

@media (max-width: 640px) {
  .dash-header {
    flex-direction: column;
    align-items: flex-start;
  }

  /* minmax(260px, 1fr)가 좁은 화면에서 가로 스크롤을 만들지 않도록 한 열로 전환 */
  .rank-grid {
    grid-template-columns: 1fr;
  }
}
</style>
