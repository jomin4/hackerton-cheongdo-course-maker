variable "subscription_id" {
  description = "배포할 Azure 구독 ID (az account show --query id -o tsv)"
  type        = string
}

variable "location" {
  description = "Azure 지역"
  type        = string
  default     = "koreacentral"
}

variable "resource_group_name" {
  description = "리소스 그룹 이름 (지우면 안의 리소스가 모두 함께 지워진다)"
  type        = string
  default     = "rg-cheongdo-course"
}

variable "name_prefix" {
  description = "VM · 네트워크 리소스 이름 앞부분"
  type        = string
  default     = "cheongdo-course"
}

variable "dns_label" {
  description = "공용 IP DNS 레이블 → <dns_label>.<location>.cloudapp.azure.com (지역 안에서 유일해야 함)"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,61}[a-z0-9]$", var.dns_label))
    error_message = "dns_label 은 소문자로 시작하고 소문자 · 숫자 · 하이픈만 쓸 수 있어요 (3~63자)."
  }
}

variable "vm_size" {
  description = "VM 크기. B1s(1 vCPU · 1GiB)는 스왑 2GB로 빌드한다"
  type        = string
  default     = "Standard_B1s"
}

variable "admin_username" {
  description = "VM 관리자 계정"
  type        = string
  default     = "azureuser"
}

variable "ssh_public_key_path" {
  description = "VM에 등록할 SSH 공개 키 파일 경로"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "admin_cidr" {
  description = "SSH(22)를 허용할 내 공인 IP (예: 203.0.113.10/32)"
  type        = string

  validation {
    condition     = can(cidrhost(var.admin_cidr, 0)) && var.admin_cidr != "0.0.0.0/0"
    error_message = "admin_cidr 는 CIDR 형식이어야 하고 0.0.0.0/0(전체 공개)은 안 돼요."
  }
}

variable "repo_url" {
  description = "VM이 clone 할 저장소 (공개 저장소)"
  type        = string
  default     = "https://github.com/jomin4/hackerton-cheongdo-course-maker.git"
}

variable "repo_ref" {
  description = "배포할 브랜치 · 태그"
  type        = string
  default     = "main"
}

variable "auto_shutdown_time" {
  description = "매일 자동 종료 시각 (한국 시간 HHMM, 예: 2300). 빈 값이면 자동 종료 안 함"
  type        = string
  default     = ""
}

variable "budget_alert_email" {
  description = "월 예산 알림을 받을 이메일. 빈 값이면 예산 알림을 만들지 않음"
  type        = string
  default     = ""
}

variable "monthly_budget_amount" {
  description = "리소스 그룹 월 예산 (구독 통화 기준)"
  type        = number
  default     = 30
}

variable "tags" {
  description = "모든 리소스에 붙일 태그"
  type        = map(string)
  default = {
    project = "cheongdo-course"
    env     = "prod"
  }
}
