'use client';

/* 폴백 모달 — 본체에게 직접 질문 / 익명 메시지
   질문·하고 싶은 말 + 자유텍스트 연락처(비우면 익명) + 동의 + 허니팟(website) */

import { useState } from 'react';
import { submitFallback, type Turn } from '@/lib/api';

interface Props {
  sessionId: string;
  initialQuestion: string;
  history: Turn[];
  onClose: () => void;
}

export default function FallbackModal({ sessionId, initialQuestion, history, onClose }: Props) {
  const [question, setQuestion] = useState(initialQuestion);
  const [contact, setContact] = useState('');
  const [website, setWebsite] = useState(''); // 허니팟
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 연락처는 선택 — 비우면 익명 메시지로 전달 (백엔드 @NotBlank 충족용 '익명')
  const canSubmit = question.trim().length > 0 && agreed && !sending;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    const res = await submitFallback({
      sessionId,
      question: question.trim().slice(0, 1000),
      contact: contact.trim() ? contact.trim().slice(0, 200) : '익명',
      history: history.slice(-10),
      website,
    });
    setSending(false);
    if (res.ok) setDone(res.message);
    else setError(res.message);
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal clay" role="dialog" aria-modal="true" aria-label="건우에게 직접 질문 남기기">
        {done ? (
          <div className="done">
            <div className="emoji">💌</div>
            <p>{done}</p>
            <div className="actions">
              <button className="submit" onClick={onClose}>확인</button>
            </div>
          </div>
        ) : (
          <>
            <h2>본체가 직접 확인해요</h2>
            <p className="sub">
              질문이든 하고 싶은 말이든 자유롭게 남겨주세요.
              연락처를 남기면 본체가 직접 답장을 드리고, 비워두면 익명 메시지로 전달돼요.
            </p>

            <label htmlFor="fb-q">질문 · 하고 싶은 말</label>
            <textarea
              id="fb-q"
              rows={3}
              maxLength={1000}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="궁금한 것, 하고 싶은 말 아무거나"
            />

            <label htmlFor="fb-c">연락받을 곳 (선택 — 비우면 익명)</label>
            <input
              id="fb-c"
              type="text"
              maxLength={200}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="이메일 / 인스타 아이디 / 카톡 오픈채팅 등 자유롭게"
            />

            {/* 허니팟 — 사람 눈엔 안 보임. 봇이 채우면 스팸 처리 */}
            <div className="hp" aria-hidden="true">
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <label className="consent">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>
                전달·답변 목적으로 남긴 내용(연락처 포함 시)을 수집하는 데 동의합니다.
                요청하시면 언제든 삭제해드려요.
              </span>
            </label>

            {error && <p className="errNote">{error}</p>}

            <div className="actions">
              <button className="cancel" onClick={onClose}>다음에요</button>
              <button className="submit" disabled={!canSubmit} onClick={handleSubmit}>
                {sending ? '전달 중…' : '남기기'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
