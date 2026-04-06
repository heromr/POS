'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store-context'
import {
  ShoppingCart,
  Package,
  LayoutDashboard,
  FileText,
  Settings,
  Store,
} from 'lucide-react'

const navItems = [
  { href: '/', icon: ShoppingCart, labelEn: 'Cashier', labelAr: 'الكاشير' },
  { href: '/products', icon: Package, labelEn: 'Products', labelAr: 'المنتجات' },
  { href: '/dashboard', icon: LayoutDashboard, labelEn: 'Dashboard', labelAr: 'لوحة التحكم' },
  { href: '/reports', icon: FileText, labelEn: 'Reports', labelAr: 'التقارير' },
  { href: '/settings', icon: Settings, labelEn: 'Settings', labelAr: 'الإعدادات' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { settings, products } = useStore()
  const lowStock = products.filter((p) => p.stock < 5).length
  const isRTL = settings.rtl

  return (
    <aside
      className={cn(
        'flex flex-col w-16 md:w-56 h-screen bg-sidebar border-border shrink-0',
        isRTL ? 'border-l' : 'border-r'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary shrink-0">
          <Store className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="hidden md:block min-w-0">
          <p className="text-xs font-semibold text-foreground truncate leading-tight">
            {isRTL ? settings.storeNameAr : settings.storeName}
          </p>
          <p className="text-xs text-muted-foreground">POS System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, labelEn, labelAr }) => {
          const isActive = pathname === href
          const showBadge = href === '/products' && lowStock > 0
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-sm font-medium relative',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="hidden md:block truncate">
                {isRTL ? labelAr : labelEn}
              </span>
              {showBadge && (
                <span className="hidden md:flex ml-auto items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold shrink-0">
                  {lowStock}
                </span>
              )}
              {showBadge && (
                <span className="md:hidden absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-destructive" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border hidden md:block">
        <p className="text-xs text-muted-foreground text-center">
          v1.0 &mdash; IQD
        </p>
      </div>
    </aside>
  )
}
