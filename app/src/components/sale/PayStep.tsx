import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatRupees, formatQty, parseRupees, rupeesToInput, lineTotal } from '../../lib/money'
import { gramsInputFromKg, isWeightUnit, kgFromGramsInput } from '../../lib/quantity'
import { Notice } from '@/components/Notice'
import { PageHead } from '@/components/PageHead'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/Modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { QuickCustomerForm } from '@/components/sale/QuickCustomerForm'
import { WALK_IN, useSaleFlow, type SaleMethod } from '@/components/sale/SaleFlowContext'
import { SaleSteps } from '@/components/sale/SaleSteps'

export function PayStep() {
  const navigate = useNavigate()
  const [savedId, setSavedId] = useState<string | null>(null)
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const {
    online,
    busy,
    error,
    lines,
    lineQty,
    linePrice,
    updateLine,
    removeLine,
    resetSale,
    isWholesale,
    wholesalePrices,
    total,
    customerId,
    setCustomerId,
    setError,
    customers,
    rememberCustomer,
    checkout,
    setCompletedSaleId,
    method,
    setMethod,
    cashTendered,
    applyTender,
    onlineReference,
    setOnlineReference,
  } = useSaleFlow()

  useEffect(() => {
    if (lines.length === 0 && !savedId) navigate('/sale', { replace: true })
  }, [lines.length, savedId, navigate])

  const tendered = parseRupees(cashTendered) ?? 0
  const change = tendered > total ? tendered - total : 0
  const shortTender = method === 'cash' && tendered > 0 && tendered < total ? total - tendered : 0

  const customer = customers.find((c) => c.id === customerId) ?? null
  const items = lines.length
  const belowRetail = isWholesale ? lines.filter((line) => linePrice(line) < line.product.retail_price) : []

  const canCharge = !busy && lines.length > 0 && online

  // The customer block: wholesale always; retail when selling on credit.
  const showCustomerPick = isWholesale || method === 'credit'

  /** Switching a retail sale away from 'credit' detaches the customer. */
  function pickMethod(next: SaleMethod) {
    setMethod(next)
    if (!isWholesale && next !== 'credit') setCustomerId('')
    setError(null)
  }

  // One source of truth for the charge label. `checkout()` returns an id
  // (or null on failure); `save()` handles the navigation.
  const checkoutLabel = useMemo(() => {
    if (!online) return 'Offline'
    if (busy) return 'Saving…'
    if (method === 'credit') return `Charge ${formatRupees(total)} on credit`
    return `Charge ${formatRupees(total)}`
  }, [online, busy, method, total])

  const disabledHint = useMemo(() => {
    if (lines.length === 0) return 'Add a product first.'
    if (!online) return 'Reconnect to charge.'
    if (isWholesale && !customerId) return 'Wholesale sales need a customer.'
    if (method === 'credit' && !customerId) return 'Attach a customer for the credit balance.'
    return null
  }, [lines.length, online, customerId, isWholesale, method])

  async function save() {
    const result = await checkout()
    if (!result.saleId) return
    setSavedId(result.saleId)
    setCompletedSaleId(result.saleId)
    navigate('/sale/complete')
  }

  return (
    <>
      <PageHead
        eyebrow="Point of sale"
        title="Review & pay"
        // description="Confirm the cart, record the money received, then charge."
        actions={
          <Button variant="outline" onClick={() => navigate('/sale')}>
            + More products
          </Button>
        }
      />
      <SaleSteps current={2} />

      {error && (
        <Notice tone="error" className="mb-4">
          {error}
        </Notice>
      )}

      <div className="grid items-start gap-6 max-lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_clamp(350px,29vw,430px)]">
        {/* ── Cart (still editable) ─────────────────────────────────── */}
        <Card className="p-6 max-sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-3 border-b border-border pb-3.5">
            <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-[-0.02em]">
              Cart
              <Badge variant="default">{lines.length}</Badge>
              <span className="text-[0.86rem] font-medium text-ink-3">
                {formatQty(items)} item{items === 1 ? '' : 's'}
              </span>
            </h2>
            <Button
              variant="outline"
              onClick={() => setConfirmClear(true)}
              disabled={busy}
              className="font-semibold text-destructive transition-colors hover:border-destructive hover:bg-destructive hover:text-white disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55"
            >
              Clear all
            </Button>
          </div>

          {lines.map((line) => {
            const price = linePrice(line)
            const isBelow = isWholesale && price < line.product.retail_price
            return (
              <div
                key={line.product.id}
                className="border-b border-[#eff3ef] py-3 last:border-b-0 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-x-4 sm:gap-y-1"
              >
                {/* title + (mobile) total/remove */}
                <div className="flex items-start justify-between gap-3 sm:col-start-1 sm:row-start-1 sm:block">
                  <div className="min-w-0 text-base leading-[1.3] font-bold">{line.product.title}</div>
                  <div className="shrink-0 text-right sm:hidden">
                    <div className="text-lg font-extrabold tabular-nums">
                      {formatRupees(lineTotal(lineQty(line), price))}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.product.id)}
                      aria-label={`Remove ${line.product.title}`}
                      className="cursor-pointer py-1 text-[0.78rem] font-semibold text-ink-3 transition-colors hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* meta: pack · @price · badge */}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.86rem] font-semibold text-ink-3 sm:col-start-1 sm:row-start-2 sm:mt-0">
                  {line.product.pack_size && <span>{line.product.pack_size}</span>}
                  {isWholesale ? (
                    <label className="inline-flex items-center gap-1">
                      <span>@</span>
                      <Input
                        className="h-9 w-24 px-2.5 text-right text-[0.85rem]"
                        inputMode="decimal"
                        value={line.priceInput}
                        onChange={(event) => updateLine(line.product.id, { priceInput: event.target.value })}
                        aria-label={`Unit price for ${line.product.title}`}
                        placeholder={rupeesToInput(wholesalePrices[line.product.id] ?? line.product.retail_price)}
                      />
                    </label>
                  ) : (
                    <span>
                      {formatRupees(line.product.retail_price)} / {line.product.unit}
                    </span>
                  )}
                  {isBelow && <Badge variant="partial">below retail</Badge>}
                </div>

                {/* stepper — same control as the sale page */}
                <div className="mt-2.5 inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface-low p-1.5 max-sm:w-fit sm:col-start-2 sm:row-span-2 sm:mt-0 sm:justify-self-end">
                  <button
                    type="button"
                    aria-label="decrease"
                    onClick={() =>
                      updateLine(line.product.id, {
                        qtyInput: String(
                          Math.max(
                            0,
                            Math.round((lineQty(line) - (isWeightUnit(line.product.unit) ? 0.1 : 1)) * 1000) / 1000,
                          ),
                        ),
                      })
                    }
                    className="grid size-11 cursor-pointer place-items-center rounded-full bg-white text-[1.35rem] leading-none font-bold text-primary-strong shadow-xs transition-colors hover:bg-primary-soft active:scale-95 active:bg-primary-soft"
                  >
                    −
                  </button>
                  <input
                    className="h-11 w-20 border-0 bg-transparent text-center text-[1.15rem] font-bold tabular-nums outline-none"
                    value={
                      isWeightUnit(line.product.unit)
                        ? line.qtyInput.trim() === ''
                          ? ''
                          : gramsInputFromKg(lineQty(line))
                        : line.qtyInput
                    }
                    onChange={(event) =>
                      updateLine(line.product.id, {
                        qtyInput: isWeightUnit(line.product.unit)
                          ? kgFromGramsInput(event.target.value)
                          : event.target.value,
                      })
                    }
                    aria-label={`Quantity for ${line.product.title}`}
                    inputMode="decimal"
                  />
                  {isWeightUnit(line.product.unit) && (
                    <span className="pr-1 text-[0.82rem] font-extrabold text-ink-3">g</span>
                  )}
                  <button
                    type="button"
                    aria-label="increase"
                    onClick={() =>
                      updateLine(line.product.id, {
                        qtyInput: String(
                          Math.round((lineQty(line) + (isWeightUnit(line.product.unit) ? 0.1 : 1)) * 1000) / 1000,
                        ),
                      })
                    }
                    className="grid size-11 cursor-pointer place-items-center rounded-full bg-white text-[1.35rem] leading-none font-bold text-primary-strong shadow-xs transition-colors hover:bg-primary-soft active:scale-95 active:bg-primary-soft"
                  >
                    +
                  </button>
                </div>

                {/* desktop total + remove */}
                <div className="hidden text-right sm:col-start-3 sm:row-span-2 sm:block sm:min-w-[92px]">
                  <div className="text-[1.05rem] font-extrabold tabular-nums">
                    {formatRupees(lineTotal(lineQty(line), price))}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(line.product.id)}
                    aria-label={`Remove ${line.product.title}`}
                    className="cursor-pointer py-1 text-[0.78rem] font-semibold text-ink-3 transition-colors hover:text-destructive"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          })}

          <div className="mt-2 flex items-baseline justify-between border-t border-border pt-4">
            <span className="text-[0.92rem] text-ink-2">
              Total · {formatQty(items)} item{items === 1 ? '' : 's'}
            </span>
            <span className="text-[1.7rem] leading-none font-extrabold tracking-[-0.03em] tabular-nums">
              {formatRupees(total)}
            </span>
          </div>
          {belowRetail.length > 0 && (
            <p className="mt-2 text-[0.83rem] leading-[1.5] text-ink-3">
              {belowRetail.length} line{belowRetail.length === 1 ? '' : 's'} below retail · logged on save
            </p>
          )}
        </Card>

        {/* ── Payment rail ─────────────────────────────────────────── */}
        <aside className="rounded-[20px] border border-border bg-white p-[22px] shadow-md max-lg:static max-sm:p-4 xl:sticky xl:top-[100px]">
          <div className="mb-4 border-b border-border pb-4">
            <div className="text-[0.8rem] font-semibold tracking-[0.08em] text-ink-3 uppercase">Amount due</div>
            <div className="mt-1 text-[2.2rem] leading-none font-extrabold tracking-[-0.03em] tabular-nums max-sm:text-[1.9rem]">
              {formatRupees(total)}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={isWholesale ? 'wholesale' : 'default'}>{isWholesale ? 'Wholesale' : 'Retail'}</Badge>
              <Badge variant={method === 'credit' ? 'partial' : 'paid'}>{customer ? customer.name : 'Walk-in'}</Badge>
            </div>
          </div>

          <div className="mb-2.5">
            <strong className="text-[0.9rem] font-bold">Payment</strong>
          </div>

          <ButtonGroup aria-label="Payment method" className="mb-3 w-full">
            <Button
              type="button"
              variant={method === 'cash' ? 'default' : 'outline'}
              className="flex-1 px-3"
              onClick={() => pickMethod('cash')}
            >
              Cash
            </Button>
            <Button
              type="button"
              variant={method === 'online' ? 'default' : 'outline'}
              className="flex-1 px-3"
              onClick={() => pickMethod('online')}
            >
              Online
            </Button>
            <Button
              type="button"
              variant={method === 'credit' ? 'default' : 'outline'}
              className="flex-1 px-3"
              onClick={() => pickMethod('credit')}
            >
              Credit
            </Button>
          </ButtonGroup>

          {method === 'online' && (
            <div className="mb-3">
              <Label className="mb-[7px]">Reference (optional)</Label>
              <Input
                value={onlineReference}
                onChange={(event) => setOnlineReference(event.target.value)}
                placeholder="eSewa / Khalti / bank ref"
                aria-label="Payment reference"
              />
            </div>
          )}

          {/* Cash tender input — change calculator only; the sale always posts the full total */}
          {method === 'cash' && (
            <div className="mb-3 grid gap-2 rounded-xl border border-dashed border-border p-3">
              <div>
                <Label className="mb-[7px]">Cash received</Label>
                <Input
                  inputMode="decimal"
                  placeholder="0"
                  value={cashTendered}
                  onChange={(event) => applyTender(event.target.value)}
                  disabled={lines.length === 0}
                />
              </div>
              {change > 0 && (
                <div
                  role="status"
                  className="flex justify-between rounded-lg bg-[#ecfdf5] px-3 py-2.5 font-bold text-[#047857]"
                >
                  <span>Change to return</span>
                  <span>{formatRupees(change)}</span>
                </div>
              )}
              {shortTender > 0 && (
                <div
                  role="status"
                  className="flex justify-between rounded-lg bg-[#fef2f2] px-3 py-2.5 font-bold text-[#b91c1c]"
                >
                  <span>Short of total</span>
                  <span>{formatRupees(shortTender)}</span>
                </div>
              )}
            </div>
          )}

          {/* customer on credit */}
          {showCustomerPick && (
            <div className="mt-3 rounded-xl border border-border bg-surface-low p-3">
              <Label className="mb-[7px]">
                {method === 'credit' ? 'Customer on credit' : 'Customer'}
                {!customerId && (
                  <Badge variant="partial" className="ml-2">
                    required
                  </Badge>
                )}
              </Label>
              <div className="flex items-center gap-1.5">
                <Select
                  value={customerId === '' ? WALK_IN : customerId}
                  onValueChange={(value) => setCustomerId(value === WALK_IN ? '' : value)}
                >
                  <SelectTrigger className="min-w-0 flex-1" aria-label="Customer on credit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                    <SelectItem value={WALK_IN}>Walk-in</SelectItem>
                    {customers
                      .filter((c) => c.active || c.id === customerId)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.balance > 0 ? ` · owes ${formatRupees(c.balance)}` : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setShowCustomerForm(true)}
                  title="Add customer"
                >
                  +
                </Button>
              </div>
              {method === 'credit' && customerId ? (
                <p className="mt-2 text-[0.84rem] leading-[1.5] text-ink-3">
                  {formatRupees(total)} will go to {customer?.name ?? 'the customer'}'s balance.
                </p>
              ) : null}
            </div>
          )}

          <Button block className="mt-5 h-[54px] text-[1.02rem]" onClick={() => void save()} disabled={!canCharge}>
            {checkoutLabel}
          </Button>
          {disabledHint && <p className="mt-2 text-center text-[0.82rem] text-ink-3">{disabledHint}</p>}
        </aside>
      </div>

      {showCustomerForm && (
        <QuickCustomerForm
          onClose={() => setShowCustomerForm(false)}
          onCreated={(created) => {
            setShowCustomerForm(false)
            rememberCustomer(created)
            setCustomerId(created.id)
          }}
        />
      )}

      {confirmClear && (
        <Modal
          title="Clear cart?"
          onClose={() => setConfirmClear(false)}
          footer={
            <div className="flex flex-wrap items-center justify-end gap-[11px]">
              <Button variant="outline" onClick={() => setConfirmClear(false)}>
                Keep
              </Button>
              <Button
                onClick={() => {
                  resetSale()
                  setConfirmClear(false)
                  navigate('/sale')
                }}
              >
                Clear
              </Button>
            </div>
          }
        >
          <p>
            {lines.length} line{lines.length === 1 ? '' : 's'} · {formatRupees(total)}
          </p>
        </Modal>
      )}
    </>
  )
}
