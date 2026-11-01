# 트러블슈팅 기록

> 직접 겪은 문제를 기록한다. 같은 문제를 두 번 찾지 않기 위한 문서이자, 해커톤 당일의 무기다.

## 기록 양식

```markdown
### [YYYY-MM-DD] 증상 한 줄

- 단계: 런북 NN / 운영
- 증상: (오류 메시지 원문)
- 원인:
- 해결: (실행한 명령)
- 배운 점:
```

## 미리 알아 두면 좋은 문제들

| 증상 | 흔한 원인 | 확인 · 해결 |
|---|---|---|
| `ssh: connect ... port 22: Connection timed out` | NSG 22번 규칙의 원본 IP가 지금 내 IP와 다름 | 내 IP 재확인 후 `az network nsg rule update ... --source-address-prefixes <IP>/32` |
| `Permission denied (publickey)` | 다른 개인 키 사용 | `ssh -i ~/.ssh/id_rsa ...`, VM의 `~/.ssh/authorized_keys` 확인 |
| `permission denied while trying to connect to the Docker daemon` | docker 그룹 적용 전 | 로그아웃 후 재접속 |
| 브라우저에서 사이트 접속 불가, VM 안 `curl localhost`는 정상 | NSG 80/443 미개방 | NSG 규칙 확인 |
| `502 Bad Gateway` | api 컨테이너 다운 · 시작 중 | `docker compose -f infra/compose.yml ps`, `... logs api` (데이터 검증 실패로 종료했을 수 있음) |
| `/course` 새로고침 시 404 | nginx `try_files` 누락 | `location / { try_files $uri $uri/ /index.html; }` |
| certbot `Timeout during connect` / `unauthorized` | 80번 차단, 챌린지 경로 미설정, DNS 이름 오타 | NSG 80, `/.well-known/acme-challenge/` location, `nslookup <FQDN>` |
| nginx `cannot load certificate` | 인증서 발급 전 HTTPS 설정 적용 | `prod-http.conf`로 되돌린 뒤 발급 → 전환 (런북 05) |
| 보안 헤더 일부가 안 보임 | `location` 안의 `add_header`가 바깥 헤더를 덮음 | 필요한 헤더를 해당 location에도 추가하거나 `always` 헤더를 server 수준에만 |
| 빌드 중 `Killed` · 멈춤 (`npm ci` · `vite build`) | 1GiB VM 메모리 부족 | `swapon --show`로 스왑 확인, 없으면 2GB 스왑 추가 (런북 04 1단계) 후 다시 빌드 |
| `Bind for 0.0.0.0:80 failed: port is already allocated` | 80번을 다른 프로세스가 사용 (예전 compose · 호스트 nginx) | `sudo ss -ltnp | grep :80`, 예전 컨테이너는 `docker ps` 후 `docker stop` |
| `git clone` 후 `/api/health`의 `version`이 `dev` | `APP_VERSION` 없이 실행 | `APP_VERSION=$(git rev-parse --short HEAD) docker compose -f infra/compose.yml up -d --build` |
| 디스크 가득 참 | 오래된 이미지 · 로그 | `docker image prune -a`, daemon.json 로그 제한 확인 |

---

<!-- 아래에 기록 추가 -->
