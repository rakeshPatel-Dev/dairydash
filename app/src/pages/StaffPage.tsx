import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryClient, queryKeys } from '../lib/queryClient'
import { useAuth } from '../auth/AuthProvider'
import { Notice } from '@/components/Notice'
import { PageHead } from '@/components/PageHead'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '../lib/supabase'
import type { StaffProfile } from '../lib/types'

export function StaffPage() {
  const { profile: me } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const staffQuery = useQuery({
    queryKey: queryKeys.staff(),
    queryFn: async () => {
      const { data, error: queryError } = await supabase.from('staff_profiles').select('*').order('created_at')
      if (queryError) throw queryError
      return (data as StaffProfile[]) ?? []
    },
  })
  const staff = staffQuery.data ?? []

  async function update(id: string, patch: Partial<StaffProfile>) {
    const { error: updateError } = await supabase.from('staff_profiles').update(patch).eq('id', id)
    if (updateError) setError(updateError.message)
    else await queryClient.invalidateQueries({ queryKey: queryKeys.staff() })
  }

  if (staffQuery.isPending)
    return (
      <div className="px-6 py-[100px] text-center text-[0.95rem] font-semibold text-ink-3">
        <span className="mx-auto mb-4 block size-[30px] animate-spin rounded-full border-[3px] border-surface-highest border-t-primary" />
        Loading staff…
      </div>
    )

  return (
    <>
      <PageHead
        eyebrow="Permissions"
        title="Staff"
        description="Individual logins only. Permissions are enforced on the server."
      />

      {error && <Notice tone="error">{error}</Notice>}

      <div className="mb-[18px] overflow-hidden rounded-[20px] border border-line bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Wholesale override</TableHead>
              <TableHead>Void</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((member) => (
              <TableRow key={member.id} className="cursor-default">
                <TableCell className="font-semibold">
                  {member.full_name}
                  {member.id === me?.id && (
                    <Badge variant="paid" className="ml-2">
                      you
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={member.role}
                    onValueChange={(role) => void update(member.id, { role: role as StaffProfile['role'] })}
                  >
                    <SelectTrigger className="h-[34px] w-[130px] px-2" disabled={member.id === me?.id}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="cashier">Cashier</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <input
                    type="checkbox"
                    className="size-[17px] cursor-pointer accent-primary"
                    checked={member.can_override_wholesale}
                    onChange={(event) => void update(member.id, { can_override_wholesale: event.target.checked })}
                    disabled={member.role === 'owner'}
                  />
                </TableCell>
                <TableCell>
                  <input
                    type="checkbox"
                    className="size-[17px] cursor-pointer accent-primary"
                    checked={member.can_void}
                    onChange={(event) => void update(member.id, { can_void: event.target.checked })}
                    disabled={member.role === 'owner'}
                  />
                </TableCell>
                <TableCell>
                  <input
                    type="checkbox"
                    className="size-[17px] cursor-pointer accent-primary"
                    checked={member.active}
                    onChange={(event) => void update(member.id, { active: event.target.checked })}
                    disabled={member.id === me?.id}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-[20px] border border-line bg-white p-[20px_24px] shadow-sm max-sm:p-4">
        <h2 className="text-[1.1rem] font-bold tracking-[-0.02em]">Adding a new staff member</h2>
        <p className="mt-2 text-[0.85rem] leading-[1.6] text-ink-3">
          1. In Supabase, open <strong>Authentication → Users → Add user</strong> and create an email + password for
          them.
          <br />
          2. Copy the new user's UUID and run this in the Supabase SQL editor:
        </p>
        <pre className="mt-2.5 overflow-x-auto rounded-[14px] border border-line bg-surface-low p-4 font-mono text-[0.8rem] leading-[1.6]">
          {`insert into staff_profiles (id, full_name, role)
values ('<user-uuid>', 'Staff Name', 'cashier');`}
        </pre>
        <p className="mt-2.5 text-[0.85rem] leading-[1.55] text-ink-3">
          They appear here immediately and can be granted permissions with the checkboxes above. Credentials for
          departed staff: deactivate them here and remove the auth user in Supabase.
        </p>
      </div>
    </>
  )
}
