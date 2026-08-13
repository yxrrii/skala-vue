<script setup>
import { ref } from 'vue'

const weatherList = ref([
  { id: 'city_01', name: '서울', temp: 28, status: '맑음' },
  { id: 'city_02', name: '수원', temp: 24, status: '비' },
  { id: 'city_03', name: '부산', temp: 26, status: '구름' },
  { id: 'city_04', name: '제주', temp: 30, status: '맑음' }, // 나만의 데이터 추가
  { id: 'city_05', name: '김해', temp: 22, status: '맑음' }, // 나만의 데이터 추가
])

const searchText = ref('')
const statusMessage = ref('')

const selectCity = (name) => {
  statusMessage.value = `${name}이 선택되었습니다.`
}

const showDetail = (cityName, status) => {
  window.alert(`${cityName}의 현재 날씨는 [${status}] 상태입니다.`)
}
</script>

<template>
  <div>
    <h1>🌥️ 과제 1: 날씨(Mockup)</h1>
    <hr />
    <h2>🔍 도시 검색</h2>

    <!-- 도시 이름 검색 (양방향 바인딩) -->
    <input :value="searchText" @input="searchText = $event.target.value" placeholder="도시 이름을 입력하세요" />
    <!-- <input v-model="searchText" placeholder="도시 이름을 입력하세요" /> -->

    <!-- 한글 조합 중인 값도 즉시 searchText에 반영 -->
    <!-- <input v-model="searchText" @input="searchText = $event.target.value" placeholder="도시 이름을 입력하세요" /> -->
    <p>입력한 도시명: {{ searchText }}</p>

    <!-- 날씨 카드 목록 -->
    <div v-for="city in weatherList" :key="city.id" @click="selectCity(city.name)" style="border: 1px solid #ccc; padding: 10px; margin-bottom: 8px">
      <h3>{{ city.name }}</h3>
      <p>기온: {{ city.temp }}도 / 날씨: {{ city.status }}</p>

      <p v-if="city.temp >= 25">🔥 더움 (25도 이상)</p>
      <p v-else>❄️ 선선함 (25도 미만)</p>

      <button @click.stop="showDetail(city.name, city.status)">상세보기</button>
    </div>

    <!-- 상태바 -->
    <p>{{ statusMessage }}</p>
  </div>
</template>
