import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'MicroCosm',
  description: 'An interactive cellular ecosystem simulation.',
  robots: 'index, follow',
  openGraph: {
    title: 'MicroCosm',
    description: 'An interactive cellular ecosystem simulation.',
    url: 'https://micro-cosmos.web.app',
    siteName: 'MicroCosm',
    images: [
      {
        url: '/images/favicon.ico',
        width: 630,
        height: 630,
        alt: 'MicroCosmOS Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MicroCosm',
    description: 'An interactive cellular ecosystem simulation.',
    images: ['/images/favicon.ico'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=ZCOOL+KuaiLe&family=Vibes&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
