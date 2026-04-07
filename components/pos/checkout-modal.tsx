'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/lib/store-context'
import { formatIQD, Transaction } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { CreditCard, Banknote, Printer, CheckCircle } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  subtotal: number
  discount: number
  total: number
  onSuccess: () => void
}

export function CheckoutModal({ open, onClose, subtotal, discount, total, onSuccess }: Props) {
  const { cart, settings, addTransaction, clearCart } = useStore()
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [completed, setCompleted] = useState(false)
  const [txn, setTxn] = useState<Transaction | null>(null)
  const receiptRef = useRef<HTMLDivElement>(null)
  const isRTL = settings.rtl

  const cashAmount = parseInt(amountPaid.replace(/,/g, '')) || 0
  const change = paymentMethod === 'cash' ? cashAmount - total : 0
  const canCheckout = paymentMethod === 'card' || cashAmount >= total

  const tax = Math.round(total * (settings.taxRate / 100))
  const grandTotal = total + tax

  // ── Enter key: confirm payment or close receipt ───────────────────────
  // Attached to the window only while the modal is open. We skip the press
  // if focus is inside the cash-amount <input> so the user can type freely.
  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter') return
      // If focus is in any input, let the input handle it normally
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      e.preventDefault()
      if (completed) {
        // Receipt screen → close modal
        handleClose()
      } else if (canCheckout) {
        // Payment screen → confirm
        handleCheckout()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, completed, canCheckout])

  function handleCheckout() {
    const now = new Date()
    const newTxn: Transaction = {
      id: `TXN-${Date.now()}`,
      date: now.toISOString(),
      items: cart.map((item) => ({
        nameAr: item.product.nameAr,
        nameEn: item.product.nameEn,
        quantity: item.quantity,
        unitPrice: item.product.price,
        total: item.product.price * item.quantity,
        costPrice: item.product.costPrice,
      })),
      subtotal,
      discount,
      tax,
      total: grandTotal,
      paymentMethod,
      amountPaid: paymentMethod === 'cash' ? cashAmount : grandTotal,
      change: paymentMethod === 'cash' ? change : 0,
    }
    addTransaction(newTxn)
    setTxn(newTxn)
    setCompleted(true)
  }

  function handlePrint() {
    window.print()
  }

  function handleClose() {
    if (completed) {
      clearCart()
      onSuccess()
    }
    setCompleted(false)
    setTxn(null)
    setAmountPaid('')
    setPaymentMethod('cash')
    onClose()
  }

  const now = new Date()

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-card border-border text-foreground" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isRTL ? 'الدفع' : 'Checkout'}
          </DialogTitle>
          <DialogDescription>
            {isRTL ? 'اختر طريقة الدفع وأكّد العملية.' : 'Select a payment method and confirm the transaction.'}
          </DialogDescription>
        </DialogHeader>

        {!completed ? (
          <div className="flex flex-col gap-5">
            {/* Payment method */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {isRTL ? 'طريقة الدفع' : 'Payment Method'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(['cash', 'card'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                      paymentMethod === method
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    {method === 'cash' ? (
                      <Banknote className="w-7 h-7" />
                    ) : (
                      <CreditCard className="w-7 h-7" />
                    )}
                    <span className="font-semibold text-sm">
                      {method === 'cash'
                        ? isRTL ? 'نقدي' : 'Cash'
                        : isRTL ? 'بطاقة' : 'Card'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-secondary rounded-xl p-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isRTL ? 'المجموع الفرعي' : 'Subtotal'}</span>
                <span>{formatIQD(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>{isRTL ? 'الخصم' : 'Discount'}</span>
                  <span>- {formatIQD(discount)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isRTL ? 'الضريبة' : 'Tax'} ({settings.taxRate}%)</span>
                  <span>{formatIQD(tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                <span>{isRTL ? 'الإجمالي' : 'Total'}</span>
                <span className="text-primary">{formatIQD(grandTotal)}</span>
              </div>
            </div>

            {/* Cash input */}
            {paymentMethod === 'cash' && (
              <div className="flex flex-col gap-2">
                <label className="text-sm text-muted-foreground">
                  {isRTL ? 'المبلغ المستلم (د.ع)' : 'Amount Received (IQD)'}
                </label>
                <Input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={grandTotal.toString()}
                  className="text-lg h-12 bg-input border-border"
                  autoFocus
                />
                {cashAmount >= grandTotal && (
                  <div className="flex justify-between text-sm bg-success/10 text-success rounded-lg px-3 py-2 font-semibold">
                    <span>{isRTL ? 'الباقي' : 'Change'}</span>
                    <span>{formatIQD(change)}</span>
                  </div>
                )}
                {amountPaid && cashAmount < grandTotal && (
                  <p className="text-xs text-destructive">
                    {isRTL ? 'المبلغ غير كافٍ' : 'Insufficient amount'}
                  </p>
                )}
              </div>
            )}

            <Button
              onClick={handleCheckout}
              disabled={!canCheckout}
              className="h-14 text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
            >
              {isRTL ? 'تأكيد الدفع' : 'Confirm Payment'}
            </Button>
          </div>
        ) : (
          /* Receipt */
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">{isRTL ? 'تمت العملية بنجاح' : 'Payment Successful'}</span>
            </div>

            <div id="receipt-print" ref={receiptRef} className="bg-white text-black rounded-xl p-4 text-sm font-mono border border-border">
              <div className="text-center mb-3">
                <p className="font-bold text-base">{settings.storeNameAr}</p>
                <p className="font-bold">{settings.storeName}</p>
                <p className="text-xs mt-1">{settings.address}</p>
                <p className="text-xs">{settings.phone}</p>
                <p className="text-xs mt-1">
                  {now.toLocaleDateString()} {now.toLocaleTimeString()}
                </p>
                <p className="text-xs text-gray-500">#{txn?.id}</p>
              </div>
              <div className="border-t border-dashed border-gray-400 my-2" />
              {txn?.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs mb-1">
                  <div className="flex-1">
                    <span>{item.nameAr} / {item.nameEn}</span>
                    <span className="text-gray-500 mx-1">x{item.quantity}</span>
                  </div>
                  <span>{item.total.toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-gray-400 my-2" />
              <div className="flex justify-between text-xs"><span>Subtotal</span><span>{txn?.subtotal.toLocaleString()}</span></div>
              {(txn?.discount ?? 0) > 0 && <div className="flex justify-between text-xs"><span>Discount</span><span>-{txn?.discount.toLocaleString()}</span></div>}
              {(txn?.tax ?? 0) > 0 && <div className="flex justify-between text-xs"><span>Tax</span><span>{txn?.tax.toLocaleString()}</span></div>}
              <div className="flex justify-between font-bold mt-1"><span>Total IQD</span><span>{txn?.total.toLocaleString()}</span></div>
              <div className="flex justify-between text-xs mt-1"><span>Paid ({txn?.paymentMethod})</span><span>{txn?.amountPaid.toLocaleString()}</span></div>
              {(txn?.change ?? 0) > 0 && <div className="flex justify-between text-xs"><span>Change</span><span>{txn?.change.toLocaleString()}</span></div>}
              <div className="border-t border-dashed border-gray-400 my-2" />
              <p className="text-center text-xs">{settings.receiptFooter}</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handlePrint} className="flex-1 gap-2 border-border">
                <Printer className="w-4 h-4" />
                {isRTL ? 'طباعة' : 'Print'}
              </Button>
              <Button onClick={handleClose} className="flex-1 bg-primary text-primary-foreground">
                {isRTL ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
