import { useEffect, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryClient, queryKeys } from '../lib/queryClient'
import { downloadCsv } from '../lib/csv'
import { supabase } from '../lib/supabase'
import type { BusinessSettings } from '../lib/types'
import { PageHead } from '@/components/PageHead'
import { Notice } from '@/components/Notice'
import { InvoicePreview } from '@/components/InvoicePreview'
import { Icon } from '@/components/Icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useVirtualKeyboard } from '@/components/VirtualKeyboard'

type ExportKind = 'sales' | 'items' | 'payments' | 'balances'

const EXPORTS: Record<
  ExportKind,
  { label: string; description: string; rpc: string; filename: string; columns: Record<string, string> }
> = {
  sales: {
    label: 'Sales invoices',
    description: 'One row per invoice, including voided sales and balances.',
    rpc: 'export_sales',
    filename: 'dairydash-sales',
    columns: {
      invoice_no: 'Invoice',
      business_date: 'Date',
      sale_type: 'Type',
      status: 'Status',
      customer_name: 'Customer',
      customer_phone: 'Phone',
      staff_name: 'Staff',
      total: 'Total',
      paid: 'Paid',
      due: 'Due',
      void_reason: 'Void reason',
      created_at: 'Created at',
    },
  },
  items: {
    label: 'Sale lines',
    description: 'Every product line with quantity, price and retail reference.',
    rpc: 'export_sale_items',
    filename: 'dairydash-sale-lines',
    columns: {
      invoice_no: 'Invoice',
      business_date: 'Date',
      sale_type: 'Type',
      sale_status: 'Status',
      product_title: 'Product',
      pack_size: 'Pack size',
      unit: 'Unit',
      quantity: 'Quantity',
      unit_price: 'Unit price',
      retail_price: 'Retail price',
      line_total: 'Line total',
    },
  },
  payments: {
    label: 'Payments',
    description: 'Sale payments, repayments, refunds and reversals.',
    rpc: 'export_payments',
    filename: 'dairydash-payments',
    columns: {
      business_date: 'Date',
      kind: 'Kind',
      method: 'Method',
      amount: 'Amount',
      reference: 'Reference',
      customer_name: 'Customer',
      invoice_no: 'Invoice',
      received_by_name: 'Received by',
      created_at: 'Created at',
    },
  },
  balances: {
    label: 'Customer balances',
    description: 'Outstanding balance per customer right now.',
    rpc: 'export_customer_balances',
    filename: 'dairydash-customer-balances',
    columns: {
      name: 'Customer',
      phone: 'Phone',
      type: 'Type',
      address: 'Address',
      active: 'Active',
      balance: 'Balance',
      open_invoices: 'Open invoices',
    },
  },
}

function CardHead({
  icon,
  title,
  right,
}: {
  icon: 'receipt' | 'sales' | 'settings'
  title: string
  right?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4 border-b border-line pb-3.5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-[10px] bg-primary-soft text-primary [&_svg]:size-[18px]">
          <Icon name={icon} />
        </span>
        <h2 className="text-[1.1rem] font-bold tracking-[-0.02em]">{title}</h2>
      </div>
      {right}
    </div>
  )
}

function today(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kathmandu' })
}

export function SettingsPage() {
  const {
    enabled: virtualKeyboardEnabled,
    setEnabled: setVirtualKeyboardEnabled,
    layout: virtualKeyboardLayout,
    setLayout: setVirtualKeyboardLayout,
  } = useVirtualKeyboard()
  const [businessName, setBusinessName] = useState('')
  const [contact, setContact] = useState('')
  const [footer, setFooter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [exportBusy, setExportBusy] = useState<ExportKind | null>(null)
  const [exportMessage, setExportMessage] = useState<string | null>(null)

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings(),
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from('business_settings')
        .select('*')
        .eq('id', true)
        .maybeSingle()
      if (queryError) throw queryError
      return (data as BusinessSettings) ?? null
    },
  })
  const settings = settingsQuery.data ?? null

  // Seed the editable fields from the cached row (only until the user edits).
  const [seeded, setSeeded] = useState(false)
  useEffect(() => {
    if (settings && !seeded) {
      setBusinessName(settings.business_name ?? '')
      setContact(settings.contact ?? '')
      setFooter(settings.receipt_footer ?? '')
      setSeeded(true)
    }
  }, [settings, seeded])

  async function save() {
    setError(null)
    setSaved(false)
    setBusy(true)
    const { error: updateError } = await supabase
      .from('business_settings')
      .update({
        business_name: businessName.trim(),
        contact: contact.trim(),
        receipt_footer: footer.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', true)
    setBusy(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setSaved(true)
    await queryClient.invalidateQueries({ queryKey: queryKeys.settings() })
  }

  async function runExport(kind: ExportKind) {
    const spec = EXPORTS[kind]
    setExportMessage(null)
    setError(null)
    setExportBusy(kind)
    const { data, error: exportError } = await supabase.rpc(spec.rpc)
    setExportBusy(null)
    if (exportError) {
      setError(`Export failed: ${exportError.message}`)
      return
    }
    const source = (data as Record<string, unknown>[]) ?? []
    if (source.length === 0) {
      setExportMessage('No records to export yet.')
      return
    }
    const rows = source.map((row) => {
      const mapped: Record<string, unknown> = {}
      for (const [key, label] of Object.entries(spec.columns)) {
        mapped[label] = row[key] ?? ''
      }
      return mapped
    })
    const count = downloadCsv(`${spec.filename}-${today()}.csv`, rows)
    setExportMessage(`${spec.label}: ${count} rows exported.`)
    void supabase.rpc('log_client_event', {
      p_action: 'data_exported',
      p_details: { report: `backup_${kind}`, rows: count, date: today() },
    })
  }

  if (!settings)
    return (
      <div className="flex flex-col items-center px-6 py-25 text-[0.95rem] font-semibold text-ink-3">
        <span className="mb-4 size-[30px] animate-spin rounded-full border-4 border-surface-highest border-t-primary" />
        Loading settings…
      </div>
    )

  return (
    <>
      <PageHead
        eyebrow="Configuration"
        title="Settings"
        description="Business identity, receipt details and this counter device's touch keyboard."
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          {error && <Notice tone="error">{error}</Notice>}
          {saved && <Notice tone="success">Settings saved.</Notice>}

          <Card className="p-5 px-6 max-sm:px-4">
            <CardHead icon="receipt" title="Business identity" right={<Badge>Printed on invoices</Badge>} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="mb-[7px]" htmlFor="setting-business-name">
                  Business name
                </Label>
                <Input
                  id="setting-business-name"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                />
                <p className="mt-1.5 text-[0.78rem] text-ink-3">Shown as the heading of every printed invoice.</p>
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-[7px]" htmlFor="setting-contact">
                  Contact line
                </Label>
                <Input id="setting-contact" value={contact} onChange={(event) => setContact(event.target.value)} />
                <p className="mt-1.5 text-[0.78rem] text-ink-3">Phone or address, printed right under the name.</p>
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-[7px]" htmlFor="setting-footer">
                  Receipt footer
                </Label>
                <Textarea id="setting-footer" value={footer} onChange={(event) => setFooter(event.target.value)} />
                <p className="mt-1.5 text-[0.78rem] text-ink-3">
                  Last lines of the invoice — thank-you note, VAT note or terms.
                </p>
              </div>
            </div>

            <p className="mt-4 mb-4 rounded-[14px] bg-surface-low px-4 py-3 text-[0.84rem] leading-[1.55] text-ink-2">
              Currency is fixed to Nepali Rupees (Rs) and receipts print on A4. The preview on the right updates as you
              type and matches the printed result.
            </p>
            <div className="flex items-center justify-end gap-3">
              {saved && <span className="text-[0.84rem] font-semibold text-primary">Saved just now</span>}
              <Button onClick={save} disabled={busy}>
                {busy ? 'Saving…' : 'Save settings'}
              </Button>
            </div>
          </Card>

          <Card className="p-5 px-6 max-sm:px-4">
            <CardHead
              icon="settings"
              title="Counter keyboard"
              right={
                <Badge variant={virtualKeyboardEnabled ? 'paid' : 'default'}>
                  {virtualKeyboardEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              }
            />
            <div className="flex items-start justify-between gap-5 max-sm:flex-col">
              <div>
                <h3 className="text-[0.98rem] font-bold">Show an on-screen keyboard</h3>
                <p className="mt-1.5 max-w-[570px] text-[0.84rem] leading-[1.55] text-ink-3">
                  Useful on the counter tablet when there is no physical keyboard. It opens whenever a text or number
                  field is selected, including the grams and cash fields.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={virtualKeyboardEnabled}
                onClick={() => setVirtualKeyboardEnabled(!virtualKeyboardEnabled)}
                className={`relative h-8 w-14 shrink-0 cursor-pointer rounded-full p-1 transition-colors ${virtualKeyboardEnabled ? 'bg-primary' : 'bg-surface-highest'}`}
              >
                <span
                  className={`block size-6 rounded-full bg-white shadow-sm transition-transform ${virtualKeyboardEnabled ? 'translate-x-6' : ''}`}
                />
              </button>
            </div>
            <div className="mt-5 border-t border-line pt-4">
              <h3 className="text-[0.98rem] font-bold">Keyboard layout</h3>
              <p className="mt-1.5 text-[0.84rem] leading-[1.55] text-ink-3">
                Number keypad is recommended for weighing and payment fields.
              </p>
              <div className="mt-3 grid max-w-[430px] grid-cols-2 gap-2 rounded-xl bg-surface-low p-1.5">
                {(['number', 'full'] as const).map((layout) => (
                  <button
                    key={layout}
                    type="button"
                    onClick={() => setVirtualKeyboardLayout(layout)}
                    className={`rounded-lg px-3 py-2.5 text-[0.84rem] font-bold transition-colors ${virtualKeyboardLayout === layout ? 'bg-white text-primary shadow-xs' : 'text-ink-3 hover:text-foreground'}`}
                  >
                    {layout === 'number' ? 'Number keypad' : 'Full keyboard'}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-5 px-6 max-sm:px-4">
            <CardHead icon="sales" title="Backups" right={<Badge variant="paid">Daily automatic</Badge>} />

            <p className="text-[0.85rem] leading-[1.65] text-ink-3">
              Supabase runs automated daily backups. A full database restore has been tested in a separate PostgreSQL
              instance — see{' '}
              <code className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[0.78rem]">
                docs/BACKUP.md
              </code>{' '}
              for the procedure, retention notes and the named recovery owner. Download a CSV before closing the books
              each week and keep it somewhere other than the counter tablet.
            </p>

            <h3 className="mt-5 text-[1.02rem] font-bold tracking-[-0.025em]">Download data now</h3>
            <p className="mt-1 mb-3.5 text-[0.85rem] leading-[1.55] text-ink-3">
              Owner-only. Files open in Excel or Google Sheets and match the figures in Reports.
            </p>
            {exportMessage && (
              <Notice tone="success" className="mb-3">
                {exportMessage}
              </Notice>
            )}
            <div className="grid gap-3">
              {(Object.keys(EXPORTS) as ExportKind[]).map((kind) => (
                <div
                  className="flex items-center justify-between gap-4.5 rounded-[14px] border border-line bg-white px-4.5 py-4 transition hover:border-line-strong hover:bg-surface-low max-sm:flex-col max-sm:items-start"
                  key={kind}
                >
                  <div className="min-w-0">
                    <strong className="block text-[0.96rem] font-bold tracking-[-0.01em]">{EXPORTS[kind].label}</strong>
                    <span className="mt-1 block text-[0.83rem] leading-[1.5] text-ink-3">
                      {EXPORTS[kind].description}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 max-sm:w-full"
                    onClick={() => void runExport(kind)}
                    disabled={exportBusy !== null}
                  >
                    {exportBusy === kind ? 'Preparing…' : 'Download CSV'}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* invoice preview */}
        <aside className="rounded-[20px] border border-border bg-white p-5 shadow-sm xl:sticky xl:top-[100px]">
          <div className="mb-3.5 flex items-center justify-between gap-4">
            <h2 className="text-[1.02rem] font-bold tracking-[-0.02em]">Invoice preview</h2>
            <Badge variant="online">Live</Badge>
          </div>
          <InvoicePreview businessName={businessName} contact={contact} footer={footer} />
          <p className="mt-3 text-center text-[0.78rem] leading-[1.5] text-ink-3">
            Sample data — updates as you type and prints exactly like this on A4.
          </p>
        </aside>
      </div>
    </>
  )
}
