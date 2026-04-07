'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store-context'
import { formatIQD, Product } from '@/lib/data'
import { ProductForm } from '@/components/pos/product-form'
import { ProductImportModal } from '@/components/pos/product-import-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Package,
  Upload,
} from 'lucide-react'

export default function ProductsPage() {
  const { products, deleteProduct, settings, categories } = useStore()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const isRTL = settings.rtl

  const filtered = products.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.nameAr.includes(search) ||
      p.nameEn.toLowerCase().includes(q) ||
      p.barcode.includes(q)
    )
  })

  function handleEdit(p: Product) {
    setEditProduct(p)
    setFormOpen(true)
  }

  function handleAdd() {
    setEditProduct(null)
    setFormOpen(true)
  }

  function handleDelete(id: string) {
    if (confirm('Delete this product?')) {
      deleteProduct(id)
    }
  }

  const lowStockCount = products.filter((p) => p.stock < 5).length

  return (
    <div className="flex flex-col h-full overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{isRTL ? 'إدارة المنتجات' : 'Products Management'}</h1>
            <p className="text-sm text-muted-foreground">
              {products.length} {isRTL ? 'منتج' : 'products'}
              {lowStockCount > 0 && (
                <span className="text-warning ml-2 inline-flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {lowStockCount} {isRTL ? 'نقص في المخزون' : 'low stock'}
                </span>
              )}
            </p>
          </div>
          <Button onClick={handleAdd} className="bg-primary text-primary-foreground gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            {isRTL ? 'إضافة منتج' : 'Add Product'}
          </Button>
        </div>
        <div className="relative">
          <Search className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground', isRTL ? 'right-3' : 'left-3')} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isRTL ? 'ابحث بالاسم أو الباركود...' : 'Search by name or barcode...'}
            className={cn('bg-input border-border', isRTL ? 'pr-10' : 'pl-10')}
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Package className="w-12 h-12 opacity-20" />
            <p>{isRTL ? 'لا توجد نتائج' : 'No products found'}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary border-b border-border text-muted-foreground">
                  <th className={cn('px-4 py-3 font-semibold text-left', isRTL && 'text-right')}>
                    {isRTL ? 'المنتج' : 'Product'}
                  </th>
                  <th className={cn('px-4 py-3 font-semibold hidden md:table-cell', isRTL ? 'text-right' : 'text-left')}>
                    {isRTL ? 'الباركود' : 'Barcode'}
                  </th>
                  <th className={cn('px-4 py-3 font-semibold hidden lg:table-cell', isRTL ? 'text-right' : 'text-left')}>
                    {isRTL ? 'الفئة' : 'Category'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-right">
                    {isRTL ? 'السعر' : 'Price'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-right">
                    {isRTL ? 'المخزون' : 'Stock'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-right w-24">
                    {isRTL ? 'إجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product, idx) => {
                  const isLow = product.stock < 5
                  return (
                    <tr
                      key={product.id}
                      className={cn(
                        'border-b border-border last:border-0 transition-colors',
                        idx % 2 === 0 ? 'bg-card' : 'bg-secondary/30',
                        isLow && 'bg-warning/5'
                      )}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{product.nameAr}</p>
                        <p className="text-xs text-muted-foreground">{product.nameEn}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden md:table-cell">
                        {product.barcode}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="px-2 py-0.5 rounded-md bg-secondary text-xs font-medium">
                          {isRTL
                            ? (categories.find((c) => c.nameEn === product.category)?.nameAr ?? product.category)
                            : product.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatIQD(product.price)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-md text-xs font-bold',
                            isLow
                              ? 'bg-warning/20 text-warning-foreground'
                              : 'bg-success/10 text-success'
                          )}
                        >
                          {isLow && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(product)}
                            className="w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors text-muted-foreground"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="w-8 h-8 rounded-lg hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors text-muted-foreground"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditProduct(null) }}
        product={editProduct}
      />
    </div>
  )
}
