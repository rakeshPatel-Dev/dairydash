import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { ChipFilter } from '@/components/ChipFilter'
import { EmptyState } from '@/components/EmptyState'
import { Notice } from '@/components/Notice'
import { PageHead } from '@/components/PageHead'
import { Segmented } from '@/components/Segmented'
import { SaleSteps } from '@/components/sale/SaleSteps'
import { useSaleFlow } from '@/components/sale/SaleFlowContext'
import { Button } from '@/components/ui/button'
import { formatQty, formatRupees } from '@/lib/money'
import { gramsFromKg, isWeightUnit } from '@/lib/quantity'
import { Plus } from 'lucide-react'

export function SelectStep() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const {
    online,
    loading,
    error,
    categories,
    category,
    setCategory,
    filteredProducts,
    imageUrls,
    qtyByProduct,
    saleType,
    changeSaleType,
    updateLine,
    removeLine,
    resetSale,
    isWholesale,
    wholesalePrices,
    lines,
    addProduct,
    total,
  } = useSaleFlow()

  const items = lines.length
  const hasCart = lines.length > 0

  if (loading)
    return (
      <div className="px-6 py-[100px] text-center text-[0.95rem] font-semibold text-ink-3">
        <span className="mx-auto mb-4 block size-[30px] animate-spin rounded-full border-[3px] border-surface-highest border-t-primary" />
        Loading…
      </div>
    )

  return (
    <>
      <PageHead
        eyebrow="Point of sale"
        title="New sale"
        actions={
          <Segmented
            options={[
              { value: 'retail', label: 'Retail' },
              { value: 'wholesale', label: 'Wholesale' },
            ]}
            value={saleType}
            onChange={changeSaleType}
          />
        }
      />

      {!online && (
        <Notice tone="error" className="mb-4">
          You are offline — connect to the internet to take a sale.
        </Notice>
      )}
      {error && !loading && (
        <Notice tone="error" className="mb-4">
          {error}
        </Notice>
      )}

      <div className="mb-[18px] flex justify-between">
        <div className="flex gap-2.5 max-sm:flex-wrap max-sm:gap-2">
          <ChipFilter label="All" active={category === 'all'} onClick={() => setCategory('all')} />
          {categories.map((cat) => (
            <ChipFilter
              key={cat.id}
              label={cat.name}
              active={category === cat.id}
              onClick={() => setCategory(cat.id)}
            />
          ))}
        </div>
        <SaleSteps current={1} />
      </div>

      {filteredProducts.length === 0 ? (
        <div className="rounded-[20px] border border-border bg-white shadow-sm max-sm:p-4">
          <EmptyState title="No products">
            {profile?.role === 'owner' && (
              <>
                Add one in <Link to="/products">Products</Link>.
              </>
            )}
          </EmptyState>
        </div>
      ) : (
        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(min(100%,196px),1fr))] gap-4 max-sm:[grid-template-columns:repeat(auto-fit,minmax(min(100%,148px),1fr))] max-sm:gap-2.5">
          {filteredProducts.map((product) => {
            const image = imageUrls[product.id]
            const qty = qtyByProduct[product.id] ?? 0
            return (
              <button
                key={product.id}
                className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[18px] border border-border bg-white text-left shadow-sm transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-[#bcdcc7] hover:shadow-md active:translate-y-0 active:scale-[0.985] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55 max-sm:min-h-0"
                onClick={() => addProduct(product)}
                disabled={!online}
                title={!online ? 'Offline' : product.title}
              >
                {qty > 0 && (
                  <span className="pointer-events-none absolute inset-0 z-10 rounded-[18px] shadow-[inset_0_0_0_2px_#0a6b33]" />
                )}

                {/* image */}
                <div className="relative aspect-square w-full overflow-hidden bg-surface-low">
                  {image ? (
                    <img
                      className="block size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                      src={image}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid size-full place-items-center border-b border-border bg-surface-low bg-[radial-gradient(150px_100px_at_30%_20%,rgba(201,240,214,0.75),transparent_70%)] text-[2.4rem] font-extrabold tracking-[-0.03em] text-primary">
                      {product.title.slice(0, 1)}
                    </div>
                  )}

                  {product.pack_size && (
                    <span className="pointer-events-none absolute top-2 left-2 rounded-full bg-black/65 px-2 py-0.5 text-[0.72rem] font-bold text-white backdrop-blur-sm">
                      {product.pack_size}
                    </span>
                  )}

                  {qty > 0 && (
                    <span
                      aria-label={`${qty} in cart`}
                      className="pointer-events-none absolute top-2 right-2 z-10 grid h-7 min-w-7 place-items-center rounded-full border-2 border-white bg-primary px-1.5 text-[0.8rem] font-extrabold text-white tabular-nums shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
                    >
                      ×{isWeightUnit(product.unit) ? `${formatQty(gramsFromKg(qty))} g` : formatQty(qty)}
                    </span>
                  )}
                </div>

                {/* body */}
                <div className="flex min-h-[64px] items-center justify-between gap-2 px-3.5 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.95rem] leading-tight font-bold tracking-[-0.01em]">
                      {product.title}
                    </div>
                    <div className="mt-0.5 text-[0.74rem] font-medium text-ink-3">
                      {isWholesale
                        ? formatRupees(wholesalePrices[product.id] ?? product.retail_price)
                        : formatRupees(product.retail_price)}{' '}
                      / {product.unit}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 self-center">
                    {qty > 0 && (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Remove one ${product.title}`}
                        title="Remove one"
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          if (qty <= 1) {
                            removeLine(product.id)
                          } else {
                            updateLine(product.id, {
                              qtyInput: String(Math.round((qty - 1) * 1000) / 1000),
                            })
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            if (qty <= 1) {
                              removeLine(product.id)
                            } else {
                              updateLine(product.id, {
                                qtyInput: String(Math.round((qty - 1) * 1000) / 1000),
                              })
                            }
                          }
                        }}
                        className="grid size-10 cursor-pointer place-items-center rounded-full border border-border bg-white text-[1.4rem] leading-none font-bold text-ink-2 transition-[transform,background-color,border-color,color] hover:border-destructive hover:bg-destructive hover:text-white active:scale-95 active:bg-destructive active:text-white"
                      >
                        −
                      </span>
                    )}
                    <span
                      aria-hidden="true"
                      className="grid size-10 place-items-center rounded-full bg-primary-soft text-[1.4rem] leading-none font-bold text-primary-strong transition-[background-color,color] duration-150 group-hover:bg-primary group-hover:text-white"
                    >
                      <Plus className="size-5" />
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* sticky cart summary → review */}
      {hasCart && (
        <>
          <div aria-hidden className="h-[86px] max-sm:h-[92px]" />
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4">
            <div className="pointer-events-auto flex w-full max-w-[680px] items-center gap-4 rounded-full border border-border bg-white py-2.5 pr-2.5 pl-6 shadow-lg max-sm:gap-3 max-sm:pr-2 max-sm:pl-5">
              <div className="min-w-0 flex-1 max-sm:min-w-0">
                <div className="text-[0.78rem] font-semibold text-ink-3">
                  {formatQty(items)} item{items === 1 ? '' : 's'} in cart
                </div>
                <div className="text-[1.15rem] leading-tight font-extrabold tracking-[-0.02em] tabular-nums">
                  {formatRupees(total)}
                </div>
              </div>
              <button
                type="button"
                aria-label="Clear cart"
                title="Clear cart"
                onClick={resetSale}
                className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-line bg-surface-low text-[0.95rem] font-bold text-ink-3 transition-colors hover:border-destructive hover:bg-destructive hover:text-white max-sm:size-9"
              >
                ✕
              </button>
              <Button className="shrink-0 rounded-full px-6" onClick={() => navigate('/sale/pay')}>
                Take payment →
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
