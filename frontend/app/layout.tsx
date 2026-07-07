import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://singunu.com'),
  title: 'AI 신건우에게 물어보세요 — singunu.com',
  description:
    '신건우의 디지털 트윈. 경력, 취향, 생각 — 무엇이든 물어보세요. 모르는 건 지어내지 않고, 본인이 직접 답합니다.',
  openGraph: {
    title: 'AI 신건우에게 물어보세요',
    description:
      '신건우의 디지털 트윈. 무엇이든 물어보세요 — 모르는 건 본인이 직접 답합니다.',
    url: 'https://singunu.com',
    siteName: 'singunu.com',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI 신건우에게 물어보세요',
    description: '신건우의 디지털 트윈에게 무엇이든 물어보세요.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eef0fa' },
    { media: '(prefers-color-scheme: dark)', color: '#201e30' },
  ],
};

/* 테마 초기화 — 페인트 전에 실행해 FOUC 방지 */
const themeInit = `(function(){try{var t=localStorage.getItem('theme');if(!t)t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
      </body>
    </html>
  );
}
