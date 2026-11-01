# Copilot 구현 가이드

> 이 영역은 **Claude가 프롬프트를 설계**하고, **개발자가 Copilot에 투입**해 구현하는 방식으로 진행한다.

## 두 층의 지시

| 층 | 파일 | 적용 |
|---|---|---|
| 항상 적용 | [`/.github/copilot-instructions.md`](../../.github/copilot-instructions.md) | Copilot Chat이 이 저장소에서 자동으로 읽는 프로젝트 규칙 (스택, 코드 규칙, 하지 말 것) |
| 작업 단위 | [`prompts/`](prompts/) | 작업 하나당 프롬프트 하나. 번호 순서대로 진행 |

## 진행 순서

| # | 프롬프트 | 산출물 | 의존 |
|---|---|---|---|
| 01 | [scaffold-monorepo](prompts/01-scaffold-monorepo.md) | 워크스페이스, 공통 설정, shared 패키지 | — |
| 02 | [api-spots](prompts/02-api-spots.md) | Express 앱 골격, 데이터 로드, `/api/health`, `/api/spots` | 01 |
| 03 | [recommend-course](prompts/03-recommend-course.md) | 추천 알고리즘 + 테스트 T1~T9 | 01 |
| 04 | [api-course](prompts/04-api-course.md) | `/api/course` + API 테스트 | 02, 03 |
| 05 | [web-layout-home](prompts/05-web-layout-home.md) | 토큰, 레이아웃, 홈 화면 | 01 |
| 06 | [web-course-result](prompts/06-web-course-result.md) | 코스 결과 화면 | 04, 05 |
| 07 | [web-spot-detail](prompts/07-web-spot-detail.md) | 관광지 상세 화면 | 02, 05 |
| 08 | [web-states](prompts/08-web-states.md) | 로딩 · 빈 결과 · 400 · 404 · 오류 | 06, 07 |
| 09 | [dockerize](prompts/09-dockerize.md) | Dockerfile 2개, nginx.conf, compose.local.yml | 04, 08 |

02와 03, 05는 01 이후 서로 독립이라 순서를 바꿔도 된다.

### v2 — 하루 일정 ([`plan-v2.md`](plan-v2.md))

v2부터는 Claude가 Copilot CLI로 프롬프트를 직접 투입하고 리뷰 · 머지까지 한다 (통합 브랜치 `feat/day-course-v2`). 03 · 04 · 06의 v1 결과물은 v2에서 대체됐다.

| # | 프롬프트 | 산출물 | 의존 |
|---|---|---|---|
| 10 | [tourapi-tools](prompts/10-tourapi-tools.md) | TourAPI 수집 도구 (`tools/tourapi/`, 결과는 git 밖) | — |
| 11 | [shared-v2](prompts/11-shared-v2.md) | 종류 · 요일 · 9개 읍면 상수, WeeklyHours · DayPlan 타입, 시각 도우미 | 10 |
| 12 | [plan-day](prompts/12-plan-day.md) | 하루 일정 계산 `planDay` + 시나리오 S1~S9 | 11 |
| 13 | [api-v2](prompts/13-api-v2.md) | `/api/course` 하루 일정, `/api/spots` 종류 · 거리순 주변 | 12 |
| 14 | [web-home-v2](prompts/14-web-home-v2.md) | 홈 입력(방문 날짜 · 시작 · 끝) | 13 |
| 15 | [web-course-timeline](prompts/15-web-course-timeline.md) | 결과 타임라인 | 14 |
| 16 | [web-spot-footer-v2](prompts/16-web-spot-footer-v2.md) | 장소 상세 · 푸터 출처 · 상태 화면 | 15 |

## 한 사이클 (프롬프트 1개)

1. **브랜치**: `git switch -c feat/03-recommend-course`
2. **투입**: VS Code Copilot Chat을 **Agent 모드**로 열고, 프롬프트 파일의 `## 프롬프트` 블록 전체를 붙여 넣는다.
   - 프롬프트 안의 `#file:docs/...` 참조는 그대로 둔다 (Copilot이 해당 문서를 맥락으로 읽음).
   - 모델 선택은 기본값으로 시작하고, 결과가 약하면 상위 모델로 바꿔 재시도.
3. **확인**: Copilot이 실행한 명령과 변경 파일을 검토. 터미널 명령 실행 승인 요청은 내용을 보고 허락.
4. **검증**: 프롬프트의 "완료 기준" 명령을 직접 다시 실행.
5. **리뷰 요청**: 설계 세션(Claude)에 다음을 공유한다.
   - Copilot의 최종 보고(변경 파일 · 명령 결과 · 다르게 한 점)
   - `git diff --stat`와 핵심 파일 내용 또는 diff
   - 실패한 테스트 출력 (있으면)
6. **반영**: Claude의 리뷰 결과에 따라 수정 프롬프트를 Copilot에 투입하거나 직접 수정.
7. **기록**: [`review-log.md`](review-log.md)에 한 줄 요약 → 커밋 → PR → 머지.

## 프롬프트 파일 형식

모든 프롬프트는 같은 구조를 따른다.

```markdown
# NN — 제목
목적 / 선행 조건 / 학습 포인트

## 프롬프트          ← 이 블록만 Copilot에 붙여 넣음
목표 · 참고 문서(#file) · 만들 파일 · 요구사항 · 제약 · 완료 기준 · 보고

## 리뷰 체크리스트    ← Claude 리뷰 · 본인 확인용
```

## 잘 안 될 때

| 증상 | 대응 |
|---|---|
| 범위를 넘어 다른 파일까지 고침 | "요청한 파일 외 변경은 되돌려줘"로 재요청, 또는 `git restore` |
| 문서와 다른 타입 · 이름 사용 | "#file:docs/03-architecture/data-model.md 의 정의를 그대로 써줘" |
| 테스트를 통과시키려고 테스트를 고침 | 기대값은 문서 기준임을 명시하고 구현을 고치도록 재요청 |
| 한 번에 너무 많이 만들다 멈춤 | 프롬프트의 요구사항을 절반씩 나눠서 투입 |
| 같은 오류 반복 | 오류 전문과 함께 설계 세션에 공유 → Claude가 원인 분석 · 수정 프롬프트 작성 |

## 해커톤 당일 활용

이 프롬프트들은 해커톤 당일 템플릿이 된다. 구조(목표 → 참조 → 파일 → 요구사항 → 제약 → 완료 기준 → 보고)를 그대로 두고 내용만 바꾸면 된다.
