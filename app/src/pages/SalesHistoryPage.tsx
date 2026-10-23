import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { useAuth } from '../auth/AuthProvider'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { Receipt } from '../components/Receipt'
import { PageHead } from '@/components/PageHead'
import { StatCard } from '@/components/StatCard'
import { Notice } from '@/components/Notice'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { formatRupees } from '../lib/money'
import { supabase } from '../lib/supabase'
import type { SaleStatus, SaleType } from '../lib/types'

interface HistoryRow {
  id: string
  invoice_no: number
  created_at: string
  business_date: string
  sale_type: SaleType
  customer_name: string | null
  status: SaleStatus
  total: number
  paid: number
  due: number
  cashier_name: string
}

function today(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kathmandu' })
}

export function SalesHistoryPage() {
  const { profile } = useAuth()
  const canVoid = profile?.role === 'owner' || profile?.can_void
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(today())
  const [type, setType] = useState<'' | SaleType>('')
  const [status, setStatus] = useState<'' | SaleStatus>('')
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [voiding, setVoiding] = useState<HistoryRow | null>(null)
  const [error, setError] = useState<string | null>(null)

  const historyQuery = useQuery({
    queryKey: ['sales-history', from, to, type, status],
    queryFn: async () => {
      const { data, error: rpcError } = await supabase.rpc('sales_history', {
        p_from: from,
        p_to: to,
        p_type: type || null,
        p_status: status || null,
      })
      if (rpcError) throw rpcError
      return (data as HistoryRow[]) ?? []
    },
  })
  const rows = historyQuery.data ?? []

  useEffect(() => {
    if (historyQuery.error) setError(historyQuery.error.message)
    else setError(null)
  }, [historyQuery.error])

  const totals = rows
    .filter((row) => row.status === 'posted')
    .reduce(
      (acc, row) => ({
        total: acc.total + row.total,
        paid: acc.paid + row.paid,
        due: acc.due + row.due,
      }),
      { total: 0, paid: 0, due: 0 },
    )

  return (
    <>
      <PageHead
        eyebrow="Archive"
        title={profile?.role === 'owner' ? 'Sales history' : 'My sales'}
        description={
          profile?.role === 'owner'
            ? 'Every sale, voided or posted. Reprinting never creates a record.'
            : 'Your transactions for today.'
        }
      />

      {error && <Notice tone="error">{error}</Notice>}

      <div className="mb-6 grid auto-rows-min [grid-template-columns:repeat(auto-fit,minmax(min(100%,238px),1fr))] gap-4 max-sm:grid-cols-1 max-sm:gap-3">
        <StatCard
          tone="neutral"
          label="Sales in range"
          value={formatRupees(totals.total)}
          icon={<Icon name="receipt" />}
          note={`${rows.length} invoice${rows.length === 1 ? '' : 's'}`}
          chip={`${rows.filter((row) => row.status === 'voided').length} voided`}
        />
        <StatCard
          tone="cash"
          label="Collected"
          value={formatRupees(totals.paid)}
          icon={<Icon name="wallet" />}
          note="cash and online"
          chip={`${rows.filter((row) => row.status === 'posted').length} posted`}
        />
        <StatCard
          tone="credit"
          label="Balance due"
          value={formatRupees(totals.due)}
          icon={<Icon name="credit" />}
          note="carried on customer khata"
          chip={`${rows.filter((row) => row.status === 'posted' && row.due > 0).length} unpaid invoices`}
        />
      </div>

      <Card className="mb-[18px] px-6 py-5 max-sm:p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="mb-[7px]" htmlFor="history-from">
              From
            </Label>
            <Input
              id="history-from"
              type="date"
              className="w-[168px] max-sm:pr-2"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div>
            <Label className="mb-[7px]" htmlFor="history-to">
              To
            </Label>
            <Input
              id="history-to"
              type="date"
              className="w-[168px] max-sm:pr-2"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
          <div>
            <Label className="mb-[7px]" htmlFor="history-type">
              Type
            </Label>
            <Select
              value={type === '' ? 'all' : type}
              onValueChange={(value) => setType(value === 'all' ? '' : (value as SaleType))}
            >
              <SelectTrigger id="history-type" className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="wholesale">Wholesale</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-[7px]" htmlFor="history-status">
              Status
            </Label>
            <Select
              value={status === '' ? 'all' : status}
              onValueChange={(value) => setStatus(value === 'all' ? '' : (value as SaleStatus))}
            >
              <SelectTrigger id="history-status" className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {historyQuery.isFetching && historyQuery.data === undefined ? (
          <div className="px-6 py-[100px] text-center text-[0.95rem] font-semibold text-ink-3">
            <span className="mx-auto mb-4 block size-[30px] animate-spin rounded-full border-[3px] border-surface-highest border-t-primary" />
            Loading sales…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="No sales in this range">Adjust the dates or filters.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer" onClick={() => setReceiptId(row.id)}>
                  <TableCell className="tabular-nums">#{row.invoice_no}</TableCell>
                  <TableCell>
                    {row.business_date}
                    <br />
                    <span className="text-[0.85rem] leading-[1.55] text-ink-3">
                      {new Date(row.created_at).toLocaleTimeString('en-GB', {
                        timeZone: 'Asia/Kathmandu',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </TableCell>
                  <TableCell>{row.customer_name ?? 'Walk-in'}</TableCell>
                  <TableCell>
                    <Badge variant={row.sale_type === 'wholesale' ? 'wholesale' : 'default'}>{row.sale_type}</Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">{formatRupees(row.total)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">{formatRupees(row.paid)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">{formatRupees(row.due)}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'voided' ? 'void' : row.due <= 0 ? 'paid' : 'partial'}>
                      {row.status === 'voided'
                        ? 'Voided'
                        : row.due <= 0
                          ? 'Paid'
                          : row.paid > 0
                            ? 'Partially paid'
                            : 'Credit'}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.cashier_name}</TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    {canVoid && row.status === 'posted' && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setVoiding(row)}>
                        Void
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {receiptId && <Receipt saleId={receiptId} onClose={() => setReceiptId(null)} />}

      {voiding && (
        <VoidModal
          sale={voiding}
          onClose={() => setVoiding(null)}
          onDone={async () => {
            setVoiding(null)
            await queryClient.invalidateQueries({ queryKey: ['sales-history'] })
          }}
        />
      )}
    </>
  )
}

function VoidModal({ sale, onClose, onDone }: { sale: HistoryRow; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!reason.trim()) {
      setError('A reason is required.')
      return
    }
    setBusy(true)
    const { error: rpcError } = await supabase.rpc('void_sale', { p_sale_id: sale.id, p_reason: reason.trim() })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    onDone()
  }

  return (
    <Modal
      title={`Void invoice #${sale.invoice_no}`}
      subtitle={`${formatRupees(sale.total)} · ${sale.status === 'posted' ? 'This does not delete the sale — it is marked voided and payments are reversed.' : 'Already voided.'}`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={busy}>
            {busy ? 'Voiding…' : 'Void sale'}
          </Button>
        </div>
      }
    >
      {error && <Notice tone="error">{error}</Notice>}
      <div className="mb-4">
        <Label className="mb-[7px]" htmlFor="void-reason">
          Reason (required)
        </Label>
        <Textarea
          id="void-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. wrong customer, duplicate entry"
          autoFocus
        />
      </div>
      <p className="text-[0.85rem] leading-[1.55] text-ink-3">
        This action is recorded in the audit log with your name and the reason. To correct a sale, void it and enter a
        new one.
      </p>
    </Modal>
  )
}
