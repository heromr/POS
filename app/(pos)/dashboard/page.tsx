'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store-context'
import { formatIQD } from '@/lib/data'
import { CloseDayModal } from '@/components/pos/close-day-modal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Banknote,
  ShoppingBag,
  AlertTriangle,
  Trophy,
  LockKeyhole,
} from 'lucide-react'

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', accent ?? 'bg-primary/10')}>
        <Icon className={cn('w-5 h-5', accent ? 'text-white' : 'text-primary')} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-bold mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { transactions, products, settings } = useStore()
  const [closeDayOpen, setCloseDayOpen] = useState(false)
  const isRTL = settings.rtl

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // YYYY-MM-DD key for today
  const todayStr = today.toISOString().slice(0, 10)
  const isTodayClosed = settings.closedDays?.includes(todayStr) ?? false

  const todaysTxns = transactions.filter((t) => new Date(t.date) >= today)
  const todaysRevenue = todaysTxns.reduce((s, t) => s + t.total, 0)
  const todaysCount = todaysTxns.length

  const lowStock = products.filter((p) => p.stock < 5)

  const bestProduct = [...products].sort((a, b) => b.soldCount - a.soldCount)[0]

  // Weekly data
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const arabicDays = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']

  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    d.setHours(0, 0, 0, 0)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    const revenue = transactions
      .filter((t) => {
        const dt = new Date(t.date)
        return dt >= d && dt < next
      })
      .reduce((s, t) => s + t.total, 0)
    return {
      day: isRTL ? arabicDays[d.getDay()] : days[d.getDay()],
      revenue,
      transactions: transactions.filter((t) => {
        const dt = new Date(t.date)
        return dt >= d && dt < next
      }).length,
    }
  })

  // Recent transactions (last 8)
  const recent = transactions.slice(0, 8)

  const totalRevenue = transactions.reduce((s, t) => s + t.total, 0)

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 gap-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">{isRTL ? 'لوحة التحكم' : 'Dashboard'}</h1>
          <p className="text-sm text-muted-foreground">
            {today.toLocaleDateString(isRTL ? 'ar-IQ' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isTodayClosed && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20">
              <LockKeyhole className="w-3.5 h-3.5" />
              {isRTL ? 'اليوم مغلق' : 'Day Closed'}
            </span>
          )}
          <Button
            variant="outline"
            onClick={() => setCloseDayOpen(true)}
            disabled={isTodayClosed}
            className={cn(
              'gap-2 border-border text-sm font-semibold',
              isTodayClosed && 'opacity-50 cursor-not-allowed'
            )}
          >
            <LockKeyhole className="w-4 h-4" />
            {isRTL ? 'إغلاق اليوم' : 'Close Day'}
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Banknote}
          label={isRTL ? 'إيرادات اليوم' : "Today's Revenue"}
          value={formatIQD(todaysRevenue)}
          sub={isRTL ? `${todaysCount} معاملة` : `${todaysCount} transactions`}
        />
        <StatCard
          icon={ShoppingBag}
          label={isRTL ? 'إجمالي المعاملات' : 'Total Transactions'}
          value={transactions.length.toString()}
          sub={formatIQD(totalRevenue)}
        />
        <StatCard
          icon={AlertTriangle}
          label={isRTL ? 'نقص في المخزون' : 'Low Stock Items'}
          value={lowStock.length.toString()}
          sub={lowStock.map((p) => p.nameEn).join(', ') || (isRTL ? 'لا توجد مشاكل' : 'All good')}
          accent={lowStock.length > 0 ? 'bg-warning' : undefined}
        />
        <StatCard
          icon={Trophy}
          label={isRTL ? 'أكثر المنتجات مبيعاً' : 'Best Selling Product'}
          value={bestProduct?.nameAr ?? '-'}
          sub={`${bestProduct?.soldCount ?? 0} ${isRTL ? 'مبيع' : 'sold'}`}
          accent="bg-primary"
        />
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold mb-4">{isRTL ? 'المبيعات الأسبوعية' : 'Weekly Sales'}</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weeklyData} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              width={48}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--foreground)',
              }}
              formatter={(value: number) => [formatIQD(value), isRTL ? 'الإيراد' : 'Revenue']}
            />
            <Bar dataKey="revenue" fill="var(--primary)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent transactions */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold">{isRTL ? 'آخر المعاملات' : 'Recent Transactions'}</h2>
        </div>        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary border-b border-border text-muted-foreground text-xs">
              <th className="px-5 py-2.5 font-medium text-left">{isRTL ? 'الرقم' : 'ID'}</th>
              <th className="px-5 py-2.5 font-medium text-left">{isRTL ? 'التاريخ' : 'Date'}</th>
              <th className="px-5 py-2.5 font-medium text-left hidden md:table-cell">{isRTL ? 'المنتجات' : 'Items'}</th>
              <th className="px-5 py-2.5 font-medium text-right">{isRTL ? 'الإجمالي' : 'Total'}</th>
              <th className="px-5 py-2.5 font-medium text-right hidden sm:table-cell">{isRTL ? 'الدفع' : 'Payment'}</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((txn) => (
              <tr key={txn.id} className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors">
                <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{txn.id.slice(0, 12)}...</td>
                <td className="px-5 py-3 text-xs" suppressHydrationWarning>
                  <p suppressHydrationWarning>{new Date(txn.date).toLocaleDateString()}</p>
                  <p className="text-muted-foreground" suppressHydrationWarning>{new Date(txn.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </td>
                <td className="px-5 py-3 text-xs text-muted-foreground hidden md:table-cell">
                  {txn.items.slice(0, 2).map(i => i.nameEn).join(', ')}
                  {txn.items.length > 2 && ` +${txn.items.length - 2}`}
                </td>
                <td className="px-5 py-3 text-right font-semibold">{formatIQD(txn.total)}</td>
                <td className="px-5 py-3 text-right hidden sm:table-cell">
                  <span className={cn(
                    'px-2 py-0.5 rounded-md text-xs font-medium',
                    txn.paymentMethod === 'cash' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                  )}>
                    {txn.paymentMethod === 'cash' ? (isRTL ? 'نقدي' : 'Cash') : (isRTL ? 'بطاقة' : 'Card')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CloseDayModal
        open={closeDayOpen}
        onClose={() => setCloseDayOpen(false)}
        dateStr={todayStr}
      />
    </div>
  )
}
