import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { queryClient, queryKeys } from '../lib/queryClient'
import { useAuth } from '../auth/AuthProvider'
import { Icon } from '../components/Icon'
import { Receipt } from '../components/Receipt'
import { StatCard } from '../components/StatCard'
import { PageHead } from '../components/PageHead'
import { Notice } from '../components/Notice'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatRupees, parseRupees } from '../lib/money'
import { supabase } from '../lib/supabase'
import type { CustomerWithBalance, Payment, SaleBalance } from '../lib/types'

interface TodayData {
  sales: SaleBalance[]
  payments: Payment[]
  customers: CustomerWithBalance[]
  cashCheck: CashCheck | null
}

function todayInKathmandu(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kathmandu' })
}

interface CashCheck {
  business_date: string
  expected_cash: number
  counted_cash: number
  difference: number
  note: string | null
}

export function TodayPage() {
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'
  const todayKey = queryKeys.today(todayInKathmandu())
  const todayQuery = useQuery({
    queryKey: todayKey,
    queryFn: async (): Promise<TodayData> => {
      const today = todayInKathmandu()
      const [salesRes, paymentsRes, customersRes, checkRes] = await Promise.all([
        supabase.from('sale_balances').select('*').eq('business_date', today).order('created_at', { ascending: false }),
        supabase.from('payments').select('*').eq('business_date', today),
        supabase.rpc('customers_with_balance'),
        supabase.from('cash_checks').select('*').eq('business_date', today).maybeSingle(),
      ])
      if (salesRes.error) throw salesRes.error
      if (paymentsRes.error) throw paymentsRes.error
      if (customersRes.error) throw customersRes.error
      if (checkRes.error) throw checkRes.error
      return {
        sales: (salesRes.data as SaleBalance[]) ?? [],
        payments: (paymentsRes.data as Payment[]) ?? [],
        customers: (customersRes.data as CustomerWithBalance[]) ?? [],
        cashCheck: (checkRes.data as CashCheck | null) ?? null,
      }
    },
  })
  const today = todayKey[1]
  const sales = todayQuery.data?.sales ?? []
  const payments = todayQuery.data?.payments ?? []
  const customers = todayQuery.data?.customers ?? []
  const cashCheck = todayQuery.data?.cashCheck ?? null

  const [countedInput, setCountedInput] = useState('')
  const [checkNote, setCheckNote] = useState<string | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [savingCheck, setSavingCheck] = useState(false)
  const [receiptId, setReceiptId] = useState<string | null>(null)

  // Seed the cash-check inputs from the loaded data (only until the user edits).
  useEffect(() => {
    if (checkNote === null && cashCheck) {
      setCountedInput(cashCheck.counted_cash.toString())
      setCheckNote(cashCheck.note ?? '')
    }
  }, [cashCheck, checkNote])

  const stats = useMemo(() => {
    const salesTotal = sales.reduce((sum, sale) => sum + sale.total, 0)
    const cash = payments
      .filter((p) => p.method === 'cash' && (p.kind === 'sale_payment' || p.kind === 'repayment'))
      .reduce((sum, p) => sum + p.amount, 0)
    const online = payments
      .filter((p) => p.method === 'online' && (p.kind === 'sale_payment' || p.kind === 'repayment'))
      .reduce((sum, p) => sum + p.amount, 0)
    const refundedCash = payments
      .filter((p) => p.method === 'cash' && (p.kind === 'refund' || p.kind === 'reversal'))
      .reduce((sum, p) => sum + p.amount, 0)
    const creditGiven = sales.reduce((sum, sale) => sum + sale.due, 0)
    const repayments = payments.filter((p) => p.kind === 'repayment').reduce((sum, p) => sum + p.amount, 0)
    const outstanding = customers.reduce((sum, customer) => sum + customer.balance, 0)
    return {
      salesTotal,
      cash,
      online,
      creditGiven,
      repayments,
      outstanding,
      expectedCash: cash - refundedCash,
      retailCount: sales.filter((s) => s.sale_type === 'retail').length,
      wholesaleCount: sales.filter((s) => s.sale_type === 'wholesale').length,
      cashTxCount: payments.filter((p) => p.method === 'cash' && (p.kind === 'sale_payment' || p.kind === 'repayment'))
        .length,
      onlineTxCount: payments.filter(
        (p) => p.method === 'online' && (p.kind === 'sale_payment' || p.kind === 'repayment'),
      ).length,
      unpaidToday: sales.filter((s) => s.due > 0).length,
      owingCustomers: customers.filter((c) => c.balance > 0).length,
    }
  }, [sales, payments, customers])

  async function saveCashCheck() {
    setCheckError(null)
    const counted = parseRupees(countedInput)
    if (counted === null) {
      setCheckError('Enter the counted cash amount.')
      return
    }
    if (!profile) return
    setSavingCheck(true)
    const { error } = await supabase.from('cash_checks').upsert(
      {
        business_date: today,
        expected_cash: stats.expectedCash,
        counted_cash: counted,
        checked_by: profile.id,
        note: (checkNote ?? '').trim() || null,
      },
      { onConflict: 'business_date' },
    )
    setSavingCheck(false)
    if (error) {
      setCheckError(error.message)
      return
    }
    await queryClient.invalidateQueries({ queryKey: todayKey })
  }

  if (todayQuery.isPending)
    return (
      <div className="px-6 py-[100px] text-center text-[0.95rem] font-semibold text-ink-3">
        <span className="mx-auto mb-4 block size-[30px] animate-[spin_700ms_linear_infinite] rounded-full border-[3px] border-surface-highest border-t-primary" />
        Loading today…
      </div>
    )
  if (todayQuery.isError) return <Notice tone="error">{todayQuery.error.message}</Notice>

  return (
    <>
      <PageHead
        eyebrow="Counter overview"
        title="Today"
        description={
          <>
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              timeZone: 'Asia/Kathmandu',
            })}
            {' · '}
            Asia/Kathmandu
          </>
        }
        actions={
          <Button asChild>
            <Link to="/sale">
              <Icon name="plus" />
              New sale
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid auto-rows-min grid-cols-[repeat(auto-fit,minmax(min(100%,238px),1fr))] gap-4 max-sm:grid-cols-1 max-sm:gap-3">
        <StatCard
          tone="neutral"
          label="Sales"
          value={formatRupees(stats.salesTotal)}
          icon={<Icon name="receipt" />}
          note={`${sales.length} invoices today`}
          chip={`${stats.retailCount} retail · ${stats.wholesaleCount} wholesale`}
        />
        <StatCard
          tone="cash"
          label="Cash collected"
          value={formatRupees(stats.cash)}
          icon={<Icon name="wallet" />}
          note="includes repayments"
          chip={`${stats.cashTxCount} cash receipts`}
        />
        <StatCard
          tone="online"
          label="Online collected"
          value={formatRupees(stats.online)}
          icon={<Icon name="card" />}
          note="bank / QR transfers"
          chip={`${stats.onlineTxCount} online receipts`}
        />
        <StatCard
          tone="credit"
          label="Credit given"
          value={formatRupees(stats.creditGiven)}
          icon={<Icon name="credit" />}
          note="unpaid from today's sales"
          chip={`${stats.unpaidToday} invoices open`}
        />
        <StatCard
          tone="outstanding"
          label="Outstanding credit"
          value={formatRupees(stats.outstanding)}
          icon={<Icon name="customers" />}
          note="across all customers"
          chip={`${stats.owingCustomers} owe now`}
        />
      </div>

      <Card className="mb-[22px] overflow-hidden p-0">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 pt-4 pb-3">
          <h2 className="text-[1.1rem] font-bold tracking-[-0.02em]">Today's sales</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/sales">View all</Link>
          </Button>
        </div>
        {sales.length === 0 ? (
          <p className="px-5 py-4 text-[0.85rem] leading-[1.55] text-ink-3">No sales recorded yet today.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right whitespace-nowrap tabular-nums">Total</TableHead>
                <TableHead className="text-right whitespace-nowrap tabular-nums">Paid</TableHead>
                <TableHead className="text-right whitespace-nowrap tabular-nums">Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.slice(0, 8).map((sale) => (
                <TableRow key={sale.id} onClick={() => setReceiptId(sale.id)}>
                  <TableCell className="tabular-nums">#{sale.invoice_no}</TableCell>
                  <TableCell>
                    {new Date(sale.created_at).toLocaleTimeString('en-GB', {
                      timeZone: 'Asia/Kathmandu',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sale.sale_type === 'wholesale' ? 'wholesale' : 'default'}>{sale.sale_type}</Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">
                    {formatRupees(sale.total)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">{formatRupees(sale.paid)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">{formatRupees(sale.due)}</TableCell>
                  <TableCell>
                    <Badge variant={sale.due <= 0 ? 'paid' : 'partial'}>
                      {sale.due <= 0 ? 'Paid' : sale.paid > 0 ? 'Partially paid' : 'Credit'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {isOwner && (
        <Card className="p-[20px_24px] max-sm:p-4">
          <div className="mb-3.5 flex items-center justify-between gap-4 border-b border-line pb-3.5">
            <h2 className="text-[1.1rem] font-bold tracking-[-0.02em]">End-of-day cash check</h2>
            {cashCheck && <Badge variant="paid">Saved</Badge>}
          </div>
          <p className="mb-3 text-[0.85rem] leading-[1.55] text-ink-3">
            Expected cash is cash received minus cash refunds today. Count the drawer and enter the total.
          </p>
          <div className="flex flex-wrap items-end gap-[11px]">
            <div>
              <span className="block text-[0.85rem] leading-[1.55] font-semibold text-ink-3">Expected</span>
              <div className="flex h-[42px] items-center text-[1.2rem] font-extrabold tracking-[-0.03em]">
                {formatRupees(stats.expectedCash)}
              </div>
            </div>
            <div className="ml-[22px]">
              <Label className="mb-[7px] block" htmlFor="counted-cash">
                Counted cash
              </Label>
              <Input
                id="counted-cash"
                className="w-[150px]"
                inputMode="decimal"
                value={countedInput}
                onChange={(event) => setCountedInput(event.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="min-w-[200px] flex-1">
              <Label className="mb-[7px] block" htmlFor="check-note">
                Note (optional)
              </Label>
              <Input id="check-note" value={checkNote ?? ''} onChange={(event) => setCheckNote(event.target.value)} />
            </div>
            <Button onClick={saveCashCheck} disabled={savingCheck}>
              {savingCheck ? 'Saving…' : cashCheck ? 'Update check' : 'Save check'}
            </Button>
          </div>
          {checkError && (
            <Notice tone="error" className="mt-3">
              {checkError}
            </Notice>
          )}
          {cashCheck && (
            <p className="mt-2.5 text-[0.85rem] leading-[1.55] text-ink-3">
              Difference:{' '}
              <strong className={cashCheck.difference === 0 ? 'text-primary' : 'text-destructive'}>
                {formatRupees(cashCheck.difference)}
              </strong>
            </p>
          )}
        </Card>
      )}

      {receiptId && <Receipt saleId={receiptId} onClose={() => setReceiptId(null)} />}
    </>
  )
}
