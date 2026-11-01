# 해커톤 당일 치트시트

> 2026-11-05 (목) · 청도신화랑풍류마을 · 실제 개발 시간 약 4시간 10분
> 연습하면서 계속 고쳐 쓴다. 당일엔 이 한 장만 연다.

## 당일 타임라인과 목표

| 시각 | 일정 | 내 목표 |
|---|---|---|
| 10:00 | 주제 공개 | 10분 안에 문제 한 문장 + 화면 3개 이하 결정 |
| 10:30 | 팀빌딩 | 역할: 기획 · 발표 / 프론트 / 백엔드 · 배포 |
| 11:00–13:00 | 개발 Ⅰ (2시간) | **11:30까지 빈 앱이 배포 URL에서 열림** → 핵심 API + 화면 1개 |
| 14:00–15:00 | 개발 Ⅱ (1시간) | 핵심 흐름 완성, 배포 |
| 15:00 | 1차 제출 · 자동 검수 | 배포 URL 동작 필수 |
| 15:20–16:30 | 개발 Ⅲ (1시간 10분) | 상태 화면 · 다듬기 · 기획서 |
| 16:30 | 2차 제출 · AI 검수 · 최종 심사 | 기획서 · 코드 · 배포 서비스 |

## 사전 준비물 (전날 체크)

- [ ] 이 저장소를 템플릿으로 한 빈 프로젝트 (프롬프트 01 결과 + Dockerfile + compose + 워크플로)
- [ ] VM 초기 설정 스크립트 `infra/scripts/server-setup.sh` — 실행 시간 측정 기록: ___분
- [ ] Azure 구독 · 크레딧 확인, CLI 로그인 상태
- [ ] GitHub Copilot 로그인, Agent 모드 동작 확인
- [ ] 노트북 충전기, 테더링 (현장 Wi-Fi 대비)

## 프롬프트 템플릿

```text
<무엇을> 구현해줘. <범위 밖>은 만들지 마.

참고 문서:
#file:docs/...

만들 파일:
- 경로: 역할

요구사항:
- ...

제약:
- 스택/라이브러리 추가 금지, 색은 토큰만, 기존 파일 X는 수정 금지

완료 기준:
- npm test, npm run typecheck 통과
- 브라우저에서 <URL> 확인

끝나면 보고: 변경 파일, 실행 명령과 결과, 다르게 한 부분.
```

### 잘 먹힌 표현 (연습하며 추가)

-

## 명령어

### 개발

```powershell
npm run dev                # web :5173 + api :3000
npm test; npm run typecheck; npm run lint
npm run docker:up          # 운영 리허설 :8080
```

### Azure

```powershell
az login
az group create -n rg-<이름> -l koreacentral
az vm create -g rg-<이름> -n vm-<이름> --image Ubuntu2404 --size Standard_B1s --admin-username azureuser --generate-ssh-keys --public-ip-sku Standard --public-ip-address-dns-name <dns이름> --nsg-rule NONE
az vm open-port -g rg-<이름> -n vm-<이름> --port 80,443 --priority 110
az vm deallocate -g rg-<이름> -n vm-<이름>
```

### 서버

```bash
cd /opt/<앱> && docker compose pull && docker compose up -d
docker compose ps; docker compose logs -f --tail=100 api
sudo certbot certonly --webroot -w /var/www/certbot -d <FQDN>
```

## 빠른 배포 경로 (시간이 없을 때)

1. HTTPS 없이 HTTP로 먼저 1차 제출 → 개발 Ⅲ에서 HTTPS
2. 배포는 런북 04의 수동 배포(VM에서 `git clone` → `docker compose -f infra/compose.yml up -d --build`)
3. 화면 3개가 무리면 1개 + API로 축소, 상태 화면은 최소한만

## 기획서 뼈대

1. 문제 — 누가, 언제, 무엇이 불편한가 (숫자 · 장면 하나)
2. 해결 — 서비스 한 줄 + 핵심 흐름 3단계
3. 시연 — 배포 URL, 화면 캡처
4. 구현 — 아키텍처 그림, Copilot 활용 방식(프롬프트 파일 · 리뷰 루프)
5. 확장 — 다음 단계 2~3개

## 연습 기록

| 날짜 | 연습 | 주제 | 배포까지 걸린 시간 | 막힌 곳 |
|---|---|---|---|---|
| | 모의 해커톤 1차 | | | |
