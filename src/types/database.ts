export type FundingType = 'restricted' | 'unrestricted'
export type Direction = 'in' | 'out'
export type TxnStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'void'
export type PaymentMethod = 'eft' | 'debit_card' | 'cash' | 'petty_cash' | 'bank_charge' | 'other'
export type AttachmentKind = 'receipt' | 'invoice' | 'proof_of_payment' | 'quotation' | 'contract' | 'other'
export type FlagSeverity = 'breach' | 'error' | 'warning'
export type UserRole = 'field_worker' | 'administrator' | 'executive_director' | 'board' | 'auditor'
export type BudgetLineType = 'staff' | 'operational'

export interface Organisation {
  id: string
  name: string
  currency_symbol: string
  financial_year_start_month: number
  created_at: string
}

export interface Funder {
  id: string
  org_id: string
  name: string
  funding_type: FundingType
  agreement_ref: string | null
  contact_email: string | null
  notes: string | null
  created_at: string
}

export interface Grant {
  id: string
  org_id: string
  funder_id: string
  project_number: string | null
  title: string
  total_amount: number
  signed_date: string | null
  commencement_date: string | null
  period_months: number | null
  created_at: string
  funder?: Funder
  budget_lines?: BudgetLine[]
  tranches?: Tranche[]
}

export interface Tranche {
  id: string
  grant_id: string
  sequence: number
  amount: number
  date_received: string | null
  status: string
}

export interface BudgetLine {
  id: string
  grant_id: string
  code: string
  name: string
  line_type: BudgetLineType
  approved_amount: number
  sort_order: number
  spent?: number
  remaining?: number
}

export interface Category {
  id: string
  org_id: string
  name: string
  active: boolean
  sort_order: number
}

export interface Supplier {
  id: string
  org_id: string
  name: string
  is_related_party: boolean
  notes: string | null
}

export interface Transaction {
  id: string
  org_id: string
  txn_date: string
  direction: Direction
  amount: number
  description: string
  bank_reference: string | null
  funder_id: string | null
  grant_id: string | null
  budget_line_id: string | null
  category_id: string | null
  supplier_id: string | null
  payment_method: PaymentMethod | null
  status: TxnStatus
  created_by: string
  approved_by: string | null
  approved_at: string | null
  void_reason: string | null
  created_at: string
  updated_at: string
  funder?: Funder
  grant?: Grant
  budget_line?: BudgetLine
  category?: Category
  supplier?: Supplier
  attachments?: Attachment[]
  compliance_flags?: ComplianceFlag[]
}

export interface Attachment {
  id: string
  transaction_id: string
  storage_path: string | null
  kind: AttachmentKind
  original_filename: string
  mime_type: string
  byte_size: number
  captured_at: string | null
  uploaded_by: string
  blob?: Blob
}

export interface ComplianceFlag {
  id: string
  transaction_id: string
  rule_code: string
  severity: FlagSeverity
  message: string
  raised_at: string
  resolved_at: string | null
  resolved_by: string | null
  resolution_note: string | null
}

export interface FundBalance {
  month: string
  funder_id: string
  funder_name: string
  funding_type: FundingType
  opening: number
  income: number
  expenditure: number
  closing: number
}

export interface Database {
  public: {
    Tables: {
      organisations: { Row: Organisation }
      funders: { Row: Funder }
      grants: { Row: Grant }
      tranches: { Row: Tranche }
      budget_lines: { Row: BudgetLine }
      categories: { Row: Category }
      suppliers: { Row: Supplier }
      transactions: { Row: Transaction }
      attachments: { Row: Attachment }
      compliance_flags: { Row: ComplianceFlag }
    }
  }
}
