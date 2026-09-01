import { useEffect, useState } from 'react'
import { ShieldAlert, AlertTriangle, Info, CheckCircle } from 'lucide-react'
import { store } from '@/lib/store'
import { formatDate } from '@/lib/format'
import Badge from '@/components/ui/Badge'
import type { ComplianceFlag } from '@/types/database'

export default function Compliance() {
  const [flags, setFlags] = useState<ComplianceFlag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    store.getOpenFlags().then(f => { setFlags(f); setLoading(false) })
  }, [])

  const breaches = flags.filter(f => f.severity === 'breach')
  const errors = flags.filter(f => f.severity === 'error')
  const warnings = flags.filter(f => f.severity === 'warning')

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`rounded-xl border p-4 ${breaches.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert size={18} className={breaches.length > 0 ? 'text-red-600' : 'text-gray-400'} />
            <span className="text-sm font-medium text-gray-700">Breaches</span>
          </div>
          <p className={`text-3xl font-bold ${breaches.length > 0 ? 'text-red-700' : 'text-gray-300'}`}>{breaches.length}</p>
        </div>
        <div className={`rounded-xl border p-4 ${errors.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={18} className={errors.length > 0 ? 'text-amber-600' : 'text-gray-400'} />
            <span className="text-sm font-medium text-gray-700">Errors</span>
          </div>
          <p className={`text-3xl font-bold ${errors.length > 0 ? 'text-amber-700' : 'text-gray-300'}`}>{errors.length}</p>
        </div>
        <div className={`rounded-xl border p-4 ${warnings.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Info size={18} className={warnings.length > 0 ? 'text-yellow-600' : 'text-gray-400'} />
            <span className="text-sm font-medium text-gray-700">Warnings</span>
          </div>
          <p className={`text-3xl font-bold ${warnings.length > 0 ? 'text-yellow-700' : 'text-gray-300'}`}>{warnings.length}</p>
        </div>
      </div>

      {flags.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <CheckCircle size={48} className="mx-auto text-green-400 mb-3" />
          <p className="text-lg font-medium text-gray-700">All clear</p>
          <p className="text-sm text-gray-400 mt-1">No open compliance flags</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map(f => (
            <div key={f.id} className={`bg-white rounded-xl border p-4 ${f.severity === 'breach' ? 'border-red-200' : f.severity === 'error' ? 'border-amber-200' : 'border-yellow-200'}`}>
              <div className="flex items-start gap-3">
                {f.severity === 'breach' ? <ShieldAlert size={18} className="text-red-500 mt-0.5 shrink-0" /> : f.severity === 'error' ? <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" /> : <Info size={18} className="text-yellow-500 mt-0.5 shrink-0" />}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-gray-400">{f.rule_code}</span>
                    <Badge variant={f.severity === 'breach' ? 'danger' : f.severity === 'error' ? 'warning' : 'neutral'}>{f.severity}</Badge>
                  </div>
                  <p className="text-sm text-gray-800">{f.message}</p>
                  <p className="text-xs text-gray-400 mt-1">Raised {formatDate(f.raised_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
