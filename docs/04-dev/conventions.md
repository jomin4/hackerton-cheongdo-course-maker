# 개발 규칙

> Copilot도 이 규칙을 따르도록 핵심만 `.github/copilot-instructions.md`에 요약되어 있다.

## 폴더 구조

```
apps/api/src/
├── index.ts              # 서버 시작 (listen) — app과 분리
├── app.ts                # createApp(deps): Express 앱 조립 (테스트에서 재사용)
├── config.ts             # 환경 변수 읽기 · 검증
├── routes/               # health.ts, spots.ts, course.ts — 요청/응답 변환만
├── domain/               # plan-day.ts, travel.ts, opening.ts, spot-summary.ts — 순수 비즈니스 로직
├── data/                 # spot-repository.ts — JSON 로드 · 검증 · 조회
├── middleware/           # error-handler.ts, not-found.ts
└── lib/                  # logger.ts, http-error.ts
apps/api/data/spots.json
apps/api/test/            # *.test.ts

apps/web/src/
├── main.tsx · App.tsx    # 라우터
├── pages/                # HomePage, CoursePage, SpotPage, NotFoundPage
├── components/           # 화면 조각 (layout/, course/, spot/, ui/)
├── lib/                  # api.ts(fetch 래퍼), format.ts(분 → "1시간 25분"), query.ts(URL ↔ 조건), date.ts(KST 오늘 · "11월 7일(토)")
├── hooks/                # useCourse, useSpot
└── index.css             # Tailwind + @theme 토큰

packages/shared/src/      # constants.ts, types.ts, schemas.ts, time.ts, hours-format.ts, index.ts
```

## 계층 규칙 (API)

- `routes` → `domain` · `data` 를 호출한다. 역방향 import 금지.
- `domain`은 Express · fs · 환경 변수를 모른다 (순수 함수, 테스트 쉬움).
- 오류는 `HttpError(status, code, message, details?)`를 던지고, `error-handler` 미들웨어가 공통 형식으로 응답한다.
- 라우트에서 `try/catch` 반복하지 않는다 (Express 5는 async 에러를 미들웨어로 전달).

## TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`
- `any` 금지 (불가피하면 `unknown` + 좁히기)
- 타입 · 상수는 `@cheongdo/shared`에서 가져오고 중복 정의하지 않는다
- 파일명 kebab-case (`plan-day.ts`), React 컴포넌트 파일은 PascalCase (`CourseTimeline.tsx`)
- named export 사용 (React 페이지 포함), default export 지양

## React

- 함수 컴포넌트 + hooks. 상태 관리 라이브러리 없음 (URL 쿼리가 곧 상태)
- 데이터 요청은 `hooks/`의 커스텀 훅으로 (`{ data, error, status }` 반환)
- 스타일은 Tailwind 유틸리티 + [디자인 토큰](../02-design/design-tokens.md). 임의 색상값(`text-[#123456]`) 금지
- 접근성: 선택 버튼은 `<button aria-pressed>`, 그룹은 `<fieldset><legend>`, 아이콘 버튼은 `aria-label`
- 화면 문구는 한국어, 해요체

## Git

### 브랜치

- `main`: 항상 배포 가능. push = 운영 배포
- 작업 브랜치: `feat/12-plan-day`, `fix/course-empty-state`, `docs/api-spec`, `infra/nginx-cache`
- 프롬프트 하나 = 브랜치 하나 = PR 하나 (`05-copilot/prompts` 번호와 맞춤)

### 커밋 메시지 (Conventional Commits)

```
<type>(<scope>): <요약, 한국어 가능, 50자 이내>

<본문: 무엇을 왜 — 선택>
```

| type | 언제 |
|---|---|
| `feat` | 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 동작 변화 없는 구조 개선 |
| `test` | 테스트 추가 · 수정 |
| `docs` | 문서 |
| `chore` | 설정 · 의존성 |
| `infra` | Docker · nginx · 운영 compose · 서버 스크립트 |

scope 예: `api`, `web`, `shared`, `infra`, `ci`
예: `feat(api): 하루 일정 계산 구현`, `infra(nginx): 정적 파일 캐시 헤더 추가`

### PR 체크리스트

- [ ] `npm run lint && npm run typecheck && npm test && npm run build` 통과
- [ ] 관련 문서(api-spec, data-model 등) 갱신
- [ ] `05-copilot/review-log.md`에 기록 (Copilot 작업인 경우)
- [ ] 화면 변경이면 데스크톱 · 390px 스크린샷 첨부

## 하지 말 것

- 비밀 값(키, 비밀번호, `.env`) 커밋
- `spots.json`에 확인하지 않은 운영시간 · 요금 입력
- 테스트 없이 `domain/` 수정
- `main`에 직접 push (PR 머지만)
