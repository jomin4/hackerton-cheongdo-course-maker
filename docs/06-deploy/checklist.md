# 배포 체크리스트

## 배포 전 (로컬)

- [ ] `npm run lint && npm run typecheck && npm test && npm run build` 통과
- [ ] `docker compose -f infra/compose.yml up -d --build` 리허설 (로컬 80번 포트) 또는 `npm run docker:up`(8080)에서 홈 → 결과 → 상세 → 상태 화면 확인
- [ ] 커밋에 비밀 값 · `.env` 없음 (`git diff --cached`로 확인)
- [ ] `spots.json` 변경 시 출처 · 확인 날짜(`checkedAt`) 갱신
- [ ] 배포할 커밋이 `main`에 푸시됨 (VM은 GitHub에서 `git clone` · `git pull`로 받는다)

## 배포 중 (Terraform)

- [ ] `terraform test` 통과, `terraform plan`에 만들어질 리소스가 의도대로 (리소스 그룹 · VNet · 서브넷 · NSG · 연결 · 공용 IP · NIC · VM)
- [ ] `terraform apply` 후 `terraform output -raw bootstrap_log_command`로 "cheongdo bootstrap done" 확인

## 다시 배포 (VM)

- [ ] `git log --oneline -1`이 배포하려는 커밋
- [ ] `APP_VERSION=$(git rev-parse --short HEAD) docker compose -f infra/compose.yml up -d --build` 성공
- [ ] 빌드가 멈추거나 `Killed`가 나오면 스왑 확인 (`swapon --show`, 1GiB VM은 스왑 2GB 필요)

## 배포 후 (운영, 5분 점검)

| # | 확인 | 방법 | 기대 |
|---|---|---|---|
| 1 | 버전 | `http://<FQDN>/api/health` | `version` = 배포한 커밋, `spots` = 43 |
| 2 | 핵심 흐름 | 홈 → 코스 만들기 → 상세 → 코스로 돌아가기 | 정상, 시각이 적힌 하루 일정 |
| 3 | 새로고침 | `/course?date=…&start=…`, `/spots/eupseong`에서 F5 | 404 없이 화면 |
| 4 | 오류 화면 | `/course?hours=4&with=family&tags=nature`, `/spots/nope` | 400("방문 날짜가 올바르지 않아요.") · 404 화면 |
| 5 | 사진 · 출처 | 상세 화면, 푸터 | 사진 아래 'ⓒ한국관광공사', 푸터 '데이터 제공: ⓒ한국관광공사' |
| 6 | 모바일 | 휴대폰으로 접속 | 가로 스크롤 없음 |
| 7 | 헤더 | `curl.exe -I http://<FQDN>/` | nosniff 등 보안 헤더 |
| 8 | 캐시 | `curl.exe -I http://<FQDN>/assets/<파일>.js` | `immutable` |
| 9 | 로그 | `docker compose -f infra/compose.yml logs --tail=50 api` | error 없음 |
| 10 | 리소스 | `docker stats --no-stream`, `free -h`, `df -h /` | 메모리 · 디스크 여유 |

## 문제 시

1. 사용자 영향이 크면 **먼저 롤백** ([런북 07](runbooks/07-monitoring-rollback.md#4-롤백-연습)), 원인 분석은 그다음
2. 원인 · 해결을 PR 설명에 기록
