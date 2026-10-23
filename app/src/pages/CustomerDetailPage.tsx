import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryClient, queryKeys } from '../lib/queryClient'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { Receipt } from '../components/Receipt'
import { Notice } from '@/components/Notice'
import { PageHead } from '@/components/PageHead'
import { StatCard } from '@/components/StatCard'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatRupees, parseRupees, rupeesToInput } from '../lib/money'
import { supabase } from '../lib/supabase'
import type { Customer, LedgerEntry, PaymentMethod } from '../lib/types'

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'

  const [showRepay, setShowRepay] = useState(false)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const detailQuery = useQuery({
    queryKey: queryKeys.customerLedger(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const [customerRes, balanceRes, ledgerRes] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id).maybeSingle(),
        supabase.rpc('customer_balance', { p_customer_id: id }),
        supabase.rpc('customer_ledger', { p_customer_id: id }),
      ])
      if (customerRes.error) throw customerRes.error
      if (balanceRes.error) throw balanceRes.error
      if (ledgerRes.error) throw ledgerRes.error
      return {
        customer: (customerRes.data as Customer) ?? null,
        balance: (balanceRes.data as number) ?? 0,
        ledger: (ledgerRes.data as LedgerEntry[]) ?? [],
      }
    },
  })
  const customer = detailQuery.data?.customer ?? null
  const balance = detailQuery.data?.balance ?? 0
  const ledger = detailQuery.data?.ledger ?? []

  useEffect(() => {
    setError(detailQuery.error ? detailQuery.error.message : null)
  }, [detailQuery.error])

  if (detailQuery.isPending)
    return (
      <div className="px-6 py-[100px] text-center text-[0.95rem] font-semibold text-ink-3">
        <span className="mx-auto mb-4 block size-[30px] animate-spin rounded-full border-[3px] border-surface-highest border-t-primary" />
        Loading customer…
      </div>
    )
  if (!customer)
    return (
      <div className="px-6 py-[100px] text-center text-[0.95rem] font-semibold text-ink-3">Customer not found.</div>
    )

  return (
    <>
      <PageHead
        eyebrow="Customer ledger"
        title={customer.name}
        description={
          <>
            {customer.phone ?? 'No phone'} · {customer.type}
            {!customer.active && ' · Inactive'}
          </>
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/customers">
                <Icon name="arrow-left" />
                All customers
              </Link>
            </Button>
            <Button onClick={() => setShowRepay(true)} disabled={balance <= 0}>
              Record repayment
            </Button>
          </>
        }
      />

      {error && <Notice tone="error">{error}</Notice>}

      <div className="mb-6 grid auto-rows-min [grid-template-columns:repeat(auto-fit,minmax(min(100%,238px),1fr))] gap-4 max-sm:grid-cols-1 max-sm:gap-3">
        <StatCard
          tone="outstanding"
          label="Outstanding balance"
          icon={<Icon name="wallet" />}
          value={formatRupees(balance)}
          note={balance > 0 ? 'owed by this customer' : 'nothing due'}
          chip={balance > 0 ? 'action needed' : 'all settled'}
        />
        <StatCard
          label="Ledger entries"
          icon={<Icon name="receipt" />}
          value={ledger.length}
          note="sales and payments"
          chip={customer.type === 'wholesale' ? 'wholesale khata' : 'retail khata'}
        />
      </div>

      <div className="overflow-hidden rounded-[20px] border border-border bg-white shadow-sm">
        <div className="px-5 pt-4 pb-1.5">
          <h2 className="text-[1.1rem] font-bold tracking-[-0.02em]">Running ledger</h2>
          <p className="text-[0.85rem] leading-[1.55] text-ink-3">
            Debits are credit sales; credits are payments and repayments, oldest first.
          </p>
        </div>
        {ledger.length === 0 ? (
          <div className="px-6 py-16 text-center text-ink-3">
            <p className="mx-auto max-w-[46ch] text-[0.92rem] leading-[1.6]">No transactions with this customer yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right whitespace-nowrap tabular-nums">Debit</TableHead>
                <TableHead className="text-right whitespace-nowrap tabular-nums">Credit</TableHead>
                <TableHead className="text-right whitespace-nowrap tabular-nums">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.map((entry, index) => (
                <TableRow key={index} className="cursor-default">
                  <TableCell>{entry.entry_date}</TableCell>
                  <TableCell>
                    {entry.sale_id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() => setReceiptId(entry.sale_id)}
                      >
                        {entry.description}
                      </Button>
                    ) : (
                      entry.description
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">
                    {entry.debit ? formatRupees(entry.debit) : '—'}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">
                    {entry.credit ? formatRupees(entry.credit) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-semibold whitespace-nowrap tabular-nums">
                    {formatRupees(entry.balance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {showRepay && (
        <RepayModal
          customerId={customer.id}
          balanceDue={balance}
          onClose={() => setShowRepay(false)}
          onSaved={async () => {
            setShowRepay(false)
            await queryClient.invalidateQueries({ queryKey: queryKeys.customerLedger(customer.id) })
            await queryClient.invalidateQueries({ queryKey: queryKeys.customers() })
          }}
        />
      )}

      {receiptId && <Receipt saleId={receiptId} onClose={() => setReceiptId(null)} />}

      {isOwner && (
        <p className="mt-[18px] text-[0.85rem] leading-[1.55] text-ink-3">
          Customer records with financial history are deactivated, never deleted.
        </p>
      )}
    </>
  )
}

function RepayModal({
  customerId,
  balanceDue,
  onClose,
  onSaved,
}: {
  customerId: string
  balanceDue: number
  onClose: () => void
  onSaved: () => void
}) {
  const [amountInput, setAmountInput] = useState(rupeesToInput(balanceDue))
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    const amount = parseRupees(amountInput)
    if (amount === null || amount <= 0) {
      setError('Enter a valid amount.')
      return
    }
    if (amount > balanceDue) {
      setError(`Amount cannot exceed the outstanding balance of ${formatRupees(balanceDue)}.`)
      return
    }
    setBusy(true)
    const { error: rpcError } = await supabase.rpc('record_repayment', {
      p_customer_id: customerId,
      p_amount: amount,
      p_method: method,
      p_reference: reference.trim() || null,
    })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    onSaved()
  }

  return (
    <Modal
      title="Record repayment"
      subtitle={`Auto-applied to the oldest outstanding invoices first. Balance ${formatRupees(balanceDue)}.`}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Record payment'}
          </Button>
        </div>
      }
    >
      {error && <Notice tone="error">{error}</Notice>}
      <div className="mb-4">
        <Label className="mb-[7px]" htmlFor="repay-amount">
          Amount
        </Label>
        <Input
          id="repay-amount"
          inputMode="decimal"
          value={amountInput}
          onChange={(event) => setAmountInput(event.target.value)}
          autoFocus
        />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-[15px] max-sm:grid-cols-1 max-sm:gap-4">
        <div className="mb-4 max-sm:mb-0">
          <Label className="mb-[7px]" htmlFor="repay-method">
            Method
          </Label>
          <ButtonGroup aria-label="Payment method" id="repay-method" className="w-full">
            <Button
              type="button"
              variant={method === 'cash' ? 'default' : 'outline'}
              className="flex-1 px-3"
              onClick={() => setMethod('cash')}
            >
              Cash
            </Button>
            <Button
              type="button"
              variant={method === 'online' ? 'default' : 'outline'}
              className="flex-1 px-3"
              onClick={() => setMethod('online')}
            >
              Online (QR / bank)
            </Button>
          </ButtonGroup>
        </div>
        <div className="mb-4 max-sm:mb-0">
          <Label className="mb-[7px]" htmlFor="repay-reference">
            Reference (optional)
          </Label>
          <Input id="repay-reference" value={reference} onChange={(event) => setReference(event.target.value)} />
        </div>
      </div>
      <p className="text-[0.85rem] leading-[1.55] text-ink-3">
        A repayment can never exceed the outstanding balance or create a customer advance.
      </p>
    </Modal>
  )
}
