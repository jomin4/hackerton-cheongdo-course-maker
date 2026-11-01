# 15 — 웹 v2: 결과 타임라인

- **목적**: 결과 화면을 시각이 적힌 하루 타임라인(관광 · 점심 · 쉬어 가기 · 저녁 · 야간)으로 바꾼다.
- **선행 조건**: 14(홈 입력) 머지
- **학습 포인트**: 응답 타입 하나로 여러 종류 항목 그리기, 이동 · 기다림을 사람 말로 보여 주기, 빈 결과에서 다음 행동 제안
- **계획**: [`../plan-v2.md`](../plan-v2.md) Task 8

## 프롬프트

```text
apps/web 의 결과 화면(CoursePage)을 하루 일정(DayPlan) 타임라인으로 바꿔줘. 테스트를 먼저 고치고 실패를 확인한 뒤 구현해.

참고 문서:
#file:docs/01-product/day-course-design.md   (6장 응답, 7장 화면 변화)
#file:docs/05-copilot/plan-v2.md             (Global Constraints, Task 8)
#file:docs/02-design/ui-screens.md
#file:docs/02-design/design-tokens.md

바꿀 것 (Course · CourseStop · hours 를 쓰던 코드를 DayPlan · DayPlanItem 으로):
1. pages/CoursePage.tsx
   - 제목: `${formatDateLabel(date)} ${동행 문구} 청도 하루` — 동행 문구는 solo '혼자 떠나는', couple '커플과 함께하는', family '가족과 함께하는', friends '친구들과 함께하는'
     예: '11월 7일(토) 가족과 함께하는 청도 하루'
   - 조건 칩: 날짜 라벨 · '10:00–19:00'(start–end, en dash) · 동행 · 관심사들
   - 성공 화면 순서: notices 가 있으면 타임라인 위에 role="status" 안내 상자로 문장마다 한 줄 → 타임라인 → 옆(모바일은 위) 요약 · 빠진 장소 · 안내문
   - 안내문: '이동 시간은 직선거리에 도로 보정을 더해 어림한 값이에요. 실제 교통 상황에 따라 달라질 수 있어요.'
   - 빈 결과 = visit 항목이 0개: 제목 '조건에 맞는 장소를 찾지 못했어요', 설명 '{start}–{end} 안에 담을 수 있는 '{관심사들}' 장소가 없어요. 끝 시각을 늦추거나 관심사를 더 골라보세요.'
     버튼: end 가 '21:00' 보다 이르면 '끝 시각 늦추기'(toCourseUrl({ ...conditions, end: '21:00' })), 그리고 '관심사 더 고르기'(홈 + 같은 조건)
   - 로딩 · 오류(400 · 네트워크 · 404) 상태와 링크 복사는 그대로 유지 (문구 변경은 프롬프트 16)
2. components/course/CourseTimeline.tsx — props { plan: DayPlan }
   - <ol> 항목마다: 시각 'HH:MM–HH:MM'(arriveAt–leaveAt), 종류 배지(visit '관광', meal lunch '점심', meal dinner '저녁', rest '쉬어 가기'), 장소 이름, summary, 권역 칩
     visit 은 matchedTags 칩, 카드 아래 '체류 {formatDuration(leave − arrive)}' 와 '상세 보기' 링크(/spots/{id}?from=… 기존 방식)
     meal · rest 도 '상세 보기' 링크 (식당 · 카페 상세도 있음)
     spot.image 가 있으면 카드 위쪽에 <img src alt loading="lazy"> (aspect 16/9, object-cover) + 그 아래 작은 글씨 image.credit. 없으면 이미지 요소 자체를 그리지 않음
   - 두 번째 항목부터 카드 앞에 이동 행: '차로 약 {travelMinutes}분 · {distanceKm.toFixed(1)}km', waitMinutes > 0 이면 뒤에 ' · 여유 {formatDuration(waitMinutes)}'
     첫 항목의 waitMinutes > 0 이면 첫 카드 앞에 '여는 시간까지 여유 {formatDuration(waitMinutes)}'
   - 번호 원은 order 두 자리('01'), meal · rest 는 같은 자리에 아이콘(식사 · 커피, components/ui/icons.tsx 에 기존 아이콘과 같은 방식의 SVG 로 추가)
3. components/course/CourseSummary.tsx — props { plan: DayPlan }
   - 큰 글씨 '{startAt}–{endAt}' (실제 일정 시작 · 끝), 작은 글씨 '선택한 시간 {start}–{end}'
   - 체류 · 이동 · 여유 막대(기존 디자인, 기준은 end − start 분), 범례
   - '관광 {visitCount}곳' · 식사 수 '식사 {meal 항목 수}번' (0이면 '식사 없음')
4. components/course/ExcludedSpots.tsx — props { plan: DayPlan }
   - 제목 '이번 일정에서 빠진 장소', 줄마다 이름 + 이유 배지(CLOSED_ON_DAY '이날 휴무', NOT_ENOUGH_TIME '시간 부족')
   - NOT_ENOUGH_TIME 이 하나라도 있고 end 가 '21:00' 보다 이르면 링크 '끝 시각을 21:00으로 늦춰 다시 만들기'
5. lib/format.ts 에 formatTimeRange(from: string, to: string): string = `${from}–${to}` 를 두고 위에서 같이 써

테스트 — pages/CoursePage.test.tsx 를 v2 로 교체 (DayPlan 픽스처를 테스트 파일 안에 정의, useCourse 또는 fetchJson 을 mock)
  픽스처: conditions { date '2026-11-07', weekday 'sat', start '10:00', end '19:00', with 'family', tags ['nature','experience'], exclude [] }
  items: 1 visit s-a 10:00–10:40 (wait 0) · 2 visit s-b 10:50–11:50 (travel 12, 6.3km) · 3 meal lunch r-a 12:00–13:00 · 4 rest c-a 13:10–13:40 · 5 visit s-c 14:00–15:00 (travel 10, 2.1km, wait 15) · 6 meal dinner r-b 17:40–18:40
  s-a 에만 image 1장(alt '테스트 사진', credit 'ⓒ한국관광공사')
  excluded [s-d CLOSED_ON_DAY, s-e NOT_ENOUGH_TIME], notices ['이 시간에 영업하는 카페를 찾지 못했어요'], totals visitCount 3 …
  검사:
  - 제목 '11월 7일(토) 가족과 함께하는 청도 하루', 칩 '10:00–19:00'
  - 시각 '10:00–10:40', 배지 '관광' · '점심' · '쉬어 가기' · '저녁' 이 보임
  - 이동 행 '차로 약 12분 · 6.3km', 다섯 번째 앞 '차로 약 10분 · 2.1km · 여유 15분'
  - <img alt='테스트 사진'> 이 1개뿐이고 'ⓒ한국관광공사' 표시, 사진 없는 카드에는 img 없음
  - notices 문장 표시, 빠진 장소 '이날 휴무' · '시간 부족', '끝 시각을 21:00으로 늦춰 다시 만들기' 링크 href 가 '/course?date=2026-11-07&start=10:00&end=21:00&with=family&tags=nature,experience'
  - 요약 '관광 3곳', '식사 2번'
  - 첫 항목 wait 60 인 픽스처 변형: '여는 시간까지 여유 1시간'
  - 빈 결과(visit 0, end '17:00'): '조건에 맞는 장소를 찾지 못했어요', '끝 시각 늦추기' href 의 end=21:00, '관심사 더 고르기'
  - 빈 결과인데 end '21:00' 이면 '끝 시각 늦추기' 없음
  - 기존 로딩 · 400 · 네트워크 오류 · 링크 복사 테스트는 v2 쿼리 문자열로만 바꿔 유지

제약:
- SpotPage · hooks/useSpot · SiteFooter 는 고치지 마 (프롬프트 16). 그 파일들의 타입 오류 · 테스트 실패는 예상된 것
- apps/api · packages/shared 수정 금지, 새 의존성 금지, 이모지 금지
- 접근성: 링크 · 버튼 44px, 글자 12px 이상, outline-none 금지, 색은 토큰 클래스만, 이미지 alt 필수
- 390px 폭에서 가로 스크롤이 생기지 않게 (긴 이름은 줄바꿈, min-w-0)

완료 기준:
- cd apps/web && npx vitest run src/pages/CoursePage.test.tsx src/pages/HomePage.test.tsx src/lib 통과
- npx eslint apps/web/src/pages/CoursePage.tsx apps/web/src/components/course apps/web/src/components/ui apps/web/src/lib, npx prettier --check apps/web
- npx tsc --noEmit -p apps/web 의 남은 오류가 SpotPage · useSpot 쪽에만 있음 — 개수와 파일 목록 보고

끝나면 보고: 변경 파일, 실행한 명령과 결과(테스트 개수), 남은 타입 오류, 문서와 다르게 한 부분과 이유.
```

## 리뷰 체크리스트

- [ ] 실제 API로 결과 화면을 띄워 타임라인 · 사진 · 이동 행 확인 (390px · 데스크톱)
- [ ] 기다림이 "여유 N분"으로, 첫 항목 기다림도 표시
- [ ] 사진 없는 항목은 빈 이미지 틀도 없음
- [ ] 빈 결과 · 휴무 · 시간 부족 안내가 다음 행동으로 이어짐
