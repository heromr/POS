'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useStore } from '@/lib/store-context'
import { formatIQD, Product } from '@/lib/data'
import { CheckoutModal } from '@/components/pos/checkout-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Trash2,
  Plus,
  Minus,
  ScanBarcode,
  ShoppingCart,
  X,
  BadgePercent,
  Search,
  PackageX,
  Keyboard,
} from 'lucide-react'

export default function CashierPage() {
  const { products, cart, addToCart, updateQty, removeFromCart, clearCart, settings } = useStore()
  const [barcode, setBarcode] = useState('')
  const [search, setSearch] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('flat')
  const [discountValue, setDiscountValue] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const barcodeRef = useRef<HTMLInputElement>(null)
  const isRTL = settings.rtl

  // Keep barcode input focused unless the user is typing in search
  useEffect(() => {
    barcodeRef.current?.focus()
  }, [])

  // ── Keyboard shortcuts ────────────────────────────────────────────────
  // F2  → focus barcode input
  // F4  → open checkout (cart must be non-empty)
  // Escape is handled natively by shadcn Dialog via onOpenChange
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Never steal keypresses while the user is actively typing
      const tag = (e.target as HTMLElement).tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      if (e.key === 'F2') {
        e.preventDefault()
        barcodeRef.current?.focus()
        return
      }

      if (e.key === 'F4') {
        e.preventDefault()
        // Only open if cart has items and modal is not already open
        if (cart.length > 0 && !checkoutOpen) {
          setCheckoutOpen(true)
        }
        return
      }

      // Escape: close checkout if open (shadcn also does this, but we sync
      // our state explicitly in case the dialog is open without shadcn knowing)
      if (e.key === 'Escape' && !isTyping) {
        if (checkoutOpen) setCheckoutOpen(false)
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cart.length, checkoutOpen])

  function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    const term = barcode.trim()
    if (!term) return
    // Check product existence and stock before attempting add
    const product = products.find((p) => p.barcode === term)
    if (!product) {
      setErrorMsg(isRTL ? 'المنتج غير موجود' : 'Product not found')
      setTimeout(() => setErrorMsg(''), 2000)
    } else if (product.stock === 0) {
      setErrorMsg(isRTL ? 'نفد المخزون' : 'Out of stock')
      setTimeout(() => setErrorMsg(''), 2000)
    } else {
      const added = addToCart(term)
      if (!added) {
        setErrorMsg(isRTL ? 'وصلت إلى الحد الأقصى للمخزون' : 'Maximum stock reached')
        setTimeout(() => setErrorMsg(''), 2000)
      } else {
        setErrorMsg('')
      }
    }
    setBarcode('')
    barcodeRef.current?.focus()
  }

  function handleAddProduct(product: Product) {
    addToCart(product.barcode)
  }

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.nameAr.includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.category.toLowerCase().includes(q)
    )
  }, [products, search])

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const discountNum = parseInt(discountValue) || 0
  const discountAmount =
    discountType === 'percent' ? Math.round(subtotal * (discountNum / 100)) : discountNum
  const total = Math.max(0, subtotal - discountAmount)

  const t = {
    barcodeLabel: isRTL ? 'أدخل الباركود' : 'Scan or Enter Barcode',
    searchLabel: isRTL ? 'ابحث عن منتج...' : 'Search products...',
    addToCart: isRTL ? 'أضف للسلة' : 'Add to Cart',
    outOfStock: isRTL ? 'نفد المخزون' : 'Out of Stock',
    product: isRTL ? 'المنتج' : 'Product',
    qty: isRTL ? 'الكمية' : 'Qty',
    price: isRTL ? 'السعر' : 'Unit Price',
    itemTotal: isRTL ? 'الإجمالي' : 'Total',
    subtotal: isRTL ? 'المجموع الفرعي' : 'Subtotal',
    discount: isRTL ? 'الخصم' : 'Discount',
    grandTotal: isRTL ? 'الإجمالي الكلي' : 'Grand Total',
    checkout: isRTL ? 'الدفع' : 'Checkout',
    clearCart: isRTL ? 'مسح السلة' : 'Clear Cart',
    emptyCart: isRTL ? 'السلة فارغة' : 'Cart is empty',
    emptyCartSub: isRTL ? 'اضغط على منتج أو امسح الباركود للإضافة' : 'Tap a product or scan a barcode to add items',
    noResults: isRTL ? 'لا توجد منتجات مطابقة' : 'No matching products',
    products: isRTL ? 'المنتجات' : 'Products',
    cart: isRTL ? 'السلة' : 'Cart',
    shortcuts: isRTL ? 'اختصارات لوحة المفاتيح' : 'Keyboard shortcuts',
  }

  // Shortcut hint pills shown in the bottom bar
  const shortcuts = [
    { key: 'F2',     desc: isRTL ? 'تركيز الباركود'  : 'Focus barcode'    },
    { key: 'F4',     desc: isRTL ? 'فتح الدفع'        : 'Open checkout'    },
    { key: 'Enter',  desc: isRTL ? 'تأكيد الدفع'      : 'Confirm payment'  },
    { key: 'Escape', desc: isRTL ? 'إغلاق النافذة'    : 'Close modal'      },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── Main content row (products + cart) ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

      {/* ── Left: Products panel ── */}
      <div className="flex flex-col flex-1 min-w-0 border-e border-border overflow-hidden">

        {/* Barcode + search bar */}
        <div className="px-4 py-3 border-b border-border bg-card shrink-0 flex flex-col gap-2">
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none',
                  isRTL ? 'right-3' : 'left-3'
                )}
              />
              <Input
                ref={barcodeRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder={t.barcodeLabel}
                className={cn('h-10 text-sm bg-input border-border', isRTL ? 'pr-9' : 'pl-9')}
                autoComplete="off"
              />
            </div>
            <Button type="submit" className="h-10 px-4 bg-primary text-primary-foreground shrink-0">
              {isRTL ? 'إضافة' : 'Add'}
            </Button>
          </form>

          <div className="relative">
            <Search
              className={cn(
                'absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none',
                isRTL ? 'right-3' : 'left-3'
              )}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchLabel}
              className={cn('h-9 text-sm bg-input border-border', isRTL ? 'pr-9' : 'pl-9')}
            />
          </div>

          {errorMsg && <p className="text-destructive text-xs">{errorMsg}</p>}
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground py-16">
              <PackageX className="w-10 h-10 opacity-20" />
              <p className="text-sm">{t.noResults}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const cartItem = cart.find((c) => c.product.id === product.id)
                const inCart = cartItem ? cartItem.quantity : 0
                const outOfStock = product.stock === 0

                return (
                  <div
                    key={product.id}
                    className={cn(
                      'bg-card border rounded-xl flex flex-col overflow-hidden transition-all',
                      outOfStock ? 'opacity-50 border-border' : 'border-border hover:border-primary/50'
                    )}
                  >
                    {/* Image / placeholder */}
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image}
                        alt={product.nameEn}
                        className="w-full aspect-square object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-secondary flex items-center justify-center">
                        <span className="text-3xl font-bold text-muted-foreground select-none">
                          {(isRTL ? product.nameAr : product.nameEn).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="p-2 flex flex-col gap-1 flex-1">
                      <p className="text-xs font-semibold leading-tight line-clamp-2">
                        {isRTL ? product.nameAr : product.nameEn}
                      </p>
                      <p className="text-xs text-primary font-bold">{formatIQD(product.price)}</p>

                      {/* Stock indicator */}
                      {!outOfStock && (
                        <p className={cn(
                          'text-[10px]',
                          product.stock <= 3 ? 'text-destructive font-semibold' : 'text-muted-foreground'
                        )}>
                          {isRTL
                            ? `المخزون: ${product.stock}`
                            : `Stock: ${product.stock}`}
                          {inCart > 0 && ` (${isRTL ? 'في السلة' : 'cart'}: ${inCart})`}
                        </p>
                      )}
                      {inCart > 0 && inCart >= product.stock && (
                        <p className="text-[10px] text-amber-500 font-semibold">
                          {isRTL ? 'الحد الأقصى' : 'Max reached'}
                        </p>
                      )}
                    </div>

                    {/* Add button */}
                    <div className="px-2 pb-2">
                      <button
                        onClick={() => !outOfStock && handleAddProduct(product)}
                        disabled={outOfStock || inCart >= product.stock}
                        className={cn(
                          'w-full rounded-lg py-1.5 text-xs font-semibold transition-colors',
                          outOfStock || inCart >= product.stock
                            ? 'bg-secondary text-muted-foreground cursor-not-allowed'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        )}
                      >
                        {outOfStock
                          ? t.outOfStock
                          : inCart >= product.stock
                            ? (isRTL ? 'الحد الأقصى' : 'Max stock')
                            : t.addToCart}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Cart panel ── */}
      <div className="w-72 shrink-0 flex flex-col overflow-hidden bg-card">

        {/* Cart header */}
        <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            {t.cart}
            {cart.length > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </h2>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              {t.clearCart}
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground px-4 text-center py-8">
              <ShoppingCart className="w-12 h-12 opacity-15" />
              <p className="text-sm font-medium">{t.emptyCart}</p>
              <p className="text-xs leading-relaxed">{t.emptyCartSub}</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {cart.map((item) => (
                <div key={item.product.id} className="px-3 py-2.5 flex gap-2 items-start">
                  {/* Thumbnail */}
                  {item.product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.product.image}
                      alt={item.product.nameEn}
                      className="w-9 h-9 rounded-lg object-cover shrink-0 border border-border"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-secondary shrink-0 flex items-center justify-center border border-border">
                      <span className="text-sm font-bold text-muted-foreground">
                        {(isRTL ? item.product.nameAr : item.product.nameEn).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Name + controls */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">
                      {isRTL ? item.product.nameAr : item.product.nameEn}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{formatIQD(item.product.price)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <button
                        onClick={() => updateQty(item.product.id, -1)}
                        className="w-6 h-6 rounded bg-secondary hover:bg-accent flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.product.id, 1)}
                        disabled={item.quantity >= item.product.stock}
                        className={cn(
                          'w-6 h-6 rounded flex items-center justify-center transition-colors',
                          item.quantity >= item.product.stock
                            ? 'bg-secondary text-muted-foreground cursor-not-allowed opacity-50'
                            : 'bg-secondary hover:bg-accent'
                        )}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Line total + remove */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-semibold">
                      {formatIQD(item.product.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="w-5 h-5 rounded hover:bg-destructive/20 hover:text-destructive flex items-center justify-center transition-colors text-muted-foreground"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order summary + discount */}
        <div className="border-t border-border shrink-0 p-3 flex flex-col gap-3">
          {/* Discount */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <BadgePercent className="w-3.5 h-3.5" />
              <span>{t.discount}</span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setDiscountType('flat')}
                className={cn(
                  'flex-1 py-1 rounded text-xs font-medium border transition-colors',
                  discountType === 'flat'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'border-border text-muted-foreground'
                )}
              >
                IQD
              </button>
              <button
                onClick={() => setDiscountType('percent')}
                className={cn(
                  'flex-1 py-1 rounded text-xs font-medium border transition-colors',
                  discountType === 'percent'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'border-border text-muted-foreground'
                )}
              >
                %
              </button>
            </div>
            <Input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percent' ? '0 %' : '0 IQD'}
              className="h-8 text-xs bg-input border-border"
              min={0}
            />
          </div>

          {/* Totals */}
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>{t.subtotal}</span>
              <span>{formatIQD(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>{t.discount}</span>
                <span>- {formatIQD(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1.5 border-t border-border">
              <span>{t.grandTotal}</span>
              <span className="text-primary">{formatIQD(total)}</span>
            </div>
          </div>

          <Button
            onClick={() => setCheckoutOpen(true)}
            disabled={cart.length === 0}
            className="w-full h-11 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
          >
            {t.checkout} &rarr;
          </Button>
        </div>
      </div>

      </div>{/* end main content row */}

      {/* ── Keyboard shortcut hint bar ── */}
      <div className="shrink-0 border-t border-border bg-card/60 px-4 py-1.5 flex items-center gap-3 flex-wrap"
           dir={isRTL ? 'rtl' : 'ltr'}>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
          <Keyboard className="w-3 h-3" />
          {t.shortcuts}:
        </span>
        {shortcuts.map(({ key, desc }) => (
          <span key={key} className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-secondary font-mono text-[10px] text-foreground leading-none">
              {key}
            </kbd>
            <span>{desc}</span>
          </span>
        ))}
      </div>

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        subtotal={subtotal}
        discount={discountAmount}
        total={total}
        onSuccess={() => {
          setDiscountValue('')
          setCheckoutOpen(false)
        }}
      />
    </div>
  )
}
