'use client'

import { useState, useRef, useCallback } from 'react'
import { useStore } from '@/lib/store-context'
import { Product } from '@/lib/data'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  Upload,
  Download,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  X,
} from 'lucide-react'

// Dynamically load SheetJS from CDN
async function loadXLSX(): Promise<typeof import('xlsx')> {
  if (typeof window === 'undefined') throw new Error('SSR not supported')
  // @ts-ignore
  if (window.XLSX) return window.XLSX as typeof import('xlsx')
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
    script.onload = () => {
      // @ts-ignore
      resolve(window.XLSX as typeof import('xlsx'))
    }
    script.onerror = () => reject(new Error('Failed to load SheetJS from CDN'))
    document.head.appendChild(script)
  })
}

// Required columns (case-insensitive trimmed)
const REQUIRED_COLUMNS = ['arabic name', 'english name', 'barcode', 'price', 'stock', 'category']

type ParsedRow = {
  nameAr: string
  nameEn: string
  barcode: string
  price: number
  stock: number
  category: string
  // resolved status
  status: 'add' | 'update'
  existingId?: string
  errors: string[]
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase()
}

function downloadSampleCSV() {
  const header = 'Arabic Name,English Name,Barcode,Price,Stock,Category\n'
  const rows = [
    'أرز بسمتي,Basmati Rice 5kg,6901234500001,12000,50,Grains',
    'زيت نباتي,Vegetable Oil 1.8L,6901234500002,8500,30,Oils',
    'سكر أبيض,White Sugar 2kg,6901234500003,4500,60,Sweeteners',
  ].join('\n')
  const csv = header + rows
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'sample_products.csv'
  a.click()
  URL.revokeObjectURL(url)
}

type Props = {
  open: boolean
  onClose: () => void
}

export function ProductImportModal({ open, onClose }: Props) {
  const { products, addProduct, updateProduct, categories, settings } = useStore()
  const isRTL = settings.rtl
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importedCount, setImportedCount] = useState({ added: 0, updated: 0 })

  const addCount = rows.filter((r) => r.status === 'add' && r.errors.length === 0).length
  const updateCount = rows.filter((r) => r.status === 'update' && r.errors.length === 0).length
  const errorCount = rows.filter((r) => r.errors.length > 0).length

  function handleClose() {
    setStep('upload')
    setRows([])
    setParseError(null)
    setFileName('')
    setLoading(false)
    onClose()
  }

  async function processFile(file: File) {
    setLoading(true)
    setParseError(null)
    setFileName(file.name)

    try {
      const XLSX = await loadXLSX()
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      // header: 1 → each row is an array; defval: '' to fill empty cells
      const raw: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][]

      if (raw.length < 2) {
        setParseError(isRTL ? 'الملف فارغ أو لا يحتوي على بيانات.' : 'File is empty or has no data rows.')
        setLoading(false)
        return
      }

      // Validate headers
      const headerRow = raw[0].map((h) => normalizeHeader(String(h)))
      const missingCols = REQUIRED_COLUMNS.filter((c) => !headerRow.includes(c))
      if (missingCols.length > 0) {
        setParseError(
          isRTL
            ? `الأعمدة التالية مفقودة: ${missingCols.join(', ')}`
            : `Missing required columns: ${missingCols.join(', ')}`
        )
        setLoading(false)
        return
      }

      // Map column indices
      const idx = {
        nameAr: headerRow.indexOf('arabic name'),
        nameEn: headerRow.indexOf('english name'),
        barcode: headerRow.indexOf('barcode'),
        price: headerRow.indexOf('price'),
        stock: headerRow.indexOf('stock'),
        category: headerRow.indexOf('category'),
      }

      const parsed: ParsedRow[] = []

      for (let i = 1; i < raw.length; i++) {
        const row = raw[i]
        // Skip completely empty rows
        if (row.every((cell) => String(cell).trim() === '')) continue

        const nameAr = String(row[idx.nameAr] ?? '').trim()
        const nameEn = String(row[idx.nameEn] ?? '').trim()
        const barcode = String(row[idx.barcode] ?? '').trim()
        const priceRaw = String(row[idx.price] ?? '').trim()
        const stockRaw = String(row[idx.stock] ?? '').trim()
        const category = String(row[idx.category] ?? '').trim()

        const errors: string[] = []
        if (!nameAr) errors.push(isRTL ? 'الاسم العربي مطلوب' : 'Arabic name required')
        if (!nameEn) errors.push(isRTL ? 'الاسم الإنجليزي مطلوب' : 'English name required')
        if (!barcode) errors.push(isRTL ? 'الباركود مطلوب' : 'Barcode required')

        const price = parseFloat(priceRaw)
        if (isNaN(price) || price < 0) errors.push(isRTL ? 'السعر غير صالح' : 'Invalid price')

        const stock = parseInt(stockRaw)
        if (isNaN(stock) || stock < 0) errors.push(isRTL ? 'المخزون غير صالح' : 'Invalid stock')

        // Match barcode to existing product
        const existing = products.find((p) => p.barcode === barcode)

        parsed.push({
          nameAr,
          nameEn,
          barcode,
          price: isNaN(price) ? 0 : price,
          stock: isNaN(stock) ? 0 : stock,
          category: category || 'Other',
          status: existing ? 'update' : 'add',
          existingId: existing?.id,
          errors,
        })
      }

      if (parsed.length === 0) {
        setParseError(isRTL ? 'لم يتم العثور على صفوف صالحة.' : 'No valid rows found.')
        setLoading(false)
        return
      }

      setRows(parsed)
      setStep('preview')
    } catch (err) {
      setParseError(
        isRTL
          ? 'فشل تحليل الملف. تأكد من أنه ملف CSV أو Excel صالح.'
          : 'Failed to parse file. Make sure it is a valid CSV or Excel file.'
      )
    } finally {
      setLoading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  function handleConfirmImport() {
    let added = 0
    let updated = 0
    for (const row of rows) {
      if (row.errors.length > 0) continue
      const data = {
        nameAr: row.nameAr,
        nameEn: row.nameEn,
        barcode: row.barcode,
        price: row.price,
        stock: row.stock,
        category: row.category,
      }
      if (row.status === 'update' && row.existingId) {
        updateProduct(row.existingId, data)
        updated++
      } else {
        addProduct(data)
        added++
      }
    }
    setImportedCount({ added, updated })
    setStep('done')
  }

  const t = {
    title: isRTL ? 'استيراد المنتجات' : 'Import Products',
    desc: isRTL ? 'ارفع ملف CSV أو Excel لاستيراد المنتجات دفعة واحدة.' : 'Upload a CSV or Excel file to import products in bulk.',
    dropzone: isRTL ? 'اسحب وأفلت الملف هنا، أو انقر للتصفح' : 'Drag & drop file here, or click to browse',
    dropzoneHint: isRTL ? 'يدعم: .csv و .xlsx و .xls' : 'Supports: .csv, .xlsx, .xls',
    sample: isRTL ? 'تحميل نموذج CSV' : 'Download Sample CSV',
    confirmImport: isRTL ? 'تأكيد الاستيراد' : 'Confirm Import',
    cancel: isRTL ? 'إلغاء' : 'Cancel',
    back: isRTL ? 'رجوع' : 'Back',
    close: isRTL ? 'إغلاق' : 'Close',
    previewTitle: isRTL ? 'معاينة الاستيراد' : 'Import Preview',
    doneTitle: isRTL ? 'اكتمل الاستيراد' : 'Import Complete',
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-3xl bg-card border-border text-foreground max-h-[90vh] flex flex-col overflow-hidden p-0"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            {step === 'upload' && t.title}
            {step === 'preview' && t.previewTitle}
            {step === 'done' && t.doneTitle}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && t.desc}
            {step === 'preview' && (
              <span>
                {isRTL
                  ? `${rows.length} صف في المجموع · ${addCount} إضافة · ${updateCount} تحديث${errorCount > 0 ? ` · ${errorCount} أخطاء` : ''}`
                  : `${rows.length} rows total · ${addCount} to add · ${updateCount} to update${errorCount > 0 ? ` · ${errorCount} errors` : ''}`}
              </span>
            )}
            {step === 'done' && (
              <span>
                {isRTL
                  ? `تمت إضافة ${importedCount.added} منتج وتحديث ${importedCount.updated} منتج.`
                  : `Added ${importedCount.added} products, updated ${importedCount.updated} products.`}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ── STEP: upload ─────────────────────────────────────────────── */}
          {step === 'upload' && (
            <div className="flex flex-col gap-5">
              {/* Dropzone */}
              <div
                className={cn(
                  'relative border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 py-12 cursor-pointer transition-colors',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-secondary/40'
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <div className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center transition-colors',
                  isDragging ? 'bg-primary/10' : 'bg-secondary'
                )}>
                  <Upload className={cn('w-6 h-6', isDragging ? 'text-primary' : 'text-muted-foreground')} />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">{t.dropzone}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t.dropzoneHint}</p>
                </div>
                {loading && (
                  <div className="absolute inset-0 bg-card/80 rounded-xl flex items-center justify-center gap-2 text-primary">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">{isRTL ? 'جارٍ التحليل...' : 'Parsing...'}</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Parse error */}
              {parseError && (
                <div className="flex items-start gap-2.5 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Column guide */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-secondary/60 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {isRTL ? 'الأعمدة المطلوبة' : 'Required Columns'}
                </div>
                <div className="flex flex-wrap gap-2 px-4 py-3">
                  {['Arabic Name', 'English Name', 'Barcode', 'Price', 'Stock', 'Category'].map((col) => (
                    <span
                      key={col}
                      className="px-2.5 py-1 rounded-md bg-secondary text-xs font-mono font-medium text-foreground border border-border"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample download */}
              <button
                type="button"
                onClick={downloadSampleCSV}
                className="flex items-center gap-2 text-sm text-primary hover:underline w-fit"
              >
                <Download className="w-4 h-4" />
                {t.sample}
              </button>
            </div>
          )}

          {/* ── STEP: preview ────────────────────────────────────────────── */}
          {step === 'preview' && (
            <div className="flex flex-col gap-4">
              {/* Legend */}
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-green-500/20 border border-green-500/40 inline-block" />
                  {isRTL ? 'إضافة جديد' : 'Will add'}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-yellow-400/25 border border-yellow-400/50 inline-block" />
                  {isRTL ? 'تحديث موجود' : 'Will update'}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-destructive/15 border border-destructive/30 inline-block" />
                  {isRTL ? 'أخطاء' : 'Errors'}
                </span>
              </div>

              {/* Preview table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="bg-secondary border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                        <th className={cn('px-3 py-2.5 font-semibold', isRTL ? 'text-right' : 'text-left')}>#</th>
                        <th className={cn('px-3 py-2.5 font-semibold', isRTL ? 'text-right' : 'text-left')}>
                          {isRTL ? 'الاسم' : 'Name'}
                        </th>
                        <th className={cn('px-3 py-2.5 font-semibold', isRTL ? 'text-right' : 'text-left')}>
                          {isRTL ? 'الباركود' : 'Barcode'}
                        </th>
                        <th className={cn('px-3 py-2.5 font-semibold', isRTL ? 'text-right' : 'text-left')}>
                          {isRTL ? 'الفئة' : 'Category'}
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-right">
                          {isRTL ? 'السعر' : 'Price'}
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-right">
                          {isRTL ? 'المخزون' : 'Stock'}
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-center">
                          {isRTL ? 'الحالة' : 'Status'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => {
                        const hasError = row.errors.length > 0
                        const rowBg = hasError
                          ? 'bg-destructive/8 hover:bg-destructive/12'
                          : row.status === 'update'
                            ? 'bg-yellow-400/10 hover:bg-yellow-400/15'
                            : 'bg-green-500/8 hover:bg-green-500/12'

                        return (
                          <tr
                            key={i}
                            className={cn('border-b border-border last:border-0 transition-colors', rowBg)}
                          >
                            <td className="px-3 py-2.5 text-muted-foreground text-xs font-mono">{i + 1}</td>
                            <td className="px-3 py-2.5">
                              <p className="font-medium leading-tight">{row.nameAr || <span className="text-destructive italic text-xs">{isRTL ? 'فارغ' : 'empty'}</span>}</p>
                              <p className="text-xs text-muted-foreground leading-tight">{row.nameEn || '—'}</p>
                              {hasError && (
                                <p className="text-[11px] text-destructive mt-0.5">{row.errors.join(' · ')}</p>
                              )}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                              {row.barcode || <span className="text-destructive italic">{isRTL ? 'فارغ' : 'empty'}</span>}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="px-2 py-0.5 rounded-md bg-secondary text-xs">
                                {row.category || '—'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-xs">
                              {row.price.toLocaleString()} د.ع
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs font-medium">
                              {row.stock}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {hasError ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-[11px] font-semibold">
                                  <X className="w-2.5 h-2.5" />
                                  {isRTL ? 'خطأ' : 'Error'}
                                </span>
                              ) : row.status === 'update' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 text-[11px] font-semibold">
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  {isRTL ? 'تحديث' : 'Update'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-700 dark:text-green-400 text-[11px] font-semibold">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  {isRTL ? 'إضافة' : 'Add'}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: done ───────────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-10 gap-5">
              <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-green-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">
                  {isRTL ? 'تم الاستيراد بنجاح!' : 'Import Successful!'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRTL
                    ? `تمت إضافة ${importedCount.added} منتج وتحديث ${importedCount.updated} منتج في قائمة المنتجات.`
                    : `${importedCount.added} products added and ${importedCount.updated} products updated in your inventory.`}
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col items-center gap-1 px-6 py-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">{importedCount.added}</span>
                  <span className="text-xs text-muted-foreground">{isRTL ? 'مضاف' : 'Added'}</span>
                </div>
                <div className="flex flex-col items-center gap-1 px-6 py-4 rounded-xl bg-yellow-400/10 border border-yellow-400/20">
                  <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{importedCount.updated}</span>
                  <span className="text-xs text-muted-foreground">{isRTL ? 'محدّث' : 'Updated'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 shrink-0 border-t border-border flex items-center justify-between gap-2">
          <div>
            {step === 'upload' && (
              <button
                type="button"
                onClick={downloadSampleCSV}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                {t.sample}
              </button>
            )}
            {step === 'preview' && fileName && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">{fileName}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === 'upload' && (
              <>
                <Button variant="outline" onClick={handleClose} className="border-border">
                  {t.cancel}
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-primary text-primary-foreground gap-2"
                  disabled={loading}
                >
                  <Upload className="w-4 h-4" />
                  {isRTL ? 'اختيار ملف' : 'Choose File'}
                </Button>
              </>
            )}
            {step === 'preview' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => { setStep('upload'); setParseError(null) }}
                  className="border-border"
                >
                  {t.back}
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  className="bg-primary text-primary-foreground gap-2"
                  disabled={addCount + updateCount === 0}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {t.confirmImport}
                  {addCount + updateCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-md bg-primary-foreground/20 text-xs font-bold">
                      {addCount + updateCount}
                    </span>
                  )}
                </Button>
              </>
            )}
            {step === 'done' && (
              <Button onClick={handleClose} className="bg-primary text-primary-foreground">
                {t.close}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
