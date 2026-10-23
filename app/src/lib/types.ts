export type StaffRole = 'owner' | 'cashier'
export type CustomerType = 'retail' | 'wholesale'
export type ProductUnit = 'litre' | 'kg' | 'packet' | 'piece'
export type SaleType = 'retail' | 'wholesale'
export type SaleStatus = 'posted' | 'voided'
export type PaymentMethod = 'cash' | 'online'
export type PaymentKind = 'sale_payment' | 'repayment' | 'refund' | 'reversal'

export interface StaffProfile {
  id: string
  full_name: string
  role: StaffRole
  can_override_wholesale: boolean
  can_void: boolean
  active: boolean
}

export interface Category {
  id: string
  name: string
  sort_order: number
}

export interface Product {
  id: string
  title: string
  category_id: string
  unit: ProductUnit
  /** Identification label such as "500 ml" or "1 L". Not stock. */
  pack_size: string | null
  retail_price: number
  image_path: string | null
  description: string | null
  sort_order: number
  is_pinned: boolean
  active: boolean
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  type: CustomerType
  address: string | null
  notes: string | null
  active: boolean
}

export interface CustomerWithBalance extends Customer {
  balance: number
  open_invoices: number
}

export interface Sale {
  id: string
  invoice_no: number
  sale_type: SaleType
  customer_id: string | null
  status: SaleStatus
  total: number
  business_date: string
  idempotency_key: string
  created_by: string
  created_at: string
  voided_at: string | null
  void_reason: string | null
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string | null
  product_title: string
  pack_size: string | null
  unit: ProductUnit
  quantity: number
  unit_price: number
  retail_price: number
  line_total: number
}

export interface Payment {
  id: string
  customer_id: string | null
  sale_id: string | null
  kind: PaymentKind
  method: PaymentMethod
  amount: number
  reference: string | null
  received_by: string
  created_at: string
}

export interface SaleBalance {
  id: string
  invoice_no: number
  customer_id: string | null
  sale_type: SaleType
  business_date: string
  created_at: string
  status: SaleStatus
  total: number
  paid: number
  due: number
}

export interface LedgerEntry {
  entry_date: string
  entry_type: 'sale' | 'payment'
  invoice_no: number | null
  sale_id: string | null
  description: string
  debit: number
  credit: number
  balance: number
}

export interface BusinessSettings {
  id: boolean
  business_name: string
  contact: string
  logo_path: string | null
  receipt_footer: string
  currency: string
}

export interface CartLine {
  product: Product
  /** Editable text so partial decimal input feels natural; parsed on submit. */
  qtyInput: string
  /** Only meaningful for wholesale; empty string means "use retail" */
  priceInput: string
}
