# 16 — 웹 v2: 장소 상세 · 푸터 · 상태 화면

- **목적**: 장소 상세를 v2 데이터(종류 · 사진 · 요일별 운영시간 · 좌표)로 바꾸고, 출처 표기와 오류 화면 안내를 새 입력에 맞춘다. 이 프롬프트가 끝나면 전체 워크스페이스가 녹색이어야 한다.
- **선행 조건**: 15(결과 타임라인) 머지
- **학습 포인트**: 구조화 데이터를 사람이 읽는 문구로, 외부 지도 링크, 저작권 표기
- **계획**: [`../plan-v2.md`](../plan-v2.md) Task 9

## 프롬프트

```text
apps/web 의 장소 상세 · 푸터 · 결과 오류 안내를 v2 로 바꿔줘. 테스트를 먼저 고치고 실패를 확인한 뒤 구현해.
이번 작업이 끝나면 저장소 전체 npm run typecheck · npm run lint · npm test 가 모두 통과해야 해.

참고 문서:
#file:docs/01-product/day-course-design.md   (5장 데이터, 7장 화면 변화)
#file:docs/05-copilot/plan-v2.md             (Global Constraints, Task 9)
#file:docs/02-design/ui-screens.md
#file:docs/01-product/data-sources-research.md  (출처 표기 · 공공누리 제1유형)

1. pages/SpotPage.tsx (TRAVEL_MINUTES · hours.weekday · closed · fromCourseSearchParams 를 쓰던 코드를 v2 로)
   - 대표 영역: spot.images[0] 이 있으면 <img src alt> (object-cover, 기존 높이 220/360px) + 오른쪽 아래 작은 글씨 credit, 없으면 지금의 SVG 일러스트 그대로
   - 칩: 종류(KIND_LABELS: 관광 · 식당 · 카페), 권역, 관심사 태그
   - "지도에서 보기" href = `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`, target="_blank" rel="noopener noreferrer"
   - 운영 정보 영역
     - '운영시간': formatWeeklyHours(spot.hours) 의 줄을 한 줄씩, lastEntryBeforeCloseMinutes 가 있으면 '닫기 {N}분 전 입장 마감' 한 줄 더
     - hours.note 가 있으면 '안내' 줄로 표시
     - restaurant 는 '식사' 줄: meals 를 점심 · 저녁 으로
     - fee · phone 이 있을 때만 '요금' · '전화' 줄 (phone 은 tel: 링크, 44px)
     - '체류' 줄: formatDuration(stayMinutes)
     - 출처 문구: '출처: {source} · {checkedAt} 기준. 방문 전 확인하세요.'
   - 주변 장소(nearby): 카드에 이름 · 권역 · '체류 {formatDuration}' (차로 몇 분 문구는 삭제 — 좌표 거리는 서버만 계산), 사진이 있으면 작은 썸네일
   - "이 코스에서"(from 쿼리가 있을 때): useCourse(`?${from}`) 의 DayPlan.items 에서 이 장소 항목을 찾아 '하루 일정 {order} / {items.length}번째 · {arriveAt}–{leaveAt}',
     이전 · 다음 항목 링크(이름 + 종류 배지, 다음 항목은 '차로 약 {next.travelMinutes}분'), '코스 전체 보기' 링크 = `/course?${from}`
     이 장소가 일정에 없으면 섹션을 그리지 않음
   - "코스로 돌아가기" 링크 = from 이 있으면 `/course?${from}`, 없으면 '/'
   - 로딩 문구 '장소 정보를 불러오고 있어요', 404 화면 문구의 '관광지' → '장소'
2. hooks/useSpot.ts: 타입만 v2 에 맞게 (동작 그대로)
3. components/layout/SiteFooter.tsx
   - '데이터 제공: ⓒ한국관광공사' (shared 의 DATA_ATTRIBUTION 그대로) 와 '사진: 한국관광공사 (공공누리 제1유형)', 기존 '운영 정보는 방문 전 공식 안내를 확인해 주세요.' 유지
4. pages/CoursePage.tsx 의 400(INVALID_QUERY) 화면: 기존 쿼리 강조 · 메시지 아래에 안내 한 줄
   '방문 날짜(오늘 이후), 시작 08:00~14:00, 끝은 시작 3시간 뒤~21:00(30분 단위), 동행, 관심사를 확인해 주세요.'
5. 남은 v1 흔적 정리: apps/web 안에서 HOURS · TRAVEL_MINUTES · CourseQuery · Course · CourseStop · hours= · '여행 시간' 을 검색해 남은 곳이 있으면 v2 로 (테스트 포함)

테스트
- pages/SpotPage.test.tsx 를 v2 로 교체 (Spot 픽스처를 테스트 안에 정의, fetchJson mock)
  - 사진 있는 관광지: <img alt> 와 credit 'ⓒ한국관광공사', 사진 없는 장소: img 없음
  - hours 매일 09:00–18:00 · mon [] · lastEntry 30 · note '1월 1일 휴관' → '화~일 09:00–18:00', '월 휴무', '닫기 30분 전 입장 마감', '1월 1일 휴관' 표시
  - '출처: 한국관광공사 · 2026-10-31 기준. 방문 전 확인하세요.'
  - 지도 링크 href 가 'https://map.kakao.com/link/map/%EC%B2%AD%EB%8F%84%EC%9D%8D%EC%84%B1,35.6508,128.7066' (name '청도읍성', lat 35.6508, lng 128.7066), target _blank, rel 'noopener noreferrer'
  - kind restaurant(meals lunch,dinner) → 칩 '식당', '점심 · 저녁' 표시 / kind cafe → 칩 '카페'
  - from 쿼리가 있고 DayPlan 에 이 장소가 3번째로 있으면 '하루 일정 3 / 6번째' 와 이전 · 다음 이름, 다음 링크 옆 '차로 약 N분'
  - 없는 장소 404 → '찾는 장소가 없어요'
- components/layout/SiteFooter.test.tsx (새로): '데이터 제공: ⓒ한국관광공사', '사진: 한국관광공사 (공공누리 제1유형)'
- pages/CoursePage.test.tsx: 400 화면에 위 안내 문장 (기존 테스트에 한 줄 추가)

제약:
- apps/api · packages/shared 수정 금지, 새 의존성 금지, 이모지 금지
- 접근성: 링크 · 버튼 44px, 글자 12px 이상, outline-none 금지, 색은 토큰 클래스만, 새 탭 링크 rel="noopener noreferrer", 이미지 alt 필수
- 390px 폭 가로 스크롤 없음

완료 기준 (저장소 루트에서 전부):
- npm run typecheck (오류 0), npm run lint, npm test (shared · api · web 전부 통과), npx prettier --check .
- npm run build (api · web 빌드 성공)

끝나면 보고: 변경 파일, 실행한 명령과 결과(워크스페이스별 테스트 개수), 문서와 다르게 한 부분과 이유.
```

## 리뷰 체크리스트

- [ ] 실제 데이터로 상세 화면: 사진 있는 곳 · 없는 곳 · 식당 · 카페 · 상시 개방 note
- [ ] 카카오맵 링크가 새 탭에서 해당 좌표로 열림
- [ ] 푸터 출처 표기 2줄
- [ ] 전체 typecheck · lint · test · build 녹색
