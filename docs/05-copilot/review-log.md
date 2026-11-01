# Copilot 작업 리뷰 기록

> 프롬프트 하나를 끝낼 때마다 한 블록씩 추가한다. 해커톤 회고와 치트시트의 원재료가 된다.

## 요약표

| # | 프롬프트 | 시작 | 완료 | 재시도 | 결과 | PR |
|---|---|---|---|---|---|---|
| 01 | scaffold-monorepo | 2026-10-30 | 2026-10-30 | 1 | ☑ | [#1](https://github.com/jomin4/hackerton-hackerground/pull/1) |
| 02 | api-spots | 2026-10-30 | 2026-10-30 | 1 | ☑ | [#3](https://github.com/jomin4/hackerton-hackerground/pull/3) |
| 03 | recommend-course | 2026-10-30 | 2026-10-30 | 1 | ☑ | [#2](https://github.com/jomin4/hackerton-hackerground/pull/2) |
| 04 | api-course | 2026-10-30 | 2026-10-30 | 0 | ☑ | [#4](https://github.com/jomin4/hackerton-hackerground/pull/4) |
| 05 | web-layout-home | 2026-10-30 | 2026-10-30 | 1 | ☑ | [#5](https://github.com/jomin4/hackerton-hackerground/pull/5) |
| 06 | web-course-result | 2026-10-30 | 2026-10-30 | 1 | ☑ | [#6](https://github.com/jomin4/hackerton-hackerground/pull/6) |
| 07 | web-spot-detail | 2026-10-30 | 2026-10-30 | 0 | ☑ | [#7](https://github.com/jomin4/hackerton-hackerground/pull/7) |
| 08 | web-states | 2026-10-30 | 2026-10-30 | 1 | ☑ | [#8](https://github.com/jomin4/hackerton-hackerground/pull/8) |
| 09 | dockerize | 2026-10-30 | 2026-10-30 | 1 | ☑ | [#9](https://github.com/jomin4/hackerton-hackerground/pull/9) |
| 10 | tourapi-tools | 2026-10-31 | 2026-10-31 | 0 | ☑ | [#12](https://github.com/jomin4/hackerton-hackerground/pull/12) |
| 11 | shared-v2 | 2026-10-31 | 2026-10-31 | 1 | ☑ | [#14](https://github.com/jomin4/hackerton-hackerground/pull/14) |
| 12 | plan-day | 2026-11-01 | 2026-11-01 | 0 | ☑ | [#16](https://github.com/jomin4/hackerton-hackerground/pull/16) |
| 13 | api-v2 | 2026-11-01 | 2026-11-01 | 0 | ☑ | [#17](https://github.com/jomin4/hackerton-hackerground/pull/17) |
| 14 | web-home-v2 | 2026-11-01 | 2026-11-01 | 1 | ☑ | [#18](https://github.com/jomin4/hackerton-hackerground/pull/18) |
| 15 | web-course-timeline | 2026-11-01 | 2026-11-01 | 0 | ☑ | [#19](https://github.com/jomin4/hackerton-hackerground/pull/19) |

## 기록 양식

```markdown
### NN — 제목 (YYYY-MM-DD)

- 소요: 투입 → 완료 N분, 재시도 N회
- 모델 / 모드: (예: Agent 모드, 기본 모델)
- 결과: 완료 기준 통과 여부
- 리뷰 지적 사항:
  - (Claude 리뷰에서 나온 문제와 처리)
- Copilot이 잘한 점:
- Copilot이 틀린 점 / 반복된 실수:
- 다음 프롬프트에 반영할 것:
- 해커톤용으로 저장할 표현:
```

---

<!-- 아래에 기록 추가 -->

### 01 — scaffold-monorepo (2026-10-30)

- 소요: 1차 투입 → 리뷰 → 수정 프롬프트 1회, 재시도 1회
- 모델 / 모드: Agent 모드, 기본 모델
- 결과: 완료 기준 통과 — typecheck · lint · test(17개) · `prettier --check` (리뷰에서 직접 재실행)
- 설치 버전: TypeScript 6.0, ESLint 10, Vitest 5, zod 4.6, typescript-eslint 8.72
- 리뷰 지적 사항:
  - `courseQuerySchema`의 `hours` 출력 타입이 `number`라 `CourseQuery`(`2 | 4 | 6`)에 대입 불가 → `z.coerce.number().pipe(z.literal(HOURS))`로 수정, 제네릭 기본값 제약으로 컴파일 타임 검사 추가
  - zod 기본 영어 메시지가 그대로 노출됨 (`with` 메시지는 data-model.md에 있었는데 누락) → hours · with · tags · tag · zone 전부 한국어 메시지 + 테스트
  - `npm run format`이 `docs/` 마크다운 32개를 재정렬 → `.prettierignore`에 `*.md`
  - 워크스페이스 package.json에 `"private": true` 누락 → 추가
- Copilot이 잘한 점: 상수 · 타입 이름과 값이 문서와 정확히 일치. 불필요한 패키지 없음. 타입 호환 검사를 런타임 코드 없는 방식으로 더 깔끔하게 구현
- Copilot이 틀린 점 / 반복된 실수: 문서의 메시지를 빼먹고도 "문서와 다른 부분 없음"이라고 보고함 → **자기 보고를 믿지 말고 문서 값과 대조**
- 다음 프롬프트에 반영할 것: 타입 수준 검증(스키마 출력 ↔ 공유 타입)을 완료 기준에 넣기. 사용자에게 보이는 문구는 "정확히 일치" 테스트로 고정
- 해커톤용으로 저장할 표현: "z.infer 결과가 공유 타입에 대입되는지 타입 수준에서 보장하는 코드를 추가해줘"

### 03 — recommend-course (2026-10-30)

- 소요: 1차 투입 → 리뷰 → 수정 프롬프트 1회, 재시도 1회
- 모델 / 모드: Agent 모드, 기본 모델
- 결과: 완료 기준 통과 — api 테스트 11개(T1~T9 + 순서 · 시각 연속성 + 입력 불변), 라인 커버리지 98.75%, typecheck · lint · prettier (리뷰에서 직접 재실행)
- 사전 보완: 03이 02보다 먼저라 apps/api에 테스트 스크립트 · vitest 설정이 없음 → 프롬프트에 준비 단계 추가 후 투입
- 리뷰 지적 사항:
  - **버그** — 재채움 후 권역 순서를 "추가된 순서"로 정함. 문서 규칙은 "순위 순". 재채움이 순위가 더 높은 다른 권역 장소를 나중에 넣으면 `… d, f, e`로 뒤바뀜 (이동 합계 · 예산 판정은 같아서 시간 초과는 없음, 표시 순서만 틀림) → 재현 데이터를 문서 T9로 추가, Candidate에 `rank`를 두고 권역 순서를 rank로 결정
  - T1이 `zones` · `score` · `companionMatch`를 검사하지 않음 → 추가
  - `sortCandidates`가 인자 배열을 제자리 정렬 → 복사 후 정렬, 입력 불변 테스트 추가
- Copilot이 잘한 점: TDD 순서(RED 확인 → 구현) 준수. T1 기대값을 문서 표 숫자 그대로 리터럴로 작성. 단계별 함수 분리와 상수화가 문서 구조와 일치. 수정 때 T9가 실제로 실패하는 것(`a, b, c, d, f, e`)부터 보고함
- Copilot이 틀린 점 / 반복된 실수: 문서 테스트 케이스에 없는 경로는 스스로 찾지 않음 → **문서 예시가 거치지 않는 분기(여기선 재채움이 1차 선택 순서를 뒤집는 경우)는 리뷰에서 직접 반례 데이터를 만들어 돌려 볼 것**
- 다음 프롬프트에 반영할 것: 04에서 `/api/course` 응답이 T1과 같은지 API 테스트로 고정. 문서 규칙이 바뀌면 테스트 케이스 번호를 문서에 먼저 추가하고 프롬프트에서 참조
- 해커톤용으로 저장할 표현: "먼저 테스트를 작성하고 실패하는 것을 확인한 뒤 구현해", "기대값은 문서 표 숫자를 리터럴로 적어 (구현 함수로 계산하지 마)", "수정 전에 테스트가 실제로 실패했는지와 그때의 실제 값을 보고해"

### 02 — api-spots (2026-10-30)

- 소요: Copilot CLI 1차 4분 31초 → 리뷰 → 수정 1회 3분 28초, 재시도 1회 (이 회차부터 Copilot CLI `copilot -p` 자동 투입)
- 모델 / 모드: Copilot CLI 비대화형, 자동 선택 모델(GPT-6 Luna)
- 결과: 완료 기준 통과 — api 테스트 24개, typecheck · lint · prettier · build. 리뷰에서 번들을 직접 실행해 엔드포인트 6개 응답 · 캐시 헤더 확인, `dist/index.js`에 `@cheongdo/shared` import 0개 (shared가 번들에 포함됨)
- 사전 보완: 픽스처 재사용 · domain 수정 금지 명시, 임시 데이터 문장에 구체적 사실을 넣지 말라는 규칙 추가
- 리뷰 지적 사항:
  - **와인터널의 확인된 운영 정보까지 삭제** — "임시 데이터는 운영 정보 생략" 규칙을 확인된 장소에도 적용함. 프롬프트에 "와인터널은 예시 전체 그대로"가 있었는데도 뒤에 추가한 규칙을 우선함 → 문서 예시와 deep equal 테스트로 고정
  - 400 `message`가 고정 문구 "요청 값이 올바르지 않아요." → api-spec대로 첫 issue의 한국어 메시지
  - nearby 정렬 동점 기준(id) 없음, 500 내부 정보 숨김 테스트 없음, logger 기본값이 config를 읽는 부작용, SIGINT 미처리 → 수정
  - 1차 산출물 8개 파일이 Prettier 미적용 (Copilot은 1차 보고에서 prettier를 실행하지 않음) → 리뷰어가 `prettier --write apps/api`로 정리
- Copilot이 잘한 점: tsup 설정 · 스크립트가 ADR 0004와 정확히 일치. 미확인 5곳의 주소를 읍 · 면 단위로, 소개 문장을 일반 문장으로 작성. 서버를 백그라운드로 띄워 확인하고 포트가 닫혔는지까지 검증. 수정 범위를 엄격히 지켜 범위 밖 파일 포맷도 건드리지 않고 보고함
- Copilot이 틀린 점 / 반복된 실수: 규칙이 둘 이상 겹치면 나중에 나온 일반 규칙이 앞의 구체적 예외를 덮음 → **예외는 규칙 바로 옆에, "이 규칙은 X에는 적용하지 마" 형태로 쓸 것**
- 다음 프롬프트에 반영할 것: 완료 기준의 `npx prettier --check .`를 1차부터 명시(이미 04~ 프롬프트에 없으면 러너 전문에 추가)
- 해커톤용으로 저장할 표현: "X는 확인된 데이터라 이 규칙의 예외야. 문서 예시와 글자 하나까지 똑같이", "서버를 띄워야 하면 백그라운드로 띄우고 확인 후 반드시 종료해"

### 04 — api-course (2026-10-30)

- 소요: Copilot CLI 3분 4초, 재시도 0회
- 모델 / 모드: Copilot CLI 비대화형, 자동 선택 모델
- 결과: 완료 기준 통과 — api 테스트 32개(전체 49개), typecheck · lint · prettier. 리뷰에서 실제 `spots.json`으로 번들 서버를 띄워 T1 · tags 정규화 · 없는 exclude id · 다중 필드 400 · 캐시 헤더 확인
- 리뷰 지적 사항: 없음 (라우트가 검증 → 호출 → 응답 3줄)
- 알려진 한계 (수정 안 함): `?tags=a&tags=b`처럼 같은 파라미터를 반복하면 배열이 들어와 "관심사를 하나 이상 골라주세요."로 400 — 화면은 항상 쉼표 한 개 파라미터로 보내므로 수용
- Copilot이 잘한 점: 02에서 만든 에러 미들웨어를 재사용하고 새로 만들지 않음. 리뷰어 추가 지시(가짜 저장소로 빈 결과, 리터럴 기대값)를 그대로 반영
- 다음 프롬프트에 반영할 것: 05부터 화면 작업 — 리뷰에서 내장 브라우저로 데스크톱 · 390px 확인

### 05 — web-layout-home (2026-10-30)

- 소요: Copilot CLI 1차 9분 27초 → 리뷰 → 수정 1회 2분 25초, 재시도 1회
- 결과: 완료 기준 통과 — 전체 테스트 62개(web 13), typecheck · lint · prettier · web build. 리뷰에서 내장 브라우저로 데스크톱 · 390px 확인
- 사전 보완: web `lint` 스크립트 누락(루트 lint가 web을 건너뜀) → 프롬프트에 lint · vitest(jsdom) · tsconfig 명시
- 리뷰에서 확인: `@theme` 토큰 18개 문서와 일치, 컴포넌트 hex 없음, 390px 가로 스크롤 없음, URL 쿼리 미리 채우기 · tags 정렬, 관심사 0개 시 버튼 비활성 + 안내, aria-pressed · fieldset/legend · 햄버거 aria-expanded, 관광지 카드 6개
- 리뷰 지적 사항:
  - **포커스 표시 없음** (mvp-spec 완료 기준) → 전역 `:focus-visible` 2px accent-text
  - 여행 시간 보조문구 10px → 12px (토큰 최소 라벨 크기)
  - 헤더 로고 · 모바일 메뉴 링크 터치 영역 28px → 44px
- 리뷰 중 발견 (앱 문제 아님): 미리보기 도구가 `PORT=5173`을 주입하자 API가 그 값을 읽어 5173에 뜨려 함 → 루트 `dev`가 web · api에 같은 환경 변수를 넘기는 구조라 생김. 로컬 실행 설정에서 `PORT=3000` 고정. 09(Docker)에서 compose 환경 변수 확인 예정
- 리뷰어 착오 정정: 디자인 문서의 "감색"은 청도 반시의 **감 색(주황 #E8590C)**. 리뷰어가 남색으로 읽어 발표 다이어그램을 남색으로 그렸음 → 다시 그림
- Copilot이 잘한 점: 토큰 · 레이아웃이 문서와 정확히 일치, 지시대로 dev 서버를 띄우지 않고 브라우저 미확인 항목을 정직하게 보고
- 다음 프롬프트에 반영할 것: 화면 프롬프트 완료 기준에 "포커스 표시 · 44px 터치 영역 · 12px 이상"을 명시

### 06 — web-course-result (2026-10-30)

- 소요: Copilot CLI 1차 5분 55초 → 리뷰 → 수정 1회 3분 18초, 재시도 1회
- 결과: 완료 기준 통과 — 전체 테스트 64개(web 15), typecheck · lint · prettier. 내장 브라우저로 T1(4곳 · 0:00/1:25/2:05/2:55 · 3시간 35분 · 운문사 · 프로방스 제외), 2시간 · 혼자 조건, 390px(요약이 타임라인 위, 가로 스크롤 없음) 확인
- 사전 보완: "6시간 코스로 다시 만들기" 고정 문구 → "{다음 시간}시간 코스로" (2→4, 4→6), 접근성 완료 기준 추가
- 리뷰에서 확인: 제목 조사(가족과 / 혼자 떠나는), 상세 링크 `from` 쿼리, 비율 막대 aria-label, 44px 미만 · 12px 미만 없음, AbortController로 이전 요청 취소
- 리뷰 지적 사항:
  - 같은 권역 이동 행이 "같은 권역"만 표시되어 10분 이동이 안 보임 → "차로 약 10분 · 같은 권역"
  - "다시 만들기" 링크가 `URLSearchParams`라 tags 쉼표가 `%2C` → 홈 · 공유 링크와 같은 `toCourseUrl` 사용
- 리뷰 중 발견 (앱 문제 아님): 머지 · 브랜치 전환으로 `vite.config.ts`가 다시 쓰이자 Vite가 자동 재시작되면서 `/api` 프록시가 빠짐 (API 직접 호출은 정상) → 개발 서버 재시작으로 해결. 브랜치 전환 후에는 dev 서버를 다시 띄울 것
- Copilot이 잘한 점: 서버 응답 값만으로 렌더(화면 재계산 없음), 모바일 순서를 CSS order로 처리

### 07 — web-spot-detail (2026-10-30)

- 소요: Copilot CLI 5분 46초, 재시도 0회
- 결과: 완료 기준 통과 — 전체 테스트 68개(web 19), typecheck · lint · prettier. 내장 브라우저로 확인
- 리뷰에서 확인: 와인터널 운영 정보 · 출처 "한국관광공사 · 2026-08-18 기준"이 데이터와 일치 / 임시 정보 장소는 "방문 전 확인" + 기준일 없는 출처 문구, `undefined` 노출 없음 / from 있을 때 브레드크럼 · 코스로 돌아가기 · "이 코스에서"(3/4, 이전 · 다음) / 코스에 없는 장소(프로방스)는 "이 코스에서" 숨김 / from 없으면 홈으로 / 지도 링크 `noopener noreferrer` / 문서 제목 변경 / 44px · 12px 기준 충족
- Copilot이 범위 밖에서 바꾼 것: 06의 상세 링크 `from`을 현재 URL 문자열 대신 `toCourseUrl(course.conditions)`로 정규화 — 개선이라 수용
- 남긴 것: 같은 권역 카드의 체류가 "100분"(결과 화면은 "1시간 40분") → 08 프롬프트에 함께 반영
- Copilot이 잘한 점: 프롬프트에 추가한 접근성 · 06과 같은 문구/URL 조건을 그대로 지킴

### 08 — web-states (2026-10-30)

- 소요: Copilot CLI 1차 6분 17초 → 리뷰 → 수정 1회 2분 49초, 재시도 1회
- 결과: 완료 기준 통과 — 전체 테스트 79개(web 30), typecheck · lint · prettier. 브라우저 확인은 Copilot에 맡기지 않고 리뷰어가 별도 탭에서 진행
- 사전 보완: 07 리뷰에서 남긴 체류 표기 통일, 없는 장소 404에서 상세 상단 숨김, 접근성 기준을 프롬프트에 추가
- 리뷰에서 확인: 400(`hours=99` → "99"만 accent-text 강조, 한국어 메시지, 조건 다시 고르기), SPOT_NOT_FOUND 404(상세 상단 없이 404 디자인만), 없는 경로 404 페이지, 체류 "1시간 40분" 통일, API를 실제로 내려서 "다시 시도" 화면
- 리뷰 지적 사항:
  - API가 내려가 프록시 · nginx가 502 HTML을 주면 `statusText`("Bad Gateway") 영어가 화면에 노출 → 공통 오류 JSON이 아니면 한국어 고정 문구, 네트워크 오류도 한국어
- 리뷰 운영 메모: 사용자가 같은 미리보기 탭을 보고 있어 리뷰어 조작과 섞임 → 리뷰는 별도 탭에서
- Copilot이 잘한 점: 상태별 컴포넌트 테스트로 고정, 404 공통 컴포넌트(NotFoundState) 분리

### 09 — dockerize (2026-10-30)

- 소요: Copilot CLI 1차 6분 53초 → 리뷰 → 수정 1회 1분 26초, 재시도 1회
- 결과: 완료 기준 통과 — 전체 테스트 79개, typecheck · lint · prettier. 리뷰어가 `docker compose up --build -d`로 직접 리허설 후 `down`
- 사전 보완: `docker:up`은 끝나지 않는 명령 → `-d`로 띄우고 확인 후 down, compose api에 `PORT=3000` 명시(05 리뷰에서 본 PORT 주입 문제 방지), `.dockerignore`에 `.claude`
- 리뷰에서 확인: api · web healthy, 호스트에는 8080만 공개(api 3000은 내부), SPA 새로고침 200 · `index.html` no-cache, `/assets/*` 1년 immutable + gzip, 모든 응답 보안 헤더 3개, nginx 경유 `/api/*`(health · 215분 · 404 · 400), api 컨테이너 `node` 사용자 · TS 소스/devDependencies 없음 · shared 소스 없이 실행(번들 포함), 브라우저로 8080 결과 · 상세 화면
- 리뷰 지적 사항:
  - `/assets/`에 `expires 1y` + `add_header Cache-Control`로 Cache-Control 헤더가 두 줄 → `expires` 제거
- 이미지 크기: Copilot 보고 api 267MB · web 94.2MB는 Docker Desktop containerd 저장소가 압축 레이어까지 더한 값. 실제 파일시스템(`du -sxh /`)은 **api 187.5MB · web 64.1MB**(우리 파일 424KB, 나머지 nginx:alpine 기본). web 60MB 목표는 기본 이미지보다 작아 비현실적 → 프롬프트 기준을 70MB · du 측정으로 정정
- Copilot이 범위 밖에서 한 것: web healthcheck 추가, 빌드에 `tsconfig.base.json` 복사 — 둘 다 필요해서 수용
- 해커톤용으로 저장할 표현: "끝나지 않는 명령은 -d로 띄우고 확인 후 반드시 down", "호스트 환경 변수가 바뀌어도 컨테이너 포트가 고정되게 compose에 명시"

### 10 — tourapi-tools (2026-10-31)

- 소요: Copilot CLI 1차 2분 56초, 재시도 0회 (AI 크레딧 1.5)
- 결과: 완료 기준 통과 — `--limit 2` → "done: 2 items, 9 calls", 후보표 spot 68 · restaurant 13 · cafe 18, 전체 테스트 79개 · typecheck · lint · prettier
- 사전 보완: 오늘 남은 호출이 약 460건이라 전체 수집 금지(`--limit`만), 기존 초안 덮어쓰기 금지 + 리뷰어가 미리 백업, 키 출력 금지
- 리뷰에서 확인: 키가 로그 · 오류 메시지에 안 나옴(오류는 결과 코드 · HTTP 상태만), `--limit`은 sample 파일로 따로 저장, `items: ""` · 단일 객체 정규화, 3회 재시도 후 exit 1, `.data-draft/`가 git · Docker 컨텍스트 밖, 기존 133건 초안 보존
- 남긴 것: 상세 응답을 배열로 저장(초안 v0은 객체) — candidates가 둘 다 읽어서 수용. 1유형 사진 수는 대표 사진과 상세 사진이 같은 파일이면 중복으로 셀 수 있음(선정 참고용이라 수용)
- Copilot이 잘한 점: `.env`의 따옴표 · BOM · `export` 형식까지 처리, 한 건이라도 실패하면 워커 전체 중단

### 11 — shared-v2 (2026-10-31)

- 소요: Copilot CLI 1차 8분 17초(AI 크레딧 4.17) → 리뷰 → 수정 1회 1분 21초(0.58), 재시도 1회
- 결과: 완료 기준 통과 — shared 테스트 60개 · typecheck · lint · prettier. api 31 · web 48 타입 오류는 v1 타입 사용으로 예상된 것 (통합 브랜치 `feat/day-course-v2`에서 12~16으로 전환)
- 사전 보완: 저장소 전체 검사가 실패하는 게 정상임을 프롬프트에 명시해 api · web을 건드리지 않게 함, 요일 표기 규칙(2일 `·`, 3일 이상 `~`, 휴무 줄 맨 끝)을 예시 4개로 고정
- 리뷰에서 확인(탐침): 요일 키 누락 · 알 수 없는 키 실패, `https:/x` 실패, `14:00–17:00` · `10:00–13:00` 경계 통과, `24:00` 실패, 앞 공백 시각 실패, TZ를 Kiritimati(UTC+14) · Pago Pago(UTC−11)로 바꿔도 `2026-11-09` = 월
- 리뷰 지적 사항:
  - 같은 요일 구간이 역순(`17:00–21:00, 11:00–14:00`)이어도 통과 → 표시가 거꾸로 나오고 일정 계산이 순서를 가정함 → 오름차순 강제
  - `?exclude=a&exclude=b`(Express가 배열로 넘김) → 영어 zod 기본 메시지 노출 → 한국어 메시지
- Copilot이 잘한 점: 시각 형식이 틀린 구간은 겹침 검사에서 건너뛰어 오류가 한 번만 나게 함, 시간대 테스트에서 원래 `TZ` 복구

### 12 — plan-day (2026-11-01)

- 소요: Copilot CLI 1차 9분 17초(AI 크레딧 5.82), 재시도 0회
- 결과: 완료 기준 통과 — 도메인 · 데이터 테스트 28개, 커버리지 travel · opening 100% · plan-day 95%, eslint · prettier. api 라우트 타입 오류 10개는 프롬프트 13 대상
- 사전 보완: 리뷰어가 설계 6장 규칙을 기준 구현(스크래치, 커밋 안 함)으로 먼저 돌려 S1~S8 기대값을 만들었고, 그 과정에서 규칙 문제 4개를 찾아 설계를 고친 뒤 프롬프트에 반영
  - 기다림이 가치에 없어 110분 기다리는 일정 → 가치 = 점수 − 0.5 × (이동 + 기다림)
  - 야간 관광지가 오후에 먼저 쓰여 저녁 뒤 갈 곳 없음 → 저녁 전에는 19:00 넘어 여는 관광지 미룸
  - 시작 후보에 보충 후보가 섞여 하루를 5점짜리로 시작 → 시작 후보는 1순위에서만
  - 점심 · 저녁이 같은 식당 → 하루 한 번만
- 리뷰에서 확인: 실제 `spots.json`에 무작위 쿼리 2,000개(날짜 · 시각 · 동행 · 관심사 · exclude)를 돌려 기준 구현과 응답 JSON이 **2,000개 모두 같음**, 숫자 리터럴은 이름 붙인 상수뿐(`TAG_MATCH_SCORE` 등), `Date` · `Math.random` 없음, 기대값이 테스트에 리터럴로 들어감
- Copilot이 스스로 정한 것: 저녁 도달 가능성 계산에서 이미 간 식당을 뺌 (규칙 의도와 같은 방향이라 수용)
- 해커톤용으로 저장할 표현: "알고리즘 프롬프트는 기대값을 사람이 따로 계산해 고정하고, 실제 데이터로 기준 구현과 차등 비교"

### 13 — api-v2 (2026-11-01)

- 소요: Copilot CLI 1차 4분 25초(AI 크레딧 2.57), 재시도 0회
- 결과: 완료 기준 통과 — api 테스트 51개, api 타입 오류 0, eslint · prettier · `build`. web 타입 오류 48 · 테스트 8개 실패는 14~16 대상
- 리뷰에서 확인: 빌드 결과(`dist/index.js`)를 실제 `spots.json`(43곳)으로 띄워 `/api/course` 200 + `Cache-Control`, v1 `hours` 쿼리 · 2026-02-30 → 한국어 400(첫 오류는 날짜), `kind=bar` 400, 없는 장소 404 '장소를 찾을 수 없어요.', 식당(산유화) 상세의 nearby가 거리순 관광지(운문사 · 대비사 · 삼계리계곡). `toSpotSummary`를 한 곳으로 모은 뒤에도 기준 구현 차등 비교 2,000/2,000 같음

### 14 — web-home-v2 (2026-11-01)

- 소요: Copilot CLI 1차 6분 4초(AI 크레딧 3.39) → 수정 1회 1분 19초(0.62), 재시도 1회
- 결과: web lib · 홈 테스트 22개 통과, eslint · prettier. 결과 · 상세 화면 타입 오류(40)는 15 · 16 대상
- 리뷰 지적 사항 (프롬프트 쪽 실수): "끝이 범위 안이면 유지" 규칙과 "시작 14:00 → 끝 17:00" 예시가 서로 맞지 않았음(19:00은 14:00 시작에도 유효). Copilot이 충돌을 보고하고 예시를 따랐음 → 규칙(유지)이 맞다고 정해 수정 프롬프트로 고침
- 리뷰에서 확인: `todayInSeoul`이 UTC+9 고정 계산, 공유 URL을 직접 이어 붙여 `%3A` · `%2C` 없음. 브라우저 확인은 결과 · 상세 화면이 아직 v1 export(`HOURS`, `TRAVEL_MINUTES`)를 import해 앱 전체가 뜨지 않아 16 이후로 미룸
- 해커톤용으로 저장할 표현: "규칙과 예시를 같이 줄 때는 예시가 규칙을 따르는지 기준 계산으로 먼저 확인"

### 15 — web-course-timeline (2026-11-01)

- 소요: Copilot CLI 1차 5분 59초(AI 크레딧 3.5), 재시도 0회
- 결과: 결과 · 홈 · lib 테스트 33개 통과, eslint · prettier. 남은 타입 오류 16개는 SpotPage(16 대상)뿐
- 리뷰: 코드 검사만 하고 머지. 브라우저 확인(타임라인 · 사진 · 390px)은 SpotPage가 v1 export를 import해 앱이 뜨지 않아 16 머지 직전에 화면 전체를 함께 확인
