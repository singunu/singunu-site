# singunu.com — AI Q&A 홈페이지 TODO

> 🙋 = 내가(신건우) 직접 해야 하는 일 · 🤖 = Claude Code가 자동 진행
> 전체 계획: `docs/PLAN.md` · 파트별 에이전트 분리 운영: `docs/AGENTS.md`. 각 단계 완료 시 이 파일을 갱신한다.

## Phase 0 — 셋업

- [x] 🤖 프로젝트 디렉토리·모노레포 구조 생성 (`frontend/ backend/ infra/ persona/ docs/`)
- [x] 🤖 git 저장소 초기화, TODO_LIST.md·README·.gitignore 생성
- [ ] 🙋 GitHub 저장소 생성 후 remote 연결 (또는 `gh auth login` 해주면 🤖가 생성)
  https://github.com/singunu/singunu-site.git
- [x] 🙋 Anthropic API 키 발급 → https://console.anthropic.com (Billing에서 월 지출 한도 설정 권장: $5)

## Phase 1 — 페르소나 데이터 파이프라인

- [x] 🤖 `me/` 볼트 → `persona/public_persona.md` 공개용 큐레이션 초안 생성
- [x] 🤖 민감정보 제외 체크리스트 작성 (`persona/REVIEW_CHECKLIST.md`)
- [x] 🙋 **공개 범위 최종 검수** — `persona/public_persona.md`를 읽고 빼고 싶은 내용 삭제/수정 (반드시 사람이!)
- [x] 🤖 검수 반영 후 확정본 동결

## Phase 2 — 백엔드 (Spring Boot 3, Java 17*)

> *로컬에 JDK 17이 설치되어 있어 21 대신 17(LTS)로 맞춤 — Spring Boot 3 완전 호환

- [x] 🤖 프로젝트 스캐폴드 + `/api/chat` (SSE 스트리밍, Claude API 연동, 프롬프트 캐싱)
- [x] 🤖 가드레일 5레이어 (입력필터 → 시스템프롬프트 → 출력검열 → 확신도 라우팅 → 레이트리밋/지출상한)
- [x] 🤖 `/api/fallback` (질문+대화이력+연락처 저장 + 메일 발송 + 허니팟)
- [x] 🤖 MongoDB 연동, 단위 테스트, Dockerfile, docker-compose(로컬 개발용)
- [x] 🤖 Docker 컨테이너에서 빌드·테스트 통과 확인 (BUILD SUCCESSFUL)
- [ ] 🙋 `backend/.env`의 `ANTHROPIC_API_KEY=` 자리에 발급받은 키 붙여넣기
- [ ] 🙋 MongoDB Atlas M0 무료 클러스터 생성 → 접속 URI 전달 (가이드: `docs/SETUP_GUIDE.md`) — 로컬 개발은 docker compose의 Mongo로 충분, 배포 전까지만 하면 됨
- [x] 🙋 Gmail 앱 비밀번호 발급 → `backend/.env`로 이동 완료 (⚠️ 비밀번호·키는 이 파일이 아니라 .env에만 — 이 파일은 GitHub에 올라감)

## Phase 3 — 프론트엔드 (Next.js + Vercel)

- [x] 🤖 디자인 프로토타입 제작 — `frontend/prototypes/` a~l 12안 (터미널/람스/에디토리얼/브루탈/글래스/캄/Y2K/spatial 3D/클레이/리퀴드 + 클레이버디)
- [x] 🙋 디자인 시안 선택 + 피드백 — **L안 (클레이모피즘 + 젤리 물리 마스코트) 확정**
- [x] 🤖 Next.js 구현: 챗 UI(SSE 스트리밍), 추천 질문 칩, 폴백 모달(허니팟), 다크/라이트, OG/SEO, 마스코트(잡아늘이기·홍조·눈썹 표정·1000멘트·쓰다듬기·분노 이스터에그·상태연동·헤더 도킹), OG 이미지·파비콘 — 빌드 통과 (First Load 101kB)
- [ ] 🙋 히어로 문구·추천 질문·프로필 사진(선택) 확정 — 현재 기본값으로 구현됨, 수정 원하면 요청

## Phase 4 — 인프라·배포

- [x] 🙋 AWS Lightsail $5 인스턴스 생성 — 백엔드 가동 중 (api.singunu.com)
- [x] 🙋 Vercel 계정 생성 + GitHub 저장소 연결 — 프로젝트 singunu-site, Root=frontend, NEXT_PUBLIC_API_BASE 설정
- [x] 🤖 Dockerfile, GitHub Actions 워크플로, Nginx + Let's Encrypt(HTTPS), 배포 스크립트 (`.github/workflows/backend.yml`, `infra/nginx.conf`, `infra/deploy.sh`, `infra/docker-compose.prod.yml`, `infra/.env.prod.example`, 가이드: `docs/DEPLOY_GUIDE.md`)
- [x] 🙋 가비아 DNS 설정 — A `api`→Lightsail IP, A `@`→76.76.21.21(Vercel 신규 IP 216.198.79.1은 국내에서 연결 불가라 구형 IP 사용), CNAME `www`→cname.vercel-dns.com. 대표 주소는 www.singunu.com(apex는 308 리다이렉트). 서버 ALLOWED_ORIGIN에 singunu.com·www·vercel.app 3개 등록, 재배포는 deploy.sh 사용(compose 아님)
- [ ] 🙋 AWS Budget 비용 알람 + Anthropic 지출 한도 확인

## Phase 5.5 — 페르소나 품질 (대화 퀄리티, 계획: `docs/PERSONA_QUALITY_PLAN.md`)

- [ ] 🤖 답변 마크다운(`**` 등) 제거 — 시스템 프롬프트 규칙 + 프론트/서버 스트립
- [ ] 🤖 `public_persona.md` 시점 분리 — `[현재 상태 — 기준일]` 섹션 신설, 상대 표현 제거, "기준일 이후는 폴백 유도" 지침
- [ ] 🙋 먹거리·카페·음식점 취향 원본을 `me/` 볼트에 작성 (상호 공개 수위 결정 포함)
- [ ] 🤖 취향 큐레이션 → `public_persona.md` 반영 → 🙋 검수 → 서버 재배포
- [ ] 🤖 대화 로그(Atlas) 리뷰 1회전 — 폴백/차단 질문 추출 → 페르소나 갭 보강
- [ ] 🙋 (반복) 상태 변화 시·분기 1회 `[현재 상태]` 기준일 갱신

## Phase 5 — QA·런칭

- [x] 🤖 탈옥·프롬프트 주입 공격 시나리오 30+ → `docs/qa-report.md` (문서·정적분석 단계 — 47건 작성, L1/L3 결정론적 케이스는 테스트 고정. 실제 LLM 실행 검증은 API키 연결 후 리포트 4.4 체크리스트로)
- [ ] 🙋 지인 베타 테스트 (모바일·인스타 인앱 브라우저 포함)
- [ ] 🤖 피드백 반영
- [ ] 🙋 인스타그램 프로필에 링크 등록 🎉

## Phase 6 (2차) — 내 목소리로 답변

- [ ] 🙋 ElevenLabs 가입 + 보이스 클로닝 (음성 샘플 녹음, 월 $5~)
- [ ] 🤖 TTS 연동 (`audioUrl` 필드는 1차 API에 예약해둠)
