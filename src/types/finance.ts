import { PaymentMethod, PaymentRecordStatus } from './sales';

export interface PaymentWithSale {
  id: string;
  organization_id: string;
  sale_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod | null;
  invoice_reference: string | null;
  invoice_file_url: string | null;
  status: PaymentRecordStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sale: {
    id: string;
    code: string;
    total_value: number;
    invoice_reference: string | null;
    invoicexpress_id: number | null;
  };
  client_name: string | null;
  lead_name: string | null;
}

export interface CashflowPoint {
  date: string;
  received: number;
  scheduled: number;
  expenses: number;
}

export interface FinanceStats {
  totalBilled: number;
  totalReceived: number;
  totalPending: number;
  receivedThisMonth: number;
  dueSoon: number;
  dueSoonCount: number;
  dueSoonPayments: PaymentWithSale[];
  cashflowTrend: CashflowPoint[];
  // Expenses
  totalExpenses: number;
  expensesThisMonth: number;
  balance: number;
}
