import axios from 'axios'

// IP 기반 현재 위치 조회 - OpenWeatherMap이 아닌 기타 외부 API 연동 (과제 요구사항 3)
export const fetchMyLocation = () => axios.get('https://ipapi.co/json/').then((res) => res.data)
