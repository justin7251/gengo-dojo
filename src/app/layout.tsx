import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Noto_Sans_JP, Noto_Sans_SC } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets:  ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets:  ['latin'],
});

const notoSansJP = Noto_Sans_JP({
  variable: '--font-noto-jp',
  subsets:  ['latin'],
  weight:   ['400', '500', '600'],
});

const notoSansSC = Noto_Sans_SC({
  variable: '--font-noto-sc',
  subsets:  ['latin'],
  weight:   ['400', '500', '600'],
});

export const metadata: Metadata = {
  title:       '言語道場',
  description: 'AI-powered vocabulary shaped around your interests',
  manifest:    '/manifest.json',
  appleWebApp: {
    capable:           true,
    statusBarStyle:    'black-translucent',
    title:             '言語道場',
  },
  icons: {
    icon:  [{ url: '/icon-192.png', sizes: '192x192' }],
    apple: [{ url: '/icon-192.png' }],
  },
};

export const viewport: Viewport = {
  themeColor:    '#1D9E75',
  width:         'device-width',
  initialScale:  1,
  maximumScale:  1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansJP.variable} ${notoSansSC.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}

        {/* Register service worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) { console.log('[SW] registered'); })
                    .catch(function(err) { console.warn('[SW] failed:', err); });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
