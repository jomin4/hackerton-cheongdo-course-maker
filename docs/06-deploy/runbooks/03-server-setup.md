# 런북 03 — 서버 초기 설정 (SSH · 업데이트 · Docker)

## 이번에 배울 것

| 개념 | 한 줄 정의 | MS Learn |
|---|---|---|
| 공동 책임 모델 | IaaS에서 OS 패치 · 보안 설정은 사용자 책임 | 클라우드 개념 › 클라우드 컴퓨팅 설명 |
| SSH 키 인증 | 비밀번호 대신 공개키 · 개인키 쌍으로 로그인 | ID · 액세스 · 보안 |
| 최소 권한 | 필요한 권한만 주기 (root 직접 로그인 금지) | ID · 액세스 · 보안 |

## 왜 하는가

새 VM은 업데이트되지 않은 상태다. 보안 업데이트를 적용하고, 컨테이너를 실행할 Docker를 설치해야 이후 배포가 가능하다. 이 과정은 해커톤 당일에도 반복될 수 있으므로 마지막에 **스크립트로 만든다**.

## 실행

### 1. SSH 접속

```powershell
ssh azureuser@cheongdo-course-<이니셜>.koreacentral.cloudapp.azure.com
```

처음 접속 시 호스트 지문 확인 질문에 `yes`. 접속되면 프롬프트가 `azureuser@vm-cheongdo-course:~$`로 바뀐다.

> Windows에서 `Permission denied (publickey)` → VM 생성 때 쓴 개인 키 경로를 `-i ~/.ssh/id_rsa`로 지정.

### 2. 시스템 업데이트 · 기본 설정

```bash
sudo apt update && sudo apt upgrade -y
sudo timedatectl set-timezone Asia/Seoul
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades   # 보안 업데이트 자동 적용 (Yes)
```

### 3. Docker 설치 (공식 apt 저장소)

```bash
# 저장소 키 · 주소 등록
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 설치
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# sudo 없이 docker 사용 (재접속 후 적용)
sudo usermod -aG docker $USER
```

설치 방법은 바뀔 수 있으므로 오류가 나면 Docker 공식 문서 "Install Docker Engine on Ubuntu"를 기준으로 한다.

### 4. 로그 크기 제한

컨테이너 로그가 디스크를 채우지 않도록:

```bash
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF
sudo systemctl restart docker
```

### 5. 배포 폴더

```bash
sudo mkdir -p /opt/cheongdo-course
sudo chown $USER:$USER /opt/cheongdo-course
```

### 6. 스크립트로 만들기

위 2~5단계에 **스왑 2GB**(VM에서 빌드할 때 필요)를 더한 것이 저장소의 [`infra/scripts/server-setup.sh`](../../../infra/scripts/server-setup.sh)다. 위 단계를 손으로 하지 않고 이 스크립트로 한 번에 해도 된다:

```bash
curl -fsSL https://raw.githubusercontent.com/jomin4/hackerton-cheongdo-course-maker/main/infra/scripts/server-setup.sh -o setup.sh
less setup.sh   # 내용 확인 후
bash setup.sh
```

## 확인

재접속(`exit` 후 다시 `ssh`) 후:

```bash
docker version
docker compose version
docker run --rm hello-world
timedatectl | grep "Time zone"
df -h /
```

- `hello-world` 메시지가 나오면 Docker 정상
- 시간대 `Asia/Seoul`

## 이해 점검

1. 개인 키와 공개 키는 각각 어디에 있나? 개인 키가 유출되면 무엇을 해야 하나?
2. `usermod -aG docker`의 의미와 보안상 주의점은? (docker 그룹 ≈ root 권한)
3. `unattended-upgrades`가 없으면 누가 보안 패치를 하나?

## 정리 · 비용

실습을 멈출 땐 `az vm deallocate`. 설치한 내용은 디스크에 남아 다음에 그대로 쓴다.
