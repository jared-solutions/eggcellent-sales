/**
 * Django API Client
 * 
 * Main API client for connecting to the Django backend.
 * Handles authentication via tokens and provides methods for all CRUD operations.
 */

// Base API URL from environment - MUST be defined, no fallback to localhost in production
const API_BASE_URL = (() => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) {
    console.error('VITE_API_URL is not defined! Using default localhost for development only.');
    return 'http://localhost:8000/api';
  }
  return envUrl;
})();

// Store auth token in memory and localStorage
let authToken: string | null = localStorage.getItem('django_auth_token');

// Get the stored auth token
export const getAuthToken = (): string | null => authToken;

// Store auth token in memory and localStorage
export const setAuthToken = (token: string | null): void => {
  authToken = token;
  if (token) {
    localStorage.setItem('django_auth_token', token);
  } else {
    localStorage.removeItem('django_auth_token');
  }
};

// Clear all auth data
export const clearAuth = (): void => {
  authToken = null;
  localStorage.removeItem('django_auth_token');
};

// Generic fetch wrapper with auth
const fetchWithAuth = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Add auth token if available
  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Token ${authToken}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
  
  // Handle 401 - unauthorized
  if (response.status === 401) {
    clearAuth();
    // Don't redirect - let the app handle auth state naturally
  }
  
  return response;
};

// ==================== AUTH API ====================

export const authApi = {
  /**
   * Register a new user
   */
  register: async (email: string, password: string, firstName: string, lastName: string, phoneNumber?: string) => {
    const response = await fetchWithAuth('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        password_confirm: password,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber || '',
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }
    
    const data = await response.json();
    setAuthToken(data.token);
    return data;
  },
  
  /**
   * Login with email and password
   */
  login: async (email: string, password: string) => {
    const response = await fetchWithAuth('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Invalid email or password');
    }
    
    const data = await response.json();
    setAuthToken(data.token);
    return data;
  },
  
  /**
   * Logout the current user
   */
  logout: async () => {
    try {
      await fetchWithAuth('/auth/logout/', {
        method: 'POST',
      });
    } finally {
      clearAuth();
    }
  },
  
  /**
   * Get current user info
   */
  getCurrentUser: async () => {
    const response = await fetchWithAuth('/auth/me/');
    
    if (!response.ok) {
      throw new Error('Failed to get user');
    }
    
    return response.json();
  },
  
  /**
   * Change password
   */
  changePassword: async (oldPassword: string, newPassword: string) => {
    const response = await fetchWithAuth('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Password change failed');
    }
    
    return response.json();
  },
  
  /**
   * Update user profile
   */
  updateProfile: async (data: { first_name?: string; last_name?: string }) => {
    const response = await fetchWithAuth('/auth/update-profile/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Profile update failed');
    }
    
    return response.json();
  },
  
  /**
   * Mark onboarding as completed
   */
  completeOnboarding: async () => {
    const response = await fetchWithAuth('/auth/complete-onboarding/', {
      method: 'POST',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to complete onboarding');
    }
    
    return response.json();
  },

  /**
   * Request password reset - sends verification code to email
   */
  requestPasswordReset: async (email: string) => {
    const response = await fetchWithAuth('/auth/request-password-reset/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to request password reset');
    }
    
    return data;
  },

  /**
   * Verify the password reset code
   */
  verifyResetCode: async (email: string, code: string) => {
    const response = await fetchWithAuth('/auth/verify-reset-code/', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Invalid verification code');
    }
    
    return data;
  },

  /**
   * Reset password after code verification
   */
  resetPassword: async (email: string, code: string, newPassword: string, confirmPassword: string) => {
    const response = await fetchWithAuth('/auth/reset-password/', {
      method: 'POST',
      body: JSON.stringify({ 
        email, 
        code, 
        new_password: newPassword,
        confirm_password: confirmPassword
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to reset password');
    }
    
    return data;
  },
};

// ==================== COMPANIES API ====================

export const companiesApi = {
  /**
   * Get all companies for current user
   */
  list: async () => {
    const response = await fetchWithAuth('/companies/');
    if (!response.ok) throw new Error('Failed to fetch companies');
    return response.json();
  },
  
  /**
   * Create a new company
   */
  create: async (name: string, slug: string) => {
    const response = await fetchWithAuth('/companies/', {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
    });
    if (!response.ok) throw new Error('Failed to create company');
    return response.json();
  },
  
  /**
   * Create company with admin (sets up current user as admin)
   */
  createWithAdmin: async (name: string, slug: string) => {
    const response = await fetchWithAuth('/companies/create-with-admin/', {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
    });
    if (!response.ok) throw new Error('Failed to create company');
    return response.json();
  },

  /**
   * Update a company
   */
  update: async (id: string, data: { name?: string; slug?: string }) => {
    const response = await fetchWithAuth(`/companies/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update company');
    return response.json();
  },

  /**
   * Get the first company in the system (for single-company mode)
   */
  getFirst: async () => {
    const response = await fetchWithAuth('/companies/get-first/');
    if (response.status === 404) return { exists: false };
    if (!response.ok) throw new Error('Failed to get company');
    return response.json();
  },

  /**
   * Join the default company as a user (for single-company mode)
   */
  joinDefault: async () => {
    const response = await fetchWithAuth('/companies/join-default/', {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to join company');
    }
    return response.json();
  },

  /**
   * Get user's roles (companies they're part of)
   */
  getMyRoles: async () => {
    const response = await fetchWithAuth('/user-roles/my-roles/');
    if (!response.ok) throw new Error('Failed to fetch user roles');
    return response.json();
  },

  /**
   * Get all users for a specific company
   */
  getCompanyUsers: async (companyId: string) => {
    const response = await fetchWithAuth(`/user-roles/by_company/?company_id=${companyId}`);
    if (!response.ok) throw new Error('Failed to fetch company users');
    return response.json();
  },

  /**
   * Update a user role
   */
  updateUserRole: async (id: string, data: { role?: string; status?: string }) => {
    const response = await fetchWithAuth(`/user-roles/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update user role');
    return response.json();
  },
};

// ==================== CUSTOMERS API ====================

export const customersApi = {
  /**
   * Get all customers for a company
   */
  list: async (companyId: string) => {
    const response = await fetchWithAuth(`/customers/?company_id=${companyId}`);
    if (!response.ok) throw new Error('Failed to fetch customers');
    return response.json();
  },
  
  /**
   * Get customers with balance
   */
  listWithBalance: async (companyId: string) => {
    const response = await fetchWithAuth(`/dashboard/customers-with-balance/?company_id=${companyId}`);
    if (!response.ok) throw new Error('Failed to fetch customers with balance');
    return response.json();
  },
  
  /**
   * Create a new customer
   */
  create: async (companyId: string, name: string, phone?: string) => {
    const response = await fetchWithAuth('/customers/', {
      method: 'POST',
      body: JSON.stringify({ company_id: companyId, name, phone }),
    });
    if (!response.ok) throw new Error('Failed to create customer');
    return response.json();
  },
  
  /**
   * Update a customer
   */
  update: async (id: string, data: { name?: string; phone?: string; status?: string }) => {
    const response = await fetchWithAuth(`/customers/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update customer');
    return response.json();
  },
  
  /**
   * Delete a customer
   */
  delete: async (id: string) => {
    const response = await fetchWithAuth(`/customers/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete customer');
  },
};

// ==================== PRICES API ====================

export const pricesApi = {
  /**
   * Get all prices for a company
   */
  list: async (companyId: string) => {
    const response = await fetchWithAuth(`/prices/?company_id=${companyId}`);
    if (!response.ok) throw new Error('Failed to fetch prices');
    return response.json();
  },
  
  /**
   * Get current active prices
   */
  getCurrent: async (companyId: string) => {
    const response = await fetchWithAuth(`/prices/current/?company_id=${companyId}`);
    if (!response.ok) throw new Error('Failed to fetch current prices');
    return response.json();
  },
  
  /**
   * Create a new price
   */
  create: async (data: { company_id: string; category: string; price_per_tray: number; start_date: string; price_per_piece?: number }) => {
    const response = await fetchWithAuth('/prices/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create price');
    return response.json();
  },
};

// ==================== SUPPLIES API ====================

export const suppliesApi = {
  /**
   * Get all supplies for a company
   */
  list: async (companyId: string) => {
    const response = await fetchWithAuth(`/supplies/?company_id=${companyId}`);
    if (!response.ok) throw new Error('Failed to fetch supplies');
    return response.json();
  },
  
  /**
   * Get most recent supply
   */
  getMostRecent: async (companyId: string) => {
    const response = await fetchWithAuth(`/supplies/most-recent/?company_id=${companyId}`);
    if (!response.ok) return null;
    return response.json();
  },
  
  /**
   * Create a new supply
   */
  create: async (data: { company_id: string; week_start_date: string; week_end_date: string; starter_trays: number; mid_trays: number; normal_trays: number; notes?: string }) => {
    const response = await fetchWithAuth('/supplies/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create supply');
    return response.json();
  },
  
  /**
   * Update a supply
   */
  update: async (id: string, data: Partial<{ week_start_date: string; week_end_date: string; starter_trays: number; mid_trays: number; normal_trays: number; notes: string }>) => {
    const response = await fetchWithAuth(`/supplies/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update supply');
    return response.json();
  },
  
  /**
   * Get remaining trays for a supply
   */
  getRemaining: async (supplyId: string) => {
    const response = await fetchWithAuth(`/dashboard/supply-remaining/?supply_id=${supplyId}`);
    if (!response.ok) throw new Error('Failed to fetch remaining trays');
    return response.json();
  },
};

// ==================== SALES API ====================

export const salesApi = {
  /**
   * Get all sales for a company
   */
  list: async (companyId: string, supplyId?: string) => {
    let url = `/sales/?company_id=${companyId}`;
    if (supplyId) url += `&supply_id=${supplyId}`;
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error('Failed to fetch sales');
    return response.json();
  },
  
  /**
   * Get sales for a specific customer
   */
  getByCustomer: async (companyId: string, customerId: string, supplyId?: string) => {
    let url = `/sales/customer-sales/?company_id=${companyId}&customer_id=${customerId}`;
    if (supplyId) url += `&supply_id=${supplyId}`;
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error('Failed to fetch customer sales');
    return response.json();
  },
  
  /**
   * Create a sale with items
   */
  createWithItems: async (data: { company_id: string; customer_id: string; sale_date: string; notes?: string; weekly_supply_id?: string; items: Array<{ category: string; quantity_trays: number; quantity_pieces?: number; price_per_tray: number }> }) => {
    const response = await fetchWithAuth('/sales/create-with-items/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create sale: ${response.status} - ${errorText}`);
    }
    return response.json();
  },
  
  /**
   * Update a sale
   */
  update: async (id: string, data: { sale_date?: string; notes?: string; weekly_supply_id?: string; customer_id?: string; items?: Array<{ category: string; quantity_trays: number; quantity_pieces?: number; price_per_tray: number }> }) => {
    const response = await fetchWithAuth(`/sales/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update sale: ${response.status} - ${errorText}`);
    }
    return response.json();
  },
  
  /**
   * Delete a sale
   */
  delete: async (id: string) => {
    const response = await fetchWithAuth(`/sales/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete sale');
  },
};

// ==================== PAYMENTS API ====================

export const paymentsApi = {
  /**
   * Get all payments for a company
   */
  list: async (companyId: string, filters?: { customerId?: string; supplyId?: string; method?: string }) => {
    let url = `/payments/?company_id=${companyId}`;
    if (filters?.customerId) url += `&customer_id=${filters.customerId}`;
    if (filters?.supplyId) url += `&supply_id=${filters.supplyId}`;
    if (filters?.method) url += `&payment_method=${filters.method}`;
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error('Failed to fetch payments');
    return response.json();
  },
  
  /**
   * Create a payment
   */
  create: async (data: { company_id: string; customer_id: string; payment_date: string; amount: number; deposited_amount?: number; payment_method?: string; notes?: string; sale_id?: string; weekly_supply_id?: string }) => {
    const response = await fetchWithAuth('/payments/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create payment');
    return response.json();
  },
  
  /**
   * Update a payment
   */
  update: async (id: string, data: { payment_date?: string; amount?: number; deposited_amount?: number; payment_method?: string; notes?: string; sale_id?: string; weekly_supply_id?: string }) => {
    const response = await fetchWithAuth(`/payments/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update payment');
    return response.json();
  },
  
  /**
   * Delete a payment
   */
  delete: async (id: string) => {
    const response = await fetchWithAuth(`/payments/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete payment');
  },
};

// ==================== EXPENSES API ====================

export const expensesApi = {
  /**
   * Get all expenses for a company
   */
  list: async (companyId: string, supplyId?: string) => {
    let url = `/expenses/?company_id=${companyId}`;
    if (supplyId) url += `&supply_id=${supplyId}`;
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error('Failed to fetch expenses');
    return response.json();
  },
  
  /**
   * Create an expense
   */
  create: async (data: { company_id: string; expense_date: string; category: string; description: string; amount: number; payment_method?: string; notes?: string; weekly_supply_id?: string }) => {
    const response = await fetchWithAuth('/expenses/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create expense');
    return response.json();
  },
  
  /**
   * Delete an expense
   */
  delete: async (id: string) => {
    const response = await fetchWithAuth(`/expenses/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete expense');
  },
};

// ==================== DEPOSITS API ====================

export const depositsApi = {
  /**
   * Get all deposits for a company
   */
  list: async (companyId: string, supplyId?: string) => {
    let url = `/deposits/?company_id=${companyId}`;
    if (supplyId) url += `&supply_id=${supplyId}`;
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error('Failed to fetch deposits');
    const data = await response.json();
    // Handle paginated response
    if (data.results) {
      return data.results;
    }
    return data;
  },
  
  /**
   * Create a deposit
   */
  create: async (data: { company_id: string; deposit_date: string; amount: number; payment_method?: string; notes?: string; weekly_supply_id?: string }) => {
    const response = await fetchWithAuth('/deposits/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create deposit');
    return response.json();
  },
  
  /**
   * Delete a deposit
   */
  delete: async (id: string) => {
    const response = await fetchWithAuth(`/deposits/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete deposit');
  },
  
  /**
   * Update a deposit (e.g., mark as cleared)
   */
  update: async (id: string, data: { cleared?: boolean; cleared_date?: string }) => {
    const response = await fetchWithAuth(`/deposits/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update deposit');
    return response.json();
  },
};

// ==================== COLLECTIONS API ====================

export const collectionsApi = {
  /**
   * Get all collections for a company
   */
  list: async (companyId: string) => {
    const response = await fetchWithAuth(`/collections/?company_id=${companyId}`);
    if (!response.ok) throw new Error('Failed to fetch collections');
    return response.json();
  },
  
  /**
   * Create a collection
   */
  create: async (data: { company_id: string; collection_date: string; starter_trays: number; mid_trays: number; normal_trays: number; notes?: string }) => {
    const response = await fetchWithAuth('/collections/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create collection');
    return response.json();
  },
  
  /**
   * Update a collection
   */
  update: async (id: string, data: { collection_date?: string; starter_trays?: number; mid_trays?: number; normal_trays?: number; notes?: string; status?: string }) => {
    const response = await fetchWithAuth(`/collections/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update collection');
    return response.json();
  },
  
  /**
   * Delete a collection
   */
  delete: async (id: string) => {
    const response = await fetchWithAuth(`/collections/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete collection');
  },
  
  /**
   * Convert collections to supply
   */
  convertToSupply: async (data: { company_id: string; collectionIds: string[]; weekStart: string; weekEnd: string; starterTrays: number; midTrays: number; normalTrays: number; notes?: string }) => {
    const response = await fetchWithAuth('/collections/convert-to-supply/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to convert collections');
    return response.json();
  },
};

// ==================== INVITATIONS API ====================

export const invitationsApi = {
  /**
   * Get all invitations for a company
   */
  list: async (companyId: string) => {
    const response = await fetchWithAuth(`/invitations/?company_id=${companyId}`);
    if (!response.ok) throw new Error('Failed to fetch invitations');
    return response.json();
  },
  
  /**
   * Get pending invitations for an email (no auth required)
   */
  getPendingByEmail: async (email: string) => {
    const response = await fetchWithAuth(`/invitations/pending-by-email/?email=${encodeURIComponent(email)}`);
    if (response.status === 404) return [];
    if (!response.ok) throw new Error('Failed to fetch pending invitations');
    return response.json();
  },
  
  /**
   * Send an invitation
   */
  send: async (data: { companyId: string; email: string; fullName: string; role: string }) => {
    const response = await fetchWithAuth('/invitations/send/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to send invitation');
    return response.json();
  },
  
  /**
   * Cancel an invitation
   */
  cancel: async (id: string) => {
    const response = await fetchWithAuth(`/invitations/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled' }),
    });
    if (!response.ok) throw new Error('Failed to cancel invitation');
    return response.json();
  },
  
  /**
   * Get invitation by token
   */
  getByToken: async (token: string) => {
    const response = await fetchWithAuth(`/invitations/by-token/?token=${token}`);
    if (!response.ok) throw new Error('Failed to fetch invitation');
    return response.json();
  },
  
  /**
   * Accept invitation
   */
  accept: async (token: string) => {
    const response = await fetchWithAuth('/invitations/accept/', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to accept invitation');
    }
    return response.json();
  },
};

// ==================== DASHBOARD API ====================

export const dashboardApi = {
  /**
   * Get dashboard statistics
   */
  getStats: async (companyId: string, startDate?: string, endDate?: string, supplyId?: string) => {
    let url = `/dashboard/stats/?company_id=${companyId}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    if (supplyId) url += `&supply_id=${supplyId}`;
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error('Failed to fetch dashboard stats');
    return response.json();
  },

  /**
   * Get supply deposit summary (revenue, deposited, balance per supply)
   */
  getSupplyDepositSummary: async (companyId: string, supplyId?: string) => {
    let url = `/dashboard/supply-deposit-summary/?company_id=${companyId}`;
    if (supplyId) {
      url += `&supply_id=${supplyId}`;
    }
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error('Failed to fetch supply deposit summary');
    return response.json();
  },

  /**
   * Get payments by method
   */
  getPaymentsByMethod: async (companyId: string, startDate?: string, endDate?: string) => {
    let url = `/dashboard/payments-by-method/?company_id=${companyId}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error('Failed to fetch payments by method');
    return response.json();
  },
  
  /**
   * Get revenue by category
   */
  getRevenueByCategory: async (companyId: string, startDate?: string, endDate?: string) => {
    let url = `/dashboard/revenue-by-category/?company_id=${companyId}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error('Failed to fetch revenue by category');
    return response.json();
  },
  
  /**
   * Get top customers by balance
   */
  getTopCustomers: async (companyId: string, limit: number = 5) => {
    const response = await fetchWithAuth(`/dashboard/top-customers/?company_id=${companyId}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch top customers');
    return response.json();
  },
  getFeedStats: async (companyId: string) => {
    const response = await fetchWithAuth(`/dashboard/feed-stats/?company_id=${companyId}`);
    if (!response.ok) throw new Error('Failed to fetch feed stats');
    return response.json();
  },
};

// ==================== FLOCK HEALTH API ====================

export const flockSettingsApi = {
  list: async (companyId: string) => {
    const response = await fetchWithAuth(`/flock-settings/?company_id=${companyId}`);
    if (!response.ok) throw new Error('Failed to fetch flock settings');
    return response.json();
  },
  get: async (companyId: string) => {
    const response = await fetchWithAuth(`/flock-settings/?company_id=${companyId}`);
    if (!response.ok) throw new Error('Failed to fetch flock settings');
    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  },
  create: async (data: { company_id: string; total_chickens: number; default_daily_feed: number; housing_type: string; flock_start_date?: string }) => {
    const response = await fetchWithAuth('/flock-settings/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create flock settings');
    return response.json();
  },
  update: async (id: string, data: Partial<{ total_chickens: number; default_daily_feed: number; housing_type: string; flock_start_date: string }>) => {
    const response = await fetchWithAuth(`/flock-settings/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update flock settings');
    return response.json();
  },
};

export const mortalityRecordsApi = {
  list: async (companyId: string) => {
    const response = await fetchWithAuth(`/mortality-records/?company_id=${companyId}`);
    if (!response.ok) throw new Error('Failed to fetch mortality records');
    return response.json();
  },
  create: async (data: { company_id: string; date: string; count: number; cause: string; notes?: string }) => {
    const response = await fetchWithAuth('/mortality-records/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create mortality record');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetchWithAuth(`/mortality-records/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete mortality record');
  },
};

export const vaccinationRecordsApi = {
  list: async (companyId: string) => {
    const response = await fetchWithAuth(`/vaccination-records/?company_id=${companyId}`);
    if (!response.ok) throw new Error('Failed to fetch vaccination records');
    return response.json();
  },
  create: async (data: { company_id: string; vaccine_name: string; date_given: string; next_due_date?: string; notes?: string }) => {
    const response = await fetchWithAuth('/vaccination-records/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create vaccination record');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetchWithAuth(`/vaccination-records/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete vaccination record');
  },
};

export const treatmentRecordsApi = {
  list: async (companyId: string) => {
    const response = await fetchWithAuth(`/treatment-records/?company_id=${companyId}`);
    if (!response.ok) throw new Error('Failed to fetch treatment records');
    return response.json();
  },
  create: async (data: { company_id: string; treatment_type: string; product_name: string; date_given: string; dosage?: string | null; reason?: string | null; days_given?: number | null; notes?: string | null }) => {
    const response = await fetchWithAuth('/treatment-records/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create treatment record: ${response.status} - ${errorText}`);
    }
    return response.json();
  },
  update: async (id: string, data: Partial<{ treatment_type: string; product_name: string; date_given: string; dosage: string; reason: string; days_given: number; notes: string }>) => {
    const response = await fetchWithAuth(`/treatment-records/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update treatment record');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetchWithAuth(`/treatment-records/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete treatment record');
  },
};

export const feedInventoryApi = {
  list: async (companyId: string) => {
    const response = await fetchWithAuth(`/feed-inventory/?company_id=${companyId}`);
    if (!response.ok) throw new Error('Failed to fetch feed inventory');
    return response.json();
  },
  create: async (data: { company_id: string; feed_type: string; quantity_kg: number; unit_cost: number; purchase_date: string; expiry_date?: string; notes?: string }) => {
    const response = await fetchWithAuth('/feed-inventory/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create feed inventory');
    return response.json();
  },
  update: async (id: string, data: Partial<{ quantity_kg: number; unit_cost: number }>) => {
    const response = await fetchWithAuth(`/feed-inventory/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update feed inventory');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetchWithAuth(`/feed-inventory/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete feed inventory');
  },
};

export const notificationsApi = {
  list: async () => {
    const response = await fetchWithAuth('/notifications/');
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
  },
  create: async (data: { company_id?: string; type: string; level: string; title: string; message: string; action_url?: string }) => {
    const response = await fetchWithAuth('/notifications/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create notification');
    return response.json();
  },
  markAsRead: async (id: string) => {
    const response = await fetchWithAuth(`/notifications/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ read: true }),
    });
    if (!response.ok) throw new Error('Failed to mark notification as read');
    return response.json();
  },
  getUnreadCount: async () => {
    const response = await fetchWithAuth('/notifications/unread_count/');
    if (!response.ok) throw new Error('Failed to get unread count');
    return response.json();
  },
  markAllAsRead: async () => {
    const response = await fetchWithAuth('/notifications/mark_all_read/', {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to mark all as read');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetchWithAuth(`/notifications/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete notification');
  },
};

// Subscription API
export const subscriptionApi = {
  /**
   * Get current subscription status
   */
  getSubscription: async () => {
    const response = await fetchWithAuth('/subscription/');
    if (!response.ok) throw new Error('Failed to fetch subscription');
    return response.json();
  },

  /**
   * Get available subscription plans
   */
  getPlans: async () => {
    const response = await fetchWithAuth('/subscription/plans/');
    if (!response.ok) throw new Error('Failed to fetch plans');
    return response.json();
  },

  /**
   * Initiate M-Pesa payment
   */
  initiatePayment: async (data: { plan_id: string; phone_number: string }) => {
    const response = await fetchWithAuth('/payments/initiate/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Payment initiation failed' }));
      throw new Error(error.error || 'Payment initiation failed');
    }
    return response.json();
  },

  /**
   * Check payment status
   */
  checkPaymentStatus: async (checkoutRequestId: string) => {
    const response = await fetchWithAuth(`/payments/check-status/?checkout_request_id=${checkoutRequestId}`);
    if (!response.ok) throw new Error('Failed to check payment status');
    return response.json();
  },
};

// ==================== MODULE PERMISSIONS API ====================

export interface ModulePermission {
  id: string;
  name: string;
  label: string;
  description?: string;
  icon?: string;
  can_access: boolean;
}

export const modulesApi = {
  /**
   * Get all available modules
   */
  list: async () => {
    const response = await fetchWithAuth('/modules/');
    if (!response.ok) throw new Error('Failed to fetch modules');
    return response.json();
  },

  /**
   * Get module by ID
   */
  get: async (id: string) => {
    const response = await fetchWithAuth(`/modules/${id}/`);
    if (!response.ok) throw new Error('Failed to fetch module');
    return response.json();
  },

  /**
   * Get current user's accessible modules
   */
  getMyModules: async () => {
    const response = await fetchWithAuth('/my-modules/');
    if (!response.ok) throw new Error('Failed to fetch my modules');
    return response.json();
  },

  /**
   * Get user module permissions for a specific user in a company
   */
  getUserPermissions: async (companyId: string, userId: string) => {
    const response = await fetchWithAuth(`/user-module-permissions/user_modules/?company_id=${companyId}&user_id=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch user permissions');
    return response.json();
  },

  /**
   * Update user module permissions (bulk)
   */
  updateUserPermissions: async (userId: string, companyId: string, modulePermissions: Record<string, boolean>) => {
    const response = await fetchWithAuth('/user-module-permissions/bulk_update/', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        company_id: companyId,
        module_permissions: modulePermissions,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user permissions');
    }
    return response.json();
  },

  /**
   * Get all user module permissions for a company
   */
  getCompanyPermissions: async (companyId: string) => {
    const response = await fetchWithAuth(`/user-module-permissions/?company_id=${companyId}`);
    if (!response.ok) throw new Error('Failed to fetch company permissions');
    return response.json();
  },
};

export default {
  auth: authApi,
  companies: companiesApi,
  customers: customersApi,
  prices: pricesApi,
  supplies: suppliesApi,
  sales: salesApi,
  payments: paymentsApi,
  expenses: expensesApi,
  deposits: depositsApi,
  collections: collectionsApi,
  invitations: invitationsApi,
  dashboard: dashboardApi,
  flockSettings: flockSettingsApi,
  mortalityRecords: mortalityRecordsApi,
  vaccinationRecords: vaccinationRecordsApi,
  treatmentRecords: treatmentRecordsApi,
  feedInventory: feedInventoryApi,
  notifications: notificationsApi,
  subscription: subscriptionApi,
  modules: modulesApi,
};

