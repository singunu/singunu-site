/* OG 이미지 — 인스타/카톡 공유 미리보기에 마스코트가 뜬다.
   satori 기본 폰트(Inter)만 쓰므로 텍스트는 라틴 전용(한글 폰트 로딩 불필요).
   한국어 제목·설명은 메타태그 쪽에서 처리된다. */
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'AI 신건우에게 물어보세요 — singunu.com';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#eef0fa',
          fontFamily: 'sans-serif',
        }}
      >
        {/* 말랑 구체 마스코트 */}
        <div
          style={{
            width: 260,
            height: 260,
            borderRadius: 130,
            background:
              'radial-gradient(circle at 32% 24%, #ffffff 0%, #d7d2f9 38%, #c9c4f4 68%, #a89ef0 100%)',
            boxShadow: '0 40px 70px -20px rgba(90,80,160,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* 눈썹 */}
          <div style={{ position: 'absolute', top: 82, left: 62, width: 44, height: 8, borderRadius: 4, background: '#3a3560', transform: 'rotate(-6deg)', display: 'flex' }} />
          <div style={{ position: 'absolute', top: 82, right: 62, width: 44, height: 8, borderRadius: 4, background: '#3a3560', transform: 'rotate(6deg)', display: 'flex' }} />
          {/* 눈 */}
          <div style={{ position: 'absolute', top: 104, left: 58, width: 52, height: 52, borderRadius: 26, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: 12, background: '#3a3560', display: 'flex' }} />
          </div>
          <div style={{ position: 'absolute', top: 104, right: 58, width: 52, height: 52, borderRadius: 26, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: 12, background: '#3a3560', display: 'flex' }} />
          </div>
          {/* 홍조 */}
          <div style={{ position: 'absolute', top: 168, left: 40, width: 36, height: 20, borderRadius: 18, background: 'rgba(255,100,120,0.4)', display: 'flex' }} />
          <div style={{ position: 'absolute', top: 168, right: 40, width: 36, height: 20, borderRadius: 18, background: 'rgba(255,100,120,0.4)', display: 'flex' }} />
        </div>

        <div
          style={{
            marginTop: 48,
            fontSize: 64,
            fontWeight: 800,
            color: '#3a3560',
            letterSpacing: -2,
            display: 'flex',
          }}
        >
          singunu.com
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 30,
            fontWeight: 500,
            color: '#8f8bb0',
            display: 'flex',
          }}
        >
          Ask my AI twin anything
        </div>
      </div>
    ),
    size,
  );
}
