# 12 — 하루 일정 계산 `planDay`

- **목적**: 이동 시간 · 영업시간 · 식사 창을 반영해 하루 일정을 만드는 순수 함수 `planDay`를 구현하고, 기존 `recommendCourse`를 없앤다.
- **선행 조건**: 11(shared v2), Task 4(`spots.json` v2) 머지
- **학습 포인트**: 결정적 탐욕 알고리즘, 기준 계산값으로 고정한 시나리오 테스트, 순수 함수 분리
- **계획**: [`../plan-v2.md`](../plan-v2.md) Task 5 · 설계 [`../../01-product/day-course-design.md`](../../01-product/day-course-design.md) 6장 (2026-11-01 조정 포함)

## 프롬프트

```text
apps/api 에 하루 일정 계산을 구현해줘. 테스트를 먼저 쓰고 실패를 확인한 뒤 구현해.
아래 "계산 규칙"이 정답이야. 기대값은 Claude가 이 규칙으로 따로 계산한 값이니, 다르면 구현을 고쳐 (기대값을 구현에 맞춰 바꾸지 마). 규칙이 모호하거나 틀렸다고 판단되면 바꾸지 말고 보고해.

참고 문서:
#file:docs/01-product/day-course-design.md   (6장 하루 일정 계산 — "2026-11-01 조정" 표 포함)
#file:docs/05-copilot/plan-v2.md             (Task 5, Review Focus 3 · 4 · 5)
#file:docs/04-dev/conventions.md
#file:docs/04-dev/testing.md

만들 파일 (모두 순수 함수, Date · Math.random · process.env · I/O 금지, 입력 배열 · 객체를 바꾸지 마):
1. apps/api/src/domain/travel.ts
   - haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number  (지구 반지름 6371km)
   - travelMinutes(km: number): number  — km 가 0 이면 0, 아니면 ceil5(km × TRAVEL.roadFactor ÷ TRAVEL.speedKmh × 60 + TRAVEL.overheadMinutes)  (ceil5 = TRAVEL.roundTo 단위 올림)
2. apps/api/src/domain/opening.ts
   - fitVisit(spot: Spot, weekday: Weekday, arriveMinute: number, stayMinutes: number): { arriveMinute: number; waitMinutes: number } | null
     그 요일 구간을 시간 순으로 보며 t = max(arriveMinute, open) 일 때 t + stayMinutes ≤ close 이고 t ≤ close − (lastEntryBeforeCloseMinutes ?? 0) 인 첫 구간을 고른다.
     결과 arriveMinute = t, waitMinutes = t − 입력 arriveMinute. 맞는 구간이 없으면(휴무 포함) null
3. apps/api/src/domain/plan-day.ts
   - planDay(spots: Spot[], query: DayQuery): DayPlan   (공개 함수는 이것 하나, 단계는 내부 함수로 나누고 이름에 단계가 드러나게)
4. 삭제: apps/api/src/domain/recommend-course.ts, apps/api/test/domain/recommend-course.test.ts
5. apps/api/test/fixtures/spots.ts 를 아래 "픽스처" 11곳으로 교체 (export const fixtureSpots: Spot[])

계산 규칙 (분 단위 정수. 시각 문자열은 @cheongdo/shared 의 toMinutes · toClock, 요일은 weekdayOf, 상수는 TRAVEL · MEAL_WINDOWS · MEAL_MINUTES · DAY_LIMITS · START_CANDIDATES · TRAVEL_WEIGHT · TAGS 사용. 숫자 리터럴 금지)
0. weekday = weekdayOf(query.date), startMin = toMinutes(start), endMin = toMinutes(end)
   점심을 넣는 날: startMin ≤ DAY_LIMITS.lunchStartMax 이고 endMin ≥ DAY_LIMITS.lunchEndMin
   저녁을 넣는 날: endMin ≥ DAY_LIMITS.dinnerEndMin
   남은 식사(pending) = [점심?, 저녁?] 순서 목록
1. 후보: kind === 'spot' 이고 exclude 에 없는 장소.
   matchedTags = TAGS 순서로 query.tags 와 장소 tags 에 모두 있는 것, score = matchedTags.length × 10 + (goodFor 에 query.with 있으면 5)
   score 0 은 버림. matchedTags ≥ 1 이면 1순위, 아니면(5점) 보충 후보. 그 요일 hours 가 빈 배열이면 "휴무 후보"(일정에는 못 넣음)
   후보 정렬: score↓ → id↑
2. 시작 장소: 휴무가 아닌 1순위 후보 중 앞에서 START_CANDIDATES 개 (1순위가 하나도 없으면 휴무 아닌 보충 후보에서). 후보가 아예 없으면 시작 장소 없이 1번만 돌린다.
   시작 장소마다 아래 3~4를 처음부터 따로 돌려 일정을 만든다.
3. 일정 만들기 상태: 현재 위치 pos(처음엔 없음), 현재 시각 t = startMin, 쓴 장소 집합(관광 · 식당). 아래를 반복:
   a. pending 첫 식사에 대해, 그 끼니(meals)를 내고 그 요일 영업 구간이 있는 식당이 하나도 없으면 → notices 에 '이 시간에 영업하는 식당을 찾지 못했어요'(중복 없이) 넣고 그 식사를 pending 에서 빼고 a로
   b. pending 첫 식사가 있고 t ≥ 그 식사 창 from 이면 → 식사 넣기(4) 후 반복
   c. 관광 고르기: 쓰지 않은 휴무 아닌 후보 중 "들어갈 수 있는" 곳.
      들어갈 수 있는 곳 = 이동 = pos 가 없으면 0(거리 0) 아니면 travelMinutes(haversineKm(pos, 장소)),
        fit = fitVisit(장소, weekday, t + 이동, 장소.stayMinutes) 가 null 아님,
        떠나는 시각 L = fit.arriveMinute + stayMinutes ≤ endMin,
        pending 에 저녁이 남아 있으면 그 요일 구간 중 close 가 MEAL_WINDOWS.dinner.to(19:00) 보다 늦은 장소(야간 관광 후보)는 안 됨,
        pending 첫 식사가 있으면 L + (그 장소에서 a 조건의 식당들까지 이동 중 최소) ≤ 그 식사 창 to
      가치 = score − TRAVEL_WEIGHT × (이동 + fit.waitMinutes). 가치↓ → 이동↑ → id↑ 로 첫 번째.
      1순위 후보에서 먼저 찾고, 하나도 없을 때만 보충 후보에서 찾는다.
      단, 이 일정의 첫 관광 고르기에서는 시작 장소가 들어갈 수 있으면 그걸 고른다 (안 되면 위 규칙대로).
      고르면 visit 항목을 넣고(pos · t 갱신) 반복
   d. 고를 관광이 없고 pending 식사가 있으면 → 식사 넣기(4) 후 반복. 아니면 끝
4. 식사 넣기 (끼니 m, 창 [from, to]): pending 에서 m 을 뺀다.
   식당 후보 = meals 에 m 이 있고 오늘 아직 안 간 식당. 각 식당에 대해 이동 계산, 도착 = t + 이동,
     fit = fitVisit(식당, weekday, max(도착, from), MEAL_MINUTES), fit 이 있고 fit.arriveMinute ≤ to 이고 fit.arriveMinute + MEAL_MINUTES ≤ endMin 이어야 함.
     waitMinutes = fit.arriveMinute − 도착 (창 시작까지 기다린 것도 포함)
   이동↑ → id↑ 첫 식당으로 type 'meal'(meal: m) 항목. 없으면 notices 에 '이 시간에 영업하는 식당을 찾지 못했어요'(중복 없이)
   점심을 넣었으면 바로 쉬어 가기: 카페마다 fit = fitVisit(카페, weekday, t + 이동, 카페.stayMinutes), 떠나는 시각 ≤ endMin 인 것 중 이동↑ → id↑ → type 'rest'.
     없으면 notices 에 '이 시간에 영업하는 카페를 찾지 못했어요'(중복 없이)
5. 일정 고르기: 관광 score 합↑ → 총 이동분↓ → 시작 장소 id↑
6. 응답 DayPlan
   - conditions: { ...query, weekday }
   - items: order 1부터, spot 은 SpotSummary(id · kind · name · summary · zone · tags · stayMinutes · location, images 가 있으면 image = images[0], 없으면 image 키 자체 없음)
     travelMinutes, waitMinutes, distanceKm = 소수 1자리 반올림(Math.round(km × 10) / 10), arriveAt · leaveAt = toClock
     visit 은 matchedTags · score, meal · rest 는 matchedTags [] · score 0. 식사 체류는 MEAL_MINUTES, 카페 체류는 그 카페 stayMinutes
   - excluded: 1번 후보(휴무 후보 포함) 중 일정에 없는 곳, 후보 정렬 순서. 휴무 후보는 CLOSED_ON_DAY, 나머지는 NOT_ENOUGH_TIME
   - totals: visitCount(visit 수), stayMinutes(모든 항목 leave − arrive 합), travelMinutes(합), startAt = query.start, endAt = 마지막 leaveAt(항목이 없으면 query.start), slackMinutes = (endMin − startMin) − stayMinutes − travelMinutes
   - notices: 위 규칙으로 쌓인 문장 (없으면 [])

테스트
- apps/api/test/domain/travel.test.ts
  haversineKm({lat:35.65,lng:128.73},{lat:35.70,lng:128.73}) ≈ 5.560 (toBeCloseTo 2자리), travelMinutes → 20
  haversineKm({lat:35.65,lng:128.73},{lat:35.65,lng:128.75}) ≈ 1.807 → 10
  haversineKm({lat:35.65,lng:128.73},{lat:35.651,lng:128.73}) ≈ 0.111 → 10
  travelMinutes(0) → 0
- apps/api/test/domain/opening.test.ts  (s: mon [] 나머지 09:00–18:00, lastEntryBeforeCloseMinutes 15 / b: 매일 11:00–14:30, 17:00–21:00)
  fitVisit(s,'sat',480,40) → { arriveMinute: 540, waitMinutes: 60 }
  fitVisit(s,'sat',1050,40) → null      (Review Focus 4)
  fitVisit(s,'sat',1066,10) → null      fitVisit(s,'sat',1065,10) → { arriveMinute: 1065, waitMinutes: 0 }
  fitVisit(b,'tue',900,60) → { arriveMinute: 1020, waitMinutes: 120 }   (Review Focus 3)
  fitVisit(b,'tue',840,60) → { arriveMinute: 1020, waitMinutes: 180 }
  fitVisit(s,'mon',600,30) → null
- apps/api/test/domain/plan-day.test.ts — 픽스처로 S1~S8. 각 시나리오에서 items 의 (type · meal · spot.id · travelMinutes · waitMinutes · distanceKm · arriveAt · leaveAt · score), excluded 의 (spot.id · reason), totals 전체, notices 를 아래 값 그대로 리터럴로 검사
  공통 성질도 모든 시나리오에서 검사: arriveAt = 이전 leaveAt + travelMinutes + waitMinutes(첫 항목은 start + waitMinutes), 마지막 leaveAt ≤ end,
  모든 항목이 fitVisit 로 그 요일 영업 안, 같은 쿼리 두 번 → toEqual, 입력 배열을 뒤집어도 같은 결과, 입력 배열 · 객체가 바뀌지 않음(structuredClone 비교)
  추가: 이미지가 있는 장소는 item.spot.image 가 images[0], 없으면 'image' 키 없음

픽스처 (모두 zone 'hwayang-eup', name = id, summary `${id} summary`, description ['d'], tips [], address '경상북도 청도군', images [], source 'test', checkedAt '2026-10-31')
| id | kind | lat | lng | tags | goodFor | stay | hours | 기타 |
| s-forest | spot | 35.65 | 128.73 | nature | couple,family | 60 | 매일 09:00–18:00 | |
| s-luge | spot | 35.66 | 128.73 | experience | family,friends | 60 | 월 휴무, 10:00–18:00 | |
| s-museum | spot | 35.65 | 128.75 | history | solo,family | 60 | 월 휴무, 09:00–18:00 | lastEntry 30 |
| s-temple | spot | 35.63 | 128.73 | history,nature | solo,couple | 40 | 매일 09:00–18:00 | |
| s-lights | spot | 35.67 | 128.74 | photo,experience | couple,family,friends | 90 | 매일 16:00–22:00 | |
| s-tunnel | spot | 35.70 | 128.73 | food,photo | couple,family,friends | 60 | 매일 09:30–17:45 | |
| r-break | restaurant | 35.655 | 128.735 | (없음) | family | 60 | 매일 11:00–14:30, 17:00–21:00 | meals lunch,dinner |
| r-allday | restaurant | 35.64 | 128.74 | (없음) | family | 60 | 월 휴무, 10:00–20:00 | meals lunch,dinner |
| r-lunch | restaurant | 35.665 | 128.735 | (없음) | family | 60 | 월 휴무, 11:00–15:00 | meals lunch |
| c-near | cafe | 35.656 | 128.736 | (없음) | family | 30 | 매일 10:00–21:00 | |
| c-far | cafe | 35.68 | 128.73 | (없음) | family | 40 | 월 휴무, 11:00–19:00 | |
fixtureSpots 는 spotsFileSchema 를 통과해야 해 (테스트 하나로 확인). 이미지 테스트용으로는 테스트 안에서 s-forest 에 이미지 1장을 붙인 복사본을 써.

시나리오 기대값 (기본 query: with family, tags nature,experience, exclude [])
S1: with=family tags=nature,experience exclude= date=2026-11-07 start=10:00 end=19:00  → weekday sat
  1. visit s-temple  travel 0 · wait 0 · 0km · 10:00–10:40 · score 10 · [nature]
  2. visit s-forest  travel 10 · wait 0 · 2.2km · 10:50–11:50 · score 15 · [nature]
  3. meal:lunch r-allday  travel 10 · wait 0 · 1.4km · 12:00–13:00 · score 0
  4. rest c-near  travel 10 · wait 0 · 1.8km · 13:10–13:40 · score 0
  5. visit s-luge  travel 10 · wait 0 · 0.7km · 13:50–14:50 · score 15 · [experience]
  6. visit s-museum  travel 10 · wait 0 · 2.1km · 15:00–16:00 · score 5
  7. visit s-tunnel  travel 20 · wait 0 · 5.8km · 16:20–17:20 · score 5
  8. meal:dinner r-break  travel 20 · wait 0 · 5km · 17:40–18:40 · score 0
  excluded: s-lights NOT_ENOUGH_TIME
  totals: visitCount 5 · stayMinutes 430 · travelMinutes 90 · startAt 10:00 · endAt 18:40 · slackMinutes 20
  notices: []
S2: with=family tags=nature,experience exclude= date=2026-11-07 start=08:00 end=14:00  → weekday sat
  1. visit s-temple  travel 0 · wait 60 · 0km · 09:00–09:40 · score 10 · [nature]
  2. visit s-forest  travel 10 · wait 0 · 2.2km · 09:50–10:50 · score 15 · [nature]
  3. visit s-luge  travel 10 · wait 0 · 1.1km · 11:00–12:00 · score 15 · [experience]
  4. meal:lunch r-break  travel 10 · wait 0 · 0.7km · 12:10–13:10 · score 0
  5. rest c-near  travel 10 · wait 0 · 0.1km · 13:20–13:50 · score 0
  excluded: s-lights NOT_ENOUGH_TIME, s-museum NOT_ENOUGH_TIME, s-tunnel NOT_ENOUGH_TIME
  totals: visitCount 3 · stayMinutes 250 · travelMinutes 40 · startAt 08:00 · endAt 13:50 · slackMinutes 70
  notices: []
S3: with=family tags=nature,experience exclude= date=2026-11-07 start=12:30 end=18:00  → weekday sat
  1. visit s-temple  travel 0 · wait 0 · 0km · 12:30–13:10 · score 10 · [nature]
  2. visit s-forest  travel 10 · wait 0 · 2.2km · 13:20–14:20 · score 15 · [nature]
  3. visit s-luge  travel 10 · wait 0 · 1.1km · 14:30–15:30 · score 15 · [experience]
  4. visit s-lights  travel 10 · wait 20 · 1.4km · 16:00–17:30 · score 15 · [experience]
  excluded: s-museum NOT_ENOUGH_TIME, s-tunnel NOT_ENOUGH_TIME
  totals: visitCount 4 · stayMinutes 250 · travelMinutes 30 · startAt 12:30 · endAt 17:30 · slackMinutes 50
  notices: []
S4: with=family tags=nature,experience exclude= date=2026-11-07 start=10:00 end=21:00  → weekday sat
  1. visit s-temple  travel 0 · wait 0 · 0km · 10:00–10:40 · score 10 · [nature]
  2. visit s-forest  travel 10 · wait 0 · 2.2km · 10:50–11:50 · score 15 · [nature]
  3. meal:lunch r-allday  travel 10 · wait 0 · 1.4km · 12:00–13:00 · score 0
  4. rest c-near  travel 10 · wait 0 · 1.8km · 13:10–13:40 · score 0
  5. visit s-luge  travel 10 · wait 0 · 0.7km · 13:50–14:50 · score 15 · [experience]
  6. visit s-museum  travel 10 · wait 0 · 2.1km · 15:00–16:00 · score 5
  7. visit s-tunnel  travel 20 · wait 0 · 5.8km · 16:20–17:20 · score 5
  8. meal:dinner r-break  travel 20 · wait 0 · 5km · 17:40–18:40 · score 0
  9. visit s-lights  travel 10 · wait 0 · 1.7km · 18:50–20:20 · score 15 · [experience]
  excluded: (없음)
  totals: visitCount 6 · stayMinutes 520 · travelMinutes 100 · startAt 10:00 · endAt 20:20 · slackMinutes 40
  notices: []
S5: with=family tags=history,experience exclude= date=2026-11-09 start=10:00 end=17:00  → weekday mon
  1. visit s-temple  travel 0 · wait 0 · 0km · 10:00–10:40 · score 10 · [history]
  2. visit s-forest  travel 10 · wait 0 · 2.2km · 10:50–11:50 · score 5
  3. meal:lunch r-break  travel 10 · wait 0 · 0.7km · 12:00–13:00 · score 0
  4. rest c-near  travel 10 · wait 0 · 0.1km · 13:10–13:40 · score 0
  5. visit s-tunnel  travel 20 · wait 0 · 4.9km · 14:00–15:00 · score 5
  excluded: s-lights NOT_ENOUGH_TIME, s-luge CLOSED_ON_DAY, s-museum CLOSED_ON_DAY
  totals: visitCount 3 · stayMinutes 250 · travelMinutes 50 · startAt 10:00 · endAt 15:00 · slackMinutes 120
  notices: []
S6: with=family tags=nature,experience exclude= date=2026-11-09 start=10:00 end=17:00  (식당 3곳 모두 mon: [] 으로 바꾼 픽스처)  → weekday mon
  1. visit s-temple  travel 0 · wait 0 · 0km · 10:00–10:40 · score 10 · [nature]
  2. visit s-forest  travel 10 · wait 0 · 2.2km · 10:50–11:50 · score 15 · [nature]
  3. visit s-tunnel  travel 20 · wait 0 · 5.6km · 12:10–13:10 · score 5
  excluded: s-lights NOT_ENOUGH_TIME, s-luge CLOSED_ON_DAY, s-museum CLOSED_ON_DAY
  totals: visitCount 3 · stayMinutes 160 · travelMinutes 30 · startAt 10:00 · endAt 13:10 · slackMinutes 230
  notices: ["이 시간에 영업하는 식당을 찾지 못했어요"]
S7: with=solo tags=food exclude= date=2026-11-07 start=10:00 end=17:00  → weekday sat
  1. visit s-tunnel  travel 0 · wait 0 · 0km · 10:00–11:00 · score 10 · [food]
  2. visit s-museum  travel 20 · wait 0 · 5.8km · 11:20–12:20 · score 5
  3. meal:lunch r-allday  travel 10 · wait 0 · 1.4km · 12:30–13:30 · score 0
  4. rest c-near  travel 10 · wait 0 · 1.8km · 13:40–14:10 · score 0
  5. visit s-temple  travel 15 · wait 0 · 2.9km · 14:25–15:05 · score 5
  excluded: (없음)
  totals: visitCount 3 · stayMinutes 250 · travelMinutes 55 · startAt 10:00 · endAt 15:05 · slackMinutes 115
  notices: []
S8: with=family tags=nature,experience exclude=s-forest date=2026-11-07 start=10:00 end=19:00  → weekday sat
  1. visit s-luge  travel 0 · wait 0 · 0km · 10:00–11:00 · score 15 · [experience]
  2. visit s-temple  travel 15 · wait 0 · 3.3km · 11:15–11:55 · score 10 · [nature]
  3. meal:lunch r-allday  travel 10 · wait 0 · 1.4km · 12:05–13:05 · score 0
  4. rest c-near  travel 10 · wait 0 · 1.8km · 13:15–13:45 · score 0
  5. visit s-museum  travel 10 · wait 0 · 1.4km · 13:55–14:55 · score 5
  6. visit s-tunnel  travel 20 · wait 0 · 5.8km · 15:15–16:15 · score 5
  7. meal:dinner r-break  travel 20 · wait 55 · 5km · 17:30–18:30 · score 0
  excluded: s-lights NOT_ENOUGH_TIME
  totals: visitCount 4 · stayMinutes 370 · travelMinutes 85 · startAt 10:00 · endAt 18:30 · slackMinutes 85
  notices: []

제약:
- apps/api/src/routes · app.ts · index.ts 는 수정하지 마 (다음 프롬프트 13에서 연결). recommend-course 를 지워서 routes/course.ts 가 깨지는 타입 오류와 라우트 테스트 실패는 예상된 것이니 그대로 둬
- apps/web · packages/shared 수정 금지 (shared 에 필요한 게 없다고 판단되면 보고만 해)
- 새 npm 의존성 금지

완료 기준:
- cd apps/api && npx vitest run test/domain test/data 통과
- npx eslint apps/api/src/domain apps/api/test/domain apps/api/test/fixtures 통과, npx prettier --check apps/api 통과
- npx tsc --noEmit -p apps/api 의 오류가 routes/course.ts · test/routes 쪽(프롬프트 13 대상)에만 남아 있음 — 개수와 파일 목록 보고
- 커버리지: npx vitest run --coverage test/domain (apps/api) 에서 src/domain 3개 파일 라인 커버리지 90% 이상

끝나면 보고: 변경 · 삭제 파일, 실행한 명령과 결과(테스트 개수), 남은 타입 오류 목록, 규칙이 모호해 스스로 정한 부분.
```

## 리뷰 체크리스트

- [ ] S1~S8 기대값이 테스트에 리터럴로 들어 있고 구현에 맞춰 바뀌지 않음
- [ ] 기다림이 가치에 들어감, 저녁 전 야간 관광 미룸, 시작 후보는 1순위에서, 식당 중복 없음 (설계 2026-11-01 조정)
- [ ] 쉬는 시간 사이 도착 → 다음 구간까지 기다림 (Review Focus 3)
- [ ] 마감 직전 · 입장 마감 (Review Focus 4)
- [ ] 식당 전부 휴무 → 점심 · 쉬어 가기 없이 안내 문장 (Review Focus 5)
- [ ] `Date` · `Math.random` · 입력 변경 없음, 숫자 리터럴 대신 shared 상수
- [ ] 리뷰어가 실제 `spots.json`으로 기준 계산과 차등 비교(무작위 쿼리)해서 같은 결과
