# 테스트 전략

## 원칙

- **가장 중요한 것부터**: 일정 계산(결정성 · 영업시간 준수 · 끝 시각 준수)이 깨지면 서비스가 틀린 답을 준다 → 가장 촘촘하게.
- 테스트는 CI에서 매 push마다 돈다. 실패하면 배포되지 않는다.
- 외부 의존(파일, 네트워크)은 테스트에서 주입으로 바꾼다.

## 층별 범위

| 층 | 도구 | 대상 | 위치 |
|---|---|---|---|
| 단위 (shared) | Vitest | 시각 · 날짜 · 요일 계산, 운영시간 표시 문구, 쿼리 · 장소 스키마 | `packages/shared/src/*.test.ts` |
| 단위 (api) | Vitest | `planDay` 시나리오, `fitVisit`, 이동 시간 | `apps/api/test/domain/` |
| 데이터 | Vitest | 실제 `spots.json`이 스키마와 데이터 원칙을 지키는지 | `apps/api/test/data/` |
| API | Vitest + Supertest | 엔드포인트별 상태 코드 · 응답 형식 · 헤더 | `apps/api/test/routes/` |
| 단위 (web) | Vitest | fetch 래퍼, KST 오늘 · 날짜 표시, 시간 포맷, URL ↔ 조건 변환 | `apps/web/src/lib/*.test.ts` |
| 화면 | Vitest + Testing Library | 홈 입력, 결과 타임라인 · 상태 화면, 상세, 빠진 장소 펼치기, 헤더 · 푸터 | `apps/web/src/**/*.test.tsx` |
| 수동 | 브라우저 | 운영 리허설(`compose.local.yml`)과 배포 후 점검, 390px 확인 | [`../06-deploy/checklist.md`](../06-deploy/checklist.md) |

## 필수 테스트 목록

### 일정 계산

[`recommendation-algorithm.md` 테스트 시나리오](../03-architecture/recommendation-algorithm.md#테스트-시나리오) S1~S9 (`plan-day.test.ts`). 모든 시나리오에서 시각 연결 · 끝 시각 · 영업시간 · 결정성(같은 입력 2회, 입력 배열 뒤집기) · 입력 불변을 함께 확인한다.

| 파일 | 내용 |
|---|---|
| `apps/api/test/domain/travel.test.ts` | 하버사인 거리 기준값, 이동분(5분 올림, 거리 0 → 0) |
| `apps/api/test/domain/opening.test.ts` | 개장 대기, 마감 전 체류 불가, 입장 마감, 쉬는 시간 사이 도착, 휴무 요일 |
| `apps/api/test/domain/plan-day.test.ts` | S1~S9, 대표 사진이 `SpotSummary.image`로 들어가는지 |
| `apps/api/test/data/spots-file.test.ts` | 스키마 통과, kind별 개수, 19:00 이후 여는 관광지 2곳 이상, 모든 요일에 점심 · 저녁 식당, "상시 개방" note, 출처 기록 |

### API

픽스처 11곳(관광 6 · 식당 3 · 카페 2) 기준.

| 요청 | 기대 |
|---|---|
| `GET /api/health` | 200, `status: "ok"`, `spots: 11`, `Cache-Control: no-store` |
| `GET /api/spots` | 200, `total: 11`, `Cache-Control: public, max-age=300` |
| `GET /api/spots?kind=cafe` | 200, 카페만 파일 순서대로 |
| `GET /api/spots?kind=restaurant&tag=nature` | 200, AND 조건이라 0개 |
| `GET /api/spots?kind=bar` · `?zone=seoul` | 400 `INVALID_QUERY`, 한국어 메시지 |
| `GET /api/spots/s-forest` | 200, `nearby`가 거리순 관광지 3곳 (자기 자신 제외) |
| `GET /api/spots/c-far` | 200, 카페 상세의 `nearby`도 관광지만 |
| `GET /api/spots/nope` | 404 `SPOT_NOT_FOUND`, `장소를 찾을 수 없어요.` |
| `GET /api/course?date=2026-11-07&start=10:00&end=19:00&with=family&tags=nature,experience` | 200, S1과 같은 일정, `weekday: "sat"`, 캐시 헤더 |
| `GET /api/course?hours=4&with=family&tags=nature` (v1 쿼리) | 400, `방문 날짜가 올바르지 않아요.`, `details[0].field = "date"` |
| `GET /api/course?date=2026-02-30&...` | 400, `방문 날짜가 올바르지 않아요.` |
| `start=07:30` / `end=12:30`(start 10:00) | 400, 시작 · 끝 시각 메시지 |
| `exclude=a&exclude=b` | 400, `제외할 장소 값이 올바르지 않아요.` |
| `exclude=nope` · 관광지 전부 `exclude` | 200 (없는 id는 `conditions`에 남김, 관광 0곳도 200) |
| `GET /api/nope` | 404 `NOT_FOUND` |
| 저장소가 예외를 던짐 | 500 `INTERNAL_ERROR`, 내부 정보 노출 없음 (`errors.test.ts`) |

## 테스트 가능한 구조

```ts
// app.ts — 저장소 · 로거를 주입받는다
export function createApp({ spots, version, logger }: AppDependencies): express.Express { ... }

// 테스트
const app = createApp({
  spots: createInMemoryRepository(fixtureSpots),
  version: 'test',
  logger: pino({ level: 'silent' }),
});
await request(app).get('/api/course?...').expect(200);
```

- 알고리즘 · API 테스트 픽스처는 `apps/api/test/fixtures/spots.ts`(좌표 · 운영시간을 코드로 정의, `spotsFileSchema` 통과)를 쓴다. 실제 `spots.json`이 바뀌어도 알고리즘 테스트는 흔들리지 않게.
- 실제 데이터 전 조합 점검(기준 구현 차등 비교, 30,380 쿼리)은 리뷰 때 따로 돌린 것이라 CI에는 없다 ([검증 기록](../03-architecture/recommendation-algorithm.md#검증-기록)).

## 명령

```powershell
npm test                      # 전체
npm test -w apps/api          # API만
npm test -w apps/api -- --watch   # 작성 중 감시 모드 (vitest의 -w는 --watch라 워크스페이스 지정에 쓰지 않는다)
npm run test:coverage         # 커버리지 (domain/ 90% 이상 목표, @vitest/coverage-v8)
```
