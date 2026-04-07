'use client'

import { useState, useMemo, useEffect } from 'react'
import { useStore } from '@/lib/store-context'
import { formatIQD, Transaction } from '@/lib/data'
import { cn } from '@/lib/utils'
import { Calendar, FileText, X, RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ReportsPage() {
  const { transactions, settings, refundTransaction } = useStore()
  const isRTL = settings.rtl
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null)
  const [refundTarget, setRefundTarget] = useState<Transaction | null>(null)
  const [mounted, setMounted] = useState(false)

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

  const safeFiltered = mounted ? filtered : []

  // Refund records have negative totals — summing all totals correctly reduces revenue
  const totalRevenue = safeFiltered.reduce((s, t) => s + t.total, 0)
  const cashRevenue = safeFiltered.filter((t) => t.paymentMethod === 'cash').reduce((s, t) => s + t.total, 0)
  const cardRevenue = safeFiltered.filter((t) => t.paymentMethod === 'card').reduce((s, t) => s + t.total, 0)
  // Only count non-refund transactions toward "count" and "avg order"
  const saleTxns = safeFiltered.filter((t) => !t.originalTransactionId)
  const avgOrder = saleTxns.length > 0 ? Math.round(saleTxns.reduce((s, t) => s + t.total, 0) / saleTxns.length) : 0

  const lbl = {
    title: isRTL ? 'التقارير' : 'Reports',
    from: isRTL ? 'من' : 'From',
    to: isRTL ? 'إلى' : 'To',
    totalRevenue: isRTL ? 'إجمالي الإيرادات' : 'Total Revenue',
    totalTxns: isRTL ? 'إجمالي المبيعات' : 'Total Sales',
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
    refund: isRTL ? 'استرجاع' : 'Refund',
    refunded: isRTL ? 'مسترجع' : 'Refunded',
    refundRecord: isRTL ? 'سجل استرجاع' : 'Refund Record',
    confirmRefundTitle: isRTL ? 'تأكيد الاسترجاع' : 'Confirm Refund',
    confirmRefundDesc: isRTL
      ? 'هل أنت متأكد من استرجاع هذه المعاملة؟ سيتم إعادة المخزون وتسجيل قيمة سالبة في الإيرادات.'
      : 'Are you sure you want to refund this transaction? Stock will be restored and a negative entry will be recorded in revenue.',
    confirmRefundBtn: isRTL ? 'تأكيد الاسترجاع' : 'Confirm Refund',
    cancel: isRTL ? 'إلغاء' : 'Cancel',
    originalTxn: isRTL ? 'المعاملة الأصلية' : 'Original Transaction',
    actions: isRTL ? 'إجراءات' : 'Actions',
  }

  const thStart = isRTL ? 'text-right' : 'text-left'
  const thEnd = 'text-right'

  function handleRefundClick(e: React.MouseEvent, txn: Transaction) {
    e.stopPropagation()
    setRefundTarget(txn)
  }

  function handleConfirmRefund() {
    if (!refundTarget) return
    refundTransaction(refundTarget.id)
    // Refresh selectedTxn if it was open for this transaction
    setSelectedTxn((prev) =>
      prev?.id === refundTarget.id ? { ...prev, refunded: true, refundId: `RFD-${Date.now()}` } : prev
    )
    setRefundTarget(null)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 gap-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-xl font-bold">{lbl.title}</h1>
      </div>

      {/* Date filter */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {lbl.from}
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
            {lbl.to}
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
          { label: lbl.totalRevenue, value: formatIQD(totalRevenue), accent: true },
          { label: lbl.totalTxns, value: saleTxns.length.toString() },
          { label: lbl.cashRevenue, value: formatIQD(cashRevenue) },
          { label: lbl.cardRevenue, value: formatIQD(cardRevenue) },
          { label: lbl.avgOrder, value: formatIQD(avgOrder) },
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
            <p className="text-sm">{lbl.noData}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary border-b border-border text-muted-foreground text-xs">
                  <th className={cn('px-5 py-3 font-medium', thStart)}>{lbl.id}</th>
                  <th className={cn('px-5 py-3 font-medium', thStart)}>{lbl.date}</th>
                  <th className={cn('px-5 py-3 font-medium hidden md:table-cell', thStart)}>{lbl.items}</th>
                  <th className={cn('px-5 py-3 font-medium', thEnd)}>{lbl.total}</th>
                  <th className={cn('px-5 py-3 font-medium', thEnd)}>{lbl.payment}</th>
                  <th className={cn('px-5 py-3 font-medium', thEnd)}>{lbl.actions}</th>
                </tr>
              </thead>
              <tbody>
                {safeFiltered.map((txn) => {
                  const isRefundRecord = !!txn.originalTransactionId
                  const isRefunded = !!txn.refunded

                  return (
                    <tr
                      key={txn.id}
                      className={cn(
                        'border-b border-border last:border-0 transition-colors cursor-pointer',
                        isRefundRecord
                          ? 'bg-destructive/5 hover:bg-destructive/10'
                          : isRefunded
                          ? 'bg-destructive/5 hover:bg-destructive/10'
                          : 'hover:bg-secondary/40'
                      )}
                      onClick={() => setSelectedTxn(txn)}
                    >
                      {/* ID + badges */}
                      <td className={cn('px-5 py-3', thStart)}>
                        <p className="font-mono text-xs text-muted-foreground">{txn.id}</p>
                        {isRefundRecord && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-destructive/15 text-destructive">
                            {lbl.refundRecord}
                          </span>
                        )}
                        {isRefunded && !isRefundRecord && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-destructive/15 text-destructive">
                            {lbl.refunded}
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className={cn('px-5 py-3 text-xs', thStart)}>
                        <p>{new Date(txn.date).toLocaleDateString(isRTL ? 'ar-IQ' : 'en-US')}</p>
                        <p className="text-muted-foreground">
                          {new Date(txn.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>

                      {/* Items */}
                      <td className="px-5 py-3 text-xs text-muted-foreground hidden md:table-cell max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {txn.items.map((item, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-secondary rounded text-xs">
                              {item.nameEn} x{Math.abs(item.quantity)}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Total — show negative in red for refund records */}
                      <td className={cn('px-5 py-3 text-right font-semibold', isRefundRecord && 'text-destructive')}>
                        {isRefundRecord && '- '}
                        {formatIQD(Math.abs(txn.total))}
                      </td>

                      {/* Payment method */}
                      <td className="px-5 py-3 text-right">
                        <span className={cn(
                          'px-2 py-0.5 rounded-md text-xs font-medium',
                          txn.paymentMethod === 'cash'
                            ? 'bg-success/10 text-success'
                            : 'bg-primary/10 text-primary'
                        )}>
                          {txn.paymentMethod === 'cash' ? lbl.cash : lbl.card}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3 text-right">
                        {!isRefundRecord && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isRefunded}
                            onClick={(e) => handleRefundClick(e, txn)}
                            className={cn(
                              'h-7 px-2 text-xs gap-1',
                              isRefunded
                                ? 'opacity-40 cursor-not-allowed'
                                : 'border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive'
                            )}
                          >
                            <RotateCcw className="w-3 h-3" />
                            {lbl.refund}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Transaction Details Modal ─────────────────────────────────────────── */}
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
            {/* Header */}
            <div style={{ flexShrink: 0 }} className="p-4 border-b border-border flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-base font-semibold">{lbl.details}</p>
                  {selectedTxn.originalTransactionId && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-destructive/15 text-destructive">
                      {lbl.refundRecord}
                    </span>
                  )}
                  {selectedTxn.refunded && !selectedTxn.originalTransactionId && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-destructive/15 text-destructive">
                      {lbl.refunded}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedTxn.id} &mdash; {new Date(selectedTxn.date).toLocaleString(isRTL ? 'ar-IQ' : 'en-US')}
                </p>
                {selectedTxn.originalTransactionId && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lbl.originalTxn}: <span className="font-mono">{selectedTxn.originalTransactionId}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', flex: 1 }} className="p-4 flex flex-col gap-4">
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-secondary text-muted-foreground">
                      <th className={cn('px-3 py-2 font-medium', thStart)}>{lbl.item}</th>
                      <th className={cn('px-3 py-2 font-medium', thEnd)}>{lbl.qty}</th>
                      <th className={cn('px-3 py-2 font-medium', thEnd)}>{lbl.unitPrice}</th>
                      <th className={cn('px-3 py-2 font-medium', thEnd)}>{lbl.total}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTxn.items.map((item, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2">
                          <p>{item.nameAr}</p>
                          <p className="text-muted-foreground">{item.nameEn}</p>
                        </td>
                        <td className="px-3 py-2 text-right">{Math.abs(item.quantity)}</td>
                        <td className="px-3 py-2 text-right">{formatIQD(item.unitPrice)}</td>
                        <td className={cn('px-3 py-2 text-right font-semibold', selectedTxn.originalTransactionId && 'text-destructive')}>
                          {formatIQD(Math.abs(item.total))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-secondary rounded-lg p-3 flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{lbl.subtotal}</span>
                  <span>{formatIQD(Math.abs(selectedTxn.subtotal))}</span>
                </div>
                {selectedTxn.discount !== 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>{lbl.discount}</span>
                    <span>- {formatIQD(Math.abs(selectedTxn.discount))}</span>
                  </div>
                )}
                {selectedTxn.tax !== 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{lbl.tax}</span>
                    <span>{formatIQD(Math.abs(selectedTxn.tax))}</span>
                  </div>
                )}
                <div className={cn(
                  'flex justify-between font-bold text-base pt-1.5 border-t border-border',
                  selectedTxn.originalTransactionId && 'text-destructive'
                )}>
                  <span>{lbl.total}</span>
                  <span>
                    {selectedTxn.originalTransactionId ? '- ' : ''}
                    {formatIQD(Math.abs(selectedTxn.total))}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>{lbl.paid} ({selectedTxn.paymentMethod === 'cash' ? lbl.cash : lbl.card})</span>
                  <span>{formatIQD(Math.abs(selectedTxn.amountPaid))}</span>
                </div>
                {selectedTxn.change !== 0 && (
                  <div className="flex justify-between text-xs text-success">
                    <span>{lbl.change}</span>
                    <span>{formatIQD(Math.abs(selectedTxn.change))}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ flexShrink: 0 }} className="p-4 border-t border-border flex gap-2">
              {!selectedTxn.originalTransactionId && (
                <Button
                  variant="outline"
                  disabled={!!selectedTxn.refunded}
                  onClick={(e) => {
                    handleRefundClick(e, selectedTxn)
                    setSelectedTxn(null)
                  }}
                  className={cn(
                    'flex-1 gap-1.5',
                    selectedTxn.refunded
                      ? 'opacity-40 cursor-not-allowed'
                      : 'border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive'
                  )}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {selectedTxn.refunded ? lbl.refunded : lbl.refund}
                </Button>
              )}
              <Button
                onClick={() => setSelectedTxn(null)}
                className="flex-1 bg-primary text-primary-foreground"
              >
                {lbl.close}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Refund Confirmation Modal ─────────────────────────────────────────── */}
      {refundTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          dir={isRTL ? 'rtl' : 'ltr'}
          onClick={() => setRefundTarget(null)}
        >
          <div
            className="bg-card border border-border rounded-xl w-full max-w-md flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4 text-destructive" />
                </div>
                <p className="font-semibold text-base">{lbl.confirmRefundTitle}</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{lbl.confirmRefundDesc}</p>
            </div>

            {/* Transaction summary */}
            <div className="p-4 flex flex-col gap-2">
              <div className="bg-secondary rounded-lg p-3 text-xs flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lbl.id}</span>
                  <span className="font-mono">{refundTarget.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lbl.date}</span>
                  <span>{new Date(refundTarget.date).toLocaleString(isRTL ? 'ar-IQ' : 'en-US')}</span>
                </div>
                <div className="flex justify-between font-semibold text-sm pt-1 border-t border-border">
                  <span>{lbl.total}</span>
                  <span className="text-destructive">{formatIQD(refundTarget.total)}</span>
                </div>
              </div>

              {/* Items preview */}
              <div className="flex flex-wrap gap-1">
                {refundTarget.items.map((item, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-secondary rounded text-xs text-muted-foreground">
                    {item.nameEn} x{item.quantity}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex gap-2">
              <Button
                variant="outline"
                onClick={() => setRefundTarget(null)}
                className="flex-1"
              >
                {lbl.cancel}
              </Button>
              <Button
                onClick={handleConfirmRefund}
                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {lbl.confirmRefundBtn}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
