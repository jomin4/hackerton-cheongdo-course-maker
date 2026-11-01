# Terraform — Azure 배포 (apply 한 번)

`terraform apply` 한 번으로 Azure에 리소스를 만들고, VM이 첫 부팅 때 이 저장소를 받아 빌드 · 실행한다. 포털에서 손으로 만들 것이 없다.

## 만들어지는 것

```
rg-cheongdo-course (koreacentral)
├─ vnet-cheongdo-course 10.10.0.0/16
│  └─ snet-cheongdo-course 10.10.1.0/24 ── nsg-cheongdo-course
│       80 · 443: Internet 허용 / 22: admin_cidr 만 허용
├─ pip-cheongdo-course  고정 IP + DNS <dns_label>.koreacentral.cloudapp.azure.com
├─ nic-cheongdo-course
└─ vm-cheongdo-course   Ubuntu 24.04 · Standard_B1s · 디스크 30GB · SSH 키 로그인만
     └─ cloud-init (첫 부팅 1회)
          스왑 2GB → Docker 설치 → git clone <repo_ref>
          → APP_VERSION=<커밋> docker compose -f infra/compose.yml up -d --build
          (web 80 공개 · api 3000 내부)
선택: 매일 자동 종료(auto_shutdown_time) · 월 예산 알림(budget_alert_email)
```

| 파일 | 내용 |
|---|---|
| `versions.tf` | Terraform ≥ 1.6, `hashicorp/azurerm ~> 4.0` |
| `variables.tf` | 입력 값과 검증 (SSH 전체 공개 · 잘못된 DNS 레이블 거부) |
| `main.tf` | 리소스 그룹 · 네트워크 · NSG · 공용 IP · VM · 선택 비용 기능 |
| `cloud-init.yaml.tftpl` | VM 첫 부팅 스크립트 (로그: `/var/log/cheongdo-bootstrap.log`) |
| `outputs.tf` | 사이트 주소 · 상태 확인 주소 · SSH 명령 |
| `tests/plan.tftest.hcl` | Azure 없이 plan 을 검사하는 테스트 (mock provider) |

## 준비 (한 번)

1. Terraform ≥ 1.6, Azure CLI 설치
2. `az login` → `az account show --query id -o tsv`로 구독 ID 확인
3. SSH 키가 없으면 `ssh-keygen -t rsa -b 4096`
4. `Copy-Item terraform.tfvars.example terraform.tfvars` 후 값 채우기
   - `subscription_id`, `dns_label`(지역 안에서 유일), `admin_cidr`(내 공인 IP/32)

## 배포

```powershell
cd infra/terraform
terraform init
terraform plan -out tfplan      # 만들어질 리소스 확인
terraform apply tfplan
```

`apply`가 끝나도 VM 안에서는 설치 · 빌드가 이어진다 (B1s 기준 10분 안팎). 진행 확인:

```powershell
terraform output -raw bootstrap_log_command   # 이 명령을 복사해 실행
terraform output -raw health_url              # 브라우저로 열어 version 확인
terraform output -raw site_url
```

## 코드를 고친 뒤 다시 배포

VM은 첫 부팅 때만 clone 한다. 이후 배포는 VM에서:

```bash
cd /opt/cheongdo-course/app && git pull
APP_VERSION=$(git rev-parse --short HEAD) docker compose -f infra/compose.yml up -d --build
```

(VM을 새로 만들고 싶으면 `terraform apply -replace=azurerm_linux_virtual_machine.main` — 공용 IP · DNS는 그대로 유지된다)

## 정리 (비용 0)

```powershell
terraform destroy
```

리소스 그룹째 지워진다. 며칠 뒤 포털 → 비용 분석에서 과금이 멈췄는지 확인한다.

## 검사 (Azure 계정 없이)

```powershell
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
terraform test          # 6개: NSG 규칙, VM 설정, cloud-init 내용, 비용 기능 on/off, 입력 검증
```

## 주의

- `terraform.tfvars`(구독 ID · 내 IP)와 `*.tfstate`(리소스 정보)는 커밋하지 않는다 (`.gitignore`).
- 상태 파일은 로컬에 둔다. 팀으로 쓰려면 Azure Storage 원격 백엔드를 붙인다.
- HTTPS는 포함하지 않는다 (443은 열려 있음). 도메인을 붙이면 certbot 인증서를 nginx에 마운트해 더할 수 있다.
