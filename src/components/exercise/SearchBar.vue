<script setup>
defineProps({
  searchQuery: { type: String, required: true },
})

const emit = defineEmits(['update-query'])
</script>

<template>
  <div class="search-bar">
    <input :value="searchQuery" @input="emit('update-query', $event.target.value)" placeholder="도시 이름을 입력하세요" />
  </div>
</template>

<style scoped>
.search-bar input {
  padding: 10px 14px;
  width: 240px;
  max-width: 100%;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--metal-800);
  background: var(--hud-panel-bg-strong);
  border: 1px solid var(--metal-300);
  border-radius: var(--radius-md);
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.search-bar input::placeholder {
  color: var(--metal-500);
}

.search-bar input:focus {
  border-color: var(--hud-cyan);
  box-shadow:
    0 0 0 3px rgba(34, 211, 238, 0.2),
    0 0 16px rgba(34, 211, 238, 0.25);
}
</style>
