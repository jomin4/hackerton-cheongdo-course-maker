# 청도 코스 메이커

자가용으로 청도에 당일치기로 오는 사람이 방문 날짜 · 시작 · 끝 시각, 동행, 관심사를 고르면 그날 문을 연 곳만으로 관광 · 점심 · 쉬어 가기(카페) · 저녁 · 야간 관광을 도착 · 출발 시각과 차 이동 시간까지 적은 하루 일정으로 보여주는 웹 서비스. 장소는 청도군 안 43곳(관광 27 · 식당 8 · 카페 8)이고, 운영시간은 한국관광공사(TourAPI) · 청도군 · 장소 공식 자료로 확인해 요일별로 넣었다.

> 2026 청도 바이브코딩 해커톤 대비 연습 프로젝트 · GitHub Copilot으로 구현 · Azure에 배포

## 구조

```
cheongdo-course/
├── apps/
│   ├── web/              # React + Vite + Tailwind (화면)
│   └── api/              # Express + TypeScript (API · 코스 추천)
├── packages/
│   └── shared/           # 공유 타입 · 상수 · zod 스키마
├── infra/                # nginx · Docker Compose · 서버 스크립트
├── docs/                 # 기획 · 설계 · 프롬프트 · 배포 런북 · 학습 기록
└── .github/
    ├── copilot-instructions.md   # Copilot 프로젝트 규칙
    └── workflows/                # CI/CD
```

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | React, Vite, React Router, Tailwind CSS, TypeScript |
| 백엔드 | Express, TypeScript, zod, pino |
| 테스트 | Vitest, Supertest |
| 인프라 | Docker Compose, nginx, Azure VM (Ubuntu 24.04), Let's Encrypt |
| CI/CD | GitHub Actions, GitHub Container Registry |

선택 이유: [`docs/00-overview/decisions/0001-tech-stack.md`](docs/00-overview/decisions/0001-tech-stack.md)

## 시작하기

```bash
npm install
npm run dev          # http://localhost:5173
```

자세한 내용: [`docs/04-dev/local-setup.md`](docs/04-dev/local-setup.md)

## 문서

[`docs/README.md`](docs/README.md)에서 전체 문서 지도를 볼 수 있다.

## 진행 상황

- [x] 기획 · 설계 · UI 디자인
- [x] v1 Copilot 구현 (프롬프트 01~09) — 여행 시간 2 · 4 · 6시간 코스
- [x] v2 하루 일정 설계 · 장소 데이터 확인 — [설계](docs/01-product/day-course-design.md) · [장소 데이터](docs/01-product/spots-data.md) · [ADR 0005](docs/00-overview/decisions/0005-day-plan-coordinates-hours.md)
- [x] v2 Copilot CLI 구현 (프롬프트 10~16) — [review-log](docs/05-copilot/review-log.md)
- [ ] Azure 배포 — 다음 단계. Terraform으로 소유자가 직접 실행
- [ ] 모의 해커톤
