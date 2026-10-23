/** All money is expressed in rupees (NP), up to 2 decimals. */

export function formatRupees(amount: number): string {
  const value = Number(amount)
  return `Rs ${value.toLocaleString('en-IN', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

/** "123.50" | "123" -> 123.5 rupees. Returns null when invalid. */
export function parseRupees(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === '') return null
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const value = Number(trimmed)
  if (!Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

/** Rupees -> plain decimal string for form inputs. */
export function rupeesToInput(amount: number): string {
  return amount.toFixed(amount % 1 === 0 ? 0 : 2)
}

export function formatQty(quantity: number): string {
  return Number(quantity).toLocaleString('en-IN', { maximumFractionDigits: 3 })
}

export function lineTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100
}
