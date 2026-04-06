'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
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

  // Settings
  settings: Settings
  updateSettings: (s: Partial<Settings>) => void
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS)
  const [cart, setCart] = useState<CartItem[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

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
      setCart((prev) => {
        const existing = prev.find((item) => item.product.id === product.id)
        if (existing) {
          return prev.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        }
        return [...prev, { product, quantity: 1 }]
      })
      return true
    },
    [products]
  )

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
  }, [])

  const addTransaction = useCallback((t: Transaction) => {
    setTransactions((prev) => [t, ...prev])
    // Deduct stock
    setProducts((prev) =>
      prev.map((p) => {
        const cartItem = cart.find((c) => c.product.id === p.id)
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
  }, [cart])

  const updateSettings = useCallback((s: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...s }))
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
        settings,
        updateSettings,
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
