<script setup>
import { useConfigStore } from '../stores/configStore.js'

const configStore = useConfigStore()
</script>

<template>
  <button class="unit-toggler" @click="configStore.toggleUnit">🌡️ 단위: {{ configStore.unitSymbol }}</button>
</template>

<style scoped>
.unit-toggler {
  padding: 6px 14px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.02em;
  color: var(--metal-700);
  border: 1px solid var(--metal-300);
  border-radius: 999px;
  background: var(--hud-panel-bg-strong);
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.unit-toggler:hover {
  border-color: var(--hud-cyan);
  color: var(--metal-900);
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.3);
}
</style>
