# 14 — 웹 v2: 쿼리 · 홈 입력

- **목적**: 홈 화면의 "여행 시간" 선택을 방문 날짜 · 시작 · 끝 시각 입력으로 바꾸고, 공유 URL · 쿼리 도우미를 v2(`DayQuery`)로 옮긴다.
- **선행 조건**: 13(API v2) 머지
- **학습 포인트**: 시간대가 걸린 "오늘" 계산, 서로 묶인 입력(시작 → 끝 범위), 결정적인 공유 URL
- **계획**: [`../plan-v2.md`](../plan-v2.md) Task 7

## 프롬프트

```text
apps/web 의 홈 입력과 쿼리 도우미를 하루 일정(v2)에 맞게 바꿔줘. 테스트를 먼저 고치고 실패를 확인한 뒤 구현해.

참고 문서:
#file:docs/01-product/day-course-design.md   (6장 입력 표, 7장 화면 변화)
#file:docs/05-copilot/plan-v2.md             (Global Constraints, Task 7)
#file:docs/02-design/ui-screens.md
#file:docs/04-dev/conventions.md

1. apps/web/src/lib/date.ts (새 파일)
   - todayInSeoul(now: Date): string — now 에 9시간을 더한 UTC 날짜를 "YYYY-MM-DD" 로 (브라우저 시간대와 무관)
   - formatDateLabel(date: string): string — '2026-11-07' → '11월 7일(토)' (요일은 @cheongdo/shared 의 weekdayOf + WEEKDAY_LABELS)
2. apps/web/src/lib/query.ts (CourseQuery · HOURS 를 쓰던 코드를 DayQuery 로 교체)
   - sortTags 유지
   - START_OPTIONS: '08:00' ~ '14:00' 30분 단위 13개, endOptions(start): start+3시간 ~ '21:00' 30분 단위 (DAY_LIMITS · toMinutes · toClock 사용, 숫자 리터럴 대신 상수)
   - defaultDayQuery(today: string): DayQuery = { date: today, start: '10:00', end: '19:00', with: 'family', tags: ['nature','experience'], exclude: [] }
   - fromDaySearchParams(params: URLSearchParams, today: string): DayQuery
     date 는 isValidDate 이고 today 이상이면 그대로, 아니면 today / start 는 START_OPTIONS 에 있으면 그대로, 아니면 '10:00'
     end 는 endOptions(start) 에 있으면 그대로, 아니면 기본 '19:00' 이 endOptions(start) 에 있으면 '19:00', 없으면 endOptions(start)[0]
     with · tags 는 기존 규칙 그대로 (tags 파라미터가 없으면 기본 관심사), exclude 는 [] (홈에서는 쓰지 않음)
   - toCourseUrl(query: DayQuery): string — `/course?date=…&start=…&end=…&with=…&tags=a,b` 순서 고정 (tags 는 쉼표를 인코딩하지 않음, TAGS 순서), exclude 가 있으면 끝에 `&exclude=a,b`
     예: toCourseUrl(defaultDayQuery('2026-11-07')) === '/course?date=2026-11-07&start=10:00&end=19:00&with=family&tags=nature,experience'
     (콜론은 인코딩하지 않음. URLSearchParams 를 쓰면 %3A 가 되니 직접 이어 붙여)
3. apps/web/src/lib/format.ts: formatDuration 유지, formatClock 은 쓰는 곳이 없으면 삭제 (시각 표시는 shared 의 toClock)
4. apps/web/src/hooks/useCourse.ts: 타입만 Course → DayPlan (동작 그대로)
5. apps/web/src/pages/HomePage.tsx
   - 오늘 = todayInSeoul(new Date()) 를 처음 렌더할 때 한 번 계산, 초기 query = fromDaySearchParams(searchParams, 오늘)
   - STEP 01 fieldset legend "방문 날짜와 시간" (기존 "여행 시간" 버튼 3개는 삭제):
     <label> 방문 날짜 <input type="date" min={오늘}>, <label> 시작 <select> START_OPTIONS, <label> 끝 <select> endOptions(start)
     시작을 바꿔 현재 끝이 endOptions 밖이 되면 끝을 endOptions(새 시작)[0] 으로 맞춤
     날짜 입력이 비거나 오늘보다 이르면 오늘로 되돌림
     아래 도움말 한 줄: '점심 · 쉬어 가기 · 저녁까지 시간에 맞춰 넣어 드려요.'
   - STEP 02(동행) · STEP 03(관심사)은 그대로
   - "선택한 조건" 줄: '11월 7일(토) 10:00–19:00 · 가족 · 자연 · 체험' 형식 (formatDateLabel, en dash –)
   - 공유 URL 미리보기 · 코스 만들기 이동은 toCourseUrl(query), 관심사 0개면 버튼 비활성 + 기존 안내 문구
   - 홈 장소 카드: /api/spots?kind=spot 의 앞 6개 (기존 카드 디자인 유지, 사진이 있으면 카드 위에 spot.image 를 alt 와 함께 object-cover 로, 아래 작은 글씨로 image.credit)
   - 히어로 · "How it works" 문구에서 "여행 시간" → "방문 날짜와 시간" 처럼 v2 에 맞게 고칠 곳만 고침
   - 접근성: 모든 입력에 label, select · input 높이 44px 이상, 글자 12px 이상, outline-none 금지, 색은 토큰 클래스만
6. 테스트
   - lib/date.test.ts: todayInSeoul(new Date('2026-10-31T16:30:00Z')) === '2026-11-01', todayInSeoul(new Date('2026-10-31T14:59:00Z')) === '2026-10-31', formatDateLabel('2026-11-07') === '11월 7일(토)', formatDateLabel('2026-11-09') === '11월 9일(월)'
   - lib/query.test.ts: START_OPTIONS 길이 13 · 첫 '08:00' · 끝 '14:00', endOptions('14:00') === ['17:00','17:30',…,'21:00'] (9개), toCourseUrl 위 예시 정확히, exclude 있을 때 끝에 붙음,
     fromDaySearchParams: 과거 날짜 · 없는 날짜(2026-02-30) → today, start '07:30' → '10:00', start '14:00' 에 end 없음 → '19:00', start '14:00' & end '16:00' → '17:00', 관심사 순서 정렬
   - pages/HomePage.test.tsx (vi.useFakeTimers({ now: new Date('2026-11-06T03:00:00Z'), toFake: ['Date'] }) 로 오늘 = 2026-11-06 고정)
     날짜 input 의 min 이 '2026-11-06', 시작 select 옵션 13개, 끝 select 첫 옵션이 시작+3시간,
     시작을 '14:00' 으로 바꾸면 끝은 '19:00' 그대로(끝 첫 옵션 '17:00')이고 공유 URL 미리보기가 '/course?date=2026-11-06&start=14:00&end=19:00&with=family&tags=nature,experience',
     끝을 '13:00' 으로 바꾼 뒤 시작을 '11:00' 으로 바꾸면 끝이 '14:00' 으로 맞춰짐,
     날짜를 '2026-11-07' 로 바꾸면 "선택한 조건"에 '11월 7일(토)' 표시, 관심사 0개면 버튼 비활성 · 안내 문구(기존 테스트 유지),
     코스 만들기 클릭 → 위치가 toCourseUrl 결과, /api/spots?kind=spot 로 요청함

제약:
- CoursePage · SpotPage · components/course · hooks/useSpot 은 이번에 고치지 마 (프롬프트 15 · 16). 그 파일들의 타입 오류 · 테스트 실패는 예상된 것
- apps/api · packages/shared 수정 금지, 새 의존성 금지, 이모지 금지

완료 기준:
- cd apps/web && npx vitest run src/lib src/pages/HomePage.test.tsx 통과
- npx eslint apps/web/src/lib apps/web/src/pages/HomePage.tsx apps/web/src/hooks/useCourse.ts, npx prettier --check apps/web 통과
- npx tsc --noEmit -p apps/web 의 남은 오류가 CoursePage · SpotPage · components/course · useSpot 쪽에만 있음 — 개수와 파일 목록 보고

끝나면 보고: 변경 파일, 실행한 명령과 결과(테스트 개수), 남은 타입 오류 목록, 문서와 다르게 한 부분과 이유.
```

## 리뷰 체크리스트

- [ ] `todayInSeoul`이 브라우저 시간대와 무관 (UTC 15:00 경계)
- [ ] 공유 URL에 `%3A` · `%2C` 없음, 순서 고정
- [ ] 시작 변경 시 끝 자동 보정, 과거 날짜 불가
- [ ] 입력 label · 44px · 포커스 표시
- [ ] 390px 폭 가로 스크롤 없음 (리뷰어가 브라우저로 확인)
