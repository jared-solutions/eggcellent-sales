export type EggCategory = 'starter' | 'mid' | 'normal';
export type CustomerStatus = 'active' | 'inactive';
export type AppRole = 'admin' | 'user';
export type UserRoleStatus = 'active' | 'inactive';
export type CollectionStatus = 'pending' | 'approved' | 'converted';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled';
export type SubscriptionPlan = 'free_trial' | '3_months' | '6_months' | '1_year';

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  company_id: string;
  role: AppRole;
  status: UserRoleStatus;
  created_at: string;
}

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
}

export interface CustomerBasic {
  id: string;
  name: string;
}

export interface CategoryPrice {
  id: string;
  company_id: string;
  category: EggCategory;
  price_per_tray: number;
  price_per_piece: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export interface WeeklySupply {
  id: string;
  company_id: string;
  week_start_date: string;
  week_end_date: string;
  starter_trays: number;
  mid_trays: number;
  normal_trays: number;
  total_trays: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  company_id: string;
  customer_id: string;
  weekly_supply_id: string | null;
  sale_date: string;
  category: EggCategory;
  quantity_trays: number;
  price_per_tray: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  customer?: CustomerBasic;
}

export interface Payment {
  id: string;
  company_id: string;
  customer_id: string;
  payment_date: string;
  amount: number;
  deposited_amount: number;
  payment_method: string | null;
  notes: string | null;
  sale_id: string | null;
  weekly_supply_id: string | null;
  created_at: string;
  customer?: CustomerBasic;
}

export interface CustomerWithBalance extends Customer {
  total_trays: number;
  total_sales: number;
  total_payments: number;
  balance: number;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  category: EggCategory;
  quantity_trays: number;
  quantity_pieces: number;
  price_per_tray: number;
  total_amount: number;
  created_at: string;
}

export interface SaleWithItems extends Omit<Sale, 'category' | 'quantity_trays' | 'price_per_tray'> {
  category?: EggCategory | null;
  quantity_trays?: number | null;
  price_per_tray?: number | null;
  sale_items?: SaleItem[];
}

export interface DashboardStats {
  expectedRevenue: number;
  actualRevenue: number;
  totalOutstanding: number;
  paymentsReceived: number;
  unsoldTraysValue: number;
  unsoldTrays: number;  // Actual number of unsold trays
  totalExpenses: number;
  expenseBreakdown: Record<string, number>;  // Expenses by category
  depositedAmount: number;
  cashOnHand: number;
  feedExpensePerDay: number;  // Daily feed cost (consumed)
  feedPurchased: number;  // Cash spent on feed in the period
  feedConsumed: number;  // Actual value of feed consumed
  feedConsumedKg: number;  // KG of feed consumed
  avgFeedPricePerKg: number;  // Average price per KG
  dailyFeedKg: number;  // Daily feed consumption in KG
}

export interface PaymentByMethod {
  method: string;
  total: number;
}

export interface Expense {
  id: string;
  company_id: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string | null;
  notes: string | null;
  weekly_supply_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyCollection {
  id: string;
  company_id: string;
  collection_date: string;
  starter_trays: number;
  mid_trays: number;
  normal_trays: number;
  remaining: number;
  notes: string | null;
  status: CollectionStatus;
  weekly_supply_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FlockSettings {
  id: string;
  company_id: string;
  total_chickens: number;
  created_at: string;
  updated_at: string;
}

export interface DailyFeed {
  id: string;
  company_id: string;
  record_date: string;
  feed_kg: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  company_id: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  start_date: string;
  end_date: string;
  phone_number: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlanDetails {
  id: SubscriptionPlan;
  name: string;
  duration_months: number;
  price_kes: number;
  price_per_month: number;
  features: string[];
  popular?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanDetails[] = [
  {
    id: '3_months',
    name: '3 Months',
    duration_months: 3,
    price_kes: 1500,
    price_per_month: 500,
    features: [
      'Full access to all features',
      'Unlimited collections & sales',
      'Customer management',
      'Financial reports',
      'Priority support',
    ],
  },
  {
    id: '6_months',
    name: '6 Months',
    duration_months: 6,
    price_kes: 2500,
    price_per_month: 417,
    features: [
      'Everything in 3 Months',
      'Save KSh 500',
      'Flock health tracking',
      'Advanced analytics',
    ],
  },
  {
    id: '1_year',
    name: '1 Year',
    duration_months: 12,
    price_kes: 4000,
    price_per_month: 333,
    features: [
      'Everything in 6 Months',
      'Best value - Save KSh 2,000',
      'Free updates',
      'Dedicated support',
      'Custom reports',
    ],
    popular: true,
  },
];

export const TRIAL_DAYS = 7;
