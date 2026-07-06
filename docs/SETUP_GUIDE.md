# 🙋 셋업 가이드 — 신건우가 직접 해야 하는 계정·키 발급

> 각 항목 완료 후 TODO_LIST.md에 체크. 발급한 키·URI는 **절대 git에 커밋하지 말고** Claude Code 대화에 직접 붙여넣거나 `backend/.env`(gitignore됨)에 저장.

## 1. Anthropic API 키 (Phase 2 전 필요)

1. https://console.anthropic.com 접속 → 가입/로그인
2. 좌측 **API Keys** → **Create Key** → 이름 `singunu-web` → 키 복사(한 번만 보임)
3. **Billing** → 결제수단 등록 → **Usage limits에서 월 한도 $5 설정** (비용 폭주 방지, 나중에 올리면 됨)
4. 예상 비용: Haiku + 프롬프트 캐싱 기준 대화 1건당 약 1~3원

## 2. GitHub 저장소 (Phase 0)

두 방법 중 택 1:
- **A(추천)**: 터미널에서 `gh auth login` 실행 후 Claude에게 "저장소 만들어줘" → 자동 생성
- **B**: github.com에서 직접 `singunu.com` 저장소 생성(Private 권장 — 페르소나 문서 포함이므로) → 저장소 URL 전달

## 3. MongoDB Atlas M0 무료 클러스터 (Phase 2 전 필요)

1. https://www.mongodb.com/cloud/atlas 가입 (Google 계정 연동 가능)
2. **Build a Database** → **M0 (Free)** 선택 → Provider: AWS, Region: **Seoul (ap-northeast-2)**
3. 클러스터 이름: `singunu-web`
4. **Database Access** → 사용자 생성 (username: `app`, 비밀번호 자동생성 → 복사)
5. **Network Access** → 일단 `0.0.0.0/0` 허용 (배포 후 서버 IP로 좁힘 — Phase 4에서 안내)
6. **Connect → Drivers** → 연결 문자열 복사 (`mongodb+srv://app:<password>@...`) → 전달

## 4. Gmail 앱 비밀번호 (Phase 2 전 필요 — 폴백 질문 메일 알림용)

1. https://myaccount.google.com/security → **2단계 인증** 켜기 (이미 켜져 있으면 통과)
2. https://myaccount.google.com/apppasswords → 앱 이름 `singunu-web` → **만들기**
3. 표시되는 16자리 비밀번호 복사 → 전달 (계정 비밀번호가 아님, 이 용도 전용)

## 5. Vercel (Phase 4 전 필요)

1. https://vercel.com → **Sign up with GitHub**
2. 저장소 연결은 Phase 4에서 함께 진행 (Root Directory를 `frontend/`로 지정할 예정)

## 6. AWS 또는 Lightsail (Phase 4 전 필요 — 백엔드 서버)

- 추천: **Lightsail** (https://lightsail.aws.amazon.com) — $5/월 고정, 과금 예측 가능
  - 인스턴스 생성: Seoul 리전, **Linux/Ubuntu 24.04**, $5 플랜(1GB RAM) → 생성 후 고정 IP(Static IP) 연결
- 대안: EC2 t4g.small — AWS 크레딧/프리티어 있으면 이쪽
- 생성 후 SSH 키 다운로드 → Phase 4에서 배포 설정 함께 진행
- **AWS Budgets에서 월 $10 알람 설정** (Billing → Budgets → Create budget)

## 7. 가비아 DNS (Phase 4에서, 서버 IP 확보 후)

미리 할 것 없음. Phase 4에서 아래를 함께 설정할 예정:
- `@` (singunu.com) → CNAME/A → Vercel
- `www` → CNAME → Vercel
- `api` → A 레코드 → 백엔드 서버 고정 IP
