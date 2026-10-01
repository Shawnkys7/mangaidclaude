import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MangaID',
  description: 'Aplikasi baca manga bahasa Indonesia dengan pembaruan komik terbaru, terpopuler, dan fitur membaca yang nyaman.',
  openGraph: {
    title: 'MangaID',
    description: 'Aplikasi baca manga bahasa Indonesia dengan pembaruan komik terbaru, terpopuler, dan fitur membaca yang nyaman.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MangaID',
    description: 'Aplikasi baca manga bahasa Indonesia dengan pembaruan komik terbaru, terpopuler, dan fitur membaca yang nyaman.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://img.komiku.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://img.komiku.org" />
        <link rel="dns-prefetch" href="https://image.komikid.org" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
