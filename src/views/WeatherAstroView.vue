<script setup>
// 나만의 추가 View: 일출/일몰(천문정보) → 전국 일조·관측 통합 대시보드로 확장
// 전국 85개 지역을 한 번에 조회(Stats 페이지와 동일한 동시 10건 패턴)해서, 선택 지역 상세는 물론
// 전국 랭킹(이른 일출/늦은 일몰/맑은 하늘 등)까지 같은 데이터 한 세트로 뽑아 쓴다.
// 응답에 이미 들어있는 sys.sunrise/sunset, clouds.all, main.feels_like/pressure, visibility, wind.speed 활용
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { toast } from 'vue3-toastify'
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

const selectedCityId = ref(cities[0].id)

const formatLocalTime = (unixSec, tzOffsetSec) => {
  const local = new Date((unixSec + tzOffsetSec) * 1000)
  const hh = String(local.getUTCHours()).padStart(2, '0')
  const mm = String(local.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

const loadAstroData = async () => {
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
        clouds: data.clouds?.all ?? 0,
        visibility: data.visibility ?? 10000,
        status: data.weather[0].description,
        sunrise: data.sys.sunrise,
        sunset: data.sys.sunset,
        timezone: data.timezone,
      })),
    )
    cityRecords.value = records
    lastUpdated.value = new Date()
  } catch (error) {
    console.error('천문/관측 데이터를 가져오지 못했습니다:', error)
    toast.error('천문/관측 데이터를 가져오지 못했습니다.', { theme: toast.THEME.DARK })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadAstroData()
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

const displayTemp = (celsius) => (configStore.unit === 'fahrenheit' ? Math.round((celsius * 9) / 5 + 32) : Math.round(celsius))

// --- 전국 요약 지표 ---
const average = (key) => {
  if (!cityRecords.value.length) return null
  const sum = cityRecords.value.reduce((acc, r) => acc + r[key], 0)
  return sum / cityRecords.value.length
}
const averageSunrise = computed(() => {
  if (!cityRecords.value.length) return '-'
  const avgSec = average('sunrise')
  const avgTz = average('timezone')
  return formatLocalTime(avgSec, avgTz)
})
const averageSunset = computed(() => {
  if (!cityRecords.value.length) return '-'
  const avgSec = average('sunset')
  const avgTz = average('timezone')
  return formatLocalTime(avgSec, avgTz)
})
const averageDayLengthLabel = computed(() => {
  if (!cityRecords.value.length) return '-'
  const avgSunrise = average('sunrise')
  const avgSunset = average('sunset')
  const totalMin = Math.round((avgSunset - avgSunrise) / 60)
  return `${Math.floor(totalMin / 60)}시간 ${totalMin % 60}분`
})
const averageClouds = computed(() => {
  const v = average('clouds')
  return v === null ? '-' : Math.round(v)
})
const averagePressure = computed(() => {
  const v = average('pressure')
  return v === null ? '-' : Math.round(v)
})
const averageFeelsLike = computed(() => {
  const v = average('feelsLike')
  return v === null ? '-' : displayTemp(v)
})

// --- 랭킹 막대 폭 계산 공통 유틸 ---
const domainOf = (key) => {
  const values = cityRecords.value.map((r) => r[key])
  if (!values.length) return { min: 0, max: 1 }
  return { min: Math.min(...values), max: Math.max(...values) }
}
const scaleWidth = (value, { min, max }) => {
  if (max === min) return 100
  return Math.max(((value - min) / (max - min)) * 100, 3)
}

// --- 이른 일출 / 늦은 일몰 / 낮 길이 TOP 5 ---
// sunrise·sunset은 UTC 유닉스초라, 대한민국 전역이 같은 시간대(UTC+9, DST 없음)인 이상
// 지역별 시간대 변환 없이 그대로 비교해도 실제 이른/늦은 순서와 일치한다
const sunriseDomain = computed(() => domainOf('sunrise'))
const sunriseWidth = (city) => scaleWidth(city.sunrise, sunriseDomain.value)
const earliestSunriseCities = computed(() => [...cityRecords.value].sort((a, b) => a.sunrise - b.sunrise).slice(0, 5))

const sunsetDomain = computed(() => domainOf('sunset'))
const sunsetWidth = (city) => scaleWidth(city.sunset, sunsetDomain.value)
const latestSunsetCities = computed(() => [...cityRecords.value].sort((a, b) => b.sunset - a.sunset).slice(0, 5))

const dayLengthOf = (city) => city.sunset - city.sunrise
const dayLengthDomain = computed(() => {
  const values = cityRecords.value.map(dayLengthOf)
  if (!values.length) return { min: 0, max: 1 }
  return { min: Math.min(...values), max: Math.max(...values) }
})
const dayLengthWidth = (city) => scaleWidth(dayLengthOf(city), dayLengthDomain.value)
const dayLengthLabel = (city) => {
  const totalMin = Math.round(dayLengthOf(city) / 60)
  return `${Math.floor(totalMin / 60)}시간 ${totalMin % 60}분`
}
const longestDayCities = computed(() => [...cityRecords.value].sort((a, b) => dayLengthOf(b) - dayLengthOf(a)).slice(0, 5))

// --- 맑은 하늘 / 흐린 하늘 TOP 5 (구름량 clouds.all 기준) ---
const cloudDomain = computed(() => domainOf('clouds'))
const cloudWidth = (clouds) => scaleWidth(clouds, cloudDomain.value)
const clearestSkyCities = computed(() => [...cityRecords.value].sort((a, b) => a.clouds - b.clouds).slice(0, 5))
const cloudiestSkyCities = computed(() => [...cityRecords.value].sort((a, b) => b.clouds - a.clouds).slice(0, 5))

// --- 선택 지역 상세 (같은 전국 데이터에서 조회, 별도 API 호출 없음) ---
const selectedRecord = computed(() => cityRecords.value.find((r) => r.id === selectedCityId.value) ?? null)

const selectedSunriseLabel = computed(() => (selectedRecord.value ? formatLocalTime(selectedRecord.value.sunrise, selectedRecord.value.timezone) : '--:--'))
const selectedSunsetLabel = computed(() => (selectedRecord.value ? formatLocalTime(selectedRecord.value.sunset, selectedRecord.value.timezone) : '--:--'))
const selectedDayLengthLabel = computed(() => (selectedRecord.value ? dayLengthLabel(selectedRecord.value) : '-'))

// 관측 적합도: 구름량 + 시정을 함께 봐서 3단계로 판정 (기상청 관측 환경 등급 방식을 단순화)
const observationStatus = computed(() => {
  const r = selectedRecord.value
  if (!r) return null
  if (r.clouds <= 20 && r.visibility >= 8000) return { label: '양호', tone: 'good' }
  if (r.clouds <= 60 && r.visibility >= 4000) return { label: '보통', tone: 'warn' }
  return { label: '주의', tone: 'bad' }
})

// 일출~일몰 사이 낮 구간과 현재 시각을 24시간 타임라인 위 % 위치로 변환
const dayTimeline = computed(() => {
  const r = selectedRecord.value
  if (!r) return null
  const localHour = (unixSec) => {
    const local = new Date((unixSec + r.timezone) * 1000)
    return local.getUTCHours() + local.getUTCMinutes() / 60
  }
  const sunriseFrac = (localHour(r.sunrise) / 24) * 100
  const sunsetFrac = (localHour(r.sunset) / 24) * 100
  const nowFrac = ((now.value.getHours() + now.value.getMinutes() / 60 + now.value.getSeconds() / 3600) / 24) * 100
  return { sunriseFrac, sunsetFrac, nowFrac }
})
</script>

<template>
  <div class="astro">
    <header class="dash-header">
      <div class="title-block">
        <h1 class="page-title"><span class="title-marker"></span>천문·관측 통합 대시보드</h1>
        <p class="page-sub">SOLAR &amp; OBSERVATION MONITORING · 전국 {{ cities.length }}개소 실시간 관측</p>
      </div>
      <div class="dash-status">
        <span class="live-badge"><span class="live-dot"></span>LIVE</span>
        <span class="clock">{{ nowLabel }}</span>
        <span class="updated" v-if="lastUpdated">최종 갱신 {{ updatedLabel }}</span>
        <button class="refresh-btn" @click="loadAstroData" :disabled="isLoading">
          {{ isLoading ? '갱신 중…' : '↻ 새로고침' }}
        </button>
      </div>
    </header>
    <hr class="divider" />

    <template v-if="isLoading && !cityRecords.length">
      <p class="loading-line">전국 관측망에서 일조 데이터를 수집하는 중...</p>
    </template>
    <template v-else>
      <div class="kpi-grid">
        <div class="kpi-tile">
          <span class="kpi-label">등록 지역</span>
          <span class="kpi-value">{{ cities.length }}<span class="kpi-unit">개소</span></span>
        </div>
        <div class="kpi-tile">
          <span class="kpi-label">평균 일출</span>
          <span class="kpi-value">{{ averageSunrise }}</span>
        </div>
        <div class="kpi-tile">
          <span class="kpi-label">평균 일몰</span>
          <span class="kpi-value">{{ averageSunset }}</span>
        </div>
        <div class="kpi-tile">
          <span class="kpi-label">평균 낮 길이</span>
          <span class="kpi-value">{{ averageDayLengthLabel }}</span>
        </div>
        <div class="kpi-tile">
          <span class="kpi-label">평균 운량</span>
          <span class="kpi-value">{{ averageClouds }}<span class="kpi-unit">%</span></span>
        </div>
        <div class="kpi-tile">
          <span class="kpi-label">평균 체감</span>
          <span class="kpi-value"
            >{{ averageFeelsLike }}<span class="kpi-unit">{{ configStore.unitSymbol }}</span></span
          >
        </div>
        <div class="kpi-tile">
          <span class="kpi-label">평균 기압</span>
          <span class="kpi-value">{{ averagePressure }}<span class="kpi-unit">hPa</span></span>
        </div>
      </div>

      <div class="rank-grid">
        <BaseDashboardCard title="이른 일출 TOP 5">
          <div class="rank-list">
            <div v-for="city in earliestSunriseCities" :key="city.id" class="rank-row">
              <span class="rank-name">{{ city.name }}</span>
              <div class="rank-track">
                <div class="rank-fill sun" :style="{ width: sunriseWidth(city) + '%' }"></div>
              </div>
              <span class="rank-value">{{ formatLocalTime(city.sunrise, city.timezone) }}</span>
            </div>
          </div>
        </BaseDashboardCard>
        <BaseDashboardCard title="늦은 일몰 TOP 5">
          <div class="rank-list">
            <div v-for="city in latestSunsetCities" :key="city.id" class="rank-row">
              <span class="rank-name">{{ city.name }}</span>
              <div class="rank-track">
                <div class="rank-fill sun" :style="{ width: sunsetWidth(city) + '%' }"></div>
              </div>
              <span class="rank-value">{{ formatLocalTime(city.sunset, city.timezone) }}</span>
            </div>
          </div>
        </BaseDashboardCard>
        <BaseDashboardCard title="낮 길이 TOP 5">
          <div class="rank-list">
            <div v-for="city in longestDayCities" :key="city.id" class="rank-row">
              <span class="rank-name">{{ city.name }}</span>
              <div class="rank-track">
                <div class="rank-fill sun" :style="{ width: dayLengthWidth(city) + '%' }"></div>
              </div>
              <span class="rank-value">{{ dayLengthLabel(city) }}</span>
            </div>
          </div>
        </BaseDashboardCard>
      </div>

      <div class="rank-grid">
        <BaseDashboardCard title="맑은 하늘 TOP 5 · 구름량 최저">
          <div class="rank-list">
            <div v-for="city in clearestSkyCities" :key="city.id" class="rank-row">
              <span class="rank-name">{{ city.name }}</span>
              <div class="rank-track">
                <div class="rank-fill good" :style="{ width: cloudWidth(city.clouds) + '%' }"></div>
              </div>
              <span class="rank-value">{{ city.clouds }}%</span>
            </div>
          </div>
        </BaseDashboardCard>
        <BaseDashboardCard title="흐린 하늘 TOP 5 · 구름량 최고">
          <div class="rank-list">
            <div v-for="city in cloudiestSkyCities" :key="city.id" class="rank-row">
              <span class="rank-name">{{ city.name }}</span>
              <div class="rank-track">
                <div class="rank-fill bad" :style="{ width: cloudWidth(city.clouds) + '%' }"></div>
              </div>
              <span class="rank-value">{{ city.clouds }}%</span>
            </div>
          </div>
        </BaseDashboardCard>
      </div>

      <BaseDashboardCard title="지역 상세 리포트">
        <label class="city-picker">
          지역 선택
          <select v-model="selectedCityId">
            <option v-for="c in cities" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>

        <template v-if="selectedRecord">
          <div class="station-head">
            <h2 class="city-name">{{ selectedRecord.name }}</h2>
            <span class="status-badge" :class="`tone-${observationStatus.tone}`"> 관측 적합도 {{ observationStatus.label }} · 구름 {{ selectedRecord.clouds }}% </span>
          </div>
          <p class="temp-line">기온 {{ displayTemp(selectedRecord.temp) }}{{ configStore.unitSymbol }} · {{ selectedRecord.status }}</p>

          <div class="day-timeline" v-if="dayTimeline">
            <div
              class="day-segment"
              :style="{
                left: dayTimeline.sunriseFrac + '%',
                width: dayTimeline.sunsetFrac - dayTimeline.sunriseFrac + '%',
              }"
            ></div>
            <div class="now-marker" :style="{ left: dayTimeline.nowFrac + '%' }"></div>
            <span class="tl-tick" style="left: 0%">00</span>
            <span class="tl-tick" style="left: 25%">06</span>
            <span class="tl-tick" style="left: 50%">12</span>
            <span class="tl-tick" style="left: 75%">18</span>
            <span class="tl-tick tl-tick-end">24</span>
            <span class="tl-label" :style="{ left: dayTimeline.sunriseFrac + '%' }">일출 {{ selectedSunriseLabel }}</span>
            <span class="tl-label tl-label-right" :style="{ left: dayTimeline.sunsetFrac + '%' }">일몰 {{ selectedSunsetLabel }}</span>
          </div>

          <div class="astro-grid">
            <div class="astro-card">
              <span class="astro-label">일출</span>
              <span class="astro-value">{{ selectedSunriseLabel }}</span>
            </div>
            <div class="astro-card">
              <span class="astro-label">일몰</span>
              <span class="astro-value">{{ selectedSunsetLabel }}</span>
            </div>
            <div class="astro-card">
              <span class="astro-label">낮 길이</span>
              <span class="astro-value">{{ selectedDayLengthLabel }}</span>
            </div>
            <div class="astro-card">
              <span class="astro-label">체감온도</span>
              <span class="astro-value">{{ displayTemp(selectedRecord.feelsLike) }}{{ configStore.unitSymbol }}</span>
            </div>
            <div class="astro-card">
              <span class="astro-label">습도</span>
              <span class="astro-value">{{ selectedRecord.humidity }}%</span>
            </div>
            <div class="astro-card">
              <span class="astro-label">기압</span>
              <span class="astro-value">{{ selectedRecord.pressure }}hPa</span>
            </div>
            <div class="astro-card">
              <span class="astro-label">가시거리</span>
              <span class="astro-value">{{ (selectedRecord.visibility / 1000).toFixed(1) }}km</span>
            </div>
            <div class="astro-card">
              <span class="astro-label">운량</span>
              <span class="astro-value">{{ selectedRecord.clouds }}%</span>
            </div>
            <div class="astro-card">
              <span class="astro-label">풍속</span>
              <span class="astro-value">{{ selectedRecord.windSpeed.toFixed(1) }}m/s</span>
            </div>
          </div>
        </template>
      </BaseDashboardCard>
    </template>

    <RouterLink to="/" class="back-btn">← 대시보드로 돌아가기</RouterLink>
  </div>
</template>

<style scoped>
.astro {
  padding: 8px clamp(4px, 2vw, 24px) 64px;
}

/* HUD 톤 상태 색상: 양호(시안) / 보통·주의(앰버) / 불량(로즈) — Stats 페이지와 동일 팔레트 원칙 */
.astro {
  --stat-warn: #fb923c;
  --stat-bad: #fb7185;
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

.kpi-unit {
  margin-left: 3px;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--metal-500);
}

.rank-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rank-row {
  display: grid;
  grid-template-columns: 56px 1fr auto;
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

.rank-fill.sun {
  background: var(--metal-400);
}

.rank-fill.good {
  background: var(--hud-cyan);
}

.rank-fill.bad {
  background: var(--stat-warn);
}

.rank-value {
  text-align: right;
  font-weight: 700;
  color: var(--metal-900);
  white-space: nowrap;
}

.city-picker {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 20px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--metal-600);
}

.city-picker select {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--metal-800);
  border: 1px solid var(--metal-300);
  border-radius: var(--radius-md);
  background: var(--metal-50);
  padding: 6px 10px;
}

.station-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}

.city-name {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--metal-900);
  text-shadow: var(--hud-glow-text);
}

.status-badge {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid transparent;
}

.status-badge.tone-good {
  color: var(--hud-cyan);
  background: rgba(34, 211, 238, 0.1);
  border-color: rgba(34, 211, 238, 0.35);
}

.status-badge.tone-warn {
  color: var(--stat-warn);
  background: rgba(251, 146, 60, 0.12);
  border-color: rgba(251, 146, 60, 0.4);
}

.status-badge.tone-bad {
  color: var(--stat-bad);
  background: rgba(251, 113, 133, 0.12);
  border-color: rgba(251, 113, 133, 0.4);
}

.temp-line {
  margin: 0 0 20px;
  font-family: var(--font-mono);
  font-size: 0.95rem;
  color: var(--metal-700);
}

.day-timeline {
  position: relative;
  height: 34px;
  margin: 0 0 28px;
  border-radius: 999px;
  background: var(--metal-100);
  border: 1px solid var(--metal-200);
  overflow: visible;
}

.day-segment {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(56, 189, 248, 0.22);
  border-radius: 999px;
}

.now-marker {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 2px;
  background: var(--hud-cyan);
  box-shadow: 0 0 8px var(--hud-cyan);
  transform: translateX(-50%);
}

.tl-tick {
  position: absolute;
  bottom: -18px;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--metal-500);
}

.tl-tick-end {
  left: 100% !important;
}

.tl-label {
  position: absolute;
  top: -20px;
  transform: translateX(-50%);
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  color: var(--metal-600);
}

.tl-label-right {
  transform: translateX(-100%);
}

.astro-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
}

.astro-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid var(--metal-200);
  border-radius: var(--radius-md);
  background: var(--hud-panel-bg);
  box-shadow: var(--shadow-card);
  transition:
    transform 0.15s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.astro-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--metal-300);
}

.astro-label {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--metal-500);
}

.astro-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--metal-900);
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
