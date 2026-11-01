# 데이터 모델

> 구현 위치: `packages/shared/src/` (`constants.ts` · `types.ts` · `schemas.ts` · `time.ts` · `hours-format.ts`). 프론트와 API가 같은 정의를 import한다.
> 설계: [`../01-product/day-course-design.md`](../01-product/day-course-design.md) 5 · 6장

## 상수

```ts
export const TAGS = ['nature', 'history', 'experience', 'food', 'photo'] as const;
export const TAG_LABELS = { nature: '자연', history: '역사·문화', experience: '체험', food: '먹거리', photo: '사진 명소' };

export const COMPANIONS = ['solo', 'couple', 'family', 'friends'] as const;
export const COMPANION_LABELS = { solo: '혼자', couple: '커플', family: '가족', friends: '친구' };

export const KINDS = ['spot', 'restaurant', 'cafe'] as const;
export const KIND_LABELS = { spot: '관광', restaurant: '식당', cafe: '카페' };

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export const WEEKDAY_LABELS = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일' };

export const MEALS = ['lunch', 'dinner'] as const;

// 청도군 9개 읍 · 면. 표시 · 묶음용 (이동 시간 계산에는 안 씀)
export const ZONES = [
  'cheongdo-eup', 'hwayang-eup', 'iseo-myeon', 'gaknam-myeon', 'punggak-myeon',
  'gakbuk-myeon', 'unmun-myeon', 'geumcheon-myeon', 'maejeon-myeon',
] as const; // ZONE_LABELS: 청도읍 · 화양읍 · 이서면 · 각남면 · 풍각면 · 각북면 · 운문면 · 금천면 · 매전면

export const TRAVEL = { roadFactor: 1.4, speedKmh: 40, overheadMinutes: 5, roundTo: 5 } as const;
export const MEAL_WINDOWS = { lunch: { from: '11:30', to: '13:30' }, dinner: { from: '17:30', to: '19:00' } } as const;
export const MEAL_MINUTES = 60;
export const DAY_LIMITS = {
  startMin: '08:00', startMax: '14:00', endMax: '21:00', minSpanMinutes: 180, stepMinutes: 30,
  lunchStartMax: '12:00', lunchEndMin: '14:00', dinnerEndMin: '18:30',
} as const;
export const START_CANDIDATES = 5;
export const TRAVEL_WEIGHT = 0.5;
export const DATA_ATTRIBUTION = '데이터 제공: ⓒ한국관광공사';
```

`TAGS` 배열 순서가 **표시 순서이자 URL 정렬 순서**다. 각 상수의 쓰임은 [`recommendation-algorithm.md`](recommendation-algorithm.md#상수).

## Spot

관광지 · 식당 · 카페를 `kind`로 나눠 한 타입 · 한 파일(`apps/api/data/spots.json`)에 둔다.

```ts
export interface TimeRange {
  open: string;          // "09:30" (24시간, 자정 넘김 없음)
  close: string;         // "18:00"
}

export interface WeeklyHours {
  days: Record<Weekday, TimeRange[]>; // 7개 요일 모두 필요. 빈 배열 = 그 요일 휴무. 쉬는 시간이 있으면 구간 2개
  lastEntryBeforeCloseMinutes?: number; // "마감 15분 전 입장 마감" → 15
  note?: string;         // 우리 문장. "상시 개방 · 추천 관람 시간 기준", 명절 휴무 등 요일 규칙 밖 안내
}

export interface SpotImage {
  url: string;           // tong.visitkorea.or.kr 원본 주소 (우리 서버에 저장하지 않음)
  alt: string;           // 우리가 쓴 대체 텍스트
  license: 'kogl-1';     // 공공누리 제1유형만 허용
  credit: string;        // "ⓒ한국관광공사"
}

export interface Spot {
  id: string;            // kebab-case, URL에 쓰임. 예: "eupseong"
  kind: Kind;            // 'spot' | 'restaurant' | 'cafe'
  name: string;
  summary: string;       // 카드용 한 줄 (80자 이하)
  description: string[]; // 상세 소개 문단들 (우리 문장)
  tips: string[];        // 방문 팁 · 대표 메뉴
  zone: Zone;
  location: { lat: number; lng: number }; // WGS84
  tags: Tag[];           // kind=spot은 1개 이상, 식당 · 카페는 빈 배열 허용
  goodFor: Companion[];  // 1개 이상
  stayMinutes: number;   // 권장 체류 (10~240)
  meals?: Meal[];        // restaurant만. 영업을 확인한 끼니
  address: string;
  hours: WeeklyHours;    // 필수 — 일정 계산에 쓴다
  fee?: string;
  phone?: string;
  images: SpotImage[];   // 0개 이상. 첫 장이 대표 사진
  source: string;        // "한국관광공사", "청도군 맛나들이 (운문토속먹거리촌)" 등
  sourceRef?: { provider: 'tourapi'; contentId: string }; // 재확인용
  checkedAt: string;     // 필수 — 운영시간을 실제로 확인한 날짜 "2026-10-31"
}

export type SpotSummary = Pick<
  Spot,
  'id' | 'kind' | 'name' | 'summary' | 'zone' | 'tags' | 'stayMinutes' | 'location'
> & { image?: SpotImage }; // image = images[0] (없으면 필드 생략)
```

- 선택 필드(`?`)는 확인하지 못했으면 **생략**한다. 빈 문자열을 넣지 않는다.
- 확인하지 못한 장소는 데이터에 넣지 않는다. 데이터 원칙은 [`spots-data.md`](../01-product/spots-data.md#원칙).
- 화면의 운영시간 문구는 `formatWeeklyHours(hours)`가 만든다. 같은 시간인 요일을 묶어 줄 목록으로 돌려준다 (`['화~일 09:30–18:00', '월 휴무']`, 모든 요일이 같으면 `['매일 09:00–18:00']`. 3일 이상 연속은 `~`, 그 밖은 `·`, 휴무 줄은 맨 끝).

## 하루 일정

```ts
export interface DayQuery {
  date: string;          // "2026-11-07"
  start: string;         // "10:00"
  end: string;           // "19:00"
  with: Companion;
  tags: Tag[];           // TAGS 순서로 정렬 · 중복 제거된 상태
  exclude: string[];     // P1
}

export interface DayPlanItem {
  order: number;         // 1부터, 모든 항목에 이어서 매김
  type: 'visit' | 'meal' | 'rest';
  meal?: Meal;           // type=meal일 때 'lunch' | 'dinner'
  spot: SpotSummary;
  travelMinutes: number; // 이전 항목에서 오는 시간 (첫 항목 0)
  waitMinutes: number;   // 도착 후 영업 · 식사 창 시작까지 기다린 시간 (보통 0)
  distanceKm: number;    // 소수 1자리
  arriveAt: string;      // "10:00" — 기다림이 끝난 시각
  leaveAt: string;       // "10:40"
  matchedTags: Tag[];    // visit만 의미 있음 (식사 · 쉬어 가기는 [])
  score: number;         // visit만 의미 있음 (식사 · 쉬어 가기는 0)
}

export type ExcludedReason = 'NOT_ENOUGH_TIME' | 'CLOSED_ON_DAY';

export interface ExcludedSpot {
  spot: SpotSummary;
  reason: ExcludedReason;
}

export interface DayPlanTotals {
  visitCount: number;    // type=visit 항목 수
  stayMinutes: number;   // 모든 항목의 (leaveAt − arriveAt) 합
  travelMinutes: number;
  startAt: string;       // = query.start
  endAt: string;         // 마지막 항목 leaveAt (항목이 없으면 query.start)
  slackMinutes: number;  // (end − start) − stayMinutes − travelMinutes. 기다림과 끝 시각까지 남는 시간 포함
}

export interface DayPlan {
  conditions: DayQuery & { weekday: Weekday };
  items: DayPlanItem[];
  excluded: ExcludedSpot[];
  totals: DayPlanTotals;
  notices: string[];     // 한국어 안내 문장
}
```

`time.ts`: `toMinutes('09:30') === 570`, `toClock(570) === '09:30'`, `isValidDate('2026-02-30') === false`, `weekdayOf('2026-11-09') === 'mon'` (UTC 달력 계산이라 서버 시간대와 무관).

## zod 스키마

### `spotSchema` · `spotsFileSchema` — 데이터 파일 검증 (서버 시작 시)

| 필드 | 규칙 |
|---|---|
| `id` | `/^[a-z0-9]+(-[a-z0-9]+)*$/`, 파일 안에서 중복 없음 (`spot id가 중복되었습니다`) |
| `kind` · `zone` · `tags` · `goodFor` · `meals` | 상수 값만. `goodFor` 1개 이상 |
| `name` · `address` · `source` | 1자 이상 |
| `summary` | 1~80자 |
| `description` | 1개 이상 (각 1자 이상), `tips`는 0개 이상 |
| `location` | 위도 35.5~35.8, 경도 128.5~129.1 (청도군 범위) |
| `stayMinutes` | 정수 10~240 |
| `hours.days` | 7개 요일 키 모두. 시각은 `HH:MM`(00:00~23:59) |
| `hours` 구간 | `open < close` (`영업 시작 시각은 종료 시각보다 빨라야 해요.`), 같은 요일은 이른 시간부터 (`같은 요일의 영업시간은 이른 시간부터 적어야 해요.`), 겹침 없음 (`같은 요일의 영업시간은 겹칠 수 없어요.`) |
| `hours.lastEntryBeforeCloseMinutes` | 정수 0~120 |
| `images[]` | `url`은 `https://`로 시작하는 URL, `license`는 `'kogl-1'`만, `alt` · `credit` 1자 이상 |
| `sourceRef` | `provider: 'tourapi'`, `contentId`는 숫자 문자열 |
| `checkedAt` | 실제 있는 날짜 `YYYY-MM-DD` (`확인 날짜가 올바르지 않아요.`) |
| kind별 | `spot`이면 `tags` 1개 이상 (`관광지는 관심사를 하나 이상 골라야 해요.`), `restaurant`이면 `meals` 1개 이상 (`식당은 식사 종류를 하나 이상 골라야 해요.`), 식당이 아니면 `meals` 없음 (`식당이 아니면 식사 종류를 지정할 수 없어요.`) |

### `dayQuerySchema` — `/api/course` 쿼리 → `DayQuery`

| 필드 | 규칙 | 오류 메시지 |
|---|---|---|
| `date` | 필수, 실제 있는 날짜 `YYYY-MM-DD` | `방문 날짜가 올바르지 않아요.` |
| `start` | 필수, 08:00~14:00, 30분 단위 | `시작 시각은 08:00~14:00 사이 30분 단위로 골라주세요.` |
| `end` | 필수, 21:00 이하, 30분 단위, `start` + 3시간 이상 | `끝 시각은 시작보다 3시간 이상 늦고 21:00 이전이어야 해요.` |
| `with` | 필수, `COMPANIONS` 중 하나 | `동행은 solo, couple, family, friends 중 하나여야 해요.` |
| `tags` | 필수, 1개 이상 | `관심사를 하나 이상 골라주세요.` |
| `tags` 값 | `TAGS` 중에서 | `관심사는 nature, history, experience, food, photo 중에서 골라주세요.` |
| `exclude` | 선택, 쉼표 구분 문자열 하나 (같은 이름 반복 불가) | `제외할 장소 값이 올바르지 않아요.` |

`splitCsv`: 쉼표로 나누고 공백 제거 · 빈 값 제거 · 중복 제거. `tags`는 이후 `TAGS` 순서로 정렬. 날짜가 과거인지는 검사하지 않는다 (결정성).

### `spotsQuerySchema` — `/api/spots` 쿼리

| 필드 | 오류 메시지 |
|---|---|
| `tag` | `관심사는 nature, history, experience, food, photo 중에서 골라주세요.` |
| `zone` | `권역 값이 올바르지 않아요.` |
| `kind` | `종류는 spot, restaurant, cafe 중 하나여야 해요.` |

## spots.json 예 (청도읍성)

```json
{
  "id": "eupseong",
  "kind": "spot",
  "name": "청도읍성",
  "summary": "조선 시대 돌로 다시 쌓은 읍성. 복원된 성벽과 성문을 따라 걷기 좋아요.",
  "description": ["고을을 지키려고 쌓은 읍성으로, ...", "성벽 위와 성 둘레를 따라 산책로가 이어지고, ..."],
  "tips": ["석빙고까지 걸어서 몇 분 거리라 한 번에 묶어 보세요.", "..."],
  "zone": "hwayang-eup",
  "location": { "lat": 35.650809, "lng": 128.706588 },
  "tags": ["history", "photo"],
  "goodFor": ["solo", "couple", "family", "friends"],
  "stayMinutes": 50,
  "address": "경상북도 청도군 화양읍 동상리",
  "hours": {
    "days": {
      "mon": [{ "open": "09:00", "close": "18:00" }],
      "tue": [{ "open": "09:00", "close": "18:00" }],
      "...": "wed~sun 같음"
    },
    "note": "상시 개방 · 추천 관람 시간 기준"
  },
  "fee": "무료",
  "phone": "054-370-6062",
  "images": [
    {
      "url": "https://tong.visitkorea.or.kr/cms/resource/51/4118451_image2_1.jpg",
      "alt": "청도읍성 성벽 위 누각",
      "license": "kogl-1",
      "credit": "ⓒ한국관광공사"
    }
  ],
  "source": "한국관광공사",
  "sourceRef": { "provider": "tourapi", "contentId": "1621437" },
  "checkedAt": "2026-10-31"
}
```

식당은 `"kind": "restaurant"`, `"tags": []`, `"meals": ["lunch", "dinner"]`처럼 쓴다. `stayMinutes` · `tags` · `goodFor`는 우리 판단값이라 바꾸면 PR 설명에 근거를 적는다. 알고리즘 테스트는 실제 파일이 아니라 픽스처(`apps/api/test/fixtures/spots.ts`)를 쓰므로 데이터를 바꿔도 흔들리지 않는다.
