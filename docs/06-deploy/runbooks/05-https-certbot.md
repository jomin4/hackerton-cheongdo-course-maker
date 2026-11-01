# 런북 05 — HTTPS (Let's Encrypt · certbot)

> **선택 단계.** 이번 배포는 HTTP(런북 04)로 마무리한다. 이 런북은 GHCR 이미지를 쓰던 예전 운영 compose 기준으로 쓰여 있으므로, 진행하려면 `infra/compose.yml`(VM에서 빌드)에 맞게 2 · 4단계를 고친 뒤 따라 한다 (Claude에게 요청).

## 이번에 배울 것

| 개념 | 한 줄 정의 |
|---|---|
| TLS 인증서 | 브라우저가 "이 도메인이 맞다"고 확인하고 암호화하는 근거 |
| Let's Encrypt | 무료 자동 인증 기관. 인증서 유효기간이 짧아 **자동 갱신**이 필수 |
| HTTP-01 챌린지 | `http://도메인/.well-known/acme-challenge/...`에 파일을 올려 도메인 소유를 증명 |
| TLS 종료 | nginx가 HTTPS를 풀고, 내부(api)와는 HTTP로 통신 |

MS Learn 연결: 네트워킹 서비스(DNS, 공용 엔드포인트) · ID · 액세스 · 보안(전송 중 암호화)

## 왜 하는가

HTTPS가 없으면 브라우저가 경고를 띄우고, 클립보드 API(`링크 복사`) 같은 기능이 제한될 수 있다. 프로덕션 웹의 기본 조건이다.

## 방식

- certbot은 **VM 호스트**에 설치, `--webroot` 방식.
- nginx 컨테이너는 호스트의 `/var/www/certbot`(챌린지 파일)과 `/etc/letsencrypt`(인증서)를 읽기 전용으로 마운트.
- 갱신 시 nginx를 멈추지 않는다(무중단).

## 실행

### 1. 운영 nginx 설정 파일 2개 (저장소 `infra/nginx/`)

이미지 안의 `default.conf`(HTTP 전용)는 그대로 두고, 운영에서는 아래 파일을 마운트해 덮어쓴다.

**`infra/nginx/prod-http.conf`** — 인증서 발급 전 1단계

```nginx
server {
    listen 80;
    server_name _;
    server_tokens off;

    location /.well-known/acme-challenge/ { root /var/www/certbot; }

    location /api/ {
        proxy_pass http://api:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    root /usr/share/nginx/html;
    location / { try_files $uri $uri/ /index.html; }
}
```

**`infra/nginx/prod-https.conf`** — 발급 후 최종 (`<FQDN>`을 실제 값으로)

```nginx
server {
    listen 80;
    server_name <FQDN>;
    server_tokens off;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl;
    http2 on;
    server_name <FQDN>;
    server_tokens off;

    ssl_certificate     /etc/letsencrypt/live/<FQDN>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<FQDN>/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;

    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header X-Frame-Options DENY always;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    root /usr/share/nginx/html;

    location /api/ {
        proxy_pass http://api:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 10s;
    }

    # location 안에서 add_header를 쓰면 server 수준 헤더가 상속되지 않으므로 보안 헤더를 다시 적는다
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header Strict-Transport-Security "max-age=31536000" always;
        add_header X-Content-Type-Options nosniff always;
        try_files $uri =404;
    }

    location / {
        add_header Cache-Control "no-cache";
        add_header Strict-Transport-Security "max-age=31536000" always;
        add_header X-Content-Type-Options nosniff always;
        add_header Referrer-Policy strict-origin-when-cross-origin always;
        add_header X-Frame-Options DENY always;
        try_files $uri $uri/ /index.html;
    }
}
```

> `http2 on;`은 nginx 1.25.1 이상 문법이다. 오래된 nginx라면 `listen 443 ssl http2;`로 쓴다.
> nginx 규칙: `location` 안에 `add_header`가 하나라도 있으면 바깥(server) 수준의 `add_header`는 그 location에 상속되지 않는다. 그래서 `/assets/`와 `/`에 보안 헤더를 다시 적었다. 확인 단계에서 `curl -I`로 실제 응답을 점검한다.

### 2. 운영 compose에 마운트 추가 (`infra/compose.yml`의 web)

```yaml
  web:
    image: ghcr.io/${GHCR_OWNER}/cheongdo-course-web:${IMAGE_TAG:-latest}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/active.conf:/etc/nginx/conf.d/default.conf:ro
      - /var/www/certbot:/var/www/certbot:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      api:
        condition: service_healthy
    restart: unless-stopped
```

### 3. 1단계 — HTTP 설정으로 실행 (VM)

```powershell
# 내 PC에서
scp infra/compose.yml infra/nginx/prod-http.conf infra/nginx/prod-https.conf azureuser@<FQDN>:/opt/cheongdo-course/
```

```bash
# VM에서
cd /opt/cheongdo-course
mkdir -p nginx && mv prod-*.conf nginx/
cp nginx/prod-http.conf nginx/active.conf
sudo mkdir -p /var/www/certbot
docker compose up -d
curl -I http://localhost/
```

### 4. 인증서 발급

```bash
sudo apt install -y certbot
sudo certbot certonly --webroot -w /var/www/certbot \
  -d <FQDN> --email <본인 이메일> --agree-tos --no-eff-email
```

성공하면 `/etc/letsencrypt/live/<FQDN>/`에 `fullchain.pem`, `privkey.pem`이 생긴다.

### 5. 2단계 — HTTPS 설정으로 전환

```bash
cp nginx/prod-https.conf nginx/active.conf
docker compose exec web nginx -t      # 설정 문법 검사
docker compose exec web nginx -s reload
```

### 6. 자동 갱신

```bash
sudo certbot renew --dry-run
```

갱신 후 nginx가 새 인증서를 읽도록 훅 등록:

```bash
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh > /dev/null <<'EOF'
#!/bin/sh
cd /opt/cheongdo-course && docker compose exec -T web nginx -s reload
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
systemctl list-timers | grep certbot     # 자동 갱신 타이머 확인
```

## 확인

- 브라우저 `https://<FQDN>` → 자물쇠 표시, 인증서 발급자 Let's Encrypt
- `http://<FQDN>` → `https://`로 이동
- ```powershell
  curl.exe -I https://<FQDN>/
  curl.exe -I https://<FQDN>/assets/<파일>.js
  ```
  `strict-transport-security`, `x-content-type-options` 헤더, assets의 `immutable` 확인
- 홈 → 코스 결과 → "링크 복사" 동작

## 이해 점검

1. 인증서 발급 전에 HTTPS 설정을 먼저 넣으면 왜 nginx가 시작하지 않나? (그래서 2단계로 나눔)
2. HTTP-01 챌린지가 성공하려면 NSG에서 어떤 포트가 열려 있어야 하나?
3. HSTS를 켠 뒤 HTTPS가 깨지면 사용자에게 어떤 일이 생기나? (그래서 HTTPS 확인 후에 켬)
4. 인증서 갱신이 실패하면 언제 알게 되나? 어떻게 미리 알 수 있을까?

## 정리 · 비용

추가 비용 없음. Let's Encrypt 발급 횟수 제한이 있으므로 실험할 때는 `--dry-run` 또는 `--staging`을 먼저 쓴다.
