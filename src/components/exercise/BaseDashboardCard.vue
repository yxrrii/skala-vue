<script setup>
defineProps({
  title: { type: String, default: '' },
})
</script>

<template>
  <div class="dashboard-card">
    <h2 v-if="title">{{ title }}</h2>
    <slot></slot>
  </div>
</template>

<style scoped>
.dashboard-card {
  position: relative;
  border: 1px solid var(--metal-200);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 16px;
  background: var(--hud-panel-bg);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: var(--shadow-card);
  transition:
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.dashboard-card::before,
.dashboard-card::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid var(--hud-cyan);
  opacity: 0.7;
  pointer-events: none;
}

.dashboard-card::before {
  top: -1px;
  left: -1px;
  border-right: none;
  border-bottom: none;
  border-top-left-radius: 4px;
}

.dashboard-card::after {
  bottom: -1px;
  right: -1px;
  border-left: none;
  border-top: none;
  border-bottom-right-radius: 4px;
}

.dashboard-card:hover {
  box-shadow: var(--shadow-card-hover);
  border-color: var(--metal-300);
}

.dashboard-card h2 {
  margin-top: 0;
  margin-bottom: 14px;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--metal-800);
  text-shadow: var(--hud-glow-text);
}
</style>
