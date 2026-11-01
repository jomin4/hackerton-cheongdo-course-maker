# Azure 계정 없이 plan 을 검사한다 (mock provider). 실행: terraform test
mock_provider "azurerm" {}

variables {
  subscription_id     = "00000000-0000-0000-0000-000000000000"
  dns_label           = "cheongdo-course-test"
  admin_cidr          = "203.0.113.10/32"
  ssh_public_key_path = "tests/test_key.pub"
}

run "network_opens_web_and_limits_ssh" {
  command = plan

  assert {
    condition     = one([for r in azurerm_network_security_group.main.security_rule : r.source_address_prefix if r.destination_port_range == "22"]) == "203.0.113.10/32"
    error_message = "SSH(22)는 admin_cidr 에서만 열려야 해요."
  }

  assert {
    condition     = alltrue([for p in ["80", "443"] : one([for r in azurerm_network_security_group.main.security_rule : r.source_address_prefix if r.destination_port_range == p]) == "Internet"])
    error_message = "80 · 443 은 인터넷 전체에 열려야 해요."
  }

  assert {
    condition     = azurerm_public_ip.main.domain_name_label == "cheongdo-course-test" && azurerm_public_ip.main.allocation_method == "Static"
    error_message = "공용 IP 는 고정 IP + DNS 레이블이어야 해요."
  }
}

run "vm_boots_and_deploys_the_app" {
  command = plan

  assert {
    condition     = azurerm_linux_virtual_machine.main.size == "Standard_B1s" && azurerm_linux_virtual_machine.main.disable_password_authentication
    error_message = "기본 VM 은 B1s, 비밀번호 로그인 금지여야 해요."
  }

  assert {
    condition     = azurerm_linux_virtual_machine.main.source_image_reference[0].offer == "ubuntu-24_04-lts"
    error_message = "Ubuntu 24.04 이미지여야 해요."
  }

  assert {
    condition = alltrue([
      for s in [
        "git clone --branch main https://github.com/jomin4/hackerton-hackerground.git /opt/cheongdo-course/app",
        "docker compose -f infra/compose.yml up -d --build",
        "fallocate -l 2G /swapfile",
        "usermod -aG docker azureuser",
      ] : strcontains(base64decode(azurerm_linux_virtual_machine.main.custom_data), s)
    ])
    error_message = "cloud-init 에 clone · compose 빌드 · 스왑 · docker 그룹 설정이 있어야 해요."
  }
}

run "cost_features_are_off_by_default" {
  command = plan

  assert {
    condition     = length(azurerm_dev_test_global_vm_shutdown_schedule.main) == 0 && length(azurerm_consumption_budget_resource_group.main) == 0
    error_message = "자동 종료 · 예산 알림은 변수를 줄 때만 만들어야 해요."
  }
}

run "cost_features_when_enabled" {
  command = plan

  variables {
    auto_shutdown_time = "2300"
    budget_alert_email = "me@example.com"
  }

  assert {
    condition     = azurerm_dev_test_global_vm_shutdown_schedule.main[0].timezone == "Korea Standard Time" && length(azurerm_consumption_budget_resource_group.main) == 1
    error_message = "자동 종료(한국 시간)와 예산 알림이 만들어져야 해요."
  }
}

run "rejects_ssh_open_to_world" {
  command = plan

  variables {
    admin_cidr = "0.0.0.0/0"
  }

  expect_failures = [var.admin_cidr]
}

run "rejects_bad_dns_label" {
  command = plan

  variables {
    dns_label = "Cheongdo_Course"
  }

  expect_failures = [var.dns_label]
}
