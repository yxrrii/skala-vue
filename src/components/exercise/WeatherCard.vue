<script setup>
import { computed } from 'vue'
import { useConfigStore } from '../../stores/configStore.js'

const props = defineProps({
  city: { type: Object, required: true },
})

const emit = defineEmits(['select-card', 'click-detail'])

const configStore = useConfigStore()

// 기본 원본 데이터는 섭씨 숫자, 화씨 단위일 때만 변환
const displayTemp = computed(() => {
  const rawTemp = props.city.temp
  if (configStore.unit === 'fahrenheit') {
    return Math.round((rawTemp * 9) / 5 + 32)
  }
  return rawTemp
})
</script>

<template>
  <div class="weather-card" @click="emit('select-card', city)">
    <div class="card-info">
      <h3 class="city-name">{{ city.name }}</h3>
      <p class="temp-line">기온: {{ displayTemp }}{{ configStore.unitSymbol }} / 날씨: {{ city.status }}</p>

      <p class="badge badge-hot" v-if="city.temp >= configStore.hotThreshold">🔥 더움 ({{ configStore.hotThreshold }}도 이상)</p>
      <p class="badge badge-cool" v-else>❄️ 선선함 ({{ configStore.hotThreshold }}도 미만)</p>
    </div>

    <button class="detail-btn" @click.stop="emit('click-detail', city)">상세보기</button>
  </div>
</template>

<style scoped>
.weather-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--metal-200);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  margin-bottom: 10px;
  cursor: pointer;
  background: var(--hud-panel-bg);
  box-shadow: var(--shadow-card);
  transition:
    transform 0.15s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.card-info {
  min-width: 0;
}

.weather-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--metal-300);
}

.city-name {
  margin: 0 0 6px;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--metal-900);
  text-shadow: var(--hud-glow-text);
}

.temp-line {
  margin: 0 0 8px;
  font-family: var(--font-mono);
  font-size: 0.88rem;
  color: var(--metal-700);
}

.badge {
  display: inline-block;
  margin: 0;
  font-size: 0.78rem;
  font-family: var(--font-mono);
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
}

.badge-hot {
  color: #fdba8c;
  background: rgba(251, 146, 60, 0.12);
  border-color: rgba(251, 146, 60, 0.4);
}

.badge-cool {
  color: #7ee5f5;
  background: rgba(34, 211, 238, 0.1);
  border-color: rgba(34, 211, 238, 0.35);
}

.detail-btn {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--metal-700);
  background: var(--metal-50);
  border: 1px solid var(--metal-300);
  border-radius: 999px;
  padding: 5px 14px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}

.detail-btn:hover {
  border-color: var(--hud-cyan);
  color: var(--metal-900);
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.3);
}
</style>
