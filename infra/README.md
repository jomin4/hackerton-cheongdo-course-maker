# infra

배포 관련 설정. **직접 작업 영역**이다 (Copilot은 프롬프트 09에서만 일부 작성).

| 경로 | 만드는 곳 | 내용 |
|---|---|---|
| `nginx/default.conf` | 프롬프트 09 | 이미지 기본 nginx 설정 (HTTP) |
| `compose.local.yml` | 프롬프트 09 | 로컬 운영 리허설 (빌드 포함) |
| `compose.yml` | 런북 04 | 운영 compose — VM에서 소스를 빌드해 80번 포트로 공개 |
| `nginx/prod-http.conf` · `prod-https.conf` | 런북 05 (선택, 아직 없음) | HTTPS를 붙일 때 만든다 |
| `terraform/` | 배포 | `terraform apply` 한 번으로 Azure 리소스 + 첫 부팅 배포 ([README](terraform/README.md)) |
| `scripts/server-setup.sh` | 런북 03 | VM 초기 설정 (업데이트 · Docker · 로그 제한 · 스왑 2GB · 배포 폴더) |

가이드: [`../docs/06-deploy/README.md`](../docs/06-deploy/README.md)
