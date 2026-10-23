import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatRupees } from '../lib/money'
import type { BusinessSettings, Customer, Payment, Sale, SaleItem } from '../lib/types'
import { formatSoldQuantity } from '../lib/quantity'
import { Button } from '@/components/ui/button'
import { Notice } from './Notice'

export interface ReceiptData {
  sale: Sale | null
  items: SaleItem[]
  payments: Payment[]
  customer: Customer | null
  settings: BusinessSettings | null
  error: string | null
}

/** Loads a sale, its items, payments, customer and business settings from Supabase. */
export function useReceiptData(saleId: string): ReceiptData {
  const [data, setData] = useState<ReceiptData>({
    sale: null,
    items: [],
    payments: [],
    customer: null,
    settings: null,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: saleRow, error: saleError } = await supabase.from('sales').select('*').eq('id', saleId).single()
      if (saleError) {
        if (!cancelled) setData((d) => ({ ...d, error: saleError.message }))
        return
      }
      const row = saleRow as Sale

      const [itemsRes, paymentsRes, settingsRes] = await Promise.all([
        supabase.from('sale_items').select('*').eq('sale_id', saleId),
        supabase.from('payments').select('*').eq('sale_id', saleId).order('created_at'),
        supabase.from('business_settings').select('*').eq('id', true).maybeSingle(),
      ])

      let customer: Customer | null = null
      if (row.customer_id) {
        const { data: customerRow } = await supabase
          .from('customers')
          .select('*')
          .eq('id', row.customer_id)
          .maybeSingle()
        customer = (customerRow as Customer) ?? null
      }

      if (cancelled) return
      setData({
        sale: row,
        items: (itemsRes.data as SaleItem[]) ?? [],
        payments: (paymentsRes.data as Payment[]) ?? [],
        customer,
        settings: (settingsRes.data as BusinessSettings) ?? null,
        error: null,
      })
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [saleId])

  return data
}

/** The printable receipt "paper". Pure presentation on top of ReceiptData. */
export function ReceiptSheet({ data }: { data: ReceiptData }) {
  const { sale, items, payments, customer, settings } = data
  if (!sale) return null

  const paid = payments.filter((p) => p.kind === 'sale_payment').reduce((sum, p) => sum + p.amount, 0)
  const due = sale.status === 'voided' ? 0 : sale.total - paid
  const status =
    sale.status === 'voided' ? 'Voided' : due <= 0 ? 'Paid' : paid > 0 ? 'Partially paid' : 'Unpaid (Credit)'

  return (
    <div className="receipt mx-auto w-full max-w-[520px] rounded-[20px] bg-white p-8 text-[0.92rem] shadow-lg max-sm:p-6">
      <h2 className="text-center text-[1.4rem] font-bold tracking-[-0.02em]">
        {settings?.business_name ?? 'Dairydash'}
      </h2>
      {settings?.contact && <p className="my-1 text-center text-[0.84rem] text-ink-3">{settings.contact}</p>}
      <p className="my-1 text-center text-[0.84rem] text-ink-3">
        {sale.status === 'voided' ? 'VOIDED — ' : ''}
        Invoice #{sale.invoice_no} · {new Date(sale.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Kathmandu' })}
      </p>
      <p className="my-1 text-center text-[0.84rem] text-ink-3">
        {sale.sale_type === 'wholesale' ? 'Wholesale' : 'Retail'}
        {customer ? ` · ${customer.name}${customer.phone ? ` (${customer.phone})` : ''}` : ' · Walk-in'}
      </p>

      <table className="my-4 w-full border-collapse text-[0.88rem]">
        <thead>
          <tr>
            <th className="border-b border-[#e6ece7] px-1 py-1.5 text-left text-[0.68rem] font-bold tracking-[0.08em] whitespace-nowrap text-ink-3 uppercase">
              Item
            </th>
            <th className="border-b border-[#e6ece7] px-1 py-1.5 text-right text-[0.68rem] font-bold tracking-[0.08em] text-ink-3 uppercase">
              Qty
            </th>
            <th className="border-b border-[#e6ece7] px-1 py-1.5 text-right text-[0.68rem] font-bold tracking-[0.08em] text-ink-3 uppercase">
              Rate
            </th>
            <th className="border-b border-[#e6ece7] px-1 py-1.5 text-right text-[0.68rem] font-bold tracking-[0.08em] text-ink-3 uppercase">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="border-b border-dashed border-[#eef2ee] px-1 py-1.5">
                {item.product_title}
                {item.pack_size && <span className="text-ink-3"> · {item.pack_size}</span>}
              </td>
              <td className="border-b border-dashed border-[#eef2ee] px-1 py-1.5 text-right whitespace-nowrap">
                {formatSoldQuantity(item.quantity, item.unit)}
              </td>
              <td className="border-b border-dashed border-[#eef2ee] px-1 py-1.5 text-right whitespace-nowrap">
                {formatRupees(item.unit_price)}
              </td>
              <td className="border-b border-dashed border-[#eef2ee] px-1 py-1.5 text-right whitespace-nowrap">
                {formatRupees(item.line_total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2 flex flex-col gap-1.5">
        <div className="mt-1.5 flex justify-between border-t border-[#333] pt-1.5 text-[1.08rem] font-extrabold">
          <span>Total</span>
          <span>{formatRupees(sale.total)}</span>
        </div>
        {payments
          .filter((p) => p.kind === 'sale_payment')
          .map((p) => (
            <div className="flex justify-between" key={p.id}>
              <span>
                {p.method === 'cash' ? 'Cash' : 'Online'}
                {p.reference ? ` (${p.reference})` : ''}
              </span>
              <span>{formatRupees(p.amount)}</span>
            </div>
          ))}
        <div className="flex justify-between">
          <span>Balance due</span>
          <span>{formatRupees(due)}</span>
        </div>
        <div className="flex justify-between">
          <span>Status</span>
          <span>{status}</span>
        </div>
      </div>

      {sale.status === 'voided' && sale.void_reason && (
        <p className="mt-3 mb-1 text-center text-[0.84rem] text-ink-3">Void reason: {sale.void_reason}</p>
      )}

      <p className="mt-5 text-center text-[0.84rem] whitespace-pre-line text-ink-3">
        {settings?.receipt_footer ?? 'Thank you!'}
      </p>
    </div>
  )
}

interface ReceiptProps {
  saleId: string
  onClose: () => void
}

export function Receipt({ saleId, onClose }: ReceiptProps) {
  const data = useReceiptData(saleId)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="modal-backdrop fixed inset-0 z-60 grid animate-fade-in place-items-center overflow-y-auto bg-[rgba(13,26,17,0.55)] p-4 backdrop-blur-[8px] sm:p-8"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      {data.error && (
        <div className="w-full max-w-[480px] rounded-[20px] border border-border bg-white p-6 shadow-lg">
          <Notice tone="error">{data.error}</Notice>
          <Button variant="outline" onClick={onClose} className="mt-2">
            Close
          </Button>
        </div>
      )}

      {!data.sale && !data.error && (
        <div className="flex flex-col items-center p-6 text-[0.95rem] font-semibold text-white/80">
          <span className="mb-4 size-[30px] animate-spin rounded-full border-4 border-white/25 border-t-white" />
          Loading receipt…
        </div>
      )}

      {data.sale && (
        <div className="print-area my-auto">
          <ReceiptSheet data={data} />

          {/* floating action bar under the paper */}
          <div className="no-print mx-auto mt-4 flex w-fit items-center gap-2 rounded-full bg-white p-2 shadow-lg max-sm:fixed max-sm:inset-x-0 max-sm:bottom-4 max-sm:mx-auto max-sm:max-w-full max-sm:px-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => window.print()}>Print / Save PDF</Button>
          </div>
        </div>
      )}
    </div>
  )
}
