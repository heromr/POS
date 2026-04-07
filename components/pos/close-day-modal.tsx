'use client'

import { useMemo } from 'react'
import { useStore } from '@/lib/store-context'
import { formatIQD, Transaction } from '@/lib/data'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  Banknote,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  Trophy,
  X,
  FileDown,
  LockKeyhole,
} from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  dateStr: string // YYYY-MM-DD of the day being closed
}

/** Format a YYYY-MM-DD string for display */
function fmtDate(dateStr: string, rtl: boolean) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(rtl ? 'ar-IQ' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function CloseDayModal({ open, onClose, dateStr }: Props) {
  const { transactions, products, settings, closeDay } = useStore()
  const isRTL = settings.rtl

  // ── Compute today's summary ──────────────────────────────────────────
  const summary = useMemo(() => {
    const dayStart = new Date(dateStr + 'T00:00:00')
    const dayEnd = new Date(dateStr + 'T23:59:59.999')

    const dayTxns: Transaction[] = transactions.filter((t) => {
      const d = new Date(t.date)
      return d >= dayStart && d <= dayEnd
    })

    const revenue = dayTxns.reduce((s, t) => s + t.total, 0)
    const cash = dayTxns
      .filter((t) => t.paymentMethod === 'cash')
      .reduce((s, t) => s + t.total, 0)
    const card = dayTxns
      .filter((t) => t.paymentMethod === 'card')
      .reduce((s, t) => s + t.total, 0)
    const txnCount = dayTxns.length

    // Top 5 products by quantity sold today
    const qtyMap: Record<string, { nameEn: string; nameAr: string; qty: number; revenue: number }> = {}
    for (const t of dayTxns) {
      for (const item of t.items) {
        const key = item.nameEn
        if (!qtyMap[key]) qtyMap[key] = { nameEn: item.nameEn, nameAr: item.nameAr, qty: 0, revenue: 0 }
        qtyMap[key].qty += Math.abs(item.quantity)
        qtyMap[key].revenue += Math.abs(item.total)
      }
    }
    const top5 = Object.values(qtyMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)

    return { dayTxns, revenue, cash, card, txnCount, top5 }
  }, [transactions, dateStr])

  // ── PDF generation using jsPDF loaded from CDN ───────────────────────
  async function generatePDF() {
    // Dynamically load jsPDF from CDN
    if (typeof window === 'undefined') return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let jsPDFCtor: any
    if ((window as any).jspdf?.jsPDF) {
      jsPDFCtor = (window as any).jspdf.jsPDF
    } else {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
        s.onload = () => resolve()
        s.onerror = () => reject(new Error('Failed to load jsPDF'))
        document.head.appendChild(s)
      })
      jsPDFCtor = (window as any).jspdf.jsPDF
    }

    const doc = new jsPDFCtor({ unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const margin = 20
    let y = 20

    // Helper: centered text
    function centeredText(text: string, yPos: number, size = 12, style = 'normal') {
      doc.setFontSize(size)
      doc.setFont('helvetica', style)
      doc.text(text, pageW / 2, yPos, { align: 'center' })
    }

    function leftText(text: string, yPos: number, size = 10, style = 'normal') {
      doc.setFontSize(size)
      doc.setFont('helvetica', style)
      doc.text(text, margin, yPos)
    }

    function rightText(text: string, yPos: number, size = 10, style = 'normal') {
      doc.setFontSize(size)
      doc.setFont('helvetica', style)
      doc.text(text, pageW - margin, yPos, { align: 'right' })
    }

    function line(yPos: number, dashed = false) {
      doc.setDrawColor(180, 180, 180)
      if (dashed) {
        doc.setLineDashPattern([2, 2], 0)
      } else {
        doc.setLineDashPattern([], 0)
      }
      doc.line(margin, yPos, pageW - margin, yPos)
    }

    function checkPage(needed = 10) {
      if (y + needed > 275) {
        doc.addPage()
        y = 20
      }
    }

    // ── Header ────────────────────────────────────────────────────────
    centeredText(settings.storeNameAr, y, 16, 'bold')
    y += 7
    centeredText(settings.storeName, y, 14, 'bold')
    y += 7
    centeredText(settings.address, y, 9)
    y += 5
    centeredText(settings.phone, y, 9)
    y += 8
    line(y)
    y += 6

    centeredText('End of Day Report', y, 13, 'bold')
    y += 6
    centeredText(fmtDate(dateStr, false), y, 10)
    y += 2
    centeredText(`Generated: ${new Date().toLocaleString()}`, y, 8)
    y += 8
    line(y)
    y += 8

    // ── Daily Summary ─────────────────────────────────────────────────
    leftText('DAILY SUMMARY', y, 11, 'bold')
    y += 7

    const summaryRows = [
      ['Total Revenue', formatIQD(summary.revenue)],
      ['Total Transactions', summary.txnCount.toString()],
      ['Cash Revenue', formatIQD(summary.cash)],
      ['Card Revenue', formatIQD(summary.card)],
    ]

    for (const [label, value] of summaryRows) {
      checkPage(7)
      leftText(label, y, 10)
      rightText(value, y, 10)
      y += 6
    }

    y += 4
    line(y)
    y += 8

    // ── Top 5 Products ────────────────────────────────────────────────
    leftText('TOP 5 PRODUCTS BY QUANTITY SOLD', y, 11, 'bold')
    y += 7

    if (summary.top5.length === 0) {
      leftText('No sales recorded today.', y, 9)
      y += 6
    } else {
      // Table header
      doc.setFillColor(240, 240, 240)
      doc.rect(margin, y - 4, pageW - margin * 2, 7, 'F')
      leftText('#', y, 9, 'bold')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text('Product', margin + 8, y)
      doc.text('Qty Sold', pageW - margin - 40, y, { align: 'right' })
      doc.text('Revenue', pageW - margin, y, { align: 'right' })
      y += 7

      summary.top5.forEach((p, i) => {
        checkPage(7)
        leftText(`${i + 1}`, y, 9)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(p.nameEn, margin + 8, y)
        doc.text(p.qty.toString(), pageW - margin - 40, y, { align: 'right' })
        doc.text(formatIQD(p.revenue), pageW - margin, y, { align: 'right' })
        y += 6
      })
    }

    y += 4
    line(y)
    y += 8

    // ── Transactions Table ────────────────────────────────────────────
    leftText('TRANSACTIONS', y, 11, 'bold')
    y += 7

    if (summary.dayTxns.length === 0) {
      leftText('No transactions recorded today.', y, 9)
      y += 6
    } else {
      // Column widths
      const colW = {
        id:      50,
        time:    25,
        items:   30,
        method:  25,
        total:   0, // fills remaining
      }
      const totalColStart = margin + colW.id + colW.time + colW.items + colW.method

      // Header row
      doc.setFillColor(240, 240, 240)
      doc.rect(margin, y - 4, pageW - margin * 2, 7, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text('Transaction ID', margin, y)
      doc.text('Time', margin + colW.id, y)
      doc.text('Items', margin + colW.id + colW.time, y)
      doc.text('Method', margin + colW.id + colW.time + colW.items, y)
      doc.text('Total', pageW - margin, y, { align: 'right' })
      y += 7

      for (const txn of summary.dayTxns) {
        checkPage(7)
        const time = new Date(txn.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const itemsLabel = txn.items.length === 1
          ? txn.items[0].nameEn
          : `${txn.items[0].nameEn} +${txn.items.length - 1}`

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.text(txn.id.slice(0, 20), margin, y)
        doc.text(time, margin + colW.id, y)
        doc.text(itemsLabel.slice(0, 16), margin + colW.id + colW.time, y)
        doc.text(txn.paymentMethod, margin + colW.id + colW.time + colW.items, y)
        doc.text(formatIQD(txn.total), pageW - margin, y, { align: 'right' })
        y += 6
      }
    }

    y += 6
    line(y, true)
    y += 6
    centeredText(settings.receiptFooter, y, 9)

    doc.save(`DayClose_${dateStr}.pdf`)
  }

  async function handleConfirm() {
    await generatePDF()
    closeDay(dateStr)
    onClose()
  }

  const isAlreadyClosed = settings.closedDays.includes(dateStr)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-lg bg-card border-border text-foreground overflow-y-auto max-h-[90vh]"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <LockKeyhole className="w-5 h-5 text-primary" />
            {isRTL ? 'إغلاق اليوم' : 'Close Day'}
          </DialogTitle>
          <DialogDescription>
            {isRTL
              ? `ملخص يوم ${fmtDate(dateStr, true)}`
              : `Summary for ${fmtDate(dateStr, false)}`}
          </DialogDescription>
        </DialogHeader>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 gap-3 mt-1">
          <SummaryCard
            icon={TrendingUp}
            label={isRTL ? 'إجمالي الإيرادات' : 'Total Revenue'}
            value={formatIQD(summary.revenue)}
            accent="bg-primary"
          />
          <SummaryCard
            icon={ShoppingBag}
            label={isRTL ? 'عدد المعاملات' : 'Transactions'}
            value={summary.txnCount.toString()}
          />
          <SummaryCard
            icon={Banknote}
            label={isRTL ? 'نقدي' : 'Cash'}
            value={formatIQD(summary.cash)}
          />
          <SummaryCard
            icon={CreditCard}
            label={isRTL ? 'بطاقة' : 'Card'}
            value={formatIQD(summary.card)}
          />
        </div>

        {/* ── Top 5 products ── */}
        <div className="bg-secondary/50 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 font-semibold text-sm mb-3">
            <Trophy className="w-4 h-4 text-primary" />
            {isRTL ? 'أفضل 5 منتجات مبيعاً اليوم' : 'Top 5 Products Today'}
          </div>
          {summary.top5.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              {isRTL ? 'لا توجد مبيعات اليوم' : 'No sales today'}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {summary.top5.map((p, i) => (
                <div key={p.nameEn} className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate">{isRTL ? p.nameAr : p.nameEn}</span>
                  <span className="text-muted-foreground text-xs shrink-0">
                    {isRTL ? `${p.qty} قطعة` : `${p.qty} units`}
                  </span>
                  <span className="font-semibold text-xs shrink-0">{formatIQD(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Info note ── */}
        <p className="text-xs text-muted-foreground leading-relaxed bg-secondary/40 rounded-lg px-3 py-2">
          {isRTL
            ? 'سيتم تنزيل تقرير PDF وإغلاق اليوم. لن تتمكن من إجراء مبيعات جديدة اليوم (إذا كان الإعداد مفعّلاً).'
            : 'A PDF report will be downloaded and the day will be marked as closed. New sales will be blocked for today if the setting is enabled.'}
        </p>

        {/* ── Actions ── */}
        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1 border-border gap-2">
            <X className="w-4 h-4" />
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isAlreadyClosed}
            className={cn(
              'flex-1 gap-2 font-semibold',
              isAlreadyClosed
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            <FileDown className="w-4 h-4" />
            {isAlreadyClosed
              ? (isRTL ? 'تم الإغلاق بالفعل' : 'Already Closed')
              : (isRTL ? 'تأكيد وتنزيل PDF' : 'Confirm & Download PDF')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-3.5 flex items-start gap-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', accent ?? 'bg-secondary')}>
        <Icon className={cn('w-4 h-4', accent ? 'text-white' : 'text-muted-foreground')} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground leading-tight">{label}</p>
        <p className="text-base font-bold mt-0.5 truncate">{value}</p>
      </div>
    </div>
  )
}
