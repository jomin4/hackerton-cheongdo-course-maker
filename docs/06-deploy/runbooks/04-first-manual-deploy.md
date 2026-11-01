# 런북 04 — 소스 배포 (HTTP)

## 이번에 배울 것

| 개념 | 한 줄 정의 |
|---|---|
| 서버에서 빌드 | 저장소 소스를 VM에 받아 그 자리에서 Docker 이미지를 만들고 실행하는 방식 |
| 운영 compose | `infra/compose.yml` — 로컬 리허설(`compose.local.yml`)과 같은 빌드에 80번 포트 · 버전 표시만 다르다 |
| 스왑 | 메모리가 모자랄 때 디스크를 임시 메모리로 쓰는 공간. 1GiB VM에서 빌드할 때 필요 |

MS Learn 연결: 컴퓨팅 서비스 › 컨테이너 (VM과 컨테이너의 차이)

## 왜 하는가

이 프로젝트는 레지스트리 · CI/CD 없이 **한 번 배포하고 마무리**한다. 공개 저장소라 VM에서 `git clone`만 하면 소스를 받을 수 있고, 로컬에서 리허설한 그 Dockerfile 그대로 VM에서 빌드한다.

선행: 런북 03 완료(SSH 접속, Docker 설치, 스왑). `infra/scripts/server-setup.sh`를 썼다면 스왑까지 되어 있다.

## 실행 (모두 VM에서)

### 1. 스왑 확인

```bash
swapon --show          # /swapfile 2G 가 보이면 OK
free -h
```

없으면 (`server-setup.sh`를 안 썼을 때):

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. 소스 받기

```bash
cd /opt/cheongdo-course
git clone https://github.com/jomin4/hackerton-cheongdo-course-maker.git app
cd app
git log --oneline -1          # 배포할 커밋 확인
```

### 3. 빌드 · 실행

```bash
APP_VERSION=$(git rev-parse --short HEAD) docker compose -f infra/compose.yml up -d --build
```

- 처음에는 npm 설치 · 빌드로 몇 분 걸린다 (Standard_B1s 기준 5~10분). 빌드 중 `docker stats`가 안 보여도 정상.
- `APP_VERSION`은 `/api/health`의 `version`으로 나온다 → 어떤 커밋이 떠 있는지 바로 확인할 수 있다.

### 4. 상태 확인

```bash
docker compose -f infra/compose.yml ps          # api · web 둘 다 healthy
curl -s http://localhost/api/health              # {"status":"ok","version":"<커밋>","spots":43,...}
```

## 확인 (내 PC 브라우저)

| 확인 | 주소 | 기대 |
|---|---|---|
| 홈 | `http://<FQDN>/` | 방문 날짜 · 시작 · 끝 입력이 있는 홈 |
| 결과 (새로고침 포함) | `http://<FQDN>/course?date=2026-11-07&start=10:00&end=21:00&with=couple&tags=history,photo` | 저녁 뒤 청도 프로방스까지 있는 하루 일정, F5 해도 화면 유지 |
| 상세 (새로고침 포함) | `http://<FQDN>/spots/eupseong` | 사진 · 운영시간 · 카카오맵 링크 |
| 400 | `http://<FQDN>/course?hours=4&with=family&tags=nature` | "방문 날짜가 올바르지 않아요." 화면 |
| 404 | `http://<FQDN>/spots/nope` | "찾는 장소가 없어요" |
| 모바일 | 휴대폰으로 `http://<FQDN>/` | 가로 스크롤 없음 |

`<FQDN>`은 런북 02의 DNS 이름(`cheongdo-course-xx.koreacentral.cloudapp.azure.com`) 또는 공용 IP.

## 다시 배포 (코드를 고쳤을 때)

```bash
cd /opt/cheongdo-course/app
git pull
APP_VERSION=$(git rev-parse --short HEAD) docker compose -f infra/compose.yml up -d --build
docker image prune -f        # 이전 빌드에서 남은 이미지 정리
```

## 이해 점검

1. `compose.local.yml`과 `compose.yml`의 차이 2가지는? (포트, 버전 빌드 인자)
2. 레지스트리를 쓰지 않고 서버에서 빌드할 때의 장점과 단점은? (단순함 ↔ 서버 자원 · 빌드 시간)
3. 1GiB VM에서 스왑 없이 빌드하면 어떤 일이 생길 수 있나?
4. `restart: unless-stopped`는 VM이 재부팅되면 어떻게 동작하나? (직접 `sudo reboot` 후 `docker compose -f infra/compose.yml ps`로 확인)

## 정리 · 비용

지금은 HTTP라 주소창에 "주의 요함"이 뜬다. 실습을 멈출 땐 `az vm deallocate` — 다시 켜면 컨테이너가 자동으로 다시 뜬다.
