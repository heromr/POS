'use client'

import { useState, useEffect, useRef } from 'react'
import { Product } from '@/lib/data'
import { useStore } from '@/lib/store-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ImagePlus, X } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  product?: Product | null
}

// 500 KB expressed as base64 characters (each base64 char ≈ 0.75 bytes,
// so 500 000 bytes / 0.75 ≈ 666 667 chars). We use 666 000 as the hard limit.
const IMAGE_HARD_LIMIT_CHARS = 666_000
// 200 KB — recommended upper bound shown as a UI hint
const IMAGE_SOFT_LIMIT_CHARS = Math.round(200_000 / 0.75) // ≈ 266 667

export function ProductForm({ open, onClose, product }: Props) {
  const { addProduct, updateProduct, categories, settings } = useStore()
  const isEdit = !!product
  const isRTL = settings.rtl
  const imageInputRef = useRef<HTMLInputElement>(null)

  const [imageError, setImageError] = useState('')

  const [form, setForm] = useState({
    nameAr: '',
    nameEn: '',
    barcode: '',
    category: categories[0]?.nameEn ?? 'Grains',
    price: '',
    stock: '',
    image: '',
  })

  useEffect(() => {
    if (product) {
      setForm({
        nameAr: product.nameAr,
        nameEn: product.nameEn,
        barcode: product.barcode,
        category: product.category,
        price: product.price.toString(),
        stock: product.stock.toString(),
        image: product.image ?? '',
      })
    } else {
      setForm({
        nameAr: '',
        nameEn: '',
        barcode: '',
        category: categories[0]?.nameEn ?? 'Grains',
        price: '',
        stock: '',
        image: '',
      })
    }
    setImageError('')
  }, [product, open, categories])

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const b64 = reader.result as string
      if (b64.length > IMAGE_HARD_LIMIT_CHARS) {
        setImageError(
          isRTL
            ? 'الصورة كبيرة جداً (الحد الأقصى 500 كيلوبايت). الرجاء اختيار صورة أصغر.'
            : 'Image is too large (max 500 KB). Please choose a smaller image.'
        )
        // Reset file input so the same file can be re-selected after resizing
        if (imageInputRef.current) imageInputRef.current.value = ''
        return
      }
      setImageError('')
      set('image', b64)
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Final guard: block save if image exceeds hard limit
    if (form.image && form.image.length > IMAGE_HARD_LIMIT_CHARS) {
      setImageError(
        isRTL
          ? 'الصورة كبيرة جداً (الحد الأقصى 500 كيلوبايت). الرجاء اختيار صورة أصغر.'
          : 'Image is too large (max 500 KB). Please choose a smaller image.'
      )
      return
    }
    const data = {
      nameAr: form.nameAr,
      nameEn: form.nameEn,
      barcode: form.barcode,
      category: form.category,
      price: parseInt(form.price) || 0,
      stock: parseInt(form.stock) || 0,
      image: form.image || undefined,
    }
    if (isEdit && product) {
      updateProduct(product.id, data)
    } else {
      addProduct(data)
    }
    onClose()
  }

  // Each field has both an English and Arabic label — Arabic is always shown in RTL mode
  const fields: { labelEn: string; labelAr: string; field: string; type?: string; placeholder?: string }[] = [
    { labelEn: 'Arabic Name',     labelAr: 'الاسم بالعربي',       field: 'nameAr',  placeholder: isRTL ? 'مثال: أرز بسمتي' : 'e.g. أرز بسمتي' },
    { labelEn: 'English Name',    labelAr: 'الاسم بالإنجليزي',   field: 'nameEn',  placeholder: 'e.g. Basmati Rice 5kg' },
    { labelEn: 'Barcode',         labelAr: 'الباركود',            field: 'barcode', placeholder: '6901234567890' },
    { labelEn: 'Price (IQD)',     labelAr: 'السعر (د.ع)',         field: 'price',   type: 'number', placeholder: '5000' },
    { labelEn: 'Stock Quantity',  labelAr: 'الكمية في المخزن',   field: 'stock',   type: 'number', placeholder: '50' },
  ]

  const titleEn = isEdit ? 'Edit Product' : 'Add New Product'
  const titleAr = isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'
  const descEn = isEdit ? 'Update the product details below.' : 'Fill in the details to add a new product to inventory.'
  const descAr = isEdit ? 'حدّث تفاصيل المنتج أدناه.' : 'أدخل التفاصيل لإضافة منتج جديد إلى المخزون.'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/*
        Override DialogContent default `grid` layout with `flex flex-col` so we can
        pin the header and footer and make the middle body independently scrollable.
        `overflow-hidden` on the container ensures the rounded corners clip the scroll.
      */}
      <DialogContent
        className="max-w-md bg-card border-border text-foreground max-h-[90vh] flex flex-col overflow-hidden p-0"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Pinned header */}
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-border">
          <DialogTitle>{isRTL ? titleAr : titleEn}</DialogTitle>
          <DialogDescription>{isRTL ? descAr : descEn}</DialogDescription>
        </DialogHeader>

        {/* Scrollable body */}
        <form
          id="product-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4"
        >
          {fields.map(({ labelEn, labelAr, field, type, placeholder }) => (
            <div key={field} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                {isRTL ? labelAr : labelEn}
              </label>
              <Input
                type={type || 'text'}
                value={(form as Record<string, string>)[field]}
                onChange={(e) => set(field, e.target.value)}
                placeholder={placeholder}
                className="bg-input border-border"
                required
              />
            </div>
          ))}

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              {isRTL ? 'الفئة' : 'Category'}
            </label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="h-10 rounded-lg px-3 text-sm bg-input border border-border text-foreground"
            >
              {categories.map((c) => (
                <option key={c.nameEn} value={c.nameEn}>
                  {isRTL ? c.nameAr : c.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Image upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              {isRTL ? 'صورة المنتج (اختياري)' : 'Product Image (optional)'}
            </label>
            {form.image ? (
              <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image} alt="product" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { set('image', ''); setImageError('') }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive/80 text-white flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
                {/* Show size of currently loaded image */}
                <span className={`absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  form.image.length > IMAGE_HARD_LIMIT_CHARS
                    ? 'bg-destructive/80 text-white'
                    : form.image.length > IMAGE_SOFT_LIMIT_CHARS
                      ? 'bg-amber-500/80 text-white'
                      : 'bg-black/50 text-white'
                }`}>
                  {Math.round(form.image.length * 0.75 / 1024)} KB
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors"
              >
                <ImagePlus className="w-5 h-5" />
                <span className="text-xs">{isRTL ? 'انقر لرفع صورة' : 'Click to upload image'}</span>
              </button>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            {/* Size guidance note */}
            <p className="text-[11px] text-muted-foreground">
              {isRTL
                ? 'الحجم الموصى به: 200 كيلوبايت كحد أقصى. الحد المطلق: 500 كيلوبايت.'
                : 'Max recommended: 200 KB. Hard limit: 500 KB.'}
            </p>
            {/* Validation error */}
            {imageError && (
              <p className="text-xs text-destructive font-medium">{imageError}</p>
            )}
          </div>
        </form>

        {/* Pinned footer — outside the scrollable form, uses form= to submit */}
        <div className="px-6 py-4 shrink-0 border-t border-border flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="border-border">
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" form="product-form" className="bg-primary text-primary-foreground">
            {isEdit
              ? (isRTL ? 'حفظ التغييرات' : 'Save Changes')
              : (isRTL ? 'إضافة المنتج' : 'Add Product')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
