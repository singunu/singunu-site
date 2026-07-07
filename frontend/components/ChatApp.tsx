'use client';

/* 메인 챗 앱 — 랜딩(마스코트 히어로) → 대화 시작 시 헤더로 도킹.
   SSE 스트리밍, 추천 질문 칩, 폴백 모달, 다크/라이트 토글, 마스코트 상태 연동 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Mascot, { type MascotState } from './Mascot';
import MiniMascot from './MiniMascot';
import FallbackModal from './FallbackModal';
import { streamChat, getSessionId, type Turn } from '@/lib/api';

const CHIPS = ['어떤 일 하셨어요?', '인생 영화 3편만요', 'MBTI가 뭐예요?', '요즘 목표는요?'];

interface Msg extends Turn {
  pending?: boolean; // 아직 델타가 도착하지 않은 답변 자리
}

export default function ChatApp() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [sorry, setSorry] = useState(false);
  const [dark, setDark] = useState(false);
  const [modalQuestion, setModalQuestion] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [view, setView] = useState<'hero' | 'chat'>('hero');
  const bottomRef = useRef<HTMLDivElement>(null);
  const sorryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 미니 구체를 누르면 대화를 유지한 채 구체 화면으로 복귀
  const docked = view === 'chat';

  useEffect(() => {
    setSessionId(getSessionId());
    setDark(document.documentElement.getAttribute('data-theme') === 'dark');
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, thinking]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  };

  const triggerSorry = () => {
    setSorry(true);
    if (sorryTimer.current) clearTimeout(sorryTimer.current);
    sorryTimer.current = setTimeout(() => setSorry(false), 5000);
  };

  const send = useCallback(async (raw: string) => {
    const text = raw.trim().slice(0, 500);
    if (!text || busy || !sessionId) return;
    setInput('');
    setBusy(true);
    setThinking(true);
    setView('chat');

    const history: Turn[] = messages
      .filter((m) => m.text.length > 0)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [
      ...prev,
      { role: 'user', text },
      { role: 'assistant', text: '', pending: true },
    ]);

    const patchLast = (fn: (m: Msg) => Msg) =>
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = fn(next[next.length - 1]);
        return next;
      });

    await streamChat(
      { sessionId, message: text, history },
      {
        onDelta: (t) => {
          setThinking(false);
          patchLast((m) => ({ ...m, text: m.text + t, pending: false }));
        },
        onDone: (fallback) => {
          if (fallback) {
            patchLast((m) => ({
              ...m,
              pending: false,
              text: '이 질문엔 제가 섣불리 답하기 어려워요. 건우가 직접 답해드릴게요!',
            }));
            triggerSorry();
            setModalQuestion(text);
          }
        },
        onGuard: (reason) => {
          patchLast((m) => ({
            ...m,
            pending: false,
            text: reason || '이 질문엔 답하기 어려워요. 건우에게 직접 물어보시겠어요?',
          }));
          triggerSorry();
          setModalQuestion(text);
        },
        onError: (msg) => {
          patchLast((m) => ({ ...m, pending: false, text: msg }));
        },
      },
    );

    setThinking(false);
    setBusy(false);
  }, [busy, messages, sessionId]);

  const mascotState: MascotState = sorry
    ? 'sorry'
    : busy
      ? 'thinking'
      : inputFocused
        ? 'listening'
        : 'idle';

  const lastUserQuestion =
    [...messages].reverse().find((m) => m.role === 'user')?.text ?? '';

  return (
    <div className="app">
      <header className="top">
        {docked ? (
          <MiniMascot
            appState={mascotState}
            dark={dark}
            onBack={() => {
              setView('hero');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          <div className="avatarBadge">신</div>
        )}
        <div className="title">AI 신건우</div>
        <div className="spacer" />
        <button
          className="themeBtn"
          onClick={toggleTheme}
          aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
        >
          {dark ? '☀️' : '🌙'}
        </button>
      </header>

      <section className={`hero${docked ? ' docked' : ''}`}>
        {!docked && (
          <>
            <Mascot appState={mascotState} dark={dark} />
            <h1>
              안녕하세요,
              <br />
              <span>AI 건우</span>예요
            </h1>
            <p>
              신건우의 디지털 트윈이에요. 검수된 정보로만 답하고,
              모르는 건 지어내지 않아요 — 본체가 직접 답하러 옵니다.
            </p>
          </>
        )}
      </section>

      <main className="chat">
        {!docked && (
          <div className="chips">
            {CHIPS.map((c) => (
              <button key={c} className="chip" onClick={() => send(c)}>
                {c}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div className="msg user" key={i}>
              <div className="bubble">{m.text}</div>
            </div>
          ) : (
            <div className="msg ai" key={i}>
              <div>
                <div className="label">AI 건우</div>
                <div className="bubble">
                  {m.pending ? (
                    <span className="typing"><i /><i /><i /></span>
                  ) : (
                    m.text
                  )}
                </div>
              </div>
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </main>

      <div className="inputbar">
        <div className="box clay">
          <input
            value={input}
            maxLength={500}
            placeholder="신건우에 대해 물어보세요..."
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) send(input);
            }}
            aria-label="질문 입력"
          />
          <button
            className="send"
            disabled={busy || input.trim().length === 0}
            onClick={() => send(input)}
            aria-label="전송"
          >
            ↑
          </button>
        </div>
        <button className="askDirect" onClick={() => setModalQuestion(lastUserQuestion)}>
          AI 말고 본체에게 직접 물어볼래요
        </button>
      </div>

      {modalQuestion !== null && (
        <FallbackModal
          sessionId={sessionId}
          initialQuestion={modalQuestion}
          history={messages.filter((m) => m.text.length > 0).map((m) => ({ role: m.role, text: m.text }))}
          onClose={() => setModalQuestion(null)}
        />
      )}
    </div>
  );
}
