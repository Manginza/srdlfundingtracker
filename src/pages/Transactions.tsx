import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Filter, Download } from 'lucide-react'
import { store } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/format'
import Badge from '@/components/ui/Badge'
import TransactionForm from '@/components/TransactionForm'
import type { Transaction, Funder, TxnStatus, Direction } from '@/types/database'
import * as XLSX from 'xlsx'

export default function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [txns, setTxns] = useState<Transaction[]>([])
  const [funders, setFunders] = useState<Funder[]>([])
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1')
  const [editTxn, setEditTxn] = useState<Transaction | undefined>()
  const [filterFunder, setFilterFunder] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDirection, setFilterDirection] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [t, f] = await Promise.all([
      store.getTransactions({
        funder_id: filterFunder || undefined,
        status: (filterStatus || undefined) as TxnStatus | undefined,
        direction: (filterDirection || undefined) as Direction | undefined,
      }),
      store.getFunders(),
    ])
    setTxns(t)
    setFunders(f)
    setLoading(false)
  }, [filterFunder, filterStatus, filterDirection])

  useEffect(() => { load() }, [load])

  function handleSaved() {
    setShowForm(false)
    setEditTxn(undefined)
    setSearchParams({})
    load()
  }

  function handleExport() {
    const data = txns.map(t => ({
      Date: t.txn_date,
      Direction: t.direction,
      Amount: t.amount,
      Description: t.description,
      Funder: t.funder?.name ?? '',
      Status: t.status,
      'Bank Ref': t.bank_reference ?? '',
      'Payment Method': t.payment_method ?? '',
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions')
    XLSX.writeFile(wb, 'transactions.xlsx')
  }

  const statusBadge = (s: TxnStatus) => {
    const v = { draft: 'neutral', submitted: 'info', approved: 'success', rejected: 'danger', void: 'neutral' } as const
    return <Badge variant={v[s]}>{s}</Badge>
  }

  if (showForm || editTxn) {
    return <TransactionForm transaction={editTxn} onSaved={handleSaved} onCancel={() => { setShowForm(false); setEditTxn(undefined); setSearchParams({}) }} />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
            <Download size={16} /> Export
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
            <Plus size={16} /> New Transaction
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap bg-white border border-gray-200 rounded-lg p-3">
        <Filter size={16} className="text-gray-400" />
        <select value={filterDirection} onChange={e => setFilterDirection(e.target.value)} className="border border-gray-200 rounded-md px-2 py-1.5 text-sm">
          <option value="">All directions</option>
          <option value="in">Income</option>
          <option value="out">Expenditure</option>
        </select>
        <select value={filterFunder} onChange={e => setFilterFunder(e.target.value)} className="border border-gray-200 rounded-md px-2 py-1.5 text-sm">
          <option value="">All funders</option>
          {funders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-md px-2 py-1.5 text-sm">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <p className="text-center py-12 text-gray-400">Loading...</p>
      ) : txns.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 mb-3">No transactions yet</p>
          <button onClick={() => setShowForm(true)} className="text-primary-600 text-sm font-medium hover:text-primary-700">
            Create your first transaction
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Funder</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {txns.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setEditTxn(t)}>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDate(t.txn_date)}</td>
                  <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{t.description}</td>
                  <td className="px-4 py-3 text-gray-600">{t.funder?.name ?? '—'}</td>
                  <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${t.direction === 'in' ? 'text-green-600' : 'text-gray-900'}`}>
                    {t.direction === 'in' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-3">{statusBadge(t.status)}</td>
                  <td className="px-4 py-3">
                    {(t.compliance_flags?.filter(f => !f.resolved_at).length ?? 0) > 0 && (
                      <Badge variant="danger">{t.compliance_flags!.filter(f => !f.resolved_at).length}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
