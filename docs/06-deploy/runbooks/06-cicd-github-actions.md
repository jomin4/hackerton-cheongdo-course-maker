# 런북 06 — CI/CD (GitHub Actions)

> **사용하지 않음 (2026-11-01 결정).** 이 프로젝트는 VM에서 소스를 빌드해 한 번 배포하고 마무리한다 (런북 04). 아래는 학습용 기록으로만 남긴다.

## 이번에 배울 것

| 개념 | 한 줄 정의 |
|---|---|
| CI | push마다 자동으로 설치 · 검사 · 테스트 |
| CD | 검사를 통과한 버전을 자동으로 운영에 반영 |
| GitHub Secrets | 워크플로에서만 읽을 수 있는 암호화된 값 |
| `GITHUB_TOKEN` | 워크플로가 자기 저장소의 GHCR에 푸시할 때 쓰는 자동 토큰 |

## 왜 하는가

런북 04의 수동 배포(빌드 → 푸시 → 서버 접속 → pull → up)를 **push 한 번**으로 바꾼다. 테스트가 실패하면 배포되지 않으므로 망가진 코드가 운영에 나가지 않는다.

## 설계

```
push(main) ─▶ ci: npm ci → lint → typecheck → test → build
                └▶ image: web·api 이미지 빌드 → GHCR 푸시 (SHA, latest)
                     └▶ deploy: SSH → compose 파일 동기화 → IMAGE_TAG=SHA → pull → up -d → health 확인
PR ─▶ ci 만 실행
```

## 실행

### 1. 배포 전용 SSH 키 만들기 (내 PC)

개인 로그인 키와 분리한다.

```powershell
ssh-keygen -t ed25519 -C "github-actions-deploy" -f $HOME\.ssh\cheongdo_deploy -N '""'
```

공개 키를 VM에 등록:

```powershell
type $HOME\.ssh\cheongdo_deploy.pub | ssh azureuser@<FQDN> "cat >> ~/.ssh/authorized_keys"
```

### 2. GitHub Secrets 등록

저장소 → Settings → Secrets and variables → Actions → **New repository secret**

| 이름 | 값 |
|---|---|
| `DEPLOY_HOST` | `<FQDN>` |
| `DEPLOY_USER` | `azureuser` |
| `DEPLOY_SSH_KEY` | `cheongdo_deploy` **개인 키** 파일 전체 내용 |
| `DEPLOY_KNOWN_HOSTS` | 내 PC에서 `ssh-keyscan <FQDN>` 출력 |

### 3. SSH 포트와 Actions 러너

GitHub 호스팅 러너의 IP는 고정되지 않고 범위가 넓다. 선택지:

| 방법 | 장점 | 단점 |
|---|---|---|
| A. 22번을 Internet에 열되 **키 인증만** 허용(비밀번호 로그인 비활성 — Azure Ubuntu 기본값) | 간단 | 무작위 접속 시도가 로그에 쌓임 |
| B. 배포 직전 워크플로에서 `az`로 러너 IP를 NSG에 추가 → 배포 후 삭제 | 22를 평소엔 닫아 둠 | Azure 자격 증명(OIDC 또는 서비스 주체) 설정 필요 |
| C. 자체 호스팅 러너를 VM에 설치 | SSH 불필요 | 운영할 것이 늘어남 |

이 런북은 **A로 시작**하고, 익숙해지면 B로 바꾸는 것을 과제로 둔다. A를 쓸 경우:

```bash
# VM에서 비밀번호 로그인이 꺼져 있는지 확인
sudo sshd -T | grep -E "passwordauthentication|permitrootlogin"
# passwordauthentication no, permitrootlogin no 이어야 함
```

```powershell
az network nsg rule update -g rg-cheongdo-course --nsg-name $NSG -n allow-ssh-myip --source-address-prefixes Internet
```

### 4. 워크플로 작성 (`.github/workflows/deploy.yml`)

직접 작성한다. 아래는 뼈대이며, 각 단계를 이해한 뒤 커밋할 것.

```yaml
name: ci-cd

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false

env:
  REGISTRY: ghcr.io
  OWNER: ${{ github.repository_owner }}

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build

  image:
    if: github.event_name == 'push'
    needs: ci
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    outputs:
      tag: ${{ steps.vars.outputs.tag }}
    steps:
      - uses: actions/checkout@v4
      - id: vars
        run: |
          echo "tag=$(git rev-parse --short HEAD)" >> "$GITHUB_OUTPUT"
          echo "owner=${OWNER,,}" >> "$GITHUB_OUTPUT"
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/api/Dockerfile
          push: true
          build-args: APP_VERSION=${{ steps.vars.outputs.tag }}
          tags: |
            ghcr.io/${{ steps.vars.outputs.owner }}/cheongdo-course-api:${{ steps.vars.outputs.tag }}
            ghcr.io/${{ steps.vars.outputs.owner }}/cheongdo-course-api:latest
          cache-from: type=gha,scope=api
          cache-to: type=gha,mode=max,scope=api
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/web/Dockerfile
          push: true
          tags: |
            ghcr.io/${{ steps.vars.outputs.owner }}/cheongdo-course-web:${{ steps.vars.outputs.tag }}
            ghcr.io/${{ steps.vars.outputs.owner }}/cheongdo-course-web:latest
          cache-from: type=gha,scope=web
          cache-to: type=gha,mode=max,scope=web

  deploy:
    needs: image
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: SSH 설정
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          echo "${{ secrets.DEPLOY_KNOWN_HOSTS }}" > ~/.ssh/known_hosts
      - name: compose · nginx 설정 동기화
        run: |
          scp infra/compose.yml ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }}:/opt/cheongdo-course/compose.yml
          scp infra/nginx/prod-https.conf ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }}:/opt/cheongdo-course/nginx/active.conf
      - name: 배포
        run: |
          ssh ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} "
            set -e
            cd /opt/cheongdo-course
            sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=${{ needs.image.outputs.tag }}/' .env
            docker compose pull
            docker compose up -d --remove-orphans
            docker image prune -f
          "
      - name: 헬스 체크
        run: |
          for i in $(seq 1 10); do
            if curl -fsS https://${{ secrets.DEPLOY_HOST }}/api/health | grep -q '"version":"${{ needs.image.outputs.tag }}"'; then
              echo "배포 확인"; exit 0
            fi
            sleep 6
          done
          echo "헬스 체크 실패"; exit 1
```

> 액션의 주요 버전(`@v4`, `@v6` 등)은 작성 시점의 각 액션 저장소 README에서 최신 버전을 확인한다.
> `prod-https.conf`에 FQDN을 직접 써 두었다면 그대로 동기화된다. 도메인을 바꿀 계획이면 템플릿화를 고려.

### 5. production 환경 보호 (선택)

저장소 → Settings → Environments → `production` → **Required reviewers**에 본인 추가 → 배포 직전 승인 버튼이 생긴다. 해커톤 연습 중에는 끄고, 실제 운영 감각을 익힐 때 켠다.

## 확인

1. 작은 변경(예: 푸터 문구)을 PR로 올림 → `ci`만 실행되는지
2. 머지 → `ci → image → deploy` 순서로 초록색
3. `https://<FQDN>/api/health`의 `version`이 머지 커밋 SHA와 같은지
4. 테스트를 일부러 깨뜨린 PR → `ci` 실패, 배포 안 됨

## 이해 점검

1. `GITHUB_TOKEN`과 개인 토큰(PAT)의 차이는? 왜 워크플로에서는 PAT가 필요 없나?
2. `concurrency`가 없으면 연속 머지 시 어떤 문제가 생길 수 있나?
3. 배포 키를 개인 키와 분리한 이유는? 유출되면 무엇을 해야 하나?
4. 헬스 체크에서 `version`까지 비교하는 이유는?

## 정리 · 비용

공개 저장소의 GitHub 호스팅 러너는 무료 범위가 넉넉하다. 비공개 저장소라면 월 사용 시간 한도를 확인한다.
