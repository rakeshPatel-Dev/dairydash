import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryClient'
import { useAuth } from '../../auth/AuthProvider'
import { lineTotal, parseRupees, rupeesToInput } from '../../lib/money'
import { supabase } from '../../lib/supabase'
import { useOnlineStatus } from '../../lib/useOnlineStatus'
import type {
  CartLine,
  Category,
  Customer,
  CustomerWithBalance,
  PaymentMethod,
  Product,
  SaleType,
} from '../../lib/types'

/** Method picked at the pay step. 'credit' records no payment — the balance goes to the customer. */
export type SaleMethod = 'cash' | 'online' | 'credit'

/** Radix Select can't use an empty value, so "Walk-in" maps to customerId ''. */
export const WALK_IN = 'walk-in'

export function productImageUrl(path: string | null): string | null {
  if (!path) return null
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
}

interface SaleFlowContextValue {
  online: boolean
  loading: boolean

  /* selection */
  products: Product[]
  categories: Category[]
  category: string
  setCategory: (value: string) => void
  filteredProducts: Product[]
  imageUrls: Record<string, string | null>
  qtyByProduct: Record<string, number>
  addProduct: (product: Product) => void

  /* sale type + cart */
  saleType: SaleType
  changeSaleType: (next: SaleType) => void
  isWholesale: boolean
  wholesalePrices: Record<string, number>
  lines: CartLine[]
  lineQty: (line: CartLine) => number
  linePrice: (line: CartLine) => number
  updateLine: (productId: string, patch: Partial<CartLine>) => void
  removeLine: (productId: string) => void
  resetSale: () => void
  total: number

  /* customer */
  customerId: string
  setCustomerId: (value: string) => void
  customers: CustomerWithBalance[]
  rememberCustomer: (customer: Customer) => void

  /* payment */
  method: SaleMethod
  setMethod: (value: SaleMethod) => void
  cashTendered: string
  applyTender: (value: string) => void
  onlineReference: string
  setOnlineReference: (value: string) => void

  /* checkout */
  busy: boolean
  error: string | null
  setError: (value: string | null) => void
  canOverride: boolean
  /** Runs checkout. Returns the new sale id, or the validation/rpc error. */
  checkout: () => Promise<{ saleId: string | null; error: string | null }>

  /* completed */
  completedSaleId: string | null
  setCompletedSaleId: (value: string | null) => void
}

const SaleFlowContext = createContext<SaleFlowContextValue | null>(null)

export function useSaleFlow(): SaleFlowContextValue {
  const ctx = useContext(SaleFlowContext)
  if (!ctx) throw new Error('useSaleFlow must be used inside the sale flow')
  return ctx
}

export function SaleFlowProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const online = useOnlineStatus()
  const queryClient = useQueryClient()
  const [saleType, setSaleType] = useState<SaleType>('retail')
  const [customerId, setCustomerId] = useState<string>('')
  const [lines, setLines] = useState<CartLine[]>([])
  const [category, setCategory] = useState<string>('all')
  const [method, setMethod] = useState<SaleMethod>('cash')
  const [cashTendered, setCashTendered] = useState('')
  const [onlineReference, setOnlineReference] = useState('')
  const [wholesalePrices, setWholesalePrices] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null)

  const idempotencyKey = useRef(crypto.randomUUID())
  const isWholesale = saleType === 'wholesale'
  const canOverride = profile?.can_override_wholesale || profile?.role === 'owner'

  const loadCatalog = useQuery({
    queryKey: ['sale-catalog'],
    queryFn: async () => {
      const [productsRes, categoriesRes, customersRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('active', true)
          .order('is_pinned', { ascending: false })
          .order('sort_order'),
        supabase.from('product_categories').select('*').order('sort_order'),
        supabase.rpc('customers_with_balance'),
      ])
      if (productsRes.error) throw productsRes.error
      if (categoriesRes.error) throw categoriesRes.error
      if (customersRes.error) throw customersRes.error
      return {
        products: (productsRes.data as Product[]) ?? [],
        categories: (categoriesRes.data as Category[]) ?? [],
        customers: (customersRes.data as CustomerWithBalance[]) ?? [],
      }
    },
  })
  const products = loadCatalog.data?.products ?? []
  const categories = loadCatalog.data?.categories ?? []
  const customers = loadCatalog.data?.customers ?? []
  const loading = loadCatalog.isPending

  // Reloading the catalog is deliberately not part of query invalidation
  // cycles elsewhere; the flow refetches it after a checkout so stock and
  // balances stay honest. Results are cached — remounts of /sale reuse them.
  function refreshCatalog() {
    void queryClient.invalidateQueries({ queryKey: ['sale-catalog'] })
  }

  useEffect(() => {
    if (loadCatalog.error) setError(loadCatalog.error.message)
  }, [loadCatalog.error])

  useEffect(() => {
    if (!isWholesale || !customerId) {
      setWholesalePrices({})
      return
    }
    let cancelled = false
    supabase.rpc('last_wholesale_prices', { p_customer_id: customerId }).then(({ data }) => {
      if (cancelled) return
      const map: Record<string, number> = {}
      for (const row of (data as { product_id: string; unit_price: number }[]) ?? []) {
        map[row.product_id] = row.unit_price
      }
      setWholesalePrices(map)
      setLines((current) =>
        current.map((line) => ({
          ...line,
          priceInput: rupeesToInput(map[line.product.id] ?? line.product.retail_price),
        })),
      )
    })
    return () => {
      cancelled = true
    }
  }, [customerId, isWholesale])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => category === 'all' || product.category_id === category)
  }, [products, category])

  const imageUrls = useMemo(() => {
    const map: Record<string, string | null> = {}
    for (const p of products) map[p.id] = productImageUrl(p.image_path)
    return map
  }, [products])

  const qtyByProduct = useMemo(() => {
    const map: Record<string, number> = {}
    for (const line of lines) map[line.product.id] = lineQty(line)
    return map
  }, [lines])

  function linePrice(line: CartLine): number {
    if (!isWholesale) return line.product.retail_price
    if (line.priceInput.trim() === '') {
      return wholesalePrices[line.product.id] ?? line.product.retail_price
    }
    return parseRupees(line.priceInput) ?? line.product.retail_price
  }

  function lineQty(line: CartLine): number {
    const qty = Number(line.qtyInput)
    return Number.isFinite(qty) ? qty : 0
  }

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + lineTotal(lineQty(line), linePrice(line)), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, isWholesale, wholesalePrices],
  )
  /* total only — payments are either the full amount (cash/online) or nothing (credit) */

  function addProduct(product: Product) {
    if (!online) return
    setError(null)
    const existing = lines.find((line) => line.product.id === product.id)
    if (existing) {
      setLines(
        lines.map((line) =>
          line.product.id === product.id
            ? { ...line, qtyInput: String(Math.round((lineQty(line) + 1) * 1000) / 1000) }
            : line,
        ),
      )
      return
    }
    setLines([
      ...lines,
      {
        product,
        qtyInput: '1',
        priceInput: isWholesale ? rupeesToInput(wholesalePrices[product.id] ?? product.retail_price) : '',
      },
    ])
  }

  function updateLine(productId: string, patch: Partial<CartLine>) {
    setLines((current) => current.map((line) => (line.product.id === productId ? { ...line, ...patch } : line)))
  }

  function removeLine(productId: string) {
    setLines((current) => current.filter((line) => line.product.id !== productId))
  }

  function changeSaleType(next: SaleType) {
    if (next === saleType) return
    setSaleType(next)
    setError(null)
    if (next === 'retail') {
      setLines((current) => current.map((line) => ({ ...line, priceInput: '' })))
    } else {
      setLines((current) =>
        current.map((line) => ({
          ...line,
          priceInput: rupeesToInput(wholesalePrices[line.product.id] ?? line.product.retail_price),
        })),
      )
    }
  }

  function resetSale() {
    setLines([])
    setMethod('cash')
    setCashTendered('')
    setOnlineReference('')
    setError(null)
    idempotencyKey.current = crypto.randomUUID()
  }

  /** Cash tender is only used to compute the change to return; the sale posts the full total. */
  function applyTender(value: string) {
    setCashTendered(value)
  }

  async function checkout(): Promise<{ saleId: string | null; error: string | null }> {
    setError(null)

    if (!online) {
      setError('No internet. Not saved.')
      return { saleId: null, error: 'No internet. Not saved.' }
    }
    if (lines.length === 0) {
      setError('Cart is empty.')
      return { saleId: null, error: 'Cart is empty.' }
    }
    for (const line of lines) {
      if (!(lineQty(line) > 0)) {
        setError(`Quantity missing for ${line.product.title}.`)
        return { saleId: null, error: `Quantity missing for ${line.product.title}.` }
      }
      if (line.product.unit === 'packet' || line.product.unit === 'piece') {
        if (!Number.isInteger(lineQty(line))) {
          setError(`${line.product.title}: whole ${line.product.unit}s only.`)
          return { saleId: null, error: `${line.product.title}: whole ${line.product.unit}s only.` }
        }
      }
      if (linePrice(line) < 0) {
        setError(`Invalid price: ${line.product.title}.`)
        return { saleId: null, error: `Invalid price: ${line.product.title}.` }
      }
    }
    if (isWholesale && !customerId) {
      setError('Wholesale needs a customer.')
      return { saleId: null, error: 'Wholesale needs a customer.' }
    }
    if (method === 'credit' && !customerId) {
      setError('Credit sale needs a customer.')
      return { saleId: null, error: 'Credit sale needs a customer.' }
    }

    const overrides = isWholesale ? lines.some((line) => linePrice(line) !== line.product.retail_price) : false
    if (overrides && !canOverride) {
      setError('No permission to override prices.')
      return { saleId: null, error: 'No permission to override prices.' }
    }

    setBusy(true)
    try {
      const payloadItems = lines.map((line) => ({
        product_id: line.product.id,
        quantity: Number(lineQty(line).toFixed(3)),
        ...(isWholesale ? { unit_price: linePrice(line) } : {}),
      }))
      const payloadPayments =
        method === 'credit'
          ? []
          : [{ method: method as PaymentMethod, amount: total, reference: onlineReference.trim() || null }]

      const { data, error: rpcError } = await supabase.rpc('checkout', {
        p_idempotency_key: idempotencyKey.current,
        p_sale_type: saleType,
        p_customer_id: customerId || null,
        p_items: payloadItems,
        p_payments: payloadPayments,
      })

      if (rpcError) throw new Error(rpcError.message)

      const sale = data as { id: string }
      resetSale()
      refreshCatalog()
      return { saleId: sale.id, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed'
      setError(message)
      return { saleId: null, error: message }
    } finally {
      setBusy(false)
    }
  }

  const value: SaleFlowContextValue = {
    online,
    loading,
    products,
    categories,
    category,
    setCategory,
    filteredProducts,
    imageUrls,
    qtyByProduct,
    addProduct,
    saleType,
    changeSaleType,
    isWholesale,
    wholesalePrices,
    lines,
    lineQty,
    linePrice,
    updateLine,
    removeLine,
    resetSale,
    total,
    customerId,
    setCustomerId,
    customers,
    rememberCustomer: (customer) => {
      queryClient.setQueryData<{ products: Product[]; categories: Category[]; customers: CustomerWithBalance[] }>(
        ['sale-catalog'],
        (current) =>
          current == null || current.customers.some((c) => c.id === customer.id)
            ? current
            : {
                ...current,
                customers: [...current.customers, { ...customer, balance: 0, open_invoices: 0 }],
              },
      )
      // Other pages have their own cached customer lists.
      void queryClient.invalidateQueries({ queryKey: queryKeys.customers() })
    },
    method,
    setMethod,
    cashTendered,
    applyTender,
    onlineReference,
    setOnlineReference,
    busy,
    error,
    setError,
    canOverride,
    checkout,
    completedSaleId,
    setCompletedSaleId,
  }

  return <SaleFlowContext.Provider value={value}>{children}</SaleFlowContext.Provider>
}
