import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useConfigStore = defineStore('config', () => {
  const unit = ref('celsius')

  const unitSymbol = computed(() => (unit.value === 'fahrenheit' ? '°F' : '°C'))

  function toggleUnit() {
    unit.value = unit.value === 'celsius' ? 'fahrenheit' : 'celsius'
  }

  // 나만의 추가 state/action: '더움' 판정 기준 온도(섭씨 기준, 기본 25도)
  const hotThreshold = ref(25)

  function setHotThreshold(value) {
    hotThreshold.value = value
  }

  return { unit, unitSymbol, toggleUnit, hotThreshold, setHotThreshold }
})
