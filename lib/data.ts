export type Product = {
  id: string
  nameAr: string
  nameEn: string
  barcode: string
  category: string
  price: number // IQD whole number
  costPrice?: number // IQD whole number — optional, used for profit calculation
  stock: number
  soldCount: number
  image?: string // base64 or URL
}

export type Category = {
  nameEn: string
  nameAr: string
}

export const DEFAULT_CATEGORIES: Category[] = [
  { nameEn: 'Grains',       nameAr: 'حبوب'         },
  { nameEn: 'Oils',         nameAr: 'زيوت'         },
  { nameEn: 'Sweeteners',   nameAr: 'مُحلّيات'     },
  { nameEn: 'Beverages',    nameAr: 'مشروبات'      },
  { nameEn: 'Dairy',        nameAr: 'منتجات الألبان' },
  { nameEn: 'Canned Goods', nameAr: 'معلبات'       },
  { nameEn: 'Household',    nameAr: 'منزلي'        },
  { nameEn: 'Legumes',      nameAr: 'بقوليات'      },
  { nameEn: 'Spices',       nameAr: 'توابل'        },
  { nameEn: 'Condiments',   nameAr: 'مرطبات'       },
  { nameEn: 'Other',        nameAr: 'أخرى'         },
]

export type CartItem = {
  product: Product
  quantity: number
}

export type PaymentMethod = 'cash' | 'card'

export type Transaction = {
  id: string
  date: string // ISO string
  items: { nameAr: string; nameEn: string; quantity: number; unitPrice: number; total: number; costPrice?: number }[]
  subtotal: number
  discount: number
  tax: number
  total: number
  paymentMethod: PaymentMethod
  amountPaid: number
  change: number
  /** True when this transaction has been fully refunded */
  refunded?: boolean
  /** ID of the refund transaction created for this sale */
  refundId?: string
  /** If this IS a refund record, the ID of the original transaction it reverses */
  originalTransactionId?: string
}

export type Settings = {
  storeName: string
  storeNameAr: string
  address: string
  phone: string
  rtl: boolean
  taxRate: number
  receiptFooter: string
  /** ISO date strings (YYYY-MM-DD) of days that have been closed */
  closedDays: string[]
  /** When true, blocks new sales after the day has been closed */
  enforceDayClose: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  storeName: 'Al-Amin Supermarket',
  storeNameAr: 'سوبرماركت الأمين',
  address: 'شارع المتنبي، بغداد، العراق',
  phone: '+964 770 123 4567',
  rtl: false,
  taxRate: 0,
  receiptFooter: 'شكراً لزيارتكم — Thank you for your visit!',
  closedDays: [],
  enforceDayClose: true,
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    nameAr: 'أرز بسمتي',
    nameEn: 'Basmati Rice 5kg',
    barcode: '6901234567890',
    category: 'Grains',
    price: 12000,
    stock: 45,
    soldCount: 210,
  },
  {
    id: '2',
    nameAr: 'زيت نباتي',
    nameEn: 'Vegetable Oil 1.8L',
    barcode: '6901234567891',
    category: 'Oils',
    price: 8500,
    stock: 30,
    soldCount: 185,
  },
  {
    id: '3',
    nameAr: 'سكر أبيض',
    nameEn: 'White Sugar 2kg',
    barcode: '6901234567892',
    category: 'Sweeteners',
    price: 4500,
    stock: 60,
    soldCount: 320,
  },
  {
    id: '4',
    nameAr: 'ماء نقي 1.5L',
    nameEn: 'Purified Water 1.5L',
    barcode: '6901234567893',
    category: 'Beverages',
    price: 750,
    stock: 120,
    soldCount: 540,
  },
  {
    id: '5',
    nameAr: 'شاي أحمر',
    nameEn: 'Black Tea 500g',
    barcode: '6901234567894',
    category: 'Beverages',
    price: 6000,
    stock: 25,
    soldCount: 145,
  },
  {
    id: '6',
    nameAr: 'طحين أبيض',
    nameEn: 'White Flour 2kg',
    barcode: '6901234567895',
    category: 'Grains',
    price: 3500,
    stock: 4,
    soldCount: 98,
  },
  {
    id: '7',
    nameAr: 'حليب كامل الدسم',
    nameEn: 'Full Fat Milk 1L',
    barcode: '6901234567896',
    category: 'Dairy',
    price: 2000,
    stock: 3,
    soldCount: 275,
  },
  {
    id: '8',
    nameAr: 'معجون طماطم',
    nameEn: 'Tomato Paste 400g',
    barcode: '6901234567897',
    category: 'Canned Goods',
    price: 1800,
    stock: 40,
    soldCount: 160,
  },
  {
    id: '9',
    nameAr: 'صابون غسيل',
    nameEn: 'Laundry Soap 1kg',
    barcode: '6901234567898',
    category: 'Household',
    price: 5000,
    stock: 18,
    soldCount: 88,
  },
  {
    id: '10',
    nameAr: 'بيض طازج (30 بيضة)',
    nameEn: 'Fresh Eggs x30',
    barcode: '6901234567899',
    category: 'Dairy',
    price: 9000,
    stock: 2,
    soldCount: 190,
  },
  {
    id: '11',
    nameAr: 'عدس أصفر',
    nameEn: 'Yellow Lentils 1kg',
    barcode: '6901234567900',
    category: 'Legumes',
    price: 3000,
    stock: 35,
    soldCount: 120,
  },
  {
    id: '12',
    nameAr: 'فاصولياء بيضاء',
    nameEn: 'White Beans 1kg',
    barcode: '6901234567901',
    category: 'Legumes',
    price: 3500,
    stock: 28,
    soldCount: 75,
  },
  {
    id: '13',
    nameAr: 'معكرونة إيطالية',
    nameEn: 'Italian Pasta 500g',
    barcode: '6901234567902',
    category: 'Grains',
    price: 2500,
    stock: 50,
    soldCount: 230,
  },
  {
    id: '14',
    nameAr: 'ملح طعام',
    nameEn: 'Table Salt 1kg',
    barcode: '6901234567903',
    category: 'Spices',
    price: 1000,
    stock: 80,
    soldCount: 310,
  },
  {
    id: '15',
    nameAr: 'كاتشب طماطم',
    nameEn: 'Tomato Ketchup 500g',
    barcode: '6901234567904',
    category: 'Condiments',
    price: 4000,
    stock: 1,
    soldCount: 145,
  },
]

// Stable mock transactions — fixed dates relative to 2026-04-07 so they always appear
// within the default 7-day filter window regardless of when the module loads.
// New transactions added via checkout are prepended on top of these.
export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'TXN-DEMO-001',
    date: new Date().toISOString(),
    items: [
      { nameAr: 'أرز بسمتي', nameEn: 'Basmati Rice 5kg', quantity: 2, unitPrice: 12000, total: 24000 },
      { nameAr: 'زيت نباتي', nameEn: 'Vegetable Oil 1.8L', quantity: 1, unitPrice: 8500, total: 8500 },
    ],
    subtotal: 32500,
    discount: 0,
    tax: 0,
    total: 32500,
    paymentMethod: 'cash',
    amountPaid: 35000,
    change: 2500,
  },
  {
    id: 'TXN-DEMO-002',
    date: new Date().toISOString(),
    items: [
      { nameAr: 'سكر أبيض', nameEn: 'White Sugar 2kg', quantity: 3, unitPrice: 4500, total: 13500 },
      { nameAr: 'شاي أحمر', nameEn: 'Black Tea 500g', quantity: 2, unitPrice: 6000, total: 12000 },
    ],
    subtotal: 25500,
    discount: 2500,
    tax: 0,
    total: 23000,
    paymentMethod: 'card',
    amountPaid: 23000,
    change: 0,
  },
  {
    id: 'TXN-DEMO-003',
    date: new Date().toISOString(),
    items: [
      { nameAr: 'حليب كامل الدسم', nameEn: 'Full Fat Milk 1L', quantity: 4, unitPrice: 2000, total: 8000 },
      { nameAr: 'بيض طازج (30 بيضة)', nameEn: 'Fresh Eggs x30', quantity: 1, unitPrice: 9000, total: 9000 },
    ],
    subtotal: 17000,
    discount: 0,
    tax: 0,
    total: 17000,
    paymentMethod: 'cash',
    amountPaid: 20000,
    change: 3000,
  },
]

export function formatIQD(amount: number): string {
  return amount.toLocaleString('ar-IQ') + ' د.ع'
}
