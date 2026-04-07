'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import {
  Product,
  Category,
  CartItem,
  Transaction,
  Settings,
  MOCK_PRODUCTS,
  MOCK_TRANSACTIONS,
  DEFAULT_SETTINGS,
  DEFAULT_CATEGORIES,
} from './data'

// ── localStorage keys ──────────────────────────────────────────────────────
const LS_PRODUCTS     = 'pos_products'
const LS_TRANSACTIONS = 'pos_transactions'
const LS_CATEGORIES   = 'pos_categories'
const LS_SETTINGS     = 'pos_settings'
const LS_CART         = 'pos_cart'

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function lsSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // quota exceeded or private browsing — silently ignore
  }
}

// Products-specific setter: surfaces a quota error to the user because
// base64 images are large and silently dropping them would be confusing.
function lsSetProducts(products: Product[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_PRODUCTS, JSON.stringify(products))
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      alert('Image could not be saved — storage full. Try a smaller image.')
    }
  }
}

// ── Context type ───────────────────────────────────────────────────────────
type StoreContextType = {
  // Categories
  categories: Category[]
  addCategory: (cat: Category) => void
  updateCategory: (nameEn: string, updated: Category) => void
  deleteCategory: (nameEn: string) => void

  // Products
  products: Product[]
  addProduct: (p: Omit<Product, 'id' | 'soldCount'>) => void
  updateProduct: (id: string, p: Partial<Product>) => void
  deleteProduct: (id: string) => void

  // Cart
  cart: CartItem[]
  addToCart: (barcode: string) => boolean
  updateQty: (productId: string, delta: number) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void

  // Transactions
  transactions: Transaction[]
  addTransaction: (t: Transaction) => void
  refundTransaction: (transactionId: string) => void

  // Settings
  settings: Settings
  updateSettings: (s: Partial<Settings>) => void
  closeDay: (dateStr: string) => void
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // ── State — hydrated from localStorage on first client render ──────────
  const [categories,   setCategories]   = useState<Category[]>(DEFAULT_CATEGORIES)
  const [products,     setProducts]     = useState<Product[]>(MOCK_PRODUCTS)
  const [cart,         setCart]         = useState<CartItem[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS)
  const [settings,     setSettings]     = useState<Settings>(DEFAULT_SETTINGS)

  // Track whether we've hydrated so we don't overwrite localStorage with
  // default values before we've had a chance to read from it.
  const hydrated = useRef(false)

  // ── Hydrate from localStorage once on mount (Bug 3 fix) ───────────────
  useEffect(() => {
    setCategories(lsGet<Category[]>(LS_CATEGORIES, DEFAULT_CATEGORIES))
    setProducts(lsGet<Product[]>(LS_PRODUCTS, MOCK_PRODUCTS))
    setCart(lsGet<CartItem[]>(LS_CART, []))
    setTransactions(lsGet<Transaction[]>(LS_TRANSACTIONS, MOCK_TRANSACTIONS))
    setSettings(lsGet<Settings>(LS_SETTINGS, DEFAULT_SETTINGS))
    hydrated.current = true
  }, [])

  // ── Persist to localStorage whenever state changes (after hydration) ───
  useEffect(() => { if (hydrated.current) lsSet(LS_CATEGORIES,   categories)   }, [categories])
  useEffect(() => { if (hydrated.current) lsSetProducts(products) }, [products])
  useEffect(() => { if (hydrated.current) lsSet(LS_CART,         cart)         }, [cart])
  useEffect(() => { if (hydrated.current) lsSet(LS_TRANSACTIONS, transactions) }, [transactions])
  useEffect(() => { if (hydrated.current) lsSet(LS_SETTINGS,     settings)     }, [settings])

  // ── Actions ────────────────────────────────────────────────────────────
  const addCategory = useCallback((cat: Category) => {
    setCategories((prev) =>
      prev.some((c) => c.nameEn === cat.nameEn) ? prev : [...prev, cat]
    )
  }, [])

  const updateCategory = useCallback((nameEn: string, updated: Category) => {
    setCategories((prev) => prev.map((c) => c.nameEn === nameEn ? updated : c))
    setProducts((prev) =>
      prev.map((p) => p.category === nameEn ? { ...p, category: updated.nameEn } : p)
    )
  }, [])

  const deleteCategory = useCallback((nameEn: string) => {
    setCategories((prev) => prev.filter((c) => c.nameEn !== nameEn))
  }, [])

  const addProduct = useCallback((p: Omit<Product, 'id' | 'soldCount'>) => {
    const newProduct: Product = { ...p, id: Date.now().toString(), soldCount: 0 }
    setProducts((prev) => [...prev, newProduct])
  }, [])

  const updateProduct = useCallback((id: string, p: Partial<Product>) => {
    setProducts((prev) => prev.map((prod) => (prod.id === id ? { ...prod, ...p } : prod)))
  }, [])

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const addToCart = useCallback(
    (barcode: string): boolean => {
      const product = products.find((p) => p.barcode === barcode)
      if (!product) return false
      // Block out-of-stock products entirely
      if (product.stock === 0) return false
      let blocked = false
      setCart((prev) => {
        const existing = prev.find((item) => item.product.id === product.id)
        if (existing) {
          // Don't allow cart quantity to exceed available stock
          if (existing.quantity >= product.stock) {
            blocked = true
            return prev
          }
          return prev.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        }
        return [...prev, { product, quantity: 1 }]
      })
      return !blocked
    },
    [products]
  )

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item
          const newQty = item.quantity + delta
          // Cap increments at available stock
          if (delta > 0 && newQty > item.product.stock) return item
          return { ...item, quantity: newQty }
        })
        .filter((item) => item.quantity > 0)
    )
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
  }, [])

  // Bug 4 fix: addTransaction persists immediately to localStorage so the
  // Reports page reads the same up-to-date list on next render / navigation.
  const addTransaction = useCallback((t: Transaction) => {
    setTransactions((prev) => {
      const next = [t, ...prev]
      // Eagerly write so it's available even before the persisting useEffect fires.
      lsSet(LS_TRANSACTIONS, next)
      return next
    })
    // Deduct stock using a functional updater to avoid stale cart closure.
    setCart((currentCart) => {
      setProducts((prev) =>
        prev.map((p) => {
          const cartItem = currentCart.find((c) => c.product.id === p.id)
          if (cartItem) {
            return {
              ...p,
              stock: Math.max(0, p.stock - cartItem.quantity),
              soldCount: p.soldCount + cartItem.quantity,
            }
          }
          return p
        })
      )
      return currentCart
    })
  }, [])

  const updateSettings = useCallback((s: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...s }))
  }, [])

  const closeDay = useCallback((dateStr: string) => {
    setSettings((prev) => {
      if (prev.closedDays.includes(dateStr)) return prev
      return { ...prev, closedDays: [...prev.closedDays, dateStr] }
    })
  }, [])

  const refundTransaction = useCallback((transactionId: string) => {
    setTransactions((prev) => {
      const original = prev.find((t) => t.id === transactionId)
      if (!original || original.refunded) return prev

      const refundId = `RFD-${Date.now()}`

      const refundRecord: Transaction = {
        id: refundId,
        date: new Date().toISOString(),
        items: original.items.map((item) => ({
          ...item,
          quantity: -item.quantity,
          total: -item.total,
        })),
        subtotal: -original.subtotal,
        discount: -original.discount,
        tax: -original.tax,
        total: -original.total,
        paymentMethod: original.paymentMethod,
        amountPaid: -original.amountPaid,
        change: -original.change,
        originalTransactionId: transactionId,
      }

      const next = prev.map((t) =>
        t.id === transactionId ? { ...t, refunded: true, refundId } : t
      )
      next.unshift(refundRecord)
      lsSet(LS_TRANSACTIONS, next)
      return next
    })

    // Restore stock for every item in the original transaction
    setTransactions((prev) => {
      const original = prev.find((t) => t.id === transactionId)
      if (!original) return prev
      setProducts((prevProducts) =>
        prevProducts.map((p) => {
          const refundedItem = original.items.find(
            (item) => item.nameEn === p.nameEn || item.nameAr === p.nameAr
          )
          if (!refundedItem) return p
          // quantity on the original is positive; refund record is negative — use Math.abs
          const qty = Math.abs(refundedItem.quantity)
          return {
            ...p,
            stock: p.stock + qty,
            soldCount: Math.max(0, p.soldCount - qty),
          }
        })
      )
      return prev
    })
  }, [])

  return (
    <StoreContext.Provider
      value={{
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        cart,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        transactions,
        addTransaction,
        refundTransaction,
        settings,
        updateSettings,
        closeDay,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
