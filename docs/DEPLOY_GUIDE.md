# 🚀 배포 가이드 (Phase 4) — 신건우가 직접 하는 단계

> 이 문서는 **🙋 사용자가 직접** 해야 하는 화면별 순서다. 코드·설정 파일(워크플로·Nginx·배포 스크립트)은 이미 만들어져 있으니(`infra/`, `.github/workflows/backend.yml`), 여기서는 계정·서버·DNS·시크릿만 채우면 된다.
> 
> **원칙**: 시크릿(키·비밀번호·URI)은 절대 git 에 커밋하지 않는다. 서버의 `/opt/singunu/.env` 와 GitHub Actions Secrets 에만 넣는다.
> 
> 전체 배포 구조: `Vercel(프론트)` + `Lightsail(백엔드 Docker)` + `MongoDB Atlas M0` + `GitHub Actions(CI/CD)`. 프론트는 `singunu.com`, API 는 `api.singunu.com`.

배포 순서 한눈에: **① 서버 만들기 → ② 서버 세팅 → ③ DNS → ④ HTTPS 인증서 → ⑤ 시크릿 등록 → ⑥ 첫 배포 → ⑦ Vercel 프론트 → ⑧ 비용 알람 → ⑨ Atlas 보안 좁히기**

---

## ① AWS Lightsail 인스턴스 생성 · 고정 IP

*왜: 백엔드 Docker 컨테이너를 24시간 돌릴 저렴하고 과금이 예측되는($5 고정) 서버가 필요하다.*

1. https://lightsail.aws.amazon.com 접속 → **Create instance**
2. **Region**: `Seoul (ap-northeast-2)` 선택 *(왜: 방문자·Atlas 서울 리전과 가까워 지연 최소)*
3. **Platform**: Linux/Unix → **Blueprint**: `OS Only` → **Ubuntu 24.04 LTS**
4. **Instance plan**: 월 **$5** (1GB RAM, 2 vCPU) 선택 *(왜: Spring Boot 1개 컨테이너에 충분. 부족하면 나중에 상향)*
5. 인스턴스 이름 `singunu-api` → **Create instance**
6. 생성 후 **Networking → Create static IP** → 방금 만든 인스턴스에 연결
   *(왜: 재부팅해도 IP 가 안 바뀌어야 DNS·Atlas 화이트리스트가 유지된다)* → **이 고정 IP 를 메모** (예: `13.125.x.x`)
7. **Networking → IPv4 Firewall** 에서 포트 열기: `22(SSH)`, `80(HTTP)`, `443(HTTPS)` 추가
   *(왜: HTTP/HTTPS 로 API 를 받고, 인증서 발급도 80 이 열려야 한다. 8080 은 열지 않는다 — Nginx 만 내부 접근)*
8. **Download SSH key**: 콘솔 우상단 계정 → **Account → SSH keys → Download default key** (`.pem`)
   *(왜: GitHub Actions 가 이 개인키로 서버에 접속해 자동 배포한다)*

---

## ② 서버에 Docker · Nginx · Compose 설치 + 파일 배치

*왜: 이미지를 실행할 런타임(Docker)과, HTTPS·SSE 프록시(Nginx)가 서버에 있어야 한다.*

Lightsail 콘솔의 **Connect using SSH**(브라우저 터미널) 또는 로컬에서 `ssh -i default.pem ubuntu@3.34.233.28` 로 접속 후:

```bash
# Docker + compose plugin 설치
sudo apt update && sudo apt install -y docker.io docker-compose-v2 nginx curl
sudo usermod -aG docker $USER      # 이후 sudo 없이 docker 사용 (재접속 후 적용)

# 배포 파일 둘 폴더
sudo mkdir -p /opt/singunu /var/www/certbot
sudo chown -R $USER:$USER /opt/singunu
```

이 저장소의 `infra/deploy.sh` 를 서버 `/opt/singunu/deploy.sh` 로 올린다(로컬에서):

```bash
scp -i default.pem infra/deploy.sh ubuntu@3.34.233.28:/opt/singunu/deploy.sh
# (선택) 수동 compose 를 쓸 거면 docker-compose.prod.yml 도 함께
scp -i default.pem infra/docker-compose.prod.yml ubuntu@3.34.233.28:/opt/singunu/
```

서버에서 실행 권한 + 운영 환경변수 파일 작성:

```bash
chmod +x /opt/singunu/deploy.sh
nano /opt/singunu/.env      # infra/.env.prod.example 내용을 붙여넣고 실제 값 입력
```

`.env` 채울 값 (`infra/.env.prod.example` 참고):
`ANTHROPIC_API_KEY`, `MONGODB_URI`(Atlas), `MAIL_USERNAME`, `MAIL_APP_PASSWORD`, `ADMIN_EMAIL`, `DAILY_BUDGET_USD`, `ALLOWED_ORIGIN=https://singunu.com`, `CLAUDE_MODEL`
*(왜: 시크릿을 이미지에 굽지 않고 런타임 주입 → 유출·재빌드 위험 감소)*

> **deploy.sh / compose / nginx.conf 안의 `OWNER` 를 본인 GitHub 소유자명(소문자)으로 바꾸는 것 잊지 말 것.**

Nginx 설정 배치:

```bash
scp -i default.pem infra/nginx.conf ubuntu@3.34.233.28:/tmp/nginx.conf
# 서버에서:
sudo mv /tmp/nginx.conf /etc/nginx/sites-available/api.singunu.com
sudo ln -s /etc/nginx/sites-available/api.singunu.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default   # 기본 사이트 제거
```

> ⚠️ 지금은 인증서가 없어 443 블록 때문에 `nginx -t` 가 실패한다. **④에서 certbot 발급 후** reload 한다. (급하면 443 `server{}` 블록을 잠시 주석 처리하고 80만 올린 뒤, 발급 후 되살려도 된다.)

---

## ③ 가비아 DNS 설정

*왜: `api.singunu.com` 을 우리 서버로, `singunu.com`·`www` 를 Vercel 로 향하게 해야 방문자가 접속한다.*

가비아 → **My가비아 → 도메인 → DNS 관리 → 레코드 수정**:

| 타입    | 호스트   | 값                      | 용도                                       |
| ----- | ----- | ---------------------- | ---------------------------------------- |
| A     | `api` | `<Lightsail 고정 IP>`    | 백엔드 API 서버                               |
| A     | `@`   | `76.76.21.21`          | Vercel 프론트 (⑦에서 Vercel 이 안내하는 최신 값으로 확인) |
| CNAME | `www` | `cname.vercel-dns.com` | Vercel 프론트                               |

*(왜: `api` 만 우리 서버(A레코드), 나머지는 Vercel 이 관리. `@`·`www` 실제 값은 ⑦ Vercel 대시보드가 표시하는 값을 따른다 — 위 값은 일반적 예시)*
전파 확인: `nslookup api.singunu.com` 이 고정 IP 로 나오면 OK (수 분~수십 분 소요).

---

## ④ HTTPS 인증서 발급 (Let's Encrypt / certbot)

*왜: 브라우저가 API 를 HTTPS 로만 신뢰하고, 프론트(https)에서 http API 호출은 차단된다.*

`api.singunu.com` DNS 가 서버로 전파된 뒤, 서버에서:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.singunu.com --agree-tos -m singunu17@gmail.com --no-eff-email
```

*(왜: `--nginx` 플러그인이 인증서를 받아 `nginx.conf` 의 443 경로에 자동 연결해 준다)*
발급 후:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

갱신은 certbot 이 자동(타이머)으로 처리한다. 확인: 브라우저에서 `https://api.singunu.com/api/health` → `{"status":"ok"}` (아직 컨테이너 실행 전이면 502 — ⑥ 이후 정상).

---

## ⑤ GitHub Actions Secrets 등록

*왜: 워크플로가 서버에 SSH 로 붙어 자동 배포하려면 접속 정보가 필요하다.*

GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret** 에 아래 등록:

| Secret 이름  | 값                         | 비고                                   |
| ---------- | ------------------------- | ------------------------------------ |
| `SSH_HOST` | Lightsail 고정 IP           |                                      |
| `SSH_USER` | `ubuntu`                  | Lightsail Ubuntu 기본 계정               |
| `SSH_KEY`  | 다운로드한 `.pem` **파일 전체 내용** | `-----BEGIN ... KEY-----` 부터 끝까지 그대로 |

> 나머지 시크릿(`ANTHROPIC_API_KEY`, `MONGODB_URI`, `MAIL_USERNAME`, `MAIL_APP_PASSWORD`, `ADMIN_EMAIL`)은 **서버 `/opt/singunu/.env`** 에 두므로 워크플로 동작엔 필수가 아니다. 백업·기록용으로 Secrets 에도 넣어두면 좋다.

또한 `.github/workflows/backend.yml`, `infra/deploy.sh`, `infra/docker-compose.prod.yml`, `infra/nginx.conf` 안의 **`OWNER`** 를 본인 GitHub 소유자명(소문자)으로 교체 후 커밋.

> GHCR 패키지 접근: 워크플로가 처음 push 하면 패키지가 **private** 으로 생긴다. 서버가 pull 하려면 두 가지 중 하나:
> 
> - (간단) GitHub → 패키지 → **Package settings → Change visibility → Public** *(왜: 이미지엔 시크릿을 안 굽으므로 public 이어도 안전 — 시크릿은 .env 런타임 주입)*
> - (유지) 서버에서 `echo <읽기용 PAT> | docker login ghcr.io -u <사용자명> --password-stdin` 한 번 실행

---

## ⑥ 첫 배포

*왜: 자동 파이프라인이 실제로 도는지 확인하고 API 를 띄운다.*

- `backend/` 나 `persona/` 를 수정해 `main` 에 push → **Actions** 탭에서 `test → build → deploy` 초록불 확인.
- 또는 서버에서 수동으로 한 번:
  
  ```bash
  # GHCR 이미지가 올라온 뒤
  bash /opt/singunu/deploy.sh ghcr.io/<소유자명>/singunu-api:latest
  ```
- 확인: `curl https://api.singunu.com/api/health` → `{"status":"ok"}`
  *(deploy.sh 가 자동으로 헬스체크 폴링하며, 실패 시 롤백 명령을 출력한다)*

---

## ⑦ Vercel 프론트 연결

*왜: `singunu.com` 프론트를 무료로 자동 배포하고 API 와 이어붙인다.*

1. https://vercel.com → **Add New → Project** → GitHub 저장소 선택
2. **Root Directory** 를 `frontend/` 로 지정 *(왜: 모노레포라 프론트 폴더만 빌드)*
3. **Environment Variables**: 프론트가 API 를 부르는 주소 `NEXT_PUBLIC_API_BASE=https://api.singunu.com` 등록
4. **Deploy** → 성공 후 **Settings → Domains** 에서 `singunu.com`, `www.singunu.com` 추가 → Vercel 이 표시하는 DNS 값으로 ③의 `@`·`www` 레코드를 맞춘다.
5. 확인: `https://singunu.com` 접속 → 챗에서 질문 → API(`api.singunu.com`)로 스트리밍 응답이 오면 성공.

---

## ⑧ 비용 알람 (AWS Budget 월 $10)

*왜: 트래픽·실수로 인한 과금 폭주를 조기에 잡는다.*

1. AWS 콘솔 → **Billing and Cost Management → Budgets → Create budget**
2. **Cost budget** → 월 예산 **$10** → 알림 임계값 **80% / 100%** → 이메일 `singunu17@gmail.com`
3. (별도) Anthropic Console → **Billing → Usage limits** 에서 월 한도(예 $5)도 재확인
   *(왜: LLM 비용과 서버 비용은 청구 주체가 달라 각각 상한을 걸어야 한다)*

---

## ⑨ MongoDB Atlas Network Access 좁히기

*왜: 셋업 때 `0.0.0.0/0`(전체 허용)로 열어뒀다면, DB 가 인터넷 전체에 노출된 상태다. 서버 IP 만 허용해야 안전하다.*

1. Atlas → 클러스터 → **Network Access → IP Access List**
2. 기존 `0.0.0.0/0` 항목 **삭제** → **Add IP Address** 에 **Lightsail 고정 IP**만 추가 (`<고정IP>/32`)
   *(왜: 오직 우리 백엔드 서버에서만 DB 접속 가능하도록 축소)*
3. 확인: 서버에서 API 가 여전히 정상(폴백 저장·조회)인지 `https://api.singunu.com/api/health` 및 실제 대화로 검증.

---

## 배포 후 최종 점검 체크리스트

- [ ] `https://api.singunu.com/api/health` → `{"status":"ok"}`
- [ ] `https://singunu.com` 에서 챗 스트리밍 정상 (SSE 끊김 없음)
- [ ] 폴백 질문 → Atlas 저장 + `singunu17@gmail.com` 메일 수신
- [ ] Atlas Network Access 가 서버 IP `/32` 로 좁혀짐
- [ ] AWS Budget $10 + Anthropic 월 한도 설정됨
- [ ] `.env`·`.pem`·키가 git 에 커밋되지 않았는지 재확인
