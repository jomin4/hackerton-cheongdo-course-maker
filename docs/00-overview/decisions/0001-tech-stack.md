# ADR 0001 — 기술 스택: Azure VM + nginx + Express (Docker Compose)

- 상태: 채택 (2026-10-30)
- 대체한 결정: Azure Static Web Apps + Azure Functions (초안)

## 맥락

해커톤 필수 조건은 GitHub Copilot으로 구현하고 Azure Cloud에 배포하는 것이다. 초안은 서버 관리가 없는 **Static Web Apps + Functions(서버리스)** 였지만, 다음 이유로 다시 검토했다.

- 학습 목표가 "빠른 배포"뿐 아니라 **프로덕션 배포 기술 자체를 손에 익히는 것**이다.
- 서버리스는 nginx, 프로세스 관리, HTTPS, 방화벽 같은 전통적인 운영 요소를 플랫폼이 숨긴다.
- MS Learn Azure 기본 과정(컴퓨팅·네트워킹·스토리지·보안)을 실제로 써 볼 수 있는 구조가 필요하다.

## 결정

전통적인 WAS 구조를 컨테이너로 운영한다.

| 영역 | 선택 |
|---|---|
| 언어 · 런타임 | TypeScript, Node.js 22 LTS |
| 프론트엔드 | React + Vite + React Router + Tailwind CSS |
| 백엔드 (WAS) | Express + TypeScript, zod(입력 검증), pino(로깅) |
| 데이터 | JSON 파일을 서버 시작 시 메모리에 로드 ([ADR 0003](0003-json-instead-of-db.md)) |
| 빌드 | web: Vite · api: tsup 번들 ([ADR 0004](0004-api-build-tsup.md)) · 타입 검사: `tsc --noEmit` |
| 테스트 | Vitest + Supertest |
| 웹 서버 | nginx — 정적 파일, `/api/*` 리버스 프록시, HTTPS 종료, gzip · 캐시 · 보안 헤더 |
| 컨테이너 | Docker + Docker Compose (web · api 컨테이너 2개) |
| 클라우드 | Azure Virtual Machine, Ubuntu 24.04 LTS, Korea Central |
| 네트워크 | 공용 IP + DNS 이름 레이블, NSG (80 · 443 공개, 22는 내 IP만) |
| HTTPS | Let's Encrypt (certbot) |
| 이미지 저장소 | ~~GitHub Container Registry (GHCR)~~ → 2026-11-01: 쓰지 않음. VM에서 소스를 빌드 |
| CI/CD | ~~GitHub Actions — 테스트 → 빌드 · 푸시 → SSH 배포~~ → 2026-11-01: 쓰지 않음. 한 번 수동 배포하고 마무리 ([런북 04](../../06-deploy/runbooks/04-first-manual-deploy.md)) |

## 근거

- **학습 범위**: VM, 공용 IP, NSG, 관리 디스크, SSH 키 등 Azure 기본 개념을 직접 다룬다.
- **이식성**: Docker 이미지라 로컬 · VM · 다른 클라우드 어디서든 같은 방식으로 돈다.
- **로컬 재현성**: `docker compose up`으로 운영과 같은 구조를 PC에서 리허설할 수 있다.
- **Copilot 친화성**: Express · nginx · Dockerfile은 예제가 가장 많아 Copilot 제안 품질이 높다.
- **비용**: GHCR은 공개 저장소 기준 부담이 없고, VM 하나로 전체를 운영한다.

## 대가 (트레이드오프)

- 서버 운영 책임(OS 업데이트, 디스크, 인증서 갱신, 장애 대응)이 생긴다.
- VM은 켜져 있는 동안 비용이 나간다 → 사용하지 않을 때 **중지(할당 취소)** 습관 필요.
- 해커톤 4시간 안에 VM부터 새로 세팅하기엔 무겁다 → 서버 초기 설정을 스크립트로 만들고 시간을 재 둔다.
- 단일 VM이라 고가용성은 없다 (MVP 범위에서는 수용).

## 검토한 대안

| 대안 | 기각 이유 |
|---|---|
| Static Web Apps + Functions | 운영 요소가 플랫폼에 숨겨져 학습 목표와 맞지 않음. Functions 앞에는 nginx를 둘 수 없음 |
| App Service (Web App for Containers) | 관리형이라 VM보다 학습 범위가 좁음. 이후 비교 학습 후보 |
| Azure Container Apps | 운영 부담은 적지만 개념이 추가로 많음. 이후 확장 후보 |
| 프론트엔드만 (정적 사이트) | API · 서버 배포 연습이 빠짐 |
