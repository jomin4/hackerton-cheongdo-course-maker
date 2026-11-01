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
| nginx | `infra/nginx` | 정적 파일 서빙, `/api` 리버스 프록시, HTTPS, 압축 · 캐시 · 보안 헤더 |
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
관광객 ──HTTPS──▶ 공용 IP / DNS 이름 ──▶ NSG (80·443) ──▶ web 컨테이너 (nginx :443)
                                                          └─(/api/*)──▶ api 컨테이너 (:3000, 외부 비공개)
```

- api 컨테이너는 포트를 호스트에 열지 않는다. Compose 내부 네트워크로만 nginx와 통신.
- HTTPS 인증서는 VM의 certbot이 발급 · 갱신하고, nginx 컨테이너가 읽기 전용으로 마운트한다.

## 배포 파이프라인

```
git push main
  └▶ GitHub Actions
       1. npm ci → lint → typecheck → test
       2. web · api Docker 이미지 빌드 (태그: git SHA + latest)
       3. GHCR에 푸시
       4. SSH로 VM 접속 → docker compose pull → up -d → /api/health 확인
```

실패하면 그 단계에서 멈추고, VM에는 이전 이미지가 계속 돈다. 롤백은 이전 SHA 태그로 `up -d`.

## 이미지

| 이미지 | 베이스 | 내용 |
|---|---|---|
| `ghcr.io/<계정>/cheongdo-course-web` | 빌드: `node:22-alpine` → 실행: `nginx:alpine` | React `dist/` + `nginx.conf` |
| `ghcr.io/<계정>/cheongdo-course-api` | 빌드: `node:22-alpine` → 실행: `node:22-alpine` | tsup 번들 `dist/index.js`(shared 포함, [ADR 0004](../00-overview/decisions/0004-api-build-tsup.md)) + 운영 의존성 + `data/spots.json`, 비루트 사용자 실행 |

## nginx 책임

| 항목 | 설정 |
|---|---|
| SPA 라우팅 | `try_files $uri /index.html` (`/course`, `/spots/:id` 새로고침 대응) |
| API 프록시 | `location /api/ { proxy_pass http://api:3000; }` + `X-Forwarded-*` 헤더 |
| 캐시 | `/assets/*`(해시 파일명) 1년 immutable, `index.html`은 no-cache |
| 압축 | gzip (text, css, js, json, svg) |
| 보안 헤더 | `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, HSTS(HTTPS 확정 후) |
| HTTP → HTTPS | 80은 certbot 확인 경로만 응답하고 나머지는 301 |

## 환경 변수

| 이름 | 위치 | 기본값 | 설명 |
|---|---|---|---|
| `PORT` | api | `3000` | Express 포트 |
| `NODE_ENV` | api | `development` | `production`이면 pino JSON 로그 |
| `LOG_LEVEL` | api | `info` | pino 로그 수준 |
| `DATA_PATH` | api | `./data/spots.json` | 관광지 데이터 경로 (작업 디렉터리 기준) |
| `APP_VERSION` | api (이미지 빌드 인자 `ARG` → `ENV`) | `dev` | `/api/health`의 `version`. CI가 git SHA를 `--build-arg`로 주입 |
| `IMAGE_TAG` | VM `.env` | `latest` | 배포할 이미지 태그 (롤백 시 변경) |
| `GHCR_OWNER` | VM `.env` | — | GHCR 계정명 (소문자) |
| `DOMAIN` | VM `.env` | — | 예: `cheongdo-course.koreacentral.cloudapp.azure.com` |

비밀 값(SSH 키 등)은 GitHub Secrets에만 두고 저장소에 커밋하지 않는다.
