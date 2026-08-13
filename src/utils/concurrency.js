// 대량의 항목을 한번에 요청하면 OpenWeatherMap 무료 플랜의 분당 호출 제한에 걸릴 수 있어,
// 동시 실행 개수를 제한해 순차적으로 처리한다. 실패한 항목은 건너뛰고 성공한 결과만 모은다.
export const mapWithConcurrency = async (items, limit, worker) => {
  const results = []
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit)
    const settled = await Promise.allSettled(batch.map(worker))
    settled.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        console.error('항목 처리 실패:', result.reason)
      }
    })
  }
  return results
}
