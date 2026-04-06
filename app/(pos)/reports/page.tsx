'use client'

import { useState, useMemo, useEffect } from 'react'
import { useStore } from '@/lib/store-context'
import { formatIQD, Transaction } from '@/lib/data'
import { cn } from '@/lib/utils'
import { Calendar, FileText, TrendingUp, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'


export default function ReportsPage() {
  const { transactions, settings } = useStore()
  const isRTL = settings.rtl
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null)
  const [mounted, setMounted] = useState(false)

  // Lazy initialisers run only on the client, preventing SSR/client date mismatch
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    setToDate(new Date().toISOString().split('T')[0])
    setMounted(true)
  }, [])

  const filtered = useMemo(() => {
    const from = new Date(fromDate)
    from.setHours(0, 0, 0, 0)
    const to = new Date(toDate)
    to.setHours(23, 59, 59, 999)
    return transactions.filter((t) => {
      const d = new Date(t.date)
      return d >= from && d <= to
    })
  }, [transactions, fromDate, toDate])

  // Only compute after mount so SSR and first client render produce identical output (empty state)
  const safeFiltered = mounted ? filtered : []
  const totalRevenue = safeFiltered.reduce((s, t) => s + t.total, 0)
  const cashRevenue = safeFiltered.filter((t) => t.paymentMethod === 'cash').reduce((s, t) => s + t.total, 0)
  const cardRevenue = safeFiltered.filter((t) => t.paymentMethod === 'card').reduce((s, t) => s + t.total, 0)
  const avgOrder = safeFiltered.length > 0 ? Math.round(totalRevenue / safeFiltered.length) : 0

  const t = {
    title: isRTL ? 'التقارير' : 'Reports',
    from: isRTL ? 'من' : 'From',
    to: isRTL ? 'إلى' : 'To',
    totalRevenue: isRTL ? 'إجمالي الإيرادات' : 'Total Revenue',
    totalTxns: isRTL ? 'إجمالي المعاملات' : 'Total Transactions',
    cashRevenue: isRTL ? 'إيرادات نقدية' : 'Cash Revenue',
    cardRevenue: isRTL ? 'إيرادات بطاقة' : 'Card Revenue',
    avgOrder: isRTL ? 'متوسط الطلب' : 'Avg. Order',
    id: isRTL ? 'الرقم' : 'ID',
    date: isRTL ? 'التاريخ' : 'Date',
    items: isRTL ? 'المنتجات' : 'Items',
    total: isRTL ? 'الإجمالي' : 'Total',
    payment: isRTL ? 'طريقة الدفع' : 'Payment',
    cash: isRTL ? 'نقدي' : 'Cash',
    card: isRTL ? 'بطاقة' : 'Card',
    noData: isRTL ? 'لا توجد معاملات في هذا النطاق' : 'No transactions in this date range',
    details: isRTL ? 'تفاصيل المعاملة' : 'Transaction Details',
    item: isRTL ? 'المنتج' : 'Item',
    qty: isRTL ? 'الكمية' : 'Qty',
    unitPrice: isRTL ? 'سعر الوحدة' : 'Unit Price',
    subtotal: isRTL ? 'المجموع الفرعي' : 'Subtotal',
    discount: isRTL ? 'الخصم' : 'Discount',
    tax: isRTL ? 'الضريبة' : 'Tax',
    paid: isRTL ? 'المبلغ المدفوع' : 'Amount Paid',
    change: isRTL ? 'الباقي' : 'Change',
    close: isRTL ? 'إغلاق' : 'Close',
  }

  // Column alignment helper: in RTL text-right is "start", text-left is "end"
  const thStart = isRTL ? 'text-right' : 'text-left'
  const thEnd = 'text-right'

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 gap-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-xl font-bold">{t.title}</h1>
      </div>

      {/* Date filter */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {t.from}
          </label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9 bg-input border-border text-sm w-40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {t.to}
          </label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9 bg-input border-border text-sm w-40"
          />
        </div>
        <div className="text-sm text-muted-foreground self-center">
          {safeFiltered.length} {isRTL ? 'معاملة' : 'transactions found'}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: t.totalRevenue, value: formatIQD(totalRevenue), accent: true },
          { label: t.totalTxns, value: safeFiltered.length.toString() },
          { label: t.cashRevenue, value: formatIQD(cashRevenue) },
          { label: t.cardRevenue, value: formatIQD(cardRevenue) },
          { label: t.avgOrder, value: formatIQD(avgOrder) },
        ].map(({ label, value, accent }) => (
          <div
            key={label}
            className={cn(
              'rounded-xl border border-border p-4',
              accent ? 'bg-primary/10 border-primary/30' : 'bg-card'
            )}
          >
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={cn('font-bold text-base', accent && 'text-primary')}>{value}</p>
          </div>
        ))}
      </div>

      {/* Transactions table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-sm">{isRTL ? 'تفاصيل المعاملات' : 'Transaction Details'}</h2>
        </div>
        {safeFiltered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <FileText className="w-10 h-10 opacity-20" />
            <p className="text-sm">{t.noData}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary border-b border-border text-muted-foreground text-xs">
                  <th className={cn('px-5 py-3 font-medium', thStart)}>{t.id}</th>
                  <th className={cn('px-5 py-3 font-medium', thStart)}>{t.date}</th>
                  <th className={cn('px-5 py-3 font-medium hidden md:table-cell', thStart)}>{t.items}</th>
                  <th className={cn('px-5 py-3 font-medium', thEnd)}>{t.total}</th>
                  <th className={cn('px-5 py-3 font-medium', thEnd)}>{t.payment}</th>
                </tr>
              </thead>
              <tbody>
                {safeFiltered.map((txn) => (
                  <tr
                    key={txn.id}
                    className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors cursor-pointer"
                    onClick={() => setSelectedTxn(txn)}
                  >
                    <td className={cn('px-5 py-3 font-mono text-xs text-muted-foreground', thStart)}>
                      {txn.id}
                    </td>
                    <td className={cn('px-5 py-3 text-xs', thStart)}>
                      <p>{new Date(txn.date).toLocaleDateString(isRTL ? 'ar-IQ' : 'en-US')}</p>
                      <p className="text-muted-foreground">
                        {new Date(txn.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground hidden md:table-cell max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {txn.items.map((item, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-secondary rounded text-xs">
                            {item.nameEn} x{item.quantity}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">{formatIQD(txn.total)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={cn(
                        'px-2 py-0.5 rounded-md text-xs font-medium',
                        txn.paymentMethod === 'cash'
                          ? 'bg-success/10 text-success'
                          : 'bg-primary/10 text-primary'
                      )}>
                        {txn.paymentMethod === 'cash' ? t.cash : t.card}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Details — custom modal, no shadcn Dialog */}
      {selectedTxn && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          dir={isRTL ? 'rtl' : 'ltr'}
          onClick={() => setSelectedTxn(null)}
        >
          <div
            style={{ maxHeight: '85vh' }}
            className="bg-card border border-border rounded-xl w-full max-w-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pinned header */}
            <div style={{ flexShrink: 0 }} className="p-4 border-b border-border">
              <p className="text-base font-semibold">{t.details}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedTxn.id} &mdash; {new Date(selectedTxn.date).toLocaleString(isRTL ? 'ar-IQ' : 'en-US')}
              </p>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', flex: 1 }} className="p-4 flex flex-col gap-4">
              {/* Items table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-secondary text-muted-foreground">
                      <th className={cn('px-3 py-2 font-medium', thStart)}>{t.item}</th>
                      <th className={cn('px-3 py-2 font-medium', thEnd)}>{t.qty}</th>
                      <th className={cn('px-3 py-2 font-medium', thEnd)}>{t.unitPrice}</th>
                      <th className={cn('px-3 py-2 font-medium', thEnd)}>{t.total}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTxn.items.map((item, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2">
                          <p>{item.nameAr}</p>
                          <p className="text-muted-foreground">{item.nameEn}</p>
                        </td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{formatIQD(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatIQD(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="bg-secondary rounded-lg p-3 flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t.subtotal}</span>
                  <span>{formatIQD(selectedTxn.subtotal)}</span>
                </div>
                {selectedTxn.discount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>{t.discount}</span>
                    <span>- {formatIQD(selectedTxn.discount)}</span>
                  </div>
                )}
                {selectedTxn.tax > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t.tax}</span>
                    <span>{formatIQD(selectedTxn.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1.5 border-t border-border">
                  <span>{t.total}</span>
                  <span className="text-primary">{formatIQD(selectedTxn.total)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>{t.paid} ({selectedTxn.paymentMethod === 'cash' ? t.cash : t.card})</span>
                  <span>{formatIQD(selectedTxn.amountPaid)}</span>
                </div>
                {selectedTxn.change > 0 && (
                  <div className="flex justify-between text-xs text-success">
                    <span>{t.change}</span>
                    <span>{formatIQD(selectedTxn.change)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pinned footer */}
            <div style={{ flexShrink: 0 }} className="p-4 border-t border-border">
              <Button
                onClick={() => setSelectedTxn(null)}
                className="w-full bg-primary text-primary-foreground"
              >
                {t.close}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
