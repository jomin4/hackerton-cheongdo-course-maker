# infra

배포 관련 설정 — 로컬 리허설과 운영(Azure VM)이 같은 Dockerfile · nginx 설정을 쓰고, 운영 인프라는 Terraform 코드로 정의한다.

| 경로 | 만드는 곳 | 내용 |
|---|---|---|
| `nginx/default.conf` | 프롬프트 09 | 이미지 기본 nginx 설정 (HTTP) |
| `compose.local.yml` | 프롬프트 09 | 로컬 운영 리허설 (빌드 포함) |
| `compose.yml` | 런북 04 | 운영 compose — VM에서 소스를 빌드해 80번 포트로 공개 |
| `terraform/` | 배포 | `terraform apply` 한 번으로 Azure 리소스 + 첫 부팅 배포 ([README](terraform/README.md)) |
| `scripts/server-setup.sh` | 런북 03 | VM 초기 설정 (업데이트 · Docker · 로그 제한 · 스왑 2GB · 배포 폴더) |

가이드: [`../docs/06-deploy/README.md`](../docs/06-deploy/README.md)
