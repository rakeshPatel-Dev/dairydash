import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryClient, queryKeys } from '../lib/queryClient'
import { Modal } from '../components/Modal'
import { ChipFilter } from '@/components/ChipFilter'
import { EmptyState } from '@/components/EmptyState'
import { Field } from '@/components/Field'
import { Notice } from '@/components/Notice'
import { PageHead } from '@/components/PageHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formatRupees, parseRupees, rupeesToInput } from '../lib/money'
import { supabase } from '../lib/supabase'
import type { Category, Product, ProductUnit } from '../lib/types'

const UNIT_OPTIONS: ProductUnit[] = ['litre', 'kg', 'packet', 'piece']

async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  // Tiles render at a 4:3 ratio with object-fit: cover, so pre-crop to 4:3
  // (centered) at 800x600. That stays sharp on 2x-DPI screens while keeping
  // every tile's composition and file size consistent.
  const targetRatio = 4 / 3
  const cropWidth = Math.min(bitmap.width, Math.round(bitmap.height * targetRatio))
  const cropHeight = Math.round(cropWidth / targetRatio)
  const cropX = Math.round((bitmap.width - cropWidth) / 2)
  const cropY = Math.round((bitmap.height - cropHeight) / 2)
  const width = 800
  const height = 600
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not process image')
  context.drawImage(bitmap, cropX, cropY, cropWidth, cropHeight, 0, 0, width, height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not compress image'))), 'image/webp', 0.82)
  })
}

function imageUrl(path: string | null): string | null {
  if (!path) return null
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
}

export function ProductsPage() {
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const catalogQuery = useQuery({
    queryKey: queryKeys.products(),
    queryFn: async () => {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('*').order('sort_order'),
        supabase.from('product_categories').select('*').order('sort_order'),
      ])
      if (productsRes.error) throw productsRes.error
      if (categoriesRes.error) throw categoriesRes.error
      return {
        products: (productsRes.data as Product[]) ?? [],
        categories: (categoriesRes.data as Category[]) ?? [],
      }
    },
  })
  const products = catalogQuery.data?.products ?? []
  const categories = catalogQuery.data?.categories ?? []
  const invalidateCatalog = () => queryClient.invalidateQueries({ queryKey: queryKeys.products() })

  async function toggleActive(product: Product) {
    const { error: updateError } = await supabase
      .from('products')
      .update({ active: !product.active, updated_at: new Date().toISOString() })
      .eq('id', product.id)
    if (updateError) setError(updateError.message)
    else void invalidateCatalog()
  }

  const filtered = categoryFilter === 'all' ? products : products.filter((p) => p.category_id === categoryFilter)

  if (catalogQuery.isPending)
    return (
      <div className="px-6 py-[100px] text-center text-[0.95rem] font-semibold text-ink-3">
        <span className="mx-auto mb-4 block size-[30px] animate-spin rounded-full border-[3px] border-surface-highest border-t-primary" />
        Loading catalog…
      </div>
    )

  return (
    <>
      <PageHead
        eyebrow="Catalog"
        title="Products"
        description="Counter tiles, pack sizes and prices. Photos are optional."
        actions={
          <>
            <Button variant="outline" onClick={() => setShowCategoryForm(true)}>
              Manage categories
            </Button>
            <Button onClick={() => setEditing('new')}>Add product</Button>
          </>
        }
      />

      {error && <Notice tone="error">{error}</Notice>}

      <div className="mb-[18px] flex flex-wrap gap-2">
        <ChipFilter
          label={`All (${products.length})`}
          active={categoryFilter === 'all'}
          onClick={() => setCategoryFilter('all')}
        />
        {categories.map((cat) => (
          <ChipFilter
            key={cat.id}
            label={cat.name}
            active={categoryFilter === cat.id}
            onClick={() => setCategoryFilter(cat.id)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No products yet">
          Add a product with a title, pack size, category, unit and price. Photos are optional.
        </EmptyState>
      ) : (
        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(min(100%,196px),1fr))] gap-4 max-sm:[grid-template-columns:repeat(auto-fit,minmax(min(100%,148px),1fr))] max-sm:gap-2.5">
          {filtered.map((product) => {
            const url = imageUrl(product.image_path)
            const category = categories.find((c) => c.id === product.category_id)
            return (
              <div
                key={product.id}
                className={cn(
                  'relative flex min-h-[236px] cursor-default flex-col overflow-hidden rounded-[18px] border border-line bg-white text-left shadow-sm transition-[transform,border-color,box-shadow] duration-150 max-sm:min-h-0',
                  !product.active && 'opacity-55',
                )}
              >
                {url ? (
                  <img
                    className="block aspect-[4/3] w-full bg-surface-low object-cover"
                    src={url}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <div className="grid aspect-[4/3] w-full place-items-center border-b border-line bg-surface-low bg-[radial-gradient(150px_100px_at_30%_20%,rgba(201,240,214,0.75),transparent_70%)] text-[2rem] font-extrabold tracking-[-0.03em] text-primary">
                    {product.title.slice(0, 1)}
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-1 px-4 pt-3.5 pb-4 max-sm:px-3 max-sm:pt-2.5 max-sm:pb-3">
                  <span className="text-base leading-[1.3] font-bold tracking-[-0.015em]">{product.title}</span>
                  <span className="text-[0.79rem] font-medium text-ink-3">
                    {product.pack_size && <span>{product.pack_size} · </span>}
                    {category?.name ?? '—'} · {product.unit}
                  </span>
                  <span className="mt-auto flex items-center justify-between gap-2.5 pt-2.5 text-[1.08rem] font-extrabold tracking-[-0.02em] tabular-nums">
                    {formatRupees(product.retail_price)}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => setEditing(product)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(product)}>
                      {product.active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <ProductForm
          product={editing === 'new' ? undefined : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await invalidateCatalog()
          }}
        />
      )}

      {showCategoryForm && (
        <CategoryForm
          categories={categories}
          onClose={() => setShowCategoryForm(false)}
          onSaved={() => void invalidateCatalog()}
        />
      )}
    </>
  )
}

function ProductForm({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product?: Product
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(product?.title ?? '')
  const [categoryId, setCategoryId] = useState(product?.category_id ?? categories[0]?.id ?? '')
  const [unit, setUnit] = useState<ProductUnit>(product?.unit ?? 'litre')
  const [packSize, setPackSize] = useState(product?.pack_size ?? '')
  const [priceInput, setPriceInput] = useState(product ? rupeesToInput(product.retail_price) : '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [isPinned, setIsPinned] = useState(product?.is_pinned ?? false)
  const [active, setActive] = useState(product?.active ?? true)
  const [imagePath, setImagePath] = useState<string | null>(product?.image_path ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const blob = await compressImage(file)
      const path = `products/${crypto.randomUUID()}.webp`
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, blob, { contentType: 'image/webp' })
      if (uploadError) throw new Error(uploadError.message)
      setImagePath(path)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    setError(null)
    if (!title.trim()) return setError('Title is required.')
    if (!categoryId) return setError('Pick a category.')
    if (packSize.trim().length > 40) return setError('Pack size must be 40 characters or fewer.')
    const price = parseRupees(priceInput)
    if (price === null) return setError('Enter a valid price, e.g. 120 or 120.50.')

    setBusy(true)
    if (product) {
      const { error: updateError } = await supabase
        .from('products')
        .update({
          title: title.trim(),
          category_id: categoryId,
          unit,
          pack_size: packSize.trim() || null,
          retail_price: price,
          description: description.trim() || null,
          image_path: imagePath,
          is_pinned: isPinned,
          active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id)
      if (updateError) {
        setError(updateError.message)
        setBusy(false)
        return
      }
    } else {
      const { error: insertError } = await supabase.from('products').insert({
        title: title.trim(),
        category_id: categoryId,
        unit,
        pack_size: packSize.trim() || null,
        retail_price: price,
        description: description.trim() || null,
        image_path: imagePath,
        is_pinned: isPinned,
        active,
      })
      if (insertError) {
        setError(insertError.message)
        setBusy(false)
        return
      }
    }
    setBusy(false)
    onSaved()
  }

  const preview = imageUrl(imagePath)

  return (
    <Modal
      title={product ? 'Edit product' : 'Add product'}
      subtitle="Pack size is a label for identification, not stock accounting."
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy || uploading}>
            {busy ? 'Saving…' : 'Save product'}
          </Button>
        </div>
      }
    >
      {error && <Notice tone="error">{error}</Notice>}
      <Field label="Title">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Fresh Milk" autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-[15px] max-sm:grid-cols-1">
        <Field label="Category">
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={categories.length === 0 ? 'Add a category first' : undefined} />
            </SelectTrigger>
            <SelectContent>
              {categories.length === 0 ? (
                <SelectItem value="_none" disabled>
                  Add a category first
                </SelectItem>
              ) : (
                categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Unit">
          <Select value={unit} onValueChange={(value) => setUnit(value as ProductUnit)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIT_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-[15px] max-sm:grid-cols-1">
        <Field label="Retail price (Rs)">
          <Input
            inputMode="decimal"
            value={priceInput}
            onChange={(event) => setPriceInput(event.target.value)}
            placeholder="120"
          />
        </Field>
        <Field label="Pack size (optional)">
          <Input
            value={packSize}
            onChange={(event) => setPackSize(event.target.value)}
            placeholder="500 ml, 1 L, 1 kg"
            maxLength={40}
          />
        </Field>
      </div>
      <p className="-mt-1.5 mb-3.5 text-[0.85rem] leading-[1.55] text-ink-3">
        Shown on the tile so a 500 ml pack and a 1 L pack do not look the same.
      </p>
      <Field label="Short description (optional)">
        <Input value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>

      <div className="mb-4">
        <span className="mb-[5px] block text-[0.8rem] font-semibold text-foreground">
          Image (optional, auto-compressed)
        </span>
        <div className="flex flex-wrap items-center gap-2.5">
          {preview ? (
            <img src={preview} alt="" className="h-[63px] w-[84px] rounded-lg border border-line object-cover" />
          ) : (
            <div className="grid h-[63px] w-[84px] place-items-center rounded-lg border border-line bg-surface-low bg-[radial-gradient(150px_100px_at_30%_20%,rgba(201,240,214,0.75),transparent_70%)] text-[1.2rem] font-extrabold tracking-[-0.03em] text-primary">
              {title.slice(0, 1) || '?'}
            </div>
          )}
          <Button variant="outline" size="sm" asChild>
            <label className="cursor-pointer">
              {uploading ? 'Uploading…' : preview ? 'Replace photo' : 'Upload photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
            </label>
          </Button>
          {imagePath && (
            <Button variant="ghost" size="sm" onClick={() => setImagePath(null)}>
              Remove
            </Button>
          )}
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
        <Label className="cursor-pointer gap-1.5 text-[0.86rem]">
          <input
            type="checkbox"
            className="size-[17px] cursor-pointer accent-primary"
            checked={isPinned}
            onChange={(event) => setIsPinned(event.target.checked)}
          />
          Pin to front
        </Label>
        <Label className="ml-auto cursor-pointer gap-1.5 text-[0.86rem]">
          <input
            type="checkbox"
            className="size-[17px] cursor-pointer accent-primary"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Active
        </Label>
      </div>
    </Modal>
  )
}

function CategoryForm({
  categories,
  onClose,
  onSaved,
}: {
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!name.trim()) return setError('Enter a category name.')
    setBusy(true)
    const { error: insertError } = await supabase
      .from('product_categories')
      .insert({ name: name.trim(), sort_order: categories.length })
    setBusy(false)
    if (insertError) return setError(insertError.message)
    setName('')
    onSaved()
  }

  return (
    <Modal
      title="Categories"
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      {error && <Notice tone="error">{error}</Notice>}
      <div className="mb-[18px] flex flex-wrap gap-2">
        {categories.map((cat) => (
          <span
            key={cat.id}
            className="inline-flex h-10 items-center gap-[7px] rounded-full border border-line-strong bg-white px-[17px] text-[0.88rem] font-semibold text-ink-2 shadow-xs"
          >
            {cat.name}
          </span>
        ))}
        {categories.length === 0 && <p className="text-[0.85rem] leading-[1.55] text-ink-3">No categories yet.</p>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2.5">
        <Input
          className="max-w-[220px]"
          placeholder="New category"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button onClick={add} disabled={busy}>
          Add
        </Button>
      </div>
      <p className="mt-3 text-[0.85rem] leading-[1.55] text-ink-3">
        New categories appear immediately on the counter and product form.
      </p>
    </Modal>
  )
}
