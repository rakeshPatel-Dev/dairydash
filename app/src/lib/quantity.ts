import type { ProductUnit } from './types'

export function isWeightUnit(unit: ProductUnit): boolean {
  return unit === 'kg'
}

export function gramsFromKg(quantity: number): number {
  return Math.round(quantity * 1000)
}

export function kgFromGramsInput(input: string): string {
  if (input.trim() === '') return ''
  const grams = Number(input)
  if (!Number.isFinite(grams)) return ''
  return String(Math.round(grams) / 1000)
}

export function gramsInputFromKg(quantity: number): string {
  return String(gramsFromKg(quantity))
}

export function formatSoldQuantity(quantity: number, unit: ProductUnit): string {
  return isWeightUnit(unit)
    ? `${gramsFromKg(quantity).toLocaleString('en-IN')} g`
    : `${quantity.toLocaleString('en-IN', { maximumFractionDigits: 3 })} ${unit}`
}
