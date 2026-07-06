# 파트별 에이전트 운영 가이드

singunu.com은 파트를 **프로젝트 전용 서브에이전트**로 분리해 진행한다. 정의는 `.claude/agents/`에 있고, 각 에이전트는 자기 담당 폴더·규칙·API 계약만 물고 독립적으로 작업한다.

## 에이전트 목록

| 에이전트 | 담당 | 폴더 | 지금 상태 |
|---|---|---|---|
| `backend-dev` | Spring Boot API·가드레일·Claude 연동 | `backend/` | ✅ 토대 완성(빌드·테스트 통과). 확장·수정 대기 |
| `frontend-dev` | Next.js 챗 UI·폴백 모달·SEO | `frontend/` | ⏸ 🙋 디자인 시안 선택 후 착수 |
| `infra-deploy` | Docker·GitHub Actions·Nginx·DNS 가이드 | `infra/`, 루트 | ⏸ 🙋 AWS/Vercel 계정 후 배포. 워크플로 초안은 선착수 가능 |
| `qa-security` | 탈옥·주입 공격 시나리오·qa-report | `docs/`, `backend/src/test/` | ▶ 지금 착수 가능(문서화 단계) |

## 호출 방법

이후 대화에서 파트를 지정해 넘기면 된다. 예:
- "프론트 에이전트한테 A안으로 챗 화면 만들라고 해줘"
- "qa 에이전트로 공격 시나리오 실행해줘"
- "인프라 에이전트한테 GitHub Actions 워크플로 짜라고 해"

메인(오케스트레이터)이 해당 서브에이전트를 띄우고, 결과를 받아 정리해준다.

## 계약·경계 (충돌 방지)

- **API 계약의 정본은 백엔드 컨트롤러** (`ChatController`/`FallbackController`). 프론트는 이를 따르고, 바꿔야 하면 백엔드 에이전트를 통해 조정한다.
- **진행 상황의 정본은 `TODO_LIST.md`**. 각 에이전트는 자기 항목 완료 시 체크박스를 갱신한다.
- **절대 가드**(민감정보·페르소나 무결성)는 전 에이전트 공통. `CLAUDE.md`·`persona/REVIEW_CHECKLIST.md` 준수.
- 병렬 실행 시 파트 폴더가 겹치지 않아 안전하다(backend/ · frontend/ · infra/ · docs/).

## 권장 순서

1. **지금**: `qa-security`(문서), `infra-deploy`(워크플로 초안) — 사용자 입력 불필요
2. 🙋 디자인 시안 선택 → `frontend-dev` 착수
3. 🙋 AWS·Vercel·Atlas 계정 → `infra-deploy` 배포 + `backend-dev` 실환경 연동
4. 통합 후 `qa-security`가 실제 LLM 호출로 시나리오 실행 → 리포트 확정
