# 문서 지도

청도 코스 메이커의 기획 · 설계 · 구현 · 배포 문서. 번호 순서가 읽는 순서다.

| 폴더 | 내용 |
|---|---|
| [`00-overview/`](00-overview/project-brief.md) | 프로젝트 개요, 역할 분담, 결정 기록(ADR) |
| [`01-product/`](01-product/mvp-spec.md) | MVP 기능 명세, 사용자 흐름, 관광지 데이터 |
| [`02-design/`](02-design/ui-screens.md) | 화면 구성, 디자인 토큰 |
| [`03-architecture/`](03-architecture/system-overview.md) | 시스템 구조, API, 데이터 모델, 하루 일정 계산 |
| [`04-dev/`](04-dev/local-setup.md) | 로컬 환경, 코드 규칙, 테스트 |
| [`05-copilot/`](05-copilot/README.md) | AI 구현 과정 — Copilot 프롬프트 01~16, v2 구현 계획, 리뷰 기록 |
| [`06-deploy/`](06-deploy/README.md) | Azure 배포 — 수동 런북(01~04, 07) · Terraform 대응표 · 체크리스트 ([`infra/terraform`](../infra/terraform/README.md)) |

## 진행 순서

```
설계 확정 (00~04)
  └▶ v1 구현: Copilot 프롬프트 01~09 (여행 시간 2 · 4 · 6시간 코스)
        └▶ v2 구현: 장소 43곳 데이터 + Copilot CLI 프롬프트 10~16 (하루 일정)
              └▶ 배포: Azure VM 수동 런북 01~04 · Terraform 코드 (infra/terraform)
```

## 문서별 빠른 찾기

| 알고 싶은 것 | 문서 |
|---|---|
| 무엇을 만드나, 범위는 | [`01-product/mvp-spec.md`](01-product/mvp-spec.md) |
| 화면이 어떻게 생겼나 | [`02-design/ui-screens.md`](02-design/ui-screens.md) |
| 색 · 글꼴 값 | [`02-design/design-tokens.md`](02-design/design-tokens.md) |
| API 요청 · 응답 | [`03-architecture/api-spec.md`](03-architecture/api-spec.md) |
| 타입 정의 | [`03-architecture/data-model.md`](03-architecture/data-model.md) |
| 하루 일정이 어떻게 계산되나 | [`03-architecture/recommendation-algorithm.md`](03-architecture/recommendation-algorithm.md) |
| 왜 이 기술을 골랐나 | [`00-overview/decisions/`](00-overview/decisions/0001-tech-stack.md) |
| 로컬에서 실행하는 법 | [`04-dev/local-setup.md`](04-dev/local-setup.md) |
| Copilot에 준 프롬프트 · 리뷰 기록 | [`05-copilot/`](05-copilot/README.md#진행-순서) · [`review-log.md`](05-copilot/review-log.md) |
| 배포 절차 | [`06-deploy/`](06-deploy/README.md#로드맵) · [`infra/terraform`](../infra/terraform/README.md) |

## 문서 규칙

- 문서가 **기준**이다. 구현이 문서와 달라지면 문서를 먼저 고치고(또는 같은 PR에서) 구현한다.
- 결정을 바꾸면 새 ADR을 추가하고 이전 ADR 상태를 "대체됨"으로 바꾼다.
- 외부 링크(다이어그램, 디자인 캔버스)는 [`00-overview/project-brief.md`](00-overview/project-brief.md#주요-링크)에 모은다.
