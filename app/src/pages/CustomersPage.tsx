import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { queryClient, queryKeys } from '../lib/queryClient'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { EmptyState } from '@/components/EmptyState'
import { Notice } from '@/components/Notice'
import { PageHead } from '@/components/PageHead'
import { StatCard } from '@/components/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { formatRupees } from '../lib/money'
import { supabase } from '../lib/supabase'
import type { Customer, CustomerWithBalance } from '../lib/types'

export function CustomersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const customersQuery = useQuery({
    queryKey: queryKeys.customers(),
    queryFn: async () => {
      const { data, error: rpcError } = await supabase.rpc('customers_with_balance')
      if (rpcError) throw rpcError
      return (data as CustomerWithBalance[]) ?? []
    },
  })
  const customers = customersQuery.data ?? []

  useEffect(() => {
    setError(customersQuery.error ? customersQuery.error.message : null)
  }, [customersQuery.error])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return customers
    return customers.filter(
      (customer) => customer.name.toLowerCase().includes(term) || (customer.phone ?? '').toLowerCase().includes(term),
    )
  }, [customers, search])

  const owing = customers.reduce((sum, customer) => sum + customer.balance, 0)
  const owingCount = customers.filter((customer) => customer.balance > 0).length
  const wholesaleCount = customers.filter((customer) => customer.type === 'wholesale').length
  const activeCount = customers.filter((customer) => customer.active).length
  const wholesaleOwing = customers.filter((customer) => customer.type === 'wholesale' && customer.balance > 0).length

  if (customersQuery.isPending)
    return (
      <div className="px-6 py-[100px] text-center text-[0.95rem] font-semibold text-ink-3">
        <span className="mx-auto mb-4 block size-[30px] animate-spin rounded-full border-[3px] border-surface-highest border-t-primary" />
        Loading customers…
      </div>
    )

  return (
    <>
      <PageHead
        eyebrow="Customer ledger"
        title="Customers"
        description="Credit balances and repayments, tracked per customer and invoice."
        actions={<Button onClick={() => setShowForm(true)}>Add customer</Button>}
      />

      {error && <Notice tone="error">{error}</Notice>}

      <div className="mb-6 grid auto-rows-min [grid-template-columns:repeat(auto-fit,minmax(min(100%,238px),1fr))] gap-4 max-sm:grid-cols-1 max-sm:gap-3">
        <StatCard
          tone="outstanding"
          label="Outstanding credit"
          icon={<Icon name="wallet" />}
          value={formatRupees(owing)}
          note={`${owingCount} account${owingCount === 1 ? '' : 's'} with a balance`}
          chip={`avg ${owingCount > 0 ? formatRupees(owing / owingCount) : formatRupees(0)}`}
        />
        <StatCard
          label="Accounts"
          icon={<Icon name="customers" />}
          value={customers.length}
          note="customers on file"
          chip={`${activeCount} active`}
        />
        <StatCard
          tone="credit"
          label="Wholesale buyers"
          icon={<Icon name="products" />}
          value={wholesaleCount}
          note="on wholesale price lists"
          chip={`${wholesaleOwing} with balance`}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex flex-1 items-center">
          <Icon name="search" className="pointer-events-none absolute left-3.5 size-4.5 text-ink-3" />
          <Input
            className="max-w-[480px] pl-10"
            placeholder="Search name or phone…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-border bg-white shadow-sm">
        {filtered.length === 0 ? (
          <EmptyState title="No customers found">Add regulars and wholesale buyers to track their credit.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right whitespace-nowrap tabular-nums">Outstanding</TableHead>
                <TableHead className="text-right whitespace-nowrap tabular-nums">Open invoices</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/customers/${customer.id}`)}
                >
                  <TableCell className="font-semibold">{customer.name}</TableCell>
                  <TableCell>{customer.phone ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={customer.type === 'wholesale' ? 'wholesale' : 'default'}>{customer.type}</Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold whitespace-nowrap tabular-nums ${
                      customer.balance > 0 ? 'text-amber' : ''
                    }`}
                  >
                    {formatRupees(customer.balance)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">{customer.open_invoices}</TableCell>
                  <TableCell>
                    <Badge variant={customer.active ? 'paid' : 'default'}>
                      {customer.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {showForm && (
        <CustomerForm
          onClose={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false)
            await queryClient.invalidateQueries({ queryKey: queryKeys.customers() })
          }}
        />
      )}
    </>
  )
}

export function CustomerForm({
  customer,
  onClose,
  onSaved,
}: {
  customer?: Customer
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(customer?.name ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')
  const [type, setType] = useState<'retail' | 'wholesale'>(customer?.type ?? 'retail')
  const [address, setAddress] = useState(customer?.address ?? '')
  const [notes, setNotes] = useState(customer?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setBusy(true)
    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      type,
      address: address.trim() || null,
      notes: notes.trim() || null,
    }
    const query = customer
      ? supabase.from('customers').update(payload).eq('id', customer.id)
      : supabase.from('customers').insert(payload)
    const { error: saveError } = await query
    setBusy(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    onSaved()
  }

  return (
    <Modal
      title={customer ? 'Edit customer' : 'Add customer'}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      }
    >
      {error && <Notice tone="error">{error}</Notice>}
      <div className="mb-4">
        <Label className="mb-[7px]" htmlFor="customer-name">
          Name
        </Label>
        <Input id="customer-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-[15px] max-sm:grid-cols-1">
        <div className="mb-4">
          <Label className="mb-[7px]" htmlFor="customer-phone">
            Phone
          </Label>
          <Input id="customer-phone" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
        <div className="mb-4">
          <Label className="mb-[7px]" htmlFor="customer-type">
            Type
          </Label>
          <Select value={type} onValueChange={(value) => setType(value as 'retail' | 'wholesale')}>
            <SelectTrigger id="customer-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="wholesale">Wholesale</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mb-4">
        <Label className="mb-[7px]" htmlFor="customer-address">
          Address (optional)
        </Label>
        <Input id="customer-address" value={address} onChange={(event) => setAddress(event.target.value)} />
      </div>
      <div className="mb-4">
        <Label className="mb-[7px]" htmlFor="customer-notes">
          Notes (optional)
        </Label>
        <Textarea id="customer-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>
      <p className="text-[0.85rem] leading-[1.55] text-ink-3">
        Balances are calculated from sales and payments — never edited directly.
      </p>
    </Modal>
  )
}
