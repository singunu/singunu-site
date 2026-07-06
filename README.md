# singunu.com — "AI 신건우에게 물어보세요"

방문자가 AI에게 신건우에 대해 질문하면 옵시디언 볼트 기반 페르소나로 답변하는 개인 웹사이트.
AI가 답하기 어려운 질문은 연락처를 받아 저장하고 본인에게 메일로 알린다.

## 구조

| 디렉토리 | 내용 |
|---|---|
| `frontend/` | Next.js 14+ (App Router, TypeScript, Tailwind) — Vercel 배포 |
| `backend/` | Spring Boot 3 (Java 21) — chat/fallback API, 가드레일, Claude API 연동 |
| `persona/` | 공개용 페르소나 문서 + 볼트 → 페르소나 빌드 스크립트 |
| `infra/` | Docker, GitHub Actions, Nginx, 배포 스크립트 |
| `docs/` | 계획서, 셋업 가이드, QA 리포트 |

## 아키텍처 요약

```
singunu.com (가비아 DNS)
  → Vercel (Next.js)
  → api.singunu.com — Spring Boot (Docker, AWS)
      → Claude API (Haiku, 프롬프트 캐싱)
      → MongoDB Atlas M0
      → Gmail SMTP (폴백 질문 알림)
```

진행 상황: [TODO_LIST.md](TODO_LIST.md) · 전체 계획: [docs/PLAN.md](docs/PLAN.md)

## 보안 원칙

- LLM에는 DB 접근 도구가 없다 — 아는 것은 큐레이션된 `persona/public_persona.md`뿐
- 페르소나 문서는 사람이 최종 검수한 공개 가능 정보만 포함
- 입력 필터 → 시스템 프롬프트 → 출력 검열 → 확신도 라우팅 → 레이트리밋/지출상한 5레이어 방어
