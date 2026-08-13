import axios from 'axios'

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY
const BASE_URL = 'https://api.openweathermap.org/data/2.5'

// 현재 날씨 조회 (과제 요구사항 1)
export const fetchCurrentWeather = ({ lat, lon }) =>
  axios
    .get(`${BASE_URL}/weather`, {
      params: { lat, lon, appid: API_KEY, units: 'metric', lang: 'kr' },
    })
    .then((res) => res.data)

// 5일/3시간 단위 예보 - OpenWeatherMap의 다른 API 추가 연동 (과제 요구사항 2)
export const fetchForecast = ({ lat, lon }) =>
  axios
    .get(`${BASE_URL}/forecast`, {
      params: { lat, lon, appid: API_KEY, units: 'metric', lang: 'kr' },
    })
    .then((res) => res.data)

// 지역명 → 위경도 변환 (Geocoding API), 대한민국(KR) 시/군/구 검색용 - OpenWeatherMap의 다른 API 추가 연동 (과제 요구사항 2)
export const fetchGeocode = (query) =>
  axios
    .get('https://api.openweathermap.org/geo/1.0/direct', {
      params: { q: `${query},KR`, limit: 5, appid: API_KEY },
    })
    .then((res) => res.data)

// 위경도 → 소속 상위 지역명 변환 (Reverse Geocoding API), 동명 지역(예: 중구 5곳) 구분용
export const fetchReverseGeocode = ({ lat, lon }) =>
  axios
    .get('https://api.openweathermap.org/geo/1.0/reverse', {
      params: { lat, lon, limit: 1, appid: API_KEY },
    })
    .then((res) => res.data)
