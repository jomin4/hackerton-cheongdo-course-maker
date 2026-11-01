# 13 — API v2 (하루 일정 · 장소 종류)

- **목적**: `/api/course`를 하루 일정(`planDay`)으로, `/api/spots`를 장소 종류 · 좌표 · 대표 사진이 담긴 v2 응답으로 바꾼다.
- **선행 조건**: 12(planDay) 머지
- **학습 포인트**: 쿼리 검증 → 순수 함수 → 응답의 얇은 라우트, 거리 기반 주변 장소
- **계획**: [`../plan-v2.md`](../plan-v2.md) Task 6

## 프롬프트

```text
apps/api 의 라우트를 v2 로 바꿔줘. 테스트를 먼저 고치고 실패를 확인한 뒤 구현해.

참고 문서:
#file:docs/01-product/day-course-design.md   (6장 입력 · 응답)
#file:docs/05-copilot/plan-v2.md             (Task 6)
#file:docs/04-dev/conventions.md
#file:docs/04-dev/testing.md

바꿀 것:
1. src/routes/course.ts
   - GET /api/course?date&start&end&with&tags&exclude → dayQuerySchema 로 검증 → planDay(spots.findAll(), query) 결과(DayPlan)를 그대로 응답
   - Cache-Control: public, max-age=300 유지. hours 파라미터는 더 이상 없음
2. src/routes/spots.ts
   - toSummary(spot): SpotSummary = id · kind · name · summary · zone · tags · stayMinutes · location, images 가 있으면 image = images[0] (없으면 image 키 없음)
     같은 변환이 domain/plan-day.ts 에도 있으면 한 곳(예: src/domain/spot-summary.ts)으로 모아 둘 다 그걸 쓰게 해
   - GET /api/spots?tag&zone&kind → spotsQuerySchema 로 검증, 세 조건 모두 AND, 응답 { items: SpotSummary[], total } (순서는 파일 순서)
   - GET /api/spots/:id → { spot, nearby }
     nearby = kind === 'spot' 인 장소 중 자기 자신 제외, haversineKm(자신, 후보) ↑ → id ↑, 최대 3개, SpotSummary (식당 · 카페 상세에서도 주변 관광지를 보여 주기 위함)
     없으면 404 SPOT_NOT_FOUND '장소를 찾을 수 없어요.' (관광지 → 장소, 식당 · 카페도 있으니까)
3. src/data/spot-repository.ts · app.ts · index.ts: 타입이 맞게만 (동작 변경 없음)

테스트 (test/routes/*, 픽스처는 test/fixtures/spots.ts 의 fixtureSpots 11곳)
- course.test.ts (기존 v1 테스트는 모두 v2 로 교체)
  - GET /api/course?date=2026-11-07&start=10:00&end=19:00&with=family&tags=nature,experience → 200
    items 의 spot.id 순서 ['s-temple','s-forest','r-allday','c-near','s-luge','s-museum','s-tunnel','r-break'],
    items type 순서 ['visit','visit','meal','rest','visit','visit','visit','meal'], conditions.weekday 'sat', excluded [{ spot.id 's-lights', reason 'NOT_ENOUGH_TIME' }],
    Cache-Control 'public, max-age=300'
  - tags=experience,nature 로 보내도 conditions.tags 는 ['nature','experience']
  - v1 쿼리 ?hours=4&with=family&tags=nature → 400, code INVALID_QUERY, message '방문 날짜가 올바르지 않아요.', details[0].field 'date'
  - date=2026-02-30 → 400 '방문 날짜가 올바르지 않아요.'
  - start=07:30 → 400 '시작 시각은 08:00~14:00 사이 30분 단위로 골라주세요.'
  - end=12:30 (start 10:00) → 400 '끝 시각은 시작보다 3시간 이상 늦고 21:00 이전이어야 해요.', details 에 field 'end'
  - exclude=s-forest&exclude=s-luge (같은 이름 두 번) → 400 '제외할 장소 값이 올바르지 않아요.'
  - date · with · tags 가 모두 틀리면 message 는 첫 오류(날짜)이고 details 에 date · with · tags 가 모두 있음
  - 알 수 없는 exclude id(nope)는 200, conditions.exclude 에 그대로 남음
  - exclude 로 관광지 6곳을 모두 빼면 200 이고 items 에 visit 이 없으며 excluded 는 [] (관광지가 없는 일정도 오류가 아님)
- spots.test.ts
  - GET /api/spots → total 11, item 에 kind · location 이 있고 images 가 없는 장소는 'image' 키가 없음
  - ?kind=cafe → ids ['c-near','c-far'] (파일 순서), ?kind=restaurant&tag=nature → total 0
  - ?kind=bar → 400 '종류는 spot, restaurant, cafe 중 하나여야 해요.'
  - ?zone=gakbuk-myeon → 200 total 0 (9개 읍면 모두 허용), ?zone=seoul → 400 '권역 값이 올바르지 않아요.'
  - GET /api/spots/s-forest → nearby ids ['s-luge','s-museum','s-temple']
  - GET /api/spots/c-far → nearby[0].id 's-lights', nearby 모두 kind 'spot', 길이 3
  - GET /api/spots/nope → 404 SPOT_NOT_FOUND '장소를 찾을 수 없어요.'
  - 이미지가 있는 장소: 테스트 안에서 s-forest 에 images 1장을 붙인 저장소로 /api/spots 를 부르면 그 item.image 가 그 사진
- health.test.ts · errors.test.ts: v2 픽스처에 맞게만 고침 (health 의 spots 는 11)

제약:
- src/domain/plan-day.ts 의 계산 규칙은 바꾸지 마 (요약 변환을 옮기는 리팩터링만 허용, test/domain 은 그대로 통과해야 함)
- apps/web · packages/shared 수정 금지
- 새 npm 의존성 금지

완료 기준:
- npm test -w apps/api 전부 통과, npm run typecheck -w apps/api 통과(이제 api 타입 오류 0), npx eslint apps/api/src apps/api/test, npx prettier --check apps/api packages docs
- npm run build -w apps/api 성공 (dist/index.js)
- apps/web 의 타입 오류 · 테스트 실패는 예상된 것 (프롬프트 14~16 대상) — 개수만 보고

끝나면 보고: 변경 파일, 실행한 명령과 결과(테스트 개수), 문서와 다르게 한 부분과 이유.
```

## 리뷰 체크리스트

- [ ] 리뷰어가 실제 `spots.json`으로 서버를 띄워 `/api/course?date=2026-11-07&start=10:00&end=19:00&with=family&tags=nature,experience` 200
- [ ] v1 `hours` 쿼리 · 없는 날짜 → 한국어 400
- [ ] nearby가 거리순 관광지만 (식당 상세에서도)
- [ ] `image` 키는 사진이 있을 때만
- [ ] 라우트에 계산 로직 없음 (검증 → 함수 → 응답)
