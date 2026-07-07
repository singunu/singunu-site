'use client';

/* 도킹된 미니 마스코트 (44px) — 대화 시작 후 헤더에 상주.
   물리는 없지만 살아 있다: 깜빡임, thinking 중 눈 좌우 스캔, sorry 시무룩.
   누르면 대화를 유지한 채 구체 화면으로 복귀. */

import { useEffect, useRef } from 'react';
import type { MascotState } from './Mascot';

interface Props {
  appState: MascotState;
  dark: boolean;
  onBack: () => void;
}

export default function MiniMascot({ appState, dark, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const envRef = useRef({ appState, dark });
  envRef.current = { appState, dark };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const S = 44;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = S * dpr;
    canvas.height = S * dpr;
    // setTransform: 리마운트 시 scale 누적 방지
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let t = 0;
    let blinkStart = -1;
    let alive = true;
    let raf = 0;
    const expr = { tilt: 0, lift: 0, squeeze: 0 };
    const bounceUntil = 0;

    function draw() {
      if (!alive) return;
      raf = requestAnimationFrame(draw);
      t += 1 / 60;
      const { appState: st, dark: dk } = envRef.current;
      const now = performance.now();

      const pal = dk
        ? { body: ['#b3abe8', '#7d73cc', '#5a50b5'], pupil: '#26224a' }
        : { body: ['#f4f2fe', '#c9c4f4', '#a89ef0'], pupil: '#3a3560' };

      const c = ctx!;
      c.clearRect(0, 0, S, S);

      // 표정 타깃
      let tTilt = 0, tLift = 0, tSqueeze = 0;
      if (st === 'thinking') tLift = -1.2;
      else if (st === 'sorry') { tTilt = -0.6; tLift = 1; tSqueeze = 0.25; }
      expr.tilt += (tTilt - expr.tilt) * 0.08;
      expr.lift += (tLift - expr.lift) * 0.08;
      expr.squeeze += (tSqueeze - expr.squeeze) * 0.08;

      // 몸통 (탭하면 살짝 바운스)
      const bounce = now < bounceUntil ? Math.sin(((bounceUntil - now) / 260) * Math.PI) * 2.5 : 0;
      const cx = S / 2;
      const cy = S / 2 + 1 - bounce;
      const r = 19;
      const bg = c.createRadialGradient(cx - 6, cy - 7, 2, cx, cy, r * 1.25);
      bg.addColorStop(0, pal.body[0]);
      bg.addColorStop(0.6, pal.body[1]);
      bg.addColorStop(1, pal.body[2]);
      c.fillStyle = bg;
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.fill();

      // 눈
      let blinkF = 1;
      if (blinkStart >= 0) {
        const bt = (now - blinkStart) / 180;
        if (bt >= 1) blinkStart = -1;
        else blinkF = Math.max(0.06, 1 - Math.sin(Math.PI * bt));
      }
      const scan = st === 'thinking' && !reduced ? Math.sin(t * 3.2) * 1.8 : 0;
      const gy = st === 'sorry' ? 0.8 : 0;
      const ry = 4.2 * (1 - expr.squeeze * 0.5) * blinkF;
      for (let e = -1; e <= 1; e += 2) {
        const ex = cx + e * 7.5;
        const ey = cy - 2;
        c.beginPath();
        c.ellipse(ex, ey, 4.2, ry, 0, 0, Math.PI * 2);
        c.fillStyle = '#fff';
        c.fill();
        if (ry > 1) {
          c.beginPath();
          c.arc(ex + scan, ey + gy, 2, 0, Math.PI * 2);
          c.fillStyle = pal.pupil;
          c.fill();
        }
      }
      // 눈썹
      c.strokeStyle = pal.pupil;
      c.lineWidth = 1.6;
      c.lineCap = 'round';
      for (let e2 = -1; e2 <= 1; e2 += 2) {
        c.save();
        c.translate(cx + e2 * 7.5, cy - 8.5 + expr.lift);
        c.rotate(-e2 * expr.tilt * 0.55);
        c.beginPath();
        c.moveTo(-3, 0.5);
        c.quadraticCurveTo(0, -1, 3, 0.5);
        c.stroke();
        c.restore();
      }
    }
    draw();

    (function blinkLoop() {
      if (!alive) return;
      setTimeout(() => {
        if (!alive) return;
        if (!reduced && blinkStart < 0) blinkStart = performance.now();
        blinkLoop();
      }, 2400 + Math.random() * 2600);
    })();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="miniWrap"
      ref={wrapRef}
      title="처음 화면으로"
      role="button"
      aria-label="구체 화면으로 돌아가기"
      onClick={onBack}
    >
      <canvas ref={canvasRef} aria-label="미니 마스코트" />
    </div>
  );
}
