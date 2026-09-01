import { format, parseISO } from 'date-fns'

export function formatCurrency(amount: number, symbol = 'R'): string {
  const formatted = Math.abs(amount).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return amount < 0 ? `-${symbol} ${formatted}` : `${symbol} ${formatted}`
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

export function formatMonth(monthStr: string): string {
  try {
    return format(parseISO(monthStr + '-01'), 'MMM yyyy')
  } catch {
    return monthStr
  }
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
