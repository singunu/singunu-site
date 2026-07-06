# singunu.com — AI Q&A 홈페이지 TODO

> 🙋 = 내가(신건우) 직접 해야 하는 일 · 🤖 = Claude Code가 자동 진행
> 전체 계획: `docs/PLAN.md` 참조. 각 단계 완료 시 이 파일을 갱신한다.

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

## Phase 2 — 백엔드 (Spring Boot 3, Java 21)

- [ ] 🤖 프로젝트 스캐폴드 + `/api/chat` (SSE 스트리밍, Claude API 연동)
- [ ] 🤖 가드레일 5레이어 (입력필터 → 시스템프롬프트 → 출력검열 → 확신도 라우팅 → 레이트리밋/지출상한)
- [ ] 🤖 `/api/fallback` (질문+대화이력+연락처 저장 + 메일 발송)
- [ ] 🤖 MongoDB 연동, 테스트 코드, docker-compose(로컬 개발용)
- [ ] 🙋 MongoDB Atlas M0 무료 클러스터 생성 → 접속 URI 전달 (가이드: `docs/SETUP_GUIDE.md`)
- [x] 🙋 Gmail 앱 비밀번호 발급 → `backend/.env`로 이동 완료 (⚠️ 비밀번호·키는 이 파일이 아니라 .env에만 — 이 파일은 GitHub에 올라감)

## Phase 3 — 프론트엔드 (Next.js + Vercel)

- [ ] 🤖 디자인 프로토타입 2~3안 (HTML) 제작
- [ ] 🙋 디자인 시안 선택 + 피드백
- [ ] 🤖 Next.js 구현: 챗 UI(스트리밍), 추천 질문 칩, 폴백 모달, 다크/라이트, OG/SEO
- [ ] 🙋 히어로 문구·추천 질문·프로필 사진(선택) 확정

## Phase 4 — 인프라·배포

- [ ] 🙋 AWS 계정 (또는 Lightsail $5 인스턴스) 생성 — 가이드 제공 예정
- [ ] 🙋 Vercel 계정 생성 + GitHub 저장소 연결
- [ ] 🤖 Dockerfile, GitHub Actions 워크플로, Nginx + Let's Encrypt(HTTPS)
- [ ] 🙋 가비아 DNS 설정 (A 레코드 → 서버 IP, CNAME → Vercel) — 화면별 가이드 제공 예정
- [ ] 🙋 AWS Budget 비용 알람 + Anthropic 지출 한도 확인

## Phase 5 — QA·런칭

- [ ] 🤖 탈옥·프롬프트 주입 공격 시나리오 30+ 실행 → `docs/qa-report.md`
- [ ] 🙋 지인 베타 테스트 (모바일·인스타 인앱 브라우저 포함)
- [ ] 🤖 피드백 반영
- [ ] 🙋 인스타그램 프로필에 링크 등록 🎉

## Phase 6 (2차) — 내 목소리로 답변

- [ ] 🙋 ElevenLabs 가입 + 보이스 클로닝 (음성 샘플 녹음, 월 $5~)
- [ ] 🤖 TTS 연동 (`audioUrl` 필드는 1차 API에 예약해둠)
