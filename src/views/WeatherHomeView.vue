<script setup>
import { ref, computed, watch, watchEffect, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BaseDashboardCard from '../components/exercise/BaseDashboardCard.vue'
import SearchBar from '../components/exercise/SearchBar.vue'
import WeatherCard from '../components/exercise/WeatherCard.vue'
import WeatherStatusBar from '../components/weather/WeatherStatusBar.vue'
import KoreaDrilldownMap from '../components/map/KoreaDrilldownMap.vue'
import UnitToggler from '../components/UnitToggler.vue'
import { cities } from '../data/cities.js'
import { fetchCurrentWeather, fetchGeocode, fetchReverseGeocode } from '../api/weather.js'
import { fetchMyLocation } from '../api/geo.js'
import { mapWithConcurrency } from '../utils/concurrency.js'
import { useAppBootStore } from '../stores/appBootStore.js'

const router = useRouter()
const appBootStore = useAppBootStore()

const weatherList = ref([])
const isLoading = ref(true)
const myLocationIp = ref(null)
const myLocationGps = ref(null)
const ipLocationError = ref('')
const gpsLocationError = ref('')
const isLocating = ref(false)

// OpenWeatherMap 현재 날씨 API로 대한민국 85개 시의 실시간 데이터를 채운다 (과제 요구사항 1)
// 한 번에 85건을 요청하면 무료 API 요금제의 분당 호출 제한에 걸릴 수 있어 동시 10건씩 나눠 호출한다
const loadWeatherList = async () => {
  isLoading.value = true
  try {
    weatherList.value = await mapWithConcurrency(cities, 10, async ({ id, name, lat, lon }) => {
      const data = await fetchCurrentWeather({ lat, lon })
      return { id, name, temp: Math.round(data.main.temp), status: data.weather[0].description }
    })
  } catch (error) {
    console.error('날씨 목록을 가져오지 못했습니다:', error)
    alert('날씨 데이터를 가져오지 못했습니다. API 키를 확인하세요.')
  } finally {
    isLoading.value = false
  }
}

// IP 기반 위치 API(ipapi.co)로 위치를 찾고, 그 좌표로 OpenWeatherMap 날씨를 조회 (과제 요구사항 3)
const locateByIp = async () => {
  try {
    const { latitude, longitude, city: cityName } = await fetchMyLocation()
    const data = await fetchCurrentWeather({ lat: latitude, lon: longitude })
    myLocationIp.value = {
      name: cityName ?? data.name,
      temp: Math.round(data.main.temp),
      status: data.weather[0].description,
    }
  } catch (error) {
    console.error('IP 기반 위치 날씨를 가져오지 못했습니다:', error)
    ipLocationError.value = 'IP 기반 위치 날씨를 가져오지 못했습니다.'
  }
}

// 브라우저 Geolocation API(GPS/Wi-Fi)로 위치를 찾고, 그 좌표로 OpenWeatherMap 날씨를 조회
const locateByGps = async () => {
  try {
    const position = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('이 브라우저는 위치 정보를 지원하지 않습니다.'))
        return
      }
      navigator.geolocation.getCurrentPosition(resolve, reject)
    })
    const { latitude, longitude } = position.coords
    const data = await fetchCurrentWeather({ lat: latitude, lon: longitude })
    myLocationGps.value = {
      name: data.name,
      temp: Math.round(data.main.temp),
      status: data.weather[0].description,
    }
  } catch (error) {
    console.error('GPS 기반 위치 날씨를 가져오지 못했습니다:', error)
    gpsLocationError.value = 'GPS 기반 위치 날씨를 가져오지 못했습니다. (위치 권한을 확인하세요)'
  }
}

// 버튼 클릭 시 IP 기반과 GPS 기반 위치를 동시에 조회
const locateMe = async () => {
  isLocating.value = true
  myLocationIp.value = null
  myLocationGps.value = null
  ipLocationError.value = ''
  gpsLocationError.value = ''
  await Promise.allSettled([locateByIp(), locateByGps()])
  isLocating.value = false
}

// 내 위치 날씨를 팝오버로 표시: 검색/날씨 목록 레이아웃을 밀어내지 않도록 결과를 오버레이로 띄운다
const isLocationOpen = ref(false)
const toggleLocationPopover = async () => {
  if (isLocationOpen.value) {
    isLocationOpen.value = false
    return
  }
  isLocationOpen.value = true
  await locateMe()
}

// 두 위치의 도시명이 같으면 하나만, 다르면 둘 다 보여주기 위한 일치 여부 판단
const locationsMatch = computed(() => {
  if (!myLocationIp.value || !myLocationGps.value) return false
  const normalize = (name) => name.trim().toLowerCase()
  return normalize(myLocationIp.value.name) === normalize(myLocationGps.value.name)
})

onMounted(async () => {
  await loadWeatherList()
  // 스플래시 화면에 "날씨 API 응답 완료" 신호를 보낸다 (성공/실패 모두 loadWeatherList가 이미 처리)
  appBootStore.markWeatherReady()
})

const searchQuery = ref('')
const selectedCityInfo = ref(null)
const sortAscending = ref(true)

const searchResults = ref([])
const isSearching = ref(false)
const searchError = ref('')
let searchTimer = null
// 지도 클릭으로 searchQuery를 세팅할 때, 아래 텍스트 검색 debounce가 함께 발동해
// 지도 좌표로 조회한 단일 결과를 덮어쓰지 않도록 다음 watch 1회를 건너뛰기 위한 플래그
let suppressNextSearch = false

// 검색어 끝의 시/특별시/광역시 접미사를 제거해 로컬 도시 목록과 비교할 수 있게 한다
const stripSiSuffix = (name) => name.replace(/(특별자치시|특별시|광역시|자치시|시)$/, '')

// 두 좌표가 사실상 같은 지점인지 판단(중복 결과 제거용, 약 1km 이내)
const isSameSpot = (a, b) => Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01

// 검색어로 대한민국(남한) 전역 시/군/구를 조회 - OpenWeatherMap Geocoding API + 현재 날씨 API 연동
// OpenWeatherMap Geocoding이 '시' 접미사 없이는 일부 도시(예: 태백, 강릉)를 찾지 못하는 경우가 있어,
// 이미 좌표를 확보해 둔 85개 시 목록을 먼저 찾아보고, 거기 없는 세부 지역(구/군/동 등)만 API로 보강한다
const searchNationwide = async (query) => {
  isSearching.value = true
  searchError.value = ''
  try {
    const normalizedQuery = stripSiSuffix(query)
    const localMatches = cities.filter((c) => c.name.includes(normalizedQuery) || normalizedQuery.includes(c.name)).map((c) => ({ lat: c.lat, lon: c.lon, name: c.name, local_names: { ko: c.name } }))

    let geoMatches = []
    try {
      geoMatches = await fetchGeocode(query)
    } catch (error) {
      console.error('Geocoding 조회에 실패했습니다:', error)
    }
    const extraMatches = geoMatches.filter((g) => !localMatches.some((c) => isSameSpot(c, g)))
    const matches = [...localMatches, ...extraMatches]

    if (matches.length === 0) {
      searchResults.value = []
      searchError.value = '검색 결과가 없습니다. 시/군/구 이름으로 검색해보세요. (예: 해운대구, 수원시)'
      return
    }

    searchResults.value = await Promise.all(
      matches.map(async (match) => {
        const data = await fetchCurrentWeather({ lat: match.lat, lon: match.lon })
        const isAmbiguous = matches.filter((m) => m.name === match.name).length > 1
        const displayName = match.local_names?.ko ?? match.name
        let name = displayName
        // 동명 지역(예: 전국 5곳의 "중구")은 소속 상위 지역명을 붙여 구분한다
        if (isAmbiguous) {
          try {
            const [parent] = await fetchReverseGeocode({ lat: match.lat, lon: match.lon })
            const parentName = parent?.local_names?.ko ?? parent?.name
            name = parentName && parentName !== displayName ? `${displayName} (${parentName})` : `${displayName} (${match.lat.toFixed(2)}, ${match.lon.toFixed(2)})`
          } catch (error) {
            console.error('상위 지역명을 가져오지 못했습니다:', error)
            name = `${displayName} (${match.lat.toFixed(2)}, ${match.lon.toFixed(2)})`
          }
        }
        return {
          id: `geo-${match.lat.toFixed(4)}-${match.lon.toFixed(4)}`,
          name,
          temp: Math.round(data.main.temp),
          status: data.weather[0].description,
          lat: match.lat,
          lon: match.lon,
        }
      }),
    )
  } catch (error) {
    console.error('시군구 검색에 실패했습니다:', error)
    searchError.value = '검색 중 오류가 발생했습니다.'
  } finally {
    isSearching.value = false
  }
}

// 검색어 입력 500ms 후 전국 검색 실행(디바운스), 검색어가 비면 기본 도시 목록으로 복귀
// 지도 클릭으로 인한 searchQuery 변경은 suppressNextSearch로 건너뛴다(아래 onMapRegionSelect 참고)
watch(searchQuery, (query) => {
  if (suppressNextSearch) {
    suppressNextSearch = false
    return
  }
  clearTimeout(searchTimer)
  const trimmed = query.trim()
  if (trimmed === '') {
    searchResults.value = []
    searchError.value = ''
    return
  }
  searchTimer = setTimeout(() => searchNationwide(trimmed), 500)
})

// 검색 중이면 전국 검색 결과를, 아니면 기본 도시 목록을 정렬해서 보여준다
const displayedWeatherList = computed(() => {
  const source = searchQuery.value.trim() !== '' ? searchResults.value : weatherList.value
  return [...source].sort((a, b) => (sortAscending.value ? a.temp - b.temp : b.temp - a.temp))
})

const statusMessage = computed(() => (selectedCityInfo.value ? `[${selectedCityInfo.value.name}] 선택되었습니다.` : ''))

// SearchBar의 update-query 이벤트 처리
const onUpdateQuery = (value) => {
  searchQuery.value = value
}

// KoreaDrilldownMap의 region-select 이벤트 처리 → 클릭한 지역의 날씨를 바로 조회
// 이름이 전국에서 유일해 지오코딩 검색 결과가 1개면 그 좌표(보통 읍/동 중심지)를 쓴다 — 지도 폴리곤 전체의
// 기하학적 중심(geoCentroid)은 평창군처럼 고도차가 큰 넓은 군에서 실제 읍내와 온도가 크게 벌어질 수 있어서다.
// 이름이 여러 지역에 겹치거나(예: 남구) 색인 자체가 없으면(예: 정선군, 울산 동구) geoCentroid로 대체한다.
const onMapRegionSelect = async ({ name, lat, lon }) => {
  clearTimeout(searchTimer)
  suppressNextSearch = true
  searchQuery.value = name
  isSearching.value = true
  searchError.value = ''
  try {
    let targetLat = lat
    let targetLon = lon
    try {
      const geoMatches = await fetchGeocode(name.replace(/군$/, ''))
      if (geoMatches.length === 1) {
        targetLat = geoMatches[0].lat
        targetLon = geoMatches[0].lon
      }
    } catch (error) {
      console.error('지역명 검색에 실패해 지도 좌표를 대신 사용합니다:', error)
    }

    const data = await fetchCurrentWeather({ lat: targetLat, lon: targetLon })
    searchResults.value = [
      {
        id: `map-${targetLat.toFixed(4)}-${targetLon.toFixed(4)}`,
        name,
        temp: Math.round(data.main.temp),
        status: data.weather[0].description,
        lat: targetLat,
        lon: targetLon,
      },
    ]
  } catch (error) {
    console.error('지도에서 선택한 지역의 날씨를 가져오지 못했습니다:', error)
    searchResults.value = []
    searchError.value = '지도에서 선택한 지역의 날씨를 가져오지 못했습니다.'
  } finally {
    isSearching.value = false
  }
}

// WeatherCard의 select-card 이벤트 처리
const pickCity = (city) => {
  selectedCityInfo.value = city
}

// WeatherCard의 click-detail 이벤트 처리 → 상세 페이지로 Programmatic Navigation
// 검색 결과(등록되지 않은 지역)는 위경도를 쿼리로 함께 전달해 상세 페이지에서 조회할 수 있게 한다
const showDetail = (city) => {
  if (city.lat !== undefined && city.lon !== undefined) {
    router.push({ path: '/weather/' + city.id, query: { lat: city.lat, lon: city.lon, name: city.name } })
  } else {
    router.push('/weather/' + city.id)
  }
}

watch(selectedCityInfo, (newCity, oldCity) => {
  console.log(`[watch 감지] 상태바 문구 변경: ${oldCity ? `${oldCity.name} → ` : '없음 → '}${newCity ? newCity.name : '없음'}`)
})

watch(sortAscending, (asc) => {
  console.log('[watch] 정렬 순서 변경:', asc ? '오름차순' : '내림차순')
})

// searchQuery 감시 → 타이핑할 때마다 로그
watchEffect(() => {
  console.log('[watchEffect 자동 호출] searchQuery 변경:', searchQuery.value)
})
</script>

<template>
  <div class="home-view">
    <!-- IP 기반 위치 API(ipapi.co) + 브라우저 GPS로 각각 위치를 찾아 OpenWeatherMap 날씨 표시 (기타 외부 API, 요구사항 3) -->
    <div class="my-location">
      <button class="locate-btn" @click="toggleLocationPopover" :disabled="isLocating">
        {{ isLocating ? '내 위치 확인 중...' : '📍 IP & GPS' }}
      </button>

      <div v-if="isLocationOpen" class="location-backdrop" @click="isLocationOpen = false"></div>
      <div v-if="isLocationOpen" class="location-popover">
        <template v-if="isLocating">
          <p class="location-info">내 위치 확인 중...</p>
        </template>
        <template v-else-if="locationsMatch">
          <p class="location-info">📍 내 위치: {{ myLocationIp.name }} · {{ myLocationIp.temp }}° / {{ myLocationIp.status }}</p>
        </template>
        <template v-else>
          <p class="location-info" v-if="myLocationIp">🌐 IP 기반: {{ myLocationIp.name }} · {{ myLocationIp.temp }}° / {{ myLocationIp.status }}</p>
          <p class="location-info" v-else-if="ipLocationError">{{ ipLocationError }}</p>
          <p class="location-info" v-if="myLocationGps">📡 GPS 기반: {{ myLocationGps.name }} · {{ myLocationGps.temp }}° / {{ myLocationGps.status }}</p>
          <p class="location-info" v-else-if="gpsLocationError">{{ gpsLocationError }}</p>
        </template>
      </div>
    </div>

    <div class="hero-section">
      <!-- 히어로 섹션 왼쪽: 지도 -->
      <div class="hero-map">
        <KoreaDrilldownMap @region-select="onMapRegionSelect" />
      </div>

      <!-- 히어로 섹션 오른쪽: 날씨 대시보드 -->
      <div class="hero-dashboard">
        <!-- BaseDashboardCard의 slot에 SearchBar를 주입 -->
        <!-- 대한민국(남한) 전역 시/군/구 검색: Geocoding API로 지역을 찾아 실시간 날씨를 표시 -->
        <BaseDashboardCard title="🔍 도시 검색">
          <SearchBar :search-query="searchQuery" @update-query="onUpdateQuery" />
          <p class="search-hint">전국 시/군/구 이름으로 검색해보세요. (예: 해운대구, 춘천시, 영통구)</p>
        </BaseDashboardCard>

        <!-- BaseDashboardCard의 slot에 날씨 현황(WeatherCard 목록)을 주입 -->
        <div class="weather-status-wrapper">
          <UnitToggler class="weather-status-unit-toggle" />
          <BaseDashboardCard title="🌤️ 날씨 현황">
            <button class="sort-toggle" @click="sortAscending = !sortAscending">↑↓ 정렬: {{ sortAscending ? '오름차순' : '내림차순' }}</button>

            <div class="weather-list-scroll">
              <template v-if="isLoading">
                <p>날씨 데이터를 불러오는 중...</p>
              </template>
              <template v-else-if="searchQuery.trim() !== '' && isSearching">
                <p>전국 시/군/구 검색 중...</p>
              </template>
              <template v-else-if="searchQuery.trim() !== '' && searchError">
                <p>{{ searchError }}</p>
              </template>
              <template v-else>
                <WeatherCard v-for="city in displayedWeatherList" :key="city.id" :city="city" @select-card="pickCity" @click-detail="showDetail" />
              </template>
            </div>
          </BaseDashboardCard>
        </div>
      </div>
    </div>

    <WeatherStatusBar :message="statusMessage" />
  </div>
</template>

<style scoped>
.hero-section {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 16px;
}

.hero-map {
  flex: 1 1 58%;
  min-width: 380px;
}

.hero-dashboard {
  flex: 1 1 42%;
  min-width: 320px;
}

.weather-status-wrapper {
  position: relative;
}

.weather-status-unit-toggle {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1;
}

.weather-list-scroll {
  max-height: 480px;
  overflow-y: auto;
  padding-right: 4px;
}

.sort-toggle {
  margin-bottom: 12px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
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

.sort-toggle:hover {
  border-color: var(--hud-cyan);
  color: var(--metal-900);
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.3);
}

.my-location {
  position: fixed;
  top: 35px;
  left: 64px;
  transform: translateY(-50%);
  z-index: 22;
}

.location-backdrop {
  position: fixed;
  inset: 0;
  z-index: 25;
}

.location-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 30;
  min-width: 280px;
  max-width: min(360px, 90vw);
  padding: 14px 16px;
  border: 1px solid var(--metal-200);
  border-radius: var(--radius-md);
  background: var(--hud-panel-bg-strong);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: var(--shadow-card-hover);
}

.locate-btn {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--metal-800);
  background: var(--hud-panel-bg-strong);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--metal-300);
  border-radius: 999px;
  padding: 9px 16px;
  cursor: pointer;
  box-shadow: var(--shadow-card);
  transition:
    box-shadow 0.2s ease,
    transform 0.15s ease,
    border-color 0.2s ease;
}

.locate-btn:hover:not(:disabled) {
  border-color: transparent;
  box-shadow:
    0 0 0 1.5px transparent,
    var(--shadow-card-hover);
  background-image: linear-gradient(var(--metal-50), var(--metal-50)), var(--holo-gradient);
  background-origin: border-box;
  background-clip: padding-box, border-box;
}

.locate-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.locate-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.location-info {
  margin-top: 10px;
  font-size: 0.9em;
  color: var(--metal-700);
}

.location-info:first-child {
  margin-top: 0;
}

.search-hint {
  margin-top: 8px;
  color: var(--metal-500);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.01em;
}

/* 모니터(901px 이상)에서는 홈 화면이 뷰포트 안에 딱 맞도록 눌러 담아 문서 스크롤이 생기지
   않게 하고, "날씨 현황" 목록과 지도만 내부적으로 스크롤/축소되게 한다. 폰(900px 이하)은
   기존처럼 문서 스크롤을 그대로 허용한다(아래 mobile 미디어쿼리) */
@media (min-width: 901px) {
  .home-view {
    height: calc(100vh - 84px - 2rem);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .hero-section {
    flex: 1 1 auto;
    min-height: 0;
    align-items: stretch;
    margin-bottom: 12px;
  }

  .hero-map,
  .hero-dashboard {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .weather-status-wrapper {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .weather-status-wrapper :deep(.dashboard-card) {
    flex: 1 1 auto;
    min-height: 0;
    margin-bottom: 0;
    display: flex;
    flex-direction: column;
  }

  .weather-list-scroll {
    flex: 1 1 auto;
    min-height: 0;
    max-height: none;
  }

  /* .dashboard-card가 flex column이 되면서 기본 align-items:stretch 때문에
       정렬 버튼까지 폭 전체로 늘어나던 것을 원래 크기로 되돌림 */
  .sort-toggle {
    align-self: flex-start;
  }

  /* 지도는 남은 세로 공간에 맞춰 축소되도록: KoreaDrilldownMap 내부 레이아웃까지 높이를 전달 */
  .hero-map :deep(.map-layout),
  .hero-map :deep(.map-panel) {
    height: 100%;
    min-height: 0;
  }

  .hero-map :deep(.map-panel) {
    flex: 1 1 auto;
  }

  .hero-map :deep(.map-canvas) {
    flex: 1 1 auto;
    min-height: 0;
  }

  .hero-map :deep(.korea-map) {
    width: 100%;
    height: 100%;
    max-width: none;
  }
}

@media (max-width: 900px) {
  .hero-section {
    flex-direction: column;
    /* 지도를 드릴다운했을 때 뜨는 "← 전체 지도로" 버튼이 지도 영역 맨 위에 붙어 있어서,
           아래로 내린 내 위치 버튼과 겹치던 것을 여백으로 떨어뜨림 */
    margin-top: 30px;
  }

  /* 세로로 쌓일 때는 데스크톱용 고정 min-width(380px/320px)가 화면보다 넓어져
       가로 스크롤을 만들던 것을 제거 */
  .hero-map,
  .hero-dashboard {
    min-width: 0;
  }

  /* 모바일에서는 네비게이션 바와 겹치지 않도록 버튼을 바 아래로 내림 */
  .my-location {
    top: 76px;
    left: 16px;
    transform: none;
  }
}
</style>
