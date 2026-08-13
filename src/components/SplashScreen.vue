<script setup>
// 앱 최초 진입 시 "정부 시스템 부팅" 느낌의 스플래시: 진행률은 시뮬레이션으로 92%까지 채우다가,
// 홈 화면의 날씨 API 응답이 끝나면(appBootStore.isWeatherReady) 100%로 마무리하고 사라진다.
// 홈이 아닌 경로로 바로 들어온 경우를 대비해 안전 타임아웃도 둔다.
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAppBootStore } from '../stores/appBootStore.js'

const appBootStore = useAppBootStore()

const MIN_DISPLAY_MS = 900
const SAFETY_TIMEOUT_MS = 6000

const progress = ref(0)
const isDone = ref(false)
const statusIndex = ref(0)

const statusMessages = ['시스템 초기화 중...', '국가 기상 위성망 연결 중...', '전국 지역 데이터 인증 중...', '실시간 데이터 동기화 중...']
// 100% 도달 후에는 "접속 완료" 문구로 잠깐 멈춰서, 진행이 끝났다는 걸 눈으로 느낄 수 있게 한다
const isComplete = ref(false)
const statusLabel = computed(() => (isComplete.value ? '접속 완료' : statusMessages[statusIndex.value % statusMessages.length]))

let progressTimer = null
let statusTimer = null
let safetyTimer = null
let holdTimer = null
let finishTimer = null
const mountedAt = Date.now()

const finish = () => {
  if (isDone.value || isComplete.value) return
  clearInterval(progressTimer)
  clearInterval(statusTimer)
  clearTimeout(safetyTimer)
  progress.value = 100
  isComplete.value = true
  // 100%에서 잠깐 머무른 뒤, 스플래시가 사라지는 것과 동시에 본문 페이드인을 시작한다
  holdTimer = setTimeout(() => {
    isDone.value = true
    appBootStore.markBootComplete()
    finishTimer = setTimeout(() => {
      document.body.style.overflow = ''
    }, 450)
  }, 250)
}

onMounted(() => {
  document.body.style.overflow = 'hidden'

  progressTimer = setInterval(() => {
    // 92%까지는 점점 느려지는 시뮬레이션 진행률 — 실제 응답 전까지는 100%가 되지 않는다
    progress.value = Math.min(progress.value + (92 - progress.value) * 0.1 + 0.25, 92)
  }, 90)

  statusTimer = setInterval(() => {
    statusIndex.value += 1
  }, 900)

  safetyTimer = setTimeout(finish, SAFETY_TIMEOUT_MS)
})

watch(
  () => appBootStore.isWeatherReady,
  (ready) => {
    if (!ready) return
    const elapsed = Date.now() - mountedAt
    setTimeout(finish, Math.max(MIN_DISPLAY_MS - elapsed, 0))
  },
)

onUnmounted(() => {
  clearInterval(progressTimer)
  clearInterval(statusTimer)
  clearTimeout(safetyTimer)
  clearTimeout(holdTimer)
  clearTimeout(finishTimer)
  document.body.style.overflow = ''
})
</script>

<template>
  <Transition name="splash-fade">
    <div v-if="!isDone" class="splash" aria-hidden="true">
      <div class="splash-frame">
        <div class="splash-corner splash-corner-tl"></div>
        <div class="splash-corner splash-corner-br"></div>
        <p class="splash-eyebrow">NATIONAL WEATHER OPERATIONS</p>
        <h1 class="splash-title">기상 관측 통합 시스템</h1>
        <div class="splash-bar-track">
          <div class="splash-bar-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <div class="splash-meta">
          <span class="splash-status">{{ statusLabel }}</span>
          <span class="splash-percent">{{ Math.floor(progress) }}%</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.splash {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse 900px 560px at 50% 40%, rgba(56, 189, 248, 0.12) 0%, rgba(56, 189, 248, 0) 65%), #030710;
}

.splash-frame {
  position: relative;
  width: min(480px, 88vw);
  padding: 40px clamp(24px, 5vw, 44px);
  text-align: center;
}

.splash-corner {
  position: absolute;
  width: 28px;
  height: 28px;
  border: 2px solid var(--hud-cyan);
  opacity: 0.7;
}

.splash-corner-tl {
  top: 0;
  left: 0;
  border-right: none;
  border-bottom: none;
}

.splash-corner-br {
  bottom: 0;
  right: 0;
  border-left: none;
  border-top: none;
}

.splash-eyebrow {
  margin: 0 0 10px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  color: var(--hud-cyan);
}

.splash-title {
  margin: 0 0 32px;
  font-size: clamp(1.3rem, 4vw, 1.7rem);
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--metal-900);
  text-shadow: var(--hud-glow-text);
}

.splash-bar-track {
  height: 6px;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.25);
  overflow: hidden;
  margin-bottom: 12px;
}

.splash-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--holo-1), var(--hud-cyan));
  box-shadow: 0 0 10px rgba(34, 211, 238, 0.6);
  transition: width 0.15s ease-out;
}

.splash-meta {
  display: flex;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: var(--metal-500);
}

.splash-percent {
  color: var(--metal-700);
  font-weight: 700;
}

.splash-fade-enter-active {
  transition: opacity 0.2s ease;
}

.splash-fade-leave-active {
  transition:
    opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1),
    filter 0.45s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

.splash-fade-enter-from {
  opacity: 0;
}

.splash-fade-leave-to {
  opacity: 0;
  filter: blur(10px);
  transform: scale(1.03);
}
</style>
