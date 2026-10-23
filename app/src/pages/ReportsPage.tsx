import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryClient'
import { ChipFilter } from '@/components/ChipFilter'
import { PageHead } from '@/components/PageHead'
import { Notice } from '@/components/Notice'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/Field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { downloadCsv } from '../lib/csv'
import { formatQty, formatRupees } from '../lib/money'
import { supabase } from '../lib/supabase'

type ColType = 'text' | 'money' | 'qty' | 'number' | 'date' | 'datetime'
type Row = Record<string, unknown>

interface Col {
  key: string
  label: string
  type?: ColType
}

interface TableSpec {
  title?: string
  cols: Col[]
  rows: Row[]
  filename: string
}

interface ReportDef {
  label: string
  load: (from: string, to: string, group: 'day' | 'week' | 'month') => Promise<TableSpec[]>
}

function todayInKathmandu(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kathmandu' })
}

function monthStart(): string {
  return `${todayInKathmandu().slice(0, 8)}01`
}

function cell(value: unknown, type: ColType = 'text') {
  if (value === null || value === undefined || value === '') return '—'
  switch (type) {
    case 'money':
      return formatRupees(Number(value))
    case 'qty':
      return formatQty(Number(value))
    case 'number':
      return Number(value).toLocaleString('en-IN')
    case 'date':
      return new Date(`${String(value)}T00:00:00`).toLocaleDateString('en-GB')
    case 'datetime':
      return new Date(String(value)).toLocaleString('en-GB', { timeZone: 'Asia/Kathmandu' })
    default:
      return String(value)
  }
}

const REPORTS: Record<string, ReportDef> = {
  sales: {
    label: 'Sales',
    async load(from, to, group) {
      const { data, error } = await supabase.rpc('report_sales', { p_from: from, p_to: to, p_group: group })
      if (error) throw new Error(error.message)
      return [
        {
          cols: [
            {
              key: 'period_start',
              label: group === 'month' ? 'Month' : group === 'week' ? 'Week of' : 'Date',
              type: 'date',
            },
            { key: 'retail_total', label: 'Retail', type: 'money' },
            { key: 'wholesale_total', label: 'Wholesale', type: 'money' },
            { key: 'retail_count', label: 'Retail #', type: 'number' },
            { key: 'wholesale_count', label: 'Wholesale #', type: 'number' },
          ],
          rows: (data as Row[]) ?? [],
          filename: `sales-${group}-${from}_${to}.csv`,
        },
      ]
    },
  },
  collections: {
    label: 'Collections',
    async load(from, to) {
      const { data, error } = await supabase.rpc('report_collections', { p_from: from, p_to: to })
      if (error) throw new Error(error.message)
      return [
        {
          cols: [
            { key: 'business_date', label: 'Date', type: 'date' },
            { key: 'cash', label: 'Cash', type: 'money' },
            { key: 'online', label: 'Online', type: 'money' },
            { key: 'total', label: 'Total collected', type: 'money' },
            { key: 'repayments', label: 'Of which repayments', type: 'money' },
          ],
          rows: (data as Row[]) ?? [],
          filename: `collections-${from}_${to}.csv`,
        },
      ]
    },
  },
  credit: {
    label: 'Outstanding credit',
    async load() {
      const [customers, invoices] = await Promise.all([
        supabase.rpc('report_outstanding_by_customer'),
        supabase.rpc('report_outstanding'),
      ])
      if (customers.error) throw new Error(customers.error.message)
      if (invoices.error) throw new Error(invoices.error.message)
      return [
        {
          title: 'By customer',
          cols: [
            { key: 'customer_name', label: 'Customer' },
            { key: 'phone', label: 'Phone' },
            { key: 'customer_type', label: 'Type' },
            { key: 'open_invoices', label: 'Open invoices', type: 'number' },
            { key: 'balance', label: 'Owed', type: 'money' },
          ],
          rows: (customers.data as Row[]) ?? [],
          filename: `outstanding-by-customer-${todayInKathmandu()}.csv`,
        },
        {
          title: 'By invoice',
          cols: [
            { key: 'customer_name', label: 'Customer' },
            { key: 'invoice_no', label: 'Invoice', type: 'number' },
            { key: 'business_date', label: 'Date', type: 'date' },
            { key: 'total', label: 'Total', type: 'money' },
            { key: 'paid', label: 'Paid', type: 'money' },
            { key: 'due', label: 'Due', type: 'money' },
          ],
          rows: (invoices.data as Row[]) ?? [],
          filename: `outstanding-by-invoice-${todayInKathmandu()}.csv`,
        },
      ]
    },
  },
  products: {
    label: 'By product',
    async load(from, to) {
      const { data, error } = await supabase.rpc('report_products', { p_from: from, p_to: to })
      if (error) throw new Error(error.message)
      return [
        {
          cols: [
            { key: 'product_title', label: 'Product' },
            { key: 'pack_size', label: 'Pack size' },
            { key: 'unit', label: 'Unit' },
            { key: 'quantity', label: 'Quantity', type: 'qty' },
            { key: 'value', label: 'Value', type: 'money' },
            { key: 'sale_count', label: 'Sales', type: 'number' },
          ],
          rows: (data as Row[]) ?? [],
          filename: `sales-by-product-${from}_${to}.csv`,
        },
      ]
    },
  },
  wholesale: {
    label: 'Wholesale vs retail',
    async load(from, to) {
      const { data, error } = await supabase.rpc('report_wholesale', { p_from: from, p_to: to })
      if (error) throw new Error(error.message)
      return [
        {
          cols: [
            { key: 'wholesale_total', label: 'Wholesale value', type: 'money' },
            { key: 'retail_value', label: 'At retail', type: 'money' },
            { key: 'discount', label: 'Discount given', type: 'money' },
            { key: 'sale_count', label: 'Wholesale sales', type: 'number' },
          ],
          rows: (data as Row[]) ?? [],
          filename: `wholesale-vs-retail-${from}_${to}.csv`,
        },
      ]
    },
  },
  voids: {
    label: 'Voids & below-retail',
    async load(from, to) {
      const [voids, below] = await Promise.all([
        supabase.rpc('report_voids', { p_from: from, p_to: to }),
        supabase.rpc('report_below_retail', { p_from: from, p_to: to }),
      ])
      if (voids.error) throw new Error(voids.error.message)
      if (below.error) throw new Error(below.error.message)
      return [
        {
          title: 'Voided sales',
          cols: [
            { key: 'invoice_no', label: 'Invoice', type: 'number' },
            { key: 'business_date', label: 'Date', type: 'date' },
            { key: 'customer_name', label: 'Customer' },
            { key: 'total', label: 'Total', type: 'money' },
            { key: 'reason', label: 'Reason' },
            { key: 'voided_at', label: 'Voided at', type: 'datetime' },
            { key: 'voided_by_name', label: 'Voided by' },
            { key: 'created_by_name', label: 'Original staff' },
          ],
          rows: (voids.data as Row[]) ?? [],
          filename: `voids-${from}_${to}.csv`,
        },
        {
          title: 'Below-retail wholesale lines',
          cols: [
            { key: 'invoice_no', label: 'Invoice', type: 'number' },
            { key: 'business_date', label: 'Date', type: 'date' },
            { key: 'customer_name', label: 'Customer' },
            { key: 'product_title', label: 'Product' },
            { key: 'quantity', label: 'Qty', type: 'qty' },
            { key: 'retail_price', label: 'Retail', type: 'money' },
            { key: 'unit_price', label: 'Charged', type: 'money' },
            { key: 'discount', label: 'Discount', type: 'money' },
            { key: 'staff_name', label: 'Staff' },
          ],
          rows: (below.data as Row[]) ?? [],
          filename: `below-retail-${from}_${to}.csv`,
        },
      ]
    },
  },
  cash: {
    label: 'Cash checks',
    async load(from, to) {
      const { data, error } = await supabase.rpc('report_cash_checks', { p_from: from, p_to: to })
      if (error) throw new Error(error.message)
      return [
        {
          cols: [
            { key: 'business_date', label: 'Date', type: 'date' },
            { key: 'expected_cash', label: 'Expected', type: 'money' },
            { key: 'counted_cash', label: 'Counted', type: 'money' },
            { key: 'difference', label: 'Difference', type: 'money' },
            { key: 'note', label: 'Note' },
            { key: 'checked_by_name', label: 'Checked by' },
          ],
          rows: (data as Row[]) ?? [],
          filename: `cash-checks-${from}_${to}.csv`,
        },
      ]
    },
  },
}

const TABS = Object.keys(REPORTS)

export function ReportsPage() {
  const [tab, setTab] = useState<string>('sales')
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(todayInKathmandu())
  const [group, setGroup] = useState<'day' | 'week' | 'month'>('day')
  const [error, setError] = useState<string | null>(null)
  const [exported, setExported] = useState<string | null>(null)

  const definition = REPORTS[tab]

  const reportQuery = useQuery({
    queryKey: queryKeys.report(tab, from, to, group),
    queryFn: () => definition.load(from, to, group),
  })
  const tables = reportQuery.data ?? []

  useEffect(() => {
    setError(reportQuery.error ? reportQuery.error.message : null)
  }, [reportQuery.error])

  const totals = useMemo(() => {
    return tables.map((table) => {
      const sums: Record<string, number> = {}
      for (const col of table.cols) {
        if (col.type !== 'money' && col.type !== 'qty') continue
        const sum = table.rows.reduce((acc, row) => acc + (Number(row[col.key]) || 0), 0)
        sums[col.key] = Math.round(sum * 100) / 100
      }
      return sums
    })
  }, [tables])

  async function handleExport(table: TableSpec) {
    const csvRows = table.rows.map((row) => {
      const mapped: Record<string, unknown> = {}
      for (const col of table.cols) {
        const raw = row[col.key]
        mapped[col.label] =
          col.type === 'money' || col.type === 'qty' || col.type === 'number'
            ? raw === null || raw === undefined
              ? ''
              : Number(raw)
            : (raw ?? '')
      }
      return mapped
    })
    const count = downloadCsv(table.filename, csvRows)
    setExported(`${count} rows exported`)
    await supabase.rpc('log_client_event', {
      p_action: 'data_exported',
      p_details: { report: tab, table: table.title ?? tab, rows: count, from, to },
    })
  }

  return (
    <>
      <PageHead
        eyebrow="Owner only"
        title="Reports"
        description="Reports read persisted records; CSV totals match the screen."
        actions={exported && <Badge variant="paid">{exported}</Badge>}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-[20px] border border-border bg-white p-[20px_24px] shadow-sm max-sm:p-4">
        <Field label="From" className="mb-0">
          <Input type="date" className="pr-2" value={from} onChange={(event) => setFrom(event.target.value)} />
        </Field>
        <Field label="To" className="mb-0">
          <Input type="date" className="pr-2" value={to} onChange={(event) => setTo(event.target.value)} />
        </Field>
        {tab === 'sales' && (
          <Field label="Group by" className="mb-0">
            <Select value={group} onValueChange={(value) => setGroup(value as typeof group)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
        <div className="flex-1" />
        <Button variant="outline" onClick={() => void reportQuery.refetch()} disabled={reportQuery.isFetching}>
          Refresh
        </Button>
      </div>

      <div className="mb-4.5 flex flex-wrap gap-2">
        {TABS.map((id) => (
          <ChipFilter key={id} label={REPORTS[id].label} active={tab === id} onClick={() => setTab(id)} />
        ))}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {reportQuery.isPending ? (
        <div className="px-6 py-[100px] text-center text-[0.95rem] font-semibold text-ink-3">
          <span className="mx-auto mb-4 block size-[30px] animate-spin rounded-full border-[3px] border-surface-highest border-t-primary" />
          Building report…
        </div>
      ) : (
        tables.map((table, tableIndex) => (
          <div
            className="mb-4.5 overflow-hidden rounded-[20px] border border-border bg-white shadow-sm"
            key={`${tab}-${tableIndex}`}
          >
            <div className="mb-3.5 flex items-center justify-between gap-4 border-b border-line px-5 pt-4 pb-1.5">
              <h2 className="text-[1.1rem] font-bold tracking-[-0.02em]">{table.title ?? definition.label}</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleExport(table)}
                disabled={table.rows.length === 0}
              >
                Export CSV
              </Button>
            </div>
            {table.rows.length === 0 ? (
              <div className="px-6 py-16 text-center text-ink-3">
                <p className="mx-auto max-w-[46ch] text-[0.92rem] leading-[1.6]">No records in this range.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {table.cols.map((col) => (
                      <TableHead
                        key={col.key}
                        className={
                          col.type === 'money' || col.type === 'qty' || col.type === 'number'
                            ? 'text-right whitespace-nowrap tabular-nums'
                            : ''
                        }
                      >
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {table.rows.map((row, index) => (
                    <TableRow key={index}>
                      {table.cols.map((col) => (
                        <TableCell
                          key={col.key}
                          className={
                            col.type === 'money' || col.type === 'qty' || col.type === 'number'
                              ? 'text-right whitespace-nowrap tabular-nums'
                              : ''
                          }
                        >
                          {cell(row[col.key], col.type)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
                {Object.keys(totals[tableIndex]).length > 0 && (
                  <TableFooter>
                    <TableRow>
                      {table.cols.map((col) => (
                        <TableCell
                          key={col.key}
                          className={
                            (col.type === 'money' || col.type === 'qty'
                              ? 'text-right whitespace-nowrap tabular-nums '
                              : '') + 'py-3.5 font-bold text-foreground'
                          }
                        >
                          {col.type === 'money' || col.type === 'qty'
                            ? cell(totals[tableIndex][col.key], col.type)
                            : ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            )}
          </div>
        ))
      )}
    </>
  )
}
