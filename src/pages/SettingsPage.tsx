import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { store } from '@/lib/store'
import Badge from '@/components/ui/Badge'
import type { Category, Supplier } from '@/types/database'

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [catName, setCatName] = useState('')
  const [supName, setSupName] = useState('')
  const [supRelated, setSupRelated] = useState(false)

  async function load() {
    const [c, s] = await Promise.all([store.getCategories(), store.getSuppliers()])
    setCategories(c)
    setSuppliers(s)
  }

  useEffect(() => { load() }, [])

  async function addCategory() {
    if (!catName.trim()) return
    await store.addCategory({ name: catName.trim(), sort_order: categories.length })
    setCatName('')
    load()
  }

  async function addSupplier() {
    if (!supName.trim()) return
    await store.addSupplier({ name: supName.trim(), is_related_party: supRelated })
    setSupName('')
    setSupRelated(false)
    load()
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Categories</h2>
        <div className="flex gap-2 mb-3">
          <input value={catName} onChange={e => setCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="New category name" />
          <button onClick={addCategory} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700"><Plus size={16} /></button>
        </div>
        {categories.length === 0 ? (
          <p className="text-sm text-gray-400">No categories yet</p>
        ) : (
          <div className="space-y-1">
            {categories.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-700">{c.name}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Suppliers</h2>
        <div className="flex gap-2 mb-3 flex-wrap">
          <input value={supName} onChange={e => setSupName(e.target.value)} className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Supplier name" />
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input type="checkbox" checked={supRelated} onChange={e => setSupRelated(e.target.checked)} className="rounded" />
            Related party
          </label>
          <button onClick={addSupplier} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700"><Plus size={16} /></button>
        </div>
        {suppliers.length === 0 ? (
          <p className="text-sm text-gray-400">No suppliers yet</p>
        ) : (
          <div className="space-y-1">
            {suppliers.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">{s.name}</span>
                  {s.is_related_party && <Badge variant="warning">Related Party</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-amber-800 mb-1">Supabase Connection</h3>
        <p className="text-sm text-amber-700">
          This app currently stores data locally in your browser using IndexedDB. To enable cloud sync, multi-user access,
          and proper auth, set <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> in
          a <code className="bg-amber-100 px-1 rounded">.env</code> file.
        </p>
      </section>
    </div>
  )
}
