import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Camera, Paperclip, X, ShieldAlert, AlertTriangle, Info } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { store } from '@/lib/store'
import { formatCurrency, todayISO } from '@/lib/format'
import type { Transaction, Funder, Grant, BudgetLine, Category, Supplier, Attachment, AttachmentKind } from '@/types/database'

const schema = z.object({
  txn_date: z.string().min(1, 'Date is required'),
  direction: z.enum(['in', 'out']),
  amount: z.coerce.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  bank_reference: z.string().optional(),
  funder_id: z.string().optional(),
  grant_id: z.string().optional(),
  budget_line_id: z.string().optional(),
  category_id: z.string().optional(),
  supplier_id: z.string().optional(),
  payment_method: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  transaction?: Transaction
  onSaved: () => void
  onCancel: () => void
}

interface PendingAttachment {
  file: File
  kind: AttachmentKind
  preview?: string
  compressed?: Blob
  originalSize: number
  compressedSize?: number
}

export default function TransactionForm({ transaction, onSaved, onCancel }: Props) {
  const [funders, setFunders] = useState<Funder[]>([])
  const [grants, setGrants] = useState<Grant[]>([])
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([])
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: transaction ? {
      txn_date: transaction.txn_date,
      direction: transaction.direction,
      amount: transaction.amount,
      description: transaction.description,
      bank_reference: transaction.bank_reference ?? '',
      funder_id: transaction.funder_id ?? '',
      grant_id: transaction.grant_id ?? '',
      budget_line_id: transaction.budget_line_id ?? '',
      category_id: transaction.category_id ?? '',
      supplier_id: transaction.supplier_id ?? '',
      payment_method: transaction.payment_method ?? '',
    } : {
      txn_date: todayISO(),
      direction: 'out' as const,
      amount: 0,
      description: '',
    },
  })

  const watchFunder = watch('funder_id')
  const watchGrant = watch('grant_id')
  const watchDirection = watch('direction')

  useEffect(() => {
    async function load() {
      const [f, g, c, s] = await Promise.all([
        store.getFunders(), store.getGrants(), store.getCategories(), store.getSuppliers(),
      ])
      setFunders(f)
      setGrants(g)
      setCategories(c)
      setSuppliers(s)
      if (transaction) {
        const att = await store.getAttachments(transaction.id)
        setExistingAttachments(att)
      }
    }
    load()
  }, [transaction])

  useEffect(() => {
    if (watchGrant) {
      store.getBudgetLines(watchGrant).then(setBudgetLines)
    } else {
      setBudgetLines([])
    }
  }, [watchGrant])

  const selectedFunder = funders.find(f => f.id === watchFunder)
  const isRestricted = selectedFunder?.funding_type === 'restricted'
  const funderGrants = grants.filter(g => g.funder_id === watchFunder)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      const pending: PendingAttachment = { file, kind: 'receipt', originalSize: file.size }
      if (file.type.startsWith('image/')) {
        try {
          const compressed = await imageCompression(file, { maxWidthOrHeight: 1600, maxSizeMB: 0.5, initialQuality: 0.8, useWebWorker: true })
          pending.compressed = compressed
          pending.compressedSize = compressed.size
          pending.preview = URL.createObjectURL(compressed)
        } catch {
          pending.preview = URL.createObjectURL(file)
        }
      }
      setPendingAttachments(prev => [...prev, pending])
    }
    e.target.value = ''
  }

  function removePending(idx: number) {
    setPendingAttachments(prev => {
      const copy = [...prev]
      if (copy[idx].preview) URL.revokeObjectURL(copy[idx].preview!)
      copy.splice(idx, 1)
      return copy
    })
  }

  async function removeExisting(id: string) {
    await store.deleteAttachment(id)
    setExistingAttachments(prev => prev.filter(a => a.id !== id))
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    try {
      let txnId: string
      if (transaction) {
        await store.updateTransaction(transaction.id, {
          ...data,
          funder_id: data.funder_id || null,
          grant_id: data.grant_id || null,
          budget_line_id: data.budget_line_id || null,
          category_id: data.category_id || null,
          supplier_id: data.supplier_id || null,
          payment_method: (data.payment_method || null) as Transaction['payment_method'],
        })
        txnId = transaction.id
      } else {
        const txn = await store.addTransaction({
          ...data,
          funder_id: data.funder_id || undefined,
          grant_id: data.grant_id || undefined,
          budget_line_id: data.budget_line_id || undefined,
          category_id: data.category_id || undefined,
          supplier_id: data.supplier_id || undefined,
          payment_method: (data.payment_method || undefined) as Transaction['payment_method'],
        })
        txnId = txn.id
      }

      for (const pa of pendingAttachments) {
        await store.addAttachment({
          transaction_id: txnId,
          kind: pa.kind,
          original_filename: pa.file.name,
          mime_type: pa.file.type,
          byte_size: pa.compressedSize ?? pa.originalSize,
          blob: pa.compressed ?? pa.file,
        })
      }

      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Back to transactions
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          {transaction ? 'Edit Transaction' : 'New Transaction'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Fund source — the most important choice */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Which fund is paying / receiving?</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button type="button" onClick={() => setValue('funder_id', '')}
                className={`p-3 rounded-lg border text-sm font-medium text-center transition-colors ${!watchFunder ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                Unallocated
              </button>
              {funders.map(f => (
                <button key={f.id} type="button" onClick={() => { setValue('funder_id', f.id); if (funderGrants.length === 0) setValue('grant_id', '') }}
                  className={`p-3 rounded-lg border text-sm font-medium text-center transition-colors ${watchFunder === f.id ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {f.name}
                  <span className={`block text-xs mt-0.5 ${f.funding_type === 'restricted' ? 'text-amber-600' : 'text-gray-400'}`}>
                    {f.funding_type}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Grant + budget line (restricted) */}
          {isRestricted && funderGrants.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grant</label>
                <select {...register('grant_id')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select grant...</option>
                  {funderGrants.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              </div>
              {watchGrant && budgetLines.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Line</label>
                  <select {...register('budget_line_id')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select line...</option>
                    {budgetLines.map(bl => (
                      <option key={bl.id} value={bl.id}>
                        {bl.code} {bl.name} — {formatCurrency(bl.remaining ?? bl.approved_amount)} left
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Direction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Direction</label>
            <div className="flex gap-2">
              {(['in', 'out'] as const).map(d => (
                <button key={d} type="button" onClick={() => setValue('direction', d)}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${watchDirection === d ? (d === 'in' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-400 bg-red-50 text-red-700') : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {d === 'in' ? 'Income' : 'Expenditure'}
                </button>
              ))}
            </div>
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (R)</label>
              <input type="number" step="0.01" {...register('amount')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" {...register('txn_date')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              {errors.txn_date && <p className="text-xs text-red-500 mt-1">{errors.txn_date.message}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input type="text" {...register('description')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="What is this payment for?" />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>

          {/* Category, Supplier, Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select {...register('category_id')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">None</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <select {...register('supplier_id')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">None</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}{s.is_related_party ? ' (Related)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select {...register('payment_method')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Select...</option>
                <option value="eft">EFT</option>
                <option value="debit_card">Debit Card</option>
                <option value="cash">Cash</option>
                <option value="petty_cash">Petty Cash</option>
                <option value="bank_charge">Bank Charge</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Bank reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Reference</label>
            <input type="text" {...register('bank_reference')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Optional" />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Evidence / Attachments</label>
            <div className="flex gap-2 mb-3">
              <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                <Camera size={16} />
                Take Photo
                <input type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
              </label>
              <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                <Paperclip size={16} />
                Attach File
                <input type="file" accept="image/*,application/pdf" multiple onChange={handleFileSelect} className="hidden" />
              </label>
            </div>

            {existingAttachments.length > 0 && (
              <div className="space-y-2 mb-3">
                {existingAttachments.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600 truncate">{a.original_filename}</span>
                    <button type="button" onClick={() => removeExisting(a.id)} className="text-gray-400 hover:text-red-500">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {pendingAttachments.length > 0 && (
              <div className="space-y-2">
                {pendingAttachments.map((pa, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                    {pa.preview && <img src={pa.preview} alt="" className="w-10 h-10 rounded object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{pa.file.name}</p>
                      {pa.compressedSize && (
                        <p className="text-xs text-gray-500">
                          {(pa.originalSize / 1024).toFixed(0)}KB → {(pa.compressedSize / 1024).toFixed(0)}KB
                        </p>
                      )}
                      <select value={pa.kind} onChange={e => {
                        setPendingAttachments(prev => { const copy = [...prev]; copy[idx] = { ...copy[idx], kind: e.target.value as AttachmentKind }; return copy })
                      }} className="mt-1 text-xs border border-gray-200 rounded px-1.5 py-0.5">
                        <option value="receipt">Receipt</option>
                        <option value="invoice">Invoice</option>
                        <option value="proof_of_payment">Proof of Payment</option>
                        <option value="quotation">Quotation</option>
                        <option value="contract">Contract</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <button type="button" onClick={() => removePending(idx)} className="text-gray-400 hover:text-red-500">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live compliance feedback */}
          {transaction?.compliance_flags && transaction.compliance_flags.filter(f => !f.resolved_at).length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Compliance Issues</p>
              {transaction.compliance_flags.filter(f => !f.resolved_at).map(f => (
                <div key={f.id} className={`flex items-start gap-2 p-3 rounded-lg ${f.severity === 'breach' ? 'bg-red-50 border border-red-200' : f.severity === 'error' ? 'bg-amber-50 border border-amber-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                  {f.severity === 'breach' ? <ShieldAlert size={16} className="text-red-500 mt-0.5" /> : f.severity === 'error' ? <AlertTriangle size={16} className="text-amber-500 mt-0.5" /> : <Info size={16} className="text-yellow-600 mt-0.5" />}
                  <p className="text-sm">{f.message}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Saving...' : transaction ? 'Update Transaction' : 'Save Transaction'}
            </button>
            <button type="button" onClick={onCancel} className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
