import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { Customer } from '../../lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/Modal'
import { Notice } from '@/components/Notice'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function QuickCustomerForm({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (customer: Customer) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState<'retail' | 'wholesale'>('retail')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    setError(null)
    if (!name.trim()) {
      setError('Name required.')
      return
    }
    setBusy(true)
    const { data, error: insertError } = await supabase
      .from('customers')
      .insert({ name: name.trim(), phone: phone.trim() || null, type })
      .select()
      .single()
    setBusy(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    onCreated(data as Customer)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!busy) void save()
  }

  return (
    <Modal
      title="Add customer"
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-[11px]">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={save} disabled={busy} type="submit" form="quick-customer-form">
            {busy ? 'Saving…' : 'Add'}
          </Button>
        </div>
      }
    >
      <form id="quick-customer-form" onSubmit={onSubmit}>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="mb-4">
          <Label className="mb-[7px]" htmlFor="quick-customer-name">
            Name
          </Label>
          <Input id="quick-customer-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </div>
        <div className="mb-4">
          <Label className="mb-[7px]" htmlFor="quick-customer-phone">
            Phone
          </Label>
          <Input id="quick-customer-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </div>
        <div className="mb-4">
          <Label className="mb-[7px]">Type</Label>
          <Select value={type} onValueChange={(value) => setType(value as 'retail' | 'wholesale')}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="wholesale">Wholesale</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </form>
    </Modal>
  )
}
