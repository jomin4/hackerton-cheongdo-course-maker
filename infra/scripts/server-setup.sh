#!/usr/bin/env bash
# Azure VM(Ubuntu 24.04) 초기 설정 — 런북 03의 2~5단계 + VM에서 빌드하기 위한 스왑.
# 사용: bash infra/scripts/server-setup.sh   (sudo 권한이 있는 일반 사용자로 실행)
set -euo pipefail

echo "[1/6] 패키지 업데이트 · 자동 보안 업데이트 · 시간대"
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo apt-get install -y unattended-upgrades git ca-certificates curl
sudo timedatectl set-timezone Asia/Seoul

echo "[2/6] Docker 공식 apt 저장소"
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

echo "[3/6] Docker 설치"
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"

echo "[4/6] 컨테이너 로그 크기 제한"
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF
sudo systemctl restart docker

echo "[5/6] 스왑 2GB (메모리 1GiB VM에서 npm 설치 · 빌드가 멈추지 않게)"
if ! swapon --show | grep -q '/swapfile'; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab > /dev/null
fi

echo "[6/6] 배포 폴더"
sudo mkdir -p /opt/cheongdo-course
sudo chown "$USER":"$USER" /opt/cheongdo-course

echo "완료. docker 그룹 적용을 위해 exit 후 다시 ssh 접속하세요."
