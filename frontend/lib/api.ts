/* 백엔드 API 클라이언트 — SSE(POST) 스트리밍 + 폴백 제출 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'https://api.singunu.com';

export interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

/* 백엔드 SSE 이벤트 프로토콜 (ChatService 참조):
   delta {t}                          — 답변 텍스트 조각
   done  {fallback}                   — 정상 종료 (true면 직접질문 모달)
   guard {reason, fallback: true}     — 가드레일 차단
   error {message}                    — 서버 오류 */
export interface ChatCallbacks {
  onDelta: (text: string) => void;
  onDone: (fallback: boolean) => void;
  onGuard: (reason: string) => void;
  onError: (message: string) => void;
}

/** EventSource는 GET 전용이라 fetch 스트림으로 SSE 프레임을 직접 파싱한다 */
export async function streamChat(
  body: { sessionId: string; message: string; history: Turn[] },
  cb: ChatCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    cb.onError('서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
    return;
  }
  if (!res.ok || !res.body) {
    cb.onError('잠시 문제가 생겼어요. 다시 시도해 주세요.');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let finished = false;

  const handleFrame = (frame: string) => {
    let event = 'message';
    let data = '';
    for (const rawLine of frame.split('\n')) {
      const line = rawLine.replace(/\r$/, '');
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (!data) return;
    let parsed: any;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (event === 'delta') cb.onDelta(String(parsed.t ?? ''));
    else if (event === 'done') { finished = true; cb.onDone(Boolean(parsed.fallback)); }
    else if (event === 'guard') { finished = true; cb.onGuard(String(parsed.reason ?? '')); }
    else if (event === 'error') { finished = true; cb.onError(String(parsed.message ?? '')); }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        handleFrame(buf.slice(0, idx));
        buf = buf.slice(idx + 2);
      }
    }
    if (!finished) cb.onError('연결이 끊겼어요. 다시 시도해 주세요.');
  } catch (e) {
    if (!finished && !(signal?.aborted)) {
      cb.onError('연결이 끊겼어요. 다시 시도해 주세요.');
    }
  }
}

export async function submitFallback(body: {
  sessionId: string;
  question: string;
  contact: string;
  history: Turn[];
  website: string; // 허니팟 — 사람은 비워둠
}): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/fallback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (json && typeof json.ok === 'boolean') return json;
    return { ok: res.ok, message: res.ok ? '전달됐어요!' : '전송에 실패했어요.' };
  } catch {
    return { ok: false, message: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' };
  }
}

/** 세션 ID — 탭 단위 유지 (백엔드 @Size(max=64)) */
export function getSessionId(): string {
  const KEY = 'singunu.sessionId';
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
