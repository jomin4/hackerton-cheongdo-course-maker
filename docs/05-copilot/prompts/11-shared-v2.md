# 11 — shared v2 (상수 · 타입 · 스키마 · 시각 도우미)

- **목적**: 하루 일정(v2)에 맞게 `packages/shared`의 상수 · 타입 · zod 스키마를 바꾸고, 시각 · 날짜 · 운영시간 표시 도우미를 추가한다.
- **선행 조건**: 통합 브랜치 `feat/day-course-v2` (Task 2 장소 목록 커밋)
- **학습 포인트**: 구조화된 운영시간 모델, 시간대와 무관한 요일 계산, 객체 단위 zod 검증(`superRefine`)
- **계획**: [`../plan-v2.md`](../plan-v2.md) Task 3

## 프롬프트

```text
packages/shared 를 하루 일정(v2) 설계에 맞게 바꿔줘. 이번 작업은 packages/shared 만 건드려. apps/api · apps/web 은 수정하지 마.

참고 문서:
#file:docs/01-product/day-course-design.md   (5장 데이터 설계, 6장 하루 일정 계산)
#file:docs/05-copilot/plan-v2.md             (Global Constraints, Review Focus, Task 3)
#file:docs/04-dev/conventions.md
#file:docs/04-dev/testing.md

1. src/constants.ts
   - 유지: TAGS · Tag · TAG_LABELS, COMPANIONS · Companion · COMPANION_LABELS
   - 삭제: HOURS · Hours, TRAVEL_MINUTES, UNVERIFIED_SOURCE
   - ZONES 를 9개로 (설계 5장 순서 그대로): cheongdo-eup, hwayang-eup, iseo-myeon, gaknam-myeon, punggak-myeon, gakbuk-myeon, unmun-myeon, geumcheon-myeon, maejeon-myeon
     ZONE_LABELS: 청도읍 · 화양읍 · 이서면 · 각남면 · 풍각면 · 각북면 · 운문면 · 금천면 · 매전면
   - 추가:
     KINDS = ['spot','restaurant','cafe'] as const, Kind, KIND_LABELS = { spot:'관광', restaurant:'식당', cafe:'카페' }
     WEEKDAYS = ['mon','tue','wed','thu','fri','sat','sun'] as const, Weekday, WEEKDAY_LABELS = { mon:'월', tue:'화', wed:'수', thu:'목', fri:'금', sat:'토', sun:'일' }
     MEALS = ['lunch','dinner'] as const, Meal
     TRAVEL = { roadFactor: 1.4, speedKmh: 40, overheadMinutes: 5, roundTo: 5 } as const
     MEAL_WINDOWS = { lunch: { from: '11:30', to: '13:30' }, dinner: { from: '17:30', to: '19:00' } } as const
     MEAL_MINUTES = 60
     DAY_LIMITS = { startMin: '08:00', startMax: '14:00', endMax: '21:00', minSpanMinutes: 180, stepMinutes: 30, lunchStartMax: '12:00', lunchEndMin: '14:00', dinnerEndMin: '18:30' } as const
     START_CANDIDATES = 5
     TRAVEL_WEIGHT = 0.5
     DATA_ATTRIBUTION = '데이터 제공: ⓒ한국관광공사'

2. src/types.ts — 설계 5장 · 6장 그대로
   - TimeRange { open: string; close: string }
   - WeeklyHours { days: Record<Weekday, TimeRange[]>; lastEntryBeforeCloseMinutes?: number; note?: string }
   - SpotImage { url: string; alt: string; license: 'kogl-1'; credit: string }
   - Spot { id; kind: Kind; name; summary; description: string[]; tips: string[]; zone: Zone; location: { lat: number; lng: number };
     tags: Tag[]; goodFor: Companion[]; stayMinutes: number; meals?: Meal[]; address: string; hours: WeeklyHours;
     fee?: string; phone?: string; images: SpotImage[]; source: string; sourceRef?: { provider: 'tourapi'; contentId: string }; checkedAt: string }
     (routeOrder · closed · 옛 OpeningHours 삭제)
   - SpotSummary = Pick<Spot, 'id'|'kind'|'name'|'summary'|'zone'|'tags'|'stayMinutes'|'location'> & { image?: SpotImage }
   - DayQuery { date: string; start: string; end: string; with: Companion; tags: Tag[]; exclude: string[] }
   - DayPlanItem { order; type: 'visit'|'meal'|'rest'; meal?: Meal; spot: SpotSummary; travelMinutes; waitMinutes; distanceKm; arriveAt: string; leaveAt: string; matchedTags: Tag[]; score: number }
   - ExcludedReason = 'NOT_ENOUGH_TIME' | 'CLOSED_ON_DAY'
   - ExcludedSpot { spot: SpotSummary; reason: ExcludedReason }
   - DayPlanTotals { visitCount; stayMinutes; travelMinutes; startAt: string; endAt: string; slackMinutes }
   - DayPlan { conditions: DayQuery & { weekday: Weekday }; items: DayPlanItem[]; excluded: ExcludedSpot[]; totals: DayPlanTotals; notices: string[] }
   - 삭제: OpeningHours, CourseQuery, CourseStop, CourseTotals, Course

3. src/time.ts (새 파일)
   - toMinutes(clock: string): number   "09:30" → 570
   - toClock(minutes: number): string   570 → "09:30", 1260 → "21:00" (두 자리 0 채움)
   - isValidDate(date: string): boolean  YYYY-MM-DD 형식이고 실제로 있는 날짜인지. Date.UTC(y, m-1, d) 로 만든 날짜의 getUTCFullYear/Month/Date 가 입력과 같은지로 판단
   - weekdayOf(date: string): Weekday    new Date(Date.UTC(y, m-1, d)).getUTCDay() 로 계산 (서버 시간대와 무관해야 함. new Date('2026-11-09') 나 getDay() 금지)

4. src/hours-format.ts (새 파일)
   - formatWeeklyHours(hours: WeeklyHours): string[]
     - 요일별 구간을 "HH:MM–HH:MM" (en dash –) 로, 구간 여러 개는 ", " 로 이은 문자열을 만들고, 같은 문자열인 요일끼리 묶는다
     - 요일 표기: 월~일 순서에서 연속 3일 이상은 "수~일", 연속 2일은 "토·일", 묶음 사이는 "·" (일요일→월요일은 연속으로 보지 않음)
     - 줄 순서: 영업 묶음을 그 묶음의 첫 요일 순으로, 휴무 묶음은 맨 끝에 "… 휴무"
     - 7일이 모두 같으면 "매일 …" (전부 휴무면 ['매일 휴무'])
     - note · lastEntryBeforeCloseMinutes 는 이 함수 결과에 넣지 않는다 (화면에서 따로 보여 줌)
     - 예: mon:[] 나머지 09:30–18:00 → ['화~일 09:30–18:00', '월 휴무']
           매일 09:00–18:00 → ['매일 09:00–18:00']
           tue 11:00–14:30, 17:00–21:00 · 나머지 휴무 → ['화 11:00–14:30, 17:00–21:00', '월·수~일 휴무']
           sat·sun 10:00–22:00, 나머지 10:00–18:00 → ['월~금 10:00–18:00', '토·일 10:00–22:00']

5. src/schemas.ts
   - splitCsv 유지. courseQuerySchema · ParsedCourseQuery · CourseQueryTypeCheck 삭제
   - spotSchema (설계 5장 검증 규칙 전부, 객체 단위 규칙은 superRefine 으로 path 를 정확히)
     - id: 기존 kebab-case 정규식 유지. name · summary(≤80) · description(1개 이상) · tips · address · source 는 기존 규칙
     - kind: z.enum(KINDS), zone: z.enum(ZONES)
     - location: lat 35.5~35.8, lng 128.5~129.1 (청도군 범위)
     - tags: z.array(z.enum(TAGS)), kind 가 spot 이면 1개 이상 (식당 · 카페는 빈 배열 허용)
     - goodFor 1개 이상, stayMinutes 정수 10~240
     - meals: z.array(z.enum(MEALS)) optional. kind=restaurant 면 1개 이상 필수, restaurant 가 아니면 있으면 안 됨
     - hours: days 는 7개 요일 키 전부 필수, 각 TimeRange 는 "HH:MM"(00:00~23:59) 이고 open < close, 같은 요일 구간끼리 겹치지 않음(맞닿는 건 허용)
       lastEntryBeforeCloseMinutes 정수 0~120 optional, note optional
     - images: url 은 https:// 로 시작, alt · credit 1자 이상, license 는 z.literal('kogl-1')
     - sourceRef optional: { provider: z.literal('tourapi'), contentId: 숫자 문자열 }
     - checkedAt 필수, YYYY-MM-DD 이고 isValidDate 통과
   - spotsFileSchema: 배열 + id 중복이면 실패 (기존 메시지 유지)
   - dayQuerySchema (문자열 쿼리 → DayQuery)
     - date: 누락 · 형식 오류 · 없는 날짜(isValidDate false) 모두 '방문 날짜가 올바르지 않아요.'
     - start: "HH:MM" 이고 08:00~14:00, 30분 단위. 아니면(누락 포함) '시작 시각은 08:00~14:00 사이 30분 단위로 골라주세요.'
     - end: "HH:MM" 이고 30분 단위, 21:00 이하, end − start ≥ 180분. 아니면(누락 포함) '끝 시각은 시작보다 3시간 이상 늦고 21:00 이전이어야 해요.'  (path 는 ['end'])
     - with · tags · exclude: 기존 courseQuerySchema 의 규칙 · 메시지 · TAGS 순서 정렬 그대로
     - 숫자 상수를 다시 쓰지 말고 DAY_LIMITS 와 toMinutes 를 사용
     - 기존처럼 타입 검사 줄을 둬서 파싱 결과가 DayQuery 에 맞는지 컴파일 시점에 확인 (DayQueryTypeCheck)
   - spotsQuerySchema: tag · zone 에 kind(z.enum(KINDS)) optional 추가
     zone 메시지는 '권역 값이 올바르지 않아요.', kind 메시지는 '종류는 spot, restaurant, cafe 중 하나여야 해요.'

6. src/index.ts: time.ts · hours-format.ts 도 export

7. 테스트 (vitest, src 옆에 *.test.ts)
   - time.test.ts
     toMinutes('09:30') 570, toClock(570) '09:30', toClock(1260) '21:00'
     weekdayOf('2026-11-07') 'sat', weekdayOf('2026-11-09') 'mon', weekdayOf('2026-01-01') 'thu'
     isValidDate: '2026-02-30' false, '2026-13-01' false, '2026-1-5' false, '2028-02-29' true, '2026-02-28' true
     시간대 확인: process.env.TZ 를 'America/Los_Angeles' 와 'Asia/Seoul' 로 바꿔 가며 weekdayOf('2026-11-09') 가 둘 다 'mon' (테스트 끝나면 원래 값 복구)
   - hours-format.test.ts: 위 4번 예시 4개 + 전부 휴무 → ['매일 휴무']
   - schemas.test.ts (기존 courseQuerySchema 테스트는 dayQuerySchema 테스트로 교체, splitCsv · spotsQuerySchema 테스트는 맞게 수정)
     dayQuerySchema
       { date:'2026-11-07', start:'10:00', end:'19:00', with:'family', tags:'experience,nature' }
         → { date:'2026-11-07', start:'10:00', end:'19:00', with:'family', tags:['nature','experience'], exclude:[] }
       date '2026-02-30' · '2026-13-01' · 누락 → issues[0].message '방문 날짜가 올바르지 않아요.'
       start '07:30' · '14:30' · '10:15' · 누락 → '시작 시각은 08:00~14:00 사이 30분 단위로 골라주세요.'
       end '21:30' · '12:30'(start 10:00) · '10:45' → '끝 시각은 시작보다 3시간 이상 늦고 21:00 이전이어야 해요.'
       경계 통과: start '14:00' end '17:00', start '08:00' end '21:00'
       tags ' , ' · 누락 → '관심사를 하나 이상 골라주세요.', 동행 오류 메시지 기존과 같음
       v1 쿼리 { hours:'4', with:'solo', tags:'nature' } → 실패, 메시지 '방문 날짜가 올바르지 않아요.'
     spotSchema: 테스트 안에 유효한 기본 장소(spot)와 기본 식당(restaurant) 하나씩 만들고 통과 확인 후, 한 필드씩 바꿔 실패 확인
       open '18:00' close '09:00' / 같은 요일 구간 겹침(10:00–14:00, 13:00–18:00) / '25:00' / days 에서 sun 키 빠짐
       restaurant 인데 meals 없음 · 빈 배열 / spot 인데 meals 있음 / spot 인데 tags []
       location lat 37.5 · lng 127.0 / images[0].license 'kogl-3' / images[0].url 'http://…' / checkedAt 없음 · '2026-02-30'
       통과해야 하는 것: 맞닿는 구간(11:00–15:00, 15:00–21:00), cafe 인데 tags [], images []
     spotsFileSchema: id 중복 → 실패
     spotsQuerySchema: kind 'cafe' 통과, kind 'bar' → '종류는 spot, restaurant, cafe 중 하나여야 해요.', zone 'gakbuk-myeon' 통과

제약:
- packages/shared 밖의 파일은 수정하지 마 (apps/api · apps/web 은 다음 프롬프트들에서 옮긴다)
- 그래서 저장소 전체 npm run typecheck · npm test 는 apps/api · apps/web 에서 실패하는 게 정상이야. 그 실패를 고치려고 api · web 을 건드리지 마. 실행은 해 보고 보고서에 "api · web 실패는 예상된 것" 으로 적어
- 새 npm 의존성 추가 금지 (날짜 계산 라이브러리 쓰지 마)
- 사용자에게 보이는 문구는 위에 적은 한국어 그대로

완료 기준:
- npm test -w packages/shared 통과
- npm run typecheck -w packages/shared 통과
- npm run lint -w packages/shared 통과
- npx prettier --check packages/shared 통과

끝나면 보고: 변경 파일 목록, 실행한 명령과 결과(테스트 개수), apps/api · apps/web 에서 깨진 타입 오류 개수와 대표 오류 3개, 문서와 다르게 한 부분과 이유.
```

## 리뷰 체크리스트

- [ ] `weekdayOf` · `isValidDate`가 `Date.UTC` · `getUTC*`만 씀 (TZ를 바꿔도 같은 결과)
- [ ] `dayQuerySchema`가 "오늘" 같은 현재 시각을 쓰지 않음 (결정성)
- [ ] 쉬는 시간 구간 2개, 맞닿는 구간은 통과 · 겹치는 구간은 실패
- [ ] `meals`는 식당에만, 식당이면 필수
- [ ] 오류 메시지가 문서 문구와 한 글자도 다르지 않음
- [ ] 숫자 상수가 `DAY_LIMITS` · `MEAL_WINDOWS` 등 한 곳에만
- [ ] `packages/shared` 밖 변경 없음
