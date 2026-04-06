'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store-context'
import { Category } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Save, Globe, Store, Receipt, Tag, Plus, Pencil, Trash2, Check, X } from 'lucide-react'

export default function SettingsPage() {
  const { settings, updateSettings, categories, addCategory, updateCategory, deleteCategory } = useStore()
  const isRTL = settings.rtl

  const [form, setForm] = useState({ ...settings })
  const [saved, setSaved] = useState(false)

  // New category inputs
  const [newCatEn, setNewCatEn] = useState('')
  const [newCatAr, setNewCatAr] = useState('')

  // Editing state
  const [editingCat, setEditingCat] = useState<string | null>(null) // stores nameEn key
  const [editingEn, setEditingEn] = useState('')
  const [editingAr, setEditingAr] = useState('')

  useEffect(() => {
    setForm({ ...settings })
  }, [settings])

  function set(field: string, value: string | boolean | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    updateSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleAddCategory() {
    const en = newCatEn.trim()
    const ar = newCatAr.trim()
    if (!en || !ar) return
    addCategory({ nameEn: en, nameAr: ar })
    setNewCatEn('')
    setNewCatAr('')
  }

  function startEditCat(cat: Category) {
    setEditingCat(cat.nameEn)
    setEditingEn(cat.nameEn)
    setEditingAr(cat.nameAr)
  }

  function confirmEditCat() {
    if (!editingCat || !editingEn.trim() || !editingAr.trim()) return
    updateCategory(editingCat, { nameEn: editingEn.trim(), nameAr: editingAr.trim() })
    setEditingCat(null)
  }

  function cancelEditCat() {
    setEditingCat(null)
    setEditingEn('')
    setEditingAr('')
  }

  const t = {
    title:            isRTL ? 'الإعدادات'              : 'Settings',
    storeInfo:        isRTL ? 'معلومات المتجر'          : 'Store Information',
    storeName:        isRTL ? 'اسم المتجر (English)'    : 'Store Name (English)',
    storeNameAr:      isRTL ? 'اسم المتجر (العربي)'     : 'Store Name (Arabic)',
    address:          isRTL ? 'العنوان'                 : 'Address',
    phone:            isRTL ? 'رقم الهاتف'              : 'Phone Number',
    display:          isRTL ? 'إعدادات العرض'            : 'Display Settings',
    receiptSettings:  isRTL ? 'إعدادات الإيصال'         : 'Receipt Settings',
    taxRate:          isRTL ? 'نسبة الضريبة (%)'        : 'Tax Rate (%)',
    receiptFooter:    isRTL ? 'ملاحظة أسفل الإيصال'    : 'Receipt Footer Message',
    save:             isRTL ? 'حفظ الإعدادات'           : 'Save Settings',
    savedMsg:         isRTL ? 'تم الحفظ!'               : 'Saved!',
    manageCategories: isRTL ? 'إدارة الفئات'            : 'Manage Categories',
    addCategory:      isRTL ? 'إضافة'                   : 'Add',
    nameEnPlaceholder:isRTL ? 'الاسم بالإنجليزي...'    : 'English name...',
    nameArPlaceholder:isRTL ? 'الاسم بالعربي...'       : 'Arabic name...',
    noCategories:     isRTL ? 'لا توجد فئات'            : 'No categories yet',
    bothRequired:     isRTL ? 'كلا الحقلين مطلوبان'    : 'Both fields are required',
  }

  const addDisabled = !newCatEn.trim() || !newCatAr.trim()

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 gap-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-xl font-bold">{t.title}</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

        {/* Left column: store settings form */}
        <form onSubmit={handleSave} className="flex flex-col gap-6">

          {/* Store info */}
          <section className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Store className="w-4 h-4 text-primary" />
              {t.storeInfo}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">{t.storeName}</label>
                <Input
                  value={form.storeName}
                  onChange={(e) => set('storeName', e.target.value)}
                  className="bg-input border-border"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">{t.storeNameAr}</label>
                <Input
                  value={form.storeNameAr}
                  onChange={(e) => set('storeNameAr', e.target.value)}
                  className="bg-input border-border text-right"
                  dir="rtl"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs text-muted-foreground">{t.address}</label>
                <Input
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  className="bg-input border-border"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">{t.phone}</label>
                <Input
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  className="bg-input border-border"
                  dir="ltr"
                />
              </div>
            </div>
          </section>

          {/* Display */}
          <section className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Globe className="w-4 h-4 text-primary" />
              {t.display}
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">{isRTL ? 'اتجاه الصفحة' : 'Page Direction'}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => set('rtl', false)}
                  className={cn(
                    'flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all',
                    !form.rtl
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  )}
                >
                  LTR (English)
                </button>
                <button
                  type="button"
                  onClick={() => set('rtl', true)}
                  className={cn(
                    'flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all',
                    form.rtl
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  )}
                >
                  RTL (عربي)
                </button>
              </div>
            </div>
          </section>

          {/* Receipt */}
          <section className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Receipt className="w-4 h-4 text-primary" />
              {t.receiptSettings}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">{t.taxRate}</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.taxRate}
                  onChange={(e) => set('taxRate', parseFloat(e.target.value) || 0)}
                  className="bg-input border-border"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs text-muted-foreground">{t.receiptFooter}</label>
                <Input
                  value={form.receiptFooter}
                  onChange={(e) => set('receiptFooter', e.target.value)}
                  className="bg-input border-border"
                />
              </div>
            </div>
          </section>

          <Button
            type="submit"
            className={cn(
              'h-12 font-bold text-base rounded-xl gap-2 transition-all',
              saved
                ? 'bg-green-600 text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            <Save className="w-4 h-4" />
            {saved ? t.savedMsg : t.save}
          </Button>
        </form>

        {/* Right column: Manage Categories */}
        <section className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Tag className="w-4 h-4 text-primary" />
            {t.manageCategories}
          </div>

          {/* Add new category — two inputs */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                value={newCatEn}
                onChange={(e) => setNewCatEn(e.target.value)}
                placeholder={t.nameEnPlaceholder}
                className="bg-input border-border flex-1"
                dir="ltr"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
              />
              <Input
                value={newCatAr}
                onChange={(e) => setNewCatAr(e.target.value)}
                placeholder={t.nameArPlaceholder}
                className="bg-input border-border flex-1"
                dir="rtl"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
              />
            </div>
            <Button
              type="button"
              onClick={handleAddCategory}
              disabled={addDisabled}
              className="bg-primary text-primary-foreground gap-1 w-full"
            >
              <Plus className="w-4 h-4" />
              {t.addCategory}
            </Button>
          </div>

          {/* Categories list */}
          <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t.noCategories}</p>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.nameEn}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border group"
                >
                  {editingCat === cat.nameEn ? (
                    <div className="flex flex-col gap-1.5 flex-1">
                      <div className="flex gap-1">
                        <Input
                          value={editingEn}
                          onChange={(e) => setEditingEn(e.target.value)}
                          className="h-7 text-xs bg-input border-border flex-1"
                          dir="ltr"
                          placeholder="English"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') cancelEditCat()
                          }}
                        />
                        <Input
                          value={editingAr}
                          onChange={(e) => setEditingAr(e.target.value)}
                          className="h-7 text-xs bg-input border-border flex-1"
                          dir="rtl"
                          placeholder="العربي"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmEditCat()
                            if (e.key === 'Escape') cancelEditCat()
                          }}
                        />
                      </div>
                      <div className="flex gap-1 justify-end">
                        <button
                          type="button"
                          onClick={confirmEditCat}
                          disabled={!editingEn.trim() || !editingAr.trim()}
                          className="h-7 px-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1 text-xs transition-colors disabled:opacity-40"
                        >
                          <Check className="w-3 h-3" />
                          {isRTL ? 'حفظ' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditCat}
                          className="h-7 px-2 rounded-md bg-secondary hover:bg-border flex items-center gap-1 text-xs transition-colors text-muted-foreground"
                        >
                          <X className="w-3 h-3" />
                          {isRTL ? 'إلغاء' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{cat.nameEn}</p>
                        <p className="text-xs text-muted-foreground truncate" dir="rtl">{cat.nameAr}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => startEditCat(cat)}
                        className="w-7 h-7 rounded-md opacity-0 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-all text-muted-foreground shrink-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCategory(cat.nameEn)}
                        className="w-7 h-7 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-all text-muted-foreground shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  )
}
