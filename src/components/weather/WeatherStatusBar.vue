<script setup>
defineProps({
  message: { type: String, default: '' },
})
</script>

<template>
  <p class="status-bar">{{ message }}</p>
</template>

<style scoped>
.status-bar {
  font-weight: 600;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  letter-spacing: 0.01em;
  color: var(--metal-800);
  min-height: 1.2em;
  padding: 0 clamp(4px, 2vw, 24px);
}
</style>
