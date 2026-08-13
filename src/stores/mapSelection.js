import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useMapSelectionStore = defineStore('mapSelection', () => {
  const level = ref('nation')
  const sidoCode = ref(null)

  function selectSido(code) {
    level.value = 'sido'
    sidoCode.value = code
  }

  function reset() {
    level.value = 'nation'
    sidoCode.value = null
  }

  return { level, sidoCode, selectSido, reset }
})
