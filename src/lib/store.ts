import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  Funder, Grant, BudgetLine, Tranche, Category, Supplier,
  Transaction, Attachment, ComplianceFlag, Direction, TxnStatus,
  PaymentMethod, AttachmentKind, FundingType, BudgetLineType, FlagSeverity,
} from '@/types/database'

interface FundingTrackerDB extends DBSchema {
  funders: { key: string; value: Funder; indexes: { 'by-org': string } }
  grants: { key: string; value: Grant; indexes: { 'by-org': string; 'by-funder': string } }
  budget_lines: { key: string; value: BudgetLine; indexes: { 'by-grant': string } }
  tranches: { key: string; value: Tranche; indexes: { 'by-grant': string } }
  categories: { key: string; value: Category; indexes: { 'by-org': string } }
  suppliers: { key: string; value: Supplier; indexes: { 'by-org': string } }
  transactions: { key: string; value: Transaction; indexes: { 'by-org': string; 'by-funder': string; 'by-grant': string } }
  attachments: { key: string; value: Attachment & { blob?: Blob }; indexes: { 'by-transaction': string } }
  compliance_flags: { key: string; value: ComplianceFlag; indexes: { 'by-transaction': string } }
  pending_sync: { key: string; value: { id: string; table: string; data: unknown; created_at: string } }
}

let dbInstance: IDBPDatabase<FundingTrackerDB> | null = null

async function getDB() {
  if (dbInstance) return dbInstance
  dbInstance = await openDB<FundingTrackerDB>('funding-tracker', 1, {
    upgrade(db) {
      const funders = db.createObjectStore('funders', { keyPath: 'id' })
      funders.createIndex('by-org', 'org_id')

      const grants = db.createObjectStore('grants', { keyPath: 'id' })
      grants.createIndex('by-org', 'org_id')
      grants.createIndex('by-funder', 'funder_id')

      const bl = db.createObjectStore('budget_lines', { keyPath: 'id' })
      bl.createIndex('by-grant', 'grant_id')

      const tr = db.createObjectStore('tranches', { keyPath: 'id' })
      tr.createIndex('by-grant', 'grant_id')

      const cat = db.createObjectStore('categories', { keyPath: 'id' })
      cat.createIndex('by-org', 'org_id')

      const sup = db.createObjectStore('suppliers', { keyPath: 'id' })
      sup.createIndex('by-org', 'org_id')

      const txn = db.createObjectStore('transactions', { keyPath: 'id' })
      txn.createIndex('by-org', 'org_id')
      txn.createIndex('by-funder', 'funder_id')
      txn.createIndex('by-grant', 'grant_id')

      const att = db.createObjectStore('attachments', { keyPath: 'id' })
      att.createIndex('by-transaction', 'transaction_id')

      const flags = db.createObjectStore('compliance_flags', { keyPath: 'id' })
      flags.createIndex('by-transaction', 'transaction_id')

      db.createObjectStore('pending_sync', { keyPath: 'id' })
    },
  })
  return dbInstance
}

function uid(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

const ORG_ID = 'default-org'

export const store = {
  // Funders
  async getFunders(): Promise<Funder[]> {
    const db = await getDB()
    return db.getAllFromIndex('funders', 'by-org', ORG_ID)
  },
  async addFunder(data: { name: string; funding_type: FundingType; agreement_ref?: string; contact_email?: string; notes?: string }): Promise<Funder> {
    const db = await getDB()
    const funder: Funder = { id: uid(), org_id: ORG_ID, name: data.name, funding_type: data.funding_type, agreement_ref: data.agreement_ref ?? null, contact_email: data.contact_email ?? null, notes: data.notes ?? null, created_at: now() }
    await db.put('funders', funder)
    return funder
  },
  async deleteFunder(id: string) {
    const db = await getDB()
    await db.delete('funders', id)
  },

  // Grants
  async getGrants(): Promise<Grant[]> {
    const db = await getDB()
    const grants = await db.getAllFromIndex('grants', 'by-org', ORG_ID)
    for (const g of grants) {
      g.budget_lines = await db.getAllFromIndex('budget_lines', 'by-grant', g.id)
      g.tranches = await db.getAllFromIndex('tranches', 'by-grant', g.id)
      const funders = await db.getAll('funders')
      g.funder = funders.find(f => f.id === g.funder_id)
    }
    return grants
  },
  async getGrant(id: string): Promise<Grant | undefined> {
    const db = await getDB()
    const g = await db.get('grants', id)
    if (!g) return undefined
    g.budget_lines = await db.getAllFromIndex('budget_lines', 'by-grant', g.id)
    g.tranches = await db.getAllFromIndex('tranches', 'by-grant', g.id)
    const funders = await db.getAll('funders')
    g.funder = funders.find(f => f.id === g.funder_id)
    return g
  },
  async addGrant(data: { funder_id: string; title: string; project_number?: string; total_amount: number; signed_date?: string; commencement_date?: string; period_months?: number }): Promise<Grant> {
    const db = await getDB()
    const grant: Grant = { id: uid(), org_id: ORG_ID, funder_id: data.funder_id, project_number: data.project_number ?? null, title: data.title, total_amount: data.total_amount, signed_date: data.signed_date ?? null, commencement_date: data.commencement_date ?? null, period_months: data.period_months ?? null, created_at: now() }
    await db.put('grants', grant)
    return grant
  },
  async deleteGrant(id: string) {
    const db = await getDB()
    await db.delete('grants', id)
  },

  // Budget Lines
  async getBudgetLines(grantId: string): Promise<BudgetLine[]> {
    const db = await getDB()
    const lines = await db.getAllFromIndex('budget_lines', 'by-grant', grantId)
    const txns = await db.getAllFromIndex('transactions', 'by-grant', grantId)
    const approved = txns.filter(t => t.status === 'approved' && t.direction === 'out')
    for (const line of lines) {
      line.spent = approved.filter(t => t.budget_line_id === line.id).reduce((s, t) => s + t.amount, 0)
      line.remaining = line.approved_amount - (line.spent ?? 0)
    }
    return lines.sort((a, b) => a.sort_order - b.sort_order)
  },
  async addBudgetLine(data: { grant_id: string; code: string; name: string; line_type: BudgetLineType; approved_amount: number; sort_order: number }): Promise<BudgetLine> {
    const db = await getDB()
    const line: BudgetLine = { id: uid(), ...data }
    await db.put('budget_lines', line)
    return line
  },

  // Tranches
  async addTranche(data: { grant_id: string; sequence: number; amount: number; date_received?: string }): Promise<Tranche> {
    const db = await getDB()
    const tranche: Tranche = { id: uid(), grant_id: data.grant_id, sequence: data.sequence, amount: data.amount, date_received: data.date_received ?? null, status: 'pending' }
    await db.put('tranches', tranche)
    return tranche
  },
  async updateTranche(id: string, updates: Partial<Tranche>) {
    const db = await getDB()
    const existing = await db.get('tranches', id)
    if (existing) await db.put('tranches', { ...existing, ...updates })
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    const db = await getDB()
    return (await db.getAllFromIndex('categories', 'by-org', ORG_ID)).sort((a, b) => a.sort_order - b.sort_order)
  },
  async addCategory(data: { name: string; sort_order?: number }): Promise<Category> {
    const db = await getDB()
    const cat: Category = { id: uid(), org_id: ORG_ID, name: data.name, active: true, sort_order: data.sort_order ?? 0 }
    await db.put('categories', cat)
    return cat
  },

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    const db = await getDB()
    return db.getAllFromIndex('suppliers', 'by-org', ORG_ID)
  },
  async addSupplier(data: { name: string; is_related_party?: boolean; notes?: string }): Promise<Supplier> {
    const db = await getDB()
    const sup: Supplier = { id: uid(), org_id: ORG_ID, name: data.name, is_related_party: data.is_related_party ?? false, notes: data.notes ?? null }
    await db.put('suppliers', sup)
    return sup
  },

  // Transactions
  async getTransactions(filters?: { funder_id?: string; grant_id?: string; status?: TxnStatus; direction?: Direction; month?: string }): Promise<Transaction[]> {
    const db = await getDB()
    let txns = await db.getAllFromIndex('transactions', 'by-org', ORG_ID)
    if (filters?.funder_id) txns = txns.filter(t => t.funder_id === filters.funder_id)
    if (filters?.grant_id) txns = txns.filter(t => t.grant_id === filters.grant_id)
    if (filters?.status) txns = txns.filter(t => t.status === filters.status)
    if (filters?.direction) txns = txns.filter(t => t.direction === filters.direction)
    if (filters?.month) txns = txns.filter(t => t.txn_date.startsWith(filters.month))
    const funders = await db.getAll('funders')
    const categories = await db.getAll('categories')
    const suppliers = await db.getAll('suppliers')
    for (const t of txns) {
      t.funder = funders.find(f => f.id === t.funder_id)
      t.category = categories.find(c => c.id === t.category_id)
      t.supplier = suppliers.find(s => s.id === t.supplier_id)
      t.attachments = await db.getAllFromIndex('attachments', 'by-transaction', t.id)
      t.compliance_flags = await db.getAllFromIndex('compliance_flags', 'by-transaction', t.id)
    }
    return txns.sort((a, b) => b.txn_date.localeCompare(a.txn_date))
  },
  async getTransaction(id: string): Promise<Transaction | undefined> {
    const db = await getDB()
    const t = await db.get('transactions', id)
    if (!t) return undefined
    const funders = await db.getAll('funders')
    t.funder = funders.find(f => f.id === t.funder_id)
    t.attachments = await db.getAllFromIndex('attachments', 'by-transaction', t.id)
    t.compliance_flags = await db.getAllFromIndex('compliance_flags', 'by-transaction', t.id)
    return t
  },
  async addTransaction(data: {
    txn_date: string; direction: Direction; amount: number; description: string;
    bank_reference?: string; funder_id?: string; grant_id?: string; budget_line_id?: string;
    category_id?: string; supplier_id?: string; payment_method?: PaymentMethod; status?: TxnStatus
  }): Promise<Transaction> {
    const db = await getDB()
    const txn: Transaction = {
      id: uid(), org_id: ORG_ID, txn_date: data.txn_date, direction: data.direction,
      amount: data.amount, description: data.description, bank_reference: data.bank_reference ?? null,
      funder_id: data.funder_id ?? null, grant_id: data.grant_id ?? null,
      budget_line_id: data.budget_line_id ?? null, category_id: data.category_id ?? null,
      supplier_id: data.supplier_id ?? null, payment_method: data.payment_method ?? null,
      status: data.status ?? 'draft', created_by: 'local-user', approved_by: null,
      approved_at: null, void_reason: null, created_at: now(), updated_at: now(),
    }
    await db.put('transactions', txn)
    await runComplianceChecks(txn)
    return txn
  },
  async updateTransaction(id: string, updates: Partial<Transaction>) {
    const db = await getDB()
    const existing = await db.get('transactions', id)
    if (!existing) return
    const updated = { ...existing, ...updates, updated_at: now() }
    await db.put('transactions', updated)
    await runComplianceChecks(updated)
  },
  async voidTransaction(id: string, reason: string) {
    const db = await getDB()
    const existing = await db.get('transactions', id)
    if (!existing) return
    await db.put('transactions', { ...existing, status: 'void' as TxnStatus, void_reason: reason, updated_at: now() })
  },

  // Attachments
  async addAttachment(data: { transaction_id: string; kind: AttachmentKind; original_filename: string; mime_type: string; byte_size: number; blob?: Blob; captured_at?: string }): Promise<Attachment> {
    const db = await getDB()
    const att: Attachment = {
      id: uid(), transaction_id: data.transaction_id, storage_path: null,
      kind: data.kind, original_filename: data.original_filename,
      mime_type: data.mime_type, byte_size: data.byte_size,
      captured_at: data.captured_at ?? null, uploaded_by: 'local-user',
      blob: data.blob,
    }
    await db.put('attachments', att as Attachment & { blob?: Blob })
    return att
  },
  async getAttachments(transactionId: string): Promise<(Attachment & { blob?: Blob })[]> {
    const db = await getDB()
    return db.getAllFromIndex('attachments', 'by-transaction', transactionId)
  },
  async deleteAttachment(id: string) {
    const db = await getDB()
    await db.delete('attachments', id)
  },

  // Compliance flags
  async getOpenFlags(): Promise<ComplianceFlag[]> {
    const db = await getDB()
    const all = await db.getAll('compliance_flags')
    return all.filter(f => !f.resolved_at).sort((a, b) => {
      const sev = { breach: 0, error: 1, warning: 2 }
      return sev[a.severity] - sev[b.severity]
    })
  },

  // Fund balances
  async getFundBalances(): Promise<{ month: string; funder_name: string; funding_type: FundingType; opening: number; income: number; expenditure: number; closing: number }[]> {
    const db = await getDB()
    const txns = await db.getAllFromIndex('transactions', 'by-org', ORG_ID)
    const funders = await db.getAll('funders')
    const months = new Set(txns.map(t => t.txn_date.slice(0, 7)))
    const sorted = [...months].sort()
    const results: { month: string; funder_name: string; funding_type: FundingType; opening: number; income: number; expenditure: number; closing: number }[] = []
    const running: Record<string, number> = {}
    for (const month of sorted) {
      for (const funder of funders) {
        const prev = running[funder.id] ?? 0
        const monthTxns = txns.filter(t => t.txn_date.startsWith(month) && t.funder_id === funder.id && t.status !== 'void')
        const income = monthTxns.filter(t => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
        const expenditure = monthTxns.filter(t => t.direction === 'out').reduce((s, t) => s + t.amount, 0)
        const closing = prev + income - expenditure
        running[funder.id] = closing
        if (income > 0 || expenditure > 0) {
          results.push({ month, funder_name: funder.name, funding_type: funder.funding_type, opening: prev, income, expenditure, closing })
        }
      }
    }
    return results
  },

  // Dashboard stats
  async getDashboardStats() {
    const db = await getDB()
    const txns = await db.getAllFromIndex('transactions', 'by-org', ORG_ID)
    const flags = await db.getAll('compliance_flags')
    const funders = await db.getAll('funders')
    const nonVoid = txns.filter(t => t.status !== 'void')
    const totalIncome = nonVoid.filter(t => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
    const totalExpenditure = nonVoid.filter(t => t.direction === 'out').reduce((s, t) => s + t.amount, 0)
    const openFlags = flags.filter(f => !f.resolved_at)
    const pendingApproval = txns.filter(t => t.status === 'submitted').length
    const restrictedBalance = funders.filter(f => f.funding_type === 'restricted').reduce((sum, funder) => {
      const fTxns = nonVoid.filter(t => t.funder_id === funder.id)
      return sum + fTxns.filter(t => t.direction === 'in').reduce((s, t) => s + t.amount, 0) - fTxns.filter(t => t.direction === 'out').reduce((s, t) => s + t.amount, 0)
    }, 0)
    const unrestrictedBalance = funders.filter(f => f.funding_type === 'unrestricted').reduce((sum, funder) => {
      const fTxns = nonVoid.filter(t => t.funder_id === funder.id)
      return sum + fTxns.filter(t => t.direction === 'in').reduce((s, t) => s + t.amount, 0) - fTxns.filter(t => t.direction === 'out').reduce((s, t) => s + t.amount, 0)
    }, 0)
    return { totalIncome, totalExpenditure, balance: totalIncome - totalExpenditure, restrictedBalance, unrestrictedBalance, openBreaches: openFlags.filter(f => f.severity === 'breach').length, openWarnings: openFlags.filter(f => f.severity === 'warning' || f.severity === 'error').length, pendingApproval, totalTransactions: nonVoid.length }
  },
}

async function runComplianceChecks(txn: Transaction) {
  const db = await getDB()
  const existing = await db.getAllFromIndex('compliance_flags', 'by-transaction', txn.id)
  for (const f of existing) await db.delete('compliance_flags', f.id)

  if (txn.status === 'void') return

  const funder = txn.funder_id ? await db.get('funders', txn.funder_id) : null
  const isRestricted = funder?.funding_type === 'restricted'

  const flag = (rule_code: string, severity: FlagSeverity, message: string) =>
    db.put('compliance_flags', { id: uid(), transaction_id: txn.id, rule_code, severity, message, raised_at: now(), resolved_at: null, resolved_by: null, resolution_note: null })

  if (txn.direction === 'out') {
    if (isRestricted && txn.payment_method === 'cash') {
      await flag('R01_CASH', 'breach', 'Restricted grant funds should not be withdrawn as cash')
    }
    if (isRestricted && txn.payment_method === 'petty_cash') {
      await flag('R02_PETTY_CASH', 'breach', 'Petty cash should not be funded from restricted grant funds')
    }
    if (txn.grant_id && !txn.budget_line_id) {
      await flag('R03_BUDGET_LINE_REQUIRED', 'error', 'Grant expenditure must map to an approved budget line')
    }
    if (txn.budget_line_id) {
      const line = await db.get('budget_lines', txn.budget_line_id)
      if (line && line.grant_id !== txn.grant_id) {
        await flag('R04_LINE_FUNDER_MISMATCH', 'error', 'Budget line does not belong to the selected grant')
      }
      if (line) {
        const grantTxns = await db.getAllFromIndex('transactions', 'by-grant', line.grant_id)
        const spent = grantTxns.filter(t => t.budget_line_id === line.id && t.status === 'approved' && t.direction === 'out').reduce((s, t) => s + t.amount, 0)
        if (spent + txn.amount > line.approved_amount) {
          await flag('R10_LINE_OVERSPENT', 'error', `Budget line overspent: R${(spent + txn.amount - line.approved_amount).toFixed(2)} over`)
        }
      }
    }
    const attachments = await db.getAllFromIndex('attachments', 'by-transaction', txn.id)
    const hasEvidence = attachments.some(a => ['receipt', 'invoice', 'proof_of_payment'].includes(a.kind))
    if (!hasEvidence) {
      await flag('R05_EVIDENCE_MISSING', 'warning', 'Supporting evidence outstanding')
    }
    if (txn.amount > 20000) {
      await flag('R06_BOARD_APPROVAL', 'error', 'Board approval required above R20,000')
    }
    if (txn.amount > 5000) {
      const quotations = attachments.filter(a => a.kind === 'quotation')
      if (quotations.length < 3) {
        await flag('R07_QUOTATIONS', 'error', 'Three written quotations required above R5,000')
      }
    }
    if (isRestricted && txn.supplier_id) {
      const supplier = await db.get('suppliers', txn.supplier_id)
      if (supplier?.is_related_party) {
        await flag('R08_RELATED_PARTY', 'breach', 'Related-party supply is prohibited from restricted grant funds')
      }
    }
  }
}

export type { FundingTrackerDB }
