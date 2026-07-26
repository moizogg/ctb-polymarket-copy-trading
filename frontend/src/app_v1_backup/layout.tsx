import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { WalletSync } from '@/components/wallet-sync';
import { ClientOnly } from '@/components/client-only';
import { ApiBanner } from '@/components/api-banner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CTB · Copy Trading Console',
  description: 'Personal Polymarket copy-trading operator dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
        suppressHydrationWarning
      >
        <ClientOnly
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-500">
              Loading console…
            </div>
          }
        >
          <Providers>
            <WalletSync />
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <ApiBanner />
                <Topbar />
                <main className="flex-1 overflow-auto p-6">{children}</main>
              </div>
            </div>
          </Providers>
        </ClientOnly>
      </body>
    </html>
  );
}
