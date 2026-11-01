# 시스템 구조

> 다이어그램: [Eraser — 청도 코스 메이커 인프라 아키텍처](https://app.eraser.io/workspace/eleuIDG7FlT0ljg5vO7c)
> - [로컬 개발 환경](https://app.eraser.io/workspace/eleuIDG7FlT0ljg5vO7c?diagram=8CCCeGUa2NioBgvYCRt1&layout=canvas)
> - [운영 배포 환경](https://app.eraser.io/workspace/eleuIDG7FlT0ljg5vO7c?diagram=U3lOpwgIeyOmkbbpMLQU&layout=canvas)

## 구성 요소

| 구성 요소 | 위치 | 역할 |
|---|---|---|
| Web (React SPA) | `apps/web` | 화면. 빌드 결과는 정적 파일(`dist/`) |
| API (Express) | `apps/api` | `/api/*` JSON 응답, 하루 일정 계산 |
| Shared | `packages/shared` | 타입, 상수, zod 스키마 |
| nginx | `infra/nginx` | 정적 파일 서빙, `/api` 리버스 프록시, 압축 · 캐시 · 보안 헤더 |
| Compose | `infra/compose.yml` (운영), `compose.local.yml` (리허설) | 컨테이너 정의 · 재시작 정책 |

## 실행 모드 3가지

### 1. 개발 모드 — `npm run dev`

```
브라우저 ──▶ Vite :5173 ──(/api/* 프록시)──▶ Express :3000 (tsx watch)
```

- 화면 코드 저장 → 즉시 반영(HMR). API 코드 저장 → 자동 재시작.
- Vite `server.proxy`가 `/api`를 Express로 넘기므로 CORS 설정이 필요 없다.

### 2. 운영 리허설 — `docker compose -f infra/compose.local.yml up --build`

```
브라우저 ──▶ web 컨테이너 (nginx :80, React 빌드 파일) ──(/api/*)──▶ api 컨테이너 (node dist :3000)
```

- 운영과 같은 이미지 · 같은 nginx 설정. HTTPS만 빠진다.
- 배포 전에 여기서 동작을 확인한다.

### 3. 운영 — Azure VM

```
관광객 ──HTTP──▶ 공용 IP / DNS 이름 ──▶ NSG (80) ──▶ web 컨테이너 (nginx :80)
                                                          └─(/api/*)──▶ api 컨테이너 (:3000, 외부 비공개)
```

- api 컨테이너는 포트를 호스트에 열지 않는다. Compose 내부 네트워크로만 nginx와 통신.
- 이번 배포는 HTTP로 마무리한다. HTTPS(certbot 인증서 + nginx 마운트)는 선택 단계로 [런북 05](../06-deploy/runbooks/05-https-certbot.md)에 남겨 둔다.

## 배포 방식

```
내 PC: git push main
VM:    cd /opt/cheongdo-course/app && git pull
       APP_VERSION=$(git rev-parse --short HEAD) docker compose -f infra/compose.yml up -d --build
       curl http://localhost/api/health      # version = 배포한 커밋
```

CI/CD와 이미지 레지스트리는 쓰지 않는다 (2026-11-01 결정, 한 번 배포하고 마무리). 롤백은 VM에서 이전 커밋으로 `git checkout` 후 같은 명령으로 다시 빌드한다 ([런북 07](../06-deploy/runbooks/07-monitoring-rollback.md)).

## 이미지

| 이미지 | 베이스 | 내용 |
|---|---|---|
| web (`apps/web/Dockerfile`) | 빌드: `node:22-alpine` → 실행: `nginx:alpine` | React `dist/` + `nginx.conf` |
| api (`apps/api/Dockerfile`) | 빌드: `node:22-alpine` → 실행: `node:22-alpine` | tsup 번들 `dist/index.js`(shared 포함, [ADR 0004](../00-overview/decisions/0004-api-build-tsup.md)) + 운영 의존성 + `data/spots.json`, 비루트 사용자 실행 |

## nginx 책임

| 항목 | 설정 |
|---|---|
| SPA 라우팅 | `try_files $uri /index.html` (`/course`, `/spots/:id` 새로고침 대응) |
| API 프록시 | `location /api/ { proxy_pass http://api:3000; }` + `X-Forwarded-*` 헤더 |
| 캐시 | `/assets/*`(해시 파일명) 1년 immutable, `index.html`은 no-cache |
| 압축 | gzip (text, css, js, json, svg) |
| 보안 헤더 | `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, HSTS(HTTPS 확정 후) |
| HTTP → HTTPS | HTTPS를 붙일 때만 (런북 05) |

## 환경 변수

| 이름 | 위치 | 기본값 | 설명 |
|---|---|---|---|
| `PORT` | api | `3000` | Express 포트 |
| `NODE_ENV` | api | `development` | `production`이면 pino JSON 로그 |
| `LOG_LEVEL` | api | `info` | pino 로그 수준 |
| `DATA_PATH` | api | `./data/spots.json` | 관광지 데이터 경로 (작업 디렉터리 기준) |
| `APP_VERSION` | api (이미지 빌드 인자 `ARG` → `ENV`) | `dev` | `/api/health`의 `version`. `infra/compose.yml`이 `APP_VERSION` 환경 변수(배포 시 git 짧은 SHA)를 빌드 인자로 넘김 |

비밀 값(SSH 개인 키 등)은 내 PC에만 두고 저장소에 커밋하지 않는다. 운영에 필요한 비밀 값은 없다 (TourAPI 키는 수집 도구용으로 내 PC `.env`에만).
