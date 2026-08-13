<script setup>
// 나만의 추가 View: 서비스 소개 → 홈/STATS/ASTRO와 같은 HUD 톤의 시스템 개요 페이지로 구성
// 정적 소개 콘텐츠라 API 호출은 없음. 라우트/기능 목록은 router/index.js에 실제로 등록된 화면 기준
import BaseDashboardCard from '../components/exercise/BaseDashboardCard.vue'

const modules = [
  {
    title: '전국 실시간 날씨 지도',
    desc: '시/도 → 시/군/구 드릴다운 지도와 검색으로 전국 어디든 즉시 날씨를 조회합니다.',
    to: '/',
    linkLabel: 'HOME 바로가기',
  },
  {
    title: '내 위치 날씨',
    desc: 'IP 기반과 GPS 기반 위치를 동시에 조회해, 두 결과를 비교하며 확인할 수 있습니다.',
    to: '/',
    linkLabel: 'HOME 바로가기',
  },
  {
    title: '상세 기상관측',
    desc: '도시별 현재 기온·습도·풍속과 5일 예보를 관측 리포트 형태로 제공합니다.',
    to: null,
    linkLabel: null,
  },
  {
    title: '기상 관측 통합 대시보드',
    desc: '전국 85개소 KPI, 기온 분포, 체감편차·기압·시정·풍속 랭킹을 한 화면에 모았습니다.',
    to: '/stats',
    linkLabel: 'STATS 바로가기',
  },
  {
    title: '천문·관측 대시보드',
    desc: '전국 일출·일몰 랭킹과 24시간 타임라인, 지역별 상세 리포트를 제공합니다.',
    to: '/astro',
    linkLabel: 'ASTRO 바로가기',
  },
  {
    title: '단위 · 기준 설정',
    desc: '°C/°F 단위를 전환하고, "더움" 판정 기준 온도를 원하는 대로 조정할 수 있습니다.',
    to: null,
    linkLabel: null,
  },
]

const stack = [
  { label: '프레임워크', value: 'Vue 3 (Composition API) · Vite' },
  { label: '라우팅 / 상태', value: 'Vue Router 4 · Pinia' },
  { label: '통신', value: 'Axios' },
  { label: '날씨 데이터', value: 'OpenWeatherMap · Current / Forecast / Geocoding API' },
  { label: '지도 경계 데이터', value: '통계청 SGIS · admdongkor (CC BY 4.0)' },
]
</script>

<template>
  <div class="about">
    <header class="about-header">
      <h1 class="page-title"><span class="title-marker"></span>서비스 소개</h1>
      <p class="page-sub">ABOUT THE SYSTEM · 전국 기상 관측 통합 플랫폼</p>
    </header>
    <hr class="divider" />

    <section class="hero-panel">
      <p class="hero-eyebrow">WEATHER OPS DASHBOARD</p>
      <h2 class="hero-title">대한민국 시·군 날씨를<br />하나의 화면에서 확인합니다</h2>
      <p class="hero-desc">
        OpenWeatherMap 실시간 데이터를 지도·목록·통계·천문 관측까지 하나로 엮은 Vue 3 기반 날씨 관제 서비스입니다. 도시를 검색하거나 지도를 클릭해 원하는 지역의 날씨를 바로 확인하고, 상세 페이지에서
        5일 예보까지 이어서 볼 수 있습니다.
      </p>
    </section>

    <div class="module-grid">
      <BaseDashboardCard v-for="(m, i) in modules" :key="m.title" :title="`${String(i + 1).padStart(2, '0')} · ${m.title}`">
        <p class="module-desc">{{ m.desc }}</p>
        <RouterLink v-if="m.to" :to="m.to" class="module-link">{{ m.linkLabel }} →</RouterLink>
      </BaseDashboardCard>
    </div>

    <BaseDashboardCard title="데이터 · 기술 스택">
      <div class="stack-list">
        <div class="stack-row" v-for="s in stack" :key="s.label">
          <span class="stack-label">{{ s.label }}</span>
          <span class="stack-value">{{ s.value }}</span>
        </div>
      </div>
    </BaseDashboardCard>

    <RouterLink to="/" class="back-btn">← 대시보드로 돌아가기</RouterLink>
  </div>
</template>

<style scoped>
.about {
  padding: 8px clamp(4px, 2vw, 24px) 64px;
}

.about-header {
  margin-bottom: 12px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 6px;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--metal-900);
  text-shadow: var(--hud-glow-text);
}

.title-marker {
  width: 8px;
  height: 8px;
  background: var(--hud-cyan);
  box-shadow: 0 0 6px var(--hud-cyan);
  border-radius: 2px;
  flex-shrink: 0;
}

.page-sub {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  color: var(--metal-500);
}

.divider {
  border: none;
  border-top: 1px solid var(--metal-200);
  margin: 0 0 24px;
}

.hero-panel {
  position: relative;
  padding: 32px clamp(20px, 4vw, 40px);
  margin-bottom: 24px;
  border: 1px solid var(--metal-200);
  border-radius: var(--radius-lg);
  background: radial-gradient(ellipse 480px 240px at 100% 0%, rgba(56, 189, 248, 0.14) 0%, rgba(56, 189, 248, 0) 70%), var(--hud-panel-bg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.hero-panel::before,
.hero-panel::after {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  border: 2px solid var(--hud-cyan);
  opacity: 0.6;
  pointer-events: none;
}

.hero-panel::before {
  top: -1px;
  left: -1px;
  border-right: none;
  border-bottom: none;
}

.hero-panel::after {
  bottom: -1px;
  right: -1px;
  border-left: none;
  border-top: none;
}

.hero-eyebrow {
  margin: 0 0 12px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--hud-cyan);
}

.hero-title {
  margin: 0 0 16px;
  font-size: clamp(1.4rem, 3vw, 2rem);
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.01em;
  color: var(--metal-900);
  text-shadow: var(--hud-glow-text);
}

.hero-desc {
  margin: 0;
  max-width: 640px;
  font-size: 0.92rem;
  line-height: 1.7;
  color: var(--metal-700);
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px 20px;
  margin-bottom: 16px;
}

/* 카드마다 설명 길이가 달라 "바로가기" 링크 위치가 들쭉날쭉하던 것을 고정:
   카드를 세로 flex로 만들고 설명이 남는 공간을 채우게 해서 링크(있는 카드만)가
   항상 카드 하단에 정렬되도록 한다. grid는 기본적으로 한 행의 카드 높이를 맞춰주므로
   반응형으로 열 수가 바뀌어도 같은 행 안에서는 계속 바닥이 맞는다 */
.module-grid :deep(.dashboard-card) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.module-desc {
  flex: 1 1 auto;
  margin: 0 0 10px;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--metal-700);
}

.module-link {
  display: inline-flex;
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--hud-cyan);
}

.module-link:hover {
  text-shadow: var(--hud-glow-text);
}

.stack-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stack-row {
  display: grid;
  grid-template-columns: 150px 1fr;
  align-items: baseline;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--metal-200);
  font-size: 0.84rem;
  line-height: 1.6;
}

.stack-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.stack-label {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: var(--metal-500);
}

.stack-value {
  color: var(--metal-800);
}

.back-btn {
  display: inline-block;
  margin-top: 20px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--metal-700);
  background: var(--metal-50);
  border: 1px solid var(--metal-300);
  border-radius: 999px;
  padding: 8px 16px;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.back-btn:hover {
  border-color: var(--hud-cyan);
  color: var(--metal-900);
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.3);
}

@media (max-width: 640px) {
  .stack-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  /* minmax(260px, 1fr)가 좁은 화면에서 가로 스크롤을 만들지 않도록 한 열로 전환 */
  .module-grid {
    grid-template-columns: 1fr;
  }
}
</style>
