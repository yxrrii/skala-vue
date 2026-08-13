<script setup>
import { ref, computed, watch } from 'vue'
import BaseDashboardCard from './BaseDashboardCard.vue'
import SearchBar from './SearchBar.vue'
import WeatherCard from './WeatherCard.vue'
import WeatherStatusBar from './WeatherStatusBar.vue'

// 모든 반응형 데이터는 부모 컴포넌트에서 유지
const weatherList = ref([
  { id: 'city_01', name: '서울', temp: 28, status: '맑음' },
  { id: 'city_02', name: '수원', temp: 24, status: '비' },
  { id: 'city_03', name: '부산', temp: 26, status: '구름' },
  { id: 'city_04', name: '제주', temp: 30, status: '맑음' },
  { id: 'city_05', name: '김해', temp: 22, status: '맑음' },
])

const searchQuery = ref('')
const selectedCityInfo = ref(null)
const sortAscending = ref(true)

const filteredWeatherList = computed(() => {
  if (searchQuery.value.trim() === '') {
    return weatherList.value
  }
  return weatherList.value.filter((city) => city.name.includes(searchQuery.value.trim()))
})

const sortedWeatherList = computed(() => [...filteredWeatherList.value].sort((a, b) => (sortAscending.value ? a.temp - b.temp : b.temp - a.temp)))

const statusMessage = computed(() => (selectedCityInfo.value ? `[${selectedCityInfo.value.name}] 선택되었습니다.` : ''))

// SearchBar의 update-query 이벤트 처리
const onUpdateQuery = (value) => {
  searchQuery.value = value
}

// WeatherCard의 select-card 이벤트 처리
const pickCity = (city) => {
  selectedCityInfo.value = city
}

// WeatherCard의 click-detail 이벤트 처리
const showDetail = (city) => {
  window.alert(`${city.name}의 현재 날씨는 [${city.status}] 상태입니다.`)
}

watch(selectedCityInfo, (newCity, oldCity) => {
  console.log(`[watch 감지] 상태바 문구 변경: ${oldCity ? `${oldCity.name} → ` : '없음 → '}${newCity ? newCity.name : '없음'}`)
})

watch(sortAscending, (asc) => {
  console.log('[watch] 정렬 순서 변경:', asc ? '오름차순' : '내림차순')
})
</script>

<template>
  <div>
    <h1>🌥️ 과제 3: 날씨 (컴포넌트 분리)</h1>
    <hr />

    <!-- BaseDashboardCard의 slot에 SearchBar를 주입 -->
    <BaseDashboardCard title="🔍 도시 검색">
      <SearchBar :search-query="searchQuery" @update-query="onUpdateQuery" />
    </BaseDashboardCard>

    <!-- BaseDashboardCard의 slot에 날씨 현황(WeatherCard 목록)을 주입 -->
    <BaseDashboardCard title="🌤️ 날씨 현황">
      <button class="sort-toggle" @click="sortAscending = !sortAscending">↑↓ 정렬: {{ sortAscending ? '오름차순' : '내림차순' }}</button>

      <template v-if="searchQuery !== '' && filteredWeatherList.length === 0">
        <p>검색 결과와 일치하는 도시가 없습니다.</p>
      </template>
      <template v-else>
        <WeatherCard v-for="city in sortedWeatherList" :key="city.id" :city="city" @select-card="pickCity" @click-detail="showDetail" />
      </template>
    </BaseDashboardCard>

    <WeatherStatusBar :message="statusMessage" />
  </div>
</template>

<style scoped>
.sort-toggle {
  margin-bottom: 12px;
}
</style>
