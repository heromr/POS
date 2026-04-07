'use client'

import { useState, useRef, useCallback } from 'react'
import { useStore } from '@/lib/store-context'
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

// ── Types ──────────────────────────────────────────────────────────────────
type ImportRow = {
  nameAr: string
  nameEn: string
  barcode: string
  price: number
  stock: number
  category: string
  status: 'add' | 'update' | 'error'
  error?: string
}

type Props = {
  open: boolean
  onClose: () => void
}

// ── SheetJS lazy loader ────────────────────────────────────────────────────
// We load xlsx from CDN (browser build) only when needed so it doesn't bloat
// the initial bundle. The CDN version attaches `XLSX` to `window`.
let xlsxLoaded = false
function loadXLSX(): Promise<typeof import('xlsx')> {
  return new Promise((resolve, reject) => {
    if (xlsxLoaded && (window as any).XLSX) {
      resolve((window as any).XLSX)
      return
    }
    const existing = document.getElementById('sheetjs-cdn')
    if (existing) {
      // Script tag already inserted — wait for it
      existing.addEventListener('load', () => {
        xlsxLoaded = true
        resolve((window as any).XLSX)
      })
      return
    }
    const script = document.createElement('script')
    script.id = 'sheetjs-cdn'
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
    script.onload = () => {
      xlsxLoaded = true
      resolve((window as any).XLSX)
    }
    script.onerror = () => reject(new Error('Failed to load SheetJS from CDN'))
    document.head.appendChild(script)
  })
}

// ── CSV generation for sample download ────────────────────────────────────
const SAMPLE_CSV_CONTENT = [
  'Arabic Name,English Name,Barcode,Price,Stock,Category',
  'أرز بسمتي,Basmati Rice 5kg,6901234567890,12000,45,Grains',
  'زيت نباتي,Vegetable Oil 1.8L,6901234567891,8500,30,Oils',
  'سكر أبيض,White Sugar 2kg,6901234567892,4500,60,Sweeteners',
].join('\n')

function downloadSampleCSV() {
  const blob = new Blob(['\uFEFF' + SAMPLE_CSV_CONTENT], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'sample_products.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ── Column name normaliser ─────────────────────────────────────────────────
const COL_MAP: Record<string, string> = {
  'arabic name': 'nameAr',
  'arabic':      'nameAr',
  'اسم عربي':   'nameAr',
  'الاسم العربي': 'nameAr',

  'english name': 'nameEn',
  'english':      'nameEn',
  'اسم انجليزي': 'nameEn',
  'الاسم الانجليزي': 'nameEn',

  'barcode': 'barcode',
  'الباركود': 'barcode',
  'بار كود':  'barcode',

  'price': 'price',
  'السعر': 'price',

  'stock': 'stock',
  'quantity': 'stock',
  'الكمية':   'stock',
  'المخزون':  'stock',

  'category': 'category',
  'الفئة':    'category',
  'التصنيف':  'category',
}

function normaliseKey(raw: string): string | null {
  return COL_MAP[raw.trim().toLowerCase()] ?? null
}

// ── Row parser ─────────────────────────────────────────────────────────────
function parseSheetRows(rawRows: Record<string, unknown>[]): ImportRow[] {
  return rawRows
    .filter((row) => Object.values(row).some((v) => v !== '' && v !== null && v !== undefined))
    .map((row) => {
      // Remap column names
      const mapped: Record<string, string> = {}
      for (const [k, v] of Object.entries(row)) {
        const norm = normaliseKey(k)
        if (norm) mapped[norm] = String(v ?? '').trim()
      }

      const nameAr   = mapped['nameAr']   ?? ''
      const nameEn   = mapped['nameEn']   ?? ''
      const barcode  = mapped['barcode']  ?? ''
      const priceRaw = mapped['price']    ?? ''
      const stockRaw = mapped['stock']    ?? ''
      const category = mapped['category'] ?? 'Other'

      const price = parseFloat(priceRaw.replace(/[^0-9.]/g, ''))
      const stock = parseInt(stockRaw.replace(/[^0-9]/g, ''), 10)

      // Validate required fields
      const errors: string[] = []
      if (!nameAr)              errors.push('Missing Arabic name')
      if (!nameEn)              errors.push('Missing English name')
      if (!barcode)             errors.push('Missing barcode')
      if (isNaN(price) || price < 0) errors.push('Invalid price')
      if (isNaN(stock) || stock < 0) errors.push('Invalid stock')

      return {
        nameAr,
        nameEn,
        barcode,
        price: isNaN(price) ? 0 : price,
        stock:  isNaN(stock) ? 0 : stock,
        category,
        status: errors.length > 0 ? ('error' as const) : ('add' as const), // resolved later
        error:  errors.length > 0 ? errors.join(', ') : undefined,
      }
    })
}

// ── Main component ─────────────────────────────────────────────────────────
export function ProductImportModal({ open, onClose }: Props) {
  const { products, addProduct, updateProduct, settings } = useStore()
  const isRTL = settings.rtl

  const [rows, setRows] = useState<ImportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [parseError, setParseError] = useState('')
  const [fileName, setFileName] = useState('')
  const [imported, setImported] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setRows([])
    setParseError('')
    setFileName('')
    setImported(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  function handleClose() {
    reset()
    onClose()
  }

  // Enrich parsed rows with add/update status based on current products
  function enrichRows(parsed: ImportRow[]): ImportRow[] {
    const barcodeSet = new Map(products.map((p) => [p.barcode, p.id]))
    return parsed.map((row) => {
      if (row.status === 'error') return row
      return {
        ...row,
        status: barcodeSet.has(row.barcode) ? 'update' : 'add',
      }
    })
  }

  async function handleFile(file: File) {
    setLoading(true)
    setParseError('')
    setRows([])
    setFileName(file.name)

    try {
      const isCSV = file.name.toLowerCase().endsWith('.csv')
      let rawRows: Record<string, unknown>[] = []

      if (isCSV) {
        // Parse CSV manually (no library needed)
        const text = await file.text()
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
        const headers = lines[0].split(',').map((h) => h.replace(/^\uFEFF/, '').trim())
        rawRows = lines.slice(1).map((line) => {
          const vals = line.split(',')
          const obj: Record<string, string> = {}
          headers.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim() })
          return obj
        })
      } else {
        // Parse XLSX via SheetJS CDN
        const XLSX = await loadXLSX()
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      }

      const parsed  = parseSheetRows(rawRows)
      const enriched = enrichRows(parsed)

      if (enriched.length === 0) {
        setParseError(isRTL ? 'الملف فارغ أو لا يحتوي على صفوف صالحة.' : 'File is empty or contains no valid rows.')
      } else {
        setRows(enriched)
      }
    } catch (err: unknown) {
      setParseError(
        isRTL
          ? `فشل تحليل الملف: ${err instanceof Error ? err.message : String(err)}`
          : `Failed to parse file: ${err instanceof Error ? err.message : String(err)}`
      )
    } finally {
      setLoading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function handleConfirmImport() {
    const barcodeToId = new Map(products.map((p) => [p.barcode, p.id]))

    rows.forEach((row) => {
      if (row.status === 'error') return
      const data = {
        nameAr:   row.nameAr,
        nameEn:   row.nameEn,
        barcode:  row.barcode,
        price:    row.price,
        stock:    row.stock,
        category: row.category,
      }
      if (row.status === 'update') {
        const id = barcodeToId.get(row.barcode)
        if (id) updateProduct(id, data)
      } else {
        addProduct(data)
      }
    })

    setImported(true)
  }

  const addCount    = rows.filter((r) => r.status === 'add').length
  const updateCount = rows.filter((r) => r.status === 'update').length
  const errorCount  = rows.filter((r) => r.status === 'error').length
  const validCount  = addCount + updateCount

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
            {isRTL ? 'استيراد المنتجات' : 'Import Products'}
          </DialogTitle>
          <DialogDescription>
            {isRTL
              ? 'ارفع ملف CSV أو Excel يحتوي على بيانات المنتجات.'
              : 'Upload a CSV or Excel file containing product data.'}
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Success state */}
          {imported ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {isRTL ? 'تم الاستيراد بنجاح!' : 'Import Successful!'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRTL
                    ? `تمت إضافة ${addCount} منتج وتحديث ${updateCount} منتج.`
                    : `${addCount} product(s) added, ${updateCount} product(s) updated.`}
                </p>
              </div>
              <Button onClick={handleClose} className="bg-primary text-primary-foreground mt-2">
                {isRTL ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          ) : (
            <>
              {/* Upload area / file info */}
              {rows.length === 0 ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors text-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {isRTL ? 'اسحب وأسقط الملف هنا أو انقر للاختيار' : 'Drag & drop or click to choose file'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {isRTL ? 'يدعم: CSV, XLSX' : 'Supports: CSV, XLSX'}
                    </p>
                  </div>
                  {loading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {isRTL ? 'جاري التحليل...' : 'Parsing...'}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-secondary border border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-medium truncate">{fileName}</span>
                  </div>
                  <button
                    onClick={reset}
                    className="w-7 h-7 rounded-md hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors text-muted-foreground shrink-0"
                    title={isRTL ? 'إزالة الملف' : 'Remove file'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Parse error */}
              {parseError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Summary pills */}
              {rows.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground font-medium">
                    {isRTL ? `${rows.length} صف` : `${rows.length} rows`}
                  </span>
                  {addCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-success/15 text-success font-semibold text-xs border border-success/20">
                      + {addCount} {isRTL ? 'جديد' : 'new'}
                    </span>
                  )}
                  {updateCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-semibold text-xs border border-amber-500/20 dark:text-amber-400">
                      ~ {updateCount} {isRTL ? 'تحديث' : 'update'}
                    </span>
                  )}
                  {errorCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-semibold text-xs border border-destructive/20">
                      ! {errorCount} {isRTL ? 'خطأ' : 'error'}
                    </span>
                  )}
                </div>
              )}

              {/* Preview table */}
              {rows.length > 0 && (
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary border-b border-border text-muted-foreground">
                          <th className="px-3 py-2.5 font-semibold text-left w-6">#</th>
                          <th className="px-3 py-2.5 font-semibold text-left">
                            {isRTL ? 'الاسم' : 'Name'}
                          </th>
                          <th className="px-3 py-2.5 font-semibold text-left">
                            {isRTL ? 'الباركود' : 'Barcode'}
                          </th>
                          <th className="px-3 py-2.5 font-semibold text-left">
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
                        {rows.map((row, idx) => (
                          <tr
                            key={idx}
                            className={cn(
                              'border-b border-border last:border-0',
                              row.status === 'add'    && 'bg-success/5',
                              row.status === 'update' && 'bg-amber-500/5',
                              row.status === 'error'  && 'bg-destructive/5',
                            )}
                          >
                            <td className="px-3 py-2.5 text-muted-foreground text-xs">{idx + 1}</td>
                            <td className="px-3 py-2.5">
                              <p className="font-medium leading-tight">{row.nameAr || <span className="text-muted-foreground italic text-xs">—</span>}</p>
                              <p className="text-xs text-muted-foreground leading-tight">{row.nameEn}</p>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                              {row.barcode}
                            </td>
                            <td className="px-3 py-2.5 text-xs">
                              <span className="px-1.5 py-0.5 rounded-md bg-secondary">
                                {row.category}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs font-semibold">
                              {row.price.toLocaleString()}
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs">
                              {row.stock}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {row.status === 'add' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 text-success text-xs font-semibold border border-success/20 whitespace-nowrap">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {isRTL ? 'إضافة' : 'Add'}
                                </span>
                              )}
                              {row.status === 'update' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/20 whitespace-nowrap">
                                  <RefreshCw className="w-3 h-3" />
                                  {isRTL ? 'تحديث' : 'Update'}
                                </span>
                              )}
                              {row.status === 'error' && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20 whitespace-nowrap"
                                  title={row.error}
                                >
                                  <AlertCircle className="w-3 h-3" />
                                  {isRTL ? 'خطأ' : 'Error'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!imported && (
          <div className="px-6 py-4 shrink-0 border-t border-border flex items-center justify-between gap-3 flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={downloadSampleCSV}
              className="border-border gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              {isRTL ? 'تحميل نموذج CSV' : 'Download Sample CSV'}
            </Button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={handleClose} className="border-border">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                type="button"
                disabled={validCount === 0}
                onClick={handleConfirmImport}
                className="bg-primary text-primary-foreground gap-2"
              >
                <Upload className="w-4 h-4" />
                {isRTL
                  ? `تأكيد الاستيراد (${validCount})`
                  : `Confirm Import (${validCount})`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
