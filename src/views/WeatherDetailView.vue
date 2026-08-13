<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfigStore } from '../stores/configStore.js'
import { cities } from '../data/cities.js'
import { fetchCurrentWeather, fetchForecast } from '../api/weather.js'

const route = useRoute()
const router = useRouter()
const configStore = useConfigStore()

const city = ref(null)
const forecastList = ref([])
const isLoading = ref(true)

// Mount 시점에 라우트 동적 경로(cityId)로 OpenWeatherMap 현재 날씨 + 예보 API 호출 (과제 요구사항 1, 2)
// 등록된 도시 목록에 없으면(전국 검색 결과에서 진입), 라우트 쿼리로 전달된 위경도를 사용한다
onMounted(async () => {
  let target = cities.find((c) => c.id === route.params.cityId)
  if (!target && route.query.lat && route.query.lon) {
    target = {
      id: route.params.cityId,
      name: route.query.name ?? '',
      lat: Number(route.query.lat),
      lon: Number(route.query.lon),
    }
  }
  if (!target) {
    isLoading.value = false
    return
  }
  try {
    const [current, forecast] = await Promise.all([fetchCurrentWeather(target), fetchForecast(target)])
    city.value = {
      id: target.id,
      name: target.name,
      temp: current.main.temp,
      status: current.weather[0].description,
      humidity: current.main.humidity,
      windSpeed: current.wind.speed,
    }
    // 5일/3시간 예보는 3시간 간격이라 그대로 보여주면 하루 단위로 파악하기 애매해서,
    // 날짜별로 묶어 최저/최고 기온과 낮 시간대(12~15시에 가장 가까운 항목) 날씨를 대표값으로 뽑는다.
    // dt_txt는 UTC 기준이라 그대로 자르면 한국 시간 기준 날짜 경계와 어긋날 수 있어,
    // city.timezone(UTC 오프셋, 초)을 더한 현지 시각으로 날짜를 구한다
    const tzOffsetSec = forecast.city?.timezone ?? 0
    const toLocalDateParts = (unixSec) => {
      const local = new Date((unixSec + tzOffsetSec) * 1000)
      const date = local.toISOString().slice(0, 10)
      const hour = local.getUTCHours()
      return { date, hour }
    }
    const dailyBuckets = new Map()
    forecast.list.forEach((item) => {
      const { date, hour } = toLocalDateParts(item.dt)
      if (!dailyBuckets.has(date)) dailyBuckets.set(date, [])
      dailyBuckets.get(date).push({ ...item, localHour: hour })
    })
    forecastList.value = [...dailyBuckets.entries()].slice(0, 5).map(([date, items]) => {
      const temps = items.map((item) => item.main.temp)
      const representative = items.reduce((closest, item) => (Math.abs(item.localHour - 13.5) < Math.abs(closest.localHour - 13.5) ? item : closest))
      return {
        date,
        label: date.slice(5).replace('-', '/'),
        minTemp: Math.round(Math.min(...temps)),
        maxTemp: Math.round(Math.max(...temps)),
        status: representative.weather[0].description,
      }
    })
  } catch (error) {
    console.error('상세 날씨 정보를 가져오지 못했습니다:', error)
    alert('상세 날씨 정보를 가져오지 못했습니다.')
  } finally {
    isLoading.value = false
  }
})

// 기본 원본 데이터는 섭씨, 화씨 단위일 때만 변환
const displayTemp = computed(() => {
  const rawTemp = city.value?.temp
  if (configStore.unit === 'fahrenheit') {
    return Math.round((rawTemp * 9) / 5 + 32)
  }
  return Math.round(rawTemp)
})
</script>

<template>
  <div class="detail">
    <h1 class="page-title"><span class="title-marker"></span>🌡️ 상세 기상관측 정보</h1>
    <hr class="divider" />

    <template v-if="isLoading">
      <p class="loading-line">날씨 정보를 불러오는 중...</p>
    </template>
    <template v-else-if="city">
      <h2 class="city-name">{{ city.name }}</h2>
      <p class="temp-line">기온: {{ displayTemp }}{{ configStore.unitSymbol }} / 날씨: {{ city.status }}</p>
      <p class="stat-line">습도: {{ city.humidity }}%</p>
      <p class="stat-line">풍속: {{ city.windSpeed }}m/s</p>

      <h3 class="section-label">📅 5일 예보 (일별)</h3>
      <ul class="forecast-list">
        <li v-for="day in forecastList" :key="day.date">
          <span class="day-label">{{ day.label }}</span>
          <span class="day-temp">{{ day.minTemp }}° ~ {{ day.maxTemp }}°</span>
          <span class="day-status">{{ day.status }}</span>
        </li>
      </ul>
    </template>
    <template v-else>
      <p class="loading-line">해당 도시 정보를 찾을 수 없습니다. (cityId: {{ route.params.cityId }})</p>
    </template>

    <button class="back-btn" @click="router.push('/')">← 대시보드로 돌아가기</button>
  </div>
</template>

<style scoped>
.detail {
  max-width: 640px;
  margin: 0 auto;
  padding: 8px clamp(4px, 2vw, 24px) 64px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  color: var(--metal-500);
}

.title-marker {
  width: 8px;
  height: 8px;
  background: var(--metal-600);
  border-radius: 2px;
  flex-shrink: 0;
}

.divider {
  border: none;
  border-top: 1px solid var(--metal-200);
  margin: 0 0 24px;
}

.loading-line {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--metal-500);
}

.city-name {
  margin: 0 0 8px;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--metal-900);
  text-shadow: var(--hud-glow-text);
}

.temp-line {
  margin: 0 0 6px;
  font-family: var(--font-mono);
  font-size: 1rem;
  color: var(--metal-800);
}

.stat-line {
  margin: 0 0 4px;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--metal-600);
}

.section-label {
  margin: 32px 0 14px;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--metal-800);
}

.forecast-list {
  list-style: none;
  margin: 0 0 24px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.forecast-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--metal-200);
  border-radius: var(--radius-md);
  background: var(--hud-panel-bg);
  box-shadow: var(--shadow-card);
  transition:
    transform 0.15s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.forecast-list li:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--metal-300);
}

.day-label {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--metal-500);
  min-width: 48px;
}

.day-temp {
  font-weight: 700;
  color: var(--metal-900);
}

.day-status {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--metal-600);
  text-align: right;
}

.back-btn {
  margin-top: 8px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--metal-700);
  background: var(--metal-50);
  border: 1px solid var(--metal-300);
  border-radius: 999px;
  padding: 8px 16px;
  cursor: pointer;
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
</style>
