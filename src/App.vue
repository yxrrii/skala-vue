<script setup>
import SplashScreen from './components/SplashScreen.vue'
import { useAppBootStore } from './stores/appBootStore.js'

const appBootStore = useAppBootStore()

// 스플래시는 루트('/')로 처음 접속했을 때만 노출한다. /about 등 다른 경로로 바로 들어오면
// 스플래시 없이 바로 화면을 보여줘야 하므로, 그 경우엔 본문 페이드인도 즉시 완료 처리한다.
// window.location.pathname은 최초 진입 시 URL 그대로라 라우터 초기화 타이밍과 무관하게 안전하다.
const isRootEntry = window.location.pathname === '/'
if (!isRootEntry) {
  appBootStore.markBootComplete()
}
</script>

<template>
  <div>
    <!-- 순수 장식용 HUD 프레임: 화면 가장자리 코너 브라켓/눈금/레이더. 로직·상호작용 없음(aria-hidden) -->
    <div class="hud-frame" aria-hidden="true"></div>

    <SplashScreen v-if="isRootEntry" />

    <nav class="nav-bar">
      <div class="nav-links">
        <RouterLink to="/">HOME</RouterLink>
        <RouterLink to="/about">ABOUT</RouterLink>
        <RouterLink to="/stats">STATS</RouterLink>
        <RouterLink to="/astro">ASTRO</RouterLink>
      </div>
    </nav>

    <!-- 스플래시가 사라지는 순간(appBootStore.isBootComplete) 본문도 함께 살짝 페이드인되도록 해
         "스플래시 사라짐 → 화면 등장"이 하나의 전환처럼 이어지게 한다.
         opacity만 사용(transform/filter 금지): RouterView 안의 내 위치 버튼·팝오버 등
         position:fixed 요소들이 이 래퍼를 기준으로 재배치되는 걸 막기 위함 -->
    <div class="app-content" :class="{ 'is-ready': appBootStore.isBootComplete }">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.app-content {
  opacity: 0;
  transition: opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}

.app-content.is-ready {
  opacity: 1;
}

.nav-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 18px 2rem;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 20;
  background: linear-gradient(180deg, rgba(4, 10, 20, 0.97) 0%, rgba(4, 10, 20, 0.9) 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(56, 189, 248, 0.22);
  box-shadow:
    0 1px 0 rgba(56, 189, 248, 0.08),
    0 12px 24px rgba(0, 0, 0, 0.35);
}

/* nav-bar가 이제 화면 진짜 끝까지 100% 폭이라, 코너 브라켓을 hud-frame이 아니라
   nav-bar 자신의 모서리에 얹어서 항상 정확히 겹치도록 한다.
   하단(.hud-frame) 브라켓과 크기(32px)/두께(2px)/인셋(16px)/불투명도(0.6)를 맞춤 */
.nav-bar::before,
.nav-bar::after {
  content: '';
  position: absolute;
  top: 16px;
  width: 32px;
  height: 32px;
  border-top: 2px solid var(--holo-1);
  opacity: 0.6;
  filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.5));
  pointer-events: none;
}

.nav-bar::before {
  left: 16px;
  border-left: 2px solid var(--holo-1);
}

.nav-bar::after {
  right: 16px;
  border-right: 2px solid var(--holo-1);
}

.nav-links {
  display: flex;
  gap: 32px;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.nav-links :deep(a) {
  position: relative;
  color: var(--metal-600);
  padding: 6px 2px;
  transition:
    color 0.2s ease,
    text-shadow 0.2s ease;
}

.nav-links :deep(a::after) {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 2px;
  background: var(--hud-cyan);
  box-shadow: 0 0 8px var(--hud-cyan);
  transform: scaleX(0);
  transition: transform 0.2s ease;
}

.nav-links :deep(a:hover) {
  color: var(--metal-800);
  background: none;
}

.nav-links :deep(a.router-link-active) {
  color: var(--metal-900);
  text-shadow: var(--hud-glow-text);
}

.nav-links :deep(a.router-link-active::after) {
  transform: scaleX(1);
}

/* 뷰포트 가장자리를 감싸는 HUD 프레임: 하단 코너 브라켓 + 좌측 눈금 + 좌하단 레이더 링.
   상단은 이제 100% 폭의 nav-bar가 실제 화면 끝까지 맡으므로, 프레임은 하단 모서리만 담당해
   서로 다른 폭 때문에 어긋나 보이는 문제(화살표처럼 삐져나오던 브라켓)를 없앤다. */
.hud-frame {
  position: fixed;
  inset: 16px;
  z-index: 2;
  pointer-events: none;
  opacity: 0.6;
  background-repeat: no-repeat;
  background-image:
    linear-gradient(var(--holo-1), var(--holo-1)), linear-gradient(var(--holo-1), var(--holo-1)), linear-gradient(var(--holo-1), var(--holo-1)), linear-gradient(var(--holo-1), var(--holo-1));
  background-size:
    32px 2px,
    2px 32px,
    32px 2px,
    2px 32px;
  background-position:
    bottom left,
    bottom left,
    bottom right,
    bottom right;
  filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.5));
}

.hud-frame::before {
  content: '';
  position: absolute;
  left: 0;
  top: 18%;
  width: 5px;
  height: 26vh;
  background: repeating-linear-gradient(0deg, var(--holo-1) 0px, var(--holo-1) 2px, transparent 2px, transparent 15px);
  opacity: 0.4;
}

.hud-frame::after {
  content: '';
  position: absolute;
  left: 20px;
  bottom: 20px;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: radial-gradient(circle, transparent 0 28px, rgba(56, 189, 248, 0.16) 29px 30px, transparent 31px 54px, rgba(56, 189, 248, 0.12) 55px 56px, transparent 57px 100%);
}

@media (max-width: 900px) {
  .hud-frame {
    display: none;
  }
}
</style>
