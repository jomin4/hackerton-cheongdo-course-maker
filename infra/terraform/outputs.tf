output "public_ip" {
  description = "VM 공용 IP"
  value       = azurerm_public_ip.main.ip_address
}

output "fqdn" {
  description = "VM DNS 이름"
  value       = azurerm_public_ip.main.fqdn
}

output "site_url" {
  description = "서비스 주소 (첫 부팅 빌드가 끝난 뒤 열림, B1s 기준 10분 안팎)"
  value       = "http://${azurerm_public_ip.main.fqdn}"
}

output "health_url" {
  description = "상태 확인 주소 — version 이 배포한 커밋이면 정상"
  value       = "http://${azurerm_public_ip.main.fqdn}/api/health"
}

output "ssh_command" {
  description = "VM 접속 명령"
  value       = "ssh ${var.admin_username}@${azurerm_public_ip.main.fqdn}"
}

output "bootstrap_log_command" {
  description = "첫 부팅 설치 · 빌드 진행 상황 보기"
  value       = "ssh ${var.admin_username}@${azurerm_public_ip.main.fqdn} 'cloud-init status --wait; tail -n 30 /var/log/cheongdo-bootstrap.log'"
}
