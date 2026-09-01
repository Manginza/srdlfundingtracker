import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, Wallet, ShieldAlert, AlertTriangle, Clock, ArrowRight } from 'lucide-react'
import { store } from '@/lib/store'
import { formatCurrency } from '@/lib/format'
import StatCard from '@/components/ui/StatCard'
import Badge from '@/components/ui/Badge'
import type { ComplianceFlag } from '@/types/database'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalIncome: 0, totalExpenditure: 0, balance: 0,
    restrictedBalance: 0, unrestrictedBalance: 0,
    openBreaches: 0, openWarnings: 0, pendingApproval: 0, totalTransactions: 0,
  })
  const [flags, setFlags] = useState<ComplianceFlag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [s, f] = await Promise.all([store.getDashboardStats(), store.getOpenFlags()])
      setStats(s)
      setFlags(f.slice(0, 5))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link to="/transactions?new=1" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
          + New Transaction
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Income" value={formatCurrency(stats.totalIncome)} icon={TrendingUp} color="green" />
        <StatCard label="Total Expenditure" value={formatCurrency(stats.totalExpenditure)} icon={TrendingDown} color="red" />
        <StatCard label="Net Balance" value={formatCurrency(stats.balance)} icon={Wallet} color="blue" />
        <StatCard label="Pending Approval" value={String(stats.pendingApproval)} icon={Clock} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fund Balances</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Restricted Funds</span>
              <span className="text-lg font-bold text-blue-700">{formatCurrency(stats.restrictedBalance)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Unrestricted Funds</span>
              <span className={`text-lg font-bold ${stats.unrestrictedBalance < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                {formatCurrency(stats.unrestrictedBalance)}
              </span>
            </div>
            {stats.unrestrictedBalance < 0 && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <ShieldAlert size={18} className="text-red-600 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">
                  Unrestricted balance is negative. Restricted funds may be covering unrestricted costs.
                </p>
              </div>
            )}
          </div>
          <Link to="/balances" className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-4 font-medium">
            View details <ArrowRight size={14} />
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Compliance Flags</h2>
            {stats.openBreaches > 0 && <Badge variant="danger">{stats.openBreaches} breach{stats.openBreaches > 1 ? 'es' : ''}</Badge>}
          </div>
          {flags.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No open compliance flags</p>
          ) : (
            <div className="space-y-2">
              {flags.map(f => (
                <div key={f.id} className={`flex items-start gap-2 p-3 rounded-lg ${f.severity === 'breach' ? 'bg-red-50' : f.severity === 'error' ? 'bg-amber-50' : 'bg-yellow-50'}`}>
                  {f.severity === 'breach' ? <ShieldAlert size={16} className="text-red-500 mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />}
                  <div>
                    <p className="text-xs font-mono text-gray-500">{f.rule_code}</p>
                    <p className="text-sm text-gray-700">{f.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link to="/compliance" className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-4 font-medium">
            View all <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}
