import { ref } from 'vue'
import { defineStore } from 'pinia'

// 스플래시 화면(SplashScreen.vue)이 "홈 화면의 날씨 API 응답이 끝났는지"를 알 수 있도록
// 신호만 주고받는 전역 상태. 홈 화면의 날씨 조회 로직 자체는 건드리지 않고, 완료 시점에
// 한 번 markWeatherReady()만 호출한다.
export const useAppBootStore = defineStore('appBoot', () => {
  const isWeatherReady = ref(false)
  // 스플래시가 완전히 사라지는 시점 — App.vue가 이 값을 보고 본문을 페이드인시켜
  // "스플래시 사라짐 ↔ 화면 등장"이 하나의 자연스러운 전환처럼 보이게 한다
  const isBootComplete = ref(false)

  function markWeatherReady() {
    isWeatherReady.value = true
  }

  function markBootComplete() {
    isBootComplete.value = true
  }

  return { isWeatherReady, markWeatherReady, isBootComplete, markBootComplete }
})
