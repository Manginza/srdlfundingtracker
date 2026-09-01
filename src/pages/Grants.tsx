import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { store } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/format'
import Badge from '@/components/ui/Badge'
import type { Funder, Grant, BudgetLine, FundingType, BudgetLineType } from '@/types/database'

export default function Grants() {
  const [funders, setFunders] = useState<Funder[]>([])
  const [grants, setGrants] = useState<Grant[]>([])
  const [expandedGrant, setExpandedGrant] = useState<string | null>(null)
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([])
  const [showFunderForm, setShowFunderForm] = useState(false)
  const [showGrantForm, setShowGrantForm] = useState(false)
  const [showBudgetForm, setShowBudgetForm] = useState<string | null>(null)

  const [funderName, setFunderName] = useState('')
  const [funderType, setFunderType] = useState<FundingType>('unrestricted')
  const [grantTitle, setGrantTitle] = useState('')
  const [grantFunder, setGrantFunder] = useState('')
  const [grantAmount, setGrantAmount] = useState('')
  const [grantProject, setGrantProject] = useState('')

  const [blCode, setBlCode] = useState('')
  const [blName, setBlName] = useState('')
  const [blType, setBlType] = useState<BudgetLineType>('operational')
  const [blAmount, setBlAmount] = useState('')

  async function load() {
    const [f, g] = await Promise.all([store.getFunders(), store.getGrants()])
    setFunders(f)
    setGrants(g)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (expandedGrant) {
      store.getBudgetLines(expandedGrant).then(setBudgetLines)
    }
  }, [expandedGrant])

  async function addFunder() {
    if (!funderName.trim()) return
    await store.addFunder({ name: funderName.trim(), funding_type: funderType })
    setFunderName('')
    setShowFunderForm(false)
    load()
  }

  async function deleteFunder(id: string) {
    await store.deleteFunder(id)
    load()
  }

  async function addGrant() {
    if (!grantTitle.trim() || !grantFunder || !grantAmount) return
    await store.addGrant({ funder_id: grantFunder, title: grantTitle.trim(), total_amount: parseFloat(grantAmount), project_number: grantProject || undefined })
    setGrantTitle('')
    setGrantAmount('')
    setGrantProject('')
    setShowGrantForm(false)
    load()
  }

  async function deleteGrant(id: string) {
    await store.deleteGrant(id)
    if (expandedGrant === id) setExpandedGrant(null)
    load()
  }

  async function addBudgetLine(grantId: string) {
    if (!blCode.trim() || !blName.trim() || !blAmount) return
    const existing = await store.getBudgetLines(grantId)
    await store.addBudgetLine({ grant_id: grantId, code: blCode.trim(), name: blName.trim(), line_type: blType, approved_amount: parseFloat(blAmount), sort_order: existing.length })
    setBlCode('')
    setBlName('')
    setBlAmount('')
    setShowBudgetForm(null)
    store.getBudgetLines(grantId).then(setBudgetLines)
    load()
  }

  function toggleGrant(id: string) {
    setExpandedGrant(prev => prev === id ? null : id)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Grants & Funders</h1>

      {/* Funders */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Funders</h2>
          <button onClick={() => setShowFunderForm(!showFunderForm)} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
            <Plus size={16} /> Add Funder
          </button>
        </div>

        {showFunderForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-3 flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <input value={funderName} onChange={e => setFunderName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Funder name" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select value={funderType} onChange={e => setFunderType(e.target.value as FundingType)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="unrestricted">Unrestricted</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
            <button onClick={addFunder} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">Add</button>
            <button onClick={() => setShowFunderForm(false)} className="text-gray-500 text-sm hover:text-gray-700">Cancel</button>
          </div>
        )}

        {funders.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-lg border border-gray-200 p-6 text-center">No funders added yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {funders.map(f => (
              <div key={f.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{f.name}</p>
                  <Badge variant={f.funding_type === 'restricted' ? 'warning' : 'info'}>{f.funding_type}</Badge>
                </div>
                <button onClick={() => deleteFunder(f.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Grants */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Grants</h2>
          <button onClick={() => setShowGrantForm(!showGrantForm)} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
            <Plus size={16} /> Add Grant
          </button>
        </div>

        {showGrantForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Funder</label>
                <select value={grantFunder} onChange={e => setGrantFunder(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select funder...</option>
                  {funders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Project Number</label>
                <input value={grantProject} onChange={e => setGrantProject(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Title</label>
                <input value={grantTitle} onChange={e => setGrantTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Grant title" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Total Amount (R)</label>
                <input type="number" step="0.01" value={grantAmount} onChange={e => setGrantAmount(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addGrant} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">Add Grant</button>
              <button onClick={() => setShowGrantForm(false)} className="text-gray-500 text-sm hover:text-gray-700">Cancel</button>
            </div>
          </div>
        )}

        {grants.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-lg border border-gray-200 p-6 text-center">No grants added yet</p>
        ) : (
          <div className="space-y-3">
            {grants.map(g => {
              const totalBudget = g.budget_lines?.reduce((s, bl) => s + bl.approved_amount, 0) ?? 0
              const isExpanded = expandedGrant === g.id
              return (
                <div key={g.id} className="bg-white rounded-lg border border-gray-200">
                  <div className="p-4 flex items-start justify-between cursor-pointer" onClick={() => toggleGrant(g.id)}>
                    <div className="flex items-start gap-2">
                      {isExpanded ? <ChevronDown size={18} className="text-gray-400 mt-0.5" /> : <ChevronRight size={18} className="text-gray-400 mt-0.5" />}
                      <div>
                        <p className="font-medium text-gray-900">{g.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                          <span>{g.funder?.name}</span>
                          {g.project_number && <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{g.project_number}</span>}
                          <span className="font-medium">{formatCurrency(g.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteGrant(g.id) }} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-700">Budget Lines</h3>
                        <button onClick={() => setShowBudgetForm(showBudgetForm === g.id ? null : g.id)} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                          <Plus size={14} /> Add Line
                        </button>
                      </div>

                      {showBudgetForm === g.id && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-3 flex items-end gap-2 flex-wrap">
                          <div className="w-20">
                            <label className="block text-xs text-gray-500 mb-1">Code</label>
                            <input value={blCode} onChange={e => setBlCode(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="S1" />
                          </div>
                          <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs text-gray-500 mb-1">Name</label>
                            <input value={blName} onChange={e => setBlName(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                          </div>
                          <div className="w-28">
                            <label className="block text-xs text-gray-500 mb-1">Type</label>
                            <select value={blType} onChange={e => setBlType(e.target.value as BudgetLineType)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                              <option value="staff">Staff</option>
                              <option value="operational">Operational</option>
                            </select>
                          </div>
                          <div className="w-32">
                            <label className="block text-xs text-gray-500 mb-1">Amount (R)</label>
                            <input type="number" step="0.01" value={blAmount} onChange={e => setBlAmount(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                          </div>
                          <button onClick={() => addBudgetLine(g.id)} className="bg-primary-600 text-white px-3 py-1.5 rounded text-sm hover:bg-primary-700">Add</button>
                        </div>
                      )}

                      {budgetLines.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-3">No budget lines</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-500 text-xs border-b border-gray-100">
                                <th className="pb-2 font-medium">Code</th>
                                <th className="pb-2 font-medium">Name</th>
                                <th className="pb-2 font-medium">Type</th>
                                <th className="pb-2 font-medium text-right">Approved</th>
                                <th className="pb-2 font-medium text-right">Spent</th>
                                <th className="pb-2 font-medium text-right">Remaining</th>
                                <th className="pb-2 font-medium text-right">%</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {budgetLines.map(bl => {
                                const pct = bl.approved_amount > 0 ? ((bl.spent ?? 0) / bl.approved_amount * 100) : 0
                                return (
                                  <tr key={bl.id}>
                                    <td className="py-2 font-mono text-xs text-gray-500">{bl.code}</td>
                                    <td className="py-2 text-gray-900">{bl.name}</td>
                                    <td className="py-2"><Badge variant={bl.line_type === 'staff' ? 'info' : 'neutral'}>{bl.line_type}</Badge></td>
                                    <td className="py-2 text-right">{formatCurrency(bl.approved_amount)}</td>
                                    <td className="py-2 text-right">{formatCurrency(bl.spent ?? 0)}</td>
                                    <td className={`py-2 text-right font-medium ${(bl.remaining ?? 0) < 0 ? 'text-red-600' : ''}`}>{formatCurrency(bl.remaining ?? bl.approved_amount)}</td>
                                    <td className="py-2 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                          <div className={`h-full rounded-full ${pct > 100 ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-primary-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                        </div>
                                        <span className="text-xs text-gray-500 w-10 text-right">{pct.toFixed(0)}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-gray-200 font-medium">
                                <td colSpan={3} className="py-2 text-gray-700">Total</td>
                                <td className="py-2 text-right">{formatCurrency(totalBudget)}</td>
                                <td className="py-2 text-right">{formatCurrency(budgetLines.reduce((s, bl) => s + (bl.spent ?? 0), 0))}</td>
                                <td className="py-2 text-right">{formatCurrency(budgetLines.reduce((s, bl) => s + (bl.remaining ?? bl.approved_amount), 0))}</td>
                                <td />
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
