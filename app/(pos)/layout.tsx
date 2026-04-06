'use client'

import { Suspense } from 'react'
import { StoreProvider, useStore } from '@/lib/store-context'
import { Sidebar } from '@/components/pos/sidebar'

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
}

function PosLayoutInner({ children }: { children: React.ReactNode }) {
  const { settings } = useStore()
  return (
    <div
      className="flex h-screen overflow-hidden bg-background"
      dir={settings.rtl ? 'rtl' : 'ltr'}
    >
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </main>
    </div>
  )
}

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <PosLayoutInner>{children}</PosLayoutInner>
    </StoreProvider>
  )
}
