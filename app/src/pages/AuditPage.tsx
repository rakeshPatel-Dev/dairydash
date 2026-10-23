import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryClient'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { PageHead } from '@/components/PageHead'
import { Notice } from '@/components/Notice'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { downloadCsv } from '../lib/csv'
import { supabase } from '../lib/supabase'

interface AuditRow {
  id: number
  actor_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
  staff_profiles: { full_name: string } | null
}

const KNOWN_ACTIONS = [
  'login',
  'sale_created',
  'payment_received',
  'repayment_received',
  'sale_voided',
  'wholesale_price_override',
  'product_created',
  'product_updated',
  'product_price_changed',
  'product_availability_changed',
  'category_changed',
  'customer_created',
  'customer_changed',
  'staff_changed',
  'settings_changed',
  'data_exported',
]

function actionLabel(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function detailsSummary(details: Record<string, unknown> | null): string {
  if (!details) return ''
  return Object.entries(details)
    .filter(([, value]) => value !== null && value !== '')
    .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
    .join(' · ')
}

function today(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kathmandu' })
}

export function AuditPage() {
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(today())
  const [action, setAction] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [exported, setExported] = useState<string | null>(null)

  const auditQuery = useQuery({
    queryKey: queryKeys.audit(from, to, action),
    queryFn: async () => {
      let query = supabase
        .from('audit_events')
        .select('id, actor_id, action, entity_type, entity_id, details, created_at, staff_profiles(full_name)')
        .gte('created_at', `${from}T00:00:00+05:45`)
        .lte('created_at', `${to}T23:59:59+05:45`)
        .order('created_at', { ascending: false })
        .limit(500)

      if (action) query = query.eq('action', action)

      const { data, error: queryError } = await query
      if (queryError) throw queryError
      return (data as unknown as AuditRow[]) ?? []
    },
  })
  const rows = auditQuery.data ?? []

  useEffect(() => {
    setError(auditQuery.error ? auditQuery.error.message : null)
  }, [auditQuery.error])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) =>
      [row.action, row.staff_profiles?.full_name ?? '', row.entity_type ?? '', detailsSummary(row.details)]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [rows, search])

  function exportCsv() {
    const csvRows = filtered.map((row) => ({
      time: new Date(row.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Kathmandu' }),
      actor: row.staff_profiles?.full_name ?? row.actor_id ?? '',
      action: row.action,
      entity_type: row.entity_type ?? '',
      entity_id: row.entity_id ?? '',
      details: row.details ? JSON.stringify(row.details) : '',
    }))
    const count = downloadCsv(`audit-log-${from}_${to}.csv`, csvRows)
    setExported(`${count} rows exported`)
    void supabase.rpc('log_client_event', {
      p_action: 'data_exported',
      p_details: { report: 'audit_log', rows: count, from, to },
    })
  }

  return (
    <>
      <PageHead
        eyebrow="Owner only"
        title="Audit log"
        description="Append-only. Every void, override, repayment and change is recorded."
        actions={
          <>
            {exported && <Badge variant="paid">{exported}</Badge>}
            <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
              Export CSV
            </Button>
          </>
        }
      />

      {error && <Notice tone="error">{error}</Notice>}

      <div className="mb-4 rounded-[20px] border border-border bg-white p-[20px_24px] shadow-sm max-sm:p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="mb-0">
            <Label className="mb-[7px]" htmlFor="audit-from">
              From
            </Label>
            <Input id="audit-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div className="mb-0">
            <Label className="mb-[7px]" htmlFor="audit-to">
              To
            </Label>
            <Input id="audit-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
          <div className="mb-0">
            <Label className="mb-[7px]">Action</Label>
            <Select
              value={action || 'all-actions'}
              onValueChange={(value) => setAction(value === 'all-actions' ? '' : value)}
            >
              <SelectTrigger className="w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-actions">All actions</SelectItem>
                {KNOWN_ACTIONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {actionLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mb-0 min-w-[200px] flex-1">
            <Label className="mb-[7px]" htmlFor="audit-search">
              Search
            </Label>
            <Input
              id="audit-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, invoice, reason…"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-border bg-white shadow-sm">
        {auditQuery.isPending ? (
          <LoadingState label="Loading audit events…" />
        ) : filtered.length === 0 ? (
          <EmptyState title="No events">Adjust the date range or action filter.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString('en-GB', {
                      timeZone: 'Asia/Kathmandu',
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell>{row.staff_profiles?.full_name ?? 'system'}</TableCell>
                  <TableCell>
                    <Badge variant="default">{actionLabel(row.action)}</Badge>
                  </TableCell>
                  <TableCell className="text-[0.82rem] text-ink-3">{detailsSummary(row.details)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="mt-3.5 text-[0.85rem] leading-[1.55] text-ink-3">
        Showing up to 500 events. Audit records cannot be edited or deleted through the application.
      </p>
    </>
  )
}
