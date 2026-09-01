import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { store } from '@/lib/store'
import { formatCurrency, formatMonth } from '@/lib/format'
import type { FundingType } from '@/types/database'

interface BalanceRow {
  month: string
  funder_name: string
  funding_type: FundingType
  opening: number
  income: number
  expenditure: number
  closing: number
}

export default function Balances() {
  const [rows, setRows] = useState<BalanceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    store.getFundBalances().then(r => { setRows(r); setLoading(false) })
  }, [])

  const months = [...new Set(rows.map(r => r.month))].sort()

  const monthSummaries = months.map(m => {
    const monthRows = rows.filter(r => r.month === m)
    const restricted = monthRows.filter(r => r.funding_type === 'restricted').reduce((s, r) => s + r.closing, 0)
    const unrestricted = monthRows.filter(r => r.funding_type === 'unrestricted').reduce((s, r) => s + r.closing, 0)
    return { month: m, restricted, unrestricted, total: restricted + unrestricted, breach: unrestricted < 0 }
  })

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Fund Balances</h1>

      {rows.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400">No transactions recorded yet. Balances will appear once you add income and expenditure.</p>
        </div>
      ) : (
        <>
          {/* Monthly summary */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Month</th>
                  <th className="px-4 py-3 font-medium text-right">Restricted</th>
                  <th className="px-4 py-3 font-medium text-right">Unrestricted</th>
                  <th className="px-4 py-3 font-medium text-right">Total Balance</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthSummaries.map(s => (
                  <tr key={s.month} className={s.breach ? 'bg-red-50' : ''}>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatMonth(s.month)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(s.restricted)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${s.unrestricted < 0 ? 'text-red-600' : ''}`}>{formatCurrency(s.unrestricted)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(s.total)}</td>
                    <td className="px-4 py-3">
                      {s.breach ? (
                        <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium">
                          <ShieldAlert size={14} />
                          Restricted floor breached
                        </div>
                      ) : (
                        <span className="text-xs text-green-600 font-medium">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {monthSummaries.some(s => s.breach) && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <ShieldAlert size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Restricted Floor Breach Detected</p>
                <p className="text-sm text-red-700 mt-1">
                  The unrestricted balance has gone negative, which means restricted funds are being used
                  to cover unrestricted costs. The total bank balance may still look healthy, but the
                  restricted portion of those funds is being consumed improperly.
                </p>
              </div>
            </div>
          )}

          {/* Detail by funder */}
          <h2 className="text-lg font-semibold text-gray-800">Detail by Funder</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Month</th>
                  <th className="px-4 py-3 font-medium">Funder</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium text-right">Opening</th>
                  <th className="px-4 py-3 font-medium text-right">Income</th>
                  <th className="px-4 py-3 font-medium text-right">Expenditure</th>
                  <th className="px-4 py-3 font-medium text-right">Closing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-gray-600">{formatMonth(r.month)}</td>
                    <td className="px-4 py-3 text-gray-900">{r.funder_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.funding_type}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(r.opening)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(r.income)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(r.expenditure)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${r.closing < 0 ? 'text-red-600' : ''}`}>{formatCurrency(r.closing)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
