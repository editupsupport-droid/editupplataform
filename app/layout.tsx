import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AppProvider } from '@/components/app/app-provider'
import { AppPreferencesProvider } from '@/components/app/preferences-provider'
import { NotificationPermissionPopup } from '@/components/app/notification-permission-popup'
import { FreeTrialTasksWidget } from '@/components/dashboard/free-trial-tasks-widget'
import { getSiteUrl } from '@/lib/site-url'
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter"
})

export const metadata: Metadata = {
  title: 'EditUp - Plataforma para editores de vídeo',
  description: 'Uma plataforma completa para editores de vídeo com calculadora de valores, packs de edição, portfólio e recursos exclusivos.',
  metadataBase: new URL(getSiteUrl()),
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} bg-background`}>
      <body className={`${inter.className} font-sans antialiased`}>
        <AppPreferencesProvider>
          <AppProvider>
            {children}
            <NotificationPermissionPopup />
            <FreeTrialTasksWidget />
          </AppProvider>
        </AppPreferencesProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
