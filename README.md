# 과제 실습 기록 (Customization Log)

단원별 과제 요구사항을 구현하면서 추가/변경한 내역을 정리한다.

### 1. Hands on - Weather Mockup

`src/components/weather/WeatherMockup.vue`

- 과제 요구사항: `weatherList` 배열 렌더링(v-for), 25도 기준 조건부 렌더링(v-if), 검색어 양방향 바인딩(:value/@input), 상세보기 버튼 클릭 시 `window.alert()`.
- 개인 커스터마이징
  - `weatherList`에 도시 2개 추가: `city_04`(제주, 30도, 맑음), `city_05`(김해, 22도, 맑음).

### 2. Hands on - Weather Composition

`src/components/weather/WeatherComposition.vue`

- 과제 요구사항: `searchQuery`/`selectedCityInfo`/`weatherList` 반응형 상태, `computed`로 도시명 필터링(`filteredWeatherList`), `watch`/`watchEffect`로 상태 변화 감시, 검색 결과 없음 안내.
- 개인 커스터마이징
  - `sortAscending` 반응형 상태 추가 — 정렬 순서(오름차순/내림차순) 토글용 나만의 state.
  - `sortedWeatherList` computed 추가 — `filteredWeatherList`를 기온 기준으로 오름차순/내림차순 정렬해서 2차 가공.
  - `watch(sortAscending, ...)` 추가 — 정렬 순서가 바뀔 때마다 콘솔 로그 출력하는 나만의 watcher.

### 3. Hands on - Weather Component

`src/components/exercise/{BaseDashboardCard,SearchBar,WeatherCard}.vue`, (구)`WeatherParent.vue` → 이후 Router 단원에서 `WeatherHomeView.vue`로 대체

- 과제 요구사항: 기능 변경 없이 `WeatherParent`(반응형 데이터), `BaseDashboardCard`(공통 카드 디자인 + slot), `SearchBar`(props로 검색어 표시, `update-query` emit), `WeatherCard`(props로 도시 객체 표시, `select-card`/`click-detail` emit) 4개로 분리.
- 개인 커스터마이징
  - 요구사항에 없던 `WeatherStatusBar.vue` 컴포넌트를 추가 분리 — 선택된 도시의 상태 메시지만 표시하는 전용 컴포넌트(요구사항 7번: 나만의 추가 Component).
  - `BaseDashboardCard.vue`에 `title` prop을 추가해 카드마다 다른 제목("🔍 도시 검색", "🌤️ 날씨 현황")을 표시하도록 확장.

### 4. Hands on - Weather Router

`src/router/index.js`, `src/App.vue`, `src/views/*`

- 과제 요구사항: 모든 라우트 Lazy Loading, Catch-all Route(`NotFoundView`), Navigation Bar(`RouterLink`) + `RouterView` 배치, `WeatherHomeView`가 `WeatherParent`를 대체하며 상세보기 클릭 시 `window.alert()` 대신 Programmatic Navigation, `WeatherDetailView`는 `cityId` 기반 Mock Data 매칭.
- 개인 커스터마이징
  - `WeatherStatsView.vue`(`/stats`) 추가 — 등록 도시 수, 평균 기온, `hotThreshold` 이상 도시 수 등 통계를 보여주는 나만의 추가 View(요구사항 6번).
  - `WeatherHomeView.vue`의 `showDetail`을 `router.push('/weather/' + city.id)`로 구현.
  - `WeatherDetailView.vue`는 `onMounted`에서 `route.params.cityId`로 Mock Data를 조회하고, 목록에는 없던 습도/풍속 필드를 상세 전용 데이터로 추가.

### 5. Hands on - Weather Store (Pinia)

`src/stores/configStore.js`, `src/components/UnitToggler.vue`

- 과제 요구사항: `configStore`에 `unit`(state, 기본 celsius) / `unitSymbol`(getter) / `toggleUnit`(action) 정의, `UnitToggler.vue`를 Navigation Bar 옆에 배치, 메인·상세 화면 온도 표시에 단위 변환 적용.
- 개인 커스터마이징
  - `hotThreshold` state와 `setHotThreshold` action 추가 — `WeatherCard.vue`에 하드코딩되어 있던 "더움" 판정 기준(25도)을 store에서 관리하도록 확장(요구사항 4번: state/action 추가).
  - `WeatherCard.vue`, `WeatherDetailView.vue` 각각에 `displayTemp` computed를 작성해 섭씨 → 화씨 변환(`Math.round((rawTemp * 9) / 5 + 32)`)을 적용. 두 파일에 로직이 중복되는데, 이는 과제 노트에서 Composable 추출을 범위 제외로 명시했기 때문에 의도적으로 남겨둔 것.

### 6. Hands on - Weather Axios & Weather Refinement(6번 & 8번)

`src/api/weather.js`, `src/api/geo.js`, `src/data/cities.js`, `src/views/{WeatherHomeView,WeatherDetailView,WeatherStatsView}.vue`

- 과제 요구사항 (Weather Axios)
  1. OpenWeatherMap API로 실제 날씨 데이터를 가져와 적용: `weatherList`/`weatherDetailList` Mock 배열을 제거하고, 도시별 위경도(`src/data/cities.js`)로 [Current Weather API](https://openweathermap.org/current)를 호출해 홈 대시보드(`WeatherHomeView.vue`)·상세 페이지(`WeatherDetailView.vue`)·통계 페이지(`WeatherStatsView.vue`)를 실데이터로 렌더링.
  2. OpenWeatherMap의 다른 API 추가: [5 Day / 3 Hour Forecast API](https://openweathermap.org/forecast5)를 `fetchForecast`로 연동, 상세 페이지에 예보 5개(3시간 간격)를 표시.
  3. 기타 외부 API 추가: [ipapi.co](https://ipapi.co/) IP 기반 위치 조회 API(`src/api/geo.js`)로 접속 위치를 찾고, 해당 좌표로 OpenWeatherMap 날씨를 조회하는 "📍 내 위치 날씨 보기" 버튼을 홈 대시보드에 추가.
- 과제 요구사항 (Weather Refinement · Modern JavaScript)
  1. 완성도를 높일 외부 라이브러리를 추가하면서 기능을 정비한다.
  2. 스타일을 다듬어 완성도를 높인다.
  3. README 파일에 과제에 대한 내용을 정리한다.
- 개인 커스터마이징
  - API 키는 `.env`의 `VITE_OPENWEATHER_API_KEY`로 관리(`.env.example` 참고), axios 호출 로직은 `src/api/`로 분리.
  - 각 뷰에 로딩 상태(`isLoading`)를 추가해 API 응답 전 안내 문구를 표시하고, 실패 시 `alert`로 에러를 안내(기존 `AxiosWeather.vue` 연습 패턴과 동일).
  - IP 기반 위치(ipapi.co)는 실제 GPS 위치가 아니라 접속 IP 대역으로 추정하는 방식이라 정확도가 낮을 수 있음(예: 울산에서 접속해도 회선의 IP 대역이 서울로 잡히는 경우). 이를 보완하기 위해 브라우저 내장 `navigator.geolocation`(GPS/Wi-Fi 기반)도 함께 연동해, "내 위치 날씨 보기" 버튼 클릭 시 IP 기반과 GPS 기반 결과를 동시에 비교해서 보여주도록 확장(`WeatherHomeView.vue`의 `locateByIp`/`locateByGps`). 두 위치의 지역명이 일치하면 한 줄만, 다르면 두 줄 다 표시.
  - 검색창이 처음엔 미리 등록된 5개 도시(`src/data/cities.js`) 안에서만 찾아지는 한계가 있어, [Geocoding API](https://openweathermap.org/api/geocoding-api)를 `fetchGeocode`로 추가 연동(OpenWeatherMap의 또 다른 API 활용)해 대한민국(남한) 전역 시/군/구 이름 검색으로 확장(`WeatherHomeView.vue`의 `searchNationwide`). 검색어 입력 후 500ms 디바운스로 Geocoding + 현재 날씨 API를 호출하고, 동명 지역(예: 전국에 5곳 있는 "중구")이 여러 개 매칭되면 [Reverse Geocoding API](https://openweathermap.org/api/geocoding-api#reverse)(`fetchReverseGeocode`)로 소속 상위 지역명을 조회해 "중구 (서울)"처럼 함께 표시해 구분(조회 실패 시에만 위경도로 대체 표시). 검색 결과 카드의 상세보기는 `src/data/cities.js`에 없는 지역이므로 위경도를 라우트 쿼리로 전달하고, `WeatherDetailView.vue`는 등록된 도시 목록에 없을 경우 쿼리의 위경도로 폴백 조회하도록 확장.
  - 기본 대시보드(검색 전 초기 화면)도 임의로 고른 5개 도시가 아니라 대한민국(남한) '시' 단위 행정구역 85곳 전체를 보여주도록 `src/data/cities.js`를 확장(각 도시의 위경도는 OpenWeatherMap Geocoding API로 조회해 고정 저장). 85건을 한 번에 요청하면 무료 API 요금제의 분당 호출 제한에 걸릴 수 있어, `src/utils/concurrency.js`의 `mapWithConcurrency`로 동시 10건씩 나눠 호출하도록 `WeatherHomeView.vue`·`WeatherStatsView.vue`를 수정하고 실패한 항목은 건너뛰도록 처리.
  - OpenWeatherMap Geocoding이 "시" 접미사 없이는 일부 도시(태백, 강릉, 구리, 속초, 삼척, 보령, 익산, 정읍, 목포, 평택 등 85곳 중 10곳)를 못 찾는 것을 확인 — 이미 좌표를 확보해 둔 85개 시 목록을 `searchNationwide`에서 먼저 검색(이름 부분 일치)하고, 거기 없는 세부 지역(구/군/동 등)만 Geocoding API로 보강 검색하도록 수정해 검색 성공률과 속도를 함께 개선.
  - **(Refinement 1) 외부 라이브러리 추가**: `d3-geo`(지리 투영·폴리곤 중심점 계산)와 `topojson-client`(TopoJSON → GeoJSON 변환)를 추가해, 클릭 한 번으로 시/군/구까지 내려가는 전국 드릴다운 지도 기능을 구현(자세한 내용은 7번 항목 참고). 사용한 외부 API는 OpenWeatherMap(Current/Forecast/Geocoding/Reverse Geocoding)과 IP 위치 조회용 ipapi.co이며, GPS 위치는 별도 외부 API 없이 브라우저 내장 `navigator.geolocation`을 사용.
  - **(Refinement 2) 스타일 다듬기**: 전 화면(홈/상세/통계/천문/소개)에 다크 톤의 관측 시스템(HUD) 디자인을 일관되게 적용 — 진입 시 부팅 진행률을 보여주는 `SplashScreen.vue`, 코너 브라켓·그리드 프레임이 있는 네비게이션 바, 카드/랭킹 바/타임라인 등 공통 컴포넌트 스타일을 정비.
  - **(Refinement 3) README 정리**: 이 문서에 단원별 구현 내역과 서비스 소개를 기록.

### 7. Hands on - Weather UI Library

`src/main.js`, `src/views/WeatherAstroView.vue`

- 과제 요구사항: 외부 UI Library를 선정해 3일차(Weather Axios) 과제 결과물에 자유롭게 적용해본다.
- 개인 커스터마이징
  - 라이브러리 선정: `vue3-toastify` — Vue 3 전용으로 최근까지 관리되고 있고(peer dep `vue >=3.2.0`) 번들 크기가 작아, 기존에 직접 만든 다크 HUD 테마와 충돌 없이 얹기 좋아 선정. (`vue-toastification`은 npm `latest` 태그가 아직 Vue 2용이라 제외.)
  - 최소 적용: `main.js`에 스타일시트만 전역 import하고, 별도 플러그인 등록 없이 필요한 곳에서 `toast(...)`를 바로 호출하는 가벼운 구조로 연동. `WeatherAstroView.vue`의 에러 안내를 기존 `alert()`에서 `toast.error(..., { theme: toast.THEME.DARK })`로 교체해 다크 테마 토스트로 표시.
  - `WeatherHomeView.vue`/`WeatherDetailView.vue`/`WeatherStatsView.vue`도 동일한 `alert()` 패턴을 쓰고 있지만, 과제 실습 로직 보호 대상이라 이번 최소 적용 범위에서는 제외하고 `alert()`를 그대로 유지.

### 8. 지도 연동 (커스터마이징)

`src/components/map/KoreaDrilldownMap.vue`, `src/views/WeatherHomeView.vue`

- 히어로 섹션에 지도(왼쪽) + 검색/날씨 현황 대시보드(오른쪽) 배치, 날씨 현황 리스트는 카드 내부 스크롤 적용.
- 지도에서 시/군/구 클릭 시 그 지역명으로 지오코딩 검색 → 결과가 정확히 1개면 그 좌표를, 동명 지역이거나 색인이 없어 결과가 1개가 아니면 지도 폴리곤의 기하학적 중심(`d3-geo`의 `geoCentroid`)으로 대신 날씨를 조회.
- 검색창 타이핑 검색(`searchNationwide`)은 기존 로직 그대로 유지 — 동명 지역(중구/남구 등)은 계속 여러 개가 검색됨.

---

## 서비스 소개

전국 단위 실시간 기상 정보를 지도 기반으로 탐색하는 **날씨 웹 서비스**로 확장했다.

### 핵심 기능

- **전국 실시간 날씨 지도** (`/`) — 시/도 → 시/군/구 드릴다운 지도와 검색창을 나란히 배치, 지도를 클릭하거나 지역명을 검색해 전국 어디든 즉시 날씨를 조회.
- **내 위치 날씨** — IP 기반 위치와 GPS 기반 위치를 동시에 조회해 정확도를 비교하며 확인.
- **상세 기상관측** (`/weather/:cityId`) — 선택 지역의 현재 기온·습도·풍속과 5일 예보를 제공.
- **기상 관측 통합 대시보드** (`/stats`) — 전국 85개 지역의 평균 기온·체감·습도·기압·풍속·시정 KPI, 기온 분포 히스토그램, 항목별 TOP 5 랭킹.
- **천문·관측 대시보드** (`/astro`) — 전국 일출·일몰 랭킹, 낮 길이·맑은 하늘 랭킹, 선택 지역의 24시간 일조 타임라인.
- **단위 · 기준 설정** — °C/°F 전환, "더움" 판정 기준 온도 커스터마이징.
- **서비스 소개** (`/about`) — 위 기능과 기술 스택을 한눈에 정리한 소개 페이지.
- 진입 시 부팅 연출(스플래시)과 전 화면에 일관된 HUD 톤 비주얼 테마 적용.

### 기술 스택

| 구분 | 내용 |
| --- | --- |
| 프레임워크 | Vue 3 (Composition API) · Vite |
| 라우팅 / 상태 | Vue Router 4 · Pinia |
| 통신 | Axios |
| 날씨 데이터 | OpenWeatherMap (Current / Forecast / Geocoding API) |
| 위치 데이터 | ipapi.co(IP), `navigator.geolocation`(GPS) |
| 지도 | 통계청 SGIS 행정경계 데이터(CC BY 4.0) · d3-geo |
| UI 라이브러리 | vue3-toastify (토스트 알림) |

### 화면 구성

| 경로 | 화면 |
| --- | --- |
| `/` | 홈 — 전국 지도 + 검색 + 실시간 날씨 현황 |
| `/weather/:cityId` | 지역 상세 — 현재 날씨 + 5일 예보 |
| `/stats` | 기상 관측 통합 대시보드 |
| `/astro` | 천문·관측 대시보드 |
| `/about` | 서비스 소개 |

---

# skala-vue

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```