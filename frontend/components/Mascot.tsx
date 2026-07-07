'use client';

/* 말랑 점토 마스코트 — 캔버스 젤리 물리 (L안 프로토타입 이식 + 상태 연동)
   · 36점 스프링 블롭: 잡은 부위만 국소 변형, 안쪽 눌림은 55%까지(관통 방지)
   · 홍조 배열(최대 14개, 6.5s+), 3개↑ 슬픔 / 6개↑ 화남+떨림
   · 눈썹 표정, 팔로우스루 눈, 딴청/깜빡임/원위치
   · 1000 랜덤 멘트(셔플백) + 화남/쓰다듬기 전용 멘트
   · 쓰다듬기 → 행복, 30초 내 10회 당김 → 분노 이스터에그, 놓을 때 안티시페이션
   · 챗 상태 연동: listening(입력 응시) / thinking(눈 좌우 스캔) / sorry(시무룩) */

import { useEffect, useRef } from 'react';
import { QUIPS, ANGRY_QUIPS, PET_QUIPS, makeQuipBag } from '@/lib/quips';

export type MascotState = 'idle' | 'listening' | 'thinking' | 'sorry';

interface Props {
  appState: MascotState;
  dark: boolean;
}

export default function Mascot({ appState, dark }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const quipRef = useRef<HTMLDivElement>(null);
  const envRef = useRef({ appState, dark });
  envRef.current = { appState, dark };

  useEffect(() => {
    const canvas = canvasRef.current;
    const quipEl = quipRef.current;
    if (!canvas || !quipEl) return;
    return createBuddy(canvas, quipEl, () => envRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="buddyWrap">
      <div className="quip" ref={quipRef} />
      <canvas ref={canvasRef} aria-label="말랑한 점토 마스코트 — 잡아늘여 보세요" />
    </div>
  );
}

/* ────────────────────────────────────────────── */

function createBuddy(
  canvas: HTMLCanvasElement,
  quipEl: HTMLDivElement,
  getEnv: () => { appState: MascotState; dark: boolean },
): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const W = 600;
  const H = 460;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  // setTransform: 리마운트(dev StrictMode 등) 시 scale이 누적되지 않도록
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  /* ── 물리 상태 ── */
  const N = 36;
  const R = 62;
  const REST = { x: W / 2, y: 220 };
  const center = { x: REST.x, y: REST.y, vx: 0, vy: 0 };
  interface Pt { a: number; x: number; y: number; vx: number; vy: number }
  const pts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    pts.push({ a, x: REST.x + Math.cos(a) * R, y: REST.y + Math.sin(a) * R, vx: 0, vy: 0 });
  }

  let dragging = false;
  let gi = -1;
  let grab = { x: 0, y: 0 };
  let curStretch = 0;
  let maxStretch = 0;
  let t = 0;

  interface Blush { idx: number; until: number; peak: number; a: number; x: number; y: number }
  let blushes: Blush[] = [];
  let activeBlush = 0;

  /* ── 표정/시선 상태 ── */
  const eyeC = { x: REST.x, y: REST.y - 10 };
  const gaze = { x: 0, y: 0 };
  const gazeTarget = { x: 0, y: 0 };
  let lastMove = 0;
  let eyesCentered = true;
  let blinkStart = -1;
  const expr = { tilt: 0, lift: 0, squeeze: 0, gy: 0 };
  let browFlashUntil = 0;

  /* 이스터에그/쓰다듬기 */
  let pullTimes: number[] = [];
  let angryUntil = 0;
  let happyUntil = 0;
  let petMeter = 0;
  let lastPet = { x: 0, y: 0, has: false };

  const nextQuip = makeQuipBag(QUIPS);
  const nextAngry = makeQuipBag(ANGRY_QUIPS);
  const nextPet = makeQuipBag(PET_QUIPS);
  let quipTimer: ReturnType<typeof setTimeout> | null = null;

  function showQuip(pool?: 'angry' | 'pet') {
    browFlashUntil = performance.now() + 420;
    quipEl.textContent =
      pool === 'angry' ? nextAngry() : pool === 'pet' ? nextPet() : nextQuip();
    quipEl.classList.remove('show');
    void quipEl.offsetWidth;
    quipEl.classList.add('show');
    if (quipTimer) clearTimeout(quipTimer);
    quipTimer = setTimeout(() => quipEl.classList.remove('show'), 2600);
  }

  function toLocal(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /* ── 물리 스텝 ── */
  function step() {
    t += 1 / 60;
    const bobY = reduced || dragging ? 0 : Math.sin(t * 1.7) * 4;

    // 드래그 변위: 반경/접선 분해 — 안쪽 눌림은 55%까지, 초과분은 몸 전체가 밀림
    let ux = 0, uy = 0, eff = 0, pushX = 0, pushY = 0;
    if (dragging && gi >= 0) {
      const gnx = Math.cos(pts[gi].a);
      const gny = Math.sin(pts[gi].a);
      const rgx = center.x + gnx * R;
      const rgy = center.y + gny * R;
      const dx = grab.x - rgx;
      const dy = grab.y - rgy;
      let rad = dx * gnx + dy * gny;
      const tgx = dx - rad * gnx;
      const tgy = dy - rad * gny;
      const maxDent = R * 0.55;
      if (rad < -maxDent) {
        const pm = Math.min(-(rad + maxDent), 90);
        pushX = -gnx * pm;
        pushY = -gny * pm;
        rad = -maxDent;
      }
      const ex = gnx * rad + tgx;
      const ey = gny * rad + tgy;
      const d = Math.hypot(ex, ey);
      const MAXD = 150;
      eff = d > 0 ? MAXD * Math.tanh(d / MAXD) : 0;
      if (d > 0) { ux = ex / d; uy = ey / d; }
      curStretch = eff;
      if (eff > maxStretch) maxStretch = eff;
    } else {
      curStretch *= 0.9;
    }

    // 중심 스프링 + 화남 떨림
    let tx = REST.x + ux * eff * 0.2 + pushX * 0.9;
    let ty = REST.y + bobY + uy * eff * 0.2 + pushY * 0.9;
    const angryNow = activeBlush >= 6 || performance.now() < angryUntil;
    if (angryNow && !reduced) {
      tx += (Math.random() - 0.5) * 2.4;
      ty += (Math.random() - 0.5) * 2.4;
    }
    center.vx = (center.vx + (tx - center.x) * 0.06) * 0.88;
    center.vy = (center.vy + (ty - center.y) * 0.06) * 0.88;
    center.x += center.vx;
    center.y += center.vy;

    // 표면 점: rest 스프링 + 이웃 중점 스프링
    for (let i = 0; i < N; i++) {
      const p = pts[i];
      const rx = center.x + Math.cos(p.a) * R;
      const ry2 = center.y + Math.sin(p.a) * R;
      const prev = pts[(i + N - 1) % N];
      const next = pts[(i + 1) % N];
      const nx = (prev.x + next.x) / 2;
      const ny = (prev.y + next.y) / 2;
      p.vx = (p.vx + (rx - p.x) * 0.12 + (nx - p.x) * 0.09) * 0.86;
      p.vy = (p.vy + (ry2 - p.y) * 0.12 + (ny - p.y) * 0.09) * 0.86;
      p.x += p.vx;
      p.y += p.vy;
    }

    // 잡은 부위 국소 변형 (±7점, 코사인 감쇠)
    if (dragging && gi >= 0) {
      const HALF = 7;
      for (let j = -HALF; j <= HALF; j++) {
        const idx = (gi + j + N) % N;
        const w = Math.pow(Math.cos((j / (HALF + 1)) * Math.PI / 2), 1.6);
        const q = pts[idx];
        const qx = center.x + Math.cos(q.a) * R + ux * eff * w;
        const qy = center.y + Math.sin(q.a) * R + uy * eff * w;
        q.x += (qx - q.x) * 0.6;
        q.y += (qy - q.y) * 0.6;
        q.vx *= 0.5;
        q.vy *= 0.5;
      }
    }

    // 홍조: 놓은 뒤 나타나 오래 유지 — 새 드래그 중에도 이전 홍조 유지
    const nowMs = performance.now();
    activeBlush = 0;
    for (let b = blushes.length - 1; b >= 0; b--) {
      const bl = blushes[b];
      const bp = pts[bl.idx];
      bl.x = bp.x - Math.cos(bp.a) * 10;
      bl.y = bp.y - Math.sin(bp.a) * 10;
      const target = nowMs < bl.until ? bl.peak : 0;
      bl.a += (target - bl.a) * (target > bl.a ? 0.12 : 0.02);
      if (target === 0 && bl.a < 0.005) blushes.splice(b, 1);
      else if (bl.a > 0.08) activeBlush++;
    }

    // 쓰다듬기 게이지 감쇠
    petMeter *= 0.97;
  }

  /* ── 그리기 ── */
  function blobPath() {
    ctx!.beginPath();
    const last = pts[N - 1];
    const first = pts[0];
    ctx!.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
    for (let i = 0; i < N; i++) {
      const p = pts[i];
      const nx = pts[(i + 1) % N];
      ctx!.quadraticCurveTo(p.x, p.y, (p.x + nx.x) / 2, (p.y + nx.y) / 2);
    }
    ctx!.closePath();
  }

  function draw() {
    const c = ctx!;
    const { appState, dark } = getEnv();
    const pal = dark
      ? {
          body: ['#b3abe8', '#8d84d6', '#7d73cc', '#5a50b5'],
          shadow: 'rgba(0,0,0,',
          hiA: 0.5,
          loShade: 'rgba(12,8,36,.4)',
          eyeStroke: 'rgba(20,15,50,.3)',
          pupil: '#26224a',
          blushC: 'rgba(255,110,130,',
        }
      : {
          body: ['#f4f2fe', '#d7d2f9', '#c9c4f4', '#a89ef0'],
          shadow: 'rgba(90,80,160,',
          hiA: 0.85,
          loShade: 'rgba(90,80,160,.32)',
          eyeStroke: 'rgba(90,80,160,.18)',
          pupil: '#3a3560',
          blushC: 'rgba(255,100,120,',
        };

    c.clearRect(0, 0, W, H);

    // 무게중심
    let cx = 0, cy = 0;
    for (let i = 0; i < N; i++) { cx += pts[i].x; cy += pts[i].y; }
    cx /= N;
    cy /= N;

    // 바닥 그림자
    const lift = REST.y - cy;
    const s = Math.max(0.55, Math.min(1.15, 1 - lift / 120));
    c.save();
    c.translate(REST.x, 312);
    c.scale(s, s * 0.22);
    const sg = c.createRadialGradient(0, 0, 2, 0, 0, 52);
    sg.addColorStop(0, pal.shadow + '.30)');
    sg.addColorStop(1, pal.shadow + '0)');
    c.fillStyle = sg;
    c.beginPath();
    c.arc(0, 0, 52, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // 몸통
    blobPath();
    const bg = c.createRadialGradient(cx - R * 0.35, cy - R * 0.45, R * 0.1, cx, cy, R * 1.3);
    bg.addColorStop(0, pal.body[0]);
    bg.addColorStop(0.4, pal.body[1]);
    bg.addColorStop(0.78, pal.body[2]);
    bg.addColorStop(1, pal.body[3]);
    c.fillStyle = bg;
    c.fill();

    // 내부 디테일 (클립)
    c.save();
    blobPath();
    c.clip();
    const hg = c.createRadialGradient(cx - R * 0.3, cy - R * 0.6, 4, cx - R * 0.3, cy - R * 0.6, R * 0.95);
    hg.addColorStop(0, `rgba(255,255,255,${pal.hiA})`);
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = hg;
    c.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4);
    const dg = c.createRadialGradient(cx, cy + R * 0.95, R * 0.2, cx, cy + R * 0.95, R * 1.1);
    dg.addColorStop(0, pal.loShade);
    dg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = dg;
    c.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4);
    for (const bl of blushes) {
      if (bl.a < 0.01) continue;
      const rg = c.createRadialGradient(bl.x, bl.y, 2, bl.x, bl.y, 30);
      rg.addColorStop(0, pal.blushC + bl.a.toFixed(3) + ')');
      rg.addColorStop(1, pal.blushC + '0)');
      c.fillStyle = rg;
      c.fillRect(bl.x - 34, bl.y - 34, 68, 68);
    }
    c.restore();

    // ── 표정 결정 ──
    const now = performance.now();
    const angryNow = activeBlush >= 6 || now < angryUntil;
    const happyNow = now < happyUntil;
    let tTilt = 0, tLift = 0, tSqueeze = 0, tGy = 0;
    // 챗 상태 기본선
    if (appState === 'listening') { tGy = 3; tLift = -1.5; }
    else if (appState === 'thinking') { tLift = -2; }
    else if (appState === 'sorry') { tTilt = -0.6; tLift = 1.5; tSqueeze = 0.22; tGy = 1.8; }
    // 인터랙션이 우선
    if (dragging && curStretch > 30) { tTilt = -0.38; tLift = 1.2; }
    if (activeBlush >= 3 && !angryNow) { tTilt = -0.6; tLift = 1.5; tSqueeze = 0.22; tGy = 1.8; }
    if (angryNow) { tTilt = 0.58; tLift = -2.5; tSqueeze = 0.38; tGy = 0; }
    if (happyNow) { tTilt = 0; tLift = -3; tSqueeze = 0; tGy = 0; }
    if (now < browFlashUntil) tLift -= 3;
    expr.tilt += (tTilt - expr.tilt) * 0.08;
    expr.lift += (tLift - expr.lift) * 0.08;
    expr.squeeze += (tSqueeze - expr.squeeze) * 0.08;
    expr.gy += (tGy - expr.gy) * 0.08;

    // thinking: 눈이 좌우로 스캔
    if (appState === 'thinking' && !dragging && !reduced) {
      gazeTarget.x = Math.sin(t * 3.2) * 4;
      gazeTarget.y = 0;
    }

    // 눈 — 팔로우스루
    eyeC.x += (cx - eyeC.x) * 0.16;
    eyeC.y += (cy - 10 - eyeC.y) * 0.16;
    gaze.x += (gazeTarget.x - gaze.x) * 0.2;
    gaze.y += (gazeTarget.y - gaze.y) * 0.2;

    const squint = Math.max(0, Math.min(0.6, curStretch / 110));
    let blinkF = 1;
    if (blinkStart >= 0) {
      const bt = (now - blinkStart) / 180;
      if (bt >= 1) blinkStart = -1;
      else blinkF = Math.max(0.06, 1 - Math.sin(Math.PI * bt));
    }
    const ry = 12 * (1 - squint * 0.75) * (1 - expr.squeeze * 0.5) * blinkF;

    for (let e = -1; e <= 1; e += 2) {
      const ex = eyeC.x + e * 21;
      const ey = eyeC.y;
      if (happyNow) {
        // 행복: 반달 눈 (∪ 아치)
        c.strokeStyle = pal.pupil;
        c.lineWidth = 3.4;
        c.lineCap = 'round';
        c.beginPath();
        c.arc(ex, ey + 3, 9, Math.PI * 1.15, Math.PI * 1.85);
        c.stroke();
        continue;
      }
      c.beginPath();
      c.ellipse(ex, ey, 12, ry, 0, 0, Math.PI * 2);
      c.fillStyle = '#fff';
      c.fill();
      c.strokeStyle = pal.eyeStroke;
      c.lineWidth = 1;
      c.stroke();
      if (ry > 2.5) {
        const py = ey + gaze.y * (ry / 12) + expr.gy;
        c.beginPath();
        c.arc(ex + gaze.x, py, 5.5, 0, Math.PI * 2);
        c.fillStyle = pal.pupil;
        c.fill();
        c.beginPath();
        c.arc(ex + gaze.x - 1.6, py - 1.6, 1.8, 0, Math.PI * 2);
        c.fillStyle = '#fff';
        c.fill();
      }
    }

    // 눈썹
    c.strokeStyle = pal.pupil;
    c.lineWidth = 3.2;
    c.lineCap = 'round';
    for (let e2 = -1; e2 <= 1; e2 += 2) {
      c.save();
      c.translate(eyeC.x + e2 * 21, eyeC.y - 17 + expr.lift);
      c.rotate(-e2 * expr.tilt * 0.55);
      c.beginPath();
      c.moveTo(-8, 1);
      c.quadraticCurveTo(0, -2, 8, 1);
      c.stroke();
      c.restore();
    }
  }

  let raf = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    step();
    draw();
  }
  loop();

  /* ── 포인터: 시선 + 쓰다듬기 ── */
  const onWinMove = (e: PointerEvent) => {
    lastMove = Date.now();
    eyesCentered = false;
    if (getEnv().appState === 'thinking') return; // thinking 중엔 스캔이 우선
    const m = toLocal(e);
    const dx = m.x - eyeC.x;
    const dy = m.y - eyeC.y;
    const dist = Math.hypot(dx, dy) || 1;
    const mag = Math.min(dist / 40, 1) * 4.5;
    gazeTarget.x = (dx / dist) * mag;
    gazeTarget.y = (dy / dist) * mag;
  };
  window.addEventListener('pointermove', onWinMove);

  const centerTimer = setInterval(() => {
    if (!eyesCentered && !dragging && Date.now() - lastMove > 3000) {
      eyesCentered = true;
      gazeTarget.x = 0;
      gazeTarget.y = 0;
    }
  }, 400);

  let alive = true;
  (function idleGlance() {
    if (!alive) return;
    setTimeout(() => {
      if (!alive) return;
      if (eyesCentered && !dragging && !reduced && getEnv().appState === 'idle') {
        const a = Math.random() * Math.PI * 2;
        const m = 2.5 + Math.random() * 2;
        gazeTarget.x = Math.cos(a) * m;
        gazeTarget.y = Math.sin(a) * m * 0.7;
        browFlashUntil = performance.now() + 300;
        setTimeout(() => {
          if (alive && eyesCentered && !dragging) { gazeTarget.x = 0; gazeTarget.y = 0; }
        }, 500 + Math.random() * 700);
      }
      idleGlance();
    }, 2800 + Math.random() * 3200);
  })();

  (function blinkLoop() {
    if (!alive) return;
    setTimeout(() => {
      if (!alive) return;
      if (!reduced && blinkStart < 0) blinkStart = performance.now();
      blinkLoop();
    }, 2400 + Math.random() * 2600);
  })();

  /* ── 잡아늘이기 + 쓰다듬기 감지 ── */
  const onDown = (e: PointerEvent) => {
    const m = toLocal(e);
    const dx = m.x - center.x;
    const dy = m.y - center.y;
    if (Math.hypot(dx, dy) > R + 28) return;
    dragging = true;
    maxStretch = 0;
    grab = m;
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < N; i++) {
      const d = (pts[i].x - m.x) ** 2 + (pts[i].y - m.y) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    gi = best;
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    const m = toLocal(e);
    if (dragging) { grab = m; return; }
    const hx = m.x - center.x;
    const hy = m.y - center.y;
    const over = hx * hx + hy * hy <= (R + 28) * (R + 28);
    canvas.style.cursor = over ? 'grab' : 'default';
    // 쓰다듬기: 누르지 않고 구체 위를 문지르면 행복
    if (over && lastPet.has) {
      petMeter += Math.min(Math.hypot(m.x - lastPet.x, m.y - lastPet.y), 14);
      if (petMeter > 170 && performance.now() > happyUntil) {
        happyUntil = performance.now() + 1600;
        petMeter = 0;
        if (Math.random() < 0.45) showQuip('pet');
      }
    }
    lastPet = { x: m.x, y: m.y, has: over };
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    canvas.style.cursor = 'grab';
    const now = performance.now();

    if (maxStretch > 25 && gi >= 0) {
      // 홍조: 같은 자리는 갱신, 새 자리는 추가 (최대 14개 공존)
      const peak = Math.min(0.2 + maxStretch / 160, 0.55);
      const hit = blushes.find((b) => Math.abs(b.idx - gi) <= 2);
      if (hit) {
        hit.idx = gi;
        hit.until = now + 8000;
        hit.peak = Math.max(hit.peak, peak);
      } else {
        blushes.push({ idx: gi, until: now + 6500, peak, a: 0, x: 0, y: 0 });
        if (blushes.length > 14) blushes.shift();
      }
    }

    if (maxStretch > 30) {
      // 당겼다 놓으면 항상 한마디
      if (maxStretch > 55) {
        // 안티시페이션: 복원 직전 당겼던 방향으로 한 번 더 움찔
        if (gi >= 0) {
          const HALF = 5;
          for (let j = -HALF; j <= HALF; j++) {
            const idx = (gi + j + N) % N;
            const w = Math.cos((j / (HALF + 1)) * Math.PI / 2);
            pts[idx].vx += Math.cos(pts[idx].a) * 2.2 * w;
            pts[idx].vy += Math.sin(pts[idx].a) * 2.2 * w;
          }
        }
        // 이스터에그 카운트: 30초 내 크게 10회 당기면 분노 모드
        pullTimes.push(now);
        pullTimes = pullTimes.filter((p) => now - p < 30000);
      }
      const angryNow = activeBlush >= 6 || now < angryUntil;
      if (pullTimes.length >= 10 && !angryNow) {
        angryUntil = now + 6000;
        showQuip('angry');
      } else {
        showQuip(angryNow ? 'angry' : undefined);
      }
      if (navigator.vibrate) navigator.vibrate(12);
    } else if (maxStretch < 10) {
      // 짧은 탭 → 말랑 눌림 임펄스 + 10% 확률로 한마디
      for (let i = 0; i < N; i++) {
        pts[i].vx += (pts[i].x - center.x) * 0.1;
        pts[i].vy -= (pts[i].y - center.y) * 0.16;
      }
      if (Math.random() < 0.1) showQuip();
    }
    gi = -1;
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    clearInterval(centerTimer);
    if (quipTimer) clearTimeout(quipTimer);
    window.removeEventListener('pointermove', onWinMove);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
  };
}
