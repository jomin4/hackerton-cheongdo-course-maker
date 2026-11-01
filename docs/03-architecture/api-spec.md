# API 명세

- Base path: `/api`
- 형식: JSON (UTF-8), 인증 없음, 읽기 전용(GET)
- 타입 정의: [`data-model.md`](data-model.md) · 구현 위치: `apps/api/src/routes/`

## 엔드포인트 요약

| 메서드 | 경로 | 설명 | 성공 | 실패 |
|---|---|---|---|---|
| GET | `/api/health` | 상태 확인 (배포 검증용) | 200 | — |
| GET | `/api/spots` | 장소 목록 (관광지 · 식당 · 카페) | 200 | 400 |
| GET | `/api/spots/:id` | 장소 1곳 + 가까운 관광지 | 200 | 404 |
| GET | `/api/course` | 하루 일정 계산 | 200 | 400 |

## 공통 오류 형식

```json
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "방문 날짜가 올바르지 않아요.",
    "details": [{ "field": "date", "value": "2026-02-30", "issue": "방문 날짜가 올바르지 않아요." }]
  }
}
```

| HTTP | code | 언제 | message |
|---|---|---|---|
| 400 | `INVALID_QUERY` | 쿼리 검증 실패 (zod) | 첫 번째 오류의 메시지 (아래 표) |
| 404 | `SPOT_NOT_FOUND` | 없는 장소 id | `장소를 찾을 수 없어요.` |
| 404 | `NOT_FOUND` | 없는 API 경로 | `요청한 경로를 찾을 수 없어요.` |
| 500 | `INTERNAL_ERROR` | 예상하지 못한 오류 (메시지에 내부 정보 노출 금지) | `서버에서 오류가 발생했어요.` |

- `message`는 화면에 그대로 보여줄 수 있는 한국어 문장으로 쓴다.
- `details`는 잘못된 필드마다 하나씩: `field`(쿼리 이름), `value`(받은 값, 없으면 `null`), `issue`(그 필드의 메시지).

---

## GET `/api/health`

```json
{ "status": "ok", "version": "a1b2c3d", "uptimeSeconds": 1234, "spots": 43 }
```

- `version`: 환경 변수 `APP_VERSION`(CI에서 git SHA 주입), 없으면 `"dev"`
- `spots`: 로드된 장소 수 (데이터 로드 확인용)

## GET `/api/spots`

| 쿼리 | 타입 | 필수 | 설명 | 잘못된 값일 때 message |
|---|---|---|---|---|
| `tag` | `Tag` | 아니오 | 이 태그를 가진 장소만 | `관심사는 nature, history, experience, food, photo 중에서 골라주세요.` |
| `zone` | `Zone` | 아니오 | 이 권역만 | `권역 값이 올바르지 않아요.` |
| `kind` | `spot \| restaurant \| cafe` | 아니오 | 이 종류만 | `종류는 spot, restaurant, cafe 중 하나여야 해요.` |

필터는 AND로 묶고, 순서는 데이터 파일 순서 그대로다.

응답 `200`:

```json
{ "items": [ /* SpotSummary[] */ ], "total": 43 }
```

`SpotSummary` = `Spot`에서 `id, kind, name, summary, zone, tags, stayMinutes, location` + `image`(`images[0]`, 없으면 생략).

## GET `/api/spots/:id`

응답 `200`:

```json
{
  "spot": { /* Spot 전체 */ },
  "nearby": [ /* SpotSummary[] — kind=spot 장소 중 자기 자신 제외, 직선거리(하버사인)↑ → id↑, 최대 3개 */ ]
}
```

- 식당 · 카페 상세에서도 `nearby`는 가까운 **관광지**를 준다.
- 응답 `404`: `SPOT_NOT_FOUND`, `장소를 찾을 수 없어요.`

## GET `/api/course`

### 쿼리

| 쿼리 | 타입 | 필수 | 규칙 | 잘못된 값일 때 message |
|---|---|---|---|---|
| `date` | `YYYY-MM-DD` | 예 | 실제 있는 날짜. 과거 날짜도 받음 (결정성) | `방문 날짜가 올바르지 않아요.` |
| `start` | `HH:MM` | 예 | 08:00~14:00, 30분 단위 | `시작 시각은 08:00~14:00 사이 30분 단위로 골라주세요.` |
| `end` | `HH:MM` | 예 | 30분 단위, 21:00 이하, `start` + 3시간 이상 | `끝 시각은 시작보다 3시간 이상 늦고 21:00 이전이어야 해요.` |
| `with` | `solo \| couple \| family \| friends` | 예 | | `동행은 solo, couple, family, friends 중 하나여야 해요.` |
| `tags` | 쉼표 구분 `Tag` | 예 | 1개 이상, 중복 제거, `TAGS` 순서로 정렬 | 없음 · 빈 값: `관심사를 하나 이상 골라주세요.` / 알 수 없는 값: `관심사는 nature, history, experience, food, photo 중에서 골라주세요.` |
| `exclude` | 쉼표 구분 장소 id | 아니오 (P1) | 후보에서 제외. 없는 id는 무시하고 `conditions`에 남김. 같은 이름 반복(`exclude=a&exclude=b`)은 400 | `제외할 장소 값이 올바르지 않아요.` |

v1 쿼리(`hours=4&with=family&tags=nature`)는 `date`가 없어 400 `방문 날짜가 올바르지 않아요.`가 된다.

### 응답 `200` (`DayPlan`)

`GET /api/course?date=2026-11-07&start=10:00&end=19:00&with=family&tags=nature,experience` (실제 데이터, 일부 생략)

```json
{
  "conditions": {
    "date": "2026-11-07", "start": "10:00", "end": "19:00", "with": "family",
    "tags": ["nature", "experience"], "exclude": [], "weekday": "sat"
  },
  "items": [
    {
      "order": 1,
      "type": "visit",
      "spot": {
        "id": "bullfight-media", "kind": "spot", "name": "청도소싸움미디어체험관",
        "summary": "청도 소싸움을 영상과 체험으로 배우는 실내 체험관. 아이와 함께 가기 좋아요.",
        "zone": "hwayang-eup", "tags": ["experience", "history"], "stayMinutes": 60,
        "location": { "lat": 35.685225, "lng": 128.724201 },
        "image": {
          "url": "https://tong.visitkorea.or.kr/cms/resource/42/4119442_image2_1.jpg",
          "alt": "청도소싸움미디어체험관 건물 외관", "license": "kogl-1", "credit": "ⓒ한국관광공사"
        }
      },
      "travelMinutes": 0, "waitMinutes": 0, "distanceKm": 0,
      "arriveAt": "10:00", "leaveAt": "11:00",
      "matchedTags": ["experience"], "score": 15
    },
    { "order": 2, "type": "visit", "spot": { "id": "gunpark-luge", "...": "..." }, "travelMinutes": 10, "waitMinutes": 0, "distanceKm": 0.3, "arriveAt": "11:10", "leaveAt": "12:10", "matchedTags": ["experience"], "score": 15 },
    { "order": 3, "type": "meal", "meal": "lunch", "spot": { "id": "byeokodong", "...": "..." }, "travelMinutes": 15, "waitMinutes": 0, "distanceKm": 4.2, "arriveAt": "12:25", "leaveAt": "13:25", "matchedTags": [], "score": 0 },
    { "order": 4, "type": "rest", "spot": { "id": "ohmybook", "...": "..." }, "travelMinutes": 10, "waitMinutes": 0, "distanceKm": 0.8, "arriveAt": "13:35", "leaveAt": "14:15", "matchedTags": [], "score": 0 },
    { "order": 8, "type": "meal", "meal": "dinner", "spot": { "id": "cheongdo-hanwoo", "...": "..." }, "travelMinutes": 15, "waitMinutes": 0, "distanceKm": 4.7, "arriveAt": "17:55", "leaveAt": "18:55", "matchedTags": [], "score": 0 }
  ],
  "excluded": [
    { "spot": { "id": "seongsuwol", "...": "..." }, "reason": "NOT_ENOUGH_TIME" }
  ],
  "totals": {
    "visitCount": 5, "stayMinutes": 420, "travelMinutes": 115,
    "startAt": "10:00", "endAt": "18:55", "slackMinutes": 5
  },
  "notices": []
}
```

- `items`: 관광(`visit`) · 식사(`meal`, `meal`에 끼니) · 쉬어 가기(`rest`)를 시간 순으로. 계산 규칙은 [`recommendation-algorithm.md`](recommendation-algorithm.md)
- `travelMinutes` · `distanceKm`: 직전 항목에서 오는 이동 (첫 항목은 0)
- `waitMinutes`: 도착 뒤 영업 · 식사 창 시작까지 기다린 시간. `arriveAt`은 기다린 뒤 시각
- `excluded`: 후보(점수 1점 이상, `exclude`로 빼지 않은 관광지) 중 일정에 없는 곳. `CLOSED_ON_DAY`(그 요일 휴무) 또는 `NOT_ENOUGH_TIME`
- `notices`: 넣지 못한 블록 안내. `이 시간에 영업하는 식당을 찾지 못했어요`, `이 시간에 영업하는 카페를 찾지 못했어요`
- 넣을 관광지가 없어도 **400이 아니라 200** (빈 결과 화면). 식사만 있거나 `items: []`일 수 있고, 항목이 없으면 `endAt = startAt`, `slackMinutes = end − start`

### 응답 `400` 예

`GET /api/course?date=2026-11-07&start=07:30&end=19:00&with=family&tags=nature`

```json
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "시작 시각은 08:00~14:00 사이 30분 단위로 골라주세요.",
    "details": [
      { "field": "start", "value": "07:30", "issue": "시작 시각은 08:00~14:00 사이 30분 단위로 골라주세요." }
    ]
  }
}
```

## 캐시

- 응답은 데이터가 바뀌지 않는 한 결정적이다. `/api/spots` · `/api/spots/:id` · `/api/course`의 200 응답은 `Cache-Control: public, max-age=300` (5분).
- `/api/health`는 `Cache-Control: no-store`.

## 로깅

- 요청마다 pino-http로 메서드, 경로, 상태, 소요 시간을 JSON 한 줄로 남긴다.
- 4xx는 `info`, 5xx는 `error` + 스택(서버 로그에만).
