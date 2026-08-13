<script setup>
import { ref, computed, watch, watchEffect } from 'vue'

const weatherList = ref([
  { id: 'city_01', name: '서울', temp: 28, status: '맑음' },
  { id: 'city_02', name: '수원', temp: 24, status: '비' },
  { id: 'city_03', name: '부산', temp: 26, status: '구름' },
  { id: 'city_04', name: '제주', temp: 30, status: '맑음' },
  { id: 'city_05', name: '김해', temp: 22, status: '맑음' }, // 나만의 데이터 추가
])

const searchQuery = ref('')
const selectedCityInfo = ref(null)
const sortAscending = ref(true) // 나만의 반응형 상태

// 검색어가 도시 이름에 포함된 항목만 필터링
// const filteredWeatherList = computed(() =>
//     weatherList.value.filter((city) => city.name.includes(searchQuery.value))
// )
const filteredWeatherList = computed(() => {
  if (searchQuery.value.trim() === '') {
    return weatherList.value
  }

  return weatherList.value.filter((city) => city.name.includes(searchQuery.value.trim()))
})

// 나만의 computed: 기온 기준 정렬
const sortedWeatherList = computed(() => [...filteredWeatherList.value].sort((a, b) => (sortAscending.value ? a.temp - b.temp : b.temp - a.temp)))

const statusMessage = computed(() => (selectedCityInfo.value ? `${selectedCityInfo.value.name}이 선택되었습니다.` : ''))

const pickCity = (city) => {
  selectedCityInfo.value = city
}

const showDetail = (cityName, status) => {
  window.alert(`${cityName}의 현재 날씨는 [${status}] 상태입니다.`)
}

// selectedCityInfo 감시 → 상태바 문구가 바뀔 때마다 로그
// watch(selectedCityInfo, (newCity) => {
//     console.log('[watch 감지] 상태바 문구 변경:', newCity ? `${newCity.name}이 선택되었습니다.` : '')
// })
watch(selectedCityInfo, (newCity, oldCity) => {
  console.log(`[watch 감지] 상태바 문구 변경: ${oldCity ? `${oldCity.name} → ` : '없음 → '}${newCity ? newCity.name : '없음'}`)
})

// searchQuery 감시 → 타이핑할 때마다 로그
watchEffect(() => {
  console.log('[watchEffect 자동 호출] searchQuery 변경:', searchQuery.value)
})

// 나만의 watcher: 정렬 순서 변경 감시
watch(sortAscending, (asc) => {
  console.log('[watch] 정렬 순서 변경:', asc ? '오름차순' : '내림차순')
})
</script>

<template>
  <div>
    <h1>🌥️ 과제 2: 날씨 (컴포지션)</h1>
    <hr />
    <h2>🔍 도시 검색 (Computed)</h2>

    <input v-model="searchQuery" placeholder="도시 이름을 입력하세요" />
    <p>검색어: {{ searchQuery }}</p>

    <!-- 나만의 상태: 정렬 순서 토글 -->
    <button @click="sortAscending = !sortAscending">정렬: {{ sortAscending ? '오름차순' : '내림차순' }}</button>

    <!-- 검색 결과 표시 -->
    <template v-if="searchQuery !== '' && filteredWeatherList.length === 0">
      <p>검색 결과와 일치하는 도시가 없습니다.</p>
    </template>
    <template v-else>
      <div v-for="city in sortedWeatherList" :key="city.id" @click="pickCity(city)" style="border: 1px solid #ccc; padding: 10px; margin-bottom: 8px">
        <h3>{{ city.name }}</h3>
        <p>기온: {{ city.temp }}도 / 날씨: {{ city.status }}</p>
        <p v-if="city.temp >= 25">🔥 더움 (25도 이상)</p>
        <p v-else>❄️ 선선함 (25도 미만)</p>
        <button @click.stop="showDetail(city.name, city.status)">상세보기</button>
      </div>
    </template>

    <!-- 상태바 -->
    <p>{{ statusMessage }}</p>
  </div>
</template>
